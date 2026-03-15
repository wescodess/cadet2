# Story 4.4: Support Ongoing Reuse of the Planning Workspace

Status: done

## Story

- **Epic:** 4 — Action Planning & Recommendation Continuity
- **Epic Objective:** Transform recommendations into actionable guidance users can track, revisit, and build upon over time
- **Story:** As an immigration user, I want my workspace to support repeated planning over time, so that I can return as my circumstances change and continue refining my immigration strategy
- **Covers FRs:** FR35 (support repeated use over time)
- **Status:** done
- **Branch:** `feat/4-4-support-ongoing-reuse-of-the-planning-workspace`
- **Depends on:** Story 4.1 (next-step plans), Story 4.2 (run archive and preserved run detail), Story 4.3 (run-to-run comparison)
- **Frontend-impacting:** Yes

---

## Acceptance Criteria

### AC1: Return to a Continuous Planning Workspace
- **Given** I return to the product after a prior recommendation session
- **When** I re-enter my workspace
- **Then** I can continue from my existing planning history rather than being treated as a new user
- **And** my previously saved runs and profile context remain available to me
- **Testid:** `data-testid="planning-workspace-hub"`

### AC2: Start a New Planning Cycle Without Losing History
- **Given** I choose to update my planning information over time
- **When** I start a new cycle from the workspace
- **Then** the system supports creating a new recommendation run from updated inputs while preserving prior history
- **And** the prior runs remain intact for reference
- **Testid:** `data-testid="planning-cycle-start"`

### AC3: Preserve Continuity and Progress Across Current and Past Work
- **Given** I use the workspace repeatedly
- **When** I move between current planning tasks and past recommendation artifacts
- **Then** the product maintains a sense of continuity and progress
- **And** the experience reinforces that this is an ongoing planning tool rather than a disposable one-time result page
- **Testid:** `data-testid="planning-progress-timeline"`

---

## Tasks

### Task 1: Workspace Continuity Summary Contract
- [x] Create `server/api/workspace/summary.get.ts`
- [x] Create `server/utils/workspace/buildWorkspaceSummary.ts`
- [x] Aggregate the data already introduced in Stories 4.1-4.3 into one workspace-owned summary payload:
  - latest run summary and current lifecycle state
  - latest completed/degraded run suitable for review
  - archive counts and comparison availability
  - intake draft presence / last-updated continuity signal
  - recommended next action for the landing workspace
- [x] Reuse existing run-history and run-status utilities instead of issuing one-off ad hoc queries from the page
- [x] Guard the endpoint with `requireWorkspaceUserSession`

### Task 2: Shared Summary Types and Client Helpers
- [x] Add shared types for the workspace summary contract in `shared/types/workspace-summary.ts`
- [x] Add client-safe label / action helpers in `app/lib/workspace/workspace-summary.ts`
- [x] Model primary continuity states explicitly, for example:
  - `first-run`
  - `resume-intake`
  - `review-latest-run`
  - `compare-latest-runs`
  - `refresh-plan`
- [x] Keep server response fields normalized so pages/components do not infer workflow state from raw Convex rows

### Task 3: Workspace Continuity Composable
- [x] Create `app/composables/useWorkspaceContinuity.ts`
- [x] Expose `summary`, `isLoading`, `error`, `primaryAction`, `secondaryActions`
- [x] Expose navigation helpers that reuse current routes instead of inventing new flow entry points:
  - `/workspace/intake`
  - `/workspace/recommendations`
  - `/workspace/history`
  - `/workspace/compare`
- [x] Keep all fetching inside the composable; do not call `$fetch` directly from `app/pages/workspace/index.vue`

### Task 4: Replace the Generic Workspace Welcome Card with a Continuity Hub
- [x] Refactor `app/pages/workspace/index.vue`
- [x] Replace the current static "Start Guided Intake" hero with a continuity-first landing surface that adapts based on summary state
- [x] Preserve the existing recommendation status and review content, but reorganize the page so it feels like a persistent planning workspace rather than a first-time empty state
- [x] Use a wider workspace layout on desktop so the dashboard can show continuity, current plan, and preserved history together without crowding
- [x] Apply `data-testid="planning-workspace-hub"` to the main continuity container

### Task 5: Planning Workspace Continuity Components
- [x] Create `app/components/workspace/PlanningWorkspaceHero.vue`
- [x] Create `app/components/workspace/PlanningProgressTimeline.vue`
- [x] Create `app/components/workspace/PlanningWorkspaceActionPanel.vue`
- [x] The hero should summarize return context, last meaningful activity, and the current primary CTA
- [x] The timeline should show a simple progression such as intake saved, latest run generated, latest comparison available, next-step plan available
- [x] The action panel should expose continuity-safe quick actions such as:
  - resume intake edits
  - review current recommendations
  - compare the latest change set
  - open the archive
- [x] Reuse existing button, badge, card, accordion, and skeleton primitives from the current shadcn-nuxt layer

### Task 6: New-Cycle and Resume Flow Wiring
- [x] Surface an explicit "start new cycle" path from the workspace landing page
- [x] Reuse the existing draft + submit workflow when the user wants to edit profile inputs before rerunning recommendations
- [x] Reuse `POST /api/recommendations/runs/[runId]/refresh` when the user wants to re-run from the latest preserved context without losing history lineage
- [x] Preserve source-run context so the next run still participates correctly in Story 4.3 comparison flows
- [x] Do not delete or overwrite prior preserved runs when a new cycle starts

### Task 7: Workspace Cross-Link and Return-to-Context Integration
- [x] Add continuity-aware quick links from the dashboard into:
  - latest recommendation review
  - history archive
  - latest run comparison when a comparable prior run exists
- [x] Preserve query/context state when navigating from history into compare and back, following the fix already introduced in Story 4.3
- [x] Keep the navigation language oriented around ongoing planning, not first-run onboarding only

### Task 8: Tests
- [x] **API tests:** add coverage for `server/api/workspace/summary.get.ts` covering first-run, resume-intake, review-latest-run, and comparison-available states
- [x] **Component tests:** cover `PlanningWorkspaceHero`, `PlanningProgressTimeline`, and `PlanningWorkspaceActionPanel`
- [x] **E2E test:** returning user lands on the continuity hub, opens latest recommendations, opens archive, starts a new planning cycle, and preserves prior history
- [x] Reuse the existing configured tooling and scripts:
  - `pnpm test:components`
  - `pnpm test:api`
  - `pnpm test:e2e`

---

## Dev Notes

### UI/UX Context
- **Design vision:** Calm, trust-first planning workspace that feels persistent, composed, and action-oriented rather than like a one-time result page
- **Emotional target:** Returning users should feel continuity and momentum, not that they are restarting from zero
- **Typography:** Public Sans, using the approved type scale from `DESIGN.md` and `design-tokens.*`
- **Primary color roles:** Trust Navy for primary actions, Supportive Sage for positive progress, Measured Sand for caution states
- **Component shape:** Rounded cards and bounded panels with visible hierarchy; no flat, unstructured dashboard blocks
- **Responsive behavior:** Desktop shows a broader continuity hub with parallel modules; mobile uses a stacked, guided sequence with progressive disclosure
- **Accessibility:** Keep icon + text for status/action states, maintain 44x44 touch targets, and preserve visible progress/state labels as text

### Affected Frontend Surfaces

| Surface | Description | Impact |
|---|---|---|
| `workspace-dashboard` | Returning-user planning workspace landing page | **Major refactor of existing page** |
| `workspace-recommendations` | Current recommendation review entry points from the dashboard | **Add continuity-safe return links / CTA wiring** |
| `workspace-history` | Archive entry point from the dashboard | **Add continuity-safe quick access** |

### Concept Options (3 Paired Directions Per Surface)

#### Surface: `workspace-dashboard`

**Concept A: Progress Hub**
- Desktop: `5853854a55e1466e979995b699bf6f4b`
- Mobile: `644856989f9a485da113a32a267fc4b2`
- Prompt summary: Resume-first continuity dashboard with current stage framing, progress timeline, and strong return-to-edit guidance

**Concept B: Comparison Workspace Continuity**
- Desktop: `3a4bf4f2083e46d89b219ab72563bf1a`
- Mobile: `2d7501846dd44d8a8bc52b9742494a71`
- Prompt summary: Summary band plus current recommendation context, archive preview, comparison entry points, and next-action modules inside the approved workspace shell

**Concept C: Evidence & Tasks Planning Hub**
- Desktop: `34bd9708e6764ade9b02545731f6af4c`
- Mobile: `a8bbe3f9604543ab8e6f4eddb64d493b`
- Prompt summary: Task-forward dashboard prioritizing readiness, action queue, evidence confidence, and checklist-style continuation

### Approved Stitch Design Package

- **Stitch project ID:** `6257021077077987630`
- **Surface-to-concept-options mapping:**
  - `workspace-dashboard`
    - Concept A / Progress Hub: desktop `5853854a55e1466e979995b699bf6f4b`, mobile `644856989f9a485da113a32a267fc4b2`
    - Concept B / Comparison Workspace Continuity: desktop `3a4bf4f2083e46d89b219ab72563bf1a`, mobile `2d7501846dd44d8a8bc52b9742494a71`
    - Concept C / Evidence & Tasks Planning Hub: desktop `34bd9708e6764ade9b02545731f6af4c`, mobile `a8bbe3f9604543ab8e6f4eddb64d493b`
- **Surface-to-approved-pair mapping:**
  - `workspace-dashboard` → Concept B / Comparison Workspace Continuity
- **Approved desktop screen IDs:** `3a4bf4f2083e46d89b219ab72563bf1a`
- **Approved mobile screen IDs:** `2d7501846dd44d8a8bc52b9742494a71`
- **Approved component IDs:** app-foundation comparison workspace shell patterns; reuse existing workspace cards, bands, and action modules before introducing new primitives
- **Approved concept labels:** `Comparison Workspace Continuity`
- **Selected variant labels:** Desktop `Comparison Workspace`, Mobile `Comparison Workspace`
- **Prompt summary:** Keep the already approved app-wide comparison workspace as the visual foundation, but bias the dashboard toward continuity, return context, archive preview, and next-cycle actions
- **Design context source:** `_bmad-output/planning-artifacts/ux-design-specification.md`, `_bmad-output/planning-artifacts/DESIGN.md`, `_bmad-output/planning-artifacts/design-tokens.json`, `_bmad-output/planning-artifacts/design-tokens.css`
- **Token artifact references:** `_bmad-output/planning-artifacts/design-tokens.json`, `_bmad-output/planning-artifacts/design-tokens.css`
- **Pair approval rationale:** The UX specification already approved `Comparison Workspace` as the app-level desktop/mobile pair. This story should stay inside that approved shell instead of switching the workspace to a different top-level direction. Concepts A and C remain documented as bounded alternatives, but Concept B is the approved implementation anchor for Story 4.4.
- **Supporting screenshot/code references:** `app/pages/workspace/index.vue`, `app/pages/workspace/history.vue`, `app/pages/workspace/recommendations/index.vue`, `app/components/workspace/WorkspaceShell.vue`

### Approved Variant Decision
- **Approved direction:** Concept B / Comparison Workspace Continuity
- **Why:** It preserves the globally approved app foundation while giving the workspace landing page the continuity and progress emphasis required by FR35
- **Refinements to carry into implementation:**
  - show a stronger return-context summary than the current generic welcome card
  - make archive and comparison actions visible without overwhelming the user
  - keep the recommendation review surface close to the landing workspace instead of splitting continuity across disconnected pages

### Design Tokens / System Constraints
- Use the approved token files as the only design-system source of truth for this story
- Preserve `Public Sans` for headings and body copy
- Use `--trust`, `--trust-soft`, `--success`, `--warning`, and `--destructive` roles instead of ad hoc colors
- Keep the current rounded card vocabulary (`--radius-md`, `--radius-lg`, `--radius-xl`)
- Continue the 8px spacing system; do not introduce a competing spacing scale
- Keep motion subtle and orientation-focused; use loading/skeleton transitions only to preserve context

### Stitch Retrieval Instructions
1. Fetch the approved desktop baseline from Stitch project `6257021077077987630`, screen `3a4bf4f2083e46d89b219ab72563bf1a`
2. Fetch the approved mobile baseline from Stitch project `6257021077077987630`, screen `2d7501846dd44d8a8bc52b9742494a71`
3. Implement the continuity hub by mapping those approved layouts onto existing Vue SFCs and workspace primitives rather than recreating a second visual language
4. If direct Stitch retrieval is unavailable in the implementation environment, use the embedded approved package in this story together with `DESIGN.md` and the token exports as the handoff baseline
5. Relevant implementation-facing skills if available in later execution: `stitch-vue-components`, `stitch-shadcn-vue`

### Referenced UX Artifacts
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/DESIGN.md`
- `_bmad-output/planning-artifacts/design-tokens.json`
- `_bmad-output/planning-artifacts/design-tokens.css`

### Architecture Constraints
- **Architecture model:** Continue the existing Nuxt 4 modular monolith; do not introduce a second workspace app or parallel dashboard state layer
- **HTTP boundary:** Keep browser calls on local Nuxt APIs under `server/api/workspace/*`
- **Auth:** Reuse `requireWorkspaceUserSession`; do not introduce new workspace auth guards
- **Persistence:** Recommendation runs remain in Convex plus relational profile snapshots; the workspace dashboard is a summary/read model on top of that persisted data
- **Business logic placement:** Keep continuity aggregation in `server/utils`, not in Vue page components
- **Routing:** Use the existing file-based routes under `app/pages/workspace/`
- **State management:** Keep client state in composables; do not add Pinia/Vuex for this story
- **Testing:** Reuse the now-established Vitest + Playwright setup already configured in `package.json` and `vitest.config.ts`

### File Structure Requirements
- Keep route-level UI in `app/pages/workspace/index.vue`
- Keep reusable continuity UI in `app/components/workspace/`
- Keep client-safe summary/action helpers in `app/lib/workspace/`
- Keep fetch/state logic in `app/composables/useWorkspaceContinuity.ts`
- Keep server read-model assembly in `server/utils/workspace/`
- Keep shared API contract types in `shared/types/`

### Testing Requirements
- Add component specs under `tests/components/workspace/`
- Add summary/API coverage under `tests/api/`
- Add returning-user continuity flow coverage under `tests/e2e/`
- Cover at minimum:
  - first-time user with no runs
  - returning user with draft + prior runs
  - returning user with comparable latest/prior runs
  - start-new-cycle flow preserves prior history

### Previous Story Intelligence
- Story 4.2 already established preserved run history, archived run playback, and workspace shell widening for recommendation/history surfaces. Reuse those contracts instead of building a second history summary path.
- Story 4.3 already established compare navigation, diff summaries, and context-preserving back-navigation. Story 4.4 should surface those capabilities from the dashboard, not re-implement comparison logic.
- Story 4.3 review fixes matter here:
  - preserve profile-delta and trust-diff context when deep-linking into compare
  - preserve history filter context on return
  - do not misclassify unchanged recommendations as changed

### Git Intelligence Summary
- Recent `feat(story-4.2)` and `feat(story-4.3)` commits show a stable pattern:
  - guarded Nitro routes under `server/api/workspace/`
  - feature-scoped workspace components under `app/components/workspace/`
  - composables own fetch and navigation logic
  - E2E flows preserve user context between archive, compare, and review
- Follow that pattern for the continuity hub rather than folding more logic into `app/pages/workspace/index.vue`

### Latest Tech Information
- **Nuxt 4.3:** Keep using file-based routing in `app/pages` and Nitro server routes in `server/api`; this matches both the current repo and the official Nuxt 4.3 line
- **Vue 3.5:** Stay with the repo’s current `<script setup lang="ts">` Composition API patterns; do not rewrite for novelty when the existing composable-driven approach already matches current Vue guidance
- **Tailwind CSS 4:** Continue using CSS variable-driven tokens and responsive utility classes; do not regress to Tailwind v3-era `theme.extend` assumptions
- **Vitest 4 / Playwright 1.58:** Automated coverage is now part of the live repo, so Story 4.4 should ship with component, API, and E2E coverage instead of relying on manual-only verification

---

## References

- `_bmad-output/planning-artifacts/epics.md` — Epic 4, Story 4.4 source requirements
- `_bmad-output/planning-artifacts/architecture.md` — modular monolith, server boundary, workflow continuity architecture
- `_bmad-output/planning-artifacts/ux-design-specification.md` — continuity UX principles, variant exploration, approved app-level direction
- `_bmad-output/planning-artifacts/DESIGN.md` — approved semantic design system and surface rules
- `_bmad-output/planning-artifacts/design-tokens.json` — machine-readable token source
- `_bmad-output/planning-artifacts/design-tokens.css` — implementation-facing token source
- `_bmad-output/project-context.md` — repo stack, coding boundaries, and anti-patterns
- `_bmad-output/implementation-artifacts/4-2-revisit-and-preserve-prior-recommendation-runs.md` — prior story patterns and archive contracts
- `_bmad-output/implementation-artifacts/4-3-show-changes-between-recommendation-runs.md` — compare flow patterns and continuity fixes
- `app/pages/workspace/index.vue` — current dashboard implementation to replace
- `app/components/workspace/WorkspaceShell.vue` — current workspace shell/layout rules
- `package.json` — current repo versions and test scripts
- `vitest.config.ts` — current component/unit test configuration
- `https://nuxt.com/blog/v3-17` — official Nuxt 4.3 release line reference
- `https://nuxt.com/docs/4.x/getting-started/routing` — official Nuxt routing guidance
- `https://blog.vuejs.org/posts/vue-3-5` — official Vue 3.5 release guidance
- `https://tailwindcss.com/docs/responsive-design` — official Tailwind responsive guidance

---

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- [x] Review the continuity summary contract and map each acceptance criterion to specific server and UI changes
- [x] Implement the server summary/read-model layer first so the dashboard becomes a thin client
- [x] Build the continuity hub components and wire actions into existing intake, review, history, and compare routes
- [x] Add API, component, and E2E coverage before moving the story to review

### Stitch Retrieval Log

- Approved design package inherited from the app-foundation `Comparison Workspace` direction in the UX artifacts
- No bound Stitch retrieval tool was available in this environment during story creation, so the embedded package above is the ready-for-dev handoff source
- Implementation used the approved embedded package together with `DESIGN.md` and the token exports as the runtime UI baseline.

### UI Implementation Mapping

- `workspace-dashboard` maps to `app/pages/workspace/index.vue`
- continuity hero / timeline / action modules map to new feature-scoped components under `app/components/workspace/`
- dashboard summary state maps to `app/composables/useWorkspaceContinuity.ts` plus `server/api/workspace/summary.get.ts`
- new-cycle actions map to the existing intake + refresh pathways instead of a new workflow
- `app/components/workspace/WorkspaceShell.vue` now widens the dashboard to the same large-shell workspace layout already used by review/history surfaces.

### Debug Log References

- `export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH" && pnpm exec vitest run tests/components/workspace/PlanningWorkspaceHero.spec.ts tests/components/workspace/PlanningProgressTimeline.spec.ts tests/components/workspace/PlanningWorkspaceActionPanel.spec.ts`
- `export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH" && pnpm test:components`
- `export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH" && pnpm test:api tests/api/workspace-summary.atdd.spec.ts`
- `export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH" && pnpm test:api tests/api/intake-draft.spec.ts tests/api/intake-submit.atdd.spec.ts tests/api/workspace-summary.atdd.spec.ts`
- `export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH" && pnpm test:api`
- `export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH" && pnpm test:e2e tests/e2e/workspace-continuity-hub.atdd.spec.ts`
- `pnpm dev`

### Completion Notes List

- [x] Story implementation started
- [x] Continuity summary contract added
- [x] Dashboard continuity hub delivered
- [x] New-cycle flow preserves prior history
- [x] Code review follow-ups applied for new-cycle lineage, latest review routing, and return-to-context links
- [x] Review fixes now keep refresh runs pinned to preserved source snapshots, persist new-cycle lineage in drafts, and route refresh directly into the new run
- [x] Tests passing
- [x] Ready for code review

### File List

- [x] `_bmad-output/implementation-artifacts/4-4-support-ongoing-reuse-of-the-planning-workspace.md`
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml`
- [x] `server/api/workspace/summary.get.ts`
- [x] `server/utils/workspace/buildWorkspaceSummary.ts`
- [x] `shared/types/workspace-summary.ts`
- [x] `app/lib/workspace/workspace-summary.ts`
- [x] `app/composables/useWorkspaceContinuity.ts`
- [x] `app/pages/workspace/index.vue`
- [x] `app/pages/workspace/intake.vue`
- [x] `app/components/workspace/WorkspaceShell.vue`
- [x] `app/components/workspace/PlanningWorkspaceHero.vue`
- [x] `app/components/workspace/PlanningProgressTimeline.vue`
- [x] `app/components/workspace/PlanningWorkspaceActionPanel.vue`
- [x] `server/api/intake/draft.get.ts`
- [x] `server/api/intake/draft.post.ts`
- [x] `server/api/intake/submit.post.ts`
- [x] `server/api/recommendations/runs/[runId]/refresh.post.ts`
- [x] `server/utils/intake/intakeSchemas.ts`
- [x] `server/utils/intake/normalizeIntakePayload.ts`
- [x] `server/db/migrations/postgresql/0003_intake_draft_source_run.sql`
- [x] `tests/api/intake-draft.spec.ts`
- [x] `tests/api/workspace-summary.atdd.spec.ts`
- [x] `tests/api/intake-submit.atdd.spec.ts`
- [x] `tests/components/workspace/PlanningWorkspaceHero.spec.ts`
- [x] `tests/components/workspace/PlanningProgressTimeline.spec.ts`
- [x] `tests/components/workspace/PlanningWorkspaceActionPanel.spec.ts`
- [x] `tests/e2e/workspace-continuity-hub.atdd.spec.ts`
- [x] `tests/e2e/workspace-recommendation-run-history.red.atdd.spec.ts`
- [x] `tests/support/fixtures/factories/intake-draft-factory.ts`
- [x] `tests/support/fixtures/factories/intake-submit-factory.ts`
- [x] `tests/support/fixtures/test-data.ts`
- [x] `tests/support/fixtures/factories/workspace-summary-factory.ts`
- [x] `app/pages/workspace/recommendations/[runId].vue`
- [x] `app/composables/useRecommendationRunHistory.ts`

### Story Completion Status

- [x] All acceptance criteria met
- [x] All tasks completed
- [x] Tests passing
- [x] Code reviewed

### Senior Developer Review (AI)

- 2026-03-13: Resolved continuity routing so workspace review actions reopen the live `/workspace/recommendations` surface instead of the archived run-detail route.
- 2026-03-13: Moved `sourceRunId` validation ahead of intake snapshot persistence so rejected lineage requests do not leave orphaned `recommendation_profiles` rows behind.
- 2026-03-13: Added compensating cleanup in recommendation refresh so failed run creation removes the new relational snapshot when no Convex run materializes.
- 2026-03-13: Verified with targeted API and E2E coverage:
  - `pnpm test:api tests/api/intake-submit.atdd.spec.ts tests/api/recommendation-refresh.atdd.spec.ts tests/api/workspace-summary.atdd.spec.ts`
  - `pnpm test:e2e tests/e2e/workspace-continuity-hub.atdd.spec.ts`

## Change Log

- 2026-03-12: Story created on `feat/4-4-support-ongoing-reuse-of-the-planning-workspace`, with approved continuity-focused design handoff and repo-specific implementation guidance.
- 2026-03-12: Implemented the workspace continuity summary API, continuity hub dashboard refactor, new-cycle/refresh actions, and automated API/component/E2E coverage for Story 4.4; status advanced to `review`.
- 2026-03-12: Applied review-driven fixes for source-run-aware new-cycle submission, latest-review run targeting, and preserved archive filter context; expanded automation to cover lineage and continuity handoff.
- 2026-03-12: Corrected the intake-submit ATDD fixture merge behavior so partial field overrides keep the rest of a completed draft intact, preserving valid new-cycle lineage coverage.
- 2026-03-12: Fixed review regressions by persisting draft-owned `sourceRunId`, forcing refresh runs to clone preserved source snapshots, suppressing compare CTAs when a newer cycle is still active, and routing refresh directly to the returned run; targeted API, component, and E2E verification passed.
- 2026-03-13: Fixed the final code review findings by restoring live recommendation routing from the continuity hub and hardening submit/refresh lineage persistence against orphaned snapshot writes; targeted API and continuity E2E verification passed and story advanced to `done`.
