// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as common from '../../scripts/quality/common.mjs'

let directory, completion, result
beforeEach(() => {
  vi.resetModules()
  directory = mkdtempSync(join(tmpdir(), 'structural-report-'))
  result = { status: 0, stdout: '{}', stderr: '' }
  vi.doMock('../../scripts/quality/common.mjs', () => ({
    ...common,
    outputDir: directory,
    sourceFiles: () => ['package.json'],
    git: () => 'base',
    main: (fn) => {
      completion = Promise.resolve().then(fn)
    },
  }))
  vi.doMock('../../scripts/quality/scanner.mjs', () => ({
    scannerBudgets: { duplication: 120000 },
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
  vi.doUnmock('../../scripts/quality/common.mjs')
  vi.doUnmock('../../scripts/quality/scanner.mjs')
  rmSync(directory, { recursive: true, force: true })
})

for (const row of ['boundaries', 'dead-code', 'duplication']) {
  it.each(['malformed', 'failed', 'truncated', 'unknown'])(
    'rejects %s tool output at the ' + row + ' row',
    async (kind) => {
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
  )
}
