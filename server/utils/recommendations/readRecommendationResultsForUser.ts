import { anyApi } from 'convex/server'

import {
  buildRecommendationComparison,
  buildRecommendationPathwayType,
  type RecommendationComparison,
  type RecommendationPathwayType,
} from './buildRecommendationComparison'
import { buildRecommendationCitations } from './buildRecommendationCitations'
import {
  buildRecommendationNextStepPlan,
  type RecommendationNextStepPlan,
} from './buildRecommendationNextStepPlan'
import { classifyTrustBoundary, type RecommendationTrustBoundary } from './classifyTrustBoundary'
import { createConvexAdminClient } from '../convex-admin-client'

type RecommendationResultTier = 'strong-fit' | 'conditional-fit' | 'lower-confidence'
type RecommendationQualification = 'supported' | 'low-confidence' | 'withheld'
type RecommendationConfidence = 'high' | 'medium' | 'low' | 'withheld'
type RecommendationFreshness = 'fresh' | 'stale' | 'unknown'
type RecommendationCitationSourceType = 'regulation' | 'policy-bulletin' | 'knowledge-base' | 'assessment-guide'
type RecommendationFitSignalState = 'strength' | 'watch' | 'gap'

type RecommendationSourceContext = {
  excerpt: string
  retrievalDate: string
  freshness: RecommendationFreshness
  sourceTitle: string
  sourceType: RecommendationCitationSourceType
  sourceUrl: string
}

type RecommendationCitation = RecommendationSourceContext & {
  citationId: string
  claimText: string
}

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
  priority: 'now' | 'next' | 'later'
  expectedImpact: string
}

export type RecommendationResultsCandidate = {
  pathwayId: string
  type: 'direct' | 'blocked' | 'composed'
  rank: number
  tier: RecommendationResultTier
  score: number
  rationale: string
  fitSignals: RecommendationFitSignal[]
  composedSteps?: string[]
  qualification: RecommendationQualification
  confidence: RecommendationConfidence
  freshness: RecommendationFreshness
  caveat: string
  blockers: RecommendationBlocker[]
  tradeoffs: RecommendationTradeoff[]
  improvementActions: RecommendationImprovementAction[]
  citations: RecommendationCitation[]
  trustBoundary: RecommendationTrustBoundary
  nextStepPlan: RecommendationNextStepPlan
  pathwayType: RecommendationPathwayType
}

export type RecommendationResultsRecord = {
  runId: string
  profileSnapshotId: string
  status: 'queued' | 'evaluating' | 'completed' | 'degraded' | 'failed'
  results: {
    direct: RecommendationResultsCandidate[]
    blocked: RecommendationResultsCandidate[]
    composed: RecommendationResultsCandidate[]
  }
  comparison: RecommendationComparison
  noComposedReason?: string
}

type RecommendationResultsQueryRecord = {
  runId: string
  profileSnapshotId: string
  status: 'queued' | 'evaluating' | 'completed' | 'degraded' | 'failed'
  rankedAt: number | null
  noComposedReason: string
  results: {
    direct: Array<{
      pathwayId: string
      type: 'direct'
      rank: number
      tier: RecommendationResultTier
      score: number
      rationale: string
      fitSignals: RecommendationFitSignal[]
      qualification: RecommendationQualification
      confidence: RecommendationConfidence
      freshness: RecommendationFreshness
      caveat: string
      blockers?: unknown
      tradeoffs?: unknown
      improvementActions?: unknown
      citations?: unknown
      trustBoundary?: RecommendationTrustBoundary
    }>
    blocked: Array<{
      pathwayId: string
      type: 'blocked'
      rank: number
      tier: RecommendationResultTier
      score: number
      rationale: string
      fitSignals: RecommendationFitSignal[]
      qualification: RecommendationQualification
      confidence: RecommendationConfidence
      freshness: RecommendationFreshness
      caveat: string
      blockers?: unknown
      tradeoffs?: unknown
      improvementActions?: unknown
      citations?: unknown
      trustBoundary?: RecommendationTrustBoundary
    }>
    composed: Array<{
      pathwayId: string
      type: 'composed'
      rank: number
      tier: RecommendationResultTier
      score: number
      composedSteps?: unknown
      rationale: string
      fitSignals: RecommendationFitSignal[]
      qualification: RecommendationQualification
      confidence: RecommendationConfidence
      freshness: RecommendationFreshness
      caveat: string
      blockers?: unknown
      tradeoffs?: unknown
      improvementActions?: unknown
      citations?: unknown
      trustBoundary?: RecommendationTrustBoundary
    }>
  }
} | null

export type RecommendationResultsLookup =
  | {
      state: 'missing'
    }
  | {
      state: 'not-ready'
      runId: string
      profileSnapshotId: string
      status: 'queued' | 'evaluating' | 'completed' | 'degraded' | 'failed'
    }
  | {
      state: 'ready'
      hasRankedPayload: boolean
      record: RecommendationResultsRecord
    }

function sortByRank<T extends { rank: number }>(candidates: T[]) {
  return [...candidates].sort((left, right) => left.rank - right.rank)
}

function normalizeBlockers(value: unknown): RecommendationBlocker[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is RecommendationBlocker => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map(entry => ({
      id: entry.id,
      label: entry.label,
      detail: entry.detail,
      severity: entry.severity,
    }))
}

function normalizeTradeoffs(value: unknown): RecommendationTradeoff[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is RecommendationTradeoff => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map(entry => ({
      id: entry.id,
      dimension: entry.dimension,
      summary: entry.summary,
      impact: entry.impact,
    }))
}

function normalizeImprovementActions(value: unknown): RecommendationImprovementAction[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is RecommendationImprovementAction => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map(entry => ({
      id: entry.id,
      title: entry.title,
      detail: entry.detail,
      priority: entry.priority,
      expectedImpact: entry.expectedImpact,
    }))
}

function normalizeComposedSteps(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((step): step is string => typeof step === 'string' && step.trim().length > 0)
}

function normalizeCitations(value: unknown): RecommendationCitation[] {
  if (!Array.isArray(value)) {
    return []
  }

  const assembled = buildRecommendationCitations(value)
  if (assembled.length > 0) {
    return assembled
  }

  return value
    .filter((entry): entry is RecommendationCitation =>
      Boolean(entry)
      && typeof entry === 'object'
      && !Array.isArray(entry)
      && typeof (entry as Record<string, unknown>).citationId === 'string'
      && typeof (entry as Record<string, unknown>).claimText === 'string'
      && typeof (entry as Record<string, unknown>).sourceUrl === 'string'
      && (entry as Record<string, unknown>).citationId !== ''
      && (entry as Record<string, unknown>).claimText !== ''
      && (entry as Record<string, unknown>).sourceUrl !== '',
    )
    .map(entry => ({
      citationId: entry.citationId,
      claimText: entry.claimText,
      sourceTitle: entry.sourceTitle,
      sourceUrl: entry.sourceUrl,
      sourceType: entry.sourceType,
      excerpt: entry.excerpt,
      retrievalDate: entry.retrievalDate,
      freshness: entry.freshness,
    }))
}

function createEmptyComparison(noComposedReason: string) {
  return buildRecommendationComparison({
    directCount: 0,
    blockedCount: 0,
    composedCount: 0,
    noComposedReason,
  })
}

function normalizeRecommendationResultsRecord(
  record: Exclude<RecommendationResultsQueryRecord, null>,
): RecommendationResultsRecord {
  if (!record.rankedAt && record.status === 'failed') {
    const noComposedReason = 'Recommendation evaluation is temporarily unavailable. Please retry later or update your inputs before rerunning.'

    return {
      runId: record.runId,
      profileSnapshotId: record.profileSnapshotId,
      status: record.status,
      results: {
        direct: [],
        blocked: [],
        composed: [],
      },
      comparison: createEmptyComparison(noComposedReason),
      noComposedReason,
    }
  }

  const direct = sortByRank(record.results.direct)
    .map((candidate) => {
      const blockers = normalizeBlockers(candidate.blockers)
      const tradeoffs = normalizeTradeoffs(candidate.tradeoffs)
      const improvementActions = normalizeImprovementActions(candidate.improvementActions)
      const citations = normalizeCitations(candidate.citations)
      const trustBoundary = candidate.trustBoundary ?? classifyTrustBoundary({
        citations,
        confidence: candidate.confidence,
        qualification: candidate.qualification,
      })

      return {
        pathwayId: candidate.pathwayId,
        type: 'direct' as const,
        rank: candidate.rank,
        tier: candidate.tier,
        score: candidate.score,
        rationale: candidate.rationale,
        fitSignals: candidate.fitSignals,
        qualification: candidate.qualification,
        confidence: candidate.confidence,
        freshness: candidate.freshness,
        caveat: candidate.caveat,
        blockers,
        tradeoffs,
        improvementActions,
        citations,
        trustBoundary,
        nextStepPlan: buildRecommendationNextStepPlan({
          pathwayId: candidate.pathwayId,
          type: 'direct',
          qualification: candidate.qualification,
          confidence: candidate.confidence,
          freshness: candidate.freshness,
          caveat: candidate.caveat,
          blockers,
          tradeoffs,
          improvementActions,
          trustBoundary,
        }),
        pathwayType: buildRecommendationPathwayType('direct'),
      }
    })

  const blocked = sortByRank(record.results.blocked)
    .map((candidate) => {
      const blockers = normalizeBlockers(candidate.blockers)
      const tradeoffs = normalizeTradeoffs(candidate.tradeoffs)
      const improvementActions = normalizeImprovementActions(candidate.improvementActions)
      const citations = normalizeCitations(candidate.citations)
      const trustBoundary = candidate.trustBoundary ?? classifyTrustBoundary({
        citations,
        confidence: candidate.confidence,
        qualification: candidate.qualification,
      })

      return {
        pathwayId: candidate.pathwayId,
        type: 'blocked' as const,
        rank: candidate.rank,
        tier: candidate.tier,
        score: candidate.score,
        rationale: candidate.rationale,
        fitSignals: candidate.fitSignals,
        qualification: candidate.qualification,
        confidence: candidate.confidence,
        freshness: candidate.freshness,
        caveat: candidate.caveat,
        blockers,
        tradeoffs,
        improvementActions,
        citations,
        trustBoundary,
        nextStepPlan: buildRecommendationNextStepPlan({
          pathwayId: candidate.pathwayId,
          type: 'blocked',
          qualification: candidate.qualification,
          confidence: candidate.confidence,
          freshness: candidate.freshness,
          caveat: candidate.caveat,
          blockers,
          tradeoffs,
          improvementActions,
          trustBoundary,
        }),
        pathwayType: buildRecommendationPathwayType('blocked'),
      }
    })

  const composed = sortByRank(record.results.composed)
    .map((candidate) => {
      const blockers = normalizeBlockers(candidate.blockers)
      const tradeoffs = normalizeTradeoffs(candidate.tradeoffs)
      const improvementActions = normalizeImprovementActions(candidate.improvementActions)
      const composedSteps = normalizeComposedSteps(candidate.composedSteps)
      const citations = normalizeCitations(candidate.citations)
      const trustBoundary = candidate.trustBoundary ?? classifyTrustBoundary({
        citations,
        confidence: candidate.confidence,
        qualification: candidate.qualification,
      })

      return {
        pathwayId: candidate.pathwayId,
        type: 'composed' as const,
        rank: candidate.rank,
        tier: candidate.tier,
        score: candidate.score,
        composedSteps,
        rationale: candidate.rationale,
        fitSignals: candidate.fitSignals,
        qualification: candidate.qualification,
        confidence: candidate.confidence,
        freshness: candidate.freshness,
        caveat: candidate.caveat,
        blockers,
        tradeoffs,
        improvementActions,
        citations,
        trustBoundary,
        nextStepPlan: buildRecommendationNextStepPlan({
          pathwayId: candidate.pathwayId,
          type: 'composed',
          qualification: candidate.qualification,
          confidence: candidate.confidence,
          freshness: candidate.freshness,
          caveat: candidate.caveat,
          blockers,
          tradeoffs,
          improvementActions,
          composedSteps,
          trustBoundary,
        }),
        pathwayType: buildRecommendationPathwayType('composed'),
      }
    })

  return {
    runId: record.runId,
    profileSnapshotId: record.profileSnapshotId,
    status: record.status,
    results: {
      direct,
      blocked,
      composed,
    },
    comparison: buildRecommendationComparison({
      directCount: direct.length,
      blockedCount: blocked.length,
      composedCount: composed.length,
      noComposedReason: record.noComposedReason,
    }),
    noComposedReason: record.noComposedReason,
  }
}

export async function readRecommendationResultsForUser(input: {
  userId: string
  runId: string
}) : Promise<RecommendationResultsLookup> {
  const convex = await createConvexAdminClient()
  const record = await convex.query(
    (anyApi as any).recommendationRuns.readRankedRecommendationsForUser,
    {
      runId: input.runId,
      userId: input.userId,
    },
  ) as RecommendationResultsQueryRecord

  if (!record) {
    return {
      state: 'missing',
    }
  }

  if (!record.rankedAt && record.status !== 'failed') {
    return {
      state: 'not-ready',
      runId: record.runId,
      profileSnapshotId: record.profileSnapshotId,
      status: record.status,
    }
  }

  return {
    state: 'ready',
    hasRankedPayload: Boolean(record.rankedAt),
    record: normalizeRecommendationResultsRecord(record),
  }
}
