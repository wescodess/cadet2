import { randomUUID } from 'node:crypto'

import { anyApi } from 'convex/server'
import { sql } from 'drizzle-orm'
import { getRouterParam } from 'h3'

import { requireWorkspaceUserSession } from '../../../../utils/auth/requireUserSession'
import { createConvexAdminClient } from '../../../../utils/convex-admin-client'
import { normalizeStoredIntakeDraft } from '../../../../utils/intake/normalizeIntakePayload'
import { normalizeStatusResponse } from '../../../../utils/recommendations/lifecycle'

type IntakeDraftRow = {
  currentSection: string
  sectionProgress: unknown
  fieldValues: unknown
}

type RecommendationProfileRow = {
  submittedPayload: unknown
}

type RecommendationSourceRunRecord = {
  runId: string
  profileSnapshotId: string
  refreshedFromRunId?: string
  previousProfileSnapshotId?: string
  refreshRootRunId?: string
  refreshSequence?: number
  status: 'queued' | 'evaluating' | 'completed' | 'degraded' | 'failed'
  statusMessage?: string
  resumable?: boolean
  processingHeartbeatAt?: number | string
  createdAt: number | string | Date
  updatedAt: number | string | Date
}

async function loadLatestRefreshPayload(userId: string, sourceProfileSnapshotId: string) {
  const draftResult = await db.execute(sql`
    SELECT
      "currentSection",
      "sectionProgress",
      "fieldValues"
    FROM "intake_draft"
    WHERE "userId" = ${userId}
    ORDER BY "updatedAt" DESC
    LIMIT 1;
  `)

  const draftRow = ((draftResult as { rows?: IntakeDraftRow[] }).rows || [])[0]
  if (draftRow) {
    return normalizeStoredIntakeDraft({
      currentSection: draftRow.currentSection,
      sectionProgress: draftRow.sectionProgress,
      fieldValues: draftRow.fieldValues,
    })
  }

  const sourceSnapshotResult = await db.execute(sql`
    SELECT "submittedPayload"
    FROM "recommendation_profiles"
    WHERE "snapshotId" = ${sourceProfileSnapshotId}
      AND "userId" = ${userId}
    LIMIT 1;
  `)

  const sourceSnapshot = ((sourceSnapshotResult as { rows?: RecommendationProfileRow[] }).rows || [])[0]
  if (!sourceSnapshot) {
    throw new Error('PROFILE_SNAPSHOT_NOT_FOUND')
  }

  return normalizeStoredIntakeDraft(sourceSnapshot.submittedPayload as {
    currentSection?: unknown
    sectionProgress?: unknown
    fieldValues?: unknown
  })
}

function toRefreshError(error: unknown) {
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

  if (haystack.includes('PROFILE_SNAPSHOT_NOT_FOUND')) {
    return createError({
      statusCode: 404,
      statusMessage: 'Recommendation profile snapshot not found',
    })
  }

  return createError({
    statusCode: 500,
    statusMessage: 'Unable to refresh recommendation run',
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

  const convex = await createConvexAdminClient()
  const sourceRun = await convex.query(
    (anyApi as any).recommendationRuns.readStatusForUser,
    {
      runId,
      userId,
    },
  ) as RecommendationSourceRunRecord | null

  if (!sourceRun) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Recommendation run not found',
    })
  }

  const newRunId = `run_${randomUUID().replace(/-/g, '')}`
  const newProfileSnapshotId = `snapshot_${randomUUID().replace(/-/g, '')}`
  const refreshRootRunId = sourceRun.refreshRootRunId || sourceRun.runId
  const refreshSequence = Math.max(0, sourceRun.refreshSequence || 0) + 1

  let normalizedPayload: unknown
  try {
    normalizedPayload = await loadLatestRefreshPayload(userId, sourceRun.profileSnapshotId)
  }
  catch (error) {
    throw toRefreshError(error)
  }

  try {
    await db.execute(sql`
      INSERT INTO "recommendation_profiles" (
        "snapshotId",
        "userId",
        "submittedPayload",
        "createdAt"
      )
      VALUES (
        ${newProfileSnapshotId},
        ${userId},
        ${JSON.stringify(normalizedPayload)}::jsonb,
        now()
      );
    `)
  }
  catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to persist refreshed profile snapshot',
    })
  }

  let refreshedRun: RecommendationSourceRunRecord | null = null
  try {
    refreshedRun = await convex.mutation(
      (anyApi as any).recommendationRuns.createQueuedRun,
      {
        runId: newRunId,
        userId,
        profileSnapshotId: newProfileSnapshotId,
        refreshedFromRunId: sourceRun.runId,
        previousProfileSnapshotId: sourceRun.profileSnapshotId,
        refreshRootRunId,
        refreshSequence,
      },
    ) as RecommendationSourceRunRecord
  }
  catch {
    // Retry read to detect commit-on-timeout scenarios and avoid deleting a
    // snapshot that may already be linked to a created run.
    try {
      refreshedRun = await convex.query(
        (anyApi as any).recommendationRuns.readStatusForUser,
        {
          runId: newRunId,
          userId,
        },
      ) as RecommendationSourceRunRecord | null
    }
    catch {
    }
  }

  if (!refreshedRun) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to create refreshed recommendation run',
    })
  }

  setResponseStatus(event, 202)

  return normalizeStatusResponse({
    runId: refreshedRun.runId,
    profileSnapshotId: refreshedRun.profileSnapshotId,
    refreshedFromRunId: refreshedRun.refreshedFromRunId,
    previousProfileSnapshotId: refreshedRun.previousProfileSnapshotId,
    refreshRootRunId: refreshedRun.refreshRootRunId,
    refreshSequence: refreshedRun.refreshSequence,
    status: refreshedRun.status,
    statusMessage: refreshedRun.statusMessage,
    resumable: refreshedRun.resumable,
    processingHeartbeatAt: refreshedRun.processingHeartbeatAt,
    createdAt: refreshedRun.createdAt,
    updatedAt: refreshedRun.updatedAt,
  })
})
