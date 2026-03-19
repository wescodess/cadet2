import {
  MVP_PATHWAY_CATALOG,
  type MvpPathwayId,
  type MvpPathwayDefinition,
  type NormalizedPathwayProfile,
} from './mvpPathwayCatalog'

type RecommendationProcessingMode =
  | 'standard'
  | 'recoverable-delay'
  | 'mock-completed'
  | 'mock-degraded'
  | 'mock-failed'

type ProfileSectionValues = Record<string, unknown>

type NormalizedProfileSnapshot = {
  fieldValues?: Record<string, ProfileSectionValues>
} | null

export type DirectPathwayOutcome = {
  pathwayId: MvpPathwayId
  status: 'direct'
}

export type BlockedPathwayOutcome = {
  pathwayId: MvpPathwayId
  status: 'blocked'
  unmetConditions: string[]
}

export type EvaluateDirectAndBlockedPathwaysInput = {
  profileSnapshot: NormalizedProfileSnapshot
  mode: RecommendationProcessingMode
  pathwayCatalog?: readonly MvpPathwayDefinition[]
}

export type EvaluateDirectAndBlockedPathwaysResult = {
  direct: DirectPathwayOutcome[]
  blocked: BlockedPathwayOutcome[]
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function toSection(snapshot: NormalizedProfileSnapshot, section: string): Record<string, unknown> {
  const fieldValues = toRecord(snapshot?.fieldValues)
  return toRecord(fieldValues[section])
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

function toBooleanFromYesNo(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false
  }

  return value.trim().toLowerCase() === 'yes'
}

function normalizeProfile(snapshot: NormalizedProfileSnapshot): NormalizedPathwayProfile {
  const workValues = toSection(snapshot, 'work')
  const immigrationValues = toSection(snapshot, 'immigration')
  const goalsValues = toSection(snapshot, 'goals')

  return {
    englishClb: toNumber(immigrationValues.englishClb),
    yearsSkilledExperience: toNumber(workValues.yearsSkilledExperience),
    settlementFundsCad: toNumber(immigrationValues.availableSettlementFundsCad),
    hasValidJobOffer: toBooleanFromYesNo(workValues.hasValidJobOffer),
    openToRelocation: toBooleanFromYesNo(immigrationValues.openToRelocation),
    willingToStudyOrRetrain: toBooleanFromYesNo(goalsValues.willingToStudyOrRetrain),
    budgetCad: toNumber(goalsValues.budgetCad),
    targetTimelineMonths: toNumber(goalsValues.targetTimelineMonths),
  }
}

function dedupe(values: string[]) {
  return Array.from(new Set(values))
}

export function evaluateDirectAndBlockedPathways(
  input: EvaluateDirectAndBlockedPathwaysInput,
): EvaluateDirectAndBlockedPathwaysResult {
  const profile = normalizeProfile(input.profileSnapshot)
  const forceBlocked = input.mode === 'recoverable-delay'
  const direct: DirectPathwayOutcome[] = []
  const blocked: BlockedPathwayOutcome[] = []
  const pathwayCatalog = input.pathwayCatalog || MVP_PATHWAY_CATALOG

  for (const pathway of pathwayCatalog) {
    const unmetConditions = pathway.rules
      .filter(rule => !rule.isSatisfied(profile))
      .map(rule => rule.unmetConditionId)

    if (!forceBlocked && unmetConditions.length === 0) {
      direct.push({
        pathwayId: pathway.pathwayId,
        status: 'direct',
      })
      continue
    }

    blocked.push({
      pathwayId: pathway.pathwayId,
      status: 'blocked',
      unmetConditions: dedupe(unmetConditions.length > 0
        ? unmetConditions
        : ['processing-delay-no-direct-pathways']),
    })
  }

  return {
    direct,
    blocked,
  }
}
