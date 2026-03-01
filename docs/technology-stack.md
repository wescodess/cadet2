# Technology Stack

## Core Runtime

| Category | Technology | Version | Why It Matters |
| --- | --- | --- | --- |
| Framework | Nuxt | 4.3.1 | Primary application runtime, routing, and server API host |
| UI Runtime | Vue | 3.5.28 | Component model for pages and UI primitives |
| Language | TypeScript | 5.9.3 | Typed implementation across app, server, and Convex code |
| Package Manager | pnpm | lockfile present | The repo is managed as a pnpm project |

## UI and Frontend

| Category | Technology | Version | Why It Matters |
| --- | --- | --- | --- |
| Styling | Tailwind CSS | 4.2.0 | Utility-first styling for all rendered pages |
| Vite Plugin | @tailwindcss/vite | 4.2.0 | Tailwind is wired directly into Vite |
| Component Layer | shadcn-nuxt | 2.4.3 | Provides generated `app/components/ui/*` primitives |
| Headless UI | reka-ui | 2.8.2 | Underlying accessible primitives for UI components |
| Icons | lucide-vue-next | 0.575.0 | Icon set used by the UI layer |
| Validation | vee-validate / @vee-validate/zod | 4.15.1 | Form validation support for future form-heavy views |

## Auth and Data

| Category | Technology | Version | Why It Matters |
| --- | --- | --- | --- |
| Auth | better-auth | 1.4.9 | Primary session and auth provider |
| Nuxt Auth Bridge | @onmax/nuxt-better-auth | 0.0.2-alpha.29 | Exposes `useUserSession()` and route integration |
| Convex Auth Plugin | @convex-dev/better-auth | 0.10.11 | Mints Convex auth tokens for protected subscriptions |
| Realtime Data | nuxt-convex | 0.0.6 | Client/server integration for Convex |
| Backend Data Runtime | convex | 1.32.0 | Schema, queries, mutations, and job orchestration |
| App Hosting/Data | @nuxthub/core | 0.10.6 | NuxtHub integration with configured PostgreSQL backing |

## Persistence and Utilities

| Category | Technology | Version | Why It Matters |
| --- | --- | --- | --- |
| ORM | drizzle-orm | 0.45.1 | SQL access patterns and schema tooling on the server side |
| Migration Tooling | drizzle-kit | 0.31.9 | Migration generation and management |
| Local PG Runtime | @electric-sql/pglite | 0.3.15 | Embedded PostgreSQL-compatible runtime support |
| Schema Validation | zod | 3.25.76 | Typed schema validation in app-level utilities |
| Vue Utilities | @vueuse/core | 14.2.1 | Shared Vue composables as needed |

## External Integration Targets

- Cloudflare AI Search
- Cloudflare AI Gateway
- OpenRouter
- Cloudflare R2

These are configured through `runtimeConfig` in `nuxt.config.ts` and are intended to remain server-side only.
