import { randomUUID } from 'node:crypto'
import { anyApi } from 'convex/server'
import { sql } from 'drizzle-orm'

import { requireWorkspaceUserSession } from '../../utils/auth/requireUserSession'
import { createConvexAdminClient } from '../../utils/convex-admin-client'
import { normalizeStoredIntakeDraft } from '../../utils/intake/normalizeIntakePayload'
import type { IntakeSection } from '../../utils/intake/intakeSchemas'

type DraftRow = {
  currentSection: string
  sectionProgress: unknown
  fieldValues: unknown
}

type SnapshotRow = {
  createdAt: Date | string
}

type SubmitRequestBody = {
  sourceRunId?: unknown
}

type RecommendationRunRecord = {
  runId: string
  profileSnapshotId: string
  refreshedFromRunId?: string
  previousProfileSnapshotId?: string
  refreshRootRunId?: string
  refreshSequence?: number
  status: string
  createdAt: number
  updatedAt: number
}

type RecommendationSourceRunRecord = {
  runId: string
  profileSnapshotId: string
  refreshRootRunId?: string
  refreshSequence?: number
}

const requiredFieldKeysBySection: Record<IntakeSection, string[]> = {
  personal: [
    'firstName',
    'lastName',
    'email',
    'dateOfBirth',
    'countryOfCitizenship',
    'maritalStatus',
    'dependantsCount',
  ],
  education: [
    'highestLevel',
    'fieldOfStudy',
    'countryOfEducation',
    'hasCanadianEducation',
    'credentialEcaStatus',
  ],
  work: [
    'currentRole',
    'nocTeerCategory',
    'yearsSkilledExperience',
    'canadianWorkExperienceYears',
    'hasValidJobOffer',
    'selfEmployedExperience',
  ],
  immigration: [
    'currentCountry',
    'currentStatusInCanada',
    'intendedProvince',
    'openToRelocation',
    'englishClb',
    'availableSettlementFundsCad',
    'previousRefusal',
  ],
  goals: [
    'primaryGoal',
    'targetTimelineMonths',
    'budgetCad',
    'priorityPreference',
    'locationPreference',
    'willingToStudyOrRetrain',
    'hasFamilyInCanada',
  ],
}

function toIsoString(value: unknown, fallback = new Date()): string {
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

  return fallback.toISOString()
}

function hasRequiredValue(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value)
  }

  if (typeof value === 'string') {
    return value.trim().length > 0
  }

  return false
}

function toSourceRunId(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function isDraftSubmissionComplete(input: {
  sectionProgress: Record<IntakeSection, boolean>
  fieldValues: Record<IntakeSection, Record<string, unknown>>
}) {
  const incompleteSections: IntakeSection[] = []

  for (const [sectionId, requiredKeys] of Object.entries(requiredFieldKeysBySection) as [IntakeSection, string[]][]) {
    const sectionMarkedComplete = input.sectionProgress[sectionId] === true
    const sectionValues = input.fieldValues[sectionId] || {}
    const hasAllRequiredValues = requiredKeys.every(key => hasRequiredValue(sectionValues[key]))

    if (!sectionMarkedComplete || !hasAllRequiredValues) {
      incompleteSections.push(sectionId)
    }
  }

  return {
    isComplete: incompleteSections.length === 0,
    incompleteSections,
  }
}

export default defineEventHandler(async (event) => {
  const { userId } = await requireWorkspaceUserSession(event)
  const body = await readBody<SubmitRequestBody | null>(event)
  const sourceRunId = toSourceRunId(body?.sourceRunId)

  const draftResult = await db.execute(sql`
    SELECT
      "currentSection",
      "sectionProgress",
      "fieldValues"
    FROM "intake_draft"
    WHERE "userId" = ${userId}
    LIMIT 1;
  `)

  const draftRow = ((draftResult as { rows?: DraftRow[] }).rows || [])[0]

  if (!draftRow) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Intake is incomplete. Missing required section data.',
    })
  }

  const normalizedDraft = normalizeStoredIntakeDraft({
    currentSection: draftRow.currentSection,
    sectionProgress: draftRow.sectionProgress,
    fieldValues: draftRow.fieldValues,
  })

  const completion = isDraftSubmissionComplete(normalizedDraft)

  if (!completion.isComplete) {
    throw createError({
      statusCode: 400,
      statusMessage: `Intake is incomplete. Missing required details in: ${completion.incompleteSections.join(', ')}.`,
    })
  }

  const convex = await createConvexAdminClient()
  let sourceRun: RecommendationSourceRunRecord | null = null

  if (sourceRunId) {
    sourceRun = await convex.query(
      (anyApi as any).recommendationRuns.readStatusForUser,
      {
        runId: sourceRunId,
        userId,
      },
    ) as RecommendationSourceRunRecord | null

    if (!sourceRun) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Source planning cycle not found',
      })
    }
  }

  const profileSnapshotId = `snapshot_${randomUUID().replace(/-/g, '')}`
  const runId = `run_${randomUUID().replace(/-/g, '')}`
  const serializedPayload = JSON.stringify(normalizedDraft)

  const snapshotResult = await db.execute(sql`
    INSERT INTO "recommendation_profiles" (
      "snapshotId",
      "userId",
      "submittedPayload",
      "createdAt"
    )
    VALUES (
      ${profileSnapshotId},
      ${userId},
      ${serializedPayload}::jsonb,
      now()
    )
    RETURNING "createdAt";
  `)

  const snapshotRow = ((snapshotResult as { rows?: SnapshotRow[] }).rows || [])[0]

  if (!snapshotRow) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to persist submitted intake snapshot',
    })
  }

  let run: RecommendationRunRecord

  try {
    run = await convex.mutation(
      (anyApi as any).recommendationRuns.createQueuedRun,
      {
        runId,
        userId,
        profileSnapshotId,
        refreshedFromRunId: sourceRun?.runId,
        previousProfileSnapshotId: sourceRun?.profileSnapshotId,
        refreshRootRunId: sourceRun ? (sourceRun.refreshRootRunId || sourceRun.runId) : undefined,
        refreshSequence: sourceRun ? Math.max(0, sourceRun.refreshSequence || 0) + 1 : undefined,
      },
    ) as RecommendationRunRecord
  }
  catch {
    // Keep the relational + Convex write boundary consistent if run creation fails.
    await db.execute(sql`
      DELETE FROM "recommendation_profiles"
      WHERE "snapshotId" = ${profileSnapshotId}
        AND "userId" = ${userId};
    `)

    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to create recommendation run for submitted intake',
    })
  }

  const fallbackCreatedAt = new Date(toIsoString(snapshotRow.createdAt))

  setResponseStatus(event, 201)

  return {
    runId: run.runId,
    profileSnapshotId: run.profileSnapshotId,
    refreshedFromRunId: run.refreshedFromRunId,
    previousProfileSnapshotId: run.previousProfileSnapshotId,
    refreshRootRunId: run.refreshRootRunId,
    refreshSequence: run.refreshSequence,
    status: run.status,
    createdAt: toIsoString(run.createdAt, fallbackCreatedAt),
    updatedAt: toIsoString(run.updatedAt, fallbackCreatedAt),
  }
})
