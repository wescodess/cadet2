import { z } from 'zod'

export const canonicalRecommendationStatuses = ['queued', 'evaluating', 'completed', 'degraded', 'failed'] as const

export type RecommendationLifecycleStatus = typeof canonicalRecommendationStatuses[number]

export const recommendationProcessingModeSchema = z.enum([
  'standard',
  'recoverable-delay',
  'mock-completed',
  'mock-degraded',
  'mock-failed',
])

export type RecommendationProcessingMode = z.infer<typeof recommendationProcessingModeSchema>

export const recommendationStartPayloadSchema = z.object({
  mode: recommendationProcessingModeSchema.optional(),
}).strict()

export function isCanonicalRecommendationStatus(value: string): value is RecommendationLifecycleStatus {
  return (canonicalRecommendationStatuses as readonly string[]).includes(value)
}

export function isInProgressStatus(status: RecommendationLifecycleStatus) {
  return status === 'queued' || status === 'evaluating'
}

export function getDefaultStatusMessage(status: RecommendationLifecycleStatus) {
  switch (status) {
    case 'queued':
      return 'Recommendation processing is active and resumable while internal services catch up.'
    case 'evaluating':
      return 'Recommendation processing is actively evaluating your profile.'
    case 'completed':
      return 'Recommendation evaluation completed.'
    case 'degraded':
      return 'Recommendation evaluation completed with degraded quality.'
    case 'failed':
      return 'Recommendation evaluation failed and requires retry.'
  }
}

export function toIsoString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const parsed = new Date(value)

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }

  return new Date().toISOString()
}

export type RecommendationStatusResponse = {
  runId: string
  profileSnapshotId: string
  status: RecommendationLifecycleStatus
  statusMessage: string
  resumable: boolean
  processingHeartbeatAt?: number | string
  createdAt: number | string | Date
  updatedAt: number | string | Date
}

export function normalizeStatusResponse(input: RecommendationStatusResponse) {
  return {
    runId: input.runId,
    profileSnapshotId: input.profileSnapshotId,
    status: input.status,
    statusMessage: input.statusMessage || getDefaultStatusMessage(input.status),
    resumable: typeof input.resumable === 'boolean'
      ? input.resumable
      : isInProgressStatus(input.status),
    processingHeartbeatAt: input.processingHeartbeatAt
      ? toIsoString(input.processingHeartbeatAt)
      : toIsoString(input.updatedAt),
    createdAt: toIsoString(input.createdAt),
    updatedAt: toIsoString(input.updatedAt),
  }
}
