# Story 3.2: Surface Blockers, Tradeoffs, and Improvement Actions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an immigration user,
I want to see what is blocking a pathway and what I can do to improve it,
so that I can make better decisions instead of receiving static pass-or-fail output.

## Acceptance Criteria

1. **Given** a recommendation has unmet conditions or reduced fit **When** I inspect that pathway **Then** the product shows the blockers, weaknesses, or missing conditions affecting the recommendation **And** those blockers are presented as understandable constraints rather than hidden logic.
2. **Given** a pathway could become stronger with user action **When** the recommendation detail is shown **Then** the product includes concrete actions that may improve eligibility **And** those actions are kept distinct from the factual blocker information.
3. **Given** multiple recommendation options are available **When** I compare them **Then** each option includes visible tradeoffs such as effort, timing, or strategic complexity **And** the comparison helps me understand what I gain or accept by choosing one route over another.

## Tasks / Subtasks

- [x] Task 1: Extend normalized recommendation contracts for blockers, tradeoffs, and improvement actions (AC: #1, #2, #3)
  - [x] 1.1 Add recommendation-domain fields in `server/utils/recommendations` for factual blockers, actionable improvements, and tradeoff statements without leaking provider internals.
  - [x] 1.2 Ensure direct, blocked, and composed candidates carry consistent blocker/tradeoff/action structures through ranking + qualification flows.
  - [x] 1.3 Preserve existing tier/confidence/freshness/caveat semantics and canonical lifecycle compatibility (`queued`, `evaluating`, `completed`, `degraded`, `failed`).
  - [x] 1.4 Extend Convex persistence contracts in `convex/schema.ts` and `convex/recommendationRuns.ts` so new explanation modules are stored with recommendation results.

- [x] Task 2: Expose blocker/tradeoff/action modules in recommendation results APIs (AC: #1, #2, #3)
  - [x] 2.1 Update `server/api/recommendations/runs/[runId]/results.get.ts` response mapping and typing for blocker/tradeoff/action payloads.
  - [x] 2.2 Ensure factual blockers remain textually distinct from recommended actions in the returned contract.
  - [x] 2.3 Keep failure/degraded terminal safety behavior from Story 2.4 and Story 3.1 intact while adding new modules.

- [x] Task 3: Render blocker/tradeoff/action modules in workspace recommendation review (AC: #1, #2, #3)
  - [x] 3.1 Add reusable recommendation presentation modules aligned with architecture guidance (for example `BlockerAndTradeoffPanel`, `NextActionQueue`) under approved recommendation/workspace component boundaries.
  - [x] 3.2 Update `app/components/workspace/RecommendationResultsPanel.vue` to render factual blockers, tradeoffs, and concrete improvement actions per recommendation.
  - [x] 3.3 Preserve non-color-only semantics and readable text hierarchy when surfacing blocker severity, tradeoff complexity, and action priority.
  - [x] 3.4 Maintain compatibility with existing recommendation status and run continuity surfaces.

- [x] Task 4: Apply approved responsive + accessibility constraints to blocker/tradeoff/action UI (AC: #1, #2, #3)
  - [x] 4.1 Implement within approved `Comparison Workspace` desktop/mobile pair while preserving information architecture parity.
  - [x] 4.2 Ensure keyboard navigation, semantic labels, and clear assistive text for blocker, tradeoff, and action sections.
  - [x] 4.3 Preserve 44x44 touch-target minimums and avoid collapsing critical trust/blocker content on mobile.

- [x] Task 5: Add API/integration/UI coverage for blocker/tradeoff/action semantics (AC: #1, #2, #3)
  - [x] 5.1 Add API tests verifying normalized blocker/tradeoff/action contract presence for direct/blocked/composed candidates.
  - [x] 5.2 Add integration tests validating factual blocker and recommended action separation in stored + retrieved recommendation results.
  - [x] 5.3 Add UI coverage for readable blocker/tradeoff/action rendering and stable test hooks in recommendation review surfaces.
  - [x] 5.4 Reuse deterministic recommendation seed/reset hooks for scenario setup.

## Dev Notes

- Story 3.1 completed rationale + fit-signal surfacing and introduced `RecommendationTierBadge` plus normalized rationale payloads; Story 3.2 extends the same recommendation cards with blocker/tradeoff/action modules.
- Keep trust-sensitive interpretation and shaping logic server-owned in `server/utils/recommendations` + Convex, not in Vue pages/components.
- This is frontend-impacting and uses the pre-approved app-level Stitch direction from UX artifacts.

### UI/UX Context

- Frontend-impacting: `true`
- User-facing objective: make recommendation constraints explicit by separating:
  - factual blockers/missing conditions,
  - user-improvable next actions,
  - strategic tradeoffs (effort, timing, complexity).
- Continue using the approved app direction: `Comparison Workspace (Desktop + Mobile Pairing)`.

### Affected Frontend Surfaces

- Surface Group `recommendation-review-primary`: recommendation review surface in workspace (`RecommendationResultsPanel`) where tier/rationale currently render and blocker/tradeoff/action modules must be added.

### Concept Options (3 Paired Directions Per Surface)

- Surface: `recommendation-review-primary`
  - Concept A `Progress Hub`
    - Desktop screen ID: `5853854a55e1466e979995b699bf6f4b`
    - Mobile screen ID: `644856989f9a485da113a32a267fc4b2`
    - Prompt summary: continuity-first recommendation review emphasizing progress + resume flow.
  - Concept B `Comparison Workspace`
    - Desktop screen ID: `3a4bf4f2083e46d89b219ab72563bf1a`
    - Mobile screen ID: `2d7501846dd44d8a8bc52b9742494a71`
    - Prompt summary: side-by-side pathway comparison with explicit blockers, trust context, and actionable next steps.
  - Concept C `Evidence & Tasks`
    - Desktop screen ID: `34bd9708e6764ade9b02545731f6af4c`
    - Mobile screen ID: `a8bbe3f9604543ab8e6f4eddb64d493b`
    - Prompt summary: evidence + task-forward layout emphasizing readiness tracking and action queue management.

### Approved Stitch Design Package

- Stitch project ID: `6257021077077987630`
- Surface-to-concept-options mapping:
  - `recommendation-review-primary`:
    - `Progress Hub` -> desktop `5853854a55e1466e979995b699bf6f4b`, mobile `644856989f9a485da113a32a267fc4b2`
    - `Comparison Workspace` -> desktop `3a4bf4f2083e46d89b219ab72563bf1a`, mobile `2d7501846dd44d8a8bc52b9742494a71`
    - `Evidence & Tasks` -> desktop `34bd9708e6764ade9b02545731f6af4c`, mobile `a8bbe3f9604543ab8e6f4eddb64d493b`
- Surface-to-approved-pair mapping:
  - `recommendation-review-primary` -> `Comparison Workspace` desktop/mobile pair
- Approved desktop screen IDs:
  - `3a4bf4f2083e46d89b219ab72563bf1a`
- Approved mobile screen IDs:
  - `2d7501846dd44d8a8bc52b9742494a71`
- Approved component IDs:
  - Use screen-derived mapping into existing recommendation/workspace components during implementation.
- Approved concept labels:
  - `Comparison Workspace`
- Selected variant labels:
  - `Comparison Workspace (Desktop + Mobile Pairing)`
- Prompt summary:
  - Keep blockers and tradeoffs explicit, keep actions prioritized, and preserve trust-context clarity across desktop and mobile.
- Design context source:
  - `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `_bmad-output/planning-artifacts/DESIGN.md`
- Token artifact references:
  - `_bmad-output/planning-artifacts/design-tokens.json`
  - `_bmad-output/planning-artifacts/design-tokens.css`
- Pair approval rationale:
  - Existing UX approval selected `Comparison Workspace` as the strongest decision-support layout for high-stakes pathway review with trust signaling.
- Supporting screenshot/code references:
  - Stitch IDs listed above + implementation surface `app/components/workspace/RecommendationResultsPanel.vue`.

### Approved Variant Decision

- Surface: `recommendation-review-primary`
  - Approved concept: `Comparison Workspace`
  - Approved desktop/mobile pair:
    - Desktop: `3a4bf4f2083e46d89b219ab72563bf1a`
    - Mobile: `2d7501846dd44d8a8bc52b9742494a71`
  - Approval rationale:
    - Preserves side-by-side comparison depth on desktop,
    - supports progressive disclosure on mobile,
    - aligns with Epic 3 trust + tradeoff communication requirements.

### Design Tokens / System Constraints

- Use tokenized trust semantics from planning artifacts:
  - trust/action: `--trust`, `--primary`
  - confidence and caution tones: `--confidence-high`, `--confidence-medium`, `--confidence-low`, `--warning`, `--warning-soft`
- Preserve `Public Sans` typography and 8px spacing scale.
- Maintain visible focus states, semantic labels, and non-color-only meaning for blocker severity/tradeoff complexity/action urgency.
- Keep critical blocker/trust details visible on mobile; do not hide core risk content behind inaccessible interaction patterns.

### Stitch Retrieval Instructions

1. Set workspace project to `6257021077077987630`.
2. Fetch approved baseline screens first:
   - desktop `3a4bf4f2083e46d89b219ab72563bf1a`
   - mobile `2d7501846dd44d8a8bc52b9742494a71`
3. Map approved composition into implementation tasks:
   - blocker/tradeoff panel placement,
   - action queue prioritization,
   - responsive ordering for desktop vs mobile.
4. Use `stitch-vue-components` for Vue SFC mapping and `stitch-shadcn-vue` for primitive alignment.
5. If ambiguity remains, consult supporting concept artifacts (`Progress Hub`, `Evidence & Tasks`) while keeping final implementation anchored to approved `Comparison Workspace` pair.

### Referenced UX Artifacts

- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/DESIGN.md`
- `_bmad-output/planning-artifacts/design-tokens.json`
- `_bmad-output/planning-artifacts/design-tokens.css`

### Project Structure Notes

- Primary expected touch points:
  - `app/components/workspace/RecommendationResultsPanel.vue`
  - `app/components/workspace/RecommendationTierBadge.vue` (compatibility check)
  - `server/utils/recommendations/buildRecommendationRationale.ts`
  - `server/utils/recommendations/rankRecommendationCandidates.ts`
  - `server/api/recommendations/runs/[runId]/results.get.ts`
  - `convex/schema.ts`
  - `convex/recommendationRuns.ts`
  - related recommendation API/integration/E2E test suites
- Optional component extraction (aligned with architecture mapping):
  - `app/components/recommendations/BlockerAndTradeoffPanel.vue`
  - `app/components/recommendations/NextActionQueue.vue`
- Keep changes story-scoped; avoid unrelated intake/admin refactors.

### Technical Requirements

- Persist and return explicit blocker/tradeoff/action modules for each recommendation candidate.
- Keep factual blockers separate from proposed actions in data contracts and UI rendering.
- Ensure tradeoffs are explicit and comparable across candidate pathways.
- Preserve existing qualification + caveat metadata and degraded-state behavior.

### Architecture Compliance

- Nuxt server routes remain browser-facing boundary for recommendation data.
- Trust-sensitive shaping logic stays in server utilities and Convex modules.
- Canonical recommendation lifecycle states remain unchanged.
- API contracts remain normalized, provider-agnostic, camelCase.

### Library and Framework Requirements

- Nuxt 4 + Vue 3 (`<script setup lang="ts">`) patterns remain required.
- Continue with existing shadcn-nuxt/Reka primitive layer for base UI controls.
- Keep TypeScript-first typed contracts across server, Convex, and UI.
- Preserve boundary validation patterns (`zod`/guard helpers on server, `v.*` in Convex).

### File Structure Requirements

- UI implementation in `app/components/workspace` and/or `app/components/recommendations` as architecture-approved locations.
- API contract changes in `server/api/recommendations/runs/[runId]/results.get.ts`.
- Recommendation shaping logic in `server/utils/recommendations/*`.
- Persistence updates in `convex/schema.ts` and `convex/recommendationRuns.ts`.
- Story-scoped tests in existing `tests/api`, `tests/integration`, `tests/e2e` recommendation suites.

### Testing Requirements

- Add API assertions for normalized blocker/tradeoff/action payloads across candidate classes.
- Add integration tests for persistence + retrieval and factual/action separation guarantees.
- Add E2E/UI assertions for visible, readable blocker/tradeoff/action modules (not color-only cues).
- Preserve deterministic setup via recommendation seed/reset hooks.
- Maintain stable test hooks, including existing `recommendation-tier-badge`; add new module hooks where needed for blocker/action panels.

### Previous Story Intelligence

- Story 3.1 established rationale + fit-signal pipeline and tier-badge semantics; reuse those contracts and avoid parallel explanation shapes.
- Story 3.1 explicitly corrected missing-profile-signal handling (`watch` vs false-negative `gap`), so blocker-generation logic in Story 3.2 must preserve that distinction.
- Story 3.1 activated red qualification/refresh suites; keep those suites green and extend coverage rather than introducing separate test scaffolding.

### Git Intelligence Summary

- Recent delivery pattern is story-scoped feature + hardening with PR merges into `dev`.
- Recommendation-domain stories have been implemented incrementally with API/integration coverage first, then E2E proof.
- Apply same pattern for Story 3.2: contract-first backend updates, then UI modules, then deterministic test coverage.

### Latest Tech Information

- Current repository baseline (`package.json`):
  - `nuxt` `^4.3.1`
  - `vue` `^3.5.28`
  - `typescript` `^5.9.3`
  - `convex` `^1.32.0`
  - `better-auth` `1.4.9`
  - `reka-ui` `^2.8.2`
  - `zod` `3.25.76`
- Latest npm versions checked on 2026-03-07:
  - `nuxt` `4.3.1` (current)
  - `vue` `3.5.29` (patch available)
  - `typescript` `5.9.3` (current)
  - `convex` `1.32.0` (current)
  - `better-auth` `1.5.4` (minor available)
  - `reka-ui` `2.9.0` (minor available)
  - `zod` `4.3.6` (major available)
- Guidance: keep dependency upgrades out of Story 3.2 scope unless a blocker requires them.

### Project Context Reference

- `_bmad-output/project-context.md` rules apply directly:
  - strict server-side integration boundaries,
  - typed validation and normalization,
  - reuse of existing UI primitives,
  - no parallel auth/state/provider abstractions.

### Story Completion Status

- Story context quality review status: complete
- Frontend-impacting classification: `true`
- Approved design handoff package: embedded and complete
- Approved desktop/mobile pair per impacted surface: satisfied
- Three concept directions per impacted surface: documented
- Ready-for-dev gate: satisfied
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.
- Completion note: Frontend design packaging complete - approved Stitch design package embedded in story file.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2]
- [Source: _bmad-output/implementation-artifacts/3-1-show-recommendation-rationale-and-fit-signals.md]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping]
- [Source: _bmad-output/planning-artifacts/architecture.md#State Management Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Variant Exploration]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Selected Direction]
- [Source: _bmad-output/planning-artifacts/DESIGN.md]
- [Source: _bmad-output/planning-artifacts/design-tokens.json]
- [Source: _bmad-output/planning-artifacts/design-tokens.css]
- [Source: _bmad-output/project-context.md]
- [Source: _bmad-output/test-artifacts/test-design/cadet2-handoff.md#Story-Level Integration Guidance]
- [Source: package.json]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (CLI)

### Implementation Plan

1. Extend recommendation-domain schemas/contracts for blockers, tradeoffs, and improvement actions.
2. Persist and expose these fields through Convex and recommendation results APIs.
3. Render blocker/tradeoff/action modules in recommendation review UI under approved layout constraints.
4. Add API/integration/UI coverage for semantic separation and readability.

### Stitch Retrieval Log

- Approved Stitch project and screen pair captured from UX artifacts:
  - Project: `6257021077077987630`
  - Desktop: `3a4bf4f2083e46d89b219ab72563bf1a`
  - Mobile: `2d7501846dd44d8a8bc52b9742494a71`
- Implementation should anchor to approved `Comparison Workspace` pair.

### UI Implementation Mapping

- `recommendation-review-primary` maps to:
  - `RecommendationResultsPanel` enhancement for blockers/tradeoffs/actions
  - optional extraction to `BlockerAndTradeoffPanel` and `NextActionQueue`
- Keep tier/rationale rendering from Story 3.1 and extend card content hierarchy.

### Debug Log References

- 2026-03-07: Initial Story 3.2 validation:
  - `pnpm exec playwright test --project=api tests/api/recommendation-explanations.atdd.spec.ts`
  - Result: 3 passed
  - `pnpm exec playwright test --project=api tests/integration/recommendation-explanations.integration.spec.ts`
  - Result: 3 passed
  - `pnpm exec playwright test --project=chromium tests/e2e/workspace-recommendation-explanations.atdd.spec.ts`
  - Result: 3 passed
- 2026-03-07: Code-review follow-up validation:
  - `pnpm exec playwright test --project=api tests/api/recommendation-explanations.atdd.spec.ts`
  - Result: 3 passed
  - `pnpm exec playwright test --project=api tests/integration/recommendation-explanations.integration.spec.ts`
  - Result: 3 passed
  - `pnpm exec playwright test --project=chromium tests/e2e/workspace-recommendation-explanations.atdd.spec.ts`
  - Result: 3 passed
  - `pnpm build`
  - Result: passed

### Completion Notes List

- Implemented normalized blocker/tradeoff/action modules in recommendation-domain contracts and propagated them through ranking and qualification flows.
- Added server-side explanation-module generation to keep factual blockers, tradeoffs, and user actions provider-agnostic and distinct.
- Extended Convex validators + normalization logic so modules are persisted and returned consistently for direct/blocked/composed candidates.
- Updated run results API contract mapping to expose blocker/tradeoff/action payloads while preserving Story 2.4 and Story 3.1 degraded/failure safety behavior.
- Added reusable UI modules (`BlockerAndTradeoffPanel`, `NextActionQueue`) and refactored recommendation results rendering to surface text-first semantics with stable hooks.
- Applied responsive + accessibility constraints (semantic headings/labels, non-color-only labels, and `min-h-[44px]` touch targets for action and module rows).
- Activated and passed Story 3.2 API/integration/E2E coverage, then ran nearby ranking and workspace regression suites successfully.
- Applied code-review fixes so strong-fit recommendations no longer synthesize blocker/action content without unmet conditions.
- Renamed Story 3.2 test suites from `*.red.*` to canonical ATDD/integration filenames now that they pass as implemented behavior.

### File List

- `_bmad-output/implementation-artifacts/3-2-surface-blockers-tradeoffs-and-improvement-actions.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `.gitignore`
- `server/utils/recommendations/buildRecommendationRationale.ts`
- `server/utils/recommendations/rankRecommendationCandidates.ts`
- `server/utils/recommendations/generateRankedRecommendations.ts`
- `server/api/recommendations/runs/[runId]/results.get.ts`
- `convex/schema.ts`
- `convex/recommendationRuns.ts`
- `app/pages/workspace/index.vue`
- `app/components/workspace/RecommendationResultsPanel.vue`
- `app/components/recommendations/BlockerAndTradeoffPanel.vue`
- `app/components/recommendations/NextActionQueue.vue`
- `tests/api/recommendation-explanations.atdd.spec.ts`
- `tests/integration/recommendation-explanations.integration.spec.ts`
- `tests/e2e/workspace-recommendation-explanations.atdd.spec.ts`

### Senior Developer Review (AI)

- 2026-03-07: Review completed with follow-up fixes applied.
- Fixed blocker/action over-reporting for supported recommendations to align with AC1/AC2 conditional semantics.
- Renamed Story 3.2 tests to remove `red` naming drift and kept passing coverage in API/integration/E2E layers.
- Story status moved from `review` to `done` after follow-up fixes and validation.

## Change Log

- 2026-03-07: Implemented Story 3.2 blockers/tradeoffs/improvement-actions end to end across domain contracts, persistence, APIs, UI modules, and ATDD coverage.
- 2026-03-07: Applied code-review follow-up fixes (conditional blocker/action semantics, test suite renames, and documentation synchronization).
