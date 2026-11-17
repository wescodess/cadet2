# cadet2: product truth, commercial feasibility, and a 90-day launch decision

**Assessment date:** 2026-11-16  
**Repository reviewed:** `67b5ea364678a363630acba248e467489efef315`  
**Decision:** Continue only as a narrow, professionally reviewed strategy and intake product. Do not launch the current engine as an autonomous Canadian immigration pathway adviser.

## 1. The commercial verdict

There is useful work here: persistent intake, input snapshots, recommendation lifecycle handling, explanations, run history, comparisons, source administration, and governance records. Those are reusable foundations. They do not yet establish that the system can make a credible immigration recommendation.

The core intelligence is a demonstration implementation. It evaluates **three generic templates using eight scalar or Boolean inputs and eight seeded conditions**. It ranks them with fixed formulas. Its composed route generator appends a preparation action to an already-direct template, returns at most one alternative, and never validates the resulting future eligibility state. Normal recommendation generation does not call the retrieval system or an LLM, and does not persist claim citations.

The product brief's “fastest credible route” proposition is therefore unproven in a stronger sense than “needs more testing”: the necessary timing, selection, status, cost, and transition models are absent. The application has much more planning and review infrastructure than immigration decision logic.

**The strongest initial buyer is a small licensed Canadian immigration practice, especially an RCIC-led practice with 1–5 advisers and support staff handling recurring in-Canada economic immigration assessments.** Start with clients on temporary work status, including PGWP holders, who need to understand Express Entry readiness and improvements before a permit expires. Ontario-based practices are a reasonable recruitment focus; serving one province does not imply that its streams are implemented.

Sell this job: **“Prepare a source-linked assessment for review, compare the client's strongest improvement options, and identify which saved plans need attention when policy or personal facts change.”** The licensed professional remains responsible for advice and client release. A professional-facing workflow reduces some operational risk; it is not an automatic exemption from immigration or privacy law.

Proposed test offer: **CAD 149 per practice per month**, two users and 15 new client assessment cases, then CAD 8 per additional case. A later CAD 249 plan can include three users and 40 cases if repeat usage and economics justify it. These are willingness-to-pay experiments, not discovered market demand. The initial proof is five paying practices that renew because preparation time falls without missed material issues.

## 2. What was examined and what was actually verified

### Scope and limits

Read the product brief, PRD, epics, relevant UX and architecture sections, the technical research, brainstorming stub, RAG documentation, workspace and admin routes, intake contracts, recommendation and pathway utilities, Convex run functions and schema, and supporting database definitions. The March planning documents describe different stages of an evolving product; they are not a live feature inventory. For example, `docs/project-overview.md` still describes an auth/tasks/RAG foundation, while recommendation code now exists. The brainstorming document contains an unfilled template rather than customer research.

**Executed:** read-only repository inspection; official-source and vendor-site web research; in-memory execution of the repository's pure TypeScript evaluator, composer, ranker, qualifier, and explanation builders using Node 24's type stripping. No dependencies were installed and no test scripts were added. The initial checkout was clean.

**Not executed or verified:** application build, package test suite, browser flow, deployed Convex access, provider calls, ingestion jobs, production configuration, load/security testing, live customer interviews, sales, willingness-to-pay, or immigration outcomes. Local `node_modules` was absent. No claim below treats a source implementation or a story marked done as a passed runtime check.

The supplied premise needs one correction: every listed story is `done`, but **all five epic entries are `in-progress`**, at `sprint-status.yaml:43–75`.

### Local evidence register

Links are relative to this report; line references describe the reviewed commit.

| ID | Source and decisive evidence |
| --- | --- |
| C1 | [Product brief](../product-brief-cadet2-2026-03-01.md), Executive Summary/Core Vision; [PRD](../prd.md), Success Criteria/Product Scope; [epics](../epics.md), FR6, FR9–15, FR25–30, FR44, FR47–48. Promises include priority-sensitive ranking, evidence, safe scope, and fastest credible routes. The PRD explicitly permits a narrow initial catalog. |
| C2 | [MVP catalog](../../../server/utils/pathways/mvpPathwayCatalog.ts):1–102; three IDs, eight normalized fields, eight seeded rules. [Evaluator](../../../server/utils/pathways/evaluateDirectAndBlockedPathways.ts):79–129 uses only those fields. |
| C3 | [Rule schema](../../../server/utils/pathways/pathwayRuleSchema.ts):3–34, 80–105; eight allowed fields and scalar comparisons. [DSL evaluator](../../../server/utils/pathways/eligibilityDslEvaluator.ts) and [rule service](../../../server/utils/pathways/pathwayRuleService.ts):549–564 build flat rule lists. [Definition service](../../../server/utils/pathways/pathwayDefinitionService.ts):201–234, 295–324 allows inventory creation but limits evaluated IDs to the original three. |
| C4 | [Composer](../../../server/utils/pathways/generateComposedPathways.ts):20–137; fixed bridge preference, first matching action branch, direct-anchor requirement, one-result cap. |
| C5 | [Ranker](../../../server/utils/recommendations/rankRecommendationCandidates.ts):84–105, 179–225; fixed scores and alphabetical ordering. [Qualifier](../../../server/utils/recommendations/qualifyWeakRecommendationResults.ts):63–123 assigns confidence/freshness from scores. |
| C6 | [Generator](../../../server/utils/recommendations/generateRankedRecommendations.ts):181–274 composes, ranks, qualifies, templates explanations, and persists results without retrieval/model calls. [Rationale builder](../../../server/utils/recommendations/buildRecommendationRationale.ts):114–190, 671–690 contains hardcoded condition text and the same eight-field context. |
| C7 | [Convex schema](../../../convex/schema.ts):106–195; ranked result validators lack citations and rule/evidence revision bindings. [Convex run functions](../../../convex/recommendationRuns.ts):1026–1164 persist evaluations/results; evaluator version is a constant catalog identifier. [Results reader](../../../server/utils/recommendations/readRecommendationResultsForUser.ts):305–440, 461–494 reads optional citations but does not retrieve evidence or apply review-state updates. |
| C8 | [Citation builder](../../../server/utils/recommendations/buildRecommendationCitations.ts):35, 63–109 accepts reference metadata and uses a 180-day age window; [trust classifier](../../../server/utils/recommendations/classifyTrustBoundary.ts) uses citation presence plus qualification. [Review service](../../../server/utils/recommendations/recommendationReviewService.ts):308–401 creates governance fallback citations; [resolve endpoint](../../../server/api/admin/recommendation-reviews/[runId]/resolve.post.ts) changes review state and records an audit action. |
| C9 | [Intake submit](../../../server/api/intake/submit.post.ts):43–85 requires 33 field values across five sections; [intake UI](../../../app/pages/workspace/intake.vue):147–523 includes French, family, status, education, constraints and context; `urgencyDeadline` is at 430–435. [Intake schemas](../../../server/utils/intake/intakeSchemas.ts) include unsupported goal categories. |
| C10 | [Workspace](../../../app/pages/workspace/index.vue), [history](../../../app/pages/workspace/history.vue), [compare](../../../app/pages/workspace/compare.vue), [run comparison](../../../server/utils/recommendations/buildRunComparison.ts), [next-step builder](../../../server/utils/recommendations/buildRecommendationNextStepPlan.ts):310–402, and [comparison grouping](../../../server/utils/recommendations/buildRecommendationComparison.ts):52–138 implement useful presentation and continuity primitives. |
| C11 | [Search endpoint](../../../server/api/ai-search/query.post.ts), [Cloudflare adapter](../../../server/utils/cloudflare-ai-search.ts), [ingestion](../../../server/utils/rag-ingestion-phase3.ts), [RAG architecture](../../../docs/rag-v1-architecture.md), [Phase 0 checklist](../../../docs/rag-v1-phase-0-checklist.md). Search/ingestion are separate from the recommendation call chain; OpenRouter/Gateway configuration exists, while the planned separate answer pipeline is not implemented in that chain. |
| C12 | [Convex public functions](../../../convex/recommendationRuns.ts):933–960, 1275–1368, 1370–1453; caller-supplied user IDs, public testing mutations, and public cross-user admin queries without Convex identity checks. The comment at 1370–1375 explicitly acknowledges the missing Convex authorization. |
| C13 | [Landing page](../../../app/pages/index.vue) exposes auth/tasks/search demo links and auth status. [Pathway rule table](../../../server/db/schema/pathwayRules.ts) stores mutable comparison rows without legal effective intervals or source bindings. [Sprint status](../../implementation-artifacts/sprint-status.yaml):43–75 distinguishes story completion from epic state. |

## 3. Product truth: the promise versus today's behavior

### The end-user journey has substance; its conclusions are thin

A user can, in the source implementation, sign in, save and resume a guided intake, submit a profile snapshot, start evaluation, review direct/blocked/composed results, read templated explanations, revisit earlier runs, and compare runs. The code has explicit lifecycle and failure states, ownership checks at Nuxt endpoints, and several sensible empty-state behaviors. Admins have interfaces for inventory, rules, sources, recommendation reviews, and audit records. These are assets worth retaining. [C9–C13]

What the application cannot substantiate is the leap from that workflow to a personalized, current immigration strategy. In particular:

| Promise | Actual source behavior | Product consequence |
| --- | --- | --- |
| Full-context reasoning | Many facts are collected; evaluation and explanation context use eight fields. Age, education/ECA, Canadian work, NOC, French, spouse details, current status, refusal history, goal and free text do not influence this engine. | Asking for sensitive facts creates an expectation of consideration that the engine does not satisfy. |
| Fastest credible route | No wait-to-invitation model, processing model, status continuity model, financial comparison, or optimization objective. | “Fastest” is unsupported positioning. |
| Personalized ranking | Direct scores are 90 minus 3 per alphabetical index; blocked scores are 58 minus 6 per unmet condition minus 2 per index; composed scores depend on step count and index. | A numerical score gives an impression of precision without a calibrated meaning. |
| Composed strategy | One direct template plus an action string, with no state transition or final eligibility re-evaluation. | An action list is being presented as a pathway composition. |
| Correctly cited guidance | Citation presentation utilities exist, but normal generated/persisted results have no citation data. | Evidence curation does not currently substantiate the ordinary recommendation. |
| Fresh and high-confidence output | Qualification derives from fixed score/tier. A direct result can receive `supported`, `high`, and `fresh` without a source check. | Trust metadata can contradict the actual absence of evidence. |
| Expandable admin catalog | New inventory entries can be created, but the recommendation resolver filters to three compile-time IDs. | Adding an admin record does not add engine coverage. |
| Execution guidance | Next steps are derived from hardcoded condition blueprints and generic fallback steps. No persisted completion/deadline model was found in the reviewed recommendation schemas. | Useful orientation, with little accountability for real progress. |
| Current-policy governance | Admin review states and audit actions exist; the user result reader does not consult those states or current source validity. | Resolving or flagging an admin record is not the same as correcting or withdrawing a client's advice. |

The smaller catalog is not itself a failure: the PRD explicitly allows narrow coverage. **The failure is presenting three coarse planning heuristics as if they were three legally sufficient program assessments.** [C1–C8]

### Exactly what the three pathways mean

| Template | Seeded conditions, all required | Missing distinctions |
| --- | --- | --- |
| `mvp-skilled-worker` | English CLB ≥8; skilled experience ≥2 years; funds ≥CAD 15,000 | No distinct FSW/CEC/FST rules; no four-skill language results, ECA, FSW selection grid, NOC duties/TEER validation, authorized work history, household funds calculation, CRS or selection competitiveness. |
| `mvp-provincial-nominee` | Valid-job-offer Boolean; relocation-flexibility Boolean | No province or named stream; no employer requirements, occupation/region, intake status, nomination process or actual invitation criteria. A job offer and willingness to move cannot establish PNP eligibility. |
| `mvp-study-to-work` | Willingness to study/retrain; budget ≥CAD 25,000; desired timeline ≥10 months | No admission or study-permit assessment, DLI/program PGWP eligibility, study dates, previous PGWP, language/field restrictions, work authorization or CEC transition. |

These defaults appear both in the static catalog and seeded SQL rule entries. Admins can change scalar rules for the supported IDs, so this is the **shipped default**, not a claim about unknown live database content. Runtime coverage is at most those three IDs and may be reduced by deactivation. There are no separately modeled CEC, PGWP, family sponsorship, business, or individual provincial pathways in this engine. [C2–C3]

These distinctions matter against actual requirements. IRCC describes FSW eligibility using occupation, qualifying continuous work, language, education and a separate 67-point selection threshold. Its rules can admit some candidates with one qualifying year and CLB 7, so the template can wrongly exclude people as well as wrongly include them. CEC has distinct Canadian authorized-work rules and exclusions for work during full-time study and most self-employment. [IRCC FSW](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/who-can-apply/federal-skilled-workers.html), [IRCC CEC](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/who-can-apply/canadian-experience-class.html).

IRCC's published funds requirements depend on family size and program exemptions; a single CAD 15,000 gate is insufficient. Its PGWP rules depend on institution/program eligibility, dates, language and sometimes field of study; willingness and budget do not establish that bridge. These pages were checked on 2026-11-16; their requirements must be rechecked at implementation and client release. [Proof of funds](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/proof-funds.html), [PGWP eligibility](https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation/eligibility.html).

### Read-only engine probes: observed results

The probes imported the actual source modules in memory and exercised their normal `standard` mode with default rules. They did not use a rewritten scoring oracle or a mock engine.

1. **Alphabetical preference:** a profile satisfying all eight conditions produced PNP rank 1/score 90, skilled worker rank 2/87, study-to-work rank 3/84. All were labeled supported/high/fresh. This follows ID sorting, not an estimate of speed or outcome.
2. **Ignored facts:** changing age, education/ECA, Canadian experience, TEER, French, status, refusal history, goal, priority and narrative while holding the eight evaluated inputs fixed produced byte-identical evaluation, composition, ranking and qualification results. This probe demonstrates ignored variables; it does not pronounce either synthetic person legally eligible.
3. **Incomplete bridge:** with study-to-work direct, language and funds blocking skilled worker, and offer/relocation blocking PNP, the composer returned `[mvp-study-to-work, gain-targeted-work-and-language-proof]` for skilled worker, score 71. It did not include a funds-closing step or validate a future state. The explanation layer can still display remaining blockers; the sequence itself does not solve them.
4. **No direct anchor:** when all templates were blocked, it returned no composed route. This fails the specific strategic promise of helping someone whose current direct options are weak or absent.
5. **No generated evidence:** combining normal qualification and explanation outputs produced keys for rationale, signals, blockers, tradeoffs and actions, with no citations or evidence references. Source reading additionally confirmed no citation fields in the persistence validators. [C2–C8]

### Where the LLM adds value, and where it does not

**Today:** the recommendation engine is deterministic, including explanations and plans. Its LLM contribution to pathway intelligence is effectively zero. The separate search playground can request retrieval or retrieve-and-generate from Cloudflare. OpenRouter/Gateway settings and a documented intended answer pipeline are not evidence that profile recommendations use them. [C6, C11]

**Useful next applications:** extract candidate facts from documents or narrative, identify missing/conflicting intake facts, draft a short assessment from validated rule outputs, suggest NOC candidates for professional verification, explain deterministic what-if deltas, translate approved explanations, and summarize policy diffs into a review queue. Measure extraction corrections and editing time saved.

**Keep deterministic or professionally controlled:** eligibility gates, CRS arithmetic, language conversions, effective dates, funds tables, program opening status, deadline calculation and transition validity. If a model proposes an alternative route, require it to select existing versioned nodes and actions, then independently validate every edge and terminal requirement. It must not create program rules.

**Decorative or harmful:** a chatbot restating the same templates, narrative “reasoning” added to arbitrary scores, RAG snippets treated as a substitute for executable rules, numerical approval odds without outcome evidence, and confident prose masking missing facts. Adding a model before repairing the domain model would increase persuasive error.

### A launch-blocking data boundary

`listForAdmin` and `readRankedRecommendationsForAdmin` are exported public Convex queries without identity checks; `resetRunsForUser` is a public mutation that deletes runs for a supplied user ID. Several ordinary functions also trust that supplied ID. Protecting a Nuxt proxy does not prevent direct calls to a public Convex function. Convex explicitly documents that functions are client-accessible by default. [C12; Convex internal functions](https://docs.convex.dev/functions/internal-functions).

**Severity: critical if this code is deployed with those functions exposed. Confidence: high in the source finding; deployment exposure unverified.** No deployed exploit was attempted. Before any identifiable pilot data, use internal functions for server-only operations or authenticate and authorize at the actual Convex boundary; remove or gate testing mutations there. Run direct-client anonymous and cross-user rejection checks, including admin reads and deletion, and add firm/case permissions before multi-practice use.

## 4. The market on 2026-11-16: urgency exists, but urgency is not demand proof

Three current facts change the launch thesis:

- IRCC's 2027–2029 levels plan targets 380,000 permanent admissions and 370,000 new temporary arrivals annually, with temporary targets explicitly referring to new arrivals. Those figures are not an addressable paying-customer count. The commercial inference is that this remains a large but managed, selective system in which current eligibility and timing matter. [IRCC levels plan](https://www.canada.ca/en/immigration-refugees-citizenship/corporate/immigration-system/levels/supplementary-immigration-levels-2027-2029.html).
- IRCC reports Express Entry scoring/job-offer changes effective November 3, 2026, and a temporary invitation-round pause while existing scores are recalculated. The detailed changes introduce high-wage-related scoring and revised job-offer treatment. A product based on March research or remembered 2025 rules can already be wrong. Build dated rule packs and change impact detection before claiming a current calculator. Do not assume the pause continues beyond what IRCC states at observation time. [Current score tool](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/check-score.html), [2026 changes](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/changes.html).
- IRPA section 91 restricts paid immigration advice/representation by unauthorized persons. IRCC also announced new penalties in force on October 28, 2026. Whether this particular automated product or commercial arrangement falls within the restriction requires qualified Canadian counsel; an “information only” label does not establish an exemption. [IRPA section 91](https://laws-lois.justice.gc.ca/eng/acts/I-2.5/section-91.html?txthl=under+this+act), [IRCC penalty announcement](https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/10/new-penalties-for-fraudulent-and-unauthorized-immigration-and-citizenship-representatives.html).

The implication is not to sell more elaborate life-path speculation. It is to sell **reviewable, current assessment work** and a reliable response to change.

### Competitors and substitutes actually observed

All observations below are first-party website claims checked on 2026-11-16, not verified product performance, active-customer counts, or realized willingness-to-pay.

| Alternative | Published offer / price | What it means for cadet2 |
| --- | --- | --- |
| [IRCC CRS calculator](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/check-score.html) and [rounds information](https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations.html) | Public calculator and official selection information without a product subscription. | Arithmetic and generic draw information are acquisition utilities, not sufficient paid differentiation. |
| [ClickMaple](https://clickmaple.com/pricing) | Advertises USD 9 starter, USD 79 full assessment, USD 249/year roadmap; rankings, NOC support, report and ongoing planning. | The applicant proposition is already directly contested. A better-looking assessment is insufficient. Currency is USD, not CAD. |
| [RCIC App](https://rcicapp.ca/settler) | Advertises CAD 29/month Basic and CAD 69/month Premium, with bookings, deadlines, intake and AI-assisted documents; additional team seats priced separately. | Practice software can be inexpensive and broad. CAD 149 requires demonstrably better assessment/change-review work, not generic intake or reminders. |
| [CaseEasy 360](https://caseeasy.ca/Home/Pricing/1000) | Advertises CAD 99/month Starter and CAD 199/month Advanced, one user included, additional users CAD 69/month; intake, case management, scoring and AI assessments. PNP assessments are marked coming soon on the checked page. | Do not replace its CRM/billing/forms. Export a valuable strategy artifact into the firm's existing workflow. Its roadmap could close the wedge quickly. |
| Existing adviser research and general-purpose LLM use | No defensible single public price or quality level established in this review. | The real comparison is preparation time and errors versus the firm's current method, including its existing AI use. |

Vendor prices demonstrate competitive anchors, not that cadet2 can charge them. No defensible CAC, conversion rate, applicant price elasticity or market share was established by browsing.

## 5. Who pays: choose one beachhead

### Channel assessment and proposed price tests

Except for competitor prices above, every number in this section is a proposed experiment in CAD before tax. Sales-cycle estimates are operating assumptions to test.

| Segment | Buyer and sellable job | WTP / pricing hypothesis | Why start or defer |
| --- | --- | --- | --- |
| B2C applicants | Applicant pays for decision clarity, an improvement scenario, a trustworthy reviewed plan, and ongoing material alerts. | Free quick screen/CRS utility; CAD 49 one-time planning report only after legal clearance; CAD 12/month or 99/year monitoring only when meaningful alerts exist. A licensed partner might separately price a reviewed consultation at CAD 149–249. | Clear pain, but episodic use, weak initial trust, expensive acquisition risk and sensitive paid-advice questions. Defer paid autonomous recommendations; a free or firm-sponsored intake can support distribution. |
| B2B RCIC/lawyer practice | Owner pays to reduce assessment preparation, missed facts, and repeat research; staff prepare, licensee reviews. | Pilot 149/month, two users/15 new cases; 8 per extra case. Later 249/month, three users/40 cases. Offer 10-case prepaid test at 99 to practices unwilling to subscribe. | **Best beachhead:** repeat usage, identifiable decision-maker, an existing review professional and measurable staff-time economics. Must prove advantage against current software. |
| B2B2C colleges/DLIs | International office pays for consistent student triage and routing to authorized advice. | After proof: 5,000–15,000/year for a bounded campus pilot or 5–15 per activated student, with minimum commitment. | Distribution exists, but procurement, privacy, restricted advising authority, student welfare and recruitment incentives complicate delivery. Assume a 3–9 month cycle until interviews disprove it. Avoid recommendations biased toward tuition sales. |
| B2B2C employers | HR pays to identify employee status risks and route cases to counsel. | 300–750/month for a small monitored cohort, or 15–30 per active worker/month with a minimum. | Narrow workforce value can be strong, but work authorization/LMIA obligations and employee privacy exceed today's engine. Enter later with a licensed practice partner, not employer-visible full personal profiles. |
| B2B2C settlement agencies | Program manager pays for consistent information triage and warm referrals. | 2,000–8,000/year funded pilot; avoid charging vulnerable applicants by default. | Potential impact and reach; budgets, grants, procurement and applicable authorization arrangements must be checked per agency. Low first-revenue certainty. |
| Data / API | Software vendor or practice platform pays for versioned rules, evidence and change-impact responses. | Later 500–2,000/month minimum plus 0.25–1 per evaluated profile, subject to rights, scope and service commitments. | Presently premature: no general rule coverage, revision contract, multi-tenant assessment API, quality guarantee or proven buyer. Selling public scraped text is weak differentiation. |

### Exact initial ICP

Recruit owners of small RCIC-led practices who personally review roughly 15–50 economic immigration assessments monthly and have recurring in-Canada worker/PGWP clients. Target a single practice cluster first so the same federal rules and client patterns repeat. The monthly volume is a qualification hypothesis, not a verified industry average.

The champion is the owner or lead adviser; the daily user may be an assistant. The initial client has sufficient work/language/education facts to compare economic options and a 6–24 month planning horizon. Cases with imminent status loss, disputed admissibility, litigation, complex refusals or uncertain work authorization require direct professional handling. The software can flag urgency and prepare facts without proposing a protective status action on its own.

Launch coverage should mean **reviewed CEC and FSW eligibility plus a current CRS calculation**, with explicitly scoped exclusions and unknown states. Add one named, currently operating provincial stream only after partner demand and independent rule validation. Do not count category overlays as separate immigration programs or count a province label as stream coverage. PGWP status can be an input without claiming PGWP application eligibility is implemented.

The initial output is a two-page assessment: known facts and missing evidence; supported/blocked/unknown findings; current CRS breakdown; two or three explainable improvement scenarios; deadlines; claim-linked sources and rule dates; adviser edits and sign-off. It should paste or export into the firm's existing case system. It should not force a CRM migration.

### Pricing and economics that would justify continuing

For a practice doing 15 assessments/month, saving 20 minutes of preparation per case equals five hours. At an assumed internal loaded staff cost of CAD 60/hour, that is CAD 300/month of capacity against CAD 149. Both time saved and cost must be measured at the actual practice; do not use a lawyer's retail rate as if every saved minute becomes cash revenue.

Define a billable **case** as a distinct client assessment with a 30-day edit/recalculation window. Do not charge per model call, hide ordinary reruns, or offer unlimited generation. Pilot caps on monitored plans and retrieval/OCR usage should be explicit. Licensed review time belongs to the practice and is not secretly included in the software price.

Targets: variable infrastructure/model cost ≤CAD 1 per case, routine support ≤CAD 25 per firm/month, and a credible path to >75% gross margin after properly allocating recurring rule-maintenance labor at scale. At 149/month, 15 cases and 25 support cost, contribution before fixed curation is 109; that is not a business if each firm also requires hours of custom rule work. A hypothetical CAD 4,000/month curation budget alone consumes about 37 such contributions before sales, engineering or founder pay. Measure that work from day one.

Ten pilot practices at 149 produce CAD 1,490 MRR. One hundred at 249 produce CAD 24,900 MRR before costs. That is a plausible focused business, not evidence of venture-scale potential. Do not use national admissions totals to manufacture a large SaaS TAM. Repeat sales, retention, verified case volume and expansion are still unknown.

## 6. Feature roadmap: the next ten, in priority order

Effort estimates assume one experienced full-stack engineer: **S** up to one engineering week, **M** roughly 1–3 weeks, **L** roughly 4–8+ weeks. They are directional, overlap through shared work, and exclude legal/domain review and procurement. The entire list is not a 90-day commitment.

**Gate 0, before identifiable client use:** repair Convex authorization/testing exposure, establish case/firm access boundaries, agree the legal operating model, remove unsupported trust/speed claims, and test isolation at the actual backend. This is a release gate, not a monetizable extra.

### Now: a paid, bounded assessment workflow

| Priority / feature | User problem and why somebody pays | Thin deliverable and acceptance evidence | Effort and dependency on existing code |
| --- | --- | --- | --- |
| **1. Verified eligibility and CRS rule packs** | Advisers cannot save time if they must recheck every conclusion; applicants need eligibility separated from selection competitiveness. | Replace generic templates with reviewed CEC/FSW rules, full language components, dated work periods, ECA and household facts; implement current CRS including verified November 2026 changes. Produce a factor-by-factor calculation receipt and explicit unknown/unsupported results. Match the current official calculator and licensed labels on boundary cases. | **L.** Reuse evaluator/run APIs, but extend `NormalizedPathwayProfile`, rule schema and persistence. Existing flat scalar DSL is insufficient for dates, alternatives, exceptions and category membership. |
| **2. Five-minute triage and a practice case workspace** | A five-section form blocks value, while 33 required facts currently feed only eight inputs. Staff need separate client cases, not a shared end-user login. | Scope screen first; progressive questions; show missing facts; save case under firm; staff and reviewer roles; client invitation. Target <5 minutes median to a useful preliminary summary; explicitly incomplete is acceptable. No identity/passport collection before needed. | **L overall** for firm/case permissions; intake simplification alone **S–M**. Reuse intake draft, submit snapshots and workspace; add organization/case ownership to both data stores. RAG `tenantId` is not practice tenancy. |
| **3. Evidence receipts and licensed review/release** | The buyer needs defensible reasoning and a trustworthy client deliverable, not opaque scores. | Bind every material eligibility conclusion to source excerpt, effective rule revision and evaluated input; show last review and reviewer identity. Store draft/edit/sign-off; client release requires licensee approval. A flagged dependency withdraws current endorsement while retaining the historical record. | **M–L.** Reuse citation UI, audit and review state services; add real evidence fields to Convex result schemas and enforcement in reads/exports. A review-state label alone is insufficient. |
| **4. Explainable what-if simulator, including spouse role** | The recurring question is “Which attainable change is worth my time and money?” This differentiates an assessment from a list of programs. | Compare baseline against language retake/French, additional qualifying work, ECA, and principal-applicant swap where enough spouse facts exist. Show exact CRS/eligibility deltas, assumptions and required evidence. Two or three saved scenarios; no invented language-learning timeline or approval percentage. | **M after #1.** Reuse snapshots, `buildRunComparison` and existing comparison UI. Add scenario branches separate from actual run history and spouse structured inputs. Two fully independent household accounts come later. |
| **5. Expiry/deadline tracking with email reminders** | Temporary status, evidence validity and missed actions have immediate consequences; this creates a recurring reason to retain the product. | Track permit/passport expiry, language-test date and ECA date, practitioner-confirmed deadlines, acknowledgement and reminder delivery. Suggest 90/60/30/7-day reminders configurable by adviser, plus escalation for new urgent cases. Different document/program rules need independent effective-date verification. | **M.** Existing `urgencyDeadline` is just intake data. Add durable tasks, validity rules, scheduler/outbox, email consent, idempotency and delivery status. Do not infer that a reminder extends status or that applying guarantees work rights. |

### Next: earn recurring revenue through relevant change and execution

| Priority / feature | User problem and why it sells | Thin deliverable and acceptance evidence | Effort and dependency |
| --- | --- | --- | --- |
| **6. Plan-linked policy-change impact** | Practitioners otherwise repeat research across every client when a rule changes. A precisely targeted review queue can be more valuable than the initial assessment. | First run a human-curated change bulletin: effective date, affected rule IDs, impacted cases, reason and review action. Then automate detection, dependency invalidation, draft comparisons and adviser-approved notifications. Measure true impact, false alerts and review turnaround. | **L automation; S–M manual pilot.** Reuse source registry, ingestion, audit and run diffs. Add immutable rule/source revisions, case dependency index and invalidation; crawling success is not policy verification. |
| **7. Express Entry/PNP draw watchlists and alerts** | Clients want to know when something relevant happened, rather than repeatedly checking general news. | Begin with official Express Entry draw history and category/program filters; add only supported named provincial streams. Show published cut-offs, date, eligibility context and ingestion health; missing feed data is “unavailable,” not “no draw.” Never promise the next cut-off/date or treat past thresholds as approval odds. | **M.** New normalized selection-event tables/feed parsers; reuse scheduler/source governance and notifications from #5. Eligibility and occupation-category matching depend on #1. |
| **8. Shareable action plan and document checklist** | Families need agreement, clients need specific next steps, and advisers need a deliverable attached to a consultation. | Signed plan version with claim evidence, owner/due date/completion state, pathway-specific checklist and safe PDF/export. Adviser-controlled, expiring/revocable read access for client/family; sharing permission is separate from raw document access. Corrected/current status appears on future opens. | **M.** Reuse `buildRecommendationNextStepPlan`, history and detail UI. Add task persistence and share permissions; existing generic three-step text is not a document checklist. |
| **9. Narrow document upload/OCR to confirm intake** | Re-entering test results, ECA and permit dates wastes time and creates errors. Extraction can create measurable value without pretending to supply legal reasoning. | Start with language score reports/ECA/permits, display extracted field beside source page and ask for confirmation. Store confidence, provenance and corrections. Use manual entry fallback. Do not begin with an unrestricted passport/bank-statement vault. | **M–L.** Source-ingestion R2 plumbing is reusable infrastructure, not a client-document security model. Add private storage, malware/type limits, retention/deletion, processor controls, per-case authorization and extraction evaluation. |
| **10. Cost/timeline ranges and validated short sequences** | Applicants need to know whether a plan fits cash and status constraints; practices can sell better consultations using comparable assumptions. | Budget table separates fees, professional fees, tests/ECA, tuition/living costs and settlement funds without double counting. Separate earliest eligibility, invitation uncertainty and processing time. Start with reviewed improvement sequences; later prove every edge of a study → eligible PGWP → qualifying work → CEC chain. Report ranges and unknowns. | **L.** Reuse plans/comparisons; add dated costs, duration assumptions, guarded transitions and future-state evaluation. No graph database is required. Keep speculative chains out of client release until validated. |

A manually maintained #6 can enter the pilot before full #5 automation because the November rule changes provide a concrete assessment exercise. That does not reorder the architectural dependencies: automatic personalized alerts need versioned rules, case bindings and delivery infrastructure.

### Explicit decisions on other requested features

- **Multilingual UI:** English first for the recruited practice cohort; French or one partner-requested client language next if interviews show completion failures. Translate approved factual content with legal terminology review and show the underlying source language. Do not build ten languages before finding a repeatable workflow. Effort **M** for infrastructure plus ongoing content/review cost; reuse component copy and templates.
- **Mobile/PWA:** make invitation, triage, plan reading and task updates work well on phones now. PWA installability is **S–M** later if return behavior supports it; avoid offline caching of sensitive plans by default. Native apps are deferred. Existing responsive components help, but mobile usability has not been browser-tested in this review.
- **RCIC handoff/booking:** provide the sponsoring practice's existing booking link and clear reviewer identity (**S**). A two-sided adviser marketplace adds supply quality, conflicts, fee/advertising review, disputes and liquidity problems. Defer it until referred demand is repeatedly demonstrated.
- **Family/joint profiles:** support spouse scoring facts and principal-applicant comparison in #4; support selective family plan sharing in #8. Separate household accounts, dependent-specific routes and permission rules are **L** later. A `hasFamilyInCanada` Boolean is not family modeling.
- **Notifications:** email plus an in-product review queue first. Add consent, preferences, delivery failures and escalation. SMS/WhatsApp/push are **M** expansions only if delivery/re-engagement data justify them; do not expose immigration details in message previews.
- **Trust signals:** publish supported scope, dates, real reviewer credentials, correction mechanism, privacy/subprocessor information and an evidence example. Do not substitute badges, generic trust scores or an unnamed “expert reviewed” claim for actual review.

## 7. Cut, hide or defer

1. **Remove “fastest credible route” from launch claims.** Use “reviewed options and improvement scenarios within supported scope” until a comparison model can substantiate speed under explicit assumptions. Never imply permanent residence is guaranteed by a chain.
2. **Hide the existing 90/87/84-style scores and high/fresh badges.** Replace them with calculation receipts, satisfied/missing conditions, evidence currency and adviser sign-off. Numerical approval confidence is deferred indefinitely without a valid dataset.
3. **Keep today's composed outputs internal or label them as preparation ideas.** Their value is brainstorming, not proof of future eligibility. Ship guarded short sequences before broad life-path architecture.
4. **Hide unsupported business/family-sponsorship/work-permit goal promises.** Explain scope at entry and offer a professional referral. Collect extra facts only for a documented triage or future requirement, with their use made clear.
5. **Hide tasks/auth/search playground and readiness diagnostics from public product navigation.** The current landing is a technical entry page. Build one clear promise, a sample reviewed deliverable, scope, price and an invitation/demo action. Preserve useful internal tools. [C9, C13]
6. **Stop expanding YouTube ingestion as a recommendation authority.** It can help discover questions and explain concepts; operative rules must resolve to current official/legal sources. A source trust number cannot convert commentary into law.
7. **Consolidate overlapping comparison/history surfaces.** Keep run history and the diff engine; make the primary workspace a case summary with meaningful changes and next actions. More dashboards do not compensate for shallow conclusions.
8. **Defer CRM, billing, retainers, e-signatures, portal autofill and full case management.** Competitors already sell these. Add a simple PDF/structured export; build one integration only when three paying firms request the same one.
9. **Defer universal 50+ pathway coverage, all provinces, all languages, native mobile and the adviser marketplace.** Each increases ongoing verification and support costs before establishing a wedge.
10. **Do not add general chat or a larger model as a strategy milestone.** Only add a model where it reduces observed preparation or extraction work with bounded, reviewable outputs.

Retain source governance, audit history and safe failure handling. Simplify their operation around the programs being sold. They are necessary quality infrastructure, but not evidence that the product is already trustworthy.

## 8. What can become defensible

There is little present moat. Nuxt, Convex, RAG, prompts, UI cards and public immigration pages are readily available. A larger scraped corpus is not proprietary immigration intelligence.

The strongest potential asset is a **maintained rule-and-impact system tied to real reviewed cases**:

1. Each supported program has effective-dated conditions, authoritative excerpts, exceptions, positive/negative boundary cases, change ownership and review history.
2. Each assessment records input facts, missing facts, rule and source revisions, scenario assumptions and the adviser's approved output.
3. A policy change identifies exactly which open cases need review and which conclusions are invalid, without rerunning every client or sending generic alarm emails.
4. Practitioner corrections improve a labeled evaluation corpus, extraction quality and future rule checks. The product demonstrates lower editing time and fewer material misses than the firm's existing tools.
5. Embedding in a practice's recurring assessment/review workflow creates distribution and switching costs through trusted records and integrations, not by preventing export.

Outcome data can eventually improve realistic sequence/timeline guidance, but an invitation, application, decision and final status are different outcomes. Capture censored/waiting cases, reasons for changes, policy vintage and advisor interventions; avoid presenting a selected set of approvals as a success probability. Obtain appropriate rights and consent, minimize personal data and keep client information out of cross-firm retrieval by default.

A vetted adviser network can help distribution and quality later. It is not automatically a network effect: start with five engaged practices, not a directory. Public draw data are a commodity; **correctly applying a change to a specific client's approved plan** is the more defensible service.

The test of defensibility is operational: can cadet2 ship a legally reviewed change, identify impacted plans and supply evidence faster and more accurately than an incumbent can add a feature? If not, the most rational route may be a specialized service or integration partner rather than a standalone platform.

## 9. The five business-killing risks and mitigations

| Priority / risk | Concrete failure scenario | Mitigation and accountable operating test |
| --- | --- | --- |
| **1. Unauthorized paid advice / professional liability** | Selling personalized route recommendations or arranging paid advice violates the applicable rules; a disclaimer does not cure the activity. A client spends tuition money or loses status after acting on it. | Before public paid personalized output, obtain Canadian immigration/regulatory counsel's written review of activities, marketing, contracts and referral model. Have licensed practices control advice, edits and release; verify reviewer standing; distinguish software from professional fees. Review insurance and incident/correction obligations. RCIC involvement alone is not legal clearance. Sources: IRPA/IRCC above. |
| **2. Wrong or stale strategy under policy change** | Fixed funds/language gates wrongly exclude a real option; a transition is impossible; an old score persists after November changes; a flagged plan remains “fresh.” | Replace templates, bind effective revisions, require unknown states, use an independently labeled benchmark, block release on missing critical evidence, and invalidate affected current endorsements. Domain owner triages material changes within one business day; do not ship a speculative fix to meet an SLA. Escalate urgent status cases immediately to the practice. |
| **3. Privacy/security breach and loss of trust** | Direct Convex calls expose cross-user recommendations or delete runs; future uploads leak identity documents through storage, logs or shared retrieval. | Repair C12 before identifiable pilots; enforce firm/case authorization in all stores and private-object access; run anonymous/cross-tenant backend tests. Minimize data, document processors/locations, constrain retention/logs, test deletion/export and incident response. Confirm actual residency rather than advertising “Canadian hosted” from company location. Canadian privacy guidance stresses lawful use, safeguards and special care in high-impact contexts. [OPC guidance](https://www.priv.gc.ca/en/privacy-topics/technology/artificial-intelligence/gd_principles_ai/?wbdisable=true). |
| **4. No economic demand / CAC and incumbent pressure** | Applicants use a free calculator once; firms already have CAD 69–199 tools and refuse another subscription; acquisition costs exceed revenue. | Sell one recurring job to a narrow practice cohort; demand actual paid renewals; compare with current preparation time and existing software. Delay broad advertising and CRM features. Founder-led acquisition target ≤3 months contribution payback, counting founder sales hours at an explicit shadow cost. Test prepaid cases if subscription cadence is weak. |
| **5. Domain-maintenance and service economics do not scale** | Each extra province and policy update needs costly manual research; custom support consumes all subscription revenue; a reviewer is a single point of failure. | One accountable domain owner plus backup reviewer, small coverage matrix, change detection and regression fixtures, work logs and scoped support. Treat curation as recurring cost. Track contribution after support and maintenance, not just token spend; suspend an unmaintainable rule pack rather than leaving it apparently current. |

The first three are prerequisites for safely testing demand; they should not become excuses to build an enterprise platform before a pilot. Use de-identified/historical cases during repair and review.

## 10. A 90-day launch plan to first paying customers

**Planning window:** approximately November 17, 2026–February 14, 2027. Assume a founder/operator, one full-time senior engineering equivalent, and a contracted licensed domain reviewer with a backup. If the founder is the engineer, reserve explicit selling time; do not pretend the same person provides two full-time capacities. December holidays may delay procurement and renewals.

Proposed cash planning envelope excluding founder/engineering salary: **CAD 12,000–25,000** for counsel, paid domain review, evaluation and limited operations. This is a budget hypothesis, not a spending authorization or a vendor quote. If resources are materially smaller, narrow to CEC/CRS and a concierge professional workflow rather than cutting review quality.

| Window | Work and owner | Measurable exit / decision |
| --- | --- | --- |
| **Days 1–14: discover and remove blockers** | Founder conducts 15 structured practice interviews and observes at least five existing assessment workflows. Ask for recent cases, tools used, minutes spent and actual redactions. Engineer repairs direct backend authorization and test endpoints using synthetic data. Counsel/domain lead defines permitted scope, release model and first rule pack. | Five practices agree to provide reviewed/de-identified cases; at least three accept a concrete CAD 149 paid-pilot offer, conditional on release gates. Record actual payment when collected, not “interested” as revenue. Anonymous/cross-user/firm-boundary rejection checks pass before identifiable use. If fewer than three accept after qualified demos, revise the job or stop broad feature work. |
| **Days 15–35: build the smallest defensible assessment** | Engineer implements current CRS and one reviewed class first, then second only when validated; domain lead authors rules, evidence and expected results. Founder runs manual intake/assessment delivery under partner review. Build firm/case ownership, compact intake, review/release and export, rather than a CRM. | A 100-case versioned benchmark is assembled: representative cases plus boundary, missing-fact, date, spouse, language, work-overlap and changed-policy cases. Calculation results agree with the current official reference where applicable; all known eligibility-critical cases match independent professional labels. Disagreements are adjudicated and unsupported areas withheld. No identifiable client release until legal/security gates pass. |
| **Days 36–60: convert to paid reviewed pilots** | Onboard five practices; invoice via an existing payment process instead of building billing. Run paired preparation measurements and review every released case. Add simple deadline capture and a manual plan-linked policy bulletin using the recently changed scoring as a relevant worked example. | Five practices have actually paid at least one CAD 149 month: CAD 745 collected, absent discounts/tax. At least 30 total reviewed cases across pilots; median preparation time falls ≥20 minutes or ≥30% versus each firm's measured baseline; no known material eligibility error reaches a client. Track editing, missed facts and unsupported outputs separately from delivery success. |
| **Days 61–90: prove repeat use and renewals** | Founder asks for paid renewal and referrals; engineer fixes the main measured bottleneck. Add a light scenario comparison and email reminders if not yet shipped. Prototype automated impact matching only against validated rule dependencies. Recruit the next five qualified practices through partner introductions and an evidence-based demo. | Target ten paying practices, roughly CAD 1,490 MRR at pilot pricing, ≥4 of the initial five renewed, and ≥80 cumulative reviewed cases. At least 60% of enrolled practices use the workflow in each of the final four weeks, if their assessment volume supports weekly use. Show two genuine change-impact exercises with high relevance and documented reviewer turnaround; do not invent real policy events. |

### Product and commercial measurements

Instrument these without retaining unnecessary sensitive content:

- **Activation:** invited case → useful preliminary assessment → adviser approval → client release. Target ≥70% completion of invited, in-scope cases; show denominator and missing-data cases.
- **Time to value:** median triage <5 minutes; separately measure full evidence collection, processing latency and adviser review time. Do not label fast generation as fast immigration.
- **Quality:** zero known material eligibility errors in released pilot plans; all such incidents stop affected releases until corrected. Track noncritical edits, false exclusions, unsupported suggestions and abstentions. A small sample with zero observed errors is not a population accuracy claim.
- **Trust:** all material rule conclusions have a source/revision receipt; all client releases have an identifiable authorized reviewer; every material alert identifies an affected rule/case. No single aggregate “trust score.”
- **Economic retention:** paid firms, invoices collected, renewals, cases/firm, support minutes, reviewer/curation hours and cost per delivered case. Compare time saved with manual and incumbent-tool workflows.
- **Actual client utility:** did the client complete the next agreed action, correct a material misconception, or bring missing evidence? Clicks and usefulness surveys remain secondary evidence.

For cold outreach, use a concrete worked example: “Here is how the November 3 scoring changes affect these two reviewed profiles, with source receipts and a case review queue.” Do not imply a verified lead list or send messages as part of this research task. Secure permission for case studies and redact client details.

### Stop, narrow, or continue at day 90

**Continue:** legal/security release gates hold; five or more practices renew or re-purchase on measured value; preparation savings are consistent; maintenance costs have a credible scaling path. Ten practices is the stretch target, not a substitute for renewal evidence.

**Narrow:** practitioners pay for extraction/brief preparation but do not trust automated route comparison. Sell a source-linked intake/assessment service or software module, with partner review, and defer graph ambitions. If they use it only occasionally, sell case packs rather than forcing a subscription.

**Stop or change channel:** fewer than three qualified practices will pay after a genuine paired-workflow test, no repeatable time/quality advantage versus incumbent tools, unresolved legal/security barriers, or rule-maintenance labor persistently overwhelms contribution. More pathways, more UI and a larger model will not solve these findings.

The successful version of cadet2 is a current, bounded decision-support workflow that a licensed professional trusts enough to use repeatedly and pay for. The next proof is a better reviewed assessment and a paid renewal, not a sixth completed epic.
