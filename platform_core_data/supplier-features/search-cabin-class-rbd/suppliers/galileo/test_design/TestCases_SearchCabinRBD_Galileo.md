# Manual Test Suite — Search – Cabin Class & RBD / Galileo

| Field | Value |
|---|---|
| Module | `search-cabin-class-rbd/galileo` |
| Produced by run | `search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch` |
| Revision | 3 (2026-10-11 — TC-GSRCH-001 only: reload step and branch-persistence expectation removed, change CR-1) |
| Run Scope Type / Run Type | Feature / Custom Scope — Integration vs Direct parity, search only |
| Project Context | `supplier-features/search-cabin-class-rbd/suppliers/galileo/context/ProjectContext.md` (rev 2, Approved) |
| Total Test Cases | 18 active · 3 retired |
| Generated | 2026-10-11 |
| Status | Pending Review |
| Approved by | Rev 2: Ahmed Ayman — 2026-10-11, all 18 active cases. Rev 3: pending (TC-GSRCH-001 changed; the other 17 cases are unchanged and keep Review = Approved) |

**How to read every case.** "Integration" = browser session A, branch `NDC1_Ahmed Ayman (BRN287)`
(supplier `NDCGal`, credential `NdcGalileoSTG EGY`). "Direct" = browser session B, a separate browser,
branch `ahmed ayman (BRN632)` (supplier `Galileo`, credential `GalileoLiveSTAGING`). Both use user
`ahmed ayman`. Page: **Booking-Mid Office → Flight Search**. Enter the **same Search Criteria** in both
sessions and run the two searches at the same time.

**What is compared, and at what level.** Each result is read at the most detailed level the search
returns: **fare option × passenger type × segment**. For every segment of every fare option the search
returns `cabinClass`, `rbd` and checked baggage, per passenger type (ADT/CHD/INF). This is the data the
results list is built from (the `flight-search/search` response), and it is saved per branch as the
evidence. The page's own "N options" header is also recorded.

- **A flight (itinerary)** = its segments: marketing carrier + flight number, origin–destination, departure and arrival date-time, in order. Matched by this identity, never by list position.
- **A fare option** = one priced offer for a flight. One flight can have several fare options with different RBDs and baggage.
- **Prices, taxes and every amount are ignored.** Fare brand name (e.g. `Economy Saver`) is recorded as supporting information only.
- **Fare Basis is not observable** in the search results on either branch, so it is not recorded.
- **Baggage** is compared by **allowance** (number + unit, e.g. `2 PC`, `30 KG`). The wording is recorded separately (A9-style assertions), because the two paths word it differently.
- **Every returned result is compared.** If the full set cannot be read on either branch, the case is **Inconclusive**.
- A case is **Passed** only when the observed values from both branches are recorded for every assertion.

**Test data was validated live on 2026-10-11** before writing these cases (search only, both branches). See the Coverage Report §13 for what was checked and what was replaced.

## Case Index

| Test Case ID | Title | Tier | Priority | Tags | Review | Automation |
|---|---|---|---|---|---|---|
| TC-GSRCH-001 | Correct branch and supplier in each session | Atomic | P1 | Atomic, Smoke, Precondition | Pending | Pending |
| TC-GSRCH-002 | Parity — one-way, Economy, CAI→DXB | Scenario | P1 | Scenario, Smoke, Parity | Approved | Pending |
| TC-GSRCH-003 | Parity — round-trip, Economy, CAI⇄DXB | Scenario | P1 | Scenario, Parity | Approved | Pending |
| TC-GSRCH-004 | Parity — mixed passengers (Adult, Child, Infant) | Scenario | P2 | Scenario, Parity | Approved | Pending |
| TC-GSRCH-005 | Parity — Business, CAI→DXB | Scenario | P1 | Scenario, Parity, CabinClass | Approved | Pending |
| TC-GSRCH-006 | Parity — Premium Economy, CAI→DXB | Scenario | P1 | Scenario, Parity, CabinClass | Approved | Pending |
| TC-GSRCH-007 | Parity — First Class, CAI→DXB | Scenario | P1 | Scenario, Parity, CabinClass | Approved | Pending |
| TC-GSRCH-010 | Cabin Class filter returns only the selected cabin | Atomic | P1 | Atomic, Filter, CabinClass | Approved | Pending |
| TC-GSRCH-011 | RBD filter — Economy (Q, K, Y) | Atomic | P1 | Atomic, Filter, RBD | Approved | Pending |
| TC-GSRCH-012 | RBD filter — Business (J, C) | Atomic | P1 | Atomic, Filter, RBD | Approved | Pending |
| TC-GSRCH-013 | Parity — Cabin Class and RBD that do not match | Atomic | P4 | Atomic, Parity, Negative-InvalidInputs | Approved | Pending |
| TC-GSRCH-015 | Parity — one-way, Economy, CAI→JED | Scenario | P2 | Scenario, Parity | Approved | Pending |
| TC-GSRCH-016 | Parity — Multi-City, Economy | Scenario | P1 | Scenario, Parity, MultiCity | Approved | Pending |
| TC-GSRCH-017 | Parity — Multi-City, different Cabin per leg | Scenario | P2 | Scenario, Parity, MultiCity, CabinClass | Approved | Pending |
| TC-GSRCH-018 | RBD filter — First Class (F, A) | Atomic | P1 | Atomic, Filter, RBD | Approved | Pending |
| TC-GSRCH-019 | RBD filter — Premium Economy (J) | Atomic | P2 | Atomic, Filter, RBD | Approved | Pending |
| TC-GSRCH-020 | RBD filter — several RBDs selected together (Q + K) | Atomic | P3 | Atomic, Filter, RBD | Approved | Pending |
| TC-GSRCH-021 | RBD filter — on one Multi-City leg only | Atomic | P2 | Atomic, Filter, RBD, MultiCity | Approved | Pending |

**Tier breakdown (active):** 10 Atomic · 8 Scenario · 0 E2E — plus 3 retired

**Lifecycle breakdown:** Review — 1 Pending · 17 Approved · 0 Rejected · Automation — 18 Pending · 0 Approved · 0 Rejected

### Retired cases (rev 2) — kept for the record, not executed

| Test Case ID | Was | Why retired |
|---|---|---|
| TC-GSRCH-008 | Parity — large result set (DXB→BOM) | Every parity case now compares every result (CMP-06); a separate volume case adds nothing. |
| TC-GSRCH-009 | Parity — RBD per segment on a connecting itinerary (DXB→JFK) | Every parity case now compares RBD per fare option × passenger type × segment. DXB→JFK was not validated. |
| TC-GSRCH-014 | Parity — date outside the schedule window | Not related to Cabin Class, RBD or result parity (reviewer refinement #4). |

## Test Cases

### TC-GSRCH-001 — Correct branch and supplier in each session

**Objective:** Verify that each session searches under its own branch and reaches the expected Galileo path.

**Preconditions:** Session A and session B are open in separate browsers and logged in as `ahmed ayman`. Both are on Booking-Mid Office → Flight Search.

**Test Data:**

| Field | Value |
|---|---|
| Session A branch | `NDC1_Ahmed Ayman (BRN287)` |
| Session B branch | `ahmed ayman (BRN632)` |

**Steps:**

1. In session A, select branch `NDC1_Ahmed Ayman (BRN287)`.
2. In session B, select branch `ahmed ayman (BRN632)`.
3. In session A, click **Check Supplier** and open the **Supplier** list.
4. In session B, click **Check Supplier** and open the **Supplier** list.
5. Close both dialogs.

**Expected Result:** Session A lists supplier `NDCGal`. Session B lists supplier `Galileo`. Selecting a branch in one session does not change the other.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Session A branch is `NDC1_Ahmed Ayman (BRN287)` | Expected Result | equals | SRCH-01 |
| A2 | Session B branch is `ahmed ayman (BRN632)` | Expected Result | equals | SRCH-01 |
| A3 | Session A supplier list is `NDCGal` (Integration path) | Expected Result | equals | SRCH-01 |
| A4 | Session B supplier list is `Galileo` (Direct path) | Expected Result | equals | SRCH-01 |
| A5 | Branch selection in one session does not change the other | Expected Result | present | SRCH-01 |

**Priority:** P1

**Tags:** Atomic, Smoke, Precondition

**Notes:** If A3–A5 fail, stop — no parity result is trustworthy until the two paths are confirmed and isolated. Rev 3 (2026-10-11, change CR-1 / IA-576ed7379024, approved by Ahmed Ayman): removed the page-reload step and the expectation that the branch stays selected after a reload — no requirement covers it (SRCH-01). Review was Approved (2026-10-11) and is reset to Pending by this rewrite.

**Review:** Pending

**Automation:** Pending

**Requires:** None

### TC-GSRCH-002 — Parity — one-way, Economy, CAI→DXB

**Objective:** Verify that both branches return the same flights and fare details for a one-way Economy search.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Economy |
| RBD | none |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. Click **Search** in both sessions.
4. Record each branch's "N options" header.
5. Record every returned fare option: segments, flight numbers, times, stops, and per passenger type and segment the Cabin Class, RBD and baggage.
6. Match flights by identity, then fare options within each flight.

**Expected Result:** Both branches return the same flights with the same segments, times and stops. Each matched flight has the same fare options, and each fare option has the same Cabin Class, RBD and baggage allowance per segment. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Number of flights (itineraries), Integration vs Direct | Expected Result | equals | SRCH-03 |
| A2 | Every flight has a match on the other branch, both directions | Expected Result | present | SRCH-03, CMP-03 |
| A3 | Airline and flight number per segment | Expected Result | equals | SRCH-04 |
| A4 | Departure and arrival date-time per segment | Expected Result | equals | SRCH-05 |
| A5 | Segments, connection points and number of stops | Expected Result | equals | SRCH-06 |
| A6 | Fare options per matched flight (same set on both branches) | Expected Result | equals | SRCH-03, SRCH-08 |
| A7 | Cabin Class and RBD per fare option × passenger type × segment | Expected Result | equals | SRCH-07, SRCH-08 |
| A8 | Baggage allowance (number + unit) per fare option × segment | Expected Result | equals | SRCH-09 |
| A9 | Baggage wording per fare option | Expected Result | equals | SRCH-09 |

**Priority:** P1

**Tags:** Scenario, Smoke, Parity

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-003 — Parity — round-trip, Economy, CAI⇄DXB

**Objective:** Verify that both branches return the same outbound/return combinations and fare details for a round-trip Economy search.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | Round-trip |
| From → To | `CAI` → `DXB` |
| Departure / Return | 18/11/2026 / 25/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Economy |
| RBD | none |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. Click **Search** in both sessions.
4. Record each branch's "N options" header.
5. Record every returned fare option, outbound and return: segments, flight numbers, times, stops, and per passenger type and segment the Cabin Class, RBD and baggage.
6. Match outbound + return combinations by identity, then fare options within each.

**Expected Result:** Both branches return the same outbound + return combinations with the same segments, times and stops. Each matched combination has the same fare options, and each has the same Cabin Class, RBD and baggage allowance per segment. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Number of outbound + return combinations, Integration vs Direct | Expected Result | equals | SRCH-03 |
| A2 | Every combination has a match on the other branch, both directions | Expected Result | present | SRCH-03, CMP-03 |
| A3 | Airline and flight number per segment, both legs | Expected Result | equals | SRCH-04 |
| A4 | Departure and arrival date-time per segment, both legs | Expected Result | equals | SRCH-05 |
| A5 | Segments, connection points and stops, both legs | Expected Result | equals | SRCH-06 |
| A6 | Fare options per matched combination | Expected Result | equals | SRCH-03, SRCH-08 |
| A7 | Cabin Class and RBD per fare option × passenger type × segment | Expected Result | equals | SRCH-07, SRCH-08 |
| A8 | Baggage allowance per fare option × segment | Expected Result | equals | SRCH-09 |
| A9 | Baggage wording per fare option | Expected Result | equals | SRCH-09 |

**Priority:** P1

**Tags:** Scenario, Parity

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-004 — Parity — mixed passengers (Adult, Child, Infant)

**Objective:** Verify that both branches return the same flights and per-passenger-type fare details when the search includes Adults, a Child and an Infant.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 2 Adults, 1 Child, 1 Infant |
| Cabin Class | Economy |
| RBD | none |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data. Set passengers with the passenger selector.
3. Click **Search** in both sessions.
4. Record each branch's "N options" header.
5. Record every returned fare option, for each passenger type (ADT, CHD, INF) and segment: Cabin Class, RBD and baggage. Record segments, flight numbers, times and stops.
6. Match flights by identity, then fare options within each flight.

**Expected Result:** Both branches return the same flights. Each matched fare option shows the same passenger types and counts, and the same Cabin Class, RBD and baggage allowance per passenger type and segment. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Number of flights, Integration vs Direct | Expected Result | equals | SRCH-03 |
| A2 | Every flight has a match on the other branch, both directions | Expected Result | present | SRCH-03, CMP-03 |
| A3 | Airline, flight number, date-time per segment | Expected Result | equals | SRCH-04, SRCH-05 |
| A4 | Segments and stops | Expected Result | equals | SRCH-06 |
| A5 | Passenger types and counts per fare option (`ADT×2`, `CHD×1`, `INF×1`) | Test Data | equals | SRCH-02 |
| A6 | Fare options per matched flight | Expected Result | equals | SRCH-03, SRCH-08 |
| A7 | Cabin Class and RBD per fare option × passenger type × segment | Expected Result | equals | SRCH-07, SRCH-08 |
| A8 | Baggage allowance per fare option × passenger type × segment | Expected Result | equals | SRCH-09 |

**Priority:** P2

**Tags:** Scenario, Parity

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-005 — Parity — Business, CAI→DXB

**Objective:** Verify that both branches return the same Business flights and fare details.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Business |
| RBD | none |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. Click **Search** in both sessions.
4. Record each branch's "N options" header.
5. Record every returned fare option: segments, flight numbers, times, stops, and per segment the Cabin Class, RBD and baggage.
6. Match flights by identity, then fare options within each flight.

**Expected Result:** Both branches return the same flights. Each matched fare option has the same Cabin Class name, RBD and baggage allowance per segment. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Number of flights, Integration vs Direct | Expected Result | equals | SRCH-03 |
| A2 | Every flight has a match on the other branch, both directions | Expected Result | present | SRCH-03, CMP-03 |
| A3 | Airline, flight number, date-time per segment; segments and stops | Expected Result | equals | SRCH-04, SRCH-05, SRCH-06 |
| A4 | Fare options per matched flight | Expected Result | equals | SRCH-03, SRCH-08 |
| A5 | Cabin Class name per fare option × segment | Expected Result | equals | SRCH-07 |
| A6 | RBD per fare option × segment | Expected Result | equals | SRCH-08 |
| A7 | Baggage allowance per fare option × segment | Expected Result | equals | SRCH-09 |

**Priority:** P1

**Tags:** Scenario, Parity, CabinClass

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-006 — Parity — Premium Economy, CAI→DXB

**Objective:** Verify that both branches return the same Premium Economy flights and fare details.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Premium Economy |
| RBD | none |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. Click **Search** in both sessions.
4. Record each branch's "N options" header.
5. Record every returned fare option: segments, flight numbers, times, stops, and per segment the Cabin Class, RBD and baggage.
6. Match flights by identity, then fare options within each flight.

**Expected Result:** Both branches return the same flights. Each matched fare option has the same Cabin Class, RBD and baggage allowance per segment. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Number of flights, Integration vs Direct | Expected Result | equals | SRCH-03 |
| A2 | Every flight has a match on the other branch, both directions | Expected Result | present | SRCH-03, CMP-03 |
| A3 | Airline, flight number, date-time per segment; segments and stops | Expected Result | equals | SRCH-04, SRCH-05, SRCH-06 |
| A4 | Fare options per matched flight | Expected Result | equals | SRCH-03, SRCH-08 |
| A5 | Cabin Class per fare option × segment | Expected Result | equals | SRCH-07 |
| A6 | RBD per fare option × segment | Expected Result | equals | SRCH-08 |
| A7 | Baggage allowance per fare option × segment | Expected Result | equals | SRCH-09 |

**Priority:** P1

**Tags:** Scenario, Parity, CabinClass

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-007 — Parity — First Class, CAI→DXB

**Objective:** Verify that both branches return the same First Class flights and fare details.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | First Class |
| RBD | none |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. Click **Search** in both sessions.
4. Record each branch's "N options" header.
5. Record every returned fare option: segments, flight numbers, times, stops, and per segment the Cabin Class, RBD and baggage.
6. Match flights by identity, then fare options within each flight.

**Expected Result:** Both branches return the same flights. Each matched fare option has the same Cabin Class, RBD and baggage allowance per segment. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Number of flights, Integration vs Direct | Expected Result | equals | SRCH-03 |
| A2 | Every flight has a match on the other branch, both directions | Expected Result | present | SRCH-03, CMP-03 |
| A3 | Airline, flight number, date-time per segment; segments and stops | Expected Result | equals | SRCH-04, SRCH-05, SRCH-06 |
| A4 | Fare options per matched flight | Expected Result | equals | SRCH-03, SRCH-08 |
| A5 | Cabin Class per fare option × segment | Expected Result | equals | SRCH-07 |
| A6 | RBD per fare option × segment | Expected Result | equals | SRCH-08 |
| A7 | Baggage allowance per fare option × segment | Expected Result | equals | SRCH-09 |

**Priority:** P1

**Tags:** Scenario, Parity, CabinClass

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-010 — Cabin Class filter returns only the selected cabin

**Objective:** Verify that a search for a given Cabin Class returns only fare options in that cabin, on each branch.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class (one search each) | Economy · Premium Economy · Business · First Class |
| RBD | none |

**Steps:**

1. In both sessions, enter the Test Data with Cabin Class **Economy**.
2. Click **Search** in both sessions.
3. Record the Cabin Class of every segment of every fare option returned.
4. Repeat steps 1–3 for Premium Economy, Business and First Class.

**Expected Result:** For each Cabin Class searched, on each branch, the result set is not empty and every segment of every fare option is in the selected cabin.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Economy: every segment is Economy (Integration, Direct) | Expected Result | equals | SRCH-10 |
| A2 | Premium Economy: every segment is Premium Economy (Integration, Direct) | Expected Result | equals | SRCH-10 |
| A3 | Business: every segment is Business (Integration, Direct) | Expected Result | equals | SRCH-10 |
| A4 | First Class: every segment is First Class (Integration, Direct) | Expected Result | equals | SRCH-10 |
| A5 | Each cabin's result set is not empty on the branch where it is judged | Project Context CMP-05 | ≥ 1 | SRCH-10 |

**Priority:** P1

**Tags:** Atomic, Filter, CabinClass

**Notes:** A cabin with zero results on a branch is Inconclusive for that cabin on that branch. The searches of TC-GSRCH-002/005/006/007 may be reused — same criteria, same run.

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-011 — RBD filter — Economy (Q, K, Y)

**Objective:** Verify that an Economy search with one RBD selected returns only fare options booked in that RBD, on each branch.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Economy |
| RBD (one search each) | `Q` · `K` · `Y` |

**Steps:**

1. In both sessions, enter the Test Data with RBD `Q` only.
2. Click **Search** in both sessions.
3. Record the RBD and Cabin Class of every segment of every fare option, and the flights returned.
4. Repeat steps 1–3 for RBD `K`, then `Y`.

**Expected Result:** For each RBD, on each branch, the result set is not empty and every segment of every fare option has the selected RBD in Economy. Both branches return the same flights for the same RBD.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | `Q`: result set not empty (Integration, Direct) | Project Context CMP-05 | ≥ 1 | SRCH-11 |
| A2 | `Q`: every segment RBD = `Q`, cabin Economy (Integration, Direct) | Expected Result | equals | SRCH-11 |
| A3 | `Q`: same flights on both branches | Expected Result | equals | SRCH-03 |
| A4 | `K`: result set not empty (Integration, Direct) | Project Context CMP-05 | ≥ 1 | SRCH-11 |
| A5 | `K`: every segment RBD = `K`, cabin Economy (Integration, Direct) | Expected Result | equals | SRCH-11 |
| A6 | `K`: same flights on both branches | Expected Result | equals | SRCH-03 |
| A7 | `Y`: result set not empty (Integration, Direct) | Project Context CMP-05 | ≥ 1 | SRCH-11 |
| A8 | `Y`: every segment RBD = `Y`, cabin Economy (Integration, Direct) | Expected Result | equals | SRCH-11 |
| A9 | `Y`: same flights on both branches | Expected Result | equals | SRCH-03 |

**Priority:** P1

**Tags:** Atomic, Filter, RBD

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-012 — RBD filter — Business (J, C)

**Objective:** Verify that a Business search with one RBD selected returns only fare options booked in that RBD, on each branch.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Business |
| RBD (one search each) | `J` · `C` |

**Steps:**

1. In both sessions, enter the Test Data with RBD `J` only.
2. Click **Search** in both sessions.
3. Record the RBD and Cabin Class of every segment of every fare option, and the flights returned.
4. Repeat steps 1–3 for RBD `C`.

**Expected Result:** For each RBD, on each branch, the result set is not empty and every segment of every fare option has the selected RBD in Business. Both branches return the same flights for the same RBD.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | `J`: result set not empty (Integration, Direct) | Project Context CMP-05 | ≥ 1 | SRCH-11 |
| A2 | `J`: every segment RBD = `J`, cabin Business (Integration, Direct) | Expected Result | equals | SRCH-11 |
| A3 | `J`: same flights on both branches | Expected Result | equals | SRCH-03 |
| A4 | `C`: result set not empty (Integration, Direct) | Project Context CMP-05 | ≥ 1 | SRCH-11 |
| A5 | `C`: every segment RBD = `C`, cabin Business (Integration, Direct) | Expected Result | equals | SRCH-11 |
| A6 | `C`: same flights on both branches | Expected Result | equals | SRCH-03 |

**Priority:** P1

**Tags:** Atomic, Filter, RBD

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-013 — Parity — Cabin Class and RBD that do not match

**Objective:** Verify that both branches behave the same when the selected RBD is not offered in the selected cabin.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Economy |
| RBD | `J` |

**Steps:**

1. In both sessions, enter the Test Data.
2. Click **Search** in both sessions.
3. Record the outcome on each branch: message shown, or every fare option with its Cabin Class and RBD.

**Expected Result:** Both branches give the same outcome: the same message, or the same fare options with the same Cabin Class and RBD.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Outcome type (message / no results / results), Integration vs Direct | Expected Result | equals | SRCH-02, SRCH-03 |
| A2 | Message text, when a message is shown | Expected Result | equals | SRCH-03 |
| A3 | Fare options, Cabin Class and RBD, when results are shown | Expected Result | equals | SRCH-07, SRCH-08 |

**Priority:** P4

**Tags:** Atomic, Parity, Negative-InvalidInputs

**Notes:** No correct behavior is defined for this combination (no Galileo rule is confirmed). Only parity is judged.

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-015 — Parity — one-way, Economy, CAI→JED

**Objective:** Verify that both branches return the same flights and fare details on a second route.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `JED` |
| Departure | 20/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Economy |
| RBD | none |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, enter the Test Data.
3. Click **Search** in both sessions.
4. Record each branch's "N options" header.
5. Record every returned fare option: segments, flight numbers, times, stops, and per segment the Cabin Class, RBD and baggage.
6. Match flights by identity, then fare options within each flight.

**Expected Result:** Both branches return the same flights with the same segments, times and stops. Each matched flight has the same fare options with the same Cabin Class, RBD and baggage allowance per segment. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Number of flights, Integration vs Direct | Expected Result | equals | SRCH-03 |
| A2 | Every flight has a match on the other branch, both directions | Expected Result | present | SRCH-03, CMP-03 |
| A3 | Airline, flight number, date-time per segment; segments and stops | Expected Result | equals | SRCH-04, SRCH-05, SRCH-06 |
| A4 | Fare options per matched flight | Expected Result | equals | SRCH-03, SRCH-08 |
| A5 | Cabin Class and RBD per fare option × segment | Expected Result | equals | SRCH-07, SRCH-08 |
| A6 | Baggage allowance per fare option × segment | Expected Result | equals | SRCH-09 |

**Priority:** P2

**Tags:** Scenario, Parity

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-016 — Parity — Multi-City, Economy

**Objective:** Verify that both branches return the same flight combinations and fare details for a two-leg Multi-City search.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | Multi-city |
| Leg 1 | `CAI` → `DXB`, 18/11/2026, Economy, RBD none |
| Leg 2 | `DXB` → `JED`, 22/11/2026, Economy, RBD none |
| Passengers | 1 Adult |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, select **Multi-city** and enter both legs from the Test Data.
3. Click **Search** in both sessions.
4. Record each branch's "N options" header.
5. Record every returned fare option, both legs: segments, flight numbers, times, stops, and per segment the Cabin Class, RBD and baggage.
6. Match leg 1 + leg 2 combinations by identity, then fare options within each.

**Expected Result:** Both branches return the same leg 1 + leg 2 combinations with the same segments, times and stops. Each matched combination has the same fare options with the same Cabin Class, RBD and baggage allowance per segment. Prices are ignored.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Number of combinations, Integration vs Direct | Expected Result | equals | SRCH-03 |
| A2 | Every combination has a match on the other branch, both directions | Expected Result | present | SRCH-03, CMP-03 |
| A3 | Airline, flight number, date-time per segment; segments and stops, both legs | Expected Result | equals | SRCH-04, SRCH-05, SRCH-06 |
| A4 | Fare options per matched combination | Expected Result | equals | SRCH-03, SRCH-08 |
| A5 | Cabin Class and RBD per fare option × segment | Expected Result | equals | SRCH-07, SRCH-08 |
| A6 | Baggage allowance per fare option × segment | Expected Result | equals | SRCH-09 |

**Priority:** P1

**Tags:** Scenario, Parity, MultiCity

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-017 — Parity — Multi-City, different Cabin per leg

**Objective:** Verify that both branches apply a different Cabin Class per Multi-City leg in the same way.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | Multi-city |
| Leg 1 | `CAI` → `DXB`, 18/11/2026, **Economy**, RBD none |
| Leg 2 | `DXB` → `JED`, 22/11/2026, **Business**, RBD none |
| Passengers | 1 Adult |

**Steps:**

1. In both sessions, confirm the branch.
2. In both sessions, select **Multi-city** and enter both legs, with Cabin Class set per leg as in the Test Data.
3. Click **Search** in both sessions.
4. Record every returned fare option, both legs: segments, flight numbers, times, and per segment the Cabin Class, RBD and baggage.
5. Match combinations by identity, then fare options within each.

**Expected Result:** Both branches return the same combinations and fare options. On both branches, leg 1 segments are Economy and leg 2 segments are Business, with the same RBD and baggage allowance per segment.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Number of combinations, Integration vs Direct | Expected Result | equals | SRCH-03 |
| A2 | Every combination has a match on the other branch, both directions | Expected Result | present | SRCH-03, CMP-03 |
| A3 | Leg 1 segments are Economy (Integration, Direct) | Test Data | equals | SRCH-10 |
| A4 | Leg 2 segments are Business (Integration, Direct) | Test Data | equals | SRCH-10 |
| A5 | Cabin Class and RBD per fare option × segment, Integration vs Direct | Expected Result | equals | SRCH-07, SRCH-08 |
| A6 | Baggage allowance per fare option × segment | Expected Result | equals | SRCH-09 |

**Priority:** P2

**Tags:** Scenario, Parity, MultiCity, CabinClass

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-018 — RBD filter — First Class (F, A)

**Objective:** Verify that a First Class search with one RBD selected returns only fare options booked in that RBD, on each branch.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | First Class |
| RBD (one search each) | `F` · `A` |

**Steps:**

1. In both sessions, enter the Test Data with RBD `F` only.
2. Click **Search** in both sessions.
3. Record the RBD and Cabin Class of every segment of every fare option, and the flights returned.
4. Repeat steps 1–3 for RBD `A`.

**Expected Result:** For each RBD, on each branch, the result set is not empty and every segment of every fare option has the selected RBD in First Class. Both branches return the same flights for the same RBD.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | `F`: result set not empty (Integration, Direct) | Project Context CMP-05 | ≥ 1 | SRCH-11 |
| A2 | `F`: every segment RBD = `F`, cabin First Class (Integration, Direct) | Expected Result | equals | SRCH-11 |
| A3 | `F`: same flights on both branches | Expected Result | equals | SRCH-03 |
| A4 | `A`: result set not empty (Integration, Direct) | Project Context CMP-05 | ≥ 1 | SRCH-11 |
| A5 | `A`: every segment RBD = `A`, cabin First Class (Integration, Direct) | Expected Result | equals | SRCH-11 |
| A6 | `A`: same flights on both branches | Expected Result | equals | SRCH-03 |

**Priority:** P1

**Tags:** Atomic, Filter, RBD

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-019 — RBD filter — Premium Economy (J)

**Objective:** Verify that a Premium Economy search with RBD `J` returns only fare options booked in `J`, on each branch.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Premium Economy |
| RBD | `J` |

**Steps:**

1. In both sessions, enter the Test Data.
2. Click **Search** in both sessions.
3. Record the RBD and Cabin Class of every segment of every fare option, and the flights returned.

**Expected Result:** On each branch, the result set is not empty and every segment of every fare option has RBD `J` in Premium Economy. Both branches return the same flights.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Result set not empty (Integration, Direct) | Project Context CMP-05 | ≥ 1 | SRCH-11 |
| A2 | Every segment RBD = `J`, cabin Premium Economy (Integration, Direct) | Expected Result | equals | SRCH-11 |
| A3 | Same flights on both branches | Expected Result | equals | SRCH-03 |

**Priority:** P2

**Tags:** Atomic, Filter, RBD

**Notes:** `J` was chosen because it is the RBD the Premium Economy search returned during test-data validation (Coverage Report §13). It is not assumed to be a Galileo rule.

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-020 — RBD filter — several RBDs selected together (Q + K)

**Objective:** Verify that selecting two RBDs returns only fare options booked in one of them, on each branch.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | One-way |
| From → To | `CAI` → `DXB` |
| Departure | 18/11/2026 |
| Passengers | 1 Adult |
| Cabin Class | Economy |
| RBD | `Q` and `K` (both selected) |

**Steps:**

1. In both sessions, enter the Test Data. Select both `Q` and `K` in the RBD list.
2. Click **Search** in both sessions.
3. Record the RBD of every segment of every fare option, and the flights returned.

**Expected Result:** On each branch, the result set is not empty and every segment of every fare option has RBD `Q` or `K`. Both branches return the same flights.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Result set not empty (Integration, Direct) | Project Context CMP-05 | ≥ 1 | SRCH-11 |
| A2 | Every segment RBD is `Q` or `K` (Integration, Direct) | Expected Result | matches `Q\|K` | SRCH-11 |
| A3 | Same flights on both branches | Expected Result | equals | SRCH-03 |

**Priority:** P3

**Tags:** Atomic, Filter, RBD

**Review:** Approved

**Automation:** Pending

**Requires:** None

### TC-GSRCH-021 — RBD filter — on one Multi-City leg only

**Objective:** Verify that an RBD set on one Multi-City leg applies to that leg only, the same way on both branches.

**Preconditions:** TC-GSRCH-001 passed. Session A is on branch `NDC1_Ahmed Ayman (BRN287)`; session B is on branch `ahmed ayman (BRN632)`.

**Test Data:**

| Field | Value |
|---|---|
| Trip Type | Multi-city |
| Leg 1 | `CAI` → `DXB`, 18/11/2026, Economy, RBD `Q` |
| Leg 2 | `DXB` → `JED`, 22/11/2026, Economy, RBD none |
| Passengers | 1 Adult |

**Steps:**

1. In both sessions, select **Multi-city** and enter both legs from the Test Data.
2. Click **Search** in both sessions.
3. Record the RBD of every segment of every fare option, per leg, and the combinations returned.

**Expected Result:** On each branch, the result set is not empty, every leg 1 segment has RBD `Q`, and leg 2 is not limited to `Q`. Both branches return the same combinations.

**Assertions:**

| Assertion ID | Expected | Expected Source | Check | Requirement |
|---|---|---|---|---|
| A1 | Result set not empty (Integration, Direct) | Project Context CMP-05 | ≥ 1 | SRCH-11 |
| A2 | Every leg 1 segment RBD = `Q` (Integration, Direct) | Test Data | equals | SRCH-11 |
| A3 | Same combinations on both branches | Expected Result | equals | SRCH-03 |
| A4 | Leg 2 RBDs, Integration vs Direct | Expected Result | equals | SRCH-08 |

**Priority:** P2

**Tags:** Atomic, Filter, RBD, MultiCity

**Notes:** If leg 2 also shows only `Q` on both branches, record it — A4 still judges parity; whether that is correct is a question for the reviewer.

**Review:** Approved

**Automation:** Pending

**Requires:** None
