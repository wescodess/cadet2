---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-04T15:31:45Z'
workflowType: testarch-atdd
inputDocuments:
  - _bmad/tea/config.yaml
  - _bmad/tea/testarch/tea-index.csv
  - _bmad-output/implementation-artifacts/2-1-start-recommendation-processing-from-a-submitted-profile.md
  - playwright.config.ts
  - package.json
  - convex/recommendationRuns.ts
  - app/pages/workspace/index.vue
  - app/components/workspace/RecommendationRunList.vue
  - server/api/intake/submit.post.ts
  - server/api/workspace/recommendation-runs.get.ts
  - tests/support/fixtures/factories/intake-submit-factory.ts
  - tests/support/fixtures/test-data.ts
  - tests/api/recommendation-lifecycle.atdd.spec.ts
  - tests/e2e/workspace-recommendation-status.atdd.spec.ts
  - tests/support/fixtures/factories/recommendation-lifecycle-factory.ts
---

# ATDD Checklist - Epic 2, Story 2.1: Start Recommendation Processing from a Submitted Profile

**Date:** 2026-03-04
**Author:** Wesleyukadike
**Primary Test Level:** API lifecycle transitions (with E2E workspace status visibility)

---

## Story Summary

Story 2.1 starts lifecycle processing for recommendation runs created in Story 1.4. Scope covers canonical status transitions (`queued`, `evaluating`, `completed`, `degraded`, `failed`), provider-agnostic status reads, resumable in-progress delay handling, and workspace status visibility via a stable banner hook.

**As a** immigration user  
**I want** my submitted profile to start a tracked recommendation process  
**So that** the system can evaluate my case and show clear progress toward results

---

## Acceptance Criteria

1. Starting recommendation processing updates the existing run with explicit processing status while preserving profile linkage.
2. Workspace-facing status uses the canonical lifecycle vocabulary only: `queued`, `evaluating`, `completed`, `degraded`, `failed`.
3. Workspace renders a status banner with stable hook `data-testid="recommendation-status-banner"`.
4. Recoverable delays remain in-progress and resumable rather than appearing terminal.
5. Deterministic seed/reset hooks and provider-mock seams exist for lifecycle verification.

---

## Failing Tests Created (RED Phase)

### API Tests (6 tests)

**File:** `tests/api/recommendation-lifecycle.atdd.spec.ts`

- ✅ **Test:** `[P0][AC1][AC2] unauthenticated user cannot start recommendation processing`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** start endpoint requires authenticated workspace session
- ✅ **Test:** `[P0][AC1][AC2] start endpoint transitions queued run to evaluating while preserving linkage fields`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** lifecycle start contract and immutable linkage fields (`runId`, `profileSnapshotId`)
- ✅ **Test:** `[P0][AC2] status endpoint returns canonical lifecycle states only and provider-agnostic payload`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** canonical status vocabulary and no provider internals leaked
- ✅ **Test:** `[P0][AC1][AC2] start and status operations deny unknown or non-owned run identifiers`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** ownership/not-found guardrails on lifecycle mutation and read endpoints
- ✅ **Test:** `[P0][AC4] recoverable delay contract keeps run resumable and in-progress`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** delay path remains `queued`/`evaluating` with resumable signal
- ✅ **Test:** `[P1][AC4] repeated start requests are idempotent for the same run`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** repeated start calls do not create duplicate lifecycle state mutations

### E2E Tests (5 tests)

**File:** `tests/e2e/workspace-recommendation-status.atdd.spec.ts`

- ✅ **Test:** `[P0][AC2][AC3] guest is redirected to auth when opening workspace recommendation status surface`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** workspace status view remains access-controlled
- ✅ **Test:** `[P0][AC2][AC3] workspace shows stable recommendation status banner hook for in-progress lifecycle states`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** `recommendation-status-banner` renders for in-progress lifecycle states
- ✅ **Test:** `[P1][AC4] recoverable delay state copy stays active and resumable instead of appearing stuck`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** user-facing copy communicates active/resumable processing during delay
- ✅ **Test:** `[P1][AC2][AC3] terminal lifecycle states are rendered with text-first messaging (completed, degraded, failed)`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** non-color-only readability for terminal states in workspace status surfaces
- ✅ **Test:** `[P0][AC2][AC3] run list and status banner hooks remain stable for workspace automation`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** stable automation hooks for run list and status banner continuity

---

## Data Factories Created

### Recommendation Lifecycle Fixture Factory

**File:** `tests/support/fixtures/factories/recommendation-lifecycle-factory.ts`

**Exports:**

- `createRecommendationLifecycleRouteProbe(baseUrl)` - canonical paths for workspace, run list, lifecycle start, and lifecycle status APIs
- `createRecommendationLifecycleRecord(overrides?)` - deterministic run record fixture generator
- `createRecommendationStatusPayload(run, overrides?)` - provider-agnostic status payload composer for lifecycle endpoint mocks

---

## Fixtures Created

### Recommendation Lifecycle Test Contracts

**File:** `tests/support/fixtures/test-data.ts`

**Added constants:**

- `RECOMMENDATION_LIFECYCLE_ATDD_TEST_IDS` - stable status/run list test-id contract
- `RECOMMENDATION_LIFECYCLE_CANONICAL_STATUSES` - allowed lifecycle status values
- `RECOMMENDATION_LIFECYCLE_IN_PROGRESS_STATUSES` - allowed active/resumable statuses
- `RECOMMENDATION_LIFECYCLE_FORBIDDEN_PROVIDER_FIELDS` - payload fields that must not leak provider internals
- `RECOMMENDATION_LIFECYCLE_IN_PROGRESS_COPY_SNIPPETS` - required user-facing in-progress copy anchors

---

## Mock Requirements

### Start Processing Contract

**Endpoint:** `POST /api/recommendations/runs/:runId/start`

**Success Response:**

```json
{
  "runId": "run_story21_001",
  "profileSnapshotId": "snapshot_story21_001",
  "status": "evaluating",
  "createdAt": "2026-03-04T13:15:00.000Z",
  "updatedAt": "2026-03-04T13:18:00.000Z",
  "resumable": true
}
```

**Failure Response (not owned / missing):**

```json
{
  "statusCode": 404,
  "statusMessage": "Recommendation run not found"
}
```

### Status Read Contract

**Endpoint:** `GET /api/recommendations/runs/:runId/status`

**Success Response:**

```json
{
  "runId": "run_story21_001",
  "profileSnapshotId": "snapshot_story21_001",
  "status": "evaluating",
  "statusMessage": "Recommendation processing is actively evaluating your profile.",
  "resumable": true,
  "processingHeartbeatAt": "2026-03-04T13:18:00.000Z",
  "createdAt": "2026-03-04T13:15:00.000Z",
  "updatedAt": "2026-03-04T13:18:00.000Z"
}
```

**Provider safety rule:** no `providerPayload`, `adapterTrace`, or raw model output fields in workspace-facing response.

---

## Required data-testid Attributes

- `recommendation-status-banner` - primary lifecycle state banner container on workspace surface
- `workspace-run-list` - recommendation run continuity list container
- `workspace-run-item` - per-run item hook for chronological continuity assertions

---

## Implementation Checklist

### Test: `[P0][AC1][AC2] start endpoint transitions queued run to evaluating while preserving linkage fields`

**File:** `tests/api/recommendation-lifecycle.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Implement `POST /api/recommendations/runs/:runId/start` with workspace ownership auth checks
- [ ] Add lifecycle transition mutation in `convex/recommendationRuns.ts` for `queued -> evaluating`
- [ ] Enforce canonical status vocabulary and invalid-transition guardrails
- [ ] Keep linkage fields immutable (`runId`, `userId`, `profileSnapshotId`)
- [ ] Remove `test.skip` and run API scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 3.0 hours

### Test: `[P0][AC2] status endpoint returns canonical lifecycle states only and provider-agnostic payload`

**File:** `tests/api/recommendation-lifecycle.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Implement `GET /api/recommendations/runs/:runId/status` with authenticated ownership checks
- [ ] Return only canonical lifecycle fields plus safe status message telemetry
- [ ] Exclude provider internals from response contract
- [ ] Remove `test.skip` and run API scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 2.0 hours

### Test: `[P0][AC4] recoverable delay contract keeps run resumable and in-progress`

**File:** `tests/api/recommendation-lifecycle.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Add deterministic delay/retry simulation hooks for non-production tests
- [ ] Ensure recoverable delays retain in-progress state (`queued` or `evaluating`)
- [ ] Add resumability signal (`resumable`, heartbeat/updated timestamp semantics)
- [ ] Remove `test.skip` and run API scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 2.0 hours

### Test: `[P0][AC2][AC3] workspace shows stable recommendation status banner hook for in-progress lifecycle states`

**File:** `tests/e2e/workspace-recommendation-status.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Implement `RecommendationStatusBanner` component with `data-testid="recommendation-status-banner"`
- [ ] Integrate banner into workspace status surface with lifecycle-to-copy mapping
- [ ] Keep messaging readable without color-only dependence
- [ ] Remove `test.skip` and run E2E scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 2.0 hours

### Test: `[P0][AC2][AC3] run list and status banner hooks remain stable for workspace automation`

**File:** `tests/e2e/workspace-recommendation-status.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Align `RecommendationRunList` status labels with canonical lifecycle mapping utility
- [ ] Keep `workspace-run-list` and `workspace-run-item` hooks stable while adding banner
- [ ] Wire workspace polling/refresh to latest lifecycle status endpoint safely
- [ ] Remove `test.skip` and run E2E scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 2.0 hours

---

## Running Tests

```bash
# Run story 2.1 API red-phase ATDD tests
pnpm exec playwright test --project=api tests/api/recommendation-lifecycle.atdd.spec.ts

# Run story 2.1 E2E red-phase ATDD tests
pnpm exec playwright test --project=chromium tests/e2e/workspace-recommendation-status.atdd.spec.ts

# Run in headed mode for E2E
pnpm exec playwright test --project=chromium tests/e2e/workspace-recommendation-status.atdd.spec.ts --headed

# Run both story 2.1 files
pnpm exec playwright test --project=api --project=chromium tests/api/recommendation-lifecycle.atdd.spec.ts tests/e2e/workspace-recommendation-status.atdd.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Failing API and E2E tests authored for Story 2.1
- ✅ Tests are guarded with `test.skip()` for intentional red-phase handoff
- ✅ Lifecycle fixture and selector contracts documented
- ✅ Implementation checklist and execution commands provided

### GREEN Phase (DEV Team - Next Steps)

1. Implement lifecycle start/status server boundaries with canonical transition guards.
2. Add deterministic test seed/reset and provider-mock seams for delay/degraded/failure lifecycle paths.
3. Add workspace status banner surface and align run-list status mapping to canonical lifecycle constants.
4. Remove `test.skip()` incrementally and run story-focused API + E2E commands until all scenarios pass.

### REFACTOR Phase

- Consolidate lifecycle status mapping across `RecommendationRunList` and new status banner component.
- Centralize lifecycle mock helpers once Story 2.x status suite stabilizes.
- Reduce duplicate auth helper logic across recommendation API test suites.

---

## Summary

- **Story ID:** 2.1
- **Primary test level:** API-first lifecycle contracts with E2E workspace status validation
- **Tests generated:** 11 total (API: 6, E2E: 5)
- **Factories added:** 1 (`recommendation-lifecycle-factory.ts`)
- **Fixture/test-data updates:** 1 (`test-data.ts` lifecycle additions)
- **Key assumptions:** start/status endpoints return normalized provider-agnostic payloads; recoverable delays expose resumable signal
- **Output file:** `_bmad-output/test-artifacts/atdd-checklist-2-1.md`
- **Knowledge fragments applied:** `data-factories`, `api-testing-patterns`, `test-quality`, `selector-resilience`, `timing-debugging`, `test-healing-patterns`
