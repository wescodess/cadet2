# cadet2 — Real-World Feasibility Synthesis

Date: 2026-11-16 · Reviewed commit: `67b5ea3`

Inputs (five independent analyses, two model families):

| Report | Model | Focus |
|---|---|---|
| [opus-codebase-reality-audit.md](opus-codebase-reality-audit.md) | Claude Opus 5.5 | What is real in the code, security, tests, punch list |
| [opus-market-and-monetization.md](opus-market-and-monetization.md) | Claude Opus 5.5 | Late-2026 market, competitors, pricing, GTM, unit economics |
| [opus-regulatory-legal-trust.md](opus-regulatory-legal-trust.md) | Claude Opus 5.5 | IRPA s.91, privacy, liability, policy volatility, lawyer questions |
| [sol-product-strategy.md](sol-product-strategy.md) | GPT-6.1 Sol | Product truth, ICP, roadmap, kill list, 90-day plan |
| [sol-engine-and-production-review.md](sol-engine-and-production-review.md) | GPT-6.1 Sol | Engine trace, target architecture, production blockers, phased effort |

Market and legal facts come from the subagents' web research (cited inline in each report). The two highest-severity code claims (Convex authorization, alphabetical ranking) were re-verified directly against source for this synthesis.

---

## 1. Verdict

cadet2 can become a real business, but not in the shape it is in today and probably not as the consumer product the PRD describes.

- **The shell is real; the brain is not.** Intake with save/resume, run records, run history, run-to-run diffs, admin governance, evidence curation and an audit trail all work. The recommendation engine is a placeholder: three generic pathways ("Skilled Worker", "Provincial Nominee", "Study-to-Work") evaluated on 8 of 37 intake fields with unsourced thresholds, ranked by `pathwayId.localeCompare` with fixed 90/87/84 scores, with hardcoded "confidence high · freshness fresh" labels. No LLM or RAG call happens in the recommendation path. No citations are persisted. No CRS, CLB conversion, NOC/TEER, PNP stream, PGWP or family-size funds logic exists.
- **It cannot be exposed to any external user yet.** All 14 exported functions in `convex/recommendationRuns.ts` are public `query`/`mutation` that trust a caller-supplied `userId`, with zero `ctx.auth` checks. Anyone with the Convex URL can list, overwrite or delete any user's runs. `/api/ai-search/query` is unauthenticated and forwards caller-chosen `model` and `systemPrompt`.
- **The business model is constrained by law, not taste.** Under IRPA s.91, giving immigration advice "for consideration" without a licence is an offence. IRCC's own guidance lists "advice on which immigration option(s) to pursue" as advice, which is exactly what cadet2 outputs. Since 2026-10-28 IRCC can also levy administrative penalties per case. A paid, AI-only, consumer pathway plan is the riskiest possible structure.
- **The winning shape (all five analyses converge):** a licensed-professional-in-the-loop product. Sell to RCIC practices first, keep the consumer planner free, and add an RCIC-signed "Verified Plan" only after counsel approves the structure. The moat is a current, versioned, effective-dated rules graph plus case-level policy-change impact, not prompts or scraped content.

---

## 2. Where the models agreed and disagreed

**Unanimous**
- Engine is a demo; it is the product and must be rebuilt as a versioned rules graph validated by an RCIC with golden test profiles.
- Convex authorization bypass is the first thing to fix.
- Remove fabricated trust signals (scores, "high/fresh" badges, `example.com` fallback citations, "fastest credible route" claims).
- LLMs belong at the edges (intake extraction from free text/documents, explanation of deterministic results, grounded Q&A), never as the eligibility decision.
- YouTube ingestion should not be an authority for rules; it is a distraction for launch.
- Rules currency is a permanent operating cost (~33 notable IRCC changes 2024–Nov 2026; Express Entry overhaul on 2026-11-03).

**Disagreement: first buyer**
- Opus (market) favours consumers: temporary residents in Canada with permits expiring within ~18 months, monetized through an RCIC-reviewed C$199 Verified Plan plus a C$9/mo Plan Watch, with an RCIC Copilot alongside.
- Sol (strategy) and Opus (legal) favour B2B first: small RCIC practices at ~C$149/month, consumer monetization deferred.

**Resolution:** lead with RCIC practices. It is the only model the legal analysis rates as structurally safe, it produces revenue without CAC-heavy consumer marketing, and it supplies the licensed reviewers that a later consumer Verified Plan needs anyway. Run the free consumer planner in parallel as the data and demand engine. A paid "Plan Watch" that re-runs advice on rule changes counts as advice; only pure non-advice utilities (deadline calendar, document vault) are safe to charge consumers for without a licensee.

---

## 3. What exists today, mapped to its future use

| Built asset | Keep / rework / cut | Future role |
|---|---|---|
| Intake with save/resume, free-text context | **Rework**: shorten to fields the engine uses, progressive disclosure, CLB helper, province select | Client intake link an RCIC sends to prospects |
| Run records, history, run-to-run diff | **Keep** | "What changed since last review" for RCIC files; policy-change impact |
| Next-step plan builder | **Rework**: drive from rule data, not templates | Draft client action plan the RCIC edits and signs |
| Pathway inventory, rules admin | **Rework**: immutable releases, effective dates, transactional publish | Rules-graph authoring for the internal rules team |
| Evidence-source curation, audit trail | **Keep** | Sellable to RCICs as audit/record-keeping support (CICC Code s.38) |
| Recommendation trust review | **Rework**: review must actually gate user-facing output | Licensed sign-off workflow |
| RAG ingestion (web) | **Keep, narrow** to official sources (canada.ca, Gazette, PNP sites) | Policy-change monitoring and citation snapshots |
| YouTube transcript ingestion | **Freeze**; anonymous transcript proxy and embedded key are a ToS and security problem | At most, question discovery for content marketing |
| Ranking/scoring/confidence | **Cut** | Replace with calculation receipts and met/unmet criteria |
| Tasks demo, AI Search playground, starter README, dev copy on auth page | **Cut** | n/a |

---

## 4. Things you are probably ignoring

1. **Legality decides the business model on day one.** s.91, the new IRCC penalties, CICC Code s.13 (RCICs cannot pay for referrals), lawyers cannot share fees with non-lawyers. A per-lead marketplace is out. Get a written opinion before charging anyone.
2. **Quebec is a separate regime.** Quebec regulates paid advice on Quebec-selected applications separately and has Law 25 privacy obligations. Geofence Quebec pathways at launch.
3. **Data residency is irreversible.** The production Convex deployment region cannot be changed later; create it in Canada. Enable zero-data-retention routing on OpenRouter, disable prompt logging in AI Gateway, and keep name/email/DOB out of prompts.
4. **There is no legal or privacy floor.** No ToS, privacy policy, consent, "not legal advice" copy, age gate, export or deletion, while collecting refusal history, DOB, finances and immigration status in plain text.
5. **Rules currency is a staffed function, not a feature.** Budget a part-time-to-full-time RCIC plus a policy analyst, SLAs for applying changes, and automatic invalidation of plans affected by a change.
6. **Express Entry changed two weeks ago.** The 2026-11-03 CRS overhaul (Canadian experience and high-wage job-offer points, LMIA no longer required) means any CRS logic must be built against the new rules from scratch.
7. **French is a pathway, not just a language.** Francophone draws were ~40% of 2026 invitations; "reach NCLC 7" may be the single most valuable improvement action for many users.
8. **The best market is temporary and shrinking by design.** Temporary residents in Canada with expiring permits are the highest-urgency segment today, but policy aims to cut that population sharply by end of 2027. Plan the second segment early.
9. **Trust is the product in a fraud-scarred industry.** Named licensed reviewers, dated citations, a correction mechanism and published scope beat badges. Block fake-job-offer and LMIA-purchase intents.
10. **Liability and insurance.** Tech E&O that explicitly covers AI output, plus cyber. Expire saved plans after ~30 days or any material rule change. Escalate to a professional when status expires within 90 days or when health, criminality, refusals or asylum come up.
11. **Free competitors already cover the commodity layer.** IRCC Come to Canada, CanadaVisa (CRS calculator, CanadaVisa+), IMMERGITY's free AI PR masterplan. A CRS calculator alone sells nothing; a reviewed, cited, kept-current plan does.
12. **You cannot measure anything.** No analytics, error tracking or deployment target. None of the PRD success metrics are observable.
13. **The planning process validated structure, not substance.** Four readiness reports said READY with 100% requirement coverage, yet nobody specified which programs and rules to model. A domain expert needs to be a co-owner of the backlog, ideally an RCIC co-founder or paid design partner.

---

## 5. What to build

### Now: make it safe and real (gate for any external user)

| # | Item | Size | Source |
|---|---|---|---|
| 1 | Convert `recommendationRuns.*` to internal functions or enforce `ctx.auth` identity; delete seed/reset/mock and `listRunsForUserTesting`; test that anonymous clients are rejected | M | Opus audit #1, Sol engine #1 |
| 2 | Auth-gate or delete `/api/ai-search/query` and `/ai-search`; remove tasks demo; replace landing | S | Opus audit #2 |
| 3 | Password reset, email verification, verified-email admin grants; evaluate replacing alpha auth wrappers | S–M | Opus audit #3, Sol engine #6 |
| 4 | Legal/privacy floor: ToS, privacy policy, granular consent, results disclaimer, 18+ gate, export + deletion across Postgres and Convex, retention schedule, Canada-region production data | M + counsel | Opus legal §9 |
| 5 | Remove fabricated trust signals; hide scores; scope-honesty screens for family, business, Quebec, humanitarian | S–M | All |
| 6 | Real CI: fix typecheck, run Vitest, Convex preview in CI, un-skip P0 auth tests, one unmocked sign-up → intake → results E2E | M | Opus audit #10, Sol engine #9 |
| 7 | Deployment target, secrets, migrations instead of runtime DDL, error tracking, product analytics | M | Opus audit #11, #13 |

### Next: the product (scoped domain, B2B-ready)

| # | Feature | Size | Why it sells |
|---|---|---|---|
| 8 | **Versioned rules graph v1** built with an RCIC: Express Entry (FSW, CEC, FST) eligibility, post-2026-11-03 CRS calculator, IELTS/CELPIP/TEF/TCF → CLB/NCLC, NOC/TEER lookup, family-size funds, study → PGWP → CEC chain, 3–5 PNP streams in 1–2 provinces. Effective dates, source URL per criterion, calculation receipts | L | It is the product; everything else is shell |
| 9 | Golden-profile evaluation suite signed off by the RCIC; rule publication blocked on regression failures | M | Accuracy you can defend to regulators and customers |
| 10 | Claim-level citations pinned to source snapshots, rendered in results | M | Core trust promise; B2B audit value |
| 11 | Firm/client workspaces: RCIC sends an intake link, reviews and edits the draft, signs off before the client sees it | M | Turns existing B2C intake into the B2B wedge; makes the licensee the advisor |
| 12 | What-if simulator: language retest, French uplift, extra year of experience, spouse as principal applicant | M | Most-requested "improvement" value; differentiates from static calculators |
| 13 | Permit, test-result, ECA and passport expiry tracking with email reminders | S–M | High urgency, non-advice utility, retention driver |
| 14 | Policy-change monitor (canada.ca, Ministerial Instructions, Gazette, EE draws, PNP pages) → admin triage → list of affected client plans | L | Recurring value and the strongest moat |

### Later: expand once paying practices renew

- LLM intake extraction from free text and narrow document OCR (study permit, PGWP, IELTS TRF, ECA), always confirmed by the user.
- Draw tracking with relevance to each profile (no predictive promises).
- Shareable, versioned plans for family and advisors; document checklists.
- Consumer Verified Plan (C$199–299, RCIC advisor of record, client pays the RCIC under a service agreement) after counsel signs off.
- French UI, then one diaspora language driven by partner demand.
- Cost and timeline ranges; validated short multi-step sequences.

### Do not build (yet)

General chat, a bigger model as a milestone, 50+ pathway coverage, all provinces, native apps, a referral marketplace, CRM/billing/e-signature/case management (Officio, Docketwise, Clio already sell these), numeric approval probabilities.

---

## 6. Target engine architecture (brief)

1. **Rules graph as source of truth:** programs → streams → criteria → reference tables (CLB, NOC/TEER, funds, CRS grids) → legal transition edges (e.g., PGWP → CEC). Immutable releases with effective dates and a source snapshot per criterion.
2. **Deterministic evaluation:** eligibility, competitiveness (CRS vs recent draws) and personal suitability scored separately. Every run stores a receipt: input facts + rule release + source snapshots, so any result can be replayed.
3. **Abstention over invention:** missing facts, stale sources or out-of-scope goals produce "needs professional review" instead of a guess.
4. **LLM boundary:** extraction (with user confirmation), explanation generated from the receipt, grounded Q&A over official sources. Never decides eligibility.
5. **Change pipeline:** monitored sources → content diff → triage → rule release → golden-suite gate → affected-plan detection → notify reviewer/user.
6. **Human accountability:** RCIC review state actually gates release; corrections feed back into the golden suite.

Sol's estimate: Phase 0 hardening 10–17 person-weeks; Phase 1 bounded launch +22–36; Phase 2 scale +18–30. Opus's narrower private-beta punch list: ~10–14 engineer-weeks plus part-time RCIC and privacy counsel.

---

## 7. Business model and numbers

| Offer | Price (hypothesis) | Legal posture |
|---|---|---|
| **Strategy Copilot for RCIC practices** | ~C$149/month (2 users, ~15 new cases), ~C$8/extra case; test C$249 tier | Safest: licensee advises, cadet2 is a tool. Never price as a share of their fees |
| Free consumer planner | Free | Information with professional routing; no paywall on advice |
| Non-advice consumer utilities (deadline calendar, document vault) | Small subscription | Low risk if strictly non-advice |
| Verified Plan (consumer) | C$199–299 | Only with a real RCIC advisor of record and counsel sign-off |

Unit economics (from the market report, assumptions stated there): a full analysis costs ~US$0.45 on Sonnet 5.5 / ~US$0.90 on Opus 5.5; AI cost is not the constraint, reviewer time and acquisition are. Copilot: ~76% gross margin, ~C$4,500 LTV against C$600–1,200 CAC. Market sizing: ~C$445M TAM, ~C$78M SAM, ~C$1.5M revenue by year 3. That is a solid small business; venture scale requires employers or other countries.

Channels: 2–4 RCIC design partners who already publish content (ideally Punjabi, Tagalog or Yoruba-speaking audiences); same-day explainer content after each policy event; Reddit and diaspora communities; creators. Paid search is too expensive (~C$8–15 per click for legal terms).

---

## 8. 90-day plan

| Window | Product | Commercial / legal | Exit criterion |
|---|---|---|---|
| Days 0–14 | Items 1–3 (security, public surface, auth); freeze YouTube ingestion | Book immigration lawyer and privacy lawyer with the question list (§9); 15–20 RCIC discovery calls; sign 1–2 paid design partners | Anonymous Convex client rejected in CI; written structure memo from counsel in progress |
| Days 15–45 | Items 4–7; rules graph v1 for Express Entry + CRS + CLB + NOC + funds; golden suite with design partner | Draft ToS/privacy with counsel; choose Canada-region production; E&O + cyber quotes | ≥50 RCIC-validated golden profiles pass |
| Days 46–75 | PGWP → CEC chain, 3–5 PNP streams, citations, firm/client workspace with sign-off, expiry reminders | Paid pilot with 3–5 practices | Real client cases run end to end with RCIC sign-off |
| Days 76–90 | What-if simulator; policy-change monitor (manual triage) | Price test C$149 vs C$249; renewal conversations | Continue if ≥5 paying practices, measured prep-time savings, and at least one renewal intent; otherwise narrow or stop |

Sol's plan is more aggressive (5 paying practices by day 60, 10 by day 90, ~C$1,490 MRR). Given the engine rebuild and legal work for a small team, the table above uses the more conservative pace.

---

## 9. Decisions only you can make

1. Do you bring in an RCIC as co-founder, paid design partner or employee? Every analysis assumes a licensed domain owner.
2. B2B-first (recommended) or consumer-first with an advisor-of-record model?
3. Launch scope: which provinces and programs, and do you geofence Quebec?
4. Are you willing to fund a permanent rules-currency function (≈0.5–1 FTE) as a core cost?

Top questions for counsel (full list in [opus-regulatory-legal-trust.md](opus-regulatory-legal-trust.md) §10):
1. Is software-generated personalized pathway output "advice" by the company under s.91?
2. Which of our revenue models count as consideration?
3. How would per-case penalties be counted for a platform with thousands of users, and what is founders' personal exposure?
4. What does a compliant advisor-of-record arrangement look like, and can we employ the RCIC?
5. Is any payment from RCICs or lawyers to cadet2 permissible beyond plain software subscriptions?
6. Which privacy statutes apply, and what must the Quebec transfer assessment and AI vendor contracts include?
7. Do recommendations count as automated decisions under Quebec Law 25?
8. Can we use canada.ca content and YouTube transcripts commercially?
