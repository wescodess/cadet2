<script setup lang="ts">
type RecommendationBlocker = {
  id: string
  label: string
  detail: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

type RecommendationTradeoff = {
  id: string
  dimension: 'effort' | 'timing' | 'complexity' | 'cost'
  summary: string
  impact: 'high' | 'medium' | 'low'
}

const props = withDefaults(defineProps<{
  blockers?: RecommendationBlocker[]
  tradeoffs?: RecommendationTradeoff[]
}>(), {
  blockers: () => [],
  tradeoffs: () => [],
})

const blockerList = computed(() => props.blockers || [])
const tradeoffList = computed(() => props.tradeoffs || [])

function blockerToneClasses(severity: RecommendationBlocker['severity']) {
  if (severity === 'critical') {
    return 'border-[var(--destructive)]/50 bg-[var(--destructive-soft)] text-slate-900'
  }

  if (severity === 'high') {
    return 'border-[var(--confidence-low)]/40 bg-[var(--destructive-soft)] text-slate-900'
  }

  if (severity === 'medium') {
    return 'border-[var(--warning)]/40 bg-[var(--warning-soft)] text-slate-900'
  }

  return 'border-slate-200 bg-slate-50 text-slate-900'
}

function blockerSeverityLabel(severity: RecommendationBlocker['severity']) {
  if (severity === 'critical') {
    return 'Critical'
  }

  if (severity === 'high') {
    return 'High'
  }

  if (severity === 'medium') {
    return 'Medium'
  }

  return 'Low'
}

function tradeoffToneClasses(impact: RecommendationTradeoff['impact']) {
  if (impact === 'high') {
    return 'border-[var(--confidence-low)]/40 bg-[var(--destructive-soft)] text-slate-900'
  }

  if (impact === 'medium') {
    return 'border-[var(--warning)]/40 bg-[var(--warning-soft)] text-slate-900'
  }

  return 'border-[var(--confidence-high)]/40 bg-[var(--success-soft)] text-slate-900'
}

function formatTradeoffDimension(dimension: RecommendationTradeoff['dimension']) {
  if (dimension === 'effort') {
    return 'Effort'
  }

  if (dimension === 'timing') {
    return 'Timing'
  }

  if (dimension === 'complexity') {
    return 'Complexity'
  }

  return 'Cost'
}

function impactLabel(impact: RecommendationTradeoff['impact']) {
  if (impact === 'high') {
    return 'High impact'
  }

  if (impact === 'medium') {
    return 'Medium impact'
  }

  return 'Low impact'
}
</script>

<template>
  <div class="grid gap-3 md:grid-cols-2">
    <section
      v-if="blockerList.length > 0"
      data-testid="recommendation-blockers-panel"
      class="rounded-lg border border-slate-200 bg-white p-3"
      aria-label="Recommendation blockers"
    >
      <h5 class="text-xs font-semibold uppercase tracking-wide text-slate-600">
        Blockers
      </h5>
      <p class="mt-1 text-xs text-slate-500">
        Factual constraints currently affecting this route.
      </p>

      <ul class="mt-3 space-y-2" aria-label="Blocker list">
        <li
          v-for="blocker in blockerList"
          :key="blocker.id"
          class="min-h-[44px] rounded-md border px-2.5 py-2 text-xs"
          :class="blockerToneClasses(blocker.severity)"
        >
          <p class="font-semibold">
            {{ blockerSeverityLabel(blocker.severity) }} severity · {{ blocker.label }}
          </p>
          <p class="mt-1 leading-relaxed">
            {{ blocker.detail }}
          </p>
        </li>
      </ul>
    </section>

    <section
      data-testid="recommendation-tradeoffs-panel"
      class="rounded-lg border border-slate-200 bg-white p-3"
      aria-label="Recommendation tradeoffs"
    >
      <h5 class="text-xs font-semibold uppercase tracking-wide text-slate-600">
        Tradeoffs
      </h5>
      <p class="mt-1 text-xs text-slate-500">
        What you gain or accept across effort, timing, and complexity.
      </p>

      <ul class="mt-3 space-y-2" aria-label="Tradeoff list">
        <li
          v-for="tradeoff in tradeoffList"
          :key="tradeoff.id"
          class="min-h-[44px] rounded-md border px-2.5 py-2 text-xs"
          :class="tradeoffToneClasses(tradeoff.impact)"
        >
          <p class="font-semibold">
            {{ formatTradeoffDimension(tradeoff.dimension) }} · {{ impactLabel(tradeoff.impact) }}
          </p>
          <p class="mt-1 leading-relaxed">
            {{ tradeoff.summary }}
          </p>
        </li>
      </ul>
    </section>
  </div>
</template>
