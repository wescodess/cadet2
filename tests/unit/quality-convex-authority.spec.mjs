// @vitest-environment node
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { authorityFixture } from '../support/quality-authority-fixture.mjs'

let shared, template
vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 })
beforeAll(() => {
  shared = authorityFixture({ 'index.ts': 'console.log(1)' })
  template = Object.fromEntries(
    ['convex/tsconfig.json', 'convex/_generated/server.js', 'package.json', 'tsconfig.json'].map(
      (file) => [file, readFileSync(join(shared.directory, file))],
    ),
  )
})
afterAll(() => shared?.remove())
const adapter = new URL('../../scripts/quality/convex-entries.mjs', import.meta.url).href
function control(sources) {
  for (const name of ['convex', 'shared'])
    rmSync(join(shared.directory, name), { recursive: true, force: true })
  for (const [file, text] of Object.entries(template)) shared.write(file, text)
  for (const [file, text] of Object.entries(sources)) shared.write(file, text)
  shared.track()
  return shared
}
function collect(fixture) {
  return fixture.run(`import { convexEntries } from ${JSON.stringify(adapter)};
    import { execFileSync } from 'node:child_process';
    const files = execFileSync('git', ['ls-files', '-z']).toString().split('\\0').filter(f => /\\.(?:ts|js)$/.test(f) && !f.includes('/_generated/'));
    try { console.log(JSON.stringify((await convexEntries(files)).entries)); }
    catch (error) { console.error(error.message); process.exitCode = 1; }`)
}
it('rejects the retained browser substitution before granting any exemption', () => {
  const fixture = control({
    'convex/browser/package.json': '{"type":"module","browser":{"convex/server":"./lookalike.ts"}}',
    'convex/browser/lookalike.ts': 'export const queryGeneric = value => value',
    'convex/browser/functions.ts':
      "import { queryGeneric as ask } from 'convex/server'; export const unused = ask({ args: {}, handler: () => null })",
  })
  const result = collect(fixture)
  expect(result.stderr).toContain('package_scope')
  expect(result.status).toBe(1)
})
it('rejects the retained mutable exported registration', () => {
  const fixture = control({
    'convex/functions.ts':
      "import { queryGeneric as ask } from 'convex/server'; export let unused: unknown = ask({ args: {}, handler: () => null }); unused = 170",
  })
  const result = collect(fixture)
  expect(result.stderr).toContain('mutable_binding')
  expect(result.status).toBe(1)
})
it('checks an unused helper import complete initialization', () => {
  const fixture = control({
    'convex/functions.ts':
      "import { queryGeneric as ask } from 'convex/server'; import { helper } from './helper'; export const unused = ask({ args: {}, handler: () => null })",
    'convex/helper.ts': 'console.log(170); export function helper() { return 1 }',
  })
  const result = collect(fixture)
  expect(result.stderr).toContain('module_initialization')
  expect(result.status).toBe(1)
})
it('admits immutable aliases, dormant shared helpers and lexical shadowing without helper exemptions', () => {
  const fixture = control({
    'convex/functions.ts':
      "import { queryGeneric as ask } from 'convex/server'; import { arbitrary as helper } from '../shared/worker'; const registered = ask({ args: {}, handler: (ask) => helper(ask) }); export { registered as named }",
    'shared/worker.ts':
      "const encoder = new TextEncoder(); const states = { available: new Set(['ready']) }; function work(value) { encoder.encode(String(value)); states.available.add('later'); return value } export { work as arbitrary }",
  })
  const result = collect(fixture)
  expect(result.status, result.stderr).toBe(0)
  expect(JSON.parse(result.stdout)).toEqual([
    { file: 'convex/functions.ts', name: 'named', kind: 'query' },
  ])
})
it('rejects protected shorthand capture inside a dormant body', () => {
  const fixture = control({
    'convex/functions.ts':
      "import { queryGeneric as ask } from 'convex/server'; const registered = ask({ args: {}, handler: () => null }); function later() { return { registered } } export { registered as named }",
  })
  const result = collect(fixture)
  expect(result.stderr).toContain('authority_reference')
  expect(result.status).toBe(1)
})
it('rejects a runtime helper cycle even when all helper bodies are dormant', () => {
  const fixture = control({
    'convex/functions.ts':
      "import { queryGeneric as ask } from 'convex/server'; import { helper } from '../shared/first'; export const named = ask({ args: {}, handler: () => helper() })",
    'shared/first.ts':
      "import { second } from './second'; export function helper() { return second() }",
    'shared/second.ts':
      "import { helper } from './first'; export function second() { return helper() }",
  })
  const result = collect(fixture)
  expect(result.stderr).toContain('runtime_cycle')
  expect(result.status).toBe(1)
})
it('admits canonical pagination/local/schema field maps through proven projections', () => {
  const fixture = control({
    'convex/schema.ts':
      "import { defineSchema, defineTable } from 'convex/server'; import { v } from 'convex/values'; export default defineSchema({ items: defineTable({ label: v.string() }).index('by_label', ['label']) })",
    'convex/fields.ts':
      "import { v } from 'convex/values'; export const fields = v.object({ search: v.string() }).fields",
    'convex/functions.ts':
      "import { queryGeneric as ask, paginationOptsValidator } from 'convex/server'; import schema from './schema'; import { fields } from './fields'; export const named = ask({ args: { ...paginationOptsValidator.fields, ...fields, ...schema.tables.items.validator.fields }, handler: () => null })",
  })
  const result = collect(fixture)
  expect(result.status, result.stderr).toBe(0)
  expect(JSON.parse(result.stdout)).toHaveLength(2)
  expect(JSON.parse(result.stdout)).toEqual(
    expect.arrayContaining([
      { file: 'convex/schema.ts', name: 'default', kind: 'schema' },
      { file: 'convex/functions.ts', name: 'named', kind: 'query' },
    ]),
  )
})
