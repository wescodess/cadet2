<script setup lang="ts">
import { Activity, AlertCircle, CheckCircle2, CircleDashed, LoaderCircle } from 'lucide-vue-next'

import {
  getRecommendationStatusLabel,
  getRecommendationStatusTone,
  isCanonicalRecommendationStatus,
  isInProgressStatus,
  type RecommendationLifecycleStatus,
} from '~/lib/recommendation-lifecycle'

type RecommendationStatusBannerRecord = {
  runId: string
  status: string
  statusMessage: string
  resumable: boolean
  updatedAt: string
}

const props = withDefaults(defineProps<{
  statusRecord: RecommendationStatusBannerRecord | null
  isLoading?: boolean
  errorMessage?: string | null
}>(), {
  isLoading: false,
  errorMessage: null,
})

const stateIconMap: Record<RecommendationLifecycleStatus, typeof Activity> = {
  queued: CircleDashed,
  evaluating: LoaderCircle,
  completed: CheckCircle2,
  degraded: AlertCircle,
  failed: AlertCircle,
}

function formatTimestamp(value: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown update time'
  }

  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const normalizedStatus = computed<RecommendationLifecycleStatus | null>(() => {
  const statusValue = props.statusRecord?.status || ''
  return isCanonicalRecommendationStatus(statusValue) ? statusValue : null
})

const statusLabel = computed(() => getRecommendationStatusLabel(props.statusRecord?.status || 'queued'))
const statusToneClass = computed(() => getRecommendationStatusTone(props.statusRecord?.status || 'queued'))

const statusIcon = computed(() => {
  if (!normalizedStatus.value) {
    return Activity
  }

  return stateIconMap[normalizedStatus.value]
})

const isInProgress = computed(() => normalizedStatus.value ? isInProgressStatus(normalizedStatus.value) : false)
</script>

<template>
  <section
    data-testid="recommendation-status-banner"
    class="w-full rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
    aria-live="polite"
  >
    <div class="mb-3 flex items-start justify-between gap-3">
      <div>
        <h3 class="text-lg font-semibold text-slate-900">
          Recommendation processing status
        </h3>
        <p class="mt-1 text-sm text-slate-500">
          This state is tied to your latest run and remains private to your workspace.
        </p>
      </div>
      <span
        v-if="props.statusRecord"
        class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
        :class="statusToneClass"
      >
        {{ statusLabel }}
      </span>
      <span
        v-else
        class="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
      >
        Not started
      </span>
    </div>

    <div
      v-if="props.isLoading"
      class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
    >
      Loading recommendation status...
    </div>

    <div
      v-else-if="props.errorMessage"
      class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
    >
      {{ props.errorMessage }}
    </div>

    <div
      v-else-if="props.statusRecord"
      class="rounded-lg border border-slate-200 bg-slate-50/80 p-4"
    >
      <div class="flex items-start gap-3">
        <component :is="statusIcon" class="mt-0.5 size-5 text-slate-700" />
        <div class="space-y-1">
          <p class="text-sm font-semibold text-slate-900">
            {{ props.statusRecord.statusMessage }}
          </p>
          <p class="text-xs text-slate-600">
            Run {{ props.statusRecord.runId }} · Updated {{ formatTimestamp(props.statusRecord.updatedAt) }}
          </p>
          <p
            v-if="isInProgress && props.statusRecord.resumable"
            class="text-xs font-medium text-slate-700"
          >
            Processing remains active and resumable.
          </p>
        </div>
      </div>
    </div>

    <div
      v-else
      class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600"
    >
      Submit intake to start recommendation processing and see live lifecycle updates here.
    </div>
  </section>
</template>
