---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-18'
workflowType: testarch-atdd
inputDocuments:
  - _bmad-output/implementation-artifacts/5-1-manage-the-supported-mvp-pathway-inventory.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - package.json
  - playwright.config.ts
  - tests/support/fixtures/index.ts
  - tests/support/helpers/auth-provider.ts
  - tests/e2e/workspace-auth.spec.ts
  - tests/api/recommendation-pathway-evaluation.atdd.spec.ts
  - app/middleware/admin.ts
  - app/pages/admin/rag-sources.client.vue
  - server/api/admin/access.get.ts
  - server/api/admin/rag/convex-admin/sync-current-user.post.ts
  - server/utils/auth/requireAdminSession.ts
  - server/utils/pathways/mvpPathwayCatalog.ts
  - server/utils/pathways/evaluateDirectAndBlockedPathways.ts
  - server/utils/recommendations/evaluatePathwayEligibility.ts
  - _bmad/tea/testarch/knowledge/data-factories.md
  - _bmad/tea/testarch/knowledge/component-tdd.md
  - _bmad/tea/testarch/knowledge/test-quality.md
  - _bmad/tea/testarch/knowledge/test-healing-patterns.md
  - _bmad/tea/testarch/knowledge/selector-resilience.md
  - _bmad/tea/testarch/knowledge/timing-debugging.md
  - _bmad/tea/testarch/knowledge/overview.md
  - _bmad/tea/testarch/knowledge/api-request.md
  - _bmad/tea/testarch/knowledge/auth-session.md
  - _bmad/tea/testarch/knowledge/intercept-network-call.md
  - _bmad/tea/testarch/knowledge/recurse.md
  - _bmad/tea/testarch/knowledge/fixtures-composition.md
  - _bmad/tea/testarch/knowledge/playwright-cli.md
---

# ATDD Checklist - Epic 5, Story 5.1: Manage the Supported MVP Pathway Inventory

**Date:** 2026-03-18
**Author:** Wesleyukadike
**Primary Test Level:** API + E2E

---

## Story Summary

Story 5.1 introduces the first admin-only inventory surface for pathway governance. It replaces the hard-coded MVP catalog with a persisted pathway definition inventory, protected by the existing admin middleware and `requireAdminSession` guard, while keeping recommendation evaluation limited to active pathways only.

**As an** internal admin or ops user
**I want** to manage the active set of supported pathways
**So that** recommendation scope stays aligned with the current MVP boundaries

---

## Acceptance Criteria

1. Given I am an authorized internal admin or ops user When I access the pathway management interface Then I can view the current set of supported pathways used by recommendations And standard end users cannot access this interface.
2. Given I add, disable, or update the active status of a pathway definition When the change is saved Then the supported pathway inventory is updated in a controlled way And the change affects only the scoped pathway set intended for recommendation use.
3. Given supported-pathway inventory storage is first introduced in this epic When this story is implemented Then it creates only the minimum pathway fields needed for active scope control, display identity, and status management And deeper rule logic, evidence linkage, and audit detail remain owned by the later stories that first require them.
4. Given a pathway is outside the currently supported MVP scope When the recommendation system evaluates user profiles Then that pathway can be excluded from active recommendation output And the product does not imply that the unsupported pathway is fully covered.

---

## Preflight and Strategy

- Detected stack: `frontend` (Nuxt app with server APIs, Playwright, and Vitest component tests).
- Test framework: Playwright projects for `chromium` and `api`; existing Vitest component harness remains available for green-phase follow-up.
- Generation mode: AI generation.
- Why AI generation: the story has explicit CRUD, access-control, and recommendation-scope contracts; the current repo already has admin middleware, auth helpers, and recommendation test patterns to anchor the red phase without browser recording.
- Existing patterns reused:
  - Better Auth sign-up/sign-in helpers from existing API and E2E suites
  - existing admin middleware route behavior from `workspace-auth.spec.ts`
  - recommendation-run reset/seed/start utilities from pathway evaluation and lifecycle ATDD suites
  - data-testid-first selector policy from current workspace and admin surfaces

### Scenario-to-level mapping

- `AC1` -> API access-control tests for unauthenticated, standard, and admin sessions; E2E route guard and admin inventory visibility tests.
- `AC2` -> API tests for create, update, and status-change contracts; E2E confirmation workflow and scoped status mutation tests.
- `AC3` -> API assertion that response payloads only expose the minimum governance fields; E2E inventory surface reflects only those core attributes.
- `AC4` -> API regression test that inactive pathways are excluded from recommendation outputs; E2E copy and badge expectations frame inactive routes as out-of-scope rather than fully supported.

### Red-phase rules applied

- All generated tests use `test.skip(...)`.
- Assertions describe expected final behavior and field contracts, not placeholder truthiness.
- E2E selectors are `data-testid` or role-based, matching current project guidance and Playwright best practices.
- Admin happy-path tests use the existing allowlist bootstrap plus sync flow so green-phase execution matches the real authorization path.

---

## Failing Tests Created (RED Phase)

### API Tests (5 tests)

**File:** `tests/api/admin-pathway-management.atdd.spec.ts`

- ✅ **Test:** `[P0][AC1] unauthenticated callers cannot read the admin pathway inventory`
  - **Status:** RED via `test.skip()` until the admin pathway inventory API exists.
  - **Verifies:** unauthenticated access to `GET /api/admin/pathways` is rejected with `401`.
- ✅ **Test:** `[P0][AC1] standard authenticated users are denied the admin pathway inventory endpoints`
  - **Status:** RED via `test.skip()` until the pathway admin endpoints exist and use `requireAdminSession`.
  - **Verifies:** authenticated non-admin users receive `403` and cannot enumerate inventory data.
- ✅ **Test:** `[P0][AC1][AC3] synced admin users can list the seeded MVP pathways and only receive the minimum governance fields`
  - **Status:** RED via `test.skip()` until list endpoint, seeding, and response shaping are implemented.
  - **Verifies:** the three seeded MVP pathways are returned and the response omits rule, evidence, and audit fields.
- ✅ **Test:** `[P0][AC2][AC3] admin create, update, and status-change routes stay scoped to minimum inventory fields`
  - **Status:** RED via `test.skip()` until create/update/status routes, validation, and persistence exist.
  - **Verifies:** admin CRUD contracts accept only minimum fields and status transitions without introducing out-of-scope metadata.
- ✅ **Test:** `[P0][AC2][AC4] disabling a supported pathway only changes the targeted inventory entry and excludes it from future recommendation outputs`
  - **Status:** RED via `test.skip()` until evaluation utilities read active inventory from persistence instead of the hard-coded catalog.
  - **Verifies:** status changes are scoped to one pathway and inactive pathways disappear from recommendation pathway outputs.

### E2E Tests (5 tests)

**File:** `tests/e2e/admin-pathway-inventory.atdd.spec.ts`

- ✅ **Test:** `[P0][AC1] guest users are redirected to auth when opening the admin pathway inventory route`
  - **Status:** RED via `test.skip()` until `/admin/pathways` exists under admin middleware.
  - **Verifies:** guest users cannot remain on the admin inventory route.
- ✅ **Test:** `[P0][AC1] standard authenticated users are redirected away from the admin pathway inventory route`
  - **Status:** RED via `test.skip()` until the route exists and middleware enforces admin-only access.
  - **Verifies:** non-admin users are redirected away from the new admin page.
- ✅ **Test:** `[P0][AC1][AC3] admin users see the seeded pathway inventory table with search, filter, and add controls`
  - **Status:** RED via `test.skip()` until the admin page, table, and toolbar render.
  - **Verifies:** admin users can see seeded rows, search, status filter, and add pathway action affordances.
- ✅ **Test:** `[P0][AC2][AC4] admin users can filter the inventory and confirm a live status change before saving it`
  - **Status:** RED via `test.skip()` until row actions, confirmation dialog, and status update workflow exist.
  - **Verifies:** status changes are confirmed explicitly and inactive state is presented in the inventory UI.
- ✅ **Test:** `[P1][AC1][AC2] mobile admin pathway inventory collapses into cards while preserving add and status controls`
  - **Status:** RED via `test.skip()` until the responsive mobile layout exists.
  - **Verifies:** mobile governance surface uses card composition without losing key controls.

### Component Tests (0 tests)

**File:** `N/A`

- Story 5.1 red-phase coverage remains API + E2E because the highest-risk contracts are access control, server mediation, and end-to-end pathway scope changes.
- Green phase should still add the story-requested Vitest component tests for `PathwayDefinitionTable.vue` and `PathwayStatusBadge.vue` once the UI contract stabilizes.

---

## Data Factories Created

### Pathway Inventory Factory

**File:** `tests/support/fixtures/factories/pathway-inventory-factory.ts`

**Exports:**

- `createPathwayInventoryRouteProbe(appBaseUrl)` - canonical admin route and endpoint paths for Story 5.1.
- `createSeededPathwayDefinitions()` - the three seeded MVP pathway definitions used by the new inventory.
- `createPathwayDefinitionRecord(overrides?)` - a fully shaped minimum-field pathway definition record.
- `createPathwayDefinitionCreateInput(overrides?)` - create payload for admin POST tests.
- `createPathwayDefinitionUpdateInput(overrides?)` - update payload for admin PATCH tests.
- `createPathwayStatusUpdateInput(status)` - focused status mutation payload.
- `createPathwayInventoryEvaluationPayload()` - recommendation input that makes active pathways eligible, used to verify exclusion behavior.

---

## Fixtures Created

No new merged Playwright fixture file was required.

**Reused infrastructure:**

- `tests/support/fixtures/index.ts` for shared Playwright fixtures and `request` context
- Better Auth sign-up/sign-in helpers already used throughout API and E2E suites
- route-mocking patterns from prior recommendation UI ATDD suites for the new admin surface

---

## Mock Requirements

### Admin Pathway Inventory UI Mock

**Endpoints:**

- `GET /api/admin/access`
- `GET /api/admin/pathways`
- `POST /api/admin/pathways`
- `PATCH /api/admin/pathways/:pathwayId/status`

**Success Response Requirements:**

- admin access response includes `ok`, `authorizationSource`, and current user details
- list response includes seeded pathway definitions with only minimum fields
- status update response returns the targeted pathway with the new `status`
- UI remains driven by server-mediated endpoints, not direct database/browser access

**Failure Notes:**

- green-phase API tests require an allowlisted admin email or equivalent test bootstrap so `/api/admin/rag/convex-admin/sync-current-user` can promote the session before hitting new admin endpoints
- unsupported and inactive pathways must be treated as excluded inventory, not silently shown as fully available recommendation options

---

## Required data-testid Attributes

### Admin Pathway Inventory Surface

- `admin-pathway-page` - top-level page container
- `admin-pathway-table` - desktop inventory table
- `admin-pathway-row` - generic inventory row selector
- `admin-pathway-row-{pathwayId}` - row-level targeting for per-pathway actions
- `admin-pathway-search` - client-side search input
- `admin-pathway-filter` - status filter control
- `admin-pathway-add-button` - primary add-pathway action
- `admin-pathway-status-badge` - status label for active/inactive/draft
- `admin-pathway-row-actions` - per-row action menu trigger
- `admin-pathway-status-confirmation` - confirmation dialog before live status changes
- `admin-pathway-card` - mobile card layout entry
- `admin-pathway-empty-state` - empty/filter-miss state copy

---

## Implementation Checklist

### Test: API contracts for admin-only pathway inventory and scoped recommendation filtering

**File:** `tests/api/admin-pathway-management.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Add the `pathway_definitions` migration and Drizzle schema with only `pathwayId`, `displayName`, `description`, `status`, `createdAt`, and `updatedAt`.
- [ ] Seed the three current MVP pathways as `active`.
- [ ] Implement `pathwayDefinitionService.ts` and Zod request/response schemas.
- [ ] Implement `GET /api/admin/pathways`, `POST /api/admin/pathways`, `PATCH /api/admin/pathways/:pathwayId`, and `PATCH /api/admin/pathways/:pathwayId/status` using `requireAdminSession`.
- [ ] Ensure API responses expose only the minimum governance fields.
- [ ] Refactor recommendation evaluation utilities to read only `active` persisted pathway definitions, with hard-coded catalog fallback limited to transition behavior.
- [ ] Run test: `pnpm exec playwright test tests/api/admin-pathway-management.atdd.spec.ts --project=api`
- [ ] Remove `test.skip()` and confirm the tests pass.

**Estimated Effort:** 4-5 hours

### Test: E2E admin pathway inventory route, toolbar, confirmation flow, and mobile layout

**File:** `tests/e2e/admin-pathway-inventory.atdd.spec.ts`

**Tasks to make this test pass:**

- [ ] Create `app/pages/admin/pathways.client.vue` with `definePageMeta({ middleware: ['auth', 'admin'] })`.
- [ ] Add `PathwayDefinitionTable.vue` and `PathwayStatusBadge.vue` aligned with the approved Classic Inventory Table design package.
- [ ] Render seeded rows, search, filter, add action, and per-row actions with the required test IDs.
- [ ] Implement confirmation before disabling an active pathway and reflect the returned status in the UI.
- [ ] Add responsive mobile card composition that preserves search, add, and status controls.
- [ ] Run test: `pnpm exec playwright test tests/e2e/admin-pathway-inventory.atdd.spec.ts --project=chromium`
- [ ] Remove `test.skip()` and confirm the tests pass.

**Estimated Effort:** 4-5 hours

---

## Running Tests

```bash
# Collect the new API ATDD spec
pnpm exec playwright test tests/api/admin-pathway-management.atdd.spec.ts --project=api --list

# Collect the new E2E ATDD spec
pnpm exec playwright test tests/e2e/admin-pathway-inventory.atdd.spec.ts --project=chromium --list

# After implementation, run the API spec
pnpm exec playwright test tests/api/admin-pathway-management.atdd.spec.ts --project=api

# After implementation, run the E2E spec
pnpm exec playwright test tests/e2e/admin-pathway-inventory.atdd.spec.ts --project=chromium
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

- ✅ Failing API and E2E tests generated with `test.skip()`
- ✅ Admin bootstrap/sync path documented for green-phase execution
- ✅ Minimum-field contract documented
- ✅ Recommendation exclusion behavior documented
- ✅ Required `data-testid` hooks listed for the new admin surface

### GREEN Phase (DEV Team - Next Steps)

1. Build the persistent `pathway_definitions` model and seed existing MVP pathways.
2. Implement the admin endpoints with Zod validation and `requireAdminSession`.
3. Build the admin pathway inventory page and responsive components with the required test IDs.
4. Refactor recommendation pathway evaluation to read only `active` persisted pathways.
5. Remove `test.skip()` and run the API and E2E specs until they pass.

### REFACTOR Phase

- Add the story-requested component tests for the table and status badge once the UI contract is stable.
- Add richer test fixtures for admin-session setup if Story 5.2+ expands governance coverage.
- Fold repeated admin auth/bootstrap helpers into shared support utilities if subsequent epic stories reuse them.
