import type {
  RankedBlockedRecommendation,
  RankedComposedRecommendation,
  RankedDirectRecommendation,
} from './rankRecommendationCandidates'

export const recommendationQualificationLevels = ['supported', 'low-confidence', 'withheld'] as const
export const recommendationConfidenceLevels = ['high', 'medium', 'low', 'withheld'] as const
export const recommendationFreshnessLevels = ['fresh', 'stale', 'unknown'] as const

export type RecommendationQualificationLevel = typeof recommendationQualificationLevels[number]
export type RecommendationConfidenceLevel = typeof recommendationConfidenceLevels[number]
export type RecommendationFreshnessLevel = typeof recommendationFreshnessLevels[number]

export type QualifiedRecommendationMetadata = {
  qualification: RecommendationQualificationLevel
  confidence: RecommendationConfidenceLevel
  freshness: RecommendationFreshnessLevel
  caveat: string
}

export type QualifiedDirectRecommendation = RankedDirectRecommendation & QualifiedRecommendationMetadata
export type QualifiedBlockedRecommendation = RankedBlockedRecommendation & QualifiedRecommendationMetadata
export type QualifiedComposedRecommendation = RankedComposedRecommendation & QualifiedRecommendationMetadata

type RankedRecommendation =
  | RankedDirectRecommendation
  | RankedBlockedRecommendation
  | RankedComposedRecommendation

type QualifiedRecommendation =
  | QualifiedDirectRecommendation
  | QualifiedBlockedRecommendation
  | QualifiedComposedRecommendation

type BlockedPathwayOutcome = {
  pathwayId: string
  unmetConditions: string[]
}

export type QualifyWeakRecommendationResultsInput = {
  direct: RankedDirectRecommendation[]
  blocked: RankedBlockedRecommendation[]
  composed: RankedComposedRecommendation[]
  blockedOutcomes?: BlockedPathwayOutcome[]
}

export type QualifyWeakRecommendationResultsResult = {
  terminalStatus: 'completed' | 'degraded' | 'failed'
  terminalStatusMessage: string
  direct: QualifiedDirectRecommendation[]
  blocked: QualifiedBlockedRecommendation[]
  composed: QualifiedComposedRecommendation[]
}

function toBlockedOutcomeIndex(outcomes: BlockedPathwayOutcome[]) {
  return outcomes.reduce((map, outcome) => {
    map.set(outcome.pathwayId, outcome.unmetConditions.length)
    return map
  }, new Map<string, number>())
}

function asLowerConfidence(candidate: RankedRecommendation): QualifiedRecommendationMetadata {
  return {
    qualification: 'low-confidence',
    confidence: 'low',
    freshness: 'stale',
    caveat: `${candidate.pathwayId} is conditionally usable and should be treated as low-confidence guidance.`,
  }
}

function asWithheld(candidate: RankedRecommendation): QualifiedRecommendationMetadata {
  return {
    qualification: 'withheld',
    confidence: 'withheld',
    freshness: 'unknown',
    caveat: `${candidate.pathwayId} is withheld because available evidence is not sufficient for a trustworthy recommendation.`,
  }
}

function qualifyDirect(candidate: RankedDirectRecommendation): QualifiedRecommendationMetadata {
  if (candidate.tier === 'strong-fit' && candidate.score >= 80) {
    return {
      qualification: 'supported',
      confidence: 'high',
      freshness: 'fresh',
      caveat: 'Direct-fit recommendation is supported by current profile and MVP pathway rules.',
    }
  }

  if (candidate.score >= 65) {
    return {
      qualification: 'low-confidence',
      confidence: 'medium',
      freshness: 'stale',
      caveat: 'Direct-fit recommendation is borderline and should be reviewed with caution.',
    }
  }

  return asWithheld(candidate)
}

function qualifyBlocked(
  candidate: RankedBlockedRecommendation,
  blockedOutcomeIndex: Map<string, number>,
): QualifiedRecommendationMetadata {
  const unmetConditionsCount = blockedOutcomeIndex.get(candidate.pathwayId) ?? 0

  if (candidate.score >= 50 && unmetConditionsCount <= 2) {
    return asLowerConfidence(candidate)
  }

  return asWithheld(candidate)
}

function qualifyComposed(candidate: RankedComposedRecommendation): QualifiedRecommendationMetadata {
  if (candidate.score >= 70) {
    return {
      qualification: 'low-confidence',
      confidence: 'medium',
      freshness: 'stale',
      caveat: 'Composed pathway guidance depends on future milestones and should be treated as provisional.',
    }
  }

  return asWithheld(candidate)
}

function terminalFromQualifiedCandidates(candidates: QualifiedRecommendation[]): {
  status: 'completed' | 'degraded' | 'failed'
  message: string
} {
  if (candidates.length === 0) {
    return {
      status: 'failed',
      message: 'Recommendation evaluation could not produce trustworthy recommendations. Please retry later or update your inputs before rerunning.',
    }
  }

  const supportedCount = candidates.filter(candidate => candidate.qualification === 'supported').length
  const lowConfidenceCount = candidates.filter(candidate => candidate.qualification === 'low-confidence').length

  if (supportedCount === candidates.length && supportedCount > 0) {
    return {
      status: 'completed',
      message: 'Recommendation evaluation completed.',
    }
  }

  if (supportedCount > 0 || lowConfidenceCount > 0) {
    return {
      status: 'degraded',
      message: 'Recommendation evaluation completed with low-confidence outputs. Review caveats before acting.',
    }
  }

  return {
    status: 'failed',
    message: 'Recommendation evaluation could not produce trustworthy recommendations. Please retry later or update your inputs before rerunning.',
  }
}

export function qualifyWeakRecommendationResults(
  input: QualifyWeakRecommendationResultsInput,
): QualifyWeakRecommendationResultsResult {
  const blockedOutcomeIndex = toBlockedOutcomeIndex(input.blockedOutcomes || [])

  const direct = input.direct.map(candidate => ({
    ...candidate,
    ...qualifyDirect(candidate),
  }))

  const blocked = input.blocked.map(candidate => ({
    ...candidate,
    ...qualifyBlocked(candidate, blockedOutcomeIndex),
  }))

  const composed = input.composed.map(candidate => ({
    ...candidate,
    ...qualifyComposed(candidate),
  }))

  const terminal = terminalFromQualifiedCandidates([
    ...direct,
    ...blocked,
    ...composed,
  ])

  return {
    terminalStatus: terminal.status,
    terminalStatusMessage: terminal.message,
    direct,
    blocked,
    composed,
  }
}
