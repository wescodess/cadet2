# Deployment Guide

## Current Deployment Shape

- This repository is configured as a Nuxt application with environment-backed runtime configuration.
- `@nuxthub/core` indicates the app expects a PostgreSQL-backed runtime context.

## Required Configuration Domains

- Cloudflare AI Search
- Cloudflare AI Gateway
- OpenRouter
- RAG admin allowlists
- Scheduler secret

## Build and Release Baseline

```bash
pnpm build
pnpm preview
```

## Gaps To Resolve Before Production Hardening

- No checked-in CI pipeline
- No checked-in container or infrastructure manifests
- No checked-in production deployment runbook
- No formal automated test suite

## Practical Recommendation

- Treat deployment as environment- and platform-managed until the repo adds explicit infrastructure or CI assets.
