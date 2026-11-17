# Critique: option 4, Companion

Held by the orchestrator until the owner has reacted. Checked on 2026-11-17 against the brief, the UX research (sections C, D and F) and the owner’s standing taste, using the design-critique and accessibility-review skills plus an automated pass over the rendered specimen.

## Design critique

### Overall impression

The warmest option and the best answer to the client’s constant question, “am I waiting, or do I owe something?”. The whose-turn colour logic is genuinely new. The cost is professional density: rounded, shadowed rows feel consumer-grade for a representative working forty files a day.

### Usability

| Finding | Severity | Resolution |
|---|---|---|
| Two large tinted cards came first on the phone, pushing the permit expiry below the fold; the research puts the next action and the real deadline first. | Moderate | Fixed: dates now follow the “your turn” card; the representative’s card moves below them. |
| The year on date tiles was dimmed to 4.2:1. | Major | Fixed: full-strength ink (passes). |
| Overlapping client and representative avatars hid part of the client’s initials. | Minor | Fixed: overlap reduced from 12 px to 6 px. |
| Phone screens referenced the signed plan without the “verified as of” line. | Moderate | Fixed: the representative’s card states the signer, licence, date and source verification date. |
| Representative rows are tall cards with shadows (about 120 px each); about six files per screen. | Moderate | Held for owner reaction: a flat list setting for representatives would keep the colour logic and gain density. |
| Pill buttons and soft shadows may read as consumer software to lawyers. | Minor | Held: a tone question for the owner. |

### Visual hierarchy

- First on the phone: the marigold “your turn” card and its pill button. Correct.
- First on desktop: the paired avatars and client name, then “your turn to review”. Correct and distinctive.
- Emphasis: the urgent chip is the only filled chip in the queue. Correct.

### Consistency

| Element | Observation | Recommendation |
|---|---|---|
| Radius | Radius scales with surface size (999 controls, 16 and 22 px cards). | Keep |
| Turn colours | Intake and clarification share marigold because both are the client’s turn; this differs from the other four options by design. | Keep; documented in the states section |

### What works well

- “Whose turn” is a colour logic people can learn in one screen.
- Readex Pro is open and even at 17 px, with a path to Arabic and other scripts.
- Tinted shadows give warmth without grey haze in dark mode.

### Priority recommendations

1. Decide whether representatives get a flatter, denser list setting.
2. Test whose-turn colours with clients who are colour-blind (the disc icons carry the meaning, but verify).
3. Keep the signed plan visually authoritative inside a soft system.

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
| Lowest text pair | 5.25:1 (needs 4.5) |
| Lowest non-text pair | 3.57:1 (needs 3) |
| Rendered text below its minimum | 0 |
| Targets under 24 by 24 px | 0 |
| Primary client targets under 44 px | 0 |
| Controls without a visible focus style | 0 of 77 |
| Overflow in the client column at 320 px | 0 |

### Findings fixed in this pass

- The “Check this licence on the CICC register” link sat in a flex row at 18 to 22 px tall, below the 24 px minimum (WCAG 2.5.8). It now has a 24 px minimum height for representatives and 32 px for clients.
- Added a client “general information, not legal advice” notice for solo clients reading program information, so that copy is specified outside the representative draft as well.
- Two large tinted cards came first on the phone, pushing the permit expiry below the fold; the research puts the next action and the real deadline first. Now: dates now follow the “your turn” card; the representative’s card moves below them.
- The year on date tiles was dimmed to 4.2:1. Now: full-strength ink (passes).
- Overlapping client and representative avatars hid part of the client’s initials. Now: overlap reduced from 12 px to 6 px.
- Phone screens referenced the signed plan without the “verified as of” line. Now: the representative’s card states the signer, licence, date and source verification date.

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

- Representative density.
- Whether the soft tone suits practices that pay for the product.

## Contrast table

Every text and state token pair in both themes, computed with the WCAG 2.2 relative luminance formula from the token values in `index.html`.

| Theme | Foreground | Background | Ratio | Needs | Use | Result |
|---|---|---|---|---|---|---|
| light | `--foreground` #17231F | `--background` #F3F6F4 | 14.88 | 4.5 | Body text | pass |
| light | `--card-foreground` #17231F | `--card` #FFFFFF | 16.20 | 4.5 | Text on cards | pass |
| light | `--popover-foreground` #17231F | `--popover` #FFFFFF | 16.20 | 4.5 | Text in menus and dialogs | pass |
| light | `--primary-foreground` #FFFFFF | `--primary` #1E5A48 | 8.04 | 4.5 | Primary button label | pass |
| light | `--secondary-foreground` #17231F | `--secondary` #E3ECE7 | 13.43 | 4.5 | Secondary button label | pass |
| light | `--muted-foreground` #4C5B55 | `--background` #F3F6F4 | 6.58 | 4.5 | Hints and metadata | pass |
| light | `--muted-foreground` #4C5B55 | `--card` #FFFFFF | 7.16 | 4.5 | Hints on cards | pass |
| light | `--muted-foreground` #4C5B55 | `--muted` #EAF0ED | 6.20 | 4.5 | Hints on muted surfaces | pass |
| light | `--accent-foreground` #17231F | `--accent` #DFEBE5 | 13.23 | 4.5 | Hovered menu item | pass |
| light | `--destructive-foreground` #FFFFFF | `--destructive` #A3305A | 6.71 | 4.5 | Destructive button label | pass |
| light | `--destructive` #A3305A | `--background` #F3F6F4 | 6.17 | 4.5 | Error message text | pass |
| light | `--destructive` #A3305A | `--card` #FFFFFF | 6.71 | 4.5 | Error text on cards | pass |
| light | `--primary` #1E5A48 | `--background` #F3F6F4 | 7.39 | 4.5 | Link text | pass |
| light | `--primary` #1E5A48 | `--card` #FFFFFF | 8.04 | 4.5 | Link text on cards | pass |
| light | `--sidebar-foreground` #17231F | `--sidebar` #E6EEEA | 13.71 | 4.5 | Navigation text | pass |
| light | `--sidebar-primary-foreground` #FFFFFF | `--sidebar-primary` #1E5A48 | 8.04 | 4.5 | Active navigation item | pass |
| light | `--sidebar-accent-foreground` #17231F | `--sidebar-accent` #D9E6DF | 12.60 | 4.5 | Hovered navigation item | pass |
| light | `--input` #75857E | `--background` #F3F6F4 | 3.57 | 3 | Input boundary (non-text) | pass |
| light | `--input` #75857E | `--card` #FFFFFF | 3.88 | 3 | Input boundary on cards (non-text) | pass |
| light | `--ring` #1F6FB2 | `--background` #F3F6F4 | 4.86 | 3 | Focus ring (non-text) | pass |
| light | `--ring` #1F6FB2 | `--card` #FFFFFF | 5.28 | 3 | Focus ring on cards (non-text) | pass |
| light | `--sidebar-ring` #1F6FB2 | `--sidebar` #E6EEEA | 4.47 | 3 | Focus ring in navigation (non-text) | pass |
| light | `--positive-ink` #276B42 | `--background` #F3F6F4 | 5.91 | 4.5 | positive: state text | pass |
| light | `--positive-ink` #276B42 | `--card` #FFFFFF | 6.43 | 4.5 | positive: state text on cards | pass |
| light | `--positive-ink` #276B42 | `--positive-soft` #E3F2E8 | 5.55 | 4.5 | positive: state text on its tint | pass |
| light | `--foreground` #17231F | `--positive-soft` #E3F2E8 | 13.98 | 4.5 | positive: body text on its tint | pass |
| light | `--positive-foreground` #FFFFFF | `--positive` #2D7A4B | 5.25 | 4.5 | positive: text on solid fill | pass |
| light | `--positive` #2D7A4B | `--background` #F3F6F4 | 4.83 | 3 | positive: glyph or fill edge (non-text) | pass |
| light | `--positive` #2D7A4B | `--card` #FFFFFF | 5.25 | 3 | positive: glyph or fill edge on cards (non-text) | pass |
| light | `--positive` #2D7A4B | `--positive-soft` #E3F2E8 | 4.54 | 3 | positive: glyph on its tint (non-text) | pass |
| light | `--negative-ink` #962C53 | `--background` #F3F6F4 | 6.94 | 4.5 | negative: state text | pass |
| light | `--negative-ink` #962C53 | `--card` #FFFFFF | 7.55 | 4.5 | negative: state text on cards | pass |
| light | `--negative-ink` #962C53 | `--negative-soft` #FAE6EE | 6.33 | 4.5 | negative: state text on its tint | pass |
| light | `--foreground` #17231F | `--negative-soft` #FAE6EE | 13.59 | 4.5 | negative: body text on its tint | pass |
| light | `--negative-foreground` #FFFFFF | `--negative` #A3305A | 6.71 | 4.5 | negative: text on solid fill | pass |
| light | `--negative` #A3305A | `--background` #F3F6F4 | 6.17 | 3 | negative: glyph or fill edge (non-text) | pass |
| light | `--negative` #A3305A | `--card` #FFFFFF | 6.71 | 3 | negative: glyph or fill edge on cards (non-text) | pass |
| light | `--negative` #A3305A | `--negative-soft` #FAE6EE | 5.63 | 3 | negative: glyph on its tint (non-text) | pass |
| light | `--caution-ink` #835407 | `--background` #F3F6F4 | 5.96 | 4.5 | caution: state text | pass |
| light | `--caution-ink` #835407 | `--card` #FFFFFF | 6.49 | 4.5 | caution: state text on cards | pass |
| light | `--caution-ink` #835407 | `--caution-soft` #FCF0DA | 5.75 | 4.5 | caution: state text on its tint | pass |
| light | `--foreground` #17231F | `--caution-soft` #FCF0DA | 14.36 | 4.5 | caution: body text on its tint | pass |
| light | `--caution-foreground` #FFFFFF | `--caution` #94600A | 5.33 | 4.5 | caution: text on solid fill | pass |
| light | `--caution` #94600A | `--background` #F3F6F4 | 4.90 | 3 | caution: glyph or fill edge (non-text) | pass |
| light | `--caution` #94600A | `--card` #FFFFFF | 5.33 | 3 | caution: glyph or fill edge on cards (non-text) | pass |
| light | `--caution` #94600A | `--caution-soft` #FCF0DA | 4.73 | 3 | caution: glyph on its tint (non-text) | pass |
| light | `--progress-ink` #1F5D8F | `--background` #F3F6F4 | 6.39 | 4.5 | progress: state text | pass |
| light | `--progress-ink` #1F5D8F | `--card` #FFFFFF | 6.95 | 4.5 | progress: state text on cards | pass |
| light | `--progress-ink` #1F5D8F | `--progress-soft` #E4EFF8 | 5.96 | 4.5 | progress: state text on its tint | pass |
| light | `--foreground` #17231F | `--progress-soft` #E4EFF8 | 13.88 | 4.5 | progress: body text on its tint | pass |
| light | `--progress-foreground` #FFFFFF | `--progress` #24689F | 5.91 | 4.5 | progress: text on solid fill | pass |
| light | `--progress` #24689F | `--background` #F3F6F4 | 5.43 | 3 | progress: glyph or fill edge (non-text) | pass |
| light | `--progress` #24689F | `--card` #FFFFFF | 5.91 | 3 | progress: glyph or fill edge on cards (non-text) | pass |
| light | `--progress` #24689F | `--progress-soft` #E4EFF8 | 5.06 | 3 | progress: glyph on its tint (non-text) | pass |
| light | `--seal-ink` #364089 | `--background` #F3F6F4 | 8.57 | 4.5 | seal: state text | pass |
| light | `--seal-ink` #364089 | `--card` #FFFFFF | 9.33 | 4.5 | seal: state text on cards | pass |
| light | `--seal-ink` #364089 | `--seal-soft` #E9EBF7 | 7.86 | 4.5 | seal: state text on its tint | pass |
| light | `--foreground` #17231F | `--seal-soft` #E9EBF7 | 13.64 | 4.5 | seal: body text on its tint | pass |
| light | `--seal-foreground` #FFFFFF | `--seal` #3D4796 | 8.27 | 4.5 | seal: text on solid fill | pass |
| light | `--seal` #3D4796 | `--background` #F3F6F4 | 7.60 | 3 | seal: glyph or fill edge (non-text) | pass |
| light | `--seal` #3D4796 | `--card` #FFFFFF | 8.27 | 3 | seal: glyph or fill edge on cards (non-text) | pass |
| light | `--seal` #3D4796 | `--seal-soft` #E9EBF7 | 6.96 | 3 | seal: glyph on its tint (non-text) | pass |
| light | `--scope-ink` #7C356F | `--background` #F3F6F4 | 7.43 | 4.5 | scope: state text | pass |
| light | `--scope-ink` #7C356F | `--card` #FFFFFF | 8.09 | 4.5 | scope: state text on cards | pass |
| light | `--scope-ink` #7C356F | `--scope-soft` #F6E8F2 | 6.84 | 4.5 | scope: state text on its tint | pass |
| light | `--foreground` #17231F | `--scope-soft` #F6E8F2 | 13.68 | 4.5 | scope: body text on its tint | pass |
| light | `--scope-foreground` #FFFFFF | `--scope` #8A3B7C | 7.01 | 4.5 | scope: text on solid fill | pass |
| light | `--scope` #8A3B7C | `--background` #F3F6F4 | 6.44 | 3 | scope: glyph or fill edge (non-text) | pass |
| light | `--scope` #8A3B7C | `--card` #FFFFFF | 7.01 | 3 | scope: glyph or fill edge on cards (non-text) | pass |
| light | `--scope` #8A3B7C | `--scope-soft` #F6E8F2 | 5.92 | 3 | scope: glyph on its tint (non-text) | pass |
| light | `--history-ink` #6B5746 | `--background` #F3F6F4 | 6.27 | 4.5 | history: state text | pass |
| light | `--history-ink` #6B5746 | `--card` #FFFFFF | 6.83 | 4.5 | history: state text on cards | pass |
| light | `--history-ink` #6B5746 | `--history-soft` #F1ECE6 | 5.81 | 4.5 | history: state text on its tint | pass |
| light | `--foreground` #17231F | `--history-soft` #F1ECE6 | 13.79 | 4.5 | history: body text on its tint | pass |
| light | `--history-foreground` #FFFFFF | `--history` #7A6450 | 5.58 | 4.5 | history: text on solid fill | pass |
| light | `--history` #7A6450 | `--background` #F3F6F4 | 5.12 | 3 | history: glyph or fill edge (non-text) | pass |
| light | `--history` #7A6450 | `--card` #FFFFFF | 5.58 | 3 | history: glyph or fill edge on cards (non-text) | pass |
| light | `--history` #7A6450 | `--history-soft` #F1ECE6 | 4.75 | 3 | history: glyph on its tint (non-text) | pass |
| light | `--urgent-ink` #A5320D | `--background` #F3F6F4 | 6.30 | 4.5 | urgent: state text | pass |
| light | `--urgent-ink` #A5320D | `--card` #FFFFFF | 6.86 | 4.5 | urgent: state text on cards | pass |
| light | `--urgent-ink` #A5320D | `--urgent-soft` #FDEBE3 | 5.93 | 4.5 | urgent: state text on its tint | pass |
| light | `--foreground` #17231F | `--urgent-soft` #FDEBE3 | 14.01 | 4.5 | urgent: body text on its tint | pass |
| light | `--urgent-foreground` #FFFFFF | `--urgent` #BF3A0F | 5.49 | 4.5 | urgent: text on solid fill | pass |
| light | `--urgent` #BF3A0F | `--background` #F3F6F4 | 5.04 | 3 | urgent: glyph or fill edge (non-text) | pass |
| light | `--urgent` #BF3A0F | `--card` #FFFFFF | 5.49 | 3 | urgent: glyph or fill edge on cards (non-text) | pass |
| light | `--urgent` #BF3A0F | `--urgent-soft` #FDEBE3 | 4.75 | 3 | urgent: glyph on its tint (non-text) | pass |
| dark | `--foreground` #E6EEEA | `--background` #121A17 | 15.00 | 4.5 | Body text | pass |
| dark | `--card-foreground` #E6EEEA | `--card` #18221E | 13.82 | 4.5 | Text on cards | pass |
| dark | `--popover-foreground` #E6EEEA | `--popover` #1E2A25 | 12.58 | 4.5 | Text in menus and dialogs | pass |
| dark | `--primary-foreground` #0E1714 | `--primary` #8FD3B4 | 10.55 | 4.5 | Primary button label | pass |
| dark | `--secondary-foreground` #E6EEEA | `--secondary` #22302A | 11.67 | 4.5 | Secondary button label | pass |
| dark | `--muted-foreground` #A3B3AC | `--background` #121A17 | 8.10 | 4.5 | Hints and metadata | pass |
| dark | `--muted-foreground` #A3B3AC | `--card` #18221E | 7.46 | 4.5 | Hints on cards | pass |
| dark | `--muted-foreground` #A3B3AC | `--muted` #1B2621 | 7.13 | 4.5 | Hints on muted surfaces | pass |
| dark | `--accent-foreground` #E6EEEA | `--accent` #24332C | 11.22 | 4.5 | Hovered menu item | pass |
| dark | `--destructive-foreground` #0E1714 | `--destructive` #F48FB1 | 8.17 | 4.5 | Destructive button label | pass |
| dark | `--destructive` #F48FB1 | `--background` #121A17 | 7.94 | 4.5 | Error message text | pass |
| dark | `--destructive` #F48FB1 | `--card` #18221E | 7.32 | 4.5 | Error text on cards | pass |
| dark | `--primary` #8FD3B4 | `--background` #121A17 | 10.24 | 4.5 | Link text | pass |
| dark | `--primary` #8FD3B4 | `--card` #18221E | 9.44 | 4.5 | Link text on cards | pass |
| dark | `--sidebar-foreground` #E6EEEA | `--sidebar` #16201C | 14.14 | 4.5 | Navigation text | pass |
| dark | `--sidebar-primary-foreground` #0E1714 | `--sidebar-primary` #8FD3B4 | 10.55 | 4.5 | Active navigation item | pass |
| dark | `--sidebar-accent-foreground` #E6EEEA | `--sidebar-accent` #22302A | 11.67 | 4.5 | Hovered navigation item | pass |
| dark | `--input` #6E8079 | `--background` #121A17 | 4.24 | 3 | Input boundary (non-text) | pass |
| dark | `--input` #6E8079 | `--card` #18221E | 3.91 | 3 | Input boundary on cards (non-text) | pass |
| dark | `--ring` #7DB8EA | `--background` #121A17 | 8.36 | 3 | Focus ring (non-text) | pass |
| dark | `--ring` #7DB8EA | `--card` #18221E | 7.71 | 3 | Focus ring on cards (non-text) | pass |
| dark | `--sidebar-ring` #7DB8EA | `--sidebar` #16201C | 7.89 | 3 | Focus ring in navigation (non-text) | pass |
| dark | `--positive-ink` #7DD3A0 | `--background` #121A17 | 9.86 | 4.5 | positive: state text | pass |
| dark | `--positive-ink` #7DD3A0 | `--card` #18221E | 9.09 | 4.5 | positive: state text on cards | pass |
| dark | `--positive-ink` #7DD3A0 | `--positive-soft` #15291E | 8.55 | 4.5 | positive: state text on its tint | pass |
| dark | `--foreground` #E6EEEA | `--positive-soft` #15291E | 13.00 | 4.5 | positive: body text on its tint | pass |
| dark | `--positive-foreground` #0B1A11 | `--positive` #6CCB92 | 9.05 | 4.5 | positive: text on solid fill | pass |
| dark | `--positive` #6CCB92 | `--background` #121A17 | 8.93 | 3 | positive: glyph or fill edge (non-text) | pass |
| dark | `--positive` #6CCB92 | `--card` #18221E | 8.24 | 3 | positive: glyph or fill edge on cards (non-text) | pass |
| dark | `--positive` #6CCB92 | `--positive-soft` #15291E | 7.75 | 3 | positive: glyph on its tint (non-text) | pass |
| dark | `--negative-ink` #F7A3BF | `--background` #121A17 | 9.23 | 4.5 | negative: state text | pass |
| dark | `--negative-ink` #F7A3BF | `--card` #18221E | 8.51 | 4.5 | negative: state text on cards | pass |
| dark | `--negative-ink` #F7A3BF | `--negative-soft` #38172A | 8.27 | 4.5 | negative: state text on its tint | pass |
| dark | `--foreground` #E6EEEA | `--negative-soft` #38172A | 13.43 | 4.5 | negative: body text on its tint | pass |
| dark | `--negative-foreground` #24070F | `--negative` #F48FB1 | 8.46 | 4.5 | negative: text on solid fill | pass |
| dark | `--negative` #F48FB1 | `--background` #121A17 | 7.94 | 3 | negative: glyph or fill edge (non-text) | pass |
| dark | `--negative` #F48FB1 | `--card` #18221E | 7.32 | 3 | negative: glyph or fill edge on cards (non-text) | pass |
| dark | `--negative` #F48FB1 | `--negative-soft` #38172A | 7.11 | 3 | negative: glyph on its tint (non-text) | pass |
| dark | `--caution-ink` #F5C46E | `--background` #121A17 | 10.97 | 4.5 | caution: state text | pass |
| dark | `--caution-ink` #F5C46E | `--card` #18221E | 10.11 | 4.5 | caution: state text on cards | pass |
| dark | `--caution-ink` #F5C46E | `--caution-soft` #30260F | 9.22 | 4.5 | caution: state text on its tint | pass |
| dark | `--foreground` #E6EEEA | `--caution-soft` #30260F | 12.61 | 4.5 | caution: body text on its tint | pass |
| dark | `--caution-foreground` #1D1404 | `--caution` #F2B856 | 10.20 | 4.5 | caution: text on solid fill | pass |
| dark | `--caution` #F2B856 | `--background` #121A17 | 9.92 | 3 | caution: glyph or fill edge (non-text) | pass |
| dark | `--caution` #F2B856 | `--card` #18221E | 9.15 | 3 | caution: glyph or fill edge on cards (non-text) | pass |
| dark | `--caution` #F2B856 | `--caution-soft` #30260F | 8.35 | 3 | caution: glyph on its tint (non-text) | pass |
| dark | `--progress-ink` #87C1F0 | `--background` #121A17 | 9.21 | 4.5 | progress: state text | pass |
| dark | `--progress-ink` #87C1F0 | `--card` #18221E | 8.49 | 4.5 | progress: state text on cards | pass |
| dark | `--progress-ink` #87C1F0 | `--progress-soft` #132B3E | 7.57 | 4.5 | progress: state text on its tint | pass |
| dark | `--foreground` #E6EEEA | `--progress-soft` #132B3E | 12.33 | 4.5 | progress: body text on its tint | pass |
| dark | `--progress-foreground` #071724 | `--progress` #73B5EB | 8.24 | 4.5 | progress: text on solid fill | pass |
| dark | `--progress` #73B5EB | `--background` #121A17 | 8.04 | 3 | progress: glyph or fill edge (non-text) | pass |
| dark | `--progress` #73B5EB | `--card` #18221E | 7.41 | 3 | progress: glyph or fill edge on cards (non-text) | pass |
| dark | `--progress` #73B5EB | `--progress-soft` #132B3E | 6.61 | 3 | progress: glyph on its tint (non-text) | pass |
| dark | `--seal-ink` #B5BCF7 | `--background` #121A17 | 9.70 | 4.5 | seal: state text | pass |
| dark | `--seal-ink` #B5BCF7 | `--card` #18221E | 8.94 | 4.5 | seal: state text on cards | pass |
| dark | `--seal-ink` #B5BCF7 | `--seal-soft` #1F2346 | 8.29 | 4.5 | seal: state text on its tint | pass |
| dark | `--foreground` #E6EEEA | `--seal-soft` #1F2346 | 12.82 | 4.5 | seal: body text on its tint | pass |
| dark | `--seal-foreground` #0F1336 | `--seal` #A6AEF5 | 8.57 | 4.5 | seal: text on solid fill | pass |
| dark | `--seal` #A6AEF5 | `--background` #121A17 | 8.43 | 3 | seal: glyph or fill edge (non-text) | pass |
| dark | `--seal` #A6AEF5 | `--card` #18221E | 7.77 | 3 | seal: glyph or fill edge on cards (non-text) | pass |
| dark | `--seal` #A6AEF5 | `--seal-soft` #1F2346 | 7.21 | 3 | seal: glyph on its tint (non-text) | pass |
| dark | `--scope-ink` #EBAEDD | `--background` #121A17 | 9.81 | 4.5 | scope: state text | pass |
| dark | `--scope-ink` #EBAEDD | `--card` #18221E | 9.04 | 4.5 | scope: state text on cards | pass |
| dark | `--scope-ink` #EBAEDD | `--scope-soft` #351831 | 8.77 | 4.5 | scope: state text on its tint | pass |
| dark | `--foreground` #E6EEEA | `--scope-soft` #351831 | 13.41 | 4.5 | scope: body text on its tint | pass |
| dark | `--scope-foreground` #280A21 | `--scope` #E59AD4 | 8.57 | 4.5 | scope: text on solid fill | pass |
| dark | `--scope` #E59AD4 | `--background` #121A17 | 8.35 | 3 | scope: glyph or fill edge (non-text) | pass |
| dark | `--scope` #E59AD4 | `--card` #18221E | 7.70 | 3 | scope: glyph or fill edge on cards (non-text) | pass |
| dark | `--scope` #E59AD4 | `--scope-soft` #351831 | 7.47 | 3 | scope: glyph on its tint (non-text) | pass |
| dark | `--history-ink` #D7C2AD | `--background` #121A17 | 10.30 | 4.5 | history: state text | pass |
| dark | `--history-ink` #D7C2AD | `--card` #18221E | 9.49 | 4.5 | history: state text on cards | pass |
| dark | `--history-ink` #D7C2AD | `--history-soft` #2B241D | 8.89 | 4.5 | history: state text on its tint | pass |
| dark | `--foreground` #E6EEEA | `--history-soft` #2B241D | 12.95 | 4.5 | history: body text on its tint | pass |
| dark | `--history-foreground` #1D150D | `--history` #CDB59D | 9.18 | 4.5 | history: text on solid fill | pass |
| dark | `--history` #CDB59D | `--background` #121A17 | 9.02 | 3 | history: glyph or fill edge (non-text) | pass |
| dark | `--history` #CDB59D | `--card` #18221E | 8.31 | 3 | history: glyph or fill edge on cards (non-text) | pass |
| dark | `--history` #CDB59D | `--history-soft` #2B241D | 7.79 | 3 | history: glyph on its tint (non-text) | pass |
| dark | `--urgent-ink` #FFA680 | `--background` #121A17 | 9.29 | 4.5 | urgent: state text | pass |
| dark | `--urgent-ink` #FFA680 | `--card` #18221E | 8.57 | 4.5 | urgent: state text on cards | pass |
| dark | `--urgent-ink` #FFA680 | `--urgent-soft` #3B1C10 | 8.10 | 4.5 | urgent: state text on its tint | pass |
| dark | `--foreground` #E6EEEA | `--urgent-soft` #3B1C10 | 13.08 | 4.5 | urgent: body text on its tint | pass |
| dark | `--urgent-foreground` #260D03 | `--urgent` #FF9469 | 8.49 | 4.5 | urgent: text on solid fill | pass |
| dark | `--urgent` #FF9469 | `--background` #121A17 | 8.17 | 3 | urgent: glyph or fill edge (non-text) | pass |
| dark | `--urgent` #FF9469 | `--card` #18221E | 7.53 | 3 | urgent: glyph or fill edge on cards (non-text) | pass |
| dark | `--urgent` #FF9469 | `--urgent-soft` #3B1C10 | 7.13 | 3 | urgent: glyph on its tint (non-text) | pass |
