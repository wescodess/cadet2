<script setup lang="ts">
import type { WorkspaceSummaryActionKey } from '~~/shared/types/workspace-summary'

import type { WorkspaceResolvedAction } from '~/lib/workspace/workspace-summary'
import type { WorkspaceSummary } from '~~/shared/types/workspace-summary'

import {
  ArrowRight,
  Archive,
  ClipboardPenLine,
  GitCompareArrows,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  summary: WorkspaceSummary | null
  actions: WorkspaceResolvedAction[]
  activeActionKey?: WorkspaceSummaryActionKey | null
}>(), {
  activeActionKey: null,
})

const emit = defineEmits<{
  action: [key: WorkspaceSummaryActionKey]
}>()

const iconMap = {
  'start-intake': ClipboardPenLine,
  'resume-intake': ClipboardPenLine,
  'review-latest-run': Sparkles,
  'compare-latest-runs': GitCompareArrows,
  'open-history': Archive,
  'start-new-cycle': RefreshCw,
  'refresh-plan': RefreshCw,
} satisfies Record<WorkspaceSummaryActionKey, typeof Sparkles>

function handleAction(key: WorkspaceSummaryActionKey) {
  emit('action', key)
}
</script>

<template>
  <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div class="space-y-1">
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        Quick actions
      </p>
      <h3 class="text-xl font-semibold text-slate-950">
        Continue safely from where you left off
      </h3>
    </div>

    <div
      v-if="summary"
      class="mt-5 grid gap-3 sm:grid-cols-3"
    >
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Archive
        </p>
        <p class="mt-2 text-2xl font-semibold text-slate-950">
          {{ summary.archive.totalRuns }}
        </p>
        <p class="mt-1 text-xs text-slate-600">
          Preserved planning cycles
        </p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Comparison
        </p>
        <p class="mt-2 text-2xl font-semibold text-slate-950">
          {{ summary.comparison.comparableRunCount }}
        </p>
        <p class="mt-1 text-xs text-slate-600">
          Comparable preserved runs
        </p>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Latest run
        </p>
        <p class="mt-2 text-base font-semibold text-slate-950">
          {{ summary.latestRun?.statusMessage || 'No run generated yet' }}
        </p>
      </div>
    </div>

    <div
      v-if="!summary"
      class="mt-5 space-y-3"
    >
      <Skeleton
        v-for="index in 4"
        :key="index"
        class="h-20 rounded-2xl"
      />
    </div>

    <div
      v-else
      class="mt-5 space-y-3"
    >
      <Button
        v-for="action in actions"
        :key="action.key"
        type="button"
        variant="outline"
        class="flex min-h-[72px] w-full items-start justify-between rounded-2xl border-slate-200 bg-white px-4 py-4 text-left hover:bg-slate-50"
        :data-testid="action.key === 'start-new-cycle' ? 'planning-cycle-start' : undefined"
        @click="handleAction(action.key)"
      >
        <div class="flex items-start gap-3">
          <div class="mt-0.5 flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <component
              :is="props.activeActionKey === action.key ? LoaderCircle : iconMap[action.key]"
              class="size-4"
              :class="props.activeActionKey === action.key ? 'animate-spin' : ''"
            />
          </div>

          <div class="space-y-1">
            <p class="text-sm font-semibold text-slate-950">
              {{ action.label }}
            </p>
            <p class="text-sm leading-relaxed text-slate-600">
              {{ action.description }}
            </p>
          </div>
        </div>

        <ArrowRight class="mt-1 size-4 shrink-0 text-slate-400" />
      </Button>
    </div>
  </section>
</template>
