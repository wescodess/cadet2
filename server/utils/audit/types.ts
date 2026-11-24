export const auditActionTypes = [
  'PATHWAY_CREATED',
  'PATHWAY_UPDATED',
  'PATHWAY_STATUS_CHANGED',
  'PATHWAY_RULE_CREATED',
  'PATHWAY_RULE_UPDATED',
  'PATHWAY_RULE_DELETED',
  'EVIDENCE_SOURCE_CREATED',
  'EVIDENCE_SOURCE_UPDATED',
  'EVIDENCE_SOURCE_PAUSED',
  'EVIDENCE_SOURCE_RESUMED',
  'EVIDENCE_SOURCE_APPROVED',
  'EVIDENCE_SOURCE_REJECTED',
  'EVIDENCE_SOURCE_DELETED',
  'RECOMMENDATION_FLAGGED',
  'RECOMMENDATION_DISMISSED',
  'RECOMMENDATION_RESOLVED',
  'GOVERNANCE_SETTING_CHANGED',
] as const

export const auditEntityTypes = [
  'PATHWAY',
  'PATHWAY_RULE',
  'EVIDENCE_SOURCE',
  'RECOMMENDATION_RUN',
  'GOVERNANCE_SETTING',
] as const

export type AuditActionType = (typeof auditActionTypes)[number]
export type AuditEntityType = (typeof auditEntityTypes)[number]

export type AuditChangeContext = {
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

export type GovernanceAuditEventInput = {
  actionType: AuditActionType
  entityType: AuditEntityType
  entityId: string
  entityLabel: string
  changeContext: AuditChangeContext
  reason?: string | null
  timestamp?: number
}

export type AuditTrailFilters = {
  actionType?: AuditActionType
  entityType?: AuditEntityType
  actorId?: string
  entityId?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  cursor?: string
  pageSize?: number
}

export type AuditTrailListItem = {
  eventId: string
  timestamp: string
  actionType: AuditActionType
  entityType: AuditEntityType
  entityId: string
  entityLabel: string
  actorUserId: string
  actorEmail: string | null
  actorRole: string | null
  reason: string | null
  changeSummary: string
}

export type AuditTrailRelatedEvent = Pick<
  AuditTrailListItem,
  'eventId' | 'timestamp' | 'actionType' | 'entityType' | 'entityLabel'
>

type AuditTrailDetailItem = AuditTrailListItem & {
  changeContext: AuditChangeContext
  stateDigests?: { before: string; after: string }
  truncated: boolean
  relatedEvents: AuditTrailRelatedEvent[]
}

export type AuditTrailListResponse = {
  ok: true
  items: AuditTrailListItem[]
  totalCount: number
  totalCountCapped: boolean
  nextCursor: string | null
}

export type AuditTrailDetailResponse = {
  ok: true
  event: AuditTrailDetailItem
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

export function isAuditActionType(value: unknown): value is AuditActionType {
  return typeof value === 'string' && auditActionTypes.includes(value as AuditActionType)
}

export function isAuditEntityType(value: unknown): value is AuditEntityType {
  return typeof value === 'string' && auditEntityTypes.includes(value as AuditEntityType)
}
