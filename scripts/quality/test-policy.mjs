import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { count, main, ratchet, sourceFiles } from './common.mjs'

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

function inspectSkip(node, roots, source, file, counts) {
  const names = chain(node.expression)
  if (!roots.has(names[0]) || isInnerCall(node)) return
  if (!names.some((name) => ['skip', 'fixme', 'todo', 'skipIf', 'runIf'].includes(name))) return
  const preceding = source.text.slice(Math.max(0, node.getFullStart()), node.getStart())
  const title = node.arguments.find((arg) => ts.isStringLiteralLike(arg))?.text ?? ''
  if (!ticket.test(preceding) && !ticket.test(title)) count(counts, file)
}

function rejectFocus(node, roots, source, file) {
  const names = chain(node)
  if (roots.has(names[0]) && names.includes('only')) {
    const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1
    throw new Error(`${file}:${line}: focused test is forbidden`)
  }
}

function scanFile(file, counts) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const roots = testRoots(source)
  function visit(node) {
    if (ts.isCallExpression(node)) inspectSkip(node, roots, source, file, counts)
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))
      rejectFocus(node, roots, source, file)
    ts.forEachChild(node, visit)
  }
  visit(source)
}

main(() => {
  const counts = {}
  for (const file of sourceFiles().filter(
    (file) => file.startsWith('tests/') || /\.(?:spec|test)\.[cm]?[jt]s$/.test(file),
  ))
    scanFile(file, counts)
  ratchet('test-policy', counts)
})
