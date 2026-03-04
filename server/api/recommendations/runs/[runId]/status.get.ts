import { anyApi } from 'convex/server'
import { getRouterParam } from 'h3'

import { requireWorkspaceUserSession } from '../../../../utils/auth/requireUserSession'
import { createConvexAdminClient } from '../../../../utils/convex-admin-client'
import {
  isCanonicalRecommendationStatus,
  normalizeStatusResponse,
} from '../../../../utils/recommendations/lifecycle'

type RecommendationLifecycleRecord = {
  runId: string
  profileSnapshotId: string
  status: string
  statusMessage?: string
  resumable?: boolean
  processingHeartbeatAt?: number | string
  createdAt: number | string | Date
  updatedAt: number | string | Date
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
  const run = await convex.query(
    (anyApi as any).recommendationRuns.readStatusForUser,
    {
      runId,
      userId,
    },
  ) as RecommendationLifecycleRecord | null

  if (!run) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Recommendation run not found',
    })
  }

  if (!isCanonicalRecommendationStatus(run.status)) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Recommendation run status contract is invalid',
    })
  }

  return normalizeStatusResponse({
    runId: run.runId,
    profileSnapshotId: run.profileSnapshotId,
    status: run.status,
    statusMessage: run.statusMessage,
    resumable: run.resumable,
    processingHeartbeatAt: run.processingHeartbeatAt,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  })
})
