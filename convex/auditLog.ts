import { v } from 'convex/values'

import { mutation, query } from './_generated/server'

const auditActionTypeValidator = v.union(
  v.literal('PATHWAY_CREATED'),
  v.literal('PATHWAY_UPDATED'),
  v.literal('PATHWAY_STATUS_CHANGED'),
  v.literal('PATHWAY_RULE_CREATED'),
  v.literal('PATHWAY_RULE_UPDATED'),
  v.literal('PATHWAY_RULE_DELETED'),
  v.literal('EVIDENCE_SOURCE_CREATED'),
  v.literal('EVIDENCE_SOURCE_UPDATED'),
  v.literal('EVIDENCE_SOURCE_PAUSED'),
  v.literal('EVIDENCE_SOURCE_RESUMED'),
  v.literal('EVIDENCE_SOURCE_APPROVED'),
  v.literal('EVIDENCE_SOURCE_REJECTED'),
  v.literal('EVIDENCE_SOURCE_DELETED'),
  v.literal('RECOMMENDATION_FLAGGED'),
  v.literal('RECOMMENDATION_DISMISSED'),
  v.literal('RECOMMENDATION_RESOLVED'),
  v.literal('GOVERNANCE_SETTING_CHANGED'),
)

const auditEntityTypeValidator = v.union(
  v.literal('PATHWAY'),
  v.literal('PATHWAY_RULE'),
  v.literal('EVIDENCE_SOURCE'),
  v.literal('RECOMMENDATION_RUN'),
  v.literal('GOVERNANCE_SETTING'),
)

const auditChangeContextValidator = v.object({
  before: v.union(v.null(), v.any()),
  after: v.union(v.null(), v.any()),
})

function toSafeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function toLowerText(value: unknown) {
  return toSafeString(value).toLowerCase()
}

function parseCursor(value?: string) {
  const parsed = Number.parseInt(toSafeString(value), 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function clampPageSize(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 25
  }

  return Math.max(1, Math.min(100, Math.round(value)))
}

export const recordAuditEvent = mutation({
  args: {
    actorId: v.string(),
    actorEmail: v.optional(v.string()),
    actorRole: v.optional(v.string()),
    actionType: auditActionTypeValidator,
    entityType: auditEntityTypeValidator,
    entityId: v.string(),
    entityLabel: v.string(),
    changeContext: auditChangeContextValidator,
    reason: v.optional(v.string()),
    timestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert('auditLog', {
      actorId: toSafeString(args.actorId),
      actorEmail: toSafeString(args.actorEmail) || undefined,
      actorRole: toSafeString(args.actorRole) || undefined,
      actionType: args.actionType,
      entityType: args.entityType,
      entityId: toSafeString(args.entityId),
      entityLabel: toSafeString(args.entityLabel),
      changeContext: args.changeContext,
      reason: toSafeString(args.reason) || undefined,
      timestamp: typeof args.timestamp === 'number' && Number.isFinite(args.timestamp)
        ? Math.round(args.timestamp)
        : Date.now(),
    })

    return {
      ok: true,
      eventId,
    }
  },
})

export const listAuditEvents = query({
  args: {
    actionType: v.optional(auditActionTypeValidator),
    entityType: v.optional(auditEntityTypeValidator),
    actorId: v.optional(v.string()),
    entityId: v.optional(v.string()),
    search: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    cursor: v.optional(v.string()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // TODO(perf): If this scaffolding becomes the active backend, replace .collect()
    // with indexed queries to avoid loading all rows into memory at scale.
    let rows = await ctx.db.query('auditLog').collect()

    if (args.actionType) {
      rows = rows.filter(row => row.actionType === args.actionType)
    }

    if (args.entityType) {
      rows = rows.filter(row => row.entityType === args.entityType)
    }

    if (args.actorId) {
      const actorId = toSafeString(args.actorId)
      rows = rows.filter(row => row.actorId === actorId)
    }

    if (args.entityId) {
      const entityId = toSafeString(args.entityId)
      rows = rows.filter(row => row.entityId === entityId)
    }

    if (typeof args.dateFrom === 'number' && Number.isFinite(args.dateFrom)) {
      rows = rows.filter(row => row.timestamp >= args.dateFrom!)
    }

    if (typeof args.dateTo === 'number' && Number.isFinite(args.dateTo)) {
      rows = rows.filter(row => row.timestamp <= args.dateTo!)
    }

    const search = toLowerText(args.search)
    if (search) {
      rows = rows.filter((row) => {
        const haystack = [
          row.entityId,
          row.entityLabel,
          row.actorId,
          row.actorEmail,
          row.reason,
        ]
          .map(toLowerText)
          .join(' ')

        return haystack.includes(search)
      })
    }

    rows.sort((left, right) => {
      if (left.timestamp !== right.timestamp) {
        return right.timestamp - left.timestamp
      }

      return String(right._id).localeCompare(String(left._id))
    })

    const totalCount = rows.length
    const offset = parseCursor(args.cursor)
    const pageSize = clampPageSize(args.pageSize)
    const items = rows.slice(offset, offset + pageSize)
    const nextCursor = offset + pageSize < totalCount ? String(offset + pageSize) : null

    return {
      items: items.map(row => ({
        eventId: String(row._id),
        actorId: row.actorId,
        actorEmail: row.actorEmail,
        actorRole: row.actorRole,
        actionType: row.actionType,
        entityType: row.entityType,
        entityId: row.entityId,
        entityLabel: row.entityLabel,
        changeContext: row.changeContext,
        reason: row.reason,
        timestamp: row.timestamp,
      })),
      totalCount,
      nextCursor,
    }
  },
})

export const getAuditEvent = query({
  args: {
    eventId: v.string(),
  },
  handler: async (ctx, args) => {
    const eventId = toSafeString(args.eventId)
    if (!eventId) {
      return null
    }

    const rows = await ctx.db.query('auditLog').collect()
    const row = rows.find(item => String(item._id) === eventId)

    if (!row) {
      return null
    }

    return {
      eventId: String(row._id),
      actorId: row.actorId,
      actorEmail: row.actorEmail,
      actorRole: row.actorRole,
      actionType: row.actionType,
      entityType: row.entityType,
      entityId: row.entityId,
      entityLabel: row.entityLabel,
      changeContext: row.changeContext,
      reason: row.reason,
      timestamp: row.timestamp,
    }
  },
})

export const getAuditSummary = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('auditLog').collect()
    const now = Date.now()
    const todayFloor = now - (24 * 60 * 60 * 1000)
    const weekFloor = now - (7 * 24 * 60 * 60 * 1000)
    const actorCounts = new Map<string, { userId: string, email: string, eventCount: number }>()
    const entityCounts = new Map<string, number>()

    for (const row of rows) {
      if (row.actorId) {
        const current = actorCounts.get(row.actorId) || {
          userId: row.actorId,
          email: row.actorEmail || row.actorId,
          eventCount: 0,
        }
        current.eventCount += 1
        if (!current.email && row.actorEmail) {
          current.email = row.actorEmail
        }
        actorCounts.set(row.actorId, current)
      }

      entityCounts.set(row.entityType, (entityCounts.get(row.entityType) || 0) + 1)
    }

    const mostActiveActor = [...actorCounts.values()]
      .sort((left, right) => {
        if (left.eventCount !== right.eventCount) {
          return right.eventCount - left.eventCount
        }

        return left.userId.localeCompare(right.userId)
      })[0] || null

    const mostChangedEntityType = ([...entityCounts.entries()]
      .sort((left, right) => {
        if (left[1] !== right[1]) {
          return right[1] - left[1]
        }

        return left[0].localeCompare(right[0])
      })[0]?.[0] || 'GOVERNANCE_SETTING') as 'PATHWAY' | 'PATHWAY_RULE' | 'EVIDENCE_SOURCE' | 'RECOMMENDATION_RUN' | 'GOVERNANCE_SETTING'

    return {
      eventsToday: rows.filter(row => row.timestamp >= todayFloor).length,
      eventsThisWeek: rows.filter(row => row.timestamp >= weekFloor).length,
      mostActiveActor,
      mostChangedEntityType,
    }
  },
})
