# Data Models

## Convex Domain Tables

- `rag_admins`
  - RAG administrator allowlist
  - Indexed by `userId` and `email`
- `sources`
  - Approved/pending source registry for `website` and `youtube_channel`
  - Stores schedule, crawl config, and status
- `approval_audit_log`
  - Tracks submit/approve/reject/pause/resume/edit actions
- `source_items`
  - Tracks discovered pages/videos, hashes, canonical URLs, and R2 keys
- `ingestion_batches`
  - Batch-level orchestration records
- `source_runs`
  - Per-source run records, stats, and retry/error details
- `ai_search_sync_jobs`
  - Cloudflare AI Search sync job lifecycle records

## SQL Auth Tables

The checked-in Drizzle migration defines Better Auth relational tables:

- `user`
- `session`
- `account`
- `verification`
- `jwks`

## Data Architecture Notes

- Auth/session persistence is relational.
- RAG orchestration and operational state are stored in Convex.
- Content payloads are intended to live outside Convex in Cloudflare R2, with metadata and job state stored locally.
