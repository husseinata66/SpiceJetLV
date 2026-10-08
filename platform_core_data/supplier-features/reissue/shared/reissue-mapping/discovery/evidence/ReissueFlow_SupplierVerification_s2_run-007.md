# Scenario 2 — does every screen value come correctly from the supplier?

**The question this answers:** for each value the reissue screens show, does it come from Sabre, and
does it arrive unchanged? Where it does not come from Sabre, that is stated plainly.

| | |
|---|---|
| Booking | `NDCEG-BR-F2609278LYdMZ` → after exchange `NDCEG-BR-F260928qDzmIB` |
| GDS PNR | **`QIKISQ`** (unchanged by the exchange) |
| Airline PNR | `DCSV` → **`7PV9OE`** |
| Trip | **Round trip**, 2 journeys, 4 segments, 6 passengers (2 ADT / 2 CHD / 2 INF) |
| Original | CAI→RUH via JED 04 Dec · RUH→CAI via JED 06 Dec · 43,786.80 EGP |
| Exchanged to | SV 310 CAI 10:35→RUH 14:10 (nonstop) · SV 1039 + SV 389 RUH 16:00→CAI 21:10 (1 stop) |
| Paid | **11,684.80 EGP** — wallet 8,596,308.000 → 8,584,623.200, exact |
| Exchange clicked by | the human, 2026-09-28 12:23. The platform never clicks it. |

**Why this run is stronger than scenario 1:** all three layers — Sabre, core service, Portal — were
captured **in the same 77-second window** (`s2-capture-window.json`), for the same search. Scenario 1
compared against a Sabre response from a *different* booking, so it could only verify the shape of
the mapping, not the values.

---

## 1. Verdict

Run by `tools/compare_chain.js`, which is reusable on any future capture.

| Category | Count |
|---|---|
| **Comes from Sabre and arrives unchanged** | **20** |
| Provided by the Portal — Sabre sends nothing | 7 |
| **Sabre sends it, the app drops it** | **1** |
| Wrong | **0** |

**Nothing the supplier sends is corrupted in transit.** Every price, time, code and identifier that
Sabre provides reaches the Portal API intact, including across a two-journey, four-segment round trip.

### 1.1 Values that come from the supplier and are mapped correctly

Departure time · arrival time · departure date · origin airport code · destination airport code ·
marketing flight number · marketing airline code · operating airline code · aircraft type ·
flight duration · fare brand name · booking class (RBD) · cabin · additional base fare ·
additional taxes · supplier fee (penalty) · amount payable at core level · number of offers.

Plus two **derived** values that match their stated calculation: number of stops (the journey's
flight count minus one — Sabre sends no stop count) and the customer's DUE NOW total (core total
plus the app change fee).

### 1.2 Values that come from the Portal itself, not the supplier

These are **not defects** — but none of them can be checked against Sabre, because Sabre has no
opinion on them. It sends codes only.

| Screen value | Example |
|---|---|
| Airline name | "Saudi Arabian" (Sabre sends `SV`) |
| Origin airport name | "Cairo International Airport" (Sabre sends `CAI`) |
| Origin city name | "Cairo" |
| Destination airport name | "King Khaled International" (Sabre sends `RUH`) |
| Destination city name | "Riyadh" |
| Change fee | 600.00 — see §3 |
| Supplier badge text | "Sabre Staging" — read from a field named `refundableInfo` |

If the Portal's reference data is stale or wrong, no supplier comparison will ever catch it. The
comparator's job for these is to assert the **list does not grow**.

### 1.3 The one value Sabre sends that the app drops

**`totalPriceDifference.type` = `"Add collect"`.** Sabre states outright whether an offer is an
add-collect, an even exchange, or a refund. The core service does not republish it and the Portal
never sees it, so the app infers this from the sign of the arithmetic where the supplier says it
plainly. Confirmed on both scenario 1 and scenario 2.

## 2. Defects reproduced on a second, independent booking

All three were first seen in scenario 1 and are not one-offs.

| Defect | Scenario 1 | Scenario 2 |
|---|---|---|
| Currently-ticketed total rounded up | 31,347.00 vs 31,346.80 | **43,787.00 vs 43,786.80** |
| Supplier penalty shown as "Taxes" on the Confirmation | 13,652.80 | **13,364.80** (= 390.80 + 12,974.00) |
| Change fee moved into the `serviceCharges` field | 300 | **600** |

### 2.1 Root cause of the rounded total is now exact

The `/review` API returns **both** fields:

```
currentOffer.priceDetails.totalOfferAmount          43786.8    <- exact
currentOffer.priceDetails.totalOfferAmountRoundedUp 43787      <- what the screen renders
```

The screen is **bound to the wrong field**. It is not performing its own rounding. That makes this a
one-line fix rather than a formatting problem, and it confirms the existing note in the Project
Context that the screen shows the rounded-up field.

Supplier confirmation: the six **Exchanged** tickets sum to exactly **43,786.80**.

## 3. New finding — the change fee is per passenger *per journey*

| | Journeys | Passengers | Change fee |
|---|---|---|---|
| Scenario 1 (one way) | 1 | 6 | **300** = 6 × 50 |
| Scenario 2 (round trip) | 2 | 6 | **600** = 6 × 50 × 2 |

The Portal states it per passenger-type group: 200 for each of ADT×2, CHD×2, INF×2.

**D-7 records the fee as "per passenger: Agency 50", which is incomplete.** It is per passenger per
journey. A multi-city booking with three journeys would charge three times. Worth confirming the
intended rule before it is written into test cases.

## 4. How the supplier actually collects — corrects scenario 1

Scenario 1 concluded that Sabre's `ancillaryTotals.total` equals core's `totalPayable` exactly.
**That was true only by coincidence** — every new ticket there had a total of 0.

Scenario 2 shows the real structure:

| | |
|---|---|
| EMDs (`ancillaryTotals`), 6 documents `0651953370323`–`…328` | 10,749.20 |
| New-ticket amounts (2 infants at 167.80) | 335.60 |
| **Supplier collected** | **11,084.80** = core `totalPayable` ✓ |
| Customer paid | 11,684.80 = + the 600 change fee |

**The supplier-side total is EMDs plus new-ticket amounts**, not the EMD total alone. The change fee
still never reaches Sabre — confirming again that it is agency revenue, exactly as the user stated.

A second scenario 1 claim is corrected the same way: `payments.flightTotals.total` was cited there as
the supplier's figure for the original ticket. It is not — it sums **every** ticket in the PNR, old
and new. Here it reads 44,122.40 against an original of 43,786.80. **Sum the Exchanged tickets.**

## 5. The penalty's tax component — still unevidenced

Third exchange, third time `totalTaxOnFee` is zero:

- `ancillaryTotals.taxes` = `"0.00"`
- the EMD accounting row: `fareAmount "351.00"`, **`taxAmount "0.00"`**

The infant EMD of **351.00** matches the Portal's per-type `supplierPenalty` of 702 for 2 infants
exactly. So `penalty = totalFee` again, and whether `totalTaxOnFee` ever contributes remains
unproven. It needs a market where SV files tax on change fees; Sabre CERT on these routes does not.

> Sabre again returned only **2** `accountingItems`, both for traveller 6, so per-passenger EMD
> amounts for travellers 1–5 were not readable. The offer-level figures are unaffected.

## 6. Comparator

`tools/compare_chain.js` — declares an expected origin per value (supplier / derived / Portal) and
fails when the observed chain disagrees. Reusable on any capture:

```bash
node tools/compare_chain.js --manifest tools/s2.json --md discovery/evidence/s2-chain-offer0.md
```

Two bugs were found and fixed in it while running this scenario, both of which would have produced
false results on a round trip:

1. Collections are keyed by opaque id with arbitrary key order, so reading `segments[0]` compared
   unrelated flights. Every layer is now walked **offer → journey → segment**.
2. Stops were counted across the whole offer, flattening both journeys of a round trip. Now counted
   **per journey**.

## 7. Evidence

`s2-core-eligibility-QIKISQ.json` · `s2-sabre-reshop-QIKISQ.json` · `s2-core-reshop-QIKISQ.json` ·
`s2-portal-search-QIKISQ.json` · `s2-portal-eligibility.json` · `s2-capture-window.json` ·
`s2-portal-review.json` · `s2-review-and-pay.png` · `s2-portal-bookingConfirm.json` ·
`s2-confirmation.png` · `s2-sabre-getBooking-QIKISQ-after.json` · `s2-chain-offer0.md`

## 8. Still outstanding

- **`logs/detail.log` has never been captured**, in either scenario. The handoff rule requires it.
  It is not on this machine; it presumably lives on the application host.
- Only offer 0 of 50 was compared field by field. The comparator takes an `offerIndex`, so sweeping
  all 50 is mechanical and needs no new capture.
- The Confirmation screen's own values are verified by hand here, not yet by the comparator.
