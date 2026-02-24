# RAG V1 Phase 1 Notes

## Status

Phase 1 implementation is complete against the acceptance checkpoints in `docs/rag-v1-implementation-plan.md` and is ready for Phase 2 work.

Manual smoke testing is still recommended before moving on (submit website + YouTube sources, approve with a changed schedule, and verify list rendering).

## Implemented

- Convex schema tables:
  - `sources`
  - `approval_audit_log`
  - `rag_admins`
- Convex source registry + approval workflow functions in `convex/ragSources.ts`
- Admin UI page for source submission and approval at `/admin/rag-sources`
- Website source submission flow (creates `pending_approval` source)
- YouTube channel source submission flow (creates `pending_approval` source)
- Admin actions for approve, reject, pause, and resume (via Nuxt server routes + Convex internal mutations)
- Approval flow can set or adjust schedule frequency (`daily`, `manual`, `interval`) at approval time
- Source list displays status plus operational timestamps (`lastRunAt`, `lastSuccessAt`, `lastFailureAt`, `nextRunAt`)

## Acceptance Checkpoints (Phase 1)

- `Admin can submit website source (pending approval)` — Implemented
- `Admin can submit YouTube channel source (pending approval)` — Implemented
- `Admin can approve source and set/adjust frequency` — Implemented
- `Source list shows status and last run timestamps` — Implemented

## Current Admin Model (Hardened)

Phase 1 hardening aligns Convex admin membership with the Nuxt Phase 0 allowlist:

- Nuxt admin routes enforce the Phase 0 allowlist (`requireRagAdminSession`)
- Nuxt uses a Convex admin HTTP client (admin key) to call internal Convex mutations
- Allowlisted admins can sync their current user into `rag_admins`
- Public Convex admin bootstrap is disabled

Runtime note:

- Set `CONVEX_ADMIN_KEY` in non-local environments.
- Local development can fall back to `.convex/local/default/config.json`.

Timestamp note:

- Phase 1 renders timestamp fields in the source list. `lastRunAt`/`lastSuccessAt`/`lastFailureAt` will remain empty (`—`) until Phase 2+ ingestion jobs begin updating those fields.

## Remaining Hardening Work (Later)

1. Replace client-side source submission with a Nuxt server endpoint if you want all writes gated by server policy
2. Add a unified role/permissions store (instead of allowlist + `rag_admins`)
3. Add server-side listing/detail proxy routes if you want fully centralized audit logging and input normalization
