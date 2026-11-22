# Build check: Relay foundation (#160)

Date: 2026-11-21. Compared the development specimen at `/dev/relay` with `docs/design/system/approved.html` in Playwright Chromium 145, following the ui-design-gate "Check the build" section: the same components, states, themes and expressions, side by side. The B1 no-turn style was compared with `docs/design/b1-access-and-intake/approved.html` and the "Review requested" chip glyph with `docs/design/b2-practice-preparation/approved.html`.

No difference changes the approved design. Every difference below comes from a dated amendment in `DESIGN.md` or a settled discrepancy in `decision.md`.

## Method

- **Computed styles.** For each primitive, a script read the computed style of the approved element and the built element in the same panel: client light, client dark, representative light, representative dark. It compared 2,898 properties (size, line height, weight, family, colour, fill, border, radius, padding, gap, edge shadow, glyph colour and size, animation). 2,728 match exactly.
- **Glyphs.** `tests/components/relay/StatusChip.spec.ts` compares every state glyph, path for path, with the chip in the approved files.
- **Screenshots.** Each board puts the approved section on the left and the built section on the right, light above dark, at a 1440 px viewport. `client-phone-widths.png` shows the client turn bar and holders at 390 px and 320 px beside the approved Home screen at 390 px.

| Board | What it shows |
| --- | --- |
| [client-turn-bar.png](client-turn-bar.png) | Client, representative, done, signed and no-turn segments; a long French label |
| [client-holder.png](client-holder.png) | You, You later, Priya, Done, Checked, Signed, Not yet |
| [client-status-chips.png](client-status-chips.png) | All 23 states plus Review requested, small chips, neutral no-turn chips |
| [client-provenance.png](client-provenance.png) | Source, Effective (not stated), Verified as of |
| [client-signed-plan-header.png](client-signed-plan-header.png) | Signed plan header with the CICC register link |
| [client-save-state.png](client-save-state.png) | Saving, saved, offline |
| [client-error-summary.png](client-error-summary.png) | Client error summary |
| [client-phone-widths.png](client-phone-widths.png) | Turn bar and holders at 390 px and 320 px |
| [representative-keyboard-hints.png](representative-keyboard-hints.png) | 12 px keyboard hints inside buttons and on the primary button |
| [representative-status-chips.png](representative-status-chips.png) | Neutral desk chips, small and default |
| [representative-queue-rows-with-next-actor.png](representative-queue-rows-with-next-actor.png) | Holder column, a colleague as holder, graphite selected-row edge |
| [representative-provenance.png](representative-provenance.png) | Desk provenance |
| [representative-signed-plan-header.png](representative-signed-plan-header.png) | Desk signed plan header |
| [representative-save-state.png](representative-save-state.png) | Desk wording |
| [representative-error-summary.png](representative-error-summary.png) | "Version 3 can’t be signed yet" |

## Differences, each from an approved amendment

| Primitive | Approved | Build | Source |
| --- | --- | --- | --- |
| Turn bar count | 14 on 19 px; segment 65 px | 15 on 22 px; segment 68 px | `DESIGN.md` 12.2, amendment 2026-11-19 |
| Client holder word | 12 on 14.4 px | 15 on 20 px (client Label) | `DESIGN.md` 4, amendments 2026-11-18 and 2026-11-19 |
| Keyboard hint | 11.5 px | 12 px | `DESIGN.md` 12.1, amendment 2026-11-19 |
| Desk state chips | Tinted (inherited from the client wrapper) | Card fill, hairline, glyph in role colour, word in role ink | Discrepancy 8, settled 2026-11-19 |
| Desk CICC register link | 32 px tall (inherited); header 85 px | 24 px tall; header 77 px | Discrepancy 8; `DESIGN.md` 12.2 |
| Selected queue row | Not shown in the component section; focus colour in the screens | 2 px `--primary` (graphite) inset edge on `--accent` | `DESIGN.md` 12.2, amendment 2026-11-19 |
| Review requested chip | Dashed `--seal` outline marking it unapproved | No outline | B2 build rule 3; `DESIGN.md` 11 |

The other measured differences are colour-space spellings of the same value (the primary button's keyboard hint border, 45% of `--primary-foreground`, reads `color(srgb …)` in the specimen and `oklab(…)` in the build).

The 15 px turn-bar count wraps sooner than the specimen's 14 px. At 390 px, "2 things in progress" takes two lines, so the bar is 91 px tall (the specimen's Home screen is 66 px). At 320 px with the French label it is 133 px tall, above the roughly 110 px the critique measured at 14 px. Nothing overflows or truncates. If a later gate makes the turn bar sticky, reserve 133 px in `scroll-padding-top`.

## No-turn style (B1)

All 14 measured properties match B1's `approved.html`: segment fill and 3 px `--border` rule, label and count colours, the dashed `--input` disc on `--card`, the holder word, and the neutral chip fill, hairline, word and glyph.

## Accessibility

- axe-core 4.10.3 (WCAG 2.0, 2.1 and 2.2 A and AA rules, colour contrast included) ran on the whole specimen in Chromium: 0 violations, 0 incomplete. axe-core is MPL-2.0, which `scripts/quality/dependencies.mjs` does not permit, so it ran from a scratch copy rather than as a dependency. Each component test runs the repository's own structural check (`tests/components/relay/accessibility.ts`), using `dom-accessibility-api` (MIT): known ARIA attributes and roles, named links and landmarks, hidden glyphs, unique ids, no positive tabindex, no inline style.
- Focus ring: a 2 px solid `--ring` outline, offset 2 px on client controls and 1 px on the desk, in both themes (`#2F6BFF` light, `#7AA2FF` dark). It sits outside every CSS layer, so no utility class can hide it.
- Reduced motion: under `prefers-reduced-motion: reduce` the saving spinner stops (0 s, one iteration) and "Saving" still carries the state.
- Contrast: [contrast.md](contrast.md), generated from the tokens and checked by `tests/unit/design/contrast.spec.ts`.

## Fonts

The specimen loaded only `/fonts/ibm-plex/*.woff2` from the app, with no request to Google Fonts. The Vietnamese subset loads for "Oluwaseun Adébáyọ̀-Fitzgerald" and "Nguyễn Thị Minh Khai". `document.fonts.check` reports IBM Plex Sans for all three specimen names.

## For the owner

- The work-status glyphs for **Submitted** and **Representative reviewing** in `approved.html` (and the B2 file) carry arc path data that browsers stop drawing partway (`A5.6 5.6 0 0 0 1 12.00 17.60z`). The build copies the paths exactly, so it renders exactly as approved. A clean half fill and three-quarter fill would need a design decision.
- `DESIGN.md` and `tokens.css` still say the tokens are not wired into the app. The records are approval files, so this ticket leaves them unchanged.
