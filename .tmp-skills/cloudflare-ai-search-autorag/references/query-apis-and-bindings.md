# Query APIs and Bindings

This file covers the two primary query interfaces (REST and Workers binding) plus the Cloudflare API management endpoints used to provision and operate AI Search instances.

## Two Query Modes (Important)

AI Search exposes two distinct retrieval interfaces:

- `AI Search` mode (`ai-search`, `.aiSearch(...)`)
  - Retrieves relevant chunks and generates an answer.
- `Search` mode (`search`, `.search(...)`)
  - Retrieves relevant chunks only (no generated answer).

Use retrieval-only mode when:

- The app does custom prompting with another model
- You need deterministic retrieval inspection/debugging
- You want to separate retrieval from generation cost/latency

## REST Query API (Docs Usage Page)

Read `/ai-search/usage/rest-api/`.

Docs examples currently use the legacy-style path format:

- `POST /client/v4/accounts/{ACCOUNT_ID}/autorag/rags/{AUTORAG_NAME}/ai-search`
- `POST /client/v4/accounts/{ACCOUNT_ID}/autorag/rags/{AUTORAG_NAME}/search`

### Common request fields (query APIs)

These are documented across both REST endpoints and the Workers binding methods:

- `query` (required string)
- `rewrite_query` (optional boolean, default `false`)
- `max_num_results` (optional number, default `10`, range `1..50`)
- `ranking_options.score_threshold` (optional number `0..1`)
- `reranking.enabled` (optional boolean)
- `reranking.model` (optional string)
- `filters` (optional object, metadata-based filtering)

`ai-search` / generated-answer mode also supports:

- `model` (optional generation model override)
- `system_prompt` (optional per-query generation system prompt)
- `stream` (optional boolean, default `false`)

### Response shapes

Both response types return a search-result page object with:

- `object`
- `search_query`
- `data` (matched results/chunks)
- pagination fields (`has_more`, `next_page`)

Generated-answer mode additionally returns a generated `response` field.

When debugging, inspect:

- `score`
- `attributes` (metadata such as `folder`, timestamps)
- chunk `content`

## Workers / Pages Binding

Read `/ai-search/usage/workers-binding/`.

### Binding setup

Docs show using an AI binding in Wrangler, typically:

- `ai.binding = "AI"` in `wrangler.jsonc` or `wrangler.toml`

### Methods

- `env.AI.autorag("<instance>").aiSearch({...})`
  - retrieve + generate
- `env.AI.autorag("<instance>").search({...})`
  - retrieve only

The parameter semantics largely mirror the REST usage page, including:

- `rewrite_query`
- `max_num_results`
- `ranking_options.score_threshold`
- `reranking`
- `filters`
- `stream` (for `.aiSearch`)

### Local development note

Docs mention local development works by proxying requests to the deployed AI Search instance (remote-backed behavior during local runs).

## Cloudflare API Resource Management (Provisioning / Ops)

Read `https://developers.cloudflare.com/api/resources/ai_search/`.

This is the account-scoped Cloudflare API resource surface for managing AI Search instances and operational objects.

## Observed Resource Groups and Operations

### `ai_search.instances`

- `create`
- `list`
- `read`
- `update`
- `delete`
- `search`
- `chat_completions`
- `stats`

### `ai_search.instances.items`

- `list`
- `get`

Use this to inspect indexed items and item-level metadata/state.

### `ai_search.instances.jobs`

- `create`
- `list`
- `get`
- `logs`

Use this to:

- trigger sync jobs
- inspect job status
- inspect job logs during indexing failures

### `ai_search.tokens`

- `create`
- `list`
- `read`
- `update`
- `delete`

These represent Cloudflare-managed AI Search token resources used for service/API permissions.

## Endpoint Style Mismatch (Use Carefully)

There are currently multiple endpoint styles in docs/examples:

- Legacy/usage docs: `/autorag/rags/{name}/...`
- Cloudflare API resource docs: `/ai-search/instances/{id}/...`

When implementing:

1. Pick the surface that matches the user’s integration.
2. Do not blindly swap paths between examples.
3. Verify the exact endpoint in the current docs/API reference before finalizing code.

## Practical Integration Patterns

### Pattern A: Fast app integration with Worker binding

- Best for Workers/Pages apps already using AI bindings.
- Use `.search()` first while tuning retrieval.
- Switch to `.aiSearch()` when retrieval quality is acceptable.

### Pattern B: Backend service using REST usage endpoints

- Best for non-Workers backends.
- Use per-query `model` / `system_prompt` overrides for experimentation.
- Use `stream: true` only if the client path supports streamed responses.

### Pattern C: Platform automation / operations via Cloudflare API resources

- Provision instances in IaC or scripts
- Trigger jobs and read logs
- Inspect stats and indexed items
- Manage AI Search tokens

## Debug Checklist for Query Quality Issues

1. Run retrieval-only (`search`) first.
2. Check `data` contains the expected files/chunks.
3. Lower/increase `score_threshold` appropriately.
4. Increase `max_num_results` (within `1..50`) if relevant chunks are missing.
5. Enable query rewriting.
6. Enable reranking.
7. Add metadata filters.
8. Only then refine `system_prompt` / generation model.

