---
stepsCompleted:
  - step-01-preflight-and-context
  - step-02-generation-mode
  - step-03-test-strategy
  - step-04c-aggregate
  - step-05-validate-and-complete
lastStep: step-05-validate-and-complete
lastSaved: '2026-03-11T07:35:16Z'
workflowType: testarch-atdd
tddPhase: RED
totalTests: 12
inputDocuments:
  - _bmad/tea/config.yaml
  - _bmad/tea/testarch/tea-index.csv
  - _bmad-output/implementation-artifacts/3-4-display-citations-source-context-and-trust-boundaries.md
  - package.json
  - playwright.config.ts
  - tests/support/fixtures/index.ts
  - tests/support/fixtures/custom-fixtures.ts
  - tests/support/fixtures/factories/recommendation-citations-factory.ts
  - tests/support/fixtures/factories/recommendation-lifecycle-factory.ts
  - tests/support/fixtures/test-data.ts
  - tests/api/recommendation-citations.atdd.spec.ts
  - tests/e2e/workspace-recommendation-citations.atdd.spec.ts
  - _bmad/tea/testarch/knowledge/data-factories.md
  - _bmad/tea/testarch/knowledge/test-quality.md
  - _bmad/tea/testarch/knowledge/selector-resilience.md
  - _bmad/tea/testarch/knowledge/network-first.md
  - _bmad/tea/testarch/knowledge/api-request.md
  - _bmad/tea/testarch/knowledge/playwright-cli.md
---

# ATDD Checklist - Epic 3, Story 3.4: Display Citations, Source Context, and Trust Boundaries

**Date:** 2026-03-11
**Author:** Wesleyukadike
**Primary Test Level:** API contracts plus E2E recommendation workspace journeys

---

## Story Summary

Story 3.4 adds inspectable citations, source-context disclosure, and explicit trust-boundary labels to recommendation results. This ATDD run preserves a canonical RED-phase artifact set in dedicated `*.red.atdd.spec.ts` files while leaving the existing green `*.atdd.spec.ts` coverage untouched.

**As a** immigration user
**I want** to inspect citations and trust boundaries behind recommendation claims
**So that** I can distinguish source-backed facts from inference and review caveats safely

---

## Preflight & Context (Step 1)

- **Detected stack:** `fullstack`
  Nuxt frontend plus browser-facing recommendation APIs and existing Playwright API/E2E projects were both detected.
- **Prerequisites:** ✅ satisfied
  The story file has explicit, testable acceptance criteria; `playwright.config.ts` is present; shared fixtures/helpers already exist under `tests/support/fixtures`.
- **Existing patterns reviewed:** ✅
  Current green coverage already exists in:
  - `tests/api/recommendation-citations.atdd.spec.ts`
  - `tests/e2e/workspace-recommendation-citations.atdd.spec.ts`
- **Knowledge fragments loaded:** `data-factories`, `test-quality`, `selector-resilience`, `network-first`, `api-request`, `playwright-cli`

Why this matters: the older checklist had drifted and still labeled the live green files as RED/skipped coverage. This run corrects that mismatch.

---

## Generation Mode (Step 2)

- **Selected mode:** AI generation
- **Why:** selectors, fixture patterns, and route-mocking patterns are already clear from the green Story 3.4 suite and supporting factories. No live browser recording was needed.

---

## Test Strategy (Step 3)

| AC | Scenario focus | Test level | Priority |
| --- | --- | --- | --- |
| AC1 | citation arrays, inspectable source context, stable hooks | API + E2E | P0 |
| AC2 | trust-boundary disclosure and caveat distinctions | API + E2E | P0 |
| AC3 | fallback safety, visible text, keyboard/mobile reachability | API + E2E | P1 |

RED-phase rule applied:

- All preserved RED artifacts use `test.skip(...)`
- Assertions target the expected green-phase behavior
- The new RED files are additive and do not replace the active green suite

---

## Failing Tests Created (RED Phase)

### API Tests (5 tests)

**File:** `tests/api/recommendation-citations.red.atdd.spec.ts`

- ✅ `[P0][AC1]` recommendation results include citation arrays attached to each candidate with valid citation structure
- ✅ `[P0][AC2]` recommendation results expose a trust-boundary classification for each candidate
- ✅ `[P0][AC2]` source-backed and inferred trust boundaries are semantically distinct on the response
- ✅ `[P1][AC3]` failed or degraded recommendation runs return empty citation arrays and appropriate trust-boundary defaults
- ✅ `[P1][AC3]` citation data does not regress existing comparison, blocker, or tradeoff modules

**Expected red-phase failure reason:** before implementation, the results contract would be missing `citations`, `trustBoundary`, or fallback-safe rendering metadata.

### E2E Tests (7 tests)

**File:** `tests/e2e/workspace-recommendation-citations.red.atdd.spec.ts`

- ✅ `[P0][AC1]` workspace renders a citation list for each recommendation candidate with inspectable source context
- ✅ `[P0][AC2]` workspace distinguishes source-backed, inferred, and system-generated trust boundaries with visible disclosure
- ✅ `[P0][AC2]` inferred and system-generated candidates display visible caveat warnings
- ✅ `[P0][AC3]` trust information and citations are exposed as visible text, not color-only
- ✅ `[P1][AC3]` citation controls are keyboard-navigable
- ✅ `[P1][AC1][AC3]` citation list is visible and navigable on mobile viewport
- ✅ `[P2][AC1]` citation items link to the source URL

**Expected red-phase failure reason:** before implementation, the comparison workspace would lack the citation list, trust-boundary copy, disclosure controls, and stable test hooks needed by these assertions.

---

## TDD Red-Phase Validation (Step 4 Aggregate)

- ✅ Both generated spec files use `test.skip(...)`
- ✅ No placeholder assertions were introduced
- ✅ Existing shared fixtures are reused instead of creating a parallel harness
- ✅ Existing green files remain untouched:
  - `tests/api/recommendation-citations.atdd.spec.ts`
  - `tests/e2e/workspace-recommendation-citations.atdd.spec.ts`
- ✅ Canonical RED artifact set now lives in:
  - `tests/api/recommendation-citations.red.atdd.spec.ts`
  - `tests/e2e/workspace-recommendation-citations.red.atdd.spec.ts`

Fixture needs for green implementation were already satisfied by the existing shared stack:

- authenticated request/page setup from `tests/support/fixtures`
- recommendation citation/candidate builders from `tests/support/fixtures/factories/recommendation-citations-factory.ts`
- recommendation lifecycle route probes from `tests/support/fixtures/factories/recommendation-lifecycle-factory.ts`

No new factory or fixture file was required for this preserved RED run.

---

## Required `data-testid` Attributes

| Attribute | Surface | Covered by |
| --- | --- | --- |
| `recommendation-citation-list` | citation list container | E2E AC1, AC3 |
| `citation-item` | individual citation disclosure trigger | E2E AC1, AC3 |
| `evidence-confidence-panel` | trust/caveat disclosure panel | E2E AC2, AC3 |
| `trust-boundary-badge` | visible trust classification label | E2E AC2, AC3 |
| `caveat-warning` | explicit caution text | E2E AC2 |

Selector strategy followed: `data-testid` first, then role/text assertions where the user-visible copy is part of the contract.

---

## Mock Requirements

### Workspace Recommendation Run Surfaces

**Endpoints mocked in E2E RED artifacts:**

- `GET /api/workspace/recommendation-runs`
- `POST /api/recommendations/runs/:runId/start`
- `GET /api/recommendations/runs/:runId/status`
- `GET /api/recommendations/runs/:runId/results`

**Purpose:** keep the E2E flow deterministic and network-first without depending on live recommendation generation.

### Recommendation Results Contract

**API contract focus:**

- `citations` must always be an array
- `trustBoundary` must always be present and canonical
- degraded/failed-safe outputs must preserve empty arrays plus safe defaults
- existing comparison/blocker/tradeoff structures must remain present

---

## Implementation Checklist

### API Contract Group

**File:** `tests/api/recommendation-citations.red.atdd.spec.ts`

Tasks to make these tests pass in a true pre-implementation sequence:

- [ ] extend recommendation result candidates with `citations`
- [ ] classify and expose `trustBoundary` server-side
- [ ] preserve safe fallback defaults for degraded/failed runs
- [ ] keep comparison, blocker, tradeoff, and action metadata intact
- [ ] remove `test.skip()` from the API RED file when starting green phase

**Estimated effort:** 2.5 hours

### Recommendation Workspace Group

**File:** `tests/e2e/workspace-recommendation-citations.red.atdd.spec.ts`

Tasks to make these tests pass in a true pre-implementation sequence:

- [ ] render citation disclosure UI inside the comparison card
- [ ] render visible trust-boundary labels and caveat text
- [ ] keep disclosure controls keyboard reachable
- [ ] preserve mobile-safe progressive disclosure behavior
- [ ] expose the required `data-testid` hooks
- [ ] remove `test.skip()` from the E2E RED file when starting green phase

**Estimated effort:** 3.0 hours

---

## Running Tests

```bash
# List preserved RED-phase Story 3.4 tests
pnpm exec playwright test --list tests/api/recommendation-citations.red.atdd.spec.ts --project=api
pnpm exec playwright test --list tests/e2e/workspace-recommendation-citations.red.atdd.spec.ts --project=chromium

# Run live green Story 3.4 tests
pnpm exec playwright test tests/api/recommendation-citations.atdd.spec.ts --project=api
pnpm exec playwright test tests/e2e/workspace-recommendation-citations.atdd.spec.ts --project=chromium
```

---

## Red-Green-Refactor Workflow

### RED Phase (preserved) ✅

- preserved canonical RED API and E2E acceptance specs under `*.red.atdd.spec.ts`
- kept `test.skip(...)` to avoid regressing the already-green Story 3.4 suite
- documented the real gap between the stale checklist and the current repo state

### GREEN Phase (already achieved elsewhere in repo)

- the active Story 3.4 green suite remains in the non-red `*.atdd.spec.ts` files
- if replaying the original sequence, start by removing `test.skip(...)` from the RED files and implementing only enough code to satisfy one test at a time

### REFACTOR Phase

- keep the RED artifacts as historical acceptance references
- continue using shared fixtures and recommendation-domain builders rather than duplicating harness code

---

## Validation Summary (Step 5)

- ✅ Output file now matches repo reality
- ✅ RED artifacts exist as additive files and do not overwrite green coverage
- ✅ Checklist no longer falsely claims the live green files are skipped RED tests
- ✅ Generated files load through the project’s Playwright conventions
- ✅ No browser automation sessions were opened, so no session cleanup was required

Next recommended workflow: `dev-story` only if you want to implement a new story from RED to GREEN. For Story 3.4 specifically, the active implementation is already green; these RED files now serve as preserved acceptance references.
