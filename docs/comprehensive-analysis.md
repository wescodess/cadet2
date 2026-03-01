# Comprehensive Analysis

## Entry Points

- `app/app.vue`
- `app/pages/*.vue`
- `server/api/**/*.ts`
- `convex/schema.ts`
- `convex/*.ts`

## Authentication and Security

- Better Auth is the main auth system.
- Server auth is configured in `server/auth.config.ts`.
- Client auth is configured in `app/auth.config.ts`.
- Convex auth tokens are bridged from the browser through a Nuxt plugin.
- RAG admin access is allowlist-based using runtime config.
- Scheduler execution is protected by a shared secret.

## Configuration Surface

- `nuxt.config.ts`
- `tsconfig.json`
- `components.json`
- `.env`, `.env.example`, `.env.local`

## Async and Job Patterns

- Manual and scheduled ingestion endpoints create batches through Convex internal mutations.
- Batch orchestration tracks queued, running, sync, and retry state.
- Cloudflare AI Search sync polling is handled in server utilities.
- Client-side task updates use a realtime Convex subscription.

## Testing Footprint

- No application-level automated test suite is established yet.
- New automated testing work will need to establish its own conventions explicitly.
