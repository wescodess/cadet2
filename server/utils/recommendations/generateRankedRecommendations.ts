import { anyApi } from 'convex/server'

import {
  generateComposedPathways,
} from '../pathways/generateComposedPathways'
import type {
  BlockedPathwayOutcome,
  DirectPathwayOutcome,
} from '../pathways/evaluateDirectAndBlockedPathways'
import {
  rankRecommendationCandidates,
  type RankedBlockedRecommendation,
  type RankedComposedRecommendation,
  type RankedDirectRecommendation,
} from './rankRecommendationCandidates'

type RecommendationPathwayEvaluationRecord = {
  runId: string
  profileSnapshotId: string
  direct: DirectPathwayOutcome[]
  blocked: BlockedPathwayOutcome[]
  evaluatedAt: number | null
}

type RecommendationResultsReadRecord = {
  runId: string
  profileSnapshotId: string
  rankedAt: number | null
  noComposedReason: string
  status: 'queued' | 'evaluating' | 'completed' | 'degraded' | 'failed'
  results: {
    direct: RankedDirectRecommendation[]
    blocked: RankedBlockedRecommendation[]
    composed: RankedComposedRecommendation[]
  }
} | null

type RecommendationResultsWriteRecord = {
  runId: string
  profileSnapshotId: string
  rankedAt: number
  noComposedReason: string
  results: {
    direct: RankedDirectRecommendation[]
    blocked: RankedBlockedRecommendation[]
    composed: RankedComposedRecommendation[]
  }
}

type ConvexAdminClientLike = {
  query: (funcRef: unknown, args: Record<string, unknown>) => Promise<unknown>
  mutation: (funcRef: unknown, args: Record<string, unknown>) => Promise<unknown>
}

export type GenerateRankedRecommendationsForRunInput = {
  convex: ConvexAdminClientLike
  runId: string
  userId: string
  profileSnapshotId: string
}

export type GenerateRankedRecommendationsForRunResult = RecommendationResultsWriteRecord

function hasPersistedResults(record: RecommendationResultsReadRecord) {
  if (!record || !record.rankedAt) {
    return false
  }

  return record.results.direct.length > 0
    || record.results.blocked.length > 0
    || record.results.composed.length > 0
    || Boolean(record.noComposedReason)
}

function toComposedPathways(input: {
  direct: RecommendationPathwayEvaluationRecord['direct']
  blocked: RecommendationPathwayEvaluationRecord['blocked']
}) {
  return generateComposedPathways({
    direct: input.direct,
    blocked: input.blocked,
  })
}

export async function generateRankedRecommendationsForRun(
  input: GenerateRankedRecommendationsForRunInput,
): Promise<GenerateRankedRecommendationsForRunResult> {
  const existingResults = await input.convex.query(
    (anyApi as any).recommendationRuns.readRankedRecommendationsForUser,
    {
      runId: input.runId,
      userId: input.userId,
    },
  ) as RecommendationResultsReadRecord

  if (hasPersistedResults(existingResults)) {
    return {
      runId: existingResults!.runId,
      profileSnapshotId: existingResults!.profileSnapshotId,
      rankedAt: existingResults!.rankedAt || Date.now(),
      noComposedReason: existingResults!.noComposedReason || '',
      results: existingResults!.results,
    }
  }

  const pathwayEvaluation = await input.convex.query(
    (anyApi as any).recommendationRuns.readPathwayEvaluationForUser,
    {
      runId: input.runId,
      userId: input.userId,
    },
  ) as RecommendationPathwayEvaluationRecord | null

  if (!pathwayEvaluation || !pathwayEvaluation.evaluatedAt) {
    throw new Error('PATHWAY_EVALUATION_NOT_FOUND')
  }

  if (pathwayEvaluation.profileSnapshotId !== input.profileSnapshotId) {
    throw new Error('PROFILE_SNAPSHOT_MISMATCH')
  }

  const composed = toComposedPathways(pathwayEvaluation)

  const ranked = rankRecommendationCandidates({
    direct: pathwayEvaluation.direct,
    blocked: pathwayEvaluation.blocked,
    composed: composed.composed,
  })

  return await input.convex.mutation(
    (anyApi as any).recommendationRuns.writeRankedRecommendationsForUser,
    {
      runId: input.runId,
      userId: input.userId,
      profileSnapshotId: pathwayEvaluation.profileSnapshotId,
      direct: ranked.direct,
      blocked: ranked.blocked,
      composed: ranked.composed,
      noComposedReason: composed.noComposedReason,
    },
  ) as RecommendationResultsWriteRecord
}
