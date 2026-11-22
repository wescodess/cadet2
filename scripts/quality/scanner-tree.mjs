import { spawnSync } from 'node:child_process'

function processTable() {
  const result = spawnSync('ps', ['-axo', 'pid=,ppid=,pgid=,lstart='], {
    encoding: 'utf8',
    timeout: 1000,
    maxBuffer: 2 * 1024 * 1024,
  })
  if (result.error || result.status !== 0)
    throw new Error('Unable to inspect the owned scanner process tree')
  const table = new Map()
  for (const line of result.stdout.trim().split('\n')) {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/)
    if (!match) throw new Error('Invalid scanner process-tree snapshot')
    const [, pid, parent, group, birth] = match
    if (Number(pid) !== result.pid)
      table.set(Number(pid), {
        pid: Number(pid),
        parent: Number(parent),
        group: Number(group),
        birth,
      })
  }
  return table
}
function signal(pid, value) {
  try {
    process.kill(pid, value)
  } catch (error) {
    if (error.code !== 'ESRCH') throw error
  }
}

export function scannerTree(root) {
  const owned = new Map()
  function capture() {
    const table = processTable()
    if (!table.has(root)) throw new Error('Scanner supervisor is absent from its process snapshot')
    for (const [pid, birth] of owned) {
      if (table.get(pid)?.birth !== birth) owned.delete(pid)
    }
    const parents = new Set([root, ...owned.keys()])
    let added = true
    while (added) {
      added = false
      for (const row of table.values()) {
        if (
          row.pid === root ||
          owned.has(row.pid) ||
          (!parents.has(row.parent) && row.group !== root)
        )
          continue
        owned.set(row.pid, row.birth)
        parents.add(row.pid)
        added = true
      }
    }
    return table
  }
  function stop() {
    const frozen = new Set()
    try {
      for (let round = 0; round < 4; round++) {
        capture()
        const pending = [...owned.keys()].filter((pid) => !frozen.has(pid))
        if (!pending.length) break
        for (const pid of pending) {
          signal(pid, 'SIGSTOP')
          frozen.add(pid)
        }
      }
    } finally {
      for (const pid of [...frozen].reverse()) signal(pid, 'SIGKILL')
    }
    return [...frozen]
  }
  return { capture, stop }
}
