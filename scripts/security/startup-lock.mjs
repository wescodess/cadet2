import { randomUUID } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { setTimeout } from 'node:timers/promises'

function alive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if (error.code === 'EPERM') return true
    if (error.code === 'ESRCH') return false
    throw error
  }
}

function hasLiveOwner(directory, filename) {
  const owner = /^(\d+)-[\da-f-]+$/.exec(filename)
  if (!owner) throw new Error('Invalid Convex startup lock owner')
  if (alive(Number(owner[1]))) return true
  const raw = readFileSync(join(directory, filename), 'utf8')
  const group = raw ? JSON.parse(raw).processGroup : undefined
  if (group === undefined) return false
  if (!Number.isSafeInteger(group) || group <= 0) throw new Error('Invalid startup group')
  // A dead CLI/wrapper does not prove its setup descendants have exited.
  return alive(-group)
}

function removeAbandoned(directory, claimPid) {
  try {
    // New claim names identify their owner even before the owner file is written.
    if (claimPid && alive(claimPid)) return
    const owners = readdirSync(directory)
    if (owners.length > 1) throw new Error('Invalid Convex startup lock')
    if (owners.length === 1) {
      if (hasLiveOwner(directory, owners[0])) return
      unlinkSync(join(directory, owners[0]))
    } else if (claimPid === undefined) {
      // Published directories are always nonempty. Do not race a legacy contender
      // between mkdtemp and its owner write when sweeping unpublished claims.
      return
    }
    rmdirSync(directory)
  } catch (error) {
    if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error
  }
}

export function recoverStartupLocks(directory) {
  mkdirSync(dirname(directory), { recursive: true })
  for (const name of readdirSync(dirname(directory))) {
    if (!name.startsWith('.cadet2-startup-')) continue
    const owner = /^\.cadet2-startup-(\d+)-/.exec(name)
    removeAbandoned(join(dirname(directory), name), owner ? Number(owner[1]) : undefined)
  }
  removeAbandoned(directory)
}

export async function acquireStartupLock(directory, timeoutMs = 120_000, options = {}) {
  recoverStartupLocks(directory)
  const claim = mkdtempSync(join(dirname(directory), `.cadet2-startup-${process.pid}-`))
  const deadline = Date.now() + timeoutMs
  try {
    writeFileSync(
      join(claim, `${process.pid}-${randomUUID()}`),
      JSON.stringify({ processGroup: options.processGroup }),
      { mode: 0o600 },
    )
    while (true) {
      options.signal?.throwIfAborted()
      try {
        renameSync(claim, directory)
        break
      } catch (error) {
        if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error
        recoverStartupLocks(directory)
      }
      if (Date.now() >= deadline) throw new Error('Timed out waiting for Convex startup')
      await setTimeout(50, undefined, { signal: options.signal })
    }
    let released = false
    return () => {
      if (released) return
      released = true
      renameSync(directory, claim)
      rmSync(claim, { recursive: true, force: true })
    }
  } finally {
    rmSync(claim, { recursive: true, force: true })
  }
}
