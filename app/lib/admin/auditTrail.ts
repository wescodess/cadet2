// Canonical type source: server/utils/audit/types.ts
// Keep these client-facing types in sync with the server module.
export type AuditActionType =
  | 'PATHWAY_CREATED'
  | 'PATHWAY_UPDATED'
  | 'PATHWAY_STATUS_CHANGED'
  | 'PATHWAY_RULE_CREATED'
  | 'PATHWAY_RULE_UPDATED'
  | 'PATHWAY_RULE_DELETED'
  | 'EVIDENCE_SOURCE_CREATED'
  | 'EVIDENCE_SOURCE_UPDATED'
  | 'EVIDENCE_SOURCE_PAUSED'
  | 'EVIDENCE_SOURCE_RESUMED'
  | 'EVIDENCE_SOURCE_APPROVED'
  | 'EVIDENCE_SOURCE_REJECTED'
  | 'EVIDENCE_SOURCE_DELETED'
  | 'RECOMMENDATION_FLAGGED'
  | 'RECOMMENDATION_DISMISSED'
  | 'RECOMMENDATION_RESOLVED'
  | 'GOVERNANCE_SETTING_CHANGED'

export type AuditEntityType =
  | 'PATHWAY'
  | 'PATHWAY_RULE'
  | 'EVIDENCE_SOURCE'
  | 'RECOMMENDATION_RUN'
  | 'GOVERNANCE_SETTING'

export type AuditTrailEventSummary = {
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

export type AuditTrailEventDetailResponse = {
  ok: true
  event: AuditTrailEventSummary & {
    changeContext: {
      before: Record<string, unknown> | null
      after: Record<string, unknown> | null
    }
    relatedEvents: Array<{
      eventId: string
      timestamp: string
      actionType: AuditActionType
      entityType: AuditEntityType
      entityLabel: string
    }>
  }
}

export type AuditTrailListResponse = {
  ok: true
  items: AuditTrailEventSummary[]
  totalCount: number
  nextCursor: string | null
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

export const auditTrailActionOptions: Array<{
  label: string
  value: AuditActionType | ''
}> = [
  { label: 'All action types', value: '' },
  { label: 'Pathway created', value: 'PATHWAY_CREATED' },
  { label: 'Pathway updated', value: 'PATHWAY_UPDATED' },
  { label: 'Pathway status changed', value: 'PATHWAY_STATUS_CHANGED' },
  { label: 'Pathway rule created', value: 'PATHWAY_RULE_CREATED' },
  { label: 'Pathway rule updated', value: 'PATHWAY_RULE_UPDATED' },
  { label: 'Pathway rule deleted', value: 'PATHWAY_RULE_DELETED' },
  { label: 'Evidence source created', value: 'EVIDENCE_SOURCE_CREATED' },
  { label: 'Evidence source updated', value: 'EVIDENCE_SOURCE_UPDATED' },
  { label: 'Evidence source paused', value: 'EVIDENCE_SOURCE_PAUSED' },
  { label: 'Evidence source resumed', value: 'EVIDENCE_SOURCE_RESUMED' },
  { label: 'Evidence source approved', value: 'EVIDENCE_SOURCE_APPROVED' },
  { label: 'Evidence source rejected', value: 'EVIDENCE_SOURCE_REJECTED' },
  { label: 'Evidence source deleted', value: 'EVIDENCE_SOURCE_DELETED' },
  { label: 'Recommendation flagged', value: 'RECOMMENDATION_FLAGGED' },
  { label: 'Recommendation dismissed', value: 'RECOMMENDATION_DISMISSED' },
  { label: 'Recommendation resolved', value: 'RECOMMENDATION_RESOLVED' },
  { label: 'Governance setting changed', value: 'GOVERNANCE_SETTING_CHANGED' },
] as const

export const auditTrailFilterGroups = [
  { key: 'all', label: 'All actions', entityType: '' },
  { key: 'pathway', label: 'Pathway changes', entityType: 'PATHWAY' },
  { key: 'pathway-rule', label: 'Pathway rules', entityType: 'PATHWAY_RULE' },
  { key: 'evidence', label: 'Evidence changes', entityType: 'EVIDENCE_SOURCE' },
  { key: 'recommendation', label: 'Recommendation actions', entityType: 'RECOMMENDATION_RUN' },
  { key: 'governance', label: 'Governance settings', entityType: 'GOVERNANCE_SETTING' },
] as const

export const auditTrailTestIds = {
  page: 'admin-audit-page',
  panel: 'admin-audit-panel',
  summaryBar: 'admin-audit-summary-bar',
  filterRibbon: 'admin-audit-filter-ribbon',
  eventList: 'admin-audit-event-list',
  eventRow: 'admin-audit-event-row',
  detailPanel: 'admin-audit-detail-panel',
  diffPanel: 'admin-audit-diff-panel',
  mobileTabs: 'admin-audit-mobile-tabs',
  mobileEventsTab: 'admin-audit-mobile-events',
  mobileDetailTab: 'admin-audit-mobile-detail',
} as const

const actionLabelMap: Record<AuditActionType, string> = {
  PATHWAY_CREATED: 'Pathway created',
  PATHWAY_UPDATED: 'Pathway updated',
  PATHWAY_STATUS_CHANGED: 'Pathway status changed',
  PATHWAY_RULE_CREATED: 'Rule created',
  PATHWAY_RULE_UPDATED: 'Rule updated',
  PATHWAY_RULE_DELETED: 'Rule deleted',
  EVIDENCE_SOURCE_CREATED: 'Source created',
  EVIDENCE_SOURCE_UPDATED: 'Source updated',
  EVIDENCE_SOURCE_PAUSED: 'Source paused',
  EVIDENCE_SOURCE_RESUMED: 'Source resumed',
  EVIDENCE_SOURCE_APPROVED: 'Source approved',
  EVIDENCE_SOURCE_REJECTED: 'Source rejected',
  EVIDENCE_SOURCE_DELETED: 'Source deleted',
  RECOMMENDATION_FLAGGED: 'Run flagged',
  RECOMMENDATION_DISMISSED: 'Run dismissed',
  RECOMMENDATION_RESOLVED: 'Run resolved',
  GOVERNANCE_SETTING_CHANGED: 'Governance setting changed',
}

const entityLabelMap: Record<AuditEntityType, string> = {
  PATHWAY: 'Pathway',
  PATHWAY_RULE: 'Rule',
  EVIDENCE_SOURCE: 'Evidence',
  RECOMMENDATION_RUN: 'Review',
  GOVERNANCE_SETTING: 'Governance',
}

export function formatAuditActionLabel(value: AuditActionType) {
  return actionLabelMap[value]
}

export function formatAuditEntityLabel(value: AuditEntityType) {
  return entityLabelMap[value]
}

export function formatAuditTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatAuditJson(value: Record<string, unknown> | null) {
  return value ? JSON.stringify(value, null, 2) : 'null'
}

export function auditBadgeTone(value: AuditEntityType) {
  if (value === 'PATHWAY' || value === 'PATHWAY_RULE') {
    return 'bg-sky-500/15 text-sky-100 ring-sky-400/30'
  }

  if (value === 'EVIDENCE_SOURCE') {
    return 'bg-amber-400/15 text-amber-100 ring-amber-300/30'
  }

  if (value === 'RECOMMENDATION_RUN') {
    return 'bg-emerald-400/15 text-emerald-100 ring-emerald-300/30'
  }

  return 'bg-violet-400/15 text-violet-100 ring-violet-300/30'
}
