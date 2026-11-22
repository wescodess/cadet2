# B2 Practice and preparation, round 2: Triage Desk with Client mirror

Date: 2026-11-19. This is round 2 of the UI design gate for batch B2 (R01, R02, R03, R05 to R09 and N02; tickets #111 to #114). It offers one refined concept for the owner to approve. Nothing is approved yet, and no app code changes.

| Board (728 px, for chat) | Full concept | Screenshots | Critique |
| --- | --- | --- | --- |
| [preview.html](preview.html) | [index.html](index.html) | [mobile.png](mobile.png), [flow.png](flow.png) | [critique.md](critique.md) |

`index.html` has 48 screens: round 1's 38, plus A6 to A8, L1 to L4, E2, S14 and S15. Desk screens are 1440 px, and a dashed line marks a 1440 by 900 window. L3 and L4 are 1280 px. `mobile.png` is the narrow caseload; it has no round-2 change, so the image matches round 1's.

## What changed from round 1, and why

| Change | Why | Where |
| --- | --- | --- |
| **The Client mirror sits beside the question composer.** It shows the row in the Client's Tasks and the page they open, at Client sizes, before Send. Drafts, proposed text and private notes never appear in it. | Owner decision 1: Triage Desk plus Request Ledger's mirror. Daniel can check the question exactly as the Client will see it in the B1 Checklist. | D3; E2 is the same page on the Client's phone; S15 |
| **The desk is shown at 1440 px**, Relay's design width, so the Case pane is 776 px. | Round 1's weakness: a 616 px pane at 1280 px. | Every desk screen |
| **The queue folds to a 56 px rail** (⌘ \\). The rail keeps your position, previous and next, and the urgent Case. | Gives the Case 1160 px at 1440 px, or 1000 px at 1280 px, when it needs room. | L2 |
| **A new Facts and Draft tab** pairs each fact with the Draft 2 finding that uses it. It is side by side from a 720 px pane and stacks below that. Facts no finding uses say so. | Round 1's "what to watch": tabs hid the link between a fact and its finding. | L1, L2, L3 |
| **The mirror stacks above Send** when the pane is under 760 px. | The mirror needs 360 px. It still comes before Send. | L4 |
| **Nobody grants themselves Representative.** Priya requests the role, and it takes effect only when a cadet2 reviewer verifies her licence. Her own work-role radios are off, with the reason. The screens cover request, pending, verified, held, not verified, recheck due and cancelled. | Owner decision 2: "Only after licence check". | A6, A7, A8, A9, S14 |
| **Priya is Staff until 12 Nov.** | Round 1's A2 and A3 named her Representative on 10 Nov, which contradicted the receipt. | A2, A3, A6, A7 |
| **Workforce invitation create and accept are on.** They carry placeholder text for `lf.workforce-invitation.v1.en`, marked "Draft wording, pending counsel" and tagged as a placeholder. S7 shows the action off if the registry can't supply the wording. | Owner decision 4: draft the wording now. | A3, A4, N3, S7 |
| **Staff submission carries a Staff-voice statement.** It names Daniel Okafor (Staff) and says submitting does not record the Client's agreement, confirmation or consent. It is a placeholder Staff variant of `lf.intake-submit.v1.en`. | Owner decision 4 and the registry rule "Staff submission names Staff, never invents Client assent". | C3, C4 |
| **Neutral desk chips** (a neutral chip with a coloured glyph and a word) are kept, as round 1 already drew them. | Owner decision 3a. | Every desk screen |
| **The selected row has a 2 px graphite edge** (`--foreground`), not focus blue. | Owner decision 3b: blue means the Representative's turn. | Every queue |
| **Client small text uses the 15 px Small and Label tokens.** No 13 px value is left. The only Client text under 15 px is the chip tokens, 13.5 and 14.5 px. | Owner decision 3c. | E1, E2, the mirror, the Client email |
| **Desk keyboard hints are 12 px** (were 11.5 px). | Owner decision 3d. | All 95 hints |

Everything else is kept from round 1: the story and fixtures, honest Drafts, no scores or odds, excluded scope shown, escalation to a person, CLB/NCLC conversion on the desk, and true states only.

## Checks

These are the same automated checks as round 1, run on every screen of `index.html`. The full table, and the `preview.html` results, are in [critique.md](critique.md).

| Check | Result |
| --- | --- |
| Screens (desk and phone width) | 48 |
| Text below its contrast minimum | 0 of 4,752 (lowest 4.88:1) |
| Targets under 24 px | 0 of 1,069 controls |
| Client buttons under 44 px | 0 |
| Meaningful Client text under 13 px | 0 (smallest 13.5 px, a chip token) |
| Controls without visible focus | 0 of 1,047 |
| Screens without exactly one `h1` | 0 |
| Duplicate IDs | 0 |
| Overflow at 320 px (5 phones, 4 mirror frames) | 0 |

## System additions flagged

These add no colour, role or token.

1. **Client mirror**: static client-expression markup in a 360 px frame beside the composer. Nothing in it can be focused or pressed.
2. **Queue rail**: the collapsed state of the queue pane (`ui/resizable`), with show, previous, next and the urgent count.
3. **Facts and Draft tab**: Relay's FactsAndConclusion parts as a seventh Case tab.
4. **Licence check wording** in the approved neutral treatment: "Licence check pending", "Licence check held", "Not verified", "Recheck due" and "Request cancelled". Verified is a receipt line, not a new state chip.
5. **Placeholder tag** beside the pending-counsel mark. It goes when the registry supplies the final strings.

Still open from round 1: the "Review requested" chip and a colleague's first name as a holder word.

## For the owner

- **Question:** does "only after licence check" also apply when an administrator changes *another* member to Representative? The tenancy decision lets administrators change work roles, and lets a pending Representative prepare but not sign. This concept applies the rule to self-requests only.
- **Note for `decision.md`:** the final strings for `lf.workforce-invitation.v1.en` and the Staff variant of `lf.intake-submit.v1.en` come from the registry. The placeholders here are not the approved wording.
- **Consistency:** B1's approved specimen shows some Client metadata at 14 px. Decision 3c moves these to the 15 px tokens here. B1's build should do the same, so the Checklist matches across batches.
