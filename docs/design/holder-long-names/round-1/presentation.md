# Representative desk Holder: long first names. UI design gate, round 1

Proposal for the owner. Nothing here is approved. Linked to PR #171 (published head f93bab6, held) and the Relay system foundation (PR #160). Concepts were built and checked against prepared head e48804c (tree 8c0d947).

## The problem

DESIGN 12.2 gives the desk Holder its own right-hand column of 56 to 72 px: a 24 px disc over a 12 px, weight 600 word that breaks only at spaces. QueueRow puts it in a 72 px column. Since 2026-11-19 the desk word can be a colleague's first name. At 12 px 600, "Sivasubramanian" is 96.5 px wide.

Measured at e488 (`/dev/relay`, desk specimen, word swapped in the browser only):

- The holder's inner grid track sizes to 96.5 px inside its 72 px box. The word sticks out 24.5 px from the holder and 10.5 px past the row's right edge.
- The specimen panel has `overflow-hidden`, so the word is visibly clipped to "Sivasubramania" ([crop](evidence/browser/e488-desk-overflow-crop.png)).
- On B2's approved composition ([baseline page](concepts/baseline/index.html)), the 320 px page scrolls sideways to 324 px. B2's narrow queue uses a 64 px column, and even "Unassigned" (64.7 px) overflows it by 0.7 px.

## The five concepts

| # | Name | Core idea | Main trade-off |
|---|---|---|---|
| 1 | Split in place | Keep the 72 px column, the row and the anatomy. A single word wider than the column breaks inside the word. | No layout or height change at all, but "Sivasubrama / nian" is split with no hyphen, against the explicit space-only rule. |
| 2 | Practice-fitted column (**recommended**) | Keep every Holder rule except the width. The column is as wide as the longest holder word the practice can show, at least 72 px, and the same in every row. | Discs stay in one straight column and names stay whole. Every row of that practice pays for the widest name: client names narrow by 35 px at 440 px and 25 px at 320 px. |
| 3 | Long name drops below | Rows with ordinary words stay exactly as approved. A holder word too wide for 72 px moves, disc and all, to its own right-aligned line at the end of that row. | No cost to other rows, but the column breaks for those rows, and which names drop depends on their width. |
| 4 | Holder closes the row | The holder becomes the last line of every row: the disc beside the word (the approved turn-tag pairing), right-aligned. | Any name reads on one line and the details get the 82 px back. You get one extra line per row, and holders no longer form a column. |
| 5 | Holder on the name line | The holder moves beside the client name as a disc-and-word tag. The date joins the program on the details line, as B2's narrow queue already places it. | The densest option, but the date loses its own column, the discs don't line up, and both the Holder anatomy and the QueueRow column order change. |

## Recommendation: concept 2, Practice-fitted column

It is the only option that keeps every approved Holder rule except one number:

- its own right-hand column
- the 24 px disc centred over the word
- the 12 px, weight 600 word in turn ink
- breaks only at spaces
- the hidden "Whose turn:" prefix

The discs stay perfectly aligned (0 px spread in every measured view), so the queue still scans as a column, which is why the column exists (decision.md, discrepancy 6).

Its cost is moderate and predictable. The width comes from the practice's people, not from the rows on screen, so it never jumps when you filter, scroll or switch views. Concept 1 changes less layout, but it breaks the explicit text rule the owner approved.

If the owner values density above column scanning, concept 5 is the strongest alternative.

**Open limit for the owner.** Concept 2 has no maximum width. A first name wider than about half a 320 px row (roughly 28 letters) would leave the client-name column under 70 px. Nothing overflows, but nothing caps it either. The owner may want a fallback rule, for example concept 1's in-word break beyond a cap.

## Approved rules each concept changes

Every concept keeps the 12 px 600 word, the turn colours, the hidden prefix, the full first name, the row link and focus ring, and every token and glyph. Client Holder is unchanged in all five.

| Concept | Where | Approved now | Proposed (needs the owner) |
|---|---|---|---|
| 1 | DESIGN 12.2 Holder; decision.md | "breaking only at spaces" | Break at spaces; break inside a single word only when the word is wider than the column |
| 1 | B2 narrow queue | Holder column 64 px | DESIGN's 72 px, so "Unassigned" stays whole |
| 2 | DESIGN 12.2 Holder | "own column (56 to 72 px wide)" | Own column, at least 72 px, as wide as the longest holder word the practice can show |
| 2 | DESIGN 12.2 QueueRow; decision.md summary and discrepancy 6 | 72 px right-hand column | Same, practice-fitted |
| 2 | B2 narrow queue | 64 px | At least 72 px, practice-fitted |
| 3 | DESIGN 12.2 Holder and QueueRow; decision.md discrepancy 6 | Holder stays in its own 72 px column | Exception: a word wider than the column moves the holder to its own right-aligned last line |
| 3 | B2 narrow queue | 64 px | 72 px |
| 4 | DESIGN 12.2 Holder | Own column; "24 px TurnDisc over the word" | Own right-aligned last line; disc beside the word |
| 4 | DESIGN 12.2 QueueRow | 72 px column; "Average height 84 px" | Holder on the last line; rows gain a line |
| 4 | decision.md discrepancy 6 | Holder in its own 72 px column | Holder on its own last line |
| 5 | DESIGN 12.2 Holder | Own column; disc over word | On the name line, sized to its word; disc beside the word |
| 5 | DESIGN 12.2 QueueRow | Date with its days count in its own column; holder in a 72 px column | Date joins the details line at every width; holder on the name line |
| 5 | decision.md discrepancy 6 | Holder in its own 72 px column | Holder on the name line |

Concepts 2 to 5 also enforce "breaking only at spaces" strictly: each space-separated part of a name is set `nowrap`. The browser otherwise breaks after a hyphen, so "Jean-Baptiste" (78.6 px) would split at the hyphen even in today's approved 72 px column. This is an implementation detail that restores the approved rule, not a rule change.

## Files to show (absolute paths)

| # | Full concept | 728 px preview |
|---|---|---|
| 1 | /Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-design-20261122/concepts/1-split-in-place/index.html | /Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-design-20261122/concepts/1-split-in-place/preview.html (1892 px tall) |
| 2 | /Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-design-20261122/concepts/2-practice-fitted-column/index.html | /Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-design-20261122/concepts/2-practice-fitted-column/preview.html (1987 px) |
| 3 | /Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-design-20261122/concepts/3-long-name-drops-below/index.html | /Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-design-20261122/concepts/3-long-name-drops-below/preview.html (1919 px) |
| 4 | /Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-design-20261122/concepts/4-holder-closes-the-row/index.html | /Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-design-20261122/concepts/4-holder-closes-the-row/preview.html (1873 px) |
| 5 | /Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-design-20261122/concepts/5-holder-on-the-name-line/index.html | /Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-design-20261122/concepts/5-holder-on-the-name-line/preview.html (1643 px) |
| Baseline, not a concept | /Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-design-20261122/concepts/baseline/index.html | (no preview; labelled existing defect) |

Each file is self-contained. IBM Plex Sans 400/500/600 and Mono 400 are inlined as subsetted WOFF2, built from the app's self-hosted files. The stylesheet is B2's approved CSS copied verbatim, plus concept rules that use only existing tokens. Nothing is fetched from the network.

Each full concept shows:

- the B2 desk (sidebar, 440 px queue, case pane) in light and dark
- the native narrow queue in 320 px frames, light and dark
- every desk holder word under the concept's rule: You, Client, Unassigned, Signed, the B2 no-turn status, Daniel, Marie-Ève, Ọláolúwa, Maria Guadalupe and Sivasubramanian
- the rule table

All names are synthetic. Counts of 1 appear: the urgent group, "Impact not checked" and the sidebar's Urgent view. Below 1000 px of width the desk collapses to the queue with a views strip, and below 400 px of queue width it uses B2's narrow row arrangement.

## Separate approval item: token names for the two approved base shadows

This is not part of the Holder choice. Ask it as its own question.

| Proposed name | Exact value, light and dark | Already approved in |
|---|---|---|
| `--shadow-button-base` | `0 1px 0 rgba(0,0,0,.04)` | DESIGN.md section 7 (Buttons); approved.html line 288 |
| `--shadow-input-base` | `inset 0 1px 1px rgba(0,0,0,.03)` | DESIGN.md section 7 (Inputs); approved.html line 296 |

**Why a record change is needed.** The build at e488 renders neither shadow. The app's design lint forbids raw colours in UI files ("Raw colour … use a Relay colour token"). `docs/design/system/tokens.css` is byte-locked as the approved token authority ("approved token authority changed; restore the approved bytes"). So restoring the exact approved values requires two names in the approved token record, and only the owner can approve that.

**Proposed record update, pending the owner:**

- `tokens.css` and `tokens.json`: add both names in light and dark, with the same values as the specimen.
- DESIGN.md section 7: name the tokens beside the values it already lists.
- `decision.md`: a dated entry with the owner's words.
- The authority check: updated to the newly approved bytes as part of the same approved change.

No value, colour or component changes. The parent's retained patch is at `~/.orchestrate/scratch/cadet2-fix-171-shadow-evidence/proposed-alias.patch`. It is not applied, and approval is not implied.

**Visual comparison** (approved specimen beside the build at e488, desk and client, with a 4× magnified crop):

- Full, both themes: /Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-design-20261122/shadow-alias/index.html
- Preview, 728 px wide, 1572 px tall, light only (dark uses the same values): /Users/wesleyukadike/.orchestrate/scratch/cadet2-holder-design-20261122/shadow-alias/preview.html

Computed in the browser: approved `rgba(0, 0, 0, 0.04) 0px 1px 0px 0px` and `rgba(0, 0, 0, 0.03) 0px 1px 1px 0px inset`; e488 build `none`.

## Checks run

Evidence is in `evidence/`; results are in `evidence/browser/browser-results.json`, `zoom-results.json`, `preview-results.json` and `shadow-results.json`. Each concept was rendered in an owned Playwright Chromium 1208 session, with every capture saved as a PNG next to the results.

| Check | Baseline / e488 | C1 | C2 | C3 | C4 | C5 |
|---|---|---|---|---|---|---|
| Holder word overflowing its holder or row, at 1440, native 320 and actual 200% zoom | Yes: 24.5 px past the holder, 10.5 px past the row; at 320 px, 32.5 / 20.5 | none | none | none | none | none |
| Page scrolls sideways at native 320 px | Yes (324 px) | no | no | no | no | no |
| A word broken inside a space-separated part | no | yes ("Sivasubramanian", by design) | no | no | no | no |
| Word size and weight | 12 px 600 | 12 px 600 | 12 px 600 | 12 px 600 | 12 px 600 | 12 px 600 |
| Average row height, 440 px desk queue | 133.1 | 133.1 | 137.4 | 136.0 | 139.6 | 111.1 |
| Average row height, 318 px narrow queue | 202.4 (B2 64 px) | 202.4 | 220.8 | 202.8 | 190.9 | 146.4 |
| Average row height, 200% zoom (queue 678 px) | 104.5 | 104.5 | 104.5 | 107.4 | 131.5 | 91.0 |
| Disc x-spread down the queue (0 = one straight column) | 12.3 (overflow shifts it) | 0 | 0 | 12.3 | 75.8 | 75.8 |
| Client name width at 440 px (normal row) | 218 | 218 | 183 | 218 (301 in the dropped row) | 300 | 320 (244 beside Sivasubramanian) |

**Actual 200% zoom.** A headed, disposable Chromium profile with the default zoom preference set to 200% read back as 720 CSS px and DPR 2. The profile was deleted afterwards. A first headless attempt ignored the preference (it read back 1440 / DPR 1) and was discarded.

**Keyboard.** At 1440, Tab from the queue's View select runs: Search, then each row link top to bottom, then "Show all". Every row shows a 2 px `--ring` outline (rgb(47,107,255) in light) at 1 px offset, matching `:focus-visible`. Rows are 104 to 175 px tall, far above 24 px. No new controls, disclosures or shortcuts are added in any concept.

**Accessible names (Playwright ARIA snapshot).** Every row link contains "Whose turn: {word}" or "Status: …".

- Concepts 1 and 2 keep B2's DOM order: name, date, holder, details.
- Concepts 3 and 4 move the holder to the end of the link name, matching where it appears visually.
- Concept 5 places it right after the client name, also matching the visual order.

Discs and glyphs stay `aria-hidden`.

**Contrast.** Holder words measured in the browser, minimum per state: light 6.32 to 7.33, dark 6.83 to 10.2. Turn discs, computed from tokens on card / on accent:

| Disc | Light | Dark |
|---|---|---|
| Progress | 6.32 / 5.54 | 7.11 / 5.86 |
| Caution | 5.43 / 4.75 | 8.66 / 7.14 |
| Seal | 6.33 / 5.55 | 6.93 / 5.72 |

My script's per-disc browser number was wrong for `rgb(…, 0)` colours: it treated a 0 blue channel as transparent. I replaced it with these token computations.

**Pre-existing, not introduced.** The no-turn dashed `--input` outline on a hovered or selected `--accent` row is 2.89 (light) and 2.93 (dark), under 3:1. The approved pairs cover only card and muted. No concept's queue rows use the no-turn holder.

**Previews.** All five are 728 px wide, 1643 to 1987 px tall, with no horizontal overflow.

**Static checks.** No duplicate ids. Every label has a target. No inline hex colours. No external font requests.

## Blocked, unrun and limits

- **T3 preview.** `preview_status` was checked first, and I opened my own incognito tab (`reuseExistingTab: false`); an earlier tab on the user's default profile was closed unused. `preview_evaluate` worked: it confirmed the e488 overflow and the 96.5 px track. `preview_snapshot` failed twice on the same step: "Preview automation snapshot timed out after 15000ms." I then switched to an owned Playwright session for all captures.
- **e488 dev server.** The first `nuxt dev` failed with "EMFILE: too many open files, watch". The retry with `CHOKIDAR_USEPOLLING=1` served `/dev/relay` (200). Dependencies were installed with `pnpm install --frozen-lockfile --offline --ignore-scripts`, so no git hooks ran, and `core.hooksPath` is unchanged. `node_modules`, `.nuxt` and `.data` were created by me and removed afterwards.
- **Real assistive technology.** No real screen reader (VoiceOver, NVDA, TalkBack), no device, and no OS zoom or settings. The geometry, ARIA snapshot, keyboard and contrast checks are not AT or QA acceptance. Real macOS VoiceOver, and the other required sessions, remain mandatory after the owner's final choice and its implementation.
- **Not run for concepts** (as instructed): full verify, native233, admin85 and axe.
- **Process-listing rule breach.** Once, while confirming my first dev server had stopped, I used `pgrep -f`, which matches against process arguments. That breaks the PID/PPID/state/CWD-only rule; it printed nothing. A later cleanup helper printed a wrong, over-broad PID list (PID/PPID only). Its `kill` call failed without signalling anything, and every listed process and both of my ports were still alive. I then terminated exactly my five owned PIDs (Nuxt 53975, 54482, 54508, 54509 and static server 54897), verified by PID, PPID and CWD.

## Unchanged

- Prepared source: HEAD e48804c, tree 8c0d947, no diff, clean status including ignored files.
- No source, config, token, baseline, QA or approval-record edits; no commits, pushes, PRs or GitHub activity.
- PR #171 remains held at f93bab6.
- No Holder implementation, no approval claim and no gate credit.
