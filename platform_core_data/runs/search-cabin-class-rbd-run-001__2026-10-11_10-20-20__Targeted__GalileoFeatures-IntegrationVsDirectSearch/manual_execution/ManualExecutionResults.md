# Manual Execution Results — search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch

## 1. Execution Metadata

| Field | Value |
|---|---|
| Execution ID | search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch/4M/cycle-1 |
| Run Folder | `search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch` |
| Run Scope Type / Run Type | Feature (Supplier Feature) / Custom Scope — Integration vs Direct parity, search only |
| Scope | `search-cabin-class-rbd` / Supplier `galileo` |
| Environment | Staging (assumed — see Known Limitations), Safety Preflight SP-1 |
| Target URL | http://192.168.1.210/ — Booking-Mid Office → Flight Search |
| Role(s) used | user `ahmed ayman`, two isolated browser sessions: A = Integration branch `NDC1_Ahmed Ayman (BRN287)` (supplier `NDCGal`), B = Direct branch `ahmed ayman (BRN632)` (supplier `Galileo`) |
| Execution mode | **Headed** (confirmed by Ahmed Ayman before execution) |
| Mechanism | Playwright (Chromium), two separate browser processes, driven from a throwaway local script in the session scratchpad (not kept). Not the Playwright MCP server / BrowserDriver — see Known Limitations |
| Started | 2026-10-11T08:45:38Z |
| Ended | 2026-10-11T09:11:31Z |
| Test Suites executed | `supplier-features/search-cabin-class-rbd/suppliers/galileo/test_design/TestCases_SearchCabinRBD_Galileo.md` (rev 2, Approved) |
| Comparison level | fare option × passenger type × segment, from the `flight-search/search` response the results page renders; prices removed |

## 2. Result Totals

| Status | Count |
|---|---|
| Passed | 4 |
| Failed | 13 |
| Blocked | 0 |
| Skipped | 0 |
| Not Executed | 0 |
| Inconclusive | 1 |
| **Executable scope** (`Review = Approved`) | **18** |
| Excluded — Pending Review | 0 |
| Excluded — Rejected at Review | 0 |
| Excluded — Not supported by supplier | 0 |
| **Suite total** (active cases) | **18** |

Retired cases TC-GSRCH-008, 009, 014 are not in the active suite (Stage 3 rev 2) and were not executed.

## 3. Per-Test Results

| Test Case ID | Module | Status | Execution Time | Reason (non-Passed) | Defects | Evidence Refs |
|---|---|---|---|---|---|---|
| TC-GSRCH-001 | search-cabin-class-rbd/galileo | Inconclusive | 40s | All 5 assertions passed. The Expected Result also says the branch stays selected after a page reload; it does not (cleared in both sessions, identically). No requirement defines that, so this is a test-case wording issue, not an application failure — flagged to Stage 3. |  | artifacts/TC001.sessions.json |
| TC-GSRCH-002 | search-cabin-class-rbd/galileo | Failed | 7s | A6: Integration returns 30 extra fare options (higher fare brands) on 30 of 34 flights. Flights, segments, times, stops, Cabin, RBD and baggage allowance of every matched fare option are equal. | DEF-03 | artifacts/E02_eco.comparison.json; artifacts/E02_eco.integration.json; artifacts/E02_eco.direct.json; artifacts/E02_eco.integration.png; artifacts/E02_eco.direct.png |
| TC-GSRCH-003 | search-cabin-class-rbd/galileo | Failed | 9s | A1/A2: 13 outbound+return combinations only on Integration. A6: 83 fare options only on Integration, 5 (Emirates "Economy Flex", RBD L/K) only on Direct. Integration returned exactly 200 offers — possibly capped. | DEF-03, DEF-04 | artifacts/E03_rt.comparison.json; artifacts/E03_rt.integration.json; artifacts/E03_rt.direct.json; artifacts/E03_rt.integration.png; artifacts/E03_rt.direct.png |
| TC-GSRCH-004 | search-cabin-class-rbd/galileo | Failed | 7s | A6: Integration returns 29 extra fare options. Everything else equal, per passenger type. | DEF-03 | artifacts/E04_pax.comparison.json; artifacts/E04_pax.integration.json; artifacts/E04_pax.direct.json; artifacts/E04_pax.integration.png; artifacts/E04_pax.direct.png |
| TC-GSRCH-005 | search-cabin-class-rbd/galileo | Failed | 7s | A4: 25 extra fare options on Integration. A5: the Oman Air "BUSINESS COMFORT" option (WY408+WY603) is labelled `FirstClass` on Integration and `First` on Direct. | DEF-03, DEF-05 | artifacts/E05_bus.comparison.json; artifacts/E05_bus.integration.json; artifacts/E05_bus.direct.json; artifacts/E05_bus.integration.png; artifacts/E05_bus.direct.png |
| TC-GSRCH-006 | search-cabin-class-rbd/galileo | Failed | 8s | Integration ignores Premium Economy: it returns the same 34 flights as an Economy search, all in Economy. Direct returns 12 Premium Economy flights (RBD J). | DEF-01 | artifacts/E06_prem.comparison.json; artifacts/E06_prem.integration.json; artifacts/E06_prem.direct.json; artifacts/E06_prem.integration.png; artifacts/E06_prem.direct.png |
| TC-GSRCH-007 | search-cabin-class-rbd/galileo | Failed | 7s | Integration ignores First Class: it returns the same 34 flights as a Business search. Direct returns 10 First Class flights. | DEF-02 | artifacts/E07_first.comparison.json; artifacts/E07_first.integration.json; artifacts/E07_first.direct.json; artifacts/E07_first.integration.png; artifacts/E07_first.direct.png |
| TC-GSRCH-010 | search-cabin-class-rbd/galileo | Failed | 29s | Premium Economy and First Class are not applied on Integration (DEF-01, DEF-02). A Business search returns one Oman Air option whose segments are in First cabin, on both branches (DEF-06). | DEF-01, DEF-02, DEF-06 | artifacts/E02_eco.comparison.json; artifacts/E02_eco.integration.json; artifacts/E02_eco.direct.json; artifacts/E05_bus.comparison.json; artifacts/E05_bus.integration.json; artifacts/E05_bus.direct.json; artifacts/E06_prem.comparison.json; artifacts/E06_prem.integration.json; artifacts/E06_prem.direct.json; artifacts/E07_first.comparison.json; artifacts/E07_first.integration.json; artifacts/E07_first.direct.json; artifacts/E06_prem.integration.png; artifacts/E06_prem.direct.png; artifacts/E07_first.integration.png; artifacts/E07_first.direct.png; artifacts/E05_bus.integration.png; artifacts/E05_bus.direct.png |
| TC-GSRCH-011 | search-cabin-class-rbd/galileo | Passed | 21s |  |  | artifacts/E08_ecoQ.comparison.json; artifacts/E08_ecoQ.integration.json; artifacts/E08_ecoQ.direct.json; artifacts/E09_ecoK.comparison.json; artifacts/E09_ecoK.integration.json; artifacts/E09_ecoK.direct.json; artifacts/E10_ecoY.comparison.json; artifacts/E10_ecoY.integration.json; artifacts/E10_ecoY.direct.json |
| TC-GSRCH-012 | search-cabin-class-rbd/galileo | Passed | 18s |  |  | artifacts/E11_busJ.comparison.json; artifacts/E11_busJ.integration.json; artifacts/E11_busJ.direct.json; artifacts/E12_busC.comparison.json; artifacts/E12_busC.integration.json; artifacts/E12_busC.direct.json |
| TC-GSRCH-013 | search-cabin-class-rbd/galileo | Passed | 6s |  |  | artifacts/E13_ecoJ.comparison.json; artifacts/E13_ecoJ.integration.json; artifacts/E13_ecoJ.direct.json |
| TC-GSRCH-015 | search-cabin-class-rbd/galileo | Failed | 7s | A4: 34 extra fare options on Integration. Flights and fare details equal. | DEF-03 | artifacts/E14_jed.comparison.json; artifacts/E14_jed.integration.json; artifacts/E14_jed.direct.json; artifacts/E14_jed.integration.png; artifacts/E14_jed.direct.png |
| TC-GSRCH-016 | search-cabin-class-rbd/galileo | Failed | 9s | A1/A2: 14 leg-1+leg-2 combinations only on Integration. A4: 64 extra fare options on Integration. Integration returned exactly 200 offers — possibly capped. | DEF-03, DEF-04 | artifacts/E15_mc.comparison.json; artifacts/E15_mc.integration.json; artifacts/E15_mc.direct.json; artifacts/E15_mc.integration.png; artifacts/E15_mc.direct.png |
| TC-GSRCH-017 | search-cabin-class-rbd/galileo | Failed | 9s | A1/A2: 4 combinations only on Integration. A3/A5: on Direct, leg-1 segment ET600 (Economy requested) comes back as Business / RBD D; Integration returns it as Economy / RBD V. | DEF-04, DEF-07 | artifacts/E16_mcbus.comparison.json; artifacts/E16_mcbus.integration.json; artifacts/E16_mcbus.direct.json; artifacts/E16_mcbus.integration.png; artifacts/E16_mcbus.direct.png |
| TC-GSRCH-018 | search-cabin-class-rbd/galileo | Failed | 11s | Integration returns no First Class fares: RBD F → No Flights Found (Direct 10); RBD A → 1 offer whose segments are Business (Direct 10 First). | DEF-02 | artifacts/E17_firstF.comparison.json; artifacts/E17_firstF.integration.json; artifacts/E17_firstF.direct.json; artifacts/E18_firstA.comparison.json; artifacts/E18_firstA.integration.json; artifacts/E18_firstA.direct.json; artifacts/E17_firstF.integration.png; artifacts/E17_firstF.direct.png; artifacts/E18_firstA.integration.png; artifacts/E18_firstA.direct.png |
| TC-GSRCH-019 | search-cabin-class-rbd/galileo | Failed | 6s | Integration returns No Flights Found; Direct returns 5 Premium Economy flights in RBD J. | DEF-01 | artifacts/E19_premJ.comparison.json; artifacts/E19_premJ.integration.json; artifacts/E19_premJ.direct.json; artifacts/E19_premJ.integration.png; artifacts/E19_premJ.direct.png |
| TC-GSRCH-020 | search-cabin-class-rbd/galileo | Passed | 7s |  |  | artifacts/E20_ecoQK.comparison.json; artifacts/E20_ecoQK.integration.json; artifacts/E20_ecoQK.direct.json |
| TC-GSRCH-021 | search-cabin-class-rbd/galileo | Failed | 10m | Search does nothing on both branches when an RBD is set on leg 1 only: no request is sent and no message is shown (seen 2 times per branch). Control checks: no RBD on any leg → search runs; RBD on both legs → search runs; RBD on leg 2 only → no request. | DEF-08 | artifacts/E21_mcQ.integration.png; artifacts/E21_mcQ.direct.png; artifacts/E21_mcQ.integration.json; artifacts/E21_mcQ.direct.json |

### 3.1 Assertion Records — every case (`pipeline.md` §11.4)

"Integration vs Direct equal" rows are checked by the comparison files cited in Evidence: every returned flight and fare option is matched by identity and compared field by field. Counts and differences are in the Actual column.

| Test Case ID | Assertion ID | Assertion | Expected | Expected Source | Actual | Check | Result | Evidence |
|---|---|---|---|---|---|---|---|---|
| TC-GSRCH-001 | A1 | Session A branch | `NDC1_Ahmed Ayman (BRN287)` | Expected Result | NDC1_Ahmed Ayman (BRN287) | equals | Passed | artifacts/TC001.sessions.json |
| TC-GSRCH-001 | A2 | Session B branch | `ahmed ayman (BRN632)` | Expected Result | ahmed ayman (BRN632) | equals | Passed | artifacts/TC001.sessions.json |
| TC-GSRCH-001 | A3 | Session A supplier list | `NDCGal` | Expected Result | NDCGal | equals | Passed | artifacts/TC001.sessions.json |
| TC-GSRCH-001 | A4 | Session B supplier list | `Galileo` | Expected Result | Galileo | equals | Passed | artifacts/TC001.sessions.json |
| TC-GSRCH-001 | A5 | Branch selection in one session does not change the other | present | Expected Result | After B selected its branch, A still showed "NDC1_Ahmed Ayman (BRN287)"; separate JSESSIONID per browser | present | Passed | artifacts/TC001.sessions.json |
| TC-GSRCH-002 | A1 | Number of flights, Integration vs Direct | equal | Expected Result | Integration 34, Direct 34 (UI: Integration "64 options", Direct "34 options"; offers 64/34) | classification — Integration vs Direct equal | Passed | artifacts/E02_eco.comparison.json |
| TC-GSRCH-002 | A2 | Every flight has a match on the other branch | present, both directions | Expected Result | 34 matched; 0 only on Integration; 0 only on Direct | present | Passed | artifacts/E02_eco.comparison.json |
| TC-GSRCH-002 | A3 | Airline and flight number per segment | equal | Expected Result | 34 matched flights compared segment by segment (flight number, origin–destination, departure and arrival date-time are the match key, so a matched flight is equal on all of them) | classification — Integration vs Direct equal | Passed | artifacts/E02_eco.comparison.json |
| TC-GSRCH-002 | A4 | Departure and arrival date-time per segment | equal | Expected Result | 34 matched flights compared segment by segment (flight number, origin–destination, departure and arrival date-time are the match key, so a matched flight is equal on all of them) | classification — Integration vs Direct equal | Passed | artifacts/E02_eco.comparison.json |
| TC-GSRCH-002 | A5 | Segments, connections and stops | equal | Expected Result | 0 stop differences across 34 matched flights | classification — Integration vs Direct equal | Passed | artifacts/E02_eco.comparison.json |
| TC-GSRCH-002 | A6 | Fare options per matched flight | same set on both branches | Expected Result | 34 matched; 30 only on Integration; 0 only on Direct; duplicates Integration 0, Direct 0 | classification — Integration vs Direct equal | Failed | artifacts/E02_eco.comparison.json |
| TC-GSRCH-002 | A7 | Cabin Class and RBD per fare option × passenger type × segment | equal | Expected Result | 0 differences in 34 matched fare options · RBD: 0 differences in 34 matched fare options | classification — Integration vs Direct equal | Passed | artifacts/E02_eco.comparison.json |
| TC-GSRCH-002 | A8 | Baggage allowance (number + unit) per fare option × segment | equal | Expected Result | 0 allowance differences in 34 matched fare options | classification — Integration vs Direct equal | Passed | artifacts/E02_eco.comparison.json |
| TC-GSRCH-002 | A9 | Baggage wording per fare option | equal | Expected Result | 59 segment entries worded differently (e.g. "0 Pieces" vs "Number 0 Piece Allowed."); allowances equal | classification — Integration vs Direct equal | Observation — not a functional mismatch (reviewer instruction 2026-10-11 #3) | artifacts/E02_eco.comparison.json |
| TC-GSRCH-003 | A1 | Number of flights, Integration vs Direct | equal | Expected Result | Integration 111, Direct 98 (UI: Integration "200 options", Direct "98 options"; offers 200/98) | classification — Integration vs Direct equal | Failed | artifacts/E03_rt.comparison.json |
| TC-GSRCH-003 | A2 | Every flight has a match on the other branch | present, both directions | Expected Result | 98 matched; 13 only on Integration; 0 only on Direct | present | Failed | artifacts/E03_rt.comparison.json |
| TC-GSRCH-003 | A3 | Airline and flight number per segment | equal | Expected Result | 98 matched flights compared segment by segment (flight number, origin–destination, departure and arrival date-time are the match key, so a matched flight is equal on all of them) | classification — Integration vs Direct equal | Passed | artifacts/E03_rt.comparison.json |
| TC-GSRCH-003 | A4 | Departure and arrival date-time per segment | equal | Expected Result | 98 matched flights compared segment by segment (flight number, origin–destination, departure and arrival date-time are the match key, so a matched flight is equal on all of them) | classification — Integration vs Direct equal | Passed | artifacts/E03_rt.comparison.json |
| TC-GSRCH-003 | A5 | Segments, connections and stops | equal | Expected Result | 0 stop differences across 98 matched flights | classification — Integration vs Direct equal | Passed | artifacts/E03_rt.comparison.json |
| TC-GSRCH-003 | A6 | Fare options per matched flight | same set on both branches | Expected Result | 93 matched; 83 only on Integration; 5 only on Direct; duplicates Integration 0, Direct 0; Integration returned exactly 200 offers (possible cap) | classification — Integration vs Direct equal | Failed | artifacts/E03_rt.comparison.json |
| TC-GSRCH-003 | A7 | Cabin Class and RBD per fare option × passenger type × segment | equal | Expected Result | 0 differences in 93 matched fare options · RBD: 0 differences in 93 matched fare options | classification — Integration vs Direct equal | Passed | artifacts/E03_rt.comparison.json |
| TC-GSRCH-003 | A8 | Baggage allowance (number + unit) per fare option × segment | equal | Expected Result | 0 allowance differences in 93 matched fare options | classification — Integration vs Direct equal | Passed | artifacts/E03_rt.comparison.json |
| TC-GSRCH-003 | A9 | Baggage wording per fare option | equal | Expected Result | 300 segment entries worded differently (e.g. "0 Pieces" vs "Number 0 Piece Allowed."); allowances equal | classification — Integration vs Direct equal | Observation — not a functional mismatch (reviewer instruction 2026-10-11 #3) | artifacts/E03_rt.comparison.json |
| TC-GSRCH-004 | A1 | Number of flights, Integration vs Direct | equal | Expected Result | Integration 35, Direct 35 (UI: Integration "64 options", Direct "35 options"; offers 64/35) | classification — Integration vs Direct equal | Passed | artifacts/E04_pax.comparison.json |
| TC-GSRCH-004 | A2 | Every flight has a match on the other branch | present, both directions | Expected Result | 35 matched; 0 only on Integration; 0 only on Direct | present | Passed | artifacts/E04_pax.comparison.json |
| TC-GSRCH-004 | A3 | Airline, flight number, date-time per segment | equal | Expected Result | 35 matched flights compared segment by segment (flight number, origin–destination, departure and arrival date-time are the match key, so a matched flight is equal on all of them) | classification — Integration vs Direct equal | Passed | artifacts/E04_pax.comparison.json |
| TC-GSRCH-004 | A4 | Segments, connections and stops | equal | Expected Result | 0 stop differences across 35 matched flights | classification — Integration vs Direct equal | Passed | artifacts/E04_pax.comparison.json |
| TC-GSRCH-004 | A5 | Passenger types and counts per fare option | `ADT×2`, `CHD×1`, `INF×1` | Expected Result | Integration and Direct: every fare option carries ADTx2 CHDx1 INFx1 | equals | Passed | artifacts/E04_pax.integration.json |
| TC-GSRCH-004 | A6 | Fare options per matched flight | same set on both branches | Expected Result | 35 matched; 29 only on Integration; 0 only on Direct; duplicates Integration 0, Direct 0 | classification — Integration vs Direct equal | Failed | artifacts/E04_pax.comparison.json |
| TC-GSRCH-004 | A7 | Cabin Class and RBD per fare option × passenger type × segment | equal | Expected Result | 0 differences in 35 matched fare options · RBD: 0 differences in 35 matched fare options | classification — Integration vs Direct equal | Passed | artifacts/E04_pax.comparison.json |
| TC-GSRCH-004 | A8 | Baggage allowance per fare option × passenger type × segment | equal | Expected Result | 0 allowance differences in 35 matched fare options | classification — Integration vs Direct equal | Passed | artifacts/E04_pax.comparison.json |
| TC-GSRCH-005 | A1 | Number of flights, Integration vs Direct | equal | Expected Result | Integration 34, Direct 34 (UI: Integration "59 options", Direct "34 options"; offers 59/34) | classification — Integration vs Direct equal | Passed | artifacts/E05_bus.comparison.json |
| TC-GSRCH-005 | A2 | Every flight has a match on the other branch | present, both directions | Expected Result | 34 matched; 0 only on Integration; 0 only on Direct | present | Passed | artifacts/E05_bus.comparison.json |
| TC-GSRCH-005 | A3 | Airline, flight number, date-time per segment; segments and stops | equal | Expected Result | 0 stop differences across 34 matched flights | classification — Integration vs Direct equal | Passed | artifacts/E05_bus.comparison.json |
| TC-GSRCH-005 | A4 | Fare options per matched flight | same set on both branches | Expected Result | 34 matched; 25 only on Integration; 0 only on Direct; duplicates Integration 0, Direct 0 | classification — Integration vs Direct equal | Failed | artifacts/E05_bus.comparison.json |
| TC-GSRCH-005 | A5 | Cabin Class name per fare option × segment | equal | Expected Result | 2 differences in 34 matched fare options: WY408 FirstClass⇄First, WY603 FirstClass⇄First | classification — Integration vs Direct equal | Failed | artifacts/E05_bus.comparison.json |
| TC-GSRCH-005 | A6 | RBD per fare option × segment | equal | Expected Result | 0 differences in 34 matched fare options | classification — Integration vs Direct equal | Passed | artifacts/E05_bus.comparison.json |
| TC-GSRCH-005 | A7 | Baggage allowance (number + unit) per fare option × segment | equal | Expected Result | 0 allowance differences in 34 matched fare options | classification — Integration vs Direct equal | Passed | artifacts/E05_bus.comparison.json |
| TC-GSRCH-006 | A1 | Number of flights, Integration vs Direct | equal | Expected Result | Integration 34, Direct 12 (UI: Integration "64 options", Direct "12 options"; offers 64/12) | classification — Integration vs Direct equal | Failed | artifacts/E06_prem.comparison.json |
| TC-GSRCH-006 | A2 | Every flight has a match on the other branch | present, both directions | Expected Result | 5 matched; 29 only on Integration; 7 only on Direct | present | Failed | artifacts/E06_prem.comparison.json |
| TC-GSRCH-006 | A3 | Airline, flight number, date-time per segment; segments and stops | equal | Expected Result | 0 stop differences across 5 matched flights | classification — Integration vs Direct equal | Passed | artifacts/E06_prem.comparison.json |
| TC-GSRCH-006 | A4 | Fare options per matched flight | same set on both branches | Expected Result | 0 matched; 10 only on Integration; 5 only on Direct; duplicates Integration 0, Direct 0 | classification — Integration vs Direct equal | Failed | artifacts/E06_prem.comparison.json |
| TC-GSRCH-006 | A5 | Cabin Class name per fare option × segment | equal | Expected Result | Integration returned only Economy (RBDs AEHKLMNQSTVWY); Direct returned only PremiumEconomy (RBD J) | classification — Integration vs Direct equal | Failed | artifacts/E06_prem.comparison.json |
| TC-GSRCH-006 | A6 | RBD per fare option × segment | equal | Expected Result | no matched fare options to compare | classification — Integration vs Direct equal | Inconclusive | artifacts/E06_prem.comparison.json |
| TC-GSRCH-006 | A7 | Baggage allowance (number + unit) per fare option × segment | equal | Expected Result | no matched fare options to compare | classification — Integration vs Direct equal | Inconclusive | artifacts/E06_prem.comparison.json |
| TC-GSRCH-007 | A1 | Number of flights, Integration vs Direct | equal | Expected Result | Integration 34, Direct 10 (UI: Integration "59 options", Direct "10 options"; offers 59/10) | classification — Integration vs Direct equal | Failed | artifacts/E07_first.comparison.json |
| TC-GSRCH-007 | A2 | Every flight has a match on the other branch | present, both directions | Expected Result | 4 matched; 30 only on Integration; 6 only on Direct | present | Failed | artifacts/E07_first.comparison.json |
| TC-GSRCH-007 | A3 | Airline, flight number, date-time per segment; segments and stops | equal | Expected Result | 0 stop differences across 4 matched flights | classification — Integration vs Direct equal | Passed | artifacts/E07_first.comparison.json |
| TC-GSRCH-007 | A4 | Fare options per matched flight | same set on both branches | Expected Result | 0 matched; 8 only on Integration; 4 only on Direct; duplicates Integration 0, Direct 0 | classification — Integration vs Direct equal | Failed | artifacts/E07_first.comparison.json |
| TC-GSRCH-007 | A5 | Cabin Class name per fare option × segment | equal | Expected Result | Integration returned Business (+1 option labelled FirstClass); Direct returned only First (RBD A) | classification — Integration vs Direct equal | Failed | artifacts/E07_first.comparison.json |
| TC-GSRCH-007 | A6 | RBD per fare option × segment | equal | Expected Result | no matched fare options to compare | classification — Integration vs Direct equal | Inconclusive | artifacts/E07_first.comparison.json |
| TC-GSRCH-007 | A7 | Baggage allowance (number + unit) per fare option × segment | equal | Expected Result | no matched fare options to compare | classification — Integration vs Direct equal | Inconclusive | artifacts/E07_first.comparison.json |
| TC-GSRCH-010 | A1 | Economy: every segment is Economy | Economy only, both branches | Expected Result | Integration [Economy], Direct [Economy] | classification — Integration vs Direct equal | Passed | artifacts/E02_eco.comparison.json |
| TC-GSRCH-010 | A2 | Premium Economy: every segment is Premium Economy | Premium Economy only, both branches | Expected Result | Integration [Economy] — Failed; Direct [PremiumEconomy] — Passed | classification — Integration vs Direct equal | Failed | artifacts/E06_prem.comparison.json |
| TC-GSRCH-010 | A3 | Business: every segment is Business | Business only, both branches | Expected Result | Integration [Business,FirstClass], Direct [Business,First] — WY408/WY603 "BUSINESS COMFORT" in First on both | classification — Integration vs Direct equal | Failed | artifacts/E05_bus.comparison.json |
| TC-GSRCH-010 | A4 | First Class: every segment is First Class | First Class only, both branches | Expected Result | Integration [Business,FirstClass] — Failed; Direct [First] — Passed | classification — Integration vs Direct equal | Failed | artifacts/E07_first.comparison.json |
| TC-GSRCH-010 | A5 | Each cabin result set is not empty | ≥ 1 per cabin, per branch | Expected Result | Integration offers 64/64/59/59; Direct 34/12/34/10 (Eco/Prem/Bus/First) | ≥ 1 | Passed | artifacts/E02_eco.comparison.json |
| TC-GSRCH-011 | A1 | `Q`: result set not empty | ≥ 1, both branches | Expected Result | Integration 35 offers (35 options), Direct 24 (24 options) | ≥ 1 | Passed | artifacts/E08_ecoQ.comparison.json |
| TC-GSRCH-011 | A2 | `Q`: every segment RBD in {Q}, cabin Economy | RBD Q, Economy | Expected Result | Integration RBD [Q] cabin [Economy]; Direct RBD [Q] cabin [Economy] | classification — Integration vs Direct equal | Passed | artifacts/E08_ecoQ.comparison.json |
| TC-GSRCH-011 | A3 | `Q`: same flights on both branches | equal | Expected Result | 24 matched; 0 only Integration; 0 only Direct (fare options: 11 extra on Integration — not asserted here) | classification — Integration vs Direct equal | Passed | artifacts/E08_ecoQ.comparison.json |
| TC-GSRCH-011 | A4 | `K`: result set not empty | ≥ 1, both branches | Expected Result | Integration 43 offers (43 options), Direct 31 (31 options) | ≥ 1 | Passed | artifacts/E09_ecoK.comparison.json |
| TC-GSRCH-011 | A5 | `K`: every segment RBD in {K}, cabin Economy | RBD K, Economy | Expected Result | Integration RBD [K] cabin [Economy]; Direct RBD [K] cabin [Economy] | classification — Integration vs Direct equal | Passed | artifacts/E09_ecoK.comparison.json |
| TC-GSRCH-011 | A6 | `K`: same flights on both branches | equal | Expected Result | 31 matched; 0 only Integration; 0 only Direct (fare options: 12 extra on Integration — not asserted here) | classification — Integration vs Direct equal | Passed | artifacts/E09_ecoK.comparison.json |
| TC-GSRCH-011 | A7 | `Y`: result set not empty | ≥ 1, both branches | Expected Result | Integration 49 offers (49 options), Direct 35 (35 options) | ≥ 1 | Passed | artifacts/E10_ecoY.comparison.json |
| TC-GSRCH-011 | A8 | `Y`: every segment RBD in {Y}, cabin Economy | RBD Y, Economy | Expected Result | Integration RBD [Y] cabin [Economy]; Direct RBD [Y] cabin [Economy] | classification — Integration vs Direct equal | Passed | artifacts/E10_ecoY.comparison.json |
| TC-GSRCH-011 | A9 | `Y`: same flights on both branches | equal | Expected Result | 35 matched; 0 only Integration; 0 only Direct (fare options: 14 extra on Integration — not asserted here) | classification — Integration vs Direct equal | Passed | artifacts/E10_ecoY.comparison.json |
| TC-GSRCH-012 | A1 | `J`: result set not empty | ≥ 1, both branches | Expected Result | Integration 38 offers (38 options), Direct 28 (28 options) | ≥ 1 | Passed | artifacts/E11_busJ.comparison.json |
| TC-GSRCH-012 | A2 | `J`: every segment RBD in {J}, cabin Business | RBD J, Business | Expected Result | Integration RBD [J] cabin [Business]; Direct RBD [J] cabin [Business] | classification — Integration vs Direct equal | Passed | artifacts/E11_busJ.comparison.json |
| TC-GSRCH-012 | A3 | `J`: same flights on both branches | equal | Expected Result | 28 matched; 0 only Integration; 0 only Direct (fare options: 10 extra on Integration — not asserted here) | classification — Integration vs Direct equal | Passed | artifacts/E11_busJ.comparison.json |
| TC-GSRCH-012 | A4 | `C`: result set not empty | ≥ 1, both branches | Expected Result | Integration 39 offers (39 options), Direct 29 (29 options) | ≥ 1 | Passed | artifacts/E12_busC.comparison.json |
| TC-GSRCH-012 | A5 | `C`: every segment RBD in {C}, cabin Business | RBD C, Business | Expected Result | Integration RBD [C] cabin [Business]; Direct RBD [C] cabin [Business] | classification — Integration vs Direct equal | Passed | artifacts/E12_busC.comparison.json |
| TC-GSRCH-012 | A6 | `C`: same flights on both branches | equal | Expected Result | 29 matched; 0 only Integration; 0 only Direct (fare options: 10 extra on Integration — not asserted here) | classification — Integration vs Direct equal | Passed | artifacts/E12_busC.comparison.json |
| TC-GSRCH-013 | A1 | Outcome type, Integration vs Direct | same | Expected Result | Integration "No Flights Found", Direct "No Flights Found" (0/0 offers, HTTP 200/200) | classification — Integration vs Direct equal | Passed | artifacts/E13_ecoJ.comparison.json |
| TC-GSRCH-013 | A2 | Message text | same | Expected Result | Both: "No Flights Found — We couldn’t find any flights matching your search." | classification — Integration vs Direct equal | Passed | artifacts/E13_ecoJ.comparison.json |
| TC-GSRCH-013 | A3 | Fare options, Cabin and RBD when results are shown | same | Expected Result | No results on either branch — condition not met | classification — Integration vs Direct equal | Pass — not applicable (no results on either branch, so nothing can differ) | artifacts/E13_ecoJ.comparison.json |
| TC-GSRCH-015 | A1 | Number of flights, Integration vs Direct | equal | Expected Result | Integration 41, Direct 41 (UI: Integration "75 options", Direct "41 options"; offers 75/41) | classification — Integration vs Direct equal | Passed | artifacts/E14_jed.comparison.json |
| TC-GSRCH-015 | A2 | Every flight has a match on the other branch | present, both directions | Expected Result | 41 matched; 0 only on Integration; 0 only on Direct | present | Passed | artifacts/E14_jed.comparison.json |
| TC-GSRCH-015 | A3 | Airline, flight number, date-time per segment; segments and stops | equal | Expected Result | 0 stop differences across 41 matched flights | classification — Integration vs Direct equal | Passed | artifacts/E14_jed.comparison.json |
| TC-GSRCH-015 | A4 | Fare options per matched flight | same set on both branches | Expected Result | 41 matched; 34 only on Integration; 0 only on Direct; duplicates Integration 0, Direct 0 | classification — Integration vs Direct equal | Failed | artifacts/E14_jed.comparison.json |
| TC-GSRCH-015 | A5 | Cabin Class and RBD per fare option × segment | equal | Expected Result | 0 differences in 41 matched fare options · RBD: 0 differences in 41 matched fare options | classification — Integration vs Direct equal | Passed | artifacts/E14_jed.comparison.json |
| TC-GSRCH-015 | A6 | Baggage allowance (number + unit) per fare option × segment | equal | Expected Result | 0 allowance differences in 41 matched fare options | classification — Integration vs Direct equal | Passed | artifacts/E14_jed.comparison.json |
| TC-GSRCH-016 | A1 | Number of flights, Integration vs Direct | equal | Expected Result | Integration 136, Direct 122 (UI: Integration "200 options", Direct "122 options"; offers 200/122) | classification — Integration vs Direct equal | Failed | artifacts/E15_mc.comparison.json |
| TC-GSRCH-016 | A2 | Every flight has a match on the other branch | present, both directions | Expected Result | 122 matched; 14 only on Integration; 0 only on Direct | present | Failed | artifacts/E15_mc.comparison.json |
| TC-GSRCH-016 | A3 | Airline, flight number, date-time per segment; segments and stops, both legs | equal | Expected Result | 0 stop differences across 122 matched flights | classification — Integration vs Direct equal | Passed | artifacts/E15_mc.comparison.json |
| TC-GSRCH-016 | A4 | Fare options per matched flight | same set on both branches | Expected Result | 122 matched; 64 only on Integration; 0 only on Direct; duplicates Integration 0, Direct 0; Integration returned exactly 200 offers (possible cap) | classification — Integration vs Direct equal | Failed | artifacts/E15_mc.comparison.json |
| TC-GSRCH-016 | A5 | Cabin Class and RBD per fare option × segment | equal | Expected Result | 0 differences in 122 matched fare options · RBD: 0 differences in 122 matched fare options | classification — Integration vs Direct equal | Passed | artifacts/E15_mc.comparison.json |
| TC-GSRCH-016 | A6 | Baggage allowance (number + unit) per fare option × segment | equal | Expected Result | 0 allowance differences in 122 matched fare options | classification — Integration vs Direct equal | Passed | artifacts/E15_mc.comparison.json |
| TC-GSRCH-017 | A1 | Number of flights, Integration vs Direct | equal | Expected Result | Integration 65, Direct 61 (UI: Integration "65 options", Direct "61 options"; offers 65/61) | classification — Integration vs Direct equal | Failed | artifacts/E16_mcbus.comparison.json |
| TC-GSRCH-017 | A2 | Every flight has a match on the other branch | present, both directions | Expected Result | 61 matched; 4 only on Integration; 0 only on Direct | present | Failed | artifacts/E16_mcbus.comparison.json |
| TC-GSRCH-017 | A3 | Leg 1 segments are Economy | Economy, both branches | Expected Result | Integration leg 1 [Economy]; Direct leg 1 [Business,Economy] — ET600 Business/D | classification — Integration vs Direct equal | Failed | artifacts/E16_mcbus.comparison.json |
| TC-GSRCH-017 | A4 | Leg 2 segments are Business | Business, both branches | Expected Result | Integration leg 2 [Business]; Direct leg 2 [Business] | classification — Integration vs Direct equal | Passed | artifacts/E16_mcbus.comparison.json |
| TC-GSRCH-017 | A5 | Cabin Class and RBD per fare option × segment, Integration vs Direct | equal | Expected Result | 1 differences in 61 matched fare options: ET600 Economy⇄Business · RBD: 1 differences in 61 matched fare options: ET600 V⇄D | classification — Integration vs Direct equal | Failed | artifacts/E16_mcbus.comparison.json |
| TC-GSRCH-017 | A6 | Baggage allowance (number + unit) per fare option × segment | equal | Expected Result | 0 allowance differences in 61 matched fare options | classification — Integration vs Direct equal | Passed | artifacts/E16_mcbus.comparison.json |
| TC-GSRCH-018 | A1 | `F`: result set not empty | ≥ 1, both branches | Expected Result | Integration "No Flights Found" (0); Direct 10 | ≥ 1 | Failed | artifacts/E17_firstF.comparison.json |
| TC-GSRCH-018 | A2 | `F`: every segment RBD = F, cabin First Class | RBD F, First Class | Expected Result | Integration: no results; Direct RBD [F] cabin [First] | classification — Integration vs Direct equal | Failed | artifacts/E17_firstF.comparison.json |
| TC-GSRCH-018 | A3 | `F`: same flights on both branches | equal | Expected Result | 0 vs 10 | classification — Integration vs Direct equal | Failed | artifacts/E17_firstF.comparison.json |
| TC-GSRCH-018 | A4 | `A`: result set not empty | ≥ 1, both branches | Expected Result | Integration 1; Direct 10 | ≥ 1 | Passed | artifacts/E18_firstA.comparison.json |
| TC-GSRCH-018 | A5 | `A`: every segment RBD = A, cabin First Class | RBD A, First Class | Expected Result | Integration RBD [A] cabin [Business] — Failed; Direct RBD [A] cabin [First] — Passed | classification — Integration vs Direct equal | Failed | artifacts/E18_firstA.comparison.json |
| TC-GSRCH-018 | A6 | `A`: same flights on both branches | equal | Expected Result | 0 matched; 1 only Integration (A3931+A3958); 10 only Direct | classification — Integration vs Direct equal | Failed | artifacts/E18_firstA.comparison.json |
| TC-GSRCH-019 | A1 | Result set not empty | ≥ 1, both branches | Expected Result | Integration "No Flights Found" (0); Direct 5 | ≥ 1 | Failed | artifacts/E19_premJ.comparison.json |
| TC-GSRCH-019 | A2 | Every segment RBD = J, cabin Premium Economy | RBD J, Premium Economy | Expected Result | Integration: no results; Direct RBD [J] cabin [PremiumEconomy] | classification — Integration vs Direct equal | Failed | artifacts/E19_premJ.comparison.json |
| TC-GSRCH-019 | A3 | Same flights on both branches | equal | Expected Result | 0 vs 5 | classification — Integration vs Direct equal | Failed | artifacts/E19_premJ.comparison.json |
| TC-GSRCH-020 | A1 | `Q\|K`: result set not empty | ≥ 1, both branches | Expected Result | Integration 51 offers (51 options), Direct 30 (30 options) | ≥ 1 | Passed | artifacts/E20_ecoQK.comparison.json |
| TC-GSRCH-020 | A2 | `Q\|K`: every segment RBD in {Q\|K}, cabin Economy | RBD Q\|K, Economy | Expected Result | Integration RBD [K,Q] cabin [Economy]; Direct RBD [K,Q] cabin [Economy] | matches | Passed | artifacts/E20_ecoQK.comparison.json |
| TC-GSRCH-020 | A3 | `Q\|K`: same flights on both branches | equal | Expected Result | 30 matched; 0 only Integration; 0 only Direct (fare options: 21 extra on Integration — not asserted here) | classification — Integration vs Direct equal | Passed | artifacts/E20_ecoQK.comparison.json |
| TC-GSRCH-021 | A1 | Result set not empty | ≥ 1, both branches | Expected Result | No search request sent on either branch (waited 300 s, then retried once with network capture: 0 requests, 0 console messages, 0 UI messages) | ≥ 1 | Failed | artifacts/E21_mcQ.integration.png |
| TC-GSRCH-021 | A2 | Every leg 1 segment RBD = Q | RBD Q | Expected Result | Not evaluable — no results | classification — Integration vs Direct equal | Inconclusive | artifacts/E21_mcQ.integration.png |
| TC-GSRCH-021 | A3 | Same combinations on both branches | equal | Expected Result | Same outcome on both branches: search silently not submitted | classification — Integration vs Direct equal | Passed | artifacts/E21_mcQ.integration.png |
| TC-GSRCH-021 | A4 | Leg 2 RBDs, Integration vs Direct | equal | Expected Result | Not evaluable — no results | classification — Integration vs Direct equal | Inconclusive | artifacts/E21_mcQ.integration.png |

Additional observation, TC-GSRCH-001 (Expected Result sentence without an assertion row): A: "Branch*", B: "Branch*" — cleared in both.

### 3.2 Failed / Inconclusive cases

Each case below names its defect(s). The full write-up of each defect (Impact, Classification, Root Cause, Severity, Priority) is in §3.3, so it is not repeated per case.

#### TC-GSRCH-001 — Correct branch and supplier in each session

1. **Test Case ID:** TC-GSRCH-001
2. **Execution Status:** Inconclusive
3. **Execution Time:** 40s (started 2026-10-11T08:45:38.291Z)
4. **Preconditions:** TC-GSRCH-001 confirmed each session on its own branch and supplier.
5. **Test Data:** Session A branch NDC1_Ahmed Ayman (BRN287); session B branch ahmed ayman (BRN632); route CAI→DXB 18/11/2026 filled so Check Supplier can open.
6. **Steps Performed:** Selected each branch, opened Check Supplier → Supplier list in each session, closed the dialogs, reloaded both pages.
7. **Expected Result:** Session A lists NDCGal, session B lists Galileo; after reload each session still shows its own branch; one session does not change the other.
8. **Actual Result:** All 5 assertions passed. The Expected Result also says the branch stays selected after a page reload; it does not (cleared in both sessions, identically). No requirement defines that, so this is a test-case wording issue, not an application failure — flagged to Stage 3.
9. **Impact / Classification / Root Cause / Severity / Priority:** not a defect — test design discrepancy (see Conclusion)
10. **Conclusion:** Branch isolation and supplier routing are correct (A1–A5 passed). The reload sentence of the Expected Result does not hold — the page clears the branch on reload in both sessions. No requirement says the branch must survive a reload, so this is a test-case wording issue for Stage 3, not an application defect.
11. **Evidence:** artifacts/TC001.sessions.json

#### TC-GSRCH-002 — Parity — one-way, Economy, CAI→DXB

1. **Test Case ID:** TC-GSRCH-002
2. **Execution Status:** Failed
3. **Execution Time:** 7s (started 2026-10-11T08:47:23.394Z)
4. **Preconditions:** TC-GSRCH-001 confirmed each session on its own branch and supplier.
5. **Test Data:** One-way CAI→DXB, 18/11/2026, 1 Adult, Economy, no RBD.
6. **Steps Performed:** Same criteria entered in both sessions, searched at the same time (08:47 UTC), every returned fare option compared.
7. **Expected Result:** Same flights, same fare options, same Cabin/RBD/baggage allowance per segment on both branches.
8. **Actual Result:** A6: Integration returns 30 extra fare options (higher fare brands) on 30 of 34 flights. Flights, segments, times, stops, Cabin, RBD and baggage allowance of every matched fare option are equal.
9. **Impact / Classification / Root Cause / Severity / Priority:** see DEF-03 (§3.3)
10. **Conclusion:** Flights match 34/34 with equal details; fare options do not (64 vs 34) — DEF-03.
11. **Evidence:** artifacts/E02_eco.comparison.json; artifacts/E02_eco.integration.json; artifacts/E02_eco.direct.json; artifacts/E02_eco.integration.png; artifacts/E02_eco.direct.png

#### TC-GSRCH-003 — Parity — round-trip, Economy, CAI⇄DXB

1. **Test Case ID:** TC-GSRCH-003
2. **Execution Status:** Failed
3. **Execution Time:** 9s (started 2026-10-11T08:47:51.806Z)
4. **Preconditions:** TC-GSRCH-001 confirmed each session on its own branch and supplier.
5. **Test Data:** Round-trip CAI⇄DXB, 18/11/2026 – 25/11/2026, 1 Adult, Economy, no RBD.
6. **Steps Performed:** Same criteria in both sessions, searched together, every combination and fare option compared.
7. **Expected Result:** Same outbound+return combinations and fare options on both branches.
8. **Actual Result:** A1/A2: 13 outbound+return combinations only on Integration. A6: 83 fare options only on Integration, 5 (Emirates "Economy Flex", RBD L/K) only on Direct. Integration returned exactly 200 offers — possibly capped.
9. **Impact / Classification / Root Cause / Severity / Priority:** see DEF-03, DEF-04 (§3.3)
10. **Conclusion:** Combinations differ (111 vs 98) and Integration stops at 200 offers — DEF-04; extra fare brands — DEF-03.
11. **Evidence:** artifacts/E03_rt.comparison.json; artifacts/E03_rt.integration.json; artifacts/E03_rt.direct.json; artifacts/E03_rt.integration.png; artifacts/E03_rt.direct.png

#### TC-GSRCH-004 — Parity — mixed passengers (Adult, Child, Infant)

1. **Test Case ID:** TC-GSRCH-004
2. **Execution Status:** Failed
3. **Execution Time:** 7s (started 2026-10-11T08:48:18.699Z)
4. **Preconditions:** TC-GSRCH-001 confirmed each session on its own branch and supplier.
5. **Test Data:** One-way CAI→DXB, 18/11/2026, 2 Adults + 1 Child + 1 Infant, Economy, no RBD.
6. **Steps Performed:** Passenger counts set with the passenger selector in both sessions; searched together; compared per passenger type.
7. **Expected Result:** Same flights and per-passenger-type fare details on both branches.
8. **Actual Result:** A6: Integration returns 29 extra fare options. Everything else equal, per passenger type.
9. **Impact / Classification / Root Cause / Severity / Priority:** see DEF-03 (§3.3)
10. **Conclusion:** Flights and per-passenger details match (35/35); fare options do not (64 vs 35) — DEF-03.
11. **Evidence:** artifacts/E04_pax.comparison.json; artifacts/E04_pax.integration.json; artifacts/E04_pax.direct.json; artifacts/E04_pax.integration.png; artifacts/E04_pax.direct.png

#### TC-GSRCH-005 — Parity — Business, CAI→DXB

1. **Test Case ID:** TC-GSRCH-005
2. **Execution Status:** Failed
3. **Execution Time:** 7s (started 2026-10-11T08:48:43.662Z)
4. **Preconditions:** TC-GSRCH-001 confirmed each session on its own branch and supplier.
5. **Test Data:** One-way CAI→DXB, 18/11/2026, 1 Adult, Business, no RBD.
6. **Steps Performed:** Same criteria in both sessions, searched together, compared.
7. **Expected Result:** Same Business flights and fare details on both branches.
8. **Actual Result:** A4: 25 extra fare options on Integration. A5: the Oman Air "BUSINESS COMFORT" option (WY408+WY603) is labelled `FirstClass` on Integration and `First` on Direct.
9. **Impact / Classification / Root Cause / Severity / Priority:** see DEF-03, DEF-05 (§3.3)
10. **Conclusion:** Flights match (34/34); extra fare options on Integration (DEF-03); cabin name FirstClass vs First (DEF-05).
11. **Evidence:** artifacts/E05_bus.comparison.json; artifacts/E05_bus.integration.json; artifacts/E05_bus.direct.json; artifacts/E05_bus.integration.png; artifacts/E05_bus.direct.png

#### TC-GSRCH-006 — Parity — Premium Economy, CAI→DXB

1. **Test Case ID:** TC-GSRCH-006
2. **Execution Status:** Failed
3. **Execution Time:** 8s (started 2026-10-11T08:49:10.186Z)
4. **Preconditions:** TC-GSRCH-001 confirmed each session on its own branch and supplier.
5. **Test Data:** One-way CAI→DXB, 18/11/2026, 1 Adult, Premium Economy, no RBD.
6. **Steps Performed:** Same criteria in both sessions; request payload checked (cabinClass 2 on both); compared.
7. **Expected Result:** Same Premium Economy flights and fare details on both branches.
8. **Actual Result:** Integration ignores Premium Economy: it returns the same 34 flights as an Economy search, all in Economy. Direct returns 12 Premium Economy flights (RBD J).
9. **Impact / Classification / Root Cause / Severity / Priority:** see DEF-01 (§3.3)
10. **Conclusion:** Integration returns Economy instead of Premium Economy — DEF-01.
11. **Evidence:** artifacts/E06_prem.comparison.json; artifacts/E06_prem.integration.json; artifacts/E06_prem.direct.json; artifacts/E06_prem.integration.png; artifacts/E06_prem.direct.png

#### TC-GSRCH-007 — Parity — First Class, CAI→DXB

1. **Test Case ID:** TC-GSRCH-007
2. **Execution Status:** Failed
3. **Execution Time:** 7s (started 2026-10-11T08:49:35.694Z)
4. **Preconditions:** TC-GSRCH-001 confirmed each session on its own branch and supplier.
5. **Test Data:** One-way CAI→DXB, 18/11/2026, 1 Adult, First Class, no RBD.
6. **Steps Performed:** Same criteria in both sessions; request payload checked (cabinClass 4 on both); compared.
7. **Expected Result:** Same First Class flights and fare details on both branches.
8. **Actual Result:** Integration ignores First Class: it returns the same 34 flights as a Business search. Direct returns 10 First Class flights.
9. **Impact / Classification / Root Cause / Severity / Priority:** see DEF-02 (§3.3)
10. **Conclusion:** Integration returns Business instead of First Class — DEF-02.
11. **Evidence:** artifacts/E07_first.comparison.json; artifacts/E07_first.integration.json; artifacts/E07_first.direct.json; artifacts/E07_first.integration.png; artifacts/E07_first.direct.png

#### TC-GSRCH-010 — Cabin Class filter returns only the selected cabin

1. **Test Case ID:** TC-GSRCH-010
2. **Execution Status:** Failed
3. **Execution Time:** 29s (started 2026-10-11T08:47:23.394Z)
4. **Preconditions:** TC-GSRCH-001 confirmed each session on its own branch and supplier.
5. **Test Data:** One-way CAI→DXB, 18/11/2026, 1 Adult; Economy, Premium Economy, Business, First Class (one search each), no RBD. Reuses the searches of TC-002/005/006/007.
6. **Steps Performed:** Collected the cabin of every segment of every fare option, per branch, per cabin searched.
7. **Expected Result:** Each cabin search returns only that cabin, on both branches, and is not empty.
8. **Actual Result:** Premium Economy and First Class are not applied on Integration (DEF-01, DEF-02). A Business search returns one Oman Air option whose segments are in First cabin, on both branches (DEF-06).
9. **Impact / Classification / Root Cause / Severity / Priority:** see DEF-01, DEF-02, DEF-06 (§3.3)
10. **Conclusion:** Economy passes on both. Premium and First fail on Integration (DEF-01, DEF-02). Business has one First-cabin product on both branches (DEF-06).
11. **Evidence:** artifacts/E02_eco.comparison.json; artifacts/E02_eco.integration.json; artifacts/E02_eco.direct.json; artifacts/E05_bus.comparison.json; artifacts/E05_bus.integration.json; artifacts/E05_bus.direct.json; artifacts/E06_prem.comparison.json; artifacts/E06_prem.integration.json; artifacts/E06_prem.direct.json; artifacts/E07_first.comparison.json; artifacts/E07_first.integration.json; artifacts/E07_first.direct.json; artifacts/E06_prem.integration.png; artifacts/E06_prem.direct.png; artifacts/E07_first.integration.png; artifacts/E07_first.direct.png; artifacts/E05_bus.integration.png; artifacts/E05_bus.direct.png

#### TC-GSRCH-015 — Parity — one-way, Economy, CAI→JED

1. **Test Case ID:** TC-GSRCH-015
2. **Execution Status:** Failed
3. **Execution Time:** 7s (started 2026-10-11T08:52:41.867Z)
4. **Preconditions:** TC-GSRCH-001 confirmed each session on its own branch and supplier.
5. **Test Data:** One-way CAI→JED, 20/11/2026, 1 Adult, Economy, no RBD.
6. **Steps Performed:** Same criteria in both sessions, searched together, compared.
7. **Expected Result:** Same flights and fare options on both branches.
8. **Actual Result:** A4: 34 extra fare options on Integration. Flights and fare details equal.
9. **Impact / Classification / Root Cause / Severity / Priority:** see DEF-03 (§3.3)
10. **Conclusion:** Flights match (41/41) with equal details; fare options do not (75 vs 41) — DEF-03.
11. **Evidence:** artifacts/E14_jed.comparison.json; artifacts/E14_jed.integration.json; artifacts/E14_jed.direct.json; artifacts/E14_jed.integration.png; artifacts/E14_jed.direct.png

#### TC-GSRCH-016 — Parity — Multi-City, Economy

1. **Test Case ID:** TC-GSRCH-016
2. **Execution Status:** Failed
3. **Execution Time:** 9s (started 2026-10-11T08:53:19.454Z)
4. **Preconditions:** TC-GSRCH-001 confirmed each session on its own branch and supplier.
5. **Test Data:** Multi-city: CAI→DXB 18/11/2026 Economy + DXB→JED 22/11/2026 Economy, 1 Adult, no RBD.
6. **Steps Performed:** Both legs entered in both sessions, searched together, compared.
7. **Expected Result:** Same leg-1+leg-2 combinations and fare options on both branches.
8. **Actual Result:** A1/A2: 14 leg-1+leg-2 combinations only on Integration. A4: 64 extra fare options on Integration. Integration returned exactly 200 offers — possibly capped.
9. **Impact / Classification / Root Cause / Severity / Priority:** see DEF-03, DEF-04 (§3.3)
10. **Conclusion:** Combinations differ (136 vs 122) and Integration stops at 200 offers — DEF-04; extra fare brands — DEF-03.
11. **Evidence:** artifacts/E15_mc.comparison.json; artifacts/E15_mc.integration.json; artifacts/E15_mc.direct.json; artifacts/E15_mc.integration.png; artifacts/E15_mc.direct.png

#### TC-GSRCH-017 — Parity — Multi-City, different Cabin per leg

1. **Test Case ID:** TC-GSRCH-017
2. **Execution Status:** Failed
3. **Execution Time:** 9s (started 2026-10-11T08:53:57.265Z)
4. **Preconditions:** TC-GSRCH-001 confirmed each session on its own branch and supplier.
5. **Test Data:** Multi-city: CAI→DXB 18/11/2026 Economy + DXB→JED 22/11/2026 Business, 1 Adult, no RBD.
6. **Steps Performed:** Cabin set per leg in both sessions, searched together, compared per leg.
7. **Expected Result:** Same combinations; leg 1 Economy and leg 2 Business on both branches.
8. **Actual Result:** A1/A2: 4 combinations only on Integration. A3/A5: on Direct, leg-1 segment ET600 (Economy requested) comes back as Business / RBD D; Integration returns it as Economy / RBD V.
9. **Impact / Classification / Root Cause / Severity / Priority:** see DEF-04, DEF-07 (§3.3)
10. **Conclusion:** 4 combinations only on Integration (DEF-04); Direct returns leg-1 segment ET600 as Business/D (DEF-07).
11. **Evidence:** artifacts/E16_mcbus.comparison.json; artifacts/E16_mcbus.integration.json; artifacts/E16_mcbus.direct.json; artifacts/E16_mcbus.integration.png; artifacts/E16_mcbus.direct.png

#### TC-GSRCH-018 — RBD filter — First Class (F, A)

1. **Test Case ID:** TC-GSRCH-018
2. **Execution Status:** Failed
3. **Execution Time:** 11s (started 2026-10-11T08:54:24.211Z)
4. **Preconditions:** TC-GSRCH-001 confirmed each session on its own branch and supplier.
5. **Test Data:** One-way CAI→DXB, 18/11/2026, 1 Adult, First Class, RBD F / A.
6. **Steps Performed:** One search per RBD in both sessions, compared.
7. **Expected Result:** Each RBD returns First Class fares in that RBD on both branches, with the same flights.
8. **Actual Result:** Integration returns no First Class fares: RBD F → No Flights Found (Direct 10); RBD A → 1 offer whose segments are Business (Direct 10 First).
9. **Impact / Classification / Root Cause / Severity / Priority:** see DEF-02 (§3.3)
10. **Conclusion:** Direct passes for F and A. Integration returns nothing for F and a Business fare for A — DEF-02.
11. **Evidence:** artifacts/E17_firstF.comparison.json; artifacts/E17_firstF.integration.json; artifacts/E17_firstF.direct.json; artifacts/E18_firstA.comparison.json; artifacts/E18_firstA.integration.json; artifacts/E18_firstA.direct.json; artifacts/E17_firstF.integration.png; artifacts/E17_firstF.direct.png; artifacts/E18_firstA.integration.png; artifacts/E18_firstA.direct.png

#### TC-GSRCH-019 — RBD filter — Premium Economy (J)

1. **Test Case ID:** TC-GSRCH-019
2. **Execution Status:** Failed
3. **Execution Time:** 6s (started 2026-10-11T08:55:26.372Z)
4. **Preconditions:** TC-GSRCH-001 confirmed each session on its own branch and supplier.
5. **Test Data:** One-way CAI→DXB, 18/11/2026, 1 Adult, Premium Economy, RBD J.
6. **Steps Performed:** Same criteria in both sessions, compared.
7. **Expected Result:** Premium Economy fares in RBD J on both branches, same flights.
8. **Actual Result:** Integration returns No Flights Found; Direct returns 5 Premium Economy flights in RBD J.
9. **Impact / Classification / Root Cause / Severity / Priority:** see DEF-01 (§3.3)
10. **Conclusion:** Integration returns No Flights Found; Direct returns 5 — DEF-01.
11. **Evidence:** artifacts/E19_premJ.comparison.json; artifacts/E19_premJ.integration.json; artifacts/E19_premJ.direct.json; artifacts/E19_premJ.integration.png; artifacts/E19_premJ.direct.png

#### TC-GSRCH-021 — RBD filter — on one Multi-City leg only

1. **Test Case ID:** TC-GSRCH-021
2. **Execution Status:** Failed
3. **Execution Time:** 10m (started 2026-10-11T09:03:09.197Z)
4. **Preconditions:** TC-GSRCH-001 confirmed each session on its own branch and supplier.
5. **Test Data:** Multi-city: CAI→DXB 18/11/2026 Economy RBD Q + DXB→JED 22/11/2026 Economy no RBD, 1 Adult.
6. **Steps Performed:** Both legs entered in both sessions, Search clicked (waited 300 s), retried once with network and console capture; control checks on Integration with RBD on no leg, both legs, leg 2 only.
7. **Expected Result:** Search runs; leg 1 limited to RBD Q; same combinations on both branches.
8. **Actual Result:** Search does nothing on both branches when an RBD is set on leg 1 only: no request is sent and no message is shown (seen 2 times per branch). Control checks: no RBD on any leg → search runs; RBD on both legs → search runs; RBD on leg 2 only → no request.
9. **Impact / Classification / Root Cause / Severity / Priority:** see DEF-08 (§3.3)
10. **Conclusion:** Search is silently not submitted on both branches — DEF-08. Parity holds (same outcome).
11. **Evidence:** artifacts/E21_mcQ.integration.png; artifacts/E21_mcQ.direct.png; artifacts/E21_mcQ.integration.json; artifacts/E21_mcQ.direct.json


### 3.3 Defect Register — full write-ups

#### DEF-01 — Integration ignores Premium Economy and returns Economy fares

- **Test Case IDs:** TC-GSRCH-006, TC-GSRCH-010, TC-GSRCH-019
- **Expected Result:** When the user searches with Cabin Class **Premium Economy**, every returned fare option should be in Premium Economy, and the Integration path should return the same Premium Economy flights as the Direct path for the same criteria (SRCH-03, SRCH-07, SRCH-10).
- **Actual Result:** Both branches sent the same request (`cabinClass: 2`). The Direct path returned 12 Premium Economy flights (RBD `J`). The Integration path returned 34 flights, all in **Economy** — exactly the same flights as an Economy search. With RBD `J` added, Integration returned **No Flights Found** while Direct returned 5 Premium Economy flights.
- **Impact:** Agents using the Integration branch cannot sell Premium Economy through Galileo. They see Economy fares labelled as the result of a Premium Economy search, which can lead to a wrong cabin being sold to the passenger.
- **Classification:** Category Business Rule · Layer Integration · Reproducibility Always (Premium searches on 2 runs: validation + execution; also with RBD J) · Regression Unknown · Suspected Component Integration path (supplier NDCGal / NdcGalileoSTG EGY) — cabin mapping for Premium Economy · Confidence High
- **Root Cause Analysis (hedged):** Likely the Integration layer does not map the platform cabin value `2` (Premium Economy) to the NDC/Galileo cabin code, and falls back to Economy. The identical flight list to the Economy search supports this.
- **Conclusion:** The Integration path does not apply the Premium Economy cabin filter.
- **Severity:** High · **Priority:** P1
- **Evidence:** artifacts/E06_prem.comparison.json; artifacts/E06_prem.integration.png; artifacts/E06_prem.direct.png; artifacts/E02_eco.comparison.json; artifacts/E05_bus.comparison.json; artifacts/E06_prem.comparison.json; artifacts/E19_premJ.comparison.json; artifacts/E19_premJ.integration.png; artifacts/E19_premJ.direct.png

#### DEF-02 — Integration ignores First Class and returns Business fares

- **Test Case IDs:** TC-GSRCH-007, TC-GSRCH-010, TC-GSRCH-018
- **Expected Result:** When the user searches with Cabin Class **First Class**, every returned fare option should be in First Class, and both paths should return the same First Class flights (SRCH-03, SRCH-07, SRCH-10, SRCH-11).
- **Actual Result:** Both branches sent `cabinClass: 4`. Direct returned 10 First Class flights (RBD `A`; RBD `F` also returns 10). Integration returned 34 flights in **Business** (plus one option labelled `FirstClass`) — exactly the same flights as a Business search. With RBD `F`, Integration returned **No Flights Found**. With RBD `A`, Integration returned 1 Aegean flight (A3931+A3958) whose segments are **Business**.
- **Impact:** First Class cannot be searched or sold through the Integration branch. A First Class search shows Business fares, which is misleading to the agent and the passenger.
- **Classification:** Category Business Rule · Layer Integration · Reproducibility Always (First searches on 2 runs; also with RBD F and A) · Regression Unknown · Suspected Component Integration path (supplier NDCGal) — cabin mapping for First Class · Confidence High
- **Root Cause Analysis (hedged):** Likely the same cabin-mapping gap as DEF-01: platform cabin value `4` (First) is mapped to Business on the Integration path.
- **Conclusion:** The Integration path does not apply the First Class cabin filter.
- **Severity:** High · **Priority:** P1
- **Evidence:** artifacts/E07_first.comparison.json; artifacts/E07_first.integration.png; artifacts/E07_first.direct.png; artifacts/E02_eco.comparison.json; artifacts/E05_bus.comparison.json; artifacts/E06_prem.comparison.json; artifacts/E17_firstF.comparison.json; artifacts/E18_firstA.comparison.json; artifacts/E17_firstF.integration.png

#### DEF-03 — Integration returns more fare options per flight than Direct

- **Test Case IDs:** TC-GSRCH-002, TC-GSRCH-003, TC-GSRCH-004, TC-GSRCH-005, TC-GSRCH-015, TC-GSRCH-016
- **Expected Result:** For the same criteria, each flight should offer the same set of fare options on both paths (same fare brands, RBDs and baggage) (SRCH-03, SRCH-08).
- **Actual Result:** Integration returns extra fare options on almost every flight. CAI→DXB Economy: 34 flights on both, but 64 fare options on Integration vs 34 on Direct. All 34 Direct options exist on Integration with equal Cabin, RBD and baggage allowance; the 30 extra are higher fare brands (e.g. Emirates "Economy Flex" RBD K next to "Economy Saver" RBD Q; Kuwait Airways "ECONOMY SAVER" RBD T next to "ECONOMY ZERO" RBD V). No duplicate fare options were found on either side. Same pattern on every route (CAI→JED 75/41, Business 59/34, mixed passengers 64/35).
- **Impact:** Agents see different choices depending on the branch. On Direct, the higher fare brands (often with more baggage) are not offered at all, so they cannot be sold; or, if Direct is the reference, Integration is exposing options that Direct does not.
- **Classification:** Category Data Integrity · Layer Integration · Reproducibility Always (every search with results) · Regression Unknown · Suspected Component Offer building / fare-family handling on one of the two paths · Confidence High
- **Root Cause Analysis (hedged):** Appears that the Direct (Galileo) path returns only the lowest fare per flight, while the Integration (NDC) path returns all fare families. Which behaviour is intended is not stated in the Project Context.
- **Conclusion:** Fare-option parity is broken: Integration exposes fare brands the Direct path does not. Needs a decision on the intended behaviour.
- **Severity:** Medium · **Priority:** P2
- **Evidence:** artifacts/E02_eco.comparison.json; artifacts/E02_eco.integration.png; artifacts/E02_eco.direct.png; artifacts/E03_rt.comparison.json; artifacts/E03_rt.integration.png; artifacts/E03_rt.direct.png; artifacts/E04_pax.comparison.json; artifacts/E04_pax.integration.png; artifacts/E04_pax.direct.png; artifacts/E05_bus.comparison.json; artifacts/E05_bus.integration.png; artifacts/E05_bus.direct.png; artifacts/E14_jed.comparison.json; artifacts/E14_jed.integration.png; artifacts/E14_jed.direct.png; artifacts/E15_mc.comparison.json; artifacts/E15_mc.integration.png; artifacts/E15_mc.direct.png

#### DEF-04 — Round-trip and Multi-City return different flight combinations; Integration stops at exactly 200 offers

- **Test Case IDs:** TC-GSRCH-003, TC-GSRCH-016, TC-GSRCH-017
- **Expected Result:** Both paths should return the same outbound+return (or leg 1 + leg 2) combinations for the same criteria (SRCH-03).
- **Actual Result:** Round-trip CAI⇄DXB: Integration 111 combinations, Direct 98; 13 only on Integration (e.g. SV302+SV590 / SV551+SV309). 5 Emirates "Economy Flex" options (RBD L/K) exist only on Direct. Multi-City Economy: 136 vs 122; 14 only on Integration. Multi-City Economy+Business: 65 vs 61; 4 only on Integration (EgyptAir MS901/905/910/912 + MS913/MS643). In both round-trip and Multi-City Economy, Integration returned **exactly 200 offers**.
- **Impact:** Agents see different combinations depending on the branch. If 200 is a hard limit, Integration may be cutting results, so some valid itineraries (such as the 5 Emirates options) are not shown.
- **Classification:** Category Data Integrity · Layer Integration · Reproducibility Always (round-trip and Multi-City, validation + execution) · Regression Unknown · Suspected Component Combination building for round-trip / Multi-City; possible result limit on the Integration path · Confidence Medium
- **Root Cause Analysis (hedged):** Likely two separate causes: (1) the paths combine outbound/return journeys differently; (2) the Integration path appears to cap results at 200 offers. No truncation flag was found in the response, so the cap is not confirmed.
- **Conclusion:** Round-trip and Multi-City combinations differ between the paths, and the Integration result count looks capped at 200.
- **Severity:** Medium · **Priority:** P2
- **Evidence:** artifacts/E03_rt.comparison.json; artifacts/E03_rt.integration.png; artifacts/E03_rt.direct.png; artifacts/E15_mc.comparison.json; artifacts/E15_mc.integration.png; artifacts/E15_mc.direct.png; artifacts/E16_mcbus.comparison.json; artifacts/E16_mcbus.integration.png; artifacts/E16_mcbus.direct.png

#### DEF-05 — Same cabin is named "FirstClass" on Integration and "First" on Direct

- **Test Case IDs:** TC-GSRCH-005
- **Expected Result:** The same cabin should carry the same name on both paths (SRCH-07).
- **Actual Result:** For the Oman Air option WY408+WY603 ("BUSINESS COMFORT"), the cabin value is `FirstClass` on Integration and `First` on Direct.
- **Impact:** Any rule, filter or report that matches on the cabin name will treat the two paths differently.
- **Classification:** Category Data Integrity · Layer Integration · Reproducibility Always (Business and First searches) · Regression Unknown · Suspected Component Cabin name mapping in the search response · Confidence High
- **Root Cause Analysis (hedged):** Likely each path uses its own cabin enum text.
- **Conclusion:** Cabin names are not normalized between the two paths.
- **Severity:** Low · **Priority:** P3
- **Evidence:** artifacts/E05_bus.comparison.json; artifacts/E05_bus.integration.png; artifacts/E05_bus.direct.png

#### DEF-06 — Business search returns an option whose segments are in First cabin (both paths)

- **Test Case IDs:** TC-GSRCH-010
- **Expected Result:** A Business search should return only Business fare options (SRCH-10).
- **Actual Result:** On both paths, the Oman Air option WY408+WY603, brand "BUSINESS COMFORT", has its segments in First cabin (`FirstClass` / `First`). All other options are Business.
- **Impact:** An agent searching for Business sees one option marked as First cabin. It may be correct airline data, or a cabin-mapping issue.
- **Classification:** Category Business Rule · Layer Unknown · Reproducibility Always (validation + execution) · Regression Unknown · Suspected Component N/A · Confidence Medium
- **Root Cause Analysis (hedged):** Possibly correct airline data (the airline may file this product under its First cabin code). Needs confirmation from the airline content before treating it as a defect.
- **Conclusion:** The Business cabin filter is not strict on either path for this one airline product. To be confirmed.
- **Severity:** Low · **Priority:** P3
- **Evidence:** artifacts/E02_eco.comparison.json; artifacts/E05_bus.comparison.json; artifacts/E06_prem.comparison.json

#### DEF-07 — Direct returns a leg-1 segment as Business in a mixed-cabin Multi-City search

- **Test Case IDs:** TC-GSRCH-017
- **Expected Result:** With leg 1 = Economy and leg 2 = Business, every leg-1 segment should be Economy on both paths, with the same RBD (SRCH-07, SRCH-08, SRCH-10).
- **Actual Result:** For itinerary ET453+ET600 (leg 1) / ET601+ET462 (leg 2), Direct returns segment **ET600 (ADD→DXB, leg 1) as Business, RBD D**. Integration returns the same segment as Economy, RBD V. The return segment ET601 (DXB→ADD, leg 2) is Business/D on both.
- **Impact:** A passenger could be quoted the wrong cabin and booking class on one leg of a Multi-City trip.
- **Classification:** Category Data Integrity · Layer Integration · Reproducibility Unable to confirm (seen in 1 execution; 1 itinerary) · Regression Unknown · Suspected Component Direct (Galileo) path — per-segment cabin mapping in Multi-City · Confidence Medium
- **Root Cause Analysis (hedged):** Likely the Direct path matches segment details to segments by flight number pattern or by position, and confuses ET600 with ET601 (same route pair, opposite direction).
- **Conclusion:** On the Direct path, per-segment cabin/RBD can be wrong on a mixed-cabin Multi-City itinerary.
- **Severity:** Medium · **Priority:** P2
- **Evidence:** artifacts/E16_mcbus.comparison.json; artifacts/E16_mcbus.integration.png; artifacts/E16_mcbus.direct.png

#### DEF-08 — Multi-City search silently does nothing when an RBD is set on some legs but not all

- **Test Case IDs:** TC-GSRCH-021
- **Expected Result:** Selecting RBD `Q` on leg 1 only should run the search and limit leg 1 to RBD Q (SRCH-11). If this combination is not allowed, the page should say so.
- **Actual Result:** On both branches, clicking **Search** sends no request and shows no message. Control checks on the Integration branch: RBD on no leg → search runs (HTTP 200); RBD on both legs → search runs (HTTP 200); RBD on leg 2 only → no request. No Angular control was marked invalid.
- **Impact:** Users cannot search Multi-City with an RBD on one leg, and they get no feedback, so they may think the system is frozen.
- **Classification:** Category Validation · Layer Frontend · Reproducibility Always (2 attempts per branch, plus control checks) · Regression Unknown · Suspected Component Flight Search widget — Multi-City form submit / validation · Confidence High
- **Root Cause Analysis (hedged):** Likely a hidden form rule requires the RBD list to be filled on every leg or on none, without showing an error.
- **Conclusion:** Partial per-leg RBD selection blocks Multi-City search silently, on both paths.
- **Severity:** Medium · **Priority:** P2
- **Evidence:** artifacts/E21_mcQ.integration.png; artifacts/E21_mcQ.direct.png


## 4. Evidence Inventory

| Test Case ID | Evidence Type | Path | Captured? | Gap Reason |
|---|---|---|---|---|
| TC-GSRCH-001 | Observed values (branch, supplier list, cookies, reload) | `manual_execution/artifacts/TC001.sessions.json` | Yes | — |
| TC-GSRCH-002 | Normalized results per branch + comparison | `manual_execution/artifacts/E02_eco.comparison.json` | Yes | — |
| TC-GSRCH-003 | Normalized results per branch + comparison | `manual_execution/artifacts/E03_rt.comparison.json` | Yes | — |
| TC-GSRCH-004 | Normalized results per branch + comparison | `manual_execution/artifacts/E04_pax.comparison.json` | Yes | — |
| TC-GSRCH-005 | Normalized results per branch + comparison | `manual_execution/artifacts/E05_bus.comparison.json` | Yes | — |
| TC-GSRCH-006 | Normalized results per branch + comparison | `manual_execution/artifacts/E06_prem.comparison.json` | Yes | — |
| TC-GSRCH-007 | Normalized results per branch + comparison | `manual_execution/artifacts/E07_first.comparison.json` | Yes | — |
| TC-GSRCH-010 | Normalized results per branch + comparison | `manual_execution/artifacts/E02_eco.comparison.json`, `manual_execution/artifacts/E05_bus.comparison.json`, `manual_execution/artifacts/E06_prem.comparison.json`, `manual_execution/artifacts/E07_first.comparison.json` | Yes | — |
| TC-GSRCH-011 | Normalized results per branch + comparison | `manual_execution/artifacts/E08_ecoQ.comparison.json`, `manual_execution/artifacts/E09_ecoK.comparison.json`, `manual_execution/artifacts/E10_ecoY.comparison.json` | Yes | — |
| TC-GSRCH-012 | Normalized results per branch + comparison | `manual_execution/artifacts/E11_busJ.comparison.json`, `manual_execution/artifacts/E12_busC.comparison.json` | Yes | — |
| TC-GSRCH-013 | Normalized results per branch + comparison | `manual_execution/artifacts/E13_ecoJ.comparison.json` | Yes | — |
| TC-GSRCH-015 | Normalized results per branch + comparison | `manual_execution/artifacts/E14_jed.comparison.json` | Yes | — |
| TC-GSRCH-016 | Normalized results per branch + comparison | `manual_execution/artifacts/E15_mc.comparison.json` | Yes | — |
| TC-GSRCH-017 | Normalized results per branch + comparison | `manual_execution/artifacts/E16_mcbus.comparison.json` | Yes | — |
| TC-GSRCH-018 | Normalized results per branch + comparison | `manual_execution/artifacts/E17_firstF.comparison.json`, `manual_execution/artifacts/E18_firstA.comparison.json` | Yes | — |
| TC-GSRCH-019 | Normalized results per branch + comparison | `manual_execution/artifacts/E19_premJ.comparison.json` | Yes | — |
| TC-GSRCH-020 | Normalized results per branch + comparison | `manual_execution/artifacts/E20_ecoQK.comparison.json` | Yes | — |
| TC-GSRCH-021 | Normalized results per branch + comparison | `manual_execution/` | No | No search response — the search was not submitted (DEF-08) |
| Failed cases | Screenshots (results page, both branches) | `manual_execution/artifacts/*.integration.png`, `*.direct.png` | Yes, failed searches only | Passed cases: no screenshot by rule (`pipeline.md` §11.4) |
| All | Video / console logs | — | No | Not needed: every assertion is evidenced by the search response; console was captured only for TC-GSRCH-021 (empty) |
| All | Raw search responses | — | Not kept in the repo | Kept in the session scratchpad only; contain prices and session-level IDs. The normalized files hold every compared field |

**Evidence root:** `platform_core_data/runs/search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch/manual_execution/artifacts/`
