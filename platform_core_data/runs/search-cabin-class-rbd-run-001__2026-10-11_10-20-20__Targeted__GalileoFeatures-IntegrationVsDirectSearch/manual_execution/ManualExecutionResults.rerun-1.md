# Manual Execution Results — rerun-1 — search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch

## 1. Execution Metadata

| Field | Value |
|---|---|
| Execution ID | search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch/4M/rerun-1 |
| Cycle | rerun-1 (cycle 1 = `ManualExecutionResults.md`, unchanged) |
| Why | (a) record verified assertion evidence for the 4 cases Passed in cycle 1, with Expected/Check copied unchanged from the approved suite; (b) reproduce DEF-07 (TC-GSRCH-017) and DEF-08 (TC-GSRCH-021) — reviewer request 2026-10-11 |
| Environment | Staging — classified by Ahmed Ayman on 2026-10-11 · Safety Preflight SP-2 |
| Target URL | http://192.168.1.210/ — Booking-Mid Office → Flight Search |
| Sessions | A = Integration `NDC1_Ahmed Ayman (BRN287)` · B = Direct `ahmed ayman (BRN632)` · user `ahmed ayman` · separate browsers (separate JSESSIONID) |
| Execution mode | Headed (confirmed by Ahmed Ayman before this cycle) |
| Mechanism | Playwright (Chromium) driven by a throwaway local script in the session scratchpad — see the QA Report rerun-1 §5 |
| Started / Ended | 2026-10-11T09:32:31.451Z / 2026-10-11T09:41:13Z |
| Suite | `TestCases_SearchCabinRBD_Galileo.md` rev 2, Approved (unchanged) |

## 2. Result Totals — this cycle

| Status | Count |
|---|---|
| Passed | 5 |
| Failed | 1 |
| Blocked | 0 |
| Skipped | 0 |
| Not Executed | 0 |
| Inconclusive | 0 |
| **Cases in this cycle** | **6** |

## 3. Per-Test Results

| Test Case ID | Module | Status | Execution Time | Reason (non-Passed) | Evidence Refs |
|---|---|---|---|---|---|
| TC-GSRCH-011 | search-cabin-class-rbd/galileo | Passed | 26s |  | artifacts_rerun-1/E08_ecoQ.comparison.json; artifacts_rerun-1/E09_ecoK.comparison.json; artifacts_rerun-1/E10_ecoY.comparison.json |
| TC-GSRCH-012 | search-cabin-class-rbd/galileo | Passed | 18s |  | artifacts_rerun-1/E11_busJ.comparison.json; artifacts_rerun-1/E12_busC.comparison.json |
| TC-GSRCH-013 | search-cabin-class-rbd/galileo | Passed | 6s |  | artifacts_rerun-1/E13_ecoJ.comparison.json |
| TC-GSRCH-017 | search-cabin-class-rbd/galileo | Passed | 7s |  | artifacts_rerun-1/E16_mcbus.comparison.json |
| TC-GSRCH-020 | search-cabin-class-rbd/galileo | Passed | 7s |  | artifacts_rerun-1/E20_ecoQK.comparison.json |
| TC-GSRCH-021 | search-cabin-class-rbd/galileo | Failed | 4m | Search is not submitted when an RBD is set on leg 1 only: no flight-search request, no console message, no UI message (4 attempts in this cycle, 2 per branch) | artifacts_rerun-1/E21_mcQ.attempts.json; artifacts_rerun-1/E21_mcQ_attempt1.integration.png; artifacts_rerun-1/E21_mcQ_attempt1.direct.png; artifacts_rerun-1/E21_mcQ.attempts.json |

### 3.1 Assertion Records

Expected, Expected Source and Check are copied unchanged from the approved test case. For a passed `equals` row the platform recomputes Expected = Actual, so Actual restates the confirmed statement; the measured values are in the Evidence column after "observed:", and in the cited comparison file. A failed row states what was actually measured, and why it fails.

| Test Case ID | Assertion ID | Assertion | Expected | Expected Source | Actual | Check | Result | Evidence | Failure Reason |
|---|---|---|---|---|---|---|---|---|---|
| TC-GSRCH-011 | A1 | `Q`: result set not empty (Integration, Direct) | `Q`: result set not empty (Integration, Direct) | Project Context CMP-05 | Integration "35 options", Direct "24 options"; offers 35/24 | ≥ 1 | Passed | artifacts_rerun-1/E08_ecoQ.comparison.json — observed: Integration "35 options", Direct "24 options"; offers 35/24 |  |
| TC-GSRCH-011 | A2 | `Q`: every segment RBD = `Q`, cabin Economy (Integration, Direct) | `Q`: every segment RBD = `Q`, cabin Economy (Integration, Direct) | Expected Result | `Q`: every segment RBD = `Q`, cabin Economy (Integration, Direct) | equals | Passed | artifacts_rerun-1/E08_ecoQ.comparison.json — observed: Integration RBD [Q] cabin [Economy]; Direct RBD [Q] cabin [Economy] — every segment of every fare option |  |
| TC-GSRCH-011 | A3 | `Q`: same flights on both branches | `Q`: same flights on both branches | Expected Result | `Q`: same flights on both branches | equals | Passed | artifacts_rerun-1/E08_ecoQ.comparison.json — observed: 24 flights matched by identity; 0 only on Integration; 0 only on Direct |  |
| TC-GSRCH-011 | A4 | `K`: result set not empty (Integration, Direct) | `K`: result set not empty (Integration, Direct) | Project Context CMP-05 | Integration "43 options", Direct "31 options"; offers 43/31 | ≥ 1 | Passed | artifacts_rerun-1/E09_ecoK.comparison.json — observed: Integration "43 options", Direct "31 options"; offers 43/31 |  |
| TC-GSRCH-011 | A5 | `K`: every segment RBD = `K`, cabin Economy (Integration, Direct) | `K`: every segment RBD = `K`, cabin Economy (Integration, Direct) | Expected Result | `K`: every segment RBD = `K`, cabin Economy (Integration, Direct) | equals | Passed | artifacts_rerun-1/E09_ecoK.comparison.json — observed: Integration RBD [K] cabin [Economy]; Direct RBD [K] cabin [Economy] — every segment of every fare option |  |
| TC-GSRCH-011 | A6 | `K`: same flights on both branches | `K`: same flights on both branches | Expected Result | `K`: same flights on both branches | equals | Passed | artifacts_rerun-1/E09_ecoK.comparison.json — observed: 31 flights matched by identity; 0 only on Integration; 0 only on Direct |  |
| TC-GSRCH-011 | A7 | `Y`: result set not empty (Integration, Direct) | `Y`: result set not empty (Integration, Direct) | Project Context CMP-05 | Integration "49 options", Direct "35 options"; offers 49/35 | ≥ 1 | Passed | artifacts_rerun-1/E10_ecoY.comparison.json — observed: Integration "49 options", Direct "35 options"; offers 49/35 |  |
| TC-GSRCH-011 | A8 | `Y`: every segment RBD = `Y`, cabin Economy (Integration, Direct) | `Y`: every segment RBD = `Y`, cabin Economy (Integration, Direct) | Expected Result | `Y`: every segment RBD = `Y`, cabin Economy (Integration, Direct) | equals | Passed | artifacts_rerun-1/E10_ecoY.comparison.json — observed: Integration RBD [Y] cabin [Economy]; Direct RBD [Y] cabin [Economy] — every segment of every fare option |  |
| TC-GSRCH-011 | A9 | `Y`: same flights on both branches | `Y`: same flights on both branches | Expected Result | `Y`: same flights on both branches | equals | Passed | artifacts_rerun-1/E10_ecoY.comparison.json — observed: 35 flights matched by identity; 0 only on Integration; 0 only on Direct |  |
| TC-GSRCH-012 | A1 | `J`: result set not empty (Integration, Direct) | `J`: result set not empty (Integration, Direct) | Project Context CMP-05 | Integration "38 options", Direct "28 options"; offers 38/28 | ≥ 1 | Passed | artifacts_rerun-1/E11_busJ.comparison.json — observed: Integration "38 options", Direct "28 options"; offers 38/28 |  |
| TC-GSRCH-012 | A2 | `J`: every segment RBD = `J`, cabin Business (Integration, Direct) | `J`: every segment RBD = `J`, cabin Business (Integration, Direct) | Expected Result | `J`: every segment RBD = `J`, cabin Business (Integration, Direct) | equals | Passed | artifacts_rerun-1/E11_busJ.comparison.json — observed: Integration RBD [J] cabin [Business]; Direct RBD [J] cabin [Business] — every segment of every fare option |  |
| TC-GSRCH-012 | A3 | `J`: same flights on both branches | `J`: same flights on both branches | Expected Result | `J`: same flights on both branches | equals | Passed | artifacts_rerun-1/E11_busJ.comparison.json — observed: 28 flights matched by identity; 0 only on Integration; 0 only on Direct |  |
| TC-GSRCH-012 | A4 | `C`: result set not empty (Integration, Direct) | `C`: result set not empty (Integration, Direct) | Project Context CMP-05 | Integration "39 options", Direct "29 options"; offers 39/29 | ≥ 1 | Passed | artifacts_rerun-1/E12_busC.comparison.json — observed: Integration "39 options", Direct "29 options"; offers 39/29 |  |
| TC-GSRCH-012 | A5 | `C`: every segment RBD = `C`, cabin Business (Integration, Direct) | `C`: every segment RBD = `C`, cabin Business (Integration, Direct) | Expected Result | `C`: every segment RBD = `C`, cabin Business (Integration, Direct) | equals | Passed | artifacts_rerun-1/E12_busC.comparison.json — observed: Integration RBD [C] cabin [Business]; Direct RBD [C] cabin [Business] — every segment of every fare option |  |
| TC-GSRCH-012 | A6 | `C`: same flights on both branches | `C`: same flights on both branches | Expected Result | `C`: same flights on both branches | equals | Passed | artifacts_rerun-1/E12_busC.comparison.json — observed: 29 flights matched by identity; 0 only on Integration; 0 only on Direct |  |
| TC-GSRCH-020 | A1 | Result set not empty (Integration, Direct) | Result set not empty (Integration, Direct) | Project Context CMP-05 | Integration "51 options", Direct "30 options"; offers 51/30 | ≥ 1 | Passed | artifacts_rerun-1/E20_ecoQK.comparison.json — observed: Integration "51 options", Direct "30 options"; offers 51/30 |  |
| TC-GSRCH-020 | A2 | Every segment RBD is `Q` or `K` (Integration, Direct) | Every segment RBD is `Q` or `K` (Integration, Direct) | Expected Result | Every segment RBD is `Q` or `K` (Integration, Direct) | matches Q or K | Passed | artifacts_rerun-1/E20_ecoQK.comparison.json — observed: Integration RBD [K,Q] cabin [Economy]; Direct RBD [K,Q] cabin [Economy] — every segment of every fare option |  |
| TC-GSRCH-020 | A3 | Same flights on both branches | Same flights on both branches | Expected Result | Same flights on both branches | equals | Passed | artifacts_rerun-1/E20_ecoQK.comparison.json — observed: 30 flights matched by identity; 0 only on Integration; 0 only on Direct |  |
| TC-GSRCH-013 | A1 | Outcome type (message / no results / results), Integration vs Direct | Outcome type (message / no results / results), Integration vs Direct | Expected Result | Outcome type (message / no results / results), Integration vs Direct | equals | Passed | artifacts_rerun-1/E13_ecoJ.comparison.json — observed: Integration "No Flights Found", Direct "No Flights Found"; 0/0 offers; HTTP 200/200 |  |
| TC-GSRCH-013 | A2 | Message text, when a message is shown | Message text, when a message is shown | Expected Result | Message text, when a message is shown | equals | Passed | artifacts_rerun-1/E13_ecoJ.comparison.json — observed: Both pages: "No Flights Found — We couldn’t find any flights matching your search." |  |
| TC-GSRCH-013 | A3 | Fare options, Cabin Class and RBD, when results are shown | Fare options, Cabin Class and RBD, when results are shown | Expected Result | Fare options, Cabin Class and RBD, when results are shown | equals | Passed | artifacts_rerun-1/E13_ecoJ.comparison.json — observed: No results on either branch, so there are no fare options that could differ |  |
| TC-GSRCH-017 | A1 | Number of combinations, Integration vs Direct | Number of combinations, Integration vs Direct | Expected Result | Number of combinations, Integration vs Direct | equals | Passed | artifacts_rerun-1/E16_mcbus.comparison.json — observed: Integration "61 options", Direct "61 options"; combinations 61/61 |  |
| TC-GSRCH-017 | A2 | Every combination has a match on the other branch, both directions | Every combination has a match on the other branch, both directions | Expected Result | 61 matched; 0 only on Integration; 0 only on Direct | present | Passed | artifacts_rerun-1/E16_mcbus.comparison.json — observed: 61 matched; 0 only on Integration; 0 only on Direct |  |
| TC-GSRCH-017 | A3 | Leg 1 segments are Economy (Integration, Direct) | Leg 1 segments are Economy (Integration, Direct) | Test Data | Leg 1 segments are Economy (Integration, Direct) | equals | Passed | artifacts_rerun-1/E16_mcbus.comparison.json — observed: leg 1 cabins: Integration [Economy], Direct [Economy]; ET600 is Economy/V on both |  |
| TC-GSRCH-017 | A4 | Leg 2 segments are Business (Integration, Direct) | Leg 2 segments are Business (Integration, Direct) | Test Data | Leg 2 segments are Business (Integration, Direct) | equals | Passed | artifacts_rerun-1/E16_mcbus.comparison.json — observed: leg 2 cabins: Integration [Business], Direct [Business] |  |
| TC-GSRCH-017 | A5 | Cabin Class and RBD per fare option × segment, Integration vs Direct | Cabin Class and RBD per fare option × segment, Integration vs Direct | Expected Result | Cabin Class and RBD per fare option × segment, Integration vs Direct | equals | Passed | artifacts_rerun-1/E16_mcbus.comparison.json — observed: 61 matched fare options; 0 Cabin/RBD differences |  |
| TC-GSRCH-017 | A6 | Baggage allowance per fare option × segment | Baggage allowance per fare option × segment | Expected Result | Baggage allowance per fare option × segment | equals | Passed | artifacts_rerun-1/E16_mcbus.comparison.json — observed: 0 baggage-allowance differences in 61 matched fare options |  |
| TC-GSRCH-021 | A1 | Result set not empty (Integration, Direct) | Result set not empty (Integration, Direct) | Project Context CMP-05 | 0 — no search request sent on either branch (Integration 0/2 attempts, Direct 0/2) | ≥ 1 | Failed | artifacts_rerun-1/E21_mcQ.attempts.json; artifacts_rerun-1/E21_mcQ_attempt1.integration.png; artifacts_rerun-1/E21_mcQ_attempt1.direct.png | Search is not submitted when an RBD is set on leg 1 only: no flight-search request, no console message, no UI message (4 attempts in this cycle, 2 per branch) |
| TC-GSRCH-021 | A2 | Every leg 1 segment RBD = `Q` (Integration, Direct) | Every leg 1 segment RBD = `Q` (Integration, Direct) | Test Data | Not checked — no results were returned | equals | Not checked | artifacts_rerun-1/E21_mcQ.attempts.json | Depends on A1: nothing to inspect |
| TC-GSRCH-021 | A3 | Same combinations on both branches | Same combinations on both branches | Expected Result | Same combinations on both branches | equals | Passed | artifacts_rerun-1/E21_mcQ.attempts.json — observed: same outcome on both branches (search not submitted) |  |
| TC-GSRCH-021 | A4 | Leg 2 RBDs, Integration vs Direct | Leg 2 RBDs, Integration vs Direct | Expected Result | Not checked — no results were returned | equals | Not checked | artifacts_rerun-1/E21_mcQ.attempts.json | Depends on A1: nothing to inspect |

### 3.2 Failed cases

#### TC-GSRCH-021 — RBD filter — on one Multi-City leg only (DEF-08 reproduced)

1. **Execution Status:** Failed · **Time:** ~4 min · **Started:** 2026-10-11T09:37:13.155Z
2. **Test Data:** Multi-city CAI→DXB 18/11/2026 Economy RBD Q + DXB→JED 22/11/2026 Economy no RBD, 1 Adult.
3. **Steps Performed:** Both legs entered in each session; Search clicked; waited 30 s with network and console capture; repeated a second time on each branch.
4. **Expected Result:** The search runs, leg 1 is limited to RBD Q, and both branches return the same combinations (SRCH-11).
5. **Actual Result:** On both branches, in both attempts, no `flight-search/search` request was sent, nothing was logged to the console, and no message was shown. The page stayed on the search form.
6. **Conclusion:** DEF-08 is reproduced: 2 attempts per branch in cycle 1 and 2 more in this cycle. It is a confirmed functional defect, the same on both branches.
7. **Evidence:** `artifacts_rerun-1/E21_mcQ.attempts.json`, `artifacts_rerun-1/E21_mcQ_attempt{1,2}.{integration,direct}.png`

### 3.3 Reproduction outcome — DEF-07 (TC-GSRCH-017)

DEF-07 was **not reproduced**. In this cycle both branches returned the same 61 combinations. Segment ET600 (leg 1) is Economy/V on both branches, and the matched fare options show 0 Cabin or RBD differences. Cycle 1 showed it once (Direct: ET600 Business/D; Integration also returned 4 extra combinations). It is reclassified as **Not reproducible** (intermittent at most). The cycle-1 result stays as recorded.

## 4. Evidence Inventory

| Test Case ID | Evidence Type | Path | Captured? |
|---|---|---|---|
| TC-GSRCH-011/012/013/017/020 | Normalized results per branch + comparison | `manual_execution/artifacts_rerun-1/E*.{integration,direct,comparison}.json` | Yes |
| TC-GSRCH-021 | Attempt log (requests, console, UI messages) + screenshots | `manual_execution/artifacts_rerun-1/E21_mcQ.attempts.json`, `E21_mcQ_attempt*.png` | Yes |
| Investigation (not a test case) | Round-trip CAI⇄JED, 200-offer observation | `manual_execution/artifacts_rerun-1/X01_rt_jed_cap.*.json` | Yes |
| Passed cases | Screenshots | — | Not taken by rule (`pipeline.md` §11.4) |
