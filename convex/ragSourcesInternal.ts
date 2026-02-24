import { v } from 'convex/values'
import { internalMutation } from './_generated/server'

function toSafeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeSchedule(schedule: {
  frequency: 'daily' | 'manual' | 'interval'
  intervalHours?: number
}) {
  const frequency = schedule.frequency
  if (frequency === 'interval') {
    const intervalHours = Number.isFinite(schedule.intervalHours)
      ? Math.max(1, Math.floor(schedule.intervalHours!))
      : 24
    return { frequency, intervalHours }
  }

  return { frequency }
}

function computeNextRunAt(now: number, schedule: { frequency: 'daily' | 'manual' | 'interval', intervalHours?: number }) {
  if (schedule.frequency === 'manual') {
    return undefined
  }

  if (schedule.frequency === 'interval') {
    return now + ((schedule.intervalHours ?? 24) * 60 * 60 * 1000)
  }

  return now + (24 * 60 * 60 * 1000)
}

async function writeAudit(ctx: { db: any }, input: {
  sourceId: any
  actorUserId: string
  actorEmail?: string
  action: 'approve' | 'reject' | 'pause' | 'resume'
  reason?: string
  note?: string
}) {
  await ctx.db.insert('approval_audit_log', {
    ...input,
    timestamp: Date.now(),
  })
}

const scheduleValidator = v.object({
  frequency: v.union(v.literal('daily'), v.literal('manual'), v.literal('interval')),
  intervalHours: v.optional(v.number()),
})

export const syncAdminFromNuxtAllowlist = internalMutation({
  args: {
    userId: v.string(),
    email: v.optional(v.string()),
    grantedByUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const email = toSafeString(args.email).toLowerCase() || undefined
    const existing = await ctx.db
      .query('rag_admins')
      .withIndex('by_userId', q => q.eq('userId', args.userId))
      .first()

    if (existing) {
      if (email && existing.email !== email) {
        await ctx.db.patch(existing._id, { email })
      }

      return {
        ok: true,
        alreadyAdmin: true,
        adminId: existing._id,
      }
    }

    const adminId = await ctx.db.insert('rag_admins', {
      userId: args.userId,
      email,
      createdAt: Date.now(),
      grantedByUserId: args.grantedByUserId,
    })

    return {
      ok: true,
      alreadyAdmin: false,
      adminId,
    }
  },
})

export const approveSourceAsNuxtAdmin = internalMutation({
  args: {
    sourceId: v.id('sources'),
    actorUserId: v.string(),
    actorEmail: v.optional(v.string()),
    enabled: v.optional(v.boolean()),
    schedule: v.optional(scheduleValidator),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId)
    if (!source) {
      throw new Error('Source not found')
    }

    const now = Date.now()
    const schedule = args.schedule ? normalizeSchedule(args.schedule) : (source.schedule as {
      frequency: 'daily' | 'manual' | 'interval'
      intervalHours?: number
    })

    await ctx.db.patch(args.sourceId, {
      status: 'approved',
      approvedByUserId: args.actorUserId,
      approvedAt: now,
      rejectedByUserId: undefined,
      rejectedAt: undefined,
      rejectionReason: undefined,
      enabled: args.enabled ?? source.enabled,
      schedule,
      nextRunAt: computeNextRunAt(now, schedule),
      lastConfigUpdatedAt: now,
    })

    await writeAudit(ctx, {
      sourceId: args.sourceId,
      actorUserId: args.actorUserId,
      actorEmail: toSafeString(args.actorEmail).toLowerCase() || undefined,
      action: 'approve',
      note: toSafeString(args.note) || undefined,
    })

    return { ok: true, status: 'approved' as const }
  },
})

export const rejectSourceAsNuxtAdmin = internalMutation({
  args: {
    sourceId: v.id('sources'),
    actorUserId: v.string(),
    actorEmail: v.optional(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId)
    if (!source) {
      throw new Error('Source not found')
    }

    const reason = toSafeString(args.reason)
    if (!reason) {
      throw new Error('Rejection reason is required')
    }

    const now = Date.now()
    await ctx.db.patch(args.sourceId, {
      status: 'rejected',
      rejectedByUserId: args.actorUserId,
      rejectedAt: now,
      rejectionReason: reason,
      lastConfigUpdatedAt: now,
      nextRunAt: undefined,
    })

    await writeAudit(ctx, {
      sourceId: args.sourceId,
      actorUserId: args.actorUserId,
      actorEmail: toSafeString(args.actorEmail).toLowerCase() || undefined,
      action: 'reject',
      reason,
    })

    return { ok: true, status: 'rejected' as const }
  },
})

export const pauseSourceAsNuxtAdmin = internalMutation({
  args: {
    sourceId: v.id('sources'),
    actorUserId: v.string(),
    actorEmail: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId)
    if (!source) {
      throw new Error('Source not found')
    }

    await ctx.db.patch(args.sourceId, {
      status: 'paused',
      lastConfigUpdatedAt: Date.now(),
      nextRunAt: undefined,
    })

    await writeAudit(ctx, {
      sourceId: args.sourceId,
      actorUserId: args.actorUserId,
      actorEmail: toSafeString(args.actorEmail).toLowerCase() || undefined,
      action: 'pause',
      note: toSafeString(args.note) || undefined,
    })

    return { ok: true, status: 'paused' as const }
  },
})

export const resumeSourceAsNuxtAdmin = internalMutation({
  args: {
    sourceId: v.id('sources'),
    actorUserId: v.string(),
    actorEmail: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.sourceId)
    if (!source) {
      throw new Error('Source not found')
    }

    const schedule = source.schedule as {
      frequency: 'daily' | 'manual' | 'interval'
      intervalHours?: number
    }
    const now = Date.now()

    await ctx.db.patch(args.sourceId, {
      status: 'approved',
      lastConfigUpdatedAt: now,
      nextRunAt: computeNextRunAt(now, schedule),
    })

    await writeAudit(ctx, {
      sourceId: args.sourceId,
      actorUserId: args.actorUserId,
      actorEmail: toSafeString(args.actorEmail).toLowerCase() || undefined,
      action: 'resume',
      note: toSafeString(args.note) || undefined,
    })

    return { ok: true, status: 'approved' as const }
  },
})
