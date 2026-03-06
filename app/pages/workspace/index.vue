<script setup lang="ts">
import { Compass, Shield, Zap, BadgeCheck } from 'lucide-vue-next'
import { useDisplayName } from '~/composables/useDisplayName'
import {
  getDefaultStatusMessage,
  isCanonicalRecommendationStatus,
  isInProgressStatus,
} from '~/lib/recommendation-lifecycle'
import RecommendationStatusBanner from '~/components/workspace/RecommendationStatusBanner.vue'
import RecommendationRunList from '~/components/workspace/RecommendationRunList.vue'
import RecommendationResultsPanel from '~/components/workspace/RecommendationResultsPanel.vue'

type RecommendationRunListItem = {
  runId: string
  profileSnapshotId: string
  status: string
  createdAt: string
  updatedAt: string
}

type RecommendationRunStatusRecord = {
  runId: string
  profileSnapshotId: string
  status: string
  statusMessage: string
  resumable: boolean
  processingHeartbeatAt: string
  createdAt: string
  updatedAt: string
}

type RecommendationResultsCandidate = {
  pathwayId: string
  type: 'direct' | 'blocked' | 'composed'
  rank: number
  tier: 'strong-fit' | 'conditional-fit' | 'lower-confidence'
  score: number
  composedSteps?: string[]
  rationale: string
  fitSignals: Array<{
    id: string
    label: string
    detail: string
    state: 'strength' | 'watch' | 'gap'
  }>
  qualification: 'supported' | 'low-confidence' | 'withheld'
  confidence: 'high' | 'medium' | 'low' | 'withheld'
  freshness: 'fresh' | 'stale' | 'unknown'
  caveat: string
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

const { firstName } = useDisplayName()
const recommendationRuns = ref<RecommendationRunListItem[]>([])
const isLoadingRuns = ref(true)
const runListErrorMessage = ref<string | null>(null)
const activeRunStatus = ref<RecommendationRunStatusRecord | null>(null)
const isLoadingRunStatus = ref(false)
const runStatusErrorMessage = ref<string | null>(null)
const recommendationResults = ref<RecommendationResultsRecord | null>(null)
const isLoadingResults = ref(false)
const recommendationResultsMessage = ref<string | null>(null)

async function readRunStatus(runId: string) {
  return await $fetch<RecommendationRunStatusRecord>(
    `/api/recommendations/runs/${encodeURIComponent(runId)}/status`,
  )
}

async function startRunProcessing(runId: string) {
  await $fetch<RecommendationRunStatusRecord>(
    `/api/recommendations/runs/${encodeURIComponent(runId)}/start`,
    {
      method: 'POST',
    },
  )
}

function toStatusCode(error: unknown) {
  if (!error || typeof error !== 'object') {
    return null
  }

  const errorWithStatus = error as {
    statusCode?: number
    data?: {
      statusCode?: number
    }
  }

  if (typeof errorWithStatus.statusCode === 'number') {
    return errorWithStatus.statusCode
  }

  if (typeof errorWithStatus.data?.statusCode === 'number') {
    return errorWithStatus.data.statusCode
  }

  return null
}

function isRecommendationStatusTerminal(status: string) {
  return status === 'completed' || status === 'degraded' || status === 'failed'
}

async function loadRecommendationResults(runId: string, status: string) {
  recommendationResults.value = null
  recommendationResultsMessage.value = null
  isLoadingResults.value = false

  if (!isRecommendationStatusTerminal(status)) {
    recommendationResultsMessage.value = 'Results will appear after recommendation processing is completed.'
    return
  }

  if (status === 'failed') {
    recommendationResultsMessage.value = 'This run failed before ranked recommendations could be generated.'
    return
  }

  isLoadingResults.value = true

  try {
    recommendationResults.value = await $fetch<RecommendationResultsRecord>(
      `/api/recommendations/runs/${encodeURIComponent(runId)}/results`,
    )
  }
  catch (error) {
    const statusCode = toStatusCode(error)

    if (statusCode === 409) {
      recommendationResultsMessage.value = 'Recommendation ranking is still in progress for this run.'
    }
    else if (statusCode === 404) {
      recommendationResultsMessage.value = 'No ranked recommendation payload was found for this run.'
    }
    else {
      recommendationResultsMessage.value = 'We could not load ranked recommendations right now.'
    }
  }
  finally {
    isLoadingResults.value = false
  }
}

function fallbackStatusFromRun(run: RecommendationRunListItem): RecommendationRunStatusRecord {
  const canonicalStatus = isCanonicalRecommendationStatus(run.status)
    ? run.status
    : 'queued'

  return {
    runId: run.runId,
    profileSnapshotId: run.profileSnapshotId,
    status: run.status,
    statusMessage: canonicalStatus
      ? getDefaultStatusMessage(canonicalStatus)
      : 'Recommendation processing status is available in your run timeline.',
    resumable: canonicalStatus ? isInProgressStatus(canonicalStatus) : false,
    processingHeartbeatAt: run.updatedAt,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  }
}

async function loadActiveRunStatus() {
  const latestRun = recommendationRuns.value[0]
  runStatusErrorMessage.value = null

  if (!latestRun) {
    activeRunStatus.value = null
    recommendationResults.value = null
    recommendationResultsMessage.value = null
    isLoadingResults.value = false
    return
  }

  isLoadingRunStatus.value = true

  try {
    activeRunStatus.value = await readRunStatus(latestRun.runId)

    const normalizedStatus = activeRunStatus.value?.status || ''
    if (isCanonicalRecommendationStatus(normalizedStatus) && isInProgressStatus(normalizedStatus)) {
      try {
        await startRunProcessing(latestRun.runId)
        activeRunStatus.value = await readRunStatus(latestRun.runId)
      }
      catch {
      }
    }

    await loadRecommendationResults(
      latestRun.runId,
      activeRunStatus.value?.status || latestRun.status,
    )
  }
  catch {
    activeRunStatus.value = fallbackStatusFromRun(latestRun)
    runStatusErrorMessage.value = null
    await loadRecommendationResults(
      latestRun.runId,
      activeRunStatus.value?.status || latestRun.status,
    )
  }
  finally {
    isLoadingRunStatus.value = false
  }
}

async function loadRecommendationRuns() {
  isLoadingRuns.value = true
  runListErrorMessage.value = null

  try {
    recommendationRuns.value = await $fetch<RecommendationRunListItem[]>('/api/workspace/recommendation-runs')
    await loadActiveRunStatus()
  }
  catch {
    recommendationRuns.value = []
    runListErrorMessage.value = 'We could not load your recommendation run continuity right now.'
    activeRunStatus.value = null
    runStatusErrorMessage.value = null
    recommendationResults.value = null
    recommendationResultsMessage.value = null
    isLoadingResults.value = false
  }
  finally {
    isLoadingRuns.value = false
  }
}

onMounted(async () => {
  await loadRecommendationRuns()
})
</script>

<template>
  <section
    data-testid="workspace-dashboard"
    class="flex w-full flex-1 flex-col items-center gap-6 py-6 md:py-10"
  >
    <!-- Welcome Card -->
    <div class="w-full rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm sm:p-12">
      <!-- Icon -->
      <div class="mb-8 flex justify-center">
        <div class="flex size-20 items-center justify-center rounded-full bg-[var(--trust-soft)]">
          <Compass class="size-10 text-[var(--trust)]" />
        </div>
      </div>

      <!-- Heading -->
      <h2 class="mb-4 text-2xl font-bold text-slate-900 md:text-3xl">
        Welcome to Cadet2, {{ firstName }}. Let's build your pathway plan.
      </h2>

      <!-- Description -->
      <p class="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-slate-500">
        We'll help you turn your unique situation into a clear, evidence-based
        immigration strategy for your journey to Canada.
      </p>

      <!-- CTA Button -->
      <div class="flex justify-center">
        <NuxtLink
          to="/workspace/intake"
          class="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--trust)] px-8 py-3.5 font-bold text-white shadow-md transition-colors hover:bg-[var(--trust)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
        >
          Start Guided Intake
        </NuxtLink>
      </div>

      <!-- Trust Badges -->
      <div class="mt-16 flex justify-center gap-12 border-t border-slate-50 pt-8">
        <div class="flex flex-col items-center gap-2 text-slate-500 opacity-50">
          <BadgeCheck class="size-5" />
          <span class="text-xs font-medium">IRCC Compliant</span>
        </div>
        <div class="flex flex-col items-center gap-2 text-slate-500 opacity-50">
          <Shield class="size-5" />
          <span class="text-xs font-medium">Data Secured</span>
        </div>
        <div class="flex flex-col items-center gap-2 opacity-50">
          <Zap class="size-5" />
          <span class="text-xs font-medium">Fast Analysis</span>
        </div>
      </div>
    </div>

    <RecommendationRunList
      :runs="recommendationRuns"
      :is-loading="isLoadingRuns"
      :error-message="runListErrorMessage"
    />

    <RecommendationStatusBanner
      :status-record="activeRunStatus"
      :is-loading="isLoadingRunStatus"
      :error-message="runStatusErrorMessage"
    />

    <RecommendationResultsPanel
      :status-record="activeRunStatus"
      :results-record="recommendationResults"
      :is-loading="isLoadingResults"
      :message="recommendationResultsMessage"
    />
  </section>
</template>
