import { anyApi } from 'convex/server'
import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import { createConvexAdminClient } from '../../../utils/convex-admin-client'
import { getRagFoundationConfig } from '../../../utils/rag-foundation'
import { executePreparedBatchPhase3 } from '../../../utils/rag-ingestion-phase3'
import { maybeRunAiSearchSyncForBatch } from '../../../utils/cloudflare-ai-search-sync'

type SchedulerBody = {
  idempotencyKey?: unknown
  force?: unknown
  scheduledFor?: unknown
}

function getSchedulerSecretFromRequest(event: H3Event) {
  const headerSecret = getHeader(event, 'x-rag-scheduler-secret')?.trim()
  if (headerSecret) {
    return headerSecret
  }

  const authorization = getHeader(event, 'authorization')?.trim()
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim()
  }

  return ''
}

function buildScheduledIdempotencyKey(scheduledFor: number) {
  const utcDate = new Date(scheduledFor).toISOString().slice(0, 10)
  return `scheduled:${utcDate}:global`
}

export default defineEventHandler(async (event) => {
  const body = await readBody<SchedulerBody>(event).catch(() => ({} as SchedulerBody))
  const config = getRagFoundationConfig(event)

  if (!config.rag.schedulerSecret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'RAG scheduler secret is not configured',
      data: {
        requiredEnvVars: ['NUXT_RAG_SCHEDULER_SECRET'],
      },
    })
  }

  const providedSecret = getSchedulerSecretFromRequest(event)
  if (!providedSecret || providedSecret !== config.rag.schedulerSecret) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid scheduler secret',
    })
  }

  const scheduledFor = typeof body?.scheduledFor === 'number' && Number.isFinite(body.scheduledFor)
    ? Math.floor(body.scheduledFor)
    : Date.now()
  const rawIdempotencyKey = typeof body?.idempotencyKey === 'string' ? body.idempotencyKey.trim() : ''
  const idempotencyKey = rawIdempotencyKey || buildScheduledIdempotencyKey(scheduledFor)

  const convex = await createConvexAdminClient()
  const result = await convex.mutation(
    (anyApi as any).ragIngestionInternal.prepareScheduledBatch,
    {
      idempotencyKey,
      scheduledFor,
      force: typeof body?.force === 'boolean' ? body.force : undefined,
    },
  )

  let finalStatus: unknown = null
  let syncStatus: unknown = null
  if (!result.reused && typeof result.batchId === 'string') {
    finalStatus = await executePreparedBatchPhase3(convex as any, result.batchId)
    syncStatus = await maybeRunAiSearchSyncForBatch(convex as any, {
      batchId: result.batchId,
      cloudflareAiSearch: config.aiSearch,
    })
  }

  return {
    ok: true,
    ...result,
    status: (syncStatus as any)?.batchStatus ?? (finalStatus as any)?.status ?? result.status,
    summary: (finalStatus as any)?.summary ?? result.summary,
    finalStatus,
    syncStatus,
  }
})
