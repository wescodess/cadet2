import { getRouterParam } from 'h3'

import { requireAdminSession } from '../../../utils/auth/requireAdminSession'
import { getAuditTrailEvent } from '../../../utils/audit/auditTrailService'

export default defineEventHandler(async (event) => {
  const { convex } = await requireAdminSession(event)

  const eventId = getRouterParam(event, 'eventId')?.trim() || ''
  if (!eventId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'eventId is required',
    })
  }

  const detail = await getAuditTrailEvent(eventId, convex)
  if (!detail) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Audit event not found',
    })
  }

  return detail
})
