---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-07T11:52:44Z'
workflowType: testarch-atdd
inputDocuments:
  - _bmad/tea/config.yaml
  - _bmad/tea/testarch/tea-index.csv
  - _bmad-output/implementation-artifacts/3-2-surface-blockers-tradeoffs-and-improvement-actions.md
  - playwright.config.ts
  - package.json
  - tests/api/recommendation-pathway-evaluation.atdd.spec.ts
  - tests/integration/recommendation-pathway-evaluation.integration.spec.ts
  - tests/e2e/workspace-recommendation-status.atdd.spec.ts
  - app/components/workspace/RecommendationResultsPanel.vue
  - server/api/recommendations/runs/[runId]/results.get.ts
  - convex/schema.ts
  - convex/recommendationRuns.ts
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
  - _bmad/tea/testarch/knowledge/pact-mcp.md
---

# ATDD Checklist - Epic 3, Story 3.2: Surface Blockers, Tradeoffs, and Improvement Actions

**Date:** 2026-03-07
**Author:** Wesleyukadike
**Primary Test Level:** API + Integration contracts with E2E UI verification hooks

---

## Story Summary

Story 3.2 requires recommendation outputs to expose three separate explanation modules: factual blockers, actionable improvement actions, and comparable tradeoffs. This ATDD run created red-phase tests with `test.skip(...)` so implementation can move test-by-test through green phase.

**As a** immigration user  
**I want** blockers, actions, and tradeoffs surfaced clearly for each pathway  
**So that** I can make informed decisions instead of reading opaque pass/fail output

---

## Acceptance Criteria

1. Recommendation detail surfaces understandable blockers/weaknesses/missing conditions.
2. Recommendation detail includes concrete improvement actions and keeps them distinct from factual blockers.
3. Multi-option comparison includes visible effort/timing/complexity tradeoffs.

---

## Preflight & Context (Step 1)

- **Detected stack:** `frontend` (Nuxt + Playwright, with API and integration suites under Playwright `api` project).
- **Prerequisites check:** ✅ passed
  - Story 3.2 file exists and contains clear, testable ACs.
  - Playwright config exists and defines `chromium` + `api` projects.
  - Existing recommendation lifecycle seed/reset and route probe helpers are available.
- **Knowledge loading:** core + frontend + Playwright Utils + CLI profile loaded from TEA knowledge index.
- **Contract gap confirmed:** current schema/API/component contracts do not yet expose `blockers`, `tradeoffs`, or `improvementActions` fields.

---

## Generation Mode (Step 2)

- **Selected mode:** AI generation
- **Why:** Story 3.2 ACs are explicit, existing recommendation test patterns are mature, and deterministic route mocking already exists for workspace recommendation review.
- **Browser recording:** skipped (not required for this run).

---

## Test Strategy (Step 3)

| AC | Scenario focus | Test level | Priority |
| --- | --- | --- | --- |
| AC1 | Factual blocker module presence and shape per recommendation candidate | API + Integration + E2E | P0 |
| AC2 | Separation between blocker facts and improvement actions | API + Integration + E2E | P0 |
| AC3 | Tradeoff module comparability (effort/timing/complexity) across options | API + Integration + E2E | P0 |

RED-phase rule applied: all generated Story 3.2 tests use `test.skip(...)` and assert expected green-phase behavior.

---

## Failing Tests Created (RED Phase)

### API Tests (3 tests)

**File:** `tests/api/recommendation-explanations.red.atdd.spec.ts` (335 lines)

- ✅ `[P0][AC1]` results include factual blocker modules per candidate when constraints are unresolved
- ✅ `[P0][AC2]` actions are present and semantically distinct from factual blockers
- ✅ `[P0][AC3]` tradeoffs include explicit effort/timing/complexity dimensions for comparison

### Integration Tests (3 tests)

**File:** `tests/integration/recommendation-explanations.red.integration.spec.ts` (309 lines)

- ✅ `[P0][AC1][AC2]` blocker/action modules persist through status/results reads
- ✅ `[P0][AC3]` tradeoff modules remain available across direct/blocked/composed collections
- ✅ `[P1][AC1][AC2]` persisted contract keeps blocker facts and action directives non-overlapping

### E2E Tests (3 tests)

**File:** `tests/e2e/workspace-recommendation-explanations.red.atdd.spec.ts` (418 lines)

- ✅ `[P0][AC1][AC2]` workspace review renders blockers and improvement actions as separate surfaces
- ✅ `[P0][AC3]` workspace comparison renders explicit tradeoff dimensions
- ✅ `[P1][AC1][AC2][AC3]` stable text-first hooks for blocker severity, tradeoff impact, and action priority

---

## Data Factories & Fixtures

No new fixture/factory files were added in this RED pass.

Fixture needs tracked for green phase:

- `recommendationRunSeedWithExplanationModules`
- `recommendationResultsContractAssertions`
- `workspaceRecommendationExplanationRouteMock`
- stable test-id hooks for explanation modules

---

## Mock Requirements

### Recommendation Results Contract (Story 3.2 target)

**Endpoint:** `GET /api/recommendations/runs/:runId/results`

**Expected new candidate module shape (target):**

```json
{
  "blockers": [
    {
      "id": "language-threshold",
      "label": "Language threshold",
      "detail": "Current CLB score is below benchmark.",
      "severity": "high"
    }
  ],
  "tradeoffs": [
    {
      "id": "timing-window",
      "dimension": "timing",
      "summary": "Faster submission increases risk of refusal.",
      "impact": "high"
    }
  ],
  "improvementActions": [
    {
      "id": "raise-language-score",
      "title": "Raise language score",
      "detail": "Retake exam and upload score evidence.",
      "priority": "now",
      "expectedImpact": "Moves pathway from conditional to supported."
    }
  ]
}
```

---

## Required data-testid Attributes

### Workspace Recommendation Review (Story 3.2 target)

- `recommendation-blockers-panel` - container for factual blockers
- `recommendation-tradeoffs-panel` - container for tradeoff comparisons
- `recommendation-actions-queue` - container for action queue items

These hooks are asserted in E2E red tests and should be implemented in green phase.

---

## Implementation Checklist

### Test Group: API + Integration Explanation Module Contract

**Files:**

- `tests/api/recommendation-explanations.red.atdd.spec.ts`
- `tests/integration/recommendation-explanations.red.integration.spec.ts`

**Tasks to make tests pass (green run):**

- [ ] Extend recommendation candidate schema/contracts with `blockers`, `tradeoffs`, `improvementActions`
- [ ] Persist explanation modules in Convex recommendation result storage
- [ ] Map explanation modules through `results.get` response contract
- [ ] Guarantee blocker vs action semantic separation in persisted and returned payloads
- [ ] Remove `test.skip()` and run API + integration files

**Estimated Effort:** 4.5 hours

### Test Group: Workspace UI Explanation Rendering

**File:**

- `tests/e2e/workspace-recommendation-explanations.red.atdd.spec.ts`

**Tasks to make tests pass (green run):**

- [ ] Render blockers/tradeoffs/actions in `RecommendationResultsPanel` (or extracted modules)
- [ ] Add required stable `data-testid` hooks
- [ ] Preserve non-color-only text semantics for severity/impact/priority
- [ ] Keep mobile/desktop parity aligned to approved `Comparison Workspace` design package
- [ ] Remove `test.skip()` and run E2E file

**Estimated Effort:** 3.0 hours

---

## Running Tests

```bash
# Run Story 3.2 red-phase files (currently skipped by design)
pnpm exec playwright test --project=api \
  tests/api/recommendation-explanations.red.atdd.spec.ts \
  tests/integration/recommendation-explanations.red.integration.spec.ts

pnpm exec playwright test --project=chromium \
  tests/e2e/workspace-recommendation-explanations.red.atdd.spec.ts

# List tests for quick structure verification
pnpm exec playwright test --list tests/api/recommendation-explanations.red.atdd.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Story 3.2 coverage generated across API, integration, and E2E surfaces
- ✅ All tests intentionally gated with `test.skip(...)`
- ✅ Assertions capture expected green-phase contract and UI behavior

### GREEN Phase (DEV Next)

1. Remove `test.skip(...)` one test at a time.
2. Implement minimum code to satisfy that test.
3. Run the specific file until green.
4. Continue until all Story 3.2 tests are green.

### REFACTOR Phase

1. Consolidate duplicated explanation-module mapping logic.
2. Keep selectors stable and deterministic.
3. Re-run full recommendation suites for regression safety.

---

## Validation & Completion (Step 5)

- ✅ Checklist validated against ATDD workflow criteria
- ✅ Outputs consolidated without duplication
- ✅ Temp artifacts stored under `_bmad-output/test-artifacts/atdd-temp/`
- ✅ No browser automation session cleanup required (recording mode not used)

### Completion Summary

- **Test files created:** 3 red-phase files
- **Total red tests generated:** 9
- **Checklist output path:** `_bmad-output/test-artifacts/atdd-checklist-3-2.md`
- **Temp outputs:**
  - `_bmad-output/test-artifacts/atdd-temp/tea-atdd-api-tests-2026-03-07T11-52-44Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/tea-atdd-e2e-tests-2026-03-07T11-52-44Z.json`
  - `_bmad-output/test-artifacts/atdd-temp/tea-atdd-summary-2026-03-07T11-52-44Z.json`
- **Risks/assumptions:** schema/API/UI contract fields for explanation modules are not yet implemented, so these tests are intentionally red-gated.
- **Recommended next workflow:** `dev-story` for Story 3.2 implementation, then optional `test-review`.

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
- `pact-mcp.md`
