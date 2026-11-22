import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs'
import { basename, dirname, relative, resolve } from 'node:path'
import ts from 'typescript'
import { files as gitFiles } from './common.mjs'

const root = 'convex'
const builders = [
  'query',
  'internalQuery',
  'mutation',
  'internalMutation',
  'action',
  'internalAction',
  'httpAction',
]
const factories = {
  schema: 'defineSchema',
  http: 'httpRouter',
  crons: 'cronJobs',
  'convex.config': 'defineApp',
}

function unsupported(file, detail) {
  throw new Error(`Unsupported Convex 1.32.0 authority in ${file}: ${detail}`)
}
function source(file) {
  if (!lstatSync(file).isFile() || realpathSync(file) !== resolve(file))
    unsupported(file, 'authority must use a canonical regular file without symlink aliases')
  const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  if (ast.parseDiagnostics.length) unsupported(file, 'invalid source syntax')
  return ast
}
function value(node) {
  while (
    node &&
    (ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node))
  )
    node = node.expression
  return node
}
function imports(ast) {
  const result = new Map()
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly) continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue
    for (const item of bindings.elements) {
      if (!item.isTypeOnly)
        result.set(item.name.text, {
          from: statement.moduleSpecifier.text,
          name: (item.propertyName ?? item.name).text,
        })
    }
  }
  return result
}
function variablesIn(statement, variables, exported) {
  if (!ts.isVariableStatement(statement)) return
  const isExported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  for (const item of statement.declarationList.declarations) {
    if (!ts.isIdentifier(item.name)) continue
    variables.set(item.name.text, value(item.initializer))
    if (isExported) exported.set(item.name.text, value(item.initializer))
  }
}
function exportsIn(statement, exported) {
  if (ts.isExportAssignment(statement) && !statement.isExportEquals)
    exported.set('default', value(statement.expression))
  if (
    !ts.isExportDeclaration(statement) ||
    statement.isTypeOnly ||
    statement.moduleSpecifier ||
    !statement.exportClause ||
    !ts.isNamedExports(statement.exportClause)
  )
    return
  for (const item of statement.exportClause.elements) {
    if (!item.isTypeOnly)
      exported.set(item.name.text, { local: (item.propertyName ?? item.name).text })
  }
}
function declarations(ast) {
  const variables = new Map(),
    exported = new Map()
  for (const statement of ast.statements) {
    variablesIn(statement, variables, exported)
    exportsIn(statement, exported)
  }
  for (const [name, node] of exported) {
    if (node?.local) exported.set(name, variables.get(node.local))
  }
  return { variables, exported }
}
function choose(stem, selected) {
  const files = ['.ts', '.js'].map((extension) => stem + extension).filter(existsSync)
  if (files.length > 1) unsupported(stem, 'ambiguous .ts/.js authority; choose one')
  if (files.length && !selected.has(files[0]))
    unsupported(files[0], 'authority is outside the trusted Git source population')
  return files[0]
}
function appRoot() {
  const version = JSON.parse(
    readFileSync(new URL('../../node_modules/convex/package.json', import.meta.url), 'utf8'),
  ).version
  if (version !== '1.32.0')
    unsupported('convex', `adapter requires Convex 1.32.0, found ${version}`)
  if (!existsSync('convex.json')) return
  const config = JSON.parse(readFileSync('convex.json', 'utf8'))
  if (
    Object.keys(config).some((key) => !['$schema', 'functions'].includes(key)) ||
    (config.functions !== undefined && !['convex', 'convex/'].includes(config.functions))
  )
    unsupported(
      'convex.json',
      'only the declared convex/ functions root is supported; update the authority adapter deliberately',
    )
}
function compilerAuthority(files) {
  const configurations = new Set(
    files
      .filter((file) => file.startsWith(`${root}/`))
      .map((file) =>
        ts.findConfigFile(dirname(resolve(file)), (path) =>
          Boolean(lstatSync(path, { throwIfNoEntry: false })),
        ),
      )
      .filter(Boolean),
  )
  for (const configPath of configurations) {
    const file = relative(process.cwd(), configPath)
    if (!['convex/tsconfig.json', 'tsconfig.json'].includes(file) || !gitFiles().includes(file))
      unsupported(file, 'compiler authority must be an exact Git-selected app configuration')
    if (!lstatSync(file).isFile() || realpathSync(file) !== resolve(file))
      unsupported(file, 'compiler authority cannot use symlink aliases')
    const { config, error } = ts.readConfigFile(file, (path) => readFileSync(path, 'utf8'))
    if (error) unsupported(file, 'invalid TypeScript configuration')
    const options = config.compilerOptions ?? {}
    const substitutions = ['paths', 'baseUrl', 'rootDirs', 'moduleSuffixes', 'customConditions']
    if (config.extends !== undefined || substitutions.some((key) => options[key] !== undefined))
      unsupported(
        file,
        'canonical registrar imports require compiler configuration without inheritance or module substitutions',
      )
  }
}
function generatedExport(file, name, binding, verified) {
  if (
    !builders.includes(name) ||
    binding?.from !== 'convex/server' ||
    binding.name !== `${name}Generic` ||
    verified.has(name)
  )
    unsupported(
      file,
      'generated builder mapping must directly re-export the seven canonical convex/server registrars',
    )
  verified.add(name)
}
function isCanonicalReexport(statement) {
  return (
    ts.isExportDeclaration(statement) &&
    statement.moduleSpecifier?.text === 'convex/server' &&
    statement.exportClause &&
    ts.isNamedExports(statement.exportClause)
  )
}
function isConstExport(statement) {
  return (
    ts.isVariableStatement(statement) &&
    Boolean(statement.declarationList.flags & ts.NodeFlags.Const) &&
    statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  )
}
function generatedStatement(file, statement, imported, verified) {
  if (ts.isImportDeclaration(statement)) {
    if (!statement.importClause?.isTypeOnly && statement.moduleSpecifier.text !== 'convex/server')
      unsupported(file, 'unsupported generated runtime import')
    return
  }
  if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) return
  if (isConstExport(statement)) {
    for (const item of statement.declarationList.declarations) {
      const node = value(item.initializer)
      generatedExport(
        file,
        item.name.text,
        node && ts.isIdentifier(node) ? imported.get(node.text) : null,
        verified,
      )
    }
    return
  }
  if (isCanonicalReexport(statement)) {
    for (const item of statement.exportClause.elements)
      generatedExport(
        file,
        item.name.text,
        { from: 'convex/server', name: (item.propertyName ?? item.name).text },
        verified,
      )
    return
  }
  unsupported(file, 'unsupported generated builder statement or mutable mapping')
}
function generatedBuilders() {
  const file = choose(`${root}/_generated/server`, new Set(gitFiles()))
  if (!file) return new Set()
  compilerAuthority([file])
  const ast = source(file),
    imported = imports(ast)
  const verified = new Set()
  for (const statement of ast.statements) generatedStatement(file, statement, imported, verified)
  if (verified.size !== builders.length)
    unsupported(
      file,
      'generated builder mapping must directly re-export the seven canonical convex/server registrars',
    )
  return verified
}
function registrars(file, imported, generated) {
  const names = new Set()
  for (const [local, binding] of imported) {
    if (
      binding.from === 'convex/server' &&
      builders.some((name) => binding.name === `${name}Generic`)
    )
      names.add(local)
    if (!binding.from.startsWith('.')) continue
    const target = relative(process.cwd(), resolve(dirname(file), binding.from)).replace(
      /\.js$/,
      '',
    )
    if (target !== `${root}/_generated/server`) continue
    if (!generated.has(binding.name)) unsupported(file, 'unverified generated builder import')
    names.add(local)
  }
  return names
}
function directCall(node, imported, expected) {
  if (!node || !ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return false
  const binding = imported.get(node.expression.text)
  return binding?.from === 'convex/server' && binding.name === expected
}
function defaultEntry(file, slot, ast, imported, declarations) {
  let node = declarations.exported.get('default')
  if (node && ts.isIdentifier(node)) node = declarations.variables.get(node.text)
  if (slot === 'auth.config') {
    if (
      !node ||
      !ts.isObjectLiteralExpression(node) ||
      !node.properties.some(
        (p) =>
          p.name?.getText(ast) === 'providers' &&
          ts.isPropertyAssignment(p) &&
          ts.isArrayLiteralExpression(p.initializer),
      )
    )
      unsupported(file, 'auth default must be an object with a providers array')
    return 'object'
  }
  if (!directCall(node, imported, factories[slot]))
    unsupported(file, `default must directly use convex/server ${factories[slot]}`)
  if (
    slot === 'convex.config' &&
    ast.statements.some((s) => ts.isExpressionStatement(s) && ts.isCallExpression(s.expression))
  )
    unsupported(
      file,
      'component installation requires an explicitly supported root and installation edge',
    )
  return slot === 'convex.config' ? 'config' : slot
}
function discoverable(file, components) {
  const name = basename(file),
    path = file.slice(root.length + 1)
  return (
    /\.(?:js|jsx|ts|tsx|mjs|cjs|mts|cts)$/.test(path) &&
    !name.startsWith('.') &&
    !name.startsWith('#') &&
    !path.includes(' ') &&
    !['schema.ts', 'schema.js'].includes(name) &&
    name.split('.').length === 2 &&
    !path.startsWith('_generated/') &&
    !components.some((component) => file.startsWith(`${component}/`))
  )
}
function usesRegistrar(node, names) {
  if (!node) return false
  if (ts.isIdentifier(node) && names.has(node.text)) return true
  return Boolean(ts.forEachChild(node, (child) => usesRegistrar(child, names) || undefined))
}

function isRegistration(node, names) {
  return (
    node &&
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    names.has(node.expression.text)
  )
}
function moduleEntries(file, slot, generated) {
  const ast = source(file),
    imported = imports(ast),
    declared = declarations(ast)
  const names = registrars(file, imported, generated),
    entries = []
  for (const [name, node] of declared.variables) {
    if (!isRegistration(node, names) && usesRegistrar(node, names))
      unsupported(
        file,
        `binding ${name} requires a direct registration; wrappers and binding chains are unsupported`,
      )
  }
  if (slot)
    entries.push({ file, name: 'default', kind: defaultEntry(file, slot, ast, imported, declared) })
  for (const [name, node] of declared.exported) {
    if (name === 'default' && slot) continue
    if (isRegistration(node, names)) entries.push({ file, name, kind: 'registered' })
    else if (usesRegistrar(node, names))
      unsupported(
        file,
        `export ${name} requires a direct registration; wrappers and binding chains are unsupported`,
      )
  }
  return entries
}
function nestedComponents(files, selected) {
  const components = new Set()
  for (const file of files.filter((file) => file.startsWith(`${root}/`))) {
    for (let directory = dirname(file); directory !== root; directory = dirname(directory)) {
      const definition = choose(`${directory}/convex.config`, selected)
      if (definition) components.add(directory)
    }
  }
  return [...components]
}
export function convexEntries(files) {
  appRoot()
  compilerAuthority(files)
  const selected = new Set(files),
    generated = generatedBuilders()
  const defaults = new Map()
  for (const slot of [...Object.keys(factories), 'auth.config']) {
    const file = choose(`${root}/${slot}`, selected)
    if (file) defaults.set(file, slot)
  }
  const components = nestedComponents(files, selected)
  const entries = []
  for (const file of files.filter((file) => file.startsWith(`${root}/`))) {
    if (!defaults.has(file) && !discoverable(file, components)) continue
    entries.push(...moduleEntries(file, defaults.get(file), generated))
  }
  return entries
}
