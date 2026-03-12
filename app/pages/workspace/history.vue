<script setup lang="ts">
import { ArchiveX, History } from 'lucide-vue-next'

import RecommendationRunCard from '~/components/workspace/RecommendationRunCard.vue'
import RunHistoryFilterBar from '~/components/workspace/RunHistoryFilterBar.vue'
import { isRecommendationRunHistoryStatus } from '~/lib/workspace/recommendation-run-history'
import { useRecommendationRunHistory } from '~/composables/useRecommendationRunHistory'

const route = useRoute()
const router = useRouter()

const {
  filteredRuns,
  hasLoaded,
  isLoading,
  error,
  activeFilter,
  totalRunCount,
  latestRun,
  navigateToComparisonWithContext,
  navigateToRun,
  setFilter,
} = useRecommendationRunHistory()

const hasAnyRuns = computed(() => totalRunCount.value > 0)
const isFilterEmptyState = computed(() => hasLoaded.value && hasAnyRuns.value && filteredRuns.value.length === 0)
const filterLabel = computed(() => {
  if (activeFilter.value === 'all') {
    return 'all statuses'
  }

  return activeFilter.value
})

const initialFilter = computed(() => {
  const value = typeof route.query.filter === 'string' ? route.query.filter.trim() : ''
  return isRecommendationRunHistoryStatus(value) ? value : 'all'
})

async function applyFilter(status: 'all' | 'completed' | 'degraded' | 'failed') {
  await setFilter(status)

  const nextQuery = status === 'all'
    ? { ...route.query, filter: undefined }
    : { ...route.query, filter: status }
  await router.replace({ query: nextQuery })
}

async function handleCompareRuns(runAId: string, runBId: string) {
  await navigateToComparisonWithContext(runAId, runBId, activeFilter.value)
}

onMounted(async () => {
  await setFilter(initialFilter.value)
})

watch(initialFilter, async (nextFilter, previousFilter) => {
  if (nextFilter === previousFilter || nextFilter === activeFilter.value) {
    return
  }

  await setFilter(nextFilter)
})
</script>

<template>
  <section class="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <div class="flex size-11 items-center justify-center rounded-2xl bg-[var(--trust-soft,#dbeafe)] text-[var(--trust,#2563eb)]">
              <History class="size-5" />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Workspace continuity
              </p>
              <h2 class="text-2xl font-semibold text-slate-950">
                Run Archive
              </h2>
            </div>
          </div>
          <p class="max-w-3xl text-sm leading-relaxed text-slate-600">
            Revisit preserved recommendation outputs, filter by run status, and reopen the exact review context attached to each archived profile snapshot.
          </p>
        </div>

        <p
          data-testid="recommendation-history-count"
          class="text-sm font-medium text-slate-600"
        >
          {{ totalRunCount }} archived run{{ totalRunCount === 1 ? '' : 's' }}
        </p>
      </div>
    </div>

    <RunHistoryFilterBar
      :active-filter="activeFilter"
      @filter-change="applyFilter"
    />

    <div
      v-if="isLoading"
      class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <Skeleton
        v-for="index in 6"
        :key="index"
        class="h-64 rounded-3xl"
      />
    </div>

    <div
      v-else-if="error"
      class="rounded-3xl border border-[var(--destructive,#ef4444)]/20 bg-[var(--destructive-soft,#fef2f2)] p-6 text-sm text-rose-900"
    >
      {{ error }}
    </div>

    <section
      v-else-if="filteredRuns.length > 0"
      data-testid="recommendation-history-list"
      class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <RecommendationRunCard
        v-for="run in filteredRuns"
        :key="run.id"
        :run="run"
        :is-latest="run.isLatest"
        :comparison-target-run-id="latestRun?.id || null"
        @compare-runs="handleCompareRuns"
        @view-results="navigateToRun"
      />
    </section>

    <section
      v-else-if="!hasAnyRuns"
      data-testid="recommendation-history-empty-state"
      class="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm"
    >
      <div class="mx-auto flex max-w-xl flex-col items-center gap-4">
        <div class="flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <ArchiveX class="size-7" />
        </div>
        <div class="space-y-2">
          <h3 class="text-xl font-semibold text-slate-950">
            Start your first intake
          </h3>
          <p class="text-sm leading-relaxed text-slate-600">
            The archive fills in after recommendation runs complete. Begin a guided intake to create your first preserved recommendation record.
          </p>
        </div>
        <Button
          as-child
          class="min-h-[44px] rounded-xl bg-[var(--trust,#2563eb)] px-5 text-white hover:bg-[var(--trust,#2563eb)]/90"
        >
          <NuxtLink to="/workspace/intake">
            Start your first intake
          </NuxtLink>
        </Button>
      </div>
    </section>

    <section
      v-else-if="isFilterEmptyState"
      class="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm"
    >
      <div class="mx-auto flex max-w-xl flex-col items-center gap-4">
        <div class="space-y-2">
          <h3 class="text-xl font-semibold text-slate-950">
            No archived runs match {{ filterLabel }}
          </h3>
          <p class="text-sm leading-relaxed text-slate-600">
            Try a different status chip to review preserved runs from another recommendation outcome.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          class="min-h-[44px] rounded-xl border-slate-300 bg-white px-5 text-slate-900 hover:bg-slate-100"
          @click="applyFilter('all')"
        >
          Show all runs
        </Button>
      </div>
    </section>
  </section>
</template>
