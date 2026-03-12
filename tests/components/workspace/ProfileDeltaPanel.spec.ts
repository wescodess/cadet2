import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import ProfileDeltaPanel from '~/components/workspace/ProfileDeltaPanel.vue'

const CardStub = defineComponent({
  name: 'CardStub',
  setup(_, { slots, attrs }) {
    return () => h('div', attrs, slots.default?.())
  },
})

describe('ProfileDeltaPanel', () => {
  it('renders preserved profile changes', () => {
    const wrapper = mount(ProfileDeltaPanel, {
      props: {
        profileDelta: {
          changedFieldCount: 2,
          changedFields: [
            {
              key: 'work.hasValidJobOffer',
              section: 'work',
              label: 'Valid job offer',
              beforeValue: 'No',
              afterValue: 'Yes',
            },
            {
              key: 'immigration.englishClb',
              section: 'immigration',
              label: 'English CLB',
              beforeValue: '8',
              afterValue: '9',
            },
          ],
          summary: '2 preserved profile inputs changed between the compared runs.',
        },
      },
      global: {
        stubs: {
          Card: CardStub,
        },
      },
    })

    expect(wrapper.get('[data-testid="profile-delta-section"]').text()).toContain('Valid job offer')
    expect(wrapper.text()).toContain('Before: No')
    expect(wrapper.text()).toContain('After: Yes')
  })
})
