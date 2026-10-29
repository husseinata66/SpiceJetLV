# Group 14 results — ancillaries / spicejet (ancillaries-run-015__2026-10-28_10-02-05__Targeted__Spicejet-Seatmap-Admin)

Read-only re-check of TC-RPT-001 for the existing booking ZBUCPW (Group 14, booked 2026-10-29 11:40 UTC) · Admin · Headed · started 2026-10-29T11:55:00Z · took 0m 36s.
No booking was made; nothing was charged. Working log, not the final report.

## Environment as it actually behaved

| Item | Observed |
|---|---|
| Application | Admin — http://192.168.1.90 |
| Login | PNR Query Admin user, logged in by the human |
| Re-check of | order AGN9794AGNHUSORD261029ORJT9N · ref NDCEG-BR-F261029dBmYnv · PNR ZBUCPW · status Confirmed |

## Results

| Case | Result | Time | Evidence |
|---|---|---|---|
| TC-RPT-001 | Passed | 36 s | PNR Query finds AGN9794AGNHUSORD261029ORJT9N (ref NDCEG-BR-F261029dBmYnv, status Booked, PNR ZBUCPW) — twice. Booking report, today, finds NDCEG-BR-F261029dBmYnv (invoice INVNDC261029kmsZTu) (11:36 run). The 11:36 Fail was a runner fault: the PNR Query page showed the booking, but an empty section on it read "No data has been found" and the parser took that for "not found". Fixed in admin_parse.js (an Order Id on the page = found) with a unit test. |

## Tally

Passed 1

Book, Hold, Pay and Save Quote were never pressed (read-only lookup).
