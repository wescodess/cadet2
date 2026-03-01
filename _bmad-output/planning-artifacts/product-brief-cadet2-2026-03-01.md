---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - _bmad-output/project-context.md
  - _bmad-output/planning-artifacts/research/technical-layered-canadian-immigration-recommendation-engine-research-2026-03-01.md
  - docs/index.md
  - docs/README.md
  - docs/project-overview.md
  - docs/user-provided-context.md
  - docs/comprehensive-analysis.md
  - docs/architecture.md
  - docs/architecture-patterns.md
  - docs/rag-v1-architecture.md
  - docs/data-models.md
  - docs/rag-v1-data-model.md
  - docs/api-contracts.md
  - docs/rag-v1-api-contracts.md
  - docs/rag-v1-phase-0-api-contract-deltas.md
  - docs/rag-v1-jobs-and-retries.md
  - docs/rag-v1-implementation-plan.md
  - docs/rag-v1-phase-0-checklist.md
  - docs/rag-v1-phase-1-notes.md
  - docs/youtube-transcript-architecture.md
  - docs/project-structure.md
  - docs/source-tree-analysis.md
  - docs/critical-folders-summary.md
  - docs/project-parts-metadata.md
  - docs/component-inventory.md
  - docs/state-management-patterns.md
  - docs/development-guide.md
  - docs/development-instructions.md
  - docs/contribution-guide.md
  - docs/contribution-guidelines.md
  - docs/deployment-guide.md
  - docs/deployment-configuration.md
  - docs/technology-stack.md
  - docs/supporting-documentation.md
  - docs/existing-documentation-inventory.md
date: 2026-03-01
author: Wesleyukadike
---

# Product Brief: cadet2

<!-- Content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

cadet2 is an immigration pathway intelligence platform designed to help users move from uncertainty to a clear, actionable route toward their Canadian immigration goals. Instead of forcing users to piece together scattered immigration information from official government pages, consultants, community advice, and generic eligibility quizzes, the platform allows them to submit all relevant personal, professional, educational, and immigration-related context in one place and receive a deeply reasoned set of viable pathway recommendations.

The product's core value is not just identifying direct immigration options, but architecting the fastest credible route to a user's goal. This includes both immediate pathways the user may qualify for now and composed, multi-step strategies where one or more intermediate actions such as education, skill acquisition, work experience, or temporary-status progression can unlock stronger end-state pathways later. Each recommendation is designed to explain why it is viable, what may improve the user's chances, what tradeoffs exist, and what concrete steps the user should take next.

cadet2 differentiates itself by combining structured pathway evaluation with LLM-assisted reasoning. The system uses intelligent analysis to absorb complex user context, identify direct and unconventional route combinations, and generate tailored explanations and next-step plans. The result is a product that acts less like a simple eligibility checker and more like an immigration pathway architect and execution guide.

---

## Core Vision

### Problem Statement

New immigrants and immigration-seeking users often have fragmented information about their background, goals, and possible options, but no reliable system to translate that into a clear immigration strategy. They must navigate a complex and evolving landscape of federal programs, provincial streams, temporary permits, education routes, and informal advice sources, often without knowing which path applies best to their specific situation.

### Problem Impact

When users cannot clearly identify the right immigration route, they risk wasting time, money, and opportunity on low-fit pathways or incomplete plans. They may overlook viable direct options, fail to recognize that an indirect route could better serve their long-term goal, or make avoidable mistakes that delay progress. The result is confusion, emotional stress, slower advancement, and lower confidence in major life decisions.

### Why Existing Solutions Fall Short

Existing solutions are fragmented, shallow, or inaccessible. Official government resources are authoritative but difficult to translate into personalized strategy. Community advice is inconsistent and often unreliable. Professional support can be expensive and hard to access early. Most current digital tools focus on simple eligibility matching for obvious pathways, but do not effectively combine full-context intake, multi-step strategy design, personalized improvement guidance, and end-to-end execution planning.

### Proposed Solution

cadet2 provides a robust pathway recommendation engine that allows users to submit all available information related to their immigration journey and receive a structured set of direct, indirect, and composed immigration pathway options. The system identifies the fastest credible route to the user's goal, including cases where the best path involves combining conventional and unconventional steps over time.

For each pathway, cadet2 explains why the route may be viable, what eligibility strengths and weaknesses exist, what the user can do to improve their position, and what concrete actions should come next. For composed pathways, the system maps the full route sequence, showing how each intermediate step improves the user's access to a stronger future pathway. LLM capabilities are used where they create meaningful value, especially in synthesizing complex user input, surfacing non-obvious route combinations, and generating clear personalized guidance.

### Key Differentiators

- Optimizes for the fastest credible route rather than only the most obvious current-match pathway
- Recommends both direct and composed multi-step pathway strategies
- Supports unconventional or non-obvious route combinations when they improve long-term outcomes
- Converts scattered user information into a coherent immigration strategy
- Explains not only what pathways exist, but why they fit, what blocks them, and how to improve fit
- Provides concrete next-step planning rather than stopping at assessment
- Uses LLM assistance to improve intake synthesis, pathway combination discovery, and user guidance
- Functions as an immigration pathway architect, not just a generic eligibility checker

## Target Users

### Primary Users

`cadet2` primarily serves immigration-seeking individuals who need help identifying the fastest credible path toward their Canadian immigration goals.

#### Primary Persona 1: Ada, the Ambitious International Student

Ada is a 24-year-old international student planning her future in Canada. She is motivated, organized, and willing to invest in education, but she is overwhelmed by the number of possible immigration routes and does not know which decisions now will create the best options later.

She currently experiences the problem as uncertainty and planning anxiety. She reads government websites, watches videos, and gets advice from peers, but the information is fragmented and hard to turn into a clear plan. She worries about choosing the wrong program, missing a stronger route, or wasting time and money on steps that do not improve her long-term position.

Success for Ada looks like having a clear, personalized plan that shows:

- which direct pathways are available now
- which composed pathways become viable after targeted steps
- what educational or work decisions will strengthen her position fastest
- what she should do next and why it matters

Her "this is exactly what I needed" moment happens when the platform turns scattered information into a coherent path from student status to a stronger long-term immigration outcome.

#### Primary Persona 2: Daniel, the Temporary Worker Under Pressure

Daniel is a 31-year-old temporary foreign worker already in Canada. He has work experience and a concrete goal, but he feels time pressure because his current status may not be stable forever.

He experiences the problem as urgency mixed with uncertainty. He knows there may be multiple possible routes, but he does not know which one gives him the fastest credible chance of success. He is frustrated by generic advice that does not account for his exact work history, current permit situation, and opportunities to improve his profile.

Success for Daniel means quickly understanding:

- what he qualifies for right now
- what is blocking stronger direct pathways
- whether a short intermediate move could unlock a faster or more secure route
- what sequence of actions he should prioritize immediately

His "this is exactly what I needed" moment happens when `cadet2` shows not just one route, but a ranked plan with clear next actions and realistic tradeoffs.

#### Primary Persona 3: Miriam, the Skilled Applicant with a Non-Obvious Route

Miriam is a 29-year-old skilled worker outside Canada. She has education, work experience, and serious intent to immigrate, but she may not be competitive enough for the most obvious direct path.

She experiences the problem as strategic confusion. She can find many pathway descriptions online, but she does not know whether she should wait, improve her profile, enter through a different temporary route, or pursue a composed path that combines education, new skills, or a staged move into Canada.

Success for Miriam looks like discovering options she would not have found alone, especially:

- non-obvious routes
- intermediate steps that strengthen long-term eligibility
- the fastest realistic strategy given her current profile and constraints

Her "this is exactly what I needed" moment happens when the platform identifies a practical composed pathway that turns a weak direct fit today into a viable route tomorrow.

### Secondary Users

#### Secondary Persona 1: Family Decision Partners

Many users do not make immigration decisions alone. A spouse, sibling, or parent may influence timing, finances, and risk tolerance. These people benefit from clearer recommendations, especially when the platform explains why a pathway fits, what it costs, and what steps are required.

Their value comes from alignment and confidence. `cadet2` helps them understand the logic behind a recommendation, making it easier to support a shared decision.

#### Secondary Persona 2: Immigration Advisors and Support Staff

Although the product is user-first, immigration consultants, advisors, or support staff may also benefit from using it as a structured intake and strategy-assist tool. For them, value comes from faster synthesis of user facts, clearer pathway comparison, and better identification of direct versus composed strategies.

They are not the core audience for the first version, but they may become an important secondary segment as the system matures.

#### Secondary Persona 3: Internal Admin and Pathway Operations Roles

The product also depends on internal administrative or operational users who maintain pathway definitions, evidence quality, and system trust. These users ensure the recommendation engine stays current, structured, and reliable.

They do not use the product in the same way as end users, but they are essential to the long-term value of the platform.

### User Journey

#### Discovery

A user typically begins in a state of uncertainty. They may be searching online, comparing advice sources, or trying to understand whether they have any realistic immigration options at all. They find `cadet2` because they want clarity, speed, and a more personalized answer than generic information sources can provide.

#### Onboarding

The user's first experience is information intake. They provide personal, educational, professional, and immigration-related context, potentially including documents and unstructured details they have already gathered. The product's early value is that it accepts their full situation rather than forcing them into a narrow form.

The onboarding experience should feel like: "finally, I can put everything in one place."

#### Core Usage

The user receives:

- direct pathways they may qualify for now
- indirect or composed pathways that require one or more intermediate steps
- explanations of why each route is viable
- blockers, improvement actions, and tradeoffs
- ranked guidance centered on the fastest credible route

This is where `cadet2` shifts from being an assessment tool to a pathway architect.

#### Success Moment

The user's "aha!" moment happens when the product turns confusion into a clear plan. This usually occurs when they see either:

- a direct route they now understand with confidence, or
- a composed route they had not considered, with a clear explanation of how each step unlocks the next

At that moment, the user feels they finally know what to do next.

#### Long-term

Over time, the product becomes a planning and execution companion. The user can return as their profile changes, their timeline shifts, or they complete intermediate steps. The system continues to refine recommendations, update next actions, and keep them oriented toward their end goal.

In the strongest version of this journey, `cadet2` becomes part of the user's immigration decision-making process from early uncertainty through meaningful progress.

## Success Metrics

Success for `cadet2` should be measured first by whether users gain clarity, confidence, and actionable direction in their immigration journey. The product is successful when it helps users move from uncertainty to a concrete, prioritized pathway plan and motivates them to take meaningful next steps.

### User Success Metrics

From the user's perspective, `cadet2` is working when it consistently produces usable, trusted, and actionable pathway guidance.

Key user success outcomes include:

- Users successfully complete a full-context intake and receive a pathway recommendation package without needing expert intervention.
- Users identify at least one credible route they understand and are willing to pursue.
- Users understand the difference between direct, indirect, and composed pathways.
- Users leave with clear next actions, not just information.
- Users return to refine their plan as their profile changes or as they complete intermediate steps.

Suggested measurable user success metrics:

- `Intake completion rate`: percentage of users who start profile intake and complete it.
  - Early target: `60%+`
- `Recommendation delivery rate`: percentage of completed intakes that successfully generate a pathway plan.
  - Early target: `95%+`
- `Time to first pathway clarity`: median time from intake start to first recommendation output.
  - Early target: `< 10 minutes`
- `Actionability rate`: percentage of users who view and engage with recommended next steps after receiving results.
  - Early target: `70%+`
- `Return usage rate`: percentage of users who come back to update, refine, or revisit their plan within 30 days.
  - Early target: `30%+`
- `Confidence lift`: measured increase between pre-assessment and post-recommendation user confidence in knowing what to do next.
  - Early target: `+40%` relative improvement
- `Perceived usefulness score`: percentage of users who report that the recommendation was helpful, clear, and relevant.
  - Early target: `80%+ positive`

The core user "aha" moment is when a user says, in effect: "I finally understand my best path and what to do next."

### Business Objectives

The business should measure success by whether `cadet2` becomes a trusted, repeatable decision-support system in a high-stakes domain.

#### 3-Month Objectives

At 3 months, success should focus on product validation, trust, and core usage behavior.

- Validate that users complete intake and receive recommendations reliably.
- Confirm that users find the recommendations clear enough to act on.
- Prove that direct and composed pathways create differentiated value versus generic eligibility tools.
- Establish early trust signals around clarity, accuracy, and usefulness.
- Build a base of early active users and learn where recommendations need refinement.

Suggested 3-month targets:

- `500-1,000` early users completing at least one recommendation flow
- `60%+` intake completion rate
- `70%+` next-step engagement rate
- `80%+` recommendation usefulness rating
- `25%+` 30-day return rate
- `<= 10%` of users reporting that recommendations felt too vague or confusing

#### 12-Month Objectives

At 12 months, success should expand to retention, strategic differentiation, and monetizable value.

- Establish `cadet2` as a trusted pathway-planning product, not just a one-time assessment tool.
- Increase repeat usage as users revisit and refine their immigration strategies over time.
- Demonstrate that the product's composed-pathway guidance creates meaningful value users cannot easily get elsewhere.
- Build sustainable acquisition and retention loops through trust and user outcomes.
- Position the platform for advisor-assisted, premium, or partnership-driven growth if desired.

Suggested 12-month targets:

- `10,000+` users completing recommendation flows
- `35%+` monthly returning-user rate among active cohorts
- `50%+` of users engaging with at least one follow-up recommendation or plan update
- `20%+` of recommendation sessions involving composed pathways, proving differentiated value
- `85%+` positive trust/usefulness rating
- A validated monetization signal, such as paid upgrades, advisory conversions, or strong willingness-to-pay

### Key Performance Indicators

The KPIs for `cadet2` should balance user value, trust, operational quality, and business traction.

#### Core User Value KPIs

- `Completed recommendation sessions per month`
- `Median time from intake to recommendation output`
- `Percentage of users shown at least one viable direct pathway`
- `Percentage of users shown at least one viable composed pathway`
- `Next-step click-through rate` on recommended actions
- `Plan revisit rate` within 30 days
- `User confidence lift` before vs. after results

#### Trust and Quality KPIs

Because this product operates in a high-stakes, legal-adjacent space, trust metrics are critical.

- `Recommendation clarity rating`
- `Recommendation usefulness rating`
- `Unsupported recommendation rate`:
  - percentage of outputs flagged as implausible, low-confidence, or requiring correction
  - Early target: `< 5%`
- `Explanation coverage rate`:
  - percentage of pathways that include reasons, blockers, and improvement actions
  - Early target: `95%+`
- `Recommendation success reliability`:
  - percentage of successful pathway generation runs without system failure
  - Early target: `95%+`

#### Engagement and Retention KPIs

- `Intake start-to-completion conversion`
- `Recommendation view rate`
- `Return rate at 7, 30, and 90 days`
- `Users who save, revisit, or compare multiple pathways`
- `Users who complete at least one recommended next-step action`

#### Strategic Differentiation KPIs

These measure whether the product is delivering its unique value, not just generic matching.

- `Composed pathway utilization rate`:
  - percentage of recommendation sessions where a multi-step route is shown
- `Non-obvious route discovery rate`:
  - percentage of users shown at least one meaningful pathway they were unlikely to identify independently
- `Pathway comparison engagement`:
  - percentage of users who compare multiple ranked options before choosing a direction
- `Fastest-route alignment rate`:
  - percentage of users selecting the top-ranked "fastest credible route" recommendation

#### Business and Growth KPIs

- `New completed users per month`
- `Cost per acquired completed user`
- `Referral rate` or word-of-mouth-driven new-user share
- `Conversion to premium/advisory offering` if monetization is introduced
- `Retention by acquisition source`
- `User segment performance` by student, worker, skilled applicant, or family-led profile

The most important strategic principle is this: user success metrics should lead, business metrics should follow. If users consistently gain clarity, trust the outputs, and take action, the business has a real foundation. If those signals are weak, growth metrics alone would be vanity metrics.

## MVP Scope

### Core Features

The MVP for `cadet2` should focus on delivering a first release that creates the core user outcome: a user submits their situation and receives a clear, ranked, actionable immigration pathway plan centered on the fastest credible route.

#### 1. Guided Full-Context Intake

The MVP must allow users to provide enough detail for meaningful recommendations.

Core intake should include:

- personal profile basics (age, country, family status, current location)
- education history
- work experience
- language test status and scores (if available)
- immigration history or current status
- goals and constraints (speed, budget sensitivity, location preference, willingness to study, willingness to relocate)
- free-text context so users can describe anything that does not fit the structured form

For MVP, the intake should feel comprehensive enough to support deep pathway reasoning across a broad set of immigration options.

#### 2. Core Pathway Recommendation Engine

The MVP must generate ranked pathway recommendations from user input.

This includes:

- identifying viable direct pathways the user may qualify for now
- identifying viable indirect or composed pathways where intermediate steps improve eligibility
- ranking pathways based primarily on the fastest credible route
- showing strong recommendation sets rather than generic pathway lists

This is the product's core engine and cannot be missing from MVP.

#### 3. Full Canadian Pathway Coverage from Day One

The MVP should support every major Canadian immigration pathway from day one, including broad national coverage rather than a narrow subset.

This includes:

- federal pathways
- provincial nominee pathways across all provinces and territories where applicable
- niche pilots and less common pathways
- edge-case scenarios where a user may not fit conventional routes cleanly

This makes the MVP much more ambitious, but it aligns with the goal of becoming a true immigration pathway architect rather than a limited early-stage matcher.

#### 4. Deep Coverage of Provinces, Niche Pilots, and Edge Cases

The MVP should not stop at obvious mainstream routes. It should include:

- meaningful provincial depth
- support for specialized or niche programs
- reasoning through uncommon user profiles and unusual pathway combinations
- handling of users who may only qualify through less obvious routes

This is a major differentiator because it increases the likelihood that users with complex profiles can still discover viable pathways.

#### 5. Unlimited-Length Composed Pathway Chains

The MVP should support composed pathway sequencing without an artificial cap on pathway depth.

This includes:

- multi-step route chains beyond `1-2` intermediate steps
- explanation of how each step unlocks future eligibility
- sequencing logic across conventional and unconventional transitions
- prioritization of the fastest credible long-chain route where a direct option is weaker

This expands the engine from a simple recommender into a true pathway sequencing system.

#### 6. Recommendation Breakdown and Explanations

The MVP must explain recommendations clearly enough for users to act.

Each recommendation should include:

- why the pathway may be viable
- what strengths in the user profile support it
- what blockers or weaknesses exist
- what the user can do to improve eligibility
- tradeoffs such as speed, complexity, and effort

Without this layer, the product would feel like a black-box matcher rather than a trusted planning tool.

#### 7. Actionable Next-Step Plan

The MVP must convert recommendations into action.

Each pathway should include clear next steps such as:

- documents or information to gather
- profile improvements to make
- sequencing of immediate actions
- what to do first, next, and later

This is essential because the product promise is guidance, not just assessment.

#### 8. LLM-Assisted Reasoning in Controlled Areas

The MVP should use LLM capabilities where they materially improve user value, but within controlled boundaries.

MVP LLM use should focus on:

- synthesizing complex structured and free-text user inputs
- surfacing plausible non-obvious pathway combinations
- reasoning across broad pathway coverage and long-chain compositions
- generating plain-language explanations and recommendation summaries
- helping personalize next-step guidance

The MVP should not rely entirely on unconstrained LLM judgment. Structured pathway logic should remain the backbone.

#### 9. Limited Save-and-Return Experience

The MVP should allow users to revisit their output.

At minimum, users should be able to:

- save a recommendation session
- return to review their ranked pathways
- update key inputs and regenerate recommendations later

This supports the product's planning use case without requiring a full long-term case-management system yet.

#### 10. Admin / Internal Pathway Configuration Foundation

Even if minimal in the user-facing MVP, the product needs an internal foundation for maintaining pathway definitions and recommendation logic.

At minimum, the system should support:

- a maintainable pathway rules source
- configurable pathway metadata and ranking logic
- the ability to revise recommendation logic as the product learns

This becomes even more important if MVP includes full coverage from day one.

### Out of Scope for MVP

To prevent scope creep, the MVP should still explicitly exclude the following:

- full legal-advice workflows or guarantees of approval
- advisor marketplace or direct consultant matching
- fully automated document ingestion for every file type and format
- real-time policy-change monitoring across all external sources
- collaborative family accounts or multi-user household planning
- advanced financial planning, relocation planning, or settlement services
- enterprise-grade advisor dashboards
- multilingual support beyond the initial language
- fully autonomous end-to-end case management after recommendation

These may become valuable later, but they are not required to prove the core product thesis.

### MVP Success Criteria

The MVP is successful if it proves three things:

#### 1. Core Problem Validation

- Users can submit their profile and receive a recommendation they perceive as clear and actionable.
- Users report that the product helped them understand what to do next.
- Users can distinguish `cadet2` from generic eligibility tools because of its depth, breadth, and composed-pathway capability.

#### 2. Product Behavior Validation

- Users complete intake at healthy rates.
- Recommendation generation works reliably across a broad pathway surface.
- Users engage with next-step guidance after receiving results.
- A meaningful share of users return to revisit or refine their plan.

#### 3. Strategic Differentiation Validation

- The product successfully surfaces composed pathways in cases where a direct-only approach would be insufficient.
- Users find value in ranked "fastest credible route" recommendations even when the best path is long and complex.
- The recommendation engine demonstrates that controlled LLM support improves clarity and usefulness without reducing trust.

Suggested MVP go/no-go signals:

- `60%+` intake completion
- `95%+` recommendation delivery success
- `70%+` next-step engagement
- `80%+` usefulness rating
- strong usage across direct, provincial, niche, and long-chain composed pathway results

### Future Vision

If the MVP succeeds, `cadet2` can evolve into a broader immigration strategy platform with stronger operational sophistication, better automation, and deeper guidance workflows.

#### Near-Term Post-MVP Expansion

- stronger confidence scoring and recommendation validation
- better document ingestion and extraction from uploaded files
- richer comparison tools across multiple pathway chains
- improved reasoning transparency and auditability
- more refined prioritization across speed, cost, and long-term outcomes

#### Medium-Term Evolution

- longitudinal journey tracking as users complete milestones
- dynamic pathway updates as user profiles change
- advisor-assisted or premium workflow layers
- stronger trust, audit, and review systems for recommendation quality
- deeper personalization and planning layers around real-world execution

#### Long-Term Vision

In 2-3 years, `cadet2` could become an immigration pathway operating system: a trusted platform that continuously helps users discover, compare, sequence, improve, and execute immigration strategies over time.
