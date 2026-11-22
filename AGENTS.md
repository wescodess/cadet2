# cadet2

## Project rules

- Use the Nuxt 4 layout: `app/pages/`, `app/components/`, `app/lib/`, `server/api/`, `server/utils/`, and `shared/`. Use TypeScript and Vue `<script setup lang="ts">`.
- Keep secrets in server runtime configuration and privileged provider calls in server routes/utilities. Validate untrusted inputs at the server boundary.
- Use Convex `v.*` validators for function arguments and schema fields; TypeScript alone is insufficient.
- Reuse `app/components/ui/*` primitives and `cn()` from `app/lib/utils.ts` for class merging.
- Vitest and Playwright exist. Write behavioral tests first at the agreed seams; use `package.json` and the test configurations for current commands.
- Ship production-ready code only. Keep code comments minimal, adding them only where extremely important.
- For portal scope and settled decisions, read the current map via [issue-tracker.md](docs/agents/issue-tracker.md). [Feasibility reports](docs/feasibility/2026-11-16/00-synthesis.md) are dated reference material; March `_bmad-output/` planning is partly superseded.
- The BMAD workflow skills under `.agents/skills/bmad-*` are legacy and must not be used to run work. Use the current engineering skills and tracker conventions below.

## Agent skills

### Issue tracker

GitHub Issues in `wescodess/cadet2` hold maps, decisions, specs, and work tickets. Read [issue-tracker.md](docs/agents/issue-tracker.md) before tracker operations.

### Triage labels

Use the five default triage labels for work tickets. Read [triage-labels.md](docs/agents/triage-labels.md) before triage; wayfinder issues use only `wayfinder:*` labels.

### Domain docs

Single context: root `GLOSSARY.md` and lazy `docs/adr/`. Before domain exploration, read [domain.md](docs/agents/domain.md) and the glossary.
