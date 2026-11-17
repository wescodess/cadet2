import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { parse, stringify } from 'yaml'

function identity(key) {
  return key.split('(')[0]
}

function directories(path) {
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(path, entry.name))
}

function packageDirectories(modules) {
  return directories(modules).flatMap((directory) =>
    basename(directory).startsWith('@') ? directories(directory) : [directory],
  )
}

export function packageInventory() {
  const lock = parse(readFileSync('pnpm-lock.yaml', 'utf8'))
  if (lock.lockfileVersion !== '9.0' || !lock.packages || !lock.snapshots || !lock.importers)
    throw new Error('Unsupported package inventory lockfile')
  const installed = new Map()
  for (const directory of directories(resolve('node_modules/.pnpm'))) {
    if (basename(directory) === 'node_modules') continue
    for (const path of packageDirectories(join(directory, 'node_modules'))) {
      const manifest = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8'))
      const id = `${manifest.name}@${manifest.version}`
      if (!Object.hasOwn(lock.packages, id))
        throw new Error(`Installed package absent from frozen lockfile: ${id}`)
      installed.set(id, manifest)
    }
  }
  if (!installed.size) throw new Error('Empty installed package inventory')
  return { lock, installed }
}

export function licenseScanDirectory({ lock, installed }, parent) {
  const directory = mkdtempSync(join(parent, 'license-inventory-'))
  const flat = {
    lockfileVersion: '9.0',
    settings: lock.settings,
    importers: {},
    packages: {},
    snapshots: {},
  }
  for (const [id, manifest] of installed) {
    const metadata = { ...lock.packages[id] }
    delete metadata.os
    delete metadata.cpu
    delete metadata.libc
    flat.packages[id] = metadata
    flat.snapshots[id] = {}
    flat.importers[`package-${Object.keys(flat.importers).length}`] = {
      dependencies: {
        [manifest.name]: { specifier: manifest.version, version: manifest.version },
      },
    }
  }
  writeFileSync(
    join(directory, 'package.json'),
    '{"name":"quality-license-inventory","private":true}',
  )
  writeFileSync(join(directory, 'pnpm-lock.yaml'), stringify(flat))
  return resolve(directory)
}

export function auditPackages(lock) {
  const visited = new Set()
  function walk(references) {
    const nodes = {}
    const pending = []
    for (const [alias, reference] of Object.entries(references)) {
      const key = identity(reference).includes('@') ? reference : `${alias}@${reference}`
      if (visited.has(key)) continue
      visited.add(key)
      const snapshot = lock.snapshots[key]
      if (!snapshot) throw new Error(`Missing audit snapshot: ${key}`)
      pending.push([key, snapshot])
    }
    for (const [key, snapshot] of pending) {
      const id = identity(key)
      const name = id.slice(0, id.lastIndexOf('@'))
      nodes[name] = {
        id,
        children: walk({ ...snapshot.dependencies, ...snapshot.optionalDependencies }),
      }
    }
    return nodes
  }
  const packages = []
  function collect(nodes) {
    for (const node of Object.values(nodes)) {
      packages.push(node.id)
      collect(node.children)
    }
  }
  for (const [id, importer] of Object.entries(lock.importers)) {
    const references = {
      ...importer.devDependencies,
      ...importer.dependencies,
      ...importer.optionalDependencies,
    }
    collect(
      walk(
        Object.fromEntries(Object.entries(references).map(([name, ref]) => [name, ref.version])),
      ),
    )
    packages.push(`${id.replaceAll('/', '__')}@0.0.0`)
  }
  return packages.sort()
}
