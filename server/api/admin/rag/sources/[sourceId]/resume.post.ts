import { anyApi } from 'convex/server'
import { requireAdminSession } from '../../../../../utils/auth/requireAdminSession'
import { createConvexAdminClient } from '../../../../../utils/convex-admin-client'
import { resumeEvidenceSourceActionSchema } from '../../../../../utils/admin/evidenceSourceSchema'

export default defineEventHandler(async (event) => {
  const { session } = await requireAdminSession(event, {
    allowBootstrapFromAllowlist: true,
  })
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

  const convex = await createConvexAdminClient()

  const result = await convex.mutation(
    (anyApi as any).ragSourcesInternal.resumeSourceAsNuxtAdmin,
    {
      sourceId,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      note: parsed.data.note,
    },
  )

  return {
    ok: true,
    ...result,
  }
})
