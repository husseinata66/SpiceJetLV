# FINDING-R06 — A passenger's ticket number exists at the supplier but is empty in the application

- **Finding ID:** FINDING-R06
- **Title:** Sabre issues a ticket the application never stores — reproduced on **two** bookings, once on the **lead passenger**
- **Category:** Defect candidate (Data integrity / Ticketing persistence)
- **Severity (proposed):** **High** (data integrity). Briefly escalated to Critical on 2026-09-28 on the belief that a missing ticket number blocks the exchange — **that escalation is withdrawn**: scenario 6 exchanged successfully on 2026-09-29 with a ticket number missing. See "Consequence" below
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** Booking record and every screen reading it — Booking details, reissue passenger selection. Surfaced by the reissue flow, **caused upstream of it**
- **Found by:** run-007 scenario 3, booking `NDCEG-BR-F260928CMve29` (GDS PNR `PRUOOC`), 2026-09-28. **Reproduced** the same day on `NDCEG-BR-F260928v8EC7m` (GDS PNR `PUAUTI`)

## Observed

Six passengers, six tickets issued at Sabre. The application holds five.

| Layer | Passenger 2 (emad ahmed, ADT) |
|---|---|
| **Sabre `getBooking`** | **`0654859779100`** · `Issued/TE` · total **6,383.80** |
| Portal booking record — `…/bookingDetails2/itinerary/…` | `ticketNo: ""` |
| Portal reissue — `…/v2/reissue/{ref}/eligibility` | `ticketNumber: null` |
| Screen — reissue passenger selection | **`Ticket —`** |

Every other passenger is intact, and the sequence makes the gap obvious:

```
0654859779099   ayman ahmed     ADT   ← held
        (100)   emad ahmed      ADT   ← MISSING in the app, present at Sabre
0654859779101   abdallah ragb   CHD   ← held
0654859779102   ezz ayman       CHD   ← held
0654859779103   fawzy omar      INF   ← held
0654859779104   eissa soliman   INF   ← held
```

## The record is not broken in general — only this field

The same passenger's **price is stored correctly**: `passengerPrice` 6,383.80, matching Sabre's
ticket total 6,383.80 exactly, and `bookingStatus` is 2 (Booked) like everyone else. So the
passenger was persisted; only the ticket number was not captured.

`reissuable` is **`true`** for this passenger. The application will therefore offer to reissue a
document it cannot name.

## Where it is lost, and where it is not

The loss is **upstream of the reissue flow**. The Portal's own stored booking record already has
the empty string, so the reissue endpoints are faithfully passing on what they were given, and the
screen faithfully renders "—" for a null.

Under the §2.0 oracle this is **not** a "returned but not displayed" flag — the backend did not
return it. It is the other kind of defect: **the supplier holds a value the application lost.**

## Reproduced — two bookings, two lost tickets

| Booking | GDS PNR | Tickets issued at Sabre | Lost by the application | Passenger |
|---|---|---|---|---|
| `NDCEG-BR-F260928CMve29` | `PRUOOC` | `…099` – `…104` | **`0654859779100`** | emad ahmed, Adult, passenger 2 |
| `NDCEG-BR-F260928v8EC7m` | `PUAUTI` | `…105` – `…110` | **`0654859779105`** | ahmed ezz, Adult, **LEAD passenger**, passenger 1 |

Both bookings are Multi City, both have six passengers (2 ADT / 2 CHD / 2 INF), and in both cases
**exactly one Adult's ticket is lost** while all five others are stored correctly. Sabre confirms all
twelve tickets exist and are `Issued/TE`.

The second occurrence is worse than the first: it is the **lead passenger**, the one the booking is
listed under and the one an agent would quote first.

**Not a positional bug.** The loss is passenger 2 in the first booking and passenger 1 in the second,
so it does not track the passenger index.

**An observation, not a conclusion:** the two ticket numbers issued by the two bookings run
consecutively (`…099`–`…104`, then `…105`–`…110`), and the two lost ones are **`…100`** and
**`…105`**. Whether that is meaningful or coincidence cannot be told from two data points — it is
recorded so whoever debugs this has it.

**Still not established:** the mechanism. Whether it is specific to Multi City, to Adults, to a
particular position in the ticketing loop, or general. Two occurrences, both Multi City, both Adult.

## Steps to reproduce

1. Sabre CERT, `POST /v1/trip/orders/getBooking` with `{"confirmationId":"PRUOOC"}`. Read
   `flightTickets[]` — **six** tickets, `0654859779099` … `0654859779104`, all `Issued/TE`.
2. Portal `http://192.168.1.60:9500`, agency **AGN9780** → **My Bookings** → open
   `NDCEG-BR-F260928CMve29` (order `AGN9780NDCNDCORD260928ZZ2RWB`).
3. DevTools → Network → `GET …/v2/bookingDetails2/itinerary/AGN9780NDCNDCORD260928ZZ2RWB`.
   In `passengerList[]`, passenger 2 has `ticketNo: ""` while `passengerPrice` is correct.
4. Click **Reissue**. The passenger list shows **`2- emad ahmed  ADULT · Ticket —`**.
5. `GET …/v2/reissue/{ref}/eligibility` → `passengers[1].ticketNumber: null`,
   `reissuable: true`.

## Expected

The application stores and displays `0654859779100` for passenger 2, as Sabre issued it.

## Actual

Empty at rest, null over the reissue API, "—" on screen.

## Risk

Sabre's `flightReshop` takes ticket numbers, not an order id. An exchange driven from the
application's own passenger list would be one ticket short. The core service sidesteps this by
resolving the booking from the **PNR** rather than from the app's record, so the exchange itself may
still succeed — but the application's record stays wrong, and any flow that depends on its own
ticket list (void, refund, reporting, reconciliation) has nothing to work with for this passenger.

## Consequence — NOT established. An earlier claim here was wrong.

**Withdrawn:** this section previously claimed a five-for-five result proving that a booking missing
a ticket number cannot be exchanged. **Scenario 6 falsified it.**

| # | GDS PNR | All six ticket numbers held | Trip type | Exchange |
|---|---|---|---|---|
| 1 | `OWXGIW` | **Yes** | One Way | **Succeeded** |
| 2 | `QIKISQ` | **Yes** | Round Trip | **Succeeded** |
| 3 | `PRUOOC` | **No** — `…100` | Multi City | **Failed**, opaque 409 |
| 4 | `PUAUTI` | **No** — `…105` | Multi City | **Failed**, opaque 409 |
| 5 | `PTFEBY` | **Yes** | Multi City | **Succeeded** |
| 6 | `PUBPBJ` | **No** — `…133` | **One Way** | **SUCCEEDED** |

Scenario 6 is a booking with a **missing ticket number that exchanged perfectly** — all six original
coupons `Exchanged` at Sabre, including `0654859779133`, the very document the application does not
hold. So:

- **A missing ticket number alone does not prevent an exchange** (scenario 6).
- **Multi City alone does not prevent an exchange** (scenario 5).
- Both failures happened to be **Multi City *and* missing a ticket**.

That leaves an **interaction hypothesis** — two supporting cases, none contradicting — but it is far
weaker than what was claimed, and two cases are not a pattern. The mechanism I proposed (the exchange
request being assembled from the app's own ticket list) is **not supported**: scenario 6 shows the
exchange resolving a ticket the app never stored, which means it is resolved from the PNR at the
supplier, not from the application's record.

**What this finding is, therefore:** a **data-integrity defect** — the application permanently loses
a ticket number the supplier issued. It affects display, reporting, reconciliation, and any flow that
needs to name that document. **It is not, on current evidence, the cause of the exchange failures.**

FINDING-R07 (exchange fails with no diagnosable reason) is accordingly **reopened with no leading
candidate**.

## Steps to reproduce

1. Sabre CERT, `POST /v1/trip/orders/getBooking` with `{"confirmationId":"PRUOOC"}`. Read
   `flightTickets[]` — **six** tickets, `0654859779099` … `0654859779104`, all `Issued/TE`.
2. Portal `http://192.168.1.60:9500`, agency **AGN9780** → **My Bookings** → open
   `NDCEG-BR-F260928CMve29` (order `AGN9780NDCNDCORD260928ZZ2RWB`).
3. DevTools → Network → `GET …/v2/bookingDetails2/itinerary/AGN9780NDCNDCORD260928ZZ2RWB`.
   In `passengerList[]`, passenger 2 has `ticketNo: ""` while `passengerPrice` is correct.
4. Click **Reissue**. The passenger list shows **`2- emad ahmed  ADULT · Ticket —`**.
5. `GET …/v2/reissue/{ref}/eligibility` → `passengers[1].ticketNumber: null`,
   `reissuable: true`.

## Expected

The application stores and displays `0654859779100` for passenger 2, as Sabre issued it.

## Actual

Empty at rest, null over the reissue API, "—" on screen.

## Risk

Sabre's `flightReshop` takes ticket numbers, not an order id. An exchange driven from the
application's own passenger list would be one ticket short. The core service sidesteps this by
resolving the booking from the **PNR** rather than from the app's record, so the exchange itself may
still succeed — but the application's record stays wrong, and any flow that depends on its own
ticket list (void, refund, reporting, reconciliation) has nothing to work with for this passenger.

## Consequence — the booking cannot be exchanged. Five-for-five, with a controlled discriminator.

| # | GDS PNR | Application holds all six ticket numbers | Trip type | Exchange outcome |
|---|---|---|---|---|
| 1 | `OWXGIW` | **Yes** | One Way | **Succeeded** |
| 2 | `QIKISQ` | **Yes** | Round Trip | **Succeeded** |
| 3 | `PRUOOC` | **No** — `0654859779100` missing | Multi City | **Failed**, opaque 409 |
| 4 | `PUAUTI` | **No** — `0654859779105` missing | Multi City | **Failed**, opaque 409 |
| 5 | `PTFEBY` | **Yes** | **Multi City** | **Succeeded** |

**Scenario 5 was run specifically to break the tie.** After scenarios 3 and 4 both failed, the
missing ticket number and the Multi City trip type were confounded — every failure was both. A
booking that was **Multi City with all six ticket numbers present** separates them.

It **succeeded**. Multi City is therefore **cleared**, and the presence or absence of the ticket
number is the only variable that separates every success from every failure across five bookings.

### Why the mechanism fits

Sabre's exchange and `flightReshop` are addressed **by ticket number**, not by order id. A request
assembled from the application's own passenger list is one document short when a ticket number is
missing, which is consistent with the supplier refusing the whole exchange atomically — which is
exactly what was observed: nothing charged, nothing changed at Sabre, no partial state.

### What is still not proven

The mechanism is **inferred, not observed.** No log or developer statement confirms what the
exchange request is assembled from, because the failure message carries nothing and
`logs/detail.log` has never been available. Five bookings is a small sample, and all five are the
same agency, supplier and passenger mix (2 ADT / 2 CHD / 2 INF).

**What would settle it:** `logs/detail.log` for either failed attempt, or a developer confirming
whether the exchange request reads ticket numbers from the application's booking record.

## Evidence

- `discovery/evidence/s3-sabre-getBooking-PRUOOC-before.json` — six tickets at the supplier
- `discovery/evidence/s3-itinerary-api-before.json` — `ticketNo: ""`, price correct
- `discovery/evidence/s3-portal-eligibility.json` — `ticketNumber: null`, `reissuable: true`
- `discovery/evidence/s4-sabre-getBooking-PUAUTI-before.json` — the second occurrence, lead passenger
- `discovery/evidence/s5-sabre-getBooking-PTFEBY-after.json` — Multi City, all six tickets, exchange succeeded
- `discovery/evidence/s6-sabre-getBooking-PUBPBJ-before.json` — third occurrence (Child passenger)
- `discovery/evidence/s6c-sabre-getBooking-PUBPBJ-after.json` — **the falsifier**: missing ticket, exchange succeeded

---

# UPDATE, 2026-09-30 — a fourth occurrence that changes what this defect is

Everything above treats the loss as sporadic: one ticket here, one there, "two occurrences, both
Multi City, both Adult", with an open question about whether it is tied to a position in the
ticketing loop. **A fourth booking answers that question, and the answer is that the loss is
positional and systematic.**

## The occurrence

`NDCEG-BR-F2609294YODAr` · GDS PNR **`RPTIYO`** · order `BRN503NDCORD2609295ENC6G` · **multi city**
CAI→RUH 01 Mar 2027 / RUH→DMM 02 Mar 2027 · 6 passengers · Admin · agency NDC2_Mohamed Soliman
Emirates · AED · 2026-09-29

| # | Passenger | Type | Sabre holds | Application holds |
|---|---|---|---|---|
| 1 | sayed ahmed | Adult | 0654859779386 | 0654859779386 |
| **2** | **emad eid** | **Adult** | **0654859779387** | **blank** |
| 3 | eid saeed | Child | 0654859779388 | 0654859779388 |
| **4** | **khaled sayed** | **Child** | **0654859779389** | **blank** |
| 5 | ayman ezz | Infant | 0654859779390 | 0654859779390 |
| **6** | **fahmy ahmed** | **Infant** | **0654859779391** | **blank** |

**Every even-numbered passenger, with no exceptions.** Positions 1, 3 and 5 stored; 2, 4 and 6 lost.
Sabre holds all six, consecutively numbered, all coupons live.

## What this changes

**1 · The loss is positional, not sporadic.** Three of six lost in a strict alternating pattern is
not consistent with an intermittent fault. It points at the code that writes passenger records —
a loop advancing two positions per iteration, or a pairing that consumes two passengers and records
one. That is a far narrower target than "ticket numbers sometimes go missing".

**2 · The "both Adult" observation above is superseded.** This occurrence spans Adult, Child **and**
Infant. Passenger type is not a factor.

**3 · The "both Multi City" observation is weakened.** Three of four occurrences are multi city, but
`PUBPBJ` (occurrence 3) is One Way, so trip type is not necessary either.

**4 · Two different empty representations.** The booking record stores `""` (empty string) while the
reissue eligibility endpoint reports `null` for the same passengers. Same gap, two encodings —
relevant to anyone writing a null-check.

## The consequence that was not previously visible

This booking was then exchanged, and two further defects surfaced that this one enables:

- **FINDING-R14** — after the exchange the application holds `null` for **all six** passengers. The
  booking went from 3 of 6 to **0 of 6**. The reissue did not repair the gap; it destroyed the rest.
- **FINDING-R13 (Critical)** — passenger 2, `emad eid`, one of the three blanked here, received **no
  replacement ticket and no EMD** from the supplier. His original ticket is marked `Exchanged` on
  both coupons. He has no valid travel document.

**The relationship between this finding and R13 is unproven and must not be assumed.** Passengers 4
and 6 were blank here too and both were ticketed correctly on exchange — so a blank number does not
by itself cause a ticketing failure. The correlation is 1 of 3. What is certain is that this defect,
together with R14, is what made R13 invisible: with no ticket numbers displayed, nothing
distinguishes the passenger who has no ticket from the five who do.

## Updated occurrence table

| # | Booking ref | GDS PNR | Trip | Lost | Passengers affected |
|---|---|---|---|---|---|
| 1 | `NDCEG-BR-F260928CMve29` | `PRUOOC` | Multi City | `…100` | 1 of 6 — Adult, passenger 2 |
| 2 | `NDCEG-BR-F260928v8EC7m` | `PUAUTI` | Multi City | `…105` | 1 of 6 — Adult, **lead** passenger |
| 3 | — | `PUBPBJ` | One Way | `…133` | 1 of 6 — Child |
| **4** | **`NDCEG-BR-F2609294YODAr`** | **`RPTIYO`** | **Multi City** | **`…387`, `…389`, `…391`** | **3 of 6 — every even passenger, Adult + Child + Infant** |

## Evidence

- `discovery/evidence/s9-admin-itinerary.json` — the application's record: three blanks
- `discovery/evidence/s9-sabre-getBooking-RPTIYO-before.json` — all six tickets at the supplier
- `discovery/evidence/s9-admin-bookingConfirm.json` — after the exchange, all six `null`
- `discovery/evidence/s9-sabre-getBooking-RPTIYO-after.json` — the supplier state that revealed R13

## Housekeeping note

The body above contains three partly overlapping occurrence tables (the original pair, the
falsifier table, and the exchange-outcome table) written as evidence accumulated. They are
consistent but repetitive. The table in this update is the current one; the earlier tables should be
consolidated into it when this finding is next revised.
