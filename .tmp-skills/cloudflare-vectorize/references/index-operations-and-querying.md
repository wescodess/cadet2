# Index Operations and Querying

This file summarizes the Workers Vectorize client API and the Cloudflare Vectorize HTTP API endpoints.

## Workers Client API (`env.YOUR_INDEX`)

Docs page:

- `vectorize/reference/client-api/`

### Mutation operations (asynchronous visibility)

- `insert(vectors)`
  - inserts only new IDs
  - does not overwrite existing vectors
- `upsert(vectors)`
  - inserts or fully replaces existing vectors with same ID
- `deleteByIds(ids)`
  - deletes vectors by ID

Docs note these operations are asynchronous and can take a few seconds before results are visible to queries.

### Query operations

- `query(vector, options?)`
  - nearest-neighbor search using provided vector
- `queryById(id, options?)`
  - nearest-neighbor search using an existing stored vector

### Retrieval / utility operations

- `getByIds(ids)`
  - fetch vectors by ID (including values/metadata)
- `describe()`
  - index configuration details (dimensions/metric)

### Listing / CLI helpers (Wrangler)

Client API docs also reference Wrangler commands for:

- list vectors (`wrangler vectorize list-vectors`)
- metadata index management
- index info (`wrangler vectorize info`)

## Query Options (Important Constraints)

Docs describe options like:

- `topK` (default `5`)
- `returnValues`
- `returnMetadata` (`none` / `indexed` / `all`)

### TopK limits (as documented)

- General upper limit can reach `100`
- But if returning values or full metadata, `topK` is limited to `20`

This is a common source of validation errors or unexpected truncation.

## Vector Object Shape (Workers API)

Docs describe fields such as:

- `id` (required)
- `namespace` (optional)
- `values` (required numeric vector; length must equal index dimensions)
- `metadata` (optional key-value object)

## Namespaces and Metadata

### Namespaces

Docs describe `namespace` as an optional partition key:

- operations are performed per-namespace
- useful for isolation/segmentation within a single index

Use namespaces for:

- environment isolation (`dev`, `prod`)
- tenant segmentation (when lightweight partitioning is sufficient)
- data domain segmentation

### Metadata

Use metadata to attach retrieval context (for example file ID, URL, source type).

Docs also reference metadata indexes via Wrangler commands for filtering-related workflows.

## Cloudflare Vectorize HTTP API (Automation / Non-Workers)

Cloudflare API reference (`/api/resources/vectorize/`) documents `/vectorize/v2` endpoints including:

- list/create/read/delete indexes
- insert/query/upsert
- delete/get by IDs
- index info
- list vectors

Use the HTTP API when:

- automating from CI/scripts/backends
- managing indexes outside Workers runtime
- building admin/ops tooling

## Common Implementation Mistakes

- using `insert` when you meant `upsert`
- assuming upsert merges metadata (it replaces the vector in full)
- querying immediately after mutation and expecting zero lag
- mismatched vector length vs index dimensions
- requesting `topK > 20` while also returning values/full metadata

