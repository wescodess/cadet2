import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { count } from './common.mjs'

const ticket = /(?:#\d+|https:\/\/github\.com\/[^\s]+\/issues\/\d+)/

function chain(node) {
  if (ts.isIdentifier(node)) return [node.text]
  if (ts.isPropertyAccessExpression(node)) return [...chain(node.expression), node.name.text]
  if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression))
    return [...chain(node.expression), node.argumentExpression.text]
  if (ts.isCallExpression(node)) return chain(node.expression)
  return []
}

const modifiers = new Set([
  'skip',
  'only',
  'fixme',
  'todo',
  'fail',
  'fails',
  'slow',
  'concurrent',
  'sequential',
  'shuffle',
  'skipIf',
  'runIf',
  'each',
  'for',
])

function testRoots(source) {
  const roots = new Map(['test', 'it', 'describe', 'suite'].map((name) => [name, name]))
  for (const statement of source.statements.filter(ts.isImportDeclaration)) {
    const bindings = statement.importClause?.namedBindings
    if (
      bindings &&
      ts.isNamespaceImport(bindings) &&
      ['vitest', '@playwright/test'].includes(statement.moduleSpecifier.text)
    )
      roots.set(bindings.name.text, null)
    if (bindings && ts.isNamedImports(bindings)) {
      for (const binding of bindings.elements) {
        const imported = binding.propertyName?.text ?? binding.name.text
        if (roots.has(imported)) roots.set(binding.name.text, roots.get(imported))
      }
    }
  }
  return roots
}

function canonical(names, roots) {
  if (!roots.has(names[0])) return []
  const root = roots.get(names[0])
  return root ? [root, ...names.slice(1)] : names.slice(1)
}

function isFunction(node) {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node)
}

function isGroup(node, roots) {
  return canonical(chain(node.expression), roots).some((name) =>
    ['describe', 'suite'].includes(name),
  )
}

function isDeclaration(node, roots) {
  const [root, ...rest] = canonical(chain(node.expression), roots)
  return (
    ['test', 'it'].includes(root) &&
    rest.every((name) => modifiers.has(name)) &&
    !isInnerCall(node) &&
    (rest.includes('todo') || node.arguments.slice(1).some(isFunction))
  )
}

function declarations(node, roots) {
  const found = []
  function visit(child) {
    if (ts.isCallExpression(child) && isDeclaration(child, roots)) found.push(child)
    ts.forEachChild(child, visit)
  }
  visit(node)
  return found
}

function skippedTests(node, roots, source) {
  if (isGroup(node, roots))
    return node.arguments.filter(isFunction).flatMap((callback) => declarations(callback, roots))
  if (isDeclaration(node, roots)) return [node]
  let scope = node.parent
  while (scope && !isFunction(scope)) scope = scope.parent
  if (!scope) return declarations(source, roots)
  const owner = scope.parent
  if (ts.isCallExpression(owner) && owner.arguments.includes(scope)) {
    if (isGroup(owner, roots)) return declarations(scope, roots)
    if (isDeclaration(owner, roots)) return [owner]
  }
  return [node]
}

function isInnerCall(node) {
  let current = node
  while (
    (ts.isPropertyAccessExpression(current.parent) ||
      ts.isElementAccessExpression(current.parent)) &&
    current.parent.expression === current
  )
    current = current.parent
  return ts.isCallExpression(current.parent) && current.parent.expression === current
}

function hasTicket(node, roots, source) {
  for (let current = node; current; current = current.parent) {
    if (!ts.isCallExpression(current)) continue
    if (current !== node && !roots.has(chain(current.expression)[0])) continue
    const preceding = source.text.slice(Math.max(0, current.getFullStart()), current.getStart())
    const title = current.arguments.find((arg) => ts.isStringLiteralLike(arg))?.text ?? ''
    if (ticket.test(preceding) || ticket.test(title)) return true
  }
  return false
}

function inspectSkip(node, roots, source, file, counts, credited) {
  const names = chain(node.expression)
  if (isInnerCall(node)) return
  const modifier = names.some((name) => ['skip', 'fixme', 'todo', 'skipIf', 'runIf'].includes(name))
  const options = node.arguments.some(
    (arg) =>
      ts.isObjectLiteralExpression(arg) &&
      arg.properties.some(
        (property) =>
          ts.isPropertyAssignment(property) &&
          ['skip', 'todo'].includes(property.name.getText(source)),
      ),
  )
  if (!(roots.has(names[0]) && (modifier || options)) && names.at(-1) !== 'skip') return
  if (!hasTicket(node, roots, source)) count(counts, file)
  else for (const test of skippedTests(node, roots, source)) credited.add(test)
}

export function scanFile(file, counts, ticketed = {}) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const roots = testRoots(source)
  const credited = new Set()
  function visit(node) {
    if (ts.isCallExpression(node)) inspectSkip(node, roots, source, file, counts, credited)
    ts.forEachChild(node, visit)
  }
  visit(source)
  if (credited.size) ticketed[file] = (ticketed[file] ?? 0) + credited.size
}
