# Convex entry authority and scanner lifetime

2026-11-22. Proposed resolution of [#173](https://github.com/wescodess/cadet2/issues/173), blocking [#24](https://github.com/wescodess/cadet2/issues/24) / [PR170](https://github.com/wescodess/cadet2/pull/170). **The lifetime-contract amendment below needs parent/owner acceptance before implementation resumes.** This is research, with no implementation, review-gate pass or issue closure.

## Decision

Use **explicit component roots and exact framework-default paths, with a small, fail-closed recognizer for actual function registrations**. Replace general binding/factory inference; do not add an unused-export allowlist.

For scanners, recommend **trusted foreground CLIs in one owned POSIX process group, a bounded caller deadline and stream shutdown, and a private owner-liveness channel**. Remove ancestry sampling and its detached-descendant cleanup claim. Retain the 120-second scanner budget, shared across duplication's two scans, and CI's existing outer limits. This supports ordinary macOS/Linux execution without privileged setup. It does **not** contain arbitrary native descendants that change group/session and reparent. A closed-stdio escape can be invisible and can coexist with a passing row. That is a material reduction from PR170's newer claim, requiring explicit acceptance; it is not adopted by this report.

If complete termination of arbitrarily detached descendants remains binding, **do not implement the narrower contract**. Require an independently enforced execution boundary instead; missing capability must fail before a scanner starts. No supported, portable boundary meeting all current constraints was established here. A Linux containment deployment and a macOS alternative would require a separate approved platform decision.

## Pins and existing authority

Research starts on actual `dev` **9fbe3b55e9209b2c227e6c1297a27d06139848d9**. Implementation inspected: **227a46c01865fb3ea86fad962f8f33357d6e4a3a**; original comparison base: **1b335bface0686641850ea8cd23aa5c5dea4e45c**. The provisioned checkout belongs to cadet2; GitHub confirms the historical remote resolves to `wescodess/cadet2`. The integration delta is exactly 29 `qa/` additions, including **20 source inputs**. These need actual structural accounting, not a directory exemption. Research does not certify the combined implementation/integration tree.

| Authority | Binding requirement or limit | Consequence |
| --- | --- | --- |
| [#24 acceptance](https://github.com/wescodess/cadet2/issues/24), S24 | New files/debt and malformed/tool failures fail; inherited debt ratchets | Keep source population, parsers, suppressions policy and baselines strict |
| Nov 17 simplification; [integrated quality bar](https://github.com/wescodess/cadet2/blob/9fbe3b55e9209b2c227e6c1297a27d06139848d9/docs/agents/quality-bar.md#pr-55-round-2-failure-handling-and-isolated-evidence) | Per-child timers removed; local runs interactive; CI Verify step/job 15/20 minutes, all-branches secrets 8/10 minutes | Original requirement did not promise a local 120-second arbitrary-descendant containment boundary |
| Same quality bar's interruption contract | Nonzero signal outcome; aborted/interrupted/not-run records; isolated running-row group killed | Preserve these outcomes and the pinned pnpm signal behavior |
| [PR170 scanner contract](https://github.com/wescodess/cadet2/blob/227a46c01865fb3ea86fad962f8f33357d6e4a3a/docs/agents/quality-bar.md#d03-structural-ratchets-24) | Adds 120-second scanner budgets, 64 MiB capture, owner-loss handling and cleanup of descendants in separate groups | Stronger new claim; the supplied escapes disprove it; cannot quietly reduce it |
| [#173](https://github.com/wescodess/cadet2/issues/173) and design-stop | Decide before further patches/rechecks | Stage A stays **2/8 used, clean 0**; no waiver or budget reset |

The private Nov 17 run record was read at `~/.orchestrate/wiki/runs/cadet2-2026-11-16.md:143–154`; its simplification is also recorded in the repository quality bar. CI limits bound CI execution; they are not proof of instantaneous cleanup of arbitrary escaped processes. Current first-party runner source uses best-effort process cleanup, including environment-marker lookup; that is neither a per-row containment receipt nor proof about the exact deployed runner. [Runner process implementation](https://raw.githubusercontent.com/actions/runner/main/src/Runner.Sdk/ProcessInvoker.cs), [job cleanup](https://raw.githubusercontent.com/actions/runner/main/src/Runner.Worker/JobExtension.cs).

## Convex authority

The source authority is the exact **Convex 1.32.0 package**, not the latest documentation's API surface. The retained installed `src/bundler/index.ts` is byte-identical to the independently fetched npm package. Its SHA-512 matches both registry metadata and the pinned lockfile. Package archive SHA-256: `9d4a814da68eb0d59e1c0e9589f9bd3c7c6c436cadfd8479f0dea81b2b151787`. [Exact package](https://registry.npmjs.org/convex/-/convex-1.32.0.tgz).

Relevant package sources: `src/bundler/index.ts:302–355` resolves schema/auth at a particular component root; `395–489` discovers eligible modules and excludes nested component directories, schemas and multi-dot files; `src/cli/lib/components/definition/bundle.ts:276–360` discovers component-definition dependencies; `src/server/components/index.ts:202–235` records installations through `use`. File presence, component-definition dependency and an installed component instance are distinct facts. Current official [component installation](https://docs.convex.dev/components/using) and [authoring](https://docs.convex.dev/components/authoring) documentation confirm the rooted installation model; newer examples do not authorize features absent from 1.32.0.

At these pins the app root is `convex/`, with no `convex.json` override and no root `convex.config.ts`. There are **two required defaults and 43 registered exports**. All 43 use direct generated builders; no arbitrary wrapper evaluation is necessary.

| Entry kind | Admission authority | Fail-closed behavior |
| --- | --- | --- |
| App root | Default `convex/`, or a validated explicit functions-root configuration | Configuration/root mismatch fails; do not silently keep scanning the old root |
| Schema/auth/router/crons/app definition defaults | Exact root-relative framework slot and validated default-export role; only slots actually consumed by pinned Convex | A nested matching basename is ordinary code; extra named exports remain checked |
| Registered query/mutation/action exports | A discoverable module inside an admitted component, exporting a direct call to its verified generated builder or canonical `convex/server` registrar | Imported naming aliases can work; a local lookalike, stale generated builder, skipped module or unknown wrapper earns no exemption |
| Local component | Explicit root declaration plus an actual, unconditional parent installation reachable from the app; validate the parent import and `use` edge | A copied/unmounted `convex.config.ts`, schema or registration creates no live component authority |
| Packaged component | Actual parent installation and locked package identity | Do not treat package registration as an exemption for unrelated local helpers |
| Ordinary helper, including one beside a registration | Normal Knip consumer graph, with entry exports included | Unused file/export/type remains a finding |

Implement the root declarations as narrowly validated structural configuration, not a debt manifest. Defaults use complete paths; functions are recognized only through a finite source grammar and the verified generated-builder mapping. Remove the open-ended recursive expression/binding tracer. Do not execute arbitrary application/component config during static scanning to discover authority. Support direct imported aliases and known generated re-exports; unfamiliar wrappers, conditional/dynamic component installation or unsupported syntax must fail with an actionable unsupported-authority error until deliberately supported. Neither an arbitrary root declaration nor a matching symbol name may silently authorize a helper. Canonical paths must remain inside the trusted Git-selected source population; reject ambiguous extensions/duplicates where the framework rejects them and prevent symlink/path aliases from manufacturing another root.

This deliberately constrains registration syntax rather than pretending to evaluate arbitrary TypeScript. For a future genuine registered local component, its exact installation edge and root are declared together, its eligible registrations/defaults pass, and removing the installation removes their admission. Package upgrades or a new registration convention require updating this adapter against that exact framework version. Do not implement the pending auth migration or import future package targets into this decision.

Rejected: basename conventions; globbing all `convex/**`; suppressing every export in a registered file; relying on `_generated/api.d.ts` as a liveness oracle; executing config and inferring arbitrary runtime behavior; duplicating the entire Convex compiler. The small adapter plus explicit roots is sufficient for the current source and leaves unsupported forms visible.

## Process guarantee and platform boundary

POSIX groups are enforceable membership sets, not ancestry sets. [`setsid`](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/setsid.2.html) creates a different group/session; a negative-PID [`kill`](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/kill.2.html) targets a group. Faster `ps`, birth stamps, repeated snapshots and freeze rounds cannot reconstruct a descendant that already escaped before observation. Do not discover ownership from CWD, process names, arguments or environment markers.

| Mechanism | What it can establish | Selection |
| --- | --- | --- |
| Owned process group, direct child handles | Group-scoped signaling, including signal-resistant members after SIGKILL | Recommended bounded foreground contract; escaped groups are outside it |
| Faster ancestry polling, birth stamps, subreaper alone | Observations or reparent/reaping assistance | Reject as proof of containment or owner-death termination |
| Linux cgroup v2 | Inherited membership, subtree kill handling concurrent forks, populated-state receipt | Sound stronger candidate with pre-established delegation and no scanner migration authority; unavailable/unproved here |
| Linux PID namespace | Kernel kills namespace members when namespace init exits | Another stronger Linux boundary; kernel/user-namespace capability is not assumed |
| macOS sandbox/launch service | Depends on specific, supported launch restrictions and service policy | No approved portable solution proved; do not introduce system installation/configuration |
| Node permission flags or an overridden JS `spawn` | Selected Node API restrictions | Not containment of the native jscpd executable; not an arbitrary-code security boundary |

The Linux stronger alternatives are source-confirmed, not newly tested: [cgroup v2 delegation/kill/events](https://docs.kernel.org/admin-guide/cgroup-v2.html), [PID namespaces](https://man7.org/linux/man-pages/man7/pid_namespaces.7.html). A cgroup candidate needs launch admission before scanner code executes, an external surviving owner, disabled outward migration, `cgroup.kill`, and `populated=0`; creating a subgroup after launch is racy. The current local Apple `sandbox-exec(1)` manual explicitly deprecates that interface. Apple's [launch service requirements](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html#//apple_ref/doc/uid/10000172i-SW10-SW8) require foreground behavior rather than making daemonization safe. The [Node 24 permission documentation](https://raw.githubusercontent.com/nodejs/node/v24.20.0/doc/api/permissions.md) explicitly limits its security promise. None justifies an unsupported cross-platform cleanup claim.

Under the proposed foreground contract, support macOS arm64 and Linux x64 with the locked native tools and Node 24. Other platforms/architectures, unavailable native binaries, group setup failure or unavailable private owner channel fail before execution. Linux runtime behavior still needs independent CI controls; this report's new runtime controls ran on macOS only. Do not silently select a weaker contract if a future strict-containment mode is requested.

### Required lifecycle

Keep a single group-owning supervisor and the external caller. Keep the group leader alive until terminal cleanup so its group identity cannot be reused during the run. The supervisor alone retains a private owner channel; scanner descendants must not inherit it. Owner EOF triggers cleanup without ancestry polling. Retain an independent caller deadline so a dead supervisor or retained output descriptor cannot hold the caller indefinitely. Remove `scanner-tree.mjs`; no additional watcher tier is needed. `scanner-watchdog.mjs` is **absent at the supplied pin**, so no behavior was inferred from that requested filename.

Proposed constants: **120,000 ms active execution**, **2,000 ms maximum settlement/drain window**, **64 MiB combined capture**. Use monotonic absolute deadlines. Duplication's census and clone scan consume one shared active budget, without resetting it between children. The supervisor and caller use that same deadline. Scheduling suspension or host failure is not a hard-real-time promise; record an overrun as failure. The 2-second settlement value is a proposed bound requiring production controls, not an observed production result.

| Trigger | Required observable outcome |
| --- | --- |
| Scanner exit 0 | Kill residual owned-group members, drain complete output, validate fresh receipt and native report; only then allow a row pass |
| Native nonzero/signal, spawn error, malformed/missing receipt | Clean group; reject using native row semantics; never parse incomplete output as clean |
| 120-second active deadline | Record timeout, SIGKILL the owned group, settle within the drain window; row exit 1 and aggregate continues |
| SIGTERM / SIGINT / SIGHUP | Preserve 143 / 130 / 129 direct-row outcomes and aggregate aborted/interrupted/not-run semantics; terminal pnpm Ctrl-C retains its existing 129 workaround |
| Row owner disappears, including SIGKILL | Private channel EOF makes supervisor kill its group; never write a pass. A killed owner cannot promise its final journal write; incomplete/running evidence remains non-passing |
| Supervisor dies unexpectedly | Caller kills the anchored group and rejects; a missing completion receipt fails |
| Output budget exceeded or EOF absent after terminal cleanup | Destroy/unreference read streams after the bounded drain, record truncation/stream-close failure, reject; do not keep awaiting `close` |
| Completely escaped descendant with closed stdio | May be unobservable and survive; no arbitrary-descendant cleanup guarantee or automatic detection claim |

Node distinguishes child exit from stdio closure, and a sent kill signal is not itself termination proof. [Exact Node 24 child-process contract](https://raw.githubusercontent.com/nodejs/node/v24.20.0/doc/api/child_process.md). Use a single idempotent terminal transition. Record native status separately from supervisor/group termination. A success receipt must identify the declared scope as `process_group`; it must never claim all descendants are gone. Whole-group cleanup and bounded streams still require integration proof. Simultaneous death of caller and supervisor is outside this userspace guarantee; CI remains the outer limit.

## Evidence and required public controls

External packet: `~/.orchestrate/scratch/cadet2-decision-173-evidence/`. Exact probe scripts, commands, outputs, exits, primary-source hashes, source snapshots and cleanup receipts remain there. Earlier failed packets were preserved and copied with digests; no failure was relabelled.

| Evidence state | Result and coverage |
| --- | --- |
| Source-confirmed | Exact Convex/TypeScript package integrity; installed Convex artifact equivalence; pinned implementation/public rows/tests; original CI bounds; primary OS/Node contracts |
| Newly run | `node .../probes/entry-authority-control.mjs`, exit 0: unchanged pinned `convexEntries`, nine cases. Genuine root defaults and registration admitted, helper and unrelated export excluded; nested auth/schema and unmounted component exports incorrectly admitted. This is an admission-function control, **not** public Knip proof |
| Newly run | `python3 .../probes/run-owned-controls.py`, exit 0: 12 raw OS/Node cases. Four same-group descendants stopped; eight session/reparent escapes survived. Completion, 450 ms trigger, SIGTERM and owner death covered; escaped processes used both closed and inherited stdio |
| Newly run | Three inherited-pipe callers exited 1 after explicit stream closure, about 252–254 ms after child exit. Three intentionally killed owners exited -9. Other raw callers exited 0; these are experiment-driver statuses, not quality-row passes. The unrelated sentinel survived every case; all 37 recorded owned PIDs were gone after cleanup |
| Newly run | Integration inventory: 29 QA-only added paths / 20 source files; two current defaults / 43 registrations. No source or baseline edits |
| Supplied | Round 1/fix/round 2 public-command controls, actual 120-second escapes, complete restoration and owned-PID receipts; original-tree CI 12 rows, 725 Vitest and 233 native cases. Native reporter was spec, not TAP. These passes coexist with F1/F2 |
| Unrun | New public-row/full aggregate, Linux runtime, strict containment, implemented lifecycle, 120+2-second settlement, browser/product/staging/provider/device/QA acceptance. No dependency installation, full build or browser run was performed |

The raw process experiment tests OS membership/EOF/stdio behavior, not the proposed complete supervisor implementation. Its driver does not implement quality status mapping; its 450 ms signal trigger does not repeat the supplied real 120-second test. Newly run source/library probes do not convert supplied public-command evidence into new runs.

Before implementation can pass, retain independent controls at the actual public commands `node scripts/quality/{dead-code,boundaries,duplication}.mjs` and the corresponding pnpm commands:

| Public seam | Negative / positive controls and oracle |
| --- | --- |
| Convex defaults | Identical unused nested helper/auth/schema/config defaults all fail for unused code; genuine exact root defaults pass. A setup error is not the negative oracle |
| Component/registration | Installed local component root/defaults/functions pass; removing its parent `use`, copying an unmounted component or changing a registrar to a local lookalike must remove admission/fail. Genuine registration with import alias passes; an unrelated export in that module fails |
| Supported conventions | Exact `.js`/`.ts` variants against 1.32.0, duplicate/ambiguous definitions, functions-root changes and unknown wrappers/configuration; unsupported authority rejects explicitly |
| Native execution | Real native reports pass; missing/malformed/partial reports and status mismatch fail; same-group stubborn child/grandchild disappear on completion, actual deadline, each signal and owner loss; unrelated sentinel unchanged |
| Shared deadline/output | Actual 120-second runs for all three rows; duplication consumes time in census before clone. Inherited stdio and output flooding fail within settlement without an external watchdog doing the claimed cleanup |
| Escaping descendants | Double-fork, session change and reparent before observation, both closed and inherited stdio, through completion/deadline/signal/owner loss. Under the proposed contract, record surviving escapes as its explicit limitation; closed-stdio escape is **not** expected to be detected. Under any stronger accepted contract, every survivor fails and missing boundary must reject before launch |
| Aggregate | Timeout fails active row and continues; signals abort and preserve remaining not-run rows; missing/incomplete owner-loss evidence never becomes pass. Retain complete native population and zero failed/cancelled/skipped/todo where a passing native suite is claimed |

Do not repeat builds/aggregate installs solely to publish this research. Implementation then needs real-command red/green proof, native restoration hashes, exact-head quality and fresh independent Stage A/B under the existing budget. Original failure evidence stays retained.

## Implementation boundary and resolution request

A later correction belongs only to #24's structural configuration, entry adapter, scanner lifecycle, associated non-QA tests and quality documentation. Preserve parser/population attestations and every no-new-debt check. All **ten PR170 baseline digests** are retained unchanged; only seven manifests exist on the research branch's pre-PR integration base. Do not add allowances, broad exclusions, suppression directives or changes to `qa/`. If the 20 added QA source inputs reveal a real unused entry, coordinate an exact executable/framework entry or a QA-owned correction; do not exempt helpers or the directory.

Shared-configuration order remains **24 → 75 → 76 → 77 → 26 → 27**. This research implements none of those later tickets and changes no product, auth/schema, QA, provider, account, deployment or installed-system configuration.

**Parent decision requested:** accept the exact component authority, and explicitly approve the foreground process-group cleanup scope while retaining bounded caller/stream deadlines, or retain complete escaped-descendant containment and return the platform boundary for owner decision. The latter is not currently proved on supported macOS/Linux under these constraints. Until that choice is recorded, #173's lifecycle part and PR170 remain stopped; this document is a proposed resolution, not permission to patch, merge, close a gate or reset its budget.
