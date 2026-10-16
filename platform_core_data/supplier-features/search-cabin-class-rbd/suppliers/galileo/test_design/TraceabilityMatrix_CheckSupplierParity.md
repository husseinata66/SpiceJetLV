# Requirement Traceability Matrix — Check Supplier Parity — search-cabin-class-rbd-run-002__2026-10-11_15-01-07__Targeted__GalileoFeatures-CheckSupplierParity

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

This matrix covers only the companion suite. The UI Search suite keeps its own `TraceabilityMatrix.md` (run-001), which is not changed. No Findings exist (Stage 2 was not run), so every Finding and Evidence Reference is `N/A`. No User Story with Acceptance Criteria exists, so every Acceptance Criteria Reference is `N/A`.

## 1. Matrix

| Test Case ID | Traces to (UI Search case) | Case type | Requirement Reference | Discovery Reference | Finding Reference | Evidence Reference | Acceptance Criteria Reference | Run Scope Reference | Risk Level | Risk Statement | Validation Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| TC-GCSP-001 | TC-GSRCH-001 | Setup / Configuration | CSP-01 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | High | A branch, supplier or credential mix-up invalidates every parity result | Covered |
| TC-GCSP-002 | TC-GSRCH-002 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05, OBS-06 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | High | Baseline request/response parity; the probe already showed modifier differences (OBS-01..04) | Covered |
| TC-GCSP-003 | TC-GSRCH-003 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | High | Round-trip legs and dates mapped the same way on both requests | Covered |
| TC-GCSP-004 | TC-GSRCH-004 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | Medium | Passenger types and counts (Age vs BookingTravelerRef is representation, OBS-05) | Covered |
| TC-GCSP-005 | TC-GSRCH-005 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | High | Business cabin sent and returned the same way | Covered |
| TC-GCSP-006 | TC-GSRCH-006 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | High | Shows at the request boundary whether Premium Economy is sent (DEF-01) | Covered |
| TC-GCSP-007 | TC-GSRCH-007 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | High | Shows at the request boundary whether First is sent (DEF-02) | Covered |
| TC-GCSP-010 | TC-GSRCH-010 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | High | Cabin Class mapping per selected cabin, four checks | Covered |
| TC-GCSP-011 | TC-GSRCH-011 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | High | Economy RBD (Q, K, Y) sent and applied | Covered |
| TC-GCSP-012 | TC-GSRCH-012 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | High | Business RBD (J, C) sent and applied | Covered |
| TC-GCSP-013 | TC-GSRCH-013 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | Low | Undefined Cabin/RBD combination; parity of outcome only | Covered |
| TC-GCSP-015 | TC-GSRCH-015 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | Medium | Second route; run-001 showed availability moving between searches | Covered |
| TC-GCSP-016 | TC-GSRCH-016 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | High | Multi-City legs mapped the same way | Covered |
| TC-GCSP-017 | TC-GSRCH-017 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | Medium | Per-leg cabin; TC-GSRCH-017 is Flaky in run-001 (ET600) | Covered |
| TC-GCSP-018 | TC-GSRCH-018 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | High | First RBD (F, A); shows whether Integration sends First (DEF-02) | Covered |
| TC-GCSP-019 | TC-GSRCH-019 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | Medium | Premium Economy RBD J; shows whether Integration sends Premium Economy (DEF-01) | Covered |
| TC-GCSP-020 | TC-GSRCH-020 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | Low | Several RBDs in one request | Covered |
| TC-GCSP-021 | TC-GSRCH-021 | Request/Response Parity | CSP-01…04, BND-01…04, CMP-08…13, OBS-01…05 | Not verified in Discovery (Stage 2 not run); Check Supplier capture confirmed by the live probe of 2026-10-11 (Context §2.3) | N/A | N/A | N/A | Feature/Custom — Check Supplier Request/Response Parity, search only | Medium | Partial per-leg RBD; Search was not submitted in run-001 (DEF-08) | Covered |

## 2. Requirement → Test Case

| Requirement | Test Case(s) | How it is checked |
|---|---|---|
| CSP-01 | TC-GCSP-001 … 021 | 001 (A1–A7); A1 in every parity case |
| CSP-02 | TC-GCSP-002 … 021 | A3–A10 |
| CSP-03 | TC-GCSP-002 … 021 | A12–A20 |
| CSP-04 | TC-GCSP-002 … 021 | RQ and RS groups with separate outcomes (suite header) |
| BND-01 | TC-GCSP-002 … 021 | Step 5 (capture of `check-supplier-search`) |
| BND-02 | TC-GCSP-002 … 021 | A2 |
| BND-03 | TC-GCSP-002 … 021 | Rule: nothing is judged at the Integration Layer → Galileo boundary; such an assertion is Inconclusive |
| BND-04 | TC-GCSP-002 … 021 | Rule: evidence is labelled as back-end reported |
| CMP-08 | TC-GCSP-002 … 021 | A9, A10 |
| CMP-09 | TC-GCSP-002 … 021 | A11 |
| CMP-10 | TC-GCSP-002 … 021 | Rule: auth and trace values excluded from parity |
| CMP-11 | TC-GCSP-002 … 021 | A13–A17, A19 |
| CMP-12 | TC-GCSP-002 … 021 | A12; outcome rule (Inconclusive when not observable) |
| CMP-13 | TC-GCSP-002 … 021 | Step 5 (redaction before saving) |
| OBS-01 | TC-GCSP-002 … 021 | A10 (ReturnUpsellFare); A20 (P-UPSELL) |
| OBS-02 | TC-GCSP-002 … 021 | A10 (PreferCity); A20 (P-AIRPORT) |
| OBS-03, OBS-04 | TC-GCSP-002 … 021 | A10 (AllowDirectAccess, CurrencyType) |
| OBS-05 | TC-GCSP-004 and all parity cases | A6, A11 |
| OBS-06 | TC-GCSP-002 | Same scenario as the probe; re-observed, not reused |
