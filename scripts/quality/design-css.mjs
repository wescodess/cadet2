import * as css from 'css-tree'

const syntax = css.fork({
  atrule: Object.fromEntries(
    ['theme', 'utility', 'variant', 'custom-variant'].map((name) => [
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

const colourProperty =
  /^(?:--|(?:.*-)?color$|background(?:-|$)|border(?:-|$)|outline(?:-|$)|(?:box|text)-shadow$|text-decoration(?:-|$)|column-rule(?:-|$)|fill$|stroke$|filter$|backdrop-filter$|accent-color$|caret-color$)/i
const colourFunction = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|device-cmyk)$/i
const colourContainer =
  /^(?:(?:repeating-)?(?:linear|radial|conic)-gradient|color-mix|light-dark|drop-shadow)$/i

function valueFindings(value, property, offset) {
  const propertyName = css.ident.decode(property)
  syntax.walk(value, (node) => {
    if (node.type === 'Identifier' || node.type === 'Function')
      node.name = css.ident.decode(node.name)
  })
  const findings = []
  const match = css.lexer.matchProperty(propertyName, value)
  syntax.walk(value, function (node) {
    const raw =
      node.type === 'Hash' ||
      (node.type === 'Function' && colourFunction.test(node.name)) ||
      (node.type === 'Identifier' &&
        (colourProperty.test(propertyName) ||
          match.isType(node, 'color') ||
          colourContainer.test(this.function?.name ?? '')) &&
        !/^(?:currentcolor|transparent)$/i.test(node.name) &&
        css.lexer.matchType('color', node.name).matched)
    if (!raw) return
    findings.push({
      messageId: 'rawColour',
      index: offset + node.loc.start.offset,
      length: node.loc.end.offset - node.loc.start.offset,
    })
    return this.skip
  })
  return findings
}

export function colourValueFindings(text, property, offset = 0) {
  return valueFindings(syntax.parse(text, { context: 'value', positions: true }), property, offset)
}

export function stylesheetFindings(text, offset = 0, utilities = () => []) {
  const ast = syntax.parse(text, {
    positions: true,
    parseCustomProperty: true,
    parseAtrulePrelude: false,
    onParseError(error) {
      throw error
    },
  })
  const findings = []
  syntax.walk(ast, {
    visit: 'Declaration',
    enter(node) {
      findings.push(...valueFindings(node.value, node.property, offset))
    },
  })
  syntax.walk(ast, {
    visit: 'Atrule',
    enter(node) {
      if (node.name === 'apply' && node.prelude)
        findings.push(
          ...utilities(
            text.slice(node.prelude.loc.start.offset, node.prelude.loc.end.offset),
            offset + node.prelude.loc.start.offset,
          ),
        )
    },
  })
  return findings
}
