export const RECOMMENDATION_PATHWAY_SUPPORTED_IDS = [
  'mvp-skilled-worker',
  'mvp-provincial-nominee',
  'mvp-study-to-work',
] as const

export const PATHWAY_INVENTORY_STATUS_VALUES = ['active', 'inactive', 'draft'] as const

export const PATHWAY_INVENTORY_MINIMUM_FIELD_KEYS = [
  'pathwayId',
  'displayName',
  'description',
  'status',
  'createdAt',
  'updatedAt',
] as const

export const PATHWAY_INVENTORY_ATDD_TEST_IDS = {
  page: 'admin-pathway-page',
  table: 'admin-pathway-table',
  row: 'admin-pathway-row',
  search: 'admin-pathway-search',
  statusFilter: 'admin-pathway-filter',
  addButton: 'admin-pathway-add-button',
  statusBadge: 'admin-pathway-status-badge',
  actionsTrigger: 'admin-pathway-row-actions',
  confirmDialog: 'admin-pathway-status-confirmation',
  mobileCard: 'admin-pathway-card',
  emptyState: 'admin-pathway-empty-state',
} as const

export const RECOMMENDATION_REVIEW_FILTER_LABELS = [
  'All Citations',
  'Weak Support',
  'Stale Sources',
  'Missing References',
] as const

export const RECOMMENDATION_REVIEW_ATDD_TEST_IDS = {
  page: 'admin-recommendation-review-page',
  panel: 'admin-recommendation-review-panel',
  runList: 'admin-recommendation-review-run-list',
  runItem: 'admin-recommendation-review-run-item',
  runStatusBadge: 'admin-recommendation-review-run-status',
  trustScore: 'admin-recommendation-review-trust-score',
  reviewStateBadge: 'admin-recommendation-review-state',
  citationFilters: 'admin-recommendation-review-filters',
  citationCard: 'admin-recommendation-review-citation-card',
  citationFlagButton: 'admin-recommendation-review-flag-citation',
  runFlagButton: 'admin-recommendation-review-flag-run',
  pauseSourceButton: 'admin-recommendation-review-pause-source',
  confirmationDialog: 'admin-recommendation-review-confirmation',
  mobileTabs: 'admin-recommendation-review-mobile-tabs',
  mobileRunTab: 'admin-recommendation-review-mobile-runs',
  mobileCitationTab: 'admin-recommendation-review-mobile-citations',
  mobileActionBar: 'admin-recommendation-review-mobile-actions',
} as const

export const AUDIT_TRAIL_ACTION_TYPES = [
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

export const AUDIT_TRAIL_ENTITY_TYPES = [
  'PATHWAY',
  'PATHWAY_RULE',
  'EVIDENCE_SOURCE',
  'RECOMMENDATION_RUN',
  'GOVERNANCE_SETTING',
] as const

export const AUDIT_TRAIL_FILTER_LABELS = [
  'All actions',
  'Pathway changes',
  'Evidence changes',
  'Recommendation actions',
  'Governance settings',
] as const

export const AUDIT_TRAIL_ATDD_TEST_IDS = {
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

export const RECOMMENDATION_TRUST_BOUNDARY_VALUES = [
  'source-backed',
  'inferred',
  'system-generated',
] as const

export const RECOMMENDATION_CITATION_SOURCE_TYPES = [
  'regulation',
  'policy-bulletin',
  'knowledge-base',
  'assessment-guide',
] as const
