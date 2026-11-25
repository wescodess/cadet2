<script setup lang="ts">
import { computed } from 'vue'
import { PlusIcon } from 'lucide-vue-next'
import { interfaceIconStroke } from '@/lib/relay/icons'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { EvidenceSourceRecord } from '@/lib/admin/evidenceSources'
import { evidenceSourceTestIds, formatEvidenceStatus } from '@/lib/admin/evidenceSources'

const props = withDefaults(
  defineProps<{
    items: EvidenceSourceRecord[]
    selectedSourceId?: string | null
    loading?: boolean
  }>(),
  {
    selectedSourceId: null,
    loading: false,
  },
)

const emit = defineEmits<{
  (event: 'select', payload: string): void
  (event: 'create'): void
}>()

function badgeClass(
  status: EvidenceSourceRecord['lifecycleStatus'] | EvidenceSourceRecord['freshness'],
) {
  if (status === 'active' || status === 'fresh') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-700'
  }

  if (status === 'paused') {
    return 'border-amber-300 bg-amber-50 text-amber-700'
  }

  if (status === 'stale' || status === 'rejected') {
    return 'border-rose-300 bg-rose-50 text-rose-700'
  }

  return 'border-slate-300 bg-slate-100 text-slate-700'
}

const emptyMessage = computed(() => {
  if (props.loading) {
    return 'Loading sources…'
  }

  return 'No curated sources match the current filter.'
})
</script>

<template>
  <section
    :data-testid="evidenceSourceTestIds.list"
    class="space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm"
  >
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Curated sources
        </p>
        <h2 class="mt-1 text-xl font-semibold text-slate-950">Trusted evidence inventory</h2>
      </div>
      <Button :data-testid="evidenceSourceTestIds.addButton" type="button" @click="emit('create')">
        <PlusIcon :stroke-width="interfaceIconStroke" class="size-4" />
        Add source
      </Button>
    </div>

    <div class="space-y-3">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="w-full rounded-2xl border p-4 text-left transition"
        :class="
          item.id === selectedSourceId
            ? 'border-teal-300 bg-teal-50/80 shadow-sm'
            : 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white'
        "
        @click="emit('select', item.id)"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="space-y-1">
            <p class="text-base font-semibold text-slate-950">
              {{ item.name }}
            </p>
            <p class="text-sm text-slate-500">
              {{ item.type === 'website' ? 'Website' : 'YouTube channel' }} · {{ item.tenantId }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Badge variant="outline" :class="badgeClass(item.lifecycleStatus)">
              {{ formatEvidenceStatus(item.lifecycleStatus) }}
            </Badge>
            <Badge variant="outline" :class="badgeClass(item.freshness)">
              {{ formatEvidenceStatus(item.freshness) }}
            </Badge>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Trust {{ item.trustScore }}/100</span>
          <span aria-hidden="true">•</span>
          <span>{{ item.linkedPathwayIds.length }} linked pathways</span>
          <span aria-hidden="true">•</span>
          <span>{{ item.enabled ? 'Enabled' : 'Disabled' }}</span>
        </div>
      </button>

      <div
        v-if="items.length === 0"
        class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500"
      >
        {{ emptyMessage }}
      </div>
    </div>
  </section>
</template>
