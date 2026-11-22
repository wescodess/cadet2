// @vitest-environment node
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { outputDir, ratchet, run } from '../../scripts/quality/common.mjs'
import { unobservedSkips } from '../../scripts/quality/test-policy-source.mjs'
import { vitestCounts, vitestFindings } from '../../scripts/quality/test-results.mjs'
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
    '--reporter=json',
    `--outputFile=${report}`,
  ])
  try {
    const parsed = parse({
      status: result.status,
      files: JSON.stringify([{ file }]),
      stdout: readFileSync(report, 'utf8'),
    }).stdout
    return { parsed, hidden: unobservedSkips(file) }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe('runtime test policy', () => {
  it('counts every skipped test and todo, including suite children and dynamic skips', () => {
    const skips = cases.filter((entry) => !entry.focus)
    const { parsed } = fixtureRun(skips.map((entry) => entry.source).join('\n'))
    const tests = parsed.testResults[0].assertionResults
    for (const entry of skips) {
      expect(tests.find((test) => test.title === entry.name)?.status).toMatch(/skipped|todo/)
    }
    const runtime = vitestCounts(parsed)
    expect(Object.values(runtime)).toEqual([skips.length])
    expect(() => ratchet('test-policy', runtime)).toThrow(/new files must be clean/)
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

  it('counts a conditional skip in source even when it does not skip at runtime', () => {
    const { parsed, hidden } = fixtureRun("test.skipIf(false)('conditional', () => {})")
    expect(vitestCounts(parsed)).toEqual({})
    expect(hidden).toBe(1)
  }, 30_000)

  it('counts tickets like any other skip', () => {
    const { parsed, hidden } = fixtureRun(
      [
        "test.skip('ticketed #23', () => {})",
        "test('dynamic #23', (ctx) => { ctx.skip() })",
        "test('dynamic', (ctx) => { ctx.skip('blocked #23') })",
        "for (let i = 0; i < 3; i++) test.skip('generated #23', () => {})",
      ].join('\n'),
    )
    expect(Object.values(vitestCounts(parsed))).toEqual([6])
    expect(hidden).toBe(2)
  }, 30_000)
})

describe('skips the runners cannot observe', () => {
  it.each([
    ['test declaration', "test.skip('fixture #23', () => {})", 0],
    ['it declaration', "it.skip('fixture', () => {})", 0],
    ['todo declaration', "it.todo('fixture #23')", 0],
    ['suite todo', "suite.todo('fixture')", 0],
    ['describe declaration', "describe.skip('fixture #23', () => { it('a', () => {}) })", 0],
    ['Playwright group', "test.describe.skip('fixture #27', () => { test('a', () => {}) })", 0],
    ['Playwright fixme', "test.fixme('fixture', () => {})", 0],
    ['declaration with details', "test.skip('fixture', { tag: '@x' }, () => {})", 0],
    ['bracket declaration', "test['skip']('fixture', () => {})", 0],
    ['declaration inside a group', "test.describe('g', () => { test.skip('a', () => {}) })", 0],
    ['declaration inside a suite', "suite('g', () => { it.skip('a', () => {}) })", 0],
    [
      'nested groups',
      "describe('a', () => { describe.each([1])('b', () => { it.todo('c') }) })",
      0,
    ],
    ['in-body condition', "test('a', () => { test.skip(true, 'blocked #27') })", 1],
    ['in-body declaration shape', "test('a', () => { test.skip('reason', () => {}) })", 1],
    ['in-body fixme', "test('a', () => { test.fixme() })", 1],
    ['test info skip', "test('a', (_, info) => { info.skip() })", 1],
    ['test info chain', "test('a', () => { test.info().fixme() })", 1],
    ['context skip', "test('a', (ctx) => { ctx.skip() })", 1],
    ['hook skip', 'test.beforeEach(() => { test.skip(true) })', 1],
    ['group condition', "test.describe('g', () => { test.skip(true, 'blocked #27') })", 1],
    ['inactive condition', "test.skip(false, 'inactive #27')", 1],
    ['fixture condition', "test.skip(({ browserName }) => browserName === 'webkit')", 1],
    ['titleless call', 'test.skip()', 1],
    ['nested function', "function never() { test.skip(true, 'inactive #27') }", 1],
    ['helper declaration', "function helper() { test.skip('a', () => {}) }", 1],
    ['nested arrow', "test('a', () => { helper(() => test.skip(true)) })", 1],
    ['object method', 'const o = { never() { test.skip(true) } }', 1],
    ['class field', "class C { f = test.skip('a', () => {}) }", 1],
    ['class method', "class C { m() { test.skip('a', () => {}) } }", 1],
    ['non-describe callback', "wrapper('a', () => { test.skip('b', () => {}) })", 1],
    ['alias', 'const later = test.skip', 1],
    ['passed as an argument', "wrapper(test.skip, 'a', () => {})", 1],
    ['destructured', 'const { skip } = test', 1],
    ['renamed destructured', "const { 'fixme': later } = test", 1],
    ['bracket condition', "test('a', () => { test['skip'](true) })", 1],
    ['skipIf', "test.skipIf(true)('a', () => {})", 1],
    ['runIf', "describe.runIf(false)('a', () => {})", 1],
    ['curried each', "test.skip.each([1])('a %i', () => {})", 1],
    ['titleless todo', 'it.todo()', 1],
    ['function title', 'test.skip(() => {}, () => {})', 1],
    ['several', "test('a', () => { test.skip(true); test.fixme(true) }); test.skip(false)", 3],
    ['focus', "test.only('a', () => {})", 0],
    ['unrelated property', 'const counts = { skipped: 1 }; counts.skipped', 0],
    ['comment', "// test.skip(true, 'x')\ntest('a', () => {})", 0],
    ['string', "test('a', () => { expect('test.skip(true)').toBeTruthy() })", 0],
  ])('%s counts %i', (_name, text, expected) => {
    const directory = mkdtempSync(resolve(outputDir, 'source-fixture-'))
    const file = resolve(directory, 'fixture.spec.mjs')
    try {
      writeFileSync(file, text)
      expect(unobservedSkips(file)).toBe(expected)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
