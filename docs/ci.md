# CI Pipeline Guide

This repository now ships with a GitHub Actions pipeline at `.github/workflows/test.yml`.

## What the Pipeline Does

- Runs a `lint` gate using `pnpm exec nuxi typecheck`
- Runs the Playwright suite in 2 parallel shards with `fail-fast: false`
- Builds the Nuxt app and starts `pnpm preview` inside CI before each Playwright run
- Runs a 10-iteration burn-in loop on pull requests and the weekly scheduled run
- Uploads Playwright artifacts (`playwright-report/` and `test-results/`) for every test and burn-in run
- Publishes a workflow summary and optional Slack failure notification

## Why the Pipeline Starts Its Own Preview Server

`playwright.config.ts` disables its built-in `webServer` whenever `CI=true`. GitHub Actions sets `CI=true` automatically, so the pipeline must build the app and boot `pnpm preview` explicitly before running tests. Without that, the Playwright job would fail even if the tests pass locally.

## Contract Testing

The pipeline includes a `contract_test` stage, but it stays dormant until all of the following are true:

- Repository variable `ENABLE_CONTRACT_TESTS` is set to `true`
- Secrets `PACT_BROKER_BASE_URL` and `PACT_BROKER_TOKEN` are configured
- `package.json` contains `test:contract:consumer` and `test:contract:provider` scripts

Once those are present, the job will:

- run consumer contract tests
- publish pacts
- run provider verification
- enforce `can-i-deploy` before release promotion

## Local Dry-Run Commands

- `./scripts/ci-local.sh`
  Runs the local equivalent of the CI test path.
- `./scripts/ci-local.sh smoke`
  Builds, starts preview, and runs the smoke spec only.
- `./scripts/ci-local.sh changed main`
  Runs a single-iteration burn-in against changed specs relative to `main`.
- `./scripts/burn-in.sh 10`
  Repeats the full Playwright suite 10 times.

## First Remote Validation

After pushing the workflow:

1. Open a pull request to trigger the full test path.
2. Confirm the `lint`, `test`, `burn_in`, and `report` jobs appear.
3. Check the artifact bundle for `playwright-report/` and `test-results/`.
4. If runtime is too slow, increase or decrease shard count based on actual job timing.
