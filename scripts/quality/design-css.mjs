import * as css from 'css-tree'
import { conditionFindings } from './design-conditions.mjs'
import { children, createValuePolicy, decode, finding, keyword } from './design-values.mjs'

const syntax = css.fork({
  atrule: Object.fromEntries(
    ['theme', 'utility', 'variant'].map((name) => [
      name,
      {
        parse: {
          block() {
            return this.Block(true)
          },
        },
      },
    ]),
  ),
})
const standard = new Set(
  'charset import layer media supports container keyframes font-face'.split(' '),
)
const directives = new Set('theme utility variant custom-variant apply reference'.split(' '))

export function lexicalFinding(text) {
  const stack = []
  let invalid = null
  const t = css.tokenTypes
  const openings = new Map([
    [t.Function, t.RightParenthesis],
    [t.LeftParenthesis, t.RightParenthesis],
    [t.LeftSquareBracket, t.RightSquareBracket],
    [t.LeftCurlyBracket, t.RightCurlyBracket],
  ])
  const closings = new Set([t.RightParenthesis, t.RightSquareBracket, t.RightCurlyBracket])
  css.tokenize(text, (type, start, end) => {
    const token = text.slice(start, end)
    if (openings.has(type)) stack.push({ close: openings.get(type), start })
    if (closings.has(type) && stack.pop()?.close !== type) invalid ??= start
    if ([t.BadString, t.BadUrl, t.CDO, t.CDC].includes(type)) invalid ??= start
    if (type === t.Comment && !token.endsWith('*/')) invalid ??= start
    if (type === t.String && (token.length < 2 || token.at(-1) !== token[0])) invalid ??= start
    if (type === t.Url && !token.endsWith(')')) invalid ??= start
    if (type === t.Delim && token === '\\') invalid ??= start
  })
  if (text.includes('\0')) invalid ??= text.indexOf('\0')
  invalid ??= stack[0]?.start
  return invalid == null
    ? null
    : {
        messageId: 'malformedCss',
        index: invalid,
        length: 1,
        construct: 'unbalanced or malformed CSS token',
      }
}

export function parseStylesheet(text) {
  const lexical = lexicalFinding(text)
  if (lexical) return { ast: null, findings: [lexical] }
  try {
    const ast = syntax.parse(text, {
      positions: true,
      parseCustomProperty: true,
      parseAtrulePrelude: false,
      onParseError(error) {
        throw error
      },
    })
    return { ast, findings: [] }
  } catch (error) {
    return {
      ast: null,
      findings: [
        {
          messageId: 'malformedCss',
          index: error.offset ?? 0,
          length: 1,
          construct: error.message,
        },
      ],
    }
  }
}

function parsedPrelude(node, text) {
  if (!node.prelude) return null
  const start = node.prelude.loc.start.offset
  return css.parse(text.slice(start, node.prelude.loc.end.offset), {
    context: 'atrulePrelude',
    atrule: keyword(node.name),
    positions: true,
    offset: start,
    parseCustomProperty: true,
    onParseError(error) {
      throw error
    },
  })
}

function rawFindings(ast) {
  const findings = []
  css.walk(ast, (node) => {
    if (node.type === 'Raw') findings.push(finding('unsupportedSyntax', node, 'unparsed CSS'))
  })
  return findings
}

function customVariant(node, prelude) {
  const custom = /^([a-z][a-z0-9-]*)\s+\(([\s\S]+)\)$/.exec(prelude)
  if (node.block || !custom) return [finding('unsupportedSyntax', node, '@custom-variant selector')]
  try {
    return rawFindings(css.parse(custom[2], { context: 'selectorList' }))
  } catch {
    return [finding('unsupportedSyntax', node, '@custom-variant selector')]
  }
}

function directivePrelude(node, text, utilities) {
  const prelude = node.prelude
    ? text.slice(node.prelude.loc.start.offset, node.prelude.loc.end.offset).trim()
    : ''
  const name = keyword(node.name)
  if (name === 'custom-variant') return customVariant(node, prelude)
  if (name === 'apply' && prelude && !node.block)
    return utilities(prelude, node.prelude.loc.start.offset)
  const grammar = {
    reference: { block: false, pattern: /^(?:"[^"\n]+"|'[^'\n]+')$/ },
    theme: { block: true, pattern: /^(?:inline)?$/ },
    utility: { block: true, pattern: /^[a-z][a-z0-9-]*(?:\*)?$/ },
    variant: { block: true, pattern: /^[a-z][a-z0-9-]*$/ },
  }[name]
  if (grammar && Boolean(node.block) === grammar.block && grammar.pattern.test(prelude)) return []
  return [finding('unsupportedSyntax', node, `@${name} ${prelude}`)]
}

function standardPrelude(node, text, policy) {
  const name = keyword(node.name)
  const prelude = parsedPrelude(node, text)
  if (!prelude)
    return name === 'layer' && node.block
      ? []
      : [finding('unsupportedSyntax', node, `@${name} missing prelude`)]
  const findings = [...rawFindings(prelude), ...conditionFindings(prelude)]
  css.walk(prelude, (item) => {
    if (item.type !== 'Declaration') return
    findings.push(...policy.declaration(item))
    item.value = policy.grammarValue(item.value)
  })
  if (!css.lexer.matchAtrulePrelude(name, prelude).matched)
    findings.push(finding('unsupportedSyntax', node, `@${name} prelude`))
  if (name === 'charset' && node.loc.start.offset !== 0)
    findings.push(finding('unsupportedSyntax', node, '@charset position'))
  if (['charset', 'import'].includes(name) && node.block)
    findings.push(finding('unsupportedSyntax', node, `@${name} block`))
  if (['media', 'supports', 'container', 'keyframes'].includes(name) && !node.block)
    findings.push(finding('unsupportedSyntax', node, `@${name} missing block`))
  return findings
}

function atRuleFindings(node, state) {
  const name = keyword(node.name)
  if (name === 'property') return [finding('unsupportedRegistration', node, '@property')]
  if (directives.has(name)) return directivePrelude(node, state.text, state.utilities)
  if (!standard.has(name)) return [finding('unsupportedSyntax', node, `@${name}`)]
  if (name === 'font-face')
    return node.prelude || !node.block
      ? [finding('unsupportedSyntax', node, '@font-face prelude/block')]
      : []
  try {
    return standardPrelude(node, state.text, state.policy)
  } catch (error) {
    return [finding('unsupportedSyntax', node, `@${name} prelude: ${error.message}`)]
  }
}

function declarationFindings(node, owner, state) {
  if (owner === 'font-face' && decode(node.property).startsWith('--'))
    return [finding('unsupportedSyntax', node, '@font-face custom descriptor')]
  return state.policy.declaration(node, {
    descriptor: owner === 'font-face' ? owner : null,
    integerUtility: state.atRules.includes('utility'),
  })
}

function visitStyle(node, owner, state) {
  if (node.type === 'Atrule') {
    const name = keyword(node.name)
    state.findings.push(...atRuleFindings(node, state))
    if (!standard.has(name) && !directives.has(name)) return
    state.atRules.push(name)
    if (node.block) visitStyle(node.block, name, state)
    state.atRules.pop()
    return
  }
  if (node.type === 'Declaration') {
    state.findings.push(...declarationFindings(node, owner, state))
    return
  }
  if (node.type === 'Raw') state.findings.push(finding('unsupportedSyntax', node, 'unparsed CSS'))
  if (node.type === 'Rule' && node.prelude) state.findings.push(...rawFindings(node.prelude))
  for (const child of children(node)) visitStyle(child, owner, state)
  if (node.type === 'Rule') visitStyle(node.block, owner, state)
}

export function stylesheetFindings(text, offset = 0, utilities = () => [], options = {}) {
  const parsed = parseStylesheet(text)
  if (!parsed.ast) return parsed.findings.map((item) => ({ ...item, index: item.index + offset }))
  const definitions = [...(options.definitions ?? []), parsed.ast]
  const policy = options.policy ?? createValuePolicy({ ...options, definitions })
  const state = { text, utilities, policy, findings: [], atRules: [] }
  visitStyle(parsed.ast, null, state)
  return state.findings.map((item) => ({ ...item, index: item.index + offset }))
}

export function colourValueFindings(text, property, offset = 0, options = {}) {
  const lexical = lexicalFinding(text)
  if (lexical) return [{ ...lexical, index: lexical.index + offset }]
  try {
    const value = css.parse(text, {
      context: 'value',
      positions: true,
      parseCustomProperty: true,
      onParseError(error) {
        throw error
      },
    })
    const policy = options.policy ?? createValuePolicy(options)
    return policy
      .check(value, keyword(property))
      .map((item) => ({ ...item, index: item.index + offset }))
  } catch (error) {
    return [
      {
        messageId: 'malformedCss',
        index: offset + (error.offset ?? 0),
        length: 1,
        construct: error.message,
      },
    ]
  }
}
