<script setup lang="ts">
import { computed } from 'vue'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatPathwayStatusLabel, type PathwayDefinitionStatus } from '@/lib/admin/pathwayDefinitions'

const props = defineProps<{
  status: PathwayDefinitionStatus
}>()

const statusClass = computed(() => {
  if (props.status === 'active') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
  }

  if (props.status === 'inactive') {
    return 'border-amber-500/30 bg-amber-500/15 text-amber-700'
  }

  return 'border-slate-300 bg-slate-100 text-slate-700'
})
</script>

<template>
  <Badge
    :class="cn('gap-2 border text-xs font-semibold', statusClass)"
    :data-testid="`admin-pathway-status-badge`"
    variant="outline"
  >
    <span class="size-1.5 rounded-full bg-current" aria-hidden="true" />
    {{ formatPathwayStatusLabel(status) }}
  </Badge>
</template>
