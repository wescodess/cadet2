# Story 5.1: Manage the Supported MVP Pathway Inventory

## 1. Story Details

- **Epic:** Epic 5: Internal Trust Governance and Pathway Operations
- **Story Identifier:** 5-1-manage-the-supported-mvp-pathway-inventory
- **Primary Objective:** Enable authorized internal admin/ops users to manage the active set of supported pathways, creating the foundation for a dynamic pathway inventory instead of hard-coded MVP catalog files.
- **FRs Implemented:** FR36 (manage inventory), FR47 (support MVP-limited inventory with expansion), FR48 (prevent unsupported pathways from appearing covered)

## 2. Context & Rationale

**Why is this story important?**
Currently, the cadet2 application relies on a hard-coded `mvpPathwayCatalog.ts` file to define the 3 supported pathways. To scale the platform and support ongoing policy changes, internal operators need a governance surface to add, disable, or update pathway statuses dynamically. This story builds the fundamental persistence layer (Convex `pathway_definitions` table) and the first operational UI surface (`/admin/pathways`) to support this.

**How does it fit into the Epic?**
Epic 5 shifts focus from end-user recommendation features to internal trust governance. Story 5.1 is the foundational first step, establishing the admin UI patterns, the pathway data model, and the server-side logic to replace the hard-coded catalog. Subsequent stories will add complex rule editing and evidence curation.

**Key Technical/Architectural drivers:**
- **Admin/Ops Boundary:** Strict separation of end-user and admin capabilities. All new UI must be protected by the existing `requireAdminSession` middleware and `/api/admin/*` server routes.
- **Data Model:** We must create a new `pathway_definitions` table in Convex. The schema should be minimal initially (id, name, status, created/updated timestamps) leaving deep rule logic to Story 5.2 to avoid scope creep.
- **Component Re-use:** Use existing shadcn-nuxt/Reka UI primitives (tables, badges, inputs, buttons) for the admin table.

## 3. Acceptance Criteria

*   [ ] **Given** I am an authorized internal admin or ops user, **When** I access the pathway management interface (`/admin/pathways`), **Then** I can view the current set of supported pathways used by recommendations, **And** standard end users cannot access this interface.
*   [ ] **Given** I add, disable, or update the active status of a pathway definition, **When** the change is saved, **Then** the supported pathway inventory is updated in a controlled way, **And** the change affects only the scoped pathway set intended for recommendation use.
*   [ ] **Given** supported-pathway inventory storage is first introduced in this epic, **When** this story is implemented, **Then** it creates only the minimum pathway fields needed for active scope control, display identity, and status management, **And** deeper rule logic, evidence linkage, and audit detail remain owned by the later stories that first require them.
*   [ ] **Given** a pathway is outside the currently supported MVP scope, **When** the recommendation system evaluates user profiles, **Then** that pathway can be excluded from active recommendation output, **And** the product does not imply that the unsupported pathway is fully covered.

*(Optional but Recommended for ATDD)*
*   [ ] **Given** the system currently uses `mvpPathwayCatalog.ts`, **When** the new inventory is implemented, **Then** the system either migrates the hard-coded data into the Convex table or provides an admin utility to seed it, so existing recommendation features don't break.

## 4. UI/UX Context & Design Package

**Frontend Impacting:** Yes
**Impacted Surfaces:** `admin-pathway-management` (New: `/admin/pathways`)

**Approved Design Direction: Concept A (Classic Inventory Table)**
This direction provides a dense, sortable data table with a search/filter toolbar, designed specifically for operational admins. It uses formal trust colors (Trust Navy, Supportive Sage) and standard layout primitives over consumer-grade cards.

### Stitch Artifact Registry
- **Approved Stitch Project:** `6257021077077987630`
- **Theme:** `colorMode="LIGHT", font="PUBLIC_SANS", customColor="#1B365D", roundness="ROUND_EIGHT"`

### Approved Conceptual Package
- **Desktop Reference:** `1338b59f691845dea895a7207a702da1` (Dense table, sidebar, toolbar)
- **Mobile Reference:** `1446859ded344ed0b35eab6570228701` (Stacked pathway cards, floating action button)

**Implementation Notes:**
- Re-use the existing admin structure (e.g., `rag-sources.client.vue` layouts) to frame the new table.
- Build a generic `PathwayDefinitionTable.vue` component to match the Concept A desktop design, using shadcn-nuxt tables.
- Build a mobile-responsive stacked view for the same data, matching the Concept A mobile design.
- Ensure the "Status" column uses semantic badges (Active = Supportive Sage `#4A7C59`, Inactive = Measured Sand `#C4A35A`).

## 5. Architectural & Implementation Constraints

(Loaded from `architecture.md` and `project-context.md`)

*   **Security Boundary:** The new `/admin/pathways` route *must* use `definePageMeta({ middleware: ['admin'] })`. Server routes must reside in `server/api/admin/pathways/` and validate using `requireAdminSession`.
*   **Convex Schema Update:** Modify `convex/schema.ts` to add a new `pathway_definitions` table. Use strict `v.object()` schemas. Remember table names are `snake_case`.
*   **Minimal Schema:** The new table should contain `name` (string), `id_slug` (string, e.g. 'mvp-skilled-worker'), `status` (string: 'ACTIVE' | 'INACTIVE' | 'DRAFT'), and timestamps. Defer rule definitions to the next story.
*   **Transition from Hard-Coded:** The evaluator (`evaluatePathwayEligibility.ts` / `generateComposedPathways.ts`) currently imports `MVP_PATHWAY_CATALOG`. You will need to introduce a minimal migration step: either adapt these to fetch from Convex, OR fetch from Convex on intake submission and pass down. (Consult architecture on `server-mediated integrations`). If this breaks too many tests, you may implement the *management* of the catalog first, and integrate the runtime consumption separately, but the ACs suggest exclusion must be supported now. **Recommendation:** Read the new Convex catalog first; if empty or failing gracefully, fallback to the hard-coded list during migration.
*   **Test Patterns:** All new server APIs and Convex mutations must have corresponding integration tests in `tests/integration/` or `tests/api/`. Use the existing factories (e.g. `tests/support/fixtures/`) if needed, or create a new `pathway-definition-factory.ts`.

## 6. Development Checklist (Suggested Steps)

1.  **Convex Schema:** Add `pathway_definitions` to `convex/schema.ts`.
2.  **Convex Queries/Mutations:** Create `convex/pathways.ts` with `list()`, `add()`, `updateStatus()` functions.
3.  **Server APIs:** Create proxy routes in `server/api/admin/pathways/` (GET, POST, PATCH) that authenticate admins and call Convex.
4.  **Admin UI (Desktop/Mobile):** Implement `/admin/pathways` using Concept A. Build the `PathwayDefinitionTable` (desktop) and stacked card view (mobile).
5.  **Integration (Migration):** Update recommendation evaluation logic to respect the database-backed pathway statuses (falling back to memory if necessary for tests, or updating tests to mock Convex).
6.  **Testing:** Add ATDD integration tests for the new admin routes demonstrating unauthorized rejection and authorized successful CRUD operations.
