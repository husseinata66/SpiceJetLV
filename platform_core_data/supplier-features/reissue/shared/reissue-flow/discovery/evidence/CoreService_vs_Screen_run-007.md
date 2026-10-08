# Supplier (Sabre) vs core service vs Admin API vs screen — Reissue Re-shop (run-007, Stage 2)

| Field | Value |
|---|---|
| Date | 2026-09-26 (UTC) |
| Core service | staging `/api/v1/reissue` (`SABRE_ATPCO`, credential `EGY`). Key in `credentials.json` → `CORE_SERVICE_STG` |
| Supplier | Sabre CERT REST (PCC EZ4K). Credentials in `credentials.json` → `SABRE_CERT`. Calls: `getBooking`, `flightReshop` only (grant `AUTH-SABRE-READ-DedicatedTestData`); exchange/fulfil never called |
| Calls made | `providers`, `eligibility`, `reshop` only. `/exchange` never called (grant `AUTH-CORESERVICE-READ-DedicatedTestData`) |
| Search | CAI→JED, 2026-12-01, Economy (same criteria as the screen) |

## Paired runs

| Booking | GDS PNR | Core reshop | Screen search | Offers core / Admin | Values equal | Screen shows |
|---|---|---|---|---|---|---|
| Agency `NDCEG-BR-F260924EAzzYT` (1 ADT, 1 CHD, 1 INF) | RGGMXP | 19:35 | 19:38 | 17 / 17, same flights | 17/17 | 13 visible; 4 behind "Show more (12 of 17)" |
| Branch `NDCEG-BR-F260926PwYMR2` (2 ADT, 1 CHD, 1 INF) | OOTKQP | 19:40 | 19:44 | 17 / 17, same flights | 17/17 | 13 visible; 4 behind "Show more" |

Evidence: `core-elig-*.json`, `core-reshop-*.json`, `d2b-agency-*`, `d2b-branch2-*`, `cmp-RGGMXP.json`, `cmp-OOTKQP.json`.

## Field mapping (verified)

| Core `offers[].modifyPrice` | Admin `reissuePricing` | Screen | Result |
|---|---|---|---|
| `baseDifference` | `additionalTotalBaseAmount` | Additional base fare | Equal (all offers) |
| `taxDifference` | `additionalTotalTaxesAndFeesAmount` | Additional tax & fees | Equal |
| `penalty` | `supplierPenalty` | Supplier fee | Equal (0 on the booked flight; 6,487 / 9,989 elsewhere on screen runs; core-run values equal to Admin in the same minute) |
| — (not from core) | `changeFee` | Change fee | App rule: Agency 50 × 3 = 150; Branch 100 × 4 = 400 (D-7, D-11) |
| `totalPayable` | `totalPayable` = core + `changeFee` | DUE NOW / Amount payable | Equal on every offer |
| `priceDetails.totalAmount` | `priceDetails.totalOfferAmount` | — | Equal |
| `flightSegments[].departureDateTime` | `segments[].departureDateTime` | Result times | Equal (e.g. SV-382 06:10, SV-300 11:45) |
| per-passenger breakdown (ADT/CHD/INF, quantity) | `passengerFareBreakdowns` | Breakdown per type | Same types and counts |

## Observations for the Discovery report

| # | Observation | Evidence |
|---|---|---|
| C-1 | Screen, Admin API and core service agree on every Re-shop amount and flight; the only app-added amount is the change fee | table above |
| C-2 | Result times come unchanged from the core service. The Itinerary shows the same flights 2 h later (SV-382 08:10, SV-300 13:45). Which side converts a time zone is still open | Itinerary screenshots vs `core-reshop-*.json` |
| C-3 | Core `originalPaidAmount` is 15,577.40 / 22,848.20. Review & Pay "Currently ticketed Total" shows the app's `totalOfferAmountRoundedUp` (15,578.00 / 22,849.00) on Admin **and** Portal, while its own line items add up to the exact amount. Admin and Portal Itinerary APIs also disagree on `totalBookingAmt` (15578 vs 15577.4). Decision needed: which total is "currently ticketed" | `core-elig-*.json`, `d3-review-0.json`, `p2-portal-flow.json` |
| C-4 | Core `eligibility` accepts any `credential` value for `SABRE_ATPCO` (`ZZZZ` answered 200 "changeable", same as `EGY`) | `core-eligibility-*-ZZZZ.json` |
| C-5 | The collection's saved `/exchange` example (2026-09-23) is booking `NDCEG-BR-F260916ENYOeQ` (GDS PNR OPQHXZ → new PNR 8WFYGH). It was exchanged directly through the core service, which is why the app now says "the airline will not reissue this ticket" while its Itinerary still shows the old JED→RUH→CAI. Do not use that booking as test data | user-supplied collection |

## Supplier layer: Sabre → core service (20:13 UTC, same minute per PNR)

| Booking | Sabre reshop | Core reshop | Offers Sabre / core | Values equal | Core unchanged since the 19:35/19:40 screen-matched run |
|---|---|---|---|---|---|
| RGGMXP (Agency) | 20:13:13 | 20:13:25 | 17 / 17, same flights | 17/17 | yes, all 17 |
| OOTKQP (Branch) | 20:13:35 | 20:13:48 | 17 / 17, same flights | 17/17 | yes, all 17 |

So the whole chain holds: **Sabre → core → Admin API → screen**, every offer. Evidence: `sabre-getBooking-*.json`, `sabre-reshop-*.json`, `core-reshop-*-2.json`.

| Sabre `offers[].totalPriceDifference` | Core `modifyPrice` | Note |
|---|---|---|
| `baseFare` | `baseDifference` | equal |
| `totalTax` | `taxDifference` | equal |
| `totalFee` | `penalty` | equal. Sabre sends an **empty string** when there is no penalty; core maps it to 0 |
| `grandTotal` | `totalPayable` | equal |
| fare groups per PTC (`ADT`, `CNN`, `INF`; `grandTotal` per passenger) | per-type breakdown `CHD` | Sabre `CNN` → core/Admin `CHD` → screen "Child". Group figures are per passenger: Branch 2 ADT × 121.80 = 243.60 on screen |

## Portal layer (AGN9780, Agency booking only)

| Item | Result | Evidence |
|---|---|---|
| Portal Re-shop API `/odeysysportal/v2/reissue/NDCEG-BR-F260924EAzzYT/search` (16:18 UTC) vs core `reshop` (20:13 UTC) | 17 / 17 offers, same flights, base / tax / penalty equal, Portal `totalPayable` = core + 150 on every offer. Not simultaneous (4 h apart), but core values were unchanged across 19:35 and 20:13 | `p-portal-flow.json`, `core-reshop-RGGMXP-2.json` |
| Portal results screen | "DUE NOW" 559.40 / 7,095.40 / 7,585.40, equal to the Admin screen | `p-results.png` |
| Portal Review & Pay | 559.40 = 409.40 + 150; wallet "Your Balance" 8,710,205.20 (top-up only; Admin shows 18,710,204.20 incl. credit) | `p-review.png` |
| **Paired re-run 2026-09-27 (headless)** | core reshop 21:32:48, Portal search 21:34:08: **17 / 17 offers equal** (base / tax / penalty; Portal total = core + 150). Review & Pay 559.40 = 409.40 + 150. No negatives | `core-reshop-RGGMXP-3.json`, `p2-portal-flow.json`, `p2-results.png`, `p2-review.png` |
| Portal Itinerary time | API `deptTime "06:10:00"`, epoch `2026-12-01T06:10Z`; **screen shows Departure 01-12-2026 08:10:00, Arrival 11:20:00**: FINDING-R01 confirmed on the Portal | `p2-itinerary.png` |
| Portal Costing total | Itinerary "Total Booking Amount" **15,577.40** on the Portal vs **15,578.00** on Admin for the same booking. The two **APIs** disagree: Admin itinerary `totalBookingAmt`/`totalPaidBookingAmount` = 15578, Portal itinerary = 15577.400000000001 (float artefact) | `tz-itinerary-api.json`, `p2-portal-flow.json` |
| Review & Pay "Currently ticketed · Total" | **15,578.00 on both Admin and Portal**. The screen shows `currentOffer…priceDetails.totalOfferAmountRoundedUp` (15578), not `totalOfferAmount` (15577.4). *Corrects the earlier note that rounding was Admin-only* | `d3-review-0.json`, `p2-portal-flow.json` |
| Branch bookings on the Portal | not applicable: an Agency Portal login cannot see Branch bookings (PO-26) | — |

## Get Booking (Sabre) vs Itinerary (app)

| Item | Sabre getBooking | Core | App Itinerary / Review & Pay | Result |
|---|---|---|---|---|
| RGGMXP SV-382 departure | 2026-12-01 **06:05** (PNR); reshop today 06:10 | 06:10 (reshop) | **08:10** | Itinerary +2 h (and a 5-min schedule change not reflected) |
| OOTKQP SV-300 departure | **11:45** | 11:45 | **13:45** | Itinerary +2 h |
| Paid total | 15,577.40 / 22,848.20 | same | 15,578.00 / 22,849.00 (Total) | rounding up is app-side |
| Tickets | TE, coupons I (open) on all | — | BOOKED | consistent |

| # | Observation (supplier layer) |
|---|---|
| C-6 | The Itinerary times are 2 h later than the supplier's own PNR (not only than the reshop). The supplier and core agree; the shift happens in the app's Itinerary. Candidate defect (time-zone conversion) |
| C-7 | No negative `baseFare` / `totalTax` came back for these bookings, so D-9 (never show a negative) was not exercised. Sabre does return negatives for cheaper fares (the Sabre collection's saved example: `baseFare -1056.00`, `XT -2749.80`). Needs a Stage 3 case with a booking whose re-shop is cheaper |

## Review & Pay: API → screen (Admin and Portal, Agency booking RGGMXP)

| Screen line | Review API field (`/v2/reissue/{ref}/review`) | Admin | Portal | Matches core/Sabre |
|---|---|---|---|---|
| Currently ticketed · Base fare per type | `currentOffer…passengerFareBreakdowns[].totalBaseAmount` | 4,017 / 2,987 / 412 | same | yes (Sabre paidBase per ticket) |
| Currently ticketed · Tax & fees per type | `…totalTaxesAndFeesAmount` | 3,113.80 / 3,113.80 / 1,933.80 | same | yes |
| Currently ticketed · Total | `…priceDetails.totalOfferAmountRoundedUp` | **15,578.00** | **15,578.00** | Sabre/core 15,577.40 (see C-3) |
| Additional tax & fees per type | `newOffer…reissuePricing.passengerFareBreakdowns[]` | 138.80 / 138.80 / 131.80 | same | yes |
| Change fee | `…reissuePricing.changeFee` | 150 (50 × 3) | same | app rule |
| Total additional / Amount payable | `…reissuePricing.totalPayable` | 559.40 | same | core 409.40 + 150 |
| Wallet · Your Balance | `/v2/financial/financial-details` | 18,710,204.20 (credit + top-up) | 8,710,205.20 (top-up only) | differs by channel (open) |

**User-supplied screenshot 2026-09-27 (Portal, on-behalf booking `NDCEG-BR-F2609242aZ6EJ`, 1 ADT, SV-302 19:50):**
- Additional tax 138.80 + change fee **50.00** = 188.80. A Branch-made booking **on behalf of** AGN9780 is charged the **Agency** fee (50) on the Portal. This answers D-7's open point for the Portal; the Admin side is not yet seen.
- Currently ticketed 4,017.00 + 3,113.80 = 7,130.80 is shown as Total **7,131.00**: the same rounding.
- The Portal sidebar wallet shows 3 decimals (8,710,205.**200**) while the page shows 2.
- Not yet compared with core/Sabre.
