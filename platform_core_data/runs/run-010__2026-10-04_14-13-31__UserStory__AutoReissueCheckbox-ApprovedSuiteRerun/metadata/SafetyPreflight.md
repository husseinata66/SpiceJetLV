# Execution Safety Preflight — run-010__2026-10-04_14-13-31__UserStory__AutoReissueCheckbox-ApprovedSuiteRerun

> Produced before execution, from the run's planned operations. **Non-mutating** — evaluating a
> policy touches nothing in the application under test.
>
> A `Forbidden` row here is a policy decision, not a test result and not an Application Failure.
> The affected cases are recorded by the executing stage as `Skipped`, reason
> `Execution Safety Policy`, and still appear in every total.

| Field | Value |
|---|---|
| Run | `run-010__2026-10-04_14-13-31__UserStory__AutoReissueCheckbox-ApprovedSuiteRerun` |
| Environment | Staging |
| Policy | `ndc-admin-portal-stg` v1 |
| Policy hash | `sha256:f93996ef084ec361f30e6e0c52cc1b0e` |
| Generated | 2026-10-04T11:16:58.306Z |

## 1. Mutation Footprint

| Action | Module | Ownership | Occurrences | Decision | Matched Rule | Cleanup |
|---|---|---|---|---|---|---|
| UPDATE | agency | DedicatedTestData | 15 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| READ | agency | Shared | 14 | Allowed | `policy.categories.read.Shared` | — |
| UPDATE | branch | DedicatedTestData | 14 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| APPROVE | agency | DedicatedTestData | 9 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| APPROVE | branch | DedicatedTestData | 6 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| SUBMIT | branch | DedicatedTestData | 6 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| SUBMIT | agency | DedicatedTestData | 4 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| UPDATE | agency | Shared | 4 | Allowed | `policy.categories.mutation.Shared` | Required |
| CREATE | agency | SelfCreated | 2 | Allowed | `policy.categories.mutation.SelfCreated` | — |
| CREATE | branch | SelfCreated | 1 | Allowed | `policy.categories.mutation.SelfCreated` | — |

## 2. Totals

| Metric | Count |
|---|---|
| Operations planned | 75 |
| Mutating | 61 |
| Allowed | 75 |
| Approval Required | 0 |
| Already authorized for this run | 61 |
| Forbidden | 0 |
| Cleanup-required actions | 4 |

## 3. Authorization Questions

None. Nothing in this run's plan requires a scoped authorization.

## 4. Blocked by Policy

None.
