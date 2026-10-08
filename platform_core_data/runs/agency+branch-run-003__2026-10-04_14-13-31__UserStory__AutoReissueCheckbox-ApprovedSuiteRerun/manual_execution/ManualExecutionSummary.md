# Manual Execution Summary — run-010 (Auto Reissue checkbox · approved-suite re-run)

| Field | Value |
|---|---|
| Execution ID | run-010-4M-2026-10-04 |
| Run Folder | `agency+branch-run-003__2026-10-04_14-13-31__UserStory__AutoReissueCheckbox-ApprovedSuiteRerun` |
| Results artifact | `manual_execution/ManualExecutionResults.md` |
| Generated | 2026-10-04 |
| Status | **Pending Review** |

## 2. Execution Summary

The **49 approved Auto Reissue test cases** (24 Agency, 25 Branch) were executed by hand-style browser steps, **headed**, against shared staging `http://192.168.1.60` (Admin), its API on `:8080`, and `:9500` (Agency Portal), between 14:13 and 17:05 local time on 2026-10-04. **Against an executable scope of 49 (every case with `Review = Approved`): 45 Passed, 3 Failed, 1 Blocked, 0 Inconclusive, 0 Skipped, 0 Not Executed, 20 Excluded.** Pass rate 91.8% of the executable scope; authorized coverage 49 of the story's 69 designed cases.

The run exists because of run-008's recommendation **REC-008-5**: re-run the auto-reissue cases that run-008's own scope left out, now that the product owner has restated the Reissue-button display rule. Those 20 button-display cases are **not** in this run — Stage 3 Revision 5 reset them to `Review: Pending` on 2026-10-01 and they have not been re-approved, so they are recorded `Excluded`, never executed.

**The executable scope is 49, not the 48 the run was opened against.** TC-AGENCY-080 (*Portal hides Reissue when the Agency has Auto Reissue off*) carries `Review: Approved` and was missing from the opening count. It was found before the delivery closed, executed, and passed.

**One genuine application finding.** `TC-BR-109` **Failed**: after supplier NDCsbr with credential NDCSabre staging (313) was added to Branch BRN265, Agency AGN9780's **stored** record returned that supplier as assigned with credential 313 in its PCC tab — with no edit to the Agency at any point. The approved expectation is that the Agency lists it as *not assigned*. The Branch is meant to be the Agency's supplier **ceiling** (`PO-27`), not a source that assigns on its behalf. This is also why `TC-AGENCY-074` is **Blocked**: its precondition needs a credential the Branch holds and the Agency does not, and that state cannot be reached on this application.

**One documentation gap, recorded as a failure because the approved expectation says so.** `TC-AGENCY-092` **Failed** on its second clause: with credential 313 Inactive, the Agency's picker still offered it, while the Branch's picker (TC-BR-110, same window) correctly hid it. run-006 found exactly this on 2026-09-26 and the user decided then that it is **intended — the API check is enough**. The Expected Result was never amended, so an approved case still asserts "not offered" and this execution must record it as Failed. It is written up as a documentation mismatch, not an application defect.

**A Branch created with Auto Reissue on does not keep it.** `TC-BR-107` **Failed**, settled by a re-run. Both BRN514 and BRN515 were created with the checkbox ticked and GalileoLive selected, both were approved, and both reopened with Auto Reissue off and no Product Access supplier. The re-run completed the cascading State and City fields **first** and read the live form from the DOM immediately before submitting — Auto Reissue on, credential GalileoLive, supplier Galileo ticked — which removes the form-model reset that had left the first attempt Inconclusive. Editing an existing Branch saves the same settings correctly, so the fault is confined to the create path.

**Three cases were re-executed on request after the first delivery was written**, on 2026-10-04: `TC-BR-109` as a controlled detach then re-attach, `TC-AGENCY-092` as a second independent inactive-credential window, and `TC-BR-107` as a clean create. All three reproduced. TC-BR-109 and TC-AGENCY-092 move from `Reproducibility: Unable to confirm` to **Always**; TC-BR-107 moves from **Inconclusive to Failed**. `TC-AGENCY-074` stays **Blocked**, now shown unreachable by construction rather than merely unobserved.

**Two exploratory cases recorded behaviour that needs a product decision.** With supplier NDCsbr set Inactive, both AGN9780 (`TC-AGENCY-093`) and BRN265 (`TC-BR-111`) kept Auto Reissue ticked, dropped the credential from the saved selection, still listed NDCsbr as assigned in Product Access, and **still offered** NDCSabre staging in the picker. Note the inconsistency with the inactive-*credential* case: there the Branch hid the credential and the Agency did not; with an inactive *supplier*, neither hides it.

**Data changed (all within recorded grants, all reverted or recorded):** AGN9780 and BRN265 Auto Reissue toggled on and off repeatedly with their credential selection moved between Sabre Staging (315) and NDCSabre staging (313); supplier NDCsbr with credential 313 attached to BRN265 (**left attached**, per run-008's REC-008-4); supplier NDCsbr set Inactive twice (once for ~7 minutes through an execution error in the restore step, once for ~4 minutes as designed) and restored to Active both times; credential 313 set Inactive for ~4 minutes and restored to Active. **Created (permanent, cannot be deleted):** Agency **AGN10041** "RUN010_AR_Agency", Agency **AGN10042** "RUN010_AR_Off_Agency", Branch **BRN514** — saved as "Run Ten" rather than the intended `RUN010_AR_Branch`, because a late field-completion pass in the first execution overwrote its name — and Branch **BRN515** "RUN010_AR_Branch" from the TC-BR-107 re-run.

**Final state, verified:** AGN9780 Auto Reissue **off**, Approved. BRN265 Auto Reissue **on** with NDCSabre staging (313), Approved. Supplier NDCsbr **Active**; credential NDCSabre staging (313) **Active**. **Never done:** booking, paying, ticketing, exchanging, or clicking `Reissue`, `Manual Reissue`, `Release PNR` or `Void / Cancel`.

## 5. Delivery Artifacts

| Artifact | Path | Present? |
|---|---|---|
| Manual Execution Results (authoritative) | `manual_execution/ManualExecutionResults.md` | Yes |
| Manual Test Results CSV | `manual_execution/ManualTestResults.csv` | Yes (69 rows — 49 executed + 20 Excluded) |
| Manual QA Report (stakeholder deliverable) | `manual_execution/ManualQAReport.md` (+ `.report.json`, `.html`) | Yes |
| Evidence | `manual_execution/artifacts/` | Yes |

All renderings are generated from one result set and agree on every case's status.

## 6. Known Limitations

| Limitation | Affected | Why |
|---|---|---|
| 20 cases were never authorized to run | TC-AGENCY-076…085, 094…097; TC-BR-101…104, 112…114 | Stage 3 Revision 5 reset them to `Review: Pending` on 2026-10-01 when `PO-30` restated the Reissue-button display rule. Stage `4M` executes only `Review = Approved` cases. Three of them (TC-AGENCY-095, 096, 097) have never been executed by any run. |
| The opening scope count was wrong by one | TC-AGENCY-080 | The run was opened against 48 approved cases; the true figure is 49. Found and executed before the delivery closed. |
| A shared supplier was Inactive longer than intended | TC-AGENCY-093, TC-BR-111 | The first attempt at the inactive-supplier window failed its restore step because the supplier grid's search field was addressed incorrectly, leaving NDCsbr Inactive for roughly 7 minutes before it was found and restored. Every organisation using NDCsbr was affected for that period. The window was then re-run cleanly (~4 minutes) with a verified restore. |
| One case created two permanent Branches | TC-BR-107 | The first attempt (BRN514) was Inconclusive, so the case was re-executed and created a second Branch (BRN515). Staging records cannot be deleted. |
| A permanent record carries the wrong name | TC-BR-107 | Branch BRN514 was saved as "Run Ten" instead of `RUN010_AR_Branch`; BRN515 from the re-run carries the intended name. |
| Preconditions were established by this run, not found in place | TC-AGENCY-074, 092; TC-BR-089, 091, 095, 109, 110, 111 | The fixtures assume BRN265 holds NDCsbr / credential 313; run-008 had reduced both organisations to Sabre / 315. The supplier was re-attached as recorded setup before those cases ran. |
| Not captured | all | Video and console logs were not collected; screenshots, API status codes, response bodies and structured observations were. |

## 7. Recommendations

| ID | Recommendation | Applies to |
|---|---|---|
| REC-010-1 | Decide on `TC-BR-109`: either the Branch stops assigning its suppliers to its Agencies, or `PO-27` is restated to say that it does and the Agency cases are rewritten against that | TC-BR-109, TC-AGENCY-074, TC-AGENCY-091 |
| REC-010-2 | Amend `TC-AGENCY-092`'s Expected Result in Stage 3 to match the decision already taken in run-006 (the Agency picker may offer an inactive credential; the API check is the control), or reopen that decision. Until then the case fails on every run | TC-AGENCY-092 |
| REC-010-3 | Fix the Add Branch create path so it persists Auto Reissue, its credential and the ticked Product Access supplier, as the edit path already does. Confirmed by re-run — no further reproduction work is needed | TC-BR-107 |
| REC-010-4 | Answer the exploratory question the inactive-supplier cases raise: should an inactive supplier's credential disappear from the picker, as an inactive credential does on the Branch screen? Today nothing hides it | TC-AGENCY-093, TC-BR-111 |
| REC-010-5 | Re-approve the 20 Reissue-button cases in Stage 3 so the `PO-30` display rule can actually be tested — three of them have never run at all | TC-AGENCY-076…085, 094…097; TC-BR-101…104, 112…114 |
| REC-010-6 | Keep supplier NDCsbr and credential 313 attached to BRN265 permanently, as run-008's REC-008-4 already recommended; this run depends on them | fixtures |

## 8. Delivery Completeness

| Check | Result |
|---|---|
| Every in-scope case has an outcome | Yes — 49/49, plus 20 Excluded recorded with their reason |
| Every `Failed`/`Inconclusive` case has a full defect write-up | Yes — TC-BR-109, TC-AGENCY-092, TC-BR-107, each to the full Defect Documentation Standard and each updated after its re-execution |
| Every result's evidence is captured, or its absence stated with a reason | Yes — Evidence Inventory in the Results, §4 |
| The CSV has one row per case in scope, statuses unabbreviated | Yes — 69 rows |
| Requirement coverage computed from the Traceability Matrix | Yes — QA Report §4 |
| All renderings agree on every case's status | Yes — generated from one result set |
| Every mutating action stayed inside a recorded authorization | Yes — `metadata/SafetyAuthorizations.json`, 13 grants, 0 Forbidden, 0 refused |
| Cleanup completed | Yes — supplier NDCsbr and credential 313 both verified Active; both organisations verified Approved |

**No handoff section.** Stage `4M` is the Manual pipeline's terminal stage; its reviewer is its consumer.
