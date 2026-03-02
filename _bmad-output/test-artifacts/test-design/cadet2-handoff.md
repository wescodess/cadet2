---
title: 'TEA Test Design -> BMAD Handoff Document'
version: '1.0'
workflowType: 'testarch-test-design-handoff'
inputDocuments:
  - _bmad-output/test-artifacts/test-design-architecture.md
  - _bmad-output/test-artifacts/test-design-qa.md
sourceWorkflow: 'testarch-test-design'
generatedBy: 'TEA Master Test Architect'
generatedAt: '2026-03-02T00-00-00'
projectName: 'cadet2'
---

# TEA -> BMAD Integration Handoff

## Purpose

This document bridges TEA's system-level test design outputs with BMAD story decomposition. It carries forward the quality gates, risk register, and scenario priorities that should shape epic and story implementation order.

## TEA Artifacts Inventory

| Artifact | Path | BMAD Integration Point |
| --- | --- | --- |
| Architecture Test Design | `_bmad-output/test-artifacts/test-design-architecture.md` | Epic quality gates, pre-implementation blockers |
| QA Test Design | `_bmad-output/test-artifacts/test-design-qa.md` | Story acceptance criteria and automation planning |
| Risk Assessment | Embedded in both documents | Story priority and sequencing decisions |
| Coverage Strategy | Embedded in the QA document | Story-level test scope and tagging |

## Epic-Level Integration Guidance

### Risk References

- **R-001 (TECH, 9)** must be treated as an implementation blocker for Epic 2 and any story that depends on recommendation orchestration.
- **R-002 (DATA, 6)** must be embedded into stories that shape evidence persistence, citation rendering, and recommendation history.
- **R-003 (SEC, 6)** must be embedded into stories that touch workspace access, admin surfaces, or trust-sensitive updates.
- **R-004 (PERF, 6)** must be embedded into stories that create recommendation jobs, status polling, or retry/degraded paths.
- **R-005 (BUS, 6)** must be embedded into stories that present recommendations, trust signals, blockers, and next actions.

### Quality Gates

- No story that depends on recommendation execution should be marked ready for dev until the R-001 blockers have an implementation path.
- Any story that touches recommendation output must include explicit confidence, freshness, and caveat acceptance criteria.
- Any story that touches admin or trust-governance routes must include authorization and audit logging acceptance criteria.
- Any epic containing P0 scenarios should preserve API-first testability and deterministic seeding hooks.

## Story-Level Integration Guidance

### P0/P1 Test Scenarios -> Story Acceptance Criteria

1. **Recommendation lifecycle contract**
   - Add acceptance criteria to Epic 2 stories requiring canonical `queued`, `evaluating`, `completed`, `degraded`, and `failed` states.
   - Require deterministic state setup hooks in the same story slice or an explicit prerequisite story.

2. **Authorization boundaries**
   - Add acceptance criteria to Epic 1 Story 1.1 and Epic 5 Story 5.4 for cross-user denial and standard-user denial on admin routes.

3. **Citation lineage and trust metadata**
   - Add acceptance criteria to Epic 3 Story 3.4 and Epic 4 Story 4.3 requiring evidence references, freshness, and caveats to persist across refresh and history views.

4. **Safe degraded-state rendering**
   - Add acceptance criteria to Epic 2 Story 2.4 and Epic 3 Story 3.1 requiring visibly downgraded recommendation output when provider confidence drops.

### Data-TestId Requirements

- `data-testid="intake-progress"` for progress framing in guided intake
- `data-testid="recommendation-status-banner"` for lifecycle and degraded-state visibility
- `data-testid="recommendation-citation-list"` for traceable evidence rendering
- `data-testid="recommendation-tier-badge"` for confidence and fit labeling
- `data-testid="admin-audit-panel"` for trust-governance verification
- `data-testid="recommendation-history-list"` for run continuity and diff navigation

## Risk-to-Story Mapping

| Risk ID | Category | P x I | Recommended Story/Epic | Test Level |
| --- | --- | --- | --- | --- |
| R-001 | TECH | 3 x 3 | Epic 2 Stories 2.1-2.4, plus prerequisite support work before those stories are marked ready | API + Integration |
| R-002 | DATA | 2 x 3 | Epic 3 Story 3.4, Epic 4 Story 4.3 | API + Integration |
| R-003 | SEC | 2 x 3 | Epic 1 Story 1.1, Epic 5 Stories 5.3-5.4 | API + E2E |
| R-004 | PERF | 2 x 3 | Epic 2 Stories 2.1 and 2.4 | Integration + Performance |
| R-005 | BUS | 2 x 3 | Epic 3 Stories 3.1-3.4, Epic 4 Story 4.1 | Component + E2E |
| R-006 | OPS | 2 x 2 | Cross-cutting; apply to every story that introduces new recommendation-domain entities | API + Regression |

## Recommended BMAD -> TEA Workflow Sequence

1. **TEA Test Design** (`TD`) -> produces the architecture, QA, and handoff artifacts
2. **BMAD Create Epics & Stories** -> consumes this handoff and embeds the quality requirements
3. **TEA ATDD** (`AT`) -> generates acceptance tests for P0 scenarios per story
4. **BMAD Implementation** -> developers implement against those contracts
5. **TEA Automate** (`TA`) -> expands the suite around completed stories
6. **TEA Trace** (`TR`) -> checks that P0/P1 requirements are still mapped to test coverage

## Phase Transition Quality Gates

| From Phase | To Phase | Gate Criteria |
| --- | --- | --- |
| Test Design | Epic/Story Creation | All P0 risks have mitigation paths and named owners |
| Epic/Story Creation | ATDD | Stories carrying R-001 through R-005 include explicit quality acceptance criteria |
| ATDD | Implementation | Failing acceptance tests exist for the selected P0 story slice |
| Implementation | Test Automation | Acceptance tests pass and deterministic seed paths exist |
| Test Automation | Release | Coverage remains >=80 percent across core P0/P1 recommendation, auth, and citation scenarios |
