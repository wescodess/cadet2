# Review 7 evidence

`before.json` and `after.json` record actual row command exits. Audit replay uses the supplied reviewer's unchanged `missing-advisory-audit.json` and `orphan-audit-shim.cjs`; frozen installation and licence collection remain real. Lint probes create `scripts/review-ticketed-suppression.mjs` temporarily and remove it afterward. The positive directive is `// eslint-disable-next-line no-unused-vars -- #23 review probe` above `const unused = 1`.

`parser-tests-before.txt` runs the new shared fixtures with the three original parser modules from the pinned head, restoring the fixed modules afterward. Its ten failures expose accepted malformed references and rejected valid suppressions. `parser-tests-after.txt` runs the same suite with the fixes. Named fixtures live in `tests/unit/quality-parsers/`.

`before-siblings.json` and `after-siblings.json` record a live gitleaks v8.30.1 release response accepted unchanged, then parsed with its first asset ID incremented while its API URL is unchanged. `real-output-sweep.json` records real outputs accepted by every parser; the TypeScript entry covers both Nuxt and Convex projects. Raw gitleaks findings are parsed in memory and are not retained here.

External evidence: `/Users/wesleyukadike/.orchestrate/scratch/cadet2-fix-pr55-r7-evidence/`, including the supplied review, audit input, subprocess shim, reproduction commands and real-output sweep script. Logs below are copied from the completed clean-install verification, and metadata records exit statuses and baseline hashes.
