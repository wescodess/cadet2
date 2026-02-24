<script setup lang="ts">
const { loggedIn, ready } = useUserSession()
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
    <div class="space-y-2">
      <p class="text-xs uppercase tracking-[0.2em] text-emerald-300">
        Nuxt + Better Auth + Convex
      </p>
      <h1 class="text-3xl font-semibold text-white">
        Minimal Auth + Protected Query Demo
      </h1>
      <p class="text-sm text-slate-300">
        Sign up or sign in, then open the protected page to fetch data with
        <code>useConvexQuery</code>.
      </p>
    </div>

    <div class="flex flex-wrap gap-3">
      <NuxtLink
        to="/auth"
        class="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm hover:bg-slate-800"
      >
        Open Auth Page
      </NuxtLink>
      <NuxtLink
        to="/tasks"
        class="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20"
      >
        Open Protected Tasks
      </NuxtLink>
      <NuxtLink
        to="/ai-search"
        class="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20"
      >
        Open AI Search Playground
      </NuxtLink>
      <NuxtLink
        to="/admin/rag-phase0"
        class="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/20"
      >
        Open RAG Phase 0
      </NuxtLink>
      <NuxtLink
        to="/admin/rag-sources"
        class="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/20"
      >
        Open RAG Sources
      </NuxtLink>
    </div>

    <div class="rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
      <p><span class="text-slate-400">Auth ready:</span> {{ ready ? 'yes' : 'no' }}</p>
      <p><span class="text-slate-400">Logged in:</span> {{ loggedIn ? 'yes' : 'no' }}</p>
    </div>
  </main>
</template>
