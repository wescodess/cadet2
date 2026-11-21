import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { createInterface } from 'node:readline'
import { cleanupBoundaryRun } from '../../scripts/security/cleanup.mjs'
import { setTimeout } from 'node:timers/promises'
import { promisify } from 'node:util'
import { acquireStartupLock } from '../../scripts/security/startup-lock.mjs'
import { stopOwnedProcessGroup } from '../../scripts/security/owned-process.mjs'

const root = resolve(import.meta.dirname, '../..')
const run = promisify(execFile)
async function waitFor(read) {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    const value = await read()
    if (value) return value
    await setTimeout(20)
  }
  assert.fail('launcher did not reach the interruption seam')
}

for (const waiting of [false, true]) {
  test(`launcher interruption reaps children and removes ${waiting ? 'waiting' : 'active'} startup state`, async () => {
    for (const signal of ['SIGINT', 'SIGTERM']) {
      const home = await mkdtemp(join(tmpdir(), 'cadet2-launcher-test-'))
      const temporary = join(home, 'tmp')
      const cache = join(home, '.cache')
      const lock = join(cache, 'cadet2-containment-startup')
      await mkdir(temporary)
      const release = waiting ? await acquireStartupLock(lock) : undefined
      const child = spawn(process.execPath, [join(root, 'scripts/security/run-boundaries.mjs')], {
        cwd: root,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, HOME: home, TMPDIR: temporary, QUALITY_OUTPUT_DIR: home },
      })
      let output = ''
      child.stdout.on('data', (bytes) => {
        output += bytes
      })
      child.stderr.on('data', (bytes) => {
        output += bytes
      })
      const exited = once(child, 'exit')
      let cliPid
      try {
        cliPid = await waitFor(async () => {
          assert.equal(child.exitCode, null, output)
          const { stdout } = await run('ps', ['-axo', 'pid=,ppid=,command='])
          const row = stdout.split('\n').find((line) => {
            const fields = line.trim().split(/\s+/)
            return Number(fields[1]) === child.pid && line.includes('convex/bin/main.js')
          })
          return row ? Number(row.trim().split(/\s+/)[0]) : undefined
        })
        await waitFor(async () => {
          const entries = await readdir(cache).catch(() => [])
          return entries.some((name) =>
            waiting ? name.startsWith('.cadet2-startup-') : name === 'cadet2-containment-startup',
          )
        })
        child.kill(signal)
        const [code, exitSignal] = await exited
        assert.equal(exitSignal, null)
        assert.equal(code, signal === 'SIGINT' ? 130 : 143)
        assert.throws(() => process.kill(cliPid, 0), { code: 'ESRCH' })
        assert.throws(() => process.kill(-cliPid, 0), { code: 'ESRCH' })
        assert.deepEqual(
          await readdir(temporary),
          [],
          'workspace must be removed before launcher exit',
        )
        const entries = await readdir(cache)
        assert.deepEqual(entries, waiting ? ['cadet2-containment-startup'] : [])
        if (process.env.QUALITY_OUTPUT_DIR) {
          await writeFile(
            join(
              process.env.QUALITY_OUTPUT_DIR,
              `launcher-${waiting ? 'waiting' : 'active'}-${signal}.log`,
            ),
            output,
          )
        }
      } finally {
        // Both groups were created by this test; never signal unrelated processes.
        if (cliPid) await stopOwnedProcessGroup({ pid: cliPid }, { owned: true })
        await stopOwnedProcessGroup(child, { owned: true })
        await exited
        release?.()
        await rm(home, { recursive: true, force: true })
      }
    }
  })
}

test('an owned zombie-only group is confirmed gone on Darwin while unowned EPERM stays fatal', async () => {
  const python = spawn('python3', ['-I', join(root, 'tests/security/zombie-group.py')], {
    stdio: ['pipe', 'pipe', 'inherit'],
  })
  const exited = once(python, 'exit')
  const lines = createInterface({ input: python.stdout })[Symbol.asyncIterator]()
  const pid = Number((await lines.next()).value)
  let reaped = false
  assert.ok(Number.isSafeInteger(pid) && pid > 0)
  try {
    if (process.platform === 'darwin') {
      assert.throws(() => process.kill(-pid, 0), { code: 'EPERM' })
      await assert.rejects(stopOwnedProcessGroup({ pid }), { code: 'EPERM' })
      await stopOwnedProcessGroup({ pid }, { owned: true })
    } else {
      python.stdin.write('\n')
      assert.equal((await lines.next()).value, 'reaped')
      reaped = true
      await stopOwnedProcessGroup({ pid }, { owned: true })
    }
  } finally {
    python.stdin.end(reaped ? undefined : '\n')
    await exited
    assert.throws(() => process.kill(-pid, 0), { code: 'ESRCH' })
  }
})

for (const failure of ['stop', 'recover']) {
  test(`cleanup removes workspace and signal handlers after ${failure} fails`, async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'cadet2-cleanup-test-'))
    await writeFile(join(workspace, 'operator.env'), 'synthetic fixture')
    const calls = []
    const handler = () => {}
    process.on('SIGTERM', handler)
    try {
      await assert.rejects(
        cleanupBoundaryRun({
          stop: async () => {
            calls.push('stop')
            if (failure === 'stop') throw new Error('injected stop failure')
          },
          recover: () => {
            calls.push('recover')
            if (failure === 'recover') throw new Error('injected recover failure')
          },
          removeWorkspace: async () => {
            calls.push('removeWorkspace')
            await rm(workspace, { recursive: true, force: true })
          },
          removeHandlers: () => {
            calls.push('removeHandlers')
            process.off('SIGTERM', handler)
          },
        }),
        new RegExp(`injected ${failure} failure`),
      )
      assert.deepEqual(calls, ['stop', 'recover', 'removeWorkspace', 'removeHandlers'])
      await assert.rejects(readdir(workspace), { code: 'ENOENT' })
      assert.equal(process.listeners('SIGTERM').includes(handler), false)
    } finally {
      process.off('SIGTERM', handler)
      await rm(workspace, { recursive: true, force: true })
    }
  })
}
