# Contribution Guidelines (Observed)

## Formal Policy Status

- No `CONTRIBUTING.md` or equivalent contributor policy document was found.

## Working Norms Inferred From the Repo

- Use `pnpm` for dependency management.
- Keep runtime secrets in environment files and `runtimeConfig`, not in committed source.
- Preserve the current split of responsibilities:
  - `app/` for UI
  - `server/` for HTTP/server logic
  - `convex/` for app data and job orchestration
- Reuse `app/components/ui/*` primitives rather than inventing a parallel base component layer.
- Keep architectural changes reflected in `docs/` when they affect the RAG subsystem or system boundaries.
