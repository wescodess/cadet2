// @vitest-environment node
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { acquireStartupLock } from '../../scripts/security/startup-lock.mjs'

async function workspace(verify) {
  const directory = await mkdtemp(join(tmpdir(), 'cadet2-startup-test-'))
  try {
    await verify(join(directory, 'startup'))
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

it('serializes startup across processes without waiting for the first caller to exit', async () => {
  await workspace(async (directory) => {
    const module = new URL('../../scripts/security/startup-lock.mjs', import.meta.url).href
    const source = `
      import { acquireStartupLock } from ${JSON.stringify(module)}
      const release = await acquireStartupLock(${JSON.stringify(directory)})
      process.on('message', (message) => {
        if (message === 'release') { release(); process.send('released') }
      })
      process.send('acquired')
    `
    const children = []
    try {
      const first = spawn(process.execPath, ['--input-type=module', '-e', source], {
        stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
      })
      children.push(first)
      expect((await once(first, 'message'))[0]).toBe('acquired')
      const second = spawn(process.execPath, ['--input-type=module', '-e', source], {
        stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
      })
      children.push(second)
      const acquired = once(second, 'message')
      const released = once(first, 'message')
      first.send('release')
      expect((await released)[0]).toBe('released')
      expect((await acquired)[0]).toBe('acquired')
      expect(first.exitCode).toBeNull()
      const secondReleased = once(second, 'message')
      second.send('release')
      expect((await secondReleased)[0]).toBe('released')
    } finally {
      await Promise.all(
        children.map(async (child) => {
          if (child.exitCode !== null || child.signalCode !== null) return
          const exited = once(child, 'exit')
          child.kill('SIGTERM')
          await exited
        }),
      )
    }
  })
})

it('recovers an abandoned startup lock instead of blocking later runs', async () => {
  await workspace(async (directory) => {
    await mkdir(directory)
    await writeFile(join(directory, '2147483647-00000000-0000-0000-0000-000000000000'), '')
    const release = await acquireStartupLock(directory)
    release()
  })
})

it('times out without removing a live owner and removes its unpublished claim', async () => {
  await workspace(async (directory) => {
    const release = await acquireStartupLock(directory)
    try {
      const owner = await readdir(directory)
      await expect(acquireStartupLock(directory, 0)).rejects.toThrow('Timed out')
      expect(await readdir(directory)).toEqual(owner)
      expect(await readdir(join(directory, '..'))).toEqual(['startup'])
    } finally {
      release()
    }
  })
})
