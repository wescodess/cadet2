// @vitest-environment node
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { clearTimeout } from 'node:timers'
import { performance } from 'node:perf_hooks'
import { afterEach, expect, it } from 'vitest'
import { scannerTestResources, writeScannerWorker } from '../support/quality-scanner-worker.mjs'

const scanner = new URL('../../scripts/quality/scanner.mjs', import.meta.url).href
const { temporary, owned, descendants, cleanup } = scannerTestResources()
afterEach(cleanup)

async function until(fn, milliseconds = 4000) {
  const end = Date.now() + milliseconds
  while (!fn() && Date.now() < end) await delay(20)
  expect(fn()).toBe(true)
}
function alive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if (error.code === 'ESRCH') return false
    throw error
  }
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
  const evidence = join(directory, 'evidence')
  mkdirSync(evidence)
  const escaped = join(directory, 'escaped.mjs')
  writeFileSync(
    escaped,
    `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(join(directory, 'escaped.pid'))}, String(process.pid)); setInterval(() => {}, 1000)`,
  )
  const worker = join(directory, 'worker.mjs')
  writeFileSync(
    worker,
    `import { spawn } from 'node:child_process'; import { existsSync } from 'node:fs'; const child = spawn(process.execPath, [${JSON.stringify(escaped)}], { detached: true, stdio: 'inherit' }); child.unref(); const timer = setInterval(() => { if (existsSync(${JSON.stringify(join(directory, 'escaped.pid'))})) { clearInterval(timer); process.exit(0) } }, 1)`,
  )
  const driverPath = join(directory, 'driver.mjs')
  writeFileSync(
    driverPath,
    `import { runScanner } from ${JSON.stringify(scanner)}; try { await runScanner('pipe', process.execPath, [${JSON.stringify(worker)}], { budgetMs: 1000 }); } catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1 }`,
  )
  const driver = spawn(process.execPath, [driverPath], {
    detached: true,
    env: { ...process.env, QUALITY_OUTPUT_DIR: evidence },
  })
  owned.push(driver)
  let output = ''
  driver.stdout.resume()
  driver.stderr.on('data', (data) => {
    output += data
  })
  const completion = new Promise((resolve) =>
    driver.once('exit', (code, signal) => resolve({ code, signal })),
  )
  const watchdog = setTimeout(() => driver.kill('SIGKILL'), 5500)
  try {
    await until(() => existsSync(join(directory, 'escaped.pid')))
    const pid = Number(readFileSync(join(directory, 'escaped.pid'), 'utf8'))
    descendants.push(pid)
    const started = performance.now()
    const outcome = await completion
    expect(outcome).toEqual({ code: 1, signal: null })
    expect(performance.now() - started).toBeLessThan(2500)
    expect(output).toMatch(/stream|drain/)
    expect(alive(pid)).toBe(true)
  } finally {
    clearTimeout(watchdog)
    driver.stdout.destroy()
    driver.stderr.destroy()
  }
}, 9000)

async function driverControl(directory, program) {
  const evidence = join(directory, 'evidence')
  mkdirSync(evidence)
  const path = join(directory, 'driver.mjs')
  writeFileSync(path, `import { runScanner } from ${JSON.stringify(scanner)}; ${program}`)
  const driver = spawn(process.execPath, [path], {
    detached: true,
    env: { ...process.env, QUALITY_OUTPUT_DIR: evidence },
  })
  owned.push(driver)
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

it('rejects combined output beyond 64 MiB and observes native termination', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'scanner-output-'))
  temporary.push(directory)
  const worker = join(directory, 'flood.mjs')
  writeFileSync(
    worker,
    `import { writeFileSync, writeSync } from 'node:fs'; writeFileSync(${JSON.stringify(join(directory, 'native.pid'))}, String(process.pid)); const block = Buffer.alloc(32768, 120); for (let i = 0; i < 1056; i++) { writeSync(1, block); writeSync(2, block) } setInterval(() => {}, 1000)`,
  )
  const result = await driverControl(
    directory,
    `try { await runScanner('output', process.execPath, [${JSON.stringify(worker)}], { budgetMs: 4000 }) } catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1 }`,
  )
  const pid = Number(readFileSync(join(directory, 'native.pid'), 'utf8'))
  descendants.push(pid)
  expect(result.code).toBe(1)
  expect(result.output).toContain('64 MiB output budget')
  await until(() => !alive(pid))
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
function trigger(mode, driver, directory) {
  if (Object.hasOwn(completions, mode)) writeFileSync(join(directory, 'finish'), completions[mode])
  else if (mode === 'supervisor-exit')
    process.kill(
      JSON.parse(readFileSync(join(directory, 'evidence/hang-execution.json'), 'utf8'))
        .supervisorPid,
      'SIGKILL',
    )
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
      import { runScanner } from ${JSON.stringify(scanner)};
      try {
        const result = await runScanner('hang', process.execPath, [${JSON.stringify(worker)}, '0', ${JSON.stringify(directory)}, 'no'], { budgetMs: 2000 });
        console.log(result.stdout); process.exitCode = result.status;
      }
      catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1; }
    `,
      )
      const sentinel = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
        detached: true,
        stdio: 'ignore',
      })
      const driver = spawn(process.execPath, [driverPath], {
        detached: true,
        cwd: directory,
        env: { ...process.env, QUALITY_OUTPUT_DIR: evidence },
      })
      owned.push(driver, sentinel)
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
        try {
          process.kill(-driver.pid, 'SIGKILL')
        } catch (error) {
          if (error.code !== 'ESRCH') throw error
        }
      }, 5000)
      try {
        await until(() => existsSync(join(directory, '2.pid')))
        const pids = [0, 1, 2].map((depth) =>
          Number(readFileSync(join(directory, depth + '.pid'), 'utf8')),
        )
        descendants.push(...pids)
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
        await until(() => pids.every((pid) => !alive(pid)))
        expect(alive(sentinel.pid)).toBe(true)
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
