<script setup lang="ts">
import { api } from '../../convex/_generated/api'

type DemoTask = {
  id: string
  title: string
  ownerId: string
  identitySubject: string
}

const { user, loggedIn, ready, waitForSession, signOut } = useUserSession()
const convex = useConvex()

let tasks = ref<DemoTask[] | null>(null)
let pending = ref(false)
let error = ref<Error | null>(null)
let refresh = async () => {}
let stopTaskSubscription: (() => void) | null = null

async function fetchConvexToken({ forceRefreshToken }: { forceRefreshToken: boolean }) {
  try {
    const url = new URL('/api/auth/convex/token', window.location.origin)
    if (forceRefreshToken) {
      url.searchParams.set('forceRefresh', '1')
    }

    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        accept: 'application/json',
      },
    })

    if (!res.ok) {
      return null
    }

    const raw = await res.text()
    if (!raw) {
      return null
    }

    const body = JSON.parse(raw) as { token?: string } | null
    return body?.token ?? null
  } catch {
    return null
  }
}

watch(
  [ready, loggedIn],
  ([isReady, isLoggedIn]) => {
    if (!import.meta.client || !isReady || isLoggedIn) {
      return
    }

    stopTaskSubscription?.()
    stopTaskSubscription = null
    tasks.value = null
    error.value = null
    pending.value = false
    void navigateTo('/auth')
  },
  { immediate: true },
)

if (import.meta.client) {
  await waitForSession()
  if (!loggedIn.value || !user.value?.id) {
    pending.value = false
  } else {
    const userId = user.value.id

    // Prewarm Convex auth to avoid an initial unauthorized subscription race.
    convex.setAuth(fetchConvexToken)
    await fetchConvexToken({ forceRefreshToken: false })
    await nextTick()

    const subscribeTasks = () => {
      stopTaskSubscription?.()
      pending.value = true
      error.value = null

      stopTaskSubscription = convex.onUpdate(
        api.tasks.list,
        { userId },
        (result) => {
          tasks.value = (result ?? null) as DemoTask[] | null
          pending.value = false
        },
        (queryError) => {
          error.value = queryError instanceof Error ? queryError : new Error(String(queryError))
          pending.value = false
        },
      )
    }

    refresh = async () => {
      subscribeTasks()
    }

    subscribeTasks()
  }
}

onScopeDispose(() => {
  stopTaskSubscription?.()
})

async function logout() {
  await signOut({
    onSuccess: async () => {
      window.location.assign('/auth')
    },
  })
}
</script>

<template>
  <main
    data-testid="tasks-page"
    class="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-16"
  >
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-1">
        <NuxtLink to="/" class="text-xs text-slate-400 hover:text-slate-200"> ← Home </NuxtLink>
        <h1 data-testid="tasks-heading" class="text-2xl font-semibold text-white">
          Protected Convex Query
        </h1>
        <p class="text-sm text-slate-400">
          Uses <code>useUserSession()</code> + a client-side Convex subscription for demo task
          updates.
        </p>
      </div>

      <button
        type="button"
        data-testid="tasks-sign-out"
        class="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm hover:bg-slate-800"
        @click="logout"
      >
        Sign Out
      </button>
    </header>

    <section
      data-testid="tasks-session-summary"
      class="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm"
    >
      <p class="text-slate-300">
        <span class="text-slate-400">User ID:</span>
        <code data-testid="tasks-user-id" class="ml-1">{{ user?.id ?? 'not loaded' }}</code>
      </p>
      <p class="mt-1 text-slate-300">
        <span class="text-slate-400">Email:</span>
        <code data-testid="tasks-user-email" class="ml-1">{{ user?.email ?? 'not loaded' }}</code>
      </p>
    </section>

    <section
      data-testid="tasks-list-panel"
      class="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
    >
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-sm font-medium text-slate-200">Demo Tasks (from Convex)</h2>
        <button
          type="button"
          class="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          @click="refresh()"
        >
          Refresh
        </button>
      </div>

      <p v-if="pending" class="text-sm text-slate-400">Loading tasks…</p>

      <p
        v-else-if="error"
        data-testid="tasks-error-state"
        class="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
      >
        {{ error.message }}
      </p>

      <ul v-else-if="tasks?.length" data-testid="tasks-list" class="space-y-2">
        <li
          v-for="task in tasks"
          :key="task.id"
          class="rounded-lg border border-slate-800 bg-slate-950/70 p-3"
        >
          <p class="font-medium text-slate-100">
            {{ task.title }}
          </p>
          <p class="mt-1 text-xs text-slate-400">
            ownerId: <code>{{ task.ownerId }}</code>
          </p>
          <p class="mt-1 text-xs text-slate-400">
            identitySubject: <code>{{ task.identitySubject }}</code>
          </p>
        </li>
      </ul>

      <p v-else data-testid="tasks-empty-state" class="text-sm text-slate-400">No tasks yet.</p>
    </section>
  </main>
</template>
