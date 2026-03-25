<script setup lang="ts">
import {
  recommendationReviewFilters,
  recommendationReviewTestIds,
  type RecommendationReviewFilterKey,
} from '@/lib/admin/recommendationReviews'

defineProps<{
  counts: Record<RecommendationReviewFilterKey, number>
  modelValue: RecommendationReviewFilterKey
}>()

defineEmits<{
  (event: 'update:modelValue', value: RecommendationReviewFilterKey): void
}>()
</script>

<template>
  <div
    :data-testid="recommendationReviewTestIds.citationFilters"
    class="rounded-[1.4rem] border border-slate-200 bg-slate-50/90 p-1"
  >
    <div class="grid gap-1 md:grid-cols-4">
      <button
        v-for="filter in recommendationReviewFilters"
        :key="filter.key"
        :aria-selected="modelValue === filter.key"
        :class="modelValue === filter.key
          ? 'bg-white text-slate-950 shadow-sm'
          : 'text-slate-600 hover:bg-white/70'"
        class="inline-flex items-center justify-between gap-2 rounded-[1.1rem] px-3 py-2 text-sm font-medium transition"
        role="tab"
        type="button"
        @click="$emit('update:modelValue', filter.key)"
      >
        <span>{{ filter.label }}</span>
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          {{ counts[filter.key] }}
        </span>
      </button>
    </div>
  </div>
</template>
