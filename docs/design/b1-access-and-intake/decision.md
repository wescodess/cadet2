# B1 Access and intake: design decision

Date: 2026-11-18
Gate: UI design gate, batch B1 (P02, P03, P04, P06, P07, C01 to C06, C17, C18, N01), round 1 (five concepts)
Status: approved by the owner
Approved design: [approved.html](approved.html), concept 2, Checklist
Tickets this record serves: #104, #105, #106, #107, #108, #109, #110

## Read before building any B1 screen

1. [approved.html](approved.html): the approved Checklist concept, every screen, state and component.
2. This file, including the two system amendments below.
3. Root `DESIGN.md`: the approved Relay design system.
4. `docs/design/system/` (`approved.html`, `decision.md`, `tokens.css`, `tokens.json`) once PR #161 merges.

`approved.html` wins over the round-1 critique and presentation where they differ. The two amendments below win over `approved.html`.

## Approval

The orchestrator asked:

> Which first-screens (B1: access and intake) design should be the approved basis? The five designs are in PR #162 and ~/.orchestrate/scratch/cadet2-b1-round1/. Choose Other to pick Answer Sheet or to ask for changes.

The owner answered:

> Checklist (Recommended)

The recommendation the owner chose said:

> Shows what's done, what's the Client's to do, and what's optional. Asks the Client to share details before the questions, and keeps the urgent route under the answer. Later tasks reuse the same list.

## What was chosen and why

**2. Checklist.** One list holds the whole intake, grouped as "before you answer", "required", "optional" and "send", each row ending in a Relay holder. A task opens one short page with its questions and returns to the list. Sharing is the first task and unlocks the sensitive questions. Priya's later factual questions (C06) arrive on the same list as tasks, and withdrawal sits on the Sharing task (C17).

Why, from the round-1 recommendation:

- An anxious client gets focus and the whole picture: each task page is about one thing, and the list always shows what is done, what is theirs, what is optional and what can't start yet.
- The ordering rules are visible: sharing before sensitive questions, urgency before scope. A client sees why a task is "Not yet".
- The urgent route opens under the triggering answer and stays pinned above the list until a person has it; the list keeps working if the client stops.
- One pattern carries the rest of B1 and later evidence tasks.
- Lowest system risk: Relay holder rows and standard fields, with no addition beyond the neutral treatment below.

Held as rendered (from the Checklist critique), to revisit only if testing shows a problem:

- The screening page holds four questions and the scope page six, so both run two to three phone screens. If testing shows drop-off, a later round can split screening into one question per page inside its task.
- Required tasks stay locked until sharing is chosen, explained by the section note "After sharing".
- The list shows again after every task.

## What was rejected

| Concept | File | Idea |
|---|---|---|
| 1. Interview | [rejected-1-interview.html](rejected-1-interview.html) | One question or decision per screen; about 30 screens with only part-level progress. |
| 3. Thread | [rejected-1-thread.html](rejected-1-thread.html) | The Case as one dated history of cards; reads like chat, and the current task scrolls away. |
| 4. Agenda | [rejected-1-agenda.html](rejected-1-agenda.html) | The intake on the Relay home, one next step at a time; the home returns after every step and remaining steps fold away. Runner-up. |
| 5. Answer Sheet | [rejected-1-answer-sheet.html](rejected-1-answer-sheet.html) | One page that is already the check-answers page; busy on a phone and hardest for screen reader and keyboard users. |

## System amendments approved with B1

Both were approved on 2026-11-18 and are recorded as system rules in root `DESIGN.md` and `docs/design/system/decision.md` (PR #161).

### 1. Client text is at least 13 px

The orchestrator asked:

> Should meaningful text on the Client's screens be at least 13 px? The approved specimen uses 12 px for some Client labels.

The owner answered:

> Yes, Client side only (Recommended)

The Representative side may keep 12 px.

How it applies to B1: where `approved.html` sets meaningful client text at 12 px, the build uses at least 13 px. In the Checklist that is the holder word at the end of every row (`.holder-who`) and the wordmark tag ("Synthetic pilot", `.wm-tag`); any other client text a B1 screen adds below 13 px follows the same rule. The client expression has no 13 px token, so these use the client type token `DESIGN.md` section 4 names for this. Initials inside turn discs and avatars are `aria-hidden` and always sit beside the word or name they stand for, so they keep the specimen sizes.

### 2. A neutral "no turn" style

The orchestrator asked:

> When nobody holds the turn, and for pending-counsel marks, should the screens use a neutral "no turn" style built from existing tokens?

The owner answered:

> Yes (Recommended)

How it applies to B1: any no-turn or pending-counsel state uses the neutral style, never amber or blue. In the Checklist that is the other turn-bar segment and its disc while nobody there can act ("Priya Raman: Can’t see your answers yet", "Harbourline: Waiting for your reply"), "Not yet" rows that can't start, the "Draft wording, pending counsel" mark on every legal sentence, and the neutral chips "Captured, not sent", "Not confirmed yet", "Not available yet", "Sharing can’t be offered yet" and "Draft, pending counsel". `approved.html` already renders it from existing tokens only:

| Part | Tokens |
|---|---|
| Turn-bar segment | `--muted` fill, 3 px inset `--border` bottom rule, label `--foreground`, count `--muted-foreground` |
| Disc | `--card` fill, 2 px dashed `--input` outline, initials `--muted-foreground` |
| Chip | `--muted` fill, `--border` outline, word and glyph `--muted-foreground` |
| Notice | `--muted` fill, `--border` outline, icon `--muted-foreground` |
| Pending-counsel mark | `circle-dashed` glyph and words in `--muted-foreground` |
| "Not supplied" mark | `--muted` fill, 1 px dashed `--input` outline, text `--foreground` |

The "not supplied" mark for missing legal facts (operator, privacy contact, retention period) is part of the same treatment and is approved as rendered in `approved.html`; it was not put to the owner as its own question.

## Files in this record

`approved.html` and the four `rejected-1-*.html` files are byte-identical copies of the round-1 concepts' `index.html`. Do not edit them.

| File | Copy of | SHA-256 |
|---|---|---|
| `approved.html` | `round-1/2-checklist/index.html` | `fdb76b32e9fbc2cfe71be091969db63114298d0cb669498f24f71148093b36b5` |
| `rejected-1-interview.html` | `round-1/1-interview/index.html` | `078ef2ee8facbc93fc232ccbe171af628107f96cf58bfbd0eb2553e48104a066` |
| `rejected-1-thread.html` | `round-1/3-thread/index.html` | `67c0b70fef754024deda2c819b9234c312cd3a5dae56e7323ed60ccda787069e` |
| `rejected-1-agenda.html` | `round-1/4-agenda/index.html` | `79f4fed9c17e6653b18f30096afbc2030004bba42f605463b6430328bb7e5017` |
| `rejected-1-answer-sheet.html` | `round-1/5-answer-sheet/index.html` | `b9f49cd17d48a5d4790d51edec014f92cdec0a93a2ffe833852822a0f3fc0ab9` |

`round-1/` holds everything the owner saw: [presentation.md](round-1/presentation.md), and per concept the full `index.html`, the 728 px `preview.html` board, `mobile.png`, `flow.png` and `critique.md`. Its statements that nothing is approved describe round 1 before this decision.

## Build requirements carried from round 1

From the Checklist critique and presentation, not verifiable in a static concept:

- Real screen reader output, keyboard order in the built app, 200% zoom of the desktop Terms and Help pages, the dark theme, and testing with real applicants.
- `scroll-padding` for the pinned urgent route, the turn bar and the tab bar, so focus is never hidden.
- Self-hosted IBM Plex; the concept loads it from Google Fonts.
- All legal text is the registry's draft wording, marked pending counsel; fixtures are synthetic.
