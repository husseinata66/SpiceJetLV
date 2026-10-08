# Test-case discrepancies raised by Stage 4M — run-011

> Escalated to Stage 3, never corrected here (`manual-execution-skill` §12 rule 8). Each entry is a
> **documentation gap** — the test case is wrong, the application is not.

| # | Case | Raised | Status |
|---|---|---|---|
| DISC-1 | `TC-RFLOW-031` | 2026-10-05 | Open — needs a Stage 3 revision |
| DISC-2 | `TC-RFLOW-102` | 2026-10-05 | Open — needs a Stage 3 revision |
| DISC-3 | `TC-RFLOW-115` | 2026-10-05 | Open — needs a Stage 3 revision; **closes OQ-F3** |

## DISC-1 — TC-RFLOW-031's expected result states the wrong rule

**The case says:** "The old flight date cannot be selected" — the journey's **original departure date**
is disabled in the picker, and a search using it is prevented. It cites AC-12, story §3 AC-3 and edge
case 3.1.

**The product owner's rule (Mohamed Soliman, 2026-10-05):** selecting the originally ticketed date is
**not** a problem. The restriction is on **dates in the past — before today**.

**What the application actually does, observed on `NDCEG-BR-F260926PwYMR2`:**

| Month | Behaviour |
|---|---|
| September 2026 (wholly past) | **Every day disabled** |
| October 2026 (today = 5 Oct) | 1–4 **disabled**; 5 onward enabled |
| December 2026 (wholly future) | All days enabled, including **1 Dec, the ticketed date** |

So the application implements *"no date before today"* exactly, and permits the ticketed date — which
is the behaviour the product owner confirms is correct.

**Disposition.** `TC-RFLOW-031` is recorded **Passed** against the real rule. It was first recorded
`Failed` against the case as written; that classification is withdrawn, and no defect is raised
against the application.

**What Stage 3 should change.** Rewrite the expected result as *"a departure date earlier than today
is disabled in the picker and cannot be searched; the originally ticketed date remains selectable."*
Re-check **AC-12** and story §3 AC-3 while doing it: if the story really does say the old date cannot
be chosen, the story is wrong too and the ACs need the same correction — the case may have been a
faithful reading of a requirement that does not match the agreed behaviour.

**One minor observation, not a defect.** The picker's "previous month" arrow stays enabled even when
the whole month it would show is in the past. Nothing can be selected there, so no wrong date can be
submitted.


## DISC-2 — TC-RFLOW-102 expects an empty state the product does not want

**The case says:** on a booking that has never been reissued, the Auto Reissue History component must
show "an appropriate **empty state** rather than an error or a blank region". It covers edge case 7.1.

**What the application does, observed on `NDCEG-BR-F260926PwYMR2`:** the component is **not rendered
at all** — no heading, no table, no message, no error. Verified after scrolling the full page and
waiting for lazy content, by element class and by text, against `NDCEG-BR-F260929pbzn43` as the
positive control, where the component and its text are both present.

**The product owner's ruling (Mohamed Soliman, 2026-10-05):** this is correct behaviour. Hiding a
section that has nothing in it is the intended design; rendering an empty Reissue History table on
every never-reissued booking would be clutter.

**Disposition.** `TC-RFLOW-102` is recorded **Passed**. It was first recorded `Failed` against the
case as written; that classification is withdrawn, and no defect is raised against the application.

**What Stage 3 should change.** Rewrite the expected result as *"the Auto Reissue History component is
not displayed on a booking with no reissue history, and no error is shown"*. Then re-check **edge case
7.1** itself: the case followed it faithfully, so if 7.1 really does require a visible empty state,
the requirement is the thing that disagrees with the product, not the test.

**Note the asymmetry, which is real and may be deliberate.** PNR Query shows *"No data has been
found!"* for the same situation; the Itinerary shows nothing. Two screens in one application answering
"no history" differently is worth a product decision, but it is not a defect either way.


## DISC-3 — TC-RFLOW-115 is Pending Confirmation on a question now answered: OQ-F3

**The case says:** *Pending Confirmation.* The story requires the new booking's relationship to the
original to be displayed; run-009 observed the reissued booking's own Reissue History to be empty and
raised **OQ-F3** — is the backward link required?

**What this run observed, on `NDCEG-BR-F260929u1ptMk` → `NDCEG-BR-F260929pbzn43`:**

| Screen | Querying the original | Querying the new booking |
|---|---|---|
| **Itinerary** — Auto Reissue History | both rows shown | **both rows shown** |
| **PNR Query** — Reissue History List | both rows shown | **"No data has been found!"** |

So the Itinerary is two-directional and PNR Query is one-directional. The observation is stable — it
matches run-009's exactly.

**The product owner's ruling (Mohamed Soliman, 2026-10-05):** *"the behaviour in Itinerary in reissue
history is two direction but in PNR Query is one direction and this is system behaviour not an
issue."* **OQ-F3 is closed: the backward link is NOT required in PNR Query.**

**Disposition.** `TC-RFLOW-115` is recorded **Passed**. No defect is raised. The asymmetry between the
two screens is intended, not an inconsistency to fix.

**What Stage 3 should change.** Remove the `Pending Confirmation` expected result and replace it with
the ruled behaviour: *"PNR Query displays the Reissue History on the original booking only; querying
the new booking returns the empty state. The two-directional view is the Itinerary's Auto Reissue
History, not PNR Query's."* Drop **OQ-F3** from the open-questions list, and re-check **edge case 8.6**
and **AC-27**, which the case cites — if either reads as requiring a backward link in PNR Query, the
requirement needs the same correction.
