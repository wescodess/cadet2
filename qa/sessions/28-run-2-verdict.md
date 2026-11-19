# Ticket 28 acceptance result

Ticket 28's closure assertions pass on the candidate. **A fully green acceptance
run is blocked at the mandatory console gate:** J28-04 ordinary-Client remaining
pages fails on desktop and mobile due the #74 admin-admission hydration errors.
Those two failed results remain failed. No retries, suppressions or app fixes were used.

- QA branch: `qa/28-close-legacy-client-results`.
- Base `origin/dev`: `fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3`, confirmed unchanged remotely after execution.
- Candidate [PR 158](https://github.com/wescodess/cadet2/pull/158): `f5dd47bb9ba660cdbf576e715b3db48f0bdceae5`, confirmed unchanged after execution.
- Plan: `qa/portals-pilot-plan` at `759cd35eccae0a8665718defd79341de70f0ac8c`.
- Evidence: `/Users/wesleyukadike/.orchestrate/evidence/cadet2/28/run-2/`.
- Matrix: Chromium desktop 1440×900 and mobile 390×844, light preference, zero retries.

## Traceability

| Criterion / manual item | Independent expected result, quoted source | Base result | Candidate result |
| --- | --- | --- | --- |
| AC1: legacy workspace, descendants, results/history/compare/intake and bookmarks | [#28 AC1](https://github.com/wescodess/cadet2/issues/28): “Close /workspace and every descendant”; “Old result bookmarks return 404 without guessing a Signed plan.” [Plan row 112](https://github.com/wescodess/cadet2/blob/759cd35eccae0a8665718defd79341de70f0ac8c/qa/plans/portals-pilot.md#L112) and J10 step 3: “Old personalized paths 404 before reads/effects, no guessed signed redirect/start or fallback.” | J28-01/02/03 red in all six cells: active pages/redirects/navigation; actual own/foreign unsigned records were present. | J28-01/02/03 green in all six cells. All listed bookmarks/deep links/refresh/back states close without a Signed-plan guess. |
| AC1: HTTP methods, summary/list/count/filter/prefill/query and SSR payloads | [LR L170](https://github.com/wescodess/cadet2/blob/4f06c9362dd4ef30bff4d4eab7cb113d90f6de94/docs/decisions/legacy-surface-removal.md#L170): “Expect 404/no private payload and no data read/job/write/provider side effect.” | M28-HTTP: 88/1,044 red, 956 already closed; 56 backend RPCs during the HTTP-only batch. Already-closed path/method combinations are not counted as new red proof. | M28-HTTP: 1,044/1,044 green across visitor/Client/foreign/admin, seven methods and query/SSR/encoded variants; zero private markers, redirects or backend RPCs. |
| AC2: 14 recommendation exports, task demo and four unused audit exports | [#28 AC2](https://github.com/wescodess/cadet2/issues/28): “Close all 14 public recommendation exports and remove the tasks demo and unused public audit exports.” [LR L96–101](https://github.com/wescodess/cadet2/blob/4f06c9362dd4ef30bff4d4eab7cb113d90f6de94/docs/decisions/legacy-surface-removal.md#L96) identifies every name. | M28-Convex: all 152 calls remain publicly reachable; 24 responses contain the actual unsigned private marker; the batch changes `recommendation_runs`. Task bookmarks also red in J28-01/02/03. | M28-Convex: 152/152 green, 19 names × four actors × own/foreign targets; internal/deleted names unavailable to every caller, including admin. No private markers. Task bookmarks 404. All retained SQL and Convex table digests equal before/after the denied-probe batch. |
| Public testing helpers | [Plan row 115](https://github.com/wescodess/cadet2/blob/759cd35eccae0a8665718defd79341de70f0ac8c/qa/plans/portals-pilot.md#L115): “assert closure/no processing”; [LR L71](https://github.com/wescodess/cadet2/blob/4f06c9362dd4ef30bff4d4eab7cb113d90f6de94/docs/decisions/legacy-surface-removal.md#L71): “Delete, not admin-only, internal or environment-gated in a deployed build.” | Public backend seed/reset/testing-list functions red and demonstrably usable for isolated setup. HTTP seed/reset already 404 with flags absent; these HTTP results supply no red proof. | Runtime HTTP and direct backend reachability green. Full dormant import/build-registration absence is unrun here and remains #75's integrated-guard proof. |
| Admitted preserved operation | [LR L53](https://github.com/wescodess/cadet2/blob/4f06c9362dd4ef30bff4d4eab7cb113d90f6de94/docs/decisions/legacy-surface-removal.md#L53): “Admin-only, keep existing inventory behavior.” | Genuine stored-admin permission and inventory controls HTTP 200. | Same two controls HTTP 200, real signup session/JWT and stored subject-bound grant. Positive controls are recorded separately from denial failures. |
| AC3: replacement capabilities remain unavailable | [#28 AC3](https://github.com/wescodess/cadet2/issues/28): “Keep replacement capabilities unavailable until their own guarded slices land.” [LR L26](https://github.com/wescodess/cadet2/blob/4f06c9362dd4ef30bff4d4eab7cb113d90f6de94/docs/decisions/legacy-surface-removal.md#L26): “The legacy workspace is not enabled even for a signed-in Client.” | J28-01/02/03/04 red; Client entry and denied admin navigation lead to the active legacy workspace. The six J28-04 cells were repeated with explicit visible-heading waits; all stayed red. | Safe unavailable entry and no retired navigation/activation assertions pass. J28-04 visitor/admin are green in four cells; Client's two complete journey results fail the #74 console gate. |
| Landing and auth/sign-out | [LR L40–41](https://github.com/wescodess/cadet2/blob/4f06c9362dd4ef30bff4d4eab7cb113d90f6de94/docs/decisions/legacy-surface-removal.md#L40): “minimal scope-honest public/auth entry”; “No recommendation or engine-readiness promise”; “preserve no post-login tasks/results redirect.” | Debug/readiness/demo navigation and workspace return are red in J28-01/02/03. | Landing/auth visually checked from retained screenshots; both state portals are unavailable, developer copy is removed, and sign-in remains available. Client and admin have working visible sign-out in both viewports. No #53 session-revocation claim is made. |

## Remaining pages and audiences

| Audience | `/` and `/auth` | Seven preserved admin pages | `/ai-search` |
| --- | --- | --- | --- |
| Visitor | Minimal unavailable landing; genuine signup/sign-in form | Redirect to `/auth`, no retired navigation | Playground form visible; #74 observation only, no query sent |
| Client | Safe unavailable landing with sign-out; signed-in `/auth` returns to `/` | HTTP 403 and safe `/`; seven hydration console errors per viewport | Playground form visible; #74 observation only, no query sent |
| Stored admin | Safe unavailable landing with sign-out | Inventory, rules, evidence sources, RAG management, phase-0 diagnostics, governance reviews and audit headings render; permission/inventory controls pass | Existing tool form renders; no provider query sent |

Exact per-page URL/headings/links are in `remaining-pages.json` attachments; screenshots
cover every remaining page and audience at both sizes. Actual domain changes caused
by admitted legacy admin-page initialization are retained in the UI digest comparison
and separated from the unchanged denied-request batch. Request-time demo/schema/fallback
retirement belongs to #75.

## Failures, blocks and unrun layers

- #28 bugs filed: **0**.
- [#74 scope note on PR 158](https://github.com/wescodess/cadet2/pull/158#issuecomment-7001339101): S4 hydration console errors during ordinary-Client admin-page denial; 14 errors across the two candidate cells. The same seven-error symptom exists on base desktop. This remains an out-of-scope finding under #74/PR 159. No causal source attribution is claimed.
- Full green `accept` is blocked by those two mandatory console-gate failures. They are not skipped, quarantined or treated as passes. An integrated artifact needs a fresh check after #74's resolution.
- #53 server-side revocation after sign-out is unrun. Only the visible sign-out flow was checked.
- #75's complete deployed import/registration/provenance/one-claim guards are unrun; black-box unreachability is not code-absence proof.
- Managed staging, provider execution/billing, credential revocation, real device/human approvals, full regression/NFR/release sign-off are unrun. This local synthetic acceptance is not their evidence.
- CI at the exact candidate: supplied Verify and Report success; Secrets, Playwright, Contract Tests and Burn-In skipped. No submitted reviews. No quality-bar/security harness tests were read or run here.

## Retention and cleanup

Earlier partial evidence stays unchanged in the parent folder and is indexed as
supporting/incomplete, never used to turn setup failures into red proof. This retry's
oracles, environment/pins, result JSON, table digests and backend-call receipts are
retained. All failures and one passing video/trace per journey are kept; duplicate
successful matrix recordings are removed. Local credentials are sanitized from
retained text/trace artifacts. Owned app/backend processes, detached worktrees,
databases, builds and clone are removed after the final push; the cleanup receipt is
stored under the evidence root.

No PR was opened and nothing was merged.
