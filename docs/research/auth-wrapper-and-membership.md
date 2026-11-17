Better Auth can remain the identity system for the pilot: SQL-backed auth with its organization plugin or application-owned Practice membership tables is feasible, and Convex-hosted auth is a separate migration option. However, the current SQL-backed use of `@convex-dev/better-auth` is **not compatible enough to keep unchanged**: an isolated reproduction of the pinned versions shows `/get-session` disabling renewal and leaving session deletion as a no-op, so sign-out succeeds while a retained cookie can still mint tokens. Keeping the alpha Nuxt wrapper therefore still requires replacing or correcting that bridge; alternatives are a coordinated upgrade to the maintained Nuxt module or direct Better Auth/Nitro integration, using Better Auth's JWT plugin with Convex's custom-JWT interface when auth stays in SQL. None supplies Case authorization automatically: #33 must select authoritative stores, and #34 must enforce current Practice membership, Case consent and signer verification in every actual data function, including privileged server paths. These are researched alternatives, not an auth rewrite decision or pilot-readiness approval. Sources: [baseline][B1], [bridge source][P1], [native JWT source][P4], [custom JWT contract][D1], [organization source][P5], [#33][I33], [#34][I34]; read/tested **2026-11-17**, with proof limits below.

## Alternatives and decision implications

The rows below are architectural inferences from the cited contracts. Auth storage, Nuxt integration and membership storage are separate choices; retaining one package does not require retaining all the others. Every source in this document was read on **2026-11-17**; source versions and observation limits are recorded below.

| Alternative | Evidence and feasible behavior | Unknowns / blockers | Consequence for #33 and #34 |
| --- | --- | --- | --- |
| A. Keep the entire pinned stack unchanged | Installs and prepares; SQL signup and RS256 token/JWKS work in isolation. [B1][B2][P1] | **Session lifecycle fails** in the SQL fixture after a session read; verification/reset delivery is unconfigured; public data functions lack required authorization. Old component receives no upstream fixes. This is a baseline, not a viable unchanged pilot choice. [B3][B4][P1][U4] | #34 cannot equate successful login with safe identity lifecycle or backend isolation. #28 containment remains independent. [I34][I29] |
| B. Keep the alpha Nuxt auth wrapper and SQL store, replace the component-oriented token bridge | Wrapper delegates to Better Auth and Drizzle; upstream `jwt()` can issue RS256, explicit issuer/audience and minimal payload for Convex `customJwt`. Isolated SQL control restores session renewal/deletion. `nuxt-convex` can be retained independently. [P2][P4][D1][P3] | Own and test token wiring, refresh, logout, SSR, key rotation and version maintenance. Correcting the component plugin instead would mean maintaining a deviation from its Convex-context assumptions; that correction was **not implemented or verified**. [P1][P2] | #33 may retain SQL identities without moving account IDs. #34 still chooses organization plugin versus own membership and makes Convex consult current authority. |
| C. Upgrade to maintained `@nuxtjs/better-auth`, retain SQL identity storage and use the standard JWT bridge | Upstream successor is `0.3.17`, declares Nuxt `>=4.0.0`, Better Auth `>=1.7.3 <2`, and NuxtHub `>=0.10.5`; latest Better Auth observed is `1.7.25`. Official schema tooling now uses version-aligned `auth`. [U1][U2] | Package rename, config imports, generator, runtime/session APIs and schemas need migration tests. Nuxt 4.3.1 meets declared Nuxt compatibility, but the exact application upgrade is **unrun**. Simply upgrading the Convex plugin while leaving it on Drizzle is not established as supported: current source also tests the Convex mutation-context marker and no-ops writes when absent. [U1][U2][U5] | #33 can keep SQL; #34 must specify the new bridge contract rather than infer that current package peer ranges validate this topology. |
| D. Replace Nuxt auth wrapper with direct Better Auth + Nitro, keep SQL | Better Auth documents a Nitro catch-all handler, Vue client, server `getSession(headers)` guard and SSR cookie forwarding. JWT/JWKS are native Better Auth features. Removing `nuxt-convex` is an independent option using the Convex JS client. [D2][P4][D1][P7] | Application owns adapter/schema migrations, session composable/hydration, route integration and client auth lifecycle previously supplied by wrappers. Current docs describe current Better Auth; do not copy newer session APIs into 1.4.9 without checking source. Full integration is **unrun**. [D2][P2][P4] | No identity-store move is intrinsically required. #34 can preserve the same authorization design across wrappers. |
| E. Move Better Auth into Convex, use its component adapter | This is the documented component topology. Organization tables require **Local Install**, generated schema and component registration; organization is neither in the built-in supported-schema list nor explicitly incompatible. Component helpers can check live sessions/users. [U3][U6][P8] | This repo has no Better Auth component registration. SQL users/accounts/sessions/JWKS and SQL foreign keys need an explicit migration/ID strategy; Local Install is not a SQL-import tool. Nuxt is absent from the component's current framework-guide list, so Nuxt proxy/SSR integration still needs proof. No migration or deployment was run. [B2][B5][U3][U6] | Coupled to #33; do not choose a store migration merely to obtain membership. #34 still guards parent-app functions and Case resources; component isolation does not authorize an exposed application wrapper. [U3] |

## Scope, baseline and support status

This resolves [research #32][I32], using [map #29 Destination/Notes][I29] and the settled “Destination (settled 2026-11-16, Q-20261116-1)” in `/Users/wesleyukadike/.orchestrate/wiki/runs/cadet2-2026-11-16.md` (read 2026-11-17). The free Client portal, manually verified Representative as sole signer, Staff preparation, per-Case revocable consent, Practice retention of Signed plans/audit, Canadian client-data environments, synthetic staging pilot and separate UI approval gate remain fixed. Research does not reopen them. [I29]

The inspected checkout was `dev` baseline `fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3`. `package.json` ranges are not the installed-version authority; `pnpm-lock.yaml` resolves the following. [B1]

| Package | Resolved baseline | Relevant verified constraint |
| --- | --- | --- |
| `nuxt` / `vue` | `4.3.1` / `3.5.28` | Alpha auth module declares Nuxt `>=4.0.0`. [B1][P2] |
| `@onmax/nuxt-better-auth` | `0.0.2-alpha.29` | Better Auth peer `>=1.0.0`, optional NuxtHub peer `>=0.10.5`; generates schema with `@better-auth/cli`. [P2] |
| `better-auth` / `@better-auth/core` | `1.4.9` / `1.4.9` | App runtime pins; generator has a **separate** transitive `1.5.0-beta.13` Better Auth/core graph. Preparation passed, but this is not evidence that every plugin schema matches the runtime. [B1][P2] |
| `@better-auth/utils` / `better-call` | `0.3.0` / `1.1.7` | Explicit root pins; upgrading only `better-auth` does not update all these roots. [B1] |
| `@convex-dev/better-auth` | `0.10.11` | Better Auth `>=1.4.9 <1.5.0`, Convex `^1.25.0`; root 1.4.9/Convex 1.32.0 satisfy these peers, **not** proof of SQL-adapter compatibility. [P1] |
| `convex` / `nuxt-convex` / `@convex-vue/core` | `1.32.0` / `0.0.6` / `0.0.4` | Nuxt module peers are Convex `>=1.0.0`, Vue integration `>=0.0.4`. [B1][P3] |
| `@nuxthub/core` / `drizzle-orm` / PGlite | `0.10.6` / `0.45.1` / `0.3.15` | App config selects Postgres dialect with local PGlite; wrapper creates the Drizzle auth adapter. This is not Convex-as-auth-database. [B1][B2][P2] |

Current upstream observations are a **candidate version set, not an installation result**: Nuxt auth successor `0.3.17`, Better Auth `1.7.25`, Convex adapter `0.13.0` (Better Auth `>=1.7.16 <1.8.0`). Their Better Auth peer ranges intersect at 1.7.25. The wrapper declares Nuxt `>=4.0.0` despite using newer kit dependencies; declared compatibility is not an app build result. Sources: versioned package manifests [U1][U5] and the [0.3.17 release][U7], read 2026-11-17; npm registry versions were also queried with `pnpm view` on that date.

Only the latest Better Auth and component versions receive upstream support/fixes under their published policies. The component's security page identifies advisories fixed in 0.12.6/0.12.7 and the upgrade guide warns about older versions. The baseline does not enable two-factor or cross-domain plugins and does not use component route registration, so the advisories' exploit applicability must be checked against the chosen topology; this research does **not** claim every advisory applies or that any candidate is audit-clean. [U4][U8][B2]

## Sessions, verification and recovery

1. **Nuxt authenticates a session, not a Practice.** The wrapper mounts Better Auth's handler and calls `auth.api.getSession` with incoming headers; `requireUserSession` rejects missing sessions and can apply an explicit rule. Cadet2's `requireWorkspaceUserSession` only extracts a nonempty `session.user.id`. Page middleware redirects but does not constrain direct API/Convex calls. [P2][B3][B4]
2. **Defaults must not be mistaken for a proven lifecycle.** Better Auth 1.4.9 source defaults to seven-day sessions, one-day renewal interval and one-day freshness. The pinned Convex plugin disables refresh on `/get-session` when `adapter.options.isRunMutationCtx` is absent and overwrites `internalAdapter.deleteSession`; that marker is not supplied by the standard Drizzle adapter. The SQL experiment below reproduces both suppressed renewal and retained server session after logout. The Nuxt wrapper caches its Better Auth instance, making the shared-instance seam relevant to this application; exact browser/Nitro end-to-end reproduction remains unrun. [P1][P2][P6][P9]
3. **Verified email is supported but not configured.** `emailAndPassword.requireEmailVerification: true`, an `emailVerification.sendVerificationEmail` callback and the sending/redirect policy are needed. In 1.4.9 signup then withholds automatic session creation and password signin rejects unverified users. Cadet2 only enables email/password and offers signin/signup UI; it has no configured verification sender or recovery UI. Email verification proves mailbox control, not a licence or signing authority. [P6][B2][B6][I29]
4. **Reset is a configured flow, not automatically usable.** In 1.4.9 `emailAndPassword.sendResetPassword` is required, `requestPasswordReset` creates a verification record (one-hour default), and `resetPassword` checks expiry and deletes the consumed record. Existing sessions are deleted only if `revokeSessionsOnPasswordReset` is enabled; cookie/cache and bridge behavior still require integration proof. Production callback URLs/trusted origins and provider delivery are dependencies of #39/#45/#46, not facts established by a successful schema generation. [P6][I39][I45][I46]
5. **Session invalidation and token invalidation are distinct.** Even a correct SQL sign-out cannot erase an already issued JWT signature. For immediate suspension/removal, authorize against current server-side status rather than relying on JWT lifetime or a client clearing local state. A policy for live subscriptions, reconnects and cached projections is still required. In the documented Convex-auth-store topology, `safeGetAuthUser` checks the stored session's existence/expiry; that helper cannot check this repo's SQL session through a nonexistent component. [P8][P1][D1][B2]

## Convex identity, server calls and privileged bypass

The current plugin combines JWT/Bearer/OIDC-related behavior but the app actually configures a **custom JWT** provider: RS256, audience/application ID `convex`, issuer and JWKS URL. The signed subject is Better Auth `user.id`; the default additional payload copies user fields except `id`/`image`, adds `sessionId` and `iat`, and expires after 900 seconds. It does **not** copy session `activeOrganizationId`, member role, per-Case consent or licence verification. Do not place client profile/intake data into tokens; a replacement can use a smaller identity-only payload. [B2][P1][P4]

There is an issuer-configuration seam: `convex/auth.config.ts` falls back to `http://localhost:3000`, but the plugin's signer directly interpolates `process.env.CONVEX_SITE_URL` without that fallback. For SQL-hosted auth, both runtimes must agree on the actual auth issuer and reachable JWKS URL, not merely on the application or Convex data URL. A missing/mismatched variable is not proven repaired by the fallback in the verifier. Convex requires exact issuer/audience agreement and public verification keys with a supported algorithm. Actual staging values/reachability are **[unverified]**. [B2][P1][D1]

The browser bridge reads `vueApp._context.provides`, attaches `setAuth`, returns null on token-fetch errors and clears underlying auth on logout. This depends on Vue internals. Also, `nuxt-convex@0.0.6`'s SSR query path calls `fetchQuery(..., { url })` without a token, while its client plugin installs a separate Vue client. Authenticated SSR must therefore use a request-scoped server path with a token or explicitly defer protected subscriptions until client authentication; page redirects cannot make the default SSR query authenticated. Its query cache key includes query/args, not identity, so user/Practice switching and stale payload handling require tests. [B2][P3]

| Call path | What is established | Required authorization boundary |
| --- | --- | --- |
| Browser → public Convex function | Convex exposes validated JWT identity through `ctx.auth.getUserIdentity()`; unauthenticated identity is null. [D3] | Each function checks identity and current resource authority. Derive actor identity from auth, never caller `userId`; derive/check Practice/Case from stored relationships. [I34][B4] |
| Nitro → Convex with user JWT | `createConvexUserHttpClientForEvent` forwards session cookies to token issuance and invokes `ConvexHttpClient.setAuth(token)`. This preserves the ordinary token authentication boundary, subject to issuer/session correctness. [B3][P7] | Public functions must still enforce membership/consent/signing. Authenticate and authorize SQL access too. Do not share a mutable authenticated HTTP client between requests. [I34][D3] |
| Nitro → Convex admin key | `setAdminAuth` can invoke internal functions and optionally supply an arbitrary acting-as identity. Existing helper accepts deployment/admin keys; many workspace/recommendation services use it. [B3][P7] | It bypasses token minting/verification and the public-vs-internal invocation restriction. It does **not** remove checks written inside a handler, but the server can fabricate the checked identity. Internal service calls need a constrained actor/resource/authority contract and an audit trail; changing `query` to `internalQuery` alone does not constrain an overpowered server caller. [P7][I34] |

The baseline `recommendationRuns.ts` public exports trust supplied `userId` and contain no `ctx.auth` checks; `listForAdmin` explicitly admits its absence of Convex authorization. Existing `ragSources.ts` shows an identity/admin lookup pattern, but its user-or-email admin matching is not a Practice permission system. SQL intake/profile rows are keyed to the Client user, not Practice/Case. Neither wrapper replacement nor an organization plugin retrofits these boundaries. Immediate containment belongs to #28; the permission contract belongs to #34. [B4][B5][B7][I29][I34]

## Organization plugin versus application-owned membership

| Question | Better Auth organization plugin | Own application tables |
| --- | --- | --- |
| Storage and identifiers | Adds organization/member/invitation tables and active-organization session field; optional teams add more schema. SQL wrapper can generate plugin schemas, which still need reviewed DB migrations. Convex component requires Local Install rather than assuming the packaged default schema has these tables. [P5][P2][U3][U6] | Application defines stable Practice, principal, membership, invitation and audit identifiers in #33's chosen store. This is an architectural option, **not an existing capability**: baseline has none of these portal tables. [B5][I33] |
| Multi-Practice and switching | Membership relates user to organization; list/set-active APIs exist, and set-active checks membership. Active organization is session navigation state, not sufficient authority over an arbitrary Case. Default JWT does not include it. [P5][P1] | Application controls per-tab selection and memberships; must build membership checks, switch behavior and cache invalidation. Inference from the absent portal schema and #34 requirements. [B5][I34] |
| Roles and permissions | Defaults are owner/admin/member. Custom access-control statements/roles and server permission checks are supported. Defaults cover organization/member/invitation/team administration, not Case access or signing. A Practice owner/admin must not automatically become a verified Representative. [P5][I29] | Application owns role grants, permission checks, last-owner rules, suspension, role changes and auditing. Work is explicit; no upstream invitation/administration behavior is inherited. [I34] |
| Invitations | Pinned source checks session, matching email, pending status and expiry; acceptance marks accepted and creates membership. Default expiry is 48 hours. **Verified-email enforcement defaults false** and must be enabled with `requireEmailVerificationOnInvitation`. Sending requires `sendInvitationEmail`. Sequential replay is rejected; concurrent acceptance/transaction rollback is **not proven** by this source read or the memory-adapter probe. [P5] | Must implement high-entropy/unguessable or signed credentials, recipient/actor binding, expiry/cancel/replay rules, atomic acceptance, permission recheck and idempotent delivery. These are proposed requirements for #34, not an implemented package claim. [I34] |
| Client ↔ Representative connection | A member invitation admits someone to an organization; it does not express per-Case revocable Client consent. Treat Client-to-Case access/connection as a separate domain relationship unless #34 proves a more precise mapping. [P5][I29][I34] | Can model Case connection separately from workforce membership; must preserve Client-owned profiles and post-revocation retention rules. [I29][I34] |
| Signer verification | Custom role names/hooks can constrain membership operations, but there is no CICC/law-society verification or Signed plan contract in the plugin. Admin verification and a current signer-status check remain application policy. [P5][I29] | Same policy responsibility; technical choice does not reopen the settled sole-signer rule. [I29] |

**When auth/membership and portal data are split:** Neither the SQL organization plugin nor its lifecycle hooks provide a transaction spanning SQL and Convex. A signed claim is a snapshot, and an asynchronous membership mirror can lag removal or consent revocation. #33/#34 must choose a concrete model: keep protected work behind an authority-checking server with narrowly scoped internal operations; make current authorization records available in the data-function store with a specified revocation/reconciliation barrier; or co-locate the relevant authority and data. For live Convex queries, specify how revocation changes the documents they depend on so active subscriptions stop disclosing data. Fail closed during unavailable/stale authority; merely adding `practiceId` to args or JWTs does not establish that property. This is architectural inference from the two-store baseline, token payload, component boundaries and #34's denial requirements. [B2][B5][P1][U3][I33][I34]

## Upgrade and migration constraints

- **Keep identity versus move identity:** Retaining SQL and the existing user IDs avoids an intrinsic profile-FK/Convex-owner-ID rewrite, although schema/plugin changes still need migrations. A Convex auth-store move must explicitly map users, credential accounts/password hashes, sessions, verification records and signing keys, update SQL references and Convex `userId` strings, and define forced reauthentication/rollback. No verified turnkey importer for this exact split was found in the inspected Local Install/upgrade guides: **[unverified]**. Do not infer that resetting synthetic pilot identities is acceptable for any existing account that must be retained; inventory first. [B5][U3][U6][I33]
- **Upgrade packages as a set:** `@convex-dev/better-auth@0.10.11` cannot remain with Better Auth 1.7 under its declared peers. Current documented upgrade is directly from 0.10 to 0.13/Better Auth 1.7.16+; align root Better Auth/core and review utilities/better-call constraints, rather than leave old roots beside newer runtime internals. The Nuxt successor additionally needs the `auth` CLI aligned to the runtime version for schema generation. [P1][U1][U2][U6]
- **Review breaking changes before applying migrations:** Current component guide calls out endpoint API-key renames (`getToken` → `getConvexToken`, etc.; HTTP paths stay unchanged), OIDC-provider changes, index/sorting restrictions, schema regeneration and new adapter exports. Existing Local Install teams need a two-deployment field backfill; this is conditional migration guidance, not evidence that this baseline already has teams. Pin candidate releases and review applicable Better Auth 1.5/1.6/1.7 changes. [U6][U5][B5]
- **Secrets and keys are separate assets:** Preserve or deliberately rotate session-signing secrets and JWT/JWKS keys, with an explicit existing-session/token policy. A new issuer or remapped subject must also preserve or migrate stored identity references. Fixed origins, verified reset/verification redirects and JWKS reachability belong in the Canadian staging topology chosen by #45 with accounts supplied through #46. No external accounts, deployment secrets or deployment were created here. [P1][P2][D1][I45][I46]

## Compatibility evidence and testable exit conditions

All experiments ran locally on **2026-11-17**, Node `v24.20.0`, pnpm `9.12.3`, using the frozen baseline lockfile. Test accounts existed only in in-memory PGlite or Better Auth's in-memory adapter, with `example.invalid` addresses and callbacks that made no external requests.

| Evidence | Result and exact limit |
| --- | --- |
| `pnpm install --frozen-lockfile`, including `nuxt prepare` | **Passed.** Generated auth schema and Nuxt types. Warnings included missing Convex URL, duplicate UI components/imports. No application build, typecheck, deployed auth or authorization suite was run. `git status` showed no tracked changes after preparation. [B1][B2] |
| SQL JWT probe: `/tmp/cadet2-auth-sql-probe.mjs` | **Token compatibility passed; session lifecycle failed.** Better Auth 1.4.9 + Drizzle 0.45.1 + PGlite 0.3.15 + component plugin 0.10.11, using generated schema and committed migration `0000`: unverified signup succeeds; JWT signature verifies with public JWKS, `sub=user.id`, `iss` matches configured synthetic origin, `aud=convex`, RS256, 900-second TTL, sessionId present, no active org. After making renewal due, `/get-session` leaves expiry unchanged. After `/get-session` then `/sign-out` (200), SQL still has one session and replaying the retained cookie to `/convex/token` returns 200. This is an isolated package integration result, not a deployed exploit test. [P1][P4][P6][P9] |
| Fresh-instance SQL control: `/tmp/cadet2-auth-sql-control.mjs` | **Passed control expectation:** omit `/get-session`, then sign-out deletes the session and retained-cookie token issuance returns 401. Distinguishes the session-read hook from normal token expiry. [P1][P9] |
| SQL standard-JWT control: `/tmp/cadet2-auth-sql-native-jwt.mjs` | **Passed:** same baseline SQL adapter, replace only component plugin with Better Auth `jwt()` configured RS256/issuer/audience/900s and `sessionId` payload. Session-read renews an aged session; sign-out deletes it; retained-cookie mint is 401. This proves only isolated package behavior, not Nuxt/Convex deployment or revocation of an existing JWT. [P4][P6] |
| Organization probe: `/tmp/cadet2-auth-org-probe.mjs` | **Passed isolated plugin behavior:** create organization/invitation; send callback called; wrong-account 403; unverified recipient 403 with opt-in verification; verified recipient 200; sequential replay 400; expired invite 400. Uses Better Auth's memory adapter, **not SQL or Convex**; no concurrent acceptance or cross-store consistency test. [P5] |
| Missing reset callback | **Rejected as expected (400)** in SQL probes, with Better Auth's “reset password isn't enabled” diagnostic. Email delivery and successful verification/reset flow remain **unrun**. [P6] |
| Deployed Convex identity validation, SSR/hydration, browser refresh/logout, current-version upgrade, migration, Canadian staging and email delivery | **Unrun / [unverified].** No configured Convex URL, account provisioning, deployment or paid API call was used. No claim of multi-tenant CI or staging readiness. |

The embedded three-case reproducer also completed: component/no session read → zero sessions and mint 401; component/with session read → one session and mint 200; standard JWT/with session read → zero sessions and mint 401. This isolates the failing seam using the exact commands published here.

Initial probe harness attempts used the wrong memory-adapter export name and compared a timestamp against a timezone-converted SQL value; both were corrected before the results above. An initial assertion that logout should prevent minting failed and led to the source inspection and fresh-instance control; the observed session-lifecycle failure is retained, not relabelled as a passing security check.

The decision's future acceptance evidence should cover these seams; these are **proposed tests, not checks run here**. [I34][I29]

1. **Auth lifecycle:** verified/unverified signin, resend limits, valid/expired/replayed reset and verification links, wrong callback origins, renewal, logout and session revocation across tabs; minting with retained cookies; old JWT behavior and key rotation.
2. **Transport:** anonymous/invalid/expired/wrong-issuer/wrong-audience token denials; subject mapping; request-scoped server calls; authenticated SSR/client hydration; force-refresh, reconnect and account/Practice switching without stale results.
3. **Practice/Case isolation at actual backends:** Practice A/B, Representative/Staff/Client/admin, Client with separate Cases, caller-forged user/Practice/Case IDs, removed/suspended membership, revoked consent, unsigned output, signer verification removal, live subscriptions and cached projections. Exercise direct Convex calls and SQL APIs, not just page routes.
4. **Privileged boundaries:** normal user cannot invoke internal functions; privileged server with wrong actor/resource cannot cross Case authority; audit actor differs explicitly from service identity; exported projections recheck authority and fields.
5. **Invitations and split-store failure:** wrong account, unverified email, expiry/cancel/replay, concurrent acceptance, role changes during acceptance, retries and email duplication; membership mirror lag, lost update, worker outage and revocation races fail closed.
6. **Migration:** preserved IDs/password login or deliberate reauth; session/key invalidation; regenerated schema versus committed migrations; synthetic old-data upgrade and rollback. Keep positive controls alongside deliberate-red cross-tenant tests.

## Handoff, unknowns and owner blockers

| Ticket / responsibility | What this research supplies | Still to resolve |
| --- | --- | --- |
| [#33: system of record][I33] | SQL auth can stay; organization does not require Convex auth. Moving auth is a distinct data/ID migration. | Authoritative identity/membership/Case/consent stores, projection freshness and transaction/reconciliation contracts. Technical decision for the Architect. |
| [#34: tenancy and authorization][I34] | Alternatives, pinned SQL lifecycle failure, identity payload, organization limits, privileged bypass and test seams. | Choose supported package/bridge set and membership model; permission matrix, multi-Practice switching, invitations, removal/suspension and Case-scoped internal-call contract. These are technical decisions, not new owner questions. |
| [#36: consent][I36], [#37: verification/signing][I37], [#38: lifecycle][I38] | Membership/verified email do not grant Client data consent or licence/signing authority. [P5][I29] | Current consent and signer-status checks, retention projections and transitions must remain distinct from authentication. |
| [#39: email][I39], [#45: staging topology][I45], [#46: owner accounts][I46] | Required callback hooks, fixed issuer/origins and public JWKS endpoint. | Provider/Canadian placement facts belong to provider research; actual staging origin, keys and delivery remain **[unverified]** until the already-tracked provisioning step. Owner creates accounts/supplies secrets as settled; this research requests no account or spending decision. |
| [#50: pilot evidence][I50] and #28 containment | Clear passed/failed/unrun boundaries and highest authorization seams. | Reproduce chosen integration in CI/staging, resolve applicable advisories and prove fail-closed data authorization. Closing #32 is a research resolution, not resolution of those gates. [I29] |

**No new owner-only blocker was found.** The unresolved auth/membership choice belongs to #34 after #33, and the staging account/access facts already belong to #46. Exact deployed identity/session inventory, current-version end-to-end compatibility, migration behavior, concurrent invitation safety, immediate cross-store revocation and email delivery remain unknown/unrun as listed above; they require technical verification or the existing provisioning workflow, not reopening the settled destination. [I29][I33][I34][I46]

## Reproducing the SQL logout seam

Run from this branch's repository root after `pnpm install --frozen-lockfile`. This uses generated schema and a fresh in-memory PGlite database for each case, never the application's persistent database. The retained cookie models replay after logout; the normal browser receives cookie deletion. The output must distinguish the package failure from the controls. Read/tested 2026-11-17; underlying sources [P1][P4][P9].

```sh
node --input-type=module <<'JS'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { jwt } from 'better-auth/plugins'
import { convex } from '@convex-dev/better-auth/plugins'
import { getAuthConfigProvider } from '@convex-dev/better-auth/auth-config'
import * as schema from './.nuxt/better-auth/schema.postgresql.mjs'

const origin = 'http://localhost:3219'
process.env.CONVEX_SITE_URL = origin
for (const mode of ['convex/no-read', 'convex/read', 'jwt/read']) {
  const db = new PGlite()
  try {
    await db.exec(await readFile(
      'server/db/migrations/postgresql/0000_bouncy_mother_askani.sql', 'utf8'))
    const native = mode.startsWith('jwt/')
    const auth = betterAuth({
      baseURL: origin,
      secret: 'synthetic-research-only-secret-at-least-32-characters',
      database: drizzleAdapter(drizzle(db), { provider: 'pg', schema }),
      emailAndPassword: { enabled: true },
      plugins: [native ? jwt({
        jwt: { issuer: origin, audience: 'convex', expirationTime: '900s' },
        jwks: { keyPairConfig: { alg: 'RS256' } },
      }) : convex({ authConfig: { providers: [getAuthConfigProvider()] } })],
    })
    const call = (path, body, cookie) => auth.handler(new Request(
      origin + '/api/auth' + path, {
        method: body ? 'POST' : 'GET',
        headers: { origin, 'content-type': 'application/json',
          ...(cookie ? { cookie } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }))
    const signup = await call('/sign-up/email', {
      name: 'Synthetic', email: 'synthetic@example.invalid',
      password: 'synthetic-password-123',
    })
    assert.equal(signup.status, 200)
    const cookie = signup.headers.getSetCookie()
      .map(value => value.split(';')[0]).join('; ')
    if (mode.endsWith('/read'))
      assert.equal((await call('/get-session', undefined, cookie)).status, 200)
    assert.equal((await call('/sign-out', {}, cookie)).status, 200)
    const { rows: [row] } = await db.query('SELECT count(*)::int AS n FROM session')
    const mint = await call(native ? '/token' : '/convex/token', undefined, cookie)
    const failure = mode === 'convex/read'
    assert.equal(row.n, failure ? 1 : 0)
    assert.equal(mint.status, failure ? 200 : 401)
    console.log(mode, { remainingSessions: row.n, mintStatus: mint.status })
  } finally {
    await db.close()
  }
}
JS
```

## Primary-source ledger

**All entries read 2026-11-17.** Baseline URLs pin `fe2b4a4`; upstream installed sources pin npm `gitHead`/release commits where available. Local installed files were read after the frozen install. Skills were orientation only, not evidence of package behavior.

| ID | Primary evidence |
| --- | --- |
| B1 | [package.json][B1]; [pnpm-lock.yaml](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/pnpm-lock.yaml), importers/packages/snapshots. |
| B2 | [Nuxt config][B2]; [server auth config](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/auth.config.ts); [Convex verifier config](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/convex/auth.config.ts); [browser bridge](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/app/plugins/convex-auth.client.ts); [client config](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/app/auth.config.ts). |
| B3 | [server Convex clients][B3]; [workspace session guard](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/auth/requireUserSession.ts); [admin guard](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/auth/requireAdminSession.ts). |
| B4 | [recommendation functions][B4] (exports from line 888, admin query around 1369); [page middleware](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/app/middleware/auth.ts). |
| B5 | [SQL migrations directory][B5], especially 0000/0001/0002; [Convex schema](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/convex/schema.ts); [Convex directory](https://github.com/wescodess/cadet2/tree/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/convex), with no auth component configuration. |
| B6 | [auth page][B6]. |
| B7 | [RAG identity/admin checks][B7]; [intake submission](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/api/intake/submit.post.ts); [workspace summary](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/workspace/buildWorkspaceSummary.ts). |
| P1 | Installed `node_modules/@convex-dev/better-auth/{package.json,src/plugins/convex/index.ts,src/auth-config.ts}`; [0.10.11 plugin source][P1] at npm gitHead `cd852da1b03e220f37433b081c6b0a32b55a6db6`; [manifest](https://github.com/get-convex/better-auth/blob/cd852da1b03e220f37433b081c6b0a32b55a6db6/package.json). |
| P2 | Installed `node_modules/@onmax/nuxt-better-auth/dist/{module.mjs,runtime/server/utils/auth.js,runtime/server/utils/session.js,runtime/server/api/auth/[...all].js}` and package.json; [module at npm gitHead][P2] `05360ae6953467e487637ad91e133ea0804a36de`; [runtime auth source](https://github.com/nuxt-modules/better-auth/blob/05360ae6953467e487637ad91e133ea0804a36de/src/runtime/server/utils/auth.ts). |
| P3 | Installed `node_modules/nuxt-convex/dist/runtime/{plugin.client.js,composables/useConvexQuery.js}`; [0.0.6 source][P3] at release commit `dcd9f3e54de7d7aa47c082ee10fde65023c2a6be`; installed `.pnpm/@convex-vue+core@0.0.4*/node_modules/@convex-vue/core/dist/convex-vue.js`. |
| P4 | Installed `node_modules/better-auth/dist/plugins/jwt/{index.mjs,sign.mjs}`; [Better Auth 1.4.9 JWT source][P4] at release commit `35fcd1aa89b6e9978d7b34ec971066d6a8f1e4e3`. |
| P5 | Installed `node_modules/better-auth/dist/plugins/organization/{types.d.mts,organization.mjs,access/statement.mjs,routes/crud-invites.mjs,routes/crud-org.mjs}`; [1.4.9 organization source directory][P5], especially invitation acceptance, set-active and default statements. |
| P6 | Installed `node_modules/better-auth/dist/{context/create-context.mjs,api/routes/sign-up.mjs,api/routes/sign-in.mjs,api/routes/session.mjs,api/routes/email-verification.mjs,api/routes/reset-password.mjs}`; [1.4.9 API route sources][P6]; [context defaults](https://github.com/better-auth/better-auth/blob/35fcd1aa89b6e9978d7b34ec971066d6a8f1e4e3/packages/better-auth/src/context/create-context.ts). |
| P7 | Installed `node_modules/convex/src/browser/http_client.ts`, `setAuth`/`setAdminAuth` and request Authorization headers; [1.32.0 published source archive][P7]. |
| P8 | Installed `node_modules/@convex-dev/better-auth/src/client/create-client.ts`, `safeGetAuthUser`; [pinned source][P8]. |
| P9 | Installed `node_modules/better-auth/dist/api/routes/sign-out.mjs` and `dist/adapters/drizzle-adapter/drizzle-adapter.mjs`; [1.4.9 sign-out][P9]; [Drizzle adapter source](https://github.com/better-auth/better-auth/blob/35fcd1aa89b6e9978d7b34ec971066d6a8f1e4e3/packages/better-auth/src/adapters/drizzle-adapter/drizzle-adapter.ts). |
| U1 | [Nuxt successor 0.3.17 manifest][U1]; [declared Nuxt compatibility](https://github.com/nuxt-modules/better-auth/blob/b9d5bd5bcb82e5ab701288fb83ad14d845e0f30a/src/module.ts#L95). |
| U2 | [0.3.17 schema-generation guide][U2]; [installation guide](https://github.com/nuxt-modules/better-auth/blob/b9d5bd5bcb82e5ab701288fb83ad14d845e0f30a/docs/content/1.getting-started/1.installation.md). |
| U3 | [0.13.0 Local Install guide][U3], including component isolation and application-wrapper authorization. |
| U4 | [0.13.0 component security policy/advisories][U4]. |
| U5 | [0.13.0 manifest][U5]; [plugin source](https://github.com/get-convex/better-auth/blob/21561460be68cb1c7b88df757366983336ca887b/src/plugins/convex/index.ts); [changelog](https://github.com/get-convex/better-auth/blob/21561460be68cb1c7b88df757366983336ca887b/CHANGELOG.md). |
| U6 | [0.13.0 supported-plugin list][U6]; [upgrade from 0.10](https://github.com/get-convex/better-auth/blob/21561460be68cb1c7b88df757366983336ca887b/docs/content/docs/upgrading/from-0-10.mdx); [upgrade snippets](https://github.com/get-convex/better-auth/tree/21561460be68cb1c7b88df757366983336ca887b/docs/content/snippets/upgrading); [framework guides](https://github.com/get-convex/better-auth/tree/21561460be68cb1c7b88df757366983336ca887b/docs/content/docs/framework-guides). |
| U7 | [Nuxt auth 0.3.17 release][U7], published 2026-11-15. |
| U8 | [Better Auth support policy][U8], live source read 2026-11-17. |
| D1 | [Convex custom JWT contract][D1], live official docs; verified identity requirements, not Nuxt deployment evidence. |
| D2 | [Better Auth Nuxt integration][D2], live docs showing version 1.7.25; [JWT documentation](https://better-auth.com/docs/plugins/jwt). |
| D3 | [Convex auth in functions][D3], live official docs. |
| Inputs | [#32][I32], [#29][I29], [#33][I33], [#34][I34] and dependent issue bodies/titles; source-of-truth requirements, not proof of implementation. Feasibility [audit section 4](https://github.com/wescodess/cadet2/blob/5995648771b1017230886a8a0c14670e9f152ec9/docs/feasibility/2026-11-16/opus-codebase-reality-audit.md) was read for starting context, with auth/data claims checked against baseline code. |

[B1]: https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/package.json
[B2]: https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/nuxt.config.ts
[B3]: https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/convex-admin-client.ts
[B4]: https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/convex/recommendationRuns.ts
[B5]: https://github.com/wescodess/cadet2/tree/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/db/migrations/postgresql
[B6]: https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/app/pages/auth.vue
[B7]: https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/convex/ragSources.ts
[P1]: https://github.com/get-convex/better-auth/blob/cd852da1b03e220f37433b081c6b0a32b55a6db6/src/plugins/convex/index.ts
[P2]: https://github.com/nuxt-modules/better-auth/blob/05360ae6953467e487637ad91e133ea0804a36de/src/module.ts
[P3]: https://github.com/onmax/nuxt-convex/blob/dcd9f3e54de7d7aa47c082ee10fde65023c2a6be/src/runtime/composables/useConvexQuery.ts
[P4]: https://github.com/better-auth/better-auth/tree/35fcd1aa89b6e9978d7b34ec971066d6a8f1e4e3/packages/better-auth/src/plugins/jwt
[P5]: https://github.com/better-auth/better-auth/tree/35fcd1aa89b6e9978d7b34ec971066d6a8f1e4e3/packages/better-auth/src/plugins/organization
[P6]: https://github.com/better-auth/better-auth/tree/35fcd1aa89b6e9978d7b34ec971066d6a8f1e4e3/packages/better-auth/src/api/routes
[P7]: https://registry.npmjs.org/convex/-/convex-1.32.0.tgz
[P8]: https://github.com/get-convex/better-auth/blob/cd852da1b03e220f37433b081c6b0a32b55a6db6/src/client/create-client.ts
[P9]: https://github.com/better-auth/better-auth/blob/35fcd1aa89b6e9978d7b34ec971066d6a8f1e4e3/packages/better-auth/src/api/routes/sign-out.ts
[U1]: https://github.com/nuxt-modules/better-auth/blob/b9d5bd5bcb82e5ab701288fb83ad14d845e0f30a/package.json
[U2]: https://github.com/nuxt-modules/better-auth/blob/b9d5bd5bcb82e5ab701288fb83ad14d845e0f30a/docs/content/1.getting-started/5.schema-generation.md
[U3]: https://github.com/get-convex/better-auth/blob/21561460be68cb1c7b88df757366983336ca887b/docs/content/docs/features/local-install.mdx
[U4]: https://github.com/get-convex/better-auth/blob/21561460be68cb1c7b88df757366983336ca887b/docs/content/docs/security.mdx
[U5]: https://github.com/get-convex/better-auth/blob/21561460be68cb1c7b88df757366983336ca887b/package.json
[U6]: https://github.com/get-convex/better-auth/blob/21561460be68cb1c7b88df757366983336ca887b/docs/content/docs/supported-plugins.mdx
[U7]: https://github.com/nuxt-modules/better-auth/releases/tag/v0.3.17
[U8]: https://github.com/better-auth/better-auth/blob/main/SECURITY.md
[D1]: https://docs.convex.dev/auth/advanced/custom-jwt
[D2]: https://better-auth.com/docs/integrations/nuxt
[D3]: https://docs.convex.dev/auth/functions-auth
[I29]: https://github.com/wescodess/cadet2/issues/29
[I32]: https://github.com/wescodess/cadet2/issues/32
[I33]: https://github.com/wescodess/cadet2/issues/33
[I34]: https://github.com/wescodess/cadet2/issues/34
[I36]: https://github.com/wescodess/cadet2/issues/36
[I37]: https://github.com/wescodess/cadet2/issues/37
[I38]: https://github.com/wescodess/cadet2/issues/38
[I39]: https://github.com/wescodess/cadet2/issues/39
[I45]: https://github.com/wescodess/cadet2/issues/45
[I46]: https://github.com/wescodess/cadet2/issues/46
[I50]: https://github.com/wescodess/cadet2/issues/50
