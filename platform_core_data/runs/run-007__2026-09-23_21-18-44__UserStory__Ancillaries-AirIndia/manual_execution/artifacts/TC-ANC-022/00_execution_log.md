# TC-ANC-022 — Execution log (scenario, evidence reused from E2E retrieve checkpoints)

**Executed:** 2026-10-03 · Desk review, no new retrieve call — per this case's own Notes field ("Once
at least one Portal and one Admin E2E case has executed, this case can be recorded from that same
evidence rather than a separate call").

**Evidence source:** at least one Portal E2E case (TC-ANC-002/003/035) and at least one Admin E2E case
(TC-ANC-004/005/034) have each independently executed this exact retrieve-endpoint comparison:

- Passenger list and ancillary codes/amounts matched the system's recorded selections **directly**
  (no ROE/Markup adjustment needed for non-fare fields) on every booking checked.
- Fare amounts matched only once `(retrieve-endpoint fare × ROE 0.5) + per-passenger Markup` was
  applied on top of the retrieve-endpoint figure — raw equality was never expected and its absence is
  not a defect, per this case's own Expected Result and ANC-55/FINDING-003. Confirmed on Admin
  (TC-ANC-004/005/034, Markup +100 EGP/pax) and Portal (TC-ANC-002/003/035, Markup 0 — Portal carries
  no per-pax Markup, a separate finding in its own right).

**Defect carried, not blocking:** Defect A (supplier retrieve itemization undercounts a repeated
ancillary code for the same passenger — see TC-ANC-023) was observed during these same checkpoints.
It affects the itemized `passengerAncillaries` breakdown, not the aggregate totals this case's own
Expected Result is scoped to, so it does not change this case's disposition.

## Disposition

Passenger/ancillary data matches the retrieve response directly; fare amounts match only after ROE +
Markup are both applied — exactly this case's stated Expected Result, confirmed on both channels.

**Proposed TC-ANC-022 status: Passed**, with Defect A carried forward as a known, separately-tracked
itemization defect (see TC-ANC-023).
