import type { WorkspaceSummary, WorkspaceSummaryActionKey } from '~~/shared/types/workspace-summary'

import {
  getWorkspacePrimaryAction,
  getWorkspaceSecondaryActions,
  type WorkspaceResolvedAction,
} from '~/lib/workspace/workspace-summary'

function toErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const withStatusMessage = error as {
      statusMessage?: string
      data?: {
        statusMessage?: string
      }
    }

    if (typeof withStatusMessage.statusMessage === 'string' && withStatusMessage.statusMessage.trim().length > 0) {
      return withStatusMessage.statusMessage
    }

    if (typeof withStatusMessage.data?.statusMessage === 'string' && withStatusMessage.data.statusMessage.trim().length > 0) {
      return withStatusMessage.data.statusMessage
    }
  }

  return 'We could not load your planning workspace continuity right now.'
}

async function navigateWithinWorkspace(path: string) {
  await navigateTo(path)
}

function resolveReviewRunId(summary: WorkspaceSummary | null) {
  return summary?.latestRun?.id || summary?.latestReviewRun?.id || null
}

type RefreshRunResponse = {
  runId: string
}

export function useWorkspaceContinuity() {
  const summary = ref<WorkspaceSummary | null>(null)
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const activeActionKey = ref<WorkspaceSummaryActionKey | null>(null)

  const primaryAction = computed<WorkspaceResolvedAction | null>(() => {
    return summary.value ? getWorkspacePrimaryAction(summary.value) : null
  })

  const secondaryActions = computed(() => {
    return summary.value ? getWorkspaceSecondaryActions(summary.value) : []
  })

  async function fetchSummary() {
    isLoading.value = true
    error.value = null

    try {
      summary.value = await $fetch<WorkspaceSummary>('/api/workspace/summary')
    }
    catch (fetchError) {
      summary.value = null
      error.value = toErrorMessage(fetchError)
    }
    finally {
      isLoading.value = false
    }
  }

  async function goToIntake(mode: 'resume' | 'new-cycle' = 'resume') {
    if (mode === 'new-cycle' && summary.value) {
      const sourceRun = summary.value.latestRun?.id
      const query = sourceRun
        ? `?mode=new-cycle&sourceRun=${encodeURIComponent(sourceRun)}`
        : '?mode=new-cycle'
      await navigateWithinWorkspace(`/workspace/intake${query}`)
      return
    }

    await navigateWithinWorkspace('/workspace/intake')
  }

  async function goToRecommendations(_runId?: string | null) {
    await navigateWithinWorkspace('/workspace/recommendations')
  }

  async function goToHistory() {
    await navigateWithinWorkspace('/workspace/history')
  }

  async function goToComparison() {
    const comparison = summary.value?.comparison
    if (!comparison?.available || !comparison.baselineRunId || !comparison.currentRunId) {
      return
    }

    await navigateWithinWorkspace(
      `/workspace/compare?runA=${encodeURIComponent(comparison.baselineRunId)}&runB=${encodeURIComponent(comparison.currentRunId)}`,
    )
  }

  async function refreshPlanFromLatestRun() {
    const latestReviewRunId = summary.value?.latestReviewRun?.id
    if (!latestReviewRunId) {
      return
    }

    activeActionKey.value = 'refresh-plan'
    error.value = null

    try {
      const refreshedRun = await $fetch<RefreshRunResponse>(`/api/recommendations/runs/${encodeURIComponent(latestReviewRunId)}/refresh`, {
        method: 'POST',
      })
      await fetchSummary()
      await goToRecommendations(refreshedRun.runId)
    }
    catch (refreshError) {
      error.value = toErrorMessage(refreshError)
    }
    finally {
      activeActionKey.value = null
    }
  }

  async function executeAction(actionKey: WorkspaceSummaryActionKey) {
    switch (actionKey) {
      case 'start-intake':
      case 'resume-intake':
        await goToIntake('resume')
        return
      case 'review-latest-run':
        await goToRecommendations(resolveReviewRunId(summary.value))
        return
      case 'compare-latest-runs':
        await goToComparison()
        return
      case 'open-history':
        await goToHistory()
        return
      case 'start-new-cycle':
        await goToIntake('new-cycle')
        return
      case 'refresh-plan':
        await refreshPlanFromLatestRun()
        return
    }
  }

  return {
    summary,
    isLoading,
    error,
    activeActionKey,
    primaryAction,
    secondaryActions,
    fetchSummary,
    executeAction,
    goToIntake,
    goToRecommendations,
    goToHistory,
    goToComparison,
    refreshPlanFromLatestRun,
  }
}
