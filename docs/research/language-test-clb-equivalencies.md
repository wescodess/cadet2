IRCC currently accepts **IELTS General Training, CELPIP-General and PTE Core for English (CLB), and TEF Canada and TCF Canada for French (NCLC)**; its published charts support separate reading, writing, listening and speaking conversions, not an overall-score conversion. Intake must retain the exact test/version, attempt and report, four component scores and their scale, test/result dates, provenance and applicable assessment date, then bind each conversion to a retained official passage, rule version and calculation receipt. Express Entry requires results less than two years old at profile submission and permanent-residence application, and uses TEF’s **Équivalence ancien score** column regardless of test date; other IRCC TEF charts use date-specific scales. Missing, contradictory, unverified or uncovered inputs produce `unknown`; a proven failure can be `blocked` only for an applicable necessary criterion, never inferred program ineligibility. This authorizes neither CRS nor named-program eligibility. Sources read **2026-11-17**: [IRCC language requirements][S1], [Express Entry language results][S2], [Atlantic language charts][S3].

# Official language-test to CLB/NCLC equivalencies

Research resolution for [#58](https://github.com/wescodess/cadet2/issues/58); handoff to [#42 intake](https://github.com/wescodess/cadet2/issues/42). Observation date: **2026-11-17**. Documentation research only; no converter, provider verification, runtime checks or program eligibility assessment was implemented.

## Scope and evidence method

The map’s Destination, Notes and Decisions were read from [#29](https://github.com/wescodess/cadet2/issues/29). The owner’s settled Destination (2026-11-16, Q-20261116-1) and amendment (2026-11-17, Q-20261117-2) were read from the supplied run record. The amendment admits CLB/NCLC conversion as criterion-level findings; English-only UI does **not** exclude French test inputs. CRS and named-program eligibility remain outside this effort. Personalized output still reaches a Client only as a Signed plan.

The assessment contract was fetched and inspected at [`f6681efc7b4264627eba3b1cccc0cf6b4c6d9f08`](https://github.com/wescodess/cadet2/blob/f6681efc7b4264627eba3b1cccc0cf6b4c6d9f08/docs/decisions/assessment-contract.md). It predates the amendment: its prohibition on language conversion and its subject/receipt notation need the narrow reconciliation described below, not an invented named program or a silent change to scope. The baseline checkout is `dev` at `fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3`.

Only IRCC/canada.ca sources establish equivalencies, acceptance and rules. Test-owner sources below establish version names only. Tables reproduce official numeric cells, with columns consistently ordered **reading, writing, listening, speaking**. Each table’s source/locator/date applies to **every row and skill cell**; the numeric cells are the exact citation passages for those equivalencies. Derived intervals and proposed intake behavior are explicitly distinguished from publisher text. Unestablished facts are marked **[unverified]**.

The formerly separate `.../language-requirements/test-equivalency-charts.html` returned HTTP 404 on the observation date. This is explained by IRCC’s June 23, 2026 consolidation notice [S6]; the current authoritative charts are on [S1, #charts][S1charts]. No historical mirror or unofficial calculator was used to fill gaps.

## Accepted and excluded versions

| Input version | Finding from official authority | Citation passage and locator; read 2026-11-17 |
| --- | --- | --- |
| CELPIP-General / CELPIP-G | Accepted four-skill English test. | [S2, Language tests we accept][S2tests]: **“CELPIP-General”**; [S1, English language testing organizations][S1org], Paragon row. |
| CELPIP-General LS / CELPIP-G LS | Citizenship-only; cannot substitute for the four-skill immigration result in this slice. | [S1, English organizations][S1org], Paragon row: **“citizenship purposes only”**. |
| IELTS General Training | Accepted English option. | [S2, Language tests we accept][S2tests]: **“IELTS General Training”**. |
| IELTS Academic, IELTS Life Skills, IELTS Online or an unspecified “IELTS” | Not a confirmed accepted General Training result; do not feed their scores to this converter. This exclusion follows the approved-option requirement, not a claim that no Canadian institution accepts them. | [S2, Language tests we accept][S2tests], IELTS approved-option instruction above. [O1] distinguishes Academic and General Training names; acceptance comes from S1/S2. Whether a particular UKVI-branded General Training report is acceptable needs report-specific confirmation **[unverified]**. |
| IELTS One Skill Retake (OSR) | Express Entry excludes it. S1 identifies an EMPP-only exception; that is not a general economic-immigration permission or a pilot scope expansion. | [S2, Language tests we accept][S2tests]: **“We don’t accept IELTS One Skill Retake for Express Entry.”** [S1, English organizations][S1org], IELTS row; [S9, OSR subsection][S9]. |
| PTE Core | Accepted English option, from 2024-01-30. | [S2, Language tests we accept][S2tests]: **“PTE Core”**; [S5][S5], dated acceptance notice. |
| PTE Academic, PTE Academic UKVI, PTE Home | Not the approved Core option; no substitutions or shared-table assumptions. | [S1, English organizations][S1org], Pearson row; [S2tests]. [O2] establishes distinct names only. |
| TEF Canada | Accepted French test. Keep this exact variant and the report’s score-column label. Generic “TEF”, TEFAQ/TEF Québec, TEF IRN, or a two-component citizenship result does not establish this four-skill result. | [S1, French language testing organizations][S1org], CCI row; [S2tests]. [O3] confirms TEF Canada naming. Exclusion from this conversion follows the named approved test; other programs may use different evidence. |
| TCF Canada | Accepted French test. Do not substitute TCF Québec, TCF IRN, TCF tout public, CEFR labels or an unspecified TCF report. | [S1, French organizations][S1org], France Éducation International row; [S2tests]. The owner’s linked English page returned `ERR-BOT-403`; the test name is verified from IRCC, not inferred from that page. |
| TOEFL Essentials | Listed in the designated-organization table, but explicitly **not currently accepted**. No IRCC CLB table was published there. Do not confuse organization designation with usable test admission. | [S1, English organizations][S1org], ETS row: **“This test isn’t currently accepted by IRCC.”** Acceptance date and equivalencies **[unverified]**. |
| TOEFL iBT, Duolingo, CAEL, placement tests, course levels, self-estimated CLB/CEFR or an overall test score alone | No accepted four-skill conversion established by S1/S2 for this slice. Record as other/unsupported evidence for review; do not translate through CEFR or another test. | [S1org], approved-test list; [S2tests], accepted-test list. [S2, Canadian Experience Class tables][S2] separately excludes LINC centres as approved testing agencies in that context. No universal claim about education/citizenship acceptance is made. |

## English equivalency tables

### CELPIP-General — published CLB 4–10

Exact numeric passage: [S1, #charts → CELPIP-General][S1charts], table headed CLB level / Reading / Writing / Listening / Speaking; read **2026-11-17**.

| CLB level | Reading | Writing | Listening | Speaking |
| --- | --- | --- | --- | --- |
| 10 | 10 | 10 | 10 | 10 |
| 9 | 9 | 9 | 9 | 9 |
| 8 | 8 | 8 | 8 | 8 |
| 7 | 7 | 7 | 7 | 7 |
| 6 | 6 | 6 | 6 | 6 |
| 5 | 5 | 5 | 5 | 5 |
| 4 | 4 | 4 | 4 | 4 |

These are the distinct levels published in the consolidated IRCC table. S2’s first-language CELPIP table groups the top band as **10 and above**, with **10+** in every ability, and its second-language table includes scores **5–12**. Preserve a reported 11 or 12 as the raw score; the supported result from these IRCC passages is **at least CLB 10**, not an invented exact 11/12 mapping. Exact mappings for CELPIP 3, 11 and 12 were not found in the inspected IRCC charts **[unverified]**; the owner’s CLB chart is deliberately not used as equivalency authority under this ticket’s source restriction. Do not manufacture levels 0–3 or 11–12 to make a complete-looking scale.

### IELTS General Training — published CLB 4–10

Exact numeric passage: [S1, #charts → IELTS General Training][S1charts], same column order; read **2026-11-17**.

| CLB level | Reading | Writing | Listening | Speaking |
| --- | --- | --- | --- | --- |
| 10 | 8.0 | 7.5 | 8.5 | 7.5 |
| 9 | 7.0 | 7.0 | 8.0 | 7.0 |
| 8 | 6.5 | 6.5 | 7.5 | 6.5 |
| 7 | 6.0 | 6.0 | 6.0 | 6.0 |
| 6 | 5.0 | 5.5 | 5.5 | 5.5 |
| 5 | 4.0 | 5.0 | 5.0 | 5.0 |
| 4 | 3.5 | 4.0 | 4.5 | 4.0 |

These are IRCC’s published threshold cells, not complete intervals. [S2, Federal Skilled Trades → IELTS][S2] also explicitly publishes the top band as **10 and above**, with R **8.0–9.0**, W **7.5–9.0**, L **8.5–9.0**, S **7.5–9.0**. Do not assign an exact CLB 11 or 12 above that band.

For an implementation, selecting the highest published threshold satisfied by a valid component score yields the following **derived half-open intervals**. These are a transparent calculation from S1’s ordered thresholds, not additional quoted IRCC bands. `[a,b)` means a ≤ score < b. Do not round an input into an interval or treat a mathematically in-range value as proof it is a legitimately issued IELTS score.

| Derived CLB band | Reading | Writing | Listening | Speaking |
| --- | --- | --- | --- | --- |
| 10 or above | [8.0,9.0] | [7.5,9.0] | [8.5,9.0] | [7.5,9.0] |
| 9 | [7.0,8.0) | [7.0,7.5) | [8.0,8.5) | [7.0,7.5) |
| 8 | [6.5,7.0) | [6.5,7.0) | [7.5,8.0) | [6.5,7.0) |
| 7 | [6.0,6.5) | [6.0,6.5) | [6.0,7.5) | [6.0,6.5) |
| 6 | [5.0,6.0) | [5.5,6.0) | [5.5,6.0) | [5.5,6.0) |
| 5 | [4.0,5.0) | [5.0,5.5) | [5.0,5.5) | [5.0,5.5) |
| 4 | [3.5,4.0) | [4.0,5.0) | [4.5,5.0) | [4.0,5.0) |

Example of the derivation, not a real applicant: listening 7.0 clears the CLB-7 threshold 6.0 but not CLB-8 threshold 7.5, so returns CLB 7. Reading 7.5 clears CLB-9 threshold 7.0 but not CLB-10 threshold 8.0, so returns CLB 9. The complete allowed score increment grammar was not established from an IRCC passage **[unverified]**; retain and confirm unexpected precision against the report rather than silently accepting or rounding it.

### PTE Core — published CLB 3–10

Exact numeric passages: [S1, #charts → PTE Core][S1charts] publishes CLB 4–10; [S3, #test-charts → PTE Core][S3charts] additionally publishes CLB 3. Every row below is reproduced from S3 and the 4–10 cells agree with S1. Read **2026-11-17**.

| CLB level | Reading | Writing | Listening | Speaking |
| --- | --- | --- | --- | --- |
| 10 | 88-90 | 90 | 89-90 | 89-90 |
| 9 | 78-87 | 88-89 | 82-88 | 84-88 |
| 8 | 69-77 | 79-87 | 71-81 | 76-83 |
| 7 | 60-68 | 69-78 | 60-70 | 68-75 |
| 6 | 51-59 | 60-68 | 50-59 | 59-67 |
| 5 | 42-50 | 51-59 | 39-49 | 51-58 |
| 4 | 33-41 | 41-50 | 28-38 | 42-50 |
| 3 | 24-32 | 32-40 | 18-27 | 34-41 |

All endpoints are inclusive. S2 labels the highest band **10 and above**; the closed endpoints above come from S1/S3. PTE Core CLB 3 is a published equivalency, not evidence that any program accepts that level. No exact CLB 1–2 or 11–12 conversion was established **[unverified]**. PTE Academic’s table or scoring changes cannot revise Core’s table.

## French equivalency tables

### TEF Canada — choose the scale before the level

There are **three** IRCC tables. Test date alone is insufficient for Express Entry: [S1, #charts → TEF Canada, note before chart A][S1charts] instructs use of chart A for Express Entry **regardless of test date**, based on the report’s old-score-equivalency column. [S2, every TEF subsection][S2] names that column **“Équivalence ancien score”**. Never feed a `Score / 699` value into chart A or relabel a contemporary old-equivalent score as a pre-2019 test.

S1 states that entering the other column can produce an incorrect NCLC and instructs processing officers to recalculate from the old-equivalent score in their verification portal. This is an IRCC officer procedure; cadet2 has no demonstrated access to that portal and must not claim it verified a result there. Keep raw score columns, the selected chart and why it applies in the receipt. There is no verified arithmetic for converting a `/699` value to its old-equivalent value in this research **[unverified]**.

#### Chart A — old-score equivalency; Express Entry at any test date

Exact numeric passage: [S1, #charts → TEF Canada → chart A][S1charts]; also [S2, TEF correction tables][S2]. Read **2026-11-17**. S1 labels historical applicability as tests **before 2019-09-30**; contemporary Express Entry uses these same numbers from the old-equivalent column, not by pretending the test was taken in that period.

| NCLC level | Reading | Writing | Listening | Speaking |
| --- | --- | --- | --- | --- |
| 10 | 263-300 | 393-450 | 316-360 | 393-450 |
| 9 | 248-262 | 371-392 | 298-315 | 371-392 |
| 8 | 233-247 | 349-370 | 280-297 | 349-370 |
| 7 | 207-232 | 310-348 | 249-279 | 310-348 |
| 6 | 181-206 | 271-309 | 217-248 | 271-309 |
| 5 | 151-180 | 226-270 | 181-216 | 226-270 |
| 4 | 121-150 | 181-225 | 145-180 | 181-225 |

#### Chart B — tests 2019-10-01 through 2023-12-10

Exact numeric passage: [S1, #charts → TEF Canada → chart B][S1charts]; read **2026-11-17**. These are the `/699`-scale bands for this historical cohort, not current Express Entry entry values.

| NCLC level | Reading | Writing | Listening | Speaking |
| --- | --- | --- | --- | --- |
| 10 | 566-699 | 566-699 | 566-699 | 566-699 |
| 9 | 533-565 | 533-565 | 533-565 | 533-565 |
| 8 | 500-532 | 500-532 | 500-532 | 500-532 |
| 7 | 450-499 | 450-499 | 450-499 | 450-499 |
| 6 | 400-449 | 400-449 | 400-449 | 400-449 |
| 5 | 350-399 | 350-399 | 350-399 | 350-399 |
| 4 | 300-349 | 300-349 | 300-349 | 300-349 |

#### Chart C — tests from 2023-12-11

Exact numeric passage: [S1, #charts → TEF Canada → chart C][S1charts]; independently corroborated by [S3, TEF Canada → after December 10, 2023][S3charts]. Read **2026-11-17**. These are `/699`-scale bands, not Express Entry entry values.

| NCLC level | Reading | Writing | Listening | Speaking |
| --- | --- | --- | --- | --- |
| 10 | 546-699 | 558-699 | 546-699 | 556-699 |
| 9 | 503-545 | 512-557 | 503-545 | 518-555 |
| 8 | 462-502 | 472-511 | 462-502 | 494-517 |
| 7 | 434-461 | 428-471 | 434-461 | 456-493 |
| 6 | 393-433 | 379-427 | 393-433 | 422-455 |
| 5 | 352-392 | 330-378 | 352-392 | 387-421 |
| 4 | 306-351 | 268-329 | 306-351 | 328-386 |

Chart C and the old-equivalent chart are **distinct published IRCC rules** with different contexts. Do not assume their outputs are interchangeable for a particular report. For example, a report’s `/699` listening 440 falls in chart C’s NCLC-7 row; chart A requires its separately supplied old-equivalent listening value. This does not authorize deriving one column from the other. If only `/699` is supplied and Express Entry context is selected, that result’s Express Entry-compatible NCLC finding remains `unknown` until the correct column is supplied/checked. A separate explicitly chart-C calculation can remain labelled as such, without implying Express Entry acceptance.

Two historical limitations matter:

- S1’s wording leaves **2019-09-30** outside both “before September 30” and “between October 1…” cohorts. Its historical date assignment is **[unverified]**. Do not silently repair it to “on or before”; all such tests are already too old for a current less-than-two-years check.
- S2 warns about tests taken **2023-12-11 through 2024-05-06**, temporary NCLC changes and subsequently corrected scores. The date range and required profile update are verified; the precise effective day of the reversal is **[unverified]**. Preserve the superseded and corrected report provenance. By 2026-11-17 every test in this cohort is over two years old; the warning still matters for historical receipts, not present valid-result admission. [S2, TEF correction notice][S2].

### TCF Canada — published NCLC 4–10 and above

Exact numeric passage: [S1, #charts → TCF Canada][S1charts], column order R/W/L/S; read **2026-11-17**. [S2, Federal Skilled Trades → TCF Canada][S2] independently supplies the same bands.

| NCLC level | Reading | Writing | Listening | Speaking |
| --- | --- | --- | --- | --- |
| 10 and above | 549-699 | 16-20 | 549-699 | 16-20 |
| 9 | 524-548 | 14-15 | 523-548 | 14-15 |
| 8 | 499-523 | 12-13 | 503-522 | 12-13 |
| 7 | 453-498 | 10-11 | 458-502 | 10-11 |
| 6 | 406-452 | 7-9 | 398-457 | 7-9 |
| 5 | 375-405 | 6 | 369-397 | 6 |
| 4 | 342-374 | 4-5 | 331-368 | 4-5 |

All endpoints are inclusive. Reading and listening cutoffs differ; writing and speaking use their own score ranges. Preserve **10 and above** as a band; no exact NCLC 11/12 result or sub-4 numeric level was established **[unverified]**. Do not use CEFR letters as score inputs.

## Validity, minimums and exceptions

These are rule facts and bounded consequences, not program-threshold decisions.

| Rule | Exact citation passage; source locator; read 2026-11-17 | Intake/calculation consequence |
| --- | --- | --- |
| Express Entry test age | [S2, How long your results are valid for][S2valid]: **“less than 2 years old”**. The surrounding list requires this when completing the profile and submitting the PR application. | Applies to the accepted English and French results, not different per-test periods. Evaluate each attempt separately against the relevant date. A known expired result cannot support “currently valid”; its historical score conversion can still be recorded with an expired-use limitation. A planned filing date is not a completed application. |
| Expiry while in the pool | [S4, section 3(4), Expired results][S4]: **“two or more years old”**. | A previously usable result does not stay usable for the whole pool period. The second anniversary fails the strict less-than-two-years condition, once the relevant start date and calendar are established. No CRS calculation is made here. |
| General guidance differs at the exact boundary | [S1, introductory paragraph][S1]: **“not be more than 2 years old”**. S2/S4 use the stricter Express Entry wording above; S3 also says less than two years when applying. | Do not erase program context or apply the general inclusive wording to Express Entry. For other uses, resolve the applicable current rule rather than asserting a universal equality rule. |
| PGWP language document age and format | [S10, Proof of language results][S10]: **“less than 2 years old”**, **“Language tests should be taken in person.”** | Additional confirmation of the age requirement in another context. Do not turn it into a PGWP entitlement finding or a universal test-format rule. |
| Minimum needed in every required skill | [S3, What to include in your application][S3]: **“minimum score in all 4 abilities”**. [S2, Language requirements][S2] separately shows ability-specific requirements. | When a rule requires the **same level k in all four**, `all(level[skill] >= k)` is equivalent to `min(levels) >= k`; this is a logical derivation, not an IRCC “overall CLB” score. Do not average, sum or use a test’s overall score. If thresholds differ by skill, compare each against its own threshold. This report selects no program thresholds. |
| Disability exception to four completed sections | [S1, #exemptions][S1exempt]: **“up to 3”** language skill areas; the text permits notionalized departmental-tool scores. [S2, disability subsection][S2]; [S10, disability subsection][S10]. | Do not label an absent score as zero or proof of failure. Collect only the necessary accommodation/official-adjustment provenance, not a diagnosis; route to a Representative. Importing a documented adjusted score must preserve its origin. This research does not reproduce or validate the averaging tool or establish a generic exemption. |
| Electronic reports | [S1, introductory paragraph][S1]: **“electronic versions”**. | A paper original is not a prerequisite invented by this intake. An uploaded electronic report or reported identifier does not itself establish authenticity or official verification. |

**Date calculation limit.** The inspected general IRCC passages specify the age of results but do not explicitly settle, for every test/report type, the legal age-start anchor where the sitting date and report-issuance date differ. Nor do they specify leap-day rollover or the precise expiry instant/time zone. Those details are **[unverified]** here. Intake should collect the test date, report-issuance date and any stated expiry separately, record the rule’s relevant assessment/profile/filing date and declared calendar/time zone, and request clarification when the distinction could change the conclusion. Do not silently use upload date, source retrieval date, report reprint date, today’s browser clock, or 730 elapsed days as the legal rule. Tests already more than two years old under every plausible supplied start date can be identified as expired; a boundary-sensitive validity claim stays `unknown` until its date basis is established.

**No arbitrary mixing.** Keep one complete report/attempt’s four skill scores together. The inspected IRCC passages do not establish a general permission to combine best scores across attempts, partial retakes, tests or reports **[unverified]**. This is a conservative product admission boundary, not a newly asserted universal immigration prohibition. OSR’s specific exclusion/exception is sourced above. A corrected/reissued report needs lineage to the same attempt; it does not reset the sitting date.

## Changes and effective dates

| Date / effective interval | What the primary source actually establishes | Exact short passage and citation; read 2026-11-17 |
| --- | --- | --- |
| 2025-11-20 | Administrative changes plus a hyperlink to Language Requirements; no announced replacement bands or two-year change. This is the notice’s update date, not a new equivalency effective date. | [S7][S7]: **“Administrative changes have been made, and a hyperlink has been added”**. |
| 2026-06-23 | Consolidated guidance and charts onto one page; added verification-portal/integrity instructions, removed outdated contacts and deleted separate chart/organization pages. This explains the old chart URL’s failure. | [S6][S6]: **“relocate all language requirement information to one page”**; **“steps processing offices should take regarding integrity concerns”**. |
| Current as read 2026-11-17 | TOEFL Essentials appears in S1’s organization list but is expressly not accepted. No acceptance effective date or CLB table was verified. Do not infer availability from designation, a future announcement or a test owner. | [S1org], ETS row, exclusion passage above. The original designation date and future activation are **[unverified]**. |
| Current MI page modified 2026-11-03 | The current consolidated page has a 2026-11-03 modification date; the prior archive is labelled through 2026-11-02. Current section 3 retains the less-than-two-year and expired-results provisions. These metadata do not establish a new language-equivalency effective date and authorize no CRS work. | [S4][S4], publisher metadata and section 3; [archived prior MI][S11], dated range. |
| 2024-01-30 (earlier context) | PTE Core began IRCC acceptance, with the then-SDS exception. It was not a newly designated usable test in 2025 or 2026. | [S5][S5]: **“PTE Core will be accepted by IRCC as of January 30, 2024”**. |
| 2023-12-11 (earlier scale change) | TEF chart C applies from this test date. Charts B and A remain explicit historical/Express Entry scales. The update notice was issued 2023-12-14; do not substitute that publication date for cohort applicability. | [S1charts], chart C cohort date; [S8][S8], 2023-12-14 equivalency update. |
| 2023-12-11–2024-05-06 (earlier correction cohort) | S2 identifies an affected TEF cohort and updated-score action; exact reversal effective date not stated. | [S2], TEF correction notice. Reversal day **[unverified]**. |

No numeric equivalency-band change effective in **2025–2026** was established from the current charts and dated language-requirement notices inspected. This is a bounded search finding, **not** proof that no other program-specific change occurred. Page-modified dates (S1 2026-06-23; S2 2026-10-16; S3 2026-05-28) are not legal effective dates. Original effective dates for the unchanged CELPIP/IELTS/TCF bands and all historical rule versions are **[unverified]**. Do not backdate research verification to them or assert past-law accuracy.

## Intake inputs required by #42

This is a proposed fact model, not an implemented schema or an instruction to collect government portal credentials. Separate **not taken**, **booked/results pending**, **result available**, **unknown**, and **prefer to supply through Representative**; only an available result can enter conversion. A missing result does not block Case intake, utilities or human review.

| Facts to retain | Why needed / condition |
| --- | --- |
| Language; exact test owner/product/version; full four-skill vs partial/retake report | Disambiguates the approved tests and incompatible variants. An ambiguous dropdown label such as IELTS, PTE, TEF or TCF is insufficient. Record OSR explicitly for IELTS. |
| Attempt ID; report identifier/reference; report revision/correction lineage; authorized evidence reference if supplied | Binds the four abilities to one report and avoids mixed attempts. Identifiers may be optional for an explicitly client-reported conversion; documentary verification requires its own evidence. Do not request a provider account password or test PIN just because S2 may require it in the government system. |
| Four independent reported scores, original text/precision, score units/column labels, and present/missing/invalid/conflicting state | Raw R/W/L/S are inputs; converted CLB/NCLC are outputs. Do not accept only an overall score or overwrite raw input. Explicit zero is a supplied fact needing range validation, not a missing-fact sentinel. Preserve conflicting values rather than picking one. |
| TEF `Score / 699` vs `Équivalence ancien score`, test date and any corrected report status; optional report-printed NCLC alongside its scale | Chooses chart A/B/C. Ask the user to copy the exact column heading or supply the report to the Representative. Never infer the column solely from the number. Report-printed NCLC does not prove current Express Entry equivalence. |
| Sitting date; report-issued date; stated expiry/withdrawal/correction if known; date precision and provenance for each | Needed for date cohorts, potential expiry ambiguity, reissues and reminders. A year-only or future date does not establish a completed valid test. Keep result validity (`valid` / `expired` / `unknown`, for an explicit use/date) separate from conversion. |
| Explicit assessment date and calendar/time zone; intended use/context, e.g. Express Entry-compatible vs non-Express-Entry chart; known profile/filing dates only where relevant | Prevents presenting TEF chart C as Express Entry-compatible. No need to assess or invent a named program to ask this context question. Unknown context can yield labelled scale-specific calculations, but no definitive acceptance claim. |
| Source of each fact: Client-reported / Staff-entered / Representative-checked; recorded by/at; supporting authorized evidence | Meets `InputFact` provenance. “Based on the scores you reported” must remain distinct from report authenticity or government verification. |
| Whether an ability was not assessed / officially adjusted; issuer/tool/evidence of supplied notionalized result, if relevant | Routes an exception without medical-detail collection or automatic averaging. Unresolved official adjustment stays unknown. The contract’s separate health/escalation questions must not be inferred from this fact alone. |
| Derived per-skill level or bounded band, chart identity/version, rule/source applicability, missing reasons and calculation receipt | Stores four separate numeric claims; a minimum is only a labelled summary of those four. Never write a guessed aggregate into `immigration.englishClb`. |

The existing [`normalizeProfile`](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/pathways/evaluateDirectAndBlockedPathways.ts#L78) reads only `immigration.englishClb`; its [`toNumber`](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/utils/pathways/evaluateDirectAndBlockedPathways.ts#L56) returns zero for missing/invalid input and accepts numeric prefixes via `parseFloat`. That field has no test, four-skill, scale or date provenance. Treat a pre-existing aggregate as a reported historical fact with unknown conversion basis; it cannot supply this receipt. Do not route converter facts through that normalization or use the demo aggregate threshold as an official rule.

## Assessment-contract admission

These are proposed applications of the fetched contract and owner amendment. The research file itself is **not** a live verified-rule bundle.

| Precise claim / condition | Required result |
| --- | --- |
| Named accepted version, known legitimate component input, unambiguous chart/scale and applicable cohort; exact official table snapshot/check plus versioned calculation retained | That **skill’s conversion claim** may be `supported`, labelled with fact provenance and any 10-and-above bound. Separate skills may be supported while the complete four-skill vector remains incomplete. This does not establish authenticity, current validity or any program criterion threshold. |
| An explicitly implemented result-admission criterion requires an approved version or current result, and known facts plus usable applicable evidence prove the requirement fails | May be `blocked` **only for that result-use criterion**, e.g. a confirmed Academic report cannot satisfy the accepted-General-Training requirement for the selected context. A historical conversion remains separate. Do not conclude a person has no language evidence or is ineligible for immigration. |
| An all-abilities threshold is actually in scope with its own necessary-rule evidence, and one known converted skill fails it | Could establish a criterion-only blocker despite unrelated unknowns. No named-program thresholds are implemented or selected by this ticket; converter output alone never generates this blocker. |
| Missing skill/date/version/column, malformed or conflicting input, score not covered by a published row, wrong/unknown context, unresolved corrected report or adjusted score | `unknown` for the affected claim; retain the missing-fact reason and question. No zero/default, inferred column, rounding or assumed failure. A valid score below the published floor may support “below the lowest published threshold”; its exact CLB/NCLC remains unknown. That is not inherently a program blocker. |
| Test numerically maps but its age/date applicability cannot be established | Conversion and validity are separate claims. Preserve any evidenced conversion; validity stays `unknown`. Do not present the result as current accepted evidence. |
| Source unavailable/stale/withdrawn, current passage not retained, verifier/check absent, original rule version missing, calculation not implemented or effectivity unresolved | `unknown`; a research citation or recent retrieval alone cannot promote it to supported/blocked. A newly fetched page cannot reconstruct a historical receipt. |
| No result, awaiting result, self-estimated aggregate only, unfamiliar test or unsupported precision | `unknown` conversion; human/clarification route. A confirmed excluded version can separately fail a specific admission requirement; ambiguous evidence does not. |
| Quebec-selected/family/business/humanitarian/refugee request | Contract’s `out_of_scope` applies to that subject and referral path. A French score, Quebec preference or missing test is not itself an excluded subject. |
| Safety gate required/undetermined, denied Case authority, mismatched snapshot or failed run | Preserve the contract’s separate escalation/unavailable boundaries. A successful conversion never clears safety, signs a plan or bypasses consent. |

A receipt must include immutable fact/snapshot references, test and chart identity, all required rules/claim citations, the exact source cell for each skill and threshold/range comparison, output unit (CLB or NCLC), top-band lower-bound semantics, calculator/manual-method version, explicit calculation date and all missing facts. A single skill can have its own complete receipt; a requested four-skill vector remains incomplete if any required skill is missing. `result = null` for an incomplete requested result; do not produce a misleading overall total. The contract’s scalar `CalculationReceipt.result` can describe each numeric skill separately. No CRS, ranking, odds, confidence or invitation claims enter it.

`ClaimCitation` additionally requires official URL/title, retained snapshot ID/digest, locator/excerpt, retrieved date, publication/effectivity metadata where known and an identified applicability check with verifier ID/record and verified-as-of. The source reading date here is **2026-11-17**, not a promise of ongoing currency or a substitute for those runtime records. A retained URL plus a digest without the source content is insufficient. Source dates, legal effective dates, test dates, assessment dates and signature dates remain distinct.

### Narrow contract reconciliation required before implementation

1. **Standalone criterion identity.** The fetched `Subject` union offers a named program, legacy generic pathway or excluded scope category; it has no honest independent language-test subject. Add an explicitly bounded test-conversion/result-admission subject (or an equally explicit owner-amendment-compatible representation) before persistence. Do not fake a named program or mark a generic demo pathway supported. #42 should specify the inputs now and carry this schema seam to delivery.
2. **Scope text and coverage.** Reconcile the pre-amendment “no language conversion / no official calculator” wording with the authorized conversion-only capability. Keep named-program coverage empty and CRS unavailable. The legacy engine’s results remain unknown even alongside supported new conversion claims.
3. **Effectivity and top bands.** Source effective dates are nullable in citations, but `RuleBasis.effectiveFrom` is mandatory. Original effective dates for several current tables were not verified. Specification must make current, explicitly checked applicability representable without inventing an original legal effective date, and keep historical applicability unknown. Represent 10-and-above as a bound/band rather than an exact level. Do not use the research date as an invented legal commencement date.

These are discoverable integration gaps in the supplied notation, not requests to reopen owner scope. This research does not edit the contract, decide a schema migration or claim the delivery proof passed.

## Unknowns and disposition for #42

| ID | Unknown that matters | Safe intake disposition / way to resolve |
| --- | --- | --- |
| U1 | **[unverified]** Exact numeric CLB/NCLC outside the published rows, including exact CELPIP 3/11/12 under the IRCC-only authority requirement; exact 11/12 for grouped top bands; detailed allowed score precision/rounding grammar. | Preserve raw scores; return published bands/bounds only. Below-floor exact levels and unusual precision need report clarification/current IRCC evidence. Never interpolate nonexistent levels or round. |
| U2 | **[unverified]** TEF `/699` → old-equivalent arithmetic, whether two columns agree for an individual report, or the correct scale if the column/use is absent. | Collect the exact column and use context; request the old-equivalent report values for Express Entry; keep conflicting results unknown and route for review. |
| U3 | **[unverified]** Exact age-start anchor for every test/report type when sitting and report dates differ; leap-day rollover, expiry instant/time zone; non-Express-Entry equality-at-two-years where general/specific wording differs. | Collect separate dates, expiry and explicit assessment calendar/use. Keep any boundary-sensitive validity claim unknown pending an applicable rule/report check; a numerical conversion may still be retained. |
| U4 | **[unverified]** General permission for mixed attempts/partial retakes and automated use of disability-adjusted scores; this research has not validated the official averaging tool or individual exemption evidence. | Keep attempts separate; no best-score combining or automated averaging. Record official adjustments separately and route to a Representative. |
| U5 | **[unverified]** Original effective dates/full past versions for several unchanged charts; TEF’s exact reversal day and the 2019-09-30 cohort gap. | Assess only an explicitly checked applicable version; no historical-law claim from current content. Old TEF cohorts are expired for current use. Preserve correction lineage. |
| U6 | **[unverified]** TOEFL Essentials acceptance/activation date and equivalencies; any expanded test list after the observation date. UKVI-branded General Training report admission was not specifically established. | TOEFL remains not accepted under current IRCC text; no converter table. Put ambiguous variants through report/rule review; do not infer designation means usable. |
| U7 | **Unresolved contract integration and unrun delivery proof:** standalone subject identity, amendment reconciliation, mandatory rule-effectivity representation and 10+ semantics; no production converter, source-snapshot/check service or end-to-end receipt validation proven. | Carry the explicit seams above into specification/delivery. This research can unblock intake design; supported live findings require the implementation and evidence gates. |
| U8 | **Unverified for any actual Client:** test/report authenticity, ownership, withdrawal/correction status, government verification-portal access, and future validity at an unknown filing date. | Label Client-reported facts honestly; preserve review status and evidence references; require an actual check before claiming documentary verification. Do not collect provider credentials or invent a future application date. |

None of these unknowns requires creating an account, paying for an API, inventing a program threshold or delaying the rest of Case intake. No legal/program coverage, authenticity or pilot readiness follows from this report. Client disclosure still follows the separate Signed plan rules.

## Source register and audit notes

Every source below was read **2026-11-17**. Page-modified dates are recorded only as publisher metadata. The short citation passages above locate rules; numeric tables are exact passages for equivalencies. A citation to a general page supports only its stated rule, not other programs or government approval of cadet2.

| ID | Primary source and locators | Publisher dates / access |
| --- | --- | --- |
| S1 | [Language requirements][S1]: #org, #charts (test and TEF A/B/C headings), #exemptions, #integrity; exact tables above. | Modified 2026-06-23; HTTP 200. |
| S2 | [Express Entry: Language test results][S2]: Language tests we accept, Language requirements, How long your results are valid for, per-test tables and TEF correction notices. | Modified 2026-10-16; HTTP 200. |
| S3 | [Atlantic Immigration Program: Get a language test][S3]: What to include in your application; #test-charts, especially PTE Core CLB 3. Used for conversion facts, not program coverage. | Modified 2026-05-28; HTTP 200. |
| S4 | [Current Express Entry Ministerial Instructions][S4]: section 3(3)(a), section 3(4), current-revision header; only age/current-version facts used. | Modified 2026-11-03; signed 2026-10-15; HTTP 200. |
| S5 | [2024 addition of Pearson language test][S5]: dated 2024-01-30 update text. | Current page modified 2026-06-23; update text supplies acceptance effective date. |
| S6 | [2026 Language requirements update][S6]: dated 2026-06-23 administrative consolidation notice and deleted-instructions list. | Modified 2026-06-23; HTTP 200. |
| S7 | [2025 Language requirements update][S7]: dated 2025-11-20 administrative notice. | Modified 2025-11-20; HTTP 200. |
| S8 | [2023 equivalency-chart update][S8]: dated 2023-12-14; TEF equivalencies/new charts. | Current page modified 2026-06-23; no claim that modification is a new band change. |
| S9 | [Closed EMPP: Language requirements][S9]: OSR exception. Exact locator passage: **“We accept IELTS One Skill Retake (OSR) for EMPP candidates only”**. | Closed-program page; corroborates narrow exception, supplies no pilot admission. |
| S10 | [PGWP: Get the right documents][S10]: #language-proof, age, in-person and disability evidence. | Modified 2026-06-24; HTTP 200. Used only for stated document rules, no PGWP eligibility decision. |
| S11 | [Archived MI: 2025-03-25 to 2026-11-02][S11]: revision date range and section 3. | Prior-version context, not authority for a new current assessment. |
| O1 | [IELTS General Training test][O1], test title and description. Naming passage: **“IELTS General Training test”**; Academic is separately named. | Official test owner; version naming only. |
| O2 | [Pearson PTE Core][O2], test selector / difference FAQ. Naming passages: **“PTE Core”**, **“PTE Academic”**, **“PTE Academic UKVI”**, **“PTE Home (A1, A2, B1)”**. | Official test owner; version naming only. No owner equivalency or validity fact used. |
| O3 | [TEF Canada][O3], page title. Naming passage: **“Your TEF Canada journey”**. | Official test owner; version naming only. |
| O4 | [CELPIP test format][O4], opening description. Naming passages: **“CELPIP Test”**, **“CELPIP LS Test”**. | Official test owner; naming only. Its CLB table/validity text is not equivalency/age authority here. |

For reproducibility, fetched HTML SHA-256 values for the principal sources are listed below. The temporary retrieval files are working evidence outside the branch; they are **not** a durable production snapshot store and their hashes alone cannot satisfy `ClaimCitation.snapshotId`.

| Source | SHA-256 of retrieved HTML |
| --- | --- |
| S1 | `eebc6854bcc50a0c0c021678290d52f5c1de0012c32e11a02069356e51bdeb2d` |
| S2 | `d2000e7a9c61aade7e9c7ebb6eba7dbd3e14aa6e91af173f2cc06c86bebd95c0` |
| S3 | `f771dd1acab0ec34568423e717d267f734abb7db7a7e5bea04ee9df4e12632e1` |
| S4 | `1f38bf25a01f5f873191e189ec3cf309e29416bbd065ac99966e0ddbede183ed` |

Verification performed for this document: fetched primary pages and publisher metadata; checked all 200 transcribed numeric skill cells against source HTML; compared six full S1/S3 tables plus TCF non-top rows; checked the derived IELTS interval boundaries and midpoints against adjacent thresholds; validated Markdown references/source anchors; read the supplied contract, owner decisions, ticket/map and baseline normalization. No application tests, converter tests, portal authentication, government result verification or staging QA were run; no such pass is claimed.

[S1]: https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/standard-requirements/language-requirements.html
[S1org]: https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/standard-requirements/language-requirements.html#org
[S1charts]: https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/standard-requirements/language-requirements.html#charts
[S1exempt]: https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/standard-requirements/language-requirements.html#exemptions
[S2]: https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-test.html
[S2tests]: https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-test.html#accept
[S2valid]: https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-test.html#valid
[S3]: https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/language-testing.html
[S3charts]: https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/atlantic-immigration/language-testing.html#test-charts
[S4]: https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-application-management-system/current.html
[S5]: https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/updates/2024-pearson-language-test.html
[S6]: https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/updates/2026-language-requirements.html
[S7]: https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/updates/2025-language-requirements.html
[S8]: https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/updates/2023-language-test-equivalency-chart.html
[S9]: https://www.canada.ca/en/immigration-refugees-citizenship/services/refugees/economic-mobility-pathways-pilot/immigrate/language-testing.html
[S10]: https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/after-graduation/get-documents.html#language-proof
[S11]: https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-application-management-system/25-march-2025-2-november-2026.html
[O1]: https://ielts.org/take-a-test/test-types/ielts-general-training-test
[O2]: https://www.pearsonpte.com/pte-core/
[O3]: https://www.lefrancaisdesaffaires.fr/en/candidate/test-evaluation-francais/tef-canada/
[O4]: https://www.celpip.ca/test-format-scoring/
