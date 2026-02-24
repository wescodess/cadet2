---
name: cloudflare-ai-search-autorag
description: Comprehensive implementation and troubleshooting guide for Cloudflare AI Search (formerly AutoRAG), including dashboard setup, REST APIs, Workers AI bindings, data source onboarding (R2 and Website), indexing/query pipeline tuning, metadata filtering/multitenancy, model configuration, similarity cache, operations, and migration/name inconsistencies. Use when Codex needs to design, configure, query, secure, or debug Cloudflare AI Search / AutoRAG integrations.
---

# Cloudflare AI Search (AutoRAG)

## Overview

Use this skill to build and operate Cloudflare AI Search (formerly AutoRAG) end to end. It covers setup paths (dashboard, REST API, Workers binding), configuration tuning, data source behavior, query APIs, and operational checks with explicit guidance for rapidly changing docs.

## Start Here

1. Confirm which integration path the user needs:
   - Dashboard-only setup
   - REST API usage from an app/backend
   - Workers/Pages binding (`env.AI.autorag(...)`)
   - Cloudflare API resource management (`/client/v4/accounts/.../ai-search/...`)
   - Troubleshooting indexing/crawling/query quality
2. Confirm the data source:
   - `R2`
   - `Website` crawler
3. Re-verify live docs before implementing or debugging production issues (models, limits, and release notes change often).
4. Check naming and endpoint style in the codebase:
   - Docs/UI product name: `AI Search`
   - Older naming still appears in routes/examples: `AutoRAG`, `/autorag/rags/...`
   - Cloudflare API resource path uses `.../ai-search/...`

## High-Value Rules

- Prefer official Cloudflare docs pages and Cloudflare API reference as primary sources.
- Use the AutoRAG launch blog for product architecture context and quick onboarding examples when users ask "how it works under the hood" or want a dashboard-first walkthrough.
- Use Chrome MCP to fetch docs directly (`chrome_get_web_content`, `chrome_network_request`) when the user asks for current details.
- Use `https://developers.cloudflare.com/ai-search/llms-full.txt` as the fastest comprehensive snapshot, then open specific pages for exact behavior.
- Treat models, limits/pricing, and release notes as volatile. Re-check them live before final recommendations.
- Separate the two query modes in code and docs:
  - `ai-search` / `.aiSearch(...)`: retrieve + generate
  - `search` / `.search(...)`: retrieve only
- For website data sources, account for crawler-specific constraints (sitemap/robots, WAF/bot rules, Access-protected content, rendering mode).
- For query quality tuning, adjust in order: query rewriting -> retrieval settings -> reranking -> chunking -> metadata filters -> prompts.

## Recommended Workflow

1. Map the request to one of these tracks:
   - `Provision/manage instance`
   - `Query from app`
   - `Tune retrieval/generation quality`
   - `Fix indexing/crawling issue`
   - `Ops/limits/release-note verification`
2. Read `references/docs-inventory.md` and choose only the relevant page set.
   - If the user asks about AutoRAG internals, launch context, or the Browser Rendering -> R2 tutorial, also read the AutoRAG launch blog notes in `references/how-to-and-operations.md`.
3. If the user asked for "latest/current", fetch the relevant docs pages with Chrome MCP first.
4. Implement with the smallest viable path (dashboard example, REST call, or Worker binding).
5. Validate behavior with a known query and inspect:
   - Returned chunk metadata
   - Match scores / thresholds
   - Filter behavior
   - Reranking / rewrite effects
   - Streaming vs non-streaming behavior
6. For website sources, verify crawler access (`robots.txt`, WAF allow rule, headers for protected content) before changing chunking/models.

## Task Map

- Provisioning and configuration:
  - Read `references/configuration-and-data-sources.md`
- Query APIs and app integration:
  - Read `references/query-apis-and-bindings.md`
- How-to guides, limits, and operational checks:
  - Read `references/how-to-and-operations.md`
- Full docs route coverage / source URLs / refresh targets:
  - Read `references/docs-inventory.md`

## Live Verification (Chrome MCP)

When current behavior matters, fetch docs with Chrome MCP in this order:

1. `https://developers.cloudflare.com/ai-search/llms-full.txt`
   - Comprehensive, LLM-friendly export of the AI Search docs section.
2. The exact page(s) from `references/docs-inventory.md`
   - Use for precise parameter/behavior wording.
3. `https://developers.cloudflare.com/api/resources/ai_search/`
   - Cloudflare API resource operations (instances, items, jobs, tokens).

Prefer `chrome_network_request` for raw text/HTML and `chrome_get_web_content` for readable extraction.

## Troubleshooting Triage Order

1. Confirm instance exists and target account is correct.
2. Confirm auth method and permissions:
   - AI Search token permissions (REST query usage)
   - Cloudflare API token scopes (resource management)
3. Confirm data source health:
   - R2 object presence / supported type / size limit
   - Website crawler access and sitemap discovery
4. Check indexing jobs/logs/stats (Cloudflare API resource endpoints).
5. Validate filters and thresholds before changing models/prompts.
6. Re-check release notes for behavior changes/regressions.

## Reference Files

- `references/docs-inventory.md`
  - Complete AI Search docs route map, API references, MCP/NLWeb links, and refresh checklist.
- `references/configuration-and-data-sources.md`
  - Configuration matrix, R2 + Website data source behavior, crawling, chunking, metadata, models, caching.
- `references/query-apis-and-bindings.md`
  - REST query APIs, Workers binding methods, parameter semantics, response shapes, Cloudflare API management endpoints.
- `references/how-to-and-operations.md`
  - How-to coverage, operational practices, launch blog architecture notes, limits/pricing snapshot, release-note watchpoints.

## Scope Notes

- This skill intentionally keeps volatile values (supported models, release notes chronology, pricing/limits) in reference files plus live-fetch instructions, instead of hardcoding everything into `SKILL.md`.
- If the user asks for exact current values, fetch the page again with Chrome MCP and quote the up-to-date result in the answer.
