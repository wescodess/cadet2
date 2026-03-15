import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import PlanningWorkspaceActionPanel from '~/components/workspace/PlanningWorkspaceActionPanel.vue'
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

describe('PlanningWorkspaceActionPanel', () => {
  it('renders continuity-safe quick actions and emits the selected action key', async () => {
    const wrapper = mount(PlanningWorkspaceActionPanel, {
      props: {
        summary: createWorkspaceSummaryFixture(),
        actions: [
          {
            key: 'review-latest-run',
            label: 'Review current recommendations',
            description: 'Open the current recommendation review surface.',
            kind: 'navigate',
          },
          {
            key: 'open-history',
            label: 'Open archive',
            description: 'Review preserved recommendation history.',
            kind: 'navigate',
          },
          {
            key: 'start-new-cycle',
            label: 'Start new cycle',
            description: 'Edit your profile inputs before running a new cycle.',
            kind: 'navigate',
          },
        ],
      },
      global: {
        stubs: {
          Button: ButtonStub,
          Skeleton: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Review current recommendations')
    expect(wrapper.text()).toContain('Open archive')
    expect(wrapper.get('[data-testid="planning-cycle-start"]').text()).toContain('Start new cycle')

    const reviewButton = wrapper.findAll('button').find(button => button.text().includes('Review current recommendations'))
    await reviewButton!.trigger('click')

    expect(wrapper.emitted('action')).toEqual([['review-latest-run']])
  })
})
