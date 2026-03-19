# Story 5.2: Update Pathway Rules and Curate Evidence Sources

## Story Details

- **Epic:** Epic 5 — Internal Trust Governance and Pathway Operations
- **FRs Implemented:** FR37, FR38
- **Previous Story:** [5-1-manage-the-supported-mvp-pathway-inventory.md](file:///Users/wesleyukadike/Desktop/cadet2/_bmad-output/implementation-artifacts/5-1-manage-the-supported-mvp-pathway-inventory.md)
- **Status:** done

> As an internal admin or ops user,
> I want to update pathway logic and manage trusted evidence sources,
> So that recommendations remain relevant as policy conditions and source quality change.

---

## Acceptance Criteria

### AC1 — Authorized rule editing through controlled internal workflows

**Given** I am an authorized internal admin or ops user
**When** I edit pathway definitions, eligibility assumptions, or recommendation rules
**Then** the system stores the updated rule data through controlled internal workflows
**And** those updates remain constrained to authorized internal workflows with clear save confirmation

### AC2 — Evidence source lifecycle management

**Given** I manage trusted evidence sources
**When** I add, update, pause, or resume a source used for recommendation support
**Then** the source state is persisted through the internal admin workflow
**And** recommendation support can be limited to currently trusted sources

### AC3 — Trust boundary preservation

**Given** pathway rules or evidence sources change
**When** the changes are applied
**Then** the user-facing recommendation system continues to preserve the boundary between sourced evidence and recommendation logic
**And** the change does not require exposing internal governance mechanics to end users

### AC4 — Audit deferred to later stories

**Given** broader review history or audit inspection is required
**When** an internal user needs to inspect prior trust-sensitive changes
**Then** that detailed review responsibility remains owned by Stories 5.3 and 5.4 unless a minimal same-session review surface is explicitly introduced here

---

## Dev Notes

### Context & Purpose

This is the **second story in Epic 5**. It extends the pathway inventory persistence layer from Story 5.1 with **eligibility rule editing** and introduces a new **evidence sources curation** surface. Together, these give internal admin/ops users the ability to keep recommendations aligned with evolving policy conditions and evidence quality.

There are **two distinct capabilities** being delivered:
1. **Pathway Rules Editor** — An admin page for managing eligibility rules (the `MvpPathwayRule` logic) attached to each pathway definition created in Story 5.1
2. **Evidence Sources Curation** — An admin page for managing the trusted RAG evidence sources used to support recommendation outputs

### What Already Exists (Developer Guardrails)

> [!IMPORTANT]
> This is a brownfield implementation. The following infrastructure is already in place and MUST be reused.

**Admin Infrastructure (from Story 5.1 and earlier):**
- `app/middleware/admin.ts` — Route middleware that checks `/api/admin/access`, redirects unauthenticated users to `/auth` and unauthorized users to `/workspace`
- `server/utils/auth/requireAdminSession.ts` — Server-side admin session guard used by all existing admin API routes
- Existing admin pages at `app/pages/admin/` — `pathways.client.vue`, `rag-sources.client.vue`, `rag-phase0.client.vue`
- Existing admin page shell pattern: left sidebar navigation with links to Pathways, RAG Sources, etc.

**Pathway Infrastructure (from Story 5.1):**
- `server/db/schema/pathwayDefinitions.ts` — Drizzle schema for the `pathway_definitions` table (PostgreSQL)
- `server/utils/pathways/pathwayDefinitionService.ts` — CRUD service: `listPathwayDefinitions()`, `getPathwayDefinition()`, `createPathwayDefinition()`, `updatePathwayDefinition()`, `updatePathwayStatus()`
- `server/utils/pathways/pathwayDefinitionSchema.ts` — Zod schemas for pathway definition validation (`pathwayDefinitionRecordSchema`, `createPathwayDefinitionSchema`, `updatePathwayDefinitionSchema`, `updatePathwayStatusSchema`)
- `server/api/admin/pathways/` — Admin API endpoints for pathway CRUD (GET list, GET by ID, POST create, PATCH update, PATCH status)
- `app/components/admin/PathwayDefinitionTable.vue` — Existing pathway inventory table component
- `app/components/admin/PathwayStatusBadge.vue` — Status badge component (Active/Inactive/Draft)
- `app/lib/admin/pathwayDefinitions.ts` — Client-side composable for pathway definition data fetching

**Pathway Rule Infrastructure (currently hard-coded):**
- `server/utils/pathways/mvpPathwayCatalog.ts` — Contains `MvpPathwayRule` type (`{ unmetConditionId: string, isSatisfied: (profile) => boolean }`), `MvpPathwayDefinition`, `NormalizedPathwayProfile`, and the hard-coded `MVP_PATHWAY_CATALOG` with 3 pathway rule sets
- `server/utils/pathways/evaluateDirectAndBlockedPathways.ts` — Evaluates profile against pathway rules, accepts optional `pathwayCatalog` parameter
- Rule evaluation uses function-based predicates (`profile => profile.englishClb >= 8`) — these must be persisted as declarative data (JSON-based eligibility DSL)

**RAG/Evidence Source Infrastructure (already built):**
- `server/api/admin/rag/sources/` — Existing API routes for RAG sources (GET list, POST create, GET/PATCH/DELETE by sourceId, admin-status)
- `app/pages/admin/rag-sources.client.vue` — Existing RAG sources admin page (41KB, full-featured)
- `server/api/admin/rag/ingestion/` — Ingestion management endpoints
- `server/api/admin/rag/phase0-readiness.get.ts` — Phase 0 readiness check

### Architectural Constraints

1. **Server-mediated only** — All pathway rule and evidence source CRUD operations go through Nuxt server API routes. The browser never calls PostgreSQL or Convex directly.
2. **`requireAdminSession` on every endpoint** — All new admin endpoints MUST use the existing `requireAdminSession` guard.
3. **Admin middleware on the page** — All new admin pages MUST use `definePageMeta({ middleware: ['admin'] })`.
4. **Declarative eligibility DSL** — Pathway rules must be persisted as declarative JSON data, not function-based predicates. Use the JSON Eligibility DSL pattern from the architecture: `{ "field": "englishClb", "operator": ">=", "value": 8 }`. The evaluation engine must be able to reconstruct the `isSatisfied` predicate from this declarative representation at runtime.
5. **Backward compatibility** — The recommendation engine must continue working. The evaluation chain (`evaluateDirectAndBlockedPathways` → `evaluatePathwayEligibility`) must be updated to read rules from persisted storage while maintaining the same outcome semantics.
6. **Extend, don't replace** — The existing `rag-sources.client.vue` page handles RAG source management. This story either extends or replaces that page with the approved Concept C: Master-Detail Split design. Determine the best integration approach (new page vs. refactor of existing page) during implementation.
7. **TypeScript strict mode** — All new files must pass `strict: true`.
8. **Zod validation at API boundaries** — All request bodies must be validated with Zod schemas in server routes.
9. **No audit logging yet** — Per AC4, detailed audit logging is deferred to Stories 5.3/5.4. However, `updatedAt` timestamps should be maintained for basic change tracking.

### Persistence Decision

Per the architecture's split persistence model:
- Pathway rules are **system-of-record governance data** → use **PostgreSQL** via Drizzle ORM
- Evidence source metadata extends the existing RAG source tables already in PostgreSQL
- Create a new `pathway_rules` table linked to `pathway_definitions` via `pathway_id`

### Data Model

```sql
-- New table for pathway eligibility rules
CREATE TABLE pathway_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_id    VARCHAR(100) NOT NULL REFERENCES pathway_definitions(pathway_id) ON DELETE CASCADE,
  condition_id  VARCHAR(200) NOT NULL,        -- e.g., 'minimum-english-clb-8'
  description   VARCHAR(500),                 -- Human-readable description
  field_path    VARCHAR(200) NOT NULL,         -- e.g., 'englishClb'
  operator      VARCHAR(20) NOT NULL,          -- '>=', '<=', '==', '!=', 'boolean'
  threshold     TEXT NOT NULL,                 -- Stringified value (number or 'true'/'false')
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pathway_id, condition_id)
);
```

The existing `rag_sources` and related tables in the RAG system should be leveraged for evidence source persistence. Determine what additional fields (trust score, linked pathways, status lifecycle) are needed based on the existing schema.

### Key Implementation Tasks

- [x] **Task 1: Database migration** — Create the `pathway_rules` table migration. Seed with rules from the existing hard-coded `MVP_PATHWAY_CATALOG` (3 pathways × their rules), converting function-based predicates to declarative JSON DSL format.
- [x] **Task 2: Drizzle schema** — Add the `pathwayRules` table to the Drizzle schema file.
- [x] **Task 3: Pathway rules service** — Create `server/utils/pathways/pathwayRuleService.ts` with functions: `listRulesForPathway(pathwayId)`, `createRule(pathwayId, data)`, `updateRule(ruleId, data)`, `deleteRule(ruleId)`, `bulkSaveRules(pathwayId, rules[])`.
- [x] **Task 4: Pathway rules Zod schemas** — Create `server/utils/pathways/pathwayRuleSchema.ts` with request/response validation schemas for rule CRUD.
- [x] **Task 5: Rules API routes** — Create admin API endpoints:
  - `GET /api/admin/pathways/[pathwayId]/rules` — List all rules for a pathway
  - `POST /api/admin/pathways/[pathwayId]/rules` — Create a new rule
  - `PATCH /api/admin/pathways/[pathwayId]/rules/[ruleId]` — Update a rule
  - `DELETE /api/admin/pathways/[pathwayId]/rules/[ruleId]` — Delete a rule
  - `PUT /api/admin/pathways/[pathwayId]/rules` — Bulk save/replace all rules for a pathway
- [x] **Task 6: Eligibility DSL evaluator** — Create `server/utils/pathways/eligibilityDslEvaluator.ts` that converts declarative rule records into evaluation predicates compatible with the existing `evaluateDirectAndBlockedPathways` contract. Update `resolveRecommendationPathwayCatalog()` in `pathwayDefinitionService.ts` to build `MvpPathwayDefinition[]` from persisted rules.
- [x] **Task 7: Pathway Rules Editor page** — Create `app/pages/admin/pathway-rules.client.vue` with the approved Concept C: Accordion Form Editor layout (see Approved Design Package below). Include:
  - Accordion per pathway showing identity + rule builder
  - Structured form fields per rule (condition, operator, threshold, field path)
  - Add/remove rule buttons per pathway
  - Per-pathway "Save Changes" with confirmation dialog for active pathways
  - Expand All / Collapse All toggles
- [x] **Task 8: Evidence Sources Curation page** — Create `app/pages/admin/evidence-sources.client.vue` with the approved Concept C: Master-Detail Split View layout (see Approved Design Package below). Include:
  - Left panel: source list with search and filter
  - Right panel: selected source detail with metadata, trust info, linked pathways, actions
  - Add/Pause/Resume/Edit/Refresh/Remove operations
  - Confirmation dialog for pause/remove on active sources
- [x] **Task 9: Evidence source API extensions** — Evaluate whether the existing `server/api/admin/rag/sources/` endpoints are sufficient or need extension for trust score, linked pathways, and lifecycle status fields required by the design. Add any missing endpoints or extend existing ones.
- [x] **Task 10: Update evaluation pipeline** — Refactor `evaluateDirectAndBlockedPathways.ts` to use the eligibility DSL evaluator instead of the hard-coded catalog. Keep hard-coded catalog as a fallback during bootstrap/transition.
- [x] **Task 11: Update admin navigation** — Add "Pathway Rules" and "Evidence Sources" links to the admin sidebar navigation in existing admin pages.
- [x] **Task 12: Tests** — Write:
  - API tests for rule CRUD endpoints (including auth guard assertions)
  - API tests for evidence source lifecycle operations
  - Eligibility DSL evaluator unit tests (verify parity with existing hard-coded rules)
  - Component tests for the accordion form editor and master-detail split view
  - E2E tests for rule editing and evidence source management flows

### Out of Scope (Deferred to Later Stories)

- Trust review and corrective actions (Story 5.3)
- Audit logging of changes (Story 5.4)
- Rule versioning or history tracking
- Evidence source ingestion triggering (handled by existing RAG infrastructure)
- Bulk import/export of rules
- Visual rule dependency graphs
- Rule validation preview ("what would change for current users?")

### Naming Conventions

Per the architecture naming patterns:
- **Files:** `pathwayRuleService.ts`, `pathwayRuleSchema.ts`, `eligibilityDslEvaluator.ts`
- **API routes:** `/api/admin/pathways/[pathwayId]/rules`, `/api/admin/pathways/[pathwayId]/rules/[ruleId]`
- **Pages:** `app/pages/admin/pathway-rules.client.vue`, `app/pages/admin/evidence-sources.client.vue`
- **Components:** `PathwayRuleAccordion.vue`, `PathwayRuleFormRow.vue`, `EvidenceSourceList.vue`, `EvidenceSourceDetail.vue`
- **Test IDs:**
  - `data-testid="admin-pathway-rules-accordion"`, `data-testid="admin-rule-form-row"`, `data-testid="admin-rule-add-button"`, `data-testid="admin-rule-save-button"`
  - `data-testid="admin-evidence-source-list"`, `data-testid="admin-evidence-source-detail"`, `data-testid="admin-evidence-source-add-button"`, `data-testid="admin-evidence-source-pause-button"`

---

## UI/UX Context

### Frontend Impact

This story is **frontend-impacting**. It introduces two new admin surfaces:

**Surface 1: Pathway Rules Editor** (`/admin/pathway-rules`)
- A new admin-only page for editing eligibility rules per pathway definition
- Uses the Concept C: Accordion Form Editor layout
- Desktop: Full-width accordion stack with sidebar navigation. Each pathway is an expandable section with identity form + structured rule builder. Expand All/Collapse All toggles. Per-pathway save.
- Mobile: Same accordion pattern adapted for touch — one accordion expanded at a time, 44px touch targets, stacked form rows

**Surface 2: Evidence Sources Curation** (`/admin/evidence-sources`)
- A new admin-only page for managing trusted evidence sources
- Uses the Concept C: Master-Detail Split View layout
- Desktop: Split panel — 45% source list (searchable, filterable) on the left, 55% detail panel on the right showing metadata, trust score, linked pathways, history, and action buttons
- Mobile: Source list with tap-to-navigate to full-screen detail view with back navigation

### UX Governance Patterns (from UX Specification)

Per the approved UX design specification, governance review patterns apply:
- Desktop should use dense but structured review surfaces: sortable tables, filtered queues, contextual side panels, and scoped action bars
- Users should always know: what object they are reviewing, whether they are editing active behavior or reviewing historical state, and what operational impact their action will have
- Each corrective action should require clear scope framing, preserve return-to-context behavior, and show explicit confirmation after save
- Review tables, action menus, filters, and audit panels must remain keyboard reachable, screen-reader understandable, and text-explicit for risk, warning, and action states
- Trust-state labels must never rely on color alone

### Key UI Behaviors

**Pathway Rules Editor:**
1. **Accordion sections** — One per pathway, showing pathway name, status badge, rule count when collapsed
2. **Identity section** — Editable display name, description, and status (reuses existing pathway definition update API)
3. **Rule builder** — Structured form rows with: condition name (text input), operator (select: >=, <=, ==, boolean), threshold (text input), field path (text input)
4. **Add rule** — Dashed "Add Rule" button at bottom of rules section
5. **Delete rule** — Trash icon per rule row with confirmation
6. **Save confirmation** — Confirmation dialog when saving changes to active pathways (impacts live recommendations)
7. **Unsaved changes** — Visual indicator on accordion header when rules have been modified

**Evidence Sources Curation:**
1. **Source list** — Left panel with search + filter (All/Active/Paused/Stale), compact rows showing name, type badge, status badge, freshness
2. **Source detail** — Right panel for selected source: metadata, trust score bar, description, linked pathways, history
3. **Actions** — Edit Source, Pause/Resume, Trigger Refresh, Remove
4. **Confirmation** — Dialog for pause/remove actions showing impact preview
5. **Status badges** — Active (sage/green), Paused (amber), Stale (red) — always with text labels
6. **Empty state** — Guidance message when no sources match filter

### Accessibility Requirements

- WCAG 2.1 AA compliant
- Accordion headers must be keyboard accessible (Enter/Space to toggle)
- Form inputs must have associated labels and validation feedback
- Status badges must include text labels (not color only)
- Confirmation dialogs must trap focus
- Minimum 44x44px touch targets on mobile
- `data-testid` hooks on all key interactive elements
- Split panel must support keyboard navigation between list and detail

---

## Approved Design Package

### Surface 1: Pathway Rules Editor

**Approved Direction:** Concept C — Accordion Form Editor

**Stitch Project:** `6257021077077987630`

| Device | Screen ID | Title |
|--------|-----------|-------|
| Desktop | `4ca2e696c59648388671a115396d7bf8` | Pathway Rules Editor - Concept C (Accordion) |
| Mobile | `4fb37b1e5c74418eb47732c8b208c67d` | Mobile Pathway Rules Accordion Editor |

**Retrieval Instructions for Dev Agent:**
1. Use `mcp_stitch_get_screen` with `projectId: "6257021077077987630"` and `screenId: "4ca2e696c59648388671a115396d7bf8"` (desktop) or `"4fb37b1e5c74418eb47732c8b208c67d"` (mobile)
2. The response includes `htmlCode.downloadUrl` — download this to inspect the reference HTML structure, layout, spacing, and color usage
3. The `screenshot.downloadUrl` provides a visual reference image
4. Use the reference to guide component composition, spacing, color tokens, and layout structure — do NOT copy the HTML verbatim
5. Map the visual design onto the existing shadcn-nuxt / Reka UI primitives (Accordion, Input, Select, Button, Badge, Dialog)

**Design Translation Notes:**
- Desktop uses sidebar + main content accordion layout — reuse the existing admin page shell pattern from `pathways.client.vue`
- Each accordion section is self-contained: identity inputs + rule builder + save button
- Rule builder uses structured form rows (4 inputs per rule: condition, operator, threshold, field path)
- Mobile collapses to single-accordion-open mode with stacked form fields
- Status badges reuse existing `PathwayStatusBadge.vue` component
- "Add Rule" button uses dashed/outline variant

### Surface 2: Evidence Sources Curation

**Approved Direction:** Concept C — Master-Detail Split View

**Stitch Project:** `6257021077077987630`

| Device | Screen ID | Title |
|--------|-----------|-------|
| Desktop | `360cadf835f243d1aafec60907b897f7` | Evidence Sources - Master-Detail (Concept C) |
| Mobile (List) | `ea13bd3801334df9985c68ede76b12b1` | Evidence Sources List - Concept C (Mobile) |
| Mobile (Detail) | `d1756b0e248c451b92189e6c9a1326b8` | Evidence Source Details - Concept C (Mobile) |

**Retrieval Instructions for Dev Agent:**
1. Use `mcp_stitch_get_screen` with `projectId: "6257021077077987630"` and `screenId: "360cadf835f243d1aafec60907b897f7"` (desktop), `"ea13bd3801334df9985c68ede76b12b1"` (mobile list), or `"d1756b0e248c451b92189e6c9a1326b8"` (mobile detail)
2. Download `htmlCode.downloadUrl` to inspect the reference HTML structure
3. Use the reference to guide component composition — do NOT copy verbatim
4. Map onto existing shadcn-nuxt / Reka UI primitives (Input, Badge, Button, Card, Dialog, Progress)

**Design Translation Notes:**
- Desktop uses a 45/55 split panel layout within the admin shell
- Left panel is a scrollable list with search + filter controls at top
- Right panel shows detailed metadata, trust score (as progress bar), linked pathway pills, and stacked action buttons
- Mobile uses separate list and detail views with navigation between them (vue-router or component toggle)
- Status colors: sage/green active, amber paused, red stale — always paired with text labels
- Consider whether to refactor the existing `rag-sources.client.vue` or create a parallel page — existing page is 41KB and handles RAG-specific concerns that may not fully overlap with this design

## Dev Agent Record

### Stitch Retrieval Log

- Retrieved Stitch project `6257021077077987630` and validated the approved Story 5.2 surfaces before implementation.
- Pathway Rules desktop reference: `4ca2e696c59648388671a115396d7bf8` and mobile reference: `4fb37b1e5c74418eb47732c8b208c67d`.
- Evidence Sources desktop reference: `360cadf835f243d1aafec60907b897f7`, mobile list: `ea13bd3801334df9985c68ede76b12b1`, mobile detail: `d1756b0e248c451b92189e6c9a1326b8`.
- Retrieved `get_screen` and `fetch_screen_code` outputs for the approved desktop/mobile pairings and used them as layout, spacing, and hierarchy references. `fetch_screen_image` failed with an `EROFS` write-path issue, so visual confirmation relied on screen metadata plus fetched code structure.

### UI Implementation Mapping

- `app/pages/admin/pathway-rules.client.vue` maps the approved accordion editor into the existing Trust Operations shell, with one persisted rule editor per pathway, dirty-state indicators, expand/collapse controls, and active-pathway save confirmation.
- `app/components/admin/PathwayRuleAccordion.vue` and `app/components/admin/PathwayRuleFormRow.vue` translate the Stitch accordion/content rhythm into reusable Vue components backed by the persisted DSL rule contract.
- `app/pages/admin/evidence-sources.client.vue` implements the approved master-detail split layout: searchable/filterable source list on the left, selected source detail/editor on the right, and mobile back-navigation behavior when detail mode is active.
- `app/components/admin/EvidenceSourceList.vue` and `app/components/admin/EvidenceSourceDetail.vue` map the approved list/detail surfaces into reusable components with trust-score display, lifecycle badges, linked-pathway chips, and governed actions.

### Implementation Notes

- Added PostgreSQL persistence for pathway rules with deterministic seed data mirroring the prior hard-coded pathway catalog and a runtime fallback if the new table is unavailable.
- Added a declarative eligibility DSL evaluator and updated recommendation pathway catalog resolution so active recommendation pathways now compile from persisted rules first and fall back to the legacy catalog during bootstrap/transition.
- Extended Convex/Nuxt evidence-source handling with description, trust score, linked pathway IDs, source detail retrieval, source updates, and source removal while keeping the existing pause/resume and manual ingestion flows intact.
- Added shared admin navigation, client-side governance types, and Story 5.2 admin pages/components without removing the existing inventory or RAG pages.
- During live validation against the running app on `:3000`, started the local Convex deployment on `:3210`, fixed evidence-source timestamp normalization for Convex `_creationTime` values, and stabilized the Chromium governance ATDD by serializing the browser suite and asserting rule-row growth instead of an ambiguous repeated text match.

### Completion Notes

- Implemented Story 5.2 end-to-end across persistence, API, evaluation, admin UI, and test assets.
- `pnpm exec vitest run tests/unit/eligibilityDslEvaluator.spec.ts tests/components/admin/PathwayRuleAccordion.spec.ts tests/components/admin/EvidenceSourceList.spec.ts` passed.
- `CI=1 BASE_URL=http://127.0.0.1:3000 TEST_ADMIN_EMAIL=codex-admin-story52@example.com pnpm exec playwright test tests/api/admin-pathway-governance.atdd.spec.ts --project=api` passed after local Convex was restored.
- `CI=1 BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/admin-governance.atdd.spec.ts --project=chromium` passed against the already running app on `:3000`.
- `pnpm exec nuxi typecheck` now reports broader repo type issues outside the targeted governance validation path, including pre-existing failures in shared UI, recommendation, and Convex integration files.

### Senior Developer Review (AI)

- 2026-03-19 review findings were addressed by adding the missing per-rule CRUD service methods and admin routes, tightening `pathway_rules` integrity constraints, restricting boolean rule operators at both the schema and UI layers, and restoring shared admin navigation on the remaining legacy admin pages.
- Expanded automated coverage to include rule CRUD + auth assertions in the governance API ATDD, a dedicated `EvidenceSourceDetail` component spec, and UI-flow assertions for pathway-rule save confirmation and evidence-source pause confirmation.
- `pnpm exec vitest run tests/unit/eligibilityDslEvaluator.spec.ts tests/components/admin/PathwayRuleAccordion.spec.ts tests/components/admin/EvidenceSourceList.spec.ts tests/components/admin/EvidenceSourceDetail.spec.ts` passed.
- `CI=1 BASE_URL=http://localhost:3001 pnpm exec playwright test tests/api/admin-pathway-governance.atdd.spec.ts --project=api` passed against a clean local Nuxt process.
- `CI=1 BASE_URL=http://localhost:3001 pnpm exec playwright test tests/e2e/admin-governance.atdd.spec.ts --project=chromium` passed against the same clean local Nuxt process.
- The previously running app on `:3000` still returns Better Auth `500` responses for email sign-in/sign-up, but the clean `:3001` process confirms this is a stale local runtime issue rather than a remaining Story 5.2 code defect.

## File List

- `_bmad-output/implementation-artifacts/5-2-update-pathway-rules-and-curate-evidence-sources.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `app/components/admin/EvidenceSourceDetail.vue`
- `app/components/admin/EvidenceSourceList.vue`
- `app/components/admin/PathwayRuleAccordion.vue`
- `app/components/admin/PathwayRuleFormRow.vue`
- `app/lib/admin/evidenceSources.ts`
- `app/lib/admin/navigation.ts`
- `app/lib/admin/pathwayRules.ts`
- `app/pages/admin/evidence-sources.client.vue`
- `app/pages/admin/pathway-rules.client.vue`
- `app/pages/admin/pathways.client.vue`
- `app/pages/admin/rag-phase0.client.vue`
- `app/pages/admin/rag-sources.client.vue`
- `convex/ragSources.ts`
- `convex/ragSourcesInternal.ts`
- `convex/schema.ts`
- `server/api/admin/pathways/[pathwayId]/rules.get.ts`
- `server/api/admin/pathways/[pathwayId]/rules.post.ts`
- `server/api/admin/pathways/[pathwayId]/rules.put.ts`
- `server/api/admin/pathways/[pathwayId]/rules/[ruleId].delete.ts`
- `server/api/admin/pathways/[pathwayId]/rules/[ruleId].patch.ts`
- `server/api/admin/rag/sources/[sourceId].delete.ts`
- `server/api/admin/rag/sources/[sourceId].get.ts`
- `server/api/admin/rag/sources/[sourceId].patch.ts`
- `server/api/admin/rag/sources/[sourceId]/approve.post.ts`
- `server/api/admin/rag/sources/[sourceId]/pause.post.ts`
- `server/api/admin/rag/sources/[sourceId]/reject.post.ts`
- `server/api/admin/rag/sources/[sourceId]/resume.post.ts`
- `server/api/admin/rag/sources/index.get.ts`
- `server/api/admin/rag/sources/index.post.ts`
- `server/db/migrations/postgresql/0005_pathway_rules.sql`
- `server/db/schema/pathwayRules.ts`
- `server/utils/admin/evidenceSourceSchema.ts`
- `server/utils/pathways/eligibilityDslEvaluator.ts`
- `server/utils/pathways/pathwayDefinitionService.ts`
- `server/utils/pathways/pathwayRuleSchema.ts`
- `server/utils/pathways/pathwayRuleService.ts`
- `tests/api/admin-pathway-governance.atdd.spec.ts`
- `tests/components/admin/EvidenceSourceDetail.spec.ts`
- `tests/components/admin/EvidenceSourceList.spec.ts`
- `tests/components/admin/PathwayRuleAccordion.spec.ts`
- `tests/e2e/admin-governance.atdd.spec.ts`
- `tests/unit/eligibilityDslEvaluator.spec.ts`

## Change Log

- 2026-03-19: Implemented Story 5.2 pathway-rule persistence, eligibility DSL evaluation, curated evidence-source admin surfaces, and initial automated coverage.
- 2026-03-19: Addressed code review findings by adding per-rule CRUD, integrity constraints, stricter rule/action validation, legacy admin navigation links, and missing automated coverage; verified on a clean local Nuxt process with passing Vitest and Playwright governance suites.
