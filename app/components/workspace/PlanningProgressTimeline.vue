<script setup lang="ts">
import type { WorkspaceSummary } from '~~/shared/types/workspace-summary'

import { CheckCircle2, CircleDashed, GitBranchPlus, NotebookPen, Route, Sparkles } from 'lucide-vue-next'
import { computed } from 'vue'

import { getWorkspaceTimelineItems } from '~/lib/workspace/workspace-summary'

const props = defineProps<{
  summary: WorkspaceSummary | null
}>()

const timelineItems = computed(() => props.summary ? getWorkspaceTimelineItems(props.summary) : [])

const iconMap = {
  'intake-saved': NotebookPen,
  'latest-run-generated': Sparkles,
  'latest-comparison-available': GitBranchPlus,
  'next-step-plan-available': Route,
} as const
</script>

<template>
  <section
    data-testid="planning-progress-timeline"
    class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
  >
    <div class="space-y-1">
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        Planning progress
      </p>
      <h3 class="text-xl font-semibold text-slate-950">
        Continuity timeline
      </h3>
    </div>

    <div
      v-if="!summary"
      class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <Skeleton
        v-for="index in 4"
        :key="index"
        class="h-28 rounded-2xl"
      />
    </div>

    <div
      v-else
      class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <article
        v-for="item in timelineItems"
        :key="item.key"
        class="rounded-2xl border p-4"
        :class="item.complete
          ? 'border-[var(--success,#4d7a72)]/20 bg-[var(--success-soft,#e7f0ee)]/60'
          : 'border-slate-200 bg-slate-50/80'"
      >
        <div class="flex items-start justify-between gap-3">
          <div
            class="flex size-10 items-center justify-center rounded-2xl"
            :class="item.complete
              ? 'bg-[var(--success,#4d7a72)] text-white'
              : 'bg-white text-slate-500'"
          >
            <component :is="iconMap[item.key]" class="size-4" />
          </div>

          <component
            :is="item.complete ? CheckCircle2 : CircleDashed"
            class="size-4 shrink-0"
            :class="item.complete ? 'text-[var(--success,#4d7a72)]' : 'text-slate-400'"
          />
        </div>

        <div class="mt-4 space-y-2">
          <h4 class="text-sm font-semibold text-slate-950">
            {{ item.label }}
          </h4>
          <p class="text-sm leading-relaxed text-slate-600">
            {{ item.description }}
          </p>
        </div>
      </article>
    </div>
  </section>
</template>
