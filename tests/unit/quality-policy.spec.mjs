// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { outputDir, ratchet, run } from '../../scripts/quality/common.mjs'
import { scanFile } from '../../scripts/quality/test-policy-source.mjs'
import { vitestCounts, vitestFindings } from '../../scripts/quality/test-results.mjs'
import { parse } from '../../scripts/quality/vitest-results.parser.mjs'

const cases = JSON.parse(
  readFileSync(new URL('./quality-policy/cases.json', import.meta.url), 'utf8'),
)
const cli = resolve('node_modules/vitest/vitest.mjs')

function fixtureRun(source) {
  const directory = mkdtempSync(resolve(outputDir, 'policy-fixture-'))
  const file = resolve(directory, 'fixture.spec.mjs')
  const config = resolve(directory, 'vitest.config.mjs')
  const report = resolve(directory, 'results.json')
  writeFileSync(file, `import { test, describe } from 'vitest'\n${source}\n`)
  writeFileSync(config, `export default { test: { include: [${JSON.stringify(file)}] } }\n`)
  const result = run(process.execPath, [
    cli,
    'run',
    '--config',
    config,
    '--maxWorkers=1',
    '--allowOnly=false',
    '--reporter=json',
    `--outputFile=${report}`,
  ])
  try {
    const parsed = parse({
      status: result.status,
      files: JSON.stringify([{ file }]),
      stdout: readFileSync(report, 'utf8'),
    }).stdout
    const tickets = {}
    scanFile(file, tickets)
    return { parsed, tickets }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe('runtime test policy', () => {
  it('counts every skipped test and todo, including suite children and dynamic skips', () => {
    const skips = cases.filter((entry) => !entry.focus)
    const { parsed, tickets } = fixtureRun(skips.map((entry) => entry.source).join('\n'))
    const tests = parsed.testResults[0].assertionResults
    for (const entry of skips) {
      expect(tests.find((test) => test.title === entry.name)?.status).toMatch(/skipped|todo/)
    }
    expect(Object.values(vitestCounts(parsed))).toEqual([skips.length])
    expect(Object.values(tickets)).toEqual([skips.length])
    expect(() => ratchet('test-policy', vitestCounts(parsed))).toThrow(/new files must be clean/)
  }, 30_000)

  it.each(cases.filter((entry) => entry.focus))(
    'forbids $name through Vitest',
    ({ source }) => {
      const { parsed } = fixtureRun(source)
      expect(parsed.success).toBe(false)
      expect(parsed.numFailedTests).toBe(1)
      expect(Object.values(vitestFindings(parsed))[0].focused).toBe(1)
      expect(parsed.testResults[0].assertionResults[0].failureMessages.join('\n')).toContain(
        'Unexpected .only',
      )
    },
    30_000,
  )

  it('requires a ticket for each source skip even when its condition does not skip at runtime', () => {
    const { parsed, tickets } = fixtureRun("test.skipIf(false)('conditional', () => {})")
    expect(vitestCounts(parsed)).toEqual({})
    expect(Object.values(tickets)).toEqual([1])
  }, 30_000)

  it('accepts ticket references without removing skips from runtime accounting', () => {
    const { parsed, tickets } = fixtureRun(
      "test.skip('ticketed #23', () => {})\ntest('dynamic #23', (ctx) => { ctx.skip() })",
    )
    expect(tickets).toEqual({})
    expect(Object.values(vitestCounts(parsed))).toEqual([2])
  }, 30_000)
})
