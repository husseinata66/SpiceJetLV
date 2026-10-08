# TC-ANC-002 — Checkpoint 1: Supplier Retrieve vs Booking Confirmation

- **Called:** 2026-09-29 · `POST https://ndc-integration-stg-ne-3.azurewebsites.net/api/V2/FlightBooking/Retrieve` · HTTP 200
- **Request body:** `supplier: AirIndia`, `CredentialsSelector: EGY`, `pnr: Z33F4Z` (airline PNR), `gdsPNR`/`bookingToken` empty, `SurName: x` (values supplied by the user)
- **Evidence:** `06_supplier_retrieve_request.json` (headers redacted), `06_supplier_retrieve_response.json`, compared against `05_booking_confirmation.png`
- **Comparison rule (REC-TD-009):** passenger/ancillary data compared directly; fare amounts compared as `(retrieve INR × ROE 0.5) + Markup`

## Matches

| Item | Confirmation (Portal) | Supplier Retrieve | Result |
|---|---|---|---|
| PNR / supplier | Z33F4Z | Z33F4Z · AirIndia · EGY | Match |
| Itinerary | DEL→IXE IX1782 13:35–16:30 · IXE→DXB IX813 20:25–22:40, 20 Oct 2026, 1 stop | Same two segments, times, 7M8, 1 stop | Match |
| Passengers | 2 ADT (Ahmed/Sara) · 2 CHD (Tom/Amy) · 2 INF (Baby/Lily) | Same names, types, DOBs; each INF linked to an ADT (`parentPaxRefId`) | Match |
| Infant ancillaries | `-` for Meal/Seat/Bundle | No `passengerAncillaries` on either INF | Match (FINDING-006 confirmed at supplier level) |
| Seats | `-` for all | `passengersSelectedSeats` empty, `totalSelectedSeatsAmount` null | Match |
| Taxes | 15,082 EGP | 30,164 INR × 0.5 = 15,082 | Exact |
| Baggage (SBHC, special-equipment 3 Pc) | 5,250 EGP × 4 = 21,000 | 10,500 INR × 4 = 42,000 × 0.5 = 21,000 | Exact |
| Bundle | 2,000 EGP | VLPL 1,000 INR × 4 = 4,000 × 0.5 = 2,000 (+ VHRB 0 INR per pax) | Exact |
| Meal | 1,000 EGP (VSDB on both legs × 4 pax) | 2,000 INR equivalent only via aggregate total — see Observation A | Total matches; itemization does not |
| Base fare | 6,610 EGP | 12,020 INR × 0.5 = 6,010 → +600 EGP | Unexplained 600 EGP residual, **assumed** Markup — not verified against any Markup rule; confirm in Search Booking Costing. ROE 0.5 also inferred (reconciles taxes/baggage/bundle exactly), not read from configuration |
| Grand total | 45,692 EGP | 90,184 INR × 0.5 = 45,092 → +600 EGP | Gap = the same 600 base Markup |
| Ticket numbers | blank | `tickets: {}` | Consistent |

## Observations (not dispositioned — for the user)

**A. Meal itemization under-reports the second leg (same pattern as the Y1ZVFF 800 INR gap).**
Per-passenger breakdown lists `VSDB` once at 250 INR (`paxTotalAncillaryAmount` 11,750 = 10,500 + 1,000 + 250),
and the aggregate `totalPassengersAncillaries.VSDB` is 1,000 INR (4 × 250). But `totalAncillariesAmount`
is 48,000 INR, while the itemized lines sum to 47,000 — and `totalAmount` 90,184 vs Σ `paxTotalAmount`
89,184. The unattributed 1,000 INR is exactly one more VSDB per passenger (second leg). The Portal
charges both legs (1,000 EGP = 2,000 INR), so Portal agrees with the aggregate total; the supplier's
per-passenger/per-code itemization is missing the second-leg meal. This now has two independent
observations (Y1ZVFF, Z33F4Z), which supports the earlier per-segment-Meal hypothesis.

**B. Check-in baggage allowance differs.** Confirmation shows `Check In: 30 Kilograms / Cabin: 7` for all
six passengers. Supplier `baggageDetails` gives 40 kg for both Adults, 30 kg for both Children, and the
Infants reference their Adult's entry (40 kg), while the price class says `Infant Check-In Baggage: 10kg`.

**C. Status wording.** Portal `Confirmed`; supplier `bookingStatus: "UnKnown"`, `refundability: "UnKnown"`.
May be normal for this supplier's Retrieve (no ticket issued yet) — needs confirmation.

**Dispositions (user, 2026-09-29):** A → defect, confirmed via TC-ANC-023. B → real issue, outside
Ancillaries scope, kept as a Note. C → kept as a Note. The 600 EGP residual → resolved in
`07_steps6-8_checkpoints.md` as +100 EGP per passenger on base fare.

**D. Bundle naming (traced, not an issue — user 2026-09-29).** Selection UI "Value Pack", confirmation
"Xtra Pack"; supplier codes `VLPL` (1,000 INR) + `VHRB` (0 INR). Price consistent.
