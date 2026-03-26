# Story 5.4: Audit Trust-Sensitive Changes and Preserve Governance Boundaries

Status: done

## Story

As an internal admin or ops user,
I want all trust-sensitive governance actions to be auditable and isolated from end-user experiences,
So that the product remains controllable, reviewable, and safe as it evolves.

## Acceptance Criteria

1. **Given** an internal admin or ops user changes pathway definitions, evidence sources, or recommendation-governance settings **When** the change is committed **Then** the system records an auditable event for that trust-sensitive action **And** the event preserves the actor, timestamp, and relevant change context.

2. **Given** trust-sensitive audit persistence does not yet exist for this feature set **When** this story introduces audit logging **Then** it creates only the minimum audit record structure needed for actor, timestamp, action type, and scoped change context **And** it does not expand into unrelated analytics or historical replay models ahead of a later explicit story.

3. **Given** internal governance workflows exist alongside end-user recommendation workflows **When** the product routes requests and permissions **Then** the boundary between internal trust-management activities and user-facing experiences is enforced consistently **And** end users cannot access or trigger privileged governance operations.

4. **Given** internal audit history is rendered in the admin workflow **When** authorized users inspect trust-sensitive changes **Then** the audit view exposes a stable `data-testid="admin-audit-panel"` hook and remains inaccessible to standard end users.

5. **Given** the supported pathway inventory expands over time **When** new pathways or governance controls are introduced **Then** the system can extend the governed scope without redesigning the core trust-management model **And** recommendation workflows remain reviewable and controllable by internal operators.

## Tasks / Subtasks

- [x] Task 1: Create audit log schema and service (AC: #1, #2)
  - [x] 1.1 Create Convex `auditLog` table schema in `convex/schema.ts` with fields: `_id`, `actorId`, `actorEmail`, `actorRole`, `actionType`, `entityType`, `entityId`, `entityLabel`, `changeContext` (structured before/after JSON), `reason` (optional string), `timestamp`
  - [x] 1.2 Create `convex/auditLog.ts` module with `recordAuditEvent` mutation and `listAuditEvents` query (with pagination, filtering by actionType, entityType, actorId, dateRange)
  - [x] 1.3 Create `server/utils/audit/recordGovernanceAction.ts` utility that accepts event details, resolves actor from session, and records the minimum audit event structure
  - [x] 1.4 Define `AuditActionType` enum: `PATHWAY_CREATED`, `PATHWAY_UPDATED`, `PATHWAY_STATUS_CHANGED`, `PATHWAY_RULE_CREATED`, `PATHWAY_RULE_UPDATED`, `PATHWAY_RULE_DELETED`, `EVIDENCE_SOURCE_CREATED`, `EVIDENCE_SOURCE_UPDATED`, `EVIDENCE_SOURCE_PAUSED`, `EVIDENCE_SOURCE_RESUMED`, `EVIDENCE_SOURCE_APPROVED`, `EVIDENCE_SOURCE_REJECTED`, `EVIDENCE_SOURCE_DELETED`, `RECOMMENDATION_FLAGGED`, `RECOMMENDATION_DISMISSED`, `RECOMMENDATION_RESOLVED`, `GOVERNANCE_SETTING_CHANGED`
  - [x] 1.5 Define `AuditEntityType` enum: `PATHWAY`, `PATHWAY_RULE`, `EVIDENCE_SOURCE`, `RECOMMENDATION_RUN`, `GOVERNANCE_SETTING`

- [x] Task 2: Integrate audit logging into existing admin mutation endpoints (AC: #1)
  - [x] 2.1 Add `recordGovernanceAction()` calls to pathway CRUD endpoints: `pathways/index.post.ts`, `pathways/[pathwayId].patch.ts`, `pathways/[pathwayId]/status.patch.ts`
  - [x] 2.2 Add `recordGovernanceAction()` calls to pathway rule endpoints: `pathways/[pathwayId]/rules.post.ts`, `pathways/[pathwayId]/rules.put.ts`, `pathways/[pathwayId]/rules/[ruleId].patch.ts`, `pathways/[pathwayId]/rules/[ruleId].delete.ts`
  - [x] 2.3 Add `recordGovernanceAction()` calls to evidence source endpoints: `rag/sources/index.post.ts`, `rag/sources/[sourceId].patch.ts`, `rag/sources/[sourceId].delete.ts`, `rag/sources/[sourceId]/approve.post.ts`, `rag/sources/[sourceId]/pause.post.ts`, `rag/sources/[sourceId]/resume.post.ts`, `rag/sources/[sourceId]/reject.post.ts`
  - [x] 2.4 Add `recordGovernanceAction()` calls to recommendation review endpoints: `recommendation-reviews/[runId]/flag.post.ts`, `recommendation-reviews/[runId]/dismiss.post.ts`, `recommendation-reviews/[runId]/resolve.post.ts`

- [x] Task 3: Create audit trail API endpoints (AC: #1, #4)
  - [x] 3.1 Create `server/api/admin/audit-trail/index.get.ts` — paginated list with filters (actionType, entityType, actorId, dateRange, search). Guarded by `requireAdminSession`.
  - [x] 3.2 Create `server/api/admin/audit-trail/[eventId].get.ts` — single event detail with full change context. Guarded by `requireAdminSession`.
  - [x] 3.3 Create `server/api/admin/audit-trail/summary.get.ts` — summary stats (events today, events this week, most active actor, most changed entity type). Guarded by `requireAdminSession`.

- [x] Task 4: Create admin audit trail page (AC: #4)
  - [x] 4.1 Create `app/pages/admin/audit-trail.client.vue` following Two-Panel Audit Inspector design (Concept B)
  - [x] 4.2 Implement left panel: scrollable event list grouped by date, with action type icon, actor, timestamp, entity
  - [x] 4.3 Implement right panel: event detail inspector showing actor details, timestamp, action type/category, affected entity, before/after change diff, reason text, related events chain
  - [x] 4.4 Implement filter ribbon: date range picker, action type dropdown, actor filter
  - [x] 4.5 Implement summary statistics bar: events today, events this week, most active actor, most changed entity type
  - [x] 4.6 Add "Audit trail" link to admin navigation in `app/lib/admin/navigation.ts`
  - [x] 4.7 Ensure `data-testid="admin-audit-panel"` is present on the audit panel root

- [x] Task 5: Enforce governance boundaries (AC: #3)
  - [x] 5.1 Verify all existing admin API routes use `requireAdminSession` guard consistently (audit existing 30+ endpoints)
  - [x] 5.2 Verify admin page route is protected by the existing admin middleware pattern
  - [x] 5.3 Verify `app/middleware/admin.ts` correctly redirects non-admin users
  - [x] 5.4 Add boundary tests: confirm unauthenticated and non-admin users receive 401/403 from audit trail endpoints

- [x] Task 6: Extensibility validation (AC: #5)
  - [x] 6.1 Verify audit log schema supports additional `AuditActionType` and `AuditEntityType` values without migration
  - [x] 6.2 Confirm the `recordGovernanceAction` utility is reusable for future governance modules

## Dev Notes

- **Architecture pattern:** Modular monolith; all admin actions are server-mediated through Nuxt 4 API routes guarded by `requireAdminSession` from `server/utils/auth/requireAdminSession.ts`.
- **Persistence:** MVP audit events are written to the local SQL-backed `governance_audit_log` store via `server/utils/audit/auditLogStore.ts`, which keeps governed admin mutations testable and independent of external Convex HTTP reachability. Convex audit scaffolding remains in place for future evolution.
- **Auth guard:** Every admin endpoint already calls `await requireAdminSession(event, { ... })`. The audit trail endpoints must follow the identical pattern.
- **Session resolution:** `requireAdminSession` returns `{ session, authorizationSource }` — use `session.user.id`, `session.user.email`, `session.user.role` for audit actor fields.
- **No analytics expansion:** AC #2 explicitly limits scope to minimum audit record structure. Do NOT build dashboards, trend analysis, or historical replay beyond showing the event list and detail.
- **Existing admin pages:** 6 existing `.client.vue` pages in `app/pages/admin/` — `pathways`, `pathway-rules`, `evidence-sources`, `recommendation-reviews`, `rag-sources`, `rag-phase0`.
- **Existing admin navigation:** `app/lib/admin/navigation.ts` exports `adminNavigationLinks` array with 6 entries. Add `{ label: 'Audit trail', href: '/admin/audit-trail' }` as the 7th entry.
- **Change context format:** `changeContext` should be a structured JSON object with `{ before: Record<string, unknown>, after: Record<string, unknown> }` for field-level diffs. For creation events, `before` is `null`. For deletion events, `after` is `null`.

### UI/UX Context

- This is a **frontend-impacting** story that introduces a new admin page: the Audit Trail.
- The audit trail provides an internal-only inspection surface where authorized operators can review who changed what, when, and why.
- The page is read-only (no corrective actions from this surface — those belong to existing admin pages).
- Desktop uses a two-panel master-detail layout; mobile uses tab-switched views.

### Affected Frontend Surfaces

- **New page:** `app/pages/admin/audit-trail.client.vue` at route `/admin/audit-trail`
- **Modified component:** `app/lib/admin/navigation.ts` — add "Audit trail" link

### Concept Options (3 Paired Directions Per Surface)

**Surface: Admin Audit Trail (`/admin/audit-trail`)**

| Concept | Desktop Screen ID | Mobile Screen ID | Description |
|---|---|---|---|
| A: Chronological Event Stream | `d695645bce9440f2921332ed59fcfb94` | `d8b5ea2820e64a8f9e094281b7eb16b4` | Flat filterable event stream table |
| B: Two-Panel Audit Inspector | `3d868cccafdf469f80a2aeecce9efdcb` | `b64272ef174644c4ad2c576864fff0c7` | Master-detail with event list + inspector |
| C: Governance Activity Dashboard | `4034d76ea2794a07a4c098984eafa1fd` | `032376db9cad4a139db68d927d9ac9d0` | Dashboard-first with stats + heatmap + table |

### Approved Stitch Design Package

- Stitch project ID: `6257021077077987630`
- Surface-to-concept-options mapping: Admin Audit Trail → Concepts A, B, C (see table above)
- Surface-to-approved-pair mapping: Admin Audit Trail → Concept B (Two-Panel Audit Inspector)
- Approved desktop screen IDs: `3d868cccafdf469f80a2aeecce9efdcb`
- Approved mobile screen IDs: `b64272ef174644c4ad2c576864fff0c7`
- Approved component IDs: N/A (no shared component generation needed)
- Approved concept labels: Two-Panel Audit Inspector
- Selected variant labels: B
- Prompt summary: Master-detail layout with scrollable event list grouped by date on the left, full event inspector with actor details, before/after diff, rationale, and event chain on the right. Summary stats bar at top. Dark mode admin styling.
- Design context source: UX Design Specification, Governance Review Patterns section (lines 1001–1037)
- Token artifact references: Sovereign Admin design system (`assets/1475748d05b547ef90aa48e53c6d4273`)
- Pair approval rationale: The master-detail pattern best matches the UX spec's audit inspection flow (identify → inspect → confirm), provides the richest before/after context view, and aligns with the existing recommendation review page's inspection pattern.
- Supporting screenshot/code references: Desktop screen in Stitch project

### Approved Variant Decision

- **Admin Audit Trail:** Concept B (Two-Panel Audit Inspector) approved.
- **Rationale:** Best supports the core audit inspection workflow: quickly scan events in the left panel, drill into full change context in the right panel. The summary stats bar provides at-a-glance governance health. Mobile tab switching preserves all content for on-the-go inspection.
- **Refinements:** None requested.

### Design Tokens / System Constraints

- Must use Sovereign Admin design system tokens already established in existing admin pages
- Color-coded action type badges: pathway changes (blue `secondary`), evidence changes (amber), recommendation actions (sage-green `secondary_container`), governance settings (purple)
- Text + icon indicators required for all badges (WCAG AA — never color alone)
- Surface hierarchy: `surface` background, `surface_container_lowest` for active data areas
- Typography: Manrope for headlines, Inter for body/labels
- Minimum touch targets: 44px on mobile
- No 1px solid borders — use tonal layering for boundaries

### Stitch Retrieval Instructions

- **Step 1:** Retrieve desktop screen `3d868cccafdf469f80a2aeecce9efdcb` from project `6257021077077987630` for the two-panel audit inspector layout, summary stats bar, filter ribbon, and detail inspector structure.
- **Step 2:** Retrieve mobile screen `b64272ef174644c4ad2c576864fff0c7` for the tab-switched mobile layout with Events/Details tabs, compact event cards, and summary strip.
- **Desktop → implementation:** Left panel maps to `AuditEventList.vue` component; right panel maps to `AuditEventDetail.vue` component; summary bar maps to `AuditSummaryBar.vue` component; filter ribbon maps to `AuditFilterRibbon.vue` component.
- **Mobile → implementation:** Tab switching between event list and detail; stacked compact cards; collapsible filter section.
- **Responsive:** Desktop shows both panels side-by-side; below 1024px breakpoint, switch to tab-based mobile layout.
- **Tools:** Use `mcp_stitch_get_screen` to retrieve HTML/CSS artifacts for implementation reference.

### Referenced UX Artifacts

- UX specification: `_bmad-output/planning-artifacts/ux-design-specification.md` — Governance Review Patterns (lines 1001–1037), Navigation Patterns (lines 966–999)
- Architecture: `_bmad-output/planning-artifacts/architecture.md` — Architectural Decisions (server-mediated security, split persistence), Implementation Patterns (naming, structure, error handling)
- Project context: `_bmad-output/project-context.md` — Technology stack, implementation rules, brownfield constraints
- Previous story: `_bmad-output/implementation-artifacts/5-3-review-recommendation-trustworthiness-and-correct-weak-support.md` — Admin review page patterns, recommendation review API shape

### Project Structure Notes

- `convex/auditLog.ts` — Convex audit scaffolding retained for future operational evolution
- `convex/schema.ts` — Extended with `auditLog` table definition
- `server/utils/audit/auditLogStore.ts` — SQL-backed MVP audit persistence and query layer
- `server/utils/audit/recordGovernanceAction.ts` — New server utility for recording audit events
- `server/utils/audit/types.ts` — New types file for `AuditActionType`, `AuditEntityType`, `AuditEvent` interfaces
- `server/api/admin/audit-trail/index.get.ts` — New API route for paginated event list
- `server/api/admin/audit-trail/[eventId].get.ts` — New API route for event detail
- `server/api/admin/audit-trail/summary.get.ts` — New API route for summary stats
- `app/pages/admin/audit-trail.client.vue` — New admin page
- `app/lib/admin/navigation.ts` — Modified to add audit trail link
- All existing admin mutation endpoints in `server/api/admin/` — Modified to add `recordGovernanceAction()` calls
- Naming: snake_case for DB fields, camelCase for TypeScript, kebab-case for routes
- No conflicts detected with existing structure

### References

- [Source: _bmad-output/planning-artifacts/prd.md#FR41] Internal admin/ops users can audit changes to trust-sensitive recommendation logic and source curation.
- [Source: _bmad-output/planning-artifacts/prd.md#FR45] The product can preserve a clear boundary between user-facing recommendation experiences and internal trust-management activities.
- [Source: _bmad-output/planning-artifacts/prd.md#FR46] The product can maintain recommendation workflows that remain reviewable and controllable by internal operators.
- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.4] Full acceptance criteria and story definition.
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural-Decisions] Server-mediated security, split persistence model, role separation.
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Governance-Review-Patterns] Desktop dense review surfaces, audit history panel variant.
- [Source: _bmad-output/project-context.md] Technology stack (Nuxt 4, Vue 3, TypeScript, Convex, PostgreSQL/Drizzle, Better Auth).
- [Source: server/utils/auth/requireAdminSession.ts] Admin session guard utility.
- [Source: app/lib/admin/navigation.ts] Admin navigation links array.

## Dev Agent Record

### Agent Model Used

- GPT-5 Codex
- BMAD `dev-story` workflow execution
- Skills applied: `bmad-agent-bmm-dev`, `nuxt`, `vue`

### Implementation Plan

- Add a minimum audit-event contract and a reusable recorder utility for governed admin mutations.
- Wire audit logging into pathway, rule, evidence-source, and recommendation-review mutation routes.
- Build the admin audit-trail APIs and the approved Concept B audit inspector page with stable test hooks.
- Re-enable Story 5.4 API and E2E ATDD coverage, then validate the governed boundary and audit inspection flow end to end.

### Stitch Retrieval Log

- Stitch MCP resources were not exposed in this environment.
- Implemented the approved Concept B information architecture from the embedded story package and existing admin page patterns instead:
  - desktop master-detail audit inspector
  - mobile Events/Details tabs
  - summary strip + filter ribbon

### UI Implementation Mapping

- `app/pages/admin/audit-trail.client.vue`
  - New admin audit route with summary bar, filter ribbon, desktop master-detail view, and mobile tabbed inspector
- `app/lib/admin/auditTrail.ts`
  - Shared audit UI types, labels, formatting helpers, and stable test IDs
- `app/lib/admin/navigation.ts`
  - Added the `Audit trail` admin navigation link

### Debug Log References

- `pnpm exec playwright test tests/api/admin-audit-trail.red.atdd.spec.ts tests/e2e/admin-audit-trail.red.atdd.spec.ts --project=api --project=chromium`
- Targeted `nuxi typecheck` and `tsc --noEmit --project .nuxt/tsconfig.json` attempts still surfaced unrelated pre-existing repository issues, so Story 5.4 verification used the targeted Playwright gates as the reliable completion signal.

### Completion Notes List

- Implemented minimum governed audit persistence, list/detail/summary APIs, and the `/admin/audit-trail` admin page.
- Integrated audit capture into pathway, rule, evidence-source, and recommendation-review mutation endpoints.
- Replaced the runtime audit persistence path with a local SQL-backed store to keep governed admin flows verifiable without external Convex HTTP dependencies.
- Fixed Story 5.4 test harness issues:
  - race-safe admin auth bootstrap for parallel API workers
  - non-duplicated responsive audit `data-testid` hooks
  - skip-network-monitoring annotation for the expected non-admin `403 /api/admin/access` redirect path
- Validation passed: `10 passed (35.8s)` for the combined Story 5.4 API + E2E Playwright suite.

### File List

- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `.gitignore`
- `app/lib/admin/auditTrail.ts`
- `app/lib/admin/navigation.ts`
- `app/pages/admin/audit-trail.client.vue`
- `convex/auditLog.ts`
- `convex/schema.ts`
- `server/api/admin/audit-trail/[eventId].get.ts`
- `server/api/admin/audit-trail/index.get.ts`
- `server/api/admin/audit-trail/summary.get.ts`
- `server/api/admin/pathways/[pathwayId].patch.ts`
- `server/api/admin/pathways/[pathwayId]/rules/[ruleId].delete.ts`
- `server/api/admin/pathways/[pathwayId]/rules/[ruleId].patch.ts`
- `server/api/admin/pathways/[pathwayId]/rules.post.ts`
- `server/api/admin/pathways/[pathwayId]/rules.put.ts`
- `server/api/admin/pathways/[pathwayId]/status.patch.ts`
- `server/api/admin/pathways/index.post.ts`
- `server/api/admin/rag/sources/[sourceId].delete.ts`
- `server/api/admin/rag/sources/[sourceId].patch.ts`
- `server/api/admin/rag/sources/[sourceId]/approve.post.ts`
- `server/api/admin/rag/sources/[sourceId]/pause.post.ts`
- `server/api/admin/rag/sources/[sourceId]/reject.post.ts`
- `server/api/admin/rag/sources/[sourceId]/resume.post.ts`
- `server/api/admin/rag/sources/index.post.ts`
- `server/api/admin/recommendation-reviews/[runId]/dismiss.post.ts`
- `server/api/admin/recommendation-reviews/[runId]/flag.post.ts`
- `server/api/admin/recommendation-reviews/[runId]/resolve.post.ts`
- `server/utils/audit/auditLogStore.ts`
- `server/utils/audit/auditTrailService.ts`
- `server/utils/audit/recordGovernanceAction.ts`
- `server/utils/audit/types.ts`
- `tests/api/admin-audit-trail.red.atdd.spec.ts`
- `tests/e2e/admin-audit-trail.red.atdd.spec.ts`
- `tests/support/fixtures/factories/audit-trail-factory.ts`
- `tests/support/fixtures/test-data.ts`

### Change Log

- 2026-03-25: Implemented Story 5.4 end to end, switched the runtime audit persistence path to a local SQL store for reliable governed admin verification, re-enabled Story 5.4 API/E2E suites, and moved story + sprint status to `review`.
- 2026-03-26: Code review fixes — singleton DDL init promise (H1), load-more pagination in desktop+mobile event lists (H3), deduplicated helpers between auditLogStore/recordGovernanceAction (M2), added PATHWAY_RULE filter group (M3), added type sync comment (M1), Convex perf TODO (M4), and reconciled story File List with git (L3).
