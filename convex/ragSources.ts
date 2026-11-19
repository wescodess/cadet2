import { v } from 'convex/values'
import { mutation, query, type MutationCtx } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'
import { isReviewedRagAdminGrant, requireRagAdmin } from './lib/ragAdmin'
import { hasControlCharacters } from './lib/sourceText'

function toSafeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))]
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

function computeNextRunAt(
  now: number,
  schedule: { frequency: 'daily' | 'manual' | 'interval'; intervalHours?: number },
) {
  if (schedule.frequency === 'manual') {
    return undefined
  }

  if (schedule.frequency === 'interval') {
    return now + (schedule.intervalHours ?? 24) * 60 * 60 * 1000
  }

  return now + 24 * 60 * 60 * 1000
}

async function writeAudit(
  ctx: MutationCtx,
  input: {
    sourceId: Id<'sources'>
    actorUserId: string
    actorEmail?: string
    action: 'submit' | 'approve' | 'reject' | 'pause' | 'resume' | 'edit'
    reason?: string
    note?: string
    diffSummary?: string
    governance: { before: Doc<'sources'> | null; after: Doc<'sources'> | null }
  },
) {
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
    allowedDomains: uniqueStrings(config.allowedDomains.map((value) => value.toLowerCase())),
    includePatterns: uniqueStrings(config.includePatterns),
    excludePatterns: uniqueStrings(config.excludePatterns),
    maxDepth: Math.max(0, Math.min(10, Math.floor(config.maxDepth))),
    maxPagesPerRun: Math.max(1, Math.min(5000, Math.floor(config.maxPagesPerRun))),
    renderMode: config.renderMode,
    requestHeadersRef: toSafeString(config.requestHeadersRef) || undefined,
    respectRobots: Boolean(config.respectRobots),
  }
}

export const getAdminStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireRagAdmin(ctx)
    const userId = identity.userId
    const email = identity.email
    const adminCount = (await ctx.db.query('rag_admins').collect()).filter((grant) =>
      isReviewedRagAdminGrant(grant, identity.issuer),
    ).length
    return {
      signedIn: true,
      adminCount,
      currentUserIsAdmin: true,
      currentUser: { userId, email: email ?? null },
      bootstrapAvailable: false,
    }
  },
})

export const listSources = query({
  args: {
    status: v.optional(
      v.union(
        v.literal('pending_approval'),
        v.literal('approved'),
        v.literal('rejected'),
        v.literal('paused'),
      ),
    ),
    type: v.optional(v.union(v.literal('website'), v.literal('youtube_channel'))),
    tenantId: v.optional(v.string()),
    includeAllForAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await requireRagAdmin(ctx)
    const currentUserIsAdmin = true

    let rows = await ctx.db.query('sources').collect()

    if (!args.includeAllForAdmin) {
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
    await requireRagAdmin(ctx)
    const currentUserIsAdmin = true
    const source = await ctx.db.get(args.sourceId)

    if (!source) {
      return null
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
    const identity = await requireRagAdmin(ctx)
    if (hasControlCharacters([args.name, args.websiteConfig, args.youtubeConfig])) {
      throw new Error('Source names and config must not contain control characters')
    }
    const now = Date.now()
    const name = toSafeString(args.name)

    if (!name) {
      throw new Error('Source name is required')
    }

    const schedule = normalizeSchedule(args.schedule)
    const type = args.type
    if (type === 'youtube_channel') throw new Error('YouTube ingestion is frozen')

    if (!args.websiteConfig) throw new Error('websiteConfig is required for website sources')
    const crawlConfig = sanitizeWebsiteConfig(args.websiteConfig)
    if (crawlConfig.seedUrls.length === 0) throw new Error('At least one seed URL is required')
    if (crawlConfig.allowedDomains.length === 0)
      throw new Error('At least one allowed domain is required')

    const sourceId = await ctx.db.insert('sources', {
      type,
      status: 'pending_approval',
      name,
      description: toSafeString(args.description) || undefined,
      trustScore: Number.isFinite(args.trustScore)
        ? Math.max(0, Math.min(100, Math.round(args.trustScore!)))
        : undefined,
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
      governance: { before: null, after: await ctx.db.get(sourceId) },
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
    const identity = await requireRagAdmin(ctx)
    if (hasControlCharacters([args.name, args.websiteConfig, args.youtubeConfig])) {
      throw new Error('Source names and config must not contain control characters')
    }
    const source = await ctx.db.get(args.sourceId)

    if (!source) {
      throw new Error('Source not found')
    }

    if (
      source.type === 'youtube_channel' &&
      (args.enabled === true || args.schedule || args.youtubeConfig)
    ) {
      throw new Error('YouTube ingestion is frozen')
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

    await ctx.db.patch(args.sourceId, patch)
    await writeAudit(ctx, {
      sourceId: args.sourceId,
      actorUserId: identity.userId,
      actorEmail: identity.email,
      action: 'edit',
      governance: { before: source, after: await ctx.db.get(args.sourceId) },
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
    const identity = await requireRagAdmin(ctx)
    const source = await ctx.db.get(args.sourceId)

    if (!source) {
      throw new Error('Source not found')
    }

    if (source.type === 'youtube_channel') throw new Error('YouTube ingestion is frozen')

    const now = Date.now()
    const schedule = args.schedule
      ? normalizeSchedule(args.schedule)
      : (source.schedule as {
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
      governance: { before: source, after: await ctx.db.get(args.sourceId) },
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
    const identity = await requireRagAdmin(ctx)
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
      governance: { before: source, after: await ctx.db.get(args.sourceId) },
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
    const identity = await requireRagAdmin(ctx)
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
      governance: { before: source, after: await ctx.db.get(args.sourceId) },
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
    const identity = await requireRagAdmin(ctx)
    const source = await ctx.db.get(args.sourceId)
    if (!source) {
      throw new Error('Source not found')
    }

    if (source.type === 'youtube_channel') throw new Error('YouTube ingestion is frozen')

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
      governance: { before: source, after: await ctx.db.get(args.sourceId) },
      note: toSafeString(args.note) || undefined,
    })

    return { ok: true, status: 'approved' as const }
  },
})

export const removeSource = mutation({
  args: {
    sourceId: v.id('sources'),
  },
  handler: async (ctx, args) => {
    const actor = await requireRagAdmin(ctx)
    const source = await ctx.db.get(args.sourceId)
    if (!source) {
      throw new Error('Source not found')
    }

    if (source.type === 'youtube_channel')
      throw new Error('YouTube history is restricted pending retention review')

    const sourceItems = await ctx.db
      .query('source_items')
      .withIndex('by_sourceId', (q) => q.eq('sourceId', args.sourceId))
      .collect()

    for (const sourceItem of sourceItems) {
      await ctx.db.delete(sourceItem._id)
    }

    await ctx.db.delete(args.sourceId)
    await ctx.db.insert('rag_source_deletions', {
      sourceId: args.sourceId,
      source,
      actorId: actor.userId,
      actorEmail: actor.email,
      timestamp: Date.now(),
    })

    return {
      ok: true,
      sourceId: args.sourceId,
    }
  },
})
