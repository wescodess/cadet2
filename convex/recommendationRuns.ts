import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'

type RecommendationLifecycleStatus = 'queued' | 'evaluating' | 'completed' | 'degraded' | 'failed'
type RecommendationProcessingMode =
  'standard' | 'recoverable-delay' | 'mock-completed' | 'mock-degraded' | 'mock-failed'
type DirectPathwayOutcome = {
  pathwayId: string
  status: 'direct'
}
type BlockedPathwayOutcome = {
  pathwayId: string
  status: 'blocked'
  unmetConditions: string[]
}
type RecommendationTier = 'strong-fit' | 'conditional-fit' | 'lower-confidence'
type RecommendationQualification = 'supported' | 'low-confidence' | 'withheld'
type RecommendationConfidence = 'high' | 'medium' | 'low' | 'withheld'
type RecommendationFreshness = 'fresh' | 'stale' | 'unknown'
type RecommendationFitSignalState = 'strength' | 'watch' | 'gap'
type RecommendationBlockerSeverity = 'critical' | 'high' | 'medium' | 'low'
type RecommendationTradeoffDimension = 'effort' | 'timing' | 'complexity' | 'cost'
type RecommendationTradeoffImpact = 'high' | 'medium' | 'low'
type RecommendationImprovementPriority = 'now' | 'next' | 'later'
type RecommendationFitSignal = {
  id: string
  label: string
  detail: string
  state: RecommendationFitSignalState
}
type RecommendationBlocker = {
  id: string
  label: string
  detail: string
  severity: RecommendationBlockerSeverity
}
type RecommendationTradeoff = {
  id: string
  dimension: RecommendationTradeoffDimension
  summary: string
  impact: RecommendationTradeoffImpact
}
type RecommendationImprovementAction = {
  id: string
  title: string
  detail: string
  priority: RecommendationImprovementPriority
  expectedImpact: string
}
type RankedDirectRecommendation = {
  pathwayId: string
  type: 'direct'
  rank: number
  tier: RecommendationTier
  score: number
  rationale?: string
  fitSignals?: RecommendationFitSignal[]
  qualification?: RecommendationQualification
  confidence?: RecommendationConfidence
  freshness?: RecommendationFreshness
  caveat?: string
  blockers?: RecommendationBlocker[]
  tradeoffs?: RecommendationTradeoff[]
  improvementActions?: RecommendationImprovementAction[]
}
type RankedBlockedRecommendation = {
  pathwayId: string
  type: 'blocked'
  rank: number
  tier: RecommendationTier
  score: number
  rationale?: string
  fitSignals?: RecommendationFitSignal[]
  qualification?: RecommendationQualification
  confidence?: RecommendationConfidence
  freshness?: RecommendationFreshness
  caveat?: string
  blockers?: RecommendationBlocker[]
  tradeoffs?: RecommendationTradeoff[]
  improvementActions?: RecommendationImprovementAction[]
}
type RankedComposedRecommendation = {
  pathwayId: string
  type: 'composed'
  rank: number
  tier: RecommendationTier
  score: number
  composedSteps: string[]
  rationale?: string
  fitSignals?: RecommendationFitSignal[]
  qualification?: RecommendationQualification
  confidence?: RecommendationConfidence
  freshness?: RecommendationFreshness
  caveat?: string
  blockers?: RecommendationBlocker[]
  tradeoffs?: RecommendationTradeoff[]
  improvementActions?: RecommendationImprovementAction[]
}

const directPathwayOutcomeValidator = v.object({
  pathwayId: v.string(),
  status: v.literal('direct'),
})

const blockedPathwayOutcomeValidator = v.object({
  pathwayId: v.string(),
  status: v.literal('blocked'),
  unmetConditions: v.array(v.string()),
})

const recommendationTierValidator = v.union(
  v.literal('strong-fit'),
  v.literal('conditional-fit'),
  v.literal('lower-confidence'),
)

const recommendationQualificationValidator = v.union(
  v.literal('supported'),
  v.literal('low-confidence'),
  v.literal('withheld'),
)

const recommendationConfidenceValidator = v.union(
  v.literal('high'),
  v.literal('medium'),
  v.literal('low'),
  v.literal('withheld'),
)

const recommendationFreshnessValidator = v.union(
  v.literal('fresh'),
  v.literal('stale'),
  v.literal('unknown'),
)

const recommendationFitSignalStateValidator = v.union(
  v.literal('strength'),
  v.literal('watch'),
  v.literal('gap'),
)

const recommendationFitSignalValidator = v.object({
  id: v.string(),
  label: v.string(),
  detail: v.string(),
  state: recommendationFitSignalStateValidator,
})

const recommendationBlockerSeverityValidator = v.union(
  v.literal('critical'),
  v.literal('high'),
  v.literal('medium'),
  v.literal('low'),
)

const recommendationTradeoffDimensionValidator = v.union(
  v.literal('effort'),
  v.literal('timing'),
  v.literal('complexity'),
  v.literal('cost'),
)

const recommendationTradeoffImpactValidator = v.union(
  v.literal('high'),
  v.literal('medium'),
  v.literal('low'),
)

const recommendationImprovementPriorityValidator = v.union(
  v.literal('now'),
  v.literal('next'),
  v.literal('later'),
)

const recommendationBlockerValidator = v.object({
  id: v.string(),
  label: v.string(),
  detail: v.string(),
  severity: recommendationBlockerSeverityValidator,
})

const recommendationTradeoffValidator = v.object({
  id: v.string(),
  dimension: recommendationTradeoffDimensionValidator,
  summary: v.string(),
  impact: recommendationTradeoffImpactValidator,
})

const recommendationImprovementActionValidator = v.object({
  id: v.string(),
  title: v.string(),
  detail: v.string(),
  priority: recommendationImprovementPriorityValidator,
  expectedImpact: v.string(),
})

const rankedDirectRecommendationValidator = v.object({
  pathwayId: v.string(),
  type: v.literal('direct'),
  rank: v.number(),
  tier: recommendationTierValidator,
  score: v.number(),
  rationale: v.optional(v.string()),
  fitSignals: v.optional(v.array(recommendationFitSignalValidator)),
  qualification: v.optional(recommendationQualificationValidator),
  confidence: v.optional(recommendationConfidenceValidator),
  freshness: v.optional(recommendationFreshnessValidator),
  caveat: v.optional(v.string()),
  blockers: v.optional(v.array(recommendationBlockerValidator)),
  tradeoffs: v.optional(v.array(recommendationTradeoffValidator)),
  improvementActions: v.optional(v.array(recommendationImprovementActionValidator)),
})

const rankedBlockedRecommendationValidator = v.object({
  pathwayId: v.string(),
  type: v.literal('blocked'),
  rank: v.number(),
  tier: recommendationTierValidator,
  score: v.number(),
  rationale: v.optional(v.string()),
  fitSignals: v.optional(v.array(recommendationFitSignalValidator)),
  qualification: v.optional(recommendationQualificationValidator),
  confidence: v.optional(recommendationConfidenceValidator),
  freshness: v.optional(recommendationFreshnessValidator),
  caveat: v.optional(v.string()),
  blockers: v.optional(v.array(recommendationBlockerValidator)),
  tradeoffs: v.optional(v.array(recommendationTradeoffValidator)),
  improvementActions: v.optional(v.array(recommendationImprovementActionValidator)),
})

const rankedComposedRecommendationValidator = v.object({
  pathwayId: v.string(),
  type: v.literal('composed'),
  rank: v.number(),
  tier: recommendationTierValidator,
  score: v.number(),
  composedSteps: v.array(v.string()),
  rationale: v.optional(v.string()),
  fitSignals: v.optional(v.array(recommendationFitSignalValidator)),
  qualification: v.optional(recommendationQualificationValidator),
  confidence: v.optional(recommendationConfidenceValidator),
  freshness: v.optional(recommendationFreshnessValidator),
  caveat: v.optional(v.string()),
  blockers: v.optional(v.array(recommendationBlockerValidator)),
  tradeoffs: v.optional(v.array(recommendationTradeoffValidator)),
  improvementActions: v.optional(v.array(recommendationImprovementActionValidator)),
})

const inProgressStatuses = new Set<RecommendationLifecycleStatus>(['queued', 'evaluating'])

const allowedTransitions: Record<
  RecommendationLifecycleStatus,
  Set<RecommendationLifecycleStatus>
> = {
  queued: new Set(['queued', 'evaluating', 'completed', 'degraded', 'failed']),
  evaluating: new Set(['evaluating', 'completed', 'degraded', 'failed']),
  completed: new Set(['completed']),
  degraded: new Set(['degraded']),
  failed: new Set(['failed']),
}

function canTransition(from: RecommendationLifecycleStatus, to: RecommendationLifecycleStatus) {
  return allowedTransitions[from].has(to)
}

function buildDefaultStatusMessage(status: RecommendationLifecycleStatus) {
  switch (status) {
    case 'queued':
      return 'Recommendation processing is active and resumable while internal services catch up.'
    case 'evaluating':
      return 'Recommendation processing is actively evaluating your profile.'
    case 'completed':
      return 'Recommendation evaluation completed.'
    case 'degraded':
      return 'Recommendation evaluation completed with degraded quality.'
    case 'failed':
      return 'Recommendation evaluation failed and requires retry.'
  }
}

function resolveTargetStatus(
  mode: RecommendationProcessingMode,
  currentStatus: RecommendationLifecycleStatus,
): RecommendationLifecycleStatus {
  switch (mode) {
    case 'recoverable-delay':
      return inProgressStatuses.has(currentStatus) ? currentStatus : 'queued'
    case 'mock-completed':
      return 'completed'
    case 'mock-degraded':
      return 'degraded'
    case 'mock-failed':
      return 'failed'
    case 'standard':
    default:
      return 'evaluating'
  }
}

function resolveStatusMessage(
  mode: RecommendationProcessingMode,
  status: RecommendationLifecycleStatus,
) {
  if (mode === 'recoverable-delay') {
    return 'Processing is active and resumable while internal services catch up.'
  }

  return buildDefaultStatusMessage(status)
}

function normalizeDirectOutcomes(outcomes: DirectPathwayOutcome[]) {
  return Array.from(new Set(outcomes.map((outcome) => outcome.pathwayId)))
    .sort((left, right) => left.localeCompare(right))
    .map((pathwayId) => ({
      pathwayId,
      status: 'direct' as const,
    }))
}

function normalizeBlockedOutcomes(outcomes: BlockedPathwayOutcome[]) {
  const byPathwayId = new Map<string, Set<string>>()

  for (const outcome of outcomes) {
    const existing = byPathwayId.get(outcome.pathwayId) || new Set<string>()
    for (const unmetCondition of outcome.unmetConditions) {
      const normalizedCondition = unmetCondition.trim()
      if (normalizedCondition) {
        existing.add(normalizedCondition)
      }
    }

    if (existing.size === 0) {
      existing.add('unspecified-requirement')
    }

    byPathwayId.set(outcome.pathwayId, existing)
  }

  return Array.from(byPathwayId.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([pathwayId, unmetConditions]) => ({
      pathwayId,
      status: 'blocked' as const,
      unmetConditions: Array.from(unmetConditions).sort(),
    }))
}

function directOutcomesEqual(left: DirectPathwayOutcome[], right: DirectPathwayOutcome[]) {
  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index].pathwayId !== right[index].pathwayId) {
      return false
    }
  }

  return true
}

function blockedOutcomesEqual(left: BlockedPathwayOutcome[], right: BlockedPathwayOutcome[]) {
  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    const leftOutcome = left[index]
    const rightOutcome = right[index]

    if (leftOutcome.pathwayId !== rightOutcome.pathwayId) {
      return false
    }

    if (leftOutcome.unmetConditions.length !== rightOutcome.unmetConditions.length) {
      return false
    }

    for (let unmetIndex = 0; unmetIndex < leftOutcome.unmetConditions.length; unmetIndex += 1) {
      if (leftOutcome.unmetConditions[unmetIndex] !== rightOutcome.unmetConditions[unmetIndex]) {
        return false
      }
    }
  }

  return true
}

function dedupeAndSortRankedCandidates<
  T extends {
    pathwayId: string
    rank: number
    score: number
  },
>(candidates: T[]) {
  const byPathway = new Map<string, T>()

  for (const candidate of candidates) {
    const current = byPathway.get(candidate.pathwayId)
    if (
      !current ||
      candidate.rank < current.rank ||
      (candidate.rank === current.rank && candidate.score > current.score)
    ) {
      byPathway.set(candidate.pathwayId, candidate)
    }
  }

  return Array.from(byPathway.values()).sort((left, right) => {
    if (left.rank !== right.rank) {
      return left.rank - right.rank
    }

    if (left.score !== right.score) {
      return right.score - left.score
    }

    return left.pathwayId.localeCompare(right.pathwayId)
  })
}

function normalizeQualification(
  value: unknown,
  fallback: RecommendationQualification,
): RecommendationQualification {
  if (value === 'supported' || value === 'low-confidence' || value === 'withheld') {
    return value
  }

  return fallback
}

function normalizeConfidence(
  value: unknown,
  fallback: RecommendationConfidence,
): RecommendationConfidence {
  if (value === 'high' || value === 'medium' || value === 'low' || value === 'withheld') {
    return value
  }

  return fallback
}

function normalizeFreshness(
  value: unknown,
  fallback: RecommendationFreshness,
): RecommendationFreshness {
  if (value === 'fresh' || value === 'stale' || value === 'unknown') {
    return value
  }

  return fallback
}

function normalizeCaveat(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }

  return fallback
}

function normalizeRationale(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }

  return fallback
}

function normalizeFitSignalState(value: unknown): RecommendationFitSignalState {
  if (value === 'strength' || value === 'watch' || value === 'gap') {
    return value
  }

  return 'watch'
}

function normalizeFitSignals(value: unknown): RecommendationFitSignal[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
    )
    .map((entry, index) => {
      const id =
        typeof entry.id === 'string' && entry.id.trim().length > 0
          ? entry.id.trim()
          : `signal-${index + 1}`
      const label =
        typeof entry.label === 'string' && entry.label.trim().length > 0
          ? entry.label.trim()
          : 'Fit signal'
      const detail =
        typeof entry.detail === 'string' && entry.detail.trim().length > 0
          ? entry.detail.trim()
          : 'Profile signal was not available.'

      return {
        id,
        label,
        detail,
        state: normalizeFitSignalState(entry.state),
      }
    })
}

function withDefaultFitSignal(
  signals: RecommendationFitSignal[],
  detail: string,
): RecommendationFitSignal[] {
  if (signals.length > 0) {
    return signals
  }

  return [
    {
      id: 'fit-overview',
      label: 'Fit overview',
      detail,
      state: 'watch',
    },
  ]
}

function normalizeBlockerSeverity(value: unknown): RecommendationBlockerSeverity {
  if (value === 'critical' || value === 'high' || value === 'medium' || value === 'low') {
    return value
  }

  return 'medium'
}

function normalizeTradeoffDimension(value: unknown): RecommendationTradeoffDimension {
  if (value === 'effort' || value === 'timing' || value === 'complexity' || value === 'cost') {
    return value
  }

  return 'effort'
}

function normalizeTradeoffImpact(value: unknown): RecommendationTradeoffImpact {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value
  }

  return 'medium'
}

function normalizeActionPriority(value: unknown): RecommendationImprovementPriority {
  if (value === 'now' || value === 'next' || value === 'later') {
    return value
  }

  return 'next'
}

function fallbackBlockersForCandidate(candidate: {
  pathwayId: string
  type: 'direct' | 'blocked' | 'composed'
  qualification: RecommendationQualification
}): RecommendationBlocker[] {
  if (candidate.qualification === 'supported') {
    return []
  }

  if (candidate.type === 'blocked') {
    return [
      {
        id: 'conditional-readiness-gap',
        label: 'Conditional readiness gap',
        detail: `${candidate.pathwayId} remains conditional because key constraints are unresolved.`,
        severity: 'high',
      },
    ]
  }

  if (candidate.type === 'composed') {
    return [
      {
        id: 'staged-pathway-dependency',
        label: 'Staged dependency',
        detail: `${candidate.pathwayId} requires intermediate milestones before direct-fit eligibility is likely.`,
        severity: 'medium',
      },
    ]
  }

  return [
    {
      id: 'profile-evidence-watch',
      label: 'Profile evidence watch',
      detail: `${candidate.pathwayId} should be monitored for changing profile constraints.`,
      severity: 'medium',
    },
  ]
}

function normalizeBlockers(
  value: unknown,
  candidate: {
    pathwayId: string
    type: 'direct' | 'blocked' | 'composed'
    qualification: RecommendationQualification
  },
): RecommendationBlocker[] {
  if (!Array.isArray(value)) {
    return fallbackBlockersForCandidate(candidate)
  }

  const normalized = value
    .filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
    )
    .map((entry, index) => {
      const id =
        typeof entry.id === 'string' && entry.id.trim().length > 0
          ? entry.id.trim()
          : `blocker-${index + 1}`
      const label =
        typeof entry.label === 'string' && entry.label.trim().length > 0
          ? entry.label.trim()
          : 'Pathway constraint'
      const detail =
        typeof entry.detail === 'string' && entry.detail.trim().length > 0
          ? entry.detail.trim()
          : 'A pathway requirement remains unresolved.'

      return {
        id,
        label,
        detail,
        severity: normalizeBlockerSeverity(entry.severity),
      }
    })

  return normalized.length > 0 ? normalized : fallbackBlockersForCandidate(candidate)
}

function fallbackTradeoffImpact(
  candidateType: 'direct' | 'blocked' | 'composed',
): RecommendationTradeoffImpact {
  if (candidateType === 'blocked' || candidateType === 'composed') {
    return 'high'
  }

  return 'medium'
}

function fallbackTradeoffSummary(
  pathwayId: string,
  dimension: RecommendationTradeoffDimension,
  candidateType: 'direct' | 'blocked' | 'composed',
): string {
  if (dimension === 'effort') {
    return candidateType === 'composed'
      ? `${pathwayId} requires staged effort across multiple milestones.`
      : `${pathwayId} requires preparation effort that should be planned explicitly.`
  }

  if (dimension === 'timing') {
    return `${pathwayId} timing depends on when key constraints are addressed.`
  }

  if (dimension === 'complexity') {
    return candidateType === 'composed'
      ? `${pathwayId} has higher sequencing complexity because multiple steps are required.`
      : `${pathwayId} complexity should be considered when comparing alternatives.`
  }

  return `${pathwayId} can introduce additional financial overhead depending on execution choices.`
}

function normalizeTradeoffs(
  value: unknown,
  candidate: {
    pathwayId: string
    type: 'direct' | 'blocked' | 'composed'
  },
): RecommendationTradeoff[] {
  const parsed = Array.isArray(value)
    ? value
        .filter(
          (entry): entry is Record<string, unknown> =>
            Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
        )
        .map((entry, index) => {
          const dimension = normalizeTradeoffDimension(entry.dimension)
          const id =
            typeof entry.id === 'string' && entry.id.trim().length > 0
              ? entry.id.trim()
              : `${candidate.pathwayId}-tradeoff-${dimension}-${index + 1}`
          const summary =
            typeof entry.summary === 'string' && entry.summary.trim().length > 0
              ? entry.summary.trim()
              : fallbackTradeoffSummary(candidate.pathwayId, dimension, candidate.type)

          return {
            id,
            dimension,
            summary,
            impact: normalizeTradeoffImpact(entry.impact),
          }
        })
    : []

  const requiredDimensions: RecommendationTradeoffDimension[] = ['effort', 'timing', 'complexity']
  const seenDimensions = new Set(parsed.map((entry) => entry.dimension))
  const withDefaults = [...parsed]

  for (const requiredDimension of requiredDimensions) {
    if (!seenDimensions.has(requiredDimension)) {
      withDefaults.push({
        id: `${candidate.pathwayId}-tradeoff-${requiredDimension}`,
        dimension: requiredDimension,
        summary: fallbackTradeoffSummary(candidate.pathwayId, requiredDimension, candidate.type),
        impact: fallbackTradeoffImpact(candidate.type),
      })
    }
  }

  return withDefaults
}

function fallbackActionsForCandidate(candidate: {
  pathwayId: string
  type: 'direct' | 'blocked' | 'composed'
  qualification: RecommendationQualification
}): RecommendationImprovementAction[] {
  if (candidate.type === 'composed') {
    return [
      {
        id: 'action-sequence-composed-milestones',
        title: 'Sequence composed milestones',
        detail:
          'Prioritize intermediate milestones in order so the staged route can progress predictably.',
        priority: 'next',
        expectedImpact: 'Improves pathway continuity and reduces staging complexity.',
      },
    ]
  }

  if (candidate.qualification === 'supported') {
    return []
  }

  return [
    {
      id: 'action-refresh-profile-evidence',
      title: 'Refresh key profile inputs',
      detail: 'Update profile constraints and rerun recommendations to improve confidence.',
      priority: 'next',
      expectedImpact: 'Converts unresolved constraints into actionable readiness improvements.',
    },
  ]
}

function normalizeImprovementActions(
  value: unknown,
  blockers: RecommendationBlocker[],
  candidate: {
    pathwayId: string
    type: 'direct' | 'blocked' | 'composed'
    qualification: RecommendationQualification
  },
): RecommendationImprovementAction[] {
  const blockerIds = new Set(blockers.map((blocker) => blocker.id))
  const parsed = Array.isArray(value)
    ? value
        .filter(
          (entry): entry is Record<string, unknown> =>
            Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry),
        )
        .map((entry, index) => {
          const normalizedId =
            typeof entry.id === 'string' && entry.id.trim().length > 0
              ? entry.id.trim()
              : `${candidate.pathwayId}-action-${index + 1}`
          const id = blockerIds.has(normalizedId) ? `action-${normalizedId}` : normalizedId
          const title =
            typeof entry.title === 'string' && entry.title.trim().length > 0
              ? entry.title.trim()
              : 'Improve pathway readiness'
          const detail =
            typeof entry.detail === 'string' && entry.detail.trim().length > 0
              ? entry.detail.trim()
              : 'Complete a focused readiness action before rerunning recommendations.'
          const expectedImpact =
            typeof entry.expectedImpact === 'string' && entry.expectedImpact.trim().length > 0
              ? entry.expectedImpact.trim()
              : 'Improves confidence and reduces unresolved pathway constraints.'

          return {
            id,
            title,
            detail,
            priority: normalizeActionPriority(entry.priority),
            expectedImpact,
          }
        })
    : []

  return parsed.length > 0 ? parsed : fallbackActionsForCandidate(candidate)
}

function normalizeRankedDirectRecommendations(candidates: RankedDirectRecommendation[]) {
  return dedupeAndSortRankedCandidates(candidates).map((candidate) => {
    const qualification = normalizeQualification(candidate.qualification, 'low-confidence')
    const normalized = {
      pathwayId: candidate.pathwayId,
      type: 'direct' as const,
      rank: Math.max(1, Math.round(candidate.rank)),
      tier: candidate.tier,
      score: Math.max(1, Math.round(candidate.score)),
      rationale: normalizeRationale(
        candidate.rationale,
        `${candidate.pathwayId} appears based on current direct-fit pathway evaluation.`,
      ),
      fitSignals: withDefaultFitSignal(
        normalizeFitSignals(candidate.fitSignals),
        'Direct-fit signal available from pathway scoring and qualification metadata.',
      ),
      qualification,
      confidence: normalizeConfidence(candidate.confidence, 'low'),
      freshness: normalizeFreshness(candidate.freshness, 'unknown'),
      caveat: normalizeCaveat(
        candidate.caveat,
        'Qualification metadata is unavailable for this recommendation. Treat as low-confidence guidance and rerun for updated evidence.',
      ),
    }
    const blockers = normalizeBlockers(candidate.blockers, {
      pathwayId: normalized.pathwayId,
      type: normalized.type,
      qualification,
    })

    return {
      ...normalized,
      blockers,
      tradeoffs: normalizeTradeoffs(candidate.tradeoffs, {
        pathwayId: normalized.pathwayId,
        type: normalized.type,
      }),
      improvementActions: normalizeImprovementActions(candidate.improvementActions, blockers, {
        pathwayId: normalized.pathwayId,
        type: normalized.type,
        qualification,
      }),
    }
  })
}

function normalizeRankedBlockedRecommendations(candidates: RankedBlockedRecommendation[]) {
  return dedupeAndSortRankedCandidates(candidates).map((candidate) => {
    const qualification = normalizeQualification(candidate.qualification, 'low-confidence')
    const normalized = {
      pathwayId: candidate.pathwayId,
      type: 'blocked' as const,
      rank: Math.max(1, Math.round(candidate.rank)),
      tier: candidate.tier,
      score: Math.max(1, Math.round(candidate.score)),
      rationale: normalizeRationale(
        candidate.rationale,
        `${candidate.pathwayId} is conditionally shown because key pathway constraints are unresolved.`,
      ),
      fitSignals: withDefaultFitSignal(
        normalizeFitSignals(candidate.fitSignals),
        'Conditional signal available because pathway requirements remain partially unmet.',
      ),
      qualification,
      confidence: normalizeConfidence(candidate.confidence, 'low'),
      freshness: normalizeFreshness(candidate.freshness, 'unknown'),
      caveat: normalizeCaveat(
        candidate.caveat,
        `${candidate.pathwayId} is conditionally usable and should be treated as low-confidence guidance until refreshed evidence is available.`,
      ),
    }
    const blockers = normalizeBlockers(candidate.blockers, {
      pathwayId: normalized.pathwayId,
      type: normalized.type,
      qualification,
    })

    return {
      ...normalized,
      blockers,
      tradeoffs: normalizeTradeoffs(candidate.tradeoffs, {
        pathwayId: normalized.pathwayId,
        type: normalized.type,
      }),
      improvementActions: normalizeImprovementActions(candidate.improvementActions, blockers, {
        pathwayId: normalized.pathwayId,
        type: normalized.type,
        qualification,
      }),
    }
  })
}

function normalizeRankedComposedRecommendations(candidates: RankedComposedRecommendation[]) {
  return dedupeAndSortRankedCandidates(candidates).map((candidate) => {
    const qualification = normalizeQualification(candidate.qualification, 'low-confidence')
    const normalized = {
      pathwayId: candidate.pathwayId,
      type: 'composed' as const,
      rank: Math.max(1, Math.round(candidate.rank)),
      tier: candidate.tier,
      score: Math.max(1, Math.round(candidate.score)),
      composedSteps: Array.from(
        new Set(
          candidate.composedSteps.map((step) => step.trim()).filter((step) => step.length > 0),
        ),
      ),
      rationale: normalizeRationale(
        candidate.rationale,
        `${candidate.pathwayId} is presented as a staged route based on composed pathway evaluation.`,
      ),
      fitSignals: withDefaultFitSignal(
        normalizeFitSignals(candidate.fitSignals),
        'Staged fit signal available because this pathway relies on a composed route.',
      ),
      qualification,
      confidence: normalizeConfidence(candidate.confidence, 'low'),
      freshness: normalizeFreshness(candidate.freshness, 'unknown'),
      caveat: normalizeCaveat(
        candidate.caveat,
        'Composed pathway guidance is provisional and should be treated as low-confidence until refreshed evidence is available.',
      ),
    }
    const blockers = normalizeBlockers(candidate.blockers, {
      pathwayId: normalized.pathwayId,
      type: normalized.type,
      qualification,
    })

    return {
      ...normalized,
      blockers,
      tradeoffs: normalizeTradeoffs(candidate.tradeoffs, {
        pathwayId: normalized.pathwayId,
        type: normalized.type,
      }),
      improvementActions: normalizeImprovementActions(candidate.improvementActions, blockers, {
        pathwayId: normalized.pathwayId,
        type: normalized.type,
        qualification,
      }),
    }
  })
}

export const createQueuedRun = internalMutation({
  args: {
    runId: v.string(),
    userId: v.string(),
    profileSnapshotId: v.string(),
    refreshedFromRunId: v.optional(v.string()),
    previousProfileSnapshotId: v.optional(v.string()),
    refreshRootRunId: v.optional(v.string()),
    refreshSequence: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    await ctx.db.insert('recommendation_runs', {
      runId: args.runId,
      userId: args.userId,
      profileSnapshotId: args.profileSnapshotId,
      refreshedFromRunId: args.refreshedFromRunId,
      previousProfileSnapshotId: args.previousProfileSnapshotId,
      refreshRootRunId: args.refreshRootRunId,
      refreshSequence: args.refreshSequence,
      status: 'queued',
      statusMessage: buildDefaultStatusMessage('queued'),
      resumable: true,
      processingHeartbeatAt: now,
      createdAt: now,
      updatedAt: now,
    })

    return {
      runId: args.runId,
      profileSnapshotId: args.profileSnapshotId,
      refreshedFromRunId: args.refreshedFromRunId,
      previousProfileSnapshotId: args.previousProfileSnapshotId,
      refreshRootRunId: args.refreshRootRunId,
      refreshSequence: args.refreshSequence,
      status: 'queued' as const,
      statusMessage: buildDefaultStatusMessage('queued'),
      resumable: true,
      processingHeartbeatAt: now,
      createdAt: now,
      updatedAt: now,
    }
  },
})

export const listForUser = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_userId_createdAt', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect()

    return rows.map((row) => ({
      recommendationCount: row.recommendationResults?.rankedAt
        ? (row.recommendationResults?.direct?.length || 0) +
          (row.recommendationResults?.blocked?.length || 0) +
          (row.recommendationResults?.composed?.length || 0)
        : 0,
      hasRankedPayload: Boolean(row.recommendationResults?.rankedAt),
      runId: row.runId,
      profileSnapshotId: row.profileSnapshotId,
      refreshedFromRunId: row.refreshedFromRunId,
      previousProfileSnapshotId: row.previousProfileSnapshotId,
      refreshRootRunId: row.refreshRootRunId,
      refreshSequence: row.refreshSequence,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))
  },
})

export const readStatusForUser = internalQuery({
  args: {
    runId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_runId', (q) => q.eq('runId', args.runId))
      .first()

    if (!row || row.userId !== args.userId) {
      return null
    }

    return {
      runId: row.runId,
      profileSnapshotId: row.profileSnapshotId,
      refreshedFromRunId: row.refreshedFromRunId,
      previousProfileSnapshotId: row.previousProfileSnapshotId,
      refreshRootRunId: row.refreshRootRunId,
      refreshSequence: row.refreshSequence,
      status: row.status,
      statusMessage: row.statusMessage || buildDefaultStatusMessage(row.status),
      resumable:
        typeof row.resumable === 'boolean' ? row.resumable : inProgressStatuses.has(row.status),
      processingHeartbeatAt: row.processingHeartbeatAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  },
})

export const readPathwayEvaluationForUser = internalQuery({
  args: {
    runId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_runId', (q) => q.eq('runId', args.runId))
      .first()

    if (!row || row.userId !== args.userId) {
      return null
    }

    const direct = row.pathwayEvaluation?.direct || []
    const blocked = row.pathwayEvaluation?.blocked || []

    return {
      runId: row.runId,
      profileSnapshotId: row.profileSnapshotId,
      direct: normalizeDirectOutcomes(direct),
      blocked: normalizeBlockedOutcomes(blocked),
      evaluatedAt: row.pathwayEvaluation?.evaluatedAt ?? null,
    }
  },
})

export const writePathwayEvaluationForUser = internalMutation({
  args: {
    runId: v.string(),
    userId: v.string(),
    profileSnapshotId: v.string(),
    direct: v.array(directPathwayOutcomeValidator),
    blocked: v.array(blockedPathwayOutcomeValidator),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_runId', (q) => q.eq('runId', args.runId))
      .first()

    if (!row || row.userId !== args.userId || row.profileSnapshotId !== args.profileSnapshotId) {
      throw new Error('RUN_NOT_FOUND')
    }

    const normalizedDirect = normalizeDirectOutcomes(args.direct)
    const normalizedBlocked = normalizeBlockedOutcomes(args.blocked)
    const existingDirect = normalizeDirectOutcomes(
      (row.pathwayEvaluation?.direct || []) as DirectPathwayOutcome[],
    )
    const existingBlocked = normalizeBlockedOutcomes(
      (row.pathwayEvaluation?.blocked || []) as BlockedPathwayOutcome[],
    )

    if (
      row.pathwayEvaluation &&
      directOutcomesEqual(existingDirect, normalizedDirect) &&
      blockedOutcomesEqual(existingBlocked, normalizedBlocked)
    ) {
      return {
        runId: row.runId,
        profileSnapshotId: row.profileSnapshotId,
        direct: existingDirect,
        blocked: existingBlocked,
        evaluatedAt: row.pathwayEvaluation.evaluatedAt,
      }
    }

    const now = Date.now()

    await ctx.db.patch(row._id, {
      pathwayEvaluation: {
        evaluatedAt: now,
        evaluatorVersion: 'mvp-pathway-catalog-v1',
        direct: normalizedDirect,
        blocked: normalizedBlocked,
      },
      updatedAt: now,
    })

    return {
      runId: row.runId,
      profileSnapshotId: row.profileSnapshotId,
      direct: normalizedDirect,
      blocked: normalizedBlocked,
      evaluatedAt: now,
    }
  },
})

export const readRankedRecommendationsForUser = internalQuery({
  args: {
    runId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_runId', (q) => q.eq('runId', args.runId))
      .first()

    if (!row || row.userId !== args.userId) {
      return null
    }

    return {
      runId: row.runId,
      profileSnapshotId: row.profileSnapshotId,
      status: row.status,
      rankedAt: row.recommendationResults?.rankedAt ?? null,
      noComposedReason: row.recommendationResults?.noComposedReason ?? '',
      results: {
        direct: normalizeRankedDirectRecommendations(row.recommendationResults?.direct || []),
        blocked: normalizeRankedBlockedRecommendations(row.recommendationResults?.blocked || []),
        composed: normalizeRankedComposedRecommendations(row.recommendationResults?.composed || []),
      },
    }
  },
})

export const writeRankedRecommendationsForUser = internalMutation({
  args: {
    runId: v.string(),
    userId: v.string(),
    profileSnapshotId: v.string(),
    direct: v.array(rankedDirectRecommendationValidator),
    blocked: v.array(rankedBlockedRecommendationValidator),
    composed: v.array(rankedComposedRecommendationValidator),
    noComposedReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_runId', (q) => q.eq('runId', args.runId))
      .first()

    if (!row || row.userId !== args.userId || row.profileSnapshotId !== args.profileSnapshotId) {
      throw new Error('RUN_NOT_FOUND')
    }

    const normalizedDirect = normalizeRankedDirectRecommendations(args.direct)
    const normalizedBlocked = normalizeRankedBlockedRecommendations(args.blocked)
    const normalizedComposed = normalizeRankedComposedRecommendations(args.composed)
    const now = Date.now()

    await ctx.db.patch(row._id, {
      recommendationResults: {
        rankedAt: now,
        rankerVersion: 'mvp-recommendation-ranking-v1',
        noComposedReason: args.noComposedReason?.trim() || undefined,
        direct: normalizedDirect,
        blocked: normalizedBlocked,
        composed: normalizedComposed,
      },
      updatedAt: now,
    })

    return {
      runId: row.runId,
      profileSnapshotId: row.profileSnapshotId,
      rankedAt: now,
      noComposedReason: args.noComposedReason?.trim() || '',
      results: {
        direct: normalizedDirect,
        blocked: normalizedBlocked,
        composed: normalizedComposed,
      },
    }
  },
})

export const startProcessingForUser = internalMutation({
  args: {
    runId: v.string(),
    userId: v.string(),
    mode: v.optional(
      v.union(
        v.literal('standard'),
        v.literal('recoverable-delay'),
        v.literal('mock-completed'),
        v.literal('mock-degraded'),
        v.literal('mock-failed'),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_runId', (q) => q.eq('runId', args.runId))
      .first()

    if (!row || row.userId !== args.userId) {
      throw new Error('RUN_NOT_FOUND')
    }

    const mode: RecommendationProcessingMode = args.mode || 'standard'

    const now = Date.now()
    const targetStatus = resolveTargetStatus(mode, row.status)

    if (!canTransition(row.status, targetStatus)) {
      throw new Error(`INVALID_STATUS_TRANSITION:${row.status}->${targetStatus}`)
    }

    const resumable = inProgressStatuses.has(targetStatus)
    const statusMessage = resolveStatusMessage(mode, targetStatus)

    await ctx.db.patch(row._id, {
      status: targetStatus,
      statusMessage,
      resumable,
      processingStartedAt: row.processingStartedAt || now,
      processingHeartbeatAt: now,
      updatedAt: now,
    })

    return {
      runId: row.runId,
      profileSnapshotId: row.profileSnapshotId,
      refreshedFromRunId: row.refreshedFromRunId,
      previousProfileSnapshotId: row.previousProfileSnapshotId,
      refreshRootRunId: row.refreshRootRunId,
      refreshSequence: row.refreshSequence,
      status: targetStatus,
      statusMessage,
      resumable,
      processingHeartbeatAt: now,
      createdAt: row.createdAt,
      updatedAt: now,
    }
  },
})

export const setTerminalStatusForUser = internalMutation({
  args: {
    runId: v.string(),
    userId: v.string(),
    status: v.union(v.literal('completed'), v.literal('degraded'), v.literal('failed')),
    statusMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_runId', (q) => q.eq('runId', args.runId))
      .first()

    if (!row || row.userId !== args.userId) {
      throw new Error('RUN_NOT_FOUND')
    }

    if (!canTransition(row.status, args.status)) {
      throw new Error(`INVALID_STATUS_TRANSITION:${row.status}->${args.status}`)
    }

    const now = Date.now()
    const statusMessage = args.statusMessage || buildDefaultStatusMessage(args.status)

    await ctx.db.patch(row._id, {
      status: args.status,
      statusMessage,
      resumable: false,
      processingHeartbeatAt: now,
      updatedAt: now,
    })

    return {
      runId: row.runId,
      profileSnapshotId: row.profileSnapshotId,
      refreshedFromRunId: row.refreshedFromRunId,
      previousProfileSnapshotId: row.previousProfileSnapshotId,
      refreshRootRunId: row.refreshRootRunId,
      refreshSequence: row.refreshSequence,
      status: args.status,
      statusMessage,
      resumable: false,
      processingHeartbeatAt: now,
      createdAt: row.createdAt,
      updatedAt: now,
    }
  },
})

export const listForAdmin = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query('recommendation_runs').collect()
    const limit =
      typeof args.limit === 'number' && Number.isFinite(args.limit)
        ? Math.max(1, Math.round(args.limit))
        : null

    rows.sort((left, right) => {
      if (left.createdAt !== right.createdAt) {
        return right.createdAt - left.createdAt
      }

      return right.updatedAt - left.updatedAt
    })

    return rows.slice(0, limit ?? rows.length).map((row) => ({
      runId: row.runId,
      userId: row.userId,
      profileSnapshotId: row.profileSnapshotId,
      refreshedFromRunId: row.refreshedFromRunId,
      previousProfileSnapshotId: row.previousProfileSnapshotId,
      refreshRootRunId: row.refreshRootRunId,
      refreshSequence: row.refreshSequence,
      status: row.status,
      statusMessage: row.statusMessage || buildDefaultStatusMessage(row.status),
      resumable:
        typeof row.resumable === 'boolean' ? row.resumable : inProgressStatuses.has(row.status),
      processingHeartbeatAt: row.processingHeartbeatAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      pathwayEvaluation: row.pathwayEvaluation,
      recommendationResults: row.recommendationResults,
    }))
  },
})

export const readRankedRecommendationsForAdmin = internalQuery({
  args: {
    runId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_runId', (q) => q.eq('runId', args.runId))
      .first()

    if (!row) {
      return null
    }

    return {
      runId: row.runId,
      userId: row.userId,
      profileSnapshotId: row.profileSnapshotId,
      status: row.status,
      statusMessage: row.statusMessage || buildDefaultStatusMessage(row.status),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      rankedAt: row.recommendationResults?.rankedAt ?? null,
      noComposedReason: row.recommendationResults?.noComposedReason ?? '',
      results: {
        direct: row.recommendationResults?.direct || [],
        blocked: row.recommendationResults?.blocked || [],
        composed: row.recommendationResults?.composed || [],
      },
    }
  },
})
