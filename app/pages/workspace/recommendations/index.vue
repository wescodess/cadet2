<script setup lang="ts">
import { History, Sparkles } from 'lucide-vue-next'

import RecommendationResultsPanel from '~/components/workspace/RecommendationResultsPanel.vue'
import RecommendationRunList from '~/components/workspace/RecommendationRunList.vue'
import RecommendationStatusBanner from '~/components/workspace/RecommendationStatusBanner.vue'
import { useWorkspaceRecommendationReview } from '~/composables/useWorkspaceRecommendationReview'

const route = useRoute()
const router = useRouter()
const {
  activeRunStatus,
  isLoadingResults,
  isLoadingRunStatus,
  isLoadingRuns,
  loadActiveRunStatus,
  loadRecommendationRuns,
  recommendationResults,
  recommendationResultsMessage,
  recommendationRuns,
  runListErrorMessage,
  runStatusErrorMessage,
} = useWorkspaceRecommendationReview()

const targetRunId = computed(() => {
  return typeof route.query.runId === 'string' ? route.query.runId.trim() : ''
})

const submissionFeedbackMessage = computed(() => {
  if (route.query.submitted !== '1') {
    return ''
  }

  const runId = targetRunId.value
  const status = typeof route.query.status === 'string' ? route.query.status.trim() : ''
  const refreshedFromRunId = typeof route.query.refreshedFromRunId === 'string'
    ? route.query.refreshedFromRunId.trim()
    : ''

  if (!runId || !status) {
    return 'Your profile was submitted for recommendation processing. Next state is now visible in your workspace.'
  }

  return `Your profile was submitted for recommendation processing. Next state: run ${runId} is ${status} in your workspace.${refreshedFromRunId ? ` This planning cycle stays linked to ${refreshedFromRunId}.` : ''}`
})

async function selectRun(runId: string) {
  if (!runId || runId === targetRunId.value) {
    return
  }

  await router.replace({
    query: {
      ...route.query,
      runId,
    },
  })
}

onMounted(async () => {
  await loadRecommendationRuns(targetRunId.value || undefined)
})

watch(targetRunId, async (nextRunId, previousRunId) => {
  if (nextRunId === previousRunId) {
    return
  }

  await loadActiveRunStatus(nextRunId || undefined)
})
</script>

<template>
  <section class="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <div class="flex size-11 items-center justify-center rounded-2xl bg-[var(--trust-soft,#dbeafe)] text-[var(--trust,#2563eb)]">
              <Sparkles class="size-5" />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Recommendation review
              </p>
              <h2 class="text-2xl font-semibold text-slate-950">
                Current recommendations
              </h2>
            </div>
          </div>
          <p class="max-w-3xl text-sm leading-relaxed text-slate-600">
            Review the latest recommendation run in the same workspace surface used for archived run playback.
          </p>
        </div>

        <Button
          as-child
          variant="outline"
          class="min-h-[44px] rounded-xl border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
        >
          <NuxtLink to="/workspace/history">
            <History class="size-4" />
            Open archive
          </NuxtLink>
        </Button>
      </div>
    </div>

    <div
      v-if="submissionFeedbackMessage"
      data-testid="intake-submit-feedback"
      class="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
      role="status"
      aria-live="polite"
    >
      {{ submissionFeedbackMessage }}
    </div>

    <div
      v-if="runListErrorMessage"
      class="rounded-3xl border border-[var(--destructive,#ef4444)]/20 bg-[var(--destructive-soft,#fef2f2)] p-6 text-sm text-rose-900"
    >
      {{ runListErrorMessage }}
    </div>

    <section
      v-else-if="recommendationRuns.length === 0"
      class="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm"
    >
      <div class="mx-auto flex max-w-xl flex-col items-center gap-4">
        <div class="flex size-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Sparkles class="size-7" />
        </div>
        <div class="space-y-2">
          <h3 class="text-xl font-semibold text-slate-950">
            Start your first intake
          </h3>
          <p class="text-sm leading-relaxed text-slate-600">
            Recommendation review becomes available after your first run is submitted and processed.
          </p>
        </div>
        <Button
          as-child
          class="min-h-[44px] rounded-xl bg-[var(--trust,#2563eb)] px-5 text-white hover:bg-[var(--trust,#2563eb)]/90"
        >
          <NuxtLink to="/workspace/intake">
            Start guided intake
          </NuxtLink>
        </Button>
      </div>
    </section>

    <template v-else>
      <RecommendationRunList
        :runs="recommendationRuns"
        :is-loading="isLoadingRuns"
        :active-run-id="activeRunStatus?.runId || targetRunId || recommendationRuns[0]?.runId || null"
        @select-run="selectRun"
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
    </template>
  </section>
</template>
