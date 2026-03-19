import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import EvidenceSourceDetail from '~/components/admin/EvidenceSourceDetail.vue'
import type { PathwayDefinitionRecord } from '~/app/lib/admin/pathwayDefinitions'
import type { EvidenceSourceDetailRecord, EvidenceSourceDraft } from '~/app/lib/admin/evidenceSources'

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

const CheckboxStub = defineComponent({
  name: 'CheckboxStub',
  props: {
    modelValue: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit }) {
    return () => h('input', {
      ...attrs,
      type: 'checkbox',
      checked: props.modelValue,
      onChange: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).checked),
    })
  },
})

const PassthroughStub = defineComponent({
  name: 'PassthroughStub',
  setup(_, { attrs, slots }) {
    return () => h('div', attrs, slots.default?.())
  },
})

function createDetail(): EvidenceSourceDetailRecord {
  return {
    currentUserIsAdmin: true,
    source: {
      id: 'source-1',
      createdAt: Date.now(),
      type: 'website',
      status: 'approved',
      lifecycleStatus: 'active',
      freshness: 'fresh',
      name: 'IRCC source',
      description: 'Official updates',
      tenantId: 'default',
      tags: ['official'],
      linkedPathwayIds: ['mvp-skilled-worker'],
      trustScore: 91,
      createdByUserId: 'user-1',
      createdByEmail: 'ops@example.com',
      approvedAt: Date.now(),
      rejectedAt: null,
      rejectionReason: null,
      enabled: true,
      schedule: { frequency: 'manual' },
      crawlConfig: {},
      lastRunAt: null,
      lastSuccessAt: Date.now(),
      lastFailureAt: null,
      lastFailureReason: null,
      nextRunAt: null,
    },
    audit: [{
      id: 'audit-1',
      action: 'approve',
      timestamp: Date.now(),
      actorUserId: 'user-1',
      actorEmail: 'ops@example.com',
      reason: null,
      note: 'Approved for use',
      diffSummary: null,
    }],
  }
}

function createDraft(): EvidenceSourceDraft {
  return {
    type: 'website',
    name: 'IRCC source',
    description: 'Official updates',
    trustScore: 91,
    linkedPathwayIds: ['mvp-skilled-worker'],
    tenantId: 'default',
    tagsText: 'official',
    frequency: 'manual',
    intervalHours: 24,
    enabled: true,
    websiteSeedUrls: 'https://www.canada.ca/en.html',
    websiteAllowedDomains: 'canada.ca',
    websiteIncludePatterns: '',
    websiteExcludePatterns: '',
    websiteMaxDepth: 2,
    websiteMaxPagesPerRun: 20,
    websiteRenderMode: 'static',
    websiteRequestHeadersRef: '',
    websiteRespectRobots: true,
    youtubeChannelId: '',
    youtubeChannelUrl: '',
    youtubeMaxVideosPerRun: 24,
    youtubeIncludeShorts: false,
    youtubePreferredLanguage: '',
  }
}

const pathwayOptions: PathwayDefinitionRecord[] = [{
  pathwayId: 'mvp-skilled-worker',
  displayName: 'Skilled Worker pathway',
  description: 'Core skilled worker route.',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}]

describe('EvidenceSourceDetail', () => {
  it('renders the selected source and emits pause from the governed action bar', async () => {
    const wrapper = mount(EvidenceSourceDetail, {
      props: {
        mode: 'view',
        detail: createDetail(),
        draft: createDraft(),
        pathwayOptions,
      },
      global: {
        stubs: {
          Button: ButtonStub,
          Badge: PassthroughStub,
          Checkbox: CheckboxStub,
          Input: InputStub,
          Label: PassthroughStub,
          NativeSelect: NativeSelectStub,
          Progress: PassthroughStub,
          Textarea: TextareaStub,
          ArrowLeftIcon: true,
          PencilIcon: true,
          PlayIcon: true,
          RefreshCwIcon: true,
          SaveIcon: true,
          Trash2Icon: true,
        },
      },
    })

    expect(wrapper.text()).toContain('IRCC source')
    expect(wrapper.text()).toContain('Approved for use')

    const pauseButton = wrapper.find('[data-testid="admin-evidence-source-pause-button"]')
    await pauseButton.trigger('click')

    expect(wrapper.emitted('pause')).toHaveLength(1)
  })

  it('emits draft updates from the create form', async () => {
    const wrapper = mount(EvidenceSourceDetail, {
      props: {
        mode: 'create',
        detail: null,
        draft: createDraft(),
        pathwayOptions,
      },
      global: {
        stubs: {
          Button: ButtonStub,
          Badge: PassthroughStub,
          Checkbox: CheckboxStub,
          Input: InputStub,
          Label: PassthroughStub,
          NativeSelect: NativeSelectStub,
          Progress: PassthroughStub,
          Textarea: TextareaStub,
          ArrowLeftIcon: true,
          PencilIcon: true,
          PlayIcon: true,
          RefreshCwIcon: true,
          SaveIcon: true,
          Trash2Icon: true,
        },
      },
    })

    const nameInput = wrapper.find('input')
    await nameInput.setValue('Updated source name')

    expect(wrapper.emitted('update:draft')).toBeTruthy()
  })
})
