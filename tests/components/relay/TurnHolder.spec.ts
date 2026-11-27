import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import TurnHolder from '~/components/relay/TurnHolder.vue'
import TurnDisc from '~/components/relay/TurnDisc.vue'
import type { RelayTurn } from '~/components/relay/turns'

import { expectAccessible, readableText } from './accessibility'
import { approvedHolderWords } from './specimen'

function holder(props: { turn: RelayTurn; word: string; initials?: string; unassigned?: boolean }) {
  return mount(TurnHolder, { props })
}

describe('TurnDisc', () => {
  it.each([
    ['client', { initials: 'OA' }, 'OA'],
    ['representative', { initials: 'PR' }, 'PR'],
    ['done', {}, ''],
    ['signed', {}, ''],
    ['none', {}, '·'],
  ] as const)('draws the %s disc, hidden from assistive technology', (turn, extra, text) => {
    const wrapper = mount(TurnDisc, { props: { turn, ...extra } })
    expect(wrapper.attributes('aria-hidden')).toBe('true')
    expect(wrapper.attributes('data-turn')).toBe(turn)
    expect(wrapper.text()).toBe(text)
  })

  it.each([
    ['done', 'lucide-check'],
    ['signed', 'lucide-pen-line'],
  ] as const)('marks %s with its glyph at 1.75 stroke', (turn, icon) => {
    const svg = mount(TurnDisc, { props: { turn } }).get('svg')
    expect(svg.classes()).toContain(icon)
    expect(svg.attributes('stroke-width')).toBe('1.75')
  })

  it('shows an empty person for an unassigned file', () => {
    const svg = mount(TurnDisc, { props: { turn: 'representative', unassigned: true } }).get('svg')
    expect(svg.classes()).toContain('lucide-user-round')
  })

  it('draws the neutral no-turn disc with a dashed outline on the card', () => {
    const classes = mount(TurnDisc, { props: { turn: 'none', initials: 'PR' } }).classes()
    expect(classes).toEqual(
      expect.arrayContaining([
        'bg-card',
        'border-2',
        'border-dashed',
        'border-input',
        'text-muted-foreground',
      ]),
    )
    expect(classes).not.toContain('bg-role')
  })

  it.each([16, 20, 24, 32, 36] as const)('comes in the %i px size', (size) => {
    expect(
      mount(TurnDisc, { props: { turn: 'client', initials: 'OA', size } }).classes(),
    ).toContain(`disc-${String(size)}`)
  })
})

describe('TurnHolder', () => {
  it.each([
    ['client', 'You', 'Whose turn: You'],
    ['client', 'You, later', 'Whose turn: You, later'],
    ['client', 'Client', 'Whose turn: Client'],
    ['representative', 'Priya', 'Whose turn: Priya'],
    ['representative', 'You', 'Whose turn: You'],
    ['representative', 'Unassigned', 'Whose turn: Unassigned'],
    ['representative', 'Daniel', 'Whose turn: Daniel'],
    ['done', 'Done', 'Status: Done'],
    ['done', 'Checked', 'Status: Checked'],
    ['signed', 'Signed', 'Status: Signed'],
    ['none', 'Not yet', 'Status: Not yet'],
  ] as const)('reads the %s holder "%s" as a sentence', (turn, word, sentence) => {
    const wrapper = holder({
      turn,
      word,
      initials: turn === 'client' || turn === 'representative' ? 'AB' : undefined,
    })
    expect(readableText(wrapper)).toBe(sentence)
    expect(wrapper.get('.sr-only').text()).toBe(sentence.slice(0, sentence.indexOf(':') + 1))
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
    expect(wrapper.attributes('data-turn')).toBe(turn)
    expectAccessible(wrapper)
  })

  it('colours a colleague like the practice, in the representative turn colour', () => {
    const wrapper = holder({ turn: 'representative', word: 'Daniel', initials: 'DO' })
    expect(wrapper.attributes('data-turn')).toBe('representative')
    expect(wrapper.get('[data-slot="holder-word"]').classes()).toContain('text-role-ink')
  })

  it('puts the word in muted text when nobody holds the turn', () => {
    const word = holder({ turn: 'none', word: 'Not yet' }).get('[data-slot="holder-word"]')
    expect(word.classes()).toContain('text-muted-foreground')
    expect(word.classes()).not.toContain('text-role-ink')
  })

  it('sets the word at 12 px on the desk and the 15 px Label size for clients', () => {
    const classes = holder({ turn: 'client', word: 'You', initials: 'OA' })
      .get('[data-slot="holder-word"]')
      .classes()
    expect(classes).toEqual(
      expect.arrayContaining([
        'text-xs',
        'leading-compact',
        'client:text-label',
        'client:leading-label',
        'font-semibold',
      ]),
    )
  })

  it('accepts an unassigned file with an empty person disc', () => {
    const wrapper = holder({ turn: 'representative', word: 'Unassigned', unassigned: true })
    expect(wrapper.get('svg').classes()).toContain('lucide-user-round')
  })
})

describe('TurnHolder long words', () => {
  const stress = (length: number) => 'Longsyntheticfirstname'.repeat(12).slice(0, length)

  function parts(word: string, turn: RelayTurn = 'representative') {
    return holder({ turn, word, initials: 'AB' })
      .findAll('[data-slot="holder-part"]')
      .map((part) => part.text())
  }

  it.each([
    ['Sivasubramanian', ['Sivasubramanian']],
    ['Jean-Baptiste', ['Jean-Baptiste']],
    ['Anna Marie-Ève', ['Anna', 'Marie-Ève']],
    ['Maria Guadalupe', ['Maria', 'Guadalupe']],
    ['You, later', ['You,', 'later']],
  ] as const)('breaks "%s" at its spaces first', (word, expected) => {
    expect(parts(word)).toEqual(expected)
  })

  it.each([
    ['Anna Marie-Ève', 'Whose turn: Anna Marie-Ève'],
    ['Maria Guadalupe', 'Whose turn: Maria Guadalupe'],
  ] as const)('still reads "%s" as one whole name after the prefix', (word, sentence) => {
    const wrapper = holder({ turn: 'representative', word, initials: 'AM' })
    expect(readableText(wrapper)).toBe(sentence)
    expect(wrapper.get('[data-slot="holder-word"]').text()).toBe(sentence)
    expectAccessible(wrapper)
  })

  it.each([64, 128, 255])(
    'keeps every character of a %i character word, with nothing inserted or cut',
    (length) => {
      const word = stress(length)
      expect(word).toHaveLength(length)
      const wrapper = holder({ turn: 'representative', word, initials: 'LS' })
      expect(readableText(wrapper)).toBe(`Whose turn: ${word}`)
      expect(parts(word)).toEqual([word])
    },
  )

  it.each(
    approvedHolderWords().map(
      (approved) =>
        [
          approved.word.length > 32
            ? `${String(approved.word.length)} character stress word`
            : approved.word,
          approved,
        ] as const,
    ),
  )('matches the approved split of "%s"', (_label, approved) => {
    const { word } = approved
    const turn = approved.prefix === 'Whose turn:' ? 'representative' : 'done'
    const wrapper = holder({ turn, word, initials: turn === 'done' ? undefined : 'AB' })
    expect(parts(word, turn)).toEqual(approved.parts)
    expect(readableText(wrapper)).toBe(`${approved.prefix} ${word}`)
  })

  it('lets a desk word part break inside itself only within the column, and leaves the client word growing', () => {
    const wrapper = holder({ turn: 'representative', word: 'Anna Marie-Ève', initials: 'AM' })
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        'grid-cols-1',
        'max-w-18',
        'client:grid-cols-none',
        'client:max-w-none',
      ]),
    )
    for (const part of wrapper.findAll('[data-slot="holder-part"]'))
      expect(part.classes()).toEqual(
        expect.arrayContaining(['inline-block', 'max-w-full', 'wrap-anywhere', 'client:inline']),
      )
  })
})
