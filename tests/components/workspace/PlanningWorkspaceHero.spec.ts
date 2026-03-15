import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import PlanningWorkspaceHero from '~/components/workspace/PlanningWorkspaceHero.vue'
import { createWorkspaceSummaryFixture } from '../../support/fixtures/factories/workspace-summary-factory'

const ButtonStub = defineComponent({
  name: 'ButtonStub',
  emits: ['click'],
  setup(_, { emit, slots, attrs }) {
    return () => h('button', {
      type: 'button',
      ...attrs,
      onClick: () => emit('click'),
    }, slots.default?.())
  },
})

const BadgeStub = defineComponent({
  name: 'BadgeStub',
  setup(_, { slots, attrs }) {
    return () => h('span', attrs, slots.default?.())
  },
})

describe('PlanningWorkspaceHero', () => {
  it('renders return context and emits the primary action', async () => {
    const wrapper = mount(PlanningWorkspaceHero, {
      props: {
        firstName: 'Wesley',
        summary: createWorkspaceSummaryFixture(),
        primaryAction: {
          key: 'compare-latest-runs',
          label: 'Compare latest change set',
          description: 'Open the latest preserved run comparison.',
          kind: 'navigate',
        },
      },
      global: {
        stubs: {
          Button: ButtonStub,
          Badge: BadgeStub,
          Skeleton: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Wesley')
    expect(wrapper.text()).toContain('Compare latest change set')
    expect(wrapper.text()).toContain('Comparison ready')

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('action')).toEqual([['compare-latest-runs']])
  })
})
