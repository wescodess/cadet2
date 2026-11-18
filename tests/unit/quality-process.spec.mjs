// @vitest-environment node
import { spawn, spawnSync } from 'node:child_process'
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
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
  it.each([null, ...rows])(
    'invokes all eight rows and propagates the failing row %s',
    (failure) => {
      const root = sandbox()
      writeFileSync(join(root, 'scripts/quality/baseline-policy.mjs'), 'process.exit(0)\n')
      writeFileSync(
        join(root, 'package.json'),
        JSON.stringify({
          scripts: Object.fromEntries(
            rows.map((row) => [row, `node -e "process.exit(${row === failure ? 1 : 0})"`]),
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
  it.each(['baseline failure', 'missing row', 'blank row', 'launch failure'])(
    'fails closed on %s',
    (kind) => {
      const root = sandbox()
      const env = environment(root)
      writeFileSync(
        join(root, 'scripts/quality/baseline-policy.mjs'),
        `process.exit(${kind === 'baseline failure' ? 1 : 0})\n`,
      )
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
    },
  )
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
