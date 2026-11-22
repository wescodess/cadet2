import { spawn } from 'node:child_process'
import { renameSync, writeFileSync } from 'node:fs'
import { Socket } from 'node:net'
import { setTimeout } from 'node:timers'

const request = JSON.parse(process.argv[2])
const { name, command, args, budgetMs, deadlineMs, path, receipt } = request
const now = () => Number(process.hrtime.bigint()) / 1e6
const startedAtMs = now()
const owner = new Socket({ fd: 3, readable: true, writable: true })
let finished = false
let launched = false
let child

function finish(reason, status = null, signal = null, error = null) {
  if (finished) return
  finished = true
  const finishedAtMs = now()
  if (reason === 'completed' && finishedAtMs >= deadlineMs) reason = 'timeout'
  const record = {
    name,
    command,
    args,
    budgetMs,
    deadlineMs,
    receipt,
    scope: 'process_group',
    state: 'settling',
    reason,
    status,
    signal,
    error,
    supervisorPid: process.pid,
    childPid: child?.pid ?? null,
    startedAtMs,
    finishedAtMs,
  }
  try {
    writeFileSync(`${path}.${receipt}.tmp`, JSON.stringify(record, null, 2) + '\n')
    renameSync(`${path}.${receipt}.tmp`, path)
    owner.write(JSON.stringify({ type: 'terminal', finishedAtMs }) + '\n')
  } finally {
    process.kill(-process.pid, 'SIGKILL')
  }
}

for (const signal of ['SIGHUP', 'SIGINT', 'SIGTERM'])
  process.on(signal, () => finish('signal', null, signal))
owner.on('end', () => finish('owner_exit'))
owner.on('error', (error) => finish('owner_exit', null, null, error.message))
let input = ''
owner.on('data', (data) => {
  input += data.toString('utf8')
  if (input.length > 32 || (input.includes('\n') && input !== 'start\n'))
    return finish('supervision_error', null, null, 'invalid owner protocol')
  if (input !== 'start\n' || launched) return
  launched = true
  if (now() >= deadlineMs) return finish('timeout')
  child = spawn(command, args, { stdio: ['ignore', 'inherit', 'inherit'] })
  child.once('error', (error) => finish('spawn_error', null, null, error.message))
  child.once('exit', (status, signal) => finish('completed', status, signal))
})
setTimeout(() => finish('timeout'), Math.max(0, deadlineMs - now()))
owner.write(JSON.stringify({ type: 'ready', pid: process.pid }) + '\n')
