import { sql } from 'drizzle-orm'

import { normalizeStoredIntakeDraft } from '../intake/normalizeIntakePayload'

type RecommendationRunHistoryStatus = 'completed' | 'degraded' | 'failed'

type RecommendationRunRecord = {
  runId: string
  profileSnapshotId: string
  status: string
  createdAt: number | string | Date
  updatedAt: number | string | Date
}

type RecommendationProfileSnapshotRow = {
  snapshotId: string
  createdAt: Date | string | number
  submittedPayload: unknown
}

type RecommendationRunSummaryInput = {
  run: RecommendationRunRecord
  recommendationCount: number
  isLatest: boolean
  isAvailable: boolean
  unavailableReason?: string
  profileSnapshot?: RecommendationProfileSnapshotPresentation | null
}

export type RecommendationProfileSnapshotPresentation = {
  id: string
  summary: string
  capturedAt: string
  keyFactors: string[]
}

export const recommendationRunHistoryUnavailableReason = 'Archived recommendation payload is no longer available in the workspace retention window.'

const locationPreferenceLabels: Record<string, string> = {
  'any-province': 'Any province preference',
  'targeted-provinces': 'Targeted provinces preference',
  'major-city-focus': 'Major city focus',
  'smaller-community-focus': 'Smaller community focus',
}

function toIsoString(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'number' || typeof value === 'string') {
    const parsed = new Date(value)

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }

  return new Date().toISOString()
}

function toStringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function toNumberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function toRecommendationRunHistoryStatus(value: string): RecommendationRunHistoryStatus | null {
  return value === 'completed' || value === 'degraded' || value === 'failed'
    ? value
    : null
}

export function buildRecommendationProfileSnapshotPresentation(input: {
  snapshotId: string
  createdAt: unknown
  submittedPayload: unknown
}): RecommendationProfileSnapshotPresentation {
  const normalized = normalizeStoredIntakeDraft(input.submittedPayload as {
    currentSection?: unknown
    sectionProgress?: unknown
    fieldValues?: unknown
  })
  const work = normalized.fieldValues.work || {}
  const immigration = normalized.fieldValues.immigration || {}
  const goals = normalized.fieldValues.goals || {}

  const englishClb = toNumberValue(immigration.englishClb)
  const currentRole = toStringValue(work.currentRole)
  const intendedProvince = toStringValue(immigration.intendedProvince)
  const locationPreference = toStringValue(goals.locationPreference)
  const targetTimelineMonths = toNumberValue(goals.targetTimelineMonths)

  const summaryParts = [
    englishClb ? `CLB ${englishClb}` : '',
    currentRole || '',
    intendedProvince ? `${intendedProvince} preference` : (locationPreferenceLabels[locationPreference] || ''),
    targetTimelineMonths ? `${targetTimelineMonths}-month target` : '',
  ].filter(Boolean)

  const keyFactors = [
    englishClb ? 'language benchmark' : '',
    currentRole ? 'occupation history' : '',
    intendedProvince || locationPreference ? 'location preference' : '',
    targetTimelineMonths ? 'timeline target' : '',
  ].filter(Boolean)

  return {
    id: input.snapshotId,
    summary: summaryParts.length > 0 ? `${summaryParts.join(', ')}.` : 'Profile snapshot preserved for this archived run.',
    capturedAt: toIsoString(input.createdAt),
    keyFactors,
  }
}

export async function loadRecommendationProfileSnapshotMap(input: {
  userId: string
  snapshotIds: string[]
}) {
  const uniqueSnapshotIds = [...new Set(input.snapshotIds.filter(Boolean))]

  if (uniqueSnapshotIds.length === 0) {
    return new Map<string, RecommendationProfileSnapshotPresentation>()
  }

  const snapshotIdValues = uniqueSnapshotIds.map(snapshotId => sql`${snapshotId}`)
  const result = await db.execute(sql`
    SELECT
      "snapshotId",
      "createdAt",
      "submittedPayload"
    FROM "recommendation_profiles"
    WHERE "userId" = ${input.userId}
      AND "snapshotId" IN (${sql.join(snapshotIdValues, sql`, `)});
  `)

  const rows = ((result as { rows?: RecommendationProfileSnapshotRow[] }).rows || [])
  return new Map(
    rows.map(row => [
      row.snapshotId,
      buildRecommendationProfileSnapshotPresentation({
        snapshotId: row.snapshotId,
        createdAt: row.createdAt,
        submittedPayload: row.submittedPayload,
      }),
    ]),
  )
}

export function buildRecommendationRunHistorySummary(input: RecommendationRunSummaryInput) {
  const historyStatus = toRecommendationRunHistoryStatus(input.run.status)

  if (!historyStatus) {
    throw new Error(`Unsupported recommendation history status: ${input.run.status}`)
  }

  return {
    id: input.run.runId,
    status: historyStatus,
    recommendationCount: input.recommendationCount,
    profileSnapshotSummary: input.profileSnapshot?.summary || 'Profile snapshot preserved for this run.',
    createdAt: toIsoString(input.run.createdAt),
    isLatest: input.isLatest,
    isAvailable: input.isAvailable,
    unavailableReason: input.isAvailable ? undefined : (input.unavailableReason || recommendationRunHistoryUnavailableReason),
  }
}
