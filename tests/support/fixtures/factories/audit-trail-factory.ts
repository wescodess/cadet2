import {
  AUDIT_TRAIL_ACTION_TYPES,
  AUDIT_TRAIL_ENTITY_TYPES,
} from '../test-data'

export type AuditActionType = typeof AUDIT_TRAIL_ACTION_TYPES[number]
export type AuditEntityType = typeof AUDIT_TRAIL_ENTITY_TYPES[number]

export type AuditActorRole = 'admin' | 'ops' | 'system'

export type AuditChangeContext = {
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

export type AuditTrailEventSummary = {
  eventId: string
  timestamp: string
  actionType: AuditActionType
  entityType: AuditEntityType
  entityId: string
  entityLabel: string
  actorUserId: string
  actorEmail: string
  actorRole: AuditActorRole
  reason: string | null
  changeSummary: string
}

export type AuditTrailRelatedEvent = Pick<
  AuditTrailEventSummary,
  'eventId' | 'timestamp' | 'actionType' | 'entityType' | 'entityLabel'
>

export type AuditTrailEventDetailResponse = {
  ok: true
  event: AuditTrailEventSummary & {
    changeContext: AuditChangeContext
    relatedEvents: AuditTrailRelatedEvent[]
  }
}

export type AuditTrailListResponse = {
  ok: true
  items: AuditTrailEventSummary[]
  totalCount: number
}

export type AuditTrailSummaryResponse = {
  ok: true
  eventsToday: number
  eventsThisWeek: number
  mostActiveActor: {
    userId: string
    email: string
    eventCount: number
  } | null
  mostChangedEntityType: AuditEntityType
}

export const ADMIN_AUDIT_TRAIL_ROUTE = '/admin/audit-trail'

function uniqueSeed(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '')
}

export function createAuditTrailRouteProbe(appBaseUrl: string) {
  const normalizedBaseUrl = normalizeBaseUrl(appBaseUrl)

  return {
    adminPath: `${normalizedBaseUrl}${ADMIN_AUDIT_TRAIL_ROUTE}`,
    adminAccessPath: `${normalizedBaseUrl}/api/admin/access`,
    adminSyncPath: `${normalizedBaseUrl}/api/admin/rag/convex-admin/sync-current-user`,
    listPath: `${normalizedBaseUrl}/api/admin/audit-trail`,
    detailPath: (eventId: string) => `${normalizedBaseUrl}/api/admin/audit-trail/${encodeURIComponent(eventId)}`,
    summaryPath: `${normalizedBaseUrl}/api/admin/audit-trail/summary`,
  }
}

export function createAuditTrailEventSummary(
  overrides: Partial<AuditTrailEventSummary> = {},
): AuditTrailEventSummary {
  const entityType = overrides.entityType || 'EVIDENCE_SOURCE'
  const actionType = overrides.actionType || 'EVIDENCE_SOURCE_UPDATED'

  return {
    eventId: overrides.eventId || uniqueSeed('audit-event'),
    timestamp: overrides.timestamp || '2026-03-25T13:30:00.000Z',
    actionType,
    entityType,
    entityId: overrides.entityId || uniqueSeed(entityType.toLowerCase()),
    entityLabel: overrides.entityLabel || 'IRCC policy bulletin source',
    actorUserId: overrides.actorUserId || 'ops-admin-user',
    actorEmail: overrides.actorEmail || 'ops-admin@example.com',
    actorRole: overrides.actorRole || 'ops',
    reason: overrides.reason === undefined
      ? 'Trust-sensitive change reviewed through the governed admin workflow.'
      : overrides.reason,
    changeSummary: overrides.changeSummary || 'trustScore 72 -> 88; status active -> paused',
  }
}

export function createAuditTrailEventDetail(
  event = createAuditTrailEventSummary(),
  overrides: Partial<AuditTrailEventDetailResponse> = {},
): AuditTrailEventDetailResponse {
  const changeContext: AuditChangeContext = {
    before: {
      trustScore: 72,
      status: 'active',
      linkedPathwayIds: ['mvp-skilled-worker'],
    },
    after: {
      trustScore: 88,
      status: 'paused',
      linkedPathwayIds: ['mvp-skilled-worker', 'mvp-provincial-nominee'],
    },
  }

  return {
    ok: true,
    event: {
      ...event,
      changeContext,
      relatedEvents: [{
        eventId: uniqueSeed('audit-related'),
        timestamp: '2026-03-25T12:15:00.000Z',
        actionType: event.entityType === 'PATHWAY' ? 'PATHWAY_CREATED' : 'EVIDENCE_SOURCE_CREATED',
        entityType: event.entityType,
        entityLabel: event.entityLabel,
      }],
    },
    ...overrides,
  }
}

export function createAuditTrailListResponse(
  items = [
    createAuditTrailEventSummary({
      actionType: 'PATHWAY_STATUS_CHANGED',
      entityType: 'PATHWAY',
      entityLabel: 'Skilled Worker pathway',
      changeSummary: 'status draft -> active',
    }),
    createAuditTrailEventSummary({
      actionType: 'EVIDENCE_SOURCE_PAUSED',
      entityType: 'EVIDENCE_SOURCE',
      entityLabel: 'IRCC policy bulletin source',
      changeSummary: 'lifecycleStatus active -> paused',
    }),
    createAuditTrailEventSummary({
      actionType: 'RECOMMENDATION_FLAGGED',
      entityType: 'RECOMMENDATION_RUN',
      entityLabel: 'Recommendation run Candidate A7C2',
      changeSummary: 'reviewState pending -> flagged',
    }),
  ],
): AuditTrailListResponse {
  return {
    ok: true,
    items,
    totalCount: items.length,
  }
}

export function createAuditTrailSummaryResponse(
  overrides: Partial<AuditTrailSummaryResponse> = {},
): AuditTrailSummaryResponse {
  return {
    ok: true,
    eventsToday: overrides.eventsToday ?? 6,
    eventsThisWeek: overrides.eventsThisWeek ?? 21,
    mostActiveActor: overrides.mostActiveActor === undefined
      ? {
          userId: 'ops-admin-user',
          email: 'ops-admin@example.com',
          eventCount: 8,
        }
      : overrides.mostActiveActor,
    mostChangedEntityType: overrides.mostChangedEntityType || 'EVIDENCE_SOURCE',
  }
}
