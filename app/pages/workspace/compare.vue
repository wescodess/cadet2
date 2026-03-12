<script setup lang="ts">
import { ArrowLeft, GitCompareArrows } from 'lucide-vue-next'

import CaveatChangesPanel from '~/components/workspace/CaveatChangesPanel.vue'
import ComparisonStatCard from '~/components/workspace/ComparisonStatCard.vue'
import PathwayChangeCard from '~/components/workspace/PathwayChangeCard.vue'
import ProfileDeltaPanel from '~/components/workspace/ProfileDeltaPanel.vue'
import TrustEvidencePanel from '~/components/workspace/TrustEvidencePanel.vue'
import {
  formatComparisonRunDate,
  formatSignedNumber,
  getRunComparisonCategoryLabel,
  getRunComparisonTrend,
  runComparisonCategories,
} from '~/lib/workspace/recommendation-run-comparison'
import { useRunComparison } from '~/composables/useRunComparison'

const route = useRoute()

const runAId = computed(() => typeof route.query.runA === 'string' ? route.query.runA.trim() : '')
const runBId = computed(() => typeof route.query.runB === 'string' ? route.query.runB.trim() : '')
const historyFilter = computed(() => typeof route.query.historyFilter === 'string' ? route.query.historyFilter.trim() : '')

const {
  comparison,
  isLoading,
  error,
  activeCategory,
  filteredPathwayChanges,
  isAvailable,
  unavailableReason,
  fetchComparison,
  setActiveCategory,
} = useRunComparison()

const runPills = computed(() => {
  if (!comparison.value) {
    return []
  }

  return [
    {
      label: 'Earlier run',
      runId: comparison.value.runs.baseline.id,
      createdAt: formatComparisonRunDate(comparison.value.runs.baseline.createdAt),
    },
    {
      label: 'Later run',
      runId: comparison.value.runs.current.id,
      createdAt: formatComparisonRunDate(comparison.value.runs.current.createdAt),
    },
  ]
})

const confidenceValue = computed(() => {
  if (!comparison.value) {
    return '0'
  }

  return formatSignedNumber(comparison.value.summary.overallConfidenceChange)
})

const confidenceTrendLabel = computed(() => {
  if (!comparison.value) {
    return 'No confidence shift'
  }

  const delta = comparison.value.summary.overallConfidenceChange
  if (delta > 0) {
    return 'Confidence improved overall'
  }

  if (delta < 0) {
    return 'Confidence softened overall'
  }

  return 'Confidence stayed level'
})

const historyBackLink = computed(() => (
  historyFilter.value
    ? `/workspace/history?filter=${encodeURIComponent(historyFilter.value)}`
    : '/workspace/history'
))

async function loadComparison() {
  await fetchComparison(runAId.value, runBId.value)
}

onMounted(loadComparison)

watch([runAId, runBId], async ([nextRunA, nextRunB], [previousRunA, previousRunB]) => {
  if (!nextRunA || !nextRunB || (nextRunA === previousRunA && nextRunB === previousRunB)) {
    return
  }

  await loadComparison()
})
</script>

<template>
  <section
    data-testid="run-comparison-dashboard"
    class="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
  >
    <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <NuxtLink
        :to="historyBackLink"
        class="mb-4 inline-flex min-h-[44px] w-fit items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--trust,#2563eb)] transition-colors hover:bg-[var(--trust-soft,#dbeafe)] hover:text-[var(--trust,#2563eb)]"
      >
        <ArrowLeft class="size-4" />
        Back to archive
      </NuxtLink>

      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="flex size-11 items-center justify-center rounded-2xl bg-[var(--trust-soft,#dbeafe)] text-[var(--trust,#2563eb)]">
              <GitCompareArrows class="size-5" />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Workspace continuity
              </p>
              <h2 class="text-2xl font-semibold text-slate-950">
                Run Comparison
              </h2>
            </div>
          </div>
          <p class="max-w-3xl text-sm leading-relaxed text-slate-600">
            Review what changed between two preserved recommendation runs without losing trust, caveat, or profile-update context.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <Badge
            v-for="pill in runPills"
            :key="pill.runId"
            variant="outline"
            class="rounded-full border-slate-300 bg-slate-50 px-4 py-2 text-slate-700"
          >
            {{ pill.label }} · {{ pill.createdAt }}
          </Badge>
        </div>
      </div>
    </div>

    <NuxtErrorBoundary>
      <template #default>
        <div
          v-if="isLoading"
          class="space-y-6"
        >
          <div class="grid gap-4 lg:grid-cols-3">
            <Skeleton
              v-for="index in 3"
              :key="index"
              class="h-36 rounded-3xl"
            />
          </div>
          <Skeleton class="h-14 rounded-full" />
          <Skeleton class="h-56 rounded-3xl" />
          <Skeleton class="h-72 rounded-3xl" />
        </div>

        <div
          v-else-if="error"
          class="rounded-3xl border border-[var(--destructive,#ef4444)]/20 bg-[var(--destructive-soft,#fef2f2)] p-6 text-sm text-rose-900"
        >
          {{ error }}
        </div>

        <div
          v-else-if="!comparison"
          class="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-700"
        >
          Choose two preserved runs before loading a comparison.
        </div>

        <div
          v-else-if="!isAvailable"
          class="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div class="space-y-2">
            <h3 class="text-xl font-semibold text-slate-950">
              Comparison unavailable
            </h3>
            <p class="text-sm leading-relaxed text-slate-600">
              {{ unavailableReason || 'This run pair could not be compared without risking a misleading diff.' }}
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <Button as-child variant="outline" class="min-h-[44px] rounded-xl border-slate-300 bg-white text-slate-900 hover:bg-slate-100">
              <NuxtLink :to="`/workspace/recommendations/${encodeURIComponent(runAId)}`">
                Open first run
              </NuxtLink>
            </Button>
            <Button as-child variant="outline" class="min-h-[44px] rounded-xl border-slate-300 bg-white text-slate-900 hover:bg-slate-100">
              <NuxtLink :to="`/workspace/recommendations/${encodeURIComponent(runBId)}`">
                Open second run
              </NuxtLink>
            </Button>
            <Button as-child class="min-h-[44px] rounded-xl bg-[var(--trust,#2563eb)] text-white hover:bg-[var(--trust,#2563eb)]/90">
              <NuxtLink :to="historyBackLink">
                Return to archive
              </NuxtLink>
            </Button>
          </div>
        </div>

        <div
          v-else
          class="space-y-6"
        >
          <div class="grid gap-4 lg:grid-cols-3">
            <ComparisonStatCard
              label="Pathways Changed"
              :value="comparison.summary.changed"
              :trend="comparison.summary.changed > 0 ? 'up' : 'neutral'"
              :trend-label="`${comparison.summary.added} added · ${comparison.summary.removed} removed`"
            />
            <ComparisonStatCard
              label="Overall Confidence"
              :value="confidenceValue"
              :trend="getRunComparisonTrend(comparison.summary.overallConfidenceChange)"
              :trend-label="confidenceTrendLabel"
            />
            <ComparisonStatCard
              label="New Evidence"
              :value="comparison.summary.newEvidenceCount"
              :trend="comparison.summary.newEvidenceCount > 0 ? 'up' : 'neutral'"
              :trend-label="comparison.summary.newEvidenceCount > 0 ? 'More source-backed detail surfaced' : 'No new evidence references surfaced'"
            />
          </div>

          <section class="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="space-y-1">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Pathway changes
              </p>
              <h3 class="text-xl font-semibold text-slate-950">
                Compare pathway movement across runs
              </h3>
            </div>

            <div class="flex gap-2 overflow-x-auto pb-1">
              <Button
                v-for="category in runComparisonCategories"
                :key="category"
                type="button"
                :variant="activeCategory === category ? 'default' : 'outline'"
                class="min-h-[44px] shrink-0 rounded-full px-4"
                :class="activeCategory === category ? 'bg-[var(--trust,#2563eb)] text-white hover:bg-[var(--trust,#2563eb)]/90' : 'border-slate-200 bg-white text-slate-700'"
                @click="setActiveCategory(category)"
              >
                {{ getRunComparisonCategoryLabel(category) }}
              </Button>
            </div>

            <div
              v-if="filteredPathwayChanges.length === 0"
              class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
            >
              No pathway changes match this filter.
            </div>

            <div v-else class="space-y-4">
              <PathwayChangeCard
                v-for="change in filteredPathwayChanges"
                :key="change.pathwayId"
                :change="change"
              />
            </div>
          </section>

          <section class="grid gap-4 xl:grid-cols-2">
            <ProfileDeltaPanel :profile-delta="comparison.profileDelta" />
            <TrustEvidencePanel :trust-changes="comparison.trustChanges" />
          </section>

          <section class="grid gap-4 xl:grid-cols-2">
            <CaveatChangesPanel
              :added-caveats="comparison.caveatChanges.added"
              :removed-caveats="comparison.caveatChanges.removed"
            />
          </section>
        </div>
      </template>

      <template #error="{ error: boundaryError }">
        <div class="rounded-3xl border border-[var(--destructive,#ef4444)]/20 bg-[var(--destructive-soft,#fef2f2)] p-6 text-sm text-rose-900">
          {{ boundaryError.message || 'The comparison surface could not be rendered safely.' }}
        </div>
      </template>
    </NuxtErrorBoundary>
  </section>
</template>
