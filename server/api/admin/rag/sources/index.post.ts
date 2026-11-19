import { api } from '../../../../../convex/_generated/api'
import { ConvexError } from 'convex/values'
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
  try {
    const result = await convex.mutation(api.ragSources.createSourceSubmission, {
      ...parsed.data,
      description: parsed.data.description ?? undefined,
      idempotencyKey,
    })

    return {
      ...result,
    }
  } catch (error) {
    const data: unknown = error instanceof ConvexError ? error.data : null
    if (
      typeof data === 'object' &&
      data !== null &&
      'code' in data &&
      data.code === 'IDEMPOTENCY_CONFLICT'
    ) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Idempotency key was already used with a different payload',
      })
    }
    throw error
  }
})
