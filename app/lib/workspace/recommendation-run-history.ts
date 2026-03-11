import type { RecommendationComparison, RecommendationResultsCandidate } from '~/lib/recommendations/comparison'

export const recommendationRunHistoryStatuses = ['completed', 'degraded', 'failed'] as const

export type RecommendationRunHistoryStatus = typeof recommendationRunHistoryStatuses[number]
export type RecommendationRunHistoryFilter = RecommendationRunHistoryStatus | 'all'

export type RecommendationRunSummary = {
  id: string
  status: RecommendationRunHistoryStatus
  recommendationCount: number
  profileSnapshotSummary: string
  createdAt: string
  isLatest: boolean
  isAvailable: boolean
  unavailableReason?: string
}

export type RecommendationRunHistoryDetailResponse =
  | {
      available: false
      reason: string
    }
  | {
      available: true
      run: RecommendationRunSummary & {
        profileSnapshotId: string
      }
      profileSnapshot: {
        id: string
        summary: string
        capturedAt: string
        keyFactors: string[]
      }
      results: {
        direct: Array<RecommendationResultsCandidate & {
          title: string
          summary: string
        }>
        blocked: Array<RecommendationResultsCandidate & {
          title: string
          summary: string
        }>
        composed: Array<RecommendationResultsCandidate & {
          title: string
          summary: string
        }>
      }
      comparison: RecommendationComparison
    }

export function isRecommendationRunHistoryStatus(value: string): value is RecommendationRunHistoryStatus {
  return (recommendationRunHistoryStatuses as readonly string[]).includes(value)
}
