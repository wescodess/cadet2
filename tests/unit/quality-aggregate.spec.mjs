// @vitest-environment node
import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const rows = [
  'typecheck',
  'lint',
  'format:check',
  'secrets:check',
  'dependencies:check',
  'boundaries:check',
  'dead-code:check',
  'duplication:check',
  'test:policy',
  'test:components',
  'build',
  'test:legacy-access',
]
let scripts,
  readScripts,
  proc,
  handlers,
  spawn,
  children,
  outcomes,
  snapshots,
  completion,
  monitor,
  clearInterval,
  killError
beforeEach(() => {
  vi.resetModules()
  scripts = Object.fromEntries(rows.map((row) => [row, `command-${row}`]))
  readScripts = () => ({ scripts })
  handlers = {}
  children = []
  outcomes = []
  snapshots = []
  killError = null
  proc = {
    ...process,
    env: { PATH: '/usr/bin' },
    ppid: 123,
    exitCode: 0,
    on: vi.fn((signal, fn) => {
      handlers[signal] = fn
    }),
    kill: vi.fn((pid) => {
      if (killError) throw Object.assign(new Error('kill failed'), { code: killError })
      if (pid < 0) children.at(-1).emit('exit', null, 'SIGKILL')
    }),
  }
  vi.stubGlobal('process', proc)
  spawn = vi.fn(() => {
    const child = new EventEmitter()
    child.pid = 31337
    children.push(child)
    const outcome = outcomes.shift() ?? { code: 0 }
    if (!outcome.hold)
      globalThis.queueMicrotask(() =>
        outcome.error
          ? child.emit('error', outcome.error)
          : child.emit('exit', outcome.code, outcome.signal ?? null),
      )
    return child
  })
  vi.doMock('node:child_process', () => ({ spawn }))
  vi.doMock('node:fs', () => ({ renameSync: vi.fn() }))
  clearInterval = vi.fn()
  monitor = vi.fn((fn) => {
    monitor.callback = fn
    return 99
  })
  vi.doMock('node:timers', () => ({ setInterval: monitor, clearInterval }))
  vi.doMock('../../scripts/quality/common.mjs', () => ({
    outputDir: 'evidence',
    json: () => readScripts(),
    writeJSON: (_path, value) => snapshots.push(globalThis.structuredClone(value)),
    main: (fn) => {
      completion = Promise.resolve().then(fn)
    },
  }))
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  for (const name of [
    'node:child_process',
    'node:fs',
    'node:timers',
    '../../scripts/quality/common.mjs',
  ])
    vi.doUnmock(name)
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
async function start() {
  await import('../../scripts/quality/verify.mjs')
  return completion
}
async function held() {
  await import('../../scripts/quality/verify.mjs')
  for (let tick = 0; tick < 10 && children.length < 2; tick++) await Promise.resolve()
  expect(children).toHaveLength(2)
  return { result: completion }
}

describe('aggregate orchestration public module', () => {
  it('publishes initial state and an atomic record after every command', async () => {
    await start()
    expect(snapshots[0]).toEqual({
      status: 'running',
      signal: null,
      baselinePolicy: { status: 'not_run' },
      rows: rows.map((row) => ({ row, status: 'not_run' })),
    })
    expect(snapshots).toHaveLength(15)
    expect(snapshots[1].baselinePolicy.status).toBe('pass')
    for (let index = 0; index < rows.length; index++)
      expect(snapshots[index + 2].rows.map(({ status }) => status)).toEqual(
        rows.map((_, i) => (i <= index ? 'pass' : 'not_run')),
      )
    expect(snapshots.at(-1).status).toBe('pass')
    expect(spawn.mock.calls[0]).toEqual([
      'node',
      ['scripts/quality/baseline-policy.mjs'],
      { detached: true, stdio: 'inherit', env: proc.env },
    ])
    expect(spawn.mock.calls[1]).toEqual([
      'sh',
      ['-c', 'exec command-typecheck'],
      {
        detached: true,
        stdio: 'inherit',
        env: {
          PATH: expect.stringMatching(/node_modules\/.bin:\/usr\/bin$/),
          npm_lifecycle_event: 'typecheck',
          npm_lifecycle_script: 'command-typecheck',
        },
      },
    ])
    expect(monitor).not.toHaveBeenCalled()
    expect(clearInterval).not.toHaveBeenCalled()
    for (const row of snapshots.at(-1).rows) expect(Number(row.seconds)).toBeGreaterThanOrEqual(0)
  })
  it.each([
    [undefined, undefined, false],
    ['verify', undefined, false],
    ['verify', 'npm/9.12.3 ', false],
    ['other', 'pnpm/9.12.3 node/v24', false],
    ['verify', 'pnpm/9.12.3 node/v24', true],
  ])('monitors only the pinned pnpm verify parent: %s %s', async (event, agent, expected) => {
    proc.env.npm_lifecycle_event = event
    proc.env.npm_config_user_agent = agent
    await start()
    expect(monitor).toHaveBeenCalledTimes(expected ? 1 : 0)
    expect(clearInterval.mock.calls).toEqual(expected ? [[99]] : [])
    if (expected) {
      expect(monitor.mock.calls[0][1]).toBe(100)
      monitor.callback()
      expect(proc.kill).not.toHaveBeenCalled()
    }
  })
  it.each([
    ['SIGINT', 130],
    ['SIGTERM', 143],
    ['SIGHUP', 129],
  ])('aborts once on %s and preserves the exit and evidence', async (signal, code) => {
    proc.env.npm_lifecycle_event = 'verify'
    proc.env.npm_config_user_agent = 'pnpm/9.12.3 node/v24'
    outcomes = [{ code: 0 }, { hold: true }]
    const { result } = await held()
    handlers[signal]()
    handlers[signal]()
    await result
    expect(proc.exitCode).toBe(code)
    expect(proc.kill.mock.calls).toEqual(
      signal === 'SIGINT'
        ? [
            [-31337, 'SIGKILL'],
            [123, 'SIGHUP'],
          ]
        : [[-31337, 'SIGKILL']],
    )
    expect(snapshots.at(-1).status).toBe('aborted')
    expect(snapshots.at(-1).signal).toBe(signal)
    expect(snapshots.at(-1).rows[0].status).toBe('interrupted')
    expect(spawn).toHaveBeenCalledTimes(2)
    expect(clearInterval).toHaveBeenCalledWith(99)
  })
  it('aborts on parent loss and records the signal source', async () => {
    proc.env.npm_lifecycle_event = 'verify'
    proc.env.npm_config_user_agent = 'pnpm/9.12.3 node/v24'
    outcomes = [{ code: 0 }, { hold: true }]
    const { result } = await held()
    monitor.callback()
    expect(proc.kill).not.toHaveBeenCalled()
    proc.ppid = 999
    monitor.callback()
    await result
    expect(proc.exitCode).toBe(129)
    expect(snapshots.at(-1).signalSource).toBe('pnpm_parent_exit')
    expect(proc.kill.mock.calls).toEqual([[-31337, 'SIGKILL']])
  })
  it('records a launch error without accepting a clean baseline policy', async () => {
    outcomes = [{ error: new Error('missing node') }]
    await expect(start()).rejects.toThrow(/Baseline policy failed/)
    expect(snapshots.at(-1).status).toBe('fail')
    expect(snapshots.at(-1).baselinePolicy.status).toBe('fail')
    expect(console.error).toHaveBeenCalledWith('missing node')
  })
  it('fails closed on an unrecognized child signal', async () => {
    outcomes = [{ code: null, signal: 'SIGQUIT' }]
    await start()
    expect(proc.exitCode).toBe(1)
    expect(snapshots.at(-1).status).toBe('aborted')
  })
})

describe('aggregate edge conditions', () => {
  it('records elapsed command seconds independently of wall clock epoch', async () => {
    let milliseconds = 100000
    vi.spyOn(Date, 'now').mockImplementation(() => (milliseconds += 1000))
    await start()
    expect(snapshots.at(-1).baselinePolicy.seconds).toBe('1.0')
    expect(snapshots.at(-1).rows.map(({ seconds }) => seconds)).toEqual(rows.map(() => '1.0'))
  })
  it('builds a usable executable search path when PATH is absent', async () => {
    delete proc.env.PATH
    await start()
    expect(spawn.mock.calls[1][2].env.PATH).toMatch(/node_modules\/.bin:$/)
  })
  it('does not start commands after cancellation during signal registration', async () => {
    proc.on.mockImplementation((signal, fn) => {
      handlers[signal] = fn
      if (signal === 'SIGTERM') fn()
    })
    await start()
    expect(spawn).not.toHaveBeenCalled()
    expect(proc.kill).not.toHaveBeenCalled()
    expect(proc.exitCode).toBe(143)
    expect(snapshots.at(-1).status).toBe('aborted')
  })
  it.each(['ESRCH', 'EACCES'])(
    'suppresses only missing-process errors during group termination: %s',
    async (code) => {
      outcomes = [{ code: 0 }, { hold: true }]
      const { result } = await held()
      killError = code
      if (code === 'ESRCH') expect(() => handlers.SIGTERM()).not.toThrow()
      else expect(() => handlers.SIGTERM()).toThrow(/kill failed/)
      children.at(-1).emit('exit', null, 'SIGKILL')
      await result
      expect(snapshots.at(-1).status).toBe('aborted')
    },
  )
  it.each(['ESRCH', 'EACCES'])(
    'suppresses only missing-process errors during pnpm signal relay: %s',
    async (code) => {
      proc.env.npm_lifecycle_event = 'verify'
      proc.env.npm_config_user_agent = 'pnpm/9.12.3 node/v24'
      outcomes = [{ code: 0 }, { hold: true }]
      const { result } = await held()
      proc.kill.mockImplementation((pid) => {
        if (pid > 0) throw Object.assign(new Error('relay failed'), { code })
        children.at(-1).emit('exit', null, 'SIGKILL')
      })
      if (code === 'ESRCH') expect(() => handlers.SIGINT()).not.toThrow()
      else expect(() => handlers.SIGINT()).toThrow(/relay failed/)
      await result
      expect(proc.kill).toHaveBeenCalledWith(123, 'SIGHUP')
    },
  )
})

describe('interruption precedence', () => {
  it('does not relay SIGINT to a parent that has changed', async () => {
    proc.env.npm_lifecycle_event = 'verify'
    proc.env.npm_config_user_agent = 'pnpm/9.12.3 node/v24'
    outcomes = [{ code: 0 }, { hold: true }]
    const { result } = await held()
    proc.ppid = 999
    handlers.SIGINT()
    await result
    expect(proc.kill.mock.calls).toEqual([[-31337, 'SIGKILL']])
  })
  it('stops before reading a missing later row command after interruption', async () => {
    outcomes = [{ code: 0 }, { hold: true }]
    const { result } = await held()
    delete scripts.lint
    handlers.SIGTERM()
    await expect(result).resolves.toBeUndefined()
    expect(snapshots.at(-1).status).toBe('aborted')
    expect(proc.exitCode).toBe(143)
  })
  it('preserves interruption evidence if package reading also fails', async () => {
    readScripts = () => {
      handlers.SIGTERM()
      throw new Error('package unreadable')
    }
    await expect(start()).rejects.toThrow(/package unreadable/)
    expect(snapshots.at(-1).status).toBe('aborted')
    expect(proc.exitCode).toBe(143)
  })
})
