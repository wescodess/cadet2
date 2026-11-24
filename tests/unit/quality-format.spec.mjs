// @vitest-environment node
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve, sep } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => vi.restoreAllMocks())

it('format command rejects a real new unformatted file', () => {
  const checkout = process.cwd()
  const creations = ['mkdtempSync', 'mkdirSync', 'writeFileSync', 'copyFileSync'].map((name) => ({
    spy: vi.spyOn(fs, name),
    destination: name === 'copyFileSync' ? 1 : 0,
  }))
  const repo = fs.mkdtempSync(join(fs.realpathSync(tmpdir()), 'quality-format-'))
  let probe
  try {
    for (const path of ['app', 'scripts/quality/baselines'])
      fs.mkdirSync(join(repo, path), { recursive: true })
    for (const path of [
      '.prettierrc.json',
      '.prettierignore',
      'scripts/quality/baselines/format.json',
    ])
      fs.copyFileSync(join(checkout, path), join(repo, path))
    fs.writeFileSync(join(repo, '.gitignore'), '.quality-output/\n')
    const git = (...args) =>
      execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], { cwd: repo })
    git('init', '-q')
    git('add', '.')
    git(
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-qm',
      'fixture',
    )
    const objects = execFileSync('git', ['rev-parse', '--git-path', 'objects'], {
      cwd: checkout,
      encoding: 'utf8',
    }).trim()
    fs.writeFileSync(join(repo, '.git/objects/info/alternates'), resolve(checkout, objects) + '\n')
    probe = fs.mkdtempSync(join(repo, 'app/quality-format-probe-'))
    const file = join(probe, 'fixture.ts')
    fs.writeFileSync(file, 'export const fixture={a:1,b:2};\n')
    const result = spawnSync(
      process.execPath,
      [join(checkout, 'scripts/quality/format.mjs'), file],
      {
        cwd: repo,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, QUALITY_OUTPUT_DIR: join(repo, '.quality-output') },
      },
    )
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Format regression')
    expect(result.stderr).toContain(relative(repo, file).replaceAll('\\', '/'))
  } finally {
    if (probe) fs.rmSync(probe, { recursive: true, force: true })
    fs.rmSync(repo, { recursive: true, force: true })
  }
  for (const { spy, destination } of creations)
    for (const args of spy.mock.calls) {
      const target = resolve(String(args[destination]))
      expect(target, 'formatter fixtures must be outside the shared checkout').not.toBe(checkout)
      expect(target.startsWith(checkout + sep), target).toBe(false)
    }
})
