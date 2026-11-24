import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, relative, resolve } from 'node:path'
import ts from 'typescript'
import {
  authorityError,
  authoritySnapshot,
  digestJSON,
  parseSource,
  requireAuthoritySource,
  revalidateSnapshot,
  unwrap,
} from './convex-authority-inputs.mjs'
import { checkModuleScopes, checkRootScopes } from './convex-authority-scopes.mjs'
import { DeclarationValues, validateDeclarationReferences } from './convex-authority-values.mjs'

let request, esbuild
const modules = new Map(),
  edges = []
function fail(file, code, detail, chain) {
  throw authorityError(file, code, detail, chain)
}
function canonicalTarget(snapshot, result, edge, chain) {
  if (
    result.errors.length ||
    result.warnings.length ||
    result.external ||
    result.namespace !== 'file' ||
    !result.path ||
    result.suffix
  )
    fail(
      edge.file,
      'resolved_target',
      `unresolved/disabled/external/substituted edge ${edge.specifier}`,
      chain,
    )
  if (edge.specifier.startsWith('.')) {
    const file = relative(snapshot.root, result.path)
    requireAuthoritySource(snapshot, file)
    const stem = result.path.replace(/\.(?:ts|js)$/, '')
    if (
      ['.ts', '.js'].filter(
        (suffix) => snapshot.witnesses.find((row) => row.path === stem + suffix)?.present,
      ).length !== 1
    )
      fail(file, 'source_identity', 'ambiguous or missing local runtime siblings', chain)
    return { kind: 'local', file, path: result.path }
  }
  const approved = snapshot.sdkBindings.filter((binding) => binding.specifier === edge.specifier)
  if (!approved.length || approved.some((binding) => binding.root.path !== result.path))
    fail(
      edge.file,
      'resolved_target',
      `edge does not resolve to its selected SDK ESM root: ${edge.specifier}`,
      chain,
    )
  return { kind: 'sdk', specifier: edge.specifier, path: result.path }
}
function pagination(snapshot) {
  const binding = snapshot.sdkBindings.find((binding) => binding.name === 'paginationOptsValidator')
  if (!binding) return null
  const ast = parseSource(
    binding.leaf.identity.path,
    readFileSync(binding.leaf.identity.path, 'utf8'),
  )
  const declaration = ast.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((node) => node.name.text === binding.leaf.name)
  const call = unwrap(declaration?.initializer),
    input = call && ts.isCallExpression(call) && unwrap(call.arguments[0])
  if (
    !input ||
    !ts.isObjectLiteralExpression(input) ||
    input.properties.some((property) => !ts.isPropertyAssignment(property))
  )
    fail(
      binding.leaf.identity.path,
      'resolved_target',
      'unsupported canonical pagination export recipe',
      [],
    )
  return {
    kind: 'validator',
    deps: new Set(),
    fields: new Map(
      input.properties.map((property) => [
        property.name.text,
        { kind: 'validator', deps: new Set() },
      ]),
    ),
  }
}
async function discover(snapshot, build, file, platform, chain, active) {
  const key = `${file}|${platform}`
  if (active.has(key)) fail(file, 'runtime_cycle', 'runtime local-import cycle', [...chain, file])
  if (modules.has(key)) return
  requireAuthoritySource(snapshot, file)
  const importChain = [...chain, file],
    scopes = checkModuleScopes(snapshot, file, importChain)
  const fact = snapshot.facts.find((fact) => fact.file === file)
  if (!fact) fail(file, 'source_identity', 'missing runtime source facts', importChain)
  const model = {
    file,
    platform,
    chain: importChain,
    scopes,
    edges: [],
    slot: snapshot.defaults.find((row) => row.file === file)?.slot ?? null,
  }
  modules.set(key, model)
  const visiting = new Set([...active, key])
  for (const input of fact.imports) {
    const edge = { file, platform, ...input, target: null, resolution: null }
    if (input.runtime) {
      const importer = resolve(snapshot.root, file)
      const result = await build.resolve(input.specifier, {
        importer,
        resolveDir: dirname(importer),
        kind: 'import-statement',
      })
      edge.target = canonicalTarget(snapshot, result, edge, importChain)
      edge.resolution = {
        path: result.path,
        namespace: result.namespace,
        external: result.external,
        suffix: result.suffix,
        sideEffects: result.sideEffects ?? null,
        errors: result.errors.map((error) => error.text),
        warnings: result.warnings.map((warning) => warning.text),
      }
      if (edge.target.kind === 'local')
        await discover(snapshot, build, edge.target.file, platform, importChain, visiting)
    }
    edges.push(edge)
    model.edges.push(edge)
  }
}
async function resolveGraph(snapshot) {
  if (!snapshot.roots.length) return
  const selected = snapshot.sdk.find((item) => item.name === 'convex')
  const require = createRequire(selected.manifest.path)
  esbuild = require('esbuild')
  if (esbuild.version !== snapshot.sdk.find((item) => item.name === 'esbuild').version)
    fail('convex', 'resolved_target', 'Convex-owned esbuild identity changed', [])
  for (const platform of [...new Set(snapshot.roots.map((root) => root.platform))]) {
    let failure
    let result
    try {
      result = await esbuild.build({
        ...snapshot.options,
        platform,
        stdin: { contents: 'export {};', resolveDir: snapshot.root },
        write: false,
        logLevel: 'silent',
        plugins: [
          {
            name: 'authority-resolution',
            setup(build) {
              build.onStart(async () => {
                try {
                  if (!snapshot.generated)
                    fail(
                      'convex/_generated/server',
                      'generated_mapping',
                      'missing canonical generated server',
                      [],
                    )
                  await discover(snapshot, build, snapshot.generated, platform, [], new Set())
                  for (const root of snapshot.roots.filter((root) => root.platform === platform))
                    await discover(snapshot, build, root.file, platform, [], new Set())
                } catch (error) {
                  failure = error
                  throw error
                }
              })
            },
          },
        ],
      })
    } catch (error) {
      throw failure ?? error
    }
    if (result.errors.length || result.warnings.length)
      fail('convex', 'resolved_target', 'resolver emitted diagnostics', [])
  }
}
function valueModels(snapshot) {
  const program = ts.createProgram(
    [...new Set([...modules.values()].map((model) => resolve(snapshot.root, model.file)))],
    {
      allowJs: true,
      noLib: true,
      noResolve: true,
      types: [],
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
    },
  )
  const checker = program.getTypeChecker(),
    sdkPagination = pagination(snapshot),
    prepared = new Set()
  function prepare(model) {
    const key = `${model.file}|${model.platform}`
    if (prepared.has(key)) return
    for (const edge of model.edges.filter((edge) => edge.target?.kind === 'local'))
      prepare(modules.get(`${edge.target.file}|${model.platform}`))
    model.ast = program.getSourceFile(resolve(snapshot.root, model.file))
    model.sdkPagination = sdkPagination
    model.values = new DeclarationValues(model, checker, modules, snapshot).prepare()
    prepared.add(key)
  }
  for (const model of modules.values()) prepare(model)
  validateDeclarationReferences([...modules.values()])
}
function span(record) {
  return record.declaration
    ? { start: record.declaration.getStart(), end: record.declaration.end }
    : null
}
function moduleReceipt(model, snapshot) {
  const values = model.values
  return {
    file: model.file,
    platform: model.platform,
    chain: model.chain,
    scopes: model.scopes,
    sourceDigest: snapshot.sources.find((row) => row.file === model.file).identity.sha256,
    initialization: 'checked',
    statements: values.statements,
    references: values.references,
    identifiers: snapshot.lexical.find((row) => row.file === model.file).identifiers,
    bindings: [...values.bindings.values()].map((record) => ({
      name: record.name,
      declaration: span(record),
      role: record.value.kind,
      protected: record.protected,
      exports: record.exports,
    })),
    exports: [...values.exports].map(([name, record]) => ({
      name,
      binding: record.name,
      declaration: span(record),
      role: record.value.kind,
    })),
    generated: values.generated,
  }
}
function edgeReceipt(edge, snapshot) {
  return {
    ...edge,
    targets: edge.bindings.map((binding) => {
      if (binding.typeOnly || !edge.runtime) return null
      if (edge.target.kind === 'sdk') {
        const sdk = snapshot.sdkBindings.find(
          (item) => item.specifier === edge.specifier && item.name === binding.imported,
        )
        if (!sdk) fail(edge.file, 'import_binding', `unknown SDK binding ${binding.imported}`, [])
        return {
          kind: 'sdk',
          file: sdk.leaf.identity.path,
          name: sdk.leaf.name,
          declaration: { start: sdk.leaf.start, end: sdk.leaf.end },
        }
      }
      const record = modules
        .get(`${edge.target.file}|${edge.platform}`)
        .values.exports.get(binding.imported)
      if (!record) fail(edge.file, 'import_binding', `missing export ${binding.imported}`, [])
      return { kind: 'local', file: edge.target.file, name: record.name, declaration: span(record) }
    }),
  }
}
function envelope(snapshot) {
  return {
    schemaVersion: 1,
    proof: 'declaration_convention_v1',
    nonce: request.nonce,
    snapshotDigest: snapshot.digest,
    populationDigest: snapshot.populationDigest,
    root: snapshot.root,
    head: snapshot.head,
    indexTree: snapshot.indexTree,
    population: snapshot.population,
    roots: snapshot.roots,
    sdk: snapshot.sdk,
    sdkBindings: snapshot.sdkBindings,
    tooling: snapshot.tooling,
    options: snapshot.options,
    platforms: [...new Set(snapshot.roots.map((root) => root.platform))].sort(),
    witnesses: snapshot.witnesses,
    configurationGit: snapshot.configurationGit,
    generatedInputs: snapshot.witnesses.filter((row) =>
      row.path.startsWith(resolve(snapshot.root, 'convex/_generated') + '/'),
    ),
    generatedSources: snapshot.sources.filter((row) => row.file.startsWith('convex/_generated/')),
  }
}
try {
  request = JSON.parse(readFileSync(process.argv[2], 'utf8'))
  if (
    request.schemaVersion !== 1 ||
    Object.keys(request).sort().join() !== 'nonce,schemaVersion,snapshot' ||
    typeof request.nonce !== 'string'
  )
    fail('convex', 'receipt_incomplete', 'invalid worker request', [])
  const snapshot = authoritySnapshot(request.snapshot.population)
  if (snapshot.digest !== request.snapshot.digest || snapshot.root !== request.snapshot.root)
    fail('convex', 'source_changed', 'request does not match current source snapshot', [])
  checkRootScopes(snapshot)
  await resolveGraph(snapshot)
  valueModels(snapshot)
  revalidateSnapshot(snapshot)
  const proof = [...modules.values()].map((model) => moduleReceipt(model, snapshot))
  const claims = [...modules.values()].flatMap((model) => model.values.claims)
  const sourceFiles = new Set(proof.map((model) => model.file))
  const edgeRows = edges.map((edge) => edgeReceipt(edge, snapshot))
  const receipt = {
    ...envelope(snapshot),
    status: 'ok',
    sources: snapshot.sources.filter((row) => sourceFiles.has(row.file)),
    modules: proof,
    edges: edgeRows,
    claims,
    closureDigest: digestJSON({ modules: proof, edges: edgeRows, claims }),
  }
  process.stdout.write(JSON.stringify(receipt) + '\n')
} catch (error) {
  const diagnostic = error.diagnostic ?? {
    file: null,
    code: 'receipt_incomplete',
    detail: error.message,
    chain: [],
  }
  process.stdout.write(
    JSON.stringify({
      schemaVersion: 1,
      proof: 'declaration_convention_v1',
      nonce: request?.nonce ?? null,
      snapshotDigest: request?.snapshot?.digest ?? null,
      status: 'error',
      errors: [diagnostic],
    }) + '\n',
  )
  process.exitCode = 1
} finally {
  esbuild?.stop()
}
