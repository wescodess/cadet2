import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { repoPath } from './css-source'

const theme = readFileSync(repoPath('app/assets/css/tailwind.css'), 'utf8')
const relay = readFileSync(repoPath('app/assets/css/relay.css'), 'utf8')

function rule(css: string, selector: string) {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`Missing ${selector}`)
  return css.slice(start, css.indexOf('}', start) + 1)
}

describe('Relay focus, motion and edges', () => {
  it('draws the 2 px ultramarine focus ring outside every layer, so no utility can hide it', () => {
    const focus = rule(theme, ':focus-visible')
    expect(focus).toContain('outline: var(--focus-w, 2px) solid var(--ring);')
    expect(focus).toContain('outline-offset: var(--focus-off, 2px);')
    expect(theme.slice(0, theme.indexOf(':focus-visible {'))).not.toMatch(/@layer[^{]*{[^}]*$/)
  })

  it('leaves no competing focus ring in the ui primitives', () => {
    const offenders: string[] = []
    const walk = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) walk(path)
        else if (
          /focus-visible:(?:ring-|border-ring|outline-\d|outline-ring)/.test(
            readFileSync(path, 'utf8'),
          )
        )
          offenders.push(path)
      }
    }
    walk(repoPath('app/components/ui'))
    expect(offenders).toEqual([])
  })

  it('stops animation and transitions under reduced motion', () => {
    const block = theme.slice(theme.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(block).toContain('animation-duration: 0s !important;')
    expect(block).toContain('transition-duration: 0s !important;')
  })

  it('times transitions with the approved duration and easing', () => {
    expect(relay).toContain('--default-transition-duration: var(--dur-1);')
    expect(relay).toContain('--default-transition-timing-function: var(--ease);')
    expect(relay).toContain('--animate-spin-save: spin 1.2s linear infinite;')
  })

  it('marks the selected row with a 2 px graphite edge, never the focus colour', () => {
    const edge = rule(relay, '@utility edge-selected')
    expect(edge).toContain('box-shadow: inset 2px 0 0 var(--primary);')
    expect(edge).not.toContain('--ring')
  })

  it('maps every turn and the no-turn style onto existing tokens only', () => {
    for (const [turn, role] of [
      ['client', 'caution'],
      ['representative', 'progress'],
      ['done', 'positive'],
      ['signed', 'seal'],
    ] as const) {
      expect(relay).toMatch(
        new RegExp(`\\[data-turn=['"]${turn}['"]\\]\\s*{\\s*--r: var\\(--${role}\\);`),
      )
    }
    const none = relay.slice(relay.search(/\[data-turn=['"]none['"]\] \{/))
    expect(none.slice(0, none.indexOf('}'))).toMatch(
      /--r: var\(--input\);\s*--r-fg: var\(--muted-foreground\);\s*--r-soft: var\(--muted\);\s*--r-ink: var\(--muted-foreground\);\s*--r-edge: var\(--border\);/,
    )
  })
})
