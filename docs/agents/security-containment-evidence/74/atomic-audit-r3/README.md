# Atomic admin governance writes (#74)

The confirmed finding was reproduced at `8449549226207527e7ff8bdc1c3734239c929699`, stacked on #55 at `d632c39d599ea8179c44c582bb1278e27a64f004`. The built Nitro app used real Better Auth sessions/JWTs, reviewed admin grants, PGlite and a disposable local Convex backend. No provider or production data was used.

The [red result](red-boundary-results.json) records **29 passing controls and 13 failing rollback cases**, with zero skips, cancellations or todos. Every failure asserted that an audit error must leave domain state unchanged. All 13 paths instead persisted their change. The outer `pnpm security:admin` command exited 1; the Node child also exited 1. Faults and operator fixtures were restricted to the disposable stack.

## Write-path inventory

| HTTP write path                                         | Before                                                              | After                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `POST /api/admin/pathways`                              | SQL insert committed before SQL audit                               | Insert and audit share one SQL transaction; duplicate creates conflict                    |
| `PATCH /api/admin/pathways/[pathwayId]`                 | Old state read and update committed before audit                    | Lock parent, read old state, update and audit in one SQL transaction                      |
| `PATCH /api/admin/pathways/[pathwayId]/status`          | Status committed before audit                                       | Lock parent, read old state, update status and audit in one SQL transaction               |
| `POST /api/admin/pathways/[pathwayId]/rules`            | Rule and parent timestamp committed before audit                    | Recheck parent under lock; rule, parent timestamp and audit share one transaction         |
| `PUT /api/admin/pathways/[pathwayId]/rules`             | Delete/reinsert, timestamp and per-rule audits committed separately | Parent lock, complete replacement, timestamp and all audits share one transaction         |
| `PATCH /api/admin/pathways/[pathwayId]/rules/[ruleId]`  | Rule update and timestamp committed before audit                    | Recheck rule/parent binding under lock; update, timestamp and audit share one transaction |
| `DELETE /api/admin/pathways/[pathwayId]/rules/[ruleId]` | Rule delete and timestamp committed before audit                    | Recheck rule/parent binding under lock; delete, timestamp and audit share one transaction |
| `POST /api/admin/rag/sources`                           | Convex source/approval committed before separate SQL audit          | Source and governance snapshot on its approval row commit in the same Convex mutation     |
| `PATCH /api/admin/rag/sources/[sourceId]`               | Convex config/approval committed before separate SQL audit          | Config and before/after governance snapshot commit in the same Convex mutation            |
| `POST /api/admin/rag/sources/[sourceId]/approve`        | Convex approval committed before separate SQL audit                 | Approval and before/after governance snapshot commit in the same Convex mutation          |
| `POST /api/admin/rag/sources/[sourceId]/reject`         | Convex rejection committed before separate SQL audit                | Rejection, reason and before/after governance snapshot commit in the same Convex mutation |
| `POST /api/admin/rag/sources/[sourceId]/pause`          | Convex pause committed before separate SQL audit                    | Pause and before/after governance snapshot commit in the same Convex mutation             |
| `POST /api/admin/rag/sources/[sourceId]/resume`         | Convex resume committed before separate SQL audit                   | Resume and before/after governance snapshot commit in the same Convex mutation            |

The SQL accessor imports the generated `hub:db` client explicitly and exposes only execution and transaction operations. Every helper inside a route transaction receives that transaction. Audit errors propagate and roll back domain changes; request-time DDL and false success are not restored.

The additive optional `approval_audit_log.governance` field preserves existing rows. A separately guarded/classified approval query supplies the admin audit projection. New rows supply their canonical actor, server timestamp and exact mutation snapshots to list, detail, filters, pagination and summary. Legacy approval rows without snapshots are excluded from this projection; their existing SQL governance history remains visible. Direct Convex transitions receive the same governance snapshots. Source deletion continues to preserve history and record its canonical deletion event atomically. The HTTP source handlers insert no second SQL audit.

Recommendation-review and ingestion write transports remain unavailable with 503 before any mutation. No additional preserved operation was disabled.

## Boundary coverage

The [green result](green-boundary-results.json) records **58/58 passes** against the production build, with zero failures, skips, cancellations or todos. The separate `pnpm security:admin` command exited 0.

The mandatory population is 58: the existing 29 cases, 13 audit-failure rollback cases, 13 one-event success cases, and three cases covering partial bulk failures/cross-parent IDs/missing audit storage, concurrent SQL/Convex snapshots and duplicate creation, and unavailable review/ingestion writes. SQL faults reject audit inserts; the bulk probe permits an early audit and rejects a later one. Convex faults throw after the canonical approval insert in the disposable backend copy. Both stores must roll back their state and audit history together.

The controls also cover successful source writes while SQL audit storage is absent, legacy SQL history without duplicate approval projections, direct/HTTP deletion history, NUL snapshot projection, current-authority denials and all previously frozen execution paths. The independent child-result validator requires exactly 58 passes and zero failures, skips, cancellations or todos. No timeout, skip, retry, allowance or baseline increase was introduced.

Full local logs, rollback snapshots, TAP records and commands are retained in `~/.orchestrate/scratch/cadet2-fix-pr159-r3-evidence/`. Local validation, exact-head CI, staging/provider/browser QA and independent acceptance remain separate evidence layers.

## Fresh-install verification

The fresh `pnpm install --frozen-lockfile` exited 0, followed by exit 0 from:

```sh
BETTER_AUTH_SECRET=$(openssl rand -hex 32) NUXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 CONVEX_SITE_URL=http://127.0.0.1:3000 pnpm verify
```

`TMPDIR` and the ignored clone-local pnpm store config kept temporary/install data inside the clone. The [complete manifest](verification.json) records baseline policy and all nine rows passing: typecheck, lint, format, secrets, dependencies, test policy, 125 unit/component tests, production build and 58 real boundary cases. The separate `pnpm security:admin` run also passed 58/58. The [metadata](metadata.json) records the source and lockfile digests and the unchanged-baseline comparison; per-file baseline hashes remain in the local packet. All seven baseline manifests, the package manifest, lockfile and CI workflow are unchanged.

Earlier type/fixture setup errors, a concurrent Nuxt preparation collision, CLI JSON truncation and a failed verifier install-integrity row caused by an uninherited clone-local store config are retained separately in the full local packet. The fixture now reads canonical approval history through the guarded paginated query. The store config is clone-local and inherited by the verifier's pnpm children; no gate or parser was weakened. Those attempts are not counted as behavioral red or accepted final verification. Independent review and staging/provider/browser acceptance are not established by these local checks.
