type AdminAccessError = {
  statusCode?: number
  response?: {
    status?: number
  }
}

export default defineNuxtRouteMiddleware(async () => {
  try {
    await $fetch('/api/admin/access', {
      headers: import.meta.server ? useRequestHeaders(['cookie']) : undefined,
    })
  }
  catch (error) {
    const statusCode = (error as AdminAccessError).statusCode
      ?? (error as AdminAccessError).response?.status

    if (statusCode === 401) {
      return navigateTo('/auth')
    }

    if (statusCode === 403) {
      return navigateTo('/workspace')
    }

    throw error
  }
})
