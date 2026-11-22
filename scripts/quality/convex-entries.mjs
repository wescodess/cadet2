import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import ts from 'typescript'

function recordImports(statement, module) {
  if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly) return
  const from = statement.moduleSpecifier.text
  const bindings = statement.importClause?.namedBindings
  if (bindings && ts.isNamedImports(bindings)) {
    for (const item of bindings.elements) {
      if (!item.isTypeOnly)
        module.bindings.set(item.name.text, { from, name: (item.propertyName ?? item.name).text })
    }
  } else if (bindings && ts.isNamespaceImport(bindings)) {
    module.bindings.set(bindings.name.text, { from, name: '*' })
  }
}
function recordVariables(statement, module) {
  if (!ts.isVariableStatement(statement)) return
  const exported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  for (const item of statement.declarationList.declarations) {
    if (!ts.isIdentifier(item.name)) continue
    module.bindings.set(item.name.text, { expression: item.initializer })
    if (exported) module.exports.set(item.name.text, { name: item.name.text })
  }
}
function recordExports(statement, module) {
  if (ts.isExportAssignment(statement) && !statement.isExportEquals)
    module.exports.set('default', { expression: statement.expression })
  if (
    !ts.isExportDeclaration(statement) ||
    !statement.exportClause ||
    !ts.isNamedExports(statement.exportClause)
  )
    return
  for (const item of statement.exportClause.elements) {
    if (!statement.isTypeOnly && !item.isTypeOnly)
      module.exports.set(item.name.text, {
        name: (item.propertyName ?? item.name).text,
        from: statement.moduleSpecifier?.text,
      })
  }
}

export function convexEntries(files) {
  const modules = new Map()
  function load(file) {
    if (modules.has(file)) return modules.get(file)
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    )
    const module = { bindings: new Map(), exports: new Map() }
    modules.set(file, module)
    for (const statement of source.statements) {
      recordImports(statement, module)
      recordVariables(statement, module)
      recordExports(statement, module)
    }
    return module
  }
  function imported(file, from, name, seen) {
    if (from === 'convex/server') {
      if (
        /^(?:query|mutation|action|internalQuery|internalMutation|internalAction|httpAction)Generic$/.test(
          name,
        )
      )
        return 'registrar'
      return {
        defineSchema: 'schemaFactory',
        defineApp: 'configFactory',
        defineComponent: 'configFactory',
        httpRouter: 'httpFactory',
        cronJobs: 'cronsFactory',
      }[name]
    }
    if (!from.startsWith('.')) return
    const stem = resolve(dirname(file), from)
    const target = [
      stem,
      ...['.ts', '.js', '.mts', '.mjs', '.cts', '.cjs'].map((ext) => stem + ext),
    ].find((path) => /\.[cm]?[jt]s$/.test(path) && existsSync(path))
    if (!target) return
    if (name === '*') return { module: target }
    return binding(target, name, true, seen)
  }
  function expression(file, node, seen) {
    if (!node) return
    if (
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node)
    )
      return expression(file, node.expression, seen)
    if (ts.isIdentifier(node)) return binding(file, node.text, false, seen)
    if (ts.isObjectLiteralExpression(node)) return 'object'
    if (ts.isPropertyAccessExpression(node)) {
      const object = expression(file, node.expression, seen)
      if (object?.module) return binding(object.module, node.name.text, true, seen)
    }
    if (ts.isCallExpression(node)) {
      const factory = expression(file, node.expression, seen)
      return {
        registrar: 'registered',
        schemaFactory: 'schema',
        configFactory: 'config',
        httpFactory: 'http',
        cronsFactory: 'crons',
      }[factory]
    }
  }
  function binding(file, name, exported, seen = new Set()) {
    const key = `${file}|${exported}|${name}`
    if (seen.has(key)) return
    const next = new Set([...seen, key])
    const module = load(file)
    const value = (exported ? module.exports : module.bindings).get(name)
    if (!value) return
    if (value.from) return imported(file, value.from, value.name, next)
    if (value.expression) return expression(file, value.expression, next)
    if (value.name) return binding(file, value.name, false, next)
  }
  const entries = []
  const defaults = {
    'schema.ts': 'schema',
    'convex.config.ts': 'config',
    'http.ts': 'http',
    'crons.ts': 'crons',
    'auth.config.ts': 'object',
  }
  for (const file of files.filter((file) => file.startsWith('convex/'))) {
    const path = resolve(file)
    for (const name of load(path).exports.keys()) {
      const kind = binding(path, name, true)
      if (
        kind === 'registered' ||
        (name === 'default' && kind && kind === defaults[basename(file)])
      )
        entries.push({ file, name, kind })
    }
  }
  return entries
}
