<script setup lang="ts">
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
}>(), {
  isLoading: false,
  errorMessage: null,
})

const statusLabelMap: Record<string, string> = {
  queued: 'Queued',
  evaluating: 'Evaluating',
  completed: 'Completed',
  degraded: 'Degraded',
  failed: 'Failed',
}

const statusToneMap: Record<string, string> = {
  queued: 'bg-amber-50 text-amber-700 border-amber-200',
  evaluating: 'bg-sky-50 text-sky-700 border-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  degraded: 'bg-orange-50 text-orange-700 border-orange-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
}

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
        class="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-slate-900">
              {{ shortRunId(run.runId) }}
            </p>
            <p class="text-xs text-slate-500">
              Submitted {{ formatTimestamp(run.createdAt) }}
            </p>
          </div>
          <span
            class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold"
            :class="statusToneMap[run.status] || 'bg-slate-100 text-slate-600 border-slate-200'"
          >
            {{ statusLabelMap[run.status] || run.status }}
          </span>
        </div>
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
