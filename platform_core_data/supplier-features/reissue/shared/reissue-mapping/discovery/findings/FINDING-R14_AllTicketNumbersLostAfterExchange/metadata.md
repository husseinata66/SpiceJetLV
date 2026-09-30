# FINDING-R14 — After a successful exchange the application holds no ticket numbers at all, for any passenger

- **Finding ID:** FINDING-R14
- **Title:** A completed, paid exchange leaves `ticketNo` as `null` for **all six** passengers in the application's own confirmation record, while the supplier holds five newly issued tickets. The booking went from three of six numbers present to **zero of six**
- **Category:** Defect (Supplier value returned and not stored / not displayed)
- **Severity (proposed):** **High** on its own — the ticket number is the passenger's travel document reference, needed for check-in queries, airline contact, refunds and audit, and the agency now has none of them. **Critical in combination with FINDING-R13**, because this is precisely what conceals a passenger having no ticket at all
- **Status:** **APPROVED 2026-09-30** by Mohamed Soliman at the Stage 2 review gate. Cause confirmed in the source; **reported to development 2026-09-30**; awaiting fix. Verified on return by `TC-RMAPF-039`, `TC-RMAPX-050` and `TC-RMAP-039` — and the fix must be checked against the mis-assignment risk, not only against the blank display.
- **Verified by on return:** `TC-RMAPF-039`, `TC-RMAPX-050`, `TC-RMAP-039` — all three must pass, and the fix must be checked against the **mis-assignment risk** in the section below, not only against the blank display
- **Module / screen:** Reissue → step 3 Confirmation; `GET /v2/bookingConfirm/{orderId}`
- **Found by:** run-007 scenario 9, 2026-09-29
- **Booking:** `NDCEG-BR-F2609294YODAr` → `NDCEG-BR-F260929i2znhr` · order `BRN503NDCORD260929KWPIEA` · GDS PNR `RPTIYO` · multi city · 6 passengers · AED

## CAUSE ESTABLISHED 2026-09-30 — confirmed in the source by the developer

**No longer a hypothesis.** The developer confirmed there is an **explicit condition in the code**:

> *If the number of tickets returned from the core service does not match the number of passengers,
> do not update.* **Present in the reissue flow; not in the direct-book flow.**

That accounts for every observation without remainder:

| Supplier issued | Count matches passengers? | App stored | Occurrences |
|---|---|---|---|
| All six | Yes | **6 of 6** | **7** |
| Five of six | **No** | **0 of 6** | **1** |

It also explains why **direct book has never shown this behaviour** — the guard does not exist there.

### The competing explanation is eliminated

This finding previously offered a second candidate: that a **pre-existing gap** in the stored numbers
(FINDING-R06) broke the write-back. **That is now ruled out.** The trigger is the count mismatch at
write-back time, not the prior state of the record. The experiment proposed to separate the two —
exchanging a booking with missing numbers under complete fulfilment — is **no longer required**.

### What the defect actually is

**The guard itself is defensible.** With five documents and six passengers, a positional or count-based
join cannot safely decide which passenger is the one without a ticket. Writing that join's output would
risk **assigning the wrong ticket number to the wrong passenger** — a worse outcome than writing
nothing, because it would be silently incorrect rather than silently absent.

So the fault is not that the developer added a check. **The fault is that the check fails closed and
says nothing:** it neither stores the documents that *were* returned, nor records that a mismatch
occurred, nor prevents the screen from declaring *"Exchange confirmed"*.

### How this must NOT be fixed

**Do not simply remove or relax the condition.** Writing a mismatched set by position would mis-assign
travel documents to passengers. That converts an invisible gap into invisible corruption.

### The fix the evidence supports

**Map by the supplier's traveler reference, not by count.** Sabre's `flightTickets[]` carries
`travelerIndex` on every document — verified directly in this run, where grouping the 18 documents of
scenario 10 by `travelerIndex` produced a clean three-documents-per-traveler result, and doing the same
on scenario 9 identified precisely which passenger was unticketed.

The information needed to write five correct numbers and mark the sixth **is already in the response
the application receives.** The count check is a proxy for a safety property that the traveler
reference establishes directly and exactly.

Concretely:

1. Join documents to passengers on `travelerIndex`, never on ordinal position or list length.
2. Store every number that joins.
3. Mark any passenger with no live document as **not ticketed** — explicitly, and distinguishably from
   a value that failed to store.
4. Do not render *"Exchange confirmed"* while any passenger is unticketed (see FINDING-R13).


<!-- superseded heading retained below -->
## SUPERSEDED — the hypothesis before the developer confirmed the cause

**Proposed by the product owner:** when the supplier fails to issue a ticket for one passenger, **none**
of the ticket numbers are displayed.

**The evidence across every completed exchange in this run supports it:**

| Supplier fulfilment | Ticket numbers stored by the application | Occurrences |
|---|---|---|
| All six passengers ticketed | **6 of 6** | **7** — s1, s2, s5, s6c, s7, s8b, s10 |
| Five of six ticketed (FINDING-R13) | **0 of 6** | **1** — s9 |

Seven complete exchanges stored every number correctly. The single partial exchange stored none. **No
completed exchange has ever stored a partial set** — it is always all or nothing, and the "nothing"
case coincides exactly with the supplier shortfall.

### The mechanism this implies

The application appears to map supplier documents onto passengers as a **set operation that must
balance** — six passengers expecting six tickets. When the supplier returns five, the mapping fails as
a whole and nothing is written, rather than the five good numbers being stored and the sixth left
blank. That is a plausible index- or count-based join, and it is consistent with every observation.

**This is now the leading explanation and it supersedes the weaker one below** ("scenario 8b began with
all six present; scenario 9 began with three missing"), which this finding previously offered.

### It is NOT yet proven — one observation of the failure branch

Scenario 9 is the **only** exchange with partial fulfilment, and it is also the only exchange whose
booking began with missing ticket numbers (FINDING-R06 — three of six blank beforehand). **Both
candidate triggers are present in the same single case**, so the evidence cannot yet separate them:

| Candidate trigger | Fits the data? |
|---|---|
| **Partial supplier fulfilment** breaks the write-back | Yes — and this is the product owner's reading |
| **A pre-existing gap** in the stored numbers breaks the write-back | Also yes — s9 is the only exchange that started with one |

### The test that separates them

**A booking that begins with missing ticket numbers and receives complete supplier fulfilment.**

- If it stores **all six** -> the pre-existing gap is not the trigger, and **partial fulfilment is
  confirmed as the cause**.
- If it stores **none** -> the pre-existing gap is the trigger, independent of the supplier.

That booking is obtainable: FINDING-R06 shows bookings with missing numbers are common, and any of
them exchanged normally would answer it. **This is the single cheapest experiment outstanding in this
scope** and it would close both this finding's causation and much of R13's practical impact.

### Why it matters commercially

If the hypothesis is right, the application's defect is **narrow and fixable without the supplier**:
store the documents the supplier *did* return, and mark the passenger it did not. That converts an
invisible failure into a visible one — five numbers shown and one blank — which is exactly the ragged
edge that would have surfaced FINDING-R13 in seconds rather than by querying Sabre directly.


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

The confirmation screen's header reads:

> **Ticket number** — —

and `GET /v2/bookingConfirm/BRN503NDCORD260929KWPIEA` returns, for every passenger:

```
ADT sayed ahmed    ticketNo: null
ADT emad eid       ticketNo: null
CHD eid saeed      ticketNo: null
CHD khaled sayed   ticketNo: null
INF ayman ezz      ticketNo: null
INF fahmy ahmed    ticketNo: null
```

At the same moment Sabre holds **five newly issued tickets** — `0654859779392`, `…394`, `…395`, `…396`, `…397` — plus five EMDs. The values exist at the supplier and none reached the application's record.

## It is a regression within the same booking

| | Before the exchange | After |
|---|---|---|
| Ticket numbers held by the application | **3 of 6** (386, 388, 390) | **0 of 6** |
| Ticket numbers held by Sabre | 6 of 6 | 5 new + 6 exchanged |

The booking already carried FINDING-R06 — every even-numbered passenger was blank. **The exchange did not repair that; it lost the other three as well.**

## Contrast with a booking that worked

Scenario 8b (`QZTJRV`, round trip, same agency, exchanged an hour earlier) stored all six new numbers correctly:

```
ADT sayed ahmed    0654859779355
ADT emad khaled    0654859779356
CHD eid saeed      0654859779357
CHD emad ahmed     0654859779358
INF emad mahfouz   0654859779359
INF saeed ezz      0654859779360
```

So the confirmation record **can** carry per-passenger ticket numbers — the field and the path work. On this booking it carried none.

**Candidate difference (SUPERSEDED 2026-09-30 by the hypothesis above, retained as the record of the earlier reasoning):** scenario 8b began with all six numbers present; scenario 9 began with three missing. Whether a pre-existing gap causes total loss on write-back is unproven — one observation of each.

## Why this one matters more than a blank field

FINDING-R13 records that passenger 2 received **no replacement ticket at all** — his old ticket is spent and nothing was issued. That is a passenger who cannot board.

**This defect is why nobody would ever find out.** With all six numbers blank, the confirmation screen looks uniformly empty; there is no ragged edge, no "five filled and one missing" to catch an agent's eye. The display is equally uninformative for the five who are fine and the one who is not. The only way to discover the problem is to query the supplier directly, which no agent does.

A partial failure rendered as a uniform blank is worse than either a correct display or an obvious error, because it removes the signal that something is wrong.

## Expected

Every passenger's newly issued ticket number is stored and displayed on the confirmation. Where the supplier issued no document for a passenger, that passenger is shown as **not ticketed** — explicitly and distinguishably from a value that merely failed to display.

## Actual

`null` for all six, rendered as `—`, with no distinction between "ticketed but not shown" and "never ticketed".

## Steps to reproduce

1. Admin, open `NDCEG-BR-F2609294YODAr`, take the lock, Reissue.
2. Multi city CAI→RUH 05 Mar 2027 / RUH→DMM 08 Mar 2027, select the lowest fare, confirm and charge.
3. On the Confirmation screen read **Ticket number** — it shows `—`.
4. `GET /v2/bookingConfirm/{orderId}` → every `paxSegmentList[].ticketNo` is `null`.
5. `POST /v1/trip/orders/getBooking` on `RPTIYO` → five new tickets exist at the supplier.

> The exchange itself is not repeatable on this booking; the observation is recorded from the single run.

## Related

- **FINDING-R13** — the passenger with no ticket, which this defect hides.
- **FINDING-R06** — the same booking's pre-exchange state, three of six blank. This finding is its post-exchange escalation but is filed separately: R06 is about numbers lost on booking, this is about numbers lost on reissue write-back, and the two may have different causes.

## Evidence

- `discovery/evidence/s9-admin-bookingConfirm.json` — all six `ticketNo: null`
- `discovery/evidence/s9-sabre-getBooking-RPTIYO-after.json` — the five new tickets that exist at the supplier
- `discovery/evidence/s9-admin-itinerary.json` — the pre-exchange state, three of six present
- `discovery/evidence/s8b-admin-bookingConfirm.json` — the contrasting booking where all six were stored correctly
