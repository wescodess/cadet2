# Critical Folders Summary

## Runtime-Critical

- `app/pages/`
  - Defines the user-visible routes and most feature composition
- `server/api/`
  - Defines the explicit HTTP contract for the app
- `server/utils/`
  - Contains external provider integration logic and orchestration helpers
- `convex/`
  - Defines the domain schema and operational workflows for RAG ingestion

## Important Supporting Folders

- `app/components/ui/`
  - Shared UI primitives used to keep visual patterns consistent
- `server/db/migrations/`
  - Current relational auth schema migration history
- `docs/`
  - Architectural planning notes and the brownfield documentation set

## Low-Risk / Ancillary

- `public/`
  - Static assets
- `_bmad/`, `_bmad-output/`
  - Workflow infrastructure and generated process artifacts
