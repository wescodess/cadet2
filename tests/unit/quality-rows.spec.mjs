// @vitest-environment node
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as common from '../../scripts/quality/common.mjs'

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`./quality-parsers/${name}.json`, import.meta.url), 'utf8'))
const success = { status: 0, stdout: '', stderr: '' }
let directory
let completion
let run
let source
let options
const originalArgv = process.argv

beforeEach(() => {
  vi.resetModules()
  options = {}
  directory = mkdtempSync(resolve(common.outputDir, 'row-fixture-'))
  source = join(directory, 'fixture.ts')
  writeFileSync(source, 'export const fixture = 1\n')
  run = vi.fn(() => success)
  vi.doMock('../../scripts/quality/common.mjs', () => ({
    ...common,
    outputDir: directory,
    run,
    files: () => [source],
    sourceFiles: () => [source],
    main: (fn) => {
      completion = Promise.resolve().then(fn)
    },
    ...options,
  }))
})

afterEach(() => {
  process.argv = originalArgv
  vi.doUnmock('prettier')
  vi.doUnmock('node:fs')
  for (const module of ['common', 'install-gitleaks', 'package-inventory'])
    vi.doUnmock(`../../scripts/quality/${module}.mjs`)
  vi.doUnmock('eslint')
  vi.restoreAllMocks()
  rmSync(directory, { recursive: true, force: true })
})

async function row(name) {
  await import(`../../scripts/quality/${name}.mjs`)
  return completion
}

const installedPackages = ['minimatch@1.0.0', 'installed-alias-target@2.0.0']
const lockPackages = ['minimatch@1.0.0', '@esbuild/linux-x64@0.25.0', 'synthetic-importer@0.0.0']

function inventory(installed = installedPackages, lock = lockPackages) {
  vi.doMock('../../scripts/quality/package-inventory.mjs', () => ({
    packageInventory: () => ({
      installed: new Map(installed.map((id) => [id, {}])),
      lock: {},
    }),
    auditPackages: () => [...lock],
    licenseScanDirectory: () => mkdtempSync(join(directory, 'licenses-')),
  }))
}

function dependencyOutput({
  audit,
  licenses,
  install,
  installed = installedPackages,
  lock = lockPackages,
}) {
  inventory(installed, lock)
  const report = JSON.parse(audit.stdout)
  report.metadata.dependencies = lock.length - 2
  report.metadata.devDependencies = 1
  report.metadata.optionalDependencies = 1
  report.metadata.totalDependencies = lock.length
  audit = { ...audit, stdout: JSON.stringify(report) }
  const licensePopulation = JSON.parse(licenses)
  if (licensePopulation.MIT)
    licensePopulation.MIT.push({ name: 'installed-alias-target', versions: ['2.0.0'] })
  else licensePopulation.MIT = [{ name: 'installed-alias-target', versions: ['2.0.0'] }]
  licenses = JSON.stringify(licensePopulation)
  run.mockImplementation((command, args) => {
    if (args[0] === 'install') return install
    if (args[0] === 'audit') return audit
    if (args.includes('licenses')) return { ...success, stdout: licenses }
    throw new Error(`Unexpected command: ${command} ${args.join(' ')}`)
  })
}

describe('public quality row entry points preserve parser decisions', () => {
  it('typecheck rejects a new diagnostic from the compiler report', async () => {
    run.mockImplementation((command, args) =>
      args.includes('prepare') ? success : fixture('types').valid,
    )
    await expect(row('types')).rejects.toThrow(
      /types: new files must be clean: app\/fixture.ts\|TS2322/,
    )
  })

  it('lint rejects a new rule finding from ESLint', async () => {
    const report = fixture('lint').alsoValid[0].results
    report[0].filePath = source
    vi.doMock('eslint', () => ({
      ESLint: class {
        async lintFiles() {
          return report
        }
      },
    }))
    await expect(row('lint')).rejects.toThrow(/lint: new files must be clean: .*\|fixture-rule/)
  })

  it('format command rejects a real new unformatted file', () => {
    const probe = mkdtempSync(resolve('app', 'quality-format-probe-'))
    const file = join(probe, 'fixture.ts')
    try {
      writeFileSync(file, 'export const fixture={a:1,b:2};\n')
      const result = common.run(process.execPath, ['scripts/quality/format.mjs', file])
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('Format regression')
      expect(result.stderr).toContain(common.localPath(file))
    } finally {
      rmSync(probe, { recursive: true, force: true })
    }
  })

  it('secret row rejects a finding returned by gitleaks', async () => {
    vi.doMock('../../scripts/quality/install-gitleaks.mjs', () => ({
      gitleaks: async () => 'fixture-gitleaks',
    }))
    run.mockImplementation((command, args) => {
      const report = args.find((arg) => arg.startsWith('--report-path='))
      const finding = fixture('gitleaks').valid
      writeFileSync(report.slice('--report-path='.length), finding.stdout)
      return { ...success, status: 42 }
    })
    await expect(row('secrets')).rejects.toThrow(/secrets history: 1 new findings/)
  })

  it('dependencies reject the audit parser losing an advisory', async () => {
    const audit = fixture('audit').valid
    dependencyOutput({
      audit,
      licenses: '{"MIT":[{"name":"minimatch","versions":["1.0.0"]}]}',
      install: fixture('frozen-install').valid,
    })
    await expect(row('dependencies')).rejects.toThrow(/advisories: new unallowlisted findings/)
  })

  it('dependencies reject a package license that disagrees with its permitted category', async () => {
    const audit = fixture('audit').valid
    const clean = JSON.parse(audit.stdout)
    clean.actions = []
    clean.advisories = {}
    clean.metadata.vulnerabilities.high = 0
    audit.stdout = JSON.stringify(clean)
    audit.status = 0
    dependencyOutput({
      audit,
      licenses: '{"MIT":[{"name":"minimatch","versions":["1.0.0"],"license":"GPL-3.0"}]}',
      install: fixture('frozen-install').valid,
    })
    await expect(row('dependencies')).rejects.toThrow(/Invalid pnpm licenses report/)
  })

  it('dependencies reject a frozen install with a missing completion event', async () => {
    const install = fixture('frozen-install').valid
    install.stdout = install.stdout.split('\n').slice(0, -2).join('\n') + '\n'
    dependencyOutput({ audit: fixture('audit').valid, licenses: '{}', install })
    await expect(row('dependencies')).rejects.toThrow(/Invalid frozen-lockfile install/)
  })

  it('test policy Vitest entry point retains a runtime skip in its counts', async () => {
    const input = fixture('vitest-results').valid
    run.mockImplementation((command, args) => {
      const output = args.find((arg) => arg.startsWith('--outputFile='))
      if (!output) return { ...success, stdout: input.files }
      writeFileSync(output.slice('--outputFile='.length), input.stdout)
      return success
    })
    const { runVitest } = await import('../../scripts/quality/test-results.mjs')
    expect(runVitest()).toStrictEqual({ [common.localPath('/repo/tests/unit/example.spec.ts')]: 1 })
  })

  it('test policy Playwright entry point retains declared skips in its counts', async () => {
    const input = fixture('playwright-list').valid
    const report = JSON.parse(input.stdout)
    report.suites[0].specs[0].tests[0].expectedStatus = 'skipped'
    input.stdout = JSON.stringify(report)
    run.mockImplementation(() => {
      writeFileSync(join(directory, 'playwright-list.json'), input.stdout)
      return success
    })
    const { runPlaywright } = await import('../../scripts/quality/test-results.mjs')
    expect(runPlaywright(input.files)).toStrictEqual({
      [common.localPath(input.files[0])]: 1,
    })
  })
})

describe('quality gate regression boundaries', () => {
  it.each([1, 2])(
    'types enforce the literal existing-file allowance at %i diagnostics',
    async (amount) => {
      run.mockImplementation((command, args) => {
        if (args.includes('prepare') || args.includes('tsc')) return success
        return {
          status: 1,
          stderr: '',
          stdout:
            Array.from(
              { length: amount },
              (_, index) =>
                `nuxt.config.ts(${index + 1},1): error TS2322: Type 'string' is not assignable to type 'number'.`,
            ).join('\n') + '\n',
        }
      })
      if (amount === 1) await expect(row('types')).resolves.toBeUndefined()
      else await expect(row('types')).rejects.toThrow(/types regression/)
    },
  )

  it.each([1, 2])(
    'lint enforces the literal existing-file allowance at %i findings',
    async (amount) => {
      const report = fixture('lint').alsoValid[0].results
      report[0].filePath = resolve('app/components/admin/CitationIntegrityCard.vue')
      report[0].messages = Array.from({ length: amount }, () => ({
        ...report[0].messages[0],
        ruleId: '@typescript-eslint/no-unused-vars',
      }))
      report[0].warningCount = 0
      report[0].errorCount = amount
      source = report[0].filePath
      vi.doMock('eslint', () => ({
        ESLint: class {
          async lintFiles() {
            return report
          }
        },
      }))
      if (amount === 1) await expect(row('lint')).resolves.toBeUndefined()
      else await expect(row('lint')).rejects.toThrow(/lint regression/)
    },
  )

  it.each([1, 2, 127])(
    'rejects Nuxt preparation exit %i before invoking either compiler',
    async (status) => {
      run.mockReturnValueOnce({ status, stdout: '', stderr: 'prepare unavailable' })
      await expect(row('types')).rejects.toThrow(/prepare unavailable/)
      expect(run.mock.calls).toEqual([['pnpm', ['exec', 'nuxt', 'prepare']]])
    },
  )

  it.each(['high', 'critical'])('rejects an unallowlisted %s advisory', async (severity) => {
    const audit = fixture('audit').valid
    const report = JSON.parse(audit.stdout)
    report.advisories['1113540'].severity = severity
    report.metadata.vulnerabilities.high = severity === 'high' ? 1 : 0
    report.metadata.vulnerabilities.critical = severity === 'critical' ? 1 : 0
    audit.stdout = JSON.stringify(report)
    dependencyOutput({
      audit,
      licenses: '{"MIT":[{"name":"minimatch","versions":["1.0.0"]}]}',
      install: fixture('frozen-install').valid,
    })
    await expect(row('dependencies')).rejects.toThrow(/advisories: new unallowlisted findings/)
  })

  it('rejects an expired allowance even when the audit has no findings', async () => {
    const audit = fixture('audit').valid
    const report = JSON.parse(audit.stdout)
    report.actions = []
    report.advisories = {}
    report.metadata.vulnerabilities.high = 0
    audit.stdout = JSON.stringify(report)
    audit.status = 0
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2027-01-16T00:00:00Z'))
    dependencyOutput({
      audit,
      licenses: '{"MIT":[{"name":"minimatch","versions":["1.0.0"]}]}',
      install: fixture('frozen-install').valid,
    })
    await expect(row('dependencies')).rejects.toThrow(/allowance expired or invalid/)
  })

  it.each(
    ['discovery unavailable', 'Error: .only is not allowed with --forbid-only'].flatMap((stderr) =>
      [1, 2, 127].map((status) => ({ stderr, status })),
    ),
  )('rejects failed Playwright discovery exit $status: $stderr', async ({ stderr, status }) => {
    run.mockReturnValue({ status, stdout: '', stderr })
    const { runPlaywright } = await import('../../scripts/quality/test-results.mjs')
    expect(() => runPlaywright(['/repo/tests/e2e/example.spec.ts'])).toThrow(
      /Playwright discovery failed/,
    )
    expect(run.mock.calls[0][1]).toEqual([
      'exec',
      'playwright',
      'test',
      '--list',
      '--forbid-only',
      '--reporter=json',
    ])
  })
})

function cleanAudit() {
  const audit = fixture('audit').valid
  const report = JSON.parse(audit.stdout)
  report.actions = []
  report.advisories = {}
  report.metadata.vulnerabilities.high = 0
  return { ...audit, status: 0, stdout: JSON.stringify(report) }
}
function allow(entries = {}) {
  options.json = () => ({ advisories: {}, licenses: {}, ...entries })
}
const licenseReport = (license) =>
  JSON.stringify({ [license]: [{ name: 'minimatch', versions: ['1.0.0'] }] })

describe('dependency command and allowance contracts', () => {
  it.each([
    'MIT',
    'ISC',
    'Apache-2.0',
    'BSD-2-Clause',
    'BSD-3-Clause',
    '0BSD',
    'CC0-1.0',
    'Unlicense',
    'Python-2.0',
    'BlueOak-1.0.0',
    '(MIT OR Apache-2.0)',
    '(Apache-2.0 OR MIT)',
    '(MIT AND Zlib)',
    '(MIT OR CC0-1.0)',
  ])('accepts the documented permitted license %s', async (license) => {
    allow()
    dependencyOutput({
      audit: cleanAudit(),
      licenses: licenseReport(license),
      install: fixture('frozen-install').valid,
    })
    await expect(row('dependencies')).resolves.toBeUndefined()
    expect(run.mock.calls.map(([command, args]) => [command, args])).toEqual([
      [
        'pnpm',
        [
          'install',
          '--frozen-lockfile',
          '--lockfile-only',
          '--ignore-scripts',
          '--reporter=ndjson',
        ],
      ],
      ['pnpm', ['audit', '--audit-level', 'high', '--json']],
      ['pnpm', ['--dir', expect.any(String), 'licenses', 'list', '--json']],
    ])
    expect(JSON.parse(readFileSync(join(directory, 'package-inventory.json'), 'utf8'))).toEqual({
      installed: ['installed-alias-target@2.0.0', 'minimatch@1.0.0'],
      audit: ['minimatch@1.0.0', '@esbuild/linux-x64@0.25.0', 'synthetic-importer@0.0.0'],
    })
    expect(existsSync(run.mock.calls[2][1][1])).toBe(false)
  })
  it.each(['audit', 'licenses'])(
    'rejects the %s report with the other population',
    async (kind) => {
      allow()
      dependencyOutput({
        audit: cleanAudit(),
        licenses: licenseReport('MIT'),
        install: fixture('frozen-install').valid,
      })
      vi.doMock('../../scripts/quality/package-inventory.mjs', () => ({
        packageInventory: () => ({
          installed: new Map(
            (kind === 'licenses' ? lockPackages : installedPackages).map((id) => [id, {}]),
          ),
          lock: {},
        }),
        auditPackages: () => (kind === 'audit' ? [...installedPackages] : [...lockPackages]),
        licenseScanDirectory: () => mkdtempSync(join(directory, 'licenses-')),
      }))
      await expect(row('dependencies')).rejects.toThrow(
        kind === 'audit'
          ? /Audit population does not match frozen lockfile/
          : /Invalid pnpm licenses report/,
      )
    },
  )
  it.each([1, 2, 127])('rejects frozen install exit %i with a complete report', async (status) => {
    allow()
    dependencyOutput({
      audit: cleanAudit(),
      licenses: licenseReport('MIT'),
      install: { ...fixture('frozen-install').valid, status },
    })
    await expect(row('dependencies')).rejects.toThrow(/Invalid frozen-lockfile install/)
    expect(run).toHaveBeenCalledTimes(1)
  })
  it('rejects an unallowlisted restricted license', async () => {
    allow()
    dependencyOutput({
      audit: cleanAudit(),
      licenses: licenseReport('GPL-3.0'),
      install: fixture('frozen-install').valid,
    })
    await expect(row('dependencies')).rejects.toThrow(/licenses: new unallowlisted findings/)
  })
  it('accepts an exact advisory and license allowance but rejects one new path', async () => {
    allow({
      advisories: {
        'GHSA-7r86-cg39-jmmj|minimatch@1.0.0': {
          reason: 'fixture',
          expires: '2027-01-16',
          paths: ['. > minimatch@1.0.0'],
        },
      },
      licenses: {
        'minimatch@1.0.0|GPL-3.0': { reason: 'fixture', expires: '2027-01-16', paths: ['GPL-3.0'] },
      },
    })
    dependencyOutput({
      audit: fixture('audit').valid,
      licenses: licenseReport('GPL-3.0'),
      install: fixture('frozen-install').valid,
    })
    await expect(row('dependencies')).resolves.toBeUndefined()
  })
  it('rejects one new advisory path alongside an allowed path', async () => {
    allow({
      advisories: {
        'GHSA-7r86-cg39-jmmj|minimatch@1.0.0': {
          reason: 'fixture',
          expires: '2027-01-16',
          paths: ['. > minimatch@1.0.0'],
        },
      },
    })
    const audit = fixture('audit').valid
    const report = JSON.parse(audit.stdout)
    report.advisories['1113540'].findings[0].paths.push('. > new > minimatch@1.0.0')
    audit.stdout = JSON.stringify(report)
    dependencyOutput({
      audit,
      licenses: licenseReport('MIT'),
      install: fixture('frozen-install').valid,
    })
    await expect(row('dependencies')).rejects.toThrow(/advisories: new unallowlisted findings/)
  })
  it.each([
    { reason: '' },
    { reason: ' ' },
    { reason: 42 },
    { expires: 'invalid' },
    { expires: '2027-02-30' },
    { expires: '2027-1-16' },
    { expires: '2026-01-01' },
  ])('rejects invalid allowance $reason $expires', async (change) => {
    allow({
      advisories: {
        fixture: { reason: 'fixture', expires: '2027-01-16', paths: ['fixture'], ...change },
      },
    })
    dependencyOutput({
      audit: cleanAudit(),
      licenses: licenseReport('MIT'),
      install: fixture('frozen-install').valid,
    })
    await expect(row('dependencies')).rejects.toThrow(/allowance expired or invalid/)
  })
  it.each(['low', 'moderate'])('reports but does not fail %s advisory debt', async (severity) => {
    allow()
    const audit = fixture('audit').valid
    const report = JSON.parse(audit.stdout)
    report.advisories['1113540'].severity = severity
    report.metadata.vulnerabilities.high = 0
    report.metadata.vulnerabilities[severity] = 1
    audit.status = 0
    audit.stdout = JSON.stringify(report)
    dependencyOutput({
      audit,
      licenses: licenseReport('MIT'),
      install: fixture('frozen-install').valid,
    })
    await expect(row('dependencies')).resolves.toBeUndefined()
  })
  it.each([
    ...[1, 2, 127].map((status) => ({ status, stderr: '' })),
    { status: 0, stderr: 'license command warning' },
  ])('refuses license command exit $status and stderr "$stderr"', async (failure) => {
    allow()
    dependencyOutput({
      audit: cleanAudit(),
      licenses: licenseReport('MIT'),
      install: fixture('frozen-install').valid,
    })
    const execute = run.getMockImplementation()
    run.mockImplementation((command, args) =>
      args.includes('licenses')
        ? { ...failure, stdout: licenseReport('MIT') }
        : execute(command, args),
    )
    await expect(row('dependencies')).rejects.toThrow()
  })
  it('writes independently specified advisory and license identities locally', async () => {
    options.writingBaseline = true
    options.writeJSON = vi.fn()
    dependencyOutput({
      audit: fixture('audit').valid,
      licenses: licenseReport('GPL-3.0'),
      install: fixture('frozen-install').valid,
    })
    await expect(row('dependencies')).resolves.toBeUndefined()
    expect(options.writeJSON).toHaveBeenCalledWith('scripts/quality/baselines/dependencies.json', {
      advisories: {
        'GHSA-7r86-cg39-jmmj|minimatch@1.0.0': {
          paths: ['. > minimatch@1.0.0'],
          expires: '2027-01-16',
          reason:
            'Existing dependency debt at adoption; ratchet under #23, remediation under #22. No new package/version/path allowance.',
        },
      },
      licenses: {
        'minimatch@1.0.0|GPL-3.0': {
          paths: ['GPL-3.0'],
          expires: '2027-01-16',
          reason:
            'Existing dependency debt at adoption; ratchet under #23, remediation under #22. No new package/version/path allowance.',
        },
      },
    })
  })
})

describe('compiler and linter invocation contracts', () => {
  it('checks Nuxt and Convex separately and deduplicates repeated compiler diagnostics', async () => {
    const diagnostic = 'nuxt.config.ts(1,1): error TS2322: fixture diagnostic\n'
    run.mockImplementation((command, args) =>
      args.includes('vue-tsc')
        ? { status: 1, stdout: diagnostic + diagnostic, stderr: '' }
        : success,
    )
    await expect(row('types')).resolves.toBeUndefined()
    expect(run.mock.calls).toEqual([
      ['pnpm', ['exec', 'nuxt', 'prepare']],
      ['pnpm', ['exec', 'vue-tsc', '--build', '--noEmit', '--pretty', 'false']],
      [
        'pnpm',
        ['exec', 'tsc', '--noEmit', '--project', 'convex/tsconfig.json', '--pretty', 'false'],
      ],
    ])
    expect(readFileSync(join(directory, 'types.txt'), 'utf8')).toBe(diagnostic + diagnostic)
    expect(readFileSync(join(directory, 'types-convex.txt'), 'utf8')).toBe('')
  })
  it.each([
    { fatal: true, ruleId: 'fixture-rule' },
    { fatal: false, ruleId: null },
  ])('rejects fatal or ruleless ESLint diagnostics: $fatal $ruleId', async (change) => {
    const report = fixture('lint').alsoValid[0].results
    report[0].filePath = source
    Object.assign(report[0].messages[0], change)
    report[0].fatalErrorCount = change.fatal ? 1 : 0
    vi.doMock('eslint', () => ({
      ESLint: class {
        async lintFiles() {
          return report
        }
      },
    }))
    await expect(row('lint')).rejects.toThrow(/Fixture diagnostic/)
  })
  it.each(
    JSON.parse(
      readFileSync(new URL('./quality-policy/lint-suppressions.json', import.meta.url), 'utf8'),
    ),
  )('enforces suppression tickets in %s', async (text, accepted) => {
    writeFileSync(source, text + '\n')
    const report = fixture('lint').valid.results
    report[0].filePath = source
    vi.doMock('eslint', () => ({
      ESLint: class {
        async lintFiles() {
          return report
        }
      },
    }))
    if (accepted) await expect(row('lint')).resolves.toBeUndefined()
    else await expect(row('lint')).rejects.toThrow(/eslint-disable requires/)
  })
  it('selects only explicitly supplied lint files and removes the writer flag from selection', async () => {
    const local = common.localPath(source)
    const lintFiles = vi.fn(async () => {
      const report = fixture('lint').valid.results
      report[0].filePath = source
      return report
    })
    options.sourceFiles = () => [local, 'app/other.ts']
    process.argv = [process.execPath, 'lint.mjs', source, '--write-baseline']
    vi.doMock('eslint', () => ({
      ESLint: class {
        lintFiles = lintFiles
      },
    }))
    await expect(row('lint')).resolves.toBeUndefined()
    expect(lintFiles).toHaveBeenCalledWith([local])
    expect(JSON.parse(readFileSync(join(directory, 'lint.json'), 'utf8'))).toEqual([
      { filePath: local, messages: [] },
    ])
  })
  it('does not invoke ESLint when supplied files are outside the source inventory', async () => {
    process.argv = [process.execPath, 'lint.mjs', 'README.md']
    const lintFiles = vi.fn()
    vi.doMock('eslint', () => ({
      ESLint: class {
        lintFiles = lintFiles
      },
    }))
    await expect(row('lint')).resolves.toBeUndefined()
    expect(lintFiles).not.toHaveBeenCalled()
  })
})

describe('formatter decisions', () => {
  it.each([
    'ignored',
    'unknown parser',
    'formatted',
    'unformatted',
    'legacy unchanged',
    'legacy changed',
    'new writer',
    'legacy writer',
  ])('preserves %s handling', async (kind) => {
    const { createHash } = await import('node:crypto')
    const hash = 'sha256:' + createHash('sha256').update(readFileSync(source)).digest('hex')
    const info = vi.fn(async () => ({
      ignored: kind === 'ignored',
      inferredParser: kind === 'unknown parser' ? null : 'typescript',
    }))
    const check = vi.fn(async () => kind === 'formatted')
    const resolveConfig = vi.fn(async () => ({
      semi: false,
      singleQuote: true,
      trailingComma: 'all',
      printWidth: 96,
    }))
    vi.doMock('prettier', () => ({ getFileInfo: info, check, resolveConfig }))
    options.json = () =>
      kind === 'legacy unchanged'
        ? { [source]: hash }
        : kind === 'legacy changed'
          ? { [source]: 'sha256:' + '0'.repeat(64) }
          : {}
    options.git = () => (kind === 'legacy writer' ? source : '')
    options.writeJSON = vi.fn()
    options.writingBaseline = kind.endsWith('writer')
    const accepted = [
      'ignored',
      'unknown parser',
      'formatted',
      'legacy unchanged',
      'legacy writer',
    ].includes(kind)
    if (accepted) await expect(row('format')).resolves.toBeUndefined()
    else
      await expect(row('format')).rejects.toThrow(
        /(?:Format regression|New files must be formatted)/,
      )
    if (kind === 'legacy unchanged') expect(info).not.toHaveBeenCalled()
    else expect(info).toHaveBeenCalledWith(source, { ignorePath: '.prettierignore' })
    if (kind === 'legacy writer')
      expect(options.writeJSON).toHaveBeenCalledWith('scripts/quality/baselines/format.json', {
        [source]: hash,
      })
    if (kind === 'formatted')
      expect(check).toHaveBeenCalledWith('export const fixture = 1\n', {
        semi: false,
        singleQuote: true,
        trailingComma: 'all',
        printWidth: 96,
        filepath: source,
      })
  })
  it('selects only requested formatting paths and drops the writer flag', async () => {
    const local = common.localPath(source)
    options.files = () => [local, 'app/other.ts']
    options.git = () => ''
    options.json = () => ({})
    process.argv = [process.execPath, 'format.mjs', source, '--write-baseline']
    const getFileInfo = vi.fn(async () => ({ ignored: true, inferredParser: null }))
    vi.doMock('prettier', () => ({ getFileInfo }))
    await expect(row('format')).resolves.toBeUndefined()
    expect(getFileInfo.mock.calls).toEqual([[local, { ignorePath: '.prettierignore' }]])
  })
})

describe('secret scan enforcement', () => {
  it.each(['history', 'diff', 'working', 'all-branches'])(
    'scans and rejects a fresh finding in %s',
    async (stage) => {
      options.git = (...args) => (args[0] === 'rev-parse' ? 'false' : 'base')
      options.files = () => []
      options.json = () => []
      if (stage === 'all-branches')
        process.argv = [process.execPath, 'secrets.mjs', '--all-branches']
      vi.doMock('../../scripts/quality/install-gitleaks.mjs', () => ({
        gitleaks: async () => 'scanner',
      }))
      run.mockImplementation((command, args) => {
        const file = args
          .find((arg) => arg.startsWith('--report-path='))
          .slice('--report-path='.length)
        const selected = file.endsWith(`/${stage}.json`)
        writeFileSync(file, selected ? fixture('gitleaks').valid.stdout : '[]')
        return { ...success, status: selected ? 42 : 0 }
      })
      await expect(row('secrets')).rejects.toThrow(new RegExp(`secrets ${stage}: 1 new findings`))
      const reports = run.mock.calls.map(([, args]) =>
        args.find((arg) => arg.startsWith('--report-path=')).slice('--report-path='.length),
      )
      for (const file of reports) expect(() => readFileSync(file)).toThrow()
      expect(run.mock.calls[0][1].slice(0, 3)).toEqual([
        'git',
        stage === 'all-branches' ? '--log-opts=--all' : '--log-opts=HEAD',
        '.',
      ])
      if (stage === 'all-branches') {
        expect(run).toHaveBeenCalledTimes(1)
        expect(
          JSON.parse(readFileSync(join(directory, 'secrets-all-branches.json'), 'utf8')),
        ).toHaveProperty('all-branches')
      } else {
        expect(run).toHaveBeenCalledTimes(3)
        expect(run.mock.calls[2][1][0]).toBe('dir')
        expect(run.mock.calls[2][1][1]).toMatch(/\/tree$/)
        expect(run.mock.calls[1][1].slice(0, 3)).toEqual(['git', '--log-opts=base..HEAD', '.'])
      }
    },
  )
  it('scans every working file and retains only digests for exact existing exceptions', async () => {
    options.git = (...args) => (args[0] === 'rev-parse' ? 'false' : 'base')
    options.files = () => [common.localPath(source)]
    options.json = () => [
      'fixture|fixture|f16d05ec6b29248d2c61adb1e9263f78e4f7bace1b955014a2d17872cfe4064d',
    ]
    vi.doMock('../../scripts/quality/install-gitleaks.mjs', () => ({
      gitleaks: async () => 'scanner',
    }))
    run.mockImplementation((command, args) => {
      expect(command).toBe('scanner')
      expect(args.slice(-4, -1)).toEqual(['--no-banner', '--report-format=json', '--exit-code=42'])
      const file = args.at(-1).slice('--report-path='.length)
      if (args[0] === 'dir') {
        expect(readFileSync(join(args[1], common.localPath(source)), 'utf8')).toBe(
          'export const fixture = 1\n',
        )
        const findings = JSON.parse(fixture('gitleaks').valid.stdout)
        findings[0].File = join(args[1], 'fixture')
        writeFileSync(file, JSON.stringify(findings))
      } else writeFileSync(file, fixture('gitleaks').valid.stdout)
      return { ...success, status: 42 }
    })
    await expect(row('secrets')).resolves.toBeUndefined()
    expect(JSON.parse(readFileSync(join(directory, 'secrets.json'), 'utf8'))).toEqual({
      history: ['fixture|fixture|f16d05ec6b29248d2c61adb1e9263f78e4f7bace1b955014a2d17872cfe4064d'],
      diff: ['fixture|fixture|f16d05ec6b29248d2c61adb1e9263f78e4f7bace1b955014a2d17872cfe4064d'],
      working: ['fixture|fixture|f16d05ec6b29248d2c61adb1e9263f78e4f7bace1b955014a2d17872cfe4064d'],
    })
  })
  it('rejects shallow history before invoking a scanner', async () => {
    options.git = () => 'true'
    await expect(row('secrets')).rejects.toThrow(/full checkout/)
    expect(run).not.toHaveBeenCalled()
  })
  it.each([1, 2, 127])('rejects scanner infrastructure exit %i', async (status) => {
    options.git = (...args) => (args[0] === 'rev-parse' ? 'false' : 'base')
    vi.doMock('../../scripts/quality/install-gitleaks.mjs', () => ({
      gitleaks: async () => 'scanner',
    }))
    run.mockReturnValue({ ...success, status })
    await expect(row('secrets')).rejects.toThrow(/gitleaks history failed/)
  })
  it('writes a deduplicated digest baseline locally', async () => {
    options.writingBaseline = true
    options.writeJSON = vi.fn()
    options.git = (...args) => (args[0] === 'rev-parse' ? 'false' : 'base')
    options.files = () => []
    options.json = () => ['fixture']
    vi.doMock('../../scripts/quality/install-gitleaks.mjs', () => ({
      gitleaks: async () => 'scanner',
    }))
    run.mockImplementation((command, args) => {
      writeFileSync(args.at(-1).slice('--report-path='.length), fixture('gitleaks').valid.stdout)
      return { ...success, status: 42 }
    })
    await expect(row('secrets')).resolves.toBeUndefined()
    expect(options.writeJSON).toHaveBeenCalledWith('scripts/quality/baselines/secrets.json', [
      'fixture|fixture|f16d05ec6b29248d2c61adb1e9263f78e4f7bace1b955014a2d17872cfe4064d',
    ])
  })
})

describe('runtime discovery command contracts', () => {
  it.each([1, 2, 127])('rejects Vitest discovery exit %i before running tests', async (status) => {
    run.mockReturnValue({ ...success, status, stderr: 'discovery unavailable' })
    const { runVitest } = await import('../../scripts/quality/test-results.mjs')
    expect(() => runVitest()).toThrow(/Vitest discovery failed/)
    expect(run.mock.calls).toEqual([['pnpm', ['exec', 'vitest', 'list', '--filesOnly', '--json']]])
  })
  it.each(['failed', 'focused', 'file-focused', 'pending', 'passed'])(
    'preserves the %s Vitest outcome',
    async (kind) => {
      const input = fixture('vitest-results').valid
      const report = JSON.parse(input.stdout)
      report.testResults[0].assertionResults[1].status = 'passed'
      report.numPassedTests = 2
      report.numPendingTests = 0
      if (kind === 'pending') {
        report.testResults[0].assertionResults[0].status = 'pending'
        report.numPassedTests = 1
        report.numPendingTests = 1
      }
      if (kind === 'focused')
        report.testResults[0].assertionResults[0].failureMessages = [
          '[Vitest] Unexpected .only modifier',
        ]
      if (kind === 'file-focused')
        report.testResults[0].message = '[Vitest] Unexpected .only modifier'
      if (kind === 'failed') {
        report.success = false
        report.numPassedTests = 1
        report.numFailedTests = 1
        report.numPassedTestSuites = 0
        report.numFailedTestSuites = 1
        report.testResults[0].status = 'failed'
        report.testResults[0].assertionResults[0].status = 'failed'
      }
      run.mockImplementation((command, args) => {
        if (args.includes('list')) return { ...success, stdout: input.files }
        writeFileSync(args.at(-1).slice('--outputFile='.length), JSON.stringify(report))
        return { ...success, status: kind === 'failed' ? 1 : 0 }
      })
      const { runVitest } = await import('../../scripts/quality/test-results.mjs')
      if (['failed', 'focused', 'file-focused'].includes(kind))
        expect(() => runVitest()).toThrow(/focused tests are forbidden/)
      else
        expect(runVitest()).toEqual(
          kind === 'pending' ? { [common.localPath('/repo/tests/unit/example.spec.ts')]: 1 } : {},
        )
      expect(run.mock.calls[0]).toEqual([
        'pnpm',
        ['exec', 'vitest', 'list', '--filesOnly', '--json'],
      ])
      expect(run.mock.calls[1]).toEqual([
        'pnpm',
        [
          'exec',
          'vitest',
          'run',
          '--maxWorkers=2',
          '--allowOnly=false',
          '--reporter=json',
          `--outputFile=${resolve(directory, 'vitest-results.json')}`,
        ],
      ])
    },
  )
  it.each(['passed', 'mixed'])(
    'retains Playwright %s expected statuses with one skip per declaration',
    async (kind) => {
      const input = fixture('playwright-list').valid
      const report = JSON.parse(input.stdout)
      if (kind === 'mixed') {
        report.suites[0].specs[0].tests.push({
          ...report.suites[0].specs[0].tests[0],
          expectedStatus: 'skipped',
        })
        report.stats.skipped += 1
      }
      run.mockImplementation((command, args, config) => {
        expect(command).toBe('pnpm')
        expect(args).toEqual([
          'exec',
          'playwright',
          'test',
          '--list',
          '--forbid-only',
          '--reporter=json',
        ])
        expect(config.env.PLAYWRIGHT_JSON_OUTPUT_FILE).toBe(
          resolve(directory, 'playwright-list.json'),
        )
        expect(config.env.PATH).toBe(process.env.PATH)
        writeFileSync(config.env.PLAYWRIGHT_JSON_OUTPUT_FILE, JSON.stringify(report))
        return success
      })
      const { runPlaywright } = await import('../../scripts/quality/test-results.mjs')
      expect(runPlaywright(input.files)).toEqual(
        kind === 'mixed' ? { [common.localPath(input.files[0])]: 1 } : {},
      )
    },
  )
})

describe('deterministic dependency evidence', () => {
  it('sorts independent installed identities, allowance keys and accumulated advisory paths', async () => {
    const audit = fixture('audit').valid
    const report = JSON.parse(audit.stdout)
    report.advisories['1113540'].findings = [
      { version: '2.0.0', paths: ['. > minimatch@2.0.0'] },
      { version: '1.0.0', paths: ['z > minimatch@1.0.0', 'a > minimatch@1.0.0'] },
    ]
    report.metadata.vulnerabilities.high = 2
    report.metadata.dependencies = 2
    report.metadata.totalDependencies = 2
    audit.stdout = JSON.stringify(report)
    options.writingBaseline = true
    options.writeJSON = vi.fn()
    dependencyOutput({
      audit,
      licenses: '{"GPL-3.0":[{"name":"minimatch","versions":["2.0.0","1.0.0"]}]}',
      installed: ['minimatch@2.0.0', 'minimatch@1.0.0', 'installed-alias-target@2.0.0'],
      lock: [
        'minimatch@2.0.0',
        'minimatch@1.0.0',
        '@esbuild/linux-x64@0.25.0',
        'synthetic-importer@0.0.0',
      ],
      install: fixture('frozen-install').valid,
    })
    await row('dependencies')
    const baseline = options.writeJSON.mock.calls.find(
      ([path]) => path === 'scripts/quality/baselines/dependencies.json',
    )[1]
    expect(Object.keys(baseline.advisories)).toEqual([
      'GHSA-7r86-cg39-jmmj|minimatch@1.0.0',
      'GHSA-7r86-cg39-jmmj|minimatch@2.0.0',
    ])
    expect(Object.keys(baseline.licenses)).toEqual([
      'minimatch@1.0.0|GPL-3.0',
      'minimatch@2.0.0|GPL-3.0',
    ])
    expect(baseline.advisories['GHSA-7r86-cg39-jmmj|minimatch@1.0.0'].paths).toEqual([
      'a > minimatch@1.0.0',
      'z > minimatch@1.0.0',
    ])
    expect(options.writeJSON).toHaveBeenCalledWith(`${directory}/package-inventory.json`, {
      installed: ['installed-alias-target@2.0.0', 'minimatch@1.0.0', 'minimatch@2.0.0'],
      audit: [
        'minimatch@2.0.0',
        'minimatch@1.0.0',
        '@esbuild/linux-x64@0.25.0',
        'synthetic-importer@0.0.0',
      ],
    })
  })
  it('rejects arbitrary unknown licence text with no exception', async () => {
    allow()
    dependencyOutput({
      audit: cleanAudit(),
      licenses: licenseReport('Stryker was here'),
      install: fixture('frozen-install').valid,
    })
    await expect(row('dependencies')).rejects.toThrow(/licenses: new unallowlisted findings/)
  })
})

describe('writer-only selection and ordinary failures', () => {
  it('keeps the full lint inventory when the only argument is the writer flag', async () => {
    process.argv = [process.execPath, 'lint.mjs', '--write-baseline']
    const lintFiles = vi.fn(async () => {
      const report = fixture('lint').valid.results
      report[0].filePath = source
      return report
    })
    vi.doMock('eslint', () => ({
      ESLint: class {
        lintFiles = lintFiles
      },
    }))
    await row('lint')
    expect(lintFiles).toHaveBeenCalledWith([source])
  })
  it('keeps the full formatter inventory when the only argument is the writer flag', async () => {
    process.argv = [process.execPath, 'format.mjs', '--write-baseline']
    options.writingBaseline = true
    options.writeJSON = vi.fn()
    options.git = () => source
    const getFileInfo = vi.fn(async () => ({ ignored: true, inferredParser: null }))
    vi.doMock('prettier', () => ({ getFileInfo }))
    await row('format')
    expect(getFileInfo).toHaveBeenCalledWith(source, { ignorePath: '.prettierignore' })
  })
  it('does not label ordinary assertion failures as focused tests', async () => {
    const { vitestFindings } = await import('../../scripts/quality/test-results.mjs')
    expect(
      vitestFindings({
        testResults: [
          {
            name: resolve('tests/unit/ordinary.spec.mjs'),
            message: '',
            assertionResults: [{ status: 'failed', failureMessages: ['expected 1 to equal 2'] }],
          },
        ],
      }),
    ).toEqual({ 'tests/unit/ordinary.spec.mjs': { skipped: 0, todo: 0, focused: 0 } })
  })
})

describe('idempotent private-directory cleanup', () => {
  it('accepts a completed license scan whose temporary directory was already removed', async () => {
    allow()
    dependencyOutput({
      audit: cleanAudit(),
      licenses: licenseReport('MIT'),
      install: fixture('frozen-install').valid,
    })
    const execute = run.getMockImplementation()
    run.mockImplementation((command, args) => {
      const result = execute(command, args)
      if (args.includes('licenses')) rmSync(args[1], { recursive: true, force: true })
      return result
    })
    await expect(row('dependencies')).resolves.toBeUndefined()
  })
  it('accepts clean secret reports after their private directory has already been removed', async () => {
    options.git = (...args) => (args[0] === 'rev-parse' ? 'false' : 'base')
    options.files = () => []
    options.json = () => []
    vi.doMock('../../scripts/quality/install-gitleaks.mjs', () => ({
      gitleaks: async () => 'scanner',
    }))
    vi.doMock('node:fs', async (original) => {
      const fs = await original()
      return {
        ...fs,
        readFileSync: (file, encoding) => {
          const value = fs.readFileSync(file, encoding)
          if (String(file).endsWith('/working.json'))
            fs.rmSync(String(file).slice(0, -'/working.json'.length), {
              recursive: true,
              force: true,
            })
          return value
        },
      }
    })
    run.mockImplementation((command, args) => {
      writeFileSync(args.at(-1).slice('--report-path='.length), '[]')
      return success
    })
    await expect(row('secrets')).resolves.toBeUndefined()
  })
})

describe('child exit status boundaries', () => {
  it.each(
    ['vue-tsc', 'tsc'].flatMap((compiler) => [1, 2, 127].map((status) => ({ compiler, status }))),
  )('rejects $compiler exit $status without diagnostics', async ({ compiler, status }) => {
    run.mockImplementation((command, args) =>
      args.includes(compiler) ? { ...success, status } : success,
    )
    await expect(row('types')).rejects.toThrow(/Invalid TypeScript diagnostics/)
  })
  it.each([1, 2, 127])('rejects audit exit %i with a clean report', async (status) => {
    allow()
    dependencyOutput({
      audit: { ...cleanAudit(), status },
      licenses: licenseReport('MIT'),
      install: fixture('frozen-install').valid,
    })
    await expect(row('dependencies')).rejects.toThrow(/Invalid pnpm audit report/)
  })
  it.each([1, 2, 127])('rejects Vitest exit %i despite a successful report', async (status) => {
    const input = fixture('vitest-results').valid
    run.mockImplementation((command, args) => {
      const output = args.find((arg) => arg.startsWith('--outputFile='))
      if (!output) return { ...success, stdout: input.files }
      writeFileSync(output.slice('--outputFile='.length), input.stdout)
      return { ...success, status }
    })
    const { runVitest } = await import('../../scripts/quality/test-results.mjs')
    expect(() => runVitest()).toThrow(/Invalid Vitest results/)
  })
})
