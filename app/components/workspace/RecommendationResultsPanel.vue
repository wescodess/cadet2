<script setup lang="ts">
type RecommendationResultsCandidate = {
  pathwayId: string
  type: 'direct' | 'blocked' | 'composed'
  rank: number
  tier: 'strong-fit' | 'conditional-fit' | 'lower-confidence'
  score: number
  composedSteps?: string[]
}

type RecommendationResultsRecord = {
  runId: string
  profileSnapshotId: string
  status: string
  results: {
    direct: RecommendationResultsCandidate[]
    blocked: RecommendationResultsCandidate[]
    composed: RecommendationResultsCandidate[]
  }
  noComposedReason?: string
}

type RecommendationStatusRecord = {
  runId: string
  status: string
}

const props = withDefaults(defineProps<{
  statusRecord: RecommendationStatusRecord | null
  resultsRecord: RecommendationResultsRecord | null
  isLoading?: boolean
  message?: string | null
}>(), {
  isLoading: false,
  message: null,
})

function normalizeTierLabel(tier: RecommendationResultsCandidate['tier']) {
  if (tier === 'strong-fit') {
    return 'Strong fit'
  }

  if (tier === 'conditional-fit') {
    return 'Conditional fit'
  }

  return 'Lower confidence'
}

const directResults = computed(() => props.resultsRecord?.results.direct || [])
const blockedResults = computed(() => props.resultsRecord?.results.blocked || [])
const composedResults = computed(() => props.resultsRecord?.results.composed || [])

const hasAnyResults = computed(() =>
  directResults.value.length > 0
  || blockedResults.value.length > 0
  || composedResults.value.length > 0,
)
</script>

<template>
  <section
    data-testid="recommendation-results-panel"
    class="w-full rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
    aria-live="polite"
  >
    <div class="mb-4 flex flex-col gap-1">
      <h3 class="text-lg font-semibold text-slate-900">
        Recommendation results
      </h3>
      <p class="text-sm text-slate-500">
        Ranked direct, blocked, and composed pathway recommendations for your latest run.
      </p>
    </div>

    <div
      v-if="props.isLoading"
      class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
    >
      Loading ranked recommendations...
    </div>

    <div
      v-else-if="props.message"
      class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
    >
      {{ props.message }}
    </div>

    <div
      v-else-if="!props.statusRecord"
      class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600"
    >
      Submit intake and start a recommendation run to view ranked results here.
    </div>

    <div
      v-else-if="!hasAnyResults"
      class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
    >
      No ranked recommendations are available for this run yet.
    </div>

    <div v-else class="space-y-5">
      <div v-if="directResults.length > 0" class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Direct pathways
        </p>
        <ul class="space-y-2">
          <li
            v-for="candidate in directResults"
            :key="`${candidate.type}:${candidate.pathwayId}`"
            data-testid="recommendation-result-item"
            class="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm"
          >
            #{{ candidate.rank }} · {{ candidate.pathwayId }} · {{ normalizeTierLabel(candidate.tier) }} · score {{ candidate.score }}
          </li>
        </ul>
      </div>

      <div v-if="blockedResults.length > 0" class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Blocked pathways
        </p>
        <ul class="space-y-2">
          <li
            v-for="candidate in blockedResults"
            :key="`${candidate.type}:${candidate.pathwayId}`"
            data-testid="recommendation-result-item"
            class="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm"
          >
            #{{ candidate.rank }} · {{ candidate.pathwayId }} · {{ normalizeTierLabel(candidate.tier) }} · score {{ candidate.score }}
          </li>
        </ul>
      </div>

      <div v-if="composedResults.length > 0" class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Composed pathways
        </p>
        <ul class="space-y-2">
          <li
            v-for="candidate in composedResults"
            :key="`${candidate.type}:${candidate.pathwayId}`"
            data-testid="recommendation-result-item"
            class="rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-2 text-sm"
          >
            <p>
              #{{ candidate.rank }} · {{ candidate.pathwayId }} · {{ normalizeTierLabel(candidate.tier) }} · score {{ candidate.score }}
            </p>
            <p
              v-if="candidate.composedSteps && candidate.composedSteps.length > 0"
              class="mt-1 text-xs text-slate-600"
            >
              Steps: {{ candidate.composedSteps.join(' → ') }}
            </p>
          </li>
        </ul>
      </div>

      <p
        v-if="props.resultsRecord?.noComposedReason && composedResults.length === 0"
        class="text-xs text-slate-600"
      >
        {{ props.resultsRecord.noComposedReason }}
      </p>
    </div>
  </section>
</template>
