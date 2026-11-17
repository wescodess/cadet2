Canadian application and database placement is available, including **Convex Canada Central on Free**, but a complete Canadian-residency guarantee is not established for the existing stack. Convex lists `aws-ca-central-1`; billable non-US usage has a 30% surcharge, and regional selection is included on Free/Starter.[^convex-regions][^convex-price] Cloudflare's inexpensive default Workers/Pages execution and D1/R2 placement hints do not establish Canada-only processing or storage; Canadian Regional Services requires the Enterprise-only paid Data Localization Suite, which still has no Canadian Customer Metadata Boundary.[^placement][^d1-location][^r2-location][^dls][^dls-regions] Supabase offers Canadian Postgres, Auth and backups, including a free database tier, but explicitly processes operational logs outside Canada; Neon, Render and Railway publish no Canadian deployment region.[^supabase-residency][^supabase-price][^neon][^render][^railway] Paid Canadian VM/application hosting and managed Postgres alternatives exist below. The smallest plausible synthetic preview/staging arrangement is a Canadian Node host with isolated SQL databases and Canadian Convex deployments; it is a proposal awaiting account, runtime and ancillary-data verification, not an approved deployment. The preference for Convex remains feasible; **near-zero-cost Cloudflare as the complete client-data runtime/store conflicts with the settled Canadian requirement**. No production region is selected here.[^map]

# Canadian hosting and database availability

Research ticket: [#30](https://github.com/wescodess/cadet2/issues/30). Observation date: **2026-11-17**. Code baseline: `dev` at `fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3`.[^baseline] Every footnote supplies a primary-source URL and read date; **[unverified]** means the stated guarantee, account fact or runtime behavior was not established. Prices are published dollar amounts, not CAD conversions or quotes for the owner's account; taxes, traffic, backup storage and extra environments can add cost. Recommendations and proposed gates below are engineering inferences, not provider guarantees.

## Comparison

“Selectable Canada” refers to the named workload, not automatically its TLS edge, telemetry, support access, backups, CI or external calls. No row certifies the entire application.

| Option / role | Canadian placement and tier/cost | Copies, execution and creation constraints | Result for this ticket |
| --- | --- | --- | --- |
| Convex Cloud | Canada Central `aws-ca-central-1`; region selection on Free/Starter; Professional $25/developer/month; billable Canadian usage 1.3× standard rates.[^convex-regions][^convex-price] | Deployment infrastructure is regional; existing region is immutable, so moving needs a new deployment and export/import. Separate environments need separate selections.[^convex-regions] Provider observability/support boundary remains [unverified].[^convex-subprocessors][^convex-dpa] | Preferred low-cost regional backend candidate, with ancillary-data verification outstanding. |
| Self-hosted Convex | Run backend containers on a Canadian host; no Convex Cloud plan required for self-hosting.[^self-host] | Default SQLite in a persistent Docker volume; external SQL is possible. Operator owns host, storage, upgrades and recovery.[^self-guide] | Alternative if managed ancillary-data terms cannot satisfy the requirement; infrastructure and operations cost remain. |
| Cloudflare Workers / Pages Functions | Global execution by default; placement optimizes proximity rather than a national boundary. Workers Free: 100,000 requests/day, 10 ms CPU/invocation; paid plan starts at $5/month.[^placement][^workers-price] | Canada Regional Services on a custom domain requires Enterprise + paid DLS. Default preview hostnames and other triggers need separate treatment.[^dls][^dls-workers][^dls-pages] | Default low-cost configuration does not establish Canadian execution. |
| Cloudflare D1 | Free and paid Workers tiers; Free includes 5 GB total, 5M rows read/day, 100k rows written/day.[^d1-price] | Guaranteed jurisdictions listed: `eu`, `us`, `fedramp`, **no Canada**. Hints are not guarantees; jurisdiction is creation-only.[^d1-location] | Exclude as a Canadian client-data store under published controls. |
| Cloudflare Hyperdrive | Connects Workers to an external SQL origin; Free includes 100k queries/day; paid includes unlimited queries.[^hyper-price] | Pools near origin; edge connection setup near Worker; caches read results unless disabled. Canadian origin does not prove a Canadian pool/cache boundary.[^hyper-how][^hyper-cache] | Accelerator, not a Canadian database. Canadian processing guarantee [unverified]. |
| Cloudflare R2 | Standard free allowance: 10 GB-month, 1M Class A and 10M Class B operations/month.[^r2-price] | Hints are best effort; listed jurisdictions `eu`, `us`, `fedramp`, **no Canada**. Jurisdiction cannot change after creation.[^r2-location] | Exclude for client documents/backups on a Canadian-location assumption; coordinate #40. |
| Neon managed Postgres | Published current region list has no Canada; Azure regions deprecated for new projects.[^neon] | Project region immutable; branches/databases stay in project region.[^neon] | Not a currently documented Canadian option on any published tier. Private/custom availability [unverified]. |
| Supabase managed Postgres | Specific Canada Central `ca-central-1`; Free $0, two active projects, 500 MB DB each, pauses after one inactive week; Pro from $25/month.[^supabase-regions][^supabase-price] | Core DB/Auth/origin Storage/backups regional; replicas selectable; edge execution and CDN need separate controls. Operational logs stored in EU.[^supabase-residency][^supabase-location] | Low-cost Canadian primary store, **not complete Canada-only logs/processing**. |
| AWS RDS PostgreSQL | RDS Canada Central `ca-central-1`; paid on-demand/reserved database pricing; account credits/free offers are not assumed.[^rds-region][^rds-price] | Backups regional; optional cross-region backup replication needs an approved Canadian destination; instance class/version/quotas require account checks.[^rds-backup][^rds-cross] | Managed Canadian SQL candidate; select backup, replica and logging destinations explicitly. |
| Google Cloud SQL PostgreSQL | Montréal `northamerica-northeast1`, Toronto `northamerica-northeast2`; Enterprise / Enterprise Plus resource pricing.[^sql-location][^sql-price] | Standard backups default to a nearby multi-region; explicitly select a Canadian regional backup location. Existing backups remain when location changes.[^sql-backup] | Canadian SQL candidate; defaults alone are insufficient for backups. |
| Azure Database for PostgreSQL | Canada Central and Canada East; Burstable, General Purpose and Memory Optimized offerings, billed compute/storage/backups.[^azure-pg][^azure-price] | Same-region local/zone backups or optional geo backup to paired region. Canada Central/East pair with each other. Geo-backup choice is creation-time.[^azure-backup][^azure-regions] | Canadian SQL candidate; exact SKU/subscription availability [unverified]. |
| Fly.io app Machines / Managed Postgres | Toronto `yyz` supports both. Usage billing; machine price is regional. Published $2.19 smallest-machine example is **US**, not a Toronto quote.[^fly-regions][^fly-price] | Global Fly Proxy is a distinct layer; Toronto Machine placement does not establish Canadian TLS/log/backup processing.[^fly-proxy] | App/SQL region available; complete residency and Toronto invoice [unverified]. |
| Render / Railway | Render lists Oregon, Ohio, Virginia, Frankfurt, Singapore. Railway lists US West, US East, Europe West, Asia Southeast; neither lists Canada.[^render][^railway] | Render region changes require replacement/migration; CDN or edge POP proximity is not the application region.[^render][^railway] | Exclude from Canadian application/SQL shortlist under public availability. |
| DigitalOcean | TOR1 Toronto Basic Droplets; managed PostgreSQL available TOR1; dynamic App Platform available TOR. App container from $5/month; managed single-node PG from $15/month.[^do-regions][^do-pg][^do-app][^do-app-price][^do-pg-price] | TOR static-site entry is CDN-only; do not infer regional SSR. Managed backup/log/support residency [unverified]. Small paid VM permits operator-controlled TLS, SQL and local logs.[^do-app][^do-regions] | Practical Canadian Node/SQL candidate; self-managed SQL reduces service count but adds recovery work. |
| AWS / GCP / Azure application hosting | EC2 `ca-central-1`; Cloud Run Montréal/Toronto; App Service Environment v3 Canada Central/East, Isolated v2 SKUs.[^ec2][^run-regions][^ase] | Separate region settings for DB, logs, registry/build artifacts, backups and preview services; no all-services-free claim. ASE is an isolation option, not a low-cost recommendation.[^ase][^gcp-logs] | Canadian regional app execution exists; account permissions, pricing and full data-flow inventory remain gates. |

## Evidence and practical limits

### Settled scope and current wiring

The settled destination is a private design-partner pilot on staging with synthetic data, no production launch or real client data, and Canadian regions for every client-data environment. The owner creates accounts and supplies keys through the orchestrator's secret prompt. This report preserves those decisions. The older synthesis §4 and engine review §§5–6 were read as inputs; their broader launch proposals do not supersede this scope.[^map][^prior]

At the baseline:

- `nuxt.config.ts` sets `hub.db.dialect: 'postgresql'` and a local PGlite directory. It conditionally enables build migrations when a database URL exists; it supplies no Canadian region, D1 ID or Hyperdrive ID.[^baseline]
- The lock resolves NuxtHub **0.10.6**. Its tagged source selects `postgres-js` when a URL exists and otherwise PGlite; explicit Hyperdrive configuration is a different branch. Current NuxtHub documentation describes the same distinction. NuxtHub is an adapter here, not evidence of a Canadian managed service.[^lock][^hub-source][^hub-docs]
- `server/auth.config.ts` uses the NuxtHub-provided Better Auth database and a Convex token plugin. SQL migrations contain `user`, `account`, `session`, `verification`, and `jwks`, including password/token/private-key fields. `convex/auth.config.ts` points at the site's issuer/JWKS endpoints. Thus auth execution, SQL rows, JWT/JWKS handling and Convex must all enter the location inventory; choosing a Convex region does not relocate SQL auth.[^auth][^auth-sql]
- `package.json` does not directly declare `postgres`, although the lock contains it transitively. NuxtHub's tagged setup checks for that direct dependency. A managed-SQL deployment needs explicit driver/dependency validation. No dependency edit or deployment test was performed.[^package][^lock][^hub-source]
- The sole CI workflow uses `ubuntu-latest`, builds and starts the app, and uploads browser artifacts. It contains no Canadian runner selection or Canadian deployment proof. Do not put client datasets, auth secrets, SQL dumps or unredacted session traces into its artifacts. Whether any existing external CI setting supplies remote services is [unverified].[^ci]

NuxtHub's pinned source can embed a build-time database URL in its generated server client, and this app enables build migrations when a URL exists. **Inference:** an ordinary hosted build can become a SQL access path and can produce credential-bearing server artifacts. #45 must locate migrations and any credential-bearing build in the approved boundary, or validate a build-without-database-credentials/runtime-secret design; changing only the database region is insufficient.[^hub-source][^baseline][^ci]

### Convex: retain the preference, verify its boundary

The published Free limits are team-wide: 40 deployments, 0.5 GB database storage, 1 GB/month database I/O, 1M function calls/month and 20 GB-hours/month action compute, on S16. Free has hard caps; Starter allows paid overage. These are small-pilot limits, not a concurrency or spend forecast for this app.[^convex-limits]

Backups support manual snapshots, optional files and seven-day manual retention. Scheduled daily/weekly backups require Pro; code, environment variables and scheduled functions are excluded. Reconstruct those separately, and test SQL/Convex restore consistency. **[unverified]** Public backup documentation does not separately enumerate every backup/replica/log processing location; the regional infrastructure statement is useful evidence, but not a full ancillary-data inventory.[^convex-backup][^convex-regions]

The subprocessor list places AWS infrastructure according to deployment choice, while listing US observability providers and support/collaboration services. DPA §6.1 permits cross-border transfers. This does **not** prove client row payloads leave Canada; equally it does not prove all user-identifiable logs or support access remain there. **[unverified]** Obtain service-specific scope/contract evidence before asserting the complete client-data boundary is Canadian.[^convex-subprocessors][^convex-dpa]

Preview deployments are beta and automatically expire after five days on Free/Starter, fourteen on Professional/Business/Enterprise. Use a persistent named deployment for staging and an isolated disposable deployment for preview; inspect each region and team default. Current CLI deployment creation requires package ≥1.34.0, while this lock resolves 1.32.0. The current changelog explicitly adds Canadian CLI region handling in 1.47.0. Do not copy current commands into the pinned environment without a separately validated upgrade or use the documented dashboard provisioning path.[^convex-multiple][^lock][^convex-change]

Self-hosting keeps the Convex programming model, with persistent storage and optionally an external SQL backend. Its fair-source licence restricts competing hosted products; it is not a promise of managed support or zero operating cost. Canadian placement then depends on the operator's container host, file store, replicas, backup destination, TLS and telemetry configuration. Runtime compatibility with this app's auth wrapper and the selected backend release is **[unverified]**.[^self-host][^self-guide]

### Cloudflare: proximity controls do not close the Canadian gap

Workers Placement maps a cloud region to the lowest-latency Cloudflare data center, with distributed execution possible at very high volume. It does not put the Worker inside the named AWS/GCP/Azure region. Pages Functions use Workers. **Inference:** specifying `aws:ca-central-1` is not proof of Canadian processing.[^placement][^dls-pages]

DLS is an Enterprise-only paid add-on, with no public fixed price established here. Canadian Regional Services controls HTTP decryption/execution on configured custom domains. Workers code/secrets remain globally distributed; subrequests and Cron/Queue triggers are outside that hostname guarantee. Pages' regionalization also applies only to its custom domain. Disable or separately control bypass/preview endpoints before claiming an environment boundary.[^dls][^dls-workers][^dls-pages]

Canada is supported for Regional Services and Geo Key Manager, but **not Customer Metadata Boundary**; the latter offers US/EU boundaries. This is a documented missing Canadian control, not just an unanswered pricing question. Purchasing DLS alone therefore does not establish Canadian logs/analytics.[^dls-regions]

D1's primary locality hints, read replicas and recovery features cannot create a Canadian guarantee absent a Canadian jurisdiction. R2's North America hints likewise cannot establish Canadian object placement. The currently supported jurisdiction lists are narrower than the footprint of Cloudflare's Canadian network. Do not treat paid Workers or Enterprise as automatically adding a Canadian D1/R2 jurisdiction.[^d1-location][^r2-location]

Hyperdrive introduces edge processing, connection pools and optional cached copies while leaving the authoritative database at its external origin. **[unverified]** No Canada-only pool/cache or DLS coverage guarantee was established from the reviewed documentation. Disabling cache reduces copies but does not prove processing location. Independently of residency, auth/session/permission queries need a cache-disabled connection because writes do not invalidate cached reads.[^hyper-how][^hyper-cache]

### Managed SQL and other hosts

Supabase is attractive for inexpensive Canadian SQL, but its own October 2026 residency FAQ explicitly says core regional hosting is not a never-leaves-region guarantee: logs are ingested/stored in EU data centers, support is global, and CDN delivery can leave the region. Using it solely as PostgreSQL avoids adopting its Auth/Storage products, but does not establish removal of database/service telemetry. **[unverified]** A Canadian telemetry exception/contract was not established. Select the specific Canadian region, not the broad “Americas” automatic placement.[^supabase-residency][^supabase-regions]

RDS, Cloud SQL and Azure PostgreSQL provide regional database alternatives with explicit billing and capacity choices. A Canadian primary requires Canadian replicas, export destinations and restores too. Cloud SQL's default multi-region backups deserve an explicit override. Azure's Canadian paired regions support a Canadian geo-backup design, but geo-redundancy is a creation-time choice. Migration is a future implementation task: retain old backup inventories, rotate endpoints/secrets, validate auth identifiers and data consistency, then retire old copies under the selected lifecycle policy. These are proposed controls, not performed migrations.[^rds-backup][^rds-cross][^sql-backup][^azure-backup][^azure-regions]

Fly's Toronto origin and DigitalOcean TOR resources are selectable regional workloads; that fact alone leaves TLS proxies, managed backups and telemetry unanswered. For the strictest controllable small arrangement, a Canadian VM can terminate TLS and keep SQL/logs locally, with explicitly Canadian backup storage, avoiding a global application proxy. **[unverified]** Provider-internal operational/support processing still needs evidence; a VM does not make that disappear.[^fly-regions][^fly-proxy][^do-regions]

For GCP, Cloud Logging supports regional buckets and organization/folder defaults for new `_Default`/`_Required` buckets. Configure this separately from Cloud Run/SQL placement; do not assume pre-existing buckets move. Full logging/trace/build configuration for any of these hosts remains **[unverified]** for the owner's accounts.[^gcp-logs]

Cloud Run offers a recurring free allowance shared across a billing account, applied as a discount at Tier 1 prices; Canadian execution is listed, but actual regional charges and build/registry/network/logging costs remain separate. This is another low-traffic Node-host candidate, not evidence of free Canadian PostgreSQL or an entirely free stack.[^run-price][^run-regions]

Region moves require explicit work: Supabase requires a new project and data migration; RDS documents cross-region replicas as a migration mechanism subject to engine/version availability; Azure documents redeployment and logical backup/restore; DigitalOcean allows Standard Edition relocation but requires a new cluster/dump for Advanced Edition. Convex and Neon replacement limits appear above. **[unverified]** Exact chosen Cloud SQL migration method, downtime and service-specific preview defaults were not established; #45 must specify them if selected. Never assume a region setting moves old backups or externally stored copies.[^supabase-move][^rds-move][^azure-move][^do-move][^sql-backup]

## Smallest plausible synthetic preview/staging arrangement

**Proposal for #45, not provisioning approval:**

1. One owner-funded Canadian VM (TOR1 is a documented candidate) running a built Nuxt Node server, TLS at the Canadian origin, and PostgreSQL on persistent disk. This minimizes service count and accommodates the existing Node/PostgreSQL wiring. Exact RAM, price and load headroom are **[unverified]** until a build and representative synthetic workload run; no $0 or minimum-size claim is made.[^do-regions][^do-vm-price][^baseline][^hub-source]
2. One persistent staging Convex deployment in Canada on Free, plus a separate Canadian preview deployment when needed. Give staging and preview separate app processes, SQL databases/roles, Convex endpoints/keys, auth secrets, cookies/issuers and callback origins. Run at most one preview at a time initially. Sharing a VM is a cost optimization with a shared failure/security boundary, not strong host isolation. If #45 needs host isolation, budget a second host. This proposal uses the documented multi-deployment capability and Free limits.[^convex-multiple][^convex-limits]
3. Seed only generated people, fake documents and test credentials. Keep logs local, redact bodies/tokens, deny private-response CDN caching, and use separate fixture-owned state. Keep AI Search admin-only and supply no client data to AI services, as settled. Email and document delivery remain dependent on #39/#40; this ticket does not silently waive those utilities for the pilot.[^map]
4. Rebuild disposable previews from fixtures. For staging, record an explicit Canadian backup destination and test a restore of both stores, including auth keys/configuration excluded by Convex snapshots. A same-disk dump alone does not survive host loss. External backup cost and Convex ancillary processing are unresolved gates, even with synthetic data.[^convex-backup]
5. Keep default global Workers/Pages auth/SSR, Hyperdrive and R2/D1 out of this proposed client-data route until their gaps are resolved. Cloudflare may remain a separate public-information service, but request IPs, cookies and authenticated content must not be assumed non-personal merely because the page is public. No existing Cloudflare configuration was inspected.[^dls-workers][^d1-location][^r2-location]

An alternative with less SQL administration is a Canadian Node host plus Canadian managed PostgreSQL and Convex Free. DigitalOcean's published $5 app + $15 SQL minima imply **$20/month base before backups/traffic and extra instances**, not a verified deployable invoice or capacity estimate. Supabase Free could lower that base but leaves the explicit EU-log conflict. A fully managed, indefinitely free, complete-Canada stack was **[unverified]** in this research.[^do-app-price][^do-pg-price][^supabase-residency]

## Unknowns and blockers

### Facts requiring owner account access or authority — route through #46

| ID | Unknown / blocker | Evidence the owner must enable after #45 chooses a topology |
| --- | --- | --- |
| O1 | **[unverified] Existing services and regions.** No owner dashboard, billing account, deployment inventory or secrets were accessed. | Non-secret IDs and region evidence for every app, SQL cluster, Convex deployment/default, preview, replica, bucket, backup and log sink; flag existing non-Canadian copies for a future migration/retirement plan. |
| O2 | **[unverified] Actual entitlements, credits, quotas and budget.** Public regional availability does not prove this account can create a chosen SKU. | Account/subscription owner, selected tier, Canadian region offered, quota/capacity, approved monthly ceiling and paid-overage policy. Convex Free hard caps versus Starter overage must be deliberate.[^convex-limits][^azure-capacity] |
| O3 | **[unverified] Contract and ancillary-data scope.** Convex US observability/support list; Supabase EU logs; Cloudflare lacks Canadian metadata boundary. | Existing contracts/DPA amendments or provider-specific written evidence for payload/log/backup/support scope. If not sufficient, authorize an alternate Canadian topology; do not mark an observed contradiction “verified Canada.”[^convex-subprocessors][^convex-dpa][^supabase-residency][^dls-regions] |
| O4 | **[unverified] Account/key/domain ownership and access.** | Owner creates the selected accounts, supplies keys only via the orchestrator's secret prompt, and authorizes the exact DNS/callback/TLS changes. Research has made none.[^map] |
| O5 | **[unverified] Existing data and recovery footprint.** | Confirm whether any client-like data already exists, approved fixture policy, backup/export locations and retention, and responsible restore/teardown operator. Never copy unknown existing data into preview. |

These are account and authorization facts, not requests to reconsider the settled Canadian requirement. No password, key, account creation, purchase, DNS change, deployment, paid API call or email is needed to accept this research result; all dependent actions remain with their owning tickets.

### Public-evidence gaps and implementation proof — no owner taste decision needed

- **[unverified] Convex complete backup/replica/log/support residency**, and whether an account-specific contract narrows it. Public regional infrastructure documentation plus broad DPA terms cannot settle the entire data flow. Architect can inventory flows; account holder must supply unavailable contract/provider evidence.[^convex-regions][^convex-subprocessors][^convex-dpa]
- **[unverified] Canadian Hyperdrive processing guarantee; Canadian R2/D1 jurisdiction absent in published lists; Canadian CMB absent.** Use another service path unless new primary evidence establishes a suitable control. Do not ask the owner to waive a settled requirement.[^hyper-how][^d1-location][^r2-location][^dls-regions]
- **[unverified] Managed Canadian host backup, proxy/TLS, telemetry and support boundaries**, especially Fly and DigitalOcean; exact RDS/GCP/Azure logging settings and selected SKU pricing also unverified. A regional origin or database is only one item of the inventory.[^fly-proxy][^do-regions][^rds-price][^sql-price][^azure-price]
- **[unverified] Exact pinned-stack deployment behavior.** Validate NuxtHub 0.10.6 driver selection, add the direct driver if chosen, preserve migration ownership, validate Convex CLI upgrade/dashboard region creation, and test issuer/JWKS/session revocation on the chosen Node host. No runtime, build, provider creation or restore test ran in this research.[^hub-source][^convex-multiple][^lock][^auth]
- **[unverified] End-to-end pilot utilities.** This ticket does not establish Canadian transactional email, document-vault processing, or the identity wrapper's membership semantics; consume #39, #40 and #32. Existing-account facts cannot be inferred from code.[^map]

## Consequences for dependent decisions

- [#33 — system of record](https://github.com/wescodess/cadet2/issues/33): Canadian Convex is available; regional availability does not force SQL-only consolidation. Preserve a deliberate authority/transaction/deletion contract between SQL auth and Convex. Carry both stores, projections, audit, logs and backups into the residency inventory; D1 is not an interchangeable Canadian PostgreSQL replacement. This is a decision input, not a storage decision.[^auth-sql][^convex-regions][^d1-location]
- [#45 — preview/staging topology](https://github.com/wescodess/cadet2/issues/45): choose explicit Canadian execution, SQL and Convex deployments for **each** environment, plus backup/log/TLS paths and preview teardown. Use the proposal above to minimize cost without assuming global edge locality is residency. Add observable gates: region IDs, separate credentials and databases, no cross-environment reads, correct issuer/callbacks, redacted telemetry destinations, Canadian backup inventory and isolated restore.
- [#46 — owner prerequisites](https://github.com/wescodess/cadet2/issues/46): translate O1–O5 into an exact selected-provider checklist after #45. Public availability research is complete; provisioning/account evidence is not. Keep spend/account/one-way actions with the owner.
- [#32 — auth compatibility](https://github.com/wescodess/cadet2/issues/32), [#39 — email](https://github.com/wescodess/cadet2/issues/39), [#40 — vault](https://github.com/wescodess/cadet2/issues/40): consume the regional runtime and data-copy constraints; do not substitute Supabase Auth merely because its PostgreSQL is Canadian, or use R2 for client files based on `enam`.
- [#50 — pilot proof](https://github.com/wescodess/cadet2/issues/50): research resolution is not environment or QA sign-off. Region selection, entitlements, integration/auth isolation, backup/restore, CI/staging separation and synthetic-data evidence remain unrun acceptance work. The map issue is left unchanged.

## Primary sources

All sources below were **read 2026-11-17**. Repository links pin the inspected code or supplied map inputs. Provider pages are dated observations and should be rechecked at provisioning.

[^map]: [Map #29: Destination and Notes](https://github.com/wescodess/cadet2/issues/29), read 2026-11-17; checked against the owner's local run page, “Destination (settled 2026-11-16, Q-20261116-1).”
[^prior]: [Feasibility synthesis §4](https://github.com/wescodess/cadet2/blob/5995648771b1017230886a8a0c14670e9f152ec9/docs/feasibility/2026-11-16/00-synthesis.md) and [engine/production review §§5–6](https://github.com/wescodess/cadet2/blob/5995648771b1017230886a8a0c14670e9f152ec9/docs/feasibility/2026-11-16/sol-engine-and-production-review.md), read 2026-11-17; supplied background, not independent provider proof.
[^baseline]: [cadet2 nuxt.config.ts](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/nuxt.config.ts), read 2026-11-17.
[^lock]: [cadet2 pnpm-lock.yaml](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/pnpm-lock.yaml), read 2026-11-17.
[^package]: [cadet2 package.json](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/package.json), read 2026-11-17.
[^auth]: [Nuxt auth config](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/auth.config.ts) and [Convex auth config](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/convex/auth.config.ts), read 2026-11-17.
[^auth-sql]: [SQL auth migration](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/server/db/migrations/postgresql/0000_bouncy_mother_askani.sql), read 2026-11-17.
[^ci]: [Test workflow](https://github.com/wescodess/cadet2/blob/fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3/.github/workflows/test.yml), read 2026-11-17.
[^hub-source]: [NuxtHub 0.10.6 database setup source](https://github.com/nuxt-hub/core/blob/a5f46e9d785e119626d1ff1082b30b68029e7c75/src/db/setup.ts), read 2026-11-17; `resolveDatabaseConfig`, dependency checks and generated non-Cloudflare PostgreSQL client.
[^hub-docs]: [NuxtHub SQL database](https://hub.nuxt.com/docs/database), read 2026-11-17; current docs, cross-checked with the pinned source above.
[^convex-regions]: [Convex regions](https://docs.convex.dev/production/regions), read 2026-11-17.
[^convex-price]: [Convex pricing](https://www.convex.dev/pricing), read 2026-11-17; Free/Starter region selection, Professional price and included amounts shared across regions.
[^convex-limits]: [Convex limits](https://docs.convex.dev/production/state/limits), read 2026-11-17.
[^convex-backup]: [Convex backup and restore](https://docs.convex.dev/database/backup-restore), read 2026-11-17.
[^convex-subprocessors]: [Convex subprocessor table](https://www.convex.dev/legal/documents/subprocessors.html), read 2026-11-17.
[^convex-dpa]: [Convex DPA §6.1](https://www.convex.dev/legal/documents/dpa.html), read 2026-11-17.
[^convex-multiple]: [Convex multiple deployments](https://docs.convex.dev/production/multiple-deployments), read 2026-11-17.
[^convex-change]: [Convex 1.47.0 changelog](https://ship.convex.dev/changelog/convex-v1-47-0), read 2026-11-17.
[^self-host]: [Convex self-hosting and licence](https://docs.convex.dev/self-hosting), read 2026-11-17.
[^self-guide]: [Convex official self-hosting guide](https://github.com/convex/convex-backend/blob/main/self-hosted/README.md), read 2026-11-17; mutable main, no backend release was selected or tested.
[^placement]: [Workers Placement](https://developers.cloudflare.com/workers/configuration/placement/), read 2026-11-17.
[^workers-price]: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), read 2026-11-17.
[^dls]: [Data Localization Suite overview](https://developers.cloudflare.com/data-localization/), read 2026-11-17.
[^dls-regions]: [DLS region/feature matrix](https://developers.cloudflare.com/data-localization/region-support/), read 2026-11-17.
[^dls-workers]: [DLS for Workers](https://developers.cloudflare.com/data-localization/how-to/workers/), read 2026-11-17.
[^dls-pages]: [DLS for Pages](https://developers.cloudflare.com/data-localization/how-to/pages/), read 2026-11-17.
[^d1-location]: [D1 data location](https://developers.cloudflare.com/d1/configuration/data-location/), read 2026-11-17.
[^d1-price]: [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), read 2026-11-17.
[^r2-location]: [R2 data location and jurisdictions](https://developers.cloudflare.com/r2/reference/data-location/), read 2026-11-17.
[^r2-price]: [R2 pricing](https://developers.cloudflare.com/r2/pricing/), read 2026-11-17.
[^hyper-price]: [Hyperdrive pricing](https://developers.cloudflare.com/hyperdrive/platform/pricing/), read 2026-11-17.
[^hyper-how]: [How Hyperdrive works](https://developers.cloudflare.com/hyperdrive/concepts/how-hyperdrive-works/), read 2026-11-17.
[^hyper-cache]: [Hyperdrive query caching](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/), read 2026-11-17.
[^neon]: [Neon available regions and migration limits](https://neon.com/docs/introduction/regions), read 2026-11-17.
[^supabase-regions]: [Supabase region selection](https://supabase.com/docs/guides/platform/regions), read 2026-11-17.
[^supabase-location]: [Supabase region/data-class matrix](https://supabase.com/regions), read 2026-11-17.
[^supabase-residency]: [Supabase data residency and transfers FAQ](https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq), version 1, 2026-10-06; read 2026-11-17.
[^supabase-price]: [Supabase pricing](https://supabase.com/pricing), read 2026-11-17.
[^rds-region]: [RDS regional endpoints](https://docs.aws.amazon.com/general/latest/gr/rds-service.html), read 2026-11-17.
[^rds-price]: [RDS PostgreSQL pricing](https://aws.amazon.com/rds/postgresql/pricing/), read 2026-11-17; no Canadian SKU quote calculated.
[^rds-backup]: [RDS backups and regional storage](https://docs.aws.amazon.com/us_en/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html), read 2026-11-17.
[^rds-cross]: [RDS cross-region automated backup destinations](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReplicateBackups.html), read 2026-11-17.
[^sql-location]: [Cloud SQL PostgreSQL locations](https://docs.cloud.google.com/sql/docs/postgres/locations), read 2026-11-17.
[^sql-price]: [Cloud SQL pricing](https://cloud.google.com/sql/pricing), read 2026-11-17; no Canadian SKU quote calculated.
[^sql-backup]: [Cloud SQL backup options and locations](https://docs.cloud.google.com/sql/docs/postgres/backup-recovery/backup-options), read 2026-11-17; standard backup storage section.
[^azure-pg]: [Azure PostgreSQL overview and region matrix](https://learn.microsoft.com/en-us/azure/postgresql/overview), read 2026-11-17.
[^azure-price]: [Azure PostgreSQL flexible-server pricing](https://azure.microsoft.com/en-us/pricing/details/postgresql/flexible-server/), read 2026-11-17; region/SKU quote not resolved.
[^azure-backup]: [Azure PostgreSQL backup and restore](https://learn.microsoft.com/en-us/azure/postgresql/backup-restore/concepts-backup-restore), read 2026-11-17.
[^azure-regions]: [Azure region list and pairs](https://learn.microsoft.com/en-us/azure/reliability/regions-list), read 2026-11-17.
[^azure-capacity]: [Azure PostgreSQL capacity/region-access restrictions](https://learn.microsoft.com/en-us/azure/postgresql/troubleshoot/how-to-resolve-capacity-errors), read 2026-11-17.
[^fly-regions]: [Fly regions, app and Managed Postgres availability](https://docs.fly.io/reference/regions), read 2026-11-17.
[^fly-price]: [Fly resource pricing](https://docs.fly.io/about/pricing), read 2026-11-17.
[^fly-proxy]: [Fly Proxy](https://docs.fly.io/reference/fly-proxy), read 2026-11-17; global routing layer, not a Canadian-processing contract.
[^render]: [Render regions](https://render.com/docs/regions), read 2026-11-17.
[^railway]: [Railway edge POPs versus deployment regions](https://docs.railway.com/networking/edge-networking), read 2026-11-17.
[^do-regions]: [DigitalOcean regional availability](https://docs.digitalocean.com/platform/regional-availability/), read 2026-11-17.
[^do-pg]: [DigitalOcean PostgreSQL availability](https://docs.digitalocean.com/products/databases/postgresql/details/availability/), read 2026-11-17.
[^do-pg-price]: [DigitalOcean PostgreSQL pricing](https://docs.digitalocean.com/products/databases/postgresql/details/pricing/), read 2026-11-17; account/date-specific Standard Edition restrictions noted on page.
[^do-app]: [DigitalOcean App Platform availability](https://docs.digitalocean.com/products/app-platform/details/availability/), read 2026-11-17.
[^do-app-price]: [DigitalOcean App Platform pricing](https://docs.digitalocean.com/products/app-platform/details/pricing/), read 2026-11-17.
[^do-vm-price]: [DigitalOcean Droplet billing](https://docs.digitalocean.com/products/droplets/details/pricing/), read 2026-11-17; stopped bundled-plan VMs still billed; exact selected size/cost unknown.
[^ec2]: [EC2 service endpoints by region](https://docs.aws.amazon.com/ec2/latest/devguide/ec2-endpoints.html), read 2026-11-17.
[^run-regions]: [Cloud Run locations](https://docs.cloud.google.com/run/docs/locations), read 2026-11-17.
[^ase]: [App Service Environment v3 regional availability, residency and tiers](https://learn.microsoft.com/en-us/azure/app-service/environment/overview), read 2026-11-17.
[^gcp-logs]: [Cloud Logging regionalization](https://docs.cloud.google.com/logging/docs/regionalized-logs), read 2026-11-17.
[^run-price]: [Cloud Run pricing and free-tier accounting](https://cloud.google.com/run/pricing), read 2026-11-17.
[^supabase-move]: [Supabase: change project region](https://supabase.com/kb/troubleshooting/change-project-region-eWJo5Z), read 2026-11-17.
[^rds-move]: [RDS cross-region read replicas and migration](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.XRgn.html), read 2026-11-17.
[^azure-move]: [Azure PostgreSQL regional relocation](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/relocation/relocation-postgresql-flexible-server), read 2026-11-17.
[^do-move]: [DigitalOcean PostgreSQL relocation and edition limits](https://docs.digitalocean.com/products/databases/postgresql/how-to/relocate/), read 2026-11-17.
