import { anyApi } from 'convex/server'
import { getRouterParam } from 'h3'

import { requireWorkspaceUserSession } from '../../../../utils/auth/requireUserSession'
import { createConvexAdminClient } from '../../../../utils/convex-admin-client'
import { MVP_PATHWAY_IDS } from '../../../../utils/pathways/mvpPathwayCatalog'

type DirectPathwayOutcome = {
  pathwayId: string
  status: 'direct'
}

type BlockedPathwayOutcome = {
  pathwayId: string
  status: 'blocked'
  unmetConditions: string[]
}

type RecommendationPathwayEvaluationRecord = {
  runId: string
  profileSnapshotId: string
  direct: DirectPathwayOutcome[]
  blocked: BlockedPathwayOutcome[]
  evaluatedAt: number | null
} | null

const supportedPathways = new Set<string>(MVP_PATHWAY_IDS)

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
  const evaluation = await convex.query(
    (anyApi as any).recommendationRuns.readPathwayEvaluationForUser,
    {
      runId,
      userId,
    },
  ) as RecommendationPathwayEvaluationRecord

  if (!evaluation) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Recommendation run not found',
    })
  }

  if (!evaluation.evaluatedAt) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Pathway evaluation is not available for this run yet',
    })
  }

  return {
    runId: evaluation.runId,
    profileSnapshotId: evaluation.profileSnapshotId,
    direct: evaluation.direct
      .filter(pathway => supportedPathways.has(pathway.pathwayId))
      .map(pathway => ({
        pathwayId: pathway.pathwayId,
        status: 'direct' as const,
      })),
    blocked: evaluation.blocked
      .filter(pathway => supportedPathways.has(pathway.pathwayId))
      .map(pathway => ({
        pathwayId: pathway.pathwayId,
        status: 'blocked' as const,
        unmetConditions: Array.isArray(pathway.unmetConditions)
          ? pathway.unmetConditions.filter(condition => typeof condition === 'string' && condition.trim().length > 0)
          : [],
      })),
  }
})
