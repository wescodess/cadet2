# Critique: B2 round 1, concept 3, Stations

Checked on 2026-11-18 with the design-critique and accessibility-review skills, against the approved Relay system (DESIGN.md, approved.html, decision.md, tokens), the 2026-11-18 amendments (neutral “no turn” treatment; Client text at least 13 px), the B2 tickets #111 to #114, the surface inventory rows R01, R02, R03, R05 to R09 and N02, the tenancy, intake, assessment, lifecycle, consent and legal-floor decisions, the B1 Checklist pattern and the UX research. Method: review of every rendered screen (36 screens: desk screens at 1280 px, 4 phone-width screens) plus an automated Playwright pass that measured every text node against its real composited background, every interactive target, focus styles, labels, heading structure, duplicate IDs, Client text size and reflow of every narrow screen at 320 px. **Held until the owner reacts.** Findings marked “Held” keep the concept’s identity.

## Design critique

### Overall impression

The safest concept for new Staff. Gates and their owners are always visible, and the wrong step is hard to take. Real work loops, though, and a fixed six-station rail strains when a Case is at two stations at once.

### Usability

| Finding | Severity | Resolution |
| --- | --- | --- |
| Proposed Client text carried the violet “signed” edge, which says a Representative signed it. Nothing is signed in B2. | Major | Fixed: proposed text uses a neutral edge and the words “Proposed Client text, for a Signed plan”. |
| Workforce invitation wording (lf.workforce-invitation.v1.en) has no registered text, so R03 create and R02 accept would show invented wording. | Major | Fixed: the slot shows “not registered yet” and both actions are off with a reason. Held for the owner: register the text. |
| A clarification sends a Case back to Facts while a Draft already exists, so the Case sits at two stations at once. | Moderate | Held: the rail shows each station’s own state and holder; the order is the concept. |
| The six-column board is cramped at 1280 px: about 190 px per column, so chips wrap inside cards. | Moderate | Held: the narrow board stacks; long names wrap rather than truncate. |
| A six-step rail can read as progress toward approval. | Moderate | Mitigated: the board and rail say “Stations are work, not progress toward approval”, and no station is called “approved”. |
| Board cards put the holder in a footer, not a right-hand column. | Minor | Held and flagged: the columns are too narrow for a 72 px holder column. |

### Visual hierarchy

- First thing the eye lands on: The station rail with its holders, then the side panel’s open items. Correct: what’s blocking and who holds it.
- Reading flow: Case name and turn line, the station rail, the station’s work on the left, open items and the gate on the right.
- Emphasis: colour appears only on states, turns, links and focus. Up to four per card: urgent edge, chips, date and holder.

### Consistency with Relay

| Element | Observation | Recommendation |
| --- | --- | --- |
| Turn colours | Amber only for the Client, blue only for the Practice or a Representative, green for done, violet only for signed versions (Chinwe’s Signed version 1). Nobody-holds states use the approved neutral treatment: Processing, Ended, No action, Not yet. | Keep |
| Desk chips | Neutral chip fill and hairline, glyph in role colour, word in role ink, as DESIGN.md states. Client screens keep tinted chips. This settles discrepancy 8 unless the owner says otherwise. | Keep |
| States | Glyph, word and colour together: Submitted, Clarification requested, Intake underway, Not reviewed, Changed since revision 3, Supported, Unknown, Out of scope, Signed version 1, Needs a licensed professional now. “Review requested” is a new chip (flagged). | Approve the addition |
| Pending counsel | Every legal sentence is the registry’s draft text with “Draft wording, pending counsel” and its key; missing facts show as “not supplied”. | Keep |
| Components | Relay holder, turn line, QueueRow, CheckAnswersRow, fact cards, findings, ProvenanceRow, DraftNotice, ErrorSummary, SaveState, ClientQuestionComposer, dialogs and toasts on shadcn-vue primitives. | Keep |

### What works well

- Every gate names who can open it, including Client-only confirmations.
- Submitting and requesting review are each their own station with one primary action.
- The Safety and scope station stays open after acknowledgment, which makes “escalation stays required” obvious.
- Setup and invitations reuse the same station pattern.

### Priority recommendations

1. Test the fixed order with practitioners who interleave work.
2. Check that the rail isn’t read as progress toward approval.
3. Try a five-column board, merging Connection and sharing into Facts, if the board stays.

## Brief and guardrail check

| Constraint | Result |
| --- | --- |
| No scores, odds, rankings, confidence or “fastest” | Pass. Test results are bands; CLB levels are evidenced conversions with receipts; no overall level for an incomplete vector; program coverage stays Unknown with no program list. |
| “Representative”, never “agent” | Pass. Zero occurrences in visible text. |
| Vocabulary | Pass. Practice, Representative, Staff, Client, Case, Draft assessment and Signed plan. |
| Advice only from a licensed Representative; personalised output only as a Signed plan | Pass. Drafts carry lf.draft-assessment (“The Client cannot see this draft”); proposed text is Practice-only until a Representative adopts it; the Client mirror and Tasks show only factual questions. |
| Licence verification is manual | Pass. Priya’s licence check shows as manual, requested 10 Nov, not done; creating a Practice or joining verifies no one. |
| Excluded scope shown, not dropped | Pass. Siobhán’s family sponsorship stays visible as Out of scope beside the continuing work permit subject. |
| Escalation to a person | Pass. Status within 90 days (Fatima, 39 days; Zhang Wei, 62 days) shows the urgent chip; refusal, removal, criminality and health are screening answers; acknowledgment never clears escalation; Staff can track but not acknowledge. |
| CLB/NCLC conversion on the Representative side | Pass. Three supported skills with receipts, speaking unknown, French TEF column-not-stated and “conversion not turned on yet” states. |
| True states only | Pass. Saved only after acknowledgment; capture is “Captured, not sent”; review requested is not “Representative reviewing”; processing failure is a service problem; no response times or invented contacts. |
| No Practice-wide totals; administration gives no Case access | Pass. Counts are “assigned to you” only; Practice screens show no Case counts. |
| Government marks | Pass. None; canada.ca appears only as a cited source. |

## Accessibility review (WCAG 2.2 AA target)

**Date:** 2026-11-18. **Scope:** every desk screen, every narrow screen, the Client Tasks phone and both N02 captures in `index.html`.

### Summary after fixes

| Check | Result |
| --- | --- |
| Screens checked | 36 |
| Text nodes measured | 1681 |
| Text below its contrast minimum | 0 |
| Lowest text contrast | 5.18:1 (needs 4.5) |
| Interactive controls | 340 |
| Targets under 24 by 24 px | 0 |
| Client-facing buttons under 44 px | 0 |
| Client-side text under 13 px | 0 |
| Inputs without a label | 0 |
| Controls focused without a visible focus style | 0 of 331 |
| Screens without exactly one `h1` | 0 |
| Duplicate IDs | 0 |
| Narrow screens overflowing at 320 px | 0 |

### Findings fixed in this pass

| Finding | Criterion | Resolution |
| --- | --- | --- |
| Error-summary links were 18 px tall on the desk. | 2.5.8 Target size | Fixed: links in every error summary are at least 24 px. |
| The registry key under the Client invitation email rendered at 12 px. | Amendment: Client text 13 px | Fixed: Client-side registry keys and chips are 13 px or more. |
| Narrow phones stretched their rows to fill a fixed-height screen, so the first rows sat far apart. | 1.3.2 Meaningful sequence (visual) | Fixed: narrow content aligns to the top. |

### Perceivable

| # | Item | Criterion | Status |
| --- | --- | --- | --- |
| 1 | Every state and turn pairs colour with a glyph or disc and a word | 1.4.1 | Pass |
| 2 | Text contrast on real backgrounds, including tints, the urgent fill and selected rows | 1.4.3 | Pass |
| 3 | Input borders, check and radio outlines, glyphs and dashed neutral discs | 1.4.11 | Pass (Relay tokens: `--input` 3.30:1) |
| 4 | Tables with captions and scoped headers; fieldsets with legends; description lists for receipts | 1.3.1 | Pass |
| 5 | Every narrow screen reflows at 320 px with the longest names | 1.4.10 | Pass |

### Operable

| # | Item | Criterion | Status |
| --- | --- | --- | --- |
| 1 | Visible focus on every control; the ring is Relay’s ultramarine, distinct from the Practice blue | 2.4.7 | Pass |
| 2 | Sticky or pinned bars must not hide focus | 2.4.11 | Build requirement: `scroll-padding` |
| 3 | Targets at least 24 px; Client buttons at least 44 px | 2.5.8 | Pass |
| 4 | Every shortcut has a visible button; no single-key signing; single keys only when their region has focus | 2.1.4 | Pass in markup; build requirement |
| 5 | No hover-only or drag-only action | 2.5.7 | Pass |

### Understandable

| # | Item | Criterion | Status |
| --- | --- | --- | --- |
| 1 | Errors name the item and how to fix it, with a linked summary that takes focus | 3.3.1, 3.3.3 | Pass |
| 2 | Review before consequential actions: create, submit, acknowledge, request review | 3.3.4 | Pass |
| 3 | Disabled actions carry their reason next to them | 3.3.2 | Pass |
| 4 | Same turn words on every screen of the desk | 3.2.4 | Pass |

### Robust

| # | Item | Criterion | Status |
| --- | --- | --- | --- |
| 1 | Discs and glyphs `aria-hidden`; holders carry “Whose turn:” or “Status:” | 4.1.2 | Pass |
| 2 | Save state and toasts `role="status"`; error summaries `role="alert"`; dialogs `alertdialog` with a label | 4.1.3 | Pass |
| 3 | Unique IDs; every radio group has its own name | 4.1.1, 4.1.2 | Pass |

### Not verified here

Screen reader output in real assistive technology, keyboard order in the built app, 200% zoom of the desk, the dark theme (not rendered in round 1), and testing with real Staff and Representatives. The pilot is English only. The concepts load IBM Plex from Google Fonts by URL, as the Relay specimen does; the app must self-host it.

## Open items held for the owner

- Approve the “Review requested” state chip and the colleague first-name holder word (all five concepts).
- Register `lf.workforce-invitation.v1.en`; until then R03 create and R02 accept stay off.
- A fixed order for work that loops.
- Holder in the card footer on the board.
