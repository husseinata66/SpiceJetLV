# TC-ANC-012 — Execution log (desk review, evidence reused from TC-ANC-005)

**Executed:** 2026-10-03 · Desk review, no new booking — per this case's own Notes field ("This exact
arithmetic check is also performed as part of TC-ANC-004/005/034's Costing checkpoint").

**Evidence source:** TC-ANC-005 (Admin, round-trip w/ stop, DEL-DXB) confirmation/Fare Details, step 5
of its execution log:

> Fare: Base 12,391 + Taxes 15,590 + Service 75 + Meal 750 + Baggage 21,000 + Bundle 2,000 − Discount
> 150 = **51,656 ✓**

This is exactly this case's formula (Base Fare + Taxes + Service Charges + Ancillaries [Meal + Baggage
+ Bundle] − Discount), read directly off the Fare Details panel and matched against the displayed
Total Amount. The same formula independently reconciles on TC-ANC-004 (Costing & Payment: Net =
supplier total, Profit 450) and TC-ANC-034 (Net 24,292 = supplier total exactly, zero ancillary
component since nothing was selected there).

## Disposition

The computed sum equals the displayed Total Amount exactly on every Admin E2E booking checked.

**Proposed TC-ANC-012 status: Passed.**
