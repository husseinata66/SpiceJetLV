# Manual QA Report — Auto Reissue checkbox (Branch & Agency)

| Field | Value |
|---|---|
| Status | **Pending Review** |
| Run folder | `run-010__2026-10-04_14-13-31__UserStory__AutoReissueCheckbox-ApprovedSuiteRerun` |
| Execution ID | run-010-4M-2026-10-04 |
| Stage | `4M` — Manual Execution (the Manual pipeline's terminal stage) |
| HTML companion | `ManualQAReport.html` (generated from `ManualQAReport.report.json`; never approved, never read as input) |

## 1. Run Identification

| Field | Value |
|---|---|
| Run Scope / Run Type | Agency + Branch modules · User Story — *Auto Reissue checkbox (Branch & Agency)* |
| Target environment | Shared staging — Admin `http://192.168.1.60` (API `:8080`), Agency Portal `http://192.168.1.60:9500` |
| Execution window | 2026-10-04, 14:13 – 17:05 local |
| Display mode | **Headed** — the user was asked before the run and chose headed |
| Executed by | Manual Execution skill (Stage `4M`), driving Chrome through the platform's Browser Driver, plus the application's own save API for the API-level cases |
| Roles used | Admin operator; platform super-user (shared master data only); the Agency Portal user for AGN9780 |
| Why this run exists | run-008 recommendation **REC-008-5** — re-run the auto-reissue cases that run-008's own scope left out |

## 2. Executive Summary

The 49 Auto Reissue test cases that carry `Review: Approved` were executed by hand against shared staging. **45 passed.** Three failed and one was blocked.

The Auto Reissue checkbox itself works as designed. It is off by default on both Add forms, shows its credential picker only while ticked, offers exactly the reissue-capable GDS credentials the organisation holds, saves and reads back in both states, keeps the saved credentials when switched off, and goes through maker–checker like any other field. Every rule the save API is supposed to enforce — empty list, missing ID, unknown credential, inactive credential, duplicates, a credential the organisation is not assigned — was refused with the exact message the specification names, on both the Agency and the Branch. The Portal hides the Reissue button when the Agency's checkbox is off.

**One real problem was found, and it is about who owns a supplier.** Adding supplier NDCsbr with credential NDCSabre staging to Branch BRN265 assigned it to Agency AGN9780 as well, with no edit to the Agency at all. The approved rule (`PO-27`) treats the Branch as the Agency's *ceiling* — the Agency may hold fewer suppliers than its Branch, and should never be given one automatically. Today it is given one, together with the GDS credential chosen on the Branch. That credential then appears in the Agency's Auto Reissue picker.

**One failure is a paperwork problem, not an application problem.** `TC-AGENCY-092` asserts that an inactive credential is not offered in the Agency's picker. It still is. run-006 found the same thing and the product owner decided it is acceptable because the API refuses the save — but nobody wrote that decision into the test case, so the approved expectation still says the opposite and the run must record a failure. Stage 3 owns the fix.

**A Branch created with Auto Reissue on does not keep it.** Two Branches were created with the checkbox ticked and a credential selected; both were approved, and both reopened with Auto Reissue off and no supplier in Product Access. The second attempt completed the cascading location fields first and read the live form immediately before submitting, which rules out the execution-side explanation the first attempt had left open. Editing an existing Branch saves the same settings correctly, so the fault sits in the create path alone.

**Three cases were re-executed on request after the first delivery was written**, and all three reproduced: the Branch-to-Agency supplier propagation (confirmed in both directions, by detaching and re-attaching), the inactive-credential picker (a second independent window), and the Branch create. Two findings move to `Reproducibility: Always`, and the third from Inconclusive to Failed.

**A fifth of the story was never tested.** The 20 cases covering the Reissue button's display rule carry `Review: Pending` — Stage 3 reset them on 2026-10-01 when the rule was restated — so this stage was not authorized to run them. Three of them have never been executed by any run.

## 3. Outcome Figures

| Status | Count | Share of executable scope |
|---|---|---|
| Passed | 45 | 91.8% |
| Failed | 3 | 6.1% |
| Blocked | 1 | 2.0% |
| Skipped | 0 | 0% |
| Not Executed | 0 | 0% |
| Inconclusive | 0 | 0% |
| **Executable scope** (`Review = Approved`) | **49** | — |
| Excluded — Pending Review | 20 | — |
| Excluded — Rejected at Review | 0 | — |
| **Suite total** (the Auto Reissue story) | **69** | — |

- **Pass rate: 45 of 49 = 91.8%, computed against the executable scope.** Against the story's full suite of 69 it is 65.2%.
- **Authorized coverage: 49 of 69 = 71.0%** — how much of the designed story suite this run was permitted to exercise.
- **Block / skip rate: 1 of 49 = 2.0%.** `Excluded` cases are not in that denominator; they were never authorized to run.
- **Defect density: 3 of 49 = 6.1%** (3 Failed).

**The executable scope is 49, not the 48 this run was opened against.** `TC-AGENCY-080` carries `Review: Approved` and was missing from the opening count. It was found before the delivery closed, executed, and passed.

## 4. Requirement Coverage

Computed from the approved Requirement Traceability Matrices (`modules/agency/test_design/TraceabilityMatrix.md` §5 and `modules/branch/test_design/TraceabilityMatrix.md` §5). A requirement with no executed case is reported as *not verified*, never omitted.

| Requirement | Covering cases | Verification state |
|---|---|---|
| `PO-15` — checkbox on Create/Edit, default off | TC-AGENCY-061, 062, 087; TC-BR-083 | **Verified** |
| ASM-019 — the picker appears only while ticked | TC-AGENCY-062; TC-BR-084 | **Verified** |
| `PO-21` / spec `S-9` — only reissue-capable GDS credentials are offered | TC-BR-085, 086, 087, 088 | **Verified** — Galileo and TravelportNdc offered; Amadeus and an LCC not |
| spec `S-10`, `S-1`, §4 — save and read back, on and off | TC-AGENCY-063, 073, 089, 090; TC-BR-089, 091 | **Verified** |
| spec `S-7` — turning it off keeps the saved credentials | TC-AGENCY-073; TC-BR-091 | **Verified** |
| XC-01, XC-04 / `PO-24` — maker–checker on the new field | TC-AGENCY-064; TC-BR-090 | **Verified** |
| spec `S-2` / `PO-23` — on with no credential is refused | TC-AGENCY-065, 066; TC-BR-092, 094 | **Verified** — UI shows *Required*; API returns 400 *Select at least one eligible credential* |
| spec `S-3` — off with other credentials keeps the saved selection | TC-AGENCY-067; TC-BR-095 | **Verified** |
| spec `S-4`, `S-6` — missing ID, duplicates | TC-AGENCY-068, 071; TC-BR-096, 098 | **Verified** |
| spec `S-5` — unknown or inactive credential | TC-AGENCY-069, 070; TC-BR-097 | **Verified** |
| spec `S-8` / `PO-16` — a credential the organisation is not assigned | TC-AGENCY-072; TC-BR-099 | **Verified** |
| spec §4 — read-time clean-up of an invalid credential | TC-AGENCY-075, 092; TC-BR-105, 110 | **Verified** for the saved selection. The picker differs by screen: the Branch hides the inactive credential, the Agency does not (see TC-AGENCY-092) |
| Branch change does not alter its Agencies' checkbox | TC-BR-100 | **Verified** |
| `PO-25` — the Portal hides Reissue when the checkbox is off | TC-AGENCY-080 | **Verified** |
| `PO-26` — an Agency Portal cannot see its Branch's own bookings | TC-BR-108 | **Verified** |
| Regression — ordinary Agency/Branch update unaffected | TC-AGENCY-086; TC-BR-106 | **Verified** (smoke only, per RSK-014) |
| `PO-27` / `PO-16` — the Branch is the Agency's supplier **ceiling** | TC-AGENCY-091 (one direction), TC-AGENCY-074, TC-BR-109 (the other) | **NOT VERIFIED — contradicted.** TC-BR-109 failed and TC-AGENCY-074 could not be set up, both because of the same behaviour |
| Creating an organisation with Auto Reissue on | TC-AGENCY-087 (Agency), TC-BR-107 (Branch) | **Partly verified** — the Agency case passed; the Branch case is **contradicted**, reproducibly |
| spec §4 at supplier level — an inactive *supplier* | TC-AGENCY-093, TC-BR-111 (exploratory) | **Not stated in the specification.** Behaviour recorded for a product decision |
| `PO-30` — the Reissue button's six display conditions | TC-AGENCY-076…085, 094…097; TC-BR-101…104, 112…114 | **NOT VERIFIED** — all 20 cases carry `Review: Pending` and were not authorized to run |

## 5. Defect Register

| ID | Title | Severity | Priority | Category | Full write-up |
|---|---|---|---|---|---|
| TC-BR-109 | A Branch assigns its suppliers to its Agencies instead of permitting them | High | P1 | Business Rule | `ManualExecutionResults.md` §3.1 |
| TC-AGENCY-092 | An inactive credential is still offered in the Agency picker | Low | P3 | Documentation mismatch — not an application defect | `ManualExecutionResults.md` §3.1 |
| TC-BR-107 | A Branch does not keep the Auto Reissue setting it was created with | High | P1 | Data Integrity | `ManualExecutionResults.md` §3.1 |

## 6. Assumptions & Risks Resolved

| Assumption / risk | Carried by | Resolved state |
|---|---|---|
| An inactive credential is refused by the API and dropped on read | TC-AGENCY-070, 075; TC-BR-105 | **Confirmed** — exercised inside a real inactive window |
| A TravelportNdc credential exists on this environment | TC-BR-088 | **Confirmed** — TravelPortProd is present and offered |
| A Branch can hold a supplier its Agency does not | TC-BR-109 | **Refuted** — the Agency is assigned it automatically |
| A branch-only credential can exist at all | TC-AGENCY-074 | **Refuted** — proven unreachable by construction |
| A Branch created with Auto Reissue on keeps it | TC-BR-107 | **Refuted** — reproduced on two Branches |
| An inactive *supplier* behaves like an inactive credential | TC-AGENCY-093, TC-BR-111 | **Recorded, undecided** — neither screen hides the credential |
| A Branch update without a remark is refused | TC-BR-093 | **Confirmed** — refused with *Required* under Remarks |

## 7. Known Limitations

| Limitation | Affected | Why |
|---|---|---|
| 20 cases were never authorized to run | the whole `PO-30` button-display group | Stage 3 Revision 5 reset them to `Review: Pending` on 2026-10-01. Three (TC-AGENCY-095, 096, 097) have never been executed by any run. |
| The opening scope count was wrong by one | TC-AGENCY-080 | Found before the delivery closed, executed, passed. |
| A shared supplier was Inactive about 7 minutes longer than intended | TC-AGENCY-093, TC-BR-111 | The first inactive-supplier window's restore step addressed the supplier grid's search field incorrectly and did not fire. Found, restored, and the window re-run cleanly. Every organisation using NDCsbr was affected for that period. |
| One result cannot be attributed to the application | TC-BR-107 | The execution's field order leaves a form-model reset unexcluded. |
| A permanent record carries the wrong name | TC-BR-107 | Branch BRN514 saved as "Run Ten"; BRN515, from the re-run, carries the intended name. Staging records cannot be deleted. |
| Fixtures had to be re-established | TC-AGENCY-074, 092; TC-BR-089, 091, 095, 109, 110, 111 | run-008 had reduced both organisations to Sabre / 315; supplier NDCsbr and credential 313 were re-attached as recorded setup. |
| Not captured | all | Video and console logs. Screenshots, API status codes, response bodies and structured observations were captured. |

## 8. Recommendations

| ID | Recommendation | Applies to |
|---|---|---|
| REC-010-1 | Decide on TC-BR-109: either the Branch stops assigning its suppliers to its Agencies, or `PO-27` is restated to say that it does and the Agency cases are rewritten against that | TC-BR-109, TC-AGENCY-074, TC-AGENCY-091 |
| REC-010-2 | Amend TC-AGENCY-092's Expected Result to match the decision already taken in run-006, or reopen that decision | TC-AGENCY-092 |
| REC-010-3 | Fix the Add Branch create path so it persists Auto Reissue, its credential and the ticked Product Access supplier, as the edit path already does | TC-BR-107 |
| REC-010-4 | Answer the exploratory question: should an inactive supplier's credential disappear from the picker, as an inactive credential does on the Branch screen? | TC-AGENCY-093, TC-BR-111 |
| REC-010-5 | Re-approve the 20 Reissue-button cases in Stage 3 so the `PO-30` display rule can be tested | the `PO-30` group |
| REC-010-6 | Keep supplier NDCsbr and credential 313 attached to BRN265 permanently | fixtures |

---

**This report covers manual execution only.** It states nothing about automation coverage; Stage `4A` is an independent branch and neither branch reports on the other.
