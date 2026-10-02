# TC-ANC-007 — Execution log (desk review, evidence reused from TC-ANC-004 + TC-ANC-005)

**Executed:** 2026-10-03 · Desk review, no new booking — per this case's own Notes field ("If any [of
TC-ANC-004/005/034] has already been executed this run, record this case's result from that same
evidence instead of a separate booking attempt").

**Evidence source:**
- TC-ANC-004 (Admin, one-way non-stop, BOM-COK), PNR `USCWVR`, genuine **2 Adult, 2 Child, 2 Infant**
  mix (this case's own Test Data). Step 3 of its execution log: "**Infant exclusion ✓**: 4 ancillary
  cards (ADT/CHD only)" — both Infants render no ancillary card on the Ancillaries step at all.
- TC-ANC-005 (Admin, round-trip w/ stop, DEL-DXB) confirmation checkpoint, step 5 of its execution
  log: "Infant: `-` Meal/Seat/Bundle, no baggage row" on the confirmation/Order Details Passenger
  Details table.
- Standard included Baggage Allowance for Infants (distinct from the *Extra* Baggage ancillary this
  suite tests) was independently confirmed during Discovery (FINDING-006,
  `InfantEligibilityConfirmed`) and is not re-derived here — this case's own scope is the *ancillary*
  cells, which both E2E logs above confirm blank for Infants.

## Disposition

Both passengers types confirmed: Infant rows show no selectable ancillary at the Ancillaries step
(TC-ANC-004) and blank Meal/Seat/Bundle cells with no Extra Baggage entry on the confirmation/Order
Details table (TC-ANC-005) — exactly this case's stated Expected Result.

**Proposed TC-ANC-007 status: Passed.**
