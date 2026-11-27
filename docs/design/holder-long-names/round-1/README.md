# Render-ready copies for html_preview, then html_render

These are wrapper-only copies of the five concept previews and the shadow comparison. The originals in `concepts/*/preview.html` and `shadow-alias/` are unchanged; their hashes are in `evidence/originals-sha256-before-render.txt`.

Product panels, Relay styles, fonts, typography and the five design rules are the same as in the originals. Only the presentation wrapper changed:

- **Wrapper:** html and body are transparent with no margin or padding, the body has no fixed width, and `main.rv` has no padding, border or background.
- **Heading:** removed. The title tag names each concept, and a short "Concept n of 5. Proposal, not approved." line opens the idea text.
- **Layout:** the 440 px queue and the notes stack below 600 px of board width. The two 320 px phone frames wrap and shrink instead of staying in one row.
- **Dropped CSS:** two unused B2 client-phone rules that set `height:100%`.
- **Concept 2:** states its open limit, an uncapped column width, as proposed and unapproved, with no cap or fallback proposed.
- **Shadow page:** adds the dark desk block.

Heights were not measured in a browser, because the parent held the lock; they are static estimates only.
