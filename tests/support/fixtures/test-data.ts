export const WORKSPACE_ATDD_TEST_IDS = {
  shell: 'workspace-shell',
  nav: 'workspace-nav',
  navMobile: 'workspace-nav-mobile',
  dashboard: 'workspace-dashboard',
} as const

export const WORKSPACE_ATDD_REQUIRED_PAYLOAD_KEYS = [
  'email',
  'name',
  'userId',
] as const

export const WORKSPACE_ATDD_DISABLED_NAV_LABELS = [
  'Settings',
] as const

export const INTAKE_ATDD_SECTIONS = [
  'Personal',
  'Education',
  'Work',
  'Immigration',
  'Goals',
] as const

export const INTAKE_ATDD_TEST_IDS = {
  progress: 'intake-progress',
  sectionHeading: 'intake-section-heading',
  saveButton: 'intake-save',
  nextButton: 'intake-next',
  previousButton: 'intake-previous',
  saveFeedback: 'intake-save-feedback',
  validationSummary: 'intake-validation-summary',
  firstNameError: 'intake-error-first-name',
} as const

export const INTAKE_ATDD_REQUIRED_RESPONSE_KEYS = [
  'status',
  'savedAt',
  'currentSection',
  'values',
] as const

export const INTAKE_ATDD_REQUIRED_STORAGE_KEYS = [
  'currentSection',
  'sectionProgress',
  'fieldValues',
  'sourceRunId',
] as const

export const INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS = {
  targetTimelineMonths: 'Target timeline (months)',
  budgetCad: 'Estimated process budget (CAD)',
  priorityPreference: 'Top decision priority',
  locationPreference: 'Location preference',
  willingToStudyOrRetrain: 'Willing to study or retrain if needed?',
  additionalContext: 'Additional context',
} as const

export const INTAKE_CONSTRAINTS_ATDD_HELPER_TEXT_SNIPPETS = [
  'Timeline pressure changes tradeoffs',
  'Budget constraints affect which options',
  'Location preference helps prioritize province-specific',
  'Training flexibility can unlock stronger long-term pathways',
  'Use this for unique details not captured above',
] as const

export const INTAKE_CONSTRAINTS_ATDD_TEST_IDS = {
  sectionHeading: 'intake-section-heading',
  saveButton: 'intake-save',
  saveFeedback: 'intake-save-feedback',
  saveMobileButton: 'intake-save-mobile',
  nextMobileButton: 'intake-next-mobile',
  previousMobileButton: 'intake-previous-mobile',
} as const

export const INTAKE_SUBMIT_ATDD_TEST_IDS = {
  submitButton: 'intake-submit',
  submitFeedback: 'intake-submit-feedback',
  runList: 'workspace-run-list',
  runItem: 'workspace-run-item',
} as const

export const INTAKE_SUBMIT_ATDD_CONFIRMATION_SNIPPETS = [
  'submitted for recommendation processing',
  'next state',
] as const

export const RECOMMENDATION_RUN_ATDD_REQUIRED_KEYS = [
  'runId',
  'profileSnapshotId',
  'status',
  'createdAt',
  'updatedAt',
] as const

export const RECOMMENDATION_LIFECYCLE_ATDD_TEST_IDS = {
  statusBanner: 'recommendation-status-banner',
  runList: 'workspace-run-list',
  runItem: 'workspace-run-item',
  tierBadge: 'recommendation-tier-badge',
} as const

export const RECOMMENDATION_LIFECYCLE_CANONICAL_STATUSES = [
  'queued',
  'evaluating',
  'completed',
  'degraded',
  'failed',
] as const

export const RECOMMENDATION_LIFECYCLE_IN_PROGRESS_STATUSES = [
  'queued',
  'evaluating',
] as const

export const RECOMMENDATION_LIFECYCLE_FORBIDDEN_PROVIDER_FIELDS = [
  'provider',
  'providerPayload',
  'providerResponse',
  'modelOutput',
  'adapterTrace',
  'rawProviderResponse',
] as const

export const RECOMMENDATION_LIFECYCLE_IN_PROGRESS_COPY_SNIPPETS = [
  'processing',
  'active',
  'resumable',
] as const

export const RECOMMENDATION_PATHWAY_STATUSES = [
  'direct',
  'blocked',
] as const

export const RECOMMENDATION_PATHWAY_SUPPORTED_IDS = [
  'mvp-skilled-worker',
  'mvp-provincial-nominee',
  'mvp-study-to-work',
] as const

export const RECOMMENDATION_PATHWAY_UNSUPPORTED_IDS = [
  'mvp-investor-stream',
  'mvp-humanitarian-stream',
] as const

export const PATHWAY_INVENTORY_STATUS_VALUES = [
  'active',
  'inactive',
  'draft',
] as const

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

export const RECOMMENDATION_RESULT_TYPES = [
  'direct',
  'blocked',
  'composed',
] as const

export const RECOMMENDATION_TIER_VALUES = [
  'strong-fit',
  'conditional-fit',
  'lower-confidence',
] as const

export const RECOMMENDATION_QUALIFICATION_LEVELS = [
  'supported',
  'low-confidence',
  'withheld',
] as const

export const RECOMMENDATION_CONFIDENCE_LEVELS = [
  'high',
  'medium',
  'low',
  'withheld',
] as const

export const RECOMMENDATION_FRESHNESS_LEVELS = [
  'fresh',
  'stale',
  'unknown',
] as const

export const RECOMMENDATION_FIT_SIGNAL_STATES = [
  'strength',
  'watch',
  'gap',
] as const

export const RECOMMENDATION_EXPLANATIONS_ATDD_TEST_IDS = {
  panel: 'recommendation-results-panel',
  resultItem: 'recommendation-result-item',
  blockersPanel: 'recommendation-blockers-panel',
  tradeoffsPanel: 'recommendation-tradeoffs-panel',
  actionsQueue: 'recommendation-actions-queue',
  tierBadge: 'recommendation-tier-badge',
} as const

export const RECOMMENDATION_EXPLANATIONS_REQUIRED_TRADEOFF_DIMENSIONS = [
  'effort',
  'timing',
  'complexity',
] as const

export const RECOMMENDATION_EXPLANATIONS_SECTION_LABELS = {
  blockers: 'Blockers',
  tradeoffs: 'Tradeoffs',
  actions: 'Improvement actions',
} as const

export const RECOMMENDATION_COMPARISON_ATDD_TEST_IDS = {
  panel: 'recommendation-results-panel',
  workspace: 'recommendation-comparison-workspace',
  summaryBand: 'recommendation-summary-band',
  group: 'recommendation-comparison-group',
  pathwayTypeBadge: 'recommendation-pathway-type-badge',
  fallback: 'recommendation-comparison-fallback',
  routePlanner: 'recommendation-milestone-route',
} as const

export const RECOMMENDATION_COMPARISON_PATHWAY_TYPE_LABELS = {
  direct: 'Available now',
  blocked: 'Blocked but close',
  composed: 'Strategic multi-step',
} as const

export const RECOMMENDATION_CITATIONS_ATDD_TEST_IDS = {
  citationList: 'recommendation-citation-list',
  citationItem: 'citation-item',
  evidencePanel: 'evidence-confidence-panel',
  trustBoundaryBadge: 'trust-boundary-badge',
  caveatWarning: 'caveat-warning',
} as const

export const RECOMMENDATION_REVIEW_STATES = [
  'pending',
  'flagged',
  'resolved',
  'dismissed',
] as const

export const RECOMMENDATION_REVIEW_TRUST_SCORES = [
  'high',
  'medium',
  'low',
] as const

export const RECOMMENDATION_REVIEW_FRESHNESS_LABELS = [
  'current',
  'stale',
  'expired',
] as const

export const RECOMMENDATION_REVIEW_SUPPORT_STRENGTHS = [
  'strong',
  'adequate',
  'weak',
  'unsupported',
] as const

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

export const RECOMMENDATION_NEXT_STEP_PLAN_ATDD_TEST_IDS = {
  plan: 'recommendation-next-step-plan',
  item: 'recommendation-next-step-item',
  summary: 'recommendation-next-step-summary',
  limitation: 'recommendation-next-step-limitation',
  toggle: 'recommendation-next-step-toggle',
} as const

export const RECOMMENDATION_RUN_HISTORY_ATDD_TEST_IDS = {
  list: 'recommendation-history-list',
  filterBar: 'run-history-filter-bar',
  statusBadge: 'run-status-badge',
  latestBadge: 'run-history-latest-badge',
  emptyState: 'recommendation-history-empty-state',
  backLink: 'recommendation-history-back-link',
  totalCount: 'recommendation-history-count',
  unavailableReason: 'run-unavailable-reason',
  expandToggle: 'run-card-expand-toggle',
} as const

export const RECOMMENDATION_RUN_HISTORY_FILTER_LABELS = [
  'All',
  'Completed',
  'Degraded',
  'Failed',
] as const

export const RECOMMENDATION_RUN_HISTORY_STATUS_LABELS = {
  completed: 'Completed',
  degraded: 'Degraded',
  failed: 'Failed',
  unavailable: 'Unavailable',
  latest: 'Latest',
} as const

export const RECOMMENDATION_RUN_COMPARISON_ATDD_TEST_IDS = {
  dashboard: 'run-comparison-dashboard',
  changedStat: 'comparison-stat-pathways-changed',
  confidenceStat: 'comparison-stat-overall-confidence',
  evidenceStat: 'comparison-stat-new-evidence',
  profilePanel: 'profile-delta-section',
  trustPanel: 'trust-evidence-section',
  caveatPanel: 'caveat-changes-panel',
} as const

export const RECOMMENDATION_TRUST_BOUNDARY_VALUES = [
  'source-backed',
  'inferred',
  'system-generated',
] as const

export const RECOMMENDATION_TRUST_BOUNDARY_LABELS = {
  'source-backed': 'Source-backed',
  'inferred': 'Strategic guidance',
  'system-generated': 'Limited evidence',
} as const

export const RECOMMENDATION_CITATION_SOURCE_TYPES = [
  'regulation',
  'policy-bulletin',
  'knowledge-base',
  'assessment-guide',
] as const
