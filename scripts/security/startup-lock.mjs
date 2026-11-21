import { randomUUID } from 'node:crypto'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { setTimeout } from 'node:timers/promises'

function removeAbandonedLock(directory) {
  try {
    const owners = readdirSync(directory)
    if (owners.length > 1) throw new Error('Invalid Convex startup lock')
    if (owners.length === 1) {
      const owner = /^(\d+)-[\da-f-]+$/.exec(owners[0])
      if (!owner) throw new Error('Invalid Convex startup lock owner')
      try {
        process.kill(Number(owner[1]), 0)
        return
      } catch (error) {
        if (error.code === 'EPERM') return
        if (error.code !== 'ESRCH') throw error
      }
      unlinkSync(join(directory, owners[0]))
    }
    rmdirSync(directory)
  } catch (error) {
    if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error
  }
}

export async function acquireStartupLock(directory, timeoutMs = 120_000) {
  mkdirSync(dirname(directory), { recursive: true })
  const claim = mkdtempSync(join(dirname(directory), '.cadet2-startup-'))
  const deadline = Date.now() + timeoutMs
  try {
    writeFileSync(join(claim, `${process.pid}-${randomUUID()}`), '', { mode: 0o600 })
    while (true) {
      try {
        renameSync(claim, directory)
        break
      } catch (error) {
        if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error
        removeAbandonedLock(directory)
      }
      if (Date.now() >= deadline) throw new Error('Timed out waiting for Convex startup')
      await setTimeout(50)
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
