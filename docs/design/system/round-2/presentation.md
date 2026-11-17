# cadet design system, round 2: Console with client turn colours

Date: 2026-11-17. Path: system creation through the UI design gate, round 2. Nothing here is approved, and no tokens have been written into the app. “cadet” is a working name.

The owner’s direction after round 1: **3. Console as the system, with Companion’s “whose turn is it?” colour logic on the client side.** This round refines that one direction into three variations. All three keep Console’s graphite, hairlines, filling-circle work status, dense keyboard-first desk and density-as-a-token; all three bring in Companion’s turn colours and the named representative on the client home. They differ in three things: how far the turn colours reach, how warm the client surfaces are, and the client typeface.

Every variation uses the same specimen content as round 1 (the same client with an expiring permit, the same signed plan that changed after a new job, the same queue with one urgent file, the same draft assessment), plus a client Documents screen that shows how far the turn colours reach.

## How to look at them

| Variation | Board (728 px, for chat) | Full specimen | Screenshots | Critique |
|---|---|---|---|---|
| 1. Turn Line | [preview](1-turn-line/preview.html) | [index](1-turn-line/index.html) | [desktop](1-turn-line/desktop.png), [desktop dark](1-turn-line/desktop-dark.png), [mobile](1-turn-line/mobile.png) | [critique](1-turn-line/critique.md) |
| 2. Relay | [preview](2-relay/preview.html) | [index](2-relay/index.html) | [desktop](2-relay/desktop.png), [desktop dark](2-relay/desktop-dark.png), [mobile](2-relay/mobile.png) | [critique](2-relay/critique.md) |
| 3. Two Voices | [preview](3-two-voices/preview.html) | [index](3-two-voices/index.html) | [desktop](3-two-voices/desktop.png), [desktop dark](3-two-voices/desktop-dark.png), [mobile](3-two-voices/mobile.png) | [critique](3-two-voices/critique.md) |

Each `index.html` opens with “What changed from Console” and a “Whose turn” section (the mapping, how far it reaches, the rules, the component in both themes), then the full round-1 structure: foundations, all twenty-three states in both themes, both component sets in both themes, the phone home and Documents screens and the desk in both themes, the shadcn variable block and the computed contrast table.

## What all three share

**One token architecture.** Standard shadcn-vue variables, the same eight state roles with four tokens each (`--positive`, `--negative`, `--caution`, `--progress`, `--seal`, `--scope`, `--history`, `--urgent`, each with `-foreground`, `-soft` and `-ink`), and the client and representative expression tokens. Turn is not a ninth role. Four aliases map each actor onto a role that already means the same thing:

| Actor | Token | Points at | Why |
|---|---|---|---|
| Client | `--turn-client` | `--caution` (amber) | The client owes something: something is missing. |
| Representative | `--turn-representative` | `--progress` (lake blue) | Someone has it and is working on it. |
| Done | `--turn-done` | `--positive` (green) | Finished and checked. |
| Signed | `--turn-signed` | `--seal` (violet) | A representative signed this version. |

Colour belongs to the actor, not the viewer: amber is always the client, blue is always the representative. A person is coloured only when it is their move; presence avatars stay neutral. Every disc and tint has words beside it.

**Changes from Console made in all three:**

- Progress, which is now also the representative’s turn, moves from ultramarine to lake blue. In round 1 the dark-theme progress colour and the focus ring were the same value (#7AA2FF), so a focused control could read as “Priya’s turn”.
- “Intake underway” and “Supplied” move from blue to amber, because both are the client’s move. No state chip now contradicts the turn beside it.
- Grey drift fixes: icon wells on client rows take the state tint; a date with nothing to do is green, not blue; the task badge is amber because it counts the client’s own tasks.
- The representative is named on the client home.

**The same guardrails and floor as round 1.** No scores, percentages, odds, rankings, confidence or “fastest”. Drafts say “not legal advice” with “verified as of”. The signed-plan header names the representative, designation, licence, date and version and links to the CICC register. No government marks. “Representative”, never “agent”. WCAG 2.2 AA in both themes: zero token pairs fail in any variation, zero rendered text below its minimum, every target at least 24 px and every primary client target at least 44 px, visible focus on every control, and no overflow at 320 px, including with French turn labels.

## The three variations

### 1. Turn Line

**Idea.** The smallest change that answers the client’s question. Console stays exactly as the owner saw it. The client home gains one turn line above the next step: an amber rail and “Your turn, Priya is waiting for this”, then a blue rail and “Priya’s turn, checking your plan”. Every other screen is Console as is.

**What changed from Console.** The turn line on the client home, the representative named above it, and the shared changes above.

| | Best at | Worst at |
|---|---|---|
| Client portal | Answering “whose turn?” in the first 150 px of the home with the least visual change. | The answer disappears on Tasks and Documents; clients infer whose turn each item is from state chips. Only one date fits above the fold. |
| Representative portal | Console, untouched. | No help with “who is this file waiting on?” beyond the existing views. |

**Trade-offs.** Lowest risk and closest to what the owner picked, but it treats the turn as a feature of one screen rather than a property of the system.

### 2. Relay

**Idea.** The case moves like a baton between the client and the representative, and the system shows who has it everywhere. Every client screen opens with a turn bar, “Your turn: 1 thing to do” beside “Priya’s turn: 2 things in progress”. Every list row in both portals ends in a holder, a disc and a word that say who has the item now. The representative queue uses the same holder, so a representative sees which files wait on them and which wait on the client. Console’s look, Plex throughout.

**What changed from Console.** Two new components (turn bar, holder); a holder column in the queue; two views renamed by turn (“Your turn to review”, “Client’s turn”); a turn line in the case header (“Your turn: review and sign version 3”); and the shared changes above.

| | Best at | Worst at |
|---|---|---|
| Client portal | Always showing both turns at once, on every screen, with Priya named; every document and date says who acts next. | Warmth comes from meaning, not surfaces, so it is still a graphite product; the turn bar grows to about 110 px with long translations at 320 px. |
| Representative portal | Next actor on every file at no density cost (84 px average queue row, the same as Console). | More colour per row: work glyph, chips, an urgent date and the holder. |

**Trade-offs.** The most coherent system and the strongest guard against grey drift, at the cost of more colour on the desk and a stronger commitment: the holder becomes something every new list must include.

### 3. Two Voices

**Idea.** Two rooms from one system. The client room is warm: a stone ground instead of grey, Readex Pro for plain-language reading, and whole cards tinted by whose turn it is. The desk is Console exactly. The rooms meet in one rule: anything a representative signs or sources is set in Plex wherever it appears, so the signed plan keeps its authority in the softer client room.

**What changed from Console.** The client expression overrides twelve surface tokens with warm stone values in both themes; the client face is Readex Pro at 400 and 500; client lists group into tinted turn cards; signatures, provenance and identifiers are set in Plex on the client side; the messages tab is named after the representative; and the shared changes above.

| | Best at | Worst at |
|---|---|---|
| Client portal | The warmest and most reassuring client experience of the three; the tint answers “whose turn?” before a word is read; Readex has a path to Arabic and other scripts. | Two typefaces meet inside one card; the Documents screen is the most colourful in the system; it looks least like the desk. |
| Representative portal | Console, untouched. | No next-actor signal; staff previewing the client edition switch between two visual languages. |

**Trade-offs.** It best fixes Console’s warmth weakness and protects the signed plan’s authority, at the cost of two type scales, two font families to self-host and 306 audited token pairs instead of 176.

## Side by side

| | 1. Turn Line | 2. Relay | 3. Two Voices |
|---|---|---|---|
| Turn reach | Client home only | Whole client portal and the representative queue | Whole client portal |
| How the turn shows | A rail and label on two home rows | Turn bar on every client screen; holder at the end of every row in both portals | Whole cards tinted by turn, with a turn pill |
| Client surfaces | Console graphite | Console graphite, tinted turn bar | Warm stone ground, tinted turn cards |
| Client type | IBM Plex Sans | IBM Plex Sans | Readex Pro; Plex for signatures, provenance, identifiers |
| Representative desk | Console | Console plus holder column, turn views and case-header turn | Console |
| Next step’s button ends at (phone, 844 px tall) | 468 px | 468 px | 467 px |
| Permit expiry starts at | 669 px | 552 px | 582 px |
| Average queue row | 84 px | 84 px | 84 px |
| Token pairs audited, failures | 176, 0 | 176, 0 | 306, 0 |

Round 1 Console for reference: next step’s button ended at 404 px and the permit expiry started at 490 px; average queue row 84 px.

## Recommendation

**Choose 2. Relay.**

1. **It makes “whose turn” a rule of the system, not a decoration of one screen.** Amber means the client and blue means the representative in both portals, so a client and their representative see the same colour for the same thing. Because every row needs a holder, colour cannot quietly drift to grey without breaking a visible rule, which is the owner’s standing concern.
2. **It gives the people who pay the same answer.** The queue shows each file’s next actor at no density cost: the average row is 84 px, exactly Console’s. Console’s keyboard-first desk, shortcuts and side-by-side review are otherwise unchanged, and Companion’s soft weaknesses stay out of it.
3. **It answers the anxious client on every screen.** The turn bar shows what they owe and what Priya is doing, side by side, with her name, wherever they are. That fixes Console’s warmth weakness with meaning rather than with tinted paper.
4. **Lowest risk of the two options that carry the turn beyond the home.** One typeface, one type scale, no surface overrides and 176 token pairs, like Console. The turn bar and holder are two small components composed from shadcn-vue primitives.

What to watch if Relay is chosen: colour count per queue row as states are added (the holder must stay in its own column); the turn bar’s height with long translations if it is made sticky; and whether representatives find the holder makes the “Awaiting client” view redundant.

**Runner-up: 3. Two Voices**, if the owner weights warmth for clients above one look across both portals. Its rule that signed and sourced text speaks in Plex is the best answer in this round to Companion’s weak signed-plan authority. **Turn Line** fits if the owner wants Console with the least possible change; it is the weakest answer for clients once they leave the home screen.

The three axes are independent, so a combination (for example Relay’s reach with Two Voices’ warm client surfaces) is a valid answer; it would be one more round.

## Constraints

All hard constraints are met in all three variations. Outside what a specimen can prove, and recorded in each `critique.md` as build requirements or checks: screen reader output and keyboard order in the built app, focus not obscured by sticky bars, 200% zoom of the desk, and testing with real applicants and representatives. The specimens load IBM Plex and Readex Pro from Google Fonts by URL; the app should self-host the same files (both are SIL Open Font License).
