# Nuxt Better Auth Reference

## Overview

`@onmax/nuxt-better-auth` integrates Better Auth into Nuxt with Nuxt-specific ergonomics:

- `/api/auth/*` handler wiring
- `useUserSession()` SSR-safe reactive session composable
- route protection via `routeRules.auth` and `definePageMeta({ auth })`
- typed server utilities (`serverAuth`, `getUserSession`, `requireUserSession`)
- type inference/augmentation support
- NuxtHub schema generation integration (optional)
- Nuxt DevTools integration (dev only)

Docs homepage highlights (as of 2026-02-22):

- 27+ plugins (via Better Auth ecosystem)
- 33+ OAuth providers (via Better Auth)

## Install / Getting Started

Docs installation command:

```bash
npx nuxi module add @onmax/nuxt-better-auth@alpha
```

Nuxt prerequisites in docs: `Nuxt v3.10+`.

### Environment Variables

Required:

- `BETTER_AUTH_SECRET` (>= 32 chars, high entropy)

Recommended for Nuxt runtime config / multi-env deployments:

- `NUXT_BETTER_AUTH_SECRET`

Optional (often auto-detected on Vercel/Cloudflare/Netlify):

- `NUXT_PUBLIC_SITE_URL`

Docs mention the installer may prompt to generate `BETTER_AUTH_SECRET`, and CI/test environments may auto-generate one.

### Config Files (Required in full mode)

Docs require two files (scaffolded if missing when using `nuxi module add`):

- `server/auth.config.ts`
- `<srcDir>/auth.config.ts` (commonly `app/auth.config.ts`)

Minimal examples:

```ts
// server/auth.config.ts
import { defineServerAuth } from '@onmax/nuxt-better-auth/config'

export default defineServerAuth({
  emailAndPassword: { enabled: true },
})
```

```ts
// app/auth.config.ts
import { defineClientAuth } from '@onmax/nuxt-better-auth/config'

export default defineClientAuth({})
```

## Module Configuration (`nuxt.config.ts`)

Docs-observed `auth` module options:

- `clientOnly?: boolean` (default `false`)
  - use when Better Auth server runs elsewhere
  - skips local server setup, API handlers, schema generation, devtools, secret validation
- `serverConfig?: string` (default `'server/auth.config'`)
- `clientConfig?: string` (default `'app/auth.config'`)
- `redirects?: { login?: string; guest?: string }`
  - defaults to `{ login: '/login', guest: '/' }`
- `secondaryStorage?: boolean` (default `false`)
  - requires NuxtHub KV (`hub: { kv: true }`) and improves session validation performance
- `schema.usePlural?: boolean` (default `false`)
- `schema.casing?: 'camelCase' | 'snake_case'`
  - defaults to `camelCase` and may fall back to `hub.db.casing`

Example:

```ts
export default defineNuxtConfig({
  modules: ['@onmax/nuxt-better-auth'],
  auth: {
    redirects: {
      login: '/login',
      guest: '/',
    },
  },
})
```

## `defineServerAuth` (Server Auth Config)

### Object or Function Syntax

Docs support both:

```ts
export default defineServerAuth({
  emailAndPassword: { enabled: true },
})
```

```ts
export default defineServerAuth((ctx) => ({
  emailAndPassword: { enabled: true },
}))
```

### Context in Function Syntax

Docs examples show useful context values, including:

- `db` (Drizzle instance when using NuxtHub)
- `runtimeConfig`

Use this to derive config dynamically or attach adapters/plugins.

### Secret / Base URL Injection

Docs explicitly say the module injects secret and base URL automatically.

Do not manually set secret/baseURL in `defineServerAuth(...)` unless you have a specific reason and have verified behavior.

Secret priority (docs):

1. `nuxt.config.ts` runtime config
2. `NUXT_BETTER_AUTH_SECRET`
3. `BETTER_AUTH_SECRET`

Site/base URL resolution priority (docs):

1. `NUXT_PUBLIC_SITE_URL`
2. Request URL
3. Platform env vars (`VERCEL_URL`, `CF_PAGES_URL`, `URL`)
4. `http://localhost:3000` (dev)

Docs recommend explicitly setting `NUXT_PUBLIC_SITE_URL` for custom domains/self-hosted deployments.

### Hook for Nuxt Module Authors

Docs note a hook for extension by other Nuxt modules:

- `better-auth:config:extend`

Use it to append plugins or modify auth config during module setup.

## `defineClientAuth` (Client Auth Config)

### Object or Function Syntax

```ts
export default defineClientAuth({})
```

```ts
export default defineClientAuth(({ siteUrl }) => ({
  // use resolved site URL if needed
}))
```

Docs describe it as a factory so the module can supply the correct runtime base URL.

### Client Plugin Parity (Important)

If server config enables a Better Auth plugin, add the matching client plugin in `app/auth.config.ts`.

Example (docs pattern):

```ts
import { adminClient, twoFactorClient } from 'better-auth/client/plugins'

export default defineClientAuth({
  plugins: [adminClient(), twoFactorClient()],
})
```

## Type Inference and Augmentation

### Automatic Inference

Docs say types are automatically inferred when you:

- add plugins in `server/auth.config.ts`
- use module type exports

Example outcome: `user.value.role` becomes typed when using `admin()` plugin.

### Manual Augmentation (when inference is insufficient)

```ts
import '#nuxt-better-auth'

declare module '#nuxt-better-auth' {
  interface AuthUser {
    customField?: string
  }
}
```

Troubleshooting from docs:

- restart IDE TypeScript server
- run `npx nuxi prepare`
- fix syntax errors in `server/auth.config.ts`

## Schema Generation (NuxtHub Integration)

Docs describe build-time schema generation for Better Auth auth tables when using NuxtHub.

### What It Does

- analyzes `server/auth.config.ts`
- detects core config + plugins (for plugin-specific tables)
- generates Drizzle schema for configured dialect
- injects schema into NuxtHub DB config

### Supported Dialects (per docs)

- `sqlite`
- `postgresql`
- `mysql`

### Important Operational Rule

Restart the dev server after adding/removing plugins that affect auth tables (e.g. passkeys, twoFactor).

Docs explicitly call this out because generation happens at build/module setup time.

## Architecture / How It Works (Docs Summary)

Build time:

- reads `server/auth.config.ts`
- generates auth handler
- optionally generates NuxtHub schema

Server runtime:

- mounts catch-all handler at `/api/auth/**`

Client runtime:

- `useUserSession()` initializes Better Auth client and keeps reactive session state in sync

Docs request flow summary includes:

- page protection checks
- login request to `/api/auth/sign-in/email`
- session cookie set
- reactive session state updates after auth change

## Core Concepts

### Sessions (`useUserSession()`)

Docs highlight:

- SSR session fetch using incoming cookies during render
- client plugin keeps state synced after hydration
- `ready` state is important for avoiding flashes on prerendered/cached pages
- `fetchSession({ force: true })` bypasses Better Auth cookie cache for refresh

Docs also distinguish:

- DB sessions (revocable; default)
- JWE/database-less sessions (encrypted cookie)

Session lifetime example in docs includes `session.expiresIn` and `session.cookieCache` settings in server auth config.

### Route Protection (Layered)

Docs recommend layered usage:

- `routeRules.auth` for broad sections
- `definePageMeta({ auth })` for page-level overrides
- `requireUserSession(event)` for API/server enforcement

Docs note OR behavior for array values in user matching:

- `role: ['admin', 'moderator']` means admin OR moderator

For AND/composite conditions, docs recommend `requireUserSession(event, { rule })` callback.

Docs also include:

- safe redirect validation pattern (avoid open redirects)
- WebSocket handler example using `requireUserSession(peer.ctx.event, ...)`
- CSRF warning: use auth client methods (`signIn.*`) instead of raw fetch to `/api/auth/*`

### Auto-Imports and Aliases

Docs list module auto-imports:

- client: `useUserSession()`
- server: `serverAuth()`, `getUserSession(event)`, `requireUserSession(event, options?)`
- component: `<BetterAuthState>`

Alias:

- `#nuxt-better-auth` (module types like `AuthUser`, `AuthSession`)

### Security & Caveats

Docs emphasize:

- client redirects are UX only, not security
- server-side enforcement is still required for APIs
- Better Auth performs origin checks for cookie-based requests (configure `trustedOrigins` for multiple domains)
- module does not include built-in rate limiting (add proxy/WAF/app-level rate limiting)
- DevTools endpoints are disabled in production (`NODE_ENV=production`)

Docs also note API route protection behavior can be customized with your own Nitro middleware.

## API Reference Highlights

### `useUserSession()`

Docs API page describes returned state and methods including:

State:

- `loggedIn`
- `user`
- `session`
- `ready`
- `client`

Methods:

- `signIn`
- `signUp`
- `signOut`
- `waitForSession()` (resolves after ready / timeout)
- `fetchSession()`
- `updateUser()` (optimistic local user patch)

Important docs behavior note:

- `signIn`/`signUp` promises resolve on server response, not necessarily after local reactive state has updated
- use `onSuccess` callbacks for navigation dependent on updated auth state

### Server Utilities

Docs API page summarizes:

- `serverAuth(event?)`
  - full Better Auth instance, advanced/plugin APIs, accurate URL detection on first init when passed `event`
- `getUserSession(event)`
  - returns session or `null`
- `requireUserSession(event, options?)`
  - throws `401`/`403` on failure
  - supports `user` match + custom `rule` callback

### `<BetterAuthState>` Component

Docs describe it as a hydration-aware render helper:

- `placeholder` slot while hydrating
- `default` slot after ready with `loggedIn`, `user`, `session`, `signOut`

Use it to avoid session-state flashes in SSR/hydration transitions.

### Types

Docs list exported types (examples):

- `AuthMeta`
- `AuthMode`
- `AuthRouteRules`
- `AuthSession`
- `AuthUser`
- `RequireSessionOptions`
- `UserMatch`

Use with `#nuxt-better-auth` alias in components/server code.

## Integrations

### NuxtHub (DB persistence / schema generation)

Docs position NuxtHub as the easiest DB-backed setup.

Highlights from docs:

- install `@nuxthub/core` (docs mention `0.10.5+` requirement)
- add modules `@nuxthub/core` + `@onmax/nuxt-better-auth`
- configure `hub.db` dialect (`sqlite`, `postgresql`, `mysql`)
- optional KV + `auth.secondaryStorage = true` for session caching
- `npx nuxt db generate` / `npx nuxt db migrate` for migrations (manual/CI flows)
- `db` Drizzle instance is available in `defineServerAuth(({ db }) => ...)`
- custom tables can reference auth tables through `@nuxthub/db` `schema.*`
- use Better Auth `additionalFields` for extending auth tables

Docs also state schema generation requires Better Auth beta in this flow (`pnpm add better-auth@beta`). Verify this before installing because it may change.

### DevTools

Docs state an Auth tab is available in Nuxt DevTools (development only), with tabs like Config/Sessions/Users/Accounts depending on DB support.

### i18n (`@nuxtjs/i18n`)

Docs provide error translation pattern using `auth.errors.*` keys and `useI18n()` fallback behavior.

They also show server-side locale detection helpers (`@intlify/utils/h3`) for callbacks like password reset email flows.

### Convex (Combined With `nuxt-convex`)

See `references/integration-recipes.md` for the full combined flow.

Docs coverage includes:

- adding `nuxt-convex`
- authenticated realtime queries using `useUserSession()` and `useConvexQuery(...)`
- `computed` args + `undefined` to pause unauthenticated queries
- `{ ssr: false }` for authenticated Convex queries
- optional `@convex-dev/better-auth` adapter to store auth data in Convex

## Troubleshooting (Docs FAQ Highlights)

### Common Setup Errors

- Missing `server/auth.config.ts`
- Missing `<srcDir>/auth.config.ts`
- validation failed because file does not export `defineServerAuth(...)`
- manually setting secret/baseURL in auth config when module injects them

### NuxtHub Issues

- `@nuxthub/core` version too old (< docs requirement)
- no schema generation because NuxtHub is not installed/configured
- forgot to restart dev server after plugin changes

### Route Protection Issues

- `routeRules` changes not applied until dev server restart
- API routes not protected as expected because handler-level enforcement is missing
  - fix with `routeRules.auth` and/or `requireUserSession(event)` in handlers

### Debugging

Docs suggest:

- `DEBUG=better-auth*`
- inspect browser Network tab for `/api/auth/*`

## Better Auth (Upstream) Feature Coverage Strategy

`@onmax/nuxt-better-auth` is a Nuxt integration layer over Better Auth. For maximum feature usage:

1. Configure core Better Auth options/plugins/providers in `server/auth.config.ts`.
2. Mirror client plugins in `app/auth.config.ts`.
3. Use Nuxt module APIs (`useUserSession`, route rules, server utilities) for Nuxt ergonomics.
4. Use upstream Better Auth docs for plugin-specific options and provider-specific settings.
5. Re-verify plugin schema impacts when using NuxtHub/DB generation.

