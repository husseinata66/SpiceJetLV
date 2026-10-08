# Execution Safety Preflight — ancillaries-run-002__2026-09-26_20-51-48__Targeted__Ancillaries-FlynasNDCSeatMap

> Produced before execution, from the run's planned operations. **Non-mutating** — evaluating a
> policy touches nothing in the application under test.
>
> A `Forbidden` row here is a policy decision, not a test result and not an Application Failure.
> The affected cases are recorded by the executing stage as `Skipped`, reason
> `Execution Safety Policy`, and still appear in every total.

| Field | Value |
|---|---|
| Run | `ancillaries-run-002__2026-09-26_20-51-48__Targeted__Ancillaries-FlynasNDCSeatMap` |
| Environment | Staging |
| Policy | `ndc-admin-portal-stg` v1 |
| Policy hash | `sha256:374508eece1cebbb084334ce1bdbcefe` |
| Generated | 2026-09-26T18:03:00.184Z |

## 1. Mutation Footprint

| Action | Module | Ownership | Occurrences | Decision | Matched Rule | Cleanup |
|---|---|---|---|---|---|---|
| BOOK | ancillaries | SelfCreated | 13 | Forbidden (absolute) | `policy.actions.BOOK.*` | — |
| WALLET_CHARGE | ancillaries | Shared | 13 | Forbidden (absolute) | `policy.actions.WALLET_CHARGE.*` | — |
| SEARCH | ancillaries | Shared | 101 | Allowed | `policy.categories.read.Shared` | — |
| READ | ancillaries | Shared | 101 | Allowed | `policy.categories.read.Shared` | — |
| CREATE | ancillaries | SelfCreated | 101 | Allowed | `policy.categories.mutation.SelfCreated` | — |

## 2. Totals

| Metric | Count |
|---|---|
| Operations planned | 329 |
| Mutating | 127 |
| Allowed | 303 |
| Approval Required | 0 |
| Already authorized for this run | 101 |
| Forbidden | 26 |
| Cleanup-required actions | 0 |

## 3. Authorization Questions

None. Nothing in this run's plan requires a scoped authorization.

## 4. Blocked by Policy

- **BOOK / ancillaries / SelfCreated** — BOOK on SelfCreated data is prohibited on ancillaries / Staging — absolutely; no run authorization lifts it.
- **WALLET_CHARGE / ancillaries / Shared** — Wallet charges are prohibited on this environment.
