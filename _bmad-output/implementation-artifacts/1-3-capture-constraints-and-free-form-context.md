# Story 1.3: Capture Constraints and Free-Form Context

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an immigration user,
I want to add my priorities, constraints, and extra context to my intake profile,
so that the system can reflect my real situation instead of a shallow checklist.

## Acceptance Criteria

1. **Given** I am in the intake flow **When** I reach the planning preferences and context sections **Then** I can provide structured priorities such as timing, cost sensitivity, location preferences, and willingness to study or relocate **And** I can also provide free-form context in a dedicated text area.
2. **Given** I have already saved intake information **When** I revisit my profile **Then** I can update both structured preferences and free-form context without restarting the flow **And** the updated values are saved to my existing draft.
3. **Given** I provide optional free-form context **When** the system stores it **Then** it is associated with my profile draft securely **And** it is not exposed outside my authorized workspace access.
4. **Given** I use the intake flow on a smaller screen or with keyboard navigation **When** I interact with these fields **Then** the controls remain readable, focusable, and usable **And** helper text explains why these inputs improve recommendation quality.

## Tasks / Subtasks

- [x] Task 1: Add explicit planning-preference and free-form context capture in intake UI (AC: #1, #4)
  - [x] 1.1 Update `app/pages/workspace/intake.vue` so the goals stage clearly separates structured planning constraints from optional narrative context.
  - [x] 1.2 Ensure structured inputs cover timing priority, cost sensitivity, location preference, and willingness to study or relocate with clear labels and helper text.
  - [x] 1.3 Keep the dedicated free-form context textarea visible in the same stage and scoped to recommendation-quality context only.
  - [x] 1.4 Preserve mobile readability, keyboard focus behavior, and minimum 44x44 touch targets for all added/updated controls.

- [x] Task 2: Persist and normalize constraints/context updates through existing draft APIs (AC: #2, #3)
  - [x] 2.1 Extend intake draft validation/normalization in `server/utils/intake/intakeSchemas.ts` and `server/utils/intake/normalizeIntakePayload.ts` for the updated goals payload shape.
  - [x] 2.2 Keep persistence within the existing `intake_draft` storage boundary (`currentSection`, `sectionProgress`, `fieldValues`) without adding recommendation/pathway/audit entities.
  - [x] 2.3 Ensure `server/api/intake/draft.post.ts` updates an existing draft in place and returns normalized values for immediate UI refresh.
  - [x] 2.4 Ensure `server/api/intake/draft.get.ts` hydrates saved constraints/context values accurately for resume/edit loops.

- [x] Task 3: Support revisit-and-edit behavior for these fields (AC: #2)
  - [x] 3.1 Restore the user to previously saved stage state and pre-populate planning constraints/context values.
  - [x] 3.2 Allow editing and resaving without forcing a restart of prior intake sections.
  - [x] 3.3 Keep save feedback explicit and immediate after updates.

- [x] Task 4: Preserve secure access boundaries for optional narrative context (AC: #3)
  - [x] 4.1 Keep `requireWorkspaceUserSession` as the server-side owner gate for draft reads/writes.
  - [x] 4.2 Prevent context leakage by returning only the authenticated user's draft payload.
  - [x] 4.3 Keep free-form context inside intake draft scope; do not surface it in admin, recommendation, or audit endpoints in this story.

- [x] Task 5: Expand API and E2E coverage for constraints/context capture and edits (AC: #1, #2, #3, #4)
  - [x] 5.1 Add API coverage for saving and updating structured constraints plus free-form context on an existing draft.
  - [x] 5.2 Add E2E coverage for revisiting intake, editing constraints/context, and verifying persisted updates after reload.
  - [x] 5.3 Verify auth boundary behavior (guest denied, user-scoped retrieval only).
  - [x] 5.4 Verify helper text visibility, keyboard operability, and mobile-safe interaction on the updated goals stage.

## Dev Notes

- Reuse Story 1.2 intake boundaries and patterns; this story extends goals/preferences behavior rather than introducing a new intake architecture.
- Keep all persistence and auth logic server-mediated through existing Nuxt API routes.
- Do not introduce recommendation-run, pathway-definition, evidence, or audit persistence in this story.

### UI/UX Context

- This is a frontend-impacting story.
- The affected experience remains the guided intake flow, specifically the planning preferences and context capture stage.
- Structured constraints should feel explicit and comparable, while the free-form area remains optional and clearly contextualized.

### Affected Frontend Surfaces

1. `app/pages/workspace/intake.vue` (goals/planning stage content and flow behavior)
2. `app/components/intake/IntakeSectionFields.vue` (field rendering and helper/error semantics for updated controls)
3. `app/components/intake/IntakeProgress.vue` (progress continuity only; no navigation redesign)

### Concept Options (3 Paired Directions Per Surface)

- Surface Group: Intake Planning Preferences + Context Stage (`workspace/intake`)
- Direction A: `Progress Hub`
  - Desktop: `5853854a55e1466e979995b699bf6f4b`
  - Mobile: `644856989f9a485da113a32a267fc4b2`
  - Prompt summary: Guided constraints-first intake layout with prominent helper text and inline context capture.
- Direction B: `Comparison Workspace`
  - Desktop: `3a4bf4f2083e46d89b219ab72563bf1a`
  - Mobile: `2d7501846dd44d8a8bc52b9742494a71`
  - Prompt summary: Denser analytical framing that emphasizes tradeoff-aware preference selection.
- Direction C: `Evidence & Tasks`
  - Desktop: `34bd9708e6764ade9b02545731f6af4c`
  - Mobile: `a8bbe3f9604543ab8e6f4eddb64d493b`
  - Prompt summary: Action-oriented constraints capture with stronger "next steps" and confidence support cues.

### Approved Stitch Design Package

- Stitch project ID: `6257021077077987630`
- Surface-to-concept-options mapping:
  - `intake-planning-preferences-context`
    - A (`Progress Hub`): desktop `5853854a55e1466e979995b699bf6f4b`, mobile `644856989f9a485da113a32a267fc4b2`
    - B (`Comparison Workspace`): desktop `3a4bf4f2083e46d89b219ab72563bf1a`, mobile `2d7501846dd44d8a8bc52b9742494a71`
    - C (`Evidence & Tasks`): desktop `34bd9708e6764ade9b02545731f6af4c`, mobile `a8bbe3f9604543ab8e6f4eddb64d493b`
- Surface-to-approved-pair mapping:
  - `intake-planning-preferences-context` -> Direction A (`Progress Hub`)
- Approved desktop screen IDs:
  - `5853854a55e1466e979995b699bf6f4b`
- Approved mobile screen IDs:
  - `644856989f9a485da113a32a267fc4b2`
- Approved component IDs: N/A (screen-level handoff)
- Approved concept labels:
  - `Progress Hub`
- Selected variant labels:
  - `Progress Hub (Desktop + Mobile)`
- Prompt summary:
  - Explicit structured constraints plus optional free-form context with readable helper text and calm guided sequencing.
- Design context source:
  - `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `_bmad-output/planning-artifacts/DESIGN.md`
- Token artifact references:
  - `_bmad-output/planning-artifacts/design-tokens.json`
  - `_bmad-output/planning-artifacts/design-tokens.css`
- Pair approval rationale:
  - Direction A aligns most directly with intake continuity and sectioned progression already implemented in Story 1.2.
- Supporting screenshot/code references:
  - Stitch artifact registry screen IDs listed above, plus existing intake route composition in `app/pages/workspace/intake.vue`.

### Approved Variant Decision

- Approved direction: `Progress Hub` for the intake planning-preferences surface.
- Rationale:
  - Best fit for a section-driven intake experience with visible progression and reduced cognitive load.
  - Preserves the existing flow rhythm while adding richer constraints/context fields.
  - Maintains responsive continuity between desktop and mobile without changing core information architecture.

### Design Tokens / System Constraints

- Use semantic token variables from `_bmad-output/planning-artifacts/design-tokens.css`; avoid hardcoded hex values.
- Preserve Public Sans typography and 8px spacing rhythm from design artifacts.
- Maintain WCAG 2.1 AA contrast and non-color-only status signaling.
- Keep helper text readable and proximate to each preference/context input.

### Stitch Retrieval Instructions

- Fetch approved pair first:
  - `get_screen(projectId='6257021077077987630', screenId='5853854a55e1466e979995b699bf6f4b')`
  - `get_screen(projectId='6257021077077987630', screenId='644856989f9a485da113a32a267fc4b2')`
- Keep the two alternates available for fast iteration:
  - `get_screen(projectId='6257021077077987630', screenId='3a4bf4f2083e46d89b219ab72563bf1a')`
  - `get_screen(projectId='6257021077077987630', screenId='2d7501846dd44d8a8bc52b9742494a71')`
  - `get_screen(projectId='6257021077077987630', screenId='34bd9708e6764ade9b02545731f6af4c')`
  - `get_screen(projectId='6257021077077987630', screenId='a8bbe3f9604543ab8e6f4eddb64d493b')`
- Use `stitch-vue-components` and `stitch-shadcn-vue` conventions for implementation translation.

### Referenced UX Artifacts

- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/DESIGN.md`
- `_bmad-output/planning-artifacts/design-tokens.json`
- `_bmad-output/planning-artifacts/design-tokens.css`

### Project Structure Notes

- UI:
  - `app/pages/workspace/intake.vue`
  - `app/components/intake/IntakeSectionFields.vue`
- API:
  - `server/api/intake/draft.get.ts`
  - `server/api/intake/draft.post.ts`
- Server logic:
  - `server/utils/intake/intakeSchemas.ts`
  - `server/utils/intake/normalizeIntakePayload.ts`
- Persistence:
  - Existing `intake_draft` table (`server/db/migrations/postgresql/0001_guided_intake_draft.sql`) remains sufficient.

### Technical Requirements

- Keep request validation schema-first (`zod`) at the intake draft boundary.
- Preserve deterministic shape for `goals` section values so edits are stable across save/resume cycles.
- Ensure update semantics are idempotent for repeated saves of the same section.
- Keep response shape consistent (`status`, `savedAt`, `currentSection`, `values`) for UI feedback logic.

### Architecture Compliance

- Preserve server-boundary ownership:
  - `server/api/intake/*` owns HTTP contracts.
  - `server/utils/intake/*` owns normalization/validation.
  - `app/pages/workspace/intake.vue` owns rendering and flow state only.
- Keep trust-sensitive logic out of Vue templates/components.
- Preserve secure workspace access boundaries from Story 1.1 and Story 1.2.

### Library and Framework Requirements

- Use Nuxt 4 route and server-handler conventions already in repo.
- Use Vue 3 `<script setup lang="ts">` patterns and typed local contracts.
- Continue current validation stack (`zod`, `vee-validate`/`@vee-validate/zod` where needed).
- Continue Better Auth session boundary via `requireWorkspaceUserSession`.

### File Structure Requirements

- Primary touchpoints expected in this story:
  - `app/pages/workspace/intake.vue`
  - `app/components/intake/IntakeSectionFields.vue`
  - `server/api/intake/draft.get.ts`
  - `server/api/intake/draft.post.ts`
  - `server/utils/intake/intakeSchemas.ts`
  - `server/utils/intake/normalizeIntakePayload.ts`
  - `tests/e2e/intake-draft.spec.ts`
  - `tests/api/intake-draft.spec.ts`
- Avoid new parallel intake module locations.

### Testing Requirements

- Add/extend E2E assertions for:
  - planning constraints fields visibility and helper text
  - free-form context save and reload
  - editing saved constraints/context on revisit
  - keyboard operability across updated controls
- Add/extend API assertions for:
  - updating existing draft constraints/context values
  - auth-scoped access to stored free-form context
  - rejection of invalid payload shape additions

### Previous Story Intelligence

- Story 1.2 already established:
  - authenticated intake route with save/resume loops
  - stable intake draft API shape and storage boundary
  - inline validation summary and field-level accessible errors
  - reliable E2E + API test fixtures for draft behavior
- Build incrementally on these patterns; do not re-platform the intake flow.

### Git Intelligence Summary

- Recent commits emphasize:
  - strict auth boundaries and route protection
  - stability fixes for intake save/next behavior
  - E2E reliability improvements around authenticated flows
- Story 1.3 implementation should maintain this posture: targeted extension, not broad refactor.

### Latest Tech Information

- Current project baseline from `_bmad-output/project-context.md`:
  - Nuxt `4.3.1`, Vue `3.5.28`, TypeScript `5.9.3`
  - Zod `3.25.76`, Vee-Validate `4.15.1`
  - Better Auth `1.4.9`
- For this story, remain on pinned versions and avoid incidental framework/auth upgrades.

### Project Context Reference

- `_bmad-output/project-context.md` remains mandatory for security boundaries, runtime config rules, and implementation conventions.

### Story Completion Status

- Story context quality review status: complete
- Frontend-impacting classification: `true`
- Approved design handoff package: embedded
- Ready-for-dev gate: satisfied
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.
- Completion note: Frontend design packaging complete - approved Stitch design package embedded in story file.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Variant Exploration]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Selected Direction]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Stitch Artifact Registry]
- [Source: _bmad-output/planning-artifacts/DESIGN.md]
- [Source: _bmad-output/project-context.md]
- [Source: app/pages/workspace/intake.vue]
- [Source: server/api/intake/draft.post.ts]
- [Source: server/api/intake/draft.get.ts]
- [Source: server/utils/intake/intakeSchemas.ts]

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Implementation Plan

1. Refine goals stage into explicit constraints + optional narrative context.
2. Keep draft persistence idempotent and normalized for updated values.
3. Verify revisit/edit save loops and secure ownership boundaries.
4. Expand API and E2E tests for constraints/context behaviors.

### Stitch Retrieval Log

- Retrieved approved pair metadata for project `6257021077077987630`:
  - Desktop screen: `5853854a55e1466e979995b699bf6f4b`
  - Mobile screen: `644856989f9a485da113a32a267fc4b2`
- Retrieved approved pair screen code via `fetch_screen_code` and extracted component summaries via `extract_components`.
- `fetch_screen_image` returned tool-level filesystem errors (`EROFS`), so screenshots were referenced from `get_screen` download metadata instead.

### UI Implementation Mapping

- Added explicit structured constraints grouping in the goals stage with a dedicated location-preference control.
- Kept free-form context isolated in an explicit “Optional Narrative Context” block in the same stage.
- Preserved existing accessible labels/helpers and 44px+ action controls for mobile save/next/back interactions.

### Debug Log References

- `pnpm exec tsc --noEmit` ✅ passed.
- `pnpm build` ✅ passed (Nuxt production build completed successfully).
- `pnpm exec playwright test tests/api/intake-constraints-context.atdd.spec.ts --project=api --grep "unauthenticated user cannot save planning constraints"` ✅ passed.
- `pnpm exec playwright test tests/e2e/intake-constraints-context.atdd.spec.ts --project=chromium --grep "guest is redirected to auth when opening intake route"` ✅ passed.
- `pnpm exec playwright test tests/api/intake-constraints-context.atdd.spec.ts --project=api --grep "stable response shape"` ✅ passed (authenticated scenario).
- `pnpm exec playwright test tests/e2e/intake-constraints-context.atdd.spec.ts --project=chromium --grep "goals stage shows structured constraints and helper text"` ✅ passed (authenticated scenario).
- `pnpm exec playwright test tests/api/intake-constraints-context.atdd.spec.ts tests/e2e/intake-constraints-context.atdd.spec.ts` ✅ passed (11/11).
- Auth runtime stabilization changes:
  - Isolated Playwright web server DB to `.data/db/pglite-playwright`.
  - Set Playwright default base URL to `http://127.0.0.1:3100`.
  - Disabled implicit server reuse by default (`PLAYWRIGHT_REUSE_SERVER=true` opt-in).

### Completion Notes List

- Implemented goals-stage structured constraints + optional narrative context separation in `app/pages/workspace/intake.vue`.
- Added `locationPreference` field with helper copy and validation to satisfy planning-constraints coverage.
- Extended server goals payload validation/normalization for deterministic shape in:
  - `server/utils/intake/intakeSchemas.ts`
  - `server/utils/intake/normalizeIntakePayload.ts`
- Expanded Story 1.3 ATDD fixture contracts and active API/E2E specs for constraints/context flows.
- Removed local auth startup instability in Playwright runs by isolating test server/runtime state; authenticated Story 1.3 API/E2E scenarios now pass.
- Hardened goals payload validation so structured constraint selects reject invalid option values at the API boundary.
- Updated goals normalization to preserve valid fields when stored payloads contain unexpected keys, preventing full-section resets.
- Switched Story 1.3 E2E coverage from mocked draft routes to real draft API persistence for save/reload verification.
- Normalized auth redirect assertion for optional query strings to reduce redirect-flake risk.

### File List

- _bmad-output/implementation-artifacts/1-3-capture-constraints-and-free-form-context.md
- app/pages/workspace/intake.vue
- server/utils/intake/intakeSchemas.ts
- server/utils/intake/normalizeIntakePayload.ts
- tests/support/fixtures/factories/intake-draft-factory.ts
- tests/support/fixtures/test-data.ts
- tests/api/intake-constraints-context.atdd.spec.ts
- tests/e2e/intake-constraints-context.atdd.spec.ts
- tests/e2e/tasks-auth.spec.ts
- playwright.config.ts
- tests/support/helpers/env.ts
- tests/README.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Senior Developer Review (AI)

- Reviewer: Codex (GPT-5)
- Date: 2026-03-04
- Outcome: PASS
- High/Medium findings addressed:
  - goals enum validation tightened for `primaryGoal`, `priorityPreference`, `locationPreference`
  - goals normalization changed from all-or-nothing reset to per-field fallback
  - E2E save/reload assertions now exercise real `/api/intake/draft` persistence path
  - Story File List synchronized with actual changed files (`tests/e2e/tasks-auth.spec.ts`)
- Verification:
  - `pnpm exec tsc --noEmit` ✅
  - `pnpm exec playwright test tests/api/intake-constraints-context.atdd.spec.ts tests/e2e/intake-constraints-context.atdd.spec.ts` ✅ (11 passed)

### Change Log

- 2026-03-04: Applied code-review remediation for Story 1.3 (validation hardening, normalization safety, real E2E persistence coverage, story metadata sync).
