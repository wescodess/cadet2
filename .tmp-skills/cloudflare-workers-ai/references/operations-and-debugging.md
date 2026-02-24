# Operations and Debugging

This file summarizes pricing, limits considerations, and debugging practices for Workers AI integrations.

## Pricing (Neurons)

Workers AI pricing docs (`/workers-ai/platform/pricing/`) describe billing primarily in `Neurons`.

Verified snapshot on 2026-02-23 docs page:

- Workers AI is included in Free and Paid Workers plans
- price reference headline: `$0.011 per 1,000 Neurons`
- free allocation headline: `10,000 Neurons per day`
- limits reset daily at `00:00 UTC`

These values can change. Re-check before quoting to users.

## Operational Implications

- "Works locally but fails in production" can be quota/throughput related.
- Budget estimation must be model-specific; neuron cost varies by model/task.
- Cost/latency tradeoffs often come from model choice more than code changes.

## Debug Checklist

### Auth / Account errors

Check:

1. token validity
2. correct account ID
3. route shape (`/ai/run/{model}`)

### Request validation / model mismatch

Check:

1. model exists in current catalog
2. task matches model capability
3. body schema matches task input (`prompt`, `messages`, `text`, etc.)

### Unexpected cost or rate spikes

Check:

1. model choice (larger models can be disproportionately expensive)
2. retries at client side
3. prompt size / token volume
4. whether AI Gateway controls (caching/rate-limits/fallbacks) should be added

## Production Readiness Checklist

1. Re-check model catalog for current IDs and badges.
2. Re-check pricing page for neurons and free allocation.
3. Validate one canary inference per task.
4. Add request logging/metrics (often via AI Gateway or app telemetry).
5. Pin/allowlist approved model IDs in configuration.

