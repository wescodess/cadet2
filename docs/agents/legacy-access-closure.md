# Legacy Client and public run closure

Issue [#28](https://github.com/wescodess/cadet2/issues/28), D01, High risk. The initial red baseline was [#55](https://github.com/wescodess/cadet2/pull/55) at `97bbfa26194e4eb1e870e465520ab5d90486b9e5`. The stack incorporates its subsequent quality fixes at `7cff4ee6728a78996ff1ddcd8561e3162ddda0ca`; merge after #55. This is containment, not portal activation.

## Closed boundaries

```text
/workspace/**, /tasks, retired workspace/intake/run APIs
  -> no-store 404 before route loading
  -> old pages, handlers, shell, navigation and automatic processing removed

14 public recommendation functions
  -> 11 internal registrations; 3 testing registrations deleted
tasks.list + 4 unused public audit functions
  -> registrations and scaffold implementations deleted

preserved admin review HTTP
  -> real session + stored admin grant
  -> two fixed internal diagnostic queries
```

The HTTP boundary covers root paths, arbitrary descendants, all methods, prefetches, encoded paths and SSR payload requests. It does not redirect a run ID to a Signed plan. The public/auth entry remains available and login returns there. No replacement portal, Signed plan reader or processing capability is enabled. Historical schema and stored records are retained.

The interim admin transport uses the existing server operator credential only after the real user grant check. Its two function references are fixed; no HTTP caller supplies an internal function name or asserted identity. This is the temporary internal containment allowed by the tenancy decision, not the final user-JWT transport. Existing admin review purposes and UI are preserved.

## Boundary evidence

The harness starts the actual built Nitro server, a fresh PGlite store initialized by the existing migrations, and Convex backend `precompiled-2026-11-16-80befbc`. The backend archives are SHA-256 pinned for macOS arm64 and Linux x64. Fixtures are imported by isolated operator setup outside deployed registrations. Users sign up through the built application's real HTTP auth, retain real cookies, confirm their live session and obtain the application's JWT. Convex validates those JWTs against the real HTTP JWKS. No request client uses deployment-key impersonation and no permission evaluator is mocked.

The matrices include anonymous, ordinary signed-in, foreign-user, own-Client and admin callers. A completed legacy run contains a distinctive unsigned result; the audit store is nonempty. Positive controls verify the actual subject-bound admin grant and the preserved HTTP review returning the fixture, plus session usability after denial. Admin HTTP readers reject the other callers.

The test-only process observer forwards the actual PGlite calls and loopback fetches, records private SQL/backend/provider attempts, and rejects external network traffic. The admitted admin positive control proves that both SQL and backend observation are connected. Every retired HTTP probe requires no new observation; direct Convex probes also require the run/audit stores to remain unchanged. Browser chunks are checked for retired navigation, polling and start endpoints. This targeted check does not replace #75's complete built-surface manifest guard.

| Run                                              | Observed result                                                                                                                                                                                                   | Retained output                                         |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| HTTP red, base application                       | Exit 1: 22 failed, 9 passed; real session/JWT positive control passed                                                                                                                                             | [HTTP red](legacy-access-evidence/http-red.txt)         |
| HTTP green, expanded matrix                      | Exit 0: 34 passed, zero failed/skipped                                                                                                                                                                            | [HTTP green](legacy-access-evidence/http-green.txt)     |
| Direct Convex red, original Convex registrations | Exit 1: all 95 caller-by-registration probes failed the closure assertion; persisted fixture state changed; 2 positive controls passed. Node reports 101 failures including parent tests and the state assertion. | [Convex red](legacy-access-evidence/convex-red.txt)     |
| Direct Convex green                              | Exit 0: 104 passed, zero failed/skipped; includes all 95 direct probes, unchanged storage, the admitted review and denied admin-reader controls                                                                   | [Convex green](legacy-access-evidence/convex-green.txt) |

HTTP red ran against the unmodified base application. Direct Convex red ran after HTTP closure, with the Convex source still identical to that base. The green matrices add SSR/encoding/body/extension-method/browser-chunk checks and the explicit denied-admin-reader control. Logs normalize trailing whitespace and the repository path to `<repo>`; all recorded identities/data belong to disposable synthetic stacks. Harness setup failures are excluded from red evidence.

## Verification and remaining gates

`pnpm verify` now runs `test:legacy-access` after its production build, without an opt-in flag or skip. The original quality rows remain required; allowances may only decrease. The exact verification command is:

```sh
BETTER_AUTH_SECRET=$(openssl rand -hex 32) NUXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 CONVEX_SITE_URL=http://127.0.0.1:3000 pnpm verify
```

The [initial aggregate run](legacy-access-evidence/verify-initial.txt) exited 0 with [all nine commands passing](legacy-access-evidence/verification-initial.json), 63 existing Vitest tests and 138 boundary tests. That local run observed 32 Nuxt diagnostics, 9 Convex diagnostics, 1572 lint findings and 636 formatting exceptions. The first clean CI run passed all 138 boundary tests but still reported the original `convex/auth.config.ts` diagnostics. Final manifests retain that unchanged file's exact #55 exceptions: one Convex diagnostic and four lint findings. Pre-review allowances were 32 Nuxt diagnostics, 10 Convex diagnostics, 1576 lint findings and 636 formatting exceptions; none exceeds #55. Dependency, secret and skip allowances did not increase. The final committed head is reverified after incorporating #55's subsequent quality fixes; exact-head CI evidence is retained by its Verify job.

These are local real-boundary tests and CI regression coverage. Managed staging/provider deployment evidence, the independent High-risk security review including Opus max, and independent QA acceptance remain unrun for the implementation handoff. No `qa/` file is changed. #55 must merge first; this PR must then be rebased onto `dev` and reverified.

The approved split leaves admin/RAG authority and YouTube containment with #74, deployed test/fallback removal, provenance and the integrated manifest guard with #75, and the final auth/session transport with #53. Deleting the three recommendation testing registrations here closes their public names; it does not claim the remaining testing routes, fallback modules or processing modes have been removed. No deployment, credential rotation, data migration/deletion or merge is performed.

## Review findings 2–5

The review readers create the Convex admin client before entering the legacy fallback catch. Missing `CONVEX_ADMIN_KEY`/`CONVEX_DEPLOY_KEY` now produces 503 for both list and detail instead of an empty-success list or false 404. With the key restored, both readers return the imported synthetic run. Remaining query-error fallback removal is #75's scope.

Every recommendation-review route (list, detail, citations, citation flag, run flag/dismiss/resolve) and `/api/admin/access` now uses the same default `requireAdminSession` stored-grant check at its boundary. A session listed only in the Nuxt email allowlist is denied before private reads or action writes; the stored fixture grantee succeeds on all eight boundaries. The service retains its check too. This is interim containment through the existing grant evaluator, not a replacement authority system: #74 still owns `sync-current-user`, self-grant removal and the existing email/tokenIdentifier authority fallbacks. None of those paths is changed here.

Retirement checks both raw `event.path` (query removed) and `getRequestURL(event).pathname`, decoded and case-folded. A raw path beneath a retired root is denied even when literal or encoded dot segments normalize out of that root. Raw Node HTTP probes preserve `/workspace/..`, `/workspace/%2e%2e`, `/workspace/.%2E`, `/api/workspace/..` and `/api/recommendations/runs/%2e%2e?runId=…` on the wire, plus encoded roots/slashes, case variants and single-dot segments. Tests require no-store 404, no private observations and no SSR payload. In-memory H3 raw-router canaries prove the unguarded router reaches the handler and the production retirement middleware prevents its effect; the canary handlers exist only in the test process and are absent from deployed routes.

[Every Playwright spec and helper disposition](legacy-access-spec-dispositions.md) records retired-only deletions, preserved pure utility/admin tests, mixed-spec cleanup and the downward skip ratchet. The security inventory check rejects retired demo route assertions in the remaining specs/helpers.

Reproductions at `f074282640876ca1a77ff5c284a416bf706e05e6`, before production fixes:

- [HTTP red](legacy-access-evidence/review-fixes/http-red.txt): 47 tests, 38 passed, 9 failed including parent failures; missing-key list returned 200 and detail 404, and allowlist-only access/flag/dismiss/resolve returned 200.
- [Raw-router red](legacy-access-evidence/review-fixes/router-red.txt): 12 tests, 3 passed, 9 failed including the parent; escaped roots reached the canary.
- [Obsolete-spec inventory red](legacy-access-evidence/review-fixes/specs-red.txt): 1 failed, listing retired assertions and helpers.

Sign-out (finding 1) is addressed below. Independent re-review, QA and managed staging remain separate gates.

After the fixes, [all 164 boundary tests pass](legacy-access-evidence/review-fixes/security-green.txt), with zero failures/skips. This includes each missing-key/read positive control, all eight allowlist-denial/stored-grant positive controls, raw built-Nitro probes, canary controls and the spec inventory. A fresh frozen install passed; the documented full verify command then passed all nine rows, including 19 Vitest files/80 tests and the 164 boundary tests ([complete run record](legacy-access-evidence/review-fixes/verification.json)). Current allowances are 32 Nuxt/10 Convex diagnostics, 1434 lint findings, 566 formatting exceptions and 10 skipped-test exceptions, all at or below the pre-review baselines. Retained Playwright discovery finds 66 tests in 14 files; that inventory was not run as a browser/API suite. Exact committed-head verification is recorded by CI's Verify artifact and linked in the PR evidence.

## Review finding 1: sign-out

Deleting the workspace shell and tasks page removed the only `signOut()` calls, leaving signed-in users with no way to end a session. A shared `SignOutButton` composes the existing `Button` and destructive `Alert` and renders only while signed in. It appears on `/` (in place of the sign-in link, since `/auth` sends signed-in users back), every admin page beneath its navigation, and `/ai-search`. It calls the existing Better Auth client `signOut()` and inspects the result. On success it reloads `/`; on a rejected or unsent request it reports that the user is still signed in and keeps the session. The module's `useUserSession().signOut()` wrapper was not used because it clears local session state even when the server call fails. Auth configuration and session revocation are unchanged.

The CI Verify job now installs Playwright Chromium so the browser test runs inside `test:legacy-access`. It is pinned to `ubuntu-24.04`, like the Playwright job, because Playwright 1.58 does not support Chromium on `ubuntu-latest` (26.04). Prettier formatting the eight edited legacy pages removes them from the format baseline; no allowance increases.

- [Component red](legacy-access-evidence/sign-out/component-red.txt): the component did not exist. [Component green](legacy-access-evidence/sign-out/component-green.txt): 5 passed, covering hidden when signed out, native button when signed in, success to `/`, and server-error and network-failure paths that keep the session.
- [Browser red](legacy-access-evidence/sign-out/browser-red.txt), against the built application at `ce4c0b73bce129c53b8ad7be51e60bbebc140a6d`: 4 failed, 1 passed. Every signed-in page timed out waiting for "Sign out"; the signed-out control passed. An earlier attempt that could not launch Chromium is excluded as a harness failure. The red run used an earlier form of the last test, which failed before reaching its retained-cookie checks.
- [Browser green](legacy-access-evidence/sign-out/browser-green.txt): 6 passed on the real built Nitro, Convex backend and genuine auth cookies. A signed-out visitor is not offered the action. A signed-in admin sees it on all seven admin pages and `/ai-search`. Keyboard sign-out from `/` and from `/admin/recommendation-reviews` returns to `/`, clears the browser's session cookies, makes `get-session` return null, refuses `/api/admin/access` (401) and Convex token minting, and redirects an admin page to `/auth`. A forced 500 from the sign-out endpoint shows the error and leaves the session live.

**Known #53 limitation, not fixed here.** After a successful sign-out, a retained copy of the pre-sign-out session cookie, even `session_token` alone, is still admitted: `get-session` returns the user, `/api/admin/access` returns 200 and `/api/auth/convex/token` mints a token. The browser test asserts this current behaviour as a named #53 characterization, so it fails as soon as #53 changes revocation and must then become denial assertions. Clearing the browser's cookies does not revoke a copied cookie.

After the change, a fresh frozen install passed and the documented verify command passed all nine rows, with 20 Vitest files/85 tests and [170 boundary tests](legacy-access-evidence/sign-out/security-green.txt) with zero failures/skips ([run record](legacy-access-evidence/sign-out/verification.json)). Allowances are 32 Nuxt/10 Convex diagnostics, 1427 lint findings against a 1434 allowance, 558 formatting exceptions and 10 skipped-test exceptions.
