# Manual Execution Results — agency+branch-run-001__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch

## 1. Execution Metadata

| Field | Value |
|---|---|
| Execution ID | run-006-4M-2026-09-25 |
| Run Folder | `agency+branch-run-001__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Run Scope Type / Run Type | User Story / User Story — executed only the 64 Auto Reissue cases (§17); the other 142 cases in the two suites belong to earlier stories and are outside this run |
| Environment | Shared staging (`Staging`) |
| Target URL | Admin `http://192.168.1.60` · Portal `http://192.168.1.60:9500` |
| Role(s) used | Super Admin (Admin) · Agency user of AGN9780 (Portal) |
| Started | 2026-09-25T13:36:14.844Z |
| Ended | 2026-09-25T17:38:28.414Z |
| Test Suites executed | `modules/agency/test_design/TestCases_Agency.md` (TC-AGENCY-061 … 094), `modules/branch/test_design/TestCases_Branch.md` (TC-BR-083 … 112) |
| Mechanism | Browser Driver, **headed** (Admin) and Playwright direct login, **headed** (Portal). The Playwright MCP server in `.mcp.json` is fixed to `--headless`, so it was not used |
| Safety | Preflight `metadata/SafetyPreflight.md`: 85 planned actions, 85 authorized, 0 Forbidden |

## 2. Result Totals

| Status | Count |
|---|---|
| Passed | 64 |
| Failed | 0 |
| Blocked | 0 |
| Skipped | 0 |
| Not Executed | 0 |
| Inconclusive | 0 |
| **Executable scope** (`Review = Approved`) | **64** |
| Excluded — Pending Review | 0 |
| Excluded — Rejected at Review | 0 |
| **Run scope total** (Auto Reissue cases) | **64** |

Suite totals for context: agency 94 cases, branch 112 cases (206). This User Story run executed only its own 64.

## 3. Per-Test Results

| Test Case ID | Module | Status | Executed At (UTC) | Reason (non-Passed) / Note | Evidence Refs |
|---|---|---|---|---|---|
| TC-AGENCY-061 | agency | Passed | 2026-09-25 13:36:14 |  | manual_execution/artifacts/TC-AGENCY-061-add-agency-default.png |
| TC-AGENCY-062 | agency | Passed | 2026-09-25 13:36:17 |  | manual_execution/artifacts/TC-AGENCY-062-ticked.png; manual_execution/artifacts/TC-AGENCY-062-unticked.png |
| TC-AGENCY-063 | agency | Passed | 2026-09-25 14:32:02 |  | manual_execution/artifacts/TC-AGENCY-063-before-reopen.png; manual_execution/artifacts/TC-AGENCY-063-reopened.png |
| TC-AGENCY-064 | agency | Passed | 2026-09-25 15:02:15 |  | manual_execution/artifacts/TC-AGENCY-064-grid-pending.png; manual_execution/artifacts/TC-AGENCY-064-grid-approved.png; manual_execution/artifacts/TC-AGENCY-064-reopened.png |
| TC-AGENCY-065 | agency | Passed | 2026-09-25 14:59:50 |  | manual_execution/artifacts/TC-AGENCY-065-required.png |
| TC-AGENCY-066 | agency | Passed | 2026-09-25 14:36:44 |  | manual_execution/artifacts/TC-AGENCY-066-api.json |
| TC-AGENCY-067 | agency | Passed | 2026-09-25 14:36:52 |  | manual_execution/artifacts/TC-AGENCY-067-api.json |
| TC-AGENCY-068 | agency | Passed | 2026-09-25 14:36:46 |  | manual_execution/artifacts/TC-AGENCY-068-api.json |
| TC-AGENCY-069 | agency | Passed | 2026-09-25 14:36:47 |  | manual_execution/artifacts/TC-AGENCY-069-api.json |
| TC-AGENCY-070 | agency | Passed | 2026-09-25 17:38:05 |  | manual_execution/artifacts/TC-AGENCY-070-api.json |
| TC-AGENCY-071 | agency | Passed | 2026-09-25 14:36:48 |  | manual_execution/artifacts/TC-AGENCY-071-api.json |
| TC-AGENCY-072 | agency | Passed | 2026-09-25 14:36:50 |  | manual_execution/artifacts/TC-AGENCY-072-api.json |
| TC-AGENCY-073 | agency | Passed | 2026-09-25 14:34:50 |  | manual_execution/artifacts/TC-AGENCY-073-reopened-off.png; manual_execution/artifacts/TC-AGENCY-073-retick-prefill.png |
| TC-AGENCY-074 | agency | Passed | 2026-09-25 15:15:18 |  | manual_execution/artifacts/TC-AGENCY-074-agency-picker.png |
| TC-AGENCY-075 | agency | Passed | 2026-09-25 17:38:00 |  | manual_execution/artifacts/TC-AGENCY-075-agency-reread.png |
| TC-AGENCY-076 | agency | Passed | 2026-09-25 14:32:45 |  | manual_execution/artifacts/TC-AGENCY-076-booking-panel.png |
| TC-AGENCY-077 | agency | Passed | 2026-09-25 14:26:39 |  | manual_execution/artifacts/TC-AGENCY-077-booking-panel.png |
| TC-AGENCY-078 | agency | Passed | 2026-09-25 14:27:30 |  | manual_execution/artifacts/TC-AGENCY-078-booking-panel.png |
| TC-AGENCY-079 | agency | Passed | 2026-09-25 14:33:59 |  | manual_execution/artifacts/TC-AGENCY-079-portal-on.png |
| TC-AGENCY-080 | agency | Passed | 2026-09-25 14:30:14 |  | manual_execution/artifacts/TC-AGENCY-080-portal-off.png |
| TC-AGENCY-081 | agency | Passed | 2026-09-25 14:33:59 |  | manual_execution/artifacts/TC-AGENCY-079-portal-on.png |
| TC-AGENCY-082 | agency | Passed | 2026-09-25 15:36:44 |  | manual_execution/artifacts/TC-AGENCY-082-booking-panel.png |
| TC-AGENCY-083 | agency | Passed | 2026-09-25 14:28:05 |  | manual_execution/artifacts/TC-AGENCY-083-booking-panel.png |
| TC-AGENCY-084 | agency | Passed | 2026-09-25 14:33:19 |  | manual_execution/artifacts/TC-AGENCY-084-booking-panel.png |
| TC-AGENCY-085 | agency | Passed | 2026-09-25 15:04:27 | Exploratory — observation recorded; reviewer decision needed | manual_execution/artifacts/TC-AGENCY-085-booking-while-pending.png |
| TC-AGENCY-086 | agency | Passed | 2026-09-25 15:00:33 |  | manual_execution/artifacts/TC-AGENCY-086-reopened.png |
| TC-AGENCY-087 | agency | Passed | 2026-09-25 16:12:40 |  | manual_execution/artifacts/TC-AGENCY-087-grid-pending.png; manual_execution/artifacts/TC-AGENCY-087-grid-approved.png; manual_execution/artifacts/TC-AGENCY-087-reopened.png |
| TC-AGENCY-088 | agency | Passed | 2026-09-25 16:09:22 |  | manual_execution/artifacts/TC-AGENCY-088-grid-pending.png; manual_execution/artifacts/TC-AGENCY-088-grid-approved.png; manual_execution/artifacts/TC-AGENCY-088-reopened.png |
| TC-AGENCY-089 | agency | Passed | 2026-09-25 15:00:07 |  | manual_execution/artifacts/TC-AGENCY-089-reopened.png |
| TC-AGENCY-090 | agency | Passed | 2026-09-25 14:34:29 |  | manual_execution/artifacts/TC-AGENCY-090-reopened.png |
| TC-AGENCY-091 | agency | Passed | 2026-09-25 14:57:31 |  | manual_execution/artifacts/TC-AGENCY-091-agency-product-access.png |
| TC-AGENCY-092 | agency | Passed | 2026-09-25 17:37:49 |  | manual_execution/artifacts/TC-AGENCY-092-agency-credential-inactive.png; manual_execution/artifacts/TC-AGENCY-092-confirm-1.png; manual_execution/artifacts/TC-AGENCY-092-confirm-2.png; manual_execution/artifacts/TC-AGENCY-092-confirmation.json; manual_execution/artifacts/credential-313-window.json; manual_execution/artifacts/joint-agency-picker-open.png; manual_execution/artifacts/joint-branch-picker.png; manual_execution/artifacts/TC-AGENCY-092-joint-rerun.json; manual_execution/artifacts/TC-AGENCY-092-joint-after-reactivation.json |
| TC-AGENCY-093 | agency | Passed | 2026-09-25 15:52:30 | Exploratory — observation recorded; reviewer decision needed | manual_execution/artifacts/TC-AGENCY-093-agency-while-supplier-inactive.png; manual_execution/artifacts/TC-093-111-supplier-window.json |
| TC-AGENCY-094 | agency | Passed | 2026-09-25 15:49:52 |  | manual_execution/artifacts/TC-AGENCY-094-portal-onhold.png |
| TC-BR-083 | branch | Passed | 2026-09-25 13:36:21 |  | manual_execution/artifacts/TC-BR-083-add-branch-default.png |
| TC-BR-084 | branch | Passed | 2026-09-25 13:36:23 |  | manual_execution/artifacts/TC-BR-084-no-supplier-picker.png |
| TC-BR-085 | branch | Passed | 2026-09-25 13:36:28 |  | manual_execution/artifacts/TC-BR-085-lcc-not-offered.png |
| TC-BR-086 | branch | Passed | 2026-09-25 13:36:35 |  | manual_execution/artifacts/TC-BR-086-galileo-offered.png |
| TC-BR-087 | branch | Passed | 2026-09-25 13:36:42 |  | manual_execution/artifacts/TC-BR-087-amadeus-not-offered.png |
| TC-BR-088 | branch | Passed | 2026-09-25 13:36:48 |  | manual_execution/artifacts/TC-BR-088-travelport.png |
| TC-BR-089 | branch | Passed | 2026-09-25 15:18:19 |  | manual_execution/artifacts/TC-BR-089-reopened.png |
| TC-BR-090 | branch | Passed | 2026-09-25 15:16:52 |  | manual_execution/artifacts/TC-BR-090-grid-pending.png; manual_execution/artifacts/TC-BR-090-grid-approved.png; manual_execution/artifacts/TC-BR-090-reopened.png |
| TC-BR-091 | branch | Passed | 2026-09-25 15:20:14 |  | manual_execution/artifacts/TC-BR-091-retick-prefill.png |
| TC-BR-092 | branch | Passed | 2026-09-25 15:23:56 |  | manual_execution/artifacts/TC-BR-092-required.png |
| TC-BR-093 | branch | Passed | 2026-09-25 15:24:13 |  | manual_execution/artifacts/TC-BR-093-no-remark.png |
| TC-BR-094 | branch | Passed | 2026-09-25 15:22:31 |  | manual_execution/artifacts/TC-BR-094-api.json |
| TC-BR-095 | branch | Passed | 2026-09-25 15:23:38 |  | manual_execution/artifacts/TC-BR-095-api.json |
| TC-BR-096 | branch | Passed | 2026-09-25 15:22:33 |  | manual_execution/artifacts/TC-BR-096-api.json |
| TC-BR-097 | branch | Passed | 2026-09-25 15:22:35 |  | manual_execution/artifacts/TC-BR-097-api.json |
| TC-BR-098 | branch | Passed | 2026-09-25 15:22:37 |  | manual_execution/artifacts/TC-BR-098-api.json |
| TC-BR-099 | branch | Passed | 2026-09-25 15:22:38 |  | manual_execution/artifacts/TC-BR-099-api.json |
| TC-BR-100 | branch | Passed | 2026-09-25 15:21:28 |  | manual_execution/artifacts/TC-BR-100-agency-after-branch-on.png |
| TC-BR-101 | branch | Passed | 2026-09-25 14:24:53 |  | manual_execution/artifacts/TC-BR-101-booking-panel.png |
| TC-BR-102 | branch | Passed | 2026-09-25 15:17:37 |  | manual_execution/artifacts/TC-BR-102-booking-panel.png |
| TC-BR-103 | branch | Passed | 2026-09-25 15:19:05 |  | manual_execution/artifacts/TC-BR-103-booking-panel.png |
| TC-BR-104 | branch | Passed | 2026-09-25 14:25:50 |  | manual_execution/artifacts/TC-BR-104-booking-panel.png |
| TC-BR-105 | branch | Passed | 2026-09-25 17:38:28 |  | manual_execution/artifacts/TC-BR-105-branch-reread.png |
| TC-BR-106 | branch | Passed | 2026-09-25 15:25:10 |  | manual_execution/artifacts/TC-BR-106-reopened.png |
| TC-BR-107 | branch | Passed | 2026-09-25 16:20:34 |  | manual_execution/artifacts/TC-BR-107-grid-pending.png; manual_execution/artifacts/TC-BR-107-grid-approved.png; manual_execution/artifacts/TC-BR-107-reopened.png |
| TC-BR-108 | branch | Passed | 2026-09-25 14:30:23 |  | manual_execution/artifacts/TC-BR-108-portal-mybooking.png |
| TC-BR-109 | branch | Passed | 2026-09-25 15:15:06 |  | manual_execution/artifacts/TC-BR-109-branch-suppliers.png; manual_execution/artifacts/TC-BR-109-agency-product-access.png |
| TC-BR-110 | branch | Passed | 2026-09-25 17:38:17 |  | manual_execution/artifacts/TC-BR-110-branch-credential-inactive.png |
| TC-BR-111 | branch | Passed | 2026-09-25 15:52:30 | Exploratory — observation recorded; reviewer decision needed | manual_execution/artifacts/TC-BR-111-branch-while-supplier-inactive.png; manual_execution/artifacts/TC-093-111-supplier-window.json |
| TC-BR-112 | branch | Passed | 2026-09-25 14:24:18 |  | manual_execution/artifacts/TC-BR-112-booking-panel.png |

Execution time per case was not timed separately (cases ran in batches); the batch windows are in the Summary.

### 3.1 Observed detail, per case

- **TC-AGENCY-061** (Passed) — Auto Reissue present, checked=false; Auto Reissue Credentials visible=false
- **TC-AGENCY-062** (Passed) — picker visible after tick=true, after untick=false
- **TC-AGENCY-063** (Passed) — selected "Sabre Staging"; requests ["PUT /odeysysadmin/Admin2/agency/10961"]; reopened: ticked=true, api=true, creds=[315], picker shows "Sabre Staging", approvalStatus=1 _Record touched:_ AGN9780 (10961)
- **TC-AGENCY-064** (Passed) — after Send For Approval: grid "AGN9780 NDC2_Mohamed Soliman Egypt Badr Inactive Pending for approval NDC2_Mohamed Soliman " (status 0, approvalStatus 0); after approve: "AGN9780 NDC2_Mohamed Soliman Egypt Badr Active Approved NDC2_Mohamed Soliman " (status 1, approvalStatus 1); reopened {"api":true,"creds":[315],"appr":1,"status":1}; requests ["PUT /odeysysadmin/Admin2/agency/10961"] _Record touched:_ AGN9780
- **TC-AGENCY-065** (Passed) — picker cleared; "Required" shown near picker=true; save requests=[]; AGN9780 before {"api":false,"creds":[315],"appr":1,"status":1} after {"api":false,"creds":[315],"appr":1,"status":1}
- **TC-AGENCY-066** (Passed) — PUT → 400 "Select at least one eligible credential" (expected 400 "Select at least one eligible credential"); AGN9780 unchanged=true ({"st":200,"api":false,"creds":[315],"appr":1,"status":1}) _Record touched:_ AGN9780 (10961)
- **TC-AGENCY-067** (Passed) — PUT off + [277] → 204; after: api=false, stored creds=[315] (saved before: [315]), approvalStatus=1 _Record touched:_ AGN9780 (10961)
- **TC-AGENCY-068** (Passed) — PUT → 400 "Every auto-reissue credential must have an ID" (expected 400 "Every auto-reissue credential must have an ID"); AGN9780 unchanged=true ({"st":200,"api":false,"creds":[315],"appr":1,"status":1}) _Record touched:_ AGN9780 (10961)
- **TC-AGENCY-069** (Passed) — PUT → 400 "Every auto-reissue credential must exist and be active" (expected 400 "Every auto-reissue credential must exist and be active"); AGN9780 unchanged=true ({"st":200,"api":false,"creds":[315],"appr":1,"status":1}) _Record touched:_ AGN9780 (10961)
- **TC-AGENCY-070** (Passed) — PUT on + [313 inactive] → 400 "Every auto-reissue credential must exist and be active"; AGN9780 before {"api":true,"creds":[]} after {"api":true,"creds":[]} _Re-run note:_ Re-run in the credential-inactive window
- **TC-AGENCY-071** (Passed) — PUT → 400 "Auto-reissue credentials must not contain duplicates" (expected 400 "Auto-reissue credentials must not contain duplicates"); AGN9780 unchanged=true ({"st":200,"api":false,"creds":[315],"appr":1,"status":1}) _Record touched:_ AGN9780 (10961)
- **TC-AGENCY-072** (Passed) — PUT → 400 "Each auto-reissue credential must be mapped to this organization" (expected 400 "Each auto-reissue credential must be mapped to this organization"); AGN9780 unchanged=true ({"st":200,"api":false,"creds":[315],"appr":1,"status":1}) _Record touched:_ AGN9780 (10961)
- **TC-AGENCY-073** (Passed) — before: creds [315]; after off: ticked=false, api=false, stored creds=[315]; re-tick picker shows "Sabre Staging" (expected "Sabre Staging"); left without saving; requests ["PUT /odeysysadmin/Admin2/agency/10961"] _Record touched:_ AGN9780
- **TC-AGENCY-074** (Passed) — Agency PCC credentials ["Sabre Staging"]; Branch PCC credentials ["Sabre Staging","NDCSabre staging"]; {BRANCH_ONLY} = ["NDCSabre staging"]; Agency picker offers ["Sabre Staging"] (left without saving) _Re-run note:_ Re-run 2026-09-25 15:1x after NDCsbr/313 was re-added to BRN265 (user-approved); the first attempt was Blocked (no Branch-only credential).
- **TC-AGENCY-075** (Passed) — re-read AGN9780: saved {"api":true,"creds":[],"appr":1,"status":1}; ticked=true; picker "Select" _Re-run note:_ Re-run in the credential-inactive window
- **TC-AGENCY-076** (Passed) — Reissue shown=true (expected true); canAutoReissue=true; bookingStatus=2; buttons=["Time Limit","History","Void / Cancel","Manual Reissue","Reissue","Sync PNR","Release PNR"]; lock released=true
- **TC-AGENCY-077** (Passed) — Reissue shown=false (expected false); buttons=["Time Limit","History","Void / Cancel","Manual Reissue","Sync PNR","Release PNR"]; canAutoReissue=false; bookingStatus=2; Manual Reissue shown=true; lock released=true
- **TC-AGENCY-078** (Passed) — Reissue shown=false (expected false); buttons=["Time Limit","History","Void / Cancel","Manual Reissue","Sync PNR","Release PNR"]; canAutoReissue=false; bookingStatus=2;  lock released=true
- **TC-AGENCY-079** (Passed) — Reissue shown=true; canAutoReissue=true; buttons=["WELCOME Mohamed Soliman","Time Limit","Reissue"]
- **TC-AGENCY-080** (Passed) — AGN9780 off; Portal booking found=true; Reissue shown=false; canAutoReissue=false; buttons=["WELCOME Mohamed Soliman","Time Limit"]
- **TC-AGENCY-081** (Passed) — Reissue=true; Manual Reissue=false; lockedStatus=0; lock-like controls on page=6
- **TC-AGENCY-082** (Passed) — AGN9780 on with selection [313] only; booking credential 315 (Sabre Staging); Reissue shown=true; canAutoReissue=true; lock released=true _Re-run note:_ Re-run after setup A (NDCsbr/313 added to AGN9780 with the user's approval); first attempt Blocked at 14:32 (only 315 offered).
- **TC-AGENCY-083** (Passed) — Reissue shown=false (expected false); buttons=["Time Limit","History","Void / Cancel","Manual Reissue","Sync PNR","Release PNR"]; canAutoReissue=false; bookingStatus=2; booking agencyId=AGN9780 (must be AGN9780); lock released=true
- **TC-AGENCY-084** (Passed) — Reissue shown=false (expected false); canAutoReissue=false; bookingStatus=3; buttons=["Time Limit","History","Sync PNR","Confirm To Pay","Release PNR"]; lock released=true
- **TC-AGENCY-085** (Passed, exploratory) — while AGN9780 change was pending (grid status 0, approvalStatus 0): Reissue shown=true, canAutoReissue=true — i.e. the Itinerary follows the PENDING (new) value. Reviewer to confirm whether intended. Lock released=true. Afterwards approved and restored off: {"api":false,"creds":[315],"appr":1,"status":1} _Record touched:_ AGN9780
- **TC-AGENCY-086** (Passed) — before {"api":false,"creds":[315],"appr":1,"status":1}; requests ["PUT /odeysysadmin/Admin2/agency/10961"]; after {"api":false,"creds":[315],"appr":1,"status":1} _Record touched:_ AGN9780
- **TC-AGENCY-087** (Passed) — created "RUN006_AR_Agency" code AGN10029 (id 11448) under BRN265; grid after approve: status 1, approvalStatus 1; reopened Auto Reissue ticked=true, picker "Sabre Staging", API autoReissueEnabled=true, reissueCredentials=[{"credentialId":315}] _Record touched:_ NEW Agency AGN10029 (id 11448) — permanent on STG
- **TC-AGENCY-088** (Passed) — created "RUN006_AR_Off_Agency" code AGN10028 (id 11447) under BRN265; grid after approve: status 1, approvalStatus 1; reopened Auto Reissue ticked=false, picker "null", API autoReissueEnabled=false, reissueCredentials=[] _Record touched:_ NEW Agency AGN10028 (id 11447) — permanent on STG
- **TC-AGENCY-089** (Passed) — requests ["PUT /odeysysadmin/Admin2/agency/10961"]; "Required" messages visible after save=0; reopened api=false, appr=1 _Record touched:_ AGN9780
- **TC-AGENCY-090** (Passed) — before creds [315]; requests ["PUT /odeysysadmin/Admin2/agency/10961"]; after: ticked=true, creds=[315], picker "Sabre Staging" _Record touched:_ AGN9780
- **TC-AGENCY-091** (Passed) — BRN265 suppliers ["Sabre"]; AGN9780 Product Access lists [{"ticked":true,"supplier":"Sabre"}]; listed but not on BRN265: []
- **TC-AGENCY-092** (Passed) — Credential 313 made Inactive (odeysysadmin). AGN9780: saved selection cleaned to [] and Auto Reissue stayed ticked; the picker still offers "NDCSabre staging" and the NDCsbr PCC tab still shows it, while BRN265 hides both. Seen 4/4 (2026-09-25 17:37, 17:41, 17:42; 2026-09-26 11:55 with the user watching). The user confirmed it on their own screen and that selecting it is refused with "Every auto-reissue credential must exist and be active". **Passed per the user's decision (2026-09-26): offering it is intended, the API check is enough.** The case's Expected Result ("not offered") is stricter than this decision — flagged to Stage 3. _Re-run note:_ Re-run 2026-09-25 with the credential status changed by odeysysadmin (the only account with the Deactivate action), per the user.
- **TC-AGENCY-093** (Passed, exploratory) — NDCsbr inactive: AGN9780 saved {"api":true,"creds":[313],"appr":1,"status":1} (before {"api":true,"creds":[313],"appr":1,"status":1}); Auto Reissue ticked=true; picker shows "NDCSabre staging", offers ["Sabre Staging","NDCSabre staging"] (before ["Sabre Staging","NDCSabre staging"]); PCC tabs {"Sabre":"Sabre Staging","NDCsbr":"NDCSabre staging"}. Reviewer to confirm whether intended.
- **TC-AGENCY-094** (Passed) — AGN9780 on; Portal booking-date range 2025-10-01–2026-03-31 (the Portal allows six months at most); bookingStatus=3; Reissue shown=false; canAutoReissue=false; buttons=["WELCOME Mohamed Soliman","Time Limit"] _Re-run note:_ Re-run with the Portal booking-date range widened (user instruction); first attempt Blocked at 14:34 (default one-month range).
- **TC-BR-083** (Passed) — checked=false; picker visible=false
- **TC-BR-084** (Passed) — options=[] empty-message=["No results found"]
- **TC-BR-085** (Passed) — LCC AirArabiaEgypt credential chosen "AirArabiaEgypt"; picker options=[]
- **TC-BR-086** (Passed) — GalileoLive chosen in tab=true (tab options ["GalileoLive","Galileo Live UAE","Live EGY PCC","KSA Galileoo","HH"]); picker options=["GalileoLive"]
- **TC-BR-087** (Passed) — Amadeus Live chosen in tab=true (tab options ["Amadeus Live","Amadeus UAE","Amadeus KSA"]); picker options=["GalileoLive"]
- **TC-BR-088** (Passed) — supplier "TravelportNdc", tab options ["TravelPortProd","Travelport NDC EGY"], chose "TravelPortProd"; picker options=["GalileoLive","TravelPortProd"]
- **TC-BR-089** (Passed) — picker offered ["Sabre Staging","NDCSabre staging"], set to "NDCSabre staging"; save {"ok":true,"pending":"BRN265 NDC2_Mohamed Soliman Egypt Cairo Pending for approval ","approved":"BRN265 NDC2_Mohamed Soliman Egypt Cairo Approved "}; reopened {"api":true,"creds":[313],"appr":1,"pa":["Sabre:315","NDCsbr:313"]}, picker "NDCSabre staging" _Record touched:_ BRN265
- **TC-BR-090** (Passed) — after Send For Approval grid "BRN265 NDC2_Mohamed Soliman Egypt Cairo Pending for approval "; after approve "BRN265 NDC2_Mohamed Soliman Egypt Cairo Approved "; reopened {"api":false,"creds":[315],"appr":1,"pa":["Sabre:315","NDCsbr:313"]}; requests ["PUT /odeysysadmin/Master2/Branch/10950","PATCH /odeysysadmin/Master2/Branch/approveOrReject"] _Record touched:_ BRN265
- **TC-BR-091** (Passed) — BRN265 off with stored [313]; re-tick picker shows "NDCSabre staging"; left without saving
- **TC-BR-092** (Passed) — "Required" near picker=true; requests []; BRN265 unchanged=true
- **TC-BR-093** (Passed) — remark empty; message near Remarks ["Required"]; requests []; BRN265 unchanged=true
- **TC-BR-094** (Passed) — PUT → 400 "Select at least one eligible credential" (expected 400 "Select at least one eligible credential"); BRN265 unchanged=true {"api":true,"creds":[313],"appr":1} _Record touched:_ BRN265 (10950)
- **TC-BR-095** (Passed) — before {"api":false,"creds":[313],"appr":1}; PUT off + [315] → 204; after PUT {"api":false,"creds":[313],"appr":0}; grid approve BRN265 NDC2_Mohamed Soliman Egypt Cairo Approved ; after {"api":false,"creds":[313],"appr":1} _Record touched:_ BRN265
- **TC-BR-096** (Passed) — PUT → 400 "Every auto-reissue credential must have an ID" (expected 400 "Every auto-reissue credential must have an ID"); BRN265 unchanged=true {"api":true,"creds":[313],"appr":1} _Record touched:_ BRN265 (10950)
- **TC-BR-097** (Passed) — PUT → 400 "Every auto-reissue credential must exist and be active" (expected 400 "Every auto-reissue credential must exist and be active"); BRN265 unchanged=true {"api":true,"creds":[313],"appr":1} _Record touched:_ BRN265 (10950)
- **TC-BR-098** (Passed) — PUT → 400 "Auto-reissue credentials must not contain duplicates" (expected 400 "Auto-reissue credentials must not contain duplicates"); BRN265 unchanged=true {"api":true,"creds":[313],"appr":1} _Record touched:_ BRN265 (10950)
- **TC-BR-099** (Passed) — PUT → 400 "Each auto-reissue credential must be mapped to this organization" (expected 400 "Each auto-reissue credential must be mapped to this organization"); BRN265 unchanged=true {"api":true,"creds":[313],"appr":1} _Record touched:_ BRN265 (10950)
- **TC-BR-100** (Passed) — AGN9780 before {"api":false,"creds":[315],"appr":1,"status":1}; BRN265 after turning on {"api":true,"creds":[313],"appr":1,"pa":["Sabre:315","NDCsbr:313"]}; AGN9780 after {"api":false,"creds":[315],"appr":1,"status":1} (form ticked=false)
- **TC-BR-101** (Passed) — Reissue shown=true (expected true); buttons=["Time Limit","History","Void / Cancel","Manual Reissue","Reissue","Sync PNR","Release PNR"]; canAutoReissue=true; bookingStatus=2;  lock released=true
- **TC-BR-102** (Passed) — BRN265 {"api":false,"creds":[315],"appr":1,"pa":["Sabre:315","NDCsbr:313"]}; AGN9780 {"api":false,"creds":[315],"appr":1,"status":1}; Reissue shown=false (expected false); Manual Reissue=true; canAutoReissue=false; lock released=true
- **TC-BR-103** (Passed) — BRN265 {"api":true,"creds":[313],"appr":1,"pa":["Sabre:315","NDCsbr:313"]}; AGN9780 {"api":false,"creds":[315],"appr":1,"status":1}; Reissue shown=true (expected true); Manual Reissue=true; canAutoReissue=true; lock released=true
- **TC-BR-104** (Passed) — Reissue shown=true (expected true); buttons=["Time Limit","History","Void / Cancel","Manual Reissue","Reissue","Sync PNR","Release PNR"]; canAutoReissue=true; bookingStatus=2;  lock released=true
- **TC-BR-105** (Passed) — re-read BRN265: saved {"api":true,"creds":[],"appr":1,"pa":["Sabre:315"]}; ticked=true; picker "Select" _Re-run note:_ Re-run in the credential-inactive window
- **TC-BR-106** (Passed) — before {"api":false,"creds":[313],"appr":1,"pa":["Sabre:315","NDCsbr:313"]}; save {"ok":true,"pending":"BRN265 NDC2_Mohamed Soliman Egypt Cairo Pending for approval ","approved":"BRN265 NDC2_Mohamed Soliman Egypt Cairo Approved "}; after {"api":false,"creds":[313],"appr":1,"pa":["Sabre:315","NDCsbr:313"]} _Record touched:_ BRN265
- **TC-BR-107** (Passed) — created "RUN006_AR_Branch" BRN502; grid "BRN502 RUN006_AR_Branch Egypt Asyut Pending for approval " → after approve "BRN502 RUN006_AR_Branch Egypt Asyut Approved "; reopened Auto Reissue ticked=true, picker "GalileoLive", API autoReissueEnabled=true, reissueCredentials=[{"credentialId":277}] _Record touched:_ NEW Branch BRN502 — permanent on STG
- **TC-BR-108** (Passed) — Portal My Booking (default search) lists 2 rows; Branch booking NDCEG-BR-F260916ENYOeQ listed=false
- **TC-BR-109** (Passed) — BRN265 PCC suppliers {"Sabre":"Sabre Staging","NDCsbr":"NDCSabre staging"} (approval 1); AGN9780 PCC {"Sabre":"Sabre Staging"}, NDCsbr row ticked on AGN9780=false (approval 1); Branch-only suppliers ["NDCsbr"]
- **TC-BR-110** (Passed) — credential 313 Inactive; BRN265 saved {"api":true,"creds":[],"appr":1,"pa":["Sabre:315"]}; ticked=true; picker "Select", offers ["Sabre Staging"] _Re-run note:_ Re-run with odeysysadmin changing the credential status
- **TC-BR-111** (Passed, exploratory) — NDCsbr inactive: BRN265 saved {"api":true,"creds":[313],"appr":1,"pa":["Sabre:315","NDCsbr:313"]} (before {"api":true,"creds":[313],"appr":1,"pa":["Sabre:315","NDCsbr:313"]}); Auto Reissue ticked=true; picker shows "NDCSabre staging", offers ["Sabre Staging","NDCSabre staging"] (before ["Sabre Staging","NDCSabre staging"]); PCC tabs {"Sabre":"Sabre Staging","NDCsbr":"NDCSabre staging"}. Reviewer to confirm whether intended.
- **TC-BR-112** (Passed) — Reissue shown=false (expected false); buttons=["Time Limit","History","Sync PNR","Confirm To Pay","Release PNR"]; canAutoReissue=false; bookingStatus=3;  lock released=true

### 3.2 Defect Detail — Failed / Inconclusive cases

Exploratory cases that need a reviewer decision (not defects): TC-AGENCY-085, TC-AGENCY-093, TC-BR-111.

## 4. Evidence Inventory

| Test Case ID | Evidence Type | Path | Captured? | Gap Reason |
|---|---|---|---|---|
| TC-AGENCY-061 | Screenshot | `manual_execution/artifacts/TC-AGENCY-061-add-agency-default.png` | Yes | — |
| TC-AGENCY-062 | Screenshot | `manual_execution/artifacts/TC-AGENCY-062-ticked.png` | Yes | — |
| TC-AGENCY-062 | Screenshot | `manual_execution/artifacts/TC-AGENCY-062-unticked.png` | Yes | — |
| TC-AGENCY-063 | Screenshot | `manual_execution/artifacts/TC-AGENCY-063-before-reopen.png` | Yes | — |
| TC-AGENCY-063 | Screenshot | `manual_execution/artifacts/TC-AGENCY-063-reopened.png` | Yes | — |
| TC-AGENCY-064 | Screenshot | `manual_execution/artifacts/TC-AGENCY-064-grid-pending.png` | Yes | — |
| TC-AGENCY-064 | Screenshot | `manual_execution/artifacts/TC-AGENCY-064-grid-approved.png` | Yes | — |
| TC-AGENCY-064 | Screenshot | `manual_execution/artifacts/TC-AGENCY-064-reopened.png` | Yes | — |
| TC-AGENCY-065 | Screenshot | `manual_execution/artifacts/TC-AGENCY-065-required.png` | Yes | — |
| TC-AGENCY-066 | Request/response or state record | `manual_execution/artifacts/TC-AGENCY-066-api.json` | Yes | — |
| TC-AGENCY-067 | Request/response or state record | `manual_execution/artifacts/TC-AGENCY-067-api.json` | Yes | — |
| TC-AGENCY-068 | Request/response or state record | `manual_execution/artifacts/TC-AGENCY-068-api.json` | Yes | — |
| TC-AGENCY-069 | Request/response or state record | `manual_execution/artifacts/TC-AGENCY-069-api.json` | Yes | — |
| TC-AGENCY-070 | Request/response or state record | `manual_execution/artifacts/TC-AGENCY-070-api.json` | Yes | — |
| TC-AGENCY-071 | Request/response or state record | `manual_execution/artifacts/TC-AGENCY-071-api.json` | Yes | — |
| TC-AGENCY-072 | Request/response or state record | `manual_execution/artifacts/TC-AGENCY-072-api.json` | Yes | — |
| TC-AGENCY-073 | Screenshot | `manual_execution/artifacts/TC-AGENCY-073-reopened-off.png` | Yes | — |
| TC-AGENCY-073 | Screenshot | `manual_execution/artifacts/TC-AGENCY-073-retick-prefill.png` | Yes | — |
| TC-AGENCY-074 | Screenshot | `manual_execution/artifacts/TC-AGENCY-074-agency-picker.png` | Yes | — |
| TC-AGENCY-075 | Screenshot | `manual_execution/artifacts/TC-AGENCY-075-agency-reread.png` | Yes | — |
| TC-AGENCY-076 | Screenshot | `manual_execution/artifacts/TC-AGENCY-076-booking-panel.png` | Yes | — |
| TC-AGENCY-077 | Screenshot | `manual_execution/artifacts/TC-AGENCY-077-booking-panel.png` | Yes | — |
| TC-AGENCY-078 | Screenshot | `manual_execution/artifacts/TC-AGENCY-078-booking-panel.png` | Yes | — |
| TC-AGENCY-079 | Screenshot | `manual_execution/artifacts/TC-AGENCY-079-portal-on.png` | Yes | — |
| TC-AGENCY-080 | Screenshot | `manual_execution/artifacts/TC-AGENCY-080-portal-off.png` | Yes | — |
| TC-AGENCY-081 | Screenshot | `manual_execution/artifacts/TC-AGENCY-079-portal-on.png` | Yes | — |
| TC-AGENCY-082 | Screenshot | `manual_execution/artifacts/TC-AGENCY-082-booking-panel.png` | Yes | — |
| TC-AGENCY-083 | Screenshot | `manual_execution/artifacts/TC-AGENCY-083-booking-panel.png` | Yes | — |
| TC-AGENCY-084 | Screenshot | `manual_execution/artifacts/TC-AGENCY-084-booking-panel.png` | Yes | — |
| TC-AGENCY-085 | Screenshot | `manual_execution/artifacts/TC-AGENCY-085-booking-while-pending.png` | Yes | — |
| TC-AGENCY-086 | Screenshot | `manual_execution/artifacts/TC-AGENCY-086-reopened.png` | Yes | — |
| TC-AGENCY-087 | Screenshot | `manual_execution/artifacts/TC-AGENCY-087-grid-pending.png` | Yes | — |
| TC-AGENCY-087 | Screenshot | `manual_execution/artifacts/TC-AGENCY-087-grid-approved.png` | Yes | — |
| TC-AGENCY-087 | Screenshot | `manual_execution/artifacts/TC-AGENCY-087-reopened.png` | Yes | — |
| TC-AGENCY-088 | Screenshot | `manual_execution/artifacts/TC-AGENCY-088-grid-pending.png` | Yes | — |
| TC-AGENCY-088 | Screenshot | `manual_execution/artifacts/TC-AGENCY-088-grid-approved.png` | Yes | — |
| TC-AGENCY-088 | Screenshot | `manual_execution/artifacts/TC-AGENCY-088-reopened.png` | Yes | — |
| TC-AGENCY-089 | Screenshot | `manual_execution/artifacts/TC-AGENCY-089-reopened.png` | Yes | — |
| TC-AGENCY-090 | Screenshot | `manual_execution/artifacts/TC-AGENCY-090-reopened.png` | Yes | — |
| TC-AGENCY-091 | Screenshot | `manual_execution/artifacts/TC-AGENCY-091-agency-product-access.png` | Yes | — |
| TC-AGENCY-092 | Screenshot | `manual_execution/artifacts/TC-AGENCY-092-agency-credential-inactive.png` | Yes | — |
| TC-AGENCY-092 | Screenshot | `manual_execution/artifacts/TC-AGENCY-092-confirm-1.png` | Yes | — |
| TC-AGENCY-092 | Screenshot | `manual_execution/artifacts/TC-AGENCY-092-confirm-2.png` | Yes | — |
| TC-AGENCY-092 | Request/response or state record | `manual_execution/artifacts/TC-AGENCY-092-confirmation.json` | Yes | — |
| TC-AGENCY-092 | Request/response or state record | `manual_execution/artifacts/credential-313-window.json` | Yes | — |
| TC-AGENCY-092 | Screenshot | `manual_execution/artifacts/joint-agency-picker-open.png` | Yes | — |
| TC-AGENCY-092 | Screenshot | `manual_execution/artifacts/joint-branch-picker.png` | Yes | — |
| TC-AGENCY-092 | Request/response or state record | `manual_execution/artifacts/TC-AGENCY-092-joint-rerun.json` | Yes | — |
| TC-AGENCY-092 | Request/response or state record | `manual_execution/artifacts/TC-AGENCY-092-joint-after-reactivation.json` | Yes | — |
| TC-AGENCY-093 | Screenshot | `manual_execution/artifacts/TC-AGENCY-093-agency-while-supplier-inactive.png` | Yes | — |
| TC-AGENCY-093 | Request/response or state record | `manual_execution/artifacts/TC-093-111-supplier-window.json` | Yes | — |
| TC-AGENCY-094 | Screenshot | `manual_execution/artifacts/TC-AGENCY-094-portal-onhold.png` | Yes | — |
| TC-BR-083 | Screenshot | `manual_execution/artifacts/TC-BR-083-add-branch-default.png` | Yes | — |
| TC-BR-084 | Screenshot | `manual_execution/artifacts/TC-BR-084-no-supplier-picker.png` | Yes | — |
| TC-BR-085 | Screenshot | `manual_execution/artifacts/TC-BR-085-lcc-not-offered.png` | Yes | — |
| TC-BR-086 | Screenshot | `manual_execution/artifacts/TC-BR-086-galileo-offered.png` | Yes | — |
| TC-BR-087 | Screenshot | `manual_execution/artifacts/TC-BR-087-amadeus-not-offered.png` | Yes | — |
| TC-BR-088 | Screenshot | `manual_execution/artifacts/TC-BR-088-travelport.png` | Yes | — |
| TC-BR-089 | Screenshot | `manual_execution/artifacts/TC-BR-089-reopened.png` | Yes | — |
| TC-BR-090 | Screenshot | `manual_execution/artifacts/TC-BR-090-grid-pending.png` | Yes | — |
| TC-BR-090 | Screenshot | `manual_execution/artifacts/TC-BR-090-grid-approved.png` | Yes | — |
| TC-BR-090 | Screenshot | `manual_execution/artifacts/TC-BR-090-reopened.png` | Yes | — |
| TC-BR-091 | Screenshot | `manual_execution/artifacts/TC-BR-091-retick-prefill.png` | Yes | — |
| TC-BR-092 | Screenshot | `manual_execution/artifacts/TC-BR-092-required.png` | Yes | — |
| TC-BR-093 | Screenshot | `manual_execution/artifacts/TC-BR-093-no-remark.png` | Yes | — |
| TC-BR-094 | Request/response or state record | `manual_execution/artifacts/TC-BR-094-api.json` | Yes | — |
| TC-BR-095 | Request/response or state record | `manual_execution/artifacts/TC-BR-095-api.json` | Yes | — |
| TC-BR-096 | Request/response or state record | `manual_execution/artifacts/TC-BR-096-api.json` | Yes | — |
| TC-BR-097 | Request/response or state record | `manual_execution/artifacts/TC-BR-097-api.json` | Yes | — |
| TC-BR-098 | Request/response or state record | `manual_execution/artifacts/TC-BR-098-api.json` | Yes | — |
| TC-BR-099 | Request/response or state record | `manual_execution/artifacts/TC-BR-099-api.json` | Yes | — |
| TC-BR-100 | Screenshot | `manual_execution/artifacts/TC-BR-100-agency-after-branch-on.png` | Yes | — |
| TC-BR-101 | Screenshot | `manual_execution/artifacts/TC-BR-101-booking-panel.png` | Yes | — |
| TC-BR-102 | Screenshot | `manual_execution/artifacts/TC-BR-102-booking-panel.png` | Yes | — |
| TC-BR-103 | Screenshot | `manual_execution/artifacts/TC-BR-103-booking-panel.png` | Yes | — |
| TC-BR-104 | Screenshot | `manual_execution/artifacts/TC-BR-104-booking-panel.png` | Yes | — |
| TC-BR-105 | Screenshot | `manual_execution/artifacts/TC-BR-105-branch-reread.png` | Yes | — |
| TC-BR-106 | Screenshot | `manual_execution/artifacts/TC-BR-106-reopened.png` | Yes | — |
| TC-BR-107 | Screenshot | `manual_execution/artifacts/TC-BR-107-grid-pending.png` | Yes | — |
| TC-BR-107 | Screenshot | `manual_execution/artifacts/TC-BR-107-grid-approved.png` | Yes | — |
| TC-BR-107 | Screenshot | `manual_execution/artifacts/TC-BR-107-reopened.png` | Yes | — |
| TC-BR-108 | Screenshot | `manual_execution/artifacts/TC-BR-108-portal-mybooking.png` | Yes | — |
| TC-BR-109 | Screenshot | `manual_execution/artifacts/TC-BR-109-branch-suppliers.png` | Yes | — |
| TC-BR-109 | Screenshot | `manual_execution/artifacts/TC-BR-109-agency-product-access.png` | Yes | — |
| TC-BR-110 | Screenshot | `manual_execution/artifacts/TC-BR-110-branch-credential-inactive.png` | Yes | — |
| TC-BR-111 | Screenshot | `manual_execution/artifacts/TC-BR-111-branch-while-supplier-inactive.png` | Yes | — |
| TC-BR-111 | Request/response or state record | `manual_execution/artifacts/TC-093-111-supplier-window.json` | Yes | — |
| TC-BR-112 | Screenshot | `manual_execution/artifacts/TC-BR-112-booking-panel.png` | Yes | — |
| (all) | Console log | — | No | Not collected by the execution scripts |
| (all) | Video | — | No | Session recording not enabled |
| (all) | Network write log | `manual_execution/ManualExecutionSummary.md` §2 | Yes | Every data-changing request per batch is listed there |
