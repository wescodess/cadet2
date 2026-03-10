<script setup lang="ts">
import type { RecommendationCitation, RecommendationTrustBoundary } from '~/lib/recommendations/citations'

import RecommendationCitationList from '~/components/recommendations/RecommendationCitationList.vue'
import {
  getRecommendationTrustBoundaryDescription,
} from '~/lib/recommendations/citations'

const props = defineProps<{
  citations: RecommendationCitation[]
  trustBoundary: RecommendationTrustBoundary
  confidence: 'high' | 'medium' | 'low' | 'withheld'
  freshness: 'fresh' | 'stale' | 'unknown'
  caveat: string
}>()

const citationCountLabel = computed(() => (
  props.citations.length === 1
    ? '1 citation available'
    : `${props.citations.length} citations available`
))

const shouldShowCaveat = computed(() => props.caveat.trim().length > 0)
const panelTestId = 'evidence-confidence-panel'

const trustBoundaryToneClasses = computed(() => {
  if (props.trustBoundary === 'source-backed') {
    return 'border-[var(--trust,#2563eb)]/20 bg-[var(--trust-soft,#dbeafe)]/60'
  }

  if (props.trustBoundary === 'inferred') {
    return 'border-[var(--warning,#f59e0b)]/30 bg-[var(--warning-soft,#fef3c7)]/55'
  }

  return 'border-[var(--destructive,#ef4444)]/20 bg-[var(--destructive-soft,#fef2f2)]/70'
})

function confidenceLabel(confidence: typeof props.confidence) {
  if (confidence === 'withheld') {
    return 'Confidence withheld'
  }

  return `Confidence ${confidence}`
}

function freshnessLabel(freshness: typeof props.freshness) {
  if (freshness === 'unknown') {
    return 'Freshness unknown'
  }

  return `Freshness ${freshness}`
}
</script>

<template>
  <section
    :data-testid="panelTestId"
    class="space-y-4 rounded-xl border p-3"
    :class="trustBoundaryToneClasses"
    aria-label="Evidence and confidence details"
  >
    <div class="space-y-3">
      <div class="flex flex-wrap items-center gap-2 text-xs text-slate-700">
        <span class="rounded-full border border-white/70 bg-white/80 px-2.5 py-1 font-medium">
          {{ confidenceLabel(props.confidence) }}
        </span>
        <span class="rounded-full border border-white/70 bg-white/80 px-2.5 py-1 font-medium">
          {{ freshnessLabel(props.freshness) }}
        </span>
        <span class="rounded-full border border-white/70 bg-white/80 px-2.5 py-1 font-medium">
          {{ citationCountLabel }}
        </span>
      </div>

      <p class="text-sm leading-relaxed text-slate-800">
        {{ getRecommendationTrustBoundaryDescription(props.trustBoundary) }}
      </p>
    </div>

    <div
      v-if="shouldShowCaveat"
      data-testid="caveat-warning"
      class="rounded-xl border border-[var(--warning,#f59e0b)]/30 bg-white/80 px-3 py-3 text-sm leading-relaxed text-slate-800"
    >
      {{ props.caveat }}
    </div>

    <RecommendationCitationList :citations="props.citations" />
  </section>
</template>
