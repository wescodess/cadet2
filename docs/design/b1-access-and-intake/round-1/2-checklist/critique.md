# Critique: B1 round 1, concept 2, Checklist

Checked on 2026-11-17 with the design-critique and accessibility-review skills, against the approved Relay specimen (round 2, variation 2), the B1 surface inventory, the intake, consent, legal-floor and lifecycle decisions and the UX research. Method: review of every rendered screen (27 phone screens (14 flow, 2 urgent, 5 later, 6 states) and 2 desktop pages) plus an automated Playwright pass that measured every text node against its real composited background, every interactive target, focus styles, labels, heading structure, duplicate IDs and reflow of every phone screen at 320 px. **Held until the owner reacts.** Findings marked “Held” keep the concept’s identity.

## Design critique

### Overall impression

The clearest overview. The list answers “what’s done, what’s mine, what’s optional, what can’t start yet” in one screen, and later questions from Priya land in the same place. Task pages are long on a phone.

### Usability

| Finding | Severity | Resolution |
| --- | --- | --- |
| The screening page holds four questions and the scope page six, so both run two to three screens long. | Moderate | Held: grouping is the concept. The error summary and per-question hints keep long pages usable. |
| Required tasks are locked until sharing is chosen; a client may not understand why. | Minor | Held, with the section note “After sharing” explaining it. Sharing before sensitive questions is a decision requirement. |
| The receipt view had no page heading. | Minor | Fixed: “Intake sent” is the `h1`. |
| The pending withdrawal view had two `h1`s. | Minor | Fixed. |
| The list repeats after every task, which can feel slow for confident clients. | Minor | Held: it’s also how they see progress. |
| Loading skeletons used `--muted` on the `--muted` phone surface and were invisible. | Minor | Fixed: skeletons use `--border`. |
| The unknown and urgent glyphs inside an answer broke onto their own line, away from their word. | Minor | Fixed: glyphs sit inline before the word. |
| The language step said “scores”. The product rule bans scores on the client side, even though reported test results are allowed. | Moderate | Fixed: “bands” and “results”. |
| In the human route, the contact buttons came after two paragraphs of draft legal text, below the fold. | Moderate | Fixed: Call, Email and Send come straight after the one-sentence reason; the route’s legal text follows. |

### Visual hierarchy

- First thing the eye lands on: The list’s first section with two green “Done” holders and one amber “You”. Correct: it shows progress and the next thing at once.
- Reading flow: Practice name and title, saved time, then four numbered sections, each row ending in its holder.
- Emphasis: Holders carry the colour and the right column, so titles still lead. “Not yet” rows are neutral, so a locked task never looks like the client’s turn.

### Consistency with Relay

| Element | Observation | Recommendation |
| --- | --- | --- |
| Turn colours | Amber only for the client’s turn, blue only for a representative or the Practice, green for done; neutral where nobody holds anything. | Keep |
| States | Every state pairs glyph, word and colour: Submitted, Clarification requested, Unknown, Out of scope, Needs a licensed professional now. | Keep |
| Pending counsel | Every legal sentence carries “Draft wording, pending counsel” in the neutral treatment, so legal status never borrows a turn colour. | Approve the neutral variant (flagged) |
| Components | Relay turn bar, holder, save state, error summary, check answers, chips, empty and receipt patterns; shadcn-vue primitives underneath. | Keep |

### What works well

- Sharing first, as a task that unlocks the questions, makes the purpose-before-collection rule visible.
- The urgent route opens under the triggering answer and stays pinned at the top of the list until Priya has it.
- Priya’s later question is just another task with a named requester and a holder.
- A pending withdrawal says it isn’t confirmed and offers a status check, instead of claiming success.

### Priority recommendations

1. Test whether clients understand “Not yet” and “After sharing”.
2. Watch the length of the screening page; consider two tasks if testing shows drop-off.
3. Confirm the list is the Case home after submission, or link to the Relay home.

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
| Text nodes measured | 761 |
| Text below its contrast minimum | 0 |
| Lowest text contrast | 5.15:1 (needs 4.5) |
| Interactive controls | 304 |
| Targets under 24 by 24 px | 0 |
| Phone buttons under 44 px tall | 0 |
| Inputs without a label | 0 |
| Controls focused, without a visible focus style | 0 of 302 |
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
- The screening page holds four questions and the scope page six, so both run two to three screens long.
- Required tasks are locked until sharing is chosen; a client may not understand why.
- The list repeats after every task, which can feel slow for confident clients.
