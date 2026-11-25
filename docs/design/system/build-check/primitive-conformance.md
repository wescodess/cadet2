# Shared primitive conformance: Relay foundation (#160, PR #171)

Date: 2026-11-24. Checked against PR head `9733a9538e9492ff67b006e91413a34170294de8`; the corrections ship in the same commit as this record. Amended 2026-11-25 for the round 4 corrections (fixes 7 to 11) under the owner's decision of 2026-11-25, which also settles Q3 and Q8. The approved record wins: `docs/design/system/approved.html`, then `DESIGN.md` with its dated amendments, then the owner's build requirements on #160.

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

Seven conforming cells also carry a question (Q1, Q4, Q5, Q6): they meet the written rule, and the question asks whether the record means more. Q4 is one question that appears in eight cells. The 17 fixed cells come from corrections 1 to 9 below; corrections 10 and 11 sit outside the matrix.

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
| 10 | `SharedControlsSpecimen` checkbox and radio rows | No row height: 24 px on the client, 18 px on the desk | `min-h-check-row`, a `--spacing-check-row: var(--check-row, 44px)` alias in `relay.css`; labels keep their `for` and rows still grow | `--check-row`: 44 px fallback on the client, 24 px on the desk (`DESIGN.md:157`, `DESIGN.md:299`; `approved.html:65`); owner decision 2026-11-25 |
| 11 | Every other Lucide icon in `app/components/ui` (35 files) and every icon a screen passes into a primitive slot (19 files) | Lucide's default `stroke-width="2"`, or a literal `1.75` in the specimens | `interfaceIconStroke` | 1.75 (`DESIGN.md:241`); owner decision 2026-11-25 |

Correction 11 changes only the stroke binding. For the primitives and screens it reaches that are not adopted by #160, sizing and the other rules stay with the adopting ticket.

The icon stroke is set on the emitted `<svg>` rather than through a CSS rule, for two reasons. Select menus are teleported to `<body>`, outside every `data-expression` container, so an expression-scoped rule cannot reach `SelectItem` or the scroll buttons. And a CSS `stroke-width` beats the `stroke-width="2"` presentation attribute that `StateGlyph` relies on, so a broad rule would have changed the approved 2 px glyphs. The attribute applies in every context; it is the same 1.75 in both expressions, as the Kbd and focus-ring restyles of this PR already are.

## Test

`tests/components/ui/primitive-conformance.spec.ts` mounts each primitive with Vue Test Utils and asserts approved literals written in the test. It checks:

- stroke `1.75` and `aria-hidden="true"` on every icon each primitive emits, the NavigationMenuTrigger chevron included;
- the chevron and the resizable grip at 16 px, inside the 15 to 18 px range, with the grip's well at least the glyph's size inside its border;
- `shadow-(--shadow-overlay)` on the rendered Select menu;
- the relay utilities on the mounted checkbox, radio and textarea, with `box-shadow: none` and the textarea's invalid halo;
- the radio dot's 50% share, computed from the rendered circle;
- no ring class on the mounted Slider thumb;
- `min-h-check-row` on each specimen checkbox and radio row, with its label still associated, reading `--check-row` (44 px fallback, 24 px on the desk).

jsdom does not compute `stroke-width`, sizes or other properties from style sheets, so CSS-only values are read from `relay.css` and `tokens.css`, as `tests/unit/design/foundation.spec.ts` does.

Red at `9733a95`: 12 of 12 fail. Green at `a3b22ae`: 12 of 12 pass. The round 4 additions were red at `a3b22ae` (5 of the 17 cases fail) and are green with corrections 7 to 10.

`tests/unit/design/interface-icon-stroke.spec.ts` guards the stroke statically. It parses every `.vue` and `.ts` file under `app/components/ui` and finds each Lucide import. Every use of that import must be a template element binding `:stroke-width="interfaceIconStroke"` imported from `lib/relay/icons`. That covers slot defaults and named-slot templates. Script uses, render functions, value bindings, spreads, literal strokes, whole-module imports and Lucide imports in `.ts` files fail, because their stroke cannot be checked. The guard then walks every other `.vue` file under `app/`. It finds the icons placed inside a primitive's slot, directly or through a component it resolves by import or by Nuxt's auto-import name, and holds them to the same binding. Outside `app/components/ui`, an icon map rendered through `<component :is>` passes only when that element binds the stroke. The one exemption is `StateGlyph`, named in the guard's allowlist for its approved 2 px glyphs (`DESIGN.md:241`); it reaches a primitive through `StatusChip`'s `Badge`. The guard fails if an allowlisted name stops being used or stops drawing at 2 px. Mutations prove it fails when one primitive drops its binding, when a new primitive file renders a bare Lucide icon, and when a specimen drops the binding on an icon in a primitive slot.

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

