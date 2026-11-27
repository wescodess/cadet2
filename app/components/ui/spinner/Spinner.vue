<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Loader2Icon } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { interfaceIconStroke } from '@/lib/relay/icons'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <Loader2Icon
    :stroke-width="interfaceIconStroke"
    role="status"
    aria-label="Loading"
    :class="
      cn(
        'size-4 animate-spin client:animate-spin-busy representative:animate-spin-busy',
        props.class,
      )
    "
  />
</template>
