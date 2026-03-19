import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import PathwayDefinitionTable from '~/components/admin/PathwayDefinitionTable.vue'
import { createSeededPathwayDefinitions } from '../../support/fixtures/factories/pathway-inventory-factory'

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
    modelValue: { type: String, default: '' },
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

const NativeSelectStub = defineComponent({
  name: 'NativeSelectStub',
  props: {
    modelValue: { type: String, default: '' },
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

const BadgeStub = defineComponent({
  name: 'BadgeStub',
  setup(_, { attrs, slots }) {
    return () => h('span', attrs, slots.default?.())
  },
})

const DialogStub = defineComponent({
  name: 'DialogStub',
  setup(_, { slots }) {
    return () => h('div', {}, slots.default?.())
  },
})

const PassthroughStub = defineComponent({
  name: 'PassthroughStub',
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, slots.default?.())
  },
})

const DropdownMenuItemStub = defineComponent({
  name: 'DropdownMenuItemStub',
  emits: ['click'],
  setup(_, { attrs, emit, slots }) {
    return () => h('button', {
      type: 'button',
      ...attrs,
      onClick: () => emit('click'),
    }, slots.default?.())
  },
})

function mountTable() {
  return mount(PathwayDefinitionTable, {
    props: {
      items: createSeededPathwayDefinitions([
        {},
        {},
        {
          pathwayId: 'mvp-admin-draft-pathway',
          displayName: 'Atlantic employer pathway',
          status: 'draft',
        },
      ]),
    },
    global: {
      stubs: {
        Button: ButtonStub,
        Input: InputStub,
        NativeSelect: NativeSelectStub,
        Badge: BadgeStub,
        Dialog: DialogStub,
        DialogContent: PassthroughStub,
        DialogHeader: PassthroughStub,
        DialogTitle: PassthroughStub,
        DialogDescription: PassthroughStub,
        DialogFooter: PassthroughStub,
        AlertDialog: DialogStub,
        AlertDialogContent: PassthroughStub,
        AlertDialogHeader: PassthroughStub,
        AlertDialogTitle: PassthroughStub,
        AlertDialogDescription: PassthroughStub,
        AlertDialogFooter: PassthroughStub,
        AlertDialogAction: ButtonStub,
        AlertDialogCancel: ButtonStub,
        DropdownMenu: PassthroughStub,
        DropdownMenuTrigger: PassthroughStub,
        DropdownMenuContent: PassthroughStub,
        DropdownMenuItem: DropdownMenuItemStub,
        SearchIcon: true,
        PlusIcon: true,
        ArrowUpDownIcon: true,
        MoreHorizontalIcon: true,
      },
    },
  })
}

describe('PathwayDefinitionTable', () => {
  it('preserves the incoming inventory order until a sort is selected', () => {
    const wrapper = mountTable()

    const rows = wrapper.findAll('tr[data-testid^="admin-pathway-row-"]')
    const pathwayIds = rows.map(row => row.attributes('data-testid')?.replace('admin-pathway-row-', ''))

    expect(pathwayIds).toEqual([
      'mvp-skilled-worker',
      'mvp-provincial-nominee',
      'mvp-admin-draft-pathway',
    ])
  })

  it('filters the rendered inventory by pathway search input', async () => {
    const wrapper = mountTable()

    expect(wrapper.findAll('[data-testid="admin-pathway-row"]')).toHaveLength(3)

    await wrapper.get('[data-testid="admin-pathway-search"]').setValue('atlantic')

    expect(wrapper.findAll('[data-testid="admin-pathway-row"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="admin-pathway-row-mvp-admin-draft-pathway"]').text()).toContain('Atlantic employer pathway')
  })

  it('emits create with minimum pathway fields from the add dialog', async () => {
    const wrapper = mountTable()

    await wrapper.get('[data-testid="admin-pathway-add-button"]').trigger('click')

    const inputs = wrapper.findAll('input')
    await inputs[1]!.setValue('mvp-atlantic-employer')
    await inputs[2]!.setValue('Atlantic employer pathway')
    await wrapper.get('textarea').setValue('Employer-led pilot pathway.')
    const selects = wrapper.findAll('select')
    await selects[1]!.setValue('draft')

    const submitButtons = wrapper.findAll('button').filter(button => button.text().includes('Create pathway'))
    await submitButtons[0]!.trigger('click')

    expect(wrapper.emitted('create')).toEqual([
      [{
        pathwayId: 'mvp-atlantic-employer',
        displayName: 'Atlantic employer pathway',
        description: 'Employer-led pilot pathway.',
        status: 'draft',
      }],
    ])
  })

  it('emits immediate status updates for non-active rows', async () => {
    const wrapper = mountTable()

    const enableButton = wrapper.findAll('button').find(button => button.text() === 'Enable pathway')
    expect(enableButton).toBeTruthy()

    await enableButton!.trigger('click')

    expect(wrapper.emitted('update-status')).toEqual([
      [{
        pathwayId: 'mvp-admin-draft-pathway',
        status: 'active',
      }],
    ])
  })
})
