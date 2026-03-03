import { anyApi } from 'convex/server'
import { requireAdminSession } from '../../../../../utils/auth/requireAdminSession'
import { createConvexAdminClient } from '../../../../../utils/convex-admin-client'

type PauseBody = {
  note?: unknown
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

  const body = await readBody<PauseBody>(event)
  const convex = await createConvexAdminClient()

  const result = await convex.mutation(
    (anyApi as any).ragSourcesInternal.pauseSourceAsNuxtAdmin,
    {
      sourceId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      note: typeof body?.note === 'string' ? body.note : undefined,
    },
  )

  return {
    ok: true,
    ...result,
  }
})
