# RAG V1 Phase 0 API Contract Deltas (Draft to Implementation)

## Purpose

Record the contract changes introduced in Phase 0 before Phase 1 source-registry work begins.

## Added Endpoints (Phase 0)

## `GET /api/admin/rag/phase0-readiness`

Purpose:

- Admin-only readiness check for Phase 0 prerequisites

Auth:

- Requires authenticated Better Auth session
- Requires allowlist match via `NUXT_RAG_ADMIN_USER_IDS` or `NUXT_RAG_ADMIN_EMAILS`

Response summary:

- `phase`
- `viewer` (redacted identity summary)
- `readiness.overallReady`
- `readiness.sections[*].missingEnvVars`
- `readiness.configSummary` (presence flags only, no secrets)

## Contract Impact on Earlier Drafts

No changes yet to the Phase 1+ source/ingestion/search/answer endpoint drafts in:

- `docs/rag-v1-api-contracts.md`

Phase 0 only adds a readiness/admin foundation endpoint and runtime config conventions.

## Runtime Config Conventions Added

These runtime config groups are now declared in `nuxt.config.ts`:

- `cloudflareAiSearch`
- `cloudflareAiGateway`
- `openRouter`
- `rag`

This reduces config sprawl before Phase 1 endpoint implementation.

## Planned Next Contract Work (Phase 1)

- Source registry endpoints (`/api/admin/sources*`)
- Source approval/rejection endpoints
- Convex-backed persistence contract for `sources` and approval audit log
