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

The [initial aggregate run](legacy-access-evidence/verify-initial.txt) exited 0 with [all nine commands passing](legacy-access-evidence/verification-initial.json), 63 existing Vitest tests and 138 boundary tests. That local run observed 32 Nuxt diagnostics, 9 Convex diagnostics, 1572 lint findings and 636 formatting exceptions. The first clean CI run passed all 138 boundary tests but still reported the original `convex/auth.config.ts` diagnostics. Final manifests retain that unchanged file's exact #55 exceptions: one Convex diagnostic and four lint findings. Final allowances are 32 Nuxt diagnostics, 10 Convex diagnostics, 1576 lint findings and 636 formatting exceptions; none exceeds #55. Dependency, secret and skip allowances did not increase. The final committed head is reverified after incorporating #55's subsequent quality fixes; exact-head CI evidence is retained by its Verify job.

These are local real-boundary tests and CI regression coverage. Managed staging/provider deployment evidence, the independent High-risk security review including Opus max, and independent QA acceptance remain unrun for the implementation handoff. No `qa/` file is changed. #55 must merge first; this PR must then be rebased onto `dev` and reverified.

The approved split leaves admin/RAG authority and YouTube containment with #74, deployed test/fallback removal, provenance and the integrated manifest guard with #75, and the final auth/session transport with #53. Deleting the three recommendation testing registrations here closes their public names; it does not claim the remaining testing routes, fallback modules or processing modes have been removed. No deployment, credential rotation, data migration/deletion or merge is performed.
