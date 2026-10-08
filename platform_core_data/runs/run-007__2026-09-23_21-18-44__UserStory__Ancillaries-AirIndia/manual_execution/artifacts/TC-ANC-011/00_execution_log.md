# TC-ANC-011 — Execution log (desk review, evidence reused from E2E Fare screens)

**Executed:** 2026-10-03 · Desk review, no new booking — per this case's own Notes field.

**Evidence source:**
- Admin: TC-ANC-004/005/034's Fare Details panels (`15_costing_and_payment.png` etc.) — each itemizes
  Base Fare, Taxes, Service Charge, Meal, Baggage, Bundle, Discount. No row is ever labeled "Markup".
- Portal: TC-ANC-002/003/035's Fare Breakdown panels — same, no "Markup" row ever shown; Portal
  bookings in this run additionally carry **zero** Markup at all (confirmed on TC-ANC-003/035), so
  there is nothing to fold in on that channel's bookings specifically — the absence-of-a-row check
  still holds regardless.
- The +100 EGP/passenger Markup present on every Admin booking (TC-ANC-002/004/005/034) is confirmed
  arithmetically (the gap between the ROE-converted supplier Base Fare and the system's displayed Base
  Fare, exactly 100/pax) but **never appears as its own displayed line anywhere** — it is absorbed
  into the displayed Base Fare figure, per ANC-55.

## Disposition

Across all six E2E bookings' Fare Details/Fare Breakdown panels (both channels), no "Markup" line item
is ever shown; Base Fare is the only component carrying it. Exactly this case's stated Expected Result.

**Proposed TC-ANC-011 status: Passed.**
