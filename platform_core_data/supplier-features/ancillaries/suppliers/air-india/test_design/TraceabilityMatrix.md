# Requirement Traceability Matrix — run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia

| Field | Value |
|---|---|
| Module | `ancillaries/air-india` |
| Produced by run | `run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia` |
| Revision | 5 |
| Project Context | `suppliers/air-india/context/ProjectContext.md` (rev 3) + shared baseline (rev 4) |
| Run Scope Type / Run Type | Feature / User Story |
| Test Cases Traced | 27 |
| Generated | 2026-09-28 |

## 1. Matrix

| Test Case ID | Requirement Reference | Discovery Reference | Finding Reference | Evidence Reference | Acceptance Criteria Reference | Run Scope Reference | Risk Level | Risk Statement | Validation Status |
|---|---|---|---|---|---|---|---|---|---|
| TC-ANC-001 | ANC-14, ANC-15, ANC-16, ANC-17, ANC-18 | Timeline.md 2026-09-25 (Admin precondition entries) | N/A | N/A | N/A | Feature — Ancillaries/AirIndia | Low | None — precondition already confirmed | Covered |
| TC-ANC-002 | ANC-19, ANC-20, ANC-21, ANC-24, ANC-25, ANC-31, ANC-32, ANC-33, ANC-44, ANC-45, ANC-48, ANC-49, ANC-53 | Timeline.md 2026-09-25/27 (DEL-DXB, one-way with stop — this run's exact route/stop combination); this run's own retrieve-endpoint methodology (TC-ANC-022) | FINDING-002, FINDING-006, FINDING-008, FINDING-009, FINDING-011 | FINDING-002/live_ancillaries_meal_baggage_direct_observation.png, FINDING-006/live_ancillaries_no_infant_row_direct_observation.png, FINDING-008/live_order_confirmation_direct_observation.png, FINDING-009/live_itinerary_segment_ancillaries_direct_observation.png, FINDING-011/live_total_due_report_direct_observation.png | N/A | Feature — Ancillaries/AirIndia | High | Core six-checkpoint E2E flow; route (DEL-DXB) matches Discovery's own evidenced route, so risk here is about the checkpoint chain, not route novelty | Partially Covered |
| TC-ANC-003 | ANC-19, ANC-20, ANC-21, ANC-24, ANC-25, ANC-31, ANC-32, ANC-33, ANC-44, ANC-45, ANC-48, ANC-49, ANC-53 | Not independently verified in Discovery — BOM-COK was never exercised in Discovery at all (route corrected 2026-09-28 from DEL-BOM, which was also unevidenced) | FINDING-002, FINDING-006, FINDING-008, FINDING-009, FINDING-011 | Same evidence as TC-ANC-002 (Findings apply generically, not route-specifically) | N/A | Feature — Ancillaries/AirIndia | High | Brand-new route (BOM-COK) with zero prior Discovery evidence; also introduces the unresolved round-trip Baggage-scoping question (never exercised in Discovery) | Partially Covered |
| TC-ANC-004 | ANC-19, ANC-20, ANC-21, ANC-24, ANC-25, ANC-31, ANC-32, ANC-33, ANC-44, ANC-45, ANC-48, ANC-49, ANC-53, ANC-54, ANC-55, ANC-57, ANC-58 | Not independently verified in Discovery — BOM-COK was never exercised on the Admin channel either (route corrected 2026-09-28 from DEL-BOM) | FINDING-002, FINDING-006, FINDING-013, FINDING-015, FINDING-016 | FINDING-013/admin_search_result_price_breakdown.png, FINDING-006/admin_passenger_table_infant_no_ancillaries.png, FINDING-015/admin_payment_details_wallet_three_components.png, FINDING-016/admin_total_due_to_ndc_report.png | N/A | Feature — Ancillaries/AirIndia | High | Brand-new route (BOM-COK) with zero prior Discovery evidence, compounded by Admin's evidence being Human-Observation/Static-Artifact tier only for everything else | Partially Covered |
| TC-ANC-005 | ANC-19, ANC-20, ANC-21, ANC-24, ANC-25, ANC-31, ANC-32, ANC-33, ANC-44, ANC-45, ANC-48, ANC-49, ANC-53, ANC-54, ANC-55, ANC-57, ANC-58 | QA_Assessment_Report.md §14 (Admin flow evidenced on DEL-DXB — this run's exact route/stop combination) | FINDING-002, FINDING-006, FINDING-013, FINDING-015, FINDING-016 | FINDING-013/admin_costing_and_payment_reconciled.png, plus same evidence as TC-ANC-004 | N/A | Feature — Ancillaries/AirIndia | High | Route (DEL-DXB) matches Discovery's own evidenced Admin route; Admin's evidence is still Human-Observation/Static-Artifact tier only, so cannot reach `Confirmed` regardless of this design. Also introduces the unresolved round-trip Baggage-scoping question | Partially Covered |
| TC-ANC-006 | ANC-49 | Timeline.md 2026-09-27 | FINDING-006 | FINDING-006/live_ancillaries_no_infant_row_direct_observation.png | N/A | Feature — Ancillaries/AirIndia | Medium | Eligibility violation risks incorrect ancillary charges | Covered |
| TC-ANC-007 | ANC-49, ANC-54 | QA_Assessment_Report.md §14 | FINDING-006 | FINDING-006/admin_passenger_table_infant_no_ancillaries.png | N/A | Feature — Ancillaries/AirIndia | Medium | Same as TC-ANC-006, Admin channel | Partially Covered |
| TC-ANC-008 | ANC-49 | Timeline.md 2026-09-25/27 | N/A | N/A | N/A | Feature — Ancillaries/AirIndia | Low | Positive path, low risk | Covered |
| TC-ANC-009 | ANC-49 (eligibility categories only — the specific 1:1 Infant-to-Adult limit is not itself stated in Project Context) | Not independently verified in Discovery | N/A | N/A | N/A | Feature — Ancillaries/AirIndia | Medium | Data-integrity risk if unenforced; rule itself unconfirmed | Unknown / Unassessed |
| TC-ANC-010 | ANC-42 | Not independently verified in Discovery (kept as a session note, not filed as a Finding, per the user's explicit instruction) | N/A | N/A | N/A | Feature — Ancillaries/AirIndia | High | Currency conversion errors directly affect what a customer is charged | Partially Covered |
| TC-ANC-011 | ANC-44, ANC-55 | QA_Assessment_Report.md §5 (FINDING-003), §14 (FINDING-014) | FINDING-003, FINDING-014 | FINDING-003/pax_details_fare_breakdown.png, FINDING-014/admin_fare_details_service_charge_discount.png | N/A | Feature — Ancillaries/AirIndia | Low | Already established behavior, informational | Covered |
| TC-ANC-012 | ANC-44, ANC-45 | QA_Assessment_Report.md §14 | FINDING-014 | FINDING-014/admin_fare_details_service_charge_discount.png | N/A | Feature — Ancillaries/AirIndia | High | Pricing arithmetic errors directly affect billing | Partially Covered |
| TC-ANC-014 | ANC-50 | QA_Assessment_Report.md §5 (FINDING-005, FINDING-008) | FINDING-005, FINDING-008 | FINDING-005/live_bundle_pricing_direct_observation.png | N/A | Feature — Ancillaries/AirIndia | Low | Already confirmed behavior | Covered |
| TC-ANC-015 | ANC-46 | QA_Assessment_Report.md §5 (FINDING-007) | FINDING-007 | FINDING-007/live_wallet_before_booking_direct_observation.png, live_wallet_after_booking_direct_observation.png | N/A | Feature — Ancillaries/AirIndia | High | Incorrect deduction timing/amount is a direct financial risk | Covered |
| TC-ANC-016 | ANC-46, ANC-56 | QA_Assessment_Report.md §14 (FINDING-015) | FINDING-015 | FINDING-015/admin_payment_details_wallet_three_components.png | N/A | Feature — Ancillaries/AirIndia | High | Same financial risk as TC-ANC-015, Admin's 3-part wallet | Partially Covered |
| TC-ANC-018 | ANC-47 | Not independently verified in Discovery this run (originally confirmed at business intake, 2026-09-23) | N/A | N/A | N/A | Feature — Ancillaries/AirIndia | Medium | Per-passenger isolation failure would corrupt other passengers' selections | Partially Covered |
| TC-ANC-019 | ANC-52 | QA_Assessment_Report.md §5 (FINDING-010) | FINDING-010 | FINDING-010/live_change_control_scan_direct_observation.png | N/A | Feature — Ancillaries/AirIndia | High | Post-booking mutability would be a business-rule violation | Covered |
| TC-ANC-020 | ANC-31, ANC-32, ANC-33, ANC-53 | QA_Assessment_Report.md §5 (FINDING-008) | FINDING-008 | FINDING-008/live_order_confirmation_direct_observation.png | N/A | Feature — Ancillaries/AirIndia | High | Confirmation is the customer's contractual record | Covered |
| TC-ANC-021 | ANC-53 | QA_Assessment_Report.md §5 (FINDING-009) | FINDING-009 | FINDING-009/live_itinerary_segment_ancillaries_direct_observation.png | N/A | Feature — Ancillaries/AirIndia | High | Same as TC-ANC-020, independent surface | Covered |
| TC-ANC-022 | ANC-25, ANC-33, ANC-42, ANC-55 | Not independently verified in Discovery — this is the newly agreed testing methodology itself, not yet executed | N/A | N/A | N/A | Feature — Ancillaries/AirIndia | High | Core method for catching persistence/transmission defects (see TC-ANC-023's example); fare comparison requires applying ROE + Markup, not a raw equality (user clarification 2026-09-28) | Partially Covered |
| TC-ANC-023 | ANC-33 | Not independently verified in Discovery — noted in conversation only, per the user's explicit instruction not to file it as a Finding | N/A | N/A | N/A | Feature — Ancillaries/AirIndia | Medium | An unattributed 800 INR gap was observed once; root cause unconfirmed | Unknown / Unassessed |
| TC-ANC-024 | ANC-53 | QA_Assessment_Report.md §5 (FINDING-011) | FINDING-011 | FINDING-011/live_total_due_report_direct_observation.png | N/A | Feature — Ancillaries/AirIndia | Medium | Finance-facing reporting accuracy | Covered |
| TC-ANC-025 | ANC-53, ANC-57 | QA_Assessment_Report.md §14 (FINDING-016) | FINDING-016 | FINDING-016/admin_total_due_to_ndc_report.png | N/A | Feature — Ancillaries/AirIndia | Medium | Same as TC-ANC-024, Admin's report set | Partially Covered |
| TC-ANC-026 | ANC-53, ANC-57 | QA_Assessment_Report.md §5/§14 (FINDING-012) | FINDING-012 | FINDING-012/live_statement_report_no_data_direct_observation.png, admin_statement_report_no_data.png | N/A | Feature — Ancillaries/AirIndia | Medium | Confirmed Bug — Statement is unusable for reconciliation until fixed | Covered (execution Blocked) |
| TC-ANC-027 | ANC-57 | QA_Assessment_Report.md §14 (FINDING-017) | FINDING-017 | FINDING-017/admin_wallet_history_report_labeling.png | N/A | Feature — Ancillaries/AirIndia | Low | UX/labeling clarity only, figures are correct | Covered |
| TC-ANC-034 | ANC-45, ANC-49, ANC-53, ANC-57 | Not independently verified in Discovery — this exact zero-ancillary combination was never exercised | N/A | N/A | N/A | Feature — Ancillaries/AirIndia | Medium | Confirms the "no ancillary" boundary is handled cleanly at every checkpoint, not just the happy path | Unknown / Unassessed |
| TC-ANC-035 | ANC-40, ANC-44, ANC-45, ANC-48, ANC-53 | Not independently verified in Discovery — this asymmetric per-leg ancillary selection was never exercised | N/A | N/A | N/A | Feature — Ancillaries/AirIndia | Medium | Confirms partial/asymmetric ancillary selection on a round trip is priced and persisted correctly; also resolves whether Baggage can be scoped per-direction at all | Unknown / Unassessed |

**Removed 2026-09-28 (out of Ancillaries scope, belongs to general booking scope):** TC-ANC-013, TC-ANC-017, TC-ANC-028, TC-ANC-029, TC-ANC-030, TC-ANC-031, TC-ANC-032, TC-ANC-033. See §3 for how FINDING-003/FINDING-014/FINDING-013/FINDING-015 are now dispositioned, and §2 below for updated Requirement coverage.

**Restructured 2026-09-28 (Option 2 — user-directed):** TC-ANC-002/003/004/005 rewritten in place from route/stop-sweep Scenario cases into single-combo E2E cases, each walking a six-checkpoint chain (ancillary-selection rules → Confirmation → supplier retrieve endpoint → Search Booking Ancillaries → Search Booking Costing → channel-appropriate Reports). TC-ANC-034/035 added for the two combos with no prior test case (no-ancillaries-for-any-passenger; onward-leg-only ancillary selection).

## 2. Requirement → Test Case Roll-Up

| Requirement ID | Requirement Summary | Test Case ID(s) | Coverage Status |
|---|---|---|---|
| ANC-01 … ANC-09 | Capability governance (process/metadata rules for how the platform records capability facts) | — | Out-of-Scope — process/governance rules, not user-facing application behavior a manual test case executes |
| ANC-10 … ANC-13 | Application model (level recorded per capability) | TC-ANC-002, TC-ANC-004 (implicitly, via Meal/Baggage selection steps) | Partially Covered |
| ANC-14 … ANC-18 | Admin precondition (Branch/Supplier/Credential) | TC-ANC-001 | Covered |
| ANC-19 … ANC-21 | Portal search, selection, PAX Details | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005, TC-ANC-034, TC-ANC-035 | Partially Covered — negative/boundary/Unicode validation of this flow now out of Ancillaries scope (moved to general booking scope, TC-ANC-028/029/030 removed) |
| ANC-22, ANC-23 | Ancillaries verification against intake / interact only with supported capabilities | TC-ANC-006, TC-ANC-008 | Partially Covered — no dedicated negative case for an unsupported capability (Seat) |
| ANC-24 | Select applicable ancillaries, continue booking | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005 | Covered |
| ANC-25 | Ancillary info preserved through booking and downstream | TC-ANC-020, TC-ANC-021, TC-ANC-022 | Covered |
| ANC-26 | Two-application execution, independent environments | — | Out-of-Scope — infrastructure/environment fact, already confirmed at Discovery, not independently re-tested by a functional case |
| ANC-27 … ANC-30 | Evidence capture fields (pre-selection option, capture fields, capability-specific fields) | TC-ANC-006, TC-ANC-008, TC-ANC-014 | Partially Covered |
| ANC-31 … ANC-33 | Six-checkpoint validation model | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005, TC-ANC-020, TC-ANC-021, TC-ANC-022, TC-ANC-034, TC-ANC-035 | Covered — now walked explicitly and directly by 6 dedicated E2E cases, not just inferred from separate atomic checks |
| ANC-34 … ANC-36 | Pricing capture (base, ancillary, total) | TC-ANC-010, TC-ANC-012 | Covered |
| ANC-37 … ANC-41 | Discovery obligations (per-Supplier establishment tasks) | — | Out-of-Scope — Discovery-process rules, not Test Design targets |
| ANC-42 | ROE currency conversion | TC-ANC-010 | Partially Covered — no dedicated Discovery Reference for this run's own re-verification |
| ANC-43 | Taxes/fees per offer | TC-ANC-012 | Covered |
| ANC-44 | Rule engine — markup/discount/service-fee | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005, TC-ANC-011, TC-ANC-012, TC-ANC-035 | Partially Covered — Service Charge/Discount question (FINDING-003/014) now a Documented Exception, out of Ancillaries scope |
| ANC-45 | Ancillary/Bundle amounts added to total | TC-ANC-012, TC-ANC-014 | Covered |
| ANC-46 | Wallet/payment timing | TC-ANC-015, TC-ANC-016 | Covered |
| ANC-47 | Before-booking change/removal, per passenger | TC-ANC-018 | Partially Covered |
| ANC-48 | Application Level defaults (Meal/Segment, Baggage/Journey) | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005, TC-ANC-035 | Partially Covered — round-trip Baggage scoping (once total vs. once per direction) is an open question TC-ANC-003/005 are designed to resolve, not yet executed |
| ANC-49 | Eligibility default (Adult/Child only) | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005, TC-ANC-006, TC-ANC-007, TC-ANC-008, TC-ANC-009, TC-ANC-034 | Covered |
| ANC-50 | Bundle coexistence | TC-ANC-014 | Covered |
| ANC-51 | Environment architecture (same tenant, two URLs) | — | Out-of-Scope — infrastructure fact |
| ANC-52 | Post-booking immutability | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005, TC-ANC-019, TC-ANC-034, TC-ANC-035 | Covered |
| ANC-53 | Downstream reflection (confirmation, itinerary, reports) | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005, TC-ANC-020, TC-ANC-021, TC-ANC-024, TC-ANC-025, TC-ANC-026, TC-ANC-034, TC-ANC-035 | Covered |
| ANC-54 | Admin's own booking cycle | TC-ANC-004, TC-ANC-005, TC-ANC-007, TC-ANC-034 | Partially Covered — evidence-tier capped, see §8 |
| ANC-55 | Shared rule engine; Markup folds into Base Fare on both channels | TC-ANC-004, TC-ANC-005, TC-ANC-011 | Partially Covered |
| ANC-56 | Admin's three-component wallet | TC-ANC-016 | Partially Covered |
| ANC-57 | Admin's own Reports set | TC-ANC-004, TC-ANC-005, TC-ANC-025, TC-ANC-026, TC-ANC-027, TC-ANC-034 | Partially Covered |
| ANC-58 | Admin's Agency/Agent selection supplies the wallet | TC-ANC-004, TC-ANC-005 | Partially Covered |
| — | Multi-city not supported for AirIndia (not yet in Project Context) | — | Unknown / Unassessed — no test case in Ancillaries scope; recommend a general-booking Feature test design pick this up (§8) |

## 3. Finding Disposition

| Finding ID | Category | Severity | Disposition | Test Case ID(s) / Reason |
|---|---|---|---|---|
| FINDING-001 | Requirement Gap | N/A | Documented exception | Resolved non-issue (Supplier naming convention) — no test case; recorded in `SupplierChecklist.md` §1 instead |
| FINDING-002 | Observation | N/A | Regression test | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005 (Application Level exercised via Meal/Baggage selection steps; TC-ANC-003/005 also test the round-trip Baggage-scoping question this Finding didn't cover) |
| FINDING-003 | Test Gap | N/A | Documented exception | Out of Ancillaries scope — the Service Charge/Discount display question is a general-booking Fare Breakdown concern, not Ancillaries-specific; deferred to a future general-booking Feature test design (TC-ANC-013 removed 2026-09-28) |
| FINDING-004 | Observation | N/A | Documented exception | Resolved false read (Baggage dropdown has 4 options) — no test case |
| FINDING-005 | Observation | N/A | Regression test | TC-ANC-014 |
| FINDING-006 | Observation | N/A | Regression test | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005, TC-ANC-006, TC-ANC-007, TC-ANC-034 |
| FINDING-007 | Observation | N/A | Regression test | TC-ANC-015 |
| FINDING-008 | Observation | N/A | Regression test | TC-ANC-002, TC-ANC-003, TC-ANC-020, TC-ANC-034, TC-ANC-035 |
| FINDING-009 | Observation | N/A | Regression test | TC-ANC-002, TC-ANC-003, TC-ANC-021, TC-ANC-035 |
| FINDING-010 | Observation | N/A | Regression test | TC-ANC-019 |
| FINDING-011 | Observation | N/A | Regression test | TC-ANC-002, TC-ANC-003, TC-ANC-024, TC-ANC-035 |
| FINDING-012 | Bug | Medium | Regression test | TC-ANC-026 — held **Pending/Blocked**, do not execute until the defect is fixed |
| FINDING-013 | Observation | N/A | Regression test | TC-ANC-004, TC-ANC-005, TC-ANC-034 — re-verification pending (evidence-tier cap, not a doubt about correctness) |
| FINDING-014 | Observation | N/A | Documented exception | Out of Ancillaries scope — same reasoning as FINDING-003 (TC-ANC-013 removed 2026-09-28); the per-Branch config vs. Portal display gap is a general-booking Fare Breakdown question |
| FINDING-015 | Observation | N/A | Regression test | TC-ANC-004, TC-ANC-005, TC-ANC-016 |
| FINDING-016 | Observation | N/A | Regression test | TC-ANC-004, TC-ANC-005, TC-ANC-025, TC-ANC-034 |
| FINDING-017 | UX Issue | Low | Exploratory test | TC-ANC-027 — product/labeling judgment call |

**Uncovered Findings: 0.** Every Finding from the approved Findings Summary has exactly one disposition above.

## 4. Risk Register

| Risk Level | Test Case ID(s) | Statement | Source |
|---|---|---|---|
| High | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005, TC-ANC-010, TC-ANC-012, TC-ANC-015, TC-ANC-016, TC-ANC-019, TC-ANC-020, TC-ANC-021, TC-ANC-022 | Core booking, pricing, wallet, and persistence integrity — a defect here is directly financial or contractual | FINDING-007, FINDING-008, FINDING-009, FINDING-010, FINDING-015, and the newly-untested BOM-COK route / retrieve-endpoint methodology |
| Medium | TC-ANC-006, TC-ANC-007, TC-ANC-009, TC-ANC-018, TC-ANC-023, TC-ANC-024, TC-ANC-025, TC-ANC-026, TC-ANC-034, TC-ANC-035 | Eligibility, reporting, and open configuration questions — real but bounded impact | FINDING-006, FINDING-012, FINDING-015, FINDING-016, and the unattributed 800 INR retrieve-endpoint gap |
| Low | TC-ANC-001, TC-ANC-008, TC-ANC-011, TC-ANC-014, TC-ANC-027 | Already-confirmed behavior, UX-only, or standard form validation | FINDING-001, FINDING-004, FINDING-005, FINDING-011 (indirectly), FINDING-017 |
