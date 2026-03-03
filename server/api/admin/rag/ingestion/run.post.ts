import { anyApi } from 'convex/server'
import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import { createConvexAdminClient } from '../../../../utils/convex-admin-client'
import { executePreparedBatchPhase3 } from '../../../../utils/rag-ingestion-phase3'
import { maybeRunAiSearchSyncForBatch } from '../../../../utils/cloudflare-ai-search-sync'
import { getRagFoundationConfig } from '../../../../utils/rag-foundation'

type ManualIngestionRunBody = {
  mode?: unknown
  sourceIds?: unknown
  idempotencyKey?: unknown
  force?: unknown
  scheduledFor?: unknown
}

function parseSourceIds(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined
  }

  const ids = value
    .map(item => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean)

  return ids.length > 0 ? [...new Set(ids)] : undefined
}

function buildManualIdempotencyKey(now: Date) {
  const base = now.toISOString().replace(/\.\d{3}Z$/, 'Z')
  return `manual:${base}:${crypto.randomUUID().slice(0, 8)}`
}

export default defineEventHandler(async (event) => {
  const { session } = await requireAdminSession(event)
  const body = await readBody<ManualIngestionRunBody>(event)

  if (body?.mode !== undefined && body.mode !== 'manual') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Only mode="manual" is supported for this endpoint',
    })
  }

  const sourceIds = parseSourceIds(body?.sourceIds)
  const rawIdempotencyKey = typeof body?.idempotencyKey === 'string' ? body.idempotencyKey.trim() : ''
  const idempotencyKey = rawIdempotencyKey || buildManualIdempotencyKey(new Date())
  const scheduledFor = typeof body?.scheduledFor === 'number' && Number.isFinite(body.scheduledFor)
    ? Math.floor(body.scheduledFor)
    : undefined

  const convex = await createConvexAdminClient()
  const foundation = getRagFoundationConfig(event)
  const result = await convex.mutation(
    (anyApi as any).ragIngestionInternal.prepareManualBatchAsNuxtAdmin,
    {
      idempotencyKey,
      sourceIds,
      force: typeof body?.force === 'boolean' ? body.force : undefined,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      scheduledFor,
    },
  )

  let finalStatus: unknown = null
  let syncStatus: unknown = null
  if (!result.reused && typeof result.batchId === 'string') {
    finalStatus = await executePreparedBatchPhase3(convex as any, result.batchId)
    syncStatus = await maybeRunAiSearchSyncForBatch(convex as any, {
      batchId: result.batchId,
      cloudflareAiSearch: foundation.aiSearch,
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
