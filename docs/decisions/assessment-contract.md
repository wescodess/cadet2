# Honest assessment contract and engine adapter boundary

Decision date: 2026-11-17. Status: answered-on-auto for the staging pilot specification; implementation and pilot proof remain unrun. Resolves [Define the honest assessment contract and engine adapter boundary](https://github.com/wescodess/cadet2/issues/35) under [Chart the Client and Representative portals for a staging pilot](https://github.com/wescodess/cadet2/issues/29).

The shared contract describes what a finding establishes, the facts and rules behind it, and what remains unknown. The existing engine can supply run/input identity and generic-category observations; it cannot supply supported named-program eligibility. Its direct, blocked and composed outputs all become explicit unknowns about program coverage, unless the settled scope or escalation gates require abstention first. No engine rebuild is part of this decision.

The [glossary](../../GLOSSARY.md) fixes the vocabulary. A Draft assessment is Practice work and never unsigned Client output. A Signed plan records a Representative's reviewed advice; signing does not upgrade an engine claim's evidence. The [ADR](../adr/0001-preserve-assessment-evidence-boundaries.md) records why these remain separate.

## Authority and observed baseline

The map's Notes and the owner's **Destination (settled 2026-11-16, Q-20261116-1)** govern. The wiki was consulted on the decision date; the settled constraints are also recorded in the map. The March plans and the feasibility reports are dated inputs, superseded where they recommend a broader launch, rules-graph rebuild, self-serve advice, LLM features or rankings.

| Evidence | What it establishes here |
| --- | --- |
| [Feasibility synthesis, sections 1 and 3](../feasibility/2026-11-16/00-synthesis.md), [engine review, section 1](../feasibility/2026-11-16/sol-engine-and-production-review.md) | Generic categories, arbitrary ranking, incomplete rule evidence and reusable run/intake scaffolding; static observations, not deployment proof. |
| [Catalog and eight input fields](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/pathways/mvpPathwayCatalog.ts#L1), [evaluation](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/pathways/evaluateDirectAndBlockedPathways.ts#L56) | Missing/invalid numbers become zero and missing yes/no becomes false; predicate success does not prove an immigration program. |
| [Runtime catalog selection](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/pathways/pathwayDefinitionService.ts#L292), [rule storage](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/db/schema/pathwayRules.ts#L12) | Execution is restricted to three IDs; active rules can differ from seeds. Current rows and update times cannot reconstruct the rules a historical run used. |
| [Ranker](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/recommendations/rankRecommendationCandidates.ts#L84), [qualification](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/recommendations/qualifyWeakRecommendationResults.ts#L63) | Scores, tiers, confidence and freshness come from heuristics, not official-rule calculations or evidence verification. |
| [Persisted run schema](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/convex/schema.ts#L106), [writes](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/convex/recommendationRuns.ts#L1026) | Results omit citations and exact rule captures. Constant evaluator/ranker tags are implementation labels. Results can be overwritten after terminal status. |
| [Result shaping](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/recommendations/readRecommendationResultsForUser.ts#L72), [admin projection](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/recommendations/recommendationReviewService.ts#L382) | Read-time plans and trust labels add no authority; an associated governance source or fallback citation is not claim evidence. |
| [Coding standards rule 15 at PR #31's inspected revision](https://github.com/wescodess/cadet2/blob/1035feb33feeb837ded0a00e1fa8b42c1ba6937c/CODING_STANDARDS.md#L93) | No fit/match scores, program rankings, success/approval percentages, confidence labels, or fastest/best route language. An official-rule value requires inputs, missing facts and rule version beside it. |

Code above was rechecked at `fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3`. This branch starts from `docs/portals-map` at `5995648771b1017230886a8a0c14670e9f152ec9` to extend the glossary supplied by [the portal-map adoption PR](https://github.com/wescodess/cadet2/pull/51). No live database, government-rule currency, calculation accuracy or deployed behavior was verified for this decision.

## Meanings and precedence

Status belongs to a stated claim and subject, never to a person. A subject identifies an official program/stream and assessment stage, a single criterion within it, or an explicitly generic category. Program identity and assessment capability are separate: being able to name a program does not mean the engine can assess it. A program-level result lists the mandatory criteria and exceptions actually covered and states the dimensions not assessed. Omission is not a negative finding.

| Status | Required basis | Boundary |
| --- | --- | --- |
| `supported` | A precise positive claim, usable applicable rule evidence, required facts with provenance, and a complete criterion trace (plus a calculation receipt when a calculation applies). A program-level eligibility claim additionally accounts for every mandatory criterion and relevant exception of that stage. | A supported language criterion is not supported program eligibility, an invitation, admission or approval. A Client-reported input is labelled as reported, never documentary verification. |
| `blocked` | At least one evidenced, applicable, necessary criterion demonstrably fails on known facts. Record that criterion, the actual value, rule and explanation. | It means blocked on the listed criterion at this time. Other criteria may remain unknown. Missing facts, engine failure, a low budget preference or a heuristic score cannot create a program blocker. |
| `unknown` | The claim cannot be established: missing/invalid/conflicting fact, incomplete coverage, unavailable calculation, unverified/stale/withdrawn evidence, missing rule version or unresolved applicability. Record every known reason and how to obtain the missing basis. | Unknown is not failure or ineligibility. No value defaults to zero/no, no inferred program name and no implied recommendation. |
| `out_of_scope` | The subject lies outside the settled pilot scope: Quebec-selected, family, business, humanitarian or refugee programs. Identify the scope boundary and route to a Representative. | Not a finding against the Client. Lack of implementation for an otherwise in-scope program is `unknown`, not this status. |

The system applies these rules in order:

1. Validate authenticated Case authority and run/snapshot binding before any read or adaptation. Missing identity, cross-Case data or mismatched snapshots is a denied/unavailable operation, not a finding.
2. Evaluate the structured escalation gate independently of program results. Status expiring in **90 days or fewer**, already expired status, refusal, removal, criminality or health concerns require a human and suppress automated strategy for the Case. An unknown relevant expiry date or unanswered safety question makes the gate `undetermined`; collect clarification or route to a Representative without strategy. No absence-of-flag default and no LLM/free-text classifier.
3. Mark excluded subjects `out_of_scope`; do not run or expose strategy for them. Mixed goals preserve the excluded subject and any permitted subject separately. An urgent flag still gates the whole Case. A province preference of Quebec alone is not proof of a Quebec-selected application; unresolved selection/applicability is `unknown` pending intake clarification.
4. For each remaining explicit claim, require usable rule evidence before deciding supported/blocked. A proven necessary failure can be `blocked` even if unrelated facts remain missing; it never implies a complete assessment. Otherwise missing mandatory basis yields `unknown`. An unverified alleged failure does not outrank unknown.
5. For the legacy adapter, the named-program coverage set is empty. Generic results remain `unknown`, including when all demo predicates pass. Do not invent placeholder FSW, CEC, FST, PNP-stream or PGWP findings from a generic ID. A specifically requested named program can have an explicit unknown coverage finding with that requested identity.

Escalation is a routing gate, not a fifth program status. With `required` or `undetermined`, the Draft may retain factual limitations and referral content, but no generated strategy or improvement sequence. A Representative's note does not clear the gate; corrected facts require a new input/assessment version. The intake and lifecycle decisions own the human disposition workflow.

## Field-level contract

This is plain TypeScript-like decision notation, not application code, a migration or a commitment to a storage provider. Arrays are explicit, never silently omitted. `null` means unavailable/not applicable only where documented; it does not mean checked. IDs reference immutable versions inside authorized Case storage. Date-only rule dates use `YYYY-MM-DD`; instants use UTC ISO 8601. Digests use a versioned canonical serialization and SHA-256. This decision fixes the binding, not the serializer implementation.

```ts
type Id = string
type Instant = string
type RuleDate = string
type Digest = string
type Value = string | number | boolean
type FindingStatus = 'supported' | 'blocked' | 'unknown' | 'out_of_scope'
type RunState = 'queued' | 'evaluating' | 'completed' | 'degraded' | 'failed'

type Basis<T> =
  | { state: 'available'; value: T }
  | { state: 'unavailable'; reason: string }

type InputFact = {
  id: Id
  field: string                  // e.g. immigration.englishClb
  unit: string | null            // explicit CAD, months, years, CLB; null for text/boolean
  state: 'known' | 'missing' | 'invalid' | 'conflicting' | 'not_collected'
  value: Value | null            // known only; false and 0 are actual supplied values
  provenance: 'client_reported' | 'staff_entered' | 'representative_checked' | null
  recordedById: Id | null        // unavailable for some historical or uncollected facts
  recordedAt: Instant | null     // null if historical collection time is unavailable
  evidenceRefIds: Id[]           // authorized Case evidence, not automatic proof
}

type MissingFact = {
  field: string
  state: 'missing' | 'invalid' | 'conflicting' | 'not_collected'
  neededFor: string[]            // claim IDs, criterion IDs or escalation reason codes
  question: string
}

type ProgramSubject = {
  kind: 'program'
  programId: Id
  officialName: string
  jurisdiction: string
  stream: string | null          // null only when no stream is relevant
  stage: string                 // e.g. program eligibility, not approval likelihood
  criterionId: Id | null         // null means the explicitly declared whole stage
}
type Subject = ProgramSubject | {
  kind: 'generic_pathway'
  legacyPathwayId: string
  label: string                  // labelled generic; never an official program name
} | {
  kind: 'scope_boundary'
  category: 'quebec_selected' | 'family' | 'business' | 'humanitarian' | 'refugee'
  label: string                  // permits abstention before a specific program is named
}

type RuleBasis = {
  ruleId: Id
  version: string
  contentDigest: Digest
  effectiveFrom: RuleDate
  effectiveTo: RuleDate | null   // null means open-ended in the checked rule
  applicability: string         // cohort, exceptions, relevant assessment date
  citationIds: Id[]
}

type ClaimCitation = {
  id: Id
  claimId: Id                    // exact claim, not the entire run/category
  sourceTitle: string
  sourceUrl: string              // canonical official authority URL
  authority: 'canada_ca' | 'official_provincial' | 'official_legal'
  snapshotId: Id
  contentDigest: Digest
  locator: string                // section/paragraph/span in retained content
  excerpt: string
  publishedAt: RuleDate | null   // null means publisher date unavailable
  retrievedAt: Instant
  sourceEffectiveFrom: RuleDate | null
  sourceEffectiveTo: RuleDate | null
  verification:
    | { state: 'unverified' }
    | {
        state: 'verified' | 'stale' | 'withdrawn'
        verifiedAsOf: Instant
        verifierId: Id
        verificationRecordId: Id
        applicability: string
      }
}

type Claim = {
  id: Id
  text: string
  kind: 'reported_fact' | 'official_rule' | 'calculation' | 'coverage_limit'
    | 'professional_judgment'     // authored edits only; never a system-derived claim
  factIds: Id[]
  premiseClaimIds: Id[]          // checked premises of an authored inference
  ruleBasis: Basis<RuleBasis[]>
  evidence: 'not_applicable' | 'absent' | 'unverified' | 'verified' | 'stale' | 'withdrawn'
  citationIds: Id[]
}

type CalculationReceipt = { state: 'not_applicable'; reason: string } | Basis<{
  id: Id
  name: string                  // official-rule value only
  calculatorVersion: string     // implemented calculation revision, or identified manual method
  inputSnapshotId: Id
  inputFactIds: Id[]
  missingFacts: MissingFact[]
  rules: RuleBasis[]
  steps: {
    label: string
    expression: string
    factIds: Id[]
    ruleId: Id
    value: number
    unit: string
  }[]
  result: { value: number; unit: string } | null
  calculatedAt: Instant
}>

type AssessmentFinding = {
  id: Id
  subject: Subject
  capability: 'not_implemented' | 'partial' | 'covered'
  status: FindingStatus
  claimIds: Id[]
  reasons: { code: string; text: string; claimIds: Id[]; factIds: Id[] }[]
  missingFacts: MissingFact[]
  requiredCriterionIds: Id[]
  checkedCriteria: {
    criterionId: Id
    result: 'met' | 'not_met' | 'unknown'
    factIds: Id[]
    claimIds: Id[]
  }[]
  dimensionsNotAssessed: string[]
  receipt: CalculationReceipt
}

type EscalationGate = {
  state: 'clear' | 'required' | 'undetermined'
  evaluatedAt: Instant
  reasons: {
    code: 'status_within_90_days' | 'status_expired' | 'refusal' | 'removal'
      | 'criminality' | 'health' | 'safety_fact_missing'
    factIds: Id[]
    text: string
  }[]
  missingFacts: MissingFact[]
  route: 'representative' | null  // null only when clear
}

type DraftAssessment = {
  contractVersion: 'assessment.v1'
  assessmentId: Id
  revision: number
  createdAt: Instant
  assessmentContext: {
    asOf: Instant
    calendarDate: RuleDate       // date used for the explicit 90-day comparison
    timeZone: string            // declared IANA zone; no browser-default inference
  }
  caseId: Id
  practiceId: Id
  clientId: Id
  input: {
    snapshotId: Id
    snapshotDigest: Digest
    factSchemaVersion: string
    submittedAt: Instant
    facts: InputFact[]
  }
  origin: {
    runId: Id
    runState: RunState
    evaluatedAt: Instant | null
    rankedAt: Instant | null
    refreshedFromRunId: Id | null
    previousProfileSnapshotId: Id | null
    refreshRootRunId: Id | null
    refreshSequence: number | null
    engineBuild: Basis<string>   // exact build if known, never inferred from a legacy tag
    evaluatorTag: string | null
    rankerTag: string | null
    adapterVersion: string
    capturedArtifactDigest: Digest
    rulesUsed: Basis<RuleBasis[]> // legacy: unavailable, not today's mutable rules
  }
  escalation: EscalationGate
  namedProgramCoverage: {
    subject: ProgramSubject
    capability: 'partial' | 'covered'
    criterionIds: Id[]
  }[]                           // legacy adapter: []; requested identity is not coverage
  findings: AssessmentFinding[]
  claims: Claim[]
  citations: ClaimCitation[]
  limitations: { code: string; text: string }[]
}

type AssessmentRead =
  | { state: 'missing' }
  | { state: 'pending'; runId: Id; runState: 'queued' | 'evaluating' }
  | { state: 'unavailable'; runId: Id; reason: string }
  | { state: 'ready'; draft: DraftAssessment }
```

Field invariants:

- A `ready` Draft is a captured, immutable assessment revision, not a claim of sound eligibility, signature or Client access. Its metadata comes from an authorized run and exact submitted snapshot; Case/Practice/Client IDs come from the authorized Case binding, never from an engine-supplied `userId`. Capture a digest of the artifacts actually adapted. A later overwrite, input correction, changed evidence or adapter change creates a new revision; never silently recalculate a saved revision.
- `InputFact.state = known` requires a valid typed value and non-null, known provenance. Unknown historical provenance cannot be invented; do not admit that value as known until recollected/checked. A missing/uncollected fact may have null provenance; null actor/time records unavailable historical metadata, never a performed check. Missing, invalid, conflicting and not-collected values remain distinct and appear wherever they prevent a claim. A checked input is not the same as an official source citation. Preserve raw-source absence before legacy normalization; if normalization already lost it, record unknown rather than reconstructing a value.
- `supported` and `blocked` require a program subject and usable rule-linked claims; generic findings are always `unknown`, and a scope-boundary subject is always `out_of_scope`. `namedProgramCoverage` enumerates actual modeled stages/criteria, independently of requested programs or pass/fail; it is empty for this engine. A program-level `supported` requires `capability = covered`, a nonempty required-criterion set, all required checks `met`, resolved applicability/exceptions and no missing mandatory facts. A criterion-level supported claim names that criterion and its scope; it cannot be aggregated into program support without complete coverage.
- `blocked` has a `not_met` necessary criterion, the failed input and its applicable rule citation. `unknown` and `out_of_scope` have at least one explicit reason. An out-of-scope result has no eligibility checks or calculation result. Multiple missing reasons coexist; gathering one fact cannot erase unimplemented coverage or absent evidence.
- `evidence = verified` requires nonempty claim-linked citations to retained passages, all usable for the claim and date; stale, withdrawn or unverified citations never establish support. `not_applicable` is confined to reported facts, coverage limits and an explicitly authored professional inference whose rule premises are separately evidenced through `premiseClaimIds`. It cannot exempt an official-rule or calculation claim. A bare URL, retrieval date, run timestamp, source approval, review dismissal or legacy freshness label is not verification. No fallback URL or invented excerpt.
- `RuleBasis` records the exact immutable rule content and effective interval used. Citation source dates and rule effective dates are different fields: a recently retrieved announcement may apply later, or to a different cohort. Null publication/effectivity metadata is disclosed; unresolved rule applicability makes the claim unknown. The observation date is not the legal effective date.
- `verifiedAsOf` belongs to an identified claim-source check, not the run. The UI displays the claim's rule dates and verification date together; for a multi-source claim it displays the dates of its dependencies, not a fabricated single fresh badge. Rechecking an old claim creates a new check/revision. Later usability warnings do not rewrite the signed historical evidence.
- Every fact/claim/criterion/citation reference resolves within the bound immutable assessment/edit context; IDs are unique there. Usable rule/receipt bases are nonempty and each cited passage supports the identified claim, not merely a related topic. Source-check identity is distinct from Representative licence verification. No automatic 180-day freshness rule or fetched-page age substitutes for an applicability check.
- The legacy receipt is `{ state: 'unavailable', reason: 'No official-rule calculation or exact rule receipt was persisted.' }`. Empty arrays and absent receipts are not proof of zero points. A supported nonnumeric criterion can have a `not_applicable` calculation receipt while retaining its full fact/rule/check trace; that is different from an unimplemented calculation. A numeric official-rule result is allowed only with complete required inputs, versioned rules and steps. If required facts are missing, `result = null`; any partial steps are labelled incomplete and cannot be presented as a total. This effort implements no CRS or other official calculator.
- Assessment time, the expiry comparison's declared calendar date/time zone, input submission time, original engine evaluation time and source verification time remain separate. The intake decision selects the canonical expiry-calendar policy; an unknown date/calendar cannot silently clear the gate.
- No score, rank, tier, confidence, success percentage or fastest/best comparison field exists, including hidden presentation metadata. Neutral ordering by official name or stable category ID conveys no preference. Rule 15 also applies to Representative prose and authored plan content.

## Exact legacy adapter mapping

Adapt the persisted evaluation and original submitted input before legacy read-time normalizers/templates. Do not use `readRecommendationResultsForUser` as the portal contract: it preserves ranks and builds strategy from them. The authorized loader captures the run, input, available artifacts and provenance; a pure adapter consumes this fixed context without database access, clock reads, RAG, an LLM or today's rule lookup. Supply the evaluation date/clock as an explicit input to escalation. A schema-valid, evidence-limited result is a Draft for Practice review, never automatic Client advice.

The adapter declares **no assessed named programs**. It may report only observed generic IDs and specifically requested program subjects with an explicit coverage limitation. A missing category is not silently added as a failed route; an empty candidate list is not exhaustive negative coverage. Even a source-linked admin inventory row cannot add execution capability.

| Current output / field family | Contract treatment |
| --- | --- |
| `runId`, `profileSnapshotId`, user association | Preserve run/snapshot IDs after exact ownership/binding checks. A mismatch, unavailable snapshot, missing submitted time or unknown Case association produces unavailable/denied, not a newly invented Case or substitute profile. User ID alone is not authority. |
| `createdAt`, `updatedAt`, `processingStartedAt`, `processingHeartbeatAt`, `resumable` | Retain factual processing/history metadata in authorized operational views. Never use update/heartbeat time as source verification, rule version or signature. Resumable is retry information only. |
| `queued`, `evaluating` | `pending`; suppress findings/strategy even if an incomplete payload exists. A stale heartbeat is an operational recovery concern, not blocked eligibility. |
| `completed`, `degraded` and persisted evaluated/ranked payloads | Can yield `ready` only after identity/input/artifact validation, including both persisted evaluation and result artifacts with their timestamps. Missing either is a partial write and unavailable, even when status says completed. Retain the original run state; degraded is not unknown or confidence by itself. All current generic findings remain unknown. Explicitly persisted empty outcomes mean no observed coverage, never no immigration options. |
| `failed`, thrown backend errors, missing run, result lookup `missing` / `not-ready` / `ready`, `hasRankedPayload` | Missing stays missing; pending follows actual processing status; failures/unavailable artifacts yield unavailable. A failed run with stored candidates is not usable assessment success. No in-memory/mock fallback, empty successful assessment or program rejection. `hasRankedPayload` is presence only. |
| Refresh lineage: `refreshedFromRunId`, `previousProfileSnapshotId`, `refreshRootRunId`, `refreshSequence` | Preserve lineage, with explicit nulls for absent historical fields. Never merge two input versions or reinterpret the old run using the editable draft. |
| `pathwayEvaluation.direct[].pathwayId/status` | Generic subject, capability `not_implemented` for named-program eligibility, status `unknown`, reason `named_program_not_assessed`; no “available now” interpretation. Preserve that a category appeared, not the direct-fit claim. |
| `pathwayEvaluation.blocked[].pathwayId/status/unmetConditions` | Same unknown coverage result. Condition IDs may identify fields to clarify, but are not official blockers or verified thresholds. Record actual missing facts from the input, not the zero/false normalized values. `processing-delay-no-direct-pathways` is operational only. |
| `mvp-skilled-worker` | Generic skilled-worker category. Demo seeds test aggregate CLB 8, 2 experience years and CAD 15,000; suppress those as immigration requirements. No FSW/CEC/FST/Express Entry coverage, invitations or CRS inferred. |
| `mvp-provincial-nominee` | Generic provincial-nominee category. Offer/relocation booleans do not name a province or stream or establish a nomination. No stream coverage or job-offer rule inferred. |
| `mvp-study-to-work` | Generic study-to-work category. Study intent, CAD 25,000 and 10 months are demo preferences/thresholds. No study-permit, DLI, PGWP, work authorization or PR chain inferred. |
| Unknown/extra pathway IDs or admin-created inventory rows | Do not guess an official program from its label. Quarantine an unrecognized result as unsupported artifact/unavailable; an inventory listing is information only. Explicit requested-program identity may be recorded with unknown capability independently of it. |
| `results.direct`, `results.blocked`, `results.composed`, candidate `pathwayId/type` | Flatten to one unknown finding per observed generic subject, unioning limitations from evaluation/results. A composed result must not erase original unmet conditions or masquerade as an independent supported program. Candidate kind is diagnostic provenance only, not the portal status. |
| Candidate `rank`, `score`, `tier`; ranker version and fixed arithmetic | Drop ranks, scores and tiers completely from portal and Signed plan content. Keep only the original version tag in origin as an implementation label; it is not a rule release. Never rename score to CRS, priority, fit, odds or confidence. |
| `qualification`, `confidence`, `freshness`, `caveat`, `terminalStatusMessage`, `statusMessage` | Suppress heuristic trust labels and text that repeats their claims. Retain processing status; produce factual limitations from this contract. In particular legacy `qualification = supported` is unrelated to this contract's supported status. |
| `rationale`, `fitSignals` (`id/label/detail/state`) | Suppress templates and strength/watch/gap judgments. Report only independently validated input facts with their provenance and coverage-limit claims. Matching the demo predicates proves no program requirement. |
| `blockers` (`id/label/detail/severity`) | Suppress templated program blockers and severity. Only an independently supported mandatory failure can become a blocked finding; none is furnished by this engine. High/critical template labels are not the escalation gate. |
| `tradeoffs` (`id/dimension/summary/impact`), `improvementActions` (`id/title/detail/priority/expectedImpact`) | Suppress unsourced effort/cost/timing claims, action prescriptions and promised impact. Ask for missing facts or route to a Representative; no improving-odds or unlock-eligibility claims. |
| `composedSteps`, generated bridge/action strings, `noComposedReason` | Suppress the sequence and “all supported paths” / “no viable route” explanations. Record `transition_not_assessed` as a limitation on the generic target. No verified transitions, prerequisite completeness or future eligibility follows from a bridge string. |
| `citations`, `evidenceReferences`, citation helper fields | Current result validators, writes and normalizers do not preserve them: emit `citations = []`, rule evidence absent and verified-as-of unavailable. Supplied test/read-layer citation shapes are unverified until exact claim, retained passage, official authority, applicable dates and verification record are established. Never synthesize evidence from a similar name/URL/category. |
| `trustBoundary`, source-backed/inferred/system-generated labels | Drop them; derive claim evidence state from the actual contract evidence. A nonempty citation array plus high/supported metadata cannot establish source backing. |
| Admin review `pending/flagged/dismissed/resolved`, support-strength/trust scores, matched governance sources and fallback citations | Operational review records only, never licence verification, signature, claim citation or restored eligibility. An unresolved flag on a real dependency makes it unusable until rechecked; resolving/dismissing a flag alone does not supply missing evidence. No admin projection enters a plan as proof. |
| `nextStepPlan.summary/steps/limitation`, including step `id/title/detail/priority/sequence` | Suppress the generated strategy. Representative-authored actions belong to the separate edit record below; they cannot simply copy unsupported templates. |
| `pathwayType.key/label/description` and comparison `mode/summary/limitation/groups/counts/visibleGroupCount/totalCandidateCount` | Drop “available now”, “blocked but close”, strategic-route labels and ranked-group counts. Any new counts describe contract findings/unknowns, not viable routes or covered programs. |
| History/shared `workspace-summary` metadata and next-action/timeline flags | Reuse authorized input/run identity, timestamps, lineage and factual processing state. `isAvailable`, `recommendationCount`, review/refresh actions and `nextStepPlanAvailable` do not prove Signed plan existence or Client access; rederive actions from the later Case lifecycle. No unsigned archive/deep-link escape. |
| Run-comparison/shared `recommendation-run-comparison` fields | Reuse authorized run metadata and exact profile deltas as facts. Suppress before/after rank/score/tier and deltas, improved/declined impact, confidence changes/averages, heuristic freshness/trust changes and templated reasons/caveats. Recompute evidence additions/removals from actual claim-citation IDs; counts alone do not mean stronger support. Later comparisons state changed facts/claims/rule versions without implying better prospects. |
| Mock modes (`recoverable-delay`, `mock-completed/degraded/failed`), seed/reset/testing exports and in-process fallback results | Reject at the portal boundary, including staging's user flows. These mock/fallback outputs cannot become Signed plans. Staging synthetic Clients exercise standard processing and the real review/signing gates; direct artifact fixtures stay in isolated tests. No fallback after a provider failure. |

The eight legacy decision inputs are `immigration.englishClb`, `work.yearsSkilledExperience`, `immigration.availableSettlementFundsCad`, `work.hasValidJobOffer`, `immigration.openToRelocation`, `goals.willingToStudyOrRetrain`, `goals.budgetCad`, and `goals.targetTimelineMonths`. Other submitted fields can support intake/reviewer/safety work but were not assessed by the engine. Preserve this distinction beside reported facts. Seed thresholds above are observations of code, not current government rules, and admin edits may change them. Re-reading current mutable rules to fill a historical receipt is forbidden.

## Representative edits and Signed plan admission

System findings, input snapshots, evidence and receipts are immutable. Staff may prepare edits where Case permissions allow; only a verified Representative can sign. Authorized preparation never supplies signing authority.

```ts
type RepresentativeEdit = {
  id: Id
  revision: number
  assessmentId: Id
  assessmentRevision: number
  assessmentDigest: Digest
  authorId: Id
  authorRole: 'staff' | 'representative'
  authoredAt: Instant
  findingIds: Id[]
  kind: 'note' | 'correction_request' | 'professional_judgment' | 'action' | 'referral'
  text: string
  claims: Claim[]
  factIds: Id[]
  citations: ClaimCitation[]
  rules: RuleBasis[]
  receipt: CalculationReceipt
  unresolvedLimits: string[]
}

type SignedPlanContentBinding = {
  assessmentId: Id
  assessmentRevision: number
  assessmentDigest: Digest
  inputSnapshotId: Id
  inputSnapshotDigest: Digest
  includedFindingIds: Id[]
  includedEditRevisions: { editId: Id; revision: number; digest: Digest }[]
  claimIds: Id[]
  citationIds: Id[]
  contentDigest: Digest
}
```

These are content requirements for the signing decision, not a second signature protocol. Edits contain immutable authored claims using the same fact/rule/citation fields as system claims and an explicit Representative attribution; professional judgment is not a system status. Its checked government-rule premises require usable citations; its inference and unresolved limits remain labelled judgment. Staff can prepare judgment text but it remains a proposal until adopted by the signing Representative. The signature decision adds the actual signer, name, licence number, manual verification reference/link, signed date and rule/source dates to this exact binding.

| Preparation action | Admission to a Signed plan |
| --- | --- |
| Explain a limitation, annotate evidence, request facts, add a referral or set the order of authored tasks | Allowed with authorship, exact revision, visible material limitations and Representative review. Task sequence is not a program ranking. |
| Correct an input fact | A correction request leads to a new submitted snapshot and assessment revision; it does not mutate an old finding or signed artifact. Staff-entered and Representative-checked remain distinguishable from Client-reported. Consent/authority for profile editing is decided separately. |
| Supply a source or state an independent professional conclusion about an in-scope named program | Allowed as explicitly attributed Representative judgment after checking its rule premises and facts. It does not change system `unknown`, add engine capability, or claim program support from the engine. Any named-program assertion carries its own scope, cited rule version, verification dates and unresolved facts. |
| Turn direct/composed into eligibility, delete a relevant unknown/blocker, backfill a rule version/date, copy a score or relabel it, claim a source was checked when it was not | Never admitted. Signing cannot repair missing provenance or evade rule 15. Unsupported automated text must be replaced with authored, evidenced content or omitted with the material limitation disclosed. |
| Urgent or excluded-subject content | Only factual limitations and a human referral under this contract; no automated strategy, ranked alternative or speculative composed plan. A signature does not widen the pilot scope or bypass escalation. |

A Signed plan may explain that an assessment remains unknown and describe a reviewed fact-gathering/referral action. It need not pretend eligibility was calculated. Include all unresolved limitations, missing facts and negative findings material to any included conclusion; omission must not create false support. Evidence absent means “not verified”, never “verified as of [signature date]”. Independent professional advice can coexist with explicit engine noncoverage; it cannot erase that distinction.

Before signing, content validation rejects prohibited score/rank fields, dangling references, mismatched revisions and unusable evidence relied on as verified. Representative review is responsible for authored wording and reasoning under rule 15; this decision promises no automated prose-truth checker. The signing service also rechecks current authority/Case consent, membership and verified licence, and required source/rule usability. Its exact concurrency, retention and correction protocol belongs to the existing signing, consent and lifecycle tickets. Clients receive only the exact Signed plan projection. They never receive Draft assessments, raw engine payloads, Staff notes or unsigned revisions through results/history/comparison/export endpoints. A later view attaches current usability warnings without silently replacing the signed content. All export copies preserve the same evidence limits and attribution.

## Boundary scenarios

The following are acceptance examples for the contract, not findings about real applicants. “Program P” and “criterion R” are controlled fixtures with stipulated applicable official evidence; no numeric threshold here defines immigration law. Supported/blocked fixtures establish contract behavior that the current engine cannot produce.

| Scenario | Required result |
| --- | --- |
| Clear supported finding: fixture P's complete declared stage requires recognized education and accepted qualifying work evidence; both explicit checked booleans are true, with the stipulated applicable immutable rules, exceptions and exact verified passages supplied | Program-stage `supported`, capability covered, no missing mandatory facts, complete criterion trace and claim citations retained; no numerical calculation applies. Text states the assessed stage and unassessed dimensions; it promises no invitation or approval. A criterion-only version is supported only for that criterion. |
| Blocked finding: fixture P requires recognized education under necessary criterion R; the supplied checked recognition value is false, while an unrelated optional fact is missing | `blocked` for the evidenced criterion, with actual value, rule, passage and date. Any other required unknown stays listed; it is not a complete declaration of ineligibility. The same alleged failure with stale/unverified authority yields unknown. |
| Missing fact: an applicable supported rule needs four language abilities, but reading was not supplied | `unknown`, missing field identified and a clarification question; no zero, “failed language” or score. Any partial calculation has null total. An explicit supplied zero/no remains a known fact and is evaluated only under an actual rule. |
| Out-of-scope situation: the Client asks for family sponsorship or a Quebec-selected application | `out_of_scope`, no strategy, needs-a-Representative path and scope reason. Excluded is not ineligible. If another in-scope goal exists, record its own unknown/assessment separately. |
| Urgent escalation: a synthetic status expires exactly 90 days after the explicitly supplied assessment date, even though every demo predicate passes | Escalation required, reason with referenced expiry fact, strategy suppressed for the whole Case and human route. At 91 days that reason is absent, provided all other safety checks are clear. Already expired status, any refusal/removal/criminality/health flag also escalates. |
| Unknown safety facts: a Client reports temporary status but expiry is blank or contradictory | Gate undetermined, missing/conflicting expiry recorded, human/clarification route and no strategy. A completed engine run cannot clear it. |
| Generic pathway: `mvp-skilled-worker` is direct, score 90, high/fresh, with no persisted evidence | One explicitly generic unknown finding, empty named coverage, citations empty, rules/official receipt unavailable. No program name, score, badge, “available now” or supported status reaches either portal or a plan. |
| False blocked result: blank job-offer input normalized to false and a PNP blocker generated | Unknown with the actual missing fact and category noncoverage; not blocked, not a universal job-offer requirement. Collecting “yes” removes only that missing-fact reason. |
| Composed shortcut: job offer and relocation both fail, but composed steps mention only securing an offer | Unknown generic target, transition-not-assessed limitation; suppress every step and retain both unresolved inputs where relevant. No prerequisite is silently treated as solved. |
| Admin rule edited after a run; rationale still names the seed threshold | Unknown rule basis/receipt. Today's row, its update time and the constant evaluator tag cannot reconstruct the historical rule. No refreshed source date is invented. |
| Related source is approved, fallback citation exists, or review is resolved; no exact retained supporting passage | Evidence absent/unverified, no verified-as-of and no support. A genuine citation withdrawn after signing prevents new reliance/signing; the historical Signed plan remains attributed with a present usability warning. |
| Backend fails, results were only partially written, or a run's snapshot differs from the supplied profile | Unavailable/denied, distinct from unknown program status. No empty success, no substitute mock profile and no Client disclosure. |
| Representative independently reviews P and authors cited advice while engine coverage remains unknown | Authored conclusion stays attributable and separate, system finding remains unknown. Signature binds exact content and evidence; changing a fact/edit afterward creates an unsigned revision and cannot alter the Client's existing Signed plan. |
| A prior Signed plan is viewed after source/consent/membership changes | Current access and usability are checked under the later lifecycle/rights decisions. Do not regenerate the plan from today's inputs, expose a new Draft, or treat its old signature as new verification. |

## First test seam and handoff

The first implementation seam is a pure **legacy artifacts → Draft assessment** adapter immediately before persistence/portal serialization, with an authenticated loader outside it. Inputs are the exact captured legacy evaluation/results, submitted snapshot with pre-normalization presence/provenance, authorized Case binding, explicit assessment time, and explicit evidence/coverage context. Output is the contract or a typed pending/unavailable outcome. It must not call the legacy plan builder or qualification/classification helpers for authority. Use an allowlisted output schema so forbidden legacy fields cannot leak through object spreading.

Start with the direct/high/fresh/no-citation fixture above and the blank-vs-zero/false fixture; prove that changing demo type, score, confidence or generic display name cannot produce supported/blocked named-program claims. Then cover composed prerequisite loss, absent rule identity, unrelated/fallback citations, exact 90/91-day and missing-date routing, explicit out-of-scope/mixed goals, partial/failed writes, and snapshot mismatch. Preserve deterministic assessment output for fixed captured inputs/time; do not test this boundary against a new oracle that merely copies legacy qualification. Supported/blocked fixtures test the contract validator separately; the legacy adapter always retains empty named-program coverage, even when mocked citations or trust labels are injected.

Next, round-trip a captured assessment/edit revision through the chosen store and actual HTTP/direct-backend access boundaries. Prove it retains absent evidence, digests and exact dates; rejects forged Case/snapshot IDs and Staff signing; and exposes no Draft through Client result/history/comparison/export routes. A deliberately forbidden field, invented citation or stale content binding must make the relevant check fail. These implementation/CI/staging proofs are required later, not reported passed by this documentation change.

Existing decision tickets already own the remaining precise questions:

- [Decide the system of record for portal data](https://github.com/wescodess/cadet2/issues/33): immutable assessment/edit capture and cross-store failure handling, without pretending old runs have rule receipts.
- [Decide Representative verification and signature evidence](https://github.com/wescodess/cadet2/issues/37) and [Define the Case lifecycle and audit transitions](https://github.com/wescodess/cadet2/issues/38): the content binding, authorship, admission gates, rechecking and signed-only projections.
- [Define intake content, scope detection and urgent escalation](https://github.com/wescodess/cadet2/issues/42): structured safety/scope questions, unknown dates, fact corrections and the human disposition path. No implicit clear gate from today's missing fields.
- [Define the minimum honest rule-change impact workflow](https://github.com/wescodess/cadet2/issues/43): missing legacy dependencies mean unknown impact; claim/source/version changes require new review without rewriting history.
- [Define removal and isolation of legacy public surfaces](https://github.com/wescodess/cadet2/issues/48) and [Define pilot acceptance evidence and test-first seams](https://github.com/wescodess/cadet2/issues/50): eliminate raw-result bypasses and prove the adapter, storage and Client boundary with synthetic data.

No additional decision ticket is needed: these are inputs to existing children, not newly discovered work slices. Remaining cross-portal fog is how their chosen identity/consent/lifecycle implementations interact on correction and revocation; those choices are not pre-empted here. The map body remains with its orchestrator.

## Limits and escalation record

This decision cannot substantiate any named-program eligibility, CRS/selection points, language conversion, NOC/TEER determination, family-size funds sufficiency, PGWP entitlement, lawful composed transition, program completeness, processing time, cost, invitation/approval likelihood or legal clearance. It cannot substantiate current government rules from demo thresholds, source currency from age, immutable replay from mutable rules, tenancy/signature security from route checks, or pilot readiness from a planning record. No evidence is manufactured to fill those gaps.

No owner question is escalated by this decision. The adapter/schema and separation of edits are reversible specification choices derived from settled scope. No new product scope, visual taste, accounts, spending, deployment, data migration or provider commitment is selected. Authoritative program-rule validation and legal approval remain outside this bounded evidence claim; they are not prerequisites disguised as already completed work. Named-program engine support would require a separately authorized rules effort, not a signature or an adapter heuristic.
