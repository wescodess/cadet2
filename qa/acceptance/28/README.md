# Ticket 28 acceptance retry

QA branch: `qa/28-close-legacy-client-results`, based on integration `fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3`.
Candidate: `f5dd47bb9ba660cdbf576e715b3db48f0bdceae5`.
Evidence: `/Users/wesleyukadike/.orchestrate/evidence/cadet2/28/run-2/`.

The independent source is ticket [#28](https://github.com/wescodess/cadet2/issues/28),
spec [#72](https://github.com/wescodess/cadet2/issues/72), and the pinned decisions in
`oracles.ts`. Plan `qa/portals-pilot-plan` at `759cd35eccae0a8665718defd79341de70f0ac8c`:
rows 112/114 retire unsigned workspace/history/compare success; row 115 retires demo
and public helper success; J10 step 3 says “Old personalized paths 404 before reads/effects,
no guessed signed redirect/start or fallback.”

| Criterion | Quoted source | Coverage |
| --- | --- | --- |
| AC1 | “Close /workspace and every descendant”; “Old result bookmarks return 404 without guessing a Signed plan.” | J28-01/02/03; separate HTTP/method/query/SSR boundary probes and backend digests |
| AC2 | “Close all 14 public recommendation exports and remove the tasks demo and unused public audit exports.” | J28-01/02/03 tasks; separate direct Convex closure probes for visitor/Client/foreign/own/admin and admitted admin control |
| AC3 | “Keep replacement capabilities unavailable until their own guarded slices land.” | J28-01/02/03/04, landing and remaining-page observations |
| Public helpers | LR L71 “Delete, not admin-only, internal or environment-gated in a deployed build.” | HTTP seed/reset and direct public backend names, with before/after digests |
| Landing/auth | LR L40 “minimal scope-honest public/auth entry”; L41 “preserve no post-login tasks/results redirect.” | J28-01/02/03/04 |

UI journeys use accessible role/name/label/text, genuine sign-up/sign-in, visible waits,
and no mocked service, hidden API action or script injection. Security/API probes and
operator setup are separate from these journeys. Console/unhandled/unexpected request
failures fail the UI fixture. Each account is unique per journey and matrix cell.

Run: `QA_URL=... QA_ACCOUNTS=... QA_EVIDENCE=... pnpm exec playwright test -c qa/acceptance/28/playwright.config.ts`.
Chromium: 1440×900 and 390×844, light, one worker, zero retries.
Per the dispatch's disk budget, retain failures and one passing video/trace sample per
journey; keep all compact result records. No app source/diff/tests are acceptance oracles.

Prior evidence under the parent evidence directory is supporting only: interrupted,
incomplete/setup runs and a base-only boundary batch. Setup errors never establish red.
No scope acceptance is inferred from their failure totals.

Session revocation after logout belongs to #53. Admin/RAG/YouTube containment belongs
to #74/PR #159. Deployed import-graph/provenance/one-claim proof belongs to #75. Local
runtime results do not establish managed staging, whole-pilot or release readiness.
