import {
  getDefaultStatusMessage,
  type RecommendationLifecycleStatus,
} from './lifecycle'

type DirectPathwayOutcome = {
  pathwayId: string
  status: 'direct'
}

type BlockedPathwayOutcome = {
  pathwayId: string
  status: 'blocked'
  unmetConditions: string[]
}

export type FallbackRecommendationRunRecord = {
  runId: string
  userId: string
  profileSnapshotId: string
  status: RecommendationLifecycleStatus
  statusMessage: string
  resumable: boolean
  processingHeartbeatAt: number
  createdAt: number
  updatedAt: number
  pathwayEvaluation?: {
    direct: DirectPathwayOutcome[]
    blocked: BlockedPathwayOutcome[]
    evaluatedAt: number
  }
}

type RecommendationFallbackStore = Map<string, FallbackRecommendationRunRecord>

function getFallbackStore(): RecommendationFallbackStore {
  const globalStore = globalThis as typeof globalThis & {
    __cadetRecommendationFallbackStore__?: RecommendationFallbackStore
  }

  if (!globalStore.__cadetRecommendationFallbackStore__) {
    globalStore.__cadetRecommendationFallbackStore__ = new Map()
  }

  return globalStore.__cadetRecommendationFallbackStore__
}

function toKey(userId: string, runId: string) {
  return `${userId}::${runId}`
}

export function resetFallbackRecommendationRunsForUser(userId: string) {
  const store = getFallbackStore()
  let deletedCount = 0

  for (const [key, record] of store.entries()) {
    if (record.userId === userId) {
      store.delete(key)
      deletedCount += 1
    }
  }

  return deletedCount
}

export function seedFallbackRecommendationRun(input: {
  userId: string
  runId: string
  profileSnapshotId: string
  status: RecommendationLifecycleStatus
  statusMessage?: string
}) {
  const now = Date.now()
  const record: FallbackRecommendationRunRecord = {
    runId: input.runId,
    userId: input.userId,
    profileSnapshotId: input.profileSnapshotId,
    status: input.status,
    statusMessage: input.statusMessage?.trim() || getDefaultStatusMessage(input.status),
    resumable: input.status === 'queued' || input.status === 'evaluating',
    processingHeartbeatAt: now,
    createdAt: now,
    updatedAt: now,
  }

  getFallbackStore().set(toKey(input.userId, input.runId), record)
  return record
}

export function readFallbackRecommendationRun(input: {
  userId: string
  runId: string
}) {
  return getFallbackStore().get(toKey(input.userId, input.runId)) || null
}

export function writeFallbackRecommendationRunEvaluation(input: {
  userId: string
  runId: string
  direct: DirectPathwayOutcome[]
  blocked: BlockedPathwayOutcome[]
}) {
  const existing = readFallbackRecommendationRun({
    userId: input.userId,
    runId: input.runId,
  })

  if (!existing) {
    return null
  }

  const now = Date.now()
  const updated: FallbackRecommendationRunRecord = {
    ...existing,
    status: 'completed',
    statusMessage: getDefaultStatusMessage('completed'),
    resumable: false,
    processingHeartbeatAt: now,
    updatedAt: now,
    pathwayEvaluation: {
      direct: input.direct,
      blocked: input.blocked,
      evaluatedAt: now,
    },
  }

  getFallbackStore().set(toKey(input.userId, input.runId), updated)
  return updated
}
