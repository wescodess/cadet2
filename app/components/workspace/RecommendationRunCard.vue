<script setup lang="ts">
import type { RecommendationRunSummary } from '~/lib/workspace/recommendation-run-history'

import { ChevronDown, Clock3, Eye, GitCompareArrows, Lock } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import RunStatusBadge from '~/components/workspace/RunStatusBadge.vue'

const props = defineProps<{
  run: RecommendationRunSummary
  isLatest?: boolean
  comparisonTargetRunId?: string | null
}>()

const emit = defineEmits<{
  'view-results': [runId: string]
  'compare-runs': [runId: string, comparisonTargetRunId: string]
}>()

const isExpanded = ref(false)
const panelId = computed(() => `run-card-panel-${props.run.id}`)
const canCompare = computed(() =>
  Boolean(
    props.run.isAvailable &&
    props.comparisonTargetRunId &&
    props.run.id !== props.comparisonTargetRunId,
  ),
)

function formatRunDate(value: string) {
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

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

function emitCompareRuns() {
  if (!props.comparisonTargetRunId) {
    return
  }

  emit('compare-runs', props.run.id, props.comparisonTargetRunId)
}
</script>

<template>
  <article
    :data-testid="`run-card-${props.run.id}`"
    class="rounded-3xl border bg-white p-5 shadow-sm transition-all md:hover:-translate-y-0.5 md:hover:shadow-md"
    :class="[
      props.isLatest ? 'border-primary/35 ring-1 ring-primary/10' : 'border-slate-200',
      !props.run.isAvailable ? 'bg-slate-50 text-slate-500' : '',
    ]"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <RunStatusBadge :status="props.run.status" />
          <Badge
            v-if="props.isLatest"
            data-testid="run-history-latest-badge"
            variant="outline"
            class="rounded-full border-primary/25 bg-accent text-primary"
          >
            Latest
          </Badge>
          <Badge
            v-if="!props.run.isAvailable"
            variant="outline"
            class="rounded-full border-slate-300 bg-slate-100 text-slate-600"
          >
            Unavailable
          </Badge>
        </div>

        <div class="space-y-1">
          <p
            class="text-sm font-semibold text-slate-900"
            :class="!props.run.isAvailable ? 'text-slate-500' : ''"
          >
            {{ formatRunDate(props.run.createdAt) }}
          </p>
          <p class="text-sm text-slate-600" :class="!props.run.isAvailable ? 'text-slate-500' : ''">
            {{ props.run.recommendationCount }} recommendation{{
              props.run.recommendationCount === 1 ? '' : 's'
            }}
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        data-testid="run-card-expand-toggle"
        class="min-h-[44px] min-w-[44px] rounded-full md:hidden"
        :aria-expanded="isExpanded"
        :aria-controls="panelId"
        @click="toggleExpanded"
      >
        <ChevronDown class="size-4 transition-transform" :class="isExpanded ? 'rotate-180' : ''" />
        <span class="sr-only">Toggle archived run details</span>
      </Button>
    </div>

    <div :id="panelId" class="mt-4 space-y-4" :class="isExpanded ? 'block' : 'hidden md:block'">
      <div class="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
        <div class="flex items-start gap-3">
          <Clock3 class="mt-0.5 size-4 shrink-0 text-slate-500" aria-hidden="true" />
          <p
            class="text-sm leading-relaxed text-slate-700"
            :class="!props.run.isAvailable ? 'text-slate-500' : ''"
          >
            {{ props.run.profileSnapshotSummary }}
          </p>
        </div>
      </div>

      <p
        v-if="!props.run.isAvailable"
        data-testid="run-unavailable-reason"
        class="flex items-start gap-2 text-sm text-slate-600"
      >
        <Lock class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{
          props.run.unavailableReason || 'Archived run data is no longer available.'
        }}</span>
      </p>

      <div v-if="props.run.isAvailable" class="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          class="min-h-[44px] w-full justify-center rounded-xl border-slate-300 bg-white text-slate-900 hover:bg-slate-100"
          @click="emit('view-results', props.run.id)"
        >
          <Eye class="size-4" />
          View Results
        </Button>

        <Button
          v-if="canCompare"
          type="button"
          variant="outline"
          class="min-h-[44px] w-full justify-center rounded-xl border-primary/25 bg-accent text-primary hover:bg-accent/80"
          @click="emitCompareRuns"
        >
          <GitCompareArrows class="size-4" />
          Compare
        </Button>
      </div>
    </div>
  </article>
</template>
