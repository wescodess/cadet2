import type { IntakeDraftRecord } from '../intake/intakeSchemas'

export const recommendationFitSignalStates = ['strength', 'watch', 'gap'] as const

export type RecommendationFitSignalState = typeof recommendationFitSignalStates[number]

export type RecommendationFitSignal = {
  id: string
  label: string
  detail: string
  state: RecommendationFitSignalState
}

export type RecommendationRationalePayload = {
  rationale: string
  fitSignals: RecommendationFitSignal[]
}

export type RecommendationProfileContext = {
  englishClb: number | null
  yearsSkilledExperience: number | null
  settlementFundsCad: number | null
  hasValidJobOffer: boolean | null
  openToRelocation: boolean | null
  willingToStudyOrRetrain: boolean | null
  budgetCad: number | null
  targetTimelineMonths: number | null
}

type RecommendationCandidateForRationale = {
  pathwayId: string
  type: 'direct' | 'blocked' | 'composed'
  tier: 'strong-fit' | 'conditional-fit' | 'lower-confidence'
  qualification?: 'supported' | 'low-confidence' | 'withheld'
  confidence?: 'high' | 'medium' | 'low' | 'withheld'
  freshness?: 'fresh' | 'stale' | 'unknown'
  caveat?: string
  composedSteps?: string[]
}

export type BuildRecommendationRationaleInput = {
  candidate: RecommendationCandidateForRationale
  profile: RecommendationProfileContext | null
  unmetConditions?: string[]
}

const pathwayLabelById: Record<string, string> = {
  'mvp-skilled-worker': 'Skilled Worker pathway',
  'mvp-provincial-nominee': 'Provincial Nominee pathway',
  'mvp-study-to-work': 'Study-to-Work pathway',
}

const unmetConditionLabelById: Record<string, string> = {
  'minimum-english-clb-8': 'English language score below CLB 8 target',
  'minimum-skilled-experience-2-years': 'Skilled experience is below 2 years',
  'minimum-settlement-funds-15000-cad': 'Settlement funds are below CAD 15,000',
  'requires-valid-job-offer': 'A valid job offer is still required',
  'requires-relocation-flexibility': 'Relocation flexibility is still required',
  'requires-study-or-retraining-intent': 'Study or retraining intent is still required',
  'minimum-budget-25000-cad': 'Budget is below CAD 25,000 for this route',
  'minimum-timeline-10-months': 'Timeline is below 10 months for this route',
  'processing-delay-no-direct-pathways': 'Processing delay prevented direct-fit validation',
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function toYesNoBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === 'yes' || normalized === 'true') {
    return true
  }

  if (normalized === 'no' || normalized === 'false') {
    return false
  }

  return null
}

function humanizePathway(pathwayId: string): string {
  return pathwayLabelById[pathwayId] || pathwayId
}

function humanizeUnmetCondition(unmetConditionId: string): string {
  return unmetConditionLabelById[unmetConditionId] || unmetConditionId.replace(/-/g, ' ')
}

function toTierMeaning(tier: RecommendationCandidateForRationale['tier']): string {
  if (tier === 'strong-fit') {
    return 'high alignment with current profile evidence'
  }

  if (tier === 'conditional-fit') {
    return 'partial alignment with important caveats'
  }

  return 'low-confidence guidance that requires caution'
}

function createTierSignal(candidate: RecommendationCandidateForRationale): RecommendationFitSignal {
  if (candidate.qualification === 'supported') {
    return {
      id: 'tier',
      label: 'Fit level',
      detail: `Strong fit (${toTierMeaning(candidate.tier)})`,
      state: 'strength',
    }
  }

  if (candidate.qualification === 'withheld') {
    return {
      id: 'tier',
      label: 'Fit level',
      detail: `Withheld (${toTierMeaning(candidate.tier)})`,
      state: 'gap',
    }
  }

  return {
    id: 'tier',
    label: 'Fit level',
    detail: `Conditional (${toTierMeaning(candidate.tier)})`,
    state: 'watch',
  }
}

function createProfileSignals(pathwayId: string, profile: RecommendationProfileContext | null): RecommendationFitSignal[] {
  if (!profile) {
    return []
  }

  if (pathwayId === 'mvp-skilled-worker') {
    return [
      {
        id: 'english-clb',
        label: 'Language readiness',
        detail: profile.englishClb === null
          ? 'Language score not provided yet; CLB 8 benchmark cannot be confirmed.'
          : `CLB ${profile.englishClb} against CLB 8 benchmark`,
        state: profile.englishClb === null
          ? 'watch'
          : profile.englishClb >= 8
            ? 'strength'
            : 'gap',
      },
      {
        id: 'work-experience',
        label: 'Skilled experience',
        detail: profile.yearsSkilledExperience === null
          ? 'Skilled experience not provided yet; 2-year benchmark cannot be confirmed.'
          : `${profile.yearsSkilledExperience} years against 2-year benchmark`,
        state: profile.yearsSkilledExperience === null
          ? 'watch'
          : profile.yearsSkilledExperience >= 2
            ? 'strength'
            : 'gap',
      },
      {
        id: 'settlement-funds',
        label: 'Settlement funds',
        detail: profile.settlementFundsCad === null
          ? 'Settlement funds were not provided yet; CAD 15,000 benchmark cannot be confirmed.'
          : `CAD ${profile.settlementFundsCad.toLocaleString()} against CAD 15,000 benchmark`,
        state: profile.settlementFundsCad === null
          ? 'watch'
          : profile.settlementFundsCad >= 15000
            ? 'strength'
            : 'watch',
      },
    ]
  }

  if (pathwayId === 'mvp-provincial-nominee') {
    return [
      {
        id: 'job-offer',
        label: 'Job offer requirement',
        detail: profile.hasValidJobOffer === null
          ? 'Job offer status not provided yet.'
          : profile.hasValidJobOffer
            ? 'Valid job offer confirmed'
            : 'No valid job offer on file',
        state: profile.hasValidJobOffer === null
          ? 'watch'
          : profile.hasValidJobOffer
            ? 'strength'
            : 'gap',
      },
      {
        id: 'relocation',
        label: 'Relocation flexibility',
        detail: profile.openToRelocation === null
          ? 'Relocation preference not provided yet.'
          : profile.openToRelocation
            ? 'Open to relocation'
            : 'Relocation not selected',
        state: profile.openToRelocation === null
          ? 'watch'
          : profile.openToRelocation
            ? 'strength'
            : 'watch',
      },
    ]
  }

  if (pathwayId === 'mvp-study-to-work') {
    return [
      {
        id: 'study-intent',
        label: 'Study/retraining intent',
        detail: profile.willingToStudyOrRetrain === null
          ? 'Study or retraining intent not provided yet.'
          : profile.willingToStudyOrRetrain
            ? 'Study or retraining is acceptable'
            : 'Study or retraining not selected',
        state: profile.willingToStudyOrRetrain === null
          ? 'watch'
          : profile.willingToStudyOrRetrain
            ? 'strength'
            : 'gap',
      },
      {
        id: 'study-budget',
        label: 'Study budget',
        detail: profile.budgetCad === null
          ? 'Budget not provided yet; CAD 25,000 benchmark cannot be confirmed.'
          : `CAD ${profile.budgetCad.toLocaleString()} against CAD 25,000 benchmark`,
        state: profile.budgetCad === null
          ? 'watch'
          : profile.budgetCad >= 25000
            ? 'strength'
            : 'watch',
      },
      {
        id: 'timeline',
        label: 'Timeline readiness',
        detail: profile.targetTimelineMonths === null
          ? 'Timeline not provided yet; 10-month benchmark cannot be confirmed.'
          : `${profile.targetTimelineMonths} months against 10-month benchmark`,
        state: profile.targetTimelineMonths === null
          ? 'watch'
          : profile.targetTimelineMonths >= 10
            ? 'strength'
            : 'watch',
      },
    ]
  }

  return []
}

function createGapSignals(unmetConditions: string[]): RecommendationFitSignal[] {
  return unmetConditions
    .filter((unmetConditionId, index, values) => values.indexOf(unmetConditionId) === index)
    .slice(0, 3)
    .map(unmetConditionId => ({
      id: `gap-${unmetConditionId}`,
      label: 'Constraint to address',
      detail: humanizeUnmetCondition(unmetConditionId),
      state: 'gap' as const,
    }))
}

function createComposedSignal(steps: string[] | undefined): RecommendationFitSignal[] {
  if (!steps || steps.length === 0) {
    return []
  }

  return [
    {
      id: 'composed-steps',
      label: 'Staged path',
      detail: steps.join(' -> '),
      state: 'watch',
    },
  ]
}

function getDominantSignalSummary(signals: RecommendationFitSignal[]) {
  const strengthCount = signals.filter(signal => signal.state === 'strength').length
  const gapCount = signals.filter(signal => signal.state === 'gap').length

  if (gapCount > strengthCount) {
    return 'requires targeted improvements before this route can be treated as strong-fit'
  }

  if (strengthCount > 0) {
    return 'matches multiple profile strengths'
  }

  return 'is currently a conditional route and should be reviewed with caution'
}

export function buildRecommendationRationale(input: BuildRecommendationRationaleInput): RecommendationRationalePayload {
  const pathwayLabel = humanizePathway(input.candidate.pathwayId)

  const tierSignal = createTierSignal(input.candidate)
  const profileSignals = createProfileSignals(input.candidate.pathwayId, input.profile)
  const gapSignals = createGapSignals(input.unmetConditions || [])
  const composedSignals = createComposedSignal(input.candidate.composedSteps)

  const fitSignals = [
    tierSignal,
    ...profileSignals,
    ...gapSignals,
    ...composedSignals,
  ]

  const confidenceNote = input.candidate.confidence
    ? `Confidence is ${input.candidate.confidence}.`
    : ''

  const caveatNote = input.candidate.caveat && input.candidate.caveat.trim().length > 0
    ? ` ${input.candidate.caveat.trim()}`
    : ''

  const baseLine = input.candidate.type === 'composed'
    ? `${pathwayLabel} appears as a staged route because your current direct-fit set can bridge toward this pathway over time.`
    : input.candidate.type === 'blocked'
      ? `${pathwayLabel} appears as a conditional option with unresolved constraints from your submitted profile.`
      : `${pathwayLabel} appears because your submitted profile aligns with this pathway's core eligibility checks.`

  const rationale = `${baseLine} It ${getDominantSignalSummary(fitSignals)}. ${confidenceNote}${caveatNote}`.trim()

  return {
    rationale,
    fitSignals: fitSignals.slice(0, 6),
  }
}

export function toRecommendationProfileContext(snapshot: IntakeDraftRecord | null): RecommendationProfileContext | null {
  if (!snapshot) {
    return null
  }

  const work = toRecord(snapshot.fieldValues.work)
  const immigration = toRecord(snapshot.fieldValues.immigration)
  const goals = toRecord(snapshot.fieldValues.goals)

  return {
    englishClb: toNumber(immigration.englishClb),
    yearsSkilledExperience: toNumber(work.yearsSkilledExperience),
    settlementFundsCad: toNumber(immigration.availableSettlementFundsCad),
    hasValidJobOffer: toYesNoBoolean(work.hasValidJobOffer),
    openToRelocation: toYesNoBoolean(immigration.openToRelocation),
    willingToStudyOrRetrain: toYesNoBoolean(goals.willingToStudyOrRetrain),
    budgetCad: toNumber(goals.budgetCad),
    targetTimelineMonths: toNumber(goals.targetTimelineMonths),
  }
}
