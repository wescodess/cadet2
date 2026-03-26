import { anyApi } from 'convex/server'

import { recordGovernanceAction } from '../../../../utils/audit/recordGovernanceAction'
import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import {
  createConvexAdminClient,
  createConvexAdminClientActingAs,
} from '../../../../utils/convex-admin-client'

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
    (anyApi as any).ragSourcesInternal.removeSourceAsNuxtAdmin,
    { sourceId },
  )

  await recordGovernanceAction(event, {
    actionType: 'EVIDENCE_SOURCE_DELETED',
    entityType: 'EVIDENCE_SOURCE',
    entityId: sourceId,
    entityLabel: String((beforeDetail?.source as { name?: unknown } | null)?.name || sourceId),
    changeContext: {
      before: beforeDetail?.source || null,
      after: null,
    },
  }, adminSession)

  return {
    ok: true,
    ...result,
  }
})
