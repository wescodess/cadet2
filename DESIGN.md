# cadet design system: Relay

**Status:** approved by the owner on 2026-11-17, amended on 2026-11-18 (client text floor in [Typography](#4-typography), no-turn style in [Whose turn](#33-whose-turn)) and on 2026-11-19 (client text scale in [Typography](#4-typography), the “Review requested” state in [Semantic states](#11-semantic-states), a colleague’s first name as a desk holder word in [Holder](#122-composed-components), 12 px [Keyboard hint](#121-primitives-shadcn-vue-on-reka-ui) and the graphite selected-row edge in [QueueRow](#122-composed-components)). This is the design system for every cadet UI surface, in both portals.

| Read | What it gives you |
|---|---|
| [`docs/design/system/approved.html`](docs/design/system/approved.html) | The approved specimen: every token, state and component in both themes and both expressions, the phone and desk screens, and the full computed contrast table. It wins over this file if they ever disagree, except where a dated amendment in this file changes it. |
| [`docs/design/system/decision.md`](docs/design/system/decision.md) | What was chosen and rejected, the owner's words, the build requirements from the critiques and the known discrepancies. |
| [`docs/design/system/tokens.css`](docs/design/system/tokens.css) | Tailwind 4 and shadcn-vue CSS variables, light and dark, with the semantic and expression tokens. |
| [`docs/design/system/tokens.json`](docs/design/system/tokens.json) | The same values as data, plus the 23 states. |

“cadet” is a working name. The tokens are **not wired into the app yet**; a separate UI ticket applies them (see [Applying the system](#16-applying-the-system)). Until then the app still renders the superseded palette in `_bmad-output/planning-artifacts/`.

Every new surface still goes through the UI design gate (`~/.agents/skills/ui-design-gate/SKILL.md`): concepts are composed from this system, and anything the system does not cover is flagged for the owner, never invented.

---

## 1. Principles

1. **Whose turn is it?** A case moves like a relay baton between the client and the representative. Every screen answers who has it now. Amber is always the client, blue is always the representative, green is done, violet is signed, in both portals.
2. **Colour carries meaning, nothing else.** Graphite and white everywhere; colour appears only on states, links, focus and whose turn it is. No decorative colour, and no state shown in plain grey, except the no-turn style ([Whose turn](#33-whose-turn)), which always pairs its neutral colour with a glyph and words.
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
| Corners | 6 to 14 px (checkbox 6, chip 7, controls 10, cards 8 to 12, grouped lists 14) | 4 to 12 px (checkbox 4, chip 5, controls 6, cards 8 to 10, dialogs 12) |
| Whose turn | Turn bar on every screen, holder at the end of every row | Holder column in the queue, turn line in the case header, views named by turn |

## 3. Token architecture

Four layers, all CSS custom properties. Tailwind 4 reads them through `@theme inline` in `tokens.css`.

1. **shadcn-vue base:** the standard variables (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, the `--sidebar-*` set, and their `-foreground` pairs), plus `--radius`, `--scrim` and `--shadow-overlay`.
2. **Eight state roles**, each with four tokens: the role itself (glyphs, fills, edges), `-foreground` (text on the solid fill), `-soft` (tint) and `-ink` (state text on page, card and tint).
3. **Four turn aliases**, each with the same four suffixes. They are not new colours; each points at a role that already means the same thing.
4. **Expression tokens** for density and the type scale, set per `data-expression`.

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
| `--secondary` | #F1F2F4 | #262A31 | Neutral avatars |
| `--secondary-foreground` | #16181D | #E8EAEE | |
| `--muted` | #F5F6F8 | #1F2228 | Client screen background behind grouped lists, disabled fills, desk queue group headers, keyboard hints |
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
| `--sidebar-primary` | #1F2329 | #E8EAEE | Defined for shadcn-vue; the specimen’s desk does not use it |
| `--sidebar-primary-foreground` | #FFFFFF | #141619 | |
| `--sidebar-accent` | #E9EBEF | #262A31 | Active view (`aria-current`) |
| `--sidebar-accent-foreground` | #16181D | #E8EAEE | |
| `--sidebar-border` | #E2E4E9 | #2A2E35 | |
| `--sidebar-ring` | #2F6BFF | #7AA2FF | |
| `--scrim` | rgba(15,17,21,.4) | rgba(0,0,0,.6) | Behind dialogs |
| `--shadow-overlay` | `0 12px 32px -8px rgba(15,17,21,.22), 0 0 0 1px rgba(15,17,21,.06)` | `0 12px 32px -8px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.07)` | The only elevation shadow (see [Elevation](#7-elevation)) |

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
| `--color-turn-client` | `--caution` | Your turn | Client’s turn | The client owes something: an answer, a document, a decision. |
| `--color-turn-representative` | `--progress` | Priya’s turn (the representative’s first name) | Your turn | The representative or practice has the file and is working on it. |
| `--color-turn-done` | `--positive` | Done | Done | Finished and checked. Nobody needs to act. |
| `--color-turn-signed` | `--seal` | Signed | Signed | A representative signed this version. It is their advice. |

Each alias also has `-foreground`, `-soft` and `-ink` (for example `--color-turn-client-ink`). As in the specimen, the aliases exist only inside `@theme inline` in `tokens.css`; there are no separate `--turn-*` variables. Tailwind utilities: `bg-turn-client-soft`, `text-turn-representative-ink`, `border-turn-done`. In plain CSS use the role an alias points at, as the specimen does through `data-turn`.

Rules:

1. Colour belongs to the actor, not the viewer. Amber is the client even on the representative’s screen, where the label says “Client”.
2. A person is coloured only when it is their move. Presence avatars stay neutral (`--secondary`).
3. Every disc has a word beside it. The holder is never a bare dot; a rail is never used without a label.
4. State chips keep their own colours. The holder says who; the chip says what.
5. Unassigned files are the practice’s turn: blue, the word “Unassigned”, and an empty person glyph.
6. Something the client will do later (for example an ECA report that has not arrived) stays amber and says “later”.
7. Turn labels use the same words on every screen of a portal.
8. **Nobody holds the turn: neutral.** When nobody holds the turn, and for pending-counsel marks, use the no-turn style below. Turn colours (amber `--caution` for the client, lake blue `--progress` for the representative) are never used for a turn nobody holds.

**No-turn style** (amendment, 2026-11-18). It is built only from existing neutral tokens; there is no turn alias or role for it. It covers the other side of the turn bar while it can’t act (“Priya Raman: Can’t see your answers yet”), a task that can’t start yet (holder word “Not yet”, prefix “Status:”), states that are not confirmed or not sent, “Draft wording, pending counsel” on legal text, and facts not supplied yet. B1’s `docs/design/b1-access-and-intake/approved.html` (PR #162) renders every part.

| Part | Tokens |
|---|---|
| TurnBar segment | `--muted` fill, 3 px inset `--border` bottom rule, label `--foreground`, count `--muted-foreground` |
| TurnDisc | `--card` fill, 2 px dashed `--input` outline, initials or `·` in `--muted-foreground` |
| Holder word | `--muted-foreground` |
| StatusChip | `--muted` fill, `--border` outline, word and glyph `--muted-foreground` |
| Notice | `--muted` fill, `--border` outline, icon `--muted-foreground` |
| Pending-counsel mark | `circle-dashed` glyph and words in `--muted-foreground` |
| “Not supplied” mark | `--muted` fill, 1 px dashed `--input` outline, text `--foreground` |

Computed contrast, light / dark: `--muted-foreground` on `--muted` 5.84 / 6.43, on `--card` 6.32 / 6.66; `--foreground` on `--muted` 16.42 / 13.23; the dashed `--input` outline on `--card` 3.30 / 3.56 and on `--muted` 3.05 / 3.43. The segment’s `--border` rule is not a signal; the word and the dashed disc carry the meaning.

### 3.4 Expression tokens

| Token | Client | Representative | Use |
|---|---|---|---|
| `--c-h` | 48px | 30px | Control height (buttons, inputs, selects) |
| `--c-px` | 18px | 10px | Control horizontal padding |
| `--c-radius` | 10px | 6px | Control corners |
| `--input-radius` | 10px | not set (inputs fall back to `--c-radius`, 6px) | Input corners |
| `--card-radius` | 12px | 8px | Expression card radius. After the specimen’s final overrides no component reads it; cards use the fixed radii in [Radii](#6-radii) |
| `--chip-h` / `--chip-px` / `--chip-radius` / `--chip-fs` | 28 / 10 / 7 / 14.5 px | 22 / 7 / 5 / 12.5 px | State chip |
| `--chip-h-sm` / `--chip-px-sm` / `--chip-fs-sm` | 24 / 8 / 13.5 px | 20 / 6 / 12 px | Small chip in rows |
| `--pad` | 16px | 12px | Card and cell padding |
| `--input-bw` | 1px | 1px | Input border width |
| `--focus-w` / `--focus-off` | 2 / 2 px | 2 / 1 px | Focus outline width and offset |
| `--check-size` / `--check-radius` | 24 / 6 px | 16 / 4 px | Checkbox and radio box |
| `--check-row` | not set (rows fall back to 44px) | 24px | Clickable height of a checkbox or radio row |
| `--t-{style}-size` / `-lh` / `-weight` / `-family` / `-track` / `-stretch` | see [Typography](#4-typography) | | Type scale, one set per style |

The minimum targets in [hard rule 8](#13-hard-rules) are rules, not tokens; the specimen defines no target tokens.

Tailwind utilities from `tokens.css`: `h-control`, `min-h-control`, `h-chip`, `rounded-control`, `rounded-input` (falls back to `--c-radius` where `--input-radius` is not set), `rounded-card`, `rounded-chip`, `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-ui`, `text-small`, `text-label` (each sets size, line height, weight and tracking for the current expression), `ease-standard`, and every colour above as `bg-*`, `text-*`, `border-*`. The overlay shadow is `shadow-(--shadow-overlay)`.

## 4. Typography

**IBM Plex Sans** for everything, with tabular figures on times, dates and numbers (`font-variant-numeric: tabular-nums`). **IBM Plex Mono** only for identifiers people copy: case IDs (`HL-2026-0142`), matter numbers and licence numbers. The specimen loads Sans 400, 500, 600, 700 and 400 italic and Mono 400 and 500. Its components render Sans 400, 500 and 600, with 700 only on `<strong>` lead-ins in draft notices, toasts and the sign dialog; no text is italic, and Mono renders at 400 (the licence number inside the sign dialog’s `<strong>` is synthesised bold). Every type style resolves to Plex Sans at 100% stretch: display, H1 and H2 through `--font-display`, the rest through `--font-sans`. `--font-reading`, `--font-desk` (turn-disc initials) and `--font-doc` (the specimen’s own page) are further Plex Sans aliases. Both families are SIL Open Font License and must be **self-hosted** (see [Applying the system](#16-applying-the-system)).

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

**Client text floor** (amendment, 2026-11-18). Meaningful text in the client expression is at least 13 px. The client expression has no 13 px token: `--t-small-size` and `--t-label-size` are 13 px only under `data-expression="representative"`, and the smallest client styles are Small and Label at 15 px. So client text the specimen sets below 13 px uses the client Label size and line height (`--t-label-size`, `--t-label-lh`; 15 on 20), keeping its own colour and weight: the holder word, tab labels, the wordmark tag, the date-tile month and year, and the task-badge count. Where 15 px does not fit a component (the 16 px task badge, the 52 × 56 px date tile, the 56 to 72 px holder column), the component grows; nothing goes below 13 px. Turn-disc and avatar initials are `aria-hidden` and always sit beside the word or name they stand for, so they are not meaningful text and keep the specimen sizes.

**Client text scale** (amendment, 2026-11-19). The owner’s words: “Yes, match at 15 px (Recommended)”. Meaningful client text uses the client’s existing 15 px Small (`--t-small-size`, `--t-small-lh`; 15 on 22) and Label (`--t-label-size`, `--t-label-lh`; 15 on 20) tokens. This now also covers text the specimen or B1’s approved Checklist set at 13 to 14.9 px, so client screens match across batches. In the specimen that is the TurnBar count, client section headings and the turn tag beside them, task metadata (“Asked by Priya Raman on 15 Nov 2026”), row, document and plan detail lines, and the deadline month; B1’s are listed in `docs/design/b1-access-and-intake/decision.md`. Running text, metadata and counts take Small; short labels and headings take Label; each keeps its own colour and weight. Two things keep their sizes: state chips, which use the chip tokens (`--chip-fs` 14.5 px, `--chip-fs-sm` 13.5 px), and `aria-hidden` initials in turn discs and avatars. No token value changes.

**Representative text.** The desk may keep the specimen’s 12 px and 12.5 px text; test it at 200% zoom. As rendered: state chips at 12.5 px (12 px small), holder word, sidebar group labels and counts, queue group labels and date-tile year at 12 px, queue row metadata and dates, column headings, footer, sidebar user line and date-tile month at 12.5 px, and Mono IDs at 0.92em (about 12 to 12.9 px). Keyboard hints are 12 px (amendment of 2026-11-19); avatar initials (10.5 px) and turn-disc initials (9.6 px on a 24 px disc, 8 px on a 20 px disc) are `aria-hidden` like the client’s.

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
| Fact card, finding, notice, error summary, date tile | 8 px | 8 px |
| Deadline item, task card, signed-plan header, toast, empty state | 10 px | 10 px |
| Dialog | 12 px | 12 px |
| Checkbox | 6 px | 4 px |
| Grouped list (`c-group`) | 14 px | n/a |
| Icon well | 9 px | n/a |
| Discs and avatars | round | round (workspace mark 6 px) |

## 7. Elevation

Flat surfaces separated by 1 px hairlines (`--border`). One elevation shadow, `--shadow-overlay`, for anything that floats: popovers, menus, dialogs and toasts. Dialogs also carry a 1 px `--border` and sit on `--scrim`. Cards and rows never get a drop shadow. The specimen uses `box-shadow` for exactly these other things:

- Buttons: a 1 px base line, `0 1px 0 rgba(0,0,0,.04)`.
- Inputs: `inset 0 1px 1px rgba(0,0,0,.03)`; an invalid input instead gets a 3 px halo of `--destructive` at 18%.
- Edge rules, drawn as inset shadows: 3 px on the left for the signed-plan header (`--seal`), deadline items (`--urgent` within 90 days, `--caution` within 180 days or date unknown) and changed facts (`--caution`); 3 px at the bottom of turn-bar segments (turn colour); 2 px on the left of the selected queue row (`--primary`, graphite; never `--ring`).

## 8. Focus

A 2 px `--ring` outline on `:focus-visible`, offset 2 px on client controls and 1 px in dense desk rows (`--focus-w`, `--focus-off`). The ring is the only ultramarine in the interface, so focus is never mistaken for a state or a turn. Every interactive element shows it in both themes; custom checkboxes and radios show it on the drawn box. Focus must never be hidden behind a sticky bar (see [Accessibility](#14-accessibility)).

## 9. Motion

Motion confirms an action and stops. Nothing animates on its own.

| Use | Duration | Easing |
|---|---|---|
| Hover and selection tint | `--dur-1` 120 ms | `--ease` cubic-bezier(.25,.1,.25,1) |
| Detail pane slide and fade | 160 ms (stated by the specimen, which defines no token for it) | `--ease` |
| List selection | Instant; no animated reorder | |
| Spinners (loading, saving) | 0.8 s and 1.2 s linear rotation | |

No bounce and no stagger. Under `prefers-reduced-motion: reduce`, slides become fades and fades become instant; spinners stop and the words (“Saving”, “Uploading”) carry the state.

## 10. Iconography

**Lucide** (`lucide-vue-next`), already in the stack. Interface icons use 1.75 px stroke at 15 to 18 px; state glyphs render at 2 px stroke at 16 px in chips and 18 px in row icon wells. Icons and glyphs are `aria-hidden="true"`; the adjacent word carries the meaning.

One custom family, drawn as small Vue components on a 24 px grid: **work-status circles that fill as work moves**. Dashed with a quarter fill for intake, half for submitted, three quarters for reviewing, solid with a cut-out tick for signed and solid with a cut-out arrow for delivered; an outlined circle with a question mark for clarification; a dashed circle with a question mark for unknown. The cut-out uses `--glyph-cut` (the surface colour behind the glyph). Copy the paths from `approved.html`.

## 11. Semantic states

Twenty-three states in five groups, plus “Review requested” added by the 2026-11-19 amendment below. Each is a glyph in the role colour, a word in the role ink and, for clients, the role tint behind the chip. Urgent states alone are solid. The exact words are part of the system; `tokens.json` carries the same table under `states`.

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

**Review requested** (amendment, 2026-11-19). The owner’s words: “Approve both (Recommended)”. A Work status state for a review that Staff requested from a representative and nobody has started. It must never read as “Representative reviewing”. B2’s `docs/design/b2-practice-preparation/approved.html` renders it.

| Group | State | Word | Role | Glyph |
|---|---|---|---|---|
| Work status | `review-requested` | Review requested | progress | `send` |

On the desk it is the neutral representative StatusChip: `--card` fill, `--border` hairline, glyph in `--progress`, word in `--progress-ink`, sized by `--chip-h`, `--chip-px`, `--chip-radius` and `--chip-fs` (small: `--chip-h-sm`, `--chip-px-sm`, `--chip-fs-sm`). B2’s concept draws a dashed outline around it to mark it as unapproved; the build drops that outline. No token is added. `tokens.json` still lists the original 23 states, so take this one from here.

Escalation triggers for “Needs a licensed professional now”: refusal, removal, criminality, health, or status ending soon. Status ending within 90 days escalates automatically. An unknown expiry never shows a guessed countdown; a question goes to the client.

## 12. Components

Choose in this order: an existing higher-level app component, then the shadcn-vue primitive in `app/components/ui/*` restyled through tokens, then a new component composed from those primitives. Composed components live outside `app/components/ui`, which stays shadcn-vue output.

Values below are the specimen’s final computed styles. Representative values are those its stylesheet gives a standalone desk layout; as rendered in `approved.html`, the desk examples also inherit some client rules (`decision.md`, discrepancy 8).

### 12.1 Primitives (shadcn-vue on reka-ui)

| Need | Primitive | Relay rules |
|---|---|---|
| Button | `ui/button` | Variants: primary (`--primary`, one per screen; hover mixes 86% `--primary` into `--background`), secondary (card fill, `--border` hairline), ghost (`--foreground` text, no underline, no border), destructive (card fill, `--destructive` text, `--border` hairline). Secondary and ghost hover to `--accent`. Label 500 with −0.005em tracking; height `--c-h`. Loading shows `ui/spinner` and the action word (“Uploading”, “Signing”) with `aria-busy`. Disabled uses `--muted` with a reason nearby (“Staff prepare; only a representative can sign.”). |
| Keyboard hint | `ui/kbd` | Inside the button: 18 px tall, 12 px at 500, `--muted` fill, `--border` hairline, full-strength `--muted-foreground`, never dimmed with opacity. On the primary button it is transparent, takes the label colour and has a `--primary-foreground` border at 45%. |
| Field, label, hint, error | `ui/field`, `ui/label`, `ui/input`, `ui/textarea` | Label and hint above the control. Error after the hint and above the control, `--destructive`, 500, with an icon; the invalid control gets a `--destructive` border and halo (section 7), saying what to do (“Enter the expiry date as day, month and year”). `aria-invalid` and `aria-describedby` on the control. |
| Date | three `ui/input`s in a `fieldset` | Day, Month, Year with their own labels; `inputmode="numeric"`. |
| Checkbox, radio | `ui/checkbox`, `ui/radio-group` | Box `--check-size`; row height `--check-row`; focus ring on the drawn box. |
| Select | `ui/select`, `ui/native-select` | Native select on phones. |
| Status chip | `ui/badge`, composed as `StatusChip` | See 12.2. |
| Avatar | `ui/avatar` | Neutral `--secondary` fill; 32 px with 13 px initials for clients, 24 px with 10.5 px initials on the desk (the workspace mark is a 24 px `--primary` square with 6 px corners). Presence only; never coloured by turn. |
| Dialog | `ui/alert-dialog` for consequential actions, `ui/dialog` otherwise | Title says the action and its object; body says exactly what will be recorded; destructive or signing action is explicit (“Remove document”, “Sign version 3”), cancel is “Keep it” or “Cancel”. 12 px corners, 1 px `--border`, `--shadow-overlay`, 24 px padding. Client actions stack full width. Focus trapped and returned. |
| Toast | `ui/sonner` | Names the real event (“Uploaded. Priya will review your IELTS result.”, “Signed version 3. Not delivered yet.”). `role="status"`. |
| Empty state | `ui/empty` | 1 px dashed `--border`, 10 px corners, centred content; says what empty means and offers the next useful action. |
| Notice | `ui/alert` | Draft notice: `--caution-soft` tint, 1 px solid border mixing 45% `--caution` into `--border`, 8 px corners, `--caution` icon, body in `--foreground`. Client general-information notice: the same with progress in place of caution (see `decision.md`, discrepancy 7). |
| Desk navigation | `ui/sidebar` | Views with counts: Urgent, New intake, Your turn to review, Client’s turn, Changed rules, Mine. |
| Command bar | `ui/command` | ⌘K, labelled “Search” with the hint. |
| Dense tables | `ui/table` | Representative check-answers table. |
| Panes | `ui/scroll-area`, `ui/resizable` | Desk queue and detail panes. |
| Disclosure | `ui/collapsible` | “Why we ask”. |

### 12.2 Composed components

**StatusChip.** Glyph (role colour) and word (role ink) for one of the states in [section 11](#11-semantic-states), including the 2026-11-19 `review-requested` amendment. Word at 500 in the chip size (`--chip-fs`), glyph 16 px, padding 0 8 px 0 6 px, 5 px gap. Client: `--r-soft` fill, transparent border. Representative: card fill, `--border` hairline. Urgent: solid `--urgent` with `--urgent-foreground`. Sizes: default and small (`--chip-h-sm`). Never truncate the word; let it wrap. Glyph `aria-hidden`.

**TurnDisc.** A round disc in the turn colour with `-foreground` initials (OA, PR) or a glyph: `check` for done, `pen-line` for signed, `user-round` for unassigned. Sizes 16, 20, 24 (default), 32 and 36 px; initials at 0.4 × the disc size, 600, in `--font-desk`. Always `aria-hidden`; always next to a word.

**TurnBar** (client). A `nav` labelled “Whose turn” directly under the client top bar on every client screen, with two equal links: the client segment (“Your turn” and a count, “1 thing to do”) and the representative segment (“Priya’s turn”, “2 things in progress”). Each segment: turn tint, 3 px inset bottom rule in the turn colour, 32 px disc, label 15 on 20 at 600 in turn ink, count at the client Small size and line height (`--t-small-size`, `--t-small-lh`; 15 on 22, amended 2026-11-19 from 14 on 19) in `--foreground`, at least 64 px tall; a hairline between segments. When the client owes nothing the left segment is done green: “Nothing for you”, “Priya has it”. Each segment opens the matching filtered list. Long translations wrap (about 110 px at 320 px in French); nothing truncates. If it is made sticky, reserve its height and add it to `scroll-padding-top`.

**Holder.** Ends every list row in both portals, right-aligned in its own column (56 to 72 px wide). A 24 px TurnDisc over the word (600, turn ink, breaking only at spaces; 12 px on the desk, the client Label size in the client portal, see [Typography](#4-typography)). When nobody holds the item it uses the no-turn style ([Whose turn](#33-whose-turn)). A visually hidden prefix makes it read as a sentence: “Whose turn: You”, “Whose turn: Priya”, “Status: Done”, “Status: Signed”. Client words: You, “You, later”, Priya (the representative’s first name), Done, Checked, Signed. Desk words: You, Client, Unassigned, Signed, and a colleague’s first name (“Daniel”; amendment 2026-11-19, the owner’s words: “Approve both (Recommended)”) when another member of the practice holds the turn. A colleague holds it as the practice, so the disc and word use the representative turn colour, as “You” and “Unassigned” do, and the hidden prefix reads “Whose turn: Daniel”.

**CaseTurnLine** (desk). In the case header under the client name: a 20 px disc and “Your turn: review and sign version 3” in turn ink at 13 px, followed by a muted explanation (“The client is waiting on you. Asking a question passes the turn to them.”).

**QueueRow** (desk). A full-row link: work-status glyph (18 px column), name (500) and program, next hard date with its days count or “Date unknown”, state chips, owner, and the Holder in a 72 px right-hand column. Selected row: `--accent` fill with a 2 px `--primary` (graphite) left edge, never the focus ring colour, because blue means the representative's turn. Average height 84 px. Up to four colours per row; the holder must stay in its own column. A narrow layout stacks the date beside the name and the chips below.

**TaskRow** (client). The client counterpart of the queue row: tinted icon well (36 px, role tint, role glyph), what is needed, who asked and when (“Asked by Priya on 15 Nov 2026”), state chip and Holder.

**ProvenanceRow.** A `dl` under every conclusion: Source (linked title and domain), Effective (or “Not stated by source”), Verified as of (date). Small text; labels at 500 in `--muted-foreground`, values in `--foreground`. Unknown dates stay unknown.

**SignedPlanHeader.** Comes first on a signed plan and is shown only for a signed version. Card fill, hairline, 10 px corners, 3 px inset `--seal` rule on the left, 24 px `badge-check` in `--seal`. Text: “Reviewed and signed by **{name}**, {designation}, licence {number in Plex Mono}, on {date}. Version {n}.” Below: a link “Check this licence on the CICC register” in `--seal-ink` (600, at least 24 px tall on the desk and 32 px for clients) and “Sources verified as of {date}.” It is never labelled “not legal advice”. The export carries the same header.

**DraftNotice.** On every draft or general result: “Draft assessment, version {n}. General information, not legal advice, until a representative signs it. Sources verified as of {date}.” The client variant for program information read without a representative: “General information, not legal advice. This describes {program}, not your situation. A licensed representative must review your situation before you rely on a plan. Sources verified as of {date}.” Never placed on a signed plan.

**SaveState.** `role="status"`, small, 500. Saving (spinning loader, muted), “Saved at 2:41 pm” (positive ink, check), offline (caution ink: “Not saved. You’re offline. We’ll try again when you reconnect.”). Desk wording: “Saving draft”, “Draft saved 2:41 pm”, “Not saved. Connection lost, retrying.” Never shows saved when it is not.

**ErrorSummary.** At the top of the form on submit, `role="alert"`, `tabindex="-1"`, takes focus. 1 px `--destructive` border with a 3 px left edge, 8 px corners, title “There is a problem” (client) or what is blocked (“Version 3 can’t be signed yet”), and a list of links to each field or exact item. On the desk it blocks signing until each item is resolved or disclosed.

**QuestionPage** (client intake). One question per page: back link (44 px), SaveState, “Question 4 of 9”, the question as the fieldset legend (H1), hint, the control, an honest “I don’t know” option, “Why we ask” as a disclosure, and one primary “Continue”. The desk counterpart, **ClientQuestionComposer**, writes one plain-language question plus “Why you’re asking (shown to the client)” and sends with ⌘ Enter; sending passes the turn to the client.

**CheckAnswersRow.** Client: a `dl` row with the question (600), the answer, and a “Change {thing}” link; “I don’t know” answers stay visible in caution ink. Desk: a dense `ui/table` with Fact, Answer, From and Action; changed answers carry a “Changed since v{n}” chip and unknown answers say “Not known”.

**DeadlineItem.** A card with 10 px corners: within 90 days it gets a `--urgent` border and a 3 px inset `--urgent` left edge; within 180 days or with the date unknown, a 3 px inset `--caution` left edge. A date tile (no fill, 1 px `--border`, 8 px corners, at least 52 × 56 px; day 20 px at 600; month and year in `--muted-foreground`, on the desk month 12.5 px at 500 and year 12 px, in the client portal both at the client Label size, see [Typography](#4-typography)) or “Date unknown” in caution ink, the title, the date and a plain “In 40 days” chip by urgency, and the source line (“From your permit, checked by Priya on 3 Nov 2026. Priya will advise on timing.”). A date with nothing to do is positive green, never blue. No guessed countdowns.

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
