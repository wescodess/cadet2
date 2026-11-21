// @vitest-environment node
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
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
  it('adds skips the runners cannot observe to the runtime counts', async () => {
    const ratchet = vi.fn()
    const unobservedSkips = vi.fn(
      (file) => ({ 'tests/e2e/fixture.spec.ts': 2, 'tests/helpers/plain.ts': 1 })[file] ?? 0,
    )
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
    vi.doMock('../../scripts/quality/test-policy-source.mjs', () => ({ unobservedSkips }))
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
    expect(unobservedSkips.mock.calls.map(([file]) => file)).toEqual(population.slice(0, -1))
    expect(ratchet.mock.calls).toEqual([
      [
        'test-policy',
        {
          'tests/unit/fixture.spec.mjs': 2,
          'tests/e2e/fixture.spec.ts': 5,
          'tests/helpers/plain.ts': 1,
        },
      ],
    ])
  })
})

describe('no new skips', () => {
  const baselined = 'tests/e2e/workspace-recommendation-run-comparison.red.atdd.spec.ts'
  const legacy = common.json('scripts/quality/baselines/test-policy.json').counts
  const unit = [
    "import { describe, it } from 'vitest'",
    ...[1, 2, 3].map((index) => `it.skip('legacy ${index}', () => {})`),
    "it('runs', () => {})",
  ]
  const browser = [
    "import { test } from '@playwright/test'",
    ...[1, 2, 3].map((index) => `test.skip('legacy ${index}', async () => {})`),
    "test('runs', async () => {})",
  ]

  async function policy(runner, lines) {
    const directory = realpathSync(mkdtempSync(resolve(common.outputDir, 'no-skip-')))
    const file = join(directory, runner === 'vitest' ? 'fixture.test.mjs' : 'fixture.spec.ts')
    const config = join(directory, `${runner}.config.mjs`)
    writeFileSync(file, [...lines, ''].join('\n'))
    writeFileSync(
      config,
      runner === 'vitest'
        ? `export default { test: { include: [${JSON.stringify(file)}] } }\n`
        : `export default { testDir: ${JSON.stringify(directory)}, testMatch: ['fixture.spec.ts'], projects: [{ name: 'fixture' }] }\n`,
    )
    const subject = common.localPath(file)
    run.mockImplementation((command, args, settings) =>
      common.run(command, args[1] === runner ? [...args, '--config', config] : args, settings),
    )
    options.sourceFiles = () => [subject]
    options.ratchet = (name, { [subject]: value = 0, ...rest }) =>
      common.ratchet(name, { ...legacy, ...rest, [baselined]: value })
    vi.doMock('../../scripts/quality/test-results.mjs', async (importOriginal) => {
      const actual = await importOriginal()
      return {
        runVitest: runner === 'vitest' ? actual.runVitest : () => ({}),
        runPlaywright: () => (runner === 'playwright' ? actual.runPlaywright([file]) : {}),
      }
    })
    try {
      return await row('test-policy')
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }

  it.each([
    ['vitest', unit],
    ['playwright', browser],
  ])(
    'passes the unchanged %s legacy skips at 52/52',
    async (runner, lines) => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      await expect(policy(runner, lines)).resolves.toBeUndefined()
      expect(log).toHaveBeenCalledWith('test-policy: PASS (52 current; 52 baseline)')
    },
    60_000,
  )

  it.each([
    ['vitest', unit],
    ['playwright', browser],
  ])(
    'asks to lower the allowance when a %s legacy skip is removed',
    async (runner, lines) => {
      await expect(
        policy(
          runner,
          lines.filter((line) => !line.includes('legacy 3')),
        ),
      ).rejects.toThrow(`test-policy regression:\n${baselined}: lower allowance to 2`)
    },
    60_000,
  )

  it.each(
    ['', ' #23'].flatMap((ticket) => [
      ['vitest', `it.skip('new${ticket}', () => {})`, 4],
      ['playwright', `test.skip('new${ticket}', async () => {})`, 4],
      ['vitest', `describe.skip('new${ticket}', () => { it('a', () => {}) })`, 4],
      ['playwright', `test.describe.skip('new${ticket}', () => { test('a', async () => {}) })`, 4],
      ['playwright', `test('new', async () => { test.skip(true, 'blocked${ticket}') })`, 4],
      ['vitest', `it.todo('new${ticket}')`, 4],
      ['vitest', `it('new', (ctx) => { ctx.skip('blocked${ticket}') })`, 5],
    ]),
  )(
    'rejects a new %s skip: %s',
    async (runner, line, total) => {
      await expect(
        policy(runner, [...(runner === 'vitest' ? unit : browser), line]),
      ).rejects.toThrow(`test-policy regression:\n${baselined}: ${total} > 3`)
    },
    60_000,
  )

  it.each([
    [
      'an inactive group ticket beside unticketed skips',
      [
        "test.describe('active tests', () => {",
        "  test.skip(false, 'inactive ticket #27')",
        "  test('a', async () => {})",
        "  test('b', async () => {})",
        "  test('c', async () => {})",
        '})',
        "for (let i = 0; i < 6; i++) test.skip('unticketed ' + i, async () => {})",
      ],
      7,
    ],
    [
      'an inactive group ticket around unticketed skips',
      [
        "test.describe('active group', () => {",
        "  test.skip(false, 'inactive #27')",
        "  for (let i = 0; i < 6; i++) test.skip('unticketed inside ' + i, async () => {})",
        '})',
        "test.skip('unticketed outside a', async () => {})",
        "test.skip('unticketed outside b', async () => {})",
      ],
      9,
    ],
    [
      'an inactive in-body ticket under a group skip',
      [
        "test.describe.skip('unticketed group', () => {",
        "  for (let i = 0; i < 6; i++) test('unticketed ' + i, async () => {",
        "    test.skip(false, 'inactive #27')",
        '  })',
        '})',
        "test.skip('outside a', async () => {})",
        "test.skip('outside b', async () => {})",
      ],
      9,
    ],
    [
      'a ticket in a never-called nested function',
      [
        "test.describe.skip('unticketed group', () => {",
        "  for (let i = 0; i < 6; i++) test('unticketed ' + i, async () => {",
        "    function never() { test.skip(true, 'inactive #27') }",
        '  })',
        '})',
        "test.skip('outside a', async () => {})",
        "test.skip('outside b', async () => {})",
      ],
      9,
    ],
  ])(
    'rejects the earlier leak through %s',
    async (_name, lines, total) => {
      await expect(
        policy('playwright', ["import { test } from '@playwright/test'", ...lines]),
      ).rejects.toThrow(`test-policy regression:\n${baselined}: ${total} > 3`)
    },
    60_000,
  )

  it.each([
    ['vitest', "it.only('focused', () => {})", /focused tests are forbidden/],
    [
      'playwright',
      "test.only('focused', async () => {})",
      /Playwright discovery failed \(focus forbidden\)/,
    ],
  ])(
    'rejects %s focus',
    async (runner, line, failure) => {
      await expect(
        policy(runner, [...(runner === 'vitest' ? unit : browser), line]),
      ).rejects.toThrow(failure)
    },
    60_000,
  )
})

describe('test inventory path boundaries', () => {
  it.each([
    ['app/tests/e2e/fixture.spec.ts', true],
    ['tests/e2e/fixture.spec.ts.vue', true],
    ['app/fixture.spec.ts.vue', false],
  ])('keeps %s out of Playwright discovery', async (file, scan) => {
    const runPlaywright = vi.fn(() => ({}))
    const unobservedSkips = vi.fn(() => 0)
    options.sourceFiles = () => [file]
    options.ratchet = vi.fn()
    vi.doMock('../../scripts/quality/test-results.mjs', () => ({
      runVitest: () => ({}),
      runPlaywright,
    }))
    vi.doMock('../../scripts/quality/test-policy-source.mjs', () => ({ unobservedSkips }))
    await row('test-policy')
    expect(runPlaywright).toHaveBeenCalledWith([])
    expect(unobservedSkips.mock.calls.map(([path]) => path)).toEqual(scan ? [file] : [])
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
})
