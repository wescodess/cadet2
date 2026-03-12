import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import ComparisonStatCard from '~/components/workspace/ComparisonStatCard.vue'

const CardStub = defineComponent({
  name: 'CardStub',
  setup(_, { slots, attrs }) {
    return () => h('div', attrs, slots.default?.())
  },
})

describe('ComparisonStatCard', () => {
  it.each([
    ['up', 'comparison-stat-pathways-changed'],
    ['down', 'comparison-stat-overall-confidence'],
    ['neutral', 'comparison-stat-new-evidence'],
  ] as const)('renders the %s trend direction', (trend, testId) => {
    const wrapper = mount(ComparisonStatCard, {
      props: {
        label: testId.replace('comparison-stat-', '').replace(/-/g, ' '),
        value: 3,
        trend,
        trendLabel: `Trend ${trend}`,
      },
      global: {
        stubs: {
          Card: CardStub,
        },
      },
    })

    expect(wrapper.get(`[data-testid="${testId}"]`).text()).toContain(`Trend ${trend}`)
  })
})
