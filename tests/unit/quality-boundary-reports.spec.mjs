// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { parse } from '../../scripts/quality/boundaries.parser.mjs'

const captured = JSON.parse(
  readFileSync(new URL('./quality-parsers/boundaries.json', import.meta.url), 'utf8'),
).alsoValid[0]

function twoCycles() {
  const first = JSON.parse(captured.stdout)
  const second = JSON.parse(
    captured.stdout
      .replaceAll('shared/a.ts', 'shared/c.ts')
      .replaceAll('shared/b.ts', 'shared/d.ts'),
  )
  return {
    ...first,
    modules: [...first.modules, ...second.modules],
    summary: {
      ...first.summary,
      violations: [...first.summary.violations, ...second.summary.violations],
      error: 2,
      advisedExitCode: 2,
      totalCruised: 4,
      totalDependenciesCruised: 4,
    },
  }
}

function additionalRule(report) {
  const rule = { name: 'blocked-edge', severity: 'error' }
  report.modules[0].dependencies[0].rules.push(rule)
  report.summary.ruleSetUsed.forbidden.push({
    ...rule,
    from: { path: '^shared/a[.]ts$' },
    to: { path: '^shared/b[.]ts$' },
    scope: 'module',
  })
  report.summary.violations.push({
    type: 'dependency',
    from: 'shared/a.ts',
    to: 'shared/b.ts',
    unresolvedTo: './b',
    dependencyTypes: ['local', 'import'],
    rule,
  })
  report.summary.error = 3
  report.summary.advisedExitCode = 3
  return report
}

function consume(report) {
  return parse({
    status: 0,
    selected: ['shared/a.ts', 'shared/b.ts', 'shared/c.ts', 'shared/d.ts'],
    stdout: JSON.stringify(report),
  })
}

it('preserves both complete cycle summaries and their rotated graph witnesses', () => {
  const report = twoCycles()
  expect(consume(report)).toStrictEqual(report)
})

it('preserves a separate error rule on an already cyclic edge', () => {
  const report = additionalRule(twoCycles())
  expect(consume(report)).toStrictEqual(report)
})

it.each([
  ['an omitted cycle while another violation remains', (report) => report.summary.violations.pop()],
  [
    'an omitted rule on an edge with another error',
    (report) => {
      additionalRule(report)
      report.summary.violations.pop()
    },
  ],
  [
    'a duplicated cycle replacing another while totals stay unchanged',
    (report) => {
      report.summary.violations[1] = report.summary.violations[0]
    },
  ],
  [
    'a cycle reported as an ordinary dependency',
    (report) => {
      report.summary.violations[0].type = 'dependency'
      delete report.summary.violations[0].cycle
    },
  ],
  [
    'an error rule marked valid',
    (report) => {
      report.modules[1].dependencies[0].valid = true
    },
  ],
  [
    'an absent graph cycle path',
    (report) => {
      delete report.modules[1].dependencies[0].cycle
    },
  ],
  [
    'a representative edge belonging to another cycle',
    (report) => {
      report.summary.violations[0].from = 'shared/c.ts'
      report.summary.violations[0].to = 'shared/d.ts'
    },
  ],
  [
    'a cycle path absent from the graph',
    (report) => {
      report.summary.violations[0].cycle[0].name = 'shared/missing.ts'
    },
  ],
])('rejects %s', (_name, mutate) => {
  const report = twoCycles()
  mutate(report)
  report.summary.error = report.summary.violations.length
  report.summary.advisedExitCode = report.summary.error
  expect(() => consume(report)).toThrow(/Invalid dependency-cruiser report/)
})
