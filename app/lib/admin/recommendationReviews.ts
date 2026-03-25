export type RecommendationReviewState = 'pending' | 'flagged' | 'resolved' | 'dismissed'
export type RecommendationReviewTrustScore = 'high' | 'medium' | 'low'
export type RecommendationReviewFreshnessLabel = 'current' | 'stale' | 'expired'
export type RecommendationReviewSupportStrength = 'strong' | 'adequate' | 'weak' | 'unsupported'
export type RecommendationReviewRunStatus = 'completed' | 'degraded' | 'failed'

export type RecommendationReviewRunSummary = {
  runId: string
  profileSnapshotId: string
  createdAt: string
  recommendationStatus: RecommendationReviewRunStatus
  trustScore: RecommendationReviewTrustScore
  confidence: 'high' | 'medium' | 'low' | 'withheld'
  freshness: RecommendationReviewFreshnessLabel
  citationCount: number
  reviewState: RecommendationReviewState
  flaggedCitationCount: number
  anonymizedSubject: string
  caveatCount: number
}

export type RecommendationReviewCitation = {
  citationId: string
  sourceId: string
  sourceName: string
  sourceUrl: string
  sourceType: 'regulation' | 'policy-bulletin' | 'knowledge-base' | 'assessment-guide'
  claimSnippet: string
  pathwayId: string
  pathwayLabel: string
  freshness: RecommendationReviewFreshnessLabel
  supportStrength: RecommendationReviewSupportStrength
  matchContext: string
  reviewState: RecommendationReviewState
  lastReviewedAt: string | null
  flagReason: string | null
}

export type RecommendationReviewRunDetailResponse = {
  ok: true
  run: RecommendationReviewRunSummary & {
    subjectReference: {
      label: string
      profileSnapshotId: string
    }
    trustSignals: {
      strong: number
      watch: number
      gaps: number
    }
    caveats: string[]
    citationBuckets: {
      all: number
      weakSupport: number
      staleSources: number
      missingReferences: number
    }
  }
  citations: RecommendationReviewCitation[]
}

export type RecommendationReviewListResponse = {
  ok: true
  items: RecommendationReviewRunSummary[]
  totalCount: number
}

export type RecommendationReviewCitationsResponse = {
  ok: true
  items: RecommendationReviewCitation[]
  totalCount: number
}

export type RecommendationReviewFilterKey = 'all' | 'weak' | 'stale' | 'missing'

export const recommendationReviewFilters: Array<{
  key: RecommendationReviewFilterKey
  label: string
}> = [
  { key: 'all', label: 'All Citations' },
  { key: 'weak', label: 'Weak Support' },
  { key: 'stale', label: 'Stale Sources' },
  { key: 'missing', label: 'Missing References' },
]

export const recommendationReviewTestIds = {
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

export const DEFAULT_RECOMMENDATION_REVIEW_RUN_FLAG_REASON = 'Trust issue requires admin follow-up.'
export const DEFAULT_RECOMMENDATION_REVIEW_RUN_RESOLVE_REASON = 'Citations revalidated against current evidence sources.'
export const DEFAULT_RECOMMENDATION_REVIEW_RUN_DISMISS_REASON = 'Issue accepted as informational-only for this run.'
export const DEFAULT_RECOMMENDATION_REVIEW_CITATION_FLAG_REASON = 'Citation support is stale or weak.'
export const DEFAULT_RECOMMENDATION_REVIEW_SOURCE_PAUSE_NOTE = 'Paused from recommendation review workflow because citation support is weak.'

export function formatRecommendationReviewState(value: RecommendationReviewState) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatRecommendationReviewFreshness(value: RecommendationReviewFreshnessLabel) {
  if (value === 'current') {
    return 'Current'
  }

  if (value === 'stale') {
    return 'Stale'
  }

  return 'Expired'
}

export function formatRecommendationReviewSupportStrength(value: RecommendationReviewSupportStrength) {
  if (value === 'unsupported') {
    return 'Unsupported'
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatRecommendationTrustScore(value: RecommendationReviewTrustScore) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatRecommendationRunStatus(value: RecommendationReviewRunStatus) {
  if (value === 'degraded') {
    return 'Degraded'
  }

  if (value === 'failed') {
    return 'Failed'
  }

  return 'Completed'
}
