# Discovery Snapshot — Branch form: Auto Reissue (Create and Update)

| Field | Value |
|---|---|
| Module | `branch` |
| Produced by run | `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Revision | 1 |
| Screen / State | Add Branch (never saved): Auto Reissue ticked, with suppliers ticked one at a time · Edit BRN265: Auto Reissue off and on |
| URL / Route | `/admin/branch/add` · Edit Branch for BRN265 (id 10950) |
| Discovery Mode | Browser automation — Browser Driver, headed |
| Evidence Category | Direct Observation / System Response |
| Captured | 2026-09-23 21:24 – 2026-09-24 10:51 UTC |
| Role / Credential used | Super Admin (`odeysysadmin` role) |

## 1. Purpose

The Branch form carries the Branch's own **Auto Reissue** flag and credentials, independent of its Agencies (`PO-16`).

## 2. Entry Points

| From | Action | Result |
|---|---|---|
| Admin → Branch grid | Add | Empty Add Branch form |
| Admin → Branch grid | Edit pen on BRN265 | Pre-filled Edit form (Remarks box present) |

## 3. Structure

| Region / Section | Type | Notes |
|---|---|---|
| Product Access Details | Supplier rows | An LCC row carries its own credential choice |
| Airline Supplier credential (PCC) | One tab per ticked GDS supplier, each a multi-select | Feeds the Auto Reissue picker |
| Import PNR / Auto Reissue | Checkboxes | Auto Reissue sits beside Import PNR |
| Auto Reissue Credentials | Multi-select | Shown when Auto Reissue is ticked |
| Remarks + footer | Text + buttons | Remarks were entered on every save |

## 4. Interactive Elements

Locators are not recorded (explorer-skill §5.15).

| Element | Type | Label / Accessible Name | Locator | Required? | Notes |
|---|---|---|---|---|---|
| Auto Reissue | Checkbox | "Auto Reissue" | — | No | Default unchecked |
| Auto Reissue Credentials | Multi-select | "Auto Reissue Credentials" | — | Yes, when ticked | "No results found" with no suppliers |
| GDS PCC tab | Multi-select | the supplier's name | — | — | Can hold several credentials |

## 5. Observed Validation & Business Rules

| Field / Action | Observed Behaviour | Trigger | Finding ID (if raised) |
|---|---|---|---|
| LCC AirArabiaEgypt ticked, row credential chosen | Picker empty | Tick Auto Reissue | — |
| Galileo tab → GalileoLive | Picker ["GalileoLive"] | Same | — |
| Amadeus tab → Amadeus Live | Picker empty (Amadeus isn't on the supported list, `PO-21`) | Same | — (candidate closed as intended) |
| BRN265 untick → save → approve | Details GET `false`, `[313]` kept | Send For Approval → approve | — |
| BRN265 re-tick | Pre-filled "NDCSabre staging" | Tick | — |

## 6. States Observed

| State | How Reached | What Differs |
|---|---|---|
| Add, no supplier | Open Add | Picker "No results found" |
| Add, supplier ticked | Tick a supplier / choose a tab credential | Picker options per `PO-21` |
| BRN265 on / off | Edit, save, approve | Flag toggled; credentials kept |
| Pending | After Send For Approval | Grid "Pending for approval" |

## 7. System Responses

| Type | Observation |
|---|---|
| Network | `PUT /odeysysadmin/Master2/Branch/10950` 204 · `PATCH /odeysysadmin/Master2/Branch/approveOrReject` 200 (`remarks`, `approvalStatus`, `code`) · `GET /odeysysadmin/Master2/Branch/BRN265/details` (`autoReissueEnabled`, `reissueCredentials`, `productAccessDetails[].credentials[].autoReissueAllowed`) |

## 8. Evidence Captured

| Evidence | Path |
|---|---|
| Screenshots | `runs/run-006…/discovery/evidence/01-branch-add-form.png`, `02-branch-add-…`, `03-…`, `30-BRN265-off-before-send.png`, `39-NEWBRANCH-*`, `40-NEWBRANCH-unsaved-gds-tabs-and-picker.png` |
| Data | `05-BRN265-baseline-before-changes.json`, `33-branchbooking-cycle-results.json`, `44-session-output-extract.txt` |

## 9. Not Captured

| Missing Item | Reason |
|---|---|
| Saving without Remarks | Not tried (A-BR-R6-1) |
| A saved new Branch | No Branch was created (`AUTH-BRANCH-CREATE` revoked) |
| TravelportNdc tab | Not tried |

## 10. Findings Raised From This Screen

None. FINDING-017 was raised from the Itinerary, which is recorded in `agency/discovery/BookingItinerary_Admin_run-006.md`.
