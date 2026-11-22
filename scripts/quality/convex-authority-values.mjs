import ts from 'typescript'
import { authorityError, builderNames, unwrap } from './convex-authority-inputs.mjs'

const protectedKinds = new Set([
  'registrar',
  'factory',
  'namespace',
  'provider',
  'issuer',
  'candidate',
  'validator',
  'fields',
  'table',
  'schema',
  'http',
  'crons',
  'config',
  'auth',
])
const badKeys = new Set(['__proto__', 'prototype', 'constructor'])
const noArguments = new Set(['any', 'boolean', 'null', 'number', 'string'])
const exported = (node) => node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
const declared = (node) => node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DeclareKeyword)
const dormant = (node) => ts.isArrowFunction(node) || ts.isFunctionExpression(node)
const role = (kind, detail = {}) => ({ kind, deps: new Set(), ...detail })
function dependencies(target, values) {
  for (const value of values) for (const dependency of value.deps) target.deps.add(dependency)
  return target
}
function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text
  return null
}
function member(node) {
  if (ts.isPropertyAccessExpression(node) && !node.questionDotToken)
    return { object: node.expression, name: node.name.text }
  if (
    ts.isElementAccessExpression(node) &&
    !node.questionDotToken &&
    ts.isStringLiteral(node.argumentExpression)
  )
    return { object: node.expression, name: node.argumentExpression.text }
  return null
}
function primitive(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return { value: node.text }
  if (ts.isNumericLiteral(node)) return { value: Number(node.text) }
  if (ts.isBigIntLiteral(node)) return { value: BigInt(node.text.replaceAll('_', '').slice(0, -1)) }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return { value: true }
  if (node.kind === ts.SyntaxKind.FalseKeyword) return { value: false }
  if (node.kind === ts.SyntaxKind.NullKeyword) return { value: null }
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  )
    return { value: -Number(node.operand.text) }
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isBigIntLiteral(node.operand)
  )
    return { value: -BigInt(node.operand.text.replaceAll('_', '').slice(0, -1)) }
  return null
}
function typePosition(node) {
  for (let current = node; current.parent; current = current.parent) {
    if (
      ts.isTypeNode(current) ||
      ts.isTypeAliasDeclaration(current) ||
      ts.isInterfaceDeclaration(current) ||
      declared(current)
    )
      return true
    if (ts.isExpression(current) && current !== node) return false
  }
  return false
}
function nonReference(node) {
  const parent = node.parent
  if (typePosition(node)) return true
  if (ts.isImportSpecifier(parent) || ts.isImportClause(parent) || ts.isNamespaceImport(parent))
    return true
  if (ts.isExportSpecifier(parent) && parent.propertyName && parent.name === node) return true
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return true
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true
  return false
}
function writingBinding(node) {
  let current = node
  while (
    current.parent &&
    (ts.isArrayLiteralExpression(current.parent) ||
      ts.isObjectLiteralExpression(current.parent) ||
      ts.isSpreadElement(current.parent) ||
      ts.isShorthandPropertyAssignment(current.parent) ||
      ts.isPropertyAssignment(current.parent))
  )
    current = current.parent
  const parent = current.parent
  if (ts.isBinaryExpression(parent) && parent.left === current)
    return (
      parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    )
  return (
    (ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) &&
    [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(parent.operator)
  )
}

export class DeclarationValues {
  constructor(model, checker, modules, snapshot) {
    Object.assign(this, { model, checker, modules, snapshot })
    this.bindings = new Map()
    this.exports = new Map()
    this.allowed = new Set()
    this.references = []
    this.generated = []
    this.claims = []
    this.statements = []
    const fact = snapshot.facts.find((fact) => fact.file === model.file)
    this.defaultLocal =
      fact.defaults.find((item) => item.local)?.local ??
      fact.exports.find((item) => item.name === 'default')?.local
  }
  fail(code, detail, node) {
    const location = node
      ? ` at ${this.model.ast.getLineAndCharacterOfPosition(node.getStart()).line + 1}`
      : ''
    throw authorityError(this.model.file, code, detail + location, this.model.chain)
  }
  symbol(node) {
    if (ts.isExportSpecifier(node.parent))
      return this.checker.getExportSpecifierLocalTargetSymbol(node.parent)
    if (ts.isShorthandPropertyAssignment(node.parent))
      return this.checker.getShorthandAssignmentValueSymbol(node.parent)
    return this.checker.getSymbolAtLocation(node)
  }
  put(name, value, declaration) {
    const symbol = this.symbol(name)
    if (!symbol || this.bindings.has(symbol))
      this.fail('import_binding', `duplicate or ambiguous binding ${name.text}`, name)
    const record = {
      name: name.text,
      symbol,
      value,
      declaration,
      protected: protectedKinds.has(value.kind),
      exports: [],
    }
    this.bindings.set(symbol, record)
    return record
  }
  read(node, context = 'value') {
    const record = this.bindings.get(this.symbol(node))
    if (!record) this.fail('value_role', `unknown initializer binding ${node.text}`, node)
    if (
      ['candidate', 'registrar', 'factory', 'namespace', 'provider'].includes(record.value.kind) &&
      context !== 'callee' &&
      context !== 'generated'
    )
      this.fail('authority_reference', `unsupported alias/use of ${node.text}`, node)
    this.allowed.add(node)
    const value = { ...record.value, deps: new Set(record.value.deps) }
    if (value.kind !== 'function' && value.kind !== 'sdk-callable') value.deps.add(record)
    return value
  }
  imported(binding, edge) {
    if (edge.target.kind === 'sdk') return this.sdkRole(edge.specifier, binding.imported)
    const target = this.modules.get(`${edge.target.file}|${this.model.platform}`)
    const record = target?.values?.exports.get(binding.imported)
    if (!record)
      this.fail(
        'import_binding',
        `missing runtime export ${binding.imported} from ${edge.target.file}`,
      )
    if (
      ['registrar', 'factory', 'namespace', 'candidate'].includes(record.value.kind) &&
      edge.target.file !== this.snapshot.generated
    )
      this.fail('import_binding', 'ordinary helper cannot export registrar authority')
    return { ...record.value, deps: new Set([...record.value.deps, record]) }
  }
  sdkRole(specifier, name) {
    if (specifier === 'convex/server') {
      const builder = builderNames.find((builder) => `${builder}Generic` === name)
      if (builder) return role('registrar', { builder })
      if (['defineSchema', 'defineTable', 'httpRouter', 'cronJobs', 'defineApp'].includes(name))
        return role('factory', { factory: name })
      if (name === 'paginationOptsValidator') return this.model.sdkPagination
    }
    if (specifier === 'convex/values' && name === 'v') return role('namespace')
    if (specifier === 'convex/values' && ['ConvexError', 'convexToJson'].includes(name))
      return role('sdk-callable')
    if (specifier === '@convex-dev/better-auth/auth-config' && name === 'getAuthConfigProvider')
      return role('provider')
    this.fail('import_binding', `unsupported canonical SDK binding ${specifier}:${name}`)
  }
  importBindings(statement, edge) {
    if (statement.attributes || !statement.importClause)
      this.fail('import_binding', 'attributes or side-effect-only import', statement)
    const clause = statement.importClause,
      named = clause.namedBindings
    if (clause.name) {
      if (
        edge.target.kind !== 'local' ||
        edge.target.file !== this.snapshot.defaults.find((row) => row.slot === 'schema')?.file
      )
        this.fail('import_binding', 'only the exact root schema default may be imported', statement)
      this.put(clause.name, this.imported({ imported: 'default' }, edge), clause.name).imported =
        true
    }
    if (named && !ts.isNamedImports(named))
      this.fail('import_binding', 'namespace helper imports are unsupported', named)
    for (const item of named?.elements ?? []) {
      if (item.isTypeOnly) continue
      this.put(
        item.name,
        this.imported({ imported: (item.propertyName ?? item.name).text }, edge),
        item.name,
      ).imported = true
    }
    if (!clause.name && !named?.elements.some((item) => !item.isTypeOnly))
      this.fail('import_binding', 'empty runtime import is a side effect', statement)
  }
  imports() {
    for (const statement of this.model.ast.statements.filter(ts.isImportDeclaration)) {
      const edge = this.model.edges.find((edge) => edge.start === statement.getStart())
      if (!edge?.runtime) continue
      if (
        this.model.file === this.snapshot.generated &&
        (edge.specifier !== 'convex/server' ||
          edge.bindings.some(
            (binding) =>
              !binding.typeOnly &&
              !builderNames.some((name) => `${name}Generic` === binding.imported),
          ))
      )
        this.fail(
          'generated_mapping',
          'generated runtime imports must be the canonical seven builders',
          statement,
        )
      this.importBindings(statement, edge)
    }
  }
  objectProperty(property, fields) {
    if (ts.isSpreadAssignment(property)) {
      const value = this.evaluate(property.expression)
      if (value.kind !== 'fields')
        this.fail('value_role', 'spread requires a proven field map', property)
      for (const [name, field] of value.fields) this.addField(fields, name, field, property)
      return value
    }
    if (!ts.isPropertyAssignment(property))
      this.fail('module_initialization', 'only static property assignments are supported', property)
    const name = propertyName(property.name)
    if (name === null)
      this.fail('module_initialization', 'computed property is unsupported', property)
    const value = this.evaluate(property.initializer)
    this.addField(fields, name, value, property)
    return value
  }
  literalObject(node, fieldsOnly = false) {
    if (!ts.isObjectLiteralExpression(node))
      this.fail('value_role', 'expected a finite field map', node)
    const fields = new Map(),
      values = []
    for (const property of node.properties) values.push(this.objectProperty(property, fields))
    const validators =
      (fieldsOnly || values.length > 0) &&
      [...fields.values()].every((value) => value.kind === 'validator')
    if (fieldsOnly && !validators)
      this.fail('value_role', 'field map contains non-validator data', node)
    if (!validators && values.some((value) => !['data', 'state'].includes(value.kind)))
      this.fail('value_role', 'object contains an unsupported value role', node)
    const kind = validators
      ? 'fields'
      : values.some((value) => value.kind === 'state')
        ? 'state'
        : 'data'
    return dependencies(role(kind, { fields }), values)
  }
  addField(fields, name, value, node) {
    if (badKeys.has(name) || fields.has(name))
      this.fail('value_role', `duplicate/prototype-sensitive key ${name}`, node)
    fields.set(name, value)
  }
  array(node) {
    const values = node.elements.map((element) => this.evaluate(element))
    if (values.some((value) => !['data', 'state'].includes(value.kind)))
      this.fail('value_role', 'array contains unsupported value', node)
    return dependencies(
      role(values.some((value) => value.kind === 'state') ? 'state' : 'data', { array: values }),
      values,
    )
  }
  intrinsic(node) {
    if (!ts.isIdentifier(node.expression) || this.symbol(node.expression))
      this.fail(
        'module_initialization',
        'constructor must be an unshadowed trusted intrinsic',
        node,
      )
    const args = node.arguments ?? []
    if (node.expression.text === 'TextEncoder' && args.length === 0) return role('state')
    if (
      node.expression.text !== 'Set' ||
      args.length !== 1 ||
      !ts.isArrayLiteralExpression(unwrap(args[0]))
    )
      this.fail(
        'module_initialization',
        'only literal Set and zero-argument TextEncoder initialization is supported',
        node,
      )
    const data = this.array(unwrap(args[0]))
    if (data.kind !== 'data') this.fail('value_role', 'Set initializer requires literal data', node)
    return dependencies(role('state'), [data])
  }
  validatorOperand(node, method, namespace) {
    const value = this.evaluate(node.arguments[0])
    if (['array', 'optional'].includes(method) && value.kind === 'validator') {
      const detail = method === 'optional' && value.fields ? { fields: value.fields } : {}
      return dependencies(role('validator', detail), [namespace, value])
    }
    const literal = value.kind === 'data' && Object.hasOwn(value, 'literal')
    const valid = method === 'id' ? typeof value.literal === 'string' : value.literal !== null
    if (['literal', 'id'].includes(method) && literal && valid)
      return dependencies(role('validator'), [namespace, value])
    this.fail('value_role', `unsupported validator operand ${method}`, node)
  }
  validator(node, method, namespace) {
    const args = node.arguments
    if (noArguments.has(method) && args.length === 0)
      return dependencies(role('validator'), [namespace])
    if (method === 'object' && args.length === 1) {
      const fields = this.fieldMap(args[0])
      return dependencies(role('validator', { fields: fields.fields }), [namespace, fields])
    }
    if (['array', 'optional', 'literal', 'id'].includes(method) && args.length === 1)
      return this.validatorOperand(node, method, namespace)
    if (method === 'union' && args.length > 0) {
      const values = args.map((arg) => this.evaluate(arg))
      if (values.every((value) => value.kind === 'validator'))
        return dependencies(role('validator'), [namespace, ...values])
    }
    this.fail('value_role', `unsupported validator method/arity/operand ${method}`, node)
  }
  fieldMap(node) {
    node = unwrap(node)
    const value = ts.isObjectLiteralExpression(node)
      ? this.literalObject(node, true)
      : this.evaluate(node)
    if (value.kind === 'data' && value.fields?.size === 0) return { ...value, kind: 'fields' }
    if (value.kind !== 'fields')
      this.fail('value_role', 'expected a proven validator field map', node)
    return value
  }
  projection(node) {
    const part = member(node)
    if (!part) this.fail('value_role', 'dynamic member projection is unsupported', node)
    const value = this.evaluate(part.object)
    if (part.name === 'fields' && value.kind === 'validator' && value.fields)
      return dependencies(role('fields', { fields: value.fields }), [value])
    if (part.name === 'tables' && value.kind === 'schema' && value.rootSchema)
      return { ...value, kind: 'tables' }
    if (value.kind === 'tables' && value.tables.has(part.name))
      return {
        ...value.tables.get(part.name),
        schemaProjection: true,
        deps: new Set([...value.deps, ...value.tables.get(part.name).deps]),
      }
    if (part.name === 'validator' && value.kind === 'table' && value.schemaProjection)
      return dependencies(role('validator', { fields: value.fields }), [value])
    this.fail('value_role', `unsupported projection ${part.name}`, node)
  }
  definition(node, registrar) {
    if (node.arguments.length !== 1)
      this.fail('value_role', 'registrar requires one definition', node)
    const input = unwrap(node.arguments[0]),
      values = []
    if (dormant(input) || ts.isIdentifier(input)) {
      const handler = this.evaluate(input)
      if (handler.kind !== 'function')
        this.fail('value_role', 'handler must be a dormant function', input)
    } else {
      if (!ts.isObjectLiteralExpression(input))
        this.fail('value_role', 'registration requires a definition object', input)
      const keys = new Set()
      for (const property of input.properties) this.definitionProperty(property, keys, values)
      if (!keys.has('handler') || !keys.has('args'))
        this.fail('value_role', 'definition requires args and handler', input)
    }
    if (
      this.model.platform === 'node' &&
      !['action', 'internalAction', 'httpAction'].includes(registrar.builder)
    )
      this.fail('value_role', 'use node only supports action/http-action declarations', node)
    return dependencies(role('candidate', { builder: registrar.builder }), [registrar, ...values])
  }
  definitionProperty(property, keys, values) {
    if (!ts.isPropertyAssignment(property))
      this.fail('value_role', 'definition spreads/accessors are unsupported', property)
    const name = propertyName(property.name)
    if (!['args', 'returns', 'handler'].includes(name) || keys.has(name))
      this.fail('value_role', 'unknown/duplicate definition property', property)
    keys.add(name)
    const value =
      name === 'args'
        ? this.fieldMapOrValidator(property.initializer)
        : this.evaluate(property.initializer)
    if (name === 'handler' && value.kind !== 'function')
      this.fail('value_role', 'handler factories are unsupported', property)
    if (name === 'returns' && value.kind !== 'validator')
      this.fail('value_role', 'returns requires a validator', property)
    if (name !== 'handler') values.push(value)
  }
  fieldMapOrValidator(node) {
    if (ts.isObjectLiteralExpression(unwrap(node))) return this.fieldMap(node)
    const value = this.evaluate(node)
    if (!['validator', 'fields'].includes(value.kind))
      this.fail('value_role', 'args must be validator data', node)
    return value
  }
  factory(node, callee) {
    const args = node.arguments
    if (callee.factory === 'defineTable' && args.length === 1) {
      const value = this.fieldMapOrValidator(args[0])
      if (!value.fields)
        this.fail('value_role', 'table requires an object validator or field map', node)
      return dependencies(role('table', { fields: value.fields, indexes: new Map() }), [
        callee,
        value,
      ])
    }
    if (callee.factory === 'defineSchema' && args.length === 1) return this.schema(node, callee)
    const kind = { httpRouter: 'http', cronJobs: 'crons', defineApp: 'config' }[callee.factory]
    if (kind && args.length === 0) return dependencies(role(kind), [callee])
    this.fail('value_role', `unsupported factory recipe ${callee.factory}`, node)
  }
  schema(node, callee) {
    const input = unwrap(node.arguments[0]),
      tables = new Map(),
      values = []
    if (!ts.isObjectLiteralExpression(input))
      this.fail('value_role', 'schema requires a finite table object', input)
    for (const property of input.properties) {
      if (!ts.isPropertyAssignment(property))
        this.fail('value_role', 'unsupported schema property', property)
      const name = propertyName(property.name),
        value = this.evaluate(property.initializer)
      if (name === null || value.kind !== 'table')
        this.fail('value_role', 'schema requires named proven tables', property)
      this.addField(tables, name, value, property)
      values.push(value)
    }
    return dependencies(role('schema', { tables, rootSchema: this.model.slot === 'schema' }), [
      callee,
      ...values,
    ])
  }
  index(node, value) {
    if (node.arguments.length !== 2)
      this.fail('value_role', 'index requires two literal arguments', node)
    const name = primitive(unwrap(node.arguments[0])),
      fields = unwrap(node.arguments[1])
    if (
      typeof name?.value !== 'string' ||
      !ts.isArrayLiteralExpression(fields) ||
      fields.elements.some((field) => !ts.isStringLiteral(field)) ||
      value.indexes.has(name.value)
    )
      this.fail('value_role', 'index name/fields must be unique literals', node)
    return {
      ...value,
      indexes: new Map([
        ...value.indexes,
        [name.value, fields.elements.map((field) => field.text)],
      ]),
    }
  }
  call(node) {
    if (node.questionDotToken)
      this.fail('module_initialization', 'optional calls are unsupported', node)
    const expression = unwrap(node.expression)
    if (ts.isIdentifier(expression)) {
      const callee = this.read(expression, 'callee')
      if (callee.kind === 'registrar') return this.definition(node, callee)
      if (callee.kind === 'factory') return this.factory(node, callee)
      this.fail('module_initialization', 'ordinary helper/unknown call during initialization', node)
    }
    const part = member(expression)
    if (!part) this.fail('module_initialization', 'unknown initializer call', node)
    const value = ts.isIdentifier(unwrap(part.object))
      ? this.read(unwrap(part.object), 'callee')
      : this.evaluate(part.object)
    if (value.kind === 'namespace') return this.validator(node, part.name, value)
    if (value.kind === 'table' && part.name === 'index') {
      if (!ts.isCallExpression(unwrap(part.object)))
        this.fail('module_initialization', 'table indexes require an immediate factory chain', node)
      return this.index(node, value)
    }
    this.fail('module_initialization', 'unsupported initializer method call', node)
  }
  issuer(node) {
    const parts = []
    function flatten(node) {
      node = unwrap(node)
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
      ) {
        flatten(node.left)
        flatten(node.right)
      } else parts.push(node)
    }
    flatten(node)
    const names = parts.map((part) => part.getText(this.model.ast))
    const valid = [
      ['process.env.CONVEX_SITE_URL', "'http://localhost:3000'"],
      ['process.env.CADET_AUTH_ISSUER', 'process.env.CONVEX_SITE_URL', "'http://localhost:3000'"],
    ].some(
      (expected) =>
        expected.length === names.length &&
        expected.every((value, index) =>
          index === expected.length - 1
            ? primitive(parts[index])?.value === 'http://localhost:3000'
            : value === names[index],
        ),
    )
    if (!valid) this.fail('value_role', 'unsupported auth issuer fallback', node)
    for (const part of parts.slice(0, -1)) {
      const identifier = part.expression?.expression
      const symbol = identifier && this.symbol(identifier)
      if (
        symbol &&
        !symbol.declarations?.every((declaration) =>
          declared(declaration.parent?.parent ?? declaration),
        )
      )
        this.fail('authority_reference', 'shadowed process auth initializer', part)
    }
    return role('issuer')
  }
  auth(node) {
    node = unwrap(node)
    if (!ts.isObjectLiteralExpression(node) || node.properties.length !== 1)
      this.fail('value_role', 'auth default requires only providers', node)
    const property = node.properties[0]
    if (
      !ts.isPropertyAssignment(property) ||
      propertyName(property.name) !== 'providers' ||
      !ts.isArrayLiteralExpression(unwrap(property.initializer))
    )
      this.fail('value_role', 'auth providers must be a finite array', property)
    const providers = unwrap(property.initializer).elements.map((provider) =>
      this.provider(unwrap(provider)),
    )
    return dependencies(role('auth'), providers)
  }
  provider(node) {
    if (!ts.isObjectLiteralExpression(node))
      this.fail('value_role', 'auth provider must be a plain object', node)
    if (!node.properties.some(ts.isSpreadAssignment)) return this.literalObject(node)
    if (node.properties.length !== 3)
      this.fail('value_role', 'unsupported auth provider override', node)
    const [spread, issuer, jwks] = node.properties
    const call = ts.isSpreadAssignment(spread) && unwrap(spread.expression)
    if (
      !call ||
      !ts.isCallExpression(call) ||
      !ts.isIdentifier(call.expression) ||
      call.arguments.length
    )
      this.fail('value_role', 'unsupported auth provider spread', spread)
    const callee = this.read(call.expression, 'callee')
    if (callee.kind !== 'provider')
      this.fail('value_role', 'unsupported auth provider factory', call)
    const issuerValue = ts.isPropertyAssignment(issuer) && this.evaluate(issuer.initializer)
    if (
      !ts.isPropertyAssignment(issuer) ||
      propertyName(issuer.name) !== 'issuer' ||
      issuerValue.kind !== 'issuer'
    )
      this.fail('value_role', 'unsupported auth provider issuer', issuer)
    if (!ts.isPropertyAssignment(jwks) || propertyName(jwks.name) !== 'jwks')
      this.fail('value_role', 'unsupported JWKS override', jwks)
    const template = unwrap(jwks.initializer)
    if (
      !ts.isTemplateExpression(template) ||
      template.head.text !== '' ||
      template.templateSpans.length !== 1 ||
      template.templateSpans[0].literal.text !== '/api/auth/convex/jwks'
    )
      this.fail('value_role', 'unsupported JWKS template', template)
    const jwksValue = this.evaluate(template.templateSpans[0].expression)
    if (jwksValue.kind !== 'issuer') this.fail('value_role', 'unsupported JWKS issuer', template)
    return dependencies(role('data'), [callee, issuerValue, jwksValue])
  }
  evaluate(input) {
    const node = unwrap(input)
    if (!node) this.fail('module_initialization', 'missing initializer')
    const literal = primitive(node)
    if (literal) return role('data', { literal: literal.value })
    if (dormant(node)) return role('function')
    if (ts.isIdentifier(node)) return this.read(node)
    if (ts.isObjectLiteralExpression(node)) return this.literalObject(node)
    if (ts.isArrayLiteralExpression(node)) return this.array(node)
    if (ts.isCallExpression(node)) return this.call(node)
    if (ts.isNewExpression(node)) return this.intrinsic(node)
    if (this.model.slot === 'auth.config' && ts.isBinaryExpression(node)) return this.issuer(node)
    if (member(node)) return this.projection(node)
    this.fail('module_initialization', `unsupported initializer ${ts.SyntaxKind[node.kind]}`, node)
  }
  exportBinding(name, record, node) {
    if (this.exports.has(name) || record.exports.length)
      this.fail('import_binding', 'duplicate export or multiple export edges', node)
    if (
      ['factory', 'namespace', 'provider'].includes(record.value.kind) ||
      (record.value.kind === 'registrar' && this.model.file !== this.snapshot.generated)
    )
      this.fail('authority_reference', 'ordinary registrar/factory export is unsupported', node)
    if (record.imported && this.model.file !== this.snapshot.generated)
      this.fail('import_binding', 'runtime helper barrels are unsupported', node)
    record.exports.push(name)
    this.exports.set(name, record)
    if (node) this.allowed.add(node)
  }
  variableValue(declaration) {
    const node = unwrap(declaration.initializer)
    const generated = this.model.file === this.snapshot.generated
    const authDefault =
      this.model.slot === 'auth.config' && this.defaultLocal === declaration.name.text
    const value =
      generated && ts.isIdentifier(node)
        ? this.read(node, 'generated')
        : authDefault
          ? this.auth(node)
          : this.evaluate(node)
    if (
      value.kind === 'sdk-callable' ||
      value.kind === 'tables' ||
      (value.kind === 'function' && !dormant(node)) ||
      (ts.isIdentifier(node) && ['schema', 'http', 'crons', 'config'].includes(value.kind))
    )
      this.fail('authority_reference', 'unsupported initializer value alias', node)
    return value
  }
  variable(statement) {
    if (!(statement.declarationList.flags & ts.NodeFlags.Const))
      this.fail('mutable_binding', 'top-level runtime bindings must be const', statement)
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name))
        this.fail('mutable_binding', 'destructuring authority is unsupported', declaration)
      const value = this.variableValue(declaration)
      if (this.model.file === this.snapshot.generated)
        this.generatedBinding(declaration.name.text, value, statement)
      const record = this.put(declaration.name, value, declaration.name)
      if (exported(statement)) this.exportBinding(declaration.name.text, record)
    }
  }
  generatedBinding(name, value, node) {
    if (
      !builderNames.includes(name) ||
      value.kind !== 'registrar' ||
      value.builder !== name ||
      (!ts.isExportDeclaration(node) && !exported(node))
    )
      this.fail(
        'generated_mapping',
        'generated server must contain exactly seven direct immutable mappings',
        node,
      )
    this.generated.push({ name, builder: value.builder })
  }
  exportDeclaration(statement) {
    if (statement.isTypeOnly) return
    const clause = statement.exportClause
    if (!clause || !ts.isNamedExports(clause))
      this.fail('import_binding', 'runtime export-star is unsupported', statement)
    if (clause.elements.length && clause.elements.every((item) => item.isTypeOnly)) return
    if (statement.moduleSpecifier) {
      if (this.model.file !== this.snapshot.generated)
        this.fail('import_binding', 'runtime barrels are unsupported', statement)
      const edge = this.model.edges.find((edge) => edge.start === statement.getStart())
      for (const item of clause.elements.filter((item) => !item.isTypeOnly)) {
        const value = this.imported({ imported: (item.propertyName ?? item.name).text }, edge)
        this.generatedBinding(item.name.text, value, statement)
        this.exportBinding(item.name.text, {
          name: item.name.text,
          declaration: item,
          value,
          exports: [],
          protected: true,
        })
      }
      return
    }
    for (const item of clause.elements.filter((item) => !item.isTypeOnly)) {
      const identifier = item.propertyName ?? item.name
      const record = this.bindings.get(this.symbol(identifier))
      if (!record) this.fail('import_binding', 'export is not a local declared binding', item)
      this.exportBinding(item.name.text, record, identifier)
    }
  }
  defaultExport(statement) {
    if (statement.isExportEquals || this.model.file === this.snapshot.generated)
      this.fail('import_binding', 'unsupported default/export assignment', statement)
    const node = unwrap(statement.expression)
    let record
    if (ts.isIdentifier(node)) {
      record = this.bindings.get(this.symbol(node))
      if (!record) this.fail('import_binding', 'default must reference a local const', node)
    } else {
      const value = this.model.slot === 'auth.config' ? this.auth(node) : this.evaluate(node)
      record = {
        name: 'default',
        declaration: node,
        value,
        exports: [],
        protected: protectedKinds.has(value.kind),
      }
    }
    this.exportBinding('default', record, ts.isIdentifier(node) ? node : null)
  }
  syntax() {
    const ast = this.model.ast
    if (ast.parseDiagnostics.length) this.fail('module_initialization', 'malformed source syntax')
    const visit = (node) => {
      if (declared(node)) return
      if (
        ts.isJsxElement(node) ||
        ts.isJsxSelfClosingElement(node) ||
        ts.isJsxFragment(node) ||
        ts.isDecorator(node) ||
        ts.isEnumDeclaration(node) ||
        ts.isModuleDeclaration(node) ||
        ts.isImportEqualsDeclaration(node) ||
        ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.attributes)
      )
        this.fail('module_initialization', 'unsupported emit-affecting syntax', node)
      ts.forEachChild(node, visit)
    }
    visit(ast)
    const scanner = ts.createScanner(
      ts.ScriptTarget.Latest,
      false,
      ts.LanguageVariant.Standard,
      ast.text,
    )
    for (
      let token = scanner.scan();
      token !== ts.SyntaxKind.EndOfFileToken;
      token = scanner.scan()
    ) {
      if (
        [ts.SyntaxKind.SingleLineCommentTrivia, ts.SyntaxKind.MultiLineCommentTrivia].includes(
          token,
        ) &&
        /@jsx(?:ImportSource|Runtime)?\b/.test(scanner.getTokenText())
      )
        this.fail('module_initialization', 'emit-affecting JSX pragma')
    }
  }
  functionDeclaration(statement) {
    if (declared(statement)) return
    const defaultFunction = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
    )
    if (this.model.file === this.snapshot.generated || defaultFunction)
      this.fail('import_binding', 'function/default declarations are unsupported here', statement)
    if (!statement.name || !statement.body)
      this.fail('module_initialization', 'unsupported function declaration', statement)
    const record = this.put(statement.name, role('function'), statement.name)
    if (exported(statement)) this.exportBinding(statement.name.text, record)
  }
  prepare() {
    this.syntax()
    this.generatedImports()
    this.imports()
    for (const statement of this.model.ast.statements.filter(ts.isFunctionDeclaration))
      this.functionDeclaration(statement)
    for (const statement of this.model.ast.statements) {
      this.statement(statement)
      this.statements.push({
        start: statement.getStart(),
        end: statement.end,
        kind: ts.SyntaxKind[statement.kind],
      })
    }
    if (
      this.model.file === this.snapshot.generated &&
      this.generated.length !== builderNames.length
    )
      this.fail('generated_mapping', 'missing generated mapping')
    this.collectClaims()
    return this
  }
  generatedImports() {
    if (this.model.file !== this.snapshot.generated) return
    const edges = this.model.edges.filter((edge) => edge.runtime)
    const names = edges.flatMap((edge) =>
      edge.bindings.filter((binding) => !binding.typeOnly).map((binding) => binding.imported),
    )
    if (
      edges.length !== 1 ||
      edges[0].specifier !== 'convex/server' ||
      names.length !== builderNames.length ||
      !builderNames.every((name) => names.includes(`${name}Generic`))
    )
      this.fail(
        'generated_mapping',
        'generated runtime input must be exactly the seven canonical builders',
      )
  }
  statement(statement) {
    if (
      declared(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isImportDeclaration(statement) ||
      ts.isFunctionDeclaration(statement)
    )
      return
    if (ts.isVariableStatement(statement)) return this.variable(statement)
    if (ts.isExportDeclaration(statement)) return this.exportDeclaration(statement)
    if (ts.isExportAssignment(statement)) return this.defaultExport(statement)
    if (
      statement === this.model.ast.statements[0] &&
      ts.isExpressionStatement(statement) &&
      statement.expression.text === 'use node' &&
      this.model.platform === 'node' &&
      this.model.file !== this.snapshot.generated
    )
      return
    this.fail(
      'module_initialization',
      `unsupported module statement ${ts.SyntaxKind[statement.kind]}`,
      statement,
    )
  }
  collectClaims() {
    for (const [name, record] of this.exports) {
      if (name === 'default' && this.model.slot) {
        const expected = {
          schema: 'schema',
          http: 'http',
          crons: 'crons',
          'convex.config': 'config',
          'auth.config': 'auth',
        }[this.model.slot]
        if (record.value.kind !== expected)
          this.fail('value_role', `default slot requires ${expected}`)
        this.claims.push({ file: this.model.file, name, kind: expected })
      } else if (record.value.kind === 'candidate') {
        if (name === 'default')
          this.fail('authority_reference', 'candidate requires a discoverable named export')
        if (!this.snapshot.roots.some((root) => root.file === this.model.file && root.named))
          continue
        this.claims.push({ file: this.model.file, name, kind: record.value.builder })
      }
    }
  }
  validateReferences() {
    const visit = (node) => {
      if (ts.isIdentifier(node)) {
        const record = this.bindings.get(this.symbol(node))
        if (record && node !== record.declaration && !nonReference(node))
          this.reference(node, record)
      }
      ts.forEachChild(node, visit)
    }
    visit(this.model.ast)
  }
  reference(node, record) {
    if (writingBinding(node))
      this.fail('mutable_binding', `binding reassignment ${record.name}`, node)
    if (record.protected && !this.allowed.has(node))
      this.fail(
        'authority_reference',
        `protected reference escapes declaration graph: ${record.name}`,
        node,
      )
    this.references.push({ binding: record.name, start: node.getStart(), end: node.end })
  }
}

function protectDependencies(record) {
  let changed = false
  if (record.protected) {
    for (const dependency of record.value.deps) {
      if (dependency.protected) continue
      dependency.protected = true
      changed = true
    }
  }
  if (
    !record.protected &&
    record.value.kind !== 'function' &&
    [...record.value.deps].some((dependency) => dependency.protected)
  ) {
    record.protected = true
    changed = true
  }
  return changed
}
export function validateDeclarationReferences(models) {
  const records = models.flatMap((model) => [
    ...model.values.bindings.values(),
    ...model.values.exports.values(),
  ])
  let changed = true
  while (changed) {
    changed = false
    for (const record of records) changed = protectDependencies(record) || changed
  }
  for (const model of models) model.values.validateReferences()
}
