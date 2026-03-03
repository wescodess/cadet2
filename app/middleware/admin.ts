type AdminAccessError = {
  statusCode?: number
  response?: {
    status?: number
  }
}

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    return
  }

  const { loggedIn, waitForSession } = useUserSession()
  await waitForSession()

  if (!loggedIn.value) {
    return navigateTo('/auth')
  }

  try {
    await $fetch('/api/admin/access')
  }
  catch (error) {
    const statusCode = (error as AdminAccessError).statusCode
      ?? (error as AdminAccessError).response?.status

    if (statusCode === 401 || statusCode === 403) {
      return navigateTo('/workspace')
    }

    throw error
  }
})
