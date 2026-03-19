import { getRouterParam } from 'h3'

import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import { listPathwayRules } from '../../../../utils/pathways/pathwayRuleService'

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

  const items = await listPathwayRules(pathwayId)

  return {
    ok: true,
    items,
    totalCount: items.length,
  }
})
