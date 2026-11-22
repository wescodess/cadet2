import { spawn } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { outputDir } from './common.mjs'

export const scannerBudgets = { boundaries: 120000, 'dead-code': 120000, duplication: 120000 }
const signalExits = { SIGHUP: 129, SIGINT: 130, SIGTERM: 143 }

function stopSupervisor(child, handlers) {
  for (const [signal, handler] of Object.entries(handlers)) process.removeListener(signal, handler)
  if (!child.pid) return
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }
}
function scannerStatus(name, budgetMs, record) {
  if (record.name !== name || record.budgetMs !== budgetMs)
    throw new Error(`${name} scanner execution record mismatch`)
  if (record.reason !== 'completed') {
    const message =
      record.reason === 'timeout'
        ? `${name} scanner exceeded its ${budgetMs}ms deadline; owned process group terminated`
        : `${name} scanner interrupted: ${record.signal ?? record.reason}; owned process group terminated`
    const error = new Error(message + (record.error ? `; cleanup failure: ${record.error}` : ''))
    error.exitCode = signalExits[record.signal] ?? 1
    throw error
  }
  if (record.error || record.signal)
    throw new Error(`${name} scanner failed: ${record.error ?? `terminated by ${record.signal}`}`)
  if (!Number.isInteger(record.status)) throw new Error(`${name} scanner has no exit status`)
  return record.status
}

export async function runScanner(name, command, args, { budgetMs = scannerBudgets[name] } = {}) {
  if (!/^[a-z][a-z0-9-]*$/.test(name) || !Number.isSafeInteger(budgetMs) || budgetMs <= 0)
    throw new Error('A scanner requires a finite positive execution budget and a valid name')
  const path = resolve(outputDir, `${name}-execution.json`)
  rmSync(path, { force: true })
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(new URL('./scanner-supervisor.mjs', import.meta.url)),
      JSON.stringify({ name, command, args, budgetMs, path }),
    ],
    { detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  const stdout = [],
    stderr = []
  let bytes = 0,
    exceeded = false
  const handlers = Object.fromEntries(
    Object.keys(signalExits).map((signal) => [signal, () => child.kill(signal)]),
  )
  for (const [signal, handler] of Object.entries(handlers)) process.once(signal, handler)
  for (const [stream, chunks] of [
    [child.stdout, stdout],
    [child.stderr, stderr],
  ]) {
    stream.on('data', (data) => {
      bytes += data.length
      if (bytes > 64 * 1024 * 1024) {
        if (!exceeded) child.kill('SIGTERM')
        exceeded = true
      } else chunks.push(data)
    })
  }
  try {
    await new Promise((resolve, reject) => {
      child.once('error', reject)
      child.once('close', resolve)
    })
    if (exceeded) throw new Error(`${name} scanner exceeded its 64 MiB output budget`)
    const record = JSON.parse(readFileSync(path, 'utf8'))
    return {
      status: scannerStatus(name, budgetMs, record),
      signal: null,
      stdout: Buffer.concat(stdout).toString('utf8'),
      stderr: Buffer.concat(stderr).toString('utf8'),
    }
  } finally {
    stopSupervisor(child, handlers)
  }
}
