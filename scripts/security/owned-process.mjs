import { execFileSync } from 'node:child_process'
import { setTimeout } from 'node:timers/promises'

function zombieOnlyGroup(pid) {
  const members = execFileSync('ps', ['-axo', 'pgid=,uid=,stat='], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .filter(([group]) => Number(group) === pid)
  return members.every(
    ([, uid, state]) => Number(uid) === process.getuid() && state.startsWith('Z'),
  )
}

function signalGroup(child, signal, owned) {
  if (!child?.pid) return false
  try {
    process.kill(-child.pid, signal)
    return true
  } catch (error) {
    if (error.code === 'ESRCH') return false
    if (
      error.code === 'EPERM' &&
      process.platform === 'darwin' &&
      owned &&
      zombieOnlyGroup(child.pid)
    )
      return false
    throw error
  }
}

export async function stopOwnedProcessGroup(child, { owned = false } = {}) {
  if (!signalGroup(child, 'SIGTERM', owned)) return
  const deadline = Date.now() + 2_000
  while (signalGroup(child, 0, owned)) {
    if (Date.now() >= deadline) signalGroup(child, 'SIGKILL', owned)
    await setTimeout(20)
  }
}
