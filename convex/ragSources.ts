import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

type IdentityLike = {
  subject?: string
  email?: string
  tokenIdentifier?: string
  name?: string
}

function toSafeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map(v => v.trim()).filter(Boolean))]
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

async function requireIdentity(ctx: { auth: { getUserIdentity: () => Promise<unknown> } }) {
  const identity = await ctx.auth.getUserIdentity() as IdentityLike | null
  const userId = identity?.subject || identity?.tokenIdentifier || ''

  if (!userId) {
    throw new Error('Authentication required')
  }

  return {
    userId,
    email: toSafeString(identity?.email).toLowerCase() || undefined,
    raw: identity,
  }
}

async function isAdmin(ctx: { db: any }, userId: string, email?: string) {
  const byUserId = await ctx.db
    .query('rag_admins')
    .withIndex('by_userId', (q: any) => q.eq('userId', userId))
    .first()

  if (byUserId) {
    return true
  }

  if (email) {
    const byEmail = await ctx.db
      .query('rag_admins')
      .withIndex('by_email', (q: any) => q.eq('email', email))
      .first()

    if (byEmail) {
      return true
    }
  }

  return false
}

async function requireAdmin(ctx: { db: any, auth: { getUserIdentity: () => Promise<unknown> } }) {
  const identity = await requireIdentity(ctx)
  const allowed = await isAdmin(ctx, identity.userId, identity.email)

  if (!allowed) {
    throw new Error('Admin access required')
  }

  return identity
}

async function writeAudit(ctx: { db: any }, input: {
  sourceId: any
  actorUserId: string
  actorEmail?: string
  action: 'submit' | 'approve' | 'reject' | 'pause' | 'resume' | 'edit'
  reason?: string
  note?: string
  diffSummary?: string
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

const websiteConfigValidator = v.object({
  seedUrls: v.array(v.string()),
  allowedDomains: v.array(v.string()),
  includePatterns: v.array(v.string()),
  excludePatterns: v.array(v.string()),
  maxDepth: v.number(),
  maxPagesPerRun: v.number(),
  renderMode: v.union(v.literal('static'), v.literal('rendered')),
  requestHeadersRef: v.optional(v.string()),
  respectRobots: v.boolean(),
})

const youtubeConfigValidator = v.object({
  channelId: v.string(),
  channelUrl: v.string(),
  maxVideosPerRun: v.number(),
  includeShorts: v.boolean(),
  preferredLanguage: v.optional(v.string()),
})

function sanitizeWebsiteConfig(config: {
  seedUrls: string[]
  allowedDomains: string[]
  includePatterns: string[]
  excludePatterns: string[]
  maxDepth: number
  maxPagesPerRun: number
  renderMode: 'static' | 'rendered'
  requestHeadersRef?: string
  respectRobots: boolean
}) {
  return {
    seedUrls: uniqueStrings(config.seedUrls),
    allowedDomains: uniqueStrings(config.allowedDomains.map(value => value.toLowerCase())),
    includePatterns: uniqueStrings(config.includePatterns),
    excludePatterns: uniqueStrings(config.excludePatterns),
    maxDepth: Math.max(0, Math.min(10, Math.floor(config.maxDepth))),
    maxPagesPerRun: Math.max(1, Math.min(5000, Math.floor(config.maxPagesPerRun))),
    renderMode: config.renderMode,
    requestHeadersRef: toSafeString(config.requestHeadersRef) || undefined,
    respectRobots: Boolean(config.respectRobots),
  }
}

function sanitizeYoutubeConfig(config: {
  channelId: string
  channelUrl: string
  maxVideosPerRun: number
  includeShorts: boolean
  preferredLanguage?: string
}) {
  return {
    channelId: toSafeString(config.channelId),
    channelUrl: toSafeString(config.channelUrl),
    maxVideosPerRun: Math.max(1, Math.min(200, Math.floor(config.maxVideosPerRun))),
    includeShorts: Boolean(config.includeShorts),
    preferredLanguage: toSafeString(config.preferredLanguage) || undefined,
  }
}

export const getAdminStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity() as IdentityLike | null
    const userId = identity?.subject || identity?.tokenIdentifier || ''
    const email = toSafeString(identity?.email).toLowerCase() || undefined

    const adminCount = (await ctx.db.query('rag_admins').collect()).length
    const signedIn = Boolean(userId)
    const currentUserIsAdmin = signedIn ? await isAdmin(ctx, userId, email) : false

    return {
      signedIn,
      adminCount,
      currentUserIsAdmin,
      currentUser: signedIn ? {
        userId,
        email: email ?? null,
      } : null,
      bootstrapAvailable: false,
    }
  },
})

export const bootstrapCurrentUserAsAdmin = mutation({
  args: {},
  handler: async () => {
    throw new Error('Public bootstrap is disabled. Use the Nuxt admin sync endpoint.')
  },
})

export const listSources = query({
  args: {
    status: v.optional(v.union(
      v.literal('pending_approval'),
      v.literal('approved'),
      v.literal('rejected'),
      v.literal('paused'),
    )),
    type: v.optional(v.union(v.literal('website'), v.literal('youtube_channel'))),
    tenantId: v.optional(v.string()),
    includeAllForAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const currentUserIsAdmin = await isAdmin(ctx, identity.userId, identity.email)

    let rows = await ctx.db.query('sources').collect()

    if (!currentUserIsAdmin || !args.includeAllForAdmin) {
      rows = rows.filter((row: any) => row.createdByUserId === identity.userId)
    }

    if (args.status) {
      rows = rows.filter((row: any) => row.status === args.status)
    }

    if (args.type) {
      rows = rows.filter((row: any) => row.type === args.type)
    }

    if (args.tenantId) {
      rows = rows.filter((row: any) => row.tenantId === args.tenantId)
    }

    rows.sort((a: any, b: any) => b._creationTime - a._creationTime)

    return {
      currentUserIsAdmin,
      items: rows,
    }
  },
})

export const getSource = query({
  args: {
    sourceId: v.id('sources'),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const currentUserIsAdmin = await isAdmin(ctx, identity.userId, identity.email)
    const source = await ctx.db.get(args.sourceId)

    if (!source) {
      return null
    }

    if (!currentUserIsAdmin && source.createdByUserId !== identity.userId) {
      throw new Error('Not authorized to view this source')
    }

    const audit = await ctx.db
      .query('approval_audit_log')
      .withIndex('by_sourceId', (q: any) => q.eq('sourceId', args.sourceId))
      .collect()

    audit.sort((a: any, b: any) => b.timestamp - a.timestamp)

    return {
      source,
      audit,
      currentUserIsAdmin,
    }
  },
})

export const createSourceSubmission = mutation({
  args: {
    type: v.union(v.literal('website'), v.literal('youtube_channel')),
    name: v.string(),
    description: v.optional(v.string()),
    trustScore: v.optional(v.number()),
    linkedPathwayIds: v.optional(v.array(v.string())),
    tenantId: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    schedule: scheduleValidator,
    websiteConfig: v.optional(websiteConfigValidator),
    youtubeConfig: v.optional(youtubeConfigValidator),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx)
    const now = Date.now()
    const name = toSafeString(args.name)

    if (!name) {
      throw new Error('Source name is required')
    }

    const schedule = normalizeSchedule(args.schedule)
    const type = args.type

    let crawlConfig: Record<string, unknown>
    if (type === 'website') {
      if (!args.websiteConfig) {
        throw new Error('websiteConfig is required for website sources')
      }
      crawlConfig = sanitizeWebsiteConfig(args.websiteConfig)
      if ((crawlConfig.seedUrls as string[]).length === 0) {
        throw new Error('At least one seed URL is required')
      }
      if ((crawlConfig.allowedDomains as string[]).length === 0) {
        throw new Error('At least one allowed domain is required')
      }
    }
    else {
      if (!args.youtubeConfig) {
        throw new Error('youtubeConfig is required for youtube_channel sources')
      }
      crawlConfig = sanitizeYoutubeConfig(args.youtubeConfig)
      if (!toSafeString(crawlConfig.channelId)) {
        throw new Error('YouTube channel ID is required')
      }
      if (!toSafeString(crawlConfig.channelUrl)) {
        throw new Error('YouTube channel URL is required')
      }
    }

    const sourceId = await ctx.db.insert('sources', {
      type,
      status: 'pending_approval',
      name,
      description: toSafeString(args.description) || undefined,
      trustScore: Number.isFinite(args.trustScore) ? Math.max(0, Math.min(100, Math.round(args.trustScore!))) : undefined,
      tenantId: toSafeString(args.tenantId) || 'default',
      tags: uniqueStrings(args.tags ?? []),
      linkedPathwayIds: uniqueStrings(args.linkedPathwayIds ?? []),
      createdByUserId: identity.userId,
      createdByEmail: identity.email,
      lastConfigUpdatedAt: now,
      schedule,
      crawlConfig,
      enabled: args.enabled ?? true,
      nextRunAt: computeNextRunAt(now, schedule),
    })

    await writeAudit(ctx, {
      sourceId,
      actorUserId: identity.userId,
      actorEmail: identity.email,
      action: 'submit',
      note: 'Initial source submission',
    })

    return {
      ok: true,
      sourceId,
      status: 'pending_approval' as const,
    }
  },
})

export const updateSourceConfig = mutation({
  args: {
    sourceId: v.id('sources'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    trustScore: v.optional(v.number()),
    tenantId: v.optional(v.string()),
    linkedPathwayIds: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    schedule: v.optional(scheduleValidator),
    enabled: v.optional(v.boolean()),
    websiteConfig: v.optional(websiteConfigValidator),
    youtubeConfig: v.optional(youtubeConfigValidator),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx)
    const source = await ctx.db.get(args.sourceId)

    if (!source) {
      throw new Error('Source not found')
    }

    const patch: Record<string, unknown> = {
      lastConfigUpdatedAt: Date.now(),
    }
    const diffParts: string[] = []

    if (typeof args.name === 'string') {
      patch.name = toSafeString(args.name)
      diffParts.push('name')
    }

    if (typeof args.description === 'string') {
      patch.description = toSafeString(args.description) || undefined
      diffParts.push('description')
    }

    if (typeof args.trustScore === 'number' && Number.isFinite(args.trustScore)) {
      patch.trustScore = Math.max(0, Math.min(100, Math.round(args.trustScore)))
      diffParts.push('trustScore')
    }

    if (typeof args.tenantId === 'string') {
      patch.tenantId = toSafeString(args.tenantId) || source.tenantId
      diffParts.push('tenantId')
    }

    if (Array.isArray(args.linkedPathwayIds)) {
      patch.linkedPathwayIds = uniqueStrings(args.linkedPathwayIds)
      diffParts.push('linkedPathwayIds')
    }

    if (Array.isArray(args.tags)) {
      patch.tags = uniqueStrings(args.tags)
      diffParts.push('tags')
    }

    if (typeof args.enabled === 'boolean') {
      patch.enabled = args.enabled
      diffParts.push('enabled')
    }

    if (args.schedule) {
      const schedule = normalizeSchedule(args.schedule)
      patch.schedule = schedule
      patch.nextRunAt = computeNextRunAt(Date.now(), schedule)
      diffParts.push('schedule')
    }

    if (source.type === 'website' && args.websiteConfig) {
      patch.crawlConfig = sanitizeWebsiteConfig(args.websiteConfig)
      diffParts.push('websiteConfig')
    }

    if (source.type === 'youtube_channel' && args.youtubeConfig) {
      patch.crawlConfig = sanitizeYoutubeConfig(args.youtubeConfig)
      diffParts.push('youtubeConfig')
    }

    await ctx.db.patch(args.sourceId, patch)
    await writeAudit(ctx, {
      sourceId: args.sourceId,
      actorUserId: identity.userId,
      actorEmail: identity.email,
      action: 'edit',
      diffSummary: diffParts.join(', ') || 'none',
    })

    return { ok: true, sourceId: args.sourceId }
  },
})

export const approveSource = mutation({
  args: {
    sourceId: v.id('sources'),
    enabled: v.optional(v.boolean()),
    schedule: v.optional(scheduleValidator),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx)
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
      approvedByUserId: identity.userId,
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
      actorUserId: identity.userId,
      actorEmail: identity.email,
      action: 'approve',
      note: toSafeString(args.note) || undefined,
    })

    return { ok: true, status: 'approved' as const }
  },
})

export const rejectSource = mutation({
  args: {
    sourceId: v.id('sources'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx)
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
      rejectedByUserId: identity.userId,
      rejectedAt: now,
      rejectionReason: reason,
      lastConfigUpdatedAt: now,
    })

    await writeAudit(ctx, {
      sourceId: args.sourceId,
      actorUserId: identity.userId,
      actorEmail: identity.email,
      action: 'reject',
      reason,
    })

    return { ok: true, status: 'rejected' as const }
  },
})

export const pauseSource = mutation({
  args: {
    sourceId: v.id('sources'),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx)
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
      actorUserId: identity.userId,
      actorEmail: identity.email,
      action: 'pause',
      note: toSafeString(args.note) || undefined,
    })

    return { ok: true, status: 'paused' as const }
  },
})

export const resumeSource = mutation({
  args: {
    sourceId: v.id('sources'),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx)
    const source = await ctx.db.get(args.sourceId)
    if (!source) {
      throw new Error('Source not found')
    }

    const now = Date.now()
    const schedule = source.schedule as {
      frequency: 'daily' | 'manual' | 'interval'
      intervalHours?: number
    }

    await ctx.db.patch(args.sourceId, {
      status: 'approved',
      lastConfigUpdatedAt: now,
      nextRunAt: computeNextRunAt(now, schedule),
    })

    await writeAudit(ctx, {
      sourceId: args.sourceId,
      actorUserId: identity.userId,
      actorEmail: identity.email,
      action: 'resume',
      note: toSafeString(args.note) || undefined,
    })

    return { ok: true, status: 'approved' as const }
  },
})
