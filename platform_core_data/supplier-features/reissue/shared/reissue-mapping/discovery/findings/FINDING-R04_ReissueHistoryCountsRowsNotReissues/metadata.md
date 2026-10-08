# FINDING-R04 — "Reissue History" counts table rows, not reissues

- **Finding ID:** FINDING-R04
- **Title:** The Reissue History panel reads "2 Reissues" after a single exchange
- **Category:** Defect candidate (Data display / Labelling)
- **Severity (proposed):** **Low.** Cosmetic, but it overstates how many times a ticket has been exchanged — which matters when penalties accumulate per exchange
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** Portal → Booking details → *Reissue History*
- **Found by:** run-007 scenario 1, after the first and only exchange of `OWXGIW`, 2026-09-27

## Observed

After exactly **one** exchange, the panel caption reads **"2 Reissues"**. The table has two rows,
of which only the second is a reissue:

| Date | Action | Status | From | To | Ticket No. | Booking Ref | Total Sales |
|---|---|---|---|---|---|---|---|
| 2026-09-27 13:39:46 | **Original booking** | Reissued | CAI | JED | 0654859778747 | `NDCEG-BR-F26092704TCQE` | 31,346.80 |
| 2026-09-27 14:42:57 | **Auto Reissue** | Booked | CAI | RUH | 0654859778768 | `NDCEG-BR-F260927ddTlHj` (Current) | 10,220.80 |

The caption counts rows. Row 1 is the original issuance, explicitly labelled *Original booking*, and
is not a reissue. The count will read "3" after two exchanges, and so on.

## Steps to reproduce

1. Portal `http://192.168.1.60:9500`, log in as agency **AGN9780**.
2. Exchange a ticketed booking exactly once (Reissue → select → Confirm & charge).
3. Open the resulting order under **My Bookings** → **Booking details**.
4. Scroll to **Reissue History**. Caption reads **"2 Reissues"**; the table below shows one
   *Original booking* row and one *Auto Reissue* row.

## Expected

**"1 Reissue"** — the count of reissue rows, excluding the original issuance. Singular/plural
agreeing with the count.

## Actual

**"2 Reissues"** — the row count of the table, including the *Original booking* row.

## Note

The same table renders the original booking's total as **31,346.80 EGP**, which is correct and is
one of the four sources contradicting **FINDING-R02** (Review & Pay shows 31,347.00 for the same
figure).

## Evidence

- `discovery/evidence/s1-itinerary-api-after.json` — after-state for order `AGN9780NDCNDCORD260927U5JV1B`
- `discovery/evidence/CoreService_vs_Screen_s1_run-007.md` §6.7
