<script setup lang="ts">
import { CloudCheck, CloudOff, LoaderCircle } from 'lucide-vue-next'

import { interfaceIconStroke } from '~/lib/relay/icons'
import { cn } from '~/lib/utils'

const props = defineProps<{
  state: 'saving' | 'saved' | 'offline'
  label: string
  class?: string
}>()

const colours = {
  saving: 'text-muted-foreground',
  saved: 'text-positive-ink',
  offline: 'text-caution-ink',
} as const
</script>

<template>
  <p
    role="status"
    :data-state="state"
    :class="
      cn('inline-flex items-center gap-1.5 text-small font-medium', colours[state], props.class)
    "
  >
    <LoaderCircle
      v-if="state === 'saving'"
      :size="16"
      :stroke-width="interfaceIconStroke"
      class="shrink-0 animate-spin-save"
      aria-hidden="true"
    />
    <CloudCheck
      v-else-if="state === 'saved'"
      :size="16"
      :stroke-width="interfaceIconStroke"
      class="shrink-0"
      aria-hidden="true"
    />
    <CloudOff
      v-else
      :size="16"
      :stroke-width="interfaceIconStroke"
      class="shrink-0"
      aria-hidden="true"
    />
    <span>{{ label }}</span>
  </p>
</template>
