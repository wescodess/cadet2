# Critique: option 2, Signal

Held by the orchestrator until the owner has reacted. Checked on 2026-11-17 against the brief, the UX research (sections C, D and F) and the owner’s standing taste, using the design-critique and accessibility-review skills plus an automated pass over the rendered specimen.

## Design critique

### Overall impression

Unmistakable and fast to read. The navy direction sign makes the client’s next step impossible to miss, and the eight sign shapes are the strongest colour-independent state language of the five. The risk is volume: every state is a solid plate, so busy screens shout.

### Usability

| Finding | Severity | Resolution |
|---|---|---|
| In representative rows, two or three solid plates per file compete with the urgent plate. | Moderate | Held for owner reaction: plates could be reserved for urgent and attention states, with routine progress shown as shape-only glyphs. That keeps the sign vocabulary. |
| “Replacement needed” uses the octagon (stop). For an anxious client a fixable upload task may read as a hard stop. | Moderate | Held: the octagon is the system’s “fails a requirement” sign; the copy explains the fix. Owner to judge tone. |
| Representative board rows are about 140 px tall, so about six files fit above the fold at 1440 by 900. | Moderate | Held: a compact row (single-line chips, 36 px tiles) is a refinement, not a defect. |
| The starburst for urgency can read as a retail “new” badge out of context. | Minor | Held: paired with the words “needs a representative now” it is unambiguous. |

### Visual hierarchy

- First on the phone: the navy next-step field with a white button. Correct.
- First on desktop: the urgent view chip and the urgent row’s orange edge. Correct for triage.
- Emphasis: amber plates are visually heavier than blue ones, so “changed since review” rightly outranks “reviewing”.

### Consistency

| Element | Observation | Recommendation |
|---|---|---|
| Borders | All containers use 2 px borders; the selected row uses a 5 px edge. Consistent. | Keep |
| Amber | Amber plates are the only plates with dark text and an outline in light theme. | Keep: it is the caution-sign convention, documented in the audit. |

### What works well

- Atkinson Hyperlegible keeps I, l and 1 apart, which matters for licence numbers and case IDs.
- Shape, colour and word together: the strongest result for colour-blind and greyscale reading.
- The date tile turns orange inside 90 days, so the escalation threshold is visible without reading.

### Priority recommendations

1. Decide how loud the representative board should be.
2. Review the octagon’s tone for client-facing replacement requests.
3. If chosen, draw the sign glyphs as a small Vue component set with tests for each shape.

## Brief and guardrail check

| Constraint | Result |
|---|---|
| No scores, percentages, approval chances, rankings, confidence badges or “fastest route” | Pass. The only “score” in the copy is the client’s IELTS test scores; no percentage appears in product copy. |
| No government identity marks | Pass. No wordmark, flag, maple leaf or GC look-alike; canada.ca appears only as a cited source. |
| “Not legal advice” where a draft or general result appears | Pass. Draft assessment notice (representative) and general information notice (client). A signed plan is the representative’s advice and is not labelled “not legal advice”, as the research recommends. |
| “Verified as of” where a result appears | Pass. Provenance rows, the signed-plan header, the draft notice and the phone screens. |
| “Representative”, never “agent” | Pass. Zero occurrences of “agent” in the specimen. |
| Long names and translated strings | Pass. Oluwaseun Adébáyọ̀-Fitzgerald, Nguyễn Thị Minh Khai and Siobhán Ní Bhriain wrap without truncating any state. |
| Expressible as shadcn variables plus semantic tokens | Pass. Standard shadcn-vue names plus eight state roles with four tokens each; see the token block in `index.html`. |

## Accessibility review (WCAG 2.2 AA)

**Standard:** WCAG 2.2 AA. **Date:** 2026-11-17. **Method:** computed token contrast (below), plus a Playwright pass over the rendered specimen in both themes that measured every text node against its real composited background, every interactive target, keyboard focus styles on 78 controls, and reflow of the client column at 320 px.

### Summary after fixes

| Check | Result |
|---|---|
| Token pairs checked | 172 (86 light, 86 dark) |
| Token pairs failing | 0 |
| Token pairs mitigated by design | 3 (--caution on --background, light; --caution on --card, light; --caution on --caution-soft, light) |
| Lowest text pair | 5.18:1 (needs 4.5) |
| Lowest non-text pair | 1.66:1 (needs 3), the mitigated amber plate edge; the outline that carries the boundary is 16.3:1 on the page and 18.0:1 on cards |
| Rendered text below its minimum | 0 |
| Targets under 24 by 24 px | 0 |
| Primary client targets under 44 px | 0 |
| Controls without a visible focus style | 0 of 78 |
| Overflow in the client column at 320 px | 0 |

### Findings fixed in this pass

- The “Check this licence on the CICC register” link sat in a flex row at 18 to 22 px tall, below the 24 px minimum (WCAG 2.5.8). It now has a 24 px minimum height for representatives and 32 px for clients.
- Added a client “general information, not legal advice” notice for solo clients reading program information, so that copy is specified outside the representative draft as well.

### Perceivable

| # | Item | Criterion | Status |
|---|---|---|---|
| 1 | Every state pairs colour with a glyph and a written label | 1.4.1 Use of colour | Pass |
| 2 | Text contrast in both themes | 1.4.3 Contrast (minimum) | Pass, see table |
| 3 | Glyphs, input boundaries and focus rings at 3:1 | 1.4.11 Non-text contrast | Pass (amber plates use an outline in light theme) |
| 4 | Headings, lists, tables and description lists carry structure | 1.3.1 Info and relationships | Pass |
| 5 | Client column reflows at 320 px; long names wrap | 1.4.10 Reflow | Pass |

### Operable

| # | Item | Criterion | Status |
|---|---|---|---|
| 1 | Visible focus on every control in both themes | 2.4.7 Focus visible | Pass |
| 2 | Sticky phone tab bar must not hide focused fields | 2.4.11 Focus not obscured | Build requirement: set `scroll-padding-bottom` to the tab bar height |
| 3 | Targets at least 24 px; primary client targets at least 44 px | 2.5.8 Target size | Pass |
| 4 | Shortcuts shown with visible button equivalents; signing needs ⌘ Enter plus a confirm dialog | 2.1.1, 2.1.4 | Pass in the specimen; enforce in the build |

### Understandable

| # | Item | Criterion | Status |
|---|---|---|---|
| 1 | Errors name the field and say how to fix it; linked error summary | 3.3.1, 3.3.3 | Pass |
| 2 | Labels and hints above every input | 3.3.2 | Pass |
| 3 | Signing shows exactly what is recorded and needs an explicit acknowledgement | 3.3.4 Error prevention | Pass |

### Robust

| # | Item | Criterion | Status |
|---|---|---|---|
| 1 | Glyphs are `aria-hidden`; chip text carries the state | 4.1.2 | Pass |
| 2 | Save state and toasts use `role="status"`; error summary uses `role="alert"` | 4.1.3 Status messages | Pass |
| 3 | Dialog uses `role="dialog"`, `aria-modal` and `aria-labelledby` | 4.1.2 | Pass in markup; focus trap is a build requirement |

### Not verified here

Screen reader output, real keyboard traversal order in the built app, 200% zoom of the representative screen, and testing with real applicants and representatives. These belong to the surface concepts and the build.

## Open items held for the owner

- Plate volume in dense lists.
- Octagon for client replacement requests.

## Contrast table

Every text and state token pair in both themes, computed with the WCAG 2.2 relative luminance formula from the token values in `index.html`.

| Theme | Foreground | Background | Ratio | Needs | Use | Result |
|---|---|---|---|---|---|---|
| light | `--foreground` #0E1726 | `--background` #F2F4F7 | 16.30 | 4.5 | Body text | pass |
| light | `--card-foreground` #0E1726 | `--card` #FFFFFF | 17.96 | 4.5 | Text on cards | pass |
| light | `--popover-foreground` #0E1726 | `--popover` #FFFFFF | 17.96 | 4.5 | Text in menus and dialogs | pass |
| light | `--primary-foreground` #FFFFFF | `--primary` #13306B | 12.63 | 4.5 | Primary button label | pass |
| light | `--secondary-foreground` #0E1726 | `--secondary` #E2E8F0 | 14.57 | 4.5 | Secondary button label | pass |
| light | `--muted-foreground` #45516A | `--background` #F2F4F7 | 7.22 | 4.5 | Hints and metadata | pass |
| light | `--muted-foreground` #45516A | `--card` #FFFFFF | 7.96 | 4.5 | Hints on cards | pass |
| light | `--muted-foreground` #45516A | `--muted` #E8ECF1 | 6.71 | 4.5 | Hints on muted surfaces | pass |
| light | `--accent-foreground` #0E1726 | `--accent` #DDE7F7 | 14.41 | 4.5 | Hovered menu item | pass |
| light | `--destructive-foreground` #FFFFFF | `--destructive` #B3261E | 6.54 | 4.5 | Destructive button label | pass |
| light | `--destructive` #B3261E | `--background` #F2F4F7 | 5.93 | 4.5 | Error message text | pass |
| light | `--destructive` #B3261E | `--card` #FFFFFF | 6.54 | 4.5 | Error text on cards | pass |
| light | `--primary` #13306B | `--background` #F2F4F7 | 11.46 | 4.5 | Link text | pass |
| light | `--primary` #13306B | `--card` #FFFFFF | 12.63 | 4.5 | Link text on cards | pass |
| light | `--sidebar-foreground` #FFFFFF | `--sidebar` #0F2350 | 15.26 | 4.5 | Navigation text | pass |
| light | `--sidebar-primary-foreground` #0F2350 | `--sidebar-primary` #FFFFFF | 15.26 | 4.5 | Active navigation item | pass |
| light | `--sidebar-accent-foreground` #FFFFFF | `--sidebar-accent` #22396B | 11.26 | 4.5 | Hovered navigation item | pass |
| light | `--input` #556178 | `--background` #F2F4F7 | 5.66 | 3 | Input boundary (non-text) | pass |
| light | `--input` #556178 | `--card` #FFFFFF | 6.24 | 3 | Input boundary on cards (non-text) | pass |
| light | `--ring` #0B57D0 | `--background` #F2F4F7 | 5.80 | 3 | Focus ring (non-text) | pass |
| light | `--ring` #0B57D0 | `--card` #FFFFFF | 6.39 | 3 | Focus ring on cards (non-text) | pass |
| light | `--sidebar-ring` #9CC2FF | `--sidebar` #0F2350 | 8.41 | 3 | Focus ring in navigation (non-text) | pass |
| light | `--positive-ink` #08693A | `--background` #F2F4F7 | 6.16 | 4.5 | positive: state text | pass |
| light | `--positive-ink` #08693A | `--card` #FFFFFF | 6.79 | 4.5 | positive: state text on cards | pass |
| light | `--positive-ink` #08693A | `--positive-soft` #E1F3E8 | 5.88 | 4.5 | positive: state text on its tint | pass |
| light | `--foreground` #0E1726 | `--positive-soft` #E1F3E8 | 15.55 | 4.5 | positive: body text on its tint | pass |
| light | `--positive-foreground` #FFFFFF | `--positive` #0B7A44 | 5.41 | 4.5 | positive: text on solid fill | pass |
| light | `--positive` #0B7A44 | `--background` #F2F4F7 | 4.91 | 3 | positive: glyph or fill edge (non-text) | pass |
| light | `--positive` #0B7A44 | `--card` #FFFFFF | 5.41 | 3 | positive: glyph or fill edge on cards (non-text) | pass |
| light | `--positive` #0B7A44 | `--positive-soft` #E1F3E8 | 4.69 | 3 | positive: glyph on its tint (non-text) | pass |
| light | `--negative-ink` #981138 | `--background` #F2F4F7 | 7.71 | 4.5 | negative: state text | pass |
| light | `--negative-ink` #981138 | `--card` #FFFFFF | 8.49 | 4.5 | negative: state text on cards | pass |
| light | `--negative-ink` #981138 | `--negative-soft` #FCE4EA | 7.05 | 4.5 | negative: state text on its tint | pass |
| light | `--foreground` #0E1726 | `--negative-soft` #FCE4EA | 14.90 | 4.5 | negative: body text on its tint | pass |
| light | `--negative-foreground` #FFFFFF | `--negative` #A8123F | 7.44 | 4.5 | negative: text on solid fill | pass |
| light | `--negative` #A8123F | `--background` #F2F4F7 | 6.75 | 3 | negative: glyph or fill edge (non-text) | pass |
| light | `--negative` #A8123F | `--card` #FFFFFF | 7.44 | 3 | negative: glyph or fill edge on cards (non-text) | pass |
| light | `--negative` #A8123F | `--negative-soft` #FCE4EA | 6.17 | 3 | negative: glyph on its tint (non-text) | pass |
| light | `--caution-ink` #7A5200 | `--background` #F2F4F7 | 6.28 | 4.5 | caution: state text | pass |
| light | `--caution-ink` #7A5200 | `--card` #FFFFFF | 6.92 | 4.5 | caution: state text on cards | pass |
| light | `--caution-ink` #7A5200 | `--caution-soft` #FFF3CC | 6.24 | 4.5 | caution: state text on its tint | pass |
| light | `--foreground` #0E1726 | `--caution-soft` #FFF3CC | 16.20 | 4.5 | caution: body text on its tint | pass |
| light | `--caution-foreground` #1A1300 | `--caution` #F5B400 | 10.04 | 4.5 | caution: text on solid fill | pass |
| light | `--caution` #F5B400 | `--background` #F2F4F7 | 1.67 | 3 | caution: glyph or fill edge (non-text) | mitigated: amber plates carry a 2 px --caution-edge outline (foreground, 16.3:1) |
| light | `--caution` #F5B400 | `--card` #FFFFFF | 1.84 | 3 | caution: glyph or fill edge on cards (non-text) | mitigated: amber plates carry a 2 px --caution-edge outline (foreground, 18.0:1) |
| light | `--caution` #F5B400 | `--caution-soft` #FFF3CC | 1.66 | 3 | caution: glyph on its tint (non-text) | mitigated: amber glyphs on the amber tint are never used; tint holds ink text only |
| light | `--progress-ink` #1554AD | `--background` #F2F4F7 | 6.56 | 4.5 | progress: state text | pass |
| light | `--progress-ink` #1554AD | `--card` #FFFFFF | 7.23 | 4.5 | progress: state text on cards | pass |
| light | `--progress-ink` #1554AD | `--progress-soft` #E2EDFC | 6.11 | 4.5 | progress: state text on its tint | pass |
| light | `--foreground` #0E1726 | `--progress-soft` #E2EDFC | 15.18 | 4.5 | progress: body text on its tint | pass |
| light | `--progress-foreground` #FFFFFF | `--progress` #1860C4 | 5.98 | 4.5 | progress: text on solid fill | pass |
| light | `--progress` #1860C4 | `--background` #F2F4F7 | 5.43 | 3 | progress: glyph or fill edge (non-text) | pass |
| light | `--progress` #1860C4 | `--card` #FFFFFF | 5.98 | 3 | progress: glyph or fill edge on cards (non-text) | pass |
| light | `--progress` #1860C4 | `--progress-soft` #E2EDFC | 5.06 | 3 | progress: glyph on its tint (non-text) | pass |
| light | `--seal-ink` #432784 | `--background` #F2F4F7 | 10.24 | 4.5 | seal: state text | pass |
| light | `--seal-ink` #432784 | `--card` #FFFFFF | 11.28 | 4.5 | seal: state text on cards | pass |
| light | `--seal-ink` #432784 | `--seal-soft` #ECE6F8 | 9.26 | 4.5 | seal: state text on its tint | pass |
| light | `--foreground` #0E1726 | `--seal-soft` #ECE6F8 | 14.75 | 4.5 | seal: body text on its tint | pass |
| light | `--seal-foreground` #FFFFFF | `--seal` #4B2C93 | 10.09 | 4.5 | seal: text on solid fill | pass |
| light | `--seal` #4B2C93 | `--background` #F2F4F7 | 9.16 | 3 | seal: glyph or fill edge (non-text) | pass |
| light | `--seal` #4B2C93 | `--card` #FFFFFF | 10.09 | 3 | seal: glyph or fill edge on cards (non-text) | pass |
| light | `--seal` #4B2C93 | `--seal-soft` #ECE6F8 | 8.29 | 3 | seal: glyph on its tint (non-text) | pass |
| light | `--scope-ink` #8E1C6C | `--background` #F2F4F7 | 7.52 | 4.5 | scope: state text | pass |
| light | `--scope-ink` #8E1C6C | `--card` #FFFFFF | 8.29 | 4.5 | scope: state text on cards | pass |
| light | `--scope-ink` #8E1C6C | `--scope-soft` #F9E4F2 | 6.87 | 4.5 | scope: state text on its tint | pass |
| light | `--foreground` #0E1726 | `--scope-soft` #F9E4F2 | 14.89 | 4.5 | scope: body text on its tint | pass |
| light | `--scope-foreground` #FFFFFF | `--scope` #9E1F78 | 7.19 | 4.5 | scope: text on solid fill | pass |
| light | `--scope` #9E1F78 | `--background` #F2F4F7 | 6.52 | 3 | scope: glyph or fill edge (non-text) | pass |
| light | `--scope` #9E1F78 | `--card` #FFFFFF | 7.19 | 3 | scope: glyph or fill edge on cards (non-text) | pass |
| light | `--scope` #9E1F78 | `--scope-soft` #F9E4F2 | 5.96 | 3 | scope: glyph on its tint (non-text) | pass |
| light | `--history-ink` #5C4B3A | `--background` #F2F4F7 | 7.56 | 4.5 | history: state text | pass |
| light | `--history-ink` #5C4B3A | `--card` #FFFFFF | 8.32 | 4.5 | history: state text on cards | pass |
| light | `--history-ink` #5C4B3A | `--history-soft` #EFEAE4 | 6.96 | 4.5 | history: state text on its tint | pass |
| light | `--foreground` #0E1726 | `--history-soft` #EFEAE4 | 15.02 | 4.5 | history: body text on its tint | pass |
| light | `--history-foreground` #FFFFFF | `--history` #6B5845 | 6.76 | 4.5 | history: text on solid fill | pass |
| light | `--history` #6B5845 | `--background` #F2F4F7 | 6.13 | 3 | history: glyph or fill edge (non-text) | pass |
| light | `--history` #6B5845 | `--card` #FFFFFF | 6.76 | 3 | history: glyph or fill edge on cards (non-text) | pass |
| light | `--history` #6B5845 | `--history-soft` #EFEAE4 | 5.65 | 3 | history: glyph on its tint (non-text) | pass |
| light | `--urgent-ink` #A3370A | `--background` #F2F4F7 | 6.13 | 4.5 | urgent: state text | pass |
| light | `--urgent-ink` #A3370A | `--card` #FFFFFF | 6.76 | 4.5 | urgent: state text on cards | pass |
| light | `--urgent-ink` #A3370A | `--urgent-soft` #FDEBE1 | 5.84 | 4.5 | urgent: state text on its tint | pass |
| light | `--foreground` #0E1726 | `--urgent-soft` #FDEBE1 | 15.52 | 4.5 | urgent: body text on its tint | pass |
| light | `--urgent-foreground` #FFFFFF | `--urgent` #C2410C | 5.18 | 4.5 | urgent: text on solid fill | pass |
| light | `--urgent` #C2410C | `--background` #F2F4F7 | 4.70 | 3 | urgent: glyph or fill edge (non-text) | pass |
| light | `--urgent` #C2410C | `--card` #FFFFFF | 5.18 | 3 | urgent: glyph or fill edge on cards (non-text) | pass |
| light | `--urgent` #C2410C | `--urgent-soft` #FDEBE1 | 4.47 | 3 | urgent: glyph on its tint (non-text) | pass |
| dark | `--foreground` #F1F4F9 | `--background` #0B1526 | 16.57 | 4.5 | Body text | pass |
| dark | `--card-foreground` #F1F4F9 | `--card` #12203A | 14.73 | 4.5 | Text on cards | pass |
| dark | `--popover-foreground` #F1F4F9 | `--popover` #172848 | 13.29 | 4.5 | Text in menus and dialogs | pass |
| dark | `--primary-foreground` #0B1526 | `--primary` #9CC2FF | 10.07 | 4.5 | Primary button label | pass |
| dark | `--secondary-foreground` #F1F4F9 | `--secondary` #1C2C4A | 12.63 | 4.5 | Secondary button label | pass |
| dark | `--muted-foreground` #AEBBD0 | `--background` #0B1526 | 9.41 | 4.5 | Hints and metadata | pass |
| dark | `--muted-foreground` #AEBBD0 | `--card` #12203A | 8.36 | 4.5 | Hints on cards | pass |
| dark | `--muted-foreground` #AEBBD0 | `--muted` #16243F | 7.97 | 4.5 | Hints on muted surfaces | pass |
| dark | `--accent-foreground` #F1F4F9 | `--accent` #1E3156 | 11.69 | 4.5 | Hovered menu item | pass |
| dark | `--destructive-foreground` #0B1526 | `--destructive` #FF8A8A | 8.05 | 4.5 | Destructive button label | pass |
| dark | `--destructive` #FF8A8A | `--background` #0B1526 | 8.05 | 4.5 | Error message text | pass |
| dark | `--destructive` #FF8A8A | `--card` #12203A | 7.15 | 4.5 | Error text on cards | pass |
| dark | `--primary` #9CC2FF | `--background` #0B1526 | 10.07 | 4.5 | Link text | pass |
| dark | `--primary` #9CC2FF | `--card` #12203A | 8.95 | 4.5 | Link text on cards | pass |
| dark | `--sidebar-foreground` #F1F4F9 | `--sidebar` #060E1C | 17.52 | 4.5 | Navigation text | pass |
| dark | `--sidebar-primary-foreground` #060E1C | `--sidebar-primary` #F1F4F9 | 17.52 | 4.5 | Active navigation item | pass |
| dark | `--sidebar-accent-foreground` #F1F4F9 | `--sidebar-accent` #1A2A48 | 12.97 | 4.5 | Hovered navigation item | pass |
| dark | `--input` #8191AC | `--background` #0B1526 | 5.72 | 3 | Input boundary (non-text) | pass |
| dark | `--input` #8191AC | `--card` #12203A | 5.09 | 3 | Input boundary on cards (non-text) | pass |
| dark | `--ring` #9CC2FF | `--background` #0B1526 | 10.07 | 3 | Focus ring (non-text) | pass |
| dark | `--ring` #9CC2FF | `--card` #12203A | 8.95 | 3 | Focus ring on cards (non-text) | pass |
| dark | `--sidebar-ring` #9CC2FF | `--sidebar` #060E1C | 10.64 | 3 | Focus ring in navigation (non-text) | pass |
| dark | `--positive-ink` #5FD99A | `--background` #0B1526 | 10.33 | 4.5 | positive: state text | pass |
| dark | `--positive-ink` #5FD99A | `--card` #12203A | 9.18 | 4.5 | positive: state text on cards | pass |
| dark | `--positive-ink` #5FD99A | `--positive-soft` #0F2E1F | 8.30 | 4.5 | positive: state text on its tint | pass |
| dark | `--foreground` #F1F4F9 | `--positive-soft` #0F2E1F | 13.31 | 4.5 | positive: body text on its tint | pass |
| dark | `--positive-foreground` #04170C | `--positive` #42CF83 | 9.25 | 4.5 | positive: text on solid fill | pass |
| dark | `--positive` #42CF83 | `--background` #0B1526 | 9.12 | 3 | positive: glyph or fill edge (non-text) | pass |
| dark | `--positive` #42CF83 | `--card` #12203A | 8.11 | 3 | positive: glyph or fill edge on cards (non-text) | pass |
| dark | `--positive` #42CF83 | `--positive-soft` #0F2E1F | 7.33 | 3 | positive: glyph on its tint (non-text) | pass |
| dark | `--negative-ink` #FF95B1 | `--background` #0B1526 | 8.86 | 4.5 | negative: state text | pass |
| dark | `--negative-ink` #FF95B1 | `--card` #12203A | 7.88 | 4.5 | negative: state text on cards | pass |
| dark | `--negative-ink` #FF95B1 | `--negative-soft` #3A1220 | 7.91 | 4.5 | negative: state text on its tint | pass |
| dark | `--foreground` #F1F4F9 | `--negative-soft` #3A1220 | 14.80 | 4.5 | negative: body text on its tint | pass |
| dark | `--negative-foreground` #22040D | `--negative` #FF7C9E | 7.91 | 4.5 | negative: text on solid fill | pass |
| dark | `--negative` #FF7C9E | `--background` #0B1526 | 7.51 | 3 | negative: glyph or fill edge (non-text) | pass |
| dark | `--negative` #FF7C9E | `--card` #12203A | 6.67 | 3 | negative: glyph or fill edge on cards (non-text) | pass |
| dark | `--negative` #FF7C9E | `--negative-soft` #3A1220 | 6.70 | 3 | negative: glyph on its tint (non-text) | pass |
| dark | `--caution-ink` #FFD466 | `--background` #0B1526 | 12.93 | 4.5 | caution: state text | pass |
| dark | `--caution-ink` #FFD466 | `--card` #12203A | 11.49 | 4.5 | caution: state text on cards | pass |
| dark | `--caution-ink` #FFD466 | `--caution-soft` #33290A | 10.16 | 4.5 | caution: state text on its tint | pass |
| dark | `--foreground` #F1F4F9 | `--caution-soft` #33290A | 13.03 | 4.5 | caution: body text on its tint | pass |
| dark | `--caution-foreground` #1A1300 | `--caution` #FFC83D | 11.94 | 4.5 | caution: text on solid fill | pass |
| dark | `--caution` #FFC83D | `--background` #0B1526 | 11.81 | 3 | caution: glyph or fill edge (non-text) | pass |
| dark | `--caution` #FFC83D | `--card` #12203A | 10.50 | 3 | caution: glyph or fill edge on cards (non-text) | pass |
| dark | `--caution` #FFC83D | `--caution-soft` #33290A | 9.29 | 3 | caution: glyph on its tint (non-text) | pass |
| dark | `--progress-ink` #82C0FF | `--background` #0B1526 | 9.51 | 4.5 | progress: state text | pass |
| dark | `--progress-ink` #82C0FF | `--card` #12203A | 8.45 | 4.5 | progress: state text on cards | pass |
| dark | `--progress-ink` #82C0FF | `--progress-soft` #0F2747 | 7.80 | 4.5 | progress: state text on its tint | pass |
| dark | `--foreground` #F1F4F9 | `--progress-soft` #0F2747 | 13.59 | 4.5 | progress: body text on its tint | pass |
| dark | `--progress-foreground` #04152B | `--progress` #62AEFF | 7.86 | 4.5 | progress: text on solid fill | pass |
| dark | `--progress` #62AEFF | `--background` #0B1526 | 7.85 | 3 | progress: glyph or fill edge (non-text) | pass |
| dark | `--progress` #62AEFF | `--card` #12203A | 6.97 | 3 | progress: glyph or fill edge on cards (non-text) | pass |
| dark | `--progress` #62AEFF | `--progress-soft` #0F2747 | 6.43 | 3 | progress: glyph on its tint (non-text) | pass |
| dark | `--seal-ink` #C8B5FF | `--background` #0B1526 | 10.01 | 4.5 | seal: state text | pass |
| dark | `--seal-ink` #C8B5FF | `--card` #12203A | 8.90 | 4.5 | seal: state text on cards | pass |
| dark | `--seal-ink` #C8B5FF | `--seal-soft` #241A47 | 8.76 | 4.5 | seal: state text on its tint | pass |
| dark | `--foreground` #F1F4F9 | `--seal-soft` #241A47 | 14.50 | 4.5 | seal: body text on its tint | pass |
| dark | `--seal-foreground` #160B33 | `--seal` #B9A1FF | 8.50 | 4.5 | seal: text on solid fill | pass |
| dark | `--seal` #B9A1FF | `--background` #0B1526 | 8.36 | 3 | seal: glyph or fill edge (non-text) | pass |
| dark | `--seal` #B9A1FF | `--card` #12203A | 7.43 | 3 | seal: glyph or fill edge on cards (non-text) | pass |
| dark | `--seal` #B9A1FF | `--seal-soft` #241A47 | 7.31 | 3 | seal: glyph on its tint (non-text) | pass |
| dark | `--scope-ink` #F6A8DE | `--background` #0B1526 | 10.07 | 4.5 | scope: state text | pass |
| dark | `--scope-ink` #F6A8DE | `--card` #12203A | 8.95 | 4.5 | scope: state text on cards | pass |
| dark | `--scope-ink` #F6A8DE | `--scope-soft` #3A1530 | 8.70 | 4.5 | scope: state text on its tint | pass |
| dark | `--foreground` #F1F4F9 | `--scope-soft` #3A1530 | 14.32 | 4.5 | scope: body text on its tint | pass |
| dark | `--scope-foreground` #2A0820 | `--scope` #F28FD3 | 8.36 | 4.5 | scope: text on solid fill | pass |
| dark | `--scope` #F28FD3 | `--background` #0B1526 | 8.39 | 3 | scope: glyph or fill edge (non-text) | pass |
| dark | `--scope` #F28FD3 | `--card` #12203A | 7.46 | 3 | scope: glyph or fill edge on cards (non-text) | pass |
| dark | `--scope` #F28FD3 | `--scope-soft` #3A1530 | 7.25 | 3 | scope: glyph on its tint (non-text) | pass |
| dark | `--history-ink` #D9C7B2 | `--background` #0B1526 | 11.10 | 4.5 | history: state text | pass |
| dark | `--history-ink` #D9C7B2 | `--card` #12203A | 9.87 | 4.5 | history: state text on cards | pass |
| dark | `--history-ink` #D9C7B2 | `--history-soft` #2C241B | 9.28 | 4.5 | history: state text on its tint | pass |
| dark | `--foreground` #F1F4F9 | `--history-soft` #2C241B | 13.85 | 4.5 | history: body text on its tint | pass |
| dark | `--history-foreground` #1E160D | `--history` #CDB8A0 | 9.32 | 4.5 | history: text on solid fill | pass |
| dark | `--history` #CDB8A0 | `--background` #0B1526 | 9.53 | 3 | history: glyph or fill edge (non-text) | pass |
| dark | `--history` #CDB8A0 | `--card` #12203A | 8.47 | 3 | history: glyph or fill edge on cards (non-text) | pass |
| dark | `--history` #CDB8A0 | `--history-soft` #2C241B | 7.97 | 3 | history: glyph on its tint (non-text) | pass |
| dark | `--urgent-ink` #FFA77C | `--background` #0B1526 | 9.63 | 4.5 | urgent: state text | pass |
| dark | `--urgent-ink` #FFA77C | `--card` #12203A | 8.56 | 4.5 | urgent: state text on cards | pass |
| dark | `--urgent-ink` #FFA77C | `--urgent-soft` #3D1A0B | 8.19 | 4.5 | urgent: state text on its tint | pass |
| dark | `--foreground` #F1F4F9 | `--urgent-soft` #3D1A0B | 14.10 | 4.5 | urgent: body text on its tint | pass |
| dark | `--urgent-foreground` #230D02 | `--urgent` #FF925E | 8.43 | 4.5 | urgent: text on solid fill | pass |
| dark | `--urgent` #FF925E | `--background` #0B1526 | 8.29 | 3 | urgent: glyph or fill edge (non-text) | pass |
| dark | `--urgent` #FF925E | `--card` #12203A | 7.36 | 3 | urgent: glyph or fill edge on cards (non-text) | pass |
| dark | `--urgent` #FF925E | `--urgent-soft` #3D1A0B | 7.05 | 3 | urgent: glyph on its tint (non-text) | pass |
