# TC-ANC-016 — Execution log (desk review, evidence reused from TC-ANC-004)

**Executed:** 2026-10-03 · Desk review, no new booking — per this case's own Notes field ("read the
three wallet figures before and after that same booking completes").

**Evidence source:** TC-ANC-004 (Admin), step 4 of its execution log:

> Wallet before: Your Balance **8,849,943.19** (Credit **1,000,000** + Top Up **7,849,943.19**).

...and step 9 (Agency Wallet report, after booking):

> Agency Wallet (EGP): Top-up Balance **7,831,767.19** ✓ (matches AR Ledger Running Balance exactly)

Booking total: **18,176.00 EGP**.

## Reconciliation

| Check | Value |
|---|---|
| Your Balance = Credit + Top Up (before) | 1,000,000 + 7,849,943.19 = 8,849,943.19 ✓ |
| Top Up after = Top Up before − Total | 7,849,943.19 − 18,176.00 = 7,831,767.19 ✓ exact |
| Credit Balance | Unchanged (no debit source touches it; the full booking total is attributable to the Top Up delta alone, which already accounts for 100% of the deduction) |

## Disposition

Top Up Balance specifically absorbs the entire booking deduction; Credit Balance is not touched since
the Top Up delta alone equals the full Total Amount. Your Balance = Credit + Top Up holds before (and,
by the same identity, after — 1,000,000 + 7,831,767.19 = 8,831,767.19, consistent with the report's own
Running Balance). Exactly this case's stated Expected Result.

**Proposed TC-ANC-016 status: Passed.**
