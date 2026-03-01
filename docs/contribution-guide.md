# Contribution Guide

## Repository Conventions

- Use `pnpm` for package operations.
- Keep code typed and aligned with the current Nuxt + Vue + Convex boundaries.
- Route external provider calls through server utilities and server routes when secrets are involved.
- Reuse `app/components/ui/*` primitives before adding new shared UI base layers.

## Documentation Expectations

- Update `docs/architecture.md` and the relevant subsystem drafts when system behavior changes materially.
- Keep brownfield docs current so future planning workflows have accurate context.

## Validation Expectations

- Run at least a build-level validation for meaningful changes.
- If introducing tests, define the tooling and conventions explicitly because the repo does not yet include a standard test setup.
