<script setup lang="ts">
import SignOutButton from '@/components/auth/SignOutButton.vue'

const { loggedIn } = useUserSession()
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
    <h1 class="text-3xl font-semibold">cadet2</h1>
    <p>Client and Representative portals are currently unavailable.</p>
    <SignOutButton v-if="loggedIn" />
    <NuxtLink v-else to="/auth" class="underline">Sign in or create an account</NuxtLink>
  </main>
</template>
