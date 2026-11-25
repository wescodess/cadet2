<script lang="ts" setup>
import type { HTMLAttributes } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import { interfaceIconStroke } from '@/lib/relay/icons'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <li
    data-slot="breadcrumb-separator"
    role="presentation"
    aria-hidden="true"
    :class="cn('[&>svg]:size-3.5', props.class)"
  >
    <slot>
      <ChevronRight :stroke-width="interfaceIconStroke" />
    </slot>
  </li>
</template>
