import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import PathwayRuleAccordion from '~/components/admin/PathwayRuleAccordion.vue'
import type { PathwayRulesEditorItem } from '~/app/lib/admin/pathwayRules'

const ButtonStub = defineComponent({
  name: 'ButtonStub',
  emits: ['click'],
  setup(_, { attrs, emit, slots }) {
    return () => h('button', {
      type: 'button',
      ...attrs,
      onClick: () => emit('click'),
    }, slots.default?.())
  },
})

const InputStub = defineComponent({
  name: 'InputStub',
  props: {
    modelValue: { type: [String, Number], default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () => h('input', {
      ...attrs,
      value: props.modelValue,
      onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
    })
  },
})

const TextareaStub = defineComponent({
  name: 'TextareaStub',
  props: {
    modelValue: { type: [String, Number], default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () => h('textarea', {
      ...attrs,
      value: props.modelValue,
      onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLTextAreaElement).value),
    })
  },
})

const NativeSelectStub = defineComponent({
  name: 'NativeSelectStub',
  props: {
    modelValue: { type: [String, Number], default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit, slots }) {
    return () => h('select', {
      ...attrs,
      value: props.modelValue,
      onChange: (event: Event) => emit('update:modelValue', (event.target as HTMLSelectElement).value),
    }, slots.default?.())
  },
})

const PassthroughStub = defineComponent({
  name: 'PassthroughStub',
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, slots.default?.())
  },
})

function createItem(): PathwayRulesEditorItem {
  return {
    pathwayId: 'mvp-skilled-worker',
    initialDefinition: {
      pathwayId: 'mvp-skilled-worker',
      displayName: 'Skilled Worker pathway',
      description: 'Core skilled worker route.',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    draftDefinition: {
      displayName: 'Skilled Worker pathway',
      description: 'Core skilled worker route.',
      status: 'active',
    },
    initialRules: [],
    draftRules: [{
      id: 'rule-1',
      unmetConditionId: 'minimum-english-clb-8',
      fieldPath: 'englishClb',
      operator: '>=',
      comparisonValue: 8,
    }],
  }
}

function mountAccordion() {
  return mount(PathwayRuleAccordion, {
    props: {
      item: createItem(),
      dirty: true,
    },
    global: {
      stubs: {
        Button: ButtonStub,
        Input: InputStub,
        Textarea: TextareaStub,
        NativeSelect: NativeSelectStub,
        PathwayStatusBadge: PassthroughStub,
        PathwayRuleFormRow: PassthroughStub,
        AccordionItem: PassthroughStub,
        AccordionTrigger: PassthroughStub,
        AccordionContent: PassthroughStub,
      },
    },
  })
}

describe('PathwayRuleAccordion', () => {
  it('shows an unsaved indicator and the current rule count', () => {
    const wrapper = mountAccordion()

    expect(wrapper.text()).toContain('Unsaved')
    expect(wrapper.text()).toContain('1 rule')
  })

  it('emits save and add-rule actions from the footer controls', async () => {
    const wrapper = mountAccordion()

    const buttons = wrapper.findAll('button')
    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')

    expect(wrapper.emitted('add-rule')).toHaveLength(1)
    expect(wrapper.emitted('save')).toHaveLength(1)
  })
})
