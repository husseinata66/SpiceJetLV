# Manual Test Suite — Branch

| Field | Value |
|---|---|
| Module | `branch` |
| Produced by run | `run-002__2026-08-03_10-26-17__UserStory__US-8605CreateBranch` (TC-BR-001…039) · `run-003__2026-08-04_11-24-38__UserStory__US-8599-SearchActions_US-8606-UpdateBranch` (TC-BR-040…081) · `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` (TC-BR-083 … 111) |
| Revision | 4 (run-006 adds TC-BR-083 … 111; see §0.2) · 3 (in place — run-003 extended the suite from Create-only to Create + Search & Actions + Update, adding TC-BR-040…081. The 39 existing cases are unchanged.) |
| Run Scope Type / Run Type | User Story / User Story |
| Project Context | `modules/branch/context/ProjectContext.md` |
| Total Test Cases | 112 |
| Generated | 2026-08-03 (TC-BR-001…039) · 2026-08-04 (TC-BR-040…081) · 2026-09-24 (TC-BR-083 … 108) · 2026-09-25 (TC-BR-109 … 111) |
| Status | **Approved** — Mohamed Soliman, Stage 3 Human Review gate, 2026-09-25: TC-BR-083 … 111 approved (29); TC-BR-112 approved 2026-09-25. Earlier cases keep their decisions. Previously **Approved** — 2026-08-04, ahmed.ayman@tildetech.ae. TC-BR-040…081 approved for execution; TC-BR-001…039 retain their 2026-08-03 review decisions (31 Approved, 8 Rejected). |

## 0.2 What Revision 4 changed (run-006 — Auto Reissue)

Revision 4 **adds** 29 cases, TC-BR-083 … TC-BR-111, for the *Auto Reissue checkbox — Branch & Agency* story.
**No earlier case was changed**, and each keeps its recorded Review and Automation decision.

- The new cases are designed against branch ProjectContext Revision 9 (Approved 2026-09-24) **plus the
  Stage 2 additions `PO-21` … `PO-26`** and the run-006 Discovery — **both approved by Mohamed Soliman on 2026-09-24**, after this revision was drafted.
- **This revision was drafted before Stage 2 was approved, at the user's instruction** (2026-09-24: *"i will
  approve at the end this time so i can know what you get from the testcase design"*). Every new case was
  `Review: Pending` until the user approved all 29 on 2026-09-25. If the Stage 2 review changes a decision, the affected cases are rewritten before approval.
- **Added 2026-09-25 at the user's request:** TC-BR-109 (a Branch can have a supplier its Agency doesn't, `PO-27`), 110 (inactive credential) and 111 (inactive supplier, exploratory).
- Pipeline branch chosen by the user: **Manual (4M)**. `Automation` stays `Pending` on every new case.
- API cases (spec `S-2` … `S-8`) are run in Postman from the app's own captured save request (§0.3).

## 0.3 Fixtures for run-006 (Auto Reissue)

**Environment:** Admin `http://192.168.1.60` · Portal `http://192.168.1.60:9500` (shared staging). Logins are
kept only in the git-ignored `credentials.json` and never written into a case.

**The run uses records the user designated, not records it created** (`AUTH-*-DedicatedTestData` in
`run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` `metadata/SafetyAuthorizations.json`). **Default records, not a limit** (user, 2026-09-24): use AGN9780 and BRN265 by default. A **new** Agency or Branch may be created when a case needs one, **after asking the user each time**. Nothing else may be changed.

| Fixture | Definition | Restore to after each case |
|---|---|---|
| AGN9780 | Agency "NDC2_Mohamed Soliman", id 10961, under BRN265 | Auto Reissue **off**, Approved |
| BRN265 | Branch "NDC2_Mohamed Soliman", id 10950 | Auto Reissue **on**, **NDCSabre staging** (313), Approved |
| `NDCEG-BR-F260924EAzzYT` | Booking made by the user under AGN9780 (order `AGN9780NDCNDCORD260924GKP8CP`), Sabre, credential Sabre Staging (315), Status Booked | Unchanged — read only |
| `NDCEG-BR-F260916ENYOeQ` | Booking made by the user under BRN265 itself (order `BRN265NDCORD2609169XJ1LC`), Sabre, credential 315, Status Booked | Unchanged — read only |
| `{ONBEHALF_REF}` = `NDCEG-BR-F2609242aZ6EJ` | Supplied by the user 2026-09-25: **Booked from Admin on behalf of an Agency**. Before TC-AGENCY-083, read the itinerary's agency and confirm it is AGN9780 | Unchanged — read only |
| `{NOTBOOKED_REF}` = `NDCEG-BR-F251014N1oohh` | Supplied by the user 2026-09-25: an **Agency** booking **On Hold**. Used by TC-AGENCY-084 (Admin) and TC-AGENCY-094 (Portal) | Unchanged — read only |
| `NDCEG-BR-F251103CdegUo` | Supplied by the user 2026-09-25: a **Branch** booking **On Hold**. Used by TC-BR-112 | Unchanged — read only |
| `{CRED}` = **NDCSabre staging** (id 313) · `{SUP}` = **NDCsbr** | Chosen by the user 2026-09-25 for TC-AGENCY-092/093 and TC-BR-110/111. Grant `AUTH-MASTER-SUPPLIER-UPDATE-Shared` (status only; restore to Active). **313 is also BRN265's restore credential**, so restore it before any BRN265 booking check. TC-AGENCY-092 needs 313 chosen in AGN9780's NDCsbr PCC tab first; record AGN9780's Product Access before changing it, and restore it after | Active |
| New Agencies (TC-AGENCY-087, 088) | **The user agreed on 2026-09-25** to create them under BRN265 (`AUTH-AGENCY-CREATE-SelfCreated`). Record each new code right after approval | Stay on STG (can't be deleted) |
| `{AGENCY_SAVE_REQUEST}` | The app's own save request for AGN9780, captured once: open Chrome DevTools (F12) → **Network**, make a valid save on AGN9780 (e.g. TC-AGENCY-063), right-click `PUT /odeysysadmin/Admin2/agency/10961` → **Copy → Copy as cURL (bash)**, then Postman → **Import → Raw text** | — |
| `{BRANCH_SAVE_REQUEST}` | The same for BRN265: `PUT /odeysysadmin/Master2/Branch/10950`, captured on a valid Send For Approval (e.g. TC-BR-089) | — |
| GET (read-back) | `GET /odeysysadmin/Admin2/agency/10961` and `GET /odeysysadmin/Master2/Branch/BRN265/details`, with the same headers as the captured request. Read `autoReissueEnabled` and `reissueCredentials` | — |

**The captured request carries your login token.** Don't save it in a shared Postman workspace. If a
request returns 401, capture it again.

**Rules for every case:**
- Never click **Reissue**, **Release PNR** or **Void / Cancel**, on Admin or the Portal.
- Admin booking checks need the booking lock (Created By card). The Portal needs no lock (`PO-25`).
- BRN265 and AGN9780 were also changed by hand during Discovery. **Read the Auto Reissue value just
  before each booking check**, in the same session.

## Case Index

| Test Case ID | Title | Tier | Priority | Tags | Review | Automation |
|---|---|---|---|---|---|---|
| TC-BR-001 | Create Branch with all mandatory Branch Details fields | Atomic | P1 | Atomic, Positive | Approved | Approved |
| TC-BR-002 | Mandatory Branch Details fields block submission when empty | Atomic | P1 | Atomic, Negative-EmptyValues | Approved | Approved |
| TC-BR-003 | Branch Name rejects non-alphanumeric special characters | Atomic | P2 | Atomic, Negative-SpecialCharacters | Approved | Rejected |
| TC-BR-004 | Country field auto-fills based on selected Operating Country | Atomic | P2 | Atomic, Positive | Approved | Approved |
| TC-BR-005 | State dropdown populates based on selected Country | Atomic | P2 | Atomic, Positive | Approved | Rejected |
| TC-BR-006 | City dropdown populates based on selected State | Atomic | P2 | Atomic, Positive | Approved | Rejected |
| TC-BR-007 | Post Office Box accepts an alphanumeric value up to 8 characters | Atomic | P2 | Atomic, Positive, Boundary | Rejected | Rejected |
| TC-BR-008 | Post Office Box rejects a value exceeding 8 characters | Atomic | P1 | Atomic, Negative-BoundaryValues, Regression | Rejected | Rejected |
| TC-BR-009 | Phone Number requires a country code and a numeric value | Atomic | P2 | Atomic, Positive | Rejected | Rejected |
| TC-BR-010 | Phone Number rejects non-numeric characters | Atomic | P2 | Atomic, Negative-InvalidInputs | Approved | Rejected |
| TC-BR-011 | Service Tax Number and ABTA Number accept optional uppercase alphanumeric values | Atomic | P3 | Atomic, Positive | Rejected | Rejected |
| TC-BR-012 | Create Branch with valid Branch Email Configuration | Atomic | P1 | Atomic, Positive | Approved | Rejected |
| TC-BR-013 | Mandatory Branch Email Configuration fields block submission when empty | Atomic | P1 | Atomic, Negative-EmptyValues | Approved | Approved |
| TC-BR-014 | Email Password accepts a value up to 15 characters | Atomic | P2 | Atomic, Positive, Boundary | Rejected | Rejected |
| TC-BR-015 | Email Password rejects a value exceeding 15 characters | Atomic | P2 | Atomic, Negative-BoundaryValues | Rejected | Rejected |
| TC-BR-016 | Add Branch Contact Person with valid Name, Email, and Phone | Atomic | P1 | Atomic, Positive | Approved | Rejected |
| TC-BR-017 | Mandatory Branch Contact Info fields block submission when empty | Atomic | P1 | Atomic, Negative-EmptyValues | Approved | Rejected |
| TC-BR-018 | Contact Name rejects characters other than letters, spaces, and a single dot | Atomic | P2 | Atomic, Negative-SpecialCharacters | Rejected | Rejected |
| TC-BR-019 | Add multiple Contact Persons using the Add button | Scenario | P3 | Scenario, Positive | Approved | Rejected |
| TC-BR-020 | Add Target requires Target Amount, Month, and Year before enabling Add Target | Atomic | P3 | Atomic, Positive | Rejected | Rejected |
| TC-BR-021 | Mandatory Branch Sales Configuration fields block submission when empty | Atomic | P1 | Atomic, Negative-EmptyValues | Approved | Approved |
| TC-BR-022 | Credit Limit rejects non-numeric input | Atomic | P2 | Atomic, Negative-InvalidInputs | Approved | Rejected |
| TC-BR-023 | Credit Limit rejects a value exceeding 15 characters | Atomic | P1 | Atomic, Negative-BoundaryValues, Regression | Approved | Rejected |
| TC-BR-024 | Reaching Percentage rejects a value greater than 100% | Atomic | P2 | Atomic, Negative-BoundaryValues | Approved | Approved |
| TC-BR-025 | Reaching Percentage accepts a value with up to 3 decimal places | Atomic | P3 | Atomic, Positive, Boundary | Approved | Approved |
| TC-BR-026 | Warning Prompt (Days) rejects a value exceeding 11 digits | Atomic | P1 | Atomic, Negative-BoundaryValues, Regression, Blocked-NeedsClarification | Approved | Blocked — Needs Clarification (was Approved; suspended 2026-08-10, not rejected on merit) |
| TC-BR-027 | Warning Prompt (Days) rejects a value greater than Credit Terms (Days) | Atomic | P2 | Atomic, Negative-InvalidInputs | Approved | Rejected |
| TC-BR-028 | Select at least one Payment Option | Atomic | P3 | Atomic, Positive | Approved | Approved |
| TC-BR-029 | Product Access grid displays the required columns | Atomic | P2 | Atomic, Positive | Approved | Rejected |
| TC-BR-030 | Description field is enabled only when a Supplier row is selected | Atomic | P2 | Atomic, Positive | Approved | Approved |
| TC-BR-031 | Description field is mandatory once a Supplier row is selected | Atomic | P2 | Atomic, Negative-EmptyValues | Approved | Rejected |
| TC-BR-032 | Selecting a GDS-type Supplier reveals the Supplier Credentials sub-grid | Atomic | P2 | Atomic, Positive | Approved | Rejected |
| TC-BR-033 | Search Supplier Credentials PCC and Ticketing Supplier Credential PCC are not present on the UI | Atomic | P3 | Atomic, Positive | Approved | Rejected |
| TC-BR-034 | Submit for Approval saves the Branch and submits it for review | Scenario | P1 | Scenario, Positive | Approved | Rejected |
| TC-BR-035 | Submit action button displays the label "Submit for Approval" | Atomic | P4 | Atomic, Negative-UILabel, Regression | Approved | Rejected |
| TC-BR-036 | Cancel exits the Create Branch form without saving | Atomic | P2 | Atomic, Positive | Approved | Rejected |
| TC-BR-037 | Create Branch with a valid Child Agencies Threshold Amount value | Atomic | P2 | Atomic, Positive, ExpectedImplementation | Approved | Approved |
| TC-BR-038 | Child Agencies Threshold Amount opens pre-filled with a default value | Atomic | P3 | Atomic, Positive, ExpectedImplementation | Approved | Approved |
| TC-BR-039 | Child Agencies Threshold Amount accepts a numeric value | Atomic | P3 | Atomic, Positive, ExpectedImplementation | Approved | Approved |
| TC-BR-040 | Search Branch by Branch Code returns the matching record | Atomic | P1 | Atomic, Positive, Smoke | Approved | Approved |
| TC-BR-041 | Search Branch by Branch Name returns the matching record | Atomic | P1 | Atomic, Positive, Smoke | Approved | Approved |
| TC-BR-042 | Search with no criteria returns the default Active result set | Atomic | P2 | Atomic, Positive | Approved | Approved |
| TC-BR-043 | Search with non-matching criteria shows the empty-state message | Atomic | P1 | Atomic, Negative-InvalidInputs, Regression | Approved | Approved |
| TC-BR-044 | Status filter defaults to Active on page load | Atomic | P1 | Atomic, Positive, BusinessRule | Approved | Rejected |
| TC-BR-045 | Status filter returns only records matching the selected status | Atomic | P1 | Atomic, Positive, BusinessRule, Regression | Approved | Approved |
| TC-BR-046 | State filter stays disabled until a Country is selected | Atomic | P2 | Atomic, Positive, BusinessRule | Approved | Approved |
| TC-BR-047 | City filter stays disabled until a State is selected | Atomic | P2 | Atomic, Positive, BusinessRule | Approved | Rejected |
| TC-BR-048 | Branch Code filter accepts alphanumeric input | Atomic | P3 | Atomic, Positive | Approved | Rejected |
| TC-BR-049 | Branch Name filter accepts alphabetic and special characters | Atomic | P3 | Atomic, Positive | Approved | Rejected |
| TC-BR-050 | Branch Name filter handles Unicode input without error | Atomic | P3 | Atomic, Negative-Unicode | Approved | Rejected |
| TC-BR-051 | Search filters handle security-payload-shaped input safely | Atomic | P2 | Atomic, Negative-SecurityInputs | Approved | Rejected |
| TC-BR-052 | Results grid displays all specified columns | Atomic | P1 | Atomic, Regression | Approved | Approved |
| TC-BR-053 | Approval Status column reflects each record's approval state | Atomic | P2 | Atomic, Positive | Approved | Rejected |
| TC-BR-054 | Row action icons match the selected Status filter | Atomic | P2 | Atomic, Positive, BusinessRule | Approved | Approved |
| TC-BR-055 | Edit pen opens Update Branch with the record's details pre-filled | Scenario | P1 | Scenario, Positive, Smoke | Approved | Approved |
| TC-BR-056 | Approve a Pending branch from the results grid | Scenario | P1 | Scenario, Positive, SelfCreatedRecord | Approved | Approved |
| TC-BR-057 | Reject a Pending branch from the results grid | Scenario | P1 | Scenario, Positive, SelfCreatedRecord | Approved | Approved |
| TC-BR-058 | Approve and Reject capture a Remarks entry | Atomic | P2 | Atomic, Positive, SelfCreatedRecord | Approved | Approved |
| TC-BR-059 | Same account attempts to approve the branch it created | Atomic | P1 | Atomic, Security, SelfCreatedRecord, AssumptionBased | Approved | Rejected |
| TC-BR-060 | Navigate to the next page of results | Atomic | P2 | Atomic, Positive | Approved | Approved |
| TC-BR-061 | Navigate to the last page of results | Atomic | P3 | Atomic, Positive | Approved | Approved |
| TC-BR-062 | Pagination preserves the active status filter | Atomic | P1 | Atomic, Positive, Regression | Approved | Rejected |
| TC-BR-063 | Result count text reflects the filtered total | Atomic | P3 | Atomic, Positive | Approved | Rejected |
| TC-BR-064 | A record on a later page is findable by direct search | Atomic | P2 | Atomic, Positive | Approved | Rejected |
| TC-BR-065 | Update Branch pre-fills every stored value | Scenario | P1 | Scenario, Positive, Smoke | Approved | Approved |
| TC-BR-066 | Update a branch and submit it for approval | Scenario | P1 | Scenario, Positive, SelfCreatedRecord | Approved | Approved |
| TC-BR-067 | Remarks is mandatory before any Update action | Atomic | P1 | Atomic, Negative-EmptyValues, SelfCreatedRecord | Approved | Approved |
| TC-BR-068 | Cancel discards unsaved changes on Update Branch | Atomic | P2 | Atomic, Positive, SelfCreatedRecord | Approved | Approved |
| TC-BR-069 | Approve a branch update request from the Update screen | Scenario | P1 | Scenario, Positive, SelfCreatedRecord | Approved | Approved |
| TC-BR-070 | Reject a branch update request from the Update screen | Scenario | P1 | Scenario, Positive, SelfCreatedRecord | Approved | Rejected |
| TC-BR-071 | Mandatory Update Branch fields block submission when cleared | Atomic | P1 | Atomic, Negative-EmptyValues, SelfCreatedRecord | Approved | Rejected |
| TC-BR-072 | Post Office Box rejects a value exceeding 8 characters on Update | Atomic | P2 | Atomic, Negative-BoundaryValues, Regression, SelfCreatedRecord | Approved | Rejected |
| TC-BR-073 | Credit Limit rejects a value exceeding 15 characters on Update | Atomic | P2 | Atomic, Negative-BoundaryValues, Regression, SelfCreatedRecord | Approved | Rejected |
| TC-BR-074 | Warning Prompt must not exceed Credit Terms on Update | Atomic | P2 | Atomic, Negative-InvalidInputs, SelfCreatedRecord | Approved | Rejected |
| TC-BR-075 | Reaching Percentage rejects a value above 100 on Update | Atomic | P2 | Atomic, Negative-BoundaryValues, SelfCreatedRecord | Approved | Rejected |
| TC-BR-076 | Change Threshold lists child agencies before confirming | Scenario | P2 | Scenario, Positive, SelfCreatedRecord, AssumptionBased | Approved | Rejected |
| TC-BR-077 | Stored Branch Email Password is not recoverable from the Update form | Atomic | P1 | Atomic, Security, Regression, Blocked-NeedsClarification | Approved | Rejected — and now also `Blocked — Needs Clarification` (was Rejected on scope grounds alone) |
| TC-BR-078 | Exploratory — is Active/Inactive status discoverable from the grid? | Atomic | P2 | Atomic, Exploratory | Approved | Rejected |
| TC-BR-079 | Exploratory — does the City filter accept and apply multiple cities? | Atomic | P3 | Atomic, Exploratory | Approved | Rejected |
| TC-BR-080 | Admin-role operator sees the same grid columns and row actions | Atomic | P3 | Atomic, Permissions, NotCovered-SingleAccountRun | Approved | Rejected |
| TC-BR-081 | Repeated failed login attempts lock the account | Atomic | P3 | Atomic, Security, Deferred-RequiresDedicatedEnvironment | Approved | Rejected |
| TC-BR-082 | Credit Terms (Days) rejects a value exceeding 7 digits | Atomic | P2 | Atomic, Negative-BoundaryValues | Approved | Rejected |
| TC-BR-083 | Auto Reissue is unchecked by default on Add Branch | Atomic | P2 | Atomic, Positive | Approved | Pending |
| TC-BR-084 | Picker is empty on a new Branch with no supplier | Atomic | P3 | Atomic, Negative-EmptyValues | Approved | Pending |
| TC-BR-085 | An LCC credential is not offered for Auto Reissue | Atomic | P2 | Atomic, Negative, Business-Rule | Approved | Pending |
| TC-BR-086 | A Galileo PCC credential is offered for Auto Reissue | Atomic | P2 | Atomic, Positive, Business-Rule | Approved | Pending |
| TC-BR-087 | An Amadeus PCC credential is not offered for Auto Reissue | Atomic | P2 | Atomic, Negative, Business-Rule | Approved | Pending |
| TC-BR-088 | A TravelportNdc PCC credential is offered for Auto Reissue | Atomic | P3 | Atomic, Positive, Assumption-based | Approved | Pending |
| TC-BR-089 | Turn Auto Reissue on for a Branch and save | Scenario | P1 | Scenario, Positive, Smoke | Approved | Pending |
| TC-BR-090 | Branch Auto Reissue change waits for approval | Scenario | P2 | Scenario, Regression | Approved | Pending |
| TC-BR-091 | Turning Branch Auto Reissue off keeps the saved credentials | Scenario | P1 | Scenario, Positive, Regression | Approved | Pending |
| TC-BR-092 | Branch Auto Reissue on with no credential shows "Required" | Atomic | P1 | Atomic, Negative-EmptyValues | Approved | Pending |
| TC-BR-093 | Branch update without a remark is refused | Atomic | P3 | Atomic, Negative-EmptyValues, Assumption-based | Approved | Pending |
| TC-BR-094 | Branch API rejects Auto Reissue on with an empty credential list | Atomic | P2 | Atomic, Negative-EmptyValues | Approved | Pending |
| TC-BR-095 | Branch API keeps saved credentials when sent off with others | Atomic | P2 | Atomic, Positive | Approved | Pending |
| TC-BR-096 | Branch API rejects a credential without an ID | Atomic | P2 | Atomic, Negative-InvalidInputs | Approved | Pending |
| TC-BR-097 | Branch API rejects an unknown credential ID | Atomic | P2 | Atomic, Negative-InvalidInputs | Approved | Pending |
| TC-BR-098 | Branch API rejects duplicate credential IDs | Atomic | P2 | Atomic, Negative-InvalidInputs | Approved | Pending |
| TC-BR-099 | Branch API rejects a credential not assigned to the Branch | Atomic | P1 | Atomic, Negative-InvalidInputs, Permissions | Approved | Pending |
| TC-BR-100 | Branch Auto Reissue does not change its Agencies' checkbox | Atomic | P1 | Atomic, Integration | Approved | Pending |
| TC-BR-101 | Admin shows Reissue for a Branch booking when Branch Auto Reissue is on | Atomic | P1 | Atomic, Positive, Smoke | Approved | Pending |
| TC-BR-102 | Admin hides Reissue for a Branch booking when Branch Auto Reissue is off | Atomic | P1 | Atomic, Negative, Smoke | Approved | Pending |
| TC-BR-103 | Reissue shows on a Branch booking whose credential is not selected | Atomic | P3 | Atomic, Business-Rule | Approved | Pending |
| TC-BR-104 | Agency Auto Reissue off does not hide Reissue on a Branch booking | Atomic | P2 | Atomic, Integration | Approved | Pending |
| TC-BR-105 | Reading the Branch drops a credential that became invalid | Atomic | P3 | Atomic, Assumption-based | Approved | Pending |
| TC-BR-106 | Updating a Branch without touching Auto Reissue still works | Atomic | P2 | Atomic, Regression, Smoke | Approved | Pending |
| TC-BR-107 | Create a Branch with Auto Reissue on | Scenario | P3 | Scenario, Positive | Approved | Pending |
| TC-BR-108 | Agency Portal does not list its Branch's own bookings | Atomic | P3 | Atomic, Permissions, Assumption-based | Approved | Pending |
| TC-BR-109 | A Branch can have a supplier its Agency doesn't have | Atomic | P2 | Atomic, Integration | Approved | Pending |
| TC-BR-110 | An inactive credential leaves the Branch's Auto Reissue picker | Scenario | P1 | Scenario, Negative, Integration | Approved | Pending |
| TC-BR-111 | What the Branch's Auto Reissue picker shows when the supplier is made inactive | Scenario | P2 | Scenario, Exploratory, Integration | Approved | Pending |
| TC-BR-112 | Admin hides Reissue for a Branch booking on hold | Atomic | P2 | Atomic, Negative | Approved | Pending |

**Tier breakdown:** 96 Atomic · 16 Scenario

**Lifecycle breakdown:** Review — 0 Pending · 104 Approved · 8 Rejected · Automation — 30 Pending · 31 Approved · 49 Rejected

## Test Cases

### TC-BR-001 — Create Branch with all mandatory Branch Details fields

**Objective:** Verify that a Branch can be created when every mandatory Branch Details field is completed.

**Preconditions:** User is logged in as Super Admin. Country POS master data exists for at least one Operating Country.

**Test Data:**

| Field | Value |
|---|---|
| Operating Country | Egypt |
| Name | QA_BRANCH_001 |
| Address 1 | 1 Test Street |
| Post Office Box | QA12345 |
| Phone Number | +20 1001234567 |

**Steps:**

1. Open Admin → Branch → Add branch.
2. Select the Operating Country.
3. Enter the Branch Name.
4. Select a State.
5. Select a City.
6. Enter Address 1.
7. Enter the Post Office Box.
8. Enter the Phone Number with country code.
9. Complete the remaining mandatory sections (Branch Email Configuration, Branch Contact Info, Branch Sales Configuration) with valid data.
10. Click **Submit for Approval**.

**Expected Result:** After clicking **Send For Approval**, the Branch is created successfully and the application shows the success message "Added Successfully." The new Branch is then **retrievable under the `Inactive` Status filter**, and **must not** appear under the `Active` Status filter at this stage.

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Corrected twice on 2026-08-10 by business instruction (both Stage 3 decisions):
1. **Success message.** The application's actual post-submit success message is "Added Successfully," not "Pending for approval." — the original expected value asserted a message this screen never shows. "Pending for approval" remains the correct, separate value of the Approval Status *column* in the results grid (TC-BR-053/054), which this correction does not touch.
2. **Persistence and placement (added).** The expected result now requires the created Branch to be **found under `Inactive`**, and explicitly not under `Active`, at this stage. This is a deliberate strengthening: the prior version asserted only submit-time signals (navigation or toast), which pass even when nothing retrievable was created — the precise reason the "record reports success but is not retrievable" condition went unnoticed by a green TC-BR-001. Verifying placement necessarily also verifies persistence, so this closes that gap rather than needing a separate case.

**Open verification note:** the automation's provisioning previously searched with Status `Both` and found nothing after a successful submit. Under this clarified rule the correct filter is `Inactive`. Whether `Both` failing to return a newly created Inactive record is itself an application defect has **not** been established — if a follow-up run shows `Inactive` returns the record while `Both` does not, that is a new finding about the `Both` filter, not a test problem, and must be raised rather than absorbed.

**Review:** Approved

**Automation:** Approved

---

### TC-BR-002 — Mandatory Branch Details fields block submission when empty

**Objective:** Verify that each mandatory Branch Details field blocks submission when left empty.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field Left Empty |
|---|
| Operating Country |
| Name |
| State |
| City |
| Address 1 |
| Post Office Box |
| Phone Number |

**Steps:**

1. Fill every Branch Details field with valid data except the one field under test.
2. Leave that one field empty.
3. Click **Submit for Approval**.
4. Repeat steps 1–3 for each field listed in Test Data.

**Expected Result:** For each field left empty, the system blocks submission and shows a required-field validation message for that field.

**Priority:** P1

**Tags:** Atomic, Negative-EmptyValues

**Review:** Approved

**Automation:** Approved

---

### TC-BR-003 — Branch Name rejects non-alphanumeric special characters

**Objective:** Verify that the Branch Name field only accepts alphanumeric input.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Name | `QA<script>Branch</script>` |

**Steps:**

1. Enter the Test Data value into the Name field.
2. Move focus away from the field.

**Expected Result:** The system rejects the special characters, either by blocking input or displaying a validation message indicating only alphanumeric characters are allowed.

**Priority:** P2

**Tags:** Atomic, Negative-SpecialCharacters

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-004 — Country field auto-fills based on selected Operating Country

**Objective:** Verify that the Country field auto-fills once an Operating Country is selected.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Operating Country | Egypt |

**Steps:**

1. Select the Operating Country.
2. Observe the Country field.

**Expected Result:** The Country field is automatically populated and remains read-only.

**Priority:** P2

**Tags:** Atomic, Positive

**Notes:** Discovery did not exercise this cascade against live master data this run (Open Question OQ-BR-1) — execution is the first live verification of this behavior.

**Review:** Approved

**Automation:** Approved

---

### TC-BR-005 — State dropdown populates based on selected Country

**Objective:** Verify that the State dropdown populates once the Country field is set.

**Preconditions:** User is logged in as Super Admin, has opened Admin → Branch → Add branch, and has selected an Operating Country.

**Steps:**

1. Observe the State dropdown after the Country auto-fills.
2. Click the State dropdown.

**Expected Result:** The State dropdown lists states belonging to the auto-filled Country.

**Priority:** P2

**Tags:** Atomic, Positive

**Notes:** Not independently verified in Discovery (Open Question OQ-BR-1).

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-006 — City dropdown populates based on selected State

**Objective:** Verify that the City dropdown populates once a State is selected.

**Preconditions:** User is logged in as Super Admin, has opened Admin → Branch → Add branch, and has selected an Operating Country and a State.

**Steps:**

1. Select a State.
2. Click the City dropdown.

**Expected Result:** The City dropdown lists cities belonging to the selected State.

**Priority:** P2

**Tags:** Atomic, Positive

**Notes:** Not independently verified in Discovery (Open Question OQ-BR-1).

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-007 — Post Office Box accepts an alphanumeric value up to 8 characters

**Objective:** Verify that Post Office Box accepts a valid alphanumeric value at its maximum allowed length.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Post Office Box | QA123456 (8 characters) |

**Steps:**

1. Enter the Test Data value into Post Office Box.
2. Move focus away from the field.

**Expected Result:** The 8-character value is accepted with no validation error.

**Priority:** P2

**Tags:** Atomic, Positive, Boundary

**Review:** Rejected

**Automation:** Rejected

---

### TC-BR-008 — Post Office Box rejects a value exceeding 8 characters

**Objective:** Verify that Post Office Box rejects input longer than 8 characters.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Post Office Box | QA1234567 (9 characters) |

**Steps:**

1. Enter the Test Data value into Post Office Box.
2. Move focus away from the field.

**Expected Result:** The system truncates the input to 8 characters, or blocks the 9th character from being entered, or displays a validation message that the maximum length is 8 characters.

**Priority:** P1

**Tags:** Atomic, Negative-BoundaryValues, Regression

**Notes:** Regression test for FINDING-002 — as of Discovery 2026-08-03, a 12-character value was fully accepted with no truncation or error. This case must fail against that observed behavior and pass only once the max-length rule is enforced.

**Review:** Rejected

**Automation:** Rejected

---

### TC-BR-009 — Phone Number requires a country code and a numeric value

**Objective:** Verify that Phone Number is entered as a country code selection plus a numeric value.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Country Code | +20 |
| Phone Number | 1001234567 |

**Steps:**

1. Select the country code from the dropdown.
2. Enter the numeric phone value.

**Expected Result:** Both the selected country code and the entered number are retained together as the Phone Number value.

**Priority:** P2

**Tags:** Atomic, Positive

**Review:** Rejected

**Automation:** Rejected

---

### TC-BR-010 — Phone Number rejects non-numeric characters

**Objective:** Verify that the Phone Number field rejects non-numeric input.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Phone Number | ABC1234567 |

**Steps:**

1. Enter the Test Data value into the Phone Number field.
2. Move focus away from the field.

**Expected Result:** The system rejects the non-numeric input, either by blocking entry or displaying a validation message.

**Priority:** P2

**Tags:** Atomic, Negative-InvalidInputs

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-011 — Service Tax Number and ABTA Number accept optional uppercase alphanumeric values

**Objective:** Verify that Service Tax Number and ABTA Number accept alphanumeric values and are not required for submission.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Service Tax Number | STN12345 |
| ABTA Number | ABTA6789 |

**Steps:**

1. Enter the Test Data values into Service Tax Number and ABTA Number.
2. Complete every other mandatory field with valid data.
3. Click **Submit for Approval**.

**Expected Result:** The Branch is submitted successfully with the entered Service Tax Number and ABTA Number values retained.

**Priority:** P3

**Tags:** Atomic, Positive

**Review:** Rejected

**Automation:** Rejected

---

### TC-BR-012 — Create Branch with valid Branch Email Configuration

**Objective:** Verify that a Branch Email ID and Email Password can be entered successfully.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Branch Email ID | qa.branch001@example.com |
| Email Password | Passw0rd!2026 |

**Steps:**

1. Enter the Branch Email ID.
2. Enter the Email Password.

**Expected Result:** Both values are accepted with no validation error.

**Priority:** P1

**Tags:** Atomic, Positive

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-013 — Mandatory Branch Email Configuration fields block submission when empty

**Objective:** Verify that Branch Email ID and Email Password block submission when left empty.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field Left Empty |
|---|
| Branch Email ID |
| Email Password |

**Steps:**

1. Fill every other mandatory field with valid data.
2. Leave the field under test empty.
3. Click **Submit for Approval**.
4. Repeat steps 1–3 for each field listed in Test Data.

**Expected Result:** For each field left empty, the system blocks submission and shows a required-field validation message for that field.

**Priority:** P1

**Tags:** Atomic, Negative-EmptyValues

**Review:** Approved

**Automation:** Approved

---

### TC-BR-014 — Email Password accepts a value up to 15 characters

**Objective:** Verify that Email Password accepts a value at its maximum allowed length.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Email Password | Aa1!Aa1!Aa1!Aa1 (15 characters) |

**Steps:**

1. Enter the Test Data value into Email Password.
2. Move focus away from the field.

**Expected Result:** The 15-character value is accepted with no validation error.

**Priority:** P2

**Tags:** Atomic, Positive, Boundary

**Notes:** Not independently verified in Discovery — Email Password boundary behavior was not captured this run.

**Review:** Rejected

**Automation:** Rejected

---

### TC-BR-015 — Email Password rejects a value exceeding 15 characters

**Objective:** Verify that Email Password rejects a value longer than 15 characters.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Email Password | Aa1!Aa1!Aa1!Aa1! (16 characters) |

**Steps:**

1. Enter the Test Data value into Email Password.
2. Move focus away from the field.

**Expected Result:** The system truncates the input to 15 characters, blocks the 16th character, or displays a validation message that the maximum length is 15 characters.

**Priority:** P2

**Tags:** Atomic, Negative-BoundaryValues

**Notes:** Not independently verified in Discovery — Email Password boundary behavior was not captured this run.

**Review:** Rejected

**Automation:** Rejected

---

### TC-BR-016 — Add Branch Contact Person with valid Name, Email, and Phone

**Objective:** Verify that a Branch Contact Person can be added with valid Name, Email ID, and Phone Number.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Name | Ahmed Ayman |
| Email ID | contact.qa@example.com |
| Phone Number | +20 1001234567 |

**Steps:**

1. Enter the Contact Name.
2. Enter the Contact Email ID.
3. Enter the Contact Phone Number.
4. Click **Add**.

**Expected Result:** The contact person is added and appears in the Branch Contact Info list.

**Priority:** P1

**Tags:** Atomic, Positive

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-017 — Mandatory Branch Contact Info fields block submission when empty

**Objective:** Verify that Contact Name, Email ID, and Phone Number block submission when left empty.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field Left Empty |
|---|
| Name |
| Email ID |
| Phone Number |

**Steps:**

1. Fill every other mandatory field with valid data.
2. Leave the Branch Contact Info field under test empty.
3. Click **Submit for Approval**.
4. Repeat steps 1–3 for each field listed in Test Data.

**Expected Result:** For each field left empty, the system blocks submission and shows a required-field validation message for that field.

**Priority:** P1

**Tags:** Atomic, Negative-EmptyValues

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-018 — Contact Name rejects characters other than letters, spaces, and a single dot

**Objective:** Verify that Contact Name only accepts alphabets, spaces, and a single dot.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Name | Ahmed123!@# |

**Steps:**

1. Enter the Test Data value into the Contact Name field.
2. Move focus away from the field.

**Expected Result:** The system rejects the numeric and special-character input, either by blocking it or displaying a validation message.

**Priority:** P2

**Tags:** Atomic, Negative-SpecialCharacters

**Review:** Rejected

**Automation:** Rejected

---

### TC-BR-019 — Add multiple Contact Persons using the Add button

**Objective:** Verify that more than one Contact Person can be added to a Branch.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Contact | Name | Email ID | Phone Number |
|---|---|---|---|
| 1 | Ahmed Ayman | contact1.qa@example.com | +20 1001234567 |
| 2 | Sara Ali | contact2.qa@example.com | +20 1007654321 |

**Steps:**

1. Enter Contact 1's details and click **Add**.
2. Enter Contact 2's details and click **Add**.

**Expected Result:** Both contact persons appear in the Branch Contact Info list.

**Priority:** P3

**Tags:** Scenario, Positive

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-020 — Add Target requires Target Amount, Month, and Year before enabling Add Target

**Objective:** Verify that Add Target only becomes usable once Target Amount, Month, and Year are all entered.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Target Amount | 5000 |
| Set Month | January |
| Set Year | 2026 |

**Steps:**

1. Enter the Target Amount only.
2. Attempt to click **Add Target**.
3. Select the Month and Year.
4. Click **Add Target**.

**Expected Result:** Step 2 does not add a target while a field is missing; step 4 adds the target once all three fields are populated.

**Priority:** P3

**Tags:** Atomic, Positive

**Review:** Rejected

**Automation:** Rejected

---

### TC-BR-021 — Mandatory Branch Sales Configuration fields block submission when empty

**Objective:** Verify that Credit Limit, Top-Up Limit, and Credit Terms (Days) block submission when left empty.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field Left Empty |
|---|
| Credit Limit |
| Top Up Limit |
| Credit Terms(Days) |

**Steps:**

1. Fill every other mandatory field with valid data.
2. Leave the field under test empty.
3. Click **Submit for Approval**.
4. Repeat steps 1–3 for each field listed in Test Data.

**Expected Result:** For each field left empty, the system blocks submission and shows a required-field validation message for that field.

**Priority:** P1

**Tags:** Atomic, Negative-EmptyValues

**Review:** Approved

**Automation:** Approved

---

### TC-BR-022 — Credit Limit rejects non-numeric input

**Objective:** Verify that Credit Limit only accepts numeric input.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Credit Limit | abc123xyz |

**Steps:**

1. Enter the Test Data value into Credit Limit.
2. Move focus away from the field.

**Expected Result:** The system displays a validation message indicating that only a numeric value is accepted.

**Priority:** P2

**Tags:** Atomic, Negative-InvalidInputs

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-023 — Credit Limit rejects a value exceeding 15 characters

**Objective:** Verify that Credit Limit rejects a numeric value longer than 15 characters.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Credit Limit | 1234567890123456 (16 digits) |

**Steps:**

1. Enter the Test Data value into Credit Limit.
2. Move focus away from the field.

**Expected Result:** The system truncates the input to 15 characters, blocks the 16th digit, or displays a validation message that the maximum length is 15 characters.

**Priority:** P1

**Tags:** Atomic, Negative-BoundaryValues, Regression

**Notes:** Regression test for FINDING-003 — as of Discovery 2026-08-03, a 16-digit value was fully accepted with no truncation or error. This case must fail against that observed behavior and pass only once the max-length rule is enforced.

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-024 — Reaching Percentage rejects a value greater than 100%

**Objective:** Verify that Reaching Percentage rejects a value above 100%.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Reaching Percentage | 150.123 |

**Steps:**

1. Enter the Test Data value into Reaching Percentage.
2. Move focus away from the field.

**Expected Result:** The system displays a validation message stating Reaching Percentage should not be greater than 100%.

**Priority:** P2

**Tags:** Atomic, Negative-BoundaryValues

**Notes:** This rule was already confirmed enforced during Discovery 2026-08-03 (Confirmed Behaviour) — this case formalizes it as a repeatable regression check.

**Review:** Approved

**Automation:** Approved

---

### TC-BR-025 — Reaching Percentage accepts a value with up to 3 decimal places

**Objective:** Verify that Reaching Percentage accepts a value with exactly 3 decimal places.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Reaching Percentage | 99.123 |

**Steps:**

1. Enter the Test Data value into Reaching Percentage.
2. Move focus away from the field.

**Expected Result:** The value is accepted with no validation error.

**Priority:** P3

**Tags:** Atomic, Positive, Boundary

**Notes:** Not independently verified in Discovery — Discovery's blur probe on this field used a >100% value, which surfaced the percentage-cap message but did not isolate the 3-decimal-place rule specifically.

**Review:** Approved

**Automation:** Approved

---

### TC-BR-026 — Warning Prompt (Days) rejects a value exceeding 11 digits

> **Status: retained as a manual case; REMOVED from automation scope (2026-08-10).** Superseding the same day's `Blocked — Needs Clarification` marking: the module owner dropped FINDING-004 and instructed that this case be taken out of the automation test cases. Its `tcBr026_…` method is deleted from `CreateBranch_Admin_TC`. **The case itself and its business intent below are retained unchanged** — removing it from automation is a scope decision, not a decision to discard or rewrite the case. The conflict recorded in Blocking Reason below still stands unresolved (FINDING-016, closed as dropped rather than fixed), which is why the case is not simply marked ready to run manually either.

**Objective:** Verify that Warning Prompt (Days) rejects a value longer than 11 digits, isolated from the separate cross-field rule verified by TC-BR-027.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Credit Terms(Days) | 999999999999999 (15 digits) |
| Warning Prompt(Days) | 999999999999999 (15 digits) |

**Steps:**

1. Enter the Credit Terms (Days) Test Data value first, so the cross-field rule ("Warning prompt days should not be greater than credit terms days") cannot itself be the source of any resulting message.
2. Enter the Warning Prompt (Days) Test Data value.
3. Move focus away from the field.

**Expected Result:** The system truncates the input to 11 digits, blocks the 12th digit, or displays a validation message that the maximum length is 11 digits. (If the application instead only ever shows the cross-field message from TC-BR-027 and never a length-specific one, that is itself evidence for FINDING-004 and must be recorded, not assumed away.)

**Priority:** P1

**Tags:** Atomic, Negative-BoundaryValues, Regression, Blocked-NeedsClarification

**Blocking Reason (2026-08-10):** This case's own Test Data is no longer valid business data. It sets Credit Terms(Days) to 15 digits specifically so the cross-field rule is satisfied and cannot mask the length check — but Credit Terms(Days) was confirmed on 2026-08-10 to have a **7-digit maximum**, so a 15-digit value is not legal input. And no legal substitute exists: reaching Warning Prompt's 11-digit boundary needs 12+ digits, which necessarily exceeds the largest legal Credit Terms value (9999999), and Credit Terms is Mandatory so it cannot be left blank to avoid the comparison. **The two documented rules cannot both be satisfied by any valid business data** — see FINDING-016 (`Needs Human Review`). Do not execute, do not automate, and do not substitute a value that makes the case runnable at the cost of its stated intent: the isolation from TC-BR-027's cross-field rule *is* the objective, not an implementation detail of it. **Required to unblock:** a business decision on whether Warning Prompt (Days)'s 11-digit maximum remains a real requirement given Credit Terms' 7-digit cap, and if so, how it is intended to be reachable.

**Notes:** Module-owner-supplied evidence (2026-08-03) confirmed the live application also enforces a separate cross-field rule — "Warning prompt days should not be greater than credit terms days" (see TC-BR-027) — that fires whenever Warning Prompt (Days) > Credit Terms (Days). The original version of this test case entered only Warning Prompt(Days) with Credit Terms(Days) left blank, which the module owner flagged as incorrect: with Credit Terms unset, any resulting message could be the cross-field rule rather than a length-specific one, so the test did not actually isolate FINDING-004's length-cap defect. Test Data therefore sets Credit Terms(Days) to the same value as Warning Prompt(Days) so the cross-field rule is satisfied (not violated) and cannot mask the length check — the intent that the 7-digit Credit Terms cap has now made unsatisfiable. Regression test for FINDING-004 — as of Discovery 2026-08-03, a 14-digit value was fully accepted with no truncation or error; this case must fail against that observed behavior and pass only once the max-length rule is enforced.

**Review:** Approved

**Automation:** Blocked — Needs Clarification (was Approved; suspended 2026-08-10, not rejected on merit)

---

### TC-BR-027 — Warning Prompt (Days) rejects a value greater than Credit Terms (Days)

**Objective:** Verify that Warning Prompt (Days) is rejected when it is greater than Credit Terms (Days).

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Credit Terms(Days) | 10000 |
| Warning Prompt(Days) | 151515 |

**Steps:**

1. Enter the Credit Terms (Days) value.
2. Enter a Warning Prompt (Days) value that is greater than Credit Terms (Days).
3. Move focus away from the field.

**Expected Result:** The system displays the validation message "Warning prompt days should not be greater than credit terms days".

**Priority:** P2

**Tags:** Atomic, Negative-InvalidInputs

**Notes:** Confirmed via module-owner-supplied screenshot (2026-08-03) showing the exact live behavior and message text with these Test Data values — this closes Discovery's OQ-BR-2 and resolves RISK-BR-2 in full (ProjectContext.md §6). No longer assumption-based; Evidence Category is Human Observation (module-owner-provided, not independently reproduced by Explorer this run). The rule is strictly-greater-than — equal values (e.g. both 10000) are not expected to be rejected; that boundary is not separately re-verified here and remains an assumption if a future case needs it. **Added 2026-08-10 (user instruction):** Credit Terms (Days) additionally has its own **7-digit maximum length**, a constraint not stated in PRD_UserStories.md (which documents Credit Terms only as "numeric input only, Mandatory"). That cap interacts with TC-BR-026's 11-digit Warning Prompt case in a way that makes isolation impossible — see FINDING-016 and TC-BR-026 Notes.

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-028 — Select at least one Payment Option

**Objective:** Verify that a Payment Option can be selected and retained on the Create Branch form.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Payment Option | Cash |

**Steps:**

1. Select the Cash checkbox in Payment Option.
2. Complete every other mandatory field with valid data.
3. Click **Submit for Approval**.

**Expected Result:** The Branch is submitted successfully with Cash retained as the selected Payment Option.

**Priority:** P3

**Tags:** Atomic, Positive

**Notes:** This case intentionally does not assert on the full contents of the Payment Option list. The list reflects the Payment Gateway module's Active records live (confirmed 2026-08-03, FINDING-001, documented exception) — that is not a Branch-side rule this suite tests. The AC's conditional Payment Gateway dropdown on Credit Card selection is also not tested here — confirmed absent and dispositioned as an Outdated Requirement (FINDING-007, documented exception).

**Review:** Approved

**Automation:** Approved

---

### TC-BR-029 — Product Access grid displays the required columns

**Objective:** Verify that the Product Access grid displays Status, Supplier Name, Credential Name, Product Name, and Description columns.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Steps:**

1. Scroll to the Product Access Details grid.
2. Observe the column headers.

**Expected Result:** The grid displays exactly the columns Status, Supplier Name, Credential Name, Product Name, and Description.

**Priority:** P2

**Tags:** Atomic, Positive

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-030 — Description field is enabled only when a Supplier row is selected

**Objective:** Verify that the Description field in the Product Access grid is disabled until its Supplier row is selected.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Steps:**

1. Observe the Description field for a Supplier row that is not selected.
2. Select the Status checkbox for that Supplier row.
3. Observe the Description field again.

**Expected Result:** The Description field is disabled in step 1 and becomes enabled after the Supplier row is selected in step 2.

**Priority:** P2

**Tags:** Atomic, Positive

**Review:** Approved

**Automation:** Approved

---

### TC-BR-031 — Description field is mandatory once a Supplier row is selected

**Objective:** Verify that Description blocks submission when its Supplier row is selected but Description is left empty.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Steps:**

1. Select the Status checkbox for a Supplier row.
2. Leave that row's Description field empty.
3. Complete every other mandatory field with valid data.
4. Click **Submit for Approval**.

**Expected Result:** The system blocks submission and shows a required-field validation message for Description.

**Priority:** P2

**Tags:** Atomic, Negative-EmptyValues

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-032 — Selecting a GDS-type Supplier reveals the Supplier Credentials sub-grid

**Objective:** Verify that selecting a GDS-type Supplier row displays the Supplier Credentials sub-grid.

**Preconditions:** User is logged in as Super Admin, has opened Admin → Branch → Add branch, and at least one GDS-type Supplier row exists in the Product Access grid.

**Steps:**

1. Select the Status checkbox for a GDS-type Supplier row.
2. Observe the area beneath the Product Access grid.

**Expected Result:** A sub-grid appears with Generic Supplier Credentials (PCC) (multi-select), Manager Name, and Supplier Credentials Description.

**Priority:** P2

**Tags:** Atomic, Positive

**Notes:** Not independently verified in Discovery — this area was recorded as Blocked in Coverage_Summary.md §5 because no supplier row was checked during that pass. This is the first live verification.

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-033 — Search Supplier Credentials PCC and Ticketing Supplier Credential PCC are not present on the UI

**Objective:** Verify that Search Supplier Credentials PCC and Ticketing Supplier Credential PCC controls do not appear anywhere on the Create Branch screen.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Steps:**

1. Select a GDS-type Supplier row to reveal its sub-grid.
2. Search the page for "Search Supplier Credentials PCC" and "Ticketing Supplier Credential PCC."

**Expected Result:** Neither control is present anywhere on the page.

**Priority:** P3

**Tags:** Atomic, Positive

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-034 — Submit for Approval saves the Branch and submits it for review

**Objective:** Verify that submitting a fully completed Create Branch form saves the record and sends it for approval.

**Preconditions:** User is logged in as Super Admin and has completed every mandatory field on the Create Branch form with valid data.

**Steps:**

1. Click the primary submit action button.

**Expected Result:** The Branch is saved and its status shows "Pending for approval."

**Priority:** P1

**Tags:** Scenario, Positive

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-035 — Submit action button displays the label "Submit for Approval"

**Objective:** Verify that the primary submit action button on Create Branch reads "Submit for Approval."

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Steps:**

1. Scroll to the bottom of the Create Branch form.
2. Read the primary action button's label.

**Expected Result:** The button reads exactly "Submit for Approval."

**Priority:** P4

**Tags:** Atomic, Negative-UILabel, Regression

**Notes:** Regression test for FINDING-011 — as of Discovery 2026-08-03, the button read "Send For Approval." This case must fail against that observed label and pass only once the label is corrected.

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-036 — Cancel exits the Create Branch form without saving

**Objective:** Verify that clicking Cancel exits Create Branch without saving any entered data.

**Preconditions:** User is logged in as Super Admin and has entered data into at least one field on the Create Branch form.

**Steps:**

1. Click **Cancel**.
2. Navigate back to Admin → Branch.
3. Search for the Branch Name entered in step 1.

**Expected Result:** The Branch is not found — no record was saved.

**Priority:** P2

**Tags:** Atomic, Positive

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-037 — Create Branch with a valid Child Agencies Threshold Amount value

**Objective:** Verify that a Branch can be created with a valid Child Agencies Threshold Amount value.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Outstanding Threshold | 10 |

**Steps:**

1. Enter the Test Data value into the Outstanding Threshold field.
2. Complete every other mandatory field with valid data.
3. Click **Submit for Approval**.

**Expected Result:** The Branch is submitted successfully with the entered Outstanding Threshold value retained.

**Priority:** P2

**Tags:** Atomic, Positive, ExpectedImplementation

**Notes:** The live field labeled "Outstanding Threshold" is confirmed to be the same feature as US 51489 §2's "Child Agencies Threshold Amount" (module-owner confirmation, 2026-08-03, FINDING-010). This case traces to US 51489, not US 8605, which does not mention this field.

**Review:** Approved

**Automation:** Approved

---

### TC-BR-038 — Child Agencies Threshold Amount opens pre-filled with a default value

**Objective:** Verify that the Outstanding Threshold field already carries a value when the Add Branch form first opens.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Steps:**

1. Open Admin → Branch → Add branch.
2. Read the Outstanding Threshold field's value without typing anything into it.

**Expected Result:** The Outstanding Threshold field is not empty — it holds a system-supplied default value.

**Priority:** P3

**Tags:** Atomic, Positive, ExpectedImplementation

**Notes:** Revised 2026-08-15 by the module owner. This case previously read "blocks submission when empty." That scenario is not reachable: the application pre-fills Outstanding Threshold with a default value as soon as Add Branch opens, so the field is never presented empty and the empty-value case could not be exercised as written. The empty-value scenario is dropped rather than rewritten to clear the field first. The expected value is stated as "not empty" and not as one specific number, because no requirement states what the default should be — see CoverageReport.md §8.

**Review:** Approved

**Automation:** Approved

---

### TC-BR-039 — Child Agencies Threshold Amount accepts a numeric value

**Objective:** Verify that the Outstanding Threshold field accepts a numeric value.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Outstanding Threshold | 25 |

**Steps:**

1. Enter the Test Data value into the Outstanding Threshold field.
2. Move focus away from the field.

**Expected Result:** The value is accepted with no validation error.

**Priority:** P3

**Tags:** Atomic, Positive, ExpectedImplementation

**Notes:** US 51489 §2 does not specify format constraints (length, decimals) for this field beyond it being a threshold amount — no boundary/negative case is designed here to avoid inventing a rule the requirement doesn't state (see CoverageReport.md §8 for the corresponding Coverage Gap).

**Review:** Approved

**Automation:** Approved

---

### TC-BR-040 — Search Branch by Branch Code returns the matching record

**Objective:** Verify that searching by a known Branch Code returns that branch.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Test Data:**

| Field | Value |
|---|---|
| Branch Code | BRN2 |

**Steps:**

1. Enter the Test Data value in the **Branch code** field.
2. Click **Search**.

**Expected Result:** The grid returns the branch whose Code is `BRN2`.

**Priority:** P1

**Tags:** Atomic, Positive, Smoke

**Review:** Approved

**Automation:** Approved

---

### TC-BR-041 — Search Branch by Branch Name returns the matching record

**Objective:** Verify that searching by Branch Name returns branches whose name matches.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Test Data:**

| Field | Value |
|---|---|
| Branch Name | Emirates NDC |

**Steps:**

1. Enter the Test Data value in the **Branch name** field.
2. Click **Search**.

**Expected Result:** The grid returns the branch named `Emirates NDC`.

**Priority:** P1

**Tags:** Atomic, Positive, Smoke

**Review:** Approved

**Automation:** Approved

---

### TC-BR-042 — Search with no criteria returns the default Active result set

**Objective:** Verify that searching without entering any criteria returns all Active branches.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Steps:**

1. Leave every filter at its default.
2. Click **Search**.

**Expected Result:** The grid returns results and the count text states the total number of Active branches. No validation error is shown.

**Priority:** P2

**Tags:** Atomic, Positive

**Review:** Approved

**Automation:** Approved

---

### TC-BR-043 — Search with non-matching criteria shows the empty-state message

**Objective:** Verify that a search returning no records displays the platform's empty-state message rather than a blank grid.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Test Data:**

| Field | Value |
|---|---|
| Branch Code | ZZZZQQ9 |

**Steps:**

1. Enter the Test Data value in the **Branch code** field.
2. Click **Search**.

**Expected Result:** The message `No data has been found!` is displayed and the grid shows no rows.

**Priority:** P1

**Tags:** Atomic, Negative-InvalidInputs, Regression

**Review:** Approved

**Automation:** Approved

---

### TC-BR-044 — Status filter defaults to Active on page load

**Objective:** Verify that the Status radio group has Active pre-selected when the screen loads.

**Preconditions:** User is logged in as Super Admin.

**Steps:**

1. Open Admin → Branch.
2. Read the Status radio group without changing it.

**Expected Result:** **Active** is selected. **Inactive** and **Both** are not selected.

**Priority:** P1

**Tags:** Atomic, Positive, BusinessRule

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-045 — Status filter returns only records matching the selected status

**Objective:** Verify that each Status option returns only branches in that state, and that Both returns the union.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Test Data:**

| Status selected |
|---|
| Active |
| Inactive |
| Both |

**Steps:**

1. Select the Status option under test.
2. Click **Search**.
3. Record the total from the result count text.
4. Repeat steps 1–3 for each option in Test Data.

**Expected Result:** Each search returns a result set, and the Both total equals the Active total plus the Inactive total.

**Priority:** P1

**Tags:** Atomic, Positive, BusinessRule, Regression

**Notes:** Discovery observed 491 Active + 125 Inactive = 616 Both. Compare the totals to each other rather than to those fixed numbers — the environment is shared and counts change.

**Review:** Approved

**Automation:** Approved

---

### TC-BR-046 — State filter stays disabled until a Country is selected

**Objective:** Verify that the State filter becomes usable only after a Country is chosen.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Steps:**

1. Observe the **State** filter before selecting a Country.
2. Select **Egypt** in the **Country** filter.
3. Observe the **State** filter again.

**Expected Result:** State is disabled at step 1 and enabled at step 3, listing states belonging to Egypt.

**Priority:** P2

**Tags:** Atomic, Positive, BusinessRule

**Review:** Approved

**Automation:** Approved

---

### TC-BR-047 — City filter stays disabled until a State is selected

**Objective:** Verify that the City filter becomes usable only after a State is chosen.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch, with Country set to Egypt.

**Steps:**

1. Observe the **City** filter before selecting a State.
2. Select any State.
3. Observe the **City** filter again.

**Expected Result:** City is disabled at step 1 and enabled at step 3, listing cities belonging to the selected State.

**Priority:** P2

**Tags:** Atomic, Positive, BusinessRule

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-048 — Branch Code filter accepts alphanumeric input

**Objective:** Verify that the Branch Code filter accepts letters and digits.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Test Data:**

| Field | Value |
|---|---|
| Branch Code | BRN262 |

**Steps:**

1. Enter the Test Data value in the **Branch code** field.
2. Click **Search**.

**Expected Result:** The value is accepted with no validation error and the search executes.

**Priority:** P3

**Tags:** Atomic, Positive

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-049 — Branch Name filter accepts alphabetic and special characters

**Objective:** Verify that the Branch Name filter accepts letters and special characters as the acceptance criteria state.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Test Data:**

| Field | Value |
|---|---|
| Branch Name | Test-Branch & Co. |

**Steps:**

1. Enter the Test Data value in the **Branch name** field.
2. Click **Search**.

**Expected Result:** The value is accepted with no validation error and the search executes.

**Priority:** P3

**Tags:** Atomic, Positive

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-050 — Branch Name filter handles Unicode input without error

**Objective:** Verify that non-ASCII input in the Branch Name filter is handled without an unhandled error.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Test Data:**

| Field | Value |
|---|---|
| Branch Name | القاهرة 東京 🏢 |

**Steps:**

1. Enter the Test Data value in the **Branch name** field.
2. Click **Search**.

**Expected Result:** The search completes. Either matching records or `No data has been found!` is displayed. No unhandled error, blank page, or server error appears.

**Priority:** P3

**Tags:** Atomic, Negative-Unicode

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-051 — Search filters handle security-payload-shaped input safely

**Objective:** Verify that payload-shaped strings in the search filters are treated as literal text.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Test Data:**

| Field | Value |
|---|---|
| Branch Name | `<script>alert(1)</script>` |
| Branch Code | `' OR '1'='1` |

**Steps:**

1. Enter the Branch Name value and click **Search**.
2. Clear the field, enter the Branch Code value and click **Search**.

**Expected Result:** Each search completes and returns either matching records or `No data has been found!`. No script executes, no database error is exposed, and no unfiltered result set is returned.

**Priority:** P2

**Tags:** Atomic, Negative-SecurityInputs

**Notes:** Input-handling probe only — observe the response, never attempt to exploit.

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-052 — Results grid displays all specified columns

**Objective:** Verify that the results grid shows every column the acceptance criteria require.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Steps:**

1. Click **Search**.
2. Read the grid's header row.

**Expected Result:** The grid displays Branch Code, Branch Name, Country Name, **State**, City, Approval Status, and Actions columns.

**Priority:** P1

**Tags:** Atomic, Regression

**Notes:** This asserts the corrected behaviour. Discovery confirmed the State column is currently absent (FINDING-012) — this case is expected to fail until that is fixed or the requirement is formally changed.

**Review:** Approved

**Automation:** Approved

---

### TC-BR-053 — Approval Status column reflects each record's approval state

**Objective:** Verify that the Approval Status column shows the record's current approval state.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Steps:**

1. Select Status **Both**.
2. Click **Search**.
3. Read the Approval Status value on each row.

**Expected Result:** Every row shows one of `Approved`, `Pending for approval`, or `Rejected`. No row shows a blank Approval Status.

**Priority:** P2

**Tags:** Atomic, Positive

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-054 — Row action icons match the selected Status filter

**Objective:** Verify that the row action icons offered in the results grid depend on the selected Status filter (Active / Inactive / Both), not on each record's individual Approval Status.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Test Data:**

| Status filter selected | Expected icons (every row) |
|---|---|
| Active | edit pen, thumbs-down |
| Inactive | edit pen, thumbs-up, thumbs-down |
| Both | edit pen, thumbs-up, thumbs-down |

**Steps:**

1. Select Status **Active**, click **Search**, and read the icons in the Actions column for several rows.
2. Select Status **Inactive**, click **Search**, and read the icons in the Actions column for several rows.
3. Select Status **Both**, click **Search**, and read the icons in the Actions column for several rows.

**Expected Result:** Every row's icon set matches the Test Data for the Status filter that produced it, regardless of that row's own Approval Status column value.

**Priority:** P2

**Tags:** Atomic, Positive, BusinessRule

**Notes:** Corrected 2026-08-10 by user instruction — the prior revision of this case tied icons to each row's Approval Status (Approved/Pending/Rejected) rather than to the Status filter selection. That version and its rationale are superseded; the rule verified here is filter-driven, uniform across all rows in a given result set.

**Review:** Approved

**Automation:** Approved

---

### TC-BR-055 — Edit pen opens Update Branch with the record's details pre-filled

**Objective:** Verify that the edit pen navigates to Update Branch showing the selected branch's stored values.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch, with results displayed.

**Steps:**

1. Note the Code, Branch Name, Country Name and City shown on a chosen row.
2. Click that row's edit pen icon.
3. Wait until the Branch Name field shows a value.
4. Compare the form's Name, Country, State and City against the values noted in step 1.

**Expected Result:** The Update Branch screen opens for the selected branch, and its Name, Country, State and City match the values shown in the grid row.

**Priority:** P1

**Tags:** Scenario, Positive, Smoke

**Notes:** Step 3 matters — wait for a field to actually populate before comparing. Reading the form on a fixed delay produced a false "form is empty" result twice during Discovery.

**Review:** Approved

**Automation:** Approved

---

### TC-BR-056 — Approve a Pending branch from the results grid

**Objective:** Verify that the thumbs-up action approves a branch awaiting approval.

**Preconditions:** User is logged in as Super Admin. A branch created by this run exists with Approval Status `Pending for approval`, and its Branch Code has been recorded.

**Test Data:**

| Field | Value |
|---|---|
| Branch Code | the code of the branch this run created |

**Steps:**

1. Search for the recorded Branch Code.
2. Confirm the row's Approval Status reads `Pending for approval`.
3. Click that row's thumbs-up icon.
4. Complete any prompt that appears.
5. Search for the same Branch Code again.

**Expected Result:** The branch's Approval Status changes to `Approved`, and its row now offers the edit pen and thumbs-down only.

**Priority:** P1

**Tags:** Scenario, Positive, SelfCreatedRecord

**Notes:** Act only on a branch this run created. Record its Branch Code before acting — acting on a pre-existing branch is not authorised for this run.

**Review:** Approved

**Automation:** Approved

---

### TC-BR-057 — Reject a Pending branch from the results grid

**Objective:** Verify that the thumbs-down action rejects a branch awaiting approval.

**Preconditions:** User is logged in as Super Admin. A second branch created by this run exists with Approval Status `Pending for approval`, and its Branch Code has been recorded.

**Test Data:**

| Field | Value |
|---|---|
| Branch Code | the code of a second branch this run created |

**Steps:**

1. Search for the recorded Branch Code.
2. Confirm the row's Approval Status reads `Pending for approval`.
3. Click that row's thumbs-down icon.
4. Complete any prompt that appears.
5. Search for the same Branch Code again.

**Expected Result:** The branch's Approval Status changes to `Rejected`, and its row now offers the edit pen and thumbs-up only.

**Priority:** P1

**Tags:** Scenario, Positive, SelfCreatedRecord

**Notes:** Use a different self-created branch from TC-BR-056 so each case starts from a Pending record.

**Review:** Approved

**Automation:** Approved

---

### TC-BR-058 — Approve and Reject capture a Remarks entry

**Objective:** Verify that approving or rejecting a branch records a free-text Remarks reason.

**Preconditions:** User is logged in as Super Admin. A branch created by this run exists with Approval Status `Pending for approval`.

**Test Data:**

| Field | Value |
|---|---|
| Remarks | Approved by QA run-003 |

**Steps:**

1. Search for the self-created branch.
2. Click the thumbs-up icon.
3. Observe whether a Remarks entry is requested.
4. If it is, enter the Test Data value and confirm.

**Expected Result:** A Remarks entry is requested before the approval completes, the entered text is accepted, and the approval succeeds.

**Priority:** P2

**Tags:** Atomic, Positive, SelfCreatedRecord

**Notes:** Discovery could not establish whether the grid-level action prompts for Remarks — the Update screen has a mandatory Remarks field, but the grid path was never exercised. If no prompt appears, record that as the observed result rather than a pass.

**Review:** Approved

**Automation:** Approved

---

### TC-BR-059 — Same account attempts to approve the branch it created

**Objective:** Verify whether the account that created a branch is permitted to approve it.

**Preconditions:** User is logged in as Super Admin and has just created a branch with this same account, leaving it `Pending for approval`. Its Branch Code has been recorded.

**Steps:**

1. Search for the branch this account just created.
2. Click that row's thumbs-up icon.
3. Observe the outcome.
4. Search for the branch again and read its Approval Status.

**Expected Result:** Record which of the following occurs: the approval succeeds and the status becomes `Approved`, or the action is blocked with a message. Capture the exact message if one appears.

**Priority:** P1

**Tags:** Atomic, Security, SelfCreatedRecord, AssumptionBased

**Notes:** Assumption-based — the requirement that a maker cannot approve their own change is inferred, not asserted, in the source material. Either outcome is a valid result. Because this run has only one account, a blocked result must be reported as "appears blocked" — there is no second account to prove that approval by a different user would have succeeded.

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-060 — Navigate to the next page of results

**Objective:** Verify that the next-page control advances through the result set.

**Preconditions:** User is logged in as Super Admin, with a search returning more rows than one page.

**Steps:**

1. Note the Branch Codes shown on page 1.
2. Click the next-page control.
3. Read the Branch Codes now shown.

**Expected Result:** A different set of records is displayed, and none of the page 1 codes reappear.

**Priority:** P2

**Tags:** Atomic, Positive

**Review:** Approved

**Automation:** Approved

---

### TC-BR-061 — Navigate to the last page of results

**Objective:** Verify that the last-page control jumps to the final page of results.

**Preconditions:** User is logged in as Super Admin, with a search returning several pages.

**Steps:**

1. Click the **Last** control.
2. Read the page indicator and the rows displayed.

**Expected Result:** The final page is displayed with at least one row, and no further next-page navigation is offered.

**Priority:** P3

**Tags:** Atomic, Positive

**Review:** Approved

**Automation:** Approved

---

### TC-BR-062 — Pagination preserves the active status filter

**Objective:** Verify that changing pages does not reset the selected Status filter.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Steps:**

1. Select Status **Both** and click **Search**.
2. Note the total shown in the result count text.
3. Navigate forward two pages.
4. Read the Status radio group and the result count text.

**Expected Result:** **Both** is still selected and the total is unchanged from step 2.

**Priority:** P1

**Tags:** Atomic, Positive, Regression

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-063 — Result count text reflects the filtered total

**Objective:** Verify that the result count text states the total for the applied filter.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Steps:**

1. Select Status **Active** and click **Search**; read the count text.
2. Select Status **Inactive** and click **Search**; read the count text.

**Expected Result:** The count text is displayed in each case and its stated total changes between the two searches.

**Priority:** P3

**Tags:** Atomic, Positive

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-064 — A record on a later page is findable by direct search

**Objective:** Verify that a branch not on page 1 can still be retrieved by searching for it.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Steps:**

1. Select Status **Both**, click **Search**, and page forward until a row is visible that was not on page 1.
2. Note that row's Branch Code.
3. Return to Admin → Branch and enter the noted code in the **Branch code** field.
4. Click **Search**.

**Expected Result:** The branch is returned on the first page of results.

**Priority:** P2

**Tags:** Atomic, Positive

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-065 — Update Branch pre-fills every stored value

**Objective:** Verify that opening a branch for update shows all of its stored values.

**Preconditions:** User is logged in as Super Admin and has opened a branch via the edit pen.

**Steps:**

1. Wait until the Branch Name field shows a value.
2. Read Operating Country, Name, Country, State, City, Post Office Box, Email ID, Credit Limit, Top Up Limit and Outstanding Threshold.

**Expected Result:** Every field listed in step 2 shows the branch's stored value. No field that holds data is blank, and neither State nor City shows an unselected placeholder.

**Priority:** P1

**Tags:** Scenario, Positive, Smoke

**Notes:** Wait for a field to populate before reading — a fixed delay produced a false "form is empty" result twice during Discovery.

**Review:** Approved

**Automation:** Approved

---

### TC-BR-066 — Update a branch and submit it for approval

**Objective:** Verify that an edited branch can be submitted for approval and returns to a pending state.

**Preconditions:** User is logged in as Super Admin. A branch created by this run is open on the Update Branch screen.

**Test Data:**

| Field | Value |
|---|---|
| Address 1 | Updated by QA run-003 |
| Remarks | Address corrected |

**Steps:**

1. Change **Address 1** to the Test Data value.
2. Enter the Remarks value.
3. Click **Send For Approval**.
4. Search for the branch on Admin → Branch.

**Expected Result:** The update is saved, a success confirmation is shown, and the branch's Approval Status reads `Pending for approval`.

**Priority:** P1

**Tags:** Scenario, Positive, SelfCreatedRecord

**Notes:** The button is labelled `Send For Approval`, not "Submit for Approval" — see FINDING-011. Act only on a branch this run created.

**Review:** Approved

**Automation:** Approved

---

### TC-BR-067 — Remarks is mandatory before any Update action

**Objective:** Verify that an Update action is blocked when Remarks is empty.

**Preconditions:** User is logged in as Super Admin. A branch created by this run is open on the Update Branch screen.

**Steps:**

1. Change **Address 1** to any valid value.
2. Leave **Remarks** empty.
3. Click **Send For Approval**.

**Expected Result:** Submission is blocked and a required-field validation message is shown for Remarks.

**Priority:** P1

**Tags:** Atomic, Negative-EmptyValues, SelfCreatedRecord

**Review:** Approved

**Automation:** Approved

---

### TC-BR-068 — Cancel discards unsaved changes on Update Branch

**Objective:** Verify that Cancel exits without saving edits.

**Preconditions:** User is logged in as Super Admin. A branch created by this run is open on the Update Branch screen.

**Steps:**

1. Change **Address 1** to a new value.
2. Click **Cancel**.
3. Re-open the same branch via the edit pen and wait for the form to populate.
4. Read **Address 1**.

**Expected Result:** Address 1 shows its original value; the change made in step 1 was not saved.

**Priority:** P2

**Tags:** Atomic, Positive, SelfCreatedRecord

**Review:** Approved

**Automation:** Approved

---

### TC-BR-069 — Approve a branch update request from the Update screen

**Objective:** Verify that a pending branch update can be approved from the Update Branch screen.

**Preconditions:** User is logged in as Super Admin. A branch created by this run has a pending update and is open on the Update Branch screen.

**Test Data:**

| Field | Value |
|---|---|
| Remarks | Update approved by QA run-003 |

**Steps:**

1. Enter the Remarks value.
2. Click **Approve**.
3. Search for the branch on Admin → Branch.

**Expected Result:** A success confirmation is shown and the branch's Approval Status reads `Approved`.

**Priority:** P1

**Tags:** Scenario, Positive, SelfCreatedRecord

**Review:** Approved

**Automation:** Approved

---

### TC-BR-070 — Reject a branch update request from the Update screen

**Objective:** Verify that a pending branch update can be rejected from the Update Branch screen.

**Preconditions:** User is logged in as Super Admin. A second branch created by this run has a pending update and is open on the Update Branch screen.

**Test Data:**

| Field | Value |
|---|---|
| Remarks | Update rejected by QA run-003 |

**Steps:**

1. Enter the Remarks value.
2. Click **Reject**.
3. Search for the branch on Admin → Branch.

**Expected Result:** A confirmation is shown and the branch's Approval Status reads `Rejected`.

**Priority:** P1

**Tags:** Scenario, Positive, SelfCreatedRecord

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-071 — Mandatory Update Branch fields block submission when cleared

**Objective:** Verify that clearing a mandatory field on Update blocks submission.

**Preconditions:** User is logged in as Super Admin. A branch created by this run is open on the Update Branch screen, with the form populated.

**Test Data:**

| Field Cleared |
|---|
| Name |
| State |
| City |
| Address 1 |
| Post Office Box |
| Credit Limit |
| Top Up Limit |
| Credit Terms (Days) |

**Steps:**

1. Clear the one field under test.
2. Enter a valid Remarks value.
3. Click **Send For Approval**.
4. Restore the field's original value and repeat steps 1–3 for each field in Test Data.

**Expected Result:** For each field cleared, submission is blocked and a required-field validation message is shown for that field.

**Priority:** P1

**Tags:** Atomic, Negative-EmptyValues, SelfCreatedRecord

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-072 — Post Office Box rejects a value exceeding 8 characters on Update

**Objective:** Verify that the Update screen enforces the 8-character limit on Post Office Box.

**Preconditions:** User is logged in as Super Admin. A branch created by this run is open on the Update Branch screen.

**Test Data:**

| Field | Value |
|---|---|
| Post Office Box | ABCD123456 |
| Remarks | Boundary check |

**Steps:**

1. Replace **Post Office Box** with the 10-character Test Data value.
2. Enter the Remarks value.
3. Click **Send For Approval**.

**Expected Result:** The field either truncates the entry to 8 characters or blocks submission with a length validation message.

**Priority:** P2

**Tags:** Atomic, Negative-BoundaryValues, Regression, SelfCreatedRecord

**Notes:** The Create screen accepts over-length values without enforcement (FINDING-002). This asserts the corrected behaviour on Update and is expected to fail if the same gap exists there.

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-073 — Credit Limit rejects a value exceeding 15 characters on Update

**Objective:** Verify that the Update screen enforces the 15-character limit on Credit Limit.

**Preconditions:** User is logged in as Super Admin. A branch created by this run is open on the Update Branch screen.

**Test Data:**

| Field | Value |
|---|---|
| Credit Limit | 1234567890123456 |
| Remarks | Boundary check |

**Steps:**

1. Replace **Credit Limit** with the 16-digit Test Data value.
2. Enter the Remarks value.
3. Click **Send For Approval**.

**Expected Result:** The field either truncates the entry to 15 digits or blocks submission with a length validation message.

**Priority:** P2

**Tags:** Atomic, Negative-BoundaryValues, Regression, SelfCreatedRecord

**Notes:** Mirrors FINDING-003 on the Create screen. Asserts the corrected behaviour.

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-074 — Warning Prompt must not exceed Credit Terms on Update

**Objective:** Verify that the cross-field rule between Warning Prompt and Credit Terms is enforced on Update.

**Preconditions:** User is logged in as Super Admin. A branch created by this run is open on the Update Branch screen.

**Test Data:**

| Field | Value |
|---|---|
| Credit Terms (Days) | 10 |
| Warning Prompt (Days) | 20 |
| Remarks | Cross-field check |

**Steps:**

1. Set **Credit Terms (Days)** to 10.
2. Set **Warning Prompt (Days)** to 20.
3. Enter the Remarks value.
4. Click **Send For Approval**.

**Expected Result:** Submission is blocked with a message stating the warning prompt days must not be greater than the credit terms days.

**Priority:** P2

**Tags:** Atomic, Negative-InvalidInputs, SelfCreatedRecord

**Notes:** This rule is confirmed enforced on the Create screen; equal values are permitted there and only a greater value is rejected.

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-075 — Reaching Percentage rejects a value above 100 on Update

**Objective:** Verify that Reaching Percentage cannot exceed 100 on the Update screen.

**Preconditions:** User is logged in as Super Admin. A branch created by this run is open on the Update Branch screen.

**Test Data:**

| Field | Value |
|---|---|
| Reaching Percentage | 101 |
| Remarks | Boundary check |

**Steps:**

1. Set **Reaching Percentage** to 101.
2. Enter the Remarks value.
3. Click **Send For Approval**.

**Expected Result:** Submission is blocked with a validation message indicating the percentage may not exceed 100.

**Priority:** P2

**Tags:** Atomic, Negative-BoundaryValues, SelfCreatedRecord

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-076 — Change Threshold lists child agencies before confirming

**Objective:** Verify that changing a branch threshold surfaces the child agencies affected before the change is confirmed.

**Preconditions:** User is logged in as Super Admin. A branch created by this run is open on the Update Branch screen.

**Test Data:**

| Field | Value |
|---|---|
| Outstanding Threshold | 50 |

**Steps:**

1. Change **Outstanding Threshold** to the Test Data value.
2. Click **Change Threshold**.
3. Read the confirmation popup.

**Expected Result:** A confirmation popup appears listing any child agencies holding a custom threshold, and offers the option to confirm or cancel before the change is applied.

**Priority:** P2

**Tags:** Scenario, Positive, SelfCreatedRecord, AssumptionBased

**Notes:** Assumption-based — this flow was never exercised during Discovery. A branch created by this run will have no child agencies, so the popup may legitimately show an empty list; record what appears rather than treating an empty list as a failure.

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-077 — Stored Branch Email Password is not recoverable from the Update form

> **Status: `Blocked — Needs Clarification` (2026-08-10).** This case asserts the **opposite** of a decision the module owner has since made. Its business intent below is left unchanged and has **not** been rewritten — revising or retiring an approved test case is a Stage 3 decision. See Blocking Reason.

**Objective:** Verify that a branch's stored email password is not returned to the browser when the Update screen loads.

**Preconditions:** User is logged in as Super Admin and has opened any branch via the edit pen.

**Steps:**

1. Wait until the form has populated.
2. Inspect the **Email Password** field's underlying value using browser developer tools.

**Expected Result:** The field holds no recoverable password value — it is empty, or contains only a placeholder that is not the stored password.

**Priority:** P1

**Tags:** Atomic, Security, Regression, Blocked-NeedsClarification

**Blocking Reason (2026-08-10):** The module owner dispositioned **FINDING-013** as *"not a bug but business needs"* — returning and pre-filling the stored Branch Email Password is **intended behaviour**. This case's Expected Result asserts the redacted behaviour, which that decision rules out, so as written it can now only ever fail against an application that is behaving as the business intends. Do not execute it as a pass/fail gate, and do not weaken its Expected Result to match the intended behaviour — either would be a Stage 3 change made at the wrong stage. **Required to unblock:** a Stage 3 decision to retire this case, or to rewrite it against the now-intended behaviour (for example, asserting that the field is present and populated, and that no other surface leaks the value), plus documenting the credential-handling expectation in `PRD_UserStories.md` US 8606, which is currently silent on it.

**Notes:** Asserts the corrected behaviour. Discovery confirmed the stored password is returned and populated into this field (FINDING-013) — an observation that remains factually accurate; only its disposition changed, from `Security Concern / Confirmed` to `Observation / Rejected — Confirmed Intended Behaviour`. **Never record the observed password value in a result, defect, or screenshot** — report only whether a recoverable value was present. That rule stands regardless of the disposition.

**Review:** Approved

**Automation:** Rejected — and now also `Blocked — Needs Clarification` (was Rejected on scope grounds alone)

---

### TC-BR-078 — Exploratory — is Active/Inactive status discoverable from the grid?

**Objective:** Determine whether an operator can tell an Active branch from an Inactive one in the results grid.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch.

**Steps:**

1. Select Status **Both** and click **Search**.
2. Attempt to determine, from the grid alone, which returned records are Active and which are Inactive.
3. Note every column, icon, or styling cue that conveys it, if any.

**Expected Result:** Confirm with the reviewer whether operating without an Active/Inactive indicator in the grid is acceptable, or whether the grid must expose that status as a column.

**Priority:** P2

**Tags:** Atomic, Exploratory

**Notes:** Exploratory pending a Product decision (FINDING-014). The acceptance criteria do not list an Active/Inactive column, but the platform-wide convention treats Status and Approval Status as distinct columns. Do not record a pass or fail — record the observation and the reviewer's decision.

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-079 — Exploratory — does the City filter accept and apply multiple cities?

**Objective:** Determine whether the City filter's multi-select capability works and is intended.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch, with a Country and State selected.

**Steps:**

1. Open the **City** filter and attempt to select two or more cities.
2. Click **Search**.
3. Check whether the results include branches from every selected city.

**Expected Result:** Confirm with the reviewer whether multi-city selection is intended behaviour, and if so, whether the acceptance criteria should be updated to describe a multi-select rather than a dropdown.

**Priority:** P3

**Tags:** Atomic, Exploratory

**Notes:** Exploratory pending a Product decision (FINDING-015). The control is built as a multi-select; the acceptance criteria specify a dropdown. Do not record a pass or fail.

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-080 — Admin-role operator sees the same grid columns and row actions

**Objective:** Verify that an Admin-role operator sees the same Search Branch surface as a Super Admin.

**Preconditions:** An Admin-role account exists and its credentials are available.

**Steps:**

1. Log in as an Admin-role user.
2. Open Admin → Branch and click **Search**.
3. Compare the grid columns and the row action icons against those seen as Super Admin.

**Expected Result:** Confirm whether the Admin role sees the same columns and the same row actions, and record any difference.

**Priority:** P3

**Tags:** Atomic, Permissions, NotCovered-SingleAccountRun

**Notes:** **Not executable this run.** Only one account is available, and it holds Super Admin privileges while standing in for both actors — a privileged account cannot demonstrate an unprivileged view. Record as `Not Covered — Single-Account Run`, never as passed. Unblocked by provisioning an Admin-role credential.

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-081 — Repeated failed login attempts lock the account

**Objective:** Verify that the account lock rule triggers after repeated failed authentication attempts.

**Preconditions:** A dedicated, non-shared environment with a disposable account.

**Test Data:**

| Field | Value |
|---|---|
| Password | a deliberately incorrect value |

**Steps:**

1. Attempt to log in with a valid username and an incorrect password.
2. Repeat until the documented lock threshold is exceeded.
3. Attempt to log in with the correct password.

**Expected Result:** After the threshold is exceeded the account is locked and a lock message is shown; the correct password no longer grants access until the account is unlocked.

**Priority:** P3

**Tags:** Atomic, Security, Deferred-RequiresDedicatedEnvironment

**Notes:** **Deferred — Requires Dedicated Environment.** Designed in full but not for execution on the shared staging environment: locking a shared account would block other teams, and the lock is not self-reversing. Execute only on an isolated environment with a disposable account.

**Review:** Approved

**Automation:** Rejected

---

### TC-BR-082 — Credit Terms (Days) rejects a value exceeding 7 digits

**Objective:** Verify that Credit Terms (Days) rejects a numeric value longer than 7 digits.

**Preconditions:** User is logged in as Super Admin and has opened Admin → Branch → Add branch.

**Test Data:**

| Field | Value |
|---|---|
| Credit Terms(Days) | 99999999 (8 digits) |

**Steps:**

1. Enter the Test Data value into Credit Terms (Days).
2. Move focus away from the field.

**Expected Result:** The system truncates the input to 7 digits, blocks the 8th digit, or displays a validation message that the maximum length is 7 digits.

**Priority:** P2

**Tags:** Atomic, Negative-BoundaryValues

**Notes:** Added 2026-08-10 from a business clarification that Credit Terms (Days) has a 7-digit maximum — a rule PRD_UserStories.md did not previously state (it documented Credit Terms only as "numeric input only … Mandatory"; the requirement text has now been updated). **The cap itself has not been independently verified live against STG** — it is business-stated, so this case's first execution is also what confirms whether the application actually enforces it. If an 8-digit value is accepted in full, that is a new defect to raise, not a broken test. Leave Automation Rejected until the rule is live-verified, so a fresh unverified expectation is not encoded into the suite ahead of evidence. Related: FINDING-016, where this cap conflicts with Warning Prompt (Days)'s documented 11-digit maximum.

**Review:** Approved

**Automation:** Rejected

### TC-BR-083 — Auto Reissue is unchecked by default on Add Branch

**Objective:** Verify that a new Branch form shows the Auto Reissue checkbox unchecked.

**Preconditions:** Logged in to Admin (`http://192.168.1.60`). Nothing is saved by this case.

**Steps:**

1. Open **Admin → Branch**.
2. Click **Add**.
3. Find **Auto Reissue** beside Import PNR.
4. Leave the page without saving.

**Expected Result:** **Auto Reissue** is shown and unchecked. **Auto Reissue Credentials** is not shown.

**Priority:** P2

**Tags:** Atomic, Positive

**Review:** Approved

**Automation:** Pending

### TC-BR-084 — Picker is empty on a new Branch with no supplier

**Objective:** Verify that the Auto Reissue picker offers nothing when the Branch has no supplier.

**Preconditions:** On the Add Branch form, no supplier ticked. Nothing is saved.

**Steps:**

1. Tick **Auto Reissue**.
2. Open **Auto Reissue Credentials**.
3. Leave the page without saving.

**Expected Result:** The picker shows "No results found".

**Priority:** P3

**Tags:** Atomic, Negative-EmptyValues

**Review:** Approved

**Automation:** Pending

### TC-BR-085 — An LCC credential is not offered for Auto Reissue

**Objective:** Verify that an LCC supplier's credential never appears in the Auto Reissue picker.

**Preconditions:** On the Add Branch form. Nothing is saved.

**Test Data:** LCC supplier: `AirArabiaEgypt`, with its credential chosen in its Product Access row

**Steps:**

1. In Product Access, tick **AirArabiaEgypt** and choose its credential.
2. Tick **Auto Reissue**.
3. Open **Auto Reissue Credentials**.
4. Leave the page without saving.

**Expected Result:** The AirArabiaEgypt credential is not offered.

**Priority:** P2

**Tags:** Atomic, Negative, Business-Rule

**Review:** Approved

**Automation:** Pending

### TC-BR-086 — A Galileo PCC credential is offered for Auto Reissue

**Objective:** Verify that a credential chosen in a supported GDS supplier's PCC tab appears in the picker.

**Preconditions:** On the Add Branch form. Nothing is saved.

**Test Data:** GDS supplier: `Galileo`, PCC tab credential `GalileoLive`

**Steps:**

1. In Product Access, tick **Galileo**.
2. In the **Galileo** tab under Airline Supplier credential (PCC), select **GalileoLive**.
3. Tick **Auto Reissue**.
4. Open **Auto Reissue Credentials**.
5. Leave the page without saving.

**Expected Result:** **GalileoLive** is offered.

**Priority:** P2

**Tags:** Atomic, Positive, Business-Rule

**Review:** Approved

**Automation:** Pending

### TC-BR-087 — An Amadeus PCC credential is not offered for Auto Reissue

**Objective:** Verify that an Amadeus credential never appears in the Auto Reissue picker.

**Preconditions:** On the Add Branch form. Nothing is saved.

**Test Data:** GDS supplier: `Amadeus`, PCC tab credential `Amadeus Live`

**Steps:**

1. In Product Access, tick **Amadeus**.
2. In the **Amadeus** tab, select **Amadeus Live**.
3. Tick **Auto Reissue**.
4. Open **Auto Reissue Credentials**.
5. Leave the page without saving.

**Expected Result:** **Amadeus Live** is not offered.

**Priority:** P2

**Tags:** Atomic, Negative, Business-Rule

**Notes:** Amadeus is a GDS but not on the hard-coded reissue list (`PO-21`). This is spec `S-9` on the screen.

**Review:** Approved

**Automation:** Pending

### TC-BR-088 — A TravelportNdc PCC credential is offered for Auto Reissue

**Objective:** Verify that a TravelportNdc credential appears in the Auto Reissue picker.

**Preconditions:** On the Add Branch form. A TravelportNdc supplier with at least one credential exists. Nothing is saved.

**Steps:**

1. In Product Access, tick **TravelportNdc**.
2. In its PCC tab, select one credential.
3. Tick **Auto Reissue**.
4. Open **Auto Reissue Credentials**.
5. Leave the page without saving.

**Expected Result:** The TravelportNdc credential is offered.

**Priority:** P3

**Tags:** Atomic, Positive, Assumption-based

**Notes:** Not seen in Discovery. If no TravelportNdc supplier exists on `.60`, record **Blocked**.

**Review:** Approved

**Automation:** Pending

### TC-BR-089 — Turn Auto Reissue on for a Branch and save

**Objective:** Verify that Branch Auto Reissue and one credential are saved and shown again when the Branch is reopened.

**Preconditions:** BRN265 is Approved with Auto Reissue off.

**Test Data:**

| Field | Value |
|---|---|
| Branch | BRN265 |
| Auto Reissue Credentials | `NDCSabre staging` |

**Steps:**

1. Open **Admin → Branch**, edit BRN265.
2. Tick **Auto Reissue**.
3. In **Auto Reissue Credentials**, select **NDCSabre staging**.
4. Enter a remark.
5. Click **Send For Approval**.
6. Approve BRN265 from the Branch grid, entering a remark.
7. Reopen BRN265.

**Expected Result:** **Auto Reissue** is ticked and **NDCSabre staging** is shown in **Auto Reissue Credentials**.

**Priority:** P1

**Tags:** Scenario, Positive, Smoke

**Notes:** Leaves BRN265 on with NDCSabre staging, which is its restore state.

**Review:** Approved

**Automation:** Pending

### TC-BR-090 — Branch Auto Reissue change waits for approval

**Objective:** Verify that a Branch Auto Reissue change sent for approval takes effect only after it is approved.

**Preconditions:** BRN265 is Approved with Auto Reissue on.

**Steps:**

1. Edit BRN265.
2. Untick **Auto Reissue**.
3. Enter a remark and click **Send For Approval**.
4. Read BRN265's row in the Branch grid.
5. Approve the row, entering a remark.
6. Reopen BRN265.

**Expected Result:** After step 4, the row shows **Pending for approval**. After step 5, it shows **Approved**. After step 6, Auto Reissue is unticked.

**Priority:** P2

**Tags:** Scenario, Regression

**Notes:** Restore afterwards with TC-BR-089.

**Review:** Approved

**Automation:** Pending

### TC-BR-091 — Turning Branch Auto Reissue off keeps the saved credentials

**Objective:** Verify that a Branch's saved credentials return when Auto Reissue is turned on again.

**Preconditions:** BRN265 is Approved with Auto Reissue off, after having had **NDCSabre staging** saved (e.g. after TC-BR-090).

**Steps:**

1. Edit BRN265.
2. Tick **Auto Reissue**.
3. Read **Auto Reissue Credentials**.
4. Leave the page without saving.

**Expected Result:** The picker already shows **NDCSabre staging**.

**Priority:** P1

**Tags:** Scenario, Positive, Regression

**Review:** Approved

**Automation:** Pending

### TC-BR-092 — Branch Auto Reissue on with no credential shows "Required"

**Objective:** Verify that the Branch form will not save Auto Reissue on without a credential.

**Preconditions:** BRN265 is Approved.

**Steps:**

1. Edit BRN265.
2. Tick **Auto Reissue** if unticked.
3. Clear **Auto Reissue Credentials**.
4. Enter a remark.
5. Click **Send For Approval**.

**Expected Result:** "Required" appears under **Auto Reissue Credentials**. BRN265 is not saved.

**Priority:** P1

**Tags:** Atomic, Negative-EmptyValues

**Review:** Approved

**Automation:** Pending

### TC-BR-093 — Branch update without a remark is refused

**Objective:** Verify that a Branch Auto Reissue change cannot be sent without a remark.

**Preconditions:** BRN265 is Approved.

**Steps:**

1. Edit BRN265.
2. Toggle **Auto Reissue**.
3. Leave the remark empty.
4. Click **Send For Approval**.

**Expected Result:** The form shows a message that the remark is required, and BRN265 is not saved.

**Priority:** P3

**Tags:** Atomic, Negative-EmptyValues, Assumption-based

**Notes:** Discovery always entered a remark, so this was never tried (A-BR-R6-1). If the save goes through, restore BRN265 with TC-BR-089 and report the result.

**Review:** Approved

**Automation:** Pending

### TC-BR-094 — Branch API rejects Auto Reissue on with an empty credential list

**Objective:** Verify that the Branch API rejects Auto Reissue on with no credentials.

**Preconditions:** The `{BRANCH_SAVE_REQUEST}` fixture is loaded in Postman (§0.3). BRN265 is Approved.

**Test Data:** `autoReissueEnabled`: `true` · `reissueCredentials`: `[]`

**Steps:**

1. In `{BRANCH_SAVE_REQUEST}`, set `autoReissueEnabled` and `reissueCredentials` to the Test Data values. Leave every other field, including the remark, as captured.
2. Send the request.
3. Search BRN265 in Admin → Branch and read its row.

**Expected Result:** The response is **400** with message "Select at least one eligible credential". BRN265 is unchanged.

**Priority:** P2

**Tags:** Atomic, Negative-EmptyValues

**Review:** Approved

**Automation:** Pending

### TC-BR-095 — Branch API keeps saved credentials when sent off with others

**Objective:** Verify that credentials sent with Branch Auto Reissue off are replaced by the saved valid selection.

**Preconditions:** The `{BRANCH_SAVE_REQUEST}` fixture is loaded in Postman (§0.3). BRN265 is Approved, Auto Reissue off, with saved credential `[313]`.

**Test Data:** `autoReissueEnabled`: `false` · `reissueCredentials`: `[{"credentialId": 315}]`

**Steps:**

1. In `{BRANCH_SAVE_REQUEST}`, set the two fields to the Test Data values.
2. Send the request.
3. Approve BRN265 from the Branch grid, entering a remark.
4. Read BRN265 with the GET in §0.3.

**Expected Result:** The request succeeds. The GET returns `autoReissueEnabled: false` and `reissueCredentials` `[313]`, not 315.

**Priority:** P2

**Tags:** Atomic, Positive

**Notes:** A real save: BRN265 is pending until step 3. Restore afterwards with TC-BR-089.

**Review:** Approved

**Automation:** Pending

### TC-BR-096 — Branch API rejects a credential without an ID

**Objective:** Verify that the Branch API rejects a reissue credential that has no ID.

**Preconditions:** The `{BRANCH_SAVE_REQUEST}` fixture is loaded in Postman (§0.3). BRN265 is Approved.

**Test Data:** `autoReissueEnabled`: `true` · `reissueCredentials`: `[{}]`

**Steps:**

1. In `{BRANCH_SAVE_REQUEST}`, set `autoReissueEnabled` and `reissueCredentials` to the Test Data values. Leave every other field, including the remark, as captured.
2. Send the request.
3. Search BRN265 in Admin → Branch and read its row.

**Expected Result:** The response is **400** with message "Every auto-reissue credential must have an ID". BRN265 is unchanged.

**Priority:** P2

**Tags:** Atomic, Negative-InvalidInputs

**Review:** Approved

**Automation:** Pending

### TC-BR-097 — Branch API rejects an unknown credential ID

**Objective:** Verify that the Branch API rejects a credential ID that does not exist.

**Preconditions:** The `{BRANCH_SAVE_REQUEST}` fixture is loaded in Postman (§0.3). BRN265 is Approved.

**Test Data:** `autoReissueEnabled`: `true` · `reissueCredentials`: `[{"credentialId": 999999}]`

**Steps:**

1. In `{BRANCH_SAVE_REQUEST}`, set `autoReissueEnabled` and `reissueCredentials` to the Test Data values. Leave every other field, including the remark, as captured.
2. Send the request.
3. Search BRN265 in Admin → Branch and read its row.

**Expected Result:** The response is **400** with message "Every auto-reissue credential must exist and be active". BRN265 is unchanged.

**Priority:** P2

**Tags:** Atomic, Negative-InvalidInputs

**Review:** Approved

**Automation:** Pending

### TC-BR-098 — Branch API rejects duplicate credential IDs

**Objective:** Verify that the Branch API rejects the same credential sent twice.

**Preconditions:** The `{BRANCH_SAVE_REQUEST}` fixture is loaded in Postman (§0.3). BRN265 is Approved.

**Test Data:** `autoReissueEnabled`: `true` · `reissueCredentials`: `[{"credentialId": 313}, {"credentialId": 313}]`

**Steps:**

1. In `{BRANCH_SAVE_REQUEST}`, set `autoReissueEnabled` and `reissueCredentials` to the Test Data values. Leave every other field, including the remark, as captured.
2. Send the request.
3. Search BRN265 in Admin → Branch and read its row.

**Expected Result:** The response is **400** with message "Auto-reissue credentials must not contain duplicates". BRN265 is unchanged.

**Priority:** P2

**Tags:** Atomic, Negative-InvalidInputs

**Review:** Approved

**Automation:** Pending

### TC-BR-099 — Branch API rejects a credential not assigned to the Branch

**Objective:** Verify that a Branch cannot be given a reissue credential it is not assigned.

**Preconditions:** The `{BRANCH_SAVE_REQUEST}` fixture is loaded in Postman (§0.3). BRN265 is Approved.

**Test Data:** `autoReissueEnabled`: `true` · `reissueCredentials`: `[{"credentialId": 287}]` (a supported Galileo credential not in BRN265's Product Access — check first)

**Steps:**

1. In `{BRANCH_SAVE_REQUEST}`, set `autoReissueEnabled` and `reissueCredentials` to the Test Data values. Leave every other field, including the remark, as captured.
2. Send the request.
3. Search BRN265 in Admin → Branch and read its row.

**Expected Result:** The response is **400** with message "Each auto-reissue credential must be mapped to this organization". BRN265 is unchanged.

**Priority:** P1

**Tags:** Atomic, Negative-InvalidInputs, Permissions

**Review:** Approved

**Automation:** Pending

### TC-BR-100 — Branch Auto Reissue does not change its Agencies' checkbox

**Objective:** Verify that turning Branch Auto Reissue on leaves the Auto Reissue value of its Agencies unchanged.

**Preconditions:** BRN265 has Auto Reissue off. AGN9780 has Auto Reissue off. Both Approved.

**Steps:**

1. Turn BRN265 Auto Reissue on and approve it (as in TC-BR-089).
2. Open AGN9780 in Admin → Agency.
3. Read **Auto Reissue**.

**Expected Result:** AGN9780's **Auto Reissue** is still unticked.

**Priority:** P1

**Tags:** Atomic, Integration

**Review:** Approved

**Automation:** Pending

### TC-BR-101 — Admin shows Reissue for a Branch booking when Branch Auto Reissue is on

**Objective:** Verify that the Admin Itinerary shows Reissue on a Branch-owned booking when the Branch has Auto Reissue on.

**Preconditions:** BRN265 has Auto Reissue on (Approved). Booking `NDCEG-BR-F260916ENYOeQ` (owned by BRN265, Booked) is not locked by another user.

**Steps:**

1. Open **Booking-Mid Office → Search Booking** (`/booking/search-booking`).
2. Click the **Flight** tab.
3. Enter Booking Reference `NDCEG-BR-F260916ENYOeQ` and click **Search**.
4. Open the booking from the result row.
5. Click the lock icon on the **Created By** card.
6. Click **View Passenger Details**.

**Expected Result:** The **Reissue** button is shown.

**Priority:** P1

**Tags:** Atomic, Positive, Smoke

**Notes:** Never click **Reissue**, **Release PNR** or **Void / Cancel**. Status **Booked** in Booking Information is the condition, not the "Ticketed Document" bar (`PO-24`).

**Review:** Approved

**Automation:** Pending

### TC-BR-102 — Admin hides Reissue for a Branch booking when Branch Auto Reissue is off

**Objective:** Verify that the Admin Itinerary hides Reissue on a Branch-owned booking when the Branch has Auto Reissue off.

**Preconditions:** BRN265 has Auto Reissue off (Approved). Booking `NDCEG-BR-F260916ENYOeQ` is not locked by another user.

**Steps:**

1. Open **Booking-Mid Office → Search Booking** (`/booking/search-booking`).
2. Click the **Flight** tab.
3. Enter Booking Reference `NDCEG-BR-F260916ENYOeQ` and click **Search**.
4. Open the booking from the result row.
5. Click the lock icon on the **Created By** card.
6. Click **View Passenger Details**.

**Expected Result:** The **Reissue** button is not shown. **Manual Reissue** is still shown.

**Priority:** P1

**Tags:** Atomic, Negative, Smoke

**Notes:** Never click **Reissue**, **Release PNR** or **Void / Cancel**. Status **Booked** in Booking Information is the condition, not the "Ticketed Document" bar (`PO-24`). Read BRN265's flag just before this check: it was changed by hand during Discovery.

**Review:** Approved

**Automation:** Pending

### TC-BR-103 — Reissue shows on a Branch booking whose credential is not selected

**Objective:** Verify that the Branch booking's Reissue button depends on the checkbox, not on the selected credentials.

**Preconditions:** BRN265 has Auto Reissue on with only **NDCSabre staging** (313) selected. Booking `NDCEG-BR-F260916ENYOeQ` is on **Sabre Staging** (315).

**Steps:**

1. Open **Booking-Mid Office → Search Booking** (`/booking/search-booking`).
2. Click the **Flight** tab.
3. Enter Booking Reference `NDCEG-BR-F260916ENYOeQ` and click **Search**.
4. Open the booking from the result row.
5. Click the lock icon on the **Created By** card.
6. Click **View Passenger Details**.

**Expected Result:** The **Reissue** button is shown.

**Priority:** P3

**Tags:** Atomic, Business-Rule

**Notes:** Intended (`PO-22`). The credential is checked only when Reissue is clicked, in the `reissue-flow` scope. Never click **Reissue**, **Release PNR** or **Void / Cancel**. Status **Booked** in Booking Information is the condition, not the "Ticketed Document" bar (`PO-24`).

**Review:** Approved

**Automation:** Pending

### TC-BR-104 — Agency Auto Reissue off does not hide Reissue on a Branch booking

**Objective:** Verify that an Agency's Auto Reissue value does not affect a booking owned by its Branch.

**Preconditions:** BRN265 has Auto Reissue on. AGN9780 has Auto Reissue off. Both Approved.

**Steps:**

1. Open **Booking-Mid Office → Search Booking** (`/booking/search-booking`).
2. Click the **Flight** tab.
3. Enter Booking Reference `NDCEG-BR-F260916ENYOeQ` and click **Search**.
4. Open the booking from the result row.
5. Click the lock icon on the **Created By** card.
6. Click **View Passenger Details**.

**Expected Result:** The **Reissue** button is shown.

**Priority:** P2

**Tags:** Atomic, Integration

**Notes:** Never click **Reissue**, **Release PNR** or **Void / Cancel**. Status **Booked** in Booking Information is the condition, not the "Ticketed Document" bar (`PO-24`).

**Review:** Approved

**Automation:** Pending

### TC-BR-105 — Reading the Branch drops a credential that became invalid

**Objective:** Verify that a saved Branch credential that became invalid is removed on read, while Auto Reissue stays on.

**Preconditions:** BRN265 has Auto Reissue on and a saved credential that has since become inactive, unassigned or unsupported.

**Steps:**

1. Reopen BRN265.
2. Read **Auto Reissue** and **Auto Reissue Credentials**.

**Expected Result:** The invalid credential is no longer listed. **Auto Reissue** stays ticked.

**Priority:** P3

**Tags:** Atomic, Assumption-based

**Notes:** **Needs a supplier or credential change this run is not granted (RISK-BR-11).** **TC-BR-110 sets up this state** (with the user's go-ahead). Otherwise record **Blocked**.

**Review:** Approved

**Automation:** Pending

### TC-BR-106 — Updating a Branch without touching Auto Reissue still works

**Objective:** Verify that an ordinary Branch update still saves and leaves Auto Reissue unchanged.

**Preconditions:** BRN265 is Approved. Its Auto Reissue value and credentials are recorded.

**Steps:**

1. Edit BRN265.
2. Change only the remark text.
3. Click **Send For Approval**.
4. Approve BRN265 from the grid, entering a remark.
5. Reopen BRN265.

**Expected Result:** The update is saved and approved. **Auto Reissue** and **Auto Reissue Credentials** are the same as recorded.

**Priority:** P2

**Tags:** Atomic, Regression, Smoke

**Review:** Approved

**Automation:** Pending

### TC-BR-107 — Create a Branch with Auto Reissue on

**Objective:** Verify that a new Branch can be created with Auto Reissue on and a credential.

**Preconditions:** **The user has been asked and agrees to create a new Branch** (allowed after asking — user, 2026-09-24). The Branch's other mandatory fields and one supported GDS supplier are ready.

**Test Data:**

| Field | Value |
|---|---|
| Branch name | `RUN006_AR_Branch` |
| Supplier | Galileo, PCC tab `GalileoLive` |

**Steps:**

1. Open **Admin → Branch → Add**.
2. Fill the mandatory fields with Test Data.
3. Tick **Auto Reissue** and select **GalileoLive**.
4. Click **Send For Approval**.
5. Approve the new Branch from the grid, entering a remark.
6. Reopen the new Branch.

**Expected Result:** The new Branch shows **Auto Reissue** ticked with **GalileoLive**.

**Priority:** P3

**Tags:** Scenario, Positive

**Notes:** **Creates a lasting record on STG.** Ask the user before running it. Without their agreement, record **Blocked — awaiting user agreement**.

**Review:** Approved

**Automation:** Pending

### TC-BR-108 — Agency Portal does not list its Branch's own bookings

**Objective:** Verify that an Agency's Portal login cannot see a booking owned by its parent Branch.

**Preconditions:** The AGN9780 Portal login is available. Booking `NDCEG-BR-F260916ENYOeQ` is owned by BRN265.

**Steps:**

1. Log in to the Portal (`http://192.168.1.60:9500`) with agency code `AGN9780`.
2. Open **My Booking** and click **Search**.
3. Look for `NDCEG-BR-F260916ENYOeQ` in the results.

**Expected Result:** `NDCEG-BR-F260916ENYOeQ` is not listed.

**Priority:** P3

**Tags:** Atomic, Permissions, Assumption-based

**Notes:** The user's statement (`PO-26`), not yet observed.

**Review:** Approved

**Automation:** Pending

### TC-BR-109 — A Branch can have a supplier its Agency doesn't have

**Objective:** Verify that a Branch can keep a supplier that is not assigned to its Agency.

**Preconditions:** BRN265 has at least one supplier (e.g. NDCsbr) that is **not** ticked in AGN9780's Product Access. Nothing is saved by this case.

**Steps:**

1. Open BRN265 for edit and record its suppliers.
2. Leave BRN265 without saving.
3. Open AGN9780 for edit and read **Product Access Details**.
4. Leave AGN9780 without saving.

**Expected Result:** BRN265 lists the supplier. AGN9780 lists it as **not assigned**. Both records stay Approved.

**Priority:** P2

**Tags:** Atomic, Integration

**Notes:** Branch and Agency each have their own CRUD (`PO-27`). The other direction is TC-AGENCY-091.

**Review:** Approved

**Automation:** Pending

### TC-BR-110 — An inactive credential leaves the Branch's Auto Reissue picker

**Objective:** Verify that a reissue credential made inactive is dropped from the Branch's saved selection and picker, while Auto Reissue stays on.

**Preconditions:** A supported GDS credential `{CRED}` that no other organisation uses, chosen in BRN265's PCC tab. BRN265 has Auto Reissue on with `{CRED}` selected, Approved.

**Steps:**

1. Open **Master → Supplier → Supplier Credentials** and search `{CRED}`.
2. Edit `{CRED}`, set its status to **Inactive**, and save.
3. Open BRN265 for edit (Admin → Branch).
4. Read **Auto Reissue** and **Auto Reissue Credentials**.
5. Open **Auto Reissue Credentials** and read the options.
6. Leave the form without saving.
7. Set `{CRED}` back to **Active** and save.

**Expected Result:** After step 4, `{CRED}` is no longer in the saved selection, and **Auto Reissue** is still ticked. After step 5, `{CRED}` is not offered.

**Priority:** P1

**Tags:** Scenario, Negative, Integration

**Notes:** Ask the user before running this case. It changes **shared master data** (Master → Supplier) on staging, which affects every organisation that uses it. Use only a supplier/credential that no other organisation uses, record the grant in the run's `SafetyAuthorizations.json` first, and **set it back to Active at the end**. Spec §4. Can share `{CRED}` and the same inactive window with TC-AGENCY-092. Afterwards restore BRN265 to NDCSabre staging (313).

**Review:** Approved

**Automation:** Pending

### TC-BR-111 — What the Branch's Auto Reissue picker shows when the supplier is made inactive

**Objective:** Find out what happens to the Branch's Auto Reissue selection and picker when the credential's supplier is made inactive.

**Preconditions:** As TC-BR-110, using a GDS supplier `{SUP}` that no other organisation uses. BRN265 has Auto Reissue on with a `{SUP}` credential selected, Approved.

**Steps:**

1. Open **Master → Supplier → Supplier** and search `{SUP}`.
2. Edit `{SUP}`, set its status to **Inactive**, and save.
3. Open BRN265 for edit.
4. Read **Auto Reissue**, **Auto Reissue Credentials** and **Product Access Details**.
5. Open **Auto Reissue Credentials** and read the options.
6. Leave the form without saving.
7. Set `{SUP}` back to **Active** and save.

**Expected Result:** The tester records what is shown in steps 4–5, and the reviewer confirms whether it is intended. Spec §4 suggests the credential is dropped and not offered, with Auto Reissue still ticked.

**Priority:** P2

**Tags:** Scenario, Exploratory, Integration

**Notes:** Ask the user before running this case. It changes **shared master data** (Master → Supplier) on staging, which affects every organisation that uses it. Use only a supplier/credential that no other organisation uses, record the grant in the run's `SafetyAuthorizations.json` first, and **set it back to Active at the end**. Exploratory: the specification covers an inactive credential, not an inactive supplier.

**Review:** Approved

**Automation:** Pending

### TC-BR-112 — Admin hides Reissue for a Branch booking on hold

**Objective:** Verify that the Admin Itinerary does not show Reissue for a Branch booking whose status is On Hold.

**Preconditions:** BRN265 has Auto Reissue on (Approved). Booking `NDCEG-BR-F251103CdegUo` (BRN265, On Hold) is not locked by another user.

**Steps:**

1. Open **Booking-Mid Office → Search Booking** (`/booking/search-booking`).
2. Click the **Flight** tab.
3. Enter Booking Reference `NDCEG-BR-F251103CdegUo` and click **Search**.
4. Open the booking from the result row.
5. Click the lock icon on the **Created By** card.
6. Click **View Passenger Details**.

**Expected Result:** The **Reissue** button is not shown.

**Priority:** P2

**Tags:** Atomic, Negative

**Notes:** Added 2026-09-25 with the booking the user supplied. Only Status **Booked** shows Reissue (spec §5, `PO-24`). Never click **Reissue**, **Release PNR** or **Void / Cancel**.

**Review:** Approved

**Automation:** Pending
