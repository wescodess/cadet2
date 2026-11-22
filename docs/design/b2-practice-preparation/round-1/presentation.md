# B2 Practice and preparation, round 1: five concepts

Date: 2026-11-18. Path: the UI design gate, round 1, for batch B2 (R01, R02, R03, R05, R06, R07, R08, R09 and N02; tickets #111 to #114). Nothing here is approved, and no app code changes. All five concepts use the approved Relay system: its tokens, IBM Plex, the glyph, word and colour state language, the turn colours (amber Client, lake blue Representative or Practice, green done, violet signed), the holder column and turn line, and Relay’s component styles and target sizes. They apply the two amendments the owner approved on 2026-11-18: the neutral “no turn” treatment, and Client-side text of at least 13 px.

## The shared story

Every concept tells the same synthetic story, continuous with B1:

1. **Practice and workforce (R01, R03, N02, R02).** Priya Raman, RCIC, uses an operator-provisioned grant to create Harbourline Immigration. One change creates the Practice and her first membership: Staff plus Practice administrator. She later changes her own work role to Representative, and her licence check stays manual and not done. She invites Daniel Okafor as Staff. Daniel opens the generic N02 message and sees the exact Practice, role and administrator capability. Priya then manages members: a pending invitation for Marie-Ève Tremblay-Kowalczyk, a suspended and a removed member, an expired invitation, the last-administrator rule and a minimized audit with no Case content.
2. **Client invitation and caseload (R06, N02, R05).** Priya invites Oluwaseun Adébáyọ̀-Fitzgerald, previewing the exact message and what the Client sees after signing in. The receipt says “Captured for the synthetic pilot. Not sent.” Her caseload shows 26 Cases assigned to her, and only hers, grouped by who acts next. Worst-case data includes long names, two urgent Cases, an unassigned Case, a processing failure, a Case whose rule-change impact hasn’t been checked, and an empty caseload for a new Staff member.
3. **Preparation and handoff (R07).** Daniel opens Oluwaseun’s revision 3, the B1 submission of 2:52 pm, 17 Nov. He enters two facts the Client gave him by phone (job offer No, dependants 0), each recorded with its origin. He checks the Client-only confirmations he can’t affirm and submits revision 4 on purpose. The receipt names him as submitter and says where each fact came from. On Fatima Al-Zahraa Haddad’s urgent Case (permit expires in 39 days), Daniel can track the handoff but can’t acknowledge it. Priya acknowledges revision 2 and records “contact recorded”, and escalation stays required.
4. **Draft and review request (R08, R09).** Draft 2 shows three supported skill conversions with full receipts: reading 7.0 to CLB 9, writing 6.5 to CLB 8, listening 8.0 to CLB 9. Speaking is unknown, so the four-skill summary is incomplete. Accepted test version and result age are unknown, and named-program coverage is Unknown. Daniel sends the Client a factual question, adds proposed Client text and a private note, and requests Priya’s review with every open item and its holder. Priya’s queue shows “Review requested”, not “Representative reviewing”.
5. **The Client side (B1).** The question lands in the Client’s B1 Checklist Tasks with who asked and when, beside Priya’s earlier “Check your permit’s expiry date”.

Every legal sentence is the registry’s exact draft text, marked “Draft wording, pending counsel”, with its key. One reserved entry, `lf.workforce-invitation.v1.en`, has no text yet. So in every concept, R03 “Create invitation” and R02 “Accept and join” are off with a reason, and the slot says the wording isn’t registered. The story continues as if it were registered, and the receipt screen after it is labelled that way.

## How to look at them

| Concept | Board (728 px, for chat) | Full concept | Screenshots | Critique |
| --- | --- | --- | --- | --- |
| 1. Triage Desk | [preview](1-triage-desk/preview.html) | [index](1-triage-desk/index.html) | [mobile](1-triage-desk/mobile.png), [flow](1-triage-desk/flow.png) | [critique](1-triage-desk/critique.md) |
| 2. Request Ledger | [preview](2-request-ledger/preview.html) | [index](2-request-ledger/index.html) | [mobile](2-request-ledger/mobile.png), [flow](2-request-ledger/flow.png) | [critique](2-request-ledger/critique.md) |
| 3. Stations | [preview](3-stations/preview.html) | [index](3-stations/index.html) | [mobile](3-stations/mobile.png), [flow](3-stations/flow.png) | [critique](3-stations/critique.md) |
| 4. Case Record | [preview](4-case-record/preview.html) | [index](4-case-record/index.html) | [mobile](4-case-record/mobile.png), [flow](4-case-record/flow.png) | [critique](4-case-record/critique.md) |
| 5. Fact Grid | [preview](5-fact-grid/preview.html) | [index](5-fact-grid/index.html) | [mobile](5-fact-grid/mobile.png), [flow](5-fact-grid/flow.png) | [critique](5-fact-grid/critique.md) |

Each `index.html` opens with the idea and trade-offs, then:

- A, Practice and workforce;
- B, Client invitation and caseload;
- C, preparation and handoff;
- D, Draft and review request;
- E, the Client side;
- the narrow views at 390 px (checked at 320 px);
- 13 states;
- the two N02 captures;
- the components used, with any flagged addition.

Desk screens are 1280 px; a dashed line marks the bottom of a 1280 by 800 window. `flow.png` is a storyboard of what each flow screen shows in that window. `mobile.png` is the concept’s narrow caseload.

## What all five share

- **The same content, rules and story.** Only the structure and interaction differ. Each concept shows the same 13 states: loading; nothing assigned; no filter match, with the impact-unknown Case still shown; unavailable, which is not empty; offline save with a revision conflict; a Client-only confirmation blocking submit; pending counsel and unregistered wording; failed, unknown and unavailable handoff outcomes; processing, failure and language conversion not enabled; last administrator and a held Practice; ended invitations and lost authority; out of scope kept visible; and wrong account.
- **Whose turn, everywhere.** Every row ends in a holder and every Case header has a turn line. Amber means the Client. Blue means the Practice: “You”, a colleague’s first name, or “Unassigned”. Green means done and violet means signed. When nobody holds the turn, the approved neutral treatment says so: Processing, Ended, No action or Not yet.
- **Honest preparation.** Saving never submits. Staff entries are attributed with their origin. Client-only confirmations (email, 18 or older, sharing) are shown as gates Staff can’t tick. Safety answers can’t be changed by note, and a newer revision invalidates a pending acknowledgment. Documents and dates stay honest until B4: document sharing shows “Not available yet”, and dates are reported facts with their source.
- **Honest Draft findings.** The registry’s Draft notice says the Client can’t see it. Language criteria are separate findings with receipts, and a missing skill stays unknown, never zero. No overall level is shown for an incomplete vector, and named-program coverage is Unknown. A processing failure is a service problem, never a finding about the Client. There are no scores, odds, rankings, confidence or “fastest”.
- **No Practice-wide totals, no Case content for administration.** Counts are always “assigned to you”. Practice screens show members, invitations, settings and a minimized audit only.
- **R02 reuses B1’s focused page in all five.** Workforce invitation acceptance is an account-holder page, not desk work, so ticket #111’s “reuse B1 legal/auth/context patterns” applies as is. The same goes for wrong account.
- **The Client side is the approved B1 Checklist.** It is unchanged, with Client text at 13 px or more and 48 px buttons.
- **Desk chips are neutral.** Every concept follows DESIGN.md’s text: a neutral chip with a coloured glyph and word, which keeps dense rows quiet. The specimen’s screenshots showed tinted desk chips (decision.md, discrepancy 8). These concepts settle that discrepancy in favour of the system text unless the owner says otherwise.

## The five concepts

### 1. Triage Desk

**Idea.** Relay’s desk, extended to B2. Views of your own Cases sit on the left, the queue in the middle and the selected Case beside it, so you never lose your place. The Case pane splits into tabs (Facts, Sharing, Requests, Handoff, Draft, Notes), and consequential actions open a dialog over the desk.

| Best at | Worst at |
| --- | --- |
| Speed and continuity: triage, open, act and move on without losing context; keyboard-first; closest to the approved Relay desk and the least new to build. | Room: at 1280 px the Case pane is 616 px, so facts and Draft can’t sit side by side and tabs hide context; administration is squeezed into a queue shape. |

### 2. Request Ledger

**Idea.** The Practice side of the Client’s B1 checklist. A Case is a ledger with the same sections the Client sees plus a Practice-only section, and every item ends in who holds it. An item opens a focused page and returns to the ledger. Beside it, a live mirror shows the Client’s Tasks exactly as they will appear.

| Best at | Worst at |
| --- | --- |
| Coherence with B1 and the hand-off: one pattern everywhere, and the mirror proves Drafts and notes never reach the Client while questions do. | Depth of review: ledger and item pages cost round trips, findings sit a page away from facts, and the mirror takes 392 px. |

### 3. Stations

**Idea.** Each Case moves through six named stations: connection and sharing, facts, check and submit, safety and scope, Draft findings, then notes and the review request. A rail shows each station’s state and holder. Each station is one page, with open items, their holders and the gate to the next station beside the work. The caseload is a board of the same stations.

| Best at | Worst at |
| --- | --- |
| Preventing the wrong step and naming every blocker’s owner; the clearest path for new Staff. | Work that loops back (a question while a Draft exists); a cramped six-column board; a rail that can be misread as progress toward approval. |

### 4. Case Record

**Idea.** A Case is one continuous, numbered record, with a section index and a margin for origins, sources and private notes. Sections are edited in place. The caseload is a sortable table.

| Best at | Worst at |
| --- | --- |
| Defensibility and reading: the whole Case, origins and sources in one stable order that matches a future Signed plan and export; linear at 200% zoom. | Turn-taking: long pages, the task is one section of nine and the turn line scrolls away; in-place editing in a long document is harder for focus. |

### 5. Fact Grid

**Idea.** Everything is a dense, keyboard-driven grid with an inspector. Caseload, facts (Client answer, Practice entry, origin, what uses it), Draft criteria (input, chart cells, result) and notes are all grids. Narrow screens get cards.

| Best at | Worst at |
| --- | --- |
| Comparison and power use: reported against entered against checked, and the four-skill vector with its chart cells, at a glance. | Accessibility and approachability: the ARIA grid with cell editing is the riskiest pattern for screen readers; five colours per caseload row; a separate narrow layout. |

## Side by side

| | 1. Triage Desk | 2. Request Ledger | 3. Stations | 4. Case Record | 5. Fact Grid |
| --- | --- | --- | --- | --- | --- |
| Organized by | Next decision, panes | Items and their holders | Fixed stages and gates | One document | Rows and columns |
| Caseload | Grouped queue rows | Cases with open items per holder | Board of stations | Sortable table | Grid with inspector |
| Case | Tabs beside the queue | Ledger plus item pages | One station per page | Nine-section record | Fact grid plus inspector |
| Consequential actions | Dialogs | Item pages | Station side panel | In the section | Inspector |
| Facts beside findings | No (tabs) | No (separate item) | Receipt beside findings | Same page, in order | Inputs and results in one row |
| Client effect visible | On the Client side only | Live mirror on the desk | On the Client side only | On the Client side only | “Who can see it” column |
| Narrow view | One pane at a time | Ledger rows | Station picker, stacked board | Jump menu, notes under sections | Cards |
| Additions beyond the shared ones | Case tabs | Client mirror placement; top navigation | Station rail and board; holder in card footer | Section index, margin notes | Grid, inline editing, graphite selected row; five colours per row |

## Checks

The same automated pass as B1, over every screen of every concept: every text node against its real composited background, every interactive target, focus styles, labels, headings, duplicate IDs, reflow of every narrow screen at 320 px, and the new 13 px Client text floor.

| Check | 1. Triage Desk | 2. Request Ledger | 3. Stations | 4. Case Record | 5. Fact Grid |
| --- | --- | --- | --- | --- | --- |
| Screens (desk + phone width) | 38 | 37 | 36 | 37 | 37 |
| Text nodes measured | 3,434 | 1,552 | 1,681 | 1,807 | 1,848 |
| Text below its contrast minimum | 0 | 0 | 0 | 0 | 0 |
| Lowest text contrast | 4.88:1 | 5.18:1 | 5.18:1 | 5.18:1 | 4.88:1 |
| Targets under 24 px | 0 | 0 | 0 | 0 | 0 |
| Client buttons under 44 px | 0 | 0 | 0 | 0 | 0 |
| Client text under 13 px | 0 | 0 | 0 | 0 | 0 |
| Controls without visible focus | 0 of 789 | 0 of 318 | 0 of 331 | 0 of 373 | 0 of 301 |
| Screens without exactly one `h1` | 0 | 0 | 0 | 0 | 0 |
| Duplicate IDs | 0 | 0 | 0 | 0 | 0 |
| Overflow at 320 px | 0 | 0 | 0 | 0 | 0 |

The lowest pair (4.88:1) is destructive text on a selected row; it passes 4.5:1. Defects found by the checks and the design critique were fixed without changing any concept’s design:

- 18 px error-summary links;
- a 12 px registry key in the Client email;
- missing `h1`s;
- a sideways-scrolling chip row at 320 px;
- stretched narrow rows;
- dialogs that didn’t overlay;
- a visible cell label;
- proposed Client text wrongly drawn with the violet “signed” edge.

What each concept holds back is listed in its critique.

## Recommendation

**Choose 1. Triage Desk, and borrow Request Ledger’s Client mirror into its question composer.**

1. **It is the approved desk.** The sidebar views, queue rows with the holder column, turn line and detail pane are Relay’s own desk anatomy. Choosing it adds one composition (Case tabs) where every other concept adds a new frame. That is the lowest system and build risk for a High-risk batch.
2. **It suits the job the tickets describe.** “Received assigned work, then preparation” is triage: many Cases, an urgent group first, the next actor on every row, and acting without losing your place. The empty, no-match and unavailable states sit naturally in the queue pane.
3. **Its consequential actions are the clearest.** Submit, acknowledge and request review each open a dialog that says exactly what will be recorded and who can’t do it, matching Relay’s dialog rules.
4. **Its weakness is contained and testable.** The 616 px Case pane at 1280 px is the real cost. At 1440 px, Relay’s design width, the pane is 776 px. A round-2 variation can collapse the queue to give B3 review the side-by-side it needs.
5. **The mirror is Request Ledger’s best idea and travels well.** Previewing how a question lands in the Client’s B1 Checklist is the strongest B1 coherence move in the round. It fits beside Triage Desk’s question composer in the Notes tab without changing its frame.

What to watch: whether tabs hide the link between a fact and the finding that uses it. If they do, round 2 can test a Facts-and-Draft tab that stacks both (Relay’s FactsAndConclusion).

**Runner-up: 2. Request Ledger**, if the owner weights continuity with the B1 Checklist above desk speed. Case Record’s margin of origins is also worth keeping as a pattern for B3’s review and B5’s history, whichever concept is chosen.

## System additions flagged for the owner

1. **“Review requested” state chip (all five).** Requested review must not read as “Representative reviewing”, and Relay has no state for it. Rendered in the progress role with Lucide’s send glyph, with a dashed outline marking it as unapproved. No new token.
2. **A colleague’s first name as a desk holder word (all five).** Relay’s desk words are You, Client, Unassigned and Signed. B2 has more than one Practice member, so the holder says “Daniel” or “Priya”, as the Client side already names the representative.
3. **Selected-row edge, discrepancy 7.** Concepts 1 to 4 keep the specimen’s focus-blue left edge. Concept 5 uses a 2 px graphite edge because its cells carry their own focus ring. Owner decision needed.
4. **Concept-specific compositions, no new tokens:**
   - Triage Desk’s Case tabs;
   - Request Ledger’s Client mirror placement and top navigation;
   - Stations’ station rail and board, with the holder in a card footer;
   - Case Record’s section index and margin notes;
   - Fact Grid’s ARIA grid, inline editing, and a caseload row that can carry five colours (over Relay’s four).

The approved neutral “no turn” treatment and the 13 px Client floor are applied as amendments, not additions.

## Questions for the owner

1. **Workforce invitation wording.** `lf.workforce-invitation.v1.en` is reserved but has no text. R03 create and R02 accept are blocked until it is registered. Should it be registered before B2 build?
2. **Staff submission wording.** `lf.intake-submit.v1.en`’s confirmation sentence is in the Client’s voice (“Send this version of my answers”). The concepts show only its receipt variant for Staff submissions, plus factual UI copy naming Daniel as submitter. Is that enough, or should a Staff variant be registered?
3. **Own work role.** R01 creates the first membership as Staff. The concepts show Priya changing her own work role to Representative as an audited change. Is an administrator allowed to change their own work role, or must another administrator do it?
4. **Desk chips.** These concepts settle discrepancy 8 as neutral desk chips, following the system text. Confirm, or say if the tinted specimen was intended.
5. **Selected row.** Focus blue (specimen) or graphite (Fact Grid) for the selected row’s edge?

## Constraints and what isn’t verified

All copy is English, matching the pilot. Not verified in round 1:

- real screen reader output (essential before choosing Fact Grid);
- keyboard order in a built app;
- 200% zoom of the desk;
- the dark theme;
- testing with real Staff and Representatives.

Build requirements recorded in the critiques:

- `scroll-padding` for sticky bars;
- focus traps and return for dialogs;
- focus management for in-place editing and item pages;
- remappable single-key shortcuts.

The concepts load IBM Plex from Google Fonts by URL, as the Relay specimen does; the app must self-host it.
