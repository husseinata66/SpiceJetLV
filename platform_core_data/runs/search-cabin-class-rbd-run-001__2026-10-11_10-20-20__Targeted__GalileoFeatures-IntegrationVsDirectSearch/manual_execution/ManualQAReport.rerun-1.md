# Manual QA Report — rerun-1 reconciliation — Galileo Features (Integration vs Direct)

| Field | Value |
|---|---|
| Status | Pending Review |
| Run | `search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch` |
| Cycles | 1 = `ManualExecutionResults.md` (unchanged, as recorded) · rerun-1 = `ManualExecutionResults.rerun-1.md` |
| Environment | Staging — classified by Ahmed Ayman, 2026-10-11 (not in any authoritative config before that) |
| Mode | Headed, both cycles |

## 1. Final execution counts (Run Manager, from the result files)

| Status | Cases |
|---|---|
| Passed | 4 — TC-GSRCH-011, 012, 013, 020 (passed in both cycles; verified in rerun-1) |
| Flaky | 1 — TC-GSRCH-017: Failed in cycle 1, Passed in rerun-1 (DEF-07 not reproduced) |
| Failed | 12 — TC-GSRCH-002, 003, 004, 005, 006, 007, 010, 015, 016, 018, 019, 021 |
| Inconclusive | 1 — TC-GSRCH-001 |
| Blocked / Skipped / Not Executed / Excluded | 0 |
| **Executable scope / Suite total** | **18 / 18** |

Run Manager verification: **verified 5 · unverified 0** (the 4 Passed + TC-GSRCH-017 in rerun-1).

## 2. Classification after investigation

| ID | Finding | Classification | Basis |
|---|---|---|---|
| DEF-01 | Integration ignores Premium Economy (returns Economy; Premium + J → no results) | **Confirmed functional defect** — High | Same request (`cabinClass: 2`) on both; Integration result identical to the Economy search; seen in validation and cycle 1 |
| DEF-02 | Integration ignores First Class (returns Business; First + F → none; First + A → Business) | **Confirmed functional defect** — High | Same request (`cabinClass: 4`); identical to the Business search; validation + cycle 1 |
| DEF-08 | Multi-City with RBD on some legs only: Search silently does nothing (both branches) | **Confirmed functional defect** — Medium | Reproduced: 2 attempts per branch in cycle 1 + 2 in rerun-1; 0 requests, 0 console, 0 messages; works with RBD on all legs or none |
| DEF-03 | Integration returns more fare options per flight | **Parity difference — needs business clarification** | On all 109 matched one-way flights checked (Economy CAI→DXB, CAI→JED, Business), Direct's single option is exactly Integration's lowest-priced option (same brand and RBD). Both requests send `isUpSelling: false`. Which behaviour is intended is not stated in the Project Context |
| DEF-04 | Round-trip / Multi-City combinations differ; Integration stops at 200 | **Parity difference** (combinations) + **probable result limit — needs confirmation** | Integration returned exactly 200 offers in 4 searches. In the extra test (round-trip CAI⇄JED) Direct returned 262 and Integration 200, and all 200 exist on Direct. Not confirmed by any flag in the response. Multi-City Economy: 14 Integration-only combinations, and every one of their legs also exists on Direct |
| DEF-05 | Cabin named `FirstClass` (Integration) vs `First` (Direct) | **Observation — not a defect** | Equivalent names; no mapping requirement exists |
| DEF-06 | Business search returns one Oman Air "BUSINESS COMFORT" product in First cabin (both) | **Needs business clarification** | Same on both branches; may be correct airline data |
| DEF-07 | Direct returned ET600 (leg 1) as Business/D in mixed-cabin Multi-City | **Not reproducible** | Seen once in cycle 1; rerun-1 identical on both branches (61/61, ET600 Economy/V) |
| TC-001 | Branch clears on page reload | **Observation — test-case wording** | No requirement (SRCH-01 only requires confirming the branch before each search). A Stage 3 change is proposed (impact IA-576ed7379024, waiting for decision) |
| — | Baggage wording ("2 Pieces" vs "Number 2 Piece Allowed.") | **Observation — not a functional mismatch** | Allowance equal in every matched fare option |

## 3. Corrections to the cycle-1 QA Report

- **"5 Emirates Economy Flex options exist only on Direct" (round-trip) is withdrawn.** Integration has the same fares (RBD L outbound / K return) but labels the brand per leg ("Economy Saver/Economy Flex"); Direct labels both legs "Economy Flex". The cycle-1 comparison matched fare options by brand name, so it reported them as missing.
- **Round-trip fare matching by brand is not reliable.** In round-trip, Direct shows one brand label for the whole trip even when the legs use different RBDs and baggage (e.g. Kuwait "ECONOMY SAVER": outbound V/0PC, return T/1PC). Integration labels each fare. Fare-option counts for round-trip are therefore reported, but individual "only on one side" fare options in round-trip are **not** claimed as defects.
- **The Multi-City Eco+Business "option only on Direct"** was DEF-07 itself, not a separate finding.
- **Environment** was recorded as "Staging (assumed)" in cycle 1; it is now classified Staging by the reviewer.

## 4. Failed assertions — cycle 1 (detail)

Cycle-1 records are kept exactly as recorded. Their Expected and Check columns were paraphrased rather than copied from the approved case, so the Run Manager lists them as CONFLICT. The table below gives, for every failed assertion of a case that is still Failed, the approved Expected and Check, the measured Actual, the evidence, and the reason. (TC-GSRCH-021's records are in rerun-1, in the required format.)

| Test Case ID | Assertion | Expected (approved) | Actual (measured, cycle 1) | Check (approved) | Evidence | Failure reason |
|---|---|---|---|---|---|---|
| TC-GSRCH-002 | A6 | Fare options per matched flight (same set on both branches) | 34 matched; 30 only on Integration; 0 only on Direct; duplicates Integration 0, Direct 0 | equals | artifacts/E02_eco.comparison.json | A6: Integration returns 30 extra fare options (higher fare brands) on 30 of 34 flights. Flights, segments, times, stops, Cabin, RBD and baggage allowance of every matched fare option are equal. |
| TC-GSRCH-003 | A1 | Number of outbound + return combinations, Integration vs Direct | Integration 111, Direct 98 (UI: Integration "200 options", Direct "98 options"; offers 200/98) | equals | artifacts/E03_rt.comparison.json | A1/A2: 13 outbound+return combinations only on Integration. A6: 83 fare options only on Integration, 5 (Emirates "Economy Flex", RBD L/K) only on Direct. Integration returned exactly 200 offers — possibly capped. |
| TC-GSRCH-003 | A2 | Every combination has a match on the other branch, both directions | 98 matched; 13 only on Integration; 0 only on Direct | present | artifacts/E03_rt.comparison.json | A1/A2: 13 outbound+return combinations only on Integration. A6: 83 fare options only on Integration, 5 (Emirates "Economy Flex", RBD L/K) only on Direct. Integration returned exactly 200 offers — possibly capped. |
| TC-GSRCH-003 | A6 | Fare options per matched combination | 93 matched; 83 only on Integration; 5 only on Direct; duplicates Integration 0, Direct 0; Integration returned exactly 200 offers (possible cap) | equals | artifacts/E03_rt.comparison.json | A1/A2: 13 outbound+return combinations only on Integration. A6: 83 fare options only on Integration, 5 (Emirates "Economy Flex", RBD L/K) only on Direct. Integration returned exactly 200 offers — possibly capped. |
| TC-GSRCH-004 | A6 | Fare options per matched flight | 35 matched; 29 only on Integration; 0 only on Direct; duplicates Integration 0, Direct 0 | equals | artifacts/E04_pax.comparison.json | A6: Integration returns 29 extra fare options. Everything else equal, per passenger type. |
| TC-GSRCH-005 | A4 | Fare options per matched flight | 34 matched; 25 only on Integration; 0 only on Direct; duplicates Integration 0, Direct 0 | equals | artifacts/E05_bus.comparison.json | A4: 25 extra fare options on Integration. A5: the Oman Air "BUSINESS COMFORT" option (WY408+WY603) is labelled `FirstClass` on Integration and `First` on Direct. |
| TC-GSRCH-005 | A5 | Cabin Class name per fare option × segment | 2 differences in 34 matched fare options: WY408 FirstClass⇄First, WY603 FirstClass⇄First | equals | artifacts/E05_bus.comparison.json | A4: 25 extra fare options on Integration. A5: the Oman Air "BUSINESS COMFORT" option (WY408+WY603) is labelled `FirstClass` on Integration and `First` on Direct. |
| TC-GSRCH-006 | A1 | Number of flights, Integration vs Direct | Integration 34, Direct 12 (UI: Integration "64 options", Direct "12 options"; offers 64/12) | equals | artifacts/E06_prem.comparison.json | Integration ignores Premium Economy: it returns the same 34 flights as an Economy search, all in Economy. Direct returns 12 Premium Economy flights (RBD J). |
| TC-GSRCH-006 | A2 | Every flight has a match on the other branch, both directions | 5 matched; 29 only on Integration; 7 only on Direct | present | artifacts/E06_prem.comparison.json | Integration ignores Premium Economy: it returns the same 34 flights as an Economy search, all in Economy. Direct returns 12 Premium Economy flights (RBD J). |
| TC-GSRCH-006 | A4 | Fare options per matched flight | 0 matched; 10 only on Integration; 5 only on Direct; duplicates Integration 0, Direct 0 | equals | artifacts/E06_prem.comparison.json | Integration ignores Premium Economy: it returns the same 34 flights as an Economy search, all in Economy. Direct returns 12 Premium Economy flights (RBD J). |
| TC-GSRCH-006 | A5 | Cabin Class per fare option × segment | Integration returned only Economy (RBDs AEHKLMNQSTVWY); Direct returned only PremiumEconomy (RBD J) | equals | artifacts/E06_prem.comparison.json | Integration ignores Premium Economy: it returns the same 34 flights as an Economy search, all in Economy. Direct returns 12 Premium Economy flights (RBD J). |
| TC-GSRCH-007 | A1 | Number of flights, Integration vs Direct | Integration 34, Direct 10 (UI: Integration "59 options", Direct "10 options"; offers 59/10) | equals | artifacts/E07_first.comparison.json | Integration ignores First Class: it returns the same 34 flights as a Business search. Direct returns 10 First Class flights. |
| TC-GSRCH-007 | A2 | Every flight has a match on the other branch, both directions | 4 matched; 30 only on Integration; 6 only on Direct | present | artifacts/E07_first.comparison.json | Integration ignores First Class: it returns the same 34 flights as a Business search. Direct returns 10 First Class flights. |
| TC-GSRCH-007 | A4 | Fare options per matched flight | 0 matched; 8 only on Integration; 4 only on Direct; duplicates Integration 0, Direct 0 | equals | artifacts/E07_first.comparison.json | Integration ignores First Class: it returns the same 34 flights as a Business search. Direct returns 10 First Class flights. |
| TC-GSRCH-007 | A5 | Cabin Class per fare option × segment | Integration returned Business (+1 option labelled FirstClass); Direct returned only First (RBD A) | equals | artifacts/E07_first.comparison.json | Integration ignores First Class: it returns the same 34 flights as a Business search. Direct returns 10 First Class flights. |
| TC-GSRCH-010 | A2 | Premium Economy: every segment is Premium Economy (Integration, Direct) | Integration [Economy] — Failed; Direct [PremiumEconomy] — Passed | equals | artifacts/E06_prem.comparison.json | Premium Economy and First Class are not applied on Integration (DEF-01, DEF-02). A Business search returns one Oman Air option whose segments are in First cabin, on both branches (DEF-06). |
| TC-GSRCH-010 | A3 | Business: every segment is Business (Integration, Direct) | Integration [Business,FirstClass], Direct [Business,First] — WY408/WY603 "BUSINESS COMFORT" in First on both | equals | artifacts/E05_bus.comparison.json | Premium Economy and First Class are not applied on Integration (DEF-01, DEF-02). A Business search returns one Oman Air option whose segments are in First cabin, on both branches (DEF-06). |
| TC-GSRCH-010 | A4 | First Class: every segment is First Class (Integration, Direct) | Integration [Business,FirstClass] — Failed; Direct [First] — Passed | equals | artifacts/E07_first.comparison.json | Premium Economy and First Class are not applied on Integration (DEF-01, DEF-02). A Business search returns one Oman Air option whose segments are in First cabin, on both branches (DEF-06). |
| TC-GSRCH-015 | A4 | Fare options per matched flight | 41 matched; 34 only on Integration; 0 only on Direct; duplicates Integration 0, Direct 0 | equals | artifacts/E14_jed.comparison.json | A4: 34 extra fare options on Integration. Flights and fare details equal. |
| TC-GSRCH-016 | A1 | Number of combinations, Integration vs Direct | Integration 136, Direct 122 (UI: Integration "200 options", Direct "122 options"; offers 200/122) | equals | artifacts/E15_mc.comparison.json | A1/A2: 14 leg-1+leg-2 combinations only on Integration. A4: 64 extra fare options on Integration. Integration returned exactly 200 offers — possibly capped. |
| TC-GSRCH-016 | A2 | Every combination has a match on the other branch, both directions | 122 matched; 14 only on Integration; 0 only on Direct | present | artifacts/E15_mc.comparison.json | A1/A2: 14 leg-1+leg-2 combinations only on Integration. A4: 64 extra fare options on Integration. Integration returned exactly 200 offers — possibly capped. |
| TC-GSRCH-016 | A4 | Fare options per matched combination | 122 matched; 64 only on Integration; 0 only on Direct; duplicates Integration 0, Direct 0; Integration returned exactly 200 offers (possible cap) | equals | artifacts/E15_mc.comparison.json | A1/A2: 14 leg-1+leg-2 combinations only on Integration. A4: 64 extra fare options on Integration. Integration returned exactly 200 offers — possibly capped. |
| TC-GSRCH-018 | A1 | `F`: result set not empty (Integration, Direct) | Integration "No Flights Found" (0); Direct 10 | ≥ 1 | artifacts/E17_firstF.comparison.json | Integration returns no First Class fares: RBD F → No Flights Found (Direct 10); RBD A → 1 offer whose segments are Business (Direct 10 First). |
| TC-GSRCH-018 | A2 | `F`: every segment RBD = `F`, cabin First Class (Integration, Direct) | Integration: no results; Direct RBD [F] cabin [First] | equals | artifacts/E17_firstF.comparison.json | Integration returns no First Class fares: RBD F → No Flights Found (Direct 10); RBD A → 1 offer whose segments are Business (Direct 10 First). |
| TC-GSRCH-018 | A3 | `F`: same flights on both branches | 0 vs 10 | equals | artifacts/E17_firstF.comparison.json | Integration returns no First Class fares: RBD F → No Flights Found (Direct 10); RBD A → 1 offer whose segments are Business (Direct 10 First). |
| TC-GSRCH-018 | A5 | `A`: every segment RBD = `A`, cabin First Class (Integration, Direct) | Integration RBD [A] cabin [Business] — Failed; Direct RBD [A] cabin [First] — Passed | equals | artifacts/E18_firstA.comparison.json | Integration returns no First Class fares: RBD F → No Flights Found (Direct 10); RBD A → 1 offer whose segments are Business (Direct 10 First). |
| TC-GSRCH-018 | A6 | `A`: same flights on both branches | 0 matched; 1 only Integration (A3931+A3958); 10 only Direct | equals | artifacts/E18_firstA.comparison.json | Integration returns no First Class fares: RBD F → No Flights Found (Direct 10); RBD A → 1 offer whose segments are Business (Direct 10 First). |
| TC-GSRCH-019 | A1 | Result set not empty (Integration, Direct) | Integration "No Flights Found" (0); Direct 5 | ≥ 1 | artifacts/E19_premJ.comparison.json | Integration returns No Flights Found; Direct returns 5 Premium Economy flights in RBD J. |
| TC-GSRCH-019 | A2 | Every segment RBD = `J`, cabin Premium Economy (Integration, Direct) | Integration: no results; Direct RBD [J] cabin [PremiumEconomy] | equals | artifacts/E19_premJ.comparison.json | Integration returns No Flights Found; Direct returns 5 Premium Economy flights in RBD J. |
| TC-GSRCH-019 | A3 | Same flights on both branches | 0 vs 5 | equals | artifacts/E19_premJ.comparison.json | Integration returns No Flights Found; Direct returns 5 Premium Economy flights in RBD J. |

## 5. Execution method and limitations

- **Mechanism:** two Chromium browsers launched **headed** by Playwright from a throwaway script in the session scratchpad (not the Playwright MCP server, not the platform BrowserDriver). BrowserDriver has no profile or credentials entry for 192.168.1.210, and adding one would change platform configuration.
- **What the script did:** logged in as `ahmed ayman` in each browser (separate cookies), selected the branch, filled the search form through the page UI, clicked Search, and read the `flight-search/search` response that the page itself requested and rendered. No request was crafted or sent by the script itself.
- **Limitations:**
  - the platform's browser-launch guard (preflight binding inside BrowserDriver) was not exercised; the Safety Preflights SP-1 and SP-2 were recorded through the Run Manager instead;
  - the comparison reads the search response behind the results page, not the rendered cards — the "N options" header on the page was recorded and matches the response's offer count in every search;
  - credentials were held in the scratchpad only and never written to the run.
- **Session B was logged out between cycles** (session timeout) and was logged in again before rerun-1.

## 6. Unresolved items

1. TC-GSRCH-001 change — needs your impact decision (IA-576ed7379024) and a Stage 3 re-approval.
2. Cycle-1 failed records for 11 cases do not use the approved Expected/Check (shown as CONFLICT). §4 gives the detail. A rerun-2 of those cases would produce records in the required format, if you want it.
3. DEF-03 and DEF-06 — need a business decision. DEF-04's result limit — needs confirmation from the Integration team.
