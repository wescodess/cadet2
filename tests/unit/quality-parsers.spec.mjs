// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const directory = new URL('../../scripts/quality/', import.meta.url)
const fixturesDirectory = new URL('./quality-parsers/', import.meta.url)
const modules = readdirSync(directory)
  .filter((file) => file.endsWith('.parser.mjs'))
  .sort()
const fixtures = readdirSync(fixturesDirectory)
  .filter((file) => file.endsWith('.json'))
  .sort()
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

describe('quality tool parsers', () => {
  it('registers a fixture for every parser module and no stale fixtures', () => {
    expect(modules.length).toBeGreaterThan(0)
    expect(modules.map((file) => file.replace('.parser.mjs', '.json'))).toEqual(fixtures)
  })

  for (const file of modules) {
    describe(file, async () => {
      const { parse } = await import(new URL(file, directory).href)
      const fixture = JSON.parse(
        readFileSync(new URL(file.replace('.parser.mjs', '.json'), fixturesDirectory), 'utf8'),
      )
      it('accepts valid tool output', () => {
        for (const valid of [fixture.valid, ...fixture.alsoValid])
          expect(() => parse(valid)).not.toThrow()
      })
      it('rejects the shared malformed corpus and tool-specific inconsistencies', () => {
        for (const value of [...malformedInputs(fixture.valid), ...fixture.invalid])
          expect(() => parse(value), JSON.stringify(value)).toThrow(/Invalid /)
      })
    })
  }
})
