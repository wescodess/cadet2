import { anyApi } from 'convex/server'

import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'

export default defineEventHandler(async (event) => {
  const adminSession = await requireAdminSession(event)
  const { convex } = adminSession
  const sourceId = getRouterParam(event, 'sourceId')

  if (!sourceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'sourceId is required',
    })
  }

  const result = await convex.mutation((anyApi as any).ragSources.removeSource, { sourceId })

  return {
    ok: true,
    ...result,
  }
})
