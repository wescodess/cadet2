import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import CaveatChangesPanel from '~/components/workspace/CaveatChangesPanel.vue'

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

describe('CaveatChangesPanel', () => {
  it('renders added and removed caveats', () => {
    const wrapper = mount(CaveatChangesPanel, {
      props: {
        addedCaveats: [
          {
            id: 'added-1',
            pathwayId: 'mvp-skilled-worker',
            pathwayName: 'Skilled Worker pathway',
            text: 'New proof-of-funds caveat.',
          },
        ],
        removedCaveats: [
          {
            id: 'removed-1',
            pathwayId: 'mvp-provincial-nominee',
            pathwayName: 'Provincial Nominee pathway',
            text: 'Employer letter gap resolved.',
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

    expect(wrapper.get('[data-testid="caveat-changes-panel"]').text()).toContain('New proof-of-funds caveat.')
    expect(wrapper.text()).toContain('Employer letter gap resolved.')
  })
})
