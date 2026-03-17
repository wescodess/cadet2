<script setup lang="ts">
import type { RecommendationResultsRecord } from '~/lib/recommendations/comparison'

import { ArrowLeft, Sparkles } from 'lucide-vue-next'

import PathwayDetailPanel from '~/components/recommendations/PathwayDetailPanel.vue'
import {
  findRecommendationCandidate,
  isRecommendationCandidateType,
  normalizePathwayLabel,
} from '~/lib/recommendations/comparison'
import { getRecommendationStatusLabel, getRecommendationStatusTone } from '~/lib/recommendation-lifecycle'

const route = useRoute()

const runId = computed(() => typeof route.params.runId === 'string' ? route.params.runId.trim() : '')
const pathwayId = computed(() => typeof route.params.pathwayId === 'string' ? route.params.pathwayId.trim() : '')
const historyFilter = computed(() => typeof route.query.historyFilter === 'string' ? route.query.historyFilter.trim() : '')
const candidateType = computed(() => {
  const value = typeof route.query.type === 'string' ? route.query.type.trim() : ''
  return isRecommendationCandidateType(value) ? value : null
})

const resultsRecord = ref<RecommendationResultsRecord | null>(null)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const candidate = computed(() => findRecommendationCandidate({
  record: resultsRecord.value,
  pathwayId: pathwayId.value,
  type: candidateType.value,
}))

const backPath = computed(() => {
  if (historyFilter.value) {
    return `/workspace/recommendations/${encodeURIComponent(runId.value)}?historyFilter=${encodeURIComponent(historyFilter.value)}`
  }

  return `/workspace/recommendations?runId=${encodeURIComponent(runId.value)}`
})

async function loadPathwayDetail() {
  if (!runId.value || !pathwayId.value) {
    errorMessage.value = 'Invalid pathway detail route.'
    isLoading.value = false
    return
  }

  isLoading.value = true
  errorMessage.value = null

  try {
    resultsRecord.value = await $fetch<RecommendationResultsRecord>(
      `/api/recommendations/runs/${encodeURIComponent(runId.value)}/results`,
    )

    if (!candidate.value) {
      errorMessage.value = 'We could not find that pathway in this recommendation run.'
    }
  }
  catch (error) {
    resultsRecord.value = null

    const statusCode = error && typeof error === 'object'
      ? ((error as { statusCode?: number, data?: { statusCode?: number } }).statusCode
          || (error as { statusCode?: number, data?: { statusCode?: number } }).data?.statusCode
          || 0)
      : 0

    if (statusCode === 409) {
      errorMessage.value = 'This pathway is not available yet because recommendation ranking is still in progress for the run.'
    }
    else if (statusCode === 404) {
      errorMessage.value = 'We could not find that recommendation run.'
    }
    else {
      errorMessage.value = 'We could not load pathway details right now.'
    }
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await loadPathwayDetail()
})

watch([runId, pathwayId, candidateType], async ([nextRunId, nextPathwayId, nextType], [previousRunId, previousPathwayId, previousType]) => {
  if (nextRunId === previousRunId && nextPathwayId === previousPathwayId && nextType === previousType) {
    return
  }

  await loadPathwayDetail()
})
</script>

<template>
  <section class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
    <div class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <NuxtLink
        :to="backPath"
        class="mb-4 inline-flex min-h-[44px] w-fit items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--trust,#2563eb)] transition-colors hover:bg-[var(--trust-soft,#dbeafe)] hover:text-[var(--trust,#2563eb)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--trust,#2563eb)]/30"
      >
        <ArrowLeft class="size-4" />
        Back to recommendations
      </NuxtLink>

      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <div class="flex size-11 items-center justify-center rounded-2xl bg-[var(--trust-soft,#dbeafe)] text-[var(--trust,#2563eb)]">
              <Sparkles class="size-5" />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Pathway detail
              </p>
              <h1 class="text-2xl font-semibold text-slate-950">
                {{ normalizePathwayLabel(pathwayId) }}
              </h1>
            </div>
          </div>
          <p class="max-w-3xl text-sm leading-relaxed text-slate-600">
            Review the full evidence, blockers, tradeoffs, next-step plan, and citation context for this recommendation pathway.
          </p>
        </div>

        <span
          v-if="resultsRecord"
          class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
          :class="getRecommendationStatusTone(resultsRecord.status)"
        >
          {{ getRecommendationStatusLabel(resultsRecord.status) }}
        </span>
      </div>
    </div>

    <div
      v-if="isLoading"
      class="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600"
    >
      Loading pathway details...
    </div>

    <div
      v-else-if="errorMessage"
      class="rounded-3xl border border-[var(--destructive,#ef4444)]/20 bg-[var(--destructive-soft,#fef2f2)] p-6 text-sm text-rose-900"
    >
      {{ errorMessage }}
    </div>

    <PathwayDetailPanel
      v-else-if="candidate"
      :candidate="candidate"
    />
  </section>
</template>
