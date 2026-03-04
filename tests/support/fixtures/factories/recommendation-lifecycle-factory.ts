export type RecommendationLifecycleStatus = 'queued' | 'evaluating' | 'completed' | 'degraded' | 'failed'

export type RecommendationLifecycleRecord = {
  runId: string
  profileSnapshotId: string
  status: RecommendationLifecycleStatus
  createdAt: string
  updatedAt: string
  statusMessage?: string
  resumable?: boolean
  processingHeartbeatAt?: string
}

type RecommendationLifecycleRouteProbe = {
  workspacePath: string
  intakePath: string
  draftApiPath: string
  submitApiPath: string
  recommendationRunsApiPath: string
  recommendationRunStartPath: (runId: string) => string
  recommendationRunStatusPath: (runId: string) => string
  recommendationRunPathwaysPath: (runId: string) => string
  authPath: string
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

export function createRecommendationLifecycleRouteProbe(baseUrl: string): RecommendationLifecycleRouteProbe {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)

  return {
    workspacePath: `${normalizedBaseUrl}/workspace`,
    intakePath: `${normalizedBaseUrl}/workspace/intake`,
    draftApiPath: `${normalizedBaseUrl}/api/intake/draft`,
    submitApiPath: `${normalizedBaseUrl}/api/intake/submit`,
    recommendationRunsApiPath: `${normalizedBaseUrl}/api/workspace/recommendation-runs`,
    recommendationRunStartPath: runId => `${normalizedBaseUrl}/api/recommendations/runs/${encodeURIComponent(runId)}/start`,
    recommendationRunStatusPath: runId => `${normalizedBaseUrl}/api/recommendations/runs/${encodeURIComponent(runId)}/status`,
    recommendationRunPathwaysPath: runId => `${normalizedBaseUrl}/api/recommendations/runs/${encodeURIComponent(runId)}/pathways`,
    authPath: `${normalizedBaseUrl}/auth`,
  }
}

export function createRecommendationLifecycleRecord(
  overrides: Partial<RecommendationLifecycleRecord> = {},
): RecommendationLifecycleRecord {
  const createdAt = overrides.createdAt || new Date('2026-03-04T13:15:00.000Z').toISOString()
  const updatedAt = overrides.updatedAt || createdAt

  return {
    runId: overrides.runId || 'run_lifecycle_seed_001',
    profileSnapshotId: overrides.profileSnapshotId || 'snapshot_lifecycle_seed_001',
    status: overrides.status || 'queued',
    createdAt,
    updatedAt,
    statusMessage: overrides.statusMessage,
    resumable: overrides.resumable,
    processingHeartbeatAt: overrides.processingHeartbeatAt,
  }
}

export function createRecommendationStatusPayload(
  run: RecommendationLifecycleRecord,
  overrides: Partial<RecommendationLifecycleRecord> = {},
): RecommendationLifecycleRecord {
  return {
    ...run,
    ...overrides,
    runId: run.runId,
    profileSnapshotId: run.profileSnapshotId,
    updatedAt: overrides.updatedAt || new Date().toISOString(),
  }
}
