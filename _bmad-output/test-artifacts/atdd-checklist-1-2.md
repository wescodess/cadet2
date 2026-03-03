---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-03T08:57:09Z'
workflowType: testarch-atdd
inputDocuments:
  - _bmad/tea/config.yaml
  - _bmad/tea/testarch/tea-index.csv
  - _bmad-output/implementation-artifacts/1-2-guided-intake-draft-with-save-and-resume.md
  - playwright.config.ts
  - package.json
  - tests/support/fixtures/index.ts
  - tests/support/helpers/auth-provider.ts
  - tests/support/helpers/network.ts
  - app/pages/workspace.vue
  - app/pages/workspace/index.vue
  - app/components/workspace/WorkspaceShell.vue
  - server/utils/auth/requireUserSession.ts
  - server/api/workspace/me.get.ts
---

# ATDD Checklist - Epic 1, Story 1.2: Guided Intake Draft with Save and Resume

**Date:** 2026-03-03
**Author:** Wesleyukadike
**Primary Test Level:** E2E (with API draft-boundary checks)

---

## Story Summary

Story 1.2 introduces the first guided intake workflow under the protected workspace shell. The story requires explicit save/resume behavior, minimal draft persistence scope, and accessible inline validation before recommendations are implemented.

**As a** immigration user  
**I want** a guided intake flow that saves section progress and resumes later  
**So that** I can complete profile setup safely without losing work

---

## Acceptance Criteria

1. Guided section flow exists for personal, education, work, immigration, and goals with visible progress and `data-testid="intake-progress"`.
2. Valid draft data is persisted per authenticated user with immediate save confirmation.
3. Persistence scope is minimal to draft state only: section progress, field values, and resume position.
4. Returning users resume at the saved section with previously entered values.
5. Invalid or incomplete required data shows inline accessible validation guidance with keyboard operability.

---

## Failing Tests Created (RED Phase)

### E2E Tests (6 tests)

**File:** `tests/e2e/intake-draft.atdd.spec.ts`

- ✅ **Test:** `[P0][AC1] guest is redirected to auth when opening intake route`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** `/workspace/intake` is protected for guests
- ✅ **Test:** `[P0][AC1] guided intake sections and progress container are visible`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Section labels and `data-testid="intake-progress"` are rendered
- ✅ **Test:** `[P0][AC2] save action persists draft and shows immediate confirmation`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** POST draft path and save feedback semantics
- ✅ **Test:** `[P0][AC4] returning user resumes at saved section with previous values`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Saved `currentSection` and values hydrate on return
- ✅ **Test:** `[P1][AC5] invalid required fields show inline accessible guidance`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Inline validation and focusable error guidance
- ✅ **Test:** `[P1][AC5] keyboard navigation works across section controls`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Previous/Next/Save controls remain keyboard operable

### API Tests (7 tests)

**File:** `tests/api/intake-draft.atdd.spec.ts`

- ✅ **Test:** `[P0][AC2] unauthenticated intake draft read is denied`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** `GET /api/intake/draft` returns `401` without session
- ✅ **Test:** `[P0][AC2] unauthenticated intake draft save is denied`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** `POST /api/intake/draft` returns `401` without session
- ✅ **Test:** `[P0][AC2][AC3] draft save returns minimal response shape`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Response contract stays `{status, savedAt, currentSection, values}`
- ✅ **Test:** `[P0][AC3] save payload is limited to required draft storage keys`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Recommendation/audit fields are rejected by boundary validation
- ✅ **Test:** `[P0][AC4] saved draft is restored with current section and values`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Draft read returns persisted section and values
- ✅ **Test:** `[P1][AC3] draft read payload excludes recommendation and audit entities`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** No pre-emptive recommendation/pathway/audit leakage
- ✅ **Test:** `[P1][AC5] invalid section identifiers are rejected with validation details`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Section validation returns `400` with clear field-level signal

---

## Data Factories Created

### Intake Draft Factory

**File:** `tests/support/fixtures/factories/intake-draft-factory.ts`

**Exports:**

- `createIntakeRouteProbe(baseUrl)` - Canonical route/API probes for intake flow testing
- `createIntakeDraftPayload(overrides?)` - Draft payload generator with deterministic minimal structure
- `createResumeDraftFixture(overrides?)` - Resume fixture with `savedAt` metadata for hydration tests

---

## Fixtures Created

### Intake ATDD Test Data Contract

**File:** `tests/support/fixtures/test-data.ts`

**Added constants:**

- `INTAKE_ATDD_SECTIONS` - canonical section labels
- `INTAKE_ATDD_TEST_IDS` - stable selector/test contract keys
- `INTAKE_ATDD_REQUIRED_RESPONSE_KEYS` - expected draft response shape keys
- `INTAKE_ATDD_REQUIRED_STORAGE_KEYS` - minimum persistence boundary keys

---

## Mock Requirements

### Intake Draft API Mock Contract

**Endpoint:** `POST /api/intake/draft`

**Success Response:**

```json
{
  "status": "saved",
  "savedAt": "2026-03-03T08:57:09Z",
  "currentSection": "education",
  "values": {
    "personal": {
      "firstName": "Ada"
    }
  }
}
```

**Failure Response:**

```json
{
  "statusCode": 400,
  "statusMessage": "Invalid currentSection"
}
```

### Intake Draft Read API Mock Contract

**Endpoint:** `GET /api/intake/draft`

**Success Response:**

```json
{
  "status": "ok",
  "savedAt": "2026-03-03T08:57:09Z",
  "currentSection": "work",
  "values": {
    "personal": {
      "firstName": "Ada"
    }
  }
}
```

---

## Required data-testid Attributes

- `intake-progress` - progress container required by AC1
- `intake-section-heading` - active section heading for resume verification
- `intake-save` - explicit save action control
- `intake-next` - section advance control
- `intake-previous` - section rewind control
- `intake-save-feedback` - immediate save status region
- `intake-validation-summary` - section-level validation summary
- `intake-error-first-name` - inline required-field error hook

---

## Implementation Checklist

### Test: `[P0][AC1] guided intake sections and progress container are visible`

**File:** `tests/e2e/intake-draft.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Create `/workspace/intake` protected route under existing workspace shell
- [ ] Render the five guided sections and visible progress framing
- [ ] Add `data-testid="intake-progress"` and keep selectors stable
- [ ] Remove `test.skip` and run the scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 2.0 hours

### Test: `[P0][AC2][AC3] draft save returns minimal response shape`

**File:** `tests/api/intake-draft.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Implement `POST /api/intake/draft` behind `requireWorkspaceUserSession`
- [ ] Validate payload and allow only draft boundary keys
- [ ] Return stable response shape `{status, savedAt, currentSection, values}`
- [ ] Remove `test.skip` and run API scenario in configured runner
- [ ] ✅ Scenario passes

**Estimated Effort:** 2.5 hours

### Test: `[P0][AC4] saved draft is restored with current section and values`

**File:** `tests/e2e/intake-draft.atdd.spec.ts` and `tests/api/intake-draft.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Implement `GET /api/intake/draft` authenticated retrieval by session identity
- [ ] Hydrate intake page on entry and route user to saved section
- [ ] Refill field values from server response without data loss
- [ ] Remove `test.skip` in both E2E and API specs
- [ ] ✅ Scenarios pass

**Estimated Effort:** 2.0 hours

### Test: `[P1][AC5] invalid required fields show inline accessible guidance`

**File:** `tests/e2e/intake-draft.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Add section-level required-field validation with plain-language messages
- [ ] Ensure validation summary and field errors are focusable and keyboard reachable
- [ ] Add stable error test IDs used in ATDD contract
- [ ] Remove `test.skip` and run scenario
- [ ] ✅ Scenario passes

**Estimated Effort:** 1.5 hours

---

## Running Tests

```bash
# Run red-phase intake ATDD E2E tests
pnpm exec playwright test tests/e2e/intake-draft.atdd.spec.ts

# Run red-phase intake API ATDD tests (requires API test project or testDir override)
pnpm exec playwright test tests/api/intake-draft.atdd.spec.ts

# Headed run for E2E story checks
pnpm exec playwright test tests/e2e/intake-draft.atdd.spec.ts --headed

# Debug a specific E2E spec
pnpm exec playwright test tests/e2e/intake-draft.atdd.spec.ts --debug
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- Story-scoped failing tests were generated for both UI and API boundaries.
- Every ATDD scenario is intentionally guarded with `test.skip` to preserve red-phase semantics before implementation.
- Assertions encode expected behavior directly, not placeholders.

### GREEN Phase (DEV Team)

1. Remove `test.skip` one scenario at a time (start with P0 AC1/AC2).
2. Implement minimum code to satisfy that single scenario.
3. Run the scenario and verify pass.
4. Continue until all priority scenarios are green.

### REFACTOR Phase (DEV Team)

1. Consolidate repeated intake form logic into feature components.
2. Keep selectors resilient and accessible-first.
3. Re-run full intake suite after each refactor increment.

---

## Key Risks / Assumptions

- Playwright now has dedicated `chromium` and `api` projects; keep new ATDD specs within `tests/e2e` and `tests/api` to stay discoverable.
- Save/resume assertions assume a stable response contract (`status`, `savedAt`, `currentSection`, `values`) from story requirements.
- Test IDs listed above become part of the implementation contract for stable automation.

---

## Next Recommended Workflow

- Implement story via `bmad-bmm-dev-story` using this ATDD checklist as red-phase handoff.
- After implementation, run `bmad-tea-testarch-automate` to expand non-ATDD regression coverage.

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
