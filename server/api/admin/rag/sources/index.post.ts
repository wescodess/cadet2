import { anyApi } from 'convex/server'
import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import { createConvexAdminClientActingAs } from '../../../../utils/convex-admin-client'
import { createEvidenceSourceSchema } from '../../../../utils/admin/evidenceSourceSchema'

export default defineEventHandler(async (event) => {
  const { session } = await requireAdminSession(event, {
    allowBootstrapFromAllowlist: true,
  })
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

  const convex = await createConvexAdminClientActingAs(event, {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  })

  const result = await convex.mutation(
    (anyApi as any).ragSources.createSourceSubmission,
    parsed.data,
  )

  return {
    ok: true,
    ...result,
  }
})
