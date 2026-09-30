# Scenario 1 — Core service vs Screen vs Supplier (one-way, full cycle)

**Run:** run-007 · shared scope `reissue-mapping` · **Booking** `NDCEG-BR-F26092704TCQE`
**GDS PNR** `OWXGIW` · **Airline PNR** `DCSV` · Agency `AGN9780` · Sabre Staging, credential 315
**Captured:** 2026-09-27, headed browser, Africa/Cairo (UTC+2)

Original: One Way CAI→JED, SV 382, 02-12-2026, class V, 6 pax (2 ADT / 2 CHD / 2 INF), 31,346.80 EGP.
Exchange searched: **CAI→RUH, 20 Dec 2026** — chosen over a same-route search because
`baseDifference` is flat 0.00 on CAI→JED, giving no base-fare mapping coverage at all.

---

## 1. Hop A — eligibility (core `/api/v1/reissue/eligibility` → Portal `/v2/reissue/{ref}/eligibility`)

| core field | value | Portal field | value |
|---|---|---|---|
| `isChangeable` | `true` | `offerReissuable` | `true` |
| `isAllSegmentsRequired` | `true` | `journeysDetails.allJourneysRequired` | `true` |
| `isAllPassengersRequired` | `true` | `passengersDetails.allPassengersRequired` | `true` |
| `responseId` | 722 chars | `metadata` JWT → `data.responseId` | **byte-identical** |
| `warnings` | `[]` | — | — |

`responseId` is reproduced verbatim inside the Portal's `metadata` JWT. A direct core call made
outside the Portal returned the identical value, so it encodes booking state, not a session.

Screen: "All journeys are included by the airline and cannot be changed" / same for passengers —
the rendering of the two `…Required` booleans. Itinerary `actionsDetails.canAutoReissue: true`,
`canManualReissue: false`.

## 2. Hop A — reshop (core `/api/v1/reissue/reshop` → Portal `/v2/reissue/{ref}/search`)

Request shape (core): `{supplier, credential, responseId, searchCriteria:[{origin, destination, date}]}`.
`searchCriteria` is an **array**; a leg key is `date` (not `departureDate`) — `MALFORMED_REQUEST`
otherwise. Both undocumented in the field map.

**Offer count matches: 30 core offers = 30 screen options.**

Lowest-fare offer, field by field:

| core `offers[0].modifyPrice` | value | Portal `offers[k].reissuePricing` | value |
|---|---|---|---|
| `baseDifference` | **−3,732.00** | `additionalTotalBaseAmount` | **−3,732.00** |
| `taxDifference` | **678.80** | `additionalTotalTaxesAndFeesAmount` | **678.80** |
| `penalty` | **12,974.00** | `supplierPenalty` | **12,974.00** |
| — *(no core equivalent)* | — | `changeFee` | **300.00** |
| `totalPayable` | **9,920.80** | `totalPayable` | **10,220.80** |

| core `offers[0].priceDetails` | value | Portal `priceDetails` | value |
|---|---|---|---|
| `totalAmount` | 28,293.60 | `totalOfferAmount` | 28,293.60 |
| `totalBaseAmount` | 11,198.00 | `totalBaseAmount` | 11,198.00 |
| `totalTaxAmount` | 17,095.60 | `totalTaxAndFeesAmount` | 17,095.60 |

Identity confirmed on this offer: `totalPayable = baseDifference + taxDifference + penalty`
→ −3,732.00 + 678.80 + 12,974.00 = **9,920.80**.

### 2.1 `totalPayable` differs across the hop by the change fee — DS-M6, **Resolved**

The same field name carries a different quantity on each side: core excludes the agency change fee,
the Portal includes it. Every offer differs by exactly the change fee (300.00 = 6 pax × 50, D-7).

**Resolved (user, 2026-09-28): this is correct behaviour.** The change fee is applied by the
application itself — configured in Admin, present on Admin and Portal only. It is never initiated by
the core service or the supplier. Each layer therefore reports its own total, and core's
`totalPayable` *should* exclude a fee that core knows nothing about. §6.3 confirms this on the
supplier's own numbers: Sabre collected **9,920.80** (= core `totalPayable`) while the customer paid
**10,220.80**.

Recorded as a **note for integrators, not a defect**: the two `totalPayable` values are both correct
for their layer, so a consumer must not carry the figure across the hop without knowing which layer
produced it.

> **ID correction (2026-09-28):** first written as DS-M5, which collides with the existing DS-M5
> (Sabre `Refund` / D-9 collision) in the Project Context. Renumbered to **DS-M6**.

### 2.2 The change fee is Portal-side, and it is stated per passenger-type group

`reissuePricing.changeFee` is 300.00 at offer level and **100.00 on each of the three
`passengerFareBreakdowns` entries** — each entry covers 2 passengers, so 100 = 2 × 50. Consistent
with D-7 (Agency 50 per passenger). The supplier contributes nothing to it: core's `penalty`
(12,974.00) is the supplier's own charge and is reported separately as `supplierPenalty`.

### 2.3 Ragged per-type tax lists observed — the 2026-09-21 change, confirmed on the wire

INF carries **10** tax codes; ADT and CHD carry **12**. INF's `XK` is **−52.00** (negative).
This is exactly the behaviour the field map records for 2026-09-21: lists are no longer padded to
the level's union of codes, so a consumer zipping two passenger types **by index** pairs an ADT code
against an unrelated INF code. First direct observation in this run.

### 2.4 Non-zero `penalty` observed — does not by itself resolve DS-M4

run-007 had only ever observed `penalty = 0`. Here it is **12,974.00** on all 30 offers.
This does **not** resolve DS-M4, which is specifically about whether `totalTaxOnFee` contributes:
`penalty = totalFee + totalTaxOnFee`, and a non-zero total is equally consistent with
`totalTaxOnFee` still being 0. Decomposition requires the raw Sabre `flightReshop` response.

## 3. Review & Pay — every displayed value

Selected: **SV 310, CAI 10:40 → RUH 14:15, 20 Dec 2026, nonstop, 2h 35m, Economy V, BASIC ECO.**

| Screen line | Screen | Source |
|---|---|---|
| Additional base fare · 2 Adult | −2,072.00 | `reissuePricing.passengerFareBreakdowns[ADT].additionalTotalBaseAmount` |
| Additional base fare · 2 Child | −1,452.00 | same, CHD |
| Additional base fare · 2 Infant | −208.00 | same, INF |
| Additional taxes · 2 Adult | 243.60 | `…[ADT].additionalTotalTaxesAndFeesAmount` |
| Additional taxes · 2 Child | 243.60 | same, CHD |
| Additional taxes · 2 Infant | 191.60 | same, INF |
| Supplier fee | 12,974.00 | `supplierPenalty` ← core `penalty` |
| Change fee | 300.00 | `changeFee` (Portal-derived) |
| **Total additional** | **10,220.80** | `reissuePricing.totalPayable` |
| **AMOUNT PAYABLE** | **10,220.80** | same |

Sidebar repeats the offer-level figures: −3,732.00 / 678.80 / 12,974.00 / 300.00. Per-type base
figures sum to the offer-level value (−2,072 − 1,452 − 208 = −3,732 ✓); taxes likewise
(243.60 + 243.60 + 191.60 = 678.80 ✓).

### 3.1 FINDING-R02 — "Currently ticketed → Total" is rounded, and contradicts its own line items

| | |
|---|---|
| Screen shows | **31,347.00 EGP** |
| Its own six line items sum to | **31,346.80 EGP** |
| Portal `/review` API `currentOffer.priceDetails.totalOfferAmount` | **31,346.80 EGP** |
| Booking's actual total (itinerary, Costing) | **31,346.80 EGP** |

8,086.00 + 6,014.00 + 830.00 + 6,263.60 + 6,263.60 + 3,889.60 = 31,346.80.
The API is correct at every level; the UI rounds this one line to the whole EGP and formats it
`.00`. "Total additional" and "AMOUNT PAYABLE" on the same screen are **not** rounded, so the
defect is isolated to the Currently-ticketed total. Severity is low in money terms (0.20 EGP) but
it is a total that disagrees with the figures printed directly above it.

## 4. FINDING-R01 — reproduced, and narrowed to the itinerary page

| Screen | SV 382 departure | SV 382 arrival |
|---|---|---|
| Booking details / Itinerary | 08:10 | 11:20 |
| Reissue results grid (same flight) | **06:10** | **09:20** |
| Portal itinerary API (`deptTime`/`arrTime`) | 06:10 | 09:20 |
| epoch `departureDate` 1796191800000 | 2026-12-02T06:10:00Z | — |

Two screens in the same application render the same supplier values differently. The reissue
results grid agrees with the API; the itinerary page adds the browser's UTC+2. This narrows
FINDING-R01 from "itinerary times are shifted" to **the itinerary page's own rendering**, and rules
out the data and the core service as the source. FINDING-R01 step 6 (browser forced to UTC /
Asia/Dubai) remains unrun, but is now largely redundant.

## 5. Evidence files

`s1-before-state.json` · `s1-itinerary-api-OWXGIW.json` · `s1-itinerary.png` · `s1-selection.png` ·
`s1-widget.png` · `s1-core-eligibility-OWXGIW.json` · `s1-portal-eligibility.json` ·
`s1-core-reshop-request.json` · `s1-core-reshop-CAI-RUH.json` · `s1-core-reshop-baseline.json` ·
`s1-portal-search-CAI-RUH.json` · `s1-portal-search-request.json` · `s1-portal-review.json` ·
`s1-review-and-pay.png`


## 6. The exchange, and the supplier side

The human clicked **Confirm & charge EGP 10,220.80** at 2026-09-27 14:42. The platform never
clicked it (D-M1). Everything below is read-only verification afterwards.

### 6.1 What changed

| | Before | After |
|---|---|---|
| Booking reference | `NDCEG-BR-F26092704TCQE` | **`NDCEG-BR-F260927ddTlHj`** |
| Order id | `AGN9780NDCNDCORD260927XMFO4U` | **`AGN9780NDCNDCORD260927U5JV1B`** |
| **GDS PNR** | `OWXGIW` | **`OWXGIW` — unchanged** |
| Airline PNR | `DCSV` | **`7PUS9X`** |
| Flight | SV 382 CAI→JED 02 Dec | **SV 310 CAI→RUH 20 Dec** |
| Tickets | `…747` – `…752` | **`…768` – `…773`** |
| Wallet | 8,606,528.800 | **8,596,308.000** (−10,220.80 exactly) |

The GDS PNR is the stable identifier across an exchange; the booking reference and airline PNR are
both reissued. Anything keyed on booking reference breaks across a reissue.

### 6.2 Sabre `getBooking` on `OWXGIW` — 18 documents

| Documents | Status | Meaning |
|---|---|---|
| `…747` – `…752` (6) | `couponStatus: Exchanged`, `TE` | the original tickets, superseded |
| `…768` – `…773` (6) | `TE` | the new tickets — identical to the Portal confirmation |
| `0651953370312` – `…317` (6) | **`ME`** | **EMDs — one per passenger, carrying the penalty** |

`isTicketed: true`. The exchange linkage is explicit in the accounting text:
`E-e0654859778752` on the new ticket `…773` points back at the old one.

### 6.3 The supplier's own totals — three confirmations at once

```
payments.flightTotals      subtotal 14930.00  taxes 33512.40  total 31346.80
payments.ancillaryTotals   subtotal  9920.80  taxes     0.00  total  9920.80
```

1. **The six Exchanged tickets sum to 31,346.80** — the supplier's figure for the original ticket.
   FINDING-R02 is contradicted by four independent sources (line items, `/review` API, Costing, and
   Sabre itself). The screen's 31,347.00 is wrong, not merely rounded for display.

   > **Corrected 2026-09-28.** This point originally cited `payments.flightTotals.total`, which also
   > read 31,346.80 here. That was a **coincidence**: `flightTotals` sums *every* flight ticket in
   > the PNR, old and new, and in this exchange all six new tickets had `total` 0. Scenario 2 shows
   > the difference — there `flightTotals.total` is 44,122.40 against an original of 43,786.80,
   > because two infant tickets carry 167.80 each. **Sum the Exchanged tickets; do not read
   > `flightTotals`.**

2. **The supplier collected 9,920.80 — exactly core's `totalPayable`** — while the customer paid
   10,220.80. The 300.00 change fee never reaches Sabre. This is the cleanest confirmation that the
   change fee is agency revenue, and it closes §2.2.

   > **Corrected 2026-09-28.** This originally said `ancillaryTotals.total` *equals* core's
   > `totalPayable`. It does not in general. Sabre splits the collection across the EMDs **and** the
   > new tickets; here the new tickets were all 0 so the EMD total alone matched. In scenario 2 the
   > EMDs are 10,749.20 and the infant tickets add 335.60, together making core's 11,084.80.
   > **The supplier-side total is EMDs + new-ticket amounts.**

3. **`ancillaryTotals.taxes` = 0.00**, and the EMD accounting row carries `taxAmount: "0.00"`
   against `fareAmount: "342.80"`.

### 6.4 DS-M4 — still unevidenced, now with a reason

`penalty = totalFee + totalTaxOnFee`. This exchange is the first with a **non-zero** penalty
(12,974.00), so it is the first that could have shown `totalTaxOnFee` contributing. It does not:
every tax figure attached to the fee is **0.00** — `ancillaryTotals.taxes`, and the EMD's own
`taxAmount`. So `penalty = totalFee` here, and DS-M4 remains **unevidenced rather than resolved**.
Establishing it needs a market where SV files tax on the change fee; Sabre CERT/EZ4K on this route
does not.

> Caveat: Sabre returned only **2** `accountingItems`, both for traveller 6, so the per-passenger
> EMD amounts for travellers 1–5 were not readable from this response. The offer-level and
> `ancillaryTotals` figures are unaffected.

### 6.5 FINDING-R03 — the confirmation presents the supplier penalty as tax

The Portal's `/v2/bookingConfirm/{order}` returns:

```
totalTax        13652.80     ( = taxDifference 678.80 + supplierPenalty 12,974.00 )
serviceCharges    300.00     ( = changeFee )
```

There is **no separate penalty field**, and neither 678.80 nor 12,974.00 appears anywhere in the
payload. The two are merged server-side before the response is built, so the confirmation page and
the e-ticket both render:

| | Review & Pay | Confirmation |
|---|---|---|
| tax line | Additional taxes **678.80** | Taxes (+) **13,652.80** |
| penalty line | Supplier fee **12,974.00** | *absent* |
| fee line | Change fee **300.00** | Service Charges (+) **300.00** |

Totals agree (10,220.80); the **attribution does not**. A change penalty is presented to the
customer as tax on the document they keep — and Sabre itself books it as an EMD with
`taxAmount 0.00`, i.e. explicitly not tax. Review & Pay got it right one step earlier, so the
information exists and is discarded. **Severity: Medium** — customer-facing financial
misattribution, not a total error.

### 6.5.1 FINDING-R05 — the change fee is moved into the `serviceCharges` field

The fee line in the table above is a **second, separate defect**, and it is not a relabelling.
`changeFee` and `serviceCharge` are two distinct fields that coexist through search and review:

| Payload | `changeFee` | `serviceChargeAmount` / `serviceCharges` |
|---|---|---|
| `/search` | **300** (offer), **100** per type | **0** |
| `/review` | **300**, **100** per type | **0** |
| `/bookingConfirm` | **absent — field gone** | **300** |

The change fee is written into the generic booking service-charge slot — a field this booking
reports as 0.00 at every earlier step — and its own field is dropped. Consequences: reporting that
sums `serviceCharges` conflates agency change fees with genuine service charges, and a booking
carrying both has one field for two amounts (not reproduced here; this booking's service charge was
0.00). Raised separately as **FINDING-R05**.

Between R03 and R05, `/bookingConfirm` preserves only the **total**: of the three components Review
& Pay states correctly — taxes 678.80 · supplier fee 12,974.00 · change fee 300.00 — the
confirmation misattributes two.

### 6.6 FINDING-R01 — reproduced on the new booking, and now isolated

| Screen | SV 310 departure | SV 310 arrival |
|---|---|---|
| Confirmation page | **10:40** | **14:15** |
| Portal itinerary API | **10:40** | **14:15** |
| Sabre `getBooking` | 2026-12-20 | — |
| **Booking details / Itinerary page** | **12:40** | **16:15** |

Three renderings of the same value; only the booking-details itinerary page adds the browser's
UTC+2. Combined with §4 (where the reissue grid was correct and the same page was wrong),
FINDING-R01 is **conclusively isolated to the booking-details itinerary page**. Not the data, not
the core service, not the supplier, and not a global formatter. Step 6 of the original finding
(forcing the browser to UTC / Asia/Dubai) is now unnecessary.

### 6.7 FINDING-R04 — "Reissue History" counts rows, not reissues

The panel reads **"2 Reissues"** for a booking exchanged **once**. The table holds two rows —
`Original booking` (Reissued) and `Auto Reissue` (Booked, Current) — and the caption counts rows.
Cosmetic, low severity, but it will read as "2" after one exchange and "3" after two.

That same table renders the original as **31,346.80 EGP** — the correct figure, and the fourth
source contradicting FINDING-R02.

### 6.8 After-state

New order shows `Total Sales / Net / Booking Amount` = **10,220.80** — the amount *paid for the
exchange*, not the value of the new ticket. Per-passenger `passengerPrice` values
(2,637.80 ×2 · 2,079.80 ×2 · 392.80 ×2) sum to 10,220.80 ✓. `canAutoReissue` is `true` again, so
the new order is itself exchangeable.

### 6.9 `logs/detail.log` — NOT captured

Required by D-M1 and **not done**. The file is not in the repository and not on this machine;
`logs/` does not exist locally and a filesystem search found no `detail.log`. It presumably lives
on the application host `192.168.1.60`, which is reachable over HTTP but not as a filesystem from
here. **Open: supply the path or a copy, and this section gets completed.** Nothing in §6 depends
on it — the supplier verification above is complete on its own — but the D-M1 obligation is
outstanding.

## 7. Evidence files added after the exchange

`s1-confirmation.png` · `s1-portal-book.json` · `s1-portal-fare-confirmation.json` ·
`s1-portal-bookingConfirm.json` · `s1-itinerary-api-after.json` ·
`s1-sabre-getBooking-OWXGIW-after.json`
