import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  rag_admins: defineTable({
    userId: v.string(),
    email: v.optional(v.string()),
    createdAt: v.number(),
    grantedByUserId: v.optional(v.string()),
  })
    .index('by_userId', ['userId'])
    .index('by_email', ['email']),

  sources: defineTable({
    type: v.union(v.literal('website'), v.literal('youtube_channel')),
    status: v.union(
      v.literal('pending_approval'),
      v.literal('approved'),
      v.literal('rejected'),
      v.literal('paused'),
    ),
    name: v.string(),
    tenantId: v.string(),
    tags: v.array(v.string()),
    createdByUserId: v.string(),
    createdByEmail: v.optional(v.string()),
    approvedByUserId: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    rejectedByUserId: v.optional(v.string()),
    rejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    lastConfigUpdatedAt: v.number(),
    schedule: v.any(),
    crawlConfig: v.any(),
    enabled: v.boolean(),
    lastRunAt: v.optional(v.number()),
    lastSuccessAt: v.optional(v.number()),
    lastFailureAt: v.optional(v.number()),
    lastFailureReason: v.optional(v.string()),
    nextRunAt: v.optional(v.number()),
  })
    .index('by_status', ['status'])
    .index('by_type', ['type'])
    .index('by_tenantId', ['tenantId'])
    .index('by_status_tenantId', ['status', 'tenantId'])
    .index('by_createdByUserId', ['createdByUserId']),

  approval_audit_log: defineTable({
    sourceId: v.id('sources'),
    actorUserId: v.string(),
    actorEmail: v.optional(v.string()),
    action: v.union(
      v.literal('submit'),
      v.literal('approve'),
      v.literal('reject'),
      v.literal('pause'),
      v.literal('resume'),
      v.literal('edit'),
    ),
    timestamp: v.number(),
    reason: v.optional(v.string()),
    note: v.optional(v.string()),
    diffSummary: v.optional(v.string()),
  })
    .index('by_sourceId', ['sourceId'])
    .index('by_timestamp', ['timestamp']),

  source_items: defineTable({
    sourceId: v.id('sources'),
    tenantId: v.string(),
    itemType: v.union(v.literal('web_page'), v.literal('youtube_video')),
    externalId: v.string(),
    canonicalUrl: v.string(),
    title: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    lastSeenAt: v.number(),
    lastFetchedAt: v.optional(v.number()),
    status: v.union(
      v.literal('active'),
      v.literal('unavailable'),
      v.literal('blocked'),
      v.literal('deleted'),
    ),
    rawHash: v.optional(v.string()),
    normalizedHash: v.optional(v.string()),
    r2ContentKey: v.optional(v.string()),
    r2MetaKey: v.optional(v.string()),
    lastIngestionRunId: v.optional(v.id('source_runs')),
    lastChangeDetectedAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
  })
    .index('by_sourceId', ['sourceId'])
    .index('by_tenantId', ['tenantId'])
    .index('by_externalId', ['externalId'])
    .index('by_sourceId_externalId', ['sourceId', 'externalId'])
    .index('by_lastSeenAt', ['lastSeenAt']),

  ingestion_batches: defineTable({
    status: v.union(
      v.literal('queued'),
      v.literal('running'),
      v.literal('ingesting'),
      v.literal('sync_pending'),
      v.literal('syncing'),
      v.literal('completed'),
      v.literal('failed'),
    ),
    scheduledFor: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    trigger: v.union(v.literal('scheduled'), v.literal('manual')),
    sourceCount: v.number(),
    dueSourceIds: v.array(v.id('sources')),
    summary: v.object({
      sourcesSucceeded: v.number(),
      sourcesPartial: v.number(),
      sourcesFailed: v.number(),
      itemsNew: v.number(),
      itemsChanged: v.number(),
      itemsUnchanged: v.number(),
      itemsFailed: v.number(),
    }),
    syncJobId: v.optional(v.id('ai_search_sync_jobs')),
    idempotencyKey: v.string(),
    requestedByUserId: v.optional(v.string()),
    requestedByEmail: v.optional(v.string()),
  })
    .index('by_idempotencyKey', ['idempotencyKey'])
    .index('by_scheduledFor', ['scheduledFor'])
    .index('by_trigger', ['trigger']),

  source_runs: defineTable({
    batchId: v.id('ingestion_batches'),
    sourceId: v.id('sources'),
    tenantId: v.string(),
    status: v.union(
      v.literal('queued'),
      v.literal('running'),
      v.literal('succeeded'),
      v.literal('partial'),
      v.literal('failed'),
      v.literal('cancelled'),
    ),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    trigger: v.union(v.literal('scheduled'), v.literal('manual'), v.literal('retry')),
    stats: v.object({
      discovered: v.number(),
      fetched: v.number(),
      new: v.number(),
      changed: v.number(),
      unchanged: v.number(),
      failed: v.number(),
      skipped: v.number(),
    }),
    errors: v.array(v.object({
      code: v.string(),
      message: v.string(),
      retryable: v.optional(v.boolean()),
      timestamp: v.number(),
    })),
    attempt: v.number(),
    maxAttempts: v.number(),
    retryOfSourceRunId: v.optional(v.id('source_runs')),
    lastError: v.optional(v.string()),
    nextRetryAt: v.optional(v.number()),
  })
    .index('by_batchId', ['batchId'])
    .index('by_sourceId', ['sourceId'])
    .index('by_batchId_sourceId', ['batchId', 'sourceId'])
    .index('by_status', ['status']),

  ai_search_sync_jobs: defineTable({
    batchId: v.id('ingestion_batches'),
    status: v.union(
      v.literal('queued'),
      v.literal('submitted'),
      v.literal('running'),
      v.literal('succeeded'),
      v.literal('failed'),
      v.literal('timeout'),
    ),
    cloudflareJobId: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    attempts: v.number(),
    lastPolledAt: v.optional(v.number()),
    error: v.optional(v.string()),
    logSummary: v.optional(v.array(v.string())),
  })
    .index('by_batchId', ['batchId'])
    .index('by_status', ['status']),
})
