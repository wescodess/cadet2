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

function testRoots(source) {
  const roots = new Set(['test', 'it', 'describe', 'suite'])
  for (const statement of source.statements.filter(ts.isImportDeclaration)) {
    const bindings = statement.importClause?.namedBindings
    if (
      bindings &&
      ts.isNamespaceImport(bindings) &&
      ['vitest', '@playwright/test'].includes(statement.moduleSpecifier.text)
    )
      roots.add(bindings.name.text)
    if (bindings && ts.isNamedImports(bindings)) {
      for (const binding of bindings.elements) {
        if (roots.has(binding.propertyName?.text ?? binding.name.text)) roots.add(binding.name.text)
      }
    }
  }
  return roots
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

function inspectSkip(node, roots, source, file, counts) {
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
}

export function scanFile(file, counts) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const roots = testRoots(source)
  function visit(node) {
    if (ts.isCallExpression(node)) inspectSkip(node, roots, source, file, counts)
    ts.forEachChild(node, visit)
  }
  visit(source)
}
