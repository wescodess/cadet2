# Governance audit snapshot correction, round 2

Baseline: `d8b5b95dcfa135371c64ce112d3cd843cae2daaa`, stacked on #55 at `d632c39d599ea8179c44c582bb1278e27a64f004`.

The SQL audit projection replaces U+0000 and unpaired UTF-16 surrogates with U+FFFD in strings and keys, and represents Convex extended values using their JSON encoding. The same conversion covers SQL audit writes and retained deletion reads; text columns and query bindings use the same text normalization. Canonical Convex snapshots remain unchanged.

Deletion snapshots accept their schema's unrestricted shape. Missing, invalid or blank names display the source ID. Arrays and scalar snapshots are retained under `value` in the SQL projection. Source creation and updates reject control characters in names and website/YouTube configuration through both HTTP validation and guarded Convex mutations.

The guard reads source files concurrently, reuses one content snapshot per invocation, and shares one fixture containing the scanned file types. Each mutation asserts its specific guard failure and restores its input. The actual tree and clean fixture must produce identical registration counts. No timeout, retry or skip was added.

## Red and green

- At the baseline, `pnpm security:admin` with the two new endpoint regressions exited 1: 25 cases passed and both new cases failed. Each fixture made list, summary, unrelated existing-event detail and pathway-filtered list return 500. The application source was unchanged for this run.
- After the correction, the same two regressions passed, all eight requests returned 200, and all 27 boundary cases passed. The final suite adds public NUL write/delete and input-validation coverage, and exercises seven nameless/scalar/array shapes. All 29 cases pass, with zero failures, skips or cancellations; canonical snapshots are checked through the public Convex reader.
- A fresh `pnpm install --frozen-lockfile` succeeded. The successful complete verification passed all nine rows, 125 Vitest cases and 29 boundary cases. All seven baseline manifests, the lockfile and dependency/skip allowances are unchanged.
- Before optimization, the reviewer's policy durations were 5512.6, 5002.5 and 7963.2 ms for classification, dormant import and runtime DDL, all failed. The owned baseline classification also timed out at 9359.2 ms during a build. A focused run during a build passed at 162.4, 35.8 and 38.2 ms. Exact clean-verify policy timings are in the timing record.

The first broad verification attempt failed formatting and later timed out during security initialization across an overnight interruption; it is not passing evidence. Formatting was corrected and the complete verification was rerun. Rejected fixture experiments are also excluded from the behavioral red proof.

The concurrent full-verify/build result and exact-head CI result are recorded in the PR body and full local evidence packet.

## Retained records

- [Endpoint red/green statuses](endpoint-results.json)
- [Guard timings](guard-timings.json)
- [Successful full verification manifest](verification.json)

```sh
pnpm install --frozen-lockfile
BETTER_AUTH_SECRET=$(openssl rand -hex 32) NUXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 CONVEX_SITE_URL=http://127.0.0.1:3000 pnpm verify
pnpm security:admin
```

The boundary harness chooses ephemeral runtime ports; the configured site URL above starts no server on 3000. The local successful run used a temporary sleep-prevention wrapper. Full logs, TAP, deployed registration captures and rejected attempts remain in the local evidence packet. This is local/CI containment proof; staging/provider/browser and independent acceptance gates remain separate.
