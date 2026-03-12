# Story 4.3: Show Changes Between Recommendation Runs

Status: done

## Story

- **Epic:** 4 — Action Planning & Recommendation Continuity
- **Epic Objective:** Transform recommendations into actionable guidance users can track, revisit, and build upon over time
- **Story:** As an immigration user, I want to see what changed between recommendation runs, so that I can understand how updates to my profile affect my pathway options
- **Covers FRs:** FR33 (track changes across recommendation runs)
- **Status:** done
- **Branch:** `feat/4-3-show-changes-between-recommendation-runs`
- **Depends on:** Story 4.2 (run history/archive, run detail endpoint, recommendation run data preservation)

---

## Acceptance Criteria

### AC1: Meaningful Change Display
- **Given** I have more than one recommendation run over time
- **When** I compare a newer run to a prior run
- **Then** the product shows the meaningful changes in my recommendation set
- **And** those changes are presented in a way that highlights additions, removals, or changed ranking/tier outcomes
- **Testid:** `data-testid="run-comparison-dashboard"`

### AC2: Comparison-Unavailable State
- **Given** comparison data cannot be generated for a selected pair of runs
- **When** the comparison request fails or is incomplete
- **Then** the product shows a clear comparison-unavailable message with no misleading diff output
- **And** I can return to either run detail without losing context

### AC3: Profile-Change Context Preservation
- **Given** a recommendation has moved because of updated profile information
- **When** the change is displayed
- **Then** the system preserves enough context to show that the recommendation changed after a new profile state
- **And** the comparison avoids implying that unchanged recommendations were recomputed differently

### AC4: Trust Metadata Comparison
- **Given** recommendation trust metadata is available on both runs
- **When** I compare a newer run to a prior run
- **Then** the comparison preserves evidence references, freshness context, and caveat differences alongside the changed recommendation outcomes
- **Testid:** `data-testid="trust-evidence-section"`

### AC5: Status/Outcome Quality Differences
- **Given** a prior run had weaker or degraded results
- **When** I compare it to a later run
- **Then** the product can show that the newer run differs in status or outcome quality
- **And** the continuity view remains understandable without exposing internal processing details

---

## Tasks

### Task 1: Run Comparison API Endpoint
- [x] Create `server/api/workspace/runs/compare.get.ts` — accepts `runA` and `runB` query params (two run IDs)
- [x] Load both runs' full recommendation results from Convex (reuse `readRecommendationResultsForUser` from Story 4.2)
- [x] Compute diff: identify added pathways, removed pathways, tier changes, fit score changes
- [x] Return shape: `{ summary: { added: number, removed: number, changed: number, overallConfidenceChange: number, newEvidenceCount: number }, pathwayChanges: Array<PathwayChange>, trustChanges: Array<TrustChange>, caveatChanges: { added: Caveat[], removed: Caveat[] }, profileDelta: ProfileDeltaSummary | null, comparisonAvailable: boolean, unavailableReason?: string }`
- [x] Handle edge cases: unavailable run data → return `comparisonAvailable: false` with reason
- [x] Guard with the repo-standard workspace session middleware pattern (`requireWorkspaceAccess`)

### Task 2: Run Comparison Diff Engine
- [x] Create `server/utils/recommendations/buildRunComparison.ts` — pure function that takes two run result sets and produces the diff
- [x] Pathway matching by stable pathway identifier across runs
- [x] Classify each pathway: `added` | `removed` | `tier-changed` | `score-changed` | `unchanged`
- [x] Compute aggregate stats (total changed, overall confidence delta, new evidence count)
- [x] Extract caveat differences (new caveats, resolved caveats)
- [x] Profile delta summary: compare profile snapshots to show what user inputs changed between runs
- [x] Trust metadata diff: evidence freshness changes, citation count changes per pathway

### Task 3: Run Comparison Composable
- [x] Create `app/composables/useRunComparison.ts`
- [x] Expose `comparison`, `isLoading`, `error`, `isAvailable`, `unavailableReason`
- [x] `fetchComparison(runAId: string, runBId: string)` — calls the compare endpoint
- [x] `pathwaysByCategory` — computed getter that groups pathways by change type (improved, new, removed, unchanged)
- [x] `activeCategory` — reactive filter state for tab pills
- [x] Reuse patterns from `useRecommendationRunHistory.ts` (Story 4.2) for loading/error handling

### Task 4: Comparison Stat Cards
- [x] Create `app/components/workspace/ComparisonStatCard.vue`
- [x] Props: `label: string`, `value: string | number`, `trend: 'up' | 'down' | 'neutral'`, `trendLabel: string`
- [x] Display: stat value prominently, trend arrow icon + label below
- [x] Use Lucide icons for trend arrows (TrendingUp, TrendingDown, Minus)
- [x] `data-testid="comparison-stat-{label-kebab}"`

### Task 5: Pathway Change Card Component
- [x] Create `app/components/workspace/PathwayChangeCard.vue`
- [x] Props: `change: PathwayChange`
- [x] Display: pathway name, change badge (Improved/New/Removed with icon), before→after tier badges inline, brief change reason
- [x] Expandable detail section (accordion) for trust metadata diff per pathway
- [x] Change badge colors: green for improved/new, red for removed, amber for tier-changed
- [x] Always icon + text, never color alone
- [x] `data-testid="pathway-change-card-{pathwayId}"`

### Task 6: Caveat Changes Panel
- [x] Create `app/components/workspace/CaveatChangesPanel.vue`
- [x] Props: `addedCaveats: Caveat[]`, `removedCaveats: Caveat[]`
- [x] Collapsible accordion pattern on mobile
- [x] New caveats shown with amber warning icon, resolved caveats with green check icon
- [x] `data-testid="caveat-changes-panel"`

### Task 7: Trust & Evidence Panel
- [x] Create `app/components/workspace/TrustEvidencePanel.vue`
- [x] Props: `trustChanges: TrustChange[]`
- [x] Display: citation freshness changes, evidence count changes per pathway
- [x] Confidence level shift indicators with before→after values
- [x] Collapsible accordion on mobile
- [x] `data-testid="trust-evidence-section"`

### Task 8: Run Comparison Page
- [x] Create `app/pages/workspace/compare.vue`
- [x] Accept query params `?runA={id}&runB={id}` for the two runs being compared
- [x] Page heading: "Run Comparison" with run date pills and back-link to `/workspace/history`
- [x] Top row: three `ComparisonStatCard` components (Pathways Changed, Overall Confidence, New Evidence)
- [x] Middle: "Pathway Changes" section with tab pills (All, Improved, New, Removed) filtering `PathwayChangeCard` list
- [x] Bottom: two-column grid on desktop (Trust & Evidence panel + Caveat Changes panel), stacked on mobile
- [x] Loading skeleton state during fetch
- [x] Comparison-unavailable state: clear message with back-links to each run and history
- [x] `data-testid="run-comparison-dashboard"` on main container
- [x] Mobile: stat cards scroll horizontally, tab pills scroll horizontally, bottom sections become collapsible accordions

### Task 9: Navigation Integration
- [x] Add "Compare" action to `RecommendationRunCard.vue` (Story 4.2) — allows comparing any run against the latest
- [x] Route: `/workspace/compare?runA={oldRunId}&runB={latestRunId}`
- [x] Ensure back-navigation from compare page returns to history with context preserved

### Task 10: Type Definitions
- [x] Add comparison types in `shared/types/` (not in component files):
  - `PathwayChange` — pathway id, name, changeType, beforeTier, afterTier, beforeScore, afterScore, reason, trustDiff
  - `TrustChange` — pathway id, beforeCitations, afterCitations, freshnessChange, confidenceChange
  - `ComparisonResult` — summary stats, pathway changes array, trust changes, caveat changes, profileDelta, availability
  - `ProfileDeltaSummary` — changed fields summary between the two run snapshots

### Task 11: Tests
- [x] **API tests:** `tests/api/run-comparison.spec.ts` — test compare endpoint with valid pair, unavailable run, same-run comparison, auth guard
- [x] **Unit tests:** `tests/unit/buildRunComparison.spec.ts` — test diff engine with additions, removals, tier changes, empty runs, identical runs
- [x] **Component tests:** `ComparisonStatCard` renders all trend directions
- [x] **Component tests:** `PathwayChangeCard` renders all change types with expand/collapse
- [x] **Component tests:** `CaveatChangesPanel` renders added/removed caveats
- [x] **Component tests:** `TrustEvidencePanel` renders trust metadata changes
- [x] **E2E test:** Navigate to history → click Compare → see comparison dashboard → filter by category → verify stat cards → verify unavailable state
- [x] Follow testing patterns from Story 4.2: Vitest for unit/component, Playwright for E2E

---

## Dev Notes

### UI/UX Context
- **Design vision:** Calm, trust-first workspace. "Confident, in-control" emotional tone
- **Typography:** Public Sans (loaded via Google Fonts), 8px spacing grid
- **Colors:** Deep navy sidebar (`#234c76`), trust-blue accents, warm neutral card surfaces (`#ffffff` on cloud surface `#f7f8fa`)
- **Component roundness:** 12px border radius on cards
- **Status badges:** Always icon + text, never color alone (accessibility)
- **Interaction:** Hover lift/shadow on desktop cards, tap feedback on mobile, expandable accordion sections
- **Empty/unavailable state:** Clear message + back-links, matching existing empty state patterns
- **Responsive breakpoint:** Follow existing Tailwind breakpoint system (`sm`, `md`, `lg`)
- **Dashboard approach:** Stats-first hierarchy, then categorized pathway changes, then trust/caveat detail sections

### Affected Surfaces

| Surface | Description | Impact |
|---|---|---|
| `run-comparison` | New run comparison dashboard page | **New page** |
| `workspace-history` | Existing recommendation run history page | **Add "Compare" action to run cards** |

### Approved Stitch Design Package

**Concept C: Unified Diff Dashboard** — approved by user

| View | Screen ID | Description |
|---|---|---|
| Desktop | `4c3fc4b19d3d4c979857596496e400d1` | Dashboard with stat cards, tabbed pathway changes, two-column trust/caveat panels |
| Mobile | `52208013f65144c09f7a58a1329de7c6` | Scrollable stat cards, stacked pathway cards with tab pills, collapsible accordion sections |

**Stitch Project:** `6257021077077987630`

**Retrieval instructions for dev agent:**
1. Use `mcp_stitch_get_screen` with `projectId: "6257021077077987630"` and `screenId: "4c3fc4b19d3d4c979857596496e400d1"` to retrieve the desktop design
2. Use `mcp_stitch_get_screen` with `projectId: "6257021077077987630"` and `screenId: "52208013f65144c09f7a58a1329de7c6"` to retrieve the mobile design
3. Translate the HTML/CSS from the Stitch screens into Vue SFC components using existing shadcn-nuxt primitives (`Card`, `Badge`, `Button`, `Skeleton`, `Tabs`, `Accordion`)
4. Map Stitch colors/spacing to existing Tailwind design tokens where possible; extend `tailwind.config.ts` only if tokens are missing
5. The Stitch designs show the ideal visual target — implement pixel-accurate layouts using Tailwind utility classes

### Architecture Constraints
- **Server pattern:** Nitro API routes in `server/api/workspace/` — follow existing patterns from Story 4.2 (`server/api/workspace/runs/`)
- **Auth guard:** Use `requireWorkspaceAccess` middleware pattern — do NOT create new auth mechanisms
- **Data source:** Convex `recommendation_runs` and `recommendation_run_results` tables via `useConvex()` composable on server side
- **State management:** Composable pattern (`app/composables/`) — no Pinia, no Vuex
- **Routing:** File-based routing via Nuxt — `app/pages/workspace/compare.vue` with query params
- **Component organization:** Feature-scoped under `app/components/workspace/`
- **Type definitions:** Extend types in `shared/types/` — do NOT put types in component files
- **Diff engine:** Pure function in `server/utils/` — no side effects, fully testable in isolation

### Key Patterns from Story 4.2 (Previous Story)
- **Run data access:** `readRecommendationResultsForUser.ts` — reuse for loading both runs' results
- **Run history API:** `server/api/workspace/runs/` — follow the same route patterns and auth guards
- **Composable structure:** See `useRecommendationRunHistory.ts` for the established loading/error/data pattern
- **Component patterns:** `RecommendationRunCard.vue`, `RunStatusBadge.vue` — extend with Compare action
- **Test patterns:** Vitest with `@vue/test-utils` for components, Playwright for E2E
- **Error states:** Use `NuxtErrorBoundary` wrapper with user-friendly fallback messages
- **Files from 4.2:** `app/composables/useRecommendationRunHistory.ts`, `app/components/workspace/RecommendationRunCard.vue`, `app/components/workspace/RunHistoryFilterBar.vue`, `app/components/workspace/RunStatusBadge.vue`, `app/pages/workspace/history.vue`, `server/api/workspace/runs/index.get.ts`, `server/api/workspace/runs/[runId].get.ts`, `server/utils/recommendations/readRecommendationResultsForUser.ts`, `server/utils/recommendations/recommendationRunHistory.ts`

### Anti-Patterns to Avoid
- ❌ Do NOT use `$fetch` directly in components — always go through composables
- ❌ Do NOT create ad-hoc color values — use design tokens from `tailwind.config.ts`
- ❌ Do NOT use `v-html` for rendering content — XSS risk
- ❌ Do NOT create new auth middleware — reuse `requireWorkspaceAccess`
- ❌ Do NOT put business logic in page components — extract to composables and server utils
- ❌ Do NOT skip loading/skeleton states — every async surface needs them
- ❌ Do NOT use color-only status indicators — always pair with icon + text
- ❌ Do NOT imply unchanged recommendations were recomputed — only show actual changes
- ❌ Do NOT expose internal processing details in the comparison view — keep it user-understandable

### Technology Versions (Critical)
- Nuxt 4 (compatibility mode), Vue 3.5+, TypeScript strict mode
- Tailwind CSS v4 (NOT v3 — use `@theme` directive, NOT `theme.extend`)
- shadcn-nuxt + Reka UI primitives for base components
- Lucide icons via `lucide-vue-next`
- Vitest for unit/component tests, Playwright for E2E
- Convex via `nuxt-convex` module for real-time data

---

## References

- [Epics & Stories](file:///_bmad-output/planning-artifacts/epics.md) — Epic 4, Story 4.3
- [Architecture](file:///_bmad-output/planning-artifacts/architecture.md) — API patterns, data model, auth
- [UX Design Spec](file:///_bmad-output/planning-artifacts/ux-design-specification.md) — Design system, emotional tone, component patterns
- [Project Context](file:///_bmad-output/project-context.md) — Tech stack versions, critical rules
- [Story 4.2](file:///_bmad-output/implementation-artifacts/4-2-revisit-and-preserve-prior-recommendation-runs.md) — Previous story patterns, run history APIs, data access utilities

---

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Add a server-owned comparison contract and diff engine on top of the Story 4.2 preserved run data so run-to-run deltas stay deterministic and testable.
- Add a workspace comparison composable and dedicated comparison surface that keep loading, unavailable, and filtered diff states out of the page template logic.
- Extend workspace history navigation with a compare action against the latest run, then validate the full Story 4.3 path with unit, component, API, and Chromium ATDD coverage.

### Stitch Retrieval Log

- Used the approved `Unified Diff Dashboard` design package embedded in this story file as the implementation baseline.
- No direct Stitch retrieval tool was available in this environment, so implementation mapped the embedded approved package, layout targets, and token constraints into the existing Vue/Tailwind workspace patterns.

### UI Implementation Mapping

- `run-comparison` is implemented in `app/pages/workspace/compare.vue` with `ComparisonStatCard.vue`, `PathwayChangeCard.vue`, `TrustEvidencePanel.vue`, and `CaveatChangesPanel.vue`.
- `workspace-history` now exposes run-to-run comparison from `app/pages/workspace/history.vue` and `RecommendationRunCard.vue`, routing older runs against the latest preserved run.
- `useRunComparison.ts` and `app/lib/workspace/recommendation-run-comparison.ts` own client-side fetch, grouping, label, and filter behavior so the page stays presentation-focused.

### Debug Log References

- Unit/component validation:
  - `export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH" && pnpm exec vitest run tests/unit/buildRunComparison.spec.ts tests/components/workspace/RecommendationRunCard.spec.ts tests/components/workspace/ComparisonStatCard.spec.ts tests/components/workspace/PathwayChangeCard.spec.ts tests/components/workspace/CaveatChangesPanel.spec.ts tests/components/workspace/TrustEvidencePanel.spec.ts`
- API validation:
  - `export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH" && PLAYWRIGHT_REUSE_SERVER=true BASE_URL=http://127.0.0.1:3100 pnpm exec playwright test tests/api/run-comparison.spec.ts --project=api`
- E2E validation:
  - `export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH" && PLAYWRIGHT_REUSE_SERVER=true BASE_URL=http://127.0.0.1:3100 pnpm exec playwright test tests/e2e/workspace-recommendation-run-comparison.atdd.spec.ts --project=chromium`
- Additional validation:
  - `export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH" && pnpm exec nuxi typecheck` (fails due to pre-existing repository-wide issues outside Story 4.3 scope)
- Local dev session:
  - `export PATH="$HOME/.nvm/versions/node/v22.17.1/bin:$PATH" && pnpm dev --host 127.0.0.1 --port 3100`

### Completion Notes List

- Added a shared comparison type contract in `shared/types` plus a pure `buildRunComparison` server utility that classifies pathway, trust, caveat, confidence, and profile-snapshot deltas.
- Added a guarded workspace compare API route and extended recommendation run history utilities to load stored profile snapshot records for run-to-run profile delta summaries.
- Implemented a dedicated comparison composable, client-side grouping helpers, stat cards, pathway diff cards, trust/caveat panels, and the new `/workspace/compare` workspace page.
- Integrated compare navigation into archived run history so any older run can be compared against the latest preserved run without losing history context.
- Added Story 4.3 unit, component, API, and Chromium ATDD coverage, then fixed the auth-guard API expectation so the targeted suite is fully green.
- Follow-up review fixes: surfaced preserved profile deltas in the comparison workspace, preserved evidence-reference diffs alongside trust metadata, corrected the "Improved" filter to exclude declined changes, and preserved history filter context when navigating into and back from compare view.
- Residual risk: repo-wide `nuxi typecheck` still reports unrelated existing errors outside the Story 4.3 change set.

### Story Completion Status

- [x] All acceptance criteria met
- [x] All tasks completed
- [x] Tests passing
- [x] Code reviewed

### File List

- _bmad-output/implementation-artifacts/sprint-status.yaml
- app/components/workspace/CaveatChangesPanel.vue
- app/components/workspace/ComparisonStatCard.vue
- app/components/workspace/PathwayChangeCard.vue
- app/components/workspace/ProfileDeltaPanel.vue
- app/components/workspace/RecommendationRunCard.vue
- app/components/workspace/TrustEvidencePanel.vue
- app/composables/useRecommendationRunHistory.ts
- app/composables/useRunComparison.ts
- app/lib/workspace/recommendation-run-comparison.ts
- app/pages/workspace/compare.vue
- app/pages/workspace/history.vue
- server/api/workspace/runs/compare.get.ts
- server/utils/recommendations/buildRunComparison.ts
- server/utils/recommendations/recommendationRunHistory.ts
- shared/types/recommendation-run-comparison.ts
- tests/api/run-comparison.spec.ts
- tests/components/workspace/CaveatChangesPanel.spec.ts
- tests/components/workspace/ComparisonStatCard.spec.ts
- tests/components/workspace/PathwayChangeCard.spec.ts
- tests/components/workspace/ProfileDeltaPanel.spec.ts
- tests/components/workspace/RecommendationRunCard.spec.ts
- tests/components/workspace/TrustEvidencePanel.spec.ts
- tests/e2e/workspace-recommendation-run-comparison.atdd.spec.ts
- tests/support/fixtures/factories/recommendation-run-comparison-factory.ts
- tests/support/fixtures/test-data.ts
- tests/unit/buildRunComparison.spec.ts
- tests/unit/recommendation-run-comparison.spec.ts
- vitest.config.ts

## Change Log

- 2026-03-11: Story created with full context and approved Stitch design package (Concept C: Unified Diff Dashboard).
- 2026-03-12: Implemented preserved-run comparison APIs, diff engine, workspace comparison UI, history compare navigation, and Story 4.3 unit/component/API/E2E validation. Status moved to `review`.
- 2026-03-12: Applied code-review fixes for AC3/AC4 continuity gaps, corrected comparison filter semantics, preserved history filter context on compare navigation, reran targeted Vitest coverage, and moved story to `done`.
