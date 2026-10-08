# TC-ANC-023 — Retrieve aggregate vs itemization: investigation result

- **Executed:** 2026-09-29 · `POST {{baseUrl}}api/V2/FlightBooking/Retrieve` (baseUrl `https://ndc-integration-stg-ne-3.azurewebsites.net/`) · `supplier: AirIndia`, `CredentialsSelector: EGY`
- **Bookings:** all three real AirIndia bookings created on this effort (all DEL→IXE IX1782 / IXE→DXB IX813, 2 segments)
- **Evidence:** `retrieve_<PNR>_request.json` (headers redacted) and `retrieve_<PNR>_response.json` for each PNR in this folder
- **Verdict:** **Defect confirmed** — reproduced 3/3; root cause below is a hypothesis

## Reconciliation (INR)

| PNR | Non-INF pax | Meal (code, per leg) | Σ pax ancillary lines | `totalAncillariesAmount` | Gap | Σ meal lines | Gap = Σ meal lines? |
|---|---|---|---|---|---|---|---|
| YSTPMB | 2 | VSDB 250 | 22,900 | 23,400 | **500** | 500 | Yes |
| Y1ZVFF | 2 | VQSB 400 | 23,200 | 24,000 | **800** | 800 | Yes |
| Z33F4Z | 4 | VSDB 250 | 47,000 | 48,000 | **1,000** | 1,000 | Yes |

The same gap appears between Σ `paxTotalAmount` and `priceDetails.totalAmount` for each PNR. Each
passenger's own figures are self-consistent (base + tax + ancillary = pax total), and each aggregate is
self-consistent (base + tax + ancillaries = total). The two levels disagree with each other only by the
meal amount.

## What was actually charged (our system, from Booking Confirmation)

| PNR | Portal Meal charge | = INR at ROE 0.5 | = meals × price | Meals selected |
|---|---|---|---|---|
| YSTPMB | 500 EGP (Timeline 2026-09-26) | 1,000 | 2 pax × 2 legs × 250 | 4 |
| Y1ZVFF | 800 EGP (Timeline 2026-09-27; 200 EGP/leg) | 1,600 | 2 pax × 2 legs × 400 | 4 |
| Z33F4Z | 1,000 EGP (`05_booking_confirmation.png`) | 2,000 | 4 pax × 2 legs × 250 | 8 |

Meal is Per Segment for AirIndia (FINDING-002, ANC-48). In every case the Portal charge equals the
supplier **aggregate** (both legs), and the supplier **itemization** holds exactly half (one leg).

## Defect

- **Title:** Retrieve response itemizes a per-segment Meal only once per passenger; aggregate totals include both segments
- **Component:** NDC integration service Retrieve mapping (`api/V2/FlightBooking/Retrieve`), supplier AirIndia
- **Actual:** `passengerAncillaries[]` and `totalPassengersAncillaries[]` carry one meal line per passenger, while `totalAncillariesAmount` / `totalAmount` include the meal for every segment
- **Expected:** one meal line per passenger per segment, or one line at the per-journey amount, so that Σ itemization = aggregate totals
- **Impact:** anything consuming the per-passenger breakdown (costing, invoicing, per-passenger refund, reconciliation) under-states each passenger by one leg's meal; the difference is unattributed to any passenger
- **Scope:** Meal only. Baggage (`SBHC`, Per Journey) and Bundle (`VLPL`/`VHRB`, Per Journey) itemize and total consistently
- **Reproducibility:** Always (3/3 bookings, two different meal codes, 2 and 4 passengers)
- **Confidence:** High
- **Root-cause hypothesis (unverified):** `passengerAncillaries` entries carry no `segmentRefId`, so the per-segment meal items share one `ancillaryCode` per passenger and appear to be collapsed/de-duplicated by code when mapped, while the price totals are summed before that step
- **Open question:** whether the itemization defect originates in the integration service's mapping or in AirIndia's raw response — needs the raw supplier payload or integration logs
