# Docs Inventory

Last verified against the public docs pages on 2026-02-22.

## Primary Sources

- Nuxt Convex docs: `https://nuxt-convex.onmax.me`
- Nuxt Better Auth docs: `https://nuxt-better-auth.onmax.me`
- Nuxt Better Auth Convex integration page: `https://nuxt-better-auth.onmax.me/integrations/convex`
- Convex docs: `https://docs.convex.dev`
- Better Auth docs: `https://www.better-auth.com/docs`
- `@convex-dev/better-auth` package/repo (advanced adapter options): see the link from the Convex integration page in Nuxt Better Auth docs.

## Nuxt Convex Docs Routes

### Getting Started

- `/getting-started/introduction` - Features, requirements, high-level architecture.
- `/getting-started/installation` - Install `nuxt-convex` + `convex`, module config, env vars, virtual imports.

### Backend

- `/backend/schema` - Convex schema + indexes examples.
- `/backend/queries` - Reactive query functions and query builder methods.
- `/backend/mutations` - Transactional writes (`insert`, `patch`, `replace`, `delete`).
- `/backend/actions` - External APIs, `ctx.runQuery`, `ctx.runMutation`, env vars.

### Composables

- `/composables/use-convex-query` - SSR-aware reactive query composable; `ssr` caveat for auth.
- `/composables/use-convex-mutation` - Mutation composable and optimistic updates.
- `/composables/use-convex-action` - Action composable for external work.
- `/composables/use-convex` - Raw client access for advanced/manual patterns.
- `/composables/use-convex-paginated-query` - Client-only realtime pagination + renderless components.

### File Storage

- `/file-storage/setup` - Enable `convex.storage`, scaffold `_hub/storage`, uploads schema.
- `/file-storage/use-convex-storage` - Low-level storage operations (`generateUploadUrl`, `getUrl`, `remove`).
- `/file-storage/use-convex-upload` - High-level upload composable with progress and hooks.

### Integrations / API

- `/integrations/better-auth` - Combined usage pattern with Better Auth + Convex.
- `/api/configuration` - `convex` module options (`url`, `storage`) and auto-imports list.

## Nuxt Better Auth Docs Routes (Observed)

### Getting Started

- `/getting-started` - Intro and quick start.
- `/getting-started/installation` - Install module, env vars, config files.
- `/getting-started/configuration` - Module options (`auth.*`) + `defineServerAuth` details.
- `/getting-started/client-setup` - `defineClientAuth` and client plugin parity.
- `/getting-started/type-augmentation` - auto inference + manual module augmentation.
- `/getting-started/schema-generation` - NuxtHub schema generation workflow and restart requirement.
- `/getting-started/how-it-works` - build/runtime architecture, request flow.

### Core Concepts

- `/core-concepts/server-auth` - When to use `serverAuth(event?)`.
- `/core-concepts/sessions` - `useUserSession()` SSR behavior, ready state, refresh, lifetime.
- `/core-concepts/route-protection` - routeRules, page meta, `requireUserSession`, safe redirects.
- `/core-concepts/auto-imports-aliases` - registered auto-imports + `#nuxt-better-auth` alias.
- `/core-concepts/security-caveats` - server enforcement, CSRF/origin checks, rate limiting guidance.

### API Reference

- `/api/composables` - `useUserSession()` methods/behavior.
- `/api/server-utils` - `serverAuth`, `getUserSession`, `requireUserSession`.
- `/api/components` - `<BetterAuthState>`.
- `/api/types` - `AuthUser`, `AuthSession`, route rule types.

### Integrations

- `/integrations/nuxthub` - DB persistence, schema generation, migrations, KV secondary storage.
- `/integrations/devtools` - Nuxt DevTools auth tab (dev only).
- `/integrations/i18n` - localized auth error handling with `@nuxtjs/i18n`.
- `/integrations/convex` - Nuxt Convex integration + `@convex-dev/better-auth` adapter flow.

### Troubleshooting

- `/troubleshooting/faq` - common errors, version constraints, missing config files, route rules behavior.

## Notes For Future Refresh

- `@onmax/nuxt-better-auth` docs currently indicate early development and breaking changes are possible.
- Install tags shown in docs may change (`@alpha`, Better Auth beta requirements for some integrations).
- Re-verify adapter compatibility (`@convex-dev/better-auth` + `better-auth`) before implementing.

