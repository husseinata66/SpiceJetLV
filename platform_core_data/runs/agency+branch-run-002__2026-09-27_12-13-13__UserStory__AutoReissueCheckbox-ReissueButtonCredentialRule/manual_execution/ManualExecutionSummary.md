# Manual Execution Summary — run-008 (Auto Reissue checkbox · Reissue button credential rule)

| Field | Value |
|---|---|
| Execution ID | run-008-4M-2026-09-27 |
| Run Folder | `agency+branch-run-002__2026-09-27_12-13-13__UserStory__AutoReissueCheckbox-ReissueButtonCredentialRule` |
| Results artifact | `manual_execution/ManualExecutionResults.md` |
| Generated | 2026-09-27 |
| Status | **Pending Review** |

## 2. Execution Summary

The 16 Reissue-button display cases (11 Agency, 5 Branch) were re-executed by hand-style browser steps, **headless**, against shared staging `http://192.168.1.60` (Admin) and `:9500` (Portal) between 09:40 and 11:25 UTC on 2026-09-27. **Against an executable scope of 16 (all `Review = Approved`): 16 Passed, 0 Failed, 0 Blocked, 0 Skipped, 0 Not Executed, 0 Inconclusive, 0 Excluded. No defect was found.**

The run exists because the product owner settled the question run-007 left open as `DS-2`. The answer became **`PO-28`**, which **supersedes `PO-22`**: the `Reissue` button shows only when the organisation's Auto Reissue checkbox is on **and** its selected Auto Reissue credential matches the credential the PNR was booked on. Stage 3 was amended first — TC-AGENCY-082 and TC-BR-103 had their Expected Results inverted, every *button-shown* case gained an explicit credential-match precondition, and the retired Branch booking was replaced — and the cases were then run against the amended suite.

**`PO-28` holds.** With Auto Reissue on and the selection set to credential **313** against a booking made on **315**, the Itinerary returned `canAutoReissue: false` and no `Reissue` button, on the Agency and the Branch alike. Both inverted cases pass.

**`Manual Reissue` was ruled out of scope during this stage.** TC-AGENCY-077 and TC-BR-102 each also asserted *"Manual Reissue is still shown"*, and it was not — the action bar showed `Void / Cancel` instead, while the API kept reporting `canManualReissue: true`. Both were first recorded Failed on that clause alone. The user then ruled **Manual Reissue out of scope for this story** (`PO-29`, 2026-09-27); Stage 3 removed the clause from TC-AGENCY-077, TC-AGENCY-081 and TC-BR-102, and the two cases are now Passed on the `Reissue` assertion that remains. The behaviour is kept in the Results as an out-of-scope observation (§3.1.1), not as a defect.

**Data changed (all within recorded grants, all reverted):** AGN9780 and BRN265 Auto Reissue toggled off and back on; supplier NDCsbr with credential 313 attached and detached; each organisation's reissue selection moved [315]→[313]→[315]; one booking lock taken and released. **Final state, verified:** both organisations Auto Reissue **on**, selection **[315]**, Approved; Product Access back to Sabre/315 only; no lock held by this run. **Never done:** booking, paying, exchanging, or clicking `Reissue`, `Manual Reissue`, `Release PNR` or `Void / Cancel`.

## 5. Delivery Artifacts

| Artifact | Path | Present? |
|---|---|---|
| Manual Execution Results (authoritative) | `manual_execution/ManualExecutionResults.md` | Yes |
| Manual Test Results CSV | `manual_execution/ManualTestResults.csv` | Yes (16 rows) |
| Manual QA Report (stakeholder deliverable) | `manual_execution/ManualQAReport.md` (+ `.html`) | Yes |
| Evidence | `manual_execution/artifacts/` | Yes (18 screenshots, 9 JSON records) |

All four renderings are generated from one result set and agree on every case's status.

## 6. Known Limitations

| Limitation | Affected | Why |
|---|---|---|
| Ran **headless**, against this stage's headed norm | all 16 | The user was asked before the run and chose headless. Evidence capture is unaffected; what was lost is the live human observation §11.1 exists for. |
| A scope decision was taken mid-stage | TC-AGENCY-077, TC-AGENCY-081, TC-BR-102 | `Manual Reissue` was asserted by three approved cases when the run began. The user ruled it out of scope (`PO-29`) afterwards and Stage 3 removed the clause. The status of two cases changed **because the expectation changed**, not because anything was re-executed. |
| Credential 313 had to be re-attached to reach the mismatch state | TC-AGENCY-082, TC-BR-103 | Both organisations had been reduced to one credential after run-006. NDCsbr/313 was attached with the user's explicit go-ahead, used, then detached. Recorded as a widened authorization. |
| A pre-existing lock was left in place | TC-AGENCY-083 | `NDCEG-BR-F2609242aZ6EJ` was locked by `odeysysadmin` before this run began; it is not ours to release. The case's assertion does not depend on the lock. |
| Stage 3 was amended and approved on the same day | all 16 | `PO-28` and the two inverted Expected Results were written and approved on 2026-09-27 by the person who requested them. A reviewer wanting independent confirmation should read `modules/*/test_design/` first. |
| Not captured | all | Video and console logs were not collected; screenshots, API responses and structured observations were. |

## 7. Recommendations

| ID | Recommendation | Applies to |
|---|---|---|
| REC-008-1 | Pass the §3.1.1 observation to whoever owns the Itinerary action bar — as information, not as a defect of this story | out of scope (`PO-29`) |
| REC-008-2 | Answer run-006's REC-1 — should the Itinerary follow a **pending** Auto Reissue change? | TC-AGENCY-085 |
| REC-008-3 | Record `PO-28` as confirmed in the `reissue-flow` context and close run-007's `DS-2` | run-007 |
| REC-008-4 | Keep a second reissue-eligible credential permanently attached to AGN9780 and BRN265 | TC-AGENCY-082, TC-BR-103 |
| REC-008-5 | Re-run the 48 auto-reissue cases outside this run's scope against `PO-28` | run-006 suite |

## 8. Delivery Completeness

| Check | Result |
|---|---|
| Every in-scope case has an outcome | Yes — 16/16 |
| Every Failed case has a full defect write-up | N/A — no Failed case |
| Evidence captured or gap stated | Yes (Results §4) |
| CSV one row per in-scope case, full status names | Yes |
| QA Report coverage computed from the Traceability Matrix | Yes |
| All renderings agree | Yes |
| Shared-environment changes reverted and verified | Yes — `artifacts/final-state.json` |
| Application Context reviewed | Yes — nothing cross-module changed this run; left untouched |

No handoff section: this is the Manual pipeline's terminal stage.
