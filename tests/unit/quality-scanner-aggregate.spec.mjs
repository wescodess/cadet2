// @vitest-environment node
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { clearTimeout } from 'node:timers'
import { afterEach, expect, it } from 'vitest'
import { scannerTestResources, writeScannerWorker } from '../support/quality-scanner-worker.mjs'

const verifier = new URL('../../scripts/quality/verify.mjs', import.meta.url)
const scanner = new URL('../../scripts/quality/scanner.mjs', import.meta.url).href
const { temporary, owned, descendants, cleanup } = scannerTestResources()
const rows = [
  'typecheck',
  'lint',
  'format:check',
  'secrets:check',
  'dependencies:check',
  'boundaries:check',
  'dead-code:check',
  'duplication:check',
  'test:policy',
  'test:components',
  'build',
  'test:legacy-access',
]
afterEach(cleanup)
async function until(fn) {
  const end = Date.now() + 5000
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

for (const mode of ['timeout', 'SIGTERM']) {
  it(
    'retains aggregate verification records and owned-tree cleanup on ' + mode,
    async () => {
      const directory = mkdtempSync(join(tmpdir(), 'scanner-aggregate-'))
      temporary.push(directory)
      mkdirSync(join(directory, 'scripts/quality'), { recursive: true })
      mkdirSync(join(directory, 'evidence'))
      writeFileSync(
        join(directory, 'scripts/quality/baseline-policy.mjs'),
        'console.log("baseline control")',
      )
      writeFileSync(join(directory, 'positive.mjs'), 'console.log("positive row control")')
      const worker = writeScannerWorker(directory)
      writeFileSync(
        join(directory, 'hang.mjs'),
        `
      import { runScanner } from ${JSON.stringify(scanner)};
      try { await runScanner('aggregate-hang', process.execPath, [${JSON.stringify(worker)}, '0', ${JSON.stringify(directory)}, 'no'], { budgetMs: 2000 }); }
      catch (error) { console.error(error.message); process.exitCode = error.exitCode ?? 1; }
    `,
      )
      writeFileSync(
        join(directory, 'package.json'),
        JSON.stringify({
          scripts: Object.fromEntries(
            rows.map((row) => [row, `node ${row === 'dead-code:check' ? 'hang' : 'positive'}.mjs`]),
          ),
        }),
      )
      const child = spawn(process.execPath, [verifier.pathname], {
        detached: true,
        cwd: directory,
        env: { ...process.env, QUALITY_OUTPUT_DIR: join(directory, 'evidence') },
      })
      owned.push(child)
      let output = ''
      child.stdout.on('data', (data) => {
        output += data
      })
      child.stderr.on('data', (data) => {
        output += data
      })
      const completion = new Promise((resolve) => child.once('close', resolve))
      const watchdog = setTimeout(() => {
        try {
          process.kill(-child.pid, 'SIGKILL')
        } catch (error) {
          if (error.code !== 'ESRCH') throw error
        }
      }, 9000)
      try {
        await until(() => existsSync(join(directory, '2.pid')))
        const pids = [0, 1, 2].map((depth) =>
          Number(readFileSync(join(directory, depth + '.pid'), 'utf8')),
        )
        descendants.push(...pids)
        if (mode === 'SIGTERM') child.kill('SIGTERM')
        await completion
        const record = JSON.parse(
          readFileSync(join(directory, 'evidence/verification.json'), 'utf8'),
        )
        expect(record.baselinePolicy.status).toBe('pass')
        expect(record.rows).toHaveLength(12)
        const active = record.rows.find((row) => row.row === 'dead-code:check')
        expect(active.status).toBe(mode === 'timeout' ? 'fail' : 'interrupted')
        expect(record.status).toBe(mode === 'timeout' ? 'fail' : 'aborted')
        expect(record.rows.find((row) => row.row === 'test:legacy-access').status).toBe(
          mode === 'timeout' ? 'pass' : 'not_run',
        )
        await until(() => existsSync(join(directory, 'evidence/aggregate-hang-execution.json')))
        await until(() => pids.every((pid) => !alive(pid)))
        console.info(
          JSON.stringify({ mode, record, pids, cleanup: 'all scanner descendants exited', output }),
        )
      } finally {
        clearTimeout(watchdog)
      }
    },
    15000,
  )
}
