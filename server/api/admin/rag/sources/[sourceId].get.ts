import { anyApi } from 'convex/server'

import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import {
  evidenceSourceDetailSchema,
  toEvidenceAuditRecord,
  toEvidenceSourceRecord,
} from '../../../../utils/admin/evidenceSourceSchema'

export default defineEventHandler(async (event) => {
  const { convex } = await requireAdminSession(event)
  const sourceId = getRouterParam(event, 'sourceId')

  if (!sourceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'sourceId is required',
    })
  }

  const result = (await convex.query((anyApi as any).ragSources.getSource, { sourceId })) as {
    source: Record<string, unknown> | null
    audit: Array<Record<string, unknown>>
    currentUserIsAdmin: boolean
  } | null

  if (!result?.source) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Source not found',
    })
  }

  return evidenceSourceDetailSchema.parse({
    currentUserIsAdmin: result.currentUserIsAdmin,
    source: toEvidenceSourceRecord(result.source as never),
    audit: (result.audit || []).map((item) => toEvidenceAuditRecord(item as never)),
  })
})
