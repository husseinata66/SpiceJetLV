# Supplier-to-screen chain — scenario 9 · RPTIYO · ADMIN UI · MULTI CITY CAI-RUH 05 Mar / RUH-DMM 08 Mar 2027 · AED · paired capture 2026-09-29T19:14Z

**Aligned on itinerary `SV310-SV1136`** — supplier offer 0, core offer 0, Portal offer 4. Offers are matched by flight signature, never by index: each layer calls Sabre separately and Sabre returns a different selection of combinations per call.

**Currency:** the UI presents a converted currency at rate **9** (multiplier on the supplier amount). Money values are divided back before comparison; the change fee is stated in the UI currency and added after conversion.

| Screen value | Expected origin | Sabre | core service | Portal | Result |
|---|---|---|---|---|---|
| Departure time | SUPPLIER | 10:35 | 10:35 | 10:35 | **PASS** — carried unchanged from the supplier |
| Arrival time | SUPPLIER | 14:10 | 14:10 | 14:10 | **PASS** — carried unchanged from the supplier |
| Departure date | SUPPLIER | 2027-03-05 | 2027-03-05 | 2027-03-05 | **PASS** — carried unchanged from the supplier |
| Origin airport code | SUPPLIER | CAI | CAI | CAI | **PASS** — carried unchanged from the supplier |
| Destination airport code | SUPPLIER | RUH | RUH | RUH | **PASS** — carried unchanged from the supplier |
| Marketing flight number | SUPPLIER | 310 | 310 | 310 | **PASS** — carried unchanged from the supplier |
| Marketing airline code | SUPPLIER | SV | SV | SV | **PASS** — carried unchanged from the supplier |
| Operating airline code | SUPPLIER | SV | SV | SV | **PASS** — carried unchanged from the supplier |
| Aircraft type | SUPPLIER | 330 | 330 | 330 | **PASS** — carried unchanged from the supplier |
| Flight duration (minutes) | SUPPLIER | 155 | 155 | 155 | **PASS** — carried unchanged from the supplier |
| Number of stops (journey 1) | DERIVED | 0 | 0 | 0 | **PASS** — matches the stated calculation (0) |
| Fare brand name | SUPPLIER | BASIC ECO | BASIC ECO | BASIC ECO | **PASS** — carried unchanged from the supplier |
| Booking class (RBD) | SUPPLIER | V | V | V | **PASS** — carried unchanged from the supplier |
| Cabin | SUPPLIER | Economy | Economy | Economy | **PASS** — carried unchanged from the supplier |
| Additional base fare | SUPPLIER | 31134 | 31134 | 31134 | **PASS** — carried unchanged from the supplier |
| Additional taxes | SUPPLIER | 1474.8 | 1474.8 | 1474.8000000000002 | **PASS** — carried unchanged from the supplier |
| Supplier fee / penalty | SUPPLIER | 13018 | 13018 | 13018 | **PASS** — carried unchanged from the supplier |
| Amount payable at core level | SUPPLIER | 45626.8 | 45626.8 | — | **PASS** — carried unchanged from the supplier |
| DUE NOW (what the customer pays) | DERIVED | — | 45626.8 | 410755.2 | **PASS** — matches the stated calculation (410755.2) |
| Exchange charge type | SUPPLIER | Add collect | — | — | **MISSING** — supplier=Add collect core=undefined portal=undefined |
| Airline name | PORTAL | — | — | Saudi Arabian | **PORTAL** — no supplier source — provided by the app, as declared |
| Origin airport name | PORTAL | — | — | Cairo International Airport | **PORTAL** — no supplier source — provided by the app, as declared |
| Origin city name | PORTAL | — | — | Cairo | **PORTAL** — no supplier source — provided by the app, as declared |
| Destination airport name | PORTAL | — | — | King Khaled International | **PORTAL** — no supplier source — provided by the app, as declared |
| Destination city name | PORTAL | — | — | Riyadh | **PORTAL** — no supplier source — provided by the app, as declared |
| Change fee | PORTAL | — | — | 114 | **PORTAL** — no supplier source — provided by the app, as declared |
| Supplier badge text | PORTAL | — | — | Sabre Staging | **PORTAL** — no supplier source — provided by the app, as declared |
| Number of offers (informational) | DERIVED | 44 | 44 | 44 | **PASS** — matches the stated calculation (44) |

**20 carried correctly from the supplier · 7 provided by the app · 0 wrong · 1 missing · 0 absent**

- _Number of stops (journey 1)_: Sabre sends no stop count; it is the flight count of that journey minus one. Counted PER JOURNEY — flattening a round trip across journeys is wrong.
- _Cabin_: Portal lifts cabin from fare level up to journey level
- _Supplier fee / penalty_: core penalty = totalFee + totalTaxOnFee; an absent part reads as 0
- _Amount payable at core level_: The Portal total differs deliberately — it adds the change fee. Next rule checks that.
- _DUE NOW (what the customer pays)_: UI total must equal (core total x rate) plus the app change fee, stated in UI currency
- _Exchange charge type_: Sabre states Add collect / Even / Refund outright; watch whether core republishes it
- _Change fee_: App-origin by design — confirmed by the user, 2026-09-28
- _Supplier badge text_: Read from a field named for refundability
- _Number of offers (informational)_: Counts come from independent calls; a difference is not a defect
