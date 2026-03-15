<script setup lang="ts">
import type { WorkspaceSummaryActionKey } from '~~/shared/types/workspace-summary'

import type { WorkspaceResolvedAction } from '~/lib/workspace/workspace-summary'
import type { WorkspaceSummary } from '~~/shared/types/workspace-summary'

import { ArrowRight, Clock3, GitCompareArrows, History, Sparkles } from 'lucide-vue-next'
import { computed } from 'vue'

import {
  formatWorkspaceSummaryTimestamp,
  getWorkspaceHeroDescription,
  getWorkspaceHeroHeading,
  getWorkspaceLastActivity,
  getWorkspaceStateLabel,
} from '~/lib/workspace/workspace-summary'

const props = defineProps<{
  firstName?: string | null
  summary: WorkspaceSummary | null
  primaryAction: WorkspaceResolvedAction | null
}>()

const emit = defineEmits<{
  action: [key: WorkspaceSummaryActionKey]
}>()

const lastActivity = computed(() => props.summary ? getWorkspaceLastActivity(props.summary) : null)

function handlePrimaryAction() {
  if (!props.primaryAction) {
    return
  }

  emit('action', props.primaryAction.key)
}
</script>

<template>
  <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <div
      v-if="!summary"
      class="space-y-4"
    >
      <Skeleton class="h-6 w-36 rounded-full" />
      <Skeleton class="h-10 w-full rounded-2xl" />
      <Skeleton class="h-20 w-full rounded-3xl" />
      <Skeleton class="h-12 w-56 rounded-xl" />
    </div>

    <div
      v-else
      class="space-y-6"
    >
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-4">
          <div class="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              class="rounded-full border-[var(--trust-soft,#e7eef6)] bg-[var(--trust-soft,#e7eef6)] px-3 py-1 text-[var(--trust,#2563eb)]"
            >
              <Sparkles class="mr-2 size-3.5" />
              {{ getWorkspaceStateLabel(summary) }}
            </Badge>
            <Badge
              variant="outline"
              class="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-700"
            >
              <Clock3 class="mr-2 size-3.5" />
              {{ formatWorkspaceSummaryTimestamp(lastActivity?.occurredAt) }}
            </Badge>
          </div>

          <div class="space-y-3">
            <h2 class="max-w-3xl text-3xl font-semibold tracking-tight text-slate-950">
              {{ getWorkspaceHeroHeading(summary, firstName) }}
            </h2>
            <p class="max-w-3xl text-sm leading-relaxed text-slate-600">
              {{ getWorkspaceHeroDescription(summary) }}
            </p>
          </div>
        </div>

        <Button
          v-if="primaryAction"
          class="min-h-[48px] rounded-2xl bg-[var(--trust,#2563eb)] px-5 text-white hover:bg-[var(--trust,#2563eb)]/90"
          @click="handlePrimaryAction"
        >
          {{ primaryAction.label }}
          <ArrowRight class="size-4" />
        </Button>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-2xl bg-[var(--trust-soft,#e7eef6)] text-[var(--trust,#2563eb)]">
              <History class="size-4" />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Preserved runs
              </p>
              <p class="text-2xl font-semibold text-slate-950">
                {{ summary.archive.totalRuns }}
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-2xl bg-[var(--success-soft,#e7f0ee)] text-[var(--success,#4d7a72)]">
              <Sparkles class="size-4" />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Review-ready pathways
              </p>
              <p class="text-2xl font-semibold text-slate-950">
                {{ summary.latestReviewRun?.recommendationCount || 0 }}
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-2xl bg-[var(--warning-soft,#faf1df)] text-[var(--warning,#c89b52)]">
              <GitCompareArrows class="size-4" />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Comparable runs
              </p>
              <p class="text-2xl font-semibold text-slate-950">
                {{ summary.comparison.comparableRunCount }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="lastActivity"
        class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          {{ lastActivity.label }}
        </p>
        <p class="mt-1 text-sm text-slate-700">
          {{ lastActivity.detail }}
        </p>
      </div>
    </div>
  </section>
</template>
