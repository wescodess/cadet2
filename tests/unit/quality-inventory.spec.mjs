// @vitest-environment node
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const inventory = new URL('../../scripts/quality/package-inventory.mjs', import.meta.url).href
const temporary = []

function fixture(manifest, options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'quality-inventory-'))
  temporary.push(root)
  const modules = join(root, 'node_modules/.pnpm/fixture@1.0.0/node_modules')
  mkdirSync(join(modules, 'fixture'), { recursive: true })
  mkdirSync(join(modules, '.prisma/client'), { recursive: true })
  writeFileSync(join(modules, '.prisma/client/index.js'), 'export {}')
  if (options.empty) rmSync(join(root, 'node_modules/.pnpm'), { recursive: true, force: true })
  if (options.empty) mkdirSync(join(root, 'node_modules/.pnpm'), { recursive: true })
  if (options.links) {
    mkdirSync(join(root, 'node_modules/.pnpm/node_modules/other'), { recursive: true })
    writeFileSync(join(root, 'node_modules/.pnpm/not-directory'), 'fixture')
    writeFileSync(join(modules, 'not-directory'), 'fixture')
  }
  if (manifest && !options.empty)
    writeFileSync(join(modules, 'fixture/package.json'), JSON.stringify(manifest))
  writeFileSync(
    join(root, 'pnpm-lock.yaml'),
    "lockfileVersion: '9.0'\npackages:\n  fixture@1.0.0: {}\nsnapshots:\n  fixture@1.0.0: {}\nimporters:\n  .: {}\n",
  )
  if (options.scoped) {
    mkdirSync(join(modules, '@scope/pkg'), { recursive: true })
    writeFileSync(
      join(modules, '@scope/pkg/package.json'),
      JSON.stringify({ name: '@scope/pkg', version: '1.0.0' }),
    )
  }
  if (options.lock) writeFileSync(join(root, 'pnpm-lock.yaml'), options.lock)
  writeFileSync(
    join(root, 'node_modules/.pnpm/lock.yaml'),
    readFileSync(join(root, 'pnpm-lock.yaml')),
  )
  if (manifest?.name === 'installed-alias-target')
    renameSync(
      join(root, 'node_modules/.pnpm/fixture@1.0.0'),
      join(root, 'node_modules/.pnpm/installed-alias-target@2.0.0'),
    )
  if (options.orphan) {
    const orphan = join(root, 'node_modules/.pnpm/orphan@2.0.0/node_modules/orphan')
    mkdirSync(orphan, { recursive: true })
    writeFileSync(
      join(orphan, 'package.json'),
      JSON.stringify({ name: 'orphan', version: '2.0.0' }),
    )
  }
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

  it('uses the manifest identity for an installed alias target', () => {
    const result = fixture(
      { name: 'installed-alias-target', version: '2.0.0' },
      {
        lock: "lockfileVersion: '9.0'\npackages:\n  installed-alias-target@2.0.0: {}\nsnapshots:\n  installed-alias-target@2.0.0: {}\nimporters:\n  .:\n    dependencies:\n      installed-alias:\n        specifier: npm:installed-alias-target@2.0.0\n        version: installed-alias-target@2.0.0\n",
      },
    )
    expect(result.status, result.stderr).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual(['installed-alias-target@2.0.0'])
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

describe('frozen dependency graph and license projection', () => {
  it('walks direct, dev, optional, alias, peer and cyclic snapshot references exactly once', async () => {
    const { auditPackages } = await import('../../scripts/quality/package-inventory.mjs')
    const lock = {
      importers: {
        '.': {
          dependencies: { app: { version: '1.0.0(peer@1.0.0)' }, alias: { version: 'real@2.0.0' } },
          devDependencies: { dev: { version: '1.0.0' } },
          optionalDependencies: { optional: { version: '1.0.0' } },
        },
        'packages/child': { dependencies: { app: { version: '1.0.0(peer@1.0.0)' } } },
      },
      snapshots: {
        'app@1.0.0(peer@1.0.0)': {
          dependencies: { shared: '1.0.0' },
          optionalDependencies: { native: '1.0.0' },
        },
        'real@2.0.0': {},
        'dev@1.0.0': {},
        'optional@1.0.0': {},
        'shared@1.0.0': { dependencies: { shared: '1.0.0' } },
        'native@1.0.0': {},
      },
    }
    expect(auditPackages(lock)).toEqual([
      '.@0.0.0',
      'app@1.0.0',
      'dev@1.0.0',
      'native@1.0.0',
      'optional@1.0.0',
      'packages__child@0.0.0',
      'real@2.0.0',
      'shared@1.0.0',
    ])
    expect(() =>
      auditPackages({
        importers: { '.': { dependencies: { missing: { version: '1.0.0' } } } },
        snapshots: {},
      }),
    ).toThrow(/Missing audit snapshot/)
  })
  it('projects every installed package with platform constraints removed and pinned versions intact', async () => {
    const { readFileSync } = await import('node:fs')
    const { parse } = await import('yaml')
    const { licenseScanDirectory } = await import('../../scripts/quality/package-inventory.mjs')
    const root = mkdtempSync(join(tmpdir(), 'quality-licenses-'))
    temporary.push(root)
    const directory = licenseScanDirectory(
      {
        lock: {
          settings: { autoInstallPeers: true },
          packages: {
            'first@1.0.0': {
              resolution: { integrity: 'sha512-fixture' },
              os: ['darwin'],
              cpu: ['arm64'],
              libc: ['glibc'],
            },
            '@scope/second@2.0.0': { license: 'MIT' },
          },
        },
        installed: new Map([
          ['first@1.0.0', { name: 'first', version: '1.0.0' }],
          ['@scope/second@2.0.0', { name: '@scope/second', version: '2.0.0' }],
        ]),
      },
      root,
    )
    expect(parse(readFileSync(join(directory, 'pnpm-lock.yaml'), 'utf8'))).toEqual({
      lockfileVersion: '9.0',
      settings: { autoInstallPeers: true },
      importers: {
        'package-0': { dependencies: { first: { specifier: '1.0.0', version: '1.0.0' } } },
        'package-1': {
          dependencies: { '@scope/second': { specifier: '2.0.0', version: '2.0.0' } },
        },
      },
      packages: {
        'first@1.0.0': { resolution: { integrity: 'sha512-fixture' } },
        '@scope/second@2.0.0': { license: 'MIT' },
      },
      snapshots: { 'first@1.0.0': {}, '@scope/second@2.0.0': {} },
    })
    expect(JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))).toEqual({
      name: 'quality-license-inventory',
      private: true,
    })
  })
})

describe('installed inventory failure boundaries', () => {
  it.each([
    "lockfileVersion: '8.0'\npackages: {}\nsnapshots: {}\nimporters: {}\n",
    "lockfileVersion: '9.0'\npackages: {}\nimporters: {}\n",
    "lockfileVersion: '9.0'\npackages: {}\nsnapshots: {}\n",
  ])('rejects unsupported lockfile shape', (lock) => {
    const result = fixture({ name: 'fixture', version: '1.0.0' }, { lock })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Unsupported package inventory lockfile')
  })
  it('rejects an empty installed population', () => {
    const result = fixture(null, { empty: true })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Empty installed package inventory')
  })
  it('ignores files and shared pnpm symlink storage directories', () => {
    const result = fixture({ name: 'fixture', version: '1.0.0' }, { links: true })
    expect(result.status, result.stderr).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual(['fixture@1.0.0'])
  })
})

describe('pnpm package identity edge cases', () => {
  it('retains scoped packages in the physical installation', () => {
    const result = fixture(
      { name: 'fixture', version: '1.0.0' },
      {
        scoped: true,
        lock: "lockfileVersion: '9.0'\npackages:\n  fixture@1.0.0: {}\n  '@scope/pkg@1.0.0': {}\nsnapshots: {}\nimporters: {}\n",
      },
    )
    expect(result.status, result.stderr).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual(['@scope/pkg@1.0.0', 'fixture@1.0.0'])
  })
  it('matches the observed pnpm audit population when alias identities collide', async () => {
    const { auditPackages } = await import('../../scripts/quality/package-inventory.mjs')
    expect(
      auditPackages({
        importers: {
          '.': {
            dependencies: {
              newer: { version: 'semver@7.0.0' },
              older: { version: 'semver@5.0.0' },
            },
          },
        },
        snapshots: { 'semver@7.0.0': {}, 'semver@5.0.0': {} },
      }),
    ).toEqual(['.@0.0.0', 'semver@5.0.0'])
  })
})

it('ignores orphaned directories absent from the installed lock after dependency changes', () => {
  const result = fixture({ name: 'fixture', version: '1.0.0' }, { orphan: true })
  expect(result.status, result.stderr).toBe(0)
  expect(JSON.parse(result.stdout)).toEqual(['fixture@1.0.0'])
})
