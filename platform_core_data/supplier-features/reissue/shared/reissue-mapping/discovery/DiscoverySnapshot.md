# Discovery Snapshot — reissue-mapping (run-007, Stage 2)

- **Scope:** Supplier Features → `reissue` → Shared scope `reissue-mapping`
- **Upstream:** `context/ProjectContext.md` Revision 12
- **Observed:** 2026-09-26 → 2026-09-30
- **Status:** Pending Review

Behavioural description of the reissue mapping chain **as observed**. No selectors, no DOM captures, no
locator candidates — those belong to Stage 4A against the application as it exists then (`pipeline.md`
§3.5).

## 1. The chain

```
Sabre CERT REST (PCC EZ4K)
   POST /v2/auth/token
   POST /v1/offers/flightReshop        <- the offer set, in EGP
   POST /v1/trip/orders/getBooking     <- documents per traveler
        |
        |  hop B
        v
ndc-core-service
   POST /api/v1/reissue/reshop         <- supplier: SABRE_ATPCO, credential, responseId, searchCriteria
        |
        |  hop A
        v
Admin API /odeysysadmin/   ·   Portal API /odeysysportal/
   GET  /v2/reissue/{ref}/eligibility  <- journeys, passengers, tickets, signed metadata
   POST /v2/reissue/{ref}/search       <- the offer set, in agency currency
   POST /v2/reissue/{ref}/cache-offer
   GET  /v2/reissue/{ref}/review       <- booked offer + new offer + reissuePricing
   GET  /v2/reissue/{ref}/fare-confirmation
   POST /v2/reissue/{ref}/book         <- the human clicks this
   GET  /v2/bookingConfirm/{orderId}   <- invoiceInfo, per-passenger tickets
        |
        v
screen
```

Both channels are served from the same host on port 8080 under different path prefixes. Both reach the
same core service. A GET from page context works; a POST with a JSON content type fails CORS preflight,
so application POSTs are observed through the UI rather than replayed.

## 2. Currency and the exchange rate

The supplier and the core service speak **EGP**. The application converts to the agency's currency by
**multiplying** by a configured rate, which appears in the review payload as `currencyRate`.

Observed at two rates — **9** (scenarios 6–9) and **0.1** (scenario 10) — and the behaviour is identical
in form:

```
screen value = core value x rate          for base, tax, penalty, and the offer total
amount payable = (core totalPayable x rate) + changeFee
```

**The change fee is added after conversion**, and is app-origin: it is `null` in the payload's
supplier-currency block and present only in the agency-currency block. It comes from the Rule Engine's
**Exchange Fees** rule, not from Sabre.

An old ticket keeps the rate in force when it was issued; a new rate applies to new prices only.

## 3. The rule engine

Four Rule Engine areas bear on this chain: **Markup**, **Discount**, **Service Charge** and **Exchange
Fees**. They are configured per Country POS / Branch / Agency, with an amount type and a By-Pax flag.

**On the original ticket** all three price rules apply, per passenger, to the base fare. Observed on
scenario 10 (markup 100, service charge 25, discount 50, six passengers):

```
booked base 2103.00 - supplier base 1503.00 = 600.00 = markup 100 x 6
discountAmount                                300.00 =       50 x 6
serviceChargeAmount                           150.00 =       25 x 6
```

**On a reissue they do not apply.** Every new offer carries `discountAmount: 0` and
`serviceChargeAmount: 0` for every passenger type, through search, review and the confirmation record.
The agency earns the change fee alone. This is confirmed correct by design (§2.5), not a defect.

The review payload exposes the progression explicitly: `totalWithoutRuleEngineAmount` →
`totalWithDiscountAmount` → `totalWithServiceChargeAmount` → `totalOfferAmount`.

**A configuration hazard worth recording.** On scenario 10 the Exchange Fee (25 per pax) and the
service charge (25 per pax) were set to the same value, making them indistinguishable by amount at the
offer level. They were separable only at the invoice, where the rule engine contributes zero to a
reissue so a non-zero `serviceCharges` can only be the change fee. Future test data should set them to
different values.

## 4. Offer alignment — the load-bearing observation

**Each layer calls Sabre separately and receives a different combination and ordering of offers.**
Comparing `offer[0]` to `offer[0]` compares two different flights and produces false mismatches.

Offers must be aligned by **flight signature** — marketing carrier, flight number, departure datetime,
for every segment of every journey in the offer. Under that alignment, scenario 10 matched **18 of 18
offers across all three layers**, with zero value mismatches at either hop.

The field names differ by layer and the values do not:

| Sabre | core | application |
|---|---|---|
| `totalPriceDifference.baseFare` | `modifyPrice.baseDifference` | `reissuePricing.additionalTotalBaseAmount` |
| `totalPriceDifference.totalTax` | `modifyPrice.taxDifference` | `reissuePricing.additionalTotalTaxesAndFeesAmount` |
| `totalPriceDifference.totalFee` | `modifyPrice.penalty` | `reissuePricing.supplierPenalty` |
| `totalPriceDifference.grandTotal` | `modifyPrice.totalPayable` | `reissuePricing.totalPayable` *(+ change fee)* |
| — | — | `reissuePricing.changeFee` *(app-origin)* |

`totalFee` is **absent entirely** from a Sabre offer carrying no penalty — not zero, absent. Code that
assumes the key exists will not survive that.

## 5. Screen behaviour

**Search results.** 18 offers, paginated behind a `Show more (12 of 18)` control — the count in the
header is the full set, the list starts at 12. Each card's DUE NOW equals the payload's `totalPayable`
exactly. Departure times on this screen match the supplier.

**Review & Pay.** Two blocks. *Currently ticketed* itemises base and tax per passenger type plus
Discount and Service charge, then a Total — and **that Total does not equal its own line items** (R02,
R12). *Additional to pay* itemises additional base, additional tax, Supplier fee and Change fee, and
**does** sum correctly. The fare is held behind a countdown backed by the `flight-token` JWT `exp`.
Payment is gated on a Terms & Conditions checkbox.

**Confirmation.** Order id, new booking reference, GDS PNR (unchanged by the exchange), a **new airline
PNR**, and per-passenger ticket numbers. `invoiceInfo` folds the supplier penalty into `totalTax` (R03)
and writes the change fee into `serviceCharges` (R05), and `feeNTaxes` carries an unconverted
supplier-currency figure inside an object labelled with the agency currency (R15).

**Itinerary.** Renders departure and arrival **two hours later** than the API value for the same flight,
while the search results screen renders the same flight correctly — so two screens in one application
disagree about one flight (R01, sibling scope).

**Wallet.** `GET /v2/financial/financial-details` returns `walletBalance`, `topUpBalance` and
`creditLimit`. For a credit-enabled agency `walletBalance = topUpBalance + creditLimit`; for a
non-credit agency `creditLimit` comes back `null` and the two are equal. The `creditAgency` flag scopes
the **agency channel only** — Admin adds the credit line regardless, by design (§2.5). The sidebar
renders three decimals and the page two (R17).

## 6. Ticketing, as the supplier holds it

`getBooking` returns a flat `flightTickets[]` which must be grouped by `travelerIndex`. A correct
post-exchange state is **three documents per traveler**:

```
original ticket   allCoupons[].couponStatus = "Exchanged"  (code E)  - spent
new ticket        no Exchanged coupon                                - live
EMD                                                                  - live
```

`ticketStatusName` reads `Issued` on all three — **including the spent one** — so ticket status is not
the field that tells you whether a passenger can travel. **Coupon status is.**

Gaps in the new-ticket number sequence are not by themselves meaningful: scenario 10 skipped `…630`
with all six travelers correctly ticketed. The test is per traveler, not per sequence.

**The check this scope now requires after every exchange:** group by `travelerIndex` and confirm each
traveler holds at least one document with no `Exchanged` coupon. Scenario 9 failed it (R13). Scenario 10
passed it. Scenarios 1, 2, 5, 6 and 8b predate it and are unverified.

## 7. Error behaviour

- `book` can return **409** with *"the request could not be completed"* — no code, no cause, no
  retry guidance; the order is left Failed (R07).
- A search where every offer is filtered out returns **422 `NO_EXCHANGE_OPTIONS_AVAILABLE`**, which the
  screen presents as an empty market rather than a filtered result (R11).
- `financial-details` returns **401** for an admin user — the admin has no wallet of its own; the
  endpoint resolves an agency only inside a booking context.
- A malformed `responseId` is rejected as *"responseId signature is invalid"*. The value is a signed
  token inside the eligibility response's `metadata` JWT and must be extracted programmatically.

## 8. Environment as observed

| | |
|---|---|
| Admin | `http://192.168.1.60` → API `:8080/odeysysadmin/` |
| Portal | `http://192.168.1.60:9500` → API `:8080/odeysysportal/` |
| core | `ndc-core-service`, `/api/v1/reissue/*` |
| Supplier | Sabre CERT REST, PCC `EZ4K`, agency IATA `90200305` |
| Agencies | `AGN9780` EGP non-credit · `AGN10030` AED credit-enabled, ROE 9 then 0.1 |
| Not available | `logs/detail.log` — never accessible in this run; read-only DB access never provided |
