import type { ComparisonResult, PathwayChange } from '~~/shared/types/recommendation-run-comparison'
import type { RunComparisonCategory } from '~/lib/workspace/recommendation-run-comparison'

import { groupRunComparisonPathways } from '~/lib/workspace/recommendation-run-comparison'

function toRunComparisonErrorMessage() {
  return 'We could not compare those preserved runs right now.'
}

export function useRunComparison() {
  const comparison = ref<ComparisonResult | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const activeCategory = ref<RunComparisonCategory>('all')

  const groupedPathways = computed(() => groupRunComparisonPathways(comparison.value?.pathwayChanges || []))
  const filteredPathwayChanges = computed<PathwayChange[]>(() => groupedPathways.value[activeCategory.value] || [])
  const isAvailable = computed(() => comparison.value?.comparisonAvailable ?? false)
  const unavailableReason = computed(() => comparison.value?.unavailableReason || null)

  async function fetchComparison(runAId: string, runBId: string) {
    if (!runAId || !runBId) {
      comparison.value = null
      error.value = 'Two preserved runs are required before comparison can load.'
      isLoading.value = false
      return
    }

    isLoading.value = true
    error.value = null

    try {
      comparison.value = await $fetch<ComparisonResult>('/api/workspace/runs/compare', {
        query: {
          runA: runAId,
          runB: runBId,
        },
      })
    }
    catch {
      comparison.value = null
      error.value = toRunComparisonErrorMessage()
    }
    finally {
      isLoading.value = false
    }
  }

  function setActiveCategory(category: RunComparisonCategory) {
    activeCategory.value = category
  }

  return {
    comparison,
    isLoading,
    error,
    activeCategory,
    filteredPathwayChanges,
    groupedPathways,
    isAvailable,
    unavailableReason,
    fetchComparison,
    setActiveCategory,
  }
}
