# Acceptance context: ticket 28, retry 2

- Branch: `qa/28-close-legacy-client-results`, from integration `origin/dev` at `fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3`.
- Candidate: [PR 158](https://github.com/wescodess/cadet2/pull/158), exact head `f5dd47bb9ba660cdbf576e715b3db48f0bdceae5`.
- Plan: `qa/portals-pilot-plan` at `759cd35eccae0a8665718defd79341de70f0ac8c`; rows 112/114/115 and J10 steps 1/3, with the cited spec/decision lines.
- Evidence root: `/Users/wesleyukadike/.orchestrate/evidence/cadet2/28/run-2/`.
- Procedure: independent QA `accept`, black-box, no implementer diff/tests/security harness/legacy-access agent docs read. App source reads were limited to running/building/auth/configuration/bootstrap.

## Isolated runtime

The private repository was reference-cloned into `/tmp/qa-28b`. Both artifacts were
detached worktrees inside that clone. No owner checkout or existing worktree was used.
Each artifact ran `pnpm install --frozen-lockfile`, then a Nuxt production build with
an ephemeral Better Auth secret and its fixed loopback public/auth origin.

Base app/backend/action ports: 4381/4411/4412. Candidate: 4382/4421/4422.
Nuxt 4.3.1, Convex CLI 1.32.0; local backend
`precompiled-2026-11-16-80befbc`. The CLI initialized each local deployment. Its public
local binary then served that deployment with explicit `--convex-origin` and
`--convex-site`, because the real auth bridge's issuer/JWKS belong to the app origin.
The CLI refuses overriding the built-in `CONVEX_SITE_URL` environment variable.
No app auth configuration was edited to manufacture admission.

Each artifact uses its own PGlite database. Installed NuxtHub/Drizzle tooling
initialized generated auth schema and the supplied intake/profile SQL migrations.
The ordinary server has its own local Convex URL/key; no hosted key or service is used.
Operator grants were imported into the local `rag_admins` table through the public
Convex CLI, bound to the actual JWT subject and signup session identity.
The preserved `/api/admin/access` control admitted a real base session with the
stored grant before acceptance began.

Each UI journey has its own synthetic account per viewport. Signup uses the public
visible form, a checked visible Sign In/Sign Up heading transition, and genuine
session/JWT endpoints. Passwords, cookies, JWTs, operator keys and raw database
snapshots are scratch data confined to the clone; evidence retains sanitized
observations and table digests. No email/provider service or production data is used.

The public base recommendation functions created 11 completed-but-unsigned run
records, each with a distinctive `QA28_PRIVATE_UNSIGNED_` rationale. The base's own
Client query returned that marker before acceptance. Public Convex export/import
retained these actual synthetic legacy records for the candidate, remapping only
isolated account identities. No seed route, backend stub or test-mode flag was added
to the candidate. Each Client bookmark uses its own retained run ID.

## Proof boundaries

UI actions use accessible names/roles/labels and visible waits, with no fixed sleeps,
forced actions, CSS/test-ID/XPath fallback, injected script or hidden API mutation.
HTTP/direct-Convex probes and operator setup are recorded separately from journeys.
Snapshots bracket each batch: actual Convex export digests and quiescent copies of
the local SQL store, opened separately for canonical per-table digests. Auth changes
from intentional sign-ins are distinguished from domain writes. Table digests prove
retained row equality; they do not independently instrument physical database reads
or external provider billing.

Failure evidence and one passing trace/video per journey are retained. Compact
results and screenshots remain for both matrix cells. No automatic retry is enabled.
Setup errors are kept in `setup/` and do not count as base reds. Prior partial runs
are retained unchanged and indexed with their digests as supporting evidence.

This is local acceptance. Managed Canadian staging/provider/device/owner approvals,
the whole-pilot matrix/NFRs and fresh release sign-off are not supplied by this run.
Current-session revocation after sign-out belongs to #53. Admin/RAG/YouTube
containment belongs to #74/PR 159. Complete built import/provenance/one-claim guards
belong to #75; black-box closure does not prove deployed code absence.
