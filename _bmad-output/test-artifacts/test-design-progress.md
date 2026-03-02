---
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
lastSaved: '2026-03-02'
inputDocuments:
  - _bmad/tea/config.yaml
  - package.json
  - playwright.config.ts
  - tests/README.md
  - tests/e2e/tasks-auth.spec.ts
  - tests/support/fixtures/index.ts
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/project-context.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - docs/technology-stack.md
  - _bmad/tea/testarch/knowledge/adr-quality-readiness-checklist.md
  - _bmad/tea/testarch/knowledge/test-levels-framework.md
  - _bmad/tea/testarch/knowledge/risk-governance.md
  - _bmad/tea/testarch/knowledge/probability-impact.md
  - _bmad/tea/testarch/knowledge/test-quality.md
  - _bmad/tea/testarch/knowledge/playwright-cli.md
  - _bmad/tea/testarch/knowledge/overview.md
  - _bmad/tea/testarch/knowledge/api-request.md
  - _bmad/tea/testarch/knowledge/auth-session.md
  - _bmad/tea/testarch/knowledge/pact-mcp.md
  - _bmad/tea/testarch/knowledge/pactjs-utils-overview.md
  - _bmad/tea/testarch/knowledge/pactjs-utils-consumer-helpers.md
  - _bmad/tea/testarch/knowledge/pactjs-utils-provider-verifier.md
  - _bmad/tea/testarch/knowledge/pactjs-utils-request-filter.md
---

# Step 1: Detect Mode & Prerequisites

- Mode selected: System-Level
- Reasoning: No `sprint-status.yaml` implementation artifact is present, and system-level planning artifacts are available (`prd.md`, `architecture.md`).
- Prerequisite check:
  - PRD available: `_bmad-output/planning-artifacts/prd.md`
  - Architecture/tech-spec available: `_bmad-output/planning-artifacts/architecture.md`
  - Supporting context available: `_bmad-output/project-context.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`
- Outcome: Proceed with system-level test design (Architecture + QA documents).

# Step 2: Load Context & Knowledge Base

- Configuration loaded:
  - `tea_use_playwright_utils: true`
  - `tea_use_pactjs_utils: true`
  - `tea_pact_mcp: mcp`
  - `tea_browser_automation: auto`
  - `test_artifacts: {project-root}/_bmad-output/test-artifacts`
- Detected stack: Fullstack
  - Evidence: Nuxt + Vue frontend, Playwright E2E harness, server-side Nuxt API routes and Convex backend modules documented in project artifacts.
- System-level artifacts loaded:
  - PRD: `_bmad-output/planning-artifacts/prd.md`
  - Architecture: `_bmad-output/planning-artifacts/architecture.md`
  - Epics: `_bmad-output/planning-artifacts/epics.md`
  - Supporting context: `_bmad-output/project-context.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`, `docs/technology-stack.md`
- Existing test foundation loaded:
  - `playwright.config.ts`
  - `tests/README.md`
  - `tests/e2e/tasks-auth.spec.ts`
  - `tests/support/fixtures/index.ts`
- Required knowledge fragments loaded:
  - System-level required: `adr-quality-readiness-checklist`, `test-levels-framework`, `risk-governance`, `test-quality`
  - Browser automation support: `playwright-cli`
  - Playwright Utils support: `overview`, `api-request`, `auth-session`
  - Pact support enabled in config: `pact-mcp`, `pactjs-utils-*`
- Missing or partial inputs:
  - No separate ADR file was found; the main architecture document is being used as the architecture-decision source.
- Outcome: Context is sufficient to perform system-level risk and testability design.

# Step 3: Testability & Risk Assessment

## 1. Testability Review

### 🚨 Testability Concerns

1. **No deterministic recommendation-state seeding path yet**
   - Impact: QA cannot reliably create profile snapshots, pathway catalogs, evidence freshness states, or degraded recommendation runs on demand.
   - Why it matters: The architecture expects asynchronous, versioned recommendation workflows, but there is no documented pre-implementation seed/reset API or fixture contract for those future states.
   - Action: Add dev/staging-only seed/reset primitives for recommendation runs, pathway definitions, and evidence states before broad integration test authoring.

2. **External provider dependencies are not yet mockable by contract**
   - Impact: Cloudflare AI Search, AI Gateway/OpenRouter, and R2-backed flows can force brittle end-to-end tests if adapters and stub points are not formalized.
   - Why it matters: The architecture correctly keeps providers server-side, but it does not yet define deterministic mock adapters, replay fixtures, or fault-injection hooks for those integrations.
   - Action: Standardize provider adapters behind injectable interfaces and add fixture-backed mock modes for retrieval, generation, and storage failure cases.

3. **Observability requirements are defined, but execution-level telemetry is not yet explicit**
   - Impact: Recommendation runs may fail, stall, or degrade without enough signal to assert the difference between system delay, provider failure, and low-confidence completion.
   - Why it matters: The PRD depends on safe degradation and clear user-facing state, but the implementation docs do not yet pin down trace IDs, RED metrics, or run-stage audit events at the route and workflow boundaries.
   - Action: Require correlation IDs, structured lifecycle events, and per-stage timeout/error classification before implementation broadens.

4. **Parallel-safe cleanup strategy is only mature for current UI auth tests**
   - Impact: The existing Playwright harness demonstrates fixture cleanup patterns, but future recommendation-domain data (profiles, runs, evidence reviews) does not yet have equivalent cleanup guarantees.
   - Why it matters: Without automatic teardown, parallel CI will accumulate stale data and make recommendation regression suites flaky.
   - Action: Extend fixture tracking and cleanup conventions to recommendation-domain entities as part of the first backend test utilities.

### ✅ Testability Assessment Summary

- **Strong browser automation base already exists**
  - Evidence: `playwright.config.ts` enables retries, trace-on-first-retry, failure screenshots, HTML/JUnit reporting, and a reusable local web server.
- **Good fixture composition patterns are already in place**
  - Evidence: `tests/support/fixtures/index.ts` merges `api-request`, `auth-session`, `network-error-monitor`, and custom fixtures, which is a solid foundation for deterministic E2E and API coverage.
- **The architecture preserves a testable server boundary**
  - Evidence: External providers are intentionally mediated through `server/api` and `server/utils/providers/*`, which makes API-level verification and provider mocking feasible.
- **The domain model is designed for auditable workflow state**
  - Evidence: The architecture defines versioned recommendation runs, explicit statuses, audit logging, and separated pathway/evidence governance concerns, which support traceable assertions once implemented.

## 2. Architecturally Significant Requirements (ASRs)

- **ACTIONABLE**: Recommendation workflows must expose deterministic state control for seeded profiles, pathway catalogs, evidence freshness, and degraded run states.
- **ACTIONABLE**: External provider integrations must remain injectable and mockable at the server adapter layer.
- **ACTIONABLE**: Recommendation runs must emit observable lifecycle telemetry (status transitions, correlation IDs, timeout/failure classes).
- **ACTIONABLE**: User/admin authorization and trust-sensitive audit events must be testable at API boundaries.
- **ACTIONABLE**: Citation lineage must remain verifiable from recommendation output back to evidence snapshot/version.
- **FYI**: The current Playwright-first scaffold is already aligned with fixture-based E2E/API testing and can be expanded instead of replaced.

## 3. Risk Assessment Matrix

| Risk ID | Category | Description | Probability | Impact | Score | Action | Mitigation | Owner | Timeline |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | TECH | Recommendation orchestration cannot be tested deterministically because seeded state and provider stubs are not yet formalized. | 3 | 3 | 9 | BLOCK | Add seed/reset interfaces plus mockable provider adapters before broad feature implementation. | Backend + Platform | Pre-implementation |
| R-002 | DATA | Citation lineage breaks between retrieved evidence and rendered recommendation output, weakening trust and auditability. | 2 | 3 | 6 | MITIGATE | Version evidence snapshots and require immutable citation references in recommendation run records. | Backend + Data | Pre-implementation |
| R-003 | SEC | Role boundaries between end-user workspaces and admin trust tooling leak sensitive immigration data or privileged controls. | 2 | 3 | 6 | MITIGATE | Enforce server-side capability checks on all protected routes and log trust-sensitive actions. | Backend + Security | Pre-implementation |
| R-004 | PERF | Long-running recommendation jobs exceed the PRD latency target or appear stalled because status telemetry and timeout handling are incomplete. | 2 | 3 | 6 | MITIGATE | Add explicit run-stage SLAs, timeout policies, user-safe degraded states, and stage-level metrics. | Backend + Platform | Pre-implementation |
| R-005 | BUS | Low-confidence or stale recommendations still appear authoritative, causing users to act on weak guidance. | 2 | 3 | 6 | MITIGATE | Make caveats, freshness, and confidence status mandatory UI fields with degraded rendering rules. | Product + Backend | Implementation phase start |
| R-006 | OPS | The current test harness covers auth/task flows but not future recommendation-domain entities, creating regression blind spots as features land. | 2 | 2 | 4 | MONITOR | Expand the fixture library and add recommendation API/integration suites alongside each new domain contract. | QA + Dev | Early implementation |

## 4. Highest-Risk Summary

- **Immediate blocker**: `R-001` is the only score-9 risk and should block implementation until deterministic state control and provider stubbing are defined.
- **High-priority mitigations**: `R-002` through `R-005` are score-6 risks and should be addressed before the first release candidate for recommendation workflows.
- **Monitoring item**: `R-006` is not a blocker, but it will become a delivery drag if the test harness is not extended in parallel with the new feature surface.

# Step 4: Coverage Plan & Execution Strategy

## 1. Coverage Matrix

| Priority | Scenario | Primary Requirement Area | Test Level | Risk Link | Why This Level |
| --- | --- | --- | --- | --- | --- |
| P0 | Recommendation run lifecycle exposes `queued`/`evaluating`/`completed`/`degraded`/`failed` states correctly | FR9, FR15, NFR3, NFR13 | API + Integration | R-001, R-004, R-005 | Core workflow logic should be validated below the UI so failures are deterministic. |
| P0 | User/admin authorization blocks cross-role and cross-user access to workspace and governance routes | FR1, FR43, FR44, FR45 | API + E2E | R-003 | Security-critical boundary needs API enforcement plus one user-visible route check. |
| P0 | Recommendation outputs preserve immutable citation references and freshness/caveat markers | FR25-FR29, NFR15 | API + Integration | R-002, R-005 | Citation integrity is data-contract heavy; API/integration gives strong signal without brittle UI duplication. |
| P0 | Provider adapter fallback downgrades or withholds weak results safely when retrieval/generation fails | FR15, NFR13, NFR30 | Integration | R-001, R-004, R-005 | Failure injection belongs at adapter/orchestration boundaries, not in browser-only tests. |
| P1 | Guided intake saves drafts, restores progress, and surfaces accessible validation | FR2-FR7, NFR1, NFR2, NFR22-NFR24 | E2E + Component | R-006 | This is a core user journey that needs one browser flow plus component-level validation on form states. |
| P1 | Comparison workspace cleanly separates available-now, blocked-but-close, and strategic pathways | FR22-FR24, UX comparison direction | Component + E2E | R-005 | Presentation logic should be mostly component-tested, with one end-to-end confirmation of composition. |
| P1 | Internal pathway/evidence governance writes auditable events for trust-sensitive changes | FR36-FR42, NFR9, NFR16 | API + Integration | R-003 | Governance is primarily backend behavior; browser tests add little value here initially. |
| P1 | Recommendation run refresh uses a new input snapshot and preserves prior run history | FR16, FR32-FR35 | API + Integration | R-002, R-006 | Versioning and lineage are backend-centric and should be tested there first. |
| P2 | Responsive and accessibility behavior for trust states (confidence, blockers, caveats, actions) | NFR22-NFR27 | E2E | R-005, R-006 | Needs real browser rendering and keyboard validation, but it is secondary to correctness gates. |
| P2 | Admin review surfaces expose stale/weak evidence triage without leaking user-private details | FR39-FR42 | Component + E2E smoke | R-003, R-006 | Moderate-risk UI/admin flow; smoke coverage is sufficient early. |
| P3 | Large-dataset recommendation regression and latency burn-in | NFR3, NFR17-NFR20 | Integration + Perf harness | R-004 | Expensive synthetic-data and load checks should not sit in the main PR path. |
| P3 | Dependency outage drills (AI Search, OpenRouter, R2) and recovery playbooks | NFR13, NFR30, NFR31 | Weekly integration/chaos | R-001, R-004 | Valuable, but operationally expensive and best suited to scheduled validation. |

## 2. Execution Strategy

- **PR (~10-15 min target)**: Run all functional API/integration tests and the small set of critical E2E flows covering auth boundaries, intake continuity, and one recommendation review happy path.
- **Nightly (~20-40 min)**: Run expanded E2E accessibility/responsive checks, recommendation history/refresh regressions, and synthetic data scenarios that are heavier than PR-safe limits.
- **Weekly (~60+ min and manual follow-up)**: Run dependency outage simulations, large-dataset latency baselines, and any chaos or disaster-recovery style validation for evidence and recommendation orchestration.

## 3. Resource Estimates

- **P0**: ~35-55 hours
- **P1**: ~30-50 hours
- **P2**: ~15-30 hours
- **P3**: ~6-12 hours
- **Total**: ~86-147 hours
- **Timeline**: ~2.5-4.5 weeks for one QA engineer, assuming the seed/mocking blockers in `R-001` are resolved first

## 4. Quality Gates

- **P0 pass rate**: 100%
- **P1 pass rate**: >=95%
- **High-risk mitigations**: All score-6+ risks must be mitigated, explicitly accepted, or waived before release
- **Coverage target**: >=80% of critical recommendation, auth, and citation scenarios
- **Release blocker**: Any open score-9 risk or any broken auth/citation lineage scenario fails the gate

# Step 5: Generate Outputs & Validate

- Resolved execution mode: Sequential
  - Config is `auto`, and no higher-order subagent or agent-team capability is available in this runtime, so the workflow fell back to sequential generation.
- Output artifacts written:
  - `_bmad-output/test-artifacts/test-design-architecture.md`
  - `_bmad-output/test-artifacts/test-design-qa.md`
  - `_bmad-output/test-artifacts/test-design/cadet2-handoff.md`
- Validation summary:
  - Both system-level documents were generated with matching risk IDs (`R-001` through `R-006`), shared dates, and consistent priorities.
  - The architecture document is action-first and the QA document carries the execution recipe, code examples, and tagging guidance.
  - The handoff document maps P0 and P1 quality concerns into BMAD epic and story planning guidance.
- Open assumptions:
  - The existing architecture document is acting as the ADR source until dedicated ADR files exist.
  - k6 remains a planned tool, not a currently installed dependency, so performance work stays scheduled rather than immediate.
