# API Contracts

## Summary

- The application exposes Nuxt server routes under `server/api/`.
- The route surface splits into public query APIs, admin-only RAG APIs, and one internal scheduler endpoint.
- Better Auth routes are also present at runtime through module integration, but those route files are not defined directly in this repository.

## Public Route

### `POST /api/ai-search/query`

- Purpose: Proxy Cloudflare AI Search from the server so tokens remain private
- Input:
  - `query` (required string)
  - `mode` (`search` or `ai-search`)
  - `rewriteQuery` (boolean)
  - `maxNumResults` (1-50)
  - `scoreThreshold` (0-1)
  - `filters`
  - `includeMetaFiles`
  - `reranking`
  - `model`
  - `systemPrompt`
  - `stream`
- Behavior:
  - Validates request shape with local type guards
  - Enforces a `latest.md` content-only filter unless `includeMetaFiles` is enabled
  - Reads Cloudflare instance configuration from runtime config
- Output:
  - `{ ok: true, mode, endpointStyle, result/raw }`

## Admin RAG Routes

These routes require a valid user session and an allowlisted RAG admin identity.

### Source Admin

- `GET /api/admin/rag/sources/admin-status`
- `GET /api/admin/rag/sources`
- `POST /api/admin/rag/sources`
- `POST /api/admin/rag/sources/:sourceId/approve`
- `POST /api/admin/rag/sources/:sourceId/reject`
- `POST /api/admin/rag/sources/:sourceId/pause`
- `POST /api/admin/rag/sources/:sourceId/resume`

### Admin Foundation

- `GET /api/admin/rag/phase0-readiness`
- `POST /api/admin/rag/convex-admin/sync-current-user`

### Ingestion Operations

- `POST /api/admin/rag/ingestion/run`
- `GET /api/admin/rag/ingestion/batches`
- `GET /api/admin/rag/ingestion/batches/:batchId`

## Internal Route

### `POST /api/internal/scheduler/daily-ingestion`

- Uses a scheduler secret supplied by header or bearer token
- Creates or reuses a scheduled batch
- Executes batch ingestion and optional AI Search sync

## Security Model

- Public AI Search requests are server-proxied.
- Admin routes use `requireRagAdminSession()`.
- Scheduler routes use a shared secret.
- External provider tokens are never expected to be called directly from the browser.
