// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

const read = (path) => readFileSync(path, 'utf8')
const json = (path) => JSON.parse(read(path))
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
const count = (text) => (numbers.includes(text) ? numbers.indexOf(text) : Number(text))
const total = (entries) => entries.reduce((sum, [, value]) => sum + value, 0)
const category = (entries, kind) => total(entries.filter(([key]) => key.split('|')[1] === kind))

function current() {
  const baseline = (name) => Object.entries(json(`scripts/quality/baselines/${name}.json`).counts)
  return {
    docs: read('docs/agents/quality-bar.md'),
    entries: json('scripts/quality/knip.json').entry,
    tools: json('package.json').devDependencies,
    boundaries: baseline('boundaries'),
    deadCode: baseline('dead-code'),
    duplication: baseline('duplication'),
  }
}

function drift({ docs, entries, tools, boundaries, deadCode, duplication }) {
  const problems = []
  const visible = docs.replace(/<!--[\s\S]*?-->/g, '')
  const once = (text, pattern, where) => {
    const found = [...text.matchAll(new RegExp(pattern.source, 'g'))]
    if (found.length !== 1)
      problems.push(`${where}: expected one ${pattern}, found ${found.length}`)
    return found[0]
  }
  const lines = visible.split('\n')
  const header = lines.indexOf('| Row | Pin and threshold | Inherited baseline |')
  const end = lines.findIndex((line, index) => index > header && !line.startsWith('|'))
  const table = header < 0 ? [] : lines.slice(header, end < 0 ? undefined : end)
  if (header < 0) problems.push('structural rows table is missing')
  const row = (command) => {
    const matches = table.filter((line) => line.startsWith(`| \`${command}\` |`))
    if (matches.length !== 1)
      problems.push(`expected one table row for ${command}, found ${matches.length}`)
    return matches[0] ?? ''
  }
  const compare = (where, documented, actual) => {
    if (JSON.stringify(documented) !== JSON.stringify(actual))
      problems.push(
        `${where}: documents ${JSON.stringify(documented)}, source is ${JSON.stringify(actual)}`,
      )
  }
  const pinned = (command, tool) => {
    const match = once(row(command), new RegExp(`\\[${tool} \\*\\*([^*]+)\\*\\*\\]`), command)
    if (match) compare(`${command} ${tool} version`, match[1], tools[tool])
  }

  const scanners = entries.filter((entry) => entry.startsWith('scripts/quality/')).sort()
  const scannerText = once(
    visible,
    /the (\w+) scanner executable files \(([^)]*)\)/,
    'scanner entries',
  )
  if (scannerText) {
    const named = [...scannerText[2].matchAll(/`([^`]+)`/g)].map(
      ([, name]) => `scripts/quality/${name}`,
    )
    compare('scanner entries', [count(scannerText[1]), named.sort()], [scanners.length, scanners])
  }
  const operators = once(
    visible,
    /The (\w+) operator CLI paths in `knip\.json`/,
    'operator entries',
  )
  if (operators)
    compare(
      'operator entries',
      count(operators[1]),
      entries.filter((e) => /^qa\/.*\.mjs$/.test(e)).length,
    )
  const defaults = once(visible, /The (\w+) Nuxt auth defaults/, 'auth entries')
  if (defaults)
    compare(
      'auth entries',
      count(defaults[1]),
      entries.filter((e) => e.endsWith('auth.config.ts')).length,
    )

  pinned('pnpm boundaries:check', 'dependency-cruiser')
  const cycles = once(
    row('pnpm boundaries:check'),
    /\*\*(\d+)\*\* exact cycle identities/,
    'boundaries',
  )
  if (cycles) compare('boundaries baseline', Number(cycles[1]), total(boundaries))

  pinned('pnpm dead-code:check', 'knip')
  const unused = once(
    row('pnpm dead-code:check'),
    /\*\*(\d+)\*\* identities: (\d+) files, (\d+) value exports, (\d+) type exports, (\d+) dependencies, (\d+) devDependencies/,
    'dead-code',
  )
  if (unused)
    compare('dead-code baseline', unused.slice(1).map(Number), [
      total(deadCode),
      ...['files', 'exports', 'types', 'dependencies', 'devDependencies'].map((kind) =>
        category(deadCode, kind),
      ),
    ])

  pinned('pnpm duplication:check', 'jscpd')
  const clones = once(
    row('pnpm duplication:check'),
    /\*\*(\d+)\*\* file\/clone occurrences across (\d+) keys/,
    'duplication',
  )
  if (clones)
    compare('duplication baseline', clones.slice(1).map(Number), [
      total(duplication),
      duplication.length,
    ])
  return problems
}

const boundaryCell = /\*\*29\*\* exact cycle identities, all in `app\/`/
const duplicationCell = /\*\*81\*\* file\/clone occurrences across 81 keys/

it('keeps the quality bar figures in sync with knip, the baselines and the tool pins', () => {
  expect(drift(current())).toEqual([])
})

it.each([
  [
    'a changed baseline figure',
    (docs) => docs.replace(duplicationCell, '**82** file/clone occurrences across 81 keys'),
  ],
  [
    'a statement hidden in a comment',
    (docs) => docs.replace(boundaryCell, (cell) => `<!-- ${cell} -->`),
  ],
  [
    'baseline cells swapped between rows',
    (docs) =>
      docs
        .replace(boundaryCell, '@@')
        .replace(duplicationCell, '**29** exact cycle identities, all in `app/`')
        .replace('@@', '**81** file/clone occurrences across 81 keys'),
  ],
  [
    'a row kept only as history',
    (docs) => {
      const line = docs.split('\n').find((text) => text.startsWith('| `pnpm boundaries:check` |'))
      return `${docs.replace(line, '')}\n### Historical snapshot\n\n${line}\n`
    },
  ],
  [
    'a stale scanner list',
    (docs) =>
      docs.replace('the three scanner executable files', 'the two scanner executable files'),
  ],
  [
    'a duplicated statement',
    (docs) => `${docs}\nThe 13 operator CLI paths in \`knip.json\` were counted twice.\n`,
  ],
])('rejects %s', (_, mutate) => {
  const sources = current()
  expect(drift({ ...sources, docs: mutate(sources.docs) })).not.toEqual([])
})

it.each([
  [
    'an undocumented scanner entry',
    (sources) => ({ entries: [...sources.entries, 'scripts/quality/new.scanner.mjs'] }),
  ],
  ['a moved tool pin', (sources) => ({ tools: { ...sources.tools, jscpd: '9.9.9' } })],
  [
    'a paid-down baseline the docs still claim',
    (sources) => ({ duplication: sources.duplication.slice(1) }),
  ],
])('rejects %s', (_, change) => {
  const sources = current()
  expect(drift({ ...sources, ...change(sources) })).not.toEqual([])
})
