# Manual Test Suite - Reissue Mapping - Displayed Values and Cross-Screen Consistency

| Field | Value |
|---|---|
| Scope | Supplier Features / `reissue` / shared scope `reissue-mapping` |
| Unit of coverage | **one displayed value**, and **one value's agreement across every screen** |
| Produced by run | `reissue-run-001__2026-09-26_17-10-56__UserStory__ReissueFlowFromItinerary` |
| Revision | 2 |
| Source inventory | `discovery/evidence/ReissueFlow_MappingInventory_s1_run-007.md` |
| Total Test Cases | 60 (45 field mapping, 15 cross-screen) |
| Generated | 2026-09-30 |
| Status | **Pending Review** |

## 0. Two rules this suite is written to

**1. No specimen values.** No case names a booking class, a departure time, a fare amount or an
airline. Ticket data changes between runs, and a case that asserts a remembered figure reports a
failure when nothing is wrong. **Every case asserts a relationship** - screen equals core times rate,
or screen equals supplier, or screen A equals screen B - never a literal.

**2. Consistency is tested across screens, not only per screen.** A value can be individually
plausible on four screens and still be wrong, because the screens disagree. Section 4 exists for that
and is where the harder defects live.

## 0.1 Scope note - the Itinerary screen is now included

The original inventory covered the reissue flow **from reshop onward** and explicitly excluded
booking-details / Itinerary (user, 2026-09-28). **The user extended this on 2026-09-30** to require
consistency across Search, Review, Confirmation **and Itinerary**. Section 4 reflects the wider scope.
This is a deliberate scope change, recorded rather than assumed - `ProjectContext` should be revised
to match before this suite is approved.

## 0.2 Why the field section exists

| Screen | Displayed values | Had a mapping rule | No rule |
|---|---|---|---|
| Step 1 - results | 19 | 3 | **16** |
| Step 2 - Review & Pay | 15 | 7 | **8** |
| Step 3 - Confirmation | 11 | 0 | **11** |
| **Total** | **45** | **10** | **35** |

Only **10 of 45** displayed values had a stated mapping rule. The rest are traceable - the inventory
traces them - but nothing tested them and nothing would notice when they changed.

## 0.3 Inventory status of the 45 values

| Status | Meaning | Count |
|---|---|---|
| `Mapped` | Traced core to Portal to screen | 24 |
| `App-origin` | Portal or rule-engine origin, no core source. Legitimate, **but must be declared** | 10 |
| `Unmapped` | Displayed with no rule in the Project Context | 6 |
| `Gap` | A defect or open question is raised against it | 5 |

## 0.4 What Discovery already did, across all 60 cases

| Discovery | Meaning | Count |
|---|---|---|
| `EXECUTED` | Verified in Stage 2 and passing | 29 |
| `EXECUTED-DEFECT` | Verified and **failing** - the regression case for an open finding | 15 |
| `PARTIAL` | Ran, but a named condition inside it is unobserved | 3 |
| `NOT EXECUTED` | **Never tested** | 13 |

The untested cases cluster in one place: values the Portal produces with **no core source and no
declaration** - place names, airline names, derived badges and labels, the fare-held countdown, and
the sort and filter controls. Core sends bare IATA codes; every human-readable place name on every
screen comes from a Portal-side lookup that no rule covers and nothing verifies.

## 0.5 Two inventory gaps never raised as numbered findings

Both have cases here and need triage at the Stage 3 gate:

- **The supplier badge is read from a refundability field**, while a correctly-named supplier-name
  field sits unused in the same object (`TC-RMAPF-014`).
- **Terminals are null at core and Portal, yet a terminal row renders** on the confirmation
  (`TC-RMAPF-045`).

## 0.6 Lifecycle

**Every case carries `Review: Pending` and `Automation: Pending`.** Stage 3 always writes `Pending`;
only a human may change either. Generating this suite has approved nothing.

**Gate note.** Authored against a Project Context and a Discovery report both reading `Pending
Review`. If either changes at review, affected cases must be re-traced.

## 1. Step 1 - Choose Replacement Flights (reshop results)

### TC-RMAPF-001 - R1 | Amount payable per offer card

**Objective:** Verify **Amount payable per offer card** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field `reissuePricing.totalPayable`. Core field `modifyPrice.totalPayable`. Supplier field `totalPriceDifference.grandTotal`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read `reissuePricing.totalPayable` and `modifyPrice.totalPayable` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** For every offer card: card amount = core `totalPayable` x `currencyRate` + change fee, to the cent.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `R1` (Mapped). **Discovery: EXECUTED.** Verified on every offer at two exchange rates. Core and Portal differ by the change fee by design.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-002 - R2 | Lowest-fare badge

**Objective:** Verify **Lowest-fare badge** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field derived from offer ordering. Core field -. Supplier field -. Inventory status **App-origin**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read derived from offer ordering and - for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** The badge marks exactly one offer, and that offer has the lowest payable amount in the set. **The derivation rule must be declared before this case can pass or fail.**

**Priority:** P2

**Tags:** Atomic, Mapping, App-origin

**Notes:** Inventory row `R2` (App-origin). **Discovery: NOT EXECUTED.** Never tested. The derivation is undeclared - lowest payable, lowest base, or first returned?

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-003 - R3 | Marketing / operating airline NAME

**Objective:** Verify **Marketing / operating airline NAME** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field `segments[].operatingCarrier.name`. Core field **absent - core sends only the carrier CODE**. Supplier field `marketingAirlineCode`. Inventory status **App-origin**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read `segments[].operatingCarrier.name` and **absent - core sends only the carrier CODE** for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** The rendered airline name is the correct name for the carrier code core sent, for every offer. A code with no lookup entry renders the code, never a blank and never another carrier's name.

**Priority:** P1

**Tags:** Atomic, Mapping, App-origin

**Notes:** Inventory row `R3` (App-origin). **Discovery: NOT EXECUTED.** **Related finding(s): `FINDING-R20`.** Never tested. Core sends a code; the name comes from a Portal-side lookup no rule covers.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-004 - R4 | Flight number and carrier code

**Objective:** Verify **Flight number and carrier code** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field `operatingCarrier.code` + `.flightNumber`. Core field `operatingCarrierCode` + `operatingFlightNumber`. Supplier field `marketingFlightNumber`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read `operatingCarrier.code` + `.flightNumber` and `operatingCarrierCode` + `operatingFlightNumber` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Carrier code and flight number match the supplier exactly, per segment, on every card.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `R4` (Mapped). **Discovery: EXECUTED.** Exercised implicitly - the flight number is the alignment key for every paired capture.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-005 - R5 | Booking class (RBD) per segment

**Objective:** Verify **Booking class (RBD) per segment** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field `passengerFareBreakdowns[].segmentDetails[].rbd`. Core field fare-level RBD. Supplier field fare booking code. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read `passengerFareBreakdowns[].segmentDetails[].rbd` and fare-level RBD for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Each segment shows the booking class actually priced for it. **Where an offer's segments carry different classes, each segment shows its own** - not the first one repeated.

**Priority:** P2

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `R5` (Mapped). **Discovery: EXECUTED.** Observed correct across offers whose segments carried different booking classes.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-006 - R6 | Segment departure date-time

**Objective:** Verify **Segment departure date-time** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field `segments[].departureDateTime`. Core field `flightSegments[].departureDateTime`. Supplier field `departureDate` + `departureTime`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read `segments[].departureDateTime` and `flightSegments[].departureDateTime` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Equals the supplier value exactly, with no offset of any size, in any browser time zone.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `R6` (Mapped). **Discovery: EXECUTED.** Verified supplier -> core -> results screen with no shift.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-007 - R7 | Segment arrival date-time

**Objective:** Verify **Segment arrival date-time** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field `segments[].arrivalDateTime`. Core field `flightSegments[].arrivalDateTime`. Supplier field `arrivalDate` + `arrivalTime`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read `segments[].arrivalDateTime` and `flightSegments[].arrivalDateTime` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Equals the supplier value exactly, with no offset. Where arrival falls on a later date than departure, the date rolls correctly.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `R7` (Mapped). **Discovery: EXECUTED.** Rule A8b, added 2026-09-28. Verified alongside departure.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-008 - R8 | Origin and destination airport codes

**Objective:** Verify **Origin and destination airport codes** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field `segments[].origin.airportCode`. Core field `flightSegments[].origin` (bare string). Supplier field `departureAirportCode`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read `segments[].origin.airportCode` and `flightSegments[].origin` (bare string) for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Codes match the supplier per segment. The string-to-object reshape loses nothing.

**Priority:** P2

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `R8` (Mapped). **Discovery: EXECUTED.** Shape differs - core sends a bare string, Portal an object. Values verified equal.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-009 - R9 | Airport, city and country NAMES

**Objective:** Verify **Airport, city and country NAMES** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field `origin.airportName`, `.cityName`, `.countryName`. Core field **absent from core entirely**. Supplier field -. Inventory status **App-origin**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read `origin.airportName`, `.cityName`, `.countryName` and **absent from core entirely** for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Each name is the correct name for the IATA code core sent. A code with no lookup entry renders the code itself, never a blank and never a different city.

**Priority:** P1

**Tags:** Atomic, Mapping, App-origin

**Notes:** Inventory row `R9` (App-origin). **Discovery: NOT EXECUTED.** **Related finding(s): `FINDING-R20`.** Never tested. **The most consequential undeclared app-origin value** - every human-readable place name comes from a Portal-side lookup no rule covers.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-010 - R10 | Segment / journey duration

**Objective:** Verify **Segment / journey duration** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field `segments[].flightTimeInMinutes`. Core field `flightSegments[].flightTime`. Supplier field `durationInMinutes`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read `segments[].flightTimeInMinutes` and `flightSegments[].flightTime` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Minutes equal core exactly, and the formatted string is a faithful rendering of those minutes. Journey duration includes layovers; segment duration does not.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `R10` (Mapped). **Discovery: EXECUTED.** Rename plus format. **The inventory recorded a Portal value differing from core on scenario 1** - re-check whether that was a capture artefact or a real divergence.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-011 - R11 | Stop count

**Objective:** Verify **Stop count** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field `journeys[].numberOfStops`. Core field `journeys[].numberOfStops`. Supplier field journey flight count. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read `journeys[].numberOfStops` and `journeys[].numberOfStops` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Equals segments minus one for that journey, and matches core.

**Priority:** P2

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `R11` (Mapped). **Discovery: EXECUTED.** Verified against segment counts on nonstop and connecting offers.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-012 - R12 | Cabin class on the offer card

**Objective:** Verify **Cabin class on the offer card** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field `journeys[].cabinClass`. Core field **core `journeys` carries no cabin**. Supplier field cabin at fare level. Inventory status **Unmapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read `journeys[].cabinClass` and **core `journeys` carries no cabin** for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** The cabin shown is correct for the journey. **Where segments carry different cabins a single journey-level label is not well-defined - this case must first establish what is displayed then.**

**Priority:** P1

**Tags:** Atomic, Mapping, Undeclared

**Notes:** Inventory row `R12` (Unmapped). **Discovery: NOT EXECUTED.** **Origin unknown.** Cabin exists at core only inside the fare; the Portal is likely lifting fare-level cabin to journey level. Unverified.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-013 - R13 | Fare brand / price class name

**Objective:** Verify **Fare brand / price class name** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field `priceClasses[].priceClassName`. Core field `priceClasses[].priceClassName`. Supplier field price class. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read `priceClasses[].priceClassName` and `priceClasses[].priceClassName` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** The brand name matches core exactly for the fare actually priced on that offer.

**Priority:** P3

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `R13` (Mapped). **Discovery: EXECUTED.** Verified equal.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-014 - R14 | Supplier badge

**Objective:** Verify **Supplier badge** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field **`properties.refundableInfo`**. Core field -. Supplier field -. Inventory status **Gap**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read **`properties.refundableInfo`** and - for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** The supplier label is read from the field that means supplier name. **A consumer reading the refundability field for its stated purpose gets refundability, not a supplier environment name.**

**Priority:** P1

**Tags:** Atomic, Mapping, Negative, Regression

**Notes:** Inventory row `R14` (Gap). **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R19`.** **Inventory gap 4.1 - never raised as a numbered finding.** The supplier label is read from a field named for refundability, while a correctly-named `supplierName` sits unused in the same object alongside a null `refundable`.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-015 - R15 | Aircraft / equipment type

**Objective:** Verify **Aircraft / equipment type** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field `segments[].equipment`. Core field `flightSegments[].equipment`. Supplier field `aircraftTypeCode`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read `segments[].equipment` and `flightSegments[].equipment` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Equipment code matches the supplier per segment.

**Priority:** P3

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `R15` (Mapped). **Discovery: EXECUTED.** Verified equal at all three layers.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-016 - R16 | Declared offer count

**Objective:** Verify **Declared offer count** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field `Object.keys(offers).length`. Core field `offers[].length`. Supplier field `numberOfOffers`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read `Object.keys(offers).length` and `offers[].length` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** The declared count equals the supplier's offer count **and** the number reachable by exhausting pagination.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `R16` (Mapped). **Discovery: EXECUTED.** Counts verified equal at all three layers.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-017 - R17 | Sort controls

**Objective:** Verify **Sort controls** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field client-side ordering. Core field -. Supplier field -. Inventory status **App-origin**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read client-side ordering and - for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Sorting changes order only. Every offer's values are unchanged after every sort option, and no offer is lost, duplicated or re-priced.

**Priority:** P2

**Tags:** Atomic, Mapping, App-origin

**Notes:** Inventory row `R17` (App-origin). **Discovery: NOT EXECUTED.** Never tested.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-018 - R18 | Filter controls

**Objective:** Verify **Filter controls** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field client-side filtering. Core field -. Supplier field -. Inventory status **App-origin**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read client-side filtering and - for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Filtering hides offers without altering them. Clearing every filter restores the full set exactly, unchanged.

**Priority:** P2

**Tags:** Atomic, Mapping, App-origin

**Notes:** Inventory row `R18` (App-origin). **Discovery: NOT EXECUTED.** Never tested.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-019 - R19 | Pagination control

**Objective:** Verify **Pagination control** on Step 1 - Choose Replacement Flights is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 1 - Choose Replacement Flights`. Portal field client-side paging. Core field -. Supplier field -. Inventory status **App-origin**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 1 - Choose Replacement Flights for the aligned offer.
4. Read client-side paging and - for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** The declared total equals the payload's offer count and every offer is reachable by exhausting the control.

**Priority:** P1

**Tags:** Atomic, Mapping, App-origin

**Notes:** Inventory row `R19` (App-origin). **Discovery: EXECUTED.** Verified - the header count, the first page and the full set were reconciled. **Nearly reported as a defect before the control was found.**

**Review:** Pending

**Automation:** Pending

## 2. Step 2 - Review and Pay

### TC-RMAPF-020 - V1 | Additional base fare, per passenger type

**Objective:** Verify **Additional base fare, per passenger type** on Step 2 - Review and Pay is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 2 - Review and Pay`. Portal field `reissuePricing.passengerFareBreakdowns[].additionalTotalBaseAmount`. Core field `modifyPrice.baseDifference`. Supplier field `totalPriceDifference.baseFare`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 2 - Review and Pay for the aligned offer.
4. Read `reissuePricing.passengerFareBreakdowns[].additionalTotalBaseAmount` and `modifyPrice.baseDifference` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Each type's figure equals core x rate, and the types sum to core's offer-level base difference.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `V1` (Mapped). **Discovery: EXECUTED.** Verified - per-type figures sum to the offer level.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-021 - V2 | Additional taxes, per passenger type

**Objective:** Verify **Additional taxes, per passenger type** on Step 2 - Review and Pay is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 2 - Review and Pay`. Portal field `...[].additionalTotalTaxesAndFeesAmount`. Core field `modifyPrice.taxDifference`. Supplier field `totalPriceDifference.totalTax`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 2 - Review and Pay for the aligned offer.
4. Read `...[].additionalTotalTaxesAndFeesAmount` and `modifyPrice.taxDifference` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Each type's tax-code list sums to that type's total; the types sum to core's tax difference.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `V2` (Mapped). **Discovery: EXECUTED.** Verified including the per-tax-code breakdown, where codes present for one type were correctly absent for another.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-022 - V3 | Supplier fee / change penalty

**Objective:** Verify **Supplier fee / change penalty** on Step 2 - Review and Pay is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 2 - Review and Pay`. Portal field `reissuePricing.supplierPenalty`. Core field `modifyPrice.penalty`. Supplier field `totalPriceDifference.totalFee`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 2 - Review and Pay for the aligned offer.
4. Read `reissuePricing.supplierPenalty` and `modifyPrice.penalty` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Appears as its own line at rate, and is **never folded into tax on this screen**.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `V3` (Mapped). **Discovery: EXECUTED.** Verified with a non-zero penalty, closing a risk that had stood on zero-only evidence.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-023 - V4 | Change fee

**Objective:** Verify **Change fee** on Step 2 - Review and Pay is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 2 - Review and Pay`. Portal field `reissuePricing.changeFee`. Core field **none - app-origin**. Supplier field -. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 2 - Review and Pay for the aligned offer.
4. Read `reissuePricing.changeFee` and **none - app-origin** for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Equals the agency's configured Exchange Fee rule applied to the passenger count, added **after** conversion. It is null in the supplier-currency block.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `V4` (Mapped). **Discovery: EXECUTED.** Declared app-origin - the precedent for every other app-origin value. Verified against the Exchange Fees rule.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-024 - V5 | Amount payable

**Objective:** Verify **Amount payable** on Step 2 - Review and Pay is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 2 - Review and Pay`. Portal field `reissuePricing.totalPayable`. Core field `modifyPrice.totalPayable`. Supplier field `grandTotal`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 2 - Review and Pay for the aligned offer.
4. Read `reissuePricing.totalPayable` and `modifyPrice.totalPayable` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Equals the sum of the lines above it **and** the amount on the payment button.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `V5` (Mapped). **Discovery: EXECUTED.** Verified equal to the payment button amount.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-025 - V6 | Currently ticketed, per-type base and taxes

**Objective:** Verify **Currently ticketed, per-type base and taxes** on Step 2 - Review and Pay is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 2 - Review and Pay`. Portal field `currentOffer...passengerFareBreakdowns[]`. Core field `priceDetails`. Supplier field original ticket. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 2 - Review and Pay for the aligned offer.
4. Read `currentOffer...passengerFareBreakdowns[]` and `priceDetails` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Each type's lines are correct and sum to that type's group figure.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `V6` (Mapped). **Discovery: EXECUTED.** Verified per type.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-026 - V7 | Currently ticketed, Total

**Objective:** Verify **Currently ticketed, Total** on Step 2 - Review and Pay is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 2 - Review and Pay`. Portal field `currentOffer.priceDetails.totalOfferAmount`. Core field `priceDetails.totalAmount`. Supplier field original ticket. Inventory status **Gap**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 2 - Review and Pay for the aligned offer.
4. Read `currentOffer.priceDetails.totalOfferAmount` and `priceDetails.totalAmount` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** The Total equals the sum of the line items printed directly above it, to the cent.

**Priority:** P1

**Tags:** Atomic, Mapping, Negative, Regression

**Notes:** Inventory row `V7` (Gap). **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R02`, `FINDING-R12`.** **FAILS - the currently-ticketed total is rounded and contradicts its own line items.** Reproduced in both currencies and at two exchange rates. The unrounded field is itself already rounded in the converted currency, so re-pointing the binding fixes nothing.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-027 - V8 | Trip type label

**Objective:** Verify **Trip type label** on Step 2 - Review and Pay is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 2 - Review and Pay`. Portal field `tripType`. Core field -. Supplier field -. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 2 - Review and Pay for the aligned offer.
4. Read `tripType` and - for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Matches the journey structure actually being exchanged.

**Priority:** P3

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `V8` (Mapped). **Discovery: EXECUTED.** Verified across one-way, round trip and multi-city.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-028 - V9 | Nonstop-throughout label

**Objective:** Verify **Nonstop-throughout label** on Step 2 - Review and Pay is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 2 - Review and Pay`. Portal field derived from `journeys[].numberOfStops`. Core field -. Supplier field -. Inventory status **App-origin**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 2 - Review and Pay for the aligned offer.
4. Read derived from `journeys[].numberOfStops` and - for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** True for **every** journey in the offer. A multi-journey offer with one connecting leg must not claim nonstop throughout.

**Priority:** P1

**Tags:** Atomic, Mapping, App-origin

**Notes:** Inventory row `V9` (App-origin). **Discovery: NOT EXECUTED.** Never tested. Undeclared derivation across multiple journeys.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-029 - V10 | Passenger names and types

**Objective:** Verify **Passenger names and types** on Step 2 - Review and Pay is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 2 - Review and Pay`. Portal field `passengers[].name`, `.passengerType`. Core field - (booking-side). Supplier field traveler names. Inventory status **Unmapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 2 - Review and Pay for the aligned offer.
4. Read `passengers[].name`, `.passengerType` and - (booking-side) for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Names and types match the booking and the supplier's travelers, **in the same order as the ticket numbers displayed beside them**.

**Priority:** P1

**Tags:** Atomic, Mapping, Undeclared

**Notes:** Inventory row `V10` (Unmapped). **Discovery: EXECUTED.** Observed correct on every scenario but never formally mapped.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-030 - V11 | Ticket numbers, per passenger

**Objective:** Verify **Ticket numbers, per passenger** on Step 2 - Review and Pay is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 2 - Review and Pay`. Portal field `passengers[].ticketNumber`. Core field -. Supplier field `flightTickets[].number`. Inventory status **Unmapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 2 - Review and Pay for the aligned offer.
4. Read `passengers[].ticketNumber` and - for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Every passenger shows the ticket number the supplier holds for that traveler.

**Priority:** P1

**Tags:** Atomic, Mapping, Undeclared

**Notes:** Inventory row `V11` (Unmapped). **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R06`.** **FAILS conditionally.** Positional loss observed on several bookings - every even-numbered passenger blank - while other bookings stored all of them.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-031 - V12 | Fare-held countdown

**Objective:** Verify **Fare-held countdown** on Step 2 - Review and Pay is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 2 - Review and Pay`. Portal field hold-token expiry. Core field -. Supplier field offer `validUntil`. Inventory status **App-origin**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 2 - Review and Pay for the aligned offer.
4. Read hold-token expiry and - for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** The countdown never outlasts the supplier's offer validity. An offer expired at the supplier must not still display as held.

**Priority:** P1

**Tags:** Atomic, Mapping, App-origin

**Notes:** Inventory row `V12` (App-origin). **Discovery: NOT EXECUTED.** Never tested. **The app's hold token and the supplier's offer validity are two different clocks.**

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-032 - V13 | Wallet balance on the payment panel

**Objective:** Verify **Wallet balance on the payment panel** on Step 2 - Review and Pay is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 2 - Review and Pay`. Portal field `/v2/financial/financial-details` -> `walletBalance`. Core field - (app-origin). Supplier field -. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 2 - Review and Pay for the aligned offer.
4. Read `/v2/financial/financial-details` -> `walletBalance` and - (app-origin) for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Rendered with the currency's own decimal places, identically everywhere on the channel, and equal to the API value.

**Priority:** P2

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `V13` (Mapped). **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R17`.** Composition verified and confirmed intended. A formatting defect stands - the value renders with a different number of decimals in the sidebar than on the page.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-033 - V14 | Operated-by carrier

**Objective:** Verify **Operated-by carrier** on Step 2 - Review and Pay is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 2 - Review and Pay`. Portal field `operatingCarrier.name`. Core field -. Supplier field `operatingAirlineCode`. Inventory status **App-origin**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 2 - Review and Pay for the aligned offer.
4. Read `operatingCarrier.name` and - for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Matches the supplier's operating carrier, and is **distinguished from the marketing carrier wherever the two differ**.

**Priority:** P1

**Tags:** Atomic, Mapping, App-origin

**Notes:** Inventory row `V14` (App-origin). **Discovery: NOT EXECUTED.** **Related finding(s): `FINDING-R20`.** Never tested. Same Portal-side lookup as the airline name.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-034 - V15 | Sector count label

**Objective:** Verify **Sector count label** on Step 2 - Review and Pay is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 2 - Review and Pay`. Portal field derived from `segments[]` length. Core field -. Supplier field -. Inventory status **App-origin**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 2 - Review and Pay for the aligned offer.
4. Read derived from `segments[]` length and - for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Equals the number of segments actually being exchanged.

**Priority:** P3

**Tags:** Atomic, Mapping, App-origin

**Notes:** Inventory row `V15` (App-origin). **Discovery: NOT EXECUTED.** Never tested. Undeclared derivation.

**Review:** Pending

**Automation:** Pending

## 3. Step 3 - Confirmation

### TC-RMAPF-035 - C1 | New order id

**Objective:** Verify **New order id** on Step 3 - Confirmation is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 3 - Confirmation`. Portal field `book.orderId`. Core field -. Supplier field -. Inventory status **Unmapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 3 - Confirmation for the aligned offer.
4. Read `book.orderId` and - for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Matches the id the book call returned and the id the confirmation is fetched with.

**Priority:** P2

**Tags:** Atomic, Mapping, Undeclared

**Notes:** Inventory row `C1` (Unmapped). **Discovery: EXECUTED.** Observed on every completed exchange.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-036 - C2 | New booking reference

**Objective:** Verify **New booking reference** on Step 3 - Confirmation is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 3 - Confirmation`. Portal field `book.bookingReference`. Core field -. Supplier field -. Inventory status **Unmapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 3 - Confirmation for the aligned offer.
4. Read `book.bookingReference` and - for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** A new reference is issued and the superseded one remains traceable to it.

**Priority:** P2

**Tags:** Atomic, Mapping, Undeclared

**Notes:** Inventory row `C2` (Unmapped). **Discovery: EXECUTED.** Observed. **A new booking reference is issued while the GDS PNR stays the same.**

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-037 - C3 | GDS PNR

**Objective:** Verify **GDS PNR** on Step 3 - Confirmation is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 3 - Confirmation`. Portal field `bookingConfirm` flight info. Core field supplier `bookingId`. Supplier field `confirmationId`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 3 - Confirmation for the aligned offer.
4. Read `bookingConfirm` flight info and supplier `bookingId` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Matches the supplier record exactly and is **unchanged** by the exchange.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `C3` (Mapped). **Discovery: EXECUTED.** Verified against the supplier on every scenario.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-038 - C4 | Airline PNR

**Objective:** Verify **Airline PNR** on Step 3 - Confirmation is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 3 - Confirmation`. Portal field `bookingConfirm` flight info. Core field supplier. Supplier field airline record locator. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 3 - Confirmation for the aligned offer.
4. Read `bookingConfirm` flight info and supplier for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Matches the supplier's post-exchange airline locator.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `C4` (Mapped). **Discovery: EXECUTED.** Verified. **The airline PNR does change on exchange while the GDS PNR does not.**

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-039 - C5 | New ticket numbers, per passenger

**Objective:** Verify **New ticket numbers, per passenger** on Step 3 - Confirmation is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 3 - Confirmation`. Portal field `passengerInfo[]`. Core field -. Supplier field `flightTickets[].number`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 3 - Confirmation for the aligned offer.
4. Read `passengerInfo[]` and - for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Every passenger shows the new ticket number the supplier issued. **Where the supplier issued none, the passenger is shown as not ticketed - distinguishably from a value that merely failed to display.**

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `C5` (Mapped). **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R14`.** **FAILS conditionally.** On one exchange every ticket number came back null while the supplier held newly issued tickets; on another all were stored.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-040 - C6 | Invoice base fare

**Objective:** Verify **Invoice base fare** on Step 3 - Confirmation is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 3 - Confirmation`. Portal field `invoiceInfo.totalFare`. Core field `modifyPrice.baseDifference`. Supplier field `baseFare`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 3 - Confirmation for the aligned offer.
4. Read `invoiceInfo.totalFare` and `modifyPrice.baseDifference` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Equals the additional base fare at rate.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `C6` (Mapped). **Discovery: EXECUTED.** Verified equal to the additional base fare charged.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-041 - C7 | Invoice taxes

**Objective:** Verify **Invoice taxes** on Step 3 - Confirmation is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 3 - Confirmation`. Portal field **`invoiceInfo.totalTax`**. Core field `taxDifference` **+ `penalty`**. Supplier field -. Inventory status **Gap**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 3 - Confirmation for the aligned offer.
4. Read **`invoiceInfo.totalTax`** and `taxDifference` **+ `penalty`** for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** The invoice tax total equals the tax difference alone. The penalty is recorded in its own field and presented to the customer as a change penalty, never as tax.

**Priority:** P1

**Tags:** Atomic, Mapping, Negative, Regression

**Notes:** Inventory row `C7` (Gap). **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R03`.** **FAILS - the supplier penalty is merged into the tax total.** The supplier books the penalty as explicitly not tax.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-042 - C8 | Invoice service charges

**Objective:** Verify **Invoice service charges** on Step 3 - Confirmation is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 3 - Confirmation`. Portal field **`invoiceInfo.serviceCharges`**. Core field - (`changeFee` dropped). Supplier field -. Inventory status **Gap**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 3 - Confirmation for the aligned offer.
4. Read **`invoiceInfo.serviceCharges`** and - (`changeFee` dropped) for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** The change fee is recorded in a field meaning change fee. Service charges carry only genuine rule-engine service charges - zero on a reissue.

**Priority:** P1

**Tags:** Atomic, Mapping, Negative, Regression

**Notes:** Inventory row `C8` (Gap). **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R05`.** **FAILS - the change fee is written into the service-charge field.** Decisive because the rule engine contributes nothing to a reissue, so any non-zero service charge there can only be the change fee.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-043 - C9 | Invoice total amount

**Objective:** Verify **Invoice total amount** on Step 3 - Confirmation is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 3 - Confirmation`. Portal field `invoiceInfo.totalAmt` / `agencyInvoiceAmt`. Core field `totalPayable` + change fee. Supplier field `grandTotal`. Inventory status **Mapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 3 - Confirmation for the aligned offer.
4. Read `invoiceInfo.totalAmt` / `agencyInvoiceAmt` and `totalPayable` + change fee for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Both recorded totals equal the component sum **and** the amount actually debited from the wallet.

**Priority:** P1

**Tags:** Atomic, Mapping, Positive

**Notes:** Inventory row `C9` (Mapped). **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R15`, `FINDING-R18`.** **FAILS - the recorded totals are rounded away from the component sum, and the wallet is debited the rounded figure.**

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-044 - C10 | Booking date and status

**Objective:** Verify **Booking date and status** on Step 3 - Confirmation is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 3 - Confirmation`. Portal field `bookingConfirm`. Core field -. Supplier field -. Inventory status **Unmapped**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 3 - Confirmation for the aligned offer.
4. Read `bookingConfirm` and - for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** The date is the exchange date and the status reflects the supplier's actual post-exchange state.

**Priority:** P3

**Tags:** Atomic, Mapping, Undeclared

**Notes:** Inventory row `C10` (Unmapped). **Discovery: EXECUTED.** Observed.

**Review:** Pending

**Automation:** Pending

### TC-RMAPF-045 - C11 | Segment detail and terminals

**Objective:** Verify **Segment detail and terminals** on Step 3 - Confirmation is the faithfully mapped value of its source, or is a correctly declared app-origin value.

**Preconditions:** A reissuable booking. Supplier, core and the surface readable inside one capture window. This case pays nothing.

**Test Data:** Screen `Step 3 - Confirmation`. Portal field `bookingConfirm.journeyInfoList`. Core field `flightSegments[].*Terminal`. Supplier field terminals. Inventory status **Gap**. **No specimen value is given - assert the mapping, never a remembered figure.**

**Steps:**

1. Capture the supplier reshop, the core reshop and the surface payload inside one window.
2. Align offers **by flight signature**, never by array index.
3. Read the rendered value on Step 3 - Confirmation for the aligned offer.
4. Read `bookingConfirm.journeyInfoList` and `flightSegments[].*Terminal` for that same offer.
5. Compare value, meaning and presence. Record any rename, reshape or unit change across the hop.

**Expected Result:** Where a terminal exists it is shown; where it is null the placeholder is a **deliberate, declared** fallback rather than a silently swallowed null. **This case must first establish which it is.**

**Priority:** P2

**Tags:** Atomic, Mapping, Negative, Regression

**Notes:** Inventory row `C11` (Gap). **Discovery: NOT EXECUTED.** **Related finding(s): `FINDING-R20`.** **Inventory gap 4.2 - never raised as a numbered finding.** Terminals came back null at both layers on reshop, yet a terminal row still renders on the confirmation.

**Review:** Pending

**Automation:** Pending

## 4. Cross-screen data consistency and calculation

These cases are why the suite exists. **A value can be individually plausible on every screen
and still be wrong, because the screens disagree with each other or with the core service.**
Each case follows one value, or one calculation, across Search, Review & Pay, Confirmation and
Itinerary, and back to core and the supplier.

`tools/compare_phases.js` already compares 17 fields per segment across Search, Review and
Confirmation and should be extended to the Itinerary rather than duplicated.

### TC-RMAPX-046 - Flight identity is the same value on every screen

**Objective:** Verify carrier, flight number and segment order never change between screens for the offer actually chosen.

**Preconditions:** One booking driven through the whole flow in a single session. A human performs any payment. Screens covered: **Search results, Review & Pay, Confirmation, Itinerary**.

**Test Data:** Any reissuable booking. **No specimen values - the case asserts agreement between sources, not a remembered figure.**

**Steps:**

1. Drive one booking through the full flow in one session, capturing the payload behind **every** screen: `search`, `review`, `bookingConfirm` and the itinerary endpoint. Capture the supplier and core responses in the same window.
2. Record carrier code, flight number and segment order for the selected offer on the search results card.
3. Record the same three on Review & Pay, on the Confirmation, and on the Itinerary after the exchange.
4. Compare all four against each other and against the supplier.

**Expected Result:** All four screens show the same carrier, flight number and segment order, and all four match the supplier. **A value that changes between screens is a defect even when each screen is individually plausible.**

**Priority:** P1

**Tags:** Atomic, Consistency, Integration

**Notes:** **Discovery: EXECUTED.** A comparator for this exists - `tools/compare_phases.js` compares 17 fields per segment across Search, Review and Confirmation. **Itinerary was outside the original inventory scope and is added here at the user's request, 2026-09-30.**

**Review:** Pending

**Automation:** Pending

### TC-RMAPX-047 - Departure and arrival times are the same value on every screen

**Objective:** Verify one flight's times do not differ between screens - the defect already known to exist on one of them.

**Preconditions:** One booking driven through the whole flow in a single session. A human performs any payment. Screens covered: **Search results, Review & Pay, Confirmation, Itinerary**.

**Test Data:** Any reissuable booking. **No specimen values - the case asserts agreement between sources, not a remembered figure.**

**Steps:**

1. Drive one booking through the full flow in one session, capturing the payload behind **every** screen: `search`, `review`, `bookingConfirm` and the itinerary endpoint. Capture the supplier and core responses in the same window.
2. Record departure and arrival for every segment on each of the four screens.
3. Record the same values from core and from the supplier.
4. Compare every screen against the supplier **and against each other**.
5. Repeat with the browser set to a different time zone.

**Expected Result:** Every screen shows the supplier's time, unshifted, and all screens agree with each other. **Two screens in one application must never disagree about one flight.**

**Priority:** P1

**Tags:** Atomic, Consistency, Integration

**Notes:** **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R01`.** **FAILS today.** The reissue search results render the supplier time correctly while the Itinerary renders the same flight offset by two hours. This case is the one that catches it, because neither screen is wrong in isolation - only together.

**Review:** Pending

**Automation:** Pending

### TC-RMAPX-048 - Route, airports and place names are the same on every screen

**Objective:** Verify the code-to-name lookup is applied identically everywhere.

**Preconditions:** One booking driven through the whole flow in a single session. A human performs any payment. Screens covered: **Search results, Review & Pay, Confirmation, Itinerary**.

**Test Data:** Any reissuable booking. **No specimen values - the case asserts agreement between sources, not a remembered figure.**

**Steps:**

1. Drive one booking through the full flow in one session, capturing the payload behind **every** screen: `search`, `review`, `bookingConfirm` and the itinerary endpoint. Capture the supplier and core responses in the same window.
2. Record origin and destination codes, and the rendered airport, city and country names, on each screen.
3. Compare across screens and against the codes core sent.

**Expected Result:** Codes match the supplier on every screen, and the rendered names are identical across screens for the same code. **One screen naming a city differently from another is a defect even if both names are plausible.**

**Priority:** P1

**Tags:** Atomic, Consistency, Integration

**Notes:** **Discovery: NOT EXECUTED.** Never tested. The place-name lookup has no rule and no verification on any single screen, let alone across screens.

**Review:** Pending

**Automation:** Pending

### TC-RMAPX-049 - Cabin and booking class are the same on every screen

**Objective:** Verify cabin and RBD survive the whole flow, including where segments differ.

**Preconditions:** One booking driven through the whole flow in a single session. A human performs any payment. Screens covered: **Search results, Review & Pay, Confirmation, Itinerary**.

**Test Data:** Any reissuable booking. **No specimen values - the case asserts agreement between sources, not a remembered figure.**

**Steps:**

1. Drive one booking through the full flow in one session, capturing the payload behind **every** screen: `search`, `review`, `bookingConfirm` and the itinerary endpoint. Capture the supplier and core responses in the same window.
2. Record cabin and booking class per segment on each screen.
3. Compare across screens and against the fare core priced.
4. Use an offer whose segments carry **different** booking classes.

**Expected Result:** Each segment's cabin and class match the priced fare on every screen. Where segments differ, no screen collapses them to a single value.

**Priority:** P1

**Tags:** Atomic, Consistency, Integration

**Notes:** **Discovery: PARTIAL.** Partly observed. An offer with differing classes per segment was captured but the four-screen comparison was never made.

**Review:** Pending

**Automation:** Pending

### TC-RMAPX-050 - Passenger identity and ticket numbers are consistent across screens and against the supplier

**Objective:** Verify passengers and their documents line up everywhere, before and after the exchange.

**Preconditions:** One booking driven through the whole flow in a single session. A human performs any payment. Screens covered: **Search results, Review & Pay, Confirmation, Itinerary**.

**Test Data:** Any reissuable booking. **No specimen values - the case asserts agreement between sources, not a remembered figure.**

**Steps:**

1. Drive one booking through the full flow in one session, capturing the payload behind **every** screen: `search`, `review`, `bookingConfirm` and the itinerary endpoint. Capture the supplier and core responses in the same window.
2. Record each passenger's name, type and ticket number on Review & Pay, Confirmation and Itinerary.
3. Call the supplier's get-booking and group documents by traveler index.
4. Compare per passenger, **in order**, across all screens and against the supplier.

**Expected Result:** Every screen lists the same passengers in the same order with the same types, and each passenger's ticket number matches the document the supplier holds for that traveler. **A passenger the supplier has not ticketed is shown as not ticketed on every screen.**

**Priority:** P1

**Tags:** Atomic, Consistency, Integration

**Notes:** **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R06`, `FINDING-R13`, `FINDING-R14`.** **FAILS conditionally.** Positional ticket-number loss was observed on several bookings, and on one exchange the application held no ticket numbers at all while the supplier held newly issued ones. Per-passenger supplier verification is a standing obligation for this scope.

**Review:** Pending

**Automation:** Pending

### TC-RMAPX-051 - Price lines are the same value from Search through Review to Confirmation

**Objective:** Verify the money does not change as the agent moves forward without changing anything.

**Preconditions:** One booking driven through the whole flow in a single session. A human performs any payment. Screens covered: **Search results, Review & Pay, Confirmation**.

**Test Data:** Any reissuable booking. **No specimen values - the case asserts agreement between sources, not a remembered figure.**

**Steps:**

1. Drive one booking through the full flow in one session, capturing the payload behind **every** screen: `search`, `review`, `bookingConfirm` and the itinerary endpoint. Capture the supplier and core responses in the same window.
2. Record the offer's payable amount on the search card.
3. Record additional base, additional tax, supplier fee, change fee and total on Review & Pay.
4. Complete the exchange (human-clicked) and record the invoice components and total.
5. Compare each line across the three phases, and each against core.

**Expected Result:** The payable amount on the card equals the total on Review & Pay equals the amount charged equals the invoice total. **Any change between phases is a defect unless the offer was re-priced and the agent was told.**

**Priority:** P1

**Tags:** Atomic, Consistency, Integration

**Notes:** **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R03`, `FINDING-R05`.** **FAILS at the invoice.** The line items survive Search to Review intact, but the invoice merges the penalty into tax and writes the change fee into service charges, so the components arriving at Confirmation are not the components shown at Review.

**Review:** Pending

**Automation:** Pending

### TC-RMAPX-052 - The amount agreed is the amount charged is the amount recorded

**Objective:** Verify money taken equals money shown.

**Preconditions:** One booking driven through the whole flow in a single session. A human performs any payment. Screens covered: **Review & Pay, wallet, Confirmation**.

**Test Data:** Any reissuable booking. **No specimen values - the case asserts agreement between sources, not a remembered figure.**

**Steps:**

1. Read the wallet balance from the API - not from the screen - and record it exactly.
2. Record the amount on the payment button verbatim.
3. Complete the exchange (human-clicked).
4. Read the wallet again and compute the movement.
5. Read the invoice totals.

**Expected Result:** Wallet movement = payment button amount = invoice total, all to the cent.

**Priority:** P1

**Tags:** Atomic, Consistency, Integration

**Notes:** **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R18`.** **FAILS.** The wallet is debited a rounded figure while the button shows the exact one, and the invoice records the rounded figure too - so wallet and invoice agree with each other and both disagree with what was agreed. Read the wallet from the API: the sidebar and page render different decimal counts.

**Review:** Pending

**Automation:** Pending

### TC-RMAPX-053 - Each screen's own arithmetic is internally consistent

**Objective:** Verify every screen's total equals the sum of the lines it prints above it.

**Preconditions:** One booking driven through the whole flow in a single session. A human performs any payment. Screens covered: **Search results, Review & Pay, Confirmation, Itinerary**.

**Test Data:** Any reissuable booking. **No specimen values - the case asserts agreement between sources, not a remembered figure.**

**Steps:**

1. Drive one booking through the full flow in one session, capturing the payload behind **every** screen: `search`, `review`, `bookingConfirm` and the itinerary endpoint. Capture the supplier and core responses in the same window.
2. On each screen, list every itemised line and the total it rolls up to.
3. Sum the lines, applying discounts as subtractions and charges as additions.
4. Compare against the printed total on that same screen.

**Expected Result:** On every screen, every printed total equals the sum of the items printed above it, to the cent. **A screen that contradicts itself is a defect regardless of whether the total happens to be the correct one.**

**Priority:** P1

**Tags:** Atomic, Consistency, Integration

**Notes:** **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R02`, `FINDING-R12`.** **FAILS on two screens.** The currently-ticketed block on Review & Pay prints a total that its own lines do not sum to, and the confirmation's fare details do not sum to its total.

**Review:** Pending

**Automation:** Pending

### TC-RMAPX-054 - Every screen's figures reconcile against the core service

**Objective:** Verify each screen independently against core, not only against each other.

**Preconditions:** One booking driven through the whole flow in a single session. A human performs any payment. Screens covered: **Search results, Review & Pay, Confirmation, Itinerary**.

**Test Data:** Any reissuable booking. **No specimen values - the case asserts agreement between sources, not a remembered figure.**

**Steps:**

1. Drive one booking through the full flow in one session, capturing the payload behind **every** screen: `search`, `review`, `bookingConfirm` and the itinerary endpoint. Capture the supplier and core responses in the same window.
2. For each screen, take each displayed money value and locate the core field behind it.
3. Apply the documented conversion - core value x `currencyRate` - and the app-origin additions.
4. Compare per field, per screen.

**Expected Result:** Every money value on every screen is reproducible from a core value by the documented rule. **Screens agreeing with each other while all disagreeing with core is still a defect - cross-screen consistency alone is not sufficient.**

**Priority:** P1

**Tags:** Atomic, Consistency, Integration

**Notes:** **Discovery: EXECUTED.** Verified on Search and Review. The Confirmation reconciles only after accounting for the two attribution defects, and the Itinerary was never included.

**Review:** Pending

**Automation:** Pending

### TC-RMAPX-055 - The exchange rate is applied identically on every screen

**Objective:** Verify one rate is used consistently and only once.

**Preconditions:** One booking driven through the whole flow in a single session. A human performs any payment. Screens covered: **Search results, Review & Pay, Confirmation, Itinerary**.

**Test Data:** Any reissuable booking. **No specimen values - the case asserts agreement between sources, not a remembered figure.**

**Steps:**

1. Drive one booking through the full flow in one session, capturing the payload behind **every** screen: `search`, `review`, `bookingConfirm` and the itinerary endpoint. Capture the supplier and core responses in the same window.
2. Read `currencyRate` from the review payload.
3. For each money value on each screen, divide by the supplier-currency figure and confirm the ratio.
4. Confirm the change fee is **excluded** from that ratio on every screen.

**Expected Result:** One rate is applied, once, to every supplier-sourced value on every screen. App-origin amounts are added after conversion and never multiplied by the rate. **The currently-ticketed figures use the rate in force when the ticket was issued, not the current rate.**

**Priority:** P1

**Tags:** Atomic, Consistency, Integration

**Notes:** **Discovery: PARTIAL.** Verified at two very different rates for the new offer. The issue-time rate on the currently-ticketed block is confirmed by the product owner but was never tested with a controlled before/after rate change.

**Review:** Pending

**Automation:** Pending

### TC-RMAPX-056 - Per-passenger-type breakdowns reconcile across screens and to the offer total

**Objective:** Verify the per-type split survives to the invoice.

**Preconditions:** One booking driven through the whole flow in a single session. A human performs any payment. Screens covered: **Review & Pay, Confirmation**.

**Test Data:** Any reissuable booking. **No specimen values - the case asserts agreement between sources, not a remembered figure.**

**Steps:**

1. Drive one booking through the full flow in one session, capturing the payload behind **every** screen: `search`, `review`, `bookingConfirm` and the itinerary endpoint. Capture the supplier and core responses in the same window.
2. Record each passenger type's base and tax on Review & Pay, with its passenger count.
3. Multiply per-passenger figures by counts and sum across types.
4. Compare against the offer total on the same screen and against the invoice components.

**Expected Result:** Each type's figures x its count sum to the offer total on every screen, and the same split is recoverable from the invoice.

**Priority:** P1

**Tags:** Atomic, Consistency, Integration

**Notes:** **Discovery: PARTIAL.** Verified on Review & Pay. **The invoice carries no per-type split at all**, so the reconciliation cannot be completed at the Confirmation - which is itself worth a decision.

**Review:** Pending

**Automation:** Pending

### TC-RMAPX-057 - Journey shape is the same on every screen

**Objective:** Verify segments, journeys, stops and layovers agree everywhere.

**Preconditions:** One booking driven through the whole flow in a single session. A human performs any payment. Screens covered: **Search results, Review & Pay, Confirmation, Itinerary**.

**Test Data:** Any reissuable booking. **No specimen values - the case asserts agreement between sources, not a remembered figure.**

**Steps:**

1. Drive one booking through the full flow in one session, capturing the payload behind **every** screen: `search`, `review`, `bookingConfirm` and the itinerary endpoint. Capture the supplier and core responses in the same window.
2. Record the journey and segment structure, stop counts and layover points on each screen.
3. Compare across screens and against core.
4. Use a multi-city and a round-trip booking as well as a one-way.

**Expected Result:** Every screen shows the same journeys in the same order with the same segments, stops and layovers, matching core.

**Priority:** P1

**Tags:** Atomic, Consistency, Integration

**Notes:** **Discovery: EXECUTED.** Structure verified across one-way, round-trip and multi-city, though not against the Itinerary screen.

**Review:** Pending

**Automation:** Pending

### TC-RMAPX-058 - Nothing the backend returns is silently dropped between screens

**Objective:** Verify a value present at one phase does not vanish at the next without explanation.

**Preconditions:** One booking driven through the whole flow in a single session. A human performs any payment. Screens covered: **Search results, Review & Pay, Confirmation, Itinerary**.

**Test Data:** Any reissuable booking. **No specimen values - the case asserts agreement between sources, not a remembered figure.**

**Steps:**

1. Drive one booking through the full flow in one session, capturing the payload behind **every** screen: `search`, `review`, `bookingConfirm` and the itinerary endpoint. Capture the supplier and core responses in the same window.
2. Enumerate the non-null fields in the search payload, the review payload and the confirmation payload.
3. For each field present at an earlier phase and absent at a later one, locate where it went.
4. Flag any value that disappears with no replacement and no declaration.

**Expected Result:** Every value carried forward is either displayed, deliberately superseded, or declared as dropped. **Under this scope's oracle only a returned-and-hidden value is a defect - a value the app never returns cannot be judged missing.**

**Priority:** P1

**Tags:** Atomic, Consistency, Integration

**Notes:** **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R05`.** **Found at least one real instance** - the change fee is present through search and review and then disappears at the invoice, its value reappearing in a different field. That is exactly the shape this case is designed to catch.

**Review:** Pending

**Automation:** Pending

### TC-RMAPX-059 - Currency and its formatting are consistent on every screen

**Objective:** Verify one currency, one decimal convention, everywhere.

**Preconditions:** One booking driven through the whole flow in a single session. A human performs any payment. Screens covered: **Search results, Review & Pay, Confirmation, Itinerary**.

**Test Data:** Any reissuable booking. **No specimen values - the case asserts agreement between sources, not a remembered figure.**

**Steps:**

1. Drive one booking through the full flow in one session, capturing the payload behind **every** screen: `search`, `review`, `bookingConfirm` and the itinerary endpoint. Capture the supplier and core responses in the same window.
2. Record the currency label and the decimal places rendered for every money value on every screen, including the wallet.
3. Compare against the currency's own convention and against the API values.

**Expected Result:** Every money value on every screen carries the agency currency and that currency's decimal places. **No object labelled with one currency contains an amount in another.**

**Priority:** P1

**Tags:** Atomic, Consistency, Integration

**Notes:** **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R15`, `FINDING-R17`.** **FAILS twice.** The wallet renders a different number of decimals in the sidebar than on the page, and the invoice - labelled in the agency currency - carries a field holding the unconverted supplier-currency figure.

**Review:** Pending

**Automation:** Pending

### TC-RMAPX-060 - A re-priced or expired offer is reported, never silently substituted

**Objective:** Verify the agent is told when the price they selected is no longer the price they will pay.

**Preconditions:** One booking driven through the whole flow in a single session. A human performs any payment. Screens covered: **Search results, Review & Pay**.

**Test Data:** Any reissuable booking. **No specimen values - the case asserts agreement between sources, not a remembered figure.**

**Steps:**

1. Drive one booking through the full flow in one session, capturing the payload behind **every** screen: `search`, `review`, `bookingConfirm` and the itinerary endpoint. Capture the supplier and core responses in the same window.
2. Select an offer and hold at Review & Pay until the fare-held countdown approaches expiry.
3. Compare the amount payable before and after any re-price.
4. Let the supplier's offer validity lapse and attempt to proceed.

**Expected Result:** Any change to the payable amount between selection and payment is shown to the agent explicitly. An offer expired at the supplier is reported as expired and cannot be paid. **A silent substitution of a different price is the defect.**

**Priority:** P1

**Tags:** Atomic, Consistency, Integration

**Notes:** **Discovery: NOT EXECUTED.** **Related finding(s): `FINDING-R21`.** Never tested. The app's hold countdown and the supplier's offer validity are two separate clocks and their interaction is unverified.

**Review:** Pending

**Automation:** Pending
