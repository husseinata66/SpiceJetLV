# OBS-4 — Three behaviours this run met that no test case covers

Found by executing the suite, not by reading it. None is a defect; each is a gap Stage 3 may want to
close.

## GAP-1 — Two save paths on the Branch form, and nothing tests the difference

*(Corrected 2026-10-07 on the product owner's explanation. The first version of this entry claimed
maker-checker prevents the submitting user from approving. That is wrong.)*

The Branch edit form offers **two** ways to save, and they are not equivalent:

| Control | Effect |
|---|---|
| **Approve** | The change is **active immediately** |
| **Send For Approval** | The change is **parked**; a further approval action is needed before it takes effect |

**Whether the same user may perform that approval depends on their role** — it is a permission
question, not a blanket maker-checker bar.

**What this run did, and what it cost.** Reverting the `TC-RFLOW-002` toggle, the executor used
**Send For Approval** rather than **Approve**. BRN265 therefore sat at **`Pending for approval`** with
the correct values stored but not in force, until the product owner activated it by hand. Using
**Approve** would have restored it in one step.

**Why it matters for this feature.** `D-14` condition 1 makes the Auto Reissue flag the first gate on
the entire Reissue flow, and the suite's §1 cases treat setting it as ordinary setup. In fact the
operator must choose between two save paths, and choosing the parked one leaves the organisation
inactive — with the Reissue button gone — until someone completes the approval.

**Suggested coverage:** one case asserting that **Approve** makes an Auto Reissue flag change take
effect immediately, and one asserting that **Send For Approval** leaves the previous behaviour in
force until the approval is completed.

## GAP-2 — `Send For Approval` and `Approve` fail silently

Across this session, **four** submissions on the Branch edit form did nothing: the page stayed on
`/admin/branch/edit/BRN265`, no toast appeared, no validation message, no field was marked invalid
(`.ng-invalid` returned nothing on inspection), and the stored state was unchanged. Successful
submissions are distinguishable only by navigation to `/admin/branch`.

**An operator cannot tell a refused save from a slow one.** This was found while exercising the form
repeatedly for `TC-RFLOW-002`; it is not specific to Reissue and belongs to the Branch module rather
than this suite.

## GAP-3 — Multi-city journey dates must stay in order, and nothing tests it

On the Portal multi-city booking, moving journey 1 to a date **after** journey 2's date left
`Search flights` **disabled**. Correct behaviour, never asserted: §4's cases cover the date restriction
(`TC-RFLOW-031`), the origin/destination combination (`TC-RFLOW-039`) and cabin (`TC-RFLOW-040`), but
nothing covers the ordering of dates **between** journeys on a multi-city reissue.

**Suggested coverage:** one case asserting that a later journey cannot be dated before an earlier one.

## GAP-4 — A zero or negative fare difference is structurally unreachable, not merely unsupplied

`TC-RFLOW-043` (zero difference displayed as zero), `TC-RFLOW-062` (a negative difference can never be
paid) and `TC-RFLOW-063` (a zero difference does not request a positive amount) are all recorded
**Blocked**. The reason is stronger than "no test data": **the condition cannot occur on this supplier.**

**Evidence, 2026-10-07.** Re-shopping `NDCEG-BR-F260926PwYMR2` for the **identical flight on the
identical date** — SV-300, 1 Dec 2026, the exact flight the four passengers already hold — still
quotes:

| Offer | Due now |
|---|---|
| **SV-300 — the ticketed flight itself** | **11,520.20 EGP** |
| Other same-day SV services | 12,012.20 EGP |
| Connecting services | 12,759.20 EGP |

Changing nothing costs 11,520.20 EGP, because the quote is dominated by the supplier penalty
(~10,082.00) plus the app's own change fee (400.00 = 100 × 4 passengers). **The floor is far above
zero**, so no route, date or cabin combination produces a zero difference, and nothing produces a
negative one.

**Consequence for the report.** These three cases should be described as *structurally untestable on
Sabre* — the same honest category as `AC-22`'s forced reprice under **D-15** — and **not** listed as
awaiting test data, which would imply a supply that could never close them. Closing them needs either
a supplier/fare combination with no penalty, or a stub.

**One thing the search did confirm:** the ticketed flight is quoted lower than every alternative,
which is the expected ordering.
