# Execution Safety Preflight — ancillaries-run-005__2026-10-04_18-30-46__Targeted__Ancillaries-OmanAir-Admin

> Produced before execution, from the run's planned operations. **Non-mutating** — evaluating a
> policy touches nothing in the application under test.
>
> A `Forbidden` row here is a policy decision, not a test result and not an Application Failure.
> The affected cases are recorded by the executing stage as `Skipped`, reason
> `Execution Safety Policy`, and still appear in every total.

| Field | Value |
|---|---|
| Run | `ancillaries-run-005__2026-10-04_18-30-46__Targeted__Ancillaries-OmanAir-Admin` |
| Environment | Staging |
| Policy | `ndc-admin-portal-stg` v1 |
| Policy hash | `sha256:374508eece1cebbb084334ce1bdbcefe` |
| Generated | 2026-10-04T15:46:54.458Z |

## 1. Mutation Footprint

| Action | Module | Ownership | Occurrences | Decision | Matched Rule | Cleanup |
|---|---|---|---|---|---|---|
| BOOK | ancillaries | SelfCreated | 1 | Forbidden (absolute) | `policy.actions.BOOK.*` | — |
| HOLD | ancillaries | SelfCreated | 1 | Forbidden (absolute) | `policy.actions.HOLD.*` | — |
| PAYMENT | ancillaries | SelfCreated | 1 | Forbidden (absolute) | `policy.actions.PAYMENT.*` | — |
| READ | ancillaries | Shared | 1 | Allowed | `policy.categories.read.Shared` | — |

## 2. Totals

| Metric | Count |
|---|---|
| Operations planned | 4 |
| Mutating | 3 |
| Allowed | 1 |
| Approval Required | 0 |
| Already authorized for this run | 0 |
| Forbidden | 3 |
| Cleanup-required actions | 0 |

## 3. Authorization Questions

None. Nothing in this run's plan requires a scoped authorization.

## 4. Blocked by Policy

- **BOOK / ancillaries / SelfCreated** — BOOK on SelfCreated data is prohibited on ancillaries / Staging — absolutely; no run authorization lifts it.
- **HOLD / ancillaries / SelfCreated** — HOLD on SelfCreated data is prohibited on ancillaries / Staging — absolutely; no run authorization lifts it.
- **PAYMENT / ancillaries / SelfCreated** — Payments are prohibited on this environment.
