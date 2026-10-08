# Execution Safety Preflight — agency+branch-run-002__2026-09-27_12-13-13__UserStory__AutoReissueCheckbox-ReissueButtonCredentialRule

> Produced before execution, from the run's planned operations. **Non-mutating** — evaluating a
> policy touches nothing in the application under test.
>
> A `Forbidden` row here is a policy decision, not a test result and not an Application Failure.
> The affected cases are recorded by the executing stage as `Skipped`, reason
> `Execution Safety Policy`, and still appear in every total.

| Field | Value |
|---|---|
| Run | `agency+branch-run-002__2026-09-27_12-13-13__UserStory__AutoReissueCheckbox-ReissueButtonCredentialRule` |
| Environment | Staging |
| Policy | `ndc-admin-portal-stg` v1 |
| Policy hash | `sha256:374508eece1cebbb084334ce1bdbcefe` |
| Generated | 2026-09-27T09:38:20.709Z |

## 1. Mutation Footprint

| Action | Module | Ownership | Occurrences | Decision | Matched Rule | Cleanup |
|---|---|---|---|---|---|---|
| READ | agency | Shared | 4 | Allowed | `policy.categories.read.Shared` | — |
| UPDATE | agency | DedicatedTestData | 3 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| UPDATE | branch | DedicatedTestData | 3 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| APPROVE | branch | DedicatedTestData | 3 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| APPROVE | agency | DedicatedTestData | 2 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| READ | booking | Shared | 2 | Allowed | `policy.categories.read.Shared` | — |
| READ | booking | Shared | 1 | Allowed | `policy.categories.read.Shared` | — |
| UPDATE | booking | DedicatedTestData | 1 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| READ | booking | Shared | 1 | Allowed | `policy.categories.read.Shared` | — |
| SUBMIT | agency | DedicatedTestData | 1 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| REJECT | agency | DedicatedTestData | 1 | Allowed | `policy.categories.approval.DedicatedTestData` | — |
| READ | branch | Shared | 1 | Allowed | `policy.categories.read.Shared` | — |
| UPDATE | booking | DedicatedTestData | 1 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |
| UPDATE | booking | DedicatedTestData | 1 | Allowed | `policy.categories.mutation.DedicatedTestData` | — |

## 2. Totals

| Metric | Count |
|---|---|
| Operations planned | 25 |
| Mutating | 16 |
| Allowed | 25 |
| Approval Required | 0 |
| Already authorized for this run | 16 |
| Forbidden | 0 |
| Cleanup-required actions | 0 |

## 3. Authorization Questions

None. Nothing in this run's plan requires a scoped authorization.

## 4. Blocked by Policy

None.
