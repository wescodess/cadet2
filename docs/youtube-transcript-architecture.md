# YouTube Video Ingestion — Full Pipeline

This document covers the complete YouTube ingestion pipeline from channel input to KB item storage.

---

## 1. Entry Points (How Ingestion Is Triggered)

There are three ways ingestion starts:

### A. Scheduled (Target-Based Scheduler)

**File:** [`workers/schedule-ingestion-targets.ts`](file:///Users/wesleyukadike/Desktop/cadet/workers/schedule-ingestion-targets.ts)

- The scheduler queries `kb_source_targets` for rows where `next_run_at ≤ now`, `is_active = true`, and no active lock or backoff.
- Filters for the `youtube_uploads` adapter.
- Resolves the channel ID from `source_external_id`, `metadata.channel_id`, or by parsing the `target_url`.
- Acquires a **distributed lock** on the target (15-minute TTL) to prevent duplicate runs.
- Calls `ingestChannel(channelId, runId, youtube, sourceId, client, targetId)`.
- On success: resets `consecutive_failures`, computes `next_run_at` using `interval_minutes` + random jitter.
- On failure: increments `consecutive_failures`, applies **exponential backoff** (capped at 24 hours).

### B. Manual Bulk Trigger (All Channels)

**Endpoint:** `POST /api/ops/ingestion/trigger-youtube`  
**File:** [`server/api/ops/ingestion/trigger-youtube.post.ts`](file:///Users/wesleyukadike/Desktop/cadet/server/api/ops/ingestion/trigger-youtube.post.ts)

- Requires `admin` or `ops` role.
- Calls `ingestAllChannels(client)`, which queries **all active, non-quarantined** YouTube sources from `kb_sources` and processes them via `Promise.allSettled`.

### C. Manual Single-Source Trigger

**Endpoint:** `POST /api/ops/ingestion/:id/trigger`  
**File:** [`server/api/ops/ingestion/[id]/trigger.post.ts`](file:///Users/wesleyukadike/Desktop/cadet/server/api/ops/ingestion/%5Bid%5D/trigger.post.ts)

- Requires `admin` or `ops` role.
- Fetches the source record, resolves channel ID from `source_external_id` or `feed_url`.
- Calls `ingestChannel()` directly for a single source.

### D. CLI

**File:** [`workers/cron/ingest-youtube.sh`](file:///Users/wesleyukadike/Desktop/cadet/workers/cron/ingest-youtube.sh)

- Shell script that loads `.env` / `.env.local` and runs `npx tsx workers/ingest-youtube.ts`.
- The worker's `main()` function at the bottom of `ingest-youtube.ts` calls `ingestAllChannels()`.

---

## 2. Pre-Flight Checks

**File:** [`workers/ingest-youtube.ts`](file:///Users/wesleyukadike/Desktop/cadet/workers/ingest-youtube.ts) → `ingestChannel()`

Before any YouTube API calls, two safety checks run:

1. **Allowlist Guard** ([`app/lib/kb/ingest-guard.ts`](file:///Users/wesleyukadike/Desktop/cadet/app/lib/kb/ingest-guard.ts))
   - Normalizes the channel URL and checks `kb_sources` for an allowlisted entry.
   - If the source is unknown → triggers quarantine (auto-creates a quarantined `kb_sources` row).
   - If not allowed → skips the channel entirely.

2. **Circuit Breaker**
   - Queries `kb_sources` for `circuit_breaker_open` and `circuit_breaker_reason`.
   - If open → logs the reason and skips. No ingestion run is logged.

---

## 3. Uploads Playlist Discovery

Once checks pass, an `IngestionLogger` is created and the run is logged to `kb_ingestion_runs`.

### Getting the Uploads Playlist ID

YouTube channels don't expose videos directly — you need the **uploads playlist ID** first.

1. **Check cache:** Looks in `kb_sources.raw_payload.uploads_playlist_id`.
2. **If not cached:** Calls YouTube Data API `channels.list` (1 quota unit) with conditional GET (`If-None-Match` ETag).
   - Supports both `@handle` and `channelId` formats.
   - On success: caches the playlist ID + ETag in `kb_sources.raw_payload`.
   - On `304 Not Modified`: reuses cached data (errors if playlist ID is missing from cache).
   - On `403/429`: quota/rate limit — throws to trigger scheduler backoff.

---

## 4. Fetching Video List

**Function:** `fetchPlaylistItems()`

- Calls YouTube Data API `playlistItems.list` (1 quota unit per 50 items).
- Paginates through results using `nextPageToken`.
- **Capped at 100 items per run** to avoid quota exhaustion.
- Returns `PlaylistItem[]` with `snippet` data (title, description, videoId, publishedAt).

---

## 5. Language Filtering

**Function:** `fetchVideoLanguages()`

- Batch-fetches video metadata via `videos.list` in chunks of 50.
- Extracts `defaultLanguage` or `defaultAudioLanguage` for each video.
- Videos are **skipped if the language is non-English** (doesn't start with `en`).
- Videos with **unknown language are kept** (fail-open).

---

## 6. Transcript Fetching (Current Cadet2 Flow)

**File:** `server/utils/rag-ingestion-phase3.ts`

The current `cadet2` ingestion path uses a **2-step transcript strategy** plus a description fallback:

### Strategy 1 (Primary): Direct YouTube Caption Track XML (`srv3`)

- Uses the watch page caption tracks already parsed from `ytInitialPlayerResponse`.
- Selects the best caption track via language scoring (preferred language first, then English variants, prefer non-ASR when available).
- Downloads the track XML with `fmt=srv3`.
- Parses timestamped caption lines and builds transcript sections.

### Strategy 2 (Fallback): `youtube-transcript-api` (jaypaun007)

- `POST` to `{YOUTUBE_TRANSCRIPT_API_BASE_URL}/transcript`.
- Sends `{ url }` first (current hosted v3 contract), with compatibility fallback to `{ video_url }` for older self-hosted versions.
- Default base URL is the public hosted service: `https://youtube-transcript-api-tau-one.vercel.app`.
- Uses **10s timeout** and request jitter.
- If using the public hosted endpoint, applies a **longer delay (~11–13s)** to avoid rate limits.
- Treats `403`/`404` as **missing transcript** (non-fatal for ingestion).
- Detects malformed "success" payloads from the hosted demo and treats them as provider failures so ingestion can continue safely.

### Timestamp Behavior

- Caption-track (`srv3`) transcripts preserve timestamps by default.
- If caption-track fetch is unavailable but API transcript text exists, ingestion still stores transcript text, but `timestamps_preserved = false`.

### Failure Handling

- If both transcript strategies fail and description text exists, ingestion falls back to **description-only** content.
- Missing/disabled transcripts are treated as **non-fatal** item errors.
- Hard failures (timeouts/5xx/rate limits with no successful fallback) are recorded and can mark the source run partial/failed.

---

## 7. Content Assembly & Deduplication

For each video, after transcript fetch:

### Content Assembly

```typescript
const contentText = transcriptText
    ? `${title}\n\nTRANSCRIPT:\n${transcriptText}`
    : `${title} ${description}`;
```

- **With transcript:** title + labeled transcript.
- **Without transcript:** title + description fallback.

### Deduplication

A `content_hash` (SHA-256) is computed from `contentText`, then compared against existing `kb_items` by `source_url`.

| Scenario | Action |
|----------|--------|
| No existing item | **Insert** new `kb_items` row |
| Hash matches, metadata unchanged | **Skip** (batch-update `last_verified_at` later) |
| Hash differs or metadata changed | **Update** existing row with `diff_payload` |

---

## 8. KB Item Storage

Each video becomes a row in `kb_items` with:

| Field | Value |
|-------|-------|
| `title` | Video title |
| `summary` | First 500 chars of description |
| `content_text` | Assembled content (title + transcript or description) |
| `content_hash` | SHA-256 of `content_text` |
| `source_url` | `https://www.youtube.com/watch?v={videoId}` |
| `source_type` | `youtube` |
| `source_id` | FK to `kb_sources` |
| `etag` | YouTube API ETag |
| `published_at` | Video publish date |
| `confidence` | `85` (default for YouTube) |
| `raw_payload` | Full YouTube `PlaylistItem` JSON |
| `ingested_from_target_id` | FK to `kb_source_targets` (if scheduler-triggered) |

---

## 9. Concurrency & Performance

- Videos are processed with **concurrency limit of 2** (`pLimit(2)`) to avoid transcript API rate limits.
- Metrics are flushed to `kb_ingestion_runs` every **50 items**.
- Skipped item IDs are collected and batch-updated for `last_verified_at` at the end.

---

## 10. Run Logging

The `IngestionLogger` tracks the full run lifecycle in `kb_ingestion_runs`:

| Metric | Description |
|--------|-------------|
| `fetched` | Total playlist items seen |
| `inserted` | New KB items created |
| `updated` | Existing items with changed content |
| `skipped` | Deduplicated (unchanged) items |
| `failed` | Items that errored during processing |

Run status transitions: `running` → `completed` or `failed`.
