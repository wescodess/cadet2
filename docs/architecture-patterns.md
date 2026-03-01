# Architecture Patterns

## Primary Pattern

- **Integrated full-stack Nuxt monolith**
  - One dependency graph and one deployment unit
  - Nuxt owns the page layer and server route layer
  - Convex is embedded as a co-located application data service rather than a separate repository

## Layer Breakdown

- **Presentation Layer**
  - `app/pages/*` contains route-level Vue screens
  - `app/components/ui/*` contains a large shared primitive library generated from the shadcn stack
- **Server/API Layer**
  - `server/api/*` hosts public, admin, and internal endpoints
  - `server/utils/*` holds provider integrations and orchestration helpers
- **Realtime/Data Layer**
  - `convex/*` defines schema, public queries/mutations, and internal ingestion orchestration
- **Planning/Design Layer**
  - `docs/*` captures architectural intent for the RAG subsystem and future phases

## Architectural Characteristics

- **Server-owned secrets**
  - External providers are proxied through Nuxt server routes and utilities
- **Config-driven integrations**
  - Cloudflare and OpenRouter wiring lives in `runtimeConfig`
- **Hybrid persistence**
  - Better Auth uses relational tables (Drizzle-managed migration present)
  - Domain orchestration state for RAG lives in Convex tables
- **Incremental product shape**
  - The repo currently mixes demo flows (auth/tasks) with more developed RAG admin and ingestion scaffolding
