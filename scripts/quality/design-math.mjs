import * as css from 'css-tree'

const list = (node) => node.children?.toArray() ?? []
const symbolic = { number: '1', percentage: '1%', length: '1px', time: '1s', angle: '1deg' }
const math = new Set(['calc', 'min', 'max', 'clamp'])

function scalar(node) {
  if (
    node.type === 'Number' ||
    (node.type === 'Identifier' && ['infinity', '-infinity', 'pi', 'e'].includes(node.name))
  )
    return 'number'
  if (node.type === 'Percentage') return 'percentage'
  if (node.type === 'Parentheses') return expression(list(node))
  if (node.type !== 'Dimension') return null
  for (const type of ['length', 'time', 'angle'])
    if (css.lexer.matchType(type, css.generate(node)).matched) return type
  return null
}

function compatible(a, b) {
  if (a === b) return a
  return [a, b].every((type) => ['length', 'percentage'].includes(type)) ? 'length' : null
}

function operation(a, operator, b) {
  if (!a || !b) return null
  if (['+', '-'].includes(operator)) return compatible(a, b)
  if (operator === '*') return a === 'number' ? b : b === 'number' ? a : null
  if (operator === '/') return b === 'number' ? a : null
  return null
}

function expression(nodes) {
  if (!nodes.length) return null
  const values = []
  const operators = []
  for (let i = 0; i < nodes.length; i++) {
    if (i % 2 === 0) values.push(scalar(nodes[i]))
    else if (nodes[i].type === 'Operator') operators.push(nodes[i].value.trim())
    else return null
  }
  if (values.length !== operators.length + 1 || values.some((type) => !type)) return null
  for (let i = 0; i < operators.length;) {
    if (!['*', '/'].includes(operators[i])) {
      i++
      continue
    }
    values.splice(i, 2, operation(values[i], operators[i], values[i + 1]))
    operators.splice(i, 1)
  }
  return operators.reduce(
    (type, operator, i) => operation(type, operator, values[i + 1]),
    values[0],
  )
}

function resultType(node) {
  const groups = [[]]
  for (const item of list(node)) {
    if (item.type === 'Operator' && item.value === ',') groups.push([])
    else groups.at(-1).push(item)
  }
  if (node.name === 'calc' && groups.length !== 1) return null
  if (node.name === 'clamp' && groups.length !== 3) return null
  const types = groups.map(expression)
  if (types.some((type) => !type)) return null
  return types.reduce(compatible)
}

export function substituteMath(value) {
  const invalid = []
  css.walk(value, {
    visit: 'Function',
    leave(node, item, parent) {
      if (!math.has(node.name)) return
      const type = resultType(node)
      if (!type) {
        invalid.push(node)
        return
      }
      const replacement = css.parse(symbolic[type], { context: 'value' }).children
      replacement.forEach((child) => {
        child.loc = node.loc
      })
      parent.replace(item, replacement)
    },
  })
  return invalid
}
