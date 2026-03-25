<script setup lang="ts">
import { ArrowUpRight, Flag, Link2, PauseCircle, ShieldCheck } from 'lucide-vue-next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  formatRecommendationReviewFreshness,
  formatRecommendationReviewState,
  formatRecommendationReviewSupportStrength,
  recommendationReviewTestIds,
  type RecommendationReviewCitation,
} from '@/lib/admin/recommendationReviews'
import { cn } from '@/lib/utils'

const props = defineProps<{
  citation: RecommendationReviewCitation
}>()

defineEmits<{
  (event: 'flag', citation: RecommendationReviewCitation): void
  (event: 'pause-source', citation: RecommendationReviewCitation): void
}>()

function supportClasses(value: RecommendationReviewCitation['supportStrength']) {
  if (value === 'strong') {
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700'
  }

  if (value === 'adequate') {
    return 'border-sky-500/25 bg-sky-500/10 text-sky-700'
  }

  if (value === 'weak') {
    return 'border-amber-500/25 bg-amber-500/15 text-amber-700'
  }

  return 'border-rose-500/25 bg-rose-500/10 text-rose-700'
}

function reviewClasses(value: RecommendationReviewCitation['reviewState']) {
  if (value === 'resolved') {
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700'
  }

  if (value === 'flagged') {
    return 'border-rose-500/25 bg-rose-500/10 text-rose-700'
  }

  if (value === 'dismissed') {
    return 'border-slate-300 bg-slate-100 text-slate-700'
  }

  return 'border-amber-500/25 bg-amber-500/15 text-amber-700'
}

function freshnessClasses(value: RecommendationReviewCitation['freshness']) {
  if (value === 'current') {
    return 'text-emerald-700'
  }

  if (value === 'stale') {
    return 'text-amber-700'
  }

  return 'text-rose-700'
}
</script>

<template>
  <article
    :data-testid="recommendationReviewTestIds.citationCard"
    class="rounded-[1.5rem] border border-slate-200 bg-white/95 p-5 shadow-sm"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-1">
        <p class="text-sm font-semibold text-slate-950">
          {{ citation.sourceName }}
        </p>
        <p class="text-xs uppercase tracking-[0.16em] text-slate-500">
          {{ citation.pathwayLabel }}
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <Badge :class="cn('border text-[11px] font-semibold', supportClasses(citation.supportStrength))" variant="outline">
          <ShieldCheck class="size-3.5" />
          {{ formatRecommendationReviewSupportStrength(citation.supportStrength) }}
        </Badge>
        <Badge
          :class="cn('border text-[11px] font-semibold', reviewClasses(citation.reviewState))"
          variant="outline"
        >
          {{ formatRecommendationReviewState(citation.reviewState) }}
        </Badge>
      </div>
    </div>

    <p class="mt-4 rounded-[1.2rem] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
      {{ citation.claimSnippet }}
    </p>

    <div class="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div class="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Match context
        </p>
        <p class="mt-2 text-sm leading-6 text-slate-700">
          {{ citation.matchContext }}
        </p>
      </div>
      <div class="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Freshness
        </p>
        <p class="mt-2 inline-flex items-center gap-2 text-sm font-medium" :class="freshnessClasses(citation.freshness)">
          <Link2 class="size-4" />
          {{ formatRecommendationReviewFreshness(citation.freshness) }}
        </p>
        <p v-if="citation.flagReason" class="mt-3 text-xs leading-5 text-slate-500">
          Last note: {{ citation.flagReason }}
        </p>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <Button
        :data-testid="recommendationReviewTestIds.citationFlagButton"
        size="sm"
        @click="$emit('flag', citation)"
      >
        <Flag class="size-4" />
        Flag citation
      </Button>
      <Button
        :data-testid="recommendationReviewTestIds.pauseSourceButton"
        size="sm"
        variant="outline"
        @click="$emit('pause-source', citation)"
      >
        <PauseCircle class="size-4" />
        Pause source
      </Button>
      <NuxtLink
        class="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        to="/admin/evidence-sources"
      >
        <ArrowUpRight class="size-4" />
        Refresh source
      </NuxtLink>
    </div>
  </article>
</template>
