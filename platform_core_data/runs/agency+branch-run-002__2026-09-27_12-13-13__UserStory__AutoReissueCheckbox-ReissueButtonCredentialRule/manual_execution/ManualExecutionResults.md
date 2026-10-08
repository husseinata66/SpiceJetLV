# Manual Execution Results — run-008 (Auto Reissue checkbox · Reissue button credential rule)

| Field | Value |
|---|---|
| Status | **Pending Review** |
| Execution ID | run-008-4M-2026-09-27 |
| Run Folder | `agency+branch-run-002__2026-09-27_12-13-13__UserStory__AutoReissueCheckbox-ReissueButtonCredentialRule` |
| Refines | `agency+branch-run-001__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` (`metadata/lineage.json`) |
| Modules | `agency`, `branch` (multi-module run — one consolidated result set, each row cites its module) |
| Generated | 2026-09-27 |

## 1. Execution Metadata

| Field | Value |
|---|---|
| Run Scope Type / Run Type | User Story / **Selective Re-run** (§17) |
| Why this run exists | The product owner answered the open question behind run-007 `DS-2`. The answer became **`PO-28`**, which **supersedes `PO-22`**: the `Reissue` button is displayed only when **both** the organisation's Auto Reissue checkbox is on **and** the organisation's selected Auto Reissue credential matches the credential the PNR was booked on. Stage 3 was amended first, then these cases were re-executed against the amended suite. |
| Cases in scope | 16 — TC-AGENCY-076, 077, 078, 079, 080, 081, 082, 083, 084, 085, 094 · TC-BR-101, 102, 103, 104, 112 |
| Suite total | 206 (94 `agency` + 112 `branch`) |
| Executable scope | 16 (every case in scope reads `Review = Approved`) |
| Environment | Shared staging. Admin `http://192.168.1.60` · API `http://192.168.1.60:8080` · Portal `http://192.168.1.60:9500` |
| Accounts | `ADMIN_60` (Mohamed Soliman) for every check · `PORTAL_60` (agency AGN9780) for the Portal cases. `ADMIN_60_SUPER` was **not needed and not used** this run. |
| Execution window | 2026-09-27, 09:40–11:25 UTC |
| Mechanism | Browser Driver (`platform_core/tools/browser_driver`), Chromium/Chrome, **headless** |
| Display mode | **Headless — a deliberate departure from this stage's headed norm (§11.1).** The user was asked before the run and chose headless explicitly. See §5 Known Limitations. |
| Code-state anchor | `0000c1e`; `run_manager drift` reports **unchanged** since this run was created |
| Safety policy | `ndc-admin-portal-stg` v1, `sha256:374508eece1cebbb084334ce1bdbcefe`. Preflight: 25 operations, 16 mutating, **0 Forbidden**. 9 authorizations recorded in `metadata/SafetyAuthorizations.json` |

## 2. Execution Summary

**Against an executable scope of 16: 16 Passed, 0 Failed, 0 Blocked, 0 Skipped, 0 Not Executed, 0 Inconclusive, 0 Excluded. No defect was found.**

**`PO-28` is confirmed by direct observation.** The two cases that test it head-on — **TC-AGENCY-082** and **TC-BR-103**, both inverted at Stage 3 on 2026-09-27 — now pass against their new Expected Result. With Auto Reissue **on** but the selected credential set to **NDCSabre staging (313)** while the booking is on **Sabre Staging (315)**, the Itinerary returned `actionsDetails.canAutoReissue: false` and **no `Reissue` button was rendered**, on the Agency and on the Branch alike. Under the superseded `PO-22` both cases expected the button to be shown.

**`Manual Reissue` is out of scope, decided during this stage.** TC-AGENCY-077 and TC-BR-102 each carried a second clause — *"**Manual Reissue** is still shown"* — which did not hold, and they were first recorded Failed on that clause alone. The user then ruled that **Manual Reissue is out of scope for this story** (`PO-29`, 2026-09-27). Stage 3 removed the clause from both cases, and both are recorded **Passed** on the assertion that remains: the `Reissue` button is hidden when the checkbox is off, which held in both. What was seen about Manual Reissue is kept in §3.1 as an **observation**, not a defect.

**One exploratory observation reproduced.** TC-AGENCY-085 again showed the Itinerary following a **pending, unapproved** Auto Reissue change (`approvalStatus: 0`, `canAutoReissue: true`, button rendered) — the same behaviour run-006 raised as REC-1, still unresolved.

**Data changed, all inside recorded authorizations, all reverted.** AGN9780 Auto Reissue off→on; BRN265 Auto Reissue off→on; supplier **NDCsbr** with credential **313** attached to BRN265 Product Access and to AGN9780's reissue selection, then detached; each organisation's Auto Reissue selection moved [315]→[313]→[315]; one booking lock taken and released. **Final state, verified (`artifacts/final-state.json`):** AGN9780 and BRN265 both Auto Reissue **on**, selection **[315]**, Approved; Agency Product Access back to Sabre/315 only; NDCsbr detached; **every lock this run took is released**. **Never done:** booking, paying, exchanging, or clicking `Reissue`, `Manual Reissue`, `Release PNR` or `Void / Cancel`.

## 3. Per-Test Results

Every case was driven through its authored Steps in the live application. Each row records the rendered button set **and** the Itinerary API's own `actionsDetails`, so the screen and the contract are evidenced together.

| # | Test Case | Module | Precondition state | Expected | Observed | `canAutoReissue` | Status |
|---|---|---|---|---|---|---|---|
| 1 | TC-AGENCY-076 | agency | AGN9780 on, selection [315]; booking on 315 | Reissue shown | **shown** | `true` | **Passed** |
| 2 | TC-AGENCY-077 | agency | AGN9780 off | Reissue hidden | **hidden** | `false` | **Passed** |
| 3 | TC-AGENCY-078 | agency | BRN265 on, AGN9780 off | Reissue hidden | **hidden** | `false` | **Passed** |
| 4 | TC-AGENCY-079 | agency | AGN9780 on, selection [315] (Portal) | Reissue shown | **shown** | — | **Passed** |
| 5 | TC-AGENCY-080 | agency | AGN9780 off (Portal) | Reissue hidden | **hidden** | — | **Passed** |
| 6 | TC-AGENCY-081 | agency | AGN9780 on, selection [315] (Portal) | No lock control · Reissue shown | **0 lock controls; Reissue shown** | — | **Passed** |
| 7 | **TC-AGENCY-082** | agency | AGN9780 **on**, selection **[313]**; booking on **315** | **Reissue hidden** (Rev 2, `PO-28`) | **hidden** | `false` | **Passed** |
| 8 | TC-AGENCY-083 | agency | BRN265 on, AGN9780 off; on-behalf booking | Reissue hidden | **hidden** | `false` | **Passed** |
| 9 | TC-AGENCY-084 | agency | AGN9780 on; booking On Hold | Reissue hidden | **hidden** | `false` | **Passed** |
| 10 | TC-AGENCY-085 | agency | AGN9780 change **Pending** approval | Tester records what happens | **Reissue shown while `approvalStatus: 0`** | `true` | **Passed** (exploratory) |
| 11 | TC-AGENCY-094 | agency | AGN9780 on; booking On Hold (Portal) | Reissue hidden | **hidden** | — | **Passed** |
| 12 | TC-BR-101 | branch | BRN265 on, selection [315]; booking on 315 | Reissue shown | **shown** | `true` | **Passed** |
| 13 | TC-BR-102 | branch | BRN265 off | Reissue hidden | **hidden** | `false` | **Passed** |
| 14 | **TC-BR-103** | branch | BRN265 **on**, selection **[313]**; booking on **315** | **Reissue hidden** (Rev 2, `PO-28`) | **hidden** | `false` | **Passed** |
| 15 | TC-BR-104 | branch | BRN265 on [315], AGN9780 off | Reissue shown | **shown** | `true` | **Passed** |
| 16 | TC-BR-112 | branch | BRN265 on; booking On Hold | Reissue hidden | **hidden** | `false` | **Passed** |

**Bookings used** (every one supplied by the user in an earlier run; this stage never books):

| Booking reference | Order ID | Owner | Credential | Status |
|---|---|---|---|---|
| `NDCEG-BR-F260924EAzzYT` | `AGN9780NDCNDCORD260924GKP8CP` | AGN9780 | Sabre Staging (315) | Booked |
| `NDCEG-BR-F260926PwYMR2` | `BRN265NDCORD2609269C3COS` | BRN265 | Sabre Staging (315) | Booked |
| `NDCEG-BR-F2609242aZ6EJ` | `AGN9780NDCNDCORD260924LYGN34` | AGN9780 (booked on behalf) | Sabre Staging (315) | Booked |
| `NDCEG-BR-F251014N1oohh` | `AGN9780NDCNDCORD251014NIEDYF` | AGN9780 | — | On Hold |
| `NDCEG-BR-F251103CdegUo` | `BRN265NDCORD251103GOVMHN` | BRN265 | — | On Hold |

`NDCEG-BR-F260916ENYOeQ` — the booking the Branch cases used before — was **not** used. It was exchanged outside the application and is no longer reissuable (run-007 `D-13`). Stage 3 moved TC-BR-101/102/103/104 onto `NDCEG-BR-F260926PwYMR2` on 2026-09-27.

### 3.1 Defect Records

**None.** No `Failed` and no `Inconclusive` case in this run, so no defect record is owed.

The two cases that were briefly recorded Failed — TC-AGENCY-077 and TC-BR-102 — failed only on a clause that has since been removed from them. `PO-29` (user decision, 2026-09-27) puts **`Manual Reissue` out of scope for this story**, so what was seen about it is no longer a pass/fail criterion. It is preserved below as an observation, because it was seen and someone owns that control, but it is **not** a defect of this story and it does not belong in this run's defect register.

### 3.1.1 Observation (out of scope) — the Itinerary and the `Manual Reissue` control

**Scope note first:** `Manual Reissue` is out of scope for the Auto Reissue checkbox story (`PO-29`). Nothing below was asserted, nothing below failed, and nothing below is a defect of this story. It is recorded so the team that owns the Itinerary action bar has the observation if it wants it.

**What was observed.** On both Booked test bookings, with the owning organisation's Auto Reissue checkbox **off**, the `Reissue` button was correctly absent and the action bar rendered `Void / Cancel`, `Sync PNR`, `Release PNR`. **`Manual Reissue` was not rendered**, while the same page's API response reported `canManualReissue: true`.

| Booking | Module | Lock held by | `Manual Reissue` rendered? | `canManualReissue` |
|---|---|---|---|---|
| `NDCEG-BR-F260924EAzzYT` | agency | the executing user | No | `true` |
| `NDCEG-BR-F260926PwYMR2` | branch | the executing user | No | `true` |
| `NDCEG-BR-F2609242aZ6EJ` | agency | `odeysysadmin` (another user) | **Yes** — in place of `Void / Cancel` | `true` |

**What it suggests, hedged.** The two controls were never seen together, and the one booking that showed `Manual Reissue` was the one held by a different user. *That is consistent with* the action bar treating `Void / Cancel` and `Manual Reissue` as alternatives in a single slot and choosing between them on lock ownership rather than on `actionsDetails`. A second explanation was not ruled out: a void-eligibility time window that has closed on one booking but not the other. The component's source was not read. Four observations across two modules agree, so the behaviour itself is reliable even though its cause is not established.

**Why anyone might care.** Where Auto Reissue is off, manual reissue is the remaining reissue route, and the user holding the lock is the one able to act. If the screen withholds the control from that user, the route is not reachable from this screen. The API continuing to report `canManualReissue: true` means a monitoring check or an API client would disagree with the screen.

**Difference from run-006.** run-006 passed TC-AGENCY-077 and TC-BR-102 on 2026-09-25 with `Manual Reissue` present. That run did not record who held the lock, so the two runs cannot be compared on the variable that appears to matter here.

**Evidence:** `manual_execution/artifacts/TC-AGENCY-077-admin.png`, `TC-BR-102-admin.png`, `TC-AGENCY-083-admin.png` (the contrasting case), `stateD-observations.json`, `TC-BR-102-observation.json`.

### 3.2 Exploratory observation — TC-AGENCY-085

TC-AGENCY-085 has no fixed pass/fail; it asks the tester to record what the Itinerary does while an Auto Reissue change is waiting for approval, and asks a reviewer to decide whether that is intended. It is recorded **Passed** because the observation was made and captured.

**What was done:** AGN9780 was Auto Reissue off and Approved. The checkbox was ticked with **Sabre Staging (315)** — the booking's own credential, so the credential condition of `PO-28` was satisfied and only the approval state was under test — and the change was submitted with **Send For Approval**, not approved.

**What was seen:** the Agency read back `autoReissueEnabled: true` with `approvalStatus: 0` — the change was pending. The Itinerary for `NDCEG-BR-F260924EAzzYT` nevertheless returned `canAutoReissue: true` and **rendered the `Reissue` button**.

**Why it matters:** a change that no approver has accepted is already in force on the Itinerary. That is the maker–checker concern run-006 raised as REC-1; it is unchanged and still needs a product decision. The pending change was then approved, which is what returned AGN9780 to its required final state.

Evidence: `manual_execution/artifacts/TC-AGENCY-085-observation.json`, `manual_execution/artifacts/TC-AGENCY-085-pending.png`.

## 4. Evidence Inventory

| Evidence type | Captured? | Where |
|---|---|---|
| Screenshots | Yes — one full-page capture per executed case, plus two setup-form captures | `artifacts/TC-*.png` (16 case captures, `TC-AGENCY-082-setup-form.png`, `TC-BR-103-setup-form.png`) |
| Structured observations | Yes — rendered button set, `actionsDetails`, lock state and organisation state per case | `artifacts/stateA-observations.json`, `stateA-portal-observations.json`, `stateD-observations.json`, `TC-AGENCY-080-observation.json`, `TC-AGENCY-082-observation.json`, `TC-AGENCY-085-observation.json`, `TC-BR-102-observation.json`, `TC-BR-103-observation.json` |
| API responses | Yes — the Itinerary `actionsDetails` for every case, and the Agency/Branch records before and after every change, embedded in the JSON above | as above |
| Final-state proof | Yes | `artifacts/final-state.json` |
| Safety record | Yes | `metadata/SafetyPreflight.md`, `metadata/SafetyAuthorizations.json` (+ `.md`) |
| Notes | Yes | this document |
| **Videos** | **No** | Session recording is not enabled in this environment. |
| **Console logs** | **No** | Not collected this run. No case's Expected Result depends on console output; screenshots and API responses carry the evidence. |
| **Network logs (full HAR)** | **No** | The API responses each assertion depends on are recorded in the JSON files above; a full HAR was not kept. |

## 5. Known Limitations

| Limitation | Affected | Why it matters |
|---|---|---|
| **Run was headless, against this stage's headed norm** | all 16 | §11.1 makes headed the normal behaviour so a human can watch each step live. The user was asked before the run and chose headless. No result's Status is affected — screenshots and API responses were captured exactly as a headed run would — but the live human observation the stage is designed around did not happen. |
| **A scope decision was taken mid-stage** | TC-AGENCY-077, TC-AGENCY-081, TC-BR-102 | `Manual Reissue` was asserted by three approved cases when this run began. The user ruled it out of scope (`PO-29`) after the run, Stage 3 removed the clause, and the two cases that failed on it alone are now Passed. A reviewer should know the status of those two changed **because the expectation changed**, not because anything was re-executed. The observation itself is kept in §3.1.1. |
| **Credential 313 had to be re-attached to reach the mismatch state** | TC-AGENCY-082, TC-BR-103 | Both organisations had been reduced to one supplier and one credential (Sabre / 315) after run-006, so no second credential existed to select. Supplier NDCsbr with credential 313 was attached with the user's explicit go-ahead, used, and detached again. The Product Access change is wider than the selection swap originally authorized; the widened grant is recorded as `AUTH-AGENCY-UPDATE-DedicatedTestData-ProductAccess` and `AUTH-BRANCH-UPDATE-DedicatedTestData-ProductAccess`. |
| **The lock on the on-behalf booking was not ours to release** | TC-AGENCY-083 | `NDCEG-BR-F2609242aZ6EJ` was already locked by `odeysysadmin` before this run started and is still locked. The case was observed without taking the lock; its assertion (Reissue hidden) does not depend on the lock. |
| **Stage 3 was amended today and approved the same day** | all 16 | `PO-28`, the two inverted Expected Results and the booking-reference change were written on 2026-09-27 and approved at the Stage 3 gate the same day, by the person who requested them. A reviewer who wants an independent check of the amendment should read `modules/*/test_design/` before accepting these results. |

## 6. Recommendations

| ID | Recommendation | Applies to | Why |
|---|---|---|---|
| REC-008-1 | Pass §3.1.1's observation to whoever owns the Itinerary action bar, as information rather than as a defect of this story | out of scope (`PO-29`) | `Manual Reissue` is out of scope here, so this run neither asserts nor triages it. The observation is reliable (four agreeing observations) and may matter to that team; its cause is not established. |
| REC-008-2 | Answer REC-1 from run-006: should the Itinerary follow a **pending** Auto Reissue change? | TC-AGENCY-085 | Reproduced unchanged. A change nobody approved is already live on the Itinerary, which may bypass maker–checker. |
| REC-008-3 | Record `PO-28` as confirmed in the `reissue-flow` context and close run-007's `DS-2` | run-007 | `DS-2` was the open question that produced `PO-28`. It now has direct evidence from this run's TC-AGENCY-082 and TC-BR-103, not just the earlier single observation. |
| REC-008-4 | Keep a **second reissue-eligible credential permanently attached** to AGN9780 and BRN265 | TC-AGENCY-082, TC-BR-103 | These two cases cannot run without one. Re-attaching and detaching NDCsbr each time is avoidable churn on shared staging and risks leaving the data dirty. |
| REC-008-5 | Re-run the remaining run-006 cases that `PO-28` touches only indirectly | the 48 auto-reissue cases not in this run's scope | This run deliberately covered only the button-display cases. The picker and save-rule cases were not re-examined against `PO-28`. |

## 7. Delivery Completeness

| Check | Result |
|---|---|
| Every in-scope case has an outcome | Yes — 16/16 |
| Every Failed/Inconclusive case has a full defect write-up (§10.1) | N/A — none. The two cases briefly recorded Failed were reclassified Passed when `PO-29` removed the clause they failed on; the behaviour is kept as an out-of-scope observation (§3.1.1) |
| Evidence captured, or its absence stated with a reason | Yes — §4 |
| CSV has one row per in-scope case, statuses unabbreviated | Yes — 16 rows |
| QA Report coverage computed from the Traceability Matrix | Yes |
| All four renderings agree on every case's status | Yes |
| Shared-environment changes reverted | Yes — verified in `artifacts/final-state.json` |

No handoff section: this is the Manual pipeline's terminal stage.
