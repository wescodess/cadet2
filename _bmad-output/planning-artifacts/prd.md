---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-11-complete
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-cadet2-2026-03-01.md
  - _bmad-output/planning-artifacts/research/technical-layered-canadian-immigration-recommendation-engine-research-2026-03-01.md
  - _bmad-output/project-context.md
  - docs/README.md
  - docs/api-contracts.md
  - docs/architecture-patterns.md
  - docs/architecture.md
  - docs/component-inventory.md
  - docs/comprehensive-analysis.md
  - docs/contribution-guide.md
  - docs/contribution-guidelines.md
  - docs/critical-folders-summary.md
  - docs/data-models.md
  - docs/deployment-configuration.md
  - docs/deployment-guide.md
  - docs/development-guide.md
  - docs/development-instructions.md
  - docs/existing-documentation-inventory.md
  - docs/index.md
  - docs/project-overview.md
  - docs/project-parts-metadata.md
  - docs/project-scan-report.json
  - docs/project-structure.md
  - docs/rag-v1-api-contracts.md
  - docs/rag-v1-architecture.md
  - docs/rag-v1-data-model.md
  - docs/rag-v1-implementation-plan.md
  - docs/rag-v1-jobs-and-retries.md
  - docs/rag-v1-phase-0-api-contract-deltas.md
  - docs/rag-v1-phase-0-checklist.md
  - docs/rag-v1-phase-1-notes.md
  - docs/source-tree-analysis.md
  - docs/state-management-patterns.md
  - docs/supporting-documentation.md
  - docs/technology-stack.md
  - docs/user-provided-context.md
  - docs/youtube-transcript-architecture.md
documentCounts:
  productBriefs: 1
  research: 1
  brainstorming: 0
  projectDocs: 34
classification:
  projectType: web_app
  domain: legaltech
  complexity: high
  projectContext: brownfield
workflowType: 'prd'
---

# Product Requirements Document - cadet2

**Author:** Wesleyukadike
**Date:** 2026-03-01

## Executive Summary

`cadet2` is a high-trust Canadian immigration planning platform designed to turn a fragmented, fast-changing immigration process into a clear, structured, and actionable pathway journey. It helps users move from uncertainty to a defined plan by analyzing their personal context, identifying relevant immigration options, and presenting detailed pathway recommendations supported by correctly cited information and achievable next steps.

The product is built for people who need more than generic eligibility checks or scattered advice. Instead of forcing users to interpret changing rules, inconsistent online guidance, or expensive expert input on their own, `cadet2` aims to provide a better-structured experience that makes complex immigration decisions easier to understand and act on. The core value is not only surfacing possible pathways, but organizing them into a recommendation experience that is relevant, explainable, and practically useful.

At its strongest, `cadet2` gives users the confidence that they are looking at quality immigration pathway guidance they can trust. The intended result is a product that reduces confusion, improves decision quality, and helps users follow a realistic path through a domain that is becoming harder to navigate as Canadian immigration rules evolve.

### What Makes This Special

What differentiates `cadet2` is the combination of recommendation quality, evidence quality, and execution clarity. Users are not just shown pathway options. They receive detailed, relevant recommendations with supporting information that is correctly cited, clearly defined, and translated into concrete next actions they can realistically follow.

The core product insight is that the immigration journey itself is poorly structured for ordinary users. The information may exist, but the experience is fragmented, difficult to interpret, and hard to sequence into a coherent plan. `cadet2` creates value by redesigning that experience into something clearer, more guided, and more usable. It treats immigration support as a structured decision journey rather than a loose collection of rules, articles, and disconnected advice.

This is the key "this is exactly what I needed" moment: users get clear guidance, relevant recommendations, trustworthy citations, understandable explanations, and achievable steps in one place. That is the point where the product becomes meaningfully better than static government pages, informal community advice, or shallow recommendation tools.

## Project Classification

`cadet2` is a `web_app` operating in the `legaltech` domain. It has `high` complexity because it deals with legal-adjacent decision support, trust-sensitive recommendations, changing rules, and a need for clear evidence and explanation. It is also a `brownfield` project, meaning this PRD is defining the next stage of an existing platform rather than a net-new product from zero.

## Success Criteria

### User Success

Users should leave `cadet2` with a clear sense of their best realistic immigration path, why it fits, and what to do next. The core user win is not just that they receive an answer, but that they feel clarity, trust, and forward motion in a domain that normally produces confusion and anxiety.

The strongest user success signal is actionability. A recommendation only counts as successful if the user can understand it, trust the evidence behind it, and translate it into achievable next steps. Return usage also matters because immigration is rarely a one-time decision. As rules change and user circumstances evolve, the product should become a planning companion, not a disposable one-off result.

The primary "aha!" moment is when a user sees a pathway recommendation that is clearly relevant, correctly cited, and materially better structured than what they could piece together from government pages, online communities, or generic quizzes.

### Business Success

In the first 3 months, success should mean proving that users will complete the flow, receive credible recommendations, and engage with next steps. This stage is about trust validation, not vanity scale. Early traction only matters if users are completing recommendation sessions and finding them useful enough to act on.

By 12 months, success should shift from validation to repeatable value. That means growing completed recommendation sessions, improving return usage, and proving that users continue to come back as their immigration plans change. A strong long-term signal is that the product is not only used once, but reused when users need to re-evaluate pathways, compare options, or respond to new policy changes.

Monetization is a later signal, not the first one. Early business proof should prioritize completed usage, trust, and retention. Revenue, paid upgrades, or advisor-assisted adoption should be treated as second-order confirmation after the product proves it meaningfully helps users make better immigration decisions.

### Technical Success

Technical success is non-negotiable in four areas: recommendation reliability, citation traceability, update freshness, and safety against misleading outputs.

The system must generate recommendations consistently and without brittle failures. Every recommendation must be backed by traceable, source-linked evidence so the user can see where claims come from. Because the policy environment changes, the product must keep recommendation logic and supporting evidence current enough that outputs remain relevant and not stale. The system must also minimize unsupported, ambiguous, or misleading recommendations, because trust loss in this domain is expensive and hard to recover.

A technically successful version of `cadet2` is not just fast or online. It is a system that produces evidence-backed outputs, degrades safely when evidence is weak, and can be updated quickly as immigration pathways, rules, and operational priorities change.

### Measurable Outcomes

- `Intake completion rate`: at least `60%` of users who start the recommendation flow complete enough intake to receive a result.
- `Recommendation generation success rate`: at least `95%` of completed intakes produce a recommendation package without system failure.
- `Next-step engagement rate`: at least `70%` of users who receive results engage with at least one recommended action, pathway detail, or follow-up step.
- `Perceived usefulness / trust rating`: at least `80%` of surveyed users rate the recommendation as clear, useful, and trustworthy.
- `30-day return rate`: at least `25%` in the first validation phase, with a target of `35%+` by 12 months.
- `Unsupported recommendation rate`: below `5%` of outputs are flagged as implausible, weakly supported, or in need of correction.
- `Median time to first recommendation`: under `10 minutes` from intake start to first result in the MVP flow.
- `Evidence coverage rate`: at least `95%` of recommendation claims shown to users include attached citation support or an explicit low-confidence caveat.

## Product Scope

### MVP - Minimum Viable Product

The MVP should prove one thing: a user can submit meaningful immigration context and receive a structured, trustworthy, actionable pathway recommendation that is better than what they would get from fragmented self-research.

That means MVP must include:

- guided intake for core user facts, goals, and constraints
- recommendation generation for a defined initial set of Canadian immigration pathways
- pathway ranking based on best-fit and fastest credible route
- clear explanation of why a pathway fits
- correctly cited supporting information
- achievable next-step guidance
- explicit confidence or caveat handling when evidence is weak or incomplete

The MVP does not need to cover every possible niche pathway on day one if doing so weakens trust. In practice, the real MVP is the smallest slice that produces high-confidence recommendations in a limited but meaningful pathway set.

### Growth Features (Post-MVP)

Post-MVP should expand the product from useful to competitive.

This should include:

- broader pathway coverage across more provincial and specialized streams
- stronger multi-step composed pathway logic
- richer pathway comparisons and scenario planning
- saved plans, revisit flows, and recommendation history
- improved evidence freshness workflows and update notifications
- deeper personalization based on changing user context over time
- optional advisor-facing or assisted-review workflows

These make the product harder to replace, but they should come after the core trust loop is proven.

### Vision (Future)

The long-term vision is a high-trust immigration pathway intelligence system that behaves like a strategic planning companion, not just a recommendation engine.

In that version, `cadet2` continuously helps users:

- re-evaluate their path as rules change
- compare direct and composed routes over time
- understand tradeoffs across speed, cost, eligibility, and risk
- receive structured recommendations that stay evidence-backed as the environment evolves
- navigate an immigration journey with far more clarity than existing fragmented tools or advice channels provide

The strongest future version becomes the default system a user returns to whenever their situation changes, not just the first place they check.

## User Journeys

### Journey 1: Ada, the Planner Who Wants to Make the Right Early Move

Ada is an international student who knows her future decisions in Canada will shape her long-term immigration outcome, but she does not know which choices actually improve her odds. She has read official pages, watched videos, and heard conflicting advice from peers. She is not looking for more information. She is looking for a plan she can trust.

She arrives at `cadet2` with anxiety and cautious hope. Her pain is not a lack of motivation. It is the fear of making the wrong early move and wasting time, money, or opportunity. She begins a guided intake and, for the first time, feels that the system is asking for the full context of her life rather than forcing her into a shallow eligibility quiz.

As she enters her education plans, financial constraints, work goals, and willingness to relocate, the product starts to feel useful. The rising action in her journey is the transition from scattered facts to structured context. She is no longer holding fragmented pieces in her head. The system is building a decision-ready picture.

The climax is when `cadet2` returns a ranked set of pathways that includes both immediate options and a stronger composed route she had not considered. It explains why the route fits, what is blocking stronger options today, and what specific decisions she should make now to improve her future position. This is the moment where the product becomes different from generic advice.

The resolution is clarity. Ada leaves with a defined direction, a realistic sequence of next steps, and confidence that her current decisions are now connected to a longer-term immigration outcome rather than guesswork.

This journey reveals requirements for:

- deep, structured intake
- support for goals, constraints, and future planning inputs
- direct and composed pathway recommendation logic
- clear ranking and explanation
- actionable next-step planning

### Journey 2: Daniel, the Worker Under Deadline Pressure

Daniel is already in Canada and feels the clock ticking. His status is not infinitely stable, and he cannot afford vague or overly theoretical advice. He needs to know what is realistically available now, what is close but blocked, and what action has the highest immediate payoff.

He arrives stressed, skeptical, and focused on urgency. His opening scene is shaped by time pressure. He is not browsing casually. He wants a fast, trustworthy answer that reflects his exact work history, current status, and short-term options.

He completes intake with an emphasis on current permit status, work experience, language profile, and deadlines. As the product processes his case, the tension in the journey is whether it can give him something usable instead of another list of generic programs.

The climax is when `cadet2` produces a recommendation that clearly separates:

- pathways he can pursue now
- stronger options that are almost viable but blocked
- the fastest achievable next move to improve his position

If an ideal pathway is not currently available, the system still provides a credible fallback route with explicit tradeoffs and immediate actions. That matters because Daniel's version of success is not "perfect advice." It is "what do I do next, right now, with the least wasted motion?"

The resolution is relief combined with urgency translated into structure. He leaves knowing what to prioritize first instead of continuing in confusion.

This journey reveals requirements for:

- urgency-aware recommendation framing
- clear blocker identification
- tradeoff communication
- strong prioritization of next actions
- fast path-to-answer without sacrificing evidence quality

### Journey 3: Miriam, the User With a Non-Obvious Route

Miriam is outside Canada and has a serious goal, but her profile does not cleanly fit the most obvious direct route. She has enough qualifications to feel close, but not enough certainty to know whether she should wait, improve, pivot, or pursue a more strategic route.

She comes to `cadet2` after exhausting standard sources. The opening scene is frustration with shallow tools that can only tell her what she does not qualify for. Her real need is not a rejection. It is strategic reorientation.

She enters her experience, education, language status, and long-term goals. The rising action in her journey is the system's ability to evaluate not only direct-fit pathways but also indirect and unconventional routes that require staged improvement.

The climax is when the product surfaces a composed pathway that she likely would not have identified on her own. It does not present this as speculative magic. It explains the sequence, the logic behind each step, what conditions must improve, and what risks or tradeoffs she should consider.

The resolution is strategic confidence. Even if she is not ready for the strongest direct route today, she now has a credible path forward and a clearer reason to take the next step instead of stalling.

This journey reveals requirements for:

- non-obvious route discovery
- multi-step pathway sequencing
- transparent explanation of intermediate steps
- confidence and caveat signaling
- support for strategic, longer-horizon planning

### Journey 4: Internal Admin/Ops User Maintaining Trust and Quality

The internal admin/ops user is responsible for keeping the recommendation system trustworthy. This person may not use the product like an end user, but they directly affect whether the product remains credible as immigration rules, pathway requirements, and supporting evidence change.

Their opening scene is operational responsibility. They are monitoring a system where outdated logic, stale evidence, or poorly structured pathways can quickly erode trust. Their job is to keep the recommendation layer current, structured, and defensible.

They enter the system to review pathway definitions, update recommendation logic, validate evidence sources, and monitor whether outputs are still aligned with current immigration realities. The rising action is not emotional in the same way as a consumer user, but it is operationally high stakes: every weak citation, outdated rule, or broken recommendation can turn into user confusion or bad decisions.

The climax is when they identify and correct a trust risk before it spreads: a stale citation source, an outdated pathway assumption, or a recommendation structure that no longer reflects current policy conditions. The system must make that work visible, auditable, and manageable.

The resolution is system confidence at scale. A successful admin/ops journey means the internal team can maintain recommendation quality without relying on informal memory, scattered manual checks, or fragile hidden logic.

This journey reveals requirements for:

- pathway and policy management interfaces
- evidence source curation and refresh workflows
- auditability of recommendation logic and citations
- internal monitoring for recommendation quality issues
- operational tooling for updating and validating trust-sensitive content

### Journey Requirements Summary

These journeys define the product as more than a recommendation screen. They imply a system with several connected capability layers:

- comprehensive user intake that captures real context, not just surface eligibility
- recommendation logic that supports direct, blocked, and composed pathways
- ranking and explanation that prioritize trust and actionability
- explicit next-step guidance tied to user constraints and urgency
- confidence, caveat, and evidence signaling so users understand what is strong vs uncertain
- internal operational tooling to maintain pathway logic, evidence quality, and recommendation trust over time

The critical requirement pattern is this: the end-user experience and the internal trust-maintenance experience are inseparable. If admin/ops cannot keep the knowledge and evidence layer current, the user journeys fail even if the UI looks good.

## Domain-Specific Requirements

### Compliance & Regulatory

- The product must clearly position itself as immigration decision support, not as unqualified legal representation or guaranteed outcome advice.
- Recommendations must be framed with appropriate caution where interpretation is involved, especially when pathway fit depends on incomplete, changing, or user-supplied facts.
- The system should preserve strong source provenance so users can trace recommendation claims back to official or curated evidence.
- The product must support clear disclosure boundaries:
  - what is sourced fact
  - what is recommendation logic
  - what is strategic guidance or inferred next-step advice
- Because immigration rules can change quickly, recommendation logic and supporting evidence must be maintainable and reviewable as policy conditions evolve.
- Internal operational changes to pathway logic, source curation, and trust-sensitive recommendation behavior should be auditable.

### Technical Constraints

- Personal data handling must be conservative because users may submit sensitive identity, immigration history, employment, education, and family information.
- The system needs strong access control and role separation between end users and internal admin/ops users who manage pathways, evidence, and recommendation quality.
- Recommendation generation must preserve citation traceability end to end so that evidence is not detached from the final output.
- The system must distinguish high-confidence outputs from weak or incomplete outputs and degrade safely when evidence is insufficient.
- Recommendation logic must be updateable without forcing brittle code-only changes for every pathway or policy adjustment.
- The product should maintain clear logging and audit trails for recommendation generation, source freshness, and internal rule or evidence changes.

### Integration Requirements

- The platform needs a reliable ingestion and curation workflow for official and trusted immigration sources, especially sources tied to Canadian immigration rules and policy updates.
- It should support internal pathways, evidence sources, and recommendation logic that can be refreshed as source content changes.
- Recommendation outputs should be tightly linked to source metadata so citations remain clear, current, and inspectable.
- Internal admin/ops workflows need tools for:
  - reviewing source quality
  - updating pathway definitions
  - validating recommendation trustworthiness
  - monitoring whether stale or weak evidence is affecting outputs
- If future advisor-assisted workflows are added, the architecture should be able to support internal review or override layers without breaking the core trust model.

### Risk Mitigations

- The primary risk is misleading or overconfident recommendations in a high-stakes domain.
  - Mitigation: explicit confidence handling, clear caveats, source traceability, and strong reviewable pathway logic.
- A major operational risk is stale policy or outdated pathway assumptions.
  - Mitigation: source freshness controls, evidence refresh workflows, and admin/ops visibility into what needs updating.
- Another risk is user over-reliance on recommendations without understanding limits or assumptions.
  - Mitigation: structured explanation, clearly defined next steps, and visible separation between facts, interpretation, and strategic guidance.
- Sensitive personal data creates privacy and trust exposure.
  - Mitigation: conservative data handling, role-based access, auditability, and minimal exposure of sensitive details outside required workflows.
- Internal logic drift is a long-term trust risk.
  - Mitigation: auditable updates, operational review surfaces, and explicit ownership of pathway and evidence quality.

## Innovation & Novel Patterns

### Detected Innovation Areas

The primary innovation is a shift from fragmented immigration information access to structured immigration pathway orchestration. Most alternatives force users to do one of three weak things: read static government pages, rely on inconsistent community advice, or use shallow tools that only test direct eligibility. `cadet2` changes that by treating immigration planning as a guided recommendation problem rather than an information lookup problem.

A second innovation area is the combination of recommendation quality and evidence quality in the same user-facing flow. The product is not just trying to suggest pathways. It is trying to produce recommendations that are:

- relevant to full user context
- clearly explained
- properly cited
- converted into achievable next actions

That combination matters because many tools can retrieve information, but fewer can turn it into a structured, trust-sensitive plan the user can actually follow.

A third innovation area is the product's emphasis on composed and non-obvious pathways. Instead of stopping at "you qualify" or "you do not qualify," the system can reason about intermediate moves that improve future eligibility. That moves the product beyond static matching and toward pathway strategy design.

### Market Context & Competitive Landscape

The clearest competitive gap is not access to immigration information. That already exists. The gap is structure, interpretability, and sequencing. Official sources are authoritative but difficult for ordinary users to translate into personal strategy. Informal channels are often easier to consume but less reliable. Traditional digital tools frequently simplify the problem too aggressively and miss non-obvious or multi-step routes.

`cadet2` is differentiated if it consistently does three things better than those alternatives:

- synthesizes scattered user context into one coherent recommendation picture
- keeps recommendations anchored to visible evidence
- produces a plan that feels achievable, not abstract

That means the product's innovation should be positioned as a better trust-and-decision experience, not as "AI for immigration" in the generic sense.

### Validation Approach

The innovative parts of this product should be validated through behavior, not only user opinion.

The core validation questions are:

- Do users complete the intake because the structured flow feels worth the effort?
- Do users engage more with recommendations that are cited and clearly sequenced?
- Do users trust composed pathway recommendations enough to consider them seriously?
- Do users report that the product gave them a path they would not have found alone?
- Do users take next actions at a higher rate than they would after reading static resources?

The fastest validation path is to test whether users perceive a meaningful jump in clarity and actionability compared with their baseline research process. If the product is truly innovative, users should say some version of: "this gave me a clearer and more useful plan than what I could piece together myself."

### Risk Mitigation

The biggest innovation risk is overreaching. If the product claims too much novelty but cannot consistently produce trustworthy, well-cited, and actionable recommendations, the innovation becomes liability instead of advantage.

The second risk is that non-obvious pathway logic may feel speculative or unsafe if it is not explained clearly. That means every innovative recommendation pattern must be paired with:

- transparent reasoning
- visible evidence
- confidence or caveat signaling
- clear boundaries around uncertainty

The third risk is product drift into "innovation theater." The product should not chase novelty for its own sake. The standard for innovation here is simple: does it create materially better decision clarity for the user? If not, it is not product innovation worth preserving.

## Web App Specific Requirements

### Project-Type Overview

`cadet2` should be built as a modern web application optimized for structured, trust-sensitive decision workflows rather than as a content-only website. The product's core value depends on guided intake, recommendation review, explanation depth, and iterative plan refinement, which all fit an application-first browser experience.

The product should support both public and authenticated states. Public-facing surfaces can explain value, establish trust, and enable discovery, while the core pathway recommendation experience should live inside a secure, stateful application flow where user context, saved progress, and recommendation history can be managed reliably.

### Technical Architecture Considerations

The application should prioritize a responsive, app-like experience across desktop and mobile browsers. Because users may be entering detailed information and reviewing nuanced recommendations, the interface should support long-form interaction, progressive disclosure, and stable session handling without feeling brittle or overloaded.

The architecture should support asynchronous recommendation generation and state transitions cleanly. Users may need to wait for evidence-backed pathway generation, review results, revisit saved recommendations, or see updated outputs when their context changes. That means the web app should handle loading states, partial progress, and result refreshes in a way that preserves trust rather than creating ambiguity.

The product should also preserve a strict separation between client-facing interaction and server-side trust-sensitive logic. Recommendation generation, source-backed reasoning, citation construction, and policy-sensitive orchestration should remain controlled by server-side workflows and not be exposed as loosely trusted client logic.

### Browser Matrix

The product should support current major browsers on both desktop and mobile, with special attention to:

- Chrome
- Safari
- Edge
- Firefox

The practical requirement is not broad legacy support. It is dependable access for modern users completing a form-heavy, trust-sensitive workflow on common devices. Mobile usability matters, but the experience should not be reduced to a mobile-first oversimplification if that weakens clarity for more complex recommendation review.

### Responsive Design

The web app must work across desktop and mobile layouts without losing decision clarity. Intake, recommendation comparison, citation review, and next-step planning must remain readable and actionable on smaller screens.

Responsive behavior should preserve:

- form clarity during long multi-step intake
- easy scanning of recommendation explanations
- readable citation and evidence presentation
- usable admin/ops workflows on practical screen sizes where appropriate

The design should optimize for high-information-density screens without becoming visually overwhelming.

### Performance Targets

The product must feel stable and responsive during three critical moments:

- intake submission
- recommendation generation
- recommendation review and follow-up actions

Performance targets should prioritize perceived trust, not just raw technical speed. Users should always understand whether the system is collecting data, generating outputs, waiting on evidence, or presenting final recommendations. If a recommendation takes time, the system should show meaningful progress and state rather than a vague spinner.

A strong target is to keep the path from completed intake to first recommendation under the success threshold already defined in the PRD, with clear feedback if background processing extends beyond the normal path.

### SEO Strategy

SEO is relevant for discovery-oriented public pages, educational entry points, and trust-building surfaces. Those pages should help users understand what the product does, why it is credible, and whether it is worth using.

The core recommendation workflow itself is not the primary SEO surface. It is an authenticated, context-rich product journey. As a result, SEO strategy should focus on:

- public trust-building pages
- educational and explanatory content
- clear positioning around immigration planning support

This should not compromise the structure or security of the core application experience.

### Accessibility Level

Accessibility should be treated as a first-order product requirement, not a polish layer. Users in this domain may be stressed, uncertain, and navigating complex decisions. The system should reduce cognitive load wherever possible.

The web app should support:

- keyboard-accessible navigation and form completion
- readable hierarchy and strong contrast
- accessible labels, validation, and error handling
- clear feedback during loading and processing states
- structured presentation of recommendations, citations, and next steps

Because the product is legal-adjacent and trust-sensitive, accessible communication is directly tied to product credibility.

### Implementation Considerations

The implementation should favor clear, structured workflows over visually clever but cognitively expensive interaction patterns. This product earns trust through clarity, not novelty for its own sake.

The most important web-app implementation priorities are:

- resilient multi-step intake
- transparent recommendation state handling
- strong session continuity
- readable recommendation presentation
- secure server-controlled trust logic
- maintainable admin/ops interfaces for evidence and pathway quality management

The `web_app` requirement set should reinforce the product's core differentiator: a user should feel that the browser experience is helping them make a better decision, not simply showing them data.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Trust-first problem-solving MVP

The MVP should be designed to validate one core hypothesis: users will trust and act on a structured, cited, clearly explained immigration pathway recommendation if it feels materially better than fragmented self-research.

This is not a platform MVP and not a "cover everything" MVP. It is a focused problem-solving MVP. The product should prioritize recommendation quality, evidence visibility, and actionability over broad pathway breadth. In a domain like this, narrow and credible beats broad and unstable.

**Resource Requirements:** Small cross-functional founding team

The minimum realistic team for this MVP is:

- 1 strong full-stack product engineer
- 1 domain/product owner responsible for pathway logic and trust decisions
- 1 part-time or shared support contributor for source curation, QA, and operational validation

If resources are tighter, the absolute minimum is one technical builder plus one domain owner, with some internal admin/ops workflows handled manually in the earliest release.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**

- Primary end-user success path for users like Ada, Daniel, and Miriam
- Basic internal admin/ops path for maintaining pathway definitions, evidence quality, and recommendation trust

The MVP should support the core recommendation experience and the minimum internal controls needed to keep that experience defensible. It does not need a fully mature admin platform, but it does need enough internal tooling or controlled operational flow to prevent trust drift.

**Must-Have Capabilities:**

- guided multi-step intake for user facts, goals, and constraints
- support for a defined initial subset of Canadian immigration pathways
- recommendation engine that can rank direct and limited composed pathways within that subset
- clear explanation of why a pathway fits, what blocks it, and what the user should do next
- visible citations tied to recommendation claims
- confidence or caveat signaling when information is incomplete or uncertain
- secure authenticated experience for saving or completing a recommendation workflow
- internal admin/ops ability to review and update core pathway logic and evidence inputs
- recommendation state handling that is stable, understandable, and transparent to the user

**MVP Boundary Decision:**

The MVP should intentionally limit pathway coverage to the highest-value, best-understood initial set. It should not attempt exhaustive coverage of every provincial, niche, and edge-case pathway in the first release. If a pathway area cannot be supported with confidence and maintainable evidence, it should not be in MVP.

### Post-MVP Features

**Phase 2 (Post-MVP):**

- broader pathway coverage across additional federal, provincial, and specialized streams
- stronger multi-step composed pathway logic
- richer comparison views between multiple recommendations
- saved plans, revisit flows, and recommendation history
- improved update notifications when user context or policy conditions change
- stronger internal admin workflows for source refresh and recommendation review
- better operational visibility for stale evidence, weak citations, and trust-risk detection

Phase 2 should make the product more competitive and more reusable, but only after the MVP proves that users trust the core recommendation experience.

**Phase 3 (Expansion):**

- deeper edge-case and niche pathway coverage
- more advanced strategic planning and scenario simulation
- advisor-assisted or internal review layers
- more mature admin/ops tooling for large-scale pathway maintenance
- optional expansion into additional user segments or adjacent immigration-planning use cases
- more advanced personalization and longitudinal planning support

Phase 3 is where `cadet2` evolves from a strong recommendation product into a broader immigration pathway intelligence platform.

### Risk Mitigation Strategy

**Technical Risks:**
The highest technical risk is building a recommendation system that appears intelligent but is not consistently trustworthy. The mitigation is to narrow MVP scope to a manageable pathway set, keep recommendation logic reviewable, require visible citations, and support safe degradation when evidence is weak.

A second technical risk is overcomplicating composed-pathway logic too early. The mitigation is to support limited but defensible composed-path scenarios in MVP, then expand the sequencing engine once the trust loop is proven.

**Market Risks:**
The biggest market risk is that users may not trust the recommendations enough to act, even if they are technically correct. The MVP addresses this by focusing on explanation quality, evidence visibility, and actionable next steps rather than broad feature breadth.

Another market risk is trying to appeal to too many user types at once. The mitigation is to focus first on the core consumer user journey and only the minimum internal admin/ops layer required to maintain trust.

**Resource Risks:**
The largest resource risk is attempting full immigration-pathway breadth before the team can maintain it. The mitigation is to constrain MVP scope hard, keep some operational tasks manual where acceptable, and defer scale-oriented features until the core trust model is working.

If resources shrink further than expected, the fallback is a narrower first release with fewer supported pathways, more manual internal validation, and less polished admin tooling, while preserving the quality bar on recommendations.

## Functional Requirements

### User Intake & Profile Management

- FR1: Prospective users can create an account and access a secure recommendation workspace.
- FR2: Users can start a guided intake flow that collects personal, educational, professional, immigration, and goal-related context.
- FR3: Users can provide both structured inputs and free-form context during intake.
- FR4: Users can save partial intake progress and return later to continue.
- FR5: Users can review and update previously submitted profile information.
- FR6: Users can declare priorities and constraints that influence recommendation outcomes, including timing, cost sensitivity, location preferences, and willingness to study or relocate.
- FR7: Users can submit a completed intake for recommendation generation.
- FR8: Users can manage multiple recommendation runs over time as their circumstances change.

### Recommendation Generation & Pathway Analysis

- FR9: Users can receive pathway recommendations based on their submitted profile and stated priorities.
- FR10: The product can identify direct pathways that are currently viable for a user.
- FR11: The product can identify pathways that are not yet viable but may become viable if specific gaps are addressed.
- FR12: The product can generate limited composed pathway recommendations where an intermediate step improves future eligibility.
- FR13: The product can rank recommendations by best-fit and fastest credible route.
- FR14: The product can distinguish between strong-fit, conditional-fit, and lower-confidence recommendations.
- FR15: The product can withhold or qualify recommendations when available evidence is insufficient or conflicting.
- FR16: Users can receive updated recommendations after changing profile inputs or re-running the analysis.

### Recommendation Explanation & Decision Support

- FR17: Users can view why each recommendation is considered relevant to their situation.
- FR18: Users can view the strengths in their profile that support a recommendation.
- FR19: Users can view blockers, weaknesses, or missing conditions that reduce recommendation fit.
- FR20: Users can view concrete actions that may improve eligibility for a recommendation.
- FR21: Users can view tradeoffs associated with each recommendation, including effort, timing, and strategic complexity.
- FR22: Users can compare multiple recommendations in a structured way before deciding what to pursue.
- FR23: Users can view a clear distinction between immediate options and longer-horizon strategic options.
- FR24: Users can understand when a recommendation reflects direct pathway fit versus a multi-step strategic pathway.

### Evidence, Citations & Trust Signals

- FR25: Users can view citations linked to recommendation claims.
- FR26: Users can inspect supporting source context for cited recommendation guidance.
- FR27: The product can distinguish source-backed facts from inferred strategic guidance.
- FR28: Users can see when a recommendation includes caveats, assumptions, or confidence warnings.
- FR29: The product can maintain traceable linkage between recommendation outputs and their supporting sources.
- FR30: Internal users can review the source basis behind recommendation logic when validating trustworthiness.

### Recommendation Follow-Through & Continuity

- FR31: Users can receive a clear next-step plan for each recommendation.
- FR32: Users can revisit previous recommendation results and continue planning from earlier sessions.
- FR33: Users can track changes in their recommendation set after profile updates or new recommendation runs.
- FR34: Users can preserve recommendation outputs for future reference within their workspace.
- FR35: Users can use the product repeatedly as their immigration situation changes over time.

### Internal Admin/Ops Trust Management

- FR36: Internal admin/ops users can manage the active set of supported pathways used in recommendations.
- FR37: Internal admin/ops users can update pathway definitions, eligibility assumptions, and recommendation rules.
- FR38: Internal admin/ops users can curate and manage trusted evidence sources used to support recommendations.
- FR39: Internal admin/ops users can review whether recommendation outputs remain aligned with current policy conditions.
- FR40: Internal admin/ops users can identify stale, weak, or questionable recommendation support and take corrective action.
- FR41: Internal admin/ops users can audit changes to trust-sensitive recommendation logic and source curation.
- FR42: Internal admin/ops users can validate that recommendation claims remain properly cited and reviewable.

### Access Control & Operational Safeguards

- FR43: The product can enforce separate access levels for end users and internal admin/ops users.
- FR44: The product can protect user-specific recommendation data from unauthorized access.
- FR45: The product can preserve a clear boundary between user-facing recommendation experiences and internal trust-management activities.
- FR46: The product can maintain recommendation workflows that remain reviewable and controllable by internal operators.
- FR47: The product can support a narrow initial pathway set in MVP while allowing the supported pathway inventory to expand over time.
- FR48: The product can prevent unsupported or out-of-scope pathway areas from appearing as if they are fully covered in the MVP experience.

## Non-Functional Requirements

### Performance

- The system should allow users to progress through core intake actions without perceptible lag during normal use.
- The system should provide clear, immediate feedback when user inputs are saved, validated, or submitted.
- The system should return the first recommendation result within the success target already defined in the PRD under normal operating conditions.
- When recommendation generation takes longer than the normal expected path, the system should communicate processing state clearly rather than leaving users in an ambiguous waiting state.
- Recommendation review, pathway comparison, and citation inspection should remain responsive enough that users can evaluate results without friction.

### Security

- Sensitive user data must be protected in transit and at rest.
- Access to user-specific recommendation data must be restricted to the authorized user and authorized internal roles only.
- Internal admin/ops capabilities must be protected through separate access controls from end-user capabilities.
- The system must preserve auditable records for trust-sensitive internal changes to pathway logic, evidence sources, and recommendation rules.
- The product must minimize unauthorized exposure of personal, immigration, educational, employment, and family-related data.
- The system must preserve a secure boundary between public-facing experiences, authenticated user workspaces, and internal trust-management functions.

### Reliability

- The recommendation workflow should complete successfully for the large majority of valid user submissions, aligned with the success target already defined in the PRD.
- The system should fail safely when evidence is insufficient, conflicting, or unavailable, and should not present weak outputs as high-confidence recommendations.
- The product should preserve saved user progress so users do not lose meaningful intake or planning work during normal interruptions.
- The system should maintain recommendation traceability so that supporting evidence remains linked to the recommendation output.
- Internal trust-management workflows should allow stale, broken, or questionable recommendation logic to be identified and corrected before trust degradation spreads.

### Scalability

- The system should support early-stage growth without requiring a full redesign of the product's core recommendation workflow.
- The product should support expansion from a narrow MVP pathway set to a broader supported pathway inventory over time.
- The architecture should allow user volume, recommendation volume, and evidence volume to grow without making trust-management workflows unmaintainable.
- Growth in users or supported pathways should not materially degrade the clarity, reviewability, or controllability of recommendation outputs.
- The system should support phased operational scaling, including continued use of manual review in early stages and more mature internal controls as breadth increases.

### Accessibility

- The product should meet modern web accessibility expectations for a public-facing, form-heavy application experience.
- Core intake, recommendation review, and next-step planning flows should be usable via keyboard navigation.
- Form labels, validation states, and error messages should be clearly understandable and perceivable.
- Visual hierarchy, contrast, and content structure should support users who need clear cognitive and visual guidance.
- Loading states, recommendation states, and confidence or caveat signals should be communicated in an accessible and understandable way.
- Accessibility should apply to both end-user workflows and practical internal admin/ops interfaces where those interfaces are part of maintaining recommendation trust.

### Integration

- The system should support reliable integration with trusted source ingestion and curation workflows that keep recommendation evidence current.
- Recommendation outputs should maintain consistent linkage to the source metadata needed for citation and review.
- External or supporting integrations used for recommendation generation should degrade safely if a dependency becomes unavailable or returns weak data.
- Internal workflows should preserve consistent handoff between user-facing recommendation capabilities and trust-management capabilities.
- Integration boundaries should preserve the distinction between source-backed evidence, recommendation logic, and user-facing guidance.
