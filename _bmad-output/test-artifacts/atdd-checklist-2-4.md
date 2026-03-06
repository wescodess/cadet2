---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-06T02:45:58Z'
workflowType: testarch-atdd
inputDocuments:
  - _bmad/tea/config.yaml
  - _bmad/tea/testarch/tea-index.csv
  - _bmad-output/implementation-artifacts/2-4-safely-qualify-weak-results-and-support-recommendation-refresh.md
  - playwright.config.ts
  - package.json
  - tests/api/recommendation-qualification.atdd.spec.ts
  - tests/api/recommendation-refresh.atdd.spec.ts
  - tests/integration/recommendation-qualification.integration.spec.ts
  - tests/integration/recommendation-refresh.integration.spec.ts
  - _bmad/tea/testarch/knowledge/data-factories.md
  - _bmad/tea/testarch/knowledge/component-tdd.md
  - _bmad/tea/testarch/knowledge/test-quality.md
  - _bmad/tea/testarch/knowledge/test-healing-patterns.md
  - _bmad/tea/testarch/knowledge/selector-resilience.md
  - _bmad/tea/testarch/knowledge/timing-debugging.md
  - _bmad/tea/testarch/knowledge/overview.md
  - _bmad/tea/testarch/knowledge/api-request.md
  - _bmad/tea/testarch/knowledge/network-recorder.md
  - _bmad/tea/testarch/knowledge/auth-session.md
  - _bmad/tea/testarch/knowledge/intercept-network-call.md
  - _bmad/tea/testarch/knowledge/recurse.md
  - _bmad/tea/testarch/knowledge/log.md
  - _bmad/tea/testarch/knowledge/file-utils.md
  - _bmad/tea/testarch/knowledge/network-error-monitor.md
  - _bmad/tea/testarch/knowledge/fixtures-composition.md
  - _bmad/tea/testarch/knowledge/playwright-cli.md
---

# ATDD Checklist - Epic 2, Story 2.4: Safely Qualify Weak Results and Support Recommendation Refresh

**Date:** 2026-03-06
**Author:** Wesleyukadike
**Primary Test Level:** API and integration contracts for qualification/degradation and refresh lifecycle continuity

---

## Story Summary

Story 2.4 introduces trust qualification for weak recommendation outputs and explicit refresh/re-run behavior after profile updates. This run generated dedicated RED-phase test files without overwriting existing green implementation test files.

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

- **Detected stack:** `frontend` (Nuxt + Playwright project), with backend API/integration coverage selected by story scope.
- **Prerequisites check:** ✅ passed
  - Story file exists and has explicit acceptance criteria
  - Playwright config and API project present
  - Existing recommendation fixtures/helpers present in `tests/support/fixtures`
- **Knowledge loading:** core + frontend resiliency + Playwright utils + CLI fragment set loaded from TEA knowledge index.

---

## Generation Mode (Step 2)

- **Selected mode:** AI generation
- **Why:** Story 2.4 is backend/non-UI by story contract; no additional UI route or component implementation is required.

---

## Test Strategy (Step 3)

| AC | Scenario focus | Test level | Priority |
| --- | --- | --- | --- |
| AC1 | Weak-evidence qualification metadata and degraded/withheld exposure | API + Integration | P0 |
| AC2 | Refresh endpoint behavior, run lineage, and distinguishability | API + Integration | P0 |
| AC3 | Safe-failure terminal behavior and recovery messaging | API + Integration | P1 |

RED-phase rule applied: all generated Story 2.4 tests use `test.skip(...)` and assert expected green-phase behavior.

---

## Failing Tests Created (RED Phase)

### API Tests (6 tests)

**File:** `tests/api/recommendation-qualification.red.atdd.spec.ts` (329 lines)

- ✅ `[P0][AC1]` weak-evidence runs are finalized as degraded and expose confidence/freshness/caveat metadata
- ✅ `[P0][AC1]` degraded or withheld recommendations are explicit and never silently dropped from results payloads
- ✅ `[P1][AC3]` no-trustworthy scenarios fail safely with retry guidance and never surface strong-fit recommendations

**File:** `tests/api/recommendation-refresh.red.atdd.spec.ts` (198 lines)

- ✅ `[P0][AC2]` refresh creates a new evaluation linked to the previous run
- ✅ `[P0][AC2]` refresh keeps previous run distinguishable while tracking latest profile linkage
- ✅ `[P1][AC2][AC3]` refresh rejects unknown or non-owned run identifiers

### Integration Tests (6 tests)

**File:** `tests/integration/recommendation-qualification.red.integration.spec.ts` (342 lines)

- ✅ `[P0][AC1][AC3]` degraded qualification state persists across start, status, and results contracts
- ✅ `[P1][AC3]` safe-failure path keeps failed runs user-safe and avoids strong-fit exposure
- ✅ `[P1][AC3]` dependency/retrieval failures set failed status and return terminal-safe empty results payload

**File:** `tests/integration/recommendation-refresh.red.integration.spec.ts` (195 lines)

- ✅ `[P0][AC2]` refresh flow creates a new linked run while preserving source run history
- ✅ `[P1][AC2]` consecutive refreshes create a traceable chain of run lineage metadata
- ✅ `[P1][AC2][AC3]` refresh remains owner-scoped and rejects unknown/non-owned runs

### E2E Tests (0 tests)

**Reason:** Story 2.4 is backend/non-UI by story contract.

---

## Data Factories & Fixtures

No new fixture/factory file required for this RED run. Existing recommendation lifecycle helpers and constants were reused.

Fixture needs tracked for green phase:

- `recommendationRunRefreshPath` route probe continuity
- qualification metadata constants (`confidence`, `freshness`, `qualification`)

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
  "previousProfileSnapshotId": "snapshot_story24_refresh_001"
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

- `tests/api/recommendation-qualification.red.atdd.spec.ts`
- `tests/integration/recommendation-qualification.red.integration.spec.ts`

**Tasks to make tests pass (green run):**

- [ ] Implement qualification layer and metadata contract persistence
- [ ] Enforce degraded/failed finalization semantics before terminal commit
- [ ] Ensure failed paths never surface misleading `strong-fit` outcomes
- [ ] Remove `test.skip()` from red files and run targeted API+integration tests

**Estimated Effort:** 4.0 hours

### Test Group: Refresh/Re-run Lineage

**Files:**

- `tests/api/recommendation-refresh.red.atdd.spec.ts`
- `tests/integration/recommendation-refresh.red.integration.spec.ts`

**Tasks to make tests pass (green run):**

- [ ] Enforce owner-scoped refresh route behavior and latest profile linkage
- [ ] Persist and verify refresh lineage continuity fields
- [ ] Preserve source-run distinguishability and historical immutability
- [ ] Remove `test.skip()` from red files and run targeted API+integration tests

**Estimated Effort:** 3.0 hours

---

## Running Tests

```bash
# Run all Story 2.4 red-phase test files
pnpm exec playwright test --project=api \
  tests/api/recommendation-qualification.red.atdd.spec.ts \
  tests/api/recommendation-refresh.red.atdd.spec.ts \
  tests/integration/recommendation-qualification.red.integration.spec.ts \
  tests/integration/recommendation-refresh.red.integration.spec.ts

# Run specific red file
pnpm exec playwright test --project=api tests/api/recommendation-qualification.red.atdd.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Failing tests generated as `test.skip(...)`
- ✅ AC-to-test mapping documented
- ✅ Refresh/qualification contracts captured

### GREEN Phase (DEV Next)

1. Remove `test.skip(...)` one test at a time
2. Implement minimum code to satisfy that test
3. Run the specific file until green
4. Repeat for remaining tests

### REFACTOR Phase

1. Run the full Story 2.4 suite green
2. Remove duplication and tighten shared helpers
3. Keep tests deterministic and isolated

---

## Validation & Completion (Step 5)

- ✅ Checklist validated against ATDD workflow criteria
- ✅ Duplicate sections removed and output normalized
- ✅ Temp artifacts stored in `_bmad-output/test-artifacts/atdd-temp/`
- ✅ No CLI session artifacts left open for this run

### Completion Summary

- **Test files created:** 4 red-phase files
- **Total red tests generated:** 12
- **Checklist output path:** `_bmad-output/test-artifacts/atdd-checklist-2-4.md`
- **Temp outputs:**
  - `_bmad-output/test-artifacts/atdd-temp/tea-atdd-api-tests-2026-03-06T02-45-58Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/tea-atdd-e2e-tests-2026-03-06T02-45-58Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/tea-atdd-summary-2026-03-06T02-45-58Z.json`
- **Risks/assumptions:** story marked done, so red-phase files were created with `.red.*` names to avoid clobbering existing green tests.
- **Recommended next workflow:** `dev-story` (implement/validate against red files), then optional `test-review`.

---

## Knowledge Base References Applied

- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`
- `overview.md`
- `api-request.md`
- `network-recorder.md`
- `auth-session.md`
- `intercept-network-call.md`
- `recurse.md`
- `log.md`
- `file-utils.md`
- `network-error-monitor.md`
- `fixtures-composition.md`
- `playwright-cli.md`
