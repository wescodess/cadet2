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
  'Recommendations',
  'History',
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
