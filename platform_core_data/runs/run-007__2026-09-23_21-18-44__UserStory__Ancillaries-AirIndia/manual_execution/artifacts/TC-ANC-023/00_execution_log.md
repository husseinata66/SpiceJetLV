# TC-ANC-023 — Execution log (exploratory investigation)

**Executed:** 2026-09-29 (investigation carried out this run; formalized as a Stage 4M result
2026-10-03). Full investigation, reconciliation tables and defect writeup:
`TC-ANC-023_investigation.md` (same folder), evidence `retrieve_<PNR>_request/response.json` for
PNRs YSTPMB, Y1ZVFF, Z33F4Z.

**Objective (from the test case):** determine the source of the 800 INR gap first observed between
the Y1ZVFF retrieve response's aggregate total and the sum of its own per-passenger totals.

## Finding

Root cause identified and reproduced 3/3 (YSTPMB, Y1ZVFF, Z33F4Z): the supplier retrieve endpoint's
per-passenger `passengerAncillaries` itemization carries **one Meal line per passenger** regardless of
how many flight segments that Meal was actually charged for, while the aggregate fields
(`totalAncillariesAmount`, `priceDetails.totalAmount`) correctly include the charge for every segment.
Meal is Per Segment for this Supplier (FINDING-002/ANC-48) — in every booking checked, the system's
actual charge equals the supplier aggregate (both/all legs), and the itemization holds exactly half (or
proportionally less, for more legs) of that amount. Baggage and Bundle (both Per Journey) itemize and
total consistently — only Meal (the only Per-Segment-repeating ancillary in these three bookings)
showed the gap.

This is the same root cause later generalized as **Defect A** across the E2E suite (TC-ANC-003, 005,
035): the retrieve endpoint's itemized breakdown under-counts any ancillary code repeated for the same
passenger, whether the repeats are two segments of one direction, or onward vs. return. TC-ANC-023 is
the original investigation that first isolated and reproduced this pattern; the later E2E cases
confirmed it generalizes beyond Meal-only and beyond this specific 2-segment one-way route.

## Disposition

The investigation task is complete: the aggregate figures are **not** internally inconsistent with the
system's actual charges (both reconcile to what was actually billed) — the defect is specifically in
how the retrieve endpoint's **itemized, per-passenger breakdown** represents a repeated ancillary code,
not in either level's own internal arithmetic. Confidence: High, reproduced 3/3.

**Proposed TC-ANC-023 status: Passed** (the exploratory objective — identify the source of the
discrepancy — was achieved; the discrepancy itself is carried forward as Defect A against the retrieve
endpoint's itemization mapping, tracked once across TC-ANC-003/005/022/023/035, not as separate
defects).
