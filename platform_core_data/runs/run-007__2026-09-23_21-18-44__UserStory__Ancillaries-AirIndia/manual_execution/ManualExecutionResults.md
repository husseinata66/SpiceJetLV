# Manual Execution Results — run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia

## 1. Execution Metadata

| Field | Value |
|---|---|
| Execution ID | STAGE4M-ANCILLARIES-AIRINDIA-RUN007 |
| Run Folder | `run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia` |
| Run Scope Type / Run Type | Feature / User Story — `scopeFamily: "supplier-feature"`, `feature: "ancillaries"`, `supplier: "air-india"` |
| Environment | Staging — Admin `ANCILLARIES_STG` (`http://192.168.1.213`) and Portal `STG_PORTAL` (`http://192.168.1.213:9500`) |
| Target URL | `http://192.168.1.213` (Admin) / `http://192.168.1.213:9500` (Portal) |
| Role(s) used | Admin (Branch BRN297, `NDC2_Ahmed Alhussieny`) · Portal Agency `AGN9808` |
| Started | 2026-09-28, ~19:00 UTC (TC-ANC-002, first booking) |
| Ended | 2026-10-03, ~00:07 UTC (TC-ANC-015, last live checkpoint) |
| Test Suites executed | `platform_core_data/supplier-features/ancillaries/suppliers/air-india/test_design/TestCases_Ancillaries_AirIndia.md` (rev 7, Approved), `TraceabilityMatrix.md` (rev 5), `CoverageReport.md` |
| Browser mode | Headed (Playwright MCP, `.mcp.json` without `--headless`) throughout — this stage's required mode (§11.1), confirmed with the user at the start of this run |
| Execution Safety policy | `ndc-admin-portal-stg`, `policyVersion: 2`, `policyHash: sha256:28fd9c73b561997058e000dcd32079d5` — `BOOK`/`PAYMENT`/`UPDATE`/`WALLET_CHARGE` on `SelfCreated` bookings → `Allowed`, approved by Ahmed Alhussieny 2026-09-28 (`metadata/SafetyAuthorizations.json`) |

## 2. Result Totals

| Status | Count |
|---|---|
| Passed | 24 |
| Failed | 1 |
| Blocked | 0 |
| Skipped | 0 |
| Not Executed | 0 |
| Inconclusive | 1 |
| **Executable scope** (`Review = Approved`) | **26** |
| Excluded — Pending Review | 1 |
| Excluded — Rejected at Review | 0 |
| **Suite total** | **27** |

Pass rate (of executable scope): 24/26 = **92.3%**. Authorized coverage: 26/27 = **96.3%**.

## 3. Per-Test Results

| Test Case ID | Module | Status | Execution Time | Reason (non-Passed) | Evidence Refs |
|---|---|---|---|---|---|
| TC-ANC-001 | ancillaries/air-india | Passed | 2026-10-03 ~23:35–23:36 UTC | — | `artifacts/TC-ANC-001/` |
| TC-ANC-002 | ancillaries/air-india | Passed | 2026-09-28 ~19:00–19:37 UTC + 2026-09-29 ~12:51–12:58 UTC | — | `artifacts/TC-ANC-002/` |
| TC-ANC-003 | ancillaries/air-india | Passed | 2026-09-29 ~14:18–14:43 UTC (blocked attempt) · 2026-09-29 ~15:05–15:43 UTC (attempt 2, abandoned) · 2026-09-30 ~14:22–14:40 UTC (attempt 3, record) | — | `artifacts/TC-ANC-003/` |
| TC-ANC-004 | ancillaries/air-india | Passed | 2026-09-30 ~15:17–15:50 UTC | — | `artifacts/TC-ANC-004/` |
| TC-ANC-005 | ancillaries/air-india | Passed | 2026-10-01 ~13:14–14:31 UTC | — | `artifacts/TC-ANC-005/` |
| TC-ANC-006 | ancillaries/air-india | Passed | 2026-10-03 (desk review of TC-ANC-002 evidence) | — | `artifacts/TC-ANC-006/` |
| TC-ANC-007 | ancillaries/air-india | Passed | 2026-10-03 (desk review of TC-ANC-004/005 evidence) | — | `artifacts/TC-ANC-007/` |
| TC-ANC-008 | ancillaries/air-india | Passed | 2026-10-03 (desk review of TC-ANC-002/003/004/005 evidence) | — | `artifacts/TC-ANC-008/` |
| TC-ANC-009 | ancillaries/air-india | Passed | 2026-10-02 ~23:44 UTC–2026-10-03 ~00:00 UTC | — | `artifacts/TC-ANC-009/` |
| TC-ANC-010 | ancillaries/air-india | Passed | 2026-10-03 (desk review of TC-ANC-035 reconciliation) | — | `artifacts/TC-ANC-010/` |
| TC-ANC-011 | ancillaries/air-india | Passed | 2026-10-03 (desk review of E2E Fare screens) | — | `artifacts/TC-ANC-011/` |
| TC-ANC-012 | ancillaries/air-india | Passed | 2026-10-03 (desk review of TC-ANC-005 evidence) | — | `artifacts/TC-ANC-012/` |
| TC-ANC-014 | ancillaries/air-india | Passed | 2026-10-03 (desk review of TC-ANC-005 evidence) | — | `artifacts/TC-ANC-014/` |
| TC-ANC-015 | ancillaries/air-india | Passed | 2026-10-02 ~23:44 UTC–2026-10-03 ~00:07 UTC | — | `artifacts/TC-ANC-015/` |
| TC-ANC-016 | ancillaries/air-india | Passed | 2026-10-03 (desk review of TC-ANC-004 evidence) | — | `artifacts/TC-ANC-016/` |
| TC-ANC-018 | ancillaries/air-india | Passed | 2026-10-02 ~23:52–23:55 UTC | — | `artifacts/TC-ANC-018/` |
| TC-ANC-019 | ancillaries/air-india | Passed | 2026-10-02 ~23:37 UTC | — | `artifacts/TC-ANC-019/` |
| TC-ANC-020 | ancillaries/air-india | Passed | 2026-10-03 (desk review of TC-ANC-002 evidence) | — | `artifacts/TC-ANC-020/` |
| TC-ANC-021 | ancillaries/air-india | Passed | 2026-10-03 (desk review of TC-ANC-002 evidence) | — | `artifacts/TC-ANC-021/` |
| TC-ANC-022 | ancillaries/air-india | **Failed** | 2026-10-03 (desk review synthesizing all E2E retrieve-endpoint checkpoints) | See §3.1 — Defect A: supplier retrieve-endpoint itemization does not match booked selections whenever a code repeats for a passenger | `artifacts/TC-ANC-022/`, `artifacts/TC-ANC-023/`, `artifacts/TC-ANC-003/`, `artifacts/TC-ANC-005/`, `artifacts/TC-ANC-035/` |
| TC-ANC-023 | ancillaries/air-india | Passed | 2026-09-29 (investigation) · formalized 2026-10-03 | — | `artifacts/TC-ANC-023/` |
| TC-ANC-024 | ancillaries/air-india | Passed | 2026-10-03 (desk review of TC-ANC-002/003/035 evidence) | — | `artifacts/TC-ANC-024/` |
| TC-ANC-025 | ancillaries/air-india | Passed | 2026-10-03 (desk review of TC-ANC-004/005/034 evidence) | — | `artifacts/TC-ANC-025/` |
| TC-ANC-026 | ancillaries/air-india | **Excluded** | — | `Pending Review` — `Review` column reads `Pending`, held back pending FINDING-012 (Statement report defect) per explicit Stage 3 instruction; never authorized to run | — |
| TC-ANC-027 | ancillaries/air-india | **Inconclusive** | 2026-10-03 | See §3.1 — the required product/business decision on Wallet History's Debit/Credit labeling was explicitly deferred by the reviewer; the underlying observation is solid but the case's own Expected Result (a recorded product decision) was not reached | `artifacts/TC-ANC-027/` |
| TC-ANC-034 | ancillaries/air-india | Passed | 2026-10-01 | — | `artifacts/TC-ANC-034/` |
| TC-ANC-035 | ancillaries/air-india | Passed | 2026-10-01 ~15:51–16:11 UTC | — | `artifacts/TC-ANC-035/` |

### 3.1 Defect Detail — Failed / Inconclusive cases

<!-- One full block per Failed/Inconclusive case, per §10.1. A third block (TC-ANC-002, Passed) is
     included because it carries its own independently-confirmed defect (F) that was explicitly
     drafted to this same standard during execution — see the note at the end of this subsection. -->

#### TC-ANC-022 — Supplier retrieve-endpoint itemization undercounts a repeated ancillary code

**1. Test Case ID:** TC-ANC-022

**2. Execution Status:** Failed

**3. Execution Time:** First isolated 2026-09-29 (TC-ANC-023 investigation); reconfirmed 2026-09-30/10-01 across TC-ANC-003, TC-ANC-005, TC-ANC-035; synthesized for this case 2026-10-03.

**4. Preconditions:** A completed booking exists (Admin or Portal) with its Airline PNR known and at least one ancillary code selected more than once for the same passenger (e.g. a Meal chosen for two flight segments, or a Baggage/Bundle chosen for both directions of a round trip). Postman/direct HTTP access to the supplier retrieve endpoint (`POST https://ndc-integration-stg-ne-3.azurewebsites.net/api/V2/FlightBooking/Retrieve`) is available.

**5. Test Data:** Reproduced on five independent bookings: PNR `YSTPMB` (TC-ANC-023, Meal ×2 legs), PNR `Y1ZVFF` (TC-ANC-023, Meal ×2 legs), PNR `Z33F4Z` (TC-ANC-023/TC-ANC-002, Meal ×2 legs), PNR `P6MVJA` (TC-ANC-003, Meal/Baggage/Bundle ×2 directions), PNR `MSK5XB` (TC-ANC-005, Meal/Baggage/Bundle ×2 directions), PNR `S13GWS` (TC-ANC-035, Meal ×2 legs within one direction).

**6. Steps Performed:** For each booking above: called the retrieve endpoint with the booking's Airline PNR; read each passenger's itemized `passengerAncillaries` list and the booking-level `priceDetails.totalAncillariesAmount`; compared both against what the system actually charged (read from the Booking Confirmation / Costing screen).

**7. Expected Result:** Per this case's own Expected Result and ANC-25/ANC-33, "passenger and ancillary data match the retrieve response directly" — the supplier's own data was never expected to already include Markup (ANC-55), but it was expected to itemize, per passenger, exactly the ancillary charges the system actually billed that passenger, since ancillaries are not subject to markup or any other platform-side adjustment.

**8. Actual Result:** On every booking where a passenger was charged the same ancillary code more than once (two flight segments of one direction, or two directions of a round trip), that passenger's itemized `passengerAncillaries` entry for that code shows only a fraction of what was actually charged — exactly half when the code repeated twice (e.g. Meal VHRB: itemized 400 INR when 800 INR was actually charged for 2 legs at 200 EGP/leg, TC-ANC-035). The booking-level aggregate (`priceDetails.totalAncillariesAmount`) is correct in every case observed. On one booking (TC-ANC-035, PNR S13GWS) the undercount additionally propagated into the per-passenger `paxTotalAncillaryAmount` field, not only the itemized breakdown within it. Where no ancillary code repeated for a passenger (one-way, one-leg bookings — TC-ANC-004/PNR USCWVR, TC-ANC-034/PNR H9ZK7E), the itemization was complete and correct, confirming the defect is specifically tied to repetition of a code, not a general retrieve-endpoint fault.

**9. Impact:** Anything that consumes the per-passenger itemized breakdown — per-passenger invoicing, partial refund calculation, passenger-level financial reconciliation — would understate what that passenger was actually charged for a repeated ancillary. The booking-level total remains correct, so the customer-facing Total Amount is never wrong; the risk is specifically in downstream systems or support staff relying on the per-passenger breakdown.

**10. Classification**

| Field | Value |
|---|---|
| **Category** | Data Integrity |
| **Layer** | Integration |
| **Reproducibility** | Always (6 independent bookings observed, 6/6 agree whenever a code repeats; 2/2 one-leg bookings correctly show no defect) |
| **Regression** | Unknown — no prior confirmed-working baseline exists for this specific endpoint field in this project's Discovery or execution history |
| **Suspected Component** | NDC integration service's Retrieve response mapping (`api/V2/FlightBooking/Retrieve`), AirIndia supplier adapter — the `passengerAncillaries` itemization step specifically |
| **Confidence** | High |

**11. Root Cause Analysis:** Likely the mapping groups `passengerAncillaries` entries by `ancillaryCode` per passenger without a `segmentRefId` or per-occurrence key, so repeated per-segment or per-direction charges for the same code collapse into a single line, while the aggregate price fields are summed before that grouping step — which is why the aggregate stays correct even as the itemization under-counts.

**12. Conclusion:** The supplier retrieve endpoint's per-passenger ancillary itemization is unreliable whenever a passenger is charged the same ancillary code more than once; only the booking-level aggregate can be trusted for such bookings.

**13. Severity:** Medium — Reason: no customer-facing financial amount is wrong (the aggregate reconciles exactly), but any downstream consumer of the per-passenger breakdown would silently receive incorrect data.

**14. Priority:** P2

**15. Evidence:**

| Evidence | Path |
|---|---|
| Investigation (root cause, 3 PNRs) | `artifacts/TC-ANC-023/TC-ANC-023_investigation.md`, `retrieve_YSTPMB_response.json`, `retrieve_Y1ZVFF_response.json`, `retrieve_Z33F4Z_response.json` |
| Round-trip, two directions | `artifacts/TC-ANC-003/R3_07_supplier_retrieve_response.json` (PNR P6MVJA) |
| Round-trip, two directions, Baggage+Bundle also affected | `artifacts/TC-ANC-005/06_supplier_retrieve_response.json`, `06_supplier_retrieve_reconciliation.md` (PNR MSK5XB) |
| Within-direction repeat, `paxTotalAncillaryAmount` also corrupted | `artifacts/TC-ANC-035/06_supplier_retrieve_response.json`, `06_supplier_retrieve_reconciliation.md` (PNR S13GWS) |
| Control case — no repeat, itemization correct | `artifacts/TC-ANC-004/12_supplier_retrieve_response.json` (PNR USCWVR), `artifacts/TC-ANC-034/06_supplier_retrieve_response.json` (PNR H9ZK7E) |

---

#### TC-ANC-027 — Wallet History Debit/Credit labeling: product decision deferred

**1. Test Case ID:** TC-ANC-027

**2. Execution Status:** Inconclusive

**3. Execution Time:** Observation confirmed 2026-09-30/2026-10-01 (TC-ANC-004, TC-ANC-034); decision sought 2026-10-03.

**4. Preconditions:** A completed Wallet History Report search, showing at least one transaction — satisfied on two separate Admin bookings.

**5. Test Data:** PNR USCWVR (TC-ANC-004, 18,176 EGP) and PNR H9ZK7E (TC-ANC-034, 24,742 EGP), both Admin/Wallet History Report.

**6. Steps Performed:** Reviewed the Start Balance, transaction, and End Balance rows on the Wallet History Report for both bookings; identified which column (Debit/Credit) each value falls under; asked the reviewer for a product decision on whether this is intentional.

**7. Expected Result:** The reviewer records a product decision — either that the labeling is intentional/accepted convention, or that it should be filed as a UX defect — so this case can resolve to a definite outcome.

**8. Actual Result:** The underlying observation is consistent and reproducible: Start Balance and End Balance rows appear under the "Debit" column while the actual money-out booking transaction appears under "Credit" — the inverse of normal accounting convention, where an outflow reduces balance under Debit. The reviewer was asked directly (2026-10-03) and explicitly chose to defer the decision rather than rule either way.

**9. Impact:** None yet, since no decision was made — the figures themselves are correct in every case checked, only the column placement reads unusually to someone expecting standard accounting convention. If later ruled a defect, the impact would be user confusion when reconciling Wallet History against an external ledger.

**10. Classification**

| Field | Value |
|---|---|
| **Category** | Not applicable — no defect has been confirmed, only an observation awaiting a product decision |
| **Layer** | Not applicable |
| **Reproducibility** | Always (2/2 independent bookings show the identical column placement) |
| **Regression** | Unknown |
| **Suspected Component** | Admin Reports → Wallet History Report column mapping (if the decision rules it a defect) |
| **Confidence** | High (in the *observation* itself — not applicable to a defect, since none is confirmed) |

**11. Root Cause Analysis:** Omitted — no defect has been confirmed; there is nothing to root-cause until the product decision classifies the behavior as wrong.

**12. Conclusion:** This case cannot be resolved to Passed or Failed because its own Expected Result is a human decision that was explicitly not made during this run. It is reported as Inconclusive, not forced into either outcome.

**13. Severity:** Not applicable (no defect confirmed).

**14. Priority:** Not applicable.

**15. Evidence:**

| Evidence | Path |
|---|---|
| TC-ANC-004 Admin reports (Wallet History) | `artifacts/TC-ANC-004/16_report_wallet_history.png` |
| TC-ANC-034 Admin reports narrative | `artifacts/TC-ANC-034/00_execution_log.md` §Notes |
| This case's own disposition | `artifacts/TC-ANC-027/00_execution_log.md` |

---

#### TC-ANC-002 — Bundle Services label renders a stray bracket (defect found during an otherwise-Passed case)

<!-- Included per §10.1's standard even though TC-ANC-002's own overall Status is Passed: this
     defect was fully drafted to the Defect Documentation Standard during execution and is carried
     here for completeness. It does not appear in the Manual QA Report's Defect Register (§9.1 #5),
     which is scoped to Failed/Inconclusive cases only — it is reported there as a Known Limitation /
     Note instead, consistent with how it was dispositioned during execution. -->

**1. Test Case ID:** TC-ANC-002 (found during Step 6 — My Bookings → Segment Ancillaries)

**2. Execution Status:** Passed on its own Expected Result — this defect is logged against the specific step where it was observed, and does not change TC-ANC-002's overall classification.

**3. Execution Time:** 2026-09-29, ~12:53 UTC

**4. Preconditions:** Portal user logged in as Agency `AGN9808`; booking `Z33F4Z` has a Bundle selected.

**5. Test Data:** Order `AGN9808NDCNDCORD2609281VJKYT`, Booking Ref `NDCEG-BR-F260928ABwtpA`, Bundle `VLPL` "Value Pack"/"Xtra Pack", 2,000 EGP.

**6. Steps Performed:** Sidebar → My Bookings → search Airline PNR `Z33F4Z` → open the order → Itinerary Details → Journey Details → Bundle Services.

**7. Expected Result:** The Bundle Services field should list the selected bundle name as clean text (e.g. `Xtra Pack`), with no stray formatting characters from the underlying data.

**8. Actual Result:** The field shows `[Xtra Pack` — an opening square bracket with no closing bracket. The bundle name itself is correct; only the rendering is malformed.

**9. Impact:** Cosmetic. The booking looks unfinished or malformed to the agent viewing it, but no data is wrong and no decision depends on it.

**10. Classification**

| Field | Value |
|---|---|
| **Category** | UI |
| **Layer** | Frontend |
| **Reproducibility** | Unable to confirm (one booking observed) |
| **Regression** | Unknown |
| **Suspected Component** | Booking Details → Journey Details "Bundle Services" list rendering |
| **Confidence** | High (the stray bracket appears identically in both the DOM snapshot and the screenshot) |

**11. Root Cause Analysis:** Likely the bundle names arrive as an array or bracketed string and are rendered after only partial string cleanup — e.g. a leading `[` is not stripped, or a JSON-like value is split on commas without removing the brackets.

**12. Conclusion:** The Bundle Services label on Booking Details shows a stray `[` before the bundle name.

**13. Severity:** Low — Reason: display-only formatting error with no effect on data, amounts, or workflow.

**14. Priority:** P3

**15. Evidence:**

| Evidence | Path |
|---|---|
| DOM snapshot showing `[Xtra Pack` | `artifacts/TC-ANC-002/08_booking_details_itinerary_dom.yml` |
| Screenshot | `artifacts/TC-ANC-002/08_booking_details_segment_ancillaries.png` |

## 4. Evidence Inventory

<!-- Consolidated per test case. Each folder's own 00_execution_log.md (or, for TC-ANC-023,
     TC-ANC-023_investigation.md) itemizes every individual screenshot/JSON/DOM-snapshot file
     captured for that case — not restated file-by-file here to avoid duplicating ~100 entries
     already enumerated in the repo. Every gap is named with its reason. -->

| Test Case ID | Evidence Type | Path | Captured? | Gap Reason |
|---|---|---|---|---|
| TC-ANC-001 | Screenshot | `artifacts/TC-ANC-001/01_branch_product_access_flight_tab.png` | Yes | — |
| TC-ANC-002 | Screenshots, JSON (request/response, redacted), DOM snapshots, execution log | `artifacts/TC-ANC-002/` (12 files) | Yes | Video not captured — MCP setup does not support session recording |
| TC-ANC-003 | Screenshots, JSON (request/response, redacted), execution log | `artifacts/TC-ANC-003/` (24 files across 3 attempts) | Yes | Video not captured — same reason as above |
| TC-ANC-004 | Screenshots, JSON (request/response, redacted), execution log | `artifacts/TC-ANC-004/` (17 files) | Yes | Video not captured |
| TC-ANC-005 | Screenshots, JSON (request/response, redacted), reconciliation doc, execution log | `artifacts/TC-ANC-005/` (10 files) | Yes | Video not captured |
| TC-ANC-006 | Notes (desk review citing TC-ANC-002 evidence) | `artifacts/TC-ANC-006/00_execution_log.md` | Yes | No new screenshot — reused evidence per this case's own Notes field |
| TC-ANC-007 | Notes (desk review citing TC-ANC-004/005 evidence) | `artifacts/TC-ANC-007/00_execution_log.md` | Yes | No new screenshot — reused evidence |
| TC-ANC-008 | Notes (desk review citing TC-ANC-002/003/004/005 evidence) | `artifacts/TC-ANC-008/00_execution_log.md` | Yes | No new screenshot — reused evidence |
| TC-ANC-009 | Screenshot, execution log | `artifacts/TC-ANC-009/01_duplicate_infant_assignment_blocked.png` | Yes | — |
| TC-ANC-010 | Notes (desk review citing TC-ANC-035 reconciliation) | `artifacts/TC-ANC-010/00_execution_log.md` | Yes | No new screenshot — reused evidence |
| TC-ANC-011 | Notes (desk review citing E2E Fare screens) | `artifacts/TC-ANC-011/00_execution_log.md` | Yes | No new screenshot — reused evidence |
| TC-ANC-012 | Notes (desk review citing TC-ANC-005 evidence) | `artifacts/TC-ANC-012/00_execution_log.md` | Yes | No new screenshot — reused evidence |
| TC-ANC-014 | Notes (desk review citing TC-ANC-005 evidence) | `artifacts/TC-ANC-014/00_execution_log.md` | Yes | No new screenshot — reused evidence |
| TC-ANC-015 | Screenshots, execution log | `artifacts/TC-ANC-015/01_booking_confirmation.png`, `02_report_total_due_confirms_exact_charge.png` | Yes | A direct live re-read of the post-booking "Your Balance" widget was not captured — a second attempt was interrupted by a transient network dropout to `192.168.1.213` (self-resolved); the Total Due to NDC report is cited as equivalent evidence of the exact deduction amount instead |
| TC-ANC-016 | Notes (desk review citing TC-ANC-004 evidence) | `artifacts/TC-ANC-016/00_execution_log.md` | Yes | No new screenshot — reused evidence |
| TC-ANC-018 | Screenshots, execution log | `artifacts/TC-ANC-018/01_before_change.png`, `02_after_change_and_remove.png` | Yes | — |
| TC-ANC-019 | Execution log (read-only DOM/text inspection) | `artifacts/TC-ANC-019/00_execution_log.md` | Yes | No screenshot captured — the result (absence of a control) was confirmed via full-page text/button enumeration, which the log quotes directly |
| TC-ANC-020 | Notes (desk review citing TC-ANC-002 evidence) | `artifacts/TC-ANC-020/00_execution_log.md` | Yes | No new screenshot — reused evidence |
| TC-ANC-021 | Notes (desk review citing TC-ANC-002 evidence) | `artifacts/TC-ANC-021/00_execution_log.md` | Yes | No new screenshot — reused evidence |
| TC-ANC-022 | Notes (desk review synthesizing TC-ANC-002/003/005/023/035 retrieve evidence) | `artifacts/TC-ANC-022/00_execution_log.md` | Yes | No new retrieve call — reused evidence per this case's own Notes field |
| TC-ANC-023 | JSON (request/response, redacted, 3 PNRs), investigation doc | `artifacts/TC-ANC-023/` (7 files) | Yes | Video not applicable (API-only investigation) |
| TC-ANC-024 | Notes (desk review citing TC-ANC-002/003/035 reports evidence) | `artifacts/TC-ANC-024/00_execution_log.md` | Yes | No new screenshot — reused evidence |
| TC-ANC-025 | Notes (desk review citing TC-ANC-004/005/034 reports evidence) | `artifacts/TC-ANC-025/00_execution_log.md` | Yes | No new screenshot — reused evidence |
| TC-ANC-026 | — | — | No | Excluded — never authorized to run (`Review = Pending`) |
| TC-ANC-027 | Screenshot reference, execution log | `artifacts/TC-ANC-027/00_execution_log.md` (cites `TC-ANC-004/16_report_wallet_history.png`) | Yes | — |
| TC-ANC-034 | Screenshots, JSON (request/response, redacted), reconciliation doc, execution log | `artifacts/TC-ANC-034/` (7 files) | Yes | Video not captured |
| TC-ANC-035 | Screenshots, JSON (request/response, redacted), reconciliation doc, execution log | `artifacts/TC-ANC-035/` (8 files) | Yes | Video not captured |

**Evidence root:** `platform_core_data/runs/run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia/manual_execution/artifacts/`
