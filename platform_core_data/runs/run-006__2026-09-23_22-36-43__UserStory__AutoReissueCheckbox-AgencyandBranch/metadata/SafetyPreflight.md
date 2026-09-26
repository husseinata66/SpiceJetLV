# Execution Safety Preflight — run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch

> Produced before execution, from the run's planned operations. **Non-mutating** — evaluating a
> policy touches nothing in the application under test.
>
> A `Forbidden` row here is a policy decision, not a test result and not an Application Failure.
> The affected cases are recorded by the executing stage as `Skipped`, reason
> `Execution Safety Policy`, and still appear in every total.

| Field | Value |
|---|---|
| Run | `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Environment | Staging |
| Policy | `ndc-admin-portal-stg` v1 |
| Policy hash | `sha256:374508eece1cebbb084334ce1bdbcefe` |
| Generated | 2026-09-25T13:34:37.191Z |

## 1. Mutation Footprint

| Action | Module | Ownership | Occurrences | Decision | Matched Rule | Cleanup |
|---|---|---|---|---|---|---|
| UPDATE | booking | DedicatedTestData | 12 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| UPDATE | agency | DedicatedTestData | 8 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| APPROVE | agency | DedicatedTestData | 8 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| SUBMIT | agency | DedicatedTestData | 7 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| UPDATE | agency | DedicatedTestData | 7 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| UPDATE | branch | DedicatedTestData | 7 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| SUBMIT | branch | DedicatedTestData | 7 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| APPROVE | branch | DedicatedTestData | 7 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| UPDATE | branch | DedicatedTestData | 7 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| UPDATE | master-supplier | Shared | 4 | Allowed | `policy.categories.mutation.Shared` | Required |
| CREATE | agency | SelfCreated | 2 | Allowed | `policy.categories.mutation.SelfCreated` | — |
| SUBMIT | agency | SelfCreated | 2 | Allowed | `policy.categories.approval.SelfCreated` | — |
| APPROVE | agency | SelfCreated | 2 | Allowed | `policy.categories.approval.SelfCreated` | — |
| UPDATE | agency | DedicatedTestData | 1 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| APPROVE | agency | DedicatedTestData | 1 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| CREATE | branch | SelfCreated | 1 | Allowed | `policy.categories.mutation.SelfCreated` | — |
| SUBMIT | branch | SelfCreated | 1 | Allowed | `policy.categories.approval.SelfCreated` | — |
| APPROVE | branch | SelfCreated | 1 | Allowed | `policy.categories.approval.SelfCreated` | — |

## 2. Totals

| Metric | Count |
|---|---|
| Operations planned | 85 |
| Mutating | 85 |
| Allowed | 85 |
| Approval Required | 0 |
| Already authorized for this run | 85 |
| Forbidden | 0 |
| Cleanup-required actions | 4 |

## 3. Authorization Questions

None. Nothing in this run's plan requires a scoped authorization.

## 4. Blocked by Policy

None.
