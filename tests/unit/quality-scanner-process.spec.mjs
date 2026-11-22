// @vitest-environment node
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { clearTimeout } from 'node:timers'
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
  return Object.hasOwn(completions, mode) ? 'completed' : 'signal'
}
function trigger(mode, driver, directory) {
  if (Object.hasOwn(completions, mode)) writeFileSync(join(directory, 'finish'), completions[mode])
  else if (!mode.endsWith('timeout')) driver.kill(mode === 'owner-exit' ? 'SIGKILL' : mode)
}

for (const mode of [
  'timeout',
  'SIGTERM',
  'SIGINT',
  'SIGHUP',
  'owner-exit',
  'detached-timeout',
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
        const result = await runScanner('hang', process.execPath, [${JSON.stringify(worker)}, '0', ${JSON.stringify(directory)}, ${JSON.stringify(mode === 'detached-timeout' ? 'yes' : 'no')}], { budgetMs: 2000 });
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
        await until(() => existsSync(join(evidence, 'hang-execution.json')))
        const record = JSON.parse(readFileSync(join(evidence, 'hang-execution.json'), 'utf8'))
        expect(record.reason).toBe(expectedReason(mode))
        expect(outcome.code === 0).toBe(mode === 'completion')
        if (mode === 'nonzero') expect(outcome.code).toBe(7)
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
