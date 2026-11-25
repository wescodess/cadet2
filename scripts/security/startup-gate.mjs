// Preload inside the detached CLI group: the lock records this group before any
// setup child can exist, including if the outer launcher is killed uncatchably.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { setInterval, clearInterval } from 'node:timers'
import { acquireStartupLock } from './startup-lock.mjs'

const release = await acquireStartupLock(process.env.CONTAINMENT_STARTUP_LOCK, 120_000, {
  processGroup: process.pid,
})
const monitor = setInterval(() => {
  if (!existsSync(join(process.env.CONTAINMENT_DIRECTORY, 'backend-ready'))) return
  clearInterval(monitor)
  release()
}, 50)
monitor.unref()
