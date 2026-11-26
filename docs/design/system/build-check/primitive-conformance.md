# Shared primitive conformance: Relay foundation (#160, PR #171)

Date: 2026-11-24. Checked against PR head `9733a9538e9492ff67b006e91413a34170294de8`; the corrections ship in the same commit as this record. Amended 2026-11-25 for the round 4 corrections (fixes 7 to 11) under the owner's decision of 2026-11-25, which also settles Q3 and Q8. Amended again on 2026-11-25 under the owner's final decision of that date, which narrows the icon stroke guard and correction 11 to #160's scope, and once more under the owner's final decision of 2026-11-25 that the guard fails closed and that each checkbox and radio row's full height activates its control. Amended for round 7 under the owner's final decision of 2026-11-25: correction 12 and the guard's fallthrough rule. The approved record wins: `docs/design/system/approved.html`, then `DESIGN.md` with its dated amendments, then the owner's build requirements on #160.

## Scope

Every `app/components/ui/*` primitive changed by `git diff c9efe09...9733a95`, plus every primitive the `/dev/relay` specimens render (`app/specimen/*.vue`). Primitives are split in two groups:

- **Adopted.** Restyled for the client and representative expressions or rendered by the specimen. Every rule below applies.
- **Focus-only.** Touched only to remove the shadcn focus ring that competed with the Relay ring. Focus, the `--ring` colour and interface icons are universal rules and are checked. Sizing, type, colour use, states, elevation and motion belong to the ticket that adopts each primitive into an expression; those cells read N/A†, and anything observed is listed under [Not adopted](#not-adopted-recorded-for-the-adopting-ticket).

## Rules

| ID | Rule | Source |
| --- | --- | --- |
| Stroke | Interface icons use 1.75 px stroke. State glyphs use 2 px; they belong to `StateGlyph`, which this check leaves untouched | `DESIGN.md:241`; #160 build requirement 4; `approved.html:481`, `approved.html:750` (`svg.i` at `stroke-width="1.75"`) |
| Icon size | Interface icons at 15 to 18 px; the checkbox tick at 14 px and the busy spinner at 16 px as rendered | `DESIGN.md:241`; `approved.html:750`, `approved.html:39` |
| Hidden | Icons and glyphs are `aria-hidden="true"`; the adjacent word carries the meaning | `DESIGN.md:241`, `DESIGN.md:388` |
| Sizing | Control height, padding and corners per expression; checkbox and radio box; 24 px minimum target | `DESIGN.md:146-157`, `DESIGN.md:202-209`, `DESIGN.md:299`, `DESIGN.md:365` |
| Type | The expression type scale (Control, Body, Small, Label; 12 px hint) | `DESIGN.md:168-177`, `DESIGN.md:295-297` |
| Colour | Tokens by documented use: `--accent` for hover and selection, `--muted` for disabled fills and hints, `--ring` for focus only | `DESIGN.md:64-72`, `DESIGN.md:104`, `DESIGN.md:224` |
| States | Hover, disabled, invalid and loading as specified | `DESIGN.md:295-297`; `approved.html:37`, `approved.html:296-298` |
| Focus | 2 px `--ring` outline on `:focus-visible`, offset from the expression | `DESIGN.md:224`; `app/assets/css/tailwind.css:68-71` |
| Elevation | Only `--shadow-overlay` floats; buttons and inputs carry their named base shadows; nothing else has a drop shadow | `DESIGN.md:216-220` |
| Motion | 120 ms `--ease` tint; 0.8 s busy spinner; nothing else animates on its own; reduced motion stops it | `DESIGN.md:228-237`; `app/assets/css/tailwind.css:73-82` |

## Matrix

✓ conforms · **F** fixed in this PR · — not applicable (the primitive has no such part) · N/A† not adopted by #160 · Q*n* open question below

### Adopted

| Primitive | Stroke | Icon size | Hidden | Sizing | Type | Colour | States | Focus | Elevation | Motion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Button (`button/index.ts`, `relay.css:137`) | — | ✓ 16 px default (Q6) | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Spinner | **F** | ✓ 16 px | ✓ (Q1) | — | — | ✓ | ✓ loading | — | — | ✓ |
| Kbd | — | — | — | ✓ | ✓ | ✓ | ✓ | — | — | — |
| Label | — | — | — | — | ✓ | ✓ | Q4 | — | — | — |
| FieldDescription | — | — | — | — | ✓ | ✓ | — | — | — | — |
| FieldError | ✓ slot (Q5) | ✓ slot | ✓ slot | — | ✓ | ✓ | ✓ | — | — | — |
| Input | — | — | — | ✓ | ✓ | ✓ | ✓ invalid, Q4 | ✓ | ✓ | ✓ |
| Textarea | — | — | — | ✓ | ✓ | ✓ | ✓ invalid, Q4 | ✓ | **F** | ✓ |
| NativeSelect | **F** | ✓ 16 px | ✓ | ✓ | ✓ | Q2 | ✓ invalid, Q4 | ✓ | ✓ | ✓ |
| Select, SelectTrigger, SelectValue | **F** | ✓ 16 px | ✓ | ✓ | ✓ | Q2 | ✓ invalid, Q4 | ✓ | ✓ | ✓ |
| SelectContent | — | — | — | ✓ | — | ✓ | — | — | **F** | Q7 |
| SelectItem | **F** | ✓ 16 px | ✓ | — | — | ✓ | Q4 | ✓ | — | ✓ |
| SelectScrollUpButton, SelectScrollDownButton | **F** | ✓ 16 px | ✓ | — | — | ✓ | — | — | — | — |
| Checkbox | **F** | ✓ 14 px | ✓ | ✓ | — | ✓ | Q4 | ✓ | **F** | ✓ |
| RadioGroup, RadioGroupItem | — | **F** dot | ✓ | ✓ | — | ✓ | Q4 | ✓ | **F** | ✓ |
| Badge (base of `StatusChip`) | ✓ 2 px glyph | ✓ 16 px | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ |

### Focus-only

| Primitive | Stroke | Icon size | Hidden | Focus | `--ring` use | Other rules |
| --- | --- | --- | --- | --- | --- | --- |
| AccordionTrigger | **F** | ✓ 16 px | ✓ | ✓ | ✓ | N/A† |
| InputGroupInput, InputGroupTextarea | — | — | — | ✓ | ✓ | N/A† |
| Item (`item/index.ts`) | — | — | — | ✓ | ✓ | N/A† |
| NavigationMenuLink, `navigationMenuTriggerStyle` | — | — | — | ✓ | ✓ colour set, never drawn | N/A† |
| NavigationMenuTrigger | **F** | **F** 16 px | ✓ | ✓ | ✓ | N/A† |
| NumberFieldInput | — | — | — | ✓ | ✓ | N/A† |
| ResizableHandle | **F** | **F** 16 px | ✓ | ✓ | ✓ | N/A† |
| ScrollArea | — | — | — | ✓ | ✓ | N/A† |
| Sidebar (`SidebarGroupAction`, `SidebarGroupLabel`, `SidebarMenuAction`, `SidebarMenuSubButton`, `sidebarMenuButtonVariants`) | — | — | — | ✓ | ✓ | N/A† |
| Slider | — | — | — | ✓ | **F** | N/A† |
| Switch | — | — | — | ✓ | ✓ | N/A† |
| TabsTrigger | — | — | — | ✓ | ✓ | N/A† |
| Toggle (`toggle/index.ts`) | — | — | — | ✓ | ✓ | N/A† |

### Counts

39 primitives in 29 rows (20 adopted in 16 rows, 19 focus-only in 13 rows), 238 cells:

| Result | Adopted (160 cells) | Focus-only (78 cells) | Total |
| --- | --- | --- | --- |
| Conforms | 85 | 29 | 114 |
| Fixed | 11 | 6 | 17 |
| Not applicable (no such part) | 57 | 30 | 87 |
| Not adopted (N/A†) | 0 | 13 | 13 |
| Open question only | 7 | 0 | 7 |

Seven conforming cells also carry a question (Q1, Q4, Q5, Q6): they meet the written rule, and the question asks whether the record means more. Q4 is one question that appears in eight cells. The 17 fixed cells come from corrections 1 to 9 below; corrections 10 to 12 sit outside the matrix.

## Fixes

| # | Primitive | Was | Now | Approved value |
| --- | --- | --- | --- | --- |
| 1 | Spinner, NativeSelect, SelectTrigger, SelectItem, SelectScrollUpButton, SelectScrollDownButton, Checkbox, AccordionTrigger, ResizableHandle | Lucide's default `stroke-width="2"` | `stroke-width="1.75"` from one constant, `interfaceIconStroke` in `app/lib/relay/icons.ts` | 1.75 (`DESIGN.md:241`; #160 requirement 4) |
| 2 | SelectContent | `shadow-md` | `shadow-(--shadow-overlay)` | `--shadow-overlay`, the only elevation shadow (`DESIGN.md:216`) |
| 3 | Checkbox, inside the expressions | shadcn `shadow-xs` drop shadow | `box-shadow: none` in `relay-check` | No shadow on the checkbox (`DESIGN.md:216-220`; `approved.html:69`) |
| 4 | RadioGroupItem, inside the expressions | shadcn `shadow-xs` drop shadow | `box-shadow: none` in `relay-radio` | No shadow on the radio (`DESIGN.md:216-220`; `approved.html:74`) |
| 5 | RadioGroupItem dot, inside the expressions | Outlined `CircleIcon` at 50% of the box, so the drawn disc measured about 46% (10.1 px of 22 px on the client, 6.4 px of 14 px on the desk) | The icon fills 60% of the box with no outline; its r = 10 circle on the 24 px grid draws a disc exactly 50% wide (11 px and 7 px) | `width: 50%` filled `--primary` disc (`approved.html:74`) |
| 6 | Slider thumb | `ring-ring/50 hover:ring-4`, an ultramarine hover halo | Removed | `--ring` is focus only (`DESIGN.md:72`, `DESIGN.md:224`) |
| 7 | NavigationMenuTrigger chevron | Lucide's default `stroke-width="2"` at 12 px (`size-3`) | `interfaceIconStroke` at 16 px (`size-4`) | 1.75 at 15 to 18 px (`DESIGN.md:241`); owner decision 2026-11-25 |
| 8 | ResizableHandle grip | 10 px grip in a 16 × 12 px well | 16 px grip, centred in a 24 × 18 px well whose 1 px border leaves a 22 × 16 px content box | 15 to 18 px (`DESIGN.md:241`); owner decision 2026-11-25 (Q8) |
| 9 | Textarea, inside the expressions | shadcn `shadow-xs` drop shadow | `box-shadow: none` in `relay-textarea`; the `aria-invalid` 3 px `--destructive` halo at 18% stays | No shadow (`DESIGN.md:216-220`); owner decision 2026-11-25 (Q3) |
| 10 | `SharedControlsSpecimen` checkbox and radio rows | No row height: 24 px on the client, 18 px on the desk; only the 20 px label text and the box activated the control | Each row is its `Label`, carrying `min-h-check-row` (a `--spacing-check-row: var(--check-row, 44px)` alias in `relay.css`) and wrapping its control; the label keeps its `for`, the focus ring stays on the drawn box, and a click anywhere in the row toggles the control once | `--check-row`, the clickable row height: 44 px fallback on the client, 24 px on the desk (`DESIGN.md:157`, `DESIGN.md:299`); the label is the row and the activation surface (`approved.html:67`); owner decisions 2026-11-25 |
| 11 | Every other Lucide icon in `app/components/ui` (35 files), every icon the specimens render (`ClientSpecimen`, `RepresentativeSpecimen`) and every interface icon in the Relay components they render (`SaveState`, `TurnDisc`, `ErrorSummary`) | Lucide's default `stroke-width="2"`, a literal `1.75`, or an icon map rendered through `<component :is>` | `interfaceIconStroke` on a static icon element; `SignedPlanHeader` draws its 2 px seal through `StateGlyph`, the approved `g`-class mark (`approved.html`, `.signed-mark`) | 1.75 for interface icons, 2 for state glyphs (`DESIGN.md:241`); owner decisions 2026-11-25 |
| 12 | `SpecimenPanel` Select menus | `SelectContent` always teleported to `<body>`, outside the panel's `.dark` and `data-expression`, so the dark panels opened a light menu | `SelectContent` takes an optional `to` portal target, defaulting to `<body>` as before; each specimen panel passes a target inside its themed wrapper | Dark popover `#23262D` with `#E8EAEE` foreground (`DESIGN.md:61-62`); #160: the specimen renders every primitive in both themes and both expressions |

Correction 11 changes only the stroke binding. For the primitives it reaches that are not adopted by #160, sizing and the other rules stay with the adopting ticket. By the owner's final decision of 2026-11-25, it does not reach screens outside #160: the legacy admin, recommendations and workspace components and `app/pages/admin/audit-trail.client.vue` keep their bytes from before round 4, including the icons they pass into primitive slots.

The icon stroke is set on the emitted `<svg>` rather than through a CSS rule, for two reasons. Select menus are teleported to `<body>` by default, outside every `data-expression` container, so an expression-scoped rule cannot reach `SelectItem` or the scroll buttons. And a CSS `stroke-width` beats the `stroke-width="2"` presentation attribute that `StateGlyph` relies on, so a broad rule would have changed the approved 2 px glyphs. The attribute applies in every context; it is the same 1.75 in both expressions, as the Kbd and focus-ring restyles of this PR already are.

## Test

`tests/components/ui/primitive-conformance.spec.ts` mounts each primitive with Vue Test Utils and asserts approved literals written in the test. It checks:

- stroke `1.75` and `aria-hidden="true"` on every icon each primitive emits, the NavigationMenuTrigger chevron included;
- the chevron and the resizable grip at 16 px, inside the 15 to 18 px range, with the grip's well at least the glyph's size inside its border;
- `shadow-(--shadow-overlay)` on the rendered Select menu;
- the relay utilities on the mounted checkbox, radio and textarea, with `box-shadow: none` and the textarea's invalid halo;
- the radio dot's 50% share, computed from the rendered circle;
- no ring class on the mounted Slider thumb;
- `min-h-check-row` on each specimen checkbox and radio row, the row being the control's associated `<label>`, reading `--check-row` (44 px fallback, 24 px on the desk);
- in both expressions, a click on each row's surface outside its text changes the checkbox and both radios exactly once, and a click on the box itself still toggles once;
- in the Client and Representative dark panels, the Select menu opens inside its panel and resolves `--popover` `#23262D` and `--popover-foreground` `#E8EAEE`; outside a panel it still teleports to `<body>`.

jsdom does not compute `stroke-width`, sizes or other properties from style sheets, so CSS-only values are read from `relay.css` and `tokens.css`, as `tests/unit/design/foundation.spec.ts` does.

Red at `9733a95`: 12 of 12 fail. Green at `a3b22ae`: 12 of 12 pass. The round 4 additions were red at `a3b22ae` (5 of the 17 cases fail) and are green with corrections 7 to 10. The row-activation case was red at `0457a11` in both expressions, because a click on the row left the checkbox unchanged, and is green with the label as the row. The dark-panel menu cases were red at `ac5af3a`, where the menu landed outside its panel, and are green with correction 12.

`tests/unit/design/interface-icon-stroke.spec.ts` guards the stroke statically, with the rule in `tests/unit/design/icon-stroke-guard.ts`. By the owner's final decision of 2026-11-25 it fails closed: any Lucide use it cannot positively verify fails, naming the file, the line and the construct. It is never skipped.

The rule is positive. An icon passes only when it is a static template element, its tag resolves to a named import from `lucide-vue-next`, and its only stroke attribute is exactly `:stroke-width="interfaceIconStroke"`, bound to the constant imported under that name from `lib/relay/icons`. Everything else involving Lucide in scope fails, including:

- in the specimens and the Relay components they reach, a `v-bind` object spread on any tag unless it is built only from `$attrs` and literal keys that are not stroke attributes, since a props object can carry `strokeWidth` through a wrapper (round 8);
- dynamic bind arguments (`:[name]`), `v-bind` or `v-on` object spreads, and any competing stroke attribute on an icon (`stroke-width`, `absolute-stroke-width`, a `:style` binding, or a static style that mentions stroke);
- any other use of `interfaceIconStroke`: in a template expression, a `v-for` or `v-slot` that shadows it, or anywhere in script, so it cannot be redeclared, aliased or imported from another module;
- a Lucide import used as a value: in a template expression, `<component :is>`, script, `h()` or another render function;
- whole-module or default Lucide imports, Lucide loaded outside a static named import, and any runtime Lucide import in a `.ts` or `.js` file (type-only imports are erased and pass);
- a stroke-width utility or `stroke-width:` declaration in any class, string or `<style>` block, since it can override the attribute;
- any stroke attribute on a component or element other than a checked icon: a static or bound `stroke-width`, `strokeWidth` or `absolute-stroke-width`, or a style naming a stroke width, since Vue forwards undeclared attributes onto a wrapper's root icon (`<Spinner :stroke-width="2" />` drew at 2 px). `StateGlyph`'s own 2 px internals stay exempt;
- a component tag or `<component :is>` target it cannot resolve to a checked source: script-local components, components imported from a `.ts` file, names passed to `resolveComponent()`, dotted tags such as `<Icons.Check>`, and unresolved local imports or dynamic imports;
- outside `app/components/ui`, a primitive used as a value, such as a `<component :is>` host chosen at run time.

Scope is every `.vue` and `.ts` file under `app/components/ui`, every file under the roots named in `adoptedConsumerRoots` (`app/specimen` alone), and every local file those import or render, transitively: by import, by Nuxt's auto-import name, or by a statically resolved `<component :is>`. Every file in scope is checked whole, not only the icons placed in primitive slots. Today the closure adds the Relay components the specimens render, `app/lib/utils.ts`, `app/lib/relay/states.ts`, `app/lib/relay/icons.ts` and `app/components/relay/turns.ts`. The narrow roots are the owner's decision of 2026-11-25: #160 adopts the specimens, and a later ticket that adopts a screen extends the constant deliberately. Legacy screens outside the closure are not checked and may still pass icons at Lucide's 2 px default into primitive slots.

The one exemption is `app/components/relay/StateGlyph.vue`, named by its exact path in the guard's allowlist for its approved 2 px glyphs (`DESIGN.md:241`); another file with the same name is checked like any other. The guard fails if the allowlisted file stops being reached from the adopted roots or stops drawing at 2 px. `createReusableTemplate()` components from `@vueuse/core` resolve to the template they define, which the guard checks in place. Components from third-party packages such as `reka-ui` are opaque; none of them renders Lucide. Stylesheets outside the scoped files, such as `relay.css`, are outside this guard; the mounted conformance test checks the emitted stroke on each primitive.

Each finding the reviewers reproduced is a retained regression case that must fail, run in memory against the real tree: the round 5 fixtures (dynamic `strokeWidth` and `stroke-width` bind arguments, template shadowing with the import also used, namespace, local `h()` and `.ts` helper icons in a specimen's Button slot, and a Button rendered through `<component :is>` with a bare child), the earlier mutations (an aliased bare icon, a bare slot fallback, a `v-bind` spread, `<component :is>` with and without the binding, `v-for` shadowing, an inline style, a `.ts` render helper and a namespace import in `app/components/ui`, a bare icon in a Relay component in a slot, a primitive dropping its binding, a new primitive with a bare icon, a specimen with a bare icon in a slot), and the other constructs listed above. `<component :is>` with the binding passed at round 5; the positive rule now rejects it. Controls pass: an aliased icon with the binding, a bound icon beside an unrelated `h('span')` (a false positive at round 5), a specimen passing a bound icon into a slot, and a bare icon in a slot of a legacy admin file outside the closure. Against the round 5 guard, 26 of the 40 cases are red: 22 regression cases raised no problem at all, three were caught under another wording or file (`<component :is>` without the binding, the `.ts` render helper and the Relay component in a slot), and the `h('span')` control was rejected. Round 7 adds the reviewer's `<Spinner :stroke-width="2" />` fixture and five variants (a camel-case `:style`, `absolute-stroke-width`, the shared binding passed to a wrapper, `strokeWidth` on a single-root Relay wrapper, a literal `stroke-width` on a primitive's `<path>`), all six red against the round 6 guard, and a control for a stroke colour and a custom property named for a stroke width.

The guard catches accidental omissions, not deliberate obfuscation. By the owner's decision of 2026-11-25 after round 6, CSS property names written with escapes (`stroke\2d width`) and SFC blocks loaded from another file (`<script src>`, which the design lint already rejects) are outside its scope and left to code review.

## Open questions

Q1, Q2 and Q4 to Q7 still need the owner or the design gate; nothing was changed for them. Q3 and Q8 are decided.

1. **Q1, Spinner shape.** `approved.html:39` draws the busy indicator as a 16 px CSS ring with a 2 px border, not a Lucide icon. `DESIGN.md:295` names `ui/spinner` (Lucide `Loader2`), and `DESIGN.md:241` puts Lucide icons at 1.75. The build follows `DESIGN.md` and #160 requirement 4. Is the Lucide loader at 1.75 the intended busy indicator, or should it be the specimen's ring? The specimens mark the spinner `aria-hidden` beside the action word; standalone, the primitive keeps `role="status"` and the label “Loading”.
2. **Q2, select chevrons at 50% opacity.** NativeSelect and SelectTrigger draw the chevron in `--muted-foreground` at 50% opacity: 2.19:1 on `--card` in light and 2.69:1 in dark (6.32 and 6.66 at full strength). Hard rule 7 (`DESIGN.md:364`) requires 3:1 for glyphs and input boundaries; the specimen has no select. Does the chevron count, and should it drop the opacity?
3. **Q3, textarea shadow. Decided by the owner on 2026-11-25:** no shadow inside either expression; the invalid halo stays. Correction 9. The record did not list shadcn's `shadow-xs` among the approved shadows (`DESIGN.md:216-220`).
4. **Q4, disabled fields.** Input, Textarea, NativeSelect, SelectTrigger, SelectItem, Checkbox, Radio and Label dim to 50% opacity when disabled. The record defines a disabled style only for Button (`--muted` fill, `DESIGN.md:295`; `approved.html:37`). What should a disabled field look like?
5. **Q5, FieldError without a slot.** The rule asks for an error “with an icon” (`DESIGN.md:297`). Both specimens pass the 18 px `circle-alert` at 1.75 through the slot. The `errors` prop path renders text only and has no consumer yet. Should the primitive draw the icon itself, and once per list or once per error?
6. **Q6, icons inside buttons.** Button sizes unsized icons at 16 px, inside the 15 to 18 px range. The specimen's icon buttons draw 18 px on the client (`approved.html:866`) and 15 px on the desk (`approved.html:892`). Should button icons take those per-expression sizes?
7. **Q7, Select menu motion.** SelectContent opens with fade, a 95% zoom and a 2 px slide. The motion table (`DESIGN.md:228-237`) covers tints, the detail pane, list selection and spinners only. Is an opening menu allowed to animate? Reduced motion already stops it.
8. **Q8, resizable grip. Decided by the owner on 2026-11-25:** the grip grows to 16 px, and its well grows to hold it centred and unclipped. Correction 8. The desk panes use `ui/resizable` (`DESIGN.md:310`).

## Not adopted, recorded for the adopting ticket

Observed on focus-only primitives and left unchanged, because adopting them into an expression is not part of #160:

- Item hovers with `duration-100`; the approved tint is 120 ms.
- Toggle hovers to `--muted`; `--accent` is the documented hover token.
- AccordionTrigger rotates its chevron over 200 ms; SidebarGroupLabel collapses over 200 ms linear. Neither duration is in the motion table.
- Switch, TabsTrigger, NumberFieldInput, the Slider thumb and the floating sidebar keep shadcn drop shadows.
- Legacy screens outside `app/specimen` and the files it reaches still pass some icons into primitive slots at Lucide's 2 px default stroke. The ticket that adopts each screen binds `interfaceIconStroke` there and adds the screen's root to `adoptedConsumerRoots` in the stroke guard.
