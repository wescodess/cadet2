// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setImmediate } from 'node:timers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let spawnSync, common, root
beforeEach(async () => {
  vi.resetModules()
  root = mkdtempSync(join(tmpdir(), 'quality-common-'))
  spawnSync = vi.fn(() => ({ status: 0, stdout: '', stderr: '' }))
  vi.doMock('node:child_process', () => ({ spawnSync }))
  common = await import('../../scripts/quality/common.mjs')
})
afterEach(() => {
  vi.doUnmock('node:child_process')
  vi.restoreAllMocks()
  rmSync(root, { recursive: true, force: true })
})

describe('shared quality command boundary', () => {
  it('preserves process results and forwards command options', () => {
    const result = { status: 2, stdout: 'diagnostic', stderr: '' }
    spawnSync.mockReturnValue(result)
    expect(common.run('compiler', ['--check'], { cwd: root })).toBe(result)
    expect(spawnSync.mock.calls).toEqual([
      ['compiler', ['--check'], { encoding: 'utf8', maxBuffer: 67108864, cwd: root }],
    ])
  })
  it('throws process launch errors', () => {
    spawnSync.mockReturnValue({ error: new Error('ENOENT') })
    expect(() => common.run('missing', [])).toThrow(/ENOENT/)
  })
  it('throws signal termination rather than accepting a null exit', () => {
    spawnSync.mockReturnValue({ status: null, signal: 'SIGTERM' })
    expect(() => common.run('compiler', [])).toThrow(/SIGTERM/)
  })
  it.each([1, 2, 127])('trims successful git output and rejects git exit %i', (status) => {
    spawnSync
      .mockReturnValueOnce({ status: 0, stdout: '  value\n', stderr: '' })
      .mockReturnValueOnce({ status, stdout: '', stderr: 'git failed' })
    expect(common.git('rev-parse', 'HEAD')).toBe('value')
    expect(() => common.git('show', 'missing')).toThrow(/git failed/)
  })
  it('inventories tracked and untracked files with stable deduplication and exclusions', () => {
    spawnSync.mockReturnValue({
      status: 0,
      stdout: [
        'z.ts',
        'app/a.vue',
        'app/a.vue',
        'convex/_generated/a.ts',
        'server/a.mjs',
        'shared/a.cjs',
        'convex/new.ts',
        'scripts/a.js',
        'tests/a.ts',
        'README.md',
        'vendor/a.ts',
        'app/a.json',
        '',
      ].join('\0'),
      stderr: '',
    })
    expect(common.files()).toEqual([
      'README.md',
      'app/a.json',
      'app/a.vue',
      'convex/_generated/a.ts',
      'convex/new.ts',
      'scripts/a.js',
      'server/a.mjs',
      'shared/a.cjs',
      'tests/a.ts',
      'vendor/a.ts',
      'z.ts',
    ])
    expect(common.sourceFiles()).toEqual([
      'app/a.vue',
      'convex/new.ts',
      'scripts/a.js',
      'server/a.mjs',
      'shared/a.cjs',
      'tests/a.ts',
      'z.ts',
    ])
    expect(spawnSync.mock.calls[0][1]).toEqual([
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '-z',
    ])
  })
  it('counts repeated findings independently per key', () => {
    const counts = {}
    common.count(counts, 'a')
    common.count(counts, 'a')
    common.count(counts, 'b')
    expect(counts).toEqual({ a: 2, b: 1 })
  })
  it('writes and reads formatted JSON and normalizes local paths', () => {
    const file = join(root, 'data.json')
    common.writeJSON(file, { b: 1, a: [2] })
    expect(readFileSync(file, 'utf8')).toBe('{\n  "b": 1,\n  "a": [\n    2\n  ]\n}\n')
    expect(common.json(file)).toEqual({ b: 1, a: [2] })
    expect(common.localPath(resolve('app/example.ts'))).toBe('app/example.ts')
    expect(common.localPath(resolve('app/example\\file.ts'))).toBe('app/example/file.ts')
  })
  it('converts rejected work into a nonzero process exit', async () => {
    const previous = process.exitCode
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      process.exitCode = 0
      common.main(() => {
        throw new Error('gate rejected')
      })
      await new Promise((done) => setImmediate(done))
      expect(process.exitCode).toBe(1)
      expect(log).toHaveBeenCalledWith('gate rejected')
    } finally {
      process.exitCode = previous
    }
  })
})

describe('source inventory boundary cases', () => {
  it('recognizes root modules and rejects lookalike path and extension prefixes', () => {
    spawnSync.mockReturnValue({
      status: 0,
      stderr: '',
      stdout: [
        'config.js',
        'config.mjs',
        'config.cjs',
        'config.ts',
        'config.ts.bak',
        'vendor/app/file.ts',
        'scripts/file.mjs',
        'app/file.ts.bak',
        'app/file.vue',
        'app/file.js',
      ].join('\0'),
    })
    expect(common.sourceFiles()).toEqual([
      'app/file.js',
      'app/file.vue',
      'config.cjs',
      'config.js',
      'config.mjs',
      'config.ts',
      'scripts/file.mjs',
    ])
  })
})
