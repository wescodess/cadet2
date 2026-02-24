# Custom RAG Ingestion V1 API Contracts (Draft)

## Scope

This document defines draft API contracts for:

- Source add/approve management
- Ingestion batch execution
- AI Search sync triggering/status
- Retrieval-only search
- Answer generation with citations (OpenRouter via AI Gateway)

These are internal contracts for v1 design alignment, not final public APIs.

## API Surface Summary

Recommended split:

- Nuxt server routes for admin/client-facing endpoints
- Convex mutations/actions/queries for orchestration/state transitions
- Utility adapters for external services (R2, AI Search, OpenRouter/AI Gateway)

## 1. Source Management APIs

## `POST /api/admin/sources`

Purpose:

- Submit a new source for approval

Request (website):

```json
{
  "type": "website",
  "name": "Example Docs",
  "tenantId": "default",
  "tags": ["docs", "product"],
  "crawlConfig": {
    "seedUrls": ["https://example.com/docs"],
    "allowedDomains": ["example.com"],
    "includePatterns": ["**/docs/**"],
    "excludePatterns": ["**/changelog/**"],
    "maxDepth": 3,
    "maxPagesPerRun": 200,
    "renderMode": "static",
    "respectRobots": true
  },
  "schedule": {
    "frequency": "daily"
  }
}
```

Request (YouTube):

```json
{
  "type": "youtube_channel",
  "name": "Channel Name",
  "tenantId": "default",
  "tags": ["youtube", "tutorials"],
  "crawlConfig": {
    "channelId": "UCxxxx",
    "channelUrl": "https://www.youtube.com/@channel",
    "maxVideosPerRun": 25,
    "includeShorts": false
  },
  "schedule": {
    "frequency": "daily"
  }
}
```

Response:

```json
{
  "ok": true,
  "sourceId": "src_123",
  "status": "pending_approval"
}
```

Validation rules (v1):

- `schedule.frequency` defaults to `daily` if omitted
- `renderMode` defaults to `static`
- `status` is always created as `pending_approval`

## `POST /api/admin/sources/:id/approve`

Purpose:

- Approve and optionally adjust schedule/config before activation

Request:

```json
{
  "schedule": {
    "frequency": "daily"
  },
  "enabled": true,
  "note": "Approved for v1 ingestion"
}
```

Response:

```json
{
  "ok": true,
  "sourceId": "src_123",
  "status": "approved"
}
```

## `POST /api/admin/sources/:id/reject`

Purpose:

- Reject source with reason

Request:

```json
{
  "reason": "Insufficient source quality"
}
```

## `PATCH /api/admin/sources/:id`

Purpose:

- Update source configuration (patterns, caps, schedule, render mode)

Rules:

- Approval changes require separate approve/reject endpoints
- Significant config changes should write to audit log

## `GET /api/admin/sources`

Filters:

- `status`
- `type`
- `enabled`
- `tenantId`

## 2. Ingestion Orchestration APIs

## `POST /api/admin/ingestion/run`

Purpose:

- Trigger a manual ingestion batch (all due sources or specific subset)

Request:

```json
{
  "mode": "manual",
  "sourceIds": ["src_123", "src_456"],
  "idempotencyKey": "manual-2026-02-24T10:00Z"
}
```

Response:

```json
{
  "ok": true,
  "batchId": "batch_001",
  "status": "queued"
}
```

## `GET /api/admin/ingestion/batches`

Purpose:

- List recent ingestion batches and summaries

## `GET /api/admin/ingestion/batches/:id`

Purpose:

- Batch detail including source run summaries and sync job state

## `POST /api/internal/scheduler/daily-ingestion`

Purpose:

- Scheduler/cron entrypoint (protected)

Behavior:

- Finds approved + enabled + due sources
- Creates batch with deterministic idempotency key
- Starts orchestration

Security:

- Internal secret or signed request only

## 3. AI Search Sync APIs (Internal/Admin)

## `POST /api/internal/ai-search/sync`

Purpose:

- Submit sync for an ingestion batch after writes complete

Request:

```json
{
  "batchId": "batch_001"
}
```

Response:

```json
{
  "ok": true,
  "syncJobId": "sync_001",
  "status": "submitted"
}
```

## `GET /api/admin/ai-search/sync-jobs/:id`

Purpose:

- Inspect sync job status and summarized logs/errors

## 4. Retrieval API (Existing + Extended)

Current repo already has:

- `POST /api/ai-search/query`

V1 recommendation:

- Keep this endpoint for retrieval-only and debugging
- Add optional normalized citation extraction on server response
- Prefer `mode = search` for the answer pipeline

Request (retrieval-only):

```json
{
  "mode": "search",
  "query": "How do we configure ingestion frequency?",
  "rewriteQuery": true,
  "maxNumResults": 8,
  "scoreThreshold": 0.25,
  "filters": {
    "tenantId": "default"
  }
}
```

Response (shape sketch):

```json
{
  "ok": true,
  "mode": "search",
  "result": {
    "data": [
      {
        "content": "...",
        "score": 0.91,
        "attributes": {
          "canonical_url": "https://example.com/docs/ingestion",
          "title": "Ingestion Docs",
          "timestamp_start_sec": null
        }
      }
    ]
  }
}
```

## 5. Answer API (OpenRouter via AI Gateway)

## `POST /api/answers`

Purpose:

- Retrieve from AI Search, then generate final answer with citations using OpenRouter through Cloudflare AI Gateway

Request:

```json
{
  "query": "What is the ingestion schedule policy?",
  "tenantId": "default",
  "filters": {
    "source_type": ["website", "youtube_channel"]
  },
  "retrieval": {
    "rewriteQuery": true,
    "maxNumResults": 8,
    "scoreThreshold": 0.2,
    "reranking": {
      "enabled": true
    }
  },
  "answer": {
    "model": "openrouter/<model-alias>",
    "temperature": 0.2
  }
}
```

Response:

```json
{
  "ok": true,
  "answer": "Daily is the default frequency in v1, and frequency is configurable per source...",
  "citations": [
    {
      "url": "https://example.com/docs/ingestion",
      "snippet": "Default ingestion cadence is daily, with configurable frequency per source.",
      "timestamp": null,
      "title": "Ingestion Docs"
    },
    {
      "url": "https://www.youtube.com/watch?v=abc123",
      "snippet": "We run this once per day for now...",
      "timestamp": "00:02:14",
      "title": "Architecture Q&A"
    }
  ],
  "retrieval": {
    "resultsUsed": 5,
    "endpointStyle": "instances-api"
  }
}
```

Behavior requirements:

- If retrieval returns no evidence, answer API should return `answer = null` or a constrained fallback response
- LLM must be instructed not to invent citations
- Citations must be derived from retrieved chunks only

## 6. Convex Function Contract Sketches (Internal)

Queries:

- `sources:list`
- `sources:get`
- `ingestionBatches:listRecent`
- `ingestionBatches:getDetail`
- `syncJobs:get`

Mutations:

- `sources:createPending`
- `sources:updateConfig`
- `sources:approve`
- `sources:reject`
- `sources:pause`
- `ingestion:createBatch`
- `ingestion:updateBatchStatus`
- `sourceRuns:create`
- `sourceRuns:update`
- `sourceItems:upsertFromNormalized`
- `syncJobs:create`
- `syncJobs:update`

Actions (external I/O):

- `ingestion:runSourceWebsite`
- `ingestion:runSourceYoutube`
- `storage:writeR2Document`
- `aiSearch:triggerSync`
- `aiSearch:pollSyncStatus`
- `answers:generateWithGateway`

## API Security and Auth Notes (V1)

- Admin source/ingestion endpoints require authenticated admin access
- Internal scheduler/sync endpoints require service authentication
- External provider secrets (AI Gateway/OpenRouter/AI Search tokens) remain server-side only
- Add request logging with redaction for secrets and prompts
