import { readFileSync } from 'node:fs'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { parse } from 'vue/compiler-sfc'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

import { contrast } from '../../../scripts/design/contrast-record.mjs'
import { repoPath } from '../../unit/design/css-source'

const page = 'app/pages/admin/audit-trail.client.vue'
const textMinimum = 4.5

const colours: Record<string, string> = {
  white: '#ffffff',
  'slate-100': '#f1f5f9',
  'slate-400': '#90a1b9',
  'cyan-50': '#ecfeff',
  'accent-foreground': '#16181d',
  'muted-foreground': '#5a606c',
}

const ELEMENT = 1
const ATTRIBUTE = 6
const DIRECTIVE = 7

interface TemplateNode {
  type: number
  tag?: string
  props?: {
    type: number
    name: string
    arg?: { content: string }
    exp?: { content: string }
    value?: { content: string }
  }[]
  children?: TemplateNode[]
}

const hoverSurface = { pill: '#041f31', panel: '#1e2433' }
const inputSurface = '#0d1528'

function elements(nodes: TemplateNode[], tag: string): TemplateNode[] {
  return nodes.flatMap((node) => {
    const children = elements(node.children ?? [], tag)
    return node.type === ELEMENT && node.tag === tag ? [node, ...children] : children
  })
}

function attribute(node: TemplateNode, name: string) {
  const prop = node.props?.find(
    (candidate) => candidate.type === ATTRIBUTE && candidate.name === name,
  )
  return prop ? (prop.value?.content ?? '') : undefined
}

function boundClassLiterals(node: TemplateNode) {
  const prop = node.props?.find(
    (candidate) =>
      candidate.type === DIRECTIVE &&
      candidate.name === 'bind' &&
      candidate.arg?.content === 'class',
  )
  return [...(prop?.exp?.content ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1] as string)
}

const template = (parse(readFileSync(repoPath(page), 'utf8')).descriptor.template?.ast?.children ??
  []) as unknown as TemplateNode[]

function emittedColour(classes: string[], prefix: string) {
  const matches = classes.filter((name) => name.startsWith(prefix))
  expect(matches).toHaveLength(1)
  const token = (matches[0] as string).slice(prefix.length)
  const colour = colours[token]
  if (!colour) throw new Error(`No independent literal for ${prefix}${token}`)
  return colour
}

const outlineButtons = elements(template, 'Button').filter(
  (node) => attribute(node, 'variant') === 'outline',
)

describe('legacy audit trail contrast after the Relay token swap', () => {
  it('finds the four outline Buttons the token swap reaches', () => {
    expect(outlineButtons).toHaveLength(4)
  })

  it('keeps every outline Button hover label at least 4.5:1 on its hover surface', () => {
    for (const node of outlineButtons) {
      const resting = attribute(node, 'class') ?? ''
      const surface = resting.includes('rounded-full') ? hoverSurface.pill : hoverSurface.panel
      for (const state of [[resting], [resting, ...boundClassLiterals(node)]]) {
        const classes = mount(Button, { props: { variant: 'outline', class: state } }).classes()
        const colour = emittedColour(classes, 'hover:text-')
        expect(
          contrast(colour, surface),
          `${state.join(' ')} on ${surface}`,
        ).toBeGreaterThanOrEqual(textMinimum)
      }
    }
  })

  it('keeps every Input placeholder at least 4.5:1 on the input surface', () => {
    const inputs = elements(template, 'Input').filter(
      (node) => attribute(node, 'placeholder') !== undefined,
    )
    expect(inputs).toHaveLength(2)
    for (const node of inputs) {
      const classes = mount(Input, { props: { class: attribute(node, 'class') } }).classes()
      const colour = emittedColour(classes, 'placeholder:text-')
      expect(contrast(colour, inputSurface)).toBeGreaterThanOrEqual(textMinimum)
    }
  })
})
