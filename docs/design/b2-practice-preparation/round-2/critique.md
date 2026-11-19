# Critique: B2 round 2, Triage Desk with Client mirror

Checked on 2026-11-19 against:

- the approved Relay system (DESIGN.md, approved.html, decision.md, tokens) and its 2026-11-18 amendments;
- the owner's decisions of 2026-11-19 (base design, self-role, the four visual details, legal copy);
- the B2 tickets #111 to #114 and surface rows R01, R02, R03, R05 to R09 and N02;
- the tenancy and authorization, Representative verification and legal-floor decisions;
- the approved B1 Checklist (`docs/design/b1-access-and-intake/approved.html`, reply page L2);
- round 1's Triage Desk and Request Ledger critiques.

Method: a review of every rendered screen plus an automated Playwright pass. There are 48 screens: 41 desk screens at 1440 px, 2 at 1280 px and 5 at phone width. The pass measured every text node against its real composited background, every interactive target, focus styles, labels, headings, duplicate IDs, Client text size and button height, and the reflow at 320 px of every phone and every Client mirror frame. **Held until the owner reacts.** Findings marked "Held" keep the concept as the owner chose it.

## Design critique

### Overall impression

Round 1's fastest desk, with its main weakness answered:

- At 1440 px the Case pane is 776 px.
- The queue folds to a 56 px rail when the Case needs more room.
- The new Facts and Draft tab puts each fact in the same row as the finding that uses it.

The Client mirror is the round's strongest addition. Daniel sees the row in the Client's Tasks and the page they open, at Client sizes, before Send. The mirror also shows that Drafts, proposed text and notes never reach the Client.

### Usability

| Finding | Severity | Resolution |
| --- | --- | --- |
| A2 and A3 (10 Nov) named Priya "Representative" in the sidebar while the receipt said Staff. Round 1 carried this over. | Major | Fixed: "Staff · Practice administrator" until cadet2 verifies the licence on 12 Nov. |
| Round 1 let Priya change her own work role. The owner ruled that nobody grants themselves Representative. | Major | Fixed: the request, pending, verified, held, not verified, recheck due and cancelled states (A6 to A8, S14). Priya's own work-role radios are off, with the reason. |
| The current step "Register lookup by cadet2" was drawn in Practice blue, though cadet2 acts, not the Practice. | Moderate | Fixed: neutral step, matching the neutral "Processing" holder. |
| "Send question" was a primary button beside the header's primary "Request review". | Minor | Fixed: secondary, as in round 1. |
| The Staff submission statement had a blue left edge. Blue means the Practice's turn. | Minor | Fixed: plain legal block. |
| A6 to A8 and S14 (11 and 12 Nov) showed the 15 Nov sidebar with 26 Cases. | Minor | Fixed: the early sidebar, with no Case counts. |
| In Facts and Draft, the second finding for one fact fell into the fact column. | Minor | Fixed: findings that share a fact stack in the finding column. |
| At 1280 px with the queue open, the mirror stacks above Send. Both mirror views push Send to 2,006 px in an 800 px window (L4). | Moderate | Held: folding the queue at 1280 px gives a 1000 px pane with the mirror beside the composer. A build could show one mirror view at a time. |
| At 1440 px the mirror's Tasks view ends at 953 px, just past the 900 px fold, and the opened page needs a scroll. Send stays in view at 616 px. | Minor | Held: the mirror is sticky beside the composer, so it stays visible while the fields scroll. |
| The Facts and Draft tab adds a seventh Case tab. | Minor | Held: one tab at every width. It is side by side from a 720 px pane and stacked below that. |
| The mirror is 360 px wide, not B1's 390 px phone. | Minor | Held: 360 px is a common small phone and fits two columns in the 776 px pane. E2 shows the same page at 390 px, and both are checked at 320 px. |
| Fact cells are short beside long findings with receipts, which leaves white space. | Minor | Held: row alignment is the point of the pattern. |

### Visual hierarchy

- **First thing the eye lands on.** On the desk: the urgent group and its solid chips, then the selected Case's turn line. On D3: the composer fields, then the amber Client turn bar at the top of the mirror. That is correct: the mirror's colour is the Client's, because that is whose screen it shows.
- **Reading flow.** Views, the queue grouped by who acts next, then the Case: name, turn line, chips, tabs. On D3 it reads composer, then "What Oluwaseun will see", then the opened page.
- **Emphasis.** Colour appears only on states, turns, links and focus. The selected row's edge is graphite (`--foreground`), so lake blue means only the Practice's turn. Up to four colours per queue row, as in round 1.

### Consistency with Relay

| Element | Observation | Recommendation |
| --- | --- | --- |
| Turn colours | Amber is only the Client, blue only the Practice, green done, violet signed. A licence check held by cadet2 uses the neutral treatment, with the holder word "Processing". | Keep |
| Desk chips | None tinted. Neutral fill and hairline, glyph in role colour, word in role ink (decision 8). The only tinted chips on desk screens are Client chips inside the mirror, drawn as the Client sees them. | Keep |
| Selected row | 2 px graphite edge on all 30 selected rows, measured. | Keep |
| Keyboard hints | 12 px on all 95 hints, measured. | Keep |
| Client text | Every Client style uses a client token. The smallest Client text is 13.5 px (the small chip token, `--chip-fs-sm`). Holder words, tab labels, the wordmark tag, the task badge, registry keys, pending-counsel marks, eyebrows, section labels and row metadata use the 15 px Small or Label tokens. No 13 px value remains. | Keep. B1's build should take the same tokens so the Checklist matches across batches. |
| Licence check words | "Licence check pending", "Licence check held", "Not verified", "Recheck due" and "Request cancelled" are neutral chips under the approved "not confirmed" treatment. Verified is a receipt line. | Approve the wording |
| Placeholder legal text | Registry text with the pending-counsel mark and key, plus a dashed "Placeholder text, drafted 19 Nov" tag. | Keep until the registry supplies the final strings |
| Components | Relay desk, holder, turn line, QueueRow, CheckAnswersRow, findings, ProvenanceRow, DraftNotice, ErrorSummary, SaveState, ClientQuestionComposer, FactsAndConclusion parts, dialogs and toasts. The new compositions are the Client mirror, the queue rail and the Facts and Draft tab. | Approve the compositions |

### What works well

- The mirror shows both the Tasks row and the opened page. E2 is the same page on the Client's phone, so "exactly as the Client will see it" can be checked screen against screen.
- Placing the mirror beside the composer makes the Practice-only material visibly absent: proposed text and the private note sit in the composer column, never in the mirror.
- The queue rail keeps your position (2 of 11), previous and next, and the urgent Case one step away, so folding never loses your place.
- Facts that no finding uses say so, so nothing looks assessed that isn't.
- The self-role flow attributes the role change to the licence check, not to Priya. Practice administration is shown as unchanged throughout.
- Workforce create and accept are on, and the wording can't silently fall back: S7 shows the action off when the registry can't supply the text.

### Priority recommendations

1. Decide whether the self-role rule also applies when an administrator changes another member to Representative (see the open items).
2. Test with Staff whether the fold (⌘ \) and the Facts and Draft tab are found without prompting.
3. In build, consider one mirror view at a time when it stacks, to keep Send near the fields at 1280 px.

## Brief and guardrail check

| Constraint | Result |
| --- | --- |
| Relay tokens only | Pass. No new colour, role or token. The rail, mirror and Facts and Draft tab use existing tokens. |
| "Representative", never "agent" | Pass. Zero occurrences in screen text. |
| Honest Drafts | Pass. The registry's Draft notice says the Client can't see the Draft. The mirror lists what never reaches the Client. Proposed text stays Practice-only until a Representative adopts it. |
| No scores, odds, rankings, confidence or "fastest" | Pass. The only hits in screen text are negations: "No program list, points or ranking is produced" and "Immigration outcomes are not guaranteed". |
| Excluded scope shown | Pass. Siobhán's family sponsorship stays visible as Out of scope (S12). The scope line sits on the Facts and Draft tab. |
| Escalation to a person | Pass. Urgent handoffs as in round 1. Staff can track but not acknowledge. A Staff member waiting on a licence check can't acknowledge either. |
| CLB/NCLC conversion on the desk | Pass. Three supported conversions with receipts, speaking unknown and no overall level, now beside the band each one uses. |
| True states only | Pass. The licence check promises no time. Verified is attributed to cadet2. Held, not verified, recheck due and cancelled leave the role as it really is. The mirror shows no half-written question (S15). Capture is "Captured, not sent". |
| Nobody grants themselves Representative | Pass. Priya's own Representative radio is off, and the role changes only on verification by a cadet2 reviewer who isn't Priya. |
| Staff submission never invents Client assent | Pass. The statement names Daniel Okafor (Staff) and says submitting "does not record the Client's agreement, confirmation or consent". The Client-only confirmations stay separate gates. |
| No Practice-wide totals; administration gives no Case access | Pass. Member screens show no Case counts. Licence evidence stays with cadet2. |

## Accessibility review (WCAG 2.2 AA target)

**Date:** 2026-11-19. **Scope:** every desk screen, every phone screen, every Client mirror frame and both N02 captures in `index.html`. The same pass ran on `preview.html`, whose miniatures are scaled pictures marked `inert`.

### Summary

| Check | `index.html` | `preview.html` |
| --- | --- | --- |
| Screens checked | 48 (43 desk, 5 phone) | 6 (3 desk, 3 phone) |
| Text nodes measured | 4,752 (105 Client) | 501 (68 Client) |
| Text below its contrast minimum | 0 | 0 |
| Lowest text contrast | 4.88:1 (needs 4.5) | 5.18:1 |
| Interactive controls | 1,069 | 0 live (103 inert) |
| Targets under 24 by 24 px | 0 | 0 |
| Client buttons under 44 px | 0 of 3 | 0 of 2 |
| Client text under 13 px | 0 (smallest 13.5 px, chip token) | 0 |
| Inputs without a label | 0 | 0 |
| Controls focused without a visible focus style | 0 of 1,047 | none focusable |
| Screens without exactly one `h1` | 0 | 0 |
| Duplicate IDs | 0 | 0 |
| Phone and mirror frames overflowing at 320 px | 0 of 9 | 0 of 5 |

In `index.html`, 12 controls could not take focus in the pass: the citation links inside closed receipts on D1 and L1 to L3. They take focus once the receipt is open. The lowest pair (4.88:1) is destructive text on a selected row, unchanged from round 1. The mirror's Client buttons are drawn at the Client's 48 px, and the check counts them.

### Findings fixed in this pass

| Finding | Criterion | Resolution |
| --- | --- | --- |
| The rail's urgent link was 16 px wide. | 2.5.8 Target size | Fixed: 44 by 44 px. |
| Preview miniatures held 103 live, half-size controls. | 2.5.8, 2.4.3 | Fixed: miniatures are `inert` pictures. Full-size controls are in `index.html`. |
| Client row metadata, turn-bar detail, eyebrows and section labels were 14 px, and round 1's holder words, tab labels and badge were 13 px. | Owner decision (c) | Fixed: 15 px Small and Label tokens. The task badge grows to 24 px. |

### Perceivable

| # | Item | Criterion | Status |
| --- | --- | --- | --- |
| 1 | States and turns pair colour with a glyph or disc and a word, including the licence check chips and the neutral current step | 1.4.1 | Pass |
| 2 | Text contrast on real backgrounds, including the mirror's tints and selected rows | 1.4.3 | Pass |
| 3 | The graphite selected edge against `--accent` and input borders | 1.4.11 | Pass |
| 4 | Facts and Draft pairs are lists of fact and finding. The column labels are visual only, because each fact and finding carries its own label. | 1.3.1 | Pass |
| 5 | Phones and mirror frames reflow at 320 px with the longest names | 1.4.10 | Pass |

### Operable

| # | Item | Criterion | Status |
| --- | --- | --- | --- |
| 1 | Visible focus on every control | 2.4.7 | Pass |
| 2 | The queue fold has a visible button with `aria-expanded`. ⌘ \ is the shortcut, so no single-key shortcut is added. | 2.1.4 | Pass |
| 3 | The sticky mirror must not hide focused fields | 2.4.11 | Build requirement: `scroll-padding` |
| 4 | Nothing in the mirror can be focused or pressed. It is static markup, so it can't be mistaken for a live screen. | 2.4.3 | Pass |

### Understandable

| # | Item | Criterion | Status |
| --- | --- | --- | --- |
| 1 | The composer error names the field and the fix, with a linked summary (S15) | 3.3.1, 3.3.3 | Pass |
| 2 | Review before consequential actions: request licence check, submit with the Staff statement, request review | 3.3.4 | Pass |
| 3 | Disabled actions carry their reason, including Priya's own work-role radios | 3.3.2 | Pass |

### Robust

| # | Item | Criterion | Status |
| --- | --- | --- | --- |
| 1 | The mirror is an `aside` labelled "Preview: what Oluwaseun will see"; the turn bar inside is labelled "as the Client will see it" | 4.1.2 | Pass |
| 2 | Toasts are `role="status"`, the error summary is `role="alert"`, and the request dialog is `role="dialog"` with a label | 4.1.3 | Pass |
| 3 | IDs are unique, and every copied screen's IDs and radio names are suffixed | 4.1.1 | Pass |

### Not verified here

- Screen reader output in real assistive technology, including how the mirror is announced.
- Keyboard order in a built app.
- 200% zoom of the desk; the stacked Facts and Draft layout is the intended high-zoom layout.
- The dark theme.
- Testing with real Staff and Representatives.

The pilot is English only. IBM Plex loads from Google Fonts by URL, as in the specimen; the app must self-host it.

## Open items held for the owner

- Does "only after licence check" also apply when an administrator changes *another* member to Representative? The tenancy decision lets administrators change work roles, and lets a pending Representative prepare but not sign. The concept applies the rule to self-requests only.
- Approve the round-1 additions still open: the "Review requested" chip and a colleague's first name as a holder word.
- Approve the three new compositions (Client mirror, queue rail, Facts and Draft tab) and the licence check wording.
- The final strings for `lf.workforce-invitation.v1.en` and the Staff variant of `lf.intake-submit.v1.en` come from the registry, replacing the placeholders. `decision.md` should record that when this round is approved.
