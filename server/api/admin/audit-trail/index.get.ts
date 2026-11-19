import { getQuery } from 'h3'

import { requireAdminSession } from '../../../utils/auth/requireAdminSession'
import { listAuditTrailEvents } from '../../../utils/audit/auditTrailService'
import {
  isAuditActionType,
  isAuditEntityType,
  type AuditTrailFilters,
} from '../../../utils/audit/types'

function toOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function toOptionalNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value)
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value.trim(), 10)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

export default defineEventHandler(async (event) => {
  const { convex } = await requireAdminSession(event)

  const query = getQuery(event)
  const actionType = isAuditActionType(query.actionType) ? query.actionType : undefined
  const entityType = isAuditEntityType(query.entityType) ? query.entityType : undefined

  const filters: AuditTrailFilters = {
    actionType,
    entityType,
    actorId: toOptionalString(query.actorId),
    entityId: toOptionalString(query.entityId),
    search: toOptionalString(query.search),
    dateFrom: toOptionalString(query.dateFrom),
    dateTo: toOptionalString(query.dateTo),
    cursor: toOptionalString(query.cursor),
    pageSize: toOptionalNumber(query.pageSize),
  }

  return await listAuditTrailEvents(convex, filters)
})
