---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/test-artifacts/test-design/cadet2-handoff.md
---

# cadet2 - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for cadet2, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Prospective users can create an account and access a secure recommendation workspace.
FR2: Users can start a guided intake flow that collects personal, educational, professional, immigration, and goal-related context.
FR3: Users can provide both structured inputs and free-form context during intake.
FR4: Users can save partial intake progress and return later to continue.
FR5: Users can review and update previously submitted profile information.
FR6: Users can declare priorities and constraints that influence recommendation outcomes, including timing, cost sensitivity, location preferences, and willingness to study or relocate.
FR7: Users can submit a completed intake for recommendation generation.
FR8: Users can manage multiple recommendation runs over time as their circumstances change.
FR9: Users can receive pathway recommendations based on their submitted profile and stated priorities.
FR10: The product can identify direct pathways that are currently viable for a user.
FR11: The product can identify pathways that are not yet viable but may become viable if specific gaps are addressed.
FR12: The product can generate limited composed pathway recommendations where an intermediate step improves future eligibility.
FR13: The product can rank recommendations by best-fit and fastest credible route.
FR14: The product can distinguish between strong-fit, conditional-fit, and lower-confidence recommendations.
FR15: The product can withhold or qualify recommendations when available evidence is insufficient or conflicting.
FR16: Users can receive updated recommendations after changing profile inputs or re-running the analysis.
FR17: Users can view why each recommendation is considered relevant to their situation.
FR18: Users can view the strengths in their profile that support a recommendation.
FR19: Users can view blockers, weaknesses, or missing conditions that reduce recommendation fit.
FR20: Users can view concrete actions that may improve eligibility for a recommendation.
FR21: Users can view tradeoffs associated with each recommendation, including effort, timing, and strategic complexity.
FR22: Users can compare multiple recommendations in a structured way before deciding what to pursue.
FR23: Users can view a clear distinction between immediate options and longer-horizon strategic options.
FR24: Users can understand when a recommendation reflects direct pathway fit versus a multi-step strategic pathway.
FR25: Users can view citations linked to recommendation claims.
FR26: Users can inspect supporting source context for cited recommendation guidance.
FR27: The product can distinguish source-backed facts from inferred strategic guidance.
FR28: Users can see when a recommendation includes caveats, assumptions, or confidence warnings.
FR29: The product can maintain traceable linkage between recommendation outputs and their supporting sources.
FR30: Internal users can review the source basis behind recommendation logic when validating trustworthiness.
FR31: Users can receive a clear next-step plan for each recommendation.
FR32: Users can revisit previous recommendation results and continue planning from earlier sessions.
FR33: Users can track changes in their recommendation set after profile updates or new recommendation runs.
FR34: Users can preserve recommendation outputs for future reference within their workspace.
FR35: Users can use the product repeatedly as their immigration situation changes over time.
FR36: Internal admin/ops users can manage the active set of supported pathways used in recommendations.
FR37: Internal admin/ops users can update pathway definitions, eligibility assumptions, and recommendation rules.
FR38: Internal admin/ops users can curate and manage trusted evidence sources used to support recommendations.
FR39: Internal admin/ops users can review whether recommendation outputs remain aligned with current policy conditions.
FR40: Internal admin/ops users can identify stale, weak, or questionable recommendation support and take corrective action.
FR41: Internal admin/ops users can audit changes to trust-sensitive recommendation logic and source curation.
FR42: Internal admin/ops users can validate that recommendation claims remain properly cited and reviewable.
FR43: The product can enforce separate access levels for end users and internal admin/ops users.
FR44: The product can protect user-specific recommendation data from unauthorized access.
FR45: The product can preserve a clear boundary between user-facing recommendation experiences and internal trust-management activities.
FR46: The product can maintain recommendation workflows that remain reviewable and controllable by internal operators.
FR47: The product can support a narrow initial pathway set in MVP while allowing the supported pathway inventory to expand over time.
FR48: The product can prevent unsupported or out-of-scope pathway areas from appearing as if they are fully covered in the MVP experience.

### NonFunctional Requirements

NFR1: The system should allow users to progress through core intake actions without perceptible lag during normal use.
NFR2: The system should provide clear, immediate feedback when user inputs are saved, validated, or submitted.
NFR3: The system should return the first recommendation result within the success target already defined in the PRD under normal operating conditions.
NFR4: When recommendation generation takes longer than the normal expected path, the system should communicate processing state clearly rather than leaving users in an ambiguous waiting state.
NFR5: Recommendation review, pathway comparison, and citation inspection should remain responsive enough that users can evaluate results without friction.
NFR6: Sensitive user data must be protected in transit and at rest.
NFR7: Access to user-specific recommendation data must be restricted to the authorized user and authorized internal roles only.
NFR8: Internal admin/ops capabilities must be protected through separate access controls from end-user capabilities.
NFR9: The system must preserve auditable records for trust-sensitive internal changes to pathway logic, evidence sources, and recommendation rules.
NFR10: The product must minimize unauthorized exposure of personal, immigration, educational, employment, and family-related data.
NFR11: The system must preserve a secure boundary between public-facing experiences, authenticated user workspaces, and internal trust-management functions.
NFR12: The recommendation workflow should complete successfully for the large majority of valid user submissions, aligned with the success target already defined in the PRD.
NFR13: The system should fail safely when evidence is insufficient, conflicting, or unavailable, and should not present weak outputs as high-confidence recommendations.
NFR14: The product should preserve saved user progress so users do not lose meaningful intake or planning work during normal interruptions.
NFR15: The system should maintain recommendation traceability so that supporting evidence remains linked to the recommendation output.
NFR16: Internal trust-management workflows should allow stale, broken, or questionable recommendation logic to be identified and corrected before trust degradation spreads.
NFR17: The system should support early-stage growth without requiring a full redesign of the product's core recommendation workflow.
NFR18: The product should support expansion from a narrow MVP pathway set to a broader supported pathway inventory over time.
NFR19: The architecture should allow user volume, recommendation volume, and evidence volume to grow without making trust-management workflows unmaintainable.
NFR20: Growth in users or supported pathways should not materially degrade the clarity, reviewability, or controllability of recommendation outputs.
NFR21: The system should support phased operational scaling, including continued use of manual review in early stages and more mature internal controls as breadth increases.
NFR22: The product should meet modern web accessibility expectations for a public-facing, form-heavy application experience.
NFR23: Core intake, recommendation review, and next-step planning flows should be usable via keyboard navigation.
NFR24: Form labels, validation states, and error messages should be clearly understandable and perceivable.
NFR25: Visual hierarchy, contrast, and content structure should support users who need clear cognitive and visual guidance.
NFR26: Loading states, recommendation states, and confidence or caveat signals should be communicated in an accessible and understandable way.
NFR27: Accessibility should apply to both end-user workflows and practical internal admin/ops interfaces where those interfaces are part of maintaining recommendation trust.
NFR28: The system should support reliable integration with trusted source ingestion and curation workflows that keep recommendation evidence current.
NFR29: Recommendation outputs should maintain consistent linkage to the source metadata needed for citation and review.
NFR30: External or supporting integrations used for recommendation generation should degrade safely if a dependency becomes unavailable or returns weak data.
NFR31: Internal workflows should preserve consistent handoff between user-facing recommendation capabilities and trust-management capabilities.
NFR32: Integration boundaries should preserve the distinction between source-backed evidence, recommendation logic, and user-facing guidance.

### Additional Requirements

- This is a brownfield implementation. Do not re-initialize the repository or introduce a new starter scaffold. Epic 1 Story 1 should begin with architecture-aligned feature work inside the existing codebase.
- Continue the existing modular monolith on Nuxt 4 and Vue 3, with Nuxt server routes as the browser-facing HTTP boundary.
- Preserve the split persistence model: PostgreSQL for auth and durable system-of-record data, Convex for operational workflow state, Cloudflare R2 for unstructured artifacts, and Cloudflare AI Search for retrieval over curated evidence.
- Keep all AI, search, and storage integrations server-mediated. The browser should call only local Nuxt APIs, never third-party providers directly.
- Treat recommendation generation as an asynchronous staged workflow with explicit status transitions, progress visibility, and safe degradation when evidence is weak, stale, or conflicting.
- Model recommendation runs as immutable, versioned outputs linked to input snapshots, evidence references, and confidence/caveat metadata.
- Use schema-first validation at boundaries, with Zod in server utilities and validators in Convex.
- Enforce explicit capability-based role separation between end users and internal admin/ops users, and make trust-sensitive changes auditable.
- Keep trust-sensitive business logic in `server/utils` and `convex`, not inside Vue pages or UI components.
- Align feature implementation with the planning design artifacts in `_bmad-output/planning-artifacts/DESIGN.md`, `design-tokens.json`, and `design-tokens.css`.
- Use the approved UX direction: `Comparison Workspace`, with dedicated desktop and mobile compositions and an optional tablet companion layout.
- Apply a desktop-first depth model with dedicated mobile layouts. Preserve the same information architecture across breakpoints while changing composition appropriately.
- Target WCAG 2.1 AA. Maintain visible focus states, minimum `44x44px` touch targets, semantic labels, and never rely on color alone for fit, confidence, blockers, warnings, or urgency.
- Use guided, section-based intake with visible progress, save-and-resume behavior, inline plain-language validation, and context-preserving return-to-edit loops.
- Recommendation surfaces must clearly separate available-now pathways, blocked-but-close pathways, and longer-horizon composed routes, with visible blockers, tradeoffs, evidence context, and next actions.
- Reuse the existing shadcn-nuxt and Reka UI primitive layer. Reserve custom component work for domain-specific patterns such as recommendation summaries, pathway comparison cards, evidence confidence panels, next-action queues, and milestone route planners.
- Treat deterministic recommendation-state control as a pre-implementation blocker for recommendation stories: seed/reset hooks and provider mock paths must exist before Epic 2 implementation is considered ready.
- Any story that touches recommendation execution must preserve the canonical lifecycle statuses `queued`, `evaluating`, `completed`, `degraded`, and `failed`.
- Any story that touches recommendation output must include explicit confidence, freshness, and caveat handling in both data contracts and UI rendering.
- Any story that touches admin or trust-governance routes must include server-side authorization and trust-action audit logging acceptance criteria.
- Preserve API-first testability for P0 and P1 recommendation scenarios; favor deterministic API/integration seams before expanding browser coverage.
- Provide stable `data-testid` hooks for key workflow surfaces, including intake progress, recommendation status, citation lists, tier badges, audit panels, and recommendation history views.

### FR Coverage Map

FR1: Epic 1 - secure user workspace access
FR2: Epic 1 - guided intake start
FR3: Epic 1 - structured and free-form intake inputs
FR4: Epic 1 - save and resume intake progress
FR5: Epic 1 - review and update profile information
FR6: Epic 1 - capture priorities and constraints
FR7: Epic 1 - submit completed intake
FR8: Epic 1 - manage multiple recommendation runs
FR9: Epic 2 - receive pathway recommendations
FR10: Epic 2 - identify currently viable direct pathways
FR11: Epic 2 - identify blocked but improvable pathways
FR12: Epic 2 - generate limited composed pathways
FR13: Epic 2 - rank by fit and fastest credible route
FR14: Epic 2 - distinguish recommendation confidence tiers
FR15: Epic 2 - withhold or qualify weak recommendations
FR16: Epic 2 - regenerate recommendations after updates
FR17: Epic 3 - show why a recommendation is relevant
FR18: Epic 3 - show supporting strengths in the profile
FR19: Epic 3 - show blockers and missing conditions
FR20: Epic 3 - show actions that improve eligibility
FR21: Epic 3 - show tradeoffs across recommendations
FR22: Epic 3 - compare multiple recommendations
FR23: Epic 3 - separate immediate and longer-horizon options
FR24: Epic 3 - distinguish direct vs multi-step pathways
FR25: Epic 3 - show citations on recommendation claims
FR26: Epic 3 - expose supporting source context
FR27: Epic 3 - distinguish sourced fact from inferred guidance
FR28: Epic 3 - display caveats, assumptions, and warnings
FR29: Epic 3 - preserve traceable source linkage in outputs
FR30: Epic 5 - internal review of source basis behind recommendation logic
FR31: Epic 4 - provide a clear next-step plan
FR32: Epic 4 - revisit previous recommendation results
FR33: Epic 4 - track changes across recommendation runs
FR34: Epic 4 - preserve outputs in the workspace
FR35: Epic 4 - support repeated use over time
FR36: Epic 5 - manage supported pathway inventory
FR37: Epic 5 - update pathway definitions and rules
FR38: Epic 5 - curate trusted evidence sources
FR39: Epic 5 - review alignment with current policy conditions
FR40: Epic 5 - identify and correct weak or stale support
FR41: Epic 5 - audit trust-sensitive changes
FR42: Epic 5 - validate citation integrity and reviewability
FR43: Epic 1 - enforce separate end-user and admin access levels
FR44: Epic 1 - protect user-specific recommendation data
FR45: Epic 5 - preserve boundary between user and internal trust workflows
FR46: Epic 5 - keep recommendation workflows reviewable and controllable
FR47: Epic 5 - support MVP-limited pathway inventory with future expansion
FR48: Epic 5 - prevent unsupported pathways from appearing fully covered

## Epic List

### Epic 1: Secure Intake Workspace and Profile Foundation
Users can create a secure workspace, build and save their immigration profile, and return to continue without losing progress.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR43, FR44

### Epic 2: Pathway Recommendation Generation
Users can submit their profile and receive ranked direct, blocked, and limited composed pathway recommendations within the supported MVP pathway set.
**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16

### Epic 3: Explainable Recommendation Review and Trust Signals
Users can understand why recommendations appear, compare options, inspect evidence, and assess confidence, caveats, blockers, and tradeoffs.
**FRs covered:** FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29

### Epic 4: Action Planning and Recommendation Continuity
Users can turn recommendations into concrete next steps, revisit prior runs, track changes over time, and continue planning as their situation evolves.
**FRs covered:** FR31, FR32, FR33, FR34, FR35

### Epic 5: Internal Trust Governance and Pathway Operations
Internal admin and ops users can manage supported pathways, curate evidence, audit trust-sensitive changes, and keep recommendation behavior reviewable, controlled, and safely scoped.
**FRs covered:** FR30, FR36, FR37, FR38, FR39, FR40, FR41, FR42, FR45, FR46, FR47, FR48

<!-- Repeat for each epic in epics_list (N = 1, 2, 3...) -->

## Epic 1: Secure Intake Workspace and Profile Foundation

Users can create a secure workspace, build and save their immigration profile, and return to continue without losing progress.

### Story 1.1: Secure User Workspace Access

**FRs implemented:** FR1, FR43, FR44

As a prospective immigration user,
I want to create an account and enter a protected workspace,
So that I can manage my planning data in a secure, personal environment.

**Acceptance Criteria:**

**Given** I am a new or returning end user
**When** I authenticate through the existing session flow
**Then** I am granted access only to the user workspace routes and protected from unauthorized access
**And** internal admin-only routes remain unavailable to standard users

**Given** I attempt to access another user's workspace data
**When** the request reaches the server boundary
**Then** access is denied based on server-side ownership checks
**And** no other user's profile or run metadata is exposed

**Given** I successfully sign in
**When** I enter the workspace
**Then** I land in a stable workspace shell with clear navigation to intake and core workspace entry points
**And** the shell is usable on desktop and mobile with keyboard-accessible navigation

**Given** recommendation work areas are not yet delivered in this epic
**When** the workspace shell renders navigation affordances for those future areas
**Then** any recommendation-specific navigation is clearly unavailable, disabled, or omitted
**And** the shell does not imply unfinished recommendation features are already usable

**Given** I am a standard authenticated user
**When** I attempt to access an internal admin or trust-governance route
**Then** the server denies access and no privileged controls or audit data are exposed in the client

### Story 1.2: Guided Intake Draft with Save and Resume

**FRs implemented:** FR2, FR4

As an immigration user,
I want a guided intake flow that saves my progress as I complete profile sections,
So that I can build my planning profile without losing work or finishing in one session.

**Acceptance Criteria:**

**Given** I begin the intake flow
**When** I move through the guided profile sections
**Then** the product presents structured, section-based steps for core personal, education, work, immigration, and goal-related information
**And** progress is visibly framed so I know where I am in the flow
**And** the progress container exposes a stable `data-testid="intake-progress"` hook for automated verification

**Given** I enter valid information in an intake section
**When** I save or advance
**Then** my draft is persisted to my workspace under my user identity
**And** I receive immediate confirmation that the draft was saved

**Given** intake draft persistence does not yet exist for this feature set
**When** this story is implemented
**Then** it introduces only the minimum draft storage needed for section progress, field values, and resume position
**And** it does not create unrelated recommendation, pathway, or audit persistence ahead of the stories that first need them

**Given** I leave the intake flow before finishing
**When** I return later
**Then** my saved draft is restored at the appropriate section
**And** previously entered values remain available for editing

**Given** I submit invalid or incomplete required data in a section
**When** validation runs
**Then** the system shows inline, understandable validation guidance
**And** the form remains accessible and keyboard operable

### Story 1.3: Capture Constraints and Free-Form Context

**FRs implemented:** FR3, FR5, FR6

As an immigration user,
I want to add my priorities, constraints, and extra context to my intake profile,
So that the system can reflect my real situation instead of a shallow checklist.

**Acceptance Criteria:**

**Given** I am in the intake flow
**When** I reach the planning preferences and context sections
**Then** I can provide structured priorities such as timing, cost sensitivity, location preferences, and willingness to study or relocate
**And** I can also provide free-form context in a dedicated text area

**Given** I have already saved intake information
**When** I revisit my profile
**Then** I can update both structured preferences and free-form context without restarting the flow
**And** the updated values are saved to my existing draft

**Given** I provide optional free-form context
**When** the system stores it
**Then** it is associated with my profile draft securely
**And** it is not exposed outside my authorized workspace access

**Given** I use the intake flow on a smaller screen or with keyboard navigation
**When** I interact with these fields
**Then** the controls remain readable, focusable, and usable
**And** helper text explains why these inputs improve recommendation quality

### Story 1.4: Submit Intake and Track Recommendation Run Records

**FRs implemented:** FR7, FR8

As an immigration user,
I want to submit my completed intake and see my recommendation runs tracked in my workspace,
So that I can maintain continuity as my circumstances change over time.

**Acceptance Criteria:**

**Given** I complete the required intake sections
**When** I submit the intake
**Then** the system creates a new recommendation run record tied to my user and current profile snapshot
**And** the run is stored as a distinct item that can be revisited later

**Given** I have submitted intake more than once over time
**When** I view my workspace
**Then** I can see a list of my prior recommendation runs or run placeholders in chronological order
**And** each item is scoped to my account only

**Given** a new recommendation run is created
**When** the system stores the run metadata
**Then** it preserves clear linkage between the run and the submitted profile state
**And** it does not require recommendation generation to be completed in this epic

**Given** recommendation-run persistence is first introduced in this epic
**When** this story establishes the run record
**Then** it creates only the minimum metadata needed for run identity, ownership, profile linkage, and current status
**And** later recommendation detail, evidence, and governance data remain owned by the stories that first require them

**Given** I submit intake successfully
**When** the operation finishes
**Then** I receive clear confirmation that my profile has been submitted for recommendation processing
**And** the system communicates the next state without leaving me in ambiguity

## Epic 2: Pathway Recommendation Generation

Users can submit their profile and receive ranked direct, blocked, and limited composed pathway recommendations within the supported MVP pathway set.

### Story 2.1: Start Recommendation Processing from a Submitted Profile

**FRs implemented:** FR9

As an immigration user,
I want my submitted profile to start a tracked recommendation process,
So that the system can evaluate my case and show clear progress toward results.

**Acceptance Criteria:**

**Given** I have a submitted intake profile
**When** recommendation processing begins
**Then** the system updates the recommendation run record created from intake submission with an explicit processing status
**And** the run remains linked to the submitted profile snapshot created in Epic 1

**Given** recommendation processing is not yet complete
**When** I check the run state
**Then** the system exposes one canonical lifecycle status from this fixed MVP set: `queued`, `evaluating`, `completed`, `degraded`, or `failed`
**And** the state is readable by the workspace without requiring provider details to be exposed

**Given** the recommendation status surface is rendered in the workspace
**When** a user views the in-progress run
**Then** the status banner reflects the current lifecycle state clearly
**And** the recommendation status surface can bind to a stable `data-testid="recommendation-status-banner"` hook

**Given** the recommendation workflow encounters a recoverable internal delay
**When** the run remains in progress
**Then** the user-facing state continues to indicate active processing rather than appearing stuck
**And** the run stays resumable within the existing workflow model

**Implementation Note:** Deterministic seed/reset hooks and provider-mock paths are still required delivery constraints for validating lifecycle behavior, but they are implementation scaffolding rather than user-facing acceptance criteria.

### Story 2.2: Evaluate Direct and Blocked Pathways in the MVP Pathway Set

**FRs implemented:** FR10, FR11

As an immigration user,
I want the system to evaluate which supported pathways I can pursue now or improve toward,
So that I receive useful results even when I am not immediately eligible for the strongest option.

**Acceptance Criteria:**

**Given** a recommendation run is actively evaluating
**When** the system applies the current supported MVP pathway rules to my profile
**Then** it identifies direct pathways that are currently viable for me
**And** it also identifies supported pathways that are not yet viable but are close enough to be marked as blocked or conditional

**Given** a pathway is missing required conditions
**When** the evaluation logic scores that pathway
**Then** the result records the pathway as not currently viable rather than falsely marking it as available
**And** the pathway remains eligible for later explanation in downstream review screens

**Given** the system evaluates only the current MVP pathway inventory
**When** no supported pathway qualifies strongly
**Then** the result set remains limited to the supported scope
**And** unsupported pathway areas are not implied to be fully covered

### Story 2.3: Generate and Rank Limited Composed Pathway Recommendations

**FRs implemented:** FR12, FR13, FR14

As an immigration user,
I want the system to surface viable staged routes and rank all supported options,
So that I can see both the best immediate path and realistic longer-horizon alternatives.

**Acceptance Criteria:**

**Given** my profile does not have only one obvious direct-fit pathway
**When** the recommendation engine evaluates supported composed-route rules
**Then** it can generate limited composed pathway recommendations where an intermediate step improves future eligibility
**And** those recommendations are stored distinctly from direct-fit outcomes

**Given** the system has a set of direct, blocked, and composed pathway candidates
**When** ranking is applied
**Then** the results are ordered by best-fit and fastest credible route using the current scoring logic
**And** each result is assigned a recommendation tier such as strong-fit, conditional-fit, or lower-confidence

**Given** multiple recommendation candidates are available
**When** the run is completed
**Then** the returned result set preserves the ordering and tiering needed for later review surfaces
**And** the output format remains normalized for the application rather than exposing raw provider output

**Given** the composed-route evaluation finds no supported staged route for the current profile
**When** the run is finalized
**Then** the result set preserves the available direct-fit and blocked-pathway outcomes without inventing a composed route
**And** the completed run makes it clear that no supported staged pathway was identified in the current MVP scope

### Story 2.4: Safely Qualify Weak Results and Support Recommendation Refresh

**FRs implemented:** FR15, FR16

As an immigration user,
I want weak recommendation outputs to be qualified and my run to be refreshable after profile changes,
So that I can trust the system to adapt without overstating certainty.

**Acceptance Criteria:**

**Given** evidence, rule coverage, or computed fit is insufficient for a confident result
**When** the recommendation run is finalized
**Then** the system qualifies, downgrades, or withholds the affected recommendation instead of presenting it as strong-fit
**And** the run is marked `degraded` when partial results remain usable or `failed` when no trustworthy result can be returned
**And** every affected recommendation is shown with an explicit low-confidence or withheld state plus a visible caveat explaining why
**And** the response contract preserves explicit confidence, freshness, and caveat fields for every degraded or withheld result

**Given** I update my profile inputs after receiving prior results
**When** I trigger a refresh or re-run
**Then** the system creates or updates a new recommendation evaluation against the latest profile state
**And** the refreshed result remains distinguishable from the previous run state

**Given** a dependency or retrieval step fails during processing
**When** the system cannot complete the normal path
**Then** the run fails safely without exposing misleading high-confidence recommendations
**And** the workspace shows either the canonical `degraded` or `failed` status with a user-safe recovery message to retry later or re-evaluate after updating inputs

## Epic 3: Explainable Recommendation Review and Trust Signals

Users can understand why recommendations appear, compare options, inspect evidence, and assess confidence, caveats, blockers, and tradeoffs.

### Story 3.1: Show Recommendation Rationale and Fit Signals

**FRs implemented:** FR17, FR18

As an immigration user,
I want to see why each recommendation is relevant to my situation,
So that I can understand which pathways genuinely fit and which are less certain.

**Acceptance Criteria:**

**Given** I open a completed recommendation run
**When** the recommendation results are displayed
**Then** each recommendation includes a clear explanation of why it appears for my profile
**And** the explanation surfaces relevant strengths and fit factors tied to my submitted data

**Given** the result set includes recommendations with different certainty levels
**When** they are presented in the review surface
**Then** each recommendation is labeled with its recommendation tier or confidence level
**And** the meaning of the fit signal is understandable without relying on color alone
**And** the rendered fit state can be targeted through a stable `data-testid="recommendation-tier-badge"` hook

**Given** a recommendation is weaker or conditional
**When** I review it
**Then** the product clearly distinguishes it from stronger-fit options
**And** it does not present lower-confidence pathways as equally strong choices

**Given** a recommendation is degraded because evidence is stale, weak, or incomplete
**When** I review it
**Then** the product visibly downgrades the recommendation state and preserves its warning context instead of rendering it as equivalent to strong-fit output

### Story 3.2: Surface Blockers, Tradeoffs, and Improvement Actions

**FRs implemented:** FR19, FR20, FR21

As an immigration user,
I want to see what is blocking a pathway and what I can do to improve it,
So that I can make better decisions instead of receiving static pass-or-fail output.

**Acceptance Criteria:**

**Given** a recommendation has unmet conditions or reduced fit
**When** I inspect that pathway
**Then** the product shows the blockers, weaknesses, or missing conditions affecting the recommendation
**And** those blockers are presented as understandable constraints rather than hidden logic

**Given** a pathway could become stronger with user action
**When** the recommendation detail is shown
**Then** the product includes concrete actions that may improve eligibility
**And** those actions are kept distinct from the factual blocker information

**Given** multiple recommendation options are available
**When** I compare them
**Then** each option includes visible tradeoffs such as effort, timing, or strategic complexity
**And** the comparison helps me understand what I gain or accept by choosing one route over another

### Story 3.3: Compare Immediate and Longer-Horizon Pathways

**FRs implemented:** FR22, FR23, FR24

As an immigration user,
I want to compare immediate and longer-horizon options in one structured view,
So that I can decide whether to pursue a direct route or a staged strategic path.

**Acceptance Criteria:**

**Given** a completed run includes more than one recommendation type
**When** I enter the comparison workspace
**Then** I can compare multiple recommendations in a structured format
**And** the view clearly separates immediate options from longer-horizon strategic options

**Given** at least one pathway is a composed or multi-step route
**When** that option is displayed
**Then** the product identifies it as a strategic multi-step pathway rather than a direct-fit route
**And** the distinction is visible alongside direct recommendations

**Given** a recommendation is blocked-but-close rather than currently available
**When** I review the comparison view
**Then** that state is clearly differentiated from both available-now and longer-horizon routes
**And** the UI preserves the ranking context produced in Epic 2

**Given** only one recommendation is available or a structured side-by-side comparison cannot be shown
**When** I enter the comparison surface
**Then** the product falls back to a clear structured review state instead of an empty or misleading comparison layout
**And** I can still understand pathway type, ranking context, and next actions without losing orientation

### Story 3.4: Display Citations, Source Context, and Trust Boundaries

**FRs implemented:** FR25, FR26, FR27, FR28, FR29

As an immigration user,
I want to inspect citations and supporting context behind recommendation claims,
So that I can trust what is sourced, what is inferred, and where caution is required.

**Acceptance Criteria:**

**Given** a recommendation includes source-backed claims
**When** I view the recommendation detail
**Then** the product displays citations linked to those claims
**And** each citation points to inspectable supporting source context that is reachable from the same review surface
**And** the citation list container exposes a stable `data-testid="recommendation-citation-list"` hook for automated verification

**Given** a recommendation includes both sourced facts and inferred strategic guidance
**When** the explanation is presented
**Then** the product clearly distinguishes source-backed information from inferred guidance
**And** caveats, assumptions, or confidence warnings are shown where applicable

**Given** I inspect a completed recommendation output
**When** I review the trust details
**Then** the system preserves traceable linkage between the recommendation content and its supporting evidence references
**And** every confidence label, caveat, and warning is rendered as visible text and not by color alone
**And** citation links, disclosure controls, and trust details remain keyboard reachable and screen-reader understandable on both desktop and mobile layouts

## Epic 4: Action Planning and Recommendation Continuity

Users can turn recommendations into concrete next steps, revisit prior runs, track changes over time, and continue planning as their situation evolves.

### Story 4.1: Generate a Clear Next-Step Plan from Recommendations

**FRs implemented:** FR31

As an immigration user,
I want each recommendation to include a practical next-step plan,
So that I can move from understanding my options to taking action.

**Acceptance Criteria:**

**Given** I open a completed recommendation run
**When** I inspect a recommendation
**Then** the product shows a clear next-step plan tied to that recommendation
**And** the next steps are phrased as concrete user actions rather than abstract guidance

**Given** multiple recommendations are available
**When** I review their action plans
**Then** each recommendation presents its own next-step guidance
**And** the guidance remains aligned with that pathway’s fit, blockers, and tradeoffs

**Given** a recommendation is low-confidence or blocked
**When** a next-step plan is shown
**Then** the plan reflects the limitations of that pathway
**And** the product does not imply a stronger course of action than the recommendation supports

### Story 4.2: Revisit and Preserve Prior Recommendation Runs

**FRs implemented:** FR32, FR34

As an immigration user,
I want to revisit my previous recommendation runs,
So that I can continue planning from earlier work instead of starting over.

**Acceptance Criteria:**

**Given** I have one or more completed or in-progress recommendation runs
**When** I open my workspace history
**Then** I can access a list of prior runs associated with my account
**And** I can reopen a specific run to review its stored results and context
**And** the history list exposes a stable `data-testid="recommendation-history-list"` hook for automation and regression coverage

**Given** I return to a prior recommendation run
**When** the run details are loaded
**Then** the recommendation outputs are preserved for future reference within my workspace
**And** the stored run remains linked to its original profile snapshot and recommendation content

**Given** I access the workspace from desktop or mobile
**When** I navigate between current and prior runs
**Then** the navigation remains clear and stateful
**And** I do not lose orientation about which run I am viewing

**Given** a prior run cannot be loaded because it was removed, is unavailable, or access is denied
**When** I try to open that run from history
**Then** the product shows a clear unavailable state without exposing protected data
**And** I remain in the workspace history context so I can select another run

### Story 4.3: Show Changes Between Recommendation Runs

**FRs implemented:** FR33

As an immigration user,
I want to see what changed between recommendation runs,
So that I can understand how updates to my profile affect my pathway options.

**Acceptance Criteria:**

**Given** I have more than one recommendation run over time
**When** I compare a newer run to a prior run
**Then** the product shows the meaningful changes in my recommendation set
**And** those changes are presented in a way that highlights additions, removals, or changed ranking/tier outcomes

**Given** comparison data cannot be generated for a selected pair of runs
**When** the comparison request fails or is incomplete
**Then** the product shows a clear comparison-unavailable message with no misleading diff output
**And** I can return to either run detail without losing context

**Given** a recommendation has moved because of updated profile information
**When** the change is displayed
**Then** the system preserves enough context to show that the recommendation changed after a new profile state
**And** the comparison avoids implying that unchanged recommendations were recomputed differently

**Given** recommendation trust metadata is available on both runs
**When** I compare a newer run to a prior run
**Then** the comparison preserves evidence references, freshness context, and caveat differences alongside the changed recommendation outcomes

**Given** a prior run had weaker or degraded results
**When** I compare it to a later run
**Then** the product can show that the newer run differs in status or outcome quality
**And** the continuity view remains understandable without exposing internal processing details

### Story 4.4: Support Ongoing Reuse of the Planning Workspace

**FRs implemented:** FR35

As an immigration user,
I want my workspace to support repeated planning over time,
So that I can return as my circumstances change and continue refining my immigration strategy.

**Acceptance Criteria:**

**Given** I return to the product after a prior recommendation session
**When** I re-enter my workspace
**Then** I can continue from my existing planning history rather than being treated as a new user
**And** my previously saved runs and profile context remain available to me

**Given** I choose to update my planning information over time
**When** I start a new cycle from the workspace
**Then** the system supports creating a new recommendation run from updated inputs while preserving prior history
**And** the prior runs remain intact for reference

**Given** I use the workspace repeatedly
**When** I move between current planning tasks and past recommendation artifacts
**Then** the product maintains a sense of continuity and progress
**And** the experience reinforces that this is an ongoing planning tool rather than a disposable one-time result page

## Epic 5: Internal Trust Governance and Pathway Operations

Internal admin and ops users can manage supported pathways, curate evidence, audit trust-sensitive changes, and keep recommendation behavior reviewable, controlled, and safely scoped.

### Story 5.1: Manage the Supported MVP Pathway Inventory

**FRs implemented:** FR36, FR47, FR48

As an internal admin or ops user,
I want to manage the active set of supported pathways,
So that the recommendation engine stays aligned with the current MVP scope and future expansion can be controlled deliberately.

**Acceptance Criteria:**

**Given** I am an authorized internal admin or ops user
**When** I access the pathway management interface
**Then** I can view the current set of supported pathways used by recommendations
**And** standard end users cannot access this interface

**Given** I add, disable, or update the active status of a pathway definition
**When** the change is saved
**Then** the supported pathway inventory is updated in a controlled way
**And** the change affects only the scoped pathway set intended for recommendation use

**Given** supported-pathway inventory storage is first introduced in this epic
**When** this story is implemented
**Then** it creates only the minimum pathway fields needed for active scope control, display identity, and status management
**And** deeper rule logic, evidence linkage, and audit detail remain owned by the later stories that first require them

**Given** a pathway is outside the currently supported MVP scope
**When** the recommendation system evaluates user profiles
**Then** that pathway can be excluded from active recommendation output
**And** the product does not imply that the unsupported pathway is fully covered

### Story 5.2: Update Pathway Rules and Curate Evidence Sources

**FRs implemented:** FR37, FR38

As an internal admin or ops user,
I want to update pathway logic and manage trusted evidence sources,
So that recommendations remain relevant as policy conditions and source quality change.

**Acceptance Criteria:**

**Given** I am an authorized internal admin or ops user
**When** I edit pathway definitions, eligibility assumptions, or recommendation rules
**Then** the system stores the updated rule data through controlled internal workflows
**And** those updates remain constrained to authorized internal workflows with clear save confirmation

**Given** I manage trusted evidence sources
**When** I add, update, pause, or resume a source used for recommendation support
**Then** the source state is persisted through the internal admin workflow
**And** recommendation support can be limited to currently trusted sources

**Given** pathway rules or evidence sources change
**When** the changes are applied
**Then** the user-facing recommendation system continues to preserve the boundary between sourced evidence and recommendation logic
**And** the change does not require exposing internal governance mechanics to end users

**Given** broader review history or audit inspection is required
**When** an internal user needs to inspect prior trust-sensitive changes
**Then** that detailed review responsibility remains owned by Stories 5.3 and 5.4 unless a minimal same-session review surface is explicitly introduced here

### Story 5.3: Review Recommendation Trustworthiness and Correct Weak Support

**FRs implemented:** FR30, FR39, FR40, FR42

As an internal admin or ops user,
I want to review whether recommendation outputs remain aligned with current policy and evidence quality,
So that I can detect and correct trust issues before they affect more users.

**Acceptance Criteria:**

**Given** recommendation outputs have been generated by the system
**When** I review internal recommendation trust surfaces
**Then** I can inspect the source basis behind recommendation logic and outputs
**And** I can assess whether recommendation claims remain aligned with current policy conditions

**Given** a recommendation or source is stale, weak, or questionable
**When** I identify the issue in the admin workflow
**Then** I can mark, pause, or otherwise trigger corrective action for the affected trust input
**And** the workflow supports preventing continued reliance on weak support

**Given** I validate recommendation claims internally
**When** I inspect trust details
**Then** I can confirm whether the claims remain properly cited and reviewable
**And** the internal review flow preserves enough linkage to support trust decisions without exposing user-private data unnecessarily

### Story 5.4: Audit Trust-Sensitive Changes and Preserve Governance Boundaries

**FRs implemented:** FR41, FR45, FR46

As an internal admin or ops user,
I want all trust-sensitive governance actions to be auditable and isolated from end-user experiences,
So that the product remains controllable, reviewable, and safe as it evolves.

**Acceptance Criteria:**

**Given** an internal admin or ops user changes pathway definitions, evidence sources, or recommendation-governance settings
**When** the change is committed
**Then** the system records an auditable event for that trust-sensitive action
**And** the event preserves the actor, timestamp, and relevant change context

**Given** trust-sensitive audit persistence does not yet exist for this feature set
**When** this story introduces audit logging
**Then** it creates only the minimum audit record structure needed for actor, timestamp, action type, and scoped change context
**And** it does not expand into unrelated analytics or historical replay models ahead of a later explicit story

**Given** internal governance workflows exist alongside end-user recommendation workflows
**When** the product routes requests and permissions
**Then** the boundary between internal trust-management activities and user-facing experiences is enforced consistently
**And** end users cannot access or trigger privileged governance operations

**Given** internal audit history is rendered in the admin workflow
**When** authorized users inspect trust-sensitive changes
**Then** the audit view exposes a stable `data-testid="admin-audit-panel"` hook and remains inaccessible to standard end users

**Given** the supported pathway inventory expands over time
**When** new pathways or governance controls are introduced
**Then** the system can extend the governed scope without redesigning the core trust-management model
**And** recommendation workflows remain reviewable and controllable by internal operators
