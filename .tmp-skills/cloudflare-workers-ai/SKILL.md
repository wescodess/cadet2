---
name: cloudflare-workers-ai
description: Cloudflare Workers AI implementation and troubleshooting guide for serverless AI inference on Cloudflare. Covers Wrangler AI bindings, REST API usage, model catalog selection, function calling, pricing/neurons, and operational debugging. Use when building or debugging Workers AI integrations in Workers, Pages, or backend services.
---

# Cloudflare Workers AI

## Overview

Use this skill to build, operate, and troubleshoot Cloudflare Workers AI integrations.

It focuses on:

- Worker/Pages bindings (`env.AI`)
- REST API execution (`/ai/run/{model}`)
- model selection from the Workers AI catalog
- function-calling workflows
- pricing/neurons/limits checks

## Start Here

1. Confirm the integration path:
   - `Worker/Pages binding`
   - `REST API`
   - `Workers AI + AI Gateway`
2. Confirm the task type:
   - text generation
   - embeddings
   - classification/reranking
   - image/audio/speech
3. Re-check current docs for:
   - model availability
   - pricing/neurons
   - task-specific parameters

## High-Value Rules

- Prefer official Cloudflare docs as the source of truth.
- Treat model availability and pricing as volatile.
- Use the model catalog page to confirm task support and badges (for example `Function calling`, `Batch`, `LoRA`) before recommending a model.
- For app-level observability/caching/fallback/rate-limits, route to the `cloudflare-ai-gateway` skill.

## Recommended Workflow

1. Read `references/docs-inventory.md` and select the relevant pages.
2. For first-time setup:
   - read `references/bindings-and-rest-api.md`
   - then read `references/models-and-capabilities.md`
3. For production planning or cost questions:
   - read `references/operations-and-debugging.md`
4. Validate with one known-good inference request before optimizing prompts/params.

## Task Map

- Worker or Pages binding setup:
  - `references/bindings-and-rest-api.md`
- REST API usage from backend/scripts:
  - `references/bindings-and-rest-api.md`
- Model selection / task support / function calling:
  - `references/models-and-capabilities.md`
- Cost, limits, troubleshooting, production checks:
  - `references/operations-and-debugging.md`

## Live Verification (Chrome MCP)

When current behavior matters, fetch these pages directly:

1. `https://developers.cloudflare.com/workers-ai/`
2. `https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/`
3. `https://developers.cloudflare.com/workers-ai/get-started/rest-api/`
4. `https://developers.cloudflare.com/workers-ai/models/`
5. `https://developers.cloudflare.com/workers-ai/platform/pricing/`
6. `https://developers.cloudflare.com/workers-ai/features/function-calling/` (if tool/function calling is involved)

## Troubleshooting Triage Order

1. Confirm auth and account:
   - account ID is correct
   - token exists and has the needed Workers AI access
2. Confirm route shape:
   - Worker binding (`env.AI.run`)
   - or REST API (`/client/v4/accounts/{ACCOUNT_ID}/ai/run/{model}`)
3. Confirm the selected model supports the task.
4. Confirm request payload shape matches the model/task (prompt/messages/text/audio/image input).
5. Check pricing/neurons/limits if requests fail under load or burst usage.
6. If reliability/observability controls are needed, front the requests with AI Gateway.

## Reference Files

- `references/docs-inventory.md`
  - Verified source pages and route map for Workers AI docs.
- `references/bindings-and-rest-api.md`
  - Worker binding and REST API integration patterns.
- `references/models-and-capabilities.md`
  - Model catalog usage, task mapping, function-calling notes.
- `references/operations-and-debugging.md`
  - Pricing/neurons snapshot, limits guidance, debugging checklist.

## Scope Notes

- This skill is for Workers AI itself (inference platform and APIs).
- It intentionally does not duplicate AI Gateway routing/caching/fallback docs; use `cloudflare-ai-gateway` for that.

