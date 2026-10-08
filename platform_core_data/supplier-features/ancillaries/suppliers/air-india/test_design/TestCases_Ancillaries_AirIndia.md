# Manual Test Suite — Ancillaries / AirIndia

| Field | Value |
|---|---|
| Module | `ancillaries/air-india` (Supplier Feature scope) |
| Produced by run | `ancillaries-run-001__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia` |
| Revision | 8 |
| Run Scope Type / Run Type | Feature / User Story |
| Project Context | `platform_core_data/supplier-features/ancillaries/suppliers/air-india/context/ProjectContext.md` (rev 3, Approved) + shared baseline rev 4, Approved |
| Total Test Cases | 28 |
| Generated | 2026-09-28 |
| Status | Approved |
| Approved by | Ahmed Alhussieny |
| Approved on | 2026-09-28 |

**Revision 8 (2026-10-03):** added **TC-ANC-036** — proposed during Stage 4M execution (user-directed
ad-hoc verification), reviewed and accepted back into the suite. Verifies the supplier/integration
service's `GetAncillary` endpoint data (Meal/Baggage codes, descriptions, prices, per-passenger-type
eligibility) matches exactly what the Portal UI's Ancillaries step displays, by calling
Search→FareConfirm→AddPassenger→GetAncillary directly against the NDC integration service and
comparing against an identical live UI search. Already executed this run — see
`manual_execution/artifacts/TC-ANC-036/00_execution_log.md`, proposed Passed.

## Case Index

| Test Case ID | Title | Tier | Priority | Tags | Review | Automation |
|---|---|---|---|---|---|---|
| TC-ANC-001 | Verify Admin Branch/Supplier/Credential configuration for AirIndia | Atomic | P2 | Regression | Approved | Pending |
| TC-ANC-002 | One-way, with stop, ancillaries selected (Portal) — six-checkpoint E2E | E2E | P1 | Smoke, Regression | Approved | Pending |
| TC-ANC-003 | Round-trip, non-stop, ancillaries selected (Portal) — six-checkpoint E2E | E2E | P1 | Regression | Approved | Pending |
| TC-ANC-004 | One-way, non-stop, ancillaries selected (Admin) — six-checkpoint E2E | E2E | P1 | Smoke, Regression | Approved | Pending |
| TC-ANC-005 | Round-trip, with stop, ancillaries selected (Admin) — six-checkpoint E2E | E2E | P1 | Regression | Approved | Pending |
| TC-ANC-006 | Book mixed passengers (2 ADT, 2 CHD, 2 INF) on Portal — Infant excluded from ancillaries | Scenario | P1 | Regression | Approved | Pending |
| TC-ANC-007 | Book mixed passengers (2 ADT, 2 CHD, 2 INF) on Admin — Infant excluded from ancillaries | Scenario | P1 | Regression | Approved | Pending |
| TC-ANC-008 | Adult and Child both receive full ancillary options | Atomic | P2 | Regression | Approved | Pending |
| TC-ANC-009 | Each Infant is assigned to a distinct Adult passenger | Atomic | P2 | Boundary | Approved | Pending |
| TC-ANC-010 | ROE currency conversion arithmetic is correct | Atomic | P1 | Regression | Approved | Pending |
| TC-ANC-011 | Markup folds into Base Fare, never shown as a separate line item | Atomic | P2 | Regression | Approved | Pending |
| TC-ANC-012 | Total price arithmetic is correct on Admin (Base+Tax+ServiceCharge+Ancillaries-Discount) | Atomic | P1 | Regression | Approved | Pending |
| TC-ANC-014 | Bundle coexists with individually selected Meal/Baggage without conflict | Atomic | P2 | Regression | Approved | Pending |
| TC-ANC-015 | Portal wallet balance unchanged during selection, deducted exact total at confirmation | Atomic | P1 | Regression | Approved | Pending |
| TC-ANC-016 | Admin's Top Up Balance reduced by the exact booking total | Atomic | P1 | Regression | Approved | Pending |
| TC-ANC-018 | A selected ancillary can be changed or removed before booking, per passenger | Atomic | P2 | Regression | Approved | Pending |
| TC-ANC-019 | A selected ancillary cannot be changed or removed after booking (Portal) | Atomic | P1 | Regression | Approved | Pending |
| TC-ANC-020 | Booking Confirmation reflects all selected ancillaries per passenger (Portal) | Atomic | P1 | Regression | Approved | Pending |
| TC-ANC-021 | Itinerary independently reflects the same ancillaries (Portal) | Atomic | P1 | Regression | Approved | Pending |
| TC-ANC-022 | Supplier retrieve-endpoint data matches the booked selections (both channels) | Scenario | P1 | Regression | Approved | Pending |
| TC-ANC-023 | Investigate unexplained aggregate-total discrepancy in retrieve-endpoint data | Atomic | P2 | Exploratory | Approved | Pending |
| TC-ANC-024 | Portal Total Due to NDC and Sales reports reflect the booking correctly | Atomic | P2 | Regression | Approved | Pending |
| TC-ANC-025 | Admin's five reports reflect the booking correctly | Atomic | P2 | Regression | Approved | Pending |
| TC-ANC-026 | Statement report reflects the booking correctly (Portal and Admin) | Atomic | P2 | Regression, Blocked | Pending | Pending |
| TC-ANC-027 | Confirm whether Wallet History Report's Credit/Debit labeling is intentional | Atomic | P3 | Exploratory | Approved | Pending |
| TC-ANC-034 | One-way, no ancillaries selected for any passenger (Admin) — six-checkpoint E2E | E2E | P2 | Regression, Boundary | Approved | Pending |
| TC-ANC-035 | Round-trip, ancillaries selected for the onward leg only (Portal) — six-checkpoint E2E | E2E | P2 | Regression, Boundary | Approved | Pending |
| TC-ANC-036 | Supplier GetAncillary endpoint data matches the Portal UI's Ancillaries step exactly | Scenario | P2 | Regression, Integration | Approved | Pending |

**Tier breakdown:** 18 Atomic · 4 Scenario · 6 E2E

**Lifecycle breakdown:** Review — 1 Pending · 27 Approved · 0 Rejected · Automation — 28 Pending · 0 Approved · 0 Rejected

**Out of Ancillaries scope (removed 2026-09-28, belongs to general booking scope):** TC-ANC-013, TC-ANC-017, TC-ANC-028, TC-ANC-029, TC-ANC-030, TC-ANC-031, TC-ANC-032, TC-ANC-033. See `CoverageReport.md` §8 for the disposition of the Findings/requirements these previously covered.

## Test Cases

### TC-ANC-001 — Verify Admin Branch/Supplier/Credential configuration for AirIndia

**Objective:** Verify AirIndia's Supplier and Credential are correctly assigned to the test Branch in Admin.

**Preconditions:** Admin user is logged in.

**Test Data:**

| Field | Value |
|---|---|
| Branch | NDC2_Ahmed Alhussieny (BRN297) |
| Supplier Name | IndiaAirLine |
| Credential Name | IndiaAirLineStg |

**Steps:**

1. Open Admin.
2. Go to Branch configuration for the test Branch.
3. Open Product Access Details, Flight tab.

**Expected Result:** Supplier "IndiaAirLine" and Credential "IndiaAirLineStg" are shown as active and assigned to the Branch.

**Priority:** P2

**Tags:** Atomic, Regression

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-002 — One-way, with stop, ancillaries selected (Portal) — six-checkpoint E2E

**Objective:** Verify a one-way, 1-stop Portal booking with mixed passengers passes every checkpoint — ancillary-selection rules, Confirmation display, supplier retrieve-endpoint match, Search Booking's Ancillaries and Costing views, and Portal's reports — all agree on the same booking.

**Preconditions:** Portal user is logged in as Agency `AGN9808`.

**Test Data:**

| Field | Value |
|---|---|
| Route | DEL-DXB (transit) |
| Trip type | One-way |
| Stops | 1 stop |
| Passengers | 2 Adult, 2 Child, 2 Infant (each Infant assigned to a different Adult) — if the supplier cannot return search results with this mix on this route, retry with 1 Adult, 1 Child, 1 Infant and record which passenger count actually returned results |
| Ancillaries | Meal + Baggage selected for each Adult/Child; Bundle selected for at least one passenger |

**Steps:**

1. Search and select a one-way, 1-stop DEL-DXB flight for the passenger mix.
2. Complete PAX Details. On the Ancillaries step, select Meal and Baggage for each Adult/Child passenger, and a Bundle for at least one. Confirm: no Infant passenger shows any ancillary row; Meal is offered per flight leg (a separate option per leg, not once for the whole journey); Baggage is offered once for the whole one-way journey (not repeated per leg).
3. Complete payment and confirm the booking.
4. Open the booking confirmation screen and compare every selected Meal/Baggage/Bundle entry, per passenger, against step 2.
5. Call the supplier retrieve endpoint with the booking's Airline PNR and compare the returned passenger list and ancillary codes/amounts directly against what the system shows. For fare amounts, apply ROE conversion (ANC-42) and add the per-passenger Markup (ANC-55) before comparing — see TC-ANC-022's Expected Result for why a raw fare equality is not expected.
6. Navigate to My Bookings via the sidebar (not the confirmation link) and open the Segment Ancillaries section — confirm the same entries as step 4.
7. From the same booking detail, open the Fare Breakdown and confirm Base Fare + Taxes + Ancillaries (± Service Charge/Discount, if shown) equals the Total Amount.
8. Open Portal's Total Due to NDC and Sales reports, filtered to this booking, and confirm both show the correct amount.

**Expected Result:** Every checkpoint — Selection/Rules, Confirmation, Supplier Retrieve, Search Booking Ancillaries, Search Booking Costing, Reports — shows consistent data for this booking, and both ancillary rules (Infant exclusion; Meal-per-leg/Baggage-per-journey) hold exactly as stated.

**Priority:** P1

**Tags:** E2E, Smoke, Regression

**Notes:** DEL-DXB (transit, via IXE) has no prior Discovery evidence for this exact one-way/stop combination on Portal. Route corrected 2026-09-28 from DEL-BOM to DEL-DXB per user instruction — DEL-DXB is this Supplier's known transit route.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-003 — Round-trip, non-stop, ancillaries selected (Portal) — six-checkpoint E2E

**Objective:** Verify a round-trip, non-stop Portal booking with mixed passengers passes every checkpoint, and establish how Baggage (a Per-Journey capability) is scoped on a round trip.

**Preconditions:** Portal user is logged in as Agency `AGN9808`.

**Test Data:**

| Field | Value |
|---|---|
| Route | BOM-COK (round-trip) |
| Trip type | Round-trip |
| Stops | Non-stop |
| Passengers | 2 Adult, 2 Child, 2 Infant (each Infant assigned to a different Adult) — if the supplier cannot return search results with this mix on this route, retry with 1 Adult, 1 Child, 1 Infant and record which passenger count actually returned results |
| Ancillaries | Meal + Baggage selected for each Adult/Child, both legs; Bundle for at least one passenger |

**Steps:**

1. Search and select non-stop outbound and return BOM-COK flights for the passenger mix.
2. Complete PAX Details. On the Ancillaries step, select Meal and Baggage for each Adult/Child passenger. Confirm: no Infant shows any ancillary row; Meal is offered separately per leg (outbound and return each show their own option). Record whether Baggage is offered once for the entire round trip or once per direction — this specific round-trip combination has not been exercised in Discovery before, so do not assume either outcome; record what is actually observed against the ANC-48 default (Baggage = Per Journey).
3. Complete payment and confirm the booking.
4. Open the booking confirmation screen and compare every selected entry, per passenger and per leg, against step 2.
5. Call the supplier retrieve endpoint with the booking's Airline PNR and compare the returned data against the system — passenger/ancillary data directly, fare amounts only after applying ROE + Markup (see TC-ANC-022's Expected Result).
6. Navigate to My Bookings via the sidebar and open the Segment Ancillaries section — confirm the same entries as step 4, for both legs.
7. From the same booking detail, open the Fare Breakdown and confirm Base Fare + Taxes + Ancillaries equals the Total Amount.
8. Open Portal's Total Due to NDC and Sales reports, filtered to this booking, and confirm both show the correct amount.

**Expected Result:** Every checkpoint shows consistent data for this booking. The Baggage round-trip scoping question (step 2) is answered and recorded, whichever way it resolves.

**Priority:** P1

**Tags:** E2E, Regression

**Notes:** Route corrected 2026-09-28 from DEL-BOM to BOM-COK per user instruction — BOM-COK is this Supplier's known non-stop route.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-004 — One-way, non-stop, ancillaries selected (Admin) — six-checkpoint E2E

**Objective:** Verify a one-way, non-stop Admin booking with mixed passengers passes every checkpoint on the Admin channel.

**Preconditions:** Admin user is logged in; a Branch (and optionally Agency/Agent) is selected.

**Test Data:**

| Field | Value |
|---|---|
| Route | BOM-COK |
| Trip type | One-way |
| Stops | Non-stop |
| Passengers | 2 Adult, 2 Child, 2 Infant (each Infant assigned to a different Adult) — if the supplier cannot return search results with this mix on this route, retry with 1 Adult, 1 Child, 1 Infant and record which passenger count actually returned results |
| Ancillaries | Meal + Baggage selected for each Adult/Child; Bundle selected for at least one passenger |

**Steps:**

1. Open Booking-Mid Office and select the Branch (and Agency/Agent, if testing that combination — ANC-58).
2. Search and select a one-way, non-stop BOM-COK flight for the passenger mix.
3. Complete PAX Details. Select Bundle for at least one passenger, then on the Ancillaries step select Meal and Baggage for each Adult/Child. Confirm: no Infant shows any ancillary row; Meal is offered per leg; Baggage is offered once for the whole journey.
4. Complete payment and confirm the booking (Admin navigates directly to the booking confirmation screen).
5. On the confirmation screen, compare every selected Meal/Baggage/Bundle entry, per passenger, against step 3.
6. Call the supplier retrieve endpoint with the booking's Airline PNR and compare the returned data against the system — passenger/ancillary data directly, fare amounts only after applying ROE + Markup (see TC-ANC-022's Expected Result).
7. Open Search Booking, retrieve the same booking, and open its Passenger/Ancillaries view — confirm the same entries as step 5.
8. From the same booking, open Costing & Payment and confirm Base Fare + Taxes + Service Charges + Ancillaries − Discount equals the Total Amount.
9. Open Admin's five reports (Total Due to NDC, Agency Wallet, Sales, AR Ledger, Wallet History), filtered to this booking, and confirm all five reconcile with the booking total and wallet delta.

**Expected Result:** Every checkpoint shows consistent data for this booking, and both ancillary rules (Infant exclusion; Meal-per-leg/Baggage-per-journey) hold exactly as stated.

**Priority:** P1

**Tags:** E2E, Smoke, Regression

**Notes:** Route corrected 2026-09-28 from DEL-BOM to BOM-COK per user instruction — BOM-COK is this Supplier's known non-stop route; no prior Discovery evidence exists for it on the Admin channel.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-005 — Round-trip, with stop, ancillaries selected (Admin) — six-checkpoint E2E

**Objective:** Verify a round-trip, 1-stop Admin booking with mixed passengers passes every checkpoint on the Admin channel.

**Preconditions:** Admin user is logged in; a Branch (and optionally Agency/Agent) is selected.

**Test Data:**

| Field | Value |
|---|---|
| Route | DEL-DXB (round-trip, transit) |
| Trip type | Round-trip |
| Stops | 1 stop |
| Passengers | 2 Adult, 2 Child, 2 Infant (each Infant assigned to a different Adult) — if the supplier cannot return search results with this mix on this route, retry with 1 Adult, 1 Child, 1 Infant and record which passenger count actually returned results |
| Ancillaries | Meal + Baggage selected for each Adult/Child, both legs; Bundle for at least one passenger |

**Steps:**

1. Open Booking-Mid Office and select the Branch (and Agency/Agent, if testing that combination — ANC-58).
2. Search and select 1-stop outbound and return DEL-DXB flights for the passenger mix.
3. Complete PAX Details. On the Ancillaries step, select Meal and Baggage for each Adult/Child passenger, both legs. Confirm: no Infant shows any ancillary row; Meal is offered separately per leg; record whether Baggage is once-for-the-round-trip or once-per-direction (same open question as TC-ANC-003 — record what is observed, do not assume).
4. Complete payment and confirm the booking.
5. On the confirmation screen, compare every selected entry, per passenger and per leg, against step 3.
6. Call the supplier retrieve endpoint with the booking's Airline PNR and compare the returned data against the system — passenger/ancillary data directly, fare amounts only after applying ROE + Markup (see TC-ANC-022's Expected Result).
7. Open Search Booking, retrieve the same booking, and open its Passenger/Ancillaries view — confirm the same entries as step 5.
8. From the same booking, open Costing & Payment and confirm Base Fare + Taxes + Service Charges + Ancillaries − Discount equals the Total Amount.
9. Open Admin's five reports, filtered to this booking, and confirm all five reconcile with the booking total and wallet delta.

**Expected Result:** Every checkpoint shows consistent data for this booking. The Baggage round-trip scoping question is answered and recorded, whichever way it resolves.

**Priority:** P1

**Tags:** E2E, Regression

**Notes:** DEL-DXB is this Supplier's known transit route — no route change needed here (confirmed 2026-09-28).

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-006 — Book mixed passengers (2 ADT, 2 CHD, 2 INF) on Portal — Infant excluded from ancillaries

**Objective:** Verify Infant passengers have no ancillary options and no passenger row on the Ancillaries step, on Portal.

**Preconditions:** Portal user is logged in.

**Test Data:**

| Field | Value |
|---|---|
| Passenger mix | 2 Adult, 2 Child, 2 Infant (each Infant assigned to a different Adult) |

**Steps:**

1. Search and select a flight for the passenger mix.
2. Complete PAX Details for all 6 passengers.
3. Continue to the Ancillaries step.
4. Inspect the passenger rows shown on the Ancillaries step.

**Expected Result:** Only the 2 Adult and 2 Child passengers appear with selectable Meal, Baggage, and Bundle options. No Infant passenger row appears anywhere on the Ancillaries step.

**Priority:** P1

**Tags:** Scenario, Regression

**Notes:** This exact check is also performed as part of TC-ANC-002/003's ancillary-selection step. If either has already been executed this run, record this case's result from that same evidence instead of a separate booking attempt.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-007 — Book mixed passengers (2 ADT, 2 CHD, 2 INF) on Admin — Infant excluded from ancillaries

**Objective:** Verify Infant passengers have no ancillary options in the final booking, on Admin.

**Preconditions:** Admin user is logged in; a Branch is selected.

**Test Data:**

| Field | Value |
|---|---|
| Passenger mix | 2 Adult, 2 Child, 2 Infant (each Infant assigned to a different Adult) |

**Steps:**

1. Search and select a flight for the passenger mix via Booking-Mid Office.
2. Complete PAX Details for all 6 passengers.
3. Complete Bundle and Ancillaries for the Adult and Child passengers.
4. Complete the booking and open the Order Details Passenger Details table.

**Expected Result:** Both Infant passengers show blank Meal, Seat, and Bundle cells, and no entry in the Extra Baggage section. Each Infant still shows a standard included Baggage Allowance.

**Priority:** P1

**Tags:** Scenario, Regression

**Notes:** This exact check is also performed as part of TC-ANC-004/005/034's ancillary-selection step. If any has already been executed this run, record this case's result from that same evidence instead of a separate booking attempt.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-008 — Adult and Child both receive full ancillary options

**Objective:** Verify Adult and Child passenger types can each select Meal, Baggage, and Bundle.

**Preconditions:** A booking in progress has reached the Ancillaries step, with at least one Adult and one Child passenger.

**Test Data:** None.

**Steps:**

1. Open the Adult passenger's ancillary options.
2. Open the Child passenger's ancillary options.

**Expected Result:** Both the Adult and the Child passenger show selectable Meal, Baggage, and Bundle options.

**Priority:** P2

**Tags:** Atomic, Regression

**Notes:** Any of TC-ANC-002/003/004/005 selects Meal, Baggage, and Bundle for both an Adult and a Child passenger. Record this case's result from whichever of those has already run this session, rather than a separate booking attempt.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-009 — Each Infant is assigned to a distinct Adult passenger

**Objective:** Verify a booking with 2 Infants and 2 Adults assigns each Infant to a different Adult.

**Preconditions:** PAX Details step is open for a 2 Adult + 2 Infant booking.

**Test Data:**

| Field | Value |
|---|---|
| Infant 1 | Assigned to Adult 1 |
| Infant 2 | Assigned to Adult 2 |

**Steps:**

1. Enter Adult 1 and Adult 2 passenger details.
2. Assign Infant 1 to Adult 1.
3. Assign Infant 2 to Adult 2.
4. Attempt to also assign Infant 2 to Adult 1.

**Expected Result:** Infant 1 and Infant 2 are each accepted against a distinct Adult. The system blocks or rejects assigning a second Infant to an Adult already holding one.

**Priority:** P2

**Tags:** Atomic, Boundary

**Notes:** The "one Infant per Adult" limit is a common airline rule but is not itself stated as an ANC-xx requirement — if the system does not enforce it, record that as a new Discovery observation rather than treating this case as failed against an invented rule.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-010 — ROE currency conversion arithmetic is correct

**Objective:** Verify the booking price conversion follows `booking price = Supplier price x ROE`.

**Preconditions:** A real booking exists with both the Admin/Portal booking total (agency currency) and the supplier retrieve-endpoint total (supplier currency) available.

**Test Data:**

| Field | Value |
|---|---|
| Example ROE | 0.5 (INR to EGP, as observed 2026-09-27) |

**Steps:**

1. Read the supplier retrieve-endpoint total amount and currency.
2. Read the booking total shown in the system, in the agency's currency.
3. Multiply the retrieve-endpoint total by the configured ROE.

**Expected Result:** The converted amount matches the system's booking total exactly.

**Priority:** P1

**Tags:** Atomic, Regression

**Notes:** Every E2E case's retrieve-endpoint step (TC-ANC-002/003/004/005/034/035) captures both the supplier-side and system-side totals already. That data is reusable evidence for this case, but the explicit ROE multiplication should still be performed and recorded as its own check, since the E2E step only confirms the totals match — it does not isolate the ROE arithmetic specifically.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-011 — Markup folds into Base Fare, never shown as a separate line item

**Objective:** Verify Markup is never displayed as its own row in the Fare Breakdown/Fare Details panel, on either channel.

**Preconditions:** A completed booking's Fare Details/Fare Breakdown panel is open.

**Test Data:** None.

**Steps:**

1. Open the Fare Details panel on an Admin booking.
2. Open the Fare Breakdown panel on a Portal booking.

**Expected Result:** Neither panel shows a "Markup" line item on either channel. Base Fare is the only fare component carrying the markup amount.

**Priority:** P2

**Tags:** Atomic, Regression

**Notes:** The Fare Breakdown/Costing screen opened during any of TC-ANC-002/003/004/005/034/035's execution can be reused directly for this check — no new booking needed, just confirm the absence of a Markup row on that same screen.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-012 — Total price arithmetic is correct on Admin

**Objective:** Verify Admin's Fare Details total equals Base Fare + Taxes + Service Charges + Ancillaries − Discount.

**Preconditions:** A completed Admin booking's Fare Details panel is open.

**Test Data:** None — read the actual values shown.

**Steps:**

1. Read Base fare, Taxes, Service Charges, Meal, Baggage, Bundle, and Discount from the Fare Details panel.
2. Sum Base fare + Taxes + Service Charges + Meal + Baggage + Bundle, then subtract Discount.

**Expected Result:** The computed sum equals the displayed Total Amount exactly.

**Priority:** P1

**Tags:** Atomic, Regression

**Notes:** This exact arithmetic check is also performed as part of TC-ANC-004/005/034's Costing checkpoint. Record this case's result from that same evidence instead of a separate booking attempt.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-014 — Bundle coexists with individually selected Meal/Baggage without conflict

**Objective:** Verify a Bundle selection and individually selected Meal/Baggage are both accepted and priced separately, then included in the total.

**Preconditions:** Ancillaries step is open with Bundle, Meal, and Baggage all available.

**Test Data:**

| Field | Value |
|---|---|
| Bundle | Xtra Pack / Value Pack |
| Meal | Quinoa Salad (VQSB) |
| Baggage | Special equipment Handling Fee 3 Pc |

**Steps:**

1. Select the Bundle.
2. Also select an individual Meal.
3. Also select individual Extra Baggage.
4. Proceed to the Fare Breakdown/Fare Details.

**Expected Result:** Bundle, Meal, and Baggage each appear as their own priced line item, and all three are included in the Total Amount. No error or conflict is shown.

**Priority:** P2

**Tags:** Atomic, Regression

**Notes:** Any of TC-ANC-002/003/004/005 selects Bundle, Meal, and Baggage together for at least one passenger. Record this case's result from whichever has already run this session, rather than a separate booking attempt.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-015 — Portal wallet balance unchanged during selection, deducted exact total at confirmation

**Objective:** Verify no wallet deduction occurs until booking confirmation, and the deduction then equals the exact total.

**Preconditions:** Portal user is logged in with a known wallet balance.

**Test Data:** None — record the actual balance shown.

**Steps:**

1. Read the wallet balance on the Payment Details step, before clicking Book.
2. Complete the booking.
3. Read the wallet balance again, after confirmation.

**Expected Result:** The balance before booking equals the balance shown earlier in the flow (unchanged). The balance after booking is exactly the pre-booking balance minus the booking Total Amount.

**Priority:** P1

**Tags:** Atomic, Regression

**Notes:** This is not one of TC-ANC-002/003's explicit checkpoints, but it can be checked within the same booking session — read the wallet balance before and after that same booking completes, rather than starting a separate Portal booking just for this case.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-016 — Admin's Top Up Balance reduced by the exact booking total

**Objective:** Verify Admin's Top Up Balance specifically absorbs the booking deduction, and the three wallet figures reconcile.

**Preconditions:** Admin user is logged in with a known wallet state.

**Test Data:** None — record the actual balances shown.

**Steps:**

1. Read Your Balance, Credit Balance, and Top Up Balance before booking.
2. Complete the booking.
3. Read the same three figures again, after confirmation.

**Expected Result:** Your Balance equals Credit Balance plus Top Up Balance, both before and after. Top Up Balance after booking equals Top Up Balance before minus the booking Total Amount. Credit Balance is unchanged.

**Priority:** P1

**Tags:** Atomic, Regression

**Notes:** This is not one of TC-ANC-004/005/034's explicit checkpoints, but it can be checked within the same booking session — read the three wallet figures before and after that same booking completes, rather than starting a separate Admin booking just for this case.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-018 — A selected ancillary can be changed or removed before booking, per passenger

**Objective:** Verify a passenger's selected ancillary can be changed or removed before the booking is confirmed, without affecting other passengers.

**Preconditions:** Ancillaries step is open for at least 2 passengers, each with a selection made.

**Test Data:** None.

**Steps:**

1. Change Passenger 1's Meal selection to a different option.
2. Remove Passenger 2's Baggage selection.
3. Proceed to the Fare Breakdown/Fare Details.

**Expected Result:** Passenger 1's new Meal selection and price are reflected. Passenger 2's Baggage charge is removed from the total. Neither change affects any other passenger's selections.

**Priority:** P2

**Tags:** Atomic, Regression

**Notes:** This can be performed mid-flow during any of TC-ANC-002/003/004/005/034/035, before finalizing that booking — no separate booking is required solely for this case.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-019 — A selected ancillary cannot be changed or removed after booking (Portal)

**Objective:** Verify no change/cancel/remove control exists for a selected ancillary once a booking is confirmed, on Portal.

**Preconditions:** A real, confirmed booking with selected ancillaries exists.

**Test Data:** None.

**Steps:**

1. Open the confirmed booking's detail/itinerary page on Portal.
2. Search the page for any change, cancel, remove, or modify control related to an ancillary.

**Expected Result:** No such control exists anywhere on the page.

**Priority:** P1

**Tags:** Atomic, Regression

**Notes:** Reuse the already-confirmed booking from TC-ANC-002/003/035 for this check instead of completing a new booking solely to attempt this.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-020 — Booking Confirmation reflects all selected ancillaries per passenger (Portal)

**Objective:** Verify the booking confirmation screen shows every selected Meal, Baggage, and Bundle item, per passenger, with correct prices.

**Preconditions:** A booking with Meal, Baggage, and Bundle selected for at least 2 passengers has just been confirmed.

**Test Data:** None.

**Steps:**

1. Open the booking confirmation screen.
2. Compare each passenger's shown Meal, Baggage, and Bundle entries against what was selected.

**Expected Result:** Every selected ancillary appears against the correct passenger, with the price that was shown at selection.

**Priority:** P1

**Tags:** Atomic, Regression

**Notes:** This exact check is also performed as part of TC-ANC-002/003's Confirmation checkpoint. Record this case's result from that same evidence instead of a separate booking attempt.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-021 — Itinerary independently reflects the same ancillaries (Portal)

**Objective:** Verify My Bookings/itinerary shows the same ancillaries as the original booking confirmation, via an independent navigation path.

**Preconditions:** A confirmed booking with selected ancillaries exists.

**Test Data:** None.

**Steps:**

1. Navigate to My Bookings via the sidebar (not via the booking confirmation link).
2. Open the booking's itinerary detail.
3. Expand the Segment Ancillaries section.

**Expected Result:** The same Meal, Baggage, and Bundle entries appear, per passenger, matching the original booking confirmation exactly.

**Priority:** P1

**Tags:** Atomic, Regression

**Notes:** This exact check is also performed as part of TC-ANC-002/003's Search Booking Ancillaries checkpoint. Record this case's result from that same evidence instead of a separate booking attempt.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-022 — Supplier retrieve-endpoint data matches the booked selections (both channels)

**Objective:** Verify the supplier's retrieve endpoint returns passenger, price, and ancillary data matching what was booked, for both Admin and Portal bookings.

**Preconditions:** A completed booking exists on the channel under test, with its Airline PNR known. Postman access to the supplier's retrieve endpoint is available — request location: [AirIndia retrieve endpoint](https://hussieny-2000-s-team.postman.co/workspace/My-Workspace~16b37d92-d276-4926-85c9-a4adcf22df64/request/42582452-f99943c7-432e-4c6f-8985-1886fe136368) (shared 2026-09-28; requires the requester's own Postman workspace access to open).

**Test Data:**

| Field | Value |
|---|---|
| Airline PNR | (the booking under test) |

**Steps:**

1. Call the supplier retrieve endpoint with the booking's Airline PNR.
2. Compare the returned passenger list and ancillary codes/amounts against what was selected and booked in the system — these should match directly (ancillaries are not subject to markup).
3. For fare amounts specifically: compute (retrieve-endpoint fare × confirmed ROE, ANC-42) + the per-passenger Markup amount (ANC-55), and compare that computed figure against the system's displayed/booked fare — not a direct equality.

**Expected Result:** Passenger and ancillary data match the retrieve response directly. Fare amounts match only once ROE conversion and Markup are both added on top of the retrieve-endpoint figure — the supplier's own data was never expected to already include Markup, since Markup is a platform-side rule-engine addition the supplier is never told about (ANC-55, FINDING-003). A fare mismatch that isn't explained by ROE + Markup is a genuine discrepancy; one that is fully explained by them is expected behavior, not a defect.

**Priority:** P1

**Tags:** Scenario, Regression

**Notes:** Every E2E case (TC-ANC-002/003/004/005/034/035) performs this exact retrieve-endpoint comparison as one of its own checkpoints — each of those cases' retrieve-endpoint step must apply the same ROE + Markup adjustment before comparing, not a raw equality. Once at least one Portal and one Admin E2E case has executed, this case can be recorded from that same evidence rather than a separate call.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-023 — Investigate unexplained aggregate-total discrepancy in retrieve-endpoint data

**Objective:** Determine the source of an 800 INR gap observed between a retrieve response's aggregate total and the sum of its own per-passenger totals.

**Preconditions:** Access to the supplier retrieve endpoint for the Y1ZVFF booking, or a comparable booking.

**Test Data:**

| Field | Value |
|---|---|
| Reference booking | Airline PNR Y1ZVFF |

**Steps:**

1. Retrieve the booking and sum each passenger's individual `paxTotalAmount`.
2. Compare that sum against `priceDetails.totalAmount`.
3. Repeat the same comparison for the ancillary aggregate specifically.

**Expected Result:** Reviewer determines whether the aggregate figures are internally consistent with the per-passenger figures, and if not, identifies which component (working hypothesis: Meal/VQSB, one leg not captured) accounts for the gap. This is a judgment/investigation task, not a fixed pass/fail assertion.

**Priority:** P2

**Tags:** Atomic, Exploratory

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-024 — Portal Total Due to NDC and Sales reports reflect the booking correctly

**Objective:** Verify Portal's Total Due to NDC and Sales reports show the correct amount for a real booking.

**Preconditions:** A real Portal booking exists, with its Booking Reference known.

**Test Data:**

| Field | Value |
|---|---|
| Booking Reference | (the booking under test) |

**Steps:**

1. Open the Total Due to NDC report, filter by an Invoice Date range covering the booking and the Booking Reference.
2. Open the Sales report with the same filter.

**Expected Result:** Both reports show a row for the booking with Amount Payable To Ndc / Sales Amount equal to the booking's Total Amount.

**Priority:** P2

**Tags:** Atomic, Regression

**Notes:** This exact check is also performed as part of TC-ANC-002/003/035's Reports checkpoint. Record this case's result from that same evidence instead of a separate booking attempt.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-025 — Admin's five reports reflect the booking correctly

**Objective:** Verify Admin's Total Due to NDC, Agency Wallet, Sales, AR Ledger, and Wallet History reports all show the correct amounts for a real booking.

**Preconditions:** A real Admin booking exists, with its Order Id known.

**Test Data:**

| Field | Value |
|---|---|
| Order Id | (the booking under test) |

**Steps:**

1. Open each of the five reports, filtered by Branch and an Invoice Date range covering the booking.
2. Compare each report's figures against the booking's Total Amount and the wallet balance change.

**Expected Result:** All five reports agree with each other and with the booking's own Total Amount and wallet delta.

**Priority:** P2

**Tags:** Atomic, Regression

**Notes:** This exact check is also performed as part of TC-ANC-004/005/034's Reports checkpoint. Record this case's result from that same evidence instead of a separate booking attempt.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-026 — Statement report reflects the booking correctly (Portal and Admin)

**Objective:** Verify the Statement report shows Total Payable, Transaction Amount Debit/Credit, and Wallet Balance for a real booking.

**Preconditions:** A real booking exists on the channel under test. The Statement report defect (FINDING-012) is fixed.

**Test Data:**

| Field | Value |
|---|---|
| Booking reference / Order Id | (the booking under test) |

**Steps:**

1. Open the Statement report, filtered by an Invoice Date range covering the booking.
2. Locate the row for this booking.

**Expected Result:** The row shows Total Payable, Transaction Amount Debit, Transaction Amount Credit, and Wallet Balance matching the booking's known figures.

**Priority:** P2

**Tags:** Atomic, Regression, Blocked

**Notes:** Do not execute this case until FINDING-012's Statement report defect is fixed on the channel under test — hold in Pending/Blocked status per explicit instruction. Confirmed still open 2026-09-28.

**Review:** Pending

**Automation:** Pending

---

### TC-ANC-027 — Confirm whether Wallet History Report's Credit/Debit labeling is intentional

**Objective:** Determine whether the Wallet History Report's column semantics (balance rows under Debit, outflow transactions under Credit) are an intentional convention or a labeling defect.

**Preconditions:** A completed Wallet History Report search, showing at least one transaction.

**Test Data:** None.

**Steps:**

1. Review the Start Balance, transaction, and End Balance rows and which column each value falls under.
2. Ask the product/business owner whether this labeling is intentional.

**Expected Result:** Reviewer records the product decision: keep as documented behavior, or file as a UX fix. This is a judgment call, not a fixed pass/fail assertion.

**Priority:** P3

**Tags:** Atomic, Exploratory

**Review:** Approved

**Automation:** Pending

---

*(TC-ANC-028 through TC-ANC-033 removed 2026-09-28 — out of Ancillaries scope, belongs to general booking scope. See `CoverageReport.md` §8 and the Traceability Matrix's Finding Disposition table for how the requirements/Findings they touched are now covered.)*

---

### TC-ANC-034 — One-way, no ancillaries selected for any passenger (Admin) — six-checkpoint E2E

**Objective:** Verify a booking where no Adult/Child passenger selects any Meal, Baggage, or Bundle still completes correctly with zero ancillary charge, and that "no selection" state is consistently reflected at every checkpoint through to Admin's reports.

**Preconditions:** Admin user is logged in; a Branch is selected.

**Test Data:**

| Field | Value |
|---|---|
| Route | DEL-DXB (transit) |
| Trip type | One-way |
| Stops | 1 stop |
| Passengers | 2 Adult, 2 Child, 2 Infant (each Infant assigned to a different Adult) — if the supplier cannot return search results with this mix on this route, retry with 1 Adult, 1 Child, 1 Infant and record which passenger count actually returned results |
| Ancillaries | None selected for any Adult or Child passenger |

**Steps:**

1. Open Booking-Mid Office, select the Branch, and search/select the flight for the passenger mix.
2. Complete PAX Details for all 6 passengers.
3. On the Bundle and Ancillaries steps, select nothing for any Adult or Child passenger. Confirm the Fare Details panel shows no Meal, Baggage, or Bundle line item (or shows them at zero), and the Total equals Base Fare + Taxes (± Service Charges/Discount, if configured) only. Confirm Infant passengers still show no ancillary row regardless — unaffected by this scenario.
4. Complete payment and confirm the booking.
5. On the confirmation screen, confirm no ancillary entries appear for any passenger.
6. Call the supplier retrieve endpoint with the booking's Airline PNR and confirm the supplier side also shows no ancillary charge. For the Base Fare specifically, remember Markup is applied regardless of ancillary selection (ANC-55) — the supplier's raw fare will still be lower than the system's Base Fare by the Markup amount; that gap is expected, not a defect.
7. Open Search Booking, retrieve the same booking, and open its Passenger/Ancillaries view — confirm the same: no ancillary entries.
8. Open Costing & Payment and confirm the Fare Details total matches Base Fare + Taxes exactly, with no ancillary component.
9. Open Admin's five reports, filtered to this booking, and confirm all five reconcile with a booking total that has no ancillary component.

**Expected Result:** The booking completes with a Total Amount containing no ancillary charge anywhere, and every checkpoint — Confirmation, Supplier Retrieve, Search Booking, Costing, Reports — agrees this booking has zero ancillaries.

**Priority:** P2

**Tags:** E2E, Regression, Boundary

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-035 — Round-trip, ancillaries selected for the onward leg only (Portal) — six-checkpoint E2E

**Objective:** Verify selecting ancillaries only for the outbound/onward leg of a round trip is accepted, correctly priced, and consistently reflected at every checkpoint — and establish whether Baggage (a Per-Journey capability) can even be selected onward-only, or is inherently whole-journey.

**Preconditions:** Portal user is logged in.

**Test Data:**

| Field | Value |
|---|---|
| Route | DEL-DXB (round-trip, transit) |
| Trip type | Round-trip |
| Stops | 1 stop |
| Passengers | 2 Adult, 2 Child, 2 Infant (each Infant assigned to a different Adult) — if the supplier cannot return search results with this mix on this route, retry with 1 Adult, 1 Child, 1 Infant and record which passenger count actually returned results |
| Ancillaries | Meal + Baggage selected for each Adult/Child on the onward leg only; nothing selected for the return leg |

**Steps:**

1. Search and select outbound and return DEL-DXB flights for the passenger mix.
2. Complete PAX Details.
3. On the Ancillaries step, select Meal (and Baggage, per whatever scoping the UI allows — see Notes) for the onward leg's Adult/Child passengers only; leave every return-leg-specific option unselected. Confirm the Fare Breakdown reflects only the onward selections' charges.
4. Complete payment and confirm the booking.
5. On the confirmation screen, confirm the onward-only selections are reflected, and that no ancillary is silently applied to the return leg.
6. Call the supplier retrieve endpoint with the booking's Airline PNR and confirm the same onward-only pattern is logged supplier-side. Ancillary data should match directly; fare amounts only match once ROE + Markup are applied on top of the retrieve-endpoint figure (see TC-ANC-022's Expected Result).
7. Navigate to My Bookings via the sidebar and open the Segment Ancillaries section — confirm the same per-leg pattern independently.
8. From the same booking detail, open the Fare Breakdown and confirm the Total reflects only the onward ancillary charges.
9. Open Portal's Total Due to NDC and Sales reports, filtered to this booking, and confirm the amount matches this partial-ancillary total.

**Expected Result:** The system accepts an asymmetric, onward-only ancillary selection, charges only for what was selected, and every checkpoint agrees — with no unexpected charge or carry-over onto the return leg.

**Priority:** P2

**Tags:** E2E, Regression, Boundary

**Notes:** Whether Baggage — a Per-Journey capability per ANC-48/FINDING-002 — can be selected "onward only" on a round trip at all, or is inherently whole-journey and therefore not expressible as asymmetric, has never been established in Discovery. If the UI does not allow an onward-only Baggage selection, record that as the actual (and itself informative) behavior rather than treating the test as failed.

**Review:** Approved

**Automation:** Pending

---

### TC-ANC-036 — Supplier GetAncillary endpoint data matches the Portal UI's Ancillaries step exactly

**Objective:** Verify that the Meal/Baggage ancillary data the Portal UI displays during booking — codes, descriptions, prices, and per-passenger-type eligibility — is retrieved correctly from the supplier/integration service, with no corruption, omission, or mismatch introduced between the API and the screen.

**Preconditions:** Direct HTTP access to the NDC integration service's `Search`/`FareConfirm`/`AddPassenger`/`GetAncillary` endpoints is available (same credential family as the already-used `Retrieve` endpoint). Portal user is logged in as Agency `AGN9808`.

**Test Data:**

| Field | Value |
|---|---|
| Route | DEL-DXB (transit) |
| Trip type | One-way |
| Passengers | 1 Adult, 1 Child, 1 Infant |
| Date | Any future date both the raw API and the Portal UI can search identically |

**Steps:**

1. Call the NDC integration service directly, in sequence: `Search` (with the route/date/passenger criteria above) → `FareConfirm` (using the returned `responseId`/`offerId`) → `AddPassenger` (using the returned `fareConfirmResponseId`/`selectedOfferId`) → `GetAncillary` (using the returned `responseId`/`offerId`).
2. Record the full per-segment and per-journey ancillary catalog `GetAncillary` returns: every code, description, price, and which passenger types it is offered to.
3. Separately, search the identical route/date/passenger criteria live on the Portal UI. Match the resulting offer against the raw API's offer by flight number(s) and price (after ROE 0.5 conversion, and Markup if the channel under test carries one).
4. Navigate through PAX Details → Bundles → Ancillaries on the matched offer.
5. Compare every Meal dropdown (per leg) and the Baggage dropdown against the raw `GetAncillary` catalog from step 2 — code, description, and price must match exactly after ROE conversion.
6. Confirm the Infant passenger is excluded from ancillary eligibility both in the raw API response (`passengersAncillariesAvailabilty` should contain only Adult/Child pax keys) and on the UI (no ancillary card rendered for the Infant).

**Expected Result:** Every ancillary data point the UI displays — for every eligible passenger type, every flight leg, and the baggage journey — matches the supplier/integration service's own `GetAncillary` response exactly, once ROE (and Markup, if applicable to the channel) is applied. The Infant exclusion holds at both the raw API layer and the UI layer.

**Priority:** P2

**Tags:** Scenario, Regression, Integration

**Notes:** This case reuses the same NDC integration service credential already established for the `Retrieve` endpoint (TC-ANC-022/023) — no new credential or access request needed. Added 2026-10-03 after a live execution (`TC-ANC-036/00_execution_log.md`) found 11/11, 24/24, and 10/10 exact matches across both Meal legs and Baggage, with zero discrepancies; a secondary observation (the raw catalog's 8 "Other"-category SSRs — wheelchair assistance, unaccompanied minor, fare lock, express services — are correctly never surfaced in the Meal/Baggage dropdowns, consistent with this project's established Meal/Baggage/Bundle-only scope) is carried as a non-defect note, not a gap.

**Review:** Approved

**Automation:** Pending
