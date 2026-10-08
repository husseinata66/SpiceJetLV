# TC-ANC-027 — Execution log (exploratory, desk review — decision deferred)

**Executed:** 2026-10-03 · Desk review of existing Wallet History Report evidence, no new live action
needed (the labeling pattern has already been observed consistently, see below).

## Evidence

Observed identically on every Admin booking whose Wallet History/AR Ledger report was checked this
run (TC-ANC-004, TC-ANC-025's reconciliation): the Start Balance and End Balance rows appear under the
**Debit** column, while the actual money-out booking transaction appears under the **Credit** column —
the inverse of normal accounting convention (where an outflow/debit reduces balance). Reproduced
consistently (TC-ANC-004 00_execution_log.md: "AR Ledger and Wallet History show the 18,176 wallet
**deduction** under **Credit** (Debit 0) while the balance goes down"; TC-ANC-034: "AR Ledger /
Wallet History show the deduction under Credit, not Debit").

## Steps

| # | Step | Result |
|---|---|---|
| 1 | Review the Start Balance, transaction, and End Balance rows and which column each value falls under | Done — see Evidence above, confirmed on 3 independent Admin bookings |
| 2 | Ask the product/business owner whether this labeling is intentional | **Asked 2026-10-03 — deferred.** The reviewer chose not to make this call now; no product decision has been recorded. |

## Disposition

The observation itself is solid and reproducible (3/3 Admin bookings), but this case's own Expected
Result requires a **product decision** ("keep as documented behavior, or file as a UX fix"), which
has been explicitly deferred rather than decided. Per the Result Classification set, a case whose
outcome depends on a decision not yet made is **Inconclusive**, not Passed or Failed.

**Proposed TC-ANC-027 status: Inconclusive** — re-open and re-disposition once the product/business
owner makes the call. The underlying observation (inverted Debit/Credit columns) is carried forward
unchanged regardless of which way that decision goes.
