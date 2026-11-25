<script setup lang="ts">
import { Minus, TrendingDown, TrendingUp } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{
  label: string
  value: string | number
  trend: 'up' | 'down' | 'neutral'
  trendLabel: string
}>()

const trendIcon = computed(() => {
  if (props.trend === 'up') {
    return TrendingUp
  }

  if (props.trend === 'down') {
    return TrendingDown
  }

  return Minus
})

const trendClasses = computed(() => {
  if (props.trend === 'up') {
    return 'text-emerald-700'
  }

  if (props.trend === 'down') {
    return 'text-rose-700'
  }

  return 'text-slate-600'
})

const testId = computed(() =>
  `comparison-stat-${props.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`,
)
</script>

<template>
  <Card
    :data-testid="testId"
    class="gap-3 rounded-3xl border-slate-200 bg-white px-5 py-5"
  >
    <div class="space-y-1">
      <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        {{ props.label }}
      </p>
      <p class="text-3xl font-semibold text-slate-950">
        {{ props.value }}
      </p>
    </div>

    <div
      class="inline-flex items-center gap-2 text-sm font-medium"
      :class="trendClasses"
    >
      <component :is="trendIcon" class="size-4" aria-hidden="true" />
      <span>{{ props.trendLabel }}</span>
    </div>
  </Card>
</template>
