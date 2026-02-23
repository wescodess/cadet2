# Nuxt Convex Reference

## Overview

`nuxt-convex` integrates Convex into Nuxt with:

- realtime query subscriptions by default
- virtual imports (`#convex`, `#convex/api`, `#convex/storage`)
- auto-imported composables
- optional file storage helpers with scaffolded Convex functions
- Nuxt DevTools integration (Convex tab)

Convex functions live in `convex/` at project root. Convex generates typed API references used by `#convex/api`.

## Requirements

- Nuxt `3.0.0+` (per docs)
- Convex project (`npx convex dev` to initialize/create and run dev deployment)

## Installation

Docs show two entry points depending on context:

- Direct install:
  - `pnpm add nuxt-convex convex`
- Module add command (shown in integration docs examples):
  - `npx nuxt module add nuxt-convex`

Minimal Nuxt config:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-convex'],
})
```

Enable file storage:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-convex'],
  convex: {
    storage: true,
  },
})
```

## Module Options (`nuxt.config.ts`)

Docs-observed `convex` options:

- `url?: string`
  - default resolves from `process.env.CONVEX_URL`
- `storage?: boolean`
  - default `false`
  - enables storage integration (`#convex/storage`, storage composables, scaffolding)

Example:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-convex'],
  convex: {
    url: 'https://your-deployment.convex.cloud',
    storage: true,
  },
})
```

## Environment Variables

Docs indicate the module reads:

- `CONVEX_URL` (preferred/default)
- `NUXT_PUBLIC_CONVEX_URL` (Nuxt-style fallback)

`npx convex dev` sets `CONVEX_URL` automatically during local development.

## Virtual Imports

- `#convex`
  - core client/composables
- `#convex/api`
  - generated Convex API types and function refs
- `#convex/storage`
  - storage operations (when `storage: true`)

Example:

```ts
import { useConvexQuery } from '#convex'
import { api } from '#convex/api'
```

## Auto-Imported Composables

Always available:

- `useConvexQuery`
- `useConvexMutation`
- `useConvexAction`
- `useConvex` (raw client)

When storage enabled:

- `useConvexStorage`
- `useConvexUpload`

## Backend Patterns (`convex/`)

### Schema (`convex/schema.ts`)

Define tables with `defineSchema` / `defineTable` and `v` validators.

Key points from docs:

- tables are created automatically when pushed to Convex
- add indexes for frequent filters
- use `.withIndex()` in queries to benefit from indexes

Example pattern:

```ts
export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    userId: v.optional(v.string()),
    isCompleted: v.boolean(),
    createdAt: v.number(),
  }).index('by_user', ['userId']),
})
```

### Queries

Queries are read-only and reactive.

Docs-highlighted builder methods:

- `.query('table')`
- `.withIndex(...)`
- `.filter(...)`
- `.order('asc' | 'desc')`
- `.collect()`
- `.first()`
- `.take(n)`

Use `ctx.db.get(id)` for single-document lookup.

### Mutations

Mutations are transactional/atomic.

Docs examples cover:

- `ctx.db.insert`
- `ctx.db.patch`
- `ctx.db.replace`
- `ctx.db.delete`

Guidance:

- prefer `patch` for partial updates
- use `replace` only when replacing full document payload intentionally
- multiple reads/writes in one mutation roll back together on failure

### Actions

Use actions when you need:

- external API calls
- long-running work
- Node.js APIs / side effects

Docs caveat:

- actions cannot directly read/write DB
- use `ctx.runQuery()` / `ctx.runMutation()` for DB interactions

## Composables

### `useConvexQuery`

Docs behavior summary:

- SSR enabled by default (`ssr: true`)
- server fetch: one-shot query
- client hydration + websocket subscription for realtime updates
- args support reactive refs/getters/computed
- returns AsyncData-like shape (`data`, `pending`, `error`, `refresh`, `status`)

Important auth caveat (critical when combining with Better Auth):

- SSR server-side Convex queries do not receive auth tokens/cookies
- authenticated/private Convex queries should use `{ ssr: false }`

Docs also note:

- SSG (`nuxi generate`) supported for build-time data embedding
- server-rendered data may be stale until client subscription syncs

### `useConvexMutation`

- `mutate(args)` returns mutation result (including created IDs)
- `isLoading`, `error`
- optimistic updates are handled automatically by Convex

### `useConvexAction`

- `execute(args)` for action calls
- `isLoading`, `error`
- use for external systems and non-transactional flows

### `useConvex`

Raw client for advanced cases:

- single fetch without subscription
- custom subscription management
- bespoke abstractions when higher-level composables are too opinionated

Prefer module composables first unless there is a clear need.

### `useConvexPaginatedQuery`

Docs describe it as:

- client-only realtime pagination
- query must return Convex `PaginationResult`
- flattening + page metadata + `loadMore`, `reset`, `suspense`

Docs also mention renderless components:

- `<ConvexQuery>`
- `<ConvexPaginatedQuery>`

Use this for interactive lists; use `useConvexQuery` when SSR is needed for the initial page.

## File Storage

### Enable Storage (`convex.storage = true`)

When enabled, docs state the module auto-scaffolds `convex/_hub/storage.ts` with:

- `generateUploadUrl`
- `getUrl`
- `remove`

You can customize the scaffolded functions after generation.

### Upload Metadata Schema

Docs recommend adding an `uploads` table with fields like:

- `storageId` (`v.id('_storage')`)
- `name`
- `type`
- `url?`
- `userId`
- `createdAt`
- index by user (`by_user`)

### `useConvexStorage`

Low-level operations (docs examples):

- `generateUploadUrl.mutate()`
- `getUrl(storageId)` -> reactive URL ref
- `remove.mutate({ storageId })`

Use this when you want full control over upload workflow and metadata writes.

### `useConvexUpload`

High-level upload composable (docs examples and extracted page text):

- depends on `generateUploadUrl` from `useConvexStorage(api)`
- supports hooks:
  - `onSuccess(storageId, file)`
  - `onError(error)`
- returns:
  - `upload(file)` -> `Promise<string | null>`
  - `isUploading`
  - `progress` (0-100)
  - `error`

Common pattern:

1. Upload binary to Convex storage (via generated upload URL)
2. Save metadata in app table with a mutation (often in `onSuccess`)

## Nuxt DevTools

Docs state a Convex tab is added in development, embedding the Convex dashboard for data/functions/logs.

## TypeScript Notes

Docs show generated types can be imported from `#convex/api`:

```ts
import type { Doc, Id } from '#convex/api'

type Task = Doc<'tasks'>
type TaskId = Id<'tasks'>
```

## Better Auth Integration (Module-Level)

Nuxt Convex docs include an integration page for Better Auth. Core points:

- add both modules to `nuxt.config.ts`
- use `useUserSession()` to derive auth state
- pass user-scoped args into Convex queries via `computed`
- pause query by passing `undefined` when user is absent
- set `{ ssr: false }` for authenticated Convex queries

See `references/integration-recipes.md` for concrete combined setup templates.

## Practical Pitfalls

- Missing `CONVEX_URL` / `NUXT_PUBLIC_CONVEX_URL`
  - queries fail or client cannot connect; run `npx convex dev` locally.
- Authenticated query with SSR enabled
  - returns empty/fails because SSR request has no Convex auth context.
- Missing indexes
  - query patterns may degrade or require query rewrites.
- Storage enabled but uploads table missing
  - upload succeeds but app metadata persistence is incomplete.

