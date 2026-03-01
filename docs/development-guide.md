# Development Guide

## Setup

1. Install dependencies with `pnpm install`.
2. Ensure `.env` or `.env.local` provides the required runtime configuration.
3. Run the local dev server with `pnpm dev`.

## Core Workflows

- Use `pnpm dev` for local feature work
- Use `pnpm build` to validate production bundling
- Use `pnpm preview` to smoke-test the built app locally

## Key Areas To Understand Before Editing

- `app/pages/*` for feature screens
- `server/api/*` for HTTP contracts
- `server/utils/*` for provider logic and orchestration
- `convex/*` for schema and domain workflows

## Feature-Specific Notes

- Auth-dependent pages rely on `useUserSession()`
- Convex-backed UI depends on client auth synchronization
- Admin RAG flows require allowlisted admin config and provider credentials

## Testing Status

- No formal project test suite is defined yet
- Treat `pnpm build` and targeted manual verification as the current minimum validation bar
