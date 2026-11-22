import * as css from 'css-tree'
import { parseStylesheet, stylesheetFindings } from './design-css.mjs'
import { children, createValuePolicy, decode, keyword } from './design-values.mjs'

const mixSupport = '(color:color-mix(in lab,red,red))'
const propertySupport =
  '((-webkit-hyphens:none) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b))))'
const shadow = [
  '--tw-shadow',
  '--tw-inset-shadow',
  '--tw-ring-shadow',
  '--tw-inset-ring-shadow',
  '--tw-ring-offset-shadow',
]
const colour = [
  '--tw-shadow-color',
  '--tw-inset-shadow-color',
  '--tw-ring-color',
  '--tw-inset-ring-color',
  '--tw-ring-offset-color',
]
const shapes = new Map([
  ...shadow.map((name) => [name, ['*', '0 0#0000', 'shadow']]),
  ...colour.map((name) => [
    name,
    ['*', name === '--tw-ring-offset-color' ? '#fff' : null, 'color'],
  ]),
  ['--tw-shadow-alpha', ['<percentage>', '100%', 'percentage']],
  ['--tw-inset-shadow-alpha', ['<percentage>', '100%', 'percentage']],
  ['--tw-ring-inset', ['*', null, 'shadow']],
  ['--tw-ring-offset-width', ['<length>', '0px', 'length']],
  ['--tw-border-style', ['*', 'solid', 'borderStyle']],
  ['--tw-leading', ['*', null, 'lineHeight']],
  ['--tw-font-weight', ['*', null, 'weight']],
])

function registration(node) {
  const name = node.prelude?.value?.trim()
  const shape = shapes.get(name)
  if (!shape || !node.block) return null
  const expected = `syntax:"${shape[0]}";inherits:false${shape[1] == null ? '' : `;initial-value:${shape[1]}`}`
  return css.generate(node.block) === `{${expected}}` ? { name, shape } : null
}

function prelude(node) {
  return node.prelude ? css.generate(node.prelude).replace(/\s*([:,])\s*/g, '$1') : ''
}

function propertyDefaults(node, registrations) {
  if (keyword(node.name) !== 'layer' || prelude(node) !== 'properties') return false
  const [support, ...rest] = children(node.block)
  if (
    rest.length ||
    support?.type !== 'Atrule' ||
    keyword(support.name) !== 'supports' ||
    prelude(support) !== propertySupport
  )
    return false
  const [rule, ...others] = children(support.block)
  if (
    others.length ||
    rule?.type !== 'Rule' ||
    css.generate(rule.prelude) !== '*,::before,::after,::backdrop'
  )
    return false
  const declarations = children(rule.block)
  const actual = declarations.map((item) => [
    decode(item.property ?? ''),
    item.type === 'Declaration' ? css.generate(item.value) : '',
  ])
  return (
    actual.length === registrations.size &&
    actual.every(([name, value]) => {
      const shape = registrations.get(name)
      return shape && value === (shape[1] ?? 'initial')
    }) &&
    new Set(actual.map(([name]) => name)).size === actual.length
  )
}

function rootDeclarations(approved) {
  const values = new Set()
  const { ast } = parseStylesheet(approved)
  css.walk(ast, {
    visit: 'Rule',
    enter(node) {
      const selector = css.generate(node.prelude)
      for (const item of children(node.block))
        if (item.type === 'Declaration') values.add(`${selector}|${css.generate(item)}`)
    },
  })
  return values
}

function contractFailure(construct) {
  return { messageId: 'compilerContract', index: 0, length: 1, construct }
}

export function compiledDesignFindings(output, approved) {
  const parsed = parseStylesheet(output)
  if (!parsed.ast) return [contractFailure('malformed compiler output')]
  const ast = parsed.ast
  const findings = []
  const registrations = new Map()
  css.walk(ast, {
    visit: 'Atrule',
    enter(node, item, list) {
      if (keyword(node.name) !== 'property') return
      const known = registration(node)
      if (!known || registrations.has(known.name))
        findings.push(contractFailure(`unknown registration ${css.generate(node)}`))
      else {
        registrations.set(known.name, known.shape)
        list.remove(item)
      }
      return this.skip
    },
  })
  const roots = rootDeclarations(approved)
  css.walk(ast, {
    visit: 'Rule',
    enter(node) {
      const selector = css.generate(node.prelude)
      node.block.children.forEach((declaration, item, list) => {
        if (
          declaration.type === 'Declaration' &&
          roots.has(`${selector}|${css.generate(declaration)}`)
        )
          list.remove(item)
      })
    },
  })
  css.walk(ast, {
    visit: 'Atrule',
    enter(node, item, list) {
      if (propertyDefaults(node, registrations)) {
        list.remove(item)
        return this.skip
      }
      if (keyword(node.name) === 'supports' && prelude(node) === mixSupport) {
        list.replace(item, node.block.children)
        return this.skip
      }
    },
  })
  css.walk(ast, {
    visit: 'Function',
    enter(node) {
      if (keyword(node.name) === 'var' && children(node)[0]?.name === '--tw-ring-offset-color')
        findings.push(contractFailure('painting use of the raw --tw-ring-offset-color default'))
    },
  })
  const transformed = css.generate(ast)
  const tokens = new Map([...registrations].map(([name, shape]) => [name, shape[2]]))
  const policy = createValuePolicy({ approved, definitions: [ast], tokenTypes: tokens })
  findings.push(
    ...stylesheetFindings(transformed, 0, () => [], { policy }).map((item) =>
      contractFailure(item.construct || item.messageId),
    ),
  )
  return findings
}
