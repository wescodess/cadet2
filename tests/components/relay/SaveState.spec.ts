import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SaveState from '~/components/relay/SaveState.vue'

import { expectAccessible, readableText } from './accessibility'

describe('SaveState', () => {
  it.each([
    ['saving', 'Saving', 'lucide-loader-circle', 'text-muted-foreground'],
    ['saved', 'Saved at 2:41 pm', 'lucide-cloud-check', 'text-positive-ink'],
    [
      'offline',
      'Not saved. You’re offline. We’ll try again when you reconnect.',
      'lucide-cloud-off',
      'text-caution-ink',
    ],
  ] as const)('announces %s with its glyph and words', (state, label, icon, colour) => {
    const wrapper = mount(SaveState, { props: { state, label } })
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('data-state')).toBe(state)
    expect(readableText(wrapper)).toBe(label)
    const glyph = wrapper.get('svg')
    expect(glyph.classes()).toContain(icon)
    expect(glyph.attributes('aria-hidden')).toBe('true')
    expect(glyph.attributes('stroke-width')).toBe('1.75')
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['text-small', 'font-medium', colour]))
    expectAccessible(wrapper)
  })

  it('spins only while saving, and the word still carries the state when motion is reduced', () => {
    expect(
      mount(SaveState, { props: { state: 'saving', label: 'Saving draft' } })
        .get('svg')
        .classes(),
    ).toContain('animate-spin-save')
    expect(
      mount(SaveState, { props: { state: 'saved', label: 'Draft saved 2:41 pm' } })
        .get('svg')
        .classes(),
    ).not.toContain('animate-spin-save')
  })
})
