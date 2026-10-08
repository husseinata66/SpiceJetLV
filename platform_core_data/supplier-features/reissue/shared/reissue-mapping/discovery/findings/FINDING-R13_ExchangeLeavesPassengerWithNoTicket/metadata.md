# FINDING-R13 — An exchange voids all six tickets but issues only five: one passenger is left with no valid travel document

- **Finding ID:** FINDING-R13
- **Title:** After a successful, fully-paid exchange, passenger 2's original ticket is marked `Exchanged` on both coupons and **no replacement ticket and no EMD were issued for him**. The remaining five passengers each received both. The agency paid for six
- **Category:** Defect (Ticketing / Supplier fulfilment incomplete, undetected by the application)
- **Severity (proposed):** **Split, 2026-09-30 — see the reassessment below.** The *supplier fulfilment* failure is **not an application defect** (product owner, 2026-09-30). The *application's failure to detect it and its declaration of success* remains an application defect, proposed **High**. The **operational exposure is unchanged and independent of cause**: a fare-paying passenger holds a spent ticket and nothing else
- **Status:** **APPROVED 2026-09-30** by Mohamed Soliman at the Stage 2 review gate, **as a supplier defect**. The fulfilment failure is Sabre's and is to be raised with the supplier. The application residue — declaring *"Exchange confirmed"* without verifying per-passenger ticketing — is approved as a separate application defect and is **not** closed by FINDING-R14's fix. Kept distinct from R14 by explicit decision: R13 triggers R14, R14 conceals R13, and closing one must not close the other.
- **Module / screen:** Reissue → step 3 Confirmation; supplier fulfilment after `POST /v2/reissue/{ref}/book`
- **Found by:** run-007 scenario 9, 2026-09-29
- **Booking:** `NDCEG-BR-F2609294YODAr` → new ref `NDCEG-BR-F260929i2znhr` · order `BRN503NDCORD260929KWPIEA` · GDS PNR `RPTIYO` · Airline PNR `8LBVUC` · **multi city** CAI→RUH 05 Mar 2027, RUH→DMM 08 Mar 2027 · 2 Adult, 2 Child, 2 Infant · agency NDC2_Mohamed Soliman Emirates · AED
- **Amount charged:** **410,755.20 AED**, for six passengers

## REASSESSMENT 2026-09-30 — the product owner's position, and what survives it

**Product owner's assessment:** this is a **supplier issue, not an application issue**. The ticket was
not issued by Sabre; the occurrence is random; there is no action the application could have taken to
prevent it; and the application did display the confirmation page with an empty ticket number.

**Accepted on causation.** This finding never established a cause — candidate 1 below has always been
"the supplier failed to issue one document and returned success regardless", and nothing in the
evidence contradicts it. **The failure to issue is not attributed to the application.**

**Frequency: one occurrence.** Approximately seven exchanges were completed across this run and one
produced this result. That is consistent with "random" and is **too small a sample to characterise a
rate**. This finding does not claim it is systematic, and it never did.

### What does not survive the reassessment

Nothing about the fulfilment failure. It is recorded here as a **supplier defect to be raised with
Sabre**, not as work for the application team.

### What does survive, and why

Two things, and they are the application's:

**1. The application declared success without verifying that every passenger was ticketed.** It took
payment for six passengers, received the supplier's response, and rendered *"Exchange confirmed"*. It
performed no per-passenger check and has no mechanism that would ever perform one. That the supplier
caused the gap does not make the absence of a check the supplier's responsibility — a payment system
that cannot tell a complete fulfilment from a partial one is incomplete regardless of who failed
upstream.

**2. The empty ticket number is not the application reporting the problem — it is what concealed it.**

This is the point on which this finding respectfully disagrees with the product owner's reading. The
confirmation did show an empty ticket for the unticketed passenger. **It also showed an empty ticket
for the five passengers who were correctly ticketed** (FINDING-R14 — all six were `null` while the
supplier held five new tickets). So the display was:

```
ADT sayed ahmed    —      <- correctly ticketed at the supplier
ADT emad eid       —      <- NOT TICKETED AT ALL
CHD eid saeed      —      <- correctly ticketed
CHD khaled sayed   —      <- correctly ticketed
INF ayman ezz      —      <- correctly ticketed
INF fahmy ahmed    —      <- correctly ticketed
```

**An agent cannot distinguish row 2 from the other five.** A uniform blank does not communicate "this
passenger has no ticket"; it communicates nothing at all, about anyone. Had five numbers rendered and
one been blank, the ragged edge would have been visible and this would have been caught in minutes
rather than by querying the supplier directly.

An empty field that means *"not ticketed"* must be distinguishable from an empty field that means
*"we did not store this"*. Today they are the same pixel.

### The operational exposure is unchanged

Cause does not alter consequence. **Passenger EMAD EID holds a spent ticket and no replacement.**
Whoever is at fault, he cannot board until a ticket is issued. That action is not a review decision
and does not wait on this finding's disposition.

### What this means for the outstanding supplier checks

The five `getBooking` calls on scenarios 1, 2, 5, 6 and 8b are **still worth making, and the reason
changes**. They are no longer about attributing fault to the application. They answer a different and
more urgent question: **is there a passenger in an already-completed exchange who cannot board and
nobody knows?** If the supplier does this randomly, that possibility is higher, not lower.


> ### TEST DATA — no real passenger is exposed (recorded 2026-09-30)
>
> **Every booking in this scope is fixture data on Sabre CERT (PCC `EZ4K`). The passenger names are
> fabricated.** Wording elsewhere in this finding that describes a passenger who "cannot board" or who
> is "the only party with real exposure" was **overstated** and is corrected here: there is **no
> operational action to take, and no person affected**.
>
> **What this changes:** the immediate remediation disappears. What does not change is the **defect
> class** — an exchange that takes full payment, receives partial fulfilment, and reports success. The
> severity below is retained as an assessment of that behaviour **were it to occur in production**,
> which is the only basis on which a CERT observation can be severity-rated at all.

## Observed

Queried Sabre directly with `POST /v1/trip/orders/getBooking` on `RPTIYO` immediately after the exchange. Sabre holds **16 documents**. Grouped by `travelerIndex`:

| Traveler | Name | Type | Original ticket (coupons) | New ticket | EMD |
|---|---|---|---|---|---|
| 1 | SAYED AHMED | ADT | 0654859779386 — `Exchanged`/`Exchanged` | **0654859779392** | 0651953370391 |
| **2** | **EMAD EID** | **ADT** | **0654859779387 — `Exchanged`/`Exchanged`** | **— NONE —** | **— NONE —** |
| 3 | EID SAEED | CNN | 0654859779388 — `Exchanged`/`Exchanged` | **0654859779394** | 0651953370392 |
| 4 | KHALED SAYED | CNN | 0654859779389 — `Exchanged`/`Exchanged` | **0654859779395** | 0651953370393 |
| 5 | AYMAN EZZ | INF | 0654859779390 — `Exchanged`/`Exchanged` | **0654859779396** | 0651953370394 |
| 6 | FAHMY AHMED | INF | 0654859779391 — `Exchanged`/`Exchanged` | **0654859779397** | 0651953370395 |

**The new-ticket sequence runs 392, [393 absent], 394, 395, 396, 397.** The gap falls exactly where traveler 2's replacement belongs. The string `0654859779393` appears nowhere in the supplier response.

Traveler 2's only document is `0654859779387`, whose **both coupons carry `couponStatus: "Exchanged"`, code `E`** — it has been consumed by the exchange and cannot be flown.

Every other passenger received exactly three documents. Traveler 2 received the void one and nothing else.

## Why this is not FINDING-R06

FINDING-R06 is about the **application losing ticket numbers the supplier did hold**. It is a record-keeping defect; the tickets exist.

**Here the document does not exist at the supplier at all.** Sabre was asked directly and has no ticket and no EMD for traveler 2. This is a fulfilment failure, not a display or storage failure, and its consequence is a passenger who cannot board rather than a number an agent cannot see.

The two interact badly — see FINDING-R14 — but they are different defects and must not be merged.

## What was paid for

The invoice reconciles exactly to what was charged, for **six** passengers:

```
totalFare       280,206.00    (additional base fare, 2 ADT + 2 CNN + 2 INF)
totalTax        130,435.20    (taxes 13,273.20 + supplier penalty 117,162.00)
serviceCharges      114.00    (the change fee)
                 ──────────
                410,755.20    = amount charged
```

Nothing was withheld or pro-rated for the passenger who was not ticketed. The agency paid six fares and received five sets of documents.

## Cause — NOT established

This cannot be diagnosed from the client side. The candidates:

1. **The supplier failed to issue one document** and returned success regardless.
2. **The application's book request omitted or malformed traveler 2.** Notable: traveler 2 is one of the three whose ticket number was **blank in the application's own record** before the exchange (FINDING-R06 — 387, 389 and 391 were all missing). **But this does not explain it on its own**: travelers 4 and 6 were also blank and both were ticketed correctly. Only traveler 2 failed. A shared cause is plausible but unproven, and the correlation is 1 of 3.
3. **Partial fulfilment that the application did not check.** The app received a success response and rendered "Exchange confirmed" without verifying that a document exists per passenger.

**`logs/detail.log` would very likely distinguish 1 from 2.** It has never been accessible in this run; this is now the third finding it blocks.

**Regardless of cause, item 3 stands on its own as a defect:** the application declared success without confirming that every passenger was ticketed, and it has no mechanism that would ever notice.

## Steps to reproduce

Not established — the trigger is unknown, so reproduction cannot be guaranteed. What is certain is the detection method:

1. Complete any reissue and note the GDS PNR.
2. Call Sabre `POST /v1/trip/orders/getBooking` with `{"confirmationId":"<PNR>"}`.
3. Group `flightTickets[]` by `travelerIndex`.
4. For each traveler, confirm at least one document whose coupons are **not** `Exchanged`.
5. On this booking, traveler 2 has none.

## Expected

Either every passenger receives a replacement document, or the exchange fails atomically and no ticket is voided. A partial result must never be reported as "Exchange confirmed", and must never be charged in full.

## Actual

Six tickets voided, five reissued, full payment taken, success displayed, and no indication anywhere in the application that a passenger is unticketed.

## Immediate operational action — NONE (corrected 2026-09-30)

**Previously this section read that the passenger must be issued a ticket before travel.** That was wrong: the booking is CERT fixture data and the passenger is fabricated. **There is no ticket to issue and no commercial adjustment to make.**

The action that survives is the supplier one: **raise the partial-fulfilment behaviour with Sabre**, because nothing in the application prevents it recurring — in CERT or anywhere else.

## Required control — this is the part that generalises

The application must **verify per-passenger ticketing after every exchange** and refuse to display success until each passenger holds a live document. Today it verifies nothing. This defect was invisible from every screen and every application payload, and surfaced only because the supplier was queried directly — which no agent will ever do.

**Added to this scope's standing checks:** every exchange scenario must query the supplier afterwards and confirm one live document per passenger. Scenarios 1, 2, 5, 6 and 8b were never checked this way and **should be re-verified** — the same defect may be sitting undetected in them.

## Related

- **FINDING-R14** — the application holds `null` for all six ticket numbers after this exchange, which is precisely what conceals this defect from the agent.
- **FINDING-R06** — traveler 2 was among the three whose numbers were blank beforehand. Correlation noted, causation unproven.

## Evidence

- `discovery/evidence/s9-sabre-getBooking-RPTIYO-after.json` — **the proof.** 16 documents; traveler 2 has only `0654859779387` with both coupons `Exchanged`; no `…393` anywhere
- `discovery/evidence/s9-sabre-getBooking-RPTIYO-before.json` — all six original tickets live before the exchange
- `discovery/evidence/s9-admin-bookingConfirm.json` — the application's confirmation: success, six passengers, all ticket numbers `null`
- `discovery/evidence/s9-admin-review.json` — the priced offer for six passengers as presented before payment
- `discovery/evidence/s9-capture-window.json`
