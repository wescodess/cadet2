# Desk Holder for long first names: design decision

Date: 2026-11-22
Gate: UI design gate, Representative desk Holder (round 1: five concepts; round 2: one refined concept)
Status: approved by the owner as final, with explicit satisfaction
Canonical approval: [wescodess/cadet2#160, comment 7089068254](https://github.com/wescodess/cadet2/issues/160#issuecomment-7089068254)
Approved design: [approved.html](approved.html) (full, browser-verified) and [approved-preview.html](approved-preview.html) (the rendered 728 px preview)
Amends: [DESIGN.md](../../../DESIGN.md) section 12.2 (Holder), [system decision](../system/decision.md#holder-long-names-amendment-2026-11-22) and the [B2 decision](../b2-practice-preparation/decision.md#build-rules-that-differ-from-the-approved-screens)

## Approval

The owner was asked, verbatim:

> Is the rendered refined “Split in place” Holder your final design? It keeps the 72 px column and 12 px/600 text, breaks at spaces first and inside a word only when needed, lets the row grow for extreme names, and changes B2’s narrow column from 64 to 72 px. Full text stays available without shrinking or clipping. [Checked full proposal](/Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-refinement-r2-20261122/index.html). Approval covers this design; implementation, full quality checks and real screen-reader QA still follow.

The owner answered on 2026-11-22, verbatim:

> Approve refined Split in place as final; I am satisfied (Recommended)

The approval covers the design exactly as rendered in `approved.html`. It does not waive the full quality checks, independent reviews or the real screen-reader QA the question names, and it approves no merge.

## The approved rule

The Representative Holder keeps everything [DESIGN.md](../../../DESIGN.md#122-composed-components) already specifies except how its word breaks and how tall it may grow:

- A fixed 72 px column of its own, the 24 px TurnDisc above the word, the word at 12 px and weight 600 in the existing line height and turn colour, and the visually hidden “Whose turn:” or “Status:” prefix.
- The word breaks at its spaces first. A single word breaks inside itself only when it cannot fit the 72 px column on a line of its own.
- No inserted hyphen, clipping, abbreviation, truncation, clamp or smaller type. The full word stays in the page text, with its spaces.
- The holder grows downward line by line. A row grows only when its holder is taller than the row’s own text, which happens for genuinely extreme words. The 64, 128 and 255 character stress words in `approved.html` are tests, not name limits or data validation rules.
- B2’s narrow queue moves its Holder column from 64 px to 72 px. Its client-name column gives up those 8 px. The disc column stays aligned; every other part of the row, including the date, state and owner order, is unchanged.

The Client expression is unchanged: its holder keeps the growing column and the 15 px Label text from the 2026-11-18 and 2026-11-19 amendments, and is not capped at 72 px.

## What was chosen and why

Round 1 showed five concepts for the case the 2026-11-19 colleague-name amendment opened: a first name such as “Sivasubramanian” (96.5 px at 12 px, 600) is wider than the 72 px column, and the built holder let it overflow. The owner selected “1 · Split in place (Recommended)” and chose “Refine next round (Recommended)” ([foundation decision](https://github.com/wescodess/cadet2/issues/160#issuecomment-7083887827)). Round 2 refined that one concept: spaces break first, so “Anna Marie-Ève” no longer breaks inside “Marie-Ève”, and it measured the real cost, correcting round 1’s claim that rows never change height.

Measured in round 2 (Chromium, same rows under the earlier rules and the refined rule):

| View | Earlier rules | Refined |
|---|---|---|
| 440 px desk queue, 11 ordinary rows | Average 127.4 px; Sivasubramanian 24.5 px past its holder; discs drift 12.3 px | Average 127.4 px, no row changes; nothing outside the column; discs in one line |
| 320 px narrow queue, 8 rows | Average 198.0 px; 64 px column: Sivasubramanian out 32.5 px, Unassigned 0.7 px | Average 198.0 px, no row changes; client names 191 → 183 px |
| Stress words of 64, 128 and 255 characters | The word runs 305, 686 and 1453 px past the holder; the page scrolls sideways | Rows 170, 242 and 415 px; no overflow |

## Concepts shown and their status

| File | Status |
|---|---|
| [round-1/1-split-in-place.html](round-1/1-split-in-place.html) | Selected for refinement in round 1, then superseded by `approved.html` |
| [round-1/2-practice-fitted-column.html](round-1/2-practice-fitted-column.html) | Not selected (round 1’s recommendation) |
| [round-1/3-long-name-drops-below.html](round-1/3-long-name-drops-below.html) | Not selected |
| [round-1/4-holder-closes-the-row.html](round-1/4-holder-closes-the-row.html) | Not selected |
| [round-1/5-holder-on-the-name-line.html](round-1/5-holder-on-the-name-line.html) | Not selected |

The shadow comparison shown beside round 1 is a separate decision, approved and recorded in the [system decision](../system/decision.md#shadow-alias-amendment-2026-11-22). It is not a Holder concept.

## Files in this record

Every file is a byte-identical copy of what the owner saw. Do not edit them. Their statements that nothing is approved describe each round before this decision.

| File | Copy of | SHA-256 |
|---|---|---|
| `approved.html` | Round 2 `index.html`, the browser-verified bytes | `e5f40d79ce9c88dea9b5ad4f444844c275526a01da71ed4dd5669c29dab639d1` |
| `approved-preview.html` | Round 2 `preview.html`, as rendered | `10e086de943db26660e14c69b6082121b099274fc5e6adbb1a34598180f1c25a` |
| `round-2/presentation.md` | Round 2 `presentation.md` | `e209be7b9ee66b5d10a3a818a4e12a2ffecabef4e7cd1dce5d20139e7718478a` |
| `round-1/1-split-in-place.html` | Round 1 render copy | `7fdd41fd002a2a0c7839f5dfd721f4138b841201af52060e225a2f6f622da90e` |
| `round-1/2-practice-fitted-column.html` | Round 1 render copy | `de53d30b4bf2ab08185aa02d10de92744d4900564beb2f68d01e2a49008f36de` |
| `round-1/3-long-name-drops-below.html` | Round 1 render copy | `2238cf73dc1dacd636b19904d1fa35fa721e11cee5d460cc583d125dadd6de04` |
| `round-1/4-holder-closes-the-row.html` | Round 1 render copy | `4fc2c4f3574fb47b49f2906f20e8a844efa82a7dbec30f2710e452f03d05d155` |
| `round-1/5-holder-on-the-name-line.html` | Round 1 render copy | `be81b40646dd069cce088851ee3d72d988f184a5abca1e26d1a0d540d2a02a74` |
| `round-1/README.md` | Round 1 render notes | `7646e43ac9c961f161fa331a7fa88bf9b84d870ff60ff769ef726987740d8106` |
| `round-1/presentation.md` | Round 1 `presentation.md` | `1fcd07d96c848a2784d79628bdee0eb9579316347469d830b3e602f9e199466f` |

A later edit after the browser check added one CSS line to round 2’s `index.html` (the “Show all” line under a group). That version was never browser-verified and is not part of this approval; `approved.html` is the verified file without it.

## Build requirements

- Each space-separated part of the word is its own inline block that may break inside itself, so a part like “Marie-Ève” stays whole after a space. The spaces between parts stay in the text, so the accessible name is the whole word: “Whose turn: Anna Marie-Ève”.
- Safari and VoiceOver can expose inline-block runs inside a link as separate text items. Real VoiceOver must confirm the full-row link still reads the prefix and the whole name before the UI merge; markup or accessibility-tree checks alone do not prove it.
- The no-turn dashed outline on a hovered or selected row (`--input` on `--accent`) measures 2.89 light and 2.93 dark. That is inherited from the system, not changed here.
- The inherited StateGlyph half and three-quarter path errors in the browser console are a separate foundation item; this record does not change any glyph.
