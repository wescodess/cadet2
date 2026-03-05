---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-05T09:00:23Z'
workflowType: testarch-atdd
inputDocuments:
  - _bmad/tea/config.yaml
  - _bmad/tea/testarch/tea-index.csv
  - _bmad-output/implementation-artifacts/2-4-safely-qualify-weak-results-and-support-recommendation-refresh.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - playwright.config.ts
  - package.json
  - server/api/recommendations/runs/[runId]/start.post.ts
  - server/api/recommendations/runs/[runId]/results.get.ts
  - server/api/recommendations/runs/[runId]/status.get.ts
  - server/utils/recommendations/generateRankedRecommendations.ts
  - server/utils/recommendations/lifecycle.ts
  - convex/recommendationRuns.ts
  - convex/schema.ts
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

# ATDD Checklist - Epic 2, Story 2.4: Safely Qualify Weak Results and Support Recommendation Refresh

**Date:** 2026-03-05
**Author:** Wesleyukadike
**Primary Test Level:** API and integration contracts for qualification/degradation and refresh lifecycle continuity

---

## Story Summary

Story 2.4 introduces trust qualification for weak recommendation outputs and adds explicit refresh/re-run support after profile updates. The scope is backend-only and extends the Story 2.3 ranked-output pipeline with degraded/failed safeguards, qualification metadata, and run lineage continuity.

**As a** immigration user  
**I want** weak recommendation outputs to be qualified and my run to be refreshable after profile changes  
**So that** I can trust the system to adapt without overstating certainty

---

## Acceptance Criteria

1. Weak evidence/rule/fit outputs are qualified, downgraded, or withheld; runs finalize as `degraded` or `failed` safely; every degraded/withheld result includes explicit confidence/freshness/caveat metadata.
2. Refresh/re-run after profile updates creates/updates a recommendation evaluation against the latest profile state and remains distinguishable from prior run state.
3. Dependency/retrieval failures fail safely with canonical lifecycle status and user-safe recovery messaging; no misleading strong-fit output is exposed.

---

## Preflight & Context (Step 1)

- **Detected stack for this story run:** `backend` (story-scoped backend/non-UI execution)
- **Prerequisites check:** ✅ passed
  - Story exists and is `ready-for-dev`
  - Clear acceptance criteria present
  - Playwright API/integration project configured in `playwright.config.ts`
  - Deterministic recommendation seed/reset utilities available
- **Knowledge fragments loaded:** core + backend + Playwright utils API profile + Pact utility fragments (see `inputDocuments`)

---

## Generation Mode (Step 2)

- **Selected mode:** AI generation
- **Why:** Story 2.4 has no new UI routes/components; acceptance criteria are API/lifecycle contract centric.

---

## Test Strategy (Step 3)

| AC | Scenario focus | Test level | Priority |
| --- | --- | --- | --- |
| AC1 | Weak-evidence qualification metadata and degraded/withheld exposure | API + Integration | P0 |
| AC2 | Refresh endpoint behavior, run lineage, and distinguishability | API + Integration | P0 |
| AC3 | Safe-failure terminal behavior and recovery messaging | API + Integration | P1 |

Red-phase rule applied: all generated Story 2.4 tests use `test.skip(...)` and assert expected green-phase behavior.

---

## Failing Tests Created (RED Phase)

### API Tests (6 tests)

**File:** `tests/api/recommendation-qualification.atdd.spec.ts` (298 lines)

- ✅ **Test:** `[P0][AC1] weak-evidence runs are finalized as degraded and expose confidence/freshness/caveat metadata`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** degraded finalization + per-candidate qualification metadata contract
- ✅ **Test:** `[P0][AC1] degraded or withheld recommendations are explicit and never silently dropped from results payloads`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** explicit low-confidence/withheld representation in results contract
- ✅ **Test:** `[P1][AC3] no-trustworthy scenarios fail safely with retry guidance and never surface strong-fit recommendations`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** safe failure semantics and anti-misleading output guardrails

**File:** `tests/api/recommendation-refresh.atdd.spec.ts` (195 lines)

- ✅ **Test:** `[P0][AC2] refresh creates a new evaluation linked to the previous run`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** refresh creates a new run and preserves linkage metadata
- ✅ **Test:** `[P0][AC2] refresh keeps previous run distinguishable while tracking latest profile linkage`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** prior run immutability + refreshed run distinguishability
- ✅ **Test:** `[P1][AC2][AC3] refresh rejects unknown or non-owned run identifiers`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** owner scoping and safe rejection behavior

### Integration Tests (5 tests)

**File:** `tests/integration/recommendation-qualification.integration.spec.ts` (257 lines)

- ✅ **Test:** `[P0][AC1][AC3] degraded qualification state persists across start, status, and results contracts`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** end-to-end lifecycle continuity for degraded qualification output
- ✅ **Test:** `[P1][AC3] safe-failure path keeps failed runs user-safe and avoids strong-fit exposure`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** failed-state messaging and safe output semantics through integration boundaries

**File:** `tests/integration/recommendation-refresh.integration.spec.ts` (191 lines)

- ✅ **Test:** `[P0][AC2] refresh flow creates a new linked run while preserving source run history`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** refresh lineage + source history continuity
- ✅ **Test:** `[P1][AC2] consecutive refreshes create a traceable chain of run lineage metadata`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** chained refresh metadata continuity
- ✅ **Test:** `[P1][AC2][AC3] refresh remains owner-scoped and rejects unknown/non-owned runs`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** authorization and unknown-run safeguards

### E2E Tests (0 tests)

**Reason:** Story 2.4 is backend/non-UI by story contract.

---

## Data Factories & Fixtures Updated

### Recommendation Route Probe (Extended)

**File:** `tests/support/fixtures/factories/recommendation-lifecycle-factory.ts`

- Added `recommendationRunRefreshPath(runId)` helper for canonical refresh route generation.

### Recommendation Qualification Constants

**File:** `tests/support/fixtures/test-data.ts`

- Added `RECOMMENDATION_QUALIFICATION_LEVELS` (`supported`, `low-confidence`, `withheld`)
- Added `RECOMMENDATION_CONFIDENCE_LEVELS` (`high`, `medium`, `low`, `withheld`)
- Added `RECOMMENDATION_FRESHNESS_LEVELS` (`fresh`, `stale`, `unknown`)

---

## Mock Requirements

### Refresh Contract

**Endpoint:** `POST /api/recommendations/runs/:runId/refresh`

**Expected success contract (target):**

```json
{
  "runId": "run_story24_refresh_002",
  "profileSnapshotId": "snapshot_story24_refresh_002",
  "status": "queued",
  "refreshedFromRunId": "run_story24_refresh_001",
  "previousProfileSnapshotId": "snapshot_story24_refresh_001",
  "createdAt": "2026-03-05T09:00:23.000Z",
  "updatedAt": "2026-03-05T09:00:23.000Z"
}
```

### Qualified Results Contract

**Endpoint:** `GET /api/recommendations/runs/:runId/results`

**Expected qualified candidate fields (target):**

```json
{
  "pathwayId": "mvp-skilled-worker",
  "type": "direct",
  "rank": 1,
  "tier": "conditional-fit",
  "score": 72,
  "confidence": "low",
  "freshness": "stale",
  "qualification": "low-confidence",
  "caveat": "Evidence is incomplete for high-confidence scoring."
}
```

---

## Required data-testid Attributes

None required for Story 2.4 (backend-only slice).

---

## Implementation Checklist

### Test Group: Qualification Metadata + Safe Finalization

**Files:**
- `tests/api/recommendation-qualification.atdd.spec.ts`
- `tests/integration/recommendation-qualification.integration.spec.ts`

**Tasks to make tests pass (green run):**

- [ ] Add qualification layer (`server/utils/recommendations/qualifyWeakRecommendationResults.ts`) to classify supported vs low-confidence vs withheld
- [ ] Extend Convex schema/run contracts with confidence/freshness/qualification/caveat candidate metadata
- [ ] Apply degraded/failed finalization semantics in recommendation orchestration before terminal state commit
- [ ] Ensure failed paths do not expose misleading strong-fit outputs
- [ ] Remove `test.skip()` from qualification tests and validate to green

**Estimated Effort:** 4.0 hours

### Test Group: Refresh/Re-run Lineage

**Files:**
- `tests/api/recommendation-refresh.atdd.spec.ts`
- `tests/integration/recommendation-refresh.integration.spec.ts`

**Tasks to make tests pass (green run):**

- [ ] Add refresh route: `POST /api/recommendations/runs/:runId/refresh`
- [ ] Enforce owner-scoped access guards for refresh operations
- [ ] Persist refresh lineage metadata (`refreshedFromRunId`, previous snapshot linkage)
- [ ] Preserve source-run immutability while creating distinguishable refreshed runs
- [ ] Remove `test.skip()` from refresh tests and validate to green

**Estimated Effort:** 3.0 hours

---

## Running Tests

```bash
# Validate Story 2.4 files are collected
pnpm exec playwright test --project=api tests/api/recommendation-qualification.atdd.spec.ts tests/api/recommendation-refresh.atdd.spec.ts tests/integration/recommendation-qualification.integration.spec.ts tests/integration/recommendation-refresh.integration.spec.ts --list

# Story 2.4 API red-phase tests (all intentionally skipped)
pnpm exec playwright test --project=api tests/api/recommendation-qualification.atdd.spec.ts tests/api/recommendation-refresh.atdd.spec.ts

# Story 2.4 integration red-phase tests (all intentionally skipped)
pnpm exec playwright test --project=api tests/integration/recommendation-qualification.integration.spec.ts tests/integration/recommendation-refresh.integration.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Story 2.4 API and integration tests authored with expected future qualification/refresh behavior
- ✅ All tests intentionally red-guarded using `test.skip(...)`
- ✅ Backend-only story scope preserved (no E2E generation)
- ✅ ATDD temp artifacts generated:
  - `_bmad-output/test-artifacts/atdd-temp/tea-atdd-api-tests-2026-03-05T09-00-23Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/tea-atdd-e2e-tests-2026-03-05T09-00-23Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/tea-atdd-summary-2026-03-05T09-00-23Z.json`

### GREEN Phase (DEV Team - Next Steps)

1. Implement qualification metadata and safe finalization semantics in recommendation orchestration.
2. Add refresh endpoint and run-lineage persistence behavior.
3. Remove `test.skip()` incrementally and drive each scenario to green.

### REFACTOR Phase

- Consolidate qualification metadata types across server, Convex validators, and tests.
- Keep refresh lineage contracts normalized and provider-agnostic at API boundaries.
- Reuse deterministic seed/reset controls for stable regression coverage.
