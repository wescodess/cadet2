import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import RunStatusBadge from '~/components/workspace/RunStatusBadge.vue'

const BadgeStub = defineComponent({
  name: 'BadgeStub',
  setup(_, { slots, attrs }) {
    return () => h('span', attrs, slots.default?.())
  },
})

function mountBadge(status: 'completed' | 'degraded' | 'failed') {
  return mount(RunStatusBadge, {
    props: { status },
    global: {
      stubs: {
        Badge: BadgeStub,
      },
    },
  })
}

describe('RunStatusBadge', () => {
  it.each([
    ['completed', 'Completed'],
    ['degraded', 'Degraded'],
    ['failed', 'Failed'],
  ] as const)('renders the %s variant with its text label', (status, label) => {
    const wrapper = mountBadge(status)

    expect(wrapper.get('[data-testid="run-status-badge"]').text()).toContain(label)
  })
})
