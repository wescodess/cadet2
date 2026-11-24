import { readFileSync } from 'node:fs'
import ts from 'typescript'

export function executableDefaults(selected) {
  const file = 'qa/acceptance/28/playwright.config.ts'
  if (!selected.includes(file)) return []
  const ast = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const imported = new Set()
  for (const statement of ast.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      statement.moduleSpecifier.text !== '@playwright/test' ||
      statement.importClause?.isTypeOnly
    )
      continue
    const bindings = statement.importClause?.namedBindings
    if (!bindings || !ts.isNamedImports(bindings)) continue
    for (const item of bindings.elements) {
      if (!item.isTypeOnly && (item.propertyName ?? item.name).text === 'defineConfig')
        imported.add(item.name.text)
    }
  }
  const expression = ast.statements.find(
    (s) => ts.isExportAssignment(s) && !s.isExportEquals,
  )?.expression
  if (
    !expression ||
    !ts.isCallExpression(expression) ||
    !ts.isIdentifier(expression.expression) ||
    !imported.has(expression.expression.text) ||
    !expression.arguments[0] ||
    !ts.isObjectLiteralExpression(expression.arguments[0])
  )
    throw new Error(`${file}: unsupported Playwright configuration authority`)
  const properties = new Map(
    expression.arguments[0].properties
      .filter(ts.isPropertyAssignment)
      .map((p) => [p.name.getText(ast), p.initializer.getText(ast)]),
  )
  if (
    !['"."', "'.'"].includes(properties.get('testDir')) ||
    properties.get('testMatch') !== '/journeys\\.spec\\.ts/' ||
    !selected.includes('qa/acceptance/28/journeys.spec.ts')
  )
    throw new Error(`${file}: expected the declared journeys.spec.ts entry in the same directory`)
  return [{ file, name: 'default', kind: 'playwright-config' }]
}
