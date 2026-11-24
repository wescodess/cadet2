// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse as parseFrozenInstall } from '../../scripts/quality/frozen-install.parser.mjs'
import { authorityReceiptFixture } from '../support/quality-authority-fixture.mjs'

const directory = new URL('../../scripts/quality/', import.meta.url)
const fixturesDirectory = new URL('./quality-parsers/', import.meta.url)
const modules = readdirSync(directory)
  .filter((file) => file.endsWith('.parser.mjs'))
  .sort()
const fixtures = readdirSync(fixturesDirectory)
  .filter((file) => file.endsWith('.json'))
  .sort()
const completeness = {
  'convex-authority.parser.mjs': true,
  'boundaries.parser.mjs': true,
  'dead-code.parser.mjs':
    'Finding-only output; knip JSON has no independent complete source inventory.',
  'duplication.parser.mjs': true,
  'vitest-results.parser.mjs': true,
  'playwright-list.parser.mjs': true,
  'audit.parser.mjs': true,
  'licenses.parser.mjs': true,
  'lint.parser.mjs': true,
  'frozen-install.parser.mjs':
    'No independent event inventory; final event and lock digest establish completion.',
  'gitleaks.parser.mjs': 'Finding-only output; no independent inventory of secrets.',
  'gitleaks-release.parser.mjs':
    'Upstream release is the asset authority; only the selected asset has a local pin.',
  'gitleaks-version.parser.mjs': 'Single scalar result, checked against the pin by the installer.',
  'prettier-check.parser.mjs': 'Single boolean result for one independently invoked file.',
  'prettier-config.parser.mjs':
    'Single configuration value; no independent configuration authority.',
  'prettier-info.parser.mjs': 'Single file result; no independent parser-inference authority.',
  'types.parser.mjs': 'Diagnostic-only output; successful files have no report entries.',
}
const malformed = [
  null,
  42,
  {},
  [],
  'scanner unavailable',
  '{"truncated":',
  'null',
  '{}',
  '[]',
  '"scanner unavailable"',
]

function objectMutations(value) {
  const keys = Object.keys(value)
  const missing = { ...value }
  delete missing[keys[0]]
  return [missing, { ...value, [keys[0]]: null }, { ...value, unknown: true }]
}

function malformedInputs(valid) {
  const inputs = [...malformed]
  if (typeof valid === 'string') {
    const decoded = JSON.parse(valid)
    inputs.push(...objectMutations(decoded).map((value) => JSON.stringify(value)))
  } else if (typeof valid === 'object') {
    inputs.push(...objectMutations(valid))
    if (Object.hasOwn(valid, 'stdout'))
      inputs.push(...malformed.map((stdout) => ({ ...valid, stdout })))
  }
  return inputs
}

function parserFixture(file) {
  const descriptor = JSON.parse(
    readFileSync(new URL(file.replace('.parser.mjs', '.json'), fixturesDirectory), 'utf8'),
  )
  if (descriptor.native !== 'convex-authority-worker') return descriptor
  const { fixture, genuine, binding } = authorityReceiptFixture()
  try {
    expect(genuine.claims).toEqual([{ file: 'convex/functions.ts', name: 'named', kind: 'query' }])
    const valid = { status: 0, stdout: JSON.stringify(genuine) }
    return {
      context: binding,
      valid,
      expected: genuine,
      alsoValid: [],
      alsoExpected: [],
      incomplete: { ...valid, stdout: JSON.stringify({ ...genuine, population: [] }) },
      invalid: [{ ...valid, status: 1 }],
      cases: [],
    }
  } finally {
    fixture.remove()
  }
}

describe('quality tool parsers', () => {
  it('registers a fixture for every parser module and no stale fixtures', () => {
    expect(modules.length).toBeGreaterThan(0)
    expect(Object.keys(completeness).sort()).toEqual(modules)
    expect(modules.map((file) => file.replace('.parser.mjs', '.json'))).toEqual(fixtures)
  })

  for (const file of modules) {
    describe(file, async () => {
      const { parse } = await import(new URL(file, directory).href)
      const fixture = parserFixture(file)
      const consume = (input) => parse(input, fixture.context)
      for (const fixtureCase of fixture.cases ?? []) {
        it(fixtureCase.name, () => {
          if (fixtureCase.valid) {
            expect(fixtureCase).toHaveProperty('expected')
            expect(consume(fixtureCase.input)).toStrictEqual(fixtureCase.expected)
          } else expect(() => consume(fixtureCase.input)).toThrow(/Invalid /)
        })
      }
      it('declares and checks independent completeness coverage', () => {
        if (completeness[file] === true) {
          expect(fixture.incomplete).toBeDefined()
          expect(() => consume(fixture.incomplete)).toThrow(/Invalid /)
        } else {
          expect(completeness[file]).toEqual(expect.any(String))
          expect(completeness[file].length).toBeGreaterThan(20)
        }
      })
      it('preserves the exact result of every valid tool output', () => {
        expect(fixture).toHaveProperty('expected')
        expect(fixture.alsoExpected).toHaveLength(fixture.alsoValid.length)
        expect(consume(fixture.valid)).toStrictEqual(fixture.expected)
        fixture.alsoValid.forEach((input, index) => {
          expect(consume(input)).toStrictEqual(fixture.alsoExpected[index])
        })
      })
      it('rejects the shared malformed corpus and tool-specific inconsistencies', () => {
        for (const value of [...malformedInputs(fixture.valid), ...fixture.invalid])
          expect(() => consume(value), JSON.stringify(value)).toThrow(/Invalid /)
      })
    })
  }
})

describe('shared JSON boundary', () => {
  it('rejects malformed JSON even when the downstream value schema accepts unknown values', async () => {
    const { z } = await import('zod')
    const { parser, jsonOutput } = await import('../../scripts/quality/parser.mjs')
    const parse = parser('JSON boundary', jsonOutput(z.unknown()))
    expect(() => parse('{"truncated":')).toThrow(/Invalid /)
    expect(parse('null')).toBeNull()
    expect(parse('42')).toBe(42)
  })
})

describe('frozen install completion clocks', () => {
  const fixture = parserFixture('frozen-install.parser.mjs')
  const input = (completion) => {
    const entries = fixture.valid.stdout.trimEnd().split('\n').map(JSON.parse)
    Object.assign(entries[3], completion)
    return {
      ...fixture.valid,
      stdout: `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`,
    }
  }

  it.each([
    ['a log timestamp 1 ms after endedAt', { startedAt: 99, endedAt: 103, time: 104 }],
    ['a log timestamp 7 ms after endedAt', { startedAt: 99, endedAt: 103, time: 110 }],
    ['a log timestamp at the 50 ms bound', { startedAt: 99, endedAt: 103, time: 153 }],
    ['startedAt equal to the first event', { startedAt: 100, endedAt: 103, time: 103 }],
    ['endedAt equal to the last preceding event', { startedAt: 99, endedAt: 102, time: 103 }],
  ])('accepts %s', (_, completion) => {
    const expected = { ...fixture.expected, stdout: [...fixture.expected.stdout] }
    expected.stdout[3] = {
      time: completion.time,
      hostname: 'fixture',
      pid: 1,
      level: 'debug',
      name: 'pnpm:execution-time',
      startedAt: completion.startedAt,
      endedAt: completion.endedAt,
    }
    expect(parseFrozenInstall(input(completion))).toStrictEqual(expected)
  })

  it.each([
    ['a log timestamp before endedAt', { time: 103, endedAt: 104 }],
    ['a 51 ms gap beyond the bound', { time: 154 }],
    ['endedAt before the first event', { endedAt: 99 }],
    ['endedAt before the preceding install events', { endedAt: 101 }],
    ['startedAt after the first event', { startedAt: 101 }],
  ])('rejects %s', (_, completion) => {
    expect(() => parseFrozenInstall(input(completion))).toThrow(
      /Inconsistent install completion time/,
    )
  })
})
