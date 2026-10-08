# Interim Admin Observations — run-008 (Ancillaries → Air Cairo NDC, Admin)

> **CORRECTION (tester feedback, 2026-09-30):** the tester repeated the failing scenarios by hand and **none of the booking errors appear manually** (`NDC-INT-TEC-A0001` "Invalid request", "Name or service not known", `exc.` "error while performing Operation"). Every failed submission in this run was produced by my scripted browser session and must be treated as **automation / stale-state artefacts, not product defects**. Causes named by the tester and confirmed by what I saw:
> - multiple endpoint calls were served from cached UI state across the long-lived tab;
> - a passenger-count conflict between the search (e.g. "1 Adult" when 3 were intended) and the booking's add-pax call;
> - the **"Select passenger" (load passenger data) button also appears on the Ancillaries page**, not only on Passenger Info, so my "still on step 1" checks that looked for that text were unreliable — the stepper status must be used.
> Consequences: the failed-booking tables below (A1–A4, B1–B2, C, YODSFA) are **not valid product evidence** except YODSFA (the supplier's own seat-restriction message). The Blocked cases must be rerun in a clean session per booking (full reload / new login, verify the "Passengers: N" header equals the search, wait for each call to finish). Seat-map, pricing and wizard-behaviour observations (which do not depend on a submission) are unaffected.

Status: **interim working notes**, not the Stage 4M results. Formal outcomes go to `ManualTestResults.csv`.

- Admin: `http://192.168.1.237`, logged in by the agent (headed). Branch used for lookup: `Uplift2_Mohanad Dawood (BRN298)`.
- Path: Booking-Mid Office → Search Booking (`/booking/search-booking`) → booking details (`/booking/booking-details/<order>`). The Dashboard search returned 0 for the run-007 PNR; Search Booking is the working list.

## Run-007 bookings as shown on Admin

| Order (suffix) | Airline PNR | Admin status | Ticket | Meal | Baggage | Seat | Total sales | Payment |
|---|---|---|---|---|---|---|---|---|
| ZYPK89 | 8ANO44 | Ticketed Document | 3812407236413 | SRV13 Hot Chicken Meal 520 | One Kilogram 95 | 1B 1,180 | 10,782.80 EGP | Wallet, Settled 10,782.80 |
| WVRKOR | 8BG3DU | Ticketed Document | 3812407236414 | SRV13 520 | One Kilogram 95 | none chosen | 9,602.80 EGP | Wallet, Settled 9,602.80 |
| SCZKR6, FCFOWG, JEMMLR, DNNRZI, 95GI1Y | none | Booking Failed | — | — | — | — | — | — |

## Reconciliation

- 8ANO44: 8,987.80 (1ADT) + 1,795.00 SSR (520 + 95 + 1,180) = 10,782.80. Matches Portal (run-007) exactly, including ticket number and wallet amount.
- 8BG3DU: 8,987.80 + 615.00 SSR (520 + 95) = 9,602.80. Received equals total.
- Deliberately failed Hold/Book attempts from run-007 show **Booking Failed** on Admin, with no payment.

## New Admin booking made in this run (Hold → Pay after Hold)

- Path: Booking-Mid Office → Booking; branch BRN298, agency AGN9809, agent Mohanad Dawood; CAI→JED, 15/10/2026, 1 adult, SM-475, credential `aircairo ndc test`.
- Passenger: Mr Admin TestAirCairo, document `A12345678` (Air Cairo rule: capital A + 8 digits, accepted).
- Ancillaries chosen: meal SRV13 520, One Kilogram Baggage 95, seat 3A 614 (window, chargeable).
- Pre-booking checks: fare breakdown 6,650 + 3,387.8 + 614 + 520 + 95 = 11,266.8 = Net Payable (Published Fare header rounds to 11,267). Wallet before: **647,245.8 EGP**.
- **Hold succeeded**: PNR **8ODF37**, order `AGN9809UPLUPLORD260930EXD2CE`, status Hold, last ticketing date 01-10-2026 00:00 (confirmation page).
- Admin booking details for the held order: On Hold, meal/baggage/seat 3A all present, Total Sales 11,266.80, Payment Details "No data has been found!" (nothing charged), Payment method "Not Available".
- Pay step: **not yet done**. Booking details offers only Time Limit and History; the Pay path in Admin still to be found.

## Admin wizard session: 2 ADT + 1 CHD + 2 INF, CAI→JED (interim evidence, not yet in the CSV)

Seat map (SM479, 16/10, 167 seats): drawn = total; all seat numbers unique; every seat chargeable and priced (236/614/1,180); window labels all at row edges; no Aisle labels exist; no exit rows. Travellers listed = 3 (infants excluded).
Seat selection: one click only opens the info panel (count stays 0/3); "Book 5A for AdultOne" names seat + first name; count/labels/charge update; auto-advance to next passenger; held seat says "selected for <full name>" and its book button reads "Assigned to another passenger" (disabled); 4 rapid clicks → 1 seat; moving a passenger frees the old seat; Clear all → 0/3, "No seat charges Free".
Pricing: Seat Selection its own line (+1,464); base 11,200 + tax 15,707 + seats 1,464 = 28,371; meal +520 and bag +95 each add and remove exactly; changing bag 95→3,068 replaces it; meal+bag+seat coexist (30,216).
Persistence: plain Prev→Next keeps everything. **Editing an adult's first name on step 1 then going forward wipes all seats/meals/bags (30,216 → 26,907, no ancillary line) and clears both infants' "Assigned to" links** (TC-SM-CNF-018 reproduced on Admin). add-pax took ~2 minutes to answer after the edit.
Console: `calcBaggagePrice` null-dereference ("Cannot read properties of null (reading 'baggageMetaData')") on every baggage change, as on Portal/flynas.
Exit rows: **absent from the seat map for a party that includes an infant or child** (SM475 with 5 pax: 156 seats, rows 12–13 missing; lone-adult map earlier had 169 seats incl. exit 13A "Seat not allowed for infant").

### Hold with infants: fails, and not because of the seat set
| Order suffix | Party / seats | Result |
|---|---|---|
| DEQ42I | 2ADT+1CHD+2INF, SM479 16/10, 5A/5B/7A (adults in one set) | Failed: NDC-INT-TEC-A0001 "Invalid request. Please check the request parameters" |
| VWGWKQ | same party, SM475 15/10, 5A/7A/9A (adults in different rows) | Failed, identical error |
| AKNVLG | retry of DEQ42I, exact same criteria | Failed, identical error |
Failed orders show Booking Failed with 0.00 payable and no payments. **Because the control with separated seats fails the same way, the rejection cannot be attributed to the infant-holder seat-set rule (TC-SM-PAX-008), and the same doubt applies to run-007's "rule enforced at Hold/Book" reading.** Next isolation step: same flow with no infants, then with one infant.

### Isolation run: 2 ADT + 1 CHD, no infants (SM479, 16/10)
- Seat map without infants: **179 seats incl. 12 exit seats** (rows 12–13, labelled "Seat not allowed for infant"); with infants in the party the exit rows are removed (156–167 seats).
- Hold attempt 1 (5A/5B/7A, meal+bag each, 23,972.4 EGP): **Failed, "Name or service not known"** (order `…1ZLKEM`) — a name-resolution/connectivity error, not the A0001 error seen with infants.
- Hold attempt 2 (fresh flow, 9A/9B/11A): **Failed, same "Name or service not known"** (order `…FLCZBL`).
- Seats 5A/5B/7A were no longer offered on the second flow: earlier failed/held attempts appear to leave seats taken at the supplier.
- Result: **inconclusive** — the environment stopped resolving a host at booking time, so the "infants are the cause" question is not yet answered. The single-adult Hold at 10:31 (PNR 8ODF37) worked earlier the same day.

### Later in the session (fresh login 11:29)
- PAX-008 scenario retried once more from the clean session (adults on 1A/1B): Failed again with A0001 (`…8XTQAT`). Per the tester, this case is known to always fail on submission (supplier rule); scored as: UI does not block the second seat in the set (Failed on the seat map), submission rejected (expected). The infant isolation run was stopped at the tester's request.
- Lone adult on SM475 15/10 (`…BGDIUD`): seat map 168 seats, exit rows 12–13 present (12 seats, all "Exit or emergency exit seat" + "Seat not allowed for infant", contiguous). **TC-SM-EXR-001: lone adult booked exit seat 12A (EGP 1,180) with no restriction — Passed.** Pre-booking snapshot: base 6,650 + tax 3,387.8 + seat 1,180 + meal 520 + bag 95 = 11,832.8 (header shows 11,833). Confirm-booking dialog appears before Book.
- **Book failed**: Order Details "error while performing Operation,please contact admin", History error code `exc.`, status Booking Failed, 0.00 payable, no payment row, wallet untouched. The confirmation page still itemises the failed order's lines (seat 12A, meal, baggage, fare details, 11,832.8).
- Exit seat wording differs from the sheet's known list ("Exit or emergency exit seat", "Seat not allowed for infant").
- Booking-dependent cases (CNF-001..012, ML-005, BG-005, PAH-002..004, HLD wallet checks, RPT-*) are blocked until a Book/Hold succeeds again. Last successful Hold: 8ODF37 at 10:31 (lone adult, non-exit seat).

## Observations to judge (not yet scored)

- **Time Limit dialog shows N/A for Latest Ticketing Time, True Last Date To Ticket and Vendor Time Limit** on held order 8ODF37, while the Hold confirmation page states last ticketing date 01-10-2026 00:00.

1. **Total Booking Amount vs Total Sales/Net differ by 0.20 EGP** on both bookings (10,783.00 vs 10,782.80; 9,603.00 vs 9,602.80). Likely display rounding; needs a decision on whether it is a defect.
2. **Booking Information shows "Payment method: Cash"** while Payment Details show **Wallet, Settled**.
3. **The "Supplier" field in Booking Information appears empty** in the extracted text.
