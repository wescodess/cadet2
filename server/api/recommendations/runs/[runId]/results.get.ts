import { anyApi } from 'convex/server'
import { getRouterParam } from 'h3'

import { requireWorkspaceUserSession } from '../../../../utils/auth/requireUserSession'
import {
  buildRecommendationComparison,
  buildRecommendationPathwayType,
  type RecommendationComparison,
  type RecommendationComparisonGroup,
  type RecommendationPathwayType,
} from '../../../../utils/recommendations/buildRecommendationComparison'
import { createConvexAdminClient } from '../../../../utils/convex-admin-client'
import { MVP_PATHWAY_IDS } from '../../../../utils/pathways/mvpPathwayCatalog'

/**
 * Server-side recommendation result types.
 * Client mirror: app/lib/recommendations/comparison.ts
 * Test mirror: tests/support/fixtures/factories/recommendation-comparison-factory.ts
 */
type RecommendationResultTier = 'strong-fit' | 'conditional-fit' | 'lower-confidence'
type RecommendationQualification = 'supported' | 'low-confidence' | 'withheld'
type RecommendationConfidence = 'high' | 'medium' | 'low' | 'withheld'
type RecommendationFreshness = 'fresh' | 'stale' | 'unknown'
type RecommendationFitSignalState = 'strength' | 'watch' | 'gap'

type RecommendationFitSignal = {
  id: string
  label: string
  detail: string
  state: RecommendationFitSignalState
}

type RecommendationBlocker = {
  id: string
  label: string
  detail: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

type RecommendationTradeoff = {
  id: string
  dimension: 'effort' | 'timing' | 'complexity' | 'cost'
  summary: string
  impact: 'high' | 'medium' | 'low'
}

type RecommendationImprovementAction = {
  id: string
  title: string
  detail: string
  priority: 'now' | 'next' | 'later'
  expectedImpact: string
}

type RankedDirectRecommendation = {
  pathwayId: string
  type: 'direct'
  rank: number
  tier: RecommendationResultTier
  score: number
  rationale: string
  fitSignals: RecommendationFitSignal[]
  qualification: RecommendationQualification
  confidence: RecommendationConfidence
  freshness: RecommendationFreshness
  caveat: string
  blockers: RecommendationBlocker[]
  tradeoffs: RecommendationTradeoff[]
  improvementActions: RecommendationImprovementAction[]
  pathwayType?: RecommendationPathwayType
}

type RankedBlockedRecommendation = {
  pathwayId: string
  type: 'blocked'
  rank: number
  tier: RecommendationResultTier
  score: number
  rationale: string
  fitSignals: RecommendationFitSignal[]
  qualification: RecommendationQualification
  confidence: RecommendationConfidence
  freshness: RecommendationFreshness
  caveat: string
  blockers: RecommendationBlocker[]
  tradeoffs: RecommendationTradeoff[]
  improvementActions: RecommendationImprovementAction[]
  pathwayType?: RecommendationPathwayType
}

type RankedComposedRecommendation = {
  pathwayId: string
  type: 'composed'
  rank: number
  tier: RecommendationResultTier
  score: number
  composedSteps: string[]
  rationale: string
  fitSignals: RecommendationFitSignal[]
  qualification: RecommendationQualification
  confidence: RecommendationConfidence
  freshness: RecommendationFreshness
  caveat: string
  blockers: RecommendationBlocker[]
  tradeoffs: RecommendationTradeoff[]
  improvementActions: RecommendationImprovementAction[]
  pathwayType?: RecommendationPathwayType
}

type RecommendationResultsRecord = {
  runId: string
  profileSnapshotId: string
  status: 'queued' | 'evaluating' | 'completed' | 'degraded' | 'failed'
  rankedAt: number | null
  noComposedReason: string
  results: {
    direct: RankedDirectRecommendation[]
    blocked: RankedBlockedRecommendation[]
    composed: RankedComposedRecommendation[]
  }
  comparison?: RecommendationComparison
} | null

const supportedPathwayIds = new Set<string>(MVP_PATHWAY_IDS)

function sortByRank<T extends { rank: number }>(candidates: T[]) {
  return [...candidates].sort((left, right) => left.rank - right.rank)
}

function normalizeBlockers(value: unknown): RecommendationBlocker[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is RecommendationBlocker => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map(entry => ({
      id: entry.id,
      label: entry.label,
      detail: entry.detail,
      severity: entry.severity,
    }))
}

function normalizeTradeoffs(value: unknown): RecommendationTradeoff[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is RecommendationTradeoff => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map(entry => ({
      id: entry.id,
      dimension: entry.dimension,
      summary: entry.summary,
      impact: entry.impact,
    }))
}

function normalizeImprovementActions(value: unknown): RecommendationImprovementAction[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is RecommendationImprovementAction => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map(entry => ({
      id: entry.id,
      title: entry.title,
      detail: entry.detail,
      priority: entry.priority,
      expectedImpact: entry.expectedImpact,
    }))
}

function normalizeComposedSteps(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((step): step is string => typeof step === 'string' && step.trim().length > 0)
}

export default defineEventHandler(async (event) => {
  const { userId } = await requireWorkspaceUserSession(event)
  const runId = getRouterParam(event, 'runId')?.trim() || ''

  if (!runId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid run identifier',
    })
  }

  const convex = await createConvexAdminClient()
  const record = await convex.query(
    (anyApi as any).recommendationRuns.readRankedRecommendationsForUser,
    {
      runId,
      userId,
    },
  ) as RecommendationResultsRecord

  if (!record) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Recommendation run not found',
    })
  }

  if (!record.rankedAt) {
    if (record.status === 'failed') {
      return {
        runId: record.runId,
        profileSnapshotId: record.profileSnapshotId,
        status: record.status,
        results: {
          direct: [],
          blocked: [],
          composed: [],
        },
        comparison: buildRecommendationComparison({
          directCount: 0,
          blockedCount: 0,
          composedCount: 0,
          noComposedReason: 'Recommendation evaluation is temporarily unavailable. Please retry later or update your inputs before rerunning.',
        }),
        noComposedReason: 'Recommendation evaluation is temporarily unavailable. Please retry later or update your inputs before rerunning.',
      }
    }

    throw createError({
      statusCode: 409,
      statusMessage: 'Recommendation ranking not ready',
    })
  }

  const direct = sortByRank(record.results.direct)
    .filter(candidate => supportedPathwayIds.has(candidate.pathwayId))
    .map(candidate => ({
      pathwayId: candidate.pathwayId,
      type: 'direct' as const,
      rank: candidate.rank,
      tier: candidate.tier,
      score: candidate.score,
      rationale: candidate.rationale,
      fitSignals: candidate.fitSignals,
      qualification: candidate.qualification,
      confidence: candidate.confidence,
      freshness: candidate.freshness,
      caveat: candidate.caveat,
      blockers: normalizeBlockers(candidate.blockers),
      tradeoffs: normalizeTradeoffs(candidate.tradeoffs),
      improvementActions: normalizeImprovementActions(candidate.improvementActions),
      pathwayType: buildRecommendationPathwayType('direct'),
    }))

  const blocked = sortByRank(record.results.blocked)
    .filter(candidate => supportedPathwayIds.has(candidate.pathwayId))
    .map(candidate => ({
      pathwayId: candidate.pathwayId,
      type: 'blocked' as const,
      rank: candidate.rank,
      tier: candidate.tier,
      score: candidate.score,
      rationale: candidate.rationale,
      fitSignals: candidate.fitSignals,
      qualification: candidate.qualification,
      confidence: candidate.confidence,
      freshness: candidate.freshness,
      caveat: candidate.caveat,
      blockers: normalizeBlockers(candidate.blockers),
      tradeoffs: normalizeTradeoffs(candidate.tradeoffs),
      improvementActions: normalizeImprovementActions(candidate.improvementActions),
      pathwayType: buildRecommendationPathwayType('blocked'),
    }))

  const composed = sortByRank(record.results.composed)
    .filter(candidate => supportedPathwayIds.has(candidate.pathwayId))
    .map(candidate => ({
      pathwayId: candidate.pathwayId,
      type: 'composed' as const,
      rank: candidate.rank,
      tier: candidate.tier,
      score: candidate.score,
      composedSteps: normalizeComposedSteps(candidate.composedSteps),
      rationale: candidate.rationale,
      fitSignals: candidate.fitSignals,
      qualification: candidate.qualification,
      confidence: candidate.confidence,
      freshness: candidate.freshness,
      caveat: candidate.caveat,
      blockers: normalizeBlockers(candidate.blockers),
      tradeoffs: normalizeTradeoffs(candidate.tradeoffs),
      improvementActions: normalizeImprovementActions(candidate.improvementActions),
      pathwayType: buildRecommendationPathwayType('composed'),
    }))

  return {
    runId: record.runId,
    profileSnapshotId: record.profileSnapshotId,
    status: record.status,
    results: {
      direct,
      blocked,
      composed,
    },
    comparison: buildRecommendationComparison({
      directCount: direct.length,
      blockedCount: blocked.length,
      composedCount: composed.length,
      noComposedReason: record.noComposedReason,
    }),
    noComposedReason: record.noComposedReason,
  }
})
