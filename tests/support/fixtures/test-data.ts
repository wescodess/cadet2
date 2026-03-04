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
