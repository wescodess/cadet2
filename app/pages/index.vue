<script setup lang="ts">
const { loggedIn, ready } = useUserSession()
</script>

<template>
  <main
    data-testid="home-page"
    class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16"
  >
    <div class="space-y-2">
      <p class="text-xs uppercase tracking-[0.2em] text-[var(--warning)]">
        Cadet secure workspace
      </p>
      <h1
        data-testid="home-hero"
        class="text-3xl font-semibold text-slate-950"
      >
        Protected planning starts in your workspace.
      </h1>
      <p class="text-sm text-slate-600">
        Sign in to enter the secure workspace shell. The legacy tasks demo still exists, but it is no longer the
        primary post-login destination.
      </p>
    </div>

    <div class="flex flex-wrap gap-3">
      <NuxtLink
        to="/auth"
        data-testid="home-open-auth-link"
        class="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-100"
      >
        Open Auth Page
      </NuxtLink>
      <NuxtLink
        to="/workspace"
        data-testid="home-open-workspace-link"
        class="rounded-md border border-slate-200 bg-[var(--trust-soft)] px-4 py-2 text-sm text-[var(--trust)] hover:bg-slate-100"
      >
        Open Workspace
      </NuxtLink>
      <NuxtLink
        to="/tasks"
        data-testid="home-open-legacy-tasks-link"
        class="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
      >
        Open Legacy Tasks
      </NuxtLink>
      <NuxtLink
        to="/ai-search"
        data-testid="home-open-ai-search-link"
        class="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-700 hover:bg-cyan-500/20"
      >
        Open AI Search Playground
      </NuxtLink>
      <NuxtLink
        to="/admin/rag-phase0"
        data-testid="home-open-rag-phase0-link"
        class="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 hover:bg-amber-500/20"
      >
        Open RAG Phase 0
      </NuxtLink>
      <NuxtLink
        to="/admin/rag-sources"
        data-testid="home-open-rag-sources-link"
        class="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-500/20"
      >
        Open RAG Sources
      </NuxtLink>
    </div>

    <div
      data-testid="home-auth-status"
      class="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-900"
    >
      <p><span class="text-slate-500">Auth ready:</span> {{ ready ? 'yes' : 'no' }}</p>
      <p><span class="text-slate-500">Logged in:</span> {{ loggedIn ? 'yes' : 'no' }}</p>
    </div>
  </main>
</template>
