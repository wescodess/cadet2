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

export const createQueuedRun = mutation({
  args: {
    runId: v.string(),
    userId: v.string(),
    profileSnapshotId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    await ctx.db.insert('recommendation_runs', {
      runId: args.runId,
      userId: args.userId,
      profileSnapshotId: args.profileSnapshotId,
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
      status: row.status,
      statusMessage: row.statusMessage || buildDefaultStatusMessage(row.status),
      resumable: typeof row.resumable === 'boolean' ? row.resumable : inProgressStatuses.has(row.status),
      processingHeartbeatAt: row.processingHeartbeatAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
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
    status: canonicalStatusValidator,
    statusMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    await ctx.db.insert('recommendation_runs', {
      userId: args.userId,
      runId: args.runId,
      profileSnapshotId: args.profileSnapshotId,
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
      status: row.status,
      statusMessage: row.statusMessage,
      resumable: row.resumable,
      processingHeartbeatAt: row.processingHeartbeatAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))
  },
})
