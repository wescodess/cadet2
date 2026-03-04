# Story 2.1: Start Recommendation Processing from a Submitted Profile

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an immigration user,
I want my submitted profile to start a tracked recommendation process,
so that the system can evaluate my case and show clear progress toward results.

## Acceptance Criteria

1. **Given** I have a submitted intake profile **When** recommendation processing begins **Then** the system updates the recommendation run record created from intake submission with an explicit processing status **And** the run remains linked to the submitted profile snapshot created in Epic 1.
2. **Given** recommendation processing is not yet complete **When** I check the run state **Then** the system exposes one canonical lifecycle status from this fixed MVP set: `queued`, `evaluating`, `completed`, `degraded`, or `failed` **And** the state is readable by the workspace without requiring provider details to be exposed.
3. **Given** the recommendation status surface is rendered in the workspace **When** a user views the in-progress run **Then** the status banner reflects the current lifecycle state clearly **And** the recommendation status surface can bind to a stable `data-testid="recommendation-status-banner"` hook.
4. **Given** the recommendation workflow encounters a recoverable internal delay **When** the run remains in progress **Then** the user-facing state continues to indicate active processing rather than appearing stuck **And** the run stays resumable within the existing workflow model.
5. **Implementation constraint (from test-architecture artifacts):** Deterministic seed/reset hooks and provider-mock paths must exist for lifecycle verification in API/integration tests, even when they are not user-facing.

## Tasks / Subtasks

- [x] Task 1: Add lifecycle transition primitives for recommendation run processing start (AC: #1, #2, #4)
  - [x] 1.1 Extend `convex/recommendationRuns.ts` with explicit status-transition mutations/queries (at minimum: `queued -> evaluating` start transition and guarded terminal updates).
  - [x] 1.2 Add transition guardrails that reject invalid state jumps and preserve canonical status vocabulary only.
  - [x] 1.3 Ensure transition updates preserve linkage fields (`runId`, `userId`, `profileSnapshotId`) and update monotonic timestamps for resumability signaling.

- [x] Task 2: Add authenticated server API boundaries for starting and reading processing status (AC: #1, #2, #4)
  - [x] 2.1 Add a user-scoped start-processing boundary (for example `POST /api/recommendations/runs/:runId/start`) in `server/api/recommendations/runs/[runId]/start.post.ts`.
  - [x] 2.2 Add a user-scoped status-read boundary (for example `GET /api/recommendations/runs/:runId/status`) in `server/api/recommendations/runs/[runId]/status.get.ts`.
  - [x] 2.3 Keep response contracts normalized and provider-agnostic (no raw provider payloads, secrets, or adapter internals returned).
  - [x] 2.4 Enforce workspace ownership checks through existing auth/session boundaries before reading or mutating run status.

- [x] Task 3: Wire workspace status visibility with stable UI hooks (AC: #2, #3, #4)
  - [x] 3.1 Add `app/components/workspace/RecommendationStatusBanner.vue` to render canonical lifecycle states with text-first status messaging.
  - [x] 3.2 Add stable hook `data-testid="recommendation-status-banner"` and ensure status meaning is understandable without color-only cues.
  - [x] 3.3 Integrate banner rendering into `app/pages/workspace/index.vue` (or the active run surface) with explicit handling for `queued` and `evaluating` in-progress states.
  - [x] 3.4 Keep `app/components/workspace/RecommendationRunList.vue` lifecycle labels aligned with canonical status set and shared status mapping utilities.

- [x] Task 4: Implement resumable in-progress behavior for recoverable delays (AC: #4)
  - [x] 4.1 Add lightweight processing telemetry fields or derived signals needed to indicate "still actively processing" versus terminal failure.
  - [x] 4.2 Ensure recoverable delays keep run state in an in-progress lifecycle (`queued` or `evaluating`) instead of prematurely flipping to `failed`.
  - [x] 4.3 Add retry/resume-safe start logic that is idempotent for repeated start requests on the same run.

- [x] Task 5: Add deterministic test scaffolding for lifecycle scenarios (AC: #5)
  - [x] 5.1 Add dev/test seed-reset primitives for recommendation lifecycle setup, scoped to non-production environments.
  - [x] 5.2 Add provider-mock/fault-injection seams so integration tests can force delay, degraded, and failure paths deterministically.
  - [x] 5.3 Document lifecycle telemetry and deterministic setup in test artifacts or developer docs used by API/integration suites.

- [x] Task 6: Add API/integration/E2E coverage for lifecycle and status banner behavior (AC: #1, #2, #3, #4, #5)
  - [x] 6.1 Add API tests for start transition correctness, canonical status set enforcement, and ownership authorization denials.
  - [x] 6.2 Add integration tests for recoverable delay behavior (run remains resumable/in-progress) and terminal transitions.
  - [x] 6.3 Add E2E assertions for workspace status banner visibility, accessible messaging, and `recommendation-status-banner` test hook stability.

### Review Follow-ups (AI)

- [x] [AI-Review][High] Restrict mock start modes (`recoverable-delay`, `mock-*`) to non-production test mode only; production `POST /api/recommendations/runs/:runId/start` now rejects these inputs via test-mode guard. [server/api/recommendations/runs/[runId]/start.post.ts:95]
- [x] [AI-Review][High] Fix recoverable-delay transition behavior for already-in-progress runs (`evaluating` now remains in-progress/resumable without `409`). [convex/recommendationRuns.ts:45]
- [x] [AI-Review][High] Implement integration coverage for lifecycle delay and terminal transitions under `tests/integration`. [tests/integration/recommendation-lifecycle.integration.spec.ts:1]
- [x] [AI-Review][Medium] Synchronize Dev Agent Record File List with actual git changes by documenting `.gitignore` update. [_bmad-output/implementation-artifacts/2-1-start-recommendation-processing-from-a-submitted-profile.md:320]

## Dev Notes

- Story 1.4 established run creation/list continuity with initial `queued` status. This story adds controlled processing start + lifecycle visibility, not full pathway scoring output.
- Keep recommendation lifecycle ownership server-side (`server/api` + `convex`) and avoid exposing provider internals to Vue surfaces.
- Preserve canonical lifecycle language exactly: `queued`, `evaluating`, `completed`, `degraded`, `failed`.
- Align implementation with quality blockers documented in the test-design artifacts: deterministic state control, provider mocks, and lifecycle telemetry contract.

### UI/UX Context

- This is a frontend-impacting story.
- User-facing scope is lifecycle clarity during in-progress recommendation work, especially preventing "stuck" ambiguity.
- The UI should communicate active processing with calm, explicit status copy that preserves trust in delayed states.

### Affected Frontend Surfaces

1. `app/pages/workspace/index.vue` (workspace lifecycle visibility entry point)
2. `app/components/workspace/RecommendationRunList.vue` (status consistency and run-state display)
3. `app/components/workspace/RecommendationStatusBanner.vue` (new status-focused lifecycle banner)

### Concept Options (3 Paired Directions Per Surface)

- Surface Group: Recommendation Processing Status Visibility (`workspace/index` + status banner + run continuity panel)
- Direction A: `Progress Hub`
  - Desktop: `5853854a55e1466e979995b699bf6f4b`
  - Mobile: `644856989f9a485da113a32a267fc4b2`
  - Prompt summary: Progress-led framing with strong "currently processing" continuity emphasis and low-cognitive-load status blocks.
- Direction B: `Comparison Workspace`
  - Desktop: `3a4bf4f2083e46d89b219ab72563bf1a`
  - Mobile: `2d7501846dd44d8a8bc52b9742494a71`
  - Prompt summary: Balanced analytical layout preserving status context beside run continuity and upcoming recommendation decision surfaces.
- Direction C: `Evidence & Tasks`
  - Desktop: `34bd9708e6764ade9b02545731f6af4c`
  - Mobile: `a8bbe3f9604543ab8e6f4eddb64d493b`
  - Prompt summary: Task-forward status framing with explicit delay/recovery messaging and action-oriented follow-up cues.

### Approved Stitch Design Package

- Stitch project ID: `6257021077077987630`
- Surface-to-concept-options mapping:
  - `recommendation-processing-status-visibility`
    - A (`Progress Hub`): desktop `5853854a55e1466e979995b699bf6f4b`, mobile `644856989f9a485da113a32a267fc4b2`
    - B (`Comparison Workspace`): desktop `3a4bf4f2083e46d89b219ab72563bf1a`, mobile `2d7501846dd44d8a8bc52b9742494a71`
    - C (`Evidence & Tasks`): desktop `34bd9708e6764ade9b02545731f6af4c`, mobile `a8bbe3f9604543ab8e6f4eddb64d493b`
- Surface-to-approved-pair mapping:
  - `recommendation-processing-status-visibility` -> Direction B (`Comparison Workspace`)
- Approved desktop screen IDs:
  - `3a4bf4f2083e46d89b219ab72563bf1a`
- Approved mobile screen IDs:
  - `2d7501846dd44d8a8bc52b9742494a71`
- Approved component IDs:
  - `recommendation-status-banner` (implementation component target, screen-level design source above)
- Approved concept labels:
  - `Comparison Workspace`
- Selected variant labels:
  - `Comparison Workspace (Desktop + Mobile Pairing)`
- Prompt summary:
  - Status clarity should remain visible and trustworthy while recommendation evaluation runs asynchronously and may experience recoverable delay.
- Design context source:
  - `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `_bmad-output/planning-artifacts/DESIGN.md`
- Token artifact references:
  - `_bmad-output/planning-artifacts/design-tokens.json`
  - `_bmad-output/planning-artifacts/design-tokens.css`
- Pair approval rationale:
  - Reuses the app-level approved direction from UX foundation artifacts, preserving continuity with Story 1.4 workspace surfaces and minimizing design drift.
- Supporting screenshot/code references:
  - Stitch screen IDs listed above and existing workspace implementation in `app/pages/workspace/index.vue` + `app/components/workspace/RecommendationRunList.vue`.

### Approved Variant Decision

- Approved direction: `Comparison Workspace` for recommendation processing status visibility surfaces.
- Rationale:
  - Maintains the approved app-foundation visual hierarchy and responsive pairing already selected in UX planning artifacts.
  - Supports concurrent visibility of run continuity and clear lifecycle status messaging.
  - Best fit for future Epic 2 recommendation detail/comparison surfaces without rework.

### Design Tokens / System Constraints

- Use semantic tokens from `_bmad-output/planning-artifacts/design-tokens.css`; avoid direct hex usage in new status components.
- Preserve Public Sans, 8px spacing rhythm, and existing trust/status semantic color roles.
- Keep status meaning text-first (not color-only), with WCAG 2.1 AA contrast and keyboard/screen-reader discoverability.
- Ensure lifecycle badge/banner patterns remain consistent with existing run list styles unless token-level updates are explicitly required.

### Stitch Retrieval Instructions

- Fetch approved pair first:
  - `get_screen(projectId='6257021077077987630', screenId='3a4bf4f2083e46d89b219ab72563bf1a')`
  - `get_screen(projectId='6257021077077987630', screenId='2d7501846dd44d8a8bc52b9742494a71')`
- Keep alternates available for refinement:
  - `get_screen(projectId='6257021077077987630', screenId='5853854a55e1466e979995b699bf6f4b')`
  - `get_screen(projectId='6257021077077987630', screenId='644856989f9a485da113a32a267fc4b2')`
  - `get_screen(projectId='6257021077077987630', screenId='34bd9708e6764ade9b02545731f6af4c')`
  - `get_screen(projectId='6257021077077987630', screenId='a8bbe3f9604543ab8e6f4eddb64d493b')`
- Implementation translation should follow `stitch-vue-components` and `stitch-shadcn-vue` conventions for Vue + shadcn/reka composition.

### Referenced UX Artifacts

- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/DESIGN.md`
- `_bmad-output/planning-artifacts/design-tokens.json`
- `_bmad-output/planning-artifacts/design-tokens.css`

### Project Structure Notes

- UI:
  - `app/pages/workspace/index.vue`
  - `app/components/workspace/RecommendationRunList.vue`
  - `app/components/workspace/RecommendationStatusBanner.vue` (new)
- API:
  - `server/api/recommendations/runs/[runId]/start.post.ts` (new)
  - `server/api/recommendations/runs/[runId]/status.get.ts` (new)
- Server logic:
  - `server/utils/auth/requireUserSession.ts`
  - `server/utils/recommendations/*` (status-mapping and lifecycle helpers as needed)
- Persistence/workflow:
  - `convex/recommendationRuns.ts`
  - `convex/schema.ts`
- Test/domain scaffolding:
  - `tests/api/*recommendation-lifecycle*`
  - `tests/integration/*recommendation-lifecycle*`
  - `tests/e2e/*workspace-recommendation-status*`
  - `tests/support/fixtures/*`

### Technical Requirements

- Processing start must mutate existing run records created in Story 1.4; do not create duplicate run records for status transitions.
- Lifecycle transitions must be explicit and validated against canonical status contracts.
- Status read contracts must remain provider-agnostic and safe for workspace rendering.
- Recovery delays must preserve resumability; do not treat every delay as terminal failure.
- Keep run/profile linkage immutable for this story (`runId`, `profileSnapshotId`, `userId` lineage remains intact).

### Architecture Compliance

- Keep Nuxt server routes as the only browser-facing boundary for lifecycle transitions/status reads.
- Keep trust-sensitive processing logic in `server/` + `convex/`, not in Vue components.
- Maintain strict auth ownership checks for all run mutation/read operations.
- Preserve fixed lifecycle vocabulary and avoid alternate aliases that break cross-story contracts.

### Library and Framework Requirements

- Continue Nuxt 4 route handlers and Vue 3 `<script setup lang="ts">` patterns already used in workspace flows.
- Use existing auth/session guard utilities (`requireWorkspaceUserSession`) for workspace lifecycle boundaries.
- Keep Convex validators and indices consistent with existing schema patterns.
- Use `zod` for any new server-side boundary payload validation.

### File Structure Requirements

- Primary expected touches in this story:
  - `app/pages/workspace/index.vue`
  - `app/components/workspace/RecommendationRunList.vue`
  - `app/components/workspace/RecommendationStatusBanner.vue` (new)
  - `server/api/recommendations/runs/[runId]/start.post.ts` (new)
  - `server/api/recommendations/runs/[runId]/status.get.ts` (new)
  - `convex/recommendationRuns.ts`
  - `convex/schema.ts` (only if new lifecycle metadata fields are required)
  - `tests/api/*recommendation-lifecycle*`
  - `tests/integration/*recommendation-lifecycle*`
  - `tests/e2e/*workspace-recommendation-status*`
  - `_bmad-output/test-artifacts/atdd-checklist-2-1.md` (if generated during implementation)
- Avoid broad refactors in unrelated admin/RAG modules for this story.

### Testing Requirements

- Add API coverage for:
  - start-processing transition from `queued` to `evaluating`
  - canonical status contract enforcement and invalid transition rejection
  - ownership/auth denial on cross-user run access
- Add integration coverage for:
  - recoverable delay behavior preserving in-progress/resumable run state
  - terminal lifecycle transitions to `completed`, `degraded`, `failed` through deterministic mocks
- Add E2E coverage for:
  - workspace status banner rendering with `data-testid="recommendation-status-banner"`
  - clear in-progress copy in `queued`/`evaluating` states
  - non-color-only readable lifecycle messaging

### Latest Tech Information

- Current project pins:
  - `nuxt` `4.3.1`
  - `vue` `3.5.28`
  - `typescript` `5.9.3`
  - `convex` `1.32.0`
  - `better-auth` `1.4.9`
  - `zod` `3.25.76`
- Latest npm registry checks on 2026-03-04:
  - `nuxt` latest `4.3.1` (already current)
  - `vue` latest `3.5.29` (patch available)
  - `typescript` latest `5.9.3` (already current)
  - `convex` latest `1.32.0` (already current)
  - `better-auth` latest `1.5.3` (minor upgrade available)
  - `zod` latest `4.3.6` (major upgrade path)
- Story guidance:
  - Keep pinned versions for Story 2.1 and avoid incidental dependency upgrades while implementing lifecycle/status contracts.

### Project Context Reference

- `_bmad-output/project-context.md` remains mandatory for:
  - Nuxt server boundary rules
  - auth/ownership enforcement expectations
  - Convex validation/index patterns
  - server-only external-provider integration policy

### Story Completion Status

- Story context quality review status: complete
- Frontend-impacting classification: `true`
- Approved design handoff package: embedded
- Ready-for-dev gate: satisfied
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.
- Completion note: Frontend design packaging complete - approved Stitch design package embedded in story file.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1]
- [Source: _bmad-output/planning-artifacts/prd.md#Recommendation Generation & Pathway Analysis]
- [Source: _bmad-output/planning-artifacts/prd.md#Non-Functional Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: _bmad-output/project-context.md]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Variant Exploration]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Selected Direction]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Stitch Artifact Registry]
- [Source: _bmad-output/planning-artifacts/DESIGN.md]
- [Source: _bmad-output/test-artifacts/test-design/cadet2-handoff.md#Story-Level Integration Guidance]
- [Source: _bmad-output/test-artifacts/test-design-architecture.md#Quick Guide]
- [Source: package.json]

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Implementation Plan

1. Add lifecycle transition primitives and guarded status contracts in Convex.
2. Add authenticated start/status API boundaries for recommendation runs.
3. Add workspace lifecycle status banner and integrate stable test hook.
4. Add deterministic seed/mock scaffolding and lifecycle API/integration/E2E coverage.

### Stitch Retrieval Log

- Approved pair for this story is embedded in this file (Direction B: `Comparison Workspace` desktop/mobile pair).
- Dev implementation should fetch approved screen IDs before translating status-banner composition.

### UI Implementation Mapping

- Pending implementation.

### Debug Log References

- `pnpm exec playwright test --project=api tests/api/recommendation-lifecycle.atdd.spec.ts`
- `pnpm exec playwright test --project=api tests/integration/recommendation-lifecycle.integration.spec.ts`
- `pnpm exec playwright test --project=chromium tests/e2e/workspace-recommendation-status.atdd.spec.ts`
- `pnpm exec playwright test --project=chromium tests/e2e/intake-submit.atdd.spec.ts -g "successful intake submission confirms next state and surfaces run continuity in workspace"`
- `pnpm run test:all`

### Completion Notes List

- Implemented canonical lifecycle transition primitives and guardrails in Convex with start, terminal, read, and deterministic test support mutations/queries.
- Added authenticated lifecycle boundaries: `POST /api/recommendations/runs/:runId/start`, `GET /api/recommendations/runs/:runId/status`, and non-production deterministic test endpoints for reset/seed.
- Added `RecommendationStatusBanner` with stable `data-testid="recommendation-status-banner"` and integrated workspace lifecycle rendering + canonical status mapping.
- Added lifecycle testing documentation and API/E2E ATDD coverage for lifecycle transitions, ownership denials, resumable delay behavior, and terminal mock modes.
- Added integration lifecycle coverage for recoverable-delay (`evaluating` in-progress preservation) and terminal transition persistence checks.
- Fixed regression in Story 1.4 E2E mocks by adding recommendation status endpoint mocking for run continuity tests after workspace lifecycle status calls were introduced.
- Full regression completed: `55 passed`, `23 skipped` on `pnpm run test:all`.
- Applied code-review follow-up fixes: non-production gating for mock lifecycle start modes and recoverable-delay transition handling for already-evaluating runs.

### Senior Developer Review (AI)

- Review Date: 2026-03-04
- Reviewer: Wesleyukadike (AI code-review workflow)
- Outcome: Approved
- Summary:
  - API + integration + E2E Story 2.1 suites pass locally (`9 passed` API/integration, `5 passed` E2E).
  - Review follow-ups are implemented: mock-mode non-production gating, recoverable-delay in-progress preservation for evaluating runs, and explicit integration lifecycle coverage.
  - Story/task metadata and sprint tracking have been synchronized to completed state.

### File List

- _bmad-output/implementation-artifacts/2-1-start-recommendation-processing-from-a-submitted-profile.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- .gitignore
- app/components/workspace/RecommendationRunList.vue
- app/components/workspace/RecommendationStatusBanner.vue
- app/lib/recommendation-lifecycle.ts
- app/pages/workspace/index.vue
- convex/recommendationRuns.ts
- convex/schema.ts
- docs/recommendation-lifecycle-testing.md
- server/api/recommendations/runs/[runId]/start.post.ts
- server/api/recommendations/runs/[runId]/status.get.ts
- server/api/recommendations/testing/reset.post.ts
- server/api/recommendations/testing/seed.post.ts
- server/utils/recommendations/lifecycle.ts
- server/utils/recommendations/testMode.ts
- tests/api/recommendation-lifecycle.atdd.spec.ts
- tests/e2e/workspace-recommendation-status.atdd.spec.ts
- tests/e2e/intake-submit.atdd.spec.ts
- tests/integration/recommendation-lifecycle.integration.spec.ts
- tests/support/fixtures/factories/recommendation-lifecycle-factory.ts
- tests/support/fixtures/test-data.ts
- playwright.config.ts
- _bmad-output/test-artifacts/atdd-checklist-2-1.md
- _bmad-output/test-artifacts/atdd-temp/tea-atdd-api-tests-2026-03-04T15-30-57Z.json
- _bmad-output/test-artifacts/atdd-temp/tea-atdd-e2e-tests-2026-03-04T15-30-57Z.json
- _bmad-output/test-artifacts/atdd-temp/tea-atdd-summary-2026-03-04T15-30-57Z.json

### Change Log

- 2026-03-04: Created Story 2.1 ready-for-dev context package with lifecycle, architecture, testing, and approved frontend handoff details.
- 2026-03-04: Implemented Story 2.1 lifecycle backend/API/UI/test scope and set story status to review after full regression pass.
- 2026-03-04: Senior developer AI code review completed; status moved to `in-progress`, subtask `6.2` reopened, and follow-up action items added.
- 2026-03-04: Fixed all AI review follow-ups (mock-mode gating, recoverable-delay transition behavior, integration coverage, file-list sync) and set story status to `done`.
