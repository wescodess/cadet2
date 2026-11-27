import * as css from 'css-tree'
import { finding, keyword } from './design-values.mjs'

const featureTypes = {
  width: 'length',
  height: 'length',
  'inline-size': 'length',
  'block-size': 'length',
  'aspect-ratio': 'ratio',
  resolution: 'resolution',
  color: 'integer',
  monochrome: 'integer',
}
const featureKeywords = {
  orientation: ['portrait', 'landscape'],
  hover: ['none', 'hover'],
  'any-hover': ['none', 'hover'],
  pointer: ['none', 'coarse', 'fine'],
  'any-pointer': ['none', 'coarse', 'fine'],
  'prefers-reduced-motion': ['no-preference', 'reduce'],
  'prefers-color-scheme': ['light', 'dark'],
  'prefers-contrast': ['no-preference', 'less', 'more', 'custom'],
  'forced-colors': ['none', 'active'],
  update: ['none', 'slow', 'fast'],
  'display-mode': ['fullscreen', 'standalone', 'minimal-ui', 'browser', 'picture-in-picture'],
}
const containerFeatures = new Set([
  'width',
  'height',
  'inline-size',
  'block-size',
  'aspect-ratio',
  'orientation',
])

function featureDefinition(name, kind) {
  const decoded = keyword(name)
  const base = decoded.replace(/^(?:min|max)-/, '')
  if (kind === 'container' && !containerFeatures.has(base)) return null
  if (featureTypes[base]) return { type: featureTypes[base] }
  return decoded === base && featureKeywords[base] ? { keywords: featureKeywords[base] } : null
}

function featureValue(value, definition) {
  if (definition.type)
    return Boolean(css.lexer.matchType(definition.type, css.generate(value)).matched)
  return value.type === 'Identifier' && definition.keywords.includes(keyword(value.name))
}

function rangeSupported(node) {
  const operands = [node.left, node.middle, node.right].filter(Boolean)
  const names = operands.filter((item) => item.type === 'Identifier')
  if (names.length !== 1) return false
  const definition = featureDefinition(names[0].name, node.kind)
  return (
    Boolean(definition?.type) &&
    operands.filter((item) => item !== names[0]).every((value) => featureValue(value, definition))
  )
}

function supported(node) {
  if (node.type === 'MediaQuery')
    return !node.mediaType || ['all', 'screen', 'print'].includes(keyword(node.mediaType))
  if (node.type === 'FeatureRange') return rangeSupported(node)
  if (node.type === 'Feature') {
    const definition = featureDefinition(node.name, node.kind)
    return Boolean(definition) && (!node.value || featureValue(node.value, definition))
  }
  if (node.type === 'FeatureFunction')
    return { supports: 'selector', container: 'style' }[node.kind] === keyword(node.name)
  return true
}

export function conditionFindings(prelude) {
  const findings = []
  css.walk(prelude, (node) => {
    if (!supported(node))
      findings.push(
        finding(
          'unsupportedSyntax',
          node,
          `unsupported ${node.kind ?? 'media'} condition ${css.generate(node)}`,
        ),
      )
  })
  return findings
}
