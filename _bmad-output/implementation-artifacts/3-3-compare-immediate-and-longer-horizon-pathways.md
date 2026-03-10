# Story 3.3: Compare Immediate and Longer-Horizon Pathways

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an immigration user,
I want to compare immediate and longer-horizon options in one structured view,
so that I can decide whether to pursue a direct route or a staged strategic path.

## Acceptance Criteria

1. **Given** a completed run includes more than one recommendation type **When** I enter the comparison workspace **Then** I can compare multiple recommendations in a structured format **And** the view clearly separates immediate options from longer-horizon strategic options.
2. **Given** at least one pathway is a composed or multi-step route **When** that option is displayed **Then** the product identifies it as a strategic multi-step pathway rather than a direct-fit route **And** the distinction is visible alongside direct recommendations.
3. **Given** a recommendation is blocked-but-close rather than currently available **When** I review the comparison view **Then** that state is clearly differentiated from both available-now and longer-horizon routes **And** the UI preserves the ranking context produced in Epic 2.
4. **Given** only one recommendation is available or a structured side-by-side comparison cannot be shown **When** I enter the comparison surface **Then** the product falls back to a clear structured review state instead of an empty or misleading comparison layout **And** I can still understand pathway type, ranking context, and next actions without losing orientation.

## Tasks / Subtasks

- [x] Task 1: Normalize comparison semantics for immediate, blocked, and longer-horizon recommendation buckets (AC: #1, #2, #3, #4)
  - [x] 1.1 Confirm the existing `direct`, `blocked`, and `composed` result groups remain the canonical source for comparison buckets; avoid introducing a parallel recommendation classification model.
  - [x] 1.2 Extend the run-results presentation contract only where needed so the UI can render explicit pathway-type labels, ranking context, and fallback-ready metadata without inferring trust-sensitive meaning ad hoc in Vue templates.
  - [x] 1.3 Preserve existing Epic 2 ranking order, qualification, confidence, freshness, caveat, blocker, tradeoff, and action semantics while adding comparison-oriented labels or summaries.
  - [x] 1.4 Keep direct recommendations identifiable as available-now, blocked recommendations identifiable as blocked-but-close, and composed recommendations identifiable as strategic multi-step routes with composed-step context.

- [x] Task 2: Recompose the recommendation review surface into a structured comparison workspace (AC: #1, #2, #3)
  - [x] 2.1 Refactor `app/components/workspace/RecommendationResultsPanel.vue` so desktop presents a true comparison-oriented layout and mobile preserves the same information architecture in a stacked guided sequence.
  - [x] 2.2 Reuse and compose existing story-delivered modules (`RecommendationTierBadge`, `BlockerAndTradeoffPanel`, `NextActionQueue`) instead of duplicating explanation UI logic.
  - [x] 2.3 Introduce comparison-specific domain components only where they clarify the surface, for example `RecommendationSummaryBand.vue`, `PathwayComparisonCard.vue`, and `MilestoneRoutePlanner.vue`.
  - [x] 2.4 Render explicit type framing for each candidate, including direct/available-now, blocked-but-close, and strategic multi-step labels that stay visible alongside rank and tier.

- [x] Task 3: Deliver strategic-route and fallback states without misleading empty-layout behavior (AC: #2, #4)
  - [x] 3.1 For composed recommendations, surface staged route language and `composedSteps` as an intentional longer-horizon plan, not as a weaker version of a direct recommendation.
  - [x] 3.2 When only one candidate or one candidate class is present, replace side-by-side comparison with a structured fallback review state that still shows pathway type, rank context, blockers, tradeoffs, and next actions.
  - [x] 3.3 Preserve `noComposedReason` and degraded or low-confidence caveat messaging so fallback states remain honest about missing strategic alternatives or weak evidence.
  - [x] 3.4 Keep orientation intact by making the summary state explain why comparison is limited instead of rendering a sparse or confusing workspace.

- [x] Task 4: Apply approved responsive, accessibility, and design-system constraints to the comparison workspace (AC: #1, #2, #3, #4)
  - [x] 4.1 Implement within the approved `Comparison Workspace` desktop/mobile pair and preserve information architecture parity across breakpoints.
  - [x] 4.2 Ensure pathway-type distinctions are communicated with visible text, headings, and labels, never color alone.
  - [x] 4.3 Maintain keyboard reachability, semantic sectioning, visible focus states, and `44x44px` minimum touch targets for any comparison controls or disclosure affordances.
  - [x] 4.4 Add stable test hooks for comparison-specific surfaces such as `recommendation-comparison-workspace`, `recommendation-comparison-group`, `recommendation-pathway-type-badge`, and `recommendation-comparison-fallback`.

- [x] Task 5: Add API, integration, and browser coverage for comparison semantics and fallback behavior (AC: #1, #2, #3, #4)
  - [x] 5.1 Add API tests covering pathway-type semantics, preserved rank ordering, and structured fallback metadata in recommendation results payloads.
  - [x] 5.2 Add integration tests confirming direct, blocked, and composed candidates remain clearly distinct without regressing Story 3.1 or Story 3.2 explanation modules.
  - [x] 5.3 Add E2E coverage for comparison rendering when multiple recommendation classes are present and for fallback rendering when only one option is available.
  - [x] 5.4 Reuse deterministic recommendation seed/reset hooks rather than inventing new mocking seams.

## Dev Notes

- Story 3.1 introduced rationale and fit-signal rendering. Story 3.2 introduced blocker, tradeoff, and improvement-action modules. Story 3.3 should reorganize those existing explanation modules into a clearer decision workspace instead of rebuilding them.
- Keep trust-sensitive pathway interpretation in server utilities and normalized API contracts. The Vue layer should compose already-shaped comparison semantics rather than authoring business rules.
- This story is frontend-impacting and inherits the previously approved app-level `Comparison Workspace` design package already embedded in Epic 3 stories for the same recommendation-review surface.

### UI/UX Context

- Frontend-impacting: `true`
- User-facing objective:
  - compare available-now, blocked-but-close, and strategic longer-horizon pathways in one decision surface,
  - preserve rank and trust context while making route type explicit,
  - avoid empty comparison layouts when only one option is available.
- Approved UX direction:
  - `Comparison Workspace (Desktop + Mobile Pairing)`
  - desktop keeps side-by-side decision density,
  - mobile keeps the same content logic through stacked, progressive disclosure.

### Affected Frontend Surfaces

- Surface Group `recommendation-review-primary`: the workspace recommendation review surface currently rendered by `RecommendationResultsPanel`, including summary framing, comparison grouping, pathway cards, strategic route steps, and fallback review state.

### Concept Options (3 Paired Directions Per Surface)

- Surface: `recommendation-review-primary`
  - Concept A `Progress Hub`
    - Desktop screen ID: `5853854a55e1466e979995b699bf6f4b`
    - Mobile screen ID: `644856989f9a485da113a32a267fc4b2`
    - Prompt summary: progress-oriented review that emphasizes continuity and guided re-entry while still surfacing comparison context.
  - Concept B `Comparison Workspace`
    - Desktop screen ID: `3a4bf4f2083e46d89b219ab72563bf1a`
    - Mobile screen ID: `2d7501846dd44d8a8bc52b9742494a71`
    - Prompt summary: explicit side-by-side pathway comparison with visible route-type framing, strategic-route context, and actionable next steps.
  - Concept C `Evidence & Tasks`
    - Desktop screen ID: `34bd9708e6764ade9b02545731f6af4c`
    - Mobile screen ID: `a8bbe3f9604543ab8e6f4eddb64d493b`
    - Prompt summary: trust-and-action-heavy review emphasizing evidence, caveats, and execution tasks around each option.

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
  - Use screen-derived mapping into existing workspace and recommendation domain components during implementation.
- Approved concept labels:
  - `Comparison Workspace`
- Selected variant labels:
  - `Comparison Workspace (Desktop + Mobile Pairing)`
- Prompt summary:
  - Keep pathway types visually separable, show direct versus multi-step route framing explicitly, preserve trust context, and support a truthful fallback state when side-by-side comparison is limited.
- Design context source:
  - `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `_bmad-output/planning-artifacts/DESIGN.md`
- Token artifact references:
  - `_bmad-output/planning-artifacts/design-tokens.json`
  - `_bmad-output/planning-artifacts/design-tokens.css`
- Pair approval rationale:
  - The approved app-level UX direction already selected `Comparison Workspace` as the decision-support baseline for Epic 3 recommendation review, and this story extends the same surface rather than introducing a new frontend surface group.
- Supporting screenshot/code references:
  - Stitch IDs listed above
  - `app/components/workspace/RecommendationResultsPanel.vue`
  - `app/components/recommendations/BlockerAndTradeoffPanel.vue`
  - `app/components/recommendations/NextActionQueue.vue`

### Approved Variant Decision

- Surface: `recommendation-review-primary`
  - Approved concept: `Comparison Workspace`
  - Approved desktop/mobile pair:
    - Desktop: `3a4bf4f2083e46d89b219ab72563bf1a`
    - Mobile: `2d7501846dd44d8a8bc52b9742494a71`
  - Approval rationale:
    - best matches Epic 3 comparison requirements,
    - preserves multi-column decision support on desktop,
    - supports progressive disclosure on mobile,
    - cleanly accommodates strategic-route and fallback states without changing the approved information architecture.

### Design Tokens / System Constraints

- Use the approved `Comparison Workspace` token language from planning artifacts:
  - trust/action emphasis: `--trust`, `--primary`
  - confidence and caution semantics: `--confidence-high`, `--confidence-medium`, `--confidence-low`, `--warning`, `--warning-soft`
  - destructive/high-risk emphasis: `--destructive`, `--destructive-soft`
- Preserve `Public Sans` typography, the 8px spacing scale, and calm card-driven comparison surfaces.
- Keep the logic of `available now`, `blocked but close`, and `longer-horizon path` visually separable through headings, badges, layout grouping, and text labels.
- Do not hide strategic-route context or fallback explanations behind inaccessible patterns on mobile.

### Stitch Retrieval Instructions

1. Set workspace project to `6257021077077987630`.
2. Fetch the approved baseline screens first:
   - desktop `3a4bf4f2083e46d89b219ab72563bf1a`
   - mobile `2d7501846dd44d8a8bc52b9742494a71`
3. Use those screens as the implementation baseline for:
   - comparison grouping,
   - top summary framing,
   - route-type labeling,
   - strategic-route step presentation,
   - fallback review composition.
4. Reuse supporting concept screens only when they clarify composition details, but keep final implementation anchored to the approved `Comparison Workspace` pair.
5. Use `stitch-vue-components` for Vue SFC mapping and `stitch-shadcn-vue` for primitive alignment if additional Stitch-to-code translation is needed during `dev-story`.

### Referenced UX Artifacts

- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/DESIGN.md`
- `_bmad-output/planning-artifacts/design-tokens.json`
- `_bmad-output/planning-artifacts/design-tokens.css`

### Project Structure Notes

- Primary expected touch points:
  - `app/components/workspace/RecommendationResultsPanel.vue`
  - `app/components/workspace/RecommendationTierBadge.vue`
  - `app/components/recommendations/BlockerAndTradeoffPanel.vue`
  - `app/components/recommendations/NextActionQueue.vue`
  - `app/pages/workspace/index.vue`
  - `server/api/recommendations/runs/[runId]/results.get.ts` if explicit comparison-facing labels or fallback metadata are added at the API boundary
  - `server/utils/recommendations/rankRecommendationCandidates.ts` only if comparison labeling requires rank-preserving shared helpers
  - `server/utils/recommendations/buildRecommendationRationale.ts` only if route-type copy needs server-owned explanation text
- Likely new components aligned with approved UX component strategy:
  - `app/components/recommendations/RecommendationSummaryBand.vue`
  - `app/components/recommendations/PathwayComparisonCard.vue`
  - `app/components/recommendations/MilestoneRoutePlanner.vue`
- Preferred new test files:
  - `tests/api/recommendation-comparison.atdd.spec.ts`
  - `tests/integration/recommendation-comparison.integration.spec.ts`
  - `tests/e2e/workspace-recommendation-comparison.atdd.spec.ts`
- Avoid inventing a new compare endpoint unless the existing results contract proves insufficient; the current codebase already treats `results.get.ts` as the browser-facing review payload.

### Technical Requirements

- Preserve Epic 2 ranking context while making route type explicit in the review surface.
- Direct recommendations must read as available-now options.
- Blocked recommendations must read as blocked-but-close options.
- Composed recommendations must read as strategic multi-step routes and preserve `composedSteps` visibility.
- Comparison fallback states must remain informative instead of implying missing recommendations or broken rendering.
- Existing rationale, fit-signal, blocker, tradeoff, action, confidence, freshness, and caveat modules must remain intact.

### Architecture Compliance

- Keep Nuxt server routes as the browser-facing boundary for recommendation result data.
- Keep trust-sensitive interpretation logic in `server/utils` and `convex`, not inside Vue templates.
- Preserve canonical lifecycle statuses `queued`, `evaluating`, `completed`, `degraded`, and `failed`.
- Maintain normalized, provider-agnostic contracts and do not mix raw provider response shapes into UI code.
- Reuse the brownfield recommendation review surface instead of introducing a parallel route or shell.

### Library and Framework Requirements

- Continue with Nuxt `4.3.1` and Vue `3.5.x` SFC patterns using `<script setup lang="ts">`.
- Reuse the existing shadcn-nuxt/Reka primitive layer and current Tailwind token usage.
- Keep TypeScript-first contracts across API, server utilities, Convex, and UI layers.
- Keep validation and normalization at the server boundary where semantics become user-facing.

### File Structure Requirements

- Comparison presentation stays in `app/components/workspace` and `app/components/recommendations`.
- Browser-facing data shaping remains in `server/api/recommendations/runs/[runId]/results.get.ts`.
- Shared recommendation-domain logic remains in `server/utils/recommendations/*`.
- Persisted recommendation run state remains in `convex/recommendationRuns.ts` and `convex/schema.ts` only if a real schema gap exists.
- Story-scoped test coverage belongs in existing `tests/api`, `tests/integration`, and `tests/e2e` recommendation suites.

### Testing Requirements

- Add API coverage for route-type semantics and rank-preserving comparison payloads.
- Add integration coverage for mixed direct/blocked/composed result sets and single-option fallback behavior.
- Add E2E coverage for:
  - explicit direct versus strategic route labeling,
  - structured group separation,
  - comparison fallback rendering,
  - preservation of blocker/tradeoff/action modules within the new layout.
- Reuse deterministic seed/reset hooks and avoid live third-party dependencies.

### Previous Story Intelligence

- Story 3.2 already extracted `BlockerAndTradeoffPanel` and `NextActionQueue`; Story 3.3 should reuse those modules as building blocks for the comparison workspace.
- Story 3.2 extended `RecommendationResultsPanel.vue`, `app/pages/workspace/index.vue`, `server/api/recommendations/runs/[runId]/results.get.ts`, `convex/recommendationRuns.ts`, and `server/utils/recommendations/*`; review those changes before introducing new abstractions.
- Story 3.1 and Story 3.2 both anchored to the same approved `Comparison Workspace` design package. Maintain continuity rather than selecting a new variant.
- Story 3.2 regression coverage already exists for recommendation explanations in API, integration, and E2E layers. Extend those patterns instead of starting a new test harness.

### Git Intelligence Summary

- Recent implementation pattern on `dev` is story-scoped feature work merged from feature branches into `dev`, followed by review hardening when needed.
- Latest relevant commits:
  - `aa585a7` merged Story 3.2 into `dev`
  - `c9b9840` implemented Story 3.2 explanation-module and UI work
- Story 3.2 changed the exact recommendation review files Story 3.3 is likely to extend, so start from those touched files before adding new ones.

### Latest Tech Information

- Current repository baseline from `package.json`:
  - `nuxt` `^4.3.1`
  - `vue` `^3.5.28`
  - `typescript` `^5.9.3`
  - `convex` `^1.32.0`
  - `better-auth` `1.4.9`
  - `reka-ui` `^2.8.2`
  - `zod` `3.25.76`
  - `shadcn-nuxt` `^2.4.3`
- Latest npm registry versions checked on 2026-03-09:
  - `nuxt` `4.3.1` (current)
  - `vue` `3.5.29` (patch available)
  - `typescript` `5.9.3` (current)
  - `convex` `1.32.0` (current)
  - `better-auth` `1.5.4` (minor available)
  - `reka-ui` `2.9.0` (minor available)
  - `zod` `4.3.6` (major available)
  - `shadcn-nuxt` `2.4.3` (current)
- Story guidance:
  - keep dependency upgrades out of Story 3.3 scope unless an implementation blocker requires them.

### Project Context Reference

- `_bmad-output/project-context.md` applies directly:
  - pages and components must call local Nuxt APIs, not third-party providers,
  - shared app code should use the existing aliases and primitive layer,
  - validation and trust-sensitive interpretation stay server-side,
  - avoid introducing parallel auth, UI, or data-access abstractions.

### Story Completion Status

- Story context quality review status: complete
- Frontend-impacting classification: `true`
- Approved design handoff package: embedded and complete
- Approved desktop/mobile pair per impacted surface: satisfied via previously approved app-level UX direction
- Three concept directions per impacted surface: documented
- Ready-for-dev gate: satisfied
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.
- Completion note: Frontend design packaging complete - approved Stitch design package embedded in story file.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

1. Audit Story 3.1 and Story 3.2 recommendation review changes and confirm what comparison semantics already exist in the results contract.
2. Decide whether comparison labels belong in `results.get.ts` or can be derived safely in a shared presentation helper without moving trust logic into the template.
3. Recompose `RecommendationResultsPanel` into the approved comparison workspace while reusing `RecommendationTierBadge`, `BlockerAndTradeoffPanel`, and `NextActionQueue`.
4. Add strategic-route and fallback states, then cover them with story-scoped API, integration, and E2E tests.

### Stitch Retrieval Log

- Approved Stitch project and screen pair inherited from Epic 3 UX approval:
  - Project: `6257021077077987630`
  - Desktop: `3a4bf4f2083e46d89b219ab72563bf1a`
  - Mobile: `2d7501846dd44d8a8bc52b9742494a71`
- Implementation should anchor to the approved `Comparison Workspace` pair for all comparison and fallback states.

### UI Implementation Mapping

- `recommendation-review-primary` maps to:
  - `RecommendationResultsPanel` as the top-level comparison workspace container
  - existing `RecommendationTierBadge` for tier semantics
  - existing `BlockerAndTradeoffPanel` and `NextActionQueue` for decision detail modules
  - optional `RecommendationSummaryBand`, `PathwayComparisonCard`, and `MilestoneRoutePlanner` extractions for layout clarity
- Keep the same information architecture on desktop and mobile while changing only composition.

### Debug Log References

- Historical implementation log only; the commands below were not rerun in the current container because `node`, `npm`, and `pnpm` are unavailable here.
- `PLAYWRIGHT_REUSE_SERVER=true BASE_URL=http://127.0.0.1:3200 pnpm exec playwright test --project=api tests/api/recommendation-comparison.atdd.spec.ts tests/integration/recommendation-comparison.integration.spec.ts`
- `PLAYWRIGHT_REUSE_SERVER=true BASE_URL=http://127.0.0.1:3200 pnpm exec playwright test --project=chromium tests/e2e/workspace-recommendation-comparison.atdd.spec.ts`
- `PLAYWRIGHT_REUSE_SERVER=true BASE_URL=http://127.0.0.1:3200 pnpm exec playwright test --project=api tests/api/recommendation-explanations.atdd.spec.ts tests/integration/recommendation-explanations.integration.spec.ts`
- `PLAYWRIGHT_REUSE_SERVER=true BASE_URL=http://127.0.0.1:3200 pnpm exec playwright test --project=chromium tests/e2e/workspace-recommendation-explanations.atdd.spec.ts`
- `pnpm exec nuxi typecheck` previously logged existing repo issues outside Story 3.3 scope, including missing UI deps (`@internationalized/date`, `@unovis/vue`, `@convex-vue/core`) and existing server/auth typing mismatches.

### Completion Notes List

- Added server-owned comparison metadata so the browser-facing results contract now carries pathway-type labels plus workspace versus fallback framing without introducing a parallel classification model.
- Rebuilt `RecommendationResultsPanel` into a comparison workspace that reuses existing blocker/tradeoff/action modules and adds `RecommendationSummaryBand`, `PathwayComparisonCard`, and `MilestoneRoutePlanner`.
- Updated shared browser test mocks to carry the current server-owned `comparison` and `pathwayType` metadata instead of deriving trust-sensitive defaults in the client layer.
- Added Story 3.3 API, integration, and E2E coverage plus shared mock updates so Story 3.2 explanation surfaces keep the current recommendation-results contract after the recomposition.
- Applied code-review follow-up fixes by removing client-side comparison/pathway-type inference, reprioritizing mobile card content, and tightening AC3 coverage across API/integration tests.
- Removed stray `*.red.*` explanation artifacts that were not part of Story 3.3 scope and updated shared E2E mocks to use the current server-owned results contract.
- Reconciled remaining drift by collapsing redundant `.gitignore` Playwright temp entries and updating the Story 3.2 ATDD checklist so it references the maintained explanation suites instead of deleted red-only files.
- Applied a fourth code-review pass to preserve structured fallback rendering for failed runs, make mobile disclosure IDs unique, remove fabricated citation freshness timestamps, and align shared mock contracts with the current results shape.
- Applied a fifth code-review pass to remove synthetic citation/trust fallback generation, restore ESM-safe comparison test factories, correct zero-result fallback copy, preserve degraded-path rank ordering, and split citation disclosure from external source navigation for keyboard-safe accessibility.
- Validation remains pending in this container because `node`, `npm`, and `pnpm` are unavailable, so follow-up status stays `in-progress` until the logged suites can be rerun.

### File List

- `_bmad-output/implementation-artifacts/3-3-compare-immediate-and-longer-horizon-pathways.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/test-artifacts/atdd-checklist-3-2.md`
- `.gitignore`
- `app/components/recommendations/MilestoneRoutePlanner.vue`
- `app/components/recommendations/PathwayComparisonCard.vue`
- `app/components/recommendations/EvidenceConfidencePanel.vue`
- `app/components/recommendations/RecommendationCitationList.vue`
- `app/components/recommendations/RecommendationSummaryBand.vue`
- `app/components/workspace/RecommendationResultsPanel.vue`
- `app/lib/recommendations/comparison.ts`
- `app/lib/recommendations/citations.ts`
- `app/pages/workspace/index.vue`
- `server/api/recommendations/runs/[runId]/results.get.ts`
- `server/utils/recommendations/buildRecommendationCitations.ts`
- `server/utils/recommendations/buildRecommendationComparison.ts`
- `server/utils/recommendations/classifyTrustBoundary.ts`
- `tests/api/build-recommendation-comparison.spec.ts`
- `tests/api/recommendation-comparison.atdd.spec.ts`
- `tests/e2e/workspace-recommendation-comparison.atdd.spec.ts`
- `tests/e2e/workspace-recommendation-citations.atdd.spec.ts`
- `tests/e2e/workspace-recommendation-explanations.atdd.spec.ts`
- `tests/e2e/workspace-recommendation-status.atdd.spec.ts`
- `tests/integration/recommendation-citations.integration.spec.ts`
- `tests/integration/recommendation-comparison.integration.spec.ts`
- `tests/support/fixtures/factories/recommendation-citations-factory.ts`
- `tests/support/fixtures/factories/recommendation-comparison-factory.ts`
- `tests/support/fixtures/test-data.ts`

### Senior Developer Review (AI)

- 2026-03-09: Review follow-up fixes applied; story moved to `in-progress` pending validation rerun.
- Removed client-side comparison/pathway-type fallback logic so the Vue layer now depends on the server-owned recommendation contract.
- Reworked mobile comparison cards to prioritize strategic route framing, next actions, blockers/tradeoffs, and trust context before optional fit-signal disclosure.
- Expanded Story 3.3 API/integration assertions so blocked-but-close candidates are verified alongside direct and strategic multi-step pathways.
- Removed stray Story 3.2 `red` explanation artifacts from the working set and updated shared E2E mocks to include `comparison` and `pathwayType` metadata.
- Reconciled `.gitignore` and `_bmad-output/test-artifacts/atdd-checklist-3-2.md` so the workspace no longer points at deleted red-only explanation files.
- 2026-03-09: Second code review — 4 HIGH and 4 MEDIUM issues found and fixed:
  - H1: Added `comparison` metadata to the failed-run early-return in `results.get.ts`.
  - H2: Exported types from `buildRecommendationComparison.ts`; API route now imports shared types instead of redeclaring them.
  - H3: Collapsed duplicated workspace/fallback template blocks in `RecommendationResultsPanel.vue` into a single block with conditional class.
  - H4: Added 12 unit tests in `tests/api/build-recommendation-comparison.spec.ts` for core comparison and pathway-type logic.
  - M1: Noted architectural duplication between test factory `createRecommendationComparisonMetadata` and server `buildRecommendationComparison`.
  - M2: Fixed misleading fallback limitation message to differentiate single-class-multiple-candidates from single-candidate scenarios.
  - M3: Added TODO comment in `MilestoneRoutePlanner.vue` to keep step labels in sync with MVP pathway catalog.
  - M4: Added CSS variable fallbacks across 4 Vue components so UI remains visible without design tokens loaded.
- 2026-03-09: Third code review — 4 HIGH, 4 MEDIUM, and 2 LOW issues found and fixed:
  - H1: Removed client-side early return for `failed` runs in `index.vue` so server-owned comparison metadata reaches the UI.
  - H2: Made `blockers`, `tradeoffs`, `improvementActions` required arrays in `comparison.ts` to match the server contract.
  - H3: Added cross-reference comments between server types in `results.get.ts` and client mirror in `comparison.ts`.
  - H4: Replaced duplicated `createRecommendationComparisonMetadata` in test factory with delegation to the canonical server `buildRecommendationComparison` function.
  - M1: Added `normalizeComposedSteps` defensive normalizer in `results.get.ts` to match the pattern used for blockers/tradeoffs/improvementActions.
  - M2: Improved `humanizeStep` in `MilestoneRoutePlanner.vue` to produce sentence-cased fallback labels for unknown step IDs.
  - M3: Noted E2E test mock duplication across `workspace-recommendation-explanations.atdd.spec.ts` and `workspace-recommendation-status.atdd.spec.ts` as an architectural item for future consolidation.
  - M4: Updated `RecommendationResultsPanel.vue` to render recommendation cards in a flat layout when comparison metadata is missing, instead of hiding all results.
  - L1: Removed unused `getBaseUrl` import and dead `recommendationComparisonAuthTestUser` constant from test factory.
  - L2: Added `aria-controls` and list `id` to the mobile fit-signals disclosure widget in `PathwayComparisonCard.vue`.
- 2026-03-09: Fourth code review — 1 HIGH and 4 MEDIUM issues fixed:
  - H1: `RecommendationResultsPanel.vue` now renders a structured fallback summary for failed runs even when no ranked candidates are returned.
  - M1: `PathwayComparisonCard.vue` now generates unique mobile fit-signal disclosure IDs from type, pathway ID, and rank.
  - M2: `results.get.ts` no longer fabricates citation retrieval timestamps, so freshness falls back to `unknown` instead of a misleading fixed date.
  - M3: Shared comparison factories and Story 3.2 E2E mocks now include `citations` and `trustBoundary` fields to match the browser-facing contract.
  - M4: Story and sprint tracking were resynced so Story 3.3 stays `in-progress` pending validation and Story 3.4 no longer appears falsely complete.
- 2026-03-09: Fifth code review — 2 HIGH and 4 MEDIUM issues fixed:
  - H1: `tests/support/fixtures/factories/recommendation-comparison-factory.ts` now uses an ESM-safe static import for `buildRecommendationComparison`, so comparison-dependent Playwright suites no longer depend on `require(...)` inside an ESM package.
  - H2: `server/api/recommendations/runs/[runId]/results.get.ts` now preserves provenance honestly by only returning stored citations and by deriving fallback trust boundaries from actual normalized citation presence instead of synthesizing evidence references in the API route.
  - M1: `server/utils/recommendations/buildRecommendationComparison.ts` now differentiates zero-result fallback copy from single-candidate fallback copy, and `tests/api/build-recommendation-comparison.spec.ts` now asserts the truthful zero-result behavior.
  - M2: `RecommendationResultsPanel.vue` now rank-sorts the degraded flat-layout fallback path so rank context remains stable when comparison metadata is missing.
  - M3: `RecommendationCitationList.vue` now uses a real disclosure button plus a separate source link instead of nesting an anchor inside a `role="button"` container.
  - M4: Story 3.4 worktree files remain out of scope for Story 3.3 implementation and review; they were left untouched and are explicitly excluded from this story record.

## Change Log

- 2026-03-09: Applied code-review fixes for Story 3.3 by removing client-side comparison inference, improving mobile comparison disclosure flow, expanding AC3 coverage, and synchronizing review documentation/status.
- 2026-03-09: Reconciled remaining drift in `.gitignore` and the Story 3.2 ATDD checklist after the red-only explanation artifacts were removed.
- 2026-03-09: Second code review applied 8 fixes (H1–H4, M1–M4): failed-run comparison metadata, type export consolidation, template deduplication, unit test coverage, fallback limitation clarity, step-label sync TODO, and CSS variable fallbacks.
- 2026-03-09: Third code review applied 10 fixes (H1–H4, M1–M4, L1–L2): failed-run result fetching, type contract alignment, cross-ref comments, test factory server delegation, composedSteps normalizer, step label fallback, fallback rendering recovery, unused imports cleanup, and aria-controls accessibility.
- 2026-03-09: Fourth code review applied 5 fixes (H1, M1–M4): zero-result failed-run fallback rendering, unique fit-signal disclosure IDs, unknown citation freshness fallback, shared mock contract alignment, and sprint/story resynchronization.
- 2026-03-09: Fifth code review applied 6 fixes (H1–H2, M1–M4): ESM-safe comparison factory imports, removal of synthetic citation/trust fallbacks, truthful zero-result fallback copy, degraded-path rank sorting, citation disclosure accessibility restructuring, and review-scope clarification for unrelated Story 3.4 worktree files.
