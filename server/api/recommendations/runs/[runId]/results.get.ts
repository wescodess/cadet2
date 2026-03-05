import { anyApi } from 'convex/server'
import { getRouterParam } from 'h3'

import { requireWorkspaceUserSession } from '../../../../utils/auth/requireUserSession'
import { createConvexAdminClient } from '../../../../utils/convex-admin-client'
import { MVP_PATHWAY_IDS } from '../../../../utils/pathways/mvpPathwayCatalog'

type RecommendationResultTier = 'strong-fit' | 'conditional-fit' | 'lower-confidence'
type RecommendationQualification = 'supported' | 'low-confidence' | 'withheld'
type RecommendationConfidence = 'high' | 'medium' | 'low' | 'withheld'
type RecommendationFreshness = 'fresh' | 'stale' | 'unknown'

type RankedDirectRecommendation = {
  pathwayId: string
  type: 'direct'
  rank: number
  tier: RecommendationResultTier
  score: number
  qualification: RecommendationQualification
  confidence: RecommendationConfidence
  freshness: RecommendationFreshness
  caveat: string
}

type RankedBlockedRecommendation = {
  pathwayId: string
  type: 'blocked'
  rank: number
  tier: RecommendationResultTier
  score: number
  qualification: RecommendationQualification
  confidence: RecommendationConfidence
  freshness: RecommendationFreshness
  caveat: string
}

type RankedComposedRecommendation = {
  pathwayId: string
  type: 'composed'
  rank: number
  tier: RecommendationResultTier
  score: number
  composedSteps: string[]
  qualification: RecommendationQualification
  confidence: RecommendationConfidence
  freshness: RecommendationFreshness
  caveat: string
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
} | null

const supportedPathwayIds = new Set<string>(MVP_PATHWAY_IDS)

function sortByRank<T extends { rank: number }>(candidates: T[]) {
  return [...candidates].sort((left, right) => left.rank - right.rank)
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
        noComposedReason: 'Recommendation evaluation is temporarily unavailable. Please retry later or update your inputs before rerunning.',
      }
    }

    throw createError({
      statusCode: 409,
      statusMessage: 'Recommendation ranking not ready',
    })
  }

  return {
    runId: record.runId,
    profileSnapshotId: record.profileSnapshotId,
    status: record.status,
    results: {
      direct: sortByRank(record.results.direct)
        .filter(candidate => supportedPathwayIds.has(candidate.pathwayId))
        .map(candidate => ({
          pathwayId: candidate.pathwayId,
          type: 'direct' as const,
          rank: candidate.rank,
          tier: candidate.tier,
          score: candidate.score,
          qualification: candidate.qualification,
          confidence: candidate.confidence,
          freshness: candidate.freshness,
          caveat: candidate.caveat,
        })),
      blocked: sortByRank(record.results.blocked)
        .filter(candidate => supportedPathwayIds.has(candidate.pathwayId))
        .map(candidate => ({
          pathwayId: candidate.pathwayId,
          type: 'blocked' as const,
          rank: candidate.rank,
          tier: candidate.tier,
          score: candidate.score,
          qualification: candidate.qualification,
          confidence: candidate.confidence,
          freshness: candidate.freshness,
          caveat: candidate.caveat,
        })),
      composed: sortByRank(record.results.composed)
        .filter(candidate => supportedPathwayIds.has(candidate.pathwayId))
        .map(candidate => ({
          pathwayId: candidate.pathwayId,
          type: 'composed' as const,
          rank: candidate.rank,
          tier: candidate.tier,
          score: candidate.score,
          composedSteps: candidate.composedSteps,
          qualification: candidate.qualification,
          confidence: candidate.confidence,
          freshness: candidate.freshness,
          caveat: candidate.caveat,
        })),
    },
    noComposedReason: record.noComposedReason,
  }
})
