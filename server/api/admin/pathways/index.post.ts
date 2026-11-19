import { getSqlDatabase } from '../../../utils/database'
import { requireAdminSession } from '../../../utils/auth/requireAdminSession'
import { recordGovernanceAction } from '../../../utils/audit/recordGovernanceAction'
import {
  PathwayDefinitionConflictError,
  createPathwayDefinition,
} from '../../../utils/pathways/pathwayDefinitionService'
import { createPathwayDefinitionSchema } from '../../../utils/pathways/pathwayDefinitionSchema'

export default defineEventHandler(async (event) => {
  const adminSession = await requireAdminSession(event)

  const body = await readBody<unknown>(event)
  const parsed = createPathwayDefinitionSchema.safeParse(body ?? {})

  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const issuePath = issue?.path.join('.') || 'payload'

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${issuePath}: ${issue?.message || 'Request body is invalid'}`,
    })
  }

  try {
    const created = await getSqlDatabase().transaction(async (transaction) => {
      const created = await createPathwayDefinition(parsed.data, transaction)

      if (!created) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Unable to create pathway definition',
        })
      }

      await recordGovernanceAction(
        event,
        {
          actionType: 'PATHWAY_CREATED',
          entityType: 'PATHWAY',
          entityId: created.pathwayId,
          entityLabel: created.displayName,
          changeContext: {
            before: null,
            after: created,
          },
        },
        adminSession,
        transaction,
      )

      return created
    })

    setResponseStatus(event, 201)
    return created
  } catch (error) {
    if (error instanceof PathwayDefinitionConflictError) {
      throw createError({
        statusCode: 409,
        statusMessage: error.message,
      })
    }

    throw error
  }
})
