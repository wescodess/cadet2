// @vitest-environment node
import { mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import ts from 'typescript'
import { authorityFixture } from '../support/quality-authority-fixture.mjs'

vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 })
const row = resolve('scripts/quality/dead-code.mjs')
const declaration =
  "import { queryGeneric as ask } from 'convex/server'; export const named = ask({ args: {}, handler: () => null })"
const helperDeclaration =
  "import { queryGeneric as ask } from 'convex/server'; import { work } from '../shared/helper'; export const named = ask({ args: {}, handler: () => work() })"
let fixture, parent, template
beforeAll(() => {
  parent = mkdtempSync(join(realpathSync(tmpdir()), 'authority-scope-'))
  fixture = authorityFixture({}, parent)
  template = Object.fromEntries(
    ['package.json', 'tsconfig.json', 'convex/tsconfig.json', 'convex/_generated/server.js'].map(
      (file) => [file, readFileSync(join(fixture.directory, file))],
    ),
  )
})
afterAll(() => rmSync(parent, { recursive: true, force: true }))
function prepare(sources = {}) {
  for (const name of ['convex', 'shared', 'jsconfig.json', 'convex.json'])
    rmSync(join(fixture.directory, name), { recursive: true, force: true })
  rmSync(join(parent, 'package.json'), { force: true })
  for (const [file, text] of Object.entries(template)) fixture.write(file, text)
  for (const name of ['boundaries', 'dead-code', 'duplication'])
    fixture.write(
      `scripts/quality/baselines/${name}.json`,
      JSON.stringify({
        date: '2026-11-21',
        commit: '1b335bface0686641850ea8cd23aa5c5dea4e45c',
        counts: {},
      }),
    )
  fixture.write('index.ts', 'console.log(1)')
  fixture.write('convex/functions.ts', declaration)
  for (const [file, text] of Object.entries(sources)) fixture.write(file, text)
  fixture.track()
  return fixture
}
function publicRow() {
  return fixture.run(`await import(${JSON.stringify(row)})`, { QUALITY_BASE_REF: 'HEAD' })
}
function rejects(code) {
  const result = publicRow()
  expect(result.status, result.stdout + result.stderr).toBe(1)
  expect(result.stderr).toContain(code)
  return result
}
it('public row rejects initializer-time indexing of an already-bound schema table', () => {
  prepare({
    'convex/schema.ts':
      "import { defineSchema, defineTable } from 'convex/server'; import { v } from 'convex/values'; const table = defineTable({ label: v.string() }); const schema = defineSchema({ items: table }); const changed = table.index('late', ['label']); export default schema",
  })
  rejects('module_initialization')
})
it('public row rejects an extra canonical SDK import in the generated builder', () => {
  prepare()
  fixture.write(
    'convex/_generated/server.js',
    String(template['convex/_generated/server.js']) +
      "\nimport { queryGeneric as unused } from 'convex/server'\n",
  )
  rejects('generated_mapping')
})
const packageControls = [
  [
    'browser substitution',
    'convex/nested/package.json',
    '{"browser":{"convex/server":"./fake.ts"}}',
  ],
  ['browser false', 'convex/nested/package.json', '{"browser":{"convex/server":false}}'],
  ['nearer empty package', 'convex/nested/deeper/package.json', '{}'],
  [
    'package imports',
    'package.json',
    '{"type":"module","dependencies":{"convex":"^1.32.0"},"imports":{"#server":"./fake.ts"}}',
  ],
  [
    'self exports',
    'package.json',
    '{"name":"convex","type":"module","dependencies":{"convex":"^1.32.0"},"exports":{"./server":"./fake.ts"}}',
  ],
  ['shared helper package', 'shared/package.json', '{}'],
  ['malformed package', 'convex/nested/package.json', '{'],
  [
    'duplicate package field',
    'package.json',
    '{"type":"module","type":"module","dependencies":{"convex":"^1.32.0"}}',
  ],
  ['generated package', 'convex/_generated/package.json', '{}'],
  [
    'same-version nested package',
    'convex/node_modules/convex/package.json',
    '{"name":"convex","version":"1.32.0","exports":{"./server":{"convex":"./fake.js"}}}',
  ],
]
it.each(packageControls)('public row rejects %s', (_, file, text) => {
  prepare({
    'convex/nested/deeper/functions.ts': declaration,
    'shared/helper.ts': 'export function work() { return 1 }',
    'convex/functions.ts': helperDeclaration,
    [file]: text,
  })
  rejects('package_scope')
})
it('public row rejects an inherited above-root browser scope despite a nearer empty package', () => {
  prepare({ 'convex/nested/package.json': '{}', 'convex/nested/functions.ts': declaration })
  fixture.write('../package.json', '{"browser":{"convex/server":false}}')
  rejects('package_scope')
})
const compilerControls = [
  ['root inheritance', 'tsconfig.json', '{"extends":"./other.json"}'],
  ['root jsconfig', 'jsconfig.json', '{}'],
  ['nested empty tsconfig', 'convex/nested/tsconfig.json', '{}'],
  [
    'nested jsconfig paths',
    'convex/nested/jsconfig.json',
    '{"compilerOptions":{"paths":{"convex/server":["./fake.ts"]}}}',
  ],
  ['malformed generated config', 'convex/_generated/jsconfig.json', '{'],
  ['shared helper config', 'shared/tsconfig.json', '{}'],
  [
    'duplicate compiler option',
    'convex/tsconfig.json',
    '{"compilerOptions":{"strict":true,"strict":false}}',
  ],
]
it.each(compilerControls)('public row rejects %s', (_, file, text) => {
  prepare({
    'convex/nested/functions.ts': declaration,
    'convex/functions.ts': helperDeclaration,
    'shared/helper.ts': 'export function work() { return 1 }',
    [file]: text,
  })
  rejects('compiler_scope')
})
it.each([
  'convex/nested/tsconfig.json',
  'convex/nested/jsconfig.json',
  'convex/_generated/tsconfig.json',
])('public row discovers ignored untracked compiler scope %s', (file) => {
  prepare({ 'convex/nested/functions.ts': declaration })
  fixture.write('.gitignore', `node_modules/\n.quality-output/\n${file}\n`)
  fixture.write(file, '{}')
  rejects('compiler_scope')
  fixture.write('.gitignore', 'node_modules/\n.quality-output/\n')
})
it('public row rejects root compiler deletion and a compiler symlink', () => {
  prepare()
  rmSync(join(fixture.directory, 'convex/tsconfig.json'))
  rejects('compiler_scope')
  fixture.write('convex/profile.json', template['convex/tsconfig.json'])
  symlinkSync('profile.json', join(fixture.directory, 'convex/tsconfig.json'))
  rejects('source_identity')
})
const bindingControls = [
  [
    'let export',
    'export let named = ask({ args: {}, handler: () => null }); named = 170',
    'mutable_binding',
  ],
  ['var export', 'export var named = ask({ args: {}, handler: () => null })', 'mutable_binding'],
  [
    'mutable local alias',
    'let value = ask({ args: {}, handler: () => null }); export { value as named }',
    'mutable_binding',
  ],
  [
    'destructuring',
    'const { value } = { value: 1 }; export const named = ask({ args: {}, handler: () => null })',
    'mutable_binding',
  ],
  [
    'duplicate export',
    'const named = ask({ args: {}, handler: () => null }); export { named, named as again }',
    'import_binding',
  ],
  [
    'candidate property assignment',
    'export const named = ask({ args: {}, handler: () => null }); named.isQuery = false',
    'module_initialization',
  ],
  [
    'candidate bracket mutation in body',
    "export const named = ask({ args: {}, handler: () => null }); function later() { named['isQuery'] = false }",
    'authority_reference',
  ],
  [
    'candidate delete in body',
    'export const named = ask({ args: {}, handler: () => null }); function later() { delete named.isQuery }',
    'authority_reference',
  ],
  [
    'candidate reflection in body',
    'export const named = ask({ args: {}, handler: () => null }); function later() { Object.assign(named, { isQuery: false }) }',
    'authority_reference',
  ],
  [
    'registrar reflection in body',
    'export const named = ask({ args: {}, handler: () => null }); function later() { return Object.keys(ask) }',
    'authority_reference',
  ],
  [
    'candidate alias',
    'const named = ask({ args: {}, handler: () => null }); const other = named; export { other }',
    'authority_reference',
  ],
  [
    'registrar alias',
    'const alias = ask; export const named = alias({ args: {}, handler: () => null })',
    'authority_reference',
  ],
  [
    'const reassignment in body',
    'const value = 1; function later() { value++ } export const named = ask({ args: {}, handler: () => null })',
    'mutable_binding',
  ],
  [
    'handler factory',
    'function make() { return () => null } export const named = ask({ args: {}, handler: make() })',
    'module_initialization',
  ],
  [
    'definition spread',
    'const data = {}; export const named = ask({ ...data, args: {}, handler: () => null })',
    'value_role',
  ],
  [
    'initializer IIFE',
    'const data = (() => 1)(); export const named = ask({ args: {}, handler: () => null })',
    'module_initialization',
  ],
  [
    'getter',
    'const data = { get value() { return 1 } }; export const named = ask({ args: {}, handler: () => null })',
    'module_initialization',
  ],
  [
    'computed key',
    "const data = { ['value']: 1 }; export const named = ask({ args: {}, handler: () => null })",
    'module_initialization',
  ],
  [
    'general spread',
    'const data = { value: 1 }; const copy = { ...data }; export const named = ask({ args: {}, handler: () => null })',
    'value_role',
  ],
  [
    'class static block',
    'class Effect { static { console.log(1) } } export const named = ask({ args: {}, handler: () => null })',
    'module_initialization',
  ],
  [
    'runtime enum',
    'enum State { Ready } export const named = ask({ args: {}, handler: () => null })',
    'module_initialization',
  ],
  [
    'top-level dynamic import',
    "const data = import('./helper'); export const named = ask({ args: {}, handler: () => null })",
    'module_initialization',
  ],
  [
    'top-level await',
    'const data = await Promise.resolve(1); export const named = ask({ args: {}, handler: () => null })',
    'module_initialization',
  ],
  [
    'initializer eval',
    "const data = eval('1'); export const named = ask({ args: {}, handler: () => null })",
    'value_role',
  ],
  [
    'custom constructor',
    'const data = new Date(); export const named = ask({ args: {}, handler: () => null })',
    'module_initialization',
  ],
  [
    'shadowed intrinsic',
    "function Set(value) { return value } const data = new Set(['ready']); export const named = ask({ args: {}, handler: () => null })",
    'module_initialization',
  ],
]
it.each(bindingControls)('public row rejects %s', (_, source, code) => {
  prepare({
    'convex/functions.ts': "import { queryGeneric as ask } from 'convex/server'; " + source,
  })
  rejects(code)
})
const helperControls = [
  [
    'unused import initialization',
    'console.log(1); export function work() { return 1 }',
    'module_initialization',
  ],
  [
    'initializer invocation',
    'function make() { return 1 } const data = make(); export function work() { return data }',
    'module_initialization',
  ],
  [
    'registrar export',
    "import { queryGeneric as ask } from 'convex/server'; export { ask as work }",
    'authority_reference',
  ],
  ['helper default', 'export default function work() { return 1 }', 'import_binding'],
  [
    'helper side effect import',
    "import './effect'; export function work() { return 1 }",
    'import_binding',
  ],
]
it.each(helperControls)(
  'public row rejects %s through a complete helper closure',
  (_, source, code) => {
    prepare({
      'convex/functions.ts': helperDeclaration,
      'shared/helper.ts': source,
      'shared/effect.ts': 'export function dormant() { return 170 }',
    })
    rejects(code)
  },
)
it('public row rejects runtime helper cycles and runtime barrels', () => {
  prepare({
    'convex/functions.ts': helperDeclaration,
    'shared/helper.ts':
      "import { inner } from './inner'; export function work() { return inner() }",
    'shared/inner.ts': "import { work } from './helper'; export function inner() { return work() }",
  })
  rejects('runtime_cycle')
  fixture.write('shared/inner.ts', 'export function inner() { return 1 }')
  fixture.write('shared/helper.ts', "export { inner as work } from './inner'")
  rejects('import_binding')
})
it.each(['ignored', 'symlink', 'ambiguous'])('public row rejects %s helper identity', (mode) => {
  prepare({
    'convex/functions.ts': helperDeclaration,
    'shared/helper.ts': 'export function work() { return 1 }',
  })
  if (mode === 'ignored') {
    fixture.command('git', ['rm', '--cached', 'shared/helper.ts'])
    fixture.write('.gitignore', 'node_modules/\n.quality-output/\nshared/helper.ts\n')
  } else if (mode === 'symlink') {
    fixture.write('shared/actual.ts', 'export function work() { return 1 }')
    rmSync(join(fixture.directory, 'shared/helper.ts'))
    symlinkSync('actual.ts', join(fixture.directory, 'shared/helper.ts'))
  } else fixture.write('shared/helper.js', 'export function work() { return 1 }')
  rejects('source_identity')
  fixture.write('.gitignore', 'node_modules/\n.quality-output/\n')
})
it('public row rejects an effect in a transitive helper used only by an opaque body', () => {
  prepare({
    'convex/functions.ts': helperDeclaration,
    'shared/helper.ts':
      "import { inner } from './inner'; export function work() { return inner() }",
    'shared/inner.ts': 'console.log(170); export function inner() { return 1 }',
  })
  rejects('module_initialization')
})
const valueControls = [
  ['fake fields', 'const fake = { fields: {} }; const args = fake.fields;', 'args'],
  [
    'fake schema',
    'const fake = { tables: { items: { validator: { fields: {} } } } }; const args = fake.tables.items.validator.fields;',
    'args',
  ],
  [
    'validator capture',
    'const args = { label: v.string() }; function later() { return args }',
    'args',
  ],
  [
    'validator property poisoning',
    'const args = v.object({ label: v.string() }); function later() { args.fields.label = v.number() }',
    'args',
  ],
  [
    'field collision',
    'const fields = v.object({ label: v.string() }).fields; const args = { ...fields, label: v.number() };',
    'args',
  ],
]
it.each(valueControls)('public row rejects %s', (_, source, argument) => {
  prepare({
    'convex/functions.ts': `import { queryGeneric as ask } from 'convex/server'; import { v } from 'convex/values'; ${source} export const named = ask({ args: ${argument}, handler: () => null })`,
  })
  const result = publicRow()
  expect(result.status).toBe(1)
  expect(result.stderr).toMatch(/value_role|authority_reference/)
})
it('retains native unused exports and ordinary helper debt while exempting only exact declarations', () => {
  prepare({
    'convex/functions.ts': helperDeclaration,
    'shared/helper.ts': 'export function work() { return 1 } export function unused() { return 2 }',
  })
  const denied = rejects('shared/helper.ts|exports|unused')
  const native = JSON.parse(readFileSync(join(denied.evidence, 'dead-code.json'), 'utf8'))
  expect(native.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        file: 'convex/functions.ts',
        exports: expect.arrayContaining([expect.objectContaining({ name: 'named' })]),
      }),
      expect.objectContaining({
        file: 'shared/helper.ts',
        exports: expect.arrayContaining([expect.objectContaining({ name: 'unused' })]),
      }),
    ]),
  )
  const config = JSON.parse(readFileSync(join(denied.evidence, 'knip-config.json'), 'utf8'))
  expect(config.includeEntryExports).toBe(true)
  expect(config.entry).not.toContain('shared/helper.ts')
  fixture.write('index.ts', "import { unused } from './shared/helper'; console.log(unused())")
  const admitted = publicRow()
  expect(admitted.status, admitted.stderr).toBe(0)
  expect(admitted.stdout).toContain('dead-code: PASS')
})
it('admits both exact compiler profiles, separate Node/browser platforms and lexical shadowing', () => {
  prepare({
    'convex/functions.ts':
      "import { queryGeneric as ask } from 'convex/server'; export const named = ask({ args: {}, handler: (ask) => ask })",
    'convex/actions/task.ts':
      '"use node";\nimport { actionGeneric as act } from "convex/server"; export const task = act({ args: {}, handler: () => null })',
  })
  const stopped = publicRow()
  expect(stopped.status, stopped.stderr).toBe(0)
  const compiler = ts.parseConfigFileTextToJson(
    'convex/tsconfig.json',
    String(template['convex/tsconfig.json']),
  ).config
  delete compiler.compilerOptions.typeRoots
  fixture.write('convex/tsconfig.json', JSON.stringify(compiler))
  const incoming = publicRow()
  expect(incoming.status, incoming.stderr).toBe(0)
  const receipt = JSON.parse(readFileSync(join(incoming.evidence, 'convex-authority.json'), 'utf8'))
  expect(receipt.platforms).toEqual(['browser', 'node'])
  expect(receipt.claims).toEqual(
    expect.arrayContaining([
      { file: 'convex/functions.ts', name: 'named', kind: 'query' },
      { file: 'convex/actions/task.ts', name: 'task', kind: 'action' },
    ]),
  )
})
it.each([
  [
    'before worker publication',
    'convex-authority-execution.json',
    'shared/helper.ts',
    'export function work() { return 2 }',
  ],
  ['after authority and Knip', 'convex-authority.json', 'convex/jsconfig.json', '{}'],
])('public row rejects source or absence drift %s', (_, trigger, file, content) => {
  prepare({
    'convex/functions.ts': helperDeclaration,
    'shared/helper.ts': 'export function work() { return 1 }',
  })
  const result = fixture.run(
    `
    import { spawn } from 'node:child_process'; import { existsSync, writeFileSync } from 'node:fs';
    import { join } from 'node:path';
    const child = spawn(process.execPath, [${JSON.stringify(row)}], { env: process.env });
    let stdout = '', stderr = '', changed = false;
    child.stdout.on('data', data => stdout += data); child.stderr.on('data', data => stderr += data);
    const timer = setInterval(() => {
      if (!changed && existsSync(join(process.env.QUALITY_OUTPUT_DIR, ${JSON.stringify(trigger)}))) {
        changed = true; writeFileSync(${JSON.stringify(file)}, ${JSON.stringify(content)});
      }
    }, 5);
    const status = await new Promise((resolve, reject) => { child.once('close', resolve); child.once('error', reject) });
    clearInterval(timer); console.log(JSON.stringify({ status, stdout, stderr, changed }));`,
    { QUALITY_BASE_REF: 'HEAD' },
  )
  expect(result.status, result.stderr).toBe(0)
  const outcome = JSON.parse(result.stdout)
  expect(outcome.changed).toBe(true)
  expect(outcome.status).toBe(1)
  expect(outcome.stderr).toContain('source_changed')
})
