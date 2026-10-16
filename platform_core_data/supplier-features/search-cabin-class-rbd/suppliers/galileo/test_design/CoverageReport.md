# Coverage Report — search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch

| Field | Value |
|---|---|
| Module | `search-cabin-class-rbd/galileo` |
| Produced by run | `search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch` |
| Revision | 2 (2026-10-11 — suite rev 2) |
| Generated | 2026-10-11 |
| Status | Pending Review |

## 1. Run Scope

| Field | Value |
|---|---|
| Run Scope Type / Source | Feature (Supplier Feature) / human intake scope, 2026-10-11 |
| Run Type | Custom Scope — Integration vs Direct parity, search only |
| Project Context | `suppliers/galileo/context/ProjectContext.md` (rev 2, Approved by Ahmed Ayman) |
| Strategy (§16) | Custom Scope: parity across trip types (one-way, round-trip, Multi-City), passenger mix and every Cabin Class; Cabin and RBD filter cases kept separate from parity (CMP-05) |
| Discovery | Not run (human decision). Stage 3 ran **degraded**. Test data was validated live instead (§13). |

## 2. Requirements Covered

| Requirement ID | Summary | Test Case ID(s) |
|---|---|---|
| SRCH-01 | Branch confirmed before each search | TC-GSRCH-001 (plus step 1 of every parity case) |
| SRCH-02 | Identical Search Criteria; Trip Type includes Multi-City | TC-GSRCH-002…007, 013, 015…017 |
| SRCH-03 | Same availability and count | TC-GSRCH-002…007, 011…021 |
| SRCH-04 | Same airlines and flight numbers | TC-GSRCH-002…007, 015…016 |
| SRCH-05 | Same times | TC-GSRCH-002…007, 015…016 |
| SRCH-06 | Same segments, connections, stops | TC-GSRCH-002…007, 015…016 |
| SRCH-07 | Same Cabin Class | TC-GSRCH-002…007, 013, 015…017 |
| SRCH-08 | Same RBD at fare option × passenger type × segment | TC-GSRCH-002…007, 013, 015…017, 021 |
| SRCH-09 | Same baggage information | TC-GSRCH-002…007, 015…017 |
| SRCH-10 | Cabin Class filter (non-empty proof) | TC-GSRCH-010, 017 |
| SRCH-11 | RBD filter (non-empty proof) | TC-GSRCH-011, 012, 018…021 |

| Category | Count |
|---|---|
| Covered | 11 |
| Partially Covered | 0 |
| Out-of-Scope | 0 |
| Unknown / Unassessed | 0 |
| Uncovered | 0 |

**Requirement coverage: 11/11 = 100%** (design coverage, not results).

## 3. Coverage Matrix

| Requirement ID | Test Case ID(s) | Status |
|---|---|---|
| SRCH-01 | TC-GSRCH-001 | Covered |
| SRCH-02 | TC-GSRCH-002…007, 013, 015…017 | Covered |
| SRCH-03 | TC-GSRCH-002…007, 011…021 | Covered |
| SRCH-04…06 | TC-GSRCH-002…007, 015, 016 | Covered |
| SRCH-07 | TC-GSRCH-002…007, 013, 015…017 | Covered |
| SRCH-08 | TC-GSRCH-002…007, 013, 015…017, 021 | Covered |
| SRCH-09 | TC-GSRCH-002…007, 015…017 | Covered |
| SRCH-10 | TC-GSRCH-010, 017 | Covered |
| SRCH-11 | TC-GSRCH-011, 012, 018…021 | Covered |

## 4. Business Rules

| Business Rule ID | Rule | Test Case ID(s) | Status |
|---|---|---|---|
| CMP-01 | Prices, taxes, amounts ignored | All parity cases | Covered |
| CMP-02 | Fare Basis supporting only | **Not observable** on either branch; fare brand name recorded instead | Covered — limitation stated |
| CMP-03 | Match by flight identity, not order | All parity and filter cases | Covered |
| CMP-04 | Every difference documented with evidence from both branches | Stage 4M comparison report | Execution rule |
| CMP-05 | Parity vs filter separate; empty-on-both is Inconclusive for a filter | TC-GSRCH-010…012, 018…021 | Covered |
| CMP-06 | Compare every result, else Inconclusive | All parity cases | Covered |
| CMP-07 | No Passed without evidence | Stage 4M | Execution rule |

## 5. Test Scenarios

| Module | Total | Atomic | Scenario | E2E | Positive | Negative | Exploratory |
|---|---|---|---|---|---|---|---|
| search-cabin-class-rbd/galileo | 18 | 10 | 8 | 0 | 17 | 1 | 0 |

| Dimension / Negative Subtype | Case Count |
|---|---|
| Precondition — branch/supplier | 1 (TC-001) |
| Parity — trip types (one-way ×2 routes, round-trip, Multi-City ×2) | 5 (TC-002, 003, 015, 016, 017) |
| Parity — passenger mix | 1 (TC-004) |
| Parity — each non-Economy cabin | 3 (TC-005, 006, 007) |
| Filter — Cabin Class | 1 (TC-010, 4 cabins) |
| Filter — RBD (Economy Q/K/Y, Business J/C, First F/A, Premium J, Q+K, Multi-City leg) | 6 (TC-011, 012, 018…021) |
| Negative — Cabin/RBD mismatch (parity only) | 1 (TC-013, P4) |
| Boundary / Empty / Unicode / Special / Security / Timeouts | Not Applicable — search-form validation is out of scope; this scope compares results |
| Regression Impact · Permissions · Configuration | Not Applicable — no code change under test; one user; the two branches are the only configuration |

## 6. Manual Test Cases

| Module | Markdown | Excel | Case Count |
|---|---|---|---|
| search-cabin-class-rbd/galileo | `test_design/TestCases_SearchCabinRBD_Galileo.md` | `test_design/TestCases_SearchCabinRBD_Galileo.xlsx` | 18 |
| **Total** | | | **18** |

Counts agree: suite 18 blocks · Matrix 18 active rows (+3 retired) · export 18.

## 7. Assumptions

| Assumption ID (Project Context) | Assumption | Test Case ID | Tag |
|---|---|---|---|
| A-01 | Search page offers Cabin Class and RBD on both branches | All | **Confirmed** 2026-10-11 — Cabin: Economy / Premium Economy / Business / First Class; RBD: multi-select A–Z; per-leg Cabin and RBD in Multi-City |
| A-02 | Live availability can move between the two searches | All parity cases | Searches run at the same time; timestamps recorded |

## 8. Coverage Gaps

| Gap Type | ID | Reason | Smallest Unblocking Prerequisite |
|---|---|---|---|
| Discovery not run | All | Human decision | None — §13 validation replaces it for test data |
| Fare Basis | CMP-02 | Not returned in search results on either branch | None — limitation stated |
| Uncovered Findings | — | No Findings exist | — |

## 9. Risks

| Risk Level | Test Case ID(s) | Statement |
|---|---|---|
| High | TC-GSRCH-001, 002, 003, 005, 006, 007, 010, 011, 012, 016, 018 | Branch/supplier isolation, core parity, cabin and RBD filters — validation already shows likely differences on 002, 003, 006, 007, 018 |
| Medium | TC-GSRCH-004, 015, 017, 019, 021 | Passenger mix, second route, Multi-City per-leg settings |
| Low | TC-GSRCH-013, 020 | Mismatch combination, multi-RBD selection |

| Risk Level | Count |
|---|---|
| High | 11 |
| Medium | 5 |
| Low | 2 |

## 10. Recommendations

- Run TC-GSRCH-001 first. If either branch does not reach its expected supplier, stop.
- During validation, the Integration path looked like it ignored Premium Economy and First Class, and returned more fare options per flight than Direct. These are **not results yet**. They are recorded in §13 only to explain why TC-006, 007 and 018 are P1.

## 11. Review & Automation

| Column | Pending | Approved | Rejected |
|---|---|---|---|
| Review | 18 | 0 | 0 |
| Automation | 18 | 0 | 0 |

Eligible for Stage 4M: 0 until review. Inconsistent pairs: none.

## 12. Inputs for Both Branches

| Needed by 4M / 4A | Present |
|---|---|
| Project Context (Approved) | Yes, rev 2 |
| Manual Test Suite (MD + XLSX) | Yes, 18 active cases, `--check` clean |
| Traceability Matrix | Yes, 18 active rows + 3 retired |
| Coverage Report | This file |
| Discovery / Findings / Evidence | None — Stage 2 not run (declared gap) |

## 13. Test-data validation (2026-10-11, search only, both branches, Headed)

Reviewer refinement #3: routes and dates were checked live before writing positive cases. One search per branch per row, run at the same time. These are **checks on the test data, not test results**. Every case is executed again at Stage 4M.

**Search page facts confirmed:** Booking-Mid Office → Flight Search. Branch is required before the form unlocks. Trip types: One-way, Round-trip, Multi-city. Cabin: Economy, Premium Economy, Business, First Class. RBD: multi-select, `A`–`Z`, the same list for every cabin. Multi-city has its own Cabin and RBD **per leg**. Integration branch supplier: `NDCGal` (credential `NdcGalileoSTG EGY`). Direct branch supplier: `Galileo` (credential `GalileoLiveSTAGING`). Results detail available per **fare option × passenger type × segment** (Cabin, RBD, baggage). Fare Basis: not returned.

| Criteria | Integration | Direct | Usable? |
|---|---|---|---|
| DXB→LHR 18/11/2026 Economy (rev 1 data) | No Flights Found | No Flights Found | **No — replaced** by CAI→DXB |
| CAI→LHR 18/11/2026 Economy | No Flights Found | No Flights Found | No |
| DXB→JFK, DXB→BOM (rev 1 data) | not checked | not checked | **Replaced** — the Integration credential is Egypt-based; CAI routes return content |
| CAI→DXB 18/11/2026 Economy | 34 flights / 64 fare options | 34 flights / 34 fare options | Yes |
| CAI→JED 20/11/2026 Economy | 50 flights | 39 flights | Yes |
| CAI⇄DXB 18/11–25/11 Economy | 109 combinations | 103 combinations | Yes |
| CAI→DXB 2 ADT + 1 CHD + 1 INF | 35 flights | 35 flights | Yes |
| CAI→DXB Business / Premium Economy / First Class | results | results | Yes |
| CAI→DXB Economy + RBD `Q` / `K` / `Y` | results | results | Yes |
| CAI→DXB Business + RBD `J` / `C` | results | results | Yes |
| CAI→DXB First Class + RBD `F` / `A` | 0 / 1 | 10 / 10 | Yes (Direct has content) |
| CAI→DXB Economy + RBD `J` | 0 | 0 | Used only for the parity-only case TC-013 |
| Multi-City CAI→DXB 18/11 + DXB→JED 22/11 (Economy; and leg 2 Business) | results | results | Yes |

**Data changes recorded:** DXB→LHR → CAI→DXB (all one-way cases); DXB⇄LHR → CAI⇄DXB (round-trip); CAI→DXB 20/11 → CAI→DXB 18/11 (mixed passengers); DXB→JFK → CAI→DXB (Business); new second route CAI→JED 20/11; RBD set widened from Y, J to Q, K, Y, J, C, F, A, Premium J, and Q+K.
