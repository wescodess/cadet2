# Story 3.1: Show Recommendation Rationale and Fit Signals

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an immigration user,  
I want to see why each recommendation is relevant to my situation,  
so that I can understand which pathways genuinely fit and which are less certain.

## Acceptance Criteria

1. **Given** I open a completed recommendation run **When** the recommendation results are displayed **Then** each recommendation includes a clear explanation of why it appears for my profile **And** the explanation surfaces relevant strengths and fit factors tied to my submitted data.
2. **Given** the result set includes recommendations with different certainty levels **When** they are presented in the review surface **Then** each recommendation is labeled with its recommendation tier or confidence level **And** the meaning of the fit signal is understandable without relying on color alone **And** the rendered fit state can be targeted through a stable `data-testid="recommendation-tier-badge"` hook.
3. **Given** a recommendation is weaker or conditional **When** I review it **Then** the product clearly distinguishes it from stronger-fit options **And** it does not present lower-confidence pathways as equally strong choices.
4. **Given** a recommendation is degraded because evidence is stale, weak, or incomplete **When** I review it **Then** the product visibly downgrades the recommendation state and preserves its warning context instead of rendering it as equivalent to strong-fit output.

## Tasks / Subtasks

- [x] Task 1: Add rationale and fit-signal fields to normalized recommendation output contracts (AC: #1, #2, #3, #4)
  - [x] 1.1 Add recommendation explanation modeling in `server/utils/recommendations` (for example `buildRecommendationRationale.ts`) so each candidate includes plain-language rationale and fit-signal entries derived from pathway evaluation + profile snapshot context.
  - [x] 1.2 Extend ranked recommendation contracts in `server/utils/recommendations/rankRecommendationCandidates.ts` and downstream qualification flow so `direct`, `blocked`, and `composed` candidates include rationale and fit-signal payloads without exposing provider internals.
  - [x] 1.3 Extend Convex persistence contracts in `convex/schema.ts` and `convex/recommendationRuns.ts` so rationale + fit-signal data are stored with existing tier/confidence/freshness/caveat metadata.
  - [x] 1.4 Preserve existing supported-scope filtering and canonical lifecycle compatibility (`queued`, `evaluating`, `completed`, `degraded`, `failed`).

- [x] Task 2: Extend recommendation results API to return fit-signal semantics safely (AC: #1, #2, #3, #4)
  - [x] 2.1 Update `server/api/recommendations/runs/[runId]/results.get.ts` response typing and mapping so every recommendation candidate includes rationale + fit-signal fields.
  - [x] 2.2 Ensure weak/degraded candidates return visible downgraded semantics (tier/confidence/caveat text) and are never rendered as equivalent to strong-fit output.
  - [x] 2.3 Keep failed-run terminal-safe response behavior from Story 2.4 intact while preserving user-safe recovery guidance.

- [x] Task 3: Implement frontend rationale + tier presentation in workspace recommendation review surface (AC: #1, #2, #3, #4)
  - [x] 3.1 Introduce a reusable `RecommendationTierBadge` component under `app/components/workspace` (or approved recommendation component folder) with explicit text labels and `data-testid="recommendation-tier-badge"`.
  - [x] 3.2 Update `app/components/workspace/RecommendationResultsPanel.vue` to display rationale copy and fit-signal list per recommendation candidate, including degraded/low-confidence warning context.
  - [x] 3.3 Ensure strong-fit, conditional-fit, and lower-confidence candidates are visually and textually distinct without relying on color alone.
  - [x] 3.4 Keep existing recommendation run and status surfaces compatible (`RecommendationStatusBanner`, `RecommendationRunList`, workspace dashboard composition).

- [x] Task 4: Apply approved responsive and accessibility constraints for the selected design direction (AC: #2, #3, #4)
  - [x] 4.1 Follow the approved `Comparison Workspace` pairing for desktop/mobile composition while preserving information architecture parity.
  - [x] 4.2 Enforce semantic labeling, visible focus states, and keyboard reachability for fit-signal and rationale elements.
  - [x] 4.3 Preserve 44x44 touch-target discipline where interactive tier/rationale affordances are introduced.

- [x] Task 5: Add API/integration/UI coverage for rationale and fit-signal rendering contracts (AC: #1, #2, #3, #4)
  - [x] 5.1 Add API tests to verify rationale + fit-signal fields are present for direct/blocked/composed candidates and stay normalized.
  - [x] 5.2 Add integration tests validating downgraded/degraded candidates preserve caveat context and do not regress into strong-fit semantics.
  - [x] 5.3 Add UI test coverage for `data-testid="recommendation-tier-badge"` and readable tier meaning independent of color-only cues.
  - [x] 5.4 Reuse deterministic recommendation lifecycle seed/reset hooks for stable scenario setup.

## Dev Notes

- Story 2.4 delivered qualification metadata (`qualification`, `confidence`, `freshness`, `caveat`) and degraded/failed finalization behavior. Story 3.1 builds the user-facing explanation and fit-signal layer on top of those contracts.
- This is a frontend-impacting story and requires the approved Stitch design handoff package to be embedded in this story file before dev implementation.
- Keep recommendation trust semantics server-owned and normalized before they reach UI components.

### UI/UX Context

- Frontend-impacting: `true`
- User-facing goal: transform ranked recommendation rows into explainable recommendation cards/rows with:
  - rationale (why shown for this profile),
  - fit signals (strengths / relevant factors),
  - explicit tier/confidence semantics and caveat messaging for weaker outputs.
- The baseline approved app direction is `Comparison Workspace (Desktop + Mobile Pairing)` with dedicated desktop and mobile compositions.

### Affected Frontend Surfaces

- Surface Group `recommendation-review-primary`: workspace recommendation review surface currently rendered by `RecommendationResultsPanel`, including per-candidate tier indicators and rationale/fit-signal content.

### Concept Options (3 Paired Directions Per Surface)

- Surface: `recommendation-review-primary`
  - Concept A `Progress Hub`
    - Desktop screen ID: `5853854a55e1466e979995b699bf6f4b`
    - Mobile screen ID: `644856989f9a485da113a32a267fc4b2`
    - Prompt summary: continuity-first recommendation review emphasizing progress framing and resume flow with rationale snippets.
  - Concept B `Comparison Workspace`
    - Desktop screen ID: `3a4bf4f2083e46d89b219ab72563bf1a`
    - Mobile screen ID: `2d7501846dd44d8a8bc52b9742494a71`
    - Prompt summary: side-by-side pathway comparison with explicit recommendation rationale, fit-tier visibility, and confidence context.
  - Concept C `Evidence & Tasks`
    - Desktop screen ID: `34bd9708e6764ade9b02545731f6af4c`
    - Mobile screen ID: `a8bbe3f9604543ab8e6f4eddb64d493b`
    - Prompt summary: trust-and-action layout emphasizing evidence confidence and follow-up tasks alongside recommendation summaries.

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
  - Not explicitly exported in current planning artifacts; derive component mapping from approved desktop/mobile screens and existing workspace components.
- Approved concept labels:
  - `Comparison Workspace`
- Selected variant labels:
  - `Comparison Workspace (Desktop + Mobile Pairing)`
- Prompt summary:
  - Recommendation review should keep the comparison surface central and make rationale, fit level, and confidence caveats explicit and scannable across desktop and mobile.
- Design context source:
  - `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `_bmad-output/planning-artifacts/DESIGN.md`
- Token artifact references:
  - `_bmad-output/planning-artifacts/design-tokens.json`
  - `_bmad-output/planning-artifacts/design-tokens.css`
- Pair approval rationale:
  - Existing UX artifact approval selected `Comparison Workspace` as the best fit for high-stakes side-by-side decision support with explicit trust signaling.
- Supporting screenshot/code references:
  - Stitch screen IDs above + existing implementation surfaces in `app/components/workspace/RecommendationResultsPanel.vue` and `app/pages/workspace/index.vue`.

### Approved Variant Decision

- Surface: `recommendation-review-primary`
  - Approved concept: `Comparison Workspace`
  - Approved desktop/mobile pair:
    - Desktop: `3a4bf4f2083e46d89b219ab72563bf1a`
    - Mobile: `2d7501846dd44d8a8bc52b9742494a71`
  - Approval rationale:
    - Best aligns with Epic 3 comparison-and-explanation goals,
    - supports clear tier differentiation and rationale density on desktop,
    - preserves progressive disclosure on mobile without losing trust semantics.

### Design Tokens / System Constraints

- Use approved trust semantics from token artifacts:
  - trust/action: `--trust`, `--primary`
  - confidence tiers: `--confidence-high`, `--confidence-medium`, `--confidence-low`
  - warning/caveat: `--warning`, `--warning-soft`
- Preserve typography and spacing contract:
  - display/body fonts from `Public Sans`
  - 8px spacing scale (`--space-*`)
  - minimum touch target `44px`.
- Keep tier meaning text-visible and screen-reader clear; color is supportive, not primary semantics.
- Keep desktop side-by-side comparison orientation and mobile progressive disclosure rules from approved UX direction.

### Stitch Retrieval Instructions

1. Set workspace project to `6257021077077987630`.
2. Retrieve approved desktop/mobile screens first:
  - desktop `3a4bf4f2083e46d89b219ab72563bf1a`
  - mobile `2d7501846dd44d8a8bc52b9742494a71`
3. Use these screens as the implementation baseline for:
  - recommendation candidate container layout,
  - tier badge placement and copy hierarchy,
  - rationale + fit-signal content ordering.
4. Map approved UI into Vue/Nuxt components:
  - use `stitch-vue-components` for SFC extraction/mapping,
  - use `stitch-shadcn-vue` to align with existing shadcn-nuxt/Reka primitives.
5. If design ambiguity appears, reference supporting concept screens (Progress Hub and Evidence & Tasks) but keep final implementation anchored to approved `Comparison Workspace` pair.

### Referenced UX Artifacts

- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/DESIGN.md`
- `_bmad-output/planning-artifacts/design-tokens.json`
- `_bmad-output/planning-artifacts/design-tokens.css`

### Project Structure Notes

- Existing likely touch points for this story:
  - `app/components/workspace/RecommendationResultsPanel.vue`
  - `app/components/workspace/RecommendationStatusBanner.vue` (compatibility check only unless fit semantics are promoted there)
  - `app/pages/workspace/index.vue`
  - `app/lib/recommendation-lifecycle.ts` (only if label/tone semantics require explicit extension)
  - `server/api/recommendations/runs/[runId]/results.get.ts`
  - `server/utils/recommendations/rankRecommendationCandidates.ts`
  - `server/utils/recommendations/generateRankedRecommendations.ts`
  - `convex/schema.ts`
  - `convex/recommendationRuns.ts`
  - `tests/api/*recommendation*`
  - `tests/integration/*recommendation*`
  - UI test files for workspace recommendation rendering as needed
- Prefer introducing reusable recommendation presentation components over expanding one large template block.

### Technical Requirements

- Every rendered recommendation must provide explicit rationale text tied to the user profile context.
- Every rendered recommendation must include explicit fit signal labeling that is understandable without color cues.
- Existing qualification metadata from Story 2.4 must remain first-class and visible in weaker/degraded outputs.
- Weaker/conditional recommendations must not appear equivalent to strong-fit recommendations in hierarchy, copy, or status affordances.
- Contracts must remain provider-agnostic and normalized at API boundaries.

### Architecture Compliance

- Keep Nuxt server routes as the browser-facing boundary (`server/api/recommendations/*`).
- Keep trust-sensitive recommendation interpretation logic in server utilities and Convex persistence, not inside page components.
- Preserve canonical recommendation lifecycle statuses and terminal-safe failure semantics.
- Keep role/ownership boundaries unchanged for recommendation run access.

### Library and Framework Requirements

- Nuxt 4 + Vue 3 SFC patterns (`<script setup lang="ts">`) remain required.
- Continue using existing shadcn-nuxt/Reka primitive layer; avoid introducing parallel base UI libraries.
- Continue TypeScript-first typed contracts across server, Convex, and UI boundaries.
- Continue schema-first validation patterns (`zod` on route boundaries, `v.*` in Convex).

### File Structure Requirements

- Favor story-scoped additions:
  - new recommendation presentation component(s) under `app/components/workspace` or `app/components/recommendations`
  - targeted updates in recommendation API mapping and server utility contract files
  - targeted Convex schema/run payload updates for explanation metadata
  - story-scoped test additions in existing API/integration/UI test suites
- Avoid unrelated refactors in intake/admin/trust-governance surfaces.

### Testing Requirements

- API coverage for rationale + fit-signal presence and normalized schema in results payload.
- Integration coverage for downgraded/degraded semantics remaining distinct from strong-fit outputs.
- UI coverage for:
  - `data-testid="recommendation-tier-badge"` presence,
  - tier meaning readability without color-only dependence,
  - rationale/fit-signal rendering for mixed-confidence result sets.
- Reuse deterministic seed/reset test hooks for stable recommendation lifecycle setup.

### Git Intelligence Summary

- Recent delivery pattern is epic-by-epic, story-scoped increments with follow-up hardening (`2.2`, `2.3`, `2.4`) and review-fix cycles.
- Story 3.1 should preserve that pattern: targeted recommendation-domain changes, tests in lockstep, and no broad platform churn.

### Latest Tech Information

- Current repository baseline (from `package.json`):
  - `nuxt` `^4.3.1`
  - `vue` `^3.5.28`
  - `typescript` `^5.9.3`
  - `shadcn-nuxt` `^2.4.3`
  - `reka-ui` `^2.8.2`
  - `convex` `^1.32.0`
  - `better-auth` `1.4.9`
  - `zod` `3.25.76`
- Latest npm registry checks on 2026-03-05:
  - `nuxt` latest `4.3.1` (current)
  - `vue` latest `3.5.29` (patch available)
  - `typescript` latest `5.9.3` (current)
  - `shadcn-nuxt` latest `2.4.3` (current)
  - `reka-ui` latest `2.9.0` (minor available)
  - `convex` latest `1.32.0` (current)
  - `better-auth` latest `1.5.3` (minor available)
  - `zod` latest `4.3.6` (major available)
- Story guidance:
  - Keep dependency upgrades out-of-scope for Story 3.1 unless required for an implementation blocker.

### Project Context Reference

- `_bmad-output/project-context.md` applies directly for:
  - server-only third-party integration boundaries,
  - typed runtime validation patterns,
  - reuse of existing UI primitive layer,
  - recommendation-domain logic placement in `server/utils` + `convex`.

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

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1]
- [Source: _bmad-output/planning-artifacts/prd.md#Recommendation Explanation & Decision Support]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#State and Event Patterns]
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

1. Extend recommendation result contracts with rationale + fit-signal fields.
2. Persist and expose those fields through Convex and recommendation result APIs.
3. Implement tier badge + rationale rendering in workspace recommendation review UI.
4. Add API/integration/UI coverage for rationale clarity and non-color-only fit semantics.

### Stitch Retrieval Log

- Verified approved package references from story context:
  - Stitch project: `6257021077077987630`
  - Desktop screen: `3a4bf4f2083e46d89b219ab72563bf1a`
  - Mobile screen: `2d7501846dd44d8a8bc52b9742494a71`
- Implementation anchored to approved `Comparison Workspace` pair and token constraints from planning artifacts.
- External Stitch retrieval APIs/tools were not configured in this execution context; implementation followed the embedded approved handoff package.

### UI Implementation Mapping

- `recommendation-review-primary` desktop/mobile approved pair mapped to:
  - `app/components/workspace/RecommendationTierBadge.vue` for explicit tier semantics + accessible text meaning.
  - `app/components/workspace/RecommendationResultsPanel.vue` for rationale copy, fit-signal cards, caveat warnings, and composed-step rendering.
- Existing workspace composition preserved in:
  - `app/pages/workspace/index.vue`
  - `app/components/workspace/RecommendationStatusBanner.vue` (compatibility unchanged)

### Debug Log References

- `pnpm exec playwright test --project=api tests/api/recommendation-ranking.atdd.spec.ts tests/api/recommendation-qualification.atdd.spec.ts tests/integration/recommendation-ranking.integration.spec.ts tests/integration/recommendation-qualification.integration.spec.ts`
- `pnpm exec playwright test --project=chromium tests/e2e/workspace-recommendation-status.atdd.spec.ts`
- `pnpm build`

### Completion Notes List

- Added profile-aware rationale and fit-signal generation pipeline and persisted payloads through ranking, qualification, Convex storage, and results API mapping.
- Preserved canonical lifecycle statuses and failed-run safe response behavior while adding downgraded semantics for weaker candidates.
- Added reusable `RecommendationTierBadge` with stable `data-testid="recommendation-tier-badge"` hook and explicit non-color-only meaning copy.
- Upgraded recommendation results UI to show rationale, fit signals, confidence/freshness summaries, caveats, and staged-step context.
- Added and updated ATDD coverage across API, integration, and E2E layers for rationale/fit-signal contracts and tier readability.
- Corrected rationale signal generation so missing profile fields are represented as `watch` context instead of false-negative `gap` states.
- Enforced ranking safety by failing with `PROFILE_SNAPSHOT_NOT_FOUND` when profile context cannot be loaded before rationale generation.
- Activated red API/integration suites for qualification and refresh so they execute as enforceable coverage.
- Synced story file list with newly tracked refresh red test files.
- Validation run status:
  - API + integration targeted suite: 16 passed
  - Red API + integration suite: 12 passed
  - E2E targeted suite: 6 passed
  - Build: passed

### File List

- app/components/workspace/RecommendationTierBadge.vue
- app/components/workspace/RecommendationResultsPanel.vue
- app/pages/workspace/index.vue
- server/utils/recommendations/buildRecommendationRationale.ts
- server/utils/recommendations/rankRecommendationCandidates.ts
- server/utils/recommendations/generateRankedRecommendations.ts
- server/api/recommendations/runs/[runId]/results.get.ts
- convex/schema.ts
- convex/recommendationRuns.ts
- tests/support/fixtures/test-data.ts
- tests/api/recommendation-ranking.atdd.spec.ts
- tests/api/recommendation-qualification.atdd.spec.ts
- tests/integration/recommendation-ranking.integration.spec.ts
- tests/integration/recommendation-qualification.integration.spec.ts
- tests/e2e/workspace-recommendation-status.atdd.spec.ts
- tests/api/recommendation-qualification.red.atdd.spec.ts
- tests/api/recommendation-refresh.red.atdd.spec.ts
- tests/integration/recommendation-qualification.red.integration.spec.ts
- tests/integration/recommendation-refresh.red.integration.spec.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/3-1-show-recommendation-rationale-and-fit-signals.md

### Change Log

- 2026-03-06: Implemented Story 3.1 rationale/fit-signal contracts, UI rendering updates, and API/integration/E2E test coverage; moved story status to `review`.
- 2026-03-06: Applied code-review fixes for profile-context-safe rationale generation, activated red suites, synced file list, and moved story status to `done`.
