# Build check: Relay foundation (#160)

Date: 2026-11-26. Refreshes the 2026-11-21 check after review rounds 3 to 8 and Stage B changed visible output: 1.75 interface icon strokes, the 16 px navigation chevron and resize grip, no textarea shadow, the overlay shadow on the Select menu, full-height checkbox and radio rows, the radio dot, the slider without a hover ring, the signed-plan seal drawn through `StateGlyph`, themed Select menus in the dark panels, reduced-motion fades and the new `--accent-foreground`.

The development specimen at `/dev/relay` (`nuxt dev`, PR #171 at `fc8b8c0`) was compared with `docs/design/system/approved.html` and `DESIGN.md` in Playwright Chromium, following the ui-design-gate "Check the build" section. The long desk Holder words were compared with `docs/design/holder-long-names/approved.html` and the no-turn style with `docs/design/b1-access-and-intake/approved.html`.

**Result.** Two build defects against approved rules were found and fixed (below). Every other difference comes from a dated amendment, a settled discrepancy or an owner decision. Six open questions from [primitive-conformance.md](primitive-conformance.md) remain under [Needs the owner](#needs-the-owner); nothing was changed for them.

## Method

- **Computed styles.** For each primitive, a script read the computed style of the approved element and the built element in the same panel: client light, client dark, representative light, representative dark. It compared 4,046 properties (size, line height, weight, family, colour, border, radius, padding, gap, shadow, text decoration, glyph size and stroke, animation, and the resolved `--popover`, `--popover-foreground` and `--accent-foreground`). 3,830 match exactly; the 216 that differ are listed under [Differences](#differences-each-from-an-approved-amendment-or-decision). approved.html renders no radio, so the `.radio` and `.radio-dot` rules were drawn from approved.html's own stylesheet inside each approved panel.
- **Screenshots.** Each board puts approved on the left and the build on the right, light above dark, unscaled, at a 1440 px viewport. Phone boards use 390 px and 320 px viewports.
- **States.** Loading (busy buttons, saving), disabled (buttons, fields, the native select), error (field errors, invalid inputs, error summary), and selection (checked rows, open Select menus). The record defines no loading or empty state for any #160 primitive beyond these; `approved.html`'s empty-state, toast and dialog sections are screen patterns no #160 primitive renders.
- **Worst-case data.** "Sivasubramanian", "Oluwaseun Adébáyọ̀-Fitzgerald", "Nguyễn Thị Minh Khai", "Siobhán Ní Bhriain", French turn words, and the 64, 128 and 255 character holder stress words.

## Boards

| Board | What it shows | Result |
| --- | --- | --- |
| [client-turn-bar.png](client-turn-bar.png) | Client, representative, done, signed and no-turn segments | Matches, with the 2026-11-19 15 px count |
| [client-holder.png](client-holder.png) | You, You later, Priya, Done, Checked, Signed, Not yet | Matches, with the 15 px client Label word |
| [client-long-names.png](client-long-names.png) | French turn words, "Sivasubramanian", long signer and source names | Wraps; nothing truncates or overflows |
| [client-buttons.png](client-buttons.png) | Primary, secondary, ghost, destructive, disabled, busy | Matches except the busy indicator's shape (Q1) |
| [client-input-with-hint-and-error.png](client-input-with-hint-and-error.png) | Hint, field error with icon, invalid date parts with the halo | Matches |
| [client-status-chips.png](client-status-chips.png) | All 23 states, Review requested, small and neutral chips | Matches |
| [client-provenance.png](client-provenance.png) | Source, Effective (not stated), Verified as of | Matches |
| [client-signed-plan-header.png](client-signed-plan-header.png) | Seal through `StateGlyph`, underlined CICC register link | Matches after fix 2 |
| [client-save-state.png](client-save-state.png) | Saving, saved, offline | Matches |
| [client-error-summary.png](client-error-summary.png) | Client error summary | Matches |
| [client-shared-controls.png](client-shared-controls.png) | Buttons, input, native select, Select, textarea, disabled field and choice, checkbox, radios | Matches after fix 1; disabled fields Q4, chevron Q2 |
| [client-phone-widths.png](client-phone-widths.png) | Turn bar, holders and long names at 390 px and 320 px, both themes | Wraps; no page overflow, no truncation |
| [client-phone-controls.png](client-phone-controls.png) | Buttons, field error, error summary and shared controls at 390 px, both themes | No page overflow |
| [representative-keyboard-hints.png](representative-keyboard-hints.png) | 12 px keyboard hints, disabled with its reason, busy | Matches, with the 2026-11-19 12 px hint |
| [representative-input-with-hint-and-error.png](representative-input-with-hint-and-error.png) | Desk hint, error and invalid input | Matches, with 6 px desk input corners |
| [representative-status-chips.png](representative-status-chips.png) | Neutral desk chips, small and default | Matches discrepancy 8 |
| [representative-queue-rows-with-next-actor.png](representative-queue-rows-with-next-actor.png) | Holder column, colleague holder, graphite selected edge | Matches |
| [representative-long-holder-words.png](representative-long-holder-words.png) | Colleague names and the 64, 128 and 255 character stress words | Breaks in the 72 px column; identical box sizes in both themes |
| [representative-provenance.png](representative-provenance.png) | Desk provenance | Matches |
| [representative-signed-plan-header.png](representative-signed-plan-header.png) | Desk signed plan header | Matches after fix 2 |
| [representative-save-state.png](representative-save-state.png) | Desk wording | Matches |
| [representative-error-summary.png](representative-error-summary.png) | "Version 3 can’t be signed yet" | Matches |
| [representative-shared-controls.png](representative-shared-controls.png) | Desk shared controls | Matches after fix 1; disabled fields Q4, chevron Q2 |
| [shared-check-rows.png](shared-check-rows.png) | Checkbox and radio rows in every panel, each row outlined, beside approved `.check` and `.radio` | Matches after fix 1 |
| [shared-select-menus.png](shared-select-menus.png) | The Select menu open in every panel, beside the approved dark overlay surface | Matches |

## Results by area

- **Icons.** Interface icons draw at 1.75 and state glyphs at 2, as `tests/unit/design/interface-icon-stroke.spec.ts` and `tests/components/ui/primitive-conformance.spec.ts` assert. The client field error's 18 px `circle-alert` reads 1.75 in every panel. The signed-plan seal now comes from `StateGlyph` (2 px, 24 px, `--seal`) and matches the approved `.signed-mark` size and colour.
- **Controls.** Buttons match the approved size, type, colour and base shadow in every panel. Input, native select and Select trigger match `.input` (client 48 px and 10 px corners; desk 30 px and 6 px). The textarea has no shadow, by the owner's decision. The checkbox box is 24 px on the client and 16 px on the desk; the checked radio disc is 11 px and 7 px, half the box, as approved. Each checkbox and radio row is 44 px on the client and 24 px on the desk, the box sits at the top of the row, and the text is body type (17/400 client, 14/400 desk), as in `.check`. A click at a row's edge toggles its control once.
- **Select menus.** In all four panels the menu opens inside its panel. Light menus resolve `--popover` `#FFFFFF`; dark menus resolve `#23262D` with `#E8EAEE` text, the approved dark popover. Each carries `--shadow-overlay`. The highlighted item shows the 2 px focus ring because the item holds keyboard focus.
- **Focus.** 2 px `--ring` outline, offset 2 px on the client and 1 px on the desk, `#2F6BFF` light and `#7AA2FF` dark, on turn-bar segments, queue rows, the checkbox, the radio and the Select trigger, reached by keyboard.
- **Motion.** Saving spins at 1.2 s and busy at 0.8 s, as approved. Under `prefers-reduced-motion: reduce` both stop (0 s, one iteration) and the word still carries the state, and the Select menu opens as a 120 ms fade with no zoom or slide.
- **Phones.** At 390 px and 320 px, in both themes, the page never scrolls sideways and nothing truncates. Two-segment turn bars are 91 to 133 px tall at 390 px and 111 to 197 px at 320 px; the tallest is the French “C’est au tour de Priya” bar. The only clipped elements are the `sr-only` "Whose turn:" prefixes, which are clipped by design.
- **Long names.** The client holder grows with its word. The desk holder keeps its 72 px column and breaks long words inside it; the 255 character word's holder is 331 px tall in both themes, as the holder-long-names record allows.
- **Fonts.** Only `/fonts/ibm-plex/*.woff2` from the app loads, with no request to Google Fonts. The Vietnamese subset loads for the Vietnamese and Yoruba names, and `document.fonts.check` reports IBM Plex Sans for all three specimen names.

## Fixed in this check

| # | Where | Was | Now | Approved rule |
| --- | --- | --- | --- | --- |
| 1 | `SharedControlsSpecimen` checkbox and radio rows | Box centred in the row; option text in the Label type | Box at the top of the row; option text in `text-body` (17/400 client, 14/400 desk). Row height, `for` and full-row activation unchanged | `.check` and `.radio`: `align-items: flex-start`, `.check-label` in body type (`approved.html:67-74`) |
| 1 | `SharedControlsSpecimen` unavailable native choice | Rendered empty: its uncontrolled model was `''`, which matches no option | Shows "First option", disabled | A disabled field still shows its value |
| 2 | `SignedPlanHeader` CICC register link | No underline | Underlined, like the provenance source and error summary links | approved.html draws the register link underlined in every panel |

Tests: `tests/components/ui/primitive-conformance.spec.ts` (row alignment and body type; the unavailable choice's value) and `tests/components/relay/SignedPlanHeader.spec.ts` (the underline) failed before the fixes and pass after them.

## Differences, each from an approved amendment or decision

| Primitive | Approved | Build | Source |
| --- | --- | --- | --- |
| Turn bar count | 14 on 19 px; segment 65 px | 15 on 22 px; segment 68 px | `DESIGN.md` 12.2, amendment 2026-11-19 |
| Client holder word | 12 on 14.4 px, 72 px column | 15 on 20 px, column grows | `DESIGN.md` 4, amendments 2026-11-18 and 2026-11-19 |
| Keyboard hint | 11.5 px | 12 px | `DESIGN.md` 12.1, amendment 2026-11-19 |
| Desk state chips (126 properties) | Tinted, inherited from the client wrapper | Card fill, hairline, glyph in role colour, word in role ink | Discrepancy 8, settled 2026-11-19 |
| Desk inputs, selects, textarea | 10 px corners (inherited client `--input-radius`) | 6 px, 30 px tall | Discrepancy 8; `DESIGN.md:149` |
| Desk CICC register link | 32 px tall; header 85 px | 24 px tall; header 77 px | Discrepancy 8; `DESIGN.md` 12.2 |
| Selected queue row | Not in the component section | 2 px `--primary` inset edge on `--accent` | `DESIGN.md` 12.2, amendment 2026-11-19 |
| Textarea | `.input`'s inset base shadow | No shadow; the invalid halo stays | Owner decision 2026-11-25 (Q3) |

The rest are not visual: the primary keyboard hint's border is the same colour written in `oklab()` rather than `color(srgb …)`; `rounded-full` computes as a very large pixel radius where approved writes `50%`; the unchecked checkbox's `color` is set but draws no tick; and the desk comparisons hit approved's checked Dialog checkbox and a kbd-bearing primary against an unchecked box and a plain primary.

Owner decisions that stand and are not reopened here: no textarea shadow; the 16 px navigation chevron and resize grip; full-height checkbox and radio rows; the stroke guard's scope; the audit-trail hover fix.

## Accessibility

- axe-core 4.10.3 (WCAG 2.0, 2.1 and 2.2 A and AA rules) on the whole specimen in Chromium at 1440 px and 390 px: 0 violations. axe-core is MPL-2.0, which `scripts/quality/dependencies.mjs` does not permit, so it ran from a scratch copy, not as a dependency. Six colour-contrast checks were incomplete at each width: the four empty specimen textareas, which hold no text and whose background axe could not resolve, and two nodes of the Nuxt devtools badge, which only `nuxt dev` adds.
- Each component test runs the repository's structural check (`tests/components/relay/accessibility.ts`).
- Contrast: [contrast.md](contrast.md), regenerated from `tokens.json` on 2026-11-26 with no change, and checked by `tests/unit/design/contrast.spec.ts`. The current `--accent-foreground` (`#16181D` light, `#E8EAEE` dark) on `--accent` is 15.55:1 and 11.30:1, and the app resolves both values in every panel.

## Needs the owner

These are open questions Q1, Q2 and Q4 to Q7 in [primitive-conformance.md](primitive-conformance.md#open-questions). Answering any of them would change the design, so the build is unchanged.

| Question | What the boards show | Evidence |
| --- | --- | --- |
| Q1, busy indicator shape | Approved draws a 16 px CSS ring with a 2 px border; the build draws Lucide `Loader2` at 1.75, as `DESIGN.md:295` names it | [client-buttons.png](client-buttons.png), [representative-keyboard-hints.png](representative-keyboard-hints.png), "Uploading" and "Signing" |
| Q2, select chevrons at 50% opacity | The native select and Select trigger chevrons are visibly fainter than the field text (2.19:1 light, 2.69:1 dark on `--card`) | [client-shared-controls.png](client-shared-controls.png), [representative-shared-controls.png](representative-shared-controls.png), [client-phone-controls.png](client-phone-controls.png) |
| Q4, disabled fields | "Unavailable field" and "Unavailable choice" dim to 50% opacity; the record defines a disabled style only for buttons (`--muted` fill) | Same boards, beside the disabled "Unavailable" button |
| Q5, FieldError without a slot | No visible difference: every specimen passes the 18 px icon through the slot. The `errors` prop path would render text only | [client-input-with-hint-and-error.png](client-input-with-hint-and-error.png) |
| Q6, icons inside buttons | No specimen button carries an icon, so the boards show nothing; approved draws 18 px on the client and 15 px on the desk, and the build defaults to 16 px | `primitive-conformance.md` Q6 |
| Q7, Select menu motion | The menu opens with a 150 ms fade, 95% zoom and 2 px slide; reduced motion leaves a 120 ms fade. The motion table does not list menus | [shared-select-menus.png](shared-select-menus.png) (static); computed animation in this check's method |

## For the owner

- `DESIGN.md` and `tokens.css` still say the tokens are not wired into the app. The records are approval files, so this check leaves them unchanged.
- The Representative shared-controls rows sit 12 px apart in the radio group. approved.html renders no radio group, so no rule covers that spacing.
