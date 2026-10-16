# Requirement Traceability Matrix — search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch

| Field | Value |
|---|---|
| Module | `search-cabin-class-rbd/galileo` |
| Produced by run | `search-cabin-class-rbd-run-001__2026-10-11_10-20-20__Targeted__GalileoFeatures-IntegrationVsDirectSearch` |
| Revision | 2 (2026-10-11 — suite rev 2: verified data, RBD/Multi-City coverage, 3 cases retired) |
| Project Context | `suppliers/galileo/context/ProjectContext.md` (rev 2, Approved) |
| Run Scope Type / Run Type | Feature / Custom Scope |
| Test Cases Traced | 18 active (TC-GSRCH-008, 009, 014 retired) |
| Generated | 2026-10-11 |
| Status | Pending Review |

No Findings exist (Stage 2 was not run), so every Finding and Evidence Reference is `N/A`. No User Story with enumerated Acceptance Criteria exists, so every Acceptance Criteria Reference is `N/A`.

## 1. Matrix

| Test Case ID | Requirement Reference | Discovery Reference | Finding Reference | Evidence Reference | Acceptance Criteria Reference | Run Scope Reference | Risk Level | Risk Statement | Validation Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-GSRCH-001 | SRCH-01 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | High | A branch or supplier mix-up invalidates every parity result | Covered |
| TC-GSRCH-002 | SRCH-02…09, CMP-01…03, CMP-06, CMP-07 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | High | Baseline parity; validation already showed a fare-option count difference | Covered |
| TC-GSRCH-003 | SRCH-02…09, CMP-01…03, CMP-06 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | High | Round-trip pairing; validation showed combinations present on one side only | Covered |
| TC-GSRCH-004 | SRCH-02…09, CMP-03 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | Medium | Passenger-type mapping per segment | Covered |
| TC-GSRCH-005 | SRCH-02…09, SRCH-07 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | High | Business mapping; validation showed a cabin name difference (FirstClass vs First) | Covered |
| TC-GSRCH-006 | SRCH-02…09, SRCH-07 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | High | Validation suggests Integration does not apply Premium Economy | Covered |
| TC-GSRCH-007 | SRCH-02…09, SRCH-07 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | High | Validation suggests Integration does not apply First Class | Covered |
| TC-GSRCH-010 | SRCH-10, CMP-05 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | High | Cabin filter correctness, judged only on non-empty results | Covered |
| TC-GSRCH-011 | SRCH-11, SRCH-03, CMP-05 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | High | Economy RBD filter (Q, K, Y) | Covered |
| TC-GSRCH-012 | SRCH-11, SRCH-03, CMP-05 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | High | Business RBD filter (J, C) | Covered |
| TC-GSRCH-013 | SRCH-02, SRCH-03, SRCH-07, SRCH-08 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | Low | Undefined combination; parity only | Covered |
| TC-GSRCH-015 | SRCH-02…09, CMP-03 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | Medium | Second route for data diversity | Covered |
| TC-GSRCH-016 | SRCH-02…09, CMP-03, CMP-06 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | High | Multi-City trip type (SRCH-02 Trip Type) | Covered |
| TC-GSRCH-017 | SRCH-02, SRCH-03, SRCH-07, SRCH-08, SRCH-10 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | Medium | Per-leg cabin in Multi-City | Covered |
| TC-GSRCH-018 | SRCH-11, SRCH-03, CMP-05 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | High | First Class RBD filter; validation suggests Integration returns no First fares | Covered |
| TC-GSRCH-019 | SRCH-11, SRCH-03, CMP-05 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | Medium | Premium Economy RBD filter | Covered |
| TC-GSRCH-020 | SRCH-11, SRCH-03, CMP-05 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | Low | Multiple RBD selection | Covered |
| TC-GSRCH-021 | SRCH-11, SRCH-08, SRCH-03 | Not verified in Discovery (Stage 2 not run); test data validated live 2026-10-11 — CoverageReport §13 | N/A | N/A | N/A | Feature/Custom — Galileo Integration vs Direct, search only | Medium | Per-leg RBD in Multi-City | Covered |

## 2. Retired cases

| Test Case ID | Reason |
|---|---|
| TC-GSRCH-008 | Merged — every parity case compares every result (CMP-06) |
| TC-GSRCH-009 | Merged — every parity case compares RBD per fare option × passenger type × segment |
| TC-GSRCH-014 | Out of focus — not related to Cabin Class, RBD or result parity (reviewer refinement #4) |
