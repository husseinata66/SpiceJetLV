# Manual QA Report — Galileo Features: Check Supplier Request/Response Parity

| Field | Value |
|---|---|
| Status | Pending Review |
| Run | `search-cabin-class-rbd-run-002__2026-10-11_15-01-07__Targeted__GalileoFeatures-CheckSupplierParity` |
| Suite | `TestCases_SearchCabinRBD_Galileo_CheckSupplierParity.md` rev 1 (Approved) — 18 cases: 1 Setup / Configuration, 17 Request/Response Parity |
| Environment / mode | Staging (classified by Ahmed Ayman) · Headed · two separate browsers · Safety Preflight SP-1 · Check Supplier only |
| Executed | 2026-10-11T12:52:56.970Z → 2026-10-11T13:09:06.903Z |

## 1. Outcome

| Passed | Failed | Inconclusive | Blocked | Skipped | Not Executed | Excluded | Executable scope |
|---|---|---|---|---|---|---|---|
| 1 | 8 | 6 | 3 | 0 | 0 | 0 | 18 |

Assertions: 347 records — Passed 279 · Failed 32 · Not checked 36.

**What the request/response view adds to run-001:**
- **DEF-01 and DEF-02 are located at the request boundary.** For the same UI criteria, the platform's own request is identical on both branches (`cabinClass` 2 for Premium Economy, 4 for First). But the request sent to the Integration Layer carries `Economy` for Premium Economy and `Business` for First, while the Direct request carries the selected cabin. The wrong cabin is therefore already in the NDCGal request, as the platform back end reports it (BND-04). What the Integration Layer then sends to Galileo is not observable (BND-03).
- **Extra fare options on Integration (DEF-03) follow the upsell request.** The Integration request always sends `ReturnUpsellFare="true"` although the platform request says `isUpSelling: false`, and its responses carry `UpsellBrand` elements. Every extra Integration option on a matched flight is within the requested Cabin/RBD, so it is recorded as **PC-05 (P-UPSELL)** — a potential explanation, not a confirmed root cause.
- **TC-GCSP-017** (Multi-City, Economy + Business) matched exactly: 61 flights and 61 fare options on both sides. The ET600 Business/D anomaly seen on Direct in run-001 did not recur.
- **3 cases are Blocked by an execution error**, not a mismatch: the Integration path returned `Non-Specified Internal Communication Error` (HTTP 500 from Travelport PP, relayed by the Integration Layer) in C012_C (Business, RBD C), C016 (Multi-City) and C021 (Multi-City, RBD Q on leg 1). Direct answered normally at the same time. Their requests were still captured and judged. A rerun is recommended.

## 2. Case-level results

| Test Case | Title | Status | RQ group | RS group | Pending (PC) | Failed assertions |
|---|---|---|---|---|---|---|
| TC-GCSP-001 | Setup — branch, supplier and credential read back in each session | **Passed** | — | — | — | — |
| TC-GCSP-002 | Request/Response parity — one-way, Economy, CAI→DXB | **Failed** | Inconclusive — Pending Parity Clarification | Failed | PC-01, PC-02, PC-03, PC-04, PC-05 | A13 |
| TC-GCSP-003 | Request/Response parity — round-trip, Economy, CAI⇄DXB | **Failed** | Inconclusive — Pending Parity Clarification | Failed | PC-01, PC-02, PC-03, PC-04, PC-05 | A13 |
| TC-GCSP-004 | Request/Response parity — mixed passengers (Adult, Child, Infant) | **Inconclusive** | Inconclusive — Pending Parity Clarification | Inconclusive — Pending Parity Clarification | PC-01, PC-02, PC-03, PC-04, PC-05 | — |
| TC-GCSP-005 | Request/Response parity — Business, CAI→DXB | **Failed** | Inconclusive — Pending Parity Clarification | Failed | PC-01, PC-02, PC-03, PC-04, PC-05 | A18 |
| TC-GCSP-006 | Request/Response parity — Premium Economy, CAI→DXB | **Failed** | Failed | Failed | PC-01, PC-02, PC-03, PC-04 | A7, A9, A13, A15, A18 |
| TC-GCSP-007 | Request/Response parity — First Class, CAI→DXB | **Failed** | Failed | Failed | PC-01, PC-02, PC-03, PC-04 | A7, A9, A13, A15, A18 |
| TC-GCSP-010 | Request/Response parity — Cabin Class sent and returned per selected cabin | **Failed** | Failed | Failed | PC-01, PC-02, PC-03, PC-04, PC-05 | A7, A9, A13, A15, A18 |
| TC-GCSP-011 | Request/Response parity — RBD — Economy (Q, K, Y) | **Inconclusive** | Inconclusive — Pending Parity Clarification | Passed | PC-01, PC-02, PC-03, PC-04 | — |
| TC-GCSP-012 | Request/Response parity — RBD — Business (J, C) | **Blocked** | Inconclusive — Pending Parity Clarification | Blocked — supplier communication error | PC-01, PC-02, PC-03, PC-04 | A12 |
| TC-GCSP-013 | Request/Response parity — Cabin Class and RBD that do not match | **Inconclusive** | Inconclusive — Pending Parity Clarification | Inconclusive — test design discrepancy (A12) | PC-01, PC-02, PC-03, PC-04 | A12 |
| TC-GCSP-015 | Request/Response parity — one-way, Economy, CAI→JED | **Inconclusive** | Inconclusive — Pending Parity Clarification | Inconclusive — Pending Parity Clarification | PC-01, PC-02, PC-03, PC-04, PC-05 | — |
| TC-GCSP-016 | Request/Response parity — Multi-City, Economy | **Blocked** | Inconclusive — Pending Parity Clarification | Blocked — supplier communication error | PC-01, PC-02, PC-03, PC-04 | A12 |
| TC-GCSP-017 | Request/Response parity — Multi-City, different Cabin per leg | **Inconclusive** | Inconclusive — Pending Parity Clarification | Passed | PC-01, PC-02, PC-03, PC-04 | — |
| TC-GCSP-018 | Request/Response parity — RBD — First Class (F, A) | **Failed** | Failed | Failed | PC-01, PC-02, PC-03, PC-04 | A7, A9, A12, A13, A18 |
| TC-GCSP-019 | Request/Response parity — RBD — Premium Economy (J) | **Failed** | Failed | Failed | PC-01, PC-02, PC-03, PC-04 | A7, A9, A12, A13, A18 |
| TC-GCSP-020 | Request/Response parity — RBD — several RBDs together (Q + K) | **Inconclusive** | Inconclusive — Pending Parity Clarification | Inconclusive — Pending Parity Clarification | PC-01, PC-02, PC-03, PC-04, PC-05 | — |
| TC-GCSP-021 | Request/Response parity — RBD on one Multi-City leg only | **Blocked** | Inconclusive — Pending Parity Clarification | Blocked — supplier communication error | PC-01, PC-02, PC-03, PC-04 | A12 |

## 3. Confirmed Functional Mismatches

| ID | Group | Side | Mismatch | Cases | Instances |
|---|---|---|---|---|---|
| CFM-01 | RS | Integration | flight on one side only | 002, 003, 006, 007, 010, 018 | 135 |
| CFM-02 | RS | Integration | Returned segments outside the requested Cabin/RBD (A18) | 005, 010 | 8 |
| CFM-03 | RS | Direct | Returned segments outside the requested Cabin/RBD (A18) | 005, 010 | 4 |
| CFM-04 | RQ | Integration | Request cabin: sends "leg 1 Economy" where the Test Data is "leg 1 Premium Economy" | 006, 010, 019 | 3 |
| CFM-05 | RS | Direct | flight on one side only | 006, 007, 010, 018, 019 | 51 |
| CFM-06 | RS | Integration | fare option on one side only | 006, 007, 010 | 26 |
| CFM-07 | RS | Direct | fare option on one side only | 006, 007, 010 | 18 |
| CFM-08 | RS | Integration | Returned segments outside the requested Cabin/RBD (A18) | 006, 010 | 228 |
| CFM-09 | RQ | Integration | Request cabin: sends "leg 1 Business" where the Test Data is "leg 1 First" | 007, 010, 018 | 4 |
| CFM-10 | RS | Integration | Returned segments outside the requested Cabin/RBD (A18) | 007, 010 | 192 |
| CFM-11 | RS | Integration | Returned segments outside the requested Cabin/RBD (A18) | 018 | 2 |

**How the CFM rows group into findings.**

| Finding | Confirmed rows | Cases | Note |
|---|---|---|---|
| **F1 — Integration requests Economy when Premium Economy is selected (DEF-01)** | CFM-04 (request); CFM-08 (returned segments Economy); the Premium checks' share of CFM-01, CFM-05, CFM-06, CFM-07 | 006, 010 (Premium), 019 | Platform request identical on both branches (cabinClass 2); the NDCGal request carries `CabinClass Type="Economy"`. In 019 (RBD J), Integration then finds no fares (`UNABLE TO FARE QUOTE`) while Direct returns 5 solutions. |
| **F2 — Integration requests Business when First is selected (DEF-02)** | CFM-09 (request); CFM-10, CFM-11 (returned segments Business); the First checks' share of CFM-01, CFM-05, CFM-06, CFM-07 | 007, 010 (First), 018 | Platform request identical (cabinClass 4). In 018/F, Integration finds no fares; in 018/A it returns one Business/A option. |
| **F3 — A Business search returns First-cabin segments on both branches (DEF-06)** | CFM-02 (Integration), CFM-03 (Direct) | 005, 010 (Business) | WY408 + WY603 in RBD P come back as `First`. The two branches agree, so parity holds, but SRCH-10 (Cabin Class filter) does not. |
| **F4 — Flights on one side only with no mechanism identified (DEF-04)** | the Economy checks' share of CFM-01 | 002 (1 flight), 003 (13 combinations) | 002: SV310 + SV560 via RUH, Integration only, read from a live poll. 003: 5 combinations are new pairings of flights Direct also returns; 8 contain a journey Direct never returned. **Confirmed under the approved rule** (SRCH-03 contradicted, no mechanism established). Candidate explanations — the Integration-only modifiers (PC-03, PC-04) or cache-versus-poll timing — are recorded in `comparison.json` (`availabilitySource`, `note`). The reviewer may reclassify. |

## 4. Pending Parity Clarifications

| PC | Group | Mechanism | Open business question | Cases |
|---|---|---|---|---|
| PC-01 | RQ | Search modifier ReturnUpsellFare (OBS-01) | Should the Integration request ask for upsell fares (ReturnUpsellFare="true") when the platform request says isUpSelling=false and the Direct request sends "false"? | 17 |
| PC-02 | RQ | Pricing modifier CurrencyType (OBS-04) | Should the Integration request carry a currency (Direct sends EGP)? Prices are not compared. | 17 |
| PC-03 | RQ | Leg modifier AllowDirectAccess (OBS-03) | Is AllowDirectAccess="true" on the Integration request expected, and does it change availability? | 17 |
| PC-04 | RQ | Search modifier PreferCity on origin/destination (OBS-02) | Should the Integration request set city-level airport preference that the Direct request does not? | 17 |
| PC-05 | RS | P-UPSELL — extra fare options on the side that requested upsell (OBS-01, DEF-03) | Should the Integration path return upsell fare options that the Direct path does not request? | 7 |

- PC-01 to PC-04 appear in the request of **every** parity case (17 of 17, both legs where Multi-City). They never fail an assertion; A10 records both values and the evidence path for each.
- PC-05 (P-UPSELL) explains every extra Integration fare option on a matched flight in 002, 003, 004, 005, 015 and 020, plus the Economy and Business checks of 010.
- No new mechanism was needed: every response difference is either Confirmed, P-UPSELL, or a consequence of F1/F2. P-AIRPORT and P-CEILING did not occur (no response had exactly 200 solutions; no Integration-only flight used another airport).

## 5. Defect write-ups

### F1 — Integration path requests Economy when Premium Economy is selected
- **Severity / Priority:** High / P1 · **Requirement:** SRCH-02, SRCH-10, CSP-02 · **Cases:** TC-GCSP-006, 010 (Premium), 019 · **Related:** DEF-01 (run-001).
- **Steps:** Flight Search on branch `NDC1_Ahmed Ayman (BRN287)`, CAI→DXB 18/11/2026, 1 Adult, Cabin Class Premium Economy → Check Supplier → NDCGal / NdcGalileoSTG EGY → Check.
- **Expected:** the supplier request carries Premium Economy, as the Direct request does.
- **Actual:** the supplier request carries `CabinClass Type="Economy"`; the response returns Economy fares only (228 segments outside the requested cabin across 006/010). The platform request is `cabinClass: 2` on both branches.
- **Evidence:** `artifacts/C006/A.supplierRequest.redacted.xml`, `artifacts/C006/B.supplierRequest.redacted.xml`, `artifacts/C006/comparison.json`, screenshots `artifacts/C006/A.png`, `B.png`.

### F2 — Integration path requests Business when First is selected
- **Severity / Priority:** High / P1 · **Requirement:** SRCH-02, SRCH-10, CSP-02 · **Cases:** TC-GCSP-007, 010 (First), 018 · **Related:** DEF-02 (run-001).
- **Steps:** as F1 with Cabin Class First Class (and RBD F or A for 018).
- **Expected:** the supplier request carries First.
- **Actual:** it carries `CabinClass Type="Business"`; Business fares come back (192 + 2 segments outside the requested cabin), or no fares for RBD F (`UNABLE TO FARE QUOTE`). The platform request is `cabinClass: 4` on both branches.
- **Evidence:** `artifacts/C007/*`, `artifacts/C018_F/*`, `artifacts/C018_A/*`.

### F3 — Business search returns First-cabin segments (both branches)
- **Severity / Priority:** Medium / P2 · **Requirement:** SRCH-10 · **Cases:** TC-GCSP-005, 010 (Business) · **Related:** DEF-06 (run-001).
- **Actual:** fare option WY408 + WY603, RBD P, cabin `First`, in a Business search, on both Integration and Direct. Parity holds; the cabin filter does not.
- **Evidence:** `artifacts/C005/comparison.json` → `rs.filter.outside`.

### F4 — Flights returned on one branch only (no mechanism identified)
- **Severity / Priority:** Medium / P2 · **Requirement:** SRCH-03, CSP-03 · **Cases:** TC-GCSP-002, 003 · **Related:** DEF-04 (run-001).
- **Actual:** 002 — 1 Integration-only flight (SV310 + SV560); 003 — 13 Integration-only combinations (5 re-pairings, 8 with a journey Direct never returned). No P-AIRPORT or P-CEILING condition holds.
- **Note:** classified Confirmed by the approved rule; candidate explanations are recorded but not established. Needs Integration-team input before it is raised or reclassified.
- **Evidence:** `artifacts/C002/comparison.json`, `artifacts/C003/comparison.json` → `rs.flightsOnly`.

### Execution error — Integration supplier communication error (3 Blocked cases)
- **Cases:** TC-GCSP-012 (check C), 016, 021. **Actual:** `errorMessage` "status-code:409 Conflict-500-Non-Specified Internal Communication Error: WAS-UNIVERSALAPI-33890-001.PP.TVLPORT.COM" with a SOAP fault 500. Direct answered normally within the same minute.
- **Observation:** every Integration `errorMessage` in this run carries the same `correlationId`, so it may not identify a single call.
- **Evidence:** `artifacts/C012_C/A.capture.json`, `artifacts/C016/A.capture.json`, `artifacts/C021/A.capture.json` (+ redacted request/response).

## 6. Evidence

- Every check: redacted supplier request and full response per branch, supplier config, capture record (read-backs, platform request, HTTP status, SHA-256 of raw payloads), normalized model and comparison — `manual_execution/artifacts/<check>/`.
- 120 sensitive values redacted (CMP-13); leak scan: 0 leaks across all saved files. Screenshots for non-Passed checks only (48).
- Detailed records: `ManualExecutionResults.md` (§3.1 assertions, §3.2 RQ/RS groups, §3.3 mismatches, §3.4 PC register, §4 evidence inventory). CSV: `ManualTestResults.csv`.

## 7. Limitations

- Nothing is judged at the Integration Layer → Galileo boundary (BND-03, not observable). Payloads are back-end reported (BND-04).
- Live availability: one-side-only flights with no established mechanism stay Confirmed under the approved rule; their availability source is recorded for review.
- Throwaway Playwright control script (scratchpad), not MCP/BrowserDriver.

## 8. Recommendations

1. **Fix the NDCGal cabin mapping** (F1, F2): Premium Economy and First must reach the Integration Layer as selected. Then re-run TC-GCSP-006, 007, 010, 018, 019.
2. **Re-run the 3 Blocked cases** (012, 016, 021) in a new cycle (`.rerun-1`) after checking the Integration Layer's connection to Travelport PP. Headed/Headless to be confirmed before that run.
3. **Decide PC-01 to PC-05** with the business and Integration teams — especially PC-01: the platform asks `isUpSelling: false`, yet the Integration request sends `ReturnUpsellFare="true"`.
4. **Review F4** (002, 003): confirm whether the Integration-only flights are expected (for example because of AllowDirectAccess) or a defect; reclassify if a mechanism is established.
5. **Stage 3:** TC-GCSP-013's A12 contradicts its own Expected Result (the same error on both is acceptable). Propose a wording change through the normal Stage 3 process.
