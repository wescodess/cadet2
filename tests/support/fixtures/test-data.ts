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
