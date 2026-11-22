import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { appBlocks, importChain, recordBlocks, recordJson, repoPath } from './css-source'

const record = recordJson()
const recordCss = recordBlocks()
const app = appBlocks()

const selectors = {
  theme: '@theme',
  inline: '@theme inline',
  light: ':root',
  dark: '.dark',
  client: '[data-expression="client"]',
  representative: '[data-expression="representative"]',
} as const

function block(blocks: typeof app, selector: string) {
  const found = blocks.get(selector)
  if (!found) throw new Error(`Missing block ${selector}`)
  return found
}

function prefixed(values: Record<string, string>) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [`--${key}`, value]))
}

function pick(blocks: typeof app, selector: string, keys: string[]) {
  const values = block(blocks, selector)
  return Object.fromEntries(keys.map((key) => [key, values.get(key)]))
}

describe('the two token records agree', () => {
  it.each([
    ['light', selectors.light, record.theme.light],
    ['dark', selectors.dark, record.theme.dark],
    ['client', selectors.client, record.expression.client],
    ['representative', selectors.representative, record.expression.representative],
  ])('tokens.css and tokens.json carry the same %s values', (_name, selector, values) => {
    const expected = prefixed(values)
    expect(pick(recordCss, selector, Object.keys(expected))).toEqual(expected)
  })

  it('carries the same fonts, radius and motion', () => {
    const merged = new Map([
      ...block(recordCss, selectors.theme),
      ...block(recordCss, selectors.light),
    ])
    for (const [name, value] of Object.entries(record.font)) {
      expect(merged.get(`--font-${name}`), name).toBe(value)
    }
    expect(merged.get('--radius')).toBe(record.radius)
    expect(merged.get('--dur-1')).toBe(record.motion['dur-1'])
    expect(merged.get('--ease')).toBe(record.motion.ease)
  })
})

describe('the app theme matches the approved record value for value', () => {
  it.each([
    ['light', selectors.light, record.theme.light],
    ['dark', selectors.dark, record.theme.dark],
    ['client expression', selectors.client, record.expression.client],
    ['representative expression', selectors.representative, record.expression.representative],
  ])('declares every %s token exactly as tokens.json', (_name, selector, values) => {
    const expected = prefixed(values)
    expect(pick(app, selector, Object.keys(expected))).toEqual(expected)
  })

  it.each([
    ['@theme', selectors.theme],
    ['@theme inline', selectors.inline],
    [':root', selectors.light],
    ['.dark', selectors.dark],
    ['client expression', selectors.client],
    ['representative expression', selectors.representative],
  ])('declares every %s variable exactly as tokens.css', (_name, selector) => {
    const expected = Object.fromEntries(block(recordCss, selector))
    expect(pick(app, selector, Object.keys(expected))).toEqual(expected)
  })

  it('declares the four turn aliases in both spellings, pointing at their roles', () => {
    const inline = block(app, selectors.inline)
    for (const [turn, role] of Object.entries(record.turn)) {
      for (const suffix of ['', '-foreground', '-soft', '-ink']) {
        expect(inline.get(`--color-turn-${turn}${suffix}`)).toBe(`var(--${role}${suffix})`)
        for (const selector of [selectors.light, selectors.dark]) {
          expect(block(app, selector).get(`--turn-${turn}${suffix}`)).toBe(
            `var(--${role}${suffix})`,
          )
        }
      }
    }
  })

  it('maps all eight state roles with their foreground, soft and ink variants', () => {
    expect(record.roles).toHaveLength(8)
    const inline = block(app, selectors.inline)
    for (const role of record.roles) {
      for (const suffix of ['', '-foreground', '-soft', '-ink']) {
        expect(inline.get(`--color-${role}${suffix}`)).toBe(`var(--${role}${suffix})`)
        expect(block(app, selectors.light).get(`--${role}${suffix}`)).toMatch(/^#[0-9A-F]{6}$/)
        expect(block(app, selectors.dark).get(`--${role}${suffix}`)).toMatch(/^#[0-9A-F]{6}$/)
      }
    }
  })
})

describe('the superseded Comparison Workspace tokens are gone', () => {
  const chain = importChain('app/assets/css/tailwind.css')

  it('no longer imports the planning-artifact token file', () => {
    expect(chain.some((file) => file.includes('_bmad-output'))).toBe(false)
  })

  it.each([
    '--trust',
    '--trust-soft',
    '--warning',
    '--warning-soft',
    '--success',
    '--success-soft',
    '--destructive-soft',
    '--confidence-high',
    '--confidence-medium',
    '--confidence-low',
    '--font-body',
    '--chart-1',
    '--primary-hover',
    '--motion-fast',
  ])('declares no %s', (token) => {
    for (const [selector, values] of app)
      expect(values.has(token), `${selector} ${token}`).toBe(false)
  })

  const confidenceSurfaces = [
    'app/components/recommendations/BlockerAndTradeoffPanel.vue',
    'app/components/recommendations/EvidenceConfidencePanel.vue',
    'app/components/recommendations/NextActionQueue.vue',
    'app/components/recommendations/PathwayComparisonCard.vue',
    'app/components/recommendations/PathwayDetailPanel.vue',
    'app/components/recommendations/RecommendationCitationList.vue',
    'app/components/recommendations/RecommendationSummaryBand.vue',
    'app/components/workspace/RecommendationResultsPanel.vue',
  ]

  it('references no superseded token outside the confidence surfaces held for the UI gate', () => {
    const legacy = /var\(--(?:trust|warning|success|destructive-soft|font-body|chart-\d)\b/
    const offenders: string[] = []
    const walk = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) walk(path)
        else if (/\.(vue|ts|css)$/.test(entry.name) && legacy.test(readFileSync(path, 'utf8')))
          offenders.push(path.slice(repoPath('.').length + 1))
      }
    }
    walk(repoPath('app'))
    expect(offenders.filter((file) => !confidenceSurfaces.includes(file))).toEqual([])
  })

  it('leaves the confidence surfaces unstyled by Relay until the UI gate retires or redesigns them', () => {
    for (const file of confidenceSurfaces) {
      const source = readFileSync(repoPath(file), 'utf8')
      expect(source, file).not.toMatch(
        /\b(?:bg|text|border)-(?:positive|negative|caution|progress|seal|scope|history|urgent|role)\b/,
      )
    }
  })
})

describe('app stylesheets hold no colour of their own', () => {
  it('keeps raw colour literals only in the approved record', () => {
    const raw = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/i
    const appFiles = importChain('app/assets/css/tailwind.css').filter((file) =>
      file.startsWith(repoPath('app')),
    )
    expect(appFiles.length).toBeGreaterThan(0)
    for (const file of appFiles) {
      const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      expect(raw.test(css), file).toBe(false)
    }
  })
})
