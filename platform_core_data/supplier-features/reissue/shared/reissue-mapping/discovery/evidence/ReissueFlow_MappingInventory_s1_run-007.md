# Reissue flow — displayed-value mapping inventory (from reshop onward)

**Scope (user, 2026-09-28):** the reissue flow **starting at reshop**. Booking-details / Itinerary
is **out of scope** for this inventory. Three screens:

1. **Step 1 — Choose Replacement Flights** (reshop results grid)
2. **Step 2 — Review and Pay**
3. **Step 3 — Confirmation**

**Source:** run-007 scenario 1, `OWXGIW`, CAI→RUH 20 Dec 2026, captured 2026-09-27. Derived
entirely from saved payloads — no new supplier calls.

Legend — **Status**: `Mapped` value traced core→Portal→screen · `App-origin` Portal/rule-engine,
no core source (legitimate, but must be *declared* — the change-fee rule A5 is the precedent) · `Unmapped` displayed with
no rule in the Project Context · `Gap` a defect or open question raised here.

---

## 1. Step 1 — Choose Replacement Flights (reshop results)

`POST /v2/reissue/{ref}/search` ← `POST /api/v1/reissue/reshop`

### 1.1 Per-offer card

| # | Screen value | Portal field | Core field | Status |
|---|---|---|---|---|
| R1 | "DUE NOW" amount | `reissuePricing.totalPayable` | `modifyPrice.totalPayable` **+ changeFee** | **Mapped** — the amount-payable rule (A4); core and Portal differ by the change fee (DS-M6) |
| R2 | "Lowest fare" badge | — (derived from offer ordering) | — | **App-origin, undeclared** |
| R3 | Airline name "Saudi Arabian" | `segments[].operatingCarrier.name` | **— core sends only `operatingCarrierCode`** | **App-origin, undeclared** |
| R4 | Flight number "SV-310" | `operatingCarrier.code` + `.flightNumber` | `operatingCarrierCode` + `operatingFlightNumber` | **Mapped**, unrecorded |
| R5 | RBD "(RBD-V)" | `passengerFareBreakdowns[].segmentDetails[].rbd` | fare-level RBD | **Mapped**, unrecorded |
| R6 | Departure time "10:40" | `segments[].departureDateTime` | `flightSegments[].departureDateTime` | **Mapped** — the departure-time rule (A8) |
| R7 | Arrival time "14:15" | `segments[].arrivalDateTime` | `flightSegments[].arrivalDateTime` | **Mapped** — the arrival-time rule (A8b), added 2026-09-28 |
| R8 | Origin/destination code "CAI"/"RUH" | `segments[].origin.airportCode` | `flightSegments[].origin` (bare string) | **Mapped** (shape differs) |
| R9 | Airport / city / country names | `origin.airportName`, `.cityName`, `.countryName` | **— absent from core entirely** | **App-origin, undeclared** |
| R10 | Duration "2h 35m" | `segments[].flightTimeInMinutes` (100) | `flightSegments[].flightTime` (130) | **Mapped** — rename + format |
| R11 | Stops "Nonstop" / "1 stop" | `journeys[].numberOfStops` | `journeys[].numberOfStops` | **Mapped**, unrecorded |
| R12 | Cabin "Economy" | `journeys[].cabinClass` | **— core `journeys` has no `cabinClass`** | **Unmapped — origin unknown** |
| R13 | Brand "BASIC ECO" | `priceClasses[].priceClassName` | `priceClasses[].priceClassName` | **Mapped**, unrecorded |
| R14 | Supplier badge "Sabre Staging" | **`properties.refundableInfo`** | — | **Gap — supplier name read from a refundability field, §4.1** |
| R15 | Aircraft "330" | `segments[].equipment` | `flightSegments[].equipment` | **Mapped**, unrecorded |
| R16 | Option count "30 options" | `Object.keys(offers).length` | `offers[].length` | **Mapped** — counts equal |

### 1.2 Controls (no core source)

| # | Screen | Status |
|---|---|---|
| R17 | Sort by Price / Duration / Departure | **App-origin** — client-side ordering |
| R18 | Filters: Stops, Departs | **App-origin** |
| R19 | "Show more (12 of 19)" paging | **App-origin** |

## 2. Step 2 — Review and Pay

`GET /v2/reissue/{ref}/review` → `{currentOffer, newOffer, passengers}`

Both `currentOffer` and `newOffer` carry the **same shape as `/search`** (`segments`, `journeys`,
`priceClasses`, `baggageDetails`, `offers`, `tripType`), so every flight-detail row from the results
grid above — airline, flight number, times, route, duration, stops, cabin, brand, aircraft — applies
again here and is not repeated.

| # | Screen value | Portal field | Core field | Status |
|---|---|---|---|---|
| V1 | Additional base fare · per type | `reissuePricing.passengerFareBreakdowns[].additionalTotalBaseAmount` | `modifyPrice.baseDifference` (offer level) | **Mapped** — the additional-base-fare rule (A1) |
| V2 | Additional taxes · per type | `…[].additionalTotalTaxesAndFeesAmount` | `modifyPrice.taxDifference` | **Mapped** — the additional-tax rule (A2) |
| V3 | Supplier fee | `reissuePricing.supplierPenalty` | `modifyPrice.penalty` | **Mapped** — the supplier-fee rule (A3) |
| V4 | Change fee | `reissuePricing.changeFee` | **none — app-origin** | **Mapped** — the change-fee rule (A5), declared app-origin |
| V5 | Total additional / AMOUNT PAYABLE | `reissuePricing.totalPayable` | — | **Mapped** — the amount-payable rule (A4) |
| V6 | Currently ticketed · per-type base/taxes | `currentOffer…passengerFareBreakdowns[]` | `priceDetails` | **Mapped** — the per-passenger-type breakdown rule (A7) |
| V7 | **Currently ticketed · Total** | `currentOffer.priceDetails.totalOfferAmount` = 31,346.80 | `priceDetails.totalAmount` | **Gap — the currently-ticketed total is rounded and contradicts its own line items (FINDING-R02)**; screen shows 31,347.00 |
| V8 | Trip type "One way" | `tripType` = `"OneWay"` | — | **Mapped**, unrecorded |
| V9 | "Nonstop throughout" | derived from `journeys[].numberOfStops` | — | **App-origin, undeclared** |
| V10 | Passenger names / types | `passengers[].name`, `.passengerType` | — (booking-side) | **Unmapped** |
| V11 | Ticket numbers | `passengers[].ticketNumber` | — | **Unmapped** |
| V12 | "FARE HELD" countdown | — (hold token TTL, `flight-token` JWT `exp`) | — | **App-origin, undeclared** |
| V13 | Payment method · Wallet balance | `/v2/financial/financial-details` → `walletBalance` | — (app-origin; no supplier equivalent) | **Mapped, and wrong on Admin.** Portal binds `walletBalance`, which equals `topUpBalance`. Admin shows `topUpBalance` + the agency's `paymentSetting.creditLimit` under the same label — **intended; the `creditAgency` flag scopes the agency channel only** (context §2.5). Portal renders it with 3 decimals — **FINDING-R17**. Closes OQ-M7 |
| V14 | "Operated by: Saudi Arabian" | `operatingCarrier.name` | — | **App-origin** — same as the airline-name row above |
| V15 | "1 sector" | derived from `segments[]` length | — | **App-origin, undeclared** |

## 3. Step 3 — Confirmation

`POST /v2/reissue/{ref}/book` → `GET /v2/bookingConfirm/{orderId}`

| # | Screen value | Portal field | Core field | Status |
|---|---|---|---|---|
| C1 | New order id | `book.orderId` | — | **Unmapped** |
| C2 | New booking reference | `book.bookingReference` | — | **Unmapped** |
| C3 | GDS PNR `OWXGIW` | `bookingConfirm` flight info | supplier `bookingId` | **Mapped** — verified against Sabre |
| C4 | Airline PNR `7PUS9X` | `bookingConfirm` flight info | supplier | **Mapped** — verified against Sabre |
| C5 | New ticket numbers ×6 | `passengerInfo[]` | supplier `flightTickets[]` | **Mapped** — verified against Sabre |
| C6 | Base fare −3,732 | `bookingConfirm` | `modifyPrice.baseDifference` | **Mapped** |
| C7 | **Taxes (+) 13,652.80** | **`totalTax`** | `taxDifference` **+ `penalty`** | **Gap — the supplier penalty is presented as tax (FINDING-R03)** |
| C8 | **Service Charges (+) 300** | **`serviceCharges`** | — (`changeFee` dropped) | **Gap — the change fee is written into the service-charge field (FINDING-R05)** |
| C9 | Total Amount 10,220.80 | `bookingConfirm` | `totalPayable` + changeFee | **Mapped** |
| C10 | Booking date / Status | `bookingConfirm` | — | **Unmapped** |
| C11 | Segment detail, terminals | `bookingConfirm` journeyInfoList | `flightSegments[].*Terminal` (both **null**) | **Gap — terminals are null at both layers yet a terminal row renders, §4.2** |

## 4. New gaps this inventory surfaces

### 4.1 The supplier badge is read from `refundableInfo` — **NEW**

The results grid and Review & Pay both show **"Sabre Staging"** as the supplier label. It is read
from `offers[].properties.refundableInfo` — a field named for **refundability**, carrying a
**supplier environment name**. The same object also has a correctly-named `supplierName: "Sabre"`
and an actually-null `refundable: null`.

So either the field is misnamed, or the supplier name is being smuggled through a refundability
field. Either way a consumer reading `refundableInfo` for its stated purpose gets "Sabre Staging".
**Proposed: raise as a finding.** Not previously recorded anywhere.

### 4.2 Terminals are null at core and at Portal, yet the UI has a terminal row — **NEW**

`departureTerminal` and `arrivalTerminal` are **`null` on every segment** at both core and Portal in
this reshop response. The confirmation screen still renders a terminal row
("Please check terminal information with Airline"). That placeholder is app-origin and undeclared.
Worth confirming it is a deliberate fallback and not a silently-swallowed null.

### 4.3 Six displayed values have no core source and are undeclared

The "Lowest fare" badge, the airline **name**, the airport/city/country **names**, "Nonstop throughout", the fare-held countdown, and the "1 sector" label.
The change fee set the precedent (its mapping row, A5) — *"Declared app-origin… must never be assumed to come from
core or the supplier."* These carry the same risk and no such declaration. The place names are the most
consequential: core sends bare IATA codes, and every human-readable place name on the screen comes
from a Portal-side lookup that no mapping rule covers.

### 4.4 The journey-level cabin shown on every offer card has no core counterpart

Portal `journeys[].cabinClass: "Economy"` is displayed on every offer card. Core's `journeys[]`
carries only `origin`, `destination`, `numberOfStops`, `segmentRefIds` — **no cabin**. Cabin exists
at core in the *fare* (`passengerFareBreakdown[].segmentDetails[].cabinClass`), so the Portal is
likely lifting it from fare to journey. Unverified, and a journey-level cabin is not obviously
well-defined when segments differ.

### 4.5 Renames across hop A, none recorded

| core | Portal |
|---|---|
| `journeys[].segmentRefIds` | `segmentReferenceIds` |
| `offers[].passengerFareBreakdown` | `passengerFareBreakdowns` |
| `flightSegments[].flightTime` | `segments[].flightTimeInMinutes` |
| `priceClasses[].fareDescription` | `fareType` + `serviceClass` (both null) |

Individually harmless; collectively they mean no field name can be assumed stable across the hop —
the same lesson as the `totalPayable` discrepancy (DS-M6), which is the one case where a name
*was* stable across the hop and the meaning was not.

### 4.6 Core fields never surfaced — candidate deliberate drops

(The open question that is supposed to enumerate these is OQ-M9, "dropped / unexposed fields".)

`isRepriceRequired` (false on all 30), `haveBundles`, `canBeHeld`, `warnings` (empty here — **it is
the channel for supplier warnings and the UI has nowhere to show them**), `responseId`.
`warnings` is the one worth a decision: empty in every capture so far, so its display path is
untested.

## 5. Coverage summary

| Screen | Displayed values inventoried | Have a Project Context row | Gap |
|---|---|---|---|
| Step 1 — results | 19 | 3 — amount payable, departure time, arrival time | **16** |
| Step 2 — Review & Pay | 15 | 7 — the five price lines, the per-type breakdown, the wallet balance | **8** |
| Step 3 — Confirmation | 11 | 0 | **11** |
| **Total** | **45** | **10** | **35** |

Roughly **22%** of displayed values in the reissue flow from reshop onward have a stated mapping
rule. The rest are traceable — this document traces them — but were never written down as rules,
so nothing tests them and nothing notices when they change.
