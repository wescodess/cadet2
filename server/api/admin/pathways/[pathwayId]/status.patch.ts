import { getRouterParam } from 'h3'

import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import { updatePathwayStatus } from '../../../../utils/pathways/pathwayDefinitionService'
import { updatePathwayStatusSchema } from '../../../../utils/pathways/pathwayDefinitionSchema'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event, {
    allowBootstrapFromAllowlist: true,
  })

  const pathwayId = getRouterParam(event, 'pathwayId')?.trim() || ''

  if (!pathwayId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid pathway identifier',
    })
  }

  const body = await readBody<unknown>(event)
  const parsed = updatePathwayStatusSchema.safeParse(body ?? {})

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const issuePath = issue?.path.join('.') || 'payload'

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${issuePath}: ${issue?.message || 'Request body is invalid'}`,
    })
  }

  const updated = await updatePathwayStatus(pathwayId, parsed.data.status)

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Pathway definition not found',
    })
  }

  return updated
})
