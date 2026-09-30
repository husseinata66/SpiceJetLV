# PNR Query — observed behaviour (run-009, Stage 2, 2026-09-30)

Admin `/pnr-query`, headed, logged in as Mohamed Soliman. Story §8 — AC-34, AC-36.

## Screen structure

| Control | Values |
|---|---|
| Search | free text — placeholder "PNR Code, Ticket No., or Booking Ref." |
| Search About | `Itinerary Details` (default) · `Agency Information` |
| Get Itinerary Details By | `PNR` (default) · `Ticket No.` · `Booking Ref.` |

A PNR that has been reissued returns **both bookings stacked on one page**: the original
(`Status: Reissued`) then the new one (`Status: Booked`). Each renders the same blocks —
Lock Info · Agency User Info · Payment Info · Flight Info · Booking Info · Flight Legs ·
Passenger List · actions · Comments · **Reissue History**.

**Passenger List columns:** Select · Name · Type · Ticket Number · Travel Date · Booking Status ·
Refund Status · Cabin Class · Discount · Net Basic · Gross Basic · Tax · Profit · Total ·
Total Sales Amount · GDS Ref. · Check-in Baggage · Supplier Commission

**Reissue History List columns:** Date · Action · Lead Pax · From · To · Ticket · Booking Ref · Amount

**Actions offered:** `Void` · `Manual Reissue` · `Refund`. **No Sync action is present on this screen
at all** — on the original or on the reissue. AC-28 ("reissue offers cannot perform Sync") therefore
**cannot be evidenced here**: Sync's absence is a property of PNR Query, not of the reissue. The
AC-28 negative check belongs on the Itinerary screen, where Sync does appear for other bookings.

## A. Clean booking — `TTDMXL`, scenario 10

Original `NDCEG-BR-F260930LAlLPj` (Reissued) → new `NDCEG-BR-F260930Vrf576` (Booked).

**AC-34 is satisfied structurally.** Reissue History on the original carries exactly two rows:

| Date | Action | Ticket | Booking Ref | Amount |
|---|---|---|---|---|
| 2026-09-30 10:52:55 | Original booking | 0654859779617 | `NDCEG-BR-F260930LAlLPj` | 3604.88 |
| 2026-09-30 11:23:20 | Reissue | 0654859779627 | `NDCEG-BR-F260930Vrf576` | 3976.88 |

**OBS-1 — the wallet rounding defect is visible on this one screen, without the API.**
Reissue History states the reissue Amount as **3976.88**. The same booking's Payment Info states
**Amount Received: 3,977**. The agreed figure and the debited figure sit on the same page and
disagree by 0.12, in the agency's disfavour. `FINDING-R18` was found by reading the wallet from the
API before and after; it is reproducible from PNR Query alone. **This makes R18 a UI-observable
regression case, which materially lowers the cost of its regression test.**

**OBS-2 — Reissue History is empty on the reissued booking.** The new booking's own Reissue History
reads *"No data has been found!"*. The relation is recorded **only on the original**. From the new
booking there is no path back to the one it replaced. AC-27 requires Reissue History to *"maintain
the relation to the original booking"* — one-directional only. Needs a product ruling on whether the
backward link is required.

**OBS-3 — rule engine correctly absent, change fee present.** Original: Discount 50, Profit 125 per
passenger. Reissue: Discount **0**, Profit **25** per passenger (25 × 6 = 150 = the change fee).
Matches ProjectContext §2.5 exactly — the agency earns the change fee alone. **Not a defect; this is
the assertion case for the confirmed behaviour.**

**OBS-4 — ticket sequence gap.** New tickets run 627, 628, 629, **[630 absent]**, 631, 632, 633 —
six passengers, seven numbers spanned. All six hold a number, so this is not the R13 failure, but
the supplier skipped one in sequence. Recorded, not raised.

## B. Broken booking — `RPTIYO`, scenario 9 (multi-city, the Critical finding)

Original `NDCEG-BR-F2609294YODAr` (Reissued) → new `NDCEG-BR-F260929i2znhr` (Booked).

**OBS-5 — the ticketing failure IS visible from PNR Query, in three places.** This matters: the
mapping run concluded the failure was "invisible from every screen" and reachable only by querying
Sabre. On PNR Query it surfaces.

1. **On the original booking**, Ticket Number is **blank for passengers 2, 4 and 6** — emad eid,
   khaled sayed, fahmy ahmed. Sabre holds real documents for all three (…387, …389, …391). This is
   the positional "every even-numbered passenger" pattern of `FINDING-R06`, reproduced on a screen.
2. **On the reissued booking**, Ticket Number is **`N/A` for all six** — the uniform blank of
   `FINDING-R14`. Sabre holds live new tickets for five of the six.
3. **Reissue History's `Ticket` column reads `N/A`** for the Reissue row, where the clean booking
   showed a real number:

| Date | Action | Ticket | Booking Ref | Amount |
|---|---|---|---|---|
| 2026-09-29 18:49:14 | Original booking | 0654859779386 | `NDCEG-BR-F2609294YODAr` | 348235.2 |
| 2026-09-29 19:18:40 | Reissue | **N/A** | `NDCEG-BR-F260929i2znhr` | 410755.2 |

**A `Ticket: N/A` in Reissue History is a detectable signal that a reissue did not ticket cleanly**,
and the clean booking proves the column is populated when it does. That is a candidate acceptance
check for the control the mapping run recommended.

**OBS-6 — CORRECTED. `Net Basic` on a reissued booking carries the fare *difference*, under a label
that means fare.** My first reading of this screen called it a collapsed per-passenger base fare and
a tenfold infant overcharge. **That was wrong, and the chain says so.**

What the screen shows on the reissued booking: `Net Basic` and `Gross Basic` of **46701 for every
passenger** — Adult, Child and Infant alike, where the original booking properly differentiates them
(47637 / 35964 / 4671).

Traced back through the captures already on disk:

| Layer | Value | Source |
|---|---|---|
| **Sabre** | `priceDifference.baseFare: "5189.00"` on the **CNN** group — the same as the ADT group | `reissue-mapping/discovery/evidence/s9-sabre-reshop-RPTIYO.json` |
| **core service** | offer with `ADT base=5189 · CHD base=5189 · INF base=5189` (other offers in the same response differentiate correctly — 10482 / 9185 / 5708) | `s9-core-reshop-RPTIYO.json` |
| **screen** | 46701 = **5189 × 9**, the configured rate of exchange, exactly | PNR Query |

**So the mapping is correct and nobody was overcharged.** The figure originates at the supplier, and
it is equal across passenger types for a good reason: it is a **price difference**, not a price. All
six passengers moved from the same old flight to the same new flight, so the delta can legitimately
be identical for an infant and an adult even though their fares are not.

**What survives is a labelling defect, and it is a real one.** The `Net Basic` / `Gross Basic`
columns carry:

- the passenger's **base fare** on an ordinary booking;
- the passenger's **base fare difference** on a reissued booking.

Same column, same label, two different quantities, switching on whether the booking is a reissue —
with nothing on the screen to say which you are reading. An agent comparing the two rows of a
reissued PNR sees an infant's "Net Basic" rise from 4,671 to 46,701 and has no way to know the second
number is not a fare. **That is exactly the "a right number read under the wrong label" case this
feature's scope exists to catch**, and it is why the sibling mapping scope tests key meaning rather
than value equality alone.

Raised as a **labelling/presentation finding on this scope**, severity to be set at review. It is
*not* a mapping defect — the mapping scope's hop A and hop B both carried the value faithfully.

**OBS-7 — the rounding defect reproduces here too.** Reissue History Amount **410755.2**;
Payment Info Amount Received **410,756**. Rounded up by 0.8, again in the agency's disfavour. Two
bookings, two currencies-of-magnitude, same direction.

**OBS-8 — multi-city collapses in Reissue History.** `From`/`To` read CAI → DMM while the legs are
CAI→RUH and RUH→DMM. Defensible as a summary, but a multi-city reissue cannot be distinguished from
a direct one in this table.

## What this sweep settles for Stage 3

- **AC-34 is testable and has an observed expected result** — both bookings returned, Reissue History
  populated on the original with the eight named columns.
- **AC-36's regression baseline for PNR Query is captured** — the screen structure above.
- **AC-28 cannot be tested here.** Moved to the Itinerary screen.
- **AC-27's backward link is an open product question** (OBS-2).
- Three existing findings gain a cheaper, UI-level regression case (OBS-1, OBS-5).
- One new observation needs a supplier cross-check before it becomes a finding (OBS-6).
