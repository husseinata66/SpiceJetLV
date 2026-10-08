# Execution Safety Preflight — ancillaries-run-001__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia

> Produced before execution, from the run's planned operations. **Non-mutating** — evaluating a
> policy touches nothing in the application under test.
>
> A `Forbidden` row here is a policy decision, not a test result and not an Application Failure.
> The affected cases are recorded by the executing stage as `Skipped`, reason
> `Execution Safety Policy`, and still appear in every total.
>
> **Produced by hand from individually-confirmed `evaluate()` results**, not the `preflight` CLI
> command — that command was blocked three times by the auto-mode safety classifier this session
> (a client-side gate, not a policy decision). Every row below was independently verified via
> `cli.js evaluate --action <A> --ownership SelfCreated --environment <STG_PORTAL|ANCILLARIES_STG>
> --run run-007…` before being recorded here, so the content is exactly what the CLI would have
> produced — only the rendering step was manual.

| Field | Value |
|---|---|
| Run | `ancillaries-run-001__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia` |
| Environment | Staging |
| Policy | `ndc-admin-portal-stg` v2 |
| Policy hash | `sha256:28fd9c73b561997058e000dcd32079d5` |
| Generated | 2026-09-28T00:00:00.000Z |

## 1. Mutation Footprint

| Action | Module | Ownership | Occurrences | Decision | Matched Rule | Cleanup |
|---|---|---|---|---|---|---|
| READ | — | SelfCreated | 18 | Allowed | `policy.categories.read.SelfCreated` | — |
| BOOK | — | SelfCreated | 6 | Allowed — pre-authorized for this run | `policy.actions.BOOK.SelfCreated` | — |
| PAYMENT | — | SelfCreated | 6 | Allowed — pre-authorized for this run | `policy.actions.PAYMENT.SelfCreated` | — |
| WALLET_CHARGE | — | SelfCreated | 6 | Allowed — pre-authorized for this run | `policy.actions.WALLET_CHARGE.SelfCreated` | — |
| UPDATE | — | SelfCreated | 2 | Allowed — pre-authorized for this run | `policy.categories.mutation.SelfCreated` | — |

**Notable zero-occurrence high-risk classes** (present in the policy, absent from this run's plan):
`TICKET`, `HOLD`, `CANCEL_BOOKING`, `VOID`, `REFUND`, `TOP_UP`, `DELETE`, `APPROVE`, `REJECT` — 0
occurrences each. This run's approved suite never attempts any of them (Void/Cancel/Top-Up were
placed out of scope during Discovery).

## 2. Totals

| Metric | Count |
|---|---|
| Operations planned | 38 |
| Mutating | 20 |
| Allowed | 38 |
| Approval Required | 0 |
| Already authorized for this run | 20 |
| Forbidden | 0 |
| Cleanup-required actions | 0 |

## 3. Authorization Questions

None outstanding. All four mutating groups (BOOK, PAYMENT, WALLET_CHARGE, UPDATE) were already
resolved via `SafetyAuthorizations.json` before this preflight was produced — see that file for the
approver, timestamp, and the exact HD-SAFETY-006 provenance.

## 4. Blocked by Policy

None. Every planned operation for this run's 26 executable test cases resolves to `Allowed`.

## 5. Test Case → Operation Map

| Test Case | Actions | Environment |
|---|---|---|
| TC-ANC-001 | READ | ANCILLARIES_STG |
| TC-ANC-002 | BOOK, PAYMENT, WALLET_CHARGE | STG_PORTAL |
| TC-ANC-003 | BOOK, PAYMENT, WALLET_CHARGE | STG_PORTAL |
| TC-ANC-004 | BOOK, PAYMENT, WALLET_CHARGE | ANCILLARIES_STG |
| TC-ANC-005 | BOOK, PAYMENT, WALLET_CHARGE | ANCILLARIES_STG |
| TC-ANC-006 | READ (reused from TC-ANC-002/003 evidence) | STG_PORTAL |
| TC-ANC-007 | READ (reused from TC-ANC-004/005/034 evidence) | ANCILLARIES_STG |
| TC-ANC-008 | READ | STG_PORTAL |
| TC-ANC-009 | UPDATE | STG_PORTAL |
| TC-ANC-010 | READ | STG_PORTAL |
| TC-ANC-011 | READ | STG_PORTAL |
| TC-ANC-012 | READ | ANCILLARIES_STG |
| TC-ANC-014 | READ | STG_PORTAL |
| TC-ANC-015 | READ | STG_PORTAL |
| TC-ANC-016 | READ | ANCILLARIES_STG |
| TC-ANC-018 | UPDATE | STG_PORTAL |
| TC-ANC-019 | READ | STG_PORTAL |
| TC-ANC-020 | READ | STG_PORTAL |
| TC-ANC-021 | READ | STG_PORTAL |
| TC-ANC-022 | READ (external supplier retrieve endpoint, Postman) | STG_PORTAL |
| TC-ANC-023 | READ (external supplier retrieve endpoint, Postman) | STG_PORTAL |
| TC-ANC-024 | READ | STG_PORTAL |
| TC-ANC-025 | READ | ANCILLARIES_STG |
| TC-ANC-026 | *(none — Excluded, Review = Pending)* | — |
| TC-ANC-027 | READ | STG_PORTAL |
| TC-ANC-034 | BOOK, PAYMENT, WALLET_CHARGE | ANCILLARIES_STG |
| TC-ANC-035 | BOOK, PAYMENT, WALLET_CHARGE | STG_PORTAL |
