# Manual Execution Results — agency+branch-run-003__2026-10-04_14-13-31__UserStory__AutoReissueCheckbox-ApprovedSuiteRerun

## 1. Execution Metadata

| Field | Value |
|---|---|
| Execution ID | run-010-4M-2026-10-04 |
| Run Folder | `agency+branch-run-003__2026-10-04_14-13-31__UserStory__AutoReissueCheckbox-ApprovedSuiteRerun` |
| Run Scope Type / Run Type | Feature scope: Agency + Branch modules · Run Type: User Story — *Auto Reissue checkbox (Branch & Agency)* |
| Environment | Shared staging |
| Target URL | Admin `http://192.168.1.60` (API `:8080`) · Agency Portal `http://192.168.1.60:9500` |
| Role(s) used | Admin operator (`ADMIN_60`), platform super-user (`ADMIN_60_SUPER`, for shared master data only), Agency Portal user for AGN9780 (`PORTAL_60`) |
| Started | 2026-10-04 14:13 (local) |
| Ended | 2026-10-04 17:05 (local) |
| Display mode | **Headed** — the user was asked before the run and chose headed, this stage's norm (§11.1) |
| Mechanism | Browser Driver (`platform_core/tools/browser_driver`), Chrome, headed |
| Test Suites executed | `modules/agency/test_design/TestCases_Agency.md` · `modules/branch/test_design/TestCases_Branch.md` |
| Scope rationale | run-008 recommendation **REC-008-5** — re-run the auto-reissue cases that run-008 left outside its own scope, against the restated Reissue-button display rule |

## 2. Result Totals

| Status | Count |
|---|---|
| Passed | 45 |
| Failed | 3 |
| Blocked | 1 |
| Skipped | 0 |
| Not Executed | 0 |
| Inconclusive | 0 |
| **Executable scope** (`Review = Approved`) | **49** |
| Excluded — Pending Review | 20 |
| Excluded — Rejected at Review | 0 |
| **Suite total** (Auto Reissue story) | **69** |

**Pass rate: 45/49 = 91.8% of the executable scope.** Against the story's suite total of 69 it is 65.2%, because 20 cases were never authorized to run.

**Authorized coverage: 49/69 = 71.0%** — how much of the designed story suite this run was permitted to exercise at all.

**A note on the executable scope.** It is **49**, not 48. The run was opened against a count of 48; TC-AGENCY-080 (*Portal hides Reissue when the Agency has Auto Reissue off*) carries `Review: Approved` and had been missed in that count. It was executed before the delivery closed, and it passed.

## 3. Per-Test Results

| Test Case ID | Module | Status | Execution Time | Reason (non-Passed) | Evidence Refs |
|---|---|---|---|---|---|
| TC-AGENCY-061 | agency | Passed | < 5 min | — | `TC-AGENCY-061-add-form-default.png`<br>`TC-AGENCY-061-062-observations.json` |
| TC-AGENCY-062 | agency | Passed | < 5 min | — | `TC-AGENCY-062-ticked.png`<br>`TC-AGENCY-062-unticked.png`<br>`TC-AGENCY-061-062-observations.json` |
| TC-AGENCY-063 | agency | Passed | < 5 min | — | `TC-AGENCY-063-before-approve.png`<br>`TC-AGENCY-063-reopened.png`<br>`TC-AGENCY-063-observation.json` |
| TC-AGENCY-064 | agency | Passed | < 5 min | — | `TC-AGENCY-064-grid-pending.png`<br>`TC-AGENCY-064-approve-dialog.png`<br>`TC-AGENCY-064-grid-approved.png`<br>`TC-AGENCY-064-reopened.png`<br>`TC-AGENCY-064-observation.json` |
| TC-AGENCY-065 | agency | Passed | < 5 min | — | `TC-AGENCY-065-required.png`<br>`TC-AGENCY-073-089-065-observations.json` |
| TC-AGENCY-066 | agency | Passed | < 5 min | — | `TC-AGENCY-api-observations.json`<br>`AGENCY_SAVE_REQUEST.json` |
| TC-AGENCY-067 | agency | Passed | < 5 min | — | `TC-AGENCY-067-after.png`<br>`TC-AGENCY-api-observations.json` |
| TC-AGENCY-068 | agency | Passed | < 5 min | — | `TC-AGENCY-api-observations.json` |
| TC-AGENCY-069 | agency | Passed | < 5 min | — | `TC-AGENCY-api-observations.json` |
| TC-AGENCY-070 | agency | Passed | < 5 min | — | `stageB-observations.json`<br>`stageB-credential-inactive.png` |
| TC-AGENCY-071 | agency | Passed | < 5 min | — | `TC-AGENCY-api-observations.json` |
| TC-AGENCY-072 | agency | Passed | < 5 min | — | `TC-AGENCY-api-observations.json` |
| TC-AGENCY-073 | agency | Passed | < 5 min | — | `TC-AGENCY-073-step1-ar-on.png`<br>`TC-AGENCY-073-step4-reopened-off.png`<br>`TC-AGENCY-073-step6-picker.png`<br>`TC-AGENCY-073-089-065-observations.json` |
| TC-AGENCY-074 | agency | Blocked | < 5 min | The precondition needs a credential BRN265 holds and AGN9780 does not. Re-run as a controlled detach / re-attach proved that state cannot be constructed: with NDCsbr detached, neither organisation holds it; attaching it to the Branch alone gives it to the Agency in the same action. Every picker option was a credential present in the Agency’s own PCC tabs, so the first half of the Expected Result held; the second half has no input to test on this application. | `rerun-TC-BR-109-TC-AGENCY-074.json`<br>`rerun-TC-BR-109-phase1-detached.png`<br>`TC-AGENCY-074-picker.png`<br>`TC-074-109-091-BR089-observations.json`<br>`AGN9780-after-branch-ndcsbr.json` |
| TC-AGENCY-075 | agency | Passed | < 5 min | — | `TC-AGENCY-092-agency-during-inactive.png`<br>`stageB-observations.json` |
| TC-AGENCY-080 | agency | Passed | < 5 min | — | `TC-AGENCY-080-search.png`<br>`TC-AGENCY-080-booking-detail.png`<br>`TC-AGENCY-080-passenger-details.png`<br>`TC-AGENCY-080-TC-BR-108-observations.json` |
| TC-AGENCY-086 | agency | Passed | < 5 min | — | `TC-AGENCY-086-after-save.png`<br>`TC-AGENCY-063-086-observations.json` |
| TC-AGENCY-087 | agency | Passed | < 5 min | — | `TC-AGENCY-087-before-send.png`<br>`TC-AGENCY-087-after-send.png`<br>`TC-AGENCY-087-reopened.png`<br>`TC-AGENCY-087-observation.json` |
| TC-AGENCY-088 | agency | Passed | < 5 min | — | `TC-AGENCY-088-reopened.png`<br>`TC-AGENCY-088-observation.json` |
| TC-AGENCY-089 | agency | Passed | < 5 min | — | `TC-AGENCY-089-after-save.png`<br>`TC-AGENCY-073-089-065-observations.json` |
| TC-AGENCY-090 | agency | Passed | < 5 min | — | `TC-AGENCY-090-before-approve.png`<br>`TC-AGENCY-090-after-approve.png`<br>`TC-AGENCY-090-observation.json` |
| TC-AGENCY-091 | agency | Passed | < 5 min | — | `TC-074-109-091-BR089-observations.json` |
| TC-AGENCY-092 | agency | Failed | < 5 min | Executed twice, in two separate inactive windows, with the same result both times. Step 4 held: the saved selection dropped the inactive credential and Auto Reissue stayed ticked. Step 5 did not: the Agency picker still offered NDCSabre staging while it was Inactive, while the Branch picker hid it in the same window. | `rerun-TC-AGENCY-092-agency-picker.png`<br>`rerun-TC-AGENCY-092-credential-inactive.png`<br>`rerun-TC-AGENCY-092.json`<br>`TC-AGENCY-092-agency-during-inactive.png`<br>`stageB-credential-inactive.png`<br>`stageB-observations.json` |
| TC-AGENCY-093 | agency | Passed | < 5 min | — | `TC-AGENCY-093-during-inactive-supplier.png`<br>`stageC-observations.json` |
| TC-BR-083 | branch | Passed | < 5 min | — | `TC-BR-083-add-branch-default.png`<br>`TC-BR-083-084-observations.json` |
| TC-BR-084 | branch | Passed | < 5 min | — | `TC-BR-084-ticked-no-supplier.png`<br>`TC-BR-084-picker-open.png`<br>`TC-BR-083-084-observations.json` |
| TC-BR-085 | branch | Passed | < 5 min | — | `TC-BR-085-picker.png`<br>`TC-BR-085-088-observations.json` |
| TC-BR-086 | branch | Passed | < 5 min | — | `TC-BR-086-picker.png`<br>`TC-BR-085-088-observations.json` |
| TC-BR-087 | branch | Passed | < 5 min | — | `TC-BR-087-picker.png`<br>`TC-BR-085-088-observations.json` |
| TC-BR-088 | branch | Passed | < 5 min | — | `TC-BR-088-picker.png`<br>`TC-BR-085-088-observations.json` |
| TC-BR-089 | branch | Passed | < 5 min | — | `TC-BR-089-before-send.png`<br>`TC-BR-089-reopened.png`<br>`TC-074-109-091-BR089-observations.json` |
| TC-BR-090 | branch | Passed | < 5 min | — | `TC-BR-090-before-send.png`<br>`TC-BR-090-grid-pending.png`<br>`TC-BR-090-grid-approved.png`<br>`TC-BR-090-reopened.png`<br>`TC-BR-090-observation.json` |
| TC-BR-091 | branch | Passed | < 5 min | — | `TC-BR-091-picker.png`<br>`TC-BR-091-092-093-observations.json` |
| TC-BR-092 | branch | Passed | < 5 min | — | `TC-BR-092-required.png`<br>`TC-BR-091-092-093-observations.json` |
| TC-BR-093 | branch | Passed | < 5 min | — | `TC-BR-093-remark-cleared.png`<br>`TC-BR-093-result.png`<br>`TC-BR-093-observation.json` |
| TC-BR-094 | branch | Passed | < 5 min | — | `TC-BR-api-observations.json`<br>`BRANCH_SAVE_REQUEST.json` |
| TC-BR-095 | branch | Passed | < 5 min | — | `TC-BR-095-after.png`<br>`TC-BR-api-observations.json` |
| TC-BR-096 | branch | Passed | < 5 min | — | `TC-BR-api-observations.json` |
| TC-BR-097 | branch | Passed | < 5 min | — | `TC-BR-api-observations.json` |
| TC-BR-098 | branch | Passed | < 5 min | — | `TC-BR-api-observations.json` |
| TC-BR-099 | branch | Passed | < 5 min | — | `TC-BR-api-observations.json` |
| TC-BR-100 | branch | Passed | < 5 min | — | `TC-BR-100-agency-unchanged.png`<br>`TC-BR-106-100-observations.json` |
| TC-BR-105 | branch | Passed | < 5 min | — | `rerun-TC-BR-110-branch-picker.png`<br>`rerun-TC-AGENCY-092.json`<br>`TC-BR-110-branch-during-inactive.png`<br>`stageB-observations.json` |
| TC-BR-106 | branch | Passed | < 5 min | — | `TC-BR-106-reopened.png`<br>`TC-BR-106-100-observations.json` |
| TC-BR-107 | branch | Failed | < 5 min | Executed twice. Both times the Branch was created (POST 204) and approved — BRN514, then BRN515 on a clean re-run with the cascading location fields completed first — and both reopened with Auto Reissue unticked and no Product Access supplier. On the re-run the form was read directly in the DOM immediately before submitting and showed Auto Reissue on, Auto Reissue Credentials GalileoLive, Galileo ticked, Branch Name RUN010_AR_Branch. | `rerun-TC-BR-107-before-send.png`<br>`rerun-TC-BR-107-after-send.png`<br>`rerun-TC-BR-107-reopened.png`<br>`rerun-TC-BR-107.json`<br>`rerun-TC-BR-107-BRN515-readback.json`<br>`TC-BR-107-before-send.png`<br>`TC-BR-107-reopened.png`<br>`TC-BR-107-observation.json` |
| TC-BR-108 | branch | Passed | < 5 min | — | `TC-BR-108-my-bookings.png`<br>`TC-BR-108-filtered-by-reference.png`<br>`TC-AGENCY-080-TC-BR-108-observations.json` |
| TC-BR-109 | branch | Failed | < 5 min | Observed twice. First: adding supplier NDCsbr with credential NDCSabre staging to BRN265 made AGN9780’s saved record return that supplier as checked with credential 313, with no edit to the Agency. Re-run as a controlled detach / re-attach: detaching it from BRN265 removed it from the Agency, and re-attaching it to the Branch alone put it back as checked with credential 313 and added NDCSabre staging to the Agency’s picker. The Expected Result is that the Agency lists it as not assigned. | `rerun-TC-BR-109-phase1-detached.png`<br>`rerun-TC-BR-109-phase2-reattached.png`<br>`rerun-TC-BR-109-TC-AGENCY-074.json`<br>`TC-BR-109-branch-product-access.png`<br>`TC-074-109-091-BR089-observations.json`<br>`AGN9780-after-branch-ndcsbr.json`<br>`baseline-AGN9780.json` |
| TC-BR-110 | branch | Passed | < 5 min | — | `rerun-TC-BR-110-branch-picker.png`<br>`rerun-TC-AGENCY-092.json`<br>`TC-BR-110-branch-during-inactive.png`<br>`stageB-observations.json` |
| TC-BR-111 | branch | Passed | < 5 min | — | `TC-BR-111-during-inactive-supplier.png`<br>`stageC-observations.json` |
| TC-AGENCY-076 | agency | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-AGENCY-077 | agency | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-AGENCY-078 | agency | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-AGENCY-079 | agency | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-AGENCY-081 | agency | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-AGENCY-082 | agency | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-AGENCY-083 | agency | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-AGENCY-084 | agency | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-AGENCY-085 | agency | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-AGENCY-094 | agency | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-AGENCY-095 | agency | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-AGENCY-096 | agency | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-AGENCY-097 | agency | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-BR-101 | branch | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-BR-102 | branch | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-BR-103 | branch | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-BR-104 | branch | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-BR-112 | branch | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-BR-113 | branch | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |
| TC-BR-114 | branch | Excluded | — | Pending Review — reset by Stage 3 Revision 5 (`PO-30`, 2026-10-01) and not yet re-approved | — |

### 3.1 Defect Detail — Failed / Inconclusive cases

#### TC-BR-109 — A Branch can have a supplier its Agency doesn't have

**Test Case ID:** TC-BR-109
**Execution Status:** Failed
**Execution Time:** < 5 min, executed twice (2026-10-04)

**Preconditions:** Branch BRN265 and Agency AGN9780 are both Approved. AGN9780 sits under BRN265. Before this run, both held exactly one supplier: Sabre, with credential Sabre Staging (315). Nothing in this case saves anything.

**Test Data:**

| Item | Value |
|---|---|
| Branch | BRN265 "NDC2_Mohamed Soliman" (id 10950) |
| Agency | AGN9780 "NDC2_Mohamed Soliman" (id 10961), under BRN265 |
| Supplier added to the Branch | NDCsbr (id 157) |
| Credential chosen in the Branch's NDCsbr PCC tab | NDCSabre staging (id 313) |

**Steps Performed:**

1. Opened BRN265 for edit, ticked NDCsbr in Product Access Details, chose NDCSabre staging in the NDCsbr PCC tab, entered a remark, clicked **Send For Approval**, and approved the Branch from the grid. (Setup, performed under `AUTH-BRANCH-UPDATE-DedicatedTestData`.)
2. Recorded BRN265's ticked suppliers from its edit form.
3. Opened AGN9780 for edit — **without changing or saving anything** — and read Product Access Details.
4. Read AGN9780's stored record directly through the application's own API (`GET /odeysysadmin/Admin2/agency/10961`) to confirm what the UI showed.

**Re-executed 2026-10-04 as a controlled detach / re-attach,** to establish whether the propagation is reliable and to separate it from anything this run had done earlier:

5. Set BRN265's Auto Reissue credential back to Sabre Staging, unticked NDCsbr in its Product Access, saved and approved. Read AGN9780's stored record: the supplier was **gone** — `suppliers[]` held Sabre alone — again with no Agency edit. Its Auto Reissue picker offered Sabre Staging only.
6. Re-ticked NDCsbr on BRN265 **alone**, chose NDCSabre staging in its PCC tab, saved and approved. Read AGN9780's stored record: the supplier was **back**, `checked: true` with `credentialIds: [313]`, and NDCSabre staging had returned to the Agency's picker.

**Expected Result:** A Branch and its Agency each own their Product Access. Adding a supplier to the Branch raises the Agency's ceiling but does not assign it: BRN265 should list NDCsbr, and AGN9780 should list it as **not assigned**. This is `PO-27` — *"Branch and Agency each have their own CRUD"* — and the same boundary that `PO-16` and `PO-27` express as *the Agency's credentials are a subset of its Branch's*. A subset relation allows the Agency to hold fewer suppliers than its Branch; it does not permit the Agency to be given one automatically.

**Actual Result:** AGN9780 was assigned the supplier automatically. Its stored record returned NDCsbr with `"checked": true` and `"credentialIds": [313]`, and its NDCsbr PCC tab already showed NDCSabre staging selected. Its Auto Reissue credential picker then offered NDCSabre staging as well. The same record, read before the Branch change, carried Sabre alone. No edit, save or approval was performed on the Agency at any point between the two reads.

**Impact:** A supplier and a supplier credential reach an Agency without anyone deciding that the Agency should have them. Whoever adds a supplier to a Branch silently grants it to every Agency beneath that Branch, together with the GDS credential chosen on the Branch's PCC tab. For the story under test the direct consequence is that the Agency's Auto Reissue picker offers a credential nobody chose for that Agency, so an operator can put the Agency's reissues onto a credential it was never assigned. It also removes the state TC-AGENCY-074 exists to test, which is why that case is Blocked in this run.

**Classification:**

| Field | Value |
|---|---|
| Category | Business Rule |
| Layer | Backend |
| Reproducibility | **Always** — two separate occurrences, and the mirror image confirmed: detaching the supplier from the Branch removed it from the Agency, re-attaching it to the Branch alone put it back |
| Regression | Unknown — no prior run exercised a Branch-only supplier, so there is no earlier state to compare against |
| Suspected Component | The Agency read path's supplier projection (`GET /odeysysadmin/Admin2/agency/{id}` → `suppliers[]`) |
| Confidence | High — the Agency's own stored record is the evidence, and the before/after reads differ by one Branch change |

**Root Cause Analysis:** Likely the Agency's `suppliers[]` is projected from its parent Branch at read time rather than stored per Agency, with `checked` derived from the Branch's selection instead of the Agency's own. That would explain why the change appeared with no Agency write, and why the credential arrived with the supplier. This is an inference from the observed read, not a confirmed implementation detail.

**Conclusion:** The Branch → Agency supplier boundary is not a boundary at all — the Agency's supplier set tracks its Branch's in both directions. Adding a supplier to a Branch assigns it to the Agency below rather than merely permitting it, and removing it takes it away again, so `PO-27` does not hold as written.

**Severity:** High. Reason: a permission-shaped change propagates to child records without an approval of its own, and it carries a GDS credential with it.

**Priority:** P1

**Evidence:** `manual_execution/artifacts/baseline-AGN9780.json` (before — Sabre only), `manual_execution/artifacts/AGN9780-after-branch-ndcsbr.json` (after — Sabre and NDCsbr, both checked), `manual_execution/artifacts/rerun-TC-BR-109-TC-AGENCY-074.json` (the detach / re-attach, with the Agency's supplier list read at each step), `manual_execution/artifacts/rerun-TC-BR-109-phase1-detached.png`, `manual_execution/artifacts/rerun-TC-BR-109-phase2-reattached.png`, `manual_execution/artifacts/TC-074-109-091-BR089-observations.json`.

---

#### TC-AGENCY-092 — An inactive credential leaves the Agency's Auto Reissue picker

**Test Case ID:** TC-AGENCY-092
**Execution Status:** Failed
**Execution Time:** < 5 min, executed twice (2026-10-04), each inside its own short inactive window

**Preconditions:** AGN9780 Approved, Auto Reissue on, with NDCSabre staging (313) as its only selected credential. Credential 313 belongs to supplier NDCsbr and is used by no other organisation.

**Test Data:** `{CRED}` = NDCSabre staging (id 313) · `{SUP}` = NDCsbr

**Steps Performed:**

1. Signed in as the platform super-user, opened **Master → Supplier → Supplier Credentials**, searched NDCSabre staging and set its status to **Inactive**. (Performed under `AUTH-AGENCY-UPDATE-Shared`, cleanup mandatory.)
2. Opened AGN9780 for edit and read Auto Reissue and Auto Reissue Credentials.
3. Opened the Auto Reissue Credentials picker and recorded every option.
4. Left the form without saving and set NDCSabre staging back to **Active**.

**Expected Result:** The specification's read-time clean-up (spec §4, rule `S-5`) says a selected credential that has become inactive is removed and the checkbox stays on. The case asserts both halves: after step 2 the credential is gone from the saved selection with Auto Reissue still ticked, and after step 3 **it is not offered in the picker**.

**Actual Result:** The first half held exactly — the Agency read back with `reissueCredentials: []` and Auto Reissue still ticked. The second half did not: the picker still offered **NDCSabre staging** alongside Sabre Staging while the credential was Inactive. An operator could re-select it; the API refuses such a save, which TC-AGENCY-070 confirmed inside the same window with `400 "Every auto-reissue credential must exist and be active"`.

**Impact:** Limited, and bounded by the API. An operator is offered a credential that cannot be saved, so the cost is a confusing choice and a rejected save, not a bad record. The Branch screen does not share the behaviour — TC-BR-110 ran in the same window and the Branch picker correctly hid the credential — so the two screens disagree about the same credential at the same moment.

**Classification:**

| Field | Value |
|---|---|
| Category | Documentation mismatch — not an application defect |
| Layer | Frontend |
| Reproducibility | **Always** — two separate inactive windows in this run, identical both times; run-006 recorded the same behaviour on 2026-09-26 |
| Regression | No — run-006 observed the same behaviour and the product owner accepted it |
| Suspected Component | The Agency edit form's Auto Reissue credential option list |
| Confidence | High that the behaviour is as described; the failure is against the Expected Result, not against a settled rule |

**Root Cause Analysis:** Likely the Agency form builds its picker options from the organisation's assigned credentials without filtering on credential status, while the Branch form applies the status filter. The read-time clean-up that empties the *selection* clearly does run on both.

**Conclusion:** **This is a documentation gap, not an application defect.** run-006 found the same behaviour, the user decided on 2026-09-26 that it is **intended — the API check is enough**, and that decision was flagged to Stage 3. The Expected Result was never amended, so the approved case still asserts "not offered" and the execution must record it as Failed. The fix belongs in Stage 3: amend TC-AGENCY-092's Expected Result to match the accepted behaviour, or reopen the product decision. Until then every run of this case will fail the same way.

**Severity:** Low. Reason: the behaviour is accepted by the product owner and the API blocks the invalid save; what is wrong is the test case's recorded expectation.

**Priority:** P3

**Evidence:** `manual_execution/artifacts/stageB-observations.json` and `manual_execution/artifacts/rerun-TC-AGENCY-092.json` (the two windows), `manual_execution/artifacts/TC-AGENCY-092-agency-during-inactive.png`, `manual_execution/artifacts/rerun-TC-AGENCY-092-agency-picker.png`, `manual_execution/artifacts/TC-BR-110-branch-during-inactive.png` and `manual_execution/artifacts/rerun-TC-BR-110-branch-picker.png` (the Branch, in each window, correctly hiding it).

---

#### TC-BR-107 — Create a Branch with Auto Reissue on

**Test Case ID:** TC-BR-107
**Execution Status:** Failed
**Execution Time:** ~20 min per attempt, executed twice (2026-10-04)

**Preconditions:** The user agreed on 2026-10-04 to the creation of a new Branch (`AUTH-BRANCH-CREATE-SelfCreated`), and agreed again to a second one for this re-execution. Galileo with credential GalileoLive is available as a supported GDS.

**Test Data:** Branch name `RUN010_AR_Branch` · Supplier Galileo, PCC tab `GalileoLive`

**Steps Performed:**

*First attempt (BRN514):*

1. Opened **Admin → Branch → Add**, completed the mandatory fields, ticked Galileo with GalileoLive in its PCC tab, ticked **Auto Reissue** and selected **GalileoLive**, then completed the cascading State and City fields, clicked **Send For Approval**, approved from the grid and reopened.

*Second attempt (BRN515), ordered to remove the doubt the first attempt left:*

2. Completed **Operating country, Country, State and City first**, so the cascading fields were settled before anything else was filled.
3. Completed the remaining mandatory fields, contract dates and uploads.
4. Ticked Galileo in Product Access and selected **GalileoLive** in its PCC tab.
5. Ticked **Auto Reissue** and selected **GalileoLive** in Auto Reissue Credentials.
6. **Read the live DOM immediately before submitting** and recorded: `autoReissueChecked: true`, `credentialLabel: "GalileoLive"`, `galileoChecked: true`, Branch Name `RUN010_AR_Branch`. Took a screenshot of the same state.
7. Clicked **Send For Approval**, approved the new Branch from the grid, and reopened it.

**Expected Result:** The new Branch shows **Auto Reissue** ticked with **GalileoLive** in Auto Reissue Credentials. This is the Branch half of the story's *"Add a Reissue Feature Allowed checkbox to the Create/Edit screens"* and *"the selected value is saved and retrieved correctly"* acceptance criteria.

**Actual Result:** Both Branches were created (`POST /odeysysadmin/Master2/Branch/` → 204) and approved — **BRN514** and **BRN515**. Both reopened with **Auto Reissue unticked**, the Auto Reissue Credentials control absent, and no supplier ticked in Product Access. On the second attempt the form was demonstrably correct at the moment of submission, read from the DOM rather than inferred from a screenshot alone.

**Impact:** A Branch created with Auto Reissue on silently does not have it. Nobody is told: the create succeeds, the approval succeeds, and the organisation's reissue permission is simply not what the person who created it chose. Until someone reopens the Branch and notices, its Auto Reissue state is wrong, and every booking made under it behaves as though reissue was never enabled. The same create path also drops the Product Access supplier, so the new Branch has no GDS at all. Editing the Branch afterwards does save correctly (TC-BR-089 passed), so the damage is confined to the create path and is recoverable once found.

**Classification:**

| Field | Value |
|---|---|
| Category | Data Integrity |
| Layer | Unknown — the evidence places the loss between a correct form and a stored record, without separating the create payload from the server's handling of it |
| Reproducibility | **Always** — two separate Branches, two different field orders, same outcome |
| Regression | Unknown — run-006 created BRN502 this way and recorded it as successful, but that run's form sequence is not documented in enough detail to compare |
| Suspected Component | The Add Branch create path — either the payload it builds for `POST /Master2/Branch/` or the server's handling of its `autoReissueEnabled`, `reissueCredentials` and `productAccessDetails` sections |
| Confidence | High — two occurrences, with the pre-submit form state read directly from the DOM on the second |

**Root Cause Analysis:** Likely the create payload omits the Auto Reissue and Product Access sections, or the create endpoint ignores them, because the *edit* path persists exactly the same fields correctly (TC-BR-089, TC-BR-106). The first attempt left open the possibility that the cascading State and City fields had reset the form model underneath; the second attempt set those fields first and read the form immediately before submitting, which removes that explanation.

**Conclusion:** Creating a Branch does not persist its Auto Reissue setting or its Product Access supplier. The first execution could not separate an application fault from an execution artifact; the re-run did, and the application is at fault.

**Severity:** High. Reason: a permission chosen at creation is silently discarded, the record is approved in that wrong state, and nothing surfaces the loss.

**Priority:** P1

**Evidence:** `manual_execution/artifacts/rerun-TC-BR-107-before-send.png` and the `preSubmit` block in `manual_execution/artifacts/rerun-TC-BR-107.json` (the form state read from the DOM at submit time), `manual_execution/artifacts/rerun-TC-BR-107-after-send.png`, `manual_execution/artifacts/rerun-TC-BR-107-reopened.png`, `manual_execution/artifacts/rerun-TC-BR-107-BRN515-readback.json`; first attempt: `manual_execution/artifacts/TC-BR-107-before-send.png`, `manual_execution/artifacts/TC-BR-107-reopened.png`, `manual_execution/artifacts/TC-BR-107-observation.json`.

**Data note:** Two permanent Branches now exist on staging from this case. **BRN514** was saved as "Run Ten" rather than `RUN010_AR_Branch`, because a late field-completion pass in the first execution overwrote its name; **BRN515** carries the intended name. Staging records cannot be deleted.


## 4. Evidence Inventory

| Test Case ID | Evidence Type | Path | Captured? | Gap Reason |
|---|---|---|---|---|
| TC-AGENCY-061 | Screenshot | `manual_execution/artifacts/TC-AGENCY-061-add-form-default.png` | Yes | — |
| TC-AGENCY-061 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-061-062-observations.json` | Yes | — |
| TC-AGENCY-061 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-061 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-062 | Screenshot | `manual_execution/artifacts/TC-AGENCY-062-ticked.png` | Yes | — |
| TC-AGENCY-062 | Screenshot | `manual_execution/artifacts/TC-AGENCY-062-unticked.png` | Yes | — |
| TC-AGENCY-062 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-061-062-observations.json` | Yes | — |
| TC-AGENCY-062 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-062 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-063 | Screenshot | `manual_execution/artifacts/TC-AGENCY-063-before-approve.png` | Yes | — |
| TC-AGENCY-063 | Screenshot | `manual_execution/artifacts/TC-AGENCY-063-reopened.png` | Yes | — |
| TC-AGENCY-063 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-063-observation.json` | Yes | — |
| TC-AGENCY-063 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-063 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-064 | Screenshot | `manual_execution/artifacts/TC-AGENCY-064-grid-pending.png` | Yes | — |
| TC-AGENCY-064 | Screenshot | `manual_execution/artifacts/TC-AGENCY-064-approve-dialog.png` | Yes | — |
| TC-AGENCY-064 | Screenshot | `manual_execution/artifacts/TC-AGENCY-064-grid-approved.png` | Yes | — |
| TC-AGENCY-064 | Screenshot | `manual_execution/artifacts/TC-AGENCY-064-reopened.png` | Yes | — |
| TC-AGENCY-064 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-064-observation.json` | Yes | — |
| TC-AGENCY-064 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-064 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-065 | Screenshot | `manual_execution/artifacts/TC-AGENCY-065-required.png` | Yes | — |
| TC-AGENCY-065 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-073-089-065-observations.json` | Yes | — |
| TC-AGENCY-065 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-065 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-066 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-api-observations.json` | Yes | — |
| TC-AGENCY-066 | Structured observation (JSON) | `manual_execution/artifacts/AGENCY_SAVE_REQUEST.json` | Yes | — |
| TC-AGENCY-066 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-066 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-067 | Screenshot | `manual_execution/artifacts/TC-AGENCY-067-after.png` | Yes | — |
| TC-AGENCY-067 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-api-observations.json` | Yes | — |
| TC-AGENCY-067 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-067 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-068 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-api-observations.json` | Yes | — |
| TC-AGENCY-068 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-068 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-069 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-api-observations.json` | Yes | — |
| TC-AGENCY-069 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-069 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-070 | Structured observation (JSON) | `manual_execution/artifacts/stageB-observations.json` | Yes | — |
| TC-AGENCY-070 | Screenshot | `manual_execution/artifacts/stageB-credential-inactive.png` | Yes | — |
| TC-AGENCY-070 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-070 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-071 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-api-observations.json` | Yes | — |
| TC-AGENCY-071 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-071 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-072 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-api-observations.json` | Yes | — |
| TC-AGENCY-072 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-072 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-073 | Screenshot | `manual_execution/artifacts/TC-AGENCY-073-step1-ar-on.png` | Yes | — |
| TC-AGENCY-073 | Screenshot | `manual_execution/artifacts/TC-AGENCY-073-step4-reopened-off.png` | Yes | — |
| TC-AGENCY-073 | Screenshot | `manual_execution/artifacts/TC-AGENCY-073-step6-picker.png` | Yes | — |
| TC-AGENCY-073 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-073-089-065-observations.json` | Yes | — |
| TC-AGENCY-073 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-073 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-074 | Structured observation (JSON) | `manual_execution/artifacts/rerun-TC-BR-109-TC-AGENCY-074.json` | Yes | — |
| TC-AGENCY-074 | Screenshot | `manual_execution/artifacts/rerun-TC-BR-109-phase1-detached.png` | Yes | — |
| TC-AGENCY-074 | Screenshot | `manual_execution/artifacts/TC-AGENCY-074-picker.png` | Yes | — |
| TC-AGENCY-074 | Structured observation (JSON) | `manual_execution/artifacts/TC-074-109-091-BR089-observations.json` | Yes | — |
| TC-AGENCY-074 | Structured observation (JSON) | `manual_execution/artifacts/AGN9780-after-branch-ndcsbr.json` | Yes | — |
| TC-AGENCY-074 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-074 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-075 | Screenshot | `manual_execution/artifacts/TC-AGENCY-092-agency-during-inactive.png` | Yes | — |
| TC-AGENCY-075 | Structured observation (JSON) | `manual_execution/artifacts/stageB-observations.json` | Yes | — |
| TC-AGENCY-075 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-075 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-080 | Screenshot | `manual_execution/artifacts/TC-AGENCY-080-search.png` | Yes | — |
| TC-AGENCY-080 | Screenshot | `manual_execution/artifacts/TC-AGENCY-080-booking-detail.png` | Yes | — |
| TC-AGENCY-080 | Screenshot | `manual_execution/artifacts/TC-AGENCY-080-passenger-details.png` | Yes | — |
| TC-AGENCY-080 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-080-TC-BR-108-observations.json` | Yes | — |
| TC-AGENCY-080 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-080 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-086 | Screenshot | `manual_execution/artifacts/TC-AGENCY-086-after-save.png` | Yes | — |
| TC-AGENCY-086 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-063-086-observations.json` | Yes | — |
| TC-AGENCY-086 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-086 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-087 | Screenshot | `manual_execution/artifacts/TC-AGENCY-087-before-send.png` | Yes | — |
| TC-AGENCY-087 | Screenshot | `manual_execution/artifacts/TC-AGENCY-087-after-send.png` | Yes | — |
| TC-AGENCY-087 | Screenshot | `manual_execution/artifacts/TC-AGENCY-087-reopened.png` | Yes | — |
| TC-AGENCY-087 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-087-observation.json` | Yes | — |
| TC-AGENCY-087 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-087 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-088 | Screenshot | `manual_execution/artifacts/TC-AGENCY-088-reopened.png` | Yes | — |
| TC-AGENCY-088 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-088-observation.json` | Yes | — |
| TC-AGENCY-088 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-088 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-089 | Screenshot | `manual_execution/artifacts/TC-AGENCY-089-after-save.png` | Yes | — |
| TC-AGENCY-089 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-073-089-065-observations.json` | Yes | — |
| TC-AGENCY-089 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-089 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-090 | Screenshot | `manual_execution/artifacts/TC-AGENCY-090-before-approve.png` | Yes | — |
| TC-AGENCY-090 | Screenshot | `manual_execution/artifacts/TC-AGENCY-090-after-approve.png` | Yes | — |
| TC-AGENCY-090 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-090-observation.json` | Yes | — |
| TC-AGENCY-090 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-090 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-091 | Structured observation (JSON) | `manual_execution/artifacts/TC-074-109-091-BR089-observations.json` | Yes | — |
| TC-AGENCY-091 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-091 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-092 | Screenshot | `manual_execution/artifacts/rerun-TC-AGENCY-092-agency-picker.png` | Yes | — |
| TC-AGENCY-092 | Screenshot | `manual_execution/artifacts/rerun-TC-AGENCY-092-credential-inactive.png` | Yes | — |
| TC-AGENCY-092 | Structured observation (JSON) | `manual_execution/artifacts/rerun-TC-AGENCY-092.json` | Yes | — |
| TC-AGENCY-092 | Screenshot | `manual_execution/artifacts/TC-AGENCY-092-agency-during-inactive.png` | Yes | — |
| TC-AGENCY-092 | Screenshot | `manual_execution/artifacts/stageB-credential-inactive.png` | Yes | — |
| TC-AGENCY-092 | Structured observation (JSON) | `manual_execution/artifacts/stageB-observations.json` | Yes | — |
| TC-AGENCY-092 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-092 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-AGENCY-093 | Screenshot | `manual_execution/artifacts/TC-AGENCY-093-during-inactive-supplier.png` | Yes | — |
| TC-AGENCY-093 | Structured observation (JSON) | `manual_execution/artifacts/stageC-observations.json` | Yes | — |
| TC-AGENCY-093 | Video | — | No | Session recording was not collected for this run |
| TC-AGENCY-093 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-083 | Screenshot | `manual_execution/artifacts/TC-BR-083-add-branch-default.png` | Yes | — |
| TC-BR-083 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-083-084-observations.json` | Yes | — |
| TC-BR-083 | Video | — | No | Session recording was not collected for this run |
| TC-BR-083 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-084 | Screenshot | `manual_execution/artifacts/TC-BR-084-ticked-no-supplier.png` | Yes | — |
| TC-BR-084 | Screenshot | `manual_execution/artifacts/TC-BR-084-picker-open.png` | Yes | — |
| TC-BR-084 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-083-084-observations.json` | Yes | — |
| TC-BR-084 | Video | — | No | Session recording was not collected for this run |
| TC-BR-084 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-085 | Screenshot | `manual_execution/artifacts/TC-BR-085-picker.png` | Yes | — |
| TC-BR-085 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-085-088-observations.json` | Yes | — |
| TC-BR-085 | Video | — | No | Session recording was not collected for this run |
| TC-BR-085 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-086 | Screenshot | `manual_execution/artifacts/TC-BR-086-picker.png` | Yes | — |
| TC-BR-086 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-085-088-observations.json` | Yes | — |
| TC-BR-086 | Video | — | No | Session recording was not collected for this run |
| TC-BR-086 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-087 | Screenshot | `manual_execution/artifacts/TC-BR-087-picker.png` | Yes | — |
| TC-BR-087 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-085-088-observations.json` | Yes | — |
| TC-BR-087 | Video | — | No | Session recording was not collected for this run |
| TC-BR-087 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-088 | Screenshot | `manual_execution/artifacts/TC-BR-088-picker.png` | Yes | — |
| TC-BR-088 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-085-088-observations.json` | Yes | — |
| TC-BR-088 | Video | — | No | Session recording was not collected for this run |
| TC-BR-088 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-089 | Screenshot | `manual_execution/artifacts/TC-BR-089-before-send.png` | Yes | — |
| TC-BR-089 | Screenshot | `manual_execution/artifacts/TC-BR-089-reopened.png` | Yes | — |
| TC-BR-089 | Structured observation (JSON) | `manual_execution/artifacts/TC-074-109-091-BR089-observations.json` | Yes | — |
| TC-BR-089 | Video | — | No | Session recording was not collected for this run |
| TC-BR-089 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-090 | Screenshot | `manual_execution/artifacts/TC-BR-090-before-send.png` | Yes | — |
| TC-BR-090 | Screenshot | `manual_execution/artifacts/TC-BR-090-grid-pending.png` | Yes | — |
| TC-BR-090 | Screenshot | `manual_execution/artifacts/TC-BR-090-grid-approved.png` | Yes | — |
| TC-BR-090 | Screenshot | `manual_execution/artifacts/TC-BR-090-reopened.png` | Yes | — |
| TC-BR-090 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-090-observation.json` | Yes | — |
| TC-BR-090 | Video | — | No | Session recording was not collected for this run |
| TC-BR-090 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-091 | Screenshot | `manual_execution/artifacts/TC-BR-091-picker.png` | Yes | — |
| TC-BR-091 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-091-092-093-observations.json` | Yes | — |
| TC-BR-091 | Video | — | No | Session recording was not collected for this run |
| TC-BR-091 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-092 | Screenshot | `manual_execution/artifacts/TC-BR-092-required.png` | Yes | — |
| TC-BR-092 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-091-092-093-observations.json` | Yes | — |
| TC-BR-092 | Video | — | No | Session recording was not collected for this run |
| TC-BR-092 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-093 | Screenshot | `manual_execution/artifacts/TC-BR-093-remark-cleared.png` | Yes | — |
| TC-BR-093 | Screenshot | `manual_execution/artifacts/TC-BR-093-result.png` | Yes | — |
| TC-BR-093 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-093-observation.json` | Yes | — |
| TC-BR-093 | Video | — | No | Session recording was not collected for this run |
| TC-BR-093 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-094 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-api-observations.json` | Yes | — |
| TC-BR-094 | Structured observation (JSON) | `manual_execution/artifacts/BRANCH_SAVE_REQUEST.json` | Yes | — |
| TC-BR-094 | Video | — | No | Session recording was not collected for this run |
| TC-BR-094 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-095 | Screenshot | `manual_execution/artifacts/TC-BR-095-after.png` | Yes | — |
| TC-BR-095 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-api-observations.json` | Yes | — |
| TC-BR-095 | Video | — | No | Session recording was not collected for this run |
| TC-BR-095 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-096 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-api-observations.json` | Yes | — |
| TC-BR-096 | Video | — | No | Session recording was not collected for this run |
| TC-BR-096 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-097 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-api-observations.json` | Yes | — |
| TC-BR-097 | Video | — | No | Session recording was not collected for this run |
| TC-BR-097 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-098 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-api-observations.json` | Yes | — |
| TC-BR-098 | Video | — | No | Session recording was not collected for this run |
| TC-BR-098 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-099 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-api-observations.json` | Yes | — |
| TC-BR-099 | Video | — | No | Session recording was not collected for this run |
| TC-BR-099 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-100 | Screenshot | `manual_execution/artifacts/TC-BR-100-agency-unchanged.png` | Yes | — |
| TC-BR-100 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-106-100-observations.json` | Yes | — |
| TC-BR-100 | Video | — | No | Session recording was not collected for this run |
| TC-BR-100 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-105 | Screenshot | `manual_execution/artifacts/rerun-TC-BR-110-branch-picker.png` | Yes | — |
| TC-BR-105 | Structured observation (JSON) | `manual_execution/artifacts/rerun-TC-AGENCY-092.json` | Yes | — |
| TC-BR-105 | Screenshot | `manual_execution/artifacts/TC-BR-110-branch-during-inactive.png` | Yes | — |
| TC-BR-105 | Structured observation (JSON) | `manual_execution/artifacts/stageB-observations.json` | Yes | — |
| TC-BR-105 | Video | — | No | Session recording was not collected for this run |
| TC-BR-105 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-106 | Screenshot | `manual_execution/artifacts/TC-BR-106-reopened.png` | Yes | — |
| TC-BR-106 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-106-100-observations.json` | Yes | — |
| TC-BR-106 | Video | — | No | Session recording was not collected for this run |
| TC-BR-106 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-107 | Screenshot | `manual_execution/artifacts/rerun-TC-BR-107-before-send.png` | Yes | — |
| TC-BR-107 | Screenshot | `manual_execution/artifacts/rerun-TC-BR-107-after-send.png` | Yes | — |
| TC-BR-107 | Screenshot | `manual_execution/artifacts/rerun-TC-BR-107-reopened.png` | Yes | — |
| TC-BR-107 | Structured observation (JSON) | `manual_execution/artifacts/rerun-TC-BR-107.json` | Yes | — |
| TC-BR-107 | Structured observation (JSON) | `manual_execution/artifacts/rerun-TC-BR-107-BRN515-readback.json` | Yes | — |
| TC-BR-107 | Screenshot | `manual_execution/artifacts/TC-BR-107-before-send.png` | Yes | — |
| TC-BR-107 | Screenshot | `manual_execution/artifacts/TC-BR-107-reopened.png` | Yes | — |
| TC-BR-107 | Structured observation (JSON) | `manual_execution/artifacts/TC-BR-107-observation.json` | Yes | — |
| TC-BR-107 | Video | — | No | Session recording was not collected for this run |
| TC-BR-107 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-108 | Screenshot | `manual_execution/artifacts/TC-BR-108-my-bookings.png` | Yes | — |
| TC-BR-108 | Screenshot | `manual_execution/artifacts/TC-BR-108-filtered-by-reference.png` | Yes | — |
| TC-BR-108 | Structured observation (JSON) | `manual_execution/artifacts/TC-AGENCY-080-TC-BR-108-observations.json` | Yes | — |
| TC-BR-108 | Video | — | No | Session recording was not collected for this run |
| TC-BR-108 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-109 | Screenshot | `manual_execution/artifacts/rerun-TC-BR-109-phase1-detached.png` | Yes | — |
| TC-BR-109 | Screenshot | `manual_execution/artifacts/rerun-TC-BR-109-phase2-reattached.png` | Yes | — |
| TC-BR-109 | Structured observation (JSON) | `manual_execution/artifacts/rerun-TC-BR-109-TC-AGENCY-074.json` | Yes | — |
| TC-BR-109 | Screenshot | `manual_execution/artifacts/TC-BR-109-branch-product-access.png` | Yes | — |
| TC-BR-109 | Structured observation (JSON) | `manual_execution/artifacts/TC-074-109-091-BR089-observations.json` | Yes | — |
| TC-BR-109 | Structured observation (JSON) | `manual_execution/artifacts/AGN9780-after-branch-ndcsbr.json` | Yes | — |
| TC-BR-109 | Structured observation (JSON) | `manual_execution/artifacts/baseline-AGN9780.json` | Yes | — |
| TC-BR-109 | Video | — | No | Session recording was not collected for this run |
| TC-BR-109 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-110 | Screenshot | `manual_execution/artifacts/rerun-TC-BR-110-branch-picker.png` | Yes | — |
| TC-BR-110 | Structured observation (JSON) | `manual_execution/artifacts/rerun-TC-AGENCY-092.json` | Yes | — |
| TC-BR-110 | Screenshot | `manual_execution/artifacts/TC-BR-110-branch-during-inactive.png` | Yes | — |
| TC-BR-110 | Structured observation (JSON) | `manual_execution/artifacts/stageB-observations.json` | Yes | — |
| TC-BR-110 | Video | — | No | Session recording was not collected for this run |
| TC-BR-110 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |
| TC-BR-111 | Screenshot | `manual_execution/artifacts/TC-BR-111-during-inactive-supplier.png` | Yes | — |
| TC-BR-111 | Structured observation (JSON) | `manual_execution/artifacts/stageC-observations.json` | Yes | — |
| TC-BR-111 | Video | — | No | Session recording was not collected for this run |
| TC-BR-111 | Console / network log | — | No | Not collected; API status codes and response bodies were captured instead |

**Evidence root:** `platform_core_data/runs/agency+branch-run-003__2026-10-04_14-13-31__UserStory__AutoReissueCheckbox-ApprovedSuiteRerun/manual_execution/artifacts/`

## 5. Requirement References

Carried unmodified from the approved Requirement Traceability Matrices (`modules/agency/test_design/TraceabilityMatrix.md` §5, `modules/branch/test_design/TraceabilityMatrix.md` §5).

| Test Case ID | Requirement Reference | Status |
|---|---|---|
| TC-AGENCY-061 | PC §2 "Auto Reissue checkbox on Create/Update Agency" / `PO-15` / spec §1 | Passed |
| TC-AGENCY-062 | PC §2 "Reissue-credential selection (UI)" / ASM-019 | Passed |
| TC-AGENCY-063 | PC §2 "Saved value is retrieved when the Agency is edited" / spec `S-10`, §4 | Passed |
| TC-AGENCY-064 | PC §2 "Maker–checker on the new field" / XC-01, XC-04 / `PO-24` | Passed |
| TC-AGENCY-065 | spec `S-2` / `PO-23` | Passed |
| TC-AGENCY-066 | spec `S-2` / `PO-23` / `PO-17` | Passed |
| TC-AGENCY-067 | spec `S-3` / `PO-17` | Passed |
| TC-AGENCY-068 | spec `S-4` / `PO-17` | Passed |
| TC-AGENCY-069 | spec `S-5` (unknown) / `PO-17` | Passed |
| TC-AGENCY-070 | spec `S-5` (inactive) / RSK-012 | Passed |
| TC-AGENCY-071 | spec `S-6` / `PO-17` | Passed |
| TC-AGENCY-072 | spec `S-8` / `PO-16` / ASM-021 | Passed |
| TC-AGENCY-073 | spec `S-7` | Passed |
| TC-AGENCY-074 | `PO-21` (picker lists the organisation's own chosen credentials) / `PO-16`, `PO-27` (Agency credentials are a subset of the Branch's) | Blocked |
| TC-AGENCY-075 | spec §4 (read-time clean-up) / RSK-012 | Passed |
| TC-AGENCY-080 | `PO-25` / spec §5 | Passed |
| TC-AGENCY-086 | PC §2 "Regression — existing Agency CRUD is unaffected" / RSK-014 | Passed |
| TC-AGENCY-087 | PC §2 "Auto Reissue checkbox on Create/Update Agency" / `PO-19` | Passed |
| TC-AGENCY-088 | spec `S-1` / PC §2 "Auto Reissue checkbox on Create/Update Agency" | Passed |
| TC-AGENCY-089 | spec `S-1` / PC §2 "Saved value is retrieved when the Agency is edited" | Passed |
| TC-AGENCY-090 | PC §2 "Saved value is retrieved when the Agency is edited" / spec §4 | Passed |
| TC-AGENCY-091 | `PO-27` / `PO-16` / ASM-003 | Passed |
| TC-AGENCY-092 | spec §4 (read-time clean-up) / spec `S-5` / RSK-012 | Failed |
| TC-AGENCY-093 | spec §4 / RSK-012 (supplier-level case not stated) | Passed |
| TC-BR-083 | PC §2 REV 9 "Auto Reissue checkbox on Create Branch and Update Branch" / `PO-15` | Passed |
| TC-BR-084 | PC §2 REV 9 "Reissue-credential selection (UI)" / ASM-BR-4 | Passed |
| TC-BR-085 | `PO-21` | Passed |
| TC-BR-086 | `PO-21` | Passed |
| TC-BR-087 | `PO-21` / spec `S-9` | Passed |
| TC-BR-088 | `PO-21` | Passed |
| TC-BR-089 | PC §2 REV 9 "Saved value retrieved on edit and on GET" / spec `S-10` | Passed |
| TC-BR-090 | PC §2 REV 9 "Maker–checker on the new field" / XC-01, XC-03, XC-04 | Passed |
| TC-BR-091 | PC §2 REV 9 "Off keeps saved credentials" / spec `S-7` | Passed |
| TC-BR-092 | spec `S-2` / `PO-23` | Passed |
| TC-BR-093 | RISK-BR-10 / US 8606 "mandatory Remarks" | Passed |
| TC-BR-094 | spec `S-2` / `PO-23` / `PO-17` | Passed |
| TC-BR-095 | spec `S-3` / `PO-17` | Passed |
| TC-BR-096 | spec `S-4` / `PO-17` | Passed |
| TC-BR-097 | spec `S-5` (unknown) / `PO-17` | Passed |
| TC-BR-098 | spec `S-6` / `PO-17` | Passed |
| TC-BR-099 | spec `S-8` / `PO-17` | Passed |
| TC-BR-100 | PC §2 REV 9 "Independence from Agencies" / `PO-16` / spec §3 | Passed |
| TC-BR-105 | PC §2 REV 9 "read-time clean-up" / spec §4 / RISK-BR-11 | Passed |
| TC-BR-106 | PC §2 REV 9 "Regression smoke" / RISK-BR-12 | Passed |
| TC-BR-107 | PC §2 REV 9 "Auto Reissue checkbox on Create Branch" / `PO-19` | Failed |
| TC-BR-108 | `PO-26` | Passed |
| TC-BR-109 | `PO-27` | Failed |
| TC-BR-110 | spec §4 / RISK-BR-11 | Passed |
| TC-BR-111 | spec §4 / RISK-BR-11 (supplier-level case not stated) | Passed |
