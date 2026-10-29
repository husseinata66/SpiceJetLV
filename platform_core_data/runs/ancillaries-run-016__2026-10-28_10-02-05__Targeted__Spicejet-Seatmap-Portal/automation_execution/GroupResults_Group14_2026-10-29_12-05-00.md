# Group 14 results — ancillaries / spicejet (ancillaries-run-016__2026-10-28_10-02-05__Targeted__Spicejet-Seatmap-Portal)

Read-only re-check of TC-RPT-002 for the existing booking EEYJPK (Group 14, booked 2026-10-28 12:28 server time) · Portal · Headed · started 2026-10-29T12:05:00Z · took 1m 30s.
No booking was made; nothing was charged. Working log, not the final report.

## Environment as it actually behaved

| Item | Observed |
|---|---|
| Application | Portal — http://192.168.1.90:9500 |
| Login | logged in by the human |
| Re-check of | order AGN9794AGNHUSORD261028KZDTUC · ref NDCEG-BR-F261028Zzxc8N · PNR EEYJPK · charged 28,031.00 |

## Results

| Case | Result | Time | Evidence |
|---|---|---|---|
| TC-RPT-002 | Passed | 90 s | Statement report, 28–29 Oct (last updated 2026-10-29 14:50; 573 rows, found on page 5): "28-10-2026 12:28:13 Rohan Mehra EEYJPK Booked NDCEG-TR261028xKImeG Hussein DEL-BOM,BOM-BLR … 28,031.00 4,921,567.00" — the debit is the 28,031.00 charged, and the wallet balance drops from 4,949,598.00 on the row before by exactly that. The 28 Oct result was Inconclusive only because the report (hourly) had not yet updated after the booking. Screenshot: `artifacts/failures/TC-RPT-002__recheck_2026-10-29_12-05-00.png`. |

## Tally

Passed 1

Book, Hold, Pay and Save Quote were never pressed (read-only report check).
