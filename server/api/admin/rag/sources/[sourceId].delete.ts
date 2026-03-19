import { anyApi } from 'convex/server'

import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import { createConvexAdminClient } from '../../../../utils/convex-admin-client'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event, {
    allowBootstrapFromAllowlist: true,
  })
  const sourceId = getRouterParam(event, 'sourceId')

  if (!sourceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'sourceId is required',
    })
  }

  const convex = await createConvexAdminClient()
  const result = await convex.mutation(
    (anyApi as any).ragSourcesInternal.removeSourceAsNuxtAdmin,
    { sourceId },
  )

  return {
    ok: true,
    ...result,
  }
})
