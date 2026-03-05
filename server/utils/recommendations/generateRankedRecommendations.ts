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
} from './rankRecommendationCandidates'
import {
  qualifyWeakRecommendationResults,
  type QualifiedBlockedRecommendation,
  type QualifiedComposedRecommendation,
  type QualifiedDirectRecommendation,
} from './qualifyWeakRecommendationResults'

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
    direct: QualifiedDirectRecommendation[]
    blocked: QualifiedBlockedRecommendation[]
    composed: QualifiedComposedRecommendation[]
  }
} | null

type RecommendationResultsPersistedRecord = {
  runId: string
  profileSnapshotId: string
  rankedAt: number
  noComposedReason: string
  results: {
    direct: QualifiedDirectRecommendation[]
    blocked: QualifiedBlockedRecommendation[]
    composed: QualifiedComposedRecommendation[]
  }
}

type RecommendationResultsWriteRecord = RecommendationResultsPersistedRecord & {
  terminalStatus: 'completed' | 'degraded' | 'failed'
  terminalStatusMessage: string
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
      terminalStatus: existingResults!.status === 'completed'
        ? 'completed'
        : existingResults!.status === 'degraded'
          ? 'degraded'
          : 'failed',
      terminalStatusMessage: existingResults!.status === 'completed'
        ? 'Recommendation evaluation completed.'
        : existingResults!.status === 'degraded'
          ? 'Recommendation evaluation completed with low-confidence outputs. Review caveats before acting.'
          : 'Recommendation evaluation could not produce trustworthy recommendations. Please retry later or update your inputs before rerunning.',
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

  const qualified = qualifyWeakRecommendationResults({
    direct: ranked.direct,
    blocked: ranked.blocked,
    composed: ranked.composed,
    blockedOutcomes: pathwayEvaluation.blocked.map(outcome => ({
      pathwayId: outcome.pathwayId,
      unmetConditions: [...outcome.unmetConditions],
    })),
  })

  const persisted = await input.convex.mutation(
    (anyApi as any).recommendationRuns.writeRankedRecommendationsForUser,
    {
      runId: input.runId,
      userId: input.userId,
      profileSnapshotId: pathwayEvaluation.profileSnapshotId,
      direct: qualified.direct,
      blocked: qualified.blocked,
      composed: qualified.composed,
      noComposedReason: composed.noComposedReason,
    },
  ) as RecommendationResultsPersistedRecord

  return {
    ...persisted,
    terminalStatus: qualified.terminalStatus,
    terminalStatusMessage: qualified.terminalStatusMessage,
  }
}
