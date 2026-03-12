import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import TrustEvidencePanel from '~/components/workspace/TrustEvidencePanel.vue'

const CardStub = defineComponent({
  name: 'CardStub',
  setup(_, { slots, attrs }) {
    return () => h('div', attrs, slots.default?.())
  },
})

const AccordionStub = defineComponent({
  name: 'AccordionStub',
  setup(_, { slots }) {
    return () => h('div', {}, slots.default?.())
  },
})

const AccordionItemStub = defineComponent({
  name: 'AccordionItemStub',
  setup(_, { slots }) {
    return () => h('div', {}, slots.default?.())
  },
})

const AccordionTriggerStub = defineComponent({
  name: 'AccordionTriggerStub',
  setup(_, { slots }) {
    return () => h('button', { type: 'button' }, slots.default?.())
  },
})

const AccordionContentStub = defineComponent({
  name: 'AccordionContentStub',
  setup(_, { slots }) {
    return () => h('div', {}, slots.default?.())
  },
})

describe('TrustEvidencePanel', () => {
  it('renders trust metadata changes', () => {
    const wrapper = mount(TrustEvidencePanel, {
      props: {
        trustChanges: [
          {
            pathwayId: 'mvp-skilled-worker',
            pathwayName: 'Skilled Worker pathway',
            beforeCitationCount: 1,
            afterCitationCount: 2,
            citationDelta: 1,
            addedCitationCount: 1,
            removedCitationCount: 0,
            beforeFreshness: 'stale',
            afterFreshness: 'fresh',
            freshnessChange: 'improved',
            beforeConfidence: 'medium',
            afterConfidence: 'high',
            confidenceChange: 'improved',
            beforeTrustBoundary: 'inferred',
            afterTrustBoundary: 'source-backed',
            trustBoundaryChanged: true,
            addedEvidence: [
              {
                citationId: 'citation-added-1',
                claimText: 'Language benchmark evidence has been refreshed.',
                sourceTitle: 'IRCC Language Bulletin',
                sourceUrl: 'https://www.canada.ca/example-language',
                excerpt: 'Fresh benchmark excerpt.',
                retrievalDate: '2026-03-10T00:00:00.000Z',
                freshness: 'fresh',
              },
            ],
            removedEvidence: [],
          },
        ],
      },
      global: {
        stubs: {
          Card: CardStub,
          Accordion: AccordionStub,
          AccordionItem: AccordionItemStub,
          AccordionTrigger: AccordionTriggerStub,
          AccordionContent: AccordionContentStub,
        },
      },
    })

    expect(wrapper.get('[data-testid="trust-evidence-section"]').text()).toContain('Skilled Worker pathway')
    expect(wrapper.text()).toContain('Citations 1 → 2')
    expect(wrapper.text()).toContain('Confidence: medium → high')
    expect(wrapper.text()).toContain('IRCC Language Bulletin')
  })
})
