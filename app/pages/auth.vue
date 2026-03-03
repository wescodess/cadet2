<script setup lang="ts">
type Mode = 'sign-in' | 'sign-up'
type AuthResult = {
  error?: {
    message?: string
  } | null
}

const mode = ref<Mode>('sign-up')
const form = reactive({
  name: '',
  email: '',
  password: '',
})
const submitting = ref(false)
const formError = ref<string | null>(null)

const { signIn, signUp, loggedIn, waitForSession, fetchSession } = useUserSession()

if (import.meta.client) {
  await waitForSession()
  if (loggedIn.value) {
    await navigateTo('/workspace')
  }
}

async function submit() {
  submitting.value = true
  formError.value = null

  try {
    let result: AuthResult | undefined

    if (mode.value === 'sign-up') {
      result = await signUp.email({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      }) as AuthResult
    }
    else {
      result = await signIn.email({
        email: form.email.trim(),
        password: form.password,
      }) as AuthResult
    }

    if (result?.error) {
      formError.value = result.error.message ?? 'Authentication failed.'
      return
    }

    await fetchSession({ force: true })
    await navigateTo('/workspace')
  }
  catch (error) {
    formError.value = error instanceof Error ? error.message : 'Unexpected error.'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
    <div class="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div class="mb-6 space-y-2">
        <NuxtLink to="/" class="text-xs text-slate-400 hover:text-slate-200">
          ← Back
        </NuxtLink>
        <h1 class="text-2xl font-semibold text-white">
          {{ mode === 'sign-up' ? 'Create account' : 'Sign in' }}
        </h1>
        <p class="text-sm text-slate-400">
          Uses <code>useUserSession()</code> from Nuxt Better Auth.
        </p>
      </div>

      <div class="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-slate-950 p-1 text-sm">
        <button
          type="button"
          class="rounded-md px-3 py-2 transition"
          :class="mode === 'sign-up' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'"
          @click="mode = 'sign-up'"
        >
          Sign Up
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-2 transition"
          :class="mode === 'sign-in' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'"
          @click="mode = 'sign-in'"
        >
          Sign In
        </button>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <div v-if="mode === 'sign-up'" class="space-y-1">
          <label class="text-sm text-slate-300" for="name">Name</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            autocomplete="name"
            required
            class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-emerald-400"
            placeholder="Ada Lovelace"
          >
        </div>

        <div class="space-y-1">
          <label class="text-sm text-slate-300" for="email">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            autocomplete="email"
            required
            class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-emerald-400"
            placeholder="you@example.com"
          >
        </div>

        <div class="space-y-1">
          <label class="text-sm text-slate-300" for="password">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            required
            minlength="8"
            class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-emerald-400"
            placeholder="••••••••"
          >
        </div>

        <p v-if="formError" class="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {{ formError }}
        </p>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ submitting ? 'Please wait…' : mode === 'sign-up' ? 'Create Account' : 'Sign In' }}
        </button>
      </form>
    </div>
  </main>
</template>
