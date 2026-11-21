// @vitest-environment node
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { outputDir, ratchet, run } from '../../scripts/quality/common.mjs'
import { credited, scanFile } from '../../scripts/quality/test-policy-source.mjs'
import { vitestFindings, vitestSkips } from '../../scripts/quality/test-results.mjs'
import { parse } from '../../scripts/quality/vitest-results.parser.mjs'

const cases = JSON.parse(
  readFileSync(new URL('./quality-policy/cases.json', import.meta.url), 'utf8'),
)
const cli = resolve('node_modules/vitest/vitest.mjs')

function fixtureRun(source) {
  const directory = realpathSync(mkdtempSync(resolve(outputDir, 'policy-fixture-')))
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
    '--includeTaskLocation',
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
    const tests = {}
    scanFile(file, tickets, tests)
    return { parsed, tickets, tests: tests[file] }
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
    const runtime = vitestSkips(parsed)
    expect(Object.values(runtime).map((locations) => locations.length)).toEqual([skips.length])
    expect(Object.values(tickets)).toEqual([skips.length])
    expect(() =>
      ratchet(
        'test-policy',
        Object.fromEntries(
          Object.entries(runtime).map(([file, locations]) => [file, locations.length]),
        ),
      ),
    ).toThrow(/new files must be clean/)
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
    expect(vitestSkips(parsed)).toEqual({})
    expect(Object.values(tickets)).toEqual([1])
  }, 30_000)

  it('credits each runtime skip whose own test carries the ticket', () => {
    const { parsed, tickets, tests } = fixtureRun(
      [
        "test.skip('ticketed #23', () => {})",
        "test('dynamic #23', (ctx) => { ctx.skip() })",
        "test('dynamic', (ctx) => { ctx.skip('blocked #23') })",
        "for (let i = 0; i < 3; i++) test.skip('generated #23', () => {})",
      ].join('\n'),
    )
    expect(tickets).toEqual({})
    const [locations] = Object.values(vitestSkips(parsed))
    expect(locations).toHaveLength(6)
    expect(locations.every((location) => credited(tests, location))).toBe(true)
  }, 30_000)

  it('gives group-level tickets no credit, per the #23 amendment', () => {
    const { parsed, tickets, tests } = fixtureRun(
      [
        "describe.skipIf(false)('active #27', () => { test('a', () => {}); test('b', () => {}); test('c', () => {}) })",
        "describe.skip('blocked #23', () => { test('d', () => {}); test.each([1, 2])('e %i', () => {}) })",
        "for (let i = 0; i < 6; i++) test.skip('unticketed ' + i, () => {})",
      ].join('\n'),
    )
    expect(Object.values(tickets)).toEqual([3])
    const [locations] = Object.values(vitestSkips(parsed))
    expect(locations).toHaveLength(9)
    expect(locations.filter((location) => !credited(tests, location))).toHaveLength(9)
  }, 30_000)

  it('gives no credit to a missing or ambiguous location', () => {
    const { tests } = fixtureRun("test.skip('ticketed #23', () => {})")
    expect(credited(tests, null)).toBe(false)
    expect(credited(tests, { line: 2, column: 1 })).toBe(true)
    expect(credited([...tests, ...tests], { line: 2, column: 1 })).toBe(false)
  }, 30_000)
})

describe('source policy declaration boundaries', () => {
  it.each([
    ['it todo', "it.todo('fixture')", 1],
    ['suite todo', "suite.todo('fixture')", 1],
    ['curried skip', "test.skip.each([1])('fixture', () => {})", 1],
    ['computed argument', "object[test.skip('fixture', () => {})]()", 1],
    ['wrapped skip', "wrapper(test.skip('fixture', () => {}))", 1],
    ['context reason ticket outside a test', "context.skip('reason #23')", 1],
    ['in-test reason ticket', "test('fixture', (context) => { context.skip('reason #23') })", 0],
    ['in-test conditional ticket', "test('fixture', () => { test.skip(true, 'blocked #27') })", 0],
    ['owning test ticket', "test('fixture #27', () => { test.skip(true, 'blocked') })", 0],
    [
      'nested helper ticket',
      "test('fixture', () => { helper(() => test.skip(true, 'blocked #27')) })",
      1,
    ],
    ['group ticket', "describe.skip('fixture #23', () => {})", 1],
    ['Playwright group ticket', "test.describe.skip('fixture #27', () => {})", 1],
    [
      'group-scope conditional ticket',
      "test.describe('fixture', () => { test.skip(true, 'blocked #27') })",
      1,
    ],
    ['file-scope conditional ticket', "test.skip(true, 'blocked #27')", 1],
    ['it modifier', "it.skip('fixture', () => {})", 1],
    ['describe modifier', "describe.skip('fixture', () => {})", 1],
    ['suite modifier', "suite.skip('fixture', () => {})", 1],
    ['Playwright fixme', "test.fixme('fixture', () => {})", 1],
    ['todo option', "test('fixture', { todo:true, timeout:100 }, () => {})", 1],
    ['option method', "test('fixture', { method() {}, timeout:100 }, () => {})", 0],
    ['bracket modifier', "test['skip']('fixture', () => {})", 1],
    ['curried modifier', "test.skipIf(true)('fixture', () => {})", 1],
    ['bracket chain', "test.skipIf(true)['each']([1])('fixture', () => {})", 1],
    ['named import alias', "import { test as check } from 'vitest'; check.todo('fixture')", 1],
    ['ordinary named import', "import { expect as check } from 'vitest'; check.todo('fixture')", 0],
    ['namespace Vitest import', "import * as V from 'vitest'; V.test.todo('fixture')", 1],
    [
      'namespace Playwright import',
      "import * as P from '@playwright/test'; P.test.fixme('fixture')",
      1,
    ],
    ['unrelated namespace', "import * as other from 'other'; other.todo('fixture')", 0],
    ['side effect import', "import 'vitest'; test('fixture', () => {})", 0],
    ['noncall computed property', "const value=object[expression]; test('fixture', () => {})", 0],
    ['call through arrow expression', "(() => test)().todo('fixture')", 0],
    ['parent group ticket', "describe('suite #23', () => { test.skip('fixture', () => {}) })", 1],
    [
      'unrelated parent ticket',
      "wrapper('suite #23', () => { test.skip('fixture', () => {}) })",
      1,
    ],
    [
      'ticket in next declaration',
      "test.skip('first', () => {}); test.skip('second #23', () => {})",
      1,
    ],
    ['ticket in previous unrelated text', "const issue='#23'; test.skip('fixture', () => {})", 1],
    ['preceding comment ticket', "// #23\ntest.skip('fixture', () => {})", 1],
    ['URL ticket', "test.skip('fixture https://github.com/owner/repo/issues/123', () => {})", 0],
    ['titleless call', 'test.skip(true)', 1],
    ['dynamic context chain', 'context.nested.skip()', 1],
  ])('%s has %i unticketed declarations', (_name, text, expected) => {
    const directory = mkdtempSync(resolve(outputDir, 'source-fixture-'))
    const file = resolve(directory, 'fixture.spec.mjs')
    try {
      writeFileSync(file, text)
      const counts = {}
      scanFile(file, counts)
      expect(counts).toEqual(expected ? { [file]: expected } : {})
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
