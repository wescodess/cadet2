import { anyApi } from 'convex/server'
import { getRouterParam } from 'h3'

import { requireWorkspaceUserSession } from '../../../utils/auth/requireUserSession'
import { createConvexAdminClient } from '../../../utils/convex-admin-client'
import {
  buildRecommendationRunHistorySummary,
  loadRecommendationProfileSnapshotMap,
  recommendationRunHistoryUnavailableReason,
  toRecommendationRunHistoryStatus,
} from '../../../utils/recommendations/recommendationRunHistory'
import { readRecommendationResultsForUser } from '../../../utils/recommendations/readRecommendationResultsForUser'

type RecommendationRunRecord = {
  runId: string
  profileSnapshotId: string
  status: string
  createdAt: number | string | Date
  updatedAt: number | string | Date
}

const pathwayLabels: Record<string, string> = {
  'mvp-skilled-worker': 'Skilled Worker pathway',
  'mvp-provincial-nominee': 'Provincial Nominee pathway',
  'mvp-study-to-work': 'Study-to-Work pathway',
}

function normalizePathwayLabel(pathwayId: string) {
  return pathwayLabels[pathwayId] || pathwayId
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
  const runs = await convex.query(
    (anyApi as any).recommendationRuns.listForUser,
    { userId },
  ) as RecommendationRunRecord[]
  const targetRun = runs.find(run => run.runId === runId) || null

  if (!targetRun || !toRecommendationRunHistoryStatus(targetRun.status)) {
    setResponseStatus(event, 404)
    return {
      available: false as const,
      reason: recommendationRunHistoryUnavailableReason,
    }
  }

  const resultLookup = await readRecommendationResultsForUser({
    userId,
    runId,
  })

  if (resultLookup.state !== 'ready') {
    setResponseStatus(event, 404)
    return {
      available: false as const,
      reason: recommendationRunHistoryUnavailableReason,
    }
  }

  if (!resultLookup.hasRankedPayload) {
    setResponseStatus(event, 404)
    return {
      available: false as const,
      reason: recommendationRunHistoryUnavailableReason,
    }
  }

  const snapshotMap = await loadRecommendationProfileSnapshotMap({
    userId,
    snapshotIds: [targetRun.profileSnapshotId],
  })
  const profileSnapshot = snapshotMap.get(targetRun.profileSnapshotId)

  if (!profileSnapshot) {
    setResponseStatus(event, 404)
    return {
      available: false as const,
      reason: recommendationRunHistoryUnavailableReason,
    }
  }

  const latestRunId = runs.find(run => Boolean(toRecommendationRunHistoryStatus(run.status)))?.runId || ''
  const normalizedRecord = resultLookup.record
  const recommendationCount =
    normalizedRecord.results.direct.length
    + normalizedRecord.results.blocked.length
    + normalizedRecord.results.composed.length

  return {
    available: true as const,
    run: {
      ...buildRecommendationRunHistorySummary({
        run: targetRun,
        recommendationCount,
        isLatest: targetRun.runId === latestRunId,
        isAvailable: true,
        profileSnapshot,
      }),
      profileSnapshotId: targetRun.profileSnapshotId,
    },
    profileSnapshot,
    results: {
      direct: normalizedRecord.results.direct.map(candidate => ({
        ...candidate,
        title: normalizePathwayLabel(candidate.pathwayId),
        summary: candidate.rationale,
      })),
      blocked: normalizedRecord.results.blocked.map(candidate => ({
        ...candidate,
        title: normalizePathwayLabel(candidate.pathwayId),
        summary: candidate.rationale,
      })),
      composed: normalizedRecord.results.composed.map(candidate => ({
        ...candidate,
        title: normalizePathwayLabel(candidate.pathwayId),
        summary: candidate.rationale,
      })),
    },
    comparison: normalizedRecord.comparison,
  }
})
