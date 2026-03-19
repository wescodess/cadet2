import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import EvidenceSourceList from '~/components/admin/EvidenceSourceList.vue'
import type { EvidenceSourceRecord } from '~/app/lib/admin/evidenceSources'

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

const BadgeStub = defineComponent({
  name: 'BadgeStub',
  setup(_, { attrs, slots }) {
    return () => h('span', attrs, slots.default?.())
  },
})

function createSources(): EvidenceSourceRecord[] {
  return [
    {
      id: 'source-1',
      createdAt: Date.now(),
      type: 'website',
      status: 'approved',
      lifecycleStatus: 'active',
      freshness: 'fresh',
      name: 'IRCC program updates',
      description: 'Official guidance site',
      tenantId: 'default',
      tags: ['official'],
      linkedPathwayIds: ['mvp-skilled-worker'],
      trustScore: 94,
      createdByUserId: 'user-1',
      createdByEmail: 'ops@example.com',
      approvedAt: Date.now(),
      rejectedAt: null,
      rejectionReason: null,
      enabled: true,
      schedule: { frequency: 'daily' },
      crawlConfig: {},
      lastRunAt: null,
      lastSuccessAt: Date.now(),
      lastFailureAt: null,
      lastFailureReason: null,
      nextRunAt: null,
    },
    {
      id: 'source-2',
      createdAt: Date.now(),
      type: 'youtube_channel',
      status: 'paused',
      lifecycleStatus: 'paused',
      freshness: 'stale',
      name: 'Province briefings',
      description: 'Regional updates',
      tenantId: 'default',
      tags: ['province'],
      linkedPathwayIds: ['mvp-provincial-nominee'],
      trustScore: 71,
      createdByUserId: 'user-2',
      createdByEmail: 'ops@example.com',
      approvedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      enabled: false,
      schedule: { frequency: 'manual' },
      crawlConfig: {},
      lastRunAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      lastFailureReason: null,
      nextRunAt: null,
    },
  ]
}

describe('EvidenceSourceList', () => {
  it('renders list items with operational metadata', () => {
    const wrapper = mount(EvidenceSourceList, {
      props: {
        items: createSources(),
      },
      global: {
        stubs: {
          Button: ButtonStub,
          Badge: BadgeStub,
          PlusIcon: true,
        },
      },
    })

    expect(wrapper.text()).toContain('IRCC program updates')
    expect(wrapper.text()).toContain('Trust 94/100')
    expect(wrapper.text()).toContain('Province briefings')
  })

  it('emits create and select events from the main actions', async () => {
    const wrapper = mount(EvidenceSourceList, {
      props: {
        items: createSources(),
      },
      global: {
        stubs: {
          Button: ButtonStub,
          Badge: BadgeStub,
          PlusIcon: true,
        },
      },
    })

    const buttons = wrapper.findAll('button')
    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')

    expect(wrapper.emitted('create')).toHaveLength(1)
    expect(wrapper.emitted('select')).toEqual([['source-1']])
  })
})
