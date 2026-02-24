# Docs Inventory (Cloudflare Workers AI)

Last verified with Cloudflare docs pages on 2026-02-23.

## Primary Sources

- Workers AI docs root: `https://developers.cloudflare.com/workers-ai/`
- Workers AI get started (Workers + Wrangler): `https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/`
- Workers AI get started (REST API): `https://developers.cloudflare.com/workers-ai/get-started/rest-api/`
- Workers AI model catalog: `https://developers.cloudflare.com/workers-ai/models/`
- Workers AI pricing: `https://developers.cloudflare.com/workers-ai/platform/pricing/`
- Workers AI function calling: `https://developers.cloudflare.com/workers-ai/features/function-calling/`

## Verified Coverage Notes

- The docs root highlights:
  - serverless GPU inference
  - Worker/Pages and API invocation paths
  - model catalog
  - plans/limits/use cases/storage options links
- The model catalog page is the best route for:
  - task categories
  - currently listed model families
  - badges such as `Function calling`, `Batch`, `LoRA`, `Partner`, `Real-time`
- Pricing is published in `Neurons` and changes over time.

## Route Watchpoints

- Workers AI docs pages can move between `features/`, `usage/`, and `get-started/` sections.
- If a known route returns `404`, start from the docs root and search by feature name (for example `function calling`, `REST API`, `pricing`).

## Recommended Refresh Sequence

1. `workers-ai/` (overview and nav sanity check)
2. `workers-ai/models/` (model availability and capabilities)
3. `workers-ai/get-started/rest-api/` or `workers-wrangler/` (integration path)
4. `workers-ai/platform/pricing/` (pricing/neurons snapshot)
5. Task-specific page (for example `features/function-calling/`)

