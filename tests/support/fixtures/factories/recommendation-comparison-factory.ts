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

export type RecommendationComparisonCitation = {
  citationId: string
  claimText: string
  sourceTitle: string
  sourceUrl: string
  sourceType: 'regulation' | 'policy-bulletin' | 'knowledge-base' | 'assessment-guide'
  excerpt: string
  retrievalDate: string
  freshness: 'fresh' | 'stale' | 'unknown'
}

export type RecommendationComparisonTrustBoundary = 'source-backed' | 'inferred' | 'system-generated'

type RecommendationComparisonInput = {
  directCount: number
  blockedCount: number
  composedCount: number
  noComposedReason?: string
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
  citations: RecommendationComparisonCitation[]
  trustBoundary: RecommendationComparisonTrustBoundary
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
    citations: [{
      citationId: 'citation-skilled-worker-language',
      claimText: 'Language readiness keeps this pathway actionable in the current MVP rules.',
      sourceTitle: 'Express Entry Language Requirements',
      sourceUrl: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/eligibility/federal-skilled-workers.html',
      sourceType: 'regulation',
      excerpt: 'Language results at or above the current benchmark support near-term Skilled Worker pathway action.',
      retrievalDate: '2026-03-01T00:00:00Z',
      freshness: 'fresh',
    }],
    trustBoundary: 'source-backed',
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

function buildComparisonGroups(input: RecommendationComparisonInput): RecommendationComparisonGroup[] {
  return [
    {
      key: 'direct',
      label: 'Available now',
      description: 'Paths you can act on soonest without inventing new prerequisites.',
      count: input.directCount,
    },
    {
      key: 'blocked',
      label: 'Blocked but close',
      description: 'Paths with useful ranking signal that still need explicit fixes first.',
      count: input.blockedCount,
    },
    {
      key: 'composed',
      label: 'Longer-horizon pathways',
      description: 'Strategic routes that rely on staged milestones instead of immediate execution.',
      count: input.composedCount,
    },
  ].filter(group => group.count > 0)
}

function buildFallbackLimitation(
  groups: RecommendationComparisonGroup[],
  totalCandidateCount: number,
  noComposedReason?: string,
) {
  if (totalCandidateCount === 0) {
    return noComposedReason?.trim() || 'No ranked pathways are available for this run yet, so the workspace stays in a structured review state.'
  }

  if (totalCandidateCount === 1) {
    return 'Only one ranked pathway is available for this run, so a full side-by-side comparison would be misleading.'
  }

  const primaryGroup = groups[0]
  if (!primaryGroup) {
    return noComposedReason?.trim() || 'Comparison is limited because this run did not produce multiple pathway buckets.'
  }

  const classLabel = primaryGroup.key === 'direct'
    ? 'available-now'
    : primaryGroup.key === 'blocked'
      ? 'blocked-but-close'
      : 'longer-horizon'

  return `All ${totalCandidateCount} ranked pathways fall into the same category (${classLabel}), so the workspace shifts into a structured review state instead of a side-by-side comparison across route types.`
}

export function createRecommendationComparisonMetadata(input: {
  directCount: number
  blockedCount: number
  composedCount: number
  noComposedReason?: string
}): RecommendationComparisonMetadata {
  const groups = buildComparisonGroups(input)
  const totalCandidateCount = input.directCount + input.blockedCount + input.composedCount
  const visibleGroupCount = groups.length
  const mode = totalCandidateCount > 1 && visibleGroupCount > 1 ? 'workspace' : 'fallback'

  return {
    mode,
    summary: mode === 'workspace'
      ? 'Compare immediate, blocked, and longer-horizon pathways while keeping rank, trust, and next-step context visible.'
      : 'Comparison is limited for this run, so the workspace switches into a structured review state instead of a misleading empty layout.',
    limitation: mode === 'fallback'
      ? buildFallbackLimitation(groups, totalCandidateCount, input.noComposedReason)
      : undefined,
    groups,
    visibleGroupCount,
    totalCandidateCount,
  }
}
