import { throwSourceError } from '../../../../utils/admin/sourceError'
import { anyApi } from 'convex/server'

import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import {
  evidenceSourceDetailSchema,
  toEvidenceAuditRecord,
  toEvidenceSourceRecord,
  updateEvidenceSourceSchema,
} from '../../../../utils/admin/evidenceSourceSchema'

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

  await convex
    .mutation((anyApi as any).ragSources.updateSourceConfig, {
      sourceId,
      ...parsed.data,
      description: parsed.data.description === null ? '' : parsed.data.description,
    })
    .catch(throwSourceError)

  const detail = (await convex.query((anyApi as any).ragSources.getSource, { sourceId })) as {
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

  return evidenceSourceDetailSchema.parse({
    currentUserIsAdmin: detail.currentUserIsAdmin,
    source: toEvidenceSourceRecord(detail.source as never),
    audit: (detail.audit || []).map((item) => toEvidenceAuditRecord(item as never)),
  })
})
