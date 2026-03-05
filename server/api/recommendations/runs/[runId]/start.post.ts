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
import { evaluatePathwayEligibilityForRun } from '../../../../utils/recommendations/evaluatePathwayEligibility'
import { generateRankedRecommendationsForRun } from '../../../../utils/recommendations/generateRankedRecommendations'

type RecommendationLifecycleRecord = {
  runId: string
  profileSnapshotId: string
  refreshedFromRunId?: string
  previousProfileSnapshotId?: string
  refreshRootRunId?: string
  refreshSequence?: number
  status: string
  statusMessage?: string
  resumable?: boolean
  processingHeartbeatAt?: number | string
  createdAt: number | string | Date
  updatedAt: number | string | Date
}

function isTerminalRecommendationStatus(status: RecommendationLifecycleRecord['status']) {
  return status === 'completed' || status === 'degraded' || status === 'failed'
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

  if (haystack.includes('PROFILE_SNAPSHOT_NOT_FOUND')) {
    return createError({
      statusCode: 404,
      statusMessage: 'Recommendation profile snapshot not found',
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
  const existingRun = await convex.query(
    (anyApi as any).recommendationRuns.readStatusForUser,
    {
      runId,
      userId,
    },
  ) as RecommendationLifecycleRecord | null

  if (!existingRun) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Recommendation run not found',
    })
  }

  if (!isCanonicalRecommendationStatus(existingRun.status)) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Recommendation run status contract is invalid',
    })
  }

  // Preserve idempotent start behavior after completion/degradation/failure.
  if (
    isTerminalRecommendationStatus(existingRun.status)
    && (requestedMode === 'standard' || requestedMode === 'recoverable-delay')
  ) {
    return normalizeStatusResponse({
      runId: existingRun.runId,
      profileSnapshotId: existingRun.profileSnapshotId,
      refreshedFromRunId: existingRun.refreshedFromRunId,
      previousProfileSnapshotId: existingRun.previousProfileSnapshotId,
      refreshRootRunId: existingRun.refreshRootRunId,
      refreshSequence: existingRun.refreshSequence,
      status: existingRun.status,
      statusMessage: existingRun.statusMessage,
      resumable: existingRun.resumable,
      processingHeartbeatAt: existingRun.processingHeartbeatAt,
      createdAt: existingRun.createdAt,
      updatedAt: existingRun.updatedAt,
    })
  }

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

  if (run.status === 'queued' || run.status === 'evaluating') {
    try {
      await evaluatePathwayEligibilityForRun({
        convex,
        runId: run.runId,
        userId,
        mode: requestedMode,
      })
    }
    catch (error) {
      // Keep lifecycle state safe when pathway evaluation fails after start transition.
      try {
        await convex.mutation(
          (anyApi as any).recommendationRuns.setTerminalStatusForUser,
          {
            runId: run.runId,
            userId,
            status: 'failed',
            statusMessage: 'Recommendation evaluation is temporarily unavailable. Please retry later or update your inputs before rerunning.',
          },
        )
      }
      catch {
      }

      const mappedError = toLifecycleError(error)
      if (mappedError.statusCode === 500) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Unable to evaluate supported pathways for this run',
        })
      }

      throw mappedError
    }

    if (requestedMode === 'standard') {
      try {
        const ranking = await generateRankedRecommendationsForRun({
          convex,
          runId: run.runId,
          userId,
          profileSnapshotId: run.profileSnapshotId,
        })

        run = await convex.mutation(
          (anyApi as any).recommendationRuns.setTerminalStatusForUser,
          {
            runId: run.runId,
            userId,
            status: ranking.terminalStatus,
            statusMessage: ranking.terminalStatusMessage,
          },
        ) as RecommendationLifecycleRecord
      }
      catch (error) {
        // Keep lifecycle state safe when ranking fails after pathway evaluation succeeds.
        try {
          await convex.mutation(
            (anyApi as any).recommendationRuns.setTerminalStatusForUser,
            {
              runId: run.runId,
              userId,
              status: 'failed',
              statusMessage: 'Recommendation evaluation is temporarily unavailable. Please retry later or update your inputs before rerunning.',
            },
          )
        }
        catch {
        }

        const mappedError = toLifecycleError(error)
        if (mappedError.statusCode === 500) {
          throw createError({
            statusCode: 500,
            statusMessage: 'Unable to generate ranked recommendations for this run',
          })
        }

        throw mappedError
      }
    }
  }

  return normalizeStatusResponse({
    runId: run.runId,
    profileSnapshotId: run.profileSnapshotId,
    refreshedFromRunId: run.refreshedFromRunId,
    previousProfileSnapshotId: run.previousProfileSnapshotId,
    refreshRootRunId: run.refreshRootRunId,
    refreshSequence: run.refreshSequence,
    status: run.status,
    statusMessage: run.statusMessage,
    resumable: run.resumable,
    processingHeartbeatAt: run.processingHeartbeatAt,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  })
})
