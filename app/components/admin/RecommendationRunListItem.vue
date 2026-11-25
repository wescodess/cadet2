<script setup lang="ts">
import { CalendarDays, CircleAlert, ShieldCheck } from 'lucide-vue-next'

import { Badge } from '@/components/ui/badge'
import {
  formatRecommendationReviewFreshness,
  formatRecommendationReviewState,
  formatRecommendationRunStatus,
  recommendationReviewTestIds,
  type RecommendationReviewRunSummary,
} from '@/lib/admin/recommendationReviews'
import { cn } from '@/lib/utils'

const props = defineProps<{
  item: RecommendationReviewRunSummary
  selected?: boolean
}>()

defineEmits<{
  (event: 'select', runId: string): void
}>()

function toDateLabel(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
}

function reviewStateClasses(value: RecommendationReviewRunSummary['reviewState']) {
  if (value === 'flagged') {
    return 'border-rose-500/25 bg-rose-500/10 text-rose-700'
  }

  if (value === 'resolved') {
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700'
  }

  if (value === 'dismissed') {
    return 'border-slate-300 bg-slate-100 text-slate-700'
  }

  return 'border-amber-500/25 bg-amber-500/15 text-amber-700'
}

function statusClasses(value: RecommendationReviewRunSummary['recommendationStatus']) {
  if (value === 'failed') {
    return 'border-rose-500/25 bg-rose-500/10 text-rose-700'
  }

  if (value === 'degraded') {
    return 'border-amber-500/25 bg-amber-500/15 text-amber-700'
  }

  return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700'
}

function freshnessClasses(value: RecommendationReviewRunSummary['freshness']) {
  if (value === 'expired') {
    return 'text-rose-700'
  }

  if (value === 'stale') {
    return 'text-amber-700'
  }

  return 'text-emerald-700'
}
</script>

<template>
  <button
    :data-testid="recommendationReviewTestIds.runItem"
    class="w-full rounded-[1.35rem] border p-4 text-left shadow-sm transition"
    :class="selected
      ? 'border-[#234c76]/30 bg-[#edf4fb] shadow-md'
      : 'border-slate-200 bg-white/95 hover:border-slate-300 hover:bg-white'"
    type="button"
    @click="$emit('select', item.runId)"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="space-y-1">
        <p class="text-sm font-semibold text-slate-950">
          {{ item.anonymizedSubject }}
        </p>
        <p class="text-xs uppercase tracking-[0.18em] text-slate-500">
          {{ item.runId }}
        </p>
      </div>

      <Badge
        :data-testid="recommendationReviewTestIds.runStatusBadge"
        :class="cn('gap-1.5 border text-[11px] font-semibold uppercase tracking-[0.16em]', statusClasses(item.recommendationStatus))"
        variant="outline"
      >
        <ShieldCheck class="size-3.5" />
        {{ formatRecommendationRunStatus(item.recommendationStatus) }}
      </Badge>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      <Badge
        :class="cn('border text-[11px] font-semibold', reviewStateClasses(item.reviewState))"
        :data-testid="recommendationReviewTestIds.reviewStateBadge"
        variant="outline"
      >
        {{ formatRecommendationReviewState(item.reviewState) }}
      </Badge>
      <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
        Confidence {{ item.confidence }}
      </span>
      <span
        class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
        :class="freshnessClasses(item.freshness)"
      >
        <CircleAlert class="size-3.5" />
        {{ formatRecommendationReviewFreshness(item.freshness) }}
      </span>
    </div>

    <div class="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-600">
      <div class="rounded-2xl bg-slate-50 px-3 py-2">
        <p class="uppercase tracking-[0.14em] text-slate-400">
          Citations
        </p>
        <p class="mt-1 text-base font-semibold text-slate-900">
          {{ item.citationCount }}
        </p>
      </div>
      <div class="rounded-2xl bg-slate-50 px-3 py-2">
        <p class="uppercase tracking-[0.14em] text-slate-400">
          Flagged
        </p>
        <p class="mt-1 text-base font-semibold text-slate-900">
          {{ item.flaggedCitationCount }}
        </p>
      </div>
      <div class="rounded-2xl bg-slate-50 px-3 py-2">
        <p class="uppercase tracking-[0.14em] text-slate-400">
          Caveats
        </p>
        <p class="mt-1 text-base font-semibold text-slate-900">
          {{ item.caveatCount }}
        </p>
      </div>
    </div>

    <div class="mt-4 flex items-center gap-2 text-xs text-slate-500">
      <CalendarDays class="size-3.5" />
      Reviewed run created {{ toDateLabel(item.createdAt) }}
    </div>
  </button>
</template>
