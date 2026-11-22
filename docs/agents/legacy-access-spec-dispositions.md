# Playwright dispositions for legacy access closure

Reviewed every original spec in `tests/e2e/`, `tests/api/` and `tests/integration/` at `f074282640876ca1a77ff5c284a416bf706e05e6`. Retired success assertions are replaced by denial coverage under `tests/security/`. Admin review readers, citations and actions use real operator-imported fixtures there. No QA-owned file changes.

## `tests/e2e/`

| File                                                       | Disposition                                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `admin-audit-trail.red.atdd.spec.ts`                       | Keep and update: live admin UI; denial returns to public entry.                     |
| `admin-governance.atdd.spec.ts`                            | Keep: live admin capability or pure recommendation utility.                         |
| `admin-pathway-inventory.atdd.spec.ts`                     | Keep and update: live admin UI; denial returns to public entry.                     |
| `admin-pathway-inventory.red.atdd.spec.ts`                 | Keep and update: live admin UI; denial returns to public entry.                     |
| `admin-recommendation-reviews.red.atdd.spec.ts`            | Keep and update: live admin UI; denial returns to public entry.                     |
| `example.spec.ts`                                          | Keep and update: live public/auth entry; remove demo links and synthetic bootstrap. |
| `intake-constraints-context.atdd.spec.ts`                  | Delete: only exercises retired workspace/intake/public-run surfaces.                |
| `intake-draft.atdd.spec.ts`                                | Delete: only exercises retired workspace/intake/public-run surfaces.                |
| `intake-draft.spec.ts`                                     | Delete: only exercises retired workspace/intake/public-run surfaces.                |
| `intake-submit.atdd.spec.ts`                               | Delete: only exercises retired workspace/intake/public-run surfaces.                |
| `workspace-access.atdd.spec.ts`                            | Delete: only exercises retired workspace/intake/public-run surfaces.                |
| `workspace-auth.spec.ts`                                   | Delete: only exercises retired workspace/intake/public-run surfaces.                |
| `workspace-continuity-hub.atdd.spec.ts`                    | Delete: only exercises retired workspace/intake/public-run surfaces.                |
| `workspace-recommendation-citations.atdd.spec.ts`          | Delete: only exercises retired workspace/intake/public-run surfaces.                |
| `workspace-recommendation-citations.red.atdd.spec.ts`      | Delete: only exercises retired workspace/intake/public-run surfaces.                |
| `workspace-recommendation-comparison.atdd.spec.ts`         | Delete: only exercises retired workspace/intake/public-run surfaces.                |
| `workspace-recommendation-explanations.atdd.spec.ts`       | Delete: only exercises retired workspace/intake/public-run surfaces.                |
| `workspace-recommendation-next-step-plan.atdd.spec.ts`     | Delete: only exercises retired workspace/intake/public-run surfaces.                |
| `workspace-recommendation-run-comparison.atdd.spec.ts`     | Delete: only exercises retired workspace/intake/public-run surfaces.                |
| `workspace-recommendation-run-comparison.red.atdd.spec.ts` | Delete: only exercises retired workspace/intake/public-run surfaces.                |
| `workspace-recommendation-run-history.red.atdd.spec.ts`    | Delete: only exercises retired workspace/intake/public-run surfaces.                |
| `workspace-recommendation-status.atdd.spec.ts`             | Delete: only exercises retired workspace/intake/public-run surfaces.                |

## `tests/api/`

| File                                             | Disposition                                                                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `admin-audit-trail.red.atdd.spec.ts`             | Keep: live admin capability or pure recommendation utility.                                                             |
| `admin-pathway-governance.atdd.spec.ts`          | Keep: live admin capability or pure recommendation utility.                                                             |
| `admin-pathway-management.atdd.spec.ts`          | Keep live inventory CRUD/status/denial tests; remove retired run-start/read assertions and seed/reset-only cases.       |
| `admin-pathway-management.red.atdd.spec.ts`      | Keep live inventory CRUD/status/denial tests; remove retired run-start/read assertions and seed/reset-only cases.       |
| `admin-recommendation-reviews.red.atdd.spec.ts`  | Keep real denial test; replace retired seeded positives with operator-fixture reader/action coverage in tests/security. |
| `build-recommendation-citations.spec.ts`         | Keep: live admin capability or pure recommendation utility.                                                             |
| `build-recommendation-comparison.spec.ts`        | Keep: live admin capability or pure recommendation utility.                                                             |
| `classify-trust-boundary.spec.ts`                | Keep: live admin capability or pure recommendation utility.                                                             |
| `intake-constraints-context.atdd.spec.ts`        | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `intake-draft.atdd.spec.ts`                      | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `intake-draft.spec.ts`                           | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `intake-submit.atdd.spec.ts`                     | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `recommendation-citations.atdd.spec.ts`          | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `recommendation-citations.red.atdd.spec.ts`      | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `recommendation-comparison.atdd.spec.ts`         | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `recommendation-explanations.atdd.spec.ts`       | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `recommendation-lifecycle.atdd.spec.ts`          | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `recommendation-next-step-plan.atdd.spec.ts`     | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `recommendation-pathway-evaluation.atdd.spec.ts` | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `recommendation-qualification.atdd.spec.ts`      | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `recommendation-qualification.red.atdd.spec.ts`  | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `recommendation-ranking.atdd.spec.ts`            | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `recommendation-refresh.atdd.spec.ts`            | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `recommendation-refresh.red.atdd.spec.ts`        | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `recommendation-run-history.red.atdd.spec.ts`    | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `run-comparison.red.atdd.spec.ts`                | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `run-comparison.spec.ts`                         | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `workspace-access.atdd.spec.ts`                  | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |
| `workspace-summary.atdd.spec.ts`                 | Delete: only exercises retired workspace/intake/public-run surfaces.                                                    |

## `tests/integration/`

| File                                                    | Disposition                                                          |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| `recommendation-citations.integration.spec.ts`          | Delete: only exercises retired workspace/intake/public-run surfaces. |
| `recommendation-comparison.integration.spec.ts`         | Delete: only exercises retired workspace/intake/public-run surfaces. |
| `recommendation-explanations.integration.spec.ts`       | Delete: only exercises retired workspace/intake/public-run surfaces. |
| `recommendation-lifecycle.integration.spec.ts`          | Delete: only exercises retired workspace/intake/public-run surfaces. |
| `recommendation-next-step-plan.integration.spec.ts`     | Delete: only exercises retired workspace/intake/public-run surfaces. |
| `recommendation-pathway-evaluation.integration.spec.ts` | Delete: only exercises retired workspace/intake/public-run surfaces. |
| `recommendation-qualification.integration.spec.ts`      | Delete: only exercises retired workspace/intake/public-run surfaces. |
| `recommendation-qualification.red.integration.spec.ts`  | Delete: only exercises retired workspace/intake/public-run surfaces. |
| `recommendation-ranking.integration.spec.ts`            | Delete: only exercises retired workspace/intake/public-run surfaces. |
| `recommendation-refresh.integration.spec.ts`            | Delete: only exercises retired workspace/intake/public-run surfaces. |
| `recommendation-refresh.red.integration.spec.ts`        | Delete: only exercises retired workspace/intake/public-run surfaces. |

## Helpers

Deleted factories with no remaining consumers:

- `tests/support/fixtures/factories/intake-draft-factory.ts`
- `tests/support/fixtures/factories/intake-submit-factory.ts`
- `tests/support/fixtures/factories/recommendation-citations-factory.ts`
- `tests/support/fixtures/factories/recommendation-comparison-factory.ts`
- `tests/support/fixtures/factories/recommendation-lifecycle-factory.ts`
- `tests/support/fixtures/factories/recommendation-next-step-plan-factory.ts`
- `tests/support/fixtures/factories/recommendation-run-comparison-factory.ts`
- `tests/support/fixtures/factories/recommendation-run-history-factory.ts`
- `tests/support/fixtures/factories/workspace-access-factory.ts`

Kept the shared auth/user, audit, pathway and review fixtures used by live tests. Removed retired run-start/pathway readers and their payload builder from `pathway-inventory-factory.ts`. Kept `createWorkspaceSummaryFixture` for three retained component suites; removed its obsolete route probes. Removed unused constants from `test-data.ts`. Live admin pathway specs retain inventory CRUD/status/denial assertions; their legacy processing/history/reset tails were removed. Public landing smoke coverage retains the real auth link.

Skip allowances decrease from 52 to 10: the remaining five skips in each admin pathway RED API/UI spec are inherited. Lint/format allowances for deleted files are removed; no baseline increases. Playwright discovery is validation of the retained inventory, not an executed browser/API suite.
