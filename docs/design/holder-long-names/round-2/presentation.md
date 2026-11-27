# Representative desk Holder, long first names. UI design gate, round 2

Proposal for the owner. Nothing here is approved. The owner selected “1 · Split in place (Recommended)” and “Refine next round (Recommended)” on 2026-11-22; this is that one refined direction, not a new one. Built and checked against prepared head e48804c (tree 8c0d947) plus the approved shadow aliases (local commit 1e0835f).

## The refined rule

Keep the 72 px Holder column and the whole row exactly as approved. A holder name breaks at its spaces first. Only a single word that cannot fit the column on its own line breaks inside the word, and the holder grows downward to fit it.

- Unchanged: the fixed 72 px column of its own, the 24 px disc over the word, the date column, the turn colours, the 12 px, weight 600 word and the hidden “Whose turn:” or “Status:” prefix. Client Holder is unchanged.
- The full first name stays one piece of page text. Nothing is shrunk, hyphenated, abbreviated, clamped, truncated or clipped.
- B2’s narrow queue moves from a 64 px to DESIGN’s 72 px column, so “Unassigned” (64.7 px) stays whole.

## Correction to round 1

Round 1 said concept 1 caused “zero layout change”. That held only for the names it showed. Measured now:

- **Ordinary rows don't grow.** At 440 and 320 px, every sample row is exactly as tall as today, including Sivasubramanian, Jean-Baptiste and Maria Guadalupe. Their two-line holder (55.8 px) fits beside the row’s own three text lines.
- **Extreme names do grow the row.** 64, 128 and 255-character synthetic words make 6, 11 and 23-line holders. The 440 px rows grow to 170, 242 and 415 px, with nothing overlapping. No input contract in the code caps a member’s first name, so these stress lengths are labelled as tests, not names.

## Measured cost (same rows, today’s rules vs refined)

| View | Today | Refined |
|---|---|---|
| 440 px desk queue, 11 ordinary rows | Average 127.4 px; Sivasubramanian 24.5 px past its holder; discs drift 12.3 px | Average 127.4 px, no row changes; nothing outside the column; discs in one line |
| 320 px narrow queue, 8 rows | Average 198.0 px; 64 px column: Sivasubramanian out 32.5 px, Unassigned 0.7 px | Average 198.0 px, no row changes; client names 191 → 183 px (8 px) |
| Stress rows 64 / 128 / 255 | Word runs 305 / 686 / 1453 px past the holder; page scrolls sideways | Rows 170 / 242 / 415 px; no overflow |
| Break behaviour | “Anna Marie-Ève” breaks inside “Marie-Ève” at the hyphen | Breaks at the space; Jean-Baptiste splits at its own hyphen; Sivasubramanian as “Sivasubram / anian” |

## Proposed amendments (none approved)

| Where | Approved now | Proposed, needs the owner |
|---|---|---|
| DESIGN 12.2 Holder | “breaking only at spaces” | Break at spaces. Break inside a single word only when that word is wider than the column on its own line; never shrink, hyphenate, abbreviate, truncate or clip it |
| DESIGN 12.2 Holder | No rule for holder height | The holder grows downward line by line, so the row grows only when the holder is taller than the row’s own text |
| DESIGN 12.2 QueueRow | “the Holder in a 72 px right-hand column”; “Average height 84 px” | Unchanged; 72 px is a hard limit the word wraps inside |
| decision.md, Holder column | “words break only at spaces” | Same amendment, with the owner’s words |
| B2 narrow queue | Holder column 64 px | DESIGN’s 72 px |

## Files

- Full, self-contained: /Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-refinement-r2-20261122/index.html
- Render-ready 728 px preview (1978 px tall at 728): /Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-refinement-r2-20261122/preview.html

Both inline IBM Plex Sans and Mono subsets, B2’s approved CSS and existing glyphs. Nothing is fetched from the network, and there are no scripts. The preview has a transparent, fluid html, body and wrapper. Its product panels keep their own light or dark theme.

## Suggested owner question (the parent asks it)

“Desk Holder for long first names: is refined Split in place the final design, with the five amendments shown?”

- “Approve refined Split in place, satisfied (Recommended)”: final approval; the amendments get recorded and Holder code may be built.
- “Refine again”: name what to change.
- “Choose a different round-1 concept”.
