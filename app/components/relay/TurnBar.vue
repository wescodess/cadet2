<script setup lang="ts">
import { cn } from '~/lib/utils'

const props = defineProps<{ class?: string }>()
</script>

<template>
  <nav
    aria-label="Whose turn"
    :class="cn('grid grid-cols-2 border-b border-border bg-background', props.class)"
  >
    <slot />
  </nav>
</template>
