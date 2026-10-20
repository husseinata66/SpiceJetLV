# Approved Scope — Air Cairo Seat Map comparison

| | |
|---|---|
| Run | `ancillaries-run-008__2026-10-20_11-04-53__Targeted__Ancillaries-AirCairo-SeatMapComparison` |
| Feature / Supplier | Ancillaries / Air Cairo (`air-sm-cairo`), NDC credential "AIRCairo Production (Warning)" |
| Platforms | NDC Admin, NDC Portal (executed) · Air Cairo official website https://aircairo.com/en-eg/ (reference only) |
| Checklist | `platform_core_data/supplier-features/ancillaries/shared/ancillaries-baseline/test_design/TestCases_AncillariesSeatMap.xlsx` — **unchanged** |
| Approved by | Ahmed Ayman, 2026-10-20 (same scope as the Oman Air run ancillaries-run-007, with CAB-001 and CAB-007 excluded) |
| Execution method | Manual, through the browser tool. Exception to the Ancillaries runner-only rule, extended by the human to this Air Cairo comparison on 2026-10-20 (for this comparison only). The runner is not executed and no script or automation is written. |

This file narrows the run's [CapabilityPlan.md](CapabilityPlan.md) (102 cases the supplier can run) to the
Seat Map scope the human approved. Any case not in sections 1–3 is not executed.

## Safety boundary (unchanged on all three platforms)

- **Allowed:** in NDC, inside the pre-booking seat-selection step only: Book Seat (`Book <seat> for <name>`),
  Confirm Seat (`Confirm N seats`), Change Seats, Clear all seats.
- **Never:** the final Book, Book & Pay, Hold, payment, ticket issuance, or anything that creates a
  booking, reservation or PNR. This applies to NDC Admin, NDC Portal and the Air Cairo website.
- **Air Cairo website:** non-committing search and passenger-information forms may be submitted to reach
  the seat map. Stop at once if an action could create a booking, reservation or PNR. Do not assume it
  behaves like NDC.
- A case that needs an actual booking is **Blocked — Requires Booking (Strictly Prohibited)**.

## Execution rules

- One flight: the same flight number, date, route, cabin and passengers on all three platforms. No
  other flight is substituted without the human's approval.
- Group 01 runs first, then Setup Groups 04-10 (approved for this run the same way as for Oman Air). Groups 07 and 08 use the setups listed in 1c; PAX-008 needs an aircraft with 3-3 rows.
- NDC-only screens and behaviours are executed on Admin and Portal. The Air Cairo column is **N/A** where
  the airline site has no equivalent.
- Expected channel differences (currency, channel pricing, seats changing between captures) are not
  defects without supporting evidence.
- Evidence: screenshots and UI observations for visual checks. Data-level checks (seat descriptions,
  counts, price sums) for pricing, availability and passenger assignment. One screenshot per test case
  for this task, saved to `manual_execution/artifacts/` (task-specific exception to the
  findings-only screenshot rule).

IDs below omit the `TC-SM-` prefix.

## 1. Included — 49

### 1a. As written — 26 (Group 01)

RND-001, RND-002, RND-003, RND-005, RND-006 · STA-002, STA-004, STA-005, STA-006 · SEL-001, SEL-002,
SEL-003, SEL-006, SEL-007, SEL-008, SEL-009, SEL-010, SEL-012 · MPX-002, MPX-004 · PAX-004 · PER-001 ·
PER-007 (the read-only summary before the final Book; Book is never pressed) · NEG-003 · A11Y-001,
A11Y-002

### 1b. With a seat-only adjustment — 13

The adjustment applies to this execution only. The checklist stays as it is.

| Case | Setup | Adjustment |
|---|---|---|
| NAV-001 | 01 | Ignore "and a fare package" (Air Cairo: Bundle Not Supported). Check only that Select Seat is not available before step 2. |
| NAV-003 | 01 | Ignore the fare-package precondition. The expected title uses the selected flight's route and direction. |
| NAV-005 | 01 | Ignore "the booking can still be finished". Check the map closes, no one has a seat, and the price is unchanged. |
| MPX-007 | 01 | Ignore "the booking can still be finished". |
| PRC-002 | 01 | Ignore the Plus/Value comparison. A seat marked "Chargeable seat" must have a price on the one Air Cairo fare. |
| PRC-003 | 01 | Ignore "use the Value package". Check the Seat Selection line and that the amount rises by exactly the seat price. |
| PRC-003b | 01 | Ignore "use the Value package". Check per-seat and per-section prices against the colour key. |
| PAX-001 | 01 | Seat checks only: count reads 0 of 2, the child can be seated, the infant gets no seat. No meal or bag checks. |
| CNF-018 | 01 | Seats only: choose seats, Prev, edit one passenger field, Next. Check the seats survive or a warning appears. |
| RTP-005 | 09 | Seat charges per journey only. No base fare, tax or bundle line checks. |
| MCT-003 | 10 | Count seat maps only, one per flight with its own title. No meal or baggage counts. |
| MCT-007 | 10 | Seat maps per flight only, including both flights of the connecting journey. No fare-package, meal or baggage counts. |
| EXR-001 | 04 | Ignore "Economy 'Plus' package". |

### 1c. Needs an extra flight or setup — 10 (only after approval)

| Case | Setup |
|---|---|
| RND-007 | Second flight on a different aircraft type, kept separate from the primary comparison |
| RND-010, RTP-001, RTP-004, MPX-006 | 09 — return trip |
| EXR-003, EXR-004 | 05 — 1 adult + 1 child |
| EXR-002 | 06 — 1 adult + 1 infant |
| EXR-005 | 07 — 2 adults + 1 infant |
| PAX-008 | 08 — 2 adults + 2 infants, aircraft with 3-3 rows |

EXR-002 to EXR-005 and PAX-008: if the seat map allows the seat and the airline would only refuse it at
the final Book, the case is **Blocked — Requires Booking**.

## 2. Conditional — 0

CAB-001 and CAB-007 (Business cabin) are **Excluded** for Air Cairo: the checklist itself notes that Air Cairo sells Economy only ("No Business"), and no `business-cabin` rule is recorded for this supplier. If a Business cabin turns up on the chosen flight, it is reported as an observation and the two cases stay excluded unless the human approves them.

## 3. Excluded — 75 (Excluded — Out of Scope unless stated)

| Reason | # | Cases |
|---|---|---|
| Booking, post-booking, payment, hold, reports | 22 | CNF-001, 002, 003, 004, 007, 008, 010, 011, 012, 015, 016, 017 · MCT-004, MCT-005 · HLD-005 · PAH-002, 003, 004 · RPT-001, 002, 003, 004 |
| Bundle | 9 | NAV-002, PRC-001, BND-002, 003, 004, 005, 006, RTP-003, CAB-002 |
| Meals, baggage, other extras | 14 | PER-002, CAB-005, MCT-006, ML-001 to ML-006, BG-001, 002, 003, 005, 006 |
| Not about the seat map | 16 | NAV-002b, NAV-006, GEN-003, PER-004, NEG-006, PAX-003, 006, 007, FRC-001, 002, 003, 005, ERR-001, 002, 004, 005 |
| Pricing beyond the seat map | 2 | PRC-004, PRC-005 |
| Women-only seats — Not supported by supplier (no rule recorded) | 6 | STA-007, GEN-001, 002, 002b, 004, 005 |
| Expected result specific to another aircraft | 1 | CAB-004 |
| Package-dependent objective, not rewritten (human decision) | 1 | CAB-003 |
| Not approved at Review in the checklist | 2 | NEG-004, EXR-007 |
| Business cabin — Air Cairo sells Economy only | 2 | CAB-001, CAB-007 |

**Total: 49 + 0 + 75 = 124** — every checklist case once.

## Scope change — Air Cairo website (Ahmed Ayman, 2026-10-20)

On the Air Cairo website the seat map only opens after the site creates an order (the last passenger's
Confirm sends `POST /v2/purchase/orders`). The human decided: **creating an unpaid order (PNR) on the Air
Cairo website is allowed for this comparison**, so the airline-side cases can be completed there.

- Still never: Checkout, payment, ticket issuance, on any platform.
- Seats may be chosen on the Air Cairo website inside an unpaid order.
- NDC Admin and NDC Portal rules are unchanged: never the final Book, Book & Pay or Hold.
- Every order created is listed in the results (record locator, group, status).
