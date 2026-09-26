# Findings Summary — module `branch`

| Field | Value |
|---|---|
| Module | `branch` |
| Runs contributing | `run-002__2026-08-03…US-8605CreateBranch` (FINDING-001…011) · `run-003__2026-08-04…US-8599-SearchActions_US-8606-UpdateBranch` (FINDING-012…015, plus occurrence-2 appends) · `run-006__2026-09-23…AutoReissueCheckbox-AgencyandBranch` (FINDING-017) |
| Total Findings | 17 |
| Last updated | 2026-09-24 |
| Open security concerns | **None.** FINDING-013 was the module's only one; dispositioned 2026-08-10 as intended business behaviour (module owner), with the accepted risk recorded in that Finding rather than dropped. |

> **Durable, edited in place.** This index spans every run that has explored this module. run-003 appended four new Findings and recorded a second occurrence against five existing ones rather than re-raising them (§5.9).

## Index

| ID | Title | Category | Severity | Confidence | Status | Occ. | Module | Description (one line) |
|---|---|---|---|---|---|---|---|---|
| FINDING-001 | Payment Option checkbox group contains ~25 non-payment-method entries | Observation | N/A | 95% | Rejected | **2** | branch | Confirmed intended cross-module reflection of Payment Gateway Active records. Re-observed on Update, now ~29 entries. |
| FINDING-002 | Post Office Box field has no 8-character max-length enforcement | Observation | N/A | Withdrawn | **Rejected — Not Reproducible** | 1 | branch | **Wrong.** Module owner 2026-08-10: the field does stop at 8. Probe assigned `.value` in JS, bypassing `maxlength`. |
| FINDING-003 | Credit Limit field has no 15-digit max-length enforcement | Observation | N/A | Withdrawn | **Rejected — Not Reproducible + Intended** | 1 | branch | **Wrong.** Cap IS enforced at 15; the absent validation message is intended. Same probe defect as FINDING-002. |
| FINDING-004 | Warning Prompt (Days) field has no 11-digit max-length enforcement | Observation | N/A | Withdrawn | **Rejected — Dropped** | 1 | branch | Dropped by module owner and **removed from automation**; rests on the same probe defect. Real behaviour never re-verified. |
| FINDING-005 | Import PNR checkbox is unchecked by default on a fresh Create Branch form | Requirement Gap | N/A | 96% | Rejected | 1 | branch | Confirmed intended feature; US 8605's "always checked" wording is outdated. |
| FINDING-006 | "Flight" Product Access checkbox is user-editable rather than backend-only | Requirement Gap | N/A | 93% | Rejected | 1 | branch | Outdated Requirement — US 8605 predates current behavior, per module owner. |
| FINDING-007 | No Payment Gateway dropdown appears when Credit Card payment option is selected | Requirement Gap | N/A | 92% | Rejected | **2** | branch | Outdated Requirement. **Re-confirmed on Update with Credit Card already saved-checked — disposition extends (RISK-BR-5).** |
| FINDING-008 | "PAN Number" field absent from the live Create Branch screen | Requirement Gap | N/A | 95% | Rejected | **2** | branch | Ignored per module-owner direction. **Confirmed equally absent on Update — disposition extends (RISK-BR-5).** |
| FINDING-009 | Mandatory "Department" multi-select absent from Branch Contact Info | Requirement Gap | N/A | 95% | Rejected | **2** | branch | Ignored per module-owner direction. **Confirmed equally absent on Update — disposition extends (RISK-BR-5).** |
| FINDING-010 | "Outstanding Threshold" field traces to US 51489's "Child Agencies Threshold Amount" | Observation | N/A | 97% | Rejected | 1 | branch | Expected Implementation / Requirement Traceability — not a defect. Field re-seen populated on Update. |
| FINDING-011 | Submit button reads "Send For Approval" instead of the AC's "Submit for Approval" | Requirement Gap | N/A | 95% | **Rejected — Outdated Requirement** | **2** | branch | Module owner 2026-08-10: **"Send For Approval" is correct** — the AC is stale. Invalidates TC-BR-035; PRD needs correcting. |
| **FINDING-012** | **"State" column is absent from the Search Branch results grid** | **Bug** | **Medium** | **97%** | **Confirmed** | 1 | branch | US 8599 enumerates 7 grid columns; 6 render. State is genuinely absent, not responsive-hidden. |
| FINDING-013 | Stored Branch Email Password is returned to the browser and pre-filled into the Update form | Observation | N/A | 95% | **Rejected — Confirmed Intended Behaviour** | 1 | branch | Behaviour unchanged and confirmed; **dispositioned 2026-08-10 by the module owner as a business requirement, not a defect.** Invalidates TC-BR-077 — needs a Stage 3 decision. |
| **FINDING-014** | **Records are filterable by Active/Inactive status, but that status is never displayed in the grid** | **Requirement Gap** | **N/A** | **96%** | **Needs Human Review** | 1 | branch | `Both` returns 616 mixed records with no column distinguishing Active from Inactive. Bears on RISK-BR-8. |
| FINDING-015 | City search filter is a multi-select, where the AC specifies a dropdown | Observation | N/A | Withdrawn | **Rejected — Not Reproducible** | 1 | branch | **Wrong.** Module owner 2026-08-10: it **is** a dropdown. No drift; TC-BR-079's premise is gone. |
| FINDING-016 | Credit Terms (Days) 7-digit cap makes Warning Prompt's documented 11-digit cap unreachable | Requirement Gap | N/A | 100% | **Rejected — Dropped** | 1 | branch | Contradiction is real and **unresolved**, but dropped by instruction and kept out of automation. "Dropped" ≠ "fixed". |
| FINDING-017 | The Reissue button shows even when the booking's credential isn't among the selected Auto Reissue Credentials | Observation | N/A | 95% | **Rejected — Confirmed Intended Behaviour** (`PO-22`, 2026-09-24) | **2** | branch | run-006. The Branch-owned booking on credential 315 showed Reissue while BRN265's selection was [313]. The button follows the checkbox only; the selection is enforced when Reissue is clicked (`reissue-flow`). Second occurrence on AGN9780 (Portal). |

## Breakdown

**By Severity:** 0 Critical · **0 High** · **0 Medium** · **0 Low** · 17 N/A

**By Category:** **0 Bug** · 8 Requirement Gap · 7 Observation · 0 Security Concern · 2 Observation (pre-existing)

**By Status:** **0 Confirmed** · **0 Needs Human Review** · **17 Rejected**

**By Module:** 17 branch

> **Module-owner disposition sweep, 2026-08-10 — every open Finding in this module is now closed.** Nine were dispositioned in one session (FINDING-002, 003, 004, 011, 012, 013, 014, 015, 016). **No confirmed application defect remains open for `branch`.** That is a genuine outcome, not a cleanup: read the per-Finding Human Review Updates before treating it as a clean bill of health, because the closures fall into three very different classes.
>
> | Class | Findings | What it means |
> |---|---|---|
> | **Observation was wrong** | 002, 003, 015 | The application was behaving correctly all along. |
> | **Behaviour is intended** | 003 (message half), 011, 012, 013, 014 | Real behaviour, correctly observed, dispositioned as wanted. Requirements should be updated so these are not re-raised. |
> | **Dropped, not resolved** | 004, 016 | The underlying question is still open; it is simply no longer being pursued. **"Dropped" is not "fixed."** |
>
> **A method defect sits behind three of these (002, 003, 004) and outlasts them.** Each rested on a probe that set a field's value by assigning `element.value` in JavaScript, which **bypasses HTML `maxlength`** — the browser enforces `maxlength` only against real keystrokes. Such a probe reports the full string retained on a field that caps correctly, which is exactly the false "no max-length enforced" result recorded three times. **This suite's own automation shares the flaw** (`Branch_Common.typeVia`, `AddBranch_Page.setValueAndNotify`), so any future max-length check must drive real keystrokes (`sendKeys`) instead of assigning a value — otherwise it can neither fail a broken cap nor pass a working one.

**Note (2026-08-03):** Statuses/Categories for FINDING-001 and FINDING-005 through FINDING-010 were updated after module-owner review of run-002's Discovery output — see each Finding's "Human Review Update" note and `ProjectContext.md` §6 for the dispositions and their basis.

**Note (2026-08-04, run-003):** Four new Findings were added (FINDING-012…015) and five existing ones gained a second occurrence. The occurrence appends are the substantive answer to `ProjectContext.md` **RISK-BR-5** — whether the module owner's Create-screen dispositions extend to the Update screen. For PAN Number, Department and Payment-Gateway-on-Credit-Card they **do**, on direct evidence. For Import PNR the comparison **does not transfer**, because Update shows a saved record's stored value rather than a form default; that is recorded as not-comparable rather than forced into an answer. **Two Findings now sit at `Needs Human Review`** — the module's first open dispositions since run-002 closed.

**Note (2026-09-24, run-006):** one Finding added (FINDING-017), which the user closed during the stage as intended (`PO-22`). The Amadeus picker exclusion was investigated as a candidate and closed as intended (`PO-21`, hard-coded supplier list) before it was published. It is recorded below.

## Candidates investigated and NOT published as Findings

Recorded here because a rejected candidate is a result, not an absence of one.

| Candidate | Outcome | Why |
|---|---|---|
| Update Branch form appears not to pre-fill State, City, Name, Post Office Box, Credit Limit or Email Password | **Rejected — false read** | A fixed-delay sample caught the page mid-render. Polling across two fresh navigations and a hard reload showed **10/10 fields populated within 500ms** and stable. Would have been published as a high-severity defect had it been taken from the first symptom. See `DiscoverySnapshot_UpdateBranch.md` §4. |
| Search form appears to be missing the Country, State, City and Status filters | **Rejected — false read** | A native-element scan (`input`/`select`) under-reported PrimeNG widgets. A widget-aware probe found all six specified controls present and behaving correctly. See `DiscoverySnapshot_SearchBranch.md` §3. |
| Browser navigation to the login page timed out repeatedly | **Rejected — not an application condition** | Raw HTTP probes returned `200` in ~50–850ms across five consecutive attempts. The environment was healthy; the timeout was local tooling. No Finding raised against the application. |
| run-006: Amadeus Live (278) excluded from the Auto Reissue picker although Amadeus is a GDS | **Closed — intended** | The user: support needs a GDS **and** the hard-coded list NDCsbr, Sabre, TravelportNdc, Galileo. Amadeus isn't on it (`PO-21`). This is spec `S-9` working in the UI |
| run-006: the first Branch OFF check showed `canAutoReissue true` | **Rejected — confound** | BRN265 had been switched back on by hand in another session. Repeated in one session with the flag read right before; the result followed the flag (FINDING-017 investigation notes) |

## Evidence Packages

| Finding ID | Evidence Package | Occurrences |
|---|---|---|
| FINDING-001 | `findings/FINDING-001_PaymentOptionListPollution/` | 2 |
| FINDING-002 | `findings/FINDING-002_PostOfficeBoxNoMaxLength/` | 1 |
| FINDING-003 | `findings/FINDING-003_CreditLimitNoMaxLength/` | 1 |
| FINDING-004 | `findings/FINDING-004_WarningPromptNoMaxLength/` | 1 |
| FINDING-005 | `findings/FINDING-005_ImportPnrDefaultUnchecked/` | 1 |
| FINDING-006 | `findings/FINDING-006_FlightCheckboxEditable/` | 1 |
| FINDING-007 | `findings/FINDING-007_NoPaymentGatewayOnCreditCard/` | 2 |
| FINDING-008 | `findings/FINDING-008_PanNumberFieldAbsent/` | 2 |
| FINDING-009 | `findings/FINDING-009_DepartmentFieldAbsent/` | 2 |
| FINDING-010 | `findings/FINDING-010_UndocumentedOutstandingThreshold/` | 1 |
| FINDING-011 | `findings/FINDING-011_SubmitButtonLabelMismatch/` | 2 |
| **FINDING-012** | `findings/FINDING-012_StateColumnMissingFromGrid/` — `failure.png`, `full_page.png` | 1 |
| **FINDING-013** | `findings/FINDING-013_BranchEmailPasswordExposedToClient/` — `failure.png` (credential value deliberately excluded from all evidence) | 1 |
| **FINDING-014** | `findings/FINDING-014_ActiveInactiveStatusNotDisplayed/` — `failure.png` | 1 |
| **FINDING-015** | `findings/FINDING-015_CityFilterIsMultiSelect/` — `failure.png`, `after.png` | 1 |
| **FINDING-016** | `findings/FINDING-016_CreditTermsCapConflictsWithWarningPromptSpec/` — no evidence files; a documentation comparison, not an observed behaviour | 1 |
| FINDING-017 | `findings/FINDING-017_ReissueCredentialSelectionDoesNotGateButton/` — `33-branchbooking-cycle-ON.png`, `33-branchbooking-cycle-OFF.png`, `33-branchbooking-cycle-results.json`, `45-itinerary-credential-fields.txt`, `05-BRN265-baseline-before-changes.json`, `43-portal-cycle-results.json` | 2 |
