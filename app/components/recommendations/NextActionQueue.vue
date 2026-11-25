<script setup lang="ts">
import type {
  RecommendationImprovementAction,
  RecommendationNextStepPlan,
  RecommendationNextStepPlanStep,
} from '~/lib/recommendations/comparison'

import { ChevronDown } from 'lucide-vue-next'
import { interfaceIconStroke } from '~/lib/relay/icons'

const props = withDefaults(
  defineProps<{
    plan?: RecommendationNextStepPlan | null
    actions?: RecommendationImprovementAction[]
    panelIdBase?: string
  }>(),
  {
    plan: null,
    actions: () => [],
    panelIdBase: 'recommendation-next-step-plan',
  },
)

const isMobilePlanOpen = ref(false)

const priorityOrder: Record<RecommendationNextStepPlanStep['priority'], number> = {
  now: 0,
  next: 1,
  later: 2,
}

const detailsPanelId = computed(() => `${props.panelIdBase}-details`)

/**
 * When a server-shaped `plan` prop is provided (Story 4.1+), the component
 * renders it directly.  The fallback branch below exists solely for
 * backward-compatibility with Story 3.2 callers that still pass raw
 * `actions` without a pre-shaped plan.  All new callers MUST pass the
 * `plan` prop so trust-sensitive shaping stays on the server side.
 */
const resolvedPlan = computed<RecommendationNextStepPlan>(() => {
  if (props.plan) {
    return props.plan
  }

  const steps = [...props.actions]
    .sort((left, right) => priorityOrder[left.priority] - priorityOrder[right.priority])
    .map((action, index) => ({
      id: action.id,
      title: action.title,
      detail:
        `${action.detail}${action.expectedImpact ? ` Expected impact: ${action.expectedImpact}` : ''}`.trim(),
      priority: action.priority,
      sequence: index + 1,
    }))

  return {
    summary: 'Suggested steps to improve pathway readiness.',
    steps,
    limitation: '',
  }
})

const hasSteps = computed(() => resolvedPlan.value.steps.length > 0)
const shouldShowLimitation = computed(() => resolvedPlan.value.limitation.trim().length > 0)

function priorityToneClasses(priority: RecommendationNextStepPlanStep['priority']) {
  if (priority === 'now') {
    return 'border-[var(--trust,#2563eb)]/35 bg-[var(--trust-soft,#dbeafe)] text-slate-900'
  }

  if (priority === 'next') {
    return 'border-[var(--warning,#f59e0b)]/40 bg-[var(--warning-soft,#fef3c7)] text-slate-900'
  }

  return 'border-slate-200 bg-slate-50 text-slate-900'
}

function priorityLabel(priority: RecommendationNextStepPlanStep['priority']) {
  if (priority === 'now') {
    return 'Now'
  }

  if (priority === 'next') {
    return 'Next'
  }

  return 'Later'
}

function toggleMobilePlan() {
  isMobilePlanOpen.value = !isMobilePlanOpen.value
}
</script>

<template>
  <section
    data-testid="recommendation-next-step-plan"
    class="rounded-lg border border-slate-200 bg-white p-3"
    aria-label="Recommendation next-step plan"
  >
    <div data-testid="recommendation-actions-queue" class="space-y-3">
      <div class="space-y-1">
        <h5 class="text-xs font-semibold uppercase tracking-wide text-slate-600">Next-step plan</h5>
        <p
          data-testid="recommendation-next-step-summary"
          class="text-sm leading-relaxed text-slate-800"
        >
          {{ resolvedPlan.summary }}
        </p>
      </div>

      <div
        v-if="shouldShowLimitation"
        data-testid="recommendation-next-step-limitation"
        class="rounded-md border border-[var(--warning,#f59e0b)]/30 bg-[var(--warning-soft,#fef3c7)]/60 px-3 py-2 text-sm leading-relaxed text-slate-800"
      >
        {{ resolvedPlan.limitation }}
      </div>

      <button
        v-if="hasSteps"
        data-testid="recommendation-next-step-toggle"
        type="button"
        class="focus-visible:ring-[3px] focus-visible:ring-[var(--ring,#94a3b8)]/40 flex min-h-[44px] w-full items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-left outline-none md:hidden"
        :aria-expanded="isMobilePlanOpen"
        :aria-controls="detailsPanelId"
        @click="toggleMobilePlan"
      >
        <span class="text-sm text-slate-700"> Show ordered next steps </span>

        <ChevronDown
          :stroke-width="interfaceIconStroke"
          class="size-4 shrink-0 text-slate-500 transition-transform"
          :class="isMobilePlanOpen ? 'rotate-180' : ''"
        />
      </button>

      <!--
        Single step list for both breakpoints.
        Mobile: gated by isMobilePlanOpen toggle (hidden by default, md:hidden toggle above).
        Desktop: always visible via `md:!block` override.
      -->
      <ol
        v-if="hasSteps"
        v-show="isMobilePlanOpen"
        :id="detailsPanelId"
        class="space-y-2 md:!block"
        aria-label="Ordered next steps"
      >
        <li
          v-for="step in resolvedPlan.steps"
          :key="step.id"
          data-testid="recommendation-next-step-item"
          class="min-h-[44px] rounded-md border px-3 py-2 text-sm"
          :class="priorityToneClasses(step.priority)"
        >
          <p class="font-semibold text-slate-950">
            Step {{ step.sequence }} · {{ priorityLabel(step.priority) }} · {{ step.title }}
          </p>
          <p class="mt-1 leading-relaxed text-slate-800">
            {{ step.detail }}
          </p>
        </li>
      </ol>

      <p v-else class="text-sm leading-relaxed text-slate-600">
        No next-step plan is available for this recommendation yet.
      </p>
    </div>
  </section>
</template>
