<script setup lang="ts">
import type { RecommendationResultsCandidate } from '~/lib/recommendations/comparison'

import { ChevronDown } from 'lucide-vue-next'
import BlockerAndTradeoffPanel from '~/components/recommendations/BlockerAndTradeoffPanel.vue'
import MilestoneRoutePlanner from '~/components/recommendations/MilestoneRoutePlanner.vue'
import NextActionQueue from '~/components/recommendations/NextActionQueue.vue'
import RecommendationTierBadge from '~/components/workspace/RecommendationTierBadge.vue'
import { normalizePathwayLabel } from '~/lib/recommendations/comparison'

const props = defineProps<{
  candidate: RecommendationResultsCandidate
}>()

const pathwayType = computed(() => props.candidate.pathwayType)
const isMobileFitSignalsOpen = ref(false)

function signalToneClasses(state: RecommendationResultsCandidate['fitSignals'][number]['state']) {
  if (state === 'strength') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-950'
  }

  if (state === 'gap') {
    return 'border-[var(--destructive,#ef4444)]/25 bg-[var(--destructive-soft,#fef2f2)] text-slate-950'
  }

  return 'border-[var(--warning,#f59e0b)]/30 bg-[var(--warning-soft,#fef3c7)] text-slate-950'
}

function signalStateLabel(state: RecommendationResultsCandidate['fitSignals'][number]['state']) {
  if (state === 'strength') {
    return 'Strength'
  }

  if (state === 'gap') {
    return 'Gap'
  }

  return 'Watch'
}

function candidateContainerClasses(candidate: RecommendationResultsCandidate) {
  if (candidate.type === 'direct') {
    return 'border-[var(--confidence-high,#22c55e)]/30 bg-[var(--success-soft,#f0fdf4)]/40'
  }

  if (candidate.type === 'blocked') {
    return 'border-[var(--warning,#f59e0b)]/35 bg-[var(--warning-soft,#fef3c7)]/45'
  }

  return 'border-[var(--primary,#6366f1)]/20 bg-[var(--primary,#6366f1)]/5'
}

function candidateOutcomeSummary(candidate: RecommendationResultsCandidate) {
  if (candidate.qualification === 'supported') {
    return 'Supported recommendation'
  }

  if (candidate.qualification === 'withheld') {
    return 'Withheld recommendation'
  }

  return 'Low-confidence recommendation'
}

const blockers = computed(() => props.candidate.blockers || [])
const tradeoffs = computed(() => props.candidate.tradeoffs || [])
const actions = computed(() => props.candidate.improvementActions || [])
const hasStrategicRoute = computed(() => Boolean(props.candidate.composedSteps && props.candidate.composedSteps.length > 0))

function toggleMobileFitSignals() {
  isMobileFitSignalsOpen.value = !isMobileFitSignalsOpen.value
}
</script>

<template>
  <article
    data-testid="recommendation-result-item"
    class="space-y-4 rounded-2xl border p-4 shadow-sm"
    :class="candidateContainerClasses(props.candidate)"
  >
    <div class="flex flex-col gap-3">
      <div class="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div class="space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span
              data-testid="recommendation-pathway-type-badge"
              class="inline-flex items-center rounded-full border border-slate-300 bg-white/85 px-3 py-1 text-xs font-semibold text-slate-950"
            >
              {{ pathwayType.label }}
            </span>
            <span class="text-xs font-medium text-slate-600">
              Rank #{{ props.candidate.rank }}
            </span>
          </div>

          <div class="space-y-1">
            <h5 class="text-base font-semibold text-slate-950">
              {{ normalizePathwayLabel(props.candidate.pathwayId) }}
            </h5>
            <p class="text-sm text-slate-700">
              {{ pathwayType.description }}
            </p>
            <p class="text-xs font-medium text-slate-700">
              {{ candidateOutcomeSummary(props.candidate) }} · Confidence {{ props.candidate.confidence }} · Freshness {{ props.candidate.freshness }}
            </p>
          </div>
        </div>

        <RecommendationTierBadge
          :tier="props.candidate.tier"
          :qualification="props.candidate.qualification"
          :confidence="props.candidate.confidence"
        />
      </div>

      <p class="text-sm leading-relaxed text-slate-900">
        {{ props.candidate.rationale }}
      </p>
    </div>

    <div class="space-y-3 md:hidden">
      <MilestoneRoutePlanner
        v-if="hasStrategicRoute"
        :steps="props.candidate.composedSteps || []"
      />

      <NextActionQueue
        v-if="actions.length > 0"
        :actions="actions"
      />

      <BlockerAndTradeoffPanel
        :blockers="blockers"
        :tradeoffs="tradeoffs"
      />

      <p
        v-if="props.candidate.qualification !== 'supported'"
        class="rounded-xl border border-[var(--warning,#f59e0b)]/30 bg-white/80 px-3 py-2 text-xs leading-relaxed text-slate-800"
      >
        Caution: {{ props.candidate.caveat }}
      </p>

      <section class="rounded-xl border border-slate-200 bg-white/85">
        <button
          type="button"
          class="focus-visible:ring-[3px] focus-visible:ring-[var(--ring)]/40 flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left outline-none"
          :aria-expanded="isMobileFitSignalsOpen"
          :aria-controls="`fit-signals-${props.candidate.pathwayId}`"
          @click="toggleMobileFitSignals"
        >
          <span>
            <span class="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Fit signals
            </span>
            <span class="mt-1 block text-sm text-slate-700">
              Review {{ props.candidate.fitSignals.length }} supporting signal{{ props.candidate.fitSignals.length === 1 ? '' : 's' }}.
            </span>
          </span>

          <ChevronDown
            class="size-4 shrink-0 text-slate-500 transition-transform"
            :class="isMobileFitSignalsOpen ? 'rotate-180' : ''"
          />
        </button>

        <ul
          v-if="isMobileFitSignalsOpen"
          :id="`fit-signals-${props.candidate.pathwayId}`"
          class="grid gap-2 border-t border-slate-200 px-3 py-3"
          aria-label="Recommendation fit signals"
        >
          <li
            v-for="signal in props.candidate.fitSignals"
            :key="`${props.candidate.pathwayId}:${signal.id}`"
            class="rounded-xl border px-3 py-2 text-xs leading-relaxed"
            :class="signalToneClasses(signal.state)"
          >
            <span class="font-semibold">{{ signalStateLabel(signal.state) }}:</span>
            <span class="font-semibold"> {{ signal.label }}</span>
            <span> · {{ signal.detail }}</span>
          </li>
        </ul>
      </section>
    </div>

    <div class="hidden space-y-4 md:block">
      <ul
        class="grid gap-2"
        :class="props.candidate.fitSignals.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1'"
        aria-label="Recommendation fit signals"
      >
        <li
          v-for="signal in props.candidate.fitSignals"
          :key="`${props.candidate.pathwayId}:${signal.id}`"
          class="rounded-xl border px-3 py-2 text-xs leading-relaxed"
          :class="signalToneClasses(signal.state)"
        >
          <span class="font-semibold">{{ signalStateLabel(signal.state) }}:</span>
          <span class="font-semibold"> {{ signal.label }}</span>
          <span> · {{ signal.detail }}</span>
        </li>
      </ul>

      <MilestoneRoutePlanner
        v-if="hasStrategicRoute"
        :steps="props.candidate.composedSteps || []"
      />

      <div class="space-y-3">
        <BlockerAndTradeoffPanel
          :blockers="blockers"
          :tradeoffs="tradeoffs"
        />

        <NextActionQueue
          v-if="actions.length > 0"
          :actions="actions"
        />
      </div>

      <p
        v-if="props.candidate.qualification !== 'supported'"
        class="rounded-xl border border-[var(--warning,#f59e0b)]/30 bg-white/80 px-3 py-2 text-xs leading-relaxed text-slate-800"
      >
        Caution: {{ props.candidate.caveat }}
      </p>
    </div>
  </article>
</template>
