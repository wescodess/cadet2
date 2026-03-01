---
project_name: 'cadet2'
user_name: 'Wesleyukadike'
date: '2026-03-01T00:00:00-05:00'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
existing_patterns_found: 8
status: 'complete'
rule_count: 44
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- Framework: Nuxt `4.3.1` on Vue `3.5.28`
- Language: TypeScript `5.9.3` with Nuxt-generated tsconfig references
- Styling: Tailwind CSS `4.2.0` via `@tailwindcss/vite`, `tw-animate-css` `1.4.0`
- UI layer: `shadcn-nuxt` `2.4.3`, `reka-ui` `2.8.2`, `lucide-vue-next` `0.575.0`
- Auth: `better-auth` `1.4.9`, `@onmax/nuxt-better-auth` `0.0.2-alpha.29`, `@convex-dev/better-auth` `0.10.11`
- Data/backend: `nuxt-convex` `0.0.6`, `convex` `1.32.0`, `@nuxthub/core` `0.10.6`
- Persistence tooling: `drizzle-orm` `0.45.1`, `drizzle-kit` `0.31.9`, `@electric-sql/pglite` `0.3.15`
- Validation/utilities: `zod` `3.25.76`, `vee-validate` `4.15.1`, `@vee-validate/zod` `4.15.1`, `@vueuse/core` `14.2.1`
- External platform targets already wired in config/docs: Cloudflare AI Search, Cloudflare AI Gateway, OpenRouter, Cloudflare R2

## Critical Implementation Rules

### Language-Specific Rules

- Use TypeScript everywhere with explicit local types for request payloads, config shapes, and helper inputs when the shape is not trivially inferred.
- In Nuxt server routes, define request body contracts close to the handler (for example `type QueryRequestBody = { ... }`) and read with `readBody<T>(event)`.
- Validate unknown input with runtime narrowing before use. Existing code uses small guard helpers such as `toOptionalBoolean()` and `toOptionalNumber()` instead of trusting client payloads.
- Throw `createError(...)` for invalid input or missing server configuration instead of returning ad hoc error objects.
- Keep helper functions small and typed. Shared logic is factored into top-level local functions rather than buried inline in handlers.
- Prefer `async`/`await` over raw promise chains in server code.
- In Convex code, use `v.*` validators for all query/mutation args and schema fields rather than relying on TypeScript types alone.
- Keep Convex schema and server code serializable and explicit; use primitive values, arrays, objects, and documented unions instead of opaque custom class instances.
- Preserve the current import style: ESM imports, type-only imports where appropriate, and short relative imports for nearby server utilities.

### Framework-Specific Rules

- Respect the Nuxt 4 structure already in use: routes belong in `app/pages`, reusable UI in `app/components`, shared client utilities in `app/lib`, API handlers in `server/api`, and server-only helpers in `server/utils`.
- Use Vue Single File Components with `<script setup lang="ts">` for pages and components.
- Keep browser-only screens on the existing `.client.vue` pattern when they depend on client runtime behavior.
- Use Nuxt composables and globals directly where the project already does so (for example `useUserSession()`, `$fetch`, `useRuntimeConfig(event)`, `defineEventHandler`).
- Keep the current security boundary intact: pages and components must not call third-party provider APIs directly when secrets are required; they should call local server routes instead.
- Runtime configuration belongs in `nuxt.config.ts` and is accessed through `useRuntimeConfig(...)`; do not hardcode provider IDs, tokens, or environment-specific values in app code.
- Reuse the existing `app/components/ui/*` shadcn wrappers rather than introducing duplicate base components or bypassing the current UI primitive layer without a strong reason.
- Preserve the current Tailwind-first template style. Most presentation is expressed inline in class strings rather than moved into custom CSS.
- Keep Convex concerns inside the `convex/` boundary and integrate them through the established Nuxt/Better Auth wiring instead of inventing parallel auth or data access flows.

### Testing Rules

- No project-level automated test framework is configured yet. Do not assume Vitest, Playwright, Jest, or Cypress conventions unless the task explicitly introduces them.
- Do not add test files, test scripts, or coverage requirements as if they already exist; first align them with the requested task or with a deliberate testing setup change.
- When making changes in existing code, prefer lightweight verification that matches the current repo state (for example build-safe code paths, type-safe edits, and local manual validation assumptions) rather than inventing unsupported test harnesses.
- If a task requires automated tests, choose tooling that fits the current stack (Nuxt + Vue + TypeScript) and establish the convention explicitly instead of mixing multiple test styles ad hoc.
- Keep server-side behavior testable by preserving small typed helpers and narrow input validation boundaries, since that is the current code organization pattern.
- Avoid coupling future tests directly to third-party secrets or live provider APIs; the existing architecture expects external integrations to stay behind local server routes.

### Code Quality & Style Rules

- Prefer the configured aliases from `components.json` (`@/components`, `@/lib`, `@/components/ui`, `@/composables`) for shared app code instead of deep relative imports.
- Keep page and route filenames in Nuxt-friendly lowercase/kebab-case patterns, while reusable Vue component files remain PascalCase inside their feature folders.
- Follow the existing shadcn file pattern for UI primitives: one folder per primitive, PascalCase component files, and an `index.ts` barrel for exports.
- Use `app/lib/utils.ts` and `cn()` for class merging instead of reimplementing class concatenation logic.
- Keep comments sparse and useful. Add comments only when a constraint or non-obvious decision needs preservation.
- Stay consistent with utility-first styling in templates; avoid creating one-off style systems or moving routine styling into custom CSS files without cause.
- Keep docs and architecture notes in `docs/*.md` when a change affects platform behavior, integration boundaries, or data model expectations.

### Development Workflow Rules

- Respect the current lightweight script surface in `package.json`; do not add new scripts or tooling unless the task actually requires them.
- Keep secrets in environment variables and Nuxt runtime config. Never move tokens, account IDs, or provider credentials into committed app code.
- Avoid casual dependency churn. New packages should be introduced only when they materially support the requested change and fit the current Nuxt/Vue stack.
- When changing architecture-level behavior for RAG ingestion, search, auth, or data flow, update the relevant `docs/*.md` draft so implementation and planning stay aligned.
- Preserve established integration boundaries: Nuxt handles HTTP/API orchestration, Convex handles schema and app data functions, and external providers stay behind server utilities.
- Treat `.env` and runtime-backed configuration as deployment inputs, not as places to encode behavior that belongs in source-controlled code.

### Critical Don't-Miss Rules

- Do not expose Cloudflare, OpenRouter, or auth secrets to client-side code; all privileged calls must stay in server routes or server utilities.
- Do not bypass local Nuxt API routes from pages/components when interacting with external providers that require credentials.
- Do not hardcode Cloudflare AI Search instance identifiers, gateway settings, or tenant-specific values in components; read them from runtime config or server-side inputs.
- Preserve the existing AI Search retrieval safeguard: content-only flows currently filter to `latest.md` to avoid `meta.json` artifacts degrading retrieval quality.
- Do not rename Convex tables or indexes casually; those names encode data access patterns and operational assumptions used across the codebase and docs.
- Do not introduce parallel auth, UI, or data-access abstractions when the project already has Better Auth, shadcn/reka, and Convex integration paths in place.
- When unsure, prefer the more restrictive boundary: server over client, typed validation over implicit trust, and reuse of existing primitives over new abstractions.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code.
- Follow all rules exactly as documented.
- When in doubt, prefer the more restrictive option.
- Update this file if new patterns emerge.

**For Humans:**

- Keep this file lean and focused on agent needs.
- Update it when the technology stack changes.
- Review it periodically for outdated rules.
- Remove rules that become obvious over time.

Last Updated: 2026-03-01
