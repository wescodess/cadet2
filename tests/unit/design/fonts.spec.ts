import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { importChain, repoPath } from './css-source'

interface Face {
  family: string
  style: string
  weight: string
  src: string
  ranges: [number, number][]
}

function faces(): Face[] {
  const css = importChain('app/assets/css/tailwind.css')
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n')
  return [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(([, body = '']) => {
    const read = (name: string) =>
      new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(body)?.[1]?.trim() ?? ''
    return {
      family: read('font-family').replace(/["']/g, ''),
      style: read('font-style'),
      weight: read('font-weight'),
      src: read('src'),
      ranges: read('unicode-range')
        .split(',')
        .map((range) => {
          const [start = '', end] = range.trim().replace(/^U\+/i, '').split('-')
          return [parseInt(start, 16), parseInt(end ?? start, 16)] as [number, number]
        }),
    }
  })
}

const declared = faces()
const specimenNames = [
  'Oluwaseun Adébáyọ̀-Fitzgerald',
  'Nguyễn Thị Minh Khai',
  'Siobhán Ní Bhriain',
  'Priya’s turn',
]

describe('IBM Plex is self-hosted', () => {
  it.each([
    ['IBM Plex Sans', 'normal', '400'],
    ['IBM Plex Sans', 'normal', '500'],
    ['IBM Plex Sans', 'normal', '600'],
    ['IBM Plex Sans', 'normal', '700'],
    ['IBM Plex Sans', 'italic', '400'],
    ['IBM Plex Mono', 'normal', '400'],
    ['IBM Plex Mono', 'normal', '500'],
  ])('serves %s %s %s from the app, covering every specimen name', (family, style, weight) => {
    const set = declared.filter(
      (face) => face.family === family && face.style === style && face.weight === weight,
    )
    expect(set.length).toBeGreaterThan(0)
    for (const face of set) {
      const url = /url\(["']([^"']+)["']\)\s*format\(["']woff2["']\)/.exec(face.src)?.[1] ?? ''
      expect(url).toMatch(/^\/fonts\/ibm-plex\/[\w-]+\.woff2$/)
      expect(existsSync(repoPath(join('public', url))), url).toBe(true)
    }
    for (const char of specimenNames.join('')) {
      const point = char.codePointAt(0) ?? 0
      const covered = set.some((face) =>
        face.ranges.some(([start, end]) => point >= start && point <= end),
      )
      expect(covered, `U+${point.toString(16).toUpperCase()} ${char}`).toBe(true)
    }
  })

  it('swaps in the font without blocking text', () => {
    const css = readFileSync(repoPath('app/assets/css/fonts.css'), 'utf8')
    expect(css.match(/@font-face/g)?.length).toBe(css.match(/font-display:\s*swap;/g)?.length)
  })

  it('ships the SIL Open Font License beside the files', () => {
    expect(readFileSync(repoPath('public/fonts/ibm-plex/OFL.txt'), 'utf8')).toContain(
      'SIL Open Font License, Version 1.1',
    )
  })

  it('never requests Google Fonts from the app', () => {
    const offenders: string[] = []
    const walk = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) walk(path)
        else if (
          /\.(vue|ts|css|html)$/.test(entry.name) &&
          /fonts\.(googleapis|gstatic)\.com/.test(readFileSync(path, 'utf8'))
        )
          offenders.push(path)
      }
    }
    walk(repoPath('app'))
    expect(offenders).toEqual([])
    expect(readFileSync(repoPath('nuxt.config.ts'), 'utf8')).not.toMatch(/googleapis|gstatic/)
  })
})
