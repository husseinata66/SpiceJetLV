# Discovery follow-up — Supplier / credential status and the Branch → Agency Auto Reissue picker

| Field | Value |
|---|---|
| Module | `agency` (with `branch`, `master-supplier`) |
| Produced by run | `agency+branch-run-001__2026-09-23_22-36-43__UserStory__AutoReissueCheckbox-AgencyandBranch` |
| Trigger | User report, 2026-09-26: *"there are some scenarios lead to the suppliers is assigned to agency but does not appear on the auto reissue picker"* |
| Discovery Mode | Browser automation — Browser Driver, headed. Checks as `Mohamed Soliman`; credential status changed as `odeysysadmin` (the only account with the credential Deactivate action) |
| Records | BRN265, AGN9780, supplier NDCsbr, credential 313 "NDCSabre staging" — all under the run's grants |
| Evidence | `runs/run-006…/manual_execution/artifacts/investigation-step-{1..7}.json` + `investigation-*.png` |
| Status | **Pending Review** |

## What each step showed

Baseline (step 1): BRN265 and AGN9780 both had Sabre (SabreLive 297), Galileo (5 credentials) and NDCsbr (313), and Auto Reissue on with all 7 credentials selected.

| # | Action | BRN265 (Branch) | AGN9780 (Agency) |
|---|---|---|---|
| 2 | Credential 313 **inactive** | NDCsbr row shows **unticked**, NDCsbr PCC tab disappears, 313 dropped from saved list and picker | NDCsbr **still ticked**, tab still shows 313, picker **still offers** 313; 313 dropped from saved list |
| 2 | 313 **re-activated** | Row and tab come back; **313 not restored** to the saved list | **313 not restored** to the saved list |
| 3 | 313 inactive, then an **ordinary Branch save** (no supplier change) | **NDCsbr removed from the Branch permanently** (the form had shown it unticked) | **NDCsbr removed from the Agency** (row gone) — cascaded |
| 3 | 313 re-activated | NDCsbr **stays removed** | NDCsbr **stays removed** |
| 5 | NDCsbr re-added to the Branch (313) | NDCsbr + 313 back | NDCsbr **re-added automatically**, 313 pre-chosen in its tab, offered in picker |
| 4 | Supplier NDCsbr **inactive**, then active | No change at all | No change at all |
| 6 | Agency: untick NDCsbr, save | — | NDCsbr unticked, not in picker (expected, `PO-27`) |
| 6 | Agency: tick NDCsbr again, save | — | Save **blocked**: PCC tab empty → "Required"; NDCsbr stays unticked until a PCC credential is chosen again |
| 7 | Branch: change Sabre tab to Sabre Staging, save | Save **did not go through**, no message shown (inconclusive) | — |

## Findings (for review — none is classified yet)

| ID | Observation | Why it matters | Category (proposed) |
|---|---|---|---|
| INV-1 | **A Branch save made while one of its credentials is inactive removes that supplier from the Branch and from every Agency under it — permanently.** The Branch form shows the supplier unticked during the inactive window, and saving persists that. | Silent data loss: after reactivation the supplier is gone from both, and the Agency picker no longer offers it. **This is the strongest candidate for the reported "supplier disappears" scenario.** | Data Integrity (Needs Human Review) |
| INV-2 | **Reactivating a credential does not restore it** to the Auto Reissue selections that read-time clean-up removed (Branch and Agency). | Auto Reissue can be left on with fewer credentials — or none — than configured. | Observation (decision needed; spec §4 silent) |
| INV-3 | **Branch and Agency behave differently for an inactive credential**: the Branch hides the supplier row and tab; the Agency keeps both and still offers it (TC-AGENCY-092, intended per the user). | Explains why the two screens disagree during an inactive window. | Observation (decided intended for the picker) |
| INV-4 | **Re-ticking a supplier on the Agency after a save needs its PCC credential chosen again** ("Required"). Re-ticking before saving restores it. | A supplier can look "assigned" on the Branch but not on the Agency until the PCC is re-chosen. | Observation |
| INV-5 | Branch save with the Sabre tab switched to Sabre Staging did not save and showed no message. | Not reproduced/explained; may be a hidden validation. | Open Question |

## Not reproduced

A state where the Agency shows a supplier **ticked with its PCC credential** and the picker still **does not offer** it was **not** reproduced in these 7 steps. INV-1 (supplier silently removed by a Branch save during an inactive window) and INV-4 (re-ticked without a PCC credential) are the two ways found that make a supplier's credential vanish from the Agency picker.

## Data state

All status changes were reverted immediately (313 inactive 13:32–13:33 and 13:35–13:37; NDCsbr inactive 13:42–13:43 UTC). During step 5 the investigation script also narrowed BRN265's Auto Reissue selection to [277] by mistake; at the end both records were restored to the step-1 baseline (all 7 credentials selected, NDCsbr/313 on both, Approved) — `artifacts/investigation-restore.json`.
