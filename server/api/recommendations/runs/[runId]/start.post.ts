import { anyApi } from 'convex/server'
import { getRouterParam } from 'h3'

import { requireWorkspaceUserSession } from '../../../../utils/auth/requireUserSession'
import { createConvexAdminClient } from '../../../../utils/convex-admin-client'
import {
  isCanonicalRecommendationStatus,
  normalizeStatusResponse,
  recommendationStartPayloadSchema,
} from '../../../../utils/recommendations/lifecycle'
import { assertRecommendationTestModeEnabled } from '../../../../utils/recommendations/testMode'

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

function toLifecycleError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  const serialized = (() => {
    try {
      return JSON.stringify(error)
    }
    catch {
      return ''
    }
  })()
  const haystack = `${message} ${serialized}`

  if (haystack.includes('RUN_NOT_FOUND')) {
    return createError({
      statusCode: 404,
      statusMessage: 'Recommendation run not found',
    })
  }

  if (haystack.includes('INVALID_STATUS_TRANSITION:')) {
    return createError({
      statusCode: 409,
      statusMessage: 'Recommendation run cannot transition to the requested status',
    })
  }

  if (haystack.includes('TEST_MODE_ONLY')) {
    return createError({
      statusCode: 404,
      statusMessage: 'Not found',
    })
  }

  return createError({
    statusCode: 500,
    statusMessage: 'Unable to start recommendation processing',
  })
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

  const body = await readBody<unknown>(event)
  const parsed = recommendationStartPayloadSchema.safeParse(body ?? {})

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    const issuePath = firstIssue?.path.join('.') || 'payload'

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${issuePath}: ${firstIssue?.message || 'Request body is invalid'}`,
    })
  }

  const requestedMode = parsed.data.mode || 'standard'
  if (requestedMode !== 'standard') {
    assertRecommendationTestModeEnabled()
  }

  const convex = await createConvexAdminClient()

  let run: RecommendationLifecycleRecord
  try {
    run = await convex.mutation(
      (anyApi as any).recommendationRuns.startProcessingForUser,
      {
        runId,
        userId,
        mode: parsed.data.mode,
      },
    ) as RecommendationLifecycleRecord
  }
  catch (error) {
    throw toLifecycleError(error)
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
