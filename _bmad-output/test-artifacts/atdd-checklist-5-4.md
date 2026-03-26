---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04-generate-tests
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-25'
workflowType: testarch-atdd
inputDocuments:
  - _bmad-output/implementation-artifacts/5-4-audit-trust-sensitive-changes-and-preserve-governance-boundaries.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - package.json
  - playwright.config.ts
  - app/lib/admin/navigation.ts
  - app/lib/admin/evidenceSources.ts
  - app/components/admin/EvidenceSourceDetail.vue
  - server/utils/auth/requireAdminSession.ts
  - server/utils/admin/evidenceSourceSchema.ts
  - tests/support/fixtures/index.ts
  - tests/support/fixtures/custom-fixtures.ts
  - tests/support/fixtures/test-data.ts
  - tests/support/fixtures/factories/pathway-inventory-factory.ts
  - tests/support/fixtures/factories/audit-trail-factory.ts
  - tests/api/admin-pathway-governance.atdd.spec.ts
  - tests/e2e/admin-governance.atdd.spec.ts
  - tests/api/admin-recommendation-reviews.red.atdd.spec.ts
  - tests/e2e/admin-recommendation-reviews.red.atdd.spec.ts
  - _bmad/tea/testarch/knowledge/data-factories.md
  - _bmad/tea/testarch/knowledge/component-tdd.md
  - _bmad/tea/testarch/knowledge/test-quality.md
  - _bmad/tea/testarch/knowledge/test-healing-patterns.md
  - _bmad/tea/testarch/knowledge/selector-resilience.md
  - _bmad/tea/testarch/knowledge/timing-debugging.md
  - _bmad/tea/testarch/knowledge/overview.md
  - _bmad/tea/testarch/knowledge/api-request.md
  - _bmad/tea/testarch/knowledge/auth-session.md
  - _bmad/tea/testarch/knowledge/network-recorder.md
  - _bmad/tea/testarch/knowledge/intercept-network-call.md
  - _bmad/tea/testarch/knowledge/log.md
  - _bmad/tea/testarch/knowledge/file-utils.md
  - _bmad/tea/testarch/knowledge/network-error-monitor.md
  - _bmad/tea/testarch/knowledge/fixtures-composition.md
  - _bmad/tea/testarch/knowledge/playwright-cli.md
---

# ATDD Checklist - Epic 5, Story 5.4: Audit Trust-Sensitive Changes and Preserve Governance Boundaries

**Date:** 2026-03-25
**Author:** Wesleyukadike
**Primary Test Level:** API + E2E

---

## Story Summary

Story 5.4 adds the internal audit trail needed to make trust-sensitive governance actions reviewable without leaking privileged controls into user-facing experiences. The scope is intentionally bounded: minimum audit persistence, admin-only access, a read-only audit inspector, and an extensible event model that can absorb future governance actions without redesigning the core contract.

This ATDD run targets the current `ready-for-dev` story in the implementation artifacts. The generated suites stay in dedicated `.red.atdd.spec.ts` files and document the red phase with `test.skip(...)` so the expected contract is explicit before implementation starts.

**As an** internal admin or ops user
**I want** all trust-sensitive governance actions to be auditable and isolated from end-user experiences
**So that** the product remains controllable, reviewable, and safe as it evolves

---

## Acceptance Criteria

1. Given an internal admin or ops user changes pathway definitions, evidence sources, or recommendation-governance settings, when the change is committed, then the system records an auditable event for that trust-sensitive action and preserves actor, timestamp, and relevant change context.
2. Given trust-sensitive audit persistence does not yet exist for this feature set, when this story introduces audit logging, then it creates only the minimum audit record structure needed for actor, timestamp, action type, and scoped change context and does not expand into unrelated analytics or historical replay models.
3. Given internal governance workflows exist alongside end-user recommendation workflows, when the product routes requests and permissions, then the boundary between internal trust-management activities and user-facing experiences is enforced consistently and end users cannot access or trigger privileged governance operations.
4. Given internal audit history is rendered in the admin workflow, when authorized users inspect trust-sensitive changes, then the audit view exposes a stable `data-testid="admin-audit-panel"` hook and remains inaccessible to standard end users.
5. Given the supported pathway inventory expands over time, when new pathways or governance controls are introduced, then the system can extend the governed scope without redesigning the core trust-management model and recommendation workflows remain reviewable and controllable by internal operators.

---

## Preflight and Strategy

- Detected stack: `frontend` by TEA workflow rules, with a Nuxt 4 monolith and Playwright browser/API projects already established for acceptance coverage.
- Story target: `_bmad-output/implementation-artifacts/5-4-audit-trust-sensitive-changes-and-preserve-governance-boundaries.md`.
- Generation mode: AI generation.
- Execution mode: sequential.
- Why sequential: the active run did not use delegated subagents, so the API and E2E red suites were produced deterministically in-series.
- Existing patterns reused:
  - `requireAdminSession` remains the governing access-control contract for admin-only routes
  - Better Auth sign-up/sign-in helpers already used throughout the Playwright API/E2E suites
  - `tests/support/fixtures/index.ts` merged Playwright harness with `@seontechnologies/playwright-utils`
  - existing admin access mocks and recommendation review master-detail patterns informed the audit inspector expectations
  - evidence-source audit record shapes in `app/lib/admin/evidenceSources.ts` and `server/utils/admin/evidenceSourceSchema.ts` informed the minimal event/detail contract

### Scenario-to-level mapping

- `AC1` maps to API contract coverage for audit list, detail, summary, and mutation-to-audit-ingestion expectations, plus E2E coverage for the admin inspector shell.
- `AC2` maps to API assertions that the audit payload stays minimal and explicitly excludes analytics/trend/replay expansion.
- `AC3` maps to API and E2E access-control coverage for guest and non-admin boundaries.
- `AC4` maps to E2E rendering checks for the audit panel root, summary bar, filter ribbon, and mobile tab contract.
- `AC5` maps to API summary/extensibility coverage and E2E mobile/read-only inspection continuity.

### Knowledge and doc cross-check

- Applied TEA knowledge fragments: `data-factories`, `component-tdd`, `test-quality`, `test-healing-patterns`, `selector-resilience`, `timing-debugging`, `overview`, `api-request`, `auth-session`, `network-recorder`, `intercept-network-call`, `log`, `file-utils`, `network-error-monitor`, `fixtures-composition`, `playwright-cli`.
- Cross-checked the generated Playwright guidance against current official Playwright docs for locator strategy, API testing, route mocking, and project structure:
  - https://playwright.dev/docs/locators
  - https://playwright.dev/docs/api-testing
  - https://playwright.dev/docs/mock
  - https://playwright.dev/docs/test-projects
- Cypress, pytest, JUnit, Go test, Pact, and CI-platform specifics were not applied because Story 5.4’s acceptance harness in this repo is Playwright-based.

### Red-phase rules applied

- All generated tests use `test.skip(...)`.
- Assertions describe intended governed behavior rather than placeholder truthiness.
- E2E selectors stay on `data-testid`, roles, and explicit admin-facing labels.
- Existing implemented suites were left untouched.

---

## Failing Tests Created (RED Phase)

### API Tests (5 tests)

**File:** `tests/api/admin-audit-trail.red.atdd.spec.ts` (317 lines)

- ✅ **Test:** `[P0][AC3] audit trail endpoints reject unauthenticated and non-admin callers`
  - **Status:** RED via `test.skip()`
  - **Verifies:** audit list/detail/summary routes enforce admin-only access.
- ✅ **Test:** `[P0][AC1][AC2] admin can list audit events with minimal governed fields and stable filters`
  - **Status:** RED via `test.skip()`
  - **Verifies:** the list contract exposes event metadata, filterability, and bounded payload fields only.
- ✅ **Test:** `[P0][AC1][AC4] admin can inspect a single audit event with before and after change context`
  - **Status:** RED via `test.skip()`
  - **Verifies:** audit detail exposes change context and related governed events without leaking private profile payloads.
- ✅ **Test:** `[P1][AC2][AC5] admin summary endpoint returns bounded governance statistics without analytics creep`
  - **Status:** RED via `test.skip()`
  - **Verifies:** summary data stays intentionally small while still supporting future governance scale.
- ✅ **Test:** `[P1][AC1][AC5] trust-sensitive admin mutations appear in the audit trail with scoped entity metadata`
  - **Status:** RED via `test.skip()`
  - **Verifies:** existing admin mutation flows emit reusable audit events for pathway and status changes.

### E2E Tests (5 tests)

**File:** `tests/e2e/admin-audit-trail.red.atdd.spec.ts` (257 lines)

- ✅ **Test:** `[P0][AC3] guest users are redirected to auth when opening the admin audit trail route`
  - **Status:** RED via `test.skip()`
  - **Verifies:** guests cannot remain on `/admin/audit-trail`.
- ✅ **Test:** `[P0][AC3] standard authenticated users are redirected away from the admin audit trail route`
  - **Status:** RED via `test.skip()`
  - **Verifies:** non-admin users cannot reach the privileged audit surface.
- ✅ **Test:** `[P0][AC1][AC4] admin users see the audit queue, summary stats, and detail inspector with the required panel hook`
  - **Status:** RED via `test.skip()`
  - **Verifies:** the page renders the expected audit inspector shell, including `data-testid="admin-audit-panel"`.
- ✅ **Test:** `[P1][AC1][AC2] admin users can filter the audit list and inspect the before and after diff context`
  - **Status:** RED via `test.skip()`
  - **Verifies:** the filter ribbon drives governed list queries and the detail inspector shows change diffs.
- ✅ **Test:** `[P1][AC4][AC5] mobile audit trail collapses into Events and Details tabs while preserving the summary strip`
  - **Status:** RED via `test.skip()`
  - **Verifies:** the mobile audit view retains inspection continuity without losing summary context.

### Component Tests (0 tests)

**File:** `N/A`

- Component-level red coverage was not generated because Story 5.4’s highest-risk behavior sits at the server-mediated admin boundary plus the new audit inspector route.
- Green implementation can add focused component tests once the page and child widgets exist.

---

## Data Factories Created

### New Audit Trail Factory

**File:** `tests/support/fixtures/factories/audit-trail-factory.ts`

**Exports added for red phase:**

- `createAuditTrailRouteProbe(appBaseUrl)`
- `createAuditTrailEventSummary(overrides?)`
- `createAuditTrailEventDetail(event?, overrides?)`
- `createAuditTrailListResponse(items?)`
- `createAuditTrailSummaryResponse(overrides?)`

### Reused Domain Factories

- `tests/support/fixtures/factories/pathway-inventory-factory.ts` for admin access and pathway mutation symmetry.

---

## Fixtures Created

No new merged Playwright fixture file was required.

### Reused Infrastructure

- `tests/support/fixtures/index.ts` for merged Playwright utilities and custom fixtures
- `tests/support/fixtures/custom-fixtures.ts` for `appBaseUrl`, cleanup registration, and base project fixtures
- Better Auth bootstrap helpers embedded in the red suites

---

## Mock Requirements

### Admin Audit Trail UI Mock

**Endpoints mocked in the red E2E suite:**

- `GET /api/admin/access`
- `GET /api/admin/audit-trail`
- `GET /api/admin/audit-trail/:eventId`
- `GET /api/admin/audit-trail/summary`

**Success response expectations:**

- list payload includes actor, timestamp, action type, entity metadata, reason, and `changeSummary`
- detail payload includes `changeContext.before`, `changeContext.after`, and `relatedEvents`
- summary payload includes only `eventsToday`, `eventsThisWeek`, `mostActiveActor`, and `mostChangedEntityType`
- no mocked payload introduces trend analytics, replay models, or user-private recommendation profile payloads

---

## Required data-testid Attributes

### Admin Audit Trail Surface

- `admin-audit-page` - top-level page shell
- `admin-audit-panel` - required audit panel root
- `admin-audit-summary-bar` - summary metrics strip
- `admin-audit-filter-ribbon` - filter controls container
- `admin-audit-event-list` - left-side event list container
- `admin-audit-event-row` - individual audit event row
- `admin-audit-detail-panel` - right-side detail inspector
- `admin-audit-diff-panel` - before/after diff block
- `admin-audit-mobile-tabs` - mobile tab switcher
- `admin-audit-mobile-events` - mobile events tab
- `admin-audit-mobile-detail` - mobile detail tab

---

## Implementation Checklist

### Test: API audit trail contracts and mutation-to-audit ingestion

**File:** `tests/api/admin-audit-trail.red.atdd.spec.ts`

**Tasks to make this test pass in a true pre-implementation cycle:**

- [ ] Add the Convex audit log schema, action/entity enums, and minimal query/mutation contract described in Story 5.4.
- [ ] Create guarded list, detail, and summary routes under `/api/admin/audit-trail`.
- [ ] Add `recordGovernanceAction()` calls to existing admin mutation endpoints for pathways, rules, evidence sources, and recommendation review actions.
- [ ] Ensure all audit responses preserve the minimum record shape only and exclude analytics/replay expansion.
- [ ] Remove `test.skip()` and run `./node_modules/.bin/playwright test --project=api tests/api/admin-audit-trail.red.atdd.spec.ts`.

**Estimated Effort:** 6-8 hours

### Test: E2E admin audit inspector route, boundary protection, and mobile continuity

**File:** `tests/e2e/admin-audit-trail.red.atdd.spec.ts`

**Tasks to make this test pass in a true pre-implementation cycle:**

- [ ] Add `/admin/audit-trail` to admin navigation and protect it with the existing auth/admin middleware pattern.
- [ ] Implement the approved Stitch Concept B two-panel audit inspector for desktop plus tab-switched mobile layout.
- [ ] Render the summary bar, filter ribbon, event list, detail inspector, and stable `admin-audit-panel` hook.
- [ ] Keep the page read-only and inaccessible to standard users.
- [ ] Remove `test.skip()` and run `./node_modules/.bin/playwright test --project=chromium tests/e2e/admin-audit-trail.red.atdd.spec.ts`.

**Estimated Effort:** 6-8 hours

---

## Running Tests

```bash
# Run the Story 5.4 API red suite
./node_modules/.bin/playwright test --project=api tests/api/admin-audit-trail.red.atdd.spec.ts

# Run the Story 5.4 E2E red suite
./node_modules/.bin/playwright test --project=chromium tests/e2e/admin-audit-trail.red.atdd.spec.ts

# List discovered tests only
./node_modules/.bin/playwright test --project=api tests/api/admin-audit-trail.red.atdd.spec.ts --list
./node_modules/.bin/playwright test --project=chromium tests/e2e/admin-audit-trail.red.atdd.spec.ts --list
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ Story 5.4 acceptance criteria translated into governed API and E2E tests
- ✅ Mock requirements documented
- ✅ Required `data-testid` contract listed
- ✅ Implementation checklist created

**Verification status:**

- Static artifact generation completed.
- Runtime verification is blocked in the current shell because `node`, `pnpm`, and `corepack` are not available on PATH.

### GREEN Phase (DEV Team - Next Steps)

1. Implement the audit log schema, admin APIs, and admin page.
2. Remove `test.skip()` from the generated red suites.
3. Run the targeted Playwright API and E2E commands.
4. Make the tests pass with the minimum governed implementation.

### REFACTOR Phase

- Consolidate any duplicated audit event mapping into shared server utilities.
- Add component-level tests for audit list/detail widgets once the page exists.
- Tighten payload schemas after the first green pass to keep the audit model bounded.

