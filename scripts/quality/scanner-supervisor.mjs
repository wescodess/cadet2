import { spawn } from 'node:child_process'
import { renameSync, writeFileSync } from 'node:fs'
import { scannerTree } from './scanner-tree.mjs'
import { setInterval } from 'node:timers'

const { name, command, args, budgetMs, path } = JSON.parse(process.argv[2])
const owner = process.ppid
const started = Date.now()
let finished = false
let child
const tree = scannerTree(process.pid)
function finish(reason, status = null, signal = null, error = null) {
  if (finished) return
  finished = true
  let ownedPids = []
  try {
    ownedPids = tree.stop()
  } catch (cleanupError) {
    error = cleanupError.message
  }
  try {
    writeFileSync(
      `${path}.tmp`,
      JSON.stringify(
        {
          name,
          command,
          args,
          budgetMs,
          reason,
          status,
          signal,
          error,
          supervisorPid: process.pid,
          childPid: child?.pid ?? null,
          ownedPids,
          milliseconds: Date.now() - started,
        },
        null,
        2,
      ) + '\n',
    )
    renameSync(`${path}.tmp`, path)
  } finally {
    process.kill(-process.pid, 'SIGKILL')
  }
}
for (const signal of ['SIGHUP', 'SIGINT', 'SIGTERM'])
  process.on(signal, () => finish('signal', null, signal))
setTimeout(() => finish('timeout'), budgetMs)
setInterval(() => {
  if (process.ppid !== owner) finish('owner_exit')
}, 50)
setInterval(() => {
  if (!finished) {
    try {
      tree.capture()
    } catch (error) {
      finish('supervision_error', null, null, error.message)
    }
  }
}, 100)
child = spawn(command, args, { stdio: 'inherit' })
child.once('error', (error) => finish('completed', null, null, error.message))
child.once('exit', (status, signal) => finish('completed', status, signal))
