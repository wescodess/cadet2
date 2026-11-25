import { getQuery } from 'h3'

import { requireAdminSession } from '../../../utils/auth/requireAdminSession'
import { listPathwayDefinitions } from '../../../utils/pathways/pathwayDefinitionService'
import { pathwayDefinitionListQuerySchema } from '../../../utils/pathways/pathwayDefinitionSchema'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)

  const parsed = pathwayDefinitionListQuerySchema.safeParse(getQuery(event))

  if (!parsed.success) {
    const issue = parsed.error.issues[0]

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid query: ${issue?.message || 'Request query is invalid'}`,
    })
  }

  const items = await listPathwayDefinitions(parsed.data.status)

  return {
    ok: true,
    items,
    totalCount: items.length,
  }
})
