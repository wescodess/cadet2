# Indexes and Bindings

This file covers schema planning, index creation, and Worker bindings for Vectorize.

## Core Schema Decision (Do First)

Before creating the index, decide:

- `dimensions`
- `distance metric` (for example cosine)

These must match the embedding model you use and cannot be changed later for that index configuration.

### Common Failure Mode

- Using an embedding model whose output dimensions do not match the index dimensions.

Example from the docs tutorial:

- tutorial index created with `--dimensions=768`
- because the tutorial’s Workers AI embedding model outputs `768` dimensions

## Create an Index (Wrangler CLI)

Docs tutorial uses:

- `wrangler vectorize create <index-name> --dimensions=<n> --metric=<metric>`

Index naming guidance from docs/tutorial context:

- lowercase and numeric ASCII preferred
- start with a letter
- use dashes instead of spaces
- descriptive by use case/environment

## Bind Vectorize to a Worker

Vectorize indexes are exposed to Workers through Wrangler bindings.

Docs show `vectorize` bindings in Wrangler config:

- binding name (used in `env.<BINDING>`)
- `index_name`

Example shape:

- `binding = "VECTORIZE"`
- `index_name = "embeddings-index"`

## Workers AI + Vectorize Embeddings Flow

The Vectorize embeddings tutorial combines:

- `vectorize` binding (index access)
- `ai` binding (Workers AI model execution)

Worker-side pattern:

1. generate embeddings with `env.AI.run(...)`
2. transform output to Vectorize vector objects
3. `upsert` into `env.VECTORIZE`
4. embed user query
5. `query` Vectorize with the query vector

## Practical Schema Planning Guidance

Choose index-per-tenant only when isolation requirements are strong.
Otherwise prefer:

- one index
- namespaces for segmentation
- metadata for retrieval context/filtering

This reduces index sprawl and helps stay within account/index limits.

## Validation Checklist (Before Ingesting Real Data)

1. Confirm index dimensions and metric.
2. Confirm binding appears in `env`.
3. Insert a small test set.
4. Query with a known similar vector/text.
5. Confirm scores and returned IDs look reasonable.

