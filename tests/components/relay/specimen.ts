import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { elementOf, type Target } from './accessibility'

const root = resolve(import.meta.dirname, '../../..')

function read(path: string) {
  return readFileSync(resolve(root, path), 'utf8')
}

const system = read('docs/design/system/approved.html')
const practice = read('docs/design/b2-practice-preparation/approved.html')
const intake = read('docs/design/b1-access-and-intake/approved.html')
const holderLongNames = read('docs/design/holder-long-names/approved.html')

export interface GlyphCorrection {
  glyph: string
  state: string
  fraction: number
  old: string
  corrected: string
}

export interface GlyphErratumSource {
  file: string
  sha256: string
  occurrences: Record<string, number>
}

export const glyphErratum = JSON.parse(
  read('docs/design/system/errata/2026-11-22-state-glyph-arc-syntax.json'),
) as { corrections: GlyphCorrection[]; sources: GlyphErratumSource[] }

export function erratumSources(): GlyphErratumSource[] {
  return glyphErratum.sources.map(({ file }) => {
    const text = read(file)
    return {
      file,
      sha256: createHash('sha256')
        .update(readFileSync(resolve(root, file)))
        .digest('hex'),
      occurrences: Object.fromEntries(
        glyphErratum.corrections.map(({ glyph, old }) => [glyph, text.split(old).length - 1]),
      ),
    }
  })
}

function correct(child: Element) {
  if (child.tagName !== 'path') return
  const correction = glyphErratum.corrections.find(({ old }) => old === child.getAttribute('d'))
  if (correction) child.setAttribute('d', correction.corrected)
}

function shapes(svg: string, approved = false) {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
  return [...document.documentElement.children].map((child) => {
    if (approved) correct(child)
    const attributes = [...child.attributes].map(({ name, value }) => `${name}=${value}`).sort()
    return `${child.tagName}(${attributes.join(' ')})`
  })
}

function chipGlyph(html: string, state: string) {
  const match = new RegExp(`data-state="${state}">(<svg[\\s\\S]*?</svg>)`).exec(html)
  if (!match?.[1]) throw new Error(`No specimen chip for ${state}`)
  return match[1]
}

function specimenChip(state: string) {
  return chipGlyph(state === 'review-requested' ? practice : system, state)
}

export function specimenChipGlyph(state: string) {
  return shapes(specimenChip(state), true)
}

export function specimenChipPaths(state: string) {
  const document = new DOMParser().parseFromString(specimenChip(state), 'image/svg+xml')
  return [...document.querySelectorAll('path')].map((path) => path.getAttribute('d'))
}

export function specimenNeutralGlyph(label: string) {
  const match = new RegExp(
    `(<svg(?:(?!</svg>)[\\s\\S])*</svg>)<span class="chip-label">${label}<`,
  ).exec(intake)
  if (!match?.[1]) throw new Error(`No neutral chip for ${label}`)
  return shapes(match[1], true)
}

export function renderedGlyph(svg: Target) {
  return shapes(
    elementOf(svg).outerHTML.replaceAll(
      'class="glyph-cut"',
      'stroke="var(--glyph-cut,var(--card))"',
    ),
  )
}

export interface ApprovedHolderWord {
  prefix: string
  word: string
  parts: string[]
}

export function approvedHolderWords(): ApprovedHolderWord[] {
  const document = new DOMParser().parseFromString(holderLongNames, 'text/html')
  const words = new Map<string, ApprovedHolderWord>()
  for (const holder of document.querySelectorAll('.holder-who')) {
    const label = holder.querySelector('.vh')?.textContent ?? ''
    const word = holder.textContent.slice(label.length)
    const parts = [...holder.querySelectorAll('.seg')].map((part) => part.textContent)
    words.set(`${label}${word}`, { prefix: label.trim(), word, parts })
  }
  return [...words.values()]
}
