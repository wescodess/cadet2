# Resolved registration authority: proposal for #176

Status: proposed on 2026-11-22; awaiting parent verification and owner decision. [Issue #176](https://github.com/wescodess/cadet2/issues/176) remains open. This note authorizes no implementation, review round, CI retry or merge.

## Proposed decision

Choose **a closed declaration convention, checked against the actual pinned resolver**: option B below, using only the resolution part of option A. Replace inference from an import spelling and an initial assignment with one atomic authority check over source identity, configuration scopes, resolved import targets, generated mappings, module initialization syntax and immutable exported bindings. Publish exemptions only when every part succeeds. Unknown authority is a public error, never an exemption or a new allowance.

The proved statement is deliberately limited:

> For these exact selected source bytes and configuration identities, this export follows the supported Convex declaration convention, and its registrar import resolves to the approved Convex 1.32.0 implementation through the supported generated mapping, if any.

This is **not a claim that arbitrary JavaScript has been evaluated soundly, that a deployment contains the function, or that the final runtime value remains registered**. Handler behavior, shared globals, SDK execution, runtime environment, load order and later invocation require their own evidence. Root defaults prove supported framework-slot declarations, not valid authentication, schema deployment, routes or scheduled jobs.

The owner must accept this proof boundary explicitly before another correction. If final native registration is required as the unused-code authority, choose option A with source-bound native analysis instead; do not describe this convention as an equivalent substitute. Native backend analysis is unavailable within this research authorization.

## Binding scope and sources

- Integration base: `9fbe3b55e9209b2c227e6c1297a27d06139848d9`, tree `8bd199cb214aa5386b8eb9fc75891e215ed9eb92`.
- Stopped PR170: `6b1263fec3ac4d3d0c13fc3cc82d58e85fdd9bce`, tree `7dbfa97d7430709d85f21d9f3cd6da211de4d564`. Inspected with `git show`; no implementation checkout or source patch was made. The research branch is `research/resolved-registration-authority-176`, directly based on integration, not on PR170.
- [Ticket #24](https://github.com/wescodess/cadet2/issues/24), [spec #72](https://github.com/wescodess/cadet2/issues/72), and [S24 / acceptance evidence](../decisions/pilot-acceptance-evidence.md#consolidated-test-first-seams-in-build-dependency-order) require actual rejection of new debt, malformed/tool-failure controls, immutable evidence and independent acceptance. Static inspection and local positives do not replace those gates.
- [Decision173 canonical resolution](https://github.com/wescodess/cadet2/issues/173#issuecomment-7076236807) governs exact roots/direct declarations and the accepted foreground process-group contract. [Decision175 canonical resolution](https://github.com/wescodess/cadet2/issues/175#issuecomment-7078230328) governs filesystem discovery of effective compiler scopes, including ignored/untracked and generated-builder-local configuration. Both remain binding; the additional correction allowed by175 is spent.
- [PR170 body and ledger](https://github.com/wescodess/cadet2/pull/170) were read. Its body still describes the pre-round4 state and local passes. Issue176 and the retained parent escalation establish the current stop: Stage A **4/8 used, zero clean, four rounds remain**. There is no reset, waiver or clean credit from this note.
- Read `AGENTS.md`, `CODING_STANDARDS.md`, `GLOSSARY.md`, tracker/domain/quality instructions and Convex ADRs0002/0003/0006. The requested `docs/agents/autonomy.md` exists at neither pin; no replacement rule was invented. ADR0002 makes Convex the domain system of record; it does not make a static lint inference native registration evidence. No ADR is reopened here.

All external evidence below is rooted at `~/.orchestrate/scratch/cadet2-decision-176-evidence/`, abbreviated `E/`. `E/README.md` is the evidence index. Raw supplied failures retain their original locations and copies/digests in `E/supplied-evidence-index.json`.

## What the pinned tools actually establish

A frozen, offline, scripts-disabled install in the provisioned checkout supplied Node24.20.0, pnpm9.12.3, Convex1.32.0 and TypeScript5.9.3. Resolve esbuild **from Convex's own package**, which selects0.27.0. An unrelated ancestor installation of esbuild0.25.11 was visible to a broad Node lookup and was not used. Knip6.47.0 is PR170's pin; no fresh Knip installation or public structural command was run in this research branch.

The installed Convex source is primary evidence, retained with hashes in `E/primary-source-index.json`:

| Pinned source | Consequence |
| --- | --- |
| `convex/src/bundler/debugBundle.ts:37-67` | `innerEsbuild` bundles ESM for the chosen platform, with explicit `convex,module` conditions, automatic JSX, ESNext, tree shaking and production `NODE_ENV`; it requests a metafile. Browser defaults therefore matter. |
| `convex/src/bundler/index.ts:395-493` | Entry discovery has directory, extension, basename and component rules; a familiar filename under an ordinary nested directory is insufficient framework authority. |
| `convex/package.json` | `./server` and `./values` have distinct import/require targets. For the observed ESM imports, approved targets are the selected package's `dist/esm/server/index.js` and `dist/esm/values/index.js`, not its TypeScript declarations. |
| `convex/src/server/impl/registration_impl.ts:389-414` | A genuine query builder returns a function and sets registration properties on it. A `const` binding does not freeze those properties. |
| `typescript/lib/typescript.js:126168-126173` | `findConfigFile` searches for `tsconfig.json` by default. It is not proof of esbuild's effective configuration or runtime import target. |

These are observations of the installed pins, not claims about future package versions. The public npm package is [Convex1.32.0](https://registry.npmjs.org/convex/-/convex-1.32.0.tgz). An attempted raw GitHub URL using tag `1.32.0` returned404; it is recorded in `E/downloaded-primary-index.json` and is not treated as source evidence.

The pinned [esbuild0.27.0 resolver](https://github.com/evanw/esbuild/blob/v0.27.0/internal/resolver/resolver.go) has separate package, inherited browser and compiler scopes. It recognizes `tsconfig.json` **or `jsconfig.json`** in each directory and supports package substitutions. Its [package parser](https://github.com/evanw/esbuild/blob/v0.27.0/internal/resolver/package_json.go) handles browser maps and package import/export metadata. Thus checking only the nearest package or TypeScript's default config search cannot establish the bundler target. These files were downloaded, hashed and retained, independently of current unversioned documentation.

`esbuild.build` metadata and `build.resolve` report resolution, not Convex function registration. The [official resolver API](https://esbuild.github.io/plugins/#resolve) is usable without evaluating application imports: an empty build can resolve each known edge with its actual importer directory and import kind. This was observed with the pinned package, not merely assumed from documentation.

Native registration analysis is a different seam. Installed `convex/src/cli/lib/deploy2.ts:64-101` calls backend `start_push` / `evaluate_push`; `deployApi/startPush.ts` receives analysis in the response. Installed `cli/lib/functionSpec.ts:7-32` invokes deployment system queries. [Official function-spec documentation](https://docs.convex.dev/cli/reference/function-spec) also describes deployment inspection. No supported credential-free, backend-free native function analyzer was found in this installed CLI. That is a bounded finding about inspected interfaces, not proof no such facility could exist elsewhere. Running a local backend, evaluating arbitrary application bundles or contacting a deployment was not authorized and was not attempted.

## Alternatives

| Option | Actual semantics and available proof | False exemption / false negative risk | Cost and smallest seam |
| --- | --- | --- | --- |
| **A. Pinned resolution plus native function analysis** | esbuild can establish actual targets offline. Real native analysis would establish registration in the analyzed environment only if its source/configuration/bundle identities are bound to this candidate. It requires the backend seam described above. Node evaluation of a synthetic bundle is a useful oracle, not that native analysis. | Resolution alone still admits a genuine builder whose result is reassigned or mutated. Old deployment metadata may exempt a removed/changed export. Arbitrary Node application evaluation has environment and side-effect differences. Native analysis must fail closed when absent or stale. | Resolver-only work is small and bounded; full native analysis adds backend lifecycle, environment and provenance ownership. Smallest honest full seam: exact-candidate native analysis receipt consumed by the row, with no fallback. Unavailable here and unsuitable as a hidden new local dependency. |
| **B. Closed immutable declaration convention with pinned resolution — chosen** | Proves the finite convention stated above. Positive syntax, exact scope identities and actual target checks jointly establish authority; no application execution. | Legitimate wrappers, custom imports, mutable declarations and unsupported configurations fail visibly. A conforming declaration is still not final runtime proof. Opaque handler code and trusted dependency/global behavior remain outside the claim. | Replace the current adapter's authority construction; use one bounded resolver worker and a strict receipt. Existing43 declarations fit the observed shape. Future syntax support requires an intentional policy change and controls, not another inference fallback. |
| **C. Maintained explicit authority** | A reviewed manifest of exact path/export/kind plus source/configuration/dependency digests can authorize a finite set of declarations. A native receipt could instead be attached to each exact manifest version. A list of names alone is only an exemption list. | Stale names can hide an ordinary export at the same path. Content-bound records avoid silent drift but still express reviewed intent unless native analysis supplies the claim. Missing records deliberately produce errors/ordinary debt. | Small matching code, substantial maintenance: each affected source/config/dependency edit invalidates records. At least45 current Convex records and their shared closure need ownership. Smallest defensible seam is exact-digest matching with a required reviewed update. Do not disguise it as a new debt baseline. |

B is selected because the current graph is small, its declaration shapes are compatible, and its failure boundary can be explicit without adding backend execution or per-handler approval manifests. The trade is real: convenience for arbitrary modules/wrappers is declined, and the accepted proof is convention compliance.

## Finite authority contract

### 1. Source and scope identity precede syntax admission

Use the existing trusted structural inventory. Keep all source accounting and native population checks. Excluded/generated source does not become an authority input merely because it exists: the canonical generated builder is an explicit additional authority input, bound to a tracked path and its bytes. An untracked or ignored authority file is an error; an ignored untracked ordinary source file remains subject to the existing population policy, not an implicit new framework entry.

For every selected Convex source and the generated builder, walk the **filesystem ancestors to the repository root**, independently of Git selection and ignore rules. Inspect all effective package/browser scopes and both compiler configuration names. Discover candidate component/default/configuration files by filesystem identity as well. Do not stop at the nearest `package.json`: the inherited-browser observation demonstrates why that is insufficient.

Supported application configuration is deliberately closed:

| Input | Supported version1 rule |
| --- | --- |
| Functions root | Only `convex/`. `convex.json` may be absent, or be a tracked canonical regular JSON file with only `$schema` and `functions`, with `functions` absent or `convex` / `convex/`. Other roots, keys or duplicate/ambiguous configuration fail. |
| Root package | The canonical tracked root `package.json`, ESM, the existing direct declaration `convex:^1.32.0` with the frozen lock selecting exactly1.32.0 (no alias/path/workspace replacement), and the corresponding installation. No application resolution metadata (`browser`, `imports`, `exports`, `main`, `module`, package `tsconfig`, nonstandard conditions) is supported. Other existing metadata/scripts/dependencies retain their ordinary meanings and checks. No arbitrary package configuration is executed. |
| Descendant package scopes | Any `package.json` on a selected Convex/generated-builder ancestry below the repository root fails, even `{}`, ignored, untracked or apparently irrelevant. Descendant `node_modules` search roots, self-named packages and alternate package stores on these paths fail. Installed pnpm links are handled separately below. |
| Convex compiler config | Require the canonical tracked `convex/tsconfig.json`; do not silently fall back if it disappears. Accept only the stopped head's documented keys/values: its14 compiler options, `include:["./**/*"]`, `exclude:["./_generated"]`, including its two `typeRoots`. No inheritance, `paths`, `baseUrl`, `rootDirs`, `moduleSuffixes`, custom conditions or unknown options. A deliberate policy change is required for any extension. |
| App compiler config | Validate the canonical tracked root `tsconfig.json`: `files:[]` and the four existing Nuxt project references. Generated `.nuxt` configurations do not become Convex registrar authority. Root inheritance/substitution options are unsupported even if a nearer Convex config currently masks them. |
| Other compiler scopes | Any descendant `tsconfig.json` or `jsconfig.json`, including `_generated/`, fails before exemption, even empty. A root `jsconfig.json` is unsupported. Malformed, untracked, ignored or aliased configuration fails explicitly. |
| Source/configuration symlinks | Every application authority path and ancestor must have canonical regular-file/directory identity. File and directory aliases, dangling links and nonregular authority files fail. Ambiguous `.ts` / `.js` defaults/builders fail. Case/path identity must agree with the selected source. |
| Installed package links | Normal pnpm links are permitted only when real paths identify the one lock-selected installed package under this checkout's `node_modules/.pnpm`. An outside, nested, alternate-version or fixture package cannot substitute for that identity. The tool installation and SDK package contents are trusted, as are Knip and the compiler; this is not a sandbox against edited tooling. Version text alone is insufficient. |

The stopped Convex options are `allowJs`, `strict`, `noUncheckedIndexedAccess`, `moduleResolution`, `jsx`, `skipLibCheck`, `allowSyntheticDefaultImports`, `typeRoots`, `target`, `lib`, `forceConsistentCasingInFileNames`, `module`, `isolatedModules`, `noEmit`. The research branch's dev config lacks the PR's `typeRoots` addition; adopting this proposed policy belongs on the corrected implementation head, not in this docs branch.

Configuration presence/bytes and absence witnesses are part of a single-run snapshot. Re-read relevant identities before publishing authority and after native scanning; source/configuration drift invalidates the run. This is ordinary concurrent-edit detection on a trusted checkout, not an adversarial filesystem race guarantee. A source pin alone does not freeze ignored filesystem scopes.

### 2. Resolve the actual authority edges

Use Convex-owned esbuild0.27.0, matching the pinned `innerEsbuild` resolution options. Resolve each authority-bearing import from its actual importer with `kind:import-statement`, `resolveDir:dirname(importer)` and the correct platform. No `tsconfigRaw`, path alias, resolver override, externalization, application plugin or invented condition is allowed. The worker must not replace ambient configuration with a benign synthetic one.

For isolate modules use browser/ESM with explicit `convex,module` conditions; normal builtin import/default/browser conditions still apply. If supporting a leading `use node` action module, check the corresponding Node platform as well; query/mutation declarations in such a module are unsupported. Do not silently apply browser observations to Node modules. The current inventory has no such module, and Node-platform acceptance remains a required future control.

Each direct registrar/factory edge must resolve to the approved package's exact ESM `server/index.js`. Validator imports must resolve to its exact ESM `values/index.js`. An allowed generated import must resolve to the exact selected generated source, and that source's own Convex edge must pass the same resolver check. These are real paths checked against selected package ownership, not suffix comparisons. Disabled, external, unresolved, ambiguous or alternate targets fail.

Package `browser` mappings, `imports`, self `exports`, conditional `exports`, local replacements and nested package installations are therefore addressed by **both** the closed application scope rule and target equality. Canonical installed package exports/conditions are supported; arbitrary application versions are not. A mapped import that happens to land on a canonical file still fails an unsupported application scope. The resolver does not excuse unsupported syntax, and syntax does not excuse the wrong target.

`build.resolve` is sufficient for this target observation. Do not call esbuild's human-readable bundle analysis a function analyzer. Emit the resolver options, importer/specifier, resolved identity and relevant source/config hashes in the receipt. No real environment values belong in it.

### 3. Admit a closed module initialization language

Apply the whole-module rule to every module claiming a framework exemption and to the canonical generated builder. Ordinary modules without authority claims remain ordinary Knip inputs; unsupported constructs do not give them an exemption. An unsupported authority claim is an error, not a quiet fallthrough.

Supported top-level statements are static named ESM imports, erased type/interface declarations, ordinary function declarations whose bodies are not invoked at initialization, `const` declarations with the expressions below, explicit supported exports, and a permitted runtime directive. Runtime namespaces, enums, classes/static blocks, CommonJS exports/import-equals, decorators, top-level await, arbitrary expression statements, loops, branches, try blocks, IIFEs and dynamic imports/evaluation are outside the initialization grammar and fail a claiming module. Initial authority support is limited to plain `.ts` / `.js` ESM source; JSX syntax and import attributes are unsupported anywhere in a claiming module, including opaque bodies, so emitted implicit runtime imports cannot bypass the closed import rule. Other source extensions remain selected ordinary inputs and cannot gain an exemption until supported explicitly.

The expression grammar is recursive and positive:

- Primitive literals, plain arrays and plain object property assignments with literal/identifier keys. No getters, setters, methods executing during initialization, computed keys, proxies or general spreads.
- References to earlier local immutable data/validator declarations, with lexical binding identity and no forward/cyclic initializer chains. Plain data may include the unshadowed builtin `new Set` with a literal-data array: this is needed by the existing recommendation lifecycle sets. No other arbitrary constructors or builtin method calls are admitted.
- Calls to the resolved canonical validator binding with exactly the methods currently needed: `any,array,boolean,id,literal,null,number,object,optional,string,union`. Arguments must use this data/validator grammar. Known validator constants are reusable. Namespace imports and mutable member aliases are not supported.
- One canonical registrar call per candidate, with exactly one plain definition object (`args`, optional `returns`, `handler`) or a direct function expression for the supported function form. Handlers are inline arrow/function expressions or references to an ordinary local function declaration; no call is made to obtain a handler. No duplicate/unknown definition keys, computed keys, accessor definitions or general spreads.
- The exact schema factory chain described below. Auth has the single explicit provider expression exception described below; it is not a general exemption for spreads or provider calls.

Handler/helper bodies are opaque application code for this authority check. They are not executed, modeled as pure, or claimed safe. Their invocation-time dynamic evaluation, imports, side effects and behavior remain outside this convention proof and subject to existing application/security/type gates. They cannot reference or capture authority bindings through a supported alias: the lexical reference restrictions below apply throughout the module, including nested bodies. This does not purport to detect arbitrary reflective/string-based JavaScript behavior. No runtime conclusion is inferred from the opaque region.

Static runtime imports in a claiming function/schema module are limited to named imports from canonical `convex/server`, named validator imports from canonical `convex/values`, and a relative import resolving exactly to the canonical generated server. Relative generated spelling may be extensionless or `.js`; it must not resolve to an alternate `.ts`/`.js` sibling. Type-only imports are erased and grant no runtime authority. Side-effect-only imports, ordinary helper imports, barrels, default/namespace imports, package `#imports`, `require`, dynamic imports and arbitrary transitive application initialization are unsupported in claiming modules. Future helper-module support needs a closed transitive initialization contract and new controls first. This limitation fits all four existing registration modules.

The trusted SDK and the explicitly named auth helper do execute in real application imports; this research does not establish their global purity. The policy declines arbitrary application import-time effects and never evaluates them to find out what happened.

### 4. Bind the export immutably; do not confuse const with deep immutability

Support these two named declaration forms, including erased parentheses/type assertions/satisfies wrappers and static import aliases:

```ts
import { queryGeneric as ask } from 'convex/server'
export const named = ask({ args: {}, handler: () => null })
```

```ts
import { query as ask } from './_generated/server'
const registered = ask({ args: {}, handler: () => null })
export { registered as named }
```

The second form is a single export edge to the original `const` initializer, not an assignment/value-alias tracer. Every declaration/export name must be unique under lexical binding identity. No `let`, `var`, destructured candidate, reassignment, duplicate export, namespace merging or export-from/barrel/star export earns authority. A registered default in an ordinary function file is deliberately unsupported initially; an ordinary default there gets no framework exemption.

Registrar bindings may appear only in their permitted direct callee positions or the exact generated mapping. Candidate registration bindings may appear only at their declaration and explicit export edges. Reject every other value reference, including writes/deletes, property reads/writes, bracket access, `Object.assign`, reflection arguments, storage in objects/namespaces, passing to helpers, closures and later aliases. Check lexical symbols, not text matches that confuse a shadowed identifier with the import. Binding chains such as `const alias = ask` remain unsupported.

These reference rules rule out the observed mutable-export and const-property controls without trying to simulate mutation. They also prevent a checked namespace/property path from later becoming an untracked registrar. They do not prove frozen runtime function objects or the absence of every possible reflective effect outside this finite model.

Unrelated exported constants/functions/defaults in an admitted file remain ordinary unused-code obligations. Do not exempt the entire file's exports or treat use by the authority worker as an application consumer. Existing `includeEntryExports:true` and native issue identities stay intact.

### 5. Generated builders, root defaults and component boundaries

- Select exactly one tracked canonical `convex/_generated/server.js` or `.ts`. Accept only the seven named canonical mappings: `query`, `internalQuery`, `mutation`, `internalMutation`, `action`, `internalAction`, `httpAction`, each mapped to its corresponding `*Generic` import. Permit direct immutable assignments or direct named re-exports. Type-only imports/declarations are allowed; extra runtime imports/statements/mappings, missing/duplicate names, mutable mappings and ambiguous siblings fail. `.d.ts` declarations do not establish runtime authority. Apply all scope/resolution checks to this file despite its ordinary source exclusion.
- `schema.ts` / `.js`: only the exact root default slot, directly `defineSchema` over a plain table map. Support canonical `defineTable` with the validator grammar and literal `.index(name, fields)` chains, including the existing schema's calls. Do not speculate about custom factories, spread-computed schemas or other chain methods.
- `auth.config.ts` / `.js`: exact root default, a plain object containing a providers array. Support empty providers and the current named `getAuthConfigProvider()` with no arguments, resolved to the lock-selected `@convex-dev/better-auth@0.10.11` auth-config ESM target. Only its current direct object spread is permitted. Permit the existing local const `process.env.CONVEX_SITE_URL ?? 'http://localhost:3000'` and string templates for issuer/JWKS. No environment value is read by the authority check; the shape is observed. This grants slot convention, not provider validity or runtime availability. General auth helpers/getters/calls/spreads remain unsupported.
- Preserve the existing finite empty root-default positives: `httpRouter()`, `cronJobs()`, and `defineApp()`, directly or through one immutable local default binding. Arbitrary router/schedule mutation and component `.use`/installation calls are unsupported until explicitly designed. They are absent from the current application. Recognizing their empty declaration is not evidence of any mounted route/job/component.
- Match native entry discoverability before granting named exemptions. Nested ordinary `schema`/`auth.config`/`convex.config` defaults, hidden/skipped/multi-dot source, copied components and unmounted nested component trees get no implicit authority. Retain their normal file/export debt. A nested component definition cannot hide selected source through an ignored/untracked configuration. New component roots/installation edges require a separate explicit supported authority policy; no filesystem basename inference.

## Compatibility inventory

The independent observer reads actual Git blobs and TypeScript ASTs, not the adapter's returned exemptions. `E/inventory-observation.json` and `E/shape-observations.json` retain every name, line, import, top-level initializer and reference observation. The registration/default sources are identical between dev and stopped PR170; the only Convex diff is its compiler config.

| Source | Current declarations | Compatibility obligation |
| --- | --- | --- |
| `convex/ragIngestionInternal.ts` |16: `runManualBatchAsNuxtAdmin`, `runScheduledBatch`, `prepareManualBatchAsNuxtAdmin`, `prepareScheduledBatch`, `startBatchExecutionFromNuxt`, `getBatchExecutionPlanFromNuxt`, `listSourceItemsForSourceFromNuxt`, `markSourceRunStartedFromNuxt`, `completeSourceRunFromNuxt`, `finalizeBatchExecutionFromNuxt`, `createOrReuseAiSearchSyncJobForBatchFromNuxt`, `markAiSearchSyncJobSubmittedFromNuxt`, `updateAiSearchSyncJobFromNuxt`, `listBatchesAsNuxtAdmin`, `getBatchDetailAsNuxtAdmin`, `queueSourceRunRetryScaffold` | Named const calls through generated builders; canonical validators and ordinary dormant helpers. |
| `convex/ragSources.ts` |10: `getAdminStatus`, `bootstrapCurrentUserAsAdmin`, `listSources`, `getSource`, `createSourceSubmission`, `updateSourceConfig`, `approveSource`, `rejectSource`, `pauseSource`, `resumeSource` | Same supported shape; no helper runtime imports. |
| `convex/ragSourcesInternal.ts` |6: `syncAdminFromNuxtAllowlist`, `approveSourceAsNuxtAdmin`, `rejectSourceAsNuxtAdmin`, `pauseSourceAsNuxtAdmin`, `resumeSourceAsNuxtAdmin`, `removeSourceAsNuxtAdmin` | Same supported shape. |
| `convex/recommendationRuns.ts` |11: `createQueuedRun`, `listForUser`, `readStatusForUser`, `readPathwayEvaluationForUser`, `writePathwayEvaluationForUser`, `readRankedRecommendationsForUser`, `writeRankedRecommendationsForUser`, `startProcessingForUser`, `setTerminalStatusForUser`, `listForAdmin`, `readRankedRecommendationsForAdmin` | Same supported shape plus literal lifecycle `Set` initializers. |
| `convex/schema.ts`, `convex/auth.config.ts` |2 exact defaults | Schema validators/index chains and the specific auth expression above. No evaluation or backend validity claim. |
| `convex/_generated/server.js` |7 immutable canonical builder mappings | Exact generated mapping; its type companions/generated API remain under existing inventory rules and do not create more exemptions. |

All43 named declarations are `const`, use one object argument and have no local value references beyond their declaration. All four modules import only `convex/values` and their generated server. The observer found no additional top-level statement family in the six application files. These facts support **expected compatibility** with the proposed grammar; no future adapter/public-command pass is claimed.

The stopped tree has **707 structural source inputs**, **703 Knip inputs**, and **30 tracked QA paths**. The independent written-scope path census exactly matches the supplied native inventory, including all **20 QA source inputs**. Supplied native Knip partitions703 as362 analyzed plus341 unused; the20 QA inputs are analyzed. Current framework records are2 Convex defaults +43 named declarations +1 independent QA Playwright default =46, not46 Convex registrations.

The20 QA source inputs must remain selected: under `qa/acceptance/28/`, `account-schema.ts`, `accounts.mjs`, `app-runtime.mjs`, `compare-digests.mjs`, `digest.mjs`, `grant-admin.mjs`, `init-db.mjs`, `integration-fixture.mjs`, `journeys.spec.ts`, `legacy-fixture.mjs`, `local-backend.mjs`, `operator-cli.mjs`, `oracles.ts`, `playwright.config.ts`, `probes.mjs`, `record.mjs`, `refresh-probes.mjs`, `retain-legacy.mjs`, `runtime-directory.mjs`; plus `qa/eslint.config.mjs`. Keep the existing executable roots and the exact Playwright-default authority. Adjacent helper exports remain checked. QA alone owns any QA-writing acceptance case; this task does not run or rewrite it.

Dev has seven baseline manifests; PR170 adds boundaries/dead-code/duplication for ten total. The proposed correction must preserve all ten identities and existing allowances29/556/81; an inventory or authority fix cannot pay for itself with a baseline increase, blanket QA/helper exclusion, suppression or renamed debt. Native population/schema/exit agreement, tracked-gitignored inclusion, suppression rejection, changed-file duplication accounting, archive-rename debt retirement and baseline-writer refusal remain required.

## Concrete implementation seam and public errors

After authorization, replace the authority-building portion of `scripts/quality/convex-entries.mjs`; do not append two special-case filters to `registrars()` and `variablesIn()`. Its current literal-name admission at222-229 and initializer collection at59-65 are the two confirmed boundaries that must disappear as standalone authority.

A bounded worker, proposed `scripts/quality/convex-authority.scanner.mjs`, owns filesystem snapshot construction, positive grammar checks, lexical binding identity and the pinned resolver observations. It executes no application module. `convex-entries.mjs` coordinates through existing `runScanner`, validates one strict versioned JSON receipt and returns the complete supported entry set. A small parser module, proposed `convex-authority.parser.mjs`, validates shape, exact population/identity coverage, duplicate entries, pin/options identities, target ownership and success/exit agreement. Missing, truncated, stale, malformed, partial or inconsistent receipts fail closed. No partial successful entries are exposed.

Add only that worker's exact path to the existing CLI `entry` array in `scripts/quality/knip.json`, alongside the existing scanner executables. Preserve `includeEntryExports:true`; do not add an ignore rule or blanket helper exemption. The parser is a normal static import. New implementation/test files must enter the recomputed native population, while all20 QA inputs remain present; the current703/707 census is a pinned compatibility observation, not a permanent population constant.

`dead-code.mjs` awaits this result before constructing the Knip config or filtering any export. Keep the `(file, export-name)` identity and the native report/population checks. Add `proof:declaration_convention_v1` and source/configuration identities to retained authority evidence; do not label it native runtime analysis. The worker and Knip share the dead-code row's one120000ms active deadline; adding authority work cannot silently double it. Keep the64MiB combined capture and2000ms settlement bounds. Any row-budget accounting changes require their own controls, not a relaxed limit.

Retain the current error prefix and exit1, with relative path plus a stable reason such as `package_scope`, `compiler_scope`, `resolved_target`, `module_initialization`, `mutable_binding`, `authority_reference`, `generated_mapping` or `source_changed`:

```text
Unsupported Convex 1.32.0 authority in convex/nested/package.json: package_scope ...
Unsupported Convex 1.32.0 authority in convex/functions.ts: mutable_binding unused ...
```

Ordinary new debt retains its existing native `file|exports|symbol` / `file|files|file` failure. Worker timeout, signal, output overflow or malformed output is an infrastructure/authority failure, never an empty successful entry set. Keep aggregate interrupted/aborted/not_run states truthful. No new dependencies, debt manifests, application/schema edits or QA edits are needed for the proposed seam. Relevant unit/native controls belong outside `qa/`.

## Retained failures and new offline observations

The supplied round4 browser-map case and mutable-export case remain **distinct failing public controls**. At stopped6b, each actual `node scripts/quality/dead-code.mjs` exited0 with556/556 while native Knip reported the new unused export and the adapter filtered it. Canonical const was a separate public positive0 and native synthetic function/`isQuery:true`. Unrelated-export variants failed1. Copies of both admissions, three bundle commands/metafiles/outputs, and the original report/escalation are retained under `E/supplied-r4/`. Nothing here relabels those false passes as acceptable.

Fresh observations used only external synthetic inputs and the actual Convex-owned esbuild. No public structural row, new implementation, full test suite, backend or application bundle evaluation ran. `E/offline-controls.mjs` uses the pinned `innerEsbuild` options with an empty plugin list: the synthetic inputs contain no wasm/external dependency requiring Convex's extra plugins. Its14 builds and14 synthetic Node evaluations all exited0. Those exits mean the controlled observations ran; they are not passes of the future authority policy.

| External synthetic input | Actual emitted export / target observation | Proposed policy outcome, unimplemented |
| --- | --- | --- |
| Canonical immutable declaration | Function, `isQuery:true`; canonical SDK target | Admit convention. |
| Original browser substitution shape | Object, `isQuery:false`; local helper target | Reject scope/target. |
| Original mutable `let` reassigned170 | Number170, `isQuery:false`; genuine SDK target | Reject mutable binding. |
| Mutable local exported by alias, then reassigned | Number170; genuine target | Reject mutable binding/alias authority. |
| Const function property assignment | Function, `isQuery:false` | Reject non-export reference. |
| Const plus `Object.assign` | Function, `isQuery:false` | Reject reference and initialization effect. |
| Imported side effect plus reflective mutation | Function, `isQuery:false` | Reject runtime import/initialization effect. |
| Package `#imports` to local helper | Object; local helper | Unsupported import/scope. |
| Self-named package `exports` | Object; local helper | Unsupported scope/target. |
| Ancestor browser map plus nearer empty package | Object; inherited substitution survives nearer package | Reject any unsupported ancestor scope. |
| Nested `jsconfig.json` with paths | Object; local helper, while TS default config lookup finds parent tsconfig | Reject descendant compiler scope; actual resolver supplies independent target evidence. |
| Nested same-version synthetic package with `convex` condition | Object; synthetic package target | Reject alternate package identity; version text cannot suffice. |
| Canonical named import/export aliases over const | Function, `isQuery:true` | Admit the one immutable export edge. |
| All seven canonical direct builders | Seven functions with the corresponding query/mutation/action/HTTP markers | Preserve all seven declaration forms. |

The synthetic package search root is an external fixture symlink to this checkout's installed dependencies; it is not a supported application-source alias. All fixture code and outputs stay in `E/controls/`. The original case identities and the canonical positive are independent of the extra alternatives.

`E/resolution-observer.mjs` separately exercised `build.resolve` using an empty build, never loading application imports. It resolved12 current runtime import edges, including generated/schema/auth edges, plus five discriminating fixture edges:17 requests, zero errors. Canonical server/values/generated/auth targets agreed with installed package ownership; the four substitution fixtures resolved to their actual alternatives. This establishes the proposed offline resolver seam is available at these pins, not that its future receipt parser or public integration has passed.

Exact fresh commands were run from the provisioned checkout:

```sh
E=/Users/wesleyukadike/.orchestrate/scratch/cadet2-decision-176-evidence
python3 "$E/run-bounded.py" install-offline pnpm install --offline --frozen-lockfile --ignore-scripts --child-concurrency=2 --network-concurrency=1
python3 "$E/run-bounded.py" inventory node "$E/inventory-observer.mjs"
python3 "$E/run-bounded.py" offline-controls node "$E/offline-controls.mjs"
python3 "$E/run-bounded.py" resolution node "$E/resolution-observer.mjs"
python3 "$E/run-bounded.py" shapes node "$E/shape-observer.mjs"
```

All five driver commands exited0. Each has `.command.json` and `.log` records, recording120000ms active/64MiB capture/2000ms settlement limits and a load governor15. Maximum observed load across these commands was8.87. Each owned foreground group was absent after cleanup. These are bounded research observations, not exhaustive containment tests. Further packaging/hook/preservation results belong in the evidence index and final handoff.

## Separate PID publication and cleanup prerequisite

The retained Linux run45026831272 uses checkout95e5f04 with exactly stopped tree7dbfa97. Its artifact digest is `sha256:77da84a6e8b3ffa25a852476ce28b80a8540a36c67b23c7fe1d86158cfb6e2e8`, independently recomputed from the supplied archive and matching its metadata. Eight rows pass, then `test:policy` is interrupted by SIGKILL after97.2s. Components/build/native are `not_run`. The earlier local12/741/233 plus complete TAP remains supplied local evidence, not a Linux pass.

The parent separately reproduced a real helper defect: a published empty PID file parses via `Number('')` to0; `scannerTestResources.cleanup()` passes that value to `process.kill(0,'SIGKILL')`. The isolated driver is killed and an unrelated sentinel survives. Its exact source/result are copied in `E/supplied-ci/`. **The CI artifact lacks a PID trace establishing this caused that specific CI SIGKILL. Causation remains unproven.** No blind retry or patch was made.

Proposed bounded correction, separately authorized from declaration semantics:

1. In `tests/support/quality-scanner-worker.mjs`, publish readiness atomically through a unique private temporary file then rename, or use a private IPC handshake. Bind the record to a fresh test/run nonce, expected depth/role and exact spawned process identity. An empty/partial file means not ready; bounded wait expiry fails the test.
2. Remove file contents as independent kill authority. Retain actual spawned child handles and group-owning controller identity. Validate every numeric identity before any probe/signal: strict decimal syntax, safe integer greater than1, expected nonce/role/identity; reject0, negative/group forms, caller PID/group, malformed, foreign and stale records. No `Number` coercion at the trust boundary. Signal0 also needs the guard.
3. Keep group ownership on a live known supervisor until cleanup acknowledgement/reaping so its PGID cannot be recycled during owned-group cleanup. For deliberately separate-group test controls, retain a test-owned controller with the actual child handle until cleanup; do not recover authority from an arbitrary PID file after the original owner exits. If identity cannot be established, fail and report unknown cleanup rather than signal a guessed/reused PID. A positive integer or `kill(pid,0)` alone proves neither ownership nor birth identity.
4. Make cleanup idempotent and bounded, await process exits, and remove temporary files only after settlement. Record publication state, identity provenance, result and unrelated sentinel liveness without environment/process argument/title enumeration. This is test-resource management, not an expansion of scanner containment.

The smallest repair area is the shared test helper and its owned process tests/call sites; no scanner process-group contract change is proposed. A numeric guard alone fixes the demonstrated PID0 coercion but does not finish the publication/identity contract. Portable Node has no assumed pidfd-style guarantee here; if a test cannot retain a live ownership handle/controller, redesign that fixture before calling its cleanup safe.

## Proposed acceptance/control matrix

Every row below is **future required evidence**, not a new pass. Use public `node scripts/quality/dead-code.mjs` / other affected row commands with real pinned native reports, exact source/configuration snapshots, expected failure reason, exit, restoration and positive controls. Controlled output injection is separately labeled and cannot stand in for native provenance. Retain the original false-pass evidence even after correction.

| Family | Required negative / distinguishing control | Required positive and proof surface |
| --- | --- | --- |
| Original suppressions / source accounting | Knip per-export/file/dependency directives, configuration suppressions, ignored untracked framework consumer; tracked-gitignored source remains selected | Unmodified native report/population; ordinary consumed export passes, unused new export/file/dependency fails1 with exact identity. No allowances added. |
| Original jscpd directives | Suppression in comments/strings cannot hide a changed clone | Native changed-file clone fails; unique source passes; unchanged inherited clones are charged according to existing contract. |
| Original rename/debt retirement | Archive rename followed by restoration cannot resurrect retired allowances; deleted/paid-down debt cannot retain stale entries | Both affected clone identities retire; expected baseline policy and restored positive verified. |
| Original module entry/import boundaries | Cycle, private import including private index, Nuxt alias/server boundary bypass | Acyclic public entry/owner import passes at actual boundaries command; inherited29 allowance preserved. |
| Original eligible population/report completeness | Empty/partial/self-consistent fake census+clone output, missing Vue block/file, max-size/line/short-input edge, malformed/truncated/exit-mismatched Knip/structural reports | Independent native census and complete population agreement; legitimate empty/short source controls; all20 QA sources retained. No shared empty oracle. |
| Exact defaults / component identity | Identical unused nested auth/schema/config defaults, copied/unmounted/hidden/multi-dot modules, ignored/untracked component definition, ambiguous default siblings | Exact root schema/auth/default positives, all seven generated mappings, ordinary unrelated exports still fail. Empty http/crons/app defaults retain their narrowly described convention. |
| Compiler authority | Root inheritance/substitutions; nested tracked/untracked/ignored/empty/malformed tsconfig **and jsconfig**, including generated scope; root fallback/deletion; config file/directory symlink | Approved exact root config identities and canonical direct declarations pass. Restore ignored filesystem scopes as well as tracked files. |
| Package/target authority — R4 S1 | Original browser mapping with native unused report retained; root/ancestor maps, `false` target, generated-relative map, nearest-empty package, `#imports`, self/conditional exports, synthetic same-version/nested package, package symlink, malformed config | Original canonical const remains separate; actual browser/ESM targets and appropriate Node-platform controls match selected package. Unsupported scope rejects even if target happens to be canonical. |
| Binding authority — R4 S2 | Original exported let reassigned170; var, local mutable export alias/default, destructuring, duplicate names, reassignment/update | Canonical const and one immutable export alias pass; importer aliases are supported. Native unused report remains visible before authority filtering. |
| Property/namespace effects | Const property/bracket mutation/delete, Object.assign/reflection/helper escape, mutable namespace/property alias, closure capture and later value alias | No value references beyond approved declaration/export edges; unrelated helper exports continue through native Knip. |
| Initialization / dynamic evaluation | Side-effect import, ordinary runtime helper/barrel, IIFE, getter/computed key/spread, class static block/runtime namespace/enum, top-level await/import/eval, handler-factory call | Current validators/schema/index/Set/auth shapes and dormant handler/helper declarations pass. Opaque invocation behavior is not credited as runtime proof. |
| Generated provenance / drift | Mutable/extra/missing/duplicate builder, local lookalike, generated-local config/package, stale receipt, partial receipt, source/config race | Exact current seven mappings plus direct named re-export form; complete hash/scope population revalidated before exemptions and final scan accounting. |
| Accepted foreground lifecycle | Same-group child/grandchild through normal/nonzero/tool-signal exit, SIGINT/TERM/HUP, owner/supervisor loss, timeout, >64MiB, inherited pipes and shared deadline exhaustion | Real public row receipts show group cleanup, bounded capture/drain and settlement<=2000ms, unrelated sentinels alive. Authority worker + Knip share one dead-code deadline; duplication census/scan still share one deadline. |
| Accepted deliberate escapes | Separate-session/group/reparented closed-stdio escape may survive; inherited escaped pipe must still yield bounded failure | Record closed-stdio survivor as the accepted limitation and clean it with test-owned authority. Do not claim arbitrary-descendant containment or call it a new contract failure. |
| Aggregate evidence | Signal/owner-loss while authority/native scan runs, receipt absence, ordinary row failure | Nonzero interrupted/aborted with remaining rows not_run; ordinary failure continues remaining rows. No success from an empty receipt or swallowed signal. |
| PID parser/publication negatives | Empty/whitespace/partial, `0`, `-0`, negative,1, fraction, exponent, junk, NaN/Infinity, unsafe integer; interrupted atomic publication, stale nonce, foreign/live-sentinel PID/group, caller identity | Reject before any liveness or kill syscall; use call-recording negative controls so no invalid native signal occurs. Timeout is failed readiness, not PID0. |
| PID identity/cleanup positives | Exit-before-read, exit/republication race, duplicate cleanup, owner loss and missing identity; stale record for an unrelated sentinel | Real fresh child/controller handle + atomic record/IPC becomes ready, expected owned group settles, actual direct children are reaped, repeated cleanup is safe and unrelated sentinel stays alive. Run in a fresh isolated native group with an independent watchdog/controller. |
| Frozen preservation / integrated authority | Missing QA input, extra entry exemption, source/baseline drift, CI writer flags and report population mismatch | Ten unchanged baseline identities,30 unchanged QA paths,20 selected QA sources, no-new-debt/rename/process constraints, correct final pin and complete native evidence. |

All seven round1 families remain covered: Knip tags; jscpd directives; tracked-gitignored source; archive-rename retirement; eligible population; framework entry authority; process lifetime. Module entry/import boundaries are an additional retained acceptance family. The matrix expands the recurring authority family instead of spending a new round to rediscover a literal-import variant.

## Authorization and remaining gates

The parent first verifies this concrete proposal, its supported grammar/compatibility and the separate PID plan against the retained artifacts. Then the owner decides whether to authorize **one bounded correction attempt** implementing this exact convention proof, its resolver/receipt seam, the PID publication/identity prerequisite and the listed affected controls. A requirement for final native registration instead returns to option A and a separately authorized backend/provenance design. Silence is not authorization. This note does not ask the owner, close176, restart PR170 or reset any budget.

After an authorized correction, the parent must verify both original public red cases against stopped6b and green rejection at the corrected head, with canonical and unrelated-export controls. New controls must discriminate the proposed alternatives, not just duplicate the adapter's implementation. Preserve complete native report/population and source/restoration receipts. Thereafter obtain the exact-head adopted quality bar, the remaining Stage A gate with four rounds left/clean0, Stage B and applicable independent QA. A new authority-family recurrence still requires escalation under the existing stop rule.

Linux verification remains a separate prerequisite: prove safe helper publication/identity first, then obtain a new authorized exact-head CI run and retain the actual artifacts, including every row and full native TAP. Compare actual checkout tree to candidate, not only branch/SHA labels. Preserve run45026831272 as failed/aborted; do not invent its cause or replace it with older local/f10 evidence. Exact complete native populations, zero failed/cancelled/skipped/todo and all required rows must be demonstrated; a CLI exit or focused subset alone is insufficient.

No browser/Nitro/Convex backend/native233/admin85 run occurs in this research. PR159 retains the exclusive browser/native phase; no browser lock is touched. Required later heavy/QA proof must wait for that ownership and normal authorization. Provider/account/key/region/deployment activation, real Client data and arbitrary application evaluation remain outside this decision.

## Publication and preservation

Only this Markdown note is to be committed/pushed on the research branch, with ordinary hooks and no PR. The base's1949 tracked files remain byte-identical; all30 tracked QA paths and seven present baseline files remain unchanged. The stopped PR's ten baseline blob identities and source pin are retained separately, rather than copying its three additional baselines into dev. No source/dependency/config/test file is changed. Start/end pins, exact changed-path/parent checks, hook output, remote publication and preservation digests are recorded in `E/README.md` and its linked JSON receipts.

This is design preparation for an unresolved owner decision. Existing failures, unsupported native analysis and unrun future gates remain explicit.
