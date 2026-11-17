import { getRouterParam } from 'h3'

import { recordGovernanceAction } from '../../../../../utils/audit/recordGovernanceAction'
import { requireAdminSession } from '../../../../../utils/auth/requireAdminSession'
import { deleteRule, listPathwayRules } from '../../../../../utils/pathways/pathwayRuleService'

export default defineEventHandler(async (event) => {
  const adminSession = await requireAdminSession(event)

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

  const before = (await listPathwayRules(pathwayId)).find((item) => item.id === ruleId) || null
  const item = await deleteRule(ruleId, pathwayId)

  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Pathway rule not found',
    })
  }

  await recordGovernanceAction(
    event,
    {
      actionType: 'PATHWAY_RULE_DELETED',
      entityType: 'PATHWAY_RULE',
      entityId: item.id,
      entityLabel: `${pathwayId}:${item.unmetConditionId}`,
      changeContext: {
        before: before || item,
        after: null,
      },
    },
    adminSession,
  )

  return {
    ok: true,
    item,
  }
})
