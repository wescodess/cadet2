# Models and Capabilities

This file summarizes how to use the Workers AI model catalog for implementation decisions.

## Model Catalog (`/workers-ai/models/`)

Use the catalog page to verify current availability before coding. The page exposes:

- task categories (for example `Text Generation`, `Text Embeddings`, `Text-to-Image`, `ASR`, `TTS`, `Classification`)
- providers/authors
- model descriptions
- capability badges (for example `Function calling`, `Batch`, `LoRA`, `Partner`, `Real-time`)

## Practical Selection Flow

1. Pick the task first:
   - generation
   - embedding / retrieval
   - reranking / classification
   - image/audio/speech
2. Filter for capability needs:
   - `Function calling`
   - `Batch`
   - `Real-time`
   - `LoRA`
3. Validate the exact model ID and input schema before implementation.

## Function Calling

Docs page:

- `https://developers.cloudflare.com/workers-ai/features/function-calling/`

Key points called out in the docs:

- function calling uses tool definitions / schemas
- Workers AI supports embedded function-calling workflows
- `@cloudflare/ai-utils` is provided for embedded tool execution helpers
- model catalog badges indicate which models support function calling

When implementing:

1. Confirm the chosen model is marked for function calling in the catalog.
2. Keep tool schemas small and explicit.
3. Validate tool output and error handling outside the model loop.

## Model Volatility Notes

- The catalog changes frequently (new models, deprecations, badge changes).
- Never hardcode a recommendation without re-checking the catalog page.
- For production systems, prefer a vetted allowlist of model IDs in config.

## Common Mistakes

- Choosing a model that does not support the requested task.
- Assuming OpenAI-style message payloads for all models/tasks.
- Reusing one payload shape across embeddings/generation/classification.
- Ignoring model capability badges (especially `Function calling` and `Real-time`).

