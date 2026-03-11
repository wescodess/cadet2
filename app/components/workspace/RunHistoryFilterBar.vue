<script setup lang="ts">
import type { RecommendationRunHistoryFilter } from '~/lib/workspace/recommendation-run-history'

const props = withDefaults(defineProps<{
  activeFilter?: RecommendationRunHistoryFilter
}>(), {
  activeFilter: 'all',
})

const emit = defineEmits<{
  'filter-change': [status: RecommendationRunHistoryFilter]
}>()

const filters: Array<{ label: string, value: RecommendationRunHistoryFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Completed', value: 'completed' },
  { label: 'Degraded', value: 'degraded' },
  { label: 'Failed', value: 'failed' },
]
</script>

<template>
  <div
    data-testid="run-history-filter-bar"
    class="flex gap-2 overflow-x-auto pb-1"
    role="toolbar"
    aria-label="Filter archived recommendation runs by status"
  >
    <Button
      v-for="filter in filters"
      :key="filter.value"
      type="button"
      :variant="props.activeFilter === filter.value ? 'default' : 'outline'"
      :aria-pressed="props.activeFilter === filter.value"
      class="min-h-[44px] shrink-0 rounded-full px-4"
      :class="props.activeFilter === filter.value ? 'bg-[var(--trust)] text-white hover:bg-[var(--trust)]/90' : 'border-slate-200 bg-white text-slate-700'"
      @click="emit('filter-change', filter.value)"
    >
      {{ filter.label }}
    </Button>
  </div>
</template>
