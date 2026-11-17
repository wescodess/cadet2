# Critique: option 1, Margin

Held by the orchestrator until the owner has reacted. Checked on 2026-11-17 against the brief, the UX research (sections C, D and F) and the owner’s standing taste, using the design-critique and accessibility-review skills plus an automated pass over the rendered specimen.

## Design critique

### Overall impression

Calm, literate and trustworthy. It reads like a letter from a careful professional, which suits the product’s core promise: a plan a named representative signs. The biggest opportunity is density in the representative portal, where serif draft text and ruled findings make the review pane long.

### Usability

| Finding | Severity | Resolution |
|---|---|---|
| State labels were underlined in their ink colour, so in queue rows they read as links (an underline is the web’s strongest link signal). | Moderate | Fixed: the underline is now a highlighter swipe in the state tint. Seal keeps a solid rule because a signature line is its metaphor. |
| The signed-plan header lacked the typographic signature block the option is built around (CSS existed, markup did not). | Moderate | Fixed: the header now opens with the representative’s name over a signature rule, hidden from screen readers because the sentence below repeats it. |
| On the phone the greeting and practice name take about 90 px before the next step. | Minor | Held: acceptable for a letter-like opening; trim the greeting if the owner wants the next step higher. |
| Review pane is about 1,340 px tall at 1440 wide; a representative scrolls to reach the last finding. | Moderate | Held for owner reaction: a compact draft setting (14 px serif, 12 px rule padding) would bring it near one screen. |
| Serif body text at 18 px for readers working in a second language. | Minor | Held: Literata is designed for screen reading and has wide script coverage; validate with second-language readers before committing. |

### Visual hierarchy

- First on the phone: the greeting, then the boxed next step with the only solid button. Correct enough; the step could come first.
- First on desktop: the client name in Literata, then the three actions. Correct.
- Emphasis: the urgent stamp is the only filled colour, so it wins every row it appears in. Correct.

### Consistency

| Element | Observation | Recommendation |
|---|---|---|
| Chips | Highlighter chips differ from every container in the system, which is intended: marks are written on the record. | Keep |
| Radius | Controls 4 px, sheets 0; the dialog and toast use 4 px. Consistent. | Keep |

### What works well

- The reviewer’s marks (tick, cross, query, caret, strike, signature) are a vocabulary nobody else uses and they read in greyscale.
- The margin column for coverage marks in the draft assessment makes four programs scannable in one glance.
- Dark theme keeps the ink-on-paper feel without going to near-black.

### Priority recommendations

1. Decide whether the representative portal needs a compact draft setting.
2. Test serif body copy with second-language readers on phones.
3. Confirm the signature treatment cannot be mistaken for a captured handwritten signature; it is set type, and the sentence states the facts.

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

**Standard:** WCAG 2.2 AA. **Date:** 2026-11-17. **Method:** computed token contrast (below), plus a Playwright pass over the rendered specimen in both themes that measured every text node against its real composited background, every interactive target, keyboard focus styles on 79 controls, and reflow of the client column at 320 px.

### Summary after fixes

| Check | Result |
|---|---|
| Token pairs checked | 172 (86 light, 86 dark) |
| Token pairs failing | 0 |
| Token pairs mitigated by design | 0 |
| Lowest text pair | 5.67:1 (needs 4.5) |
| Lowest non-text pair | 3.43:1 (needs 3) |
| Rendered text below its minimum | 0 |
| Targets under 24 by 24 px | 0 |
| Primary client targets under 44 px | 0 |
| Controls without a visible focus style | 0 of 79 |
| Overflow in the client column at 320 px | 0 |

### Findings fixed in this pass

- The “Check this licence on the CICC register” link sat in a flex row at 18 to 22 px tall, below the 24 px minimum (WCAG 2.5.8). It now has a 24 px minimum height for representatives and 32 px for clients.
- Added a client “general information, not legal advice” notice for solo clients reading program information, so that copy is specified outside the representative draft as well.
- State labels were underlined in their ink colour, so in queue rows they read as links (an underline is the web’s strongest link signal). Now: the underline is now a highlighter swipe in the state tint. Seal keeps a solid rule because a signature line is its metaphor.
- The signed-plan header lacked the typographic signature block the option is built around (CSS existed, markup did not). Now: the header now opens with the representative’s name over a signature rule, hidden from screen readers because the sentence below repeats it.

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

- A compact draft-reading setting for representatives.
- Whether the greeting stays above the next step on the phone.

## Contrast table

Every text and state token pair in both themes, computed with the WCAG 2.2 relative luminance formula from the token values in `index.html`.

| Theme | Foreground | Background | Ratio | Needs | Use | Result |
|---|---|---|---|---|---|---|
| light | `--foreground` #161C28 | `--background` #F3F4F6 | 15.50 | 4.5 | Body text | pass |
| light | `--card-foreground` #161C28 | `--card` #FFFFFF | 17.06 | 4.5 | Text on cards | pass |
| light | `--popover-foreground` #161C28 | `--popover` #FFFFFF | 17.06 | 4.5 | Text in menus and dialogs | pass |
| light | `--primary-foreground` #FFFFFF | `--primary` #1F2B47 | 14.05 | 4.5 | Primary button label | pass |
| light | `--secondary-foreground` #161C28 | `--secondary` #E6E9EE | 14.02 | 4.5 | Secondary button label | pass |
| light | `--muted-foreground` #4D5666 | `--background` #F3F4F6 | 6.72 | 4.5 | Hints and metadata | pass |
| light | `--muted-foreground` #4D5666 | `--card` #FFFFFF | 7.40 | 4.5 | Hints on cards | pass |
| light | `--muted-foreground` #4D5666 | `--muted` #ECEEF2 | 6.37 | 4.5 | Hints on muted surfaces | pass |
| light | `--accent-foreground` #161C28 | `--accent` #E4E8F0 | 13.89 | 4.5 | Hovered menu item | pass |
| light | `--destructive-foreground` #FFFFFF | `--destructive` #A3243B | 7.31 | 4.5 | Destructive button label | pass |
| light | `--destructive` #A3243B | `--background` #F3F4F6 | 6.64 | 4.5 | Error message text | pass |
| light | `--destructive` #A3243B | `--card` #FFFFFF | 7.31 | 4.5 | Error text on cards | pass |
| light | `--primary` #1F2B47 | `--background` #F3F4F6 | 12.77 | 4.5 | Link text | pass |
| light | `--primary` #1F2B47 | `--card` #FFFFFF | 14.05 | 4.5 | Link text on cards | pass |
| light | `--sidebar-foreground` #161C28 | `--sidebar` #ECEEF2 | 14.69 | 4.5 | Navigation text | pass |
| light | `--sidebar-primary-foreground` #FFFFFF | `--sidebar-primary` #1F2B47 | 14.05 | 4.5 | Active navigation item | pass |
| light | `--sidebar-accent-foreground` #161C28 | `--sidebar-accent` #E0E4EB | 13.38 | 4.5 | Hovered navigation item | pass |
| light | `--input` #7B8494 | `--background` #F3F4F6 | 3.43 | 3 | Input boundary (non-text) | pass |
| light | `--input` #7B8494 | `--card` #FFFFFF | 3.77 | 3 | Input boundary on cards (non-text) | pass |
| light | `--ring` #2B4CC0 | `--background` #F3F4F6 | 6.59 | 3 | Focus ring (non-text) | pass |
| light | `--ring` #2B4CC0 | `--card` #FFFFFF | 7.25 | 3 | Focus ring on cards (non-text) | pass |
| light | `--sidebar-ring` #2B4CC0 | `--sidebar` #ECEEF2 | 6.24 | 3 | Focus ring in navigation (non-text) | pass |
| light | `--positive-ink` #1A5F39 | `--background` #F3F4F6 | 6.96 | 4.5 | positive: state text | pass |
| light | `--positive-ink` #1A5F39 | `--card` #FFFFFF | 7.66 | 4.5 | positive: state text on cards | pass |
| light | `--positive-ink` #1A5F39 | `--positive-soft` #E4F1E8 | 6.59 | 4.5 | positive: state text on its tint | pass |
| light | `--foreground` #161C28 | `--positive-soft` #E4F1E8 | 14.66 | 4.5 | positive: body text on its tint | pass |
| light | `--positive-foreground` #FFFFFF | `--positive` #1D6B40 | 6.50 | 4.5 | positive: text on solid fill | pass |
| light | `--positive` #1D6B40 | `--background` #F3F4F6 | 5.91 | 3 | positive: glyph or fill edge (non-text) | pass |
| light | `--positive` #1D6B40 | `--card` #FFFFFF | 6.50 | 3 | positive: glyph or fill edge on cards (non-text) | pass |
| light | `--positive` #1D6B40 | `--positive-soft` #E4F1E8 | 5.59 | 3 | positive: glyph on its tint (non-text) | pass |
| light | `--negative-ink` #93203A | `--background` #F3F4F6 | 7.61 | 4.5 | negative: state text | pass |
| light | `--negative-ink` #93203A | `--card` #FFFFFF | 8.37 | 4.5 | negative: state text on cards | pass |
| light | `--negative-ink` #93203A | `--negative-soft` #F9E5E8 | 6.94 | 4.5 | negative: state text on its tint | pass |
| light | `--foreground` #161C28 | `--negative-soft` #F9E5E8 | 14.14 | 4.5 | negative: body text on its tint | pass |
| light | `--negative-foreground` #FFFFFF | `--negative` #A3243B | 7.31 | 4.5 | negative: text on solid fill | pass |
| light | `--negative` #A3243B | `--background` #F3F4F6 | 6.64 | 3 | negative: glyph or fill edge (non-text) | pass |
| light | `--negative` #A3243B | `--card` #FFFFFF | 7.31 | 3 | negative: glyph or fill edge on cards (non-text) | pass |
| light | `--negative` #A3243B | `--negative-soft` #F9E5E8 | 6.06 | 3 | negative: glyph on its tint (non-text) | pass |
| light | `--caution-ink` #7A4E00 | `--background` #F3F4F6 | 6.54 | 4.5 | caution: state text | pass |
| light | `--caution-ink` #7A4E00 | `--card` #FFFFFF | 7.20 | 4.5 | caution: state text on cards | pass |
| light | `--caution-ink` #7A4E00 | `--caution-soft` #FAEFD6 | 6.30 | 4.5 | caution: state text on its tint | pass |
| light | `--foreground` #161C28 | `--caution-soft` #FAEFD6 | 14.93 | 4.5 | caution: body text on its tint | pass |
| light | `--caution-foreground` #FFFFFF | `--caution` #8A5800 | 6.04 | 4.5 | caution: text on solid fill | pass |
| light | `--caution` #8A5800 | `--background` #F3F4F6 | 5.49 | 3 | caution: glyph or fill edge (non-text) | pass |
| light | `--caution` #8A5800 | `--card` #FFFFFF | 6.04 | 3 | caution: glyph or fill edge on cards (non-text) | pass |
| light | `--caution` #8A5800 | `--caution-soft` #FAEFD6 | 5.29 | 3 | caution: glyph on its tint (non-text) | pass |
| light | `--progress-ink` #0B5566 | `--background` #F3F4F6 | 7.62 | 4.5 | progress: state text | pass |
| light | `--progress-ink` #0B5566 | `--card` #FFFFFF | 8.38 | 4.5 | progress: state text on cards | pass |
| light | `--progress-ink` #0B5566 | `--progress-soft` #E0EFF2 | 7.10 | 4.5 | progress: state text on its tint | pass |
| light | `--foreground` #161C28 | `--progress-soft` #E0EFF2 | 14.46 | 4.5 | progress: body text on its tint | pass |
| light | `--progress-foreground` #FFFFFF | `--progress` #0D6175 | 7.04 | 4.5 | progress: text on solid fill | pass |
| light | `--progress` #0D6175 | `--background` #F3F4F6 | 6.40 | 3 | progress: glyph or fill edge (non-text) | pass |
| light | `--progress` #0D6175 | `--card` #FFFFFF | 7.04 | 3 | progress: glyph or fill edge on cards (non-text) | pass |
| light | `--progress` #0D6175 | `--progress-soft` #E0EFF2 | 5.96 | 3 | progress: glyph on its tint (non-text) | pass |
| light | `--seal-ink` #253C96 | `--background` #F3F4F6 | 8.81 | 4.5 | seal: state text | pass |
| light | `--seal-ink` #253C96 | `--card` #FFFFFF | 9.70 | 4.5 | seal: state text on cards | pass |
| light | `--seal-ink` #253C96 | `--seal-soft` #E8ECF9 | 8.22 | 4.5 | seal: state text on its tint | pass |
| light | `--foreground` #161C28 | `--seal-soft` #E8ECF9 | 14.46 | 4.5 | seal: body text on its tint | pass |
| light | `--seal-foreground` #FFFFFF | `--seal` #2B44A8 | 8.42 | 4.5 | seal: text on solid fill | pass |
| light | `--seal` #2B44A8 | `--background` #F3F4F6 | 7.65 | 3 | seal: glyph or fill edge (non-text) | pass |
| light | `--seal` #2B44A8 | `--card` #FFFFFF | 8.42 | 3 | seal: glyph or fill edge on cards (non-text) | pass |
| light | `--seal` #2B44A8 | `--seal-soft` #E8ECF9 | 7.13 | 3 | seal: glyph on its tint (non-text) | pass |
| light | `--scope-ink` #5F378C | `--background` #F3F4F6 | 7.91 | 4.5 | scope: state text | pass |
| light | `--scope-ink` #5F378C | `--card` #FFFFFF | 8.71 | 4.5 | scope: state text on cards | pass |
| light | `--scope-ink` #5F378C | `--scope-soft` #F0EAF7 | 7.39 | 4.5 | scope: state text on its tint | pass |
| light | `--foreground` #161C28 | `--scope-soft` #F0EAF7 | 14.48 | 4.5 | scope: body text on its tint | pass |
| light | `--scope-foreground` #FFFFFF | `--scope` #6B3F9C | 7.46 | 4.5 | scope: text on solid fill | pass |
| light | `--scope` #6B3F9C | `--background` #F3F4F6 | 6.78 | 3 | scope: glyph or fill edge (non-text) | pass |
| light | `--scope` #6B3F9C | `--card` #FFFFFF | 7.46 | 3 | scope: glyph or fill edge on cards (non-text) | pass |
| light | `--scope` #6B3F9C | `--scope-soft` #F0EAF7 | 6.33 | 3 | scope: glyph on its tint (non-text) | pass |
| light | `--history-ink` #5F4C3B | `--background` #F3F4F6 | 7.39 | 4.5 | history: state text | pass |
| light | `--history-ink` #5F4C3B | `--card` #FFFFFF | 8.13 | 4.5 | history: state text on cards | pass |
| light | `--history-ink` #5F4C3B | `--history-soft` #F0ECE6 | 6.91 | 4.5 | history: state text on its tint | pass |
| light | `--foreground` #161C28 | `--history-soft` #F0ECE6 | 14.50 | 4.5 | history: body text on its tint | pass |
| light | `--history-foreground` #FFFFFF | `--history` #6D5845 | 6.70 | 4.5 | history: text on solid fill | pass |
| light | `--history` #6D5845 | `--background` #F3F4F6 | 6.09 | 3 | history: glyph or fill edge (non-text) | pass |
| light | `--history` #6D5845 | `--card` #FFFFFF | 6.70 | 3 | history: glyph or fill edge on cards (non-text) | pass |
| light | `--history` #6D5845 | `--history-soft` #F0ECE6 | 5.70 | 3 | history: glyph on its tint (non-text) | pass |
| light | `--urgent-ink` #9A370B | `--background` #F3F4F6 | 6.52 | 4.5 | urgent: state text | pass |
| light | `--urgent-ink` #9A370B | `--card` #FFFFFF | 7.18 | 4.5 | urgent: state text on cards | pass |
| light | `--urgent-ink` #9A370B | `--urgent-soft` #FCEBE2 | 6.19 | 4.5 | urgent: state text on its tint | pass |
| light | `--foreground` #161C28 | `--urgent-soft` #FCEBE2 | 14.72 | 4.5 | urgent: body text on its tint | pass |
| light | `--urgent-foreground` #FFFFFF | `--urgent` #B4410E | 5.67 | 4.5 | urgent: text on solid fill | pass |
| light | `--urgent` #B4410E | `--background` #F3F4F6 | 5.15 | 3 | urgent: glyph or fill edge (non-text) | pass |
| light | `--urgent` #B4410E | `--card` #FFFFFF | 5.67 | 3 | urgent: glyph or fill edge on cards (non-text) | pass |
| light | `--urgent` #B4410E | `--urgent-soft` #FCEBE2 | 4.89 | 3 | urgent: glyph on its tint (non-text) | pass |
| dark | `--foreground` #E6E9EF | `--background` #11151D | 15.03 | 4.5 | Body text | pass |
| dark | `--card-foreground` #E6E9EF | `--card` #181D27 | 13.88 | 4.5 | Text on cards | pass |
| dark | `--popover-foreground` #E6E9EF | `--popover` #1D2330 | 12.93 | 4.5 | Text in menus and dialogs | pass |
| dark | `--primary-foreground` #11151D | `--primary` #D5DCEC | 13.30 | 4.5 | Primary button label | pass |
| dark | `--secondary-foreground` #E6E9EF | `--secondary` #252C3A | 11.51 | 4.5 | Secondary button label | pass |
| dark | `--muted-foreground` #A2AAB8 | `--background` #11151D | 7.82 | 4.5 | Hints and metadata | pass |
| dark | `--muted-foreground` #A2AAB8 | `--card` #181D27 | 7.22 | 4.5 | Hints on cards | pass |
| dark | `--muted-foreground` #A2AAB8 | `--muted` #1F2531 | 6.57 | 4.5 | Hints on muted surfaces | pass |
| dark | `--accent-foreground` #E6E9EF | `--accent` #262E3E | 11.19 | 4.5 | Hovered menu item | pass |
| dark | `--destructive-foreground` #11151D | `--destructive` #F28B9E | 7.80 | 4.5 | Destructive button label | pass |
| dark | `--destructive` #F28B9E | `--background` #11151D | 7.80 | 4.5 | Error message text | pass |
| dark | `--destructive` #F28B9E | `--card` #181D27 | 7.21 | 4.5 | Error text on cards | pass |
| dark | `--primary` #D5DCEC | `--background` #11151D | 13.30 | 4.5 | Link text | pass |
| dark | `--primary` #D5DCEC | `--card` #181D27 | 12.28 | 4.5 | Link text on cards | pass |
| dark | `--sidebar-foreground` #E6E9EF | `--sidebar` #151A23 | 14.34 | 4.5 | Navigation text | pass |
| dark | `--sidebar-primary-foreground` #11151D | `--sidebar-primary` #D5DCEC | 13.30 | 4.5 | Active navigation item | pass |
| dark | `--sidebar-accent-foreground` #E6E9EF | `--sidebar-accent` #232A38 | 11.83 | 4.5 | Hovered navigation item | pass |
| dark | `--input` #737D90 | `--background` #11151D | 4.41 | 3 | Input boundary (non-text) | pass |
| dark | `--input` #737D90 | `--card` #181D27 | 4.07 | 3 | Input boundary on cards (non-text) | pass |
| dark | `--ring` #8EA8FF | `--background` #11151D | 8.00 | 3 | Focus ring (non-text) | pass |
| dark | `--ring` #8EA8FF | `--card` #181D27 | 7.39 | 3 | Focus ring on cards (non-text) | pass |
| dark | `--sidebar-ring` #8EA8FF | `--sidebar` #151A23 | 7.64 | 3 | Focus ring in navigation (non-text) | pass |
| dark | `--positive-ink` #7FD0A0 | `--background` #11151D | 9.95 | 4.5 | positive: state text | pass |
| dark | `--positive-ink` #7FD0A0 | `--card` #181D27 | 9.19 | 4.5 | positive: state text on cards | pass |
| dark | `--positive-ink` #7FD0A0 | `--positive-soft` #142A1D | 8.29 | 4.5 | positive: state text on its tint | pass |
| dark | `--foreground` #E6E9EF | `--positive-soft` #142A1D | 12.52 | 4.5 | positive: body text on its tint | pass |
| dark | `--positive-foreground` #0C1A12 | `--positive` #74C996 | 8.99 | 4.5 | positive: text on solid fill | pass |
| dark | `--positive` #74C996 | `--background` #11151D | 9.17 | 3 | positive: glyph or fill edge (non-text) | pass |
| dark | `--positive` #74C996 | `--card` #181D27 | 8.47 | 3 | positive: glyph or fill edge on cards (non-text) | pass |
| dark | `--positive` #74C996 | `--positive-soft` #142A1D | 7.64 | 3 | positive: glyph on its tint (non-text) | pass |
| dark | `--negative-ink` #F59AAB | `--background` #11151D | 8.79 | 4.5 | negative: state text | pass |
| dark | `--negative-ink` #F59AAB | `--card` #181D27 | 8.11 | 4.5 | negative: state text on cards | pass |
| dark | `--negative-ink` #F59AAB | `--negative-soft` #33161D | 7.93 | 4.5 | negative: state text on its tint | pass |
| dark | `--foreground` #E6E9EF | `--negative-soft` #33161D | 13.56 | 4.5 | negative: body text on its tint | pass |
| dark | `--negative-foreground` #1E0B10 | `--negative` #F28B9E | 8.07 | 4.5 | negative: text on solid fill | pass |
| dark | `--negative` #F28B9E | `--background` #11151D | 7.80 | 3 | negative: glyph or fill edge (non-text) | pass |
| dark | `--negative` #F28B9E | `--card` #181D27 | 7.21 | 3 | negative: glyph or fill edge on cards (non-text) | pass |
| dark | `--negative` #F28B9E | `--negative-soft` #33161D | 7.04 | 3 | negative: glyph on its tint (non-text) | pass |
| dark | `--caution-ink` #EDBB5C | `--background` #11151D | 10.33 | 4.5 | caution: state text | pass |
| dark | `--caution-ink` #EDBB5C | `--card` #181D27 | 9.54 | 4.5 | caution: state text on cards | pass |
| dark | `--caution-ink` #EDBB5C | `--caution-soft` #2E2410 | 8.62 | 4.5 | caution: state text on its tint | pass |
| dark | `--foreground` #E6E9EF | `--caution-soft` #2E2410 | 12.55 | 4.5 | caution: body text on its tint | pass |
| dark | `--caution-foreground` #1C1405 | `--caution` #E5B04C | 9.24 | 4.5 | caution: text on solid fill | pass |
| dark | `--caution` #E5B04C | `--background` #11151D | 9.27 | 3 | caution: glyph or fill edge (non-text) | pass |
| dark | `--caution` #E5B04C | `--card` #181D27 | 8.56 | 3 | caution: glyph or fill edge on cards (non-text) | pass |
| dark | `--caution` #E5B04C | `--caution-soft` #2E2410 | 7.74 | 3 | caution: glyph on its tint (non-text) | pass |
| dark | `--progress-ink` #6FCADC | `--background` #11151D | 9.71 | 4.5 | progress: state text | pass |
| dark | `--progress-ink` #6FCADC | `--card` #181D27 | 8.97 | 4.5 | progress: state text on cards | pass |
| dark | `--progress-ink` #6FCADC | `--progress-soft` #0F2930 | 8.08 | 4.5 | progress: state text on its tint | pass |
| dark | `--foreground` #E6E9EF | `--progress-soft` #0F2930 | 12.51 | 4.5 | progress: body text on its tint | pass |
| dark | `--progress-foreground` #06191E | `--progress` #5FC0D3 | 8.55 | 4.5 | progress: text on solid fill | pass |
| dark | `--progress` #5FC0D3 | `--background` #11151D | 8.68 | 3 | progress: glyph or fill edge (non-text) | pass |
| dark | `--progress` #5FC0D3 | `--card` #181D27 | 8.01 | 3 | progress: glyph or fill edge on cards (non-text) | pass |
| dark | `--progress` #5FC0D3 | `--progress-soft` #0F2930 | 7.22 | 3 | progress: glyph on its tint (non-text) | pass |
| dark | `--seal-ink` #AEBFFA | `--background` #11151D | 10.13 | 4.5 | seal: state text | pass |
| dark | `--seal-ink` #AEBFFA | `--card` #181D27 | 9.35 | 4.5 | seal: state text on cards | pass |
| dark | `--seal-ink` #AEBFFA | `--seal-soft` #1A2342 | 8.53 | 4.5 | seal: state text on its tint | pass |
| dark | `--foreground` #E6E9EF | `--seal-soft` #1A2342 | 12.67 | 4.5 | seal: body text on its tint | pass |
| dark | `--seal-foreground` #0E1430 | `--seal` #9FB2F7 | 8.77 | 4.5 | seal: text on solid fill | pass |
| dark | `--seal` #9FB2F7 | `--background` #11151D | 8.87 | 3 | seal: glyph or fill edge (non-text) | pass |
| dark | `--seal` #9FB2F7 | `--card` #181D27 | 8.19 | 3 | seal: glyph or fill edge on cards (non-text) | pass |
| dark | `--seal` #9FB2F7 | `--seal-soft` #1A2342 | 7.47 | 3 | seal: glyph on its tint (non-text) | pass |
| dark | `--scope-ink` #CFB2F2 | `--background` #11151D | 9.84 | 4.5 | scope: state text | pass |
| dark | `--scope-ink` #CFB2F2 | `--card` #181D27 | 9.09 | 4.5 | scope: state text on cards | pass |
| dark | `--scope-ink` #CFB2F2 | `--scope-soft` #271D3A | 8.54 | 4.5 | scope: state text on its tint | pass |
| dark | `--foreground` #E6E9EF | `--scope-soft` #271D3A | 13.05 | 4.5 | scope: body text on its tint | pass |
| dark | `--scope-foreground` #170F22 | `--scope` #C6A6EE | 8.95 | 4.5 | scope: text on solid fill | pass |
| dark | `--scope` #C6A6EE | `--background` #11151D | 8.78 | 3 | scope: glyph or fill edge (non-text) | pass |
| dark | `--scope` #C6A6EE | `--card` #181D27 | 8.11 | 3 | scope: glyph or fill edge on cards (non-text) | pass |
| dark | `--scope` #C6A6EE | `--scope-soft` #271D3A | 7.63 | 3 | scope: glyph on its tint (non-text) | pass |
| dark | `--history-ink` #D3BFAB | `--background` #11151D | 10.28 | 4.5 | history: state text | pass |
| dark | `--history-ink` #D3BFAB | `--card` #181D27 | 9.49 | 4.5 | history: state text on cards | pass |
| dark | `--history-ink` #D3BFAB | `--history-soft` #28221C | 8.84 | 4.5 | history: state text on its tint | pass |
| dark | `--foreground` #E6E9EF | `--history-soft` #28221C | 12.93 | 4.5 | history: body text on its tint | pass |
| dark | `--history-foreground` #17120D | `--history` #C9B49F | 9.31 | 4.5 | history: text on solid fill | pass |
| dark | `--history` #C9B49F | `--background` #11151D | 9.15 | 3 | history: glyph or fill edge (non-text) | pass |
| dark | `--history` #C9B49F | `--card` #181D27 | 8.45 | 3 | history: glyph or fill edge on cards (non-text) | pass |
| dark | `--history` #C9B49F | `--history-soft` #28221C | 7.87 | 3 | history: glyph on its tint (non-text) | pass |
| dark | `--urgent-ink` #FFA67C | `--background` #11151D | 9.57 | 4.5 | urgent: state text | pass |
| dark | `--urgent-ink` #FFA67C | `--card` #181D27 | 8.84 | 4.5 | urgent: state text on cards | pass |
| dark | `--urgent-ink` #FFA67C | `--urgent-soft` #3A1D10 | 8.07 | 4.5 | urgent: state text on its tint | pass |
| dark | `--foreground` #E6E9EF | `--urgent-soft` #3A1D10 | 12.67 | 4.5 | urgent: body text on its tint | pass |
| dark | `--urgent-foreground` #1E0C04 | `--urgent` #FF9B6E | 9.16 | 4.5 | urgent: text on solid fill | pass |
| dark | `--urgent` #FF9B6E | `--background` #11151D | 8.85 | 3 | urgent: glyph or fill edge (non-text) | pass |
| dark | `--urgent` #FF9B6E | `--card` #181D27 | 8.17 | 3 | urgent: glyph or fill edge on cards (non-text) | pass |
| dark | `--urgent` #FF9B6E | `--urgent-soft` #3A1D10 | 7.46 | 3 | urgent: glyph on its tint (non-text) | pass |
