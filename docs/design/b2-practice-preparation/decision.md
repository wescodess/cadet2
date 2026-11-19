# B2 Practice and preparation: design decision

Date: 2026-11-19
Gate: UI design gate, batch B2 (R01, R02, R03, R05 to R09 and N02), two rounds
Status: approved by the owner
Approved design: [approved.html](approved.html), round 2, Triage Desk with Client mirror
Tickets this record serves: #111, #112, #113, #114

## Read before building any B2 screen

1. [approved.html](approved.html): the approved round-2 concept, all 48 screens, states and components.
2. This file, especially [Build rules that differ from the approved screens](#build-rules-that-differ-from-the-approved-screens).
3. [round-2/presentation.md](round-2/presentation.md) and [round-2/critique.md](round-2/critique.md): what changed from round 1, the checks, and the build requirements.
4. Root `DESIGN.md` and `docs/design/system/` (PR #161), including the 2026-11-19 amendment: the "Review requested" chip, a colleague's first name as a holder word, and Client text on the 15 px tokens.
5. `docs/design/b1-access-and-intake/approved.html` and `decision.md` (PR #162). The Client side of B2 is the B1 Checklist, built at 15 px as recorded there on 2026-11-19.
6. The decisions B2 builds on, each on its PR until merged:
   - `docs/decisions/tenancy-and-authorization.md` (PR #57): Practices, memberships, work roles and administration;
   - `docs/decisions/representative-verification-and-signature.md` (PR #62): the manual licence check;
   - `docs/decisions/legal-floor-content.md` (PR #65), with the B2 drafts in PR #165;
   - `docs/decisions/surface-inventory-and-ui-batches.md` (PR #70): the surface rows this batch covers;
   - `docs/decisions/intake-scope-and-escalation.md` (PR #64), `docs/decisions/case-lifecycle-and-audit.md` (PR #66), `docs/decisions/assessment-contract.md` (PR #52) and `docs/decisions/consent-retention-and-data-rights.md` (PR #59): preparation, handoff, Draft findings and sharing.

The build rules below win over `approved.html`. `approved.html` wins over the round-1 and round-2 presentations and critiques where they differ.

## What was chosen and why

**Round 2, Triage Desk with Client mirror.** It combines round 1's concept 1 (Triage Desk) and concept 2 (Request Ledger): Relay's desk of views, a queue grouped by who acts next and the selected Case beside it, with Request Ledger's Client mirror beside the question composer.

Why, from the round-1 recommendation and the round-2 critique:

- It is Relay's approved desk anatomy, so it adds the fewest new compositions: the lowest system and build risk for a High-risk batch.
- It suits triage: many Cases, the urgent group first, the next actor on every row, and acting without losing your place.
- Consequential actions (submit, acknowledge, request review, request licence check) open dialogs that say exactly what will be recorded and who can't do it.
- The mirror shows Daniel the row in the Client's Tasks and the page they open, at Client sizes, before Send. Drafts, proposed text and private notes never appear in it.
- Round 2 answers round 1's weakness. The desk is shown at Relay's 1440 px, giving a 776 px Case pane. The queue folds to a 56 px rail (⌘ \\). A Facts and Draft tab pairs each fact with the finding that uses it.

New compositions approved with it, none adding a token: the Client mirror, the queue rail, the Facts and Draft tab, the licence check wording ("Licence check pending", "Licence check held", "Not verified", "Recheck due", "Request cancelled"; verified is a receipt line) and the placeholder tag.

## What was rejected

Round 1 offered five concepts. Concepts 1 and 2 were combined into the approved option, so their round-1 files are kept as rejected versions too.

| Concept | File | Idea |
|---|---|---|
| 1. Triage Desk | [rejected-1-triage-desk.html](rejected-1-triage-desk.html) | Relay's three panes with Case tabs and dialogs; combined into the approved option. Its round-1 form had a 616 px Case pane at 1280 px, and tabs hid the link between a fact and its finding. |
| 2. Request Ledger | [rejected-1-request-ledger.html](rejected-1-request-ledger.html) | The desk-side mirror of the Client's B1 checklist, with item pages and a live mirror; its mirror was combined into the approved option. As a whole it cost round trips, and findings sat a page away from facts. Runner-up. |
| 3. Stations | [rejected-1-stations.html](rejected-1-stations.html) | Six gated stations per Case. Poor for work that loops back, a cramped six-column board, and a rail that can read as progress toward approval. |
| 4. Case Record | [rejected-1-case-record.html](rejected-1-case-record.html) | One numbered Case document with margin notes. Long pages, the turn line scrolls away, and in-place editing is harder for focus. Its margin of origins is worth keeping for B3 review and B5 history. |
| 5. Fact Grid | [rejected-1-fact-grid.html](rejected-1-fact-grid.html) | Keyboard grids with an inspector. The ARIA grid with cell editing is the riskiest pattern for screen readers, and rows carry five colours. |

## The owner's questions and answers

### Round 1 (2026-11-19)

The questions are quoted from the orchestrator's decision queue (Q-20261119-1 to -4). The answers are the owner's exact words.

1. **Concept.** "Pick one of the five concepts (Triage Desk, Request Ledger, Stations, Case Record, Fact Grid), or combine them, which means a round 2."
   Answer: "Triage Desk + Ledger mirror (Recommended)". This led to round 2 with one refined option.
2. **Own work role.** "May a Practice administrator change their own work role to Representative?"
   Answer: "Only after licence check (Recommended)".
3. **Visual details.** "(a) neutral desk chips (neutral chip with a coloured glyph and word), which settles discrepancy 8; (b) selected-row edge in graphite, not focus blue, because blue means the Representative's turn; (c) client small text at 15 px with existing tokens, no new 13 px token (Q-20261118-2); (d) desk keyboard hints raised from 11.5 to 12 px."
   Answer: "Accept all four (Recommended)". This also answers Q-20261118-2: keep the 15 px existing tokens, and desk hints at 12 px.
4. **Legal copy.** "`lf.workforce-invitation.v1.en` is reserved but empty, so all concepts show creating and accepting workforce invitations as switched off. `lf.intake-submit.v1.en` is in the Client's voice; Staff submissions show only its receipt wording."
   Answer: "Yes, draft both now (Recommended)".

### Round 2 (2026-11-19)

Questions and answers quoted exactly.

1. Question: "B2 round 2 is shown above: Triage Desk with the Client preview beside the question box, plus your choices from last round. Full version in PR #164. Do you approve it and are you satisfied, or do you want changes?"
   Answer: "Approve, satisfied (Recommended)".
2. Question: "Should "only after a licence check" also apply when an administrator makes another member a Representative? This design applies it only when someone asks for the role themselves."
   Answer: "Yes, always (Recommended)".
3. Question: "The approved B1 Checklist uses 14 px for some Client text. B2 now uses 15 px for those. Should B1 be built at 15 px too, so the Client screens match?"
   Answer: "Yes, match at 15 px (Recommended)".
4. Question: "Approve the two small additions still waiting from round 1? A "Review requested" status chip (in the progress style, with a send icon), and showing a colleague's first name ("Daniel") to mark whose turn it is on the desk."
   Answer: "Approve both (Recommended)".

## Build rules that differ from the approved screens

1. **Every Representative role waits for a licence check.** From round-2 answer 2, any Representative role starts only after a different cadet2 admin verifies the licence, whoever asks. That includes a role an administrator sets for another member. `approved.html` shows the rule only for self-requests (A6 to A9, S14). The build extends it: when an administrator chooses Representative for another member, the member keeps their current work role and the request goes through the same states (licence check pending, held, not verified, recheck due, cancelled, verified as a receipt line). The verifying cadet2 admin is never the member or whoever asked.
2. **Legal wording comes from the registry.** The final wording for `lf.workforce-invitation.v1.en` and `lf.intake-submit-staff.v1.en` comes from the legal-copy registry. Those drafts are in PR #165, pending counsel. The placeholder text in `approved.html` (A3, A4, N3, C3, C4) is not the source. Its "Placeholder text, drafted 19 Nov" tag goes once the registry supplies the strings; the "Draft wording, pending counsel" mark and key stay until counsel approves. S7 shows the action off when the registry can't supply the wording.
3. **The approved additions lose their flag.** The "Review requested" chip and a colleague's first name as a holder word are approved (round-2 answer 4) and recorded in `DESIGN.md`. In `approved.html` the chip carries a dashed `--seal` outline (`.is-flagged`) that marked it as unapproved. The build drops that outline.

## Known weakness

At 1280 px with the queue open, the Case pane is under 760 px, so the Client mirror stacks above Send. With both mirror views showing, Send is pushed to 2,006 px in an 800 px window (L4). Folding the queue (⌘ \\) fixes it: the pane becomes 1000 px and the mirror sits beside the composer again. The critique suggests the build could show one mirror view at a time when it stacks. At 1440 px Send stays in view at 616 px.

## Files in this record

`approved.html` and the five `rejected-1-*.html` files are byte-identical copies. Do not edit them.

| File | Copy of | SHA-256 |
|---|---|---|
| `approved.html` | `round-2/index.html` | `e08e725b68caa073ac471e00e9ff9fa73dd3e80365b01ff73cff2233fccdc2c5` |
| `rejected-1-triage-desk.html` | `round-1/1-triage-desk/index.html` | `99d048fd37657715b09da48596d37f29369f22590c13743edfeb07be808a32c5` |
| `rejected-1-request-ledger.html` | `round-1/2-request-ledger/index.html` | `88766e4a73f67fad39c3f59f4c500fb94415badc8e7f7077cfcece6b211603af` |
| `rejected-1-stations.html` | `round-1/3-stations/index.html` | `f9bfbaada4d7632a2ef1d8c788adc0133e90bd056e6bb3aad6a5d42b76804c5f` |
| `rejected-1-case-record.html` | `round-1/4-case-record/index.html` | `7b9b4edeb4267d01e3ddc1fc4a32816e9aa2d9868f20ab9122cdfa71f1074617` |
| `rejected-1-fact-grid.html` | `round-1/5-fact-grid/index.html` | `400aa860fdc8e0777c460b1c344c0c1e1bc8ff08dc3484224f7ae036754a4130` |

`round-1/` and `round-2/` hold everything the owner saw: each round's `presentation.md`, and per concept the full `index.html`, the 728 px `preview.html` board, `mobile.png`, `flow.png` and `critique.md`. Their statements that nothing is approved describe each round before this decision.

## Build requirements carried from the critiques

Not verifiable in a static concept:

- Real screen reader output, including how the mirror is announced; keyboard order in the built app; 200% zoom of the desk, with the stacked Facts and Draft layout as the high-zoom layout; the dark theme; testing with real Staff and Representatives.
- `scroll-padding` so the sticky mirror and sticky bars never hide a focused field.
- Focus trapped and returned in dialogs.
- Shortcuts stay off single keys or can be remapped; the queue fold has a visible button with `aria-expanded`.
- The mirror stays static markup that can't be focused or pressed.
- Self-hosted IBM Plex; the concepts load it from Google Fonts.
- All copy is English, and all fixtures are synthetic.
