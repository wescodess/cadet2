# Custom RAG Ingestion V1 Architecture (Draft)

## Goal

Build a custom ingestion pipeline that:

- Collects content from approved sources (websites, YouTube channels)
- Normalizes content into a consistent document format
- Stores normalized documents in Cloudflare R2
- Uses Cloudflare AI Search (R2 data source) for retrieval
- Uses OpenRouter via Cloudflare AI Gateway for answer generation
- Returns answers with citations (`URL + snippet + timestamp`)

## Non-Goals (V1)

- Full source version history in R2
- AI Search website crawler integration
- Arbitrary real-time crawling on user query
- Advanced eval dashboards

## Existing Repo Capabilities (Already Present)

- Nuxt server runtime config includes Cloudflare AI Search settings (`accountId`, `apiToken`, `instanceName`, `instanceId`)
- Server-side query proxy for Cloudflare AI Search
- Support for retrieval-only (`search`) and retrieve+generate (`ai-search`) query modes

These allow v1 to focus on ingestion/orchestration and a separate answer composition layer.

## High-Level Flow

1. Admin adds a source (website or YouTube channel)
2. Source remains `pending_approval`
3. Admin approves source and configures schedule/rules
4. Scheduler creates an ingestion batch for due sources
5. Source adapter fetches content
6. Normalizer extracts clean text/markdown + metadata
7. Deduper checks content hash
8. Changed content is written to R2 (overwrite latest)
9. Batch triggers Cloudflare AI Search sync job
10. Query API uses AI Search retrieval (`search`)
11. Answer API composes final response using OpenRouter via AI Gateway + retrieved evidence
12. Client receives answer + citations (`url`, `snippet`, `timestamp?`)

## Recommended Component Boundaries

## 1. Source Management (Nuxt + Convex)

Responsibilities:

- Add sources
- Validate basic shape (URL, channel ID/URL, rules)
- Approval workflow (`pending`, `approved`, `rejected`, `paused`)
- Schedule configuration (daily default, configurable later)

Notes:

- Keep approval explicit to prevent accidental ingestion of low-quality or risky sources.

## 2. Scheduler / Orchestrator (Convex-centered)

Responsibilities:

- Determine which approved sources are due
- Create batch/job records
- Enforce idempotency (avoid duplicate runs)
- Dispatch source-specific work
- Aggregate outcomes (new/changed/unchanged/failed)

V1 scheduling rule:

- Daily default for all sources
- Frequency stored per source (`daily`, `custom cron-like later`, `manual`)

## 3. Source Adapters (Custom Ingestion)

### Website Adapter

- Static-first HTML fetch + extraction
- Optional rendered/headless mode per source
- Domain allow-list enforcement
- Include/exclude path pattern rules
- Depth/page-budget limits
- URL canonicalization

### YouTube Adapter

- Poll channel uploads
- Fetch transcript/captions (or fallback handling)
- Normalize transcript into searchable sections
- Preserve timestamps for citation output

## 4. Normalization + Dedupe

Responsibilities:

- Transform source-specific payloads into a common document shape
- Extract metadata for filtering/citation
- Compute stable content hash
- Decide `unchanged` vs `overwrite`

V1 storage policy:

- Overwrite `latest` object in R2
- No retained historical versions

## 5. Storage + Indexing

### R2 (source of indexed documents)

- Store normalized content and metadata sidecar
- Stable object key format for easy reprocessing and debugging

### Cloudflare AI Search (R2 data source)

- Handles chunking, embeddings, indexing, and retrieval
- Trigger sync after ingestion batches (not per item)

## 6. Retrieval + Answering

### Retrieval (AI Search)

- Use `search` mode for retrieval-only
- Tune with filters, rewrite, reranking, max results, score threshold

### Generation (OpenRouter via Cloudflare AI Gateway)

- Send user query + selected retrieved chunks
- Instruct model to answer only from evidence
- Return citations with URL/snippet/timestamp

Why this split:

- Better debugging (retrieval quality is inspectable)
- Provider flexibility
- More control over prompt/citation formatting

## Core Metadata Strategy (V1)

Every normalized document should carry enough metadata for:

- Filtering (`tenant`, `source_type`, `source_id`, tags)
- Provenance (`url`, `title`, `published_at`)
- Citation rendering (`timestamp_start`, `timestamp_end` for video sections)
- Freshness (`fetched_at`, `last_seen_at`)

Recommended metadata fields are specified in `docs/rag-v1-data-model.md`.

## Security / Safety Considerations (V1)

- Only approved sources are eligible for ingestion
- Per-source domain allow-list for website crawls
- Request throttling and robots-aware behavior for custom crawler
- Secrets stored server-side only (AI Search token, AI Gateway, OpenRouter credentials)
- Sanitize extracted HTML -> text/markdown before indexing
- Audit log for approvals and source changes

## Operational Priorities (V1)

- Freshness visibility per source
- Failure visibility per run and per item
- AI Search sync status/logs tracking
- Retrieval quality review using retrieval-only mode before tuning prompts

## V1 Success Criteria

- Admin can add and approve sources
- Daily jobs ingest approved sources
- Changed content lands in R2 and syncs to AI Search
- Queries return relevant results with provenance metadata
- Answer endpoint returns citations with URL + snippet + timestamp (when applicable)
