<script setup lang="ts">
const props = defineProps<{
  tier: 'strong-fit' | 'conditional-fit' | 'lower-confidence'
  qualification: 'supported' | 'low-confidence' | 'withheld'
  confidence: 'high' | 'medium' | 'low' | 'withheld'
}>()

function getTierLabel(tier: 'strong-fit' | 'conditional-fit' | 'lower-confidence') {
  if (tier === 'strong-fit') {
    return 'Strong fit'
  }

  if (tier === 'conditional-fit') {
    return 'Conditional fit'
  }

  return 'Lower confidence'
}

function getTierMeaning(tier: 'strong-fit' | 'conditional-fit' | 'lower-confidence') {
  if (tier === 'strong-fit') {
    return 'High alignment with your submitted profile.'
  }

  if (tier === 'conditional-fit') {
    return 'Partial alignment with caveats to review with caution.'
  }

  return 'Low-confidence guidance; review with caution.'
}

function getToneClass(tier: 'strong-fit' | 'conditional-fit' | 'lower-confidence', qualification: 'supported' | 'low-confidence' | 'withheld') {
  if (qualification === 'withheld') {
    return 'border-rose-200 bg-rose-50 text-rose-800'
  }

  if (tier === 'strong-fit') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  }

  if (tier === 'conditional-fit') {
    return 'border-amber-200 bg-amber-50 text-amber-800'
  }

  return 'border-slate-300 bg-slate-100 text-slate-800'
}

const tierLabel = computed(() => getTierLabel(props.tier))
const tierMeaning = computed(() => getTierMeaning(props.tier))
const toneClass = computed(() => getToneClass(props.tier, props.qualification))

const accessibilityLabel = computed(() => `${tierLabel.value}. ${tierMeaning.value} Confidence: ${props.confidence}.`)
</script>

<template>
  <span
    data-testid="recommendation-tier-badge"
    class="inline-flex flex-wrap items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold"
    :class="toneClass"
    :aria-label="accessibilityLabel"
  >
    <span>{{ tierLabel }}</span>
    <span class="font-normal">• {{ tierMeaning }}</span>
  </span>
</template>
