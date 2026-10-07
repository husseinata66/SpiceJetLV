# Execution Safety Preflight — run-011__2026-10-04_17-23-43__UserStory__ReissueFlowManualExecution

> Produced before execution, from the run's planned operations. **Non-mutating** — evaluating a
> policy touches nothing in the application under test.
>
> A `Forbidden` row here is a policy decision, not a test result and not an Application Failure.
> The affected cases are recorded by the executing stage as `Skipped`, reason
> `Execution Safety Policy`, and still appear in every total.

| Field | Value |
|---|---|
| Run | `run-011__2026-10-04_17-23-43__UserStory__ReissueFlowManualExecution` |
| Environment | Staging |
| Policy | `ndc-admin-portal-stg` v1 |
| Policy hash | `sha256:f93996ef084ec361f30e6e0c52cc1b0e` |
| Generated | 2026-10-04T14:31:31.429Z |

## 1. Mutation Footprint

| Action | Module | Ownership | Occurrences | Decision | Matched Rule | Cleanup |
|---|---|---|---|---|---|---|
| PAYMENT | booking | DedicatedTestData | 31 | Forbidden (absolute) | `policy.actions.PAYMENT.*` | — |
| READ | booking | DedicatedTestData | 148 | Allowed | `policy.categories.read.DedicatedTestData` | — |
| UPDATE | booking | DedicatedTestData | 89 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| UPDATE | airport | DedicatedTestData | 5 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| SUBMIT | airport | DedicatedTestData | 5 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| APPROVE | airport | DedicatedTestData | 5 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| UPDATE | branch | DedicatedTestData | 3 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| UPDATE | agency | DedicatedTestData | 3 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| SUBMIT | branch | DedicatedTestData | 3 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| SUBMIT | agency | DedicatedTestData | 3 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| APPROVE | branch | DedicatedTestData | 3 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| APPROVE | agency | DedicatedTestData | 3 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| UPDATE | rule-engine | DedicatedTestData | 3 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| SUBMIT | rule-engine | DedicatedTestData | 3 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| APPROVE | rule-engine | DedicatedTestData | 3 | Allowed | `policy.categories.approval.DedicatedTestData` | — |

## 2. Totals

| Metric | Count |
|---|---|
| Operations planned | 310 |
| Mutating | 162 |
| Allowed | 279 |
| Approval Required | 0 |
| Already authorized for this run | 131 |
| Forbidden | 31 |
| Cleanup-required actions | 0 |

## 3. Authorization Questions

None. Nothing in this run's plan requires a scoped authorization.

## 4. Blocked by Policy

- **PAYMENT / booking / DedicatedTestData** — Payments are prohibited on this environment.
