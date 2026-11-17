import { getRouterParam } from 'h3'

import { recordGovernanceAction } from '../../../../../utils/audit/recordGovernanceAction'
import { requireAdminSession } from '../../../../../utils/auth/requireAdminSession'
import {
  PathwayRuleConflictError,
  listPathwayRules,
  updateRule,
} from '../../../../../utils/pathways/pathwayRuleService'
import { pathwayRuleInputSchema } from '../../../../../utils/pathways/pathwayRuleSchema'

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

  const body = await readBody<unknown>(event)
  const parsed = pathwayRuleInputSchema.safeParse(body ?? {})

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const issuePath = issue?.path.join('.') || 'payload'

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${issuePath}: ${issue?.message || 'Request body is invalid'}`,
    })
  }

  if (parsed.data.id && parsed.data.id !== ruleId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Rule payload id must match the route rule id',
    })
  }

  try {
    const before = (await listPathwayRules(pathwayId)).find((item) => item.id === ruleId) || null
    const item = await updateRule(ruleId, parsed.data, pathwayId)

    if (!item) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Pathway rule not found',
      })
    }

    await recordGovernanceAction(
      event,
      {
        actionType: 'PATHWAY_RULE_UPDATED',
        entityType: 'PATHWAY_RULE',
        entityId: item.id,
        entityLabel: `${pathwayId}:${item.unmetConditionId}`,
        changeContext: {
          before,
          after: item,
        },
      },
      adminSession,
    )

    return {
      ok: true,
      item,
    }
  } catch (error) {
    if (error instanceof PathwayRuleConflictError) {
      throw createError({
        statusCode: 409,
        statusMessage: error.message,
      })
    }

    throw error
  }
})
