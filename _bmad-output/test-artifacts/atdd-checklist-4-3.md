---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-05-validate-and-complete
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-12'
workflowType: 'testarch-atdd'
inputDocuments:
  - _bmad-output/implementation-artifacts/4-3-show-changes-between-recommendation-runs.md
  - package.json
  - playwright.config.ts
  - tests/api/run-comparison.spec.ts
  - tests/e2e/workspace-recommendation-run-comparison.atdd.spec.ts
  - tests/support/fixtures/index.ts
  - tests/support/fixtures/test-data.ts
  - tests/support/fixtures/factories/recommendation-run-comparison-factory.ts
  - tests/support/fixtures/factories/recommendation-comparison-factory.ts
  - tests/support/fixtures/factories/recommendation-run-history-factory.ts
  - _bmad/tea/config.yaml
  - _bmad/tea/testarch/knowledge/data-factories.md
  - _bmad/tea/testarch/knowledge/component-tdd.md
  - _bmad/tea/testarch/knowledge/test-quality.md
  - _bmad/tea/testarch/knowledge/selector-resilience.md
  - _bmad/tea/testarch/knowledge/timing-debugging.md
  - _bmad/tea/testarch/knowledge/overview.md
  - _bmad/tea/testarch/knowledge/api-request.md
---

# ATDD Checklist - Epic 4, Story 4.3: Show Changes Between Recommendation Runs

**Date:** 2026-03-12
**Author:** Wesleyukadike
**Primary Test Level:** E2E

---

## Story Summary

This story adds a preserved run-to-run comparison workflow so workspace users can understand what meaningfully changed between recommendation evaluations without losing trust context. The highest-risk failure modes are showing misleading diffs, dropping evidence or profile-change context, and leaving the user stranded when a preserved run pair cannot be compared.

**As a** immigration user
**I want** to see what changed between recommendation runs
**So that** I can understand how updates to my profile affect my pathway options

**Backfill note:** Story 4.3 is already implemented in this branch. This ATDD package preserves the original red-phase contract as dedicated `test.skip()` specs so the intended acceptance surface remains explicit without breaking the existing green suite.

---

## Acceptance Criteria

1. Meaningful changes between a newer and prior run are shown with additions, removals, and ranking or tier changes.
2. When comparison data cannot be generated, the UI shows a clear unavailable state and preserves navigation context.
3. Profile-change context is preserved so recommendation movement can be tied to changed user inputs.
4. Trust metadata differences preserve evidence references, freshness, and caveat changes across runs.
5. Status and outcome quality differences are understandable without exposing internal processing details.

---

## Failing Tests Created (RED Phase)

### E2E Tests (3 tests)

**File:** `tests/e2e/workspace-recommendation-run-comparison.red.atdd.spec.ts` (167 lines)

- ✅ **Test:** `[P0][AC1][AC3][AC4][AC5] history compare action opens the comparison dashboard with diff stats, profile deltas, and trust evidence context`
  - **Status:** RED - Without Story 4.3 implementation, the compare action, dashboard, stat cards, profile delta panel, and trust evidence panel would all be missing.
  - **Verifies:** End-to-end archive-to-compare flow, preserved history filter, summary stats, profile-change context, trust evidence, and caveat visibility.
- ✅ **Test:** `[P0][AC1][AC5] comparison categories isolate newly added and removed pathways without implying unchanged recommendations moved`
  - **Status:** RED - Category filters and pathway change cards would not exist before the comparison dashboard was implemented.
  - **Verifies:** Category filter behavior for new and removed pathways, and user-facing diff clarity.
- ✅ **Test:** `[P0][AC2] comparison-unavailable state stays actionable with back-links to both run details and history`
  - **Status:** RED - The compare page would not yet expose a safe unavailable state or return links before implementation.
  - **Verifies:** Unavailable messaging, run-detail links, and preserved history back-navigation.

### API Tests (4 tests)

**File:** `tests/api/run-comparison.red.atdd.spec.ts` (244 lines)

- ✅ **Test:** `[P0][AC1][AC3][AC4][AC5] compare endpoint returns structured diffs, trust metadata changes, and profile deltas for two preserved runs`
  - **Status:** RED - `/api/workspace/runs/compare` would not exist before Story 4.3 server work.
  - **Verifies:** Structured diff payload, changed pathways, trust deltas, and preserved profile delta summary.
- ✅ **Test:** `[P0][AC2] compare endpoint returns a comparison-unavailable payload when either run cannot be compared`
  - **Status:** RED - Safe unavailable responses are a Story 4.3 contract and would be absent before implementation.
  - **Verifies:** `comparisonAvailable: false`, user-safe reason text, and empty diff arrays.
- ✅ **Test:** `[P1][AC2] compare endpoint rejects same-run comparisons with a safe unavailable response`
  - **Status:** RED - Same-run safety handling is comparison-specific server logic introduced by Story 4.3.
  - **Verifies:** Guardrails against misleading self-comparisons.
- ✅ **Test:** `[P1] compare endpoint requires an authenticated workspace session`
  - **Status:** RED - Workspace session enforcement on the new endpoint would be missing before implementation.
  - **Verifies:** Auth guard behavior on compare requests.

### Component Tests (0 tests)

**File:** `N/A`

Component-level red specs were intentionally deferred. The highest acceptance risk for this story sat in the preserved API contract and the history-to-compare journey; component coverage is already handled in the implementation suite once the comparison surface exists.

---

## Data Factories Created

### Recommendation Run Comparison Factory

**File:** `tests/support/fixtures/factories/recommendation-run-comparison-factory.ts`

**Exports:**

- `createRecommendationRunComparisonRouteProbe(baseUrl)` - Build stable history and compare routes with optional preserved filter context.
- `createRecommendationRunComparisonFixture(overrides?)` - Create a representative comparison payload with pathway, trust, caveat, and profile deltas.

**Example Usage:**

```typescript
const routeProbe = createRecommendationRunComparisonRouteProbe(appBaseUrl)
const comparison = createRecommendationRunComparisonFixture({
  comparisonAvailable: false,
  pathwayChanges: [],
  trustChanges: [],
})
```

### Recommendation Comparison Evaluation Payload Factory

**File:** `tests/support/fixtures/factories/recommendation-comparison-factory.ts`

**Exports Used:**

- `createRecommendationComparisonEvaluationPayload()` - Seed a stronger later run with richer pathway outcomes.
- `createRecommendationComparisonFallbackEvaluationPayload()` - Seed a weaker baseline run to produce meaningful diff output.

**Example Usage:**

```typescript
const priorPayload = createRecommendationComparisonFallbackEvaluationPayload()
const currentPayload = createRecommendationComparisonEvaluationPayload()
```

---

## Fixtures Created

No new Playwright fixture module was required for red-phase generation.

**Reused fixture stack:** `tests/support/fixtures/index.ts`

- `request` / `page` / `appBaseUrl` - existing merged Playwright and playwright-utils fixture surface
- existing auth helpers - establish authenticated session for protected API and browser workflows
- existing route and test-id fixture data - keep selectors and URLs deterministic

---

## Mock Requirements

### Run Comparison History List Mock

**Endpoint:** `GET /api/workspace/runs`

**Success Response:**

```json
{
  "runs": [
    {
      "id": "run_story43_current",
      "status": "completed",
      "recommendationCount": 3,
      "createdAt": "2026-03-10T15:00:00.000Z",
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

**Notes:** The archive response must preserve latest-run context so the compare action can consistently route an older run against the current preserved run.

### Run Comparison Mock

**Endpoint:** `GET /api/workspace/runs/compare?runA={runId}&runB={runId}`

**Success Response:**

```json
{
  "comparisonAvailable": true,
  "summary": {
    "added": 1,
    "removed": 1,
    "changed": 3,
    "overallConfidenceChange": 1,
    "newEvidenceCount": 2
  },
  "pathwayChanges": [
    {
      "pathwayId": "mvp-skilled-worker",
      "changeType": "tier-changed"
    }
  ],
  "trustChanges": [
    {
      "pathwayId": "mvp-skilled-worker"
    }
  ],
  "profileDelta": {
    "changedFieldCount": 2
  }
}
```

**Failure Response:**

```json
{
  "comparisonAvailable": false,
  "unavailableReason": "Comparison data is unavailable for this preserved pair.",
  "pathwayChanges": [],
  "trustChanges": []
}
```

**Notes:** Successful responses must preserve trust evidence, caveat deltas, and profile snapshot changes. Unavailable responses must not emit misleading diff content.

---

## Required data-testid Attributes

### Run Comparison Page

- `run-comparison-dashboard` - main comparison dashboard container
- `comparison-stat-pathways-changed` - changed-pathway summary card
- `comparison-stat-overall-confidence` - overall-confidence summary card
- `comparison-stat-new-evidence` - new-evidence summary card
- `profile-delta-section` - preserved profile-change context panel
- `pathway-change-card-{pathwayId}` - stable selector for each changed pathway card
- `trust-evidence-section` - trust and evidence diff panel
- `caveat-changes-panel` - caveat additions and removals panel

**Implementation Example:**

```tsx
<section data-testid="run-comparison-dashboard">
  <div data-testid="comparison-stat-pathways-changed">3</div>
  <div data-testid="profile-delta-section">Valid job offer</div>
  <article data-testid="pathway-change-card-mvp-skilled-worker" />
</section>
```

---

## Implementation Checklist

### Test: compare endpoint returns structured diffs, trust metadata changes, and profile deltas for two preserved runs

**File:** `tests/api/run-comparison.red.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Create `server/api/workspace/runs/compare.get.ts` with the existing workspace access guard.
- [ ] Load two preserved recommendation runs using the Story 4.2 history-preservation utilities.
- [ ] Return aggregate summary stats plus `pathwayChanges`, `trustChanges`, `caveatChanges`, and `profileDelta`.
- [ ] Ensure the diff includes at least one non-unchanged pathway classification when the seeded runs differ.
- [ ] Run test: `pnpm exec playwright test tests/api/run-comparison.red.atdd.spec.ts --project=api`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 3 hours

### Test: compare endpoint returns a comparison-unavailable payload when either run cannot be compared

**File:** `tests/api/run-comparison.red.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Return `comparisonAvailable: false` instead of leaking server errors when one preserved run is missing or unreadable.
- [ ] Provide a user-safe `unavailableReason`.
- [ ] Ensure `pathwayChanges` and `trustChanges` are empty in unavailable responses.
- [ ] Run test: `pnpm exec playwright test tests/api/run-comparison.red.atdd.spec.ts --project=api`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 1 hour

### Test: compare endpoint rejects same-run comparisons with a safe unavailable response

**File:** `tests/api/run-comparison.red.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Detect identical `runA` and `runB` values before diff generation.
- [ ] Return a safe unavailable payload explaining that the same run cannot be compared to itself.
- [ ] Keep the response stable and user-readable.
- [ ] Run test: `pnpm exec playwright test tests/api/run-comparison.red.atdd.spec.ts --project=api`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hours

### Test: compare endpoint requires an authenticated workspace session

**File:** `tests/api/run-comparison.red.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Reuse the repo-standard workspace session middleware for the compare endpoint.
- [ ] Confirm unauthenticated access is redirected or rejected consistently with the rest of the workspace.
- [ ] Run test: `pnpm exec playwright test tests/api/run-comparison.red.atdd.spec.ts --project=api`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 0.5 hours

### Test: history compare action opens the comparison dashboard with diff stats, profile deltas, and trust evidence context

**File:** `tests/e2e/workspace-recommendation-run-comparison.red.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Add a Compare action to archived run cards that routes to `/workspace/compare`.
- [ ] Build `app/pages/workspace/compare.vue` and fetch comparison data through a composable.
- [ ] Render stat cards, profile delta panel, trust evidence panel, and caveat changes panel.
- [ ] Preserve incoming history filter context in the compare URL.
- [ ] Add required data-testid attributes: `run-comparison-dashboard`, `comparison-stat-pathways-changed`, `comparison-stat-overall-confidence`, `comparison-stat-new-evidence`, `profile-delta-section`, `trust-evidence-section`, `caveat-changes-panel`
- [ ] Run test: `pnpm exec playwright test tests/e2e/workspace-recommendation-run-comparison.red.atdd.spec.ts --project=chromium`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 4 hours

### Test: comparison categories isolate newly added and removed pathways without implying unchanged recommendations moved

**File:** `tests/e2e/workspace-recommendation-run-comparison.red.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Group pathway changes into user-facing categories in the comparison composable.
- [ ] Render category filter controls for new and removed changes.
- [ ] Ensure filter results show only relevant pathway cards for the active category.
- [ ] Add stable pathway card selectors: `pathway-change-card-{pathwayId}`.
- [ ] Run test: `pnpm exec playwright test tests/e2e/workspace-recommendation-run-comparison.red.atdd.spec.ts --project=chromium`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2 hours

### Test: comparison-unavailable state stays actionable with back-links to both run details and history

**File:** `tests/e2e/workspace-recommendation-run-comparison.red.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Render a comparison-unavailable state when the API returns `comparisonAvailable: false`.
- [ ] Link back to both compared run-detail pages.
- [ ] Preserve the history filter in the archive return link.
- [ ] Avoid rendering misleading diff cards or summary content in the unavailable state.
- [ ] Run test: `pnpm exec playwright test tests/e2e/workspace-recommendation-run-comparison.red.atdd.spec.ts --project=chromium`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 1.5 hours

---

## Running Tests

```bash
# Run all Story 4.3 red-phase ATDD specs
pnpm exec playwright test tests/api/run-comparison.red.atdd.spec.ts tests/e2e/workspace-recommendation-run-comparison.red.atdd.spec.ts --project=api --project=chromium

# Run the API red-phase file
pnpm exec playwright test tests/api/run-comparison.red.atdd.spec.ts --project=api

# Run the E2E red-phase file
pnpm exec playwright test tests/e2e/workspace-recommendation-run-comparison.red.atdd.spec.ts --project=chromium

# Run the E2E file in headed mode
pnpm exec playwright test tests/e2e/workspace-recommendation-run-comparison.red.atdd.spec.ts --project=chromium --headed

# Debug the E2E file
pnpm exec playwright test tests/e2e/workspace-recommendation-run-comparison.red.atdd.spec.ts --project=chromium --debug
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ Acceptance criteria translated into API and E2E red-phase coverage
- ✅ Dedicated skipped specs created for Story 4.3
- ✅ Reused factories and fixture stack identified
- ✅ Mock and `data-testid` requirements documented
- ✅ Implementation checklist created

**Verification:**

- Red-phase intent is preserved through dedicated `test.skip()` specs.
- The tests assert expected behavior rather than placeholder assertions.
- Because Story 4.3 is already implemented on this branch, the specs remain skipped instead of being unskipped to force failures against working code.

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. Remove `test.skip()` from the highest-priority API or E2E spec.
2. Implement the minimal server or UI change needed for that specific behavior.
3. Re-run the targeted file until it passes.
4. Continue one failing scenario at a time until the full Story 4.3 surface is green.

**Key Principles:**

- One scenario at a time.
- Prefer server and composable fixes before expanding UI complexity.
- Keep selectors resilient: `data-testid` first, then role/text where appropriate.
- Intercept or mock network requests before navigation in browser coverage.

### REFACTOR Phase

- Consolidate shared comparison test data into the existing factories rather than inlining new payloads.
- Keep compare-page assertions deterministic with explicit URL and panel checks.
- Expand component coverage only after the server contract and E2E flow are stable.

---

## Summary

- **Story ID:** 4.3
- **Primary Test Level:** E2E
- **API Tests:** 4
- **E2E Tests:** 3
- **Component Tests:** 0
- **API Test File:** `tests/api/run-comparison.red.atdd.spec.ts`
- **E2E Test File:** `tests/e2e/workspace-recommendation-run-comparison.red.atdd.spec.ts`
- **Factory Files Reused:** 2 primary factory modules
- **Fixture Modules Created:** 0
- **Mock Requirements:** 2
- **Required data-testid Attributes:** 8
- **Implementation Task Groups:** 7
- **Estimated Effort:** 12.5 hours
- **Checklist Output:** `_bmad-output/test-artifacts/atdd-checklist-4-3.md`
- **Knowledge Base References Applied:** data factories, component TDD, test quality, selector resilience, timing debugging, Playwright utils overview, API request utility

**Next recommended workflow:** DEV implementation against the new red-phase specs, or `automate` if you want broader post-implementation regression coverage around Story 4.3.
