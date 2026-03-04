---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-03T17:24:18Z'
workflowType: testarch-atdd
inputDocuments:
  - _bmad/tea/config.yaml
  - _bmad/tea/testarch/tea-index.csv
  - _bmad-output/implementation-artifacts/1-3-capture-constraints-and-free-form-context.md
  - playwright.config.ts
  - package.json
  - app/pages/workspace/intake.vue
  - app/components/intake/IntakeSectionFields.vue
  - server/api/intake/draft.post.ts
  - server/api/intake/draft.get.ts
  - server/utils/intake/intakeSchemas.ts
  - server/utils/intake/normalizeIntakePayload.ts
  - tests/support/fixtures/index.ts
  - tests/support/helpers/auth-provider.ts
  - tests/support/helpers/network.ts
---

# ATDD Checklist - Epic 1, Story 1.3: Capture Constraints and Free-Form Context

**Date:** 2026-03-03
**Author:** Wesleyukadike
**Primary Test Level:** E2E (with API draft-boundary checks)

---

## Story Summary

Story 1.3 extends the intake `goals` stage so users can provide explicit planning constraints and optional free-form context, then edit those values later without restarting the flow. It also reinforces that narrative context stays within authenticated draft scope.

**As a** immigration user  
**I want** to add priorities, constraints, and extra context to my intake profile  
**So that** recommendations reflect my real situation instead of a shallow checklist

---

## Acceptance Criteria

1. Planning preferences and context capture supports structured priorities (timeline, cost, location flexibility, study/relocation willingness) plus free-form context.
2. Returning users can edit saved constraints/context in-place and persist updates to the same draft.
3. Optional free-form context remains inside authorized workspace-owned draft access and is not leaked elsewhere.
4. Controls remain readable/focusable on smaller screens and keyboard navigation, with helper text explaining recommendation value.

---

## Failing Tests Created (RED Phase)

### E2E Tests (5 tests)

**File:** `tests/e2e/intake-constraints-context.atdd.spec.ts`

- ✅ **Test:** `[P0][AC3] guest is redirected to auth when opening intake route`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Unauthorized intake access is blocked
- ✅ **Test:** `[P0][AC1][AC4] goals stage shows structured constraints and helper text`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Timeline/cost/priority/study/context controls and explanatory text are visible
- ✅ **Test:** `[P0][AC1][AC2] user can save edited constraints and free-form context with immediate feedback`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Save round-trip and feedback semantics for goals updates
- ✅ **Test:** `[P0][AC2] returning user sees edited goals values after reload`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Revisit/edit loop hydrates latest saved goals values
- ✅ **Test:** `[P1][AC4] mobile controls stay readable and keyboard-operable on goals stage`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Mobile action controls are visible, touch-safe, and keyboard operable

### API Tests (5 tests)

**File:** `tests/api/intake-constraints-context.atdd.spec.ts`

- ✅ **Test:** `[P0][AC3] unauthenticated user cannot save planning constraints or free-form context`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** `POST /api/intake/draft` denies unauthenticated updates
- ✅ **Test:** `[P0][AC1][AC2] goals constraints and free-form context save with stable response shape`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Save response remains `{status, savedAt, currentSection, values}` and echoes goals payload
- ✅ **Test:** `[P0][AC2] editing saved goals constraints updates the same draft in place`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Update + retrieval returns latest goals values
- ✅ **Test:** `[P0][AC3] draft payload rejects recommendation or audit leakage fields`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Validation blocks out-of-scope persistence fields
- ✅ **Test:** `[P1][AC3] draft retrieval excludes owner identifiers and unrelated entities`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Response does not leak owner identifiers or recommendation/audit entities

---

## Data Factories Created

### Intake Goals Constraints Factory Additions

**File:** `tests/support/fixtures/factories/intake-draft-factory.ts`

**Exports:**

- `createGoalsConstraintsValues(overrides?)` - deterministic goals-section values for constraints/context scenarios
- `createGoalsDraftPayload(overrides?)` - goals-stage draft payload with section-progress defaults
- `createGoalsUpdateFixture()` - paired initial/updated goals values for edit-resave tests

---

## Fixtures Created

### Intake Constraints Test Contracts

**File:** `tests/support/fixtures/test-data.ts`

**Added constants:**

- `INTAKE_CONSTRAINTS_ATDD_FIELD_LABELS` - stable labels used for goals-stage selectors
- `INTAKE_CONSTRAINTS_ATDD_HELPER_TEXT_SNIPPETS` - helper copy expectations tied to recommendation-quality guidance
- `INTAKE_CONSTRAINTS_ATDD_TEST_IDS` - selector contract for section heading/save feedback/mobile action controls

---

## Mock Requirements

### Goals Draft Hydration Contract

**Endpoint:** `GET /api/intake/draft`

**Success Response:**

```json
{
  "status": "ok",
  "savedAt": "2026-03-03T17:24:18Z",
  "currentSection": "goals",
  "values": {
    "goals": {
      "targetTimelineMonths": 12,
      "budgetCad": 18000,
      "priorityPreference": "lowest-cost",
      "willingToStudyOrRetrain": "yes",
      "additionalContext": "I can relocate outside Ontario if processing is faster."
    }
  }
}
```

### Goals Draft Save Contract

**Endpoint:** `POST /api/intake/draft`

**Success Response:**

```json
{
  "status": "saved",
  "savedAt": "2026-03-03T17:24:18Z",
  "currentSection": "goals",
  "values": {
    "goals": {
      "targetTimelineMonths": 6,
      "budgetCad": 22000,
      "priorityPreference": "fastest-timeline",
      "additionalContext": "I can study in Manitoba if it shortens processing time."
    }
  }
}
```

**Failure Response:**

```json
{
  "statusCode": 400,
  "statusMessage": "Invalid payload"
}
```

---

## Required data-testid Attributes

- `intake-section-heading` - active goals-stage heading for hydration assertions
- `intake-save` - desktop save action
- `intake-save-feedback` - immediate save status region
- `intake-save-mobile` - mobile save action
- `intake-next-mobile` - mobile next action
- `intake-previous-mobile` - mobile previous action

---

## Implementation Checklist

### Test: `[P0][AC1][AC4] goals stage shows structured constraints and helper text`

**File:** `tests/e2e/intake-constraints-context.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Ensure goals-stage fields map exactly to timeline/cost/priority/study/context requirements
- [ ] Keep helper copy visible and semantically linked to each control
- [ ] Preserve stable labels/test IDs used by ATDD selectors
- [ ] Remove `test.skip` and run the scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 1.5 hours

### Test: `[P0][AC2] editing saved goals constraints updates the same draft in place`

**File:** `tests/api/intake-constraints-context.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Normalize goals payload shape in intake schema + normalization utilities
- [ ] Keep idempotent `POST /api/intake/draft` update semantics for existing drafts
- [ ] Ensure `GET /api/intake/draft` hydrates latest edited goals values
- [ ] Remove `test.skip` and run API scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 2.0 hours

### Test: `[P0][AC3] draft payload rejects recommendation or audit leakage fields`

**File:** `tests/api/intake-constraints-context.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Enforce strict intake-draft boundary validation for out-of-scope entities
- [ ] Keep workspace-owner gate via `requireWorkspaceUserSession`
- [ ] Verify response contracts never expose recommendation/audit data in this story
- [ ] Remove `test.skip` and run API scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 1.0 hours

### Test: `[P1][AC4] mobile controls stay readable and keyboard-operable on goals stage`

**File:** `tests/e2e/intake-constraints-context.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Validate mobile action controls keep minimum 44x44 touch target sizing
- [ ] Ensure keyboard focus and activation remain functional for goals controls
- [ ] Keep save feedback visible after keyboard-triggered actions
- [ ] Remove `test.skip` and run scenario in headed/mobile mode
- [ ] ✅ Scenario passes

**Estimated Effort:** 1.0 hours

---

## Running Tests

```bash
# Run red-phase Story 1.3 E2E ATDD tests
pnpm exec playwright test tests/e2e/intake-constraints-context.atdd.spec.ts

# Run red-phase Story 1.3 API ATDD tests
pnpm exec playwright test tests/api/intake-constraints-context.atdd.spec.ts --project=api

# Headed E2E run for interaction debugging
pnpm exec playwright test tests/e2e/intake-constraints-context.atdd.spec.ts --headed

# Debug Story 1.3 E2E flow
pnpm exec playwright test tests/e2e/intake-constraints-context.atdd.spec.ts --debug
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- Story 1.3 ATDD scenarios were generated for both API and E2E boundaries.
- Every scenario is intentionally marked with `test.skip` to preserve red-phase behavior before implementation.
- Assertions define expected behavior (not placeholders), ready to drive green implementation.

### GREEN Phase (DEV Team)

1. Remove `test.skip` from one P0 scenario at a time.
2. Implement the minimum code to satisfy that scenario.
3. Re-run the scenario and confirm it passes.
4. Continue through remaining P0 then P1 scenarios.

### REFACTOR Phase (DEV Team)

1. Consolidate goals-stage field contracts and normalization logic.
2. Keep selectors/helper text stable for automation and accessibility.
3. Re-run full intake API + E2E suites after each refactor change.

---

## Key Risks / Assumptions

- Existing draft API currently validates structural shape; story acceptance requires tightening goals normalization to enforce intended constraints semantics.
- Labels and helper copy are used as automation contracts; major wording changes should update test constants in lockstep.
- Mobile action controls are tested via current fixed-bottom action bar selectors.

---

## Next Recommended Workflow

- Implement Story 1.3 via `bmad-bmm-dev-story` using this checklist as the RED handoff.
- After implementation, run `bmad-tea-testarch-automate` to broaden regression depth beyond ATDD coverage.

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
- `auth-session.md`
- `intercept-network-call.md`
- `network-recorder.md`
- `network-error-monitor.md`
- `fixtures-composition.md`
- `playwright-cli.md`
