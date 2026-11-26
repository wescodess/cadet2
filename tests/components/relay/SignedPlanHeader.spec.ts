import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import SignedPlanHeader from '~/components/relay/SignedPlanHeader.vue'

import { expectAccessible, readableText } from './accessibility'

const props = {
  name: 'Priya Raman',
  designation: 'RCIC',
  licence: 'R123456',
  signed: { text: '3 Nov 2026', datetime: '2026-11-03' },
  version: 2,
  verified: { text: '1 Nov 2026', datetime: '2026-11-01' },
}

describe('SignedPlanHeader', () => {
  it('states who signed which version, with their licence and the verification date', () => {
    const wrapper = mount(SignedPlanHeader, { props })
    expect(wrapper.html()).toMatch(/^<section\b/)
    expect(wrapper.attributes('aria-label')).toBe('Signature')
    expect(readableText(wrapper)).toBe(
      'Reviewed and signed by Priya Raman, RCIC, licence R123456, on 3 Nov 2026. Version 2. Check this licence on the CICC register Sources verified as of 1 Nov 2026.',
    )
    expect(wrapper.get('strong').text()).toBe('Priya Raman')
    expect(wrapper.get('[data-slot="licence"]').classes()).toContain('text-id')
    expect(wrapper.get('time').attributes('datetime')).toBe('2026-11-03')
    expectAccessible(wrapper)
  })

  it('links to the CICC public register in seal ink, underlined and tall enough to press', () => {
    const link = mount(SignedPlanHeader, { props }).get('a')
    expect(link.attributes('href')).toBe('https://register.college-ic.ca/')
    expect(link.classes()).toEqual(
      expect.arrayContaining([
        'text-seal-ink',
        'font-semibold',
        'underline',
        'min-h-6',
        'client:min-h-8',
      ]),
    )
  })

  it('carries the seal edge and badge-check mark', () => {
    const wrapper = mount(SignedPlanHeader, { props })
    expect(wrapper.attributes('data-role')).toBe('seal')
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['edge-start', 'bg-card', 'border-border', 'rounded-xl']),
    )
    const mark = wrapper.get('svg')
    expect(mark.classes()).toContain('lucide-badge-check')
    expect(mark.attributes('aria-hidden')).toBe('true')
    expect(mark.attributes('width')).toBe('24')
    expect(mark.attributes('stroke-width')).toBe('2')
  })

  it('never calls a signed plan "not legal advice"', () => {
    expect(mount(SignedPlanHeader, { props }).text().toLowerCase()).not.toContain('legal advice')
  })
})
