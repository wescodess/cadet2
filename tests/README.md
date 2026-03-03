# Test Framework Setup

This repository now has a Playwright-first E2E scaffold under `tests/` sized for the current Nuxt 4 application.

## Setup

Install the test dependencies first:

```bash
pnpm add -D @playwright/test @seontechnologies/playwright-utils @faker-js/faker
pnpm exec playwright install
```

Copy `.env.example` to `.env` and set the test-specific values:

- `TEST_ENV` controls the target profile (`local`, `staging`, `production`)
- `BASE_URL` points Playwright at the app host
- `API_URL` points helper utilities at the server API host
- `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are used by authenticated fixtures
- If the configured local test user does not exist yet, the auth provider will attempt a one-time sign-up fallback before failing

## Running Tests

```bash
pnpm test:e2e
pnpm test:api
pnpm test:all
pnpm test:e2e:headed
pnpm test:e2e:ui
```

By default, local runs reuse an existing `pnpm dev` server or start one automatically through `playwright.config.ts`.

## Architecture Overview

- `playwright.config.ts`: central test runner configuration, artifacts, reporters, and local web server bootstrap
- `tests/e2e/`: browser-facing specs
- `tests/api/`: API-focused specs running under the Playwright `api` project
- `tests/support/fixtures/`: merged fixture entrypoint plus local project fixtures
- `tests/support/helpers/`: environment, auth-provider, and network helper utilities
- `tests/support/fixtures/factories/`: faker-backed factories with tracked cleanup

The fixture entrypoint uses `mergeTests` so Playwright Utils fixtures and project-specific fixtures are imported from one place.

## Best Practices

- Prefer stable `data-testid` selectors over text-only selectors for UI assertions
- Register network routes before navigation when mocking responses
- Keep setup in fixtures, factories, and API helpers; use the UI for validation, not data creation
- Enable `authSessionEnabled` only for specs that need authenticated state and have valid test credentials configured
- Keep cleanup attached to fixtures so parallel runs stay isolated

## CI Integration

- HTML reports write to `playwright-report/`
- JUnit output writes to `test-results/junit.xml`
- Per-test artifacts write to `test-results/artifacts/`
- CI defaults to retries and fixed workers via `playwright.config.ts`

These paths are ready for artifact upload in a future CI workflow.

## Knowledge Base Alignment

This scaffold follows the TEA patterns for:

- fixture composition with `mergeTests`
- faker-based factories with explicit overrides
- intercept-before-use network stubbing
- artifact retention only on failure

## Troubleshooting

- If imports fail, install the required dev dependencies before running Playwright
- If the sample test cannot reach the app, verify `BASE_URL` and that `pnpm dev` can start cleanly
- If authenticated fixtures throw, verify `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` and confirm the Better Auth routes are reachable at `${BASE_URL}/api/auth`
- If reports are missing, confirm the test run reached Playwright execution and was not blocked by missing browser binaries
