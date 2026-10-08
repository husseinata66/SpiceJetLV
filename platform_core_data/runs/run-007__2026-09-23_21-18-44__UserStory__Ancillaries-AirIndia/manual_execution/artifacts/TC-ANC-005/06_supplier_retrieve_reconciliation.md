# TC-ANC-005 — Supplier Retrieve reconciliation (PNR MSK5XB)

**Called:** 2026-10-01, `POST https://ndc-integration-stg-ne-3.azurewebsites.net/api/V2/FlightBooking/Retrieve`, HTTP 200.

## Passenger / ancillary data — exact match

- All 3 passengers match exactly: names, DOBs, document numbers, passenger type codes (ADT/CHD/INF).
- Infant `Mona TestInfantFive` correctly linked via `parentPaxRefId` to Omar (`MCFBRFQ-`), consistent with the Portal/Admin "Assigned to" selection.
- All 4 flight segments (DEL-JAI, JAI-DXB, DXB-COK, COK-DEL) match the booking confirmation exactly (times, flight numbers, equipment).

## Fare reconciliation (ROE 0.5 + Markup, per the test suite's own methodology)

| Component | Supplier (INR) | × ROE 0.5 (EGP) | Admin shows (EGP) | Diff | Explanation |
|---|---|---|---|---|---|
| Base fare | 24,182 | 12,091 | 12,391 | +300 | Markup 100 EGP/pax × 3 pax (same pattern as TC-ANC-002/003/004) |
| Taxes | 31,180 | 15,590 | 15,590 | 0 | Exact match, no markup on taxes |
| Ancillaries (aggregate) | 47,500 | 23,750 | 23,750 (750 Meal + 21,000 Baggage + 2,000 Bundle) | 0 | Exact match |
| Service Charge | — | — | 75 | — | Admin-only fee, not from supplier |
| Discount | — | — | −150 | — | Admin-only |
| **Total** | 102,862 | 51,431 | **51,656** | — | 51,431 + 75 − 150 = 51,656 ✓ |

**Full reconciliation holds exactly** once ROE + Markup + Admin's own Service Charge/Discount are applied, consistent with every prior E2E case.

## Defect A generalizes beyond Meal — confirmed on this round-trip

Prior evidence (TC-ANC-023) found the supplier retrieve endpoint's **itemized** `passengerAncillaries` list undercounts Meal when it repeats across segments. This booking's round-trip itinerary (2 directions, repeated ancillary codes) shows the **same undercounting pattern now affects Baggage and Bundle too**:

Per-ADT (`MCFBRFQ-`) itemized `passengerAncillaries`:
- `SBHC` (baggage): **10,500 INR** — but baggage was selected **once per direction** (2 directions × 5,250 EGP × ROE-inverse 2 = 10,500 EGP per direction → 21,000 EGP = **42,000 INR** expected). Itemization shows only **half**.
- `VLPL` (bundle): **1,000 INR** — bundle was selected once per direction (2 directions); expected ~2,000 INR. Itemization shows only **half**.
- `VSDB` (meal): **250 INR** — meal was selected on 3 of 4 legs at 125 EGP each (one leg was the free `VHRF` option); expected ~750 INR (3 × 250). Itemization shows only **one occurrence**.

In every case, `paxTotalAncillaryAmount` (11,750 INR) and the booking-level `totalAncillariesAmount` (47,500 INR) **are correct** — only the itemized per-code breakdown undercounts when a code repeats. This confirms Defect A is not Meal-specific: **the itemization lists each ancillary code once per passenger regardless of how many segments/directions it was actually charged on**, while the aggregate totals are computed correctly.

## Other observations (consistent with prior cases, no new disposition needed)

- `bookingStatus: "UnKnown"` vs Admin's `Confirmed` — same C/H Note as TC-ANC-002/003/004.
- Bundle shown as `VLPL` code in retrieve data; Admin's own UI still shows the "Value Pack" (selection) vs "Xtra Pack" (confirmation) label difference — already dispositioned as not an issue, traced only (Note D).

## Disposition

Carry Defect A (now evidenced on Baggage and Bundle, not just Meal) into `ManualExecutionResults.md` as a defect against the Retrieve endpoint's itemization logic, same as TC-ANC-023's finding — strengthened scope, not a new defect.
