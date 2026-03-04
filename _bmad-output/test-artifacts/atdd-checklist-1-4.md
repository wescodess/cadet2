---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-04T11:06:08Z'
workflowType: testarch-atdd
inputDocuments:
  - _bmad/tea/config.yaml
  - _bmad/tea/testarch/tea-index.csv
  - _bmad-output/implementation-artifacts/1-4-submit-intake-and-track-recommendation-run-records.md
  - playwright.config.ts
  - package.json
  - app/pages/workspace/intake.vue
  - app/pages/workspace/index.vue
  - server/api/intake/draft.post.ts
  - server/api/intake/draft.get.ts
  - tests/support/fixtures/index.ts
  - tests/support/fixtures/factories/intake-draft-factory.ts
  - tests/support/fixtures/factories/intake-submit-factory.ts
  - tests/support/fixtures/test-data.ts
  - tests/api/intake-submit.atdd.spec.ts
  - tests/e2e/intake-submit.atdd.spec.ts
---

# ATDD Checklist - Epic 1, Story 1.4: Submit Intake and Track Recommendation Run Records

**Date:** 2026-03-04
**Author:** Wesleyukadike
**Primary Test Level:** API (with E2E continuity verification)

---

## Story Summary

Story 1.4 introduces intake submission as a persistence boundary that creates recommendation run records linked to submitted profile snapshots. The scope is intentionally minimal: create run metadata, list user-scoped runs in reverse chronological order, and provide clear submission confirmation in workspace UI.

**As a** immigration user  
**I want** to submit my completed intake and track recommendation runs in my workspace  
**So that** I keep continuity as my situation changes over time

---

## Acceptance Criteria

1. Completed intake submission creates a recommendation run tied to the authenticated user and current profile snapshot.
2. Workspace shows prior recommendation runs (or placeholders) in reverse chronological order and user scope.
3. Stored run metadata preserves clear run-to-submitted-profile linkage.
4. Epic 1 metadata is minimal only: run identity, ownership linkage, profile linkage, status, timestamps.
5. Successful submit action provides explicit confirmation and clear next-state communication.

---

## Failing Tests Created (RED Phase)

### E2E Tests (6 tests)

**File:** `tests/e2e/intake-submit.atdd.spec.ts`

- ✅ **Test:** `[P0][AC1] guest is redirected to auth when opening intake submission route`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** intake route remains protected for unauthenticated users
- ✅ **Test:** `[P0][AC1][AC5] completed intake shows a dedicated submit action with stable hooks`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** `data-testid="intake-submit"` appears in completed intake state
- ✅ **Test:** `[P0][AC1][AC5] successful intake submission shows explicit confirmation and next-state guidance`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** submit feedback hook and confirmation copy after successful submit
- ✅ **Test:** `[P0][AC5] duplicate submission attempts are blocked while submit request is in progress`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** duplicate submit protection while request is pending
- ✅ **Test:** `[P0][AC2] workspace dashboard shows recommendation run list placeholders for the signed-in user`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** stable run-list hooks: `workspace-run-list`, `workspace-run-item`
- ✅ **Test:** `[P1][AC2] repeated submissions surface as distinct run items in the workspace continuity list`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** continuity list renders distinct items for multiple runs

### API Tests (6 tests)

**File:** `tests/api/intake-submit.atdd.spec.ts`

- ✅ **Test:** `[P0][AC1] unauthenticated intake submission is denied by workspace session guard`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** `POST /api/intake/submit` requires authenticated workspace session
- ✅ **Test:** `[P0][AC1][AC3][AC4] submitting completed intake creates a queued run linked to a profile snapshot`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** minimal run metadata creation contract and snapshot linkage
- ✅ **Test:** `[P0][AC1] submission is rejected when required intake sections are incomplete`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** server-side required-section validation before run creation
- ✅ **Test:** `[P0][AC2] recommendation runs endpoint is user-scoped and returns newest-first order`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** query tampering does not leak other-user runs and ordering remains descending by `createdAt`
- ✅ **Test:** `[P1][AC4] run listing keeps metadata minimal without recommendation-detail leakage`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** response excludes recommendation detail/evidence/governance fields in this epic
- ✅ **Test:** `[P0][AC2][AC5] repeated submissions create distinct run records in reverse-chronological order`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** no in-place overwrite; repeated submissions produce distinct run identities

---

## Data Factories Created

### Intake Submit and Run Fixture Factory

**File:** `tests/support/fixtures/factories/intake-submit-factory.ts`

**Exports:**

- `createIntakeSubmitRouteProbe(baseUrl)` - canonical intake submit and run-list route probes
- `createCompletedIntakeDraftPayload(overrides?)` - complete draft payload for submit-ready scenarios
- `createIncompleteIntakeDraftPayload(overrides?)` - intentionally incomplete payload for validation-path scenarios
- `createRecommendationRunRecord(overrides?)` - minimal run metadata fixture generator
- `createRecommendationRunListFixture()` - deterministic newest-first run list fixture

---

## Fixtures Created

### Intake Submit Test Contracts

**File:** `tests/support/fixtures/test-data.ts`

**Added constants:**

- `INTAKE_SUBMIT_ATDD_TEST_IDS` - selector contract for submit and run-list surfaces
- `INTAKE_SUBMIT_ATDD_CONFIRMATION_SNIPPETS` - expected confirmation phrasing anchors
- `RECOMMENDATION_RUN_ATDD_REQUIRED_KEYS` - minimal run metadata contract keys

---

## Mock Requirements

### Intake Submit Contract

**Endpoint:** `POST /api/intake/submit`

**Success Response:**

```json
{
  "runId": "run_ab12cd34ef56",
  "profileSnapshotId": "snapshot_fa12bc34de56",
  "status": "queued",
  "createdAt": "2026-03-04T13:15:00.000Z",
  "updatedAt": "2026-03-04T13:15:00.000Z"
}
```

**Failure Response (incomplete draft):**

```json
{
  "statusCode": 400,
  "statusMessage": "Intake is incomplete"
}
```

### Recommendation Run List Contract

**Endpoint:** `GET /api/workspace/recommendation-runs`

**Success Response:**

```json
[
  {
    "runId": "run_latest_123",
    "profileSnapshotId": "snapshot_latest_123",
    "status": "queued",
    "createdAt": "2026-03-04T13:15:00.000Z",
    "updatedAt": "2026-03-04T13:15:00.000Z"
  },
  {
    "runId": "run_older_456",
    "profileSnapshotId": "snapshot_older_456",
    "status": "processing",
    "createdAt": "2026-03-01T09:45:00.000Z",
    "updatedAt": "2026-03-01T09:45:00.000Z"
  }
]
```

---

## Required data-testid Attributes

- `intake-submit` - submit trigger once intake is complete
- `intake-submit-feedback` - explicit submit completion/next-state messaging container
- `workspace-run-list` - workspace continuity list container
- `workspace-run-item` - repeated hook for each run entry in the continuity list

---

## Implementation Checklist

### Test: `[P0][AC1][AC3][AC4] submitting completed intake creates a queued run linked to a profile snapshot`

**File:** `tests/api/intake-submit.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Implement `POST /api/intake/submit` behind `requireWorkspaceUserSession`
- [ ] Validate required intake sections before creating run records
- [ ] Persist profile snapshot metadata and return `profileSnapshotId`
- [ ] Create minimal recommendation run metadata with `queued` status
- [ ] Remove `test.skip` and run API scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 3.0 hours

### Test: `[P0][AC2] recommendation runs endpoint is user-scoped and returns newest-first order`

**File:** `tests/api/intake-submit.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Implement `GET /api/workspace/recommendation-runs` with authenticated-user scoping only
- [ ] Return runs sorted descending by `createdAt`
- [ ] Ignore/deny userId tampering query parameters
- [ ] Remove `test.skip` and run API scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 2.0 hours

### Test: `[P0][AC1][AC5] successful intake submission shows explicit confirmation and next-state guidance`

**File:** `tests/e2e/intake-submit.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Add dedicated submit action and loading/disabled state in `app/pages/workspace/intake.vue`
- [ ] Add `data-testid="intake-submit"` and `data-testid="intake-submit-feedback"`
- [ ] Show explicit post-submit confirmation and next-step guidance
- [ ] Remove `test.skip` and run E2E scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 2.0 hours

### Test: `[P0][AC2] workspace dashboard shows recommendation run list placeholders for the signed-in user`

**File:** `tests/e2e/intake-submit.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Build `RecommendationRunList` component with stable list/item hooks
- [ ] Integrate run list into workspace home and wire API retrieval
- [ ] Render distinct run placeholders with status and timestamp context
- [ ] Remove `test.skip` and run E2E scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 2.0 hours

---

## Running Tests

```bash
# Run story 1.4 API red-phase ATDD tests
pnpm exec playwright test --project=api tests/api/intake-submit.atdd.spec.ts

# Run story 1.4 E2E red-phase ATDD tests
pnpm exec playwright test --project=chromium tests/e2e/intake-submit.atdd.spec.ts

# Run in headed mode for E2E
pnpm exec playwright test --project=chromium tests/e2e/intake-submit.atdd.spec.ts --headed

# Run both story 1.4 files
pnpm exec playwright test --project=api --project=chromium tests/api/intake-submit.atdd.spec.ts tests/e2e/intake-submit.atdd.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Failing API and E2E tests authored for Story 1.4
- ✅ Tests are guarded with `test.skip()` for intentional red-phase handoff
- ✅ Minimal fixture and selector contracts documented
- ✅ Implementation checklist and execution commands provided

### GREEN Phase (DEV Team - Next Steps)

1. Implement `POST /api/intake/submit` and `GET /api/workspace/recommendation-runs` per AC boundaries.
2. Add submit UI and run list continuity UI with required stable hooks.
3. Remove `test.skip()` incrementally per scenario.
4. Run story-focused Playwright API + E2E commands until all tests pass.

### REFACTOR Phase

- Consolidate auth/setup helpers if repeated between `intake-constraints-context` and `intake-submit` suites.
- Promote reusable run-list fixtures/selectors once Story 1.4 implementation stabilizes.

---

## Summary

- **Story ID:** 1.4
- **Primary test level:** API-first with E2E continuity validation
- **Tests generated:** 12 total (API: 6, E2E: 6)
- **Factories added:** 1 (`intake-submit-factory.ts`)
- **Fixture/test-data updates:** 1 (`test-data.ts` additions)
- **Key assumptions:** submit endpoint returns 201 on run creation; run list returns minimal metadata only
- **Output file:** `_bmad-output/test-artifacts/atdd-checklist-1-4.md`
- **Knowledge fragments applied:** `data-factories`, `test-quality`, `network-first`, `selector-resilience`, `test-healing-patterns`
