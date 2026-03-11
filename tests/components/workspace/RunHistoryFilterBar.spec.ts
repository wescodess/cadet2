import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import RunHistoryFilterBar from '~/components/workspace/RunHistoryFilterBar.vue'

const ButtonStub = defineComponent({
  name: 'ButtonStub',
  props: {
    variant: { type: String, default: undefined },
  },
  emits: ['click'],
  setup(props, { emit, slots }) {
    return () => h('button', {
      type: 'button',
      'data-variant': props.variant,
      onClick: () => emit('click'),
    }, slots.default?.())
  },
})

describe('RunHistoryFilterBar', () => {
  it('renders all status filters and marks the active filter', () => {
    const wrapper = mount(RunHistoryFilterBar, {
      props: {
        activeFilter: 'degraded',
      },
      global: {
        stubs: {
          Button: ButtonStub,
        },
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(4)
    expect(buttons.map(button => button.text())).toEqual(['All', 'Completed', 'Degraded', 'Failed'])
    expect(buttons[2]!.attributes('data-variant')).toBe('default')
    expect(buttons[2]!.attributes('aria-pressed')).toBe('true')
    expect(buttons[0]!.attributes('aria-pressed')).toBe('false')
  })

  it('emits filter-change with the selected status', async () => {
    const wrapper = mount(RunHistoryFilterBar, {
      global: {
        stubs: {
          Button: ButtonStub,
        },
      },
    })

    const buttons = wrapper.findAll('button')

    await buttons[1]!.trigger('click')
    await buttons[3]!.trigger('click')

    expect(wrapper.emitted('filter-change')).toEqual([
      ['completed'],
      ['failed'],
    ])
  })
})
