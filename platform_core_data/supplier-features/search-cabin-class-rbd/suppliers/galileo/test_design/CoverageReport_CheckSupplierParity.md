# Coverage Report — Check Supplier Parity — search-cabin-class-rbd-run-002__2026-10-11_15-01-07__Targeted__GalileoFeatures-CheckSupplierParity

| Field | Value |
|---|---|
| Module | `search-cabin-class-rbd/galileo` |
| Produced by run | `search-cabin-class-rbd-run-002__2026-10-11_15-01-07__Targeted__GalileoFeatures-CheckSupplierParity` |
| Revision | 1 (2026-10-11 — companion to `TestCases_SearchCabinRBD_Galileo_CheckSupplierParity.md` rev 1) |
| Project Context | `suppliers/galileo/context/ProjectContext.md` (rev 3, Approved) |
| Run Scope Type / Run Type | Feature / Custom Scope — Check Supplier Request/Response Parity |
| Test Cases Traced | 18 (1 Setup / Configuration · 17 Check Supplier Request/Response Parity) |
| Generated | 2026-10-11 |
| Status | Approved |

Design coverage, not results. The UI Search suite's `CoverageReport.md` (run-001) is not changed.

## 1. Run Scope

Check Supplier Request/Response Parity between the Galileo **Integration** branch (`NDC1_Ahmed Ayman (BRN287)`, NDCGal) and the **Direct** branch (`ahmed ayman (BRN632)`, Galileo). Same 18 scenarios and Test Data as the UI Search suite. Check Supplier only, with no booking, hold, payment or ancillary.

## 2. Requirements Covered

| Group | IDs | Status |
|---|---|---|
| Check Supplier parity | CSP-01 … CSP-04 | Covered |
| Capture boundaries | BND-01 … BND-04 | Covered (BND-03 and BND-04 as rules applied to every case) |
| Comparison rules | CMP-08 … CMP-13 | Covered |
| Observations | OBS-01 … OBS-06 | Covered as items to re-observe, not as confirmed causes |

**Design coverage: 20 of 20 rev 3 requirements and observations covered.** The full mapping is in `TraceabilityMatrix_CheckSupplierParity.md` §2.

## 3. Case types

| Case type | Cases | Count |
|---|---|---|
| Setup / Configuration | TC-GCSP-001 | 1 |
| Check Supplier Request/Response Parity | TC-GCSP-002 … 007, 010 … 013, 015 … 021 | 17 |

Every parity case has 20 assertions: Setup/Boundary A1–A2, Request A3–A11, Response A12–A20. TC-GCSP-001 has 7. There are 347 in total, and all pass the platform's assertion contract check.

## 4. Outcome rules (from the suite header)

- Each difference is **Confirmed Functional Mismatch** (contradicts approved Test Data or an approved requirement), **Pending Parity Clarification** (a genuine business difference whose expected behaviour is not established), or **Representation Only** (equivalent business meaning).
- P-UPSELL, P-AIRPORT and P-CEILING are known Pending mechanisms. A new Pending item must name its mechanism, its open business question and why no requirement decides it.
- Search-modifier differences are documented in A10 with both values and evidence, and are never classified as functional defects just because they differ.
- RQ and RS outcomes are separate. A case is Passed only with no Confirmed and no Pending differences.

## 5. Test data

All 98 Test Data rows are copied unchanged from `TestCases_SearchCabinRBD_Galileo.md` (checked by script). TC-GSRCH-008, 009 and 014 are retired and have no companion.

## 6. Assumptions

- A-03 (Context): Check Supplier uses the same request path as Search. This is supported by one probe scenario only.
- The capture hosts in A2 are the ones seen in the probe on 2026-10-11.

## 7. Coverage gaps

- The Integration Layer → Galileo request and response cannot be observed (BND-03). This gap is declared; it is not covered by any case.
- Stage 2 (Discovery) was not run, by agreement.

## 8. Design issues and decisions

| ID | Issue | Decision |
|---|---|---|
| DI-1 | Outcome classes for this run: Confirmed Functional Mismatch (contradicts approved Test Data or an approved requirement), Pending Parity Clarification (a genuine business difference whose expected behaviour is not established), Representation Only (equivalent business meaning). P-UPSELL, P-AIRPORT and P-CEILING are known mechanisms, not an exhaustive list. | Decided by Ahmed Ayman, 2026-10-11: accepted as test-design rules for this run. No Project Context rev 4. |
| DI-2 | P-CEILING: one side returned exactly 200 solutions. That does not prove truncation. | Decided: stays Pending Parity Clarification. |
| DI-3 | A case with no failed assertion but unresolved Pending items. Checked against the Run Manager (executionHistory.buildHistory) with a scratchpad fixture: a recorded Inconclusive with verified assertions stays Inconclusive, with no conflict. A separate group-outcome table is not read as a results or assertion table. Limitation: the Run Manager has no structured "Pending" status, so the reason is free text and PC IDs live in the QA Report. | Decided: no forced Passed or Failed. Recorded as Inconclusive with a "Pending Parity Clarification:" reason, a group-outcome table, and PC IDs in the QA Report. A structured status would need a platform change (not proposed for now). |
| DI-4 | TC-GCSP-021: Check Supplier may produce no request for a partial Multi-City RBD. | Decided: capture the evidence, record A2–A20 as Not checked and the case as Inconclusive, and infer no value. |
| DI-5 | 24 Check Supplier calls per branch (48 in total). | Decided: acceptable, subject to the execution preflight and a Headed/Headless confirmation. |

## 9. Review & Automation

Review: 18 Approved (Ahmed Ayman, 2026-10-11) · Automation: 18 Pending.
