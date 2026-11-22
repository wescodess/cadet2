# cadet2: Codebase Reality Audit (Technical Due Diligence)

- **Date:** 2026-11-16
- **Scope:** branch `t3/project-feasibility-deep-dive` @ `67b5ea3` (63 commits, 2026-02-22 → 2026-03-26, single author)
- **Method:** Static, read-only review of source, tests, CI, and planning/retro artifacts. No dependencies installed (`node_modules` is absent in this worktree), so nothing was executed. Every claim cites `file:line`.
- **Legend:** **[V]** = verified directly in code or artifacts. **[I]** = inference or domain judgment that needs confirmation (immigration-law statements must be validated by a licensed RCIC).

---

## 0. Executive verdict

**Not shippable to real users in its current state. A private beta is reachable, but only after (a) closing a critical data-exposure hole, (b) replacing a placeholder decision model with a real one, and (c) removing trust signals the product currently fabricates.**

What is real is the *workflow shell*: auth, a save-and-resume intake, durable run records, run history, run-to-run diffing, an admin console with an audit trail, and a large RAG ingestion subsystem. What is not real is the *intelligence*:

- The "recommendation engine" is 3 invented pathways checked against 8 hardcoded threshold comparisons. **[V]** `server/utils/pathways/mvpPathwayCatalog.ts:1-5, 54-102`
- Ranking scores come from **alphabetical order of pathway IDs**, not from fit. **[V]** `server/utils/recommendations/rankRecommendationCandidates.ts:84-94, 181-188`
- Users never see a citation, because the data path cannot produce or store one, yet they still see "Confidence high · Freshness fresh". **[V]** `convex/schema.ts:106-155`; `qualifyWeakRecommendationResults.ts:81-87`
- No LLM is called anywhere in the recommendation path. OpenRouter and AI Gateway are configured but never invoked. **[V]**
- All recommendation-run Convex functions are public and take `userId` as an argument with no auth. Anyone holding the (browser-exposed) Convex URL can read every user's results, delete them, or overwrite them. **[V]** `convex/recommendationRuns.ts:887-1453`

Engineering effort went into process, governance, and infrastructure rather than the domain:

| Area | Lines of code | Share of non-UI source |
|---|---|---|
| Decision logic (eligibility, composition, ranking, qualification) | ~914 | ~2.5% |
| Templated explanation and next-step copy | ~1,092 | ~3% |
| RAG and YouTube ingestion / search (not consumed by recommendations) | ~8,546 | ~24% |
| Admin governance over 3 pathways and 8 rules | ~9,534 | ~27% |
| Tests | ~22,023 | (separate) |
| BMAD planning and docs markdown | ~22,916 | (separate) |

Non-UI source totals 35,875 LOC, plus 9,651 LOC of vendored shadcn primitives. **[V]** (`wc -l`)

---

## 1. Feature reality matrix

### 1.1 How a recommendation is actually produced (verified trace)

1. **Submit.** `POST /api/intake/submit` requires 32 fields across 5 sections (`server/api/intake/submit.post.ts:43-87`). It snapshots the draft to Postgres `recommendation_profiles` (`:229-244`) and creates a queued Convex run (`:256-268`). **[V]**
2. **Start.** The client fires `POST /runs/:id/start` and does not await the outcome (`app/pages/workspace/intake.vue:904-913, 1009`). The server runs everything synchronously inside that request: the Convex transition, eligibility, ranking, and the terminal status (`start.post.ts:250-354`). **[V]**
3. **Eligibility.** `normalizeProfile` reads exactly 8 fields: `englishClb`, `yearsSkilledExperience`, `availableSettlementFundsCad`, `hasValidJobOffer`, `openToRelocation`, `willingToStudyOrRetrain`, `budgetCad`, `targetTimelineMonths` (`evaluateDirectAndBlockedPathways.ts:79-94`). Each of 3 pathways is "direct" if all its rules pass and "blocked" otherwise (`:109-129`). **[V]**
4. **Composition.** A hardcoded lookup keyed on unmet-condition IDs builds at most one composed route (`generateComposedPathways.ts:30-84`). It stops after the first one (`:126-128`). **[V]**
5. **Ranking.** Each bucket is sorted by `pathwayId.localeCompare` and scored by position: direct `90 - 3*index`, blocked `58 - 6*unmet - 2*index`, composed `74 - 3*(steps-1) - 2*index` (`rankRecommendationCandidates.ts:84-94, 181-206`). **[V]** As a result, *Provincial Nominee* always outranks *Skilled Worker* when both are direct, purely because "p" sorts before "s".
6. **Qualification.**
   - Every direct candidate scores at least 84 and is therefore always `supported / high / fresh` (`qualifyWeakRecommendationResults.ts:81-87`). **[V]**
   - Whether a blocked candidate is "low-confidence" or "withheld" depends on its alphabetical index (`:105-117`). **[V]**
   - The run is `degraded` whenever any candidate is not "supported" (`:129-160`). Since nearly every realistic profile has at least one blocked pathway, nearly every run is labeled degraded. **[I, from trace]**
7. **Text.** Rationale, fit signals, blockers, tradeoffs, actions, and next steps all come from fixed templates keyed on pathway and condition IDs (`buildRecommendationRationale.ts:95-195, 624-656`; `buildRecommendationNextStepPlan.ts:67-78`). **[V]**
8. **Citations.** None are generated (`generateRankedRecommendations.ts:205-276`). The Convex validators for ranked results have no `citations` field (`convex/schema.ts:106-155`). The reader therefore always gets `[]`, and the trust boundary resolves to `inferred` or `system-generated` (`readRecommendationResultsForUser.ts:241-260, 309-311`; `classifyTrustBoundary.ts:29-31`). **[V]**

### 1.2 Immigration model depth

| Question | Answer |
|---|---|
| Pathways modeled | **3, all invented abstractions**: `mvp-skilled-worker`, `mvp-provincial-nominee`, `mvp-study-to-work` (`mvpPathwayCatalog.ts:1-5`). **[V]** None maps to a real IRCC program or stream (no FSWP/CEC/FSTP, no named PNP stream, no study permit or PGWP rules). |
| Rules | 8 comparisons total. Skilled Worker: CLB ≥ 8, experience ≥ 2 yrs, funds ≥ CAD 15,000. PNP: job offer, relocation flexibility. Study-to-Work: study intent, budget ≥ CAD 25,000, timeline ≥ 10 months (`:54-102`). **[V]** No provenance: the Story 2.2 artifact cites only planning docs, never IRCC (`_bmad-output/implementation-artifacts/2-2-...md:205-213`). **[V]** |
| Rule language | The admin "DSL" can only compare those same 8 fields with `>= <= > < == !=` (`pathwayRuleSchema.ts:3-27`). **[V]** |
| CRS | **None.** No CRS, age, education, or spousal factors anywhere. **[V]** |
| CLB equivalency | **None.** Users must type a raw CLB number; there is no IELTS, CELPIP, TEF, or TCF conversion (`intake.vue` `englishClb` field). French CLB is collected but unused. **[V]** |
| NOC / TEER | Collected as a TEER 0-5 select, used only for the "required field" check (`submit.post.ts:62`). **[V]** |
| PNP stream criteria | None. "Requires relocation flexibility" is not a real PNP criterion. **[I]** Quebec, which does not run a PNP, is not handled: province is free text and ignored. **[V]/[I]** |
| PGWP | Only as a "current status" option; never evaluated. **[V]** |
| Settlement funds | A flat CAD 15,000, not scaled by family size, even though `dependantsCount` is collected. **[V]** |

**[I] Domain sanity check (RCIC must verify).** The "Skilled Worker" rule set would block users who meet real FSWP minimums (CLB 7, 1 year skilled experience). It also ignores CEC, which has no funds requirement and lower CLB for TEER 2/3. And being "direct fit" is not the same as being invited, since Express Entry invitations are CRS-ranked. The composed route "Skilled Worker → build study budget → Study-to-Work" is strategically incoherent: someone already eligible for an economic PR route does not need to then study.

**Admin-side gaps in the model:**

- **Pathways created by admins are inert.** `resolveRecommendationPathwayIds` filters active pathways down to the 3 hardcoded IDs (`pathwayDefinitionService.ts:295-307`). Pathway labels are also hardcoded in 7 places (`buildRecommendationRationale.ts:95`, `buildRecommendationNextStepPlan.ts:67`, `buildRunComparison.ts:16`, `recommendationReviewService.ts:118`, `server/api/workspace/runs/[runId].get.ts:23`, `app/lib/recommendations/comparison.ts:118`, `MilestoneRoutePlanner.vue:10`). **[V]**
- **Admin threshold edits make user-facing copy wrong.** User text hardcodes the threshold in the condition ID's label, e.g. "below CLB 8 target" (`buildRecommendationRationale.ts:101-111, 113-195`). If an admin changes the CLB rule to 7 and keeps the ID, users are told CLB 8. **[V]** for the code; the admin behavior is **[I]**.

### 1.3 FR-by-FR reality (PRD FR1–FR48; stories in brackets)

**Classification key:**
- **Real** = works end-to-end on real data.
- **Partial** = works with material gaps.
- **Stubbed** = template, fixture, or synthetic output.
- **Missing** = not implemented.

| FR | Requirement (short) | Status | Evidence |
|---|---|---|---|
| FR1 [1.1] | Account + secure workspace | **Partial** | Email/password only. No verification, no reset (`server/auth.config.ts:9-11`; `app/pages/auth.vue`). |
| FR2 [1.2] | Guided intake | **Real** | 5 sections, 37 fields (`intake.vue`). |
| FR3 [1.3] | Structured + free-form | **Partial** | `additionalContext` is stored but only used in run diffs (`buildRunComparison.ts`); never influences output. |
| FR4 [1.2] | Save/resume | **Real** | `intake_draft` table (`0001_guided_intake_draft.sql`); `draft.post.ts`. |
| FR5 [4.4] | Update prior profile | **Real** | New-cycle prefill (`draft.get.ts`, `mode=new-cycle`). |
| FR6 [1.3] | Priorities/constraints influence outcomes | **Partial** | `priorityPreference`, `locationPreference`, `primaryGoal`, `intendedProvince` never reach the engine. **[V]** |
| FR7 [1.4] | Submit | **Real** | `submit.post.ts`. |
| FR8 [1.4/4.2] | Multiple runs | **Real** | Convex runs and lineage. |
| FR9 [2.2] | Recommendations from profile/priorities | **Stubbed** | 3 invented pathways, 8 fields. |
| FR10 [2.2] | Direct pathways | **Partial** | Mechanism real, rules fictional. |
| FR11 [2.2] | Blocked-but-close | **Partial** | Mechanism real, rules fictional. |
| FR12 [2.3] | Composed pathways | **Stubbed** | Lookup table, max 1 (`generateComposedPathways.ts:46-84, 126`). |
| FR13 [2.3] | Rank by best-fit / fastest | **Missing (fake)** | Alphabetical scoring. |
| FR14 [2.3] | Strong / conditional / lower tiers | **Stubbed** | Derived from the alphabetical score. |
| FR15 [2.4] | Withhold when evidence is insufficient | **Stubbed** | No evidence is consulted. "Withheld" caveat claims insufficient evidence (`qualifyWeakRecommendationResults.ts:72-77`). |
| FR16 [2.4] | Updated recs on change / rerun | **Real** | `refresh.post.ts`. Output is identical unless admin rules changed. |
| FR17–21 [3.1/3.2] | Why, strengths, blockers, actions, tradeoffs | **Stubbed** | Templates. Tradeoffs are generic boilerplate; the declared "cost" dimension is never produced (`buildRecommendationRationale.ts:624-656`). |
| FR22–24 [3.3] | Compare; immediate vs long horizon; direct vs multi-step | **Real (UI)** | Renders correctly, but over stubbed data. |
| FR25–26 [3.4] | Citations; inspect source context | **Missing** | UI exists; the data can never be populated (schema has no field). |
| FR27 [3.4] | Source-backed vs inferred | **Stubbed** | Always `inferred` / `system-generated`. |
| FR28 [2.4/3.4] | Caveats / confidence | **Partial** | Present, but confidence and freshness are synthetic. Caveats show raw slugs: "mvp-provincial-nominee is conditionally usable…" (`qualifyWeakRecommendationResults.ts:68,77`). |
| FR29 | Output→source traceability | **Missing** | |
| FR30 [5.3] | Internal review of source basis | **Stubbed** | Admin sees synthesized "fallback citations", with an `https://example.com` fallback URL (`recommendationReviewService.ts:300-307, 382-403, 482-510`). |
| FR31 [4.1] | Next-step plan | **Stubbed** | Templates (`buildRecommendationNextStepPlan.ts`). |
| FR32–35 [4.2–4.4] | Revisit, track changes, preserve, reuse | **Real** | History, compare, continuity hub (`buildRunComparison.ts`, `recommendationRunHistory.ts`, `buildWorkspaceSummary.ts`). |
| FR36 [5.1] | Manage active pathways | **Partial** | Enable/disable of the 3 works; created pathways are ignored by the engine. |
| FR37 [5.2] | Update rules | **Partial** | Threshold edits work; copy and composition stay hardcoded. |
| FR38 [5.2] | Curate evidence sources | **Real but disconnected** | Source CRUD and ingestion run (`convex/ragSources.ts`, `rag-ingestion-phase3.ts`); nothing reaches users. |
| FR39, FR42 [5.3] | Policy-alignment review; claims cited | **Stubbed** | |
| FR40 [5.3] | Corrective action on weak support | **Partial** | Flag/dismiss/resolve only write admin state (`recommendationReviewStateService.ts`); no user-visible effect. **[V]** |
| FR41 [5.4] | Audit trust-sensitive changes | **Real (with caveats)** | Postgres `governance_audit_log` (`auditLogStore.ts:176`). Not atomic with the change (`resolve.post.ts`: state write, then audit write). |
| FR43–45 | Role separation; protect user data | **Fails** | HTTP layer is correct; Convex layer is open (§4). |
| FR46 | Reviewable / controllable | **Partial** | |
| FR47 | Narrow but expandable set | **Partial** | Expansion requires code edits in ~7 files. |
| FR48 | Don't imply coverage of unsupported areas | **Missing** | Family-sponsorship, business, Quebec, and current-PR users get the same 3 economic pathways; no out-of-scope messaging. **[V]** |

### 1.4 Test-mode code inside production paths [V]

- **In-memory fallback.** A `globalThis` Map holds runs (`testRecommendationRunFallback.ts:36-46`). It is consulted by `start.post.ts:147-213`, `pathways.get.ts:51`, and admin review (`recommendationReviewService.ts:624-636, 676-681`). If Convex errors, admins silently see an empty or fallback list instead of an outage.
- **NODE_ENV gate only.** Mock modes (`mock-completed`, `mock-degraded`, `mock-failed`) are blocked only by `NODE_ENV !== 'production'` (`testMode.ts:3-10`). The same modes are accepted with no gate by the public Convex `startProcessingForUser` (`convex/recommendationRuns.ts:1166-1177`).

---

## 2. Where the LLM is (and isn't)

| Component | Status | Evidence |
|---|---|---|
| Recommendation generation, explanations, next steps | **No LLM.** Pure deterministic templates. | **[V]** §1.1 |
| OpenRouter | **Never called.** Only read by a readiness check. | `server/utils/rag-foundation.ts:102-107, 135-138`; no `openrouter.ai` URL anywhere. **[V]** |
| Cloudflare AI Gateway | **Never called.** Only a base URL is constructed. | `rag-foundation.ts:80-85`. **[V]** |
| Planned `openRouterClient.ts`, `aiGatewayClient.ts`, `buildEvidencePacket.ts`, `mapCitationReferences.ts`, `scorePathwayFit.ts` | **Do not exist.** | Planned in `_bmad-output/planning-artifacts/architecture.md:600-618`. **[V]** |
| Cloudflare AI Search | Used by (a) an **unauthenticated** public playground endpoint and (b) admin ingestion sync. | `server/api/ai-search/query.post.ts:49-123`; `cloudflare-ai-search-sync.ts`. **[V]** |
| YouTube / website ingestion (~2,800 LOC) | Writes markdown to R2 for AI Search. **Not read by any recommendation code.** | `rag-ingestion-phase3.ts`. **[V]** |

The product brief claims differentiation via "structured pathway evaluation with LLM-assisted reasoning" (`product-brief-cadet2-2026-03-01.md:53, 75, 85`). That claim is unimplemented. **[V]**

### Behavior when dependencies are unavailable

| Dependency down | Effect |
|---|---|
| OpenRouter or Cloudflare | **No user impact on recommendations** (no dependency). Only `/ai-search` and admin ingestion sync fail. **[V]** |
| Convex | Total outage for runs. Submit returns 503/500 (`submit.post.ts:191`, `convex-admin-client.ts:8-18, 47-53`). Start returns a misleading **404 "Recommendation run not found"**, because the Convex client is nulled and the code falls through (`start.post.ts:121-145, 215-220`). Admin review silently shows fallback or empty data (`recommendationReviewService.ts:633-636`). **[V]** |
| Postgres (NuxtHub) | Auth, drafts, and snapshots down; total outage. **[V]** |
| Self-fetch | `getConvexTokenForEvent` calls the app's own origin over HTTP to mint a token (`convex-admin-client.ts:81-109`). **[I]** On Cloudflare Workers this pattern needs verifying, since self-fetch on the same zone can misbehave. |

---

## 3. End-user experience as implemented

### Journey walk

1. **`/` (landing).** A developer debug page. Its copy reads "The legacy tasks demo still exists…", and its buttons include **"Open Legacy Tasks"** and **"Open AI Search Playground"** plus "Auth ready: yes/no" readouts (`app/pages/index.vue:18-63`). There is no value proposition. **[V]**
2. **`/auth`.**
   - The theme is dark, unlike the light workspace (`app.vue` root is `bg-slate-950`). **[V]**
   - It defaults to sign-up mode (`auth.vue:9`). **[V]**
   - User-facing copy reads "Uses `useUserSession()` from Nuxt Better Auth." (`auth.vue:76`). **[V]**
   - There is no forgot-password, no terms or privacy consent, and no email verification. **[V]**
3. **`/workspace` (hub).** A continuity hub with hero, timeline, action panel, status banner, and results panel (`app/pages/workspace/index.vue`). Copy is process jargon: "preserved reviewable runs", "planning cycle", "reusable workspace record" (`buildWorkspaceSummary.ts:293-365`). **[V]**
4. **`/workspace/intake`.** This is the main time-to-first-value problem.
   - **37 fields, 32 required, across 5 mandatory sections**; submit is blocked until all are complete (`submit.post.ts:43-87, 132-191`; `intake.vue:716-721`). **[V]**
   - **Only 8 of the 37 fields affect output.** **[V]**
   - It asks for name and email again (already on the account), date of birth, citizenship, marital status, dependants, refusal history, ECA status, and NOC TEER. Users rarely know their TEER. **[I]**
   - CLB is entered as a raw number with no test-score conversion, so a user typing an IELTS band will be misclassified. **[I]**
   - Province is free text (`intake.vue:376`). **[V]**
   - Estimated completion time is 10–20 minutes **[I]**, against a PRD target of under 10 minutes for intake *plus* result (`prd.md:127`).
5. **Submit.** The success message exposes internal IDs: "Next state: run run_3f2a… is queued" (`intake.vue:1014`). Start is fire-and-forget (`:1009`). **[V]**
6. **Results.**
   - Three generically named pathways, with no real program names and **zero links to canada.ca or IRCC** in the user UI. The only canada.ca string in `app/` is an admin input placeholder (`app/components/admin/EvidenceSourceDetail.vue:340`). **[V]**
   - A typical profile renders a **"degraded… low-confidence outputs"** banner, which reads as system failure when it really means "you don't qualify for X". **[I, from trace]**
   - Direct fits show **"Confidence high · Freshness fresh"** (`EvidenceConfidencePanel.vue:38-68`) next to **"No citations are attached to this recommendation yet."** (`RecommendationCitationList.vue:66-69`). This contradicts itself. **[V]**
   - The status banner shows `Run {{runId}}` (`RecommendationStatusBanner.vue:127`). **[V]**
7. **Plan, history, compare.** These function correctly. Because the engine is deterministic over 8 inputs, diffs and refreshes add little insight. **[I]**

### Cross-cutting UX

| Aspect | Finding |
|---|---|
| **Disclaimers / legal** | None. No "not legal advice", no RCIC referral, no ToS, no privacy policy (grep for disclaimer/privacy/legal advice/RCIC returns nothing). **[V]** |
| **Account management** | No settings page, no data export, no account deletion. **[V]** |
| **Accessibility** | Intake fields have labels, `aria-invalid`, and `aria-describedby` (`IntakeSectionFields.vue:50-100`). **[V]** Gaps: no page titles anywhere (no `useHead`/`useSeoMeta`, no `app.head` in `nuxt.config.ts`), no `<html lang>` (WCAG 2.4.2 / 3.1.1), no `autocomplete` on personal fields. **[V]** |
| **Mobile** | Workspace has a bottom nav and a sheet menu (`WorkspaceShell.vue:207-316`). **[V]** Not visually verified. |
| **Copy quality** | Raw pathway slugs leak into caveats and also into Convex-side fallback blockers (`convex/recommendationRuns.ts:555-569`). **[V]** |

---

## 4. Security and privacy quick audit

### Critical (block any external user)

1. **Convex functions are public, unauthenticated, and IDOR-prone.** **[V]**
   - `convex/recommendationRuns.ts` exports 14 public `query`/`mutation` functions. None call `ctx.auth`; ownership is checked against a caller-supplied `userId` argument.
   - Notable functions:
     - `listForAdmin`: dumps all users' runs, including `userId` and full results (`:1377-1415`).
     - `resetRunsForUser`: deletes any user's runs (`:1324-1340`).
     - `writeRankedRecommendationsForUser`: lets an attacker inject arbitrary recommendations into a victim's run (`:1115`).
     - `seedRunForUser`, `startProcessingForUser` (accepts mock modes), `createQueuedRun`.
   - The browser instantiates a Convex client (`app/plugins/convex-auth.client.ts:49`), so the deployment URL is public.
   - The team's own comment says it "has NO Convex-level authorization. Direct browser access to this query would expose all user recommendation data" (`:1369-1376`). But a code comment cannot enforce "only call from Nitro"; only `internalQuery`/`internalMutation` can.
   - The architecture planned `recommendationRunsInternal.ts` (`architecture.md:629`). It was never built.
   - The team knew the correct pattern: `convex/ragSources.ts:46-96` implements `requireIdentity`/`requireAdmin`, and `ragIngestionInternal.ts` is entirely internal.
2. **The Convex audit log is public and forgeable.** `convex/auditLog.ts` has public `recordAuditEvent` (`:59`), `listAuditEvents` (`:95`, which returns admin emails), and `getAuditEvent`. The server doesn't even use this table (the real audit log is in Postgres), so it is pure attack surface. **[V]**
3. **An unauthenticated LLM endpoint.** `POST /api/ai-search/query` has no session check. It forwards caller-chosen `model`, `systemPrompt`, `stream`, and `filters` to Cloudflare AI Search `chat/completions` on the owner's account (`server/api/ai-search/query.post.ts:49-123`; `cloudflare-ai-search.ts:131-143`). This enables cost abuse and indexed-content exfiltration. The `/ai-search` page itself is also unguarded and linked from the homepage. **[V]**

### High

4. **Auth is minimal.** Email/password only, with no email verification and no password reset (`server/auth.config.ts:9-11`). `.env.example` lacks `BETTER_AUTH_SECRET` and base-URL settings. The auth stack is pre-1.0 alpha (`@onmax/nuxt-better-auth@0.0.2-alpha.29`, `nuxt-convex@0.0.6`). The client plugin reaches into Vue internals (`nuxtApp.vueApp._context.provides`) to find the Convex client (`convex-auth.client.ts:49`). **[V]**
5. **No privacy compliance.** The intake stores highly sensitive PII as plaintext JSONB: name, email, DOB, citizenship, marital status, dependants, refusal history, funds, employment. **[V]**
   - It is duplicated per run in `recommendation_profiles` (`submit.post.ts:229-244`; `refresh.post.ts`). **[V]**
   - Data is split across Postgres and Convex. **[V]**
   - There is no deletion, export, retention policy, consent capture, or privacy policy. **[V]**
   - Postgres has `ON DELETE CASCADE` (`0001`/`0002` migrations), but nothing deletes users, and Convex runs would be orphaned. **[V]**
   - **[I]** PIPEDA, and Quebec Law 25 for Quebec residents, require consent, access, and deletion handling.
6. **Regulatory exposure. [I]** IRPA s.91 restricts giving immigration advice "for consideration" to authorized representatives (RCICs, lawyers, Quebec notaries). A paid product giving personalized pathway recommendations needs legal review on how it is positioned and disclaimed.
7. **Third-party scraping.** YouTube ingestion defaults to an unknown third-party proxy (`youtube-transcript-api-tau-one.vercel.app`) and an embedded InnerTube Android key (`rag-ingestion-phase3.ts:1464-1472`). **[V]** **[I]** Likely YouTube ToS exposure, plus a supply-chain dependency on an anonymous host.

### Medium / Low

- **HTTP-layer authZ is correct.** Every `/api/workspace/*`, `/api/intake/*`, and `/api/recommendations/*` route calls `requireWorkspaceUserSession` and passes the *session* `userId` to Convex. All `/api/admin/*` routes call `requireAdminSession` (route-by-route grep). The run-ID IDOR risk is therefore **only** at the Convex layer. **[V]**
- **Admin gating.** Client middleware (`app/middleware/admin.ts`) plus server checks via `rag_admins` and an env allowlist bootstrap on nearly every admin route (`allowBootstrapFromAllowlist: true`). Acceptable for a beta. **[V]**
- **Test endpoints.** `/api/recommendations/testing/*` is gated only by NODE_ENV (`testMode.ts`). **[V]**
- **Runtime DDL.** `CREATE TABLE IF NOT EXISTS` runs on hot paths: every recommendation start calls `ensureSeededPathwayDefinitions` (`pathwayDefinitionService.ts:105-145, 147-148`). The review-state and governance-audit tables have *no migrations* (`recommendationReviewStateService.ts:105,122`; `auditLogStore.ts:176`). **[V]**
- **Unbounded scan.** `listForAdmin` does `.collect()` over all runs on every admin page load (`convex/recommendationRuns.ts:1382`). **[V]**
- **Hygiene.** No rate limiting on app routes (planned in `architecture.md:211`), no error tracking, no product analytics, and only 1 structured log line in all of server code. PII logging is therefore not a current risk, but observability is nil. **[V]**
- **Secrets.** None committed. `.env*` is gitignored. **[V]**

---

## 5. Test reality

### Inventory [V]

| Suite | Files | Tests | Skipped | Nature |
|---|---|---|---|---|
| Playwright E2E | 23 | 100 | 27 | 56 of 73 active tests use `page.route` API mocks. Only 17 hit the real backend, all in intake-draft, constraints, and auth specs. **No E2E covers intake → real run → results.** |
| Playwright API | 29 | 151 | 25 | Real Nitro routes; require local Convex and Postgres. |
| Playwright integration | 11 | 29 | 0 | Real server chain via test seed endpoints. |
| Vitest unit | 3 | 8 | 0 | DSL evaluator, run comparison. |
| Vitest component | 15 | 22 | 0 | Mount-and-assert. **Not run in CI.** |

### Quality findings

- **P0 security acceptance tests are skipped.** Examples: "unauthenticated request to workspace metadata endpoint is denied", "query tampering does not change workspace ownership", "standard authenticated user is denied admin API access probe" (`tests/api/workspace-access.atdd.spec.ts:17,34,46,58`), and the unauthenticated intake-draft denials (`tests/api/intake-draft.atdd.spec.ts:20,31`). **[V]**
- **No test touches the Convex layer directly**, which is where the real hole is. **[V]**
- **Vacuous assertions.** The citation API test loops `for (const citation of candidate.citations)`, which passes on empty arrays, and checks source-backed candidates only "if any" (`tests/api/recommendation-citations.atdd.spec.ts:147-159, 186-191`). It passes even though citations can never exist. **[V]**
- **The citation UI was only ever tested against fabricated fixtures** (`tests/e2e/workspace-recommendation-citations.atdd.spec.ts:23-60`). **[V]**
- **Admin E2E mocks `/api/admin/access`**, so real admin gating is never browser-tested (`admin-governance.atdd.spec.ts`). **[V]**
- **No domain-correctness tests.** Nothing asserts that a profile known to be FSWP-eligible is classified correctly. Tests assert structure and determinism only (`tests/integration/recommendation-ranking.integration.spec.ts:226-271`). **[V]**
- **CI is almost certainly non-functional.**
  - The first job runs `nuxi typecheck` (`.github/workflows/test.yml:47`), and the test job `needs: lint` (`:53`). **[V]**
  - Five story records state repo-wide typecheck fails: `3-3...md:329`, `4-2...md:341`, `4-3...md:266,278`, `5-2...md:328`, `5-4...md:206`. **[V]**
  - CI provisions no Convex deployment, and the intake submit route has no fallback without it. **[V]**
  - `setup-node` with `cache: pnpm` runs before `corepack enable` (`:37,41`). **[I]** This is a known failure mode.
  - `example.spec.ts` asserts the dev landing-page links exist, so removing scaffolding will break it. **[V]**

### Confidence levels

| Claim | Confidence |
|---|---|
| The backend pipeline is deterministic and stable on a dev machine | Moderate |
| Recommendations are correct | **None** |
| The deployed product is secure | **Low** |
| CI guards regressions | **Low** |

---

## 6. Retro and readiness-report insights (recurring, not fixed)

1. **Stakeholder acceptance and release state were never recorded.** This was an action item in the Epic 2 retro, marked ❌ in the Epic 3 retro, and ❌ again in the Epic 4 retro (`epic-3-retro-2026-03-10.md`, "Previous Retrospective Follow-Through" #1; `epic-4-retro-2026-03-17.md` #1). There is no evidence the product was ever deployed. **[V]**
2. **Repo-wide typecheck failure** was deferred story after story as "pre-existing / outside scope" (see §5). **[V]**
3. **Contract duplication** was declared a *prerequisite* for Epic 5 (`epic-4-retro...md`, "Carry-Forward Constraints" #1; "Commitments: treat prep items as prerequisites"). It remains: pathway labels sit in 7 files and `shared/types` has 2 files. **[V]**
4. **"No synthetic provenance"** was an Epic 3 commitment (`epic-3-retro...md`, "Carry-Forward Constraints" #2). It was violated by Epic 5's fallback citations (`recommendationReviewService.ts:382-403`) and by the hardcoded `freshness: 'fresh'` (`qualifyWeakRecommendationResults.ts:86`). **[V]**
5. **"Wire it in the runtime path, not only in tests"** was a key Epic 2 learning (`epic-2-retro...md`, Story 2.3). It recurred with citations: modeled in UI, fixtures, and tests, but impossible at runtime. **[V]**
6. **Mandatory retros were promised but not done.** The Epic 2 retro said retros should be mandatory, yet no Epic 1 or Epic 5 retro exists, and every epic is still `in-progress` in `sprint-status.yaml`. **[V]**
7. **Readiness reports checked document structure, not product substance.** All four reports (`implementation-readiness-report-2026-03-0{1,2}*.md`) end READY with 100% FR coverage. **[V]** None flagged that:
   - the MVP pathway set and rules were never specified (the PRD and epics only say "narrow MVP pathway set": `prd.md:519`, `epics.md:383-403`);
   - legal positioning or privacy compliance was absent;
   - test harness hooks were going into production code. The 03-02 report did flag Story 2.1 mixing in test enablement (`...2026-03-02.md`, Major Issue 2); the fix moved it to "implementation notes", so the hooks shipped anyway.
8. **Stale docs.** `docs/deployment-guide.md` still says "No checked-in CI pipeline" and "No formal automated test suite". **[V]**

---

## 7. Scaffolding and demo code to remove before launch [V]

**Pages and endpoints**
- `README.md`: the default "Nuxt Minimal Starter".
- `app/pages/index.vue`: dev landing page with links to tasks and the AI playground.
- `app/pages/tasks.client.vue`, `convex/tasks.ts`, `tests/e2e/tasks-auth.spec.ts`: the tasks demo.
- `app/pages/ai-search.vue` and `server/api/ai-search/query.post.ts`: the public AI playground.
- `app/pages/admin/rag-phase0.client.vue` and `server/api/admin/rag/phase0-readiness.get.ts`: phase-0 diagnostics.

**Convex surface**
- `convex/auditLog.ts`: unused and public.
- Convex `seedRunForUser`, `resetRunsForUser`, `listRunsForUserTesting`, and the mock modes in `startProcessingForUser`.

**Production-path test code**
- `server/api/recommendations/testing/*`, `server/utils/recommendations/testRecommendationRunFallback.ts`, `testMode.ts`, and fallback branches in `start.post.ts`, `pathways.get.ts`, `recommendationReviewService.ts`.

**Repo noise**
- `.tmp-skills/` (5 vendored agent skill folders).
- `.gitignore` lines 31–118: about 90 hand-listed `.data/pw-*` test run directories.
- `convex/README.md` (Convex default).
- Duplicate docs: `docs/contribution-guide.md` vs `contribution-guidelines.md`, `development-guide.md` vs `development-instructions.md`.
- `@electric-sql/pglite` in production `dependencies`.

**User-facing dev copy**
- `auth.vue:76`; `intake.vue:1014` (run IDs); `RecommendationStatusBanner.vue:127`.

**Dependencies**
- Phantom dependency `@convex-vue/core`: imported by `convex-auth.client.ts:1` but undeclared; Story 3.3 typecheck reported it missing.

---

## 8. Punch list to a private beta

Sizes: **S** ≤ 3 days, **M** 1–2 weeks, **L** 3–5+ weeks for one engineer. The list is ordered by dependency and risk.

| # | Item | Size | Why |
|---|---|---|---|
| 1 | **Lock down Convex.** Convert all `recommendationRuns.*` to `internalQuery`/`internalMutation`. The server already uses an admin key; switch `recommendationReviewService` and `seed` from the user client to the admin client. Delete `auditLog.ts` and the seed/reset/mock functions. Add a test that an anonymous Convex client is rejected. | M | Critical cross-user read, delete, and write. |
| 2 | **Remove the public attack surface.** Auth-gate or delete `/api/ai-search/query` and `/ai-search`; delete the tasks demo; replace the landing page. | S | Open LLM cost abuse; unprofessional first impression. |
| 3 | **Auth basics.** Password reset, email verification, a documented `BETTER_AUTH_SECRET` and base URL, and a pinned or evaluated stable auth stack. | S–M | Users get locked out; spam signups. |
| 4 | **Legal and privacy floor.** ToS, privacy policy, and consent at intake; a "not legal advice / consult an RCIC" disclaimer on results; account deletion and data export spanning Postgres and Convex; a retention policy; legal opinion on IRPA s.91 positioning. | M (+ counsel) | Required before collecting refusal history and DOB from real people. |
| 5 | **Stop fabricating trust signals.** Replace alphabetical scoring; derive confidence and freshness from real evidence or hide them; humanize caveats; rename "degraded" for normal ineligibility; remove `example.com` fallback citations. | S–M | The product currently misstates its own certainty. |
| 6 | **Real domain model for a scoped beta cohort,** built with an RCIC. For example: Express Entry (FSWP, CEC, FSTP) eligibility plus a CRS calculator; IELTS/CELPIP/TEF/TCF → CLB conversion; a NOC/TEER lookup; funds by family size; 3–5 named PNP streams in 1–2 provinces; study permit → PGWP → CEC as the composed route. Version rules with effective dates and an official source URL per rule, and add a golden-profile test suite signed off by the RCIC. | **L** | This is the product. Everything else is shell. |
| 7 | **Make the engine data-driven.** Labels, thresholds, and copy come from rule records; composition is defined in data rather than hardcoded on condition IDs; admin-created pathways actually evaluate; remove the 7 hardcoded label maps. | M | Admin governance is otherwise cosmetic and can produce wrong copy. |
| 8 | **Real citations.** Add `citations` to the Convex schema, attach each rule's official source and retrieval date to the claims it produces, and render them. RAG/LLM optional for the beta. | M | Core PRD promise (FR25–29); a ≥95% evidence-coverage metric. |
| 9 | **Scope honesty.** Out-of-scope messaging for family, business, Quebec, current-PR, and inside-Canada edge cases (FR48). | S | Prevents confidently wrong advice. |
| 10 | **Make CI real.** Fix the typecheck; declare phantom deps; fix pnpm setup; add a Convex preview deployment to CI; run Vitest; un-skip the P0 auth tests; add one unmocked E2E covering sign-up → intake → results. | M | There is currently no regression safety net. |
| 11 | **Deployment.** Choose the target (preset/wrangler); production Postgres and Convex; secrets; migrations for the runtime-DDL tables; remove DDL from hot paths; verify the token self-fetch works on the platform. | M | Nothing is deployable as checked in. |
| 12 | **Shorten the intake.** Collect only what the model uses, plus progressive disclosure; province select; CLB helper; reuse the account name and email. | M | Time-to-first-value is beyond the PRD's 10-minute target. |
| 13 | **Instrumentation.** Error tracking plus product analytics for the PRD metrics (intake completion, time to first recommendation, return rate). | S | A beta without measurement teaches nothing. |
| 14 | **Cleanup and RAG decision.** Remove the scaffolding (§7). Freeze or drop YouTube ingestion for the beta, and replace the anonymous transcript proxy if it is kept. | S | Risk and maintenance reduction. |

**Rough total [I]:** about 10–14 engineer-weeks plus part-time RCIC and privacy counsel. Item 6 dominates and gates items 7–9. Items 1–5 (about 3–4 weeks) are the minimum before *any* external tester, even a friendly one.

---

## 9. Verified facts vs inferences (summary)

**Verified in code**
- 3 pathways, 8 rules, 8 consumed fields.
- Alphabetical scoring.
- Hardcoded freshness and confidence.
- Citations impossible at runtime.
- No LLM calls; OpenRouter and AI Gateway unused.
- Public, unauthenticated Convex functions with caller-supplied `userId`.
- Unauthenticated AI Search endpoint.
- No disclaimers, deletion, export, page titles, or `lang`.
- 32 required intake fields.
- Skipped P0 auth tests.
- Mock-heavy E2E.
- Typecheck failures recorded in story artifacts.
- Admin-created pathways ignored by the engine.
- Retro action items unresolved.

**Inferences**
- Accuracy of the thresholds versus actual IRCC rules, and composed-route coherence (needs RCIC).
- IRPA s.91 and PIPEDA / Law 25 exposure (needs counsel).
- CI being red end-to-end (typecheck failure is documented; the CI run itself was not observed).
- Intake completion time.
- Typical runs landing in "degraded".
- Cloudflare self-fetch behavior.
- Effort sizing.
