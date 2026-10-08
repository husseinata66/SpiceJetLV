# Manual Execution Results - Ancillaries / OmanAir / Admin

## 1. Execution Metadata

| | |
|---|---|
| Run | run-009__2026-10-04_18-30-46__Targeted__Ancillaries-OmanAir-Admin |
| Run Scope / Type | Targeted - Supplier Feature (Ancillaries, OmanAir), testing layer Admin |
| Environment | Staging - Admin http://192.168.1.237 (supplier credential: OmanAir Staging) |
| Window | 2026-10-04 to 2026-10-05 |
| Executed by | Claude Code, with the tester (Mohanad Dawood) pressing every booking, hold and payment button |
| Browser | Playwright MCP, headed, 1920x1080 |
| Suite | TestCases_AncillariesSeatMap.xlsx (read from the workbook; no Markdown suite or Traceability Matrix exists for this suite) |
| Capability gate | 92 pass the gate, 32 excluded by the generated CapabilityPlan.md; 9 more excluded at execution; 2 Rejected at Review |
| Safety | SafetyPreflight.md written. Book, Hold and Payment are absolute prohibitions in the project policy; this stage pressed none of them. The policy file was not changed (a temporary edit was reverted). The tester pressed Book, Hold and Confirm To Pay. 'Take Control' (PNR lock) was pressed by this stage on the tester's instruction for the self-created hold. |

## 2. Execution Summary

Suite total **124**. Executable scope **81** (suite total minus 43 Excluded). Of the scope: **61 Passed**, **8 Failed**, **2 Inconclusive**, **10 Not Executed**, 0 Blocked, 0 Skipped.

Pass rate against the executable scope: **75.3%** (61 of 81). Pass rate against cases actually executed: **85.9%** (61 of 71).

## 3. Per-Test Results

| Test Case ID | Group | Title | Status | Reason / observation |
|---|---|---|---|---|
| TC-SM-NAV-001 | A.  | You can only pick seats on step 2 | Passed | Two steps (Passenger Info, Ancillaries); step 1 not named 'and Bundles' because supplier has no fare packages |
| TC-SM-NAV-002 | A.  | You cannot reach the seats without choosing a fare package | Excluded | Not supported by supplier (Bundle) - Requires omitted Bundle; excluded at execution on tester instruction |
| TC-SM-NAV-002b | A.  | Missing passenger details and a missing fare package are both reported | Excluded | Not supported by supplier (Bundle) - same reason as NAV-002 |
| TC-SM-NAV-003 | A.  | 'Select Seat' opens the seat map | Passed | Seat map opens on leg 2 MCT-JED with left panel, chart, colour key, bottom button; leg 1 CAI-MCT has no supplier seat map; title is per leg |
| TC-SM-NAV-005 | A.  | You can skip seats completely | Passed | Continue without seats closes map, no seat, Net Payable unchanged 28,865.4 |
| TC-SM-RND-001 | B.  | The seat total matches the seats you can see | Passed | Total 189 = 189 seats drawn (MCT-JED WY673 73M) |
| TC-SM-RND-002 | B.  | Every seat has one clear state and one seat number | Passed | 189 unique seat ids, row numbers match, states: 179 available-paid + 10 blocked = 189 |
| TC-SM-RND-003 | B.  | Every seat has a full description | Passed | All 189 descriptions carry seat, row, side, section, features, end 'Blocked' (10) or 'available for EGP n' (179); printed seat text matches |
| TC-SM-RND-005 | B.  | Cabin and section information agrees with the map | Passed | Single Economy cabin on the colour key and on the map; one deck (Main deck) |
| TC-SM-RND-006 | B.  | The flight shown on the map is the flight you chose | Passed | Left panel MCT-JED WY673 73M, departs Thu 15 Oct 23:15 arrives 16 Oct 00:45 = chosen flight WY-673; aircraft type not shown on results so not cross-checked |
| TC-SM-RND-007 | B.  | Two different flights give two different maps | Passed | WY673 map has 189 seats; WY689 map has 150 seats: two different maps, each matching its own flight. Both report aircraft type 73M, so a truly different aircraft type was not available on this route |
| TC-SM-RND-010 | B.  | Each flight in a trip gets its own map | Passed | Round trip CAI-JED (15 to 20 Oct) has a separate map per flight, each titled with its own route and direction: CAI->MCT Onward Leg 1 (WY408, 150 seats), MCT->JED Onward Leg 2 (WY673, 189), JED->MCT Return Leg 1 (WY674 739, 171). Return Leg 2 (MCT->CAI) has no supplier map ('No seat map is available for this flight segment') |
| TC-SM-STA-002 | C.  | A taken seat can be looked at but not booked | Passed | Blocked seat 10A: box says 'Blocked' and 'Seat 10A is blocked.'; button 'Seat unavailable' disabled; no error; count unchanged 0/2 |
| TC-SM-STA-004 | C.  | Seat features use known wording | Inconclusive | Feature words outside the case's known list appear: Seat not allowed for infant, Seat not allowed for medical, Overwing seat(s), Center seat (not window, not aisle), Bulkhead seat, Seat with bassinet facility, Seat to be left vacant or offered last, Seat designated for RBD, Front of cabin class/compartment, Left/Right side of aircraft. 'Leg space seat' and 'Female designated seat' not present. The list looks incomple |
| TC-SM-STA-005 | C.  | Window and aisle labels match where the seat really is | Passed | 63 Window seats all at row edges; 63 Aisle seats all next to the walkway (row 42 has only the left block so 42C is the aisle); middle seats carry neither label |
| TC-SM-STA-006 | C.  | Emergency exit seats are marked | Passed | Exit and emergency exit on rows 24 and 25, all six seats each, side by side; also marked Overwing, not allowed for infant/medical; 'Leg space seat' not present (case says 'usually') |
| TC-SM-STA-007 | C.  | Women-only seats are marked clearly | Excluded | Not supported by supplier: Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-SEL-001 | D.  | One click only shows the seat - it does not book it | Passed | One click opens the seat box; count stays 0/2, no seat on the card, bottom button stays 'Continue without seats' |
| TC-SM-SEL-002 | D.  | A seat is only taken when you press the button in the box | Passed | Button read 'Book 11A for Khalidzrrjz' (real seat and first name); after pressing: 1/2, card shows 11A / Economy / EGP 847 / ASSIGNED, seat colour changed |
| TC-SM-SEL-003 | D.  | The seat information box is correct | Passed | Seat box shows Available paid, seat 11A, EGP 847, Economy Main deck, Left side window wall, Row 11 2nd of 32 rows in Y1; agrees with the seat description |
| TC-SM-SEL-006 | D.  | The bottom button changes as seats are chosen | Passed | Button order: Continue without seats -> Confirm 1 of 2 seats -> Confirm 2 seats; Clear all seats present; cards ACTIVE/SELECT/ASSIGNED/SELECTED; infant not counted (2 of 2 for 3 passengers) |
| TC-SM-SEL-007 | D.  | Moving a passenger to another seat frees the first seat | Passed | Moving adult 11A->14A: adult holds only 14A, 11A free again, count still 2/2 |
| TC-SM-SEL-008 | D.  | 'Clear all seats' also removes the seat charge | Passed | Clear all seats: 0/2, 'No seat charges Free', button back to Continue without seats, seats free; after leaving the map Net Payable back to 28,865.4 |
| TC-SM-SEL-009 | D.  | Confirming saves the seat and closes the map | Passed | Confirm 2 seats closed the map; 'Selected seats - 2 travellers' lists names/seat/price (15A 847, 15B 751); button became 'Change Seats'; 'Seat Selection' line added; Net Payable 28,865.4 -> 30,463.4 (+1,598) |
| TC-SM-SEL-010 | D.  | 'Change Seats' reopens the map with your choice still there | Passed | Change Seats reopened the map with both seats still chosen, count 2/2, cards show 15A and 15B |
| TC-SM-SEL-012 | D.  | A seat held by another passenger in your booking is marked | Passed | Seat 12A held by child: adult sees 'Assigned to another passenger' (disabled) and 'selected for Mariamukjpm Zaabissllx' (full name) |
| TC-SM-MPX-002 | E.  | The seat goes to the passenger who is selected | Passed | First seat went to the active passenger (button named them); app auto-selected the next passenger; second seat went to them; first kept theirs; count 2/2 |
| TC-SM-MPX-004 | E.  | Two passengers cannot have the same seat | Passed | Second passenger cannot take a seat held by the first: shown as held with full name; no duplicate |
| TC-SM-MPX-006 | E.  | Seats on one flight do not affect the other flight | Passed | Return map started empty; booking 11A on the return did not disturb onward 11A; the summary lists each flight separately (Onward 11A EGP 847, Return 11A EGP 923) |
| TC-SM-MPX-007 | E.  | Some passengers can have seats and others none | Passed | Confirmed with 1 of 2 seats: summary lists the one seated passenger (16A, EGP 847) and Book/Hold are still available |
| TC-SM-PRC-001 | F.  | A seat included in the fare package costs nothing | Excluded | Not supported by supplier: Needs Bundle â€” Not Supported by this supplier |
| TC-SM-PRC-002 | F.  | A seat marked 'Chargeable seat' must always have a price | Excluded | Not supported by supplier (Bundle) - case needs the Plus and Value fare packages; excluded at execution. For information: all 189 seats are 'Chargeable seat' and none is priced zero |
| TC-SM-PRC-003 | F.  | A paid seat is added as its own line in the price | Excluded | Not supported by supplier (Bundle) - case starts from the Value fare package. For information: confirming a paid seat added a separate 'Seat Selection' line and raised Net Payable by exactly the seat prices (see SEL-009) |
| TC-SM-PRC-003b | F.  | One aircraft can have several seat prices at once | Passed | 9 distinct seat prices on one aircraft (EGP 526 to 1,583); section header 'from EGP 526' equals the lowest seat price; no zero-priced seat |
| TC-SM-PRC-004 | F.  | The price breakdown adds up | Passed | Base 8,327 + 7,070 + 838 + tax 5,160.8 + 5,160.8 + 2,308.8 + seat 847 = 29,712.4 = Net Payable; Seat Selection line only after a paid seat is confirmed |
| TC-SM-BND-002 | G.  | Changing the fare package recalculates the seats | Excluded | Not supported by supplier: Needs Bundle â€” Not Supported by this supplier |
| TC-SM-BND-003 | G.  | Each flight uses its own fare package | Excluded | Not supported by supplier: Needs Bundle â€” Not Supported by this supplier |
| TC-SM-BND-004 | G.  | Fare package names are never blank or repeated | Excluded | Not supported by supplier: Needs Bundle â€” Not Supported by this supplier |
| TC-SM-BND-005 | G.  | What the package promises about seats is what you get | Excluded | Not supported by supplier: Needs Bundle â€” Not Supported by this supplier |
| TC-SM-GEN-001 | H.  | A women-only seat is refused to a male passenger | Excluded | Not supported by supplier: Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-GEN-002 | H.  | A women-only seat is offered to a female passenger | Excluded | Not supported by supplier: Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-GEN-002b | H.  | The hidden seat data matches what is shown on screen | Excluded | Not supported by supplier: Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-GEN-003 | H.  | Gender comes from the title and cannot be edited | Passed | Gender box is read-only (no options): Male for Mr, Female for Ms and for Mrs, and back to Male for Mr |
| TC-SM-GEN-004 | H.  | Each passenger sees their own seats in a mixed group | Excluded | Not supported by supplier: Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-GEN-005 | H.  | Female titles are 'Ms' and 'Mrs', for children as well as adults | Excluded | Not supported by supplier: Supplier rule "ladies-only-seats" does not apply to this supplier |
| TC-SM-PER-001 | I.  | Seats survive going back a step | Passed | After Prev and Next, 'Selected seats - 1 traveller' still lists 16A at EGP 847 and Net Payable is unchanged 29,712.4. The map button reads 'Seat 1 more' because only 1 of 2 passengers has a seat |
| TC-SM-PER-002 | I.  | Seats, meals and bags all work together | Excluded | Not supported by supplier: Needs Meal â€” Not Supported by this supplier; Needs Baggage â€” Not Supported by this supplier |
| TC-SM-PER-004 | I.  | What happens when the time limit runs out | Not Executed | Needs the 60-minute time limit to run out; not waited in this session. Can be run on request |
| TC-SM-PER-007 | I.  | The seat appears on the payment summary | Passed | Selected seat 16A (EGP 847), the 'Seat Selection +847' line and Net Payable 29,712.4 all appear on the payment summary; Book was not pressed |
| TC-SM-NEG-003 | J.  | Clicking quickly does not book two seats | Passed | Six rapid clicks on 'Book 16A for ...' gave one seat: count 1/2, one line on the card |
| TC-SM-NEG-004 | J.  | Two agents choosing the same seat at the same time | Excluded | Rejected at Review |
| TC-SM-NEG-006 | J.  | Opening the booking page with a broken or missing link | Failed | Changed token: page shows 'No Data Found - One or more parameters are invalid or missing.' with Go Back / Go Home, no prices or seat map, no technical error, but the agent is NOT sent back to the flight search page. Missing token: the app re-used the last stored token (first time it re-showed the live booking with prices; second time the stored token was the tampered one and it showed the same error page). Expected:  |
| TC-SM-A11Y-001 | K.  | The seat map works on a smaller screen | Passed | At 480px width: no sideways page scroll, left panel stays usable, scrolled to the last row (42) and booked 42B (count 1/2). Seat 42A was blocked so 42B was used. Evidence: evidence/A11Y-001_narrow_lastrow.png |
| TC-SM-A11Y-002 | K.  | Seat states can be read by screen readers | Passed | Each seat is a button whose label states 'available for EGP n' or 'Blocked'; the book button names the seat and passenger. Note: blocked seats are not marked aria-disabled, only described as Blocked |
| TC-SM-CAB-001 | L.  | The same flight gives a different map in each cabin | Excluded | Not supported by supplier: Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-CAB-002 | L.  | The fare package decides WHICH seats are offered, not only their price | Excluded | Not supported by supplier: Needs Bundle â€” Not Supported by this supplier; Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-CAB-003 | L.  | 'Not offered' sections can be told apart from single taken seats | Excluded | Not supported by supplier: Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-CAB-004 | L.  | The Business row has its middle seats blocked | Excluded | Not supported by supplier: Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-CAB-005 | L.  | Packages, meals and bags change with the cabin | Excluded | Not supported by supplier: Needs Bundle â€” Not Supported by this supplier; Needs Meal â€” Not Supported by this supplier; Needs Baggage â€” Not Supported by this supplier; Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-CAB-007 | L.  | A two-cabin aircraft shows both cabins properly | Excluded | Not supported by supplier: Supplier rule "business-cabin" does not apply to this supplier |
| TC-SM-PAX-001 | M.  | Infants get no seat and no extras; children get both | Passed | Infant appears nowhere on step 2 (no seat, meal or bag); count reads 0 of 2 with 3 passengers; child can have a seat; summary '2 travellers' when both were seated |
| TC-SM-PAX-003 | M.  | An infant must be linked to an adult | Passed | 'Assigned to' appears only for the infant (one dropdown) and lists only the adult; the child is not offered |
| TC-SM-PAX-004 | M.  | The map moves on to the next passenger automatically | Passed | After the first seat the next unseated passenger became ACTIVE and the Book button named them; seated passenger shows SELECTED when active, ASSIGNED otherwise |
| TC-SM-PAX-006 | M.  | Each passenger type is priced separately | Passed | Fare and tax are listed per passenger type (adult 8,327 / child 7,070 / infant 838; tax 5,160.8 / 5,160.8 / 2,308.8); baggage allowance listed per type and leg (carry-on 1 piece, checked 20 KG for adult, child and infant). The case's 'Business / Check with Airline' details come from another supplier and do not apply |
| TC-SM-PAX-007 | M.  | Closed passenger sections still report missing information | Passed | Collapse All closes the passenger sections (screenshot); with a closed passenger incomplete, Next stays on step 1 and reports 'Required'. Limitation: 'cannot type into a closed section' and 'only one section open' could not be proven by script; visual check only. Evidence: evidence/PAX-007_collapsed_state.png |
| TC-SM-FRC-001 | N.  | A changed price is shown before the booking screen | Excluded | Not supported by supplier: the fare-change 'Price Update' on infant bookings is Flynas-specific behaviour and does not happen with other suppliers. Excluded at execution on the tester's instruction (should carry a Supplier Rule so the gate excludes it) |
| TC-SM-FRC-002 | N.  | Accepting the new price carries it forward | Excluded | Not supported by supplier: the fare-change 'Price Update' on infant bookings is Flynas-specific behaviour and does not happen with other suppliers. Excluded at execution on the tester's instruction (should carry a Supplier Rule so the gate excludes it) |
| TC-SM-FRC-003 | N.  | Cancelling leaves nothing behind | Excluded | Not supported by supplier: the fare-change 'Price Update' on infant bookings is Flynas-specific behaviour and does not happen with other suppliers. Excluded at execution on the tester's instruction (should carry a Supplier Rule so the gate excludes it) |
| TC-SM-FRC-005 | N.  | Every later total uses the accepted price | Excluded | Not supported by supplier: the fare-change 'Price Update' on infant bookings is Flynas-specific behaviour and does not happen with other suppliers. Excluded at execution on the tester's instruction (should carry a Supplier Rule so the gate excludes it) |
| TC-SM-ERR-001 | O.  | A server failure must not look like 'No Flights Found' | Passed | Observed once: a search returned 'No Flights Found'; reloading the same search straight away returned 45 options, consistent with the accepted known behaviour (a transient server failure shown as 'No Flights Found'). HTTP status was not captured; not reported as a fault |
| TC-SM-ERR-002 | O.  | The session ending in the middle of a booking | Not Executed | Needs about 10 to 12 minutes of idle time then Next; not run in this session. Can be run on request |
| TC-SM-ERR-004 | O.  | Typing in one dropdown must not affect another | Passed | Nationality list has 249 options; typing 'egy' narrowed it to 1; after picking Egypt the second nationality dropdown opened with all 249 and an empty filter box. The earlier bug did not recur |
| TC-SM-ERR-005 | O.  | Each offer says which airline connection it came from | Passed | Every result card names its connection 'OmanAir Staging' |
| TC-SM-EXR-001 | P.  | An adult travelling alone CAN take an exit seat | Not Executed | Needs the booking attempt (adult alone books an exit seat): tester presses Book |
| TC-SM-EXR-002 | P.  | An adult with an infant CANNOT take an exit seat | Failed | Booking BK-3 (order AGN9809UPLUPLORD261005KSDT7A, GDS PNR OU2K41, airline PNR JXROTA): Hold pressed by the tester, PNR locked with 'Take Control' (tester's instruction), then 'Confirm To Pay' pressed by the tester. Adult with an infant on an exit seat. The hold was accepted and then ticketed (Ticketed Document, tickets 91041001021062 adult, 91041001021073 child, 91022013762584 infant) with the adult holding the infan |
| TC-SM-EXR-003 | P.  | A child CANNOT take an exit seat | Failed | Booking BK-3 (order AGN9809UPLUPLORD261005KSDT7A, GDS PNR OU2K41, airline PNR JXROTA): Hold pressed by the tester, PNR locked with 'Take Control' (tester's instruction), then 'Confirm To Pay' pressed by the tester. Child on an exit seat. The hold was accepted and then ticketed (Ticketed Document, tickets 91041001021062 adult, 91041001021073 child, 91022013762584 infant) with the adult holding the infant on exit seat  |
| TC-SM-EXR-004 | P.  | The rule is rechecked when you switch passenger | Failed | Booking BK-3 (order AGN9809UPLUPLORD261005KSDT7A, GDS PNR OU2K41, airline PNR JXROTA): Hold pressed by the tester, PNR locked with 'Take Control' (tester's instruction), then 'Confirm To Pay' pressed by the tester. The same exit seat was bookable and was ticketed for both the infant-holding adult and the child, so the rule does not change with the passenger. The hold was accepted and then ticketed (Ticketed Document, |
| TC-SM-EXR-005 | P.  | The rule follows the infant's linked adult | Not Executed | Needs the booking attempt (infant link moved between two adults): tester presses Book |
| TC-SM-EXR-007 | P.  | An exit seat already taken is dealt with when an infant is added later | Excluded | Rejected at Review |
| TC-SM-RTP-001 | S.  | A return trip gives one seat map per journey | Passed | Step 2 shows one Select Seat button per flight (4) titled Onward/Return Leg 1/2; three open their own map on their own aircraft, one has no supplier map |
| TC-SM-RTP-003 | S.  | Each journey's fare package sets that journey's seat prices | Excluded | Not supported by supplier: Needs Bundle â€” Not Supported by this supplier |
| TC-SM-RTP-004 | S.  | Seat maps are completely separate per journey | Passed | After confirming 11A on Onward Leg 2, the Return Leg 1 map opened empty (0/2) on its own aircraft; the same seat 11A was still available there (EGP 923); only the onward button changed (to 'Seat 1 more') |
| TC-SM-MCT-003 | S.  | Three journeys give three seat maps and three sets of ancillaries | Not Executed | The multi-city search form could not be filled reliably by script in this session (airport pickers); to be run by hand or in a later pass. Seat maps per flight were already confirmed on a round trip (RND-010, RTP-001) |
| TC-SM-MCT-004 | S.  | A seat booked on one flight never appears against another | Not Executed | Needs a multi-city booking; the multi-city search form could not be driven reliably in this session |
| TC-SM-MCT-007 | S.  | Seat maps follow FLIGHTS, fare packages follow JOURNEYS | Excluded | Not supported by supplier (Bundle, Meal) - the case counts fare-package boxes and meal boxes, which OmanAir does not have; excluded at execution |
| TC-SM-MCT-005 | S.  | Seats and ancillaries survive to the confirmation page per flight | Not Executed | Needs a multi-city booking with seats; same reason as MCT-004 |
| TC-SM-MCT-006 | S.  | Extra baggage should say which flight it belongs to | Excluded | Not supported by supplier: Needs Baggage â€” Not Supported by this supplier |
| TC-SM-RTP-005 | S.  | Seat and ancillary charges should be identifiable per journey | Failed | Known fault still present: the price breakdown merges the journeys into one base fare per passenger type, one tax per type and a single 'Seat Selection +1,770 EGP' line (847 onward + 923 return). Charges are not identifiable per journey in the breakdown panel (the 'Selected seats' list does show each flight's seat price) |
| TC-SM-CNF-001 | Q.  | The confirmation total equals what was quoted | Passed | Booking BK-2 (order AGN9809UPLUPLORD261005LTJDWT, PNR 2HN72Z / JSUIRQ, ticket 91022013762540), booked by the tester. Confirmation total 30,013.4 EGP equals the quoted Net Payable 30,013.4 |
| TC-SM-CNF-002 | Q.  | Every price line survives the booking unchanged | Passed | Booking BK-2 (order AGN9809UPLUPLORD261005LTJDWT, PNR 2HN72Z / JSUIRQ, ticket 91022013762540), booked by the tester. Base 16,235 (8,327+7,070+838), taxes 12,630.4, seats 1,148 all unchanged from the quote |
| TC-SM-CNF-003 | Q.  | Every ancillary reaches the confirmation with its own price | Passed | Booking BK-2 (order AGN9809UPLUPLORD261005LTJDWT, PNR 2HN72Z / JSUIRQ, ticket 91022013762540), booked by the tester. The only ancillary offered is Seat: 20A EGP 622 and 20B EGP 526 appear with their own prices on the order page; meal/baggage columns show '-' (not offered by this supplier) |
| TC-SM-CNF-004 | Q.  | Seats carry through to the right passenger with the right price | Passed | Booking BK-2 (order AGN9809UPLUPLORD261005LTJDWT, PNR 2HN72Z / JSUIRQ, ticket 91022013762540), booked by the tester. Seat 20A is on the adult at EGP 622 and 20B on the child at EGP 526 on the confirmation, order page and e-ticket |
| TC-SM-CNF-007 | Q.  | Infants appear as passengers but carry no seat or ancillaries | Passed | Booking BK-2 (order AGN9809UPLUPLORD261005LTJDWT, PNR 2HN72Z / JSUIRQ, ticket 91022013762540), booked by the tester. The infant appears as a passenger (own ticket 91022013762551) with no seat or extras |
| TC-SM-CNF-008 | Q.  | The e-ticket and the confirmation page agree exactly | Passed | Booking BK-2 (order AGN9809UPLUPLORD261005LTJDWT, PNR 2HN72Z / JSUIRQ, ticket 91022013762540), booked by the tester. E-ticket (separate tab) matches the confirmation: ticket numbers, PNR JSUIRQ, booking ref, flights WY-408/WY-673, seats, baggage, base 16,235 / taxes 12,630.4 / seats 1,148 / total 30,013.4. Evidence: evidence/BK2_e-ticket.png |
| TC-SM-CNF-010 | Q.  | The wallet is reduced by exactly the booking amount | Passed | Wallet History Report: top-up balance 1,047,245.8 before and 1,017,232.4 after BK-2, a difference of exactly 30,013.4; payment record Wallet, Settled, 30,013.40 (transaction NDCEG-TR261005SeT9w6) matches the booking. Total wallet shown in the wizard went 1,147,245.8 -> expected 1,117,232.4 |
| TC-SM-CNF-011 | Q.  | The Costing tab adds up and is the figure to trust | Passed | Booking BK-2 (order AGN9809UPLUPLORD261005LTJDWT, PNR 2HN72Z / JSUIRQ, ticket 91022013762540), booked by the tester. Costing tab: 13,487.80 + 12,230.80 + 3,146.80 + seats 1,148.00 = 30,013.40 = Total Sales = Total Net = Amount Received. 'Total Booking Amount' shows 30,014.00 (rounded up) |
| TC-SM-CNF-012 | Q.  | The order page itemises every ancillary and reconciles | Passed | Booking BK-2 (order AGN9809UPLUPLORD261005LTJDWT, PNR 2HN72Z / JSUIRQ, ticket 91022013762540), booked by the tester. Order page itemises each seat per passenger (622, 526), SSR total 1,148 equals their sum, and reconciles to the costing figures |
| TC-SM-CNF-015 | Q.  | Walking away before 'Book' creates nothing - THE SAFE TEST | Passed | Abandoned wizard changed nothing: wallet 1,147,245.8 before and after, and no order exists for the abandoned passengers (only the failed attempt and BK-2 exist) |
| TC-SM-CNF-016 | Q.  | Extra baggage must not clash with the baggage already in the fare package | Excluded | Not supported by supplier: Needs Baggage â€” Not Supported by this supplier |
| TC-SM-CNF-017 | Q.  | A failed booking must be reported as failed everywhere | Passed | First attempt (order AGN9809UPLUPLORD261005SFBNM9) failed with 'The offer has been expired': confirmation page status Failed with no PNR or ticket, and the order page shows 'Booking Failed' with no payment. Wallet stayed 1,147,245.8 EGP before the retry. Cause was the offer timing out while waiting for the tester, not a product fault |
| TC-SM-CNF-018 | Q.  | Going back a step must not silently throw away seats and ancillaries | Passed | After Prev to step 1 and Next, 'Selected seats' and the price were unchanged (see PER-001: 16A, EGP 847, Net 29,712.4) |
| TC-SM-PAX-008 | M.  | Two infant-holding adults cannot sit in the same set of seats | Not Executed | Held: in the seat map the second infant-holding adult can pick the seats next to the first; the exit-seat rule turned out not to be applied at hold or ticketing, so this one needs its own booking attempt with two infant-holding adults |
| TC-SM-PRC-005 | F.  | Seat map and ancillary prices use the right exchange rate | Not Executed | Needs the supplier currency and its rate of exchange (ROE); Admin shows only EGP prices and no ROE. Needs the figures from the business |
| TC-SM-NAV-006 | A.  | A supplier with no seat selection shows no seat option | Excluded | Not supported by supplier: Only for suppliers without Seat â€” this supplier supports it |
| TC-ML-001 | T.  | Meals are offered per passenger and per flight | Excluded | Not supported by supplier: Needs Meal â€” Not Supported by this supplier |
| TC-ML-002 | T.  | An infant is not offered a meal | Excluded | Not supported by supplier: Needs Meal â€” Not Supported by this supplier |
| TC-ML-003 | T.  | Choosing and removing a meal changes the price correctly | Excluded | Not supported by supplier: Needs Meal â€” Not Supported by this supplier |
| TC-ML-004 | T.  | The meal list is separate from what the bundle includes | Excluded | Not supported by supplier: Needs Meal â€” Not Supported by this supplier; Needs Bundle â€” Not Supported by this supplier |
| TC-ML-005 | T.  | The chosen meal reaches the confirmation (SPENDS REAL MONEY) | Excluded | Not supported by supplier: Needs Meal â€” Not Supported by this supplier |
| TC-ML-006 | T.  | A supplier with no meals shows no meal choice | Passed | Step 2 shows only Seat Selection: no meal choice and no meal line in the price |
| TC-BG-001 | U.  | Extra baggage is offered per passenger and per journey | Excluded | Not supported by supplier: Needs Baggage â€” Not Supported by this supplier |
| TC-BG-002 | U.  | An infant is not offered extra baggage | Excluded | Not supported by supplier: Needs Baggage â€” Not Supported by this supplier |
| TC-BG-003 | U.  | Changing the bag weight replaces the bag, it does not add a second one | Excluded | Not supported by supplier: Needs Baggage â€” Not Supported by this supplier |
| TC-BG-005 | U.  | The extra bag reaches the confirmation (SPENDS REAL MONEY) | Excluded | Not supported by supplier: Needs Baggage â€” Not Supported by this supplier |
| TC-BG-006 | U.  | A supplier with no extra baggage shows no baggage choice | Passed | Step 2 shows no extra baggage choice and no baggage line in the price |
| TC-HLD-005 | V.  | Seats, meals and bags chosen before holding are kept on the held booking | Excluded | Not supported by supplier: Needs Meal â€” Not Supported by this supplier; Needs Baggage â€” Not Supported by this supplier |
| TC-PAH-002 | W.  | Paying takes exactly the booking amount from the wallet | Failed | Booking BK-3 (order AGN9809UPLUPLORD261005KSDT7A, GDS PNR OU2K41, airline PNR JXROTA): Hold pressed by the tester, PNR locked with 'Take Control' (tester's instruction), then 'Confirm To Pay' pressed by the tester. Paying took EGP 35,197.40 from the wallet but the booking is worth EGP 32,031.40 (Total Cost Payable). The difference, 3,166.00, equals the seat total, so the seats were charged twice. Wallet History: debi |
| TC-PAH-003 | W.  | A price change between hold and payment is shown before paying | Not Executed | Booking BK-3 (order AGN9809UPLUPLORD261005KSDT7A, GDS PNR OU2K41, airline PNR JXROTA): Hold pressed by the tester, PNR locked with 'Take Control' (tester's instruction), then 'Confirm To Pay' pressed by the tester. No price change happened between hold and payment (amount due stayed 32,031.40), so the 'price change is shown before paying' behaviour could not be seen. Needs a booking whose price changes |
| TC-PAH-004 | W.  | After payment the e-ticket is issued and matches the booking | Passed | Booking BK-3 (order AGN9809UPLUPLORD261005KSDT7A, GDS PNR OU2K41, airline PNR JXROTA): Hold pressed by the tester, PNR locked with 'Take Control' (tester's instruction), then 'Confirm To Pay' pressed by the tester. After payment the e-ticket was issued and matches the booking: tickets 91041001021062 / 91041001021073 / 91022013762584, seats 24A and 25A, base 16,235, taxes 12,630.4, seats 3,166, total 32,031.4. Note: t |
| TC-SM-BND-006 | G.  | A supplier with no fare packages shows no package step | Passed | Step 1 has no fare package choice; step 2 reached without one; no Bundle line in the price |
| TC-RPT-001 | X.  | A booking you just made appears in the reports | Inconclusive | Booking Report: searched branch BRN298 for 05/10/2026 and got 'No data has been found!', but the 'To Booking Date' box would not keep a typed date in this session (it stayed empty), so the search may not have been valid. Needs a manual check |
| TC-RPT-002 | X.  | A payment appears in the account statement with the right amount | Failed | Statement Report (branch BRN298, agency AGN9809, 05/10/2026 to 05/10/2026) shows 'No data has been found!' for the paid, ticketed booking AGN9809UPLUPLORD261005LTJDWT (wallet payment 30,013.40). Expected the payment with the right amount. The same gap was seen in run-007. Evidence: evidence/RPT-002_statement-report.png |
| TC-RPT-003 | X.  | The reports agree with the booking and with each other | Failed | Reports disagree: Wallet History Report lists the booking (order AGN9809UPLUPLORD261005LTJDWT, transaction NDCEG-TR261005SeT9w6, 30,013.4 EGP) and agrees with the order page, but the Statement Report lists nothing for it. In Wallet History the booking amount also sits under 'Credit Amount' and the balances under 'Debit Amount', which looks swapped |
| TC-RPT-004 | X.  | Extras bought with a booking are visible in the reports | Passed | Generic case, checked for the extras OmanAir supports (Seat only). BK-2: the Wallet History amount 30,013.4 includes the seat charge (1,148) and is traceable to the order by order id and transaction id. Limitation: the Statement Report showed nothing (see RPT-002), and for BK-3 the wallet amount 35,197.4 does not add up (see PAH-002) |

### 3.1 Defect records (Failed / Inconclusive)

#### TC-PAH-002 - Pay after Hold charges the seats twice

1. **Test Case ID:** TC-PAH-002  
2. **Execution Status:** Failed  
3. **Execution Time:** not timed  
4. **Preconditions:** A held booking (OU2K41 / JXROTA) with two paid seats, locked with Take Control.  
5. **Test Data:** Order AGN9809UPLUPLORD261005KSDT7A: base 16,235, taxes 12,630.4, seats 3,166 (24A 1,583 + 25A 1,583); amount due 32,031.40 EGP.  
6. **Steps Performed:** Held the booking, locked it, pressed Confirm To Pay (tester), waited for ticketing, then read the Costing & Payment tab and the Wallet History report.  
7. **Expected Result:** Paying the held booking should take exactly the booking amount from the wallet, 32,031.40 EGP, because the seats are already inside that amount.  
8. **Actual Result:** The wallet was debited 35,197.40 EGP. The payment record shows Total Cost Payable 32,031.40 but Amount Received 35,197.40. The extra 3,166.00 equals the seat total, so the seats were charged twice. The e-ticket shows the correct total of 32,031.4.  
9. **Impact:** The agency is overcharged by EGP 3,166.00 on every pay-after-hold booking that has paid seats, and the wallet, payment record and ticket disagree.  
10. **Classification:** Category: Data Integrity | Layer: Backend | Reproducibility: Always (1 booking, consistent in 3 places: payment tab, wallet history, balance) | Regression: Unknown | Suspected Component: Pay-after-hold payment amount calculation | Confidence: High  
11. **Root Cause Analysis (hedged):** Likely the payment amount is built from the sales total plus the seat amount again, while the held order's total already includes the seats.  
12. **Conclusion:** Pay after Hold collects the seat charge a second time, so the wallet is debited more than the booking is worth.  
13. **Severity:** High - money is taken from the agency in error.  
14. **Priority:** P0  
15. **Evidence:** see `ManualTestResults.csv` Evidence Paths and `evidence/`

#### TC-SM-EXR-002 - Exit seats are accepted for an adult who has an infant with them

1. **Test Case ID:** TC-SM-EXR-002  
2. **Execution Status:** Failed  
3. **Execution Time:** not timed  
4. **Preconditions:** 3 passengers: adult (holds the infant), child, infant. OmanAir staging, Admin.  
5. **Test Data:** Exit seats 24A (adult) and 25A (child) on WY673; booking AGN9809UPLUPLORD261005KSDT7A.  
6. **Steps Performed:** Chose 24A for the adult and 25A for the child in the seat map, confirmed, the tester pressed Hold, locked the PNR and pressed Confirm To Pay. Read the order and the e-ticket.  
7. **Expected Result:** The platform's rule says an adult with an infant and a child may never sit in an exit seat. The seat should be refused, at the latest when the booking is made or ticketed.  
8. **Actual Result:** The seat map offered the seats, the hold was accepted, and the booking was ticketed (tickets 91041001021062 adult, 91041001021073 child, 91022013762584 infant) with the adult on 24A and the child on 25A. No refusal or warning appeared at any step.  
9. **Impact:** A passenger who may not sit in an exit row is ticketed there, which breaks an airline safety rule and would reach the airline.  
10. **Classification:** Category: Business Rule | Layer: Backend/Integration | Reproducibility: Always (1 booking) | Regression: Unknown | Suspected Component: Exit-seat eligibility check for infant-holding adults and children | Confidence: Medium  
11. **Root Cause Analysis (hedged):** Likely OmanAir staging does not enforce the restriction and the platform does not check it itself. This is a supplier-behaviour question as well as a platform one.  
12. **Conclusion:** Neither the seat map nor the hold nor ticketing applies the exit-seat restriction for OmanAir.  
13. **Severity:** High - safety rule not applied.  
14. **Priority:** P1  
15. **Evidence:** see `ManualTestResults.csv` Evidence Paths and `evidence/`

#### TC-SM-EXR-003 - Exit seats are accepted for a child

1. **Test Case ID:** TC-SM-EXR-003  
2. **Execution Status:** Failed  
3. **Execution Time:** not timed  
4. **Preconditions:** 3 passengers: adult (holds the infant), child, infant. OmanAir staging, Admin.  
5. **Test Data:** Exit seats 24A (adult) and 25A (child) on WY673; booking AGN9809UPLUPLORD261005KSDT7A.  
6. **Steps Performed:** Chose 24A for the adult and 25A for the child in the seat map, confirmed, the tester pressed Hold, locked the PNR and pressed Confirm To Pay. Read the order and the e-ticket.  
7. **Expected Result:** The platform's rule says an adult with an infant and a child may never sit in an exit seat. The seat should be refused, at the latest when the booking is made or ticketed.  
8. **Actual Result:** The seat map offered the seats, the hold was accepted, and the booking was ticketed (tickets 91041001021062 adult, 91041001021073 child, 91022013762584 infant) with the adult on 24A and the child on 25A. No refusal or warning appeared at any step.  
9. **Impact:** A passenger who may not sit in an exit row is ticketed there, which breaks an airline safety rule and would reach the airline.  
10. **Classification:** Category: Business Rule | Layer: Backend/Integration | Reproducibility: Always (1 booking) | Regression: Unknown | Suspected Component: Exit-seat eligibility check for infant-holding adults and children | Confidence: Medium  
11. **Root Cause Analysis (hedged):** Likely OmanAir staging does not enforce the restriction and the platform does not check it itself. This is a supplier-behaviour question as well as a platform one.  
12. **Conclusion:** Neither the seat map nor the hold nor ticketing applies the exit-seat restriction for OmanAir.  
13. **Severity:** High - safety rule not applied.  
14. **Priority:** P1  
15. **Evidence:** see `ManualTestResults.csv` Evidence Paths and `evidence/`

#### TC-SM-EXR-004 - The exit-seat rule does not change when the passenger changes

1. **Test Case ID:** TC-SM-EXR-004  
2. **Execution Status:** Failed  
3. **Execution Time:** not timed  
4. **Preconditions:** 3 passengers: adult (holds the infant), child, infant. OmanAir staging, Admin.  
5. **Test Data:** Exit seats 24A (adult) and 25A (child) on WY673; booking AGN9809UPLUPLORD261005KSDT7A.  
6. **Steps Performed:** Chose 24A for the adult and 25A for the child in the seat map, confirmed, the tester pressed Hold, locked the PNR and pressed Confirm To Pay. Read the order and the e-ticket.  
7. **Expected Result:** The platform's rule says an adult with an infant and a child may never sit in an exit seat. The seat should be refused, at the latest when the booking is made or ticketed.  
8. **Actual Result:** The seat map offered the seats, the hold was accepted, and the booking was ticketed (tickets 91041001021062 adult, 91041001021073 child, 91022013762584 infant) with the adult on 24A and the child on 25A. No refusal or warning appeared at any step.  
9. **Impact:** A passenger who may not sit in an exit row is ticketed there, which breaks an airline safety rule and would reach the airline.  
10. **Classification:** Category: Business Rule | Layer: Backend/Integration | Reproducibility: Always (1 booking) | Regression: Unknown | Suspected Component: Exit-seat eligibility check for infant-holding adults and children | Confidence: Medium  
11. **Root Cause Analysis (hedged):** Likely OmanAir staging does not enforce the restriction and the platform does not check it itself. This is a supplier-behaviour question as well as a platform one.  
12. **Conclusion:** Neither the seat map nor the hold nor ticketing applies the exit-seat restriction for OmanAir.  
13. **Severity:** High - safety rule not applied.  
14. **Priority:** P1  
15. **Evidence:** see `ManualTestResults.csv` Evidence Paths and `evidence/`

#### TC-RPT-002 - Statement Report shows nothing for a paid, ticketed booking

1. **Test Case ID:** TC-RPT-002  
2. **Execution Status:** Failed  
3. **Execution Time:** not timed  
4. **Preconditions:** BK-2 ticketed and paid by wallet (30,013.40).  
5. **Test Data:** Statement Report, branch BRN298, agency AGN9809, 05/10/2026 to 05/10/2026.  
6. **Steps Performed:** Opened Reports > Statement Report, selected the branch, agency and dates, pressed Search.  
7. **Expected Result:** The payment should appear in the account statement with the right amount.  
8. **Actual Result:** 'No data has been found!' even though the Wallet History Report and the order page both show the payment. The same gap was seen in run-007.  
9. **Impact:** Finance cannot reconcile wallet payments from the statement.  
10. **Classification:** Category: Data Integrity | Layer: Backend | Reproducibility: Always | Regression: Unknown | Suspected Component: Statement Report query | Confidence: Medium  
11. **Root Cause Analysis (hedged):** Likely the Statement Report filters on a status or date field that wallet bookings do not populate.  
12. **Conclusion:** The Statement Report omits real paid bookings.  
13. **Severity:** Medium - report is incomplete.  
14. **Priority:** P1  
15. **Evidence:** see `ManualTestResults.csv` Evidence Paths and `evidence/`

#### TC-RPT-003 - Reports disagree with the booking and with each other

1. **Test Case ID:** TC-RPT-003  
2. **Execution Status:** Failed  
3. **Execution Time:** not timed  
4. **Preconditions:** BK-2 and BK-3 exist.  
5. **Test Data:** Wallet History Report and Statement Report, 05/10/2026.  
6. **Steps Performed:** Read both reports and compared them with the order page.  
7. **Expected Result:** The reports agree with the booking and with each other.  
8. **Actual Result:** Wallet History lists the booking and agrees with the order page (order id, transaction id, amount) but shows the booking amount under 'Credit Amount' and the balances under 'Debit Amount'. The Statement Report lists nothing for the same bookings.  
9. **Impact:** Two finance reports give different answers for the same payment, and the debit/credit columns look swapped.  
10. **Classification:** Category: Data Integrity | Layer: Frontend/Backend | Reproducibility: Always | Regression: Unknown | Suspected Component: Wallet History column mapping; Statement Report query | Confidence: Medium  
11. **Root Cause Analysis (hedged):** Likely the credit and debit columns are mapped the wrong way round in the Wallet History view.  
12. **Conclusion:** Reports are inconsistent with each other.  
13. **Severity:** Medium.  
14. **Priority:** P2  
15. **Evidence:** see `ManualTestResults.csv` Evidence Paths and `evidence/`

#### TC-SM-RTP-005 - Price breakdown does not show charges per journey

1. **Test Case ID:** TC-SM-RTP-005  
2. **Execution Status:** Failed  
3. **Execution Time:** not timed  
4. **Preconditions:** Round trip CAI-JED, seats on onward and return.  
5. **Test Data:** Onward 11A EGP 847, return 11A EGP 923.  
6. **Steps Performed:** Confirmed a seat on each journey and read the Fare Breakdown panel.  
7. **Expected Result:** Each journey's charges are identifiable.  
8. **Actual Result:** One base fare per passenger type, one tax per type and one 'Seat Selection +1,770' line cover both journeys. The 'Selected seats' list does show each flight's seat price.  
9. **Impact:** An agent cannot see what each journey costs in the breakdown panel.  
10. **Classification:** Category: UI | Layer: Frontend | Reproducibility: Always | Regression: No (known fault) | Suspected Component: Fare Breakdown panel | Confidence: High  
11. **Root Cause Analysis (hedged):** Likely the panel adds all journeys into single lines by design.  
12. **Conclusion:** The known fault is still present.  
13. **Severity:** Low.  
14. **Priority:** P3  
15. **Evidence:** see `ManualTestResults.csv` Evidence Paths and `evidence/`

#### TC-SM-NEG-006 - A broken booking link shows an error page instead of returning to flight search

1. **Test Case ID:** TC-SM-NEG-006  
2. **Execution Status:** Failed  
3. **Execution Time:** not timed  
4. **Preconditions:** On the passenger details page of a live wizard.  
5. **Test Data:** Passenger-details URL with the token removed, then with the last characters changed.  
6. **Steps Performed:** Opened the page with no token and with a changed token.  
7. **Expected Result:** Access is refused and the agent is sent back to the flight search page, like the time-limit case.  
8. **Actual Result:** Changed token: 'No Data Found - One or more parameters are invalid or missing.' with Go Back and Go Home, no prices, no technical error, but no redirect. Missing token: the app re-used the last stored token (once it showed the live booking again).  
9. **Impact:** Low. Nothing sensitive is shown for a changed token, but the missing-token case can re-show a booking.  
10. **Classification:** Category: Workflow | Layer: Frontend | Reproducibility: Always (changed token) | Regression: Unknown | Suspected Component: Passenger-details route guard | Confidence: Medium  
11. **Root Cause Analysis (hedged):** Likely a friendly error page was built instead of the redirect. Could be by design.  
12. **Conclusion:** The behaviour differs from the stated expected result; needs the business to confirm.  
13. **Severity:** Low.  
14. **Priority:** P2  
15. **Evidence:** see `ManualTestResults.csv` Evidence Paths and `evidence/`

#### TC-SM-STA-004 - Seat feature wording is outside the case's known list

1. **Test Case ID:** TC-SM-STA-004  
2. **Execution Status:** Inconclusive  
3. **Execution Time:** not timed  
4. **Preconditions:** Seat map of WY673 (189 seats).  
5. **Test Data:** All seat descriptions.  
6. **Steps Performed:** Collected the feature words from every seat and compared them with the six known words.  
7. **Expected Result:** Every feature word is one of the six known words.  
8. **Actual Result:** Extra words appear: Seat not allowed for infant, Seat not allowed for medical, Overwing seat(s), Center seat (not window, not aisle), Bulkhead seat, Seat with bassinet facility, Seat to be left vacant or offered last, Seat designated for RBD, Front of cabin class/compartment, Left/Right side of aircraft. 'Leg space seat' and 'Female designated seat' are absent.  
9. **Impact:** None known. The list in the case is probably incomplete.  
10. **Classification:** Category: Documentation mismatch (not classified as an application defect) | Layer: N/A | Reproducibility: Always | Regression: Unknown | Suspected Component: Test case wording | Confidence: Low  
11. **Root Cause Analysis (hedged):** Likely the case's list predates the current supplier wording.  
12. **Conclusion:** Cannot be classed as Passed or Failed without a business decision.  
13. **Severity:** Not set.  
14. **Priority:** Not set.  
15. **Evidence:** see `ManualTestResults.csv` Evidence Paths and `evidence/`

#### TC-RPT-001 - Booking Report search could not be confirmed

1. **Test Case ID:** TC-RPT-001  
2. **Execution Status:** Inconclusive  
3. **Execution Time:** not timed  
4. **Preconditions:** BK-2 exists.  
5. **Test Data:** Booking Report, branch BRN298, from 05/10/2026.  
6. **Steps Performed:** Searched with the branch, from-date and client name.  
7. **Expected Result:** The just-made booking appears in the reports.  
8. **Actual Result:** 'No data has been found!', but the 'To Booking Date' box would not keep the typed date, so the search may not have been valid.  
9. **Impact:** Unknown.  
10. **Classification:** Category: Not applicable | Layer: Unknown | Reproducibility: Unable to confirm | Regression: Unknown | Suspected Component: N/A | Confidence: Low  
11. **Root Cause Analysis (hedged):** Not inferable.  
12. **Conclusion:** Needs a manual repeat with both dates set.  
13. **Severity:** Not set.  
14. **Priority:** Not set.  
15. **Evidence:** see `ManualTestResults.csv` Evidence Paths and `evidence/`

## 4. Evidence Inventory

Screenshots are in `evidence/` (named after the case or booking). Interim notes: `InterimAdminObservations.md`. Not captured: video (not supported by the tool), console and network logs (not captured except where cited), per-case timings. Passwords were typed into the browser only and are in no file.

## 5. Delivery Artifacts

`ManualTestResults.csv` (124 rows), `ManualQAReport.md`, `ManualQAReport.report.json` and `ManualQAReport.html`, all generated from the same result set.

## 6. Known Limitations

- The Booking Report search could not be confirmed (date box).
- The multi-city form could not be driven by script; MCT-003, MCT-004 and MCT-005 were not executed.
- PER-004 and ERR-002 need long idle waits and were not run.
- Price-change and ROE cases need data this environment did not provide.
- No Traceability Matrix exists, so requirement coverage is not computed.
- Leg 1 (CAI-MCT) of the first flight has no supplier seat map.
- A first booking failed because the offer expired while the wizard waited (BK-1); not a product fault.
- The first seat-map load errors were a wrong supplier credential URL (environment), fixed by the tester.

## 7. Recommendations

1. Fix the pay-after-hold double charge of seats (PAH-002).
2. Decide who enforces the exit-seat rule for OmanAir and add a check (EXR-002/003/004).
3. Repair the Statement Report and the Wallet History debit/credit columns (RPT-002/003).
4. In the sheet: add Bundle to `Requires` of NAV-002, NAV-002b, PRC-002, PRC-003, MCT-007; give the FRC cases a Flynas Supplier Rule; widen the feature-word list in STA-004; re-word NAV-001/NAV-003 for suppliers without fare packages.
5. Re-run the held cases (EXR-001/005, PAX-008, MCT-003/004/005, PER-004, ERR-002, PAH-003) with the right setup.
6. Void/cancel the live bookings left on staging (see cleanup).

## 8. Delivery Completeness

All 124 suite cases have a row; the CSV, Results, Summary and QA Report use the same statuses.
