import { getRouterParam } from 'h3'

import { recordGovernanceAction } from '../../../../utils/audit/recordGovernanceAction'
import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import {
  PathwayRuleConflictError,
  bulkSaveRules,
  listPathwayRules,
} from '../../../../utils/pathways/pathwayRuleService'
import { replacePathwayRulesSchema } from '../../../../utils/pathways/pathwayRuleSchema'

export default defineEventHandler(async (event) => {
  const adminSession = await requireAdminSession(event)

  const pathwayId = getRouterParam(event, 'pathwayId')?.trim() || ''

  if (!pathwayId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid pathway identifier',
    })
  }

  const body = await readBody<unknown>(event)
  const parsed = replacePathwayRulesSchema.safeParse(body ?? {})

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const issuePath = issue?.path.join('.') || 'payload'

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${issuePath}: ${issue?.message || 'Request body is invalid'}`,
    })
  }

  try {
    const before = await listPathwayRules(pathwayId)
    const items = await bulkSaveRules(pathwayId, parsed.data.rules)
    const beforeById = new Map(before.map((item) => [item.id, item] as const))
    const afterById = new Map(items.map((item) => [item.id, item] as const))

    for (const item of items) {
      const previous = beforeById.get(item.id) || null
      const actionType = previous ? 'PATHWAY_RULE_UPDATED' : 'PATHWAY_RULE_CREATED'

      if (!previous || JSON.stringify(previous) !== JSON.stringify(item)) {
        await recordGovernanceAction(
          event,
          {
            actionType,
            entityType: 'PATHWAY_RULE',
            entityId: item.id,
            entityLabel: `${pathwayId}:${item.unmetConditionId}`,
            changeContext: {
              before: previous,
              after: item,
            },
          },
          adminSession,
        )
      }
    }

    for (const item of before) {
      if (!afterById.has(item.id)) {
        await recordGovernanceAction(
          event,
          {
            actionType: 'PATHWAY_RULE_DELETED',
            entityType: 'PATHWAY_RULE',
            entityId: item.id,
            entityLabel: `${pathwayId}:${item.unmetConditionId}`,
            changeContext: {
              before: item,
              after: null,
            },
          },
          adminSession,
        )
      }
    }

    return {
      ok: true,
      items,
      totalCount: items.length,
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
