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

function isDeclaration(node, roots) {
  const [root, ...rest] = canonical(chain(node.expression), roots)
  return (
    ['test', 'it'].includes(root) &&
    rest.every((name) => modifiers.has(name)) &&
    !isInnerCall(node) &&
    (rest.includes('todo') || node.arguments.slice(1).some(isFunction))
  )
}

function ownTest(node, roots) {
  if (isDeclaration(node, roots)) return node
  let scope = node.parent
  while (scope && !isFunction(scope)) scope = scope.parent
  const owner = scope?.parent
  if (
    owner &&
    ts.isCallExpression(owner) &&
    owner.arguments.includes(scope) &&
    isDeclaration(owner, roots)
  )
    return owner
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

function hasTicket(node) {
  return ticket.test(node.arguments.find((arg) => ts.isStringLiteralLike(arg))?.text ?? '')
}

function inspectSkip(node, roots, source, file, counts, ticketed) {
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
  const test = ownTest(node, roots)
  if (test && (hasTicket(node) || hasTicket(test))) ticketed.add(test)
  else count(counts, file)
}

function span(node, source) {
  const at = (position) => {
    const { line, character } = source.getLineAndCharacterOfPosition(position)
    return [line + 1, character + 1]
  }
  return [at(node.getStart(source)), at(node.arguments.pos)]
}

function compare(left, right) {
  return left[0] - right[0] || left[1] - right[1]
}

export function credited(tests = [], location) {
  if (!location) return false
  const at = [location.line, location.column]
  const matches = tests.filter(
    ({ span: [from, to] }) => compare(from, at) <= 0 && compare(at, to) < 0,
  )
  return matches.length === 1 && matches[0].ticketed
}

export function scanFile(file, counts, tests = {}) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const roots = testRoots(source)
  const declared = []
  const ticketed = new Set()
  function visit(node) {
    if (ts.isCallExpression(node)) {
      if (isDeclaration(node, roots)) declared.push(node)
      inspectSkip(node, roots, source, file, counts, ticketed)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  tests[file] = [
    ...(tests[file] ?? []),
    ...declared.map((test) => ({ span: span(test, source), ticketed: ticketed.has(test) })),
  ]
}
