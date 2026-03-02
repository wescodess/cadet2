# Sprint Change Proposal

**Project:** cadet2  
**Date:** 2026-03-02  
**Prepared By:** Winston (Architect)

## 1. Issue Summary

The current planning set for `cadet2` is not blocked by missing product direction or missing requirement coverage. The issue is planning misalignment discovered during the implementation-readiness review.

The triggering evidence is [implementation-readiness-report-2026-03-02.md](/Users/wesleyukadike/Desktop/cadet2/_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-02.md), which concluded `NEEDS WORK` and identified 8 issues across UX alignment and epic/story quality.

The most important issues are:
- the UX specification under-defines the internal admin/ops trust-governance experience required by the PRD and Epic 5
- several stories blur scope boundaries or imply future work prematurely
- the architecture document overstates implementation readiness and under-specifies custom component ownership

This issue was discovered before Sprint Planning, so it is a planning correction, not an implementation rollback.

## 2. Impact Analysis

### Epic Impact

- **Epic 1:** Story `1.1` needs tighter scope so the workspace shell does not imply completed recommendation areas before those areas exist.
- **Epic 2:** Story `2.1` needs user-visible behavior separated from technical test-enablement constraints; Story `2.3` needs a no-valid-composed-route outcome.
- **Epic 3:** Story `3.3` needs explicit comparison-unavailable and single-option handling.
- **Epic 4:** No major structural changes are required.
- **Epic 5:** This is the most affected epic. It needs explicit UX support and clearer story boundaries between controlled rule edits, trust review, and auditability.

### Story Impact

- Stories requiring direct edits: `1.1`, `2.1`, `2.3`, `3.3`, `5.2`
- Stories indirectly affected by clarified boundaries: `5.3`, `5.4`

### Artifact Conflicts

- **PRD:** No major rewrite required. The PRD already contains the internal admin/ops trust-maintenance journey and remains aligned with the intended MVP.
- **UX Specification:** Requires a substantive update to define the admin/trust-governance journey and governance-specific interaction patterns.
- **Architecture:** Requires targeted updates to readiness wording and custom component ownership mapping.
- **Epics and Stories:** Requires targeted story-level corrections before the artifacts can be treated as implementation-ready.

### Technical Impact

- No code rollback is required.
- No infrastructure, deployment, or CI/CD changes are required at this stage.
- Sprint Planning should be deferred until the planning artifacts are corrected.
- `sprint-status.yaml` should not be generated from the current uncorrected epics artifact.

## 3. Recommended Approach

### Selected Path

**Direct Adjustment**

### Rationale

This is the lowest-risk and highest-leverage path:
- the product direction remains valid
- FR coverage remains complete
- the MVP is still achievable
- the defects are specification-quality issues, not scope or platform failures

### Effort, Risk, Timeline

- **Effort:** Medium
- **Risk:** Low
- **Timeline Impact:** Small short-term delay to Sprint Planning, with lower execution risk afterward

### Alternatives Considered

- **Potential Rollback:** Not viable because no implementation has started.
- **PRD MVP Review:** Not viable because the problem is not MVP scope infeasibility; it is downstream planning alignment.

## 4. Detailed Change Proposals

### A. UX Specification Changes

**Artifact:** `_bmad-output/planning-artifacts/ux-design-specification.md`

**Change:**
- Add a fourth explicit UX journey for the internal admin/ops trust-governance user
- Cover pathway inventory management, evidence source review, recommendation trust review, and audit history inspection
- Add governance-specific UX patterns for admin tables, filtered review queues, trust-state notices, corrective-action controls, and audit panels
- Define accessibility and responsive expectations for these governance surfaces

**Justification:**
This is the largest planning gap. The PRD and epics already require this capability, but the UX interaction model is missing.

### B. Epics and Stories Changes

**Artifact:** `_bmad-output/planning-artifacts/epics.md`

**Change Set:**

**Story 1.1**

OLD:
- Workspace shell includes navigation to intake and recommendation work areas

NEW:
- Limit the shell to authenticated workspace access, intake entry, and protected route boundaries
- If recommendation navigation appears, it must be explicitly unavailable or disabled until delivered later

**Story 2.1**

OLD:
- Acceptance criteria include deterministic seed/reset and provider-mock hooks

NEW:
- Keep acceptance criteria focused on visible lifecycle creation and status behavior
- Move deterministic seed/reset and provider-mock constraints into implementation notes or explicit delivery constraints
- Clarify that Story `1.4` creates the initial run record and Story `2.1` transitions or enriches that record

**Story 2.3**

OLD:
- No explicit behavior when no valid composed route exists

NEW:
- Add acceptance criteria stating that the run preserves direct/blocked results without implying a staged pathway was found

**Story 3.3**

OLD:
- No explicit comparison-unavailable behavior

NEW:
- Add acceptance criteria for single-option and comparison-unavailable states so the UI falls back to a clear structured review state

**Story 5.2**

OLD:
- Rule and evidence changes remain reviewable by the platform

NEW:
- Narrow this story to controlled mutation of pathway rules and evidence sources unless same-story review behavior is explicitly defined
- Leave explicit audit/history ownership to Stories `5.3` and `5.4`, or define the minimal review surface introduced here

**Justification:**
These edits remove ambiguity, tighten story independence, and reduce forward-dependency risk without changing product scope.

### C. Architecture Changes

**Artifact:** `_bmad-output/planning-artifacts/architecture.md`

**Change:**
- Update readiness language so it no longer states unconditional `READY FOR IMPLEMENTATION`
- Replace it with conditional readiness language that reflects the implementation-readiness findings
- Add explicit ownership for approved custom UX components:
  - `RecommendationSummaryBand` → `app/components/recommendations/RecommendationSummaryBand.vue`
  - `PathwayComparisonCard` → `app/components/recommendations/PathwayComparisonCard.vue`
  - `BlockerAndTradeoffPanel` → `app/components/recommendations/BlockerAndTradeoffPanel.vue`
  - `EvidenceConfidencePanel` → `app/components/recommendations/EvidenceConfidencePanel.vue`
  - `NextActionQueue` → `app/components/recommendations/NextActionQueue.vue`
  - `MilestoneRoutePlanner` → `app/components/recommendations/MilestoneRoutePlanner.vue`
- Add an explicit note that Epic 5 implementation depends on finalized admin/trust-governance UX interactions

**Justification:**
The architecture remains valid, but it currently overstates readiness and leaves avoidable room for frontend drift.

## 5. Implementation Handoff

### Change Scope Classification

**Moderate**

This does not require a full strategic reset, but it does require backlog and planning-artifact rework before the implementation phase begins.

### Handoff Recipients

- **UX Designer / Architect**
  - Update the UX specification for governance flows and admin interaction patterns
- **Product Manager / Scrum Master**
  - Update the epics and story acceptance criteria
- **Architect**
  - Update architecture readiness wording and component ownership mapping
  - Re-run implementation readiness after the document changes are complete
- **Scrum Master**
  - Run Sprint Planning only after the corrected planning set is approved

### Success Criteria

- The UX specification includes an explicit admin/trust-governance journey and supporting governance UX patterns
- The epics document reflects corrected story boundaries and explicit unhappy-path handling
- The architecture document no longer overstates readiness and maps approved custom components explicitly
- A new implementation-readiness pass confirms the planning set is coherent enough to begin Sprint Planning

## 6. Approval and Handoff Status

- **User Approval:** Approved on 2026-03-02
- **Scope Classification:** Moderate
- **Primary Route:** Product Owner / Scrum Master coordination, with Architect and UX updates before implementation
- **Sprint Status Update:** N/A at this time; no `sprint-status.yaml` exists yet because Sprint Planning has not started

### Immediate Next Actions

1. Update `_bmad-output/planning-artifacts/ux-design-specification.md`
2. Update `_bmad-output/planning-artifacts/epics.md`
3. Update `_bmad-output/planning-artifacts/architecture.md`
4. Re-run implementation readiness
5. Run Sprint Planning only after the corrected artifacts are approved
