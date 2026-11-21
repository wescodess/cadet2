import { setTimeout } from 'node:timers/promises'

function signalGroup(child, signal) {
  if (!child?.pid) return false
  try {
    process.kill(-child.pid, signal)
    return true
  } catch (error) {
    if (error.code === 'ESRCH') return false
    throw error
  }
}

export async function stopOwnedProcessGroup(child) {
  if (!signalGroup(child, 'SIGTERM')) return
  const deadline = Date.now() + 2_000
  while (signalGroup(child, 0)) {
    if (Date.now() >= deadline) signalGroup(child, 'SIGKILL')
    await setTimeout(20)
  }
}
