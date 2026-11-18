# cadet design system: Relay

**Status:** approved by the owner on 2026-11-17. This is the design system for every cadet UI surface, in both portals.

| Read | What it gives you |
|---|---|
| [`docs/design/system/approved.html`](docs/design/system/approved.html) | The approved specimen: every token, state and component in both themes and both expressions, the phone and desk screens, and the full computed contrast table. It wins over this file if they ever disagree. |
| [`docs/design/system/decision.md`](docs/design/system/decision.md) | What was chosen and rejected, the owner's words, the build requirements from the critiques and the known discrepancies. |
| [`docs/design/system/tokens.css`](docs/design/system/tokens.css) | Tailwind 4 and shadcn-vue CSS variables, light and dark, with the semantic and expression tokens. |
| [`docs/design/system/tokens.json`](docs/design/system/tokens.json) | The same values as data, plus the 23 states. |

“cadet” is a working name. The tokens are **not wired into the app yet**; a separate UI ticket applies them (see [Applying the system](#16-applying-the-system)). Until then the app still renders the superseded palette in `_bmad-output/planning-artifacts/`.

Every new surface still goes through the UI design gate (`~/.agents/skills/ui-design-gate/SKILL.md`): concepts are composed from this system, and anything the system does not cover is flagged for the owner, never invented.

---

## 1. Principles

1. **Whose turn is it?** A case moves like a relay baton between the client and the representative. Every screen answers who has it now. Amber is always the client, blue is always the representative, green is done, violet is signed, in both portals.
2. **Colour carries meaning, nothing else.** Graphite and white everywhere; colour appears only on states, links, focus and whose turn it is. No decorative colour, and no state shown in plain grey.
3. **Never colour alone.** Every state and every turn is a glyph or disc, a word and a colour together.
4. **One system, two expressions.** The client portal is phone first, calm and plain; the representative desk is dense and keyboard first. They share components and tokens; only density and type size change.
5. **Honest records.** Unknown is never a no. Uploaded is not accepted. Offline is never shown as saved. A new draft never inherits an old signature. Dates are never guessed.
6. **The representative's signature is the authority.** Drafts are general information until a licensed representative signs a specific version. The product never predicts outcomes.

## 2. Two expressions

Set the expression on a container with `data-expression="client"` or `data-expression="representative"`. Components read the expression tokens, so the same `Button` is 48 px tall in the client portal and 30 px on the desk.

| | Client | Representative |
|---|---|---|
| Who | Applicants, often anxious, often reading in a second language | Licensed representatives and practice staff |
| Device | Phone first (390 px design width, reflows to 320 px) | Desktop (1440 px design width) |
| Control height | 48 px | 30 px |
| Body text | 17 on 26 | 14 on 20 |
| State chips | Tinted with the state colour, so meaning reads at arm’s length | Neutral (card fill, hairline), glyph in role colour, word in role ink, so dense rows stay quiet |
| Corners | 10 to 14 px | 5 to 8 px |
| Whose turn | Turn bar on every screen, holder at the end of every row | Holder column in the queue, turn line in the case header, views named by turn |

## 3. Token architecture

Four layers, all CSS custom properties. Tailwind 4 reads them through `@theme inline` in `tokens.css`.

1. **shadcn-vue base:** the standard variables (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, the `--sidebar-*` set, and their `-foreground` pairs), plus `--radius`, `--scrim` and `--shadow-overlay`.
2. **Eight state roles**, each with four tokens: the role itself (glyphs, fills, edges), `-foreground` (text on the solid fill), `-soft` (tint) and `-ink` (state text on page, card and tint).
3. **Four turn aliases**, each with the same four suffixes. They are not new colours; each points at a role that already means the same thing.
4. **Expression tokens** for density, targets and the type scale, set per `data-expression`.

### 3.1 Base colours

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | #FFFFFF | #17191E | Page |
| `--foreground` | #16181D | #E8EAEE | Body text |
| `--card` | #FFFFFF | #1C1F25 | Cards, panels, rows |
| `--card-foreground` | #16181D | #E8EAEE | Text on cards |
| `--popover` | #FFFFFF | #23262D | Menus, dialogs, toasts |
| `--popover-foreground` | #16181D | #E8EAEE | Text in overlays |
| `--primary` | #1F2329 | #E8EAEE | The one primary button per screen; links |
| `--primary-foreground` | #FFFFFF | #17191E | Label on primary |
| `--secondary` | #F1F2F4 | #262A31 | Secondary fills, neutral avatars |
| `--secondary-foreground` | #16181D | #E8EAEE | |
| `--muted` | #F5F6F8 | #1F2228 | Quiet surfaces, disabled fills, date tiles |
| `--muted-foreground` | #5A606C | #9EA5B1 | Hints, metadata |
| `--accent` | #EEF0F3 | #2A2E36 | Hover, selected row |
| `--accent-foreground` | #16181D | #E8EAEE | |
| `--destructive` | #C8233F | #FF7B8F | Destructive buttons, error text |
| `--destructive-foreground` | #FFFFFF | #17191E | |
| `--border` | #E2E4E9 | #30343C | Hairlines |
| `--input` | #878E9A | #6E7581 | Input and checkbox boundaries (3:1) |
| `--ring` | #2F6BFF | #7AA2FF | Focus only |
| `--sidebar` | #F7F8FA | #141619 | Desk sidebar |
| `--sidebar-foreground` | #16181D | #E8EAEE | |
| `--sidebar-primary` | #1F2329 | #E8EAEE | Active view |
| `--sidebar-primary-foreground` | #FFFFFF | #141619 | |
| `--sidebar-accent` | #E9EBEF | #262A31 | Hovered view |
| `--sidebar-accent-foreground` | #16181D | #E8EAEE | |
| `--sidebar-border` | #E2E4E9 | #2A2E35 | |
| `--sidebar-ring` | #2F6BFF | #7AA2FF | |
| `--scrim` | rgba(15,17,21,.4) | rgba(0,0,0,.6) | Behind dialogs |
| `--shadow-overlay` | `0 12px 32px -8px rgba(15,17,21,.22), 0 0 0 1px rgba(15,17,21,.06)` | `0 12px 32px -8px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.07)` | The only shadow |

### 3.2 State roles

| Role | Meaning | Light: role / -foreground / -soft / -ink | Dark: role / -foreground / -soft / -ink |
|---|---|---|---|
| `--positive` | Established or complete | #1A7F45 / #FFFFFF / #E6F4EC / #17713E | #4CC98A / #06170E / #13281D / #5DD397 |
| `--negative` | A stated requirement or document fails | #C8233F / #FFFFFF / #FCE8EC / #B01F38 | #FF7B8F / #24060C / #36161C / #FF91A2 |
| `--caution` | Something is missing or must be checked | #9A5B00 / #FFFFFF / #FDF1DD / #8A5200 | #F0B04A / #1E1404 / #30250F / #F3BC62 |
| `--progress` | Work is moving; someone has it | #1F6496 / #FFFFFF / #E6F0F7 / #1B5A88 | #5FB3E3 / #061723 / #11293A / #79C0EA |
| `--seal` | A representative signed this version | #5B47D6 / #FFFFFF / #EFECFC / #5240C4 | #A99BFF / #140D33 / #221D45 / #B8ADFF |
| `--scope` | Outside what cadet assesses | #A23A8A / #FFFFFF / #F8E9F4 / #92337C | #EE8ED3 / #2A0A22 / #36172F / #F2A3DB |
| `--history` | Kept for the record, no longer current | #7A6A58 / #FFFFFF / #F2EEE9 / #6A5C4C | #C4B4A2 / #1C150E / #2A251F / #CFC0B0 |
| `--urgent` | Time-critical; a licensed professional now | #C2410C / #FFFFFF / #FDEDE4 / #A9390B | #FF9363 / #260E03 / #3A1D10 / #FFA77F |

Use the pairs the way they were audited:

- State text on the page, a card or the role’s own tint: `-ink`.
- Body text on a tint: `--foreground`. Hints on a client-turn or representative-turn tint: `--muted-foreground`.
- Text on a solid fill: `-foreground`. Only urgent states use a solid fill.
- Glyphs, discs, rails and edges: the role itself.

Lake blue (`--progress`) and focus ultramarine (`--ring`) are deliberately different hues. Never use one for the other.

### 3.3 Whose turn

| Alias | Points at | Client sees | Representative sees | Meaning |
|---|---|---|---|---|
| `--turn-client` | `--caution` | Your turn | Client’s turn | The client owes something: an answer, a document, a decision. |
| `--turn-representative` | `--progress` | Priya’s turn (the representative’s first name) | Your turn | The representative or practice has the file and is working on it. |
| `--turn-done` | `--positive` | Done | Done | Finished and checked. Nobody needs to act. |
| `--turn-signed` | `--seal` | Signed | Signed | A representative signed this version. It is their advice. |

Each alias also has `-foreground`, `-soft` and `-ink` (for example `--turn-client-ink`). Tailwind utilities: `bg-turn-client-soft`, `text-turn-representative-ink`, `border-turn-done`.

Rules:

1. Colour belongs to the actor, not the viewer. Amber is the client even on the representative’s screen, where the label says “Client”.
2. A person is coloured only when it is their move. Presence avatars stay neutral (`--secondary`).
3. Every disc has a word beside it. The holder is never a bare dot; a rail is never used without a label.
4. State chips keep their own colours. The holder says who; the chip says what.
5. Unassigned files are the practice’s turn: blue, the word “Unassigned”, and an empty person glyph.
6. Something the client will do later (for example an ECA report that has not arrived) stays amber and says “later”.
7. Turn labels use the same words on every screen of a portal.

### 3.4 Expression tokens

| Token | Client | Representative | Use |
|---|---|---|---|
| `--c-h` | 48px | 30px | Control height (buttons, inputs, selects) |
| `--c-px` | 18px | 10px | Control horizontal padding |
| `--c-radius` | 10px | 6px | Control corners |
| `--input-radius` | 10px | 6px | Input corners |
| `--card-radius` | 12px | 8px | Cards, notices, findings |
| `--chip-h` / `--chip-px` / `--chip-radius` / `--chip-fs` | 28 / 10 / 7 / 14.5 px | 22 / 7 / 5 / 12.5 px | State chip |
| `--chip-h-sm` / `--chip-px-sm` / `--chip-fs-sm` | 24 / 8 / 13.5 px | 20 / 6 / 12 px | Small chip in rows |
| `--pad` | 16px | 12px | Card and cell padding |
| `--input-bw` | 1px | 1px | Input border width |
| `--focus-w` / `--focus-off` | 2 / 2 px | 2 / 1 px | Focus outline width and offset |
| `--check-size` / `--check-radius` | 24 / 6 px | 16 / 4 px | Checkbox and radio box |
| `--check-row` | 44px | 24px | Clickable height of a checkbox or radio row |
| `--target-min` | 24px | 24px | Minimum target for anything interactive |
| `--target-primary` | 44px | 24px | Minimum for primary client targets |
| `--t-*` | see [Typography](#4-typography) | | Type scale |

Tailwind utilities from `tokens.css`: `h-control`, `min-h-control`, `h-chip`, `min-h-target`, `min-h-target-primary`, `rounded-control`, `rounded-input`, `rounded-card`, `rounded-chip`, `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-ui`, `text-small`, `text-label` (each sets size, line height, weight and tracking for the current expression), `ease-standard`, and every colour above as `bg-*`, `text-*`, `border-*`. The overlay shadow is `shadow-(--shadow-overlay)`.

## 4. Typography

**IBM Plex Sans** for everything, with tabular figures on times, dates and numbers (`font-variant-numeric: tabular-nums`). **IBM Plex Mono** only for identifiers people copy: case IDs (`HL-2026-0142`), matter numbers and licence numbers. Weights used: Sans 400, 500, 600, 700 and 400 italic; Mono 400 and 500. Both families are SIL Open Font License and must be **self-hosted** (see [Applying the system](#16-applying-the-system)).

| Style | Client (size on line height, weight) | Representative | Example |
|---|---|---|---|
| Display | 30 on 36, 600, −0.02em | 22 on 28, 600, −0.015em | Your plan, signed and ready |
| H1 | 26 on 32, 600, −0.015em | 18 on 24, 600, −0.01em | When does your permit expire? |
| H2 | 20 on 26, 600, −0.01em | 15 on 20, 600 | Dates to watch |
| H3 | 17 on 24, 600 | 14 on 20, 600 | Canadian Experience Class |
| Body | 17 on 26, 400 | 14 on 20, 400 | Priya needs all four of your IELTS scores to confirm your language level. |
| Control | 16 on 20, 500 | 13.5 on 16, 500 | Upload new copy |
| Small | 15 on 22, 400 | 13 on 18, 400 | Sources verified as of 1 Nov 2026. |
| Label | 15 on 20, 500 | 13 on 18, 500 | Passport number |

13 px is the floor for representative secondary text; test it at 200% zoom. The specimen sets a few labels smaller (holder word, client tab labels, queue group labels and the date-tile year at 12 px, keyboard hints at 11.5 to 12 px, avatar initials and the task badge at 10.5 px). Build those at the specimen sizes and raise them at the first gate that shows them; this is open in `decision.md`.

## 5. Spacing

A 4 px base with 2 px steps for dense rows: **2, 4, 6, 8, 12, 16, 20, 24, 32**. Tailwind’s default `--spacing` (0.25rem) already produces this scale (`gap-0.5` is 2 px, `gap-1.5` is 6 px).

| Context | Value |
|---|---|
| Client cell padding (`--pad`) | 16 px |
| Client screen gutter, section gap | 16 px, 20 to 22 px |
| Client list row | 12 × 14 px padding, at least 60 px tall |
| Representative panels | 12 to 20 px |
| Queue row | 8 to 10 × 12 to 14 px padding, about 84 px tall on average |
| Desk layout | 224 px sidebar, 440 px queue, fluid detail; facts and draft columns at 1 : 1.15 with a 16 px gap |

## 6. Radii

`--radius` is 0.375rem (6 px), with shadcn’s derived `rounded-sm` (2 px), `rounded-md` (4 px), `rounded-lg` (6 px) and `rounded-xl` (10 px). Components use the expression radii instead:

| Element | Client | Representative |
|---|---|---|
| Chip | 7 px | 5 px |
| Control and input | 10 px | 6 px |
| Card, notice, finding | 12 px | 8 px |
| Checkbox | 6 px | 4 px |
| Grouped list (`c-group`) | 14 px | n/a |
| Icon well | 9 px | n/a |
| Dialog | 12 px | 12 px |
| Toast, empty state, signed-plan header | 10 px | 10 px |
| Discs and avatars | round | round (workspace mark 6 px) |

## 7. Elevation

Flat surfaces separated by 1 px hairlines (`--border`). Exactly one shadow, `--shadow-overlay`, for anything that floats: popovers, menus, dialogs and toasts. Dialogs sit on `--scrim`. Never add shadows to cards, rows or buttons.

## 8. Focus

A 2 px `--ring` outline on `:focus-visible`, offset 2 px on client controls and 1 px in dense desk rows (`--focus-w`, `--focus-off`). The ring is the only ultramarine in the interface, so focus is never mistaken for a state or a turn. Every interactive element shows it in both themes; custom checkboxes and radios show it on the drawn box. Focus must never be hidden behind a sticky bar (see [Accessibility](#14-accessibility)).

## 9. Motion

Motion confirms an action and stops. Nothing animates on its own.

| Use | Duration | Easing |
|---|---|---|
| Hover and selection tint | `--dur-1` 120 ms | `--ease` cubic-bezier(.25,.1,.25,1) |
| Detail pane slide and fade | `--dur-2` 160 ms | `--ease` |
| List selection | Instant; no animated reorder | |
| Spinners (loading, saving) | 0.8 s and 1.2 s linear rotation | |

No bounce and no stagger. Under `prefers-reduced-motion: reduce`, slides become fades and fades become instant; spinners stop and the words (“Saving”, “Uploading”) carry the state.

## 10. Iconography

**Lucide** (`lucide-vue-next`), already in the stack. Interface icons use 1.75 px stroke at 15 to 18 px; state glyphs render at 2 px stroke at 16 px in chips and 18 px in row icon wells. Icons and glyphs are `aria-hidden="true"`; the adjacent word carries the meaning.

One custom family, drawn as small Vue components on a 24 px grid: **work-status circles that fill as work moves**. Dashed with a quarter fill for intake, half for submitted, three quarters for reviewing, solid with a cut-out tick for signed and solid with a cut-out arrow for delivered; an outlined circle with a question mark for clarification; a dashed circle with a question mark for unknown. The cut-out uses `--glyph-cut` (the surface colour behind the glyph). Copy the paths from `approved.html`.

## 11. Semantic states

Twenty-three states in five groups. Each is a glyph in the role colour, a word in the role ink and, for clients, the role tint behind the chip. Urgent states alone are solid. The exact words are part of the system; `tokens.json` carries the same table under `states`.

| Group | State | Word | Role | Glyph |
|---|---|---|---|---|
| Assessment coverage (per program; unknown is never a no) | `supported` | Supported | positive | `circle-check` |
| | `blocked` | Blocked | negative | `ban` |
| | `unknown` | Unknown | caution | custom dashed circle with question mark |
| | `out-of-scope` | Out of scope | scope | `circle-arrow-out-up-right` |
| Work status (who has the file; says nothing about outcome) | `intake` | Intake underway | caution | custom quarter fill, dashed |
| | `submitted` | Submitted | progress | custom half fill |
| | `clarification` | Clarification requested | caution | custom circle with question mark |
| | `reviewing` | Representative reviewing | progress | custom three-quarter fill |
| | `signed` | Signed | seal | custom solid disc, tick |
| | `delivered` | Delivered | positive | custom solid disc, arrow |
| Evidence status (uploaded is not accepted) | `supplied` | Supplied | caution | `message-square-quote` |
| | `uploaded` | Uploaded | progress | `file-up` |
| | `awaiting` | Awaiting review | progress | `file-clock` |
| | `accepted` | Accepted | positive | `file-check` |
| | `replace` | Replacement needed | negative | `file-x` |
| Review validity (a new draft never inherits an old signature) | `not-reviewed` | Not reviewed | caution | `circle-dashed` |
| | `signed-version` | Signed version {n} | seal | `badge-check` |
| | `changed` | Changed since review | caution | `git-compare-arrows` |
| | `superseded` | Superseded | history | `archive` |
| Urgency and escalation (never snoozed; always has an owner) | `escalate` | Needs a licensed professional now | urgent, solid | `siren` |
| | `due-90` | Expires in {n} days (within 90) | urgent, solid | `alarm-clock` |
| | `due-180` | Expires in {n} days (91 to 180) | caution | `calendar-clock` |
| | `date-unknown` | Expiry date unknown | caution | `calendar-search` |

Escalation triggers for “Needs a licensed professional now”: refusal, removal, criminality, health, or status ending soon. Status ending within 90 days escalates automatically. An unknown expiry never shows a guessed countdown; a question goes to the client.

## 12. Components

Choose in this order: an existing higher-level app component, then the shadcn-vue primitive in `app/components/ui/*` restyled through tokens, then a new component composed from those primitives. Composed components live outside `app/components/ui`, which stays shadcn-vue output.

### 12.1 Primitives (shadcn-vue on reka-ui)

| Need | Primitive | Relay rules |
|---|---|---|
| Button | `ui/button` | Variants: primary (`--primary`, one per screen), secondary (card fill, `--input` border), ghost (underlined link style), destructive. Height `--c-h`. Loading shows `ui/spinner` and the action word (“Uploading”, “Signing”) with `aria-busy`. Disabled uses `--muted` with a reason nearby (“Staff prepare; only a representative can sign.”). |
| Keyboard hint | `ui/kbd` | Inside the button, full-strength `--muted-foreground`, never dimmed with opacity. |
| Field, label, hint, error | `ui/field`, `ui/label`, `ui/input`, `ui/textarea` | Label and hint above the control. Error below the label, `--destructive`, 600, with an icon, saying what to do (“Enter the expiry date as day, month and year”). `aria-invalid` and `aria-describedby` on the control. |
| Date | three `ui/input`s in a `fieldset` | Day, Month, Year with their own labels; `inputmode="numeric"`. |
| Checkbox, radio | `ui/checkbox`, `ui/radio-group` | Box `--check-size`; row height `--check-row`; focus ring on the drawn box. |
| Select | `ui/select`, `ui/native-select` | Native select on phones. |
| Status chip | `ui/badge`, composed as `StatusChip` | See 12.2. |
| Avatar | `ui/avatar` | Neutral `--secondary` fill. Presence only; never coloured by turn. |
| Dialog | `ui/alert-dialog` for consequential actions, `ui/dialog` otherwise | Title says the action and its object; body says exactly what will be recorded; destructive or signing action is explicit (“Remove document”, “Sign version 3”), cancel is “Keep it” or “Cancel”. Client actions stack full width. Focus trapped and returned. |
| Toast | `ui/sonner` | Names the real event (“Uploaded. Priya will review your IELTS result.”, “Signed version 3. Not delivered yet.”). `role="status"`. |
| Empty state | `ui/empty` | Dashed border, says what empty means and offers the next useful action. |
| Notice | `ui/alert` | Draft notice: caution tint, dashed caution border. Client general-information notice: progress tint (see `decision.md`, discrepancy 7). |
| Desk navigation | `ui/sidebar` | Views with counts: Urgent, New intake, Your turn to review, Client’s turn, Changed rules, Mine. |
| Command bar | `ui/command` | ⌘K, labelled “Search” with the hint. |
| Dense tables | `ui/table` | Representative check-answers table. |
| Panes | `ui/scroll-area`, `ui/resizable` | Desk queue and detail panes. |
| Disclosure | `ui/collapsible` | “Why we ask”. |

### 12.2 Composed components

**StatusChip.** Glyph (role colour) and word (role ink) for one of the 23 states. Client: `--r-soft` fill, no border. Representative: card fill, `--border` hairline. Urgent: solid `--urgent` with `--urgent-foreground`. Sizes: default and small (`--chip-h-sm`). Never truncate the word; let it wrap. Glyph `aria-hidden`.

**TurnDisc.** A round disc in the turn colour with `-foreground` initials (OA, PR) or a glyph: `check` for done, `pen-line` for signed, `user-round` for unassigned. Sizes 16, 20, 24 (default), 32 and 36 px. Always `aria-hidden`; always next to a word.

**TurnBar** (client). A `nav` labelled “Whose turn” directly under the client top bar on every client screen, with two equal links: the client segment (“Your turn” and a count, “1 thing to do”) and the representative segment (“Priya’s turn”, “2 things in progress”). Each segment: turn tint, 3 px inset bottom rule in the turn colour, 32 px disc, label 15 on 20 at 600 in turn ink, count 14 on 19 in `--foreground`, at least 64 px tall; a hairline between segments. When the client owes nothing the left segment is done green: “Nothing for you”, “Priya has it”. Each segment opens the matching filtered list. Long translations wrap (about 110 px at 320 px in French); nothing truncates. If it is made sticky, reserve its height and add it to `scroll-padding-top`.

**Holder.** Ends every list row in both portals, right-aligned in its own column (56 to 72 px wide). A 24 px TurnDisc over the word (12 px, 600, turn ink, breaking only at spaces). A visually hidden prefix makes it read as a sentence: “Whose turn: You”, “Whose turn: Priya”, “Status: Done”, “Status: Signed”. Client words: You, “You, later”, Priya (the representative’s first name), Done, Signed. Desk words: You, Client, Unassigned, Signed.

**CaseTurnLine** (desk). In the case header under the client name: a 20 px disc and “Your turn: review and sign version 3” in turn ink at 13 px, followed by a muted explanation (“The client is waiting on you. Asking a question passes the turn to them.”).

**QueueRow** (desk). A full-row link: work-status glyph (18 px column), name (500) and program, next hard date with its days count or “Date unknown”, state chips, owner, and the Holder in a 72 px right-hand column. Selected row: `--accent` fill with a 2 px left edge. Average height 84 px. Up to four colours per row; the holder must stay in its own column. A narrow layout stacks the date beside the name and the chips below.

**TaskRow** (client). The client counterpart of the queue row: tinted icon well (36 px, role tint, role glyph), what is needed, who asked and when (“Asked by Priya on 15 Nov 2026”), state chip and Holder.

**ProvenanceRow.** A `dl` under every conclusion: Source (linked title and domain), Effective (or “Not stated by source”), Verified as of (date). Small text, muted, labels at 600 in `--foreground`. Unknown dates stay unknown.

**SignedPlanHeader.** Comes first on a signed plan and is shown only for a signed version. Card fill, hairline, 3 px inset `--seal` rule on the left, 24 px `badge-check` in `--seal`. Text: “Reviewed and signed by **{name}**, {designation}, licence {number in Plex Mono}, on {date}. Version {n}.” Below: a link “Check this licence on the CICC register” in `--seal-ink` (600, at least 24 px tall on the desk and 32 px for clients) and “Sources verified as of {date}.” It is never labelled “not legal advice”. The export carries the same header.

**DraftNotice.** On every draft or general result: “Draft assessment, version {n}. General information, not legal advice, until a representative signs it. Sources verified as of {date}.” The client variant for program information read without a representative: “General information, not legal advice. This describes {program}, not your situation. A licensed representative must review your situation before you rely on a plan. Sources verified as of {date}.” Never placed on a signed plan.

**SaveState.** `role="status"`, small, 500. Saving (spinning loader, muted), “Saved at 2:41 pm” (positive ink, check), offline (caution ink: “Not saved. You’re offline. We’ll try again when you reconnect.”). Desk wording: “Saving draft”, “Draft saved 2:41 pm”, “Not saved. Connection lost, retrying.” Never shows saved when it is not.

**ErrorSummary.** At the top of the form on submit, `role="alert"`, `tabindex="-1"`, takes focus. 3 px `--destructive` border, title “There is a problem” (client) or what is blocked (“Version 3 can’t be signed yet”), and a list of links to each field or exact item. On the desk it blocks signing until each item is resolved or disclosed.

**QuestionPage** (client intake). One question per page: back link (44 px), SaveState, “Question 4 of 9”, the question as the fieldset legend (H1), hint, the control, an honest “I don’t know” option, “Why we ask” as a disclosure, and one primary “Continue”. The desk counterpart, **ClientQuestionComposer**, writes one plain-language question plus “Why you’re asking (shown to the client)” and sends with ⌘ Enter; sending passes the turn to the client.

**CheckAnswersRow.** Client: a `dl` row with the question (600), the answer, and a “Change {thing}” link; “I don’t know” answers stay visible in caution ink. Desk: a dense `ui/table` with Fact, Answer, From and Action; changed answers carry a “Changed since v{n}” chip and unknown answers say “Not known”.

**DeadlineItem.** A date tile (day 24 px at 700, month 14 px, year 12 px, on `--muted`) or “Date unknown” in caution ink, the title, the date and a plain “In 40 days” chip by urgency, and the source line (“From your permit, checked by Priya on 3 Nov 2026. Priya will advise on timing.”). A date with nothing to do is positive green, never blue. No guessed countdowns.

**ReviewSideBySide** (desk). Facts and evidence on the left, the draft assessment on the right (1 : 1.15). Each fact card shows the stated fact, the evidence chip and who supplied and checked it; a changed fact gets a 3 px inset caution rule and a “Changed since v{n}” chip. Each finding shows the program, its coverage chip, the reasoning, what it relies on and its ProvenanceRow. At 200% zoom and on phones it becomes **FactsAndConclusion**, the stacked layout (“What Priya used”, then “What it means for you”).

**SignDialog** (desk). `ui/alert-dialog`: “Sign version 3 for {client}?”, “You are signing as {name}, {designation}, licence {number}. The client will see your name, licence and today’s date.”, the verification date and any disclosed unknowns, a required acknowledgement checkbox (“I reviewed the facts, evidence and draft for version 3.”), then Cancel and “Sign version 3”. Signing and delivering are separate events.

### 12.3 Screen frames

- **Client:** top bar (wordmark, the representative’s avatar as a 44 px link labelled “{name}, your representative”), TurnBar, content, bottom tab bar (Home, Tasks with an amber count badge, Documents, Messages; at least 52 px tall; `aria-current` on the active tab). Home sections: Your next step (the only primary button), Dates to watch, Your plan.
- **Representative desk:** sidebar (practice, ⌘K search, Queue, Clients, Rule changes, Exports, then the views), queue list with the holder column, and the case detail (header with CaseTurnLine, chips and actions “Ask client C”, “Preview client edition P”, “Sign version 3 ⌘ Enter”; then ReviewSideBySide).

## 13. Hard rules

1. **No scores, percentages, odds, approval chances, rankings, confidence badges or “fastest route”**, anywhere in product copy or UI. A client’s own test results (for example IELTS) are facts, not predictions, and may be shown.
2. **Drafts say “not legal advice” and “verified as of”.** Every draft or general result carries the DraftNotice; every conclusion carries a ProvenanceRow with its verification date.
3. **Signed-plan header contents:** representative’s name, designation, licence number, signing date and version, a link to verify the licence on the CICC register, and the sources’ verification date. Shown only for a signed version, first on the page and in the export. A signed plan is not labelled “not legal advice”.
4. **No government marks.** No flags, maple leaves, coats of arms or Government of Canada look-alikes. canada.ca appears only as a cited source.
5. **“Representative”, never “agent”**, in every string, label, alt text and URL a person can see.
6. **Colour is never the only signal.** Every state and turn has a glyph or disc and a word; every rail has a label.
7. **WCAG 2.2 AA with computed contrast.** Text pairs at least 4.5:1, glyphs, input boundaries and focus rings at least 3:1, in both themes. Any new pair is computed before use.
8. **Targets:** at least 24 by 24 px for everything interactive; at least 44 px for primary client targets (client controls are 48 px).
9. **One primary action per screen.** Signing is never a single-key shortcut.
10. **Every list row ends in a holder.** A new list without one breaks the system.

## 14. Accessibility

Standard: WCAG 2.2 AA. All 176 audited token pairs pass (88 per theme), recomputed from `tokens.json` for this document:

| Role | Lowest text pair, light | Lowest non-text, light | Lowest text pair, dark | Lowest non-text, dark |
|---|---|---|---|---|
| positive | 5.04 | 4.44 | 8.33 | 7.43 |
| negative | 5.57 | 4.75 | 7.62 | 6.58 |
| caution | 5.43 | 4.86 | 8.72 | 7.88 |
| progress | 6.32 | 5.47 | 7.52 | 6.45 |
| seal | 6.26 | 5.45 | 7.77 | 6.63 |
| scope | 5.99 | 5.12 | 8.11 | 7.15 |
| history | 5.21 | 4.51 | 8.55 | 7.52 |
| urgent | 5.18 | 4.54 | 8.13 | 7.05 |

Lowest overall: text 5.04:1 (`--positive-foreground` on `--positive`, light); non-text 3.30:1 (`--input` on `--background`, light). The full pair-by-pair table is at the end of `approved.html`.

Build requirements (details in `decision.md`):

- **Screen readers:** verify in VoiceOver, NVDA and TalkBack. Discs and glyphs `aria-hidden`; holders read “Whose turn: …” or “Status: …”; the turn bar is a labelled `nav`; sections are labelled regions; save state and toasts are `role="status"`; the error summary is `role="alert"` and takes focus; dialogs trap and return focus.
- **Keyboard:** logical order in the built app; every shortcut has a visible button; single-character shortcuts can be turned off or remapped, or work only when their region has focus; signing needs ⌘ Enter plus the SignDialog.
- **Focus not obscured (2.4.11):** set `scroll-padding-top` and `scroll-padding-bottom` to the heights of the sticky turn bar (if sticky) and tab bar.
- **Reflow (1.4.10):** client screens at 320 px with long names (Oluwaseun Adébáyọ̀-Fitzgerald, Nguyễn Thị Minh Khai, Siobhán Ní Bhriain) and French turn labels; nothing truncates.
- **200% zoom** of the desk; the stacked FactsAndConclusion layout is the fallback.
- **Reduced motion** respected (section 9).

## 15. Content

Plain words, sentence case, the client addressed as “you” and the representative by first name on the client side. Dates as “14 Mar 2027” (day, short month, year). Times as “2:41 pm”. Say what really happened (“Uploaded”, not “Done”). Questions to clients are one question in plain words, with why it is asked. Never imply an outcome.

## 16. Applying the system

The tokens are deliberately not wired in. The UI ticket that applies them should:

1. Import `docs/design/system/tokens.css` (or a copy under `app/assets/css/`) in `app/assets/css/tailwind.css` in place of `_bmad-output/planning-artifacts/design-tokens.css`. Never load both: the old file defines raw `--text-*`, `--radius-*` and `--ease-standard` variables that collide with the Tailwind theme names here. Remove the now-duplicated `@theme inline` mappings and the `:root`/`.dark` chart and sidebar values from `tailwind.css`, and change its base `outline-ring/50` to the full-strength focus ring (section 8). Keep `@custom-variant dark (&:is(.dark *));`.
2. Replace references to tokens that no longer exist. About thirty files under `app/` use `--trust`, `--trust-soft`, `--warning`, `--warning-soft`, `--success`, `--success-soft`, `--destructive-soft` and `--font-body`; map each by meaning to a state role (for example success to `positive`, warning to `caution`), not by hue. Three recommendation components use `--confidence-*`: confidence badges are forbidden (hard rule 1), so those surfaces need removing through the gate, not a new colour.
3. Self-host IBM Plex Sans (400, 500, 600, 700, 400 italic) and IBM Plex Mono (400, 500) as WOFF2 with `font-display: swap`, through `@nuxt/fonts` with local files or `@font-face` rules pointing at `public/fonts/`. Include subsets that render every specimen name, including Vietnamese and the Yoruba combining marks, and check them in the browser. No requests to Google Fonts.
4. Set `data-expression="client"` on the client layout and `data-expression="representative"` on the desk layout.
5. Restyle `app/components/ui/*` through tokens (control heights, radii, focus offset), without forking their behaviour.
6. Decide charts at a gate. The app’s current `--chart-1` to `--chart-5` are not part of the approved system; no chart palette was approved, so any chart surface needs the owner’s approval before colours are chosen.
7. Check the build against `approved.html` and this file in a browser: loading, empty, error and disabled states, both themes, 320 px and 390 px phones, the 1440 px desk, 200% zoom and worst-case data.

## 17. Changing the system

This system was approved by the owner. A change to a token value, a state’s colour, glyph or word, a component’s anatomy, or a hard rule goes back through the UI design gate for approval, then updates `approved.html`, `decision.md`, `tokens.css`, `tokens.json` and this file together.

The previous design document, `_bmad-output/planning-artifacts/DESIGN.md`, is superseded by this one.
