<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
})
</script>

<template>
  <WorkspaceShell>
    <NuxtPage />
  </WorkspaceShell>
</template>
