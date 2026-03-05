# Story 2.4: Safely Qualify Weak Results and Support Recommendation Refresh

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an immigration user,  
I want weak recommendation outputs to be qualified and my run to be refreshable after profile changes,  
so that I can trust the system to adapt without overstating certainty.

## Acceptance Criteria

1. **Given** evidence, rule coverage, or computed fit is insufficient for a confident result **When** the recommendation run is finalized **Then** the system qualifies, downgrades, or withholds the affected recommendation instead of presenting it as strong-fit **And** the run is marked `degraded` when partial results remain usable or `failed` when no trustworthy result can be returned **And** every affected recommendation is shown with an explicit low-confidence or withheld state plus a visible caveat explaining why **And** the response contract preserves explicit confidence, freshness, and caveat fields for every degraded or withheld result.
2. **Given** I update my profile inputs after receiving prior results **When** I trigger a refresh or re-run **Then** the system creates or updates a new recommendation evaluation against the latest profile state **And** the refreshed result remains distinguishable from the previous run state.
3. **Given** a dependency or retrieval step fails during processing **When** the system cannot complete the normal path **Then** the run fails safely without exposing misleading high-confidence recommendations **And** the workspace shows either the canonical `degraded` or `failed` status with a user-safe recovery message to retry later or re-evaluate after updating inputs.

## Tasks / Subtasks

- [x] Task 1: Add weak-result qualification contracts with explicit confidence, freshness, and caveat metadata (AC: #1, #3)
  - [x] 1.1 Add `server/utils/recommendations/qualifyWeakRecommendationResults.ts` (or equivalent) to classify ranked candidates as fully-supported, low-confidence, or withheld based on evidence/rule sufficiency.
  - [x] 1.2 Extend recommendation result data contracts in `convex/schema.ts` and `convex/recommendationRuns.ts` to persist per-candidate confidence, freshness, and caveat metadata.
  - [x] 1.3 Ensure degraded recommendations carry visible caveat text and withheld recommendations remain explicit (never silently dropped without explanation).
  - [x] 1.4 Keep recommendation metadata normalized and provider-agnostic at API boundaries.

- [x] Task 2: Apply safe degraded/failed finalization rules in recommendation orchestration (AC: #1, #3)
  - [x] 2.1 Update `server/utils/recommendations/generateRankedRecommendations.ts` and/or start-flow orchestration to run the qualification layer before terminal status is set.
  - [x] 2.2 Set terminal status to `degraded` when partially trustworthy results remain and to `failed` when no trustworthy output can be returned.
  - [x] 2.3 Ensure dependency/retrieval failures produce user-safe status messaging and never surface misleading strong-fit outcomes.
  - [x] 2.4 Preserve lifecycle idempotency and canonical status vocabulary (`queued`, `evaluating`, `completed`, `degraded`, `failed`).

- [x] Task 3: Add refresh/re-run workflow against latest profile state with distinguishable run outcomes (AC: #2, #3)
  - [x] 3.1 Add `POST /api/recommendations/runs/[runId]/refresh` in `server/api/recommendations/runs/[runId]/refresh.post.ts` (or equivalent) to trigger a new or updated evaluation from current profile state.
  - [x] 3.2 Reuse existing ownership/session guards and ensure refresh attempts are scoped to run owner only.
  - [x] 3.3 Persist refresh linkage metadata so refreshed output can be distinguished from prior run state.
  - [x] 3.4 Keep refresh behavior aligned with existing async lifecycle processing and failure semantics.

- [x] Task 4: Extend read contracts for degraded/withheld details without leaking internals (AC: #1, #2, #3)
  - [x] 4.1 Extend `GET /api/recommendations/runs/[runId]/results` to return confidence/freshness/caveat fields for each candidate.
  - [x] 4.2 Ensure withheld/degraded outcomes are represented explicitly and remain consumable by downstream Epic 3 explanation/review surfaces.
  - [x] 4.3 Preserve supported-scope filtering and normalized output shape.
  - [x] 4.4 Keep status/recovery guidance readable in workspace lifecycle/status payloads for degraded/failed runs.

- [x] Task 5: Add API + integration coverage for qualification, refresh continuity, and safe failure behavior (AC: #1, #2, #3)
  - [x] 5.1 Add API tests for degraded/failed qualification branches and explicit caveat payload shape.
  - [x] 5.2 Add API tests for refresh/re-run authorization, new/latest profile-state linkage, and result distinguishability.
  - [x] 5.3 Add integration tests for dependency/retrieval-failure handling that verify safe status outcomes and no misleading strong-fit results.
  - [x] 5.4 Reuse deterministic recommendation seed/reset hooks and mock modes from Stories 2.1-2.3 for stable lifecycle assertions.

- [x] Review Follow-ups (AI)
  - [x] [AI-Review][HIGH] Make refresh creation atomic across Postgres snapshot insert and Convex run creation; current rollback can delete a snapshot after a run is already created, leaving broken cross-store linkage. [server/api/recommendations/runs/[runId]/refresh.post.ts:144]
  - [x] [AI-Review][HIGH] Return terminal-safe payload for failed runs without ranked results instead of `409 Recommendation ranking not ready` when status is already `failed` due dependency/retrieval failure. [server/api/recommendations/runs/[runId]/results.get.ts:96]
  - [x] [AI-Review][MEDIUM] Add explicit integration coverage for dependency/retrieval failure branch in start-flow (`evaluatePathwayEligibilityForRun` error path), currently unverified despite Task 5.3 marked complete. [server/api/recommendations/runs/[runId]/start.post.ts:175]
  - [x] [AI-Review][MEDIUM] Sync Dev Agent Record File List with actual changed source/test files (`tests/support/fixtures/factories/recommendation-lifecycle-factory.ts`, `tests/support/fixtures/test-data.ts`). [_bmad-output/implementation-artifacts/2-4-safely-qualify-weak-results-and-support-recommendation-refresh.md:260]

## Dev Notes

- Story 2.3 established ranked recommendation persistence and `completed` terminal finalization on successful standard processing.
- Story 2.4 extends that pipeline by adding trust qualification and safe degradation semantics before final output is surfaced.
- Keep recommendation execution and trust qualification server-owned (`server/api`, `server/utils`, `convex`), with provider internals hidden from browser payloads.
- Refresh/re-run behavior must preserve run history continuity and avoid ambiguous overwrites of prior results.

### UI/UX Context

- This is a backend/non-UI story slice.
- No new route or component is required to satisfy Story 2.4.
- Existing workspace status and results surfaces consume normalized contracts that now include degraded/withheld caveat context.

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

- No direct frontend artifact consumption is required in Story 2.4.

### Project Structure Notes

- API:
  - `server/api/recommendations/runs/[runId]/start.post.ts`
  - `server/api/recommendations/runs/[runId]/results.get.ts`
  - `server/api/recommendations/runs/[runId]/refresh.post.ts` (new)
  - `server/api/recommendations/runs/[runId]/status.get.ts`
- Server logic:
  - `server/utils/recommendations/generateRankedRecommendations.ts`
  - `server/utils/recommendations/qualifyWeakRecommendationResults.ts` (new)
  - `server/utils/recommendations/lifecycle.ts`
- Persistence/workflow:
  - `convex/schema.ts`
  - `convex/recommendationRuns.ts`
- Tests:
  - `tests/api/*recommendation-qualification*`
  - `tests/api/*recommendation-refresh*`
  - `tests/integration/*recommendation-qualification*`
  - `tests/integration/*recommendation-refresh*`

### Technical Requirements

- Qualification must never promote weak/unsupported outputs to `strong-fit`.
- Each degraded/withheld result must expose explicit confidence, freshness, and caveat metadata in normalized API contracts.
- Finalization rules must map partial trustworthiness to `degraded` and no-trustworthy-output scenarios to `failed`.
- Refresh/re-run execution must target latest profile state and preserve distinguishability from prior run outputs.
- Dependency/retrieval failures must degrade safely with user-safe recovery messaging, not opaque or misleading payloads.

### Architecture Compliance

- Keep Nuxt server routes as the only browser-facing HTTP boundary.
- Keep trust-sensitive recommendation qualification logic in `server/utils` and `convex`, not Vue components.
- Preserve owner-scoped access control for all run/refresh operations.
- Preserve staged recommendation lifecycle behavior and explicit terminal transitions.

### Library and Framework Requirements

- Continue Nuxt 4 route handlers and TypeScript-first server utilities.
- Use existing auth/session guards (`requireWorkspaceUserSession`) and runtime-validation patterns.
- Use Convex validators and indexed queries/mutations for recommendation run state and result persistence.
- Keep schema-first contract discipline (`zod` at server boundaries, `v.*` in Convex).

### File Structure Requirements

- Primary expected touches in this story:
  - `server/api/recommendations/runs/[runId]/start.post.ts`
  - `server/api/recommendations/runs/[runId]/results.get.ts`
  - `server/api/recommendations/runs/[runId]/refresh.post.ts` (new)
  - `server/utils/recommendations/generateRankedRecommendations.ts`
  - `server/utils/recommendations/qualifyWeakRecommendationResults.ts` (new)
  - `server/utils/recommendations/lifecycle.ts`
  - `convex/schema.ts`
  - `convex/recommendationRuns.ts`
  - `tests/api/*recommendation-qualification*`
  - `tests/api/*recommendation-refresh*`
  - `tests/integration/*recommendation-qualification*`
  - `tests/integration/*recommendation-refresh*`
  - `tests/support/fixtures/factories/recommendation-lifecycle-factory.ts` (as needed)
- Avoid broad refactors outside recommendation-domain modules in this story.

### Testing Requirements

- Add API coverage for:
  - degraded vs failed finalization branches from qualification outcomes
  - normalized confidence/freshness/caveat output contract shape
  - refresh/re-run owner scoping and latest profile-state linkage
- Add integration coverage for:
  - safe dependency/retrieval failure handling
  - refreshed result distinguishability vs prior run state
  - canonical status + status-message continuity in degraded/failed cases
- Reuse deterministic lifecycle controls (`/api/recommendations/testing/reset`, `/api/recommendations/testing/seed`) and mock modes for stable setup.

### Previous Story Intelligence

- Story 2.3 already writes ranked recommendation artifacts and finalizes successful standard runs to `completed`; Story 2.4 must add qualification logic before terminal status decisions.
- Story 2.3 preserved explicit pending behavior (`409`) for results not yet ranked; keep the same explicitness for refresh/qualification states.
- Story 2.3 normalized direct/blocked/composed contracts and supported-scope filtering; extend, do not replace, that normalized response model.
- Story 2.3 retained idempotent handling for terminal runs on standard start requests; refresh behavior must remain explicit and intentional rather than silently mutating terminal results.

### Git Intelligence Summary

- Recent commit history shows incremental Epic 2 delivery with review-hardening follow-ups (`feat(story-2.2)` then `feat(story-2.3)` plus merge/fix cycles).
- Keep Story 2.4 scoped to weak-result qualification, safe degradation, and refresh continuity without unrelated platform churn.

### Latest Tech Information

- Current repository baseline (from `package.json`):
  - `nuxt` `^4.3.1`
  - `vue` `^3.5.28`
  - `typescript` `^5.9.3`
  - `convex` `^1.32.0`
  - `better-auth` `1.4.9`
  - `zod` `3.25.76`
- Latest npm registry checks on 2026-03-05:
  - `nuxt` latest `4.3.1` (current)
  - `vue` latest `3.5.29` (patch available)
  - `typescript` latest `5.9.3` (current)
  - `convex` latest `1.32.0` (current)
  - `better-auth` latest `1.5.3` (minor available)
  - `zod` latest `4.3.6` (major available)
- Story guidance:
  - Keep pinned dependency behavior unchanged during Story 2.4 implementation and avoid incidental upgrades.

### Project Context Reference

- `_bmad-output/project-context.md` remains mandatory for:
  - Nuxt server/client trust boundaries
  - runtime validation and type-safety patterns
  - recommendation-domain ownership in `server/utils` + `convex`
  - secure provider-integration mediation

### Story Completion Status

- Story context quality review status: complete
- Frontend-impacting classification: `false`
- Approved design handoff package: not required
- Ready-for-dev gate: satisfied
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4]
- [Source: _bmad-output/planning-artifacts/prd.md#Recommendation Generation & Pathway Analysis]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- [Source: _bmad-output/project-context.md]
- [Source: _bmad-output/implementation-artifacts/2-3-generate-and-rank-limited-composed-pathway-recommendations.md]
- [Source: _bmad-output/test-artifacts/test-design/cadet2-handoff.md#Story-Level Integration Guidance]
- [Source: docs/recommendation-lifecycle-testing.md]
- [Source: package.json]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (CLI)

### Implementation Plan

1. Add weak-result qualification model and persistence contracts for confidence/freshness/caveats.
2. Apply degraded/failed finalization decisions in recommendation orchestration.
3. Implement refresh/re-run route and run-linkage continuity metadata.
4. Extend results/status contracts and add API + integration coverage.

### Stitch Retrieval Log

Not applicable for this backend/non-UI story.

### UI Implementation Mapping

Not applicable for this backend/non-UI story.

### Debug Log References

- `pnpm exec playwright test --project=api tests/api/recommendation-qualification.atdd.spec.ts tests/api/recommendation-refresh.atdd.spec.ts`
- `pnpm exec playwright test --project=api tests/integration/recommendation-qualification.integration.spec.ts tests/integration/recommendation-refresh.integration.spec.ts`
- `pnpm exec playwright test --project=api tests/integration/recommendation-ranking.integration.spec.ts`
- `pnpm test:api`
- `pnpm exec playwright test --project=api tests/api/recommendation-qualification.atdd.spec.ts tests/api/recommendation-refresh.atdd.spec.ts tests/integration/recommendation-qualification.integration.spec.ts tests/integration/recommendation-refresh.integration.spec.ts tests/integration/recommendation-ranking.integration.spec.ts`
- `pnpm exec playwright test --project=api tests/integration/recommendation-ranking.integration.spec.ts`

### Completion Notes List

- Added `server/utils/recommendations/qualifyWeakRecommendationResults.ts` and wired qualification metadata (`qualification`, `confidence`, `freshness`, `caveat`) into persisted recommendation contracts.
- Updated start-flow orchestration to finalize standard runs as `completed`, `degraded`, or `failed` from qualification outcomes, with safe-retry messaging on dependency failures.
- Added `POST /api/recommendations/runs/[runId]/refresh` with owner-scoped refresh behavior, latest profile snapshot capture, and persisted lineage metadata (`refreshedFromRunId`, `previousProfileSnapshotId`, `refreshRootRunId`, `refreshSequence`).
- Extended results and status/workspace read contracts to expose qualification and refresh lineage context without provider internals.
- Enabled Story 2.4 API and integration suites (removed red-phase skips) and confirmed full API regression passes.
- Hardened refresh run creation rollback semantics so snapshot cleanup only runs when Convex run creation actually fails.
- Updated results contract to return terminal-safe failed payloads (empty arrays + recovery guidance) when ranking artifacts are unavailable.
- Added explicit integration coverage for dependency/retrieval failure in start-flow and validated failed status + terminal-safe results response.
- Synchronized Dev Agent Record File List with actual changed support fixture files.
- Tightened qualification terminal-status mapping so mixed-confidence outputs remain `degraded` while fully withheld outputs remain `failed`.
- Hardened refresh creation against cross-store ambiguity by probing Convex run existence after mutation failures and avoiding destructive snapshot rollback.
- Made legacy ranked-candidate metadata defaults conservative (`low-confidence`, `unknown` freshness) to avoid overstating trust on incomplete historical records.
- Tightened Story 2.3 nominal-path ranking integration assertions to reject `failed` while allowing expected degraded outcomes.

### Senior Developer Review (AI)

- Date: 2026-03-05
- Reviewer: Amelia (Developer Agent)
- Outcome: Resolved (follow-ups implemented)
- Scope reviewed: Story ACs/tasks, git vs story file-list consistency, all changed recommendation-domain source + test files.
- Evidence: `pnpm exec playwright test --project=api tests/api/recommendation-qualification.atdd.spec.ts tests/api/recommendation-refresh.atdd.spec.ts tests/integration/recommendation-qualification.integration.spec.ts tests/integration/recommendation-refresh.integration.spec.ts tests/integration/recommendation-ranking.integration.spec.ts` (15 passed).
- Key findings:
  - HIGH: refresh flow is not cross-store atomic and can orphan Convex run references.
  - HIGH: results endpoint reports terminal failed runs as pending (`409`) when no ranking was persisted.
  - MEDIUM: dependency/retrieval failure path lacks direct integration coverage though story task 5.3 is marked done.
  - MEDIUM: file-list documentation is incomplete versus git changes.

### Senior Developer Review (AI) - Follow-up Pass

- Date: 2026-03-05
- Reviewer: Amelia (Developer Agent)
- Outcome: Resolved (all HIGH/MEDIUM items fixed)
- Evidence: `pnpm exec playwright test --project=api tests/api/recommendation-qualification.atdd.spec.ts tests/api/recommendation-refresh.atdd.spec.ts tests/integration/recommendation-qualification.integration.spec.ts tests/integration/recommendation-refresh.integration.spec.ts tests/integration/recommendation-ranking.integration.spec.ts` (14/15 passed before assertion correction) + `pnpm exec playwright test --project=api tests/integration/recommendation-ranking.integration.spec.ts` (3 passed after correction).
- Fix summary:
  - Updated qualification terminal logic to avoid `completed` status when non-supported results are present and preserve `failed` when all outputs are withheld.
  - Updated refresh flow to prevent cross-store linkage breakage under ambiguous Convex mutation failures.
  - Updated legacy qualification defaults to conservative values so old records do not overstate confidence.
  - Tightened nominal-path ranking integration assertions to disallow terminal `failed` outcomes.

### File List

- `server/api/recommendations/runs/[runId]/start.post.ts`
- `server/api/recommendations/runs/[runId]/results.get.ts`
- `server/api/recommendations/runs/[runId]/refresh.post.ts` (new)
- `server/api/recommendations/runs/[runId]/status.get.ts`
- `server/utils/recommendations/generateRankedRecommendations.ts`
- `server/utils/recommendations/qualifyWeakRecommendationResults.ts` (new)
- `server/utils/recommendations/lifecycle.ts`
- `server/api/workspace/recommendation-runs.get.ts`
- `convex/schema.ts`
- `convex/recommendationRuns.ts`
- `tests/api/recommendation-qualification.atdd.spec.ts`
- `tests/api/recommendation-refresh.atdd.spec.ts`
- `tests/integration/recommendation-qualification.integration.spec.ts`
- `tests/integration/recommendation-refresh.integration.spec.ts`
- `tests/integration/recommendation-ranking.integration.spec.ts`
- `tests/support/fixtures/factories/recommendation-lifecycle-factory.ts`
- `tests/support/fixtures/test-data.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-03-05: Implemented Story 2.4 weak-result qualification, degraded/failed finalization, refresh lineage flow, expanded results/status contracts, and full API regression validation.
- 2026-03-05: Senior Developer Review (AI) completed; outcome set to Changes Requested, follow-up action items added, status moved to in-progress.
- 2026-03-05: Fixed all AI review follow-ups (refresh atomicity hardening, failed-result contract safety, dependency-failure integration coverage, and file-list sync), re-ran Story 2.4 API/integration suites, and returned status to review.
- 2026-03-05: Applied post-review fixes for qualification terminal classification, refresh cross-store ambiguity handling, conservative legacy metadata defaults, and ranking integration status assertions; validated with Story 2.3/2.4 API integration reruns.
