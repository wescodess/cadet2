# Story 1.4: Submit Intake and Track Recommendation Run Records

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an immigration user,
I want to submit my completed intake and see my recommendation runs tracked in my workspace,
so that I can maintain continuity as my circumstances change over time.

## Acceptance Criteria

1. **Given** I complete the required intake sections **When** I submit the intake **Then** the system creates a new recommendation run record tied to my user and current profile snapshot **And** the run is stored as a distinct item that can be revisited later.
2. **Given** I have submitted intake more than once over time **When** I view my workspace **Then** I can see a list of my prior recommendation runs or run placeholders in chronological order **And** each item is scoped to my account only.
3. **Given** a new recommendation run is created **When** the system stores the run metadata **Then** it preserves clear linkage between the run and the submitted profile state **And** it does not require recommendation generation to be completed in this epic.
4. **Given** recommendation-run persistence is first introduced in this epic **When** this story establishes the run record **Then** it creates only the minimum metadata needed for run identity, ownership, profile linkage, and current status **And** later recommendation detail, evidence, and governance data remain owned by the stories that first require them.
5. **Given** I submit intake successfully **When** the operation finishes **Then** I receive clear confirmation that my profile has been submitted for recommendation processing **And** the system communicates the next state without leaving me in ambiguity.

## Tasks / Subtasks

- [x] Task 1: Add intake submission boundary and profile snapshot creation (AC: #1, #3, #4)
  - [x] 1.1 Add `POST /api/intake/submit` in `server/api/intake/submit.post.ts` behind `requireWorkspaceUserSession`.
  - [x] 1.2 Validate draft completeness server-side (required section checks) before creating any run record.
  - [x] 1.3 Introduce minimal submitted-profile snapshot persistence in PostgreSQL (`server/db/migrations/postgresql/0002_recommendation_profiles.sql`) with ownership linkage to `user.id`.
  - [x] 1.4 Store only minimum snapshot metadata required by AC #4 (snapshot id, userId, normalized submitted intake payload, createdAt).

- [x] Task 2: Introduce minimal recommendation run metadata lifecycle and retrieval (AC: #1, #2, #3, #4)
  - [x] 2.1 Create `convex/recommendationRuns.ts` with minimal run record fields: `runId`, `userId`, `profileSnapshotId`, `status`, `createdAt`, `updatedAt`.
  - [x] 2.2 Set initial run status to `queued` at submission time; do not trigger full recommendation generation in this story.
  - [x] 2.3 Add user-scoped retrieval route `GET /api/workspace/recommendation-runs` in `server/api/workspace/recommendation-runs.get.ts`.
  - [x] 2.4 Ensure retrieval is chronological (most recent first) and returns only the authenticated user’s runs.

- [x] Task 3: Wire intake submission UI and explicit confirmation state (AC: #1, #5)
  - [x] 3.1 Update `app/pages/workspace/intake.vue` to expose a dedicated submit action on final/valid intake state.
  - [x] 3.2 Add stable UI hooks: `data-testid="intake-submit"` and `data-testid="intake-submit-feedback"`.
  - [x] 3.3 Show clear submitted state messaging with run creation confirmation and next step guidance.
  - [x] 3.4 Prevent duplicate submissions while request is in progress.

- [x] Task 4: Surface recommendation run continuity in workspace (AC: #2, #5)
  - [x] 4.1 Create `app/components/workspace/RecommendationRunList.vue` to render run placeholders/records.
  - [x] 4.2 Integrate run list into `app/pages/workspace/index.vue` with empty state and chronological entries.
  - [x] 4.3 Ensure list entries expose stable hooks for tests (`data-testid="workspace-run-list"`, `data-testid="workspace-run-item"`).
  - [x] 4.4 Keep account scoping explicit in copy and behavior (no cross-user leakage of run metadata).

- [x] Task 5: Add API and E2E coverage for submission + run continuity (AC: #1, #2, #3, #4, #5)
  - [x] 5.1 Add API coverage for `POST /api/intake/submit` success, validation failure, and auth denial.
  - [x] 5.2 Add API coverage for `GET /api/workspace/recommendation-runs` ordering and user scoping.
  - [x] 5.3 Add E2E flow for complete intake -> submit -> confirmation -> workspace run list visibility.
  - [x] 5.4 Add E2E assertions that repeated submissions create distinct run records in reverse-chronological order.

## Dev Notes

- This story is the first persistence boundary for recommendation-run continuity. Keep scope minimal and implementation-focused: creation and listing, not full recommendation evaluation.
- Reuse Story 1.2/1.3 intake draft normalization patterns (`server/utils/intake/*`) and avoid introducing duplicate validation logic in the UI.
- Keep trust-sensitive state server-owned; Vue components render normalized payloads only.
- Preserve existing auth and ownership guardrails with `requireWorkspaceUserSession`.

### UI/UX Context

- This is a frontend-impacting story.
- The affected experience spans intake completion and workspace continuity: users submit intake and immediately see run-tracking state.
- UX priority is explicit completion confidence and low ambiguity about what happens next.

### Affected Frontend Surfaces

1. `app/pages/workspace/intake.vue` (submit action and completion feedback)
2. `app/pages/workspace/index.vue` (workspace continuity surface)
3. `app/components/workspace/RecommendationRunList.vue` (new run-list module)

### Concept Options (3 Paired Directions Per Surface)

- Surface Group: Intake Submission + Recommendation Run Continuity (`workspace/intake` + `workspace/index`)
- Direction A: `Progress Hub`
  - Desktop: `5853854a55e1466e979995b699bf6f4b`
  - Mobile: `644856989f9a485da113a32a267fc4b2`
  - Prompt summary: Emphasize clear submission milestone completion with next-action framing and minimal run cards.
- Direction B: `Comparison Workspace`
  - Desktop: `3a4bf4f2083e46d89b219ab72563bf1a`
  - Mobile: `2d7501846dd44d8a8bc52b9742494a71`
  - Prompt summary: Emphasize chronological run continuity and visible processing state with stronger analytical hierarchy.
- Direction C: `Evidence & Tasks`
  - Desktop: `34bd9708e6764ade9b02545731f6af4c`
  - Mobile: `a8bbe3f9604543ab8e6f4eddb64d493b`
  - Prompt summary: Emphasize what happens after submission, including task-oriented readiness cues and run-state visibility.

### Approved Stitch Design Package

- Stitch project ID: `6257021077077987630`
- Surface-to-concept-options mapping:
  - `submission-and-run-continuity`
    - A (`Progress Hub`): desktop `5853854a55e1466e979995b699bf6f4b`, mobile `644856989f9a485da113a32a267fc4b2`
    - B (`Comparison Workspace`): desktop `3a4bf4f2083e46d89b219ab72563bf1a`, mobile `2d7501846dd44d8a8bc52b9742494a71`
    - C (`Evidence & Tasks`): desktop `34bd9708e6764ade9b02545731f6af4c`, mobile `a8bbe3f9604543ab8e6f4eddb64d493b`
- Surface-to-approved-pair mapping:
  - `submission-and-run-continuity` -> Direction B (`Comparison Workspace`)
- Approved desktop screen IDs:
  - `3a4bf4f2083e46d89b219ab72563bf1a`
- Approved mobile screen IDs:
  - `2d7501846dd44d8a8bc52b9742494a71`
- Approved component IDs: N/A (screen-level handoff)
- Approved concept labels:
  - `Comparison Workspace`
- Selected variant labels:
  - `Comparison Workspace (Desktop + Mobile)`
- Prompt summary:
  - Intake completion should transition cleanly into recommendation-run continuity with explicit status communication.
- Design context source:
  - `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `_bmad-output/planning-artifacts/DESIGN.md`
- Token artifact references:
  - `_bmad-output/planning-artifacts/design-tokens.json`
  - `_bmad-output/planning-artifacts/design-tokens.css`
- Pair approval rationale:
  - This direction best supports chronological run review and continuity-oriented information density expected immediately after intake submission.
- Supporting screenshot/code references:
  - Stitch screen IDs above and existing workspace shell composition in `app/components/workspace/WorkspaceShell.vue`.

### Approved Variant Decision

- Approved direction: `Comparison Workspace` for submission confirmation + run continuity surfaces.
- Rationale:
  - Preserves the approved app-level direction in UX artifacts.
  - Matches story intent: chronological run visibility and explicit in-progress recommendation-state communication.
  - Supports desktop/mobile parity without introducing a divergent visual model in Epic 1.

### Design Tokens / System Constraints

- Use semantic tokens from `_bmad-output/planning-artifacts/design-tokens.css`; avoid hardcoded color values.
- Preserve Public Sans typography and the 8px spacing rhythm.
- Maintain WCAG 2.1 AA contrast and non-color-only status indication.
- Keep submission and run-state signals keyboard-discoverable and screen-reader friendly.

### Stitch Retrieval Instructions

- Fetch approved pair first:
  - `get_screen(projectId='6257021077077987630', screenId='3a4bf4f2083e46d89b219ab72563bf1a')`
  - `get_screen(projectId='6257021077077987630', screenId='2d7501846dd44d8a8bc52b9742494a71')`
- Keep alternates available for refinement:
  - `get_screen(projectId='6257021077077987630', screenId='5853854a55e1466e979995b699bf6f4b')`
  - `get_screen(projectId='6257021077077987630', screenId='644856989f9a485da113a32a267fc4b2')`
  - `get_screen(projectId='6257021077077987630', screenId='34bd9708e6764ade9b02545731f6af4c')`
  - `get_screen(projectId='6257021077077987630', screenId='a8bbe3f9604543ab8e6f4eddb64d493b')`
- Use `stitch-vue-components` and `stitch-shadcn-vue` conventions when translating approved artifacts into Vue implementation.

### Referenced UX Artifacts

- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/DESIGN.md`
- `_bmad-output/planning-artifacts/design-tokens.json`
- `_bmad-output/planning-artifacts/design-tokens.css`

### Project Structure Notes

- UI:
  - `app/pages/workspace/intake.vue`
  - `app/pages/workspace/index.vue`
  - `app/components/workspace/RecommendationRunList.vue`
- API:
  - `server/api/intake/submit.post.ts`
  - `server/api/workspace/recommendation-runs.get.ts`
- Server logic:
  - `server/utils/intake/*` (reuse normalization + snapshot assembly helpers)
- Persistence/workflow:
  - `server/db/migrations/postgresql/0002_recommendation_profiles.sql`
  - `convex/recommendationRuns.ts`

### Technical Requirements

- Submission must read from normalized intake draft state and validate required sections before creating a run.
- Each successful submission must create a new run record (no in-place overwrite of prior runs).
- Run metadata must preserve linkage to the submitted profile snapshot via `profileSnapshotId`.
- Initial lifecycle status must be explicit (`queued`) with timestamps (`createdAt`, `updatedAt`).
- API responses should remain stable and typed, returning at minimum run identity, status, and submission timestamp.
- Do not include recommendation ranking details, citations, confidence scoring, or admin-governance metadata in this story.

### Architecture Compliance

- Preserve boundary ownership:
  - `server/api/intake/*` owns intake submission HTTP contract.
  - `server/api/workspace/*` owns user workspace run retrieval contract.
  - `server/utils/intake/*` owns normalization and snapshot assembly logic.
  - `convex/*` owns recommendation-run operational state.
- Keep client thin and server-owned for persisted run state.
- Keep privileged integrations and trust-sensitive logic out of Vue page/component code.

### Library and Framework Requirements

- Use Nuxt 4 server handlers and Vue 3 `<script setup lang="ts">` patterns already established in repo.
- Continue schema-first validation (`zod`) at intake submission boundary.
- Use Convex `v.*` validators and indexed queries for recommendation run metadata functions.
- Keep Better Auth session enforcement through `requireWorkspaceUserSession`.

### File Structure Requirements

- Primary expected touches in this story:
  - `app/pages/workspace/intake.vue`
  - `app/pages/workspace/index.vue`
  - `app/components/workspace/RecommendationRunList.vue`
  - `server/api/intake/submit.post.ts`
  - `server/api/workspace/recommendation-runs.get.ts`
  - `server/db/migrations/postgresql/0002_recommendation_profiles.sql`
  - `convex/recommendationRuns.ts`
  - `tests/e2e/*intake-submit*`
  - `tests/api/*intake-submit*`
- Avoid introducing parallel recommendation-run structures outside these boundaries in this story.

### Testing Requirements

- Add API coverage for:
  - authenticated submission creating profile snapshot + run record
  - submission rejection when required intake sections are incomplete
  - user-scoped run list retrieval in reverse chronological order
- Add E2E coverage for:
  - end-to-end intake submit action and explicit confirmation messaging
  - workspace run list showing newly created run placeholder
  - repeated submissions producing distinct list entries
- Keep stable test hooks (`intake-submit`, `intake-submit-feedback`, `workspace-run-list`, `workspace-run-item`).

### Previous Story Intelligence

- Story 1.2 established resumable intake draft persistence and auth-scoped draft APIs.
- Story 1.3 established structured constraints + free-form context capture and update stability in goals state.
- Reuse those boundaries; do not re-platform intake flow or move persistence logic into components.
- Preserve existing accessibility and feedback posture (clear, immediate save/submit state messaging).

### Git Intelligence Summary

- Recent commit history shows a stable pattern:
  - incremental intake enhancements (`feat(intake): ...`)
  - server-side auth boundary hardening
  - reliability fixes for flow transitions and Playwright coverage
- Keep this story incremental: add submission + run continuity without broad refactors.

### Latest Tech Information

- Repository baseline remains:
  - Nuxt `4.3.1`, Vue `3.5.28`, TypeScript `5.9.3`
  - Convex `1.32.0`
  - Better Auth `1.4.9`
  - Zod `3.25.76`
- For this story, stay on pinned versions and avoid incidental framework/auth upgrades.

### Project Context Reference

- `_bmad-output/project-context.md` remains mandatory for:
  - security boundaries
  - Nuxt/TypeScript implementation rules
  - Convex validator/index patterns
  - server-only integration policy

### Story Completion Status

- Story context quality review status: complete
- Frontend-impacting classification: `true`
- Approved design handoff package: embedded
- Ready-for-dev gate: satisfied
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.
- Completion note: Frontend design packaging complete - approved Stitch design package embedded in story file.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Selected Direction]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Stitch Artifact Registry]
- [Source: _bmad-output/planning-artifacts/DESIGN.md]
- [Source: _bmad-output/project-context.md]
- [Source: _bmad-output/implementation-artifacts/1-3-capture-constraints-and-free-form-context.md]

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Implementation Plan

1. Add authenticated intake submission route and profile snapshot persistence boundary.
2. Add minimal recommendation run lifecycle persistence and user-scoped retrieval.
3. Wire submit interaction + run continuity surfaces in intake/dashboard UI.
4. Add API and E2E coverage for submission and run-list continuity.

### Stitch Retrieval Log

- Reused the approved Story 1.4 Stitch package metadata already embedded in this file (Direction B: `Comparison Workspace` desktop/mobile pair).
- No additional Stitch asset retrieval was required during implementation.

### UI Implementation Mapping

- `app/pages/workspace/intake.vue`
  - Added submit flow state (`isSubmitting`, `submitFeedback`) and `submitIntake()` API boundary call.
  - Added stable test hooks `intake-submit` and `intake-submit-feedback`.
  - Added explicit success/error/processing submission messaging and duplicate-submit protection.
- `app/components/workspace/RecommendationRunList.vue`
  - Added run continuity list with loading/error/empty states.
  - Added stable hooks `workspace-run-list` and `workspace-run-item`.
  - Added explicit account-scope copy for trust boundary clarity.
- `app/pages/workspace/index.vue`
  - Wired authenticated run list retrieval from `/api/workspace/recommendation-runs`.
  - Rendered recommendation run continuity component under dashboard intro card.
- `server/api/intake/submit.post.ts`
  - Added authenticated submit endpoint with server-owned completeness validation.
  - Persisted submitted snapshot to PostgreSQL (`recommendation_profiles`), then created queued run in Convex.
  - Returned minimal response contract only (`runId`, `profileSnapshotId`, `status`, `createdAt`, `updatedAt`).
- `server/api/workspace/recommendation-runs.get.ts`
  - Added user-scoped run retrieval contract and ISO timestamp normalization.
- `convex/recommendationRuns.ts` + `convex/schema.ts`
  - Added minimal run lifecycle records with `queued` initial status and descending user timeline index.
  - Aligned lifecycle status vocabulary with canonical values used by planning artifacts (`evaluating`, `degraded` support added).

### Debug Log References

- `pnpm exec tsc --noEmit` ✅
- `pnpm exec playwright test tests/api/intake-submit.atdd.spec.ts --project=api --reporter=line` ✅ (6 passed)
- `pnpm exec playwright test tests/e2e/intake-submit.atdd.spec.ts --project=chromium --reporter=line` ✅ (6 passed)
- Test-stability hardening applied:
  - isolated NuxtHub runtime data per Playwright run via `NUXT_HUB_DIR` + `NUXT_HUB_DB_DATA_DIR`
  - switched Story 1.4 E2E auth bootstrap to direct API sign-in/sign-up for deterministic authenticated setup
  - kept explicit hydration/loading waits and deterministic run-order assertions
- Additional review-remediation hardening:
  - made optional `frenchClb` truly optional in section validation
  - added compensation delete path when Convex run creation fails after snapshot insert
  - aligned run-status vocabulary to canonical values (`queued|evaluating|completed|degraded|failed`)

### Completion Notes List

- Implemented intake submission boundary and recommendation profile snapshot persistence.
- Implemented minimal recommendation run lifecycle storage and user-scoped retrieval.
- Added explicit intake submit confirmation and in-flight duplicate-submit prevention.
- Added workspace recommendation continuity list with stable E2E hooks.
- Fixed optional goals-section validation bug that incorrectly blocked empty optional `frenchClb`.
- Added relational/Convex consistency handling for snapshot-orphan prevention when run creation fails.
- Upgraded E2E coverage to assert full submission-to-workspace continuity and repeated-submit ordering behavior.
- Stabilized Playwright web-server boot by isolating NuxtHub migration/data directories per test run.
- Replaced flaky Story 1.4 E2E auth-session dependency with deterministic direct auth bootstrap in the spec.

### File List

- _bmad-output/implementation-artifacts/1-4-submit-intake-and-track-recommendation-run-records.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/test-artifacts/atdd-checklist-1-4.md
- app/pages/workspace/intake.vue
- app/pages/workspace/index.vue
- app/components/workspace/RecommendationRunList.vue
- nuxt.config.ts
- playwright.config.ts
- server/api/intake/submit.post.ts
- server/api/workspace/recommendation-runs.get.ts
- server/db/migrations/postgresql/0002_recommendation_profiles.sql
- convex/schema.ts
- convex/recommendationRuns.ts
- convex/_generated/api.d.ts
- tests/support/fixtures/test-data.ts
- tests/support/fixtures/factories/intake-submit-factory.ts
- tests/support/helpers/auth-provider.ts
- tests/api/intake-submit.atdd.spec.ts
- tests/e2e/intake-submit.atdd.spec.ts

### Change Log

- 2026-03-04: Implemented Story 1.4 submission + recommendation run continuity boundary, activated ATDD coverage, and marked story ready for review.
- 2026-03-04: Applied senior review fixes for validation correctness, status-vocabulary alignment, cross-store consistency compensation, and stronger Story 1.4 E2E assertion depth.
- 2026-03-04: Stabilized Playwright boot/auth execution for Story 1.4 and confirmed both Story 1.4 API + E2E suites passing in this environment.
