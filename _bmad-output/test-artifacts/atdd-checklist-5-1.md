---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-19'
workflowType: testarch-atdd
inputDocuments:
  - _bmad-output/implementation-artifacts/5-1-manage-the-supported-mvp-pathway-inventory.md
  - package.json
  - playwright.config.ts
  - tests/support/fixtures/index.ts
  - tests/support/fixtures/custom-fixtures.ts
  - tests/support/fixtures/factories/pathway-inventory-factory.ts
  - tests/support/fixtures/test-data.ts
  - tests/api/admin-pathway-management.atdd.spec.ts
  - tests/e2e/admin-pathway-inventory.atdd.spec.ts
  - tests/api/admin-pathway-management.red.atdd.spec.ts
  - tests/e2e/admin-pathway-inventory.red.atdd.spec.ts
  - _bmad/tea/testarch/knowledge/data-factories.md
  - _bmad/tea/testarch/knowledge/component-tdd.md
  - _bmad/tea/testarch/knowledge/test-quality.md
  - _bmad/tea/testarch/knowledge/selector-resilience.md
---

# ATDD Checklist - Epic 5, Story 5.1: Manage the Supported MVP Pathway Inventory

**Date:** 2026-03-19
**Author:** Wesleyukadike
**Primary Test Level:** API + E2E

---

## Story Summary

Story 5.1 introduces an admin-only inventory for the supported MVP pathways. It replaces the hard-coded pathway catalog with persisted pathway definitions while keeping recommendation outputs limited to active pathways only.

This ATDD run is **retroactive** because Story 5.1 is already implemented and marked done. To preserve the existing green suites, the red-phase output was generated into dedicated `.red.atdd.spec.ts` files instead of overwriting the implemented `*.atdd.spec.ts` suites.

**As an** internal admin or ops user
**I want** to manage the active set of supported pathways
**So that** recommendation scope stays aligned with the current MVP boundaries

---

## Acceptance Criteria

1. Given I am an authorized internal admin or ops user, when I access the pathway management interface, then I can view the current set of supported pathways used by recommendations and standard end users cannot access this interface.
2. Given I add, disable, or update the active status of a pathway definition, when the change is saved, then the supported pathway inventory is updated in a controlled way and the change affects only the scoped pathway set intended for recommendation use.
3. Given supported-pathway inventory storage is first introduced in this epic, when this story is implemented, then it creates only the minimum pathway fields needed for active scope control, display identity, and status management and deeper rule logic, evidence linkage, and audit detail remain owned by later stories.
4. Given a pathway is outside the currently supported MVP scope, when the recommendation system evaluates user profiles, then that pathway can be excluded from active recommendation output and the product does not imply that the unsupported pathway is fully covered.

---

## Preflight and Strategy

- Detected stack: `frontend` by workflow rules, with Nuxt server APIs and Playwright API/browser projects used for acceptance coverage.
- Generation mode: AI generation.
- Execution mode: sequential.
- Why sequential: this environment does not expose BMAD subagent execution primitives, so the red suites were generated deterministically in-series.
- Existing patterns reused:
  - Better Auth sign-up/sign-in helpers already used in the Playwright API/E2E suites
  - `tests/support/fixtures/index.ts` merged Playwright fixture harness
  - `tests/support/fixtures/factories/pathway-inventory-factory.ts` for canonical routes, seeded records, and payload builders
  - `data-testid`-first selector policy from the existing admin and workspace tests

### Scenario-to-level mapping

- `AC1` maps to API access-control assertions plus E2E route-guard assertions.
- `AC2` maps to API CRUD/status assertions plus E2E confirmation-flow assertions.
- `AC3` maps to API minimum-field response shaping plus E2E seeded inventory rendering.
- `AC4` maps to API recommendation-scope regression plus E2E inactive-state confirmation behavior.

### Knowledge and doc cross-check

- Applied TEA knowledge fragments: `data-factories`, `component-tdd`, `test-quality`, `selector-resilience`, `api-request`, `auth-session`, `fixtures-composition`, `test-levels-framework`, `test-priorities-matrix`, `playwright-cli`.
- Cross-checked the generated Playwright guidance against the current official Playwright docs for locator strategy, API testing, and route mocking:
  - https://playwright.dev/docs/locators
  - https://playwright.dev/docs/api-testing
  - https://playwright.dev/docs/mock
- Cypress, pytest, JUnit, Go test, Pact, and CI-platform specifics were not applied because Story 5.1’s acceptance harness in this repo is Playwright-based.

### Red-phase rules applied

- All generated tests use `test.skip(...)`.
- Assertions describe intended end-state behavior instead of placeholder truthiness.
- E2E selectors stay on `data-testid`, roles, and text contracts.
- Green suites were intentionally left untouched.

---

## Failing Tests Created (RED Phase)

### API Tests (5 tests)

**File:** `tests/api/admin-pathway-management.red.atdd.spec.ts` (400 lines)

- ✅ **Test:** `[P0][AC1] unauthenticated callers cannot read the admin pathway inventory`
  - **Status:** RED via `test.skip()`
  - **Verifies:** unauthenticated reads of `GET /api/admin/pathways` fail with `401`.
- ✅ **Test:** `[P0][AC1] standard authenticated users are denied the admin pathway inventory endpoints`
  - **Status:** RED via `test.skip()`
  - **Verifies:** authenticated non-admin sessions get `403`.
- ✅ **Test:** `[P0][AC1][AC3] synced admin users can list the seeded MVP pathways and only receive the minimum governance fields`
  - **Status:** RED via `test.skip()`
  - **Verifies:** seeded inventory returns only the minimum field set and excludes rules, citations, and audit data.
- ✅ **Test:** `[P0][AC2][AC3] admin create, update, and status-change routes stay scoped to minimum inventory fields`
  - **Status:** RED via `test.skip()`
  - **Verifies:** create/update/status APIs preserve the minimum-field governance contract.
- ✅ **Test:** `[P0][AC2][AC4] disabling a supported pathway only changes the targeted inventory entry and excludes it from future recommendation outputs`
  - **Status:** RED via `test.skip()`
  - **Verifies:** scoped pathway disablement removes only the targeted pathway from future recommendation outputs.

### E2E Tests (5 tests)

**File:** `tests/e2e/admin-pathway-inventory.red.atdd.spec.ts` (225 lines)

- ✅ **Test:** `[P0][AC1] guest users are redirected to auth when opening the admin pathway inventory route`
  - **Status:** RED via `test.skip()`
  - **Verifies:** guests cannot remain on `/admin/pathways`.
- ✅ **Test:** `[P0][AC1] standard authenticated users are redirected away from the admin pathway inventory route`
  - **Status:** RED via `test.skip()`
  - **Verifies:** non-admin users are redirected to workspace or auth.
- ✅ **Test:** `[P0][AC1][AC3] admin users see the seeded pathway inventory table with search, filter, and add controls`
  - **Status:** RED via `test.skip()`
  - **Verifies:** seeded rows, search, filter, and add controls render together.
- ✅ **Test:** `[P0][AC2][AC4] admin users can filter the inventory and confirm a live status change before saving it`
  - **Status:** RED via `test.skip()`
  - **Verifies:** status updates require explicit confirmation and surface inactive state in the UI.
- ✅ **Test:** `[P1][AC1][AC2] mobile admin pathway inventory collapses into cards while preserving add and status controls`
  - **Status:** RED via `test.skip()`
  - **Verifies:** mobile layout preserves governance actions without the desktop table.

### Component Tests (0 tests)

**File:** `N/A`

- Component-level red coverage was not generated because the story’s highest-risk acceptance surface is the server-mediated admin flow plus recommendation-scope behavior.
- Existing green component coverage remains in `tests/components/admin/PathwayDefinitionTable.spec.ts`.

---

## Data Factories Created

No new factory file was needed.

### Reused Pathway Inventory Factory

**File:** `tests/support/fixtures/factories/pathway-inventory-factory.ts`

**Exports used by red phase:**

- `createPathwayInventoryRouteProbe(appBaseUrl)`
- `createSeededPathwayDefinitions()`
- `createPathwayDefinitionRecord(overrides?)`
- `createPathwayDefinitionCreateInput(overrides?)`
- `createPathwayDefinitionUpdateInput(overrides?)`
- `createPathwayStatusUpdateInput(status)`
- `createPathwayInventoryEvaluationPayload()`

---

## Fixtures Created

No new merged Playwright fixture file was required.

### Reused Infrastructure

- `tests/support/fixtures/index.ts` for shared Playwright fixtures and merged utility fixtures
- `tests/support/fixtures/custom-fixtures.ts` for `appBaseUrl`, cleanup registration, and user factory plumbing
- Better Auth request/browser bootstrap helpers embedded in the red suites

---

## Mock Requirements

### Admin Pathway Inventory UI Mock

**Endpoints mocked in the red E2E suite:**

- `GET /api/admin/access`
- `GET /api/admin/pathways`
- `POST /api/admin/pathways`
- `PATCH /api/admin/pathways/:pathwayId/status`

**Success response expectations:**

- admin access payload includes authorization source plus current user metadata
- list payload returns seeded minimum-field pathway definitions only
- status-change payload returns the targeted row with the new `status`
- UI remains server-mediated and does not talk directly to persistence from the browser

**Operational notes:**

- green-path API execution still needs an allowlisted admin identity for `/api/admin/rag/convex-admin/sync-current-user`
- local browser execution may need `PLAYWRIGHT_REUSE_SERVER=true` if another process is already bound to `127.0.0.1:3100`

---

## Required data-testid Attributes

### Admin Pathway Inventory Surface

- `admin-pathway-page` - top-level admin inventory surface
- `admin-pathway-table` - desktop inventory table
- `admin-pathway-row` - generic row selector
- `admin-pathway-row-{pathwayId}` - row-specific targeting
- `admin-pathway-search` - search input
- `admin-pathway-filter` - status filter control
- `admin-pathway-add-button` - add-pathway action
- `admin-pathway-status-badge` - visible status label
- `admin-pathway-row-actions` - per-row action trigger
- `admin-pathway-status-confirmation` - confirmation dialog for status changes
- `admin-pathway-card` - mobile card selector
- `admin-pathway-empty-state` - empty or filtered-empty state

---

## Implementation Checklist

### Test: API contracts for admin-only pathway inventory and scoped recommendation filtering

**File:** `tests/api/admin-pathway-management.red.atdd.spec.ts`

**Tasks to make this test pass in a true pre-implementation cycle:**

- [ ] Add `pathway_definitions` persistence with only `pathwayId`, `displayName`, `description`, `status`, `createdAt`, and `updatedAt`.
- [ ] Seed the current MVP pathway set as `active`.
- [ ] Implement server-side list/create/update/status handlers behind `requireAdminSession`.
- [ ] Restrict API responses to the minimum governance field set.
- [ ] Update recommendation evaluation to read only active persisted pathways for future runs.
- [ ] Remove `test.skip()` and run `pnpm exec playwright test --project=api tests/api/admin-pathway-management.red.atdd.spec.ts`.

**Estimated Effort:** 4-5 hours

### Test: E2E admin route protection, inventory rendering, status confirmation, and mobile layout

**File:** `tests/e2e/admin-pathway-inventory.red.atdd.spec.ts`

**Tasks to make this test pass in a true pre-implementation cycle:**

- [ ] Add `/admin/pathways` behind admin middleware.
- [ ] Render seeded inventory rows plus search, filter, and add controls.
- [ ] Add per-row actions and confirmation before live status changes.
- [ ] Preserve the same workflow in the mobile card layout.
- [ ] Remove `test.skip()` and run `PLAYWRIGHT_REUSE_SERVER=true pnpm exec playwright test --project=chromium tests/e2e/admin-pathway-inventory.red.atdd.spec.ts`.

**Estimated Effort:** 4-5 hours

---

## Running Tests

```bash
# Discover red-phase Story 5.1 tests
pnpm exec playwright test --project=api tests/api/admin-pathway-management.red.atdd.spec.ts --list
pnpm exec playwright test --project=chromium tests/e2e/admin-pathway-inventory.red.atdd.spec.ts --list

# Execute red-phase suites (they should report skipped by design)
pnpm exec playwright test --project=api tests/api/admin-pathway-management.red.atdd.spec.ts
PLAYWRIGHT_REUSE_SERVER=true pnpm exec playwright test --project=chromium tests/e2e/admin-pathway-inventory.red.atdd.spec.ts
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ 5 API red tests declared
- ✅ 5 E2E red tests declared
- ✅ Red suites isolated into `.red.atdd.spec.ts` files
- ✅ Existing green suites preserved
- ✅ Supporting temp artifacts written under `_bmad-output/test-artifacts/atdd-temp/`

### GREEN Phase

- Promote these assertions into the active green suites or remove `test.skip()` from the red suites in a true pre-implementation branch.
- Re-run targeted API and browser suites.
- Keep the green regression suites authoritative once implementation exists.

### REFACTOR Phase

- Consolidate shared auth bootstrap helpers if the red suites are promoted into long-lived regression coverage.
- Keep selectors on `data-testid` or accessible roles only.
- Keep any further inventory-regression additions in the green suite, not the archived red suite.

---

## Validation and Completion Summary

### Validation evidence

- `pnpm exec playwright test --project=api tests/api/admin-pathway-management.red.atdd.spec.ts --list`
  - Result: 5 tests discovered
- `pnpm exec playwright test --project=chromium tests/e2e/admin-pathway-inventory.red.atdd.spec.ts --list`
  - Result: 5 tests discovered
- `pnpm exec playwright test --project=api tests/api/admin-pathway-management.red.atdd.spec.ts`
  - Result: 5 skipped
- `PLAYWRIGHT_REUSE_SERVER=true pnpm exec playwright test --project=chromium tests/e2e/admin-pathway-inventory.red.atdd.spec.ts`
  - Result: 5 skipped

### Generated outputs

- `tests/api/admin-pathway-management.red.atdd.spec.ts`
- `tests/e2e/admin-pathway-inventory.red.atdd.spec.ts`
- `_bmad-output/test-artifacts/atdd-temp/tea-atdd-api-tests-2026-03-19T11-16-55Z.json`
- `_bmad-output/test-artifacts/atdd-temp/tea-atdd-e2e-tests-2026-03-19T11-16-55Z.json`
- `_bmad-output/test-artifacts/atdd-temp/tea-atdd-summary-2026-03-19T11-16-55Z.json`
- `_bmad-output/test-artifacts/atdd-checklist-5-1.md`

### Key risks and assumptions

- This was a retroactive red-phase reconstruction for an already-implemented story.
- The red suites are archival/specification artifacts; the implemented green suites remain the active regression source of truth.
- Local Chromium execution may require `PLAYWRIGHT_REUSE_SERVER=true` when another process is already serving `127.0.0.1:3100`.

### Next recommended workflow

- `automate` if you want TEA to expand Story 5.1 regression depth beyond the preserved red-phase spec.
- `review` if you want an adversarial pass on the current green tests and their coverage gaps.
