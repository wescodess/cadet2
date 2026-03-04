import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

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
      createdAt: now,
      updatedAt: now,
    })

    return {
      runId: args.runId,
      profileSnapshotId: args.profileSnapshotId,
      status: 'queued' as const,
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
