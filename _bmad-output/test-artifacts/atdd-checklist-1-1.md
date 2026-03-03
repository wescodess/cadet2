---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-03T08:41:46Z'
workflowType: testarch-atdd
inputDocuments:
  - _bmad/tea/config.yaml
  - _bmad/tea/testarch/tea-index.csv
  - _bmad-output/implementation-artifacts/1-1-secure-user-workspace-access.md
  - playwright.config.ts
  - package.json
  - tests/e2e/workspace-auth.spec.ts
  - tests/support/fixtures/index.ts
  - tests/support/fixtures/custom-fixtures.ts
  - tests/support/fixtures/factories/user-factory.ts
  - tests/support/helpers/auth-provider.ts
  - server/api/workspace/me.get.ts
  - server/api/admin/access.get.ts
  - server/utils/auth/requireUserSession.ts
  - server/utils/auth/requireAdminSession.ts
  - app/middleware/auth.ts
  - app/middleware/admin.ts
---

# ATDD Checklist - Epic 1, Story 1.1: Secure User Workspace Access

**Date:** 2026-03-03
**Author:** Wesleyukadike
**Primary Test Level:** E2E (with API boundary checks)

---

## Story Summary

Story 1.1 establishes secure, authenticated access to the user workspace while denying unauthorized and admin-only access paths. The story also defines the initial workspace shell experience across desktop and mobile, with recommendation areas explicitly unavailable until later stories.

**As a** prospective immigration user  
**I want** to create an account and access only my protected workspace  
**So that** I can manage planning data securely without exposure to privileged or other-user data

---

## Acceptance Criteria

1. Authenticated users can access workspace routes; unauthorized users cannot.
2. Server boundary blocks other-user workspace data access.
3. Signed-in users land in a stable workspace shell with accessible desktop/mobile navigation.
4. Recommendation-related navigation remains unavailable until future stories.
5. Standard users are denied internal admin/trust-governance routes.

---

## Failing Tests Created (RED Phase)

### E2E Tests (6 tests)

**File:** `tests/e2e/workspace-access.atdd.spec.ts`

- ✅ **Test:** `[P0][AC1] guest is redirected to auth for protected workspace route`
  - **Status:** RED-guarded (`test.skip`) - expected behavior asserted, activation deferred
  - **Verifies:** Unauthenticated direct access to `/workspace` redirects to `/auth`
- ✅ **Test:** `[P0][AC3] authenticated user lands in workspace shell`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Workspace shell renders for authenticated standard users
- ✅ **Test:** `[P1][AC3] workspace desktop navigation landmark is visible and keyboard-reachable`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Semantic navigation landmark is present on desktop
- ✅ **Test:** `[P0][AC5] standard user is blocked from internal admin route`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Standard user cannot remain on `/admin/rag-phase0`
- ✅ **Test:** `[P1][AC3] mobile workspace navigation container is rendered`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Mobile bottom navigation renders on 390x844 viewport
- ✅ **Test:** `[P1][AC4] recommendation area remains disabled in mobile navigation`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Recommendation navigation affordance is disabled (`aria-disabled="true"`)

### API Tests (4 tests)

**File:** `tests/api/workspace-access.atdd.spec.ts`

- ✅ **Test:** `[P0][AC1] unauthenticated request to workspace metadata endpoint is denied`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** `/api/workspace/me` returns `401` without authentication
- ✅ **Test:** `[P0][AC2] query tampering does not change workspace ownership at server boundary`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** `userId` tampering in query params is not honored by server ownership enforcement
- ✅ **Test:** `[P1][AC2] workspace metadata payload remains scoped to allowed fields only`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** Response payload keys remain constrained to `email`, `name`, `userId`
- ✅ **Test:** `[P0][AC5] standard authenticated user is denied admin API access probe`
  - **Status:** RED-guarded (`test.skip`)
  - **Verifies:** `/api/admin/access` returns `403` for standard authenticated users

---

## Data Factories Created

### Workspace Access Probe Factory

**File:** `tests/support/fixtures/factories/workspace-access-factory.ts`

**Exports:**

- `createWorkspaceRouteProbe(baseUrl)` - Generates canonical workspace/admin/API probe routes
- `createTamperedWorkspaceProbe(baseUrl)` - Generates attacker-style tampered query probe for ownership checks

---

## Fixtures Created

### Workspace ATDD Test Data Fixture

**File:** `tests/support/fixtures/test-data.ts`

**Exports:**

- `WORKSPACE_ATDD_TEST_IDS` - Stable data-testid contract for shell/nav/dashboard checks
- `WORKSPACE_ATDD_REQUIRED_PAYLOAD_KEYS` - Allowed API payload key list
- `WORKSPACE_ATDD_DISABLED_NAV_LABELS` - Disabled navigation labels used in AC4 checks

---

## Mock Requirements

### No Mandatory External Service Mocks Required

Current red-phase tests assert route and payload access boundaries against first-party app endpoints only.

Optional mocks for isolated execution in future CI hardening:

- `GET /api/admin/access`  
  Success response:
  ```json
  { "ok": true, "authorizationSource": "rag_admins", "user": { "userId": "u_1", "email": "admin@example.com", "name": "Admin" } }
  ```
  Failure response:
  ```json
  { "statusCode": 403, "statusMessage": "Admin access denied" }
  ```

---

## Required data-testid Attributes

### Workspace Surfaces

- `workspace-shell` - Root shell wrapper for authenticated workspace layout
- `workspace-nav` - Desktop workspace navigation container
- `workspace-nav-mobile` - Mobile bottom navigation container
- `workspace-dashboard` - Workspace landing/dashboard root

---

## Implementation Checklist

### Test: `[P0][AC1] guest is redirected to auth for protected workspace route`

**File:** `tests/e2e/workspace-access.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Remove `test.skip` gate for the scenario
- [ ] Ensure workspace page middleware enforces guest redirect to `/auth`
- [ ] Verify no transient route flash to protected content before redirect
- [ ] Run: `pnpm exec playwright test tests/e2e/workspace-access.atdd.spec.ts`
- [ ] ✅ Test passes

**Estimated Effort:** 0.25 hours

### Test: `[P0][AC2] query tampering does not change workspace ownership at server boundary`

**File:** `tests/api/workspace-access.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Remove `test.skip` gate for the scenario
- [ ] Ensure `/api/workspace/me` derives user identity only from session
- [ ] Confirm tampered query params cannot alter returned ownership fields
- [ ] Run API ATDD suite in CI profile that includes `tests/api`
- [ ] ✅ Test passes

**Estimated Effort:** 0.5 hours

### Test: `[P0][AC5] standard authenticated user is denied admin API access probe`

**File:** `tests/api/workspace-access.atdd.spec.ts`

**Tasks to make this test pass actively (green run):**

- [ ] Remove `test.skip` gate for the scenario
- [ ] Confirm non-admin sessions receive `403` from `/api/admin/access`
- [ ] Confirm no privileged payload fields leak in denied response
- [ ] Run API ATDD suite in CI profile that includes `tests/api`
- [ ] ✅ Test passes

**Estimated Effort:** 0.5 hours

---

## Running Tests

```bash
# Run story 1.1 red-phase E2E checklist tests
pnpm exec playwright test tests/e2e/workspace-access.atdd.spec.ts

# Run specific red-phase test file
pnpm exec playwright test tests/e2e/workspace-access.atdd.spec.ts

# Run in headed mode
pnpm exec playwright test tests/e2e/workspace-access.atdd.spec.ts --headed

# Debug mode
pnpm exec playwright test tests/e2e/workspace-access.atdd.spec.ts --debug

# Coverage
# N/A - no dedicated Playwright coverage script is configured in package.json
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

TEA workflow produced story-scoped ATDD specs with explicit expected behavior assertions and intentional `test.skip` guards to preserve red-phase contract in this already-implemented story context.

### GREEN Phase (DEV Team)

1. Remove `test.skip` from one scenario at a time.
2. Execute scenario and verify production code behavior satisfies assertions.
3. Fix implementation or assertion drift as needed.
4. Commit each green scenario incrementally.

### REFACTOR Phase (DEV Team)

1. Consolidate duplicated auth setup where appropriate.
2. Keep selectors resilient (`data-testid` and semantic roles).
3. Preserve one-behavior-per-test structure.
4. Re-run suites after each cleanup to keep green state.

---

## Next Steps

1. Decide whether to activate these tests immediately by removing `test.skip` gates.
2. Add an API Playwright project (or dedicated runner) so `tests/api/*.spec.ts` executes in CI.
3. Integrate this checklist into sprint handoff for Story 1.1 regression gate.

---

## Knowledge Base References Applied

- `data-factories.md`
- `component-tdd.md`
- `test-quality.md`
- `test-healing-patterns.md`
- `selector-resilience.md`
- `timing-debugging.md`
- `network-first.md`
- `fixture-architecture.md`
- `api-testing-patterns.md`
- `overview.md`
- `api-request.md`
- `auth-session.md`
- `playwright-cli.md`

---

## Test Execution Evidence

### Initial Test Run (RED Phase Verification)

**Command:** `pnpm exec playwright test tests/e2e/workspace-access.atdd.spec.ts`

**Results:**

```text
[dotenv@17.3.1] injecting env (...) from @seontechnologies/playwright-utils/.env
Running 6 tests using 5 workers

- [chromium] workspace-access.atdd.spec.ts ... [P0][AC1] guest is redirected to auth...
- [chromium] workspace-access.atdd.spec.ts ... [P0][AC3] authenticated user lands in workspace shell
- [chromium] workspace-access.atdd.spec.ts ... [P1][AC3] workspace desktop navigation landmark...
- [chromium] workspace-access.atdd.spec.ts ... [P0][AC5] standard user is blocked from internal admin route
- [chromium] workspace-access.atdd.spec.ts ... [P1][AC3] mobile workspace navigation container...
- [chromium] workspace-access.atdd.spec.ts ... [P1][AC4] recommendation area remains disabled...

6 skipped
```

**Summary:**

- Total tests: 10 generated (6 E2E + 4 API)
- Executed in this run: 6 (E2E scope only; Playwright config currently targets `tests/e2e`)
- Passing: 0
- Skipped: 6
- Failing: 0
- Status: ✅ Red-phase guard preserved with explicit `test.skip` markers

---

## Notes

- This ATDD package was generated after Story 1.1 implementation was marked `done`; red-phase semantics are represented via `test.skip` gating.
- API ATDD specs were generated in `tests/api/` and require a matching runner/project configuration to execute automatically.
- No new production code paths were changed as part of ATDD generation.
