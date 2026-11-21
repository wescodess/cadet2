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
    const runVitest = vi.fn(() => ({ 'tests/unit/fixture.spec.mjs': [null, null] }))
    const runPlaywright = vi.fn(() => ({ 'tests/e2e/fixture.spec.ts': [null, null, null] }))
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
    vi.doMock('../../scripts/quality/test-policy-source.mjs', async (importOriginal) => ({
      ...(await importOriginal()),
      scanFile,
    }))
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

describe('ticketed skip credit', () => {
  it('credits only runtime skips that a ticketed skip covers, not tests an inactive skip leaves runnable', async () => {
    const directory = mkdtempSync(resolve(common.outputDir, 'inactive-skip-'))
    const file = join(directory, 'fixture.spec.ts')
    writeFileSync(
      file,
      [
        "import { test } from '@playwright/test'",
        "test.describe('active tests', () => {",
        "  test.skip(false, 'inactive ticket #27')",
        "  test('a', async () => {})",
        "  test('b', async () => {})",
        "  test('c', async () => {})",
        '})',
        "for (let i = 0; i < 6; i++) test.skip('unticketed ' + i, async () => {})",
        '',
      ].join('\n'),
    )
    const input = JSON.parse(
      readFileSync(new URL('./quality-parsers/playwright-list.json', import.meta.url), 'utf8'),
    ).valid
    const report = JSON.parse(input.stdout)
    const [template] = report.suites[0].specs
    const spec = (title, line, column, expectedStatus) => ({
      ...template,
      title,
      id: `fixture-${title}`,
      file: 'fixture.spec.ts',
      line,
      column,
      tests: [{ ...template.tests[0], expectedStatus }],
    })
    report.config.rootDir = directory
    report.suites = [
      {
        title: 'fixture.spec.ts',
        file: 'fixture.spec.ts',
        line: 0,
        column: 0,
        specs: Array.from({ length: 6 }, (_, index) =>
          spec(`unticketed ${index}`, 8, 34, 'skipped'),
        ),
        suites: [
          {
            title: 'active tests',
            file: 'fixture.spec.ts',
            line: 2,
            column: 6,
            specs: ['a', 'b', 'c'].map((title, index) => spec(title, 4 + index, 3, 'passed')),
          },
        ],
      },
    ]
    report.stats.skipped = 9
    run.mockImplementation(() => {
      writeFileSync(join(common.outputDir, 'playwright-list.json'), JSON.stringify(report))
      return { status: 0, stdout: '', stderr: '' }
    })
    const ratchet = vi.fn()
    options.sourceFiles = () => [common.localPath(file)]
    options.ratchet = ratchet
    vi.doMock('../../scripts/quality/test-results.mjs', async (importOriginal) => {
      const actual = await importOriginal()
      return { runVitest: () => ({}), runPlaywright: () => actual.runPlaywright([file]) }
    })
    try {
      await row('test-policy')
      expect(ratchet.mock.calls).toEqual([['test-policy', { [common.localPath(file)]: 6 }]])
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
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
    vi.doMock('../../scripts/quality/test-policy-source.mjs', async (importOriginal) => ({
      ...(await importOriginal()),
      scanFile,
    }))
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
    ["it.skip('ticketed #23', () => {})", ['it.skip'], {}],
    ["test.skip('ticketed #27', () => {})", ['test.skip'], {}],
    ["test('body', () => { test.skip(true, 'missing setup') })", [], { fixture: 1 }],
    ["test.skip('unticketed', () => {})", ['test.skip', 'test.skip', 'test.skip'], { fixture: 3 }],
    [
      "describe.skip('group #23', () => { it('a', () => {}); it('b', () => {}) })",
      ["it('a'", "it('b'"],
      {},
    ],
    [
      "test.describe.skip('group #27', () => { test('a', () => {}); test('b', () => {}) })",
      ["test('a'", "test('b'"],
      {},
    ],
    [
      "test.describe('group', () => { test.skip(true, 'blocked #27'); test('a', () => {}); test('b', () => {}) })",
      ["test('a'", "test('b'"],
      {},
    ],
    [
      "describe.skip('group #23', () => { describe('inner', () => { it('a', () => {}); it.each([1])('b', () => {}) }); it.skip('c #23', () => {}) })",
      ["it('a'", ")('b'", "skip('c"],
      {},
    ],
    [
      "test.skip(true, 'blocked #27'); test('a', () => {}); test('b', () => {})",
      ["test('a'", "test('b'"],
      {},
    ],
    [
      "test('body #27', () => { test.skip(true, 'blocked') }); test('other', () => {})",
      ["test('body"],
      {},
    ],
    [
      "describe.skip('group #23', () => { it('a', () => {}); it('b', () => {}) })",
      ["it('a'", "it('b'", null],
      { fixture: 1 },
    ],
    [
      "test.describe('group', () => { test.skip(true, 'blocked'); test('a', () => {}); test('b', () => {}) })",
      ["test('a'", "test('b'"],
      { fixture: 2 },
    ],
    [
      "test.describe('group', () => { test('a #27', () => { test.skip(true, 'blocked') }); test('b', () => {}) })",
      ["test('a", "test('b'"],
      { fixture: 1 },
    ],
    [
      "describe.skip('group #23', () => { it('a', () => {}) }); it('outside', () => {})",
      ["it('a'", "it('outside'"],
      { fixture: 1 },
    ],
    [
      "it.skip('a #23', (ctx) => { ctx.skip() }); it('b', () => {})",
      ["skip('a", "it('b'"],
      { fixture: 1 },
    ],
    [
      "test.describe('group', () => { test.skip(() => true, 'blocked #27'); test('a', async () => {}); test('b', async () => {}) })",
      ["test('a'", "test('b'"],
      {},
    ],
    [
      "describe.skip('group #23', () => { it.todo('a'); it('b', () => {}) })",
      ['it.todo', "it('b'"],
      {},
    ],
    [
      "describe.skip('group #23', () => { it('a', () => {}); it.skip('b #23', () => {}) })",
      ["it('a'", "skip('b", null],
      { fixture: 1 },
    ],
    [
      "test.describe('active', () => { test.skip(false, 'inactive #27'); test('a', async () => {}); test('b', async () => {}); test('c', async () => {}) }); for (let i = 0; i < 6; i++) test.skip('unticketed ' + i, async () => {})",
      Array(6).fill("skip('unticketed"),
      { fixture: 6 },
    ],
    [
      "describe.skipIf(false)('active #23', () => { it('a', () => {}); it('b', () => {}) }); it.skip('c', () => {}); it.skip('d', () => {})",
      ["skip('c", "skip('d"],
      { fixture: 2 },
    ],
  ])('combines runtime and source skips for %s', async (text, markers, expected) => {
    const directory = mkdtempSync(resolve(common.outputDir, 'composition-'))
    const file = join(directory, 'fixture.spec.mjs')
    writeFileSync(file, text)
    const runtime = markers.map((marker) => {
      if (marker === null) return null
      const index = text.indexOf(marker)
      if (index < 0) throw new Error(`Missing runtime marker ${marker}`)
      return { line: 1, column: index + 1 }
    })
    const ratchet = vi.fn()
    options.sourceFiles = () => [file]
    options.ratchet = ratchet
    vi.doMock('../../scripts/quality/test-results.mjs', () => ({
      runVitest: () => (runtime.length ? { [file]: runtime } : {}),
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
