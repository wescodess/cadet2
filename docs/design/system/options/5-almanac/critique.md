# Critique: option 5, Almanac

Held by the orchestrator until the owner has reacted. Checked on 2026-11-17 against the brief, the UX research (sections C, D and F) and the owner’s standing taste, using the design-critique and accessibility-review skills plus an automated pass over the rendered specimen.

## Design critique

### Overall impression

Bold and specific to temporary residents: time is the hero, the phone home is a timeline with a “now” marker, and the representative queue is an agenda by next hard date. Archivo’s width axis gives one family three voices. The risk is alarm: big date blocks and a black rule are emphatic for an anxious reader.

### Usability

| Finding | Severity | Resolution |
|---|---|---|
| The 117-day permit date filled its tile with solid amber, the same weight as a red 40-day tile; for a client that over-alarms. | Moderate | Fixed: solid fills are reserved for ≤90 days; 91 to 180 days uses the amber tint with an amber base rule. |
| The phone mentioned the signed plan without its source verification date. | Moderate | Fixed: “Sources verified as of 1 Nov 2026” added to the plan line. |
| On desktop the action buttons wrapped under the state chips. | Minor | Held: harmless at 1440; set chips on their own row during the build. |
| Hatched and cross-hatched glyphs blur together at 14 px. | Minor | Held: the word is always present; the pattern is a second cue. |
| Condensed 92% width at 13 px in representative rows is at the edge of comfortable reading. | Moderate | Held: never condense below 13 px; test at 200% zoom. |
| Sorting the agenda by date hides which files are ready to review. | Moderate | Held: the views still exist in the rail; owner to judge the default sort. |

### Visual hierarchy

- First on the phone: “17 Nov” and the boxed “now” step. Correct and memorable.
- First on desktop: the red 27 in the agenda, then the case timeline. Correct for deadline triage.
- Emphasis: the hard offset shadow on overlays is strong; keep it to dialogs and toasts.

### Consistency

| Element | Observation | Recommendation |
|---|---|---|
| Shape | Everything is square at 2 px, including avatars and markers. | Keep |
| Fills | Signed is the only dark fill besides urgent; it reads as a date stamp. | Keep |

### What works well

- Dates are impossible to miss, and unknown dates are shown as unknown rather than guessed.
- Pattern glyphs give a second, colour-free channel that also survives printing and export.
- The case timeline strip shows signing, the changed fact and the expiry in one line.

### Priority recommendations

1. Tune emphasis for anxious clients: test the timeline home with temporary residents.
2. Decide the default agenda sort for representatives.
3. Keep condensed widths to tables only.

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

**Standard:** WCAG 2.2 AA. **Date:** 2026-11-17. **Method:** computed token contrast (below), plus a Playwright pass over the rendered specimen in both themes that measured every text node against its real composited background, every interactive target, keyboard focus styles on 77 controls, and reflow of the client column at 320 px.

### Summary after fixes

| Check | Result |
|---|---|
| Token pairs checked | 172 (86 light, 86 dark) |
| Token pairs failing | 0 |
| Token pairs mitigated by design | 0 |
| Lowest text pair | 5.24:1 (needs 4.5) |
| Lowest non-text pair | 3.95:1 (needs 3) |
| Rendered text below its minimum | 0 |
| Targets under 24 by 24 px | 0 |
| Primary client targets under 44 px | 0 |
| Controls without a visible focus style | 0 of 77 |
| Overflow in the client column at 320 px | 0 |

### Findings fixed in this pass

- The “Check this licence on the CICC register” link sat in a flex row at 18 to 22 px tall, below the 24 px minimum (WCAG 2.5.8). It now has a 24 px minimum height for representatives and 32 px for clients.
- Added a client “general information, not legal advice” notice for solo clients reading program information, so that copy is specified outside the representative draft as well.
- The 117-day permit date filled its tile with solid amber, the same weight as a red 40-day tile; for a client that over-alarms. Now: solid fills are reserved for ≤90 days; 91 to 180 days uses the amber tint with an amber base rule.
- The phone mentioned the signed plan without its source verification date. Now: “Sources verified as of 1 Nov 2026” added to the plan line.

### Perceivable

| # | Item | Criterion | Status |
|---|---|---|---|
| 1 | Every state pairs colour with a glyph and a written label | 1.4.1 Use of colour | Pass |
| 2 | Text contrast in both themes | 1.4.3 Contrast (minimum) | Pass, see table |
| 3 | Glyphs, input boundaries and focus rings at 3:1 | 1.4.11 Non-text contrast | Pass |
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

- Default sort for the representative agenda.
- Overall boldness for client screens.

## Contrast table

Every text and state token pair in both themes, computed with the WCAG 2.2 relative luminance formula from the token values in `index.html`.

| Theme | Foreground | Background | Ratio | Needs | Use | Result |
|---|---|---|---|---|---|---|
| light | `--foreground` #12161C | `--background` #F1F3F5 | 16.31 | 4.5 | Body text | pass |
| light | `--card-foreground` #12161C | `--card` #FFFFFF | 18.15 | 4.5 | Text on cards | pass |
| light | `--popover-foreground` #12161C | `--popover` #FFFFFF | 18.15 | 4.5 | Text in menus and dialogs | pass |
| light | `--primary-foreground` #FFFFFF | `--primary` #2335C9 | 8.66 | 4.5 | Primary button label | pass |
| light | `--secondary-foreground` #12161C | `--secondary` #E4E7EC | 14.64 | 4.5 | Secondary button label | pass |
| light | `--muted-foreground` #4A5260 | `--background` #F1F3F5 | 7.08 | 4.5 | Hints and metadata | pass |
| light | `--muted-foreground` #4A5260 | `--card` #FFFFFF | 7.87 | 4.5 | Hints on cards | pass |
| light | `--muted-foreground` #4A5260 | `--muted` #EAEDF1 | 6.71 | 4.5 | Hints on muted surfaces | pass |
| light | `--accent-foreground` #12161C | `--accent` #E3E7F8 | 14.73 | 4.5 | Hovered menu item | pass |
| light | `--destructive-foreground` #FFFFFF | `--destructive` #B0153A | 6.97 | 4.5 | Destructive button label | pass |
| light | `--destructive` #B0153A | `--background` #F1F3F5 | 6.26 | 4.5 | Error message text | pass |
| light | `--destructive` #B0153A | `--card` #FFFFFF | 6.97 | 4.5 | Error text on cards | pass |
| light | `--primary` #2335C9 | `--background` #F1F3F5 | 7.79 | 4.5 | Link text | pass |
| light | `--primary` #2335C9 | `--card` #FFFFFF | 8.66 | 4.5 | Link text on cards | pass |
| light | `--sidebar-foreground` #EEF0F3 | `--sidebar` #14181F | 15.59 | 4.5 | Navigation text | pass |
| light | `--sidebar-primary-foreground` #14181F | `--sidebar-primary` #FFFFFF | 17.79 | 4.5 | Active navigation item | pass |
| light | `--sidebar-accent-foreground` #EEF0F3 | `--sidebar-accent` #262B35 | 12.43 | 4.5 | Hovered navigation item | pass |
| light | `--input` #6E7685 | `--background` #F1F3F5 | 4.11 | 3 | Input boundary (non-text) | pass |
| light | `--input` #6E7685 | `--card` #FFFFFF | 4.57 | 3 | Input boundary on cards (non-text) | pass |
| light | `--ring` #2335C9 | `--background` #F1F3F5 | 7.79 | 3 | Focus ring (non-text) | pass |
| light | `--ring` #2335C9 | `--card` #FFFFFF | 8.66 | 3 | Focus ring on cards (non-text) | pass |
| light | `--sidebar-ring` #9AA8FF | `--sidebar` #14181F | 7.98 | 3 | Focus ring in navigation (non-text) | pass |
| light | `--positive-ink` #256A35 | `--background` #F1F3F5 | 5.92 | 4.5 | positive: state text | pass |
| light | `--positive-ink` #256A35 | `--card` #FFFFFF | 6.58 | 4.5 | positive: state text on cards | pass |
| light | `--positive-ink` #256A35 | `--positive-soft` #E4F2E6 | 5.68 | 4.5 | positive: state text on its tint | pass |
| light | `--foreground` #12161C | `--positive-soft` #E4F2E6 | 15.68 | 4.5 | positive: body text on its tint | pass |
| light | `--positive-foreground` #FFFFFF | `--positive` #2B7A3D | 5.31 | 4.5 | positive: text on solid fill | pass |
| light | `--positive` #2B7A3D | `--background` #F1F3F5 | 4.77 | 3 | positive: glyph or fill edge (non-text) | pass |
| light | `--positive` #2B7A3D | `--card` #FFFFFF | 5.31 | 3 | positive: glyph or fill edge on cards (non-text) | pass |
| light | `--positive` #2B7A3D | `--positive-soft` #E4F2E6 | 4.59 | 3 | positive: glyph on its tint (non-text) | pass |
| light | `--negative-ink` #8E265A | `--background` #F1F3F5 | 7.33 | 4.5 | negative: state text | pass |
| light | `--negative-ink` #8E265A | `--card` #FFFFFF | 8.16 | 4.5 | negative: state text on cards | pass |
| light | `--negative-ink` #8E265A | `--negative-soft` #F8E6EF | 6.82 | 4.5 | negative: state text on its tint | pass |
| light | `--foreground` #12161C | `--negative-soft` #F8E6EF | 15.17 | 4.5 | negative: body text on its tint | pass |
| light | `--negative-foreground` #FFFFFF | `--negative` #9C2A63 | 7.18 | 4.5 | negative: text on solid fill | pass |
| light | `--negative` #9C2A63 | `--background` #F1F3F5 | 6.45 | 3 | negative: glyph or fill edge (non-text) | pass |
| light | `--negative` #9C2A63 | `--card` #FFFFFF | 7.18 | 3 | negative: glyph or fill edge on cards (non-text) | pass |
| light | `--negative` #9C2A63 | `--negative-soft` #F8E6EF | 6.00 | 3 | negative: glyph on its tint (non-text) | pass |
| light | `--caution-ink` #885300 | `--background` #F1F3F5 | 5.75 | 4.5 | caution: state text | pass |
| light | `--caution-ink` #885300 | `--card` #FFFFFF | 6.39 | 4.5 | caution: state text on cards | pass |
| light | `--caution-ink` #885300 | `--caution-soft` #FCEFD6 | 5.62 | 4.5 | caution: state text on its tint | pass |
| light | `--foreground` #12161C | `--caution-soft` #FCEFD6 | 15.95 | 4.5 | caution: body text on its tint | pass |
| light | `--caution-foreground` #FFFFFF | `--caution` #9A5F00 | 5.24 | 4.5 | caution: text on solid fill | pass |
| light | `--caution` #9A5F00 | `--background` #F1F3F5 | 4.71 | 3 | caution: glyph or fill edge (non-text) | pass |
| light | `--caution` #9A5F00 | `--card` #FFFFFF | 5.24 | 3 | caution: glyph or fill edge on cards (non-text) | pass |
| light | `--caution` #9A5F00 | `--caution-soft` #FCEFD6 | 4.60 | 3 | caution: glyph on its tint (non-text) | pass |
| light | `--progress-ink` #095F6F | `--background` #F1F3F5 | 6.56 | 4.5 | progress: state text | pass |
| light | `--progress-ink` #095F6F | `--card` #FFFFFF | 7.30 | 4.5 | progress: state text on cards | pass |
| light | `--progress-ink` #095F6F | `--progress-soft` #E0F1F4 | 6.27 | 4.5 | progress: state text on its tint | pass |
| light | `--foreground` #12161C | `--progress-soft` #E0F1F4 | 15.60 | 4.5 | progress: body text on its tint | pass |
| light | `--progress-foreground` #FFFFFF | `--progress` #0B6E80 | 5.91 | 4.5 | progress: text on solid fill | pass |
| light | `--progress` #0B6E80 | `--background` #F1F3F5 | 5.31 | 3 | progress: glyph or fill edge (non-text) | pass |
| light | `--progress` #0B6E80 | `--card` #FFFFFF | 5.91 | 3 | progress: glyph or fill edge on cards (non-text) | pass |
| light | `--progress` #0B6E80 | `--progress-soft` #E0F1F4 | 5.08 | 3 | progress: glyph on its tint (non-text) | pass |
| light | `--seal-ink` #1F2A44 | `--background` #F1F3F5 | 12.82 | 4.5 | seal: state text | pass |
| light | `--seal-ink` #1F2A44 | `--card` #FFFFFF | 14.26 | 4.5 | seal: state text on cards | pass |
| light | `--seal-ink` #1F2A44 | `--seal-soft` #E6E9F0 | 11.73 | 4.5 | seal: state text on its tint | pass |
| light | `--foreground` #12161C | `--seal-soft` #E6E9F0 | 14.93 | 4.5 | seal: body text on its tint | pass |
| light | `--seal-foreground` #FFFFFF | `--seal` #1F2A44 | 14.26 | 4.5 | seal: text on solid fill | pass |
| light | `--seal` #1F2A44 | `--background` #F1F3F5 | 12.82 | 3 | seal: glyph or fill edge (non-text) | pass |
| light | `--seal` #1F2A44 | `--card` #FFFFFF | 14.26 | 3 | seal: glyph or fill edge on cards (non-text) | pass |
| light | `--seal` #1F2A44 | `--seal-soft` #E6E9F0 | 11.73 | 3 | seal: glyph on its tint (non-text) | pass |
| light | `--scope-ink` #5E3C96 | `--background` #F1F3F5 | 7.37 | 4.5 | scope: state text | pass |
| light | `--scope-ink` #5E3C96 | `--card` #FFFFFF | 8.19 | 4.5 | scope: state text on cards | pass |
| light | `--scope-ink` #5E3C96 | `--scope-soft` #EFE9F8 | 6.90 | 4.5 | scope: state text on its tint | pass |
| light | `--foreground` #12161C | `--scope-soft` #EFE9F8 | 15.28 | 4.5 | scope: body text on its tint | pass |
| light | `--scope-foreground` #FFFFFF | `--scope` #6A44A8 | 6.99 | 4.5 | scope: text on solid fill | pass |
| light | `--scope` #6A44A8 | `--background` #F1F3F5 | 6.28 | 3 | scope: glyph or fill edge (non-text) | pass |
| light | `--scope` #6A44A8 | `--card` #FFFFFF | 6.99 | 3 | scope: glyph or fill edge on cards (non-text) | pass |
| light | `--scope` #6A44A8 | `--scope-soft` #EFE9F8 | 5.88 | 3 | scope: glyph on its tint (non-text) | pass |
| light | `--history-ink` #6B4F33 | `--background` #F1F3F5 | 6.76 | 4.5 | history: state text | pass |
| light | `--history-ink` #6B4F33 | `--card` #FFFFFF | 7.52 | 4.5 | history: state text on cards | pass |
| light | `--history-ink` #6B4F33 | `--history-soft` #F3ECE4 | 6.42 | 4.5 | history: state text on its tint | pass |
| light | `--foreground` #12161C | `--history-soft` #F3ECE4 | 15.49 | 4.5 | history: body text on its tint | pass |
| light | `--history-foreground` #FFFFFF | `--history` #7A5A3A | 6.27 | 4.5 | history: text on solid fill | pass |
| light | `--history` #7A5A3A | `--background` #F1F3F5 | 5.63 | 3 | history: glyph or fill edge (non-text) | pass |
| light | `--history` #7A5A3A | `--card` #FFFFFF | 6.27 | 3 | history: glyph or fill edge on cards (non-text) | pass |
| light | `--history` #7A5A3A | `--history-soft` #F3ECE4 | 5.35 | 3 | history: glyph on its tint (non-text) | pass |
| light | `--urgent-ink` #AE1A1A | `--background` #F1F3F5 | 6.37 | 4.5 | urgent: state text | pass |
| light | `--urgent-ink` #AE1A1A | `--card` #FFFFFF | 7.09 | 4.5 | urgent: state text on cards | pass |
| light | `--urgent-ink` #AE1A1A | `--urgent-soft` #FDE6E4 | 5.95 | 4.5 | urgent: state text on its tint | pass |
| light | `--foreground` #12161C | `--urgent-soft` #FDE6E4 | 15.22 | 4.5 | urgent: body text on its tint | pass |
| light | `--urgent-foreground` #FFFFFF | `--urgent` #C81E1E | 5.74 | 4.5 | urgent: text on solid fill | pass |
| light | `--urgent` #C81E1E | `--background` #F1F3F5 | 5.16 | 3 | urgent: glyph or fill edge (non-text) | pass |
| light | `--urgent` #C81E1E | `--card` #FFFFFF | 5.74 | 3 | urgent: glyph or fill edge on cards (non-text) | pass |
| light | `--urgent` #C81E1E | `--urgent-soft` #FDE6E4 | 4.81 | 3 | urgent: glyph on its tint (non-text) | pass |
| dark | `--foreground` #ECEEF2 | `--background` #111419 | 15.89 | 4.5 | Body text | pass |
| dark | `--card-foreground` #ECEEF2 | `--card` #181C23 | 14.71 | 4.5 | Text on cards | pass |
| dark | `--popover-foreground` #ECEEF2 | `--popover` #1E232B | 13.59 | 4.5 | Text in menus and dialogs | pass |
| dark | `--primary-foreground` #111419 | `--primary` #A9B4FF | 9.37 | 4.5 | Primary button label | pass |
| dark | `--secondary-foreground` #ECEEF2 | `--secondary` #232831 | 12.74 | 4.5 | Secondary button label | pass |
| dark | `--muted-foreground` #A1A9B6 | `--background` #111419 | 7.79 | 4.5 | Hints and metadata | pass |
| dark | `--muted-foreground` #A1A9B6 | `--card` #181C23 | 7.21 | 4.5 | Hints on cards | pass |
| dark | `--muted-foreground` #A1A9B6 | `--muted` #1C2028 | 6.89 | 4.5 | Hints on muted surfaces | pass |
| dark | `--accent-foreground` #ECEEF2 | `--accent` #252B38 | 12.20 | 4.5 | Hovered menu item | pass |
| dark | `--destructive-foreground` #111419 | `--destructive` #FF8DA6 | 8.45 | 4.5 | Destructive button label | pass |
| dark | `--destructive` #FF8DA6 | `--background` #111419 | 8.45 | 4.5 | Error message text | pass |
| dark | `--destructive` #FF8DA6 | `--card` #181C23 | 7.82 | 4.5 | Error text on cards | pass |
| dark | `--primary` #A9B4FF | `--background` #111419 | 9.37 | 4.5 | Link text | pass |
| dark | `--primary` #A9B4FF | `--card` #181C23 | 8.67 | 4.5 | Link text on cards | pass |
| dark | `--sidebar-foreground` #ECEEF2 | `--sidebar` #0B0D11 | 16.74 | 4.5 | Navigation text | pass |
| dark | `--sidebar-primary-foreground` #0B0D11 | `--sidebar-primary` #ECEEF2 | 16.74 | 4.5 | Active navigation item | pass |
| dark | `--sidebar-accent-foreground` #ECEEF2 | `--sidebar-accent` #1D2129 | 13.89 | 4.5 | Hovered navigation item | pass |
| dark | `--input` #717A8A | `--background` #111419 | 4.26 | 3 | Input boundary (non-text) | pass |
| dark | `--input` #717A8A | `--card` #181C23 | 3.95 | 3 | Input boundary on cards (non-text) | pass |
| dark | `--ring` #A9B4FF | `--background` #111419 | 9.37 | 3 | Focus ring (non-text) | pass |
| dark | `--ring` #A9B4FF | `--card` #181C23 | 8.67 | 3 | Focus ring on cards (non-text) | pass |
| dark | `--sidebar-ring` #A9B4FF | `--sidebar` #0B0D11 | 9.87 | 3 | Focus ring in navigation (non-text) | pass |
| dark | `--positive-ink` #7DD290 | `--background` #111419 | 10.10 | 4.5 | positive: state text | pass |
| dark | `--positive-ink` #7DD290 | `--card` #181C23 | 9.35 | 4.5 | positive: state text on cards | pass |
| dark | `--positive-ink` #7DD290 | `--positive-soft` #15291A | 8.43 | 4.5 | positive: state text on its tint | pass |
| dark | `--foreground` #ECEEF2 | `--positive-soft` #15291A | 13.25 | 4.5 | positive: body text on its tint | pass |
| dark | `--positive-foreground` #0A1A0E | `--positive` #6BCB80 | 8.98 | 4.5 | positive: text on solid fill | pass |
| dark | `--positive` #6BCB80 | `--background` #111419 | 9.21 | 3 | positive: glyph or fill edge (non-text) | pass |
| dark | `--positive` #6BCB80 | `--card` #181C23 | 8.53 | 3 | positive: glyph or fill edge on cards (non-text) | pass |
| dark | `--positive` #6BCB80 | `--positive-soft` #15291A | 7.68 | 3 | positive: glyph on its tint (non-text) | pass |
| dark | `--negative-ink` #F4A1CB | `--background` #111419 | 9.50 | 4.5 | negative: state text | pass |
| dark | `--negative-ink` #F4A1CB | `--card` #181C23 | 8.79 | 4.5 | negative: state text on cards | pass |
| dark | `--negative-ink` #F4A1CB | `--negative-soft` #36162A | 8.28 | 4.5 | negative: state text on its tint | pass |
| dark | `--foreground` #ECEEF2 | `--negative-soft` #36162A | 13.85 | 4.5 | negative: body text on its tint | pass |
| dark | `--negative-foreground` #27081A | `--negative` #F08BBE | 8.05 | 4.5 | negative: text on solid fill | pass |
| dark | `--negative` #F08BBE | `--background` #111419 | 8.03 | 3 | negative: glyph or fill edge (non-text) | pass |
| dark | `--negative` #F08BBE | `--card` #181C23 | 7.44 | 3 | negative: glyph or fill edge on cards (non-text) | pass |
| dark | `--negative` #F08BBE | `--negative-soft` #36162A | 7.00 | 3 | negative: glyph on its tint (non-text) | pass |
| dark | `--caution-ink` #F5C068 | `--background` #111419 | 11.09 | 4.5 | caution: state text | pass |
| dark | `--caution-ink` #F5C068 | `--card` #181C23 | 10.27 | 4.5 | caution: state text on cards | pass |
| dark | `--caution-ink` #F5C068 | `--caution-soft` #30250F | 9.03 | 4.5 | caution: state text on its tint | pass |
| dark | `--foreground` #ECEEF2 | `--caution-soft` #30250F | 12.94 | 4.5 | caution: body text on its tint | pass |
| dark | `--caution-foreground` #1D1404 | `--caution` #F2B44E | 9.89 | 4.5 | caution: text on solid fill | pass |
| dark | `--caution` #F2B44E | `--background` #111419 | 10.03 | 3 | caution: glyph or fill edge (non-text) | pass |
| dark | `--caution` #F2B44E | `--card` #181C23 | 9.29 | 3 | caution: glyph or fill edge on cards (non-text) | pass |
| dark | `--caution` #F2B44E | `--caution-soft` #30250F | 8.17 | 3 | caution: glyph on its tint (non-text) | pass |
| dark | `--progress-ink` #62CCDD | `--background` #111419 | 9.84 | 4.5 | progress: state text | pass |
| dark | `--progress-ink` #62CCDD | `--card` #181C23 | 9.11 | 4.5 | progress: state text on cards | pass |
| dark | `--progress-ink` #62CCDD | `--progress-soft` #0E2A30 | 8.04 | 4.5 | progress: state text on its tint | pass |
| dark | `--foreground` #ECEEF2 | `--progress-soft` #0E2A30 | 12.98 | 4.5 | progress: body text on its tint | pass |
| dark | `--progress-foreground` #04191D | `--progress` #4FC3D6 | 8.70 | 4.5 | progress: text on solid fill | pass |
| dark | `--progress` #4FC3D6 | `--background` #111419 | 8.88 | 3 | progress: glyph or fill edge (non-text) | pass |
| dark | `--progress` #4FC3D6 | `--card` #181C23 | 8.22 | 3 | progress: glyph or fill edge on cards (non-text) | pass |
| dark | `--progress` #4FC3D6 | `--progress-soft` #0E2A30 | 7.26 | 3 | progress: glyph on its tint (non-text) | pass |
| dark | `--seal-ink` #D3DBF1 | `--background` #111419 | 13.33 | 4.5 | seal: state text | pass |
| dark | `--seal-ink` #D3DBF1 | `--card` #181C23 | 12.34 | 4.5 | seal: state text on cards | pass |
| dark | `--seal-ink` #D3DBF1 | `--seal-soft` #222A3D | 10.35 | 4.5 | seal: state text on its tint | pass |
| dark | `--foreground` #ECEEF2 | `--seal-soft` #222A3D | 12.33 | 4.5 | seal: body text on its tint | pass |
| dark | `--seal-foreground` #141A2A | `--seal` #C9D3EE | 11.59 | 4.5 | seal: text on solid fill | pass |
| dark | `--seal` #C9D3EE | `--background` #111419 | 12.33 | 3 | seal: glyph or fill edge (non-text) | pass |
| dark | `--seal` #C9D3EE | `--card` #181C23 | 11.42 | 3 | seal: glyph or fill edge on cards (non-text) | pass |
| dark | `--seal` #C9D3EE | `--seal-soft` #222A3D | 9.57 | 3 | seal: glyph on its tint (non-text) | pass |
| dark | `--scope-ink` #C6B1F3 | `--background` #111419 | 9.65 | 4.5 | scope: state text | pass |
| dark | `--scope-ink` #C6B1F3 | `--card` #181C23 | 8.94 | 4.5 | scope: state text on cards | pass |
| dark | `--scope-ink` #C6B1F3 | `--scope-soft` #271E3E | 8.19 | 4.5 | scope: state text on its tint | pass |
| dark | `--foreground` #ECEEF2 | `--scope-soft` #271E3E | 13.48 | 4.5 | scope: body text on its tint | pass |
| dark | `--scope-foreground` #1A0F33 | `--scope` #B9A0F0 | 8.06 | 4.5 | scope: text on solid fill | pass |
| dark | `--scope` #B9A0F0 | `--background` #111419 | 8.22 | 3 | scope: glyph or fill edge (non-text) | pass |
| dark | `--scope` #B9A0F0 | `--card` #181C23 | 7.61 | 3 | scope: glyph or fill edge on cards (non-text) | pass |
| dark | `--scope` #B9A0F0 | `--scope-soft` #271E3E | 6.97 | 3 | scope: glyph on its tint (non-text) | pass |
| dark | `--history-ink` #DAC0A5 | `--background` #111419 | 10.60 | 4.5 | history: state text | pass |
| dark | `--history-ink` #DAC0A5 | `--card` #181C23 | 9.81 | 4.5 | history: state text on cards | pass |
| dark | `--history-ink` #DAC0A5 | `--history-soft` #2C241C | 8.77 | 4.5 | history: state text on its tint | pass |
| dark | `--foreground` #ECEEF2 | `--history-soft` #2C241C | 13.14 | 4.5 | history: body text on its tint | pass |
| dark | `--history-foreground` #1F160D | `--history` #D1B394 | 8.98 | 4.5 | history: text on solid fill | pass |
| dark | `--history` #D1B394 | `--background` #111419 | 9.30 | 3 | history: glyph or fill edge (non-text) | pass |
| dark | `--history` #D1B394 | `--card` #181C23 | 8.61 | 3 | history: glyph or fill edge on cards (non-text) | pass |
| dark | `--history` #D1B394 | `--history-soft` #2C241C | 7.69 | 3 | history: glyph on its tint (non-text) | pass |
| dark | `--urgent-ink` #FF958C | `--background` #111419 | 8.73 | 4.5 | urgent: state text | pass |
| dark | `--urgent-ink` #FF958C | `--card` #181C23 | 8.08 | 4.5 | urgent: state text on cards | pass |
| dark | `--urgent-ink` #FF958C | `--urgent-soft` #3B1514 | 7.62 | 4.5 | urgent: state text on its tint | pass |
| dark | `--foreground` #ECEEF2 | `--urgent-soft` #3B1514 | 13.87 | 4.5 | urgent: body text on its tint | pass |
| dark | `--urgent-foreground` #260606 | `--urgent` #FF7D73 | 7.59 | 4.5 | urgent: text on solid fill | pass |
| dark | `--urgent` #FF7D73 | `--background` #111419 | 7.41 | 3 | urgent: glyph or fill edge (non-text) | pass |
| dark | `--urgent` #FF7D73 | `--card` #181C23 | 6.86 | 3 | urgent: glyph or fill edge on cards (non-text) | pass |
| dark | `--urgent` #FF7D73 | `--urgent-soft` #3B1514 | 6.47 | 3 | urgent: glyph on its tint (non-text) | pass |
