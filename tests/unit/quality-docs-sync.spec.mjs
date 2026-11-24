// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

const read = (path) => readFileSync(path, 'utf8')
const json = (path) => JSON.parse(read(path))
const docs = read('docs/agents/quality-bar.md')
const knip = json('scripts/quality/knip.json')
const tools = json('package.json').devDependencies
const numbers = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
]

function documented(pattern) {
  const match = docs.match(pattern)
  expect(match, `docs/agents/quality-bar.md no longer states ${pattern}`).not.toBeNull()
  return match
}
const count = (text) => (numbers.includes(text) ? numbers.indexOf(text) : Number(text))
const baseline = (name) => Object.entries(json(`scripts/quality/baselines/${name}.json`).counts)
const total = (entries) => entries.reduce((sum, [, value]) => sum + value, 0)
const category = (entries, kind) => total(entries.filter(([key]) => key.split('|')[1] === kind))

it('documents every explicit scanner executable entry by name', () => {
  const [, number, list] = documented(/the (\w+) scanner executable files \(([^)]*)\)/)
  const named = [...list.matchAll(/`([^`]+)`/g)].map(([, name]) => `scripts/quality/${name}`)
  const entries = knip.entry.filter((entry) => entry.startsWith('scripts/quality/'))
  expect(count(number)).toBe(entries.length)
  expect(named.sort()).toEqual(entries.sort())
})

it('documents the operator CLI and Nuxt auth entry counts', () => {
  const [, operators] = documented(/The (\w+) operator CLI paths in `knip\.json`/)
  const [, defaults] = documented(/The (\w+) Nuxt auth defaults/)
  expect(count(operators)).toBe(knip.entry.filter((entry) => /^qa\/.*\.mjs$/.test(entry)).length)
  expect(count(defaults)).toBe(
    knip.entry.filter((entry) => entry.endsWith('auth.config.ts')).length,
  )
})

it('documents the inherited structural baselines exactly', () => {
  const boundaries = baseline('boundaries')
  const deadCode = baseline('dead-code')
  const duplication = baseline('duplication')
  expect(Number(documented(/\*\*(\d+)\*\* exact cycle identities/)[1])).toBe(total(boundaries))
  const [, all, files, exports, types, dependencies, devDependencies] = documented(
    /\*\*(\d+)\*\* identities: (\d+) files, (\d+) value exports, (\d+) type exports, (\d+) dependencies, (\d+) devDependencies/,
  ).map(Number)
  expect([all, files, exports, types, dependencies, devDependencies]).toEqual([
    total(deadCode),
    category(deadCode, 'files'),
    category(deadCode, 'exports'),
    category(deadCode, 'types'),
    category(deadCode, 'dependencies'),
    category(deadCode, 'devDependencies'),
  ])
  const [, occurrences, keys] = documented(
    /\*\*(\d+)\*\* file\/clone occurrences across (\d+) keys/,
  ).map(Number)
  expect([occurrences, keys]).toEqual([total(duplication), duplication.length])
})

it('documents the pinned structural tool versions', () => {
  for (const tool of ['dependency-cruiser', 'knip', 'jscpd'])
    expect(documented(new RegExp(`\\[${tool} \\*\\*([^*]+)\\*\\*\\]`))[1]).toBe(tools[tool])
})
