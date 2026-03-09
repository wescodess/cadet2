<script setup lang="ts">
const props = defineProps<{
  steps: string[]
}>()

// TODO: Keep in sync with server/utils/pathways/mvpPathwayCatalog.ts
// If the MVP pathway catalogue is expanded, add new entries here to avoid
// falling back to the raw step-id string displayed via humanizeStep().
const stepLabels: Record<string, string> = {
  'mvp-skilled-worker': 'Start from the Skilled Worker route',
  'mvp-provincial-nominee': 'Use the Provincial Nominee route as the bridge',
  'mvp-study-to-work': 'Use the Study-to-Work route as the bridge',
  'secure-valid-job-offer': 'Secure a valid job offer',
  'expand-relocation-scope': 'Expand relocation scope',
  'build-study-budget': 'Build a stronger study budget',
  'commit-to-study-upgrade': 'Commit to a study or retraining step',
  'extend-planning-timeline': 'Extend the planning timeline',
  'gain-targeted-work-and-language-proof': 'Build targeted work and language proof',
  'stabilize-settlement-funds': 'Stabilize settlement funds',
}

function humanizeStep(step: string) {
  if (stepLabels[step]) {
    return stepLabels[step]
  }

  // Fallback: convert kebab-case to sentence-case for unknown step IDs
  const words = step.replace(/-/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
</script>

<template>
  <section
    data-testid="recommendation-milestone-route"
    class="rounded-xl border border-[var(--primary,#6366f1)]/15 bg-[var(--primary,#6366f1)]/5 p-3"
    aria-label="Strategic route milestones"
  >
    <p class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary,#6366f1)]">
      Strategic route milestones
    </p>
    <ol class="mt-3 space-y-2">
      <li
        v-for="(step, index) in props.steps"
        :key="`${step}:${index}`"
        class="min-h-[44px] rounded-xl border border-white/70 bg-white/90 px-3 py-2 text-sm text-slate-800"
      >
        <span class="font-semibold text-slate-950">Step {{ index + 1 }}</span>
        <span> · {{ humanizeStep(step) }}</span>
      </li>
    </ol>
  </section>
</template>
