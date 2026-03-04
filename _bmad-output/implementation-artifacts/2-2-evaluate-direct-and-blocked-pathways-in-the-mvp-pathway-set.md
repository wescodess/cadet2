# Story 2.2: Evaluate Direct and Blocked Pathways in the MVP Pathway Set

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an immigration user,
I want the system to evaluate which supported pathways I can pursue now or improve toward,
so that I receive useful results even when I am not immediately eligible for the strongest option.

## Acceptance Criteria

1. **Given** a recommendation run is actively evaluating **When** the system applies the current supported MVP pathway rules to my profile **Then** it identifies direct pathways that are currently viable for me **And** it also identifies supported pathways that are not yet viable but are close enough to be marked as blocked or conditional.
2. **Given** a pathway is missing required conditions **When** the evaluation logic scores that pathway **Then** the result records the pathway as not currently viable rather than falsely marking it as available **And** the pathway remains eligible for later explanation in downstream review screens.
3. **Given** the system evaluates only the current MVP pathway inventory **When** no supported pathway qualifies strongly **Then** the result set remains limited to the supported scope **And** unsupported pathway areas are not implied to be fully covered.

## Tasks / Subtasks

- [x] Task 1: Add deterministic direct/blocked evaluation contracts for the current MVP pathway scope (AC: #1, #2, #3)
  - [x] 1.1 Add `server/utils/pathways/mvpPathwayCatalog.ts` for the supported MVP pathway set used by recommendation evaluation in Epic 2.
  - [x] 1.2 Add `server/utils/pathways/evaluateDirectAndBlockedPathways.ts` with typed inputs and outputs for pathway evaluation against normalized profile snapshots.
  - [x] 1.3 Ensure evaluator output explicitly distinguishes at least `direct` vs `blocked` status and includes unmet-condition details for blocked outcomes.
  - [x] 1.4 Keep evaluation deterministic and provider-agnostic for this stage; no LLM/provider ranking logic in Story 2.2.

- [x] Task 2: Persist pathway-evaluation outcomes on recommendation runs without breaking lifecycle contracts (AC: #1, #2, #3)
  - [x] 2.1 Extend `convex/schema.ts` and `convex/recommendationRuns.ts` with minimal fields needed to persist pathway-evaluation artifacts linked to `runId`, `userId`, and `profileSnapshotId`.
  - [x] 2.2 Add Convex mutation/query boundaries for writing and reading direct/blocked pathway outcomes for a user-scoped run.
  - [x] 2.3 Keep canonical lifecycle statuses unchanged (`queued`, `evaluating`, `completed`, `degraded`, `failed`) and avoid alternate aliases.
  - [x] 2.4 Ensure Story 2.2 does not finalize run ranking/tiering; preserve lifecycle handoff for Story 2.3 and Story 2.4.

- [x] Task 3: Wire evaluation execution into server-owned recommendation processing flow (AC: #1, #2)
  - [x] 3.1 Add server orchestration helper `server/utils/recommendations/evaluatePathwayEligibility.ts` (or equivalent) to load the run/profile snapshot, execute pathway evaluation, and persist outcomes.
  - [x] 3.2 Update `server/api/recommendations/runs/[runId]/start.post.ts` to invoke the evaluation stage safely for authenticated run owners after lifecycle start transition.
  - [x] 3.3 Keep error mapping safe and explicit (no provider internals), with invalid run ownership and transition behavior aligned to Story 2.1 patterns.
  - [x] 3.4 Preserve resumable behavior for recoverable-delay test mode while ensuring pathway-evaluation writes remain idempotent for repeat start calls.

- [x] Task 4: Add user-scoped retrieval contract for downstream review and comparison stories (AC: #2, #3)
  - [x] 4.1 Add `GET /api/recommendations/runs/[runId]/pathways` in `server/api/recommendations/runs/[runId]/pathways.get.ts`.
  - [x] 4.2 Return normalized response contracts for direct and blocked pathway groups, including missing-condition details for blocked pathways.
  - [x] 4.3 Ensure unsupported pathways are never emitted in API responses.
  - [x] 4.4 Keep response contract compatible with Story 3 explanation/comparison surfaces without exposing raw provider payloads.

- [x] Task 5: Add API + integration coverage for pathway-evaluation behavior and scope boundaries (AC: #1, #2, #3)
  - [x] 5.1 Add API tests for successful direct/blocked evaluation output shape, owner scoping, and unsupported-scope exclusion.
  - [x] 5.2 Add integration tests for missing-condition handling (`blocked` classification and preserved unmet-condition details).
  - [x] 5.3 Add integration tests for no-strong-fit scenarios to confirm only supported blocked/conditional outcomes are returned.
  - [x] 5.4 Reuse deterministic seed/reset and mock-mode controls from Story 2.1 test scaffolding for stable lifecycle + pathway assertions.

## Dev Notes

- Story 2.1 established lifecycle and status boundaries. Story 2.2 should add pathway eligibility evaluation artifacts, not final ranking/tiering logic.
- Keep recommendation evaluation server-owned (`server/api`, `server/utils`, `convex`) and deterministic at this stage.
- Preserve canonical lifecycle vocabulary and ownership checks introduced in Story 2.1.
- Keep supported-pathway scope explicit. Do not imply coverage for pathways outside the current MVP catalog.

### UI/UX Context

- This is a backend/non-UI story.
- No new user-facing route, component, or layout surface is required for Story 2.2.
- Downstream UI stories (Epic 3) will consume these persisted pathway-evaluation artifacts.

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

- No direct frontend artifact consumption is required in Story 2.2.

### Project Structure Notes

- API:
  - `server/api/recommendations/runs/[runId]/start.post.ts`
  - `server/api/recommendations/runs/[runId]/pathways.get.ts` (new)
- Server logic:
  - `server/utils/recommendations/evaluatePathwayEligibility.ts` (new)
  - `server/utils/pathways/mvpPathwayCatalog.ts` (new)
  - `server/utils/pathways/evaluateDirectAndBlockedPathways.ts` (new)
- Persistence/workflow:
  - `convex/schema.ts`
  - `convex/recommendationRuns.ts`
- Tests:
  - `tests/api/*recommendation-pathway*`
  - `tests/integration/*recommendation-pathway*`

### Technical Requirements

- Direct pathways must represent currently viable options under supported MVP rules.
- Blocked pathways must include explicit unmet-condition data and must not be marked viable.
- Evaluation output must remain constrained to the supported MVP pathway inventory only.
- Recommendation run linkage (`runId`, `userId`, `profileSnapshotId`) must remain intact for all persisted pathway outcomes.
- Any new recommendation-output fields introduced here should remain normalized and compatible with later ranking, confidence, and caveat layers in Stories 2.3/2.4.

### Architecture Compliance

- Keep Nuxt server routes as the only browser-facing boundary.
- Keep trust-sensitive evaluation logic in `server/utils` and `convex`, not Vue components.
- Preserve capability and ownership checks at all recommendation-run mutation/read boundaries.
- Keep external provider integration out of this deterministic evaluation stage.

### Library and Framework Requirements

- Continue Nuxt 4 route handlers and TypeScript-first server utilities.
- Use existing auth/session guards (`requireWorkspaceUserSession`) for all run-scoped boundaries.
- Use Convex validators and indexed lookups for persisted pathway-evaluation artifacts.
- Use schema-first request/response validation patterns with existing `zod` conventions.

### File Structure Requirements

- Primary expected touches in this story:
  - `server/api/recommendations/runs/[runId]/start.post.ts`
  - `server/api/recommendations/runs/[runId]/pathways.get.ts` (new)
  - `server/utils/recommendations/evaluatePathwayEligibility.ts` (new)
  - `server/utils/pathways/mvpPathwayCatalog.ts` (new)
  - `server/utils/pathways/evaluateDirectAndBlockedPathways.ts` (new)
  - `convex/schema.ts`
  - `convex/recommendationRuns.ts`
  - `tests/api/*recommendation-pathway*`
  - `tests/integration/*recommendation-pathway*`
- Avoid broad refactors across intake, admin-governance, and RAG modules in this story.

### Testing Requirements

- Add API coverage for:
  - start-triggered pathway evaluation persistence
  - user-scoped pathway evaluation retrieval
  - unsupported-scope exclusion
- Add integration coverage for:
  - direct vs blocked classification determinism
  - missing-condition capture for blocked outcomes
  - no-strong-fit behavior within supported MVP pathway inventory
- Reuse existing deterministic lifecycle test controls (`/api/recommendations/testing/reset`, `/api/recommendations/testing/seed`) for stable setup.

### Previous Story Intelligence

- Story 2.1 established canonical lifecycle statuses and guarded transitions; do not introduce alternate lifecycle terms.
- Story 2.1 hardened non-production mock controls for recommendation start modes; preserve that gate in any new evaluation paths.
- Story 2.1 established deterministic lifecycle fixtures under `tests/support/fixtures/factories/recommendation-lifecycle-factory.ts`; extend these fixtures rather than creating parallel scaffolding.
- Story 2.1 maintained provider-agnostic API contracts and strict run ownership checks; keep the same posture for pathway output retrieval.

### Git Intelligence Summary

- Recent commits show an incremental pattern across intake and recommendation lifecycle work (`feat(intake)` then `feat(story-2.1)`), with follow-up hardening merged quickly.
- Keep Story 2.2 scoped to direct/blocked pathway evaluation boundaries and deterministic tests without introducing unrelated platform changes.

### Latest Tech Information

- Current repository baseline:
  - `nuxt` `4.3.1`
  - `vue` `3.5.28`
  - `typescript` `5.9.3`
  - `convex` `1.32.0`
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
  - Keep pinned versions during Story 2.2 implementation and avoid incidental dependency upgrades.

### Project Context Reference

- `_bmad-output/project-context.md` remains mandatory for:
  - Nuxt server boundary and auth/session enforcement
  - TypeScript and runtime-validation expectations
  - Convex schema/validator conventions
  - server-only integration boundaries

### Story Completion Status

- Story context quality review status: complete
- Frontend-impacting classification: `false`
- Approved design handoff package: not required
- Ready-for-dev gate: satisfied
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2]
- [Source: _bmad-output/planning-artifacts/prd.md#Recommendation Generation & Pathway Analysis]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: _bmad-output/project-context.md]
- [Source: _bmad-output/implementation-artifacts/2-1-start-recommendation-processing-from-a-submitted-profile.md]
- [Source: _bmad-output/test-artifacts/test-design/cadet2-handoff.md#Story-Level Integration Guidance]
- [Source: package.json]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (CLI)

### Implementation Plan

1. Add deterministic pathway-evaluation contracts and supported MVP pathway catalog.
2. Extend recommendation run persistence for pathway outcomes and user-scoped queries.
3. Wire evaluation stage into start-processing orchestration and add retrieval API.
4. Add API/integration coverage with deterministic lifecycle fixtures.

### Stitch Retrieval Log

Not applicable for this backend/non-UI story.

### UI Implementation Mapping

Not applicable for this backend/non-UI story.

### Debug Log References

- `pnpm exec playwright test --project=api tests/api/recommendation-pathway-evaluation.atdd.spec.ts tests/integration/recommendation-pathway-evaluation.integration.spec.ts`
- `pnpm test:api`
- `pnpm exec playwright test --project=api tests/api/recommendation-pathway-evaluation.atdd.spec.ts tests/integration/recommendation-pathway-evaluation.integration.spec.ts tests/api/recommendation-lifecycle.atdd.spec.ts`

### Completion Notes List

- Implemented deterministic MVP pathway catalog and evaluator that emits only `direct`/`blocked` outcomes and captures unmet-condition details for blocked pathways.
- Added Convex persistence contract for pathway evaluation artifacts on recommendation runs with user/run/profile linkage checks and normalized read/write boundaries.
- Added orchestration helper to load run + profile snapshot context, evaluate deterministic eligibility, and persist outcomes during start-processing for active run states.
- Added user-scoped pathways retrieval API route with supported-scope filtering and normalized response shape for downstream Story 3 consumption.
- Enabled and passed Story 2.2 API + integration ATDD coverage, including idempotent repeated-start assertions and no-strong-fit blocked-only behavior.
- Verified no regressions in the API test suite (`36 passed`, `11 skipped` in existing red-guarded files).
- Fixed code-review findings by failing fast when profile snapshots are missing, preventing silent blocked-only fallbacks.
- Added failure compensation in recommendation start flow so pathway-evaluation exceptions force a safe terminal `failed` state instead of leaving lifecycle state partially advanced.
- Added explicit pending behavior for pathways retrieval (`409`) when evaluation artifacts have not been generated yet.
- Extended test-mode seed/reset routes to provision/cleanup deterministic profile snapshots and added API coverage for owner-scoping and stronger idempotency assertions.

### File List

- `server/utils/pathways/mvpPathwayCatalog.ts` (new)
- `server/utils/pathways/evaluateDirectAndBlockedPathways.ts` (new)
- `server/utils/recommendations/evaluatePathwayEligibility.ts` (new)
- `server/api/recommendations/runs/[runId]/pathways.get.ts` (new)
- `server/api/recommendations/runs/[runId]/start.post.ts`
- `convex/schema.ts`
- `convex/recommendationRuns.ts`
- `server/api/recommendations/testing/seed.post.ts`
- `server/api/recommendations/testing/reset.post.ts`
- `tests/api/recommendation-pathway-evaluation.atdd.spec.ts`
- `tests/integration/recommendation-pathway-evaluation.integration.spec.ts`
- `tests/support/fixtures/factories/recommendation-lifecycle-factory.ts`
- `tests/support/fixtures/test-data.ts`
- `.gitignore`

### Senior Developer Review (AI)

- Review outcome: changes requested issues resolved and validated.
- High-severity fixes applied:
  - missing profile snapshot now fails explicitly (`404`) instead of producing synthetic blocked outputs
  - start-flow evaluation failures now write run terminal status to `failed` before returning error
- Medium-severity fixes applied:
  - pathways endpoint now returns explicit `409` when evaluation artifacts are not ready
  - Story file list synchronized with actual changed files
- Validation rerun after fixes: `17 passed` (`tests/api/recommendation-pathway-evaluation.atdd.spec.ts`, `tests/integration/recommendation-pathway-evaluation.integration.spec.ts`, `tests/api/recommendation-lifecycle.atdd.spec.ts`)

### Change Log

- 2026-03-04: Applied code-review remediation for Story 2.2, expanded owner-scope/idempotency coverage, and marked story `done`.
