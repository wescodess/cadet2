// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as common from '../../scripts/quality/common.mjs'

let completion, options, run
beforeEach(() => {
  vi.resetModules()
  options = {}
  run = vi.fn(() => ({ status: 0, stdout: '.git\n', stderr: '' }))
  vi.doMock('../../scripts/quality/common.mjs', () => ({
    ...common,
    run,
    main: (fn) => {
      completion = Promise.resolve().then(fn)
    },
    ...options,
  }))
})
afterEach(() => {
  for (const module of ['common', 'test-results', 'test-policy-source'])
    vi.doUnmock(`../../scripts/quality/${module}.mjs`)
  vi.unstubAllEnvs()
})
async function row(name) {
  await import(`../../scripts/quality/${name}.mjs`)
  return completion
}

describe('hook installation', () => {
  it('uses local configuration in a standalone clone', async () => {
    vi.stubEnv('CI', '')
    await expect(row('install-hooks')).resolves.toBeUndefined()
    expect(run.mock.calls.map(([, args]) => args)).toEqual([
      ['rev-parse', '--git-dir'],
      ['rev-parse', '--git-common-dir'],
      ['config', '--local', 'core.hooksPath', '.husky'],
    ])
  })
  it('enables worktree configuration before setting a worktree hook path', async () => {
    vi.stubEnv('CI', '')
    run.mockReturnValueOnce({ status: 0, stdout: '.git/worktrees/fixture\n', stderr: '' })
    await expect(row('install-hooks')).resolves.toBeUndefined()
    expect(run.mock.calls.map(([command, args]) => [command, args])).toEqual([
      ['git', ['rev-parse', '--git-dir']],
      ['git', ['rev-parse', '--git-common-dir']],
      ['git', ['config', '--local', 'extensions.worktreeConfig', 'true']],
      ['git', ['config', '--worktree', 'core.hooksPath', '.husky']],
    ])
  })
  it('does not install hooks in CI', async () => {
    vi.stubEnv('CI', 'true')
    await expect(row('install-hooks')).resolves.toBeUndefined()
    expect(run).not.toHaveBeenCalled()
  })
  it('accepts an archive without a git repository', async () => {
    vi.stubEnv('CI', '')
    run.mockReturnValue({ status: 128, stdout: '', stderr: 'not a repository' })
    await expect(row('install-hooks')).resolves.toBeUndefined()
    expect(run).toHaveBeenCalledTimes(1)
  })
  it('propagates failed git configuration', async () => {
    vi.stubEnv('CI', '')
    run
      .mockReturnValueOnce({ status: 0, stdout: '.git', stderr: '' })
      .mockReturnValue({ status: 1, stdout: '', stderr: 'config failed' })
    await expect(row('install-hooks')).rejects.toThrow(/config failed/)
  })
})

describe('test policy composition', () => {
  it('ratchets runtime counts and independently scans the full source test population', async () => {
    const ratchet = vi.fn()
    const scanFile = vi.fn((file, counts) => {
      counts[file] = 1
    })
    const runVitest = vi.fn(() => ({ 'tests/unit/fixture.spec.mjs': 2 }))
    const runPlaywright = vi.fn(() => ({ 'tests/e2e/fixture.spec.ts': 3 }))
    const population = [
      'tests/unit/fixture.spec.mjs',
      'tests/api/fixture.spec.ts',
      'tests/e2e/fixture.spec.ts',
      'tests/integration/fixture.spec.ts',
      'tests/helpers/plain.ts',
      'app/fixture.test.js',
      'server/fixture.spec.cjs',
      'app/plain.ts',
    ]
    options.sourceFiles = () => population
    options.ratchet = ratchet
    vi.doMock('../../scripts/quality/test-results.mjs', () => ({ runVitest, runPlaywright }))
    vi.doMock('../../scripts/quality/test-policy-source.mjs', () => ({ scanFile }))
    await expect(row('test-policy')).resolves.toBeUndefined()
    expect(runVitest).toHaveBeenCalledTimes(1)
    expect(runPlaywright.mock.calls).toEqual([
      [
        [
          'tests/api/fixture.spec.ts',
          'tests/e2e/fixture.spec.ts',
          'tests/integration/fixture.spec.ts',
        ],
      ],
    ])
    expect(scanFile.mock.calls.map(([file]) => file)).toEqual([
      'tests/unit/fixture.spec.mjs',
      'tests/api/fixture.spec.ts',
      'tests/e2e/fixture.spec.ts',
      'tests/integration/fixture.spec.ts',
      'tests/helpers/plain.ts',
      'app/fixture.test.js',
      'server/fixture.spec.cjs',
    ])
    expect(ratchet.mock.calls).toEqual([
      ['test-policy', { 'tests/unit/fixture.spec.mjs': 2, 'tests/e2e/fixture.spec.ts': 3 }],
      [
        'test-policy',
        {
          'tests/unit/fixture.spec.mjs': 1,
          'tests/api/fixture.spec.ts': 1,
          'tests/e2e/fixture.spec.ts': 1,
          'tests/integration/fixture.spec.ts': 1,
          'tests/helpers/plain.ts': 1,
          'app/fixture.test.js': 1,
          'server/fixture.spec.cjs': 1,
        },
      ],
    ])
  })
})

describe('test inventory path boundaries', () => {
  it.each([
    ['app/tests/e2e/fixture.spec.ts', true],
    ['tests/e2e/fixture.spec.ts.vue', true],
    ['app/fixture.spec.ts.vue', false],
  ])('keeps %s out of Playwright discovery', async (file, scan) => {
    const runPlaywright = vi.fn(() => ({}))
    const scanFile = vi.fn()
    options.sourceFiles = () => [file]
    options.ratchet = vi.fn()
    vi.doMock('../../scripts/quality/test-results.mjs', () => ({
      runVitest: () => ({}),
      runPlaywright,
    }))
    vi.doMock('../../scripts/quality/test-policy-source.mjs', () => ({ scanFile }))
    await row('test-policy')
    expect(runPlaywright).toHaveBeenCalledWith([])
    expect(scanFile.mock.calls.map(([path]) => path)).toEqual(scan ? [file] : [])
  })
})
