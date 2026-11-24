import { computeAccessibleName, getRole } from 'dom-accessibility-api'
import { expect } from 'vitest'

const ariaAttributes = new Set([
  'aria-atomic',
  'aria-busy',
  'aria-current',
  'aria-describedby',
  'aria-description',
  'aria-disabled',
  'aria-expanded',
  'aria-hidden',
  'aria-invalid',
  'aria-label',
  'aria-labelledby',
  'aria-live',
  'aria-modal',
  'aria-pressed',
  'aria-relevant',
  'aria-selected',
])
const roles = new Set([
  'alert',
  'status',
  'navigation',
  'region',
  'list',
  'listitem',
  'link',
  'button',
  'term',
  'definition',
  'group',
  'heading',
  'img',
  'none',
  'presentation',
])
const named = new Set(['link', 'button', 'navigation', 'region', 'img'])

export type Target = Element | { element: unknown }

export function elementOf(target: Target): Element {
  const element = target instanceof Element ? target : target.element
  if (!(element instanceof Element)) throw new Error('Expected a mounted element')
  return element
}

function hidden(element: Element) {
  return element.closest('[aria-hidden="true"]') !== null
}

function attributeViolations(element: Element, label: string): string[] {
  const violations: string[] = []
  for (const { name, value } of element.attributes) {
    if (name.startsWith('aria-') && !ariaAttributes.has(name))
      violations.push(`${label} unknown ${name}`)
    if (name === 'role' && !roles.has(value)) violations.push(`${label} unknown role ${value}`)
    if (name === 'tabindex' && Number(value) > 0) violations.push(`${label} positive tabindex`)
    if (name === 'style') violations.push(`${label} inline style`)
    if (name === 'aria-labelledby' || name === 'aria-describedby') {
      const missing = value.split(/\s+/).filter((id) => !element.ownerDocument.getElementById(id))
      violations.push(...missing.map((id) => `${label} ${name} points at missing #${id}`))
    }
  }
  return violations
}

function semanticViolations(element: Element, label: string): string[] {
  if (
    element.tagName.toLowerCase() === 'svg' &&
    !hidden(element) &&
    !computeAccessibleName(element)
  )
    return [`${label} graphic without a name is not aria-hidden`]
  if (hidden(element)) {
    return element.matches('a, button, input, select, textarea, [tabindex]')
      ? [`${label} focusable element is aria-hidden`]
      : []
  }
  const role = getRole(element)
  if (role && named.has(role) && !computeAccessibleName(element).trim())
    return [`${label} ${role} has no accessible name`]
  return []
}

function accessibilityViolations(target: Target): string[] {
  const root = elementOf(target)
  const elements = [root, ...root.querySelectorAll('*')]
  const ids = elements.map((element) => element.id).filter(Boolean)
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
  return [
    ...elements.flatMap((element) => {
      const label = `<${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}>`
      return [...attributeViolations(element, label), ...semanticViolations(element, label)]
    }),
    ...duplicates.map((id) => `duplicate id #${id}`),
  ]
}

export function expectAccessible(target: Target) {
  expect(accessibilityViolations(target)).toEqual([])
}

export function readableText(target: Target): string {
  const parts: string[] = []
  const walk = (node: Node) => {
    if (node instanceof Element && node.getAttribute('aria-hidden') === 'true') return
    if (node.nodeType === Node.TEXT_NODE) parts.push(node.textContent ?? '')
    node.childNodes.forEach(walk)
  }
  walk(elementOf(target))
  return parts.join('').replace(/\s+/g, ' ').trim()
}

export function nth<T>(items: readonly T[], index: number): T {
  const item = items[index]
  if (item === undefined) throw new Error(`No item at ${String(index)}`)
  return item
}
