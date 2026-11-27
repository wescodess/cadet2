// @vitest-environment node
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { stylesheetFindings } from '../../scripts/quality/design-css.mjs'

it('rejects authored registrations regardless of descriptor syntax and escaped spelling', () => {
  for (const source of [
    '@property --ink {syntax:"<color>";inherits:false;initial-value:rebeccapurple}',
    '@property --ink {syntax:"*";inherits:false;initial-value:transparent}',
    '@property --size {syntax:"<number>";inherits:false;initial-value:0}',
    String.raw`@pr\6f perty --ink {i\6e itial-value:r\65 d}`,
  ]) {
    expect(stylesheetFindings(source), source).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ messageId: 'unsupportedRegistration', index: 0 }),
      ]),
    )
  }
})

it('fails closed on unsupported contexts, raw fallbacks and malformed lexical balance', () => {
  for (const source of [
    '@future-colour { paint: rebeccapurple }',
    '@font-face { future-descriptor: red }',
    'p { future-property: var(--foreground) }',
    'p { color: future-color(var(--foreground)) }',
    'p { color: var(--foreground, red) }',
    'p { color: var(--foreground, var(--other, red)) }',
    '@supports (color:red) {p {color:var(--foreground)}}',
    'p { color: var(--foreground)',
    'p { content: "unfinished }',
  ])
    expect(stylesheetFindings(source), source).not.toEqual([])
})

it('checks every alias definition with case-sensitive names and keeps non-paint identifiers', () => {
  const approved = readFileSync('docs/design/system/tokens.css', 'utf8')
  const check = (source) => stylesheetFindings(source, 0, () => [], { approved })
  for (const source of [
    ':root{--card:red} p{color:var(--card)}',
    ':root{--Ink:var(--foreground)} p{color:var(--ink)}',
    ':root{--a:var(--b);--b:var(--a)} p{color:var(--a)}',
    ':root{--size:2px} p{color:var(--size)}',
    ':root{--font:red}',
    ':root{--ink:var(--foreground)} .scoped{--ink:blue}',
    ':root{--choice:2px} .scoped{--choice:var(--foreground)}',
  ])
    expect(check(source), source).not.toEqual([])
  expect(
    check(
      ':root{--Ink:var(--foreground)} p{color:var(--Ink);stroke:var(--glyph-cut,var(--card));font-family:red;animation:red 1s;content:"red #abc rgb(0 0 0)";background:url("#abc")} @keyframes red{to{opacity:0}}',
    ),
  ).toEqual([])
})

it('keeps numeric math typed without allowing colour operands through permissive calc grammar', () => {
  const approved = readFileSync('docs/design/system/tokens.css', 'utf8')
  expect(
    stylesheetFindings(
      'p{width:max(24px,var(--check-size));height:clamp(1px,2px,3px)}',
      0,
      () => [],
      { approved },
    ),
  ).toEqual([])
  for (const source of [
    'p{width:calc(red * 1px)}',
    'p{color:calc(1 * 1px)}',
    '@utility bad-*{color:rgb(--value(integer) 0 0)}',
  ])
    expect(
      stylesheetFindings(source, 0, () => [], { approved }),
      source,
    ).not.toEqual([])
})

it('applies the value policy to declaration-bearing conditions with their original locations', () => {
  const approved = readFileSync('docs/design/system/tokens.css', 'utf8')
  const check = (source) => stylesheetFindings(source, 0, () => [], { approved })
  expect(check('@supports (color:red){p{color:var(--foreground)}}')).toEqual(
    expect.arrayContaining([expect.objectContaining({ messageId: 'rawColour', index: 17 })]),
  )
  expect(check('@supports (color:var(--foreground)){p{color:var(--foreground)}}')).toEqual([])
})

it('rejects unknown condition features and media types while keeping known non-paint queries', () => {
  const approved = readFileSync('docs/design/system/tokens.css', 'utf8')
  const check = (source) => stylesheetFindings(source, 0, () => [], { approved })
  for (const source of [
    '@media (future-feature:red){p{color:var(--foreground)}}',
    '@media imaginary{p{color:var(--foreground)}}',
    '@media (prefers-color-scheme:red){p{color:var(--foreground)}}',
  ])
    expect(check(source), source).not.toEqual([])
  for (const source of [
    '@media screen and (width>=320px){p{color:var(--foreground)}}',
    '@media (prefers-reduced-motion:reduce){p{color:var(--foreground)}}',
    '@container panel (width>1px){p{color:var(--foreground)}}',
  ])
    expect(check(source), source).toEqual([])
})

it('preserves font and colour reference types across aliases and shorthand operands', () => {
  const approved = readFileSync('docs/design/system/tokens.css', 'utf8')
  const check = (source) => stylesheetFindings(source, 0, () => [], { approved })
  for (const source of [
    '@theme{--font-shade:red}p{text-emphasis:var(--font-shade)}',
    '@theme{--font-shade:red}:root{--alias:var(--font-shade)}p{text-emphasis:var(--alias)}',
    'p{font-family:var(--foreground)}',
    'p{fill:context-fill}',
    'p{stroke:context-stroke}',
    String.raw`p{color:var(--\\66\ oreground)}`,
  ])
    expect(check(source), source).not.toEqual([])
  expect(
    check(
      '@theme{--font-label:red}:root{--alias:var(--font-label)}p{font-family:var(--alias);color:var(--foreground)}',
    ),
  ).toEqual([])
})
