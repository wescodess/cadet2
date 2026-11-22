// @vitest-environment node
import { spawn, spawnSync } from 'node:child_process'
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { clearTimeout } from 'node:timers'
import { afterEach, describe, expect, it } from 'vitest'

const roots = []
const rows = [
  'typecheck',
  'lint',
  'format:check',
  'secrets:check',
  'dependencies:check',
  'test:policy',
  'test:components',
  'build',
  'test:legacy-access',
]
function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'quality-process-'))
  roots.push(root)
  mkdirSync(join(root, 'scripts/quality'), { recursive: true })
  for (const name of ['common', 'verify'])
    cpSync(resolve(`scripts/quality/${name}.mjs`), join(root, `scripts/quality/${name}.mjs`))
  return root
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})
function environment(root) {
  const env = { ...process.env, QUALITY_OUTPUT_DIR: root }
  delete env.CI
  delete env.GITHUB_ACTIONS
  delete env.npm_lifecycle_event
  delete env.npm_config_user_agent
  return env
}

describe('public quality processes', () => {
  it.each([
    { failure: null, code: 0 },
    ...rows.flatMap((failure) => [1, 2, 127].map((code) => ({ failure, code }))),
  ])(
    'invokes all nine rows and propagates $failure exit $code',
    ({ failure, code }) => {
      const root = sandbox()
      writeFileSync(join(root, 'scripts/quality/baseline-policy.mjs'), 'process.exit(0)\n')
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({
          scripts: Object.fromEntries(
            rows.map((row) => [row, `node -e "process.exit(${row === failure ? code : 0})"`]),
          ),
        }),
      )
      const result = spawnSync(process.execPath, ['scripts/quality/verify.mjs'], {
        cwd: root,
        env: environment(root),
        encoding: 'utf8',
      })
      expect(result.status, result.stderr).toBe(failure ? 1 : 0)
      const record = JSON.parse(readFileSync(join(root, 'verification.json'), 'utf8'))
      expect(record.status).toBe(failure ? 'fail' : 'pass')
      expect(record.baselinePolicy.status).toBe('pass')
      expect(record.rows.map(({ row, status }) => ({ row, status }))).toEqual(
        rows.map((row) => ({ row, status: row === failure ? 'fail' : 'pass' })),
      )
      for (const row of rows) expect(result.stdout).toContain(`>>> ${row}\n`)
    },
    15000,
  )

  it.each(
    ['CI', 'GITHUB_ACTIONS'].flatMap((key) =>
      ['', 'true'].flatMap((value) =>
        ['--write-baseline', '--write', '--fix', '--update-baseline'].map((flag) => ({
          key,
          value,
          flag,
        })),
      ),
    ),
  )('refuses $flag when $key is present as "$value"', ({ key, value, flag }) => {
    const root = sandbox()
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '-e', "await import('./scripts/quality/common.mjs')", '--', flag],
      { cwd: root, env: { ...environment(root), [key]: value }, encoding: 'utf8' },
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('forbidden in CI')
  })
})

describe('aggregate failure and interruption evidence', () => {
  it.each([
    ...[1, 2, 127].map((code) => ({ kind: 'baseline failure', code })),
    ...['missing row', 'blank row', 'launch failure'].map((kind) => ({ kind, code: 0 })),
  ])('fails closed on $kind exit $code', ({ kind, code }) => {
    const root = sandbox()
    const env = environment(root)
    writeFileSync(join(root, 'scripts/quality/baseline-policy.mjs'), `process.exit(${code})\n`)
    const scripts = Object.fromEntries(rows.map((row) => [row, 'node -e "process.exit(0)"']))
    if (kind === 'missing row') delete scripts.typecheck
    if (kind === 'blank row') scripts.typecheck = '  '
    if (kind === 'launch failure') env.PATH = ''
    writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts }))
    const result = spawnSync(process.execPath, ['scripts/quality/verify.mjs'], {
      cwd: root,
      env,
      encoding: 'utf8',
    })
    expect(result.status).toBe(1)
    const record = JSON.parse(readFileSync(join(root, 'verification.json'), 'utf8'))
    expect(record.status).toBe('fail')
    expect(record.rows).toEqual(rows.map((row) => ({ row, status: 'not_run' })))
    expect(record.baselinePolicy.status).toBe(
      ['baseline failure', 'launch failure'].includes(kind) ? 'fail' : 'pass',
    )
  })
  it.each([
    ['SIGHUP', 129],
    ['SIGINT', 130],
    ['SIGTERM', 143],
  ])(
    'records %s and terminates the active process group',
    async (signal, code) => {
      const root = sandbox()
      writeFileSync(join(root, 'scripts/quality/baseline-policy.mjs'), 'process.exit(0)\n')
      writeFileSync(
        join(root, 'row.mjs'),
        "import { writeFileSync } from 'node:fs'; writeFileSync('child.pid', String(process.pid)); console.log('ROW_READY'); setInterval(() => {}, 1000)\n",
      )
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({ scripts: Object.fromEntries(rows.map((row) => [row, 'node row.mjs'])) }),
      )
      const child = spawn(process.execPath, ['scripts/quality/verify.mjs'], {
        cwd: root,
        env: environment(root),
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      let output = ''
      try {
        await new Promise((done, reject) => {
          const timer = setTimeout(() => reject(new Error('row did not start')), 5000)
          child.stdout.on('data', (data) => {
            output += data
            if (output.includes('ROW_READY')) {
              clearTimeout(timer)
              done()
            }
          })
          child.on('error', reject)
        })
        const closed = new Promise((done) => child.once('close', (status) => done(status)))
        child.kill(signal)
        expect(await closed).toBe(code)
        const record = JSON.parse(readFileSync(join(root, 'verification.json'), 'utf8'))
        expect(record.status).toBe('aborted')
        expect(record.signal).toBe(signal)
        expect(record.signalSource).toBe('signal')
        expect(record.rows[0].status).toBe('interrupted')
        expect(record.rows.slice(1)).toEqual(
          rows.slice(1).map((row) => ({ row, status: 'not_run' })),
        )
        const pid = Number(readFileSync(join(root, 'child.pid'), 'utf8'))
        expect(() => process.kill(pid, 0)).toThrow()
      } finally {
        child.kill('SIGKILL')
      }
    },
    10000,
  )
  it.each([129, 130, 143])('treats child exit %i as an interrupted aggregate', (code) => {
    const root = sandbox()
    writeFileSync(join(root, 'scripts/quality/baseline-policy.mjs'), `process.exit(${code})\n`)
    const result = spawnSync(process.execPath, ['scripts/quality/verify.mjs'], {
      cwd: root,
      env: environment(root),
      encoding: 'utf8',
    })
    expect(result.status).toBe(code)
    const record = JSON.parse(readFileSync(join(root, 'verification.json'), 'utf8'))
    expect(record.status).toBe('aborted')
    expect(record.baselinePolicy.status).toBe('interrupted')
    expect(record.rows).toEqual(rows.map((row) => ({ row, status: 'not_run' })))
  })
})

describe('local baseline measurement and CI flag boundaries', () => {
  it.each([false, true])(
    'refuses to baseline a dirty new file with an existing manifest: %s',
    (existing) => {
      const root = sandbox()
      const path = join(root, 'scripts/quality/baselines/types.json')
      mkdirSync(join(root, 'scripts/quality/baselines'), { recursive: true })
      mkdirSync(join(root, 'app'))
      writeFileSync(join(root, 'app/brand-new-quality-probe.ts'), 'const value: number = "dirty"\n')
      const original = '{"counts":{"nuxt.config.ts|TS2322":1}}\n'
      if (existing) writeFileSync(path, original)
      writeFileSync(join(root, 'git'), '#!/bin/sh\nprintf "nuxt.config.ts\\n"\n')
      chmodSync(join(root, 'git'), 0o755)
      const env = environment(root)
      env.PATH = root + ':' + env.PATH
      const result = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          "const { main, ratchet } = await import('./scripts/quality/common.mjs'); main(() => ratchet('types', { 'app/brand-new-quality-probe.ts|TS2322': 1 }))",
          '--',
          '--write-baseline',
        ],
        { cwd: root, env, encoding: 'utf8' },
      )
      expect(result.status).toBe(1)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe(
        'types: new files must be clean: app/brand-new-quality-probe.ts|TS2322\n',
      )
      if (existing) expect(readFileSync(path, 'utf8')).toBe(original)
      else expect(existsSync(path)).toBe(false)
    },
  )

  it('writes a stable sorted local count manifest without reading or changing the repository baseline', () => {
    const root = sandbox()
    mkdirSync(join(root, 'scripts/quality/baselines'), { recursive: true })
    writeFileSync(join(root, 'git'), '#!/bin/sh\nprintf "nuxt.config.ts\\nserver/example.ts\\n"\n')
    chmodSync(join(root, 'git'), 0o755)
    const env = environment(root)
    env.PATH = root + ':' + env.PATH
    const result = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "const { ratchet } = await import('./scripts/quality/common.mjs'); ratchet('types', { 'server/example.ts|TS7006': 2, 'nuxt.config.ts|TS2322': 1 })",
        '--',
        '--write-baseline',
      ],
      { cwd: root, env, encoding: 'utf8' },
    )
    expect(result.status, result.stderr).toBe(0)
    expect(readFileSync(join(root, 'scripts/quality/baselines/types.json'), 'utf8')).toBe(
      '{\n  "date": "2026-11-17",\n  "commit": "fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3",\n  "counts": {\n    "nuxt.config.ts|TS2322": 1,\n    "server/example.ts|TS7006": 2\n  }\n}\n',
    )
  })
  it.each(['prefix--fix', '--writer', '--fixed', '--updated', '--check'])(
    'accepts a nonwriter argument %s in CI',
    (arg) => {
      const root = sandbox()
      const result = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', "await import('./scripts/quality/common.mjs')", '--', arg],
        { cwd: root, env: { ...environment(root), CI: '' }, encoding: 'utf8' },
      )
      expect(result.status, result.stderr).toBe(0)
    },
  )
  it.each(['--write=1', '--fix=1', '--update-baseline=1'])(
    'refuses writer assignment %s in CI',
    (arg) => {
      const root = sandbox()
      const result = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', "await import('./scripts/quality/common.mjs')", '--', arg],
        { cwd: root, env: { ...environment(root), CI: '' }, encoding: 'utf8' },
      )
      expect(result.status).toBe(1)
    },
  )
})

function retainedOutput(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name)
    return entry.isDirectory() ? retainedOutput(file) : [readFileSync(file, 'utf8')]
  })
}

describe('native secrets row token validation', () => {
  it.each([' ', '\n', '\r', '\t', '\u001f', '\u007f', '\u0100'])(
    'rejects malformed token separator %j without disclosing either part',
    (separator) => {
      const root = sandbox()
      const parts = ['fixture-native-prefix', 'fixture-native-suffix']
      const token = parts.join(separator)
      const env = { ...environment(root), GITHUB_TOKEN: token }
      expect(spawnSync('git', ['init', '--quiet'], { cwd: root, env }).status).toBe(0)
      const preload = join(root, 'preflight.mjs')
      writeFileSync(
        preload,
        "import { writeFileSync } from 'node:fs'; globalThis.fetch = async () => { writeFileSync(new URL('./fetch-called', import.meta.url), 'called'); throw new Error('unexpected preflight fetch') }\n",
      )
      const result = spawnSync(
        process.execPath,
        ['--import', preload, resolve('scripts/quality/secrets.mjs')],
        { cwd: root, env, encoding: 'utf8' },
      )
      expect(result.status).toBe(1)
      expect(existsSync(join(root, 'fetch-called'))).toBe(false)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('Invalid GITHUB_TOKEN characters\n')
      const retained = retainedOutput(root).join(' ')
      for (const secret of [token, ...parts]) {
        expect(result.stdout).not.toContain(secret)
        expect(result.stderr).not.toContain(secret)
        expect(retained).not.toContain(secret)
      }
    },
  )
})
