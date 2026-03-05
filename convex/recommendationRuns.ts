import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

const canonicalStatusValidator = v.union(
  v.literal('queued'),
  v.literal('evaluating'),
  v.literal('completed'),
  v.literal('degraded'),
  v.literal('failed'),
)

type RecommendationLifecycleStatus = 'queued' | 'evaluating' | 'completed' | 'degraded' | 'failed'
type RecommendationProcessingMode = 'standard' | 'recoverable-delay' | 'mock-completed' | 'mock-degraded' | 'mock-failed'
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
type RankedDirectRecommendation = {
  pathwayId: string
  type: 'direct'
  rank: number
  tier: RecommendationTier
  score: number
  qualification?: RecommendationQualification
  confidence?: RecommendationConfidence
  freshness?: RecommendationFreshness
  caveat?: string
}
type RankedBlockedRecommendation = {
  pathwayId: string
  type: 'blocked'
  rank: number
  tier: RecommendationTier
  score: number
  qualification?: RecommendationQualification
  confidence?: RecommendationConfidence
  freshness?: RecommendationFreshness
  caveat?: string
}
type RankedComposedRecommendation = {
  pathwayId: string
  type: 'composed'
  rank: number
  tier: RecommendationTier
  score: number
  composedSteps: string[]
  qualification?: RecommendationQualification
  confidence?: RecommendationConfidence
  freshness?: RecommendationFreshness
  caveat?: string
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

const rankedDirectRecommendationValidator = v.object({
  pathwayId: v.string(),
  type: v.literal('direct'),
  rank: v.number(),
  tier: recommendationTierValidator,
  score: v.number(),
  qualification: v.optional(recommendationQualificationValidator),
  confidence: v.optional(recommendationConfidenceValidator),
  freshness: v.optional(recommendationFreshnessValidator),
  caveat: v.optional(v.string()),
})

const rankedBlockedRecommendationValidator = v.object({
  pathwayId: v.string(),
  type: v.literal('blocked'),
  rank: v.number(),
  tier: recommendationTierValidator,
  score: v.number(),
  qualification: v.optional(recommendationQualificationValidator),
  confidence: v.optional(recommendationConfidenceValidator),
  freshness: v.optional(recommendationFreshnessValidator),
  caveat: v.optional(v.string()),
})

const rankedComposedRecommendationValidator = v.object({
  pathwayId: v.string(),
  type: v.literal('composed'),
  rank: v.number(),
  tier: recommendationTierValidator,
  score: v.number(),
  composedSteps: v.array(v.string()),
  qualification: v.optional(recommendationQualificationValidator),
  confidence: v.optional(recommendationConfidenceValidator),
  freshness: v.optional(recommendationFreshnessValidator),
  caveat: v.optional(v.string()),
})

const inProgressStatuses = new Set<RecommendationLifecycleStatus>(['queued', 'evaluating'])

const allowedTransitions: Record<RecommendationLifecycleStatus, Set<RecommendationLifecycleStatus>> = {
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

function resolveStatusMessage(mode: RecommendationProcessingMode, status: RecommendationLifecycleStatus) {
  if (mode === 'recoverable-delay') {
    return 'Processing is active and resumable while internal services catch up.'
  }

  return buildDefaultStatusMessage(status)
}

function normalizeDirectOutcomes(outcomes: DirectPathwayOutcome[]) {
  return Array.from(new Set(outcomes.map(outcome => outcome.pathwayId)))
    .sort((left, right) => left.localeCompare(right))
    .map(pathwayId => ({
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

function dedupeAndSortRankedCandidates<T extends {
  pathwayId: string
  rank: number
  score: number
}>(candidates: T[]) {
  const byPathway = new Map<string, T>()

  for (const candidate of candidates) {
    const current = byPathway.get(candidate.pathwayId)
    if (!current || candidate.rank < current.rank || (candidate.rank === current.rank && candidate.score > current.score)) {
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

function normalizeQualification(value: unknown, fallback: RecommendationQualification): RecommendationQualification {
  if (value === 'supported' || value === 'low-confidence' || value === 'withheld') {
    return value
  }

  return fallback
}

function normalizeConfidence(value: unknown, fallback: RecommendationConfidence): RecommendationConfidence {
  if (value === 'high' || value === 'medium' || value === 'low' || value === 'withheld') {
    return value
  }

  return fallback
}

function normalizeFreshness(value: unknown, fallback: RecommendationFreshness): RecommendationFreshness {
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

function normalizeRankedDirectRecommendations(candidates: RankedDirectRecommendation[]) {
  return dedupeAndSortRankedCandidates(candidates).map(candidate => ({
    pathwayId: candidate.pathwayId,
    type: 'direct' as const,
    rank: Math.max(1, Math.round(candidate.rank)),
    tier: candidate.tier,
    score: Math.max(1, Math.round(candidate.score)),
    qualification: normalizeQualification(candidate.qualification, 'low-confidence'),
    confidence: normalizeConfidence(candidate.confidence, 'low'),
    freshness: normalizeFreshness(candidate.freshness, 'unknown'),
    caveat: normalizeCaveat(candidate.caveat, 'Qualification metadata is unavailable for this recommendation. Treat as low-confidence guidance and rerun for updated evidence.'),
  }))
}

function normalizeRankedBlockedRecommendations(candidates: RankedBlockedRecommendation[]) {
  return dedupeAndSortRankedCandidates(candidates).map(candidate => ({
    pathwayId: candidate.pathwayId,
    type: 'blocked' as const,
    rank: Math.max(1, Math.round(candidate.rank)),
    tier: candidate.tier,
    score: Math.max(1, Math.round(candidate.score)),
    qualification: normalizeQualification(candidate.qualification, 'low-confidence'),
    confidence: normalizeConfidence(candidate.confidence, 'low'),
    freshness: normalizeFreshness(candidate.freshness, 'unknown'),
    caveat: normalizeCaveat(candidate.caveat, `${candidate.pathwayId} is conditionally usable and should be treated as low-confidence guidance until refreshed evidence is available.`),
  }))
}

function normalizeRankedComposedRecommendations(candidates: RankedComposedRecommendation[]) {
  return dedupeAndSortRankedCandidates(candidates).map(candidate => ({
    pathwayId: candidate.pathwayId,
    type: 'composed' as const,
    rank: Math.max(1, Math.round(candidate.rank)),
    tier: candidate.tier,
    score: Math.max(1, Math.round(candidate.score)),
    composedSteps: Array.from(new Set(candidate.composedSteps
      .map(step => step.trim())
      .filter(step => step.length > 0))),
    qualification: normalizeQualification(candidate.qualification, 'low-confidence'),
    confidence: normalizeConfidence(candidate.confidence, 'low'),
    freshness: normalizeFreshness(candidate.freshness, 'unknown'),
    caveat: normalizeCaveat(candidate.caveat, 'Composed pathway guidance is provisional and should be treated as low-confidence until refreshed evidence is available.'),
  }))
}

export const createQueuedRun = mutation({
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

export const listForUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_userId_createdAt', q => q.eq('userId', args.userId))
      .order('desc')
      .collect()

    return rows.map(row => ({
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

export const readStatusForUser = query({
  args: {
    runId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_runId', q => q.eq('runId', args.runId))
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
      resumable: typeof row.resumable === 'boolean' ? row.resumable : inProgressStatuses.has(row.status),
      processingHeartbeatAt: row.processingHeartbeatAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  },
})

export const readPathwayEvaluationForUser = query({
  args: {
    runId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_runId', q => q.eq('runId', args.runId))
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

export const writePathwayEvaluationForUser = mutation({
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
      .withIndex('by_runId', q => q.eq('runId', args.runId))
      .first()

    if (!row || row.userId !== args.userId || row.profileSnapshotId !== args.profileSnapshotId) {
      throw new Error('RUN_NOT_FOUND')
    }

    const normalizedDirect = normalizeDirectOutcomes(args.direct)
    const normalizedBlocked = normalizeBlockedOutcomes(args.blocked)
    const existingDirect = normalizeDirectOutcomes((row.pathwayEvaluation?.direct || []) as DirectPathwayOutcome[])
    const existingBlocked = normalizeBlockedOutcomes((row.pathwayEvaluation?.blocked || []) as BlockedPathwayOutcome[])

    if (
      row.pathwayEvaluation
      && directOutcomesEqual(existingDirect, normalizedDirect)
      && blockedOutcomesEqual(existingBlocked, normalizedBlocked)
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

export const readRankedRecommendationsForUser = query({
  args: {
    runId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_runId', q => q.eq('runId', args.runId))
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

export const writeRankedRecommendationsForUser = mutation({
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
      .withIndex('by_runId', q => q.eq('runId', args.runId))
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

export const startProcessingForUser = mutation({
  args: {
    runId: v.string(),
    userId: v.string(),
    mode: v.optional(v.union(
      v.literal('standard'),
      v.literal('recoverable-delay'),
      v.literal('mock-completed'),
      v.literal('mock-degraded'),
      v.literal('mock-failed'),
    )),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_runId', q => q.eq('runId', args.runId))
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

export const setTerminalStatusForUser = mutation({
  args: {
    runId: v.string(),
    userId: v.string(),
    status: v.union(v.literal('completed'), v.literal('degraded'), v.literal('failed')),
    statusMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_runId', q => q.eq('runId', args.runId))
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

export const seedRunForUser = mutation({
  args: {
    userId: v.string(),
    runId: v.string(),
    profileSnapshotId: v.string(),
    refreshedFromRunId: v.optional(v.string()),
    previousProfileSnapshotId: v.optional(v.string()),
    refreshRootRunId: v.optional(v.string()),
    refreshSequence: v.optional(v.number()),
    status: canonicalStatusValidator,
    statusMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    await ctx.db.insert('recommendation_runs', {
      userId: args.userId,
      runId: args.runId,
      profileSnapshotId: args.profileSnapshotId,
      refreshedFromRunId: args.refreshedFromRunId,
      previousProfileSnapshotId: args.previousProfileSnapshotId,
      refreshRootRunId: args.refreshRootRunId,
      refreshSequence: args.refreshSequence,
      status: args.status,
      statusMessage: args.statusMessage || buildDefaultStatusMessage(args.status),
      resumable: inProgressStatuses.has(args.status),
      processingStartedAt: now,
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
      status: args.status,
      statusMessage: args.statusMessage || buildDefaultStatusMessage(args.status),
      resumable: inProgressStatuses.has(args.status),
      processingHeartbeatAt: now,
      createdAt: now,
      updatedAt: now,
    }
  },
})

export const resetRunsForUser = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_userId', q => q.eq('userId', args.userId))
      .collect()

    await Promise.all(rows.map(row => ctx.db.delete(row._id)))

    return {
      deletedCount: rows.length,
    }
  },
})

export const listRunsForUserTesting = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('recommendation_runs')
      .withIndex('by_userId_createdAt', q => q.eq('userId', args.userId))
      .order('desc')
      .collect()

    return rows.map(row => ({
      runId: row.runId,
      profileSnapshotId: row.profileSnapshotId,
      refreshedFromRunId: row.refreshedFromRunId,
      previousProfileSnapshotId: row.previousProfileSnapshotId,
      refreshRootRunId: row.refreshRootRunId,
      refreshSequence: row.refreshSequence,
      status: row.status,
      statusMessage: row.statusMessage,
      resumable: row.resumable,
      processingHeartbeatAt: row.processingHeartbeatAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))
  },
})
