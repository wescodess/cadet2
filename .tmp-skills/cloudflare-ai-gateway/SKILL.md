---
name: cloudflare-ai-gateway
description: Cloudflare AI Gateway integration and operations guide for routing, observing, and controlling AI provider traffic. Covers OpenAI-compatible unified API, provider endpoints, Workers AI integration, caching, rate limiting, fallbacks, logging, analytics, and request-level control headers.
---

# Cloudflare AI Gateway

## Overview

Use this skill to configure and troubleshoot Cloudflare AI Gateway for AI traffic routing, observability, and controls.

It focuses on:

- OpenAI-compatible unified API (`/compat/chat/completions`)
- direct provider endpoints (`/{provider}`)
- Workers AI + AI Gateway integration
- caching, rate limiting, fallbacks
- logging, analytics, and cost tracking
- request-level override headers

## Start Here

1. Confirm integration style:
   - `OpenAI-compatible unified API`
   - `direct provider endpoint`
   - `Workers AI via AI Gateway`
   - `Worker binding with gateway options`
2. Confirm goal:
   - observability
   - caching/cost reduction
   - traffic control / rate limiting
   - resilience (fallbacks)
3. Confirm auth mode:
   - authenticated gateway + Cloudflare token
   - Unified Billing
   - BYOK (stored provider keys)
   - provider keys passed in request headers

## High-Value Rules

- Prefer official AI Gateway docs pages for exact header names and route shapes.
- Treat docs navigation/search results as slightly volatile (some indexed routes can 404); re-open from docs root if needed.
- Use AI Gateway when the user needs cross-provider observability or controls; use provider-specific skills (for example Workers AI) for model/task details.
- Validate headers and endpoints with a single request before enabling widespread routing/fallback logic.

## Recommended Workflow

1. Read `references/docs-inventory.md`.
2. Pick the endpoint style from `references/routing-and-endpoints.md`.
3. Add controls/headers from `references/controls-and-observability.md`.
4. Validate:
   - success path
   - cache behavior
   - rate limiting behavior
   - fallback behavior (if configured)
5. Review logs/analytics in dashboard for real traffic confirmation.

## Task Map

- OpenAI SDK drop-in / unified endpoint:
  - `references/routing-and-endpoints.md`
- Direct provider routing (OpenAI, Anthropic, Workers AI, etc.):
  - `references/routing-and-endpoints.md`
- Workers AI + AI Gateway integration:
  - `references/routing-and-endpoints.md`
- Caching / rate limiting / fallbacks / logs / analytics:
  - `references/controls-and-observability.md`

## Live Verification (Chrome MCP)

When current behavior matters, fetch these pages directly:

1. `https://developers.cloudflare.com/ai-gateway/`
2. `https://developers.cloudflare.com/ai-gateway/get-started/`
3. `https://developers.cloudflare.com/ai-gateway/usage/chat-completion/`
4. `https://developers.cloudflare.com/ai-gateway/configuration/caching/`
5. `https://developers.cloudflare.com/ai-gateway/configuration/rate-limiting/`
6. `https://developers.cloudflare.com/ai-gateway/configuration/fallbacks/`
7. `https://developers.cloudflare.com/ai-gateway/observability/analytics/`
8. `https://developers.cloudflare.com/ai-gateway/observability/logging/`

## Troubleshooting Triage Order

1. Confirm gateway exists and the gateway name is correct.
2. Confirm route shape:
   - unified compat endpoint vs direct provider endpoint
3. Confirm auth path:
   - Cloudflare token / authenticated gateway
   - BYOK stored provider key
   - provider header passthrough
4. Confirm provider/model naming format (especially unified API `provider/model`).
5. Inspect response headers for AI Gateway behavior:
   - cache status
   - fallback step
6. Check dashboard logs and analytics for provider errors/cost spikes.

## Reference Files

- `references/docs-inventory.md`
  - Verified source pages and route map for AI Gateway docs.
- `references/routing-and-endpoints.md`
  - Unified API, provider endpoints, Workers AI integration patterns.
- `references/controls-and-observability.md`
  - Caching, rate limiting, fallbacks, logging, analytics, custom cost headers.

## Scope Notes

- This skill is for the gateway layer (routing, controls, observability).
- For model-task implementation details (payloads, model selection), use the appropriate provider skill (for example `cloudflare-workers-ai`).

