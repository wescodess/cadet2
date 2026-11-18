# B1 Access and intake, round 1: five concepts

Date: 2026-11-17. Path: the UI design gate, round 1, for batch B1 (P02, P03, P04, P06, P07, C01 to C06, C17, C18, N01). Nothing here is approved, and no app code changes. All five concepts use the approved Relay system: its tokens, IBM Plex, the glyph, word and colour state language, the turn colours (amber client, blue representative, green done, violet signed), the turn bar and holder, and Relay’s component styles and target sizes.

Every concept shows the same synthetic story end to end on a 390 px phone: Oluwaseun Adébáyọ̀-Fitzgerald opens an invitation from Priya Raman, RCIC, at Harbourline Immigration; creates an account; verifies email; confirms 18+, terms and the privacy notice as separate choices; accepts the connection; chooses what to share; answers the status, screening and scope questions; adds optional context and a partly known IELTS result; checks answers; and gets a receipt. Each also shows the urgent human route, a factual question from Priya, stopping sharing, the account page, the states (loading, empty, error, pending counsel, escalated and others) and the public Terms and Help pages at 1280 px. Every legal sentence is the registry’s exact draft text, marked “Draft wording, pending counsel”; facts not yet supplied (operator, privacy contact, retention period) show as “not supplied” and block the choice that depends on them.

## How to look at them

| Concept | Board (728 px, for chat) | Full concept | Screenshots | Critique |
| --- | --- | --- | --- | --- |
| 1. Interview | [preview](1-interview/preview.html) | [index](1-interview/index.html) | [mobile](1-interview/mobile.png), [flow](1-interview/flow.png) | [critique](1-interview/critique.md) |
| 2. Checklist | [preview](2-checklist/preview.html) | [index](2-checklist/index.html) | [mobile](2-checklist/mobile.png), [flow](2-checklist/flow.png) | [critique](2-checklist/critique.md) |
| 3. Thread | [preview](3-thread/preview.html) | [index](3-thread/index.html) | [mobile](3-thread/mobile.png), [flow](3-thread/flow.png) | [critique](3-thread/critique.md) |
| 4. Agenda | [preview](4-agenda/preview.html) | [index](4-agenda/index.html) | [mobile](4-agenda/mobile.png), [flow](4-agenda/flow.png) | [critique](4-agenda/critique.md) |
| 5. Answer Sheet | [preview](5-answer-sheet/preview.html) | [index](5-answer-sheet/index.html) | [mobile](5-answer-sheet/mobile.png), [flow](5-answer-sheet/flow.png) | [critique](5-answer-sheet/critique.md) |

Each `index.html` opens with the idea and trade-offs, then: the phone flow in order, the urgent branch, later moments (factual reply, withdrawal, account security), states, the two desktop pages, the N01 email capture, and the components used with any system addition. A dashed line on a phone marks the bottom of a 390 by 844 screen where a page scrolls.

## What all five share

- **Same content and order.** Sharing is chosen before any sensitive question. Status situation comes first, then the four screening questions, then help sought and the five scope questions, then optional context and language results. “I don’t know” and “I prefer to discuss this with my representative” are real answers, kept visible in amber with the unknown glyph, and never read as “no”.
- **The turn bar on every portal screen.** During the intake Priya’s half is neutral: “Can’t see your answers yet”. After sending, “Nothing for you” sits beside “Harbourline’s turn: preparing your Case”.
- **An urgent answer gets a person, now.** The route opens on the same or next screen with Call, Email and “Send my answers so far to Priya” before any long text, and the client can stop answering. After sending, the status says “Received by cadet2” and “Waiting for Priya Raman to acknowledge it”, never that she has read it.
- **True states only.** “Saved at” only after the server acknowledges; offline says “Not saved”; a lost submission says it can’t be confirmed and that checking again won’t send a second copy; a withdrawal is “not confirmed yet” until it is.
- **Guardrails.** No scores, odds, rankings, confidence or “fastest”; test results are called bands and never converted for the client. “Representative”, never “agent”. No government marks.
- **Checks.** Each concept passed an automated pass over every screen: zero text below its contrast minimum (lowest 5.15:1), zero targets under 24 px, every client button at least 44 px, visible focus on every control, one `h1` per screen, no duplicate IDs and no overflow at 320 px. Defects found by the design critique and accessibility review were fixed without changing a concept’s layout, hierarchy or interaction; what was held is listed in each critique.

## The five concepts

### 1. Interview

**Idea.** One question, or one decision, per screen. Every page has the same frame: back, a true save state, the question as the heading, an honest “I don’t know”, “Why we ask” and one Continue. Each sharing purpose and each acknowledgement gets its own page. An urgent answer replaces the next question with the human route.

| Best at | Worst at |
| --- | --- |
| Calm, low-effort answering in short phone sessions; the clearest separation of consent purposes. | Overview and length: about 30 screens from invitation to receipt, with only part-level progress. |

### 2. Checklist

**Idea.** One list holds the whole intake, grouped as “before you answer”, “required”, “optional” and “send”, each row ending in who holds it. A task opens a single page with its few questions, then returns to the list. Sharing is the first task and unlocks the questions. The same list later carries Priya’s questions.

| Best at | Worst at |
| --- | --- |
| Seeing what’s done, what’s yours, what’s optional and what can’t start yet; leaving and resuming; later tasks without a new pattern. | Long task pages on a phone: the screening page holds four questions and the scope page six. |

### 3. Thread

**Idea.** The Case is one dated history with Harbourline. The invitation, the sharing choice, each block of questions, the receipt and Priya’s later questions arrive as cards in order; cards open a sheet with a short form. A person’s card carries their name; automatic cards say “automatic”. No free-text chat.

| Best at | Worst at |
| --- | --- |
| Relationship and record: who asked for what and when, in one place; withdrawal closes the history with a dated card. | Reads like chat, so clients may expect to type or get a quick reply; the current task scrolls away as history grows. |

### 4. Agenda

**Idea.** The intake lives on the Relay home. The home shows one next step in full, then whose turn everything else is: yours, Priya’s or Harbourline’s, dated, done. Each step opens a focused page and closes back to the home. A date entered in the intake appears under “Dates to watch” straight away, with its source.

| Best at | Worst at |
| --- | --- |
| Continuity with the approved Relay home; the strongest answer to “am I waiting, or do I owe something?”, before and after sending. | Back-and-forth: the home appears after every step, and the remaining steps are folded away. |

### 5. Answer Sheet

**Idea.** One page per Case that is already the check-answers page. Every question is a row; a row opens in place, you answer, and it folds back into a summary. What you see is exactly what will be sent. Sending freezes it as a numbered version, and Priya’s later questions open on the exact row they’re about.

| Best at | Worst at |
| --- | --- |
| Transparency and control: the whole picture, unknowns included, at every moment; the fewest screens. | Focus on a phone: a long page with one row open is busy for a first-time client and hardest for screen reader and keyboard users. |

## Side by side

| | 1. Interview | 2. Checklist | 3. Thread | 4. Agenda | 5. Answer Sheet |
| --- | --- | --- | --- | --- | --- |
| Organized by | The next question | Sections of tasks | Time, as a history | Who acts next, and dates | The answers themselves |
| Screens from invitation to receipt | About 30 | About 15 | About 15 | About 16 | 12 |
| Where questions are answered | Full pages, one each | A page per task | Sheets over the history | Step pages over the home | Rows opened in place |
| Overview of what’s left | Part number only | Always, on the list | Question cards in the history | “After that”, one tap | Always, the whole sheet |
| Consent | A page per purpose | One task, separate choices | One sheet, separate choices | One step, separate choices | First block of the sheet |
| Check answers | Separate final page | Last task | Final sheet | Final step | The sheet itself |
| Urgent route | Replaces the next question | Under the answer, then pinned on the list | In the sheet, then pinned above the history | In the step, then the top of the home | Under the row, plus a pinned link |
| Priya’s later question | Same question page | A new task | A card from her | The next step on the home | On the exact answer row |
| Additions beyond the shared one | None | None | History card and sender labels; sheet over the Case top | Account tab instead of Messages | Open-row look |

## Recommendation

**Choose 2. Checklist.**

1. **It gives an anxious client both focus and the whole picture.** Each task page is short and about one thing, and the list always shows what’s done, what’s theirs, what’s optional and what can’t start yet. That is the UX research’s pairing of focused questions with a small task list (C1, C3) and check answers before a receipt (C4).
2. **It makes the decisions’ ordering rules visible instead of hidden.** Sharing is the first task and unlocks the sensitive questions; urgency comes before scope. A client can see why a task is “Not yet” rather than being marched through it.
3. **It handles the urgent route and partial intake best.** The route opens under the triggering answer and stays pinned above the list until a person has it, and the list keeps working if the client chooses to stop.
4. **One pattern carries the rest of B1 and B4.** Priya’s factual questions (C06) arrive as tasks with a named requester and holder, withdrawal sits on the Sharing task (C17), and later evidence tasks fit the same list.
5. **Lowest system risk.** It is Relay holder rows on the `Item` primitive plus standard fields, with no addition beyond the neutral variant every concept needs.

What to watch: the screening and scope pages are long on a phone. If testing shows drop-off, a round-2 variation can split screening into one question per page inside its task, borrowing Interview’s page frame without losing the list.

**Runner-up: 4. Agenda**, if the owner weights continuity with the approved Relay home above an explicit intake list. Its “Dates to watch” behaviour is worth keeping whichever concept is chosen. The axes combine: Checklist’s list could become Agenda’s “After that”, which would be one more round.

## System additions flagged for the owner

1. **Neutral, no-turn variant of chip, notice, disc and turn-bar segment (all five concepts).** Relay has no state for “nobody holds this”. Without it, Priya’s half of the turn bar would be blue while she can see nothing, a locked task would look like the client’s turn, and “pending counsel”, “captured, not sent”, “not confirmed” and “sharing stopped” would borrow amber or blue. It uses only existing tokens: `--muted`, `--muted-foreground`, `--border` and `--input` (dashed disc outline).
2. **A “not supplied” mark for missing legal facts (part of the same variant).** A dashed outline around a placeholder such as “privacy contact: not supplied”, so a gap is never read as a real company, contact or period.
3. **Concept-specific compositions, no new tokens:** Thread’s history card with person and “automatic” sender labels (adds lucide’s robot glyph) and its sheet over the Case top; Agenda’s Account tab in place of Relay’s Messages tab, because B1 has no messaging surface; Answer Sheet’s open-row look.

The urgent route panel in every concept reuses Relay’s urgent role and its due-in-90-days deadline edge, so it is not an addition.

## Constraints and what isn’t verified

All copy is English, matching the pilot. Not verified in round 1: real screen reader output, keyboard order in a built app, 200% zoom of the desktop pages, the dark theme, and testing with real applicants. Build requirements recorded in the critiques: `scroll-padding` for pinned bars and the turn bar, focus traps for sheets and step pages, and focus management for rows opened in place. The concepts load IBM Plex from Google Fonts by URL, as the Relay specimen does; the app should self-host it.
