# Custom RAG Ingestion V1 Jobs, State Machine, and Retries (Draft)

## Scope

This document defines operational behavior for:

- Scheduling
- Batch and source-run state transitions
- Idempotency
- Retries/backoff
- Timeout handling
- Partial-failure policy

## Scheduling Rules (V1)

- Default source frequency is `daily`
- Frequency is configurable per source
- Scheduler only selects sources where:
  - `status = approved`
  - `enabled = true`
  - `nextRunAt <= now` (or daily due calculation)
- Manual runs can override due-time checks for explicit source IDs

## Recommended Execution Model

- One ingestion batch per scheduler tick
- One source run per approved due source
- Each source run processes items in bounded page/video batches
- AI Search sync occurs after ingestion writes complete for the batch

This keeps sync costs and operations predictable.

## Batch State Machine

States:

- `queued`
- `running`
- `ingesting`
- `sync_pending`
- `syncing`
- `completed`
- `failed`

Transitions:

1. `queued` -> `running`
2. `running` -> `ingesting`
3. `ingesting` -> `sync_pending` (all source runs completed or terminal)
4. `sync_pending` -> `syncing` (if sync required)
5. `syncing` -> `completed` (sync success)
6. `syncing` -> `failed` (sync failed/timeout)
7. `ingesting` -> `completed` (if no content changes and sync skipped)

## Source Run State Machine

States:

- `queued`
- `running`
- `succeeded`
- `partial`
- `failed`
- `cancelled`

Policy:

- `succeeded`: no critical errors; items may be unchanged
- `partial`: some items failed but meaningful progress occurred
- `failed`: adapter-level fatal error or zero useful progress due to system fault

## AI Search Sync Job State Machine

States:

- `queued`
- `submitted`
- `running`
- `succeeded`
- `failed`
- `timeout`

Sync trigger rules:

- Submit sync only if batch has `itemsNew + itemsChanged > 0` or cleanup deletes occurred
- Skip sync if all results are unchanged

## Idempotency Strategy

## Batch-level idempotency

Each scheduled batch should use a deterministic `idempotencyKey`, for example:

- `scheduled:{yyyy-mm-dd}:{tenant|global}`

Manual batches:

- Caller-provided `idempotencyKey`, or generated UUID if true repeat execution is intended

Behavior:

- If a batch with the same key is already `queued|running|ingesting|syncing`, return existing batch
- If a previous batch with same key `completed`, return existing batch unless `force=true`

## Item-level idempotency

For each source item:

- Use deterministic `externalId` (canonical URL or YouTube `videoId`)
- Upsert `source_items`
- Use `normalizedHash` to skip redundant R2 writes

This prevents duplicate corpus growth while using overwrite storage.

## Retry Policy (V1)

## Adapter retries (network/transient)

Retryable cases:

- timeouts
- 429s
- 5xx upstream errors
- transient transcript fetch failures

Recommended policy:

- Max attempts: `3`
- Backoff: exponential with jitter
- Respect upstream retry-after if provided

Non-retryable cases:

- invalid config (bad domain/channel ID)
- blocked access requiring manual auth/header changes
- parsing unsupported content type

## Source run retries

- Automatic retry once only for `failed` runs caused by transient infrastructure errors
- Do not auto-retry source runs that exceed crawl budget or violate config rules

## AI Search sync retries

- Retry sync submission/polling on transient Cloudflare API failures
- Max submission attempts: `3`
- Poll until terminal state or timeout window expires

## Timeout Guidance (V1)

Timeouts should exist at multiple layers:

- Per HTTP fetch
- Per item extraction
- Per source run
- Per batch
- Per sync job poll window

Recommended v1 behavior:

- Mark terminal status and persist failure reason instead of hanging
- Preserve partial results already written to R2
- Allow next daily batch to continue from latest state

## Partial Failure Policy (Important)

V1 should prefer progress over all-or-nothing behavior.

Rules:

- A source run with some failed items can still be `partial`
- A batch with some `failed` or `partial` source runs can still proceed to sync if there are changed writes
- Batch summary must clearly separate `changed`, `unchanged`, and `failed`

This keeps the knowledge base fresh even when some sources are unstable.

## Deletion / Missing Item Handling

V1 conservative policy:

- Mark item unavailable/deleted after failed discovery/fetch rules are met
- Optional grace period before deleting R2 objects
- Cleanup runs should be tracked as normal ingestion work
- Trigger AI Search sync after cleanup changes

## Observability (Minimum V1)

Capture metrics/events for:

- batch duration
- source run duration
- pages/videos processed
- new/changed/unchanged/failed counts
- retry counts
- sync duration and status
- top failure reasons

These metrics are necessary to tune crawl budgets and frequency later.

## Failure Escalation Examples

- Repeated 429s for same domain -> reduce per-run page budget or add domain throttling
- Transcript fetch failures for a channel -> mark source `partial`, alert admin to transcript availability issue
- Repeated sync timeouts -> split batches or inspect Cloudflare AI Search job logs
