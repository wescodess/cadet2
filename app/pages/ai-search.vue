<script setup lang="ts">
type QueryMode = 'search' | 'ai-search'

const mode = ref<QueryMode>('search')
const query = ref('What information is available in this knowledge base?')
const rewriteQuery = ref(true)
const maxNumResults = ref(5)
const scoreThreshold = ref<number | null>(null)
const pending = ref(false)
const errorMessage = ref('')
const responseBody = ref<unknown>(null)

const prettyResponse = computed(() => {
  if (!responseBody.value) {
    return ''
  }

  return JSON.stringify(responseBody.value, null, 2)
})

async function runQuery() {
  pending.value = true
  errorMessage.value = ''

  try {
    responseBody.value = await $fetch('/api/ai-search/query', {
      method: 'POST',
      body: {
        mode: mode.value,
        query: query.value,
        rewriteQuery: rewriteQuery.value,
        maxNumResults: maxNumResults.value,
        scoreThreshold: scoreThreshold.value ?? undefined,
      },
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed'
    errorMessage.value = message
    responseBody.value = null
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-16">
    <header class="space-y-2">
      <NuxtLink to="/" class="text-xs text-slate-400 hover:text-slate-200">
        ← Home
      </NuxtLink>
      <p class="text-xs uppercase tracking-[0.2em] text-cyan-300">
        Cloudflare AI Search
      </p>
      <h1 class="text-2xl font-semibold text-white">
        AI Search Query Playground
      </h1>
      <p class="text-sm text-slate-400">
        This page calls a server-side Nuxt API route that proxies Cloudflare AI Search so your API token stays private.
      </p>
    </header>

    <section class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <form class="space-y-4" @submit.prevent="runQuery">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="space-y-2 text-sm">
            <span class="text-slate-300">Mode</span>
            <select
              v-model="mode"
              class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            >
              <option value="search">
                search (retrieval only)
              </option>
              <option value="ai-search">
                ai-search (retrieval + generated answer)
              </option>
            </select>
          </label>

          <label class="space-y-2 text-sm">
            <span class="text-slate-300">Max results (1-50)</span>
            <input
              v-model.number="maxNumResults"
              type="number"
              min="1"
              max="50"
              class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            >
          </label>
        </div>

        <label class="block space-y-2 text-sm">
          <span class="text-slate-300">Query</span>
          <textarea
            v-model="query"
            rows="4"
            class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            placeholder="Ask a question against your Cloudflare AI Search index..."
          />
        </label>

        <div class="flex flex-wrap items-center gap-4">
          <label class="inline-flex items-center gap-2 text-sm text-slate-300">
            <input v-model="rewriteQuery" type="checkbox" class="size-4 rounded border-slate-600 bg-slate-900">
            Rewrite query
          </label>

          <label class="inline-flex items-center gap-2 text-sm text-slate-300">
            <span>Score threshold</span>
            <input
              :value="scoreThreshold ?? ''"
              type="number"
              min="0"
              max="1"
              step="0.05"
              class="w-28 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-slate-100"
              placeholder="optional"
              @input="scoreThreshold = ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value)"
            >
          </label>

          <button
            type="submit"
            class="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-60"
            :disabled="pending"
          >
            {{ pending ? 'Running…' : 'Run Query' }}
          </button>
        </div>
      </form>
    </section>

    <section class="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-medium text-slate-200">
          Response
        </h2>
        <p class="text-xs text-slate-500">
          Endpoint: <code>/api/ai-search/query</code>
        </p>
      </div>

      <p v-if="errorMessage" class="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
        {{ errorMessage }}
      </p>

      <p v-else-if="!responseBody" class="text-sm text-slate-400">
        Submit a query to test your Cloudflare AI Search instance.
      </p>

      <pre
        v-else
        class="overflow-x-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-200"
      ><code>{{ prettyResponse }}</code></pre>
    </section>
  </main>
</template>
