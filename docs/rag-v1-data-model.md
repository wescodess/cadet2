# Custom RAG Ingestion V1 Data Model (Draft)

## Scope

This document defines:

- Convex tables for source management and job orchestration
- Normalized document model used before writing to R2
- R2 object key conventions
- Citation metadata requirements for answer responses

## Design Principles

- Convex stores orchestration state, not the primary knowledge corpus
- R2 stores normalized documents for AI Search indexing
- Metadata must support filtering, provenance, freshness, and citations
- V1 uses overwrite semantics in R2 (no document version history)

## Convex Tables (Draft)

## `sources`

Purpose:

- Source registry with approval and scheduling config

Fields:

- `_id`
- `type`: `'website' | 'youtube_channel'`
- `status`: `'pending_approval' | 'approved' | 'rejected' | 'paused'`
- `name`: string
- `tenantId`: string (or `'default'` for single-tenant v1)
- `tags`: string[]
- `createdByUserId`: string
- `approvedByUserId?`: string
- `approvedAt?`: number (ms epoch)
- `lastConfigUpdatedAt`: number (ms epoch)
- `schedule`: object
- `schedule.frequency`: `'daily' | 'manual' | 'interval'`
- `schedule.intervalHours?`: number
- `schedule.nextRunAt?`: number (derived or cached)
- `crawlConfig`: source-type-specific object
- `enabled`: boolean
- `lastRunAt?`: number
- `lastSuccessAt?`: number
- `lastFailureAt?`: number
- `lastFailureReason?`: string

`crawlConfig` for `website`:

- `seedUrls`: string[]
- `allowedDomains`: string[]
- `includePatterns`: string[]
- `excludePatterns`: string[]
- `maxDepth`: number
- `maxPagesPerRun`: number
- `renderMode`: `'static' | 'rendered'` (default `static`)
- `requestHeadersRef?`: string
- `respectRobots`: boolean

`crawlConfig` for `youtube_channel`:

- `channelId`: string
- `channelUrl`: string
- `maxVideosPerRun`: number
- `includeShorts`: boolean
- `preferredLanguage?`: string

## `source_items`

Purpose:

- Track source-level content units (pages/videos) for dedupe and freshness

Fields:

- `_id`
- `sourceId`: Id of `sources`
- `tenantId`: string
- `itemType`: `'web_page' | 'youtube_video'`
- `externalId`: string (canonical URL for pages, `videoId` for videos)
- `canonicalUrl`: string
- `title?`: string
- `publishedAt?`: number
- `lastSeenAt`: number
- `lastFetchedAt?`: number
- `status`: `'active' | 'unavailable' | 'blocked' | 'deleted'`
- `rawHash?`: string
- `normalizedHash?`: string
- `r2ContentKey?`: string
- `r2MetaKey?`: string
- `lastIngestionRunId?`: Id of `source_runs`
- `lastChangeDetectedAt?`: number
- `lastError?`: string

Indexes (recommended):

- by `sourceId`
- by `tenantId`
- by `externalId`
- by `sourceId + externalId`
- by `lastSeenAt`

## `source_runs`

Purpose:

- One execution record per source within a batch

Fields:

- `_id`
- `batchId`: Id of `ingestion_batches`
- `sourceId`: Id of `sources`
- `tenantId`: string
- `status`: `'queued' | 'running' | 'succeeded' | 'partial' | 'failed' | 'cancelled'`
- `startedAt?`: number
- `finishedAt?`: number
- `trigger`: `'scheduled' | 'manual' | 'retry'`
- `stats`: object
- `stats.discovered`: number
- `stats.fetched`: number
- `stats.new`: number
- `stats.changed`: number
- `stats.unchanged`: number
- `stats.failed`: number
- `stats.skipped`: number
- `errors`: array (small capped summary)

## `ingestion_batches`

Purpose:

- Batch-level orchestration record for a scheduler cycle

Fields:

- `_id`
- `status`: `'queued' | 'running' | 'ingesting' | 'sync_pending' | 'syncing' | 'completed' | 'failed'`
- `scheduledFor`: number
- `startedAt?`: number
- `finishedAt?`: number
- `trigger`: `'scheduled' | 'manual'`
- `sourceCount`: number
- `dueSourceIds`: Id[]
- `summary`: object
- `summary.sourcesSucceeded`: number
- `summary.sourcesPartial`: number
- `summary.sourcesFailed`: number
- `summary.itemsNew`: number
- `summary.itemsChanged`: number
- `summary.itemsUnchanged`: number
- `summary.itemsFailed`: number
- `syncJobId?`: Id of `ai_search_sync_jobs`
- `idempotencyKey`: string

## `ai_search_sync_jobs`

Purpose:

- Track Cloudflare AI Search sync job lifecycle and logs summary

Fields:

- `_id`
- `batchId`: Id of `ingestion_batches`
- `status`: `'queued' | 'submitted' | 'running' | 'succeeded' | 'failed' | 'timeout'`
- `cloudflareJobId?`: string
- `submittedAt?`: number
- `finishedAt?`: number
- `attempts`: number
- `lastPolledAt?`: number
- `error?`: string
- `logSummary?`: string[]

## `approval_audit_log` (optional but recommended in v1)

Purpose:

- Audit source approval/rejection/pausing changes

Fields:

- `_id`
- `sourceId`
- `actorUserId`
- `action`: `'submit' | 'approve' | 'reject' | 'pause' | 'resume' | 'edit'`
- `timestamp`
- `reason?`
- `diffSummary?`

## Normalized Document Shape (Pre-R2)

All adapters must normalize into a common structure before dedupe/write:

```ts
type NormalizedDocument = {
  documentId: string
  tenantId: string
  sourceId: string
  sourceType: 'website' | 'youtube_channel'
  itemType: 'web_page' | 'youtube_video'
  externalId: string
  canonicalUrl: string
  title: string
  contentText: string
  contentMarkdown?: string
  snippetSeed?: string
  tags: string[]
  language?: string
  publishedAt?: string
  fetchedAt: string
  timestampStartSec?: number
  timestampEndSec?: number
  metadata: Record<string, string | number | boolean | null>
  rawHash: string
  normalizedHash: string
}
```

Notes:

- `timestampStartSec` / `timestampEndSec` are primarily for YouTube transcript sections.
- `metadata` should remain mostly flat for easy filterability.
- `contentText` is required for indexing consistency.

## R2 Object Key Conventions (V1 Overwrite)

V1 policy is overwrite, so maintain stable keys.

Content object:

- `rag/{tenantId}/{sourceType}/{sourceId}/{itemType}/{itemId}/latest.md`

Metadata sidecar:

- `rag/{tenantId}/{sourceType}/{sourceId}/{itemType}/{itemId}/meta.json`

Examples:

- `rag/default/website/src_docs_001/web_page/page_abc123/latest.md`
- `rag/default/youtube_channel/src_yt_003/youtube_video/vid_dQw4w9WgXcQ/meta.json`

`itemId` generation (recommended):

- Deterministic hash of canonical URL or video ID
- ASCII-safe base16/base32 string

## Metadata Fields Required for Citation Rendering

Minimum metadata stored in `meta.json` and included in searchable content metadata:

- `title`
- `canonical_url`
- `source_type`
- `source_id`
- `item_type`
- `external_id`
- `published_at` (if known)
- `fetched_at`
- `timestamp_start_sec` (nullable)
- `timestamp_end_sec` (nullable)

This supports v1 citation output:

- `url`
- `snippet`
- `timestamp` (derived from `timestamp_start_sec`, when present)

## Dedupe Rules (V1)

Decision matrix:

- `rawHash same` and `normalizedHash same` -> mark `unchanged`, skip R2 write
- `rawHash changed`, `normalizedHash same` -> mark `unchanged` for retrieval purposes, optionally update metadata timestamps
- `normalizedHash changed` -> overwrite R2 content + meta, mark `changed`

## Deletion / Disappearance Handling (V1)

Website pages and videos may disappear.

V1 policy:

- Mark `source_items.status = 'deleted' | 'unavailable'`
- Record `lastSeenAt`
- Optional cleanup job removes stale R2 objects after grace period
- Run AI Search sync after cleanup batches to drop deleted content from index

This avoids immediate accidental removal due to transient upstream failures.
