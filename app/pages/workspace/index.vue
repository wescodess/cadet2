<script setup lang="ts">
import { useDisplayName } from '~/composables/useDisplayName'
import PlanningProgressTimeline from '~/components/workspace/PlanningProgressTimeline.vue'
import PlanningWorkspaceActionPanel from '~/components/workspace/PlanningWorkspaceActionPanel.vue'
import PlanningWorkspaceHero from '~/components/workspace/PlanningWorkspaceHero.vue'
import RecommendationStatusBanner from '~/components/workspace/RecommendationStatusBanner.vue'
import RecommendationResultsPanel from '~/components/workspace/RecommendationResultsPanel.vue'
import { useWorkspaceContinuity } from '~/composables/useWorkspaceContinuity'
import { useWorkspaceRecommendationReview } from '~/composables/useWorkspaceRecommendationReview'

const { firstName } = useDisplayName()
const {
  summary,
  isLoading: isLoadingSummary,
  error: continuityError,
  activeActionKey,
  primaryAction,
  secondaryActions,
  fetchSummary,
  executeAction,
} = useWorkspaceContinuity()
const {
  recommendationRuns,
  activeRunStatus,
  isLoadingRunStatus,
  runStatusErrorMessage,
  recommendationResults,
  isLoadingResults,
  recommendationResultsMessage,
  loadRecommendationRuns,
} = useWorkspaceRecommendationReview()

onMounted(async () => {
  await Promise.all([
    fetchSummary(),
    loadRecommendationRuns(),
  ])
})
</script>

<template>
  <section
    data-testid="workspace-dashboard"
    class="flex w-full flex-1 flex-col gap-6 py-6 md:py-10"
  >
    <div
      data-testid="planning-workspace-hub"
      class="grid gap-6 xl:grid-cols-[1.55fr_1fr]"
    >
      <div class="space-y-6">
        <PlanningWorkspaceHero
          :first-name="firstName"
          :summary="summary"
          :primary-action="primaryAction"
          @action="executeAction"
        />

        <div
          v-if="continuityError"
          class="rounded-3xl border border-[var(--destructive,#ef4444)]/20 bg-[var(--destructive-soft,#fef2f2)] p-6 text-sm text-rose-900"
        >
          {{ continuityError }}
        </div>

        <PlanningProgressTimeline :summary="summary" />
      </div>

      <PlanningWorkspaceActionPanel
        :summary="summary"
        :actions="secondaryActions"
        :active-action-key="activeActionKey"
        @action="executeAction"
      />
    </div>

    <div class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <RecommendationStatusBanner
        :status-record="activeRunStatus"
        :is-loading="isLoadingRunStatus || isLoadingSummary"
        :error-message="runStatusErrorMessage"
      />

      <RecommendationResultsPanel
        :status-record="activeRunStatus"
        :results-record="recommendationResults"
        :is-loading="isLoadingResults"
        :message="recommendationResultsMessage"
      />
    </div>

    <div
      v-if="!isLoadingSummary && summary"
      class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Continuity snapshot
          </p>
          <h3 class="text-xl font-semibold text-slate-950">
            Return context stays attached to your workspace
          </h3>
          <p class="max-w-3xl text-sm leading-relaxed text-slate-600">
            {{ summary.latestRun?.profileSnapshotSummary || 'Your next planning cycle will appear here after you save intake progress or generate a run.' }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            class="rounded-full border-slate-300 bg-slate-50 px-4 py-2 text-slate-700"
          >
            {{ summary.archive.availableRuns }} reviewable run{{ summary.archive.availableRuns === 1 ? '' : 's' }}
          </Badge>
          <Badge
            variant="outline"
            class="rounded-full border-slate-300 bg-slate-50 px-4 py-2 text-slate-700"
          >
            {{ recommendationRuns.length }} current run{{ recommendationRuns.length === 1 ? '' : 's' }}
          </Badge>
        </div>
      </div>
    </div>
  </section>
</template>
