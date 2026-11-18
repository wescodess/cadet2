import { paginationOptsValidator } from 'convex/server'
import { query } from './_generated/server'
import { requireRagAdmin } from './lib/ragAdmin'

export const listDeletionEvents = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireRagAdmin(ctx)
    return await ctx.db
      .query('rag_source_deletions')
      .withIndex('by_timestamp')
      .order('desc')
      .paginate({
        ...args.paginationOpts,
        numItems: Math.max(1, Math.min(100, args.paginationOpts.numItems)),
      })
  },
})
