import { getRouterParam } from 'h3'

import { requireAdminSession } from '../../../../../utils/auth/requireAdminSession'
import { deleteRule } from '../../../../../utils/pathways/pathwayRuleService'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event, {
    allowBootstrapFromAllowlist: true,
  })

  const pathwayId = getRouterParam(event, 'pathwayId')?.trim() || ''
  const ruleId = getRouterParam(event, 'ruleId')?.trim() || ''

  if (!pathwayId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid pathway identifier',
    })
  }

  if (!ruleId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid rule identifier',
    })
  }

  const item = await deleteRule(ruleId, pathwayId)

  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Pathway rule not found',
    })
  }

  return {
    ok: true,
    item,
  }
})
