# Token-only colour enforcement

Decision date: 2026-11-22. Technical resolution proposed for parent verification of [#174](https://github.com/wescodess/cadet2/issues/174); no implementation or gate approval is recorded here.

- Research base: integration `dev` at `9fbe3b55e9209b2c227e6c1297a27d06139848d9`.
- Foundation inspected: `f93bab6af9517fafdbe8055356cf60b976bbe836`, compared with original base `1b335bface0686641850ea8cd23aa5c5dea4e45c`.
- Enforcement versions: css-tree **3.1.0**, Tailwind and its Vite integration **4.2.0**, Vue/compiler **3.5.28**, ESLint **10.15.0** from that lockfile. No dependency change is proposed.

## Decision

**Use a closed authoring grammar, shared by every selected source adapter. Prohibit authored custom-property registrations and unsupported descriptor blocks. Validate colour values structurally, including every fallback, against approved token roots. Validate Tailwind expansions separately from authored CSS. Unknown syntax fails with an actionable diagnostic.**

This removes the need to interpret arbitrary registered-property syntax or keep extending a colour-property regexp. `@property` is unsupported in application-authored styles regardless of its name, syntax string or initial value. This includes `<color>`, unions/lists, `<number>`, `*`, missing/duplicate descriptors, escaped spellings and registrations whose initial value is `transparent`. The last case fails for unsupported registration, not forbidden transparency. Ordinary `transparent` remains admitted everywhere a colour is allowed. No current foundation source needs an authored registration.

The binding contract remains [#160](https://github.com/wescodess/cadet2/issues/160): exact approved tokens in both themes, and no raw colours, arbitrary Tailwind values or inline styles in new UI files. [DESIGN.md](../../DESIGN.md) and the [approved system record](../design/system/decision.md) retain visual authority. This decision neither approves new colours nor changes the specimen. The existing regex token test's phrase “app stylesheets hold no colour of their own” is not proof about every CSS context, generated stylesheet or runtime computed colour. Text that happens to spell a colour is not a paint value.

## Why another descriptor exception is insufficient

The [pinned helper](https://github.com/wescodess/cadet2/blob/f93bab6af9517fafdbe8055356cf60b976bbe836/scripts/quality/design-css.mjs#L24) passes only a property name and value to the classifier; its declaration walk drops descriptor ownership. css-tree's `matchProperty('initial-value', ...)` reports an unknown property. Its contextual descriptor matcher accepts the descriptor's general declaration-value grammar; that alone does not check it against the sibling registration's `syntax`. css-tree also explicitly declines property grammar matching when `var()` occurs. A failed match cannot mean “contains no colour.” [css-tree 3.1.0 lexer](https://github.com/csstree/csstree/blob/v3.1.0/lib/lexer/Lexer.js#L70)

For non-universal registrations, CSS requires an initial value matching the registered syntax and computational independence. Replacing a raw initial colour with `var(--foreground)` is therefore not a general valid repair. Registration changes computed-value behavior and fallback, not merely declaration spelling. Prohibiting the authored feature avoids that additional type system. [CSS Properties and Values API, sections 2–4](https://www.w3.org/TR/css-properties-values-api-1/#the-initial-value-descriptor)

## Finite syntax policy

The following are authoring rules, not claims that css-tree already implements this policy.

| Context | Admit | Reject / fail closed |
| --- | --- | --- |
| Colour leaf | Approved colour-token reference, validated local alias, `currentColor`, `transparent`; CSS-wide keywords only where the property grammar permits them | Hex, named/system colours, raw colour constructors, unapproved palette roots |
| `var()` | Parse its identifier and every fallback recursively; distinguish colour, number/length, font, timing, animation and shadow token types | Raw fallback, malformed/opaque fallback, wrong type, unresolved colour origin, ambiguous alias or alias cycle |
| Colour containers | `color-mix`, `light-dark`, the six normal/repeating linear/radial/conic gradients, `drop-shadow`; validate their complete grammar and every colour operand | Raw operand anywhere; unknown colour producer such as `contrast-color`; relative-colour constructors such as `rgb(from ...)` remain unsupported |
| Ordinary declarations, including shorthands | css-tree's pinned property grammar plus the explicit project extensions below; typed token substitutions remain typed | Unknown property/function/value; partial match; unsupported vendor syntax; treating an unsuccessful lexer match as clean |
| Ordinary custom properties | Colour aliases through the same colour grammar; numeric/dimension/math values and quoted text; known typed theme namespaces for fonts, animation and other non-colour tokens | Untyped arbitrary token streams and ambiguous bare identifiers; `--new-shade:red` rejects even before a consumer is found. `--font:red` is not inferred safe merely because font-family accepts that word |
| Non-colour identifiers / strings | `font-family:red`, `animation:red 1s`, keyframe name `red`, `content:"red #abc rgb(0 0 0)"`, selectors and fragment URLs | Reclassifying opaque CSS or colour-bearing input as ordinary text |
| Standard at-rules | `@charset` in its valid position; resolved `@import`; `@layer`, `@media`, `@supports`, `@container`, `@keyframes`; `@font-face` with known descriptor grammars. Recurse through rules, declarations and supported nesting | Every other at-rule or descriptor block, including `@property`, `@font-palette-values`, `@color-profile`, and unknown descriptors in an admitted block |
| Conditions / selectors | Parse the applicable known grammar. Declaration-bearing support/style tests use the same value policy; selectors, strings and identifiers retain their non-paint meaning | Unparsed prelude, unsupported style query or unknown nesting. Authored raw-colour support tests do not bypass the source policy |
| Tailwind authoring | `@theme` / `@theme inline` with approved-root colour aliases and typed non-colour namespaces; `@utility`, `@variant`, selector-only `@custom-variant`, `@apply`, resolved `@reference`. Expand utilities and check their declarations | New `@plugin`, `@config`, `@source`, unknown directive/prelude; `theme()`, `--theme()` and `--alpha()` as authoring escape routes; arbitrary properties/values/variants and palette utilities |
| Tailwind functional utility | Existing `disc-*` numeric expansion: `--value(integer)` inside checked numeric math | Colour/any-value wildcard resolution, unknown `--value` type or `--modifier` expansion. A numeric argument cannot be fed into a prohibited colour constructor |
| Raw AST / malformed input | Only raw regions consumed completely by a named project prelude parser | All remaining `Raw`, parser recovery, malformed strings/escapes, unmatched delimiters and unexpected EOF; reject instead of silently discarding content |

Normalise CSS escapes for **at-rule, descriptor, property, function and value identifiers before policy lookup**. Keep original locations for errors; do not lowercase custom-property names, which are case-sensitive. Parsing must check explicit lexical balance as well as css-tree errors: its normal CSS recovery can accept a missing closing brace. `onParseError` alone is insufficient. [CSS Syntax](https://www.w3.org/TR/2026/CRD-css-syntax-3-20261001/#escaping), [CSS custom properties](https://www.w3.org/TR/2022/CR-css-variables-1-20220616/#defining-variables)

The token registry comes from the exact approved `tokens.css` / `tokens.json`, their existing theme namespaces and checked application aliases. Preserve optional typed aliases with safe fallbacks, including `var(--glyph-cut, var(--card))`. Check every selected definition and fallback, including scoped definitions; a trusted-looking name is not authority to redefine a token with raw values. Non-colour external variables may have explicit non-colour types; they cannot become colour roots. No selector/cascade simulation is needed when every supported colour definition has only admitted leaves.

Use css-tree for tokenisation and supported grammar, not as a permission oracle. For values with variables, validate references/fallbacks first and use type-preserving symbolic operands for grammar checking; never replace an unknown subtree with a generic safe value. Whole-shadow references retain shadow type. Keep explicit grammar handlers for the finite containers and Tailwind extensions rather than a growing list of supposedly colour-bearing property names. [Parsing options](https://github.com/csstree/csstree/blob/v3.1.0/docs/parsing.md#parsecustomproperty), [var parser](https://github.com/csstree/csstree/blob/v3.1.0/lib/syntax/function/var.js)

## Source selection and adapters

Retain the fixed new-file inventory at `fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3` and existing ratchet limits. Give design enforcement its own source collector; do not add CSS to the generic typed `sourceFiles()` population.

| Source | Required adapter / boundary |
| --- | --- |
| New `app/**/*.vue` | Parse template, script and every plain/scoped/module CSS style block. SFC parse errors reject. Scoping changes selectors, not colour policy |
| New app JS/TS class maps, template classes, `:class`, `cn`/`cva`, `@apply` | Inspect complete static candidates and branches, including variant/modifier forms. Keep named token utilities and the approved `shadow-(--shadow-overlay)` shorthand. Unresolvable generated colour/class choices are unsupported |
| Other new UI script extensions (`jsx`, `tsx`, `mjs`, `mts`, `cjs`, `cts`) | Use the same sink adapters where supported; otherwise reject as unsupported. A missing ESLint glob must not silently exempt a new UI source |
| Plain CSS under `app/`, including unimported new files | Scan directly; a file does not become safe because no import currently reaches it |
| Entry CSS, CSS `@import`, SFC `<style src>`, static JS/TS CSS imports / references | Resolve and traverse the selected closure with a visited set. Newly reached local CSS is checked regardless of directory, extension alias or legacy filename; missing/remote/unresolvable imports reject. No “outside app” escape |
| Vue inline SVG | Parse static and bound paint values, literal conditionals and template literals through the same value parser with custom-property/fallback parsing enabled. Cover `fill`, `stroke`, `color`, stop/flood/lighting colours and other presentation-property grammars; `url(#abc)` remains a fragment reference |
| Computed SVG bindings / spread attributes | Require a finite checked token choice; reject unresolved colour-bearing spreads, dynamic attribute names, animated paint values and CSS `v-bind()` colour injection. Inline/bound `style`, template-embedded styles and uninspected `v-html` markup injection remain unsupported |
| Standalone authored SVG / embedded SVG stylesheet reached by new UI | Currently not covered by the pinned rule. Reject as unsupported until an XML/presentation/CSS adapter uses this same policy; do not claim coverage from the Vue attribute walker. Raster/image pixel colours are outside this syntax guarantee |
| Approved records and locked package CSS | Only the exact approved token source and existing locked `tailwindcss` / `tw-animate-css` imports are authority inputs. Other approval HTML is reference material, not a stylesheet exception. An arbitrary local path, `--tw-*` name or dependency is not trusted by prefix |
| QA and legacy sources | Preserve their existing generic lint/ratchet selection. `dev` advanced by 29 `qa/`-only files through #172; this adds no design-rule exemption. A UI import into `qa/` still crosses the source collector. Legacy UI remains scoped by the original ratchet; newly introduced reachability does not grandfather raw CSS |

[Pinned selection and lint runner](https://github.com/wescodess/cadet2/blob/f93bab6af9517fafdbe8055356cf60b976bbe836/scripts/quality/lint.mjs), [Vue scoped styles](https://vuejs.org/api/sfc-css-features.html#scoped-css), [SVG presentation attributes](https://www.w3.org/TR/SVG2/styling.html#PresentationAttributes).

## Compiler boundary

Tailwind is not a colour sanitizer. Selected 4.2.0 controls independently show that it retains named/escaped registrations, descriptor colours and SVG-style fallbacks; `theme(colors.red.500)` expands to raw `oklch`, and palette utility/reference cases retain the default palette root. Those routes must reject before compilation. [Compiler colour functions](https://github.com/tailwindlabs/tailwindcss/blob/v4.2.0/packages/tailwindcss/src/css-functions.ts), [compiler entry](https://github.com/tailwindlabs/tailwindcss/blob/v4.2.0/packages/tailwindcss/src/index.ts)

For admitted constructs, the controls retain token operands in declarations, nested fallbacks, gradients, drop-shadow and light-dark; checked `@utility`/`@apply` emits a token reference, and integer-only `disc-24` emits numeric math. These establish selected expansions, not every compiler path.

Maintain a finite compiler-output contract at the locked version: compare generated utility declarations and their transitive token/default dependencies with the admitted colour grammar. Compile all selected candidate branches, not only a favourable individual class. Unknown compiler transformations fail the output-contract regression until explicitly specified. Keep these distinctions:

- Raw token definitions are allowed only at the unchanged approved root.
- Tailwind emits a non-painting `@supports (color: color-mix(in lab, red, red))` query for admitted mixing, plus generated registrations/fallback initialisers. Match these exact compiler-owned shapes; never exempt all `@property` or all `--tw-*` declarations.
- Generated shadow infrastructure includes transparent `#0000` and a **white `--tw-ring-offset-color` default**. The approved shadow-token shorthand remains usable, but numeric `ring-offset-*` utilities that activate that unapproved default are unsupported. Stock `shadow-sm` also introduces black shadow colour and rejects; use the approved shadow token. Do not treat all generated constants as inert or scan the final bundle with a raw-colour substring regexp.

The generated registration/default and mix fallback behavior is explicit in [4.2.0 utilities](https://github.com/tailwindlabs/tailwindcss/blob/v4.2.0/packages/tailwindcss/src/utilities.ts#L149) and [AST output transforms](https://github.com/tailwindlabs/tailwindcss/blob/v4.2.0/packages/tailwindcss/src/ast.ts#L319). Compiler upgrades or new colour-producing candidate families need new output-contract evidence. Application sources cannot opt into this compiler-owned allowance.

This proof is limited to the selected static authoring grammar and locked transformations. It does not prove arbitrary JavaScript-generated CSS, CSSOM writes, runtime data, inherited legacy styles, browser/user styles, remote content, cascade outcomes or correct visual use of tokens. Recognisable unsupported CSS injection/registration sinks reject; arbitrary runtime program behavior is not solved by lint. No whole-bundle “zero literal colours” or universal computed-token claim is made.

## Alternatives

| Alternative | Disposition |
| --- | --- |
| Add `initial-value` to the property regexp | Reject: retains the root cause and misses other descriptors/unknown contexts |
| Fully support authored `@property` | Defer: would need registered syntax parsing, sibling descriptor validation, computational independence and contextual initial-value checking, including universal syntax and aliases; no present foundation requirement justifies it |
| Ban every word matching a colour in every file | Reject: breaks text, anchors, font/keyframe identifiers and CSS strings |
| Only scan compiled CSS | Reject: loses authored context, cannot distinguish approved roots/compiler infrastructure by raw spelling, and does not cover Vue/SVG runtime bindings |
| Closed authoring grammar plus versioned expansion contract | Choose: smaller supported language, explicit unsupported behavior, one policy across adapters |

## Minimal implementation seam and independent regressions

Change the design enforcement boundary only: replace the heuristic in `design-css.mjs` with a pure contextual analyser; have `design-rule.mjs` supply parsed Vue/JS/SVG inputs and `lint.mjs` supply the stylesheet closure. Context includes source kind, at-rule stack, descriptor ownership, property and token type. Share normalisation, fallback parsing and diagnostics. Add a small compiler-contract adapter for static utility candidates and permitted transformations. Keep ordinary typed lint selection and all baselines unchanged. Unsupported diagnostics need file/line, construct and the supported token alternative; they fail public lint without requiring a crash.

The independent expectation set is retained externally as `public-lint-regression-plan.json`; it is **unrun against the future policy**. Implementation must establish paired public-command red/green evidence, with every fixture selected and every expected diagnostic asserted, rather than relying on a mixed batch's nonzero exit:

| Public-lint population | Required result after implementation |
| --- | --- |
| Imported-chain CSS, direct CSS, plain/scoped/module SFC styles: named/escaped/hex registration initials; escaped at-rule/descriptor; `*`, unions, numeric, missing/malformed registrations | Exit 1 with the registration diagnostic in every selected file. The old transparent-registration control becomes an unsupported-syntax negative; ordinary transparency stays positive |
| Earlier SVG static/bound/conditional/template values, CSS named/escaped declarations, nested gradients/mix/shadow/fallbacks, ordinary custom raw values | Exit 1 with raw-colour diagnostic on each operand; cover the SVG fallback path explicitly |
| Unknown property/function/descriptor/prelude, malformed EOF, preprocessors, unresolved style source, unsupported SVG/dynamic CSS input | Exit 1 with selection/unsupported/parse diagnostic; never zero findings because parsing or discovery was skipped |
| Token-rooted aliases and nested fallbacks; `currentColor`, ordinary `transparent`, token-only containers; positive CSS nesting, `@font-face`, typed theme/utility expansion | Exit 0 and zero messages in each selected input; compile admitted transformation cases and check token/default dependencies |
| Existing token utilities, shadow shorthand, ordinary text/anchors, CSS strings, non-colour `red` font/keyframe names, `url(#abc)` | Exit 0, preserving the existing positive suite |
| Palette utility/root, `theme()` expansion, raw/relative colour function, nontransparent implicit shadow/ring-offset default, numeric wildcard misused as colour input | Exit 1. Compiler controls must demonstrate the rejected expansion and admitted token alternative |
| New reachable CSS outside `app/`, including a `qa/` path; import cycle/missing source; unimported new app CSS | First raw case rejects; safe cycle terminates and checks each file once; missing source rejects; no broad QA exception |

Retain the original round-one and round-two failed expectations. Future green controls do not replace those records. This notes branch supplies no implementation green and spends no review round.

## Evidence and limits

External packet: `~/.orchestrate/scratch/cadet2-decision-174-evidence/`. Node **24.20.0**, pnpm **9.12.3**. Four isolated official npm tarballs were integrity-checked; no install, lifecycle script or ancestor dependency was used for the controls. Ancestor css-tree resolved to **2.3.1**, so it was deliberately excluded.

| State | Evidence |
| --- | --- |
| Independently run | `node …/grammar-controls.mjs` exit 0: 23 stylesheet inputs, 7 SVG value inputs and 5 lexer queries on css-tree 3.1.0. Confirms descriptor context mismatch, opaque SVG fallback and malformed-EOF recovery. This is helper/grammar evidence, not public lint |
| Independently run | `node …/compiler-controls.mjs` exit 0: 22 small Tailwind 4.2.0 cases; 21 compile, malformed EOF throws as expected. `python3 …/assert-controls.py` exit 0 checks recorded observations. Includes six admitted populations plus registration/palette/default controls; no Vite optimizer, Nuxt build or browser execution |
| Source-confirmed | Pinned scripts, ESLint config/tests, package/lock, token record and Tailwind integration; live #174/#160/#29; dev's `qa/`-only advance. Original-base-to-foundation patch and source manifests retained |
| Supplied, not rerun | Round-one named/escaped SVG/SFC/CSS failures, correction greens, round-two named/escaped descriptor public-lint exits 0 against expected 1, hex rejection and transparent acceptance. Original supplied failure scripts/logs remain unchanged. Supplied CI's nine green rows, 823 tests and 233 native cases do not dismiss those failures |
| Unrun | Future-policy public-lint red/green, integration/rebase onto newer dev, full quality bar/build, Vite optimization, browser, real VoiceOver/NVDA/TalkBack and actual 200% zoom. No waiver |

Full commands, statuses, package/source hashes, compiler outputs and primary-source snapshots are in the packet. The initial 14-case compiler record is retained alongside the expanded 22-case record. Manifest inspection initially assumed the supplied approval-start list contained 100 entries; it actually contains the 82 original-base design files. That setup assertion failed and is retained; the corrected independent foundation inventory is **100** files including `DESIGN.md` and 17 build-check files. Integration contains 83 of these; the 17 foundation-only build-check files are absent there, not restored or edited. Hash receipts distinguish Git-object preservation of all 100 from on-disk preservation of the 83 integration files.

No relevant CSS ADR supersedes this contract. [Quality-bar policy](../agents/quality-bar.md) and map #29's settled boundaries remain binding. Button variants/disabled styling and the Input typography authority question stay on their separate routes. After parent verification, resume the enforcement implementation and restart Stage A at its new head with the existing ledger **2/8 spent, 0 clean**; neither budget nor acceptance requirements reset.
