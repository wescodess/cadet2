---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-10'
workflowType: testarch-atdd
inputDocuments:
  - _bmad-output/implementation-artifacts/4-1-generate-a-clear-next-step-plan-from-recommendations.md
  - package.json
  - playwright.config.ts
  - tests/api/recommendation-citations.atdd.spec.ts
  - tests/e2e/workspace-recommendation-citations.atdd.spec.ts
  - tests/support/fixtures/index.ts
  - tests/support/fixtures/test-data.ts
  - app/components/recommendations/NextActionQueue.vue
  - app/components/recommendations/PathwayComparisonCard.vue
  - app/lib/recommendations/comparison.ts
  - server/api/recommendations/runs/[runId]/results.get.ts
  - server/utils/recommendations/buildRecommendationRationale.ts
  - _bmad/tea/testarch/knowledge/data-factories.md
  - _bmad/tea/testarch/knowledge/test-quality.md
  - _bmad/tea/testarch/knowledge/selector-resilience.md
  - _bmad/tea/testarch/knowledge/api-request.md
  - _bmad/tea/testarch/knowledge/fixtures-composition.md
  - _bmad/tea/testarch/knowledge/playwright-cli.md
---

# ATDD Checklist - Epic 4, Story 4.1: Generate a Clear Next-Step Plan from Recommendations

**Date:** 2026-03-10
**Author:** Wesleyukadike
**Primary Test Level:** API + E2E

---

## Story Summary

Story 4.1 extends the existing recommendation comparison workspace so every ranked pathway exposes a practical next-step plan. The plan must stay recommendation-specific, reflect blockers and trust limits, and remain readable on both desktop and mobile without inventing a parallel planning surface.

**As a** immigration user
**I want** each recommendation to include a practical next-step plan
**So that** I can move from understanding my options to taking action

---

## Acceptance Criteria

1. Given I open a completed recommendation run When I inspect a recommendation Then the product shows a clear next-step plan tied to that recommendation And the next steps are phrased as concrete user actions rather than abstract guidance.
2. Given multiple recommendations are available When I review their action plans Then each recommendation presents its own next-step guidance And the guidance remains aligned with that pathway's fit, blockers, and tradeoffs.
3. Given a recommendation is low-confidence or blocked When a next-step plan is shown Then the plan reflects the limitations of that pathway And the product does not imply a stronger course of action than the recommendation supports.

---

## Preflight and Strategy

- Detected stack: `frontend` with Nuxt + Playwright.
- Test framework: Playwright projects for `chromium` and `api`.
- Generation mode: AI generation.
- Why AI generation: ACs are explicit, current recommendation API/E2E patterns already exist, and no browser recording is required to define the red-phase contract.
- Existing patterns reused:
  - authenticated API seeding/reset helpers from recommendation ATDD suites
  - workspace route mocking from recommendation E2E suites
  - shared `tests/support/fixtures` wrapper and recommendation test-data constants

### Scenario-to-level mapping

- `AC1` -> API contract test for `nextStepPlan` payload shape and E2E rendering test for visible summary + ordered actions.
- `AC2` -> API test for recommendation-specific plan variance and E2E test for per-card plan isolation.
- `AC3` -> API test for limitation/caution language and E2E tests for visible limitation text plus mobile disclosure behavior.

### Red-phase rules applied

- All generated tests use `test.skip(...)`.
- Assertions describe expected final behavior, not placeholder truthiness.
- Selectors rely on `data-testid` or role-driven access, not CSS classes.

---

## Failing Tests Created (RED Phase)

### API Tests (3 tests)

**File:** `tests/api/recommendation-next-step-plan.atdd.spec.ts`

- ✅ **Test:** `[P0][AC1] recommendation results expose a next-step plan with summary framing and ordered concrete user actions`
  - **Status:** RED via `test.skip()` until `nextStepPlan` exists on recommendation results.
  - **Verifies:** presence of a summary, ordered steps, concrete action phrasing, and canonical `now/next/later` priorities.
- ✅ **Test:** `[P0][AC2] multiple recommendations keep recommendation-specific action plans rather than collapsing into a generic checklist`
  - **Status:** RED via `test.skip()` until pathway-aware plan shaping is implemented.
  - **Verifies:** plan summaries vary per recommendation and composed routes keep staged sequencing.
- ✅ **Test:** `[P0][AC3] blocked or low-confidence recommendations include limitation language that tempers the action plan`
  - **Status:** RED via `test.skip()` until limitation text is normalized in the server contract.
  - **Verifies:** blocked or weaker recommendations carry visible caution text and avoid overconfident action copy.

### E2E Tests (4 tests)

**File:** `tests/e2e/workspace-recommendation-next-step-plan.atdd.spec.ts`

- ✅ **Test:** `[P0][AC1] workspace renders a concrete next-step plan with summary framing and ordered steps inside each recommendation card`
  - **Status:** RED via `test.skip()` until the UI renders the new plan surface.
  - **Verifies:** visible plan container, summary text, and ordered action items in the recommendation card.
- ✅ **Test:** `[P0][AC2] each recommendation card keeps its own next-step plan instead of sharing generic workspace guidance`
  - **Status:** RED via `test.skip()` until per-card plan rendering exists.
  - **Verifies:** direct, blocked, and composed cards expose distinct plan summaries.
- ✅ **Test:** `[P0][AC3] blocked or low-confidence pathways render visible limitation text with the plan so the action copy does not overstate certainty`
  - **Status:** RED via `test.skip()` until limitation text is rendered in the plan UI.
  - **Verifies:** limitation messaging is visible text, not implied only by tone or layout.
- ✅ **Test:** `[P1][AC3] mobile next-step plans stay keyboard reachable through progressive disclosure before revealing the ordered steps`
  - **Status:** RED via `test.skip()` until mobile disclosure behavior is implemented.
  - **Verifies:** disclosure toggle uses `aria-expanded` and reveals the plan items on mobile.

### Component Tests (0 tests)

**File:** `N/A`

- Story 4.1 red-phase coverage stays at API + E2E because the contract shape and recommendation-card integration carry the highest risk.

---

## Data Factories Created

### Recommendation Next-Step Plan Factory

**File:** `tests/support/fixtures/factories/recommendation-next-step-plan-factory.ts`

**Exports:**

- `createRecommendationNextStepPlanIds(prefix)` - deterministic run/profile IDs for Story 4.1 API tests
- `createRecommendationNextStepPlan()` - summary + ordered steps + limitation shape
- `createCandidateWithNextStepPlan()` - direct recommendation fixture with a concrete action plan
- `createBlockedCandidateWithNextStepPlan()` - blocked/low-confidence fixture with limitation language
- `createComposedCandidateWithNextStepPlan()` - staged long-horizon fixture with ordered milestones
- `createRecommendationNextStepPlanEvaluationPayload()` - input payload for server-side API red tests

---

## Fixtures Created

No new custom Playwright fixture file was required.

**Reused infrastructure:**

- `tests/support/fixtures/index.ts` for merged Playwright fixtures
- authenticated request/session helpers embedded in the new specs
- workspace route mocking pattern reused from existing recommendation E2E suites

---

## Mock Requirements

### Recommendation Workspace Results Mock

**Endpoints:**

- `GET /api/workspace/recommendation-runs`
- `GET /api/recommendations/runs/:runId/status`
- `POST /api/recommendations/runs/:runId/start`
- `GET /api/recommendations/runs/:runId/results`

**Success Response Requirements:**

- recommendation candidates include `nextStepPlan.summary`
- recommendation candidates include `nextStepPlan.steps[]`
- blocked/low-confidence routes include `nextStepPlan.limitation`
- comparison metadata remains intact so the existing workspace layout still renders

**Failure Notes:**

- this ATDD package assumes the current BMAD red-phase pattern of skipped tests rather than active failing network assertions
- no browser recording was needed because the plan surface extends an existing card layout

---

## Required data-testid Attributes

### Recommendation Next-Step Plan Surface

- `recommendation-next-step-plan` - container for the plan section on each recommendation card
- `recommendation-next-step-item` - each ordered action item inside a plan
- `recommendation-next-step-summary` - summary framing text for the plan
- `recommendation-next-step-limitation` - visible limitation/caution text for blocked or weaker recommendations
- `recommendation-next-step-toggle` - mobile disclosure control for expanding/collapsing plan details

---

## Implementation Checklist

### Test: API contract exposes recommendation-specific next-step plan payloads

**File:** `tests/api/recommendation-next-step-plan.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Add `RecommendationNextStepPlan` and ordered step types to the server and client recommendation contracts.
- [ ] Derive the plan from existing explanation inputs instead of duplicating action logic in Vue.
- [ ] Populate the payload for direct, blocked, and composed recommendations in `results.get.ts`.
- [ ] Preserve current comparison, citation, trust-boundary, freshness, and qualification fields.
- [ ] Run test: `pnpm exec playwright test tests/api/recommendation-next-step-plan.atdd.spec.ts --project=api`
- [ ] Remove `test.skip()` and confirm the tests pass.

**Estimated Effort:** 3-4 hours

### Test: E2E workspace renders per-card next-step plans

**File:** `tests/e2e/workspace-recommendation-next-step-plan.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Extend `NextActionQueue.vue` into the normalized next-step plan UI instead of creating a duplicate panel.
- [ ] Add `recommendation-next-step-plan`, `recommendation-next-step-item`, `recommendation-next-step-summary`, and `recommendation-next-step-limitation` hooks.
- [ ] Add mobile disclosure behavior with `recommendation-next-step-toggle` and `aria-expanded`.
- [ ] Render limitation text as visible copy for blocked or weaker recommendations.
- [ ] Run test: `pnpm exec playwright test tests/e2e/workspace-recommendation-next-step-plan.atdd.spec.ts --project=chromium`
- [ ] Remove `test.skip()` and confirm the tests pass.

**Estimated Effort:** 3-4 hours

---

## Running Tests

```bash
# Collect the new API ATDD spec
pnpm exec playwright test tests/api/recommendation-next-step-plan.atdd.spec.ts --project=api --list

# Collect the new E2E ATDD spec
pnpm exec playwright test tests/e2e/workspace-recommendation-next-step-plan.atdd.spec.ts --project=chromium --list

# After implementation, run the API spec
pnpm exec playwright test tests/api/recommendation-next-step-plan.atdd.spec.ts --project=api

# After implementation, run the E2E spec
pnpm exec playwright test tests/e2e/workspace-recommendation-next-step-plan.atdd.spec.ts --project=chromium
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete)

- ✅ Story 4.1 acceptance criteria mapped to API and E2E tests
- ✅ New tests written with `test.skip()`
- ✅ Supporting next-step-plan data factory created
- ✅ Required UI hooks documented for implementation

### GREEN Phase (Next)

1. Add the `nextStepPlan` server/client contract.
2. Shape plan data on the server from blockers, tradeoffs, improvement actions, and pathway type.
3. Render the plan in each recommendation card and support mobile disclosure.
4. Remove `test.skip()` and run the new API and E2E specs.

### REFACTOR Phase (After Green)

1. Consolidate duplicated action logic between `improvementActions` and `nextStepPlan`.
2. Revisit copy quality and sequencing for blocked vs direct vs composed pathways.
3. Add integration coverage once the red-phase contract is green.

---

## Key Risks and Assumptions

- The current recommendation results contract does not yet expose `nextStepPlan`, so these tests intentionally model the target shape.
- Mobile disclosure semantics require an implementation decision; this ATDD package assumes a dedicated toggle hook for stable automation.
- The repo already exposes recommendation trust and citation surfaces, so Story 4.1 should stay additive rather than restructuring the workspace.

---

## Knowledge Base References Applied

- `data-factories.md` for reusable, story-scoped plan fixtures
- `test-quality.md` for atomic expectations and deterministic red-phase assertions
- `selector-resilience.md` for stable test-id and role-based UI selectors
- `api-request.md` for request-driven API contract coverage patterns
- `fixtures-composition.md` for reusing the merged Playwright fixture wrapper
- `playwright-cli.md` reviewed for optional recording, but AI generation was chosen because the UI extension is well-specified
