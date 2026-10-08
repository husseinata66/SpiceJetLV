# OBS-3 — The reissue change fee is a Service Charge; the Itinerary names it differently

**Settles `TC-RFLOW-088` (AC-31).** Recorded **Passed** on the product owner's ruling (Mohamed
Soliman, 2026-10-05) together with this run's own observations.

## The fee is one value under several labels

| Screen | Label used | Observed this run |
|---|---|---|
| Flight results — Fare breakdown | **"Reissue service charge"** | ✅ 400.00 EGP on the Branch booking (100 × 4 pax) |
| Review & Pay — Additional to pay | **"Reissue service charge"** | ✅ 300.00 EGP on the Portal booking (50 × 6 pax) |
| Booking Confirmation | Service charge | Per the product owner; not separately re-observed this run |
| Itinerary — Costing & Payment | **"Total Profit"** | ✅ 150.00 AED on the clean reissue (25 × 6 pax) |
| PNR Query | the product owner states its value is carried there | **Not confirmed — see the open point below** |

**The ruling:** the fee *is* stored and shown as a service charge through re-shop, Review & Pay and
the Booking Confirmation. The Itinerary's **"Total Profit"** is that same value under the Itinerary's
own commercial heading, not a different or missing figure. **This is intended behaviour, not a
defect.**

## Why this case first read Inconclusive

The executor judged `TC-RFLOW-088` from the **Itinerary** alone, where the only line carrying the fee
is "Total Profit" and the words *Service Charge* appear nowhere. On that one screen the AC looks
unmet. It is met — on the three screens the executor had already seen and did not connect to this
case, where the line is named *"Reissue service charge"* in full.

**The lesson:** a case asserting *where a value is stored* must be judged across every screen that
shows it, not on the screen the executor happened to open last.

## One point still open

The product owner states that in **PNR Query** the fee's value "is in the 125". This run did not
confirm what that refers to — PNR Query's Reissue History List carries an **Amount** column, and the
two rows observed held booking totals (412,873.2 and 170,275.2), not the fee. **Whether the fee is
separately visible in PNR Query, and under which column, is unverified** and should be settled before
`TC-RFLOW-125` is closed.

## Separate, and not re-raised here

On the same Costing & Payment screen, Total Cost Payable reads **3,976.88 AED** while Amount Received
reads **3,977.00 AED** — the wallet was debited the rounded figure, 0.12 against the agency. That is
the mapping scope's existing rounding finding, excluded from this suite by §0.1.
