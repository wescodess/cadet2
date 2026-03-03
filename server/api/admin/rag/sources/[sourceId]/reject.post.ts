import { anyApi } from 'convex/server'
import { requireAdminSession } from '../../../../../utils/auth/requireAdminSession'
import { createConvexAdminClient } from '../../../../../utils/convex-admin-client'

type RejectBody = {
  reason?: unknown
}

export default defineEventHandler(async (event) => {
  const { session } = await requireAdminSession(event)
  const sourceId = getRouterParam(event, 'sourceId')

  if (!sourceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'sourceId is required',
    })
  }

  const body = await readBody<RejectBody>(event)
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
  if (!reason) {
    throw createError({
      statusCode: 400,
      statusMessage: 'reason is required',
    })
  }

  const convex = await createConvexAdminClient()
  const result = await convex.mutation(
    (anyApi as any).ragSourcesInternal.rejectSourceAsNuxtAdmin,
    {
      sourceId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      reason,
    },
  )

  return {
    ok: true,
    ...result,
  }
})
