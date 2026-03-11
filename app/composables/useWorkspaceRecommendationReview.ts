import type { RecommendationResultsRecord } from '~/lib/recommendations/comparison'

import {
  getDefaultStatusMessage,
  isCanonicalRecommendationStatus,
  isInProgressStatus,
} from '~/lib/recommendation-lifecycle'

export type RecommendationRunListItem = {
  runId: string
  profileSnapshotId: string
  status: string
  createdAt: string
  updatedAt: string
}

export type RecommendationRunStatusRecord = {
  runId: string
  profileSnapshotId: string
  status: string
  statusMessage: string
  resumable: boolean
  processingHeartbeatAt: string
  createdAt: string
  updatedAt: string
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

export function useWorkspaceRecommendationReview() {
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

  async function loadRecommendationResults(runId: string, status: string) {
    recommendationResults.value = null
    recommendationResultsMessage.value = null
    isLoadingResults.value = false

    if (!isRecommendationStatusTerminal(status)) {
      recommendationResultsMessage.value = 'Results will appear after recommendation processing is completed.'
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

  async function loadActiveRunStatus(targetRunId?: string | null) {
    const targetRun = targetRunId
      ? recommendationRuns.value.find(run => run.runId === targetRunId) || null
      : recommendationRuns.value[0] || null

    runStatusErrorMessage.value = null

    if (!targetRun) {
      activeRunStatus.value = null
      recommendationResults.value = null
      recommendationResultsMessage.value = targetRunId
        ? 'We could not find that recommendation run in your workspace.'
        : null
      isLoadingResults.value = false
      return
    }

    isLoadingRunStatus.value = true

    try {
      activeRunStatus.value = await readRunStatus(targetRun.runId)

      const normalizedStatus = activeRunStatus.value?.status || ''
      if (isCanonicalRecommendationStatus(normalizedStatus) && isInProgressStatus(normalizedStatus)) {
        try {
          await startRunProcessing(targetRun.runId)
          activeRunStatus.value = await readRunStatus(targetRun.runId)
        }
        catch {
        }
      }

      await loadRecommendationResults(
        targetRun.runId,
        activeRunStatus.value?.status || targetRun.status,
      )
    }
    catch {
      activeRunStatus.value = fallbackStatusFromRun(targetRun)
      runStatusErrorMessage.value = null
      await loadRecommendationResults(
        targetRun.runId,
        activeRunStatus.value?.status || targetRun.status,
      )
    }
    finally {
      isLoadingRunStatus.value = false
    }
  }

  async function loadRecommendationRuns(targetRunId?: string | null) {
    isLoadingRuns.value = true
    runListErrorMessage.value = null

    try {
      recommendationRuns.value = await $fetch<RecommendationRunListItem[]>('/api/workspace/recommendation-runs')
      await loadActiveRunStatus(targetRunId)
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

  return {
    recommendationRuns,
    isLoadingRuns,
    runListErrorMessage,
    activeRunStatus,
    isLoadingRunStatus,
    runStatusErrorMessage,
    recommendationResults,
    isLoadingResults,
    recommendationResultsMessage,
    loadRecommendationRuns,
    loadActiveRunStatus,
  }
}
