# Critique: round 2, variation 2, Relay

Checked on 2026-11-17 against the round-2 brief (Console with Companion’s whose-turn colours on the client side), the round-1 Console and Companion critiques, the settled destination and the owner’s standing taste (colour must keep carrying meaning). Method: the design-critique and accessibility-review skills applied to the rendered specimen, plus an automated Playwright pass and a computed contrast audit. Findings marked “Held” keep the variation’s identity and are left for the owner.

## Design critique

### Overall impression

The most systematic variation. Whose turn becomes a rule both portals share: the client always sees both turns in the turn bar, and every row in either portal ends in its holder. It keeps Console’s look and, measured, its density. The cost is more colour per screen, held in check only by the holder sitting in its own column.

### Usability

| Finding | Severity | Resolution |
|---|---|---|
| Console’s dark-theme progress colour and focus ring were the same value (#7AA2FF), and in light theme they were near neighbours. Once blue means “the representative’s turn”, a focused control could read as a turn. | Major | Fixed: progress is lake blue (#1F6496 light, #5FB3E3 dark); the focus ring keeps Console’s ultramarine. |
| “Intake underway” and “Supplied” were blue (progress), so a row that is the client’s turn could carry a blue chip beside an amber turn marker. | Moderate | Fixed: both states map to caution (amber). The glyphs and words are unchanged. |
| A date with nothing to do (passport) was blue, which would read as “Priya’s turn”. | Moderate | Fixed: it uses positive (green) with a calendar-check icon. |
| Icon wells on client rows were grey, the start of the grey drift the round-1 critique warned about. | Moderate | Fixed: each well takes its state tint. |
| The task badge on the tab bar used progress blue for a count of the client’s own tasks. | Minor | Fixed: amber, the client’s turn. |
| The home said “Your turn” twice: in the turn bar and as the next-step heading 80 px below. | Minor | Fixed: the heading is “Your next step” again. |
| In the queue, “Unassigned” broke mid-word in a 60 px holder column. | Major | Fixed: the column is 72 px and words break only at spaces. |
| The IELTS date row said “Priya will confirm it” beside a “You” holder. | Moderate | Fixed: “Date unknown until you send a new copy”. |
| The review footer repeated “passes the turn” and wrapped, making the review pane 62 px taller. | Minor | Fixed: the case header carries the explanation; the footer is back to “Ask client”. |
| A queue row can carry four colours: the work glyph, chips, an urgent date and the holder. | Moderate | Held: the holder sits in its own right-hand column so it scans as a column. Row height is unchanged (84 px on average, the same as Console). |
| “Your turn” is amber on the client’s screen and blue on the representative’s, because colour belongs to the actor. | Minor | Held: on the representative side the label always names the actor (“Client”, “You”), so the words never disagree with the colour. |
| The ECA report’s holder is amber (“You, later”) for something the client cannot do yet. | Minor | Held: it is honest about who acts next, and the copy says “later”. |
| With long French strings at 320 px the turn bar grows to about 110 px. | Minor | Held: nothing overflows. If the bar is sticky in the build, reserve its height (see Operable). |

### Visual hierarchy

- First on the phone: the turn bar, amber half first, then the next step. Correct: the answer to “whose turn?” comes before the task.
- First on desktop: unchanged reading order; the case header adds “Your turn: review and sign version 3” in blue.
- Emphasis: the holder column is the only new colour in the queue and it is right-aligned, so names and states still lead.

### Consistency

| Element | Observation | Recommendation |
|---|---|---|
| Holder | One component in both portals: disc plus word. | Keep |
| Views | “Ready to review” and “Awaiting client” are renamed by turn and use the same discs as the holder. | Keep |
| Turn colours | Aliases of existing roles; no new colour values. | Keep |

### What works well

- One colour rule a client and their representative share, so “amber” means the same thing in a support call.
- Next actor in the queue at no density cost.
- The turn bar shows what you owe and what Priya is doing side by side, which is usually the truth.
- Colour cannot drift to grey without breaking a visible rule: every row needs a holder.

### Priority recommendations

1. Validate the holder column with representatives: it may make the “Awaiting client” view less necessary.
2. Decide whether the turn bar is sticky on scroll.
3. Watch colour count per row as more states are added; the holder must stay in its own column.

## Brief and guardrail check

| Constraint | Result |
|---|---|
| No scores, percentages, approval chances, rankings, confidence badges or “fastest route” | Pass. The only “score” in the copy is the client’s IELTS test scores; no percentage appears in product copy. |
| No government identity marks | Pass. No flag, maple leaf or GC look-alike; canada.ca appears only as a cited source. |
| “Not legal advice” on drafts and general results | Pass. Draft assessment notice (representative) and general information notice (client). The signed plan is the representative’s advice and is not labelled “not legal advice”. |
| “Verified as of” wherever a result appears | Pass. Provenance rows, the draft notice, the signed-plan header and the phone’s plan section. |
| Signed-plan header: name, designation, licence, date, version, CICC verify link | Pass. Component in both portals; the phone repeats signer, licence, date and verification date. |
| “Representative”, never “agent” | Pass. Zero occurrences of “agent”. |
| Long names and translated strings | Pass. Oluwaseun Adébáyọ̀-Fitzgerald, Nguyễn Thị Minh Khai and Siobhán Ní Bhriain wrap without truncating any state; phones at 320 px with French turn labels overflow nowhere. |
| One token architecture | Pass. Standard shadcn-vue variables, the eight state roles with four tokens each, the client and representative expression tokens, and four turn aliases that point at existing roles. |

## Accessibility review (WCAG 2.2 AA)

**Standard:** WCAG 2.2 AA. **Date:** 2026-11-17. **Method:** computed token contrast for light, dark (table below), plus a Playwright pass over the rendered specimen that measured every text node against its real composited background (both phone screens and the desk in both themes, the component sheets, the states and the turn section), every interactive target, focus styles on 154 controls, and reflow of the client column at 320 px.

### Summary after fixes

| Check | Result |
|---|---|
| Token pairs checked | 176 (88 light, 88 dark) |
| Token pairs failing | 0 |
| Lowest text pair | 5.04:1 (needs 4.5) |
| Lowest non-text pair | 3.30:1 (needs 3) |
| Rendered text below its minimum | 0 |
| Targets under 24 by 24 px | 0 |
| Primary client targets under 44 px | 0 |
| Controls without a visible focus style | 0 of 154 |
| Overflow in the client column at 320 px | 0 |

### Findings fixed in this pass

- Holder labels read as bare names to screen readers (“Priya”, “Done”). Now: each holder has a visually hidden “Whose turn:” or “Status:” prefix (WCAG 1.3.1).
- Console’s dark-theme progress colour and focus ring were the same value (#7AA2FF), and in light theme they were near neighbours. Once blue means “the representative’s turn”, a focused control could read as a turn. Now: progress is lake blue (#1F6496 light, #5FB3E3 dark); the focus ring keeps Console’s ultramarine.
- “Intake underway” and “Supplied” were blue (progress), so a row that is the client’s turn could carry a blue chip beside an amber turn marker. Now: both states map to caution (amber). The glyphs and words are unchanged.
- A date with nothing to do (passport) was blue, which would read as “Priya’s turn”. Now: it uses positive (green) with a calendar-check icon.
- Icon wells on client rows were grey, the start of the grey drift the round-1 critique warned about. Now: each well takes its state tint.
- In the queue, “Unassigned” broke mid-word in a 60 px holder column. Now: the column is 72 px and words break only at spaces.
- The IELTS date row said “Priya will confirm it” beside a “You” holder. Now: “Date unknown until you send a new copy”.

### Perceivable

| # | Item | Criterion | Status |
|---|---|---|---|
| 1 | Every state and every turn pairs colour with a glyph or disc and a written label | 1.4.1 Use of colour | Pass |
| 2 | Text contrast in both themes | 1.4.3 Contrast (minimum) | Pass, see table |
| 3 | Glyphs, discs, input boundaries and focus rings at 3:1 | 1.4.11 Non-text contrast | Pass |
| 4 | Turn sections are labelled regions; lists and tables carry structure | 1.3.1 Info and relationships | Pass |
| 5 | Client screens reflow at 320 px with long names and translated turn labels | 1.4.10 Reflow | Pass |

### Operable

| # | Item | Criterion | Status |
|---|---|---|---|
| 1 | Visible focus on every control in both themes; the focus ring is a different blue from the representative’s turn | 2.4.7 Focus visible | Pass |
| 2 | Sticky phone tab bar and turn bar must not hide focused fields | 2.4.11 Focus not obscured | Build requirement: set `scroll-padding` to their heights |
| 3 | Targets at least 24 px; primary client targets at least 44 px | 2.5.8 Target size | Pass |
| 4 | Shortcuts shown with visible button equivalents; signing needs ⌘ Enter plus a confirm dialog | 2.1.1, 2.1.4 | Pass in the specimen; enforce in the build |

### Understandable

| # | Item | Criterion | Status |
|---|---|---|---|
| 1 | Errors name the field and say how to fix it; linked error summary | 3.3.1, 3.3.3 | Pass |
| 2 | Labels and hints above every input | 3.3.2 | Pass |
| 3 | Turn labels use the same words on every screen of a portal | 3.2.4 Consistent identification | Pass |

### Robust

| # | Item | Criterion | Status |
|---|---|---|---|
| 1 | Discs and glyphs are `aria-hidden`; the turn label or chip text carries the meaning | 4.1.2 | Pass |
| 2 | Save state and toasts use `role="status"`; error summary uses `role="alert"` | 4.1.3 Status messages | Pass |
| 3 | Dialog uses `role="dialog"`, `aria-modal` and `aria-labelledby` | 4.1.2 | Pass in markup; focus trap is a build requirement |

### Not verified here

Screen reader output in a real assistive technology, keyboard traversal order in the built app, 200% zoom of the representative screen, and testing with real applicants and representatives. These belong to the surface concepts and the build.

## Open items held for the owner

- Whether representatives want the next actor in the queue.
- Whether unassigned files should show as the practice’s turn (blue) or as a distinct state.

## Contrast table

Every text and state token pair, computed with the WCAG 2.2 relative luminance formula from the token values in `index.html`. Turn colours are aliases of the state roles, so their pairs are the role pairs.

| Theme | Foreground | Background | Ratio | Needs | Use | Result |
|---|---|---|---|---|---|---|
| light | `--foreground` #16181D | `--background` #FFFFFF | 17.76 | 4.5 | Body text | pass |
| light | `--card-foreground` #16181D | `--card` #FFFFFF | 17.76 | 4.5 | Text on cards | pass |
| light | `--popover-foreground` #16181D | `--popover` #FFFFFF | 17.76 | 4.5 | Text in menus and dialogs | pass |
| light | `--primary-foreground` #FFFFFF | `--primary` #1F2329 | 15.78 | 4.5 | Primary button label | pass |
| light | `--secondary-foreground` #16181D | `--secondary` #F1F2F4 | 15.85 | 4.5 | Secondary button label | pass |
| light | `--muted-foreground` #5A606C | `--background` #FFFFFF | 6.32 | 4.5 | Hints and metadata | pass |
| light | `--muted-foreground` #5A606C | `--card` #FFFFFF | 6.32 | 4.5 | Hints on cards | pass |
| light | `--muted-foreground` #5A606C | `--muted` #F5F6F8 | 5.84 | 4.5 | Hints on muted surfaces | pass |
| light | `--accent-foreground` #16181D | `--accent` #EEF0F3 | 15.55 | 4.5 | Hovered menu item | pass |
| light | `--destructive-foreground` #FFFFFF | `--destructive` #C8233F | 5.57 | 4.5 | Destructive button label | pass |
| light | `--destructive` #C8233F | `--background` #FFFFFF | 5.57 | 4.5 | Error message text | pass |
| light | `--destructive` #C8233F | `--card` #FFFFFF | 5.57 | 4.5 | Error text on cards | pass |
| light | `--primary` #1F2329 | `--background` #FFFFFF | 15.78 | 4.5 | Link text | pass |
| light | `--primary` #1F2329 | `--card` #FFFFFF | 15.78 | 4.5 | Link text on cards | pass |
| light | `--sidebar-foreground` #16181D | `--sidebar` #F7F8FA | 16.71 | 4.5 | Navigation text | pass |
| light | `--sidebar-primary-foreground` #FFFFFF | `--sidebar-primary` #1F2329 | 15.78 | 4.5 | Active navigation item | pass |
| light | `--sidebar-accent-foreground` #16181D | `--sidebar-accent` #E9EBEF | 14.88 | 4.5 | Hovered navigation item | pass |
| light | `--input` #878E9A | `--background` #FFFFFF | 3.30 | 3 | Input boundary (non-text) | pass |
| light | `--input` #878E9A | `--card` #FFFFFF | 3.30 | 3 | Input boundary on cards (non-text) | pass |
| light | `--ring` #2F6BFF | `--background` #FFFFFF | 4.50 | 3 | Focus ring (non-text) | pass |
| light | `--ring` #2F6BFF | `--card` #FFFFFF | 4.50 | 3 | Focus ring on cards (non-text) | pass |
| light | `--sidebar-ring` #2F6BFF | `--sidebar` #F7F8FA | 4.23 | 3 | Focus ring in navigation (non-text) | pass |
| light | `--positive-ink` #17713E | `--background` #FFFFFF | 6.06 | 4.5 | positive: state text | pass |
| light | `--positive-ink` #17713E | `--card` #FFFFFF | 6.06 | 4.5 | positive: state text on cards | pass |
| light | `--positive-ink` #17713E | `--positive-soft` #E6F4EC | 5.34 | 4.5 | positive: state text on its tint | pass |
| light | `--foreground` #16181D | `--positive-soft` #E6F4EC | 15.66 | 4.5 | positive: body text on its tint | pass |
| light | `--positive-foreground` #FFFFFF | `--positive` #1A7F45 | 5.04 | 4.5 | positive: text on solid fill | pass |
| light | `--positive` #1A7F45 | `--background` #FFFFFF | 5.04 | 3 | positive: glyph or fill edge (non-text) | pass |
| light | `--positive` #1A7F45 | `--card` #FFFFFF | 5.04 | 3 | positive: glyph or fill edge on cards (non-text) | pass |
| light | `--positive` #1A7F45 | `--positive-soft` #E6F4EC | 4.44 | 3 | positive: glyph on its tint (non-text) | pass |
| light | `--negative-ink` #B01F38 | `--background` #FFFFFF | 6.78 | 4.5 | negative: state text | pass |
| light | `--negative-ink` #B01F38 | `--card` #FFFFFF | 6.78 | 4.5 | negative: state text on cards | pass |
| light | `--negative-ink` #B01F38 | `--negative-soft` #FCE8EC | 5.77 | 4.5 | negative: state text on its tint | pass |
| light | `--foreground` #16181D | `--negative-soft` #FCE8EC | 15.13 | 4.5 | negative: body text on its tint | pass |
| light | `--negative-foreground` #FFFFFF | `--negative` #C8233F | 5.57 | 4.5 | negative: text on solid fill | pass |
| light | `--negative` #C8233F | `--background` #FFFFFF | 5.57 | 3 | negative: glyph or fill edge (non-text) | pass |
| light | `--negative` #C8233F | `--card` #FFFFFF | 5.57 | 3 | negative: glyph or fill edge on cards (non-text) | pass |
| light | `--negative` #C8233F | `--negative-soft` #FCE8EC | 4.75 | 3 | negative: glyph on its tint (non-text) | pass |
| light | `--caution-ink` #8A5200 | `--background` #FFFFFF | 6.39 | 4.5 | caution: state text | pass |
| light | `--caution-ink` #8A5200 | `--card` #FFFFFF | 6.39 | 4.5 | caution: state text on cards | pass |
| light | `--caution-ink` #8A5200 | `--caution-soft` #FDF1DD | 5.72 | 4.5 | caution: state text on its tint | pass |
| light | `--foreground` #16181D | `--caution-soft` #FDF1DD | 15.90 | 4.5 | caution: body text on its tint | pass |
| light | `--caution-foreground` #FFFFFF | `--caution` #9A5B00 | 5.43 | 4.5 | caution: text on solid fill | pass |
| light | `--caution` #9A5B00 | `--background` #FFFFFF | 5.43 | 3 | caution: glyph or fill edge (non-text) | pass |
| light | `--caution` #9A5B00 | `--card` #FFFFFF | 5.43 | 3 | caution: glyph or fill edge on cards (non-text) | pass |
| light | `--caution` #9A5B00 | `--caution-soft` #FDF1DD | 4.86 | 3 | caution: glyph on its tint (non-text) | pass |
| light | `--progress-ink` #1B5A88 | `--background` #FFFFFF | 7.33 | 4.5 | progress: state text | pass |
| light | `--progress-ink` #1B5A88 | `--card` #FFFFFF | 7.33 | 4.5 | progress: state text on cards | pass |
| light | `--progress-ink` #1B5A88 | `--progress-soft` #E6F0F7 | 6.34 | 4.5 | progress: state text on its tint | pass |
| light | `--foreground` #16181D | `--progress-soft` #E6F0F7 | 15.37 | 4.5 | progress: body text on its tint | pass |
| light | `--progress-foreground` #FFFFFF | `--progress` #1F6496 | 6.32 | 4.5 | progress: text on solid fill | pass |
| light | `--progress` #1F6496 | `--background` #FFFFFF | 6.32 | 3 | progress: glyph or fill edge (non-text) | pass |
| light | `--progress` #1F6496 | `--card` #FFFFFF | 6.32 | 3 | progress: glyph or fill edge on cards (non-text) | pass |
| light | `--progress` #1F6496 | `--progress-soft` #E6F0F7 | 5.47 | 3 | progress: glyph on its tint (non-text) | pass |
| light | `--seal-ink` #5240C4 | `--background` #FFFFFF | 7.27 | 4.5 | seal: state text | pass |
| light | `--seal-ink` #5240C4 | `--card` #FFFFFF | 7.27 | 4.5 | seal: state text on cards | pass |
| light | `--seal-ink` #5240C4 | `--seal-soft` #EFECFC | 6.26 | 4.5 | seal: state text on its tint | pass |
| light | `--foreground` #16181D | `--seal-soft` #EFECFC | 15.28 | 4.5 | seal: body text on its tint | pass |
| light | `--seal-foreground` #FFFFFF | `--seal` #5B47D6 | 6.33 | 4.5 | seal: text on solid fill | pass |
| light | `--seal` #5B47D6 | `--background` #FFFFFF | 6.33 | 3 | seal: glyph or fill edge (non-text) | pass |
| light | `--seal` #5B47D6 | `--card` #FFFFFF | 6.33 | 3 | seal: glyph or fill edge on cards (non-text) | pass |
| light | `--seal` #5B47D6 | `--seal-soft` #EFECFC | 5.45 | 3 | seal: glyph on its tint (non-text) | pass |
| light | `--scope-ink` #92337C | `--background` #FFFFFF | 7.03 | 4.5 | scope: state text | pass |
| light | `--scope-ink` #92337C | `--card` #FFFFFF | 7.03 | 4.5 | scope: state text on cards | pass |
| light | `--scope-ink` #92337C | `--scope-soft` #F8E9F4 | 6.01 | 4.5 | scope: state text on its tint | pass |
| light | `--foreground` #16181D | `--scope-soft` #F8E9F4 | 15.18 | 4.5 | scope: body text on its tint | pass |
| light | `--scope-foreground` #FFFFFF | `--scope` #A23A8A | 5.99 | 4.5 | scope: text on solid fill | pass |
| light | `--scope` #A23A8A | `--background` #FFFFFF | 5.99 | 3 | scope: glyph or fill edge (non-text) | pass |
| light | `--scope` #A23A8A | `--card` #FFFFFF | 5.99 | 3 | scope: glyph or fill edge on cards (non-text) | pass |
| light | `--scope` #A23A8A | `--scope-soft` #F8E9F4 | 5.12 | 3 | scope: glyph on its tint (non-text) | pass |
| light | `--history-ink` #6A5C4C | `--background` #FFFFFF | 6.47 | 4.5 | history: state text | pass |
| light | `--history-ink` #6A5C4C | `--card` #FFFFFF | 6.47 | 4.5 | history: state text on cards | pass |
| light | `--history-ink` #6A5C4C | `--history-soft` #F2EEE9 | 5.60 | 4.5 | history: state text on its tint | pass |
| light | `--foreground` #16181D | `--history-soft` #F2EEE9 | 15.38 | 4.5 | history: body text on its tint | pass |
| light | `--history-foreground` #FFFFFF | `--history` #7A6A58 | 5.21 | 4.5 | history: text on solid fill | pass |
| light | `--history` #7A6A58 | `--background` #FFFFFF | 5.21 | 3 | history: glyph or fill edge (non-text) | pass |
| light | `--history` #7A6A58 | `--card` #FFFFFF | 5.21 | 3 | history: glyph or fill edge on cards (non-text) | pass |
| light | `--history` #7A6A58 | `--history-soft` #F2EEE9 | 4.51 | 3 | history: glyph on its tint (non-text) | pass |
| light | `--urgent-ink` #A9390B | `--background` #FFFFFF | 6.41 | 4.5 | urgent: state text | pass |
| light | `--urgent-ink` #A9390B | `--card` #FFFFFF | 6.41 | 4.5 | urgent: state text on cards | pass |
| light | `--urgent-ink` #A9390B | `--urgent-soft` #FDEDE4 | 5.62 | 4.5 | urgent: state text on its tint | pass |
| light | `--foreground` #16181D | `--urgent-soft` #FDEDE4 | 15.57 | 4.5 | urgent: body text on its tint | pass |
| light | `--urgent-foreground` #FFFFFF | `--urgent` #C2410C | 5.18 | 4.5 | urgent: text on solid fill | pass |
| light | `--urgent` #C2410C | `--background` #FFFFFF | 5.18 | 3 | urgent: glyph or fill edge (non-text) | pass |
| light | `--urgent` #C2410C | `--card` #FFFFFF | 5.18 | 3 | urgent: glyph or fill edge on cards (non-text) | pass |
| light | `--urgent` #C2410C | `--urgent-soft` #FDEDE4 | 4.54 | 3 | urgent: glyph on its tint (non-text) | pass |
| light | `--muted-foreground` #5A606C | `--caution-soft` #FDF1DD | 5.66 | 4.5 | Hints inside a client-turn tint | pass |
| light | `--muted-foreground` #5A606C | `--progress-soft` #E6F0F7 | 5.47 | 4.5 | Hints inside a representative-turn tint | pass |
| dark | `--foreground` #E8EAEE | `--background` #17191E | 14.60 | 4.5 | Body text | pass |
| dark | `--card-foreground` #E8EAEE | `--card` #1C1F25 | 13.71 | 4.5 | Text on cards | pass |
| dark | `--popover-foreground` #E8EAEE | `--popover` #23262D | 12.57 | 4.5 | Text in menus and dialogs | pass |
| dark | `--primary-foreground` #17191E | `--primary` #E8EAEE | 14.60 | 4.5 | Primary button label | pass |
| dark | `--secondary-foreground` #E8EAEE | `--secondary` #262A31 | 11.96 | 4.5 | Secondary button label | pass |
| dark | `--muted-foreground` #9EA5B1 | `--background` #17191E | 7.09 | 4.5 | Hints and metadata | pass |
| dark | `--muted-foreground` #9EA5B1 | `--card` #1C1F25 | 6.66 | 4.5 | Hints on cards | pass |
| dark | `--muted-foreground` #9EA5B1 | `--muted` #1F2228 | 6.43 | 4.5 | Hints on muted surfaces | pass |
| dark | `--accent-foreground` #E8EAEE | `--accent` #2A2E36 | 11.30 | 4.5 | Hovered menu item | pass |
| dark | `--destructive-foreground` #17191E | `--destructive` #FF7B8F | 7.10 | 4.5 | Destructive button label | pass |
| dark | `--destructive` #FF7B8F | `--background` #17191E | 7.10 | 4.5 | Error message text | pass |
| dark | `--destructive` #FF7B8F | `--card` #1C1F25 | 6.67 | 4.5 | Error text on cards | pass |
| dark | `--primary` #E8EAEE | `--background` #17191E | 14.60 | 4.5 | Link text | pass |
| dark | `--primary` #E8EAEE | `--card` #1C1F25 | 13.71 | 4.5 | Link text on cards | pass |
| dark | `--sidebar-foreground` #E8EAEE | `--sidebar` #141619 | 15.05 | 4.5 | Navigation text | pass |
| dark | `--sidebar-primary-foreground` #141619 | `--sidebar-primary` #E8EAEE | 15.05 | 4.5 | Active navigation item | pass |
| dark | `--sidebar-accent-foreground` #E8EAEE | `--sidebar-accent` #262A31 | 11.96 | 4.5 | Hovered navigation item | pass |
| dark | `--input` #6E7581 | `--background` #17191E | 3.79 | 3 | Input boundary (non-text) | pass |
| dark | `--input` #6E7581 | `--card` #1C1F25 | 3.56 | 3 | Input boundary on cards (non-text) | pass |
| dark | `--ring` #7AA2FF | `--background` #17191E | 7.07 | 3 | Focus ring (non-text) | pass |
| dark | `--ring` #7AA2FF | `--card` #1C1F25 | 6.63 | 3 | Focus ring on cards (non-text) | pass |
| dark | `--sidebar-ring` #7AA2FF | `--sidebar` #141619 | 7.28 | 3 | Focus ring in navigation (non-text) | pass |
| dark | `--positive-ink` #5DD397 | `--background` #17191E | 9.40 | 4.5 | positive: state text | pass |
| dark | `--positive-ink` #5DD397 | `--card` #1C1F25 | 8.83 | 4.5 | positive: state text on cards | pass |
| dark | `--positive-ink` #5DD397 | `--positive-soft` #13281D | 8.33 | 4.5 | positive: state text on its tint | pass |
| dark | `--foreground` #E8EAEE | `--positive-soft` #13281D | 12.92 | 4.5 | positive: body text on its tint | pass |
| dark | `--positive-foreground` #06170E | `--positive` #4CC98A | 8.82 | 4.5 | positive: text on solid fill | pass |
| dark | `--positive` #4CC98A | `--background` #17191E | 8.40 | 3 | positive: glyph or fill edge (non-text) | pass |
| dark | `--positive` #4CC98A | `--card` #1C1F25 | 7.88 | 3 | positive: glyph or fill edge on cards (non-text) | pass |
| dark | `--positive` #4CC98A | `--positive-soft` #13281D | 7.43 | 3 | positive: glyph on its tint (non-text) | pass |
| dark | `--negative-ink` #FF91A2 | `--background` #17191E | 8.23 | 4.5 | negative: state text | pass |
| dark | `--negative-ink` #FF91A2 | `--card` #1C1F25 | 7.72 | 4.5 | negative: state text on cards | pass |
| dark | `--negative-ink` #FF91A2 | `--negative-soft` #36161C | 7.62 | 4.5 | negative: state text on its tint | pass |
| dark | `--foreground` #E8EAEE | `--negative-soft` #36161C | 13.53 | 4.5 | negative: body text on its tint | pass |
| dark | `--negative-foreground` #24060C | `--negative` #FF7B8F | 7.67 | 4.5 | negative: text on solid fill | pass |
| dark | `--negative` #FF7B8F | `--background` #17191E | 7.10 | 3 | negative: glyph or fill edge (non-text) | pass |
| dark | `--negative` #FF7B8F | `--card` #1C1F25 | 6.67 | 3 | negative: glyph or fill edge on cards (non-text) | pass |
| dark | `--negative` #FF7B8F | `--negative-soft` #36161C | 6.58 | 3 | negative: glyph on its tint (non-text) | pass |
| dark | `--caution-ink` #F3BC62 | `--background` #17191E | 10.20 | 4.5 | caution: state text | pass |
| dark | `--caution-ink` #F3BC62 | `--card` #1C1F25 | 9.58 | 4.5 | caution: state text on cards | pass |
| dark | `--caution-ink` #F3BC62 | `--caution-soft` #30250F | 8.72 | 4.5 | caution: state text on its tint | pass |
| dark | `--foreground` #E8EAEE | `--caution-soft` #30250F | 12.48 | 4.5 | caution: body text on its tint | pass |
| dark | `--caution-foreground` #1E1404 | `--caution` #F0B04A | 9.52 | 4.5 | caution: text on solid fill | pass |
| dark | `--caution` #F0B04A | `--background` #17191E | 9.22 | 3 | caution: glyph or fill edge (non-text) | pass |
| dark | `--caution` #F0B04A | `--card` #1C1F25 | 8.66 | 3 | caution: glyph or fill edge on cards (non-text) | pass |
| dark | `--caution` #F0B04A | `--caution-soft` #30250F | 7.88 | 3 | caution: glyph on its tint (non-text) | pass |
| dark | `--progress-ink` #79C0EA | `--background` #17191E | 8.83 | 4.5 | progress: state text | pass |
| dark | `--progress-ink` #79C0EA | `--card` #1C1F25 | 8.29 | 4.5 | progress: state text on cards | pass |
| dark | `--progress-ink` #79C0EA | `--progress-soft` #11293A | 7.52 | 4.5 | progress: state text on its tint | pass |
| dark | `--foreground` #E8EAEE | `--progress-soft` #11293A | 12.43 | 4.5 | progress: body text on its tint | pass |
| dark | `--progress-foreground` #061723 | `--progress` #5FB3E3 | 7.83 | 4.5 | progress: text on solid fill | pass |
| dark | `--progress` #5FB3E3 | `--background` #17191E | 7.57 | 3 | progress: glyph or fill edge (non-text) | pass |
| dark | `--progress` #5FB3E3 | `--card` #1C1F25 | 7.11 | 3 | progress: glyph or fill edge on cards (non-text) | pass |
| dark | `--progress` #5FB3E3 | `--progress-soft` #11293A | 6.45 | 3 | progress: glyph on its tint (non-text) | pass |
| dark | `--seal-ink` #B8ADFF | `--background` #17191E | 8.76 | 4.5 | seal: state text | pass |
| dark | `--seal-ink` #B8ADFF | `--card` #1C1F25 | 8.22 | 4.5 | seal: state text on cards | pass |
| dark | `--seal-ink` #B8ADFF | `--seal-soft` #221D45 | 7.87 | 4.5 | seal: state text on its tint | pass |
| dark | `--foreground` #E8EAEE | `--seal-soft` #221D45 | 13.11 | 4.5 | seal: body text on its tint | pass |
| dark | `--seal-foreground` #140D33 | `--seal` #A99BFF | 7.77 | 4.5 | seal: text on solid fill | pass |
| dark | `--seal` #A99BFF | `--background` #17191E | 7.39 | 3 | seal: glyph or fill edge (non-text) | pass |
| dark | `--seal` #A99BFF | `--card` #1C1F25 | 6.93 | 3 | seal: glyph or fill edge on cards (non-text) | pass |
| dark | `--seal` #A99BFF | `--seal-soft` #221D45 | 6.63 | 3 | seal: glyph on its tint (non-text) | pass |
| dark | `--scope-ink` #F2A3DB | `--background` #17191E | 9.24 | 4.5 | scope: state text | pass |
| dark | `--scope-ink` #F2A3DB | `--card` #1C1F25 | 8.68 | 4.5 | scope: state text on cards | pass |
| dark | `--scope-ink` #F2A3DB | `--scope-soft` #36172F | 8.36 | 4.5 | scope: state text on its tint | pass |
| dark | `--foreground` #E8EAEE | `--scope-soft` #36172F | 13.20 | 4.5 | scope: body text on its tint | pass |
| dark | `--scope-foreground` #2A0A22 | `--scope` #EE8ED3 | 8.11 | 4.5 | scope: text on solid fill | pass |
| dark | `--scope` #EE8ED3 | `--background` #17191E | 7.91 | 3 | scope: glyph or fill edge (non-text) | pass |
| dark | `--scope` #EE8ED3 | `--card` #1C1F25 | 7.43 | 3 | scope: glyph or fill edge on cards (non-text) | pass |
| dark | `--scope` #EE8ED3 | `--scope-soft` #36172F | 7.15 | 3 | scope: glyph on its tint (non-text) | pass |
| dark | `--history-ink` #CFC0B0 | `--background` #17191E | 9.90 | 4.5 | history: state text | pass |
| dark | `--history-ink` #CFC0B0 | `--card` #1C1F25 | 9.29 | 4.5 | history: state text on cards | pass |
| dark | `--history-ink` #CFC0B0 | `--history-soft` #2A251F | 8.55 | 4.5 | history: state text on its tint | pass |
| dark | `--foreground` #E8EAEE | `--history-soft` #2A251F | 12.61 | 4.5 | history: body text on its tint | pass |
| dark | `--history-foreground` #1C150E | `--history` #C4B4A2 | 8.94 | 4.5 | history: text on solid fill | pass |
| dark | `--history` #C4B4A2 | `--background` #17191E | 8.71 | 3 | history: glyph or fill edge (non-text) | pass |
| dark | `--history` #C4B4A2 | `--card` #1C1F25 | 8.17 | 3 | history: glyph or fill edge on cards (non-text) | pass |
| dark | `--history` #C4B4A2 | `--history-soft` #2A251F | 7.52 | 3 | history: glyph on its tint (non-text) | pass |
| dark | `--urgent-ink` #FFA77F | `--background` #17191E | 9.28 | 4.5 | urgent: state text | pass |
| dark | `--urgent-ink` #FFA77F | `--card` #1C1F25 | 8.71 | 4.5 | urgent: state text on cards | pass |
| dark | `--urgent-ink` #FFA77F | `--urgent-soft` #3A1D10 | 8.13 | 4.5 | urgent: state text on its tint | pass |
| dark | `--foreground` #E8EAEE | `--urgent-soft` #3A1D10 | 12.79 | 4.5 | urgent: body text on its tint | pass |
| dark | `--urgent-foreground` #260E03 | `--urgent` #FF9363 | 8.38 | 4.5 | urgent: text on solid fill | pass |
| dark | `--urgent` #FF9363 | `--background` #17191E | 8.04 | 3 | urgent: glyph or fill edge (non-text) | pass |
| dark | `--urgent` #FF9363 | `--card` #1C1F25 | 7.55 | 3 | urgent: glyph or fill edge on cards (non-text) | pass |
| dark | `--urgent` #FF9363 | `--urgent-soft` #3A1D10 | 7.05 | 3 | urgent: glyph on its tint (non-text) | pass |
| dark | `--muted-foreground` #9EA5B1 | `--caution-soft` #30250F | 6.06 | 4.5 | Hints inside a client-turn tint | pass |
| dark | `--muted-foreground` #9EA5B1 | `--progress-soft` #11293A | 6.04 | 4.5 | Hints inside a representative-turn tint | pass |
