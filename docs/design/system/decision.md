# Design system decision: Relay

Date: 2026-11-17
Gate: UI design gate, system creation (round 1: five options; round 2: three variations)
Status: approved by the owner; amended on 2026-11-18 (see [Amendments](#amendments-2026-11-18))
Approved specimen: [approved.html](approved.html)
Implementer guide: [DESIGN.md](../../../DESIGN.md)
Tokens: [tokens.css](tokens.css), [tokens.json](tokens.json) (not yet wired into the app)

## Approval

The owner approved **round 2, variation 2: Relay** on 2026-11-17.

The owner's exact words, unedited:

> go with recomended

Context: the owner wrote this in reply to the orchestrator's standing recommendation, "Relay, satisfied". That recommendation was the one in the round-2 presentation ("Choose 2. Relay"), so the approval covers Relay exactly as rendered in `approved.html`, including the decisions the specimen makes on the open items listed below.

## Amendments 2026-11-18

The owner approved two amendments on 2026-11-18, at the B1 (access and intake) design gate. They are written into `DESIGN.md` sections 3.3 and 4. No token was added or changed, and `approved.html`, the rejected files, `tokens.css` and `tokens.json` are unchanged.

### 1. Client text is at least 13 px

The orchestrator asked:

> Should meaningful text on the Client's screens be at least 13 px? The approved specimen uses 12 px for some Client labels.

The owner answered:

> Yes, Client side only (Recommended)

The Representative side may keep 12 px. The client expression has no 13 px token (`--t-small-size` and `--t-label-size` are 13 px only for the representative), so client text the specimen sets below 13 px uses the client Label size and line height, `--t-label-size` and `--t-label-lh` (15 on 20). Turn-disc and avatar initials are `aria-hidden` beside their word or name and keep the specimen sizes.

### 2. A neutral "no turn" style

The orchestrator asked:

> When nobody holds the turn, and for pending-counsel marks, should the screens use a neutral "no turn" style built from existing tokens?

The owner answered:

> Yes (Recommended)

The style uses only `--muted`, `--muted-foreground`, `--border`, `--input` (dashed outlines), `--card` (disc fill) and `--foreground`. Amber (`--caution`, the client) and lake blue (`--progress`, the representative) are never used for a turn nobody holds. B1's `docs/design/b1-access-and-intake/approved.html` (PR #162) renders every part.

## What was chosen

Relay is **Console as the system**, with Companion's **"whose turn is it?"** colours carried through both portals.

| Actor or outcome | Token | Role it points at | Light | Dark |
|---|---|---|---|---|
| Client | `--color-turn-client` | `--caution` (amber) | #9A5B00 | #F0B04A |
| Representative | `--color-turn-representative` | `--progress` (lake blue) | #1F6496 | #5FB3E3 |
| Done | `--color-turn-done` | `--positive` (green) | #1A7F45 | #4CC98A |
| Signed | `--color-turn-signed` | `--seal` (violet) | #5B47D6 | #A99BFF |

### Carried from Console (round 1, option 3)

- Graphite neutrals and hairlines; colour only for meaning (state, links, focus, whose turn).
- IBM Plex Sans for everything with tabular figures; IBM Plex Mono only for identifiers people copy (case IDs, licence numbers).
- Density as a token: the same components make 30 px representative controls and 48 px client targets (`data-expression="representative"` and `data-expression="client"`).
- Work status as a circle that fills from intake to signed; Lucide icons at 1.75 px stroke.
- Keyboard-first desk: compact two-line queue rows (84 px average), visible shortcut hints, side-by-side review, ⌘ Enter plus a confirm dialog for signing.
- Neutral state chips for representatives, state-tinted chips for clients, urgent as the only solid fill.
- 6 px base radius, flat surfaces, one overlay shadow, a 2 px ultramarine focus ring.
- Lowest implementation risk: closest of the five to shadcn-vue defaults.

### Carried from Companion (round 1, option 4)

- The whose-turn colour logic: amber (Companion's marigold) for the client, blue (Companion's lake) for the representative, green for done, violet (Companion's indigo) for signed. In Relay these are aliases of existing state roles, not new colours.
- Discs with initials for the actor whose move it is; presence avatars stay neutral.
- The representative named on the client home.

### New in Relay

- **Turn bar** on every client screen: "Your turn: 1 thing to do" beside "Priya's turn: 2 things in progress". When the client owes nothing, the left segment turns green and says "Nothing for you".
- **Holder** at the end of every list row in both portals: a disc and a word saying who has the item now.
- **Next-actor holder column** in the representative queue (72 px, words break only at spaces).
- Two queue views renamed by turn ("Your turn to review", "Client's turn") and a turn line in the case header ("Your turn: review and sign version 3"). Asking the client a question passes the turn.

### Changes made in round 2 (shared by all three variations, kept in Relay)

- Progress moved from ultramarine to lake blue (#1F6496 light, #5FB3E3 dark). In round 1 the dark-theme progress colour and the focus ring were the same value (#7AA2FF), so a focused control could read as "the representative's turn".
- "Intake underway" and "Supplied" moved from blue to amber, because both are the client's move; no chip now contradicts the turn beside it.
- Grey-drift fixes: icon wells on client rows take the state tint, a date with nothing to do is green, the task badge is amber.

## What was rejected and why

### Round 1 (five options)

| Option | Idea | Why it was not chosen |
|---|---|---|
| 1. Margin ([rejected-round1-margin.html](rejected-round1-margin.html)) | A signed record: Literata reading serif with Schibsted Grotesk, ink on cool paper, a reviewer's margin of marks. | The strongest expression of the signed record, but slow for representatives (review pane about 1,340 px tall at 1440 wide) and serif body text for second-language readers on phones was unproven. The greeting delayed the next step. |
| 2. Signal ([rejected-round1-signal.html](rejected-round1-signal.html)) | Airport wayfinding: eight sign shapes as solid colour plates, Atkinson Hyperlegible Next. | Runner-up. The most accessible and distinctive, but the loudest: two or three solid plates per queue row compete, rows were about 140 px (six files above the fold), the octagon read as a hard stop for a fixable upload, and three amber pairs needed an outline to meet non-text contrast. |
| 3. Console ([rejected-round1-console.html](rejected-round1-console.html)) | A precise instrument: graphite, hairlines, colour only for meaning, Plex. | **Became the base.** Chosen by the owner as the system after round 1; its weaknesses (least warm, at risk of grey drift) were what round 2 addressed. Superseded by Relay. |
| 4. Companion ([rejected-round1-companion.html](rejected-round1-companion.html)) | A person on your side: colour answers "whose turn is it?", round shapes, warm shadows, Readex Pro. | The best emotional fit and a new colour logic, but rounded, shadowed representative rows (about 120 px) cost density and may read as consumer software to practices that pay; the signed plan had to work harder to look official. Its turn logic was carried into round 2. |
| 5. Almanac ([rejected-round1-almanac.html](rejected-round1-almanac.html)) | Time is the interface: timeline home, agenda queue, Archivo width axis, pattern glyphs. | The most specific to temporary residents, but the boldest: big date blocks over-alarm anxious clients, sorting by date buries files ready to review, and condensed 13 px text is at the edge of comfort. |

After round 1 the owner's direction (as recorded in the round-2 presentation) was: Console as the system, with Companion's "whose turn is it?" colour logic on the client side.

### Round 2 (three variations of that direction)

| Variation | Idea | Why it was not chosen |
|---|---|---|
| 1. Turn Line ([rejected-round2-turn-line.html](rejected-round2-turn-line.html)) | The smallest change: one turn line on the client home, Console everywhere else. | The answer to "whose turn?" disappears on Tasks and Documents, so it treats the turn as a feature of one screen rather than a property of the system. Only one date fits above the fold (permit expiry at 669 px). The representative desk gets no next-actor signal. |
| 3. Two Voices ([rejected-round2-two-voices.html](rejected-round2-two-voices.html)) | Two rooms: a warm stone client room in Readex Pro with tinted turn cards; the desk is Console; signed and sourced text stays in Plex. | Runner-up. The warmest client experience, but two typefaces meet inside one card, two type scales and two families to self-host, twelve surface overrides and 306 token pairs to maintain (against 176), the client portal looks least like the desk, and the desk has no next-actor signal. |

Relay was recommended because it makes "whose turn" a rule of the system in both portals, gives representatives the next actor at no density cost (84 px average row, the same as Console), answers the anxious client on every screen, and keeps one typeface, one type scale and 176 audited token pairs.

## Open items the approval settles

The Relay critique held these for the owner. The owner approved the recommendation without changing them, so the specimen's answer stands until a later gate says otherwise:

- **Next actor in the queue:** included (holder column). Validate with representatives; it may make the "Client's turn" view less necessary.
- **Unassigned files:** shown as the practice's turn, in blue, with the word "Unassigned" and an empty person glyph.
- **ECA report holder "You, later":** kept amber, with "later" in the words, because it is honest about who acts next.
- **"Your turn" colour by viewer:** colour belongs to the actor, so a representative's own turn is blue; the label always names the actor.

Still open, to be decided at the surface gates (not by implementers):

- Whether the turn bar is sticky on scroll. If it is, reserve its height and set `scroll-padding-top` (see build requirements).
- How the turn bar appears on one-question intake pages. The approval says every client screen; the specimen renders it on Home and Documents only and shows the one-question page as a component without it.
- Desk text below 12 px, and blue used outside its meaning (see discrepancies 2 and 7). Client text below 13 px was settled by the 2026-11-18 amendment.

## Build requirements recorded in the critiques

These are outside what a static specimen can prove. Every UI ticket that builds on this system must meet them and show the evidence in its build check.

1. **Screen reader output.** Verify in a real assistive technology (VoiceOver on iOS and macOS, NVDA on Windows, TalkBack on Android). Discs and glyphs are `aria-hidden`; the word carries the meaning. Each holder has a visually hidden prefix, "Whose turn:" or "Status:", so it is not read as a bare name. The turn bar is a `nav` landmark labelled "Whose turn". Save state and toasts use `role="status"`; the error summary uses `role="alert"` and takes focus; dialogs use `role="dialog"`, `aria-modal` and `aria-labelledby` with a real focus trap.
2. **Keyboard order.** Verify traversal order in the built app, not the specimen. Every shortcut has a visible button equivalent. Signing is never a single key: it needs ⌘ Enter (Ctrl Enter) plus a confirm dialog. Single-character shortcuts ("P" preview, "C" ask client) must be possible to turn off or remap, or be active only when the relevant region has focus (WCAG 2.1.4).
3. **Focus not obscured by sticky bars (WCAG 2.4.11).** The sticky phone tab bar, and the turn bar if it is made sticky, must never hide a focused control. Set `scroll-padding-top` and `scroll-padding-bottom` on the scroll container to their heights.
4. **200% zoom.** Test the representative desk at 200% zoom, including 13 px secondary text. The stacked "facts and conclusion" layout is the high-zoom layout for representatives.
5. **Self-hosted fonts.** The specimens load IBM Plex from Google Fonts by URL; the app must self-host the same files (SIL Open Font License), with subsets that render every name in the specimen (Oluwaseun Adébáyọ̀-Fitzgerald, Nguyễn Thị Minh Khai, Siobhán Ní Bhriain).
6. **Colour count per queue row.** A row can carry up to four colours (work glyph, chips, urgent date, holder). The holder must stay in its own right-hand column (72 px) so it scans as a column. Re-check the count whenever a state is added to the queue.
7. **Turn bar height with long translations.** With long French strings at 320 px the turn bar grows to about 110 px. Nothing may overflow or truncate; if the bar is sticky, reserve that height.
8. **Reflow at 320 px** with long names and translated turn labels, with no state truncated.
9. **Targets:** every target at least 24 by 24 px; primary client targets at least 44 px; the CICC register link at least 24 px tall for representatives and 32 px for clients.
10. **Rails and discs always carry words.** Never a bare dot, never a rail without a label.
11. **Same turn words on every screen of a portal** (WCAG 3.2.4).
12. **Research checks** with real applicants and representatives: whether amber "Your turn" reads as "your move" rather than "warning", and whether representatives want the holder column.

## Discrepancies between the approved specimen and the critiques

Found while recording; none changes the approved design. Implementers follow the specimen, except where a dated amendment (2026-11-18, below and in `DESIGN.md`) changes it, and raise these at the first UI gate.

1. **Fonts.** The specimen loads IBM Plex from Google Fonts by URL; the critiques require self-hosting. Expected for a specimen; the build must self-host.
2. **Text below the 13 px floor.** The round-1 Console critique held 13 px as the floor ("nothing goes smaller"). The Relay specimen renders smaller text in both portals (the client's own small size is 15 px): the holder word at 12 px, representative state chips at 12.5 px (12 px small), desk row metadata and the date-tile month at 12.5 px, tab, group and sidebar labels and the date-tile year at 12 px, keyboard hints at 11.5 px, avatar initials and the client task badge at 10.5 px, turn-disc initials at 8 to 9.6 px and Mono IDs at about 12 px. `DESIGN.md` section 4 lists each one. The Relay critique reports no rendered text below its minimum, so it measured against a lower floor. Owner decision needed before the queue and client list surfaces are built.
   **Settled in part on 2026-11-18:** client text is at least 13 px and the desk may keep 12 px (see [Amendments](#amendments-2026-11-18)). Desk keyboard hints at 11.5 px remain open.
3. **Sticky bars.** The specimen's turn bar is not sticky and no screen demonstrates `scroll-padding`, so focus-not-obscured is unproven. Requirement 3 applies.
4. **Turn bar reach.** "Every client screen" is rendered on Home and Documents only; the one-question intake page has no specimen with the turn bar.
5. **Turn alias names.** The presentation names `--turn-client` and friends; the specimen's token block defines only `--color-turn-*` inside `@theme inline`, and its own CSS maps turns through `data-turn` attributes. `tokens.css` follows the specimen: `--color-turn-*` in `@theme inline`, pointing straight at the roles, and no `--turn-*` variables.
6. **Icon stroke.** The specimen says "Lucide at 1.75 px stroke for everything"; the state glyphs inside chips render at 2 px. `DESIGN.md` records both as rendered: 1.75 px for interface icons, 2 px for state glyphs.
7. **Blue outside its meaning.** Relay's rule is that lake blue is always the representative's turn and ultramarine is only focus. Two places in the specimen, inherited from Console, bend it: the client "General information, not legal advice" notice uses the progress (lake blue) tint, and the selected queue row marks its left edge with the focus-ring colour. Neither was flagged by the critique. Owner decision needed at the first gate that shows either surface.
8. **Desk examples inherit client rules.** Every representative panel in `approved.html` (53 of them) sits inside the page's `.doc.x-client` wrapper, so the specimen's `.x-client …` rules and the client's `--input-radius` also reach the desk examples. As rendered, desk state chips are tinted (all 156), desk dialog actions stack, desk avatars are 32 px, the desk CICC register link is 32 px tall and desk inputs have 10 px corners. The specimen's own text ("Representatives get a neutral chip so rows stay quiet") and its rules scoped to the client describe the opposite, so `DESIGN.md` records the values the stylesheet gives a standalone `data-expression="representative"` layout: neutral chips, actions in a row, 24 px avatars, a 24 px link, 6 px input corners. Owner decision needed at the first desk gate.

## Files in this record

| File | What it is |
|---|---|
| `approved.html` | Relay's full specimen (round 2, `2-relay/index.html`), unchanged except the approval line in its header. |
| `rejected-round1-margin.html`, `-signal`, `-companion`, `-almanac` | Round-1 options the owner saw and did not choose, unchanged. |
| `rejected-round1-console.html` | Round-1 Console, unchanged. It is the base of the approved Relay system and is superseded by it; the file itself carries no note. |
| `rejected-round2-turn-line.html`, `rejected-round2-two-voices.html` | Round-2 variations the owner saw and did not choose, unchanged. |
| `tokens.css`, `tokens.json` | The approved values for Tailwind 4 and shadcn-vue, and the same values as data. |

Sources: `origin/design/system-options` (`docs/design/system/presentation.md`, `options/*/critique.md`) and `origin/design/system-round-2` (`docs/design/system/round-2/presentation.md`, `round-2/*/critique.md`). The full computed contrast table is at the end of `approved.html`.
