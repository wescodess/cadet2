---
stepsCompleted: []
lastStep: ''
lastSaved: '2026-03-02'
workflowType: 'testarch-test-design'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/test-artifacts/test-design-progress.md
---

# Test Design for Architecture: cadet2 Recommendation Platform Foundation

**Purpose:** Architectural concerns, testability gaps, and NFR requirements for review by Architecture and Development teams. This document is the pre-implementation contract for what engineering must provide before QA can build reliable system tests.

**Date:** 2026-03-02
**Author:** Wesleyukadike
**Status:** Architecture Review Pending
**Project:** cadet2
**PRD Reference:** `_bmad-output/planning-artifacts/prd.md`
**ADR Reference:** `_bmad-output/planning-artifacts/architecture.md`

---

## Executive Summary

**Scope:** System-level test design for the MVP recommendation platform covering guided intake, recommendation-run orchestration, evidence traceability, trust signaling, and internal governance controls.

**Business Context** (from PRD):

- **Revenue/Impact:** Early success depends on trust, repeat use, and actionability rather than immediate monetization.
- **Problem:** Users need clear, evidence-backed immigration pathway guidance instead of fragmented research and opaque recommendation outputs.
- **GA Launch:** No fixed GA date is committed in the planning artifacts; the current goal is an MVP validation phase.

**Architecture** (from the current architecture decision document):

- **Key Decision 1:** Keep a modular Nuxt 4 monolith with server-mediated provider access.
- **Key Decision 2:** Model recommendation runs as versioned, auditable workflow artifacts.
- **Key Decision 3:** Preserve split persistence across PostgreSQL, Convex, and Cloudflare-managed evidence storage/retrieval.

**Expected Scale** (from planning artifacts):

- Early-stage validation traffic with moderate user volume and a narrow MVP pathway catalog
- Sensitive user data and trust-sensitive recommendation outputs
- Long-running recommendation workflows that must degrade safely when dependencies weaken

**Risk Summary:**

- **Total risks:** 6
- **High-priority (>=6):** 5 risks requiring action before release
- **Test effort:** ~12 scenario groups (~2.5-4.5 weeks for 1 QA, ~1.5-2.5 weeks for 2 QAs)

---

## Quick Guide

### 🚨 BLOCKERS - Team Must Decide (Can't Proceed Without)

**Pre-Implementation Critical Path** - QA cannot write reliable integration tests until these are resolved:

1. **R-001: Deterministic state control** - Provide seeded create/reset hooks for recommendation runs, pathway data, and evidence freshness states (recommended owner: Backend).
2. **Provider mock harness** - Formalize mock and fault-injection paths for AI Search, AI Gateway/OpenRouter, and R2 adapters (recommended owner: Platform).
3. **R-004: Lifecycle telemetry contract** - Publish canonical stage transitions, timeout rules, and correlation IDs for recommendation runs (recommended owner: Backend + Platform).

**What we need from team:** Complete these 3 items before test development moves beyond isolated UI auth flows.

---

### ⚠️ HIGH PRIORITY - Team Should Validate (We Provide Recommendation, You Approve)

1. **R-002: Citation lineage** - Approve immutable evidence snapshot references in recommendation run records (owner to confirm: Backend + Data).
2. **R-003: Authorization and audit boundaries** - Approve capability checks and trust-action logging on all admin and workspace routes (owner to confirm: Backend + Security).
3. **R-005: Low-confidence rendering rules** - Approve mandatory degraded-state UI fields for caveats, freshness, and confidence (owner to confirm: Product + Frontend).

**What we need from team:** Review these recommendations and confirm they are part of the implementation baseline.

---

### 📋 INFO ONLY - Solutions Provided (Review, No Decisions Needed)

1. **Test strategy:** API and integration first for workflow correctness, with minimal E2E for route and trust-signal confirmation.
2. **Tooling:** Existing Playwright stack plus `@seontechnologies/playwright-utils`; k6 is recommended later for performance baselines.
3. **Tiered CI/CD:** PR for all functional checks under ~15 minutes, nightly for heavier regressions, weekly for chaos and long-running checks.
4. **Coverage:** ~12 scenario groups prioritized P0-P3 around auth, orchestration, citations, governance, and recommendation UX contracts.
5. **Quality gates:** P0 at 100 percent pass, P1 at 95 percent or better, with all score-6+ risks mitigated or formally waived.

**What we need from team:** Review and acknowledge. These are operational recommendations, not decision blockers.

---

## For Architects and Devs - Open Topics

### Risk Assessment

**Total risks identified:** 6 (5 high-priority score >=6, 1 medium, 0 low)

#### High-Priority Risks (Score >=6) - IMMEDIATE ATTENTION

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **R-001** | **TECH** | Recommendation orchestration cannot be tested deterministically because seeded state and provider stubs are not yet formalized. | 3 | 3 | **9** | Seed/reset interfaces and mockable provider adapters | Backend + Platform | Pre-implementation |
| **R-002** | **DATA** | Citation lineage could break between retrieved evidence and rendered recommendation output. | 2 | 3 | **6** | Immutable evidence snapshot IDs and citation references | Backend + Data | Pre-implementation |
| **R-003** | **SEC** | End-user and admin boundaries may leak sensitive data or privileged actions if capability checks are incomplete. | 2 | 3 | **6** | Route-level authorization plus trust-action audit logging | Backend + Security | Pre-implementation |
| **R-004** | **PERF** | Recommendation jobs may stall or miss latency expectations without explicit telemetry and timeout handling. | 2 | 3 | **6** | Stage-level SLAs, timeout rules, and observable run transitions | Backend + Platform | Pre-implementation |
| **R-005** | **BUS** | Weak or stale recommendations may appear authoritative if degraded-state UX rules are not enforced. | 2 | 3 | **6** | Mandatory confidence, freshness, and caveat rendering rules | Product + Frontend | Implementation phase start |

#### Medium-Priority Risks (Score 3-5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-006 | OPS | The current harness covers auth/tasks flows but not recommendation-domain entities, so regression blind spots can grow during implementation. | 2 | 2 | 4 | Expand fixtures and recommendation API suites alongside each new contract | QA + Dev |

#### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| --- | --- | --- | --- | --- | --- | --- |
| None | - | No low-priority risks were identified at this stage; current exposure is concentrated in higher-impact pre-implementation gaps. | - | - | - | Monitor |

#### Risk Category Legend

- **TECH**: Technical or architecture issues
- **SEC**: Security and access-control risks
- **PERF**: Performance, latency, or scaling risks
- **DATA**: Data integrity and traceability risks
- **BUS**: Trust, UX, and business-outcome risks
- **OPS**: Operational and workflow execution risks

---

### Testability Concerns and Architectural Gaps

**🚨 ACTIONABLE CONCERNS - Architecture Team Must Address**

#### 1. Blockers to Fast Feedback (WHAT WE NEED FROM ARCHITECTURE)

| Concern | Impact | What Architecture Must Provide | Owner | Timeline |
| --- | --- | --- | --- | --- |
| **No recommendation-domain seeding path** | QA cannot create reproducible profile, pathway, or degraded run states | Deterministic seed/reset endpoints or internal test hooks for recommendation entities | Backend | Pre-implementation |
| **No provider fault harness** | External dependency failures can only be tested through brittle live integrations | Injectable mock/fault modes for AI Search, AI Gateway/OpenRouter, and R2 adapters | Platform | Pre-implementation |
| **No canonical telemetry contract yet** | Failed or delayed runs cannot be asserted precisely | Correlation IDs, stage transition events, and timeout taxonomy for recommendation runs | Backend + Platform | Pre-implementation |

#### 2. Architectural Improvements Needed (WHAT SHOULD BE CHANGED)

1. **Promote provider adapters to explicit test seams**
   - **Current problem:** The architecture names provider adapters, but failure-mode contracts are still implicit.
   - **Required change:** Define adapter interfaces and supported stub/fault behaviors as part of the implementation contract.
   - **Impact if not fixed:** Integration tests collapse into slow live-provider E2E checks.
   - **Owner:** Platform
   - **Timeline:** Pre-implementation

2. **Treat recommendation lifecycle events as first-class test targets**
   - **Current problem:** Status names are defined, but observable event payloads and timing thresholds are not.
   - **Required change:** Document emitted state transitions, retry rules, timeout thresholds, and degraded-state triggers.
   - **Impact if not fixed:** Latency and safe-degradation assertions remain subjective.
   - **Owner:** Backend
   - **Timeline:** Pre-implementation

3. **Lock citation lineage into the persisted run model**
   - **Current problem:** The architecture requires traceability, but the exact evidence snapshot contract is still flexible.
   - **Required change:** Persist recommendation outputs with immutable evidence snapshot IDs, source freshness metadata, and explicit caveat fields.
   - **Impact if not fixed:** Trust validation becomes manual and error-prone.
   - **Owner:** Backend + Data
   - **Timeline:** Pre-implementation

---

### Testability Assessment Summary

#### What Works Well

- The existing Playwright config already supports retries, traces on first retry, failure screenshots, and JUnit/HTML artifacts.
- The current fixture layer already composes `api-request`, `auth-session`, and network monitoring utilities, which lowers the cost of expanding API-first coverage.
- The architecture keeps external providers behind local server boundaries, which is the correct shape for future deterministic mocking and contract validation.

#### Accepted Trade-offs (No Action Required)

- **Contract testing is deferred for now** - The provider surface is still stabilizing; deferring full Pact coverage is acceptable in the MVP foundation phase if server contracts remain explicit.
- **k6 performance work is staged after functional confidence** - Deferring deeper load baselines until telemetry and seed hooks exist is acceptable for the current phase.

This is acceptable Phase 1 technical debt that should be revisited once the recommendation routes and provider adapters are implemented.

---

### Risk Mitigation Plans (High-Priority Risks >=6)

#### R-001: Deterministic recommendation-state testing gap (Score: 9) - BLOCKER

**Mitigation Strategy:**

1. Add test-only seed/reset hooks for recommendation runs, pathway definitions, and evidence freshness states.
2. Define provider adapters with injectable mock and fault behaviors.
3. Prove the contract by adding one deterministic integration test for each major recommendation stage.

**Owner:** Backend + Platform
**Timeline:** Pre-implementation
**Status:** Planned
**Verification:** A test suite can create and tear down deterministic recommendation states without live provider dependencies.

#### R-002: Citation lineage drift (Score: 6) - HIGH

**Mitigation Strategy:**

1. Persist immutable evidence snapshot IDs alongside each recommendation output.
2. Store freshness metadata and explicit caveat fields in the run record.
3. Add API assertions that every recommendation claim resolves back to a stored evidence reference.

**Owner:** Backend + Data
**Timeline:** Pre-implementation
**Status:** Planned
**Verification:** API and integration tests confirm every rendered citation maps to a persisted evidence reference and freshness value.

#### R-003: Authorization and audit leakage (Score: 6) - HIGH

**Mitigation Strategy:**

1. Enforce capability checks on all workspace and admin routes at the server boundary.
2. Add trust-action audit logging for pathway, evidence, and governance changes.
3. Add negative tests for cross-user access and standard-user access to admin routes.

**Owner:** Backend + Security
**Timeline:** Pre-implementation
**Status:** Planned
**Verification:** Unauthorized requests return safe failures, and successful trust actions generate auditable events.

#### R-004: Lifecycle visibility and timeout gaps (Score: 6) - HIGH

**Mitigation Strategy:**

1. Define the canonical recommendation lifecycle event model and timeout thresholds.
2. Emit correlation IDs and stage timestamps for each run.
3. Add degraded-state handling rules when dependency deadlines are exceeded.

**Owner:** Backend + Platform
**Timeline:** Pre-implementation
**Status:** Planned
**Verification:** Integration tests can distinguish normal completion, degraded completion, and failure based on emitted state transitions.

#### R-005: Weak guidance presented as strong guidance (Score: 6) - HIGH

**Mitigation Strategy:**

1. Require confidence, freshness, and caveat fields in the response contract.
2. Enforce UI rendering rules that visibly downgrade weak or stale outputs.
3. Add review checkpoints for any recommendation tier shown as strong-fit.

**Owner:** Product + Frontend
**Timeline:** Implementation phase start
**Status:** Planned
**Verification:** UI and API checks confirm low-confidence outputs never render without visible warnings and degraded labels.

---

### Assumptions and Dependencies

#### Assumptions

1. The current architecture document remains the active source of truth until dedicated ADR shards are introduced.
2. The MVP will stay narrow enough that API-first validation can cover most logic before browser coverage expands.
3. Existing Playwright and fixture patterns will be extended rather than replaced with a second test stack.

#### Dependencies

1. Deterministic seed/reset hooks for recommendation-domain entities - required before system integration tests scale.
2. Provider adapter mock/fault modes - required before dependency failure testing becomes reliable.
3. Lifecycle telemetry contract for recommendation runs - required before latency and degraded-state quality gates are enforceable.
4. Optional k6 access and credentials - required only when the team is ready to start scheduled performance baselines.

#### Risks to Plan

- **Risk:** Non-production provider quotas or credentials may prevent realistic performance validation.
  - **Impact:** Nightly and weekly performance checks could be incomplete or overly synthetic.
  - **Contingency:** Start with adapter-level synthetic load and upgrade to live quota tests only after stable staging access exists.

---

**End of Architecture Document**

**Next Steps for Architecture Team:**

1. Resolve the three blocker items in the Quick Guide.
2. Confirm ownership and timelines for R-002 through R-005.
3. Lock the recommendation response contract around lifecycle, citation, and caveat fields.
4. Hand the final contract to QA for fixture and suite expansion.

**Next Steps for QA Team:**

1. Wait for the blocker contracts to exist before building broad integration suites.
2. Use the companion QA document for concrete scenario planning and execution.
3. Expand the existing Playwright-first fixture layer instead of introducing a parallel harness.
