import { anyApi } from 'convex/server'
import { sql } from 'drizzle-orm'

import { normalizeStoredIntakeDraft } from '../intake/normalizeIntakePayload'
import {
  evaluateDirectAndBlockedPathways,
  type BlockedPathwayOutcome,
  type DirectPathwayOutcome,
} from '../pathways/evaluateDirectAndBlockedPathways'

type RecommendationProcessingMode =
  | 'standard'
  | 'recoverable-delay'
  | 'mock-completed'
  | 'mock-degraded'
  | 'mock-failed'

type RecommendationRunLookup = {
  runId: string
  profileSnapshotId: string
  status: string
}

type RecommendationPathwayWriteResult = {
  runId: string
  profileSnapshotId: string
  direct: DirectPathwayOutcome[]
  blocked: BlockedPathwayOutcome[]
  evaluatedAt: number
}

type ProfileSnapshotRow = {
  submittedPayload: unknown
}

type ConvexAdminClientLike = {
  query: (funcRef: unknown, args: Record<string, unknown>) => Promise<unknown>
  mutation: (funcRef: unknown, args: Record<string, unknown>) => Promise<unknown>
}

type EvaluatePathwayEligibilityForRunInput = {
  convex: ConvexAdminClientLike
  runId: string
  userId: string
  mode: RecommendationProcessingMode
}

async function loadSubmittedProfileSnapshot(userId: string, profileSnapshotId: string) {
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

  return normalizeStoredIntakeDraft(row.submittedPayload as {
    currentSection?: unknown
    sectionProgress?: unknown
    fieldValues?: unknown
  })
}

export async function evaluatePathwayEligibilityForRun(input: EvaluatePathwayEligibilityForRunInput) {
  const run = await input.convex.query(
    (anyApi as any).recommendationRuns.readStatusForUser,
    {
      runId: input.runId,
      userId: input.userId,
    },
  ) as RecommendationRunLookup | null

  if (!run) {
    throw new Error('RUN_NOT_FOUND')
  }

  const profileSnapshot = await loadSubmittedProfileSnapshot(input.userId, run.profileSnapshotId)
  if (!profileSnapshot) {
    throw new Error('PROFILE_SNAPSHOT_NOT_FOUND')
  }

  const pathwayEvaluation = evaluateDirectAndBlockedPathways({
    profileSnapshot,
    mode: input.mode,
  })

  return await input.convex.mutation(
    (anyApi as any).recommendationRuns.writePathwayEvaluationForUser,
    {
      runId: run.runId,
      userId: input.userId,
      profileSnapshotId: run.profileSnapshotId,
      direct: pathwayEvaluation.direct,
      blocked: pathwayEvaluation.blocked,
    },
  ) as RecommendationPathwayWriteResult
}
