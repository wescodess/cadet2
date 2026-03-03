<script setup lang="ts">
type Phase0Response = {
  ok: boolean
  phase: string
  viewer: {
    userId: string
    email: string
    authorizationSource: 'rag_admins' | 'allowlist'
  }
  readiness: {
    overallReady: boolean
    checkedAt: string
    configSummary: Record<string, unknown>
    sections: Record<string, {
      ready: boolean
      missingEnvVars: string[]
      notes?: string[]
    }>
  }
}

definePageMeta({
  middleware: ['auth', 'admin'],
})

const { loggedIn, waitForSession } = useUserSession()
const pending = ref(false)
const errorMessage = ref('')
const result = ref<Phase0Response | null>(null)

async function loadReadiness() {
  pending.value = true
  errorMessage.value = ''

  try {
    result.value = await $fetch<Phase0Response>('/api/admin/rag/phase0-readiness', {
      method: 'GET',
    })
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Request failed'
    result.value = null
  }
  finally {
    pending.value = false
  }
}

if (import.meta.client) {
  await waitForSession()

  if (!loggedIn.value) {
    await navigateTo('/auth')
  }
  else {
    await loadReadiness()
  }
}

const sectionEntries = computed(() => {
  if (!result.value) {
    return []
  }

  return Object.entries(result.value.readiness.sections)
})
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-16">
    <header class="space-y-2">
      <NuxtLink to="/" class="text-xs text-slate-400 hover:text-slate-200">
        ← Home
      </NuxtLink>
      <p class="text-xs uppercase tracking-[0.2em] text-amber-300">
        RAG Foundation
      </p>
      <h1 class="text-2xl font-semibold text-white">
        Phase 0 Readiness Check
      </h1>
      <p class="text-sm text-slate-400">
        Verifies environment naming, AI Search / AI Gateway / OpenRouter config presence, and admin allowlist access.
      </p>
    </header>

    <section class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm text-slate-300">
            Run the Phase 0 readiness check from an admin account.
          </p>
          <p v-if="result" class="mt-1 text-xs text-slate-500">
            Checked at {{ result.readiness.checkedAt }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-60"
          :disabled="pending"
          @click="loadReadiness"
        >
          {{ pending ? 'Checking…' : 'Recheck' }}
        </button>
      </div>
    </section>

    <p v-if="errorMessage" class="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
      {{ errorMessage }}
    </p>

    <template v-else-if="result">
      <section class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div class="flex flex-wrap items-center gap-3">
          <span
            class="inline-flex rounded-full border px-3 py-1 text-xs"
            :class="result.readiness.overallReady ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/40 bg-amber-500/10 text-amber-200'"
          >
            {{ result.readiness.overallReady ? 'Ready for Phase 1' : 'Phase 0 Incomplete' }}
          </span>
          <p class="text-sm text-slate-300">
            Admin: <code>{{ result.viewer.email }}</code> (authorized via {{ result.viewer.authorizationSource }})
          </p>
        </div>
      </section>

      <section class="grid gap-4 md:grid-cols-2">
        <article
          v-for="[name, section] in sectionEntries"
          :key="name"
          class="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
        >
          <div class="mb-2 flex items-center justify-between gap-2">
            <h2 class="text-sm font-medium capitalize text-slate-200">
              {{ name }}
            </h2>
            <span
              class="inline-flex rounded-full border px-2 py-0.5 text-[11px]"
              :class="section.ready ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/40 bg-rose-500/10 text-rose-200'"
            >
              {{ section.ready ? 'ready' : 'missing config' }}
            </span>
          </div>

          <ul v-if="section.missingEnvVars.length" class="space-y-1 text-xs text-amber-200">
            <li v-for="missingVar in section.missingEnvVars" :key="missingVar">
              Missing: <code>{{ missingVar }}</code>
            </li>
          </ul>

          <p v-else class="text-xs text-slate-400">
            No missing required environment variables.
          </p>

          <ul v-if="section.notes?.length" class="mt-3 space-y-1 text-xs text-slate-500">
            <li v-for="note in section.notes" :key="note">
              {{ note }}
            </li>
          </ul>
        </article>
      </section>

      <section class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h2 class="text-sm font-medium text-slate-200">
            Config Summary (Redacted)
          </h2>
          <p class="text-xs text-slate-500">
            Presence only, no secret values returned
          </p>
        </div>
        <pre class="overflow-x-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-200"><code>{{ JSON.stringify(result.readiness.configSummary, null, 2) }}</code></pre>
      </section>
    </template>

    <p v-else class="text-sm text-slate-400">
      Run the readiness check to validate Phase 0 prerequisites.
    </p>
  </main>
</template>
