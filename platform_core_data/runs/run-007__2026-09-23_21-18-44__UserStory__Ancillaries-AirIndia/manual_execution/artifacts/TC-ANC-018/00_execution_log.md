# TC-ANC-018 — Execution log (Portal, live)

- **Executed:** 2026-10-03, ~23:52–23:55 UTC · Portal `STG_PORTAL` (`http://192.168.1.213:9500`) · Agency `AGN9808`.
- **Mechanism:** Playwright MCP, headed, existing storage-state session.
- **Context:** same live Ancillaries step used for TC-ANC-009/015 (one-way DEL-DXB, 2 Adult + 2
  Infant, base 17,322 EGP, free "DEL" Bundle). Booking not yet finalized at the point these steps
  were exercised.
- **Proposed status: Passed.**

## Steps

| # | Step | Result | Detail |
|---|---|---|---|
| 1 | Change Passenger 1's Meal selection to a different option | **Pass** | P1 (TestAdultNine One) initially selected VSDB "Shondesh Tiramisu" (125 EGP) → Net Payable 17,447. Changed to VQSB "Quinoa Salad" (200 EGP) → Net Payable **18,422** (= 18,347 − 125 + 200, exact). New selection and price correctly reflected. |
| 2 | Remove Passenger 2's Baggage selection | **Pass** | P2 (TestAdultTen One) had selected "Baggage handling fee - 1 Piece (900 EGP)" → Net Payable 19,322. Cleared via the dropdown's own clear (✕) icon → Net Payable **18,422** (= 19,322 − 900, exact). Baggage charge fully removed from the total. |
| 3 | Proceed to the Fare Breakdown/Fare Details | Pass | Net Payable Amount panel (Payment Details) updated live after each change — no separate navigation needed, the total is shown continuously on this step. |

## Disposition

Passenger 1's new Meal selection and its price were correctly reflected (18,422, isolating exactly the
125→200 EGP delta). Passenger 2's Baggage charge was fully removed from the total (back down to
18,422 from 19,322, isolating exactly the 900 EGP removed). Screenshots `01_before_change.png` /
`02_after_change_and_remove.png` confirm **neither change affected the other passenger's own
selections**: P1 ends with Meal VQSB + no Baggage; P2 ends with no Meal + Baggage 900 EGP, each
independent of the other's edit history. Exactly this case's stated Expected Result.

**Proposed TC-ANC-018 status: Passed.**
