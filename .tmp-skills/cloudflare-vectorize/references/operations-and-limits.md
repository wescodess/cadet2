# Operations and Limits

This file summarizes current Vectorize limits and operational guidance.

## Limits (Snapshot; Re-Verify)

Docs page:

- `vectorize/platform/limits/`

Verified docs snapshot on 2026-02-23 includes limits such as:

- indexes per account:
  - `50,000` (Workers Paid)
  - `100` (Free)
- max dimensions per vector:
  - `1536` (float32 precision)
- max vector ID length:
  - `64 bytes`
- metadata per vector:
  - `10 KiB`
- max returned `topK`:
  - `100` without values/metadata
  - `20` with values or metadata
- max upsert batch size:
  - `1000` (Workers)
  - `5000` (HTTP API)
- max vectors per index:
  - `10,000,000`
- max vectors upload size:
  - `100 MB`
- max metadata indexes per Vectorize index:
  - `10`

These values change over time. Always re-check before quoting or hardcoding assumptions.

## Operational Implications

- Large ingestion jobs should use batching sized to the current path (`Workers` vs `HTTP API`).
- Query payload choices (`returnValues`, `returnMetadata`) affect allowable `topK`.
- Namespace and metadata index planning should happen early to avoid painful migrations.

## Consistency / Visibility Notes

Vectorize mutations are asynchronous:

- insert/upsert/delete may not be query-visible immediately
- short delays are normal

When debugging "missing" results, verify:

1. the mutation completed successfully
2. enough time elapsed for propagation
3. the query namespace matches the write namespace

## Debug Checklist

### Low recall / poor matches

Check:

1. embedding model quality and domain suitability
2. dimension mismatch (or bad data serialization)
3. distance metric selection
4. normalization/consistency in preprocessing
5. namespace/query scoping mistakes

### API validation / limit errors

Check:

1. batch size
2. vector dimensions
3. metadata size
4. `topK` + `returnValues`/`returnMetadata` combination

## Production Readiness Checklist

1. Re-check limits page.
2. Validate one write + read/query smoke test.
3. Benchmark mutation throughput using target batch sizes.
4. Validate query latency for expected `topK` and metadata settings.
5. Document namespace and metadata conventions in code/config.

