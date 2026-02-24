# RAG Ingestion Drafts

This folder contains draft planning documents for a custom ingestion pipeline that feeds Cloudflare AI Search via R2 and uses an LLM through OpenRouter + Cloudflare AI Gateway for answer generation.

## Drafts

- `docs/rag-v1-architecture.md`
  - End-to-end architecture, component boundaries, and key design decisions
- `docs/rag-v1-data-model.md`
  - Convex data model draft and R2 object key specification
- `docs/rag-v1-api-contracts.md`
  - Internal API contracts for source management, ingestion, sync, search, and answers
- `docs/rag-v1-jobs-and-retries.md`
  - Job state machine, idempotency, retry behavior, and scheduling rules
- `docs/rag-v1-implementation-plan.md`
  - Phased implementation plan and acceptance checkpoints

## Locked Decisions (Current)

- Source onboarding includes add + approval workflow
- Default ingestion cadence is daily, with configurable frequency per source
- LLM provider path is OpenRouter via Cloudflare AI Gateway
- Citation format is URL + snippet + timestamp (when available)
- R2 content policy is overwrite latest (no version history in v1)
- Website crawling policy is static-first, with per-source rendered mode opt-in
