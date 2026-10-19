# Manual Execution Results — Oman Air Seat Map comparison (all setups)

## 1. Execution Metadata

| | |
|---|---|
| Run | `ancillaries-run-007__2026-10-19_21-03-09__Targeted__Ancillaries-OmanAir-SeatMapComparison` |
| Scope | Ancillaries / Oman Air, Seat Map only — [ApprovedScope.md](../metadata/ApprovedScope.md) (approved by Ahmed Ayman, 2026-10-19) |
| Platforms | NDC Admin `http://192.168.1.237` · NDC Portal `http://192.168.1.237:9500` · Oman Air website `https://www.omanair.com` (reference, read-only) |
| Environment | NDC Staging, calling the supplier's Production through credential **OmanAir Production** |
| Admin entry | Branch NDC1_Ahmed Ayman (BRN287) → Agency NDC1_Ahmed Ayman (AGN9799) → Agent Ahmed Ayman |
| Portal login | Agency AGN9799 |
| Flight (same on all three) | **WY 408**, CAI 01:15 → MCT 06:55, Tue 10 Nov 2026, non-stop, one-way, Economy **Super Saver** |
| Passengers (same on all three) | Group 01: Mr Seatmap Testadult (15/05/1990), Ms/Miss Seatmap Testchild (10/03/2018), Ms/Miss Seatmap Testinfant (20/02/2026, linked to the adult). Groups 04-10: distinct first names Alpha / Bravo (adults), Charlie (child), Delta / Echo (infants), last name Seatmaptest. Dummy data, email seatmap.test@example.com |
| Setup Groups | 01 (primary, WY 408, 1 adult + 1 child + 1 infant) · 04 / 05 / 06 / 07 / 08 (other passenger mixes on WY 408) · 09 (return WY 408 + WY 407 on 17 Nov) · 10 (multi-city WY 408 / WY 603 / WY 610 + WY 407, 10-14 Nov; also the second-aircraft source for RND-007). Group 02 (Business) waits for the conditional approval |
| Method | Manual, browser tool (`playwright-ancillaries`), Headed, 1920 px. One-time exception to the runner-only rule (human, 2026-10-19). Runner not executed, no script or automation written |
| Executed | 2026-10-19, by Claude Code |

## 2. Execution Summary

Checklist total **124**. Excluded **73**. Executable scope **51**: **49 executed** on both NDC Admin and NDC Portal across Setup Groups 01 and 04-10, **2 Not Executed** (the 2 conditional Business cabin cases).

| Result (each case, Admin and Portal) | Count |
|---|---|
| Passed | 40 |
| Failed | 7 |
| Inconclusive | 1 |
| Blocked (Requires Booking) | 1 |
| Not Executed (conditional, waiting for approval) | 2 |
| Excluded | 73 |

Admin and Portal gave **identical** results and identical values on every executed case.
Pass rate on executed cases: **81.6%** (40 of 49).

Group 01 holds 35 cases (26 as written + 9 adjusted; an earlier plan said 39 by mistake). Setup Groups 04-10 hold the other 14.

## 3. Per-Test Results

Oman Air column: values compared from the airline's own seat map data (`GET /api/seatMap`). **N/A** where the airline site has no equivalent or no seat action was taken there (the airline site was used read-only).

| Test Case ID | Title | Status | NDC Admin — actual result | NDC Portal | Oman Air website | Evidence |
|---|---|---|---|---|---|---|
| TC-SM-NAV-001 | You can only pick seats on step 2 | Passed | Two steps only: 01 Passenger Info, 02 Ancillaries. No Select Seat before step 2. Aircraft on the flight details: 738. (Seat-only adjustment: fare-package wording ignored.) | Same as Admin (identical values) | N/A: airline flow is Passengers > Extras > Seats > Review; no equivalent wizard | Observed values in text; no screenshot (the page moved on before one was taken) |
| TC-SM-NAV-003 | 'Select Seat' opens the seat map | Passed | Map opens full width (1920 of 1920 px), titled "Seat Map · CAI → MCT · Onward"; left panel, seat chart, colour key and bottom buttons present. | Same as Admin (identical values) | Comparable: airline Seats step shows "CAI - MCT", Boeing 737, Economy cabin | manual_execution/artifacts/admin/TC-SM-STA-002.png, manual_execution/artifacts/omanair-web/02_seatmap_WY408.png |
| TC-SM-NAV-005 | You can skip seats completely | Passed | Nothing chosen: bottom button "Continue without seats"; pressing it closes the map, no seat given, amount stays EGP 24,658. | Same as Admin (identical values) | N/A: no seat action performed on the airline site (read-only reference) | manual_execution/artifacts/admin/TC-SM-SEL-008_NAV-005.png, manual_execution/artifacts/portal/TC-SM-NAV-005.png |
| TC-SM-RND-001 | The seat total matches the seats you can see | Passed | Left panel "SEATS 150" = 150 seats drawn. | Same as Admin (identical values) | Match: airline seat map has 150 seats (rows 10-35, no row 13, 3-3) | manual_execution/artifacts/admin/seatmap_WY408_response.json, manual_execution/artifacts/omanair-web/seatMap_WY408_response.json |
| TC-SM-RND-002 | Every seat has one clear state and one seat number | Passed | 150 unique seat numbers, row labels all match; states: 132 available paid + 13 Blocked + 5 Occupied = 150. | Same as Admin (identical values) | Comparable: airline 120 available + 30 not available. The 18 Blocked/Occupied seats are not available on both; the other 12 are the exit rows (Comparison C1) | manual_execution/artifacts/admin/seatmap_WY408_response.json |
| TC-SM-RND-003 | Every seat has a full description | Passed | Every description has seat, row, side, section (Y1), features, and ends with "Blocked", "Occupied" or "available for EGP n"; printed seat matches. Note: "Occupied" is a third ending not named in the sheet; it is in the colour key. | Same as Admin (identical values) | N/A: airline site has no per-seat text description | manual_execution/artifacts/admin/TC-SM-SEL-001_SEL-003.png |
| TC-SM-RND-005 | Cabin and section information agrees with the map | Passed | Colour key: one cabin, Economy; all 150 seats in section Y1 Economy; one deck (Main deck). | Same as Admin (identical values) | Match: airline shows one "Economy cabin" | manual_execution/artifacts/admin/TC-SM-STA-002.png |
| TC-SM-RND-006 | The flight shown on the map is the flight you chose | Failed | Route CAI → MCT, flight WY408 and times 01:15 → 06:55 on 10 Nov 2026 match the chosen flight, but the aircraft type does not: flight details say "Aircraft: 738", the seat map says "WY408 · 73M". | Same as Admin (identical values) | Airline shows only "Boeing 737" (no sub-type) | manual_execution/artifacts/admin/TC-SM-STA-002.png, manual_execution/artifacts/admin/seatmap_WY408_response.json (equipment 73M) |
| TC-SM-RND-007 | Two different flights give two different maps | Passed | Two aircraft types from the Group 10 search: WY408 (73M, 150 seats, rows 10-35) and WY603 (739, 171 seats). The two maps differ and each matches its own aircraft. (Second flight taken from the multi-city search, kept separate from the primary comparison.) | Same as Admin (identical values) | Match: airline WY 408 150 seats, WY 603 171 seats | manual_execution/artifacts/admin/TC-SM-MCT-003_MCT-007_map1.png, manual_execution/artifacts/admin/TC-SM-MCT-003_MCT-007_map2.png |
| TC-SM-RND-010 | Each flight in a trip gets its own map | Passed | Group 09 return trip: two maps, "CAI → MCT · Onward" (WY408 · 73M, 150 seats) and "MCT → CAI · Return" (WY407 · 73M, 150 seats), each with its own flight. | Same as Admin (identical values) | Match: the airline returns two maps, WY 408 (150) and WY 407 (150) | manual_execution/artifacts/admin/TC-SM-RTP-001_RND-010_leg1.png, manual_execution/artifacts/omanair-web/seatMap_G09_return.json |
| TC-SM-STA-002 | A taken seat can be looked at but not booked | Passed | Occupied seat 10D: box says "Seat 10D is occupied", button "Seat unavailable" greyed out, no error, count stays 0/2. | Same as Admin (identical values) | N/A: not clicked on the airline site | manual_execution/artifacts/admin/TC-SM-STA-002.png, manual_execution/artifacts/portal/TC-SM-STA-002.png |
| TC-SM-STA-004 | Seat features use known wording | Inconclusive | Words outside the sheet's known list appear: Left/Right side of aircraft, Bulkhead seat, Seat with bassinet facility, Seat to be left vacant or offered last, Center seat (not window, not aisle), Front of cabin class/compartment, Overwing seat(s), Seat not allowed for infant, Seat not allowed for medical. "Bulkhead seat" is repeated twice in every row-10 description. Same result as ancillaries-run-005: the known list looks out of date, so a business decision is needed first. | Same as Admin (identical values) | N/A | manual_execution/artifacts/admin/seatmap_WY408_response.json |
| TC-SM-STA-005 | Window and aisle labels match where the seat really is | Passed | All 50 window seats are A/F, 50 aisle seats C/D, 50 centre seats B/E (3-3); no seat has two labels. | Same as Admin (identical values) | Match: airline WINDOW/AISLE/CENTER flags agree on all 150 seats | manual_execution/artifacts/admin/seatmap_WY408_response.json, manual_execution/artifacts/omanair-web/seatmap_WY408_normalized.json |
| TC-SM-STA-006 | Emergency exit seats are marked | Passed | 12 seats marked "Exit and emergency exit", rows 18-19, all six seats of each row, next to each other; also "Seat not allowed for infant". Not marked "Leg space seat" (the sheet says "usually"). | Same as Admin (identical values) | DIFFERENT: the airline shows the same 12 exit seats as NOT available for this party; NDC offers all 12 (Comparison C1) | manual_execution/artifacts/admin/seatmap_WY408_response.json, manual_execution/artifacts/omanair-web/seatMap_WY408_response.json |
| TC-SM-SEL-001 | One click only shows the seat - it does not book it | Passed | One click on 25A opens its box; count still 0/2, passenger cards show no seat, bottom button still "Continue without seats". | Same as Admin (identical values) | N/A: no seat action on the airline site | manual_execution/artifacts/admin/TC-SM-SEL-001_SEL-003.png, manual_execution/artifacts/portal/TC-SM-SEL-001_SEL-003_A11Y-002.png |
| TC-SM-SEL-002 | A seat is only taken when you press the button in the box | Passed | Button reads "Book 25A for Seatmap" (the passenger's first name). After pressing: count 1/2, card "25A Economy EGP 662", seat "selected for Seatmap Testadult". | Same as Admin (identical values) | N/A | manual_execution/artifacts/portal/TC-SM-SEL-002_PAX-004.png |
| TC-SM-SEL-003 | The seat information box is correct | Passed | Box: "Available paid, Seat 25A EGP 662 per passenger, Economy, Main deck, Window seat, Row 25 15th of 25 rows in Y1, Middle of this deck"; agrees with the seat description. | Same as Admin (identical values) | Comparable: airline price for 25A is USD 11.9 | manual_execution/artifacts/admin/TC-SM-SEL-001_SEL-003.png |
| TC-SM-SEL-006 | The bottom button changes as seats are chosen | Passed | "Continue without seats" -> "Confirm 1 of 2 seats" -> "Confirm 2 seats"; "Clear all seats" beside it; total 2 (infant not counted); cards ACTIVE / SELECT / SELECTED / ASSIGNED. | Same as Admin (identical values) | N/A | manual_execution/artifacts/admin/TC-SM-MPX-002_SEL-006_SEL-012.png, manual_execution/artifacts/portal/TC-SM-MPX-002_SEL-006.png |
| TC-SM-SEL-007 | Moving a passenger to another seat frees the first seat | Passed | Adult moved 25A -> 26A: adult holds only 26A, 25A back to "available for EGP 662", count 2/2. | Same as Admin (identical values) | N/A | manual_execution/artifacts/admin/TC-SM-SEL-007_NEG-003.png, manual_execution/artifacts/portal/TC-SM-SEL-007.png |
| TC-SM-SEL-008 | 'Clear all seats' also removes the seat charge | Passed | Clear all seats: count 1/2 -> 0/2, 26A free again, button back to "Continue without seats"; after closing, the Seat Selection line is gone and the amount is back to EGP 24,658. | Same as Admin (identical values) | N/A | manual_execution/artifacts/admin/TC-SM-SEL-008_NAV-005.png, manual_execution/artifacts/portal/TC-SM-SEL-008.png |
| TC-SM-SEL-009 | Confirming saves the seat and closes the map | Passed | Confirm closes the map; step 2 shows "Selected seats 2 travellers": 26A EGP 662, 27B EGP 565; opener now "Change Seats"; breakdown line "Seat Selection + 1,227". No network call was made on Confirm. | Same as Admin (identical values) | N/A | manual_execution/artifacts/admin/TC-SM-SEL-009_PRC-003_PER-007_PAX-001.png, manual_execution/artifacts/portal/TC-SM-SEL-009_PRC-003_PER-007_PAX-001.png |
| TC-SM-SEL-010 | 'Change Seats' reopens the map with your choice still there | Passed | Change Seats reopens the map with 26A and 27B still held, count 2/2. | Same as Admin (identical values) | N/A | manual_execution/artifacts/admin/TC-SM-SEL-010_PER-001.png, manual_execution/artifacts/portal/TC-SM-SEL-010.png |
| TC-SM-SEL-012 | A seat held by another passenger in your booking is marked | Passed | With the child active, 25A shows "selected for Seatmap Testadult" (full name) and offers no Book button. | Same as Admin (identical values) | N/A | manual_execution/artifacts/admin/TC-SM-MPX-002_SEL-006_SEL-012.png, manual_execution/artifacts/portal/TC-SM-SEL-012_MPX-004.png |
| TC-SM-MPX-002 | The seat goes to the passenger who is selected | Passed | Adult card selected -> 25A to the adult; child card -> 25B to the child; adult keeps 25A; count "2 / 2 All assigned". | Same as Admin (identical values) | N/A | manual_execution/artifacts/admin/TC-SM-MPX-002_SEL-006_SEL-012.png |
| TC-SM-MPX-004 | Two passengers cannot have the same seat | Passed | The child cannot take the adult's 25A: shown "selected for Seatmap Testadult", no Book button. | Same as Admin (identical values) | N/A | manual_execution/artifacts/portal/TC-SM-SEL-012_MPX-004.png |
| TC-SM-MPX-006 | Seats on one flight do not affect the other flight | Passed | Return map started empty; choosing 26A on the return did not disturb the outbound 26A/26B; the summary lists each journey separately (2 travellers outbound, 1 traveller return, "Seat 1 more"). | Same as Admin (identical values) | N/A | manual_execution/artifacts/admin/TC-SM-RTP-005_MPX-006_summary.png, manual_execution/artifacts/portal/TC-SM-RTP-005_MPX-006_summary.png |
| TC-SM-MPX-007 | Some passengers can have seats and others none | Passed | Seat for the adult only: "Confirm 1 of 2 seats" allowed; summary "1 traveller, 26A EGP 662"; amount 24,658 -> 25,320; opener "Seat 1 more". (Seat-only adjustment: booking completion not checked.) | Same as Admin (identical values) | N/A | manual_execution/artifacts/portal/TC-SM-MPX-007.png |
| TC-SM-PRC-002 | A seat marked 'Chargeable seat' must always have a price | Passed | All 150 seats carry "Chargeable seat"; all 132 available seats have a price, none "Free". (Seat-only adjustment: package comparison removed.) | Same as Admin (identical values) | Match: every available airline seat has a price (USD 10 to 38.3) | manual_execution/artifacts/admin/seatmap_WY408_response.json |
| TC-SM-PRC-003 | A paid seat is added as its own line in the price | Passed | Seats 26A (662) + 27B (565) confirmed: separate line "Seat Selection + 1,227"; amount 24,658 -> 25,885, up by exactly 1,227. | Same as Admin (identical values) | N/A: no seat added to the airline cart | manual_execution/artifacts/admin/TC-SM-SEL-009_PRC-003_PER-007_PAX-001.png |
| TC-SM-PRC-003b | One aircraft can have several seat prices at once | Passed | Nine seat prices on one aircraft: EGP 565 / 634 / 662 / 951 / 1,021 / 1,048 / 2,080 / 2,150 / 2,177. Section header "Y1 Economy 3-3 rows 10-35 from EGP 565" and colour key "Economy from EGP 565" match the lowest seat price. | Same as Admin (identical values) | Match in structure: the airline uses the same nine levels (USD 10 / 11.3 / 11.9 / 16.9 / 18.2 / 18.7 / 37 / 38.3 / 38.8), one-to-one with NDC (Comparison C4) | manual_execution/artifacts/admin/seatmap_WY408_response.json, manual_execution/artifacts/omanair-web/seatmap_WY408_normalized.json |
| TC-SM-PER-001 | Seats survive going back a step | Passed | Prev to step 1 and Next without editing: "Selected seats 2 travellers" 26A/27B, "Change Seats", Seat Selection + 1,227, amount 25,885, all unchanged. No add-pax call was sent. | Same as Admin (identical values) | N/A | manual_execution/artifacts/admin/TC-SM-SEL-010_PER-001.png, manual_execution/artifacts/portal/TC-SM-PER-001.png |
| TC-SM-PER-007 | The seat appears on the payment summary | Passed | Summary before the final Book: amount 25,885 = 24,658 + 1,227, breakdown "Seat Selection + 1,227", both seats listed. Book was not pressed (Admin also shows "Book and Hold are not available for this flight"). | Same as Admin (identical values) | N/A: the airline payment step was not entered | manual_execution/artifacts/admin/TC-SM-SEL-009_PRC-003_PER-007_PAX-001.png |
| TC-SM-NEG-003 | Clicking quickly does not book two seats | Passed | Six quick presses on "Book 27B": two landed before the button closed; the child holds only 27B, count 2/2, only two seats held. | Same as Admin (identical values) | N/A | manual_execution/artifacts/admin/TC-SM-SEL-007_NEG-003.png, manual_execution/artifacts/portal/TC-SM-NEG-003.png |
| TC-SM-A11Y-001 | The seat map works on a smaller screen | Passed | At 768 px wide: page width stays 768 (no sideways scroll), the chart scrolls inside its own panel, the left panel stays visible, row 35 (35A) is reached and booked. | Same as Admin (identical values) | N/A | manual_execution/artifacts/admin/TC-SM-A11Y-001.png, manual_execution/artifacts/portal/TC-SM-A11Y-001.png |
| TC-SM-A11Y-002 | Seat states can be read by screen readers | Passed | Every seat is a button whose label ends with its state ("available for EGP n" / "Blocked" / "Occupied" / "selected for <name>"); the book button's name is "Book 25A for Seatmap". | Same as Admin (identical values) | N/A | manual_execution/artifacts/portal/TC-SM-SEL-001_SEL-003_A11Y-002.png |
| TC-SM-CAB-001 | The same flight gives a different map in each cabin | Not Executed | Conditional: waits for the Oman Air Business cabin layout to be confirmed and the business-cabin rule to be approved (Setup Group 02) | - | - | - |
| TC-SM-CAB-007 | A two-cabin aircraft shows both cabins properly | Not Executed | Conditional: waits for the Oman Air Business cabin layout to be confirmed and the business-cabin rule to be approved (Setup Group 02) | - | - | - |
| TC-SM-PAX-001 | Infants get no seat and no extras; children get both | Passed | 3 passengers, count reads 0 of 2; the child can be seated (27B); summary "2 travellers"; the infant has no seat card and no seat. (Seat-only adjustment: meal/bag checks removed.) | Same as Admin (identical values) | Comparable: the airline Seats step lists only the adult and the child | manual_execution/artifacts/admin/TC-SM-SEL-009_PRC-003_PER-007_PAX-001.png |
| TC-SM-PAX-004 | The map moves on to the next passenger automatically | Passed | After the adult's seat, the child card became ACTIVE automatically; the adult card shows ASSIGNED (SELECTED when re-activated). | Same as Admin (identical values) | N/A | manual_execution/artifacts/portal/TC-SM-SEL-002_PAX-004.png |
| TC-SM-EXR-001 | An adult travelling alone CAN take an exit seat | Passed | Group 04 (1 adult, Alpha). Exit seat 18A offered: "Book 18A for Alpha"; booked, "selected for Alpha Seatmaptest", 1/1. (Seat-only adjustment: "Plus" package ignored.) | Same as Admin (identical values) | Match: for a lone adult the airline shows all 12 exit seats available (132 available) | manual_execution/artifacts/admin/TC-SM-EXR-001.png, manual_execution/artifacts/portal/TC-SM-EXR-001.png, manual_execution/artifacts/omanair-web/seatMap_WY408_G04_1adult.json |
| TC-SM-EXR-002 | An adult with an infant CANNOT take an exit seat | Failed | Group 06 (1 adult + 1 infant linked to him). Exit seat 18A offered to the infant-holding adult ("Book 18A for Alpha") and booked; no refusal, no greyed button. | Same as Admin (identical values) | DIFFERENT: for adult + infant the airline shows all 12 exit seats NOT available | manual_execution/artifacts/admin/TC-SM-EXR-002.png, manual_execution/artifacts/portal/TC-SM-EXR-002.png, manual_execution/artifacts/omanair-web/seatMap_WY408_G06_adult_infant.json |
| TC-SM-EXR-003 | A child CANNOT take an exit seat | Failed | Group 05 (1 adult + 1 child). With the child active, exit seat 18A shows "available for EGP 2,177" and "Book 18A for Charlie"; pressing it gives the child the exit seat ("18A Economy EGP 2,177 ASSIGNED"). The adult can also take exit seats (18B). | Same as Admin (identical values) | DIFFERENT: for adult + child the airline shows all 12 exit seats NOT available (for the whole party) | manual_execution/artifacts/admin/TC-SM-EXR-003.png, manual_execution/artifacts/portal/TC-SM-EXR-003.png, manual_execution/artifacts/omanair-web/seatMap_WY408_G05_adult_child.json |
| TC-SM-EXR-004 | The rule is rechecked when you switch passenger | Failed | Group 05. Adult active: 18A bookable. Switch to the child: the SAME seat stays "available" with "Book 18A for Charlie". The seat does not change with the passenger. | Same as Admin (identical values) | N/A per passenger (the airline map is per party); the airline blocks exit seats for this party altogether | manual_execution/artifacts/admin/TC-SM-EXR-003_EXR-004_child.png, manual_execution/artifacts/portal/TC-SM-EXR-004.png |
| TC-SM-EXR-005 | The rule follows the infant's linked adult | Failed | Group 07 (2 adults + 1 infant). Infant linked to Alpha: 18A bookable for BOTH Alpha and Bravo. Relinked to Bravo (Prev, Assigned to = Bravo, Next): still bookable for both. No refusal exists, so it cannot follow the link. | Same as Admin (identical values) | N/A: the airline returns one map per party, not per passenger | manual_execution/artifacts/admin/TC-SM-EXR-005_linkA.png, manual_execution/artifacts/admin/TC-SM-EXR-005_linkB.png, manual_execution/artifacts/portal/TC-SM-EXR-005_linkA.png, manual_execution/artifacts/portal/TC-SM-EXR-005_linkB.png |
| TC-SM-RTP-001 | A return trip gives one seat map per journey | Passed | Two "Select Seat" buttons, one per journey; each map titled with its own direction (Onward / Return) and its own aircraft. | Same as Admin (identical values) | Match: one map per journey | manual_execution/artifacts/admin/TC-SM-RTP-001_RND-010_leg1.png, manual_execution/artifacts/portal/TC-SM-RTP-001_RND-010_leg1.png |
| TC-SM-RTP-004 | Seat maps are completely separate per journey | Passed | After 26A + 26B confirmed on the outbound, the return map opened with nothing chosen, on its own aircraft, and 26A still "available for EGP 662" there; only the outbound button changed to "Change Seats". | Same as Admin (identical values) | N/A: no seat selection on the airline site | manual_execution/artifacts/admin/TC-SM-RTP-004_MPX-006_leg2.png, manual_execution/artifacts/portal/TC-SM-RTP-004_MPX-006_leg2.png |
| TC-SM-MCT-003 | Three journeys give three seat maps and three sets of ancillaries | Passed | Group 10 multi-city CAI→MCT (10 Nov), MCT→DXB (12 Nov), DXB→CAI via MCT (14 Nov): 4 "Select Seat" buttons, maps titled Trip 1 / Trip 2 / Trip 3 / Trip 3, each with its own route. (Seat-only adjustment: meal and bag counts removed.) | Same as Admin (identical values) | Match: the airline returns 4 maps for the same 4 flights | manual_execution/artifacts/admin/TC-SM-MCT-003_MCT-007_map1-4.png, manual_execution/artifacts/omanair-web/seatMap_G10_multicity.json |
| TC-SM-MCT-007 | Seat maps follow FLIGHTS, fare packages follow JOURNEYS | Passed | The connecting journey (Trip 3) has two maps, one per flight: DXB→MCT WY610 · 739 and MCT→CAI WY407 · 73M. Fare packages: none for Oman Air (0 package boxes), so the package count is N/A. | Same as Admin (identical values) | Match: WY 610 and WY 407 each have their own map | manual_execution/artifacts/admin/TC-SM-MCT-003_MCT-007_map3.png, manual_execution/artifacts/admin/TC-SM-MCT-003_MCT-007_map4.png |
| TC-SM-RTP-005 | Seat and ancillary charges should be identifiable per journey | Failed | Known fault reproduced (seat-only form). Seats on two journeys (662 + 565 outbound, 662 return): the price breakdown shows ONE merged line "Seat Selection + 1,889"; nothing says what each journey's seats cost. Only the "Selected seats" list per journey shows it. | Same as Admin (identical values) | N/A | manual_execution/artifacts/admin/TC-SM-RTP-005_MPX-006_summary.png, manual_execution/artifacts/portal/TC-SM-RTP-005_MPX-006_summary.png |
| TC-SM-CNF-018 | Going back a step must not silently throw away seats and ancillaries | Failed | Known fault reproduced (seat-only form). Seats 26A/27B confirmed (amount 25,885); Prev, child last name edited Testchild -> Testchildx, Next: both seats silently discarded, no warning, amount back to 24,658, opener back to "Select Seat". Next after the edit re-sent add-pax; Next without an edit (PER-001) did not. | Same as Admin (identical values) | N/A | manual_execution/artifacts/admin/TC-SM-CNF-018.png, manual_execution/artifacts/portal/TC-SM-CNF-018.png |
| TC-SM-PAX-008 | Two infant-holding adults cannot sit in the same set of seats | Blocked | Blocked — Requires Booking (Strictly Prohibited). Group 08 (2 adults, each with an infant). After Alpha takes 25A, Bravo is still offered 25B and 25C (same seat set ABC) and 26A; the seat map does not block the set. Whether the airline refuses it at the final Book cannot be checked without booking (approved scope rule). | Same as Admin (identical values) | N/A: needs seat selection on the airline site | manual_execution/artifacts/admin/TC-SM-PAX-008.png, manual_execution/artifacts/portal/TC-SM-PAX-008.png |

### Excluded (73)

| Test Case ID | Title | Reason |
|---|---|---|
| TC-SM-NAV-002 | You cannot reach the seats without choosing a fare package | Bundle |
| TC-SM-NAV-002b | Missing passenger details and a missing fare package are both reported | Not about the seat map |
| TC-SM-STA-007 | Women-only seats are marked clearly | Not supported by supplier: no women-only seat rule for Oman Air |
| TC-SM-PRC-001 | A seat included in the fare package costs nothing | Bundle |
| TC-SM-PRC-004 | The price breakdown adds up | Pricing beyond the seat map |
| TC-SM-BND-002 | Changing the fare package recalculates the seats | Bundle |
| TC-SM-BND-003 | Each flight uses its own fare package | Bundle |
| TC-SM-BND-004 | Fare package names are never blank or repeated | Bundle |
| TC-SM-BND-005 | What the package promises about seats is what you get | Bundle |
| TC-SM-GEN-001 | A women-only seat is refused to a male passenger | Not supported by supplier: no women-only seat rule for Oman Air |
| TC-SM-GEN-002 | A women-only seat is offered to a female passenger | Not supported by supplier: no women-only seat rule for Oman Air |
| TC-SM-GEN-002b | The hidden seat data matches what is shown on screen | Not supported by supplier: no women-only seat rule for Oman Air |
| TC-SM-GEN-003 | Gender comes from the title and cannot be edited | Not about the seat map |
| TC-SM-GEN-004 | Each passenger sees their own seats in a mixed group | Not supported by supplier: no women-only seat rule for Oman Air |
| TC-SM-GEN-005 | Female titles are 'Ms' and 'Mrs', for children as well as adults | Not supported by supplier: no women-only seat rule for Oman Air |
| TC-SM-PER-002 | Seats, meals and bags all work together | Meals, baggage or other extras |
| TC-SM-PER-004 | What happens when the time limit runs out | Not about the seat map |
| TC-SM-NEG-004 | Two agents choosing the same seat at the same time | Not approved at Review in the checklist |
| TC-SM-NEG-006 | Opening the booking page with a broken or missing link | Not about the seat map |
| TC-SM-CAB-002 | The fare package decides WHICH seats are offered, not only their price | Bundle |
| TC-SM-CAB-003 | 'Not offered' sections can be told apart from single taken seats | Package-dependent objective, not rewritten (human decision) |
| TC-SM-CAB-004 | The Business row has its middle seats blocked | Expected result specific to another aircraft |
| TC-SM-CAB-005 | Packages, meals and bags change with the cabin | Meals, baggage or other extras |
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

## 4. Comparison Report — Oman Air vs NDC Admin vs NDC Portal

| # | Result | What | Oman Air website | NDC Admin | NDC Portal |
|---|---|---|---|---|---|
| C1 | DIFFERENT — defect candidate (High) | Exit rows 18-19 (12 seats: 18A-F, 19A-F) | Not available for this party (adult + child + infant): `available: false`, price USD 37 / 38.3 / 38.8 | Available and eligible for BOTH the adult (who holds the infant) and the child, at EGP 2,080 / 2,150 / 2,177. The seats' own descriptions say "Seat not allowed for infant". | Same as Admin |
| C2 | DIFFERENT (Low) | Bassinet seats | 6 seats flagged BASSINET (10A-10F) | Only 4 seats carry "Seat with bassinet facility"; 10C and 10D do not | Same as Admin |
| C3 | DIFFERENT inside NDC (Low) | Aircraft type | "Boeing 737" | Flight details: "Aircraft: 738". Seat map: "73M" (737 MAX 8) | Same as Admin |
| C4 | MATCH (channel currency) | Seat prices | 9 levels, USD 10 / 11.3 / 11.9 / 16.9 / 18.2 / 18.7 / 37 / 38.3 / 38.8 | 9 levels, EGP 565 / 634 / 662 / 951 / 1,021 / 1,048 / 2,080 / 2,150 / 2,177. Every seat maps one-to-one (EGP / USD between 55.6 and 56.5). Different currency is expected, not a defect. The exchange rate itself was not validated (PRC-005 is out of scope). | Same as Admin |
| C5 | MATCH | Seat set and layout | 150 seats, rows 10-35 (no row 13), A-C \| D-F | 150 seats, same rows and letters, 3-3 | Same |
| C6 | MATCH | Availability (except the exit rows) | 30 not available | 18 not available (13 Blocked + 5 Occupied), the same 18 seats; the other 12 airline "not available" seats are the exit rows (C1) | Same |
| C7 | MATCH | Window / aisle / centre, exit-row marking | WINDOW 50, AISLE 50, CENTER 50, EXIT_ROW 12 | Window 50, Aisle 50, Centre 50, Exit 12, the same seats | Same |
| C9 | DIFFERENT — confirms C1 (High) | Exit rows by party (Groups 04 / 05 / 06) | Lone adult: all 12 exit seats available. Adult + child: all 12 NOT available. Adult + infant: all 12 NOT available. The airline applies the rule on its seat map, per party. | All 12 exit seats available and bookable in every party, for the adult with an infant and for the child (EXR-002 / 003 / 004 / 005 Failed) | Same as Admin |
| C10 | MATCH | Return trip maps (Group 09) | Two maps: WY 408 (150 seats) and WY 407 (150 seats) | Two maps: Onward WY408 · 73M (150) and Return WY407 · 73M (150) | Same |
| C11 | MATCH | Multi-city maps (Group 10) | Four maps: WY 408 (150), WY 603 (171), WY 610 (171), WY 407 (150); exit rows blocked for this party on all four | Four maps titled Trip 1 / 2 / 3 / 3: WY408 · 73M (150), WY603 · 739 (171), WY610 · 739 (171), WY407 · 73M (150) | Same |
| C8 | MATCH | Fares offered for WY 408 | Economy Super Saver / Comfort / Flex | The same three Economy fares as separate results (plus Business Comfort / Flex); Super Saver EGP 24,658 for 3 passengers | Same, EGP 24,658 |

Captures were taken on 2026-10-19 within a few hours. Seat availability can change between captures; apart from the exit rows, the three agreed seat by seat on WY 408. Groups 07 and 08 have no airline column: the airline returns one map per party, so the infant-link and seat-set rules (EXR-005, PAX-008) cannot be compared there without selecting seats. PAX-008 is Blocked — Requires Booking.

## 5. Defect Report

### D1 — Exit-row seats offered to an adult holding an infant and to a child

| | |
|---|---|
| Severity | High |
| Cases | TC-SM-EXR-002, TC-SM-EXR-003, TC-SM-EXR-004, TC-SM-EXR-005 (Failed); TC-SM-STA-006 (comparison); same fault as ancillaries-run-005 TC-SM-EXR-002 |
| Platforms | NDC Admin and NDC Portal |
| Observed | On WY 408 (10 Nov 2026), NDC Admin and Portal show all 12 exit-row seats (rows 18-19) as available and bookable for the adult who has the infant linked, and for the child. Oman Air's own website shows the same 12 seats as not available for that party. Per party on the airline site: lone adult = available, adult + child = not available, adult + infant = not available. NDC offers them in every case: the child can book 18A (EXR-003), the seat does not change when switching adult to child (EXR-004), the infant-holding adult can book 18A (EXR-002), and moving the infant link between two adults changes nothing (EXR-005). NDC's seat descriptions themselves say "Seat not allowed for infant". |
| Expected | An adult with an infant and a child may never sit in an exit seat. The seat should be refused on the seat map, as the airline does. |
| Impact | An agent can choose a seat the airline forbids. In run-005 such a booking was ticketed with no refusal. |
| Evidence | manual_execution/artifacts/admin/seatmap_WY408_response.json (passengerSeatOffers eligible: true for T1 and T2 on 18A-19F); manual_execution/artifacts/omanair-web/seatMap_WY408_response.json (available: false on 18A-19F) |

### D2 — Seats are silently dropped when a passenger detail is edited (known fault)

| | |
|---|---|
| Severity | Medium |
| Cases | TC-SM-CNF-018 |
| Platforms | NDC Admin and NDC Portal |
| Observed | With 26A and 27B confirmed (amount 25,885 EGP), going Prev, changing the child's last name and pressing Next drops both seats with no warning; the amount falls back to 24,658 and the button reads "Select Seat" again. Seen on Admin and Portal. Next after the edit re-sends add-pax; Next without an edit does not, and then seats survive (PER-001). |
| Expected | The seats survive, or the agent is warned before they are discarded. |
| Impact | Agents lose seat choices without noticing. |
| Evidence | manual_execution/artifacts/admin/TC-SM-CNF-018.png; manual_execution/artifacts/portal/TC-SM-CNF-018.png |

### D3 — Aircraft type on the flight details and on the seat map disagree

| | |
|---|---|
| Severity | Low |
| Cases | TC-SM-RND-006 |
| Platforms | NDC Admin and NDC Portal |
| Observed | The passenger page flight details say "Aircraft: 738"; the seat map left panel says "WY408 · 73M" (seat-map equipment 73M). The airline website says only "Boeing 737". |
| Expected | The seat map shows the same aircraft type as the flight the agent chose. |
| Impact | The agent cannot confirm the map belongs to the chosen aircraft. |
| Evidence | manual_execution/artifacts/admin/TC-SM-STA-002.png; manual_execution/artifacts/admin/seatmap_WY408_response.json |

### D5 — Seat charges are not split per journey in the price breakdown (known fault)

| | |
|---|---|
| Severity | Low |
| Cases | TC-SM-RTP-005 |
| Platforms | NDC Admin and NDC Portal |
| Observed | Return trip with seats on both journeys (662 + 565 outbound, 662 return): the breakdown shows one line "Seat Selection + 1,889". The per-journey cost is only visible in the Selected seats list. Admin and Portal. |
| Expected | Each journey seat charge is identifiable in the price breakdown. |
| Impact | The agency cannot see what each leg seats cost from the breakdown. |
| Evidence | manual_execution/artifacts/admin/TC-SM-RTP-005_MPX-006_summary.png; manual_execution/artifacts/portal/TC-SM-RTP-005_MPX-006_summary.png |

### D4 — Bassinet flag missing on 10C and 10D

| | |
|---|---|
| Severity | Low |
| Cases | Comparison C2 (no checklist case owns it) |
| Platforms | NDC Admin and NDC Portal |
| Observed | Oman Air marks 10A-10F as bassinet seats; NDC marks only 4 of them, not 10C and 10D. |
| Expected | NDC shows the same seat features as the airline. |
| Impact | An agent looking for a bassinet seat sees fewer options than the airline offers. |
| Evidence | manual_execution/artifacts/admin/seatmap_WY408_response.json; manual_execution/artifacts/omanair-web/seatMap_WY408_response.json |

Not raised as defects: **STA-004** (feature words outside the sheet's list — the list needs a business update first; same judgement as run-005), and the airline website's own behaviour (it pre-ticked a paid priority-boarding add-on and auto-added three insurance add-ons to its cart).

## 6. Execution Evidence

| Platform | Folder | Contents |
|---|---|---|
| Oman Air website | `manual_execution/artifacts/omanair-web/` | Group 01: `01_search_results_WY408.png`, `02_seatmap_WY408.png`, `seatMap_WY408_response.json`, `seatmap_WY408_normalized.json`. Groups 04 / 05 / 06 / 09 / 10: `G0x_*.png` and `seatMap_*_G0x_*.json` (raw, read-only GET) |
| NDC Admin | `manual_execution/artifacts/admin/` | search results, one screenshot per case state (`TC-SM-*.png`), `seatmap_WY408_response.json` |
| NDC Portal | `manual_execution/artifacts/portal/` | search results, one screenshot per case state (`TC-SM-*.png`), `seatmap_WY408_response.json` |

Where one screen proves several cases, one screenshot is named after all of them (for example `TC-SM-SEL-009_PRC-003_PER-007_PAX-001.png`). NAV-001 is evidenced in text only.

## 7. Booking Safety Confirmation

**No booking, reservation, PNR, hold, payment or ticket was created on any of the three platforms.**

| Platform | What was sent | Proof |
|---|---|---|
| Oman Air website | Search, flight select, passenger details (dummy data), extras page. In every setup captured there (01, 04, 05, 06, 09, 10) the step from Extras to Seats was pressed **by the human** (the auto-mode classifier refuses it). The site pre-ticks priority boarding and a newsletter box; both were unticked each time. No seat selected, payment page never opened, no Hold option pressed | Cart response after passenger submission: `recordLocator: null`, `status: null`. The cart was left unpaid |
| NDC Admin | `flight-search/search`, `fare-confirmation` (pricing), `add-pax`, `seat-map`. Seat Book / Confirm / Change / Clear sent no request at all | Full network list filtered for book / confirm / order / hold / pay / ticket / pnr / reserv: no booking-confirm, book-and-pay, hold or order call. The page shows "Book and Hold are not available for this flight" |
| NDC Portal | Same calls as Admin. The "Payment Warning" (agency wallet blocked by its credit limit) was acknowledged with OK only | Same network filter: no booking call |

Final Book, Book & Pay, Hold, payment and ticket issuance were never pressed.

## 8. Not done in this run

- Setup Group 02 (CAB-001, CAB-007) — conditional, waiting for the Business cabin decision.
- Oman Air website for Groups 07 and 08 — not comparable (one map per party on the airline site).
- No seat was selected on the Oman Air website, so airline-side selection behaviour was not compared.

## 9. Setups executed

| Group | Flight(s) | Passengers | Cases | NDC result (Admin = Portal) | Oman Air website |
|---|---|---|---|---|---|
| 01 | WY 408 CAI→MCT 10 Nov 2026, Economy Super Saver | 1 adult + 1 child + 1 infant | 35 | 32 Passed · 2 Failed (RND-006, CNF-018) · 1 Inconclusive (STA-004) | Captured (read-only) |
| 04 | WY 408 | 1 adult | EXR-001 | Passed | Captured: exit seats available |
| 05 | WY 408 | 1 adult + 1 child | EXR-003, EXR-004 | Failed, Failed | Captured: exit seats blocked |
| 06 | WY 408 | 1 adult + 1 infant | EXR-002 | Failed | Captured: exit seats blocked |
| 07 | WY 408 | 2 adults + 1 infant | EXR-005 | Failed | N/A (one map per party) |
| 08 | WY 408 | 2 adults + 2 infants | PAX-008 | Blocked — Requires Booking | N/A (one map per party) |
| 09 | WY 408 (10 Nov) + WY 407 MCT→CAI (17 Nov), Super Saver | 1 adult + 1 child + 1 infant | RND-010, RTP-001, RTP-004, MPX-006, RTP-005 | 4 Passed · 1 Failed (RTP-005) | Captured: 2 maps |
| 10 | WY 408 / WY 603 MCT→DXB (12 Nov) / WY 610 + WY 407 DXB→MCT→CAI (14 Nov) | 1 adult + 1 child + 1 infant | MCT-003, MCT-007, RND-007 | 3 Passed | Captured: 4 maps |
| 02 | WY 408 Business | — | CAB-001, CAB-007 | Not Executed (conditional) | — |

## 10. Execution timeline

1. Scope agreed in five rounds (Seat Map only; 49 included, 2 conditional, 73 excluded; seat-only adjustments; Book Seat / Confirm Seat confirmed as pre-booking; one-time exception to the runner-only rule).
2. Run created through run_manager; Capability Plan generated with capability_gate; ApprovedScope.md written.
3. Flight chosen on the airline site first (WY 408, the only CAI→MCT flight that day) and found identical on NDC Admin and Portal (EGP 24,658 for 3 passengers).
4. Oman Air: Extras → Seats refused by the Claude Code auto-mode classifier; the human pressed Continue for every captured setup. Pre-ticked priority boarding and newsletter unticked each time; auto-added insurance add-ons left unpaid.
5. NDC Portal and Admin show an informational "Payment Warning" (agency wallet blocked by its credit limit); acknowledged with OK only.
6. Group 01 on Admin then Portal; then Setups 04-10 on both; then airline captures for 04, 05, 06, 09, 10.
7. One airline multi-city attempt picked the wrong third journey (WY 604); caught before passenger entry, omanair.com cookies cleared (NDC sessions kept), redone with WY 610 + WY 407.
8. Final network check on both NDC tabs: no booking-confirm, book-and-pay, hold, order, ticket or payment call.

## 11. Left behind by this run

| Item | Where | Note |
|---|---|---|
| Saved passenger profiles | NDC agency AGN9799 | NDC saves new passengers to the customer profile: Seatmap Testadult / Testchild / Testinfant and Alpha / Bravo / Charlie / Delta / Echo Seatmaptest (dummy). Delete if the profile list must stay clean |
| Unpaid airline carts | book.omanair.com | Six abandoned carts, no record locator; they expire on their own |
| Credentials in chat | Admin + Portal | Used only to log in, written nowhere; change the passwords |
