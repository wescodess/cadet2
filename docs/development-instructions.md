# Development Instructions

## Prerequisites

- Node.js runtime compatible with the current Nuxt 4 toolchain
- `pnpm` as the preferred package manager
- Environment variables populated from `.env` / `.env.local`

## Install

```bash
pnpm install
```

## Common Commands

```bash
pnpm dev
pnpm build
pnpm generate
pnpm preview
```

## Environment Setup

- Runtime integrations are configured through Nuxt `runtimeConfig`.
- Key categories of required secrets:
  - Cloudflare AI Search
  - Cloudflare AI Gateway
  - OpenRouter
  - RAG admin allowlists
  - Scheduler secret

## Local Development Notes

- Auth and Convex integration depend on session state being available in the browser.
- The RAG admin flows require a valid signed-in user plus admin allowlist configuration.
- There is no established automated test script in `package.json` yet.
