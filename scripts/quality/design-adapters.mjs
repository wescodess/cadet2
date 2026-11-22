import { parse as parseSfc } from 'vue/compiler-sfc'
import * as vueParser from 'vue-eslint-parser'
import tseslint from 'typescript-eslint'
import { colourValueFindings, parseStylesheet, stylesheetFindings } from './design-css.mjs'
import { decodedLocations, originalFindings } from './design-locations.mjs'
import { finding } from './design-values.mjs'

const palette =
  /^(?:bg|text|border(?:-[trblxy])?|ring(?:-offset)?|fill|stroke|outline|from|via|to|shadow|decoration|divide|placeholder|caret|accent)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})(?:\/.*)?$/
const utilityStart =
  /(?:^|\s)(?:-?(?:bg|text|border|ring|fill|stroke|outline|from|via|to|shadow|decoration|divide|placeholder|caret|accent|rounded|size|min-|max-|h-|w-|p[trblxy]?-|m[trblxy]?-|gap-|grid|flex|inline|block|hidden|relative|absolute|fixed|sticky|font-|opacity-|animate-|transition|duration-|ease-|disc-|edge-)|\[[\w-]+:)/
const presentation = new Set(
  'alignment-baseline baseline-shift clip color-interpolation color-interpolation-filters color-rendering cursor direction display dominant-baseline flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight image-rendering letter-spacing marker-end marker-mid marker-start overflow pointer-events shape-rendering stop-opacity text-anchor text-decoration text-rendering vector-effect visibility word-spacing writing-mode fill stroke color stop-color flood-color lighting-color fill-opacity stroke-opacity stroke-width stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit fill-rule clip-rule opacity filter clip-path mask paint-order color-interpolation color-interpolation-filters'.split(
    ' ',
  ),
)
const wrappers = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'ChainExpression',
])
const uninspectable = Symbol('uninspectable')
const classHelper = Symbol('class-helper')

function walk(node, visit, seen = new WeakSet()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return
  seen.add(node)
  if (node.type) visit(node)
  for (const [key, value] of Object.entries(node)) {
    if (['parent', 'tokens', 'comments', 'loc', 'range'].includes(key)) continue
    if (Array.isArray(value)) value.forEach((item) => walk(item, visit, seen))
    else walk(value, visit, seen)
  }
}

const loc = (index, length = 1) => ({
  loc: { start: { offset: index }, end: { offset: index + length } },
})
function literal(node) {
  const index = node.range[0] + (typeof node.value === 'string' ? 1 : 0)
  const locations =
    typeof node.value === 'string' && node.raw
      ? decodedLocations(node.raw.slice(1, -1), index)
      : null
  return { value: String(node.value), index, locations }
}

function quasiValue(node) {
  return {
    value: node.value.cooked ?? node.value.raw,
    locations: decodedLocations(node.value.raw, node.range[0] + 1).slice(0, -1),
  }
}

function valueLocations(value) {
  return (
    value.locations?.slice(0, value.value.length) ??
    Array.from(value.value, (_item, index) => value.index + index)
  )
}

function templateValues(node, bindings, seen) {
  let values = [quasiValue(node.quasis[0])]
  for (let i = 0; i < node.expressions.length; i++) {
    const options = finiteValues(node.expressions[i], bindings, seen)
    if (options === uninspectable || values.length * options.length > 256) return uninspectable
    const suffix = quasiValue(node.quasis[i + 1])
    values = values.flatMap((prefix) =>
      options.map((item) => ({
        value: prefix.value + item.value + suffix.value,
        locations: [...prefix.locations, ...valueLocations(item), ...suffix.locations],
      })),
    )
  }
  return values.map((value) => ({
    ...value,
    index: node.range[0] + 1,
    locations: [...value.locations, node.range[1] - 1],
  }))
}

function combine(nodes, bindings, seen) {
  const values = nodes.map((node) => finiteValues(node, bindings, new Set(seen)))
  return values.includes(uninspectable) ? uninspectable : values.flat()
}

function objects(node, bindings) {
  if (node?.type === 'Identifier') return objects(bindings.get(node.name), bindings)
  if (wrappers.has(node?.type)) return objects(node.expression, bindings)
  if (node?.type === 'ObjectExpression')
    return node.properties.every(
      (item) => item.type === 'Property' && (!item.computed || item.key.type === 'Literal'),
    )
      ? [node]
      : []
  if (node?.type !== 'MemberExpression') return []
  const key = node.computed ? node.property.value : node.property.name
  return objects(node.object, bindings).flatMap((object) =>
    object.properties
      .filter((item) => key == null || (item.key?.name ?? item.key?.value) === key)
      .flatMap((item) => objects(item.value, bindings)),
  )
}

function memberValues(node, bindings, seen) {
  const key = node.computed ? node.property.value : node.property.name
  const members = objects(node.object, bindings).flatMap((object) =>
    object.properties.filter((item) => key == null || (item.key?.name ?? item.key?.value) === key),
  )
  return members.length
    ? combine(
        members.map((item) => item.value),
        bindings,
        seen,
      )
    : uninspectable
}

function finiteValues(node, bindings, seen = new Set()) {
  if (!node) return []
  if (wrappers.has(node.type)) return finiteValues(node.expression, bindings, seen)
  if (node.type === 'Literal')
    return node.value == null || typeof node.value === 'boolean' ? [] : [literal(node)]
  if (node.type === 'TemplateLiteral') return templateValues(node, bindings, seen)
  if (node.type === 'Identifier') {
    if (node.name === 'undefined') return []
    if (seen.has(node.name) || !bindings.has(node.name)) return uninspectable
    seen.add(node.name)
    return finiteValues(bindings.get(node.name), bindings, seen)
  }
  return compoundValues(node, bindings, seen)
}

function compoundValues(node, bindings, seen) {
  if (node.type === 'ConditionalExpression')
    return combine([node.consequent, node.alternate], bindings, seen)
  if (node.type === 'LogicalExpression')
    return node.operator === '&&'
      ? finiteValues(node.right, bindings, seen)
      : combine([node.left, node.right], bindings, seen)
  if (node.type === 'MemberExpression') return memberValues(node, bindings, seen)
  return uninspectable
}

export function utilityFindings(text, offset = 0) {
  return staticCandidates(text, offset).flatMap((candidate) => {
    const base = candidate.value.split(':').at(-1).replace(/^!|!$/g, '')
    const messageId = /\[|\]/.test(candidate.value)
      ? 'arbitraryValue'
      : palette.test(base)
        ? 'rawColour'
        : null
    return messageId
      ? [finding(messageId, loc(candidate.index, candidate.value.length), candidate.value)]
      : []
  })
}

export function staticCandidates(text, offset = 0, locations = null) {
  return [...text.matchAll(/\S+/g)].map((match) => ({
    value: match[0],
    index: locations?.[match.index] ?? offset + match.index,
  }))
}

function classObjectValues(node) {
  const values = []
  for (const property of node.properties) {
    if (property.type !== 'Property') return uninspectable
    if (property.key.type === 'Literal' && typeof property.key.value === 'string')
      values.push(literal(property.key))
    else if (!property.computed && property.key.type === 'Identifier')
      values.push({ value: property.key.name, index: property.key.range[0] })
    else return uninspectable
  }
  return values
}

function classChoices(nodes, bindings, seen) {
  const values = nodes.map((node) => finiteClasses(node, bindings, new Set(seen)))
  return values.includes(uninspectable) ? uninspectable : values.flat()
}

function finiteClasses(node, bindings, seen = new Set()) {
  if (!node) return []
  if (wrappers.has(node.type)) return finiteClasses(node.expression, bindings, seen)
  if (node.type === 'ObjectExpression') return classObjectValues(node)
  if (node.type === 'ArrayExpression') return classChoices(node.elements, bindings, seen)
  if (node.type === 'ConditionalExpression')
    return classChoices([node.consequent, node.alternate], bindings, seen)
  if (node.type === 'LogicalExpression')
    return node.operator === '&&'
      ? finiteClasses(node.right, bindings, seen)
      : classChoices([node.left, node.right], bindings, seen)
  return referencedClasses(node, bindings, seen)
}

function referencedClasses(node, bindings, seen) {
  if (
    node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' &&
    ['props', '$attrs'].includes(node.object.name) &&
    !node.computed &&
    node.property.name === 'class'
  )
    return []
  if (node.type === 'CallExpression' && bindings.get(node.callee.name) === classHelper)
    return classChoices(node.arguments, bindings, seen)
  if (node.type !== 'Identifier' || !bindings.has(node.name))
    return finiteValues(node, bindings, seen)
  if (seen.has(node.name)) return uninspectable
  seen.add(node.name)
  return finiteClasses(bindings.get(node.name), bindings, seen)
}

function expressionValues(node, bindings, findings, construct) {
  const values = construct.includes('class')
    ? finiteClasses(node, bindings)
    : finiteValues(node, bindings)
  if (values !== uninspectable) return values
  findings.push(finding('unsupportedSyntax', loc(node?.range?.[0] ?? 0), `unresolved ${construct}`))
  return []
}

function scriptInputs(ast, inputs, bindings, importsOnly = false) {
  scriptReferences(ast, inputs)
  if (importsOnly) return
  scriptBindings(ast, bindings)
  walk(ast.body, (node) => {
    if (node.type === 'Literal' && typeof node.value === 'string') scriptLiteral(node, inputs)
    if (['CallExpression', 'NewExpression'].includes(node.type)) scriptSink(node, inputs)
    generatedClass(node, inputs, bindings)
    if (
      node.type === 'TaggedTemplateExpression' &&
      /^(?:css|styled|createGlobalStyle)(?:\.|$)/.test(
        inputs.text.slice(node.tag.range[0], node.tag.range[1]),
      )
    )
      inputs.findings.push(
        finding('unsupportedSyntax', loc(node.range[0]), 'CSS tagged template injection'),
      )
    if (node.type === 'AssignmentExpression' && cssAssignment(node.left))
      inputs.findings.push(
        finding('unsupportedSyntax', loc(node.range[0]), 'dynamic CSS assignment'),
      )
  })
}

function assignedRoot(node) {
  while (node?.type === 'MemberExpression') node = node.object
  return node?.type === 'Identifier' ? node.name : null
}

function topLevelBindings(statement, bindings) {
  const node = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
  if (!node) return
  if (node.type === 'VariableDeclaration')
    for (const item of node.declarations) {
      if (item.id.type === 'Identifier')
        bindings.set(item.id.name, node.kind === 'const' ? item.init : uninspectable)
    }
  if (node.type === 'FunctionDeclaration' && node.id) bindings.set(node.id.name, uninspectable)
  if (node.type === 'ImportDeclaration') importBindings(node, bindings)
}

function scriptBindings(ast, bindings) {
  for (const statement of ast.body) topLevelBindings(statement, bindings)
  walk(ast.body, (node) => {
    const root =
      node.type === 'AssignmentExpression'
        ? assignedRoot(node.left)
        : node.type === 'UpdateExpression'
          ? assignedRoot(node.argument)
          : null
    if (root && bindings.has(root)) bindings.set(root, uninspectable)
  })
}

function importBindings(node, bindings) {
  for (const specifier of node.specifiers) {
    const helper =
      ['~/lib/utils', '@/lib/utils'].includes(node.source.value) &&
      node.importKind !== 'type' &&
      specifier.importKind !== 'type' &&
      specifier.imported?.name === 'cn'
    bindings.set(specifier.local.name, helper ? classHelper : uninspectable)
  }
}

function scriptReferences(ast, inputs) {
  walk(ast.body, (node) => {
    if (
      node.source?.type === 'Literal' &&
      ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) &&
      node.importKind !== 'type' &&
      node.exportKind !== 'type'
    )
      inputs.imports.push({
        value: node.source.value,
        index: node.source.range[0] + 1,
        script: true,
      })
    if (node.type === 'ImportExpression')
      inputs.findings.push(
        finding('unsupportedSource', loc(node.range[0]), 'dynamic source import'),
      )
    if (node.type === 'CallExpression' && node.callee.name === 'require')
      requireReference(node, inputs)
    if (
      node.type === 'NewExpression' &&
      node.callee.name === 'URL' &&
      node.arguments[0]?.type === 'Literal'
    )
      inputs.imports.push({
        value: node.arguments[0].value,
        index: node.arguments[0].range[0] + 1,
        script: true,
      })
  })
}

function requireReference(node, inputs) {
  const value = node.arguments[0]
  if (value?.type === 'Literal' && typeof value.value === 'string')
    inputs.imports.push({ value: value.value, index: value.range[0] + 1, script: true })
  else
    inputs.findings.push(finding('unsupportedSource', loc(node.range[0]), 'dynamic require source'))
}

function cssAssignment(node) {
  if (node.type !== 'MemberExpression') return false
  const name = node.computed ? node.property.value : node.property.name
  if (['style', 'cssText', 'adoptedStyleSheets', 'innerHTML', 'outerHTML'].includes(name))
    return true
  return cssAssignment(node.object)
}

function scriptLiteral(node, inputs) {
  const text = node.value
  if (utilityStart.test(text)) inputs.candidates.push(...staticCandidates(text, node.range[0] + 1))
}

function generatedClass(node, inputs, bindings) {
  if (
    node.type !== 'TemplateLiteral' ||
    !utilityStart.test(node.quasis.map((part) => part.value.raw).join(' '))
  )
    return
  const values = expressionValues(node, bindings, inputs.findings, 'generated class choice')
  for (const value of values)
    inputs.candidates.push(...staticCandidates(value.value, value.index, value.locations))
}

function scriptSink(node, inputs) {
  const call = inputs.text.slice(node.callee.range[0], node.callee.range[1])
  const member = node.callee.computed ? node.callee.property?.value : node.callee.property?.name
  if (
    /(?:registerProperty|insertRule|replaceSync|\.setProperty|insertAdjacentHTML)$/.test(call) ||
    /^(?:CSSStyleSheet|document\.write)$/.test(call) ||
    ['registerProperty', 'insertRule', 'replaceSync', 'setProperty', 'insertAdjacentHTML'].includes(
      member,
    )
  )
    inputs.findings.push(
      finding('unsupportedSyntax', loc(node.range[0]), `dynamic CSS sink ${call}`),
    )
}

function attributeValues(node, bindings, findings, construct) {
  if (node.directive) return expressionValues(node.value?.expression, bindings, findings, construct)
  return node.value ? [{ value: node.value.value, index: node.value.range[0] + 1 }] : []
}

function svgAttribute(node, inputs, bindings) {
  const directive = node.directive ? node.key.name.name : null
  const name = directive ? node.key.argument?.name : node.key.name
  if (directive === 'html')
    inputs.findings.push(
      finding('unsupportedSyntax', loc(node.range[0]), 'v-html markup injection'),
    )
  if (directive === 'bind' && !name)
    inputs.findings.push(
      finding('unsupportedSyntax', loc(node.range[0]), 'SVG spread or dynamic attribute'),
    )
  if (name === 'style')
    inputs.findings.push(finding('inlineStyle', loc(node.range[0]), 'inline style'))
  if (!presentation.has(name)) return
  const values = attributeValues(node, bindings, inputs.findings, `SVG ${name}`)
  for (const value of values) inputs.paints.push({ ...value, property: name })
}

function attributeInputs(node, inputs, bindings) {
  const name = node.directive ? node.key.argument?.name : node.key.name
  const directive = node.directive ? node.key.name.name : null
  if (directive === 'html')
    inputs.findings.push(
      finding('unsupportedSyntax', loc(node.range[0]), 'v-html markup injection'),
    )
  if (name === 'style')
    inputs.findings.push(finding('inlineStyle', loc(node.range[0]), 'inline style'))
  if (name === 'src' && !node.directive && node.value)
    inputs.imports.push({ value: node.value.value, index: node.value.range[0] + 1, asset: true })
  if (name === 'class') {
    const values = attributeValues(node, bindings, inputs.findings, 'class choice')
    for (const value of values)
      inputs.candidates.push(...staticCandidates(value.value, value.index, value.locations))
  }
  let element = node.parent?.parent
  while (element && element.rawName !== 'svg') element = element.parent
  if (element) svgAttribute(node, inputs, bindings)
}

function templateInputs(ast, inputs, bindings) {
  walk(ast, (node) => {
    if (
      node.type === 'VElement' &&
      ['style', 'animate', 'animateColor', 'set'].includes(node.rawName)
    )
      inputs.findings.push(
        finding('unsupportedSyntax', loc(node.range[0]), `embedded or animated ${node.rawName}`),
      )
    if (node.type === 'VAttribute') attributeInputs(node, inputs, bindings)
  })
}

export function adaptDesignSource(text, filename, { importsOnly = false } = {}) {
  const inputs = { text, styles: [], candidates: [], paints: [], imports: [], findings: [] }
  if (filename.endsWith('.css')) {
    inputs.styles.push({ text, offset: 0 })
    return inputs
  }
  if (!/\.(?:vue|ts|js|mts|cts|mjs|cjs)$/.test(filename)) {
    inputs.findings.push(finding('unsupportedSource', null, `source ${filename}`))
    return inputs
  }
  try {
    if (filename.endsWith('.vue')) sfcStyles(text, filename, inputs)
    const options = {
      range: true,
      loc: true,
      sourceType: 'module',
      ecmaVersion: 'latest',
      filePath: filename,
    }
    const ast = filename.endsWith('.vue')
      ? vueParser.parseForESLint(text, { ...options, parser: tseslint.parser }).ast
      : tseslint.parser.parseForESLint(text, options).ast
    const bindings = new Map()
    scriptInputs(ast, inputs, bindings, importsOnly)
    if (ast.templateBody && !importsOnly) templateInputs(ast.templateBody, inputs, bindings)
  } catch (error) {
    inputs.findings.push(
      finding('unsupportedSource', loc(error.index ?? 0), `source parse: ${error.message}`),
    )
  }
  return inputs
}

function sfcStyles(text, filename, inputs) {
  const { descriptor, errors } = parseSfc(text, { filename })
  const external = [descriptor.template, descriptor.script, descriptor.scriptSetup].filter(
    (block) => block?.src,
  )
  for (const block of external)
    inputs.findings.push(
      finding('unsupportedSource', loc(block.loc.start.offset), 'external SFC template/script'),
    )
  if (descriptor.template?.lang && descriptor.template.lang !== 'html')
    inputs.findings.push(
      finding(
        'unsupportedSource',
        loc(descriptor.template.loc.start.offset),
        `template language ${descriptor.template.lang}`,
      ),
    )
  for (const block of [descriptor.script, descriptor.scriptSetup].filter(Boolean)) {
    if (block.lang && !['js', 'ts'].includes(block.lang))
      inputs.findings.push(
        finding('unsupportedSource', loc(block.loc.start.offset), `script language ${block.lang}`),
      )
  }
  for (const block of descriptor.customBlocks)
    inputs.findings.push(
      finding('unsupportedSource', loc(block.loc.start.offset), `SFC custom block ${block.type}`),
    )
  for (const error of errors)
    inputs.findings.push(
      finding(
        'unsupportedSource',
        loc(error.loc?.start.offset ?? 0),
        `SFC parse: ${error.message ?? error}`,
      ),
    )
  for (const style of descriptor.styles) {
    const index = style.loc.start.offset
    if (style.lang && style.lang !== 'css')
      inputs.findings.push(finding('unsupportedSource', loc(index), `style language ${style.lang}`))
    else if (style.src) inputs.imports.push({ value: style.src, index })
    else inputs.styles.push({ text: style.content, offset: index })
  }
}

export function analyseDesignInputs(inputs, policy) {
  const findings = [...inputs.findings]
  for (const style of inputs.styles)
    findings.push(...stylesheetFindings(style.text, style.offset, utilityFindings, { policy }))
  for (const paint of inputs.paints)
    findings.push(
      ...originalFindings(
        colourValueFindings(paint.value, paint.property, paint.index, { policy }),
        paint,
      ),
    )
  for (const candidate of inputs.candidates)
    findings.push(...utilityFindings(candidate.value, candidate.index))
  return findings
}

export function styleDefinitions(inputs) {
  return inputs.styles.map((style) => parseStylesheet(style.text).ast).filter(Boolean)
}
