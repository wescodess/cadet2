---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-cadet2-2026-03-01.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/research/technical-layered-canadian-immigration-recommendation-engine-research-2026-03-01.md
  - _bmad-output/project-context.md
  - docs/index.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-03-01'
project_name: 'cadet2'
user_name: 'Wesleyukadike'
date: '2026-03-01'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The PRD defines 48 functional requirements across 8 major capability areas. Architecturally, these cluster into: secure user account and workspace access; guided intake and profile lifecycle management; recommendation generation for direct, blocked, and limited composed pathways; explanation and comparison workflows; citation and trust-signal presentation; recommendation continuity across multiple runs; internal admin/ops trust-management functions; and access-control safeguards.

This means the architecture must support both user-facing decision workflows and internal governance workflows as first-class capabilities. The system is not only generating recommendations; it must also preserve the ability to update pathway logic, inspect evidence linkage, and keep recommendation behavior reviewable over time. The presence of repeat-run, revisit, and recommendation-history requirements also implies durable state, versioned recommendation runs, and clear boundaries between current user state and historical outputs.

**Non-Functional Requirements:**
The dominant NFRs are trust, security, and operational control rather than pure throughput. The system must protect sensitive user data in transit and at rest, preserve strict separation between user-facing and internal admin/ops capabilities, and maintain auditable records for trust-sensitive changes. Reliability requirements emphasize safe degradation: when evidence is weak, conflicting, or stale, the system must qualify or withhold recommendations rather than overstate confidence.

Performance expectations are user-centered: intake must feel responsive, recommendation processing must show clear progress when delayed, and recommendation review must remain frictionless. Scalability expectations are phased and operationally pragmatic: the product must grow from a narrow MVP pathway set to a broader pathway inventory without forcing a redesign or making trust-management unmaintainable. Accessibility is also material because both the end-user intake flow and recommendation review experience are form-heavy and cognitively demanding.

**Scale & Complexity:**
This is a high-complexity brownfield project in a legal-adjacent decision-support domain. The system combines secure user workflows, recommendation logic, evidence-backed outputs, internal trust-management operations, and evolving policy-sensitive rules. The architecture must support phased growth from a smaller MVP pathway subset into a broader recommendation inventory while preserving reviewability and control.

- Primary domain: Full-stack web application for high-trust immigration decision support
- Complexity level: High
- Estimated architectural components: 8 core component areas

### Technical Constraints & Dependencies

The project is constrained by an existing integrated Nuxt 4 monolith with Vue 3 on the front end, Nuxt server routes as the HTTP boundary, Convex for operational state and orchestration, Better Auth for authentication, and server-controlled external integrations. This means architectural decisions should extend the current monolith cleanly rather than assume a greenfield rewrite.

The PRD and technical research together establish several hard constraints:
- recommendation outputs must preserve end-to-end citation traceability
- recommendation logic must remain maintainable and updateable as policy conditions change
- sensitive personal and immigration-related data must be handled conservatively
- internal trust-management actions must be auditable
- the system must distinguish strong outputs from weak or incomplete outputs and degrade safely
- external provider access must remain server-mediated and controllable

The existing platform also currently lacks a formal automated test framework, which means architectural decisions should account for explicit validation boundaries, replayability, and inspectable workflow state rather than assuming mature test infrastructure already exists.

### Cross-Cutting Concerns Identified

Several concerns will affect nearly every major component:

- Trust and evidence provenance: recommendations must remain visibly tied to source-backed support, with clear boundaries between factual evidence and inferred guidance.
- Security and privacy: user profile data, recommendation state, and internal trust-management functions require strict access separation and conservative data handling.
- Auditability and governance: pathway-definition changes, evidence updates, and trust-sensitive operational actions must remain reviewable and traceable.
- Safe degradation: weak, stale, or conflicting inputs must lead to lower-confidence outputs, qualification, or withheld recommendations instead of overconfident results.
- Changeability: the architecture must allow pathway coverage, logic, and evidence workflows to evolve without brittle rewrites.
- Continuity and versioning: users need persistent workspaces, repeatable recommendation runs, and understandable changes over time.
- Brownfield compatibility: all major architectural decisions must fit the current Nuxt + Convex + server-routed boundary rather than introducing parallel platform abstractions unnecessarily.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application based on project requirements analysis and the existing brownfield implementation.

### Starter Options Considered

1. Official Nuxt starter
- Verified against current Nuxt docs and site on 2026-03-01.
- Current Nuxt site shows the active line as `v4.3.1`.
- Current install flow uses the standard create command pattern: `pnpm create nuxt@latest <project-name>`.
- This provides the canonical Nuxt 4 project baseline with current directory structure, TypeScript-ready setup, and standard development workflow.

2. NuxtHub templates / NuxtHub module integration
- Verified against current NuxtHub installation docs on 2026-03-01.
- Current NuxtHub docs support either starting from a template or extending an existing Nuxt app.
- The current in-place add command is `npx nuxi module add hub`.
- This is useful when deeper NuxtHub-managed platform features are needed, but it extends a Nuxt app rather than replacing the existing repository shape.

3. In-place continuation of the current repository
- Because `cadet2` is already a functioning brownfield Nuxt monolith with Convex, Better Auth, server routes, and Cloudflare-oriented integrations, the lowest-risk and most coherent option is to continue from the current repository foundation instead of generating a new starter scaffold.

### Selected Starter: Existing Brownfield Nuxt Foundation (with Official Nuxt Starter as Reference Baseline)

**Rationale for Selection:**
This project already has the correct foundational stack for the product requirements: Nuxt for the application and server boundary, Vue for the UI layer, Convex for operational workflows, Better Auth for session boundaries, and server-controlled external integrations. Re-initializing a new starter would create churn without solving a real architectural problem.

The official Nuxt starter remains useful as the reference for current defaults and conventions, but the architecture should build forward from the existing codebase. Where useful, NuxtHub can be extended in-place using the current supported module path rather than by replacing the application skeleton.

**Initialization Command:**

```bash
# Brownfield project: no re-initialization should be run in this repository.
# Reference only, if a clean-room prototype were needed:
pnpm create nuxt@latest <project-name>

# If additional NuxtHub capabilities are needed in-place:
npx nuxi module add hub
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
The baseline remains TypeScript on Nuxt 4 with Vue 3, preserving the current full-stack monolith model and server-route HTTP boundary.

**Styling Solution:**
Tailwind-first UI remains the expected styling path, aligned with the current project and existing `shadcn-nuxt` component usage.

**Build Tooling:**
Nuxt’s standard build and dev workflow remains the foundation, with `pnpm` as the package manager and Nuxt/Nitro handling app and server build concerns.

**Testing Framework:**
No starter-imposed automated test framework should be treated as authoritative here; the repo currently lacks a formal project-wide test harness, so testing architecture will need to be decided explicitly later.

**Code Organization:**
Continue the existing Nuxt structure: `app/` for UI, `server/api/` for HTTP boundaries, `convex/` for operational state and background logic, and `docs/` for architecture and system reference.

**Development Experience:**
This preserves current developer familiarity, minimizes migration risk, and keeps architectural work focused on recommendation logic, trust controls, and operational governance instead of platform churn.

**Note:** For this brownfield project, the first implementation story should not be project initialization. It should begin with architecture-aligned feature work inside the existing repository, using the current Nuxt foundation as the baseline.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Keep the application as a modular monolith built on the existing Nuxt 4 foundation.
- Use split persistence: PostgreSQL for auth/system-of-record data, Convex for operational workflows and recommendation run state, and Cloudflare R2 + AI Search for unstructured evidence content and retrieval.
- Preserve server-mediated security boundaries: browser calls only local Nuxt APIs, never third-party AI/search providers directly.
- Treat recommendation generation as a staged workflow with safe degradation, not a single opaque synchronous call.
- Make recommendation runs versioned and auditable so output, citations, and trust-sensitive changes remain reviewable.

**Important Decisions (Shape Architecture):**
- Keep REST-style Nuxt server routes as the primary API boundary.
- Use schema-first validation at every boundary: Zod in Nuxt/server utilities and Convex validators inside Convex functions.
- Use role-scoped authorization with distinct end-user and internal admin/ops capabilities.
- Use async orchestration for long-running recommendation work, with progress visibility and resumable state.
- Keep frontend state lightweight and flow-oriented, with server-owned truth for recommendation jobs and persisted user state.

**Deferred Decisions (Post-MVP):**
- Dedicated cache tier beyond platform/application caching.
- External queue or broker infrastructure beyond Convex scheduling.
- GraphQL or gRPC interfaces.
- Full event-sourcing.
- Microservice decomposition.
- Dedicated analytics warehouse.

### Data Architecture

**Primary Decision: Layered data architecture with clear ownership boundaries**

- **Relational system of record:** Continue using PostgreSQL (through the existing NuxtHub/Drizzle path) for auth-linked durable records, user profile master records, recommendation metadata that must be exportable/auditable, and any long-lived canonical pathway catalogs that benefit from relational integrity.
- **Operational workflow state:** Continue using Convex for recommendation runs, staged evaluations, status transitions, operational admin workflows, review queues, and reactive UI-facing job state.
- **Unstructured evidence storage:** Use Cloudflare R2 for uploaded user documents, normalized source snapshots, and evidence artifacts too large or too mutable for Convex.
- **Retrieval/index layer:** Use Cloudflare AI Search as the retrieval layer over curated source artifacts and normalized content, not as the canonical rules engine.

**Data modeling approach:**
- Separate canonical pathway definitions from user-specific evaluations.
- Model recommendation runs as immutable versioned outputs linked to input snapshots, evidence references, and confidence/caveat metadata.
- Represent multi-step pathways as explicit graph-like structures (nodes, transitions, prerequisites, timeline assumptions), stored in typed application data rather than implicit prompt text.

**Validation strategy:**
- Zod at Nuxt/API boundaries.
- Convex validators (`v.*`) for Convex args and persisted documents.
- Explicit internal schemas for pathway definitions, recommendation tiers, evidence references, and recommendation-run snapshots.

**Migration approach:**
- Relational changes through explicit migrations.
- Convex schema evolution through additive, backward-compatible changes where possible.
- Pathway-definition and recommendation-rule changes should be versioned as content/data changes, not hidden inside prompts alone.

**Caching strategy:**
- Prefer request/result caching at the API/provider boundary where safe.
- Cache retrieval and recomputation outputs only when provenance and freshness rules remain intact.
- Do not cache in ways that obscure whether a recommendation is based on stale evidence.

### Authentication & Security

**Primary Decision: Server-enforced session auth with strict capability separation**

- **Authentication method:** Continue with Better Auth’s server-managed session model as the primary end-user authentication boundary.
- **Authorization pattern:** Introduce explicit capability-based role separation:
  - end users can manage only their own profile, recommendation runs, and workspace artifacts
  - internal admin/ops users can manage pathway definitions, evidence inputs, review states, and trust controls
- **Security middleware:** Enforce auth and role checks at Nuxt route boundaries and any privileged Convex function boundaries.
- **Data protection:** Sensitive user-submitted immigration/personally identifying data must remain protected in transit and at rest, with minimal exposure to logs, prompts, and internal tooling.
- **API security:** All AI/search/storage integrations remain server-side only. Internal operational endpoints must remain separately protected from public and standard authenticated user routes.

**Additional security decision:**
- Recommendation outputs must carry explicit confidence/caveat markers when evidence is incomplete, stale, or conflicting.
- The system should favor withholding or downgrading confidence over presenting polished but weak guidance.

### API & Communication Patterns

**Primary Decision: REST-style application-owned API with async workflow orchestration**

- **API pattern:** Keep REST-style Nuxt server routes as the public and internal HTTP boundary.
- **Error handling:** Standardize around typed validation failures, explicit auth failures, and safe operational errors that do not leak secrets or internal provider details.
- **Long-running workflow pattern:** Recommendation generation should be request-triggered but asynchronously orchestrated. The initial request creates or updates a recommendation run, then the system progresses through extraction, evaluation, retrieval augmentation, explanation synthesis, and finalization as observable stages.
- **Communication to UI:** Use polling, reactive state, or progressive streaming only where it improves clarity; the server remains the source of truth for status.
- **Rate limiting / abuse control:** Apply limits primarily at the server boundary and provider boundary, especially on recommendation-generation and evidence-heavy routes.

**Documentation decision:**
- The Nuxt route surface and recommendation-run lifecycle should remain documented in-repo as architecture/API docs, because this project is trust-sensitive and brownfield.

### Frontend Architecture

**Primary Decision: Thin client, workflow-first UI, server-owned truth**

- **State management:** Avoid introducing a separate heavyweight client state layer by default. Keep local UI state for form progression and view state, while persisted profile data, recommendation-run status, and trust-sensitive outputs remain server-owned.
- **Component architecture:** Continue with the current Nuxt page + reusable component pattern, but introduce more feature-level composition around intake, recommendation presentation, citations, and admin review screens as this feature set expands.
- **Design system source of truth:** Treat the approved planning artifacts as the frontend contract for visual consistency and responsive behavior:
  - `_bmad-output/planning-artifacts/DESIGN.md` for semantic design intent and composition rules
  - `_bmad-output/planning-artifacts/design-tokens.json` for machine-readable design tokens
  - `_bmad-output/planning-artifacts/design-tokens.css` for implementation-facing CSS variables
  Feature-level UI should align with these files before introducing new local styling rules or token names.
- **Routing strategy:** Keep file-based Nuxt routing, with clear separation between public pages, authenticated user workspace flows, and internal admin/ops surfaces.
- **Performance strategy:** Optimize for perceived responsiveness in long multi-step intake and recommendation review, including save-state feedback, partial progress preservation, and clear processing-state communication.
- **Bundle strategy:** Keep the client lean by avoiding direct provider SDK exposure in the browser and by pushing trust-sensitive logic to server routes and Convex workflows.

### Infrastructure & Deployment

**Primary Decision: Managed-service composition around the existing app boundary**

- **Hosting strategy:** Keep a single primary application deployment boundary for the Nuxt app, with managed external services supporting storage, retrieval, and AI routing.
- **Environment configuration:** Continue using runtime/environment configuration for all provider credentials, instance IDs, and environment-specific behavior.
- **Monitoring and logging:** Add structured logging and auditable event trails around recommendation runs, pathway/rule changes, evidence refreshes, and internal trust-management actions.
- **Scaling strategy:** Scale through staged workflow design, retrieval boundaries, and operational controls before introducing service sprawl.
- **CI/CD direction:** Keep release flow simple and enforce architecture-critical checks first: schema validity, route contracts, migration safety, and recommendation-rule/data consistency.

### Decision Impact Analysis

**Implementation Sequence:**
1. Define canonical domain schemas for user profile snapshots, pathway definitions, recommendation runs, evidence references, and confidence/caveat metadata.
2. Formalize server route boundaries for intake, recommendation-run creation, recommendation retrieval, and admin trust-management actions.
3. Build the staged recommendation orchestration path in Convex and server utilities.
4. Establish the frontend design-system contract by wiring implementation to `_bmad-output/planning-artifacts/DESIGN.md`, `design-tokens.json`, and `design-tokens.css` before feature-level UI composition expands.
5. Implement user-facing intake and recommendation review flows against those contracts.
6. Implement internal admin/ops review, evidence, and pathway-governance flows.
7. Add auditability, freshness checks, and operational safeguards around the trust-sensitive paths.

**Cross-Component Dependencies:**
- Data modeling choices directly determine API contracts, auditability, and how recommendation versioning works.
- Auth and authorization decisions shape both frontend routing and server/Convex boundaries.
- Async workflow design affects frontend progress states, retry handling, and admin review tooling.
- Evidence provenance requirements affect storage design, retrieval integration, recommendation rendering, and trust-management interfaces.
- The decision to remain a modular monolith keeps implementation sequencing simpler, but it requires disciplined module boundaries to prevent recommendation logic from scattering across pages, routes, and prompts.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
5 major areas where AI agents could make different choices and create drift:
- naming conventions
- project structure placement
- API/data formats
- state and event communication
- process behavior for loading, errors, and retries

### Naming Patterns

**Database Naming Conventions:**
- Convex table names use lowercase snake_case plural nouns where the domain is collection-like, aligned with the existing project style:
  - `recommendation_runs`
  - `pathway_definitions`
  - `evidence_sources`
- Convex document fields use camelCase because they are authored in TypeScript and consumed directly in app/server code:
  - `userId`
  - `recommendationTier`
  - `createdAt`
- SQL table names should remain lowercase singular/plural according to the existing auth migration conventions already present; new tables must follow the prevailing migration style rather than introducing a second style.
- Foreign keys in relational data use explicit semantic names such as `userId`, `recommendationRunId`, not prefixed forms like `fk_user`.
- Index names must be descriptive and scoped to the table and field intent, using one project-wide style consistently.

**API Naming Conventions:**
- Nuxt API routes use lowercase kebab-case file paths and REST-style nouns:
  - `/api/recommendations`
  - `/api/recommendation-runs/:runId`
  - `/api/admin/pathways`
- Route parameters in documentation and code should use semantic camelCase names in handler logic, even when represented as file params in route paths.
- Query/body JSON fields use camelCase, not snake_case.
- Custom headers should be minimal and use standard HTTP names where possible; avoid inventing multiple synonymous headers for the same purpose.

**Code Naming Conventions:**
- Vue components use PascalCase file names:
  - `RecommendationCard.vue`
  - `PathwayTimeline.vue`
- Nuxt pages and route files use lowercase/kebab-case path segments.
- Composables use `useX` naming:
  - `useRecommendationRun`
  - `usePathwayFilters`
- Server utility functions use clear verb-led camelCase names:
  - `buildRecommendationSnapshot`
  - `validateRecommendationRequest`
- Avoid mixed naming styles for the same concept across layers. If the domain object is `recommendationRun`, keep that name stable across app, server, docs, and Convex.

### Structure Patterns

**Project Organization:**
- `app/pages/` owns route-level screens only.
- `app/components/` owns reusable UI composition.
- `app/components/ui/` remains reserved for base UI primitives/wrappers.
- `app/lib/` owns shared client-safe helpers and presentational formatting utilities.
- `app/composables/` owns reusable stateful client logic.
- `server/api/` owns the HTTP contract boundary and request/response validation.
- `server/utils/` owns server-only orchestration helpers, provider adapters, schema helpers, and route-shared business logic that should not live inline inside handlers.
- `convex/` owns operational state transitions, background workflows, internal queries/mutations/actions, and reactive backend state.
- `docs/` owns architecture, contract, and operational documentation for behavior that affects multiple features or trust-sensitive flows.

**File Structure Patterns:**
- New domain features should be organized by feature capability, not only by technical type, once they exceed page-local complexity.
- Keep provider-specific integrations behind clearly named server-side adapters rather than scattered direct calls.
- Keep schema definitions close to the boundary they protect:
  - API input/output schemas near server handlers or shared server schema modules
  - Convex validators near Convex functions/schema
- Do not place trust-sensitive business logic inside Vue pages/components.
- `_bmad-output/planning-artifacts/` is the non-runtime planning source for AI-assisted implementation context. `DESIGN.md`, `design-tokens.json`, and `design-tokens.css` should guide story creation and frontend implementation planning, but they should not be copied into runtime asset paths unless intentionally integrated.
- Static assets should remain scoped to actual UI needs and not become a dumping ground for configuration or generated data.

### Format Patterns

**API Response Formats:**
- All user-facing server APIs should follow one consistent envelope strategy:
  - success: explicit success payload with stable top-level shape
  - failure: structured error payload with machine-readable code and user-safe message
- Recommendation workflow endpoints should return stable identifiers and state, not ad hoc blobs:
  - `runId`
  - `status`
  - `result` when available
  - `error` when failed in a user-safe form
- Do not mix direct raw provider responses with normalized application responses in the same API family.
- Status codes must reflect boundary semantics consistently:
  - validation failure
  - unauthorized/forbidden
  - not found
  - accepted/in-progress
  - successful completion
  - internal operational failure

**Data Exchange Formats:**
- JSON field names use camelCase across app/server/Convex-facing contracts.
- Dates exposed through APIs use ISO 8601 strings.
- Booleans use true/false only.
- Nullable fields should be explicit and documented; do not alternate unpredictably between omitted fields and `null` for the same contract.
- Arrays should be used for ordered collections; do not return singleton objects in places where the shape may later expand to multiple items.

### Communication Patterns

**Event System Patterns:**
- Internal workflow stage names should be explicit and lifecycle-oriented:
  - `intake_saved`
  - `recommendation_requested`
  - `recommendation_evaluating`
  - `recommendation_completed`
  - `recommendation_degraded`
- Use lowercase snake_case for internal stage/event identifiers stored in state.
- Event payloads should always include:
  - stable subject identifier
  - event/stage name
  - timestamp
  - actor/source when relevant
  - minimal context required for replay/audit
- Trust-sensitive state transitions must be idempotent where possible so retries do not create ambiguous duplicate outcomes.

**State Management Patterns:**
- The server owns truth for persisted recommendation state.
- Client state may stage local form progress and presentational state, but it must not become the source of truth for recommendation outcomes or trust signals.
- State transitions for recommendation runs should move through explicit named statuses rather than loosely inferred booleans.
- Derived UI states should be computed from canonical server state, not duplicated independently across multiple components.

### Process Patterns

**Error Handling Patterns:**
- Use one clear distinction:
  - operational/internal errors for logs and audits
  - user-facing errors for UI messaging
- Validation failures should stop early at the boundary.
- Trust-sensitive failures should degrade safely:
  - lower confidence
  - caveat/qualification
  - deferred result
  - withheld output
- Never present a provider failure or missing evidence as if the recommendation were confidently complete.
- Error logging must include enough structured context for audit/replay without leaking sensitive user content unnecessarily.

**Loading State Patterns:**
- Long-running recommendation work must use explicit workflow states, not generic `loading` everywhere.
- Intake save, recommendation generation, evidence retrieval, and admin review actions should each expose distinct progress states where the user experience depends on them.
- Loading state names should map to domain actions:
  - `savingIntake`
  - `startingRecommendation`
  - `refreshingEvidence`
  - `reviewingRecommendation`
- User-facing loading states should always be paired with clear next expectations when work is not immediate.

### Enforcement Guidelines

**All AI Agents MUST:**
- Keep trust-sensitive business logic in server utilities and Convex workflows, not inside UI components.
- Reuse the same naming for domain concepts across routes, schemas, state, and docs.
- Normalize external provider responses before exposing them to app code or the browser.
- Use camelCase JSON and ISO date strings for application contracts.
- Treat recommendation runs as explicit, versioned workflow objects with named statuses.
- Preserve the server-only boundary for all privileged integrations.
- Document any architecture-level contract change in `docs/` when it affects multiple features or operational behavior.

**Pattern Enforcement:**
- Review new routes, schema additions, and workflow changes against this architecture document before merging.
- Treat naming/placement/response-shape drift as an architecture issue, not a cosmetic issue.
- If a new feature needs an exception, document that exception explicitly in the architecture docs instead of silently introducing a second pattern.
- Prefer updating an existing pattern deliberately over allowing parallel conventions to accumulate.

### Pattern Examples

**Good Examples:**
- `server/api/recommendations/index.post.ts` creates a normalized recommendation run and returns a stable application payload.
- `server/utils/recommendations/buildRecommendationSnapshot.ts` contains shared server-side recommendation assembly logic.
- `convex/recommendationRuns.ts` manages persisted run lifecycle and status transitions.
- `app/components/recommendations/RecommendationResultPanel.vue` renders normalized result data without embedding provider-specific logic.
- `docs/api-contracts.md` is updated when the recommendation lifecycle contract changes.

**Anti-Patterns:**
- Calling external AI/search providers directly from Vue components.
- Returning raw vendor payloads from some routes and normalized app payloads from others.
- Mixing `snake_case`, `camelCase`, and PascalCase for the same domain object across layers.
- Hiding recommendation status in multiple unrelated booleans instead of one canonical lifecycle field.
- Putting recommendation decision logic inline in page components or route handlers when it should live in reusable server/Convex modules.
- Introducing a second state-management or provider-abstraction style for only one feature without documenting why.

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
cadet2/
├── README.md
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── nuxt.config.ts
├── components.json
├── .nuxtrc
├── .env
├── .env.example
├── .env.local
├── .gitignore
├── app/
│   ├── assets/
│   │   └── css/
│   ├── components/
│   │   ├── ui/
│   │   │   └── ...existing shadcn/reka wrappers...
│   │   ├── auth/
│   │   │   └── AuthSessionGate.vue
│   │   ├── intake/
│   │   │   ├── IntakeStepper.vue
│   │   │   ├── IntakeProfileForm.vue
│   │   │   ├── IntakeConstraintsForm.vue
│   │   │   └── IntakeSaveStatus.vue
│   │   ├── recommendations/
│   │   │   ├── RecommendationResultPanel.vue
│   │   │   ├── RecommendationCard.vue
│   │   │   ├── RecommendationTierBadge.vue
│   │   │   ├── RecommendationStatusBanner.vue
│   │   │   ├── RecommendationCitationList.vue
│   │   │   ├── PathwayTimeline.vue
│   │   │   └── RecommendationComparisonTable.vue
│   │   ├── workspace/
│   │   │   ├── RecommendationRunList.vue
│   │   │   └── WorkspaceShell.vue
│   │   └── admin/
│   │       ├── pathways/
│   │       │   ├── PathwayDefinitionTable.vue
│   │       │   └── PathwayRuleEditor.vue
│   │       ├── evidence/
│   │       │   ├── EvidenceSourceTable.vue
│   │       │   └── EvidenceRefreshPanel.vue
│   │       └── reviews/
│   │           ├── RecommendationReviewQueue.vue
│   │           └── RecommendationAuditPanel.vue
│   ├── composables/
│   │   ├── useIntakeDraft.ts
│   │   ├── useRecommendationRun.ts
│   │   ├── useRecommendationHistory.ts
│   │   └── useAdminReviewFilters.ts
│   ├── lib/
│   │   ├── utils.ts
│   │   ├── auth/
│   │   │   └── sessionGuards.ts
│   │   ├── recommendations/
│   │   │   ├── formatRecommendation.ts
│   │   │   ├── formatRecommendationStatus.ts
│   │   │   └── formatRecommendationEvidence.ts
│   │   └── intake/
│   │       └── intakeDisplay.ts
│   ├── pages/
│   │   ├── index.vue
│   │   ├── auth.vue
│   │   ├── ai-search.vue
│   │   ├── tasks.client.vue
│   │   ├── workspace/
│   │   │   ├── index.vue
│   │   │   ├── intake.vue
│   │   │   ├── recommendations.vue
│   │   │   └── recommendation-runs/
│   │   │       └── [runId].vue
│   │   └── admin/
│   │       ├── rag-phase0.client.vue
│   │       ├── rag-sources.client.vue
│   │       ├── pathways.client.vue
│   │       ├── evidence.client.vue
│   │       └── recommendation-reviews.client.vue
│   └── plugins/
├── server/
│   ├── api/
│   │   ├── ai-search/
│   │   │   └── query.post.ts
│   │   ├── recommendations/
│   │   │   ├── index.post.ts
│   │   │   ├── [runId].get.ts
│   │   │   ├── [runId]/refresh.post.ts
│   │   │   ├── [runId]/compare.post.ts
│   │   │   └── [runId]/timeline.get.ts
│   │   ├── intake/
│   │   │   ├── draft.get.ts
│   │   │   ├── draft.post.ts
│   │   │   └── submit.post.ts
│   │   ├── workspace/
│   │   │   └── recommendation-runs.get.ts
│   │   ├── admin/
│   │   │   ├── rag/
│   │   │   │   ├── phase0-readiness.get.ts
│   │   │   │   ├── convex-admin/
│   │   │   │   │   └── sync-current-user.post.ts
│   │   │   │   ├── ingestion/
│   │   │   │   │   ├── run.post.ts
│   │   │   │   │   ├── batches/
│   │   │   │   │   │   ├── index.get.ts
│   │   │   │   │   │   └── [batchId].get.ts
│   │   │   │   └── sources/
│   │   │   │       ├── index.get.ts
│   │   │   │       ├── index.post.ts
│   │   │   │       ├── admin-status.get.ts
│   │   │   │       └── [sourceId]/
│   │   │   │           ├── approve.post.ts
│   │   │   │           ├── reject.post.ts
│   │   │   │           ├── pause.post.ts
│   │   │   │           └── resume.post.ts
│   │   │   ├── pathways/
│   │   │   │   ├── index.get.ts
│   │   │   │   ├── index.post.ts
│   │   │   │   ├── [pathwayId].patch.ts
│   │   │   │   └── [pathwayId]/status.post.ts
│   │   │   ├── evidence/
│   │   │   │   ├── index.get.ts
│   │   │   │   ├── refresh.post.ts
│   │   │   │   └── [sourceId]/audit.get.ts
│   │   │   └── recommendation-reviews/
│   │   │       ├── index.get.ts
│   │   │       └── [runId]/resolve.post.ts
│   │   └── internal/
│   │       └── scheduler/
│   │           ├── daily-ingestion.post.ts
│   │           └── recommendation-refresh.post.ts
│   ├── db/
│   │   └── migrations/
│   │       └── postgresql/
│   │           ├── ...existing auth migrations...
│   │           ├── 0002_recommendation_profiles.sql
│   │           ├── 0003_pathway_catalog.sql
│   │           └── 0004_recommendation_audit.sql
│   └── utils/
│       ├── auth/
│       │   ├── requireUserSession.ts
│       │   ├── requireAdminSession.ts
│       │   └── requireRecommendationAccess.ts
│       ├── intake/
│       │   ├── intakeSchemas.ts
│       │   ├── normalizeIntakePayload.ts
│       │   └── buildProfileSnapshot.ts
│       ├── recommendations/
│       │   ├── recommendationSchemas.ts
│       │   ├── createRecommendationRun.ts
│       │   ├── buildRecommendationSnapshot.ts
│       │   ├── buildRecommendationTimeline.ts
│       │   ├── mapRecommendationStatus.ts
│       │   ├── applyConfidenceCaveats.ts
│       │   └── normalizeRecommendationResponse.ts
│       ├── pathways/
│       │   ├── pathwaySchemas.ts
│       │   ├── scorePathwayFit.ts
│       │   ├── evaluatePathwayGaps.ts
│       │   └── buildPathwayGraph.ts
│       ├── evidence/
│       │   ├── evidenceSchemas.ts
│       │   ├── buildEvidencePacket.ts
│       │   ├── validateEvidenceFreshness.ts
│       │   └── mapCitationReferences.ts
│       ├── providers/
│       │   ├── aiSearchClient.ts
│       │   ├── aiGatewayClient.ts
│       │   ├── openRouterClient.ts
│       │   └── r2Client.ts
│       └── audit/
│           ├── auditSchemas.ts
│           ├── createAuditEvent.ts
│           └── logTrustSensitiveAction.ts
├── convex/
│   ├── README.md
│   ├── tsconfig.json
│   ├── auth.config.ts
│   ├── schema.ts
│   ├── tasks.ts
│   ├── ragSources.ts
│   ├── ragSourcesInternal.ts
│   ├── ragIngestionInternal.ts
│   ├── recommendationRuns.ts
│   ├── recommendationRunsInternal.ts
│   ├── pathwayDefinitions.ts
│   ├── pathwayDefinitionsInternal.ts
│   ├── profileSnapshots.ts
│   ├── evidenceReviews.ts
│   ├── auditLog.ts
│   └── _generated/
├── docs/
│   ├── index.md
│   ├── architecture.md
│   ├── api-contracts.md
│   ├── data-models.md
│   ├── technology-stack.md
│   ├── recommendation-architecture.md
│   ├── recommendation-lifecycle.md
│   ├── pathway-definition-model.md
│   └── evidence-governance.md
├── public/
│   └── ...public static assets...
├── _bmad-output/
│   ├── planning-artifacts/
│   ├── implementation-artifacts/
│   └── test-artifacts/
└── tests/
    ├── README.md
    ├── fixtures/
    │   ├── intake/
    │   ├── pathways/
    │   └── evidence/
    ├── unit/
    │   ├── server/
    │   └── app/
    ├── integration/
    │   ├── api/
    │   └── convex/
    └── evaluation/
        ├── recommendation-cases/
        └── trust-regressions/
```

### Architectural Boundaries

**API Boundaries:**
- `server/api/` is the only browser-facing HTTP contract boundary.
- `server/api/recommendations/*` owns recommendation-run creation, retrieval, refresh, comparison, and timeline access.
- `server/api/intake/*` owns draft persistence and intake submission.
- `server/api/admin/*` owns internal trust-management workflows and must remain capability-restricted.
- `server/api/internal/*` owns secret-protected scheduler/automation entry points only.
- External AI/search/storage providers are never called directly by app pages or components.

**Component Boundaries:**
- `app/pages/` coordinates route-level loading and composition only.
- `app/components/*` renders UI and manages local interaction state.
- `app/composables/*` manages reusable client-side flow state and view coordination.
- `app/lib/*` contains formatting and client-safe helper logic only.
- UI components consume normalized application contracts, not raw provider payloads.

**Service Boundaries:**
- `server/utils/intake/*` owns intake normalization and profile snapshot assembly.
- `server/utils/recommendations/*` owns orchestration helpers and output normalization.
- `server/utils/pathways/*` owns deterministic pathway evaluation helpers and graph logic.
- `server/utils/evidence/*` owns evidence packet assembly, citation mapping, and freshness checks.
- `server/utils/providers/*` owns all third-party client adapters.
- `convex/*` owns persisted workflow state, job transitions, and reactive backend operations.

**Data Boundaries:**
- SQL migrations in `server/db/migrations/postgresql/` own relational durable schema evolution.
- `convex/schema.ts` and related Convex modules own operational/realtime state.
- R2 stores unstructured documents and normalized evidence artifacts.
- AI Search indexes normalized evidence content, but does not own canonical recommendation rules.

### Requirements to Structure Mapping

**Feature / FR Category Mapping:**
- User Intake & Profile Management
  - UI: `app/pages/workspace/intake.vue`, `app/components/intake/*`
  - API: `server/api/intake/*`
  - Server logic: `server/utils/intake/*`
  - Persistence: `server/db/migrations/postgresql/0002_recommendation_profiles.sql`, `convex/profileSnapshots.ts`

- Recommendation Generation & Pathway Analysis
  - UI: `app/pages/workspace/recommendations.vue`, `app/pages/workspace/recommendation-runs/[runId].vue`, `app/components/recommendations/*`
  - API: `server/api/recommendations/*`
  - Server logic: `server/utils/recommendations/*`, `server/utils/pathways/*`
  - Persistence/workflow: `convex/recommendationRuns.ts`, `convex/recommendationRunsInternal.ts`, `convex/pathwayDefinitions.ts`

- Recommendation Explanation, Citations & Trust Signals
  - UI: `app/components/recommendations/RecommendationCitationList.vue`, `RecommendationTierBadge.vue`, `PathwayTimeline.vue`
  - Approved custom UI ownership:
    - `app/components/recommendations/RecommendationSummaryBand.vue`
    - `app/components/recommendations/PathwayComparisonCard.vue`
    - `app/components/recommendations/BlockerAndTradeoffPanel.vue`
    - `app/components/recommendations/EvidenceConfidencePanel.vue`
    - `app/components/recommendations/NextActionQueue.vue`
    - `app/components/recommendations/MilestoneRoutePlanner.vue`
  - Server logic: `server/utils/evidence/*`, `server/utils/recommendations/applyConfidenceCaveats.ts`
  - Docs/contracts: `docs/recommendation-lifecycle.md`, `docs/api-contracts.md`

- Recommendation Follow-Through & Continuity
  - UI: `app/components/workspace/RecommendationRunList.vue`
  - API: `server/api/workspace/recommendation-runs.get.ts`, `server/api/recommendations/[runId]/refresh.post.ts`
  - Persistence: `convex/recommendationRuns.ts`

- Internal Admin/Ops Trust Management
  - UI: `app/pages/admin/pathways.client.vue`, `app/pages/admin/evidence.client.vue`, `app/pages/admin/recommendation-reviews.client.vue`
  - Components: `app/components/admin/*`
  - API: `server/api/admin/pathways/*`, `server/api/admin/evidence/*`, `server/api/admin/recommendation-reviews/*`
  - Persistence: `convex/pathwayDefinitions.ts`, `convex/evidenceReviews.ts`, `convex/auditLog.ts`
  - Planning prerequisite: finalize the admin/trust-governance UX interactions in the UX specification before Epic 5 implementation begins

**Cross-Cutting Concerns:**
- Authentication and authorization
  - `app/lib/auth/*`
  - `server/utils/auth/*`
  - `convex/auth.config.ts`

- Auditability and trust-sensitive logging
  - `server/utils/audit/*`
  - `convex/auditLog.ts`
  - `server/api/admin/*` and `server/api/recommendations/*` as event sources

- External provider integration
  - `server/utils/providers/*`
  - `server/api/ai-search/query.post.ts`
  - `server/api/internal/scheduler/*`

### Integration Points

**Internal Communication:**
- Pages call local Nuxt APIs through normalized app contracts.
- Server routes validate and delegate to server utilities.
- Server utilities call Convex and provider adapters.
- Convex manages persisted workflow transitions and reactive state.
- UI polling/reactive fetch reads recommendation-run state by `runId`.

**External Integrations:**
- AI Search access remains behind `server/api/ai-search/*` or server provider adapters.
- AI Gateway / OpenRouter access remains behind `server/utils/providers/*`.
- R2 access remains behind `server/utils/providers/r2Client.ts`.
- Scheduled refreshes enter through `server/api/internal/scheduler/*`.

**Data Flow:**
1. User saves intake draft via `server/api/intake/draft.post.ts`.
2. Intake submission normalizes into a profile snapshot and creates a recommendation run.
3. Recommendation orchestration evaluates deterministic pathway logic, then augments with evidence retrieval and controlled LLM-assisted reasoning.
4. Recommendation output is normalized into a versioned run snapshot with citations and confidence markers.
5. UI retrieves and renders recommendation state via `runId`.
6. Admin/ops users review pathway definitions, evidence freshness, and flagged recommendation runs through dedicated admin routes.

### File Organization Patterns

**Configuration Files:**
- Root config remains at the repository root (`package.json`, `nuxt.config.ts`, `tsconfig.json`, env files).
- Architecture-affecting behavioral documentation lives in `docs/*.md`.
- Migration files remain under `server/db/migrations/postgresql/`.

**Source Organization:**
- Route/UI entry points stay in `app/pages/`.
- Reusable UI stays in `app/components/`.
- Server boundaries stay in `server/api/`.
- Reusable backend logic stays in `server/utils/`.
- Reactive persisted operational logic stays in `convex/`.

**Test Organization:**
- Introduce one top-level `tests/` root when automated verification is added.
- Keep unit, integration, and recommendation-evaluation fixtures separated so trust regressions are inspectable.
- Recommendation evaluation cases should be domain fixtures, not only generic API tests.

**Asset Organization:**
- Visual/browser assets remain in `public/` and `app/assets/`.
- Uploaded evidence and source artifacts do not belong in repo assets; they belong in external object storage.

### Development Workflow Integration

**Development Server Structure:**
- The Nuxt dev server remains the primary local entry point.
- New recommendation features slot into the existing app/server/convex boundaries without introducing a second app runtime.

**Build Process Structure:**
- Nuxt builds the app and server boundary.
- Convex code remains within its existing generated/runtime workflow.
- SQL migrations evolve independently through the existing migration directory.

**Deployment Structure:**
- One primary app deployment boundary remains responsible for UI and API.
- Managed external services support storage, retrieval, and AI routing.
- The directory structure keeps trust-sensitive business logic centralized in server and Convex layers, which supports safer deployment and review.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
The architecture is coherent across all major decisions. The chosen brownfield modular-monolith approach is compatible with the existing Nuxt 4 application boundary, Vue 3 UI layer, Better Auth session model, Convex operational workflow layer, and server-mediated external integrations. The split persistence model also aligns with the current repository and the product’s trust-sensitive requirements: relational durability where needed, Convex for workflow state, and external object/search systems for evidence-heavy content.

There are no contradictory platform decisions. The architecture consistently avoids unnecessary microservice sprawl, avoids exposing provider integrations to the client, and preserves a clear operational split between user-facing recommendation workflows and internal trust-management capabilities.

**Pattern Consistency:**
The implementation patterns support the architectural decisions directly. Naming conventions align with the project’s TypeScript-first structure, structure rules reinforce the server/client/backend boundaries, and communication patterns match the staged recommendation workflow model. The consistency rules are specific enough to reduce AI-agent drift in naming, file placement, API shapes, lifecycle states, and trust-sensitive error handling. The generated design-system artifacts now also create an explicit bridge between approved UX decisions and frontend implementation, reducing drift in styling, component composition, and responsive behavior.

**Structure Alignment:**
The project structure cleanly supports the architectural model. The proposed directories map appropriately onto the existing repository layout and preserve the boundaries established in the architectural decisions. UI composition remains in `app/`, HTTP contracts remain in `server/api/`, server-side orchestration stays in `server/utils/`, and persisted workflow state remains in `convex/`. `_bmad-output/planning-artifacts/` now also serves as the non-runtime design/planning reference layer for implementation guidance. The structure also creates clear homes for new recommendation, pathway, evidence, and audit concerns without undermining the current monolith.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
No epics were provided, so validation was performed against functional requirement categories. All major feature areas have explicit architectural support: user intake, recommendation generation, explanation and trust signals, recommendation continuity, internal admin/ops governance, and access-control safeguards.

**Functional Requirements Coverage:**
All 48 functional requirements are architecturally supported by the combination of:
- dedicated intake APIs and UI flows
- recommendation-run lifecycle APIs and workflow state
- pathway-definition and evidence-governance modules
- admin review and trust-management surfaces
- persistent recommendation history and versioned outputs
- explicit role separation and guarded operational routes

Cross-cutting functional requirements such as repeat usage, recommendation comparison, citation traceability, and internal reviewability are supported through shared structures rather than isolated feature patches.

**Non-Functional Requirements Coverage:**
The architecture addresses the major NFRs:
- **Performance:** staged workflows, async processing, and responsive UI-state patterns
- **Security:** server-only privileged integrations, strict auth boundaries, and role separation
- **Reliability:** safe degradation, explicit workflow states, and auditable run snapshots
- **Scalability:** phased growth without requiring architectural replacement
- **Accessibility:** workflow-first UI structure that supports form-heavy and status-rich interactions
- **Integration:** normalized provider boundaries and explicit evidence/retrieval ownership

### Implementation Readiness Validation (Conditional)

**Decision Completeness:**
The critical architectural decisions are documented with clear rationale and stable platform direction. The technology stack, ownership boundaries, persistence strategy, API model, and trust-control posture are all explicit enough to guide implementation.

**Structure Completeness:**
The project structure is concrete and specific. It extends the existing repository rather than inventing a disconnected greenfield layout. Major new recommendation-related modules, routes, server utilities, and Convex modules are mapped clearly enough for implementation planning.

**Pattern Completeness:**
The implementation patterns cover the main sources of AI-agent drift: naming, file placement, response shape, lifecycle state naming, error handling, and loading-state behavior. These rules are sufficiently explicit to support consistent implementation across multiple agents.

### Gap Analysis Results

**Critical Gaps:**
- None identified that block implementation.

**Important Gaps:**
- The architecture defines a future `tests/` structure, but the repository does not yet have a formal automated test harness in place.
- Recommendation-evaluation fixtures and trust-regression checks should be introduced early in implementation to match the trust-sensitive architecture.

**Nice-to-Have Gaps:**
- Additional documentation may later help with pathway-definition authoring rules, admin review playbooks, and evaluation-case design.
- A dedicated recommendation domain glossary could further reduce naming drift across future implementation stories.

### Validation Issues Addressed

The previously identified downstream planning gaps have now been corrected in the UX and epics artifacts. The remaining architectural consideration is the absence of an active automated test framework in the current repository, which remains an early implementation priority. This does not invalidate the architectural direction, but it should be addressed early in execution for a trust-sensitive system.

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High, with normal implementation-phase test-harness follow-through still recommended

**Key Strengths:**
- Strong alignment with the existing brownfield codebase
- Clear trust-sensitive boundaries for security, provenance, and auditability
- Explicit lifecycle model for recommendation runs and governance workflows
- Concrete implementation patterns that reduce AI-agent inconsistency
- A structure that supports phased growth without forcing platform churn

**Areas for Future Enhancement:**
- Formalize the automated test harness and recommendation-evaluation suite
- Expand pathway-definition governance documentation as that subsystem matures
- Add deeper operational metrics/observability conventions once implementation begins

**Current Planning Status:**
- The admin/trust-governance UX flow and governance interaction patterns are now defined in the UX specification
- Story boundaries and unhappy-path coverage have been tightened in the epics artifact
- The custom component ownership mapping above should be preserved so the approved UX direction is implemented consistently during delivery

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**
Define and implement the canonical domain schemas and contracts for:
- profile snapshots
- pathway definitions
- recommendation runs
- evidence references
- confidence/caveat metadata

These schemas should become the foundation for the first implementation stories across `server/`, `convex/`, and the recommendation UI surfaces.
