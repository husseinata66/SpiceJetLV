# Manual QA Report — run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch

## 1. Run Identification

| Field | Value |
|---|---|
| Run Folder | `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Execution ID | run-006-4M-2026-09-25 |
| Run Scope Type / Run Type | User Story / User Story — *Auto Reissue checkbox, Branch & Agency* |
| Modules in scope | agency (TC-AGENCY-061 … 094), branch (TC-BR-083 … 112) |
| Target environment | Shared staging — Admin http://192.168.1.60 · Portal http://192.168.1.60:9500 |
| Execution window | 2026-09-25T13:36:14.844Z → 2026-09-25T17:38:28.414Z |
| Browser mode | Headed |
| Executed by | Claude (Stage 4M), watched by Mohamed Soliman |

## 2. Executive Summary

**The Auto Reissue checkbox works as specified on both Agency and Branch, in Admin and on the Portal.** 64 of 64 cases passed and 0 failed. The Reissue button follows the checkbox of the organisation that owns the booking, including on-behalf and on-hold bookings. All API save rules return the specification's exact messages. **Two findings need a product decision** (not defects): the Itinerary already follows an Auto Reissue change **before it is approved**, and an **inactive supplier's** credential stays saved and selectable. **No defect.** The Agency picker still offers an inactive credential (the Branch hides it); the user decided on 2026-09-26 that this is intended because the API refuses it on save (TC-AGENCY-092).

## 3. Outcome Figures

| Status | Count | % of scope |
|---|---|---|
| Passed | 64 | 100.0% |
| Failed | 0 | 0.0% |
| Blocked | 0 | 0.0% |
| Skipped | 0 | 0.0% |
| Not Executed | 0 | 0.0% |
| Inconclusive | 0 | 0.0% |
| **Executable scope** (`Review = Approved`) | **64** | **100%** |

| Excluded | Count | % of scope |
|---|---|---|
| Pending Review | 0 | 0% |
| Rejected at Review | 0 | 0% |
| **Run scope total** | **64** | **100%** |

The two suites hold 206 cases in total; the other 142 belong to earlier stories and were not part of this User Story run.

## 4. Requirement Coverage

**Requirement verification: 23 / 23 verified.**

| Requirement ID | Requirement | Covering test cases | Verification state | Note |
|---|---|---|---|---|
| PO-15 / Story AC Agency CRUD & Branch CRUD | Checkbox on Create/Edit, default off, toggles | TC-AGENCY-061, TC-AGENCY-062, TC-AGENCY-087, TC-AGENCY-088, TC-BR-083, TC-BR-084, TC-BR-107 | Verified |  |
| Story AC "saved and retrieved" / spec S-10, §4 | Save, reopen, read back | TC-AGENCY-063, TC-AGENCY-089, TC-AGENCY-090, TC-BR-089 | Verified |  |
| spec S-1 | Create/edit with Auto Reissue off | TC-AGENCY-088, TC-AGENCY-089 | Verified |  |
| XC-01, XC-03, XC-04 / PO-24 | Maker–checker on the new field (incl. Remarks) | TC-AGENCY-064, TC-BR-090, TC-BR-093 | Verified |  |
| spec S-2 / PO-23 | On with no credential — "Required" (UI) and API message | TC-AGENCY-065, TC-AGENCY-066, TC-BR-092, TC-BR-094 | Verified |  |
| spec S-3 | Off + credentials keeps the saved selection | TC-AGENCY-067, TC-BR-095 | Verified |  |
| spec S-4, S-6 | Missing ID, duplicates | TC-AGENCY-068, TC-AGENCY-071, TC-BR-096, TC-BR-098 | Verified |  |
| spec S-5 (unknown) | Unknown credential ID rejected | TC-AGENCY-069, TC-BR-097 | Verified |  |
| spec S-5 (inactive) | Inactive credential rejected | TC-AGENCY-070 | Verified |  |
| spec S-8 / PO-16 | Credential not assigned to the org rejected | TC-AGENCY-072, TC-BR-099 | Verified |  |
| spec S-7 | Off keeps saved credentials; re-tick pre-fills | TC-AGENCY-073, TC-BR-091 | Verified |  |
| PO-21 / spec S-9 | Picker offers only supported GDS credentials (no LCC, no Amadeus; TravelportNdc yes) | TC-BR-085, TC-BR-086, TC-BR-087, TC-BR-088 | Verified |  |
| PO-16 / PO-27 / ASM-021 | Agency limited to its own credentials, a subset of the Branch; Branch can hold more | TC-AGENCY-074, TC-AGENCY-091, TC-BR-109 | Verified |  |
| spec §4 read-time clean-up | Invalid credential dropped on read | TC-AGENCY-075, TC-AGENCY-092, TC-BR-105, TC-BR-110 | Verified |  |
| spec §4 (supplier-level, exploratory) | Inactive supplier — what the picker shows | TC-AGENCY-093, TC-BR-111 | Verified | Exploratory — reviewer decision needed |
| spec §5 / Story AC Admin Impact | Admin Itinerary Reissue follows the owning org (Agency and Branch bookings) | TC-AGENCY-076, TC-AGENCY-077, TC-BR-101, TC-BR-102 | Verified |  |
| PO-16 / Story AC Permission Precedence | Agency and Branch independent | TC-AGENCY-078, TC-BR-100, TC-BR-104 | Verified |  |
| PO-25 / Story AC Portal Impact | Portal Reissue follows the Agency; no lock; no Manual Reissue | TC-AGENCY-079, TC-AGENCY-080, TC-AGENCY-081 | Verified |  |
| PO-22 | Button does not depend on the selected credential | TC-AGENCY-082, TC-BR-103 | Verified |  |
| PO-26 | On-behalf booking follows the Agency; Agency Portal cannot see Branch bookings | TC-AGENCY-083, TC-BR-108 | Verified |  |
| spec §5 BOOKED / PO-24 / ASM-022 | Not-Booked (On Hold) booking shows no Reissue — Admin and Portal | TC-AGENCY-084, TC-AGENCY-094, TC-BR-112 | Verified |  |
| RSK-013 (exploratory) | Which value the Itinerary uses while a change is pending | TC-AGENCY-085 | Verified | Exploratory — reviewer decision needed |
| Story AC Regression & Validation / RSK-014, RISK-BR-12 | Ordinary update unaffected | TC-AGENCY-086, TC-BR-106 | Verified |  |

## 5. Defect Register

No Failed or Inconclusive case, so no defect is registered. **TC-AGENCY-092** was first recorded Failed (the Agency picker still offers an inactive credential; the Branch hides it) and is now Passed per the user's decision of 2026-09-26: intended, because the API refuses it on save.

Items for decision (exploratory observations, not defects):

| Test Case | Observation | Decision needed |
|---|---|---|
| TC-AGENCY-085 | While AGN9780's Auto Reissue change was **Pending for approval**, the Admin Itinerary already showed Reissue (canAutoReissue true) | Should an unapproved change take effect? (maker–checker) |
| TC-AGENCY-093 / TC-BR-111 | With supplier NDCsbr **Inactive**, both orgs kept 313 saved and the picker still offered "NDCSabre staging" | Should an inactive supplier's credential be dropped (like spec §4 for inactive credentials)? |

## 6. Assumptions & Risks Resolved

| Assumption / Risk | Source test case | Resolution | Evidence |
|---|---|---|---|
| ASM-021 — Agency credentials ⊆ Branch credentials | TC-AGENCY-074, 091; TC-BR-109 | Confirmed (Agency picker offers only its own; Branch can hold more; adding a supplier to the Branch is inherited by the Agency automatically) | TC-AGENCY-074-agency-picker.png |
| ASM-022 / PO-24 — only Booked shows Reissue | TC-AGENCY-084, 094; TC-BR-112 | Confirmed (On Hold → no Reissue, Admin and Portal) | TC-AGENCY-084-booking-panel.png |
| PO-26 — on-behalf booking follows the Agency | TC-AGENCY-083 | Confirmed (agencyId AGN9780; hidden while the Agency was off and the Branch on) | TC-AGENCY-083-booking-panel.png |
| PO-26 — Agency Portal can't see Branch bookings | TC-BR-108 | Confirmed | TC-BR-108-portal-mybooking.png |
| RSK-013 — pending vs approved value | TC-AGENCY-085 | Resolved: the **pending** value is used — decision needed (REC-1) | TC-AGENCY-085-booking-while-pending.png |
| RSK-012 / RISK-BR-11 — inactive credential states | TC-AGENCY-070, 075, 092; TC-BR-105, 110 | Confirmed with odeysysadmin changing the status: API rejects (S-5), saved lists are cleaned, Branch hides it; the Agency picker still offers it — **intended per the user (2026-09-26)** | credential-313-window.json |
| PO-21 — TravelportNdc offered | TC-BR-088 | Confirmed ("TravelPortProd" offered) | TC-BR-088-travelport.png |
| RISK-BR-10 — Remarks mandatory on Branch update | TC-BR-093 | Confirmed ("Required", nothing saved) | TC-BR-093-no-remark.png |

## 7. Known Limitations

- **Credential status needs a higher-permission account** (TC-AGENCY-092, 070, 075; TC-BR-110, 105): The Mohamed Soliman account sees only Edit on credentials (no Deactivate, no Save). At the user's direction, account odeysysadmin made credential 313 Inactive (2026-09-25 17:37–17:39 and 17:41–17:42 UTC; 2026-09-26 11:54–12:30 UTC for the joint re-run of TC-AGENCY-092, with the user watching) and reactivated it; every check was done with the usual account. First recorded Blocked, then re-run.
- **Saved credentials are not restored when a credential is reactivated** (TC-AGENCY-075, TC-BR-105): Read-time clean-up removed 313 from both saved lists; after reactivation the lists stayed empty (Auto Reissue on with no credential) until restored by hand.
- **Accidental 3-minute deactivation of supplier NDCsbr** (none (setup incident)): At 15:30:04 UTC a probe click on "Deactivate" (no confirmation dialog) set NDCsbr Inactive; restored Active at 15:33:00. Within the user's status grant; recorded in artifacts/incident-NDCsbr-accidental-deactivation.json.
- **Records changed by hand during the run** (TC-BR-103, TC-AGENCY-082, 074, TC-BR-109): BRN265/AGN9780 suppliers and selections had changed since 24 Sep; NDCsbr/313 was re-added with the user's approval (15:10) and the preconditions set up before the re-runs.
- **Script defects corrected before reporting** (TC-AGENCY-074, TC-BR-109): Each was first auto-recorded Failed by a script misreading; both corrections are documented on the case (Results §3.1).
- **Portal search limits** (TC-AGENCY-094): Portal booking search defaults to one month and allows six months at most; the range was set through the calendar.
- **Environment outage** (—): http://192.168.1.60 stopped responding ~14:45–14:56 UTC; execution paused and resumed; no case affected.
- **Not captured** (all): Console logs and video were not collected; screenshots and request/response records were.

## 8. Recommendations

- **REC-1** — Decide whether the Itinerary should follow a **pending** (unapproved) Auto Reissue change (TC-AGENCY-085). Observed: while AGN9780's change was Pending for approval, Reissue already showed (canAutoReissue true). This may bypass maker–checker.
- **REC-2** — Decide whether an **inactive supplier's** credential should stay selectable/saved for Auto Reissue (TC-AGENCY-093, TC-BR-111). Observed: with NDCsbr inactive, 313 stayed saved and offered on both records.
- **REC-3** — Stage 3: update TC-AGENCY-092's Expected Result to the user's decision (the Agency picker may offer an inactive credential; the save is refused), and record it as a Project Context decision (TC-AGENCY-092). User decision 2026-09-26: intended, the API check is enough. The approved case still expects "not offered".
- **REC-5** — Decide whether reactivating a credential should restore it to the selections that clean-up removed (TC-AGENCY-075, TC-BR-105). Today they stay empty; spec §4 is silent on reactivation.
- **REC-4** — Ask for a confirmation dialog on supplier "Deactivate" (—). One click deactivates a shared supplier for every organisation (seen during this run).
