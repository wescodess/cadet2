import { anyApi } from 'convex/server'
import { getQuery } from 'h3'

import { requireWorkspaceUserSession } from '../../../utils/auth/requireUserSession'
import { createConvexAdminClient } from '../../../utils/convex-admin-client'
import {
  buildRecommendationRunHistorySummary,
  loadRecommendationProfileSnapshotMap,
  toRecommendationRunHistoryStatus,
} from '../../../utils/recommendations/recommendationRunHistory'

type RecommendationRunRecord = {
  hasRankedPayload?: boolean
  recommendationCount?: number
  runId: string
  profileSnapshotId: string
  status: string
  createdAt: number | string | Date
  updatedAt: number | string | Date
}

export default defineEventHandler(async (event) => {
  const { userId } = await requireWorkspaceUserSession(event)
  const query = getQuery(event)
  const statusFilter = typeof query.status === 'string'
    ? query.status.trim()
    : ''

  if (statusFilter && !toRecommendationRunHistoryStatus(statusFilter)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid run status filter',
    })
  }

  const convex = await createConvexAdminClient()
  const runs = await convex.query(
    (anyApi as any).recommendationRuns.listForUser,
    { userId },
  ) as RecommendationRunRecord[]

  const terminalRuns = runs.filter(run => Boolean(toRecommendationRunHistoryStatus(run.status)))
  const snapshotMap = await loadRecommendationProfileSnapshotMap({
    userId,
    snapshotIds: terminalRuns.map(run => run.profileSnapshotId),
  })
  const latestRunId = terminalRuns[0]?.runId || ''
  const runsWithMeta = terminalRuns.map(run =>
    buildRecommendationRunHistorySummary({
      run,
      recommendationCount: run.recommendationCount || 0,
      isLatest: run.runId === latestRunId,
      isAvailable: Boolean(run.hasRankedPayload),
      profileSnapshot: snapshotMap.get(run.profileSnapshotId),
    }),
  )

  const filteredRuns = statusFilter
    ? runsWithMeta.filter(run => run.status === statusFilter)
    : runsWithMeta

  return {
    runs: filteredRuns,
  }
})
