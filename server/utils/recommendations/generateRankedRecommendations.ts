import { anyApi } from 'convex/server'
import { sql } from 'drizzle-orm'

import {
  generateComposedPathways,
} from '../pathways/generateComposedPathways'
import type {
  BlockedPathwayOutcome,
  DirectPathwayOutcome,
} from '../pathways/evaluateDirectAndBlockedPathways'
import { normalizeStoredIntakeDraft } from '../intake/normalizeIntakePayload'
import {
  buildRecommendationRationale,
  toRecommendationProfileContext,
} from './buildRecommendationRationale'
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

type ProfileSnapshotRow = {
  submittedPayload: unknown
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

async function loadRecommendationProfileContext(userId: string, profileSnapshotId: string) {
  const result = await db.execute(sql`
    SELECT "submittedPayload"
    FROM "recommendation_profiles"
    WHERE "snapshotId" = ${profileSnapshotId}
      AND "userId" = ${userId}
    LIMIT 1;
  `)

  const row = ((result as { rows?: ProfileSnapshotRow[] }).rows || [])[0]
  if (!row) {
    return null
  }

  const normalizedProfile = normalizeStoredIntakeDraft(row.submittedPayload as {
    currentSection?: unknown
    sectionProgress?: unknown
    fieldValues?: unknown
  })

  return toRecommendationProfileContext(normalizedProfile)
}

function toBlockedOutcomeIndex(blockedOutcomes: RecommendationPathwayEvaluationRecord['blocked']) {
  return blockedOutcomes.reduce((map, outcome) => {
    map.set(outcome.pathwayId, [...outcome.unmetConditions])
    return map
  }, new Map<string, string[]>())
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

  const blockedOutcomeIndex = toBlockedOutcomeIndex(pathwayEvaluation.blocked)
  const profileContext = await loadRecommendationProfileContext(input.userId, pathwayEvaluation.profileSnapshotId)
  if (!profileContext) {
    throw new Error('PROFILE_SNAPSHOT_NOT_FOUND')
  }

  const enriched = {
    direct: qualified.direct.map(candidate => ({
      ...candidate,
      ...buildRecommendationRationale({
        candidate,
        profile: profileContext,
      }),
    })),
    blocked: qualified.blocked.map(candidate => ({
      ...candidate,
      ...buildRecommendationRationale({
        candidate,
        profile: profileContext,
        unmetConditions: blockedOutcomeIndex.get(candidate.pathwayId) || [],
      }),
    })),
    composed: qualified.composed.map(candidate => ({
      ...candidate,
      ...buildRecommendationRationale({
        candidate,
        profile: profileContext,
        unmetConditions: blockedOutcomeIndex.get(candidate.pathwayId) || [],
      }),
    })),
  }

  const persisted = await input.convex.mutation(
    (anyApi as any).recommendationRuns.writeRankedRecommendationsForUser,
    {
      runId: input.runId,
      userId: input.userId,
      profileSnapshotId: pathwayEvaluation.profileSnapshotId,
      direct: enriched.direct,
      blocked: enriched.blocked,
      composed: enriched.composed,
      noComposedReason: composed.noComposedReason,
    },
  ) as RecommendationResultsPersistedRecord

  return {
    ...persisted,
    terminalStatus: qualified.terminalStatus,
    terminalStatusMessage: qualified.terminalStatusMessage,
  }
}
