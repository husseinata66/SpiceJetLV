# Supplier-to-screen chain — scenario 4 · PUAUTI · MULTI CITY CAI-JED-RUH · date change 08/12 Jan 2027 · paired capture 2026-09-28T16:12Z

**Aligned on itinerary `SV386-SV1018`** — supplier offer 0, core offer NOT PRESENT, Portal offer 0. Offers are matched by flight signature, never by index: each layer calls Sabre separately and Sabre returns a different selection of combinations per call.

| Screen value | Expected origin | Sabre | core service | Portal | Result |
|---|---|---|---|---|---|
| Departure time | SUPPLIER | 01:00 | — | 01:00 | **MISSING** — supplier=01:00 core=undefined portal=01:00 |
| Arrival time | SUPPLIER | 04:10 | — | 04:10 | **MISSING** — supplier=04:10 core=undefined portal=04:10 |
| Departure date | SUPPLIER | 2027-01-08 | — | 2027-01-08 | **MISSING** — supplier=2027-01-08 core=undefined portal=2027-01-08 |
| Origin airport code | SUPPLIER | CAI | — | CAI | **MISSING** — supplier=CAI core=undefined portal=CAI |
| Destination airport code | SUPPLIER | JED | — | JED | **MISSING** — supplier=JED core=undefined portal=JED |
| Marketing flight number | SUPPLIER | 386 | — | 386 | **MISSING** — supplier=386 core=undefined portal=386 |
| Marketing airline code | SUPPLIER | SV | — | SV | **MISSING** — supplier=SV core=undefined portal=SV |
| Operating airline code | SUPPLIER | SV | — | SV | **MISSING** — supplier=SV core=undefined portal=SV |
| Aircraft type | SUPPLIER | 333 | — | 333 | **MISSING** — supplier=333 core=undefined portal=333 |
| Flight duration (minutes) | SUPPLIER | 130 | — | 130 | **MISSING** — supplier=130 core=undefined portal=130 |
| Number of stops (journey 1) | DERIVED | 0 | — | 0 | **PASS** — matches the stated calculation (0) |
| Fare brand name | SUPPLIER | BASIC ECO | — | BASIC ECO | **MISSING** — supplier=BASIC ECO core=undefined portal=BASIC ECO |
| Booking class (RBD) | SUPPLIER | V | — | V | **MISSING** — supplier=V core=undefined portal=V |
| Cabin | SUPPLIER | Economy | — | Economy | **MISSING** — supplier=Economy core=undefined portal=Economy |
| Additional base fare | SUPPLIER | 31098 | — | 31098 | **MISSING** — supplier=31098 core=undefined portal=31098 |
| Additional taxes | SUPPLIER | 4251 | — | 4251 | **MISSING** — supplier=4251 core=undefined portal=4251 |
| Supplier fee / penalty | SUPPLIER | 12974 | — | 12974 | **MISSING** — supplier=12974 core=undefined portal=12974 |
| Amount payable at core level | SUPPLIER | 48323 | — | — | **MISSING** — supplier=48323 core=undefined portal=undefined |
| DUE NOW (what the customer pays) | DERIVED | — | — | 48623 | **FAIL** — expected undefined, found 48623 |
| Exchange charge type | SUPPLIER | Add collect | — | — | **MISSING** — supplier=Add collect core=undefined portal=undefined |
| Airline name | PORTAL | — | — | Saudi Arabian | **PORTAL** — no supplier source — provided by the app, as declared |
| Origin airport name | PORTAL | — | — | Cairo International Airport | **PORTAL** — no supplier source — provided by the app, as declared |
| Origin city name | PORTAL | — | — | Cairo | **PORTAL** — no supplier source — provided by the app, as declared |
| Destination airport name | PORTAL | — | — | King Abdulaziz International | **PORTAL** — no supplier source — provided by the app, as declared |
| Destination city name | PORTAL | — | — | Jeddah | **PORTAL** — no supplier source — provided by the app, as declared |
| Change fee | PORTAL | — | — | 300 | **PORTAL** — no supplier source — provided by the app, as declared |
| Supplier badge text | PORTAL | — | — | Sabre Staging | **PORTAL** — no supplier source — provided by the app, as declared |
| Number of offers (informational) | DERIVED | 47 | — | 47 | **PASS** — matches the stated calculation (47) |

**2 carried correctly from the supplier · 7 provided by the app · 1 wrong · 18 missing · 0 absent**

- _Number of stops (journey 1)_: Sabre sends no stop count; it is the flight count of that journey minus one. Counted PER JOURNEY — flattening a round trip across journeys is wrong.
- _Cabin_: Portal lifts cabin from fare level up to journey level
- _Supplier fee / penalty_: core penalty = totalFee + totalTaxOnFee; an absent part reads as 0
- _Amount payable at core level_: The Portal total differs deliberately — it adds the change fee. Next rule checks that.
- _DUE NOW (what the customer pays)_: Portal total must equal the core total plus the app change fee
- _Exchange charge type_: Sabre states Add collect / Even / Refund outright; watch whether core republishes it
- _Change fee_: App-origin by design — confirmed by the user, 2026-09-28
- _Supplier badge text_: Read from a field named for refundability
- _Number of offers (informational)_: Counts come from independent calls; a difference is not a defect
