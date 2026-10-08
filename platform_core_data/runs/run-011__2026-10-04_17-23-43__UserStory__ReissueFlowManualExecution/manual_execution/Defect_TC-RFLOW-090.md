# TC-RFLOW-090 — The Sync action is not available on a Reissue offer

| Field | Value |
|---|---|
| **Test Case ID** | `TC-RFLOW-090` |
| **Execution Status** | **Failed** |
| **Execution Time** | 2026-10-07, Admin `http://192.168.1.60`, headed Chrome |
| **Run** | `run-011__2026-10-04_17-23-43__UserStory__ReissueFlowManualExecution` |

**Preconditions.** A booking produced by a completed Auto Reissue exchange, open on the Admin
Itinerary, with the booking's control (lock) held so the action buttons render.

**Test Data.** `NDCEG-BR-F260929pbzn43`, order `BRN503NDCORD260929SLZ7TU`, Branch BRN503 — the new
booking created by the exchange of `NDCEG-BR-F260929u1ptMk`.

**Steps Performed.**

1. Opened the reissue offer's Itinerary on Admin.
2. With the booking's control held, read the complete set of action buttons offered.

**Expected Result.** `AC-28` requires that a Reissue offer **cannot perform the Sync action**. Sync PNR
re-reads the booking from the supplier; on an offer created by an exchange this is not a supported
operation, so the control must not be offered at all. The suite asserts only its **absence** — Sync is
never exercised (`DS-5`).

**Actual Result.** **Sync PNR is offered on the reissue offer.** With the control held by
`odeysysadmin`, the Itinerary renders:

```
Time Limit · History · Manual Reissue · Sync PNR · Release PNR · Reissue
```

`Sync PNR` is present and enabled. `Manual Reissue` — also outside this feature's scope — is offered
alongside it.

**Impact.** An operator can trigger a supplier re-read against a booking the application created
through an exchange. `AC-28` exists because that operation is not supported on a reissue offer; what
it does to the exchanged booking's state is undefined, and this run did **not** click it.

**Classification.**

| Field | Value |
|---|---|
| Category | **Workflow** — an action is offered in a state where the requirement forbids it |
| Layer | **Frontend** — the control's visibility rule, as far as the evidence reaches. Whether the backend would also accept the call was not tested |
| Reproducibility | **Unable to confirm** — one observation, on one booking, with one role |
| Regression | **Unknown** |
| Suspected Component | The Itinerary action bar's visibility rules for a booking whose origin is an exchange |
| Confidence | **Medium** — the observation is unambiguous, but it was made under a different role from the earlier contradicting one (see below), and only one reissued booking was examined |

**Root Cause Analysis.** *(Inference, hedged.)* Likely the Itinerary's action bar is gated on **role
and lock** but not on **whether the booking originated from a reissue**, so `AC-28`'s exclusion was
never implemented as a condition on the control.

**Conclusion.** The defect is that **Sync PNR is reachable on a reissue offer**, which `AC-28`
forbids.

**Severity: Medium.** Reason: an unsupported operation is reachable on an exchanged booking, though
this run did not establish what it does when invoked.

**Priority: P2.**

**Evidence.** `artifacts/tc090-recheck-pbzn43.png`

## Correction — this case was first recorded Passed, in error

It was recorded **Passed** earlier the same day, from this reading of the same Itinerary:

```
Time Limit · Void / Cancel · Release PNR · Reissue
```

No Sync. The executor read that absence as the rule being enforced.

**What actually happened: the page was read before it had finished re-rendering.** The executor
clicked **Take Control** and sampled the action buttons about eight seconds later **without reloading
the page**. The action bar had not refreshed for the new lock state, so the capture was half old and
half new. The correct reading comes from a fresh page load with the control already held:

```
Time Limit · History · Manual Reissue · Sync PNR · Release PNR · Reissue
```

**Why a permissions difference is ruled out.** The first reading contains **Void / Cancel**, which the
second does not. A more privileged account renders a superset, never a different set with items
missing in both directions. The two captures differ because one of them was taken mid-update, not
because the accounts differ — the product owner confirms the button displays for either account
(2026-10-07).

**The method error, recorded so it is not repeated:** *after an action that changes a screen's state,
reload before reading it.* An action bar sampled during its own re-render is not evidence of
anything. This is the second reading error in this run — the first being the Finance Report, where
only page 1 of 4 was read (`Observation_FinanceReportPagination.md`). Both share one root: treating
**"I did not see it"** as **"it is not there"**, without first confirming the view was complete.
