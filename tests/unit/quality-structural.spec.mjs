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
  put('.git/objects/info/alternates', `${join(root, '.git/objects')}\n`)
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
