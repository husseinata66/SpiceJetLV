# QA Assessment Report — `agency`

# Revision 4 — run-006, 2026-09-24 (current)

| Field | Value |
|---|---|
| Module | `agency` |
| Produced by run | `agency+branch-run-001__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Revision | 4 |
| Project Context validated against | `modules/agency/context/ProjectContext.md` — revision **5**, **Approved** 2026-09-24 (Mohamed Soliman). **It was then edited during this stage:** `PO-21` … `PO-26` and the run-006 target environment (`.60`). Those edits were **Approved 2026-09-24 by Mohamed Soliman** at the Stage 2 review |
| Discovery Mode(s) used | Browser automation: **Browser Driver, headed** (Admin, `http://192.168.1.60`) and **Playwright direct login, headed** (Portal, `http://192.168.1.60:9500`). Human Observation (the user's statements). Documentation (the specification PDF) |
| Generated | 2026-09-24 |
| Status | **Approved** — Mohamed Soliman, Stage 2 Human Review gate, 2026-09-24 |
| Relationship to run-004 / run-001 | Independent. This run covers a different story (Auto Reissue). Revisions 3 and 2 below are unchanged |

## Headline

**The Auto Reissue checkbox does what the specification says, on Admin and on the Portal. No defect was found.**

1. **The Itinerary's `Reissue` button follows the checkbox of the organization the booking belongs to.** For AGN9780's own booking it followed AGN9780's checkbox: on, off, and on/off again on the Portal. For the Branch's own booking it followed BRN265's (see the `branch` report). A Branch that was on didn't make an Agency that was off show the button.
2. **All four save-rule errors the API returns are the specification's exact text.** `S-4`, `S-5`, `S-6` and `S-8` returned 400 each time, and nothing was saved. `S-7` holds: turning Auto Reissue off keeps the saved credentials, and turning it back on brings them back.
3. **Five things that looked like gaps were confirmed as intended by the user during this stage** (`PO-22` … `PO-25`). They are recorded as Findings so Stage 3 designs to them: FINDING-013 … 016, plus FINDING-017 in `branch`.
4. **The last open question is answered:** the Portal shows `Reissue` with no lock, while Admin needs one. **Intended** (user, 2026-09-24; FINDING-016).
5. **Two process points need your decision at this review.** First, the Project Context was edited after its approval (`PO-21` … `PO-26`, the `.60` environment). Second, this run changed **your designated records AGN9780 and BRN265**, not records it created. `PO-19` still says "self-created only", although the safety grants record the change (`GAP-AG-R6-01`, `-03`).

**Live state when Discovery ended:** AGN9780 Auto Reissue **off**, Approved, with `reissueCredentials [277]` still stored in the background (S-7). BRN265 **on**, `[313]`, Approved. The platform made no booking, and never clicked Reissue, Release PNR or Void/Cancel.

## 1. Scope

**Run Scope Type:** User Story. **Run Type:** User Story (`user_story_run`). **Story:** *Auto Reissue checkbox — Branch & Agency CRUD* (`knowledge_base/requirements/user_stories/Auto_Reissue_Checkbox_Branch_Agency.md`), with the technical specification `…/specifications/Auto_Reissue_Checkbox_Documentation.md`. This module covers the **Agency** half. The **Branch** half is written separately in `modules/branch/discovery/` (one output per module).

Validated against agency ProjectContext Revision 5 (Approved), §1.3 `PO-15` … `PO-26`, §2 (the Revision 5 rows), §5 and §6 (`ASM-003`, `ASM-019` … `ASM-022`, `RSK-011` … `RSK-014`). Per the User Story strategy (§16), exploration was limited to the Auto Reissue control, its credential picker, its save and approve path, and its effect on the Itinerary. **US-4222's field matrix was not re-explored.**

**Test records:** Agency **AGN9780** "NDC2_Mohamed Soliman" (id 10961, under BRN265), designated by the user as dedicated test data. Bookings: **`NDCEG-BR-F260924EAzzYT`** (made by the user under AGN9780, Sabre) and **`NDCEG-BR-F260916ENYOeQ`** (made by the user under BRN265).

## 2. Objectives

From ProjectContext §8.5 *Outstanding work* and the §2 Revision 5 rows:

1. Observe the Auto Reissue checkbox and credential picker on Create and Update Agency: labels, default, when the picker appears, what it lists, and the UI message for each rejection (ASM-019).
2. Capture the real save, read and approve endpoints and body from the app's own traffic (ASM-020).
3. List which credentials have `autoReissueAllowed`, read-only (RSK-012).
4. Save → approve → read back, on and off, including `S-7`.
5. Check the specification's save rules `S-2` … `S-8` (`PO-17`).
6. Check the Admin Itinerary `Reissue` button against the Agency's checkbox (spec §5, ASM-022, RSK-011).
7. **Added by the user during the stage:** the same check on the Portal (`PO-25`).

## 3. Evidence Sources

| Discovery Mode | In-Scope Areas Covered | Why This Mode |
|---|---|---|
| Browser automation — **Browser Driver**, headed | Admin: Add/Edit Agency, the Agency grid and approve, Search Booking, the booking Itinerary, reading the supplier credentials list | The default mode for authenticated Admin flows. It logs in from the git-ignored `credentials.json`, so no password appears in a command or artifact. **Headed at the user's request** (`browser.headless` defaults to headless) |
| Browser automation — **Playwright direct login**, headed | Portal login, `/myBooking`, and the Portal booking details | The Browser Driver profile holds the Admin login only. The Portal login form (agency code, email, password) was filled from `credentials.json` key `PORTAL_60`. It's the same mode with a different launcher, and the evidence category is unchanged |
| Human Observation | `PO-21` (supplier list), `PO-22` (the refusal after Reissue is clicked), `PO-23`, `PO-24`, `PO-26` (visibility and on-behalf rule) | The user's statements during the stage. **Not observed** where marked so (§7) |
| Documentation | The specification PDF (save rules, read-time clean-up, §5 conditions) | The source that `S-n` expectations are compared against |

**API rules (`S-4` … `S-8`)** were exercised by changing the app's **own** save request body in flight (`page.route`) on AGN9780 only. They are still Browser automation, not a separate API mode.

## 4. Modules Explored

| Module | Route(s) | Purpose | Discovery Mode |
|---|---|---|---|
| `agency` | `/admin/agency/add` (unsaved), `/admin/agency/edit/10961`, `/admin/agency` (grid search, status Both) | Auto Reissue control, credential picker, save and approve | Browser Driver |
| `agency` → Itinerary (the checkbox's effect) | `/booking/search-booking` → Flight → `/booking/booking-details/AGN9780NDCNDCORD260924GKP8CP` | `Reissue` button and `actionsDetails.canAutoReissue` | Browser Driver |
| `agency` → Portal (the checkbox's effect) | `:9500/auth/login` → `/myBooking` → Order Id → `/myBooking/booking-details/AGN9780NDCNDCORD260924GKP8CP` | Portal `Reissue` button | Playwright direct |
| `master-supplier` (read only, boundary) | `/master/supplier/supplier-credentials`, `…/edit/277` | Where `autoReissueAllowed` is visible | Browser Driver |

**Endpoints seen in the app's traffic (ASM-020):** `PUT /odeysysadmin/Admin2/agency/{id}` (save, 204) · `PATCH /odeysysadmin/Admin2/agency/approveOrReject` `{code, remarks, approvalStatus}` (200) · `GET /odeysysadmin/Admin2/agency/{id}` · `POST /odeysysadmin/Admin2/agency/search` · `GET /odeysysadmin/v2/bookingDetails2/itinerary/{orderId}` · `GET /odeysysadmin/Master2/supplierCredential/searchSupplierCredential`.

**Shared UI components:** the PrimeNG multi-select (the *Auto Reissue Credentials* picker, and each GDS supplier's PCC tab), the maker-checker Remarks dialog, and the Itinerary's passenger panel with its action buttons.

## 5. Observed Behaviour

| Module | Workflow / Rule | What Was Observed | Evidence Category | Finding ID(s) |
|---|---|---|---|---|
| agency | Checkbox presence and default | **"Auto Reissue"** checkbox under *Agency Features*, on Add and Edit Agency, **unchecked** by default. Ticking it shows **"Auto Reissue Credentials"**, a multi-select, with no server call (`01`, `02`) | Direct Observation | — |
| agency | Picker contents | Lists the credentials chosen in the PCC tabs of the Agency's assigned GDS suppliers. AGN9780 offered "Sabre Staging" (315) and "NDCSabre staging" (313) on 2026-09-23. After the user's manual changes, it offered only "GalileoLive" (277) on 2026-09-24 13:11 (`07`, `38`) | Direct Observation | — |
| agency | Save → approve → read back (on) | `PUT …/agency/10961` 204 with `autoReissueEnabled true`, `reissueCredentials [315]`. Inactive + Pending until approved (Remarks required), then Active + Approved. GET returned `true`, `[{credentialId:315}]`, and the form showed it ticked (`08`–`14`) | Direct Observation / System Response | FINDING-014 |
| agency | Off keeps credentials (S-7) | Unticking hides the picker, and the UI sends `reissueCredentials []`. After approval, GET returned `autoReissueEnabled false` **with `[315]` still stored** (`24`, `25`) | System Response | — |
| agency | Edit-form Approve | One `PUT`, with no Inactive state, `approvalStatus 1` straight away (13:11:56, 13:13:13) | System Response | FINDING-014 |
| agency | S-2 (UI) | On + empty picker → **"Required"**, no request sent (`34-rule-S-2`) | Direct Observation | FINDING-013 |
| agency | S-4 / S-5 / S-6 / S-8 (API) | 400 with *"Every auto-reissue credential must have an ID"*, *"…must exist and be active"* (unknown id 999999), *"…must not contain duplicates"*, *"Each auto-reissue credential must be mapped to this organization"* (277, not mapped at that time). Nothing saved. S-5's message was briefly shown on screen (`34-*`, `35`) | System Response | — |
| agency | Supplier support flag | 10 credentials read (first page only): `autoReissueAllowed` true for Galileo (277, 287, 289). False for Amadeus 278, AirArabia 280, AirArabiaEgypt 281, ShuraTech 282, FlyEgypt 284, FlyDubai 288, TravelFusion 291. The credential edit screen has no field for it (`36`, `37`) | System Response | — |
| agency | Admin Itinerary, AGN9780 **on** | Booking `…EAzzYT`: Status Booked (`bookingStatus 2`), `canAutoReissue true`. With the lock held, the panel shows Void / Cancel · Manual Reissue · **Reissue** · Sync PNR · Release PNR (`20`–`23`) | Direct Observation / System Response | FINDING-015 |
| agency | Admin Itinerary, AGN9780 **off** (BRN265 on) | `canAutoReissue false`, **Reissue hidden**. Manual Reissue and the other actions stay (`26`) | Direct Observation / System Response | — |
| agency | Portal OFF → ON → OFF | `canAutoReissue` false → **true** → false. Reissue hidden → **shown** → hidden. `lockedStatus 0` throughout. No Manual Reissue (`canManualReissue false`). No non-GET request from the Portal (`41`, `42`, `43`) | Direct Observation / System Response | FINDING-016 |
| agency | Status labels | The bar reads "Ticketed Document", while Status and passengers read Booked, in both Admin and the Portal | Direct Observation | FINDING-015 |
| agency | Save body | The update `PUT` carries the record's stored `remarks` value ("Approved", the last approval remark) when no new remark is typed (`44`, 21:40:15) | System Response | — |

Evidence file numbers refer to `runs/run-006…/discovery/evidence/`.

## 6. Confirmed Behaviour

| Requirement (Project Context §) | Confirmed Behaviour | Evidence Category | Finding ID(s) |
|---|---|---|---|
| §2 *Auto Reissue checkbox on Create/Update Agency, default unchecked*; `PO-15` | Present on both forms, labelled "Auto Reissue", unchecked by default, toggles on and off | Direct Observation | — |
| §2 *Saved value is retrieved when edited*; spec §4 | The form and the GET both return the saved flag and credentials | Direct Observation / System Response | — |
| §2 *Reissue-credential selection (UI)*; `PO-21` | The picker lists only eligible credentials of assigned, supported GDS suppliers | Direct Observation | — |
| §2 *Backend save rules* (S-4, S-5 unknown id, S-6); spec §3 | 400 with the exact messages, nothing saved | System Response | — |
| §2 bounded by Branch; spec `S-8`; `PO-16` | A credential not mapped to the Agency is refused with the S-8 message | System Response | — |
| §2 *Off keeps saved credentials*; spec `S-7` | Credentials kept while off, and pre-filled when turned back on | System Response | — |
| §2 *Agency and Branch independent*; `PO-16` | BRN265 on while AGN9780 off → AGN9780's booking hides Reissue | Direct Observation | — |
| §2 *Admin Itinerary Reissue visibility*; spec §5 | Booked + Agency on + Sabre → shown. Agency off → hidden | Direct Observation / System Response | — |
| `PO-25` (Portal Impact) | Portal button follows the Agency's checkbox | Direct Observation | FINDING-016 (no Portal lock: intended) |
| §2 *Maker–checker on the new field*; XC-01, XC-04 | Send For Approval → Pending → Approve → takes effect | Direct Observation | FINDING-014 |
| `PO-23` | S-2 shows "Required" on screen | Direct Observation | FINDING-013 |
| `PO-24` | The eligibility status is Booked, not the bar label | Direct Observation | FINDING-015 |

## 7. Assumptions

| ID | Assumption | Why Inferred (not observed) | Evidence Category |
|---|---|---|---|
| A-AG-R6-1 | A booking that Admin or a Branch makes **on behalf of** an Agency follows the **Agency's** checkbox (`PO-26`) | The user's statement. No on-behalf booking existed to observe | Human Observation |
| A-AG-R6-2 | An Agency's Portal login cannot see its parent Branch's bookings (`PO-26`) | The user's statement. Not tried on screen | Human Observation |
| A-AG-R6-3 | The selected credentials are enforced when Reissue is clicked, with *"No credential for this booking is assigned to your organisation"* (`PO-22`) | The user's statement. Reissue was never clicked (out of scope, and forbidden this run) | Human Observation |
| A-AG-R6-4 | The picker's filter is the hard-coded supplier list (NDCsbr, Sabre, TravelportNdc, Galileo), shown as `autoReissueAllowed` (`PO-21`) | The user's statement. Consistent with Sabre, Galileo and NDCsbr listed and Amadeus and the LCC excluded. **TravelportNdc wasn't seen** | Human Observation (partly corroborated by Direct Observation) |

## 8. Open Questions

| ID | Open Question | Rect | Why the Answer Matters | What Would Resolve It | Original | Annotated | Project Context Ref |
|---|---|---|---|---|---|---|---|
| OQ-AG-R6-1 | **Closed 2026-09-24: intended** ("there is no need of lock on the portal"). Was: is it intended that the Portal shows `Reissue` on an unlocked booking, with no lock control? | `Q1a Reissue shown, booking not locked`, `Q1b no lock control on Created By` | Sets the precondition for every Portal Reissue case, and decides whether FINDING-016 becomes a Bug | Product-owner answer | `findings/FINDING-016_PortalReissueShownWithoutLock/42-portal-1-AGN9780-ON-itinerary.png` | `…/42-portal-1-AGN9780-ON-itinerary.annotated.png` | `PO-25`; `Reissue_Flow_From_Itinerary.md` CL-3 |
| OQ-AG-R6-2 | **RSK-013 — still unresolved.** Does `canAutoReissue` read the approved value or the pending one? | — | A case checked between Send For Approval and Approve could pass or fail for the wrong reason | One Stage 3 case: check the booking while the change is pending | — | — | RSK-013 |
| OQ-AG-R6-3 | **RSK-012 — partly unresolved.** No credential that is **inactive**, or has become unmapped or unsupported **after being selected**, exists on `.60`. So `S-5` (inactive variant) and spec §4 read-time clean-up can't be reached without changing supplier data | — | Two specification rules would have no test | A supplier or credential in that state (not granted), or a decision to defer | — | — | RSK-012; §3 |
| OQ-AG-R6-4 | **ASM-021 — unresolved but consistent.** Are "mapped to this Agency" (S-8) and "on its parent Branch" (`PO-16`) the same set? Everything seen fits, but no case where the two could differ was found | — | Decides whether the "bounded by Branch" case needs its own test | A credential on the Branch but unselected on the Agency's Product Access, tried against S-8 | — | — | ASM-021 |
| OQ-AG-R6-5 | Only **page 1 of 10** of the supplier credentials list was read (the paginator didn't advance). Other unsupported or inactive credentials may exist | — | Could provide the missing `S-5`/`S-9` data without changing anything | A read-only API call with a larger page size | — | — | RSK-012 |

## 9. Discovered Risks

| ID | Risk | Business Risk | Technical Risk | Finding ID(s) |
|---|---|---|---|---|
| R-AG-R6-1 | **Concurrent manual changes on the same account.** BRN265 and AGN9780 were changed by hand in another session during the run (the Sabre supplier added, the flag flipped, the picker's options changed) | Results can be credited to the wrong change | One Branch OFF check was inconclusive and was repeated. Every later check read the flag right before the button check | FINDING-017 |
| R-AG-R6-2 | **Stored credentials persist while off** (S-7). AGN9780 now stores `[277]` while off | A later "turn on" case starts with a pre-filled picker, not an empty one | Test setup must read the state first, not assume it | — |
| R-AG-R6-3 | **Admin action buttons depend on the lock, which is shared** | A case can fail because someone else holds the lock | The Admin lock holder changed between "odeysysadmin" and "Mohamed Soliman" during the run | FINDING-016 |

## 10. Coverage

| Area / Module | Coverage Status | Discovery Mode | Notes |
|---|---|---|---|
| Checkbox on Create/Update | Covered | Browser Driver | Create observed unsaved only |
| Saved value retrieved | Covered | Browser Driver | |
| Credential picker (UI) | Covered | Browser Driver | TravelportNdc not seen |
| Bounded by parent Branch | Partial | Browser Driver | S-8 seen. ASM-021 open |
| Backend rules S-3 … S-6 | Partial | Browser Driver (in-flight body edit) | S-4, S-5 (unknown id), S-6 seen. **S-3 not run.** S-5 inactive not reachable |
| S-7 | Covered | Browser Driver | |
| Read-time clean-up (spec §4) | Blocked | — | Needs a supplier change (RSK-012) |
| Independence from Branch | Covered | Browser Driver | |
| Admin Itinerary button | Covered | Browser Driver | |
| Admin can view/manage | Covered | Browser Driver | |
| Regression smoke | Skipped | — | Left to Stage 3 (RSK-014) |
| Maker–checker | Covered | Browser Driver | |
| Portal Itinerary button (`PO-25`) | Covered | Playwright direct | |

**Roll-up:** 9 Covered · 2 Partial · 1 Blocked · 0 Unreachable (1 Skipped). **11/13 areas visited = 85%.**

## 11. Gaps

| ID | Gap Type | Description | Project Context Ref | Finding ID(s) |
|---|---|---|---|---|
| GAP-AG-R6-01 | Extends | `PO-19` and §5 say run-006 changes **only records it created**. After the user's instruction, the run instead changed the user's **designated** records AGN9780 and BRN265. That change is recorded as `…-DedicatedTestData` grants in `metadata/SafetyAuthorizations.json`, but not in the Project Context | `PO-19`; §4; §5 | — |
| GAP-AG-R6-02 | Contradicts (resolved) | `PO-20` "Admin only" / §3 "Portal impact deferred" is superseded by `PO-25` | `PO-20`; §3; `PO-25` | FINDING-016 |
| GAP-AG-R6-03 | Extends | `PO-21` … `PO-26` and the `.60` target were written into the **approved** Project Context during Stage 2 (Stage 2 normally doesn't write there, per explorer-skill §26). They need your approval | §1.3; header | — |
| GAP-AG-R6-04 | Absent (answered) | The Portal lock rule wasn't defined. The user answered: no lock on the Portal. Recorded in `PO-25` | `PO-25` | FINDING-016 |
| GAP-AG-R6-05 | Contradicts | §5 (row *Shared staging*), §7 (target-environment row) and §8.3/§8.5 (*"Verify `odeysysadmin` can log in on `http://192.168.1.70`"*) still name `.70`. The run used `.60`, and the Admin login was verified there on 2026-09-23 21:22 | §5; §7; §8.3; §8.5 | — |
| GAP-AG-R6-06 | Extends | `S-2` has two messages, one per layer | spec `S-2`; `PO-23` | FINDING-013 |
| GAP-AG-R6-07 | Contradicts (run record) | `metadata/SafetyAuthorizations.json` records the `…-DedicatedTestData` grants as approved at **2026-09-24T09:30Z** (BRN265) and **09:45Z** (AGN9780). The user gave them in the conversation at **2026-09-23 21:34Z** and 21:37Z, and the first AGN9780 change was at 21:38Z. The recorded times are later than the actions they authorize | run-006 `SafetyAuthorizations.json` | — |

## 12. Recommendations

| ID | Recommendation | Rationale | Finding ID(s) |
|---|---|---|---|
| REC-AG-R6-1 | At this review, approve or amend `PO-21` … `PO-26`. Add the designated test records (AGN9780, BRN265) to `PO-19` and §5, and change the remaining `.70` references to `.60` for run-006 | Closes GAP-AG-R6-01, -03, -05 through Stage 1 rather than by this stage | — |
| REC-AG-R6-2 | Portal Reissue cases have no lock step. Admin cases keep it | Answered 2026-09-24 | FINDING-016 |
| REC-AG-R6-3 | In Stage 3, read the flag in the same session right before each button check | The concurrent-change risk seen this run | FINDING-017 |
| REC-AG-R6-5 | Correct the `approvedAt` values of the DedicatedTestData grants to when they were actually given (GAP-AG-R6-07), through `authorizations.js` | The safety record must not show an approval after the change it covers | — |
| REC-AG-R6-4 | Use the edit form's **Approve** for set-up. Keep one explicit Send For Approval case | Avoids the Inactive window | FINDING-014 |

**Regression Test Candidates:** the Itinerary button following the Agency's checkbox (Admin and Portal, on/off); `S-7` persistence; the `S-4`/`S-5`/`S-6`/`S-8` messages; the picker excluding LCC and Amadeus credentials; independence from the Branch.

## 13. Inputs for Test Design

**Findings by ID:**

| Finding ID | Category | Status | Severity | Module |
|---|---|---|---|---|
| FINDING-013 | Requirement Gap | Rejected — Confirmed Intended (`PO-23`) | N/A | agency |
| FINDING-014 | Observation | Rejected — Confirmed Intended (`PO-24`) | N/A | agency |
| FINDING-015 | Observation | Rejected — Confirmed Intended (`PO-24`) | N/A | agency |
| FINDING-016 | Observation | Rejected — Confirmed Intended (user, 2026-09-24) | N/A | agency |
| FINDING-017 *(in `branch`)* | Observation | Rejected — Confirmed Intended (`PO-22`) | N/A | branch (second occurrence on AGN9780) |

**Assumption disposition:**

| Assumption ID | Disposition | Basis |
|---|---|---|
| ASM-003 (refined) | Confirmed (consistent) | Every credential the Agency picker offered was also on BRN265 when checked. S-8 refused 277 while it wasn't mapped |
| ASM-019 | Confirmed | Picker observed (multi-select, shown only when ticked). UI messages: S-2 "Required", S-5 briefly on screen |
| ASM-020 | Confirmed | Endpoints in §4 |
| ASM-021 | Unresolved | OQ-AG-R6-4 |
| ASM-022 | Confirmed (refined) | Booked status, not the bar label (`PO-24`) |
| RSK-011 | Resolved | The user supplied both bookings |
| RSK-012 | Partly unresolved | OQ-AG-R6-3, OQ-AG-R6-5. S-9 seen in the UI (Amadeus excluded) |
| RSK-013 | Unresolved | OQ-AG-R6-2 |
| RSK-014 | Carried to Stage 3 | Not a Discovery item |

**Requirement Gaps needing a coverage decision:**

| Gap ID | Requirement | Decision Needed From Test Design |
|---|---|---|
| TD-AG-R6-1 | `S-3` (off + credentials on update) | Design as an API case on AGN9780 |
| TD-AG-R6-2 | `S-5` inactive variant, spec §4 clean-up | Defer, or design with a precondition that the environment lacks |
| TD-AG-R6-3 | TravelportNdc in the picker | Design (needs a Travelport credential on a test org) |
| TD-AG-R6-4 | On-behalf booking follows the Agency (`PO-26`) | Design; needs a user-made on-behalf booking |
| TD-AG-R6-5 | `S-2` API message | Design an API case |
| TD-AG-R6-6 | Pipeline branch (4M / 4A) | Human decision at the Stage 3 gate (`PO-20`) |

**Handoff confirmation:** every input test-design-skill §4 needs is present: this report (13 sections), Timeline, Coverage Summary, Findings Summary, one evidence package per Finding, each with an Expected Behavior citing a Project Context section, and three snapshots (`AgencyUpdateForm_AutoReissue_run-006.md`, `BookingItinerary_Admin_run-006.md`, `BookingItinerary_Portal_run-006.md`). **One condition:** Stage 3 should start only after the §11 context items are approved, because several expected results cite `PO-21` … `PO-26`.

---

# Revision 3 — run-004, 2026-08-18 (retained in full, unchanged)

| Field | Value |
|---|---|
| Module | `agency` |
| Produced by run | `run-004__2026-08-17_14-35-25__UserStory__US-4222-UpdateAgency` |
| Revision | 3 |
| Project Context validated against | `modules/agency/context/ProjectContext.md` — revision **3**, status **Approved** (2026-08-17) |
| Discovery Mode(s) used | Browser automation — **Browser Driver**, **headed**. No fallback mode was needed or used |
| Generated | 2026-08-18 |
| Status | **Approved** — Ahmed Ayman, Stage 2 Human Review gate, 2026-08-18 |
| Relationship to run-001 | Independent. run-001's artifacts below are unchanged; this revision sits above them and states where the two disagree |

## Headline

**The application still works, and one of run-001's headline findings no longer holds.**

Nothing failed during this run — no HTTP error, no crash, no timeout. Six page loads, all clean. Five Findings were raised and seven were re-checked.

Three things a reviewer should take from this run:

1. **AC-9's PCC section is not missing.** It is present, renders one tab per supplier inherited from the parent Branch, and each tab carries three of AC-9's controls. run-001 recorded the whole section as absent. After a controlled experiment on 2026-08-18 the escalation is down to **two fields** — `Search Supplier Credential PCC` and `Ticketing Supplier Credentials PCC` — and the story's "filters" turn out to be the tabs themselves. **FINDING-008.**
2. **One Finding is an actual `Bug`, the module's first.** Numeric fields discard non-numeric keystrokes without showing PRD XC-20's `[V]` message. Every other Finding in this module's history has been a disagreement between requirement sources; this one is the application falling short of a settled, unsuperseded requirement. **FINDING-010.**
3. **Every product-owner decision that this stage was told to observe rather than assume, held.** `PO-6` Cancel, `PO-7` document and logo persistence, `PO-8` the Product Access table, `PO-10` Branch read-only — all four verified against the live form.

The `branch` knowledge reuse earned its place twice: polling for pre-fill (R-2) and typing real keystrokes for max-length probes (R-1) each prevented a false Finding that the `branch` module had already paid for once.

## 1. Scope

**Run Scope Type `User Story` · Run Type `User Story`** — the narrowest strategy in §16: targeted verification of US-4222's acceptance criteria, with no wandering into adjacent Agency behaviour. Validated against **Project Context revision 3, Approved**, which carries twelve product-owner decisions (`PO-1` … `PO-12`), routes this run down the **Automation Pipeline**, and narrows mutation to self-created records.

Agency search and Create Agency are in scope **as means only**. Create Agency was exercised no further than loading its form and submitting it empty to elicit validation messages — no record was created.

## 2. Objectives

1. Re-verify the environment and the credentials, which Project Context §4 records as existing but **not re-verified in run-004**.
2. Observe the live Update form against US-4222's ten AC groups and its four Expected Outcome actions.
3. Discharge the four decisions that require observation rather than assumption: `PO-7`, `PO-8`, `PO-10`, `PO-12`.
4. Capture the **exact** validation strings, so Stage 3 designs from observation rather than from the story's older wording (`PO-12`).
5. Re-check run-001's seven Findings against the application as it is today, without editing run-001's records.
6. Apply the `branch` module's transferred *methods* while carrying across none of its data, selectors, or findings (`metadata/BranchKnowledgeReuse.md`).

## 3. Evidence Sources

| Discovery Mode | Areas covered | Why |
|---|---|---|
| **Browser automation — Browser Driver, headed** | Every area of this run: login, agency list, update form, create form, validation probing, annotated evidence capture | Highest-priority mode (§8.1 #1) and available. The driver was chosen over the Playwright MCP server because every flow here is behind a login: the driver authenticates in-process and never exposes a credential value, while an MCP call would put one in the transcript (`mcp/README.md` §1.3) |

**Headed rather than headless, and why that is recorded here.** The platform default is headless for both mechanisms, with headed reserved as a human operator's explicit opt-in. The operator selected **headed** at the standing Headed/Headless gate for this run. This changes nothing about the evidence: screenshots, DOM, console and network are captured identically, so Evidence Category and the Confidence ceiling (§17–§18) are unaffected. What it adds is live human observation while the run executed.

No fallback mode was needed. The environment was reachable throughout — probed over raw HTTP first (`http://192.168.1.70/` → 200), per `branch` reuse item R-4, before any browser navigation.

## 4. Modules Explored

| Route | Screen | Purpose |
|---|---|---|
| `/dashboard` | Post-login landing | Confirms the credentials work — Project Context §4's open item |
| `/admin/agency` | Agency list | Locating the record under test. Grid columns `Code · Agency Name · Country Name · City · Status · Approval Status · Branch Name · Actions` |
| `/admin/agency/edit/949` | **Agency Update form** | The screen US-4222 governs. Eleven regions — see `AgencyUpdateForm_run-004.md` |
| `/admin/agency/add` | Agency Create form | Validation-message capture only — see `AgencyCreateForm_ValidationState_run-004.md` |

**Reusable components observed** (named, not catalogued as locators): PrimeNG dropdown, multiselect and calendar; a repeatable-row pattern with an `Add` button (documents, sales contacts, bank accounts); a phone control with a country-flag selector; a checkbox-group pattern; an in-cell editable table.

## 5. Observed Behaviour

- The Update form pre-fills every populated field within about **1 second**; 61 of 78 inputs held values at the 1000 ms poll.
- **Branch is `disabled` and `readOnly`**, displaying `Test (BRN2)`. It cannot be changed from inside the form.
- `Country` is read-only and inherited, showing `Egypt` — AC-1 as written.
- **The stored document and the stored logo are present on load** and need no re-upload to open or edit the record.
- **Product Access Details is a table**: `STATUS · SUPPLIER NAME · CREDENTIAL NAME · PRODUCT NAME · DESCRIPTION`, one row, `TravelportNdc` / `Flight`, with `Select Product` checkboxes (`Flight`, `Others`) above it.
- **The Airline Supplier credential (PCC) section renders while a supplier row is selected**, carrying a supplier tab and three controls.
- **Cancel discards and exits**: an in-form change to `Company URL` was abandoned by `Cancel`, the browser returned to `/admin/agency`, and reopening the record showed the original value.
- Max lengths are enforced against real keystrokes: `Post office box *` caps at 8, `Credit Terms (Days) *` at 11.
- Mandatory violations render `Required`; a malformed email renders `Please enter a valid email`; an empty Product Access selection renders `Please select at least one supplier.`
- The update form offers `Cancel · Send For Approval · Approve · Reject`; the create form offers only `Cancel · Send For Approval`.

## 6. Confirmed Behaviour

Validated against a clearly documented requirement and found to match:

| Behaviour | Requirement it matches |
|---|---|
| Mandatory-field violation renders `Required` | PRD **XC-17** `[V]` — the platform-wide string |
| Malformed email renders `Please enter a valid email` | PRD **XC-18** `[V]` — verbatim, including capitalisation |
| Phone fields hold the national number only, with a separate country selector | Knowledge item **BR-005** and `branch` reuse R-10 — the story's *"+ Phone country code"* wording is the outlier |
| The approval-submit button reads `Send For Approval` | `branch` FINDING-011, confirmed by the module owner 2026-08-10. **Now re-observed on the Agency form**, as reuse item R-11 required rather than assumed |
| `Country` read-only and inherited from Branch | US-4222 AC-1; PRD **ORG-05** `[V]` |
| Branch not changeable from Agency Update | `PO-10` |
| Documents and logo persist on Update | `PO-7` |
| Product Access renders as a table with the five named columns | `PO-8` |
| Cancel discards unsaved changes without persisting | `PO-6`; PRD **GEO-09** / **SUP-10** `[V]` establish the platform-wide pattern |
| Status and Approval Status are distinct grid columns | PRD **XC-07** `[V]` |

## 7. Assumptions

| # | Assumption | Evidence Category |
|---|---|---|
| A-1 | The PCC section's visibility is driven by the Product Access supplier selection, and run-001 observed a record in the deselected state. Deselection reproducibly hides it; *why* run-001 saw no section is inferred. | Assumption (the mechanism), Direct Observation (the dependency) |
| A-2 | The numeric fields use a keystroke filter rather than post-hoc validation. Typed characters never appeared at all, which is that pattern's signature — but the implementation was not read. | Assumption |
| A-3 | `Manager Name`'s value is inherited from the supplier credential record. Consistent with ORG-07's cascade and with the value `live`, but the `master-supplier` module was not opened. | Assumption |
| A-4 | Record 949's contents are not a stable fixture. Its `Remarks` reads `QA TC23 - reactivating after test` and the payment option count moved between runs, so other testers are acting on it. | Direct Observation, generalised |

## 8. Open Questions

Each carries a labelled rectangle in its Finding's annotated evidence (§5.11.1).

| # | Question | Rect | Raised in | Blocks Stage 3? |
|---|---|---|---|---|
| OQ-1 | Are the three live PCC controls AC-9's fields under different names, and what happened to `Search Supplier Credential PCC` (Mandatory), `Ticketing Supplier Credentials PCC`, and the Amadeus/Galileo/Sabre filters? | `Q4` | FINDING-008 | **Answered 2026-08-18 by experiment — no longer blocking.** One business question remains, recorded below |
| OQ-2 | Is `Manager Name` intentionally read-only on Update, and should it still show a mandatory marker? | `Q1` | FINDING-009 | **Answered 2026-08-18 — closed.** See below |
| OQ-3 | Should numeric-only fields show XC-20's message, or is silent masking the intended design? | `Q5` | FINDING-010 | No — design to the requirement (row 5) and let execution report it |
| OQ-4 | Should `Company URL` validate URL format? | `Q6` | FINDING-010 | No — design to observed behaviour, flagged as resting on the directive |
| OQ-5 | Are the person-name payment methods expected to stay on STG, and which options may a test select? | `Q2` | FINDING-011 | No — mitigated by selecting `Cash` / `Wallet` by label |
| OQ-6 | Are `Transfer Pnr Option` and `Blue Command Screen` in scope, and is the Galileo dependency a documented rule? | `Q3` | FINDING-012 | **Answered 2026-08-18 — closed. Out of scope by decision**, together with `Enable Search Limit` |

**OQ-1 — the half that is now answered (product owner, 2026-08-18).** Agency suppliers are **inherited from the parent Branch**; a supplier is never added at Agency level, only checked or unchecked. A Branch with no suppliers gives its Agencies none — so the PCC section legitimately cannot appear. Where the Branch holds several, the Agency selects **at least one**, which is exactly what the `Please select at least one supplier.` message enforces.

Three consequences follow, and they change work rather than just closing a question:

1. **FINDING-008's conditional rendering is intended behaviour**, not a defect, and this is the most likely explanation of run-001's FINDING-002.
2. **A fixture precondition now exists:** the agency under test must sit under a Branch that already has at least one supplier, or AC-9 is unreachable by construction. Stage 5A creating an agency under an arbitrary Branch would see no PCC section and report a false absence.
3. Recorded as durable cross-module knowledge **`BR-006`** (`knowledge/INDEX.md`), extending `BR-002`.

**OQ-1 — the field-identity half, answered by controlled experiment on 2026-08-18.** This run could not make the Branch change itself: mutating a shared Branch is `Approval Required`, but **approving a record this run did not create is `Forbidden (absolute)`**, so a Branch edit could have been submitted and never approved — leaving BRN287 stuck in *Pending for approval* with the question still unanswered. The human made and approved the change; this stage observed the result read-only.

Adding `Amadeus` and `Sabre` to Branch `BRN287` put **all three suppliers on the child Agency automatically, already ticked, each with its own PCC tab**. With three suppliers inherited and their PCCs selected, every tab renders **the same three controls**:

| AC-9 names | Live equivalent |
|---|---|
| Filters: Amadeus PCC · Galileo PCC · Sabre PCC | **the supplier tabs themselves** — one per inherited supplier |
| `Generic Supplier PCC` | `Generic supplier credentials (PCC) *` |
| `Manager Name` | `Manager Name *` (read-only — FINDING-009) |
| `Supplier Credential Description` | `Supplier Credentials Description *` |
| **`Search Supplier Credential PCC`** (Mandatory) | **absent** |
| **`Ticketing Supplier Credentials PCC`** | **absent** |

The two absent fields were searched by page text across **five supplier tabs on two Branches and two Agencies** and appear in none. The idea that they might surface only for a GDS supplier with a PCC selected is **refuted** — Amadeus and Sabre are GDS, their PCCs are selected, and the fields still do not exist.

**Stage 3 is unblocked on AC-9:** design three controls per supplier tab, repeated per inherited supplier, and assert the parent Branch carries the supplier first (`BR-006`). The two absent fields get no test case and stay on record as a gap.

**Still open, but not blocking:** were those two fields removed deliberately or never built? The answer changes the record, not the coverage.

**OQ-2 — answered and closed (product owner, then verified).** `Manager Name` is authored in the **Supplier master** (`Master → Supplier → Supplier`), where it is mandatory and editable. It is inherited **read-only** into both the Branch and the Agency `Airline Supplier credential (PCC)` sections, and its value differs per supplier (`Galileo` → `Test`, `NDCGal` → `ewr`, `TravelportNdc` → `live`).

Consequences:

1. The read-only state is **intended**, at Branch level as well as Agency level.
2. **AC-9's *"Please enter a valid Manager Name."* is not an Agency requirement** — it belongs to the Supplier module. FINDING-009's disposition moves from row 2 to **row 4, `Story Outdated — Confirmed`**.
3. **Stage 3 designs an inheritance assertion**, not a validation case: the Agency displays the supplier master's value and cannot edit it.
4. Recorded as durable cross-module knowledge **`BR-007`**.

**A safety note from that lookup, recorded because it happened rather than because it was planned.** Reaching the Supplier master passed through `Master → Supplier → Supplier Credentials`, whose records hold **live API credentials** (username, password, endpoint). One evidence file and one screenshot captured those values and were **scrubbed and deleted immediately**; only the structural fact this run needed was kept. No secret reached any artifact. Stage 3 and Stage 4A should treat Supplier Credential records as credential-bearing and never screenshot them.

**Carried-forward assumptions and risks, each given a direct answer** (Execution Rule 5). Project Context §6 carries ASM-001 … ASM-018 and RSK-001 … RSK-009; `PO-1` … `PO-12` retired nine of them at Stage 1. Of those still live for this stage:

| ID | Outcome |
|---|---|
| ASM-002 — the PRD describes no Agency *update* flow; the update form is assumed to mirror create | **Refuted in part, and usefully.** The two forms differ: `Remarks *` and the Approve/Reject buttons exist only on update; the PCC section cannot exist on create. Stage 3 must not design update cases from create-form structure |
| ASM-003 — Agency PCCs are inherited from Supplier and Branch | **Consistent, not proven.** The section is supplier-scoped and `Manager Name` is read-only, both consistent with inheritance. Proving it needs `master-supplier`, which is out of scope |
| ASM-012 — do existing documents and logo persist on update? | **Answered: yes** (`PO-7` verified) |
| ASM-013 — the PCC/Product Access layout is ambiguous in the AC | **Answered by observation** (`PO-8`): a five-column table, plus a separate supplier-tabbed PCC section |
| ASM-016 — can Branch be changed, and does it re-inherit? | **Answered: Branch cannot be changed** (`PO-10`). Re-inheritance is therefore unreachable and untested, by decision |
| ASM-018 → `PO-12` — are the story's validation strings current? | **Answered: no.** 23 mandatory fields render `Required`, not per-field messages. Exact strings captured |
| RSK-001 — shared environment, other testers' data | **Materialised and contained.** Record 949 shows another tester's remark; the payment option count moved between runs. No record was mutated |

## 9. Discovered Risks

| # | Risk | Framing |
|---|---|---|
| R-1 | XC-20's numeric message does not appear on this form. If server-side validation is equally absent, a non-numeric value from another client would not be caught here. Not probed — no API-level check was run | Technical |
| R-2 | `Company URL` stores unusable values (`asdas` is live on record 949). Any downstream consumer of the agency URL receives junk | Business |
| R-3 | The PCC section's conditional rendering will produce **false absences** in automation that does not first assert a selected supplier row. This is the failure that produced the run-001 result | Technical, and directly aimed at Stage 4A |
| R-4 | The `Payment option` set is live master data whose size changed between runs. Any count assertion or index-based selection will be flaky by construction | Technical |
| R-5 | `Manager Name *` is mandatory and unfillable. If its inherited value were ever empty, the form could be unsubmittable with no user-facing remedy. Not reproduced — the observed value was non-empty | Business |
| R-6 | Record 949 is shared. Designing Stage 3 cases against its current values would couple the suite to data other testers change | Technical |

## 10. Coverage

**100% of the in-scope screens** — 4/4 visited (dashboard, agency list, update form, create form). Full detail, including per-AC depth and what was deliberately not executed, is in `Coverage_Summary.md` (run-004 section). Every entry there records its Discovery Mode.

The distinction that matters: **screen coverage is not criterion coverage.** Discovery reads and observes; executing AC-3's upload rules, AC-4's 2 MB limit, AC-10's downstream toggle effect, and the Approve/Reject workflow belongs to Stage 5A against a self-created record, because those actions mutate.

## 11. Gaps

| # | Gap | Finding | Disposition (ProjectContext §1.1) |
|---|---|---|---|
| G-1 | `Search Supplier Credential PCC` (Mandatory) and `Ticketing Supplier Credentials PCC` are absent from every supplier tab. The AC-9 "filters" are **not** missing — they are the supplier tabs | FINDING-008 | **Row 2** — PRD names the section, not these two fields. Narrowed from row 3 once the section was shown to exist |
| G-2 | `Manager Name` is a mandatory text field in the story, read-only in the application | FINDING-009 | Row 2 |
| G-3 | Numeric fields enforce their rule without XC-20's `[V]` message | FINDING-010 | **Row 5** — application defect candidate |
| G-4 | `Company URL` has no format validation, though the story specifies *"Please enter a valid URL."* | FINDING-010 | Row 2 — the PRD is silent |
| G-5 | Mandatory violations render one shared `Required` where the story specifies about 20 distinct messages | run-001 FINDING-001, re-confirmed with exact strings | Row 1 — settled, PRD-corroborated |
| G-6 | Document upload enforces no file type; a `.png` is attached where AC-3 requires PDF | run-001 FINDING-004, re-confirmed | Row 5 |
| G-7 | `Designation` is absent from the Sales Contact section | run-001 FINDING-006, re-confirmed | Row 2 |
| G-8 | `Transfer Pnr Option`, `Blue Command Screen` and `Enable Search Limit` appear in no requirement | FINDING-012 | **Documented exception** — out of scope by product-owner decision, 2026-08-18. Carried to the User Story that owns these features |
| G-9 | Role authorization is not assessable and is **not assessed** — one identity, which sees Approve and Reject on the maker form | run-001 FINDING-007, re-confirmed | Not a requirement mismatch. Now a declared exclusion owned by the future Role CRUD module (`PO-9`) |

## 12. Recommendations

**Regression test candidates** — behaviour worth protecting, stated as areas, not as designed cases:

1. Update-form pre-fill completeness (61/78 inputs within 1 s) — a regression here is invisible until a tester saves a half-loaded form.
2. Branch remaining non-editable on Update (`PO-10`).
3. Cancel discarding without persisting (`PO-6`) — verified end to end this run.
4. Document and logo persistence on Update (`PO-7`).
5. The PCC section appearing whenever a supplier row is selected — the exact condition that made run-001 report it missing.
6. `Required` and `Please enter a valid email` as the literal mandatory and email strings.

**For Stage 3, specifically:**

- Select payment options **by label** (`Cash`, `Wallet`, `Credit Card`); never by index and never assert the option count.
- Assert the PCC section only after asserting a selected supplier row.
- Design AC-9 as the three observed controls, and hold the absent ones pending OQ-1 rather than dropping them.
- Take every validation expected result from §5 of `AgencyUpdateForm_run-004.md`, not from US-4222's strings.

**For the product owner:** OQ-1 and OQ-2 are the two answers that change what gets designed. The rest can be answered after Stage 3 starts.

## 13. Inputs for Test Design

**Findings by ID, Category, Status** — full detail in each package's `metadata.md`:

| ID | Category | Status | Disposition maps to |
|---|---|---|---|
| FINDING-008 | Requirement Gap | Needs Human Review | Exploratory test + escalation on the absent fields |
| FINDING-009 | Observation | Needs Human Review | Exploratory test |
| FINDING-010 | **Bug** | Needs Human Review | Design to the requirement (row 5); execution reports the outcome |
| FINDING-011 | Observation | Needs Human Review | Documented exception — data quality, not application behaviour |
| FINDING-012 | Requirement Gap | Needs Human Review | **Documented exception — decided out of scope 2026-08-18.** No test case; evidence carried to the future feature story |
| FINDING-001 … 007 (run-001) | unchanged | unchanged | Re-check outcomes in `findings/ReCheck_run-004.md` — read that alongside the packages |

**Confirmed / refuted / unresolved assumptions:** §7 and the carried-forward table in §8.

**Requirement gaps needing a coverage decision:** none remain blocking. G-1 was answered by experiment on 2026-08-18 and G-8 was decided out of scope on the same day. Every gap now has a disposition Stage 3 can act on.

**One precondition Stage 3 and Stage 5A must honour.** AC-9 is only reachable on an Agency whose **parent Branch already carries at least one supplier** (`BR-006`) — an Agency seeded under a supplier-less Branch shows no PCC section, and any test of AC-9 fails for the wrong reason.

**Fixture strategy — answered 2026-08-18, and it removes the precondition rather than working around it.**

> **Product owner:** the automation builds its **own Branch** first — choosing its supplier and supplier credential exactly as the `branch` automation already does — then creates as many Agencies under it as the suite needs. Both the Branch and the Agencies are records the run created itself.

**Why this is the right answer and not just a convenient one.** Today's session hit a wall that this design removes entirely. Acting on a Branch somebody else owns is blocked by policy in a way no grant can lift:

| Operation | On a **Shared** record | On a **SelfCreated** record |
|---|---|---|
| Create / update | `Approval Required` | `Approval Required` |
| **Approve / Reject** | **`Forbidden (absolute)`** — no grant lifts it | `Approval Required` |

A run that builds its own Branch can therefore complete the whole maker–checker cycle legitimately. A run that borrows someone else's Branch can submit a change and then be unable to approve it — which is exactly why this stage stopped and asked the human to make the change instead of leaving `BRN287` stranded in *Pending for approval*.

**What Stage 3 must design as a consequence:**

1. **A Branch seed case** — the Branch's own mandatory data (Operating country, Branch Email Config, Branch Contact Info, Credit Limit / Top Up Limit / Credit Terms, Payment Options, Remarks) plus, critically, **Product Access with at least one supplier selected and its supplier credential chosen**. Without that last part the child Agency has no PCC section and AC-9 is unreachable (`BR-006`, `BR-008`).
2. **Agency cases that run under that Branch**, not under an arbitrary existing one.
3. **Data the suite knows**, so assertions can be exact rather than defensive — the whole reason for building the fixture instead of borrowing one.

**Precedent to reuse, and its boundary.** The `branch` module's approved automation already creates a Branch and selects Product Access suppliers, so the *method* is proven on this application. Per `metadata/BranchKnowledgeReuse.md`, Stage 4A reuses that **approach** and none of its data, selectors, or page objects — every Agency locator is still verified live at generation time.

**The authorization, granted 2026-08-18 and recorded.** The operator granted the general principle: *where something under test depends on records the run can build itself, the run builds them and runs the full cycle — reserving nothing unless told to at the time.* Four Branch authorizations (`CREATE`, `UPDATE`, `SUBMIT`, `APPROVE`, all `SelfCreated`) are recorded in `{{RUN_FOLDER}}/metadata/SafetyAuthorizations.json` and verified against the evaluator:

| Evaluated | Decision |
|---|---|
| `CREATE` · `SelfCreated` · branch | **Allowed** |
| `APPROVE` · `Shared` · branch | **Forbidden** — unchanged, as it must be |
| `BOOK` · any ownership | **Forbidden** |

**The ownership line is the whole grant.** Acting on a record the run did not create is untouched: `APPROVE` / `REJECT` on a Shared or Unknown record stays `Forbidden (absolute)`, which is why this stage stopped rather than edit `BRN287`. Booking, financial, privileged and notification operations remain absolutely forbidden — the operator's *"reserve nothing"* matches what the policy already held, so nothing widened.

**One document still disagrees, and that is flagged rather than quietly fixed.** Project Context §5 reads that this run *"may **not** create or edit a Branch, Supplier, Staff, Role, Payment Method, or any reference data."* The Branch grant contradicts that sentence. **Stage 2 does not edit an approved Stage 1 artifact**, so the requirement is recorded in both the authorization file and here, and §5 needs a matching Stage 1 revision. The Supplier, Payment Method and Role exclusions in that sentence are **unchanged and still binding** — the grant covers Branch only.

**And one cost to accept with it.** `PO-3` forbids cleanup by DELETE, so every seeded Branch persists on shared staging exactly as seeded Agencies do. The same two obligations apply: reuse a self-created Branch wherever test independence allows, and record how many Branches each execution created.



**Exact validation strings** for `PO-12`: `AgencyUpdateForm_run-004.md` §5 and `evidence/run-004/phase_e_message_field_map.json`.

**Structural inventory** of every control, with required / read-only / disabled / accept / max-length: `evidence/run-004/phase_b_update_form_structure.json`. This is behavioural evidence, **not** a locator catalogue — no selector is recorded, and Stage 4A verifies every locator live at generation time (§5.15).

---


# Revision 2 — run-001, 2026-07-31 (retained in full, unchanged)

| Field | Value |
|---|---|
| Module | `agency` |
| Produced by run | `run-001__2026-07-31_11-56-38__UserStory__US-4222UpdateAgency` |
| Revision | 2 <!-- rev 2, 2026-07-31: Requirement Disposition applied to every Finding and gap per user directive; DOQ-01 and DOQ-04 resolved --> |
| Project Context validated against | `modules/agency/context/ProjectContext.md` — revision **2**, status **Approved** |
| Discovery Mode(s) used | Browser automation — **Browser Driver**, headless (§8.1 #1). No fallback mode was needed or used |
| Generated | 2026-07-31 14:20 · revised 2026-07-31 |
| Status | **Pending Review** |

---

## Headline

**The application works. The story is out of date.**

Nothing failed during this run — no HTTP error, no console message, no crash, no timeout, across 136 network events. **Seven Findings** were raised and every one is a disagreement between US-4222 and the application rather than a malfunction.

**Per the 2026-07-31 directive, the application is the primary reference where the story is clearly outdated.** US-4222 predates later enhancements. Applying the §1.1 discriminator — *when the two disagree, the PRD decides* — sorts the seven:

- **Five are the story being out of date**, and three of those are settled outright. **FINDING-001**: the application renders one shared `Required` message where the story specifies ~20 distinct ones, and PRD XC-17 `[V]` corroborates the application — so `Required` is the expected result, not a defect. **FINDING-005**: the seven undocumented fields are later functionality, with `Outstanding Threshold` confirmed by the product owner and `Remarks` corroborated by PRD XC-03 `[V]`.
- **Two are not**, and they are the ones worth attention. **FINDING-002** — AC-9's PCC section is absent, yet PRD ORG-05 and ORG-07 are *both* `[V]`, meaning two independent sources expected it. That is the signature of a removed or relocated feature, so it is dispositioned `Possible Application Defect / Possible Removed Feature` and **not** written off as an outdated story. **FINDING-004** — the document field enforces no file type, which no source superseded; a PDF-only rule on contract documents is a data-integrity rule, not a UI detail that evolves.

**Stage 3 is now unblocked except for one question.** DOQ-01 and DOQ-04 are resolved by the directive. **DOQ-02 (the AC-9 disposition) still blocks** — precisely because it is the one mismatch the directive's rule does not reach.

---

## 1. Scope

| | |
|---|---|
| **Run Scope Type** | User Story |
| **Run Scope Source** | Markdown file — `knowledge_base/requirements/user_stories/US-4222_Admin_Update_Agency.md` (supplied as pasted text 2026-07-31, transcribed before Stage 1 ran) |
| **Run Type** | User Story |
| **Pipeline branch** | Manual Execution Pipeline (1 → 2 → 3 → `4M`) |
| **Project Context validated against** | `modules/agency/context/ProjectContext.md`, revision 1, `Approved` |
| **Discovery Strategy applied** | **User Story** strategy (§16): *"Narrowest scope: targeted verification strictly of the story's acceptance criteria… does not wander into adjacent screens beyond what's needed to reach or verify the story, and every carried-forward Assumption/Risk tied to that story gets a direct, explicit confirm/refute/unresolved treatment."* §13 below discharges that last obligation for all 25 carried-forward items. |

The one deliberate step beyond the story's own screens was reading the **create** form, done solely to distinguish "absent from the update flow" from "absent from the product" for two absence claims — reasoning recorded in `AgencyCreateForm.md` §1. No other adjacent screen was explored, and four in-scope-adjacent routes were skipped on purpose (`Coverage_Summary.md` §4).

## 2. Objectives

Verify, against the live application, the ten acceptance-criteria groups and four Expected Outcome actions US-4222 defines for the Admin → Agency update flow — and give each of the Project Context's 18 carried-forward assumptions and 7 risks an explicit confirm / refute / unresolved treatment.

Concretely, this run set out to answer: does each of the story's ten sections exist; do its fields match in name, type and mandatory status; what does the application actually do when a mandatory field is empty; and are the four Expected Outcome actions reachable.

## 3. Evidence Sources

| Discovery Mode | In-Scope Areas Covered | Why This Mode |
|---|---|---|
| **Browser automation — Browser Driver** (§8.1 #1) | All of it: Agency list, Agency update form, Agency create form; every Finding; every component in `Coverage_Summary.md` §3 | Highest-priority mode, and available for the entire in-scope surface. Chosen over its peer, the Playwright MCP server, because the whole flow sits behind a login and **a credential value must never be typed into an MCP tool call** — MCP arguments are conversation-visible (`platform_core/tools/mcp/README.md` §1.3). `BrowserDriver.authenticate()` fills the login form in-process and never exposes the value. Ran headless throughout, the platform default; headless costs no evidence, so the Evidence Category and Confidence ceiling are unaffected (§18) |

**No lower-priority mode was substituted for a higher one anywhere in this run.** Every Finding rests on **Direct Observation**, the only Evidence Category that can reach `Confirmed` (§18) — so where a Finding here is not `Confirmed`, that is never because of a tooling limitation. It is because the requirement itself is contested, which §5.6 requires be reported as `Needs Human Review` rather than resolved by this stage.

## 4. Modules Explored

| Module | Route(s) | Purpose | Discovery Mode |
|---|---|---|---|
| `agency` | `/admin/agency` | Agency list — 903 records; search by code/name; `Add agency`; row-level pencil icon to edit | Browser automation (Browser Driver) |
| `agency` | `/admin/agency/edit/{id}` | **The screen under test** — Update Agency, ten sections, maker–checker action bar | Browser automation (Browser Driver) |
| `agency` | `/admin/agency/add` | Agency create form — read as a control surface only (§1) | Browser automation (Browser Driver) |

**Navigation structure discovered.** Under `Admin`, only `Branch` (`/admin/branch`) and `Staff` (`/admin/staff`) are leaf links; `Company` and `Agency` are expandable groups. The Agency group holds five children: `Agency` (`/admin/agency`), `Search Login Details` (`/admin/login-details`), `Registration Requests` (`/admin/registration-requests`), `Category Management` (`/admin/category-management`), `Agency Assignation` (`/admin/agency-categorization`).

**The last two are named nowhere in US-4222 and nowhere in the PRD's ORG requirements.** They are recorded as observed navigation surface, not assessed — folding them into scope would be a Human Decision (§5.3.1 #3), not this stage's call.

**Shared UI components:** global expandable navigation · search-and-grid pattern with row action icons · custom dropdown (PrimeNG-style, renders as a div rather than `<select>`) · international phone input with country flag/dial code · checkbox group · radio group · file upload row with an `Add` button for extra rows · inline field validation (red border + message beneath). Full detail in `Coverage_Summary.md` §3.

## 5. Observed Behaviour

| Module | Workflow / Rule | What Was Observed | Evidence Category | Finding ID(s) |
|---|---|---|---|---|
| `agency` | Reaching the update form | Admin → Agency group → `Agency` → row pencil icon → `/admin/agency/edit/{id}`. Directly addressable by URL with an established session | Direct Observation | — |
| `agency` | Form composition | Ten sections: Agency Master (untitled) · Agency Owner Details · Upload Document · Agency Logo · Wonder Travel Sales Contact · Bank Account Details · Payment settings · Product Access Details · Agency Features · Remarks | Direct Observation | FINDING-002, FINDING-005 |
| `agency` | Mandatory-field violation | Clearing any of four mandatory fields and blurring renders the single word **`Required`** in red beneath the field, with a red border. Never a field-specific message | Direct Observation | FINDING-001 |
| `agency` | Optional-field behaviour | Clearing `Bank name` (optional per AC-6) renders **no** message — so `Required` is tied to mandatory status, not shown indiscriminately | Direct Observation | — |
| `agency` | `Country` field | Not editable — `readOnly`, rendered greyed, value inherited (`Egypt`) | Direct Observation | — *(**AC-1 confirmed**, §6)* |
| `agency` | Mandatory markers | The application marks **23** fields with `*` (full list in FINDING-005's evidence) | Direct Observation | FINDING-005 |
| `agency` | Payment option control | 28 selectable entries: 5 payment instruments, then 21 given names, then `m` and `f` | Direct Observation | FINDING-003 |
| `agency` | Document upload | Document input declares **no** `accept` attribute; logo input declares `accept="image/*"`. Both `multiple=false`. A `.png` is currently attached as a document | Direct Observation | FINDING-004 |
| `agency` | Repeat-row pattern | `Add` buttons beneath Document, Sales Contact and Bank Account sections; `Set target +` groups Target/Month/Year | Direct Observation | FINDING-004 *(bears on AC-3's "multiple documents")* |
| `agency` | Action bar | `Cancel` · `Send For Approval` · `Approve` · `Reject` — all four visible and enabled to the single available account. **No "Save as draft" control on either form** | Direct Observation | FINDING-007 |
| `agency` | Product access grid | Columns `STATUS · SUPPLIER NAME · CREDENTIAL NAME · PRODUCT NAME · DESCRIPTION`; rows `SalamAir / Salam Air Live / Flight` and `FlyNas / fly nas cred / Flight`; row 1's `DESCRIPTION` holds `sad` | Direct Observation | FINDING-002, FINDING-003 |
| `agency` | Grid columns | `Status` and `Approval Status` render as **separate** columns on the Agency list | Direct Observation | — *(**PRD XC-07 confirmed**, §6)* |
| `agency` | Stored data quality | `Company URL` holds `asdas`; several agency/branch names are hash-suffixed generated values (`Louie_b38ae8`, `Pearle_41ccf9`) | Direct Observation | FINDING-003 |
| `agency` | System health | 136 network events, **0** responses ≥ 400. Console **clean — 0 messages**. No Event-Driven Capture trigger (§5.2) fired at any point | System Response | — |

## 6. Confirmed Behaviour

The subset of §5 validated against a clearly documented requirement **and found to match**. It is deliberately short: most of what this run observed is contested rather than confirmed, and contested items belong in §11.

| Requirement (Project Context §) | Confirmed Behaviour | Evidence Category | Finding ID(s) |
|---|---|---|---|
| §2 row "Agency Master" → AC-1: `Country` is *"Inherited when a branch is selected"*, field type **Read Only** | `Country` is `readOnly`, rendered greyed, populated `Egypt` | Direct Observation | — |
| §2 row "Bank Account Details" → AC-6: all three fields **Optional** | `Account Number`, `Account Type`, `Bank name` carry no `*`; clearing `Bank name` produces no validation message | Direct Observation | — |
| §7 Traceability Anchor → **PRD XC-17 `[V]`**: *"Mandatory-field violation message is `Required` platform-wide"* | Exactly what all four probed fields rendered | Direct Observation | FINDING-001 |
| §7 Traceability Anchor → **PRD XC-07 `[V]`**: *"Status and Approval Status are distinct columns"* | Both present as separate columns on the Agency list | Direct Observation | — |
| §2 rows for AC-2, AC-3, AC-4, AC-6, AC-7, AC-8, AC-10 → the sections exist | Nine of the story's ten sections are present, in the story's order | Direct Observation | FINDING-002 *(for the tenth)* |
| §2 row "Submit for Approval" → **PRD XC-01 `[V]`**: a governed record is submitted rather than published on save | A `Send For Approval` action exists and is distinct from `Approve`/`Reject`. **The state transition itself was not executed** — presence is confirmed, behaviour is not | Direct Observation | FINDING-007 |

**PRD XC-17 deserves a note.** It is confirmed here, and confirming it is what *creates* FINDING-001: the platform-wide `Required` behaviour the PRD documents is precisely what contradicts US-4222's per-field messages. This run therefore confirms one requirement source by refuting another — which is exactly why the disposition is a human's to make, not this stage's.

## 7. Assumptions

Inferred statements this run did **not** directly observe. Each is tagged with its Evidence Category; none is presented as an observation.

| ID | Assumption | Why Inferred (not observed) | Evidence Category |
|---|---|---|---|
| DA-01 | AC-3's *"System shall allow the upload of multiple documents"* is satisfied by the `Add` button adding further document rows, rather than by multi-file selection | Both file inputs are `multiple=false`, and an `Add` button sits beneath the document row — but no second row was ever added, so the mechanism is inferred from layout | Assumption |
| DA-02 | AC-5's *"add multiple Sales personnel"* and AC-6's *"add multiple bank accounts"* work the same way, via their own `Add` buttons | Same reasoning; neither `Add` was clicked | Assumption |
| DA-03 | `Outstanding Threshold` and `Remarks` are enforced on submit, not merely marked `*` | FINDING-001 established that clearing a mandatory field renders `Required` on blur, so client-side enforcement is likely — but neither field was cleared and submitted, so server-side enforcement is unobserved | Assumption |
| DA-04 | The Product Access Details grid is how supplier credentials (PCCs) are now assigned to an agency, AC-9's section having been folded into it | Inferred from the grid's `SUPPLIER NAME` / `CREDENTIAL NAME` / `DESCRIPTION` columns being populated. No mapping to AC-9's field names exists, and the merge itself is unconfirmed — this is FINDING-002's Root Cause Hypothesis at 55% | Assumption |
| DA-05 | The 23 non-payment entries in the Payment option control originate in Payment Method master data, seeded by prior automated runs against this shared environment | The master-data screen was deliberately not inspected — it belongs to the `payment-gateway` module, out of scope. FINDING-003's hypothesis, 70% | Assumption |
| DA-06 | `Import PNR Option` on this form is the same switch PRD IPN-05 reads when refusing an import for a non-enabled organisation | The control exists with a matching name; the causal link to import behaviour was not exercised (it would require the `import-pnr` module, out of scope) | Assumption |

## 8. Open Questions

Candidates that could not be validated, plus every carried-forward Project Context item this run leaves genuinely unresolved.

| ID | Open Question | What Would Resolve It | Project Context Ref |
|---|---|---|---|
| DOQ-01 | Are US-4222's ~20 per-field validation messages a real requirement, an accepted deviation, or specification boilerplate? | The story's author or the product owner. **Not answerable from the application** — the application's answer (`Required`) is already known | ASM-018, and FINDING-001 |
| DOQ-02 | Was AC-9 (Airline Supplier Credential / PCC) superseded by Product Access Details, or is it a missing feature? | Product owner, plus a field-level mapping if superseded | ASM-003, ASM-013, FINDING-002 |
| DOQ-03 | Can a plain Admin who edits an agency also approve it? | A second, non-Super-Admin credential. No Discovery Mode can substitute | ASM-004, ASM-015, PRD OQ-1, FINDING-007 |
| DOQ-04 | What are valid values and business meaning for `Outstanding Threshold`? | Product owner. **Blocking:** no positive test case can save without a value | FINDING-005 |
| DOQ-05 | Is `Remarks` content free-form, or governed (e.g. required to cite a reason)? | Product owner | FINDING-005 |
| DOQ-06 | Does changing `Branch` on an existing agency re-inherit and **overwrite** Country, Product Access and Sales Contact? | Deliberately not probed — it is destructive-by-inheritance on a live record. Stage 4M under a designed case with a recorded pre-edit state | ASM-016 |
| DOQ-07 | On updating an agency that already has a document and logo, must the user re-upload to save? | Stage 4M: save without touching either upload and observe. Both are marked `*` and a document is already attached | ASM-012 |
| DOQ-08 | What is the authoritative Payment option set? | Product owner, plus an environment cleanup decision | ASM-014, FINDING-003 |
| DOQ-09 | Is `Designation` (AC-5) expected? Might it appear only on an added sales-contact row? | Product owner; the row question is cheap for Stage 4M to settle while executing AC-5 | FINDING-006 |
| DOQ-10 | Does `Cancel` exit *"the role update process"* as the story says, or the agency update? | Story author — it reads as a copy-paste artefact from a Role story | ASM-011 |
| DOQ-11 | Are the five Reflection areas in scope for downstream-effect verification, or impact awareness only? | Product owner | ASM-017 |
| DOQ-12 | What do `Agency Business Type`, `Transfer Pnr Option`, `Blue Command Screen` and `Enable Search Limit` do, and should they be tested? | Product owner. No requirement exists to test them against | FINDING-005 |
| DOQ-13 | Does the product enforce PDF-only documents and the 2 MB logo limit server-side? | Stage 4M, using the prepared fixtures. Requires a save, so out of this stage's scope | ASM-009, FINDING-004 |
| DOQ-14 | Does `Company URL` validate URL format on input? The stored value is `asdas` | Stage 4M. Existing data shows only that stored values need not be URLs | — |
| DOQ-15 | Is credit enforcement (credit limit, top-up limit, reaching percentage, credit terms) observable at all? | Out of reach for this run — verifying it needs bookings/payments, which the environment forbids | ASM-005, PRD OQ-7 |
| DOQ-16 | Does a "Save as draft" option exist anywhere? PRD GAP-8 says the backlog specifies one; no such control was observed on either form | Product owner | ASM-008 |

## 9. Discovered Risks

| ID | Risk | Business Risk | Technical Risk | Finding ID(s) |
|---|---|---|---|---|
| DR-01 | ~~Stage 3 cannot write correct expected results for ~20 negative cases~~ — **retired 2026-07-31** | **Resolved by the directive.** `Required` is the expected result (disposition row 1, PRD XC-17 `[V]`). Residual risk is only that the story stays uncorrected and misleads a future reader | None — the application's behaviour is self-consistent and PRD-documented | FINDING-001 |
| DR-02 | ~~No positive test case can complete a save~~ — **downgraded 2026-07-31** | **Largely resolved.** The two mandatory fields are legitimate later functionality and Stage 3 may supply values. Residual risk: `Outstanding Threshold`'s valid range is still unknown, so a chosen value could produce a test that passes while asserting nothing meaningful | None | FINDING-005 |
| DR-02b | **Four undocumented functional switches can change live agency behaviour with no governing criteria** | `Agency Business Type`, `Transfer Pnr Option`, `Blue Command Screen`, `Enable Search Limit` alter real behaviour (e.g. whether PNRs can be transferred) and no source defines expected results for them | None | FINDING-005 |
| DR-03 | **Five acceptance criteria have no surface to test, and two `[V]`-tagged PRD requirements describe them** | AC-9 cannot be accepted as written. **Dispositioned row 3, not story-outdated** — writing it off as outdated specification would convert a possible removed-feature regression into a documentation correction | Supplier-credential assignment appears to exist in the Product Access grid, so outright capability loss is unlikely — but relocation is a change someone should confirm consciously | FINDING-002 |
| DR-04 | Four Expected Outcome actions cannot be properly exercised with one identity | `Approve`/`Reject` will be executed by the same identity that edits, so a segregation-of-duties failure is indistinguishable from correct behaviour. PRD §1.1 lists four-eyes governance as a **business objective** | None observed | FINDING-007 |
| DR-05 | A mandatory control offers 23 meaningless choices | An agency can be saved with a nonsense payment instrument; AC-7 has no stable expected result until the list is cleaned | Payment Method master data appears to accept arbitrary free text with no validation | FINDING-003 |
| DR-06 | Agency contract documents may be storable in any format | Contract documents carry contract dates and record the commercial agreement; a downstream PDF consumer could fail on an image | Client-side `accept` is absent on the document input; server-side validation untested. Arbitrary file-type upload is a file-handling risk | FINDING-004 |
| DR-07 | **Shared-environment interference during Stage 4M** | 903 agencies and visible generated test data mean another tester may change the record under test mid-execution, producing a false failure | None | — *(Project Context RSK-001, now corroborated)* |
| DR-08 | PRD requirements tagged `[V]` may be stale | ORG-05 and ORG-07 are `[V]` — implying a passing automated assertion — yet the PCC section they describe does not render. Other `[V]` tags may be equally out of date, which weakens the PRD as a fallback source | The reference automation suite may contain assertions that no longer match the UI | FINDING-002 |

## 10. Coverage

| Area / Module | Coverage Status | Discovery Mode | Notes |
|---|---|---|---|
| Agency list (`/admin/agency`) | Covered | Browser automation (Browser Driver) | In scope as a means of reaching the record under test only |
| Agency update form (`/admin/agency/edit/{id}`) | Covered | Browser automation (Browser Driver) | The screen under test; all ten AC groups inventoried |
| Agency create form (`/admin/agency/add`) | Covered | Browser automation (Browser Driver) | Out of scope; read as a control surface for two absence claims |
| AC-9 — Airline Supplier Credential (PCC) | **Unreachable** | — | Section does not render on either form (FINDING-002) |
| AC-5 — `Designation` field | **Unreachable** | — | Field absent from both forms (FINDING-006) |
| Maker-vs-checker separation | **Blocked** | Browser automation (single identity) | One credential exists; no mode can supply a second (FINDING-007) |
| `category-management`, `agency-categorization`, `login-details`, `registration-requests` | Skipped | — | Not named by US-4222; widening scope is a Human Decision |
| Undocumented feature switches | Skipped | — | No requirement to test against; toggling live config has no defined expected result |
| Five Reflection areas | Skipped | — | Impact awareness pending DOQ-11; verification needs bookings/payments, which the environment forbids |

**Roll-up:** 3 Covered · 0 Partial · 1 Blocked · 2 Unreachable *(plus 4 skipped areas)*

**Screen coverage is 100% (3/3), and that figure should not be read as criterion coverage.** Every screen the story touches was reached; roughly half of its criteria describe *behaviour on save*, which this stage does not perform. `Coverage_Summary.md` §1 gives the per-AC breakdown.

## 11. Gaps

**Every gap below now carries a Requirement Disposition** (column added 2026-07-31 by user directive; taxonomy and discriminator at `context/ProjectContext.md` §1.1). Nothing has been removed or downgraded out of the record — the disposition states *which source wins*, not whether the mismatch is reported.

| ID | Gap Type | Description | **Disposition** | Project Context Ref | Finding ID(s) |
|---|---|---|---|---|---|
| GAP-D01 | **Contradicts** | The application renders `Required` for every mandatory-field violation; US-4222 specifies ~20 distinct per-field messages. PRD XC-17 `[V]` sides with the application | **Story Outdated — PRD-corroborated** (row 1). **Resolves DOQ-01** | §2 "Field-level validation…", ASM-018 | FINDING-001 |
| GAP-D02 | **Absent** | AC-9's Airline Supplier Credential (PCC) section and all five of its fields are absent from both forms, though PRD ORG-05/ORG-07 `[V]` describe them | **Possible Application Defect / Possible Removed Feature** (row 3) — **not** story-outdated; two `[V]` sources expected it. **DOQ-02 stays open** | §2 "Airline Supplier Credential (PCC)", ASM-003, ASM-013 | FINDING-002 |
| GAP-D03 | **Absent** | AC-5's `Designation` dropdown is absent from both forms | Story Outdated / Requires Business Confirmation (row 2) | §2 "Wonder Travel Sales Contact" | FINDING-006 |
| GAP-D04 | **Extends** | Seven fields exist that US-4222 does not describe — `Fax No`, `Agency Business Type`, `Outstanding Threshold *`, `Transfer Pnr Option`, `Blue Command Screen`, `Enable Search Limit`, `Remarks *`. Two are mandatory | **Later enhancements.** `Outstanding Threshold` **Confirmed** (row 4); `Remarks` **PRD-corroborated** by XC-03 `[V]` (row 1); other five row 2. **Resolves DOQ-04** | §2 (in-scope surface is the ten AC groups), ASM-002 | FINDING-005 |
| GAP-D05 | **Contradicts** | US-4222 names the action `Submit for Approval`; the application's button reads `Send For Approval`. PRD XC-01 `[V]` sides with the application | Story Outdated — PRD-corroborated (row 1) | §2 "Submit for Approval" | FINDING-007 |
| GAP-D06 | **Contradicts** | AC-8 marks `Product`, `Status Column`, `Credential name`, `Description` Mandatory; no Product Access control carries a `*` | Story Outdated / Requires Business Confirmation (row 2) — **with a caveat:** absent markers could equally mean validation was never applied, so design to observed behaviour *and* note it | §2 "Product Access Details" | FINDING-005 |
| GAP-D07 | **Contradicts** | AC-1's field order places `IATA Agency` after `City`; the application renders it after `Phone No`, following `Address` | Story Outdated / Requires Business Confirmation (row 2) — cosmetic | §2 "Agency Master" | FINDING-005 |
| GAP-D08 | **Contradicts** | AC-10 describes a *"toggle"* for Import PNR; the application renders a checkbox in an `Agency Features` group | Story Outdated / Requires Business Confirmation (row 2) — cosmetic | §2 "Import PNR toggle" | FINDING-005 |
| GAP-D09 | **Absent** | Neither form offers a "Save as draft" control, though PRD GAP-8 records the backlog as specifying *"submit for approval or save as draft"*. US-4222 also omits it | Not a requirement mismatch — a backlog item that appears never to have been built. No source in scope requires it | §3 "Save as draft", ASM-008 | — *(no Finding)* |
| GAP-D10 | **Absent** | AC-3 requires PDF-only with a stated rejection message; the document input declares no accepted type, and a `.png` is attached | **Application Defect (candidate)** (row 5) — a data-integrity rule no source superseded. Settled by Stage 4M's upload test | §2 "Upload Document Details", ASM-009 | FINDING-004 |

**Disposition roll-up:** 3 `Story Outdated — PRD-corroborated or Confirmed` (settled) · 4 `Story Outdated / Requires Business Confirmation` · **1 `Possible Application Defect / Possible Removed Feature`** · **1 `Application Defect (candidate)`** · 1 not a requirement mismatch.

**Eight of the ten gaps are the story being out of date. Two are not** — GAP-D02 and GAP-D10 — and keeping those two out of the "story outdated" bucket is the whole purpose of the §1.1 discriminator. Both describe the application falling short of something no source superseded: a section two `[V]`-tagged PRD requirements describe, and a data-integrity rule on contract documents that no plausible enhancement would remove.

## 12. Recommendations

| ID | Recommendation | Rationale | Finding ID(s) |
|---|---|---|---|
| DREC-01 | **Answer DOQ-01 before Stage 3 finalizes expected results** | ~20 test cases depend on it. Deciding after the suite is written means rewriting it | FINDING-001 |
| DREC-02 | **Obtain a plain Admin credential** (distinct from `odeysysadmin`) before Stage 4M | One credential addition converts ASM-004, ASM-015 and PRD OQ-1 from untestable to testable, and lets maker/checker run as the story intends | FINDING-007 |
| DREC-03 | Get valid values for `Outstanding Threshold` and guidance on `Remarks` | Without them no positive case can save; Stage 3 would otherwise have to invent values and label them assumptions | FINDING-005 |
| DREC-04 | Ask the product owner to rule on AC-9 — superseded, or missing | Decides whether five criteria are `Blocked — feature not present` or redesigned against Product Access Details | FINDING-002 |
| DREC-05 | Request a Payment Method master-data cleanup on STG, or confirm the pollution is staging-only | AC-7 has no stable expected result while 23 of 28 options are junk. If the entries exist in other environments this is a defect, not hygiene | FINDING-003 |
| DREC-06 | Have Stage 4M run AC-3's format-negative cases **first**, including the extension-spoofing fixture | Extension-only validation is materially weaker than the story implies and is worth reporting regardless of AC-3's wording | FINDING-004 |
| DREC-07 | Flag to the reference-automation maintainers that ORG-05/ORG-07 are `[V]` against a section that does not render | Suggests stale assertions, which weakens the PRD as a fallback requirement source across the whole project | FINDING-002 |
| DREC-08 | Record `AGN2 / Test Egypt` (id 949) and its pre-edit values before Stage 4M mutates anything | Shared environment; a restorable baseline is what makes the mutation authorization safe to use | — |
| DREC-09 | Consider a future accessibility-scoped run | The Agency list's row action is an icon with no text, no `title` and no `aria-label`. Out of scope here (no accessibility requirement exists in this project to test against), so it is recorded rather than raised | — |

**Regression Test Candidates** — areas worth a regression test, not designed cases (Stage 3 owns those): mandatory-field enforcement across all 23 app-marked fields · `Country` read-only inheritance on branch selection · the maker–checker transition `Send For Approval` → `Pending for approval` → `Approve`/`Reject` with Remarks · `Cancel` discarding without persisting · document and logo upload format/size enforcement · the repeat-row `Add` pattern for documents, sales contacts and bank accounts · `Import PNR Option` persistence and its downstream effect on import (cross-module, full-project execution only).

## 13. Inputs for Test Design

**Findings by ID:**

| Finding ID | Category | Status | Severity | Module |
|---|---|---|---|---|
| FINDING-001 | Requirement Gap | Needs Human Review | N/A | `agency` |
| FINDING-002 | Requirement Gap | Needs Human Review | N/A | `agency` |
| FINDING-003 | Observation | Needs Human Review | N/A | `agency` |
| FINDING-004 | Observation | Needs Human Review | N/A | `agency` |
| FINDING-005 | Requirement Gap | Needs Human Review | N/A | `agency` |
| FINDING-006 | Requirement Gap | Needs Human Review | N/A | `agency` |
| FINDING-007 | Test Gap | Needs Human Review | N/A | `agency` |

Every Finding carries a populated **Expected Behavior** field citing a specific Project Context section, which is what lets Stage 3 fill its own Requirement Reference and Discovery Reference without re-deriving them (§22).

**Finding Disposition guidance** (§22 mapping — `Confirmed` → Regression, `Needs Human Review` → Exploratory, `Rejected`/`Duplicate` → Documented exception): all seven are `Needs Human Review`, so all seven map toward **Exploratory** treatment. In practice most are requirement conflicts that a human answer converts into ordinary Regression cases — FINDING-001 in particular becomes a straightforward regression suite the moment DOQ-01 is settled.

**Assumption disposition** — every carried-forward Project Context item, per the User Story strategy's explicit obligation (§16):

| Assumption ID | Disposition | Basis |
|---|---|---|
| ASM-001 (PRD is reverse-engineered, `[O]`/`[I]` unconfirmed) | **Confirmed, and sharpened** | Even a `[V]` tag proved unreliable — see ASM-007/RSK-007 |
| ASM-002 (no PRD requirement for the update flow) | **Confirmed** | Nothing observed changes it; US-4222 remains the sole source, which is why GAP-D04 has no fallback |
| ASM-003 (PCC inherited from Supplier & Branch) | **Unresolved** | The section does not exist, so inheritance could not be observed (FINDING-002) |
| ASM-004 (self-approval prohibited but unproven) | **Unresolved** | One identity available (FINDING-007) |
| ASM-005 (credit enforcement unspecified) | **Unresolved** | Fields are editable; their effect needs bookings/payments, forbidden here |
| ASM-006 (approval matrix unknown) | **Unresolved** | Same single-identity limitation |
| ASM-007 (field validation matrix never covered) | **Confirmed, and advanced** | Confirmed there was no prior coverage — and this run produced the first actual observation: the message is `Required` (FINDING-001) |
| ASM-008 (draft-save discrepancy) | **Refuted** | No "Save as draft" control on either form (GAP-D09). The backlog's draft-save is not present |
| ASM-009 (PDF / 2 MB constraints are story-sourced and unverified) | **Confirmed, and strengthened** | The document input declares no `accept` at all, and a `.png` is attached (FINDING-004) |
| ASM-010 (reference data is environment-specific and generated) | **Confirmed** | Hash-suffixed agency/branch names; 23 generated payment options (FINDING-003) |
| ASM-011 (`Cancel` "role update process" copy-paste) | **Unresolved** | Needs the story's author (DOQ-10) |
| ASM-012 (must documents be re-uploaded on update?) | **Unresolved, with new evidence** | Both uploads are marked `*` and a document is already attached; whether a save requires re-upload is untested (DOQ-07) |
| ASM-013 (AC-9 table shape ambiguity) | **Moot** | The whole section is absent, so its internal shape cannot be clarified (FINDING-002) |
| ASM-014 (authoritative payment option set unknown) | **Unresolved, and worse** | 28 options render, 23 of them meaningless (FINDING-003) |
| ASM-015 (which role may approve) | **Unresolved** | One identity available (FINDING-007) |
| ASM-016 (does changing Branch overwrite inherited values?) | **Unresolved** | Deliberately not probed — destructive-by-inheritance on a live record (DOQ-06) |
| ASM-017 (are the Reflection areas in scope?) | **Unresolved** | Needs the product owner (DOQ-11) |
| ASM-018 (are the story's message strings literal?) | **Refuted as framed** | The punctuation question is moot: the application does not render those strings at all (FINDING-001) |
| RSK-001 (concurrent modification on shared staging) | **Active, corroborated** | 903 agencies, visible generated test data (DR-07) |
| RSK-002 (agency config is live commercial data) | **Active, unchanged** | Payment options, credit limits and PCCs all editable here |
| RSK-003 (Approve/Reject may end `Blocked`) | **Realized** | Exactly what FINDING-007 records |
| RSK-004 (upload negative paths need bad fixtures) | **Mitigated** | Eight fixtures generated, including an over-2 MB PNG and an extension-spoofing `.pdf` |
| RSK-005 (non-functional requirements absent) | **Unchanged** | This run makes no non-functional claim |
| RSK-006 (no audit log to verify the change trail) | **Unresolved** | Not observable from this form |
| RSK-007 (`[O]`/`[I]` behaviour may not exist as described) | **Realized, and broader than stated** | ORG-05/ORG-07 are `[V]`, not `[O]`/`[I]`, and still do not match the UI (FINDING-002, DR-08) |

**Requirement Gaps needing a coverage decision:**

| Gap ID | Requirement | Decision Needed From Test Design |
|---|---|---|
| GAP-D01 | AC-1/AC-2/AC-5/AC-6/AC-7's ~20 per-field messages | **Resolved.** Encode **`Required`** as the expected result. Disposition row 1 — PRD XC-17 `[V]` corroborates the application. Record the story's strings as outdated specification |
| GAP-D02 | AC-9, all five fields | **Still blocked on DOQ-02** — the one gap the directive does not settle. Disposition row 3: do **not** design to observed behaviour. Design the five criteria as `Blocked — pending business confirmation`, and escalate as a possible removed feature |
| GAP-D03 | AC-5 `Designation` | Design to observed behaviour (field not present), labelled disposition row 2. Have Stage 4M check an added sales-contact row while executing AC-5 — cheap, and closes the last open condition |
| GAP-D04 | Seven undocumented fields, two mandatory | **Resolved.** Design **to observed behaviour** as later enhancements — no longer `Requires Upstream Requirement`. Supply values for `Outstanding Threshold` (row 4, confirmed) and `Remarks` (row 1, PRD-corroborated) so positive cases can save. Still ask for `Outstanding Threshold`'s valid range — its existence is settled, its semantics are not |
| GAP-D05 | Button label | Use the application's `Send For Approval` (row 1, PRD XC-01 `[V]`). Story wording is a documentation correction |
| GAP-D06 | AC-8 mandatory markings | Design to observed behaviour (not mandatory), row 2 — **and note the caveat**: absent markers may mean validation was never applied rather than that the requirement changed |
| GAP-D07, GAP-D08 | Field order; toggle vs checkbox | Row 2, cosmetic. Documentation corrections, not test cases |
| GAP-D09 | Save as draft | Out of scope — no source in scope requires it. Do not design a case |
| GAP-D10 | AC-3 PDF-only | Design the negative cases and run them **first**. Disposition row 5 — a data-integrity rule no source superseded, so this remains the run's strongest genuine defect candidate |

**What the 2026-07-31 directive changed here.** Before it, two gaps blocked Stage 3 (DOQ-01 and DOQ-02) and GAP-D04 had no requirement basis at all. Now **DOQ-01 and DOQ-04 are resolved** and Stage 3 can design ~20 negative cases plus every positive case. **DOQ-02 alone still blocks**, and deliberately so: GAP-D02 is the one mismatch where the PRD corroborates the story rather than the application, so the directive's "application is the primary reference" rule does not reach it.

**Handoff confirmation:** Every input `test-design-skill/SKILL.md` §4 declares is **present and specific**. Discovery snapshots: three (`AgencyList.md`, `AgencyUpdateForm.md`, `AgencyCreateForm.md`). `Timeline.md` and `Coverage_Summary.md`: complete and maintained during the run. This QA Assessment Report: all 13 §19 sections present, in order. `Findings_Summary.md` plus seven `metadata.md` files, each with a populated Expected Behavior citing a Project Context section. Evidence packages: seven, all self-contained, referenced by path.

**One gap in the handoff remains declared rather than papered over** *(revised 2026-07-31 — there were two)*. **Stage 3 cannot complete its expected results for GAP-D02 without an answer to DOQ-02.** It can design the case structure, but AC-9 is the single mismatch where the PRD corroborates the story rather than the application, so the directive's "application is the primary reference" rule does not reach it and designing to observed behaviour would assert that the section was legitimately removed — which nothing establishes.

**GAP-D01 is no longer a handoff gap.** The 2026-07-31 directive plus the §1.1 discriminator resolve it: PRD XC-17 `[V]` corroborates the application, so `Required` is the expected result and the story's message column is outdated specification. GAP-D04 is likewise resolved.

Separately and unchanged: **no selector or locator knowledge is handed over**, deliberately — `pipeline.md` §3.5 assigns that to Stage `4A` at generation time. Not a gap for the Manual branch, which needs behaviour and field names, both supplied.
