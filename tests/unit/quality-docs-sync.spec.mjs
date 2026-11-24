// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

const START = '<!-- quality-figures:start -->'
const END = '<!-- quality-figures:end -->'
const total = (entries) => entries.reduce((sum, [, value]) => sum + value, 0)
const category = (entries, kind) => total(entries.filter(([key]) => key.split('|')[1] === kind))
const occurrences = (text, part) => text.split(part).length - 1

function render({ entries, tools, boundaries, deadCode, duplication }) {
  const scanners = entries
    .filter((entry) => entry.startsWith('scripts/quality/'))
    .map((entry) => `\`${entry.slice('scripts/quality/'.length)}\``)
    .sort()
  const operators = entries.filter((entry) => /^qa\/.*\.mjs$/.test(entry)).length
  const defaults = entries.filter((entry) => entry.endsWith('auth.config.ts')).length
  const roots = [...new Set(boundaries.map(([key]) => key.split('/')[0]))]
  const where = roots.length === 1 ? `, all in \`${roots[0]}/\`` : ''
  const unused = ['files', 'exports', 'types', 'dependencies', 'devDependencies'].map((kind) =>
    category(deadCode, kind),
  )
  return [
    '| Row | Pin and threshold | Inherited baseline |',
    '| --- | --- | --- |',
    `| \`pnpm boundaries:check\` | [dependency-cruiser **${tools['dependency-cruiser']}**](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md); zero new cycles or prohibited import edges | **${total(boundaries)}** exact cycle identities${where}; \`baselines/boundaries.json\` |`,
    `| \`pnpm dead-code:check\` | [knip **${tools.knip}**](https://knip.dev/reference/cli); zero new unused files, value/type exports, production/dev dependencies | **${total(deadCode)}** identities: ${unused[0]} files, ${unused[1]} value exports, ${unused[2]} type exports, ${unused[3]} dependencies, ${unused[4]} devDependencies; \`baselines/dead-code.json\` |`,
    `| \`pnpm duplication:check\` | [jscpd **${tools.jscpd}**](https://github.com/kucherenko/jscpd); exact clones of at least **100 tokens and 10 lines**, strict mode; zero new changed-file clone identities | **${total(duplication)}** file/clone occurrences across ${duplication.length} keys; \`baselines/duplication.json\` |`,
    '',
    `Explicit Knip entries: **${defaults}** Nuxt auth defaults, **${operators}** operator CLI paths and **${scanners.length}** scanner executable files (${scanners.join(', ')}).`,
  ].join('\n')
}

function drift(sources) {
  const { docs } = sources
  if (occurrences(docs, START) !== 1 || occurrences(docs, END) !== 1)
    return [`expected exactly one ${START} and one ${END}`]
  const start = docs.indexOf(START)
  const end = docs.indexOf(END)
  if (end < start) return [`${END} precedes ${START}`]
  const expected = render(sources)
  return docs.slice(start + START.length, end).trim() === expected
    ? []
    : [`docs/agents/quality-bar.md figures block must read exactly:\n${expected}`]
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

const sources = () => ({
  entries: [
    'app/auth.config.ts',
    'qa/run.mjs',
    'scripts/quality/b.scanner.mjs',
    'scripts/quality/a.scanner.mjs',
  ],
  tools: { 'dependency-cruiser': '1.0.0', knip: '2.0.0', jscpd: '3.0.0' },
  boundaries: [
    ['app/a|no-cycles|app/b', 1],
    ['app/c|no-cycles|app/d', 1],
  ],
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
const EXPECTED = [
  '| Row | Pin and threshold | Inherited baseline |',
  '| --- | --- | --- |',
  '| `pnpm boundaries:check` | [dependency-cruiser **1.0.0**](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md); zero new cycles or prohibited import edges | **2** exact cycle identities, all in `app/`; `baselines/boundaries.json` |',
  '| `pnpm dead-code:check` | [knip **2.0.0**](https://knip.dev/reference/cli); zero new unused files, value/type exports, production/dev dependencies | **6** identities: 1 files, 1 value exports, 1 type exports, 2 dependencies, 1 devDependencies; `baselines/dead-code.json` |',
  '| `pnpm duplication:check` | [jscpd **3.0.0**](https://github.com/kucherenko/jscpd); exact clones of at least **100 tokens and 10 lines**, strict mode; zero new changed-file clone identities | **3** file/clone occurrences across 2 keys; `baselines/duplication.json` |',
  '',
  'Explicit Knip entries: **1** Nuxt auth defaults, **1** operator CLI paths and **2** scanner executable files (`a.scanner.mjs`, `b.scanner.mjs`).',
].join('\n')
const DUPLICATION_ROW = EXPECTED.split('\n')[4]
const documented = (body) => `# Bar\n\nIntro.\n\n${START}\n\n${body}\n\n${END}\n\nAfter.\n`
const edit = (text, from, to) => {
  expect(text, `fixture no longer contains ${from}`).toContain(from)
  return text.replace(from, to)
}

it('keeps the quality bar figures block equal to knip, the baselines and the tool pins', () => {
  expect(drift(repository())).toEqual([])
})

it('renders the explicit fixture to its known-good literal block', () => {
  expect(render(sources())).toBe(EXPECTED)
  expect(drift({ ...sources(), docs: documented(EXPECTED) })).toEqual([])
})

it.each([
  [
    'boundaries',
    (base) => ({ boundaries: base.boundaries.slice(1) }),
    '**2** exact cycle',
    '**1** exact cycle',
  ],
  [
    'dead code',
    (base) => ({ deadCode: base.deadCode.slice(1) }),
    '**6** identities: 1 files',
    '**5** identities: 0 files',
  ],
  [
    'duplication',
    (base) => ({ duplication: base.duplication.slice(1) }),
    '**3** file/clone occurrences across 2 keys',
    '**1** file/clone occurrences across 1 keys',
  ],
])('accepts a synchronized %s paydown', (_, lower, from, to) => {
  const base = { ...sources(), ...lower(sources()) }
  expect(drift({ ...base, docs: documented(edit(EXPECTED, from, to)) })).toEqual([])
  expect(drift({ ...base, docs: documented(EXPECTED) })).not.toEqual([])
})

it.each([
  ['a changed figure', (docs) => edit(docs, '**3** file/clone', '**4** file/clone')],
  ['a hidden row', (docs) => edit(docs, DUPLICATION_ROW, `<!-- ${DUPLICATION_ROW} -->`)],
  [
    'a backtick-fenced table',
    (docs) => edit(docs, EXPECTED, `\`\`\`markdown\n${EXPECTED}\n\`\`\``),
  ],
  ['a tilde-fenced table', (docs) => edit(docs, EXPECTED, `~~~markdown\n${EXPECTED}\n~~~`)],
  [
    'an earlier historical copy shadowing a wrong current figure',
    (docs) => `## History\n\n${EXPECTED}\n\n${edit(docs, '**2** exact', '**9** exact')}`,
  ],
  ['a duplicated block', (docs) => `${docs}\n${START}\n${EXPECTED}\n${END}\n`],
  ['a missing end marker', (docs) => edit(docs, END, '')],
  ['swapped markers', (docs) => edit(edit(docs, START, '@@'), END, START).replace('@@', END)],
  ['an extra statement inside the block', (docs) => edit(docs, END, `Also: **9** more.\n\n${END}`)],
])('rejects %s', (_, mutate) => {
  const docs = documented(EXPECTED)
  const mutated = mutate(docs)
  expect(mutated).not.toBe(docs)
  expect(drift({ ...sources(), docs: mutated })).not.toEqual([])
})

it.each([
  [
    'an undocumented scanner entry',
    (base) => ({ entries: [...base.entries, 'scripts/quality/c.scanner.mjs'] }),
  ],
  ['a moved tool pin', (base) => ({ tools: { ...base.tools, jscpd: '9.9.9' } })],
  [
    'a cycle outside app/',
    (base) => ({ boundaries: [...base.boundaries, ['server/x|no-cycles|server/y', 1]] }),
  ],
])('rejects %s and prints the block to paste', (_, change) => {
  const changed = { ...sources(), ...change(sources()) }
  expect(drift({ ...changed, docs: documented(EXPECTED) })).toEqual([
    `docs/agents/quality-bar.md figures block must read exactly:\n${render(changed)}`,
  ])
})

it('prints the exact expected block when a documented figure drifts', () => {
  const docs = documented(edit(EXPECTED, '**3** file/clone', '**4** file/clone'))
  expect(drift({ ...sources(), docs })).toEqual([
    `docs/agents/quality-bar.md figures block must read exactly:\n${EXPECTED}`,
  ])
})

it('leaves Markdown context around the marked block to review', () => {
  const docs = documented(EXPECTED)
  const fenced = edit(edit(docs, START, `~~~\n${START}`), END, `${END}\n~~~`)
  expect(drift({ ...sources(), docs: `Use \`-->\` in examples.\n\n${docs}` })).toEqual([])
  expect(drift({ ...sources(), docs: fenced })).toEqual([])
})
