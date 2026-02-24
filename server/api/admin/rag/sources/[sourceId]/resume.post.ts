import { anyApi } from 'convex/server'
import { requireRagAdminSession } from '../../../../../utils/rag-admin'
import { createConvexAdminClient } from '../../../../../utils/convex-admin-client'

type ResumeBody = {
  note?: unknown
}

export default defineEventHandler(async (event) => {
  const { session } = await requireRagAdminSession(event)
  const sourceId = getRouterParam(event, 'sourceId')

  if (!sourceId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'sourceId is required',
    })
  }

  const body = await readBody<ResumeBody>(event)
  const convex = await createConvexAdminClient()

  const result = await convex.mutation(
    (anyApi as any).ragSourcesInternal.resumeSourceAsNuxtAdmin,
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
