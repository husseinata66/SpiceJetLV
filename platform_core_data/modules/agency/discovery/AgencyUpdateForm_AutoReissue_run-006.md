# Discovery Snapshot — Agency form: Auto Reissue (Create and Update)

| Field | Value |
|---|---|
| Module | `agency` |
| Produced by run | `run-006__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Revision | 1 |
| Screen / State | Add Agency (unsaved) and Edit Agency AGN9780: Auto Reissue off, on, on with an empty picker |
| URL / Route | `/admin/agency/add` · `/admin/agency/edit/10961` |
| Discovery Mode | Browser automation — Browser Driver, headed |
| Evidence Category | Direct Observation / System Response |
| Captured | 2026-09-23 21:24 – 2026-09-24 13:13 UTC |
| Role / Credential used | Super Admin (`odeysysadmin` role) |

## 1. Purpose

The Agency form carries the organization's **Auto Reissue** flag and its **Auto Reissue Credentials**. Together they decide whether the Itinerary shows `Reissue` for the Agency's bookings (spec §5).

## 2. Entry Points

| From | Action | Result |
|---|---|---|
| Admin → Agency grid | Add | Empty Add Agency form |
| Admin → Agency grid (search by code, status Both) | Edit pen on AGN9780 | Edit form, pre-filled |

## 3. Structure

| Region / Section | Type | Notes |
|---|---|---|
| Agency Features | Checkbox group | Holds **Auto Reissue** (next to the existing feature checkboxes) |
| Auto Reissue Credentials | Multi-select | Shown only while Auto Reissue is ticked |
| Airline Supplier credential (PCC) | Tabs, one per assigned GDS supplier, each a multi-select | The source of the Auto Reissue picker's options (`PO-21`) |
| Footer | Buttons | Send For Approval · Approve · Cancel (Remarks box above them) |

## 4. Interactive Elements

Locators are **not recorded** here: selectors belong to Stage 4A (explorer-skill §5.15).

| Element | Type | Label / Accessible Name | Locator | Required? | Notes |
|---|---|---|---|---|---|
| Auto Reissue | Checkbox | "Auto Reissue" | — (§5.15) | No | Default unchecked on Add. Toggling makes no server call |
| Auto Reissue Credentials | Multi-select | "Auto Reissue Credentials" | — | Yes, when ticked | Options = tab-chosen credentials of assigned GDS suppliers on the supported list |
| Send For Approval | Button | "Send For Approval" | — | — | `PUT /odeysysadmin/Admin2/agency/{id}`; the Agency goes Inactive + Pending |
| Approve (edit form) | Button | "Approve" | — | — | Saves and approves in one `PUT` |

## 5. Observed Validation & Business Rules

| Field / Action | Observed Behaviour | Trigger | Finding ID (if raised) |
|---|---|---|---|
| Auto Reissue on, picker empty | "Required" under the picker; no request | Send For Approval | FINDING-013 |
| Body `reissueCredentials [{}]` | 400 "Every auto-reissue credential must have an ID" | In-flight body edit | — |
| Body `[999999]` | 400 "Every auto-reissue credential must exist and be active"; briefly shown on screen | In-flight body edit | — |
| Body `[315, 315]` | 400 "Auto-reissue credentials must not contain duplicates" | In-flight body edit | — |
| Body `[277]` (not mapped at that time) | 400 "Each auto-reissue credential must be mapped to this organization" | In-flight body edit | — |
| Untick and save | UI sends `[]`; server keeps the stored credentials (S-7) | Send For Approval → Approve | — |
| Re-tick | Picker pre-filled with the stored credential | Tick | — |

## 6. States Observed

| State | How Reached | What Differs |
|---|---|---|
| Off (default) | Add form; AGN9780 at baseline | No picker |
| On | Tick | Picker visible: 315 + 313 offered on 2026-09-23; only 277 on 2026-09-24 13:11 (after the user's manual changes) |
| Pending | After Send For Approval | Agency Inactive, "Pending for approval" in the grid (FINDING-014) |

## 7. System Responses

| Type | Observation |
|---|---|
| Network | `PUT /odeysysadmin/Admin2/agency/10961` 204 · `PATCH /odeysysadmin/Admin2/agency/approveOrReject` 200 · `GET /odeysysadmin/Admin2/agency/10961` returns `autoReissueEnabled`, `reissueCredentials` |
| Network | The update body carries the stored `remarks` ("Approved") when none is typed |

## 8. Evidence Captured

| Evidence | Path |
|---|---|
| Screenshots | `runs/run-006…/discovery/evidence/01-agency-add-form.png`, `02-…`, `07`, `08`, `10`–`14`, `24`, `25`, `34-rule-*`, `35`, `38` |
| Data | `06-AGN9780-baseline-before-changes.json`, `34-rules-results.json`, `43-portal-cycle-results.json`, `44-session-output-extract.txt` |

## 9. Not Captured

| Missing Item | Reason |
|---|---|
| Console log | Not collected by these scripts; no console-driven Finding was raised |
| Create Agency saved with Auto Reissue on | No Agency was created (the run used the designated AGN9780) |

## 10. Findings Raised From This Screen

| Finding ID | Category | Severity |
|---|---|---|
| FINDING-013 | Requirement Gap | N/A |
| FINDING-014 | Observation | N/A |
