import { spawn } from 'node:child_process'
import { renameSync } from 'node:fs'
import { setInterval, clearInterval } from 'node:timers'
import { delimiter, resolve } from 'node:path'
import { json, main, outputDir, writeJSON } from './common.mjs'

const signalExits = { SIGHUP: 129, SIGINT: 130, SIGTERM: 143 }
const record = {
  status: 'running',
  signal: null,
  baselinePolicy: { status: 'not_run' },
  rows: [
    'typecheck',
    'lint',
    'format:check',
    'secrets:check',
    'dependencies:check',
    'test:policy',
    'test:components',
    'build',
    'test:legacy-access',
  ].map((row) => ({ row, status: 'not_run' })),
}
let active
let child
let started
const pnpmParent =
  process.env.npm_lifecycle_event === 'verify' &&
  process.env.npm_config_user_agent?.startsWith('pnpm/9.12.3 ')
    ? process.ppid
    : null

function save() {
  const path = `${outputDir}/verification.json`
  writeJSON(`${path}.tmp`, record)
  renameSync(`${path}.tmp`, path)
}

function stopTree() {
  if (!child?.pid) return
  try {
    process.kill(-child.pid, 'SIGKILL')
  } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }
}

function elapsed() {
  return ((Date.now() - started) / 1000).toFixed(1)
}

function abort(signal, source = 'signal') {
  if (record.status === 'aborted') return
  record.status = 'aborted'
  record.signal = signal
  record.signalSource = source
  if (active) {
    active.status = 'interrupted'
    active.seconds = elapsed()
  }
  process.exitCode = signalExits[signal] ?? 1
  try {
    save()
  } finally {
    stopTree()
  }
  console.error(`Verification aborted: ${signal}`)
  // pnpm 9.12.3 discards the child's exit code after SIGINT; SIGHUP bypasses that handler.
  if (signal === 'SIGINT' && pnpmParent && process.ppid === pnpmParent) {
    try {
      process.kill(pnpmParent, 'SIGHUP')
    } catch (error) {
      if (error.code !== 'ESRCH') throw error
    }
  }
}

async function command(result, executable, args, env = process.env) {
  if (record.status === 'aborted') return
  active = result
  started = Date.now()
  child = spawn(executable, args, { detached: true, stdio: 'inherit', env })
  const outcome = await new Promise((resolve) => {
    child.once('error', (error) => resolve({ code: 1, error }))
    child.once('exit', (code, signal) => {
      const interrupted =
        signal ?? Object.keys(signalExits).find((key) => signalExits[key] === code)
      if (interrupted) abort(interrupted)
      resolve({ code })
    })
  })
  child = null
  if (record.status !== 'aborted') {
    if (outcome.error) console.error(outcome.error.message)
    result.status = outcome.code === 0 ? 'pass' : 'fail'
    result.seconds = elapsed()
    save()
  }
  active = null
}

async function rowCommand(result, scripts) {
  console.log(`\n>>> ${result.row}`)
  const script = scripts[result.row]
  if (typeof script !== 'string' || !script.trim())
    throw new Error(`Missing row command: ${result.row}`)
  await command(result, 'sh', ['-c', `exec ${script}`], {
    ...process.env,
    PATH: `${resolve('node_modules/.bin')}${delimiter}${process.env.PATH ?? ''}`,
    npm_lifecycle_event: result.row,
    npm_lifecycle_script: script,
  })
}

main(async () => {
  for (const signal of Object.keys(signalExits)) process.on(signal, () => abort(signal))
  const parentMonitor = pnpmParent
    ? setInterval(() => {
        if (process.ppid !== pnpmParent) abort('SIGHUP', 'pnpm_parent_exit')
      }, 100)
    : null
  try {
    save()
    console.log(`Quality evidence: ${outputDir}`)
    await command(record.baselinePolicy, 'node', ['scripts/quality/baseline-policy.mjs'])
    if (record.status === 'aborted') return
    if (record.baselinePolicy.status !== 'pass') throw new Error('Baseline policy failed')
    const { scripts } = json('package.json')
    for (const result of record.rows) {
      if (record.status === 'aborted') break
      await rowCommand(result, scripts)
    }
    if (record.status === 'aborted') return
    record.status = record.rows.every((result) => result.status === 'pass') ? 'pass' : 'fail'
    save()
    console.log('\nVerification summary')
    for (const result of record.rows)
      console.log(`${result.status.toUpperCase()} ${result.row} (${result.seconds}s)`)
    if (record.status !== 'pass') process.exitCode = 1
  } catch (error) {
    if (record.status !== 'aborted') {
      record.status = 'fail'
      save()
    }
    throw error
  } finally {
    if (parentMonitor) clearInterval(parentMonitor)
  }
})
