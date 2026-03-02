# CI Secrets and Variables Checklist

## Optional for the Base Pipeline

- `SLACK_WEBHOOK_URL`
  Enables the Slack notification step in the `report` job when any upstream stage fails.

## Required Only When Contract Testing Is Enabled

- `PACT_BROKER_BASE_URL`
  Base URL for your Pact Broker or PactFlow instance.
- `PACT_BROKER_TOKEN`
  Access token used by `pact-broker publish` and `can-i-deploy`.

## Repository Variables

- `ENABLE_CONTRACT_TESTS`
  Keep this unset or `false` until the repo has working contract test scripts.
  Set it to `true` only after consumer and provider contract coverage is wired into `package.json`.

## Before the First Merge

- Verify repository Actions are enabled.
- Confirm the workflow can read the repository variables and secrets.
- Do not store credentials in workflow YAML or committed `.env` files.
