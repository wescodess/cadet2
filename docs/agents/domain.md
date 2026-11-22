# Domain docs

## Before exploring

Read the root [GLOSSARY.md](../../GLOSSARY.md). Read relevant ADRs under `docs/adr/` when that directory exists.

This is a single-context repository. Create `docs/adr/` only when writing the first resolved ADR; none is needed for tracker adoption. If domain files do not exist, proceed silently rather than creating empty scaffolding.

## Use the resolved vocabulary

Use glossary terms in issues, specs, code, and tests. Keep the glossary to domain definitions without implementation details. Record newly resolved terms through the domain-modeling skill.

Surface conflicts with an existing ADR explicitly, with the ADR name and the reason for reopening it. An ADR records a resolved architectural trade-off; an unanswered map ticket is not an ADR.

## Reference material

The current portal map in [issue-tracker.md](issue-tracker.md) carries the settled destination and indexes later decisions. Start feasibility reading at [the dated synthesis](../feasibility/2026-11-16/00-synthesis.md); these preserved reports contain recommendations that the settled destination may supersede.

The March `_bmad-output/planning-artifacts/` documents and `_bmad-output/project-context.md` are prior art. The current `AGENTS.md` carries the still-valid critical implementation rules and corrects the stale claim that test frameworks do not exist.
