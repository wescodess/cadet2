// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'

vi.setConfig({ testTimeout: 30000 })

const root = resolve('.')
const directories = []
function fixture(files) {
  const directory = mkdtempSync(join(tmpdir(), 'structural-'))
  directories.push(directory)
  const put = (file, content) => {
    mkdirSync(dirname(join(directory, file)), { recursive: true })
    writeFileSync(join(directory, file), content)
  }
  put('.gitignore', 'node_modules/\n.quality-output/\n')
  put('package.json', '{"name":"fixture","type":"module","private":true}')
  put(
    'scripts/quality/baselines/boundaries.json',
    JSON.stringify({
      date: '2026-11-21',
      commit: '1b335bface0686641850ea8cd23aa5c5dea4e45c',
      counts: {},
    }),
  )
  put(
    'scripts/quality/baselines/dead-code.json',
    JSON.stringify({
      date: '2026-11-21',
      commit: '1b335bface0686641850ea8cd23aa5c5dea4e45c',
      counts: {},
    }),
  )
  put(
    'scripts/quality/baselines/duplication.json',
    JSON.stringify({
      date: '2026-11-21',
      commit: '1b335bface0686641850ea8cd23aa5c5dea4e45c',
      counts: {},
    }),
  )
  for (const [file, content] of Object.entries(files)) put(file, content)
  symlinkSync(join(root, 'node_modules'), join(directory, 'node_modules'), 'dir')
  for (const args of [
    ['init', '-q'],
    ['add', '.'],
    [
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-qm',
      'fixture',
    ],
  ]) {
    const result = spawnSync('git', args, { cwd: directory, encoding: 'utf8' })
    expect(result.status, result.stderr).toBe(0)
  }
  const objects = spawnSync('git', ['rev-parse', '--git-path', 'objects'], {
    cwd: root,
    encoding: 'utf8',
  })
  expect(objects.status, objects.stderr).toBe(0)
  put('.git/objects/info/alternates', `${resolve(root, objects.stdout.trim())}\n`)
  return { directory, put }
}
function row(name, directory, extra = {}, args = []) {
  mkdirSync(join(directory, '.quality-output'), { recursive: true })
  const evidence = mkdtempSync(join(directory, '.quality-output/run-'))
  const result = spawnSync(process.execPath, [join(root, `scripts/quality/${name}.mjs`), ...args], {
    cwd: directory,
    encoding: 'utf8',
    env: { ...process.env, QUALITY_BASE_REF: 'HEAD', QUALITY_OUTPUT_DIR: evidence, ...extra },
    maxBuffer: 16 * 1024 * 1024,
  })
  return { status: result.status, output: result.stdout + result.stderr }
}
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
})

it('rejects a cycle at the boundaries command and admits an acyclic control', () => {
  const { directory, put } = fixture({
    'shared/a.ts': "import { b } from './b'; export const a = () => b()",
    'shared/b.ts': "import { a } from './a'; export const b = () => a()",
  })
  const denied = row('boundaries', directory)
  expect(denied.status).toBe(1)
  expect(denied.output).toMatch(/boundaries regression.*|boundaries: new files must be clean/s)
  put('shared/b.ts', 'export const b = () => 1')
  const admitted = row('boundaries', directory)
  expect(admitted.output).toContain('boundaries: PASS')
  expect(admitted.status).toBe(0)
})

it('rejects private imports, including an index in a private directory, and admits its owner', () => {
  const { directory, put } = fixture({
    'shared/consumer.ts': "import { secret } from './feature/private/index'; console.log(secret)",
    'shared/feature/private/index.ts': 'export const secret = 1',
  })
  const denied = row('boundaries', directory)
  expect(denied.output).toMatch(/boundaries regression|boundaries: new files must be clean/)
  expect(denied.status).toBe(1)
  put('shared/consumer.ts', '')
  put('shared/feature/index.ts', "import { secret } from './private/index'; console.log(secret)")
  expect(row('boundaries', directory).status).toBe(0)
})

it('rejects an unused file and admits a reachable file at the dead-code command', () => {
  const { directory, put } = fixture({
    'shared/unused.ts': 'export const value = 1',
    'index.ts': 'console.log(1)',
  })
  const denied = row('dead-code', directory)
  expect(denied.output).toMatch(/dead-code regression|dead-code: new files must be clean/)
  expect(denied.status).toBe(1)
  put('index.ts', "import { value } from './shared/unused'; console.log(value)")
  expect(row('dead-code', directory).status).toBe(0)
})

it('keeps tracked source in Knip when gitignored and excludes ignored untracked source', () => {
  const { directory, put } = fixture({
    'shared/ignored/value.ts': 'export const value = 1',
    'index.ts': 'console.log(1)',
  })
  expect(row('dead-code', directory).status).toBe(1)
  put('.gitignore', 'node_modules/\n.quality-output/\nshared/ignored/\n')
  const denied = row('dead-code', directory)
  expect(denied.output).toContain('shared/ignored/value.ts')
  expect(denied.status).toBe(1)
  put('index.ts', "import { value } from './shared/ignored/value'; console.log(value)")
  put('shared/ignored/untracked.ts', 'export const untracked = 2')
  expect(row('dead-code', directory).status).toBe(0)
  put('shared/literal[route].ts', 'export const unused = 3')
  const literal = row('dead-code', directory)
  expect(literal.output).toContain('shared/literal[route].ts')
  expect(literal.status).toBe(1)
})

it('rejects an ignored untracked framework entry as a consumer of tracked source', () => {
  const { directory, put } = fixture({
    'package.json': '{"name":"fixture","type":"module","dependencies":{"nuxt":"4.3.1"}}',
    'index.ts': "import { defineNuxtConfig } from 'nuxt/config'; console.log(defineNuxtConfig({}))",
    'shared/helper.ts': 'export const value = 7',
  })
  put('.gitignore', 'node_modules/\n.quality-output/\nserver/api/phantom.get.ts\n')
  put(
    'server/api/phantom.get.ts',
    "import { value } from '../../shared/helper'; export default () => value",
  )
  const denied = row('dead-code', directory)
  expect(denied.output).toMatch(/outside.*source inventory/)
  expect(denied.status).toBe(1)
  rmSync(join(directory, 'server/api/phantom.get.ts'))
  put(
    'index.ts',
    "import { defineNuxtConfig } from 'nuxt/config'; import { value } from './shared/helper'; console.log(defineNuxtConfig({}), value)",
  )
  expect(row('dead-code', directory).status).toBe(0)
})

it('rejects an unused export and admits the same exported value when consumed', () => {
  const { directory, put } = fixture({
    'index.ts': "import { used } from './shared/value'; console.log(used)",
    'shared/value.ts': 'export const used = 1; export const unused = 2',
  })
  const denied = row('dead-code', directory)
  expect(denied.output).toMatch(/dead-code.*(?:exports|new files must be clean)/s)
  expect(denied.status).toBe(1)
  put('index.ts', "import { used, unused } from './shared/value'; console.log(used, unused)")
  expect(row('dead-code', directory).status).toBe(0)
})

for (const tag of ['public', 'beta', 'alias']) {
  it(
    'rejects Knip suppression @' + tag + ' and admits source strings and a consumed export',
    () => {
      const { directory, put } = fixture({
        'index.ts': "import { used } from './shared/value'; console.log(used)",
        'shared/value.ts': `export const used = 1\n/** @${tag} */\nexport const unused = 2`,
      })
      const denied = row('dead-code', directory)
      expect(denied.output).toContain('Knip suppression')
      expect(denied.status).toBe(1)
      put('shared/value.ts', `export const used = '/** @${tag} */'\nexport const unused = 2`)
      put('index.ts', "import { used, unused } from './shared/value'; console.log(used, unused)")
      expect(row('dead-code', directory).status).toBe(0)
      put('shared/value.ts', `export const used = 1\n// @${tag}\nexport const unused = 2`)
      expect(row('dead-code', directory).output).toContain('Knip suppression')
    },
  )
}

for (const location of ['shared', 'convex', 'convex/helpers']) {
  it('reports ordinary unused helpers under ' + location + ' and admits an actual consumer', () => {
    const file = `${location}/helper.ts`
    const { directory, put } = fixture({
      'package.json': '{"name":"fixture","type":"module","dependencies":{"convex":"1.32.0"}}',
      'index.ts': "import { v } from 'convex/values'; console.log(v.string())",
      [file]: 'export const value = 7',
    })
    const denied = row('dead-code', directory)
    expect(denied.output).toContain(`${file}|files|${file}`)
    expect(denied.status).toBe(1)
    put('index.ts', `import { value } from './${file}'; console.log(value)`)
    put(file, "import { v } from 'convex/values'; export const value = v.string()")
    expect(row('dead-code', directory).status).toBe(0)
  })
}

it('admits registered Convex exports and framework defaults but checks their unrelated exports', () => {
  const registrations = [
    'query',
    'mutation',
    'action',
    'internalQuery',
    'internalMutation',
    'internalAction',
    'httpAction',
  ]
  const { directory, put } = fixture({
    'package.json': '{"name":"fixture","type":"module","dependencies":{"convex":"1.32.0"}}',
    'index.ts': 'console.log(1)',
    'convex/_generated/server.ts': `export { ${registrations.map((r) => `${r}Generic as ${r}`).join(', ')} } from 'convex/server'`,
    'convex/functions.ts': `import { ${registrations.join(', ')} } from './_generated/server'\n${registrations.map((r, i) => `export const entry${i} = ${r}(${r === 'httpAction' ? 'async () => new Response("control")' : '{ args: {}, handler: () => null }'})`).join('\n')}\nexport const unused = 1`,
    'convex/schema.ts':
      "import { defineSchema } from 'convex/server'; export default defineSchema({})",
    'convex/auth.config.ts': 'export default { providers: [] }',
    'convex/convex.config.ts':
      "import { defineApp } from 'convex/server'; export default defineApp()",
    'convex/http.ts':
      "import { httpRouter } from 'convex/server'; const http = httpRouter(); export default http",
    'convex/crons.ts':
      "import { cronJobs } from 'convex/server'; const crons = cronJobs(); export default crons",
  })
  const denied = row('dead-code', directory)
  expect(denied.output).toContain('convex/functions.ts|exports|unused')
  expect(denied.status).toBe(1)
  put('index.ts', "import { unused } from './convex/functions'; console.log(unused)")
  const admitted = row('dead-code', directory)
  expect(admitted.output).toContain('dead-code: PASS')
  expect(admitted.status).toBe(0)
  put('convex/auth.config.ts', 'export default { providers: [] }; export const unrelated = 1')
  expect(row('dead-code', directory).output).toContain('convex/auth.config.ts|exports|unrelated')
})

it('rejects an unused dependency and admits an actual dependency import', () => {
  const { directory, put } = fixture({
    'index.ts': 'console.log(1)',
    'package.json': '{"name":"fixture","type":"module","dependencies":{"zod":"3.25.76"}}',
  })
  const denied = row('dead-code', directory)
  expect(denied.output).toContain('package.json|dependencies|zod')
  expect(denied.status).toBe(1)
  put('index.ts', "import { z } from 'zod'; console.log(z.string())")
  expect(row('dead-code', directory).status).toBe(0)
})

it('rejects duplication involving a changed file and admits original code', () => {
  const block = Array.from(
    { length: 20 },
    (_, index) => `console.log('distinct operation ${index}', ${index} * 7)`,
  ).join('\n')
  const { directory, put } = fixture({ 'shared/original.ts': block })
  put('shared/copy.ts', block)
  const denied = row('duplication', directory)
  expect(denied.output).toMatch(/duplication regression|duplication: new files must be clean/)
  expect(denied.status).toBe(1)
  put('shared/copy.ts', 'console.log("unique")')
  expect(row('duplication', directory).status).toBe(0)
})

it('rejects jscpd directives in comments and strings and admits unsuppressed unique source', () => {
  const marker = (kind) => 'jscpd' + ':ignore-' + kind
  const block = Array.from(
    { length: 24 },
    (_, index) => `console.log('directive operation ${index}', ${index} * 29)`,
  ).join('\n')
  const { directory, put } = fixture({ 'shared/original.ts': block })
  put('shared/copy.ts', `// ${marker('start')}\n${block}\n// ${marker('end')}`)
  const denied = row('duplication', directory)
  expect(denied.output).toContain('jscpd suppression')
  expect(denied.status).toBe(1)
  put('shared/copy.ts', `const marker = '${marker('start')}'\n${block}\n'${marker('end')}'`)
  expect(row('duplication', directory).output).toContain('jscpd suppression')
  put('shared/copy.ts', 'console.log("unique unsuppressed control")')
  expect(row('duplication', directory).status).toBe(0)
})

it('enforces module entry points and resolves Nuxt aliases before checking server imports', () => {
  const { directory, put } = fixture({
    'app/modules/feature/detail.ts': 'export const value = 1',
    'app/modules/feature/index.ts': "export { value } from './detail'",
    'app/consumer.ts': "import { value } from '~/modules/feature/detail'; console.log(value)",
  })
  expect(row('boundaries', directory).status).toBe(1)
  put('app/consumer.ts', "import { value } from '~/modules/feature'; console.log(value)")
  const admitted = row('boundaries', directory)
  expect(admitted.output).toContain('boundaries: PASS')
  expect(admitted.status).toBe(0)
  put('server/secret.ts', 'export const secret = 1')
  put('app/consumer.ts', "import { secret } from '~~/server/secret'; console.log(secret)")
  const denied = row('boundaries', directory)
  expect(denied.output).toContain('client-entry')
  expect(denied.status).toBe(1)
})

it('requires paid-down inherited dead-code allowances to be lowered', () => {
  const file = 'shared/types/workspace-summary.ts'
  const { directory, put } = fixture({
    [file]: 'export const value = 1',
    'index.ts': 'console.log(1)',
  })
  const baseline = (counts) =>
    put(
      'scripts/quality/baselines/dead-code.json',
      JSON.stringify({
        date: '2026-11-21',
        commit: '1b335bface0686641850ea8cd23aa5c5dea4e45c',
        counts,
      }),
    )
  baseline({ [`${file}|files|${file}`]: 1 })
  expect(row('dead-code', directory).status).toBe(0)
  put('index.ts', `import { value } from './${file}'; console.log(value)`)
  const denied = row('dead-code', directory)
  expect(denied.output).toContain('lower allowance to 0')
  expect(denied.status).toBe(1)
  baseline({})
  expect(row('dead-code', directory).status).toBe(0)
})

it('does not charge unchanged duplication and detects changed copies across directories', () => {
  const block = Array.from(
    { length: 20 },
    (_, index) => `console.log('another operation ${index}', ${index} + 42)`,
  ).join('\n')
  const { directory, put } = fixture({ 'shared/first.ts': block, 'server/second.ts': block })
  expect(row('duplication', directory).status).toBe(0)
  put('server/new.ts', block)
  const denied = row('duplication', directory)
  expect(denied.output).toMatch(/duplication regression|duplication: new files must be clean/)
  expect(denied.status).toBe(1)
})

for (const name of ['boundaries', 'dead-code', 'duplication']) {
  it('refuses ' + name + ' baseline writers in CI', () => {
    const { directory } = fixture({ 'index.ts': 'console.log(1)' })
    const result = spawnSync(
      process.execPath,
      [join(root, `scripts/quality/${name}.mjs`), '--write-baseline'],
      { cwd: directory, encoding: 'utf8', env: { ...process.env, CI: '' } },
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('writer flags are forbidden in CI')
  })
}

it('rejects a new file even if a local dead-code allowance was added', () => {
  const file = 'shared/new-debt.ts'
  const { directory, put } = fixture({
    [file]: 'export const value = 1',
    'index.ts': 'console.log(1)',
  })
  put(
    'scripts/quality/baselines/dead-code.json',
    JSON.stringify({
      date: '2026-11-21',
      commit: '1b335bface0686641850ea8cd23aa5c5dea4e45c',
      counts: { [`${file}|files|${file}`]: 1 },
    }),
  )
  const denied = row('dead-code', directory)
  expect(denied.output).toContain('new files must be clean')
  expect(denied.status).toBe(1)
})

it('requires removed duplication debt to lower both affected file allowances', () => {
  const block = Array.from(
    { length: 20 },
    (_, index) => `console.log('inherited operation ${index}', ${index} * 13)`,
  ).join('\n')
  const file = 'shared/types/workspace-summary.ts'
  const { directory, put } = fixture({
    [file]: block,
    'shared/types/recommendation-run-comparison.ts': block,
  })
  expect(
    row('duplication', directory, { CI: undefined, GITHUB_ACTIONS: undefined }, [
      '--write-baseline',
    ]).status,
  ).toBe(0)
  expect(row('duplication', directory).status).toBe(0)
  put(file, 'console.log("debt removed")')
  const denied = row('duplication', directory)
  expect(denied.output).toContain('lower allowance to 0')
  expect(denied.status).toBe(1)
  put(
    'scripts/quality/baselines/duplication.json',
    JSON.stringify({
      date: '2026-11-21',
      commit: '1b335bface0686641850ea8cd23aa5c5dea4e45c',
      counts: {},
    }),
  )
  expect(row('duplication', directory).status).toBe(0)
})

it('retires both clone allowances on an archive rename and rejects their later restoration', () => {
  const block = Array.from(
    { length: 24 },
    (_, index) => `console.log('archive operation ${index}', ${index} * 19)`,
  ).join('\n')
  const file = 'shared/types/workspace-summary.ts'
  const { directory, put } = fixture({
    [file]: block,
    'shared/types/recommendation-run-comparison.ts': block,
  })
  expect(
    row('duplication', directory, { CI: undefined, GITHUB_ACTIONS: undefined }, [
      '--write-baseline',
    ]).status,
  ).toBe(0)
  const move = spawnSync('git', ['mv', file, 'shared/types/archive.txt'], { cwd: directory })
  expect(move.status).toBe(0)
  const denied = row('duplication', directory)
  expect(denied.output).toContain('lower allowance to 0')
  expect(denied.status).toBe(1)
  put(
    'scripts/quality/baselines/duplication.json',
    JSON.stringify({
      date: '2026-11-21',
      commit: '1b335bface0686641850ea8cd23aa5c5dea4e45c',
      counts: {},
    }),
  )
  expect(row('duplication', directory).status).toBe(0)
  put(file, block)
  expect(row('duplication', directory).status).toBe(1)
  rmSync(join(directory, file))
  expect(row('duplication', directory).status).toBe(0)
})
