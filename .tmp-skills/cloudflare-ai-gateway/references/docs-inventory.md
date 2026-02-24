# Docs Inventory (Cloudflare AI Gateway)

Last verified with Cloudflare docs pages on 2026-02-23.

## Primary Sources

- AI Gateway docs root: `https://developers.cloudflare.com/ai-gateway/`
- Getting started: `https://developers.cloudflare.com/ai-gateway/get-started/`
- Unified API (OpenAI compat): `https://developers.cloudflare.com/ai-gateway/usage/chat-completion/`
- Caching: `https://developers.cloudflare.com/ai-gateway/configuration/caching/`
- Rate limiting: `https://developers.cloudflare.com/ai-gateway/configuration/rate-limiting/`
- Fallbacks: `https://developers.cloudflare.com/ai-gateway/configuration/fallbacks/`
- Workers AI provider integration: `https://developers.cloudflare.com/ai-gateway/providers/workersai/`
- Analytics: `https://developers.cloudflare.com/ai-gateway/observability/analytics/`
- Logging: `https://developers.cloudflare.com/ai-gateway/observability/logging/`
- Custom costs: `https://developers.cloudflare.com/ai-gateway/configuration/custom-costs/`

## Verified Coverage Notes

- Docs root emphasizes:
  - analytics/logging
  - caching
  - rate limiting
  - request retry / fallback concepts
  - multi-provider routing
- Getting started page documents:
  - dashboard creation flow
  - authenticated gateway recommendation
  - auth options (Unified Billing / BYOK / request headers)
  - OpenAI-compatible and direct provider endpoint formats

## Route Volatility Notes

- AI Gateway docs search results may occasionally surface stale routes (observed 404s for some retry pages).
- If a page 404s, start from the docs root and search by feature name (for example `fallbacks`, `rate limiting`, `logging`).

## Recommended Refresh Sequence

1. `ai-gateway/` (overview and feature set)
2. `ai-gateway/get-started/` (current endpoint/auth setup)
3. `ai-gateway/usage/chat-completion/` (OpenAI-compatible behavior)
4. `configuration/*` pages for controls you need
5. `observability/*` pages for analytics/logging behavior

