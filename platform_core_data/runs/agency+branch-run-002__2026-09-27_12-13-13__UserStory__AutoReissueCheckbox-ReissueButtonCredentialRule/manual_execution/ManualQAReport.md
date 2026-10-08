# Manual QA Report — Auto Reissue checkbox: the Reissue button's credential rule

**Status: Pending Review** · run-008 · 2026-09-27

## 1. Run Identification

| Field | Value |
|---|---|
| Run folder | `agency+branch-run-002__2026-09-27_12-13-13__UserStory__AutoReissueCheckbox-ReissueButtonCredentialRule` |
| Refines | run-006 (Auto Reissue checkbox — Agency and Branch) |
| Run Scope / Run Type | User Story / **Selective Re-run** |
| Modules | `agency`, `branch` |
| Target environment | Shared staging — Admin `http://192.168.1.60`, Portal `http://192.168.1.60:9500` |
| Execution window | 2026-09-27, 09:40–11:25 UTC (1h 45m) |
| Executed by | Manual Execution stage (4M), Browser Driver, **headless** |

## 2. Executive Summary

The product owner answered the question this team had left open: **when does the `Reissue` button appear on a booking?** The answer is that **two** things must both be true — the organisation's **Auto Reissue** checkbox must be ticked, **and** the credential it has selected for Auto Reissue must be the same credential the ticket was booked on. If either is missing, the button is not shown.

That answer is now recorded as decision **`PO-28`**, and it **replaces `PO-22`**, which had said the checkbox alone controlled the button and the credential was only checked later, when someone clicked it. Because `PO-22` was wrong, two approved test cases were expecting the wrong thing. Those two were corrected first, then all sixteen button-display cases were re-run to check the corrected rule against the live application.

**The rule holds.** With Auto Reissue switched on but pointed at a different credential from the one the booking used, the button did not appear — on the Agency booking and on the Branch booking alike. The two corrected cases now pass.

**All sixteen cases passed, and no defect was found.** Two of them briefly did not. TC-AGENCY-077 and TC-BR-102 each checked a second, separate thing in the same breath — that the **Manual Reissue** button is still offered when Auto Reissue is switched off — and it was not offered. The product owner then confirmed that **Manual Reissue is not part of this story**. That clause was removed from the affected cases, and both pass on what remains. What was seen about Manual Reissue is kept in the detailed results as an observation for whoever owns that control; it is not a defect of this story.

**Nothing was left changed on the shared environment.** Every setting this run touched was put back, and the final state was read back and saved as proof.

## 3. Outcome Figures

| Status | Count | Share of executable scope |
|---|---|---|
| **Passed** | 16 | 100% |
| **Failed** | 0 | 0% |
| Blocked | 0 | 0% |
| Skipped | 0 | 0% |
| Not Executed | 0 | 0% |
| Inconclusive | 0 | 0% |
| Excluded | 0 | 0% |

**Two denominators, stated separately:**

| Figure | Value | What it means |
|---|---|---|
| Suite total | 206 | Every case in the `agency` (94) and `branch` (112) suites |
| **Executable scope** | **16** | The cases this selective re-run was asked to cover; every one reads `Review = Approved` |
| Excluded | 0 | No case in scope was withheld at review |
| **Pass rate (executable scope)** | **16 / 16 = 100%** | The pass rate is against the 16 in scope, not against 206 |

This run deliberately covered only the Reissue-button display cases. The other 190 suite cases were **not** in scope and are neither passed nor failed by this run.

## 4. Requirement Coverage

Computed from `modules/agency/test_design/TraceabilityMatrix.md` and `modules/branch/test_design/TraceabilityMatrix.md`.

| Requirement | Covered by | Verification state |
|---|---|---|
| **`PO-28`** — the button needs the checkbox **and** a matching credential *(supersedes `PO-22`)* | TC-AGENCY-082, TC-BR-103 (negative); TC-AGENCY-076, 079, 081, TC-BR-101, 104 (positive) | **Verified** — every covering case passed, in both directions |
| `PO-16` — Agency and Branch checkboxes are independent | TC-AGENCY-078, TC-BR-104 | **Verified** |
| `PO-24` — the Itinerary condition is Status `Booked` | TC-AGENCY-084, TC-AGENCY-094, TC-BR-112 | **Verified** |
| `PO-25` — the Portal is in scope, and shows `Reissue` without a lock | TC-AGENCY-079, 080, 081, 094 | **Verified.** The decision's Manual Reissue clause is out of scope (`PO-29`) and was not asserted |
| `PO-26` — an on-behalf booking follows the Agency it belongs to | TC-AGENCY-083 | **Verified** |
| spec §5 — the Itinerary's display conditions | TC-AGENCY-076, 077, TC-BR-101, 102 | **Verified** for the `Reissue` button on all four. The `Manual Reissue` half of §5 is **out of scope** for this story (`PO-29`) and is deliberately not verified here |
| `RSK-013` — which value the Itinerary uses while a change is pending | TC-AGENCY-085 | **Not verified — open question.** The behaviour was recorded, not judged: the Itinerary follows the pending, unapproved value. A product decision is still owed (REC-008-2) |
| **`PO-29`** — `Manual Reissue` is out of scope for this story | — (asserted by no case, by decision) | **Not applicable** — a scope decision, not a testable requirement |
| ~~`PO-22`~~ — the button is independent of the selected credential | — | **Withdrawn** on 2026-09-27; replaced by `PO-28` |

**7 of 7 testable requirement rows verified. 1 open question (`RSK-013`). 0 partially verified. 0 uncovered.** `PO-29` is a scope decision rather than a requirement, and `PO-22` is withdrawn.

## 5. Defect Register

**No defects.** Every case in scope passed, and no `Failed` or `Inconclusive` result stands.

### Observation carried out of scope

Two cases briefly failed on a clause about the **Manual Reissue** button before the product owner confirmed that Manual Reissue is not part of this story (`PO-29`). The clause was removed and both cases pass. The behaviour is recorded here so it is not simply lost:

> With the owning organisation's Auto Reissue checkbox **off**, the `Reissue` button was correctly hidden — and `Manual Reissue` was missing too, with `Void / Cancel` in its place, while the page's own API reported `canManualReissue: true`. Manual Reissue appeared only on the one booking held by a **different** user. Seen four times across both modules. Lock ownership is the strongest explanation but was not isolated from a second possibility (a void-eligibility time window).

This belongs to whoever owns the Itinerary action bar. It is **not** a defect of the Auto Reissue checkbox story, and nothing in this report depends on it. Full detail: `ManualExecutionResults.md` §3.1.1.

## 6. Assumptions and Risks Resolved

| Carried item | Where from | Resolution |
|---|---|---|
| `DS-2` — hide the button, or show it and refuse on click? | run-007 Discovery, Pending Confirmation | **Confirmed: hide it.** The product owner's answer became `PO-28`, and this run verified it directly on both an Agency and a Branch booking |
| `PO-22` — the button is independent of the selected credential | run-006 Stage 2 | **Refuted.** Withdrawn and replaced by `PO-28` |
| REC-2 (run-006) — should an inactive supplier's credential stay selectable? | run-006 | **Still unresolved** — not in this run's scope |
| REC-1 / `RSK-013` — should the Itinerary follow a pending change? | run-006 | **Still unresolved, and reproduced.** With the change pending and unapproved, the button was already showing |

## 7. Known Limitations

- **The run was headless.** This stage normally runs with a visible browser so a person can watch each step happen. The user was asked beforehand and chose headless. Screenshots and API responses were captured exactly as they would have been otherwise, so no result changes — what is missing is the live human observation.
- **A scope decision was taken mid-stage.** Three approved cases asserted something about `Manual Reissue` when this run began. The product owner ruled it out of scope (`PO-29`) afterwards and the clause was removed. Two cases changed from Failed to Passed **because the expectation changed**, not because anything was re-run.
- **Credential 313 had to be borrowed.** Both organisations had been reduced to a single credential after run-006, so the "wrong credential" state did not exist. Supplier NDCsbr with credential 313 was attached with the user's explicit go-ahead, used for the two cases, and detached again.
- **One lock was left in place** — `NDCEG-BR-F2609242aZ6EJ` was already held by `odeysysadmin` before this run began. It is not ours to release, and the case that used that booking did not depend on it.
- **The test design was amended and approved the same day**, by the person who asked for the change. A reviewer wanting an independent check should read `modules/*/test_design/` before accepting these results.
- **Video and console logs were not collected.** Screenshots, API responses and structured per-case observations were.

## 8. Recommendations

| ID | Recommendation | Applies to |
|---|---|---|
| REC-008-1 | Pass the Manual Reissue observation (§5) to whoever owns the Itinerary action bar, as information rather than as a defect of this story | out of scope (`PO-29`) |
| REC-008-2 | Answer the question run-006 raised as REC-1: should the Itinerary act on an Auto Reissue change **nobody has approved yet**? Today it does | TC-AGENCY-085 |
| REC-008-3 | Record `PO-28` as confirmed in the `reissue-flow` context and close run-007's `DS-2` | run-007 |
| REC-008-4 | Keep a second reissue-eligible credential permanently attached to AGN9780 and BRN265, so these two cases can run without changing Product Access each time | TC-AGENCY-082, TC-BR-103 |
| REC-008-5 | Re-check the remaining 48 auto-reissue cases from run-006 against `PO-28`; this run covered only the button-display ones | run-006 suite |
