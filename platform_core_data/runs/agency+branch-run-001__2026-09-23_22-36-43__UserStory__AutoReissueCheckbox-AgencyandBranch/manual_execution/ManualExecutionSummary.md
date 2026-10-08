# Manual Execution Summary — agency+branch-run-001__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch

| Field | Value |
|---|---|
| Execution ID | run-006-4M-2026-09-25 |
| Run Folder | `agency+branch-run-001__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Results artifact | `manual_execution/ManualExecutionResults.md` |
| Generated | 2026-09-26T12:35:27.104Z |
| Status | Pending Review |

## 2. Execution Summary

The 64 approved Auto Reissue test cases (34 Agency, 30 Branch) were executed by hand-style browser steps, **headed**, against shared staging `http://192.168.1.60` (Admin) and `:9500` (Portal) between 13:36 and 17:38 UTC on 2026-09-25. **Against an executable scope of 64 (all Review = Approved): 64 Passed, 0 Failed, 0 Blocked, 0 Skipped, 0 Not Executed, 0 Inconclusive.** **No defect was found.** TC-AGENCY-092 first failed (the Agency picker still offers an inactive credential; the Branch hides it; the API refuses it on save); after a joint re-run on 2026-09-26 the user decided this is **intended — the API check is enough**, so it is recorded Passed per that decision and its Expected Result is flagged to Stage 3. The 5 inactive-credential cases were first Blocked (the usual account cannot change a credential's status) and then re-run with the odeysysadmin account at the user's direction. Three exploratory cases recorded behaviour that needs a product decision (REC-1, REC-2).

**Data changed (all within recorded grants):** AGN9780 and BRN265 (Auto Reissue on/off, selections, NDCsbr added and removed), booking locks taken and released on the 5 test bookings, supplier NDCsbr status (twice: once by accident, 3 minutes; once for TC-AGENCY-093/TC-BR-111, 47 seconds), credential 313 status (three times, by odeysysadmin: 2 minutes and 1.5 minutes on 2026-09-25, and 36 minutes on 2026-09-26 for the joint re-run while the user checked). **Created (permanent):** Agency AGN10028 "RUN006_AR_Off_Agency", Agency AGN10029 "RUN006_AR_Agency", Branch BRN502 "RUN006_AR_Branch". **Final state (user: leave as it is, 2026-09-26):** AGN9780 and BRN265 both Auto Reissue on with no credential saved, NDCsbr/313 present, Sabre tab SabreLive; NDCsbr and credential 313 Active; no lock held. **Never done:** booking, clicking Reissue / Release PNR / Void-Cancel.

## 5. Delivery Artifacts

| Artifact | Path | Present? |
|---|---|---|
| Manual Execution Results (authoritative) | `manual_execution/ManualExecutionResults.md` | Yes |
| Manual Test Results CSV | `manual_execution/ManualTestResults.csv` | Yes (64 rows) |
| Manual QA Report (stakeholder deliverable) | `manual_execution/ManualQAReport.md` (+ `.html`) | Yes |
| Evidence | `manual_execution/artifacts/` | Yes |

All four renderings are generated from one result file (`_raw_results.json`) and agree on every case's status.

## 6. Known Limitations

| Limitation | Affected Test Case(s) | Why |
|---|---|---|
| Credential status needs a higher-permission account | TC-AGENCY-092, 070, 075; TC-BR-110, 105 | The Mohamed Soliman account sees only Edit on credentials (no Deactivate, no Save). At the user's direction, account odeysysadmin made credential 313 Inactive (2026-09-25 17:37–17:39 and 17:41–17:42 UTC; 2026-09-26 11:54–12:30 UTC for the joint re-run of TC-AGENCY-092, with the user watching) and reactivated it; every check was done with the usual account. First recorded Blocked, then re-run |
| Saved credentials are not restored when a credential is reactivated | TC-AGENCY-075, TC-BR-105 | Read-time clean-up removed 313 from both saved lists; after reactivation the lists stayed empty (Auto Reissue on with no credential) until restored by hand |
| Accidental 3-minute deactivation of supplier NDCsbr | none (setup incident) | At 15:30:04 UTC a probe click on "Deactivate" (no confirmation dialog) set NDCsbr Inactive; restored Active at 15:33:00. Within the user's status grant; recorded in artifacts/incident-NDCsbr-accidental-deactivation.json |
| Records changed by hand during the run | TC-BR-103, TC-AGENCY-082, 074, TC-BR-109 | BRN265/AGN9780 suppliers and selections had changed since 24 Sep; NDCsbr/313 was re-added with the user's approval (15:10) and the preconditions set up before the re-runs |
| Script defects corrected before reporting | TC-AGENCY-074, TC-BR-109 | Each was first auto-recorded Failed by a script misreading; both corrections are documented on the case (Results §3.1) |
| Portal search limits | TC-AGENCY-094 | Portal booking search defaults to one month and allows six months at most; the range was set through the calendar |
| Environment outage | — | http://192.168.1.60 stopped responding ~14:45–14:56 UTC; execution paused and resumed; no case affected |
| Not captured | all | Console logs and video were not collected; screenshots and request/response records were |

## 7. Recommendations

| ID | Recommendation | Applies To | Rationale |
|---|---|---|---|
| REC-1 | Decide whether the Itinerary should follow a **pending** (unapproved) Auto Reissue change | TC-AGENCY-085 | Observed: while AGN9780's change was Pending for approval, Reissue already showed (canAutoReissue true). This may bypass maker–checker |
| REC-2 | Decide whether an **inactive supplier's** credential should stay selectable/saved for Auto Reissue | TC-AGENCY-093, TC-BR-111 | Observed: with NDCsbr inactive, 313 stayed saved and offered on both records |
| REC-3 | Stage 3: update TC-AGENCY-092's Expected Result to the user's decision (the Agency picker may offer an inactive credential; the save is refused), and record it as a Project Context decision | TC-AGENCY-092 | User decision 2026-09-26: intended, the API check is enough. The approved case still expects "not offered" |
| REC-5 | Decide whether reactivating a credential should restore it to the selections that clean-up removed | TC-AGENCY-075, TC-BR-105 | Today they stay empty; spec §4 is silent on reactivation |
| REC-4 | Ask for a confirmation dialog on supplier "Deactivate" | — | One click deactivates a shared supplier for every organisation (seen during this run) |

## 8. Delivery Completeness

| Check | Result |
|---|---|
| Every in-scope case has an outcome | Yes — 64/64 |
| Every Failed/Inconclusive case has a full defect write-up | N/A — none (TC-AGENCY-092's earlier write-up is kept as its observation detail) |
| Evidence captured or gap stated | Yes (Results §4) |
| CSV one row per in-scope case, full status names | Yes |
| QA Report coverage computed from the Traceability Matrix | Yes |
| All renderings agree | Yes |

No handoff section: this is the Manual pipeline's terminal stage.
