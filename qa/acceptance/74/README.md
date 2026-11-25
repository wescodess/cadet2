# Ticket 74 independent acceptance

QA branch `qa/74-admin-containment` starts at integration commit
`407b7445dc3ea48c5a259e449c8f5d118d48a416`. The application artifacts come from
separate detached checkouts of that base and candidate
`f2c7d7599cab3c9f1226da76fd89562fed5c40c9` (PR 159).

The expected behavior comes from ticket [74](https://github.com/wescodess/cadet2/issues/74),
spec [72](https://github.com/wescodess/cadet2/issues/72),
`docs/decisions/legacy-surface-removal.md`, the candidate's
`docs/agents/admin-rag-youtube-containment.md` contract, the preserved-admin and
N06/J10/PA-10/11 rows in `qa/plans/portals-pilot.md`, and the deferred
`qa/sessions/28-out-of-scope-74.md` finding. See `oracles.ts` for quoted assertions.
`GLOSSARY.md` distinguishes cadet2 administration from Practice administration
and professional authority. `DESIGN.md` requires honest disabled/error states.
The implementation's tests, source handlers and diff are not acceptance oracles.

| Criterion | Independent quoted expectation | Proof |
| --- | --- | --- |
| Current narrow authority | #74: “Guard all ten RAG source exports, source submissions/counts and AI Search page/API before reads/provider calls” | J74-01, HTTP/direct Convex matrix and removed-bootstrap probes |
| Review binding | Contract: “the binding must match the JWT issuer and contain a non-future review time and operator evidence reference” | Reviewed, legacy, wrong-issuer, future-review, empty-evidence, tokenIdentifier and email-only cells |
| Preserved functions | #72: “existing pathway/rules and evidence-source maintenance preserved”; bounded diagnostics without raw Client data | J74-01, J74-04 and admitted API-family controls |
| Private response errors | Contract: “admitted errors, including 404 page documents and API responses, retain Cache-Control: private, no-store” | J74-02 and all admitted HTTP matrix responses |
| Frozen YouTube actions | Contract: “HTTP 409 Conflict”; “YouTube source actions are frozen”; “data.code: YOUTUBE_FROZEN” | J74-05 UI actions, separate seven-action HTTP probes and before/after data |
| AI Search and planner off | J10 step 5: “Planner hard-off/AI Search admin-only off ... no hidden public/portal recovery fallback” | J74-03, J74-04, direct API probes |
| Deferred S4 | #72 L230: “Console errors, unhandled exceptions and unexpected failed requests fail” | Mandatory browser fixture on every J74-01 denied deep link and all other UI journeys |
| Meaningful red/green | #72 L229: “each new journey meaningfully red on base and green on candidate” | Separate base/candidate JSON results; setup errors and base-green cases are never promoted to change proof |

Every account is synthetic and created through visible signup. Each UI journey
uses its own account in each viewport; separate `probes` accounts belong to the
security matrix. Operator imports are fixture setup, outside UI journeys. The
deployed schema/function metadata supplies only valid fixture/argument shapes;
the quoted contracts supply all expected outcomes. API probes remain separate
from UI paths. Neither app source nor shipped registrations are changed.

Run every command with `/Users/wesleyukadike/.orchestrate/scripts/cadet2-run`,
`--out /Users/wesleyukadike/.orchestrate/scratch/cadet2-qa-159-accept-74/`.
The `runtime.mjs` supervisor builds and starts an isolated local Convex deployment,
PGlite auth store and production Nitro server. It copies deployment inputs rather
than modifying either checkout. It never uses a tunnel. `QA_REUSE_BUILD=1` is only
for an already successful, pinned build. Base and candidate use distinct origins,
ports, credentials and stores.

Browser commands use `lease-run.py`, which passes `--lease qa-74` and retries a held
lease or high-load refusal once a minute, at most 60 minutes. Setup/build waits
while load1 exceeds 15. `accounts.mjs` records real UI signup, `fixtures.mjs`
installs local operator-reviewed rows, and Playwright runs `journeys.spec.ts` with
one worker, zero retries, light theme, Chromium 1440×900 and 390×844. Every run
retains video, trace and screenshots below
`/Users/wesleyukadike/.orchestrate/evidence/cadet2/74/`.

Use `api-probes.mjs` separately with `QA_URL`, `QA_CONVEX_URL`, `QA_RUNTIME_DIR`,
`QA_EVIDENCE` and `QA_BUILD=base|candidate`. `visitor-probes.mjs` is the independent
anonymous admission control and needs no account setup. No live provider, email,
production deployment or real Client data is used.

The complete run report is retained externally at
`/Users/wesleyukadike/.orchestrate/scratch/cadet2-qa-159-accept-74/accept-74.md`.
Failures use the QA bug template in that report; no bugs are posted to GitHub.
Trace credential redaction extends the #28 sanitizer with signed-cookie and
indexed Nuxt-session redaction before cleanup.
Stop only processes named in each runtime's `ready.json` after the run.

`pipeline.mjs` records each child's native exit status. It runs account setup,
operator fixtures, visible-control inspection, before/after UI snapshots, all
30 UI cases, the HTTP/direct-registration probes and old-worker probes in order.
It holds new stages while load1 exceeds 15; the browser fixture also holds new
cases during a load spike. These waits do not substitute for a visible product
state. Test retries are zero.

The base's `continue-with-candidate.json` can identify the pinned, already built
candidate runtime for sequential execution under the same `qa-74` lease. The
continuation verifies its head and origins. Supplemental freeze controls and
initial matrices remain alongside the conclusive comparison at `fresh/base/` and
`fresh/candidate/` in the evidence directory. Setup corrections cover the Type
selector, Frequency control lookup, deletion confirmation and approval-frequency
prompt. Those setup errors are not behavioral red proof. Denied navigation
asserts the original HTTP response and its redirect chain, since a successful
302 denial can finish on the public landing page with HTTP 200. Both matrices
are replayed after correcting that initial response-shape assumption.
Retired planner bookmarks assert a visible 404, including the intentional JSON
404 response. The retained-source assertion waits for the confirmation dialog's
normal close rather than racing it with a second Cancel action.
`collect-results.mjs` decodes JSON attachments and records complete populations
without substituting an outer exit code for child results. `pin-artifacts.mjs`
hashes every built artifact file before and after execution.

The API layer includes all 36 method/path entries in `oracles.ts`, unknown private
routes, all ten source exports, two batch queries, five source-audit queries,
removed registrations, foreign-origin mutations, immediate grant revocation,
seven frozen YouTube actions and public planner regressions. Valid website
transitions provide admitted controls. Retained YouTube metadata and approval
history make no-change checks nonempty; no object-store corpus exclusion or
owner credential revocation is claimed.

The orchestrator clarified that completely unregistered API paths have no
admission and fall outside the private-cache criterion. Existing handlers with
unknown resource IDs and unknown `/admin/**` or `/ai-search/**` page paths remain
in that criterion. Separate reviewed-admin probes request one unregistered API
path with JSON and HTML Accept headers and reject any session, profile or admin
data in either response.

After importing historical source approvals, candidate fixture setup runs the
documented internal `ragSourceAudit:backfillEvents` operator migration for both
history tables until complete. It clears only this disposable fixture's prior
projections/receipts before that backfill. Runtime migration instructions supply
setup steps; the ticket and containment contracts supply the test expectations.
Candidate freeze snapshots include the audit projections, deletion records and
create receipts as well as source/item/batch/approval history.

The mandatory browser observer also records cache headers for every private
document/API response encountered. Expected 401/403 denials and 302/303 redirects
remain separate from admitted responses. Following the #28 cancellation policy,
aborted navigation documents and named auth-token, permission and build-manifest GETs remain
listed in the evidence; console errors, including hydration errors, are never
suppressed by that cancellation allowance.

Workforce is not coverable on this candidate: no workforce role exists yet; it is
owned by the portal tickets. The orchestration clarification explicitly excludes
invented workforce fixtures and does not classify this omission as a bug.
