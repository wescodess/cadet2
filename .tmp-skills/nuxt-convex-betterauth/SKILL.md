---
name: nuxt-convex-betterauth
description: Comprehensive setup and integration guide for Nuxt projects using `nuxt-convex`, `@onmax/nuxt-better-auth`, and optional `@convex-dev/better-auth`. Use when configuring realtime Convex data, Better Auth sessions/route protection, Convex-as-auth-database, SSR-safe authenticated queries, file uploads, or troubleshooting Nuxt + Convex + Better Auth behavior.
---

# Nuxt Convex + Better Auth

Use this skill to implement `nuxt-convex` and `@onmax/nuxt-better-auth` separately or together in a Nuxt app, including the `@convex-dev/better-auth` adapter flow when Convex stores auth tables.

## Start Here

1. Inspect the project state first:
   - `nuxt.config.ts`
   - `server/auth.config.ts`
   - `app/auth.config.ts` (or `<srcDir>/auth.config.ts`)
   - `convex/schema.ts`, `convex/*.ts`, `convex/convex.config.ts`
   - `.env` / runtime config usage
2. Decide the integration mode before editing files (see `references/integration-recipes.md`).
3. Verify current package versions and docs because `@onmax/nuxt-better-auth` docs currently show `@alpha` and some integrations require version alignment.

## Decision Matrix

Pick one of these paths before implementing:

- `nuxt-convex` only
  - Use when the app needs realtime Convex backend, typed queries/mutations/actions, and optional file storage.
- `@onmax/nuxt-better-auth` only
  - Use when the app needs auth/session management, route protection, and Better Auth plugin/provider integration.
- Both modules (shared app)
  - Use when the app needs Better Auth for identity + Convex for realtime application data.
- Both modules + `@convex-dev/better-auth`
  - Use when Convex should also store Better Auth users/sessions/accounts (single backend datastore for app + auth data).
- `@onmax/nuxt-better-auth` in `clientOnly` mode + external auth backend
  - Use when Nuxt is frontend-only for auth but still uses `nuxt-convex` for app data.

## High-Value Rules

- Keep `nuxt-better-auth` server and client plugin lists in sync (`better-auth/plugins` on server, `better-auth/client/plugins` on client).
- For authenticated Convex queries in Nuxt pages, prefer `useUserSession()` + reactive args + `useConvexQuery(..., { ssr: false })`.
- Do not rely on page redirects for security. Protect API routes with `requireUserSession(event)`.
- Restart Nuxt dev server after changing Better Auth plugins that affect schema generation (NuxtHub flow).
- If using `@convex-dev/better-auth`, pin exact versions as recommended by the docs and wire the Convex component in `convex/convex.config.ts`.
- Validate redirect query params before post-login navigation to avoid open redirects.

## Recommended Workflow

1. Choose target architecture in `references/integration-recipes.md`.
2. Configure modules and env vars (`references/nuxt-convex.md`, `references/nuxt-better-auth.md`).
3. Implement auth configs (`server/auth.config.ts`, `app/auth.config.ts`).
4. Implement Convex schema/functions/composables usage.
5. Add route protection + API enforcement.
6. Test session behavior (SSR/client hydration) and authenticated Convex queries.
7. Test file uploads if storage is enabled.
8. Recheck docs versions/options before finalizing.

## Reference Files

Read only what is needed for the current task.

- `references/integration-recipes.md`
  - Primary file for combined setups and migration paths.
- `references/nuxt-convex.md`
  - Module setup, backend patterns, composables, file storage, SSR caveats.
- `references/nuxt-better-auth.md`
  - Module setup, config options, sessions, route protection, API helpers, integrations, troubleshooting.
- `references/docs-inventory.md`
  - Route-by-route docs map and source URLs for live verification.

## Live Verification (Important)

These modules are evolving quickly. Before implementing or troubleshooting production issues:

- Re-open the official docs pages in `references/docs-inventory.md`.
- Confirm install tags (`@alpha`, `@beta`) and adapter compatibility requirements.
- Confirm config option names/defaults and any SSR/auth caveat changes.

