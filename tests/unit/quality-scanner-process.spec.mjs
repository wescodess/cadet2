// @vitest-environment node
import { existsSync, mkdtempSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { clearTimeout } from 'node:timers'
import { performance } from 'node:perf_hooks'
import { afterEach, expect, it } from 'vitest'
import {
  scannerSettled,
  scannerReady,
  scannerTestResources,
  writeScannerWorker,
} from '../support/quality-scanner-worker.mjs'

const scanner = new URL('../../scripts/quality/scanner.mjs', import.meta.url).href
const resources = scannerTestResources()
const { temporary, cleanup } = resources
afterEach(cleanup)

async function until(fn, milliseconds = 4000) {
  const end = Date.now() + milliseconds
  while (!fn() && Date.now() < end) await delay(20)
  expect(fn()).toBe(true)
}

const completions = { completion: '0', nonzero: '7', 'tool-signal': 'signal' }
function expectedReason(mode) {
  if (mode.endsWith('timeout')) return 'timeout'
  if (mode === 'owner-exit') return 'owner_exit'
  if (mode === 'supervisor-exit') return 'supervision_error'
  return Object.hasOwn(completions, mode) ? 'completed' : 'signal'
}

it('bounds a pipe retained by a reparented separate-group descendant without claiming its cleanup', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'scanner-escaped-pipe-'))
  temporary.push(directory)
  const escaped = await resources.escape(directory)
  const run = driverControl(
    directory,
    `try { await runScanner('pipe', process.execPath, [${JSON.stringify(escaped.worker)}], { budgetMs: 1000 }) } catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1 }`,
  )
  await escaped.ready
  const outcome = await run
  expect(outcome.code).toBe(1)
  expect(outcome.milliseconds).toBeLessThan(3500)
  expect(outcome.output).toMatch(/stream|drain/)
  expect(await escaped.alive()).toBe(true)
}, 9000)
it('permits a separately owned closed-stdio escape under the accepted foreground contract', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'scanner-closed-escape-'))
  temporary.push(directory)
  const escaped = await resources.escape(directory, true)
  const run = driverControl(
    directory,
    `const result = await runScanner('closed-escape', process.execPath, [${JSON.stringify(escaped.worker)}], { budgetMs: 1000 }); process.exitCode = result.status`,
  )
  await escaped.ready
  const outcome = await run
  expect(outcome.code, outcome.output).toBe(0)
  expect(await escaped.alive()).toBe(true)
}, 6000)

async function driverControl(directory, program) {
  const evidence = join(directory, 'evidence')
  mkdirSync(evidence)
  const path = join(directory, 'driver.mjs')
  writeFileSync(path, `import { runScanner } from ${JSON.stringify(scanner)}; ${program}`)
  const driver = resources.spawn(process.execPath, [path], {
    detached: true,
    env: { ...process.env, QUALITY_OUTPUT_DIR: evidence },
  })
  let output = ''
  driver.stdout.on('data', (data) => {
    output += data
  })
  driver.stderr.on('data', (data) => {
    output += data
  })
  const started = performance.now()
  const outcome = await new Promise((resolve) =>
    driver.once('close', (code, signal) => resolve({ code, signal })),
  )
  return { ...outcome, output, milliseconds: performance.now() - started, evidence }
}

function delayedSupervisorCleanup(directory, missingReceipt = false) {
  const hook = join(directory, 'delayed-cleanup.mjs')
  writeFileSync(
    hook,
    `import { readFileSync, writeFileSync, rmSync } from 'node:fs';
    if (process.argv[1]?.endsWith('/scanner-supervisor.mjs')) {
      const nativeKill = process.kill.bind(process), request = JSON.parse(process.argv[2]);
      process.kill = (pid, signal) => {
        if (pid !== -process.pid || signal !== 'SIGKILL') return nativeKill(pid, signal);
        writeFileSync(${JSON.stringify(join(directory, 'genuine.json'))}, readFileSync(request.path));
        if (${missingReceipt}) rmSync(request.path);
        setTimeout(() => nativeKill(pid, signal), 300);
        return true;
      };
    }`,
  )
  return `process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS + ' ' : '') + ${JSON.stringify('--import=' + hook)};`
}

it.each([0, 7])('preserves native exit %i during supervised fallback cleanup', async (status) => {
  const directory = mkdtempSync(join(tmpdir(), 'scanner-delayed-cleanup-'))
  temporary.push(directory)
  const result = await driverControl(
    directory,
    `${delayedSupervisorCleanup(directory)}
    try {
      const result = await runScanner('completion', process.execPath, ['-e', ${JSON.stringify(`process.stdout.write('native completion'); process.exitCode = ${status}`)}], { budgetMs: 4000 });
      console.log(result.stdout); process.exitCode = result.status;
    } catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1 }`,
  )
  expect(result.code, result.output).toBe(status)
  expect(result.output).toContain('native completion')
  const genuine = JSON.parse(readFileSync(join(directory, 'genuine.json'), 'utf8'))
  const record = JSON.parse(
    readFileSync(join(result.evidence, 'completion-execution.json'), 'utf8'),
  )
  expect(genuine.status).toBe(status)
  expect(genuine.reason).toBe('completed')
  expect(record.state).toBe('complete')
  expect(record.error).toBeNull()
  expect(record.groupTerminated).toBe(true)
  expect(record.streamsDrained).toBe(true)
  expect(record.settlementMilliseconds).toBeLessThanOrEqual(2000)
})

it('rejects a missing receipt during supervised fallback cleanup', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'scanner-missing-delayed-receipt-'))
  temporary.push(directory)
  const result = await driverControl(
    directory,
    `${delayedSupervisorCleanup(directory, true)}
    try { await runScanner('completion', process.execPath, ['-e', 'process.exitCode = 0'], { budgetMs: 4000 }); }
    catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1 }`,
  )
  expect(result.code, result.output).toBe(1)
  expect(result.output).toContain('receipt')
  const genuine = JSON.parse(readFileSync(join(directory, 'genuine.json'), 'utf8'))
  const record = JSON.parse(
    readFileSync(join(result.evidence, 'completion-execution.json'), 'utf8'),
  )
  expect(genuine.status).toBe(0)
  expect(record.state).toBe('failed')
  expect(record.groupTerminated).toBe(true)
  expect(record.streamsDrained).toBe(true)
  expect(record.settlementMilliseconds).toBeLessThanOrEqual(2000)
})

it('rejects combined output beyond 64 MiB and observes native termination', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'scanner-output-'))
  temporary.push(directory)
  const worker = join(directory, 'flood.mjs')
  writeFileSync(
    worker,
    `import { writeSync } from 'node:fs'; const block = Buffer.alloc(32768, 120); for (let i = 0; i < 1056; i++) { writeSync(1, block); writeSync(2, block) } setInterval(() => {}, 1000)`,
  )
  const result = await driverControl(
    directory,
    `try { await runScanner('output', process.execPath, [${JSON.stringify(worker)}], { budgetMs: 4000 }) } catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1 }`,
  )
  expect(result.code).toBe(1)
  expect(result.output).toContain('64 MiB output budget')
  const record = JSON.parse(readFileSync(join(result.evidence, 'output-execution.json'), 'utf8'))
  expect(record.state).toBe('failed')
  expect(record.groupTerminated).toBe(true)
  expect(record.settlementMilliseconds).toBeLessThanOrEqual(2000)
}, 9000)

it('shares one monotonic active deadline across sequential native scanners', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'scanner-shared-deadline-'))
  temporary.push(directory)
  const result = await driverControl(
    directory,
    `const deadlineMs = Number(process.hrtime.bigint()) / 1e6 + 900; Date.now = () => 0; try { await runScanner('census', process.execPath, ['-e', 'setTimeout(() => {}, 500)'], { budgetMs: 900, deadlineMs }); await runScanner('clone', process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { budgetMs: 900, deadlineMs }); } catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1 }`,
  )
  expect(result.code).toBe(1)
  expect(result.output).toContain('900ms deadline')
  expect(result.milliseconds).toBeLessThan(1350)
  const census = JSON.parse(readFileSync(join(result.evidence, 'census-execution.json'), 'utf8'))
  const clone = JSON.parse(readFileSync(join(result.evidence, 'clone-execution.json'), 'utf8'))
  expect(census.state).toBe('complete')
  expect(clone.deadlineMs).toBe(census.deadlineMs)
  expect(clone.reason).toBe('timeout')
}, 6000)
it('shares the 64 MiB capture ceiling across sequential scanner phases', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'scanner-shared-capture-'))
  temporary.push(directory)
  const worker = join(directory, 'capture.mjs')
  writeFileSync(
    worker,
    "import { writeSync } from 'node:fs'; const block = Buffer.alloc(32768, 120); for (let i = 0; i < 1088; i++) writeSync(1, block)",
  )
  const result = await driverControl(
    directory,
    `const captureBudget = { bytes: 0 }, deadlineMs = Number(process.hrtime.bigint()) / 1e6 + 6000;
    try { await runScanner('first', process.execPath, [${JSON.stringify(worker)}], { budgetMs: 6000, deadlineMs, captureBudget });
      await runScanner('second', process.execPath, [${JSON.stringify(worker)}], { budgetMs: 6000, deadlineMs, captureBudget }); }
    catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1 }`,
  )
  expect(result.code, result.output).toBe(1)
  expect(result.output).toContain('64 MiB output budget')
  const first = JSON.parse(readFileSync(join(result.evidence, 'first-execution.json'), 'utf8'))
  const second = JSON.parse(readFileSync(join(result.evidence, 'second-execution.json'), 'utf8'))
  expect(first.state).toBe('complete')
  expect(first.outputBytes).toBe(34 * 1024 * 1024)
  expect(second.rowOutputBytes).toBeGreaterThan(64 * 1024 * 1024)
  expect(second.outputBytes).toBeLessThan(34 * 1024 * 1024)
  expect(second.groupTerminated).toBe(true)
}, 10000)
it('delivers scanner arguments without serializing them into one exec argument', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'scanner-argument-volume-'))
  temporary.push(directory)
  const payload = Array.from({ length: 4000 }, () => '\u0001'.repeat(100))
  const result = await driverControl(
    directory,
    `const payload = Array.from({ length: 4000 }, () => '\\u0001'.repeat(100));
    try {
      const result = await runScanner('arguments', process.execPath, ['-e', 'const a = process.argv.slice(1); process.stdout.write(a.length + ":" + a.join("").length)', ...payload], { budgetMs: 6000 });
      console.log(result.stdout); process.exitCode = result.status;
    } catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1 }`,
  )
  expect(result.code, result.output).toBe(0)
  expect(result.output).toContain('4000:400000')
  const record = JSON.parse(readFileSync(join(result.evidence, 'arguments-execution.json'), 'utf8'))
  expect(record.state).toBe('complete')
  expect(record.args.slice(2)).toEqual(payload)
}, 10000)
function trigger(mode, driver, directory) {
  if (Object.hasOwn(completions, mode)) writeFileSync(join(directory, 'finish'), completions[mode])
  else if (mode === 'supervisor-exit') writeFileSync(join(directory, 'stop-supervisor'), 'stop')
  else if (!mode.endsWith('timeout')) driver.kill(mode === 'owner-exit' ? 'SIGKILL' : mode)
}

for (const mode of [
  'timeout',
  'SIGTERM',
  'SIGINT',
  'SIGHUP',
  'owner-exit',
  'supervisor-exit',
  'completion',
  'nonzero',
  'tool-signal',
]) {
  it(
    'cleans the scanner child and grandchild on ' + mode + ' and preserves an unrelated process',
    async () => {
      const directory = mkdtempSync(join(tmpdir(), 'scanner-process-'))
      temporary.push(directory)
      const evidence = join(directory, 'evidence')
      mkdirSync(evidence)
      const worker = writeScannerWorker(directory)
      const driverPath = join(directory, 'driver.mjs')
      writeFileSync(
        driverPath,
        `
      import childProcess from 'node:child_process';
      import { syncBuiltinESMExports } from 'node:module';
      import { existsSync } from 'node:fs';
      const nativeSpawn = childProcess.spawn; let supervisor;
      childProcess.spawn = (...args) => { const child = nativeSpawn(...args); if (args[2]?.detached) supervisor = child; return child; };
      syncBuiltinESMExports();
      const { runScanner } = await import(${JSON.stringify(scanner)});
      const control = setInterval(() => { if (existsSync(${JSON.stringify(join(directory, 'stop-supervisor'))}) && supervisor?.exitCode === null && supervisor.signalCode === null) supervisor.kill('SIGKILL') }, 10);
      try {
        const result = await runScanner('hang', process.execPath, [${JSON.stringify(worker)}, '0', ${JSON.stringify(directory)}, 'no'], { budgetMs: 2000 });
        console.log(result.stdout); process.exitCode = result.status;
      }
      catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1; }
      finally { clearInterval(control); }
    `,
      )
      const sentinel = resources.spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
        detached: true,
        stdio: 'ignore',
      })
      const driver = resources.spawn(process.execPath, [driverPath], {
        detached: true,
        cwd: directory,
        env: { ...process.env, QUALITY_OUTPUT_DIR: evidence },
      })
      let output = ''
      driver.stdout.on('data', (data) => {
        output += data
      })
      driver.stderr.on('data', (data) => {
        output += data
      })
      let outcome
      const completion = new Promise((resolve) =>
        driver.once('close', (code, signal) => {
          outcome = { code, signal }
          resolve()
        }),
      )
      const watchdog = setTimeout(() => {
        resources.stop(driver).catch(() => {})
      }, 5000)
      try {
        await until(() => Boolean(scannerReady(directory)))
        const records = scannerReady(directory)
        const pids = records.map((record) => record.pid)
        trigger(mode, driver, directory)
        await completion
        await until(
          () =>
            existsSync(join(evidence, 'hang-execution.json')) &&
            Boolean(JSON.parse(readFileSync(join(evidence, 'hang-execution.json'), 'utf8')).reason),
        )
        const record = JSON.parse(readFileSync(join(evidence, 'hang-execution.json'), 'utf8'))
        expect(record.reason).toBe(expectedReason(mode))
        expect(record.supervisorPid).toBeGreaterThan(0)
        expect(outcome.code === 0, JSON.stringify({ record, output })).toBe(mode === 'completion')
        if (mode === 'nonzero') expect(outcome.code).toBe(7)
        if (mode.startsWith('SIG'))
          expect(outcome.code).toBe({ SIGTERM: 143, SIGINT: 130, SIGHUP: 129 }[mode])
        if (mode === 'completion') {
          expect(record.scope).toBe('process_group')
          expect(record.groupTerminated).toBe(true)
          expect(record.streamsDrained).toBe(true)
          expect(record.settlementMilliseconds).toBeLessThanOrEqual(2000)
        }
        if (mode === 'owner-exit') expect(record.state).not.toBe('complete')
        if (mode === 'tool-signal') expect(record.signal).toBe('SIGUSR2')
        if (mode === 'completion') expect(output).toContain('scanner completion control')
        await until(() => scannerSettled(directory))
        expect(resources.isLive(sentinel)).toBe(true)
        console.info(
          JSON.stringify({
            mode,
            pids,
            outcome,
            record,
            cleanup: 'all scanner processes exited',
            sentinelAlive: true,
          }),
        )
      } finally {
        clearTimeout(watchdog)
      }
    },
    12000,
  )
}
