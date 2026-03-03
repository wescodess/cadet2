import { anyApi } from 'convex/server'
import { requireAdminSession } from '../../../../../utils/auth/requireAdminSession'
import { createConvexAdminClient } from '../../../../../utils/convex-admin-client'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const batchId = getRouterParam(event, 'batchId')

  if (!batchId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'batchId is required',
    })
  }

  const convex = await createConvexAdminClient()
  const result = await convex.query(
    (anyApi as any).ragIngestionInternal.getBatchDetailAsNuxtAdmin,
    {
      batchId,
    },
  )

  if (!result) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Batch not found',
    })
  }

  return {
    ok: true,
    ...result,
  }
})
