# Coverage Report — run-002__2026-08-03_10-26-17__UserStory__US-8605CreateBranch

| Field | Value |
|---|---|
| Module | `branch` |
| Produced by run | `run-002__2026-08-03_10-26-17__UserStory__US-8605CreateBranch` |
| Revision | 3 (in place — 2026-08-10: TC-BR-026 moved to `Blocked — Needs Clarification` per FINDING-016, so Warning Prompt's 11-digit rule is now an open coverage gap; Credit Terms' 7-digit cap documented and TC-BR-082 added for it. Revision 2: RISK-BR-2/TC-BR-027 assumption resolved; TC-BR-026 re-isolated from the confirmed cross-field rule) |
| Generated | 2026-08-03 |
| Status | Approved — Test Design closed 2026-08-03 with 31/39 test cases Approved, 8 Rejected (module owner decision — Rejected cases retained in the suite, out of Stage 4 scope) |

## 1. Run Scope

| Field | Value |
|---|---|
| Run Scope Type / Source | User Story / `PRD_UserStories.md` User Story 5 (US 8605), extended by User Story 6 (US 51489) for the Outstanding Threshold field per confirmed traceability |
| Run Type | User Story |
| Project Context | `modules/branch/context/ProjectContext.md` (revision 4, Approved) |

Per the User Story strategy (§16): test design is scoped to US 8605's enumerated acceptance criteria plus the one field (Outstanding Threshold) the module owner confirmed traces to US 51489 §2. No broader wandering into adjacent Branch functionality (e.g. Search Branch, full Booking/Staff/Agency reflection) was undertaken — those remain out of scope per `ProjectContext.md` §3.

## 2. Requirements Covered

| Requirement ID | Summary | Test Case ID(s) |
|---|---|---|
| US5 §Branch Details | Operating Country, Branch Name, Country auto-fill, State/City cascade, Address 1/2, Post Office Box, Phone Number, Service Tax/ABTA Number | TC-BR-001–011 |
| US5 §Branch Email Configuration | Branch Email ID, Email Password | TC-BR-012–015 |
| US5 §Branch Contact Info | Contact Name, Email ID, Phone Number, Add button | TC-BR-016–019 |
| US5 §Branch Sales Configuration | Target/Month/Year + Add Target, Credit Limit, Top-Up Limit, Credit Terms, Reaching Percentage, Warning Prompt, Payment Option | TC-BR-020–028 |
| US5 §Product Access Details | Grid columns, Description rule, GDS sub-grid, PCC removal | TC-BR-029–033 |
| US5 §Buttons & Actions | Submit for Approval, Cancel | TC-BR-034–036 |

**Coverage Percentage: 6/13 in-scope requirement groups = 46%** (computed against Covered only, per §8.3)

| Category | Count |
|---|---|
| Covered | 6 |
| Partially Covered | 1 |
| Out-of-Scope | 5 |
| Unknown / Unassessed | 1 |
| Uncovered | 0 |

**Reading this percentage:** the low headline figure reflects that 5 of the 13 assessed requirement groups were deliberately excluded this run — not missed. Of the 8 groups that were actually in scope for this pass (6 Covered + 1 Partially Covered + 1 Unknown/Unassessed), 7 received substantive test design; only US6 §4 (deferred per explicit user instruction) received none. See §8 for the full accounting.

## 3. Coverage Matrix

| Requirement ID | Test Case ID(s) | Status |
|---|---|---|
| US5 §Branch Details | TC-BR-001–011 | Covered |
| US5 §Branch Details — PAN Number | — | Out-of-Scope |
| US5 §Branch Email Configuration | TC-BR-012–015 | Covered |
| US5 §Branch Contact Info | TC-BR-016–019 | Covered |
| US5 §Branch Contact Info — Department | — | Out-of-Scope |
| US5 §Branch Sales Configuration | TC-BR-020–028 | Covered |
| US5 §Branch Sales Configuration — Payment Gateway | — | Out-of-Scope |
| US5 §Product Access Details | TC-BR-029–033 | Covered |
| US5 §Product Access Details — Flight default | — | Out-of-Scope |
| US5 §Import PNR | — | Out-of-Scope |
| US5 §Buttons & Actions | TC-BR-034–036 | Covered |
| US6 §2 Branch Module | TC-BR-037–039 | Partially Covered |
| US6 §4 Branch Threshold Update | — | Unknown / Unassessed |

## 4. Business Rules

No requirement in `ProjectContext.md` for this module is stated with a `BR-`prefixed ID — Branch's requirements are cited by User Story section (US5/US6), not a formal FR/BR/SR numbering scheme (consistent with how Discovery's own Findings cite them). The following AC items function as business rules and are called out here for auditability:

| Business Rule (cited by AC text) | Rule | Test Case ID(s) | Status |
|---|---|---|---|
| Post Office Box length | Max 8 alphanumeric characters | TC-BR-007, TC-BR-008 | Covered (TC-BR-008 currently fails against observed behavior — regression pending fix) |
| Credit Limit numeric + length | Numeric only, max 15 characters | TC-BR-022, TC-BR-023 | Covered (TC-BR-023 currently fails against observed behavior — regression pending fix) |
| Reaching Percentage cap | Must not exceed 100%, up to 3 decimal places | TC-BR-024, TC-BR-025 | Covered |
| Warning Prompt length + cross-field | Max 11 digits, must not be greater than Credit Terms (Days) | TC-BR-026, TC-BR-027 | **Partially covered (changed 2026-08-10).** The cross-field half is covered by TC-BR-027 (confirmed enforced via module-owner evidence, not yet formally executed). **The 11-digit length half is NOT covered** — TC-BR-026 is `Blocked — Needs Clarification` (FINDING-016): Credit Terms(Days)'s 7-digit cap makes its Test Data illegal and no legal substitute exists, so it contributes no result at all. Previously reported as Covered-but-failing; a blocked case is a coverage gap, not a failing one |
| Add Target gating | Add Target enabled only once Target Amount, Month, Year are all entered | TC-BR-020 | Covered |
| Description enable/mandatory rule | Description enabled and mandatory only once a Supplier row is selected | TC-BR-030, TC-BR-031 | Covered |

## 5. Test Scenarios

**By module:**

| Module | Total | Atomic | Scenario | E2E | Positive | Negative | Exploratory |
|---|---|---|---|---|---|---|---|
| branch | 39 | 36 | 3 | 0 | 22 | 17 | 0 |

**By dimension (§7, §17):**

| Dimension / Negative Subtype | Case Count |
|---|---|
| Positive Scenarios | 22 |
| Negative — Empty Values | 6 (TC-BR-002, 013, 017, 021, 031, 038) |
| Negative — Special Characters | 2 (TC-BR-003, 018) |
| Negative — Invalid Inputs | 3 (TC-BR-010, 022, 027) |
| Negative — Boundary Values | 5 (TC-BR-008, 015, 023, 024, 026) |
| Negative — UI Label | 1 (TC-BR-035) |
| Boundary (positive-tagged) | 3 (TC-BR-007, 014, 025) |
| Regression (Finding-derived) | 4 (TC-BR-008, 023, 026, 035) |
| Assumption-Based | 2 (TC-BR-027, 038) |
| Expected Implementation | 3 (TC-BR-037, 038, 039) |
| Unicode | 0 — Not Applicable this pass. Discovery did not test Unicode input on any Branch field, and no AC states Unicode-specific behavior; recommended as future exploratory coverage (§10) rather than invented here. |
| Security Inputs (SQLi/path traversal/header injection) | 0 — Not Applicable this pass. No field in US 8605/US 51489 is described as security-sensitive beyond standard input validation already covered by Invalid Inputs/Special Characters; a dedicated security probe was not designed to avoid inventing scope beyond the AC. |
| Timeouts | 0 — Not Applicable. This run's environment/tooling has no mechanism to induce a slow/hung backend response; recorded as Not Applicable rather than silently skipped. |
| Permissions | 0 — Not Applicable this pass. `ProjectContext.md` §4 names only Super Admin for this run; no second role/credential is available to design an access-control comparison case against. |
| Configuration | 0 — Not Applicable. No feature-flag/config-toggle is documented in `ProjectContext.md` for Branch creation. |
| Regression Impact (proactive, beyond Finding-derived) | 0 — Not Applicable this pass. A User Story-scoped run per §16 does not proactively assess impact on other, previously-tested requirements outside its own AC; none was identified as plausibly affected. |
| Integration Behaviour | 1 (TC-BR-032 — Supplier-selection-triggers-sub-grid interaction) |

## 6. Manual Test Cases

| Module | Markdown | Excel | Case Count |
|---|---|---|---|
| branch | `test_design/TestCases_Branch.md` | `test_design/TestCases_Branch.xlsx` | 39 |
| **Total** | | | **39** |

## 7. Assumptions

| Assumption ID (Project Context) | Assumption | Test Case ID | Tag |
|---|---|---|---|
| ~~RISK-BR-2 (Warning Prompt < Credit Terms half)~~ | **Resolved 2026-08-03** — confirmed enforced via module-owner-supplied evidence; no longer assumption-based | TC-BR-027 | Removed — see §6/§9 of QA_Assessment_Report.md |
| ~~New (Test Design, 2026-08-03)~~ | ~~Child Agencies Threshold Amount ("Outstanding Threshold") is Mandatory, per the live UI's asterisk~~ — **Retired 2026-08-15:** the assumption was never testable through the UI. The application pre-fills the field with a default value on form open, so it is never presented empty and the Mandatory rule cannot be exercised. TC-BR-038 was revised to cover the observable behavior (field opens pre-filled); the Mandatory/Optional question remains open as a Coverage Gap in §8. | TC-BR-038 | Removed — AssumptionBased no longer applies |

ASM-BR-1 and ASM-BR-2 (unstated validation-message wording; Address 1/2 character-set behavior) are carried forward implicitly across the relevant test cases' Expected Result wording (stated as observable outcomes, not exact message text where unconfirmed) rather than as their own dedicated assumption-tagged cases, since no single case isolates them alone.

## 8. Coverage Gaps

| Gap Type | ID | Reason | Smallest Unblocking Prerequisite |
|---|---|---|---|
| Out-of-Scope | PAN Number (US5 §Branch Details) | Confirmed absent from the live UI; ignored per explicit module-owner direction (FINDING-008) | None — deliberately excluded, not a gap to close |
| Out-of-Scope | Department (US5 §Branch Contact Info) | Confirmed absent from the live UI; ignored per explicit module-owner direction (FINDING-009) | None — deliberately excluded, not a gap to close |
| Out-of-Scope | Payment Gateway conditional dropdown (US5 §Branch Sales Configuration) | Outdated Requirement, confirmed by module owner (FINDING-007) | None — deliberately excluded, not a gap to close |
| Out-of-Scope | Flight backend-only default (US5 §Product Access Details) | Outdated Requirement, confirmed by module owner (FINDING-006) | None — deliberately excluded, not a gap to close |
| Out-of-Scope | Import PNR "always checked" (US5 §Import PNR) | Confirmed intended feature (unchecked default); US 8605's wording is outdated with no replacement requirement stated (FINDING-005) — the current behavior is recorded as an Observation, not converted into a requirement, per explicit instruction | If a replacement requirement is authored describing Import PNR's intended current behavior, Test Design can then design a case against it |
| Unknown / Unassessed | US6 §4 Branch Threshold Update (confirmation-popup flow) | Deferred per explicit user instruction (2026-08-03) — "can remain as future work unless they become required to design or execute a test case." No test case in this suite depends on it. | Run Discovery against the Branch Threshold Update flow (update an existing Branch's threshold with child agencies holding custom values), then re-run Test Design for this item |
| Partially Covered | US6 §2 Branch Module — Mandatory/Optional status | US 51489 §2 does not state whether Child Agencies Threshold Amount is Mandatory or Optional, and the rule is not observable: the application pre-fills the field with a default value on form open, so no UI path presents it empty (revised 2026-08-15 — TC-BR-038 no longer claims to cover this) | Confirm with Product/Business whether the field is intended to be Mandatory, and what the default value is meant to be; update US 51489 §2 or `ProjectContext.md` §6 accordingly |
| Partially Covered | US6 §2 Branch Module — format constraints | US 51489 §2 states no length/decimal/format rule for Child Agencies Threshold Amount, unlike every other numeric field in US 8605 | Confirm with Product/Business the intended format constraints (if any); a boundary test case can then be designed without inventing a rule |
| Partially Covered | US5 §Branch Details — Operating Country→State/City cascade | Not independently verified in Discovery (OQ-BR-1); TC-BR-004/005/006 are designed but unexecuted against live master data | Execute TC-BR-004/005/006 against real Operating Country/State/City master data during Stage 4M/4A — no Stage 1–3 rework needed |
| Partially Covered | US5 §Product Access Details — GDS sub-grid | Blocked during Discovery (Coverage_Summary.md §5) — no GDS-type supplier row was checked; TC-BR-032/033 designed but unexecuted | Execute TC-BR-032/033 against a live GDS-type supplier row during Stage 4M/4A — no Stage 1–3 rework needed |

**Uncovered Requirements: 0. Uncovered Findings: 0** (see Traceability Matrix §3 — all 11 Findings dispositioned).

## 9. Risks

**High / Critical:** none.

**All risks:**

| Risk Level | Count |
|---|---|
| Critical | 0 |
| High | 0 |
| Medium | 3 (TC-BR-008, TC-BR-023, TC-BR-026 — inherited from FINDING-002/003/004) |
| Low | 36 |

## 10. Recommendations

| ID | Recommendation | Rationale |
|---|---|---|
| REC-TD-1 | Confirm with Product/Business whether Child Agencies Threshold Amount is Mandatory or Optional, and its intended format constraints | Closes the two Partially Covered items on US6 §2 (Coverage Gaps §8) without this skill inventing a business rule |
| REC-TD-2 | Author a replacement requirement describing Import PNR's current intended behavior (now a user-controlled toggle, not "always checked") | US 8605's wording is confirmed outdated; without a replacement statement, this behavior can only be recorded as an Observation, never tested as a requirement |
| REC-TD-3 | When ready, run Discovery against US6 §4's Branch Threshold Update confirmation-popup flow, then extend this suite | Explicitly deferred this pass per user instruction; no blocker exists beyond scheduling |
| REC-TD-4 (Exploratory Recommendation, §17) | Consider a scoped exploratory charter for Unicode/emoji input across Address 1/2, Branch Email ID, and Contact Name, rather than a fixed pass/fail case | US 8605 states "free text, all character input" for several fields with no stated rejection behavior — genuinely ambiguous what "pass" means for non-ASCII input without inventing a rule |

## 11. Review & Automation

*(Section renamed from "Automation Candidates" per the 2026-08-01 Test Design skill revision — the advisory candidate list is retired in favor of the two binding columns on each test case — and renamed again 2026-08-07 to the canonical umbrella heading `Review & Automation` (`test-design-skill` §18 #11), since it covers both.)*

> **Point-in-time record — as at run-002.** The figures below describe the suite as it stood when this run's Coverage Report was written (39 cases, review not yet started). They are **not** the current state: the suite has since grown to 81 cases and the reviewer's decisions have been imported. For the current roll-up see the run-003 section's **§11 Review & Automation** below, which is this document's live figure.

Every test case in this suite carries `Automation: Pending` — no automation decision has been made for any of the 39 cases yet, since none has completed human Review.

| Automation Value | Count |
|---|---|
| Pending | 39 |
| Approved | 0 |
| Rejected | 0 |

No case is in scope for Stage `4A` yet: automation requires `Review = Approved AND Automation = Approved` (test-design-skill §6.3.2), and every case here is still `Review: Pending`.

## 12. Inputs for Both Branches

| Required Input | Present? | Location / Note |
|---|---|---|
| Project Context (Governing) | Yes | `modules/branch/context/ProjectContext.md` (revision 4, Approved) — unchanged pass-through |
| Manual Test Suite (Primary) | Yes | `test_design/TestCases_Branch.md` + `.xlsx` (generated after export, see below) |
| Requirement Traceability Matrix (Secondary) | Yes | `test_design/TraceabilityMatrix.md` — every case carries Requirement/Discovery/Finding/Evidence/Acceptance Criteria/Run Scope References |
| Coverage Report (Secondary) | Yes | This file |
| Discovery Artifacts (Secondary, for Stage 4A selector detail) | Yes | `discovery/DiscoverySnapshot_CreateBranch.md`, `discovery/Coverage_Summary.md`, `discovery/QA_Assessment_Report.md` — all Approved |
| Findings (Secondary) | Yes | `discovery/findings/Findings_Summary.md` + individual `metadata.md` files — all 11 dispositioned (§3 of Traceability Matrix) |
| Evidence Packages (Secondary) | Yes | Cited specifically per Finding-derived test case (TC-BR-008, 023, 026, 035, 037–039) — never the Finding as a whole |

**Handoff confirmation:** Every input both `manual-execution-skill` §4 and `automation-skill` §4 declare as needed is present and specific. No Discovery/Finding/Evidence Reference in the Traceability Matrix is a bare "see Discovery" — each cites a specific file and, where applicable, a specific section or evidence file. The Excel workbook (`TestCases_Branch.xlsx`) must still be generated via `platform_core/tools/test_suite_export/cli.js` before this handoff is fully satisfied per §9.1 — recorded as the one remaining mechanical step, not a content gap.

---

# Coverage Report — run-003 (US 8599 Search & Actions Branch + US 8606 Update Branch)

| Field | Value |
|---|---|
| Module | `branch` |
| Produced by run | `run-003__2026-08-04_11-24-38__UserStory__US-8599-SearchActions_US-8606-UpdateBranch` |
| Project Context | `modules/branch/context/ProjectContext.md` Revision 8 (Approved) |
| Generated | 2026-08-04 |
| Status | Pending Review |

## 1. Run Scope

**Run Scope Type:** User Story · **Run Type:** User Story · **Source:** Pasted text (`PRD_UserStories.md` User Story 7 and User Story 8).

Designed against **ProjectContext.md Revision 8**, with Discovery Approved 2026-08-04. Per §16's User Story strategy: at minimum one case per enumerated acceptance criterion, no wandering into adjacent coverage, and every carried-forward Assumption/Risk given its own explicitly tagged case.

**Suite extended in place.** run-002's 39 Create Branch cases (TC-BR-001…039) are unchanged. run-003 adds **42 cases, TC-BR-040…081**, bringing the module suite to 81.

## 2. Requirements Covered

| Requirement area | Cases |
|---|---|
| US 8599 §Search & Filtering | TC-BR-040, 041, 042, 044, 046, 047, 048, 049, 050, 051, 064, 079 |
| US 8599 §Search Result Grid | TC-BR-043, 052, 053, 078 |
| US 8599 §Actions & Functionalities | TC-BR-054, 055, 056, 057, 058, 059, 060, 061, 062, 063 |
| US 8599 §Business Rules | TC-BR-044, 045, 046, 047 |
| US 8606 §Branch Details / Sales Configuration | TC-BR-071, 072, 073, 074, 075 |
| US 8606 §Buttons & Actions | TC-BR-066, 067, 068, 069, 070 |
| US 8606 §Description (pre-fill) | TC-BR-055, 065 |
| US 51489 §4 Branch Threshold Update | TC-BR-076 |
| Credential handling (ProjectContext §5) | TC-BR-077 |
| Role boundary (ProjectContext §4) | TC-BR-080 |

## 3. Coverage Matrix

Consolidated view; full per-case detail in `TraceabilityMatrix.md`.

| Requirement | Test Case IDs | Status |
|---|---|---|
| Branch Code filter | TC-BR-040, 048 | Covered |
| Branch Name filter | TC-BR-041, 049, 050, 051 | Covered |
| Country / State / City filters + cascade | TC-BR-046, 047, 079 | **Partially Covered** — multi-city application is Exploratory, pending FINDING-015 |
| Status filter (Inactive/Active/Both) + default | TC-BR-044, 045 | Covered |
| Search button / result set | TC-BR-042, 043, 064 | Covered |
| Grid displayed columns | TC-BR-052, 053 | **Partially Covered** — State column asserted but currently absent (FINDING-012) |
| Active/Inactive visibility in grid | TC-BR-078 | **Partially Covered** — Exploratory, pending FINDING-014 |
| Edit action | TC-BR-055, 065 | Covered |
| Approve / Reject actions | TC-BR-054, 056, 057, 058, 069, 070 | Covered |
| Self-approval (XC-06) | TC-BR-059 | Covered |
| Pagination | TC-BR-060, 061, 062, 063 | Covered |
| Update field groups + validation | TC-BR-071, 072, 073, 074, 075 | Covered |
| Update Remarks mandatory | TC-BR-067 | Covered |
| Update Submit / Approve / Reject / Cancel | TC-BR-066, 068, 069, 070 | Covered |
| Branch Threshold Update popup | TC-BR-076 | Covered |
| Credential handling on re-edit | TC-BR-077 | Covered |
| Role-differentiated behaviour | TC-BR-080 | **Unknown / Unassessed** — not observable with one account |
| Account lockout | TC-BR-081 | **Unknown / Unassessed** — deferred, requires dedicated environment |

**Requirement Coverage: 15/17 Covered = 88%.** 3 Partially Covered, 2 Unknown/Unassessed, 0 Uncovered.

## 4. Business Rules

| Rule | Case(s) |
|---|---|
| Default search status is Active, switchable to Inactive or Both | TC-BR-044, 045 |
| State and City dropdowns depend on Country and State respectively | TC-BR-046, 047 |
| Approving or rejecting a branch updates its status accordingly | TC-BR-056, 057, 069, 070 — and see §8, since which *status* is meant remains open (FINDING-014) |
| Remarks required before any Update action | TC-BR-067 |
| Warning Prompt must be less than Credit Terms | TC-BR-074 |
| Reaching Percentage must not exceed 100% | TC-BR-075 |

## 5. Test Scenarios

**By tier:** 34 Atomic · 8 Scenario · 0 E2E (run-003 additions).

**By dimension (§7 / §17):**

| Dimension | Cases | Notes |
|---|---|---|
| Positive Scenarios | 21 | |
| Boundary Values | TC-BR-072, 073, 075 | |
| Empty Values | TC-BR-067, 071 | |
| Invalid Inputs | TC-BR-043, 074 | |
| Unicode | TC-BR-050 | |
| Special Characters | TC-BR-049 | |
| Security Inputs | TC-BR-051, 077 | |
| Timeouts | — | **Not Applicable** — no timeout-sensitive behaviour is documented for search or update in either story, and the environment offers no supported way to induce one. |
| Business Rules | TC-BR-044…047, 067, 074, 075 | |
| Error Handling | TC-BR-043 | Empty-state message is the only documented error response for these screens |
| Permissions | TC-BR-059, 080 | |
| Configuration | — | **Not Applicable** — neither story documents a feature flag or config toggle affecting Search or Update behaviour. |
| Regression Impact | TC-BR-072, 073 | Update re-tests the Create-screen length gaps (FINDING-002/003) on the second screen |
| Integration Behaviour | TC-BR-046, 047, 076 | Geography cascade, and the Branch→Agency threshold inheritance |
| Risk-based Prioritization | applied | TC-BR-059 and TC-BR-077 carry High risk and are P1 |
| Exploratory Recommendations | TC-BR-078, 079 | |

## 6. Manual Test Cases

- `platform_core_data/modules/branch/test_design/TestCases_Branch.md`
- `platform_core_data/modules/branch/test_design/TestCases_Branch.xlsx` — generated by `test_suite_export`, not hand-authored

**Case count: 81** for module `branch` — reconciled across the suite document's Total Test Cases, `TraceabilityMatrix.md` (81 rows), and the exporter's own count (81). No file groups more than one module.

## 7. Assumptions

Assumption-based cases carried forward from ProjectContext.md §6:

| Case | Assumption |
|---|---|
| TC-BR-059 | XC-06 self-approval is *inferred*, never asserted, in the source material — either outcome is a valid result |
| TC-BR-076 | The Branch Threshold Update popup flow was never exercised during Discovery; its behaviour on a branch with no child agencies is unknown |

## 8. Coverage Gaps

| Item | Category | Reason |
|---|---|---|
| Role-differentiated behaviour (TC-BR-080) | Unknown / Unassessed | Only one account exists and it holds Super Admin privileges while standing in for both actors. A privileged account cannot demonstrate an unprivileged view. **Minimal prerequisite: provision an Admin-role credential.** |
| Account lockout (TC-BR-081) | Unknown / Unassessed | Deferred — Requires Dedicated Environment. Locking an account on shared staging would block other teams and is not self-reversing. **Minimal prerequisite: an isolated environment with a disposable account.** |
| Which status "approving updates its status accordingly" refers to | Partially Covered | The Active/Inactive axis is displayed nowhere in the grid (FINDING-014), so no UI surface can evidence a change to it. **Minimal prerequisite: a Product decision on FINDING-014.** |
| Multi-city filter application (TC-BR-079) | Partially Covered | Exploratory pending FINDING-015. **Minimal prerequisite: a Product decision on whether multi-select is intended.** |
| State column (TC-BR-052) | Partially Covered | Case asserts the corrected behaviour; the column is currently absent (FINDING-012). **Minimal prerequisite: a Product decision on whether US 8599's column list or the build is authoritative.** |
| Grid-level Remarks capture (TC-BR-058) | Covered, unvalidated | Discovery could not observe whether the grid action prompts for Remarks without performing an approval. Resolved by executing the case. |

**Uncovered Requirements: 0. Uncovered Findings: 0.**

## 9. Risks

| Risk | Level | Cases |
|---|---|---|
| Stored mail-account password recoverable by any operator who can open the edit screen, over plain HTTP (FINDING-013) | **High** | TC-BR-077 |
| A maker may be able to approve their own change, meaning the maker–checker control does not exist in practice | **High** | TC-BR-059 |
| Operator cannot distinguish Active from Inactive branches in a mixed result set (FINDING-014) | Medium | TC-BR-078 |
| Over-length values reaching storage unchecked on Update (FINDING-002/003) | Medium | TC-BR-072, 073 |
| A threshold change applied without reviewing affected child agencies | Medium | TC-BR-076 |
| Operator cannot distinguish branches sharing a city name across states (FINDING-012) | Medium | TC-BR-052 |

The two High-risk items are both P1 and both sit on the critical path for this run.

## 10. Recommendations

1. **Escalate FINDING-013 ahead of execution.** TC-BR-077 will confirm it, but the finding is already evidenced — the security decision does not need to wait for a test result.
2. **Answer FINDING-014 and FINDING-015 before execution** if possible. Both drive Exploratory cases whose expected result is currently "confirm with the reviewer"; a decision converts them into assertable cases.
3. **Provision an Admin-role credential** to convert TC-BR-080 from Unknown into real coverage, and to give TC-BR-059 the control case it currently lacks.
4. **Exploratory charters:** TC-BR-078 and TC-BR-079 are recorded as exploratory rather than forced into fixed pass/fail assertions, because in both cases the correct expected result is a Product decision this stage cannot make.

## 11. Review & Automation

*(Renamed 2026-08-07 to the canonical umbrella heading (`test-design-skill` §18 #11), since this section covers both lifecycle columns. **Roll-up recomputed 2026-08-07** from the authoritative Markdown suite: the previous table reported `Automation` as 42 Pending / 13 Approved / 26 Rejected, which predated the reviewer's completed pass. No decision was inferred to produce this table — every figure is a count of values already recorded on the cases, read via `parseTestCases.js`.)*

Roll-up across all **81** cases in the module suite. **Review is complete — no case is `Pending`.**

| Column | Pending | Approved | Rejected |
|---|---|---|---|
| **Review** | **0** | **73** | **8** |
| **Automation** | **0** | **32** | **49** |

| Decision | Count | Cases (`TC-BR-…`) |
|---|---|---|
| `Review = Approved` — **executable by Stage `4M`** | 73 | 001–006, 010, 012–013, 016–017, 019, 021–081 |
| `Review = Rejected` — excluded, reason `Rejected at Review` | 8 | 007–009, 011, 014–015, 018, 020 |
| `Review = Approved AND Automation = Approved` — **in scope for Stage `4A`** | 32 | 001–002, 004, 013, 021, 024–026, 028, 030, 037–043, 045–046, 052, 054–058, 060–061, 065–069 |
| `Review = Approved AND Automation = Rejected` — manual **by decision**, *not* an automation coverage gap | 41 | 003, 005–006, 010, 012, 016–017, 019, 022–023, 027, 029, 031–036, 044, 047–051, 053, 059, 062–064, 070–081 |

**Authorized Coverage: 73 ÷ 81 = 90.1%.** Automation scope is 32 ÷ 81 = 39.5% of the suite, and 32 ÷ 73 = 43.8% of the approved cases — the remaining 41 approved cases are deliberately manual, which is a **recorded decision, not a shortfall**.

This run took the **Manual Execution branch (`4M`)**, which gates on `Review` alone and does not read the `Automation` column at all.

**Inconsistent pairs: none.** No case carries `Automation = Approved` with `Review ≠ Approved` (`test-design-skill` §6.3.4). Verified by `node platform_core/tools/test_suite_export/cli.js --module branch --check`, which exits `0`.

## 12. Inputs for Both Branches

**Stage `4M` — Manual Execution** (gates on `Review = Approved`):

| Needs | Present |
|---|---|
| Project Context (governing) | `modules/branch/context/ProjectContext.md` Rev 8, Approved |
| Manual Test Suite | `TestCases_Branch.md` + `.xlsx`, 81 cases |
| Requirement Traceability Matrix | `TraceabilityMatrix.md`, 81 rows, every reference specific |
| Coverage Report | this document |

**Two execution constraints Stage `4M` must honour — both are hard:**

1. **Twelve cases require a self-created Branch record** — TC-BR-056, 057, 058, 059, 066, 067, 068, 069, 070, 071, 072, 073, 074, 075, 076. This run's authorization permits acting only on records the run itself creates. Each such case must create its own branch and **record its Branch Code before acting on it**, so the action stays provable as authorized afterwards. Acting on any pre-existing branch is prohibited.
2. **Never read the Update form on a fixed delay.** Wait for a field to actually populate. A fixed-delay read produced a false "form is empty" result twice during Discovery, and would produce a false failure here.

**Three cases must never be recorded as passed:** TC-BR-078 and TC-BR-079 are Exploratory (record the observation and the reviewer's decision), and TC-BR-080 is `Not Covered — Single-Account Run`. TC-BR-081 is `Deferred — Requires Dedicated Environment` and must not be executed on shared staging.

**Stage `4A` — Automation:** not invoked this run. Zero cases are currently in its scope, since all 42 new cases are `Automation: Pending`.

---

# Coverage Report — run-006 (Auto Reissue checkbox — Branch half)

| Field | Value |
|---|---|
| Module | `branch` |
| Produced by run | `agency+branch-run-001__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Project Context | Revision 9 (Approved 2026-09-24) + Stage 2 additions `PO-21` … `PO-26` (approved 2026-09-24) |
| Discovery | `modules/branch/discovery/` run-006 section — **Approved** 2026-09-24 |
| New test cases | 32 — TC-BR-083 … 114 (suite total 114; 109 … 112 added 2026-09-25 at the user's request; 113, 114 added 2026-10-01 for `PO-30`) |
| Pipeline branch | **Manual (4M)**, chosen by the user 2026-09-24 |
| Status | **2026-10-01 `PO-30` update — Pending Review** (TC-BR-101 … 104, 112 revised; 113, 114 added). Otherwise **Approved** — Mohamed Soliman, Stage 3 Human Review gate, 2026-09-25 |

## 1. Run Scope

**Run Scope Type:** User Story · **Run Type:** User Story · **Story:** *Auto Reissue checkbox — Branch & Agency CRUD*, Branch half, plus the Itinerary for a **Branch-owned** booking. Discovery showed such bookings exist, so the conditional §3 row is now in scope (QA run-006 `GAP-BR-R6-02`). **Strategy (§16, User Story):** one case per acceptance criterion and save rule, and one assumption-based case per open assumption. The US 8605/8606/8599 cases are not re-designed.

## 2. Requirements Covered

`PO-15` · `PO-16` · `PO-21` · `PO-22` (superseded) · `PO-24` (first sentence superseded) · `PO-28` · `PO-29` · `PO-30` · `PO-23` · `PO-26` · `PO-27` · spec `S-2` … `S-10` (Branch UI and Branch API), §3, §5 · XC-01/XC-03/XC-04 · RISK-BR-10 · RISK-BR-12 · Story AC groups *Branch CRUD*, *Admin Impact*, *Permission Precedence*, *Regression & Validation*.

**Requirement coverage: 14 / 15 in-scope requirement rows Covered = 93%; 1 Partially Covered (`PO-30`, added 2026-10-01)** (basis: `TraceabilityMatrix.md` §5.2). 1 Out-of-Scope, 0 Uncovered, 0 Unknown. `PO-30` is partial because condition (6) has only indirect, picker-level cases, condition (4) waits for an offline booking from the user, and condition (3)'s bar half is not isolated. The clean-up rows need the user's go-ahead to make a supplier or credential inactive.

## 3. Coverage Matrix

| Area | Test Cases |
|---|---|
| Checkbox on the form | 083, 107 |
| Picker contents (`PO-21`) | 084, 085, 086, 087, 088 |
| Save, approve, read back | 089, 090, 091, 106 |
| Save rules — UI | 092, 093 |
| Save rules — Branch API | 094, 095, 096, 097, 098, 099 |
| Independence from Agencies | 100, 104 |
| Branch-owned booking Itinerary (`PO-30` six conditions) | 101, 102, 103, 104, 112, 113, 114 |
| Read-time clean-up / inactive credential or supplier | 105, 110, 111 |
| Supplier ceiling (`PO-27`) | 109 |
| Portal visibility (`PO-26`) | 108 |

Full rows: `TraceabilityMatrix.md` §5.1.

## 4. Business Rules

| Rule | Test Cases |
|---|---|
| `PO-16` Branch and Agency independent | TC-BR-100, 104 |
| `PO-21` Only NDCsbr, Sabre, TravelportNdc, Galileo; no LCC, no Amadeus | TC-BR-085, 086, 087, 088 |
| `PO-28` Button needs the checkbox **and** a matching credential *(supersedes `PO-22`, 2026-09-27; now `PO-30` condition 2)* | TC-BR-103 (negative); TC-BR-101, 104 (positive) |
| `PO-30` Button only when all six hold — checkbox on; credential in the selection; Booked **and** "Ticketed Document" bar; online; locked by the current user (Admin only); reissue-capable GDS *(2026-10-01; supersedes `PO-24`'s first sentence)* | Shown: TC-BR-101, 104. Hidden, one condition unmet: 102 (1), 103 (2), 112 (3), 114 (4), 113 (5); (6) indirect via 085, 087 |
| `PO-23` "Required" on screen, API message on the API | TC-BR-092, 094 |
| `PO-26` Branch-owned bookings follow the Branch; the Agency Portal can't see them | TC-BR-101, 102, 108 |
| `PO-27` A Branch can have suppliers its Agency doesn't | TC-BR-109 (reverse: TC-AGENCY-091) |

## 5. Test Scenarios

**32 cases:** 26 Atomic · 6 Scenario · 0 E2E. **Priority:** 8 P1 · 17 P2 · 7 P3. 4 assumption-based; 1 exploratory (111).

| §7 Category | Result |
|---|---|
| Empty Values | TC-BR-084, 092, 093, 094 |
| Invalid Inputs | TC-BR-096, 097, 098, 099 |
| Boundary Values | Not Applicable — no limit is stated for the credential list |
| Unicode · Special Characters · Security Inputs | Not Applicable — no free-text input in this feature (the remark field belongs to US 8606 and is already covered by earlier cases) |
| Timeouts | Not Applicable — none stated |

| §17 Dimension | Result |
|---|---|
| Positive | 083, 086, 089, 091, 101 |
| Validation Rules | 092 – 099 |
| Error Handling | Exact messages asserted in 094, 096 – 099 |
| Permissions | Org-level: 101, 102, 108. Role-level: Not Applicable — single account |
| Configuration | On (101) and off (102) |
| Regression Impact | 106 |
| Integration Behaviour | 100, 104, 109 (Branch ↔ Agency); 110, 111 (Supplier master ↔ Branch) |
| Risk-based Prioritization | High-risk rows are P1 (`TraceabilityMatrix.md` §5.4) |
| Exploratory | 111 (inactive supplier) |

## 6. Manual Test Cases

`modules/branch/test_design/TestCases_Branch.md` (+ `.xlsx`, generated). **114 cases** = 82 earlier + 32 run-006 (113, 114 added 2026-10-01). The suite and the Case Index agree. **`TraceabilityMatrix.md` holds 113 rows: TC-BR-082 (added 2026-08-10) never got a row.** That gap predates run-006 and is listed in §8.

## 7. Assumptions

| Test Case | Assumption | What resolves it |
|---|---|---|
| TC-BR-088 | TravelportNdc is offered (`PO-21`) | A TravelportNdc supplier on `.60` |
| TC-BR-093 | Remarks are mandatory (RISK-BR-10) | Running the case |
| TC-BR-105 | Read-time clean-up (RISK-BR-11) | TC-BR-110's inactive credential (the user's go-ahead) |
| TC-BR-108 | Agency Portal can't see Branch bookings (`PO-26`) | Running the case |

## 8. Coverage Gaps

| Item | Status | Reason | Smallest thing that unblocks it |
|---|---|---|---|
| spec §4 read-time clean-up | Covered, needs setup | Making a credential or supplier inactive changes shared staging data (TC-BR-110/111) | The user's go-ahead, and a credential/supplier only the test records use |
| Branch Portal impact | Out-of-Scope | The Portal shows Agency bookings only (`PO-26`) | — |
| TC-BR-082 has no matrix row | Traceability gap (pre-existing) | Added 2026-08-10 without a row | Add one row in `TraceabilityMatrix.md` §1 |
| TC-BR-107 | Needs the user's go-ahead | Creating a Branch is allowed after asking the user (2026-09-24) | Ask the user before execution |
| `PO-30` (4) online — TC-BR-114 | Blocked until a fixture exists | No offline / imported Branch booking is known; the platform never books or imports (`PO-19`) | The user supplies `{OFFLINE_REF}` |
| `PO-30` (6) reissue-capable GDS | Partially Covered (indirect) | No Branch booking on an LCC or Amadeus is known; TC-BR-085/087 show such a credential can't be selected, so (2) fails too | A Branch booking on an LCC or Amadeus, supplied by the user |
| `PO-30` (3) bar half | Not isolated | TC-BR-112's booking fails both Booked and the bar | A Booked booking whose bar is not "Ticketed Document", if one exists |

**Finding coverage: 1 / 1 dispositioned = 100%** (FINDING-017, documented exception). **0 Uncovered Findings.**

## 9. Risks

**High:** TC-BR-100, 101, 102, plus 110, 111 (shared master-data change). **Medium:** real saves on BRN265 (089, 090, 091, 095, 106), a new permanent record (107), and a precondition set up by 110 (105). Full register: `TraceabilityMatrix.md` §5.4.

## 10. Recommendations

1. **Run order:** 083 – 088 (unsaved) → 090 → 091 → 089 (restores BRN265 on) → 100 → 101/102/103/104 → API cases (capture `{BRANCH_SAVE_REQUEST}` during 089) → 092/093 → 106. It ends with BRN265 on and NDCSabre staging selected.
2. **Read BRN265's flag right before every booking check.** It was changed by hand during Discovery.
3. **Decide TC-BR-107** before execution.
4. **Decide TC-BR-110/111** (shared master-data change). They can share the inactive window with TC-AGENCY-092/093.

## 11. Review & Automation

| Column | Pending | Approved | Rejected |
|---|---|---|---|
| Review (32 new) | 7 | 25 | 0 |
| Automation (32 new) | 32 | 0 | 0 |

**2026-10-01:** the 7 `PO-30` cases (101 … 104, 112, 113, 114) are `Review: Pending` until the user approves them. Before that, all 29 new cases were eligible for Stage 4M. None for 4A (Automation Pending). No inconsistent pairs among the new cases.

## 12. Inputs for Both Branches

Present: the suite (Markdown + Excel), `TraceabilityMatrix.md` §5, this report, the fixtures and API method (suite §0.3), and the cited Discovery artifacts. **All satisfied** for Stage 4M (29 cases `Review = Approved`, 2026-09-25).
