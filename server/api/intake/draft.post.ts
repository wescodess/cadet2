import { sql } from 'drizzle-orm'

import { requireWorkspaceUserSession } from '../../utils/auth/requireUserSession'
import { normalizeIntakePayload } from '../../utils/intake/normalizeIntakePayload'
import { intakeDraftInputSchema } from '../../utils/intake/intakeSchemas'

type DraftRow = {
  updatedAt: Date | string
  currentSection: string
  fieldValues: unknown
}

function toSavedAt(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }

  return new Date().toISOString()
}

function toValues(value: unknown): Record<string, Record<string, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, Record<string, unknown>>
}

export default defineEventHandler(async (event) => {
  const { userId } = await requireWorkspaceUserSession(event)
  const body = await readBody<unknown>(event)
  const parsed = intakeDraftInputSchema.safeParse(body)

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    const issuePath = firstIssue?.path.join('.') || 'payload'

    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${issuePath}: ${firstIssue?.message || 'Request body is invalid'}`,
    })
  }

  const normalized = normalizeIntakePayload(parsed.data)
  const serializedProgress = JSON.stringify(normalized.sectionProgress)
  const serializedValues = JSON.stringify(normalized.fieldValues)

  const result = await db.execute(sql`
    INSERT INTO "intake_draft" (
      "userId",
      "currentSection",
      "sectionProgress",
      "fieldValues",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${userId},
      ${normalized.currentSection},
      ${serializedProgress}::jsonb,
      ${serializedValues}::jsonb,
      now(),
      now()
    )
    ON CONFLICT ("userId")
    DO UPDATE SET
      "currentSection" = EXCLUDED."currentSection",
      "sectionProgress" = EXCLUDED."sectionProgress",
      "fieldValues" = EXCLUDED."fieldValues",
      "updatedAt" = now()
    RETURNING "updatedAt", "currentSection", "fieldValues";
  `)

  const row = ((result as { rows?: DraftRow[] }).rows || [])[0]

  if (!row) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Unable to persist intake draft',
    })
  }

  return {
    status: 'saved',
    savedAt: toSavedAt(row.updatedAt),
    currentSection: row.currentSection,
    values: toValues(row.fieldValues),
  }
})
