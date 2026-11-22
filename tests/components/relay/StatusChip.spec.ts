import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { mount } from '@vue/test-utils'

import StatusChip from '~/components/relay/StatusChip.vue'
import { relayStates, type RelayStateId } from '~/lib/relay/states'

import { expectAccessible } from './accessibility'
import { renderedGlyph, specimenChipGlyph, specimenNeutralGlyph } from './specimen'

const record = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../../docs/design/system/tokens.json'), 'utf8'),
) as {
  states: { id: string; group: string; word: string; role: string; glyph: string; fill: string }[]
}

const counted: Partial<Record<RelayStateId, number>> = {
  'signed-version': 3,
  'due-90': 40,
  'due-180': 117,
}

function chip(state: RelayStateId, props: Record<string, unknown> = {}) {
  return mount(StatusChip, {
    props: { state, count: counted[state], ...props },
    attachTo: document.body,
  })
}

describe('the Relay state catalogue', () => {
  it('carries the 23 approved states exactly as tokens.json, then Review requested', () => {
    const catalogue = relayStates.map(({ id, group, word, role, glyph, fill }) => ({
      id,
      group,
      word,
      role,
      glyph,
      fill,
    }))
    expect(catalogue.slice(0, 23)).toEqual(
      record.states.map(({ id, group, word, role, glyph, fill }) => ({
        id,
        group,
        word,
        role,
        glyph,
        fill,
      })),
    )
    expect(catalogue.slice(23)).toEqual([
      {
        id: 'review-requested',
        group: 'Work status',
        word: 'Review requested',
        role: 'progress',
        glyph: 'send',
        fill: 'chip',
      },
    ])
  })
})

describe('StatusChip', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it.each(relayStates.map((state) => [state.id, state] as const))(
    'shows %s as its approved glyph and word, never colour alone',
    (id, state) => {
      const wrapper = chip(id)
      const word = state.word.replace('{n}', String(counted[id]))
      expect(wrapper.text()).toBe(word)
      expect(wrapper.attributes('data-role')).toBe(state.role)
      expect(wrapper.attributes('data-state')).toBe(id)
      const glyph = wrapper.get('svg')
      expect(glyph.attributes('aria-hidden')).toBe('true')
      expect(glyph.attributes('stroke-width')).toBe('2')
      expect(glyph.attributes('width')).toBe('16')
      expect(renderedGlyph(glyph)).toEqual(specimenChipGlyph(id))
      expectAccessible(wrapper)
    },
  )

  it('fills only the urgent states', () => {
    const solid = relayStates
      .filter((state) => chip(state.id).classes().includes('bg-urgent'))
      .map((state) => state.id)
    expect(solid).toEqual(['escalate', 'due-90'])
  })

  it('tints the chip for clients and keeps it neutral on the desk', () => {
    const classes = chip('awaiting').classes()
    expect(classes).toEqual(
      expect.arrayContaining([
        'bg-card',
        'border-border',
        'text-role-ink',
        'client:bg-role-soft',
        'client:border-transparent',
      ]),
    )
  })

  it('renders Review requested as the neutral desk chip with a send glyph, without the concept outline', () => {
    const wrapper = chip('review-requested')
    expect(wrapper.text()).toBe('Review requested')
    expect(wrapper.attributes('data-role')).toBe('progress')
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['bg-card', 'border-border']))
    expect(
      wrapper.classes().some((name) => name.includes('outline') || name.includes('dashed')),
    ).toBe(false)
  })

  it('names the number in counted states', () => {
    expect(chip('due-90', { count: 12 }).text()).toBe('Expires in 12 days')
    expect(chip('signed-version', { count: 2 }).text()).toBe('Signed version 2')
  })

  it('wraps a long word instead of truncating it', () => {
    const classes = chip('escalate').classes()
    expect(classes).toContain('whitespace-normal')
    expect(
      classes.some((name) => name.startsWith('truncate') || name.startsWith('line-clamp')),
    ).toBe(false)
  })

  it('has a small size for rows', () => {
    expect(chip('accepted', { size: 'sm' }).attributes('data-size')).toBe('sm')
    expect(chip('accepted').attributes('data-size')).toBe('default')
  })

  it.each([
    ['Not confirmed yet', 'circle-help'],
    ['Draft, pending counsel', 'circle-dashed'],
    ['Captured, not sent', 'inbox'],
  ] as const)('renders the neutral no-turn chip "%s" with its glyph and word', (label, glyph) => {
    const wrapper = mount(StatusChip, { props: { state: 'none', label, glyph } })
    expect(wrapper.text()).toBe(label)
    expect(wrapper.attributes('data-role')).toBe('neutral')
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['bg-muted', 'border-border', 'text-muted-foreground']),
    )
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
    expect(renderedGlyph(wrapper.get('svg'))).toEqual(specimenNeutralGlyph(label))
    expectAccessible(wrapper)
  })
})
