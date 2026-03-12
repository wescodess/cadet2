import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import PathwayChangeCard from '~/components/workspace/PathwayChangeCard.vue'

const CardStub = defineComponent({
  name: 'CardStub',
  setup(_, { slots, attrs }) {
    return () => h('div', attrs, slots.default?.())
  },
})

const BadgeStub = defineComponent({
  name: 'BadgeStub',
  setup(_, { slots, attrs }) {
    return () => h('span', attrs, slots.default?.())
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

function mountCard(changeType: 'added' | 'removed' | 'tier-changed' | 'score-changed') {
  return mount(PathwayChangeCard, {
    props: {
      change: {
        pathwayId: 'mvp-skilled-worker',
        pathwayName: 'Skilled Worker pathway',
        changeType,
        impact: changeType === 'removed' ? 'declined' : 'improved',
        beforeType: 'direct',
        afterType: 'direct',
        beforeRank: 2,
        afterRank: 1,
        rankDelta: -1,
        beforeTier: 'conditional-fit',
        afterTier: 'strong-fit',
        beforeScore: 74,
        afterScore: 89,
        scoreDelta: 15,
        reason: 'Outcome shifted after profile updates.',
        trustDiff: {
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
              claimText: 'Updated language benchmark evidence is now source-backed.',
              sourceTitle: 'IRCC Express Entry Update',
              sourceUrl: 'https://www.canada.ca/example-added',
              excerpt: 'Updated benchmark details.',
              retrievalDate: '2026-03-10T00:00:00.000Z',
              freshness: 'fresh',
            },
          ],
          removedEvidence: [],
        },
      },
    },
    global: {
      stubs: {
        Card: CardStub,
        Badge: BadgeStub,
        Accordion: AccordionStub,
        AccordionItem: AccordionItemStub,
        AccordionTrigger: AccordionTriggerStub,
        AccordionContent: AccordionContentStub,
      },
    },
  })
}

describe('PathwayChangeCard', () => {
  it.each([
    ['added', 'New'],
    ['removed', 'Removed'],
    ['tier-changed', 'Improved'],
    ['score-changed', 'Improved'],
  ] as const)('renders %s change states', (changeType, expectedLabel) => {
    const wrapper = mountCard(changeType)

    expect(wrapper.get('[data-testid="pathway-change-card-mvp-skilled-worker"]').text()).toContain(expectedLabel)
    expect(wrapper.text()).toContain('Trust metadata diff')
    expect(wrapper.text()).toContain('Confidence: medium → high')
    expect(wrapper.text()).toContain('IRCC Express Entry Update')
  })
})
