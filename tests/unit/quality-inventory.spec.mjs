// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const inventory = new URL('../../scripts/quality/package-inventory.mjs', import.meta.url).href
const temporary = []

function fixture(manifest) {
  const root = mkdtempSync(join(tmpdir(), 'quality-inventory-'))
  temporary.push(root)
  const modules = join(root, 'node_modules/.pnpm/fixture@1.0.0/node_modules')
  mkdirSync(join(modules, 'fixture'), { recursive: true })
  mkdirSync(join(modules, '.prisma/client'), { recursive: true })
  writeFileSync(join(modules, '.prisma/client/index.js'), 'export {}')
  if (manifest) writeFileSync(join(modules, 'fixture/package.json'), JSON.stringify(manifest))
  writeFileSync(
    join(root, 'pnpm-lock.yaml'),
    "lockfileVersion: '9.0'\npackages:\n  fixture@1.0.0: {}\nsnapshots:\n  fixture@1.0.0: {}\nimporters:\n  .: {}\n",
  )
  return spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { packageInventory } from ${JSON.stringify(inventory)}; console.log(JSON.stringify([...packageInventory().installed.keys()]))`,
    ],
    { cwd: root, encoding: 'utf8' },
  )
}

afterEach(() => {
  for (const root of temporary.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('installed package inventory', () => {
  it('excludes generated Prisma dot directories while retaining installed packages', () => {
    const result = fixture({ name: 'fixture', version: '1.0.0' })
    expect(result.status, result.stderr).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual(['fixture@1.0.0'])
  })

  it('fails when a real package directory has no manifest', () => {
    const result = fixture()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('ENOENT')
    expect(result.stderr).toContain('/fixture/package.json')
  })

  it('fails when an installed identity is outside the frozen lockfile', () => {
    const result = fixture({ name: 'fixture', version: '2.0.0' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Installed package absent from frozen lockfile: fixture@2.0.0')
  })
})
