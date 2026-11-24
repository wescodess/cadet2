// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as common from '../../scripts/quality/common.mjs'

const checkout = process.cwd()
let directory, completion, result, population
beforeEach(() => {
  vi.resetModules()
  vi.spyOn(common, 'sourceFiles').mockImplementation(() => {
    throw new Error('Structural row fixtures must not discover the working tree')
  })
  directory = realpathSync(mkdtempSync(join(tmpdir(), 'structural-report-')))
  writeFileSync(join(directory, 'fixture.ts'), 'export const fixture = 1\n')
  writeFileSync(join(directory, 'package.json'), '{"name":"structural-row","type":"module"}')
  for (const args of [
    ['init', '-q'],
    ['add', 'fixture.ts', 'package.json'],
    [
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-qm',
      'fixture',
    ],
  ])
    execFileSync('git', args, { cwd: directory })
  process.chdir(directory)
  result = { status: 0, stdout: '{}', stderr: '' }
  population = ['package.json']
  vi.doMock('../../scripts/quality/common.mjs', () => ({
    ...common,
    outputDir: directory,
    sourceFiles: () => population,
    git: (...args) =>
      ['ls-files', 'rev-parse', 'write-tree'].includes(args[0]) ? common.git(...args) : 'base',
    main: (fn) => {
      completion = Promise.resolve().then(fn)
    },
  }))
  vi.doMock('../../scripts/quality/scanner.mjs', () => ({
    scannerBudgets: { duplication: 120000, 'dead-code': 120000 },
    runScanner: (name) => {
      if (name === 'duplication-token-census' && result.status === 0) {
        writeFileSync(
          join(directory, 'token-population/jscpd-complexity.json'),
          JSON.stringify({
            summary: { by: 'complexity', files: [], folders: [], totalFiles: 0, totalFolders: 0 },
          }),
        )
        return { status: 0, stdout: '', stderr: '' }
      }
      writeFileSync(join(directory, 'jscpd-report.json'), result.stdout)
      return result
    },
  }))
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.doUnmock('../../scripts/quality/common.mjs')
  vi.doUnmock('../../scripts/quality/scanner.mjs')
  process.chdir(checkout)
  rmSync(directory, { recursive: true, force: true })
})

for (const row of ['boundaries', 'dead-code', 'duplication']) {
  it.each(['malformed', 'failed', 'truncated', 'unknown'])(
    'rejects %s tool output at the ' + row + ' row',
    async (kind) => {
      if (row === 'dead-code') population = ['fixture.ts']
      if (kind === 'failed') {
        result = {
          ...result,
          status: 127,
          stdout: JSON.parse(
            readFileSync(new URL(`./quality-parsers/${row}.json`, import.meta.url), 'utf8'),
          ).valid.stdout.replaceAll('shared/a.ts', 'package.json'),
        }
      }
      if (kind === 'truncated') result.stdout = '{"truncated":'
      if (kind === 'unknown') result.stdout = '{"issues":[],"unknown":true}'
      await import(`../../scripts/quality/${row}.mjs`)
      await expect(completion).rejects.toThrow(/Invalid |jscpd tool failure/)
    },
    row === 'dead-code' ? 30000 : 5000,
  )
}
