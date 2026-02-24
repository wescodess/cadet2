import { anyApi } from 'convex/server'
import { requireRagAdminSession } from '../../../../../utils/rag-admin'
import { createConvexAdminClient } from '../../../../../utils/convex-admin-client'

type BatchStatus = 'queued' | 'running' | 'ingesting' | 'sync_pending' | 'syncing' | 'completed' | 'failed'

export default defineEventHandler(async (event) => {
  await requireRagAdminSession(event)
  const query = getQuery(event) as {
    limit?: string
    status?: string
  }

  const parsedLimit = Number(query.limit)
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(100, Math.floor(parsedLimit))) : 20
  const status = query.status && ['queued', 'running', 'ingesting', 'sync_pending', 'syncing', 'completed', 'failed'].includes(query.status)
    ? query.status as BatchStatus
    : undefined

  const convex = await createConvexAdminClient()
  const result = await convex.query(
    (anyApi as any).ragIngestionInternal.listBatchesAsNuxtAdmin,
    {
      limit,
      status,
    },
  )

  return {
    ok: true,
    ...result,
  }
})
