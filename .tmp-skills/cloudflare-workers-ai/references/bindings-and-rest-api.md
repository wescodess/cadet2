# Bindings and REST API

This file covers the two primary ways to invoke Workers AI: Worker/Pages bindings and the Cloudflare REST API.

## Worker / Pages Binding (`env.AI`)

For Workers projects, docs show binding Workers AI in Wrangler:

- `wrangler.jsonc` / `wrangler.toml`
- `ai.binding = "AI"`

After binding, the runtime object is available on:

- `env.AI`

### Typical Invocation Pattern

Docs use:

- `await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { prompt: "..." })`

Use this path when:

- your app already runs on Workers/Pages
- you want the simplest integration
- you may later add AI Gateway via Worker-side integration

## REST API (Cloudflare API)

Docs get-started page shows the REST execution endpoint:

- `POST /client/v4/accounts/{ACCOUNT_ID}/ai/run/{model}`

Example pattern (text generation):

- `Authorization: Bearer {API_TOKEN}`
- JSON body with task-specific inputs (for example `prompt`)

Docs explicitly instruct users to get:

- `Account ID`
- a Workers AI API token (via dashboard flow)

### Example Route Shape

- `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`

Use REST API when:

- your backend is not a Worker
- you are testing quickly from terminal/scripts
- you need a provider-style HTTP integration first

## Choosing Binding vs REST

Choose `env.AI` binding when:

- you are building a Worker/Pages app
- you want fewer moving parts and less explicit auth handling in app code

Choose REST API when:

- you are integrating from another runtime/service
- you need CLI/cURL reproducibility for debugging
- you are prototyping outside Cloudflare Workers

## Minimal Validation Checklist

1. Confirm account ID is correct.
2. Confirm token exists and is valid for Workers AI usage.
3. Confirm model ID exists in the catalog.
4. Confirm payload shape matches the chosen model/task.
5. Run one small request before scaling throughput/concurrency.

## Cross-Skill Note: AI Gateway

If the user asks for:

- caching
- rate limiting
- retries/fallbacks
- analytics/logging across providers

route to `cloudflare-ai-gateway` (or use it alongside this skill).

