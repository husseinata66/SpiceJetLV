# Coverage Report — run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia

| Field | Value |
|---|---|
| Module | `ancillaries/air-india` |
| Produced by run | `run-007__2026-09-23_21-18-44__UserStory__Ancillaries-AirIndia` |
| Revision | 7 |
| Generated | 2026-09-28 |
| Status | Approved |
| Approved by | Ahmed Alhussieny |
| Approved on | 2026-09-28 |

## 1. Run Scope

| Field | Value |
|---|---|
| Run Scope Type / Source | Feature / Supplier Feature (`ancillaries` / `air-india`) |
| Run Type | User Story |
| Project Context | `suppliers/air-india/context/ProjectContext.md` rev 3 (Approved 2026-09-28) + shared baseline `ancillaries-baseline/context/ProjectContext.md` rev 4 (Approved 2026-09-28) |

This pass follows the **Feature** strategy (§16): a full end-to-end suite for one Feature/Supplier
combination, with deeper Negative/Required-Dimension coverage per requirement than an Entire Project
pass would budget for. Scenario parameters were set directly by the user: mixed passengers (2 Adult +
2 Child + 2 Infant, where applicable), both stop and non-stop flights, One-way and Round-trip only
(Multi-city not supported for AirIndia), routes BOM-COK (non-stop) and DEL-DXB (transit), and the agreed retrieve-endpoint
testing methodology for both Admin and Portal.

## 2. Requirements Covered

| Requirement ID | Summary | Test Case ID(s) |
|---|---|---|
| ANC-14…18 | Admin precondition (Branch/Supplier/Credential) | TC-ANC-001 |
| ANC-24 | Select ancillaries, continue booking | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005 |
| ANC-25 | Ancillary info preserved through booking and downstream | TC-ANC-002, TC-ANC-003, TC-ANC-020, TC-ANC-021, TC-ANC-022 |
| ANC-31…33 | Six-checkpoint validation model | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005, TC-ANC-020, TC-ANC-021, TC-ANC-022, TC-ANC-034, TC-ANC-035 |
| ANC-34…36 | Pricing capture | TC-ANC-010, TC-ANC-012 |
| ANC-43 | Taxes/fees per offer | TC-ANC-012 |
| ANC-45 | Ancillary/Bundle amounts added to total | TC-ANC-012, TC-ANC-014 |
| ANC-46 | Wallet/payment timing | TC-ANC-015, TC-ANC-016 |
| ANC-49 | Eligibility default (Adult/Child only) | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005, TC-ANC-006, TC-ANC-007, TC-ANC-008, TC-ANC-009, TC-ANC-034, TC-ANC-036 |
| ANC-50 | Bundle coexistence | TC-ANC-014 |
| ANC-52 | Post-booking immutability | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005, TC-ANC-019, TC-ANC-034, TC-ANC-035 |
| ANC-53 | Downstream reflection (confirmation, itinerary, reports) | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005, TC-ANC-020, TC-ANC-021, TC-ANC-024, TC-ANC-025, TC-ANC-026, TC-ANC-034, TC-ANC-035 |

**Coverage Percentage: 52%** (22 Covered ÷ 42 testable-in-scope requirements — Out-of-Scope items
excluded from the denominator per §8.1; unchanged by the revision 3 restructuring below — no requirement
flipped category, only depth of evidence per requirement increased)

| Category | Count |
|---|---|
| Covered | 22 |
| Partially Covered | 20 |
| Out-of-Scope | 16 |
| Unknown / Unassessed | 0 (ANC-numbered) + 1 (the un-recorded Multi-city fact, non-ANC) |
| Uncovered | 0 |

**Revision 2 note (2026-09-28):** ANC-19…21 moved from Covered to Partially Covered — its negative/boundary/Unicode validation (formerly TC-ANC-028/029/030) was reclassified as general-booking scope, not Ancillaries-specific, and removed from this suite along with 7 other cases (TC-ANC-013, 017, 031, 032, 033). See §8 for the full disposition.

**Revision 3 note (2026-09-28):** TC-ANC-002/003/004/005 restructured in place from route/stop-sweep Scenario cases into 4 of 6 user-specified single-combo E2E cases, each now walking a six-checkpoint chain (ancillary-selection rules → Confirmation → supplier retrieve endpoint → Search Booking Ancillaries → Search Booking Costing → channel-appropriate Reports) instead of asserting only "reaches Confirmed status." TC-ANC-034 (no ancillaries selected, Admin) and TC-ANC-035 (onward-leg-only ancillaries, Portal) added for the 2 combos with no prior test case. This is the Option 2 approach the user chose over writing 6 wholly new cases, to avoid duplicating coverage of routes/checkpoints already exercised.

**Revision 7 note (2026-10-03):** TC-ANC-036 added — a user-directed ad-hoc verification, executed
during Stage 4M, proposed back into the suite. Calls the NDC integration service's `Search` →
`FareConfirm` → `AddPassenger` → `GetAncillary` chain directly and compares the raw ancillary catalog
against the Portal UI's Ancillaries step for an identical search. Adds evidence depth to ANC-22/23
(ancillary data verification against intake), ANC-42 (ROE conversion, Partially Covered gate
unchanged — still blocked on Discovery Finding filing, not on test execution), and ANC-49 (Infant
eligibility, now confirmed at the raw API layer as well as the UI). No requirement flipped category.
Total Test Cases 27→28 (4 Scenario, up from 3).

## 3. Coverage Matrix

<!-- Consolidates TraceabilityMatrix.md §2 — see that file for the full per-requirement breakdown. -->

| Requirement ID | Test Case ID(s) | Status |
|---|---|---|
| ANC-01…09 | — | Out-of-Scope |
| ANC-10…13 | TC-ANC-002, TC-ANC-004 | Partially Covered |
| ANC-14…18 | TC-ANC-001 | Covered |
| ANC-19…21 | TC-ANC-002…005, TC-ANC-034, TC-ANC-035 | Partially Covered |
| ANC-22, ANC-23 | TC-ANC-006, TC-ANC-008, TC-ANC-036 | Partially Covered |
| ANC-24, ANC-25 | TC-ANC-002…005, TC-ANC-020…022 | Covered |
| ANC-26 | — | Out-of-Scope |
| ANC-27…30 | TC-ANC-006, TC-ANC-008, TC-ANC-014 | Partially Covered |
| ANC-31…36 | TC-ANC-002…005, TC-ANC-010, TC-ANC-012, TC-ANC-020…022, TC-ANC-034, TC-ANC-035 | Covered |
| ANC-37…41 | — | Out-of-Scope |
| ANC-42 | TC-ANC-010, TC-ANC-036 | Partially Covered |
| ANC-43…46 | TC-ANC-012, TC-ANC-015, TC-ANC-016 | Covered |
| ANC-44 | TC-ANC-002…005, TC-ANC-011, TC-ANC-012, TC-ANC-035 | Partially Covered |
| ANC-47 | TC-ANC-018 | Partially Covered |
| ANC-48 | TC-ANC-002…005, TC-ANC-035 | Partially Covered — round-trip Baggage scoping is an open question TC-ANC-003/005 are designed to resolve |
| ANC-49, ANC-50 | TC-ANC-002…009, TC-ANC-014, TC-ANC-034, TC-ANC-036 | Covered |
| ANC-51 | — | Out-of-Scope |
| ANC-52, ANC-53 | TC-ANC-002…005, TC-ANC-019…021, TC-ANC-024…026, TC-ANC-034, TC-ANC-035 | Covered |
| ANC-54…58 | TC-ANC-004, TC-ANC-005, TC-ANC-007, TC-ANC-016, TC-ANC-025…027, TC-ANC-034 | Partially Covered |

## 4. Business Rules

<!-- No requirement in this Project Context is prefixed `BR-` — the shared baseline uses BUS/EXE/GOV/
     DSC type tags on the ANC-xx series instead. The BUS-typed rows are the closest equivalent. -->

| Business Rule ID | Rule | Test Case ID(s) | Status |
|---|---|---|---|
| ANC-42 (BUS) | ROE currency conversion | TC-ANC-010, TC-ANC-036 | Partially Covered |
| ANC-43 (BUS) | Taxes/fees per offer | TC-ANC-012 | Covered |
| ANC-44 (BUS) | Rule engine — markup/discount/service-fee | TC-ANC-002…005, TC-ANC-011, TC-ANC-012, TC-ANC-035 | Partially Covered |
| ANC-45 (BUS) | Ancillary/Bundle amounts added to total | TC-ANC-012, TC-ANC-014, TC-ANC-034 | Covered |
| ANC-46 (BUS) | Wallet/payment timing | TC-ANC-015, TC-ANC-016 | Covered |
| ANC-47 (BUS) | Before-booking change/removal, per passenger | TC-ANC-018 | Partially Covered |
| ANC-48 (BUS) | Application Level defaults | TC-ANC-002…005, TC-ANC-035 | Partially Covered — round-trip Baggage scoping is an open question |
| ANC-49 (BUS) | Eligibility default | TC-ANC-002…009, TC-ANC-034, TC-ANC-036 | Covered |
| ANC-50 (BUS) | Bundle coexistence | TC-ANC-014 | Covered |
| ANC-52, ANC-53 (BUS) | Post-booking immutability; downstream reflection | TC-ANC-002…005, TC-ANC-019…021, TC-ANC-024…026, TC-ANC-034, TC-ANC-035 | Covered |
| ANC-55, ANC-56, ANC-57 (BUS) | Shared rule engine/Markup; 3-part wallet; Admin reports | TC-ANC-004, TC-ANC-005, TC-ANC-011, TC-ANC-016, TC-ANC-025…027, TC-ANC-034 | Partially Covered |

## 5. Test Scenarios

**By module:**

| Module | Total | Atomic | Scenario | E2E | Positive | Negative | Exploratory |
|---|---|---|---|---|---|---|---|
| ancillaries/air-india | 27 | 18 | 3 | 6 | 24 | 1 | 2 |

**By dimension (§7, §17):**

| Dimension / Negative Subtype | Case Count |
|---|---|
| Positive Scenarios | 24 |
| Boundary Testing | TC-ANC-009, TC-ANC-034, TC-ANC-035 (3) |
| Validation Rules | Not Applicable — moved out of Ancillaries scope (TC-ANC-028 removed 2026-09-28, see §8) |
| Business Rules | TC-ANC-010, TC-ANC-011, TC-ANC-012, TC-ANC-014, TC-ANC-015, TC-ANC-016, TC-ANC-018 (7) |
| Error Handling | Not Applicable — no documented error-message contract exists in Project Context for these flows; a dedicated error-handling dimension pass is a Coverage Gap, see §8 |
| Permissions | Not Applicable — no distinct role/permission model is documented for Ancillaries beyond Admin vs. Agency login, already exercised structurally by every Admin- and Portal-tagged case |
| Configuration | Not Applicable — moved out of Ancillaries scope (TC-ANC-013, TC-ANC-017 removed 2026-09-28, see §8) |
| Regression Impact | TC-ANC-002…005 — new BOM-COK scope (TC-ANC-003/004) plausibly affects the existing DEL-DXB regression baseline (TC-ANC-002/005); assessed, no additional case needed beyond the matrix cases themselves |
| Integration Behaviour | TC-ANC-002…005 (full six-checkpoint chain incl. supplier retrieve endpoint), TC-ANC-014 (Bundle + individual ancillaries), TC-ANC-022, TC-ANC-034, TC-ANC-035 (system UI + supplier retrieve endpoint) |
| Invalid Inputs | Not Applicable — moved out of Ancillaries scope (TC-ANC-028 removed, see §8) |
| Empty Values | Not Applicable — moved out of Ancillaries scope (TC-ANC-028 removed, see §8) |
| Unicode | Not Applicable — moved out of Ancillaries scope (TC-ANC-030 removed, see §8) |
| Special Characters | Not Applicable — moved out of Ancillaries scope (TC-ANC-030 removed, see §8) |
| Security Inputs | Not Applicable — no field in this Feature's scope handles data in a security-sensitive context (e.g. credentials, payment card entry) beyond what Wallet/Banque Misr already restrict to configuration, not free text |
| Timeouts | Not Applicable — no environment capable of inducing a controlled slow/hung response was available this pass; recommended as a follow-up (§10) |
| Exploratory Recommendations | TC-ANC-023, TC-ANC-027 (2) |

## 6. Manual Test Cases

| Module | Markdown | Excel | Case Count |
|---|---|---|---|
| ancillaries/air-india | `test_design/TestCases_Ancillaries_AirIndia.md` | `test_design/TestCases_Ancillaries_AirIndia.xlsx` | 27 |
| **Total** | | | **27** |

## 7. Assumptions

| Assumption ID (Project Context) | Assumption | Test Case ID | Tag |
|---|---|---|---|
| ANC-13-carry | Application Level defaults are a platform-wide expectation, not a substitute for per-Supplier verification | TC-ANC-002, TC-ANC-004 | Assumption-based |
| ANC-41-carry | Adult/Child-only eligibility is a platform-wide default, still verified per Supplier | TC-ANC-006, TC-ANC-007 | Assumption-based |
| Testing-layer-gap | DB, Security, and Performance layers — Deferred, not addressed this run | — | Not applicable to this suite (Deferred by decision, `SupplierChecklist.md` §2b) |

## 8. Coverage Gaps

| Gap Type | ID | Reason | Smallest Unblocking Prerequisite |
|---|---|---|---|
| Partially Covered | ANC-42 (ROE) | This run's own ROE reconciliation was kept as a conversation note, not filed as a Discovery Finding, per explicit user instruction | Formalize the ROE reconciliation as a Discovery Finding if a future session wants full Covered status, or accept Partially Covered as-is |
| Partially Covered | ANC-47 | Before-booking change/removal was confirmed at original business intake (2026-09-23), not independently re-verified by this run's own Discovery | Re-verify live in a future Discovery pass, or accept the intake-level confirmation as sufficient |
| Partially Covered | ANC-54…58 (all of Admin's new scope) | Every remaining Admin Finding (013, 015, 016, 017) rests on user-supplied screenshots (Human Observation/Static Artifact) — this evidence tier can never reach `Confirmed` regardless of Project Context now backing the requirements | Re-verify FINDING-013, 015, 016, 017 live — browser automation, or the agreed retrieve-endpoint approach — to move the underlying Findings, and this coverage, to `Confirmed`/Covered |
| Partially Covered | ANC-19…21 (Portal search, selection, PAX Details) | Negative/boundary/Unicode validation of this flow (formerly TC-ANC-028/029/030) was reclassified as general-booking scope, not Ancillaries-specific, and removed 2026-09-28 | Pick up as part of a future general-booking Feature test design, if the business wants it tested |
| Unknown / Unassessed | TC-ANC-009's Infant-per-Adult limit | Not itself stated as a Project Context requirement — a common airline norm, not a confirmed platform rule | Ask the business whether a 1:1 Infant-to-Adult limit is an intended rule; if yes, record it as a new ANC-xx in the next Project Context revision |
| Unknown / Unassessed | Multi-city support for AirIndia | The user stated 2026-09-28 that Multi-city is not supported for AirIndia, but this was never recorded in `SupplierChecklist.md` or either Project Context's Out-of-Scope section; its confirmation case (TC-ANC-031) was itself removed 2026-09-28 as general-booking scope | Record this fact in AirIndia's `SupplierChecklist.md` §5c and `ProjectContext.md` §3 during the next Stage 1 revision; pick up a confirmation case in a future general-booking Feature test design if desired |
| Unknown / Unassessed | Round-trip Baggage scoping (once-for-the-trip vs. once-per-direction) | Introduced 2026-09-28 by restructuring TC-ANC-003/005 into E2E cases — Discovery has only ever exercised one-way Baggage selection (FINDING-002); the round-trip behavior has never been observed | Execute TC-ANC-003 or TC-ANC-005 in Stage 4M and record what is actually observed; file a new Finding if it contradicts ANC-48's Per-Journey default |
| Unknown / Unassessed | TC-ANC-034, TC-ANC-035 | Both are newly designed 2026-09-28 for combinations (zero ancillaries selected; onward-leg-only selection) never exercised in Discovery — no Discovery Reference exists to validate either | Execute both in Stage 4M; disposition any unexpected behavior as a new Finding rather than assuming the design's Expected Result is correct |
| Blocked (execution, not design) | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005, TC-ANC-034, TC-ANC-035 | User reported 2026-09-28 that the supplier could not return search results for 2 Adult + 2 Child + 2 Infant on these routes during a prior execution attempt | All six now instruct a fallback to 1 Adult + 1 Child + 1 Infant if the 2/2/2 mix returns no results; record which passenger count actually returned results, since this shrinks the eligibility/checkpoint evidence these cases can produce (e.g., TC-ANC-009's 2-Infant boundary check cannot be satisfied by a 1/1/1 fallback booking) |
| Resolved (2026-09-28) | TC-ANC-022 | Postman request location shared: the retrieve-endpoint request in the user's Postman workspace (`My-Workspace`, request ID `42582452-f99943c7-432e-4c6f-8985-1886fe136368`) — see the case's own Preconditions for the link | No longer blocked at the "where is it" level. Stage 4M still needs the requester's own Postman workspace access (or the exported request JSON) to actually call it |
| Blocked (execution, not design) | TC-ANC-026 | FINDING-012's Statement report defect is still open on both channels | Fix the Statement report defect, then unblock this case for execution |
| Out-of-Scope | ANC-01…09, ANC-37…41 | Discovery/Capability-governance process rules — not user-facing application behavior a manual test case executes | None — correctly excluded, not a gap |
| Out-of-Scope | ANC-26, ANC-51 | Environment/infrastructure facts already confirmed at Discovery, not independently re-tested by a functional case | None — correctly excluded, not a gap |
| Out-of-Scope (removed 2026-09-28) | TC-ANC-013, TC-ANC-017, TC-ANC-028, TC-ANC-029, TC-ANC-030, TC-ANC-031, TC-ANC-032, TC-ANC-033 | User-identified as general booking scope, not Ancillaries-specific: Service Charge/Discount display (FINDING-003/014, now Documented Exception), Agency/Agent wallet routing, search/PAX-details negative & boundary validation, Unicode/special-character handling, Multi-city confirmation, Admin booking-cycle parity, cross-channel offer-price parity | None — correctly excluded from this suite; recommend a future general-booking Feature test design if the business wants these tested |

## 9. Risks

**High / Critical:**

| Risk Level | Test Case ID(s) | Statement |
|---|---|---|
| High | TC-ANC-002, TC-ANC-003, TC-ANC-004, TC-ANC-005 | Core six-checkpoint E2E flow. TC-ANC-003/004 run on a brand-new route (BOM-COK) with zero prior Discovery evidence; TC-ANC-002/005 run on DEL-DXB, which matches Discovery's own evidenced route. All four now also carry the round-trip Baggage-scoping open question (003/005) or the supplier availability fallback (all four — see §8) |
| High | TC-ANC-010, TC-ANC-012 | Pricing/currency-conversion arithmetic errors directly affect customer billing |
| High | TC-ANC-015, TC-ANC-016 | Wallet deduction timing/amount errors are a direct financial risk, on both channels |
| High | TC-ANC-019, TC-ANC-020, TC-ANC-021 | Post-booking immutability and downstream reflection are the customer's contractual record |
| High | TC-ANC-022 | The newly-agreed retrieve-endpoint methodology is the primary defense against silent persistence defects (see the 800 INR gap noted in TC-ANC-023) |

**Medium-risk additions from the 2026-09-28 restructuring:**

| Risk Level | Test Case ID(s) | Statement |
|---|---|---|
| Medium | TC-ANC-034 | Zero-ancillary booking is a boundary the original route/stop-sweep cases never exercised — a silent non-zero charge here would be a billing defect |
| Medium | TC-ANC-035 | Asymmetric per-leg ancillary selection is untested territory; also resolves whether Baggage can be scoped per-direction at all |

**All risks:**

| Risk Level | Count |
|---|---|
| High | 12 |
| Medium | 10 |
| Low | 5 |

## 10. Recommendations

| ID | Recommendation | Rationale |
|---|---|---|
| REC-TD-001 | Re-verify FINDING-013 through FINDING-017 live (browser automation or the retrieve-endpoint approach) to close the Partially Covered gap on ANC-54…58 | These Findings are capped below `Confirmed` purely by evidence tier, not by any doubt about correctness |
| REC-TD-002 | Resolved 2026-09-28 — Postman request location shared for TC-ANC-022 | Confirm workspace access works at execution time; if not, request the exported request JSON as a fallback |
| REC-TD-009 | Every retrieve-endpoint fare comparison (TC-ANC-022 and the retrieve-endpoint step of TC-ANC-002/003/004/005/034/035) must apply ROE conversion (ANC-42) AND add the per-passenger Markup (ANC-55) before comparing against the system — a raw equality is expected to fail and is not itself a defect | User clarification 2026-09-28: the supplier's retrieve response reflects the raw supplier fare before Markup, since Markup is a platform-side rule-engine addition the supplier is never told about |
| REC-TD-003 | Record AirIndia's Multi-city Unsupported status in `SupplierChecklist.md` and both Project Contexts | Currently only stated in conversation; its confirmation case (TC-ANC-031) was removed 2026-09-28 as general-booking scope, so no test case in this suite traces to it anymore |
| REC-TD-004 | Decide whether a 1:1 Infant-to-Adult limit is an intended platform rule | TC-ANC-009 tests a common airline norm that isn't yet a confirmed requirement |
| REC-TD-005 | Consider a Timeouts-dimension follow-up once an environment capable of inducing a slow/hung backend response is available | This pass recorded Timeouts as Not Applicable for lack of such an environment, not because it doesn't matter |
| REC-TD-006 | Resolve FINDING-003/FINDING-014's open question in a future general-booking Feature test design | Deferred as a Documented Exception 2026-09-28 (TC-ANC-013 removed) — affects whether future test cases should expect Service Charge/Discount as separate line items |
| REC-TD-007 | Scope a general-booking Feature test design pass for the 8 cases removed from this suite 2026-09-28 (TC-ANC-013, 017, 028, 029, 030, 031, 032, 033) | These were identified as testing general booking-cycle behavior (search validation, Agency/Agent wallet routing, Unicode/boundary input handling, Multi-city, cross-channel offer-price parity, Admin booking-cycle parity) rather than Ancillaries-specific behavior — removed from consideration here, not resolved |
| REC-TD-008 | Execute TC-ANC-003 or TC-ANC-005 early in Stage 4M and record whether round-trip Baggage is scoped once-for-the-trip or once-per-direction | This question did not exist before the 2026-09-28 restructuring — Discovery has only ever observed one-way Baggage selection (FINDING-002) |

## 11. Review & Automation

| Column | Pending | Approved | Rejected |
|---|---|---|---|
| **Review** | 1 | 27 | 0 |
| **Automation** | 28 | 0 | 0 |

| Decision | Count | Test Case IDs |
|---|---|---|
| `Review = Approved` — executable by Stage `4M` | 27 | TC-ANC-001 … TC-ANC-025, TC-ANC-027, TC-ANC-034, TC-ANC-035, TC-ANC-036 (TC-ANC-013, 017, 028, 029, 030, 031, 032, 033 removed 2026-09-28 — not part of this suite) |
| `Review = Rejected` — excluded, reason `Rejected at Review` | 0 | — |
| `Review = Pending` — excluded, reason `Pending Review` | 1 | TC-ANC-026 — held Pending on the user's explicit instruction, FINDING-012's Statement defect confirmed still open 2026-09-28 |
| `Review = Approved AND Automation = Approved` — in scope for Stage `4A` | 0 | — |
| `Review = Approved AND Automation = Rejected` — manual by decision | 0 | — |

**Reviewer approval note (2026-09-28):** 26 of 27 cases' `Review` column set to `Approved` by Ahmed Alhussieny, following the Stage 3 artifact-level approval. TC-ANC-026 was initially bulk-approved in error and corrected back to `Pending` the same day — its Statement report defect (FINDING-012) is confirmed still open, so it stays outside Stage 4M's executable scope until fixed. `Automation` intentionally left `Pending` on all 27 — this is a manual-execution-only pipeline (`PROJECT_STATE.md` §1), and per Execution Rule 22 of `manual-execution-skill`, the `Automation` column is never read by Stage `4M` anyway.

**Revision 7 note (2026-10-03):** TC-ANC-036 added directly with `Review = Approved` — a user-directed
ad-hoc verification, already executed with a proposed Passed result (`manual_execution/artifacts/TC-ANC-036/00_execution_log.md`)
before being formally accepted back into the suite, so there was no separate pre-execution review gate
to apply. `Automation` left `Pending`, same reasoning as every other case in this suite.

**Inconsistent pairs:** None.

## 12. Inputs for Both Branches

| Required Input | Present? | Location / Note |
|---|---|---|
| Project Context (Governing) | Yes | `suppliers/air-india/context/ProjectContext.md` rev 3 + shared baseline rev 4, both Approved 2026-09-28 |
| Manual Test Suite (Primary) | Yes | `test_design/TestCases_Ancillaries_AirIndia.md` (+ `.xlsx` once exported) |
| Requirement Traceability Matrix (Secondary) | Yes | `test_design/TraceabilityMatrix.md` |
| Coverage Report (Secondary) | Yes | This document |
| Discovery Artifacts (Secondary) | Yes | `discovery/QA_Assessment_Report.md` rev 8, `Timeline.md`, `Coverage_Summary.md` rev 2 |
| Findings (Secondary) | Yes | `discovery/findings/Findings_Summary.md` (17 Findings, all dispositioned — §3 of the Traceability Matrix) |
| Evidence Packages (Secondary) | Yes | Cited by specific file per Finding in the Traceability Matrix — never the Finding as a whole |

**Handoff confirmation:** Every input both Stage `4M` and Stage `4A` declare they need is present and specific. One execution-time (not design-time) prerequisite remains open, named above rather than silently assumed: FINDING-012's Statement report fix (blocks TC-ANC-026, confirmed still open 2026-09-28). The Postman request location for TC-ANC-022 was resolved 2026-09-28. Neither blocks approval of this Test Design output itself — both are Stage 4 execution concerns.
