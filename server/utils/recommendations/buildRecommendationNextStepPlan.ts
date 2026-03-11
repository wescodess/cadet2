export const recommendationNextStepPlanPriorities = ['now', 'next', 'later'] as const

export type RecommendationNextStepPlanPriority = typeof recommendationNextStepPlanPriorities[number]

export type RecommendationNextStepPlanStep = {
  id: string
  title: string
  detail: string
  priority: RecommendationNextStepPlanPriority
  sequence: number
}

export type RecommendationNextStepPlan = {
  summary: string
  steps: RecommendationNextStepPlanStep[]
  limitation: string
}

type RecommendationCandidateType = 'direct' | 'blocked' | 'composed'
type RecommendationQualification = 'supported' | 'low-confidence' | 'withheld'
type RecommendationConfidence = 'high' | 'medium' | 'low' | 'withheld'
type RecommendationFreshness = 'fresh' | 'stale' | 'unknown'
type RecommendationTrustBoundary = 'source-backed' | 'inferred' | 'system-generated'

type RecommendationBlocker = {
  id: string
  label: string
  detail: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

type RecommendationTradeoff = {
  id: string
  dimension: 'effort' | 'timing' | 'complexity' | 'cost'
  summary: string
  impact: 'high' | 'medium' | 'low'
}

type RecommendationImprovementAction = {
  id: string
  title: string
  detail: string
  priority: RecommendationNextStepPlanPriority
  expectedImpact: string
}

export type BuildRecommendationNextStepPlanInput = {
  pathwayId: string
  type: RecommendationCandidateType
  qualification: RecommendationQualification
  confidence: RecommendationConfidence
  freshness: RecommendationFreshness
  caveat: string
  blockers: RecommendationBlocker[]
  tradeoffs: RecommendationTradeoff[]
  improvementActions: RecommendationImprovementAction[]
  composedSteps?: string[]
  trustBoundary: RecommendationTrustBoundary
}

const priorityOrder: Record<RecommendationNextStepPlanPriority, number> = {
  now: 0,
  next: 1,
  later: 2,
}

const stepLabelById: Record<string, string> = {
  'mvp-skilled-worker': 'the Skilled Worker route',
  'mvp-provincial-nominee': 'the Provincial Nominee route',
  'mvp-study-to-work': 'the Study-to-Work route',
  'secure-valid-job-offer': 'an eligible job offer',
  'expand-relocation-scope': 'broader relocation options',
  'build-study-budget': 'a stronger study budget',
  'commit-to-study-upgrade': 'a study or retraining step',
  'extend-planning-timeline': 'a longer planning timeline',
  'gain-targeted-work-and-language-proof': 'targeted work and language proof',
  'stabilize-settlement-funds': 'stable settlement funds',
}

function normalizeWhitespace(value: unknown): string {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().replace(/\s+/g, ' ')
}

function trimTrailingPeriod(value: string) {
  return normalizeWhitespace(value).replace(/[.]+$/, '')
}

function sentence(value: string) {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return ''
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`
}

function joinSentences(parts: string[]) {
  return parts
    .map(part => normalizeWhitespace(part))
    .filter(Boolean)
    .join(' ')
}

function humanizePathway(pathwayId: string) {
  if (stepLabelById[pathwayId]) {
    return stepLabelById[pathwayId]
  }

  return pathwayId.replace(/^mvp-/, '').replace(/-/g, ' ')
}

function toSummary(input: BuildRecommendationNextStepPlanInput) {
  if (input.type === 'blocked') {
    return 'Close the blocker first so this pathway can move from planning into execution.'
  }

  if (input.type === 'composed') {
    return 'Sequence this longer-horizon pathway as staged milestones instead of a single immediate application push.'
  }

  if (input.qualification !== 'supported' || input.confidence === 'low' || input.freshness === 'stale') {
    return 'Prepare the strongest evidence first, then recheck the limits attached to this route before acting.'
  }

  return 'Take the direct route forward by packaging the strongest evidence first.'
}

function toRiskLead(input: BuildRecommendationNextStepPlanInput) {
  const blockers = Array.isArray(input.blockers) ? input.blockers : []
  const firstBlocker = blockers[0]

  if (input.type === 'blocked' && firstBlocker && typeof firstBlocker.detail === 'string' && firstBlocker.detail.trim()) {
    return `Do not treat this pathway as ready for submission until ${trimTrailingPeriod(firstBlocker.detail).toLowerCase()}.`
  }

  if (input.qualification === 'withheld' || input.confidence === 'withheld') {
    return 'Do not treat this pathway as approved until stronger evidence is available.'
  }

  if (input.confidence === 'low' || input.qualification === 'low-confidence') {
    return 'Proceed with caution before committing to this pathway, because confidence remains limited.'
  }

  if (input.trustBoundary === 'system-generated') {
    return 'Treat this as limited-evidence guidance until you verify the current rules directly.'
  }

  if (input.trustBoundary === 'inferred') {
    return 'Treat this as strategic guidance until the sourced requirements are rechecked.'
  }

  if (input.freshness === 'stale') {
    return 'Check the current rules before acting because some supporting evidence is stale.'
  }

  return ''
}

function toLimitation(input: BuildRecommendationNextStepPlanInput) {
  return joinSentences([
    toRiskLead(input),
    input.caveat,
  ])
}

function extractFocus(action: RecommendationImprovementAction) {
  const base = trimTrailingPeriod(action.title)
    .replace(/^(increase|strengthen|secure|reassess|review|clarify|confirm|extend|build|refresh|prioritize|schedule|document|collect)\s+/i, '')
    .replace(/\bto\s+/i, '')

  return base || trimTrailingPeriod(action.detail) || 'the pathway readiness gap'
}

function preferredVerb(
  input: BuildRecommendationNextStepPlanInput,
  action: RecommendationImprovementAction,
  index: number,
) {
  const detail = `${action.title} ${action.detail}`.toLowerCase()

  if (detail.includes('schedule') || detail.includes('exam') || detail.includes('book')) {
    return 'Book'
  }

  if (detail.includes('request') || detail.includes('offer') || detail.includes('employer')) {
    return 'Request'
  }

  if (detail.includes('compare') || detail.includes('option')) {
    return 'Compare'
  }

  if (detail.includes('check') || detail.includes('verify')) {
    return 'Check'
  }

  if (detail.includes('confirm')) {
    return 'Confirm'
  }

  if (detail.includes('complete')) {
    return 'Complete'
  }

  if (detail.includes('submit')) {
    return 'Submit'
  }

  if (detail.includes('prepare')) {
    return 'Prepare'
  }

  if (detail.includes('update') || detail.includes('refresh')) {
    return 'Update'
  }

  if (input.type === 'blocked') {
    return index === 0 ? 'Check' : 'Update'
  }

  if (input.type === 'composed') {
    return index === 0 ? 'Prepare' : 'Complete'
  }

  if (action.priority === 'now') {
    return 'Gather'
  }

  if (action.priority === 'next') {
    return 'Update'
  }

  return 'Review'
}

function toConcreteActionTitle(
  input: BuildRecommendationNextStepPlanInput,
  action: RecommendationImprovementAction,
  index: number,
) {
  const title = trimTrailingPeriod(action.title)
  if (/^(Gather|Prepare|Review|Confirm|Check|Request|Compare|Update|Complete|Submit|Book)\b/i.test(title)) {
    return title
  }

  return `${preferredVerb(input, action, index)} ${extractFocus(action)}`
}

function toActionStep(
  input: BuildRecommendationNextStepPlanInput,
  action: RecommendationImprovementAction,
  index: number,
): RecommendationNextStepPlanStep {
  return {
    id: action.id,
    title: toConcreteActionTitle(input, action, index),
    detail: joinSentences([
      sentence(action.detail),
      action.expectedImpact ? `Expected impact: ${trimTrailingPeriod(action.expectedImpact)}.` : '',
    ]),
    priority: action.priority,
    sequence: index + 1,
  }
}

function toComposedSteps(input: BuildRecommendationNextStepPlanInput) {
  const rawSteps = input.composedSteps || []
  const mapped = rawSteps.map((step, index): RecommendationNextStepPlanStep => ({
    id: `next-step-${input.pathwayId}-${step}-${index + 1}`,
    title: index === 0
      ? `Prepare ${humanizePathway(step)}`
      : `Complete ${humanizePathway(step)}`,
    detail: sentence(`Finish milestone ${index + 1} for ${humanizePathway(step)} before advancing to the next stage.`),
    priority: index === 0 ? 'now' : index === 1 ? 'next' : 'later',
    sequence: index + 1,
  }))

  if (mapped.length >= 2) {
    return mapped
  }

  return [
    ...mapped,
    {
      id: `next-step-${input.pathwayId}-review-readiness`,
      title: 'Review milestone readiness',
      detail: 'Review the milestone sequence again before treating this route as ready for action.',
      priority: (mapped.length === 0 ? 'now' : 'next') as RecommendationNextStepPlanPriority,
      sequence: mapped.length + 1,
    },
    {
      id: `next-step-${input.pathwayId}-confirm-next-stage`,
      title: 'Confirm the next stage requirements',
      detail: 'Confirm each future-stage requirement before moving from strategy into execution.',
      priority: 'later' as RecommendationNextStepPlanPriority,
      sequence: mapped.length + 2,
    },
  ]
}

function toBlockedFallbackSteps(input: BuildRecommendationNextStepPlanInput) {
  const blockers = Array.isArray(input.blockers) ? input.blockers : []
  const firstBlocker = blockers[0]
  const blockerLabel = firstBlocker && typeof firstBlocker.label === 'string' && firstBlocker.label.trim()
    ? trimTrailingPeriod(firstBlocker.label).toLowerCase()
    : 'the missing requirement'

  return [
    {
      id: `next-step-${input.pathwayId}-blocked-1`,
      title: `Check ${blockerLabel}`,
      detail: sentence(firstBlocker?.detail || 'Check the blocker that is preventing this route from moving forward.'),
      priority: 'now' as const,
      sequence: 1,
    },
    {
      id: `next-step-${input.pathwayId}-blocked-2`,
      title: 'Update the missing evidence',
      detail: 'Update the profile or supporting documents so the blocker can be reassessed with stronger evidence.',
      priority: 'next' as const,
      sequence: 2,
    },
    {
      id: `next-step-${input.pathwayId}-blocked-3`,
      title: 'Review readiness before rerun',
      detail: 'Review the remaining tradeoffs before rerunning this recommendation for a stronger signal.',
      priority: 'later' as const,
      sequence: 3,
    },
  ]
}

function toDirectFallbackSteps(input: BuildRecommendationNextStepPlanInput) {
  return [
    {
      id: `next-step-${input.pathwayId}-direct-1`,
      title: 'Gather the core eligibility evidence',
      detail: 'Gather the language, work, and settlement-fund evidence that supports this pathway.',
      priority: 'now' as const,
      sequence: 1,
    },
    {
      id: `next-step-${input.pathwayId}-direct-2`,
      title: 'Update the pathway profile details',
      detail: 'Update the workspace profile so the next submission steps match the latest evidence.',
      priority: 'next' as const,
      sequence: 2,
    },
    {
      id: `next-step-${input.pathwayId}-direct-3`,
      title: 'Review the final caveats',
      detail: 'Review the trust, freshness, and tradeoff notes before treating this route as your lead option.',
      priority: 'later' as const,
      sequence: 3,
    },
  ]
}

function toPlanSteps(input: BuildRecommendationNextStepPlanInput) {
  if (input.type === 'composed') {
    return toComposedSteps(input)
  }

  const actionSteps = [...input.improvementActions]
    .sort((left, right) => priorityOrder[left.priority] - priorityOrder[right.priority])
    .map((action, index) => toActionStep(input, action, index))

  if (actionSteps.length > 0) {
    return actionSteps
  }

  if (input.type === 'blocked') {
    return toBlockedFallbackSteps(input)
  }

  return toDirectFallbackSteps(input)
}

const EMPTY_PLAN: RecommendationNextStepPlan = {
  summary: '',
  steps: [] as RecommendationNextStepPlanStep[],
  limitation: '',
}

export function buildRecommendationNextStepPlan(
  input: BuildRecommendationNextStepPlanInput,
): RecommendationNextStepPlan {
  try {
    return {
      summary: toSummary(input),
      steps: toPlanSteps(input),
      limitation: toLimitation(input),
    }
  }
  catch {
    return { ...EMPTY_PLAN }
  }
}
