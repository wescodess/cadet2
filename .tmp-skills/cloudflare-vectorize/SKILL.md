---
name: cloudflare-vectorize
description: Cloudflare Vectorize implementation and troubleshooting guide for vector databases on Cloudflare. Covers index creation, Worker bindings, insert/upsert/query/queryById/get/delete/list operations, namespaces and metadata, Workers AI embeddings integration, Cloudflare Vectorize HTTP API endpoints, and limits/debugging.
---

# Cloudflare Vectorize

## Overview

Use this skill to build and operate Vectorize-backed semantic search and similarity features on Cloudflare.

It focuses on:

- Vectorize index creation and configuration
- Worker bindings (`env.<INDEX_BINDING>`)
- vector CRUD/query operations
- namespaces and metadata usage
- Workers AI embeddings + Vectorize pipelines
- limits and operational debugging

## Start Here

1. Confirm the integration path:
   - `Workers binding` (`env.YOUR_INDEX`)
   - `Cloudflare HTTP API` (`/vectorize/v2/...`)
2. Confirm the workload:
   - embeddings + semantic search
   - recommendations/similarity
   - ID-based nearest-neighbor lookup (`queryById`)
3. Confirm vector schema inputs up front:
   - dimensions
   - distance metric
   - namespace strategy
   - metadata/filtering needs

## High-Value Rules

- Dimensions and distance metric must match your embedding model and are effectively fixed at index creation time.
- Re-check current Vectorize limits before recommending batch sizes, `topK`, or scale assumptions.
- Vectorize writes (`insert`, `upsert`, `delete`) are asynchronous; do not assume immediate query visibility.
- For end-to-end RAG pipelines, combine with `cloudflare-workers-ai`, `cloudflare-ai-gateway`, or `cloudflare-ai-search-autorag` as appropriate.

## Recommended Workflow

1. Read `references/docs-inventory.md`.
2. Set up index + binding using `references/indexes-and-bindings.md`.
3. Implement data pipeline/query logic using `references/index-operations-and-querying.md`.
4. If using Workers AI embeddings, validate dimensions and model output shape first.
5. Re-check limits and tuning constraints before scale/load testing.

## Task Map

- Create and bind a Vectorize index in Workers:
  - `references/indexes-and-bindings.md`
- Use Vectorize API from Workers (`insert/upsert/query/...`):
  - `references/index-operations-and-querying.md`
- Use Cloudflare API endpoints for automation:
  - `references/index-operations-and-querying.md`
- Limits, batching, topK constraints, consistency/debugging:
  - `references/operations-and-limits.md`

## Live Verification (Chrome MCP)

When current behavior matters, fetch these pages directly:

1. `https://developers.cloudflare.com/vectorize/`
2. `https://developers.cloudflare.com/vectorize/get-started/embeddings/`
3. `https://developers.cloudflare.com/vectorize/reference/client-api/`
4. `https://developers.cloudflare.com/vectorize/platform/limits/`
5. `https://developers.cloudflare.com/api/resources/vectorize/`

## Troubleshooting Triage Order

1. Confirm index exists and name/binding match.
2. Confirm dimensions match the embedding model output.
3. Confirm write/query timing (async mutation propagation).
4. Confirm query options (`topK`, `returnValues`, `returnMetadata`) are within limits.
5. Confirm namespace and metadata strategy matches how data was written.
6. Check Cloudflare API/Worker code path mismatch (Workers binding vs HTTP API).

## Reference Files

- `references/docs-inventory.md`
  - Verified docs pages and route notes.
- `references/indexes-and-bindings.md`
  - Index creation, schema planning, Wrangler bindings, Workers AI embeddings tutorial notes.
- `references/index-operations-and-querying.md`
  - Worker API methods, query options, namespaces/metadata, HTTP API endpoints.
- `references/operations-and-limits.md`
  - Limits snapshot, batching/tuning constraints, consistency/debugging checklist.

## Scope Notes

- This skill focuses on Vectorize itself (vector storage/querying).
- It does not replace `cloudflare-workers-ai` for model/task selection or `cloudflare-ai-gateway` for traffic controls.

