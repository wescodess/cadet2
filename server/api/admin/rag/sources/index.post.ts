import { anyApi } from 'convex/server'
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

  return {
    ok: true,
    ...result,
  }
})
