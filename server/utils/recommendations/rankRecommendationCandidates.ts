import type { BlockedPathwayOutcome, DirectPathwayOutcome } from '../pathways/evaluateDirectAndBlockedPathways'
import type { ComposedPathwayOutcome } from '../pathways/generateComposedPathways'

export const RECOMMENDATION_TIER_VALUES = ['strong-fit', 'conditional-fit', 'lower-confidence'] as const

export type RecommendationTier = typeof RECOMMENDATION_TIER_VALUES[number]

export type RankedDirectRecommendation = {
  pathwayId: string
  type: 'direct'
  rank: number
  tier: RecommendationTier
  score: number
}

export type RankedBlockedRecommendation = {
  pathwayId: string
  type: 'blocked'
  rank: number
  tier: RecommendationTier
  score: number
}

export type RankedComposedRecommendation = {
  pathwayId: string
  type: 'composed'
  rank: number
  tier: RecommendationTier
  score: number
  composedSteps: string[]
}

type RankedCandidate =
  | RankedDirectRecommendation
  | RankedBlockedRecommendation
  | RankedComposedRecommendation

export type RankRecommendationCandidatesInput = {
  direct: DirectPathwayOutcome[]
  blocked: BlockedPathwayOutcome[]
  composed: ComposedPathwayOutcome[]
}

export type RankRecommendationCandidatesResult = {
  direct: RankedDirectRecommendation[]
  blocked: RankedBlockedRecommendation[]
  composed: RankedComposedRecommendation[]
}

type UnrankedCandidate = {
  pathwayId: string
  type: 'direct' | 'blocked' | 'composed'
  score: number
  composedSteps?: string[]
}

const TYPE_PRIORITY: Record<UnrankedCandidate['type'], number> = {
  direct: 0,
  composed: 1,
  blocked: 2,
}

function scoreDirect(index: number): number {
  return 90 - (index * 3)
}

function scoreBlocked(unmetConditionsCount: number, index: number): number {
  return 58 - (unmetConditionsCount * 6) - (index * 2)
}

function scoreComposed(stepCount: number, index: number): number {
  return 74 - (Math.max(0, stepCount - 1) * 3) - (index * 2)
}

function toTier(score: number): RecommendationTier {
  if (score >= 80) {
    return 'strong-fit'
  }

  if (score >= 60) {
    return 'conditional-fit'
  }

  return 'lower-confidence'
}

function toPositiveScore(score: number) {
  return Math.max(1, Math.round(score))
}

function toRankedCandidates(candidates: UnrankedCandidate[]): RankedCandidate[] {
  const ordered = [...candidates].sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score
    }

    if (TYPE_PRIORITY[left.type] !== TYPE_PRIORITY[right.type]) {
      return TYPE_PRIORITY[left.type] - TYPE_PRIORITY[right.type]
    }

    return left.pathwayId.localeCompare(right.pathwayId)
  })

  return ordered.map((candidate, index) => {
    const score = toPositiveScore(candidate.score)
    const rank = index + 1
    const tier = toTier(score)

    if (candidate.type === 'composed') {
      return {
        pathwayId: candidate.pathwayId,
        type: 'composed' as const,
        rank,
        tier,
        score,
        composedSteps: [...(candidate.composedSteps || [])],
      }
    }

    if (candidate.type === 'blocked') {
      return {
        pathwayId: candidate.pathwayId,
        type: 'blocked' as const,
        rank,
        tier,
        score,
      }
    }

    return {
      pathwayId: candidate.pathwayId,
      type: 'direct' as const,
      rank,
      tier,
      score,
    }
  })
}

export function rankRecommendationCandidates(
  input: RankRecommendationCandidatesInput,
): RankRecommendationCandidatesResult {
  const composedPathwayIds = new Set(input.composed.map(candidate => candidate.pathwayId))

  const directCandidates = input.direct
    .filter(candidate => !composedPathwayIds.has(candidate.pathwayId))
    .sort((left, right) => left.pathwayId.localeCompare(right.pathwayId))
    .map((candidate, index): UnrankedCandidate => ({
      pathwayId: candidate.pathwayId,
      type: 'direct',
      score: scoreDirect(index),
    }))

  const blockedCandidates = input.blocked
    .filter(candidate => !composedPathwayIds.has(candidate.pathwayId))
    .sort((left, right) => left.pathwayId.localeCompare(right.pathwayId))
    .map((candidate, index): UnrankedCandidate => ({
      pathwayId: candidate.pathwayId,
      type: 'blocked',
      score: scoreBlocked(candidate.unmetConditions.length, index),
    }))

  const composedCandidates = input.composed
    .sort((left, right) => left.pathwayId.localeCompare(right.pathwayId))
    .map((candidate, index): UnrankedCandidate => ({
      pathwayId: candidate.pathwayId,
      type: 'composed',
      score: scoreComposed(candidate.composedSteps.length, index),
      composedSteps: [...candidate.composedSteps],
    }))

  const ranked = toRankedCandidates([
    ...directCandidates,
    ...blockedCandidates,
    ...composedCandidates,
  ])

  return {
    direct: ranked
      .filter(candidate => candidate.type === 'direct')
      .sort((left, right) => left.rank - right.rank) as RankedDirectRecommendation[],
    blocked: ranked
      .filter(candidate => candidate.type === 'blocked')
      .sort((left, right) => left.rank - right.rank) as RankedBlockedRecommendation[],
    composed: ranked
      .filter(candidate => candidate.type === 'composed')
      .sort((left, right) => left.rank - right.rank) as RankedComposedRecommendation[],
  }
}
