import { anyApi } from 'convex/server'

import { recordGovernanceAction } from '../../../../utils/audit/recordGovernanceAction'
import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'

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

  const beforeDetail = (await convex.query((anyApi as any).ragSources.getSource, { sourceId })) as {
    source: Record<string, unknown> | null
  } | null
  const result = await convex.mutation((anyApi as any).ragSources.removeSource, { sourceId })

  await recordGovernanceAction(
    event,
    {
      actionType: 'EVIDENCE_SOURCE_DELETED',
      entityType: 'EVIDENCE_SOURCE',
      entityId: sourceId,
      entityLabel: String((beforeDetail?.source as { name?: unknown } | null)?.name || sourceId),
      changeContext: {
        before: beforeDetail?.source || null,
        after: null,
      },
    },
    adminSession,
  )

  return {
    ok: true,
    ...result,
  }
})
