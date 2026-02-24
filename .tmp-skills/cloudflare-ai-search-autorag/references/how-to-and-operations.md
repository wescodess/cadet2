# How-To Guides and Operations

This file summarizes the how-to docs, operational concerns, and a snapshot of limits/release-note themes that frequently affect implementation decisions.

## How-To Guides (Coverage)

Read these pages based on the request:

- `/ai-search/how-to/nlweb/`
  - NLWeb integration patterns (including conversational endpoints such as `/ask` and `/mcp`, as referenced in release notes).
- `/ai-search/how-to/bring-your-own-generation-model/`
  - Configure external generation providers/models (typically through AI Gateway/provider keys).
- `/ai-search/how-to/simple-search-engine/`
  - Minimal app integration pattern for AI-powered search UX.
- `/ai-search/how-to/multitenancy/`
  - Folder/metadata-based tenant scoping and filter strategies.
- `/ai-search/how-to/brower-rendering-autorag-tutorial/`
  - Website-to-RAG workflow using Browser Rendering (docs route includes `brower` typo).

## AutoRAG Launch Blog (Architecture + Tutorial Context)

Read `https://blog.cloudflare.com/introducing-autorag-on-cloudflare/` when the user needs:

- the "why AutoRAG / AI Search exists" product framing
- a concise under-the-hood explanation of indexing vs querying
- a Browser Rendering -> Worker -> R2 -> AutoRAG starter pattern

Launch blog architecture notes (still useful, even after product rename to AI Search):

- AutoRAG/AI Search is built from Cloudflare platform building blocks:
  - `R2` (source files)
  - `Workers AI` (markdown conversion, embeddings, generation, optional query rewrite)
  - `Vectorize` (vector storage / retrieval)
  - `AI Gateway` (model tracking/control)
- The platform runs two core processes:
  - `indexing` (asynchronous background cycles)
  - `querying` (synchronous request path)
- The blog’s indexing pipeline summary aligns with current docs:
  - ingest -> markdown conversion -> chunking -> embedding -> vector storage
- The blog’s querying pipeline summary aligns with current docs:
  - query -> optional rewrite -> embedding -> vector search -> metadata/content retrieval -> response generation

Use the launch blog for conceptual explanations and demos, but prefer current docs/API references for exact endpoints, parameters, limits, and supported models.

## Operational Decision Guide

### Choose R2 vs Website source

Choose `R2` when:

- You control the files directly
- You need stable ingestion from object storage
- You want predictable object keys and path-based filtering

Choose `Website` when:

- Content is already published on a domain in your Cloudflare account
- Sitemap-driven crawling is acceptable
- You need automatic recrawling of site pages

### Choose static vs rendered website parsing

Use static parsing when:

- Content is present in server-rendered/raw HTML
- You want lower cost and simpler debugging

Use rendered parsing when:

- Important content is loaded client-side with JavaScript
- You accept Browser Rendering limits/billing

## Limits and Pricing (Snapshot; Re-Verify)

Read `/ai-search/platform/limits-pricing/`.

Docs snapshot (open beta context):

- AI Search itself is free to enable during open beta.
- Underlying Cloudflare services are billed in the user’s account (R2, Vectorize, Workers AI, AI Gateway, Browser Rendering where used).
- Reported limits include:
  - max AI Search instances per account: `10`
  - max files per AI Search: `100,000`
  - max file size: `4 MB`

These values are explicitly subject to change. Always re-check before quoting them.

## Release Notes (What to Watch)

Read `/ai-search/platform/release-note/`.

The release notes are especially important because AI Search is evolving quickly. High-impact changes called out include:

- Crawler user agent rename to `Cloudflare-AI-Search` (legacy compatibility retained)
- Single sitemap selection option for website crawling
- Sync individual files from dashboard
- Expanded file type support (`.el`, `.htm`)
- Path filtering for website and R2
- Simplified API instance creation
- Website crawler improvements (`<priority>`, `<changefreq>`, `.gz`, partial URLs)
- Indexing performance improvements
- Query rewrite visibility in AI Gateway logs
- Custom HTTP headers for website crawling
- Reranking and API-provided system prompts
- More model/provider support (via AI Gateway/provider keys)
- Website data source and NLWeb integration
- Max query results increased to `50`
- Deleted-file removal on sync (introduced after earlier limitation)
- Jobs view and sync cooldown reduction
- Metadata filtering / multitenancy / filename filtering / custom metadata response support
- Streaming support in Workers binding AI Search method

When a user reports a behavior change, check the release notes before assuming an implementation bug.

## Common Troubleshooting Scenarios

### "Website pages are not indexing"

Check in this order:

1. Domain is on the same Cloudflare account
2. `robots.txt` exposes sitemap(s)
3. Sitemap URLs are valid and reachable
4. WAF/Bot rules allow the AI Search crawler (user agent / Bot Detection ID rule)
5. Protected pages have required headers configured
6. Rendering mode matches site behavior (static vs JS-rendered)
7. File/page size and instance limits are not exceeded
8. Sync jobs/logs show no ingestion/parser errors

### "Search results are irrelevant"

Check:

1. Metadata filters too broad/narrow?
2. `score_threshold` too high?
3. `max_num_results` too low?
4. Query rewriting disabled for natural-language queries?
5. Reranking disabled?
6. Chunking too small/too large?
7. Prompt overriding behavior hiding evidence?

### "Generated answer is bad but retrieval looks good"

Use retrieval-only mode to confirm relevance, then adjust:

- generation model
- generation `system_prompt`
- streaming/non-streaming handling in the client

## Recommended Verification Checklist Before Shipping

1. Re-fetch supported models page and confirm aliases.
2. Re-fetch limits/pricing page and confirm limits.
3. Re-fetch release notes and scan for recent breaking/behavioral changes.
4. Validate one retrieval-only and one retrieve+generate query.
5. Validate metadata filter behavior with a known tenant/file boundary.
6. If website source: validate recrawl path with changed content and sync job.
