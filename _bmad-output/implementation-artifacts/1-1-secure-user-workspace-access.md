# Story 1.1: Secure User Workspace Access

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a prospective immigration user,
I want to create an account and enter a protected workspace,
So that I can manage my planning data in a secure, personal environment.

## Acceptance Criteria

1. **Given** I am a new or returning end user **When** I authenticate through the existing session flow **Then** I am granted access only to the user workspace routes and protected from unauthorized access **And** internal admin-only routes remain unavailable to standard users.

2. **Given** I attempt to access another user's workspace data **When** the request reaches the server boundary **Then** access is denied based on server-side ownership checks **And** no other user's profile or run metadata is exposed.

3. **Given** I successfully sign in **When** I enter the workspace **Then** I land in a stable workspace shell with clear navigation to intake and core workspace entry points **And** the shell is usable on desktop and mobile with keyboard-accessible navigation.

4. **Given** recommendation work areas are not yet delivered in this epic **When** the workspace shell renders navigation affordances for those future areas **Then** any recommendation-specific navigation is clearly unavailable, disabled, or omitted **And** the shell does not imply unfinished recommendation features are already usable.

5. **Given** I am a standard authenticated user **When** I attempt to access an internal admin or trust-governance route **Then** the server denies access and no privileged controls or audit data are exposed in the client.

## Tasks / Subtasks

- [x] Task 1: Create workspace route group and auth middleware (AC: #1, #5)
  - [x] 1.1: Create `server/utils/auth/requireUserSession.ts` — server-side helper that validates the Better Auth session and extracts the user ID; throws `createError({ statusCode: 401 })` if unauthenticated
  - [x] 1.2: Create `server/utils/auth/requireAdminSession.ts` — server-side helper that validates admin role; throws `createError({ statusCode: 403 })` if not admin; checks `rag_admins` table in Convex
  - [x] 1.3: Create `app/middleware/auth.ts` — Nuxt route middleware that checks `useUserSession().loggedIn` and redirects unauthenticated users to `/auth`; apply to workspace route group
  - [x] 1.4: Create `app/pages/workspace/` directory with protected route group
  - [x] 1.5: Apply admin-only guard to existing `app/pages/admin/*.client.vue` routes — ensure standard users cannot access admin pages

- [x] Task 2: Build the WorkspaceShell layout component (AC: #3, #4)
  - [x] 2.1: Create `app/components/workspace/WorkspaceShell.vue` — reusable shell layout with side navigation (desktop), bottom nav (mobile), top header, and content slot
  - [x] 2.2: Desktop layout: persistent left sidebar with nav items (Dashboard active, Start Intake prominent CTA, Recommendations disabled, History disabled), user info at bottom with sign-out
  - [x] 2.3: Mobile layout: compact top header with hamburger/branding, bottom navigation bar with same items adapted for mobile
  - [x] 2.4: Apply design tokens from `design-tokens.css` — Trust Navy primary, Cloud Surface background, Public Sans font, soft rounded corners
  - [x] 2.5: Ensure WCAG 2.1 AA: visible focus rings, semantic `<nav>` landmarks, `aria-current="page"` on active item, `aria-disabled="true"` on future-only items, minimum 44×44px touch targets
  - [x] 2.6: Add `data-testid="workspace-shell"` to the shell root and `data-testid="workspace-nav"` to the navigation container

- [x] Task 3: Create workspace landing page (AC: #3, #4)
  - [x] 3.1: Create `app/pages/workspace/index.vue` — workspace dashboard wrapped in WorkspaceShell
  - [x] 3.2: Render a welcoming empty state: heading, brief explanation of the product value, and a prominent "Start Guided Intake" CTA button linking to the future intake route (`/workspace/intake`)
  - [x] 3.3: No fake recommendation data, no placeholder cards — clean empty state that signals readiness
  - [x] 3.4: Add `data-testid="workspace-dashboard"` to the page root

- [x] Task 4: Implement server-side workspace API boundary (AC: #2)
  - [x] 4.1: Create `server/api/workspace/me.get.ts` — returns the current user's workspace metadata (userId, email, name); uses `requireUserSession`
  - [x] 4.2: Ensure the response never exposes another user's data — ownership check baked into the session extraction

- [x] Task 5: Update auth flow to redirect to workspace (AC: #1, #3)
  - [x] 5.1: Update `app/pages/auth.vue` — after successful login, redirect to `/workspace` instead of `/tasks`
  - [x] 5.2: Update `app/pages/index.vue` — change the primary CTA links to point at `/workspace` and `/auth`
  - [x] 5.3: Keep `/tasks` route working for backward compatibility but it is no longer the primary post-login destination

- [x] Task 6: Admin route protection hardening (AC: #5)
  - [x] 6.1: Add the auth middleware to admin pages so unauthenticated users cannot load them
  - [x] 6.2: Add server-side admin role checks on existing `server/api/admin/*` routes using `requireAdminSession`

## Dev Notes

- **Authentication is already wired.** Better Auth with email/password is fully functional via `useUserSession()` on client and `defineServerAuth()` on server. The auth page (`app/pages/auth.vue`) works today. Do **not** re-implement or replace the auth system.
- **Convex integration exists.** The `convex/` directory has a working schema, auth config, and RAG infrastructure. Convex is used for operational state. Admin role checking can query the `rag_admins` table.
- **No new database tables are needed for this story.** The user identity comes from Better Auth's existing session/user tables. Workspace metadata at this stage is derived from the session, not a new table.
- **Do not create intake, recommendation, or pathway tables/routes in this story.** Those belong to Stories 1.2–1.4 and Epic 2+.
- **The existing `app/components/ui/` library has 60+ shadcn-nuxt components** including sidebar, navigation-menu, button, card, badge, avatar, separator, sheet, tabs, tooltip, etc. Use these directly — do not rebuild primitives.
- **Routing convention**: Use Nuxt file-based routing. New workspace pages go in `app/pages/workspace/`. Admin pages stay in `app/pages/admin/`.
- **Middleware convention**: Route middleware files go in `app/middleware/`. Apply via `definePageMeta({ middleware: ['auth'] })`.

### UI/UX Context

- **This is a frontend-impacting story.** It creates the workspace shell, which is the persistent layout frame for the entire authenticated user experience going forward.
- The approved UX direction is **Comparison Workspace** — a calm, trust-oriented planning console with side navigation (desktop) and stacked mobile layout.
- The shell should feel ready and welcoming, not empty or broken. The initial empty state is a designed experience, not a placeholder.
- Future stories (1.2+) will populate the workspace with intake flow, recommendation results, and planning tools.

### Affected Frontend Surfaces

1. **WorkspaceShell** — new reusable layout component (`app/components/workspace/WorkspaceShell.vue`)
2. **Workspace Dashboard** — new page (`app/pages/workspace/index.vue`)
3. **Auth page** — modified redirect target (from `/tasks` to `/workspace`)
4. **Landing page** — updated navigation links to workspace

### Approved Stitch Design Package

- Stitch project ID: `6257021077077987630`
- Surface-to-screen mapping:
  - WorkspaceShell (Desktop): `b42a3472183e4e2b9ecc00bd5fd63501` — "Cadet2 Initial Workspace Shell"
  - WorkspaceShell (Mobile): `b14baf983ce14b0f945264f25d539a25` — "Cadet2 Mobile Workspace Shell"
- Approved screen IDs: `b42a3472183e4e2b9ecc00bd5fd63501`, `b14baf983ce14b0f945264f25d539a25`
- Approved component IDs: N/A (shell-level composition, not isolated components)
- Selected variant labels: "Initial Workspace Shell" (Desktop), "Mobile Workspace Shell" (Mobile)
- Prompt summary: Empty-state workspace with side nav (desktop) / bottom nav (mobile), welcoming CTA to start intake, disabled future sections
- Design context source: `_bmad-output/planning-artifacts/DESIGN.md`, `_bmad-output/planning-artifacts/ux-design-specification.md`
- Token artifact references: `design-tokens.css`, `design-tokens.json`
- Supporting screenshot/code references: Retrieve via `get_screen` with project `6257021077077987630`
- App-level approved reference screens:
  - Desktop: `3a4bf4f2083e46d89b219ab72563bf1a` (Comparison Workspace Desktop — full-state reference)
  - Mobile: `2d7501846dd44d8a8bc52b9742494a71` (Comparison Workspace Mobile — full-state reference)
  - Tablet: `dc826e99abc34ba29c8a985158de51e9` (Comparison Workspace Tablet — full-state reference)

### Approved Variant Decision

- **Desktop**: Approved — Trust Navy side nav rail with persistent navigation, Cloud Surface content area, white content card for empty-state welcome.
- **Mobile**: Approved — Compact top header with branding, stacked content with prominent CTA, bottom navigation bar with disabled future sections.
- Rationale: Both variants align with the approved Comparison Workspace direction. The workspace shell is the first touchpoint after sign-in, so it must communicate trust, calm readiness, and clear forward motion toward the intake flow.

### Design Tokens / System Constraints

- **Source of truth**: `_bmad-output/planning-artifacts/design-tokens.css` and `_bmad-output/planning-artifacts/design-tokens.json`
- **Primary tokens to apply**:
  - `--color-trust-navy: #234c76` — primary actions, active nav, brand emphasis
  - `--color-supportive-sage: #4d7a72` — progress, success, confidence states
  - `--color-measured-sand: #c89b52` — caution, guidance banners
  - `--color-cloud-surface: #f7f8fa` — page background
  - `--color-pure-planning-white: #ffffff` — card/panel surfaces
  - `--color-deep-charcoal-slate: #18232d` — heading text
  - `--color-cool-advisory-gray: #66737f` — secondary text
  - `--color-night-surface: #14191e` — dark mode background
  - `--color-raised-night-panel: #1b232c` — dark mode cards
  - Font: Public Sans
  - Spacing: 8px base grid
  - Radius: soft rounded (12px for cards, 8px for inputs/buttons)
- **The dev agent must load `design-tokens.css` into the project** if not already integrated, so the shell can reference semantic CSS custom properties.

### Stitch Retrieval Instructions

- **Before coding**, retrieve approved screens from Stitch project `6257021077077987630`:
  - Desktop shell: `get_screen(projectId='6257021077077987630', screenId='b42a3472183e4e2b9ecc00bd5fd63501')`
  - Mobile shell: `get_screen(projectId='6257021077077987630', screenId='b14baf983ce14b0f945264f25d539a25')`
- Reference the full-state approved designs for nav pattern guidance:
  - Desktop: `get_screen(projectId='6257021077077987630', screenId='3a4bf4f2083e46d89b219ab72563bf1a')`
  - Mobile: `get_screen(projectId='6257021077077987630', screenId='2d7501846dd44d8a8bc52b9742494a71')`
- **Relevant Stitch skills**: Use `stitch-vue-components` and `stitch-shadcn-vue` for component implementation mapping.
- **After implementation**, use the Stitch screens as visual QA references to verify the shell matches the approved direction.

### Referenced UX Artifacts

- UX specification: `_bmad-output/planning-artifacts/ux-design-specification.md`
- DESIGN.md: `_bmad-output/planning-artifacts/DESIGN.md`
- Design tokens JSON: `_bmad-output/planning-artifacts/design-tokens.json`
- Design tokens CSS: `_bmad-output/planning-artifacts/design-tokens.css`
- Project context: `_bmad-output/project-context.md`

### Project Structure Notes

- New files align with the architecture project structure:
  - `app/components/workspace/WorkspaceShell.vue` ✓
  - `app/pages/workspace/index.vue` ✓
  - `app/middleware/auth.ts` ✓
  - `server/utils/auth/requireUserSession.ts` ✓
  - `server/utils/auth/requireAdminSession.ts` ✓
  - `server/api/workspace/me.get.ts` ✓
- Modified files:
  - `app/pages/auth.vue` — redirect target change
  - `app/pages/index.vue` — navigation link updates
- No conflicts with existing file structure detected.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Selected Direction]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy]
- [Source: _bmad-output/planning-artifacts/DESIGN.md]
- [Source: _bmad-output/project-context.md]

## Dev Agent Record

### Agent Model Used

Codex (GPT-5)

### Implementation Plan

- Add shared server-side auth helpers for workspace and admin access boundaries.
- Create the protected workspace route shell and empty-state landing page using the approved tokenized design direction.
- Move post-login entrypoints to `/workspace`, preserve `/tasks`, and harden admin routes on both client and server.
- Add E2E coverage for workspace protection and admin-route rejection, then validate with Playwright and production build.

### Stitch Retrieval Log

- Used the approved design metadata and token references embedded in this story plus `_bmad-output/planning-artifacts/ux-design-specification.md`.
- Direct Stitch screen retrieval was not available through the current toolset in this session, so implementation followed the approved screen IDs and token artifacts already documented in the story.

### UI Implementation Mapping

- `app/components/workspace/WorkspaceShell.vue`: implements the approved desktop trust-navy rail, mobile header/sheet, bottom navigation, disabled future sections, and accessible navigation states.
- `app/pages/workspace/index.vue`: implements the empty-state dashboard with a single guided-intake CTA and no placeholder recommendation content.
- `app/assets/css/tailwind.css`: imports `design-tokens.css`, preserves existing shadcn variables, and applies the shared body font token.
- `app/pages/index.vue` and `app/pages/auth.vue`: route users into the workspace flow while preserving the legacy `/tasks` surface.

### Debug Log References

- `test-results/artifacts/workspace-auth-Workspace-r-e3e61-cted-away-from-admin-routes-chromium/error-context.md`
- `test-results/artifacts/workspace-auth-Workspace-r-67ab2-orkspace-shell-and-sign-out-chromium/error-context.md`
- Validation runs:
- `pnpm exec playwright test`
- `pnpm build`

### Completion Notes List

- Added `requireWorkspaceUserSession` and `requireAdminSession` helpers plus `/api/workspace/me` and `/api/admin/access` for server-side ownership and admin checks.
- Added route middleware for authenticated workspace access and admin-page protection, then applied it to the workspace and admin page surfaces.
- Built the reusable workspace shell and dashboard empty state with desktop/mobile navigation, tokenized styling, accessible states, and stable test selectors.
- Updated auth and landing flows so successful sign-in and primary CTAs route to `/workspace`, while `/tasks` remains available for backward compatibility.
- Replaced admin route checks across the existing RAG admin APIs with `requireAdminSession`, including a fail-closed fallback when the Convex admin-status lookup errors.
- Added and updated Playwright coverage for landing-page CTAs, workspace access, and standard-user admin-route rejection.

### File List

- app/assets/css/tailwind.css
- app/components/workspace/WorkspaceShell.vue
- app/middleware/admin.ts
- app/middleware/auth.ts
- app/pages/admin/rag-phase0.client.vue
- app/pages/admin/rag-sources.client.vue
- app/pages/auth.vue
- app/pages/index.vue
- app/pages/workspace.vue
- app/pages/workspace/index.vue
- server/api/admin/access.get.ts
- server/api/admin/rag/convex-admin/sync-current-user.post.ts
- server/api/admin/rag/ingestion/batches/[batchId].get.ts
- server/api/admin/rag/ingestion/batches/index.get.ts
- server/api/admin/rag/ingestion/run.post.ts
- server/api/admin/rag/phase0-readiness.get.ts
- server/api/admin/rag/sources/[sourceId]/approve.post.ts
- server/api/admin/rag/sources/[sourceId]/pause.post.ts
- server/api/admin/rag/sources/[sourceId]/reject.post.ts
- server/api/admin/rag/sources/[sourceId]/resume.post.ts
- server/api/admin/rag/sources/admin-status.get.ts
- server/api/admin/rag/sources/index.get.ts
- server/api/admin/rag/sources/index.post.ts
- server/api/workspace/me.get.ts
- server/utils/auth/requireAdminSession.ts
- server/utils/auth/requireUserSession.ts
- tests/e2e/example.spec.ts
- tests/e2e/workspace-auth.spec.ts

### Change Log

- Implemented protected workspace routing, shell UI, and session-derived workspace API boundary.
- Redirected the core auth flow into the new workspace entrypoint while retaining the legacy tasks page.
- Hardened admin page and API access checks, then added passing Playwright coverage for the protected workspace and admin rejection path.
