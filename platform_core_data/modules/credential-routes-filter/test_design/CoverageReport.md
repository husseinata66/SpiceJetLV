# Coverage Report — credential-routes-filter-run-001

| Field | Value |
|---|---|
| Module | `credential-routes-filter` |
| Produced by run | `credential-routes-filter-run-001__2026-10-17_11-35-16__UserStory__CredentialRoutesFilter-Update(US62039,US60737)` |
| Generated | 2026-10-17 |
| Status | **Approved** — Ahmed Ayman, 2026-10-17 (8 FlyNas rewrites re-approved the same day) |

## 1. Run Scope

| Field | Value |
|---|---|
| Run Scope Type / Source | User Story / pasted text — US 62039 (AC 1) and US 60737 (AC 2) |
| Run Type | User Story — enhancement, CRUD area Update |
| Project Context | `modules/credential-routes-filter/context/ProjectContext.md` — Revision 3, Approved |
| Strategy | §16 "User Story": at least one case per acceptance criterion, plus the regression guards and user decisions recorded in the Project Context. No wider coverage of the screen |
| Build note | The change is **not deployed** yet. Cases describe the behaviour after deployment |

## 2. Requirements Covered

| Category | Count |
|---|---|
| Covered | 13 |
| Partially Covered | 0 |
| Out-of-Scope | 1 (AC 4 — Deprecation Flags, deferred `PO-CRF-5`) |
| Unknown / Unassessed | 0 |

**Requirement coverage: 13 / 13 in-scope requirements covered = 100%.** Two of them (`ASM-CRF-4`, OQ-D6) are covered only by exploratory cases, and one (`PO-CRF-14`) only by an assumption-based case.

## 3. Coverage Matrix

| Requirement ID | Test Case ID(s) | Status |
|---|---|---|
| AC-1 | TC-CRF-001, 003, 004, 005, 006, 007, 008, 010 | Covered |
| AC-2 | TC-CRF-014, 015, 016, 017, 022, 024, 025 | Covered |
| PO-CRF-10 | TC-CRF-002 | Covered |
| PO-CRF-12 | TC-CRF-018, 019, 020 | Covered |
| PO-CRF-13 | TC-CRF-021 (+ 014 … 020 Admin) | Covered |
| PO-CRF-14 | TC-CRF-022 | Covered (assumption-based) |
| PO-CRF-15 | TC-CRF-011, 006 | Covered |
| PO-CRF-16 | TC-CRF-002, 009, 010 | Covered |
| US2-CRUD | TC-CRF-012, 013 | Covered |
| US2-SP | TC-CRF-023, 024 | Covered |
| US1-AND | TC-CRF-026 | Covered |
| ASM-CRF-4 | TC-CRF-024 | Covered (exploratory) |
| OQ-D6 | TC-CRF-025 | Covered (exploratory) |
| AC 4 (US 60737) | — | Out-of-Scope (deferred by the user) |

## 4. Business Rules

| Business Rule ID | Rule | Test Case ID(s) | Status |
|---|---|---|---|
| PO-CRF-10 / 16 | Every non-GDS supplier (LCC and "Both") gets the LCC limit | TC-CRF-001, 002 | Covered |
| PO-CRF-15 | "All Airports" counts as one route | TC-CRF-011 | Covered |
| US1-AND | Airport list and Credential Routes Filter combine with AND | TC-CRF-026 | Covered |

## 5. Test Scenarios

**By module:**

| Module | Total | Atomic | Scenario | E2E | Positive | Negative | Exploratory |
|---|---|---|---|---|---|---|---|
| credential-routes-filter | 26 | 24 | 2 | 0 | 14 | 5 (boundary) | 2 |

Regression-tagged: 6 (TC-CRF-003, 008, 012, 013, 023, 026). Assumption-based: 2 (TC-CRF-002, 022).

**By dimension (§7, §17):**

| Dimension / Negative Subtype | Case Count |
|---|---|
| Positive Scenarios | 14 |
| Boundary Values | 5 (TC-CRF-005 … 008, 010) |
| Business Rules | 4 (TC-CRF-002, 009, 011, 026) |
| Error Handling | 2 (TC-CRF-007, 008 — limit message) |
| Regression Impact | 6 |
| Integration Behaviour | 1 (TC-CRF-026) |
| Configuration | 0 — Not Applicable: the stories define no feature flag (AC 4 flags are out of scope) |
| Permissions | 0 — Not Applicable: one Admin account only; the stories define no role boundary |
| Invalid Inputs | 0 — Not Applicable: suppliers, airports and airlines are picked from lists; the stories change no input field |
| Empty Values | 0 — Not Applicable: save checks (no mode, no route) are unchanged by these stories |
| Unicode / Special Characters / Security Inputs | 0 — Not Applicable: no free-text field is touched by the change |
| Timeouts | 0 — Not Applicable: no timeout behaviour is stated; supplier timeouts belong to `master-supplier` |
| Validation Rules | covered by the limit cases; other route checks (duplicate, same O/D) are unchanged and not in the stories |
| Exploratory Recommendations | 2 cases (TC-CRF-024, 025) + §10 |

## 6. Manual Test Cases

| Module | Markdown | Excel | Case Count |
|---|---|---|---|
| credential-routes-filter | `test_design/TestCases_CredentialRoutesFilter.md` | `test_design/TestCases_CredentialRoutesFilter.xlsx` | 26 |
| **Total** | | | **26** |

Counts agree across the suite header (26), the export tool (26) and the Traceability Matrix (26 rows).

## 7. Assumptions

| Assumption ID (Project Context) | Assumption | Test Case ID | Tag |
|---|---|---|---|
| PO-CRF-16 / D-ASM-5 | "Both" suppliers count as LCC and get 150 | TC-CRF-002 | Assumption-based |
| ASM-CRF-5 / PO-CRF-14 | Several airlines are sent together (Likely) | TC-CRF-022 | Assumption-based |
| ASM-CRF-4 | Post-response filter stays; Blacklist airline form in the request | TC-CRF-024 | Exploratory |
| OQ-D6 | Airline sent for "All Airports" routes | TC-CRF-025 | Exploratory |
| RISK-CRF-2 | Request content not visible in the UI | TC-CRF-014 … 025 (VR-01.1 → Inconclusive without a log) | — |

## 8. Coverage Gaps

| Gap Type | ID | Reason | Smallest Unblocking Prerequisite |
|---|---|---|---|
| ~~Execution prerequisite~~ Resolved | TC-CRF-014 … 025 (A1 / VR-01.1) | The airline in the supplier request is not visible in the UI | `PO-CRF-9` answered: a supplier request log is available (user, 2026-10-17) |
| ~~Execution prerequisite~~ Resolved | TC-CRF-006, 015 … 020, 023 … 026 | They save rules on a shared environment | `PO-CRF-7` answered: create any routes/rules needed on any supplier; LCC data = FlyNas; the user cleans up after the run |
| Execution prerequisite | TC-CRF-021 | No Portal login on this environment | Add a Portal account for an agency using `GalileoLive` |
| Execution prerequisite | all | Change not deployed | Deploy US 62039 / US 60737; the user will send the target environment and credentials |
| Uncovered Findings | — | None. 4 / 4 Findings dispositioned | — |

## 9. Risks

**High / Critical:**

| Risk Level | Test Case ID(s) | Statement |
|---|---|---|
| High | TC-CRF-001, 005, 006, 007, 010 | New LCC limit; routes could be lost on supplier change |
| High | TC-CRF-014 … 017, 021, 023 | Airline-in-request change; no-airline regression |
| High | TC-CRF-014 … 025 | Request content needs `PO-CRF-9` |

**All risks:**

| Risk Level | Count |
|---|---|
| High | 11 cases |
| Medium | 11 cases |
| Low | 4 cases |

## 10. Recommendations

| ID | Recommendation | Rationale |
|---|---|---|
| R-1 | Decide `PO-CRF-9` before execution | Without a request log, every AC 2 "request" assertion is Inconclusive |
| R-2 | Reuse one 150-route LCC rule for TC-CRF-006 and 007, then delete it | Building 150 routes is slow on a shared environment |
| R-3 | Ask the Product Owner about TC-CRF-024 and 025 before execution | Their expected results are not defined |
| R-4 | Consider a later case for Restricted Airlines + airline filter on the same credential | AND logic with Restricted Airlines (US 1 Example 2) is not covered here — it belongs to `master-supplier` |

## 11. Review & Automation

| Column | Pending | Approved | Rejected |
|---|---|---|---|
| **Review** | 0 | 26 | 0 |
| **Automation** | 0 | 0 | 26 |

| Decision | Count | Test Case IDs |
|---|---|---|
| `Review = Approved` — **executable by Stage `4M`** | 26 | TC-CRF-001 … 026 |
| `Review = Rejected` — excluded, reason `Rejected at Review` | 0 | — |
| `Review = Pending` — excluded, reason `Pending Review` | 0 | — |
| `Review = Approved AND Automation = Approved` — **in scope for Stage `4A`** | 0 | — |
| `Review = Approved AND Automation = Rejected` — manual **by decision** | 26 | TC-CRF-001 … 026 (user, 2026-10-17: "there is no need to automate anything till now") |

**Inconsistent pairs:** none.

## 12. Inputs for Both Branches

| Required Input | Present? | Location / Note |
|---|---|---|
| Project Context (Governing) | Yes | `context/ProjectContext.md` Rev 3, Approved |
| Manual Test Suite | Yes | `test_design/TestCases_CredentialRoutesFilter.md` + `.xlsx` (26 cases) |
| Traceability Matrix | Yes | `test_design/TraceabilityMatrix.md` — every case has a specific Requirement and Discovery reference |
| Coverage Report | Yes | this file |
| Discovery / Findings / Evidence | Yes | `discovery/` — cited by section and file |

**Handoff confirmation:** complete for review. Execution is blocked until the change is deployed and `PO-CRF-7` / `PO-CRF-9` are decided — this run was limited to Discovery and Test Design by the user.
