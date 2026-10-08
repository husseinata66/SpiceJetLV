# Core service — Sabre ATPCO Reissue Field Map (extract)

**Source:** "Sabre ATPCO Reissue Field Map", supplied by Mohamed Soliman on 2026-09-27 as an HTML
page. Its own footer states it is **generated from the mappers** —
`SabreAtpcoReissueMapper`, `SabreAtpcoPriceCalculator`, `SabreAtpcoExchangeValidator`,
`SabreAtpcoBookingViewMapper`, `SabreExchangeMapper` — **not from Sabre's documentation**.
Last reconciled against the code **2026-09-27**.

**Provider:** `SABRE_ATPCO` · config prefix `providers.sabre-atpco` · required
`providers.sabre-atpco.pcc`.

> **Status of this file.** A faithful extract of the parts that bear on `reissue-mapping` §2, kept so
> the mapping scope has a traceable source on disk. It is **not** a substitute for the original page,
> which should be saved beside it. Where this extract and the page disagree, the page wins.

---

## 0. The three origin classes the page uses

| Badge | Meaning |
|---|---|
| **Supplier** | Read straight from Sabre's response |
| **Derived here** | Computed by the core service — **not** a supplier value |
| **Constant** | Hard-coded; no supplier input at all |
| **Never set** | Always null/empty for this provider |

**This classification is the single most important thing in the document for the mapping scope:** it
is the authoritative answer to §1 question 1 (**provenance**) for hop B, field by field.

---

## 1. The shape of ATPCO reissue pricing

> "the reshop reports only a difference, so every absolute price is the confirmed original plus that
> difference — and it is the only provider that redisplays the whole booking after the exchange."

So Sabre's `totalPriceDifference.baseFare` / `.totalTax` **are already deltas**, despite names that
read like absolutes. Core's `baseDifference` / `taxDifference` names are therefore *more* accurate
than Sabre's, not a renaming risk.

**How every absolute figure is built:**

```
priceDetails.totalAmount = responseId.originalPaidAmount + totalPayableWithoutPenalty
totalPayableWithoutPenalty = totalPriceDifference.grandTotal − .totalFee − E3 overstatement
```

**The penalty is deliberately not part of `totalAmount`** — "it is billed beside the ticket, not
priced into it."

---

## 2. Phase 1 — `POST /api/v1/reissue/eligibility`

Supplier call: `POST /v1/trip/orders/getBooking` (whole booking).

Request body: `supplier`, **`credential` (ignored)**, `pnr`.

| Core field | Origin | Read from | Notes |
|---|---|---|---|
| `isChangeable` | **Derived** | `fareRules[].isChangeable` **+ the live flight documents** | Not the fare rule alone. Requires every rule true **and** every live document issued (`TE`/`TO`) with every coupon open against a confirmed segment. Absent/empty `fareRules` answers `false`. Superseded documents and fee EMDs are skipped. Document checks skipped on a held booking |
| `isAllSegmentsRequired` | **Constant** | always `true` | "ATPCO's exchange **cancels every segment of the booking** and rebooks only what the chosen offer names. There is no 'retain this leg' concept in this wire format" |
| `isAllPassengersRequired` | **Constant** | always `true` | |
| `responseId` | **Derived** | HMAC-SHA256-signed, deflated base64 JSON snapshot | **Null when `isTicketed` is not true** — a held booking cannot reach `/reshop` |
| `warnings[]` | **Derived** | one entry per exchange blocker | Neutral prose, **not** supplier wording. Codes: `FARE_RULES_ABSENT`, `FARE_RULE_CHANGE_NOT_PERMITTED`, `NO_ISSUED_TICKET`, `TICKET_NOT_ISSUED`, `COUPON_NOT_OPEN`, `COUPON_IN_AIRPORT_CONTROL`, `SEGMENT_NOT_CONFIRMED`, `NO_EXCHANGEABLE_COUPON`. Empty when nothing blocks |

### Inside `responseId` (the booking snapshot)

| Token field | Origin | Read from | Notes |
|---|---|---|---|
| `orderId` | Supplier | `bookingId` | **Equals the record locator** for ATPCO (unlike Sabre NDC) |
| `originalPaidAmount` / `originalTotalTaxAmount` / `originalTotalBaseAmount` | **Derived** | Σ `flightTickets[].payment.total` / `.taxes` / `.subtotal` | Only `TO`/`TE` documents. **"this provider does not apply the already-exchanged coupon filter that Sabre NDC does — on a booking exchanged more than once these sums include the superseded generation"** |
| `targetCity` | Supplier | `creationDetails.userWorkPcc` | Falls back to configured PCC |
| `segmentNumbers[]` | **Derived** | `1..N` | **Sabre's own array order is the numbering**, never re-sorted by departure |
| `numberInParty` | **Derived** | travellers **occupying a seat** — a lap infant does not | What `AirBook`'s `NumberInParty` counts, not `travelers.size()` |
| `infantCount` | **Derived** | lap infants among `travelers[]` | |
| `journeyCount` | Supplier | `journeys.size()` | Used to refuse a reshop naming fewer journeys |
| `formOfPaymentType` | Supplier | `payments.formsOfPayment[].type` | **Only `CASH` is supported at fulfilment** |
| `ticketRefs[].ticketNumber` | Supplier | `flightTickets[].number` | |
| `ticketRefs[].travelerIndex` | Supplier | `flightTickets[].travelerIndex` | |
| `ticketRefs[].nameAssociationId` | Supplier | `travelers[travelerIndex − 1].nameAssociationId` | **Never synthesized from `travelerIndex`** — identical in the one real example, which hid the bug. An infant under an adult's name element is where they differ |
| `ticketRefs[].paidTotal` / `paidBase` / `paidTax` | Supplier | `flightTickets[].payment.total` / `.subtotal` / `.taxes` | **Every absolute per-passenger price in the reshop is built on these** |
| `ticketRefs[].taxBreakdown[]` | Supplier | `fares[].taxBreakdown[].taxCode` / `.taxAmount.{amount, currencyCode}` | |

---

## 3. Phase 2 — `POST /api/v1/reissue/reshop`

Supplier call: `POST /v1/offers/flightReshop`. Addressed by **ticket number**, not order id.

**Refusals:**
- A reshop naming **fewer journeys than the booking has** is a **400 before any supplier call**.
- `retainServiceId` is refused — no equivalent in this wire format.
- An empty offers array is **422 `NO_EXCHANGE_OPTIONS_AVAILABLE`**, not an empty 200.
- **"`flightReshop`'s response carries no error field of any kind, so a genuine supplier-side failure
  that returns no offers reads here as no availability."**

### `offers[].modifyPrice` — the difference alone

> **The page contradicts itself here — read this before the table.** Its own heading for this block is
> *"the difference alone — **every figure read, not derived**"*, yet two rows below are badged
> **Derived here** with formulas (`penalty`, `totalPayable`), and `totalPayableWithoutPenalty` is badged
> "Derived here" while carrying `data-origin="supplier"` in the page source.
>
> **Ruling on `totalPayable` (user, 2026-09-27): it equals `grandTotal`.** run-007 agrees — equal on
> 17/17 offers × 2 bookings, twice. This does **not** contradict the formula: Sabre states `grandTotal`
> per fare group as a per-passenger figure, so `Σ (group × count)` reproduces the offer-level
> `grandTotal` exactly. The two diverge **only** when `e3-correction-enabled` is `true`.
>
> **`penalty` is resolved too, by Sabre's own spec (2026-09-27):** `ExchangeCharge.totalTaxOnFee` is
> *"The total amount of tax on change fees"* — a quantity distinct from `totalFee`, which itself lists
> *"total change **or** penalty fees"*. So `totalFee + totalTaxOnFee` is **semantically correct**. It is
> **unevidenced**, not disputed: run-007 only ever observed zero. Tracked as **DS-M4**.
>
> See `FlightReshop_1.0.spec.yml` in this folder for the schema definitions.

| Core field | Origin | Read from | Notes |
|---|---|---|---|
| `totalPayableWithoutPenalty` | **Derived** | `totalPriceDifference.grandTotal − .totalFee −` E3 overstatement | **Not `subtotalBeforeFee`**, which agrees only while `totalTaxOnFee` and the overstatement are both zero |
| `taxDifference` | **Supplier** | `totalPriceDifference.totalTax` | **"Carried with its sign."** |
| `baseDifference` | **Supplier** | `totalPriceDifference.baseFare` | |
| `penalty` | **Derived** | `totalPriceDifference.totalFee` **+ `.totalTaxOnFee`** | Either alone when the other is absent; zero in the stated currency when neither is. **"the offer-level `totalFee` is a plain string while the fare-level one is a breakdown object — a real Sabre inconsistency, not a typo"** |
| `totalPayable` | **Derived** | Σ per fare group: `(grandTotal − E3 overstatement) × that group's passenger count` | **Summed per fare group, not the highest applied to everyone.** Falls back to `subtotalBeforeFee + penalty` when no fare states a `grandTotal` or groups disagree on currency |
| `taxesAndFees[]` | **Never set** | always empty at this level | The per-passenger list carries the codes |

### The E3 correction

`providers.sabre-atpco.e3-correction-enabled` — **default `false`**.

When on, each fare group's `grandTotal` is reduced by `max(0, floor(e3 / 220) × 110)` before it is
specified, "because ATPCO's reshop **overstates the Egyptian E3 tax** by that much and the host will
not charge it."

> "Off by default: a correction is a claim about one host's tax reporting, and an environment that has
> not asked for it must not have money silently adjusted under it."

Switching it on also **stops the exchange tolerating a price decrease** and **stops the response
checks reading the specified amount as a ceiling** — the three move together.

### `offers[].priceDetails` — absolutes

| Core field | Origin | Read from |
|---|---|---|
| `totalAmount` | **Derived** | `responseId.originalPaidAmount + totalPayableWithoutPenalty`. Null when either half is absent |
| `totalTaxAmount` | **Derived** | `responseId.originalTotalTaxAmount + totalPriceDifference.totalTax` |
| `totalBaseAmount` | **Derived** | `responseId.originalTotalBaseAmount + totalPriceDifference.baseFare` |
| `taxesAndFees[]` | **Derived** | per code: snapshot `taxBreakdown[]` merged with `items[].fares[].priceDifference.taxes[]` |

**Tax-list change of 2026-09-21 — wire-visible:** lists are no longer padded to the level's union of
codes. Previously a code a passenger type was not charged read as `0.00` rather than being absent; on
a six-passenger SV party that invented eight lines against the infant. **"ATPCO files `XT`
negative"**, so a fabricated `XT 0.00` stated "no tax is coming back" where the supplier had said
nothing.

> "**Wire-visible:** per-type lists now differ in length, so a consumer zipping two passenger types
> *by index* pairs an ADT's `YQ` against an INF's `XT`. Index alignment was never in the contract, but
> it was the behaviour before this."

### `offers[].modifyPrice.passengerFareBreakdown[]` — per passenger type

| Core field | Origin | Read from | Notes |
|---|---|---|---|
| `passengerTypeCode` | **Supplier** | `items[].fares[].travelers[].passengerTypeCode` | A traveller without one contributes no entry |
| `passengerQuantity` | **Derived** | counted from the offer | |
| `paxTotalAmount` | **Supplier** | `fares[].priceDifference.subtotalBeforeFee` | **"Nothing is subtracted here."** ATPCO states every figure per passenger already |
| `paxBaseAmount` | **Supplier** | `fares[].priceDifference.baseFare` | |
| `paxTotalTaxAmount` | **Supplier** | `fares[].priceDifference.totalTax` | |
| `taxesAndFees[]` | **Supplier** | `fares[].priceDifference.taxes[].taxCode` / `.amount` | |

**Two warnings on this table:**

1. A passenger's own share of the penalty **is computed and reaches nobody** — only the party-level
   `modifyPrice.penalty` is published.
2. **"where a passenger type's members are priced unalike, the first is published for all of them"**
   with a `SABRE_MAPPING_INCOMPLETE` warning. Real ATPCO cert traffic files three adults in two fare
   groups with tax movements `0.00` and `117.80` — "in that case the entries no longer multiply out
   to the offer's own totals."

### `offers[]` root

| Core field | Origin | Notes |
|---|---|---|
| `offerId` | **Derived** | HMAC-SHA256-signed bag carrying the exchange plan. **Ticket numbers, segment ordinals and name-association ids deliberately never ride in it** — it is signed, not encrypted |
| `isRepriceRequired` | **Constant** | **always `false`** — "this supplier has no `isSellable` flag and no reprice endpoint at all" |
| `haveBundles` / `canBeHeld` | **Never set** | always null |

**Three offer flags become a refusal at exchange time, not a response field:**
`hasTravelersInDifferentCabins`, `hasMixedBrands`, `splitBooking` — such an offer is **published
normally by the reshop and refused with a 400 by `/exchange`**.

### `flightSegments`

| Core field | Origin | Read from | Notes |
|---|---|---|---|
| `departureDateTime` | Supplier | `flights[].departureDate + .departureTime` | **Combined, zoneless**; five-character time padded to seconds |
| `arrivalDateTime` | Supplier | `flights[].arrivalDate + .arrivalTime` | |
| `departureTerminal` / `arrivalTerminal` | **Never set** | — | ATPCO's reshop states no terminal |
| `flightTime` | Supplier | `flights[].durationInMinutes` | **The supplier's own filed figure since 2026-09-21**, no longer endpoint subtraction — the endpoints are local and zoneless, so subtracting was wrong by the airport offset |

### `priceClasses` / `baggageDetails`

- `fareDescription`, `rulesAndPenalties[]` — **never set** on this supplier.
- `baggageDetails` — **always `{}`**. "ATPCO's `flightReshop` response carries no baggage data
  anywhere … **Do not raise a bug for it.**"

---

## 4. Phase 3 — `POST /api/v1/reissue/reprice`

> "Nothing to map." · No supplier call · **answers 400 for every offer.**

Every offer reports `isRepriceRequired: false`; a well-behaved caller never reaches this phase. (Note
it differs from Galileo's 409.)

---

## 5. Phase 4 — `POST /api/v1/reissue/exchange`

Three supplier calls in one core call:
`POST /v1.1.0/exchange/booking` → `POST /v1/trip/orders/fulfillFlightTickets` (**one per PQR**) →
`POST /v1/trip/orders/getBooking` (redisplay).

| Core field | Origin | Read from | Notes |
|---|---|---|---|
| `pnr` | Supplier | `ExchangeBookingRS.Reservation.BookingDetails.RecordLocator` | Falls back to the snapshot order id — same locator here |
| `tickets{n}.ticketNumber` | Supplier | fulfilment `tickets[].number` | Falls back to `PriceQuoteReissue[]…ExchangeDetails.DocNumber` |
| `amountCharged` | **Derived** | Σ `ExchangeConfirmation[].PriceComparison.amountReturned` | **Not `ExchangeConfirmation[].ChangeFee`** — the fee is one line inside the collected figure. A verified live exchange returned **12,452.80** against a specified **12,561.80** |
| `orderId` | Supplier | the snapshot order id — the locator | |
| `orderItems[]` / `warnings[]` | **Never set** | always empty | |

**Pre-publish checks:** `ApplicationResults.status` must be `Complete`; counts of
`ExchangeConfirmation[]` and `PriceQuoteReissue[]` must **both** equal the tickets sent; every
`ExchangeDetails.PQR_Status` must be `E`.

**Error model past the first call:** never 502 or 400 — **409 `EXCHANGE_PARTIALLY_APPLIED`** with
`failedStep: TICKETING` or `PAYMENT` and a `pnr:<locator>` recovery reference. The **redisplay is the
one post-commit step that degrades instead of failing** (null booking view, reason logged).

**The change fee arrives on its own EMD** — `ticketStatusCode: "ME"`, no coupons, plus a
`RESOURCE_UNAVAILABLE` warning. The booking then lists three documents for one traveller (superseded,
reissued, EMD); the booking view selects the one carrying `flightCoupons`.

**Fulfilment must name the reissue quote** (`priceQuoteReissueRecordId` from
`PriceQuoteReissue[].PQR_Number`, **not** `ExchangeConfirmation` — the same response says `"2"` in one
and `"02"` in the other). Omitting it does not fail; Sabre settles a quote of its own choosing.

### Config keys

| Key | Default | Effect |
|---|---|---|
| `providers.sabre-atpco.exchange-price-tolerance` | **`0`** | How far Sabre's computed price may move from the specified amount before the ticket halts. **Absolute and currency-agnostic** |
| `providers.sabre-atpco.e3-correction-enabled` | **`false`** | The E3 overstatement correction, plus two coupled behaviours (see §3) |

**Logging:** `@Loggable(EXTERNAL_CALL, ServiceType.SABRE_ATPCO)` on each api interface method
(2026-09-14). Requests and responses are written to `logs/detail.log` in full — **"ticket numbers and
passenger names included — with no switch to turn it off; only the bearer token is masked."**

---

## 6. Phase 4b — the booking view on `/exchange`

From a redisplay `getBooking` **after** commit. On redisplay failure: minimal view (`supplier`, `pnr`,
ticket numbers keyed `1, 2, …`), everything else empty.

Selected fields bearing on the mapping scope:

| Core field | Origin | Read from | Notes |
|---|---|---|---|
| `passengersList[].passengerTypeCode` | Supplier | `travelers[].passengerCode` | **"ATPCO says `CNN` where NDC says `CHD` — an unknown code is never coerced to `ADT`"** |
| `ticketStatus` | **Derived** | `flightTickets[].ticketStatusCode` | `Booked` when `TO`/`TE`; else Sabre's `ticketStatusName` verbatim. **On ATPCO expect `TE` where NDC sends `TO`** — both mean "Issued" |
| `priceDetails.totalAmount` / `totalTaxAmount` / `totalBaseAmount` | Supplier | `payments.flightTotals[0].total` / `.taxes` / `.subtotal` | **As ticketed**, not `flightCurrentTotals` — "they differ after a change" |
| `priceDetails.taxesAndFees[]` | **Derived** | `fares[].taxBreakdown[]`, **multiplied then summed per code** | Party figure; the per-passenger list below is one passenger's |
| `passengerFareBreakdown[].passengerTypeCode` | Supplier | `fares[].pricedTravelerType` | **One entry per fare here, not per grouped passenger type — unlike the reshop, which groups** |
| `voidCapability` | **Constant** | always `"FullVoidOnlyAllowed"` | The other three providers answer `None` or null |
| `bookingToken` | Supplier | exchange `Reservation.BookingDetails.UpdateToken` | **The only provider of the four that fills this** |
| `gdsPNR` | **Constant** | always an empty string | |
| `refundability` | **Derived** | `fareRules[].isRefundable` + `.refundPenalties[]` | `Refundable` — **note the word**; Travelport flavours answer `FullyRefundable` for the same state |
| `priceClassName` | Supplier | `fares[].fareConstruction[].fareBasisCode` | **"This provider publishes the fare basis where the fare family would go"** |
| `baggageDetails` | **Derived** | `fareOffers[].cabinBaggageAllowance` / `.checkedBaggageAllowance` | **Populated here, unlike the reshop** |

`passengersList` and `contacts` **contain PII** — names, birth dates, passport numbers.
`travelDocument.documentNumber` is "a **passport number**, in the response by contract and therefore
also in the request/response log."
