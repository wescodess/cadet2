import { sql } from 'drizzle-orm'

import { requireWorkspaceUserSession } from '../../utils/auth/requireUserSession'
import { createEmptyIntakeDraft, normalizeStoredIntakeDraft } from '../../utils/intake/normalizeIntakePayload'

type DraftRow = {
  updatedAt: Date | string
  currentSection: string
  sectionProgress: unknown
  fieldValues: unknown
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

export default defineEventHandler(async (event) => {
  const { userId } = await requireWorkspaceUserSession(event)

  const result = await db.execute(sql`
    SELECT
      "updatedAt",
      "currentSection",
      "sectionProgress",
      "fieldValues"
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
      values: emptyDraft.fieldValues,
    }
  }

  const normalized = normalizeStoredIntakeDraft({
    currentSection: row.currentSection,
    sectionProgress: row.sectionProgress,
    fieldValues: row.fieldValues,
  })

  return {
    status: 'ok',
    savedAt: toSavedAt(row.updatedAt),
    currentSection: normalized.currentSection,
    values: normalized.fieldValues,
  }
})
