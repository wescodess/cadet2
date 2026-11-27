import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, type Component } from 'vue'

import TurnBar from '~/components/relay/TurnBar.vue'
import TurnBarSegment from '~/components/relay/TurnBarSegment.vue'
import type { RelayTurn } from '~/components/relay/turns'

import { expectAccessible, nth, readableText } from './accessibility'

interface Segment {
  turn: RelayTurn
  label: string
  detail: string
  initials?: string
  href?: string
}

function bar(left: Segment, right: Segment) {
  return mount(TurnBar, {
    slots: { default: () => [h(segment, left), h(segment, right)] },
    attachTo: document.body,
  })
}

const segment = TurnBarSegment as Component

const priya: Segment = {
  turn: 'representative',
  label: 'Priya’s turn',
  detail: '2 things in progress',
  initials: 'PR',
  href: '#progress',
}

describe('TurnBar', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('is a navigation landmark named "Whose turn" with two links', () => {
    const wrapper = bar(
      {
        turn: 'client',
        label: 'Your turn',
        detail: '1 thing to do',
        initials: 'OA',
        href: '#tasks',
      },
      priya,
    )
    const nav = wrapper.get('nav')
    expect(nav.attributes('aria-label')).toBe('Whose turn')
    const links = wrapper.findAll('a')
    expect(links.map((link) => readableText(link))).toEqual([
      'Your turn 1 thing to do',
      'Priya’s turn 2 things in progress',
    ])
    expect(links.map((link) => link.attributes('href'))).toEqual(['#tasks', '#progress'])
    expectAccessible(wrapper)
  })

  it.each([
    ['client', 'Your turn', '1 thing to do', 'OA'],
    ['representative', 'Priya’s turn', '2 things in progress', 'PR'],
    ['done', 'Nothing for you', 'Priya has it', undefined],
    ['signed', 'Signed', 'Version 3 is signed', undefined],
    ['none', 'Priya Raman', 'Can’t see your answers yet', 'PR'],
  ] as const)(
    'renders the %s segment with a disc, a label and a count',
    (turn, label, detail, initials) => {
      const wrapper = bar({ turn, label, detail, initials, href: '#a' }, priya)
      const segment = nth(wrapper.findAll('a'), 0)
      expect(segment.attributes('data-turn')).toBe(turn)
      expect(readableText(segment)).toBe(`${label} ${detail}`)
      expect(segment.get('[aria-hidden="true"]').attributes('data-turn')).toBe(turn)
      expect(segment.get('[aria-hidden="true"]').classes()).toContain('disc-32')
      expect(segment.classes()).toEqual(
        expect.arrayContaining(['bg-role-soft', 'edge-bottom', 'min-h-16', 'not-first:border-l']),
      )
      expectAccessible(wrapper)
    },
  )

  it('uses the neutral no-turn colours when nobody there can act', () => {
    const segment = nth(
      bar(
        {
          turn: 'none',
          label: 'Harbourline',
          detail: 'Waiting for your reply',
          initials: 'HI',
          href: '#a',
        },
        priya,
      ).findAll('a'),
      0,
    )
    expect(segment.get('[data-slot="turn-label"]').classes()).toContain('text-foreground')
    expect(segment.get('[data-slot="turn-detail"]').classes()).toContain('text-muted-foreground')
  })

  it('sets the label in the turn ink and the count at the client Small size', () => {
    const segment = nth(bar(priya, priya).findAll('a'), 0)
    expect(segment.get('[data-slot="turn-label"]').classes()).toEqual(
      expect.arrayContaining(['text-label', 'font-semibold', 'text-role-ink']),
    )
    expect(segment.get('[data-slot="turn-detail"]').classes()).toEqual(
      expect.arrayContaining(['text-small', 'text-foreground']),
    )
  })

  it('wraps long translations instead of truncating them', () => {
    const segment = nth(
      bar(
        {
          ...priya,
          label: 'C’est au tour de Priya Raman-Okonkwo',
          detail: '2 éléments en cours de traitement',
        },
        priya,
      ).findAll('a'),
      0,
    )
    expect(segment.classes()).toContain('min-w-0')
    expect(segment.html()).not.toMatch(/truncate|line-clamp|text-ellipsis|whitespace-nowrap/)
  })

  it('lets a router link render the segment', () => {
    const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }
    const wrapper = mount(TurnBar, {
      slots: {
        default: () => [
          h(segment, { ...priya, href: undefined, as: RouterLinkStub, to: '/tasks' }),
        ],
      },
    })
    expect(wrapper.get('a').attributes('href')).toBe('/tasks')
  })
})
