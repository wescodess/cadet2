import { requireAdminSession } from '../../utils/auth/requireAdminSession'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  throw createError({
    statusCode: 503,
    statusMessage: 'AI Search is disabled pending provider and corpus approval',
  })
})
