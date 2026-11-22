# Ticket 28 QA integration after PR 158

- Integration/application base: `1b335bface0686641850ea8cd23aa5c5dea4e45c` (`origin/dev`).
- Reviewed implementation head supplied by the dispatch: `b6dfd6f7a0687a5d246a1c45a3d665538b193b70`.
- Accepted QA source: `origin/qa/28-close-legacy-client-results` at `0b9ce05fb97ea2825ef4d23ca8a3bc93584e2a6e`.
- Integration branch: `qa/28-integrate-accepted-journeys`, based on current dev; only `qa/` belongs in its diff.
- Fresh evidence: `/Users/wesleyukadike/.orchestrate/evidence/cadet2/28/integration-2026-11-22/`.
- Original supplied evidence: `/Users/wesleyukadike/.orchestrate/evidence/cadet2/28/run-2/`.

This is an integration check of existing independent acceptance coverage, not a
managed-staging acceptance, whole-pilot GO or fresh release sign-off. The parent
must merge this QA coverage before the next feature. Nothing is merged here.

## Sources and preserved history

Expected outcomes remain [ticket 28](https://github.com/wescodess/cadet2/issues/28),
its acceptance criteria, the pinned decisions in `../acceptance/28/oracles.ts`, and
plan `759cd35eccae0a8665718defd79341de70f0ac8c` rows 112/114/115 and J10 step 3:
“Old personalized paths 404 before reads/effects, no guessed signed redirect/start
or fallback.” No implementation diff or implementer tests supplied an oracle.
Application/configuration reads were limited to building, running and arranging
the admitted local operator import.

The 22 existing QA additions were imported from the accepted source above. All
five original session reports remain byte-identical, including every failed and
blocked result. The original QA branch and its history remain intact. All
oracle exports are value-identical after formatting; all 36 expectation-call ASTs
are unchanged. Receipts are `source/oracle-equivalence.json`,
`source/assertion-equivalence.json` and `source/historical-evidence-sha256.json`.
The earlier printer-only assertion comparison differed on layout; the structural
comparison checks node kinds, literal/identifier values and child order.

Supplied historical acceptance used base `fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3`
and candidate `f5dd47bb9ba660cdbf576e715b3db48f0bdceae5`. It recorded 88/1,044 HTTP
failures and 152/152 direct-Convex failures on base, then 1,044/1,044 and 152/152
closure passes on its candidate, with admitted controls. Its candidate UI result
was **10 passed, 2 failed**, not a fully green acceptance run. Those two failed
Client journeys belong to [#74](https://github.com/wescodess/cadet2/issues/74) /
[PR 159](https://github.com/wescodess/cadet2/pull/159). No historical result is
presented as a fresh run at the integrated dev pin.

## Integration changes

Formatting, typed account loading, a QA TypeScript/lint project inheriting the
existing rules, and external runtime/operator paths make the existing coverage
runnable in this worktree. No assertion, console/network gate, retry policy,
application file, quality baseline or skip allowance is weakened.

The historical public setup functions are deleted at the integrated head. The
fresh setup therefore uses the existing operator-import seam with the retained
synthetic payload vector and new genuine signup identities. Its import shape was
checked against the deployed schema; that schema supplies no expected closure
result. New timestamps and `qa28-synthetic-legacy-import-v1` explicitly identify
fresh synthetic setup, not the original export or standard-processing provenance.
A one-row local import preflight exited 0. Actual journey setup must replace it
with distinct accounts and nonempty own/foreign fixtures before coverage counts.

All runtime state, TMPDIR, synthetic credentials and outputs are outside scanner-
visible paths. Disposable Better Auth secrets are generated locally and are not
committed or retained. The installed Convex package runs directly under Node for
operator commands after standalone pnpm returned exit 9 for `--env-file`; the
direct Node invocation succeeded.
Those failed setup attempts remain in `commands/`; they are not behavioral reds.

The local initializer briefly regenerated `convex/tsconfig.json` through a runtime
source link, removing `noUncheckedIndexedAccess`. The pinned file was restored
before current verification; the private runtime now holds a copy. The captured
diff is `source/initializer-generated-config-diff.patch`. No non-QA source change
is included in this branch.

## Initial aggregate verification

`pnpm install --frozen-lockfile` exited **0**, using Node **24.20.0** and pnpm
**9.12.3**. Initial `pnpm verify` exited **1** and completed all nine commands:

| Row | Initial result |
| --- | --- |
| Typecheck | Failed: an unrelated home-directory `node_modules/@types/node` removed the expected `convex/auth.config.ts\|TS2580` diagnostic; no allowance was changed. |
| Lint | Failed: the three QA TypeScript files were absent from the existing lint project. |
| Format | Failed: the journey file needed a second formatter pass. |
| Secrets / dependencies / test policy | Passed with the existing recorded debt and skip baselines. |
| Components | Passed: 29 files, 652 tests. |
| Build | Passed. |
| Legacy access | Passed: 233 tests, zero failed/cancelled/skipped/todo. |

See `commands/verify-initial.log`, `commands/verify-initial.json` and
`verification/initial/verification.json`. Initial failures remain visible. The initial aggregate has no browser-lock receipt
and is diagnostic evidence only; the current bar requires a complete run under
exclusive lock ownership.

The final read-isolation profile makes only unrelated home ambient typings
unreadable; parent dependency-directory metadata and runtime lookups remain
available. Frozen worktree dependencies remain readable. An isolated compiler check restores the ten expected Convex diagnostics.
The QA project resolves Node typings explicitly from the frozen installation and
its independent `tsc --noEmit --project qa/tsconfig.json` check exited **0**.
QA ESLint also exited **0** after the integration fixes. No gate or application
configuration is altered to obtain these results.

## Current verification

**Passed:** `sandbox-exec -f source/verification-isolation-ambient.sb pnpm verify`,
exit **0**, all nine commands. Node **24.20.0**, pnpm **9.12.3**; disposable local
`BETTER_AUTH_SECRET`, `NUXT_PUBLIC_SITE_URL=http://127.0.0.1:3000`,
`CONVEX_SITE_URL=http://127.0.0.1:3000`. Hub database/directory overrides are unset,
so the installed suite keeps its normal per-stack relative stores. TMPDIR and
retained quality output are private external directories. `NODE_OPTIONS` selects
the native TAP reporter without changing any test.

- Types: passed the existing 32 Nuxt / 10 Convex diagnostic ratchets.
- Lint, format, secrets, dependencies and test policy: passed their adopted ratchets.
  Seven baseline manifests remain byte-identical; the 52 legacy Playwright skips
  remain the existing allowance, with no new skips or exceptions.
- Components: **29 files / 652 tests passed**.
- Production build: passed.
- Legacy access: **233 tests passed**, zero failed/cancelled/skipped/todo.
  Native TAP has all 233 `ok` records and the complete root plan `1..54`.

Proof: `commands/verify-current.log`, `commands/verify-current.json`,
`verification/current/verification.json`,
`verification/current/legacy-access-native.tap` and `native-tap-validation.json`.
The built artifact's file hashes, backend binary/version, schema and QA source
hashes are in `source/integrated-artifact.json`. Application source remains exactly
the integration base; this is a local production artifact, not a managed image.

### Failed attempts retained separately

| Attempt | Actual result and reason | Retained record |
| --- | --- | --- |
| Initial aggregate | Exit 1; types/lint/format failed as described above. Native 233 passed, but this diagnostic run has no browser-lock receipt. | `commands/verify-initial.log` |
| Broad read isolation | Exit 1; seven commands passed. Build failed on Nitro's parent-directory `stat` with EPERM. Dependent native TAP: 127 total, 76 passed, 51 failed; incomplete artifact, no current boundary credit. | `commands/verify-final.log`, `verification/final/` |
| Data-only ambient denial | Focused typecheck exited 1 because discoverable-but-unreadable ambient packages broke type resolution. Metadata denial was then scoped to ambient typings only. | `commands/isolated-types-refined.log` |
| Absolute database override | Exit 1; eight commands passed. Native signup hooks shared one compiled database and reported `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`: 222 total, 180 passed, 42 failed. No current boundary credit. | `commands/verify-integrated.log`, `verification/integrated/` |
| Final documented database configuration | Exit 0; all nine commands passed, complete native population 233/233. | `commands/verify-current.log`, `verification/current/` |

The focused type/build checks with scoped ambient isolation also exited 0 before
the final aggregate. These are configuration corrections, not automatic retries
to hide a flake. Every failed record remains retained; no application assertion,
policy, baseline or skip allowance changed.

## Current accepted journeys and probes

**#28 closure assertions pass; fully green acceptance remains blocked by #74.**
The documented Playwright command exited **1**: **10 passed, 2 failed**, zero
skipped/flaky, one worker, zero retries. Chromium light at 1440×900 and 390×844.
All twelve results, videos, traces and screenshots are retained.

| Existing journey | Desktop | Mobile |
| --- | --- | --- |
| J28-01 visitor landing and retired bookmarks | Passed | Passed |
| J28-02 Client bookmarks, safe entry and visible sign-out | Passed | Passed |
| J28-03 admin bookmarks, safe entry and visible sign-out | Passed | Passed |
| J28-04 visitor remaining pages | Passed | Passed |
| J28-04 Client remaining pages | Failed: 7 console errors | Failed: 7 console errors |
| J28-04 admin remaining pages | Passed | Passed |

Both failed results contain only the mandatory console-gate failure:
`Hydration completed but contains mismatches.` Seven denied admin destinations
produce seven errors per viewport, **14 total**. The #28 navigation/content
assertions completed successfully. This is the existing
[#74](https://github.com/wescodess/cadet2/issues/74) /
[PR 159](https://github.com/wescodess/cadet2/pull/159) finding recorded in
`28-out-of-scope-74.md`; it is neither waived, suppressed, skipped nor relabelled
passed. No new #28 bug was found. The public AI Search form is observed only;
no provider query is submitted and its containment remains #74 scope.

Real setup passed before coverage: eleven distinct UI signups with genuine
sessions/JWTs, five subject-bound local operator grants, and eleven nonempty
synthetic legacy records. Each journey/matrix cell has its own accounts. The QA
server runs the untouched artifact with the private runtime directory as its cwd;
its actual default `.data/db/pglite-dev` store is outside the worktree.

The separate `node qa/acceptance/28/probes.mjs` command exited **0**:

- **1,044/1,044 HTTP probes passed**, all four actors/method/query/SSR/encoded
  variants; zero matching backend function RPC entries in the HTTP-only segment.
- **152/152 direct-Convex probes passed**, nineteen retired names × four actors
  × own/foreign targets; zero private-marker responses.
- Genuine stored-admin permission and inventory controls both returned **HTTP 200**.
  Direct denial calls use real user JWTs, never an operator/deployment key.
- Every retained SQL and Convex table digest is equal before/after the denied
  probe batch. Snapshots, JWT refresh and the control warmup each exited 0.

The UI batch is recorded separately: Convex rows remain equal; intentional
sign-ins add sessions and admitted admin visits initialize legacy SQL catalog and
governance/review tables. These are visible in `digest-comparisons.json` and are
not attributed to the denied batch. Request-time demo/DDL retirement remains #75.

Evidence: `integrated/ui/results.json`, `journey-summary.json`,
`integrated/ui/artifacts/`, `integrated/probes/summary.json`,
`integrated/probes/http-backend-calls.json`, `integrated/before-*.json`,
`integrated/after-*.json` and `digest-comparisons.json`. Exact commands, timestamps
and exits are in `commands/integration-run.json` and its named per-command logs.

## Retention and cleanup

Execution waited for the pre-existing browser lock, then held the task's own lock
through complete verification, setup, journeys and probes. Owned app/backend
processes stopped normally; their three ports were closed before the owned lock
was released. `cleanup.json` records the checks. The other review's lock was never
removed. Credential scratch was removed after sanitization; `sanitization.json`
and the cleanup receipt record the outcome. Original evidence is hashed before
and after and remains unchanged. No merge or PR watch is performed.


The post-run privacy check found 16 retained HAR cookie-metadata locations missed
by the original redactor; values were never printed or published. The QA-only
redactor now removes cookie values in every HAR cookie container and namespaced
session-token/session-data pair. Its actual evidence check went red, then green:
all **12 trace archives / 11,415 JSON or JSON-line events** validate with **zero
known-credential/JWT findings and zero unredacted cookie-metadata findings**.
Native TAP and the 10/2 UI statuses remain unchanged. The first failed privacy
receipt stays in `sanitization-validation-initial.json`; corrected proof is
`sanitization-validation.json` and `source/validate-evidence.py`.

This redactor correction occurred after the complete aggregate. Application and
journey execution code remain identical to the verified snapshot; the corrected
redactor is validated on the actual retained traces and the affected secrets row
is rerun on the final staged tree. No test assertion or skip was changed.

## Coverage limits

- The original base red/green packet is supplied historical acceptance, preserved
  unchanged; it is not newly rerun against an obsolete checkout.
- Managed staging, provider execution/billing, credential revocation, Canadian
  managed-environment proof, real devices and owner/human approvals are **unrun**.
- #53 retained-session revocation is **unrun** in these QA journeys. The installed
  legacy suite's passing observation of the known defect is not proof of a fix.
- #75 complete deployed import/registration, provenance and one-claim proofs are
  **unrun** here. Black-box unreachability is not deployed code-absence proof.
- Table equality establishes retained-row equality, not physical read or external
  billing instrumentation. UI sign-in and admitted admin initialization effects
  must remain distinct from denied-probe effects.
- CI and submitted reviews are separate from local verification and are reported
  with their exact state in the handoff. No PR is watched or merged.
