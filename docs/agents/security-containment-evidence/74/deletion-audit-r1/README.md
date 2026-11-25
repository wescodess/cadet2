# Source deletion audit correction

PR #159, ticket #74, Stage A security round 1. Before-fix head: `afac5d3f50c7e4d2b2c5782678395958294d4db6`.

The regression tests were written and executed before production changes. `pnpm security:admin` exited 1: 25 tests, 23 passed, 2 failed, zero skipped/cancelled/todo. [TAP record](red.tap) and [child status/counts](red-results.json) retain the execution record. Repository TAP copies normalize trailing whitespace only; the original logs and artifacts remain in the external scratch evidence directory.

- Direct authenticated deletion removed both approval rows and left zero deletion events.
- HTTP deletion removed both approval rows and left one deletion event.
- Actor-argument rejection, non-admin denial, injected rollback and append-only review transitions passed before the fix.

The shared `removeSource` mutation now retains every approval row and inserts one `rag_source_deletions` record in the transaction that deletes the source and its items. The actor comes from the authenticated, issuer-bound, reviewed stored grant; the source snapshot and time come from the mutation. Neither transport accepts an actor argument. Extra direct Convex actor fields are rejected by argument validation; HTTP actor fields are ignored. The existing HTTP DELETE path collects no deletion reason.

The HTTP handler delegates deletion to this mutation and writes no separate deletion audit. The admin audit list, filters, pagination, detail, related records and summary read the canonical deletion events through an independently guarded, paginated query and combine them with the existing SQL history. Reading does not mirror or rewrite events. No legacy public audit registration is changed.

All seven mutations in `ragSources.ts` were inspected:

| Mutation                 | History behavior                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `createSourceSubmission` | Inserts the submission approval event.                                                                   |
| `updateSourceConfig`     | Appends an edit event.                                                                                   |
| `approveSource`          | Appends approval; clearing the current source rejection fields preserves the earlier rejection audit.    |
| `rejectSource`           | Appends rejection and its reason.                                                                        |
| `pauseSource`            | Appends pause.                                                                                           |
| `resumeSource`           | Appends resume.                                                                                          |
| `removeSource`           | Previously deleted approval rows; now retains them and atomically appends the canonical deletion record. |

No other mutation deletes or rewrites an approval/governance history row. The transition regression preserves the original rows byte-for-byte through edit, rejection, reapproval, pause and resume.

For rollback proof, the test harness inserts a throw immediately after the source delete and before the event insert in its disposable Convex copy, only for a named synthetic fixture. Direct and built-HTTP calls must fail, leave the source and its approval rows unchanged, and leave zero deletion events. No fault switch or test registration is shipped. The normal cases execute the same guarded mutation without that fault and require exactly one actor-bound event, the retained source identity/snapshot, server time, retained SQL creation history and no duplication across list/detail/summary/pagination. Repeated deletion cannot add a second event.

The initial aggregate attempt was stopped after a new-reader inference diagnostic. The next attempt passed all 25 runtime cases and eight verification rows but failed the type ratchet because importing the Convex schema into the server reader changed union ordering in a duplicated pre-existing diagnostic. Both attempts are rejected as aggregate passes. The reader now validates its transport response without importing that schema; the focused application and Convex type ratchets pass. The final aggregate and boundary records are retained as `verification.json` and `green-results.json`.

The clone began with a clean `pnpm install --frozen-lockfile`. Final verification uses:

```sh
BETTER_AUTH_SECRET=$(openssl rand -hex 32) NUXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 CONVEX_SITE_URL=http://127.0.0.1:3000 pnpm verify
```

All quality baselines and dependency/skip allowances remain unchanged. The PR body links the exact pushed-head CI run. These records cover synthetic isolated local/CI boundaries; deployed migration, staging/provider operation, browser QA and independent review are separate gates. The PR remains stacked on #55 and is not merged by this correction.
