<script setup lang="ts">
import type { WorkspaceSummaryActionKey } from '~~/shared/types/workspace-summary'

import type { WorkspaceResolvedAction } from '~/lib/workspace/workspace-summary'
import type { WorkspaceSummary } from '~~/shared/types/workspace-summary'

import { ArrowRight, Clock3, GitCompareArrows, History, Sparkles } from 'lucide-vue-next'
import { interfaceIconStroke } from '~/lib/relay/icons'
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

const lastActivity = computed(() =>
  props.summary ? getWorkspaceLastActivity(props.summary) : null,
)

function handlePrimaryAction() {
  if (!props.primaryAction) {
    return
  }

  emit('action', props.primaryAction.key)
}
</script>

<template>
  <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <div v-if="!summary" class="space-y-4">
      <Skeleton class="h-6 w-36 rounded-full" />
      <Skeleton class="h-10 w-full rounded-2xl" />
      <Skeleton class="h-20 w-full rounded-3xl" />
      <Skeleton class="h-12 w-56 rounded-xl" />
    </div>

    <div v-else class="space-y-6">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-4">
          <div class="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              class="rounded-full border-accent bg-accent px-3 py-1 text-primary"
            >
              <Sparkles :stroke-width="interfaceIconStroke" class="mr-2 size-3.5" />
              {{ getWorkspaceStateLabel(summary) }}
            </Badge>
            <Badge
              variant="outline"
              class="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-slate-700"
            >
              <Clock3 :stroke-width="interfaceIconStroke" class="mr-2 size-3.5" />
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
          class="min-h-[48px] rounded-2xl bg-primary px-5 text-white hover:bg-primary/90"
          @click="handlePrimaryAction"
        >
          {{ primaryAction.label }}
          <ArrowRight :stroke-width="interfaceIconStroke" class="size-4" />
        </Button>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
          <div class="flex items-center gap-3">
            <div
              class="flex size-10 items-center justify-center rounded-2xl bg-accent text-primary"
            >
              <History :stroke-width="interfaceIconStroke" class="size-4" />
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
            <div
              class="flex size-10 items-center justify-center rounded-2xl bg-positive-soft text-positive"
            >
              <Sparkles :stroke-width="interfaceIconStroke" class="size-4" />
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
            <div
              class="flex size-10 items-center justify-center rounded-2xl bg-caution-soft text-caution"
            >
              <GitCompareArrows :stroke-width="interfaceIconStroke" class="size-4" />
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

      <div v-if="lastActivity" class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
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
