# Routing and Endpoints

This file summarizes the main endpoint styles and integration patterns for AI Gateway.

## Endpoint Styles

### 1. OpenAI-compatible Unified API (recommended starting point)

Docs page:

- `/ai-gateway/usage/chat-completion/`

Endpoint shape:

- `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/compat/chat/completions`

Use this when:

- you want a drop-in OpenAI SDK style integration
- you need multi-provider switching with minimal code changes
- you want to use model names in `{provider}/{model}` format

Docs examples highlight model naming like:

- `openai/gpt-5.2`
- `google-ai-studio/gemini-2.5-flash`
- `anthropic/claude-sonnet-4-5`
- `workers-ai/{model}` (via compat endpoint)

### 2. Direct Provider Endpoint

Docs getting started page shows:

- `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/{provider}`

Use this when:

- you want provider-native request schemas
- you are integrating an existing provider client flow with minimal translation

## Auth and Provider Credential Patterns

Docs getting started page lists these options:

- `Unified Billing`
- `BYOK (Store Keys)`
- provider credentials in request headers (for example `Authorization: Bearer ...`)

The docs also recommend using an authenticated gateway to require a valid Cloudflare API token on each request.

## Workers AI Through AI Gateway

Docs page:

- `/ai-gateway/providers/workersai/`

### REST path rewrite

Workers AI direct:

- `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model_id}`

Workers AI through AI Gateway:

- `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/workers-ai/{model_id}`

### OpenAI-compatible Workers AI path

Docs also show OpenAI-compatible Workers AI requests through AI Gateway:

- `.../workers-ai/v1/chat/completions`

and compat route usage with:

- `{ "model": "workers-ai/{model}" }`

### Worker Binding Integration (Workers AI binding + gateway options)

Docs show passing gateway options in `env.AI.run(..., ..., { gateway: { ... } })` with fields such as:

- `id`
- `skipCache`
- `cacheTtl`

Use this when:

- you already use `env.AI` in a Worker
- you want AI Gateway caching/observability without changing to HTTP calls

## Practical Selection Guide

Choose `compat/chat/completions` when:

- using OpenAI SDKs/tools
- switching providers frequently
- standardizing app code on one chat endpoint

Choose direct provider endpoints when:

- provider-native schemas/features matter
- you need minimal abstraction during debugging

