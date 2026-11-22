<script setup lang="ts">
import { CloudCheck, CloudOff, LoaderCircle } from 'lucide-vue-next'

import { cn } from '~/lib/utils'

const props = defineProps<{
  state: 'saving' | 'saved' | 'offline'
  label: string
  class?: string
}>()

const looks = {
  saving: { icon: LoaderCircle, colour: 'text-muted-foreground', motion: 'animate-spin-save' },
  saved: { icon: CloudCheck, colour: 'text-positive-ink', motion: '' },
  offline: { icon: CloudOff, colour: 'text-caution-ink', motion: '' },
} as const
</script>

<template>
  <p
    role="status"
    :data-state="state"
    :class="
      cn(
        'inline-flex items-center gap-1.5 text-small font-medium',
        looks[state].colour,
        props.class,
      )
    "
  >
    <component
      :is="looks[state].icon"
      :size="16"
      :stroke-width="1.75"
      :class="cn('shrink-0', looks[state].motion)"
      aria-hidden="true"
    />
    <span>{{ label }}</span>
  </p>
</template>
