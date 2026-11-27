import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { outputPath, readRecord, render, rows } from '../../../scripts/design/contrast-record.mjs'
import { repoPath } from './css-source'

const record = readRecord()
const computed = rows(record)

function ratio(fg: string, bg: string) {
  const row = computed.find((candidate) => candidate.fg === fg && candidate.bg === bg)
  if (!row) throw new Error(`No pair ${fg} on ${bg}`)
  return [row.light, row.dark]
}

describe('computed contrast', () => {
  it('meets WCAG 2.2 AA for every text and state pair in both themes', () => {
    const failing = computed.filter((row) => !row.passes)
    expect(failing).toEqual([])
  })

  it('covers every state role for text on page, card and tint, and its glyph', () => {
    for (const role of record.roles) {
      for (const bg of ['background', 'card', `${role}-soft`])
        expect(ratio(`${role}-ink`, bg)[0]).toBeGreaterThan(0)
      expect(ratio(`${role}-foreground`, role)[0]).toBeGreaterThan(0)
      expect(ratio(role, `${role}-soft`)[0]).toBeGreaterThan(0)
    }
  })

  it('agrees with the ratios DESIGN.md records', () => {
    expect(ratio('positive-foreground', 'positive')[0]).toBe(5.04)
    expect(ratio('muted-foreground', 'muted')).toEqual([5.84, 6.43])
    expect(ratio('muted-foreground', 'card')).toEqual([6.32, 6.66])
    expect(ratio('foreground', 'muted')).toEqual([16.42, 13.23])
    expect(ratio('input', 'card')).toEqual([3.3, 3.56])
    expect(ratio('input', 'muted')).toEqual([3.05, 3.43])
  })

  it('is recorded in the build check exactly as computed', () => {
    expect(readFileSync(repoPath(outputPath), 'utf8')).toBe(render(record))
  })
})
