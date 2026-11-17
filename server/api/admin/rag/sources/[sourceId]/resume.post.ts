import { anyApi } from 'convex/server'
import { recordGovernanceAction } from '../../../../../utils/audit/recordGovernanceAction'
import { requireAdminSession } from '../../../../../utils/auth/requireAdminSession'
import { resumeEvidenceSourceActionSchema } from '../../../../../utils/admin/evidenceSourceSchema'

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
  const parsed = resumeEvidenceSourceActionSchema.safeParse(body ?? {})

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const issuePath = issue?.path.join('.') || 'payload'

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${issuePath}: ${issue?.message || 'Request body is invalid'}`,
    })
  }

  const beforeDetail = (await convex.query((anyApi as any).ragSources.getSource, { sourceId })) as {
    source: Record<string, unknown> | null
  } | null

  const result = await convex.mutation((anyApi as any).ragSources.resumeSource, {
    sourceId,
    note: parsed.data.note,
  })

  const afterDetail = (await convex.query((anyApi as any).ragSources.getSource, { sourceId })) as {
    source: Record<string, unknown> | null
  } | null

  await recordGovernanceAction(
    event,
    {
      actionType: 'EVIDENCE_SOURCE_RESUMED',
      entityType: 'EVIDENCE_SOURCE',
      entityId: sourceId,
      entityLabel: String((afterDetail?.source as { name?: unknown } | null)?.name || sourceId),
      changeContext: {
        before: beforeDetail?.source || null,
        after: afterDetail?.source || null,
      },
      reason: parsed.data.note,
    },
    adminSession,
  )

  return {
    ok: true,
    ...result,
  }
})
