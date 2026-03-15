<script setup lang="ts">
import type {
  RecommendationComparison,
  RecommendationNextStepPlan,
  RecommendationPathwayType,
  RecommendationResultsCandidate,
  RecommendationResultsRecord,
} from '~/lib/recommendations/comparison'
import type { RecommendationRunHistoryDetailResponse } from '~/lib/workspace/recommendation-run-history'

import { ArrowLeft, Clock3 } from 'lucide-vue-next'

import RecommendationResultsPanel from '~/components/workspace/RecommendationResultsPanel.vue'

const route = useRoute()
const runId = computed(() => String(route.params.runId || '').trim())
const historyFilter = computed(() => typeof route.query.historyFilter === 'string' ? route.query.historyFilter.trim() : '')
const detail = ref<RecommendationRunHistoryDetailResponse | null>(null)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const hasMounted = ref(false)

function createFallbackPathwayType(type: RecommendationResultsCandidate['type']): RecommendationPathwayType {
  if (type === 'direct') {
    return {
      key: 'available-now',
      label: 'Available now',
      description: 'Archived direct-fit pathway evidence remains available for review.',
    }
  }

  if (type === 'blocked') {
    return {
      key: 'blocked-but-close',
      label: 'Blocked but close',
      description: 'Archived blocker context remains available for this pathway.',
    }
  }

  return {
    key: 'strategic-multi-step',
    label: 'Strategic multi-step',
    description: 'Archived multi-step pathway context remains available for review.',
  }
}

function normalizeNextStepPlan(value: unknown): RecommendationNextStepPlan {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as {
      limitation?: unknown
      steps?: unknown
      summary?: unknown
    }

    return {
      summary: typeof record.summary === 'string' && record.summary.trim().length > 0
        ? record.summary
        : 'Archived next-step guidance is preserved for this run.',
      steps: Array.isArray(record.steps)
        ? record.steps.flatMap((step, index) => {
            if (!step || typeof step !== 'object' || Array.isArray(step)) {
              return []
            }

            const normalizedStep = step as {
              detail?: unknown
              id?: unknown
              priority?: unknown
              sequence?: unknown
              title?: unknown
            }

            return [{
              id: typeof normalizedStep.id === 'string' && normalizedStep.id.trim().length > 0
                ? normalizedStep.id
                : `archived-step-${index + 1}`,
              title: typeof normalizedStep.title === 'string' && normalizedStep.title.trim().length > 0
                ? normalizedStep.title
                : `Archived step ${index + 1}`,
              detail: typeof normalizedStep.detail === 'string'
                ? normalizedStep.detail
                : '',
              priority: normalizedStep.priority === 'now' || normalizedStep.priority === 'next' || normalizedStep.priority === 'later'
                ? normalizedStep.priority
                : 'next',
              sequence: typeof normalizedStep.sequence === 'number' ? normalizedStep.sequence : index + 1,
            }]
          })
        : [],
      limitation: typeof record.limitation === 'string'
        ? record.limitation
        : 'Archived plan details are limited for this run.',
    }
  }

  return {
    summary: 'Archived next-step guidance is preserved for this run.',
    steps: [],
    limitation: 'Archived plan details are limited for this run.',
  }
}

function normalizeArchivedCandidate(
  value: unknown,
  type: RecommendationResultsCandidate['type'],
  index: number,
): RecommendationResultsCandidate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const candidate = value as Record<string, unknown>
  const pathwayId = typeof candidate.pathwayId === 'string' ? candidate.pathwayId.trim() : ''
  const rationaleSource = typeof candidate.rationale === 'string'
    ? candidate.rationale
    : (typeof candidate.summary === 'string' ? candidate.summary : '')

  if (!pathwayId || !rationaleSource.trim()) {
    return null
  }

  return {
    pathwayId,
    type,
    rank: typeof candidate.rank === 'number' ? candidate.rank : index + 1,
    tier: candidate.tier === 'strong-fit' || candidate.tier === 'conditional-fit' || candidate.tier === 'lower-confidence'
      ? candidate.tier
      : (type === 'direct' ? 'strong-fit' : 'conditional-fit'),
    score: typeof candidate.score === 'number' ? candidate.score : 0,
    rationale: rationaleSource,
    fitSignals: Array.isArray(candidate.fitSignals) ? candidate.fitSignals as RecommendationResultsCandidate['fitSignals'] : [],
    composedSteps: type === 'composed' && Array.isArray(candidate.composedSteps)
      ? candidate.composedSteps.filter((step): step is string => typeof step === 'string' && step.trim().length > 0)
      : undefined,
    qualification: candidate.qualification === 'supported' || candidate.qualification === 'low-confidence' || candidate.qualification === 'withheld'
      ? candidate.qualification
      : 'supported',
    confidence: candidate.confidence === 'high' || candidate.confidence === 'medium' || candidate.confidence === 'low' || candidate.confidence === 'withheld'
      ? candidate.confidence
      : 'medium',
    freshness: candidate.freshness === 'fresh' || candidate.freshness === 'stale' || candidate.freshness === 'unknown'
      ? candidate.freshness
      : 'unknown',
    caveat: typeof candidate.caveat === 'string' ? candidate.caveat : '',
    blockers: Array.isArray(candidate.blockers) ? candidate.blockers as RecommendationResultsCandidate['blockers'] : [],
    tradeoffs: Array.isArray(candidate.tradeoffs) ? candidate.tradeoffs as RecommendationResultsCandidate['tradeoffs'] : [],
    improvementActions: Array.isArray(candidate.improvementActions) ? candidate.improvementActions as RecommendationResultsCandidate['improvementActions'] : [],
    pathwayType: candidate.pathwayType && typeof candidate.pathwayType === 'object' && !Array.isArray(candidate.pathwayType)
      && typeof (candidate.pathwayType as RecommendationPathwayType).label === 'string'
      && typeof (candidate.pathwayType as RecommendationPathwayType).description === 'string'
      ? candidate.pathwayType as RecommendationPathwayType
      : createFallbackPathwayType(type),
    citations: Array.isArray(candidate.citations) ? candidate.citations as RecommendationResultsCandidate['citations'] : [],
    trustBoundary: candidate.trustBoundary === 'source-backed' || candidate.trustBoundary === 'inferred' || candidate.trustBoundary === 'system-generated'
      ? candidate.trustBoundary
      : 'inferred',
    nextStepPlan: normalizeNextStepPlan(candidate.nextStepPlan),
  }
}

function normalizeArchivedResultsRecord(value: Extract<RecommendationRunHistoryDetailResponse, { available: true }>): RecommendationResultsRecord {
  const direct = value.results.direct
    .map((candidate, index) => normalizeArchivedCandidate(candidate, 'direct', index))
    .filter((candidate): candidate is RecommendationResultsCandidate => Boolean(candidate))
  const blocked = value.results.blocked
    .map((candidate, index) => normalizeArchivedCandidate(candidate, 'blocked', index))
    .filter((candidate): candidate is RecommendationResultsCandidate => Boolean(candidate))
  const composed = value.results.composed
    .map((candidate, index) => normalizeArchivedCandidate(candidate, 'composed', index))
    .filter((candidate): candidate is RecommendationResultsCandidate => Boolean(candidate))

  const counts = {
    direct: direct.length,
    blocked: blocked.length,
    composed: composed.length,
  }
  const groups = value.comparison.groups.map(group => ({
    ...group,
    count: counts[group.key],
  })).filter(group => group.count > 0)
  const comparison: RecommendationComparison = {
    ...value.comparison,
    groups,
    totalCandidateCount: counts.direct + counts.blocked + counts.composed,
    visibleGroupCount: groups.length,
  }

  return {
    runId: value.run.id,
    profileSnapshotId: value.run.profileSnapshotId,
    status: value.run.status,
    results: {
      direct,
      blocked,
      composed,
    },
    comparison,
  }
}

const statusRecord = computed(() => {
  if (!detail.value || !detail.value.available) {
    return null
  }

  return {
    runId: detail.value.run.id,
    status: detail.value.run.status,
  }
})

const resultsRecord = computed<RecommendationResultsRecord | null>(() => {
  if (!detail.value || !detail.value.available) {
    return null
  }

  return normalizeArchivedResultsRecord(detail.value)
})

const hasRenderableResults = computed(() => {
  if (!resultsRecord.value) {
    return false
  }

  const candidates = [
    ...resultsRecord.value.results.direct,
    ...resultsRecord.value.results.blocked,
    ...resultsRecord.value.results.composed,
  ]
  return candidates.length > 0
})

const historyBackLink = computed(() => (
  historyFilter.value
    ? `/workspace/history?filter=${encodeURIComponent(historyFilter.value)}`
    : '/workspace/history'
))

async function loadRunDetail() {
  if (!runId.value) {
    detail.value = null
    errorMessage.value = 'Invalid recommendation run identifier.'
    isLoading.value = false
    return
  }

  isLoading.value = true
  errorMessage.value = null

  try {
    const response = await fetch(`/api/workspace/runs/${encodeURIComponent(runId.value)}`, {
      credentials: 'include',
    })
    const body = await response.json() as RecommendationRunHistoryDetailResponse

    detail.value = body

    if (response.status >= 500) {
      errorMessage.value = 'We could not load this archived recommendation run right now.'
    }
  }
  catch {
    detail.value = null
    errorMessage.value = 'We could not load this archived recommendation run right now.'
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  hasMounted.value = true
  await loadRunDetail()
})

watch(runId, async (nextRunId, previousRunId) => {
  if (!hasMounted.value || nextRunId === previousRunId) {
    return
  }

  await loadRunDetail()
})
</script>

<template>
  <section class="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <NuxtLink
        :to="historyBackLink"
        data-testid="recommendation-history-back-link"
        class="mb-4 inline-flex min-h-[44px] w-fit items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--trust,#2563eb)] transition-colors hover:bg-[var(--trust-soft,#dbeafe)] hover:text-[var(--trust,#2563eb)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trust,#2563eb)]/30"
      >
        <ArrowLeft class="size-4" />
        Back to archive
      </NuxtLink>

      <div v-if="isLoading" class="space-y-3">
        <Skeleton class="h-8 w-64 rounded-xl" />
        <Skeleton class="h-24 rounded-2xl" />
      </div>

      <div
        v-else-if="errorMessage"
        class="rounded-2xl border border-[var(--destructive,#ef4444)]/20 bg-[var(--destructive-soft,#fef2f2)] p-4 text-sm text-rose-900"
      >
        {{ errorMessage }}
      </div>

      <div
        v-else-if="detail && !detail.available"
        class="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700"
      >
        {{ detail.reason }}
      </div>

      <div v-else-if="detail?.available" class="space-y-4">
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Archived recommendation review
          </p>
          <h2 class="text-2xl font-semibold text-slate-950">
            Recommendation run from {{ new Date(detail.run.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) }}
          </h2>
          <p class="text-sm leading-relaxed text-slate-600">
            {{ detail.profileSnapshot.summary }}
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <div class="flex items-start gap-3">
            <Clock3 class="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden="true" />
            <div class="space-y-2 text-sm text-slate-700">
              <p>Profile snapshot captured {{ new Date(detail.profileSnapshot.capturedAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric' }) }}.</p>
              <div class="flex flex-wrap gap-2">
                <Badge
                  v-for="factor in detail.profileSnapshot.keyFactors"
                  :key="factor"
                  variant="outline"
                  class="rounded-full border-slate-300 bg-white text-slate-700"
                >
                  {{ factor }}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <RecommendationResultsPanel
          v-if="hasRenderableResults"
          :status-record="statusRecord"
          :results-record="resultsRecord"
          :is-loading="false"
        />

        <div
          v-else
          class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
        >
          Archived recommendation details are preserved for this run, but the comparison workspace payload is not fully available in this view.
        </div>
      </div>
    </div>
  </section>
</template>
