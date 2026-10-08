# TC-ANC-034 — Supplier Retrieve reconciliation (PNR H9ZK7E)

**Called:** 2026-10-01, `POST https://ndc-integration-stg-ne-3.azurewebsites.net/api/V2/FlightBooking/Retrieve`, HTTP 200.

## Passenger / ancillary data — zero ancillaries confirmed

- All 6 passengers match exactly: names, DOBs, document numbers, passenger type codes (ADT/ADT/CHD/CHD/INF/INF).
- Both infants (`TestInfantSeven One/Two`) correctly linked via `parentPaxRefId` to their respective Adult (`MCFBRFQ-`/`MSFBRFQ-`), consistent with the Portal/Admin "Assigned to" selection.
- Both flight segments (DEL-JAI, JAI-DXB) match the booking confirmation exactly (times, flight numbers, equipment).
- **`passengersSelectedAncillaries: {}`** at the booking level — empty object, confirming zero ancillaries supplier-side.
- Each ADT/CHD passenger's `passengerAncillaries: []` in `passengerFareBreakdown` — empty array, `paxTotalAncillaryAmount: 0 INR`.
- **`priceDetails.totalAncillariesAmount: 0 INR`** and `totalPassengersAncillaries: []` — booking-level totals confirm zero ancillaries across the board.

## Fare reconciliation (ROE 0.5 + Markup, per the test suite's own methodology)

| Component | Supplier (INR) | × ROE 0.5 (EGP) | Admin shows (EGP) | Diff | Explanation |
|---|---|---|---|---|---|
| Base fare | 18,116 | 9,058 | 9,658 | +600 | Markup 100 EGP/pax × 6 pax (ANC-55: Markup applies regardless of ancillary selection) |
| Taxes | 30,468 | 15,234 | 15,234 | 0 | Exact match, no markup on taxes |
| Ancillaries (aggregate) | 0 | 0 | 0 | 0 | Exact match — zero ancillaries, as designed |
| Service Charge | — | — | 150 | — | Admin-only fee, not from supplier |
| Discount | — | — | −300 | — | Admin-only |
| **Total** | 48,584 | 24,292 | **24,742** | — | 24,292 + 150 − 300 = 24,742 ✓ |

**Full reconciliation holds exactly** once ROE + Markup + Admin's own Service Charge/Discount are applied, consistent with every prior E2E case — and this case additionally confirms the **Base fare Markup gap is present identically with zero ancillaries selected**, isolating it as independent of ancillary selection (ANC-55).

## Other observations (consistent with prior cases, no new disposition needed)

- `bookingStatus: "UnKnown"` vs Admin's `Ticketed Document`/`Booked` — same C/H Note as TC-ANC-002/003/004/005.
- Per-passenger `paxBaseAmount` (1,100 INR × 4 ADT/CHD + 6,858 INR × 2 INF) and taxesAndFees breakdown match the aggregate exactly — no itemization discrepancy possible here since there is nothing to itemize (Defect A does not apply — it only manifests when an ancillary code repeats, and there are no ancillary codes at all in this booking).

## Disposition

No defect. This retrieve call is a clean confirmation of the zero-ancillary boundary case at the supplier level, and independently confirms ANC-55 (Markup on Base fare is unconditional).
