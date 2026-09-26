# FINDING-013 — With Auto Reissue on and no credential, the screen shows "Required", not the specification's message

| Field | Value |
|---|---|
| **Finding ID** | FINDING-013 |
| **Title** | With Auto Reissue on and no credential chosen, the form shows "Required"; the specification's *"Select at least one eligible credential"* is the API's message |
| **Category** | Requirement Gap |
| **Severity** | N/A |
| **Severity Reason** | Not a defect. The Stage 1 source (spec `S-2`) gave one message, and the application has two layers that each show their own. The user settled which message belongs to which layer (`PO-23`). A wording difference that is intended is not given a severity. |
| **Confidence Score** | 97% |
| **Evidence Category** | Direct Observation |
| **Status** | **Rejected — Confirmed Intended Behaviour** (user, 2026-09-24, recorded as `PO-23`) |
| **Discovery Mode** | Browser automation — **Browser Driver**, headed, `http://192.168.1.60` |
| **Business Risk** | None identified. A test that expects the specification's text on the screen would fail for a reason that is not a defect. `PO-23` removes that risk. |
| **Technical Risk** | None identified. The UI stops the save before any request is sent, so the API rule was not reached from the screen. The API message itself was not probed for `S-2` in this run. |
| **Module** | `agency` |
| **Workflow** | Admin → Agency → edit AGN9780 (`/admin/agency/edit/10961`) → Agency Features → Auto Reissue → Send For Approval |

## Description

With **Auto Reissue** ticked and the **Auto Reissue Credentials** picker emptied, clicking **Send For Approval** does not save. A red **"Required"** appears under the picker. No request reaches the server.

## Expected Behavior

- Stage 1 source: spec §3 `S-2` (*"Auto Reissue on + no credential → 'Select at least one eligible credential'"*), cited by agency ProjectContext §2 (*Reissue-credential selection (UI)*).
- Current Project Context, `PO-23` (§1.3, added during Stage 2): *"The UI blocks the save and shows **"Required"** under the picker. **"Select at least one eligible credential"** is the **API's** message, returned only when such a request reaches the server."*

## Actual Behavior

At 10:30:10 UTC the picker had been pre-filled with "Sabre Staging" and was cleared to "Select". On Send For Approval: `httpStatus: "no request sent"`, and the field showed "Required". AGN9780 stayed `status 1`, `approvalStatus 1` (unchanged).

## Steps to Reproduce

1. Log in to Admin (`odeysysadmin` role). Open `/admin/agency/edit/10961` (AGN9780).
2. Tick **Auto Reissue**. Open **Auto Reissue Credentials** and clear every selection.
3. Click **Send For Approval**. "Required" appears under the picker, and nothing is saved.
4. Leave without saving.

## Investigation/Recovery Result

Investigation and Recovery Engine, **"Validation failure"** category: no retry, by rule, since validation is deterministic. It was observed once, and the record was read back unchanged.

## Investigation Notes

The other four specification rules (`S-4`, `S-5`, `S-6`, `S-8`) were probed at the API layer in the same session. The app's own save request was changed in flight, which works only on AGN9780 (a DedicatedTestData grant). Each returned **400** with the specification's exact message, and nothing was saved (`34-rules-results.json`). `S-5` also showed its message briefly on screen (`35-rule-S-5-ui-right-after-400.png` in the run evidence). **Not probed:** sending an `S-2`-shaped body (on, empty list) straight to the API to see the API's message. That is a Stage 3 API case.

## Occurrence Count

1

## Evidence Links

| File | What it shows |
|---|---|
| `34-rule-S-2.png` | The form after Send For Approval, with "Required" under the empty picker |
| `34-rules-results.json` | S-2: no request sent. S-4, S-5, S-6, S-8: the request, the 400, and the exact message |

The originals are also in `runs/run-006…/discovery/evidence/`.

## Recommendation

No action is needed on the application. For Stage 3, assert **"Required"** on the screen case and *"Select at least one eligible credential"* on a separate API case (`PO-23`).
