import { anyApi } from 'convex/server'
import { requireRagAdminSession } from '../../../../../utils/rag-admin'
import { createConvexAdminClient } from '../../../../../utils/convex-admin-client'

export default defineEventHandler(async (event) => {
  await requireRagAdminSession(event)
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
