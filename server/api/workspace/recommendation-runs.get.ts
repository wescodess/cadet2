import { anyApi } from 'convex/server'

import { requireWorkspaceUserSession } from '../../utils/auth/requireUserSession'
import { createConvexAdminClient } from '../../utils/convex-admin-client'

type RecommendationRunRecord = {
  runId: string
  profileSnapshotId: string
  status: string
  createdAt: number | string | Date
  updatedAt: number | string | Date
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'number') {
    const date = new Date(value)

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString()
    }
  }

  if (typeof value === 'string') {
    const date = new Date(value)

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString()
    }
  }

  return new Date().toISOString()
}

export default defineEventHandler(async (event) => {
  const { userId } = await requireWorkspaceUserSession(event)
  const convex = await createConvexAdminClient()

  const runs = await convex.query(
    (anyApi as any).recommendationRuns.listForUser,
    { userId },
  ) as RecommendationRunRecord[]

  return runs.map(run => ({
    runId: run.runId,
    profileSnapshotId: run.profileSnapshotId,
    status: run.status,
    createdAt: toIsoString(run.createdAt),
    updatedAt: toIsoString(run.updatedAt),
  }))
})
