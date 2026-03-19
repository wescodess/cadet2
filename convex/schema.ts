import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const pathwayDirectOutcomeValidator = v.object({
  pathwayId: v.string(),
  status: v.literal('direct'),
})

const pathwayBlockedOutcomeValidator = v.object({
  pathwayId: v.string(),
  status: v.literal('blocked'),
  unmetConditions: v.array(v.string()),
})

const recommendationTierValidator = v.union(
  v.literal('strong-fit'),
  v.literal('conditional-fit'),
  v.literal('lower-confidence'),
)

const recommendationQualificationValidator = v.union(
  v.literal('supported'),
  v.literal('low-confidence'),
  v.literal('withheld'),
)

const recommendationConfidenceValidator = v.union(
  v.literal('high'),
  v.literal('medium'),
  v.literal('low'),
  v.literal('withheld'),
)

const recommendationFreshnessValidator = v.union(
  v.literal('fresh'),
  v.literal('stale'),
  v.literal('unknown'),
)

const recommendationFitSignalStateValidator = v.union(
  v.literal('strength'),
  v.literal('watch'),
  v.literal('gap'),
)

const recommendationFitSignalValidator = v.object({
  id: v.string(),
  label: v.string(),
  detail: v.string(),
  state: recommendationFitSignalStateValidator,
})

const recommendationBlockerSeverityValidator = v.union(
  v.literal('critical'),
  v.literal('high'),
  v.literal('medium'),
  v.literal('low'),
)

const recommendationTradeoffDimensionValidator = v.union(
  v.literal('effort'),
  v.literal('timing'),
  v.literal('complexity'),
  v.literal('cost'),
)

const recommendationTradeoffImpactValidator = v.union(
  v.literal('high'),
  v.literal('medium'),
  v.literal('low'),
)

const recommendationImprovementPriorityValidator = v.union(
  v.literal('now'),
  v.literal('next'),
  v.literal('later'),
)

const recommendationBlockerValidator = v.object({
  id: v.string(),
  label: v.string(),
  detail: v.string(),
  severity: recommendationBlockerSeverityValidator,
})

const recommendationTradeoffValidator = v.object({
  id: v.string(),
  dimension: recommendationTradeoffDimensionValidator,
  summary: v.string(),
  impact: recommendationTradeoffImpactValidator,
})

const recommendationImprovementActionValidator = v.object({
  id: v.string(),
  title: v.string(),
  detail: v.string(),
  priority: recommendationImprovementPriorityValidator,
  expectedImpact: v.string(),
})

const rankedDirectRecommendationValidator = v.object({
  pathwayId: v.string(),
  type: v.literal('direct'),
  rank: v.number(),
  tier: recommendationTierValidator,
  score: v.number(),
  rationale: v.optional(v.string()),
  fitSignals: v.optional(v.array(recommendationFitSignalValidator)),
  qualification: v.optional(recommendationQualificationValidator),
  confidence: v.optional(recommendationConfidenceValidator),
  freshness: v.optional(recommendationFreshnessValidator),
  caveat: v.optional(v.string()),
  blockers: v.optional(v.array(recommendationBlockerValidator)),
  tradeoffs: v.optional(v.array(recommendationTradeoffValidator)),
  improvementActions: v.optional(v.array(recommendationImprovementActionValidator)),
})

const rankedBlockedRecommendationValidator = v.object({
  pathwayId: v.string(),
  type: v.literal('blocked'),
  rank: v.number(),
  tier: recommendationTierValidator,
  score: v.number(),
  rationale: v.optional(v.string()),
  fitSignals: v.optional(v.array(recommendationFitSignalValidator)),
  qualification: v.optional(recommendationQualificationValidator),
  confidence: v.optional(recommendationConfidenceValidator),
  freshness: v.optional(recommendationFreshnessValidator),
  caveat: v.optional(v.string()),
  blockers: v.optional(v.array(recommendationBlockerValidator)),
  tradeoffs: v.optional(v.array(recommendationTradeoffValidator)),
  improvementActions: v.optional(v.array(recommendationImprovementActionValidator)),
})

const rankedComposedRecommendationValidator = v.object({
  pathwayId: v.string(),
  type: v.literal('composed'),
  rank: v.number(),
  tier: recommendationTierValidator,
  score: v.number(),
  composedSteps: v.array(v.string()),
  rationale: v.optional(v.string()),
  fitSignals: v.optional(v.array(recommendationFitSignalValidator)),
  qualification: v.optional(recommendationQualificationValidator),
  confidence: v.optional(recommendationConfidenceValidator),
  freshness: v.optional(recommendationFreshnessValidator),
  caveat: v.optional(v.string()),
  blockers: v.optional(v.array(recommendationBlockerValidator)),
  tradeoffs: v.optional(v.array(recommendationTradeoffValidator)),
  improvementActions: v.optional(v.array(recommendationImprovementActionValidator)),
})

export default defineSchema({
  recommendation_runs: defineTable({
    runId: v.string(),
    userId: v.string(),
    profileSnapshotId: v.string(),
    refreshedFromRunId: v.optional(v.string()),
    previousProfileSnapshotId: v.optional(v.string()),
    refreshRootRunId: v.optional(v.string()),
    refreshSequence: v.optional(v.number()),
    status: v.union(
      v.literal('queued'),
      v.literal('evaluating'),
      v.literal('completed'),
      v.literal('degraded'),
      v.literal('failed'),
    ),
    statusMessage: v.optional(v.string()),
    resumable: v.optional(v.boolean()),
    processingStartedAt: v.optional(v.number()),
    processingHeartbeatAt: v.optional(v.number()),
    pathwayEvaluation: v.optional(v.object({
      evaluatedAt: v.number(),
      evaluatorVersion: v.string(),
      direct: v.array(pathwayDirectOutcomeValidator),
      blocked: v.array(pathwayBlockedOutcomeValidator),
    })),
    recommendationResults: v.optional(v.object({
      rankedAt: v.number(),
      rankerVersion: v.string(),
      noComposedReason: v.optional(v.string()),
      direct: v.array(rankedDirectRecommendationValidator),
      blocked: v.array(rankedBlockedRecommendationValidator),
      composed: v.array(rankedComposedRecommendationValidator),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_runId', ['runId'])
    .index('by_userId', ['userId'])
    .index('by_userId_createdAt', ['userId', 'createdAt']),

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
    description: v.optional(v.string()),
    tenantId: v.string(),
    tags: v.array(v.string()),
    linkedPathwayIds: v.optional(v.array(v.string())),
    trustScore: v.optional(v.number()),
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
      transcriptAttempted: v.optional(v.number()),
      transcriptSucceeded: v.optional(v.number()),
      transcriptSucceededInnerTubeAndroid: v.optional(v.number()),
      transcriptSucceededApi: v.optional(v.number()),
      transcriptSucceededCaptionsXml: v.optional(v.number()),
      transcriptSucceededWithTimestamps: v.optional(v.number()),
      transcriptDescriptionFallback: v.optional(v.number()),
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
      transcriptAttempted: v.optional(v.number()),
      transcriptSucceeded: v.optional(v.number()),
      transcriptSucceededInnerTubeAndroid: v.optional(v.number()),
      transcriptSucceededApi: v.optional(v.number()),
      transcriptSucceededCaptionsXml: v.optional(v.number()),
      transcriptSucceededWithTimestamps: v.optional(v.number()),
      transcriptDescriptionFallback: v.optional(v.number()),
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
