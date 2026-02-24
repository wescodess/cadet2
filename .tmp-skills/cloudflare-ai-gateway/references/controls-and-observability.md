# Controls and Observability

This file summarizes the most useful AI Gateway controls and the request-level headers used to override behavior.

## Caching

Docs page:

- `/ai-gateway/configuration/caching/`

### Core behaviors

- Gateway-level cache can be enabled in dashboard settings.
- Per-request overrides are supported via headers.
- Cache status is exposed with:
  - `cf-aig-cache-status` (`HIT` / `MISS`)

### Useful headers

- `cf-aig-skip-cache: true`
  - bypass cache for a specific request
- `cf-aig-cache-ttl: <seconds>`
  - per-request TTL override
  - docs note min `60s`, max `1 month`
- `cf-aig-cache-key: <custom-key>`
  - custom cache key for grouping/cacheability control

## Rate Limiting

Docs page:

- `/ai-gateway/configuration/rate-limiting/`

Docs highlight:

- fixed-window vs sliding-window strategies
- gateway-wide rate limiting defaults from dashboard
- over-limit behavior returns `429 Too Many Requests`

Use rate limiting to protect:

- cost exposure
- provider quotas
- abuse spikes

## Fallbacks

Docs page:

- `/ai-gateway/configuration/fallbacks/`

The fallbacks page documents provider/model fallback arrays with the Universal endpoint and the response header:

- `cf-aig-step`

Interpretation:

- `cf-aig-step:0` -> primary step succeeded
- `cf-aig-step:1` -> first fallback succeeded
- `cf-aig-step:2` -> second fallback succeeded

Use this header to verify fallback behavior actually happened in production.

## Logging

Docs page:

- `/ai-gateway/observability/logging/`

### What logs include (docs summary)

- prompt / request
- model response
- provider
- timestamp
- status
- token usage
- cost
- duration

### Important logging controls

- Logs are enabled by default at the gateway level (docs page wording).
- Per-request override header:
  - `cf-aig-collect-log`

### Storage notes (docs page)

- Default per-gateway storage can go up to `10 million` logs.
- Logging can stop when the configured limit is reached unless old logs are deleted or automatic deletion is enabled.

## Analytics

Docs page:

- `/ai-gateway/observability/analytics/`

Docs highlight dashboard metrics for:

- requests
- token usage
- costs
- errors
- cached responses

Use analytics for:

- traffic trends
- cost monitoring
- cache effectiveness
- provider/regression detection

## Custom Costs

Docs page:

- `/ai-gateway/configuration/custom-costs/`

Per-request header:

- `cf-aig-custom-cost`

Use this to override default/public cost assumptions in logs/analytics with negotiated pricing, including fields like:

- `per_token_in`
- `per_token_out`

## Operational Verification Checklist

1. Confirm endpoint style (compat vs direct provider) is correct.
2. Confirm gateway auth and provider auth path are correct.
3. Validate cache behavior with repeated identical requests and inspect `cf-aig-cache-status`.
4. Validate rate limit behavior in a controlled test (expect `429` when exceeded).
5. Validate fallback behavior and inspect `cf-aig-step`.
6. Confirm logs/analytics reflect expected provider, token, and cost values.

