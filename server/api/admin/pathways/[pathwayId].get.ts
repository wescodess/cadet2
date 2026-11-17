import { getRouterParam } from 'h3'

import { requireAdminSession } from '../../../utils/auth/requireAdminSession'
import { getPathwayDefinition } from '../../../utils/pathways/pathwayDefinitionService'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)

  const pathwayId = getRouterParam(event, 'pathwayId')?.trim() || ''

  if (!pathwayId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid pathway identifier',
    })
  }

  const definition = await getPathwayDefinition(pathwayId)

  if (!definition) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Pathway definition not found',
    })
  }

  return definition
})
