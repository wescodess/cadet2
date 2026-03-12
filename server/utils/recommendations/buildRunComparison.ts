import type { ComparisonResult, PathwayChange, ProfileDeltaSummary, RecommendationRunComparisonCaveat, RecommendationRunComparisonEvidenceReference, RecommendationRunComparisonImpact, RecommendationRunComparisonResultType, RecommendationRunComparisonRunMeta, RecommendationRunComparisonShift, TrustChange } from '~~/shared/types/recommendation-run-comparison'
import type { RecommendationResultsCandidate, RecommendationResultsRecord } from './readRecommendationResultsForUser'

import { normalizeStoredIntakeDraft } from '../intake/normalizeIntakePayload'

type BuildRunComparisonInput = {
  baseline: RecommendationResultsRecord
  current: RecommendationResultsRecord
  baselineMeta: RecommendationRunComparisonRunMeta
  currentMeta: RecommendationRunComparisonRunMeta
  baselineSnapshot?: unknown
  currentSnapshot?: unknown
}

const pathwayLabels: Record<string, string> = {
  'mvp-skilled-worker': 'Skilled Worker pathway',
  'mvp-provincial-nominee': 'Provincial Nominee pathway',
  'mvp-study-to-work': 'Study-to-Work pathway',
}

const typeWeight: Record<RecommendationRunComparisonResultType, number> = {
  direct: 3,
  blocked: 2,
  composed: 1,
}

const tierWeight = {
  'strong-fit': 3,
  'conditional-fit': 2,
  'lower-confidence': 1,
} as const

const confidenceWeight = {
  high: 3,
  medium: 2,
  low: 1,
  withheld: 0,
} as const

const freshnessWeight = {
  fresh: 2,
  stale: 1,
  unknown: 0,
} as const

const fieldLabelMap: Record<string, string> = {
  'education.highestEducationLevel': 'Highest education level',
  'goals.additionalContext': 'Additional context',
  'goals.budgetCad': 'Process budget',
  'goals.hasFamilyInCanada': 'Family in Canada',
  'goals.locationPreference': 'Location preference',
  'goals.primaryGoal': 'Primary goal',
  'goals.priorityPreference': 'Decision priority',
  'goals.targetTimelineMonths': 'Target timeline',
  'goals.willingToStudyOrRetrain': 'Study or retrain flexibility',
  'immigration.availableSettlementFundsCad': 'Settlement funds',
  'immigration.englishClb': 'English CLB',
  'immigration.intendedProvince': 'Intended province',
  'immigration.openToRelocation': 'Open to relocation',
  'work.currentRole': 'Current role',
  'work.hasValidJobOffer': 'Valid job offer',
  'work.yearsSkilledExperience': 'Years of skilled experience',
}

function buildEmptyResult(input: {
  baselineMeta: RecommendationRunComparisonRunMeta
  currentMeta: RecommendationRunComparisonRunMeta
  unavailableReason: string
}): ComparisonResult {
  return {
    runs: {
      baseline: input.baselineMeta,
      current: input.currentMeta,
    },
    summary: {
      added: 0,
      removed: 0,
      changed: 0,
      overallConfidenceChange: 0,
      newEvidenceCount: 0,
    },
    pathwayChanges: [],
    trustChanges: [],
    caveatChanges: {
      added: [],
      removed: [],
    },
    profileDelta: null,
    comparisonAvailable: false,
    unavailableReason: input.unavailableReason,
  }
}

function normalizePathwayLabel(pathwayId: string) {
  return pathwayLabels[pathwayId] || pathwayId
}

function flattenCandidates(record: RecommendationResultsRecord) {
  return [
    ...record.results.direct,
    ...record.results.blocked,
    ...record.results.composed,
  ]
}

function mapCandidatesByPathway(record: RecommendationResultsRecord) {
  return new Map(
    flattenCandidates(record).map(candidate => [candidate.pathwayId, candidate]),
  )
}

function roundToTwoDecimals(value: number) {
  return Math.round(value * 100) / 100
}

function averageConfidence(candidates: RecommendationResultsCandidate[]) {
  if (candidates.length === 0) {
    return 0
  }

  return candidates.reduce((total, candidate) => total + confidenceWeight[candidate.confidence], 0) / candidates.length
}

function toChangeShift(delta: number): RecommendationRunComparisonShift {
  if (delta > 0) {
    return 'improved'
  }

  if (delta < 0) {
    return 'declined'
  }

  return 'unchanged'
}

function toCitationKey(citation: RecommendationResultsCandidate['citations'][number]) {
  return citation.citationId || `${citation.sourceUrl}|${citation.claimText}`
}

function toEvidenceReference(citation: RecommendationResultsCandidate['citations'][number]): RecommendationRunComparisonEvidenceReference {
  return {
    citationId: citation.citationId,
    claimText: citation.claimText,
    sourceTitle: citation.sourceTitle,
    sourceUrl: citation.sourceUrl,
    excerpt: citation.excerpt,
    retrievalDate: citation.retrievalDate,
    freshness: citation.freshness,
  }
}

function compareCitationSets(before: RecommendationResultsCandidate['citations'], after: RecommendationResultsCandidate['citations']) {
  const beforeByKey = new Map(before.map(citation => [toCitationKey(citation), citation]))
  const afterByKey = new Map(after.map(citation => [toCitationKey(citation), citation]))
  const added: RecommendationRunComparisonEvidenceReference[] = []
  const removed: RecommendationRunComparisonEvidenceReference[] = []

  for (const [key, citation] of afterByKey) {
    if (!beforeByKey.has(key)) {
      added.push(toEvidenceReference(citation))
    }
  }

  for (const [key, citation] of beforeByKey) {
    if (!afterByKey.has(key)) {
      removed.push(toEvidenceReference(citation))
    }
  }

  return {
    added,
    removed,
  }
}

function buildTrustChange(before: RecommendationResultsCandidate, after: RecommendationResultsCandidate): TrustChange | null {
  const citationCounts = compareCitationSets(before.citations || [], after.citations || [])
  const citationDelta = (after.citations?.length || 0) - (before.citations?.length || 0)
  const freshnessDelta = freshnessWeight[after.freshness] - freshnessWeight[before.freshness]
  const confidenceDelta = confidenceWeight[after.confidence] - confidenceWeight[before.confidence]
  const trustBoundaryChanged = before.trustBoundary !== after.trustBoundary
  const hasTrustChange =
    citationDelta !== 0
    || citationCounts.added.length > 0
    || citationCounts.removed.length > 0
    || freshnessDelta !== 0
    || confidenceDelta !== 0
    || trustBoundaryChanged

  if (!hasTrustChange) {
    return null
  }

  return {
    pathwayId: after.pathwayId,
    pathwayName: normalizePathwayLabel(after.pathwayId),
    beforeCitationCount: before.citations?.length || 0,
    afterCitationCount: after.citations?.length || 0,
    citationDelta,
    addedCitationCount: citationCounts.added.length,
    removedCitationCount: citationCounts.removed.length,
    beforeFreshness: before.freshness,
    afterFreshness: after.freshness,
    freshnessChange: toChangeShift(freshnessDelta),
    beforeConfidence: before.confidence,
    afterConfidence: after.confidence,
    confidenceChange: toChangeShift(confidenceDelta),
    beforeTrustBoundary: before.trustBoundary,
    afterTrustBoundary: after.trustBoundary,
    trustBoundaryChanged,
    addedEvidence: citationCounts.added,
    removedEvidence: citationCounts.removed,
  }
}

function resolveImpact(before: RecommendationResultsCandidate | null, after: RecommendationResultsCandidate | null): RecommendationRunComparisonImpact {
  if (!before && after) {
    return 'improved'
  }

  if (before && !after) {
    return 'declined'
  }

  if (!before || !after) {
    return 'neutral'
  }

  const typeDelta = typeWeight[after.type] - typeWeight[before.type]
  const tierDelta = tierWeight[after.tier] - tierWeight[before.tier]
  const scoreDelta = after.score - before.score
  const confidenceDelta = confidenceWeight[after.confidence] - confidenceWeight[before.confidence]
  const combinedDelta = (typeDelta * 10) + (tierDelta * 10) + scoreDelta + (confidenceDelta * 5)

  if (combinedDelta > 0) {
    return 'improved'
  }

  if (combinedDelta < 0) {
    return 'declined'
  }

  return 'neutral'
}

function resolveChangeType(before: RecommendationResultsCandidate | null, after: RecommendationResultsCandidate | null): PathwayChange['changeType'] {
  if (!before && after) {
    return 'added'
  }

  if (before && !after) {
    return 'removed'
  }

  if (!before || !after) {
    return 'unchanged'
  }

  if (
    before.type !== after.type
    || before.tier !== after.tier
    || before.qualification !== after.qualification
  ) {
    return 'tier-changed'
  }

  if (
    before.score !== after.score
    || before.rank !== after.rank
    || before.confidence !== after.confidence
    || before.freshness !== after.freshness
    || before.caveat !== after.caveat
  ) {
    return 'score-changed'
  }

  return 'unchanged'
}

function humanizeToken(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, character => character.toUpperCase())
}

function formatProfileValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'Not provided'
  }

  if (Array.isArray(value)) {
    return value.length > 0
      ? value.map(item => formatProfileValue(item)).join(', ')
      : 'Not provided'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'string') {
    if (value === 'yes') {
      return 'Yes'
    }

    if (value === 'no') {
      return 'No'
    }

    return humanizeToken(value)
  }

  return humanizeToken(JSON.stringify(value))
}

function flattenSnapshotFields(snapshot: unknown) {
  const normalized = normalizeStoredIntakeDraft(snapshot as {
    currentSection?: unknown
    sectionProgress?: unknown
    fieldValues?: unknown
  })
  const entries = new Map<string, string>()

  for (const [section, fields] of Object.entries(normalized.fieldValues)) {
    for (const [field, value] of Object.entries(fields || {})) {
      entries.set(`${section}.${field}`, formatProfileValue(value))
    }
  }

  return entries
}

function buildProfileDeltaSummary(baselineSnapshot?: unknown, currentSnapshot?: unknown): ProfileDeltaSummary | null {
  if (!baselineSnapshot || !currentSnapshot) {
    return null
  }

  const baselineFields = flattenSnapshotFields(baselineSnapshot)
  const currentFields = flattenSnapshotFields(currentSnapshot)
  const keys = [...new Set([...baselineFields.keys(), ...currentFields.keys()])].sort((left, right) => left.localeCompare(right))
  const changedFields = keys.flatMap((key) => {
    const beforeValue = baselineFields.get(key) || 'Not provided'
    const afterValue = currentFields.get(key) || 'Not provided'

    if (beforeValue === afterValue) {
      return []
    }

    const [section = 'profile', field = key] = key.split('.')
    return [{
      key,
      section,
      label: fieldLabelMap[key] || humanizeToken(field),
      beforeValue,
      afterValue,
    }]
  })

  return {
    changedFieldCount: changedFields.length,
    changedFields,
    summary: changedFields.length === 0
      ? 'No preserved profile inputs changed between these runs.'
      : `${changedFields.length} preserved profile input${changedFields.length === 1 ? '' : 's'} changed between the compared runs.`,
  }
}

function buildCaveatChanges(baseline: RecommendationResultsRecord, current: RecommendationResultsRecord) {
  const baselineCaveats = new Map<string, RecommendationRunComparisonCaveat>()
  const currentCaveats = new Map<string, RecommendationRunComparisonCaveat>()

  for (const candidate of flattenCandidates(baseline)) {
    const caveat = candidate.caveat?.trim()
    if (!caveat) {
      continue
    }

    const id = `${candidate.pathwayId}:${caveat}`
    baselineCaveats.set(id, {
      id,
      pathwayId: candidate.pathwayId,
      pathwayName: normalizePathwayLabel(candidate.pathwayId),
      text: caveat,
    })
  }

  for (const candidate of flattenCandidates(current)) {
    const caveat = candidate.caveat?.trim()
    if (!caveat) {
      continue
    }

    const id = `${candidate.pathwayId}:${caveat}`
    currentCaveats.set(id, {
      id,
      pathwayId: candidate.pathwayId,
      pathwayName: normalizePathwayLabel(candidate.pathwayId),
      text: caveat,
    })
  }

  return {
    added: Array.from(currentCaveats.values()).filter(caveat => !baselineCaveats.has(caveat.id)),
    removed: Array.from(baselineCaveats.values()).filter(caveat => !currentCaveats.has(caveat.id)),
  }
}

function buildReason(changeType: PathwayChange['changeType'], impact: RecommendationRunComparisonImpact, before: RecommendationResultsCandidate | null, after: RecommendationResultsCandidate | null) {
  if (changeType === 'added' && after) {
    return `${normalizePathwayLabel(after.pathwayId)} is newly ranked in the later run.`
  }

  if (changeType === 'removed' && before) {
    return `${normalizePathwayLabel(before.pathwayId)} no longer appears in the later run.`
  }

  if (!before || !after) {
    return 'Comparison details are limited for this pathway.'
  }

  if (before.type !== after.type) {
    return `Outcome shifted from ${humanizeToken(before.type)} to ${humanizeToken(after.type)}.`
  }

  if (before.tier !== after.tier) {
    return `Tier moved from ${humanizeToken(before.tier)} to ${humanizeToken(after.tier)}.`
  }

  if (before.rank !== after.rank && before.rank > 0 && after.rank > 0) {
    return `Rank moved from #${before.rank} to #${after.rank}.`
  }

  if (before.score !== after.score) {
    return impact === 'declined'
      ? `Score dropped from ${before.score} to ${after.score}.`
      : `Score changed from ${before.score} to ${after.score}.`
  }

  if (before.confidence !== after.confidence) {
    return `Confidence shifted from ${before.confidence} to ${after.confidence}.`
  }

  if (before.caveat !== after.caveat) {
    return 'Supporting caveat text changed between runs.'
  }

  return 'Recommendation outcome remained unchanged across the two runs.'
}

function comparePathways(input: {
  baseline: RecommendationResultsRecord
  current: RecommendationResultsRecord
}) {
  const baselineByPathway = mapCandidatesByPathway(input.baseline)
  const currentByPathway = mapCandidatesByPathway(input.current)
  const pathwayIds = [...new Set([...baselineByPathway.keys(), ...currentByPathway.keys()])].sort((left, right) => left.localeCompare(right))

  const trustChanges: TrustChange[] = []
  const pathwayChanges = pathwayIds.map((pathwayId) => {
    const before = baselineByPathway.get(pathwayId) || null
    const after = currentByPathway.get(pathwayId) || null
    const trustDiff = before && after ? buildTrustChange(before, after) : null

    if (trustDiff) {
      trustChanges.push(trustDiff)
    }

    const changeType = resolveChangeType(before, after)
    const impact = resolveImpact(before, after)

    return {
      pathwayId,
      pathwayName: normalizePathwayLabel(pathwayId),
      changeType,
      impact,
      beforeType: before?.type || null,
      afterType: after?.type || null,
      beforeRank: before?.rank ?? null,
      afterRank: after?.rank ?? null,
      rankDelta: before && after ? after.rank - before.rank : null,
      beforeTier: before?.tier || null,
      afterTier: after?.tier || null,
      beforeScore: before?.score ?? null,
      afterScore: after?.score ?? null,
      scoreDelta: before && after ? roundToTwoDecimals(after.score - before.score) : null,
      reason: buildReason(changeType, impact, before, after),
      trustDiff,
    } satisfies PathwayChange
  })

  const sortOrder: Record<PathwayChange['changeType'], number> = {
    added: 0,
    removed: 1,
    'tier-changed': 2,
    'score-changed': 3,
    unchanged: 4,
  }

  pathwayChanges.sort((left, right) => {
    const priorityDelta = sortOrder[left.changeType] - sortOrder[right.changeType]
    if (priorityDelta !== 0) {
      return priorityDelta
    }

    const leftRank = left.afterRank ?? left.beforeRank ?? Number.MAX_SAFE_INTEGER
    const rightRank = right.afterRank ?? right.beforeRank ?? Number.MAX_SAFE_INTEGER

    if (leftRank !== rightRank) {
      return leftRank - rightRank
    }

    return left.pathwayName.localeCompare(right.pathwayName)
  })

  return {
    pathwayChanges,
    trustChanges,
  }
}

export function buildRunComparison(input: BuildRunComparisonInput): ComparisonResult {
  if (input.baseline.runId === input.current.runId) {
    return buildEmptyResult({
      baselineMeta: input.baselineMeta,
      currentMeta: input.currentMeta,
      unavailableReason: 'The same run cannot be compared against itself.',
    })
  }

  const { pathwayChanges, trustChanges } = comparePathways({
    baseline: input.baseline,
    current: input.current,
  })
  const caveatChanges = buildCaveatChanges(input.baseline, input.current)
  const profileDelta = buildProfileDeltaSummary(input.baselineSnapshot, input.currentSnapshot)
  const currentCandidates = flattenCandidates(input.current)
  const baselineCandidates = flattenCandidates(input.baseline)
  const newEvidenceCount = (() => {
    const baselineCitationIds = new Set(
      baselineCandidates.flatMap(candidate =>
        (candidate.citations || []).map(citation => toCitationKey(citation)),
      ),
    )

    return currentCandidates.flatMap(candidate =>
      (candidate.citations || []).map(citation => toCitationKey(citation)),
    ).filter(citationId => !baselineCitationIds.has(citationId)).length
  })()

  return {
    runs: {
      baseline: input.baselineMeta,
      current: input.currentMeta,
    },
    summary: {
      added: pathwayChanges.filter(change => change.changeType === 'added').length,
      removed: pathwayChanges.filter(change => change.changeType === 'removed').length,
      changed: pathwayChanges.filter(change => change.changeType !== 'unchanged').length,
      overallConfidenceChange: roundToTwoDecimals(
        averageConfidence(currentCandidates) - averageConfidence(baselineCandidates),
      ),
      newEvidenceCount,
    },
    pathwayChanges,
    trustChanges,
    caveatChanges,
    profileDelta,
    comparisonAvailable: true,
  }
}
