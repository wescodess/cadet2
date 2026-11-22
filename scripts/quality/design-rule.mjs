const palette =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const colourUtility =
  'bg|text|border|border-[trblxy]|ring|ring-offset|fill|stroke|outline|from|via|to|shadow|decoration|divide|placeholder|caret|accent'

const checks = [
  { messageId: 'inlineStyle', pattern: /(?<=\s)(?:v-bind:|:)?style\s*=/g, template: true },
  { messageId: 'arbitraryValue', pattern: /(?<![\w$])[\w:@!/.-]*-\[[^\]\s'"`]+\]/g },
  { messageId: 'arbitraryValue', pattern: /(?<![\w$&[])\[[a-z-]+:[^\]\s'"`]+\]/g },
  {
    messageId: 'rawColour',
    pattern: /(?<![\w&/-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi,
    skip: (before) => /(?:href|to)\s*=\s*["']$/.test(before),
  },
  { messageId: 'rawColour', pattern: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g },
  {
    messageId: 'rawColour',
    pattern: new RegExp(
      `(?<![\\w-])(?:${colourUtility})-(?:(?:${palette})-\\d{2,3}|white|black)(?![\\w-])`,
      'g',
    ),
  },
]

function templateRange(text) {
  const start = text.indexOf('<template')
  const end = text.lastIndexOf('</template>')
  return start < 0 || end < 0 ? null : [start, end]
}

export const designRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Keep new UI files on Relay tokens: no raw colours, arbitrary Tailwind values or inline styles.',
    },
    messages: {
      inlineStyle: 'Inline styles are not allowed in new UI files; use Relay token utilities.',
      arbitraryValue:
        'Arbitrary Tailwind values are not allowed in new UI files; use a Relay token utility.',
      rawColour: 'Raw colours are not allowed in new UI files; use a Relay colour token.',
    },
    schema: [],
  },
  create(context) {
    const source = context.sourceCode
    return {
      'Program:exit'() {
        const text = source.text
        const template = templateRange(text)
        for (const { messageId, pattern, template: templateOnly, skip } of checks) {
          for (const match of text.matchAll(pattern)) {
            const index = match.index ?? 0
            if (templateOnly && (!template || index < template[0] || index > template[1])) continue
            if (skip?.(text.slice(Math.max(0, index - 16), index))) continue
            context.report({
              messageId,
              loc: {
                start: source.getLocFromIndex(index),
                end: source.getLocFromIndex(index + match[0].length),
              },
            })
          }
        }
      },
    }
  },
}

export default { rules: { design: designRule } }
