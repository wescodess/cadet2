<script setup lang="ts">
import type { RecommendationResultsCandidate } from '~/lib/recommendations/comparison'

import RecommendationTierBadge from '~/components/workspace/RecommendationTierBadge.vue'
import {
  buildRecommendationPathwayDetailPath,
  normalizePathwayLabel,
} from '~/lib/recommendations/comparison'

const props = defineProps<{
  candidate: RecommendationResultsCandidate
  runId: string
}>()

const route = useRoute()

const detailPath = computed(() => {
  const historyFilter = typeof route.query.historyFilter === 'string'
    ? route.query.historyFilter.trim()
    : ''

  return buildRecommendationPathwayDetailPath({
    runId: props.runId,
    pathwayId: props.candidate.pathwayId,
    type: props.candidate.type,
    historyFilter,
  })
})

function candidateContainerClasses(candidate: RecommendationResultsCandidate) {
  if (candidate.type === 'direct') {
    return 'border-[var(--confidence-high,#22c55e)]/30 bg-[var(--success-soft,#f0fdf4)]/40'
  }

  if (candidate.type === 'blocked') {
    return 'border-[var(--warning,#f59e0b)]/35 bg-[var(--warning-soft,#fef3c7)]/45'
  }

  return 'border-[var(--primary,#6366f1)]/20 bg-[var(--primary,#6366f1)]/5'
}
</script>

<template>
  <article
    data-testid="recommendation-result-item"
    class="space-y-4 rounded-2xl border p-4 shadow-sm"
    :class="candidateContainerClasses(props.candidate)"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="space-y-2">
        <span
          data-testid="recommendation-pathway-type-badge"
          class="inline-flex items-center rounded-full border border-slate-300 bg-white/85 px-3 py-1 text-xs font-semibold text-slate-950"
        >
          {{ props.candidate.pathwayType.label }}
        </span>

        <div class="space-y-1">
          <h5 class="text-base font-semibold text-slate-950">
            {{ normalizePathwayLabel(props.candidate.pathwayId) }}
          </h5>
          <p class="text-xs font-medium text-slate-600">
            Rank #{{ props.candidate.rank }} · Confidence {{ props.candidate.confidence }}
          </p>
        </div>
      </div>

      <RecommendationTierBadge
        :tier="props.candidate.tier"
        :qualification="props.candidate.qualification"
        :confidence="props.candidate.confidence"
      />
    </div>

    <p class="text-sm leading-relaxed text-slate-900">
        {{ props.candidate.rationale }}
    </p>

    <div class="flex justify-end">
      <Button
        as-child
        variant="outline"
        class="min-h-[44px] rounded-xl border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
      >
        <NuxtLink :to="detailPath">
          View full pathway
        </NuxtLink>
      </Button>
    </div>
  </article>
</template>
