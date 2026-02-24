# Custom RAG Ingestion V1 Implementation Plan (Draft)

## Goal

Deliver a usable v1 that ingests approved sources daily into R2, syncs Cloudflare AI Search, and answers questions with citations using OpenRouter via Cloudflare AI Gateway.

## Principles

- Build observability and approval controls early
- Use retrieval-only debugging before answer quality tuning
- Prefer static website crawling by default, render mode opt-in
- Keep storage overwrite semantics simple in v1

## Phase 0: Foundation Alignment (No ingestion yet)

Outcomes:

- Confirm Cloudflare resources exist (R2 bucket, AI Search instance, AI Gateway route)
- Confirm environment variable naming and secret ownership
- Confirm admin authorization rules for source approval

Artifacts:

- Environment checklist
- Finalized API contract deltas vs these drafts

Acceptance checkpoints:

- Team agrees on source approval flow
- Team agrees on citation schema (`url`, `snippet`, `timestamp`)
- Team agrees on v1 source scope list

## Phase 1: Source Registry + Approval Workflow

Build:

- Convex `sources` table and audit log
- Admin APIs/UI to add source and approve/reject/pause
- Validation for website and YouTube source configs
- Configurable schedule fields (default `daily`)

Acceptance checkpoints:

- Admin can submit website source (pending approval)
- Admin can submit YouTube channel source (pending approval)
- Admin can approve source and set/adjust frequency
- Source list shows status and last run timestamps

## Phase 2: Ingestion Orchestrator + Job Tracking

Build:

- `ingestion_batches`, `source_runs`, `source_items`, `ai_search_sync_jobs`
- Scheduler entrypoint (daily) + manual run endpoint
- Idempotency keys for scheduled/manual batches
- Base job status transitions + retry scaffolding

Acceptance checkpoints:

- Manual run creates batch and source runs
- Scheduler only includes approved + enabled + due sources
- Failed source run does not crash entire batch
- Batch summary correctly aggregates source run stats

## Phase 3: Website Adapter (Static-first)

Build:

- URL canonicalization
- Domain/path rules enforcement
- Static fetch + readable-content extraction
- Crawl depth/page budget limits
- Normalized document generation + hashes
- Upsert `source_items` + R2 writes (overwrite)

Acceptance checkpoints:

- Website pages are discovered and normalized
- Unchanged pages skip R2 overwrite
- Changed pages overwrite `latest.md` and `meta.json`
- Crawl obeys include/exclude/domain rules

## Phase 4: YouTube Adapter

Build:

- Channel polling
- Video discovery state
- Transcript retrieval and normalization
- Timestamp-preserving chunk/document strategy
- Upsert `source_items` + R2 writes (overwrite)

Acceptance checkpoints:

- New videos ingest into R2
- Transcript sections preserve timestamps for citations
- Missing transcripts produce partial errors, not batch failure

## Phase 5: AI Search Sync Integration

Build:

- Sync trigger after batch writes
- Sync polling/status tracking
- Logs summary capture
- Sync skip when no content changes

Acceptance checkpoints:

- Batch with changed items triggers sync
- Batch with only unchanged items skips sync
- Sync status visible in admin batch detail

## Phase 6: Retrieval + Answer API (Citations)

Build:

- Retrieval pipeline using AI Search `search` mode
- Evidence formatter for prompt input
- Answer generation via OpenRouter through Cloudflare AI Gateway
- Citation extraction/formatting (`url`, `snippet`, `timestamp`)
- Guardrails for no-evidence scenarios

Acceptance checkpoints:

- Retrieval-only endpoint returns inspectable results
- Answer endpoint returns citations only from retrieved evidence
- YouTube citations include timestamp when available

## Phase 7: Ops Hardening (V1.1 candidate if needed)

Build:

- Domain throttling and rate controls
- Better retry/backoff tuning
- Cleanup job for deleted/unavailable items
- Basic ingestion/quality metrics dashboard
- Small relevance evaluation set

Acceptance checkpoints:

- Repeated transient failures are retried and visible
- Cleanup changes are reflected in AI Search after sync
- Admin can identify stale or noisy sources quickly

## Suggested Implementation Order (Pragmatic)

1. Source registry + approval
2. Orchestrator + job tracking
3. Website adapter (static)
4. R2 writes + dedupe
5. AI Search sync
6. Retrieval-only QA loop
7. Answer API (AI Gateway/OpenRouter)
8. YouTube adapter

Alternative order:

- Swap steps 7 and 8 if early video support is critical

## V1 Acceptance Definition (Product-Level)

V1 is complete when:

- Approved sources can be ingested on a daily schedule
- Frequency is configurable per source
- Data is written to R2 and synced into AI Search
- Search returns relevant evidence from ingested sources
- Answers are generated with citations (`URL + snippet + timestamp`)
- Admin can inspect source status, batch outcomes, and sync failures

## Open Questions To Resolve Before Coding

- Website extraction library choice (readability-focused vs custom parsing)
- YouTube transcript provider strategy and fallback behavior
- Exact AI Gateway route naming and auth setup for OpenRouter
- Whether answer endpoint should stream responses in v1
- Tenant model: single-tenant now with future expansion, or multi-tenant from day 1
