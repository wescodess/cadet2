# S4: Denied admin navigation logs hydration errors for an ordinary Client

Scope note for PR 158: ownership is [#74](https://github.com/wescodess/cadet2/issues/74)
and [PR 159](https://github.com/wescodess/cadet2/pull/159), A05–A11 admission/security
preservation. This is recorded as an out-of-scope finding, not a ticket #28 bug.

- Build: `f5dd47bb9ba660cdbf576e715b3db48f0bdceae5`, isolated production Nitro artifact, real local Convex/PGlite/auth; Chromium 1440×900 and 390×844, light preference.
- Found by: `accept 28`, J28-04 Client remaining-pages journey, both matrix cells.

## Steps

1. Create an ordinary synthetic account through the visible public sign-up form.
2. Sign in through the public UI; the account has no stored admin grant.
3. Navigate each preserved admin page: `/admin/pathways`, `/admin/pathway-rules`, `/admin/evidence-sources`, `/admin/rag-sources`, `/admin/rag-phase0`, `/admin/recommendation-reviews`, `/admin/audit-trail`.
4. Wait for the denied destination heading and inspect retained browser-console evidence.

## Expected

Denied navigation completes without console errors. [Spec #72](https://github.com/wescodess/cadet2/issues/72), body L230:
“Console errors, unhandled exceptions and unexpected failed requests fail”.
[#74](https://github.com/wescodess/cadet2/issues/74) identifies its surface scope as
“A05–A11 security preservation; no redesign”.

## Actual

Each page denies with HTTP 403 and returns the Client to the safe `/` entry. Each
transition also logs `Hydration completed but contains mismatches.`: seven console
errors in desktop and seven in mobile. The journey's mandatory shared console gate
therefore fails on both cells. All #28 content/navigation assertions in those
journeys pass; these failed journey statuses are retained and are not promoted to green.

The same seven-error symptom appears in the base desktop J28-04 Client recheck at
`fe2b4a4e4f8b4b861fb5c92661b9e411a84ef0b3`. No causal implementation attribution is
claimed. No retries or suppression were used to obtain a pass.

## Evidence

Root: `/Users/wesleyukadike/.orchestrate/evidence/cadet2/28/run-2/`.

- Desktop trace/video/screenshots: `candidate/ui/artifacts/journeys-J28-04-client-rem-43772-n-or-replacement-activation-desktop/`.
- Mobile trace/video/screenshots: matching `candidate/ui/artifacts/*client*mobile/` folder; exact paths and console attachments are in `candidate/ui/results.json`.
- Console: `browser-errors.json` attachments in those results; final rendered-page observations in `remaining-pages.json` attachments.
- Base comparison: `base/ui-ready/results.json`, desktop Client console attachment.

Separate #74 observation: `/ai-search` renders its public playground for a visitor
and an ordinary Client on both artifacts. No query was submitted; API/provider
admission and YouTube behavior were not exercised by this acceptance run.

Ticket #28's raw closure probes are independently green on the candidate:
1,044/1,044 HTTP variants and 152/152 direct Convex calls, with genuine admitted
admin permission/inventory controls. A fully green broad remaining-page journey
still requires the #74 console failure to be resolved and checked on the integrated artifact.
