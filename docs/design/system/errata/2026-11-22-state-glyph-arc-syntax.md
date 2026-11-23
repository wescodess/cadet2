# Erratum: work-status glyph arc syntax

Date: 2026-11-22
Kind: mechanical correction of SVG path syntax. No design change and no new owner approval.
Data: [2026-11-22-state-glyph-arc-syntax.json](2026-11-22-state-glyph-arc-syntax.json) (read by the glyph tests)

## What the approved system says

`DESIGN.md` section 10: “work-status circles that fill as work moves. Dashed with a quarter fill for intake, half for submitted, three quarters for reviewing”. Section 11 lists `intake` as “custom quarter fill, dashed”, `submitted` as “custom half fill” and `reviewing` as “custom three-quarter fill”. The outlines (dashed for intake, solid otherwise, radius 9.2) are not part of this erratum.

The approved quarter path is valid and fixes the geometry of the inner fill: `M12 12V6.4A5.6 5.6 0 0 1 17.6 12z` draws a sector of the radius 5.6 disk centred on (12, 12), starting at 12 o’clock and turning clockwise (sweep flag 1) for 90 degrees.

## The defect

An SVG elliptical arc takes exactly seven numbers: `rx ry x-axis-rotation large-arc-flag sweep-flag x y` ([SVG 2, 9.3.8 “The elliptical arc curve commands” and 9.3.9 “The grammar for path data”](https://www.w3.org/TR/SVG/paths.html#PathDataEllipticalArcCommands)). Extra numbers start another arc, which also needs seven. The half and three-quarter paths in the approved records each carry eight, because of one extra `0` after the rotation:

| Glyph | State | Approved record (invalid, 8 numbers) | Corrected (7 numbers) | Fill |
|---|---|---|---|---|
| `custom:fill-half` | `submitted` | `M12 12V6.4A5.6 5.6 0 0 0 1 12.00 17.60z` | `M12 12V6.4A5.6 5.6 0 0 1 12.00 17.60z` | 12 o’clock clockwise to 6 o’clock, 180 degrees |
| `custom:fill-three-quarters` | `reviewing` | `M12 12V6.4A5.6 5.6 0 0 1 1 6.40 12.00z` | `M12 12V6.4A5.6 5.6 0 1 1 6.40 12.00z` | 12 o’clock clockwise to 9 o’clock, 270 degrees |

Read as written, the half path draws an arc to (1, 12) and the three-quarter path an arc to (1, 6.4), each off the fill disk, then stops at the dangling number; browsers log `Expected number` and drop the closing `z`. Removing the single extra `0` and keeping every other number unchanged gives rotation 0, the large-arc flag (0 for 180 degrees, 1 for 270), sweep 1 and the end point on the radius 5.6 circle. Both corrected arcs continue the quarter glyph: same centre, radius, start and direction, filling one half and three quarters of the disk.

## Scope

- The app’s `app/components/relay/StateGlyph.vue` uses the corrected paths.
- The approved records are not edited. They keep the original bytes, so the glyph comparison in `tests/components/relay/specimen.ts` replaces exactly these two path strings, only in a `path` element’s `d`, and checks that each record below still has the listed hash and number of each invalid string. Every other element and attribute is still compared as approved.

| Record | SHA-256 | Half | Three quarters |
|---|---|---|---|
| `docs/design/system/approved.html` | `97db488dd7a0abb48b56be28d83ea23d15bba9ab409d17887e41af9e356d81cd` | 13 | 27 |
| `docs/design/b2-practice-preparation/approved.html` | `e08e725b68caa073ac471e00e9ff9fa73dd3e80365b01ff73cff2233fccdc2c5` | 159 | 0 |
| `docs/design/b1-access-and-intake/approved.html` | `fdb76b32e9fbc2cfe71be091969db63114298d0cb669498f24f71148093b36b5` | 1 | 0 |
| `docs/design/holder-long-names/approved.html` | `e5f40d79ce9c88dea9b5ad4f444844c275526a01da71ed4dd5669c29dab639d1` | 60 | 0 |
| `docs/design/holder-long-names/approved-preview.html` | `10e086de943db26660e14c69b6082121b099274fc5e6adbb1a34598180f1c25a` | 14 | 0 |

The rejected options and round files carry the same strings and are also left unchanged. Anyone copying a half or three-quarter path from an approved record uses the corrected path above instead.

## Approval

None was sought. This restores the fractions the owner already approved in writing; it does not change a token, colour, outline, size, word or state. The 2026-11-21 build check note that a clean half and three-quarter fill “would need a design decision” is superseded by this erratum.
