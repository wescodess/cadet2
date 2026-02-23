# Integration Recipes (Nuxt Convex + Nuxt Better Auth)

Use this file first when both modules are involved.

## Architecture Options

### Option A: Better Auth for identity + Convex for app data (most common)

Use when:

- you want Better Auth sessions/route protection in Nuxt
- Convex stores application data (tasks, chats, files, etc.)
- auth persistence can stay in SQL/NuxtHub or any Better Auth-supported adapter

Characteristics:

- `@onmax/nuxt-better-auth` manages login/session cookies
- `nuxt-convex` manages realtime app queries/mutations/actions
- Convex queries are user-scoped by explicit args (commonly `userId`)

### Option B: Convex for both app data and auth tables (single datastore)

Use when:

- you want Convex to store Better Auth users/sessions/accounts
- you want a single backend datastore and realtime-friendly workflow

Additional requirement:

- `@convex-dev/better-auth` adapter + Convex component registration

### Option C: External Better Auth backend + Nuxt frontend + Convex

Use when:

- Better Auth runs outside the Nuxt app (separate service)
- Nuxt frontend still needs Convex realtime data

Nuxt Better Auth config:

- `auth.clientOnly = true`

## Base Combined Module Setup

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['nuxt-convex', '@onmax/nuxt-better-auth'],

  convex: {
    // storage: true, // enable when needed
  },

  // Optional auth module config
  auth: {
    redirects: {
      login: '/login',
      guest: '/',
    },
  },

  routeRules: {
    '/app/**': { auth: 'user' },
    '/login': { auth: 'guest' },
  },
})
```

## Recipe 1: Authenticated Realtime Query (User-Scoped)

This is the key pattern from the Convex integration docs.

```vue
<script setup lang="ts">
import { api } from '#convex/api'

const { user } = useUserSession()

const { data: tasks, pending, error } = await useConvexQuery(
  api.tasks.list,
  computed(() => (user.value ? { userId: user.value.id } : undefined)),
  { ssr: false },
)
</script>
```

Why each part matters:

- `user.value ? ... : undefined`
  - pauses the Convex query when logged out (prevents unauthorized fetch attempts)
- `computed(...)`
  - re-subscribes automatically when auth state changes
- `{ ssr: false }`
  - required for authenticated/private Convex queries because SSR server fetch does not carry Convex auth context per docs

## Recipe 2: Protect UI and API Separately (Required)

Route rules/page meta improve UX, but API handlers must still enforce auth.

### Page protection

```ts
// pages/tasks.vue
definePageMeta({ auth: 'user' })
```

or centrally in `routeRules`.

### API protection

```ts
// server/api/tasks/export.get.ts
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return { ok: true, userId: user.id }
})
```

If you rely only on client redirects, the API is still vulnerable.

## Recipe 3: Convex Backend Function Pattern (User Ownership)

Recommended shape when using Better Auth + Convex app data:

1. Read current user from `useUserSession()` in Nuxt.
2. Pass `userId` to Convex query/mutation args.
3. Filter using indexed `userId` fields in Convex.

Example schema and query:

```ts
// convex/schema.ts
export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    userId: v.string(),
    isCompleted: v.boolean(),
    createdAt: v.number(),
  }).index('by_user', ['userId']),
})
```

```ts
// convex/tasks.ts
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query('tasks')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()
  },
})
```

Note:

- This pattern is simple and common, but it trusts user ID passed from the client. If stronger guarantees are required, add server-side validation at your API boundary and/or implement a Convex auth verification strategy consistent with your stack.

## Recipe 4: Better Auth + Convex File Uploads (User Metadata)

Use `useConvexUpload` for binary upload and a mutation for metadata ownership.

```vue
<script setup lang="ts">
import { api } from '#convex/api'

const { user } = useUserSession()
const { generateUploadUrl } = useConvexStorage(api)
const saveFile = useConvexMutation(api._hub.storage.saveFile)

const { upload, isUploading, progress, error } = useConvexUpload({
  generateUploadUrl,
  onSuccess: async (storageId, file) => {
    if (!user.value) return
    await saveFile.mutate({
      storageId,
      name: file.name,
      type: file.type,
      userId: user.value.id,
    })
  },
})
</script>
```

Checklist:

- `convex.storage = true`
- uploads table exists in `convex/schema.ts`
- auth-protected UI/API path around upload surfaces

## Recipe 5: Convex as Better Auth Database (`@convex-dev/better-auth`)

This recipe is from the Nuxt Better Auth Convex integration docs.

### Install adapter (exact versions recommended by docs)

```bash
pnpm add @convex-dev/better-auth better-auth --save-exact
```

### Register Convex component

```ts
// convex/convex.config.ts
import betterAuth from '@convex-dev/better-auth/convex.config'
import { defineApp } from 'convex/server'

const app = defineApp()
app.use(betterAuth)

export default app
```

### Connect Better Auth server config to Convex adapter

```ts
// server/auth.config.ts
import { components } from '#convex/api'
import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/server/plugins'
import { defineServerAuth } from '@onmax/nuxt-better-auth/config'

const authComponent = createClient(components.betterAuth)

export default defineServerAuth({
  database: authComponent.adapter(),
  plugins: [convex()],
  emailAndPassword: { enabled: true },
})
```

Important:

- Verify exact compatibility between `@convex-dev/better-auth` and `better-auth` before install.
- If using other Better Auth plugins, keep client plugin parity in `app/auth.config.ts`.

## Recipe 6: NuxtHub + Better Auth + Convex (Hybrid)

If you are combining all three (`@nuxthub/core`, `@onmax/nuxt-better-auth`, `nuxt-convex`):

- decide whether auth data lives in NuxtHub DB or Convex (do not mix unintentionally)
- if using NuxtHub schema generation:
  - confirm required versions (`@nuxthub/core` docs requirement; Better Auth beta note)
  - restart dev server after plugin changes
- keep Convex for app realtime data even if auth tables are in NuxtHub DB

## Route Protection Patterns (Recommended Defaults)

### Global (fast UX)

```ts
routeRules: {
  '/app/**': { auth: 'user' },
  '/login': { auth: 'guest' },
  '/admin/**': { auth: { user: { role: 'admin' } } },
}
```

### Page-specific override

```ts
definePageMeta({
  auth: {
    only: 'user',
    redirectTo: '/login',
    user: { verified: true },
  },
})
```

### Server endpoint enforcement (real security)

```ts
await requireUserSession(event, {
  user: { role: ['admin', 'moderator'] },
  rule: ({ user }) => user.verified === true,
})
```

## SSR / Hydration Guidance

### Better Auth session state

Use `ready` or `<BetterAuthState>` to avoid flash of logged-out/logged-in UI during hydration.

### Convex query SSR strategy

- Public SEO pages: keep `useConvexQuery` default SSR
- Private/user data: use `{ ssr: false }`
- Paginated realtime lists: use `useConvexPaginatedQuery` (client-only)

## Common Failure Modes and Fixes

- Authenticated Convex query returns empty during SSR
  - Add `{ ssr: false }`.
- Query still runs when logged out
  - Pass `undefined` args when user is missing.
- User switches but data does not re-subscribe
  - Wrap args in `computed(...)`.
- `routeRules` changes not taking effect
  - Restart Nuxt dev server.
- Better Auth plugin type fields missing in TS
  - Ensure plugin is in server config, mirror client plugin, run `nuxi prepare`, restart TS server.
- Convex storage upload works but file metadata missing
  - Save metadata in `onSuccess` mutation and ensure schema/table exists.

## Validation Checklist (Before Shipping)

- `nuxt.config.ts` contains both modules in correct order and expected options.
- `.env` contains required secrets/URLs.
- `server/auth.config.ts` and `app/auth.config.ts` both exist and export correct helpers.
- Client plugin parity matches server plugins.
- Protected pages use route rules/page meta.
- Protected APIs call `requireUserSession(event)`.
- Authenticated Convex pages use `useConvexQuery(..., { ssr: false })`.
- Convex schema has user indexes for user-scoped queries.
- File storage (if enabled) has uploads schema + metadata mutation flow.
- Version compatibility rechecked for `@convex-dev/better-auth` / `better-auth` / module tags.

