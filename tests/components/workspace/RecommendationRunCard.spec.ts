import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import RecommendationRunCard from '~/components/workspace/RecommendationRunCard.vue'
import type { RecommendationRunSummary } from '~/lib/workspace/recommendation-run-history'

const ButtonStub = defineComponent({
  name: 'ButtonStub',
  props: {
    ariaControls: { type: String, default: undefined },
    ariaExpanded: { type: [Boolean, String], default: undefined },
  },
  emits: ['click'],
  setup(props, { emit, slots }) {
    return () => h('button', {
      type: 'button',
      'aria-controls': props.ariaControls,
      'aria-expanded': props.ariaExpanded,
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

const RunStatusBadgeStub = defineComponent({
  name: 'RunStatusBadgeStub',
  props: {
    status: { type: String, required: true },
  },
  setup(props) {
    return () => h('span', { 'data-testid': 'run-status-badge-stub' }, props.status)
  },
})

function createRun(overrides: Partial<RecommendationRunSummary> = {}): RecommendationRunSummary {
  return {
    id: 'run_42',
    status: 'completed',
    recommendationCount: 3,
    profileSnapshotSummary: 'CLB 9, 3 years experience, Ontario target.',
    createdAt: '2026-03-10T15:30:00.000Z',
    isLatest: false,
    isAvailable: true,
    ...overrides,
  }
}

function mountRunCard(runOverrides: Partial<RecommendationRunSummary> = {}, isLatest = false) {
  return mount(RecommendationRunCard, {
    props: {
      run: createRun(runOverrides),
      isLatest,
    },
    global: {
      stubs: {
        Button: ButtonStub,
        Badge: BadgeStub,
        RunStatusBadge: RunStatusBadgeStub,
      },
    },
  })
}

describe('RecommendationRunCard', () => {
  it('renders the latest available run state and emits view-results', async () => {
    const wrapper = mountRunCard({}, true)

    expect(wrapper.get('[data-testid="run-card-run_42"]').text()).toContain('3 recommendations')
    expect(wrapper.get('[data-testid="run-history-latest-badge"]').text()).toContain('Latest')
    expect(wrapper.find('[data-testid="run-unavailable-reason"]').exists()).toBe(false)

    const buttons = wrapper.findAll('button')
    await buttons[1]!.trigger('click')

    expect(wrapper.emitted('view-results')).toEqual([['run_42']])
  })

  it('renders unavailable runs without a view-results action', () => {
    const wrapper = mountRunCard({
      isAvailable: false,
      unavailableReason: 'Archived result payload expired.',
      recommendationCount: 1,
    })

    expect(wrapper.text()).toContain('1 recommendation')
    expect(wrapper.get('[data-testid="run-unavailable-reason"]').text()).toContain('Archived result payload expired.')
    expect(wrapper.text()).toContain('Unavailable')
    expect(wrapper.text()).not.toContain('View Results')
  })

  it('toggles archived details on mobile expand control', async () => {
    const wrapper = mountRunCard()
    const toggle = wrapper.get('[data-testid="run-card-expand-toggle"]')

    expect(toggle.attributes('aria-expanded')).toBe('false')

    await toggle.trigger('click')

    expect(toggle.attributes('aria-expanded')).toBe('true')
  })
})
