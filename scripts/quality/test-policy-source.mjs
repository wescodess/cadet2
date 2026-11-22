import { readFileSync } from 'node:fs'
import ts from 'typescript'

const skipping = new Set(['skip', 'fixme', 'todo', 'skipIf', 'runIf'])

function member(node) {
  if (ts.isPropertyAccessExpression(node)) return node.name.text
  if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression))
    return node.argumentExpression.text
  if (ts.isBindingElement(node)) {
    const key = node.propertyName ?? node.name
    if (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) return key.text
  }
}

function chain(node) {
  if (ts.isIdentifier(node)) return [node.text]
  if (ts.isPropertyAccessExpression(node)) return [...chain(node.expression), node.name.text]
  if (ts.isElementAccessExpression(node) || ts.isCallExpression(node)) return chain(node.expression)
  return []
}

function isFunction(node) {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node)
}

function isDescribeCallback(node) {
  const call = node.parent
  return (
    isFunction(node) &&
    ts.isCallExpression(call) &&
    chain(call.expression).some((name) => name === 'describe' || name === 'suite')
  )
}

function collecting(node) {
  for (let scope = node.parent; scope; scope = scope.parent) {
    if (ts.isClassLike(scope) || (ts.isFunctionLike(scope) && !isDescribeCallback(scope)))
      return false
  }
  return true
}

function declares(node, name) {
  const call = node.parent
  if (!ts.isCallExpression(call) || call.expression !== node) return false
  const [first, ...rest] = call.arguments
  return (
    first !== undefined &&
    !isFunction(first) &&
    (name === 'todo' || rest.some(isFunction)) &&
    collecting(call)
  )
}

export function unobservedSkips(file) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  let total = 0
  function visit(node) {
    const name = member(node)
    if (skipping.has(name) && !declares(node, name)) total += 1
    ts.forEachChild(node, visit)
  }
  visit(source)
  return total
}
