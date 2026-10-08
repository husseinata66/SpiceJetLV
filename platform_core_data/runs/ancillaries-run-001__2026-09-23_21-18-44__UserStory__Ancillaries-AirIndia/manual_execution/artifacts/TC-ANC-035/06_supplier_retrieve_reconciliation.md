# TC-ANC-035 — Supplier Retrieve reconciliation (PNR S13GWS)

**Called:** 2026-10-01, `POST https://ndc-integration-stg-ne-3.azurewebsites.net/api/V2/FlightBooking/Retrieve`, HTTP 200.

## Passenger / ancillary data — onward-only pattern confirmed supplier-side

- All 3 passengers match exactly: names, DOBs, document numbers, passenger type codes (ADT/CHD/INF).
- Infant (`TestInfantEight One`) correctly linked via `parentPaxRefId` to the Adult (`MCFBRFQ-`).
- All 4 flight segments (DEL-JAI, JAI-DXB onward; DXB-COK, COK-DEL return) match the booking confirmation exactly.
- Per-passenger `passengerAncillaries` (ADT and CHD, identical): `PBAB` (baggage) 6,800 INR, `VHRB` (meal) 400 INR. **No ancillary codes tied to the return segments appear anywhere** — confirms no silent carry-over to the return leg, supplier-side.

## Fare reconciliation (ROE 0.5, no Markup — consistent with TC-ANC-003's Portal finding)

| Component | Supplier (INR) | × ROE 0.5 (EGP) | Admin/Portal shows (EGP) | Diff | Explanation |
|---|---|---|---|---|---|
| Base fare | 24,182 | 12,091 | 12,091 | 0 | Exact match — Portal bookings carry no per-pax Markup (same as TC-ANC-003) |
| Taxes | 31,180 | 15,590 | 15,590 | 0 | Exact match |
| Meal (+) | — | — | 800 | — | 200 EGP × 2 legs (Onward Leg 1 + Leg 2) × 2 pax (ADT+CHD) |
| Baggage (+) | — | — | 6,800 | — | 3,400 EGP × 2 pax (ADT+CHD), onward only |
| **Total** | 70,562 | 35,281 | **35,281** | — | 12,091+15,590+800+6,800=35,281 ✓ |

**`priceDetails.totalAncillariesAmount`: 15,200 INR × 0.5 = 7,600 EGP** — matches Meal(800)+Baggage(6,800)=7,600 EGP **exactly**. The booking-level ancillary total is correct.

## Defect A generalizes further — confirmed within a single direction, not just across onward/return

Prior evidence (TC-ANC-023, TC-ANC-005) found the itemization undercounts an ancillary code that repeats **across onward and return directions** on a round trip. This booking's onward-only selection (Meal chosen on **both legs of the same direction**: DEL-JAI and JAI-DXB) shows the **same undercounting pattern holds even within one direction**, confirming the root cause is "repeated code for the same passenger" generically, not specifically an onward/return split:

- Each ADT/CHD passenger's itemized `passengerAncillaries` shows `VHRB`: **400 INR** — but VHRB (200 EGP/leg) was selected on **2 legs**, so the true per-passenger meal charge is 200×2=400 EGP = **800 INR**. The itemization shows exactly **half**.
- `PBAB` (baggage): **6,800 INR** per passenger — correct, because baggage was selected **only once** (onward, not repeated) for this passenger. This is the clean control case: no repeat, no undercount.
- **This time the undercount also propagates into `paxTotalAncillaryAmount`** (7,200 INR per passenger = 6,800 + 400, i.e. the *undercounted* sum), not just the itemized list — a refinement over TC-ANC-005, where `paxTotalAncillaryAmount` remained correct even though the itemized breakdown within it undercounted. The **booking-level** `priceDetails.totalAncillariesAmount` (15,200 INR) is still correct, and does **not** derive from summing the (undercounted) `paxTotalAncillaryAmount` fields (2×7,200=14,400 ≠ 15,200) — it must be computed independently by the supplier, which is why the overall fare reconciliation still holds exactly despite the per-passenger field being wrong.

## Disposition

Carry this as the same Defect A (retrieve-endpoint itemization/undercounting), generalized once more: **triggers whenever a passenger is charged the same ancillary code more than once, regardless of whether the repeats span two directions (round trip) or two legs of one direction (multi-stop)** — and, newly observed here, can also corrupt the per-passenger `paxTotalAncillaryAmount` field, not only the itemized `passengerAncillaries` list. The booking-level aggregate (`priceDetails.totalAncillariesAmount`) remains correct in every case observed so far.
