<script setup lang="ts">
type RecommendationImprovementAction = {
  id: string
  title: string
  detail: string
  priority: 'now' | 'next' | 'later'
  expectedImpact: string
}

const props = withDefaults(defineProps<{
  actions?: RecommendationImprovementAction[]
}>(), {
  actions: () => [],
})

const actionList = computed(() => props.actions || [])

function priorityToneClasses(priority: RecommendationImprovementAction['priority']) {
  if (priority === 'now') {
    return 'border-[var(--trust)]/35 bg-[var(--trust-soft)] text-slate-900'
  }

  if (priority === 'next') {
    return 'border-[var(--warning)]/40 bg-[var(--warning-soft)] text-slate-900'
  }

  return 'border-slate-200 bg-slate-50 text-slate-900'
}

function priorityLabel(priority: RecommendationImprovementAction['priority']) {
  if (priority === 'now') {
    return 'Now'
  }

  if (priority === 'next') {
    return 'Next'
  }

  return 'Later'
}
</script>

<template>
  <section
    data-testid="recommendation-actions-queue"
    class="rounded-lg border border-slate-200 bg-white p-3"
    aria-label="Recommendation improvement actions"
  >
    <h5 class="text-xs font-semibold uppercase tracking-wide text-slate-600">
      Improvement actions
    </h5>
    <p class="mt-1 text-xs text-slate-500">
      Suggested steps to improve pathway readiness.
    </p>

    <ol class="mt-3 space-y-2" aria-label="Prioritized action queue">
      <li
        v-for="action in actionList"
        :key="action.id"
        class="min-h-[44px] rounded-md border px-2.5 py-2 text-xs"
        :class="priorityToneClasses(action.priority)"
      >
        <p class="font-semibold">
          {{ priorityLabel(action.priority) }} priority · {{ action.title }}
        </p>
        <p class="mt-1 leading-relaxed">
          {{ action.detail }}
        </p>
        <p class="mt-1 text-[11px] text-slate-700">
          Expected impact: {{ action.expectedImpact }}
        </p>
      </li>
    </ol>
  </section>
</template>
