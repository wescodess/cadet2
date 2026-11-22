# cadet2: Regulatory, Legal and Trust Risk Map

**Date:** 2026-11-16 · **Author:** Opus regulatory and risk analyst (AI) · **Status:** Pre-launch feasibility input

> **Not legal advice.** This report maps risks and suggests design mitigations for the founder to take to a Canadian immigration or regulatory lawyer and a privacy lawyer. Each factual claim cites its source. Most sources are 2025–2026 law-firm, government or trade-press pages. Many statutes could not be read in full: LégisQuébec, LSO and some canada.ca pages blocked automated fetches. Those points are marked **[VERIFY]**. Opinions and inferences are marked **[ANALYSIS]**.

Confidence legend: **[HIGH]** primary source read directly · **[MED]** reputable secondary source · **[LOW / VERIFY]** single or secondary source, conflicting sources, or text not read.

---

## 0. Executive summary

**The s.91 verdict.** cadet2's core output is ranked, personalized pathways, with "improvement actions" and "next-step plans". That is functionally what IRCC itself calls immigration *advice*. IRCC's own example of advice is "providing advice to a client on which citizenship or immigration option(s) to pursue" ([IRCC s.91 Q&A, May 2025](https://ccrweb.ca/sites/ccrweb.ca/files/2025-05/Section_91_IRPA_IRCC_Questions_and_Answers_May2025.pdf)). The prohibition also covers the period before any application is filed ([IRCC, Use of representatives](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/service-delivery/use-representatives/who-act.html)). If cadet2 charges users, directly or indirectly, for those recommendations and no licensed person is the advisor, it has a **high and newly cheap-to-enforce** risk:

- IRCC's administrative monetary penalty regime has applied since **October 28, 2026**. Penalties are C$5,000 per case of unauthorized paid advice, up to C$1.5M in total, and violators are publicly named ([Fragomen, Oct 29 2026](https://www.fragomen.com/insights/canada-new-penalties-for-unauthorized-or-fraudulent-immigration-and-citizenship-services.html)).
- The regime sits on top of criminal exposure: up to C$200,000 and/or 2 years under IRPA s.91(9) ([IRPA s.91](https://laws-lois.justice.gc.ca/eng/acts/I-2.5/section-91.html)).
- The CICC can also seek injunctions under CICC Act s.77 ([CICC Act s.77](https://laws-lois.justice.gc.ca/eng/acts/C-33.6/section-77.html)).

No Canadian case was found that decides whether *software output* counts as "advice" by its operator. Two signals point the same way. In *Moffatt v. Air Canada*, the tribunal held the company responsible for what its chatbot said ([McCarthy Tétrault](https://www.mccarthy.ca/en/insights/blogs/techlex/moffatt-v-air-canada-misrepresentation-ai-chatbot)). And regulators are openly worried about unlicensed AI advice ([New Canadian Media / FIPA](https://fipa.bc.ca/ai-is-reshaping-both-sides-of-canadas-immigration-fraud-battle/)). **[ANALYSIS]** Do not build the company on the theory that "the software, not us, gives the advice".

**Safest structures, in rank order [ANALYSIS]:**

1. **B2B "Strategy Copilot" for RCICs and lawyers.** The licensee is the advisor, and cadet2 is the tool. This mirrors Visto, which is restricted to regulated professionals.
2. **Licensed advisor-of-record "Verified Plan".** A CICC-licensed RCIC (or lawyer) genuinely reviews and adopts the plan before delivery, signs a CICC-compliant service agreement, and the client's advice fee is the licensee's.
3. **Free consumer planner with no consideration from the user**, funded by B2B revenue, plus *unbundled*, genuinely non-advice paid utilities such as document vault, deadline calendar and translation.
4. **An RCIC "compliance officer" alone does not cure s.91.** The licensee must actually be the one advising.

**Do not build:** a per-lead referral marketplace for RCICs or lawyers. CICC Code s.13 and law society rule 3.6-7 block it. The same goes for a paid consumer "AI report" or a "Plan Watch" subscription without a licensed advisor of record.

**Privacy must-dos:**

- Treat immigration status, refusal history, finances, nationality and family data as **sensitive**: express consent, minimization, and no names, emails or DOB in LLM prompts.
- Run a **Quebec Law 25 s.17 privacy impact assessment before any transfer outside Quebec**, and that includes other provinces.
- Pick **Convex `aws-ca-central-1`**. The region cannot be changed after creation ([Convex docs](https://docs.convex.dev/production/regions)).
- Enforce **OpenRouter Zero Data Retention** and turn off **Cloudflare AI Gateway payload logging**.
- Name a privacy officer, set up a breach register and response plan covering PIPEDA, Law 25 and Alberta PIPA, set a retention schedule, and support deletion, export and portability.
- Gate users at **18+**.
- Track **Bill C-36** (PPCDA, tabled June 15, 2026, not yet law) ([DLA Piper](https://www.dlapiper.com/en/insights/publications/2026/06/canada-tables-bill-c36-the-protecting-privacy-and-consumer-data-act)).

**Liability must-dos:**

- Write disclaimers that are true *and* prominent (Moffatt turned partly on the absence of one).
- Avoid unsubstantiated accuracy claims: the Competition Act s.74.01(1)(b) requires "adequate and proper" testing ([Competition Act](https://laws-lois.justice.gc.ca/eng/acts/c-34/section-74.01.html)).
- Stamp every result with its rule and source currency date.
- Put hard-stop escalation on status-expiry scenarios.
- Buy Tech E&O plus cyber insurance with affirmative AI coverage.
- Don't rely on liability waivers against Quebec or Ontario consumers ([Que. CPA s.10](https://elois.caij.qc.ca/P-40.1/article10); [Torys on Ont. CPA s.7](https://www.torys.com/insights/publications/2019/04/telus-v-wellman)).

**Today's repo:** there is no privacy policy, terms of service, consent capture, "not legal advice" copy or age gate anywhere under `app/`, `server/`, `convex/` or `shared/`. The grep for disclaimer, consent, privacy and legal advice returned nothing. Section 1 has details.

---

## 1. What the product actually does today (repo reality check)

| Area | Finding | Location |
|---|---|---|
| Data collected | Name, email, DOB, country of citizenship, marital status, dependants, education, NOC/TEER, work history, **current status in Canada**, CLB scores, **settlement funds**, **previous refusal**, budget, family in Canada, plus a 4,000-character **free-text `additionalContext`**. Users may put health, criminal or relationship details there. | `server/api/intake/submit.post.ts` (required fields), `server/utils/intake/intakeSchemas.ts` |
| Storage | Intake drafts, profile snapshots and Better Auth accounts live in NuxtHub Postgres (production host not set in repo). Recommendation runs, audit log and RAG sources live in Convex. | `server/auth.config.ts`, `server/db/migrations/postgresql/*`, `convex/schema.ts` |
| AI and RAG | OpenRouter, Cloudflare AI Gateway and Cloudflare AI Search. Ingests websites and **YouTube channel transcripts**. | `nuxt.config.ts`, `server/utils/rag-foundation.ts`, `server/utils/cloudflare-ai-search.ts`, `convex/ragSources.ts` |
| Trust UX | A trust boundary label exists ("source-backed", "inferred", "without direct evidence linkage"). | `app/lib/recommendations/citations.ts:60-70` |
| Governance | Pathway rules, evidence curation, trust review and audit log (Stories 5.x). | `convex/auditLog.ts`, admin pages |
| Legal copy | **None.** No terms, privacy notice, consent, disclaimer, age gate or AI disclosure. The landing page says "Protected planning starts in your workspace." | `app/pages/index.vue` |
| PRD intent | "Must clearly position itself as immigration decision support, not as unqualified legal representation." | `_bmad-output/planning-artifacts/prd.md:281-291` |

**[ANALYSIS]** The PRD's compliance intent is good, but nothing has been implemented yet. The admin governance layer (rules, evidence curation, audit) is a real asset. It is the backbone of a defensible "rules currency" function (section 7) and of an RCIC review workflow.

---

## 2. Unauthorized practice risk (IRPA s.91, CICC Act, provincial law)

### 2.1 The law

- **IRPA s.91(1)** says no person shall "knowingly, directly or indirectly, represent or advise a person for consideration", or offer to do so, in connection with an expression of interest, proceeding or application. The exemptions in s.91(2) cover law society members (lawyers and paralegals), Chambre des notaires du Québec members, and CICC licensees. s.91(4) covers entities acting under an agreement with Canada. Under s.91(9), penalties reach C$200,000 and/or 2 years on indictment, or C$40,000 and/or 6 months on summary conviction. The text is current to 2026-10-29 ([Justice Laws](https://laws-lois.justice.gc.ca/eng/acts/I-2.5/section-91.html)). **[HIGH]** The Citizenship Act s.21.1 mirrors this for citizenship ([IRCC Q&A](https://ccrweb.ca/sites/ccrweb.ca/files/2025-05/Section_91_IRPA_IRCC_Questions_and_Answers_May2025.pdf)).
- **Timing:** IRCC says the offence applies "at any stage of an immigration application or proceeding including the period before a proceeding begins" ([IRCC](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/service-delivery/use-representatives/who-act.html)). **[HIGH]** Pre-application pathway planning is therefore in scope.
- **CICC Act s.77** says a non-licensee must not (a) use the titles "immigration consultant", "citizenship consultant" or "international student immigration advisor", or variants, (b) hold themselves out as a licensee, or (c) represent or advise for consideration ([CICC Act s.77](https://laws-lois.justice.gc.ca/eng/acts/C-33.6/section-77.html)). **[HIGH]** The College can apply for a court injunction against contraventions of s.77 ([search summary of CICC Act page 4](https://laws-lois.justice.gc.ca/eng/acts/C-33.6/page-4.html)). **[MED: injunction section number not read]**
- **IRCC administrative penalties (new):**
  - IRCC brought into force, on **October 28, 2026**, monetary penalties of **C$5,000** for paid advice or representation without authorization and **C$15,000** for knowingly providing or helping provide false information, with a **C$1.5M** total cap and public naming. The regime applies inside or outside Canada ([Fragomen](https://www.fragomen.com/insights/canada-new-penalties-for-unauthorized-or-fraudulent-immigration-and-citizenship-services.html)). **[MED]**
  - Per IRCC's committee briefing, penalties are issued per application, so repeat violations stack, and IRCC can inspect records of anyone offering paid services ([IRCC CIMM note, Dec 4 2025](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/transparency/committees/cimm-dec-04-2025/fraud.html)). **[HIGH]**
  - IRCC's regulatory plan says it applies to "any person (individuals or businesses)" ([IRCC forward regulatory plan](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/acts-regulations/forward-regulatory-plan/list/governor-council-regulations-system-administrative-penalties-immigration-representation-advice.html)).
  - **[VERIFY]** The regulation numbers SOR/2026-220 and SOR/2026-221 come from secondary reporting. Confirm them in Canada Gazette Part II.
- **Criminal enforcement is real but rare.** The CBSA has prosecuted s.91 cases, for example an Edmonton guilty plea in 2024 and a Saskatoon conviction in 2022 ([CBSA 2024](https://www.canada.ca/en/border-services-agency/news/2024/05/cbsa-investigation-leads-to-conviction-of-immigration-consultant-for-fraud.html); [CBSA 2022](https://www.canada.ca/en/border-services-agency/news/2022/12/cbsa-investigation-leads-to-convictions-for-immigration-violations.html)). **[ANALYSIS]** The AMP regime changes the economics. A tech company with thousands of paid users is far easier to penalize administratively than to prosecute.

### 2.2 "Advice" vs "information": where IRCC draws the line

IRCC's May 2025 Q&A (published by the Canadian Council for Refugees) is the most specific official statement found **[HIGH]** ([PDF](https://ccrweb.ca/sites/ccrweb.ca/files/2025-05/Section_91_IRPA_IRCC_Questions_and_Answers_May2025.pdf)):

- **Not governed by s.91 (information and admin):** directing someone to the IRCC website, helping someone use a computer to view or upload documents, "transcribing responses and information provided by an applicant into IRCC application forms", and travel or medical arrangements.
- **Advice:** "providing advice to a client on which citizenship or immigration option(s) to pursue" and "advice to a client on how to respond to questions on an application form".
- **Consideration:** since **October 23, 2024**, IRCC reads this as "direct or indirect compensation by the client or on the client's behalf by a third party". A donation or other benefit given "in exchange for" advice is *indirect* consideration. An employee's salary paid solely by the employer is not consideration.
- The interpretation "does not constitute authorization" for anyone to advise.

**[ANALYSIS]** Mapping cadet2 features against that line:

| cadet2 output | Likely characterization | Notes |
|---|---|---|
| General explainers on how Express Entry, PGWP, PNP and so on work (not personalized) | Information | Low risk even if paid, but cite and keep current |
| Self-serve calculators (CRS score) and published-criteria checklists | Grey, leaning information | IRCC's own [Come to Canada tool](https://www.canada.ca/en/immigration-refugees-citizenship/services/come-canada-tool-immigration-express-entry.html) does this for free |
| "You appear to meet the published criteria for X, Y" | Grey | Personalized application of rules to facts |
| **Ranked recommendations, "best path", composed multi-step strategies** | **Advice** | Matches IRCC's own example almost word for word |
| **Improvement actions** ("retake IELTS to CLB 9", "apply to PNP stream Z first") | **Advice** | Strategic and personalized |
| Next-step plans tied to the user's status or deadlines | **Advice**, highest stakes | Status-lapse scenarios |
| Document checklists copied from IRCC lists, deadline calendar, tracking | Information or admin | Closer to IRCC's "administrative support" list |

**A disclaimer saying "this is information, not advice" does not change the character of a personalized recommendation.** IRCC's test is functional. **[ANALYSIS]**

### 2.3 Monetization scenarios vs "consideration" [ANALYSIS]

| Scenario | Consideration? | s.91 risk if no licensee is advisor |
|---|---|---|
| Consumer pays for an AI recommendation report | Direct | **High** |
| Subscription ("Plan Watch") that re-runs personalized plans | Direct | **High** |
| Free recommendations, but paid tier unlocks "full plan", "composed paths" or "improvement actions" | Direct (the paid tier *is* the advice) | **High** |
| Free recommendations, plus unrelated paid utilities (document vault, translation) | Arguably none for the advice. Risk that a court sees bundling as "indirect" | Medium-low. Unbundle cleanly and price utilities on their own merits |
| Employer, college or DLI pays for its people's plans | "On the client's behalf by a third party" | **High** (unless a licensee advises) |
| Bank or telecom sponsorship, or advertising | Probably not consideration from or for the client under IRCC's reading | Low for s.91. Conflict and disclosure issues remain (section 5) |
| Data monetization of user profiles | Uncertain whether it is a "benefit" from the client | Avoid. It is also a privacy problem |
| RCIC or lawyer pays cadet2 per referral | Not consideration from the client, but barred by CICC Code s.13 and LSO/LSBC r.3.6-7 (section 3) | **Don't** |
| Licensed RCIC is advisor of record; client pays the RCIC | s.91(2) exemption applies to the licensee | Low, if structured properly |
| B2B SaaS sold to RCICs and law firms | Licensee advises their own clients | Low |

### 2.4 The provincial layer: unauthorized practice of law

- **Ontario:** the *Law Society Act* s.1(5) treats anyone who applies "legal principles and legal judgment with regard to the circumstances or objectives of a person" as providing legal services ([Law Society Act](https://www.ontario.ca/laws/statute/90l08); [Slaw commentary](https://www.slaw.ca/2018/08/28/the-bencher-from-amazon)). **[MED]**
- **Quebec:** giving "legal advice and consultations" is reserved to advocates under s.128 of the *Act respecting the Barreau du Québec*, and illegal practice is an offence ([Barreau du Québec](https://barreau.qc.ca/en/doing-business-with-lawyer/file-complaint-illegal-practice)). **[MED]**
- **Federal paramountcy:** in *Law Society of BC v. Mangat*, 2001 SCC 67, federal authorization of non-lawyer immigration representatives prevailed over provincial law-society rules ([SCC](https://decisions.scc-csc.ca/scc-csc/scc-csc/en/1907/1/document.do)). **[ANALYSIS / VERIFY]** That protection plausibly covers *licensed* consultants acting under the federal scheme. It is unclear whether it helps an unlicensed software company. Ask counsel whether provincial unauthorized-practice exposure is additive.

### 2.5 Regulators' stance on AI tools

- Asked about AI, the CICC said licensees remain fully accountable for their work "regardless of the tools they may use". It has **no AI-specific guidance**. Commentators note that "unauthorized practice no longer necessarily involves an identifiable individual" ([New Canadian Media via FIPA](https://fipa.bc.ca/ai-is-reshaping-both-sides-of-canadas-immigration-fraud-battle/)). **[MED]**
- IRCC says its own analytics tools don't refuse applications ([IRCC transparency](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/transparency/digital-transparency-advanced-data-analytics/processing-applications.html)). This is context only and not relevant to private tools.
- **US analog:** the FTC finalized an order against DoNotPay's "robot lawyer" claims (vote January 16, 2025, announced February 2025). It requires US$193,000 in relief and bars claims that the service performs like a lawyer without evidence ([FTC](https://www.ftc.gov/node/87474)). **[HIGH]**

### 2.6 How existing players structure this

| Player | Structure | Lesson |
|---|---|---|
| **CanadaVisa+** | Free account-based eligibility report covering 30+ Express Entry pathways, "chances of success" and improvement ideas. Links to Cohen Immigration Law ([CIC News, Jul 2025](https://www.cicnews.com/2025/07/canadavisa-launches-next-generation-tool-to-help-newcomers-on-their-immigration-journeys-0754345.html)) | A free tool funnels to a licensed law firm. The consumer pays only the law firm |
| **IMMERGITY PR Masterplan** | Free AI-plus-rules planner run by an RCIC practice ([IMMERGITY](https://insights.immergity.ca/insights/immergity-pr-masterplan-canada-guide-2026), cited via sibling report) **[VERIFY]** | RCIC-owned free planner. Direct analog to cadet2 |
| **CRSCalculate, ITC iLand** | Free assessments that an RCIC reviews within 24–48 hours ([CRSCalculate](https://crscalculate.com/?p=1653); [ITC iLand](https://www.itciland.com/en/assessment)) | RCIC in the loop on the free tier |
| **BorderPass** | "Licensed Canadian immigration lawyers and immigration experts". Often free to students because institutions pay ([NorQuest](https://www.norquest.ca/international-student/immigration/borderpass/); [Assiniboine](https://assiniboine.net/borderpass)) | Third-party-paid model works *because* lawyers advise |
| **Visto.ai** | Reportedly usable only by regulated professionals ([Eleos & Vanguard](https://medium.com/eleos-vanguard/01000001-01001001-00100000-01001001-01001101-01001101-how-ai-technology-is-impacting-3-sectors-in-37455c99dd86)) **[LOW: company self-description]** | Pure B2B tool |
| **IRCC Come to Canada** | Free government questionnaire; "no immigration decision will be made based on your answers" ([IRCC](https://www.canada.ca/en/immigration-refugees-citizenship/services/come-canada-tool-immigration-express-entry.html)) | The free official baseline that paid tools must beat |
| **LSO Access to Innovation sandbox** | 5-year pilot launched October 2021. Lists "ImmInspect", an immigration application proofreader ([Law360](https://www.law360.ca/amp/articles/30992); [LSO participating providers](https://lso.ca/about-lso/access-to-innovation/participating-providers)) **[VERIFY: current status after late 2026]** | **[ANALYSIS]** A provincial sandbox cannot exempt anyone from *federal* s.91. It helps only with the Ontario legal-services layer |

### 2.7 Recommended defensible structures [ANALYSIS: validate with counsel]

**(a) B2B SaaS: "Strategy Copilot" for RCICs and lawyers (lowest risk).**
- The licensee runs intake on their own client, reviews the AI draft, edits it and delivers it under their name.
- cadet2 is a vendor and processor. Contract terms should cover confidentiality (CICC Code s.28 imposes indefinite confidentiality), the licensee's duty to supervise (s.38(2)), and written disclosure of outside assistance to the client (s.20(2)(a)) ([CICC Code](https://laws-lois.justice.gc.ca/eng/regulations/SOR-2022-128/FullText.html)).
- Price per seat or per usage, never as a percentage of legal fees, to stay clear of lawyer fee-splitting rules.

**(b) Licensed advisor of record: "Verified Plan".**
- An RCIC (or law firm) contracts directly with the consumer under a CICC Code s.24 written service agreement and is the advisor.
- Their review must be *real*. CICC Code s.38(3) lets a licensee delegate to non-licensees only if no unauthorized advice results.
- The June 2026 *CICC v Mittal* revocation, where unlicensed staff gave paid advice, shows the licensee carries the risk when the "loop" is fake ([HC Mag, 2026](https://www.hcamag.com/ca/specialization/employment-law/regulator-strips-immigration-consultants-licence-over-foreign-worker-recruitment-scheme/584219)).
- **Open questions for counsel:**
  - Can cadet2 *employ* the RCIC? Code s.26 exemptions assume the employer's "primary business ... is not the provision of immigration or citizenship consulting services". **[ANALYSIS]** That may not fit cadet2.
  - How should the consumer fee be split between a "platform fee" and an "advice fee"?
  - The CICC Code has no express fee-sharing ban (only s.31 "fair and reasonable" fees), but law society rule 3.6-7 does ban it for lawyers.

**(c) Free consumer planner + unbundled non-advice utilities + B2B revenue.**
- Keep personalized recommendations **free to the user with no strings**: no paywall on the advice, no "unlock your full plan".
- Monetize through B2B (a) and (b), and through clearly separate paid utilities such as encrypted document vault, IRCC-checklist organizer, and deadline calendar driven by dates the user enters.
- Main residual risks become negligence and consumer protection (section 5), not s.91.

**(d) RCIC compliance officer or partner: necessary but not sufficient.**
- Useful for rule curation and sign-off of the pathway library (the admin "rules" layer). It does not make consumer-paid personalized outputs lawful unless the licensee is the advisor for *that* user.

**(e) Avoid:**
- Paid AI-only consumer reports.
- Paid "Plan Watch" subscriptions without an advisor of record. This applies to the sibling monetization report's Plan Watch idea unless it runs under (b).
- Employer-paid plans without a licensee.
- Per-lead marketplaces.

### 2.8 Quebec specifics

- **Dual regime.** IRPA s.91(7.1) confirms the *Québec Immigration Act* applies to CICC members acting in Quebec ([IRPA s.91](https://laws-lois.justice.gc.ca/eng/acts/I-2.5/section-91.html)). Quebec's regulation defines a consultant as a natural person who, for remuneration, "**advises, assists or represents**" someone on an application to the Quebec Minister ([Règlement sur les consultants en immigration](https://www.legisquebec.gouv.qc.ca/en/document/cr/I-0.2.1,%20r.%201), search excerpt) **[VERIFY: page blocked]**. "Assists" is broader than the federal "advise or represent".
- **To practise as a recognized consultant**, a person needs:
  - a CICC licence,
  - French at level 7 or higher on the Quebec scale (about B2),
  - a pass on the Quebec immigration rules exam,
  - Quebec business registration.

  Recognition lasts 2 years, and recognized consultants appear in the Registre québécois ([Quebec.ca conditions](https://www.quebec.ca/immigration/consultants-immigration/obtenir-titre-consultant-immigration/conditions); [MIFI procedures guide, Dec 2021](https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/immigration/publications-adm/gpi/GPI_ch4_sect-4_4_Consultant.pdf)). **[HIGH]**
- Members of the Barreau and the Chambre des notaires are outside the consultant definition ([Quebec.ca](https://www.quebec.ca/immigration/consultants-immigration/obtenir-titre-consultant-immigration/conditions)). **[MED]**
- **[ANALYSIS] Launch recommendation:** keep Quebec-selected pathways (PSTQ/Arrima, Quebec CSQ) **out of personalized recommendations** at launch, or route them only to Quebec-recognized RCICs or Quebec lawyers. Also geofence or carefully handle Quebec-resident users. Several Quebec regimes stack here: Barreau s.128, Law 25 and the Charter of the French Language (sections 4 and 8).

---

## 3. Referral and lead-generation legality

**RCICs (CICC Code of Professional Conduct, SOR/2022-128)** ([full text](https://laws-lois.justice.gc.ca/eng/regulations/SOR-2022-128/FullText.html)) **[HIGH]**

- **s.13(1)(a):** a licensee "must not offer an inducement to any organization or person for recommending the licensee to a client".
- **s.13(1)(b):** a licensee must not solicit or accept an inducement for recommending an organization or person to a client.
- **s.13(2):** this does not apply to an inducement offered to "an agent who solicits clients" if "the licensee registers the agent's name with the College in advance".
- **s.44:** advertising must display the registered name and the URL of the CICC public register. It must not be false or misleading, must not "guarantee the success of an application", and must not imply a government relationship.

**[ANALYSIS]**

- Per-lead or per-conversion fees from RCICs to cadet2 are prohibited inducements unless cadet2 becomes a *registered agent*. That route ties cadet2 to the RCIC's supervision and conduct rules and may look like cadet2 "soliciting clients" for consideration. Get an opinion before relying on it.
- Flat, non-contingent SaaS or advertising fees are the safer pattern, but whether a flat "directory listing" is an "inducement for recommending" is untested.
- RCICs reviewing cadet2 plans must not receive anything from third parties (banks, test-prep firms, credential evaluators) for recommending them.

**Lawyers**

- **Ontario:** since April 27, 2017, referral fees *between licensees* are capped, must be recorded, and up-front referral fees are banned ([LSO news release via Newswire](https://newswire.ca/news-releases/law-society-moves-decisively-to-protect-public-by-capping-referral-fees-620631293.html)). Rule 3.6-7, as described by several law societies, bars sharing fees with non-licensees and rewarding non-licensees for referrals ([Lawlibrary.ca / Law Society of Saskatchewan summary](https://lawlibrary.ca/2018/11/01/referral-fees-what-you-should-know/); [Canadian Lawyer](https://canadianlawyermag.com/practice-areas/personal-injury/navigating-ontarios-referral-fee-landscape-a-guide-for-personal-injury-lawyers/391778)). **[MED: LSO text not fetched (403)]**
- **BC:** referral fees between lawyers are allowed when the referral is based on expertise, not on a conflict, with the client's knowledge and consent, and without increasing the client's total ([LSBC ADMA](https://www.lawsociety.bc.ca/lsbc/apps/practice-support/adma/concept.cfm?ccid=50)). Ethics Advisory EA-2025-03 (August 18, 2025) restates that a lawyer's fees "are only to be shared among lawyers or law firms", with narrow profit-sharing exceptions ([LSBC EA-2025-03](https://www.lawsociety.bc.ca/Website/media/Shared/docs/publications/code/advisories/Ethics_Advisory_-_Splitting_fees_-_non-lawyers.pdf)). **[HIGH]**
- **US contrast (not binding):** New York has treated pay-per-lead matching as a prohibited referral fee (Opinion 1213, 2021), but allows lead payments where the generator does not *recommend* lawyers (Opinion 1267, 2024) ([NYSBA 1213](https://nysba.org/ethics-opinion-1213/); [NYSBA 1267](https://nysba.org/ethics-opinion-1267-paying-for-a-recommendation-or-referral/)). **[ANALYSIS]** If cadet2 ever lists lawyers, use flat advertising with neutral, non-recommending presentation, and get LSO and LSBC opinions first.

**Bottom line:** do not build a pay-per-referral marketplace. The "find a licensed professional" feature should link neutrally to the CICC public register ([IRCC representative pages](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-representative/file-complaint-against-representative.html)) and law society directories, or to paying B2B customers under a flat SaaS fee, with clear disclosure.

---

## 4. Privacy and data

### 4.1 Which laws apply [MED: confirm with privacy counsel]

| Law | When it applies to cadet2 | Key obligations |
|---|---|---|
| **PIPEDA** (federal) | Commercial collection, especially interprovincial and cross-border | Meaningful consent, purpose limits, safeguards, access and correction, accountability. Breaches posing a "real risk of significant harm" must be reported to the OPC and individuals, and **every** breach recorded for 24 months ([Breach Regulations SOR/2018-64](https://gazette.gc.ca/rp-pr/p2/2018/2018-04-18/html/sor-dors64-eng.html); [OPC guidance](https://priv.gc.ca/en/privacy-topics/business-privacy/safeguards-and-breaches/privacy-breaches/respond-to-a-privacy-breach-at-your-business/gd_pb_201810/)). The OPC added a RROSH self-assessment tool in March 2025 ([Blaney](https://www.blaney.com/articles/real-risk-of-significant-harm-increases-reporting-obligations)) |
| **Quebec Law 25** (private-sector act as amended) | Collecting from Quebec residents or carrying on business in Quebec | Privacy officer (the CEO by default). Incident register, plus notice to the CAI and individuals for "risk of serious injury" incidents. Consent from a parent or guardian for minors under 14. Penalties up to C$10M or 2% (administrative) and C$25M or 4% (penal) ([CFIB](https://cfib-fcei.ca/quebec-law-25); [McMillan](https://mcmillan.ca/insights/privacy-101-obligations-under-quebecs-new-act-25-part-2-why-you-must-now-record-and-report-privacy-violations/)). **PIA before communicating personal information outside Quebec (s.17)**, other provinces included ([HiloTech](https://hilotech.ca/en/wiki/law-25/cross-border-transfers)). Notice and a right to submit observations for decisions based **exclusively** on automated processing (s.12.1) ([Clyde & Co](https://www.clydeco.com/en/insights/2023/09/law-25-quebec-s-second-wave-of-new-privacy-amendme)) **[MED/VERIFY: statute text blocked]** |
| **Alberta PIPA** | Organizations in Alberta | Mandatory breach notification to the Commissioner already exists. Reform recommendations issued February 21, 2025 (12 recommendations) with no confirmed bill ([Mondaq/Alberta](https://www.mondaq.com/canada/privacy-protection/1609618/as-federal-legislation-stalls-alberta-continues-to-move-forward-with-its-privacy-reform-efforts); [BDP Law](https://www.bdplaw.com/insights/how-to-handle-mandatory-breach-notifications-under-canadian-privacy-law)) |
| **BC PIPA** | Organizations in BC | Still **no** mandatory private-sector breach notification as of McCarthy's 2026 series; voluntary notification recommended ([McCarthy 2026](https://www.mccarthy.ca/en/insights/publications/navigating-the-legislative-landscape-on-data-breaches-2026-data-breach-insights-part-3)) **[MED]** |
| **GDPR / UK GDPR** | Only if cadet2 *targets* people in the EU or UK (EU-language marketing, euro pricing, EU-specific campaigns). Nationality is irrelevant; location at the time of the offer counts, and payment is not required ([EDPB Guidelines 3/2018](https://edpb.europa.eu/sites/edpb/files/files/file1/edpb_guidelines_3_2018_territorial_scope_en.pdf)) | Article 27 EU representative, lawful basis, Article 9 and 10 data (health, criminal), transfer mechanisms. **[ANALYSIS]** Avoid targeting the EU at launch |

### 4.2 Sensitive data

- The OPC says any information can be sensitive in context, and that medical and income records are almost always sensitive ([OPC Interpretation Bulletin: Sensitive Information](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda-compliance-help/pipeda-interpretation-bulletins/interpretations_10_sensible/)). **[HIGH]**
- **[ANALYSIS]** For cadet2 these are sensitive: immigration status, prior refusals, settlement funds and budget, nationality, marital and family status, and anything about health or criminality, since inadmissibility is a core immigration topic. The free-text box will collect these unprompted.
- Required design responses:
  - express, granular consent at intake,
  - a warning in the free-text field ("don't include medical or criminal details; ask a licensed professional"),
  - server-side detection of health and criminal keywords that routes to a "requires licensed review" message instead of LLM reasoning,
  - encryption at rest, and
  - admin-access logging. The existing `auditLog` can extend to *read* access on user profiles.

### 4.3 Cross-border transfers and the vendor stack

| Vendor | Current or likely data location | Action |
|---|---|---|
| **Convex** | Region is chosen per deployment and **cannot be changed later**. Options are `aws-us-east-1`, `aws-eu-west-1`, `aws-ap-southeast-2` and **`aws-ca-central-1`**; non-US regions cost 1.3× ([Convex docs](https://docs.convex.dev/production/regions)). EU launched February 6, 2026 ([Convex changelog](https://ship.convex.dev/changelog/eu-region-hosting-dublin)) | Create the production deployment in **ca-central-1**. Confirm where backups and logs live **[VERIFY]**. Sign Convex's DPA |
| **NuxtHub Postgres** (auth, intake, snapshots) | The production host is not set in the repo | Choose a Canadian region. Document it in the privacy notice |
| **OpenRouter** | Routes to many model providers. Prompt logging is opt-in, and a **ZDR** setting restricts routing to zero-retention endpoints, globally or per request ([OpenRouter ZDR](https://openrouter.ai/docs/guides/privacy/zdr); [Logging](https://openrouter.ai/docs/guides/privacy/logging)). Some providers keep data for 30 days for abuse monitoring ([provider logging](https://www.openrouter.ai/docs/guides/privacy/provider-logging.md)) | Enforce ZDR account-wide. Pin providers. List sub-processors in the privacy notice |
| **Cloudflare AI Gateway** | Stores request and response logs unless disabled. `cf-aig-collect-log-payload: false` keeps metadata only ([CF changelog, Mar 17 2026](https://developers.cloudflare.com/changelog/post/2026-03-17-collect-log-payload-header/); [CF logging docs](https://developers.cloudflare.com/ai-gateway/observability/logging/)) | Disable payload logging for user-profile prompts. Set log retention and auto-deletion |
| **Cloudflare AI Search** | Indexes curated public sources only (by design) | Make sure user profiles are never indexed |

- **PIPEDA cross-border:** under the OPC's 2009 guidelines, which it reaffirmed in 2019, an organization stays accountable for data it transfers. It should tell individuals their information may be processed abroad and accessed by foreign authorities ([OPC guidelines](https://www.priv.gc.ca/en/privacy-topics/personal-information-transferred-across-borders/gl_dab_090127/); [BLG 2019](https://www.blg.com/en/insights/2019/09/opc-maintains-status-quo-as-it-concludes-consultation-on-cross-border-dataflows)). **[MED]**
- **Minimization for LLM calls [ANALYSIS]:**
  - Strip name, email and DOB. Send age band, citizenship and coarse facts.
  - Pseudonymize run IDs.
  - Never send free text verbatim without PII scrubbing.
  - Prefer deterministic rule evaluation, which is already in `evaluatePathwayEligibility.ts`, over LLM inference for eligibility.

### 4.4 Rights, retention, minors and AI-specific duties

- **Access, correction, deletion and portability:** Law 25 adds a data-portability right. Bill C-36 would carry forward disposal and mobility rights ([DLA Piper](https://www.dlapiper.com/en/insights/publications/2026/06/canada-tables-bill-c36-the-protecting-privacy-and-consumer-data-act)). Build self-serve export (JSON/PDF) and account deletion that cascades to Postgres, Convex, Gateway logs and vendor stores. Set a retention schedule, for example deleting inactive profiles after 24 months **[ANALYSIS]**.
- **Minors:**
  - Law 25 requires consent from a parent or guardian under 14 ([CFIB](https://cfib-fcei.ca/quebec-law-25)).
  - The OPC launched Canada's first **Children's Privacy Code on October 20, 2026**. It is not legally binding, but the OPC will refer to it ([OPC news release](https://www.priv.gc.ca/en/opc-news/news-and-announcements/2026/nr-c_261020/); [Gowling WLG](https://gowlingwlg.com/en/insights-resources/articles/2026/canada-childrens-privacy-code)).
  - Recommendation: an **18+ attestation** at signup, and a block on study-permit-for-minors flows unless a parent or guardian is the account holder.
- **Dependants' data:** the principal applicant enters information about a spouse and children. The notice needs to cover third-party data, and the user should confirm they have authority to share it.
- **AI and automated decisions:**
  - Law 25 s.12.1 applies to decisions "based exclusively on automated processing". **[ANALYSIS]** A recommendation is arguably not a "decision" about the person, but give the notice anyway: what data was used, the main factors, and how to request human review.
  - The OPC and provincial regulators issued **generative AI principles (December 7, 2023)** covering consent, necessity, openness and accountability ([OPC](https://priv.gc.ca/en/opc-news/news-and-announcements/2023/nr-c_231207/)).
- **Federal reform status:**
  - **Bill C-36 (PPCDA)** was tabled June 15, 2026. It would replace PIPEDA's Part 1 and requires assessment and mitigation before cross-border transfers. It requires automated decision disclosure where an effect is "legal or similarly significant", and has the Commissioner consider children's best interests. Administrative penalties reach the greater of C$10M or 3% of global revenue. Its coming into force is tied to Bill C-34 (the online safety bill). There is **no standalone AI law**, since AIDA was dropped ([DLA Piper](https://www.dlapiper.com/en/insights/publications/2026/06/canada-tables-bill-c36-the-protecting-privacy-and-consumer-data-act)).
  - LEGISinfo showed it at second reading with no recorded debate ([LEGISinfo](https://www.parl.ca/LegisInfo/en/bill/45-1/C-36)). **[VERIFY: status after September 2026]**
  - The federal "AI for All" strategy (June 4, 2026) relies on privacy and online-safety bills rather than AI-specific regulation ([Michael Geist](https://www.michaelgeist.ca/2026/06/ai-for-all-details-to-follow-government-releases-a-big-spending-ai-strategy-that-is-still-short-on-the-specifics-that-matter/); [BNN Bloomberg](https://www.bnnbloomberg.ca/business/politics/2026/06/02/federal-governments-new-ai-strategy-will-emphasize-trust-minister-says/)).
  - ISED ran an AI-transparency consultation from July 23 to September 23, 2026 ([BLG](https://www.blg.com/en/insights/2026/10/ai-transparency-the-competition-bureau-weighs-in)).
- **EU AI Act (only if serving EU users):**
  - Article 50 transparency duties, such as disclosing interaction with AI, still apply from August 2, 2026. The digital omnibus moved stand-alone Annex III high-risk deadlines to December 2, 2027 ([Gibson Dunn](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/); [Lewis Silkin](https://www.lewissilkin.com/insights/2026/07/27/the-digital-omnibus-on-ai-enters-into-force-today-102nedo)).
  - **[VERIFY]** The Annex III migration category targets systems used by or for public authorities, so a private planner is probably not "high-risk", but confirm.

---

## 5. Consumer protection and liability

### 5.1 Misleading representations

- **Competition Act s.74.01(1):**
  - (a) bars representations that are false or misleading in a material respect;
  - (b) bars performance or efficacy claims "not based on an adequate and proper test thereof", with the burden on the business ([Competition Act](https://laws-lois.justice.gc.ca/eng/acts/c-34/section-74.01.html)). **[HIGH]**
  - Since June 2025, private parties can bring deceptive-marketing cases to the Competition Tribunal ([Osler](https://www.osler.com/en/insights/reports/deceptive-marketing-provisions-continue-to-be-enforcement-priority/); [CMA](https://thecma.ca/topic/articles/2025/07/29/pricing-claims-and-practices--an-overview-for-canadian-marketers)). **[MED]**
- **Competition Bureau on AI (September 23, 2026 submission):**
  - There is "no 'AI exception'".
  - Chatbot answers are representations under the deceptive-marketing rules.
  - Labels alone "may not be sufficient".
  - Accuracy claims need testing that reflects the tool as deployed.
  - Keep records supporting claims ([BLG, Oct 2026](https://www.blg.com/en/insights/2026/10/ai-transparency-the-competition-bureau-weighs-in)). **[MED]**
- **[ANALYSIS] Copy to avoid or substantiate:**
  - "accurate", "trusted", "best pathway", "your chances", "approval odds", "guaranteed", "official" or "verified" (unless verified by a named licensee);
  - anything implying government affiliation;
  - Canada wordmark or Arms. The Canada wordmark, Arms and flag symbol cannot be reproduced without authorization ([Canada.ca terms](https://www.canada.ca/en/transparency/terms.html)).
  - Any "X% of users found their path" style statistic needs a test-set evaluation with a written methodology.

### 5.2 Liability if a user relies on a wrong recommendation

- **Moffatt v. Air Canada, 2024 BCCRT 149:**
  - The airline was liable in negligent misrepresentation for its chatbot's wrong answer.
  - Its argument that the bot was a "separate legal entity" failed.
  - Commentators flagged the lack of a disclaimer and of a pointer to authoritative policy as key ([McCarthy](https://www.mccarthy.ca/en/insights/blogs/techlex/moffatt-v-air-canada-misrepresentation-ai-chatbot); [WeirFoulds](https://www.weirfoulds.com/moffatt-v-air-canada-bot-betrayal-and-negligent-misrepresentation)).
  - The test has five elements: duty of care, inaccurate representation, negligence, reasonable reliance, and damages. **[HIGH]**
- **[ANALYSIS] The worst case is status lapse.** A user relies on a plan, misses an extension or maintained-status window, falls out of status, or files a weak application. Their losses (lost job, removal, lost years) are much larger than a refund. The *more* cadet2 markets trust and actionability (PRD success metric: "80% rate it trustworthy"), the *stronger* the reliance element becomes.
- **Exclusion clauses are weak against consumers:**
  - Quebec CPA s.10 prohibits "any stipulation whereby a merchant is liberated from the consequences of his own act" ([CAIJ e-Lois](https://elois.caij.qc.ca/P-40.1/article10)). **[HIGH]**
  - Ontario's CPA s.7 preserves consumers' right to sue and join class actions despite arbitration clauses ([Torys on TELUS v. Wellman](https://www.torys.com/insights/publications/2019/04/telus-v-wellman)). **[MED]**
  - Standard-form clauses can be unconscionable (*Uber v. Heller*, 2020 SCC 16) ([SCC case in brief](https://scc-csc.gc.ca/judgments-jugements/cb/2020/38534/)). **[HIGH]**
  - **Mitigation is mainly product design** (section 9), with terms as a secondary layer.
- **Subscriptions and auto-renewal:**
  - **Quebec Bill 10** was assented June 12, 2026. Most provisions take effect September 12, 2026, including an online "cancel button" for online subscription contracts ([Fasken, Jul 2026](https://www.fasken.com/en/knowledge/2026/07/bill-10-what-you-need-to-know-about-the-new-rules); [Lavery](https://www.lavery.ca/en/publications/our-publications/6464-Bill-10-Significant-amendments-to-the-Consumer-Protection-Act-and-heightened-risk-for-merchants.html)). **[MED]**
  - Ontario's *Consumer Protection Act, 2023* (Royal Assent December 6, 2023) is **not yet in force** in the sources found. When it is, it will require express consent for renewals and easy cancellation ([e-Laws](https://www.ontario.ca/laws/statute/23c23); [Osler](https://www.osler.com/en/insights/reports/2025-legal-outlook/evolving-consumer-protection-laws-will-affect-suppliers/)). **[VERIFY]**
  - Build to the stricter standard everywhere: one-click cancel, renewal reminders, and express renewal consent.
- **AI disclosure:**
  - No federal AI-disclosure statute applies yet (section 4.4).
  - Under the Competition Bureau's position, AI-generated statements are still representations.
  - **[ANALYSIS]** Disclose clearly which text is AI-drafted and which is rule-derived. The existing "trust boundary" labels are a good start.

### 5.3 Insurance

- **Tech E&O and cyber.** Canadian brokers report that AI exposures are often handled "silently", that AI endorsements can be narrower than they look, and that coverage gaps open "when AI becomes the product" ([Insurance Business: AI endorsements](https://www.insurancebusinessmag.com/ca/news/professional-liability/that-ai-endorsement-on-your-clients-eando-policy-may-be-worth-less-than-it-looks-590478.aspx); [AI as product](https://www.insurancebusinessmag.com/ca/news/professional-liability/when-ai-becomes-the-product-not-the-tool--the-eando-gap-opening-591051.aspx)). **[MED]**
- **[ANALYSIS]** Buy:
  - Tech E&O with **affirmative AI coverage**,
  - cyber covering breach response and regulatory defence where insurable,
  - D&O once the company raises funding.
- Ask the broker specifically about exclusions for "professional services", "legal advice" or "unauthorized practice" and for regulatory fines, since AMPs are probably uninsurable. Partner RCICs must carry their own CICC-required professional liability insurance. Contract for indemnities both ways.

---

## 6. Trust and fraud context

- **Ghost consultants and fraud are a known Canadian problem:**
  - CBC: "Unlicensed individuals acting as licensed consultants are known as ghost consultants" ([CBC Windsor](https://www.cbc.ca/news/canada/windsor/rising-problem-of-ghost-consultancies-in-canada-1.7485089)).
  - IRCC says it will not deal with unauthorized paid representatives. Applicants stay responsible for what is submitted ([IRCC complaints](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigration-citizenship-representative/file-complaint-against-representative.html); [IRCC fact sheet](https://www.canada.ca/content/dam/ircc/documents/pdf/english/pub/3247-a-factsheet-unlicensed-consultant-eng.pdf)).
  - Misrepresentation, including misrepresentation by a consultant without the applicant's knowledge, can trigger a **5-year bar** under IRPA s.40 ([Meurrens](https://meurrensonimmigration.com/the-five-year-bar-on-misrepresentation/)). **[MED]**
- **Regulator credibility has gaps:** critics say the CICC took about 30 months to suspend one consultant after complaints ([CBC](https://amp.cbc.ca/lite/story/1.7423712)). **[MED]** The 2026 reforms that took effect **July 15, 2026** add a client compensation fund for dishonest acts dating back to November 23, 2021, and a richer public register ([CIC News, May 2026](https://www.cicnews.com/2026/05/canada-to-launch-new-regulations-for-immigration-consultants-in-july-including-compensation-fund-for-fraud-victims-0575073.html); [CIC News, Jul 2026](https://www.cicnews.com/2026/07/new-rules-let-clients-of-immigration-consultants-recover-losses-dating-back-to-2021-0777992.html)). **[MED]**
- **LMIA and job-offer fraud:**
  - IRCC messaging says LMIAs are never sold, and no one can guarantee a job or visa ([CIC News on IRCC Fraud Prevention Month](https://www.cicnews.com/2023/03/march-is-irccs-fraud-prevention-month-0333399.html)).
  - The Canadian Anti-Fraud Centre warns that fake LMIA offers target newcomers ([money.ca](https://money.ca/employment/canada-job-scams-fraud-cafc-warning-2025)).
  - The June 2026 *Mittal* revocation involved arranged LMIA job offers for clients who never applied or interviewed ([HC Mag](https://www.hcamag.com/ca/specialization/employment-law/regulator-strips-immigration-consultants-licence-over-foreign-worker-recruitment-scheme/584219)). **[MED]**
- **IRCC integrity data:** misrepresentation was cited in 1.8% of refusals in 2024–2025. The new study permit refusal rate was 59% in 2025 ([IRCC CIMM, Apr 2026](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/transparency/committees/cimm-apr-22-2026/fraud-compliance-international-student-program.html)). **[HIGH]**

**Positioning as trustworthy [ANALYSIS]:**

1. **Provenance on every claim:** official URL, retrieval date, "last verified" date, and the role of whoever verified it (for example "rules reviewed by licensed RCIC #R******, 2026-11-10" with a link to the register). Existing citation and trust-boundary code is the place to add these fields.
2. **Licensed-reviewer badges only when true.** Each badge needs the RCIC's registered name and CICC register link (CICC Code s.44(1)(a)–(b) requires both in RCIC advertising) ([CICC Code](https://laws-lois.justice.gc.ca/eng/regulations/SOR-2022-128/FullText.html)). Never imply government affiliation.
3. **Anti-fraud by design:**
   - Refuse and educate on prompts about buying LMIAs or job offers, fake documents, hiding refusals or inflating funds.
   - Show red-flag education: "No one can sell you an LMIA."
   - Add a "verify your representative" helper and links for reporting fraud to IRCC and the CBSA.
   - Encourage truthful disclosure of prior refusals.
   - Never generate employment letters, reference letters or proof-of-funds language.
4. **Data security as trust.** A database of refusal histories, statuses and funds is a fraud target. Use MFA, admin least privilege, read-access logging and a published security page.
5. **Source licensing:**
   - Canada.ca content may be reproduced *non-commercially* with attribution. Commercial redistribution needs written permission ([Canada.ca terms](https://www.canada.ca/en/transparency/terms.html)). **[ANALYSIS]** Quote and link rather than republishing, and ask counsel about RAG excerpts in a paid product.
   - YouTube's terms bar automated access except by permitted search engines or with prior written permission ([YouTube ToS (CA)](https://www.youtube.com/static?gl=CA&template=terms); [summary](https://conductatlas.com/platform/youtube-ads/youtube-terms-of-service/provision/CA-P-022046/prohibition-on-automated-access-without-permission/)). **[MED]** The current `youtube_channel` ingestion (`convex/ragSources.ts`) needs either an API-compliant method or creator licences. Treat YouTube as *low-authority* evidence that is never cited as the source of a rule.

---

## 7. Policy volatility as an operational risk

### 7.1 How fast rules change

IRCC's **program delivery updates** page lists about **140 dated updates in 2026 (through November 16)** and about **120 in 2025**, roughly 2–3 per week ([IRCC Program delivery updates](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/updates.html), machine-counted on 2026-11-16) **[MED: automated count, verify]**. These are officer instructions, not all policy changes, but they show the cadence.

**Notable policy changes, 2024 to November 2026 (about 33):**

| # | Date | Change | Source |
|---|---|---|---|
| 1 | Jan 2024 | Study permit cap and Provincial Attestation Letters | [immigration.ca 2024 review](https://immigration.ca/canada-temporary-residence-changes-in-2024-a-comprehensive-review/) |
| 2 | Sep 2024 | 2025 cap (437k) now includes master's and PhD students | [CIC News](https://www.cicnews.com/2024/09/breaking-ircc-announces-tighter-cap-for-international-student-permits-and-changes-to-pgwp-eligibility-0946598.html) |
| 3 | Sep 1, 2024 | Curriculum-licensing programs no longer PGWP-eligible | [immigration.ca](https://immigration.ca/canada-temporary-residence-changes-in-2024-a-comprehensive-review/) |
| 4 | Nov 1, 2024 | PGWP language (CLB 7 / CLB 5) and field-of-study rules | [CIC News](https://www.cicnews.com/2024/09/breaking-ircc-announces-tighter-cap-for-international-student-permits-and-changes-to-pgwp-eligibility-0946598.html) |
| 5 | 2024 | Low-wage LMIA cap at 10%; LMIA validity cut to 1 year | [immigration.ca](https://immigration.ca/canada-temporary-residence-changes-in-2024-a-comprehensive-review/) |
| 6 | 2024 | High-wage LMIA threshold raised to median plus 20% | same |
| 7 | 2024 | Visitor-to-work-permit policy ended | same |
| 8 | Oct 2024 | 2025–27 Levels Plan: PR about −20%; first TR targets | [CIC News mid-2025](https://www.cicnews.com/2025/07/2025-mid-year-review-major-immigration-policies-and-changes-implemented-0757271.html) |
| 9 | Oct 23, 2024 | s.91 "consideration" reinterpretation | [IRCC Q&A](https://ccrweb.ca/sites/ccrweb.ca/files/2025-05/Section_91_IRPA_IRCC_Questions_and_Answers_May2025.pdf) |
| 10 | Nov 8, 2024 | School-transfer rules for students | [CIC News top 10 2025](https://www.cicnews.com/2026/01/the-10-biggest-canadian-immigration-policy-changes-of-2025-0164104.html) |
| 11 | Jan 21, 2025 | Family open work permit restrictions | same |
| 12 | Jan 2025 | PNP allocations cut 50% (later partly restored) | same |
| 13 | Feb 27, 2025 | Express Entry categories: Education added, Transport removed | [CIC News mid-2025](https://www.cicnews.com/2025/07/2025-mid-year-review-major-immigration-policies-and-changes-implemented-0757271.html) |
| 14 | Mar 25, 2025 | CRS job-offer points removed | [CIC News top 10](https://www.cicnews.com/2026/01/the-10-biggest-canadian-immigration-policy-changes-of-2025-0164104.html) |
| 15 | Mar 31, 2025 | Home Care Worker pilots open | [CIC News mid-2025](https://www.cicnews.com/2025/07/2025-mid-year-review-major-immigration-policies-and-changes-implemented-0757271.html) |
| 16 | Jun–Jul 2025 | PGWP field list: 119 added, 178 removed (removals deferred) | [CIC News Jan 2026](https://www.cicnews.com/2026/01/immigration-no-longer-top-concern-for-canadians-is-the-era-of-rapid-change-over-0166533.html) |
| 17 | Jun 3, 2025 (retroactive) | One-year asylum bar (Bill C-12) | [Moving2Canada](https://moving2canada.com/news/bill-c12-is-now-law-changes-to-immigration-and-asylum-canada/) |
| 18 | Aug 21, 2025 | Upfront medical exam for Express Entry PR | [IRCC PDU](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/updates/2025-upfront-medical-examination-express-entry.html) |
| 19 | 2025 | Maintained status rule changes | [CIC News top 10](https://www.cicnews.com/2026/01/the-10-biggest-canadian-immigration-policy-changes-of-2025-0164104.html) |
| 20 | 2025 | Closed work permit employer-change policy extended | same |
| 21 | Nov 2025 | 2026–28 Levels Plan: PR 380k/yr; sharp TR cuts | [Law360](https://www.law360.com/articles/2407765) |
| 22 | Dec 15, 2025 | Bill C-3 citizenship by descent | [CIC News top 10](https://www.cicnews.com/2026/01/the-10-biggest-canadian-immigration-policy-changes-of-2025-0164104.html) |
| 23 | Dec 2025 | Physicians Express Entry category | same |
| 24 | Dec 31, 2025 | Start-Up Visa and EMPP closed; Self-Employed paused | [CIC News Jan 2026](https://www.cicnews.com/2026/01/immigration-no-longer-top-concern-for-canadians-is-the-era-of-rapid-change-over-0166533.html) |
| 25 | Feb 18, 2026 | 2026 Express Entry categories (3 new) | [Moving2Canada](https://moving2canada.com/news/2026-express-entry-categories/) |
| 26 | Mar 12, 2026 | Start-Up and Self-Employed intake pause | [IRCC PDU list](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/updates.html) |
| 27 | Mar 16, 2026 | Category-based selection occupational requirements standardized | [IRCC PDU](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/updates/2026-cbs-express.html) |
| 28 | Mar 2026 | Quebec bridge work-permit measure | [IRCC](https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/03/new-immigration-measure-to-support-quebec-workers-and-employers.html) |
| 29 | Mar 26, 2026 | Bill C-12 Royal Assent; new refugee-claim ineligibility grounds | [CIC News](https://www.cicnews.com/2026/03/canada-passes-greatest-immigration-reforms-in-decades-0372876.html) |
| 30 | Apr 2026 | In-Canada Workers Initiative (33,000 TR-to-PR) | [IRCC](https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/04/filling-labour-gaps-in-smaller-communities-by-accelerating-permanent-residence-for-33000-workers.html) |
| 31 | Apr 30, 2026 | PR fee increases | [IRCC PDU list](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/updates.html) |
| 32 | Jul 15, 2026 | CICC regulations and compensation fund | [CIC News](https://www.cicnews.com/2026/07/new-rules-let-clients-of-immigration-consultants-recover-losses-dating-back-to-2021-0777992.html) |
| 33 | Oct 28, 2026 | AMPs for unauthorized advice | [Fragomen](https://www.fragomen.com/insights/canada-new-penalties-for-unauthorized-or-fraudulent-immigration-and-citizenship-services.html) |

That works out to **roughly one material policy change a month, plus 2–3 operational instruction changes a week**, before counting about 11 provincial and territorial PNPs and Quebec. **[ANALYSIS]** The "era of rapid change" is not over: CIC News expected many 2026 changes still lacking dates ([CIC News](https://www.cicnews.com/2026/01/immigration-no-longer-top-concern-for-canadians-is-the-era-of-rapid-change-over-0166533.html)).

### 7.2 A "rules currency" function [ANALYSIS]

**Sources to monitor:**
- IRCC news releases, program delivery updates and Ministerial Instructions (Express Entry rounds and categories)
- Canada Gazette Part I and Part II
- ESDC (TFWP and LMIA)
- all PNP pages
- Quebec MIFI
- IRB
- CICC and IRCC representative rules

Automate diffing of these pages and feed alerts into the existing admin trust-review queue.

**Staffing at MVP:**
- 1 licensed RCIC (0.5–1 FTE, partner or contractor) who owns rule sign-off;
- 1 policy analyst or ops person (1 FTE) for monitoring and evidence curation;
- an engineering on-call rotation for rule deploys.

Scale roughly 1 analyst per 25–40 active pathway definitions **[ASSUMPTION]**.

**SLAs:**

| Tier | Example | Detect | Triage | Interim action | Rule fix plus licensed sign-off | User notice |
|---|---|---|---|---|---|---|
| T1: eligibility or status-critical | CRS points removed; PGWP rule change; intake pause | ≤24h | ≤1 business day | Auto "under review" banner and confidence downgrade on affected pathways within 24h | ≤5 business days | Saved plans affected: within 48h of triage |
| T2: material but not eliminating | Fee change; processing time; new category | ≤3 days | ≤3 days | Caveat banner | ≤10 business days | Next digest |
| T3: operational | Officer instruction wording | Weekly | Weekly | none | Next release | none |

**Data model (extends existing pathway rules and evidence):**
- `effectiveFrom` / `effectiveTo`
- `lastVerifiedAt` and `verifiedBy` (with a licensed flag)
- `sourceRetrievedAt`
- `rulesVersion` stamped on every `recommendation_runs` record
- golden-profile regression tests per pathway
- a quarterly full audit

### 7.3 Liability when rules change between a run and the user's action [ANALYSIS]

- Stamp every result "Based on rules and sources verified as of {date}". Expire plans after N days (for example 30) or on any T1 change to an included pathway, and require re-running before showing "next steps".
- **Don't over-promise monitoring.** If you sell "we'll alert you when rules change", you take on a duty to do it competently. Phrase it as best-effort, and make it free or part of a licensed-review tier.
- Before any irreversible or time-critical step (status expiry, filing, quitting a job, travel), require an explicit "confirm with IRCC or a licensed professional" interstitial and a link to official pages.
- Keep immutable run snapshots of inputs, rules version and sources. They are the evidence for any later dispute.

---

## 8. Accessibility and language

- **AODA (Ontario):**
  - Website WCAG 2.0 AA is mandatory for designated public-sector organizations and organizations with 50+ employees, for new content since January 1, 2021 ([Ontario: How to make websites accessible](https://ontario.ca/page/how-make-websites-accessible); [Carleton summary](https://carleton.ca/its/2013/aoda-web-accessibility-requirements)). **[MED]**
  - Organizations with 1–49 employees still have customer service standard duties: accessible communication, feedback process, training, and accessible formats on request ([Ontario: Accessibility rules for businesses](https://www.ontario.ca/page/accessibility-rules-businesses-and-non-profits)). **[MED]**
- **Accessible Canada Act:** applies to federally regulated entities such as banks, telecoms and transport, not a typical startup. Digital regulations for large federally regulated private entities phase in around 2028, using CAN/ASC-EN 301 549 (about WCAG 2.1 AA) ([ESDC guidance](https://www.canada.ca/en/employment-social-development/programs/accessible-canada-regulations-guidance/digital-technologies-phase-1.html); [Blakes](https://www.blakes.com/insights/federal-government-finalizes-new-digital-technologies-accessibility-regulations)). **[ANALYSIS]** It becomes relevant indirectly if banks or colleges, which are AODA public-sector organizations, buy cadet2 and demand conformance.
- **[ANALYSIS] Target:**
  - WCAG 2.2 AA now. The PRD already treats accessibility as a trust requirement.
  - Plain-language reading level, since many users are ESL.
  - Error messages that don't depend on colour.
  - Accessible PDFs for plans.
- **French and Quebec:**
  - Under Bill 96 (Charter of the French Language), websites aimed at Quebec consumers must be in French.
  - Since June 1, 2023, contracts of adhesion (including online terms) must be presented in French first.
  - Since June 1, 2025, the OQLF has tighter trademark rules and proactive inspections ([DLA Piper, Jun 2025](https://www.dlapiper.com/en/insights/publications/2025/06/quebecs-language-laws-changed-this-week); [CFIB](https://cfib-fcei.ca/en/site/qc-law-14-bill-96)). **[MED]**
  - No federal official-languages obligation applies to a private startup, per what was found **[ANALYSIS]**.
  - French is still a **market** lever: the francophone PR target outside Quebec is 9% for 2026, rising to 10.5% by 2028 ([Moving2Canada](https://moving2canada.com/news-and-features/news/immigration/express-entry-immigration-levels-plan-2026/)).

---

## 9. Compliance-by-design checklist (mapped to product)

Priority: **P0** = before any public user · **P1** = before charging anyone · **P2** = before scale or Quebec/EU.

| # | Pri | Area | Feature or copy change | Legal hook | Repo touchpoint |
|---|---|---|---|---|---|
| 1 | P0 | Business model | Decide the structure (B2B / advisor of record / free consumer tier). **No consumer payment touches personalized recommendations** unless a licensee is advisor of record | IRPA s.91; CICC Act s.77; AMPs | pricing, checkout (not built) |
| 2 | P0 | Positioning copy | Landing and onboarding: "cadet2 is a planning tool that explains official immigration rules using your answers. It is not legal advice, we are not your representative, and we can't guarantee outcomes." Don't use "consultant", "advisor" or "immigration expert" for the company | s.91; CICC Act s.77(a); Competition Act s.74.01 | `app/pages/index.vue`, `app/pages/auth.vue` |
| 3 | P0 | Results banner | Persistent: "General information based on your answers and official sources verified as of {date}. Before acting, especially on anything affecting your current status, confirm on IRCC's website or with a licensed RCIC or lawyer. [Check a representative]" | Moffatt; s.74.01 | results views; `EvidenceConfidencePanel.vue` |
| 4 | P0 | Status-critical hard stop | If temporary status expires in ≤90 days, or the user mentions a refusal, removal order, misrepresentation, criminality or health, show an escalation card instead of strategy: "This needs a licensed professional." Suppress "improvement actions" for those pathways | Negligence; s.91 | `evaluatePathwayEligibility.ts`, `qualifyWeakRecommendationResults.ts` |
| 5 | P0 | Consent | Granular checkboxes at intake: (a) processing of sensitive immigration and financial data; (b) AI processing by named US-based vendors; (c) optional product emails. Log the consent version and timestamp | PIPEDA; Law 25; OPC GenAI principles | intake API, new `consents` table |
| 6 | P0 | Privacy notice and ToS | Plain language. Name the privacy officer and contact, sub-processors and locations, retention, and rights. FR/EN for Quebec | PIPEDA; Law 25; Bill 96 | new `/privacy`, `/terms` |
| 7 | P0 | Age gate | 18+ attestation; dependants' data authority checkbox | Law 25 (<14); OPC Children's Code | `auth.vue`, intake personal section |
| 8 | P0 | LLM minimization | No name, email or DOB in prompts. PII-scrub free text. OpenRouter ZDR enforced; AI Gateway payload logging off | PIPEDA safeguards; Law 25 | `server/utils/rag-foundation.ts`, LLM call sites |
| 9 | P0 | Data residency | Convex prod in `aws-ca-central-1`; Canadian Postgres; document a Law 25 s.17 PIA | Law 25 s.17; PIPEDA accountability | infra |
| 10 | P0 | Free-text guard | Placeholder: "Don't include medical, criminal or ID numbers." Server-side classifier routes sensitive topics to the escalation card | sensitivity, s.91 | `additionalContext` field |
| 11 | P0 | Anti-fraud | Refuse and educate on LMIA purchase, fake documents, concealment. Red-flag education module. Report-fraud links | IRPA s.40; AMP $15k counselling misrepresentation | LLM guardrails, content |
| 12 | P0 | Breach plan | Incident register; RROSH and "serious injury" assessment; OPC, CAI and Alberta notification templates; 24-month record keeping | PIPEDA s.10.1; Law 25; AB PIPA | runbook |
| 13 | P1 | Provenance | Each citation shows source title, official URL, retrieved date and last-verified date. Each run stores `rulesVersion` | s.74.01; trust | `buildRecommendationCitations.ts`, `convex/schema.ts` |
| 14 | P1 | AI disclosure | Label AI-drafted vs rule-derived text. "How this was generated" page. Human-review request path (Law 25 s.12.1-style) | Law 25 s.12.1; Competition Bureau | `citations.ts` trust boundary copy |
| 15 | P1 | Plan expiry | Plans expire after 30 days or on T1 rule change; re-run required before showing next steps | Negligence | run lifecycle (`lifecycle.ts`) |
| 16 | P1 | Rules currency ops | Source monitors, SLAs (section 7.2), licensed sign-off field, regression profiles | Negligence; s.74.01 | admin rules, evidence, audit (Stories 5.x) |
| 17 | P1 | Rights | Self-serve export (JSON/PDF), deletion cascade across vendors, retention job | PIPEDA; Law 25 portability; C-36 | workspace settings |
| 18 | P1 | Licensed review flow (if model b) | RCIC dashboard: review, edit, approve; service-agreement e-sign; RCIC name and register link on approved plans; logs of reviewer edits | CICC Code ss.24, 38, 44 | new review module, reusing trust-review admin |
| 19 | P1 | Claims hygiene | Remove or substantiate "trusted", "accurate", "best", "chances". Keep the test-set evaluation report on file | s.74.01(1)(b) | marketing site |
| 20 | P1 | Subscriptions (non-advice utilities only) | One-click cancel; renewal reminder; express renewal consent | Quebec Bill 10; Ont. CPA 2023 | billing |
| 21 | P1 | Insurance | Tech E&O (affirmative AI), cyber, D&O | n/a | n/a |
| 22 | P1 | Source licensing | Replace YouTube scraping with API or licensed transcripts; quote and link canada.ca rather than republish | YouTube ToS; Crown copyright terms | `convex/ragSources.ts`, ingestion |
| 23 | P2 | Quebec | Full French UI and terms. Exclude or route Quebec-selected pathways to Quebec-recognized RCICs or lawyers. Law 25 privacy officer published | Quebec Immigration Act; Barreau s.128; Bill 96; Law 25 | i18n, pathway catalogue |
| 24 | P2 | Accessibility | WCAG 2.2 AA audit; accessible PDFs; AODA feedback and alternate formats process | AODA | UI |
| 25 | P2 | EU/UK | Don't target until GDPR (Article 27 representative) and AI Act Article 50 are ready | GDPR Art 3(2); AI Act | marketing |
| 26 | P2 | C-36 readiness | Cross-border transfer assessments; automated decision explanations; children's best interests | Bill C-36 | DPIA templates |

---

## 10. Questions for counsel (prioritized)

### A. Immigration and regulatory lawyer (book first)

1. Do cadet2's ranked, personalized pathway recommendations, "improvement actions" and "next-step plans" amount to *advising* under IRPA s.91(1), Citizenship Act s.21.1 and CICC Act s.77(c)? Is the operating company the "person" who advises when software generates the output?
2. Which of our revenue models are "consideration", direct or indirect, under IRCC's October 2024 interpretation? Consider: subscriptions, freemium unlocks, paid utilities sitting next to free advice, employer- or college-paid plans, bank sponsorships, flat RCIC SaaS fees.
3. Under the AMP regime in force October 28, 2026, how would "per case" be counted for a SaaS with thousands of users? What is the exposure for directors and officers? Are penalties insurable?
4. For a licensed advisor-of-record model:
   - What minimum review makes the advice the licensee's?
   - Must the RCIC be independent, or can cadet2 employ them (Code ss.25–26)?
   - How should fees flow, as a platform fee plus an advice fee?
   - What service agreement terms (s.24) and client disclosures (s.20(2)(a)) are needed?
5. Can RCICs or lawyers pay us anything tied to client acquisition (CICC Code s.13; LSO/LSBC r.3.6-7)? Is a flat advertising or directory fee safe? Does registering cadet2 as an "agent" under s.13(2) create new risks?
6. **Quebec:** does "advises, assists or represents for remuneration" in the Quebec regulation, or Barreau Act s.128, reach a non-Quebec software company serving Quebec residents? Should we geofence Quebec at launch?
7. Is provincial unauthorized-practice-of-law exposure (Ontario Law Society Act s.1(5)–(6)) additive to s.91 for a non-licensee? Does *Mangat* paramountcy protect us at all?
8. Which words and badges can we use ("planner", "advisor", "verified", "RCIC-reviewed") under CICC Act s.77(a) and Code s.44?
9. Can we use canada.ca content in a commercial RAG product, and YouTube transcripts?

### B. Privacy lawyer

1. Given where we are incorporated and where users and servers are, which regimes apply (PIPEDA, Law 25, AB/BC PIPA, GDPR)? Do we need a Quebec privacy officer?
2. What must the Law 25 s.17 PIA for US processing (OpenRouter, model providers, Cloudflare) look like? Is Convex `ca-central-1` with US LLM calls acceptable?
3. Consent architecture for sensitive data: is express consent needed for status, refusals, funds and nationality? How do we handle free text that may contain health or criminal data, and dependants' third-party data?
4. Do recommendations trigger Law 25 s.12.1 (automated decision)? What wording do we need?
5. What must our vendor DPAs include (ZDR, no training, sub-processor notice, breach notification timelines, deletion)?
6. A unified breach playbook for PIPEDA RROSH, Law 25 "serious injury" and Alberta PIPA, including registers and timelines.
7. Retention periods for profiles, runs, audit logs and LLM logs. Deletion versus audit-trail immutability.
8. Minimum age and minors' flows (study permits for under-18s).
9. Bill C-36 readiness: what should we build now?

### C. Consumer, commercial and insurance

1. How enforceable are a limitation of liability, a disclaimer and an arbitration clause against Quebec and Ontario consumers? What governing law and forum should we choose?
2. What substantiation file do we need for accuracy or "trust" claims under Competition Act s.74.01(1)(b)?
3. Subscription design under Quebec Bill 10 and the Ontario CPA 2023.
4. Insurance placement: Tech E&O and cyber with affirmative AI coverage. What exclusions apply to "legal or professional advice"?

---

## 11. Uncertainty register

| Item | Why uncertain | How to resolve |
|---|---|---|
| Whether software output is "advice" by the operator under s.91 | No Canadian case found | Legal opinion; consider asking IRCC or CICC informally through counsel |
| AMP regulation numbers and exact text (SOR/2026-220/221) | Secondary sources; Gazette not read | Canada Gazette Part II, November 2026 |
| Quebec regulation wording ("advises, assists or represents") and penalties | LégisQuébec blocked fetch | Counsel or LégisQuébec |
| LSO r.3.6-7 exact text and commentary on advertising platforms | LSO site returned 403 | LSO Rules, chapter 3 |
| Bill C-36 status after September 2026 | Latest sources are from June 2026 | LEGISinfo |
| Ontario CPA 2023 in force? | No proclamation found | e-Laws |
| Quebec Bill 10 in-force details and section numbering | Secondary sources | LégisQuébec, OPC (Quebec) |
| BC PIPA breach notification | One blog conflicts with law-firm sources | BC Legislature, OIPC BC |
| IRCC program delivery update counts | Automated count | Manual count on IRCC page |
| LSO A2I sandbox status after its 5-year term | No 2025–2026 status found | LSO |
| Convex backup and log residency | Docs say "all infrastructure" without detail | Convex DPA or support |

---

## 12. Source index (primary and most-used)

- IRPA s.91: https://laws-lois.justice.gc.ca/eng/acts/I-2.5/section-91.html
- IRCC s.91 "consideration" Q&A (May 2025): https://ccrweb.ca/sites/ccrweb.ca/files/2025-05/Section_91_IRPA_IRCC_Questions_and_Answers_May2025.pdf
- IRCC Use of representatives: https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/service-delivery/use-representatives/who-act.html
- CICC Act s.77: https://laws-lois.justice.gc.ca/eng/acts/C-33.6/section-77.html
- CICC Code of Professional Conduct: https://laws-lois.justice.gc.ca/eng/regulations/SOR-2022-128/FullText.html
- IRCC AMPs (Fragomen): https://www.fragomen.com/insights/canada-new-penalties-for-unauthorized-or-fraudulent-immigration-and-citizenship-services.html
- IRCC CIMM fraud note: https://www.canada.ca/en/immigration-refugees-citizenship/corporate/transparency/committees/cimm-dec-04-2025/fraud.html
- Quebec consultant conditions: https://www.quebec.ca/immigration/consultants-immigration/obtenir-titre-consultant-immigration/conditions
- LSBC EA-2025-03: https://www.lawsociety.bc.ca/Website/media/Shared/docs/publications/code/advisories/Ethics_Advisory_-_Splitting_fees_-_non-lawyers.pdf
- Bill C-36 (DLA Piper): https://www.dlapiper.com/en/insights/publications/2026/06/canada-tables-bill-c36-the-protecting-privacy-and-consumer-data-act
- OPC Children's Privacy Code: https://www.priv.gc.ca/en/opc-news/news-and-announcements/2026/nr-c_261020/
- Convex regions: https://docs.convex.dev/production/regions
- OpenRouter ZDR: https://openrouter.ai/docs/guides/privacy/zdr
- Cloudflare AI Gateway logging: https://developers.cloudflare.com/ai-gateway/observability/logging/
- Competition Act s.74.01: https://laws-lois.justice.gc.ca/eng/acts/c-34/section-74.01.html
- Competition Bureau AI submission (BLG): https://www.blg.com/en/insights/2026/10/ai-transparency-the-competition-bureau-weighs-in
- Moffatt v. Air Canada (McCarthy): https://www.mccarthy.ca/en/insights/blogs/techlex/moffatt-v-air-canada-misrepresentation-ai-chatbot
- IRCC program delivery updates: https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/updates.html
