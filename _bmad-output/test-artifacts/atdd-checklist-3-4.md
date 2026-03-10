---
stepsCompleted: ['step-01-preflight-and-context', 'step-02-generation-mode', 'step-03-test-strategy', 'step-04a-subagent-api-failing', 'step-04b-subagent-e2e-failing', 'step-04c-aggregate', 'step-05-validate-and-complete']
lastStep: 'step-05-validate-and-complete'
lastSaved: '2026-03-09'
workflowType: 'testarch-atdd'
tddPhase: 'RED'
totalTests: 22
inputDocuments:
  - '_bmad-output/implementation-artifacts/3-4-display-citations-source-context-and-trust-boundaries.md'
  - '_bmad/tea/testarch/knowledge/test-quality.md'
  - '_bmad/tea/testarch/knowledge/data-factories.md'
  - 'playwright.config.ts'
  - 'tests/support/fixtures/index.ts'
  - 'tests/support/fixtures/test-data.ts'
  - 'tests/support/fixtures/factories/recommendation-comparison-factory.ts'
---

# ATDD Checklist — Story 3.4: Display Citations, Source Context, and Trust Boundaries

**Date:** 2026-03-09
**Author:** Wesleyukadike
**TDD Phase:** 🔴 RED (all tests skipped — feature not yet implemented)

---

## Acceptance Criteria

| AC | Summary | API Tests | Unit Tests | E2E Tests |
|----|---------|-----------|------------|-----------|
| AC1 | Citations linked to claims with inspectable source context | 2 | 5 | 3 |
| AC2 | Source-backed vs inferred vs system-generated disclosure | 2 | 5 | 3 |
| AC3 | Traceable linkage, visible text (not color-only), keyboard/screen-reader accessible | 1 | — | 3 |

---

## Generated Test Files (RED Phase)

### API Tests — `tests/api/recommendation-citations.atdd.spec.ts`

| # | Priority | AC | Test Name |
|---|----------|-----|-----------|
| 1 | P0 | AC1 | citation arrays attached to each candidate with valid citation structure |
| 2 | P0 | AC2 | trust-boundary classification for each candidate |
| 3 | P0 | AC2 | source-backed and inferred trust boundaries are semantically distinct |
| 4 | P1 | AC3 | failed/degraded runs return empty citations and trust-boundary defaults |
| 5 | P1 | AC3 | citation data does not regress existing comparison/blocker/tradeoff modules |

### Unit Tests — `tests/api/build-recommendation-citations.spec.ts`

| # | Priority | AC | Test Name |
|---|----------|-----|-----------|
| 1 | P0 | AC1 | assembles citation array from raw evidence references |
| 2 | P0 | AC1 | returns empty array when raw evidence is empty or undefined |
| 3 | P1 | AC1 | assigns correct freshness state based on retrieval date age |
| 4 | P1 | AC1 | normalizes all source types to the canonical set |
| 5 | P2 | AC1 | handles malformed evidence entries gracefully |

### Unit Tests — `tests/api/classify-trust-boundary.spec.ts`

| # | Priority | AC | Test Name |
|---|----------|-----|-----------|
| 1 | P0 | AC2 | classifies as source-backed when strong evidence + high confidence |
| 2 | P0 | AC2 | classifies as inferred when partial evidence or medium/low confidence |
| 3 | P0 | AC2 | classifies as system-generated when no evidence references |
| 4 | P1 | AC2 | always returns a value from the canonical trust-boundary set |
| 5 | P1 | AC2 | classifies withheld confidence as system-generated regardless of evidence |

### E2E Tests — `tests/e2e/workspace-recommendation-citations.atdd.spec.ts`

| # | Priority | AC | Test Name |
|---|----------|-----|-----------|
| 1 | P0 | AC1 | citation list renders with inspectable source context |
| 2 | P0 | AC2 | distinguishes source-backed, inferred, and system-generated trust with visible disclosure |
| 3 | P0 | AC2 | inferred and system-generated candidates display visible caveat warnings |
| 4 | P0 | AC3 | trust information exposed as visible text, not color-only |
| 5 | P1 | AC3 | citation controls are keyboard-navigable |
| 6 | P1 | AC1,3 | citation list visible and navigable on mobile viewport |
| 7 | P2 | AC1 | citation items link to the source URL |

---

## Data Infrastructure

### Factory — `tests/support/fixtures/factories/recommendation-citations-factory.ts`

| Function | Description |
|----------|-------------|
| `createRecommendationCitation()` | Single citation with faker-generated defaults + overrides |
| `createRecommendationCitations(n)` | Array of n citations |
| `createRecommendationSourceContext()` | Source context from a citation |
| `createCitationEvaluationPayload()` | Intake payload that triggers multi-pathway results |
| `createDegradedCitationEvaluationPayload()` | Intake payload for degraded run fallback |
| `createCandidateWithCitations()` | Source-backed candidate with 2 citations |
| `createCandidateWithInferredTrust()` | Blocked candidate with inferred trust + caveat |
| `createCandidateWithSystemGeneratedTrust()` | Composed candidate with no citations + system caveat |
| `createCitationsResultsPayload()` | Full results payload with all 3 trust categories |

### Test Data Constants — `tests/support/fixtures/test-data.ts`

| Constant | Values |
|----------|--------|
| `RECOMMENDATION_CITATIONS_ATDD_TEST_IDS` | `citationList`, `citationItem`, `evidencePanel`, `trustBoundaryBadge`, `caveatWarning` |
| `RECOMMENDATION_TRUST_BOUNDARY_VALUES` | `source-backed`, `inferred`, `system-generated` |
| `RECOMMENDATION_TRUST_BOUNDARY_LABELS` | Human-readable labels for each boundary type |
| `RECOMMENDATION_CITATION_SOURCE_TYPES` | `regulation`, `policy-bulletin`, `knowledge-base`, `assessment-guide` |

---

## `data-testid` Attributes Required for Implementation

| Attribute | Component | Used By |
|-----------|-----------|---------|
| `recommendation-citation-list` | `RecommendationCitationList.vue` | E2E tests 1, 5, 6 |
| `citation-item` | Citation item within list | E2E tests 1, 6, 7 |
| `evidence-confidence-panel` | `EvidenceConfidencePanel.vue` | E2E tests 4, 5 |
| `trust-boundary-badge` | Trust classification badge | E2E tests 2, 6 |
| `caveat-warning` | Caveat/warning disclosure | E2E test 3 |

---

## Implementation Checklist (for dev-story)

### Server-Side

- [ ] Create `server/utils/recommendations/buildRecommendationCitations.ts`
  - Accepts raw evidence array → returns `RecommendationCitation[]`
  - Assign freshness based on retrieval date age
  - Normalize source types to canonical set
  - Handle empty/null/malformed input gracefully
- [ ] Create `server/utils/recommendations/classifyTrustBoundary.ts`
  - Accepts evidence references + confidence + qualification → returns `RecommendationTrustBoundary`
  - source-backed: strong evidence + high confidence
  - inferred: partial evidence or medium/low confidence
  - system-generated: no evidence or withheld confidence
- [ ] Extend results.get.ts to include `citations` and `trustBoundary` on each candidate
- [ ] Define types in `app/lib/recommendations/citations.ts`

### Client-Side

- [ ] Create `RecommendationCitationList.vue` with `data-testid="recommendation-citation-list"`
- [ ] Create `EvidenceConfidencePanel.vue` with `data-testid="evidence-confidence-panel"`
- [ ] Add `data-testid="trust-boundary-badge"` and `data-testid="caveat-warning"`
- [ ] Each citation item must have `data-testid="citation-item"`
- [ ] Trust labels must be visible text (not color-only)
- [ ] Citation controls must be keyboard and screen-reader accessible
- [ ] Must render correctly on mobile (375px viewport)

---

## Red-Green-Refactor Workflow

### 🔴 RED Phase (current)

All 22 tests are generated with `test.skip()`. They assert EXPECTED behavior but will be skipped until feature is implemented.

### 🟢 GREEN Phase (after implementation)

1. Remove `test.skip()` from all test files
2. Run unit tests: `npx playwright test tests/api/build-recommendation-citations.spec.ts tests/api/classify-trust-boundary.spec.ts --project=api`
3. Run API ATDD tests: `npx playwright test tests/api/recommendation-citations.atdd.spec.ts --project=api`
4. Run E2E tests: `npx playwright test tests/e2e/workspace-recommendation-citations.atdd.spec.ts --project=chromium`
5. Fix any failures (implementation bugs or test corrections)

### 🔵 REFACTOR Phase

6. Review code coverage and simplify
7. Extract reusable patterns to fixtures/helpers
8. Commit passing tests with feature

---

## Validation Summary

- ✅ All 22 tests use `test.skip()` (TDD red phase compliant)
- ✅ No placeholder assertions (`expect(true).toBe(true)`)
- ✅ All tests assert expected behavior for unimplemented feature
- ✅ Factory follows existing project patterns (overrides, faker, typed builders)
- ✅ Test IDs consistent with existing naming convention
- ✅ Knowledge fragment patterns applied (deterministic, isolated, explicit)
- ✅ No orphaned browser sessions
- ✅ All artifacts stored in canonical locations

