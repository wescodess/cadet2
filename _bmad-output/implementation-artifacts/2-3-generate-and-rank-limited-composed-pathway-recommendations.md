# Story 2.3: Generate and Rank Limited Composed Pathway Recommendations

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an immigration user,
I want the system to surface viable staged routes and rank all supported options,
so that I can see both the best immediate path and realistic longer-horizon alternatives.

## Acceptance Criteria

1. **Given** my profile does not have only one obvious direct-fit pathway **When** the recommendation engine evaluates supported composed-route rules **Then** it can generate limited composed pathway recommendations where an intermediate step improves future eligibility **And** those recommendations are stored distinctly from direct-fit outcomes.
2. **Given** the system has a set of direct, blocked, and composed pathway candidates **When** ranking is applied **Then** the results are ordered by best-fit and fastest credible route using the current scoring logic **And** each result is assigned a recommendation tier such as strong-fit, conditional-fit, or lower-confidence.
3. **Given** multiple recommendation candidates are available **When** the run is completed **Then** the returned result set preserves the ordering and tiering needed for later review surfaces **And** the output format remains normalized for the application rather than exposing raw provider output.
4. **Given** the composed-route evaluation finds no supported staged route for the current profile **When** the run is finalized **Then** the result set preserves the available direct-fit and blocked-pathway outcomes without inventing a composed route **And** the completed run makes it clear that no supported staged pathway was identified in the current MVP scope.

## Tasks / Subtasks

- [x] Task 1: Add deterministic composed-pathway generation contracts within the MVP pathway scope (AC: #1, #4)
  - [x] 1.1 Add `server/utils/pathways/generateComposedPathways.ts` (or equivalent) with typed inputs/outputs sourced from existing direct/blocked evaluation artifacts.
  - [x] 1.2 Model composed recommendations explicitly (for example step graph/milestone shape) so they remain distinct from direct and blocked outcomes.
  - [x] 1.3 Keep composed generation deterministic and server-owned; do not introduce provider-only scoring in this story.
  - [x] 1.4 Ensure empty-composed scenarios preserve direct/blocked outcomes and emit an explicit no-composed-result signal.

- [x] Task 2: Implement ranking and tier assignment for direct, blocked, and composed candidates (AC: #2, #3)
  - [x] 2.1 Add `server/utils/recommendations/rankRecommendationCandidates.ts` with normalized scoring inputs and ordered outputs.
  - [x] 2.2 Assign recommendation tiers using canonical Story 2.3 categories (`strong-fit`, `conditional-fit`, `lower-confidence`) while deferring degraded/withheld logic to Story 2.4.
  - [x] 2.3 Persist stable ordering metadata (`rank`, `score` or equivalent) to support downstream Epic 3 review/comparison surfaces.
  - [x] 2.4 Keep ranking logic constrained to supported MVP pathways and avoid unsupported-route leakage.

- [x] Task 3: Extend recommendation-run persistence for ranked recommendation results (AC: #1, #2, #3, #4)
  - [x] 3.1 Extend `convex/schema.ts` and `convex/recommendationRuns.ts` with minimal normalized fields for composed outputs, ranking order, and tier metadata.
  - [x] 3.2 Add write/read boundaries for ranked recommendations keyed by `runId`, `userId`, and `profileSnapshotId`.
  - [x] 3.3 Preserve canonical lifecycle statuses (`queued`, `evaluating`, `completed`, `degraded`, `failed`) and mark successful Story 2.3 finalization as `completed`.
  - [x] 3.4 Keep backward compatibility for runs with only direct/blocked artifacts from Story 2.2.

- [x] Task 4: Wire ranked recommendation generation into start-processing orchestration (AC: #1, #2, #3, #4)
  - [x] 4.1 Add orchestration helper `server/utils/recommendations/generateRankedRecommendations.ts` that composes direct/blocked artifacts, generated composed routes, and ranking/tiering outputs.
  - [x] 4.2 Update `server/api/recommendations/runs/[runId]/start.post.ts` to execute Story 2.3 stages after pathway-eligibility evaluation and transition to terminal `completed` on success.
  - [x] 4.3 Keep failure handling safe and explicit: on orchestration failure, preserve trustworthy status behavior (`failed` or future `degraded` handoff per Story 2.4).
  - [x] 4.4 Preserve idempotent repeated-start behavior for already-computed runs without duplicating persisted recommendation outputs.

- [x] Task 5: Add normalized ranked-results retrieval API contract for downstream UI stories (AC: #3, #4)
  - [x] 5.1 Add `GET /api/recommendations/runs/[runId]/results` in `server/api/recommendations/runs/[runId]/results.get.ts`.
  - [x] 5.2 Return normalized grouped/ordered recommendation results including type (`direct`/`blocked`/`composed`), rank, tier, and composed step metadata where present.
  - [x] 5.3 Ensure unsupported pathways and raw provider internals are excluded from the response contract.
  - [x] 5.4 Return explicit pending/unavailable behavior for runs where ranking has not finalized.

- [x] Task 6: Add API and integration coverage for composed generation, ranking order, and tier contracts (AC: #1, #2, #3, #4)
  - [x] 6.1 Add API tests for successful composed generation + ranking payload shape and owner-scoped retrieval.
  - [x] 6.2 Add integration tests asserting deterministic ordering and tier assignment across direct/blocked/composed mixes.
  - [x] 6.3 Add integration tests for no-composed-pathway scenarios to verify direct/blocked preservation and explicit no-composed signaling.
  - [x] 6.4 Reuse deterministic seed/reset and mock-mode fixtures from Stories 2.1/2.2 for stable lifecycle + ranking assertions.

## Dev Notes

- Story 2.2 established deterministic direct/blocked evaluation persistence and retrieval. Story 2.3 extends this by adding limited composed recommendations plus ranking/tiering.
- Keep recommendation generation server-owned (`server/api`, `server/utils`, `convex`) and provider-agnostic at the HTTP contract boundary.
- Preserve normalized output contracts that downstream Epic 3 surfaces can consume without exposing internals.
- Keep unsupported pathways out of candidate generation and ranked outputs.

### UI/UX Context

- This is a backend/non-UI story.
- No new route, page, or component is required in Story 2.3.
- Story 2.3 output contracts power later Epic 3 recommendation explanation/comparison surfaces.

### Affected Frontend Surfaces

- None in this story slice.

### Concept Options (3 Paired Directions Per Surface)

- Not applicable for this backend/non-UI story.

### Approved Stitch Design Package

- Not required for this backend/non-UI story.

### Approved Variant Decision

- Not required for this backend/non-UI story.

### Design Tokens / System Constraints

- Not applicable for this backend/non-UI story.

### Stitch Retrieval Instructions

- Not applicable for this backend/non-UI story.

### Referenced UX Artifacts

- No direct frontend artifact consumption is required in Story 2.3.

### Project Structure Notes

- API:
  - `server/api/recommendations/runs/[runId]/start.post.ts`
  - `server/api/recommendations/runs/[runId]/results.get.ts` (new)
  - `server/api/recommendations/runs/[runId]/pathways.get.ts` (may be reused for intermediate contracts)
- Server logic:
  - `server/utils/recommendations/evaluatePathwayEligibility.ts`
  - `server/utils/recommendations/generateRankedRecommendations.ts` (new)
  - `server/utils/recommendations/rankRecommendationCandidates.ts` (new)
  - `server/utils/pathways/generateComposedPathways.ts` (new)
  - `server/utils/pathways/mvpPathwayCatalog.ts`
- Persistence/workflow:
  - `convex/schema.ts`
  - `convex/recommendationRuns.ts`
- Tests:
  - `tests/api/*recommendation-ranking*`
  - `tests/integration/*recommendation-ranking*`
  - existing lifecycle/pathway fixtures under `tests/support/fixtures/*`

### Technical Requirements

- Compose pathways only from the supported MVP pathway inventory; do not imply unsupported coverage.
- Persist composed recommendations distinctly from direct/blocked outputs, with explicit type metadata.
- Ranking must produce deterministic ordering and explicit recommendation tier labels.
- Finalized successful runs must preserve ordered/tiered outputs in a normalized response shape suitable for Epic 3 rendering.
- No-composed-pathway scenarios must not fabricate staged routes and must preserve valid direct/blocked outcomes.

### Architecture Compliance

- Keep Nuxt server routes as the only browser-facing boundary.
- Keep trust-sensitive recommendation logic in `server/utils` and `convex`, not Vue pages/components.
- Preserve user ownership checks and authenticated access for all run-scoped read/write operations.
- Treat recommendation processing as asynchronous staged orchestration with explicit lifecycle transitions and safe failures.

### Library and Framework Requirements

- Continue Nuxt 4 route handlers and TypeScript-first server utilities.
- Use existing auth/session guard utility (`requireWorkspaceUserSession`) for run-scoped boundaries.
- Use Convex validators and indexed lookups for new recommendation result persistence contracts.
- Keep schema-first validation conventions (`zod` at server boundaries, `v.*` in Convex).

### File Structure Requirements

- Primary expected touches in this story:
  - `server/api/recommendations/runs/[runId]/start.post.ts`
  - `server/api/recommendations/runs/[runId]/results.get.ts` (new)
  - `server/utils/recommendations/evaluatePathwayEligibility.ts`
  - `server/utils/recommendations/generateRankedRecommendations.ts` (new)
  - `server/utils/recommendations/rankRecommendationCandidates.ts` (new)
  - `server/utils/pathways/generateComposedPathways.ts` (new)
  - `server/utils/pathways/mvpPathwayCatalog.ts`
  - `convex/schema.ts`
  - `convex/recommendationRuns.ts`
  - `tests/api/*recommendation-ranking*`
  - `tests/integration/*recommendation-ranking*`
  - `tests/support/fixtures/factories/recommendation-lifecycle-factory.ts` (as needed)
- Avoid broad refactors outside recommendation-domain modules in this story.

### Testing Requirements

- Add API coverage for:
  - composed-pathway generation + ranked output retrieval
  - owner-scoped access control on ranked results
  - unsupported-scope exclusion in ranked payloads
- Add integration coverage for:
  - deterministic rank/tier assignment across direct, blocked, and composed candidates
  - lifecycle finalization to `completed` on successful ranking persistence
  - no-composed-pathway branch preserving direct/blocked outputs without fabricated routes
- Reuse deterministic test controls (`/api/recommendations/testing/reset`, `/api/recommendations/testing/seed`) and mock modes for stable setup.

### Previous Story Intelligence

- Story 2.2 already persists deterministic direct/blocked evaluation artifacts (`pathwayEvaluation`) and user-scoped retrieval; extend that contract rather than replacing it.
- Story 2.2 start-flow remediation forces terminal `failed` status when pathway evaluation fails; keep this safe-failure pattern for ranking/composed failures.
- Story 2.2 pathway retrieval returns `409` when artifacts are not ready; keep explicit pending states for any new ranked-results endpoint.
- Story 2.2 test harness added deterministic profile snapshot provisioning/cleanup in recommendation testing routes; reuse those fixtures for ranking scenarios.

### Git Intelligence Summary

- Recent commit history shows an iterative story-by-story pattern in Epic 2 (`feat(story-2.1)` then `feat(story-2.2)` with review-fix follow-ups and merge commits).
- Keep Story 2.3 narrowly scoped to composed-generation/ranking contracts and their tests, preserving the same incremental hardening workflow.

### Latest Tech Information

- Current repository baseline (from `package.json`):
  - `nuxt` `^4.3.1`
  - `vue` `^3.5.28`
  - `typescript` `^5.9.3`
  - `convex` `^1.32.0`
  - `better-auth` `1.4.9`
  - `zod` `3.25.76`
- Latest npm registry checks on 2026-03-04:
  - `nuxt` latest `4.3.1` (current)
  - `vue` latest `3.5.29` (patch available)
  - `typescript` latest `5.9.3` (current)
  - `convex` latest `1.32.0` (current)
  - `better-auth` latest `1.5.3` (minor available)
  - `zod` latest `4.3.6` (major available)
- Story guidance:
  - Keep pinned dependency behavior unchanged during Story 2.3 implementation and avoid incidental upgrades.

### Project Context Reference

- `_bmad-output/project-context.md` remains mandatory for:
  - Nuxt server-boundary and client/server separation rules
  - runtime validation requirements (`zod` + Convex validators)
  - recommendation-domain ownership (`server/utils` + `convex`)
  - secret-safe provider integration boundaries

### Story Completion Status

- Story context quality review status: complete
- Frontend-impacting classification: `false`
- Approved design handoff package: not required
- Ready-for-dev gate: satisfied
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3]
- [Source: _bmad-output/planning-artifacts/prd.md#Recommendation Generation & Pathway Analysis]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: _bmad-output/project-context.md]
- [Source: _bmad-output/implementation-artifacts/2-2-evaluate-direct-and-blocked-pathways-in-the-mvp-pathway-set.md]
- [Source: _bmad-output/test-artifacts/test-design/cadet2-handoff.md#Story-Level Integration Guidance]
- [Source: docs/recommendation-lifecycle-testing.md]
- [Source: package.json]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (CLI)

### Implementation Plan

1. Add deterministic composed-pathway generation contracts and normalized output shape.
2. Implement ranking and tiering logic for direct/blocked/composed candidates.
3. Extend Convex persistence/query boundaries for ranked recommendation outputs.
4. Wire start-flow orchestration to persist ranked outputs and finalize successful runs.
5. Add API/integration coverage for ranking order, tier labels, and no-composed cases.

### Stitch Retrieval Log

Not applicable for this backend/non-UI story.

### UI Implementation Mapping

Not applicable for this backend/non-UI story.

### Debug Log References

- `pnpm exec playwright test --project=api tests/api/recommendation-ranking.atdd.spec.ts tests/integration/recommendation-ranking.integration.spec.ts`
- `pnpm test:api`

### Completion Notes List

- Added deterministic composed-route generation with explicit no-composed signaling for MVP-supported pathway outcomes.
- Added deterministic ranking + canonical tier assignment (`strong-fit`, `conditional-fit`, `lower-confidence`) with stable global rank metadata.
- Extended Convex schema/contracts with normalized ranked recommendation persistence + owner-scoped read/write boundaries.
- Wired Story 2.3 orchestration into recommendation start flow for standard mode, including safe failure fallback to terminal `failed`.
- Added owner-scoped `GET /api/recommendations/runs/[runId]/results` with pending `409` behavior and supported-scope filtering.
- Enabled Story 2.3 API + integration test suites (removed red-phase skips) and updated lifecycle idempotency expectations for terminal no-op restarts.
- Updated deterministic seed defaults to produce mixed direct/blocked baseline coverage for composed and ranking scenarios.
- Verified full API regression suite passes (`47 passed`, `11 skipped`).

### File List

- `server/api/recommendations/runs/[runId]/start.post.ts`
- `server/api/recommendations/runs/[runId]/results.get.ts` (new)
- `server/utils/recommendations/generateRankedRecommendations.ts` (new)
- `server/utils/recommendations/rankRecommendationCandidates.ts` (new)
- `server/utils/pathways/generateComposedPathways.ts` (new)
- `convex/schema.ts`
- `convex/recommendationRuns.ts`
- `server/api/recommendations/testing/seed.post.ts`
- `tests/api/recommendation-lifecycle.atdd.spec.ts`
- `tests/api/recommendation-ranking.atdd.spec.ts` (new)
- `tests/integration/recommendation-ranking.integration.spec.ts` (new)
- `tests/support/fixtures/test-data.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-03-04: Implemented Story 2.3 composed-generation/ranking persistence and retrieval contracts, enabled ATDD/integration ranking suites, and moved story + sprint status to `review`.
- 2026-03-05: Applied code-review fixes by wiring ranking orchestration + terminal `completed` finalization in start flow, added lifecycle-finalization assertions in ranking tests, and reconciled File List completeness.

### Senior Developer Review (AI)

- 2026-03-05 (Codex): Fixed all reported HIGH and MEDIUM findings from Story 2.3 code review.
- Resolved: missing runtime ranking orchestration, missing `completed` finalization on successful standard runs, missing lifecycle-finalization assertions in Story 2.3 tests, and incomplete story File List documentation.
