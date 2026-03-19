import { getRouterParam } from 'h3'

import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import {
  PathwayRuleConflictError,
  bulkSaveRules,
} from '../../../../utils/pathways/pathwayRuleService'
import { replacePathwayRulesSchema } from '../../../../utils/pathways/pathwayRuleSchema'

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
    const items = await bulkSaveRules(pathwayId, parsed.data.rules)

    return {
      ok: true,
      items,
      totalCount: items.length,
    }
  }
  catch (error) {
    if (error instanceof PathwayRuleConflictError) {
      throw createError({
        statusCode: 409,
        statusMessage: error.message,
      })
    }

    throw error
  }
})
