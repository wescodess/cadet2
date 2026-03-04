---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-04T20:07:00Z'
workflowType: testarch-atdd
inputDocuments:
  - _bmad/tea/config.yaml
  - _bmad/tea/testarch/tea-index.csv
  - _bmad-output/implementation-artifacts/2-2-evaluate-direct-and-blocked-pathways-in-the-mvp-pathway-set.md
  - playwright.config.ts
  - package.json
  - convex/schema.ts
  - convex/recommendationRuns.ts
  - server/api/recommendations/runs/[runId]/start.post.ts
  - server/api/recommendations/runs/[runId]/status.get.ts
  - server/api/recommendations/testing/seed.post.ts
  - server/api/recommendations/testing/reset.post.ts
  - tests/support/fixtures/factories/recommendation-lifecycle-factory.ts
  - tests/support/fixtures/test-data.ts
---

# ATDD Checklist - Epic 2, Story 2.2: Evaluate Direct and Blocked Pathways in the MVP Pathway Set

**Date:** 2026-03-04
**Author:** Wesleyukadike
**Primary Test Level:** API and integration pathway-evaluation contracts (no new UI surface in this story)

---

## Story Summary

Story 2.2 adds deterministic pathway eligibility evaluation so recommendation runs can return both currently viable (`direct`) and near-fit non-viable (`blocked`) pathways. It persists pathway outcomes per run and introduces a user-scoped retrieval contract limited to the supported MVP pathway inventory.

**As a** immigration user  
**I want** the system to evaluate direct and blocked pathways in the supported MVP set  
**So that** I still receive meaningful guidance when I am not yet eligible for the strongest option

---

## Acceptance Criteria

1. Recommendation processing identifies currently viable direct pathways and near-fit blocked/conditional pathways for the supported MVP inventory.
2. Missing conditions classify pathways as not currently viable (`blocked`) with unmet-condition details preserved for downstream explanation.
3. Evaluation output remains constrained to supported MVP pathways and never implies unsupported coverage.

---

## Failing Tests Created (RED Phase)

### API Tests (5 tests)

**File:** `tests/api/recommendation-pathway-evaluation.atdd.spec.ts`

- ✅ **Test:** `[P0][AC2][AC3] unauthenticated user cannot read pathway evaluation outputs`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** pathway output endpoint requires authenticated session
- ✅ **Test:** `[P0][AC1] start processing persists direct and blocked pathway groups for the run owner`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** start processing writes pathway artifacts retrievable by run owner
- ✅ **Test:** `[P0][AC2] blocked pathways include unmet conditions and never appear in direct results`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** blocked classification contract and unmet-condition preservation
- ✅ **Test:** `[P0][AC3] pathway outputs stay within supported MVP inventory and exclude unsupported pathways`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** strict supported-scope enforcement
- ✅ **Test:** `[P1][AC1][AC2] repeated start requests keep pathway evaluation output deterministic and idempotent`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** idempotent start behavior does not duplicate or drift pathway output

### Integration Tests (3 tests)

**File:** `tests/integration/recommendation-pathway-evaluation.integration.spec.ts`

- ✅ **Test:** `[P0][AC1][AC2] pathway evaluation artifacts stay linked to runId and profileSnapshotId across processing boundaries`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** run linkage integrity for persisted pathway outcomes
- ✅ **Test:** `[P0][AC2] missing-condition scenarios remain blocked with unmet-condition details available for downstream explanation`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** missing-condition handling survives start→read integration flow
- ✅ **Test:** `[P1][AC3] no-strong-fit runs return only supported blocked outcomes and exclude unsupported pathway domains`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** no-strong-fit behavior still stays inside MVP supported scope

### E2E Tests (0 tests)

**Reason:** Story 2.2 is backend/non-UI per story context; no new route/component/layout surface is introduced.

---

## Data Factories Created

### Recommendation Pathway Constants

**File:** `tests/support/fixtures/test-data.ts`

**Added constants:**

- `RECOMMENDATION_PATHWAY_STATUSES` - allowed pathway statuses in this story slice (`direct`, `blocked`)
- `RECOMMENDATION_PATHWAY_SUPPORTED_IDS` - current MVP-supported pathway IDs for scope assertions
- `RECOMMENDATION_PATHWAY_UNSUPPORTED_IDS` - known out-of-scope IDs for leakage guardrails

---

## Fixtures Created

### Recommendation Lifecycle Route Probe (Extended)

**File:** `tests/support/fixtures/factories/recommendation-lifecycle-factory.ts`

**Added route helper:**

- `recommendationRunPathwaysPath(runId)` - canonical `GET /api/recommendations/runs/[runId]/pathways` path builder

---

## Mock Requirements

### Pathway Retrieval Contract

**Endpoint:** `GET /api/recommendations/runs/:runId/pathways`

**Success Response (target contract):**

```json
{
  "runId": "run_story22_001",
  "profileSnapshotId": "snapshot_story22_001",
  "direct": [
    {
      "pathwayId": "mvp-skilled-worker",
      "status": "direct"
    }
  ],
  "blocked": [
    {
      "pathwayId": "mvp-provincial-nominee",
      "status": "blocked",
      "unmetConditions": ["minimum-language-threshold"]
    }
  ]
}
```

**Failure Response (missing/not owned):**

```json
{
  "statusCode": 404,
  "statusMessage": "Recommendation run not found"
}
```

---

## Required data-testid Attributes

None required for Story 2.2 (backend-only slice; no new UI artifact).

---

## Implementation Checklist

### Test: `[P0][AC1] start processing persists direct and blocked pathway groups for the run owner`

**File:** `tests/api/recommendation-pathway-evaluation.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Add deterministic evaluator + MVP pathway catalog (`server/utils/pathways/*`)
- [ ] Wire evaluator into `POST /api/recommendations/runs/:runId/start` orchestration
- [ ] Persist pathway outcomes linked to `runId`, `userId`, `profileSnapshotId`
- [ ] Add `GET /api/recommendations/runs/:runId/pathways` route
- [ ] Remove `test.skip` and run API scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 3.0 hours

### Test: `[P0][AC2] blocked pathways include unmet conditions and never appear in direct results`

**File:** `tests/api/recommendation-pathway-evaluation.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Encode missing-condition rules in evaluator and output contract
- [ ] Ensure blocked outcomes contain non-empty `unmetConditions`
- [ ] Prevent blocked pathway IDs from appearing in direct group
- [ ] Remove `test.skip` and run API scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 2.0 hours

### Test: `[P0][AC3] pathway outputs stay within supported MVP inventory and exclude unsupported pathways`

**File:** `tests/api/recommendation-pathway-evaluation.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Restrict evaluation source to `mvpPathwayCatalog`
- [ ] Enforce API response scope filter for unsupported pathways
- [ ] Add regression guards for unsupported IDs
- [ ] Remove `test.skip` and run API scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 1.5 hours

### Test: `[P0][AC1][AC2] pathway evaluation artifacts stay linked to runId and profileSnapshotId across processing boundaries`

**File:** `tests/integration/recommendation-pathway-evaluation.integration.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Persist and query pathway artifacts using run linkage fields
- [ ] Keep lifecycle handoff compatibility from Story 2.1
- [ ] Ensure start→pathways integration returns stable linkage payload
- [ ] Remove `test.skip` and run integration scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 2.0 hours

---

## Running Tests

```bash
# Run Story 2.2 API ATDD red-phase tests
pnpm exec playwright test --project=api tests/api/recommendation-pathway-evaluation.atdd.spec.ts

# Run Story 2.2 integration ATDD red-phase tests
pnpm exec playwright test --project=api tests/integration/recommendation-pathway-evaluation.integration.spec.ts

# Run all Story 2.2 ATDD files together
pnpm exec playwright test --project=api tests/api/recommendation-pathway-evaluation.atdd.spec.ts tests/integration/recommendation-pathway-evaluation.integration.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Story 2.2 API and integration tests authored for expected behavior
- ✅ All generated tests are intentionally red-guarded with `test.skip()`
- ✅ Scope guardrails for supported vs unsupported pathways documented
- ✅ Backend-only slice confirmed (no E2E/UI additions)

### GREEN Phase (DEV Team - Next Steps)

1. Implement deterministic direct/blocked evaluator and MVP catalog.
2. Persist pathway artifacts in Convex with user-scoped run linkage.
3. Add pathways retrieval route with normalized direct/blocked contract.
4. Remove `test.skip()` gradually and run API/integration commands until green.

### REFACTOR Phase

- Consolidate pathway contract types between server and tests.
- Reuse lifecycle + pathway fixture helpers to reduce duplication across Story 2.x.
- Keep provider-agnostic response boundaries ahead of ranking stories (2.3/2.4).

---

## Summary

- **Story ID:** 2.2
- **Primary test level:** API/integration (backend pathway evaluation)
- **Tests generated:** 8 total (API: 5, Integration: 3, E2E: 0)
- **Fixtures/constants updated:** 2 files
- **Key assumptions:** pathways retrieval endpoint is run/user-scoped and emits normalized `direct`/`blocked` groups
- **Output file:** `_bmad-output/test-artifacts/atdd-checklist-2-2.md`
- **Knowledge fragments applied:** `data-factories`, `test-quality`, `selector-resilience`, `timing-debugging`, `test-healing-patterns`, `api-request`, `playwright-cli`
