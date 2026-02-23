import { CONVEX_INJECTION_KEY } from '@convex-vue/core'

type ConvexVueClientLike = {
  setAuth: (
    fetchToken: (args: { forceRefreshToken: boolean }) => Promise<string | null>,
    onChange?: (isAuthenticated: boolean) => void,
  ) => void
  client?: {
    clearAuth?: () => void
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const { loggedIn, ready, waitForSession } = useUserSession()

  const fetchConvexToken = async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
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
    }
    catch {
      return null
    }
  }

  const applyAuth = () => {
    const convexClient = (nuxtApp.vueApp._context.provides as Record<PropertyKey, unknown>)[CONVEX_INJECTION_KEY as symbol] as ConvexVueClientLike | undefined

    if (!convexClient) {
      return
    }

    if (!loggedIn.value) {
      convexClient.client?.clearAuth?.()
      return
    }

    convexClient.setAuth(fetchConvexToken)
  }

  const setup = async () => {
    await waitForSession()
    applyAuth()
  }

  // Kick off auth setup immediately so protected queries can subscribe sooner.
  void setup()

  nuxtApp.hook('app:mounted', () => {
    applyAuth()
  })

  watch([ready, loggedIn], () => {
    applyAuth()
  }, { immediate: false })
})
