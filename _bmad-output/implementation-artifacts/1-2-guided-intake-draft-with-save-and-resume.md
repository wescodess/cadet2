# Story 1.2: Guided Intake Draft with Save and Resume

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an immigration user,  
I want a guided intake flow that saves my progress as I complete profile sections,  
so that I can build my planning profile without losing work or finishing in one session.

## Acceptance Criteria

1. **Given** I begin the intake flow **When** I move through the guided profile sections **Then** the product presents structured, section-based steps for core personal, education, work, immigration, and goal-related information **And** progress is visibly framed so I know where I am in the flow **And** the progress container exposes a stable `data-testid="intake-progress"` hook for automated verification.
2. **Given** I enter valid information in an intake section **When** I save or advance **Then** my draft is persisted to my workspace under my user identity **And** I receive immediate confirmation that the draft was saved.
3. **Given** intake draft persistence does not yet exist for this feature set **When** this story is implemented **Then** it introduces only the minimum draft storage needed for section progress, field values, and resume position **And** it does not create unrelated recommendation, pathway, or audit persistence ahead of the stories that first need them.
4. **Given** I leave the intake flow before finishing **When** I return later **Then** my saved draft is restored at the appropriate section **And** previously entered values remain available for editing.
5. **Given** I submit invalid or incomplete required data in a section **When** validation runs **Then** the system shows inline, understandable validation guidance **And** the form remains accessible and keyboard operable.

## Tasks / Subtasks

- [x] Task 1: Build the guided intake route and sectioned UI flow (AC: #1, #4, #5)
  - [x] 1.1 Create `app/pages/workspace/intake.vue` with section-based flow for personal, education, work, immigration, and goals
  - [x] 1.2 Add an intake progress container with `data-testid="intake-progress"` and clear step labels
  - [x] 1.3 Add section-level controls for save, next, previous, and resume point handling
  - [x] 1.4 Ensure full keyboard flow, visible focus rings, and minimum `44x44` touch targets
  - [x] 1.5 Keep intake route protected by existing workspace auth middleware and shell layout

- [x] Task 2: Implement minimum draft persistence boundary (AC: #2, #3, #4)
  - [x] 2.1 Add the next SQL migration in `server/db/migrations/postgresql/` for minimum draft storage (`userId`, `currentSection`, `sectionProgress`, `fieldValues`, timestamps)
  - [x] 2.2 Create `server/api/intake/draft.post.ts` for authenticated draft upsert using `requireWorkspaceUserSession`
  - [x] 2.3 Create `server/api/intake/draft.get.ts` for authenticated draft retrieval scoped to current user
  - [x] 2.4 Add `server/utils/intake/intakeSchemas.ts` and `server/utils/intake/normalizeIntakePayload.ts` for typed validation and storage normalization
  - [x] 2.5 Enforce minimum scope: do not add recommendation-run, pathway-definition, evidence, or audit entities in this story

- [x] Task 3: Wire save/resume behavior into the intake UI (AC: #2, #4)
  - [x] 3.1 Hydrate intake UI from `GET /api/intake/draft` on page entry
  - [x] 3.2 Persist changes on explicit save/advance via `POST /api/intake/draft`
  - [x] 3.3 Restore user to stored resume section when draft exists
  - [x] 3.4 Show immediate save feedback state (success/error) without ambiguous waiting

- [x] Task 4: Add inline validation and accessibility-safe guidance (AC: #5)
  - [x] 4.1 Define required-field validation per section with plain-language inline messages
  - [x] 4.2 Keep field labels and helper text explicit for why inputs matter to recommendation quality
  - [x] 4.3 Add section-level error summary support when multiple required fields are invalid

- [x] Task 5: Extend E2E coverage for intake save-and-resume (AC: #1, #2, #4, #5)
  - [x] 5.1 Add `tests/e2e/intake-draft.spec.ts` covering authenticated user save/resume across navigation/session refresh
  - [x] 5.2 Assert `data-testid="intake-progress"` visibility and progress-state restoration
  - [x] 5.3 Assert guest access to `/workspace/intake` is redirected to `/auth`
  - [x] 5.4 Assert invalid required fields produce inline accessible validation feedback

## Dev Notes

- **Reuse existing auth boundary exactly.** `requireWorkspaceUserSession` is the server-side ownership gate and must remain the source of user identity for draft read/write.
- **Do not reimplement workspace shell/navigation.** Story 1.1 already established protected route shell and mobile/desktop nav behavior.
- **Minimum persistence only in this story.** Persist only what AC #3 requires (section progress, field values, resume position) and avoid unrelated domain entities.
- **Keep integration server-mediated.** No direct provider/API credentials in page or component code.
- **Use existing UI primitive layer.** Build intake UI from existing `app/components/ui/*` primitives plus feature components in `app/components/intake/*`.

### UI/UX Context

- **This is a frontend-impacting story.** It introduces the first real user workflow inside the workspace shell: guided intake with visible progress and save/resume continuity.
- The UX direction must stay consistent with the approved app-level `Comparison Workspace` information architecture while applying the guided form patterns defined in UX artifacts.
- Intake must feel structured and calm, not like a single unbounded long form.

### Affected Frontend Surfaces

1. `app/pages/workspace/intake.vue` (new route surface)
2. `app/components/intake/*` (new flow-level intake components and section modules)
3. `app/components/workspace/WorkspaceShell.vue` (existing shell integration only, no layout redesign)

### Approved Stitch Design Package

- Stitch project ID: `6257021077077987630`
- Surface-to-screen mapping:
  - Guided Intake (Desktop reference): `5853854a55e1466e979995b699bf6f4b` (`Progress Hub`)
  - Guided Intake (Mobile reference): `644856989f9a485da113a32a267fc4b2` (`Progress Hub`)
  - Guided Intake (Tablet reference): `ba5f27202f2640b9aabd689567537a7a` (`Progress Hub`)
  - Workspace shell continuity references: `3a4bf4f2083e46d89b219ab72563bf1a`, `2d7501846dd44d8a8bc52b9742494a71`
- Approved screen IDs: `5853854a55e1466e979995b699bf6f4b`, `644856989f9a485da113a32a267fc4b2`, `ba5f27202f2640b9aabd689567537a7a`
- Approved component IDs: N/A (screen-level handoff with feature composition guidance)
- Selected variant labels: `Progress Hub` device trio (desktop/mobile/tablet) anchored to approved app shell direction
- Prompt summary: Guided, section-based intake with persistent progress framing, resumable checkpoints, inline validation, and clear save feedback
- Design context source: `_bmad-output/planning-artifacts/ux-design-specification.md`, `_bmad-output/planning-artifacts/DESIGN.md`
- Token artifact references: `_bmad-output/planning-artifacts/design-tokens.json`, `_bmad-output/planning-artifacts/design-tokens.css`
- Supporting screenshot/code references: Stitch artifact registry in UX spec + `get_screen` retrieval by screen IDs above

### Approved Variant Decision

- Approved direction for this story: **Reuse the app-level approved workspace direction and implement intake using the `Progress Hub` reference set.**
- Rationale:
  - Preserves the already-approved shell and information architecture.
  - Aligns directly with UX intake patterns: guided sectioning, visible progress, and resumable checkpoints.
  - Avoids introducing a conflicting visual direction mid-epic.
- Approval source: Existing approved UX package in `_bmad-output/planning-artifacts/ux-design-specification.md` (`Selected Direction` + `Stitch Artifact Registry`).

### Design Tokens / System Constraints

- Required token artifacts:
  - `_bmad-output/planning-artifacts/design-tokens.css`
  - `_bmad-output/planning-artifacts/design-tokens.json`
- Required constraints:
  - Use semantic token variables (for example `--trust`, `--background`, `--foreground`, `--ring`) instead of hardcoded hex values.
  - Preserve `Public Sans` typography and 8px spacing scale.
  - Keep WCAG 2.1 AA contrast and keyboard-first interaction support.
  - Maintain minimum `44x44` touch targets for mobile actions.

### Stitch Retrieval Instructions

- Retrieve approved intake references first:
  - `get_screen(projectId='6257021077077987630', screenId='5853854a55e1466e979995b699bf6f4b')`
  - `get_screen(projectId='6257021077077987630', screenId='644856989f9a485da113a32a267fc4b2')`
  - `get_screen(projectId='6257021077077987630', screenId='ba5f27202f2640b9aabd689567537a7a')`
- Retrieve app-shell continuity references second:
  - `get_screen(projectId='6257021077077987630', screenId='3a4bf4f2083e46d89b219ab72563bf1a')`
  - `get_screen(projectId='6257021077077987630', screenId='2d7501846dd44d8a8bc52b9742494a71')`
- Use `stitch-vue-components` and `stitch-shadcn-vue` conventions when converting approved screens into implementation components.

### Referenced UX Artifacts

- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/DESIGN.md`
- `_bmad-output/planning-artifacts/design-tokens.json`
- `_bmad-output/planning-artifacts/design-tokens.css`
- `_bmad-output/project-context.md`

### Project Structure Notes

- New feature surfaces should align with architecture mapping:
  - UI: `app/pages/workspace/intake.vue`, `app/components/intake/*`
  - API: `server/api/intake/draft.get.ts`, `server/api/intake/draft.post.ts`
  - Server logic: `server/utils/intake/*`
  - Persistence: next migration in `server/db/migrations/postgresql/`
- Keep auth helpers in `server/utils/auth/*`; do not duplicate session gate logic in intake handlers.

### Technical Requirements

- Implement typed request contracts for draft endpoints.
- Normalize stored draft payload so section state is deterministic and resumable.
- Keep draft writes idempotent (upsert by user identity).
- Return consistent API response shape for save and load operations (status, savedAt, currentSection, values).
- Avoid persistence of recommendation output or governance data in this story.

### Architecture Compliance

- Respect server boundary ownership:
  - `server/api/intake/*` owns intake draft HTTP contract.
  - `server/utils/intake/*` owns normalization/validation logic.
  - `app/pages/workspace/intake.vue` owns route composition, not business/persistence logic.
- Keep client thin and server-owned truth for persisted draft state.
- Keep privileged integrations and storage operations server-side only.

### Library and Framework Requirements

- Nuxt/Vue stack:
  - Use Nuxt 4 page routing and server handlers patterns already present in the repo.
  - Use `<script setup lang="ts">` and typed `readBody<T>()` patterns in handlers.
- Validation:
  - Use existing `zod` + `vee-validate`/`@vee-validate/zod` stack for schema-safe form and payload validation.
- Auth:
  - Continue with Better Auth session model through `useUserSession()` on client and `requireWorkspaceUserSession` on server.

### File Structure Requirements

- Create or modify only relevant boundaries:
  - `app/pages/workspace/intake.vue`
  - `app/components/intake/*`
  - `server/api/intake/draft.get.ts`
  - `server/api/intake/draft.post.ts`
  - `server/utils/intake/*`
  - `server/db/migrations/postgresql/*`
  - `tests/e2e/intake-draft.spec.ts`
- Do not introduce parallel folder structures for intake logic outside these boundaries.

### Testing Requirements

- Expand Playwright coverage for:
  - protected intake route access
  - visible progress framing with stable test id
  - save draft and resume on return
  - inline validation behavior and keyboard-usable flow
- Keep test hooks stable and explicit (`data-testid="intake-progress"` and section-level selectors where needed).

### Previous Story Intelligence

- Story 1.1 established patterns that must carry forward:
  - protected workspace route group (`app/pages/workspace.vue` + `app/middleware/auth.ts`)
  - shared shell and navigation (`app/components/workspace/WorkspaceShell.vue`)
  - server-side session ownership helper (`server/utils/auth/requireUserSession.ts`)
  - accessibility and token discipline (no hardcoded color drift, `aria-disabled` correctness, min touch target handling)
- Reuse these patterns rather than rebuilding shell/auth behavior in intake scope.

### Git Intelligence Summary

- Recent commit themes show a clear pattern of:
  - hardening auth boundaries and route guards
  - improving accessibility semantics and touch target reliability
  - removing dead/non-functional UI elements
  - stabilizing E2E assertions around protected-route behavior
- Intake implementation should follow this pattern: explicit boundaries, practical accessibility checks, and test-stable behavior over ad hoc UI additions.

### Latest Tech Information

- **Better Auth 1.5 line released (2026-02-28)** with explicit breaking changes and secret-rotation guidance. This story should **not** upgrade auth libraries; keep current pinned versions and avoid incidental auth migrations in intake work.
- **Vee-Validate v5 is in beta.** Current project line is `v4.15.x`; keep v4-compatible validation patterns for this story.
- **Vue 3.6 line is beta.** Keep implementation on stable Vue `3.5.x` conventions currently used in this repo.
- **Nuxt 4.x guidance emphasizes up-to-date data-fetch cancellation patterns** (AbortController support in `useAsyncData`/`useFetch` contexts) which is relevant if autosave calls are debounced/cancelled during rapid section navigation.

### Project Context Reference

- `_bmad-output/project-context.md` is mandatory context for:
  - security boundaries
  - Nuxt/TypeScript implementation rules
  - UI primitive reuse expectations
  - server-only external integration policy

### Story Completion Status

- Story context quality review status: complete
- Frontend-impacting classification: `true`
- Approved design handoff package: embedded
- Ready-for-dev gate: satisfied
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.
- Completion note: Frontend design packaging complete - approved Stitch design package embedded in story file.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Selected Direction]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Stitch Artifact Registry]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Patterns]
- [Source: _bmad-output/planning-artifacts/DESIGN.md]
- [Source: _bmad-output/planning-artifacts/design-tokens.css]
- [Source: _bmad-output/project-context.md]
- [External Source: https://github.com/better-auth/better-auth/releases/tag/v1.5.0]
- [External Source: https://github.com/logaretm/vee-validate/releases]
- [External Source: https://github.com/vuejs/core/releases]
- [External Source: https://nuxt.com/blog/v4-2]

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Implementation Plan

1. Create intake route and feature components with progressive section flow and accessible progress framing.
2. Add minimum persistence schema + authenticated draft GET/POST endpoints behind existing workspace session gate.
3. Wire save/resume hydration and explicit save feedback into the intake page.
4. Add/extend Playwright coverage for intake auth, save/resume continuity, and validation UX.

### Stitch Retrieval Log

- Story package uses approved artifact IDs from `_bmad-output/planning-artifacts/ux-design-specification.md`.
- If direct Stitch API access is unavailable in-session, treat the embedded screen IDs and token artifacts as the implementation handoff source of truth.

### UI Implementation Mapping

- Intake route: map guided sections + progress framing to `Progress Hub` references.
- Preserve shell continuity and responsive behavior from Story 1.1-approved workspace structure.
- Keep tokenized styling and accessibility requirements aligned with app-level design system artifacts.

### Debug Log References

- `pnpm exec playwright test --project=chromium tests/e2e/intake-draft.spec.ts` (pass, 6/6)
- `pnpm exec playwright test --project=api tests/api/intake-draft.spec.ts` (pass, 7/7)
- `pnpm exec playwright test` (pass, 19 passed / 23 skipped)
- `pnpm exec playwright test --project=chromium tests/e2e/intake-draft.spec.ts tests/e2e/workspace-auth.spec.ts tests/e2e/tasks-auth.spec.ts` (review run: initially exposed AC #4 regression, then blocked by Nuxt dev server port-binding failure: `Unable to find a random port on host "127.0.0.1"`)
- `pkill -f "@playwright/test/cli.js test|pnpm dev --host 127.0.0.1 --port 3000|nuxt/bin/nuxt.mjs dev --host 127.0.0.1 --port 3000|cadet2/node_modules/.pnpm/playwright"` (cleared stale local runner/dev-server processes before final verification rerun)
- `pnpm exec playwright test --project=chromium tests/e2e/intake-draft.spec.ts tests/e2e/workspace-auth.spec.ts tests/e2e/tasks-auth.spec.ts` (pass, 11/11)
- `pnpm exec playwright test --project=api tests/api/intake-draft.spec.ts` (pass, 7/7)

### Completion Notes List

- Built `app/pages/workspace/intake.vue` with sectioned guided intake flow, progress framing, keyboard-safe controls, and inline validation summary/errors.
- Added `app/components/intake/IntakeProgress.vue` and `app/components/intake/IntakeSectionFields.vue` with stable test hooks and token-aligned semantics.
- Added minimum intake-draft persistence boundary via `server/db/migrations/postgresql/0001_guided_intake_draft.sql`.
- Added authenticated intake draft API handlers (`GET`/`POST`) with typed schema validation and payload normalization (`server/utils/intake/*`).
- Implemented resume hydration, save/advance persistence, and immediate feedback states in intake UI.
- Added and stabilized intake API and E2E test coverage for AC 1-5, including auth redirect, save confirmation, resume restore, and validation accessibility behavior.
- Hardened `tests/e2e/workspace-auth.spec.ts` to use unique auth accounts per run so full-suite regression remains stable.
- Refactored intake draft persistence flow so "Next" only advances section state after successful draft save.
- Restored deterministic draft hydration via client-side `$fetch` on mount for resume correctness in review scenarios.
- Fixed save button handler to call `saveDraft()` explicitly (preventing event-object payloads from causing `POST /api/intake/draft` validation errors).

### File List

- _bmad-output/implementation-artifacts/1-2-guided-intake-draft-with-save-and-resume.md
- app/middleware/auth.ts
- app/pages/workspace/intake.vue
- app/components/intake/IntakeProgress.vue
- app/components/intake/IntakeSectionFields.vue
- server/db/migrations/postgresql/0001_guided_intake_draft.sql
- server/api/intake/draft.get.ts
- server/api/intake/draft.post.ts
- server/utils/intake/intakeSchemas.ts
- server/utils/intake/normalizeIntakePayload.ts
- tests/api/intake-draft.spec.ts
- tests/e2e/intake-draft.spec.ts
- tests/e2e/tasks-auth.spec.ts
- tests/e2e/workspace-auth.spec.ts
- tests/support/fixtures/factories/intake-draft-factory.ts
- tests/support/fixtures/test-data.ts

### Senior Developer Review (AI)

- Date: 2026-03-03
- Reviewer: Codex (GPT-5)
- Outcome: Approved after auto-fix verification
- High/Medium Issues Addressed:
- Fixed AC #4 regression where resume section restoration failed in E2E review run (hydration logic adjusted in `app/pages/workspace/intake.vue`).
- Fixed AC #2 partial behavior where UI advanced before save success (save-first navigation flow implemented in `app/pages/workspace/intake.vue`).
- Resolved story File List mismatch by adding `tests/e2e/tasks-auth.spec.ts`.
- Verification status:
- Verification rerun passed after clearing stale local Playwright/Nuxt processes.
- Chromium suite: `11/11` passed (`tests/e2e/intake-draft.spec.ts`, `tests/e2e/workspace-auth.spec.ts`, `tests/e2e/tasks-auth.spec.ts`).
- API suite: `7/7` passed (`tests/api/intake-draft.spec.ts`).

### Change Log

- 2026-03-03: Implemented guided intake draft save/resume flow end-to-end (UI + API + migration + tests), moved story status to `review`, and updated suite stability for workspace auth E2E.
- 2026-03-03: Ran adversarial code review, fixed identified AC #2/#4 regressions, updated story documentation/file list, and moved status to `in-progress` pending rerun after local Nuxt port-binding issue is resolved.
- 2026-03-03: Cleared stale local runner processes, reran full targeted chromium+api verification successfully, and moved story status to `done`.
