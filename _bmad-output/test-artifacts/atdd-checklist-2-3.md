---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-04T21:02:56Z'
workflowType: testarch-atdd
inputDocuments:
  - _bmad/tea/config.yaml
  - _bmad/tea/testarch/tea-index.csv
  - _bmad-output/implementation-artifacts/2-3-generate-and-rank-limited-composed-pathway-recommendations.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - playwright.config.ts
  - package.json
  - tests/support/fixtures/factories/recommendation-lifecycle-factory.ts
  - tests/support/fixtures/test-data.ts
  - _bmad/tea/testarch/knowledge/data-factories.md
  - _bmad/tea/testarch/knowledge/component-tdd.md
  - _bmad/tea/testarch/knowledge/test-quality.md
  - _bmad/tea/testarch/knowledge/test-healing-patterns.md
  - _bmad/tea/testarch/knowledge/overview.md
  - _bmad/tea/testarch/knowledge/api-request.md
  - _bmad/tea/testarch/knowledge/auth-session.md
  - _bmad/tea/testarch/knowledge/recurse.md
  - _bmad/tea/testarch/knowledge/test-levels-framework.md
  - _bmad/tea/testarch/knowledge/test-priorities-matrix.md
  - _bmad/tea/testarch/knowledge/ci-burn-in.md
  - _bmad/tea/testarch/knowledge/pactjs-utils-overview.md
  - _bmad/tea/testarch/knowledge/pactjs-utils-consumer-helpers.md
  - _bmad/tea/testarch/knowledge/pactjs-utils-provider-verifier.md
  - _bmad/tea/testarch/knowledge/pactjs-utils-request-filter.md
  - _bmad/tea/testarch/knowledge/pact-mcp.md
---

# ATDD Checklist - Epic 2, Story 2.3: Generate and Rank Limited Composed Pathway Recommendations

**Date:** 2026-03-04
**Author:** Wesleyukadike
**Primary Test Level:** API and integration ranking contracts (backend/non-UI story)

---

## Story Summary

Story 2.3 extends recommendation processing by generating limited composed pathway candidates, ranking direct/blocked/composed candidates with deterministic metadata, and returning normalized ordered/tiered output contracts for downstream review surfaces. The story remains backend-only and keeps unsupported pathway scope exclusions enforced.

**As a** immigration user  
**I want** the system to surface viable staged routes and rank all supported options  
**So that** I can compare immediate and longer-horizon alternatives with clear fit/tier signals

---

## Acceptance Criteria

1. Generate limited composed recommendations when applicable and store them distinctly from direct-fit outcomes.
2. Rank direct/blocked/composed candidates deterministically and assign canonical tiers (`strong-fit`, `conditional-fit`, `lower-confidence`).
3. Return normalized ordered/tiered results suitable for downstream review, without raw provider internals.
4. When no composed route is available, preserve direct/blocked outcomes and emit explicit no-composed signaling.

---

## Preflight & Context (Step 1)

- **Detected stack for this story run:** `backend` (story-scoped backend/non-UI implementation)
- **Prerequisites check:** ✅ passed
  - Story exists and is `ready-for-dev`
  - Clear acceptance criteria present
  - Playwright API test framework configured (`playwright.config.ts`, `api` project)
  - Existing deterministic recommendation test scaffolding available (`tests/support/fixtures/*`)
- **Generation input mode:** API-first (no new UI surfaces in story scope)

---

## Generation Mode (Step 2)

- **Selected mode:** AI generation (no browser recording)
- **Why:** Story 2.3 is backend-only and targets server routes + orchestration + persistence contracts.

---

## Test Strategy (Step 3)

| AC | Scenario focus | Test level | Priority |
| --- | --- | --- | --- |
| AC1 | Composed candidates generated and kept distinct from direct/blocked outcomes | API + Integration | P0 |
| AC2 | Deterministic ordering + canonical tier assignment on ranked output | API + Integration | P0 |
| AC3 | Normalized response contract + owner scope + unsupported-scope exclusion | API | P0 |
| AC4 | No-composed branch keeps direct/blocked and explicit no-composed reason | API + Integration | P1 |

Red-phase rule applied: every generated ATDD test is `test.skip(...)` and asserts expected green-phase behavior.

---

## Failing Tests Created (RED Phase)

### API Tests (6 tests)

**File:** `tests/api/recommendation-ranking.atdd.spec.ts` (340 lines)

- ✅ **Test:** `[P0][AC3] unauthenticated user cannot read ranked recommendation outputs`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** results endpoint enforces authentication
- ✅ **Test:** `[P0][AC3][AC4] owner gets pending signal when ranked recommendation output has not finalized`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** explicit pending contract (`409`) before ranking finalization
- ✅ **Test:** `[P0][AC1][AC2][AC3] start processing persists ranked direct, blocked, and composed results for the run owner`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** ranked grouped outputs are persisted and retrievable
- ✅ **Test:** `[P0][AC2][AC3] ranked outputs use canonical tier labels and stable ascending rank metadata`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** deterministic rank ordering + tier taxonomy
- ✅ **Test:** `[P0][AC3] ranked result payload excludes unsupported pathway IDs and raw provider internals`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** scope guardrails and provider-internal contract safety
- ✅ **Test:** `[P1][AC4] no-composed-route scenarios keep direct/blocked outputs and emit an explicit no-composed signal`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** no-fabricated-composed behavior with explicit signaling

### Integration Tests (3 tests)

**File:** `tests/integration/recommendation-ranking.integration.spec.ts` (282 lines)

- ✅ **Test:** `[P0][AC1][AC2] composed recommendations remain distinct from direct and blocked pathways when staged routes exist`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** cross-stage persistence keeps composed pathways distinct and structured
- ✅ **Test:** `[P0][AC2][AC3] repeated start processing keeps deterministic ordering and canonical tier assignment`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** idempotent orchestration yields stable rank/tier outputs
- ✅ **Test:** `[P1][AC4] no-composed-pathway branch preserves direct/blocked outputs and emits explicit no-composed metadata`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** fallback path preserves useful outcomes without inventing composed routes

### E2E Tests (0 tests)

**Reason:** Story 2.3 is backend/non-UI by story contract; no new route/component/layout behavior is introduced.

---

## Data Factories & Fixtures Updated

### Recommendation Route Probe (Extended)

**File:** `tests/support/fixtures/factories/recommendation-lifecycle-factory.ts`

- Added `recommendationRunResultsPath(runId)` for canonical `GET /api/recommendations/runs/:runId/results` route generation.

### Recommendation Ranking Constants

**File:** `tests/support/fixtures/test-data.ts`

- Added `RECOMMENDATION_RESULT_TYPES` (`direct`, `blocked`, `composed`)
- Added `RECOMMENDATION_TIER_VALUES` (`strong-fit`, `conditional-fit`, `lower-confidence`)

---

## Mock Requirements

### Ranked Results Retrieval Contract

**Endpoint:** `GET /api/recommendations/runs/:runId/results`

**Success response (target contract):**

```json
{
  "runId": "run_story23_001",
  "profileSnapshotId": "snapshot_story23_001",
  "status": "completed",
  "results": {
    "direct": [
      {
        "pathwayId": "mvp-skilled-worker",
        "type": "direct",
        "rank": 1,
        "tier": "strong-fit",
        "score": 92
      }
    ],
    "blocked": [
      {
        "pathwayId": "mvp-provincial-nominee",
        "type": "blocked",
        "rank": 3,
        "tier": "conditional-fit",
        "score": 61
      }
    ],
    "composed": [
      {
        "pathwayId": "mvp-study-to-work",
        "type": "composed",
        "rank": 2,
        "tier": "conditional-fit",
        "score": 74,
        "composedSteps": ["study-permit", "post-grad-work"]
      }
    ]
  },
  "noComposedReason": ""
}
```

**Pending response (before finalization):**

```json
{
  "statusCode": 409,
  "statusMessage": "Recommendation ranking not ready"
}
```

---

## Required data-testid Attributes

None required for Story 2.3 (backend-only slice).

---

## Implementation Checklist

### Test: `[P0][AC1][AC2][AC3] start processing persists ranked direct, blocked, and composed results for the run owner`

**File:** `tests/api/recommendation-ranking.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Add deterministic composed-candidate generation utility (`server/utils/pathways/generateComposedPathways.ts`)
- [ ] Add deterministic rank/tier assignment utility (`server/utils/recommendations/rankRecommendationCandidates.ts`)
- [ ] Persist normalized ordered results in Convex contracts and expose owner-scoped read boundary
- [ ] Add `GET /api/recommendations/runs/:runId/results` route
- [ ] Remove `test.skip` and validate this scenario passes

**Estimated Effort:** 3.5 hours

### Test: `[P0][AC2][AC3] ranked outputs use canonical tier labels and stable ascending rank metadata`

**File:** `tests/api/recommendation-ranking.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Enforce canonical tiers (`strong-fit`, `conditional-fit`, `lower-confidence`) at ranking boundary
- [ ] Persist deterministic rank ordering metadata per candidate
- [ ] Ensure repeated-start idempotency keeps ordering stable
- [ ] Remove `test.skip` and validate rank/tier assertions

**Estimated Effort:** 2.0 hours

### Test: `[P1][AC4] no-composed-route scenarios keep direct/blocked outputs and emit an explicit no-composed signal`

**File:** `tests/api/recommendation-ranking.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Add no-composed branch in orchestration with explicit signal field
- [ ] Preserve valid direct/blocked outputs in fallback branch
- [ ] Prevent fabricated composed candidates when unsupported
- [ ] Remove `test.skip` and validate no-composed assertions

**Estimated Effort:** 1.5 hours

### Test: `[P0][AC2][AC3] repeated start processing keeps deterministic ordering and canonical tier assignment`

**File:** `tests/integration/recommendation-ranking.integration.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Wire start orchestration stage to reuse persisted ranked outputs on repeated calls
- [ ] Guarantee deterministic score/rank/tier derivation across equivalent inputs
- [ ] Verify integration payload stability for direct/blocked/composed groups
- [ ] Remove `test.skip` and validate integration stability assertions

**Estimated Effort:** 2.0 hours

---

## Running Tests

```bash
# List Story 2.3 ATDD tests (parse/collection validation)
pnpm exec playwright test --project=api tests/api/recommendation-ranking.atdd.spec.ts tests/integration/recommendation-ranking.integration.spec.ts --list

# Run Story 2.3 API red-phase suite (all skipped until implementation)
pnpm exec playwright test --project=api tests/api/recommendation-ranking.atdd.spec.ts

# Run Story 2.3 integration red-phase suite (all skipped until implementation)
pnpm exec playwright test --project=api tests/integration/recommendation-ranking.integration.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Story 2.3 API and integration tests authored for expected ranking/composed behavior
- ✅ All generated tests are intentionally red-guarded using `test.skip(...)`
- ✅ Backend-only scope preserved (no E2E generation)
- ✅ Temp subagent artifacts written to:
  - `_bmad-output/test-artifacts/atdd-temp/tea-atdd-api-tests-2026-03-04T21-02-50Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/tea-atdd-e2e-tests-2026-03-04T21-02-50Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/tea-atdd-summary-2026-03-04T21-02-50Z.json`

### GREEN Phase (DEV Team - Next Steps)

1. Implement composed generation + ranking/tiering server utilities.
2. Extend persistence model and run orchestration to finalize ranked outputs.
3. Implement owner-scoped ranked results retrieval API.
4. Remove `test.skip()` incrementally and run API/integration suites to green.

### REFACTOR Phase

- Consolidate shared recommendation-result contract types between server and tests.
- Reuse updated route probe helpers to avoid endpoint-string duplication.
- Keep deterministic fixtures and seed/reset controls aligned with Story 2.1/2.2 patterns.

---

## Validation & Completion (Step 5)

Validation checklist status:

- ✅ Prerequisites satisfied
- ✅ Test files created and parse-validated via Playwright `--list`
- ✅ Tests marked as red-phase (`test.skip`) and expectation assertions are non-placeholder
- ✅ Output checklist generated at `_bmad-output/test-artifacts/atdd-checklist-2-3.md`
- ✅ Temp artifacts stored under `_bmad-output/test-artifacts/atdd-temp/`
- ✅ No CLI browser sessions opened (no cleanup required)

---

## Summary

- **Story ID:** 2.3
- **Primary test level:** API + integration ranking contracts
- **Tests generated:** 9 total (API: 6, Integration: 3, E2E: 0)
- **Fixture/contract updates:** 2 files
- **Key assumptions:** ranked-results endpoint remains owner-scoped and normalized by type/rank/tier
- **Output file:** `_bmad-output/test-artifacts/atdd-checklist-2-3.md`
- **Knowledge fragments applied:** `data-factories`, `component-tdd`, `test-quality`, `test-healing-patterns`, `overview`, `api-request`, `auth-session`, `recurse`, `test-levels-framework`, `test-priorities-matrix`, `ci-burn-in`, `pactjs-utils-*`, `pact-mcp`
