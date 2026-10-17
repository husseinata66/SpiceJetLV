# Requirement Traceability Matrix — credential-routes-filter-run-001

| Field | Value |
|---|---|
| Module | `credential-routes-filter` |
| Produced by run | `credential-routes-filter-run-001__2026-10-17_11-35-16__UserStory__CredentialRoutesFilter-Update(US62039,US60737)` |
| Suite | `test_design/TestCases_CredentialRoutesFilter.md` — 26 cases, Revision 1 |
| Project Context | Revision 3, Approved |
| Generated | 2026-10-17 |

Run Scope Reference for every row: **User Story — US 62039, US 60737**.
AC 1 = US 62039 AC 1: *"maximum number of routes supported for LCC suppliers will be increased from 50 to 150"*.
AC 2 = US 60737 AC 2: *"configured airline will be included in the search request before it is sent to the supplier"*.
`AE` = `discovery/CredentialRoutesFilter_AddEdit.md` · `LI` = `discovery/CredentialRoutesFilter_List.md` · `QA` = `discovery/QA_Assessment_Report.md`.

## 1. Test Case Traceability

| Test Case ID | Requirement Reference | Discovery Reference | Finding Reference | Evidence Reference | Acceptance Criteria Reference | Run Scope Reference | Risk Level | Risk Statement | Validation Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-CRF-001 | AC-1 | AE §5 (LCC "/ 50" baseline), §5.1 | N/A | N/A | AC 1 | User Story — US 62039, US 60737 | High | Core change of US 62039 | Baseline seen; new value not deployed |
| TC-CRF-002 | PO-CRF-16, PO-CRF-10 | QA §5 (Both-type rows), AE §5.1 | N/A | N/A | AC 1 | User Story — US 62039, US 60737 | Medium | 9 Both suppliers may be left at 50 | Baseline seen (Both → 50) |
| TC-CRF-003 | AC-1 | AE §5 (GDS "/ 150") | N/A | N/A | AC 1 | User Story — US 62039, US 60737 | Medium | GDS limit must not change | Validated in Discovery |
| TC-CRF-004 | AC-1 | LI §5 (AirArbia rule, 1 route); AE §6 | N/A | N/A | AC 1 | User Story — US 62039, US 60737 | Medium | Existing rules must get the new limit | Baseline seen ("1 / 50") |
| TC-CRF-005 | AC-1 | AE §5.1 (max routes rule) | N/A | N/A | AC 1 | User Story — US 62039, US 60737 | High | Old limit + 1 is the first new value | Not deployed |
| TC-CRF-006 | AC-1 | AE §5.1 (save checks, success message) | N/A | N/A | AC 1 | User Story — US 62039, US 60737 | High | Upper boundary must save | Not deployed; needs `PO-CRF-7` |
| TC-CRF-007 | AC-1 | AE §5.1 ("Maximum {max} routes reached.") | N/A | N/A | AC 1 | User Story — US 62039, US 60737 | High | Limit must still be enforced | Message read from code, not seen live |
| TC-CRF-008 | AC-1 | AE §5.1 | N/A | N/A | AC 1 | User Story — US 62039, US 60737 | Low | GDS boundary regression | Message read from code |
| TC-CRF-009 | PO-CRF-16 | AE §5.1 (Supplier Change dialog) | N/A | N/A | N/A | User Story — US 62039, US 60737 | Medium | Dialog would show a wrong limit | Dialog read from code |
| TC-CRF-010 | PO-CRF-16, AC-1 | AE §5.1 (routes over 50 removed) | N/A | N/A | AC 1 | User Story — US 62039, US 60737 | High | Routes could be lost on supplier change | Behaviour read from code |
| TC-CRF-011 | PO-CRF-15 | AE §4 (Origin/Destination), §5.1 ("All" = -11) | FINDING-002 | `FINDING-002_AllAirportsWildcardOption/origin_all_airports.png` | N/A | User Story — US 62039, US 60737 | Low | Limit counting with wildcard routes | Option seen live; counting per user |
| TC-CRF-012 | US2-CRUD | AE §5 (Airlines absent for LCC) | N/A | N/A | N/A | User Story — US 62039, US 60737 | Medium | Airlines field must stay GDS-only | Validated in Discovery |
| TC-CRF-013 | US2-CRUD | AE §4, §7 (`gds-airlines?status=1`) | N/A | N/A | N/A | User Story — US 62039, US 60737 | Low | Airlines list source | Validated in Discovery |
| TC-CRF-014 | AC-2 | LI §5 (Galileo rule CAI→JED, EY) | N/A | N/A | AC 2 | User Story — US 62039, US 60737 | High | Core change of US 60737 | Not deployed; request not visible in UI |
| TC-CRF-015 | AC-2 | AE §5 (Amadeus GDS-type) | N/A | N/A | AC 2 | User Story — US 62039, US 60737 | High | Core change per supplier | Not deployed |
| TC-CRF-016 | AC-2 | AE §5 (Sabre GDS-type) | FINDING-001 | `FINDING-001_GdsSupplierNamesDifferFromStory/supplier_list_sabre.png` | AC 2 | User Story — US 62039, US 60737 | High | Core change per supplier; name mapping | Not deployed |
| TC-CRF-017 | AC-2 | AE §5 (TravelportNdc GDS-type) | N/A | N/A | AC 2 | User Story — US 62039, US 60737 | High | Core change per supplier | Not deployed |
| TC-CRF-018 | PO-CRF-12 | AE §5 (NDCGal GDS-type) | N/A | N/A | N/A | User Story — US 62039, US 60737 | Medium | AC 2 widened by user | Not deployed |
| TC-CRF-019 | PO-CRF-12 | AE §5 (AmadeusNDC GDS-type) | FINDING-001 | `FINDING-001_GdsSupplierNamesDifferFromStory/supplier_list_ndc.png` | N/A | User Story — US 62039, US 60737 | Medium | AC 2 widened by user; name mapping | Not deployed |
| TC-CRF-020 | PO-CRF-12 | AE §5 (NDCsbr GDS-type) | FINDING-001 | `FINDING-001_GdsSupplierNamesDifferFromStory/supplier_list_ndc.png` | N/A | User Story — US 62039, US 60737 | Medium | AC 2 widened by user; name mapping | Not deployed |
| TC-CRF-021 | PO-CRF-13 | Not independently verified in Discovery | N/A | N/A | AC 2 | User Story — US 62039, US 60737 | High | Portal path untested; no Portal login configured | Not deployed |
| TC-CRF-022 | PO-CRF-14, AC-2 | AE §5.1 (Airlines multi-select, max 50) | N/A | N/A | AC 2 | User Story — US 62039, US 60737 | Medium | Multi-airline request form is Likely only | Assumption-based |
| TC-CRF-023 | US2-SP | LI §5 (existing rules) | N/A | N/A | N/A | User Story — US 62039, US 60737 | High | No-airline rules must keep working | Search not exercised in Discovery |
| TC-CRF-024 | US2-SP, ASM-CRF-4 | QA §8 (`ASM-CRF-4`) | N/A | N/A | AC 2 | User Story — US 62039, US 60737 | Medium | Blacklist request form undefined | Exploratory |
| TC-CRF-025 | OQ-D6 | AE §5.1 ("All" = -11); QA §8 (OQ-D6) | FINDING-002 | `FINDING-002_AllAirportsWildcardOption/origin_all_airports.png` | AC 2 | User Story — US 62039, US 60737 | Low | AC 2 with wildcard routes undefined | Exploratory |
| TC-CRF-026 | US1-AND | Not independently verified in Discovery | N/A | N/A | N/A | User Story — US 62039, US 60737 | Medium | AND logic with the Airport list | Search not exercised in Discovery |

## 2. Requirement → Test Case Roll-Up

| Requirement ID | Requirement Summary | Test Case ID(s) | Coverage Status |
|---|---|---|---|
| AC-1 | US 62039 AC 1 — LCC route limit 50 → 150, aligned with GDS (Project Context §2) | TC-CRF-001, 003, 004, 005, 006, 007, 008, 010 | Covered |
| AC-2 | US 60737 AC 2 — airline in the supplier request: Galileo, Travelport NDC, Sabre ATPCO, Amadeus (Project Context §2) | TC-CRF-014, 015, 016, 017, 022, 024, 025 | Covered |
| PO-CRF-10 | LCC = every non-GDS supplier | TC-CRF-002 | Covered |
| PO-CRF-12 | AC 2 applies to every GDS supplier (adds NDCGal, Amadeus NDC, Sabre NDC) | TC-CRF-018, 019, 020 | Covered |
| PO-CRF-13 | AC 2 applies in Admin **and** Portal booking | TC-CRF-021 (Portal); 014 … 020 (Admin) | Covered |
| PO-CRF-14 | Several airlines sent together (Likely) | TC-CRF-022 | Covered (assumption-based) |
| PO-CRF-15 | "All Airports" counts as one route; no approval step | TC-CRF-011; TC-CRF-006 (saved rule opens directly, no approval) | Covered |
| PO-CRF-16 | Supplier Change dialog removed; "Both" counts as LCC | TC-CRF-002, 009, 010 | Covered |
| US2-CRUD | T3087 regression guard — Airlines field for GDS only, active airlines | TC-CRF-012, 013 | Covered |
| US2-SP | T3087 regression guard — no-airline rules unchanged; Blacklist excludes airlines | TC-CRF-023, 024 | Covered |
| US1-AND | AND logic with the Airport list (Project Context §3.1, `RISK-CRF-1`) | TC-CRF-026 | Covered |
| ASM-CRF-4 | Post-response filter / Blacklist request form | TC-CRF-024 | Covered (exploratory) |
| OQ-D6 | AC 2 for "All Airports" routes | TC-CRF-025 | Covered (exploratory) |

## 3. Finding Disposition

| Finding ID | Category | Severity | Disposition | Test Case ID(s) / Reason |
|---|---|---|---|---|
| FINDING-001 | Observation | N/A | Documented exception | Rejected — supplier names on this environment are intended. The agreed mapping is used as test data in TC-CRF-016, 019, 020 |
| FINDING-002 | Observation | N/A | Documented exception | Rejected — "All Airports" is intended. Its open parts are tested by TC-CRF-011 (counting) and TC-CRF-025 (exploratory, AC 2) |
| FINDING-003 | UX Issue | Low | Documented exception | Rejected — explained: Cancel goes to the previous page. No test needed |
| FINDING-004 | Test Gap | N/A | Documented exception | Not a product claim. The gap it records is closed after deployment by TC-CRF-005 … 008 and 014 … 025 |

## 4. Risk Register

| Risk Level | Test Case ID(s) | Statement | Source |
|---|---|---|---|
| High | TC-CRF-001, 005, 006, 007, 010 | The new LCC limit is the core of US 62039; routes could be lost on supplier change | AC-1, PO-CRF-16 |
| High | TC-CRF-014 … 017, 021, 023 | The airline-in-request change is the core of US 60737; no-airline rules must not regress | AC-2, US2-SP |
| High | TC-CRF-014 … 025 | The request content is not visible in the UI — needs `PO-CRF-9` | `RISK-CRF-2` |
| Medium | TC-CRF-002, 003, 004, 009, 012, 018 … 020, 022, 024, 026 | Both suppliers, widened supplier list, assumption-based multi-airline, AND logic | PO-CRF-12/14/16, `RISK-CRF-1` |
| Low | TC-CRF-008, 011, 013, 025 | Regression and wildcard edge cases | — |
