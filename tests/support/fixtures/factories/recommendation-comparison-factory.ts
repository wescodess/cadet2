// Factory types and builders for recommendation comparison test fixtures.
// See also: server/utils/recommendations/buildRecommendationComparison.ts

export type RecommendationComparisonPathwayType = {
  key: 'available-now' | 'blocked-but-close' | 'strategic-multi-step'
  label: string
  description: string
}

export type RecommendationComparisonGroup = {
  key: 'direct' | 'blocked' | 'composed'
  label: string
  description: string
  count: number
}

export type RecommendationComparisonMetadata = {
  mode: 'workspace' | 'fallback'
  summary: string
  limitation?: string
  groups: RecommendationComparisonGroup[]
  visibleGroupCount: number
  totalCandidateCount: number
}

export type RecommendationComparisonFitSignal = {
  id: string
  label: string
  detail: string
  state: 'strength' | 'watch' | 'gap'
}

export type RecommendationComparisonBlocker = {
  id: string
  label: string
  detail: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export type RecommendationComparisonTradeoff = {
  id: string
  dimension: 'effort' | 'timing' | 'complexity' | 'cost'
  summary: string
  impact: 'high' | 'medium' | 'low'
}

export type RecommendationComparisonAction = {
  id: string
  title: string
  detail: string
  priority: 'now' | 'next' | 'later'
  expectedImpact: string
}

export type RecommendationComparisonCandidate = {
  pathwayId: string
  type: 'direct' | 'blocked' | 'composed'
  rank: number
  tier: 'strong-fit' | 'conditional-fit' | 'lower-confidence'
  score: number
  rationale: string
  fitSignals: RecommendationComparisonFitSignal[]
  qualification: 'supported' | 'low-confidence' | 'withheld'
  confidence: 'high' | 'medium' | 'low' | 'withheld'
  freshness: 'fresh' | 'stale' | 'unknown'
  caveat: string
  blockers: RecommendationComparisonBlocker[]
  tradeoffs: RecommendationComparisonTradeoff[]
  improvementActions: RecommendationComparisonAction[]
  composedSteps?: string[]
  pathwayType: RecommendationComparisonPathwayType
}

export type RecommendationComparisonResultsPayload = {
  direct: RecommendationComparisonCandidate[]
  blocked: RecommendationComparisonCandidate[]
  composed: RecommendationComparisonCandidate[]
  comparison: RecommendationComparisonMetadata
  noComposedReason?: string
}

export type RecommendationComparisonResultsResponse = {
  runId: string
  profileSnapshotId: string
  status: 'completed' | 'degraded' | 'failed'
  results: {
    direct: RecommendationComparisonCandidate[]
    blocked: RecommendationComparisonCandidate[]
    composed: RecommendationComparisonCandidate[]
  }
  comparison: RecommendationComparisonMetadata
  noComposedReason?: string
}



export function createRecommendationComparisonIds(prefix: string) {
  const seed = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  return {
    runId: `${prefix}-run-${seed}`,
    profileSnapshotId: `${prefix}-snapshot-${seed}`,
  }
}

export function createRecommendationComparisonEvaluationPayload() {
  return {
    currentSection: 'goals',
    sectionProgress: {
      personal: true,
      education: true,
      work: true,
      immigration: true,
      goals: true,
    },
    fieldValues: {
      personal: {},
      education: {
        highestEducationLevel: 'bachelors',
      },
      work: {
        yearsSkilledExperience: 3,
        hasValidJobOffer: 'no',
      },
      immigration: {
        openToRelocation: 'yes',
        englishClb: 9,
        availableSettlementFundsCad: 30000,
      },
      goals: {
        targetTimelineMonths: 6,
        budgetCad: 12000,
        willingToStudyOrRetrain: 'yes',
      },
    },
  }
}

export function createRecommendationComparisonFallbackEvaluationPayload() {
  return {
    currentSection: 'goals',
    sectionProgress: {
      personal: true,
      education: true,
      work: true,
      immigration: true,
      goals: true,
    },
    fieldValues: {
      personal: {},
      education: {
        highestEducationLevel: 'high-school',
      },
      work: {
        yearsSkilledExperience: 0,
        hasValidJobOffer: 'no',
      },
      immigration: {
        openToRelocation: 'no',
        englishClb: 4,
        availableSettlementFundsCad: 1500,
      },
      goals: {
        targetTimelineMonths: 3,
        budgetCad: 2000,
        willingToStudyOrRetrain: 'no',
      },
    },
  }
}

export function createRecommendationComparisonCandidate(
  overrides: Partial<RecommendationComparisonCandidate> = {},
): RecommendationComparisonCandidate {
  const candidate: RecommendationComparisonCandidate = {
    pathwayId: 'mvp-skilled-worker',
    type: 'direct',
    rank: 1,
    tier: 'strong-fit',
    score: 88,
    rationale: 'Skilled Worker is ready sooner and still benefits from a small language uplift.',
    fitSignals: [
      {
        id: 'language-readiness',
        label: 'Language readiness',
        detail: 'CLB 9 already clears the current benchmark.',
        state: 'strength',
      },
    ],
    qualification: 'supported',
    confidence: 'high',
    freshness: 'fresh',
    caveat: 'Recheck evidence freshness before final submission.',
    blockers: [],
    tradeoffs: [
      {
        id: 'tradeoff-effort',
        dimension: 'effort',
        summary: 'Requires moderate document assembly and timeline discipline.',
        impact: 'medium',
      },
      {
        id: 'tradeoff-timing',
        dimension: 'timing',
        summary: 'Moves faster than longer-horizon routes if evidence is already prepared.',
        impact: 'low',
      },
      {
        id: 'tradeoff-complexity',
        dimension: 'complexity',
        summary: 'Application logic is comparatively straightforward in the current MVP scope.',
        impact: 'low',
      },
    ],
    improvementActions: [],
    composedSteps: [],
    pathwayType: {
      key: 'available-now',
      label: 'Available now',
      description: 'Current profile evidence supports action in the near term.',
    },
    ...overrides,
  }

  return {
    ...candidate,
    pathwayType: overrides.pathwayType || createRecommendationComparisonPathwayType(candidate.type),
  }
}

export function createRecommendationComparisonPathwayType(
  type: RecommendationComparisonCandidate['type'],
): RecommendationComparisonPathwayType {
  if (type === 'blocked') {
    return {
      key: 'blocked-but-close',
      label: 'Blocked but close',
      description: 'The route is ranked, but one or more concrete blockers still need attention.',
    }
  }

  if (type === 'composed') {
    return {
      key: 'strategic-multi-step',
      label: 'Strategic multi-step',
      description: 'This is a staged route that trades immediate action for a longer-horizon plan.',
    }
  }

  return {
    key: 'available-now',
    label: 'Available now',
    description: 'Current profile evidence supports action in the near term.',
  }
}

export function createRecommendationComparisonMetadata(input: {
  directCount: number
  blockedCount: number
  composedCount: number
  noComposedReason?: string
}): RecommendationComparisonMetadata {
  // Delegate to the canonical server builder to prevent drift between
  // test mocks and production comparison semantics.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { buildRecommendationComparison } = require('../../../../server/utils/recommendations/buildRecommendationComparison') as typeof import('../../../../server/utils/recommendations/buildRecommendationComparison')

  return buildRecommendationComparison(input)
}
