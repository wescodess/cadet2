# Admin, RAG and YouTube containment (#74)

Stacked on #55; merge after #55. This is interim containment under spec #72 and the legacy-removal and tenancy decisions. It does not authorize a pilot or complete #28, #53, #75, #78, #79, #87 or #149.

```text
admin HTTP / private page
  actual Nuxt session -> same user's JWT -> current issuer-bound, operator-reviewed rag_admins row
RAG public registration
  actual JWT subject -> current operator-reviewed rag_admins row -> source transaction + approval audit
YouTube
  submission / activation / prepare / old claim / completion / retry -> denied
AI Search query / corpus sync
  disabled, including with credentials and obsolete enable flags
```

## Boundaries

All ten current `ragSources` exports and both batch-history queries require a stored subject grant independently of Nuxt. Legacy rows without an explicit `subjectBinding` review are denied; the binding must match the JWT issuer and contain a non-future review time and operator evidence reference. No request can create that binding. Existing rows are preserved for the separately authorized operator review, not automatically promoted. No email, `tokenIdentifier`, caller actor ID or Nuxt allowlist supplies admin authority. Mutating HTTP requests also require the configured same origin; an admitted cookie cannot authorize a foreign-origin request. Anonymous users cannot obtain an admin count. A removed grant denies the same session/JWT on its next call. The HTTP guard uses an in-process token endpoint with the configured origin; no request-origin token fetch, deployment key, acting-as identity or internal fallback is used by these admin operations.

The public bootstrap, `sync-current-user`, internal allowlist sync, unused allowlist helper and impersonation helper are deleted. The RAG screen has no grant-creation action. Existing admin pages and AI Search have server admission and private no-store responses before rendering. Phase-0 remains available to admitted admins, reports configuration presence, redacts configured gateway URLs and cannot report overall activation readiness.

Website source maintenance, source approval history, batch diagnostics, pathway/rule maintenance and public-source/rule governance audits remain available. Audit list/count/filter/detail/summary queries exclude historical recommendation-run and unknown setting records. Their contents cannot become a Case browser or signature. The legacy governance-review data/actions and HTTP manual/scheduled ingestion return unavailable pending their scoped adapters; their deployment-key/raw-result transports cannot safely continue during containment. The screens remain for restoration under #87.

YouTube is excluded before preparation, including scheduled/force selection and idempotent reuse. Every old execution plan, batch/source claim, completion, retry and sync boundary rejects frozen work. Source approval, resume, configuration activation and new submissions cannot restart it. Frozen source/item/batch history is retained for restricted diagnostics; its deletion is unavailable pending retention review. The old feed/watch/transcript/description executor, anonymous proxy, embedded-key default and deployed sync caller are deleted. Existing YouTube objects/index entries have not been deleted or certified as excluded. **All AI Search queries and sync remain off.** No environment flag, client model/prompt/filter or admin grant enables them.

Pathway/rule and governance-audit services perform no request-time DDL or demo seeding and provide no missing-table/catalog fallback. Missing schema returns 503. Apply the reviewed SQL through the separately authorized operator migration process; `0006_governance_audit_log.sql` supplies the former audit DDL. Existing `0004`/`0005` contain legacy catalog fixtures and are used explicitly only by the isolated boundary harness here. No deployed initialization route is introduced. Hosted RAG storage reports unavailable instead of writing to the local filesystem.

## Verification and evidence

`pnpm verify` retains all #55 rows and adds `pnpm security:admin` after the production build. It runs the reviewed source/built registration guard and a real isolated Nitro + Better Auth + Convex boundary suite. It cannot be skipped by `ENABLE_CONTRACT_TESTS`. The local backend is pinned to `precompiled-2026-11-16-80befbc`; its data, identities, keys and SQL fixtures are disposable. No test registration is added to the application. The harness deploys the actual `convex/` tree, records its function specification, uses normal signup/cookies/minted JWTs for every human probe and uses an operator client only for isolated fixtures and internal-worker probes. It tears down its processes and state.

The [classification manifest](../../scripts/security/admin-surfaces.json) inventories current HTTP, generated auth/service and Convex registrations. Legacy entries owned by #28/#75 are named inputs, **not certified closures**. The guard rejects new unclassified registrations, aliases/re-exports/default exports, removed admission, generic internal wrappers, dormant ingestion/provider imports, runtime DDL and changed internal visibility. Its classification schema rejects unknown or malformed fields and cannot relabel a RAG/admin entry as legacy. Built-artifact checks reject the removed transcript/key implementation. Runtime tests check all current admin HTTP files, source operations, restricted page payload paths, old jobs, current grant removal, backend outage and admitted positive controls for every enabled admin route. The separate #75 integrated guard remains responsible for the complete deployed test/fallback and portal-field contract.

The retained pre-fix logs are local TDD diagnostics on incremental uncommitted states based on `97bbfa26194e4eb1e870e465520ab5d90486b9e5`; they are not staging acceptance or an immutable deployed candidate. Each records an actually observed behavioral failure:

| Failure before its fix                                                                           | Evidence                                                                                  |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Anonymous admin-count disclosure                                                                 | [Red status](security-containment-evidence/74/red-rag-status.txt)                         |
| Ordinary source access and HTTP email-allowlist promotion                                        | [Red source/HTTP](security-containment-evidence/74/red-source-and-http.txt)               |
| YouTube submission, preparation/reuse, schedule and old-job claim                                | [Red YouTube](security-containment-evidence/74/red-youtube.txt)                           |
| Unguarded search, existing bootstrap route, shipped key caller and read-time demo initialization | [Red search/bootstrap/DDL](security-containment-evidence/74/red-search-bootstrap-ddl.txt) |
| Local-file storage reported success without hosted storage                                       | [Red storage](security-containment-evidence/74/red-storage.txt)                           |
| Phase-0 disclosed a configured gateway URL                                                       | [Red diagnostics](security-containment-evidence/74/red-diagnostics.txt)                   |
| Governance audit exposed historical Client-run fields                                            | [Red audit](security-containment-evidence/74/red-audit.txt)                               |

The additional [legacy-grant red](security-containment-evidence/74/red-legacy-grant.txt), [YouTube item injection red](security-containment-evidence/74/red-youtube-item.txt), [foreign-origin red](security-containment-evidence/74/red-admin-origin.txt) and [provider guard red](security-containment-evidence/74/red-provider-guard.txt) cover the subsequent containment fixes. The [guard ledger](security-containment-evidence/74/guard-mutations.json) records ten rejected mutations plus clean/restored controls.

The [green command summary](security-containment-evidence/74/green-verification.txt), [complete verification manifest](security-containment-evidence/74/verification.json) and [candidate metadata](security-containment-evidence/74/metadata.json) record all nine commands passing, including 20 real boundary cases, on the pinned implementation head. Later changes isolate storage fixtures and explicitly type the Convex runtime environment without changing its behavior. The PR links the final exact-head CI run. Failed setup attempts and fixture-expectation corrections are not counted as behavioral red proof. Baselines and allowances are not raised.

The [first Linux CI run](https://github.com/wescodess/cadet2/actions/runs/44207832423) passed all 20 real boundary cases but rejected two additional static diagnostics for the untyped `process.env` access in `convex/auth.config.ts`. Its runtime environment now has an explicit module-local type, so a clean runner does not depend on ambient Node types. No baseline exception was added.

A subsequent local run exposed a [false-green launcher result](security-containment-evidence/74/red-runner.txt): piped Convex function-spec JSON was truncated at 65,536 bytes and all 20 Node cases failed during setup, while Convex returned exit 0. That run is rejected as failed. Function-spec capture now uses the CLI's complete file output. The launcher independently validates the actual Node exit status and TAP completion record, requiring exactly 20 passing cases with zero failures, skips, cancellations or todos. Both raw records are retained in the quality-output artifact. The [runner ledger](security-containment-evidence/74/runner-probes.json) records a real 20-case positive run and a temporary skipped-case probe that makes the actual outer command exit 1, even though Node itself exits 0. Five focused real-child regression cases cover success, failure, skip, incomplete population and absent completion evidence.

## Remaining gates

- The owner must review and revoke/rotate affected controlled credentials through #22's access process. Code removal is **not revocation evidence**; no key was tested or copied into fixtures/configuration.
- Full component auth, live-session/logout fencing, audited stable-principal grant provisioning and secure worker/diagnostics adapters remain with #53/#78/#79/#87. This interim subject/grant check is not pilot authorization.
- Actual Canadian staging/provider/corpus proof, browser QA and the independent High-risk security review remain unrun by this implementation. Owner and independent acceptance evidence must be supplied before activation or merge approval.
- Merge #55 first. Complete #28 and #75 before treating the parent security containment as closed. Rollback must keep these legacy admin escapes, YouTube and AI Search closed.
