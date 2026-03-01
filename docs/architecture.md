# Architecture

## Executive Summary

This repository is an integrated Nuxt 4 monolith that combines:

- a Vue-based UI layer
- a Nuxt server route layer
- Convex-backed application data and job orchestration
- a planned RAG ingestion subsystem built around Cloudflare AI Search, Cloudflare AI Gateway, OpenRouter, and R2

The product currently blends two maturity levels:

- a minimal auth + protected task demo
- a more advanced RAG admin and ingestion scaffold

## Technology Stack

- Nuxt 4.3.1
- Vue 3.5.28
- TypeScript 5.9.3
- Tailwind CSS 4
- Better Auth
- nuxt-convex + Convex
- NuxtHub PostgreSQL integration

## Architecture Pattern

- **Integrated full-stack web monolith**
  - One root package
  - One app shell
  - Co-located backend boundaries

## Data Architecture

- **Relational auth data**
  - Better Auth tables are managed through the checked-in SQL migration
- **Convex operational state**
  - RAG administration, source lifecycle, batch runs, and sync jobs are stored in Convex
- **External content storage**
  - The RAG drafts indicate normalized content is intended for Cloudflare R2, with AI Search indexing over that content

## API Design

- Nuxt server routes are the explicit HTTP boundary
- Public browser-safe provider access is proxied through server routes
- Admin routes enforce allowlisted user access
- Internal scheduler routes are secret-protected

## Component Overview

- Route-level screens live in `app/pages/*`
- Shared UI primitives live in `app/components/ui/*`
- Feature composition is still mostly page-local rather than broken into many feature-specific components

## Source Tree

- `app/` handles rendering and browser-facing logic
- `server/` handles HTTP routes and provider orchestration
- `convex/` handles schema, queries, mutations, and internal orchestration
- `docs/` holds system design and generated brownfield context

## Development Workflow

- Standard lifecycle commands are `pnpm dev`, `pnpm build`, `pnpm generate`, and `pnpm preview`
- Environment configuration is required for RAG features
- The repository currently lacks a formal test runner or contributor policy

## Deployment Architecture

- Config-driven Nuxt deployment
- No checked-in infrastructure manifests
- Runtime secrets and service identifiers are provided externally

## Testing Strategy

- Current validation is code- and config-centric rather than test-suite-centric
- Future automated tests should be introduced deliberately, because the repo does not yet define a formal testing stack
