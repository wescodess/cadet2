import { anyApi } from 'convex/server'
import { sql } from 'drizzle-orm'
import { getQuery } from 'h3'

import { requireWorkspaceUserSession } from '../../utils/auth/requireUserSession'
import { createConvexAdminClient } from '../../utils/convex-admin-client'
import { createEmptyIntakeDraft, normalizeStoredIntakeDraft } from '../../utils/intake/normalizeIntakePayload'

type DraftRow = {
  updatedAt: Date | string
  currentSection: string
  sectionProgress: unknown
  fieldValues: unknown
  sourceRunId: string | null
}

type RecommendationProfileRow = {
  submittedPayload: unknown
}

type SourceRunRecord = {
  profileSnapshotId: string
}

function toSavedAt(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }

  return null
}

function toSourceRunId(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

async function loadNewCycleDraft(input: {
  userId: string
  sourceRunId: string
}) {
  const convex = await createConvexAdminClient()
  const sourceRun = await convex.query(
    (anyApi as any).recommendationRuns.readStatusForUser,
    {
      runId: input.sourceRunId,
      userId: input.userId,
    },
  ) as SourceRunRecord | null

  if (!sourceRun) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Source planning cycle not found',
    })
  }

  const result = await db.execute(sql`
    SELECT "submittedPayload"
    FROM "recommendation_profiles"
    WHERE "snapshotId" = ${sourceRun.profileSnapshotId}
      AND "userId" = ${input.userId}
    LIMIT 1;
  `)

  const row = ((result as { rows?: RecommendationProfileRow[] }).rows || [])[0]

  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Source planning profile snapshot not found',
    })
  }

  const normalized = normalizeStoredIntakeDraft(row.submittedPayload as {
    currentSection?: unknown
    sectionProgress?: unknown
    fieldValues?: unknown
    sourceRunId?: unknown
  })

  return {
    status: 'ok',
    savedAt: null,
    currentSection: normalized.currentSection,
    sectionProgress: normalized.sectionProgress,
    values: normalized.fieldValues,
    sourceRunId: input.sourceRunId,
  }
}

export default defineEventHandler(async (event) => {
  const { userId } = await requireWorkspaceUserSession(event)
  const query = getQuery(event)
  const mode = typeof query.mode === 'string' ? query.mode.trim() : ''
  const sourceRunId = toSourceRunId(query.sourceRun)

  if (mode === 'new-cycle' && sourceRunId) {
    return await loadNewCycleDraft({
      userId,
      sourceRunId,
    })
  }

  const result = await db.execute(sql`
    SELECT
      "updatedAt",
      "currentSection",
      "sectionProgress",
      "fieldValues",
      "sourceRunId"
    FROM "intake_draft"
    WHERE "userId" = ${userId}
    LIMIT 1;
  `)

  const row = ((result as { rows?: DraftRow[] }).rows || [])[0]

  if (!row) {
    const emptyDraft = createEmptyIntakeDraft()

    return {
      status: 'ok',
      savedAt: null,
      currentSection: emptyDraft.currentSection,
      sectionProgress: emptyDraft.sectionProgress,
      values: emptyDraft.fieldValues,
      sourceRunId: null,
    }
  }

  const normalized = normalizeStoredIntakeDraft({
    currentSection: row.currentSection,
    sectionProgress: row.sectionProgress,
    fieldValues: row.fieldValues,
    sourceRunId: row.sourceRunId,
  })

  return {
    status: 'ok',
    savedAt: toSavedAt(row.updatedAt),
    currentSection: normalized.currentSection,
    sectionProgress: normalized.sectionProgress,
    values: normalized.fieldValues,
    sourceRunId: normalized.sourceRunId,
  }
})
