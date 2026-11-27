<script setup lang="ts">
defineProps<{ title: string; note: string }>()
</script>

<template>
  <section class="border-t border-border py-7 first:border-t-0 first:pt-0">
    <h3 class="mb-1 font-sans text-base font-bold">{{ title }}</h3>
    <p class="mb-4 max-w-prose font-sans text-sm text-muted-foreground">{{ note }}</p>
    <slot />
  </section>
</template>
