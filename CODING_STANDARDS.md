# Coding standards for reviewers

Use these judgement calls when reviewing a change. Examples are pinned to
`fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3`; they demonstrate the named decision,
not blanket approval of the file. These conventions come from the working feature
paths, not the demo scaffolding. Mechanical checks belong in the final section.

### 1. Keep responsibilities in the layer that owns them

Nuxt routes should coordinate HTTP, sessions and responses; server utilities should own domain/provider work; Convex should own operations on its tables.
Rationale: Reviewers can follow a feature without finding competing implementations of the same policy.
Example: [server/api/admin/pathways/index.post.ts:9](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/api/admin/pathways/index.post.ts#L9).

### 2. Judge every callable boundary independently

A public Convex function needs its own authorization; choose internal visibility for operations reserved for trusted server callers, and verify that caller's authority.
Rationale: A guarded Nuxt route or an “admin-only” comment cannot protect a separately callable public function.
Example: [convex/ragSourcesInternal.ts:94](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/convex/ragSourcesInternal.ts#L94) uses `internalMutation`.
Counter-example: [convex/recommendationRuns.ts:933](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/convex/recommendationRuns.ts#L933) trusts `args.userId`; `resetRunsForUser` at line 1324 and public `listForAdmin` at line 1377 likewise lack Convex authorization. These are existing gaps, not precedents to copy.

### 3. Extract helpers around a coherent domain decision

Prefer small typed helpers whose inputs explain the decision; extract when it clarifies policy or creates a useful seam, rather than merely reducing line count.
Rationale: A reviewer should be able to reason about normalization and evaluation separately from transport and persistence.
Example: [server/utils/pathways/evaluateDirectAndBlockedPathways.ts:79](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/pathways/evaluateDirectAndBlockedPathways.ts#L79).

### 4. Share contracts when their meaning is shared

Use a common contract for concepts crossing server and UI boundaries; assess whether a new field or status preserves the same domain meaning on both sides.
Rationale: Structurally compatible types can still describe contradictory product behavior.
Example: [shared/types/recommendation-run-comparison.ts:11](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/shared/types/recommendation-run-comparison.ts#L11), consumed by [server/utils/recommendations/buildRunComparison.ts:1](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/recommendations/buildRunComparison.ts#L1) and [app/composables/useRunComparison.ts:1](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/app/composables/useRunComparison.ts#L1).

### 5. Give state the narrowest useful lifetime

Keep transient state with its feature and coordinate reusable behavior through composables/plugins; justify any broader store by actual sharing and lifetime needs.
Rationale: State that outlives its screen or session makes stale results and ownership harder to reason about.
Example: [app/composables/useRecommendationRunHistory.ts:11](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/app/composables/useRecommendationRunHistory.ts#L11).

### 6. Compose existing UI before inventing another abstraction

Prefer an existing feature component, then the shared UI primitives; create a new component when its responsibility or interaction meaningfully differs.
Rationale: Reusing established interactions keeps behavior consistent without forcing unrelated features into one component.
Example: [app/pages/workspace/index.vue:50](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/app/pages/workspace/index.vue#L50) composes workspace components; [app/components/workspace/RunHistoryFilterBar.vue:29](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/app/components/workspace/RunHistoryFilterBar.vue#L29) uses the shared Button.

### 7. Keep privileged provider decisions on the server

Review what authority a provider operation grants and what its response exposes; credential-bearing calls and privileged configuration must remain behind server mediation.
Rationale: Hiding a token alone does not prevent the browser from gaining an overly powerful provider capability.
Example: [server/api/ai-search/query.post.ts:60](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/api/ai-search/query.post.ts#L60) keeps configuration and provider invocation server-side; this illustrates secret placement, not adequate endpoint authorization.

### 8. Validate domain meaning at trust boundaries

Check whether accepted input combinations make sense for the operation, not merely whether a schema or type accepts their shape.
Rationale: Individually valid fields can combine into an invalid instruction.
Example: [server/utils/pathways/pathwayRuleSchema.ts:39](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/pathways/pathwayRuleSchema.ts#L39) rejects incompatible boolean operators and comparison values.

### 9. Derive identity from authenticated authority

Use the session or `ctx.auth` as the actor; caller-supplied user, tenant or actor IDs identify requested targets, never prove who is acting.
Rationale: Filtering by an unverified ID still lets a caller impersonate another tenant's user.
Example: [server/utils/auth/requireUserSession.ts:6](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/auth/requireUserSession.ts#L6) implements `requireWorkspaceUserSession`; [convex/ragSources.ts:46](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/convex/ragSources.ts#L46) implements `requireIdentity`.

### 10. Prove access to each requested resource

Trace resource reads and writes back to the authenticated owner or an explicit privileged grant; a supplied tenant filter or valid resource ID is insufficient.
Rationale: Signing in does not authorize access to another user's records in a multi-tenant product.
Example: [convex/ragSources.ts:254](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/convex/ragSources.ts#L254) checks source ownership; [server/api/workspace/runs/[runId].get.ts:32](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/api/workspace/runs/%5BrunId%5D.get.ts#L32) selects the run within the session user's records.

### 11. Deny privileged access by default

Require positive evidence of the appropriate admin grant; missing identity, failed lookup or an unrecognized role must not expand access, and bootstrap exceptions need explicit trusted policy.
Rationale: Authentication and administrator authority are separate decisions, including during service failures.
Example: [convex/ragSources.ts:85](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/convex/ragSources.ts#L85) implements `requireAdmin`; [server/utils/auth/requireAdminSession.ts:19](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/auth/requireAdminSession.ts#L19) fails closed, and [server/api/admin/pathways/index.post.ts:10](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/api/admin/pathways/index.post.ts#L10) applies the guard.

### 12. Preserve the input context of historical results

Keep a run tied to its submitted profile snapshot and refresh lineage; do not silently reinterpret archived results using today's editable draft.
Rationale: A user must be able to explain why two runs produced different recommendations.
Example: [server/api/intake/submit.post.ts:213](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/api/intake/submit.post.ts#L213) persists a new snapshot and links the new run to it.

### 13. Account for partial writes across services

When a workflow spans relational storage and Convex, review its failure order and compensation rather than assuming one transaction covers both.
Rationale: A successful first write must not leave misleading durable state when the next service fails.
Example: [server/api/intake/submit.post.ts:258](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/api/intake/submit.post.ts#L258) removes the new snapshot if run creation fails.

### 14. Distinguish failure, absence and successful emptiness

Choose error and unavailable states that preserve what happened and support recovery; avoid turning a failed operation into a plausible empty success.
Rationale: Users and callers need to know whether to retry, correct input or accept that no data exists.
Example: [app/composables/useRecommendationRunHistory.ts:36](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/app/composables/useRecommendationRunHistory.ts#L36) tracks loading, completion and errors separately; [server/api/admin/pathways/index.post.ts:51](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/api/admin/pathways/index.post.ts#L51) translates a domain conflict to HTTP 409.

### 15. Preserve evidence limits in recommendation claims

Keep evidence and freshness attached to claims; do not upgrade missing or inferred support into source-backed certainty during shaping or presentation. Never present fit or match scores, rankings of programs, success or approval percentages, confidence labels, or "fastest" and "best" route language. A value defined by an official rule, such as CRS points, may appear only with its inputs, missing facts and rule version beside it.
Rationale: A polished recommendation must not imply stronger evidence than the system actually has, and a Client may act on it.
Example: [server/utils/recommendations/classifyTrustBoundary.ts:18](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/recommendations/classifyTrustBoundary.ts#L18) distinguishes inferred/withheld support; [server/utils/recommendations/buildRecommendationCitations.ts:63](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/recommendations/buildRecommendationCitations.ts#L63) preserves unknown freshness.

### 16. Choose test seams that can expose the regression

Test domain decisions with explicit inputs and UI interactions through observable outputs; use integration evidence when the risk crosses auth, persistence or provider boundaries, and assess what mocks hide.
Rationale: A passing test is useful only if the relevant broken behavior could make it fail.
Example: [tests/unit/eligibilityDslEvaluator.spec.ts:19](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/tests/unit/eligibilityDslEvaluator.spec.ts#L19) covers accepted/rejected decisions; [tests/components/workspace/RunHistoryFilterBar.spec.ts:42](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/tests/components/workspace/RunHistoryFilterBar.spec.ts#L42) checks emitted user choices.

### 17. Accept production-ready behavior only

Require complete success and failure behavior for the intended deployment; demo values, simulated success or silent fallbacks must not substitute for a required integration.
Rationale: Plausible output can conceal an unavailable service and mislead users about what was actually completed.
Example: [server/api/ai-search/query.post.ts:68](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/api/ai-search/query.post.ts#L68) reports missing provider configuration as unavailable rather than fabricating results.

### 18. Comment only where code cannot explain an important reason

Keep comments minimal; preserve consequential rationale or constraints that clearer names and structure cannot communicate, rather than narrating operations.
Rationale: Reviewers need the reason behind an unusual decision without a second, drifting description of the code.
Example: [server/api/intake/submit.post.ts:259](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/api/intake/submit.post.ts#L259) explains compensation across the relational/Convex boundary.

## Enforced by verify, not here

Mechanical candidates for quality-bar tickets [#23](https://github.com/wescodess/cadet2/issues/23) and [#24](https://github.com/wescodess/cadet2/issues/24):

- Formatting, whitespace, import ordering, naming/file conventions and lint-able TypeScript/Vue patterns.
- Type checking, schema/validator presence, generated-code consistency and secret scanning.
- Import boundaries/cycles, unused exports/dependencies, duplication and complexity thresholds.
- Test execution, coverage/mutation thresholds, design-token checks and bundle-size budgets.

At `fe2b4a4` there is no unified `verify` command; this section assigns mechanical work to those tickets and does not claim these checks are already enforced.
