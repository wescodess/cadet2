// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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

beforeEach(() => {
  vi.resetModules()
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
  }))
})

afterEach(() => {
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

function inventory(packages) {
  vi.doMock('../../scripts/quality/package-inventory.mjs', () => ({
    packageInventory: () => ({ installed: new Map(packages.map((id) => [id, {}])), lock: {} }),
    auditPackages: () => packages,
    licenseScanDirectory: () => mkdtempSync(join(directory, 'licenses-')),
  }))
}

function dependencyOutput({ audit, licenses, install }) {
  const packages = audit.packages
  inventory(packages)
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
