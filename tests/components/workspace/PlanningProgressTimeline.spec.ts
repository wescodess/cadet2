import { mount } from '@vue/test-utils'

import PlanningProgressTimeline from '~/components/workspace/PlanningProgressTimeline.vue'
import { createWorkspaceSummaryFixture } from '../../support/fixtures/factories/workspace-summary-factory'

describe('PlanningProgressTimeline', () => {
  it('renders the continuity milestones and marks completed steps', () => {
    const wrapper = mount(PlanningProgressTimeline, {
      props: {
        summary: createWorkspaceSummaryFixture(),
      },
      global: {
        stubs: {
          Badge: true,
          Skeleton: true,
        },
      },
    })

    expect(wrapper.get('[data-testid="planning-progress-timeline"]').text()).toContain('Intake saved')
    expect(wrapper.get('[data-testid="planning-progress-timeline"]').text()).toContain('Latest run generated')
    expect(wrapper.get('[data-testid="planning-progress-timeline"]').text()).toContain('Latest comparison available')
    expect(wrapper.get('[data-testid="planning-progress-timeline"]').text()).toContain('Next-step plan available')
  })
})
