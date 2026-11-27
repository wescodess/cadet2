<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <kbd
    :class="
      cn(
        'bg-muted text-muted-foreground border-border pointer-events-none inline-flex h-4.5 w-fit min-w-4.5 items-center justify-center gap-1 rounded-md border px-1.25 font-sans text-xs leading-none font-medium select-none',
        'on-primary:bg-transparent on-primary:text-current on-primary:border-primary-foreground/45',
        '[&_svg:not([class*=\'size-\'])]:size-3',
        '[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10',
        props.class,
      )
    "
  >
    <slot />
  </kbd>
</template>
