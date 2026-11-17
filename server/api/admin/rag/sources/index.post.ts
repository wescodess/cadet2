import { anyApi } from 'convex/server'
import { recordGovernanceAction } from '../../../../utils/audit/recordGovernanceAction'
import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import { createEvidenceSourceSchema } from '../../../../utils/admin/evidenceSourceSchema'

export default defineEventHandler(async (event) => {
  const adminSession = await requireAdminSession(event)
  const { convex } = adminSession
  const body = await readBody<unknown>(event)
  const parsed = createEvidenceSourceSchema.safeParse(body ?? {})

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const issuePath = issue?.path.join('.') || 'payload'

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${issuePath}: ${issue?.message || 'Request body is invalid'}`,
    })
  }

  const result = await convex.mutation(
    (anyApi as any).ragSources.createSourceSubmission,
    parsed.data,
  )

  const detail = (await convex.query((anyApi as any).ragSources.getSource, {
    sourceId: result.sourceId,
  })) as {
    source: Record<string, unknown> | null
  } | null

  await recordGovernanceAction(
    event,
    {
      actionType: 'EVIDENCE_SOURCE_CREATED',
      entityType: 'EVIDENCE_SOURCE',
      entityId: result.sourceId,
      entityLabel: parsed.data.name,
      changeContext: {
        before: null,
        after: detail?.source || {
          sourceId: result.sourceId,
          name: parsed.data.name,
          type: parsed.data.type,
          status: result.status,
        },
      },
    },
    adminSession,
  )

  return {
    ok: true,
    ...result,
  }
})
