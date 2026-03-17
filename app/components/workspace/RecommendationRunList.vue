<script setup lang="ts">
import {
  getRecommendationStatusLabel,
  getRecommendationStatusTone,
} from '~/lib/recommendation-lifecycle'

type RecommendationRunListItem = {
  runId: string
  profileSnapshotId: string
  status: string
  createdAt: string
  updatedAt: string
}

const props = withDefaults(defineProps<{
  runs: RecommendationRunListItem[]
  isLoading?: boolean
  errorMessage?: string | null
  activeRunId?: string | null
}>(), {
  isLoading: false,
  errorMessage: null,
  activeRunId: null,
})

const emit = defineEmits<{
  'select-run': [runId: string]
}>()

function formatTimestamp(value: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date'
  }

  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function shortRunId(runId: string) {
  return runId.length > 18 ? `${runId.slice(0, 18)}...` : runId
}

function isActiveRun(runId: string) {
  return props.activeRunId === runId
}
</script>

<template>
  <section
    data-testid="workspace-run-list"
    class="w-full rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
    aria-live="polite"
  >
    <div class="mb-4 flex flex-col gap-1">
      <h3 class="text-lg font-semibold text-slate-900">
        Recommendation run continuity
      </h3>
      <p class="text-sm text-slate-500">
        Only you can view these runs in your account workspace.
      </p>
    </div>

    <div
      v-if="props.isLoading"
      class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
    >
      Loading your recommendation runs...
    </div>

    <div
      v-else-if="props.errorMessage"
      class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
    >
      {{ props.errorMessage }}
    </div>

    <ul
      v-else-if="props.runs.length > 0"
      class="space-y-3"
    >
      <li
        v-for="run in props.runs"
        :key="run.runId"
        data-testid="workspace-run-item"
        class="rounded-xl border"
        :class="isActiveRun(run.runId) ? 'border-[var(--trust,#2563eb)]/35 bg-[var(--trust-soft,#dbeafe)]/60' : 'border-slate-200 bg-slate-50/70'"
      >
        <button
          type="button"
          class="flex min-h-[44px] w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
          :aria-pressed="isActiveRun(run.runId)"
          @click="emit('select-run', run.runId)"
        >
          <div>
            <p class="text-sm font-semibold text-slate-900">
              {{ shortRunId(run.runId) }}
            </p>
            <p class="text-xs text-slate-500">
              Submitted {{ formatTimestamp(run.createdAt) }}
            </p>
            <p class="mt-1 text-xs font-medium" :class="isActiveRun(run.runId) ? 'text-[var(--trust,#2563eb)]' : 'text-slate-600'">
              {{ isActiveRun(run.runId) ? 'Viewing pathways for this run' : 'View results and pathways' }}
            </p>
          </div>
          <span
            class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
            :class="getRecommendationStatusTone(run.status)"
          >
            {{ getRecommendationStatusLabel(run.status) }}
          </span>
        </button>
      </li>
    </ul>

    <div
      v-else
      class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600"
    >
      Submit your intake to create your first recommendation run placeholder.
    </div>
  </section>
</template>
