import * as css from 'css-tree'
import { substituteMath } from './design-math.mjs'

export const decode = (name) => css.ident.decode(name)
export const keyword = (name) => decode(name).toLowerCase()
export const children = (node) => node?.children?.toArray() ?? []
export const finding = (messageId, node, construct = '') => ({
  messageId,
  index: node?.loc?.start.offset ?? 0,
  length: Math.max(1, (node?.loc?.end.offset ?? 1) - (node?.loc?.start.offset ?? 0)),
  construct,
})

const rawFunctions = new Set(
  'rgb rgba hsl hsla hwb lab lch oklab oklch color device-cmyk'.split(' '),
)
const functions = new Set(
  `calc min max clamp
  color-mix light-dark linear-gradient repeating-linear-gradient radial-gradient repeating-radial-gradient conic-gradient repeating-conic-gradient drop-shadow
  blur brightness contrast grayscale hue-rotate invert opacity saturate sepia
  matrix matrix3d perspective rotate rotatex rotatey rotatez rotate3d scale scalex scaley scalez scale3d skew skewx skewy translate translatex translatey translatez translate3d
  cubic-bezier steps linear format local tech inset circle ellipse polygon repeat minmax fit-content`.split(
    /\s+/,
  ),
)
const representatives = {
  color: 'transparent',
  shadow: '0 1px 2px transparent',
  length: '1px',
  number: '1',
  percentage: '1%',
  time: '1s',
  angle: '1deg',
  font: '"Relay"',
  animation: 'relay 1s linear',
  easing: 'ease',
  text: '"Relay"',
  tracking: '0px',
  borderStyle: 'solid',
  lineHeight: '1',
  weight: '400',
}
const propertyTypes = {
  color: 'color',
  shadow: 'box-shadow',
  length: 'width',
  number: 'opacity',
  percentage: 'width',
  time: 'transition-duration',
  angle: 'rotate',
  font: 'font-family',
  animation: 'animation',
  easing: 'transition-timing-function',
  text: 'content',
  tracking: 'letter-spacing',
  borderStyle: 'border-style',
  lineHeight: 'line-height',
  weight: 'font-weight',
}

function namespaceType(name) {
  if (name.startsWith('--font-weight-')) return 'weight'
  if (name.startsWith('--leading-') || /^--text-.+--line-height$/.test(name)) return 'lineHeight'
  if (name.startsWith('--color-')) return 'color'
  if (/^--(?:font-|t-.+-family$)/.test(name)) return 'font'
  if (name.startsWith('--animate-')) return 'animation'
  if (/^--(?:ease(?:-|$)|default-transition-timing-function$)/.test(name)) return 'easing'
  if (/^--(?:dur-|duration-|default-transition-duration$)/.test(name)) return 'time'
  if (/^--t-.+-track$/.test(name)) return 'tracking'
  return null
}

function parseValue(text) {
  return css.parse(text, { context: 'value', positions: true, parseCustomProperty: true })
}

function matchType(type, value) {
  const property = propertyTypes[type]
  return property ? css.lexer.matchProperty(property, value) : { matched: null }
}

function primitiveType(value) {
  const nodes = children(value)
  if (nodes.length === 1 && nodes[0].type === 'String') return 'text'
  for (const type of ['number', 'percentage', 'time', 'angle', 'length', 'color']) {
    if (css.lexer.matchType(type === 'length' ? 'length-percentage' : type, value).matched)
      return type
  }
  if (css.lexer.matchProperty('box-shadow', value).matched) return 'shadow'
  return null
}

function variableParts(node) {
  const parts = children(node)
  const [name, comma, ...tail] = parts
  const identifier = name?.type === 'Identifier' ? decode(name.rawName ?? name.name) : null
  if (!identifier?.startsWith('--')) return null
  if (!comma) return { name: identifier, fallback: null }
  if (comma.type !== 'Operator' || comma.value !== ',' || !tail.length) return null
  const fallback =
    tail.length === 1 && tail[0].type === 'Value'
      ? tail[0]
      : { type: 'Value', children: new css.List().fromArray(tail), loc: node.loc }
  return { name: identifier, fallback }
}

function normalise(node) {
  css.walk(node, (item) => {
    if (item.type === 'Identifier' || item.type === 'Function') {
      item.rawName ??= item.name
      item.name = item.type === 'Function' ? keyword(item.rawName) : decode(item.rawName)
    }
    if (item.type === 'Dimension') {
      item.rawUnit ??= item.unit
      item.unit = keyword(item.rawUnit)
    }
  })
  return node
}

function identifierFindings(value, match) {
  const findings = []
  css.walk(value, (node) => {
    if (node.type !== 'Identifier' || /^(?:currentcolor|transparent)$/i.test(node.name)) return
    if (match.isType?.(node, 'color') && css.lexer.matchType('color', node.name).matched)
      findings.push(finding('rawColour', node, node.name))
    else if (match.isType?.(node, 'paint') && node.name.toLowerCase() !== 'none')
      findings.push(finding('unsupportedSyntax', node, `unresolved paint ${node.name}`))
  })
  return findings
}

function numericFunction(node) {
  return (
    node.name === '--value' &&
    children(node).length === 1 &&
    children(node)[0].type === 'Identifier' &&
    children(node)[0].name === 'integer'
  )
}

function safeFunctions(value, integerUtility) {
  const findings = []
  css.walk(value, (node) => {
    if (node.type === 'Raw') findings.push(finding('unsupportedSyntax', node, 'opaque value'))
    if (node.type === 'Hash') findings.push(finding('rawColour', node, `#${node.value}`))
    if (node.type !== 'Function') return
    if (rawFunctions.has(node.name)) findings.push(finding('rawColour', node, `${node.name}()`))
    else if (node.name === '--value' && integerUtility && numericFunction(node)) return
    else if (!functions.has(node.name) && node.name !== 'var')
      findings.push(finding('unsupportedSyntax', node, `${node.name}()`))
  })
  return findings
}

function referenceReplacement(type, reference, node) {
  const nodes = children(parseValue(representatives[type]))
  for (const item of nodes) item.loc = node.loc
  nodes[0].referenceType = type
  nodes[0].referenceName = reference
  return new css.List().fromArray(nodes)
}

function referenceFindings(value, match) {
  const findings = []
  const domains = { color: 'color', font: 'family-name' }
  css.walk(value, (node) => {
    const domain = domains[node.referenceType]
    if (domain && !match.isType?.(node, domain))
      findings.push(finding('tokenType', node, `${node.referenceName} (${node.referenceType})`))
  })
  return findings
}

export function createValuePolicy({
  approved = '',
  definitions = [],
  tokenTypes = new Map(),
} = {}) {
  const roots = new Map()
  const selected = new Map()
  const resolving = new Set()
  const inferred = new Map()
  function remember(ast, destination) {
    css.walk(ast, {
      visit: 'Declaration',
      enter(node) {
        const name = decode(node.property)
        if (!name.startsWith('--')) return
        const list = destination.get(name) ?? []
        list.push(node.value)
        destination.set(name, list)
      },
    })
  }
  if (approved) remember(css.parse(approved, { parseCustomProperty: true }), roots)
  for (const ast of definitions) remember(ast, selected)

  function rootType(name) {
    const values = roots.get(name)
    if (!values) return null
    const named = namespaceType(name)
    if (named) return named
    const types = values.map((value) => {
      const variable = children(value)[0]
      if (children(value).length === 1 && variable?.type === 'Function' && variable.name === 'var')
        return resolveType(variableParts(variable)?.name)
      return primitiveType(value) ?? (/normal/.test(css.generate(value)) ? 'tracking' : null)
    })
    return types.every((type) => type && type === types[0]) ? types[0] : null
  }

  function resolveType(name) {
    if (inferred.has(name)) return inferred.get(name)
    if (resolving.has(name)) return null
    resolving.add(name)
    const root = tokenTypes.get(name) ?? rootType(name)
    const values = selected.get(name)
    const types = values?.map((value) => inferValue(value, namespaceType(name) ?? root))
    const type = types ? (types.every((item) => item && item === types[0]) ? types[0] : null) : root
    resolving.delete(name)
    inferred.set(name, type)
    return type
  }

  function substitute(value, options = {}) {
    const clone = normalise(css.clone(value))
    const findings = []
    css.walk(clone, {
      visit: 'Function',
      enter(node, item, list) {
        if (node.name === '--value' && options.integerUtility && numericFunction(node)) {
          list.replace(item, new css.List().fromArray(children(parseValue('1'))))
          return this.skip
        }
        if (node.name !== 'var') return
        const parts = variableParts(node)
        if (!parts) {
          findings.push(finding('unsupportedSyntax', node, 'malformed var()'))
          return this.skip
        }
        const fallback = parts.fallback ? inferValue(parts.fallback) : null
        const type =
          resolveType(parts.name) ??
          (!selected.has(parts.name) && !parts.name.startsWith('--color-') ? fallback : null)
        if (parts.fallback) {
          findings.push(...checkTyped(parts.fallback, type, options))
          if (
            fallback &&
            type &&
            fallback !== type &&
            !matchType(type, substitute(parts.fallback, options).value).matched
          )
            findings.push(finding('tokenType', node, `${parts.name} fallback`))
        }
        if (!type) findings.push(finding('unresolvedToken', node, parts.name))
        else list.replace(item, referenceReplacement(type, parts.name, node))
        return this.skip
      },
    })
    for (const node of substituteMath(clone))
      findings.push(
        finding('unsupportedSyntax', node, `untyped numeric math ${css.generate(node)}`),
      )
    return { value: clone, findings }
  }

  function inferValue(value, expected = null) {
    const substituted = substitute(value, { integerUtility: true })
    if (substituted.findings.length) return null
    if (expected) {
      const match = matchType(expected, substituted.value)
      return match.matched && !referenceFindings(substituted.value, match).length ? expected : null
    }
    const original = children(value)
    if (
      original.length === 1 &&
      original[0].type === 'Function' &&
      keyword(original[0].rawName ?? original[0].name) === 'var'
    )
      return children(substituted.value)[0]?.referenceType ?? null
    return primitiveType(substituted.value)
  }

  function checkTyped(value, type, options = {}) {
    if (!type)
      return [
        ...substitute(value, options).findings,
        ...safeFunctions(normalise(css.clone(value)), options.integerUtility),
        finding('unresolvedToken', value, 'untyped value or alias'),
      ]
    return check(value, propertyTypes[type], { ...options, customType: type })
  }

  function check(value, property, options = {}) {
    const substituted = substitute(value, options)
    const findings = [
      ...substituted.findings,
      ...safeFunctions(normalise(css.clone(value)), options.integerUtility),
    ]
    const match = options.descriptor
      ? css.lexer.matchAtruleDescriptor(options.descriptor, property, substituted.value)
      : css.lexer.matchProperty(property, substituted.value)
    if (!match.matched)
      findings.push(
        finding(
          'unsupportedSyntax',
          value,
          `${options.descriptor ? `@${options.descriptor} descriptor ` : ''}${property}: ${css.generate(value)}`,
        ),
      )
    findings.push(
      ...identifierFindings(substituted.value, match),
      ...referenceFindings(substituted.value, match),
    )
    return findings
  }

  function declaration(node, context = {}) {
    const property = decode(node.property)
    if (!property.startsWith('--')) return check(node.value, property.toLowerCase(), context)
    const type = resolveType(property)
    const findings = checkTyped(node.value, type, context)
    const raw = normalise(css.clone(node.value))
    if (!namespaceType(property) && css.lexer.matchType('color', raw).matched)
      findings.push(...identifierFindings(raw, css.lexer.matchType('color', raw)))
    return findings
  }

  return { declaration, check, grammarValue: (value) => substitute(value).value }
}
