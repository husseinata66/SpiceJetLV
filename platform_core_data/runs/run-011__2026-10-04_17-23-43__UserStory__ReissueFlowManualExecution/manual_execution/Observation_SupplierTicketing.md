# OBS-1 — Blank ticket numbers on one exchange: a supplier issue, not an application defect

> **Not a defect record.** It was opened as one on 2026-10-05 and **withdrawn the same day** on the
> product owner's evidence. Kept because the observation is real and the next executor will meet the
> same booking.

## What was observed

On the new booking `NDCEG-BR-F260929i2znhr` (order `BRN503NDCORD260929KWPIEA`, 2 Adult + 2 Child +
2 Infant), **all six passengers carry an empty Ticket Number while every row reads `BOOKED`.**

## Why it is not an application defect

The product owner (Mohamed Soliman, 2026-10-05) identified this as **supplier behaviour**, and named a
counter-example. It holds:

| Booking | Order | Passengers | Ticket numbers |
|---|---|---|---|
| `NDCEG-BR-F260929i2znhr` | `BRN503NDCORD260929KWPIEA` | 6 | **all blank** |
| `NDCEG-BR-F260929pbzn43` | `BRN503NDCORD260929SLZ7TU` | 6 | **0654859779355 – 0654859779360, complete and consecutive** |
| `NDCEG-BR-F260930Vrf576` | `AGN10030NDCNDCORD2609306TCU5L` | 6 | one per passenger |

`pbzn43` is the same Branch (BRN503), the same party shape, and the same day as `i2znhr`. The
application stored and rendered a full set of documents there, and its Reissue History reads correctly
(`Original booking / Reissued` → `Auto Reissue / Booked`). **An application that persists six ticket
numbers on one exchange and none on another, on the same configuration, is not failing to persist.**
The documents were never returned by the supplier for `i2znhr`.

## Consequence for the suite

**`TC-RFLOW-072` and `TC-RFLOW-095` are recorded `Passed`**, executed against `NDCEG-BR-F260929pbzn43`,
where every passenger holds a live travel document after the exchange. `i2znhr` is **defective test
data**, not evidence about the application, and must not be used to judge these two cases.

ProjectContext §0.7 lists `i2znhr` as the "broken reissue" booking. That description should be read as
*a booking the supplier did not ticket*, not as a booking the application mishandled.

## One question that remains open, for the product owner — not raised as a defect

When the supplier returns no document, the application still shows every passenger as `BOOKED` and
presents the exchange as complete. Nothing on the Itinerary, the Confirmation, or the Reissue History
distinguishes it from `pbzn43`, where all six are genuinely ticketed.

**Should the application surface that difference to the agent?** That is a product decision about how
much supplier failure the UI ought to expose, not a defect this run can assert on its own. It is
recorded here so the question survives the run; the mapping scope's existing finding on per-passenger
ticketing verification covers the same ground and is the right place to settle it.

## Addendum, 2026-10-05 — the missing document *is* visible on one screen

A later check of the same booking's **Reissue History** (Itinerary, `BRN503NDCORD260929KWPIEA`) shows:

```
29-09-2026 21:49  Original booking  Reissued  sayed ahmed  CAI  DMM  0654859779386  NDCEG-BR-F2609294YODAr  348,235.20 AED
29-09-2026 22:18  Auto Reissue      Booked    sayed ahmed  CAI  DMM  —              NDCEG-BR-F260929i2znhr  410,755.20 AED
```

The **Ticket No. column is blank (`—`) on the Auto Reissue row**, against a populated ticket number on
the original. So the application does surface the gap in one place, even though the passenger table
shows every traveller as `BOOKED`.

This **narrows the open product question** recorded above: it is not that the missing document is
invisible everywhere, but that the Reissue History shows it while the passenger table and the booking
status do not. Whether that single blank is enough of a signal for an agent is the product decision.
