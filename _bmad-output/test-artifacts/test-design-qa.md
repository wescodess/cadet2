---
stepsCompleted: []
lastStep: ''
lastSaved: '2026-03-02'
workflowType: 'testarch-test-design'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/test-artifacts/test-design-architecture.md
---

# Test Design for QA: cadet2 Recommendation Platform Foundation

**Purpose:** Test execution recipe for the QA team. This document defines what to test, how to prioritize it, and what QA needs from other teams before implementation can be validated with confidence.

**Date:** 2026-03-02
**Author:** Wesleyukadike
**Status:** Draft
**Project:** cadet2

**Related:** See Architecture doc (`_bmad-output/test-artifacts/test-design-architecture.md`) for system blockers and architectural mitigation plans.

---

## Executive Summary

**Scope:** System-level QA planning for the MVP recommendation experience, including intake continuity, recommendation lifecycle correctness, citation traceability, governance boundaries, and trust-state rendering.

**Risk Summary:**

- Total Risks: 6 (5 high-priority score >=6, 1 medium, 0 low)
- Critical Categories: TECH, DATA, SEC, PERF, BUS

**Coverage Summary:**

- P0 tests: ~4 (core workflow correctness, security, traceability)
- P1 tests: ~4 (major user and governance flows)
- P2 tests: ~2 (responsive/accessibility and secondary admin coverage)
- P3 tests: ~2 (performance and chaos validation)
- **Total:** ~12 scenario groups (~2.5-4.5 weeks with 1 QA)

---

## Not in Scope

**Components or systems explicitly excluded from this test plan:**

| Item | Reasoning | Mitigation |
| --- | --- | --- |
| **Legacy tasks route auth flow expansion** | Already covered by existing Playwright smoke coverage and not part of the new recommendation scope | Keep the current spec as a guardrail; do not expand it unless auth boundaries change |
| **Full consumer-driven contract matrix** | The provider surface is still evolving and would create early process overhead | Keep server contracts explicit now and introduce Pact once route shapes stabilize |
| **Live-provider high-load testing** | External quotas and dependency cost make this too unstable for the first validation phase | Use synthetic adapter-level load first, then add k6 against staging when access is ready |

**Note:** These exclusions are deliberate for the current phase and should be revisited once the recommendation routes are implemented.

---

## Dependencies & Test Blockers

**CRITICAL:** QA cannot proceed safely without these items from other teams.

### Backend/Architecture Dependencies (Pre-Implementation)

**Source:** See the architecture companion document for the detailed mitigation plans behind these blockers.

1. **Recommendation seed/reset hooks** - Backend - Pre-implementation
   - QA needs deterministic creation and cleanup of profile snapshots, recommendation runs, pathway definitions, and evidence states.
   - Without this, integration suites will be slow, flaky, and difficult to parallelize.

2. **Provider adapter mock and fault modes** - Platform - Pre-implementation
   - QA needs controllable success, timeout, stale-data, and hard-failure responses for AI Search, AI Gateway/OpenRouter, and R2 adapter boundaries.
   - Without this, failure-mode testing depends on live providers and becomes unreliable.

3. **Lifecycle telemetry contract** - Backend + Platform - Pre-implementation
   - QA needs canonical status transitions, correlation IDs, and timeout/degraded rules for recommendation runs.
   - Without this, it is not possible to assert whether a run completed correctly, degraded safely, or failed for the right reason.

### QA Infrastructure Setup (Pre-Implementation)

1. **Recommendation-domain factories** - QA
   - Faker-backed factories for profiles, pathway definitions, recommendation runs, and evidence snapshots
   - Fixture-tracked cleanup so parallel CI remains isolated

2. **Test Environments** - QA
   - Local: reuse the current `pnpm dev` flow and Playwright web server bootstrap
   - CI/CD: preserve `test-results/` and `playwright-report/` artifact paths already configured in `playwright.config.ts`
   - Staging: reserve a server-only config path with provider mocks enabled before live dependency testing begins

**Example factory pattern:**

```typescript
import { test } from '@seontechnologies/playwright-utils/api-request/fixtures'
import { expect } from '@playwright/test'
import { faker } from '@faker-js/faker'

test('@P0 @API creates a deterministic recommendation seed', async ({ apiRequest }) => {
  const seed = {
    runId: `run-${faker.string.uuid()}`,
    email: faker.internet.email(),
    recommendationState: 'queued',
  }

  const { status } = await apiRequest({
    method: 'POST',
    path: '/api/test-support/recommendation-seed',
    body: seed,
  })

  expect(status).toBe(201)
})
```

---

## Risk Assessment

**Note:** Full risk details live in the architecture companion. This section maps those risks to QA coverage responsibilities.

### High-Priority Risks (Score >=6)

| Risk ID | Category | Description | Score | QA Test Coverage |
| --- | --- | --- | --- | --- |
| **R-001** | TECH | Missing deterministic state control and provider stubs | **9** | Adapter and orchestration integration tests with seeded states and injected provider failures |
| **R-002** | DATA | Citation lineage can drift from evidence to output | **6** | API assertions on persisted evidence references plus integration checks on rendered citation payloads |
| **R-003** | SEC | Role boundaries can leak data or privileged actions | **6** | Negative API authorization tests plus one route-level E2E access check |
| **R-004** | PERF | Recommendation jobs can stall or miss latency expectations | **6** | Status-transition integration tests, timeout-path assertions, and later k6 baseline checks |
| **R-005** | BUS | Weak or stale recommendations can look authoritative | **6** | API contract checks on caveat fields plus E2E validation of visible degraded-state rendering |

### Medium/Low-Priority Risks

| Risk ID | Category | Description | Score | QA Test Coverage |
| --- | --- | --- | --- | --- |
| R-006 | OPS | Recommendation-domain regression coverage can lag implementation | 4 | Expand fixtures and regression suites story-by-story so coverage grows with the feature surface |

---

## Entry Criteria

**QA testing cannot begin until ALL of the following are met:**

- [ ] Requirements, assumptions, and recommendation status contracts are agreed by QA, Dev, and Product
- [ ] Local and CI test environments are provisioned and can run the current Playwright stack
- [ ] Recommendation-domain factories or seed data are available
- [ ] The pre-implementation blockers in the Dependencies section are resolved
- [ ] The feature is deployed to a testable environment with server-side provider mocks or controlled staging credentials

## Exit Criteria

**Testing phase is complete when ALL of the following are met:**

- [ ] All P0 tests are passing
- [ ] All P1 tests are passing, or any failures are triaged and explicitly accepted
- [ ] No open high-severity auth, citation-lineage, or degraded-state defects remain
- [ ] QA and Dev agree that core recommendation, auth, and trust scenarios meet the planned coverage bar
- [ ] Performance baselines for the agreed scope are met, or deferred items are explicitly accepted with owners

---

## Test Coverage Plan

**IMPORTANT:** P0/P1/P2/P3 = priority and risk level, not execution timing. Execution timing is defined later in the Execution Strategy section.

### P0 (Critical)

**Criteria:** Blocks core functionality + High risk (>=6) + No workaround + Affects majority of users

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| **P0-001** | Recommendation run lifecycle returns canonical statuses and safe transitions | API + Integration | R-001, R-004 | Validate `queued`, `evaluating`, `completed`, `degraded`, `failed` with deterministic seeds |
| **P0-002** | Workspace and admin routes enforce role and ownership boundaries | API + E2E | R-003 | One browser check complements deeper API denial-path coverage |
| **P0-003** | Recommendation output preserves citation references and freshness fields | API + Integration | R-002, R-005 | Assert every recommendation claim resolves to evidence metadata |
| **P0-004** | Provider failures downgrade or withhold weak recommendations safely | Integration | R-001, R-004, R-005 | Inject timeouts and stale data through adapter mocks |

**Total P0:** ~4 scenario groups

---

### P1 (High)

**Criteria:** Important features + Medium risk (3-4) + Common workflows + Workaround exists but difficult

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| **P1-001** | Guided intake saves drafts, restores progress, and shows accessible validation | E2E + Component | R-006 | Keep one full browser path and move field-state coverage lower |
| **P1-002** | Comparison workspace separates available-now, blocked, and strategic routes | Component + E2E | R-005 | Use component tests for rendering rules and one E2E proof path |
| **P1-003** | Governance actions create auditable events for pathway and evidence changes | API + Integration | R-003 | Validate event creation and safe permissions at the backend boundary |
| **P1-004** | Recommendation refresh creates a new run against the latest profile snapshot | API + Integration | R-002, R-006 | Preserve lineage and prior history while re-evaluating |

**Total P1:** ~4 scenario groups

---

### P2 (Medium)

**Criteria:** Secondary features + Low risk (1-2) + Edge cases + Regression prevention

| Test ID | Requirement | Test Level | Risk Link | Notes |
| --- | --- | --- | --- | --- |
| **P2-001** | Trust-state UI remains readable and keyboard-safe across desktop and mobile | E2E | R-005, R-006 | Focus on accessibility and responsive regressions |
| **P2-002** | Admin review surfaces support stale or weak evidence triage without data leakage | Component + E2E smoke | R-003, R-006 | Moderate-risk internal workflow coverage only |

**Total P2:** ~2 scenario groups

---

### P3 (Low)

**Criteria:** Nice-to-have + Exploratory + Performance benchmarks + Documentation validation

| Test ID | Requirement | Test Level | Notes |
| --- | --- | --- | --- |
| **P3-001** | Large synthetic recommendation-load baseline stays within agreed thresholds | Performance harness | Run only after telemetry and seed hooks are available |
| **P3-002** | Weekly dependency outage and recovery drills validate playbooks | Weekly integration or chaos | Focus on resilience, not every PR gate |

**Total P3:** ~2 scenario groups

---

## Execution Strategy

**Philosophy:** Run everything in PRs unless it is expensive or long-running. The existing Playwright stack already supports parallel execution and artifact capture, so most functional coverage should stay in the main pipeline.

### Every PR: Playwright Tests (~10-15 min)

**All functional tests** (from any priority level):

- All API, integration, component, and selective E2E checks that can run through the current Playwright stack
- Parallelized across 2 CI workers by default, matching the current `playwright.config.ts`
- Total: ~10-12 Playwright-backed scenario groups once the planned system suite is in place

**Why run in PRs:** Fast feedback, shared fixtures, existing artifact retention, and no additional infrastructure cost.

### Nightly: k6 Performance Tests (~30-60 min)

**All performance-oriented tests** (only when the dependency is ready):

- Protocol-level recommendation latency baselines
- Synthetic load on recommendation status polling and core API routes
- Threshold checks once telemetry and staging readiness exist

**Why defer to nightly:** Requires additional setup, stronger environment control, and is heavier than the functional PR suite.

### Weekly: Chaos & Long-Running (~hours)

**Special infrastructure tests** (expensive or operationally disruptive):

- Provider outage simulations across AI Search, AI Gateway/OpenRouter, and R2 adapter paths
- Recommendation recovery and replay drills
- Extended resilience or accessibility sweeps that are too heavy for nightly runs

**Why defer to weekly:** These are high-value resilience checks, but they are expensive and do not need per-commit execution.

**Manual tests** (excluded from automation):

- Final operational sign-off on staging credentials and quota behavior
- One-off documentation and runbook reviews
- Cross-team verification when new provider credentials or policies are introduced

---

## QA Effort Estimate

**QA test development effort only** (excludes DevOps, Backend, Data, and Security implementation work):

| Priority | Count | Effort Range | Notes |
| --- | --- | --- | --- |
| P0 | ~4 | ~1-1.5 weeks | Highest setup cost because of deterministic state and fault injection needs |
| P1 | ~4 | ~1-1.5 weeks | Mix of API and UI coverage using the existing Playwright stack |
| P2 | ~2 | ~2-4 days | Mostly targeted UI regression and accessibility checks |
| P3 | ~2 | ~1-2 days | Scheduled performance and resilience scaffolding only |
| **Total** | **~12** | **~2.5-4.5 weeks** | **1 QA engineer, full-time** |

**Assumptions:**

- Includes test design refinement, implementation, debugging, and CI wiring
- Excludes ongoing maintenance and any backend hooks required to make the plan testable
- Assumes the seed/mocking blockers are resolved before broad suite implementation begins

**Dependencies from other teams:**

- Backend and Platform must deliver the blocker contracts listed earlier before QA can realize the plan at full speed

---

## Implementation Planning Handoff

| Work Item | Owner | Target Milestone (Optional) | Dependencies/Notes |
| --- | --- | --- | --- |
| Build recommendation-domain seed/reset support | Backend | Pre-implementation | Blocks P0-001, P0-003, P1-004 |
| Add provider mock and fault modes | Platform | Pre-implementation | Blocks P0-004 and weekly resilience checks |
| Expand Playwright fixture library for recommendation entities | QA + Dev | Early implementation | Needed to keep tests parallel-safe |
| Add k6 baseline scripts for recommendation endpoints | QA + Platform | After telemetry contract lands | Depends on lifecycle metrics and staging readiness |

---

## Tooling & Access

| Tool or Service | Purpose | Access Required | Status |
| --- | --- | --- | --- |
| Playwright Test | Main PR automation for API, integration, component, and E2E checks | Already in repo | Ready |
| `@seontechnologies/playwright-utils` | API request, auth session, and network helpers | Already in repo | Ready |
| k6 | Nightly performance baselines | Local install and optional Grafana Cloud token | Pending |
| Provider mock harness | Deterministic failure-mode testing | Server-side feature flag or dedicated test config | Pending |
| Staging provider credentials | Later live-provider validation | Restricted server-side credentials | Pending |

**Access requests needed (if any):**

- [ ] Confirm whether k6 will run locally only or via Grafana Cloud
- [ ] Reserve a staging configuration with provider mocks disabled only for controlled validation windows

---

## Interworking & Regression

**Services and components impacted by this feature:**

| Service/Component | Impact | Regression Scope | Validation Steps |
| --- | --- | --- | --- |
| **Workspace intake flow** | New draft and submit behavior drives recommendation runs | Existing auth and navigation smoke plus new intake persistence checks | Validate save, resume, submit, and access boundaries |
| **Recommendation API routes** | New orchestration and retrieval contracts | All lifecycle, refresh, and citation API assertions | Validate status transitions, lineage, and degraded states |
| **Convex workflow state** | Recommendation run persistence and progression | State transition and history regression checks | Validate run creation, updates, and history retention |
| **Admin governance routes** | Pathway and evidence controls affect trust posture | Permission and audit-event regression checks | Validate role restrictions and audit event creation |

**Regression test strategy:**

- Re-run the existing auth/task smoke coverage plus the new recommendation-domain suite before release.
- Treat any auth, citation-lineage, or degraded-state failure as release-blocking until triaged and resolved.
- Coordinate with Backend and Platform when provider adapter contracts or mock modes change, because those changes directly affect deterministic coverage.

---

## Appendix A: Code Examples & Tagging

**Playwright tags for selective execution:**

```typescript
import { test } from '@seontechnologies/playwright-utils/api-request/fixtures'
import { expect } from '@playwright/test'

test('@P0 @API @Security standard user cannot access admin pathways', async ({ apiRequest }) => {
  const { status } = await apiRequest({
    method: 'GET',
    path: '/api/admin/pathways',
  })

  expect(status).toBe(403)
})

test('@P1 @Integration recommendation run exposes degraded state on adapter timeout', async ({ apiRequest }) => {
  const { status, body } = await apiRequest({
    method: 'POST',
    path: '/api/recommendations',
    body: { simulateProviderTimeout: true },
  })

  expect(status).toBe(202)
  expect(body.status).toBe('degraded')
})
```

**Run specific tags:**

```bash
# Run only P0 tests
npx playwright test --grep @P0

# Run P0 + P1 tests
npx playwright test --grep "@P0|@P1"

# Run all Playwright tests in PR
npx playwright test
```

---

## Appendix B: Knowledge Base References

- **Risk Governance:** `_bmad/tea/testarch/knowledge/risk-governance.md`
- **Probability and Impact:** `_bmad/tea/testarch/knowledge/probability-impact.md`
- **Test Priorities Matrix:** `_bmad/tea/testarch/knowledge/test-priorities-matrix.md`
- **Test Levels Framework:** `_bmad/tea/testarch/knowledge/test-levels-framework.md`
- **Test Quality:** `_bmad/tea/testarch/knowledge/test-quality.md`
- **Playwright CLI:** `_bmad/tea/testarch/knowledge/playwright-cli.md`
- **Playwright Utils Overview:** `_bmad/tea/testarch/knowledge/overview.md`

---

**Generated by:** BMad TEA Agent
**Workflow:** `_bmad/tea/testarch/test-design`
**Version:** 4.0 (BMad v6)
