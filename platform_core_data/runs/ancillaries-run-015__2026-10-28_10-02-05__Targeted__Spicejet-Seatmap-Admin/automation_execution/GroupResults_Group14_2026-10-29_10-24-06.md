# Group 14 results — ancillaries / spicejet (ancillaries-run-015__2026-10-28_10-02-05__Targeted__Spicejet-Seatmap-Admin)

Read-only re-check of TC-RPT-002 for the existing booking YD9DND (Group 14, booked 2026-10-29 07:23 UTC) · Admin · Headed · started 2026-10-29T10:24:06Z · took 1m 0s.
No booking was made; nothing was charged. Working log, not the final report.

## Environment as it actually behaved

| Item | Observed |
|---|---|
| Application | Admin — http://192.168.1.90 |
| Login | saved session |
| Re-check of | order AGN9794AGNHUSORD261029BS30FT · PNR YD9DND · charged 26,774.00 |

## Results

| Case | Result | Time | Evidence |
|---|---|---|---|
| TC-RPT-002 | Passed | 60 s | Statement report, today (last updated 2026-10-29 13:20, booked 2026-10-29 10:23): PNR YD9DND is listed (page 28 of 29, 281 rows) with debit 26,774.00 — "29-10-2026 10:23:24 … YD9DND Booked NDCEG-TR261029plH73G Essam Sherif DEL-BLR … 26,774.00". The earlier Fail was a runner fault: the paginator shows only "1 2 ….. 29", and the runner clicked page numbers 3–8 that do not exist, so it read 20 of 281 rows. Fixed in postbook.searchReportToday / admin_post.adminReport (step with ›, up to 40 pages); the fixed helper alone then found YD9DND. Screenshot: `artifacts/failures/TC-RPT-002__recheck_2026-10-29_10-24-06.png`. |

## Tally

Passed 1

Book, Hold, Pay and Save Quote were never pressed (read-only report check).
