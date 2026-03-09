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

export const recommendationBlockerSeverities = ['critical', 'high', 'medium', 'low'] as const
export const recommendationTradeoffDimensions = ['effort', 'timing', 'complexity', 'cost'] as const
export const recommendationTradeoffImpacts = ['high', 'medium', 'low'] as const
export const recommendationImprovementPriorities = ['now', 'next', 'later'] as const

export type RecommendationBlockerSeverity = typeof recommendationBlockerSeverities[number]
export type RecommendationTradeoffDimension = typeof recommendationTradeoffDimensions[number]
export type RecommendationTradeoffImpact = typeof recommendationTradeoffImpacts[number]
export type RecommendationImprovementPriority = typeof recommendationImprovementPriorities[number]

export type RecommendationBlocker = {
  id: string
  label: string
  detail: string
  severity: RecommendationBlockerSeverity
}

export type RecommendationTradeoff = {
  id: string
  dimension: RecommendationTradeoffDimension
  summary: string
  impact: RecommendationTradeoffImpact
}

export type RecommendationImprovementAction = {
  id: string
  title: string
  detail: string
  priority: RecommendationImprovementPriority
  expectedImpact: string
}

export type RecommendationExplanationModulesPayload = {
  blockers: RecommendationBlocker[]
  tradeoffs: RecommendationTradeoff[]
  improvementActions: RecommendationImprovementAction[]
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

type ExplanationBlueprint = {
  label: string
  blockerDetail: string
  blockerSeverity: RecommendationBlockerSeverity
  actionTitle: string
  actionDetail: string
  actionPriority: RecommendationImprovementPriority
  actionExpectedImpact: string
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

const explanationBlueprintByUnmetConditionId: Record<string, ExplanationBlueprint> = {
  'minimum-english-clb-8': {
    label: 'Language threshold',
    blockerDetail: 'Current language evidence does not yet meet the CLB 8 benchmark for this route.',
    blockerSeverity: 'high',
    actionTitle: 'Increase language score to CLB 8+',
    actionDetail: 'Schedule a language retake plan and update the profile with refreshed score evidence.',
    actionPriority: 'now',
    actionExpectedImpact: 'Removes a core eligibility blocker and improves confidence for this pathway.',
  },
  'minimum-skilled-experience-2-years': {
    label: 'Skilled experience threshold',
    blockerDetail: 'Submitted work history is below the 2-year skilled experience benchmark.',
    blockerSeverity: 'high',
    actionTitle: 'Strengthen skilled experience evidence',
    actionDetail: 'Document additional skilled work history and update experience records in the profile.',
    actionPriority: 'now',
    actionExpectedImpact: 'Reduces pathway risk by closing a direct eligibility gap.',
  },
  'minimum-settlement-funds-15000-cad': {
    label: 'Settlement funds threshold',
    blockerDetail: 'Available settlement funds are below CAD 15,000 for this route.',
    blockerSeverity: 'high',
    actionTitle: 'Increase documented settlement funds',
    actionDetail: 'Build and document savings to meet or exceed CAD 15,000 before submission planning.',
    actionPriority: 'next',
    actionExpectedImpact: 'Improves financial readiness and lowers refusal risk for this option.',
  },
  'requires-valid-job-offer': {
    label: 'Valid job offer requirement',
    blockerDetail: 'This pathway currently requires a valid job offer that is not yet confirmed.',
    blockerSeverity: 'critical',
    actionTitle: 'Secure an eligible job offer',
    actionDetail: 'Prioritize employer outreach and collect offer documentation that matches pathway rules.',
    actionPriority: 'now',
    actionExpectedImpact: 'Unlocks provincial nominee viability and materially improves eligibility.',
  },
  'requires-relocation-flexibility': {
    label: 'Relocation flexibility requirement',
    blockerDetail: 'Current profile indicates limited relocation flexibility for this pathway.',
    blockerSeverity: 'medium',
    actionTitle: 'Reassess relocation constraints',
    actionDetail: 'Review province options and update relocation preferences if broader scope is acceptable.',
    actionPriority: 'next',
    actionExpectedImpact: 'Expands pathway availability and improves nomination opportunities.',
  },
  'requires-study-or-retraining-intent': {
    label: 'Study or retraining intent requirement',
    blockerDetail: 'Study/retraining intent is not currently confirmed for this route.',
    blockerSeverity: 'medium',
    actionTitle: 'Confirm study or retraining intent',
    actionDetail: 'Clarify willingness to pursue training and align the plan with credential pathway steps.',
    actionPriority: 'next',
    actionExpectedImpact: 'Keeps study-to-work route viable and improves long-horizon readiness.',
  },
  'minimum-budget-25000-cad': {
    label: 'Study budget threshold',
    blockerDetail: 'Profile budget is below the CAD 25,000 planning threshold for this pathway.',
    blockerSeverity: 'high',
    actionTitle: 'Increase pathway budget plan',
    actionDetail: 'Build a realistic funding plan and update available budget assumptions in the profile.',
    actionPriority: 'next',
    actionExpectedImpact: 'Improves feasibility of study-to-work execution milestones.',
  },
  'minimum-timeline-10-months': {
    label: 'Timeline readiness threshold',
    blockerDetail: 'Current timeline is shorter than the recommended 10-month planning window.',
    blockerSeverity: 'medium',
    actionTitle: 'Extend planning timeline assumptions',
    actionDetail: 'Rebalance timeline expectations to include staged milestones and processing variability.',
    actionPriority: 'later',
    actionExpectedImpact: 'Reduces timeline risk and improves route sequencing quality.',
  },
  'processing-delay-no-direct-pathways': {
    label: 'Processing continuity delay',
    blockerDetail: 'A temporary processing delay prevented direct-fit confirmation for this run.',
    blockerSeverity: 'low',
    actionTitle: 'Refresh recommendations after processing recovers',
    actionDetail: 'Retry the recommendation run once processing continuity returns to normal.',
    actionPriority: 'now',
    actionExpectedImpact: 'Restores confidence by replacing delayed outputs with fresh scoring evidence.',
  },
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

function dedupeUnmetConditions(unmetConditions: string[]) {
  return unmetConditions.filter((unmetConditionId, index, values) => values.indexOf(unmetConditionId) === index)
}

function resolveFallbackBlocker(candidate: RecommendationCandidateForRationale): RecommendationBlocker {
  if (candidate.type === 'blocked') {
    return {
      id: 'conditional-readiness-gap',
      label: 'Conditional readiness gap',
      detail: 'This pathway remains conditional because one or more eligibility requirements are unresolved.',
      severity: 'high',
    }
  }

  if (candidate.type === 'composed') {
    return {
      id: 'staged-pathway-dependency',
      label: 'Staged dependency',
      detail: 'This pathway depends on intermediate milestones before it can be treated as direct-fit.',
      severity: 'medium',
    }
  }

  return {
    id: 'profile-evidence-watch',
    label: 'Profile evidence watch',
    detail: 'Current profile evidence suggests caution until additional validation checks are completed.',
    severity: 'medium',
  }
}

function buildBlockersFromUnmetConditions(
  candidate: RecommendationCandidateForRationale,
  unmetConditions: string[],
): RecommendationBlocker[] {
  const uniqueConditions = dedupeUnmetConditions(unmetConditions)
  if (uniqueConditions.length === 0) {
    if (candidate.qualification === 'supported') {
      return []
    }

    return [resolveFallbackBlocker(candidate)]
  }

  return uniqueConditions.slice(0, 4).map((unmetConditionId) => {
    const blueprint = explanationBlueprintByUnmetConditionId[unmetConditionId]
    if (blueprint) {
      return {
        id: unmetConditionId,
        label: blueprint.label,
        detail: blueprint.blockerDetail,
        severity: blueprint.blockerSeverity,
      }
    }

    return {
      id: unmetConditionId,
      label: humanizeUnmetCondition(unmetConditionId),
      detail: `${humanizeUnmetCondition(unmetConditionId)} is currently preventing stronger fit for this pathway.`,
      severity: 'medium',
    }
  })
}

function resolveFallbackActions(candidate: RecommendationCandidateForRationale): RecommendationImprovementAction[] {
  if (candidate.type === 'composed') {
    return [{
      id: 'action-sequence-composed-milestones',
      title: 'Sequence composed milestones',
      detail: 'Prioritize intermediate milestones in order so the staged route can progress predictably.',
      priority: 'next',
      expectedImpact: 'Improves pathway continuity and reduces staging complexity.',
    }]
  }

  return [{
    id: 'action-refresh-profile-evidence',
    title: 'Refresh key profile inputs',
    detail: 'Update the profile with any changed constraints before rerunning recommendations.',
    priority: 'next',
    expectedImpact: 'Improves output trustworthiness and sharpens pathway comparisons.',
  }]
}

function buildActionsFromUnmetConditions(
  candidate: RecommendationCandidateForRationale,
  unmetConditions: string[],
): RecommendationImprovementAction[] {
  const uniqueConditions = dedupeUnmetConditions(unmetConditions)
  const mapped = uniqueConditions.slice(0, 4).map((unmetConditionId) => {
    const blueprint = explanationBlueprintByUnmetConditionId[unmetConditionId]
    if (blueprint) {
      return {
        id: `action-${unmetConditionId}`,
        title: blueprint.actionTitle,
        detail: blueprint.actionDetail,
        priority: blueprint.actionPriority,
        expectedImpact: blueprint.actionExpectedImpact,
      }
    }

    return {
      id: `action-${unmetConditionId}`,
      title: `Address ${humanizeUnmetCondition(unmetConditionId)}`,
      detail: `Resolve ${humanizeUnmetCondition(unmetConditionId).toLowerCase()} and rerun recommendation scoring.`,
      priority: 'next' as const,
      expectedImpact: 'Converts unresolved constraints into actionable readiness improvements.',
    }
  })

  if (mapped.length > 0) {
    return mapped
  }

  if (candidate.qualification === 'supported') {
    return []
  }

  return resolveFallbackActions(candidate)
}

function toImpactFromTier(tier: RecommendationCandidateForRationale['tier']): RecommendationTradeoffImpact {
  if (tier === 'lower-confidence') {
    return 'high'
  }

  if (tier === 'conditional-fit') {
    return 'medium'
  }

  return 'low'
}

function toTradeoffSummaries(candidate: RecommendationCandidateForRationale): RecommendationTradeoff[] {
  const impact = toImpactFromTier(candidate.tier)
  const pathway = humanizePathway(candidate.pathwayId)

  return [
    {
      id: `${candidate.pathwayId}-tradeoff-effort`,
      dimension: 'effort',
      summary: candidate.type === 'composed'
        ? `${pathway} requires multi-step preparation effort before direct eligibility is realistic.`
        : `${pathway} requires focused preparation effort to sustain a stronger recommendation profile.`,
      impact: candidate.type === 'blocked' ? 'high' : impact,
    },
    {
      id: `${candidate.pathwayId}-tradeoff-timing`,
      dimension: 'timing',
      summary: candidate.type === 'blocked'
        ? `${pathway} timing is sensitive to when unresolved constraints are closed.`
        : `${pathway} timing may shift depending on evidence updates and processing windows.`,
      impact: candidate.type === 'blocked' || candidate.type === 'composed' ? 'high' : impact,
    },
    {
      id: `${candidate.pathwayId}-tradeoff-complexity`,
      dimension: 'complexity',
      summary: candidate.type === 'composed'
        ? `${pathway} introduces higher sequencing complexity because milestones must be completed in order.`
        : `${pathway} has manageable complexity but still requires coordinated evidence across criteria.`,
      impact: candidate.type === 'composed' ? 'high' : impact,
    },
  ]
}

export function buildRecommendationExplanationModules(
  input: BuildRecommendationRationaleInput,
): RecommendationExplanationModulesPayload {
  const blockers = buildBlockersFromUnmetConditions(input.candidate, input.unmetConditions || [])
  const improvementActions = buildActionsFromUnmetConditions(input.candidate, input.unmetConditions || [])
  const tradeoffs = toTradeoffSummaries(input.candidate)

  return {
    blockers,
    tradeoffs,
    improvementActions,
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
