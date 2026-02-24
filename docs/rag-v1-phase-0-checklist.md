# RAG V1 Phase 0 Checklist (Implemented Readiness Pass)

## Purpose

Phase 0 establishes foundation readiness before building ingestion workflows:

- environment variable naming and storage
- Cloudflare AI Search / AI Gateway / OpenRouter configuration presence
- admin authorization rules for future source approval endpoints
- scheduler secret reservation for later internal cron endpoints

## What Is Implemented

- Runtime config placeholders in `nuxt.config.ts`
- Admin allowlist-based authorization utility for RAG admin endpoints
- Admin-only readiness endpoint: `GET /api/admin/rag/phase0-readiness`
- Minimal UI page: `/admin/rag-phase0`
- `.env.example` updated with Phase 0 environment variables

## Environment Variables (Phase 0)

## Cloudflare AI Search (Required for retrieval path)

- `NUXT_CLOUDFLARE_AI_SEARCH_ACCOUNT_ID`
- `NUXT_CLOUDFLARE_AI_SEARCH_API_TOKEN`
- `NUXT_CLOUDFLARE_AI_SEARCH_INSTANCE_NAME` or `NUXT_CLOUDFLARE_AI_SEARCH_INSTANCE_ID`

## Cloudflare AI Gateway (Required for answer path)

- `NUXT_CLOUDFLARE_AI_GATEWAY_ACCOUNT_ID`
- `NUXT_CLOUDFLARE_AI_GATEWAY_GATEWAY_ID` or `NUXT_CLOUDFLARE_AI_GATEWAY_BASE_URL`
- `NUXT_CLOUDFLARE_AI_GATEWAY_API_TOKEN` (optional in Phase 0 readiness, but recommended for authenticated gateway setups)

## OpenRouter (Required for v1 answer generation plan)

- `NUXT_OPENROUTER_API_KEY`
- `NUXT_OPENROUTER_DEFAULT_MODEL`
- `NUXT_OPENROUTER_APP_NAME` (optional but recommended)
- `NUXT_OPENROUTER_APP_URL` (optional but recommended)

## RAG App Controls

- `NUXT_RAG_DEFAULT_TENANT_ID` (defaults to `default`)
- `NUXT_RAG_ADMIN_USER_IDS` or `NUXT_RAG_ADMIN_EMAILS` (required for admin endpoint access)
- `NUXT_RAG_SCHEDULER_SECRET` (required later; checked now to avoid future refactor)

## Convex Admin Proxy (Required for hardened Phase 1 admin routes)

- `CONVEX_ADMIN_KEY` (preferred in non-local environments)
- Local development fallback: read from `.convex/local/default/config.json` when using `local:` Convex deployment

## Manual Cloudflare Resource Verification (Still Required)

Phase 0 readiness checks configuration presence only. These manual checks are still required:

1. Confirm the Cloudflare AI Search instance exists and matches the configured name/ID.
2. Confirm the AI Gateway exists and is the intended gateway for LLM traffic.
3. Confirm OpenRouter routing/auth mode through AI Gateway (BYOK vs stored key) for the chosen model path.
4. Confirm the R2 bucket selected for AI Search ingestion exists (Phase 1/2 will wire it formally).

## Admin Authorization Rule (Phase 0)

Phase 0 uses a strict allowlist for admin-only RAG endpoints:

- authenticate user via Better Auth session (`requireUserSession`)
- allow access only if the user matches `NUXT_RAG_ADMIN_USER_IDS` or `NUXT_RAG_ADMIN_EMAILS`

This is intentionally simple for v1 and can later move to role/permission tables.

## How To Use

1. Set the Phase 0 env vars in `.env`.
2. Add your admin user ID or email to the RAG admin allowlist env vars.
3. Sign in to the app.
4. Open `/admin/rag-phase0`.
5. Resolve all missing configuration shown by the page.

## Exit Criteria For Phase 0

- `/api/admin/rag/phase0-readiness` is accessible to an allowlisted admin
- readiness response shows no missing required configuration
- team confirms the manual Cloudflare checks above
