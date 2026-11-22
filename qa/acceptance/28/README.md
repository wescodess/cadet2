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

## Integration on dev after PR 158

The source QA tree is `0b9ce05fb97ea2825ef4d23ca8a3bc93584e2a6e`.
The five original `qa/sessions/28*` reports and `/Users/wesleyukadike/.orchestrate/evidence/cadet2/28/run-2/`
remain historical evidence. Do not run `record.mjs`, `compare-digests.mjs` or
`retain-legacy.mjs` against that retained packet during an integration check.
A fresh integration check does not replace the original red-on-base proof.

Set `QA_RUNTIME_DIR` to a new private directory outside the worktree and outside
`QA_EVIDENCE`. Put local deployment state, account JSON, operator env files and
runtime secrets there. Initialize Convex with a private runtime copy of the pinned
`convex/` source; the initializer rewrites its TypeScript configuration even when
code generation is disabled. Never initialize through a source-directory symlink.
The runtime copy is disposable service state, not another checkout.

Build with the documented verification configuration, leaving `NUXT_HUB_DIR` and
`NUXT_HUB_DB_DATA_DIR` unset. Absolute build-time database overrides make the
installed boundary suite's otherwise isolated stacks share a store. The QA app
helper serves the untouched artifact with its working directory set to
`QA_RUNTIME_DIR`, so its default relative database lives outside the worktree.
Initialize that store with `QA_DB_DIR` pointing to the matching path:

```sh
QA_DB_DIR="$QA_RUNTIME_DIR/.data/db/pglite-dev" node qa/acceptance/28/init-db.mjs "$PWD"
node qa/acceptance/28/local-backend.mjs "$PWD" "$QA_URL"
node qa/acceptance/28/app-runtime.mjs "$PWD" 3000 4521
```

The backend initializer chooses ports 4521/4522 for this example. Deploy the pinned
functions with the installed Convex CLI and its external `self-hosted.env`, with
code generation disabled. Start the two persistent processes separately and record
their PIDs. Readiness must include real auth/session/JWT and an admitted admin
control before any result counts. Respect the shared browser lock before account
setup and journeys.

Use `accounts.mjs` for distinct real UI signups, then `grant-admin.mjs` for the
explicit local subject-bound operator grants. The old public setup functions are
deleted on the integrated candidate. `integration-fixture.mjs` instead uses the
previously admitted local operator-import seam. Set `QA_HISTORICAL_EVIDENCE` to the
original `run-2` packet. The script imports its nonempty observed synthetic payload
for the new signup identities, with new timestamps and an explicitly synthetic
ranker version. The deployed schema supplies only the import shape; all expected
closures still come from `oracles.ts`. These are fresh setup records, not the
original base-created export or standard-processing provenance. Missing retained
payload or identities blocks setup. `legacy-fixture.mjs` remains the original
public-base helper and must not run on the closed integrated candidate.

`operator-cli.mjs` invokes the locked Convex package using the current Node process.
This avoids the observed standalone-pnpm `--env-file` failure (exit 9).
The accepted journey command and all closure/console/network assertions are
unchanged. `account-schema.ts` rejects missing or malformed account setup.
The QA lint configuration inherits the repository rules and uses the QA TypeScript
project; no rule, baseline or skip exception is added.

Bracket UI and probe batches with `digest.mjs`, refreshing real probe JWTs outside
the batches with `refresh-probes.mjs`. Keep UI results and `probes.mjs` results
separate. Run `sanitize-evidence.py` with explicit `QA_RUNTIME_DIR` and
`QA_EVIDENCE`, then remove credential scratch and stop only owned processes.
Keep all failed attempts, native boundary TAP, exit records and source/build pins.

Retained traces also contain HAR cookie metadata. The redactor preserves cookie
names/structure while removing every cookie value, including session-token and
session-data pairs with namespaced names. Validate the actual retained archives
for credentials and cookie metadata after redaction; preserve failed validation
receipts and confirm the test statuses/native TAP counts are unchanged.
