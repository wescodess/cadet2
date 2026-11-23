import { describe, expect, it } from 'vitest'

import { mount } from '@vue/test-utils'

import StateGlyph from '~/components/relay/StateGlyph.vue'
import type { RelayGlyph } from '~/lib/relay/states'

import {
  erratumSources,
  glyphErratum,
  renderedGlyph,
  specimenChipGlyph,
  specimenChipPaths,
} from './specimen'

type Point = [number, number]
type Quadrant = 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left'

const clockwise: Quadrant[] = ['top-right', 'bottom-right', 'bottom-left', 'top-left']
const segmentSizes: Record<string, number> = { M: 2, V: 1, A: 7, Z: 0 }
const token = /[A-Za-z]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g

const fills = [
  { glyph: 'custom:fill-quarter-dashed', state: 'intake', fraction: 0.25, dashed: true },
  { glyph: 'custom:fill-half', state: 'submitted', fraction: 0.5, dashed: false },
  { glyph: 'custom:fill-three-quarters', state: 'reviewing', fraction: 0.75, dashed: false },
] as const

function tokens(d: string) {
  if (d.replace(token, '').replace(/[\s,]/g, '') !== '') throw new Error(`Unreadable path ${d}`)
  return d.match(token) ?? []
}

function segments(d: string) {
  const commands: { command: string; values: number[] }[] = []
  for (const part of tokens(d)) {
    const current = commands.at(-1)
    if (/^[A-Za-z]$/.test(part)) commands.push({ command: part.replace('z', 'Z'), values: [] })
    else if (current) current.values.push(Number(part))
    else throw new Error('Path data must start with a command')
  }
  return commands
}

function parse(d: string) {
  const commands = segments(d)
  for (const { command, values } of commands) {
    const count = segmentSizes[command]
    if (count === undefined) throw new Error(`Unsupported command ${command}`)
    if (values.length !== count)
      throw new Error(
        `${command} needs ${String(count)} numbers per segment, got ${String(values.length)}`,
      )
  }
  return commands
}

function sector(d: string) {
  const commands = parse(d)
  expect(commands.map(({ command }) => command)).toEqual(['M', 'V', 'A', 'Z'])
  const values = commands.flatMap((segment) => segment.values)
  const [
    x1 = NaN,
    my = NaN,
    y1 = NaN,
    rx = NaN,
    ry = NaN,
    rotation,
    large,
    sweep,
    x2 = NaN,
    y2 = NaN,
  ] = values
  expect([large, sweep].every((flag) => flag === 0 || flag === 1)).toBe(true)
  expect(rotation).toBe(0)
  expect(rx).toBe(ry)
  const hx = (x1 - x2) / 2
  const hy = (y1 - y2) / 2
  const scale = Math.max(1, Math.sqrt((hx * hx + hy * hy) / (rx * rx)))
  const r = rx * scale
  const root = Math.sqrt(Math.max(0, (r * r - hx * hx - hy * hy) / (hx * hx + hy * hy)))
  const sign = large === sweep ? -1 : 1
  const cx = sign * root * hy + (x1 + x2) / 2
  const cy = -sign * root * hx + (y1 + y2) / 2
  const start = Math.atan2(y1 - cy, x1 - cx)
  let turn = Math.atan2(y2 - cy, x2 - cx) - start
  if (sweep === 1 && turn <= 0) turn += 2 * Math.PI
  if (sweep === 0 && turn >= 0) turn -= 2 * Math.PI
  const polygon: Point[] = [[x1, my]]
  for (let step = 0; step <= 1440; step += 1) {
    const angle = start + (turn * step) / 1440
    polygon.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
  }
  return { cx, cy, r, scale, start, turn, polygon }
}

function area(polygon: Point[]) {
  const sum = polygon.reduce((total, [x, y], index) => {
    const [px, py] = polygon.at(index - 1) ?? [x, y]
    return total + px * y - x * py
  }, 0)
  return Math.abs(sum) / 2
}

function inside([x, y]: Point, polygon: Point[]) {
  let result = false
  for (const [index, [xi, yi]] of polygon.entries()) {
    const [xj, yj] = polygon.at(index - 1) ?? [xi, yi]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) result = !result
  }
  return result
}

function quadrants(polygon: Point[], cx: number, cy: number, r: number) {
  const centres: Record<Quadrant, number> = {
    'top-right': -Math.PI / 4,
    'bottom-right': Math.PI / 4,
    'bottom-left': (3 * Math.PI) / 4,
    'top-left': (-3 * Math.PI) / 4,
  }
  return clockwise.filter((quadrant) =>
    inside(
      [cx + (r / 2) * Math.cos(centres[quadrant]), cy + (r / 2) * Math.sin(centres[quadrant])],
      polygon,
    ),
  )
}

function glyph(name: RelayGlyph) {
  return mount(StateGlyph, { props: { glyph: name } }).get('svg')
}

function fillOf(name: RelayGlyph) {
  return glyph(name).get('path[fill="currentColor"]').attributes('d') ?? ''
}

describe('the work-status glyph erratum', () => {
  it('still matches the unchanged approved records it applies to', () => {
    expect(erratumSources()).toEqual(glyphErratum.sources)
  })

  it('corrects only the half and three-quarter arcs, each by removing one extra 0', () => {
    expect(glyphErratum.corrections.map(({ glyph, state }) => [glyph, state])).toEqual([
      ['custom:fill-half', 'submitted'],
      ['custom:fill-three-quarters', 'reviewing'],
    ])
    for (const { old, corrected } of glyphErratum.corrections) {
      const before = tokens(old)
      const after = tokens(corrected)
      const removed = before.findIndex(
        (_, index) => before.filter((__, kept) => kept !== index).join(' ') === after.join(' '),
      )
      expect(removed).toBeGreaterThan(before.indexOf('A'))
      expect(before[removed]).toBe('0')
    }
  })

  it.each(glyphErratum.corrections.map((correction) => [correction.state, correction] as const))(
    'rejects the retained %s path in the approved specimen as malformed',
    (state, { old }) => {
      expect(specimenChipPaths(state)).toEqual([old])
      expect(() => parse(old)).toThrow('A needs 7 numbers per segment, got 8')
    },
  )
})

describe('StateGlyph work-status fills', () => {
  it.each(fills.map((fill) => [fill.state, fill] as const))(
    'draws %s as the approved fraction of the radius 5.6 fill disk, clockwise from 12 o’clock',
    (_, { glyph: name, fraction }) => {
      const { cx, cy, r, scale, start, turn, polygon } = sector(fillOf(name))
      expect([cx, cy, r, scale]).toEqual([
        expect.closeTo(12, 9),
        expect.closeTo(12, 9),
        expect.closeTo(5.6, 9),
        expect.closeTo(1, 9),
      ])
      expect(start).toBeCloseTo(-Math.PI / 2, 9)
      expect(turn).toBeCloseTo(2 * Math.PI * fraction, 9)
      expect(area(polygon) / (Math.PI * r * r)).toBeCloseTo(fraction, 4)
      expect(quadrants(polygon, cx, cy, r)).toEqual(clockwise.slice(0, fraction * 4))
    },
  )

  it('fills more quadrants at each step and never moves a filled one', () => {
    const occupied = fills.map(({ glyph: name }) => {
      const { cx, cy, r, polygon } = sector(fillOf(name))
      return quadrants(polygon, cx, cy, r)
    })
    for (const [index, previous] of occupied.slice(0, -1).entries()) {
      const current = occupied[index + 1] ?? []
      expect(current.slice(0, previous.length)).toEqual(previous)
      expect(current.length).toBeGreaterThan(previous.length)
    }
  })

  it.each(fills.map((fill) => [fill.state, fill] as const))(
    'keeps the %s outline at radius 9.2',
    (_, { glyph: name, dashed }) => {
      const outline = glyph(name).get('circle')
      expect(outline.attributes()).toMatchObject({ cx: '12', cy: '12', r: '9.2' })
      expect(outline.attributes('stroke-dasharray')).toBe(dashed ? '3.2 2.6' : undefined)
    },
  )

  it.each(fills.map((fill) => [fill.state, fill] as const))(
    'matches the approved %s glyph with only the recorded erratum applied',
    (state, { glyph: name }) => {
      expect(renderedGlyph(glyph(name))).toEqual(specimenChipGlyph(state))
    },
  )
})
