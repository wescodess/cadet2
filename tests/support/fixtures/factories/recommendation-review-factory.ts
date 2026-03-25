import { faker } from '@faker-js/faker'

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

export const ADMIN_RECOMMENDATION_REVIEW_ROUTE = '/admin/recommendation-reviews'

function uniqueSeed(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '')
}

export function createRecommendationReviewRouteProbe(appBaseUrl: string) {
  const normalizedBaseUrl = normalizeBaseUrl(appBaseUrl)

  return {
    adminPath: `${normalizedBaseUrl}${ADMIN_RECOMMENDATION_REVIEW_ROUTE}`,
    adminAccessPath: `${normalizedBaseUrl}/api/admin/access`,
    adminSyncPath: `${normalizedBaseUrl}/api/admin/rag/convex-admin/sync-current-user`,
    listPath: `${normalizedBaseUrl}/api/admin/recommendation-reviews`,
    detailPath: (runId: string) => `${normalizedBaseUrl}/api/admin/recommendation-reviews/${encodeURIComponent(runId)}`,
    citationsPath: (runId: string) => `${normalizedBaseUrl}/api/admin/recommendation-reviews/${encodeURIComponent(runId)}/citations`,
    flagRunPath: (runId: string) => `${normalizedBaseUrl}/api/admin/recommendation-reviews/${encodeURIComponent(runId)}/flag`,
    resolveRunPath: (runId: string) => `${normalizedBaseUrl}/api/admin/recommendation-reviews/${encodeURIComponent(runId)}/resolve`,
    dismissRunPath: (runId: string) => `${normalizedBaseUrl}/api/admin/recommendation-reviews/${encodeURIComponent(runId)}/dismiss`,
    flagCitationPath: (runId: string, citationId: string) =>
      `${normalizedBaseUrl}/api/admin/recommendation-reviews/${encodeURIComponent(runId)}/citations/${encodeURIComponent(citationId)}/flag`,
    pauseSourcePath: (sourceId: string) => `${normalizedBaseUrl}/api/admin/rag/sources/${encodeURIComponent(sourceId)}/pause`,
  }
}

export function createRecommendationReviewRunSummary(
  overrides: Partial<RecommendationReviewRunSummary> = {},
): RecommendationReviewRunSummary {
  const runId = overrides.runId || uniqueSeed('recommendation-review-run')
  const profileSnapshotId = overrides.profileSnapshotId || uniqueSeed('recommendation-review-snapshot')

  return {
    runId,
    profileSnapshotId,
    createdAt: overrides.createdAt || new Date('2026-03-20T15:00:00.000Z').toISOString(),
    recommendationStatus: overrides.recommendationStatus || 'completed',
    trustScore: overrides.trustScore || 'medium',
    confidence: overrides.confidence || 'medium',
    freshness: overrides.freshness || 'stale',
    citationCount: overrides.citationCount ?? 4,
    reviewState: overrides.reviewState || 'pending',
    flaggedCitationCount: overrides.flaggedCitationCount ?? 1,
    anonymizedSubject: overrides.anonymizedSubject || 'Candidate A7C2',
    caveatCount: overrides.caveatCount ?? 2,
  }
}

export function createRecommendationReviewCitation(
  overrides: Partial<RecommendationReviewCitation> = {},
): RecommendationReviewCitation {
  return {
    citationId: overrides.citationId || faker.string.uuid(),
    sourceId: overrides.sourceId || uniqueSeed('source'),
    sourceName: overrides.sourceName || 'IRCC Express Entry policy bulletin',
    sourceUrl: overrides.sourceUrl || 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html',
    sourceType: overrides.sourceType || 'policy-bulletin',
    claimSnippet: overrides.claimSnippet || 'Language evidence still supports the current pathway claim.',
    pathwayId: overrides.pathwayId || 'mvp-skilled-worker',
    pathwayLabel: overrides.pathwayLabel || 'Skilled Worker pathway',
    freshness: overrides.freshness || 'current',
    supportStrength: overrides.supportStrength || 'adequate',
    matchContext: overrides.matchContext || 'Matched against the current language and work-experience inputs only.',
    reviewState: overrides.reviewState || 'pending',
    lastReviewedAt: overrides.lastReviewedAt === undefined ? null : overrides.lastReviewedAt,
    flagReason: overrides.flagReason === undefined ? null : overrides.flagReason,
  }
}

export function createRecommendationReviewRunDetail(
  run = createRecommendationReviewRunSummary(),
  overrides: Partial<RecommendationReviewRunDetailResponse> = {},
): RecommendationReviewRunDetailResponse {
  const citations = overrides.citations || [
    createRecommendationReviewCitation({
      sourceId: 'source-ircc-current',
      sourceName: 'IRCC language requirement guidance',
      freshness: 'current',
      supportStrength: 'strong',
      reviewState: 'resolved',
      lastReviewedAt: '2026-03-21T11:30:00.000Z',
    }),
    createRecommendationReviewCitation({
      sourceId: 'source-ministerial-order',
      sourceName: 'Ministerial instructions archive',
      freshness: 'stale',
      supportStrength: 'weak',
      reviewState: 'flagged',
      flagReason: 'Freshness exceeds review threshold for admin approval.',
    }),
    createRecommendationReviewCitation({
      sourceId: 'source-kb-gap',
      sourceName: 'Internal knowledge-base synthesis',
      freshness: 'expired',
      supportStrength: 'unsupported',
      reviewState: 'pending',
      claimSnippet: 'This claim currently has no fresh linked citation.',
    }),
  ]

  return {
    ok: true,
    run: {
      ...run,
      subjectReference: {
        label: run.anonymizedSubject,
        profileSnapshotId: run.profileSnapshotId,
      },
      trustSignals: {
        strong: 2,
        watch: 1,
        gaps: 1,
      },
      caveats: [
        'One citation is older than the freshness threshold.',
        'One pathway claim currently lacks direct source support.',
      ],
      citationBuckets: {
        all: citations.length,
        weakSupport: citations.filter(citation => citation.supportStrength === 'weak' || citation.supportStrength === 'unsupported').length,
        staleSources: citations.filter(citation => citation.freshness === 'stale' || citation.freshness === 'expired').length,
        missingReferences: citations.filter(citation => citation.supportStrength === 'unsupported').length,
      },
    },
    citations,
    ...overrides,
  }
}

export function createRecommendationReviewListResponse(
  items = [
    createRecommendationReviewRunSummary({
      reviewState: 'flagged',
      freshness: 'stale',
      trustScore: 'medium',
      recommendationStatus: 'degraded',
      flaggedCitationCount: 2,
    }),
    createRecommendationReviewRunSummary({
      recommendationStatus: 'completed',
      trustScore: 'high',
      freshness: 'current',
      reviewState: 'resolved',
      flaggedCitationCount: 0,
      anonymizedSubject: 'Candidate Q1M9',
    }),
  ],
): RecommendationReviewListResponse {
  return {
    ok: true,
    items,
    totalCount: items.length,
  }
}

export function createRecommendationReviewRunActionInput(reason = 'Trust issue requires admin follow-up.') {
  return {
    reason,
  }
}

export function createRecommendationReviewCitationFlagInput(reason = 'Citation support is stale or weak.') {
  return {
    reason,
  }
}
