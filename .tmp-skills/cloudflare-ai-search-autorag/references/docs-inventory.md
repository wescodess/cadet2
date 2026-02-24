# Docs Inventory (Cloudflare AI Search / AutoRAG)

Last verified with Chrome MCP on 2026-02-22.

## Primary Sources

- AI Search docs root: `https://developers.cloudflare.com/ai-search/`
- AI Search LLM export (preferred for broad coverage): `https://developers.cloudflare.com/ai-search/llms-full.txt`
- Cloudflare API resource reference (AI Search): `https://developers.cloudflare.com/api/resources/ai_search/`
- AutoRAG launch blog (architecture + tutorial context): `https://blog.cloudflare.com/introducing-autorag-on-cloudflare/`
- AI Search MCP server repo link (from docs sidebar): `https://github.com/cloudflare/mcp-server-cloudflare/tree/main/apps/autorag`

## Naming Notes

- Product name is now `AI Search`.
- Docs still mention former name `AutoRAG`.
- The launch blog uses `AutoRAG` and is still useful for understanding the original product architecture and component mapping (Workers AI + Vectorize + AI Gateway + R2).
- Some query endpoints and examples still use `.../autorag/rags/{AUTORAG_NAME}/...`.
- Cloudflare API resource management uses `.../ai-search/...`.

## AI Search Docs Routes (Sidebar Coverage)

### Overview

- `/ai-search/` - Product overview, feature summary, related products.

### Get started

- `/ai-search/get-started/` - Setup entrypoint and prerequisites.
- `/ai-search/get-started/dashboard/` - Dashboard-based creation flow.
- `/ai-search/get-started/api/` - API-based creation flow.

### Concepts

- `/ai-search/concepts/what-is-rag/` - RAG explanation and use cases.
- `/ai-search/concepts/how-ai-search-works/` - Indexing + querying pipeline internals.

### Search API (usage)

- `/ai-search/usage/workers-binding/` - Workers / Pages binding usage (`env.AI.autorag(...)`).
- `/ai-search/usage/rest-api/` - REST query endpoints (`ai-search` and `search`).

### Configuration (all major tuning surfaces)

- `/ai-search/configuration/` - Configuration matrix and editability.
- `/ai-search/configuration/data-source/` - Data source overview.
- `/ai-search/configuration/data-source/r2/` - R2 source behavior, file types/limits.
- `/ai-search/configuration/data-source/website/` - Website crawler behavior, robots/sitemaps/WAF/access headers.
- `/ai-search/configuration/models/` - Model configuration overview.
- `/ai-search/configuration/models/supported-models/` - Supported generation/embedding/reranking models (volatile).
- `/ai-search/configuration/path-filtering/` - Include/exclude path filtering.
- `/ai-search/configuration/indexing/` - Indexing and sync behavior.
- `/ai-search/configuration/reranking/` - Reranking config.
- `/ai-search/configuration/system-prompt/` - System prompts for rewrite/generation.
- `/ai-search/configuration/query-rewriting/` - Query rewrite toggle/behavior.
- `/ai-search/configuration/retrieval-configuration/` - Match threshold / `top_k` / retrieval settings.
- `/ai-search/configuration/chunking/` - Recursive chunking, size/overlap limits and tradeoffs.
- `/ai-search/configuration/metadata/` - Metadata, filtering, multitenancy patterns.
- `/ai-search/configuration/cache/` - Similarity cache and threshold.
- `/ai-search/configuration/service-api-token/` - Service API token for AI Search to configure account resources.

### How-to

- `/ai-search/how-to/nlweb/` - NLWeb integration.
- `/ai-search/how-to/bring-your-own-generation-model/` - BYO generation model via providers/AI Gateway.
- `/ai-search/how-to/simple-search-engine/` - App integration example.
- `/ai-search/how-to/multitenancy/` - Tenant scoping via metadata/filtering.
- `/ai-search/how-to/brower-rendering-autorag-tutorial/` - Website-to-RAG tutorial (Browser Rendering; route contains typo `brower` in docs path).

### Platform / operations

- `/ai-search/platform/limits-pricing/` - Limits and pricing notes (volatile during beta).
- `/ai-search/platform/release-note/` - Incremental updates and fixes (volatile).

### Other docs-linked surfaces

- `/api/resources/ai_search/` - Cloudflare API resource management for instances/items/jobs/tokens.
- `/ai-search/mcp-server/` - MCP server docs page (sidebar item; content may redirect/point to repo).
- `/ai-search/llms-full.txt` - AI Search LLM-friendly full export.

## Cloudflare API Resource Coverage (AI Search)

From the AI Search API reference page payload/snippets, the resource set includes:

- `ai_search.instances`
  - create
  - list
  - read
  - update
  - delete
  - `search`
  - `chat_completions`
  - `stats`
- `ai_search.instances.items`
  - list
  - get
- `ai_search.instances.jobs`
  - create (trigger sync job)
  - list
  - get
  - logs
- `ai_search.tokens`
  - create
  - list
  - read
  - update
  - delete

## Recommended Refresh Sequence (Chrome MCP)

1. Fetch `llms-full.txt` for broad scan.
2. Fetch exact page(s) needed for implementation.
3. Fetch `/api/resources/ai_search/` if managing instances/jobs/tokens.
4. Re-check:
   - `/configuration/models/supported-models/`
   - `/platform/limits-pricing/`
   - `/platform/release-note/`
