import { getRouterParam } from 'h3'

import { requireAdminSession } from '../../../../utils/auth/requireAdminSession'
import {
  PathwayRuleConflictError,
  createRule,
} from '../../../../utils/pathways/pathwayRuleService'
import { pathwayRuleInputSchema } from '../../../../utils/pathways/pathwayRuleSchema'

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
  const parsed = pathwayRuleInputSchema.safeParse(body ?? {})

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const issuePath = issue?.path.join('.') || 'payload'

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${issuePath}: ${issue?.message || 'Request body is invalid'}`,
    })
  }

  try {
    const item = await createRule(pathwayId, parsed.data)

    return {
      ok: true,
      item,
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
