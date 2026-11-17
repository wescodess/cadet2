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

function scanFile(file, counts) {
  const text = readFileSync(file, 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const roots = new Set(['test', 'it', 'describe', 'suite'])
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    const bindings = statement.importClause?.namedBindings
    if (bindings && ts.isNamedImports(bindings)) {
      for (const binding of bindings.elements) {
        if (roots.has(binding.propertyName?.text ?? binding.name.text)) roots.add(binding.name.text)
      }
    }
  }
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const names = chain(node.expression)
      if (roots.has(names[0])) {
        const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1
        if (names.includes('only')) throw new Error(`${file}:${line}: focused test is forbidden`)
        if (names.some((name) => ['skip', 'fixme', 'todo', 'skipIf', 'runIf'].includes(name))) {
          const preceding = text.slice(Math.max(0, node.getFullStart()), node.getStart())
          const title = node.arguments.find((arg) => ts.isStringLiteralLike(arg))?.text ?? ''
          if (!ticket.test(preceding) && !ticket.test(title)) count(counts, file)
        }
      }
    }
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
