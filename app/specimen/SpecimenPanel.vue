<script setup lang="ts">
import { useTemplateRef } from 'vue'
import SharedControlsSpecimen from './SharedControlsSpecimen.vue'

defineProps<{
  theme: 'light' | 'dark'
  expression: 'client' | 'representative'
  tag: string
}>()

const menus = useTemplateRef<HTMLElement>('menus')
</script>

<template>
  <div
    :class="['min-w-0', theme === 'dark' ? 'dark' : undefined]"
    :data-expression="expression"
    :data-specimen-panel="`${expression}-${theme}`"
  >
    <div class="min-w-0 rounded-2xl border border-border bg-background p-7 text-foreground">
      <p
        class="mb-6 flex justify-between gap-3 font-sans text-sm font-medium text-muted-foreground"
      >
        <span>{{ theme === 'dark' ? 'Dark theme' : 'Light theme' }}</span>
        <span>{{ tag }}</span>
      </p>
      <slot />
      <SharedControlsSpecimen
        :id-prefix="`controls-${expression}-${theme}`"
        :menus="menus ?? undefined"
      />
    </div>
    <div ref="menus" data-specimen-menus />
  </div>
</template>
