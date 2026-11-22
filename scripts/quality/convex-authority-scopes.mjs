import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { authorityError, strictJSON } from './convex-authority-inputs.mjs'

const commonOptions = {
  allowJs: true,
  strict: true,
  noUncheckedIndexedAccess: true,
  moduleResolution: 'Bundler',
  jsx: 'react-jsx',
  skipLibCheck: true,
  allowSyntheticDefaultImports: true,
  target: 'ESNext',
  lib: ['ES2021', 'dom'],
  forceConsistentCasingInFileNames: true,
  module: 'ESNext',
  isolatedModules: true,
  noEmit: true,
}
const rootCompiler = {
  files: [],
  references: ['app', 'server', 'shared', 'node'].map((name) => ({
    path: `./.nuxt/tsconfig.${name}.json`,
  })),
}
const packageKeys = new Set([
  'name',
  'version',
  'description',
  'type',
  'private',
  'scripts',
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
  'peerDependenciesMeta',
  'packageManager',
  'pnpm',
  'engines',
  'license',
  'author',
  'repository',
  'bugs',
  'homepage',
  'keywords',
  'funding',
  'contributors',
])
function fail(file, code, detail, chain) {
  throw authorityError(file, code, detail, chain)
}
function trackedConfiguration(snapshot, path, jsonc, chain) {
  const file = relative(snapshot.root, path)
  const record = snapshot.witnesses.find((row) => row.path === path)
  const tracked = snapshot.configurationGit.find((row) => row.file === file)
  if (
    !record?.regular ||
    record.symlink ||
    record.realpath !== path ||
    !tracked ||
    !['100644', '100755'].includes(tracked.mode)
  )
    fail(
      file,
      jsonc ? 'compiler_scope' : 'package_scope',
      'configuration must be tracked and canonical',
      chain,
    )
  return strictJSON(file, readFileSync(path, 'utf8'), jsonc)
}
function rootPackage(snapshot, chain) {
  const manifest = trackedConfiguration(
    snapshot,
    resolve(snapshot.root, 'package.json'),
    false,
    chain,
  )
  if (
    manifest.type !== 'module' ||
    manifest.dependencies?.convex !== '^1.32.0' ||
    manifest.pnpm?.patchedDependencies !== undefined ||
    Object.keys(manifest).some((key) => !packageKeys.has(key))
  )
    fail('package.json', 'package_scope', 'unsupported root package resolution profile', chain)
  const lock = snapshot.lockImporter
  if (
    lock?.dependencies?.convex?.specifier !== '^1.32.0' ||
    !/^1\.32\.0(?:\(|$)/.test(lock.dependencies.convex.version)
  )
    fail(
      'pnpm-lock.yaml',
      'package_scope',
      'root dependency does not select frozen Convex 1.32.0',
      chain,
    )
}
function compilerProfiles(snapshot, chain) {
  const root = trackedConfiguration(snapshot, resolve(snapshot.root, 'tsconfig.json'), true, chain)
  if (!isDeepStrictEqual(root, rootCompiler))
    fail('tsconfig.json', 'compiler_scope', 'unsupported root compiler profile', chain)
  const convex = trackedConfiguration(
    snapshot,
    resolve(snapshot.root, 'convex/tsconfig.json'),
    true,
    chain,
  )
  const profile = (options) => ({
    compilerOptions: options,
    include: ['./**/*'],
    exclude: ['./_generated'],
  })
  if (
    !isDeepStrictEqual(convex, profile(commonOptions)) &&
    !isDeepStrictEqual(
      convex,
      profile({ ...commonOptions, typeRoots: ['./node_modules/@types', '../node_modules/@types'] }),
    )
  )
    fail('convex/tsconfig.json', 'compiler_scope', 'unsupported Convex compiler profile', chain)
}
function convexRoot(snapshot, chain) {
  const path = resolve(snapshot.root, 'convex.json')
  if (!snapshot.witnesses.find((row) => row.path === path)?.present) return
  const config = trackedConfiguration(snapshot, path, false, chain)
  if (
    !config ||
    Array.isArray(config) ||
    typeof config !== 'object' ||
    Object.keys(config).some((key) => !['$schema', 'functions'].includes(key)) ||
    (config.$schema !== undefined && typeof config.$schema !== 'string') ||
    (config.functions !== undefined && !['convex', 'convex/'].includes(config.functions))
  )
    fail(
      'convex.json',
      'package_scope',
      'only the canonical convex/ functions root is supported',
      chain,
    )
}
export function checkRootScopes(snapshot) {
  convexRoot(snapshot, [])
  if (!snapshot.roots.length) return
  rootPackage(snapshot, [])
  compilerProfiles(snapshot, [])
}
function scopeAt(snapshot, path, chain) {
  const record = snapshot.witnesses.find((row) => row.path === path)
  if (!record) fail(path, 'receipt_incomplete', 'missing scope/absence witness', chain)
  if (!record.present) return
  if (!record.regular || record.symlink || record.realpath !== path)
    fail(
      path,
      /(?:ts|js)config\.json$/.test(path) ? 'compiler_scope' : 'package_scope',
      'configuration alias or nonregular scope',
      chain,
    )
  const file = relative(snapshot.root, path),
    inside = !file.startsWith('../')
  if (path.endsWith('/jsconfig.json') || path.endsWith('/tsconfig.json')) {
    if (!['tsconfig.json', 'convex/tsconfig.json'].includes(file))
      fail(file, 'compiler_scope', 'additional compiler scope is unsupported', chain)
    return
  }
  if (!path.endsWith('/package.json')) return
  if (file === 'package.json') return
  if (inside) fail(file, 'package_scope', 'descendant package scope is unsupported', chain)
  const data = strictJSON(path, readFileSync(path, 'utf8'))
  if (
    !data ||
    Array.isArray(data) ||
    typeof data !== 'object' ||
    Object.keys(data).some(
      (key) =>
        !['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'].includes(
          key,
        ),
    )
  )
    fail(
      file,
      'package_scope',
      'ambient package may contain only unrelated dependency metadata',
      chain,
    )
}
export function checkModuleScopes(snapshot, file, chain) {
  const paths = []
  for (let directory = dirname(resolve(snapshot.root, file)); ; directory = dirname(directory)) {
    for (const name of ['tsconfig.json', 'jsconfig.json', 'package.json']) {
      const path = resolve(directory, name)
      paths.push(path)
      scopeAt(snapshot, path, chain)
    }
    if (directory.startsWith(snapshot.root + '/'))
      for (const name of ['convex', 'esbuild', 'typescript', '@convex-dev/better-auth']) {
        const path = resolve(directory, 'node_modules', name, 'package.json')
        paths.push(path)
        if (snapshot.witnesses.find((row) => row.path === path)?.present)
          fail(path, 'package_scope', 'earlier private package search root is unsupported', chain)
      }
    if (dirname(directory) === directory) return paths
  }
}
