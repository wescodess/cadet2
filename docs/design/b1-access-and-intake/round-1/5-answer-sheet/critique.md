# Critique: B1 round 1, concept 5, Answer Sheet

Checked on 2026-11-17 with the design-critique and accessibility-review skills, against the approved Relay specimen (round 2, variation 2), the B1 surface inventory, the intake, consent, legal-floor and lifecycle decisions and the UX research. Method: review of every rendered screen (24 phone screens (12 flow, 2 urgent, 4 later, 6 states) and 2 desktop pages) plus an automated Playwright pass that measured every text node against its real composited background, every interactive target, focus styles, labels, heading structure, duplicate IDs and reflow of every phone screen at 320 px. **Held until the owner reacts.** Findings marked “Held” keep the concept’s identity.

## Design critique

### Overall impression

The most transparent: what the client sees is exactly what will be sent, unknowns included, from the first answer. It is also the busiest on a phone and the hardest to keep focus on.

### Usability

| Finding | Severity | Resolution |
| --- | --- | --- |
| The page is long, and an open row in the middle can be hard to find on a small screen. | Major | Held: the concept is one page. In the build, opening a row scrolls it to the top and focuses its question. |
| The send button was disabled until required answers were done, which hides why. | Major | Fixed: the button is always available and the bar says how many required answers are left; sending early shows the missing answers. |
| The pinned urgent link packed a two-line chip next to its text. | Moderate | Fixed: urgent glyph and words in urgent ink, with an urgent edge. |
| The sent version kept hidden “Change” links that screen readers could still reach. | Moderate | Fixed: read-only rows have no action. |
| Section IDs repeated across screens. | Minor | Fixed. |
| The save time in the send bar didn’t match the urgent timeline. | Minor | Fixed. |
| Loading skeletons used `--muted` on the `--muted` phone surface and were invisible. | Minor | Fixed: skeletons use `--border`. |
| The unknown and urgent glyphs inside an answer broke onto their own line, away from their word. | Minor | Fixed: glyphs sit inline before the word. |
| The language step said “scores”. The product rule bans scores on the client side, even though reported test results are allowed. | Moderate | Fixed: “bands” and “results”. |
| In the human route, the contact buttons came after two paragraphs of draft legal text, below the fold. | Moderate | Fixed: Call, Email and Send come straight after the one-sentence reason; the route’s legal text follows. |

### Visual hierarchy

- First thing the eye lands on: “Your answers” and the first section. Correct, but the open row in the middle competes with the summary rows around it.
- Reading flow: Turn bar, title, sections of summary rows with one row open in place, then the send bar pinned at the bottom.
- Emphasis: The open row sits on a muted panel; the send bar carries the save state and how many required answers are left.

### Consistency with Relay

| Element | Observation | Recommendation |
| --- | --- | --- |
| Turn colours | Amber only for the client’s turn, blue only for a representative or the Practice, green for done; neutral where nobody holds anything. | Keep |
| States | Every state pairs glyph, word and colour: Submitted, Clarification requested, Unknown, Out of scope, Needs a licensed professional now. | Keep |
| Pending counsel | Every legal sentence carries “Draft wording, pending counsel” in the neutral treatment, so legal status never borrows a turn colour. | Approve the neutral variant (flagged) |
| Components | Relay turn bar, holder, save state, error summary, check answers, chips, empty and receipt patterns; shadcn-vue primitives underneath. | Keep |

### What works well

- There is no separate review step to forget: the sheet is the check-answers page from the start.
- Priya’s later question opens on the exact row it’s about, next to the value as sent.
- A two-device conflict shows both candidates with their source and saves nothing until the client chooses.
- After sending, changes are corrections, and the sent version stays as it was.

### Priority recommendations

1. Test with screen reader and keyboard users: opening, saving and closing rows in place.
2. Test whether first-time clients find the next unanswered row.
3. Confirm the open-row look.

## Brief and guardrail check

| Constraint | Result |
| --- | --- |
| No scores, odds, rankings, confidence or “fastest” | Pass. No such word in visible text; test results are called bands and are never converted on the client side. |
| “Representative”, never “agent” | Pass. Zero occurrences. |
| Urgent answers offer the human route immediately | Pass. The route appears on the same or next screen with Call, Email and Send first, without finishing the intake. |
| Unknown is never treated as clear | Pass. “I don’t know” and “prefer to discuss” are kept as answers, shown in amber with the unknown glyph, and the undetermined variant routes to a person. |
| Legal floor | Pass. Registry draft texts are verbatim with interpolations filled from fixtures; every one is marked pending counsel; missing operator and privacy facts show as “not supplied” and block the dependent choice. |
| Consent | Pass. Purposes are separate, unticked and named; sharing comes before sensitive questions; the receipt says a service receipt is not a representative reading it. |
| Saved, sent and stopped only when true | Pass. Saved times only after acknowledgement; offline, not confirmed and pending withdrawal are explicit. |
| Plain language, mobile first, calm | Pass on phones at 390 and 320 px. |
| Government marks | Pass. None; the CICC register and IRCC index are external links with no Client data. |

## Accessibility review (WCAG 2.2 AA target)

**Date:** 2026-11-17. **Scope:** every phone screen, both desktop pages and the email capture in `index.html`.

### Summary after fixes

| Check | Result |
| --- | --- |
| Text nodes measured | 968 |
| Text below its contrast minimum | 0 |
| Lowest text contrast | 5.15:1 (needs 4.5) |
| Interactive controls | 303 |
| Targets under 24 by 24 px | 0 |
| Phone buttons under 44 px tall | 0 |
| Inputs without a label | 0 |
| Controls focused, without a visible focus style | 0 of 300 |
| Phone screens without exactly one `h1` | 0 |
| Duplicate IDs | 0 |
| Phone screens overflowing at 320 px | 0 |

### Findings fixed in this pass

| Finding | Criterion | Resolution |
| --- | --- | --- |
| Radio groups on different screens shared one `name`, so the browser kept only one answer checked across the whole file and several screens showed no selection. | 4.1.2 Name, role, value | Fixed: every group has its own name. |
| Question-page legends were styled as headings but weren’t headings, so screen reader users had no page heading on one-question pages. | 1.3.1, 2.4.6 | Fixed: the legend wraps the page `h1`, the GOV.UK pattern Relay already follows. |
| “Sign in”, “Change email” and “Change password” links were 22 px tall. | 2.5.8 Target size | Fixed: standalone links are at least 24 px; links in client rows are 44 px. |

### Perceivable

| # | Item | Criterion | Status |
| --- | --- | --- | --- |
| 1 | Every state and turn pairs colour with a glyph or disc and a word | 1.4.1 | Pass |
| 2 | Text contrast on real backgrounds, including tints and the urgent fill | 1.4.3 | Pass |
| 3 | Input borders, radio and check outlines, glyphs, dashed neutral discs | 1.4.11 | Pass (Relay tokens: `--input` 3.30:1) |
| 4 | Fieldsets with legends for every question group; lists and description lists for answers | 1.3.1 | Pass |
| 5 | Every phone screen reflows at 320 px with the long client name | 1.4.10 | Pass |

### Operable

| # | Item | Criterion | Status |
| --- | --- | --- | --- |
| 1 | Visible focus on every control; the ring is Relay’s ultramarine, distinct from the representative’s blue | 2.4.7 | Pass |
| 2 | Pinned action bars and turn bar must not hide a focused field | 2.4.11 | Build requirement: `scroll-padding` equal to their heights |
| 3 | Targets at least 24 px; every client button at least 44 px | 2.5.8 | Pass |
| 4 | No hover-only or drag-only action | 2.5.7 | Pass |
| 5 | Opening a row must move focus to its question; saving or cancelling must return focus to that row’s Change link and announce the saved value. | 2.4.3, 4.1.3 | Build requirement. |

### Understandable

| # | Item | Criterion | Status |
| --- | --- | --- | --- |
| 1 | Errors name the field and say how to fix it, with a linked summary | 3.3.1, 3.3.3 | Pass |
| 2 | Labels and hints above every input; dates split into labelled day, month and year | 3.3.2 | Pass |
| 3 | Review before the consequential send, with change links | 3.3.4 | Pass |
| 4 | Sign-in accepts password managers and paste; show-password is a button | 3.3.8 | Pass in markup |
| 5 | Answers already given are not asked again; account identity is reused | 3.3.7 | Pass |

### Robust

| # | Item | Criterion | Status |
| --- | --- | --- | --- |
| 1 | Discs and glyphs are `aria-hidden`; holders carry a visually hidden “Whose turn:” or “Status:” prefix | 4.1.2 | Pass |
| 2 | Save state uses `role="status"`; error summaries and offline notices use `role="alert"` | 4.1.3 | Pass |
| 3 | Unique IDs; every radio group has its own name | 4.1.1, 4.1.2 | Pass after fixes |

### Not verified here

Screen reader output in real assistive technology, keyboard order in the built app, 200% zoom of the desktop pages, the dark theme (not rendered in round 1), and testing with real applicants. The pilot is English only.

## Open items held for the owner

- Approve the neutral, no-turn variant and the “not supplied” mark (all five concepts).
- The page is long, and an open row in the middle can be hard to find on a small screen.
