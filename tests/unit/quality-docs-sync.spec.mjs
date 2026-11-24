// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

const START = '<!-- quality-figures:start -->'
const END = '<!-- quality-figures:end -->'
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
const occurrences = (text, part) => text.split(part).length - 1

function figures(docs, problems) {
  if (occurrences(docs, START) !== 1 || occurrences(docs, END) !== 1) {
    problems.push(`expected exactly one ${START} … ${END} block`)
    return ''
  }
  const [, after] = docs.split(START)
  const [inside] = after.split(END)
  if (!docs.includes(END, docs.indexOf(START))) problems.push(`${END} precedes ${START}`)
  return inside.replace(/<!--[\s\S]*?-->/g, '').replace(/^```[\s\S]*?^```/gm, '')
}

function drift({ docs, entries, tools, boundaries, deadCode, duplication }) {
  const problems = []
  const block = figures(docs, problems)
  const once = (text, pattern, where) => {
    const found = [...text.matchAll(new RegExp(pattern.source, 'g'))]
    if (found.length !== 1)
      problems.push(`${where}: expected one ${pattern}, found ${found.length}`)
    return found[0]
  }
  const row = (command) => {
    const matches = block.split('\n').filter((line) => line.startsWith(`| \`${command}\` |`))
    if (matches.length !== 1)
      problems.push(`expected one row for ${command}, found ${matches.length}`)
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
  const listed = once(block, /the (\w+) scanner executable files \(([^)]*)\)/, 'scanner entries')
  if (listed) {
    const named = [...listed[2].matchAll(/`([^`]+)`/g)].map(([, name]) => `scripts/quality/${name}`)
    compare('scanner entries', [count(listed[1]), named.sort()], [scanners.length, scanners])
  }
  const operators = once(block, /The (\w+) operator CLI paths in `knip\.json`/, 'operator entries')
  if (operators)
    compare(
      'operator entries',
      count(operators[1]),
      entries.filter((e) => /^qa\/.*\.mjs$/.test(e)).length,
    )
  const defaults = once(block, /The (\w+) Nuxt auth defaults/, 'auth entries')
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

function repository() {
  const read = (path) => readFileSync(path, 'utf8')
  const json = (path) => JSON.parse(read(path))
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

const FIXTURE_TABLE = [
  '| Row | Pin and threshold | Inherited baseline |',
  '| --- | --- | --- |',
  '| `pnpm boundaries:check` | [dependency-cruiser **1.0.0**](x) | **2** exact cycle identities |',
  '| `pnpm dead-code:check` | [knip **2.0.0**](x) | **6** identities: 1 files, 1 value exports, 1 type exports, 2 dependencies, 1 devDependencies |',
  '| `pnpm duplication:check` | [jscpd **3.0.0**](x) | **3** file/clone occurrences across 2 keys |',
].join('\n')
const FIXTURE_TEXT =
  'The one operator CLI paths in `knip.json` are roots. The one Nuxt auth defaults and the two scanner executable files (`a.scanner.mjs`, `b.scanner.mjs`) remain entries.'
const fixture = () => ({
  docs: `# Bar\n\n${START}\n\n${FIXTURE_TABLE}\n\n${FIXTURE_TEXT}\n\n${END}\n`,
  entries: [
    'app/auth.config.ts',
    'qa/run.mjs',
    'scripts/quality/a.scanner.mjs',
    'scripts/quality/b.scanner.mjs',
  ],
  tools: { 'dependency-cruiser': '1.0.0', knip: '2.0.0', jscpd: '3.0.0' },
  boundaries: [['a|no-cycles|b', 2]],
  deadCode: [
    ['a|files|a', 1],
    ['b|exports|x', 1],
    ['c|types|T', 1],
    ['package.json|dependencies|p', 2],
    ['package.json|devDependencies|q', 1],
  ],
  duplication: [
    ['a|clone|a:b|h1', 2],
    ['c|clone|c:d|h2', 1],
  ],
})
const edit = (docs, from, to) => {
  expect(docs, `fixture no longer contains ${from}`).toContain(from)
  return docs.replace(from, to)
}

it('keeps the quality bar figures in sync with knip, the baselines and the tool pins', () => {
  expect(drift(repository())).toEqual([])
})

it('accepts the explicit fixture and synchronized paydowns of every baseline', () => {
  const base = fixture()
  expect(drift(base)).toEqual([])
  const docs = (from, to) => edit(base.docs, from, to)
  expect(
    drift({
      ...base,
      boundaries: [['a|no-cycles|b', 1]],
      docs: docs('**2** exact', '**1** exact'),
    }),
  ).toEqual([])
  expect(
    drift({
      ...base,
      deadCode: base.deadCode.slice(1),
      docs: docs('**6** identities: 1 files', '**5** identities: 0 files'),
    }),
  ).toEqual([])
  expect(
    drift({
      ...base,
      duplication: base.duplication.slice(1),
      docs: docs(
        '**3** file/clone occurrences across 2 keys',
        '**1** file/clone occurrences across 1 keys',
      ),
    }),
  ).toEqual([])
})

it.each([
  ['a changed figure', (docs) => edit(docs, '**3** file/clone', '**4** file/clone')],
  [
    'a hidden row',
    (docs) =>
      edit(docs, '| `pnpm boundaries:check` |', '<!-- | `pnpm boundaries:check` |').replace(
        'identities |',
        'identities | -->',
      ),
  ],
  [
    'swapped baseline cells',
    (docs) =>
      edit(
        edit(docs, '**2** exact cycle identities', '@@'),
        '**3** file/clone occurrences across 2 keys',
        '**2** exact cycle identities',
      ).replace('@@', '**3** file/clone occurrences across 2 keys'),
  ],
  [
    'an earlier historical copy shadowing a wrong current figure',
    (docs) => `## History\n\n${FIXTURE_TABLE}\n\n${edit(docs, '**2** exact', '**9** exact')}`,
  ],
  [
    'a later historical copy after the current row is dropped',
    (docs) => `${edit(docs, FIXTURE_TABLE.split('\n')[2], '')}\n${FIXTURE_TABLE}\n`,
  ],
  ['a duplicated block', (docs) => `${docs}\n${START}\n${FIXTURE_TABLE}\n${END}\n`],
  [
    'a fenced table',
    (docs) => edit(docs, FIXTURE_TABLE, `\`\`\`markdown\n${FIXTURE_TABLE}\n\`\`\``),
  ],
  ['a missing end marker', (docs) => edit(docs, END, '')],
  [
    'a stale scanner list',
    (docs) => edit(docs, 'the two scanner executable files', 'the three scanner executable files'),
  ],
  [
    'a repeated statement inside the block',
    (docs) => edit(docs, END, `The one Nuxt auth defaults again.\n${END}`),
  ],
])('rejects %s', (_, mutate) => {
  const base = fixture()
  expect(drift({ ...base, docs: mutate(base.docs) })).not.toEqual([])
})

it.each([
  [
    'an undocumented scanner entry',
    (base) => ({ entries: [...base.entries, 'scripts/quality/c.scanner.mjs'] }),
  ],
  ['a moved tool pin', (base) => ({ tools: { ...base.tools, jscpd: '9.9.9' } })],
  [
    'a paid-down baseline the docs still claim',
    (base) => ({ duplication: base.duplication.slice(1) }),
  ],
])('rejects %s', (_, change) => {
  const base = fixture()
  expect(drift({ ...base, ...change(base) })).not.toEqual([])
})

it('reads the current figures only from the marked block of the real document', () => {
  const real = repository()
  const [before, rest] = real.docs.split(START)
  const shifted = rest.replace(
    /\*\*(\d+)\*\* exact cycle identities/,
    (_, n) => `**${Number(n) + 1}** exact cycle identities`,
  )
  expect(shifted).not.toBe(rest)
  expect(drift({ ...real, docs: `${before}${START}${shifted}` })).not.toEqual([])
  expect(drift({ ...real, docs: `${before}${rest}` })).not.toEqual([])
})
