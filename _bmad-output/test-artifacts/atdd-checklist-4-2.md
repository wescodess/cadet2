---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-05-validate-and-complete
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-11'
workflowType: 'testarch-atdd'
inputDocuments:
  - _bmad-output/implementation-artifacts/4-2-revisit-and-preserve-prior-recommendation-runs.md
  - package.json
  - playwright.config.ts
  - tests/api/intake-submit.atdd.spec.ts
  - tests/api/recommendation-next-step-plan.atdd.spec.ts
  - tests/e2e/intake-submit.atdd.spec.ts
  - tests/e2e/workspace-recommendation-next-step-plan.atdd.spec.ts
  - server/api/workspace/recommendation-runs.get.ts
  - app/components/workspace/RecommendationRunList.vue
  - app/components/workspace/WorkspaceShell.vue
  - _bmad/tea/config.yaml
  - _bmad/tea/testarch/knowledge/data-factories.md
  - _bmad/tea/testarch/knowledge/component-tdd.md
  - _bmad/tea/testarch/knowledge/test-quality.md
  - _bmad/tea/testarch/knowledge/test-healing-patterns.md
  - _bmad/tea/testarch/knowledge/selector-resilience.md
  - _bmad/tea/testarch/knowledge/timing-debugging.md
  - _bmad/tea/testarch/knowledge/overview.md
  - _bmad/tea/testarch/knowledge/api-request.md
---

# ATDD Checklist - Epic 4, Story 4.2: Revisit and Preserve Prior Recommendation Runs

**Date:** 2026-03-11
**Author:** Wesleyukadike
**Primary Test Level:** E2E

---

## Story Summary

This story adds a dedicated run archive so a workspace user can revisit prior recommendation outputs, filter prior runs, and re-open preserved recommendation detail from a specific point in time. The riskiest failure modes are ownership leaks, losing preserved recommendation metadata when newer runs appear, and presenting unavailable runs as if they were still actionable.

**As a** workspace user
**I want** to revisit previous recommendation results and preserve prior run outputs
**So that** I can compare progress over time and trust that earlier recommendation context is still available

---

## Acceptance Criteria

1. Recommendation run history/archive shows newest-first runs with date, status, recommendation count, and profile snapshot summary.
2. Current run is visually distinguished with explicit "Latest" treatment.
3. Status presentation is accessible and not color-only.
4. Selecting a prior run opens recommendation review for that run with back-navigation to history.
5. Unavailable runs are visibly disabled with explanation and without "View Results".
6. Empty archive state shows CTA back to intake.
7. Archive supports status filtering for All, Completed, Degraded, and Failed.
8. Layout adapts to mobile with single-column disclosure-friendly cards.
9. Recommendation outputs remain persisted and revisit-safe, including profile snapshot and recommendation metadata.

---

## Failing Tests Created (RED Phase)

### E2E Tests (5 tests)

**File:** `tests/e2e/workspace-recommendation-run-history.red.atdd.spec.ts` (236 lines)

- ✅ **Test:** `[P0][AC1] guest is redirected to auth when opening the run archive directly`
  - **Status:** RED - `/workspace/history` is not implemented yet, so protected-route behavior is not in place.
  - **Verifies:** Workspace guard on the new archive route.
- ✅ **Test:** `[P0][AC1][AC2][AC3] archive renders newest-first cards with latest emphasis, status badges, and profile snapshot summaries`
  - **Status:** RED - Archive UI, badges, and latest-run treatment do not exist yet.
  - **Verifies:** Visible run summary contract, latest emphasis, and accessible status text.
- ✅ **Test:** `[P0][AC5][AC7] archive filters by status and keeps unavailable runs non-actionable with an explanation`
  - **Status:** RED - Filter controls and unavailable-state rendering are not implemented.
  - **Verifies:** Filter bar behavior, unavailable messaging, and removal of unsafe actions.
- ✅ **Test:** `[P0][AC4] selecting a preserved run opens its recommendation review route with a back-link to the archive`
  - **Status:** RED - History cards do not navigate to run-specific review yet.
  - **Verifies:** Run-specific review routing and clear return navigation.
- ✅ **Test:** `[P1][AC6][AC8] empty and mobile archive states stay actionable without hiding the intake CTA or disclosure controls`
  - **Status:** RED - Empty/mobile archive surfaces are not implemented.
  - **Verifies:** Empty state CTA, mobile-safe layout, and disclosure affordances.

### API Tests (4 tests)

**File:** `tests/api/recommendation-run-history.red.atdd.spec.ts` (289 lines)

- ✅ **Test:** `[P0][AC1][AC7] workspace run history endpoint returns newest-first summaries with latest metadata and status filtering`
  - **Status:** RED - `/api/workspace/runs` does not exist yet.
  - **Verifies:** New list endpoint contract, reverse chronological ordering, latest marker, and server-side filtering.
- ✅ **Test:** `[P0][AC4][AC9] run detail endpoint returns preserved snapshot, recommendations, citations, and trust metadata for a selected run`
  - **Status:** RED - `/api/workspace/runs/:runId` does not exist yet.
  - **Verifies:** Preserved run detail, recommendation payload continuity, and evidence/trust carry-forward.
- ✅ **Test:** `[P0][AC5] unavailable archived runs return 404 with available=false and a user-safe explanation`
  - **Status:** RED - Unavailable archived-run contract is not implemented.
  - **Verifies:** 404 unavailable-state API shape and safe explanatory copy.
- ✅ **Test:** `[P1][AC1][AC9] run history remains workspace-scoped and does not disclose another user run when a foreign id is requested`
  - **Status:** RED - Ownership behavior for archive detail is not implemented on the new endpoint.
  - **Verifies:** Workspace scoping and unauthorized-access protection.

### Component Tests (0 tests)

**File:** `N/A`

Component-level test scaffolds were intentionally deferred here. The acceptance risk is concentrated in server-owned archive contracts and the end-to-end revisit flow; component tests should be added during implementation once `RecommendationRunCard`, `RunStatusBadge`, and `RunHistoryFilterBar` exist.

---

## Data Factories Created

### Recommendation Run History Factory

**File:** `tests/support/fixtures/factories/recommendation-run-history-factory.ts`

**Exports:**

- `createRecommendationRunHistoryRouteProbe(baseUrl)` - Build stable archive/review route paths for API and E2E tests.
- `createRecommendationRunHistorySummary(overrides?)` - Create a single archive summary record.
- `createRecommendationRunHistoryListFixture()` - Create a mixed latest/degraded/unavailable archive fixture.
- `createRecommendationRunHistoryDetail(run, overrides?)` - Create preserved run detail payload with recommendations, citations, trust metadata, and next-step plans.
- `createUnavailableRecommendationRunHistoryDetail(reason?)` - Create 404/unavailable payload for expired runs.

**Example Usage:**

```typescript
const runs = createRecommendationRunHistoryListFixture()
const detail = createRecommendationRunHistoryDetail(runs[0])
const routeProbe = createRecommendationRunHistoryRouteProbe(appBaseUrl)
```

---

## Fixtures Created

No new Playwright fixture module was required for red-phase generation.

**Reused fixture stack:** `tests/support/fixtures/index.ts`

- `appBaseUrl` - provides environment-aware base URL for archive route and API requests
- existing auth helpers - establish authenticated session for API and E2E red-phase specs

---

## Mock Requirements

### Archive List Mock

**Endpoint:** `GET /api/workspace/runs[?status=...]`

**Success Response:**

```json
{
  "runs": [
    {
      "id": "run_story42_history_latest",
      "status": "completed",
      "recommendationCount": 3,
      "profileSnapshotSummary": "CLB 9, software engineer, Ontario preference, 18-month target.",
      "createdAt": "2026-03-08T15:00:00.000Z",
      "isLatest": true,
      "isAvailable": true
    }
  ]
}
```

**Failure Response:**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Notes:** Filtered responses must preserve newest-first order and return only matching statuses.

### Archived Run Detail Mock

**Endpoint:** `GET /api/workspace/runs/:runId`

**Success Response:**

```json
{
  "available": true,
  "run": {
    "id": "run_story42_history_latest",
    "profileSnapshotId": "run_story42_history_latest_snapshot"
  },
  "profileSnapshot": {
    "summary": "CLB 9, software engineer, Ontario preference, 18-month target."
  },
  "results": {
    "direct": [],
    "blocked": [],
    "composed": []
  }
}
```

**Failure Response:**

```json
{
  "available": false,
  "reason": "Archived recommendation payload is no longer available in the workspace retention window."
}
```

**Notes:** Successful detail responses must preserve citations, trust boundaries, caveats, and next-step-plan metadata from the historical run snapshot.

---

## Required data-testid Attributes

### Run Archive Page

- `recommendation-history-list` - main archive container
- `recommendation-history-count` - visible run-count summary in page heading
- `run-history-filter-bar` - filter chip group
- `run-card-{runId}` - stable selector for each run card
- `run-history-latest-badge` - explicit latest/current badge
- `run-status-badge` - text+icon status badge
- `run-unavailable-reason` - unavailable-state explanation text
- `recommendation-history-empty-state` - zero-run empty state
- `recommendation-history-back-link` - back-navigation from run review to archive
- `run-card-expand-toggle` - mobile disclosure control

**Implementation Example:**

```tsx
<section data-testid="recommendation-history-list">
  <div data-testid={`run-card-${run.id}`}>
    <span data-testid="run-history-latest-badge">Latest</span>
    <span data-testid="run-status-badge">Completed</span>
  </div>
</section>
```

---

## Implementation Checklist

### Test: workspace run history endpoint returns newest-first summaries with latest metadata and status filtering

**File:** `tests/api/recommendation-run-history.red.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Create `server/api/workspace/runs/index.get.ts` using existing workspace-session guard.
- [ ] Return `{ runs }` with `id`, `status`, `recommendationCount`, `profileSnapshotSummary`, `createdAt`, `isLatest`, and `isAvailable`.
- [ ] Support `?status=completed|degraded|failed`.
- [ ] Ensure results are newest-first and latest run is explicitly marked.
- [ ] Run test: `pnpm playwright test --project=api tests/api/recommendation-run-history.red.atdd.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2.5 hours

### Test: run detail endpoint returns preserved snapshot, recommendations, citations, and trust metadata for a selected run

**File:** `tests/api/recommendation-run-history.red.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Create `server/api/workspace/runs/[runId].get.ts` for authenticated run retrieval.
- [ ] Return preserved profile snapshot, comparison group data, recommendation arrays, citations, trust boundaries, caveats, and next-step-plan metadata.
- [ ] Keep ownership server-side; never trust client-provided workspace identifiers.
- [ ] Verify historical payload is read from persisted run/result storage rather than reconstructed client state.
- [ ] Run test: `pnpm playwright test --project=api tests/api/recommendation-run-history.red.atdd.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 3.5 hours

### Test: archive renders newest-first cards with latest emphasis, status badges, and profile snapshot summaries

**File:** `tests/e2e/workspace-recommendation-run-history.red.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Create `app/pages/workspace/history.vue`.
- [ ] Build `RecommendationRunCard.vue`, `RunStatusBadge.vue`, and page heading/count treatment.
- [ ] Add required data-testid attributes: `recommendation-history-list`, `recommendation-history-count`, `run-card-{runId}`, `run-history-latest-badge`, `run-status-badge`.
- [ ] Ensure latest run card is visibly distinct with text label and not color alone.
- [ ] Run test: `pnpm playwright test --project=chromium tests/e2e/workspace-recommendation-run-history.red.atdd.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 4 hours

### Test: archive filters by status and keeps unavailable runs non-actionable with an explanation

**File:** `tests/e2e/workspace-recommendation-run-history.red.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Create `RunHistoryFilterBar.vue` with All/Completed/Degraded/Failed chip states.
- [ ] Wire filter state through `useRecommendationRunHistory.ts`.
- [ ] Render unavailable cards with disabled/absent "View Results" action and visible reason text.
- [ ] Add required data-testid attributes: `run-history-filter-bar`, `run-unavailable-reason`.
- [ ] Run test: `pnpm playwright test --project=chromium tests/e2e/workspace-recommendation-run-history.red.atdd.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2.5 hours

### Test: selecting a preserved run opens its recommendation review route with a back-link to the archive

**File:** `tests/e2e/workspace-recommendation-run-history.red.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Create or update `app/pages/workspace/recommendations/[runId].vue`.
- [ ] Load preserved run detail when `runId` is present.
- [ ] Add back-navigation to `/workspace/history`.
- [ ] Ensure review screen renders the historical profile snapshot summary so users know which run they opened.
- [ ] Add required data-testid attributes: `recommendation-history-back-link`.
- [ ] Run test: `pnpm playwright test --project=chromium tests/e2e/workspace-recommendation-run-history.red.atdd.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 3 hours

### Test: empty and mobile archive states stay actionable without hiding the intake CTA or disclosure controls

**File:** `tests/e2e/workspace-recommendation-run-history.red.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Add empty-state illustration/copy with CTA to `/workspace/intake`.
- [ ] Implement responsive single-column archive layout and tap-to-expand behavior for mobile cards.
- [ ] Add required data-testid attributes: `recommendation-history-empty-state`, `run-card-expand-toggle`.
- [ ] Preserve 44x44 minimum tap targets and keyboard reachability for disclosure controls.
- [ ] Run test: `pnpm playwright test --project=chromium tests/e2e/workspace-recommendation-run-history.red.atdd.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2.5 hours

---

## Running Tests

```bash
# Run all Story 4.2 red-phase acceptance tests
pnpm playwright test tests/api/recommendation-run-history.red.atdd.spec.ts tests/e2e/workspace-recommendation-run-history.red.atdd.spec.ts

# Run API red-phase tests only
pnpm playwright test --project=api tests/api/recommendation-run-history.red.atdd.spec.ts

# Run E2E red-phase tests only
pnpm playwright test --project=chromium tests/e2e/workspace-recommendation-run-history.red.atdd.spec.ts

# Run E2E in headed mode
pnpm playwright test --project=chromium --headed tests/e2e/workspace-recommendation-run-history.red.atdd.spec.ts

# List tests without executing
pnpm playwright test --list tests/api/recommendation-run-history.red.atdd.spec.ts tests/e2e/workspace-recommendation-run-history.red.atdd.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ Generated red-phase API and E2E acceptance tests
- ✅ Added a reusable run-history factory for consistent archive fixtures
- ✅ Documented mock requirements and stable data-testid contracts
- ✅ Mapped tests to implementation work for the DEV handoff

**Verification:**

- Tests are intentionally marked with `test.skip()` per this workflow's red-phase convention.
- Assertions describe expected archive behavior, not placeholder truthiness.
- Failure cause is missing Story 4.2 implementation, not malformed tests.

### GREEN Phase (DEV Team - Next Steps)

1. Implement the new `/api/workspace/runs` and `/api/workspace/runs/:runId` endpoints.
2. Build the archive page, filter bar, status badge, run cards, and run-specific review route.
3. Remove `test.skip()` from these Story 4.2 specs when implementation is ready.
4. Run API and E2E suites until they pass consistently.
5. Backfill component tests once the new UI components exist.

### REFACTOR Phase

- Consolidate repeated auth/session helpers if Story 4.2 adds more archive-path tests.
- Promote run-history selectors and labels into shared test helpers only after the UI contract stabilizes.
- Consider integration coverage for preserved-run payload reads if the new endpoint adds transformation logic.

---

## Summary

- **Story ID:** 4.2
- **Primary test level:** E2E
- **API tests:** 4
- **E2E tests:** 5
- **Component tests:** 0
- **Factory files added:** 1
- **Fixture files added:** 0
- **Mock requirement groups:** 2
- **Required data-testid values:** 10
- **Estimated implementation effort:** 18 hours
- **Output file:** `_bmad-output/test-artifacts/atdd-checklist-4-2.md`
- **Knowledge base references applied:** data factories, component TDD, test quality, selector resilience, timing debugging, Playwright utils API request patterns

Current risks:

- The workflow mandates `test.skip()` for red phase, which documents intent but does not exercise failing behavior until those skips are removed.
- The final implementation must preserve already-shipped recommendation metadata from Epic 3; any server-side payload reshaping that drops citations or trust boundaries will silently break continuity value.

Next recommended workflow: `dev` for Story 4.2 implementation, followed by `automate` or direct green-phase execution once the archive surfaces exist.
