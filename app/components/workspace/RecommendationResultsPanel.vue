<script setup lang="ts">
import BlockerAndTradeoffPanel from '~/components/recommendations/BlockerAndTradeoffPanel.vue'
import NextActionQueue from '~/components/recommendations/NextActionQueue.vue'
import RecommendationTierBadge from '~/components/workspace/RecommendationTierBadge.vue'

type RecommendationFitSignal = {
  id: string
  label: string
  detail: string
  state: 'strength' | 'watch' | 'gap'
}

type RecommendationBlocker = {
  id: string
  label: string
  detail: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

type RecommendationTradeoff = {
  id: string
  dimension: 'effort' | 'timing' | 'complexity' | 'cost'
  summary: string
  impact: 'high' | 'medium' | 'low'
}

type RecommendationImprovementAction = {
  id: string
  title: string
  detail: string
  priority: 'now' | 'next' | 'later'
  expectedImpact: string
}

type RecommendationResultsCandidate = {
  pathwayId: string
  type: 'direct' | 'blocked' | 'composed'
  rank: number
  tier: 'strong-fit' | 'conditional-fit' | 'lower-confidence'
  score: number
  rationale: string
  fitSignals: RecommendationFitSignal[]
  composedSteps?: string[]
  qualification: 'supported' | 'low-confidence' | 'withheld'
  confidence: 'high' | 'medium' | 'low' | 'withheld'
  freshness: 'fresh' | 'stale' | 'unknown'
  caveat: string
  blockers?: RecommendationBlocker[]
  tradeoffs?: RecommendationTradeoff[]
  improvementActions?: RecommendationImprovementAction[]
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

function normalizePathwayLabel(pathwayId: string) {
  if (pathwayId === 'mvp-skilled-worker') {
    return 'Skilled Worker pathway'
  }

  if (pathwayId === 'mvp-provincial-nominee') {
    return 'Provincial Nominee pathway'
  }

  if (pathwayId === 'mvp-study-to-work') {
    return 'Study-to-Work pathway'
  }

  return pathwayId
}

function signalToneClasses(state: RecommendationFitSignal['state']) {
  if (state === 'strength') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  }

  if (state === 'gap') {
    return 'border-rose-200 bg-rose-50 text-rose-900'
  }

  return 'border-amber-200 bg-amber-50 text-amber-900'
}

function signalStateLabel(state: RecommendationFitSignal['state']) {
  if (state === 'strength') {
    return 'Strength'
  }

  if (state === 'gap') {
    return 'Gap'
  }

  return 'Watch'
}

function candidateContainerClasses(candidate: RecommendationResultsCandidate) {
  if (candidate.qualification === 'supported') {
    return 'border-emerald-200 bg-emerald-50/60'
  }

  if (candidate.qualification === 'withheld') {
    return 'border-rose-200 bg-rose-50/50'
  }

  return 'border-amber-200 bg-amber-50/60'
}

function candidateOutcomeSummary(candidate: RecommendationResultsCandidate) {
  if (candidate.qualification === 'supported') {
    return 'Supported recommendation'
  }

  if (candidate.qualification === 'withheld') {
    return 'Withheld recommendation'
  }

  return 'Low-confidence recommendation'
}

function candidateBlockers(candidate: RecommendationResultsCandidate) {
  return Array.isArray(candidate.blockers) ? candidate.blockers : []
}

function candidateTradeoffs(candidate: RecommendationResultsCandidate) {
  return Array.isArray(candidate.tradeoffs) ? candidate.tradeoffs : []
}

function candidateActions(candidate: RecommendationResultsCandidate) {
  return Array.isArray(candidate.improvementActions) ? candidate.improvementActions : []
}

const directResults = computed(() => props.resultsRecord?.results.direct || [])
const blockedResults = computed(() => props.resultsRecord?.results.blocked || [])
const composedResults = computed(() => props.resultsRecord?.results.composed || [])

const hasAnyResults = computed(() =>
  directResults.value.length > 0
  || blockedResults.value.length > 0
  || composedResults.value.length > 0,
)

const resultGroups = computed(() => ([
  {
    key: 'direct',
    label: 'Direct pathways',
    items: directResults.value,
  },
  {
    key: 'blocked',
    label: 'Blocked pathways',
    items: blockedResults.value,
  },
  {
    key: 'composed',
    label: 'Composed pathways',
    items: composedResults.value,
  },
]).filter(group => group.items.length > 0))
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
        Review why each recommendation appears, what blocks it, and which actions may improve fit.
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

    <div v-else class="space-y-6">
      <div v-for="group in resultGroups" :key="group.key" class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {{ group.label }}
        </p>

        <ul class="space-y-3">
          <li
            v-for="candidate in group.items"
            :key="`${candidate.type}:${candidate.pathwayId}`"
            data-testid="recommendation-result-item"
            class="rounded-lg border px-4 py-3 text-sm"
            :class="candidateContainerClasses(candidate)"
          >
            <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div class="space-y-1">
                <p class="font-semibold text-slate-900">
                  #{{ candidate.rank }} · {{ normalizePathwayLabel(candidate.pathwayId) }}
                </p>
                <p class="text-xs font-medium text-slate-700">
                  {{ candidateOutcomeSummary(candidate) }} · Confidence {{ candidate.confidence }} · Freshness {{ candidate.freshness }}
                </p>
              </div>
              <RecommendationTierBadge
                :tier="candidate.tier"
                :qualification="candidate.qualification"
                :confidence="candidate.confidence"
              />
            </div>

            <p class="mt-2 text-sm text-slate-800">
              {{ candidate.rationale }}
            </p>

            <ul class="mt-3 grid gap-2 md:grid-cols-2" aria-label="Recommendation fit signals">
              <li
                v-for="signal in candidate.fitSignals"
                :key="`${candidate.pathwayId}:${signal.id}`"
                class="rounded-md border px-2.5 py-2 text-xs"
                :class="signalToneClasses(signal.state)"
              >
                <span class="font-semibold">{{ signalStateLabel(signal.state) }}:</span>
                <span class="font-semibold"> {{ signal.label }}</span>
                <span> · {{ signal.detail }}</span>
              </li>
            </ul>

            <div class="mt-3 space-y-3">
              <BlockerAndTradeoffPanel
                :blockers="candidateBlockers(candidate)"
                :tradeoffs="candidateTradeoffs(candidate)"
              />

              <NextActionQueue
                v-if="candidateActions(candidate).length > 0"
                :actions="candidateActions(candidate)"
              />
            </div>

            <p
              v-if="candidate.qualification !== 'supported'"
              class="mt-3 rounded-md border border-amber-300 bg-white/80 px-2.5 py-2 text-xs text-slate-800"
            >
              Caution: {{ candidate.caveat }}
            </p>

            <p
              v-if="candidate.composedSteps && candidate.composedSteps.length > 0"
              class="mt-2 text-xs text-slate-700"
            >
              Staged steps: {{ candidate.composedSteps.join(' -> ') }}
            </p>
          </li>
        </ul>
      </div>

      <p
        v-if="props.resultsRecord?.noComposedReason && composedResults.length === 0"
        class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
      >
        {{ props.resultsRecord.noComposedReason }}
      </p>
    </div>
  </section>
</template>
