// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { parse } from 'yaml'
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
  it.each([1, 2, 127])('propagates git configuration exit %i', async (status) => {
    vi.stubEnv('CI', '')
    run
      .mockReturnValueOnce({ status: 0, stdout: '.git', stderr: '' })
      .mockReturnValue({ status, stdout: '', stderr: 'config failed' })
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
      [
        'test-policy',
        {
          'tests/unit/fixture.spec.mjs': 2,
          'tests/api/fixture.spec.ts': 1,
          'tests/e2e/fixture.spec.ts': 3,
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

describe('quality integration contracts', () => {
  it('uses the pre-push commit for Verify and fetches full history', () => {
    const workflow = parse(readFileSync('.github/workflows/test.yml', 'utf8'))
    const steps = workflow.jobs.verify.steps
    expect(
      steps.find((step) => step.uses?.startsWith('actions/checkout@')).with['fetch-depth'],
    ).toBe(0)
    expect(steps.find((step) => step.run === 'pnpm verify').env.QUALITY_BASE_REF).toBe(
      "${{ github.event_name == 'push' && github.event.before || format('origin/{0}', github.base_ref || 'dev') }}",
    )
  })
  it('never cancels a push run that a later push compares against', () => {
    const workflow = parse(readFileSync('.github/workflows/test.yml', 'utf8'))
    expect(workflow.concurrency).toEqual({
      group:
        "${{ github.workflow }}-${{ github.event_name == 'push' && github.sha || github.ref }}",
      'cancel-in-progress': true,
    })
  })
  it('resolves effect at or above the GHSA-7589-6fvf-x4pw fix', () => {
    const lock = parse(readFileSync('pnpm-lock.yaml', 'utf8'))
    const versions = Object.keys(lock.packages)
      .filter((key) => key.startsWith('effect@'))
      .map((key) => key.slice('effect@'.length).split('.').map(Number))
    expect(versions.length).toBeGreaterThan(0)
    for (const [major, minor, patch] of versions)
      expect(major * 1e6 + minor * 1e3 + patch).toBeGreaterThanOrEqual(3_022_001)
  })
  it('includes modules and layers in the typed lint project', () => {
    const project = JSON.parse(readFileSync('tsconfig.eslint.json', 'utf8'))
    expect(project.include).toEqual(expect.arrayContaining(['modules/**/*', 'layers/**/*']))
  })
  it('documents the default-branch prerequisite for the weekly scan', () => {
    const docs = readFileSync('docs/agents/quality-bar.md', 'utf8')
    expect(docs).toMatch(/schedule runs only (?:once|when) the workflow is on the default branch/)
  })
  it.each([
    ["it.skip('ticketed #23', () => {})", 1, {}],
    ["test.skip('ticketed #27', () => {})", 1, {}],
    ["test('body', () => { test.skip(true, 'missing setup') })", 0, { fixture: 1 }],
    ["test.skip('unticketed', () => {})", 3, { fixture: 3 }],
    ["describe.skip('group #23', () => { it('a', () => {}); it('b', () => {}) })", 2, {}],
    ["test.describe.skip('group #27', () => { test('a', () => {}); test('b', () => {}) })", 2, {}],
    [
      "test.describe('group', () => { test.skip(true, 'blocked #27'); test('a', () => {}); test('b', () => {}) })",
      2,
      {},
    ],
    [
      "describe.skip('group #23', () => { describe('inner', () => { it('a', () => {}); it.each([1])('b', () => {}) }); it.skip('c #23', () => {}) })",
      3,
      {},
    ],
    ["test.skip(true, 'blocked #27'); test('a', () => {}); test('b', () => {})", 2, {}],
    ["test('body #27', () => { test.skip(true, 'blocked') }); test('other', () => {})", 1, {}],
    [
      "describe.skip('group #23', () => { it('a', () => {}); it('b', () => {}) })",
      3,
      { fixture: 1 },
    ],
    [
      "test.describe('group', () => { test.skip(true, 'blocked'); test('a', () => {}); test('b', () => {}) })",
      2,
      { fixture: 2 },
    ],
    [
      "test.describe('group', () => { test('a #27', () => { test.skip(true, 'blocked') }); test('b', () => {}) })",
      2,
      { fixture: 1 },
    ],
  ])('combines runtime and source skips for %s', async (text, runtime, expected) => {
    const directory = mkdtempSync(resolve(common.outputDir, 'composition-'))
    const file = join(directory, 'fixture.spec.mjs')
    writeFileSync(file, text)
    const ratchet = vi.fn()
    options.sourceFiles = () => [file]
    options.ratchet = ratchet
    vi.doMock('../../scripts/quality/test-results.mjs', () => ({
      runVitest: () => (runtime ? { [file]: runtime } : {}),
      runPlaywright: () => ({}),
    }))
    try {
      await row('test-policy')
      expect(ratchet.mock.calls).toEqual([
        ['test-policy', expected.fixture ? { [file]: expected.fixture } : {}],
      ])
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
