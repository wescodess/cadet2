# Configuration and Data Sources

This file summarizes the AI Search configuration surface and the two supported data-source modes (`R2`, `Website`) with the highest-impact operational details.

## Configuration Matrix (Core)

AI Search docs expose a configuration matrix and note which values are editable after creation.

Key configurable areas:

- Data source (creation-time)
- Path filtering
- Chunking (`chunk size`, `chunk overlap`)
- Models
  - embedding
  - query rewrite
  - generation
- Query rewriting enablement
- System prompts (rewrite + generation)
- Retrieval configuration
  - match threshold (`score_threshold`)
  - max results (`top_k` / `max_num_results`)
- Reranking
- Similarity cache (+ threshold)
- Metadata filtering behavior
- Service API token (AI Search internal resource provisioning permission)
- AI Gateway integration

Read:

- `/ai-search/configuration/`
- Feature-specific pages listed in `docs-inventory.md`

## Data Source: R2

Read `/ai-search/configuration/data-source/r2/` for exact tables and file support.

High-value details:

- AI Search scans supported files in a configured R2 bucket.
- Unsupported files and oversize files are skipped and logged as errors.
- Path filtering supports include/exclude rules for object keys.
- File size limit snapshot from docs:
  - Plain text files: up to `4 MB`
  - Rich format files: up to `4 MB`
- Rich formats are converted using Workers AI Markdown Conversion before chunking/embedding.

### R2 File Support (Important)

The docs list many supported plain-text and rich formats, including:

- Plain text / config / code: `.txt`, `.md`, `.json`, `.yaml`, `.toml`, `.js`, `.py`, `.go`, `.rs`, `.java`, `.c`, `.cpp`, `.php`, `.rb`, `.swift`, `.dart`, `.sh`, `.ps1`, etc.
- Rich formats: `.pdf`, common image formats, `.html`, `.xml`, spreadsheets, `.docx`, `.odt`, `.csv`, `.numbers`
- Recent additions called out in release notes include `.el` and `.htm`

Do not hardcode the support matrix in answers without checking the current docs page if the user asks for exact support.

## Data Source: Website (Crawler)

Read `/ai-search/configuration/data-source/website/`.

High-value details:

- Only domains onboarded to the same Cloudflare account can be crawled.
- Bot protection products (WAF, Bot Management, Turnstile) can block crawling.
- Crawler user agent is `Cloudflare-AI-Search` (older `Cloudflare-AutoRAG` still appears in compatibility notes).
- Docs note the WAF Bot Detection ID remains `122933950` for allow-list/skip rules.

### Sitemap / robots.txt behavior

Website crawling depends on sitemap discovery:

1. Check `robots.txt` for sitemap entries.
2. Fallback to `/sitemap.xml`.
3. If no sitemap is available, crawling cannot proceed.

Behavior highlights:

- Supports `.gz` compressed sitemaps
- Supports partial URLs in `robots.txt` and sitemap references
- Can prioritize pages using sitemap `<priority>`
- Uses `<lastmod>` (preferred) or `<changefreq>` for re-crawl decisions

### Path filtering (Website)

Path filtering matches the full URL, not only the path segment.

Implication:

- `**/blog/**` matches `https://www.example.com/blog/post`
- `/blog/**` alone may not match because hostname/scheme are part of the string being matched

### Rendering mode

Docs describe parser options for website crawling:

- Static mode (raw HTML)
- Rendered mode (headless browser for JS-rendered pages)

Rendered mode relies on Browser Rendering and inherits Browser Rendering limits/billing.

### Protected content and custom headers

Website sources support custom HTTP headers (docs note up to five) for crawler requests.

Use this for:

- Protected internal docs
- App content behind auth gateways
- Cloudflare Access-protected sites (service-token headers)

Docs include a step-by-step Cloudflare Access service-token setup flow and header keys:

- `CF-Access-Client-Id`
- `CF-Access-Client-Secret`

## Indexing and Sync

Read `/ai-search/configuration/indexing/` plus release notes for recent changes.

Key operational behaviors (from docs + release notes):

- Initial indexing starts after instance creation.
- AI Search periodically checks for source changes and reindexes updates.
- Sync jobs can be triggered manually.
- Release notes mention:
  - reduced cooldown between syncs (3 minutes)
  - faster indexing
  - per-file sync from dashboard
  - deleted-file removal support (noted as introduced after earlier limitation)

When debugging stale results, check:

1. source object/page updated?
2. sitemap `<lastmod>` / `<changefreq>` (website source)
3. sync job ran?
4. job logs/errors?
5. chunk/filter settings excluding the target?

## Chunking

Read `/ai-search/configuration/chunking/`.

Documented behavior:

- Recursive chunking at natural boundaries (paragraph/sentence first, then split further if too large)
- Chunk size limits:
  - min `64`
  - max `512` tokens
- Chunk overlap limits:
  - min `0%`
  - max `30%`

Tuning guidance:

- Smaller chunks improve precision but can fragment context.
- Larger chunks preserve context but can reduce match specificity.
- More overlap improves continuity but increases indexing volume/cost.

## Retrieval, Reranking, Query Rewriting, Prompts

Read:

- `/ai-search/configuration/retrieval-configuration/`
- `/ai-search/configuration/reranking/`
- `/ai-search/configuration/query-rewriting/`
- `/ai-search/configuration/system-prompt/`

Use this tuning order in practice:

1. Confirm filters are not over-restrictive.
2. Adjust `max_num_results` and score threshold.
3. Enable query rewriting if user queries are noisy/colloquial.
4. Enable reranking if top-k contains relevant-but-misordered chunks.
5. Refine system prompts for generation/query rewrite.
6. Revisit chunking only after retrieval settings are reasonable.

## Metadata and Multitenancy

Read `/ai-search/configuration/metadata/` and `/ai-search/how-to/multitenancy/`.

Key use cases:

- Scope results to a tenant/folder
- Filter by timestamps/date ranges
- Filter by filename or folder metadata
- Return metadata in search responses to explain provenance

Release notes explicitly mention:

- metadata filtering and multitenancy support
- filename filtering
- custom metadata in search responses

## Models and Similarity Cache (Volatile)

Read:

- `/ai-search/configuration/models/`
- `/ai-search/configuration/models/supported-models/`
- `/ai-search/configuration/cache/`

Notes:

- Supported models page changes frequently (provider/model aliases, context windows, lifecycle status).
- Similarity cache can improve latency/cost for repeated or near-duplicate prompts.
- Cache threshold controls how similar a new prompt must be to reuse prior results/response.

Always re-check model availability before recommending a specific alias in production code.

