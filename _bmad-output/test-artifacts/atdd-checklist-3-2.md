---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-09T07:10:08Z'
workflowType: testarch-atdd
inputDocuments:
  - _bmad-output/implementation-artifacts/3-2-surface-blockers-tradeoffs-and-improvement-actions.md
  - package.json
  - playwright.config.ts
  - tests/README.md
  - tests/api/recommendation-explanations.atdd.spec.ts
  - tests/e2e/workspace-recommendation-explanations.atdd.spec.ts
  - tests/integration/recommendation-explanations.integration.spec.ts
  - tests/support/fixtures/index.ts
  - tests/support/fixtures/test-data.ts
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

# ATDD Checklist - Epic 3, Story 3.2: Surface Blockers, Tradeoffs, and Improvement Actions

**Date:** 2026-03-09
**Author:** Wesleyukadike
**Primary Test Level:** E2E

## Story Summary

Story 3.2 expands workspace recommendations so users can inspect factual blockers, compare route tradeoffs, and review concrete next actions instead of receiving only an opaque recommendation rank. The red-phase acceptance coverage below protects both the normalized API contract and the workspace comparison UI so the explanation modules stay explicit, comparable, and semantically separated.

**As a** immigration user  
**I want** to see blockers, tradeoffs, and improvement actions for each pathway  
**So that** I can make better pathway decisions with clear rationale instead of pass-or-fail output

## Acceptance Criteria

1. Given a recommendation has unmet conditions or reduced fit, when I inspect that pathway, then the product shows the blockers, weaknesses, or missing conditions affecting the recommendation and those blockers are understandable constraints rather than hidden logic.
2. Given a pathway could become stronger with user action, when the recommendation detail is shown, then the product includes concrete actions that may improve eligibility and those actions remain distinct from factual blocker information.
3. Given multiple recommendation options are available, when I compare them, then each option includes visible tradeoffs such as effort, timing, or strategic complexity and the comparison helps me understand what I gain or accept by choosing one route over another.

## Failing Tests Created (RED Phase)

### E2E Tests (3 tests)

**File:** `tests/e2e/workspace-recommendation-explanations.atdd.spec.ts`

- ✅ **Test:** `[P0][AC1][AC2] workspace renders blockers separately from prioritized improvement actions`
  - **Status:** Implemented in the current green suite
  - **Verifies:** blocker panel and action queue render as distinct surfaces with readable explanation copy
- ✅ **Test:** `[P0][AC3] workspace comparison view renders explicit effort, timing, and complexity tradeoffs per pathway`
  - **Status:** Implemented in the current green suite
  - **Verifies:** comparison surface exposes visible tradeoff language for multiple recommendation options
- ✅ **Test:** `[P1][AC1][AC2][AC3] workspace exposes stable hooks for blocker, tradeoff, and action modules`
  - **Status:** Implemented in the current green suite
  - **Verifies:** durable `data-testid` hooks remain available for blockers, tradeoffs, actions, and tier badge surfaces

### API Tests (3 tests)

**File:** `tests/api/recommendation-explanations.atdd.spec.ts`

- ✅ **Test:** `[P0][AC1] unresolved recommendation candidates expose factual blocker modules`
  - **Status:** Implemented in the current green suite
  - **Verifies:** blockers are present, readable, and severity-tagged in recommendation results
- ✅ **Test:** `[P0][AC2] recommendation actions remain separate from blocker facts and include expected impact`
  - **Status:** Implemented in the current green suite
  - **Verifies:** action payloads stay separate from blocker ids/labels and include explicit expected impact
- ✅ **Test:** `[P0][AC3] recommendation options expose explicit effort, timing, and complexity tradeoffs for comparison`
  - **Status:** Implemented in the current green suite
  - **Verifies:** each recommendation option exposes tradeoff dimensions required for comparison

### Component Tests (0 tests)

**File:** `N/A`

- No dedicated component-test artifact was generated in this workflow.
- Risk calculation: API + E2E coverage was the highest-value pair for this story because the acceptance criteria span normalized result contracts and workspace rendering behavior.

## Data Factories Created

### Current Fixture Approach

**Files:** `tests/api/recommendation-explanations.atdd.spec.ts`, `tests/e2e/workspace-recommendation-explanations.atdd.spec.ts`

- Story 3.2 now keeps its acceptance-test fixture builders inline with the green API and E2E specs.
- The earlier standalone red-phase factory file was retired after the tests were promoted into the maintained suite.

## Fixtures Created

### Reused Shared Playwright Fixtures

**File:** `tests/support/fixtures/index.ts`

**Fixtures:**

- `test` - merged Playwright entrypoint combining `apiRequest`, auth-session, network monitoring, and project fixtures
  - **Setup:** merges shared fixtures through `mergeTests`
  - **Provides:** authenticated `request` and `page` contexts for both API and E2E red specs
  - **Cleanup:** delegated to existing auth-session and project fixture teardown

**Example Usage:**

```typescript
test.use({
  authSessionEnabled: true,
  authOptions: recommendationExplanationAuthTestUser,
})
```

## Mock Requirements

### Workspace Recommendation Run List Mock

**Endpoint:** `GET /api/workspace/recommendation-runs`

**Success Response:**

```json
{
  "runId": "story32-e2e-run-123",
  "profileSnapshotId": "story32-e2e-snapshot-123",
  "status": "completed"
}
```

**Failure Response:**

```json
{
  "statusCode": 500,
  "message": "Recommendation run list unavailable"
}
```

**Notes:** Must be registered before `page.goto('/workspace')` to avoid a race with workspace bootstrapping.

### Workspace Recommendation Results Mock

**Endpoint:** `GET /api/recommendations/runs/:runId/results`

**Success Response:**

```json
{
  "status": "completed",
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
  "statusCode": 404,
  "message": "Recommendation results not found"
}
```

**Notes:** Mocked payloads must include blockers, tradeoffs, and actions so the red E2E suite asserts UI semantics rather than backend generation.

## Required data-testid Attributes

### Recommendation Workspace Review

- `recommendation-results-panel` - top-level recommendation review container
- `recommendation-result-item` - individual pathway result card
- `recommendation-blockers-panel` - factual blocker section for a pathway
- `recommendation-tradeoffs-panel` - comparison tradeoff section for a pathway
- `recommendation-actions-queue` - prioritized action list for a pathway
- `recommendation-tier-badge` - recommendation status/tier summary

**Implementation Example:**

```tsx
<section data-testid="recommendation-results-panel">
  <div data-testid="recommendation-result-item">
    <section data-testid="recommendation-blockers-panel" />
    <section data-testid="recommendation-tradeoffs-panel" />
    <section data-testid="recommendation-actions-queue" />
  </div>
</section>
```

## Implementation Checklist

### Test: `[P0][AC1] unresolved recommendation candidates expose factual blocker modules`

**File:** `tests/api/recommendation-explanations.atdd.spec.ts`

**Tasks completed in the maintained suite:**

- [ ] Normalize blocker arrays in recommendation results for unresolved candidates
- [ ] Ensure blocker entries contain `id`, `label`, `detail`, and `severity`
- [ ] Keep supported candidates free of blocker entries
- [ ] Run test: `pnpm exec playwright test tests/api/recommendation-explanations.atdd.spec.ts --project=api`

**Estimated Effort:** 1.0 hours

### Test: `[P0][AC2] recommendation actions remain separate from blocker facts and include expected impact`

**File:** `tests/api/recommendation-explanations.atdd.spec.ts`

**Tasks completed in the maintained suite:**

- [ ] Persist and return `improvementActions[]` separately from `blockers[]`
- [ ] Ensure actions have `title`, `detail`, `priority`, and `expectedImpact`
- [ ] Prevent blocker ids/labels from being reused as action ids/titles
- [ ] Run test: `pnpm exec playwright test tests/api/recommendation-explanations.atdd.spec.ts --project=api`

**Estimated Effort:** 1.0 hours

### Test: `[P0][AC3] recommendation options expose explicit effort, timing, and complexity tradeoffs for comparison`

**File:** `tests/api/recommendation-explanations.atdd.spec.ts`

**Tasks completed in the maintained suite:**

- [ ] Return tradeoff entries for compared recommendation candidates
- [ ] Guarantee `effort`, `timing`, and `complexity` dimensions are populated
- [ ] Keep tradeoff summaries readable and impact-tagged
- [ ] Run test: `pnpm exec playwright test tests/api/recommendation-explanations.atdd.spec.ts --project=api`

**Estimated Effort:** 1.0 hours

### Test: `[P0][AC1][AC2] workspace renders blockers separately from prioritized improvement actions`

**File:** `tests/e2e/workspace-recommendation-explanations.atdd.spec.ts`

**Tasks completed in the maintained suite:**

- [ ] Render a visible blockers panel inside each recommendation result item
- [ ] Render a separate improvement-action queue instead of blending action copy into blocker text
- [ ] Preserve readable section headings and user-facing explanation text
- [ ] Add required data-testid attributes: `recommendation-results-panel`, `recommendation-blockers-panel`, `recommendation-actions-queue`
- [ ] Run test: `pnpm exec playwright test tests/e2e/workspace-recommendation-explanations.atdd.spec.ts --project=chromium`

**Estimated Effort:** 1.5 hours

### Test: `[P0][AC3] workspace comparison view renders explicit effort, timing, and complexity tradeoffs per pathway`

**File:** `tests/e2e/workspace-recommendation-explanations.atdd.spec.ts`

**Tasks completed in the maintained suite:**

- [ ] Render tradeoff panel content for direct, blocked, and composed pathways
- [ ] Keep effort, timing, and complexity wording visible for side-by-side comparison
- [ ] Ensure multiple pathway result cards remain visible in the comparison workspace
- [ ] Add required data-testid attributes: `recommendation-result-item`, `recommendation-tradeoffs-panel`
- [ ] Run test: `pnpm exec playwright test tests/e2e/workspace-recommendation-explanations.atdd.spec.ts --project=chromium`

**Estimated Effort:** 1.5 hours

### Test: `[P1][AC1][AC2][AC3] workspace exposes stable hooks for blocker, tradeoff, and action modules`

**File:** `tests/e2e/workspace-recommendation-explanations.atdd.spec.ts`

**Tasks completed in the maintained suite:**

- [ ] Keep stable `data-testid` contracts on blocker, tradeoff, action, and tier surfaces
- [ ] Preserve accessibility-friendly section boundaries and semantic labels
- [ ] Avoid coupling acceptance coverage to brittle CSS selectors
- [ ] Add required data-testid attributes: `recommendation-tier-badge`
- [ ] Run test: `pnpm exec playwright test tests/e2e/workspace-recommendation-explanations.atdd.spec.ts --project=chromium`

**Estimated Effort:** 1.0 hours

## Running Tests

```bash
# Run Story 3.2 maintained tests
pnpm exec playwright test tests/api/recommendation-explanations.atdd.spec.ts tests/e2e/workspace-recommendation-explanations.atdd.spec.ts --project=api --project=chromium

# Run API suite only
pnpm exec playwright test tests/api/recommendation-explanations.atdd.spec.ts --project=api

# Run E2E suite only
pnpm exec playwright test tests/e2e/workspace-recommendation-explanations.atdd.spec.ts --project=chromium

# Run E2E suite headed
pnpm exec playwright test tests/e2e/workspace-recommendation-explanations.atdd.spec.ts --project=chromium --headed

# Debug E2E suite
pnpm exec playwright test tests/e2e/workspace-recommendation-explanations.atdd.spec.ts --project=chromium --debug
```

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ Story 3.2 API acceptance spec maintained
- ✅ Story 3.2 E2E acceptance spec maintained
- ✅ Shared red-only factory retired after consolidation into the maintained specs
- ✅ Stable hook requirements documented
- ✅ Implementation checklist created

**Verification:**

- Historical red-phase artifact; current maintained files are `tests/api/recommendation-explanations.atdd.spec.ts` and `tests/e2e/workspace-recommendation-explanations.atdd.spec.ts`

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. Remove `test.skip()` from one Story 3.2 test at a time.
2. Implement the minimal server or UI change required for that test to pass.
3. Re-run the targeted Playwright command for that spec.
4. Repeat until all Story 3.2 red tests pass.

**Key Principles:**

- One acceptance slice at a time
- Prefer server contract fixes before UI polish
- Keep blocker facts, tradeoffs, and actions semantically separated

## Completion Summary

- Story ID: `3.2`
- Primary test level: `E2E`
- Test files created:
  - `tests/api/recommendation-explanations.atdd.spec.ts`
  - `tests/e2e/workspace-recommendation-explanations.atdd.spec.ts`
- Test counts:
  - API: `3`
  - E2E: `3`
  - Total: `6`
- Output file: `_bmad-output/test-artifacts/atdd-checklist-3-2.md`
- Key assumptions:
  - existing merged Playwright fixtures remain the shared execution entrypoint
  - stable workspace test ids stay part of the product contract
  - route stubs remain sufficient for UI acceptance isolation during the red phase
- Knowledge base references applied:
  - `data-factories.md`
  - `test-quality.md`
  - `selector-resilience.md`
  - `timing-debugging.md`
  - `api-request.md`
  - `fixtures-composition.md`
