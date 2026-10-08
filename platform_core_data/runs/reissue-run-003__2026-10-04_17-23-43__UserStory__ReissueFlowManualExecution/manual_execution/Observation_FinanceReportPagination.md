# OBS-2 — TC-RFLOW-126's "missing from the Finance Report" was an execution error, not a defect

> **Withdrawn defect.** Opened 2026-10-05 as High/P1, withdrawn the same day on the product owner's
> correction. Recorded so the mistake is not repeated.

## What was claimed

That a completed, paid reissue (`NDCEG-BR-F260929u1ptMk` → `NDCEG-BR-F260929pbzn43`, Branch BRN503)
was **absent** from the Finance Report for the period in which it occurred.

## Why that was wrong

**The executor only ever read page 1.** The Finance Report paginates at the foot of the page —
*"Showing 10 results of 36 results"*, with `First · 1 · 2 · … · 4 · Last`. The paging loop targeted
`.p-paginator-next`, a control this screen does not use, so the loop exited immediately and reported
the 10 rows of page 1 as if they were the whole result set. Widening the date filter changed nothing,
because the limit was never the filter — a second observation that looked like confirmation and was
not.

## What is actually there

Paging through all four pages for BRN503, 28/09/2026 – 02/10/2026, returns **36 results** containing:

| Booking Ref | Present |
|---|---|
| `NDCEG-BR-F260929DXeP0a` | yes |
| `NDCEG-BR-F2609291xGSlw` | yes |
| **`NDCEG-BR-F260929u1ptMk`** (original) | **yes** |
| **`NDCEG-BR-F260929pbzn43`** (reissue) | **yes** |
| `NDCEG-BR-F260929i2znhr` | yes |

Both halves of the exchange are reported. **`TC-RFLOW-126` is recorded `Passed`.**

## What still stands, and is separate

The Finance Report's columns remain: Branch Name · Agency name · Booking Ref No · Category · Invoice
No · Supplier Payment Method · Client/Passenger Name · Booking Date · Product Type · Client Type ·
Trip Start Date · No Of Pax · Agent Name · Status · Refund Date.

**No column identifies a reissue, and there is no Service Charge column.** That is run-009's **RPT-1**,
already open as a **product question**, and it is why `TC-RFLOW-125` is recorded `Inconclusive` rather
than failed. Nothing here changes that; the transaction is present, its *nature* is not labelled.

## The lesson, recorded rather than left implicit

**A list screen's result count is evidence; the rows on screen are not.** The foot of this report
states "Showing 10 results of 36" in plain text, and reading it would have prevented the claim. Any
future assertion that a record is absent from a paginated list must first state the total the screen
itself reports, and confirm every page was read.
