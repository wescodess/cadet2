<script setup lang="ts">
import type { RecommendationRunHistoryStatus } from '~/lib/workspace/recommendation-run-history'

import { AlertTriangle, CheckCircle2, CircleX } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{
  status: RecommendationRunHistoryStatus
}>()

const statusConfig = computed(() => {
  if (props.status === 'completed') {
    return {
      label: 'Completed',
      icon: CheckCircle2,
      classes: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    }
  }

  if (props.status === 'degraded') {
    return {
      label: 'Degraded',
      icon: AlertTriangle,
      classes: 'border-caution/30 bg-caution-soft text-caution-ink',
    }
  }

  return {
    label: 'Failed',
    icon: CircleX,
    classes: 'border-negative/25 bg-negative-soft text-negative-ink',
  }
})
</script>

<template>
  <Badge
    data-testid="run-status-badge"
    variant="outline"
    class="min-h-[32px] gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
    :class="statusConfig.classes"
  >
    <component :is="statusConfig.icon" class="size-3.5" aria-hidden="true" />
    <span>{{ statusConfig.label }}</span>
  </Badge>
</template>
