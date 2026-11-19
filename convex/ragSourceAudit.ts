import { paginationOptsValidator, type IndexRange } from 'convex/server'
import { v } from 'convex/values'
import { query, internalMutation, type QueryCtx } from './_generated/server'
import { requireRagAdmin } from './lib/ragAdmin'
import {
  countKey,
  orderKey,
  requireSourceAuditProjection,
  sourceActionType,
  writeSourceEvent,
} from './lib/sourceAudit'
import type { Doc } from './_generated/dataModel'

const filterValidator = v.object({
  actionType: v.optional(v.string()),
  entityType: v.optional(v.string()),
  actorId: v.optional(v.string()),
  entityId: v.optional(v.string()),
  search: v.optional(v.string()),
  dateFrom: v.optional(v.number()),
  dateTo: v.optional(v.number()),
})
type Filters = {
  actionType?: string
  entityType?: string
  actorId?: string
  entityId?: string
  search?: string
  dateFrom?: number
  dateTo?: number
}

function eventRange(ctx: QueryCtx, filters: Filters, upper?: string, before?: string) {
  const floor = filters.dateFrom === undefined ? undefined : orderKey(filters.dateFrom)
  let ceiling = upper
  if (filters.dateTo !== undefined) {
    const dateCeiling = orderKey(filters.dateTo, '\uffff')
    if (!ceiling || dateCeiling < ceiling) ceiling = dateCeiling
  }
  const exclusive = before !== undefined && (!ceiling || before <= ceiling)
  const high = exclusive ? before : ceiling
  type UpperRange = IndexRange & {
    lt(field: 'orderKey', value: string): IndexRange
    lte(field: 'orderKey', value: string): IndexRange
  }
  const bounds = (
    range: UpperRange & { gte(field: 'orderKey', value: string): UpperRange },
  ): IndexRange => {
    const lower = floor ? range.gte('orderKey', floor) : range
    return high ? (exclusive ? lower.lt('orderKey', high) : lower.lte('orderKey', high)) : lower
  }

  const { entityId, actorId, actionType } = filters
  if (entityId)
    return ctx.db
      .query('rag_audit_events')
      .withIndex('by_entity_order', (q) => bounds(q.eq('entityId', entityId)))
      .order('desc')
  if (actorId)
    return ctx.db
      .query('rag_audit_events')
      .withIndex('by_actor_order', (q) => bounds(q.eq('actorId', actorId)))
      .order('desc')
  if (actionType)
    return ctx.db
      .query('rag_audit_events')
      .withIndex('by_action_order', (q) => bounds(q.eq('actionType', actionType)))
      .order('desc')
  return ctx.db
    .query('rag_audit_events')
    .withIndex('by_orderKey', (q) => bounds(q))
    .order('desc')
}

function matches(row: Doc<'rag_audit_events'>, filters: Filters) {
  if (filters.actionType && row.actionType !== filters.actionType) return false
  if (filters.actorId && row.actorId !== filters.actorId) return false
  if (filters.entityId && row.entityId !== filters.entityId) return false
  const search = filters.search?.toLowerCase()
  return (
    !search ||
    [
      row.eventId,
      row.entityId,
      row.entityLabel,
      row.actorId,
      row.actorEmail ?? '',
      row.reason ?? '',
    ].some((value) => value.toLowerCase().includes(search))
  )
}

export const listEvents = query({
  args: {
    filters: filterValidator,
    limit: v.number(),
    upper: v.optional(v.string()),
    before: v.optional(v.string()),
    includeCount: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRagAdmin(ctx)
    await requireSourceAuditProjection(ctx)
    const filters = args.filters
    if (filters.entityType && filters.entityType !== 'EVIDENCE_SOURCE')
      return { items: [], totalCount: 0, upper: args.upper ?? '' }
    const limit = Math.max(1, Math.min(101, Math.floor(args.limit)))
    let range = eventRange(ctx, filters, args.upper, args.before)
    if (filters.actionType)
      range = range.filter((q) => q.eq(q.field('actionType'), filters.actionType))
    if (filters.actorId) range = range.filter((q) => q.eq(q.field('actorId'), filters.actorId))
    if (filters.entityId) range = range.filter((q) => q.eq(q.field('entityId'), filters.entityId))
    // The row budget applies before filters, including a rare search.
    const page = await range.paginate({
      cursor: null,
      numItems: filters.search ? 512 : limit,
      maximumRowsRead: 512,
      maximumBytesRead: 1048576,
    })
    const items = page.page.filter((row) => matches(row, filters)).slice(0, limit)
    if (!page.isDone && items.length < limit)
      throw new Error('Audit query exceeded its read budget; narrow the filters')
    let totalCount = 0
    if (args.includeCount) {
      if (filters.search || filters.dateFrom !== undefined || filters.dateTo !== undefined) {
        const candidates = await eventRange(ctx, filters).take(2001)
        if (candidates.length > 2000)
          throw new Error('Audit count exceeded its read budget; narrow the filters')
        totalCount = candidates.filter((row) => matches(row, filters)).length
      } else {
        totalCount =
          (
            await ctx.db
              .query('rag_audit_counts')
              .withIndex('by_key', (q) => q.eq('key', countKey(filters)))
              .unique()
          )?.count ?? 0
      }
    }
    return { items, totalCount, upper: args.upper ?? items[0]?.orderKey ?? '' }
  },
})

export const getEvent = query({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    await requireRagAdmin(ctx)
    await requireSourceAuditProjection(ctx)
    const metadata = await ctx.db
      .query('rag_audit_events')
      .withIndex('by_eventId', (q) => q.eq('eventId', args.eventId))
      .unique()
    if (!metadata) return null
    const detail = await ctx.db
      .query('rag_audit_details')
      .withIndex('by_eventId', (q) => q.eq('eventId', args.eventId))
      .unique()
    if (!detail) throw new Error('Audit detail is unavailable')
    return {
      ...metadata,
      changeContext: detail.changeContext,
      stateDigests: detail.stateDigests,
      truncated: detail.truncated,
    }
  },
})

export const getSummary = query({
  args: {},
  handler: async (ctx) => {
    await requireRagAdmin(ctx)
    await requireSourceAuditProjection(ctx)
    const day = Math.floor(Date.now() / 86400000)
    const days = await ctx.db
      .query('rag_audit_counts')
      .withIndex('by_kind_day', (q) =>
        q
          .eq('kind', 'day')
          .gte('day', day - 6)
          .lte('day', day),
      )
      .take(8)
    const actors = await ctx.db
      .query('rag_audit_counts')
      .withIndex('by_kind', (q) => q.eq('kind', 'actor'))
      .take(101)
    if (actors.length > 100) throw new Error('Audit summary exceeded its actor budget')
    const total =
      (
        await ctx.db
          .query('rag_audit_counts')
          .withIndex('by_key', (q) => q.eq('key', countKey({})))
          .unique()
      )?.count ?? 0
    return {
      eventsToday: days.find((row) => row.key === String(day))?.count ?? 0,
      eventsThisWeek: days.reduce((sum, row) => sum + row.count, 0),
      actors: actors.map((row) => ({
        userId: row.key.slice(6),
        email: row.email ?? row.key.slice(6),
        eventCount: row.count,
      })),
      entities: [{ entityType: 'EVIDENCE_SOURCE', eventCount: total }],
    }
  },
})

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
        maximumRowsRead: 100,
        maximumBytesRead: 2097152,
      })
  },
})

export const listApprovalEvents = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireRagAdmin(ctx)
    return await ctx.db
      .query('approval_audit_log')
      .withIndex('by_timestamp')
      .order('desc')
      .paginate({
        ...args.paginationOpts,
        numItems: Math.max(1, Math.min(100, args.paginationOpts.numItems)),
        maximumRowsRead: 100,
        maximumBytesRead: 2097152,
      })
  },
})

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : { value: value ?? null }
}

export const backfillEvents = internalMutation({
  args: {
    table: v.union(v.literal('approval'), v.literal('deletion')),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const size = Math.max(1, Math.min(4, Math.floor(args.batchSize ?? 4)))
    if (args.table === 'approval') {
      const rows = await ctx.db
        .query('approval_audit_log')
        .withIndex('by_projected', (q) => q.eq('projected', undefined))
        .take(size)
      for (const row of rows) {
        if (row.governance)
          await writeSourceEvent(ctx, {
            eventId: `rag-approval:${row._id}`,
            entityId: row.sourceId,
            actorId: row.actorUserId,
            actorEmail: row.actorEmail,
            actionType: sourceActionType(row.action),
            before: row.governance.before === null ? null : record(row.governance.before),
            after: row.governance.after === null ? null : record(row.governance.after),
            reason: row.reason ?? row.note,
            timestamp: row.timestamp,
          })
        await ctx.db.patch(row._id, { projected: true })
      }
      return { done: rows.length < size }
    }
    const rows = await ctx.db
      .query('rag_source_deletions')
      .withIndex('by_projected', (q) => q.eq('projected', undefined))
      .take(size)
    for (const row of rows) {
      await writeSourceEvent(ctx, {
        eventId: `rag-deletion:${row._id}`,
        entityId: row.sourceId,
        actorId: row.actorId,
        actorEmail: row.actorEmail,
        actionType: 'EVIDENCE_SOURCE_DELETED',
        before: record(row.source),
        after: null,
        timestamp: row.timestamp,
      })
      await ctx.db.patch(row._id, { projected: true })
    }
    return { done: rows.length < size }
  },
})
