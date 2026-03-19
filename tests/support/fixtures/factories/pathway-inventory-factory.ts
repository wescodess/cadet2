import {
  PATHWAY_INVENTORY_MINIMUM_FIELD_KEYS,
  PATHWAY_INVENTORY_STATUS_VALUES,
  RECOMMENDATION_PATHWAY_SUPPORTED_IDS,
} from '../test-data'

export type PathwayDefinitionStatus = typeof PATHWAY_INVENTORY_STATUS_VALUES[number]

export type PathwayDefinitionRecord = {
  pathwayId: string
  displayName: string
  description: string | null
  status: PathwayDefinitionStatus
  createdAt: string
  updatedAt: string
}

export type PathwayInventoryListResponse = {
  ok: true
  items: PathwayDefinitionRecord[]
  totalCount: number
}

export type AdminAccessResponse = {
  ok: true
  authorizationSource: 'rag_admins' | 'allowlist'
  user: {
    userId: string
    email: string
    name: string
  }
}

export const PATHWAY_INVENTORY_ADMIN_ROUTE = '/admin/pathways'

const DEFAULT_CREATED_AT = '2026-03-18T09:00:00.000Z'
const DEFAULT_UPDATED_AT = '2026-03-18T09:00:00.000Z'

const DEFAULT_SEEDED_PATHWAYS: ReadonlyArray<PathwayDefinitionRecord> = [
  {
    pathwayId: RECOMMENDATION_PATHWAY_SUPPORTED_IDS[0],
    displayName: 'Skilled Worker pathway',
    description: 'Core skilled worker pathway supported in the MVP recommendation catalog.',
    status: 'active',
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_UPDATED_AT,
  },
  {
    pathwayId: RECOMMENDATION_PATHWAY_SUPPORTED_IDS[1],
    displayName: 'Provincial Nominee pathway',
    description: 'Province-linked route that requires offer and relocation flexibility.',
    status: 'active',
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_UPDATED_AT,
  },
  {
    pathwayId: RECOMMENDATION_PATHWAY_SUPPORTED_IDS[2],
    displayName: 'Study-to-Work pathway',
    description: 'Longer-horizon study route available for candidates open to retraining.',
    status: 'active',
    createdAt: DEFAULT_CREATED_AT,
    updatedAt: DEFAULT_UPDATED_AT,
  },
] as const

function uniqueSeed(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createPathwayInventoryRouteProbe(appBaseUrl: string) {
  const normalizedBaseUrl = appBaseUrl.replace(/\/$/, '')

  return {
    adminPath: `${normalizedBaseUrl}${PATHWAY_INVENTORY_ADMIN_ROUTE}`,
    adminAccessPath: `${normalizedBaseUrl}/api/admin/access`,
    adminSyncPath: `${normalizedBaseUrl}/api/admin/rag/convex-admin/sync-current-user`,
    listPath: `${normalizedBaseUrl}/api/admin/pathways`,
    detailPath: (pathwayId: string) => `${normalizedBaseUrl}/api/admin/pathways/${encodeURIComponent(pathwayId)}`,
    statusPath: (pathwayId: string) => `${normalizedBaseUrl}/api/admin/pathways/${encodeURIComponent(pathwayId)}/status`,
    recommendationRunStartPath: (runId: string) => `${normalizedBaseUrl}/api/recommendations/runs/${encodeURIComponent(runId)}/start`,
    recommendationRunPathwaysPath: (runId: string) => `${normalizedBaseUrl}/api/recommendations/runs/${encodeURIComponent(runId)}/pathways`,
  }
}

export function createSeededPathwayDefinitions(overrides: Partial<PathwayDefinitionRecord>[] = []) {
  return DEFAULT_SEEDED_PATHWAYS.map((pathway, index) => ({
    ...pathway,
    ...(overrides[index] || {}),
  }))
}

export function createPathwayDefinitionRecord(overrides: Partial<PathwayDefinitionRecord> = {}): PathwayDefinitionRecord {
  const pathwayId = overrides.pathwayId || uniqueSeed('mvp-admin-pathway')

  return {
    pathwayId,
    displayName: overrides.displayName || 'Atlantic Employer pathway',
    description: overrides.description === undefined
      ? 'Admin-managed pathway introduced during Story 5.1.'
      : overrides.description,
    status: overrides.status || 'draft',
    createdAt: overrides.createdAt || DEFAULT_CREATED_AT,
    updatedAt: overrides.updatedAt || DEFAULT_UPDATED_AT,
  }
}

export function createPathwayDefinitionCreateInput(overrides: Partial<PathwayDefinitionRecord> = {}) {
  const record = createPathwayDefinitionRecord(overrides)
  return {
    pathwayId: record.pathwayId,
    displayName: record.displayName,
    description: record.description,
    status: record.status,
  }
}

export function createPathwayDefinitionUpdateInput(overrides: Partial<PathwayDefinitionRecord> = {}) {
  const record = createPathwayDefinitionRecord(overrides)
  return {
    displayName: record.displayName,
    description: record.description,
  }
}

export function createPathwayStatusUpdateInput(status: PathwayDefinitionStatus) {
  return {
    status,
  }
}

export function createPathwayInventoryListResponse(items = createSeededPathwayDefinitions()): PathwayInventoryListResponse {
  return {
    ok: true,
    items,
    totalCount: items.length,
  }
}

export function createAdminAccessResponse(overrides: Partial<AdminAccessResponse['user']> = {}): AdminAccessResponse {
  return {
    ok: true,
    authorizationSource: 'rag_admins',
    user: {
      userId: overrides.userId || 'admin_user_pathway_inventory',
      email: overrides.email || 'ops-admin@example.com',
      name: overrides.name || 'Ops Admin',
    },
  }
}

export function createPathwayInventoryEvaluationPayload() {
  return {
    currentSection: 'goals',
    sectionProgress: {
      personal: true,
      education: true,
      work: true,
      immigration: true,
      goals: true,
    },
    fieldValues: {
      personal: {},
      education: {},
      work: {
        yearsSkilledExperience: 4,
        hasValidJobOffer: 'yes',
      },
      immigration: {
        openToRelocation: 'yes',
        englishClb: 9,
        availableSettlementFundsCad: 28000,
      },
      goals: {
        targetTimelineMonths: 14,
        budgetCad: 42000,
        willingToStudyOrRetrain: 'yes',
      },
    },
  }
}

export const PATHWAY_INVENTORY_EXPECTED_MINIMUM_FIELDS = [...PATHWAY_INVENTORY_MINIMUM_FIELD_KEYS]
