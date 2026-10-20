# Manual Execution Results — Air Cairo Seat Map comparison (all setups)

## 1. Execution Metadata

| | |
|---|---|
| Run | `ancillaries-run-008__2026-10-20_11-04-53__Targeted__Ancillaries-AirCairo-SeatMapComparison` |
| Scope | Ancillaries / Air Cairo (`air-sm-cairo`), Seat Map only — [ApprovedScope.md](../metadata/ApprovedScope.md) (approved by Ahmed Ayman, 2026-10-20) |
| Platforms | NDC Admin `http://192.168.1.237` · NDC Portal `http://192.168.1.237:9500` · Air Cairo website `https://aircairo.com/en-eg/` (reference) |
| Environment | NDC Staging, calling the supplier's Production through credential **AIRCairo Production (Warning)** |
| Admin entry | Branch NDC1_Ahmed Ayman (BRN287) → Agency NDC1_Ahmed Ayman (AGN9799) → Agent Ahmed Ayman |
| Portal login | Agency AGN9799 |
| Primary flight (same on all three) | **SM 475**, CAI 06:05 → JED 09:10, Tue 10 Nov 2026, non-stop, one-way, Economy, A320. Fare: NDC offers only **ECO FLEX** (EGP 49,342); the airline site was used with **PROMOTIONAL** (EGP 20,526.40) — same flight and aircraft |
| Passengers | Group 01: Mr Seatmap Testadult (15/05/1990), Ms Seatmap Testchild (10/03/2018), Ms Seatmap Testinfant (20/02/2026, linked to the adult). Groups 04-08: Alpha / Bravo (adults), Charlie (child), Delta / Echo (infants), last name Seatmaptest. Groups 09-10: Seatmap Testadult + Testchild. Dummy data |
| Setup Groups | 01 · 04 · 05 · 06 · 07 · 08 (SM 475) · 09 (return SM 471 + SM 472) · 10 (multi-city SM 475 / SM 472 / SM 20 ATR) |
| Method | Manual, browser tool (`playwright-ancillaries`), Headed, 1920 px. Runner-only exception extended by the human to this comparison. Runner not executed |
| Executed | 2026-10-20, by Claude Code |

## 2. Execution Summary

Checklist total **124**. Excluded **75**. Executable scope **49**: **48 executed** on both NDC Admin and NDC Portal, **1 Not Executed** (MCT-007 — no connecting journey offered).

| Result (each case, Admin and Portal) | Count |
|---|---|
| Passed | 40 |
| Failed | 6 |
| Inconclusive | 1 |
| Blocked (Requires Booking) | 1 |
| Not Executed | 1 |
| Excluded | 75 |

Admin and Portal gave the **same result** on every executed case. Only difference in detail: CNF-018 (D2).
Pass rate on executed cases: **83.3%** (40 of 48).

**Air Cairo website:** its seat map only opens after the site creates an order. After the human allowed unpaid orders, the airline side was executed for Groups 01 and 04-09 (9 unpaid orders, none paid, see section 7). Group 10 could not be created by the airline.

## 3. Per-Test Results

Air Cairo column: values from the airline's own seat map and behaviour (`GET api-des.aircairo.com/v2/shopping/seatmaps/by-order` and the airline UI, on unpaid orders). **N/A** where the airline site has no equivalent.

| Test Case ID | Title | Status | NDC Admin — actual result | NDC Portal | Air Cairo website | Evidence |
|---|---|---|---|---|---|---|
| TC-SM-NAV-001 | You can only pick seats on step 2 | Passed | Two steps only: 01 Passenger Info, 02 Ancillaries. Select Seat appears only on step 2. (Seat-only adjustment: fare-package wording ignored.) | Same as Admin (identical values) | N/A: airline flow is Flight > Passengers > (order created) > Extra services; no equivalent wizard | Observed values in text |
| TC-SM-NAV-003 | 'Select Seat' opens the seat map | Passed | Map opens full width (1920 of 1920 px), title 'Seat Map · CAI → JED · Onward'; left panel, seat chart, colour key and bottom button present. | Same as Admin (identical values) | Comparable: airline seat map for SM 475 CAI-JED opens from the cart's "Select your seats" (only after the order exists) | manual_execution/artifacts/admin/G01_seatmap_rows11-14_no_exit_rows.png |
| TC-SM-NAV-005 | You can skip seats completely | Passed | 'Continue without seats' closes the map, nobody has a seat, total stays 49,342, opener stays 'Select Seat'. | Same as Admin (identical values) | Match: the airline seat step is optional - the cart keeps no seats until "Select your seats" is used | Observed values in text |
| TC-SM-RND-001 | The seat total matches the seats you can see | Passed | Left panel SEATS 168 = 168 seat buttons on the map. | Same as Admin (identical values) | DIFFERENT: airline returns 180 seats (168 available + 12 exit seats blocked for this party); NDC shows 168 (rows 12-13 missing) | manual_execution/artifacts/admin/seatmap_SM475_response.json, manual_execution/artifacts/aircairo-web/seatMap_SM475_G01_byorder_raw.json |
| TC-SM-RND-002 | Every seat has one clear state and one seat number | Passed | 168 seats, one state each (all 'available for EGP x'), no duplicate seat numbers, no seat without a state. | Same as Admin (identical values) | Comparable: airline 168 "available" + 12 "blocked" = 180 | manual_execution/artifacts/admin/seatmap_SM475_normalized.json |
| TC-SM-RND-003 | Every seat has a full description | Passed | Every description is filled: e.g. 'Seat 5A, row 5, Left side, cabin1, Window seat, available for EGP 1,071'; printed letter matches the description. Seats with no feature show an empty slot (', ,') - accepted (aisle label not sent; human decision: normal). | Same as Admin (identical values) | N/A: no seat action on the airline site (the seat map there only opens after a booking exists) | manual_execution/artifacts/admin/seatmap_SM475_normalized.json |
| TC-SM-RND-005 | Cabin and section information agrees with the map | Passed | Colour key: Economy from EGP 268. Map sections CABIN1 rows 1-10, CABIN2 rows 11-20, CABIN3 rows 21-30, all Economy 3-3. One cabin, one deck. Section names are the raw ids (cabin1/2/3). | Same as Admin (identical values) | Match: airline one cabin, Economy | manual_execution/artifacts/admin/G01_seatmap_rows11-14_no_exit_rows.png |
| TC-SM-RND-006 | The flight shown on the map is the flight you chose | Passed | Map: CAI → JED, SM475 · 320, departs Tue Nov 10 2026 06:05, arrives 09:10 = the flight chosen. Airline: SM 0475, aircraft 320 (A320, config 32A). | Same as Admin (identical values) | Match: airline SM 0475, aircraft 320 (AIRBUS A320, config 32A) | manual_execution/artifacts/admin/seatmap_SM475_response.json, manual_execution/artifacts/aircairo-web/seatmap_SM475_G01_normalized.json |
| TC-SM-RND-007 | Two different flights give two different maps | Passed | Two aircraft types from the Group 10 search: SM475 (320, 180 seats, rows 1-30, 3-3) and SM20 CAI→HRG (ATR, 44 seats, rows 5-15, 2-2). The maps differ and each matches its own aircraft. | Same as Admin (identical values) | Not reachable on the airline (multi-city order refused); NDC evidence only | manual_execution/artifacts/portal/seatmap_G10_multicity.json |
| TC-SM-RND-010 | Each flight in a trip gets its own map | Passed | Group 09 return trip SM 471 (10 Nov) + SM 472 (17 Nov), 1 adult + 1 child: two maps, "CAI → JED · Onward" (SM471 · 320, 180 seats) and "JED → CAI · Return" (SM472 · 320, 180 seats). (SM 475 is not offered as a return combination in NDC.) | Same as Admin (identical values) | Match: return SM 471 + SM 472 (order 9WFFWZ) - two maps, "Cairo - Jeddah" (ST1) and "Jeddah - Cairo" (ST2), A320, 180 seats each | manual_execution/artifacts/portal/TC-SM-RTP-005_MPX-006_summary.png, manual_execution/artifacts/aircairo-web/seatMap_G09_return_SM471.json, manual_execution/artifacts/aircairo-web/seatMap_G09_return_SM472.json |
| TC-SM-STA-002 | A taken seat can be looked at but not booked | Inconclusive | No taken seat exists on this flight at capture time: all 168 seats NDC shows are available (airline: 168 available + 12 exit seats blocked for this party, which NDC does not show at all). The 'Blocked / Seat unavailable' box cannot be opened. | Same as Admin (identical values) | Airline has no taken seat either; only the 12 exit seats are "blocked" for this party | manual_execution/artifacts/admin/seatmap_SM475_normalized.json, manual_execution/artifacts/aircairo-web/seatmap_SM475_G01_normalized.json |
| TC-SM-STA-004 | Seat features use known wording | Passed | Feature words seen: 'Window seat' (56), 'Leg space seat' (6). Both are on the known list. Nothing unknown. | Same as Admin (identical values) | Airline codes: CH, W, A, L, E, 1, 1A, 1B, 1C, IE | manual_execution/artifacts/admin/seatmap_SM475_normalized.json |
| TC-SM-STA-005 | Window and aisle labels match where the seat really is | Passed | Window seat only on A and F (60 seats), matching the 3-3 layout and the airline's W code. Aisle seats (C/D) carry no label in NDC while the airline marks 60 seats 'A' - human decision: normal, not a defect. | Same as Admin (identical values) | Window: match (60 W on A/F). Aisle: airline marks 60 seats "A", NDC none - human decision: normal | manual_execution/artifacts/admin/seatmap_SM475_normalized.json, manual_execution/artifacts/aircairo-web/seatmap_SM475_G01_normalized.json |
| TC-SM-STA-006 | Emergency exit seats are marked | Failed | Exit seats are not marked anywhere. Group 04 (lone adult) shows rows 12-13 (12 seats); their descriptions read only "Seat not allowed for infant, Window seat" - no "Exit and emergency exit", no exit word on the map, box or key. Group 01 (adult + child + infant) does not show rows 12-13 at all. | Same as Admin (identical values) | DIFFERENT: the airline labels 12A-13F "Exit row seat", shows "Exit row eligibility" (15+ years, physically fit, English, no mobility restriction, willing to assist) and asks "Acknowledge and select seat"; the legend has "Emergency exit" | manual_execution/artifacts/portal/TC-SM-EXR-001_STA-006_12A.png, manual_execution/artifacts/admin/seatmap_SM475_G04_1adult.json, manual_execution/artifacts/aircairo-web/seatmap_SM475_G01_normalized.json, manual_execution/artifacts/aircairo-web/seatMap_SM475_G04_1adult.json, manual_execution/artifacts/aircairo-web/G04_exit12A_cart.png |
| TC-SM-SEL-001 | One click only shows the seat - it does not book it | Passed | One click on 5A opens its box; count stays 0/2, cards show no seat, bottom button 'Continue without seats'. | Same as Admin (identical values) | Match: one click opens a box (seat, price, passenger, features, "Select seat"); nothing selected, no request | Observed values in text (Passed case - no screenshot) |
| TC-SM-SEL-002 | A seat is only taken when you press the button in the box | Passed | Button reads 'Book 5A for Seatmap' (the first name). After pressing: count 1/2, adult card '5A Economy EGP 1,071', seat 'selected for Seatmap Testadult'. | Same as Admin (identical values) | Match: "Select seat" → passenger panel "5A - EGP1,071.00", seat "selected for passenger Seatmap Testadult". The button is generic ("Select seat"); the box names the passenger | Observed values in text (Passed case - no screenshot) |
| TC-SM-SEL-003 | The seat information box is correct | Passed | Box: 'Available paid · Seat 5A · EGP 1,071 per passenger · Economy · Main deck · Left side (against the window wall, seat A) · Window seat · Row 5, 5th of 10 rows in cabin1 · Front of this deck'; agrees with the seat description and the airline price (1,071). | Same as Admin (identical values) | Match: box "Seat 5A · EGP1,071.00 · Seatmap Testadult with (Se Testinfant) · Window seat · Chargeable Seat" | Observed values in text (Passed case - no screenshot) |
| TC-SM-SEL-006 | The bottom button changes as seats are chosen | Passed | Bottom button: 'Continue without seats' → 'Confirm 1 of 2 seats' → 'Confirm 2 seats'; 'Clear all seats' next to it; total counts 2 (infant not counted); cards show ACTIVE / SELECT / SELECTED / ASSIGNED. | Same as Admin (identical values) | Different UI, same idea: the airline shows the passenger panel and "Clear selection" / "Confirm" (no seat counter on the button) | Observed values in text (Passed case - no screenshot) |
| TC-SM-SEL-007 | Moving a passenger to another seat frees the first seat | Passed | Adult moved 5A → 6A: adult holds only 6A, 5A back to 'available for EGP 1,071', count still 2/2. | Same as Admin (identical values) | Match: adult 5A → 6A frees 5A | Observed values in text (Passed case - no screenshot) |
| TC-SM-SEL-008 | 'Clear all seats' also removes the seat charge | Passed | In the map: Clear all → 0/2, 'Continue without seats', 'No seat charges / Free', no seat held. After a confirmed 1,339 seat charge: Change Seats → Clear all → Continue → total back to 49,342 and the Seat Selection line is gone. | Same as Admin (identical values) | Match: "Clear selection" empties both passengers | Observed values in text (Passed case - no screenshot) |
| TC-SM-SEL-009 | Confirming saves the seat and closes the map | Passed | Confirm closes the map; step 2 'Selected seats 2 travellers': Seatmap Testadult 6A EGP 1,071, Seatmap Testchild 5B EGP 268; opener 'Change Seats'; breakdown 'Seat Selection + 1,339'. No request on Confirm. | Same as Admin (identical values) | Match: Confirm (POST purchase/orders/{id}/seats) → cart "2/2 seats selected", 6A EGP1,071 · 5B EGP268, "Total price for seats EGP1,339", "Modify" | manual_execution/artifacts/admin/TC-SM-SEL-009_PRC-003_PER-007_PAX-001.png, manual_execution/artifacts/portal/TC-SM-SEL-009_PRC-003_PER-007_PAX-001.png, manual_execution/artifacts/aircairo-web/G01_cart_price_details.png |
| TC-SM-SEL-010 | 'Change Seats' reopens the map with your choice still there | Passed | Change Seats reopens the map: 6A and 5B still held, count 2/2, cards show the seats. | Same as Admin (identical values) | Match: "Modify" reopens the map with 6A / 5B held | Observed values in text (Passed case - no screenshot) |
| TC-SM-SEL-012 | A seat held by another passenger in your booking is marked | Passed | With the child active, 5A shows 'selected for Seatmap Testadult' and offers no Book button. | Same as Admin (identical values) | Match: with the child active, 5A names Seatmap Testadult and offers no Select button | Observed values in text (Passed case - no screenshot) |
| TC-SM-MPX-002 | The seat goes to the passenger who is selected | Passed | Adult active → 5A to the adult; child became active → 5B to the child ('Book 5B for Seatmap'); adult keeps 5A; count '2 / 2 All assigned'. | Same as Admin (identical values) | Match: 5B to the child, the adult keeps 5A | Observed values in text (Passed case - no screenshot) |
| TC-SM-MPX-004 | Two passengers cannot have the same seat | Passed | The child cannot take the adult's 5A: 'selected for Seatmap Testadult', no Book button. | Same as Admin (identical values) | Match: the child cannot take 5A | Observed values in text (Passed case - no screenshot) |
| TC-SM-MPX-006 | Seats on one flight do not affect the other flight | Passed | Return map started empty; choosing 5A on the return did not disturb the outbound 5A (reopened: still held, 1/2); the summary lists each journey separately ("Selected seats 1 traveller" twice, the second under JED-CAI Return). | Same as Admin (identical values) | Match: 5A on the return did not disturb the outbound 5A; the cart lists "Cairo to Jeddah 1/2" and "Jeddah to Cairo 1/2" | manual_execution/artifacts/admin/TC-SM-RTP-005_MPX-006_summary.png, manual_execution/artifacts/portal/TC-SM-RTP-005_MPX-006_summary.png, manual_execution/artifacts/aircairo-web/G09_return_cart_seats.png |
| TC-SM-MPX-007 | Some passengers can have seats and others none | Passed | Adult only (6A): 'Confirm 1 of 2 seats' allowed; summary '1 traveller'; total 49,342 → 50,413; opener 'Seat 1 more'. (Seat-only adjustment: booking completion not checked.) | Same as Admin (identical values) | Match: one seat only (Deselect 5B, Confirm) → seats EGP1,071, total 20,127.40 | Observed values in text (Passed case - no screenshot) |
| TC-SM-PRC-002 | A seat marked 'Chargeable seat' must always have a price | Passed | All 168 seats carry a price (268 / 804 / 1,071 / 1,607); none reads Free. NDC sends no 'Chargeable seat' word; the airline marks all 180 seats CH. (Seat-only adjustment: one fare.) | Same as Admin (identical values) | Match: airline marks all 180 seats CH (Chargeable) and prices every one | manual_execution/artifacts/admin/seatmap_SM475_normalized.json, manual_execution/artifacts/aircairo-web/seatmap_SM475_G01_normalized.json |
| TC-SM-PRC-003 | A paid seat is added as its own line in the price | Passed | Breakdown gains '(+) Ancillaries & SSR 1,339 / Seat Selection + 1,339'; total 49,342 → 50,681 = +1,071 + 268. | Same as Admin (identical values) | Match: cart 19,056.40 → 20,395.40 (+1,339); price details show a separate "Extra services 1,339" line | manual_execution/artifacts/admin/TC-SM-SEL-009_PRC-003_PER-007_PAX-001.png, manual_execution/artifacts/aircairo-web/G01_cart_price_details.png |
| TC-SM-PRC-003b | One aircraft can have several seat prices at once | Passed | Four prices on one aircraft: middle B/E 268, aisle C/D 804, window A/F 1,071, row 1 all 1,607. Every section header 'from EGP 268' = its cheapest seat. Same prices as the airline, seat by seat. | Same as Admin (identical values) | Match seat by seat: same four prices on the same 168 seats (268 / 804 / 1,071 / 1,607 EGP) | manual_execution/artifacts/admin/seatmap_SM475_normalized.json, manual_execution/artifacts/aircairo-web/seatmap_SM475_G01_normalized.json |
| TC-SM-PER-001 | Seats survive going back a step | Passed | Prev then Next without editing: 6A/5B, 'Change Seats', total 50,681 unchanged; no request sent. | Same as Admin (identical values) | N/A: no seat action on the airline site (the seat map there only opens after a booking exists) | Observed values in text (Passed case - no screenshot) |
| TC-SM-PER-007 | The seat appears on the payment summary | Passed | Payment Details: Net Payable 50,680.4 EGP; breakdown 'Seat Selection + 1,339'; both seats listed. Book, Hold and Save Quote are on the page - none pressed (wallet blocked). | Same as Admin (identical values) | N/A: no seat action on the airline site (the seat map there only opens after a booking exists) | manual_execution/artifacts/admin/TC-SM-SEL-009_PRC-003_PER-007_PAX-001.png, manual_execution/artifacts/portal/TC-SM-SEL-009_PRC-003_PER-007_PAX-001.png |
| TC-SM-NEG-003 | Clicking quickly does not book two seats | Passed | Fast double click on 'Book 7A for Seatmap': adult holds only 7A, count stays 2/2, no duplicate. | Same as Admin (identical values) | Match: fast double click on "Select seat" keeps one seat (7A) | Observed values in text (Passed case - no screenshot) |
| TC-SM-A11Y-001 | The seat map works on a smaller screen | Passed | At 1280x720: left panel visible, page width 1280 = viewport (no sideways scroll), last seat 30F reachable and booked. Viewport restored to 1920x945. | Same as Admin (identical values) | N/A: no seat action on the airline site (the seat map there only opens after a booking exists) | manual_execution/artifacts/admin/TC-SM-A11Y-001_1280x720.png |
| TC-SM-A11Y-002 | Seat states can be read by screen readers | Passed | Every seat is a button with a description ending 'available for EGP x' or 'selected for <full name>'; Book button names seat and passenger ('Book 5A for Seatmap'). No taken seat existed to check the 'unavailable' wording. | Same as Admin (identical values) | Comparable: seats are buttons "Seat 5A Window seat…"; held seats "selected for passenger <name>"; unavailable exit seats are plain cells, not buttons | Observed values in text (Passed case - no screenshot) |
| TC-SM-PAX-001 | Infants get no seat and no extras; children get both | Passed | 3 passengers, count 0/2; child seated (5B); summary '2 travellers'; step 2 lists only Seatmap Testadult and the child - the infant appears nowhere. (Seat-only adjustment.) | Same as Admin (identical values) | Match: 2 seat holders (adult "with (infant)" and child); the infant has no seat | manual_execution/artifacts/admin/TC-SM-SEL-009_PRC-003_PER-007_PAX-001.png |
| TC-SM-PAX-004 | The map moves on to the next passenger automatically | Passed | After the adult's seat the child became ACTIVE automatically; adult card SELECTED when active, ASSIGNED when not. | Same as Admin (identical values) | Match: after the adult's seat the child becomes the active passenger | Observed values in text (Passed case - no screenshot) |
| TC-SM-EXR-001 | An adult travelling alone CAN take an exit seat | Passed | Group 04 (1 adult, Alpha). 180 seats shown; exit seat 12A "available for EGP 1,607", "Book 12A for Alpha" → booked, "selected for Alpha Seatmaptest", 1/1. (Seat-only adjustment: "Plus" package ignored.) | Same as Admin (identical values) | Match: lone adult (order 9W6REH) - all 12 exit seats available; 12A booked into the order (EGP1,607) after "Acknowledge and select seat" | manual_execution/artifacts/portal/TC-SM-EXR-001_STA-006_12A.png, manual_execution/artifacts/admin/seatmap_SM475_G04_1adult.json, manual_execution/artifacts/portal/seatmap_SM475_G04_1adult.json, manual_execution/artifacts/aircairo-web/seatMap_SM475_G04_1adult.json, manual_execution/artifacts/aircairo-web/G04_exit12A_cart.png |
| TC-SM-EXR-002 | An adult with an infant CANNOT take an exit seat | Passed | Group 06 (1 adult + 1 infant linked to him): rows 12-13 are not on the map at all (168 seats), so the infant-holding adult cannot take an exit seat. Finding: no explanation - the rows are simply empty gaps (the sheet says a bare refusal is worth reporting). | Same as Admin (identical values) | Match in outcome: adult + infant (order 9W9ZS8) - exit seats "blocked" for that adult; NDC hides the rows instead | manual_execution/artifacts/portal/TC-SM-EXR-002_rows12-13_hidden.png, manual_execution/artifacts/aircairo-web/seatMap_SM475_G06_adult_infant.json |
| TC-SM-EXR-003 | A child CANNOT take an exit seat | Failed | Group 05 (1 adult + 1 child): 180 seats shown. With the child active, exit seat 12A is "available for EGP 1,607" with "Book 12A for Charlie"; pressing it gives the child the exit seat ("selected for Charlie Seatmaptest", 1/2). The supplier response marks every seat eligible for both passengers. | Same as Admin (identical values) | DIFFERENT: adult + child (order 9WB835) - exit seats "blocked" for the child (12B is a plain cell), available for the adult | manual_execution/artifacts/admin/TC-SM-EXR-003_EXR-004_child.png, manual_execution/artifacts/portal/TC-SM-EXR-003_EXR-004_child.png, manual_execution/artifacts/admin/seatmap_SM475_G05_adult_child.json, manual_execution/artifacts/aircairo-web/seatMap_SM475_G05_adult_child.json, manual_execution/artifacts/aircairo-web/G05_child_exit_blocked.png |
| TC-SM-EXR-004 | The rule is rechecked when you switch passenger | Failed | Group 05: 12A shows "Book 12A for Alpha" for the adult and stays "available" with "Book 12A for Charlie" after switching to the child. The seat does not change with the passenger. | Same as Admin (identical values) | DIFFERENT: on the airline the same 12B is "Exit row seat" for the adult and not selectable for the child | manual_execution/artifacts/admin/TC-SM-EXR-003_EXR-004_child.png, manual_execution/artifacts/portal/TC-SM-EXR-003_EXR-004_child.png, manual_execution/artifacts/aircairo-web/G05_child_exit_blocked.png |
| TC-SM-EXR-005 | The rule follows the infant's linked adult | Failed | Group 07 (2 adults + 1 infant linked to Alpha): 180 seats shown, exit rows included. 12A is bookable for BOTH Alpha (who holds the infant) and Bravo; Alpha booked it ("selected for Alpha Seatmaptest"). No refusal exists, so it cannot follow the infant link (relinking changes nothing). | Same as Admin (identical values) | DIFFERENT: 2 adults + 1 infant (order 9WA42H) - exit seats blocked for Alpha (holds the infant), available for Bravo: the rule follows the link | manual_execution/artifacts/admin/TC-SM-EXR-005_linkAlpha.png, manual_execution/artifacts/portal/TC-SM-EXR-005_linkAlpha.png, manual_execution/artifacts/admin/seatmap_SM475_G07_2adults_infant.json, manual_execution/artifacts/aircairo-web/seatMap_SM475_G07_2adults_infant.json |
| TC-SM-RTP-001 | A return trip gives one seat map per journey | Passed | Two "Select Seat" buttons, one per journey; each map titled with its own direction (Onward / Return) and its own flight and aircraft. | Same as Admin (identical values) | Match: one map per journey ("Next flight" moves from ST1 to ST2) | manual_execution/artifacts/portal/TC-SM-RTP-005_MPX-006_summary.png |
| TC-SM-RTP-004 | Seat maps are completely separate per journey | Passed | After 5A confirmed on the outbound, the return map opened with nothing chosen (0/2), and 5A still "available for EGP 1,071" there; only the outbound button changed ("Seat 1 more"). | Same as Admin (identical values) | Match: the return map opens empty and 5A is still offered there | manual_execution/artifacts/admin/TC-SM-RTP-005_MPX-006_summary.png, manual_execution/artifacts/portal/TC-SM-RTP-005_MPX-006_summary.png |
| TC-SM-MCT-003 | Three journeys give three seat maps and three sets of ancillaries | Passed | Group 10 multi-city CAI→JED (10 Nov, SM 475), JED→CAI (14 Nov, SM 472), CAI→HRG (17 Nov, SM 20), 1 adult + 1 child: 3 "Select Seat" buttons, maps titled Trip 1 / Trip 2 / Trip 3, each with its own route and aircraft. (Seat-only adjustment: meal and bag counts removed.) | Same as Admin (identical values) | Not reachable: the airline could not create the multi-city order twice ("UNABLE TO CREATE ORDER"), so its seat maps never opened | manual_execution/artifacts/portal/seatmap_G10_multicity.json |
| TC-SM-MCT-007 | Seat maps follow FLIGHTS, fare packages follow JOURNEYS | Not Executed | No connecting journey available: the NDC multi-city search returned 200 options, all non-stop on every leg, so a journey with two flights (fewer fare packages than seat maps) could not be built on this route. | - | - | manual_execution/artifacts/portal/seatmap_G10_multicity.json |
| TC-SM-RTP-005 | Seat and ancillary charges should be identifiable per journey | Failed | Known fault reproduced (seat-only form). 5A outbound (1,071) + 5A return (1,071): the price breakdown shows ONE merged line "Seat Selection + 2,142"; nothing says what each journey's seats cost. Only the "Selected seats" list per journey shows it. | Same as Admin (identical values) | Same as NDC: the cart lists seats per journey, but the total and "Price details" merge them ("Extra services EGP2,142") | manual_execution/artifacts/admin/TC-SM-RTP-005_MPX-006_summary.png, manual_execution/artifacts/portal/TC-SM-RTP-005_MPX-006_summary.png, manual_execution/artifacts/aircairo-web/G09_return_cart_seats.png |
| TC-SM-CNF-018 | Going back a step must not silently throw away seats and ancillaries | Failed | Seats 6A/5B confirmed (50,681). Prev, child last name Testchild → Testchildx, Next: seats silently discarded (no warning), total 49,342, AND step 2 came back EMPTY - no meals, baggage or Select Seat - while Book / Hold stayed on the page; no add-pax was sent, so the edited name was not passed on. A second Prev → Next sent add-pax + ssr-quote + seat-map and the Ancillaries section returned, seats gone. | Same fault, one difference: after the edit the first Next DID send add-pax + ssr-quote; step 2 still came back with no meals, bags or Select Seat; a second Prev → Next restored the section with no seats. | N/A: no seat action on the airline site (the seat map there only opens after a booking exists) | manual_execution/artifacts/admin/TC-SM-CNF-018.png, manual_execution/artifacts/admin/TC-SM-CNF-018_after_edit.png, manual_execution/artifacts/portal/TC-SM-CNF-018_after_edit.png |
| TC-SM-PAX-008 | Two infant-holding adults cannot sit in the same set of seats | Blocked — Requires Booking | Blocked — Requires Booking (Strictly Prohibited). Group 08 (2 adults, each with an infant): 168 seats (exit rows hidden). After Alpha takes 5A, Bravo is still offered 5B and 5C (same seat set ABC) as well as 5D and 6A, all "Book … for Bravo" enabled. Whether the airline refuses it at the final Book cannot be checked without booking (approved scope rule). | Same as Admin (identical values) | Airline refuses on save: 2 adults + 2 infants (order 9WAXR5), Alpha 5A + Bravo 5B → POST seats returned "SEATS NOT RESERVED - THE OXYGEN MASK QUOTA HAS BEEN EXCEEDED FOR THE TARGETED BLOCK"; screen "Sorry, your seat selection couldn't be saved". The airline map itself offers 5B / 5C | manual_execution/artifacts/portal/TC-SM-PAX-008.png, manual_execution/artifacts/aircairo-web/G08_PAX-008_bravo.png, manual_execution/artifacts/aircairo-web/G08_PAX-008_after_confirm.png, manual_execution/artifacts/aircairo-web/seatMap_SM475_G08_2adults_2infants.json |

### Excluded (75)

| Test Case ID | Title | Reason |
|---|---|---|
| TC-SM-NAV-002 | You cannot reach the seats without choosing a fare package | Bundle |
| TC-SM-NAV-002b | Missing passenger details and a missing fare package are both reported | Not about the seat map |
| TC-SM-STA-007 | Women-only seats are marked clearly | Not supported by supplier: no women-only seat rule for Air Cairo |
| TC-SM-PRC-001 | A seat included in the fare package costs nothing | Bundle |
| TC-SM-PRC-004 | The price breakdown adds up | Pricing beyond the seat map |
| TC-SM-BND-002 | Changing the fare package recalculates the seats | Bundle |
| TC-SM-BND-003 | Each flight uses its own fare package | Bundle |
| TC-SM-BND-004 | Fare package names are never blank or repeated | Bundle |
| TC-SM-BND-005 | What the package promises about seats is what you get | Bundle |
| TC-SM-GEN-001 | A women-only seat is refused to a male passenger | Not supported by supplier: no women-only seat rule for Air Cairo |
| TC-SM-GEN-002 | A women-only seat is offered to a female passenger | Not supported by supplier: no women-only seat rule for Air Cairo |
| TC-SM-GEN-002b | The hidden seat data matches what is shown on screen | Not supported by supplier: no women-only seat rule for Air Cairo |
| TC-SM-GEN-003 | Gender comes from the title and cannot be edited | Not about the seat map |
| TC-SM-GEN-004 | Each passenger sees their own seats in a mixed group | Not supported by supplier: no women-only seat rule for Air Cairo |
| TC-SM-GEN-005 | Female titles are 'Ms' and 'Mrs', for children as well as adults | Not supported by supplier: no women-only seat rule for Air Cairo |
| TC-SM-PER-002 | Seats, meals and bags all work together | Meals, baggage or other extras |
| TC-SM-PER-004 | What happens when the time limit runs out | Not about the seat map |
| TC-SM-NEG-004 | Two agents choosing the same seat at the same time | Not approved at Review in the checklist |
| TC-SM-NEG-006 | Opening the booking page with a broken or missing link | Not about the seat map |
| TC-SM-CAB-001 | The same flight gives a different map in each cabin | Business cabin - Air Cairo sells Economy only |
| TC-SM-CAB-002 | The fare package decides WHICH seats are offered, not only their price | Bundle |
| TC-SM-CAB-003 | 'Not offered' sections can be told apart from single taken seats | Package-dependent objective, not rewritten (human decision) |
| TC-SM-CAB-004 | The Business row has its middle seats blocked | Expected result specific to another aircraft |
| TC-SM-CAB-005 | Packages, meals and bags change with the cabin | Meals, baggage or other extras |
| TC-SM-CAB-007 | A two-cabin aircraft shows both cabins properly | Business cabin - Air Cairo sells Economy only |
| TC-SM-PAX-003 | An infant must be linked to an adult | Not about the seat map |
| TC-SM-PAX-006 | Each passenger type is priced separately | Not about the seat map |
| TC-SM-PAX-007 | Closed passenger sections still report missing information | Not about the seat map |
| TC-SM-FRC-001 | A changed price is shown before the booking screen | Not about the seat map |
| TC-SM-FRC-002 | Accepting the new price carries it forward | Not about the seat map |
| TC-SM-FRC-003 | Cancelling leaves nothing behind | Not about the seat map |
| TC-SM-FRC-005 | Every later total uses the accepted price | Not about the seat map |
| TC-SM-ERR-001 | A server failure must not look like 'No Flights Found' | Not about the seat map |
| TC-SM-ERR-002 | The session ending in the middle of a booking | Not about the seat map |
| TC-SM-ERR-004 | Typing in one dropdown must not affect another | Not about the seat map |
| TC-SM-ERR-005 | Each offer says which airline connection it came from | Not about the seat map |
| TC-SM-EXR-007 | An exit seat already taken is dealt with when an infant is added later | Not approved at Review in the checklist |
| TC-SM-RTP-003 | Each journey's fare package sets that journey's seat prices | Bundle |
| TC-SM-MCT-004 | A seat booked on one flight never appears against another | Booking, post-booking, payment, hold or reports |
| TC-SM-MCT-005 | Seats and ancillaries survive to the confirmation page per flight | Booking, post-booking, payment, hold or reports |
| TC-SM-MCT-006 | Extra baggage should say which flight it belongs to | Meals, baggage or other extras |
| TC-SM-CNF-001 | The confirmation total equals what was quoted | Booking, post-booking, payment, hold or reports |
| TC-SM-CNF-002 | Every price line survives the booking unchanged | Booking, post-booking, payment, hold or reports |
| TC-SM-CNF-003 | Every ancillary reaches the confirmation with its own price | Booking, post-booking, payment, hold or reports |
| TC-SM-CNF-004 | Seats carry through to the right passenger with the right price | Booking, post-booking, payment, hold or reports |
| TC-SM-CNF-007 | Infants appear as passengers but carry no seat or ancillaries | Booking, post-booking, payment, hold or reports |
| TC-SM-CNF-008 | The e-ticket and the confirmation page agree exactly | Booking, post-booking, payment, hold or reports |
| TC-SM-CNF-010 | The wallet is reduced by exactly the booking amount | Booking, post-booking, payment, hold or reports |
| TC-SM-CNF-011 | The Costing tab adds up and is the figure to trust | Booking, post-booking, payment, hold or reports |
| TC-SM-CNF-012 | The order page itemises every ancillary and reconciles | Booking, post-booking, payment, hold or reports |
| TC-SM-CNF-015 | Walking away before 'Book' creates nothing - THE SAFE TEST | Booking, post-booking, payment, hold or reports |
| TC-SM-CNF-016 | Extra baggage must not clash with the baggage already in the fare package | Booking, post-booking, payment, hold or reports |
| TC-SM-CNF-017 | A failed booking must be reported as failed everywhere | Booking, post-booking, payment, hold or reports |
| TC-SM-PRC-005 | Seat map and ancillary prices use the right exchange rate | Pricing beyond the seat map |
| TC-SM-NAV-006 | A supplier with no seat selection shows no seat option | Not about the seat map |
| TC-ML-001 | Meals are offered per passenger and per flight | Meals, baggage or other extras |
| TC-ML-002 | An infant is not offered a meal | Meals, baggage or other extras |
| TC-ML-003 | Choosing and removing a meal changes the price correctly | Meals, baggage or other extras |
| TC-ML-004 | The meal list is separate from what the bundle includes | Meals, baggage or other extras |
| TC-ML-005 | The chosen meal reaches the confirmation (SPENDS REAL MONEY) | Meals, baggage or other extras |
| TC-ML-006 | A supplier with no meals shows no meal choice | Meals, baggage or other extras |
| TC-BG-001 | Extra baggage is offered per passenger and per journey | Meals, baggage or other extras |
| TC-BG-002 | An infant is not offered extra baggage | Meals, baggage or other extras |
| TC-BG-003 | Changing the bag weight replaces the bag, it does not add a second one | Meals, baggage or other extras |
| TC-BG-005 | The extra bag reaches the confirmation (SPENDS REAL MONEY) | Meals, baggage or other extras |
| TC-BG-006 | A supplier with no extra baggage shows no baggage choice | Meals, baggage or other extras |
| TC-HLD-005 | Seats, meals and bags chosen before holding are kept on the held booking | Booking, post-booking, payment, hold or reports |
| TC-PAH-002 | Paying takes exactly the booking amount from the wallet | Booking, post-booking, payment, hold or reports |
| TC-PAH-003 | A price change between hold and payment is shown before paying | Booking, post-booking, payment, hold or reports |
| TC-PAH-004 | After payment the e-ticket is issued and matches the booking | Booking, post-booking, payment, hold or reports |
| TC-SM-BND-006 | A supplier with no fare packages shows no package step | Bundle |
| TC-RPT-001 | A booking you just made appears in the reports | Booking, post-booking, payment, hold or reports |
| TC-RPT-002 | A payment appears in the account statement with the right amount | Booking, post-booking, payment, hold or reports |
| TC-RPT-003 | The reports agree with the booking and with each other | Booking, post-booking, payment, hold or reports |
| TC-RPT-004 | Extras bought with a booking are visible in the reports | Booking, post-booking, payment, hold or reports |

## 4. Comparison Report — Air Cairo website vs NDC Admin vs NDC Portal

| # | Result | What | Air Cairo website | NDC Admin | NDC Portal |
|---|---|---|---|---|---|
| C1 | MATCH | Aircraft | SM 0475, aircraft 320 (AIRBUS A320, config 32A) | SM475 · 320, 30 rows, 3-3 | Same as Admin |
| C2 | MATCH | Availability of the 168 seats both show | 168 available | 168 available — same seats, seat by seat | Same as Admin, seat by seat |
| C3 | MATCH | Seat prices | EGP 268 (B/E) · 804 (C/D) · 1,071 (A/F) · 1,607 (row 1 and exit rows) | Same four prices on the same 168 seats, zero differences | Same as Admin |
| C4 | DIFFERENT — defect candidate | Exit rows 12-13 (12 seats) for this party (adult + child + infant) | Returned as "blocked" for the adult (PT2) and the child (PT4), marked "E - Exit row seat" | Rows 12-13 not shown at all (168 seats); empty gaps, no exit word, no reason | Same as Admin |
| C5 | MATCH | Window and leg-space labels | W on 60 seats (A/F), L on 6 seats (row 1) | "Window seat" on 60, "Leg space seat" on 6 | Same as Admin |
| C6 | DIFFERENT — accepted (human: normal) | Aisle label | "A - Aisle seat" on 60 seats (C/D) | No aisle label; descriptions show an empty slot (", ,") | Same as Admin |
| C7 | DIFFERENT — observation | Fare offered for SM 475 | PROMOTIONAL EGP 20,526.40 (also SPECIAL, ECONOMY …) | Only ECO FLEX, EGP 49,342 (3 passengers) | Same as Admin |
| C8 | DIFFERENT — defect (High) | Exit seats per passenger (Groups 04-08) | Per passenger: lone adult available; child blocked; adult holding an infant blocked; the other adult of the party available (rule follows the infant link) | Only "hidden or open for everyone": hidden when every adult holds an infant, otherwise open to all — the child and the infant-holding adult can book | Same as Admin |
| C9 | DIFFERENT — defect (Medium) | Exit seat identification | "Exit row seat" label, "Exit row eligibility" conditions, "Acknowledge and select seat", legend "Emergency exit" | No exit word anywhere | Same as Admin |
| C10 | MATCH | Seat selection behaviour (Group 01) | Click shows a box; select; auto-next passenger; seat held by another passenger not selectable; move frees the old seat; double click keeps one; clear; confirm; modify; one-seat confirm | Same behaviour | Same as Admin |
| C11 | MATCH | Seat charge in the price | Cart +1,339 exactly; "Extra services" separate line | +1,339 exactly; "Seat Selection" separate line | Same as Admin |
| C12 | MATCH (both merge) | Return trip: maps and charges | Two A320 maps (180 each), return map empty; seats listed per journey, price details merged ("Extra services 2,142") | Same: two maps (180 each), per-journey lists, one merged "Seat Selection +2,142" | Same as Admin |
| C13 | AIRLINE REFUSES ON SAVE | Two infant-holding adults in one seat set (PAX-008) | Map offers 5B / 5C, but saving returns "SEATS NOT RESERVED — OXYGEN MASK QUOTA EXCEEDED" | Map offers 5B / 5C and confirms them; nothing is sent until the final Book | Same as Admin |
| C14 | NOT COMPARABLE | Multi-city (Group 10) | Order refused twice: "UNABLE TO CREATE ORDER" — seat maps never opened | 3 maps incl. SM20 ATR (44 seats, 2-2) | Same as Admin |

### Exit rows by party

| Party | Air Cairo website | NDC Admin | NDC Portal | Result |
|---|---|---|---|---|
| 1 adult (Group 04) | Available; 12A booked into order 9W6REH | 180 seats; 12A available, booked | Same | Match — EXR-001 Passed |
| 1 adult + 1 child (Group 05) | Adult: available · Child: blocked (12B not selectable) | 180 seats; child booked 12A | Same | Different — EXR-003 / EXR-004 Failed |
| 1 adult + 1 infant (Group 06) | Blocked for the adult | 168 seats; rows 12-13 hidden | Same | Same outcome, no explanation in NDC — EXR-002 Passed |
| 2 adults + 1 infant (Group 07) | Alpha (infant): blocked · Bravo: available | 180 seats; Alpha booked 12A | Same | Different — EXR-005 Failed |
| 2 adults + 2 infants (Group 08) | Blocked for both adults | 168 seats; rows 12-13 hidden | Same | Same outcome |
| 1 adult + 1 child + 1 infant (Group 01) | Blocked for the adult and the child | 168 seats; rows 12-13 hidden | Same | Same outcome, no explanation in NDC |

## 5. Defect Report

### D1 — Exit-row seats offered to an adult holding an infant and to a child

| | |
|---|---|
| Severity | High |
| Cases | TC-SM-EXR-003, TC-SM-EXR-004, TC-SM-EXR-005 (Failed) |
| Platforms | NDC Admin and NDC Portal |
| Observed | On SM 475 (10 Nov 2026) NDC only keeps exit rows 12-13 away when EVERY adult holds an infant (Group 01, 06, 08: rows hidden). In any other party the 12 exit seats are shown as available and bookable for everyone: adult + child (Group 05) — the child booked 12A; 2 adults + 1 infant (Group 07) — the adult holding the infant booked 12A. The supplier response marks the seats eligible for every passenger and only describes them as "Seat not allowed for infant". The Air Cairo website, for the same parties, applies the rule per passenger: adult + child → blocked for the child only (order 9WB835); 2 adults + 1 infant → blocked for the infant-holding adult only, the other adult can take them (order 9WA42H); lone adult → available (order 9W6REH, 12A booked). |
| Expected | An adult with an infant and a child may never sit in an exit seat; the seat is refused for that passenger, while other adults can still take it. |
| Impact | An agent can choose a seat the airline forbids for that passenger. |
| Evidence | manual_execution/artifacts/admin/seatmap_SM475_G05_adult_child.json, manual_execution/artifacts/admin/seatmap_SM475_G07_2adults_infant.json (eligible for all passengers); manual_execution/artifacts/admin/TC-SM-EXR-003_EXR-004_child.png, manual_execution/artifacts/admin/TC-SM-EXR-005_linkAlpha.png; manual_execution/artifacts/aircairo-web/seatMap_SM475_G05_adult_child.json, manual_execution/artifacts/aircairo-web/seatMap_SM475_G07_2adults_infant.json, manual_execution/artifacts/aircairo-web/G05_child_exit_blocked.png (airline: blocked per passenger) |

### D2 — Editing a passenger after choosing seats drops the seats silently and empties step 2

| | |
|---|---|
| Severity | High |
| Cases | TC-SM-CNF-018 (Failed) |
| Platforms | NDC Admin and NDC Portal |
| Observed | Seats 6A / 5B confirmed (total 50,681). Prev, child last name Testchild → Testchildx, Next: both seats are discarded with no warning (total 49,342) AND step 2 comes back with no meals, baggage or Select Seat, while Book / Hold / Save Quote stay on the page. On Admin that first Next sent NO add-pax, so the edited name had not been passed on yet; on Portal it sent add-pax + ssr-quote. A second Prev → Next restored the Ancillaries section, seats gone. |
| Expected | Choices survive, or the agent is warned; step 2 always offers the ancillaries; the edited passenger data is sent before booking is possible. |
| Impact | Seats silently lost; on Admin a booking could be attempted with the old passenger name while the screen shows the new one. |
| Evidence | manual_execution/artifacts/admin/TC-SM-CNF-018.png, manual_execution/artifacts/admin/TC-SM-CNF-018_after_edit.png, manual_execution/artifacts/portal/TC-SM-CNF-018_after_edit.png |

### D3 — Exit seats are never identified as exit seats

| | |
|---|---|
| Severity | Medium |
| Cases | TC-SM-STA-006 (Failed); TC-SM-EXR-002 (finding) |
| Platforms | NDC Admin and NDC Portal |
| Observed | When the exit rows are shown (lone adult, adult + child, 2 adults + 1 infant) seats 12A-13F carry only "Seat not allowed for infant" — no "Exit and emergency exit" anywhere (description, info box, colour key). When they are hidden (any party where every adult holds an infant) the rows are empty gaps with no explanation. The airline marks the same seats "Exit row seat", shows the "Exit row eligibility" conditions (at least 15 years old, physically fit, speaks English, no mobility restriction, willing to assist) and asks the passenger to "Acknowledge and select seat". |
| Expected | Exit seats carry the exit feature; a seat refused for a passenger says why. |
| Impact | The agent cannot tell which seats are exit seats or why two rows are missing. |
| Evidence | manual_execution/artifacts/portal/TC-SM-EXR-001_STA-006_12A.png, manual_execution/artifacts/portal/TC-SM-EXR-002_rows12-13_hidden.png, manual_execution/artifacts/admin/G01_seatmap_rows11-14_no_exit_rows.png |

### D4 — Seat charges are not split per journey in the price breakdown (known fault)

| | |
|---|---|
| Severity | Low |
| Cases | TC-SM-RTP-005 (Failed) |
| Platforms | NDC Admin and NDC Portal |
| Observed | Return trip, 5A on each journey (1,071 + 1,071): the breakdown shows one line "Seat Selection + 2,142". The per-journey cost is only visible in the Selected seats lists. |
| Expected | Each journey's seat charge is identifiable in the price breakdown. |
| Impact | The agency cannot see what each leg's seats cost from the breakdown. |
| Evidence | manual_execution/artifacts/admin/TC-SM-RTP-005_MPX-006_summary.png, manual_execution/artifacts/portal/TC-SM-RTP-005_MPX-006_summary.png |

### Observations (not defects)

- Aisle seats carry no "Aisle seat" label in NDC (the airline marks 60). Human decision: normal.
- NDC lists SM 475 only as ECO FLEX; the airline sells PROMOTIONAL / SPECIAL / ECONOMY on the same flight.
- Section names on the map are internal ids: CABIN1 / CABIN2 / CABIN3.
- STA-002 Inconclusive: no taken seat existed on the flight, so the "Blocked / Seat unavailable" box could not be opened.
- PAX-008 Blocked — Requires Booking (approved scope rule): NDC's map lets a second infant-holding adult take 5B / 5C after 5A. The airline's map does too, but the airline refuses the seat when it is saved ("OXYGEN MASK QUOTA HAS BEEN EXCEEDED") — NDC would only find out at the final Book.
- RTP-005: the airline also merges per-journey seat charges in its price details.
- MCT-007 Not Executed: 200 multi-city options, all non-stop — no connecting journey to test.

## 6. Execution Evidence

| Platform | Folder | Contents |
|---|---|---|
| NDC Admin | `manual_execution/artifacts/admin/` | seat-map responses (Group 01, 04, 05, 07), normalized Group 01 map, screenshots for failed / blocked / finding cases |
| NDC Portal | `manual_execution/artifacts/portal/` | seat-map responses (Group 01, 04, 10), screenshots for failed / blocked / finding cases |
| Air Cairo website | `manual_execution/artifacts/aircairo-web/` | seat maps per group (`seatMap_SM475_G0x_*.json`, `seatMap_G09_return_*.json`), Group 01 normalized map, cart / exit-seat / PAX-008 screenshots |

Passed cases are evidenced by their observed values in this file (no screenshot).

## 7. Booking Safety Confirmation

| Platform | What was done | Result |
|---|---|---|
| NDC Admin | Search, fare-confirmation, add-pax, ssr-quote, seat-map. Book Seat / Confirm / Change Seats / Clear all send no request. Book, Hold and Save Quote were on the page and **never pressed** | No booking call (network checked) |
| NDC Portal | Same calls as Admin; the wallet warning dismissed with OK only | No booking call (network checked) |
| Air Cairo website | **Unpaid orders on Air Cairo's production site — 9 in total.** The first two before the rule changed: The site creates an order when the last passenger's **Confirm** is pressed (`POST /v2/purchase/orders` → 201). **9UTI3G**: created after Claude wrongly said that Confirm only saves passengers; the human pressed it. **9UZZTS**: created when the human repeated the cycle and pressed Confirm. Both unpaid, no ticket. Then, with the human's approval: **9W2PE8** (G01, seat 6A), **9W6REH** (G04, 12A), **9WB835** (G05), **9W9ZS8** (G06), **9WA42H** (G07), **9WAXR5** (G08, seat save refused), **9WFFWZ** (G09, 5A + 5A). Two multi-city attempts were refused by the airline (no order). Checkout / payment never pressed on any order | 9UTI3G / 9UZZTS created before approval (breach, reported). The other 7 approved. All unpaid; expiry **not confirmed** |

## 8. Not done in this run

- Air Cairo website Group 10 (multi-city) — the airline refused to create the order twice.
- MCT-007 — no connecting journey offered.

## 9. Setups executed

| Group | Flight(s) | Passengers | Cases | NDC result (Admin = Portal) | Air Cairo website |
|---|---|---|---|---|---|
| 01 | SM 475 CAI→JED 10 Nov 2026 06:05, A320, ECO FLEX | 1 adult + 1 child + 1 infant (Seatmap Testadult / Testchild / Testinfant) | 35 | 32 Passed · 2 Failed (STA-006, CNF-018) · 1 Inconclusive (STA-002) | Executed (orders 9UZZTS read-only, 9W2PE8 seat cases) |
| 04 | SM 475 | 1 adult (Alpha) | EXR-001 | Passed — 180 seats, exit 12A bookable | Executed (9W6REH): exit seats available, 12A booked |
| 05 | SM 475 | 1 adult + 1 child (Alpha, Charlie) | EXR-003, EXR-004 | Failed, Failed — child booked exit 12A | Executed (9WB835): exit blocked for the child only |
| 06 | SM 475 | 1 adult + 1 infant (Alpha, Delta) | EXR-002 | Passed (with finding) — rows 12-13 hidden, 168 seats | Executed (9W9ZS8): exit blocked for the adult |
| 07 | SM 475 | 2 adults + 1 infant (Delta → Alpha) | EXR-005 | Failed — infant-holding Alpha booked exit 12A | Executed (9WA42H): blocked for Alpha, open for Bravo |
| 08 | SM 475 | 2 adults + 2 infants (Delta → Alpha, Echo → Bravo) | PAX-008 | Blocked — Requires Booking | Executed (9WAXR5): 5B for Bravo refused on save (oxygen-mask quota) |
| 09 | SM 471 CAI→JED 10 Nov + SM 472 JED→CAI 17 Nov (SM 475 not offered as a return pair) | 1 adult + 1 child | RND-010, RTP-001, RTP-004, MPX-006, RTP-005 | 4 Passed · 1 Failed (RTP-005) | Executed (9WFFWZ): 2 maps, per-journey lists, merged charge |
| 10 | SM 475 (10 Nov) / SM 472 JED→CAI (14 Nov) / SM 20 CAI→HRG (17 Nov, ATR) | 1 adult + 1 child | MCT-003, RND-007, MCT-007 | 2 Passed · MCT-007 Not Executed (no connecting journey offered) | Not reachable: airline refused the order twice |

## 10. Execution timeline

1. Scope reused from the Oman Air run: 49 cases with the same seat-only adjustments; CAB-001 / CAB-007 excluded (Air Cairo sells Economy only) → 49 included, 75 excluded. Run created with run_manager (testingLayerScope Admin + Portal), Capability Plan from capability_gate, ApprovedScope.md written. The runner-only exception was extended by the human to this comparison; Headed.
2. Environment: NDC Staging (192.168.1.237) calling the supplier Production through credential "AIRCairo Production (Warning)"; Admin branch NDC1_Ahmed Ayman / agency AGN9799; Portal agency AGN9799.
3. Air Cairo website (aircairo.com → online.aircairo.com, Amadeus): search CAI→JED 10 Nov, 1 adult + 1 child + 1 infant; SM 475 06:05, PROMOTIONAL. The auto-mode classifier refused "Keep Promotional" and entering dummy passport data; the human did both.
4. INCIDENT: Claude said the last passenger's Confirm only saves passengers — wrong. The human pressed it and the site sent POST /v2/purchase/orders → order 9UTI3G (unpaid, no ticket). Claude stopped and reported it at once. My Booking then showed "The payment for this booking is incomplete".
5. The human asked to repeat the cycle; Claude stopped before the last Confirm, the human pressed it and a second order 9UZZTS was created. Its seat map was read (GET seatmaps/by-order, no seat chosen): the airline only shows seats after an order exists.
6. NDC Admin then Portal, Group 01 (35 cases): identical results. Admin's first Next sent add-pax with an empty passenger list (400); the second worked.
7. Groups 04-10 on Portal and Admin with Alpha / Bravo / Charlie / Delta / Echo Seatmaptest. Return and multi-city searches on Portal first returned "No Flights Found" and worked after a page reload.
8. Human decision: unpaid orders (PNRs) on the Air Cairo website are allowed for this comparison; never Checkout or payment. Claude then did every airline step itself (passport fields included): Group 01 seat cases on order 9W2PE8; Groups 04-08 on orders 9W6REH, 9WB835, 9W9ZS8, 9WA42H, 9WAXR5; return trip on 9WFFWZ. The browser was closed once by the user mid-run; Air Cairo work resumed in a fresh window.
9. Air Cairo multi-city (CAI-JED 10 Nov, JED-CAI 14 Nov, CAI-HRG 17 Nov) built through the site's own search link: the airline refused to create the order twice ("UNABLE TO CREATE ORDER"), so its multi-city seat maps could not be opened.
10. Final network check on both NDC tabs: only search, fare-confirmation, pax-details, add-pax, ssr-quote, seat-map and a read of payment methods. No booking, hold, order, ticket or payment call.

## 11. Left behind by this run

- **Air Cairo unpaid orders** 9UTI3G, 9UZZTS, 9W2PE8, 9W6REH, 9WB835, 9W9ZS8, 9WA42H, 9WAXR5, 9WFFWZ (last names Testadult / Seat / Seatmaptest) — confirm they expired, or ask Air Cairo / the supplier to cancel them.
- **Saved passenger profiles** in agency AGN9799: NDC saves new passengers (Seatmap Test*, Alpha / Bravo / Charlie / Delta / Echo Seatmaptest).
