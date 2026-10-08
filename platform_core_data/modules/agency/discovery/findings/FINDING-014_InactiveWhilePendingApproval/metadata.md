# FINDING-014 — An Agency is Inactive while its Auto Reissue change waits for approval

| Field | Value |
|---|---|
| **Finding ID** | FINDING-014 |
| **Title** | Send For Approval puts the Agency into Inactive + "Pending for approval" until it is approved; the edit form's Approve avoids this |
| **Category** | Observation |
| **Severity** | N/A |
| **Severity Reason** | This is the platform's maker-checker behaviour, and the user confirmed it as normal (`PO-24`). No Severity Matrix criterion applies to confirmed intended behaviour. |
| **Confidence Score** | 96% |
| **Evidence Category** | Direct Observation |
| **Status** | **Rejected — Confirmed Intended Behaviour** (user, 2026-09-24, `PO-24`) |
| **Discovery Mode** | Browser automation — **Browser Driver**, headed |
| **Business Risk** | While a change is pending, the Agency is out of service. In a test run, a pending change can break a booking-side check that runs straight after it. |
| **Technical Risk** | None identified. |
| **Module** | `agency` |
| **Workflow** | Admin → Agency → edit AGN9780 → Auto Reissue on/off → Send For Approval → grid → approve (thumbs-up, Remarks) |

## Description

After **Send For Approval**, AGN9780 became **Inactive** with approval status **"Pending for approval"**. Approving it (the grid thumbs-up opens a required **Remarks \*** dialog, `PATCH /Admin2/agency/approveOrReject` → 200) returned it to **Active + Approved**. When the edit form's own **Approve** button was used instead, the same change was saved and approved in one `PUT /Admin2/agency/10961`, and the Agency never went Inactive.

## Expected Behavior

- Agency ProjectContext §2, *Maker–checker on the new field*: *"an Auto Reissue change goes through Send For Approval → Pending for approval → Approve before it takes effect"* (XC-01, XC-04).
- The Project Context did not say the Agency goes **Inactive** while pending. The user settled this at `PO-24` (§1.3): *"An organization is Inactive while its change is Pending for approval — normal behaviour. The edit form's own Approve button saves and approves in one step and avoids that state."*

## Actual Behavior

- **Send For Approval path** (2026-09-23 21:38–21:41 and 2026-09-24 10:04): PUT → 204, then Inactive + Pending, then PATCH approve → 200, then Active + Approved.
- **Edit-form Approve path** (2026-09-24 13:11:56 and 13:13:13): a single `PUT /odeysysadmin/Admin2/agency/10961` (`requests` in `43-portal-cycle-results.json`). Read back `approvalStatus: 1` straight away.

## Steps to Reproduce

1. Open `/admin/agency/edit/10961`. Change Auto Reissue. Enter Remarks. Click **Send For Approval**.
2. Search AGN9780 on `/admin/agency` with status **Both**. The row shows Inactive / Pending for approval.
3. Approve from the row (Remarks required). The row returns to Active / Approved.
4. Alternative: on the edit form, click **Approve** instead of Send For Approval. There is one request and no Inactive state.

## Investigation/Recovery Result

Not applicable. No failure category matched, because the behaviour is deterministic workflow.

## Investigation Notes

The same was seen on Branch BRN265 (grid "Pending for approval" at 10:27:11 and 10:28:02, then Approved). See the `branch` Timeline. Grid search needs status **Both** (`-1`) to find the Agency while it is Inactive.

## Occurrence Count

3 (AGN9780 on 2026-09-23 21:38, on 2026-09-24 10:04, and BRN265 during the 10:27 cycle). Plus 2 edit-form Approve runs with no Inactive state.

## Evidence Links

| File | What it shows |
|---|---|
| `10-AGN9780-after-send-for-approval.png` | The form right after Send For Approval |
| `11-AGN9780-grid-after-submit.png` | Grid row: Inactive, Pending for approval |
| `12-AGN9780-approve-dialog.png` | The approve dialog with its required Remarks |
| `13-AGN9780-grid-after-approve.png` | Grid row: Active, Approved |
| `43-portal-cycle-results.json` | Edit-form Approve: one `PUT`, `approvalStatus 1` |

## Recommendation

No action is needed on the application. For Stage 3: use the edit form's **Approve** in cases that don't test maker-checker itself, and keep one explicit case for the Send For Approval → Inactive/Pending → Approve path.
