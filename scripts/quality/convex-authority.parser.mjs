import { resolve } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { z } from 'zod'
import { authorityError, builderNames, digestJSON } from './convex-authority-inputs.mjs'

const hash = z.string().regex(/^[a-f0-9]{64}$/)
const span = z
  .object({ start: z.number().int().nonnegative(), end: z.number().int().positive() })
  .strict()
const git = z
  .object({
    mode: z.enum(['100644', '100755', '120000']),
    blob: z.string().regex(/^[a-f0-9]{40}$/),
  })
  .strict()
const identity = z.union([
  z.object({ path: z.string(), present: z.literal(false) }).strict(),
  z
    .object({
      path: z.string(),
      present: z.literal(true),
      regular: z.boolean(),
      directory: z.boolean(),
      symlink: z.boolean(),
      realpath: z.string(),
      dev: z.number().int(),
      ino: z.number().int(),
      mode: z.number().int(),
      sha256: hash.optional(),
      bytes: z.number().int().nonnegative().optional(),
    })
    .strict(),
])
const source = z.object({ file: z.string(), git: git.nullable(), identity }).strict()
const platform = z.enum(['browser', 'node'])
const root = z
  .object({
    file: z.string(),
    slot: z.enum(['schema', 'http', 'crons', 'convex.config', 'auth.config']).nullable(),
    named: z.boolean(),
    platform,
  })
  .strict()
const sdk = z
  .object({
    name: z.string(),
    version: z.string(),
    reference: z.string(),
    integrity: z.string(),
    root: z.string(),
    manifest: identity,
    files: z.array(identity),
  })
  .strict()
const sdkBinding = z
  .object({
    specifier: z.string(),
    name: z.string(),
    root: identity,
    leaf: z
      .object({ identity, name: z.string(), start: z.number().int(), end: z.number().int() })
      .strict(),
  })
  .strict()
const options = z
  .object({
    bundle: z.literal(true),
    format: z.literal('esm'),
    target: z.literal('esnext'),
    jsx: z.literal('automatic'),
    conditions: z.tuple([z.literal('convex'), z.literal('module')]),
    treeShaking: z.literal(true),
    define: z.object({ 'process.env.NODE_ENV': z.literal('"production"') }).strict(),
  })
  .strict()
const role = z.enum([
  'registrar',
  'factory',
  'namespace',
  'provider',
  'issuer',
  'sdk-callable',
  'candidate',
  'validator',
  'fields',
  'table',
  'schema',
  'tables',
  'http',
  'crons',
  'config',
  'auth',
  'data',
  'state',
  'function',
])
const reference = z
  .object({
    binding: z.string(),
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
  })
  .strict()
const binding = z
  .object({
    name: z.string(),
    declaration: span,
    role,
    protected: z.boolean(),
    exports: z.array(z.string()),
  })
  .strict()
const exportRow = z
  .object({ name: z.string(), binding: z.string(), declaration: span, role })
  .strict()
const mapping = z.object({ name: z.enum(builderNames), builder: z.enum(builderNames) }).strict()
const moduleRow = z
  .object({
    file: z.string(),
    platform,
    chain: z.array(z.string()).min(1),
    scopes: z.array(z.string()),
    sourceDigest: hash,
    initialization: z.literal('checked'),
    statements: z.array(
      z.object({ start: z.number().int(), end: z.number().int(), kind: z.string() }).strict(),
    ),
    references: z.array(reference),
    identifiers: z.array(reference),
    bindings: z.array(binding),
    exports: z.array(exportRow),
    generated: z.array(mapping),
  })
  .strict()
const importBinding = z
  .object({
    local: z.string(),
    imported: z.string(),
    typeOnly: z.boolean(),
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
  })
  .strict()
const target = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('local'), file: z.string(), path: z.string() }).strict(),
  z.object({ kind: z.literal('sdk'), specifier: z.string(), path: z.string() }).strict(),
])
const resolved = z
  .object({
    path: z.string(),
    namespace: z.literal('file'),
    external: z.literal(false),
    suffix: z.literal(''),
    sideEffects: z.boolean().nullable(),
    errors: z.array(z.string()).length(0),
    warnings: z.array(z.string()).length(0),
  })
  .strict()
const targetBinding = z
  .object({ kind: z.enum(['local', 'sdk']), file: z.string(), name: z.string(), declaration: span })
  .strict()
const edge = z
  .object({
    file: z.string(),
    platform,
    start: z.number().int().nonnegative(),
    specifier: z.string(),
    bindings: z.array(importBinding),
    runtime: z.boolean(),
    target: target.nullable(),
    resolution: resolved.nullable(),
    targets: z.array(targetBinding.nullable()),
  })
  .strict()
const claim = z
  .object({
    file: z.string(),
    name: z.string(),
    kind: z.enum([...builderNames, 'schema', 'http', 'crons', 'config', 'auth']),
  })
  .strict()
const code = z.enum([
  'source_identity',
  'package_scope',
  'compiler_scope',
  'resolved_target',
  'runtime_cycle',
  'module_initialization',
  'import_binding',
  'value_role',
  'mutable_binding',
  'authority_reference',
  'generated_mapping',
  'receipt_incomplete',
  'source_changed',
])
const error = z
  .object({
    file: z.string().nullable(),
    code,
    detail: z.string().min(1),
    chain: z.array(z.string()),
  })
  .strict()
const receipt = z.discriminatedUnion('status', [
  z
    .object({
      schemaVersion: z.literal(1),
      proof: z.literal('declaration_convention_v1'),
      nonce: z.string().uuid(),
      snapshotDigest: hash,
      populationDigest: hash,
      root: z.string(),
      head: z.string().regex(/^[a-f0-9]{40}$/),
      indexTree: z.string().regex(/^[a-f0-9]{40}$/),
      population: z.array(z.string()),
      roots: z.array(root),
      sdk: z.array(sdk),
      sdkBindings: z.array(sdkBinding),
      options,
      tooling: z.object({ node: z.string(), executable: identity, parser: identity }).strict(),
      platforms: z.array(platform),
      witnesses: z.array(identity),
      configurationGit: z.array(git.extend({ file: z.string() }).strict()),
      generatedInputs: z.array(identity),
      generatedSources: z.array(source),
      status: z.literal('ok'),
      sources: z.array(source),
      modules: z.array(moduleRow),
      edges: z.array(edge),
      claims: z.array(claim),
      closureDigest: hash,
    })
    .strict(),
  z
    .object({
      schemaVersion: z.literal(1),
      proof: z.literal('declaration_convention_v1'),
      nonce: z.string().uuid().nullable(),
      snapshotDigest: hash.nullable(),
      status: z.literal('error'),
      errors: z.array(error).min(1),
    })
    .strict(),
])
function invalid(detail) {
  throw new Error(`Invalid Convex authority receipt: receipt_incomplete ${detail}`)
}
function exact(actual, expected, detail) {
  if (!isDeepStrictEqual(actual, expected)) invalid(detail)
}
function unique(rows, key, detail) {
  const map = new Map(rows.map((row) => [key(row), row]))
  if (map.size !== rows.length) invalid(`duplicate ${detail}`)
  return map
}
const moduleKey = (row) => `${row.file}|${row.platform}`
const edgeKey = (row) => `${moduleKey(row)}|${row.start}`
const protectedRoles = new Set([
  'registrar',
  'factory',
  'namespace',
  'provider',
  'issuer',
  'candidate',
  'validator',
  'fields',
  'table',
  'schema',
  'http',
  'crons',
  'config',
  'auth',
])
function expectedBindings(fact) {
  return [
    ...fact.imports
      .filter((row) => row.runtime && row.start !== undefined)
      .flatMap((row) =>
        row.bindings.filter(
          (item) =>
            !item.typeOnly &&
            !fact.exports.some((entry) => entry.local === null && entry.start === item.start),
        ),
      ),
    ...fact.variables.filter((row) => !row.erased),
    ...fact.functions.filter((row) => !row.erased),
  ]
    .map((row) => row.local ?? row.name)
    .sort()
}
function checkExport(entry, row, fact) {
  const syntax = fact.exports.find((item) => item.name === entry.name)
  const fallback = entry.name === 'default' ? fact.defaults[0] : null
  const local = syntax?.local ?? fallback?.local
  if (local) {
    const binding = row.bindings.find((binding) => binding.name === local)
    if (!binding || entry.binding !== local || entry.role !== binding.role)
      invalid('export does not bind its source declaration')
    exact(entry.declaration, binding.declaration, 'export declaration span mismatch')
    return
  }
  if (syntax && syntax.local === null) {
    exact(entry.binding, syntax.name, 'generated reexport name mismatch')
    exact(
      entry.declaration,
      { start: syntax.start, end: syntax.end },
      'generated reexport span mismatch',
    )
    return
  }
  if (!fallback || entry.binding !== 'default') invalid('missing default declaration provenance')
  exact(
    entry.declaration,
    { start: fallback.expressionStart, end: fallback.expressionEnd },
    'default initializer span mismatch',
  )
}
function checkBindings(row, fact) {
  const bindings = row.bindings.map((binding) => binding.name).sort()
  exact(bindings, expectedBindings(fact), `incomplete binding population in ${row.file}`)
  if (fact.variables.some((variable) => !variable.erased && (!variable.constant || !variable.name)))
    invalid('mutable/destructured binding in success receipt')
  const declarations = [
    ...fact.imports
      .filter((edge) => edge.runtime)
      .flatMap((edge) =>
        edge.bindings
          .filter((binding) => !binding.typeOnly)
          .map((binding) => ({ name: binding.local, start: binding.start, end: binding.end })),
      ),
    ...fact.variables
      .filter((variable) => !variable.erased)
      .map((variable) => ({ name: variable.name, start: variable.start, end: variable.nameEnd })),
    ...fact.functions.filter((fn) => !fn.erased),
  ]
  for (const binding of row.bindings) {
    const declaration = declarations.find((item) => item.name === binding.name)
    if (!declaration) invalid('unbound local declaration')
    exact(
      binding.declaration,
      { start: declaration.start, end: declaration.end },
      'declaration span differs from source',
    )
    if (protectedRoles.has(binding.role) && !binding.protected)
      invalid('unprotected declaration authority')
  }
  unique(row.bindings, (binding) => binding.name, 'binding')
  unique(row.exports, (entry) => entry.name, 'export')
  const exports = [
    ...fact.exports.map((entry) => entry.name),
    ...fact.defaults.map(() => 'default'),
  ].sort()
  exact(row.exports.map((entry) => entry.name).sort(), exports, 'incomplete export population')
  for (const entry of row.exports) checkExport(entry, row, fact)
}
function checkReferences(row, snapshot) {
  exact(
    row.identifiers,
    snapshot.lexical.find((item) => item.file === row.file)?.identifiers,
    'incomplete lexical reference population',
  )
  exact(
    row.references,
    snapshot.lexical.find((item) => item.file === row.file)?.references,
    'incomplete runtime reference coverage',
  )
  unique(row.references, (row) => `${row.start}|${row.end}`, 'protected reference')
  for (const reference of row.references) {
    if (!row.identifiers.some((item) => isDeepStrictEqual(item, reference)))
      invalid('foreign protected reference')
    if (!row.bindings.some((binding) => binding.name === reference.binding))
      invalid('unbound runtime reference')
  }
}
function generatedMapping(fact, entry, inputs) {
  let binding
  if (entry.local === null) binding = inputs.find((binding) => binding.start === entry.start)
  else {
    const variable = fact.variables.find((variable) => variable.name === entry.local)
    if (
      !variable?.constant ||
      !variable.exported ||
      variable.name !== entry.name ||
      !variable.identifier
    )
      invalid('generated assignment is not one direct immutable export')
    binding = inputs.find((binding) => binding.local === variable.identifier)
  }
  if (binding?.imported !== `${entry.name}Generic`)
    invalid('generated assignment differs from canonical source binding')
  return { name: entry.name, builder: entry.name }
}
function generatedProof(row, snapshot) {
  const fact = snapshot.facts.find((fact) => fact.file === row.file)
  const imports = fact.imports.filter((edge) => edge.runtime)
  const inputs = imports.flatMap((edge) => edge.bindings.filter((binding) => !binding.typeOnly))
  if (imports.length !== 1 || imports[0].specifier !== 'convex/server')
    invalid('extra/foreign generated runtime input')
  exact(
    inputs.map((binding) => binding.imported).sort(),
    builderNames.map((name) => `${name}Generic`).sort(),
    'generated SDK input population mismatch',
  )
  exact(
    fact.exports.map((entry) => entry.name).sort(),
    [...builderNames].sort(),
    'generated source export population mismatch',
  )
  exact(
    fact.variables.filter((variable) => !variable.erased).length,
    fact.exports.filter((entry) => entry.local !== null).length,
    'extra generated initializer',
  )
  if (row.exports.some((entry) => entry.role !== 'registrar'))
    invalid('generated export lacks its registrar role')
  const expected = fact.exports.map((entry) => generatedMapping(fact, entry, inputs))
  exact(
    [...row.generated].sort((a, b) => a.name.localeCompare(b.name)),
    expected.sort((a, b) => a.name.localeCompare(b.name)),
    'incorrect generated source mappings',
  )
}
function checkGenerated(row, snapshot) {
  if (row.file === snapshot.generated) generatedProof(row, snapshot)
  else exact(row.generated, [], 'ordinary helper supplied generated authority')
  if (row.generated.some((mapping) => mapping.name !== mapping.builder))
    invalid('incorrect generated mapping')
  if (row.chain.at(-1) !== row.file || new Set(row.chain).size !== row.chain.length)
    invalid('invalid helper chain')
}
function checkChain(row, snapshot, edges) {
  const first = row.chain[0]
  if (
    first !== snapshot.generated &&
    !snapshot.roots.some((root) => root.file === first && root.platform === row.platform)
  )
    invalid('helper chain lacks an independent root')
  for (let index = 1; index < row.chain.length; index++) {
    if (
      !edges.some(
        (edge) =>
          edge.file === row.chain[index - 1] &&
          edge.platform === row.platform &&
          edge.target?.kind === 'local' &&
          edge.target.file === row.chain[index],
      )
    )
      invalid('helper chain lacks its runtime edge')
  }
}
function checkScopes(row, snapshot) {
  const expectedScopes = []
  let directory = resolve(snapshot.root, row.file, '..')
  for (;;) {
    for (const name of ['tsconfig.json', 'jsconfig.json', 'package.json'])
      expectedScopes.push(resolve(directory, name))
    if (directory.startsWith(snapshot.root + '/'))
      for (const name of ['convex', 'esbuild', 'typescript', '@convex-dev/better-auth'])
        expectedScopes.push(resolve(directory, 'node_modules', name, 'package.json'))
    const parent = resolve(directory, '..')
    if (parent === directory) break
    directory = parent
  }
  exact(row.scopes, expectedScopes, 'incomplete compiler/package/absence scope population')
}
function checkModule(row, snapshot) {
  const fact = snapshot.facts.find((fact) => fact.file === row.file)
  const source = snapshot.sources.find((source) => source.file === row.file)
  if (!fact || !source?.git || source.identity.sha256 !== row.sourceDigest)
    invalid('unbound module/source identity')
  exact(row.statements, fact.statements, 'incomplete module initialization coverage')
  checkBindings(row, fact)
  checkReferences(row, snapshot)
  checkGenerated(row, snapshot)
  checkScopes(row, snapshot)
}
function checkImportRole(edge, binding, modules, expected) {
  const local = modules
    .get(`${edge.file}|${edge.platform}`)
    .bindings.find((item) => item.name === binding.local)
  if (local && local.role !== expected) invalid('import role differs from the resolved export')
}
function sdkRole(name) {
  if (builderNames.some((builder) => `${builder}Generic` === name)) return 'registrar'
  if (['defineSchema', 'defineTable', 'httpRouter', 'cronJobs', 'defineApp'].includes(name))
    return 'factory'
  return {
    v: 'namespace',
    paginationOptsValidator: 'validator',
    getAuthConfigProvider: 'provider',
    ConvexError: 'sdk-callable',
    convexToJson: 'sdk-callable',
  }[name]
}
function checkTarget(edge, snapshot, modules) {
  if (edge.targets.length !== edge.bindings.length) invalid('incomplete binding target population')
  for (let index = 0; index < edge.bindings.length; index++) {
    const binding = edge.bindings[index],
      target = edge.targets[index]
    if (!edge.runtime || binding.typeOnly) {
      exact(target, null, 'erased type acquired a runtime role')
      continue
    }
    if (!target) invalid('missing runtime target binding')
    if (edge.target.kind === 'sdk') {
      const sdk = snapshot.sdkBindings.find(
        (item) => item.specifier === edge.specifier && item.name === binding.imported,
      )
      if (!sdk) invalid('unknown SDK export role')
      exact(
        target,
        {
          kind: 'sdk',
          file: sdk.leaf.identity.path,
          name: sdk.leaf.name,
          declaration: { start: sdk.leaf.start, end: sdk.leaf.end },
        },
        'SDK binding/root/leaf mismatch',
      )
      checkImportRole(edge, binding, modules, sdkRole(binding.imported))
    } else {
      const entry = modules
        .get(`${edge.target.file}|${edge.platform}`)
        ?.exports.find((entry) => entry.name === binding.imported)
      if (!entry) invalid('missing local exported declaration')
      exact(
        target,
        {
          kind: 'local',
          file: edge.target.file,
          name: entry.binding,
          declaration: entry.declaration,
        },
        'local lexical export binding mismatch',
      )
      checkImportRole(edge, binding, modules, entry.role)
    }
  }
}
function checkClaims(result, modules) {
  for (const claim of result.claims) {
    const row = [...modules.values()].find((row) => row.file === claim.file)
    const exported = row?.exports.find((entry) => entry.name === claim.name)
    const expected = claim.name === 'default' ? claim.kind : 'candidate'
    if (!exported || exported.role !== expected) invalid('claim lacks its declaration value role')
  }
}
function checkResolution(edge, snapshot, modules) {
  if (!edge.runtime) {
    exact(edge.target, null, 'type-only target')
    exact(edge.resolution, null, 'type-only resolution')
  } else {
    if (!edge.target || !edge.resolution) invalid('omitted runtime resolution')
    if (edge.target.path !== edge.resolution.path) invalid('resolution/target mismatch')
    if (edge.target.kind === 'local') {
      if (
        edge.target.path !== resolve(snapshot.root, edge.target.file) ||
        !edge.specifier.startsWith('.')
      )
        invalid('foreign local target')
      if (!modules.has(`${edge.target.file}|${edge.platform}`)) invalid('missing transitive helper')
    } else if (
      !snapshot.sdkBindings.some(
        (binding) => binding.specifier === edge.specifier && binding.root.path === edge.target.path,
      )
    )
      invalid('foreign SDK root')
  }
}
function checkEdge(edge, snapshot, modules) {
  const fact = snapshot.facts
    .find((fact) => fact.file === edge.file)
    ?.imports.find((item) => item.start === edge.start)
  if (!fact) invalid('edge outside independent syntax inventory')
  exact(
    {
      start: edge.start,
      specifier: edge.specifier,
      bindings: edge.bindings,
      runtime: edge.runtime,
    },
    fact,
    'import syntax/binding mismatch',
  )
  checkResolution(edge, snapshot, modules)
  checkTarget(edge, snapshot, modules)
}
function checkClosure(result, snapshot) {
  const modules = unique(result.modules, moduleKey, 'module/platform'),
    edges = unique(result.edges, edgeKey, 'import/platform')
  const visited = new Set(),
    active = new Set()
  function walk(file, platform) {
    const key = `${file}|${platform}`
    if (active.has(key)) invalid('runtime cycle in receipt')
    if (visited.has(key)) return
    const module = modules.get(key)
    if (!module) invalid('missing root/helper/platform')
    active.add(key)
    const fact = snapshot.facts.find((fact) => fact.file === file)
    if (!fact) invalid('missing independent source facts')
    for (const input of fact.imports) {
      const edge = edges.get(`${key}|${input.start}`)
      if (!edge) invalid('omitted runtime/type-only import')
      if (edge.target?.kind === 'local') walk(edge.target.file, platform)
    }
    active.delete(key)
    visited.add(key)
  }
  for (const root of snapshot.roots) walk(root.file, root.platform)
  for (const platform of new Set(snapshot.roots.map((root) => root.platform))) {
    if (!snapshot.generated) invalid('missing generated source')
    walk(snapshot.generated, platform)
  }
  exact([...modules.keys()].sort(), [...visited].sort(), 'extra/omitted module closure')
  const expectedEdges = result.modules
    .flatMap((module) =>
      snapshot.facts
        .find((fact) => fact.file === module.file)
        .imports.map((edge) => `${moduleKey(module)}|${edge.start}`),
    )
    .sort()
  exact([...edges.keys()].sort(), expectedEdges, 'extra/omitted edge closure')
  for (const module of result.modules) {
    checkModule(module, snapshot)
    checkChain(module, snapshot, result.edges)
  }
  for (const edge of result.edges) checkEdge(edge, snapshot, modules)
  checkClaims(result, modules)
  const sourceFiles = new Set(result.modules.map((module) => module.file))
  exact(
    result.sources,
    snapshot.sources.filter((source) => sourceFiles.has(source.file)),
    'incomplete source identities',
  )
  const expectedClaims = [...snapshot.claims].sort((a, b) =>
    JSON.stringify(a).localeCompare(JSON.stringify(b)),
  )
  unique(result.claims, (claim) => `${claim.file}|${claim.name}`, 'claim')
  exact(
    [...result.claims].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    expectedClaims,
    'claim population differs from independent declarations/defaults',
  )
}
const nativeResult = z
  .object({
    status: z.union([z.literal(0), z.literal(1)]),
    stdout: z.string(),
    stderr: z.literal('').optional(),
    signal: z.null().optional(),
  })
  .strict()
export function parse(input, { nonce, snapshot }) {
  let result, status
  try {
    const native = nativeResult.parse(input)
    status = native.status
    result = receipt.parse(JSON.parse(native.stdout))
  } catch (error) {
    invalid(error.message)
  }
  if (result.nonce !== nonce || result.snapshotDigest !== snapshot.digest)
    invalid('stale run/source binding')
  if (result.status === 'error') {
    if (status !== 1) invalid('error/native exit mismatch')
    const first = result.errors[0]
    throw authorityError(first.file ?? 'convex', first.code, first.detail, first.chain)
  }
  if (status !== 0) invalid('success/native exit mismatch')
  for (const key of [
    'root',
    'head',
    'indexTree',
    'population',
    'roots',
    'sdk',
    'sdkBindings',
    'options',
    'witnesses',
    'configurationGit',
    'tooling',
  ])
    exact(result[key], snapshot[key], `${key} differs from independent snapshot`)
  exact(result.populationDigest, snapshot.populationDigest, 'source population digest mismatch')
  exact(
    result.platforms,
    [...new Set(snapshot.roots.map((root) => root.platform))].sort(),
    'platform population mismatch',
  )
  exact(
    result.generatedInputs,
    snapshot.witnesses.filter((row) =>
      row.path.startsWith(resolve(snapshot.root, 'convex/_generated') + '/'),
    ),
    'generated companion identities mismatch',
  )
  exact(
    result.generatedSources,
    snapshot.sources.filter((row) => row.file.startsWith('convex/_generated/')),
    'generated Git/source identities mismatch',
  )
  exact(
    result.closureDigest,
    digestJSON({ modules: result.modules, edges: result.edges, claims: result.claims }),
    'closure digest mismatch',
  )
  checkClosure(result, snapshot)
  return result
}
