# Docs Inventory (Cloudflare Vectorize)

Last verified with Cloudflare docs pages on 2026-02-23.

## Primary Sources

- Vectorize docs root: `https://developers.cloudflare.com/vectorize/`
- Vectorize + Workers AI embeddings tutorial: `https://developers.cloudflare.com/vectorize/get-started/embeddings/`
- Vectorize client API (Workers): `https://developers.cloudflare.com/vectorize/reference/client-api/`
- Vectorize limits: `https://developers.cloudflare.com/vectorize/platform/limits/`
- Cloudflare API resource reference (Vectorize): `https://developers.cloudflare.com/api/resources/vectorize/`

## Coverage Notes

- The docs root is good for product overview and adjacent product links (Workers AI, AI Search).
- The embeddings tutorial is the best source for first-run binding + dimensions + Workers AI integration flow.
- The client API page is the most useful implementation page for Workers methods and query options.
- The Cloudflare API reference page covers `/vectorize/v2/indexes/*` endpoints for automation outside Workers.

## Route Volatility Notes

- Some Vectorize docs routes vary by section naming (`reference`, `platform`, `get-started`).
- If a page 404s, start from the Vectorize root and search for the feature name (for example `client api`, `limits`, `embeddings`).

## Recommended Refresh Sequence

1. `vectorize/` (overview / docs nav)
2. `vectorize/reference/client-api/` (Workers operations)
3. `vectorize/get-started/embeddings/` (end-to-end setup example)
4. `vectorize/platform/limits/` (scale constraints)
5. `/api/resources/vectorize/` (automation / non-Workers integrations)

