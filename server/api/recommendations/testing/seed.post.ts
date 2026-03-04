import { randomUUID } from 'node:crypto'

import { anyApi } from 'convex/server'
import { z } from 'zod'

import { requireWorkspaceUserSession } from '../../../utils/auth/requireUserSession'
import { createConvexAdminClient } from '../../../utils/convex-admin-client'
import {
  canonicalRecommendationStatuses,
  normalizeStatusResponse,
} from '../../../utils/recommendations/lifecycle'
import { assertRecommendationTestModeEnabled } from '../../../utils/recommendations/testMode'

const recommendationSeedPayloadSchema = z.object({
  runId: z.string().trim().min(1).optional(),
  profileSnapshotId: z.string().trim().min(1).optional(),
  status: z.enum(canonicalRecommendationStatuses).default('queued'),
  statusMessage: z.string().trim().min(1).optional(),
  resetExisting: z.boolean().optional(),
}).strict()

type SeededRunRecord = {
  runId: string
  profileSnapshotId: string
  status: typeof canonicalRecommendationStatuses[number]
  statusMessage?: string
  resumable?: boolean
  processingHeartbeatAt?: number | string
  createdAt: number | string | Date
  updatedAt: number | string | Date
}

export default defineEventHandler(async (event) => {
  assertRecommendationTestModeEnabled()

  const { userId } = await requireWorkspaceUserSession(event)
  const body = await readBody<unknown>(event)
  const parsed = recommendationSeedPayloadSchema.safeParse(body ?? {})

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    const issuePath = firstIssue?.path.join('.') || 'payload'

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${issuePath}: ${firstIssue?.message || 'Request body is invalid'}`,
    })
  }

  const convex = await createConvexAdminClient()

  if (parsed.data.resetExisting) {
    await convex.mutation(
      (anyApi as any).recommendationRuns.resetRunsForUser,
      { userId },
    )
  }

  const seededRun = await convex.mutation(
    (anyApi as any).recommendationRuns.seedRunForUser,
    {
      userId,
      runId: parsed.data.runId || `run_seed_${randomUUID().replace(/-/g, '')}`,
      profileSnapshotId: parsed.data.profileSnapshotId || `snapshot_seed_${randomUUID().replace(/-/g, '')}`,
      status: parsed.data.status,
      statusMessage: parsed.data.statusMessage,
    },
  ) as SeededRunRecord

  return normalizeStatusResponse(seededRun)
})
