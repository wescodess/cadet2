import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { accessSync, constants, readFileSync, rmSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { clearInterval, setInterval } from 'node:timers'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { outputDir, writeJSON } from './common.mjs'

export const scannerBudgets = { boundaries: 120000, 'dead-code': 120000, duplication: 120000 }
const settlementMs = 2000
const maxBytes = 64 * 1024 * 1024
const signalExits = { SIGHUP: 129, SIGINT: 130, SIGTERM: 143 }
const now = () => Number(process.hrtime.bigint()) / 1e6
const terminalSchema = z
  .object({
    name: z.string(),
    command: z.string(),
    args: z.array(z.string()),
    budgetMs: z.number().positive(),
    deadlineMs: z.number().finite(),
    receipt: z.string().uuid(),
    scope: z.literal('process_group'),
    state: z.literal('settling'),
    reason: z.enum([
      'completed',
      'timeout',
      'signal',
      'owner_exit',
      'spawn_error',
      'supervision_error',
    ]),
    status: z.number().int().nonnegative().nullable(),
    signal: z.string().nullable(),
    error: z.string().nullable(),
    supervisorPid: z.number().int().positive(),
    childPid: z.number().int().positive().nullable(),
    startedAtMs: z.number().finite(),
    finishedAtMs: z.number().finite(),
  })
  .strict()

function capability(command) {
  if (
    !['darwin-arm64', 'linux-x64'].includes(`${process.platform}-${process.arch}`) ||
    Number(process.versions.node.split('.')[0]) !== 24
  )
    throw new Error(
      'Structural scanners require Node 24 on macOS arm64 or Linux x64 with POSIX process groups',
    )
  if (!isAbsolute(command)) throw new Error('A scanner requires an absolute executable path')
  accessSync(command, constants.X_OK)
}
function killGroup(pid) {
  if (!pid) return
  try {
    process.kill(-pid, 'SIGKILL')
  } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }
}
function groupGone(pid) {
  if (!pid) return true
  try {
    process.kill(-pid, 0)
    return false
  } catch (error) {
    if (error.code === 'ESRCH') return true
    if (error.code === 'EPERM') return false
    throw error
  }
}
function terminalRecord(request, child) {
  const record = terminalSchema.parse(JSON.parse(readFileSync(request.path, 'utf8')))
  for (const key of ['name', 'command', 'budgetMs', 'deadlineMs', 'receipt']) {
    if (record[key] !== request[key])
      throw new Error(`${request.name} scanner execution record mismatch: ${key}`)
  }
  if (
    JSON.stringify(record.args) !== JSON.stringify(request.args) ||
    record.supervisorPid !== child.pid ||
    record.startedAtMs > record.finishedAtMs ||
    record.startedAtMs < request.startedAtMs
  )
    throw new Error(`${request.name} scanner execution record mismatch`)
  return record
}
function outcome(name, record, signal) {
  const interrupted = signal ?? (record.reason === 'signal' ? record.signal : null)
  if (
    record.state !== 'complete' ||
    record.reason !== 'completed' ||
    record.error ||
    record.signal ||
    interrupted
  ) {
    const detail =
      record.reason === 'timeout'
        ? `exceeded its ${record.budgetMs}ms deadline`
        : `interrupted: ${interrupted ?? record.error ?? record.reason}`
    const error = new Error(
      `${name} scanner ${detail}; process_group cleanup ${record.groupTerminated ? 'confirmed' : 'unconfirmed'}${record.error ? `; ${record.error}` : ''}`,
    )
    error.exitCode = signalExits[interrupted] ?? 1
    throw error
  }
  if (!Number.isInteger(record.status)) throw new Error(`${name} scanner has no native exit status`)
  return record.status
}

function observe(child, request, captureBudget) {
  return new Promise((resolve) => {
    const chunks = { stdout: [], stderr: [] },
      ended = { stdout: false, stderr: false }
    let bytes = 0,
      exited = false,
      terminalAt = null,
      failure = null,
      signal = null,
      gone = false,
      cleanupSent = false,
      done = false
    let supervisorStatus = null,
      supervisorSignal = null,
      protocol = ''
    const owner = child.stdio[3]
    function stop(reason) {
      failure ??= reason
      terminalAt ??= now()
      try {
        killGroup(child.pid)
      } catch (error) {
        failure += `; ${error.message}`
      }
    }
    const handlers = Object.fromEntries(
      Object.keys(signalExits).map((value) => [
        value,
        () => {
          signal ??= value
          terminalAt ??= now()
          try {
            child.kill(value)
          } catch (error) {
            stop(error.message)
          }
        },
      ]),
    )
    for (const [value, handler] of Object.entries(handlers)) process.on(value, handler)
    function complete() {
      if (done) return
      done = true
      clearInterval(timer)
      for (const [value, handler] of Object.entries(handlers))
        process.removeListener(value, handler)
      owner.destroy()
      for (const stream of [child.stdout, child.stderr]) {
        stream.destroy()
        stream.unref?.()
      }
      child.unref()
      resolve({
        chunks,
        ended,
        bytes,
        failure,
        signal,
        gone,
        supervisorStatus,
        supervisorSignal,
        terminalAt,
        finishedAtMs: now(),
      })
    }
    function check() {
      const current = now()
      if (terminalAt === null && current >= request.deadlineMs) {
        terminalAt = request.deadlineMs
        stop('timeout')
      }
      if (terminalAt === null) return
      try {
        gone ||= groupGone(child.pid)
        if (!exited && !gone && !cleanupSent && current - terminalAt >= 50) {
          cleanupSent = true
          killGroup(child.pid)
        }
      } catch (error) {
        stop(error.message)
      }
      if (current - terminalAt >= settlementMs - 100) {
        if (!gone) stop('process group termination unconfirmed')
        if (!ended.stdout || !ended.stderr) failure ??= 'incomplete stream drain'
        failure ??= 'settlement deadline exceeded'
        return complete()
      }
      if (exited && gone && ended.stdout && ended.stderr) complete()
    }
    const timer = setInterval(check, 10)
    child.once('error', (error) => {
      exited = true
      stop(error.message)
      check()
    })
    child.once('exit', (status, value) => {
      exited = true
      supervisorStatus = status
      supervisorSignal = value
      terminalAt ??= now()
      try {
        terminalRecord(request, child)
      } catch {
        stop('supervisor lost its completion receipt')
      }
      check()
    })
    owner.on('error', (error) => {
      if (!done && !exited) stop(`owner channel: ${error.message}`)
    })
    owner.on('data', (data) => {
      protocol += data.toString('utf8')
      if (protocol.length > 4096) return stop('invalid supervisor protocol')
      while (protocol.includes('\n')) {
        const index = protocol.indexOf('\n'),
          line = protocol.slice(0, index)
        protocol = protocol.slice(index + 1)
        try {
          const message = JSON.parse(line)
          if (message.type === 'ready' && message.pid === child.pid) {
            process.kill(-child.pid, 0)
            owner.write('start\n')
          } else if (message.type === 'terminal' && Number.isFinite(message.finishedAtMs))
            terminalAt ??= message.finishedAtMs
          else stop('invalid supervisor protocol')
        } catch {
          stop('invalid supervisor protocol')
        }
      }
    })
    for (const name of ['stdout', 'stderr']) {
      child[name].on('data', (data) => {
        bytes += data.length
        captureBudget.bytes += data.length
        if (captureBudget.bytes > maxBytes) stop('exceeded its 64 MiB output budget')
        else chunks[name].push(data)
      })
      child[name].once('end', () => {
        ended[name] = true
        check()
      })
      child[name].once('error', (error) => stop(`stream error: ${error.message}`))
    }
  })
}

export async function runScanner(
  name,
  command,
  args,
  {
    budgetMs = scannerBudgets[name],
    deadlineMs = now() + budgetMs,
    captureBudget = { bytes: 0 },
  } = {},
) {
  if (
    !/^[a-z][a-z0-9-]*$/.test(name) ||
    !Number.isSafeInteger(budgetMs) ||
    budgetMs <= 0 ||
    !Number.isFinite(deadlineMs) ||
    !Array.isArray(args) ||
    args.some((arg) => typeof arg !== 'string') ||
    !Number.isSafeInteger(captureBudget.bytes) ||
    captureBudget.bytes < 0 ||
    captureBudget.bytes > maxBytes
  )
    throw new Error(
      'A scanner requires a finite positive execution budget and a valid name/arguments',
    )
  capability(command)
  if (deadlineMs <= now())
    throw new Error(`${name} scanner exceeded its ${budgetMs}ms deadline before launch`)
  const path = resolve(outputDir, `${name}-execution.json`)
  const request = {
    name,
    command,
    args,
    budgetMs,
    deadlineMs,
    path,
    receipt: randomUUID(),
    startedAtMs: now(),
  }
  rmSync(path, { force: true })
  writeJSON(path, { ...request, scope: 'process_group', state: 'running' })
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(new URL('./scanner-supervisor.mjs', import.meta.url)),
      JSON.stringify({ ...request, args: undefined }),
      ...args,
    ],
    { detached: true, stdio: ['ignore', 'pipe', 'pipe', 'pipe'] },
  )
  writeJSON(path, {
    ...request,
    supervisorPid: child.pid ?? null,
    scope: 'process_group',
    state: 'running',
  })
  const observed = await observe(child, request, captureBudget)
  let record
  try {
    record = terminalRecord(request, child)
  } catch (error) {
    observed.failure ??= `missing or invalid fresh completion receipt: ${error.message}`
  }
  const settledAt = record?.finishedAtMs ?? observed.terminalAt
  if (observed.finishedAtMs - settledAt > settlementMs)
    observed.failure ??= 'settlement deadline exceeded'
  const error = observed.failure ?? record?.error ?? null
  const reason =
    observed.failure === 'timeout' ? 'timeout' : (record?.reason ?? 'supervision_error')
  const result = {
    ...request,
    ...record,
    scope: 'process_group',
    supervisorPid: child.pid ?? null,
    state: error || !observed.gone ? 'failed' : 'complete',
    reason,
    error,
    groupTerminated: observed.gone,
    outputBytes: observed.bytes,
    rowOutputBytes: captureBudget.bytes,
    streamsDrained: observed.ended.stdout && observed.ended.stderr,
    supervisorStatus: observed.supervisorStatus,
    supervisorSignal: observed.supervisorSignal,
    settlementMilliseconds: observed.finishedAtMs - settledAt,
    milliseconds: observed.finishedAtMs - request.startedAtMs,
  }
  writeJSON(path, result)
  return {
    status: outcome(name, result, observed.signal),
    signal: null,
    stdout: Buffer.concat(observed.chunks.stdout).toString('utf8'),
    stderr: Buffer.concat(observed.chunks.stderr).toString('utf8'),
  }
}
