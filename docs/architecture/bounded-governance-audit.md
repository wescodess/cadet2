# Bounded governance audit (#166)

Pathway and rule changes own their SQL events. Source changes own their Convex events. All 13 retained write paths commit the domain change, mandatory audit and any create receipt in the same transaction or mutation. SQL summary counters update through an insert trigger in that transaction; Convex counters update in the source mutation. Any failure rolls back the entire operation.

Events contain an ID, authenticated actor, action, entity, bounded label, server timestamp, field-level before/after values and SHA-256 digests of both complete states. Digests use recursively key-sorted JSON with Convex extended-value encoding. A field larger than 1 KiB is represented by its digest, byte length and `truncated: true`. Each state has an 8 KiB value budget, at most 64 fields, and field names at most 128 characters. Omitted or digest-represented fields set the event truncation marker. Legacy oversized sources remain editable; unchanged large fields need not pass new input caps and their full state still contributes to the digest.

Source input limits apply independently at HTTP and direct Convex create/update boundaries:

- Name: 255 UTF-16 code units; description: 4,000 UTF-16 code units.
- Each config: 16,384 UTF-8 bytes of canonical JSON.
- Complete submitted create/update input: 32,768 UTF-8 bytes of canonical JSON, including other arrays and strings.
- Decision notes and rejection reasons: 500 UTF-16 code units.

A new source plus its bounded audit is far below the 1 MiB Convex document limit, including worst-case multibyte text. Limits apply only to submitted fields during an edit. The audit projection budgets also cover imported records independently of their old sizes.

## Reads and continuity

The SQL log and Convex metadata table each return at most `pageSize + 1` event metadata rows. The server merges them by `(timestamp DESC, eventId DESC)` with the same filters, then returns one page. SQL uses the C collation for the ID tie-break, matching the ASCII ID order in Convex and JavaScript. New writes use an atomic monotonic audit clock in each store. The opaque versioned composite cursor binds the filters, last emitted key, each store's first-page upper key and the first-page total. Inserts between pages therefore stay above that store's traversal watermark; loading history never shifts an offset. Changing filters or supplying an invalid cursor returns 400.

Detail reads the selected event and bounded related metadata only from its owning store. A SQL event remains readable during a source-audit outage. Convex failures produce an explicit 503 unavailable response, with no partial-success list or summary. The existing audit page displays that response through its error state.

Convex list queries cap examined metadata at 512 rows and 1 MiB. Search/date counts examine at most 2,001 indexed metadata candidates and reject requests needing more than 2,000; ordinary dimensional counts use materialized indexed counters. Narrowing the filters resolves a budget error. Summary reads use indexed daily, actor and entity counters in both stores. Summary actor populations are capped at 100 per store; larger populations return unavailable rather than a misleading winner. Today and week counts cover the current UTC day and the current plus six preceding UTC days.

## Create receipts

Source, pathway and single-rule creation require an `Idempotency-Key` header over HTTP. Direct source creation requires `idempotencyKey`. Keys contain 8–128 ASCII letters, digits, colons, underscores or hyphens. The receipt is bound to the authenticated actor, operation and canonical payload digest. Replays return the original receipt; changing the payload under that key returns HTTP 409 (structured `IDEMPOTENCY_CONFLICT` at Convex). Receipt reservation, domain insertion and audit insertion are atomic, including concurrent Convex requests and SQL requests.

Pathway IDs and the rule `(pathway_id, unmet_condition_id)` constraint remain additional natural uniqueness controls across different operation keys. Bulk rule replacement uses those constraints and parent serialization. Review and ingestion create transports remain unavailable. Admin forms retain their operation key after a lost response; source detail recovery retains it until the view has changed successfully.

## Operator migration

Apply `server/db/migrations/postgresql/0007_bounded_governance_audit.sql` through the existing operator migration process. It locks SQL audit inserts while adding columns, indexes, receipts, the audit clock and summary counters, backfills the counters, and installs their atomic insert trigger in one transaction. No request runs DDL.

After deploying the Convex schema/functions, invoke the internal operator-only `ragSourceAudit:backfillEvents` mutation with `{"table":"approval"}` until `done` is true, then with `{"table":"deletion"}` until `done` is true. Each mutation reads at most four legacy rows. Repeating a batch is safe: event IDs are derived from the original history IDs and existing projections are not counted twice. Original history values are retained; only the projection marker is added. Pre-governance approval rows without a snapshot are marked processed and do not duplicate their retained SQL events.

Audit list/summary/source-detail reads return unavailable while an unprojected legacy row remains. This prevents silent omission of history. Source changes can still commit their new bounded events atomically during the backfill. New operational approval/deletion rows are bounded; canonical metadata, details and counters use the same event ID.

The implementation does not run these migrations against a managed deployment or reopen YouTube, AI Search, reviews or ingestion.
