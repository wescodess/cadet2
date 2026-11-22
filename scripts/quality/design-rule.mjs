import { parse as parseSfc } from 'vue/compiler-sfc'
import { colourValueFindings, stylesheetFindings } from './design-css.mjs'

const palette =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const colourUtility =
  'bg|text|border|border-[trblxy]|ring|ring-offset|fill|stroke|outline|from|via|to|shadow|decoration|divide|placeholder|caret|accent'
const colourFunctions = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|device-cmyk)\(/gi

const utilities = [
  { messageId: 'arbitraryValue', pattern: /(?<![\w$])[\w:@!/.-]*-\[[^\]\s'"`]+\]/g },
  { messageId: 'arbitraryValue', pattern: /(?<![\w$&[])\[[a-z-]+:[^\]\s'"`]+\]/g },
  {
    messageId: 'rawColour',
    pattern: new RegExp(
      `(?<![\\w-])(?:${colourUtility})-(?:(?:${palette})-\\d{2,3}|white|black)(?![\\w-])`,
      'g',
    ),
  },
]
const checks = [
  ...utilities,
  { messageId: 'inlineStyle', pattern: /(?<=\s)(?:v-bind:|:)?style\s*=/g, template: true },
  {
    messageId: 'rawColour',
    literal: true,
    pattern: /(?<![\w&/-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi,
    skip: (before) => /(?:href|to)\s*=\s*["']$/.test(before),
  },
  {
    messageId: 'rawColour',
    literal: true,
    pattern: colourFunctions,
  },
]

export const designMessages = {
  inlineStyle: 'Inline styles are not allowed in new UI files; use Relay token utilities.',
  arbitraryValue:
    'Arbitrary Tailwind values are not allowed in new UI files; use a Relay token utility.',
  rawColour: 'Raw colours are not allowed in new UI files; use a Relay colour token.',
}

function scan(text, rules, offset = 0) {
  return rules.flatMap(({ messageId, pattern, template, literal, skip }) =>
    [...text.matchAll(pattern)]
      .filter((match) => !skip?.(text.slice(Math.max(0, match.index - 16), match.index)))
      .map((match) => ({
        messageId,
        template,
        literal,
        index: offset + match.index,
        length: match[0].length,
      })),
  )
}

export function utilityFindings(text, offset = 0) {
  return scan(text, utilities, offset)
}

function inBlock(index, block) {
  return block && index >= block.loc.start.offset && index < block.loc.end.offset
}

function fileFindings(text, filename, isSfc) {
  const descriptor = isSfc ? parseSfc(text, { filename }).descriptor : null
  const styles = descriptor?.styles ?? []
  const findings = scan(text, checks).filter(
    (finding) =>
      !styles.some((style) => inBlock(finding.index, style)) &&
      (!finding.literal || !inBlock(finding.index, descriptor?.template)) &&
      (!finding.template || inBlock(finding.index, descriptor?.template)),
  )
  for (const style of styles) {
    if (style.lang && style.lang !== 'css')
      throw new Error(`Unsupported design stylesheet: ${style.lang}`)
    findings.push(...stylesheetFindings(style.content, style.loc.start.offset, utilityFindings))
  }
  return findings
}

function literalValues(node) {
  if (!node?.type) return []
  if (typeof node.value === 'string') return [node]
  if (node.type === 'TemplateLiteral' && !node.expressions.length)
    return [{ value: node.quasis[0].value.cooked, range: node.range }]
  return Object.entries(node)
    .filter(([key]) => key !== 'parent')
    .flatMap(([, child]) => (Array.isArray(child) ? child : [child]))
    .flatMap(literalValues)
}

function attributeFindings(node, text) {
  if (node.directive && node.key.name.name !== 'bind') return []
  const name = node.directive ? node.key.argument?.name : node.key.name
  if (!/^(?:fill|stroke|color|stop-color|flood-color|lighting-color)$/.test(name ?? '')) return []
  const value = node.directive ? node.value?.expression : node.value
  const findings = literalValues(value).flatMap((literal) => {
    const start = literal.range[0]
    const offset = start + (/['"`]/.test(text[start]) ? 1 : 0)
    return colourValueFindings(literal.value, name, offset)
  })
  if (node.directive && value)
    findings.push(
      ...scan(
        text.slice(value.range[0], value.range[1]),
        [{ messageId: 'rawColour', pattern: colourFunctions }],
        value.range[0],
      ),
    )
  return findings
}

export const designRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Keep new UI files on Relay tokens: no raw colours, arbitrary Tailwind values or inline styles.',
    },
    messages: designMessages,
    schema: [],
  },
  create(context) {
    const source = context.sourceCode
    const reported = new Set()
    function report({ messageId, index, length }) {
      const key = `${messageId}:${index}`
      if (reported.has(key)) return
      reported.add(key)
      context.report({
        messageId,
        loc: { start: source.getLocFromIndex(index), end: source.getLocFromIndex(index + length) },
      })
    }
    const visitor = {
      'Program:exit'() {
        fileFindings(
          source.text,
          context.filename,
          Boolean(source.parserServices.defineTemplateBodyVisitor),
        ).forEach(report)
      },
    }
    return (
      source.parserServices.defineTemplateBodyVisitor?.(
        {
          VAttribute(node) {
            attributeFindings(node, source.text).forEach(report)
          },
        },
        visitor,
      ) ?? visitor
    )
  },
}

export default { rules: { design: designRule } }
