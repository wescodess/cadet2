import type {
  RecommendationCitation,
  RecommendationTrustBoundary,
} from '~/lib/recommendations/citations'

export type RecommendationFitSignal = {
  id: string
  label: string
  detail: string
  state: 'strength' | 'watch' | 'gap'
}

export type RecommendationBlocker = {
  id: string
  label: string
  detail: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export type RecommendationTradeoff = {
  id: string
  dimension: 'effort' | 'timing' | 'complexity' | 'cost'
  summary: string
  impact: 'high' | 'medium' | 'low'
}

export type RecommendationImprovementAction = {
  id: string
  title: string
  detail: string
  priority: 'now' | 'next' | 'later'
  expectedImpact: string
}

export type RecommendationNextStepPlanStep = {
  id: string
  title: string
  detail: string
  priority: 'now' | 'next' | 'later'
  sequence: number
}

export type RecommendationNextStepPlan = {
  summary: string
  steps: RecommendationNextStepPlanStep[]
  limitation: string
}

export type RecommendationPathwayType = {
  key: 'available-now' | 'blocked-but-close' | 'strategic-multi-step'
  label: string
  description: string
}

/**
 * Browser-facing recommendation candidate shape.
 * Must stay in sync with the server contract in
 * server/api/recommendations/runs/[runId]/results.get.ts
 */
export type RecommendationResultsCandidate = {
  pathwayId: string
  type: 'direct' | 'blocked' | 'composed'
  rank: number
  tier: 'strong-fit' | 'conditional-fit' | 'lower-confidence'
  score: number
  rationale: string
  fitSignals: RecommendationFitSignal[]
  composedSteps?: string[]
  qualification: 'supported' | 'low-confidence' | 'withheld'
  confidence: 'high' | 'medium' | 'low' | 'withheld'
  freshness: 'fresh' | 'stale' | 'unknown'
  caveat: string
  blockers: RecommendationBlocker[]
  tradeoffs: RecommendationTradeoff[]
  improvementActions: RecommendationImprovementAction[]
  pathwayType: RecommendationPathwayType
  citations: RecommendationCitation[]
  trustBoundary: RecommendationTrustBoundary
  nextStepPlan: RecommendationNextStepPlan
}

export type RecommendationComparisonGroup = {
  key: 'direct' | 'blocked' | 'composed'
  label: string
  description: string
  count: number
}

export type RecommendationComparison = {
  mode: 'workspace' | 'fallback'
  summary: string
  limitation?: string
  groups: RecommendationComparisonGroup[]
  visibleGroupCount: number
  totalCandidateCount: number
}

export type RecommendationResultsRecord = {
  runId: string
  profileSnapshotId: string
  status: string
  results: {
    direct: RecommendationResultsCandidate[]
    blocked: RecommendationResultsCandidate[]
    composed: RecommendationResultsCandidate[]
  }
  comparison: RecommendationComparison
  noComposedReason?: string
}

const pathwayLabels: Record<string, string> = {
  'mvp-skilled-worker': 'Skilled Worker pathway',
  'mvp-provincial-nominee': 'Provincial Nominee pathway',
  'mvp-study-to-work': 'Study-to-Work pathway',
}

export function normalizePathwayLabel(pathwayId: string) {
  return pathwayLabels[pathwayId] || pathwayId
}
