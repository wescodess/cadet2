import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ProvenanceRow from '~/components/relay/ProvenanceRow.vue'

import { expectAccessible, readableText } from './accessibility'

const source = {
  title: 'Canadian Experience Class: who can apply',
  href: 'https://www.canada.ca/cec',
  domain: 'canada.ca',
}
const verified = { text: '1 Nov 2026', datetime: '2026-11-01' }

describe('ProvenanceRow', () => {
  it('describes the source, effective date and verification date as a list of terms', () => {
    const wrapper = mount(ProvenanceRow, {
      props: { source, effective: { text: '14 Mar 2026', datetime: '2026-03-14' }, verified },
    })
    expect(wrapper.html()).toMatch(/^<dl\b/)
    expect(wrapper.findAll('dt').map((term) => term.text())).toEqual([
      'Source',
      'Effective',
      'Verified as of',
    ])
    expect(wrapper.findAll('dd').map((value) => readableText(value))).toEqual([
      'Canadian Experience Class: who can apply, canada.ca',
      '14 Mar 2026',
      '1 Nov 2026',
    ])
    expect(wrapper.get('a').attributes('href')).toBe(source.href)
    expect(wrapper.findAll('time').map((time) => time.attributes('datetime'))).toEqual([
      '2026-03-14',
      '2026-11-01',
    ])
    expectAccessible(wrapper)
  })

  it('keeps an unknown effective date unknown', () => {
    const wrapper = mount(ProvenanceRow, { props: { source, verified } })
    expect(wrapper.findAll('dd')[1]?.text()).toBe('Not stated by source')
    expect(wrapper.findAll('time')).toHaveLength(1)
  })

  it('uses small text with muted labels and full-strength values', () => {
    const wrapper = mount(ProvenanceRow, { props: { source, verified } })
    expect(wrapper.classes()).toContain('text-small')
    expect(wrapper.get('dt').classes()).toEqual(
      expect.arrayContaining(['font-medium', 'text-muted-foreground']),
    )
    expect(wrapper.get('dd').classes()).toContain('text-foreground')
  })
})
