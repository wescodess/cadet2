import { anyApi } from 'convex/server'
import { recordGovernanceAction } from '../../../../../utils/audit/recordGovernanceAction'
import { requireAdminSession } from '../../../../../utils/auth/requireAdminSession'
import {
  createConvexAdminClient,
  createConvexAdminClientActingAs,
} from '../../../../../utils/convex-admin-client'
import { rejectEvidenceSourceActionSchema } from '../../../../../utils/admin/evidenceSourceSchema'

export default defineEventHandler(async (event) => {
  const adminSession = await requireAdminSession(event, {
    allowBootstrapFromAllowlist: true,
  })
  const { session } = adminSession
  const sourceId = getRouterParam(event, 'sourceId')

  if (!sourceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'sourceId is required',
    })
  }

  const body = await readBody<unknown>(event)
  const parsed = rejectEvidenceSourceActionSchema.safeParse(body ?? {})

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const issuePath = issue?.path.join('.') || 'payload'

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${issuePath}: ${issue?.message || 'Request body is invalid'}`,
    })
  }

  const actingAsClient = await createConvexAdminClientActingAs(event, {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  })
  const beforeDetail = await actingAsClient.query(
    (anyApi as any).ragSources.getSource,
    { sourceId },
  ) as {
    source: Record<string, unknown> | null
  } | null
  const convex = await createConvexAdminClient()
  const result = await convex.mutation(
    (anyApi as any).ragSourcesInternal.rejectSourceAsNuxtAdmin,
    {
      sourceId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      reason: parsed.data.reason,
    },
  )

  const afterDetail = await actingAsClient.query(
    (anyApi as any).ragSources.getSource,
    { sourceId },
  ) as {
    source: Record<string, unknown> | null
  } | null

  await recordGovernanceAction(event, {
    actionType: 'EVIDENCE_SOURCE_REJECTED',
    entityType: 'EVIDENCE_SOURCE',
    entityId: sourceId,
    entityLabel: String((afterDetail?.source as { name?: unknown } | null)?.name || sourceId),
    changeContext: {
      before: beforeDetail?.source || null,
      after: afterDetail?.source || null,
    },
    reason: parsed.data.reason,
  }, adminSession)

  return {
    ok: true,
    ...result,
  }
})
