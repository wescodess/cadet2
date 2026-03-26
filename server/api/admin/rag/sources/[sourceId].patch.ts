import { anyApi } from 'convex/server'

import { recordGovernanceAction } from '../../../../utils/audit/recordGovernanceAction'
import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import { createConvexAdminClientActingAs } from '../../../../utils/convex-admin-client'
import {
  evidenceSourceDetailSchema,
  toEvidenceAuditRecord,
  toEvidenceSourceRecord,
  updateEvidenceSourceSchema,
} from '../../../../utils/admin/evidenceSourceSchema'

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
  const parsed = updateEvidenceSourceSchema.safeParse(body ?? {})

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const issuePath = issue?.path.join('.') || 'payload'

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${issuePath}: ${issue?.message || 'Request body is invalid'}`,
    })
  }

  const convex = await createConvexAdminClientActingAs(event, {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  })

  const beforeDetail = await convex.query(
    (anyApi as any).ragSources.getSource,
    { sourceId },
  ) as {
    source: Record<string, unknown> | null
  } | null

  await convex.mutation(
    (anyApi as any).ragSources.updateSourceConfig,
    {
      sourceId,
      ...parsed.data,
    },
  )

  const detail = await convex.query(
    (anyApi as any).ragSources.getSource,
    { sourceId },
  ) as {
    source: Record<string, unknown> | null
    audit: Array<Record<string, unknown>>
    currentUserIsAdmin: boolean
  } | null

  if (!detail?.source) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Source not found after update',
    })
  }

  await recordGovernanceAction(event, {
    actionType: 'EVIDENCE_SOURCE_UPDATED',
    entityType: 'EVIDENCE_SOURCE',
    entityId: sourceId,
    entityLabel: String((detail.source as { name?: unknown }).name || sourceId),
    changeContext: {
      before: beforeDetail?.source || null,
      after: detail.source,
    },
  }, adminSession)

  return evidenceSourceDetailSchema.parse({
    currentUserIsAdmin: detail.currentUserIsAdmin,
    source: toEvidenceSourceRecord(detail.source as never),
    audit: (detail.audit || []).map(item => toEvidenceAuditRecord(item as never)),
  })
})
