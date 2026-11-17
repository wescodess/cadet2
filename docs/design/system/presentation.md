# cadet design system: five options

Date: 2026-11-17. Path: system creation through the UI design gate (round 1). These are options for the owner to choose from; nothing here is approved, and no tokens have been written into the app. “cadet” is a working name.

Each option is a complete system with two expressions, client (phone first, calm, plain language) and representative (desktop, dense, keyboard first), in light and dark themes. Every option is built from the same specimen content so they can be compared like for like: the same client with an expiring permit, the same signed plan that changed after a new job, the same queue with one urgent file, and the same draft assessment covering supported, unknown, blocked and out-of-scope programs. All names, licence numbers and dates are fictional.

## How to look at them

| Option | Board (728 px, for chat) | Full specimen | Screenshots |
|---|---|---|---|
| 1. Margin | [preview](options/1-margin/preview.html) | [index](options/1-margin/index.html) | [desktop](options/1-margin/desktop.png), [desktop dark](options/1-margin/desktop-dark.png), [mobile](options/1-margin/mobile.png) |
| 2. Signal | [preview](options/2-signal/preview.html) | [index](options/2-signal/index.html) | [desktop](options/2-signal/desktop.png), [desktop dark](options/2-signal/desktop-dark.png), [mobile](options/2-signal/mobile.png) |
| 3. Console | [preview](options/3-console/preview.html) | [index](options/3-console/index.html) | [desktop](options/3-console/desktop.png), [desktop dark](options/3-console/desktop-dark.png), [mobile](options/3-console/mobile.png) |
| 4. Companion | [preview](options/4-companion/preview.html) | [index](options/4-companion/index.html) | [desktop](options/4-companion/desktop.png), [desktop dark](options/4-companion/desktop-dark.png), [mobile](options/4-companion/mobile.png) |
| 5. Almanac | [preview](options/5-almanac/preview.html) | [index](options/5-almanac/index.html) | [desktop](options/5-almanac/desktop.png), [desktop dark](options/5-almanac/desktop-dark.png), [mobile](options/5-almanac/mobile.png) |

Each `index.html` contains foundations (type scale for both expressions, colour roles in both themes, spacing, radius, elevation, focus, motion, iconography), all twenty-three semantic states in both themes, the full component set in both expressions and both themes, the two specimen screens in both themes, the shadcn variable block, and a computed contrast table. Each folder also has a `critique.md`, held until the owner has reacted.

## What every option shares

- **One token architecture.** Standard shadcn-vue variables (`--background`, `--primary`, `--muted-foreground`, `--ring`, the sidebar set and so on) plus eight state roles with four tokens each: `--positive`, `--negative`, `--caution`, `--progress`, `--seal`, `--scope`, `--history`, `--urgent`, each with `-foreground` (text on the solid fill), `-soft` (tint) and `-ink` (state text on page, card and tint). A handful of expression tokens (control height, chip size, focus width, radius) switch between client and representative density.
- **The same state vocabulary.** Assessment coverage (supported, blocked, unknown, out of scope), work status (intake underway, submitted, clarification requested, representative reviewing, signed, delivered), evidence status (supplied, uploaded, awaiting review, accepted, replacement needed), review validity (not reviewed, signed version, changed since review, superseded), and urgency (needs a licensed professional now, within 90 days, within 180 days, date unknown). Every state has a colour, a glyph and a word; none depends on colour alone, and no state is shown in plain grey.
- **The same guardrails.** No scores, percentages, odds, rankings, confidence badges or “fastest route”. Drafts say “general information, not legal advice, until a representative signs it” with “sources verified as of”. Signed plans name the representative, designation, licence, date and version, link to the CICC register, and are not labelled “not legal advice”, because they are the representative’s advice. No government marks. “Representative”, never “agent”.
- **The same accessibility floor.** WCAG 2.2 AA: every token pair computed in both themes (172 per option, zero failures; Signal has three amber pairs mitigated by an outline, by design), every rendered text node checked against its real background, 24 px minimum targets and 44 px or more for primary client targets, visible focus on every control, reflow at 320 px with long names, reduced motion respected.
- **Free, self-hostable fonts.** All five families are SIL Open Font License.

## The five options

### 1. Margin

**Core idea.** Every plan is a record a licensed person stands behind. Calm reading type (Literata, a screen-reading serif) with Schibsted Grotesk for controls, ink colours on cool paper, and a fixed margin where reviewer’s marks live: tick, cross, query, caret, strike and a signature line. The urgent stamp is the only solid fill.

| | Best at | Worst at |
|---|---|---|
| Client portal | Making the signed plan feel like a letter from a real professional; long explanations are pleasant to read. | Serif body text for second-language readers is unproven; the greeting delays the next step slightly. |
| Representative portal | Careful review: draft text reads as a document under scrutiny, with coverage marks in a margin column. | Density: the review pane is long, so representatives scroll more than in Console. |

**Trade-offs.** The strongest expression of cadet’s core promise (a signed, sourced record), at the cost of speed in the representative queue and some risk for readers new to English.

### 2. Signal

**Core idea.** Airport wayfinding for a stressful journey. Eight sign shapes (circle fine, octagon stops, triangle needs attention, square moving, rosette signed, diamond outside, starburst urgent) as solid colour plates with a white pictogram and a word. Atkinson Hyperlegible Next, built so I, l and 1 never get confused. Navy direction fields point at the next step.

| | Best at | Worst at |
|---|---|---|
| Client portal | Instant comprehension for anxious, second-language readers on a phone; the strongest colour-independent state language. | Tone: solid plates and an octagon for “replacement needed” can feel stern for a fixable task. |
| Representative portal | Scanning a board from a distance; urgency is impossible to miss. | Volume and density: two or three plates per row compete, and rows are tall. |

**Trade-offs.** The most accessible and the most distinctive, but the loudest. It would need a quieter list treatment for representatives.

### 3. Console

**Core idea.** A precise instrument. Graphite neutrals and hairlines, where the only colour on screen is meaning: a status icon, a state word, focus, an urgent flag. Work status reads as a circle that fills from intake to signed. IBM Plex Sans throughout, Plex Mono only for identifiers. Density is a token: the same components make 30 px representative controls and 48 px client targets.

| | Best at | Worst at |
|---|---|---|
| Client portal | Clean, calm grouped screens with tinted state chips; nothing competes with the next step. | Warmth: it feels like good software, not a person on your side. |
| Representative portal | Speed and focus: compact rows, a command bar, visible shortcuts, and the most compact side-by-side review of the five. | Distinctiveness: it is the most familiar look of the five. |

**Trade-offs.** Lowest implementation risk and highest professional credibility. It must be guarded against grey drift as screens are added, which is why client chips carry the state tint.

### 4. Companion

**Core idea.** A person on your side. Colour answers one question, “whose turn is it?”: marigold for the client, lake blue for the representative, green for done, indigo for signed. Round shapes, tinted surfaces, warm tinted shadows, avatars wherever a decision is made. Readex Pro, from the Lexend family, with a path to Arabic and other scripts.

| | Best at | Worst at |
|---|---|---|
| Client portal | Answering “am I waiting, or do I owe something?” at a glance; the most reassuring first screen. | Authority: the signed plan has to work harder to look official inside a soft system. |
| Representative portal | Keeping the human relationship visible across many files. | Density and tone: rounded, shadowed rows hold fewer files and may read as consumer software. |

**Trade-offs.** The best emotional fit for clients and a genuinely new colour logic, at the cost of professional density for the people who pay.

### 5. Almanac

**Core idea.** Time is the interface. Every item hangs from a date or says plainly that its date is unknown. The client home is a timeline with a “now” marker; the representative queue is an agenda grouped by month of the next hard date. Colour runs like a thermometer, cool teal to hot red. One typeface, Archivo, uses its width axis: expanded for dates, condensed for tables. Pattern glyphs (solid, hatched, dotted, dashed, stepped bars) give a second channel that survives greyscale and print.

| | Best at | Worst at |
|---|---|---|
| Client portal | Making expiry dates and the next step undeniable for people on temporary status. | Calm: big date blocks and heavy rules are emphatic for anxious readers. |
| Representative portal | Deadline triage and case history; the case timeline shows signing, the changed fact and the expiry in one line. | Review flow: sorting by date can bury files that are ready to review; condensed 13 px text is at the edge of comfort. |

**Trade-offs.** The most specific to temporary residents and very memorable, but the boldest; it puts time ahead of everything else, including review.

## Side by side

| | Margin | Signal | Console | Companion | Almanac |
|---|---|---|---|---|---|
| Typography | Literata and Schibsted Grotesk | Atkinson Hyperlegible Next | IBM Plex Sans and Mono | Readex Pro | Archivo, variable width |
| Colour logic | Ink marks on paper | Solid sign plates | Graphite; colour only for meaning | Whose turn | Temperature, cool to hot |
| Second channel | Reviewer’s marks | Sign shapes | Filling circles and icons | Icons in discs, avatars | Fill patterns |
| Representative density | Medium | Low to medium | High | Medium | Medium to high |
| Client warmth | Calm, formal | Direct | Calm, neutral | Warm | Bold |
| Shape and elevation | 4 px, flat paper | 10 px, outlines, no blur | 6 px, hairlines | Round, tinted shadows | Square, hard offset |
| Closest to shadcn-vue defaults | Medium | Low | High | Medium | Low |

## Recommendation

**Choose 3. Console as the system,** and use the next round to warm its client expression.

Why:

1. **It serves the people who pay and the people who live in the tool.** The plan is B2B first: practices pay, and representatives work dozens of files a day. Console has the most compact queue and review of the five (the whole review screen is 1,021 px tall at 1440 wide, against 1,138 to 1,413 px for the others), with visible shortcuts and the shortest queue rows (about 80 px, against 92 to 180 px), which is what the research’s triage and contextual-review patterns (A1, A3, A8) need.
2. **Colour means exactly one thing.** Reserving colour for state, focus and urgency is the cleanest expression of the research’s rule to keep coverage, work, evidence and validity distinct, and of the owner’s rule that colour must carry meaning. The client expression already carries the state tint so meaning reads at arm’s length.
3. **Lowest risk on the real stack.** Its radius, hairlines, neutral surfaces and focus ring sit closest to shadcn-vue’s defaults, so most `app/components/ui/*` primitives restyle through tokens alone, and density is a token rather than a second component set.
4. **The client side meets the brief as it stands.** 48 px targets, 17 px text, grouped cells, one dark button per screen and tinted state chips give a calm, plain phone experience.

What to watch if Console is chosen: it is the least distinctive option, and it will drift toward grey unless every new component is checked for state colour. The strongest refinement for round 2 is to borrow Companion’s “whose turn” line for the client home, so applicants get warmth and an explicit next actor without losing the representative portal’s precision.

**Runner-up: 2. Signal**, if the owner weights the client portal above the representative portal. It is the most accessible and the most distinctive option for anxious, second-language readers on phones; it would need a quieter list treatment for representatives.

## Constraints

All hard constraints are met in all five options. Two things are outside what a specimen can prove and are recorded in each `critique.md` as build requirements: screen reader output and keyboard order in the built app, and testing with real applicants and representatives. The specimens load fonts from Google Fonts by URL; the app should self-host the same files.
