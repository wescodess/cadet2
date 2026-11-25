import { throwSourceError } from '../../../../utils/admin/sourceError'
import { api } from '../../../../../convex/_generated/api'
import { requireIdempotencyKey } from '../../../../utils/admin/createReceipt'
import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import { createEvidenceSourceSchema } from '../../../../utils/admin/evidenceSourceSchema'

export default defineEventHandler(async (event) => {
  const adminSession = await requireAdminSession(event)
  const { convex } = adminSession
  const body: unknown = await readBody<unknown>(event)
  const parsed = createEvidenceSourceSchema.safeParse(body ?? {})

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const issuePath = issue?.path.join('.') || 'payload'

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${issuePath}: ${issue?.message || 'Request body is invalid'}`,
    })
  }

  const idempotencyKey = requireIdempotencyKey(event)
  const result = await convex
    .mutation(api.ragSources.createSourceSubmission, {
      ...parsed.data,
      description: parsed.data.description ?? undefined,
      idempotencyKey,
    })
    .catch(throwSourceError)

  return { ...result }
})
