import { requireAdminSession } from '../../../utils/auth/requireAdminSession'
import {
  PathwayDefinitionConflictError,
  createPathwayDefinition,
} from '../../../utils/pathways/pathwayDefinitionService'
import { createPathwayDefinitionSchema } from '../../../utils/pathways/pathwayDefinitionSchema'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event, {
    allowBootstrapFromAllowlist: true,
  })

  const body = await readBody<unknown>(event)
  const parsed = createPathwayDefinitionSchema.safeParse(body ?? {})

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const issuePath = issue?.path.join('.') || 'payload'

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${issuePath}: ${issue?.message || 'Request body is invalid'}`,
    })
  }

  try {
    const created = await createPathwayDefinition(parsed.data)

    if (!created) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Unable to create pathway definition',
      })
    }

    setResponseStatus(event, 201)
    return created
  }
  catch (error) {
    if (error instanceof PathwayDefinitionConflictError) {
      throw createError({
        statusCode: 409,
        statusMessage: error.message,
      })
    }

    throw error
  }
})
