# Story 5.1: Manage the Supported MVP Pathway Inventory

## Story Details

- **Epic:** Epic 5 — Internal Trust Governance and Pathway Operations
- **FRs Implemented:** FR36, FR47, FR48
- **Previous Story:** [4-4-support-ongoing-reuse-of-the-planning-workspace.md](file:///Users/wesleyukadike/Desktop/cadet2/_bmad-output/implementation-artifacts/4-4-support-ongoing-reuse-of-the-planning-workspace.md)
- **Status:** done

> As an internal admin or ops user,
> I want to manage the active set of supported pathways,
> So that the recommendation engine stays aligned with the current MVP scope and future expansion can be controlled deliberately.

---

## Acceptance Criteria

### AC1 — Admin-only access to the pathway management interface

**Given** I am an authorized internal admin or ops user
**When** I access the pathway management interface
**Then** I can view the current set of supported pathways used by recommendations
**And** standard end users cannot access this interface

### AC2 — Controlled pathway status changes

**Given** I add, disable, or update the active status of a pathway definition
**When** the change is saved
**Then** the supported pathway inventory is updated in a controlled way
**And** the change affects only the scoped pathway set intended for recommendation use

### AC3 — Minimum pathway fields only

**Given** supported-pathway inventory storage is first introduced in this epic
**When** this story is implemented
**Then** it creates only the minimum pathway fields needed for active scope control, display identity, and status management
**And** deeper rule logic, evidence linkage, and audit detail remain owned by the later stories that first require them

### AC4 — Unsupported pathways excluded from recommendations

**Given** a pathway is outside the currently supported MVP scope
**When** the recommendation system evaluates user profiles
**Then** that pathway can be excluded from active recommendation output
**And** the product does not imply that the unsupported pathway is fully covered

---

## Dev Notes

### Context & Purpose

This is the **first story in Epic 5** — the first admin/ops epic. It introduces the pathway inventory management surface, replacing the current hard-coded `mvpPathwayCatalog.ts` approach with a managed, persisted pathway inventory that authorized admin users can view and control.

The goal is NOT to build a full pathway definition editor. This story creates:
1. A new admin page for viewing/managing the pathway inventory
2. The minimum persistence layer for pathway status and identity
3. Server-protected API endpoints for CRUD operations on pathway definitions
4. Integration with the existing admin middleware and `requireAdminSession` pattern

### What Already Exists (Developer Guardrails)

> [!IMPORTANT]
> This is a brownfield implementation. The following infrastructure is already in place and MUST be reused.

**Admin Infrastructure:**
- `app/middleware/admin.ts` — Route middleware that checks `/api/admin/access`, redirects unauthenticated users to `/auth` and unauthorized users to `/workspace`
- `server/utils/auth/requireAdminSession.ts` — Server-side admin session guard used by all existing admin API routes
- `server/api/admin/access.get.ts` — Admin access check endpoint
- Existing admin pages at `app/pages/admin/` (currently `rag-phase0.client.vue` and `rag-sources.client.vue`)

**Pathway Infrastructure:**
- `server/utils/pathways/mvpPathwayCatalog.ts` — Hard-coded catalog with 3 MVP pathways (`mvp-skilled-worker`, `mvp-provincial-nominee`, `mvp-study-to-work`), types `MvpPathwayId`, `NormalizedPathwayProfile`, `MvpPathwayRule`, `MvpPathwayDefinition`
- `server/utils/pathways/evaluateDirectAndBlockedPathways.ts` — Uses the hard-coded catalog for pathway evaluation
- `server/utils/pathways/generateComposedPathways.ts` — Uses catalog for composed pathway generation
- `server/utils/recommendations/evaluatePathwayEligibility.ts` — Evaluates eligibility against the catalog
- `convex/schema.ts` — Has `pathwayId: v.string()` fields in `pathwayDirectOutcomeValidator`, `pathwayBlockedOutcomeValidator`, and recommendation run tables, but NO `pathway_definitions` table yet

**Existing Admin API Pattern:**
All admin endpoints follow the same pattern:
```typescript
import { requireAdminSession } from '../../utils/auth/requireAdminSession'
export default defineEventHandler(async (event) => {
  const { session } = await requireAdminSession(event)
  // ... handler logic
})
```

### Architectural Constraints

1. **Server-mediated only** — All pathway CRUD operations go through Nuxt server API routes (`server/api/admin/pathways/`). The browser never calls Convex or PostgreSQL directly.
2. **`requireAdminSession` on every endpoint** — All new admin endpoints MUST use the existing `requireAdminSession` guard.
3. **Admin middleware on the page** — The new page MUST use `definePageMeta({ middleware: ['admin'] })` to match existing admin pages.
4. **Minimum fields only** — Per AC3, this story introduces ONLY: `pathwayId`, `displayName`, `description` (optional), `status` (active/inactive/draft), `createdAt`, `updatedAt`. Rule logic, evidence linkage, and audit detail are out of scope (Stories 5.2–5.4).
5. **Seed from existing catalog** — The 3 existing MVP pathways in `mvpPathwayCatalog.ts` should be seeded as initial pathway definitions with `status: 'active'`.
6. **Backward compatibility** — The recommendation engine must continue working. The evaluation utilities should be updated to read from the persisted inventory rather than the hard-coded catalog, filtering to only `active` pathways.
7. **TypeScript strict mode** — All new files must pass `strict: true`.
8. **Zod validation at API boundaries** — Request bodies must be validated with Zod schemas in server routes.

### Persistence Decision

Per the architecture's split persistence model:
- Pathway definitions are **system-of-record governance data** → use **PostgreSQL** (not Convex) via the existing Drizzle ORM setup
- This aligns with the architecture: "PostgreSQL for auth and durable system-of-record data"
- Create a new `pathway_definitions` table with the minimum fields

### Data Model

```sql
CREATE TABLE pathway_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pathway_id    VARCHAR(100) NOT NULL UNIQUE,  -- e.g., 'mvp-skilled-worker'
  display_name  VARCHAR(255) NOT NULL,
  description   TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'active' | 'inactive' | 'draft'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Key Implementation Tasks

- [x] **Task 1: Database migration** — Create the `pathway_definitions` table migration. Seed with the 3 existing MVP pathways as `active`.
- [x] **Task 2: Drizzle schema** — Add the `pathwayDefinitions` table to the Drizzle schema file.
- [x] **Task 3: Server utilities** — Create `server/utils/pathways/pathwayDefinitionService.ts` with functions: `listPathwayDefinitions()`, `getPathwayDefinition(id)`, `createPathwayDefinition(data)`, `updatePathwayDefinition(id, data)`, `updatePathwayStatus(id, status)`.
- [x] **Task 4: Zod schemas** — Create `server/utils/pathways/pathwayDefinitionSchema.ts` with request/response validation schemas.
- [x] **Task 5: API routes** — Create admin API endpoints:
  - `GET /api/admin/pathways` — List all pathway definitions (filterable by status)
  - `GET /api/admin/pathways/[pathwayId]` — Get single pathway definition
  - `POST /api/admin/pathways` — Create new pathway definition
  - `PATCH /api/admin/pathways/[pathwayId]` — Update pathway definition
  - `PATCH /api/admin/pathways/[pathwayId]/status` — Update pathway status specifically
- [x] **Task 6: Admin page** — Create `app/pages/admin/pathways.client.vue` with the approved Classic Inventory Table layout (see Approved Design Package below).
- [x] **Task 7: Update evaluation utilities** — Refactor `evaluateDirectAndBlockedPathways.ts` and `evaluatePathwayEligibility.ts` to read active pathways from the database instead of the hard-coded `mvpPathwayCatalog.ts`. Keep catalog as fallback during transition.
- [x] **Task 8: Tests** — Write API tests for all CRUD endpoints (including auth guard assertions), and component tests for the admin pathway table.

### Out of Scope (Deferred to Later Stories)

- Rule editing UI (Story 5.2)
- Evidence source management (Story 5.2)
- Trust review and corrective actions (Story 5.3)
- Audit logging of changes (Story 5.4)
- Drag-and-drop reordering
- Pathway import/export
- Bulk operations

### Naming Conventions

Per the architecture naming patterns:
- **Files:** `pathwayDefinitionService.ts`, `pathwayDefinitionSchema.ts`
- **API routes:** `/api/admin/pathways/`, `/api/admin/pathways/[pathwayId]`
- **Page:** `app/pages/admin/pathways.client.vue`
- **Components:** `PathwayDefinitionTable.vue`, `PathwayStatusBadge.vue`
- **Test IDs:** `data-testid="admin-pathway-table"`, `data-testid="admin-pathway-row"`, `data-testid="admin-pathway-add-button"`, `data-testid="admin-pathway-status-badge"`

## Dev Agent Record

### Implementation Plan

- Add PostgreSQL-backed `pathway_definitions` inventory storage and seed the existing MVP pathway set.
- Expose admin-only inventory CRUD/status routes behind `requireAdminSession(..., { allowBootstrapFromAllowlist: true })`.
- Deliver the `/admin/pathways` inventory UI with desktop table and mobile card layouts from the approved design package.
- Route recommendation evaluation through active persisted pathways while keeping the seeded catalog as bootstrap/fallback data.
- Add local test-mode fallback storage for recommendation ATDDs when the local Convex admin endpoint is unavailable.

### Debug Log

- Fixed `GET /api/admin/pathways` SQL generation after `sql.empty` was emitted as a bound parameter and caused `syntax error at or near "$1"`.
- Confirmed local Convex admin HTTP calls failed with `ECONNREFUSED 127.0.0.1:3210`; added best-effort sync and in-process fallback storage for recommendation test endpoints so AC4 ATDD coverage stays runnable locally.
- Changed `PathwayDefinitionTable.vue` default ordering to preserve API inventory order until a user explicitly applies sorting; this fixed the mobile inventory card regression.

### Completion Notes

- Implemented AC1-AC4 across PostgreSQL inventory persistence, admin APIs, admin UI, and recommendation filtering.
- Added admin API ATDD coverage, Chromium E2E coverage, and component coverage for pathway inventory interactions.
- Fixed code review regressions around blank-description normalization, historical recommendation preservation after later inventory changes, and fallback seed reset cleanup.
- Validation passed:
  - `pnpm exec vitest run`
  - `pnpm exec playwright test --project=api tests/api/admin-pathway-management.atdd.spec.ts`
  - `pnpm exec playwright test --project=chromium tests/e2e/admin-pathway-inventory.atdd.spec.ts`
  - `pnpm exec vitest run tests/components/admin/PathwayDefinitionTable.spec.ts`
- Broader repo regression note:
  - `pnpm test:all` exposes unrelated existing Chromium failures in `tests/e2e/workspace-auth.spec.ts`, `tests/e2e/intake-submit.atdd.spec.ts`, `tests/e2e/intake-constraints-context.atdd.spec.ts`, and `tests/e2e/workspace-recommendation-citations.atdd.spec.ts` because `/api/workspace/summary` and `/api/workspace/recommendation-runs` return HTTP 500 outside Story 5.1 flows.

### File List

| Action | Path |
|--------|------|
| NEW | `app/components/admin/PathwayDefinitionTable.vue` |
| NEW | `app/components/admin/PathwayStatusBadge.vue` |
| NEW | `app/lib/admin/pathwayDefinitions.ts` |
| NEW | `app/pages/admin/pathways.client.vue` |
| NEW | `server/api/admin/pathways/index.get.ts` |
| NEW | `server/api/admin/pathways/index.post.ts` |
| NEW | `server/api/admin/pathways/[pathwayId].get.ts` |
| NEW | `server/api/admin/pathways/[pathwayId].patch.ts` |
| NEW | `server/api/admin/pathways/[pathwayId]/status.patch.ts` |
| MODIFY | `server/api/admin/rag/convex-admin/sync-current-user.post.ts` |
| MODIFY | `server/api/recommendations/runs/[runId]/pathways.get.ts` |
| MODIFY | `server/api/recommendations/runs/[runId]/start.post.ts` |
| MODIFY | `server/api/recommendations/testing/reset.post.ts` |
| MODIFY | `server/api/recommendations/testing/seed.post.ts` |
| NEW | `server/db/migrations/postgresql/0004_pathway_definitions.sql` |
| NEW | `server/db/schema/pathwayDefinitions.ts` |
| MODIFY | `server/utils/pathways/evaluateDirectAndBlockedPathways.ts` |
| MODIFY | `server/utils/pathways/mvpPathwayCatalog.ts` |
| NEW | `server/utils/pathways/pathwayDefinitionSchema.ts` |
| NEW | `server/utils/pathways/pathwayDefinitionService.ts` |
| MODIFY | `server/utils/recommendations/evaluatePathwayEligibility.ts` |
| MODIFY | `server/utils/recommendations/readRecommendationResultsForUser.ts` |
| NEW | `server/utils/recommendations/testRecommendationRunFallback.ts` |
| NEW | `tests/api/admin-pathway-management.atdd.spec.ts` |
| NEW | `tests/components/admin/PathwayDefinitionTable.spec.ts` |
| NEW | `tests/e2e/admin-pathway-inventory.atdd.spec.ts` |
| NEW | `tests/support/fixtures/factories/pathway-inventory-factory.ts` |
| MODIFY | `tests/support/fixtures/test-data.ts` |

## Change Log

- 2026-03-18: Implemented Story 5.1 admin pathway inventory persistence, admin management UI, recommendation inventory filtering, and Story 5.1 API/E2E/component coverage. Marked ready for review after targeted validations passed.
- 2026-03-18: Fixed code review findings for Story 5.1, revalidated the admin pathway API/component slices, and marked the story done.

## Senior Developer Review (AI)

- Reviewer: Amelia
- Date: 2026-03-18
- Outcome: Approve
- Findings fixed:
  - Normalized blank pathway descriptions to `null` so create/update responses no longer fail schema validation.
  - Preserved stored pathway evaluations for historical runs after later inventory disables.
  - Cleared fallback seeded recommendation runs during `resetExisting` to keep local test-mode state deterministic.
- Validation:
  - `pnpm exec vitest run tests/components/admin/PathwayDefinitionTable.spec.ts`
  - `pnpm exec playwright test --project=api tests/api/admin-pathway-management.atdd.spec.ts`

---

## UI/UX Context

### Frontend Impact

This story is **frontend-impacting**. It introduces one new admin surface:

**Surface: Admin Pathway Inventory Page** (`/admin/pathways`)
- A new admin-only page accessible through the admin middleware
- Uses the Classic Inventory Table layout (Concept A)
- Desktop: Full-width table with sidebar navigation, search/filter toolbar, sortable columns
- Mobile: Stacked pathway cards with search, filter pills, and floating add button

### UX Governance Patterns (from UX Specification)

Per the approved UX design specification, governance review patterns apply:
- Desktop should use dense but structured review surfaces: sortable tables, filtered queues, contextual side panels, and scoped action bars
- Users should always know: what object they are reviewing, whether they are editing active behavior or reviewing historical state, and what operational impact their action will have
- Governance screens should separate: inventory management, evidence review, recommendation review, and audit history
- Each corrective action should require clear scope framing, preserve return-to-context behavior, and show explicit confirmation after save
- Review tables, action menus, filters, and audit panels must remain keyboard reachable, screen-reader understandable, and text-explicit for risk, warning, and action states
- Trust-state labels must never rely on color alone

### Key UI Behaviors

1. **Status badges** — Active (green/sage), Inactive (amber/sand), Draft (grey). Always use text labels alongside color.
2. **Add Pathway** — Button opens a form (inline or modal) for creating a new pathway definition with minimum fields.
3. **Status toggle** — Must show confirmation before changing status of an active pathway (it affects live recommendations).
4. **Search** — Client-side filtering by pathway name and ID.
5. **Filter** — Dropdown for status filter (All / Active / Inactive / Draft).
6. **Actions** — Per-row actions: Edit, Disable/Enable, Archive (or set to Draft).
7. **Empty state** — "No pathways match your filters" with clear guidance.
8. **Loading** — Skeleton table rows while data loads.

### Accessibility Requirements

- WCAG 2.1 AA compliant
- Sortable table headers must be keyboard accessible
- Status badges must include text labels (not color only)
- All form inputs must have associated labels
- Confirmation dialogs must trap focus
- Minimum 44x44px touch targets for actions on mobile
- `data-testid` hooks on all key interactive elements

---

## Approved Design Package

### Surface: Admin Pathway Inventory Page

**Approved Direction:** Concept A — Classic Inventory Table

**Stitch Project:** `6257021077077987630`

| Device | Screen ID | Title |
|--------|-----------|-------|
| Desktop | `1338b59f691845dea895a7207a702da1` | Admin Pathway Inventory Management - Classic Table |
| Mobile | `1446859ded344ed0b35eab6570228701` | Pathway Inventory Mobile (Classic) |

**Retrieval Instructions for Dev Agent:**
1. Use `mcp_stitch_get_screen` with `projectId: "6257021077077987630"` and `screenId: "1338b59f691845dea895a7207a702da1"` (desktop) or `"1446859ded344ed0b35eab6570228701"` (mobile)
2. The response includes `htmlCode.downloadUrl` — download this to inspect the reference HTML structure, layout, spacing, and color usage
3. The `screenshot.downloadUrl` provides a visual reference image
4. Use the reference to guide component composition, spacing, color tokens, and layout structure — do NOT copy the HTML verbatim
5. Map the visual design onto the existing shadcn-nuxt / Reka UI primitives (Table, Badge, Button, Input, DropdownMenu, Card, Dialog)

**Design Translation Notes:**
- Desktop uses a sidebar + main content table layout — reuse the existing admin page shell pattern from `rag-sources.client.vue`
- Mobile collapses the table into stacked cards — use responsive composition, not just CSS width changes
- Status badges should use the project's existing `Badge` component with semantic color variants
- The toolbar (search + filter + add button) maps to a standard flex row with responsive wrapping
- Table sorting behavior should use client-side sorting on the loaded dataset (MVP scope is small)
