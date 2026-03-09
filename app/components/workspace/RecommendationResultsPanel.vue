<script setup lang="ts">
import PathwayComparisonCard from '~/components/recommendations/PathwayComparisonCard.vue'
import RecommendationSummaryBand from '~/components/recommendations/RecommendationSummaryBand.vue'
import {
  type RecommendationComparisonGroup,
  type RecommendationResultsCandidate,
  type RecommendationResultsRecord,
} from '~/lib/recommendations/comparison'

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

const directResults = computed(() => props.resultsRecord?.results.direct || [])
const blockedResults = computed(() => props.resultsRecord?.results.blocked || [])
const composedResults = computed(() => props.resultsRecord?.results.composed || [])

const hasAnyResults = computed(() =>
  directResults.value.length > 0
  || blockedResults.value.length > 0
  || composedResults.value.length > 0,
)

const resolvedComparison = computed(() => props.resultsRecord?.comparison || null)

function groupItems(groupKey: RecommendationComparisonGroup['key']): RecommendationResultsCandidate[] {
  if (groupKey === 'direct') {
    return directResults.value
  }

  if (groupKey === 'blocked') {
    return blockedResults.value
  }

  return composedResults.value
}

const resultGroups = computed(() => {
  const configuredGroups = resolvedComparison.value?.groups || []

  return configuredGroups.map(group => ({
    ...group,
    items: groupItems(group.key),
  }))
})

const comparisonMode = computed(() => resolvedComparison.value?.mode || 'fallback')

const comparisonContainerClasses = computed(() =>
  comparisonMode.value === 'workspace'
    ? 'grid gap-4 xl:grid-cols-3'
    : 'space-y-4',
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
        Recommendation comparison
      </h3>
      <p class="text-sm text-slate-500">
        Compare immediate, blocked, and longer-horizon routes without losing rank, blocker, or next-step context.
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

    <div
      v-else-if="!resolvedComparison"
      data-testid="recommendation-comparison-workspace"
      class="space-y-6"
    >
      <div class="rounded-lg border border-[var(--warning,#f59e0b)]/40 bg-[var(--warning-soft,#fef3c7)]/50 p-4 text-sm text-slate-700">
        Comparison metadata is unavailable for this run, so pathways are shown in a flat review layout.
      </div>

      <div class="space-y-4">
        <PathwayComparisonCard
          v-for="candidate in [...directResults, ...blockedResults, ...composedResults]"
          :key="`${candidate.type}:${candidate.pathwayId}`"
          :candidate="candidate"
        />
      </div>
    </div>

    <div
      v-else
      data-testid="recommendation-comparison-workspace"
      class="space-y-6"
    >
      <RecommendationSummaryBand
        :comparison="resolvedComparison"
        :no-composed-reason="comparisonMode === 'fallback' ? (props.resultsRecord?.noComposedReason || null) : null"
      />

      <div
        :data-testid="comparisonMode === 'fallback' ? 'recommendation-comparison-fallback' : undefined"
        :class="comparisonContainerClasses"
      >
        <section
          v-for="group in resultGroups"
          :key="group.key"
          data-testid="recommendation-comparison-group"
          class="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {{ group.label }}
            </p>
            <h4 class="text-base font-semibold text-slate-950">
              {{ group.count }} ranked {{ group.count === 1 ? 'pathway' : 'pathways' }}
            </h4>
            <p class="text-sm text-slate-600">
              {{ group.description }}
            </p>
          </div>

          <div class="space-y-4">
            <PathwayComparisonCard
              v-for="candidate in group.items"
              :key="`${candidate.type}:${candidate.pathwayId}`"
              :candidate="candidate"
            />
          </div>
        </section>
      </div>
    </div>
  </section>
</template>
