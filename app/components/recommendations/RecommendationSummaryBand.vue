<script setup lang="ts">
import type { RecommendationComparison } from '~/lib/recommendations/comparison'

const props = withDefaults(defineProps<{
  comparison: RecommendationComparison
  noComposedReason?: string | null
  totalCitationCount?: number
}>(), {
  noComposedReason: null,
  totalCitationCount: 0,
})

const modeLabel = computed(() => (
  props.comparison.mode === 'workspace'
    ? 'Comparison workspace'
    : 'Structured fallback review'
))

const headline = computed(() => (
  props.comparison.mode === 'workspace'
    ? 'Compare timing, blockers, and route shape in one place'
    : 'Review the best available pathway context without losing orientation'
))

const fallbackNoComposedReason = computed(() => (
  props.comparison.mode === 'fallback'
    ? props.noComposedReason
    : null
))
</script>

<template>
  <section
    data-testid="recommendation-summary-band"
    class="rounded-2xl border border-[var(--trust,#6366f1)]/15 bg-[var(--trust-soft,#eef2ff)]/60 p-4 md:p-5"
  >
    <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--trust,#6366f1)]">
          {{ modeLabel }}
        </p>
        <h4 class="text-base font-semibold text-slate-950 md:text-lg">
          {{ headline }}
        </h4>
        <p class="max-w-3xl text-sm leading-relaxed text-slate-700">
          {{ props.comparison.summary }}
        </p>
        <p
          v-if="props.comparison.limitation"
          class="rounded-xl border border-[var(--warning,#f59e0b)]/30 bg-white/80 px-3 py-2 text-sm text-slate-800"
        >
          {{ props.comparison.limitation }}
        </p>
        <p
          v-if="fallbackNoComposedReason"
          class="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700"
        >
          {{ fallbackNoComposedReason }}
        </p>
      </div>

      <dl class="grid min-w-[220px] grid-cols-3 gap-3 rounded-2xl border border-white/70 bg-white/80 p-3 text-sm">
        <div class="rounded-xl bg-slate-50 px-3 py-2">
          <dt class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Visible groups
          </dt>
          <dd class="mt-1 text-lg font-semibold text-slate-950">
            {{ props.comparison.visibleGroupCount }}
          </dd>
        </div>
        <div class="rounded-xl bg-slate-50 px-3 py-2">
          <dt class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Ranked pathways
          </dt>
          <dd class="mt-1 text-lg font-semibold text-slate-950">
            {{ props.comparison.totalCandidateCount }}
          </dd>
        </div>
        <div class="rounded-xl bg-slate-50 px-3 py-2">
          <dt class="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Citations
          </dt>
          <dd class="mt-1 text-lg font-semibold text-slate-950">
            {{ props.totalCitationCount }}
          </dd>
        </div>
      </dl>
    </div>
  </section>
</template>

