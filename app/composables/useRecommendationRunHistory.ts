import type {
  RecommendationRunHistoryFilter,
  RecommendationRunHistoryStatus,
  RecommendationRunSummary,
} from '~/lib/workspace/recommendation-run-history'

function toRunHistoryErrorMessage() {
  return 'We could not load your archived recommendation runs right now.'
}

export function useRecommendationRunHistory() {
  const runs = ref<RecommendationRunSummary[]>([])
  const allRuns = ref<RecommendationRunSummary[]>([])
  const hasLoaded = ref(false)
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const activeFilter = ref<RecommendationRunHistoryFilter>('all')
  const totalRunCount = computed(() => {
    if (allRuns.value.length > 0) {
      return allRuns.value.length
    }

    return runs.value.length
  })

  const filteredRuns = computed(() => {
    if (activeFilter.value === 'all') {
      return runs.value
    }

    return runs.value.filter(run => run.status === activeFilter.value)
  })

  const latestRun = computed(() => runs.value.find(run => run.isLatest) || null)

  async function fetchRuns(filter: RecommendationRunHistoryFilter = activeFilter.value) {
    isLoading.value = true
    error.value = null

    try {
      const query = filter === 'all'
        ? undefined
        : { status: filter }
      const response = await $fetch<{ runs: RecommendationRunSummary[] }>('/api/workspace/runs', {
        query,
      })

      runs.value = response.runs
      if (filter === 'all') {
        allRuns.value = response.runs
      }
    }
    catch {
      runs.value = []
      error.value = toRunHistoryErrorMessage()
    }
    finally {
      hasLoaded.value = true
      isLoading.value = false
    }
  }

  async function setFilter(status: RecommendationRunHistoryStatus | 'all') {
    activeFilter.value = status

    if (allRuns.value.length > 0) {
      runs.value = status === 'all'
        ? allRuns.value
        : allRuns.value.filter(run => run.status === status)
    }

    await fetchRuns(status)
  }

  async function navigateToRun(
    runId: string,
    historyFilter: RecommendationRunHistoryFilter = activeFilter.value,
  ) {
    const query = historyFilter !== 'all'
      ? `?historyFilter=${encodeURIComponent(historyFilter)}`
      : ''
    const targetPath = `/workspace/recommendations/${encodeURIComponent(runId)}${query}`

    if (import.meta.client) {
      window.location.assign(targetPath)
      return
    }

    await navigateTo(targetPath)
  }

  async function navigateToComparison(runAId: string, runBId: string) {
    const targetPath = `/workspace/compare?runA=${encodeURIComponent(runAId)}&runB=${encodeURIComponent(runBId)}`

    if (import.meta.client) {
      window.location.assign(targetPath)
      return
    }

    await navigateTo(targetPath)
  }

  async function navigateToComparisonWithContext(
    runAId: string,
    runBId: string,
    historyFilter: RecommendationRunHistoryFilter = activeFilter.value,
  ) {
    const query = historyFilter !== 'all'
      ? `&historyFilter=${encodeURIComponent(historyFilter)}`
      : ''
    const targetPath = `/workspace/compare?runA=${encodeURIComponent(runAId)}&runB=${encodeURIComponent(runBId)}${query}`

    if (import.meta.client) {
      window.location.assign(targetPath)
      return
    }

    await navigateTo(targetPath)
  }

  return {
    runs,
    hasLoaded,
    isLoading,
    error,
    activeFilter,
    totalRunCount,
    filteredRuns,
    latestRun,
    fetchRuns,
    setFilter,
    navigateToRun,
    navigateToComparison,
    navigateToComparisonWithContext,
  }
}
