export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    return
  }

  const { loggedIn, waitForSession } = useUserSession()

  await waitForSession()

  if (!loggedIn.value) {
    return navigateTo('/auth')
  }
})
