import {
  adaptDesignSource,
  analyseDesignInputs,
  styleDefinitions,
  utilityFindings,
} from './design-adapters.mjs'
import { designAuthority } from './design-authority.mjs'
import { createValuePolicy } from './design-values.mjs'

export { utilityFindings }
export const designMessages = {
  inlineStyle: 'Inline styles are not allowed in new UI files; use Relay token utilities.',
  arbitraryValue:
    'Arbitrary Tailwind values are not allowed in new UI files; use a Relay token utility.',
  rawColour: 'Raw colour {{construct}} is not allowed in new UI files; use a Relay colour token.',
  unsupportedRegistration:
    'Authored @property registration is unsupported; use a checked Relay token alias.',
  unsupportedSyntax:
    'Unsupported design syntax: {{construct}}. Use the supported Relay token grammar.',
  unsupportedSource:
    'Unsupported design source: {{construct}}. Use static Vue/CSS and resolved local stylesheets.',
  unresolvedToken:
    'Unresolved colour or value origin: {{construct}}. Use an approved typed token or a checked alias and fallback.',
  tokenType:
    'Incompatible token type: {{construct}}. Use a token and fallback of the required type.',
  malformedCss: 'Malformed CSS: {{construct}}. Use complete supported CSS syntax.',
  compilerContract:
    'Unsupported Tailwind 4.2.0 expansion: {{construct}}. Use a checked Relay token utility.',
}

export const designRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Keep selected UI sources on the closed Relay token language.' },
    messages: designMessages,
    schema: [],
  },
  create(context) {
    return {
      'Program:exit'() {
        const source = context.sourceCode
        const inputs = adaptDesignSource(
          source.text,
          context.filename.endsWith('.vue') || source.parserServices.defineTemplateBodyVisitor
            ? 'SourceView.vue'
            : 'source.ts',
        )
        const policy = createValuePolicy({
          approved: designAuthority(),
          definitions: styleDefinitions(inputs),
        })
        const reported = new Set()
        for (const item of analyseDesignInputs(inputs, policy)) {
          const key = `${item.messageId}:${item.index}`
          if (reported.has(key)) continue
          reported.add(key)
          const start = Math.min(item.index, source.text.length)
          const end = Math.min(start + item.length, source.text.length)
          context.report({
            messageId: item.messageId,
            data: { construct: item.construct ?? '' },
            loc: { start: source.getLocFromIndex(start), end: source.getLocFromIndex(end) },
          })
        }
      },
    }
  },
}
