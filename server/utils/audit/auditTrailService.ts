import type { StoredAuditEvent } from './auditLogStore'
import { getStoredAuditEvent, getStoredAuditSummary, listStoredAuditEvents } from './auditLogStore'
import type {
  AuditChangeContext,
  AuditEntityType,
  AuditTrailDetailItem,
  AuditTrailDetailResponse,
  AuditTrailFilters,
  AuditTrailListItem,
  AuditTrailListResponse,
  AuditTrailRelatedEvent,
  AuditTrailSummaryResponse,
} from './types'

type RawAuditEvent = {
  eventId: string
  actorId: string
  actorEmail?: string
  actorRole?: string
  actionType: AuditTrailListItem['actionType']
  entityType: AuditTrailListItem['entityType']
  entityId: string
  entityLabel: string
  changeContext: AuditChangeContext
  reason?: string
  timestamp: number
}

type RawAuditEventListResult = {
  items: RawAuditEvent[]
  totalCount: number
  nextCursor: string | null
}

type RawAuditSummaryResult = {
  eventsToday: number
  eventsThisWeek: number
  mostActiveActor: {
    userId: string
    email: string
    eventCount: number
  } | null
  mostChangedEntityType: AuditEntityType
}

function toIsoTimestamp(value: number) {
  return new Date(value).toISOString()
}

function toDisplayValue(value: unknown) {
  if (value === null) {
    return 'null'
  }

  if (value === undefined) {
    return 'unset'
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.join(', ')
  }

  try {
    return JSON.stringify(value)
  } catch {
    return '[unserializable]'
  }
}

function buildChangeSummary(changeContext: AuditChangeContext) {
  if (!changeContext.before && changeContext.after) {
    const keys = Object.keys(changeContext.after)
    return keys.length > 0 ? `created ${keys.slice(0, 3).join(', ')}` : 'created record'
  }

  if (changeContext.before && !changeContext.after) {
    const keys = Object.keys(changeContext.before)
    return keys.length > 0 ? `deleted ${keys.slice(0, 3).join(', ')}` : 'deleted record'
  }

  if (!changeContext.before || !changeContext.after) {
    return 'changed governed record'
  }

  const beforeKeys = Object.keys(changeContext.before)
  const afterKeys = Object.keys(changeContext.after)
  const allKeys = [...new Set([...beforeKeys, ...afterKeys])]
  const differences = allKeys
    .filter(
      (key) =>
        JSON.stringify(changeContext.before?.[key]) !== JSON.stringify(changeContext.after?.[key]),
    )
    .slice(0, 3)
    .map(
      (key) =>
        `${key} ${toDisplayValue(changeContext.before?.[key])} -> ${toDisplayValue(changeContext.after?.[key])}`,
    )

  return differences.length > 0 ? differences.join('; ') : 'no field-level changes captured'
}

function toListItem(event: RawAuditEvent): AuditTrailListItem {
  return {
    eventId: event.eventId,
    timestamp: toIsoTimestamp(event.timestamp),
    actionType: event.actionType,
    entityType: event.entityType,
    entityId: event.entityId,
    entityLabel: event.entityLabel,
    actorUserId: event.actorId,
    actorEmail: event.actorEmail || null,
    actorRole: event.actorRole || null,
    reason: event.reason || null,
    changeSummary: buildChangeSummary(event.changeContext),
  }
}

function toRelatedEvent(event: RawAuditEvent): AuditTrailRelatedEvent {
  const item = toListItem(event)
  return {
    eventId: item.eventId,
    timestamp: item.timestamp,
    actionType: item.actionType,
    entityType: item.entityType,
    entityLabel: item.entityLabel,
  }
}

async function queryAuditEvents(filters: AuditTrailFilters, sourceEvents: StoredAuditEvent[]) {
  return (await listStoredAuditEvents(
    {
      actionType: filters.actionType,
      entityType: filters.entityType,
      actorId: filters.actorId,
      entityId: filters.entityId,
      search: filters.search?.trim() || undefined,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      cursor: filters.cursor?.trim() || undefined,
      pageSize: filters.pageSize,
    },
    sourceEvents,
  )) as RawAuditEventListResult
}

export async function listAuditTrailEvents(
  sourceEvents: StoredAuditEvent[],
  filters: AuditTrailFilters = {},
): Promise<AuditTrailListResponse> {
  const result = await queryAuditEvents(filters, sourceEvents)

  return {
    ok: true,
    items: result.items.map(toListItem),
    totalCount: result.totalCount,
    nextCursor: result.nextCursor,
  }
}

export async function getAuditTrailEvent(
  eventId: string,
  sourceEvents: StoredAuditEvent[],
): Promise<AuditTrailDetailResponse | null> {
  const event = (await getStoredAuditEvent(eventId, sourceEvents)) as RawAuditEvent | null

  if (!event) {
    return null
  }

  const related = await queryAuditEvents(
    {
      entityId: event.entityId,
      pageSize: 6,
    },
    sourceEvents,
  )

  const detail: AuditTrailDetailItem = {
    ...toListItem(event),
    changeContext: event.changeContext,
    relatedEvents: related.items
      .filter((item) => item.eventId !== eventId)
      .slice(0, 5)
      .map(toRelatedEvent),
  }

  return {
    ok: true,
    event: detail,
  }
}

export async function getAuditTrailSummary(
  sourceEvents: StoredAuditEvent[],
): Promise<AuditTrailSummaryResponse> {
  const summary = (await getStoredAuditSummary(sourceEvents)) as RawAuditSummaryResult

  return {
    ok: true,
    eventsToday: summary.eventsToday,
    eventsThisWeek: summary.eventsThisWeek,
    mostActiveActor: summary.mostActiveActor,
    mostChangedEntityType: summary.mostChangedEntityType,
  }
}
