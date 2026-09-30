# Reissue flow — every screen value traced to the supplier

**Purpose:** verify that every value shown on the reissue screens is provided correctly *by the
supplier*, not merely consistent between the core service and the Portal.

**Scope:** the reissue flow **from reshop onward** — Choose Replacement Flights, Review and Pay,
Confirmation. Booking-details / Itinerary is out of scope.

**Chain:** `Sabre → ndc-core-service → Admin/Portal API → screen`

**Sources on disk:** Sabre `flightReshop` (`sabre-reshop-RGGMXP.json`), Sabre `getBooking` after the
exchange (`s1-sabre-getBooking-OWXGIW-after.json`), core reshop (`s1-core-reshop-CAI-RUH.json`),
Portal search / review / bookingConfirm, and the captured screen text and screenshots.

**Verdict column**
- **Supplier** — the value originates at Sabre and survives to the screen
- **Derived** — computed from supplier data (legitimate, but the rule must be stated)
- **App-origin** — invented by the app; Sabre never sends it
- **Check** — needs confirmation

---

## 1. Flight and journey values

| Screen value | Sabre field | Core field | Portal field | Verdict |
|---|---|---|---|---|
| Departure time | `flights[].departureTime` `"06:10"` | `flightSegments[].departureDateTime` | `segments[].departureDateTime` | **Supplier** |
| Arrival time | `flights[].arrivalTime` `"09:20"` | `flightSegments[].arrivalDateTime` | `segments[].arrivalDateTime` | **Supplier** |
| Departure / arrival date | `flights[].departureDate` / `.arrivalDate` | same field, combined | same | **Supplier** |
| Origin / destination code | `flights[].departureAirportCode` / `.arrivalAirportCode` | `flightSegments[].origin` / `.destination` | `segments[].origin.airportCode` | **Supplier** |
| **Airport name** ("King Khaled International") | **— not sent** | **— not sent** | `segments[].origin.airportName` | **App-origin** |
| **City name** ("Riyadh") | **— not sent** | **— not sent** | `origin.cityName` | **App-origin** |
| **Country name** ("Saudi Arabia") | **— not sent** | **— not sent** | `origin.countryName` | **App-origin** |
| Flight number ("SV-310") | `flights[].marketingFlightNumber` + `.marketingAirlineCode` | `marketingCarrierCode` + `marketingFlightNumber` | `operatingCarrier.code` + `.flightNumber` | **Supplier** |
| **Airline name** ("Saudi Arabian") | **— only the code `SV` is sent** | **— only the code** | `operatingCarrier.name` | **App-origin** |
| Aircraft ("330") | `flights[].aircraftTypeCode` | `flightSegments[].equipment` | `segments[].equipment` | **Supplier** |
| Duration ("2h 35m") | `flights[].durationInMinutes` `130` | `flightTime` `130` | `flightTimeInMinutes` | **Supplier** — formatted for display |
| Stops ("Nonstop" / "1 stop") | **— no count sent**; implied by `journeys[].flightRefs` length | `journeys[].numberOfStops` | `journeys[].numberOfStops` | **Derived** |
| Cabin ("Economy") | `fareComponents[].segmentDetails[].cabinName` | fare-level cabin | `journeys[].cabinClass` | **Supplier** — lifted from fare level to journey level |
| Booking class / RBD ("V") | `segmentDetails[].bookingClassCode` | fare-level RBD | `passengerFareBreakdowns[].segmentDetails[].rbd` | **Supplier** |
| Fare brand ("BASIC ECO") | `fareComponents[].brand.name` | `priceClasses[].priceClassName` | `priceClasses[].priceClassName` | **Supplier** |
| Brand reference ("NBASICE") | `brand.code` | price-class key | `priceClassReferenceId` | **Supplier** |
| Terminals | `flights[]` — **not present** | `departureTerminal` / `arrivalTerminal` = **null** | null | **App-origin placeholder** ("Please check with Airline") |

## 2. Price values

| Screen value | Sabre field | Core field | Portal field | Verdict |
|---|---|---|---|---|
| Additional base fare | `totalPriceDifference.baseFare` | `modifyPrice.baseDifference` | `additionalTotalBaseAmount` | **Supplier** |
| Additional taxes | `totalPriceDifference.totalTax` | `modifyPrice.taxDifference` | `additionalTotalTaxesAndFeesAmount` | **Supplier** |
| Supplier fee / penalty | `totalPriceDifference.totalFee` (+ `totalTaxOnFee`) | `modifyPrice.penalty` | `supplierPenalty` | **Supplier** |
| **Change fee** | **— never sent** | **— never sent** | `reissuePricing.changeFee` | **App-origin** — correct by design (confirmed by the user, and by Sabre collecting only 9,920.80 while the customer paid 10,220.80) |
| "DUE NOW" / Amount payable | `totalPriceDifference.grandTotal` | `modifyPrice.totalPayable` | `totalPayable` **+ change fee** | **Derived** — Portal adds the app fee |
| Per-passenger-type breakdown | `fares[].priceDifference` per traveller group | `passengerFareBreakdown[]` | `passengerFareBreakdowns[]` | **Supplier** |
| Tax codes and amounts | `priceDifference.taxes[]` | `taxesAndFees[]` | `taxesAndFees[]` | **Supplier** |
| Currently ticketed · per-type | ticket `payment.subtotal` / `.taxes` | `priceDetails` | `currentOffer…` | **Supplier** |
| **Currently ticketed · Total** | `payments.flightTotals.total` **31,346.80** | 31,346.80 | 31,346.80 | **Supplier — screen shows 31,347.00** ❌ the rounded-total defect (FINDING-R02) |

## 3. Confirmation values

| Screen value | Sabre field | Portal field | Verdict |
|---|---|---|---|
| GDS PNR (`OWXGIW`) | `bookingId` | flight info | **Supplier** |
| Airline PNR (`7PUS9X`) | booking response | flight info | **Supplier** |
| Ticket numbers ×6 | `flightTickets[].number` | `passengerInfo[]` | **Supplier** |
| Passenger names | `travelers[]` / `fares[].travelers[].givenName` | `passengers[].name` | **Supplier** |
| Passenger type | `travelers[].passengerTypeCode` (`ADT`/`CNN`/`INF`) | `passengerType` | **Supplier** — `CNN`→`CHD` re-coded |
| **Taxes (+) 13,652.80** | tax 678.80 and fee 12,974.00 are **separate** at Sabre | `totalTax` (merged) | ❌ **the penalty presented as tax** (FINDING-R03) |
| **Service Charges (+) 300** | **— not a supplier value at all** | `serviceCharges` | ❌ **the change fee moved into the service-charge field** (FINDING-R05) |
| Total Amount | derived | — | **Derived** |
| **Meal column** ("—") | `segmentDetails[].mealCode` = **`"M"`** | not surfaced | **Check — §4.3** |

## 4. What this changes, and what it finds

### 4.1 Corrections to the earlier core-to-Portal inventory

Tracing to the supplier overturns three entries in `ReissueFlow_MappingInventory_s1_run-007.md`:

| Value | Earlier verdict | Correct verdict |
|---|---|---|
| Cabin "Economy" | "Unmapped — origin unknown" | **Supplier** — `segmentDetails[].cabinName`, lifted from fare level to journey level by the Portal |
| Fare brand "BASIC ECO" | "Mapped, unrecorded" | **Supplier** — `fareComponents[].brand.name`; the brand **code** `NBASICE` also survives |
| Stops "Nonstop" | "Mapped, unrecorded" | **Derived** — Sabre sends no stop count; it is computed from the number of flight references |

The lesson: a core-to-Portal comparison cannot tell **Supplier** from **App-origin**. Both look
identical from hop A — the value is simply "there". Only the supplier response separates them.

### 4.2 Confirmed app-origin: everything human-readable about places and airlines

Sabre sends **codes only** — `CAI`, `RUH`, `SV`. Every readable name on the screen — "Cairo",
"Riyadh", "King Khaled International", "Saudi Arabia", "Saudi Arabian" — is added by the Portal from
its own reference data. Neither Sabre nor the core service sends any of it.

This is not wrong, but it is **unverified against anything**: if the Portal's airport table is stale
or wrong, no supplier comparison catches it, because the supplier has no opinion. It needs the same
explicit declaration the change fee has.

### 4.3 Candidate finding — the supplier sends a meal code, the screen shows "—"

Sabre's fare component carries `segmentDetails[].mealCode: "M"`. The Confirmation passenger table
has a **Meal** column rendering **"—"** for all six passengers. Either the code is not carried
through the exchange, or it is dropped in mapping. **Not yet confirmed** — the captured `mealCode`
comes from the earlier reshop evidence, not from a reshop contemporaneous with this exchange, so the
new tickets may genuinely carry no meal. Worth one targeted check.

### 4.4 Candidate finding — the fare-hold timer may ignore the supplier's own expiry

Sabre's offer carries **`validUntil`**. The Review and Pay screen shows a "FARE HELD" countdown,
which I earlier attributed to the Portal's own hold token (the `flight-token` JWT carries `exp`).
If the Portal counts down its own token rather than the supplier's `validUntil`, the screen can
promise a guaranteed price after Sabre's offer has expired, or expire one that is still valid.
**Needs a direct comparison** of `validUntil` against the token's `exp` in the same transaction.

### 4.5 Supplier fields never surfaced — candidates for deliberate-drop review

`fareBasisCode` (`VLOTEGB4`), `mealCode`, `isAvailabilityBreak`, `isBookingRequired`,
`hasTravelersInDifferentCabins`, `hasMixedBrands`, `splitBooking`, `source`, `validUntil`,
`programId` on the brand.

`hasMixedBrands` and `hasTravelersInDifferentCabins` are the notable ones: both describe an offer
the screen renders as a **single** cabin and a **single** brand. If either is ever true, the screen
as built cannot represent it faithfully.

## 5. Coverage after supplier tracing

| Category | Count |
|---|---|
| **Supplier** — originates at Sabre, survives to the screen | 22 |
| **Derived** — computed from supplier data | 4 |
| **App-origin** — Sabre never sends it | 9 |
| **Defect** — supplier value misrepresented on screen | 3 |
| **Check** — unresolved | 2 |

The three defects are all already recorded: the rounded currently-ticketed total (FINDING-R02),
the supplier penalty presented as tax (FINDING-R03), and the change fee written into the
service-charge field (FINDING-R05). **All three are on the money values, and all three appear
after the price has been correctly carried all the way from Sabre to the Portal API** — they are
introduced at the last step, not in the supply chain.
