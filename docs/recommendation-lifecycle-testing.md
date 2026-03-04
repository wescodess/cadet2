# Recommendation Lifecycle Testing

This document defines deterministic lifecycle setup used by Story 2.1 API and E2E suites.

## Canonical Statuses

- `queued`
- `evaluating`
- `completed`
- `degraded`
- `failed`

## Workspace Status Contract

`GET /api/recommendations/runs/:runId/status` returns provider-agnostic status payload only:

- `runId`
- `profileSnapshotId`
- `status`
- `statusMessage`
- `resumable`
- `processingHeartbeatAt`
- `createdAt`
- `updatedAt`

Provider internals (for example `providerPayload`, `adapterTrace`) are intentionally excluded.

## Deterministic Test Hooks (Non-Production Only)

These routes are disabled in production and require an authenticated workspace session.

### Reset lifecycle runs

- Route: `POST /api/recommendations/testing/reset`
- Behavior: removes all recommendation runs for the authenticated user.
- Response:

```json
{
  "deletedCount": 2
}
```

### Seed lifecycle run

- Route: `POST /api/recommendations/testing/seed`
- Purpose: create deterministic lifecycle records for API/integration testing.
- Request body:

```json
{
  "runId": "run_story21_seed",
  "profileSnapshotId": "snapshot_story21_seed",
  "status": "evaluating",
  "statusMessage": "Recommendation processing is actively evaluating your profile.",
  "resetExisting": true
}
```

- Response follows the workspace status contract.

## Provider-Mock / Fault-Injection Modes

`POST /api/recommendations/runs/:runId/start` supports deterministic test modes:

- `standard` (default): transition to `evaluating`
- `recoverable-delay`: keeps run in-progress (`queued` or `evaluating`) with resumable signal
- `mock-completed`: terminal success transition (`completed`)
- `mock-degraded`: terminal degraded transition (`degraded`)
- `mock-failed`: terminal failure transition (`failed`)

Mock modes are non-production only.

## Idempotency and Guardrails

- Repeated `start` requests on `evaluating` remain `evaluating` (idempotent).
- Invalid transitions are rejected (`409`).
- Unknown or non-owned runs return `404`.
