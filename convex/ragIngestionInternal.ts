import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'

type SourceSchedule = {
  frequency: 'daily' | 'manual' | 'interval'
  intervalHours?: number
}

type SourceRunStats = {
  discovered: number
  fetched: number
  new: number
  changed: number
  unchanged: number
  failed: number
  skipped: number
  transcriptAttempted: number
  transcriptSucceeded: number
  transcriptSucceededInnerTubeAndroid: number
  transcriptSucceededApi: number
  transcriptSucceededCaptionsXml: number
  transcriptSucceededWithTimestamps: number
  transcriptDescriptionFallback: number
}

type BatchSummary = {
  sourcesSucceeded: number
  sourcesPartial: number
  sourcesFailed: number
  itemsNew: number
  itemsChanged: number
  itemsUnchanged: number
  itemsFailed: number
  transcriptAttempted: number
  transcriptSucceeded: number
  transcriptSucceededInnerTubeAndroid: number
  transcriptSucceededApi: number
  transcriptSucceededCaptionsXml: number
  transcriptSucceededWithTimestamps: number
  transcriptDescriptionFallback: number
}

type SourceRunError = {
  code: string
  message: string
  retryable?: boolean
  timestamp: number
}

type SourceRow = {
  _id: any
  _creationTime: number
  type: 'website' | 'youtube_channel'
  status: 'pending_approval' | 'approved' | 'rejected' | 'paused'
  tenantId: string
  enabled: boolean
  name: string
  schedule: SourceSchedule
  nextRunAt?: number
}

type SourceRunTerminalResult = {
  status: 'succeeded' | 'partial' | 'failed'
  stats: SourceRunStats
  errors: SourceRunError[]
  lastError?: string
  retryable?: boolean
}

function toSafeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function zeroStats(): SourceRunStats {
  return {
    discovered: 0,
    fetched: 0,
    new: 0,
    changed: 0,
    unchanged: 0,
    failed: 0,
    skipped: 0,
    transcriptAttempted: 0,
    transcriptSucceeded: 0,
    transcriptSucceededInnerTubeAndroid: 0,
    transcriptSucceededApi: 0,
    transcriptSucceededCaptionsXml: 0,
    transcriptSucceededWithTimestamps: 0,
    transcriptDescriptionFallback: 0,
  }
}

function zeroSummary(): BatchSummary {
  return {
    sourcesSucceeded: 0,
    sourcesPartial: 0,
    sourcesFailed: 0,
    itemsNew: 0,
    itemsChanged: 0,
    itemsUnchanged: 0,
    itemsFailed: 0,
    transcriptAttempted: 0,
    transcriptSucceeded: 0,
    transcriptSucceededInnerTubeAndroid: 0,
    transcriptSucceededApi: 0,
    transcriptSucceededCaptionsXml: 0,
    transcriptSucceededWithTimestamps: 0,
    transcriptDescriptionFallback: 0,
  }
}

function computeNextRunAt(now: number, schedule: SourceSchedule) {
  if (schedule.frequency === 'manual') {
    return undefined
  }

  if (schedule.frequency === 'interval') {
    const hours = Number.isFinite(schedule.intervalHours) ? Math.max(1, Math.floor(schedule.intervalHours!)) : 24
    return now + (hours * 60 * 60 * 1000)
  }

  return now + (24 * 60 * 60 * 1000)
}

function isSourceDue(source: SourceRow, now: number) {
  if (source.status !== 'approved' || !source.enabled) {
    return false
  }

  if (typeof source.nextRunAt === 'number') {
    return source.nextRunAt <= now
  }

  return source.schedule?.frequency !== 'manual'
}

function isBatchActive(status: string) {
  return ['queued', 'running', 'ingesting', 'sync_pending', 'syncing'].includes(status)
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return typeof error === 'string' && error.trim() ? error.trim() : 'Unknown error'
}

function batchIdempotencyResult(batch: any, reused: boolean, reason: 'active' | 'terminal' | 'created') {
  return {
    ok: true,
    reused,
    reuseReason: reason,
    batchId: batch._id,
    status: batch.status,
    sourceCount: batch.sourceCount,
    idempotencyKey: batch.idempotencyKey,
    summary: batch.summary,
  }
}

async function getLatestBatchByIdempotencyKey(ctx: { db: any }, idempotencyKey: string) {
  const matches = await ctx.db
    .query('ingestion_batches')
    .withIndex('by_idempotencyKey', (q: any) => q.eq('idempotencyKey', idempotencyKey))
    .collect()

  matches.sort((a: any, b: any) => b._creationTime - a._creationTime)
  return matches[0] ?? null
}

async function selectSourcesForBatch(
  ctx: { db: any },
  input: { now: number, sourceIds?: any[] | undefined, includeOnlyDue: boolean },
) {
  let rows = await ctx.db.query('sources').collect() as SourceRow[]
  rows = rows.filter(row => row.status === 'approved' && row.enabled)

  if (input.sourceIds?.length) {
    const requested = new Set(input.sourceIds.map(String))
    rows = rows.filter(row => requested.has(String(row._id)))
  }

  if (input.includeOnlyDue) {
    rows = rows.filter(row => isSourceDue(row, input.now))
  }

  rows.sort((a, b) => {
    const aDue = typeof a.nextRunAt === 'number' ? a.nextRunAt : Number.MAX_SAFE_INTEGER
    const bDue = typeof b.nextRunAt === 'number' ? b.nextRunAt : Number.MAX_SAFE_INTEGER
    if (aDue !== bDue) {
      return aDue - bDue
    }
    return a._creationTime - b._creationTime
  })

  return rows
}

async function createBatchWithQueuedRuns(ctx: { db: any }, input: {
  now: number
  scheduledFor: number
  trigger: 'scheduled' | 'manual'
  idempotencyKey: string
  sources: SourceRow[]
  requestedByUserId?: string
  requestedByEmail?: string
}) {
  const batchId = await ctx.db.insert('ingestion_batches', {
    status: 'queued',
    scheduledFor: input.scheduledFor,
    trigger: input.trigger,
    sourceCount: input.sources.length,
    dueSourceIds: input.sources.map(source => source._id),
    summary: zeroSummary(),
    idempotencyKey: input.idempotencyKey,
    requestedByUserId: input.requestedByUserId,
    requestedByEmail: input.requestedByEmail,
  })

  for (const source of input.sources) {
    await ctx.db.insert('source_runs', {
      batchId,
      sourceId: source._id,
      tenantId: source.tenantId,
      status: 'queued',
      trigger: input.trigger,
      stats: zeroStats(),
      errors: [],
      attempt: 1,
      maxAttempts: 2,
    })
  }

  return batchId
}

function aggregateBatchSummary(sourceRuns: Array<{ status: string, stats: SourceRunStats }>) {
  const summary = zeroSummary()

  for (const run of sourceRuns) {
    if (run.status === 'succeeded') {
      summary.sourcesSucceeded += 1
    }
    else if (run.status === 'partial') {
      summary.sourcesPartial += 1
    }
    else if (run.status === 'failed') {
      summary.sourcesFailed += 1
    }

    summary.itemsNew += run.stats.new
    summary.itemsChanged += run.stats.changed
    summary.itemsUnchanged += run.stats.unchanged
    summary.itemsFailed += run.stats.failed
    summary.transcriptAttempted += run.stats.transcriptAttempted
    summary.transcriptSucceeded += run.stats.transcriptSucceeded
    summary.transcriptSucceededInnerTubeAndroid += run.stats.transcriptSucceededInnerTubeAndroid
    summary.transcriptSucceededApi += run.stats.transcriptSucceededApi
    summary.transcriptSucceededCaptionsXml += run.stats.transcriptSucceededCaptionsXml
    summary.transcriptSucceededWithTimestamps += run.stats.transcriptSucceededWithTimestamps
    summary.transcriptDescriptionFallback += run.stats.transcriptDescriptionFallback
  }

  return summary
}

async function executeSourceRunScaffold(source: SourceRow): Promise<SourceRunTerminalResult> {
  // Phase 2 orchestration intentionally stops at job tracking. Adapter execution lands in Phases 3/4.
  throw new Error(`Adapter not implemented for source type "${source.type}" (Phase 2 scaffold)`)
}

async function finalizeSourceTimestamps(ctx: { db: any }, input: {
  source: SourceRow
  runStatus: 'succeeded' | 'partial' | 'failed'
  finishedAt: number
  lastError?: string
}) {
  const patch: Record<string, unknown> = {
    lastRunAt: input.finishedAt,
    nextRunAt: computeNextRunAt(input.finishedAt, input.source.schedule),
  }

  if (input.runStatus === 'failed') {
    patch.lastFailureAt = input.finishedAt
    patch.lastFailureReason = input.lastError || 'Source run failed'
  }
  else {
    patch.lastSuccessAt = input.finishedAt
    patch.lastFailureReason = undefined
  }

  await ctx.db.patch(input.source._id, patch)
}

async function processBatchRuns(ctx: { db: any }, batchId: any) {
  const batch = await ctx.db.get(batchId)
  if (!batch) {
    throw new Error('Batch not found')
  }

  const startedAt = Date.now()
  await ctx.db.patch(batchId, {
    status: 'running',
    startedAt,
  })
  await ctx.db.patch(batchId, {
    status: 'ingesting',
  })

  const queuedRuns = await ctx.db
    .query('source_runs')
    .withIndex('by_batchId', (q: any) => q.eq('batchId', batchId))
    .collect()

  queuedRuns.sort((a: any, b: any) => a._creationTime - b._creationTime)

  for (const run of queuedRuns) {
    const source = await ctx.db.get(run.sourceId) as SourceRow | null
    const runStartedAt = Date.now()

    await ctx.db.patch(run._id, {
      status: 'running',
      startedAt: runStartedAt,
    })

    if (!source) {
      const finishedAt = Date.now()
      const message = 'Source not found'
      await ctx.db.patch(run._id, {
        status: 'failed',
        finishedAt,
        stats: {
          ...zeroStats(),
          failed: 1,
        },
        errors: [{
          code: 'source_missing',
          message,
          retryable: false,
          timestamp: finishedAt,
        }],
        lastError: message,
      })
      continue
    }

    try {
      const result = await executeSourceRunScaffold(source)
      const finishedAt = Date.now()

      await ctx.db.patch(run._id, {
        status: result.status,
        finishedAt,
        stats: result.stats,
        errors: result.errors.slice(0, 5),
        lastError: result.lastError,
      })

      await finalizeSourceTimestamps(ctx, {
        source,
        runStatus: result.status,
        finishedAt,
        lastError: result.lastError,
      })
    }
    catch (error) {
      const finishedAt = Date.now()
      const message = toErrorMessage(error)
      const retryable = false
      const errorSummary: SourceRunError = {
        code: 'adapter_not_implemented',
        message,
        retryable,
        timestamp: finishedAt,
      }

      const patch: Record<string, unknown> = {
        status: 'failed',
        finishedAt,
        stats: {
          ...zeroStats(),
          failed: 1,
        },
        errors: [errorSummary],
        lastError: message,
      }

      if (run.attempt < run.maxAttempts && retryable) {
        patch.nextRetryAt = finishedAt + (60 * 1000)
      }

      await ctx.db.patch(run._id, patch)

      await finalizeSourceTimestamps(ctx, {
        source,
        runStatus: 'failed',
        finishedAt,
        lastError: message,
      })
    }
  }

  const finalRuns = await ctx.db
    .query('source_runs')
    .withIndex('by_batchId', (q: any) => q.eq('batchId', batchId))
    .collect()

  const summary = aggregateBatchSummary(finalRuns as Array<{ status: string, stats: SourceRunStats }>)
  const changedCount = summary.itemsNew + summary.itemsChanged
  const terminalStatus = finalRuns.length === 0
    ? 'completed'
    : (summary.sourcesFailed === finalRuns.length && summary.sourcesSucceeded === 0 && summary.sourcesPartial === 0)
        ? 'failed'
        : changedCount > 0
            ? 'sync_pending'
            : 'completed'

  await ctx.db.patch(batchId, {
    status: terminalStatus,
    summary,
    finishedAt: Date.now(),
  })

  return await ctx.db.get(batchId)
}

async function createOrReuseAndProcessBatch(ctx: { db: any }, input: {
  trigger: 'manual' | 'scheduled'
  now: number
  scheduledFor: number
  sourceIds?: any[]
  includeOnlyDue: boolean
  idempotencyKey: string
  force?: boolean
  requestedByUserId?: string
  requestedByEmail?: string
}) {
  const idempotencyKey = toSafeString(input.idempotencyKey)
  if (!idempotencyKey) {
    throw new Error('idempotencyKey is required')
  }

  const existing = await getLatestBatchByIdempotencyKey(ctx, idempotencyKey)
  if (existing && !input.force) {
    if (isBatchActive(existing.status)) {
      return batchIdempotencyResult(existing, true, 'active')
    }
    return batchIdempotencyResult(existing, true, 'terminal')
  }

  const sources = await selectSourcesForBatch(ctx, {
    now: input.now,
    sourceIds: input.sourceIds,
    includeOnlyDue: input.includeOnlyDue,
  })

  if ((input.sourceIds?.length ?? 0) > 0 && sources.length === 0) {
    throw new Error('No approved + enabled sources matched the requested sourceIds')
  }

  const batchId = await createBatchWithQueuedRuns(ctx, {
    now: input.now,
    scheduledFor: input.scheduledFor,
    trigger: input.trigger,
    idempotencyKey,
    sources,
    requestedByUserId: input.requestedByUserId,
    requestedByEmail: input.requestedByEmail,
  })

  const batch = await processBatchRuns(ctx, batchId)
  if (!batch) {
    throw new Error('Failed to load processed batch')
  }

  return batchIdempotencyResult(batch, false, 'created')
}

async function createOrReuseBatchOnly(ctx: { db: any }, input: {
  trigger: 'manual' | 'scheduled'
  now: number
  scheduledFor: number
  sourceIds?: any[]
  includeOnlyDue: boolean
  idempotencyKey: string
  force?: boolean
  requestedByUserId?: string
  requestedByEmail?: string
}) {
  const idempotencyKey = toSafeString(input.idempotencyKey)
  if (!idempotencyKey) {
    throw new Error('idempotencyKey is required')
  }

  const existing = await getLatestBatchByIdempotencyKey(ctx, idempotencyKey)
  if (existing && !input.force) {
    if (isBatchActive(existing.status)) {
      return batchIdempotencyResult(existing, true, 'active')
    }
    return batchIdempotencyResult(existing, true, 'terminal')
  }

  const sources = await selectSourcesForBatch(ctx, {
    now: input.now,
    sourceIds: input.sourceIds,
    includeOnlyDue: input.includeOnlyDue,
  })

  if ((input.sourceIds?.length ?? 0) > 0 && sources.length === 0) {
    throw new Error('No approved + enabled sources matched the requested sourceIds')
  }

  const batchId = await createBatchWithQueuedRuns(ctx, {
    now: input.now,
    scheduledFor: input.scheduledFor,
    trigger: input.trigger,
    idempotencyKey,
    sources,
    requestedByUserId: input.requestedByUserId,
    requestedByEmail: input.requestedByEmail,
  })

  const batch = await ctx.db.get(batchId)
  if (!batch) {
    throw new Error('Failed to load prepared batch')
  }

  return batchIdempotencyResult(batch, false, 'created')
}

const batchStatusValidator = v.union(
  v.literal('queued'),
  v.literal('running'),
  v.literal('ingesting'),
  v.literal('sync_pending'),
  v.literal('syncing'),
  v.literal('completed'),
  v.literal('failed'),
)

const sourceRunStatsValidator = v.object({
  discovered: v.number(),
  fetched: v.number(),
  new: v.number(),
  changed: v.number(),
  unchanged: v.number(),
  failed: v.number(),
  skipped: v.number(),
  transcriptAttempted: v.number(),
  transcriptSucceeded: v.number(),
  transcriptSucceededInnerTubeAndroid: v.number(),
  transcriptSucceededApi: v.number(),
  transcriptSucceededCaptionsXml: v.number(),
  transcriptSucceededWithTimestamps: v.number(),
  transcriptDescriptionFallback: v.number(),
})

const sourceRunErrorValidator = v.object({
  code: v.string(),
  message: v.string(),
  retryable: v.optional(v.boolean()),
  timestamp: v.number(),
})

const sourceRunTerminalStatusValidator = v.union(
  v.literal('succeeded'),
  v.literal('partial'),
  v.literal('failed'),
)

const sourceItemStatusValidator = v.union(
  v.literal('active'),
  v.literal('unavailable'),
  v.literal('blocked'),
  v.literal('deleted'),
)

const sourceItemUpsertValidator = v.object({
  itemType: v.union(v.literal('web_page'), v.literal('youtube_video')),
  externalId: v.string(),
  canonicalUrl: v.string(),
  title: v.optional(v.string()),
  publishedAt: v.optional(v.number()),
  lastSeenAt: v.number(),
  lastFetchedAt: v.optional(v.number()),
  status: sourceItemStatusValidator,
  rawHash: v.optional(v.string()),
  normalizedHash: v.optional(v.string()),
  r2ContentKey: v.optional(v.string()),
  r2MetaKey: v.optional(v.string()),
  lastChangeDetectedAt: v.optional(v.number()),
  lastError: v.optional(v.string()),
})

const aiSearchSyncJobStatusValidator = v.union(
  v.literal('queued'),
  v.literal('submitted'),
  v.literal('running'),
  v.literal('succeeded'),
  v.literal('failed'),
  v.literal('timeout'),
)

export const runManualBatchAsNuxtAdmin = internalMutation({
  args: {
    idempotencyKey: v.string(),
    sourceIds: v.optional(v.array(v.id('sources'))),
    force: v.optional(v.boolean()),
    actorUserId: v.string(),
    actorEmail: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await createOrReuseAndProcessBatch(ctx, {
      trigger: 'manual',
      now,
      scheduledFor: args.scheduledFor ?? now,
      sourceIds: args.sourceIds,
      includeOnlyDue: !(args.sourceIds?.length),
      idempotencyKey: args.idempotencyKey,
      force: args.force,
      requestedByUserId: args.actorUserId,
      requestedByEmail: toSafeString(args.actorEmail).toLowerCase() || undefined,
    })
  },
})

export const runScheduledBatch = internalMutation({
  args: {
    idempotencyKey: v.string(),
    scheduledFor: v.optional(v.number()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await createOrReuseAndProcessBatch(ctx, {
      trigger: 'scheduled',
      now,
      scheduledFor: args.scheduledFor ?? now,
      includeOnlyDue: true,
      idempotencyKey: args.idempotencyKey,
      force: args.force,
    })
  },
})

export const prepareManualBatchAsNuxtAdmin = internalMutation({
  args: {
    idempotencyKey: v.string(),
    sourceIds: v.optional(v.array(v.id('sources'))),
    force: v.optional(v.boolean()),
    actorUserId: v.string(),
    actorEmail: v.optional(v.string()),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await createOrReuseBatchOnly(ctx, {
      trigger: 'manual',
      now,
      scheduledFor: args.scheduledFor ?? now,
      sourceIds: args.sourceIds,
      includeOnlyDue: !(args.sourceIds?.length),
      idempotencyKey: args.idempotencyKey,
      force: args.force,
      requestedByUserId: args.actorUserId,
      requestedByEmail: toSafeString(args.actorEmail).toLowerCase() || undefined,
    })
  },
})

export const prepareScheduledBatch = internalMutation({
  args: {
    idempotencyKey: v.string(),
    scheduledFor: v.optional(v.number()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await createOrReuseBatchOnly(ctx, {
      trigger: 'scheduled',
      now,
      scheduledFor: args.scheduledFor ?? now,
      includeOnlyDue: true,
      idempotencyKey: args.idempotencyKey,
      force: args.force,
    })
  },
})

export const startBatchExecutionFromNuxt = internalMutation({
  args: {
    batchId: v.id('ingestion_batches'),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId)
    if (!batch) {
      throw new Error('Batch not found')
    }

    if (['completed', 'failed', 'sync_pending', 'syncing'].includes(batch.status)) {
      return {
        ok: true,
        batch,
        alreadyStarted: true,
      }
    }

    const startedAt = typeof batch.startedAt === 'number' ? batch.startedAt : Date.now()
    await ctx.db.patch(args.batchId, {
      status: 'running',
      startedAt,
    })
    await ctx.db.patch(args.batchId, {
      status: 'ingesting',
    })

    const updated = await ctx.db.get(args.batchId)
    return {
      ok: true,
      batch: updated,
      alreadyStarted: false,
    }
  },
})

export const getBatchExecutionPlanFromNuxt = internalQuery({
  args: {
    batchId: v.id('ingestion_batches'),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId)
    if (!batch) {
      return null
    }

    const sourceRuns = await ctx.db
      .query('source_runs')
      .withIndex('by_batchId', (q: any) => q.eq('batchId', args.batchId))
      .collect()

    sourceRuns.sort((a: any, b: any) => a._creationTime - b._creationTime)

    const items = [] as any[]
    for (const run of sourceRuns) {
      const source = await ctx.db.get(run.sourceId)
      items.push({
        sourceRun: run,
        source,
      })
    }

    return {
      batch,
      items,
    }
  },
})

export const listSourceItemsForSourceFromNuxt = internalQuery({
  args: {
    sourceId: v.id('sources'),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('source_items')
      .withIndex('by_sourceId', (q: any) => q.eq('sourceId', args.sourceId))
      .collect()

    return {
      items: rows,
    }
  },
})

export const markSourceRunStartedFromNuxt = internalMutation({
  args: {
    sourceRunId: v.id('source_runs'),
    startedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sourceRun = await ctx.db.get(args.sourceRunId)
    if (!sourceRun) {
      throw new Error('Source run not found')
    }

    if (['succeeded', 'partial', 'failed', 'cancelled'].includes(sourceRun.status)) {
      return {
        ok: true,
        sourceRun: await ctx.db.get(args.sourceRunId),
        alreadyTerminal: true,
      }
    }

    await ctx.db.patch(args.sourceRunId, {
      status: 'running',
      startedAt: args.startedAt ?? sourceRun.startedAt ?? Date.now(),
    })

    return {
      ok: true,
      sourceRun: await ctx.db.get(args.sourceRunId),
      alreadyTerminal: false,
    }
  },
})

export const completeSourceRunFromNuxt = internalMutation({
  args: {
    sourceRunId: v.id('source_runs'),
    status: sourceRunTerminalStatusValidator,
    stats: sourceRunStatsValidator,
    errors: v.array(sourceRunErrorValidator),
    lastError: v.optional(v.string()),
    finishedAt: v.optional(v.number()),
    sourceItemUpserts: v.optional(v.array(sourceItemUpsertValidator)),
  },
  handler: async (ctx, args) => {
    const sourceRun = await ctx.db.get(args.sourceRunId)
    if (!sourceRun) {
      throw new Error('Source run not found')
    }

    const source = await ctx.db.get(sourceRun.sourceId) as SourceRow | null
    const finishedAt = args.finishedAt ?? Date.now()

    if (source) {
      for (const item of args.sourceItemUpserts ?? []) {
        const existing = await ctx.db
          .query('source_items')
          .withIndex('by_sourceId_externalId', (q: any) => q.eq('sourceId', sourceRun.sourceId).eq('externalId', item.externalId))
          .first()

        const patch = {
          sourceId: sourceRun.sourceId,
          tenantId: sourceRun.tenantId,
          itemType: item.itemType,
          externalId: item.externalId,
          canonicalUrl: item.canonicalUrl,
          title: item.title,
          publishedAt: item.publishedAt,
          lastSeenAt: item.lastSeenAt,
          lastFetchedAt: item.lastFetchedAt,
          status: item.status,
          rawHash: item.rawHash,
          normalizedHash: item.normalizedHash,
          r2ContentKey: item.r2ContentKey,
          r2MetaKey: item.r2MetaKey,
          lastIngestionRunId: args.sourceRunId,
          lastChangeDetectedAt: item.lastChangeDetectedAt,
          lastError: item.lastError,
        }

        if (existing) {
          await ctx.db.patch(existing._id, patch)
        }
        else {
          await ctx.db.insert('source_items', patch)
        }
      }
    }

    await ctx.db.patch(args.sourceRunId, {
      status: args.status,
      finishedAt,
      stats: args.stats,
      errors: args.errors.slice(0, 5),
      lastError: args.lastError,
    })

    if (source) {
      await finalizeSourceTimestamps(ctx, {
        source,
        runStatus: args.status,
        finishedAt,
        lastError: args.lastError,
      })
    }

    return {
      ok: true,
      sourceRunId: args.sourceRunId,
      finishedAt,
      sourceId: sourceRun.sourceId,
      sourceExists: Boolean(source),
      upsertedItemCount: (args.sourceItemUpserts ?? []).length,
    }
  },
})

export const finalizeBatchExecutionFromNuxt = internalMutation({
  args: {
    batchId: v.id('ingestion_batches'),
    finishedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId)
    if (!batch) {
      throw new Error('Batch not found')
    }

    const finalRuns = await ctx.db
      .query('source_runs')
      .withIndex('by_batchId', (q: any) => q.eq('batchId', args.batchId))
      .collect()

    const summary = aggregateBatchSummary(finalRuns as Array<{ status: string, stats: SourceRunStats }>)
    const changedCount = summary.itemsNew + summary.itemsChanged
    const terminalStatus = finalRuns.length === 0
      ? 'completed'
      : (summary.sourcesFailed === finalRuns.length && summary.sourcesSucceeded === 0 && summary.sourcesPartial === 0)
          ? 'failed'
          : changedCount > 0
              ? 'sync_pending'
              : 'completed'

    const finishedAt = args.finishedAt ?? Date.now()

    await ctx.db.patch(args.batchId, {
      status: terminalStatus,
      summary,
      finishedAt,
    })

    const updatedBatch = await ctx.db.get(args.batchId)
    return {
      ok: true,
      batchId: args.batchId,
      status: terminalStatus,
      summary,
      batch: updatedBatch,
    }
  },
})

export const createOrReuseAiSearchSyncJobForBatchFromNuxt = internalMutation({
  args: {
    batchId: v.id('ingestion_batches'),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId)
    if (!batch) {
      throw new Error('Batch not found')
    }

    if (batch.syncJobId) {
      const existing = await ctx.db.get(batch.syncJobId)
      if (existing) {
        return {
          ok: true,
          reused: true,
          syncJob: existing,
          syncJobId: existing._id,
          batchStatus: batch.status,
        }
      }
    }

    const syncJobId = await ctx.db.insert('ai_search_sync_jobs', {
      batchId: args.batchId,
      status: 'queued',
      attempts: 0,
    })

    await ctx.db.patch(args.batchId, {
      syncJobId,
    })

    const syncJob = await ctx.db.get(syncJobId)
    return {
      ok: true,
      reused: false,
      syncJob,
      syncJobId,
      batchStatus: batch.status,
    }
  },
})

export const markAiSearchSyncJobSubmittedFromNuxt = internalMutation({
  args: {
    syncJobId: v.id('ai_search_sync_jobs'),
    cloudflareJobId: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const syncJob = await ctx.db.get(args.syncJobId)
    if (!syncJob) {
      throw new Error('Sync job not found')
    }

    const submittedAt = args.submittedAt ?? Date.now()
    await ctx.db.patch(args.syncJobId, {
      status: 'submitted',
      cloudflareJobId: args.cloudflareJobId ?? syncJob.cloudflareJobId,
      submittedAt,
      attempts: (syncJob.attempts ?? 0) + 1,
      lastPolledAt: submittedAt,
      error: undefined,
    })

    await ctx.db.patch(syncJob.batchId, {
      status: 'syncing',
    })

    return {
      ok: true,
      syncJobId: args.syncJobId,
      batchId: syncJob.batchId,
      submittedAt,
    }
  },
})

export const updateAiSearchSyncJobFromNuxt = internalMutation({
  args: {
    syncJobId: v.id('ai_search_sync_jobs'),
    status: aiSearchSyncJobStatusValidator,
    cloudflareJobId: v.optional(v.string()),
    lastPolledAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    logSummary: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const syncJob = await ctx.db.get(args.syncJobId)
    if (!syncJob) {
      throw new Error('Sync job not found')
    }

    const patch: Record<string, unknown> = {
      status: args.status,
      cloudflareJobId: args.cloudflareJobId ?? syncJob.cloudflareJobId,
      lastPolledAt: args.lastPolledAt ?? Date.now(),
    }

    if (args.status === 'succeeded' || args.status === 'failed' || args.status === 'timeout') {
      patch.finishedAt = args.finishedAt ?? Date.now()
    }

    if (args.error !== undefined) {
      patch.error = args.error
    }

    if (args.logSummary !== undefined) {
      patch.logSummary = args.logSummary
    }

    await ctx.db.patch(args.syncJobId, patch)

    const batchStatus = args.status === 'succeeded'
      ? 'completed'
      : args.status === 'failed' || args.status === 'timeout'
        ? 'failed'
        : 'syncing'

    await ctx.db.patch(syncJob.batchId, {
      status: batchStatus,
      finishedAt: batchStatus === 'syncing' ? undefined : (args.finishedAt ?? Date.now()),
    })

    return {
      ok: true,
      syncJobId: args.syncJobId,
      batchId: syncJob.batchId,
      batchStatus,
      syncStatus: args.status,
    }
  },
})

export const listBatchesAsNuxtAdmin = internalQuery({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(batchStatusValidator),
  },
  handler: async (ctx, args) => {
    let rows = await ctx.db.query('ingestion_batches').collect()

    if (args.status) {
      rows = rows.filter((row: any) => row.status === args.status)
    }

    rows.sort((a: any, b: any) => {
      if (a.scheduledFor !== b.scheduledFor) {
        return b.scheduledFor - a.scheduledFor
      }
      return b._creationTime - a._creationTime
    })

    const limit = Math.max(1, Math.min(100, Math.floor(args.limit ?? 20)))
    return {
      items: rows.slice(0, limit),
    }
  },
})

export const getBatchDetailAsNuxtAdmin = internalQuery({
  args: {
    batchId: v.id('ingestion_batches'),
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId)
    if (!batch) {
      return null
    }

    const sourceRuns = await ctx.db
      .query('source_runs')
      .withIndex('by_batchId', (q: any) => q.eq('batchId', args.batchId))
      .collect()

    sourceRuns.sort((a: any, b: any) => a._creationTime - b._creationTime)

    const sourceMap = new Map<string, { _id: any, name: string, type: string }>()
    for (const run of sourceRuns) {
      const key = String(run.sourceId)
      if (sourceMap.has(key)) {
        continue
      }

      const source = await ctx.db.get(run.sourceId)
      if (source) {
        sourceMap.set(key, {
          _id: source._id,
          name: source.name,
          type: source.type,
        })
      }
    }

    const syncJob = batch.syncJobId ? await ctx.db.get(batch.syncJobId) : null

    return {
      batch,
      sourceRuns: sourceRuns.map((run: any) => ({
        ...run,
        source: sourceMap.get(String(run.sourceId)) ?? null,
      })),
      syncJob,
    }
  },
})

export const queueSourceRunRetryScaffold = internalMutation({
  args: {
    sourceRunId: v.id('source_runs'),
    requestedByUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const sourceRun = await ctx.db.get(args.sourceRunId)
    if (!sourceRun) {
      throw new Error('Source run not found')
    }

    if (sourceRun.status !== 'failed') {
      throw new Error('Only failed source runs can be queued for retry')
    }

    if (sourceRun.attempt >= sourceRun.maxAttempts) {
      throw new Error('Max attempts reached for source run')
    }

    const nextRetryAt = Date.now() + (60 * 1000)
    await ctx.db.patch(args.sourceRunId, {
      nextRetryAt,
    })

    return {
      ok: true,
      sourceRunId: args.sourceRunId,
      status: sourceRun.status,
      attempt: sourceRun.attempt,
      maxAttempts: sourceRun.maxAttempts,
      nextRetryAt,
      note: 'Phase 2 scaffold only. Automatic retry execution is not implemented yet.',
      requestedByUserId: args.requestedByUserId,
    }
  },
})
