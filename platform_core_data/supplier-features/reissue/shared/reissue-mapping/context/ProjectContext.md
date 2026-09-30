# Project Context — Reissue Mapping

| Field | Value |
|---|---|
| Module | `reissue` (Supplier Feature) |
| Feature | `reissue-mapping` (shared scope) |
| Sibling scope | `reissue-flow` — the **business feature**. This scope **gates** it (§1.2) |
| Source User Story | "Reissue - Auto Reissue flow from Itinerary" — `knowledge_base/requirements/user_stories/Reissue_Flow_From_Itinerary.md` (supplied 2026-09-23), clarifications CL-1 … CL-3 (2026-09-24), Acceptance Criteria + Edge Cases (2026-09-27) |
| Acceptance Criteria | The story's ACs are the **business** scope's obligation. This scope carries the ACs only insofar as a mis-mapping of the chain would make them unverifiable — see §7 |
| PRD Source | `platform_core_data/knowledge_base/PRD.md` |
| PRD sections this scope derives from | **None directly.** The PRD has no Reissue / Re-shop / Exchange section. Related only: §7.8 BMO-10 Pay & Book, BMO-14 booking retrieval |
| Run Scope Type | User Story |
| Run Type | User Story (Supplier Feature · shared scope) |
| Integration layer | `ndc-core-service` (as registered on the Feature) |
| Execution supplier | **Sabre** — core service `SABRE_ATPCO` credential `EGY`; Sabre CERT REST, PCC **EZ4K** |
| Target Environment | Admin `http://192.168.1.60` · Portal `http://192.168.1.60:9500` · core service staging `/api/v1/reissue` |
| Produced by run | `run-007__2026-09-26_17-10-56__UserStory__ReissueFlowFromItinerary` (retargeted to this scope by the 2026-09-27 scope split — see `run.json` `scopeHistory`) |
| Revision | **13** (2026-09-30 — the **Itinerary screen is brought into the cross-screen consistency scope** (§1.1.2); the non-negativity invariant is added to the coverage model; §2.4's table repaired, §5.1 created and OQ-M15 defined. Full history in §12.) |
| Target ref at write | `0000c1e9f51c4c17774a1a842608cd25d9ec2222` |
| Generated | 2026-09-27 |
| Status | **Pending Review** |

## 1. Scope Summary

This scope verifies the **two mapping hops** of the Reissue flow, each on its own terms:

```
Sabre (CERT REST, PCC EZ4K)  ──hop B──>  ndc-core-service  ──hop A──>  Admin / Portal API  ──>  screen
         supplier                        (/api/v1/reissue)                                      UI
```

**Hop A — core service → UI.** Every value displayed on the Admin and Portal screens is mapped
correctly from the core service: it traces to a named core-service field, that **key means the same
thing** on both sides, and the **value** arrives intact.

**Hop B — supplier → core service.** Every value the core service exposes is mapped correctly from the
supplier: same trace, same key meaning, same value.

### For each hop, three questions — in this order

1. **Provenance.** *Which upstream field backs this value?* A displayed value with no upstream source
   is either **app-origin** — and must be declared as such, the way `changeFee` is — or a defect.
   Read the other way: an upstream field that never surfaces downstream must be dropped
   *deliberately*, not by accident.
2. **Key meaning.** *Does the upstream key mean what the downstream key means?* Sabre `totalFee` →
   core `penalty` → screen "Supplier fee" is three different words that must denote **one concept**.
   A rename that quietly changes meaning passes every numeric check and is still a mapping defect.
3. **Value fidelity.** *Is the value carried without corruption?* Unit, currency, scale, **sign**,
   precision and rounding, date-time zone, the representation of empty/null/zero, and per-passenger
   against per-group.

### Why equality is not the test

**Equal numbers are necessary but not sufficient.** Two layers can agree on a value while disagreeing
on what the field *is* — and the run-007 evidence already contains that trap: `penalty` was **0 on
both sides** for the booked flight, so the observed equality proves nothing about how a non-zero
supplier penalty maps (RSK-M5). Likewise Sabre's **empty string** for no penalty and core's `0` are
equal in effect and different in representation; that is a mapping decision, and it has to be a
deliberate one.

This scope does **not** test whether the business rules behind the values are right — that is
`reissue-flow`. It proves the pipe is clean and every drop is accounted for; the business scope proves
the water is right.

### 1.1 Testing layers (frozen in `run.json`, §A3/§A4)

| Layer | Status | Reason |
|---|---|---|
| **UI** | **In Scope** | **The screen is the end of hop A** — the last link of the chain and the only place a mapping defect becomes visible to a user. A displayed value with no verified source is exactly what this scope exists to catch. Scoped to the **displayed value and its label**, not to screen behaviour (§1.1.1) |
| API | In Scope | Admin and Portal reissue endpoints: eligibility, re-shop/search, reprice, review |
| Contract | In Scope | Request/response shape of the core-service `providers` / `eligibility` / `reshop` calls, and of the Sabre `getBooking` / `flightReshop` calls |
| Integration | In Scope | The supplier round-trip through `ndc-core-service` (§B1), end to end |
| E2E | **Out of Scope** | Moved to `reissue-flow` by the 2026-09-27 split |
| Regression | **Out of Scope** | Moved to `reissue-flow` |
| DB | **Deferred** | No read-only DB access provided (user intake, 2026-09-26) |
| Security | **Out of Scope** | Not selected by the user at intake, 2026-09-26 |
| Performance | **Out of Scope** | Not selected by the user at intake, 2026-09-26 |

#### 1.1.1 The UI boundary between the two scopes

Both scopes use the UI layer. They ask different questions of the same screen, and neither answers the
other's:

| | `reissue-mapping` asks | `reissue-flow` asks |
|---|---|---|
| Of a **value** | Does this number come from the core field it should, unchanged? | Is this number the right number per the business rule? |
| Of a **label** | Does the label name the same concept as the field behind it? | Does the label say what the AC requires? |
| Of a **screen** | Are all its values accounted for — sourced or declared app-origin? | Does it appear, behave and validate correctly? |
| Of an **absence** | Is this core field deliberately not displayed? | Should this control be hidden here? |

**Worked example.** "Supplier fee: 0.00" on Review & Pay. This scope asks whether that `0.00` is core's
`penalty`, whether core's `penalty` is Sabre's `totalFee`, and whether "Supplier fee" denotes the same
concept as `penalty` — *whatever the right business amount is*. `reissue-flow` asks whether `0.00` is
the correct penalty for this fare. A wrong number with a perfect mapping fails only the second; a right
number read off the wrong field fails only the first.

**In practice:** this scope reads the screen, and never drives it beyond what is needed to reach the
value. Clicking, validation, eligibility rules and navigation are `reissue-flow`'s.

#### 1.1.2 The Itinerary screen — scope extension, 2026-09-30

**The mapping scope starts at re-shop.** Booking-details / Itinerary was explicitly excluded by the
user on 2026-09-28, and that still governs the **field-mapping** rows in §2.1–§2.2: this scope does not
re-derive the Itinerary's own values.

**Extended on 2026-09-30 (user):** a displayed value must also agree **across screens**, and the
Itinerary is one of the screens it must agree with. So the Itinerary is **in scope for cross-screen
consistency only** — Search, Review, Confirmation and Itinerary must show the same value for the same
thing — and remains **out of scope as a mapping source** in its own right.

| Question about the Itinerary | In scope here? |
|---|---|
| Does the Itinerary agree with Confirmation / Review / Search on the same value? | **Yes** — cross-screen consistency, `TestCases_ReissueMappingDisplayedValues.md` §4 |
| Does an Itinerary value trace to its own core field? | **No** — the scope starts at re-shop |
| Does the Itinerary screen behave, navigate and validate correctly? | **No** — `reissue-flow` |

This is why FINDING-R01 sits in `reissue-flow` and not here: the +2 h shift is the Itinerary rendering
its **own** value wrongly, and the reissue results grid and confirmation render the same core values
correctly (§2.1 A8/A8b). It reaches this scope only as a cross-screen **disagreement**.

### 1.2 The gate

**`reissue-flow` Stage 3 (Test Design) does not start until this scope's Discovery and Test Design are
approved.** The order was set by the user on 2026-09-27: *finish the mapping, then write the business
feature's test cases.*

The reason is practical, not procedural. A business test case asserting "the breakdown shows the fare
difference per passenger type" is worthless if `CHD` on the screen is not the same population as
Sabre's `CNN` — the case would pass while the mapping is wrong, or fail for a reason that has nothing
to do with the business rule. Verifying the chain first means every later failure is a business
failure.

**What the gate now requires (OQ-M6, 2026-09-27).** Not a discovery write-up and a sample — this scope
produces **designed mapping test cases covering every rule in §2** (§2.4), executed, with every
condition either observed or recorded as a Declared Gap. `reissue-flow` Stage 3 starts when that suite
has run and been approved.

**There is no mechanical cross-scope gate in the platform.** This dependency is enforced by the two
contexts and by the business run's intake — not by the tooling. It is stated here so it cannot be
lost.

## 2. In Scope for This Scope

Organised by hop. Every row is checked on all three questions of §1 — **provenance**, **key meaning**,
**value fidelity** — and a row is only complete when all three are answered. `Status` records how far
run-007 has actually got, which for most rows is "values equal, meaning not yet confirmed".

### 2.0 What counts as a defect — the oracle

**There is no design document** (user, 2026-09-28). No artifact states what the Reissue screens
*ought* to show. The oracle is therefore **the UI as implemented**:

> The screen displays a value → the Portal API must supply it → the core service must supply it →
> the supplier must supply it.

Reasoning runs **backwards from the screen**. What the UI asks for defines the required field set;
everything upstream is justified by what the screen consumes. Nothing above the screen has an
independent claim to be displayed.

#### The four verdicts

| Situation | Verdict |
|---|---|
| The screen shows a value and the supplier sends a different one | **Defect** — the chain corrupted it |
| The screen shows a value that has no core or supplier source | **App-origin.** Correct when intended (the change fee, A5); suspect when not declared |
| **The backend returns a value and the screen does not display it** | **Flag** (user, 2026-09-28) — the UI asked, the data arrived, and it was dropped at the last step |
| Core or Sabre holds a field that never reaches the Portal response | **Not a defect.** Core is shared across four providers; what it republishes is its own contract's decision, which no screen governs |

The third row is the rule the user set: *raise a flag only when it returns from the backend and is
not displayed on the UI*. "Backend" means the **Portal API response** — the contract the screen
consumes. A field that stops earlier, in core or at Sabre, is out of the UI's reach and out of this
scope.

#### The limitation this carries

An oracle built from the implementation **cannot detect what was never built**. If a value ought to
be on screen and nobody implemented it, the screen never asks, nothing upstream is expected, and
nothing fails. Every finding this scope can produce is of the form *"what is displayed is wrong"* or
*"what arrived was dropped"* — never *"something is missing that should exist"*.

This is a deliberate, accepted boundary given no design exists. It is recorded so it is not
rediscovered later as a gap in the method.

### 2.1 Hop A — core service → Admin/Portal API → UI

| # | Screen value | Core-service field | Admin/Portal API field | Key-meaning check | Value-fidelity check | Status |
|---|---|---|---|---|---|---|
| A1 | Additional base fare | `offers[].modifyPrice.baseDifference` | `reissuePricing.additionalTotalBaseAmount` | Is "difference" on both sides the same base: new minus old, same fare component set? | currency, scale, **sign** | Values equal on 17/17 offers ×2 bookings. Meaning **unconfirmed** |
| A2 | Additional tax & fees | `modifyPrice.taxDifference` | `additionalTotalTaxesAndFeesAmount` | Does core's "tax" include fees, as the screen label claims? Which tax codes roll up here? | currency, scale, sign | Values equal. Roll-up composition **unknown** |
| A3 | Supplier fee | `modifyPrice.penalty` | `supplierPenalty` | Is core's `penalty` the airline's change penalty, and is that what "Supplier fee" means to a user? | scale, sign, zero vs empty | **Weak evidence — RSK-M5:** 0 on both sides for the booked flight. Non-zero values (6,487 / 9,989) seen on screen only |
| A4 | DUE NOW / Amount payable | `modifyPrice.totalPayable` | `reissuePricing.totalPayable` | Same key name, **different content**: Admin = core + `changeFee`. The identical name must not be read as an identity | arithmetic identity on every offer | Verified: Admin = core + changeFee, all offers |
| A5 | Change fee | **none — app-origin** | `reissuePricing.changeFee` | Declared app-origin (rule engine, D-7/D-11). Must never be assumed to come from core or the supplier | org fee × passenger count | Verified: 50×3=150, 100×4=400 |
| A6 | Currently ticketed · Total | `priceDetails.totalAmount` / `originalPaidAmount` | `priceDetails.totalOfferAmountRoundedUp` | The screen shows the **rounded-up** field, not the exact one. Is "currently ticketed" the exact paid amount or a rounded presentation? | rounding direction, float artefact | **Discrepancy — DS-M1/DS-M3, OQ-M1:** 15,577.40 vs 15,578.00; Portal API returns `15577.400000000001` |
| A7 | Breakdown per passenger type | per-passenger breakdown (`ADT`/`CHD`/`INF`, `quantity`) | `passengerFareBreakdowns[]` | Is each figure per passenger or per group? Same population per type on both sides? | per-passenger vs per-group | Same types and counts. Group figures confirmed **per passenger** (2 ADT × 121.80 = 243.60) |
| A8 | Result flight times · **Departure Date-Time** | `flightSegments[].departureDateTime` | `segments[].departureDateTime`; itinerary `deptTime` / `departureDate` | Is the core value local-airport time or UTC, and does the UI read it as the same kind? | **time zone**, offset | Equal at the API. **Itinerary renders +2 h — FINDING-R01, OQ-M2.** Corrupting hop **located 2026-09-27**: booking-details itinerary page only; the reissue results grid and the confirmation page render the same values correctly |
| **A8b** | **Result flight times · Arrival** | **`flightSegments[].arrivalDateTime`** | **`segments[].arrivalDateTime`** | Same rule as A8, same question — the sibling field in the same object, displayed on the same offer card | **time zone**, offset | **Added 2026-09-28** — omitted until then although §1 requires every displayed value to be mapped. **Equal at the API** (results grid renders core's value correctly, as A8 does). Separately, the out-of-scope booking-details Itinerary shifts it +2 h exactly as it shifts departure (09:20→11:20, 14:15→16:15) — that is FINDING-R01's footprint, not a reshop mapping defect |
| A9 | Reissue availability | `eligibility` response | `actionsDetails.canAutoReissue` | Does core's "changeable" mean the same as the app's "can auto reissue"? They are not obviously the same predicate | boolean polarity | **Suspect — RSK-M3:** core answered 200 "changeable" for a nonsense credential (`ZZZZ`) |
| A10 | Wallet · Your Balance | — (financial service) | `/v2/financial/financial-details` | **Answered 2026-09-30.** Admin = `topUpBalance` + `paymentSetting.creditLimit` (9,999,999 on AGN9780, matching the channel gap exactly); Portal = `topUpBalance` only, payload carries `creditLimit: null`. **Intended — the `creditAgency` flag scopes the agency channel only (§2.5).** | channel difference is **by design, never a defect**; Portal renders 3 decimals in `balance-amount`, 2 on Review & Pay (**FINDING-R17**) | **Closed — one defect raised, one withdrawn** |
| A11 | Review & Pay lines | `newOffer` / `currentOffer` | `/v2/reissue/{ref}/review` | Does each review line mean what its label says | per line | Line-by-line table captured; meanings **unconfirmed** |
| A12 | **Returned but not displayed** | any field **the Portal response returns** that the screen does not render | — | The UI asked for it and the data arrived — dropping it at the last step is a defect. A field that never reaches the Portal response is **out of scope** (§2.0) | — | **The one omission this oracle can catch.** Rule set by the user 2026-09-28; not yet swept |

### 2.2 Hop B — Sabre (supplier) → core service

| # | Core field | Sabre field | Key-meaning check | Value-fidelity check | Status |
|---|---|---|---|---|---|
| B1 | `modifyPrice.baseDifference` | `offers[].totalPriceDifference.baseFare` | Sabre says "baseFare", core says "baseDifference" — a *fare* and a *difference* are not the same noun. Confirm Sabre's field is already a delta | scale, sign | Values equal, 17/17 ×2. Naming mismatch **unresolved** |
| B2 | `modifyPrice.taxDifference` | `totalPriceDifference.totalTax` | Same: "totalTax" vs "taxDifference". Does Sabre send the delta or the new total? | scale, sign | Values equal. Naming mismatch **unresolved** |
| B3 | `modifyPrice.penalty` | `totalPriceDifference.totalFee` **+ `.totalTaxOnFee`** | **Resolved by the Sabre spec (2026-09-27).** `totalTaxOnFee` is its own quantity — *"The total amount of tax on change fees"* — and `totalFee` lists *"total change **or penalty** fees"*. Summing them is **semantically correct**, not an invention. Note the shape differs by level: `TotalPrice.totalFee` is a **string**, `ExchangeTicketCharge.totalFee` is an **`ExchangeFee` object** holding `fees[]` — structural, confirmed in the spec | **empty string → 0** mapping; whether `totalTaxOnFee` is ever non-zero on this host | **No longer disputed** — DS-M4 resolves in the field map's favour. Still only ever observed at **0** at every layer; needs a non-zero penalty to evidence (OQ-M10) |
| B4 | `modifyPrice.totalPayable` | `totalPriceDifference.grandTotal` | **`totalPayable` = `grandTotal`** — stated by the user, 2026-09-27, and corroborated by run-007 (equal on 17/17 offers × 2 bookings, twice). The field map describes a per-fare-group formula instead; the two **agree** while `e3-correction-enabled` is off and groups price alike (DS-M4) | equality holds; **diverges only if the E3 correction is switched on** | **Confirmed as a straight mapping** for the current configuration. Verify `e3-correction-enabled = false` on `.60` — that is the condition the equality rests on |
| B5 | Passenger-type codes `ADT`/`CHD`/`INF` | fare groups per PTC `ADT`/`CNN`/`INF` | **`CNN` → `CHD` is a re-coding.** Same population, or does Sabre's CNN span an age range the app splits differently? | per-passenger `grandTotal` | Codes map; population equivalence **unconfirmed** |
| B6 | Segment departure times | `getBooking` / `flightReshop` segment times | Local-airport time or UTC at the supplier? | time zone | Supplier and core **agree** — which places FINDING-R01's corruption downstream of core |
| B7 | `originalPaidAmount` | paid base/tax per ticket | Is "original paid" the ticketed fare or the fare plus every collected charge? | exactness | 15,577.40 / 22,848.20 — exact at supplier and core |
| B8 | Ticket / coupon status | `getBooking` TE, coupons `I` (open) | Does the app's `BOOKED` correspond to this supplier state? | — | Consistent; correspondence **not formally mapped** |
| B9 | **Negative differences** | Sabre returns negatives for cheaper fares — the spec's **own examples** carry `"grandTotal": "-1539.40"` | Does core preserve, clamp or reject a negative? A refund is a **documented, typed state**, not an edge case | **sign handling** | **Never exercised — RSK-M2, OQ-M4.** The highest-risk unmapped path, and the spec confirms it is a normal supplier answer |
| **B11** | **— (not in the field map)** | **`ExchangeCharge.type`** — `ExchangeChargeTypeEnum`: `Add collect` · `Even` · `Refund` · `Unknown` (default `Unknown`) | **The supplier's own statement of which case this offer is.** *"Identifies the type of `grandTotal` charge"* — it disambiguates a payment from a refund from a no-cost change without inferring from the sign | — | **Newly identified (2026-09-27).** The field map lists no core field reading it, so it is a candidate **dropped field** (OQ-M9). If core does not read it, the app is inferring Add-collect-vs-Refund from arithmetic where the supplier states it outright |
| B10 | **Sabre fields core does not republish** | any Sabre field absent from core's response | Core is shared across four providers; what it republishes is **its own contract's** decision | — | **Not a defect source under §2.0.** Recorded for the contract owner, not tested here |

### 2.3 Chain-level checks

| # | Check | Status |
|---|---|---|
| C1 | End-to-end integrity: same offer count, same flights, equal amounts, Sabre → core → Admin → screen, in **paired runs within the same minute** | 17/17 on both bookings, twice (19:35/19:38, 20:13) |
| C2 | Portal/Admin parity: the same core offers surfacing identically on both channels, and where they legitimately differ | Portal 17/17, `totalPayable` = core + 150; re-proven 2026-09-27 headless |
| C3 | Stability: core values unchanged between paired captures, so a non-simultaneous comparison is interpretable | Unchanged across 19:35 and 20:13 |
### 2.4 Coverage model — every mapping rule, not a sample

**Decision (user, 2026-09-27):** *"we should design test cases that covered all the mapping."*

So this scope gets its **own Stage 3 Test Design**, and the unit of coverage is **not a booking or a
screen** — it is a **(mapping rule × condition) pair**. A rule is covered when every condition that
could break it has been observed, and `100%` means every row in §2.1–§2.3 is covered in that sense.

**Why the unit matters.** run-007 checked 17 offers × 2 bookings, twice — and still evidenced `penalty`
only at zero (RSK-M5). Thirty-four more offers on the same route would have added nothing. Coverage
counted in bookings hides that; coverage counted in conditions makes it the first thing you see.

#### The conditions each rule is exercised against

| Dimension | Values to cover | Rules it bears on |
|---|---|---|
| **Charge type** | `Add collect` · `Even` · **`Refund`** | B4, B9, B11, A4, DS-M5 |
| **Sign** | positive · **zero** · **negative**. A genuine negative is out of scope (OQ-M4), so the dimension is closed from the other side: **non-negativity is asserted as a standing invariant** on every offer, at offer level and per passenger type — TC-RMAP-056 / TC-RMAP-057, added 2026-09-30 | A1, A2, B1, B2, B9 |
| **Penalty** | zero · **non-zero** · `totalTaxOnFee` non-zero | A3, B3 |
| **Empty/null form** | Sabre empty string vs `0` vs absent | A3, B3, §1 q3 |
| **PTC mix** | ADT only · ADT+CHD · ADT+CHD+INF · **multiple ADT in different fare groups** | A7, B5, and the "first published for all" warning |
| **Tax lists** | codes present for one type and not another (the 2026-09-21 change) · **`XT` negative** | A2, the index-alignment risk |
| **Fare groups** | one · **several, priced unalike** · differing currency (the fallback) | B4, A4 |
| **Trip type** | one-way · round trip · multi-city | A8, journeys |
| **Cabin / route** | at least one beyond CAI→JED Economy | A1–A4, B1–B4 |
| **Rounding** | exact vs `…RoundedUp` · the float artefact | A6 |
| **Time zone** | browser at UTC · Africa/Cairo · Asia/Dubai | A8, B6 |
| **Absence** | a core field the design omits · a designed field the screen lacks | A12 |

#### What this does to the critical path

**Test data becomes the constraint, not effort.** Several conditions cannot be manufactured from the
two bookings we hold, and each maps to an open question:

| Condition | Needs | Status after run-007 | Question |
|---|---|---|---|
| `Refund` / negative | a booking whose re-shop is **cheaper** | **Still missing.** Ruled **out of scope** 2026-09-27 — core does not provide a cheaper re-shop. The non-negativity **invariant** is covered instead by TC-RMAP-056 / TC-RMAP-057 | **OQ-M4** (closed as out of scope) |
| Non-zero penalty | a fare carrying a real change penalty | **Still missing.** `penalty` is evidenced only at zero — RSK-M5 | **OQ-M10** |
| Several fare groups priced unalike | a party Sabre splits into unlike groups | **Still missing.** Declared Gap G2; the shape of FINDING-R08 | **OQ-M15** |
| Another cabin / route | any second route, any non-Economy cabin | **Route: supplied** (scenario 2, CAI→RUH). **Cabin: still missing** — Declared Gap G5 | **OQ-M15** |
| Multi-city, round trip | matching source bookings | **Supplied and exercised.** Round trip = scenario 8/8b (`QZTJRV`); multi-city = scenario 9 (`RPTIYO`, 6 pax). All three trip types now covered | **OQ-M15** — this part closed |
| More than one exchange rate | an agency on a second ROE | **Supplied.** ROE 9 (scenarios 6–10) and ROE 0.1 (scenario 10). *Dimension added by run-007; not in the original model* | — |
| Rule engine on vs off | an original ticket carrying markup/discount/service charge | **Supplied.** Scenario 8b and scenario 10, all three rules verified against configuration. *Dimension added by run-007* | — |

**Source bookings — what is still outstanding.** Narrowed by the user on 2026-09-27: **route and cabin
need no new booking**, they are varied in the re-shop widget on an existing one. Run-007 then supplied
the round-trip and multi-city bookings itself. What remains outstanding is listed in §5.1: a party
Sabre splits into unlike fare groups, a fare carrying a real change penalty, and a non-Economy cabin.

A condition with no data is **Not Testable**, recorded as a Declared Gap against the rule it would have
covered — never quietly dropped, and never reported as covered.

### 2.5 Confirmed behaviours — not defects, and never to be raised as one

Behaviours the human has confirmed are correct by design. A future run finding one of these must
record it as **expected**, not as a finding. Each states who confirmed it and when, so it can be
re-opened if the design changes.

| Behaviour | Confirmed |
|---|---|
| **The rule engine is not applied to a reissued ticket.** Markup, discount and service charge apply to the original ticket only. On an exchange the agency earns the change fee alone — `discountAmount`, `serviceChargeAmount` and any markup are `0` on the new offer, through search, Review and Pay, and the confirmation record. | User, 2026-09-29 |
| **The change fee is agency-configured and app-origin**, not supplied by Sabre. It is added after currency conversion. | User, 2026-09-28 |
| **The rate of exchange is a multiplier on the supplier amount** (1 EGP = 9 AED on the Emirates agency). A new rate applies to new prices only; an old ticket keeps the rate in force when it was issued. | User, 2026-09-29 · see `FINDING-R09_WITHDRAWN_CurrencyConversion` |
| **Offers with a negative base fare are filtered out by the core service.** A new implementation drops them; where every offer qualifies, the search returns `422 NO_EXCHANGE_OPTIONS_AVAILABLE`. | User, 2026-09-29 · see `FINDING-R11` |
| **The `creditAgency` checkbox scopes the agency channel only, never Admin.** Admin's "Your Balance" is `topUpBalance` + `paymentSetting.creditLimit`; the Portal's is `topUpBalance` alone and its payload carries `creditLimit: null`. The two channels bind different quantities under one label **by design** — never raise it. | User, 2026-09-30 · see `FINDING-R16_WITHDRAWN_AdminWalletCreditLine` |

**Evidence for the rule-engine row** — scenario 8b, booking `NDCEG-BR-F260929u1ptMk` → `NDCEG-BR-F260929pbzn43`:

| | Currently ticketed | New (reissued) offer |
|---|---|---|
| Discount, per passenger-type pair | 100.00 | **0** |
| Service charge, per passenger-type pair | 50.00 | **0** |
| Discount total | 300.00 | **0** |
| Service charge total | 150.00 | **0** |
| Markup | baked into base fare (89,676 net + 200 = 89,876 for two Adults) | **none** |
| Agency earnings | Total Profit 450.00 AED | **change fee 114.00 only**, on a 170,275.20 charge |

## 3. Out of Scope for This Scope

| Area | Why | Covered by |
|---|---|---|
| **AC-01 … AC-36 as business behaviour** | This scope checks the values are faithfully carried and correctly named, not that the rules behind them are right | `reissue-flow` |
| The Itinerary `Reissue` button, eligibility **rules**, CL-1 credential refusal, DS-2 | UI **behaviour**, not a displayed-value mapping (§1.1.1) | `reissue-flow` |
| Journey / passenger **selection behaviour** | UI behaviour. The *resulting* selection payload sent to core **is** in scope (§2.1) | `reissue-flow` |
| Screen navigation, validation messages, enable/disable states | UI behaviour | `reissue-flow` |
| Reports, PNR Query, Itinerary history | Regression layer | `reissue-flow` |
| Booking Confirmation & E-ticket UI | UI layer | `reissue-flow` |
| Clicking Pay / Exchange / Confirm; `/exchange` on core; Sabre `exchange`/`fulfillFlightTickets` | **Forbidden.** The user does Pay/Exchange by hand (D-1) | User (manual), verified read-only afterwards |
| Supplier-specific behaviour of NDCsbr, Galileo, TravelportNdc | Shared scope on Sabre. Supplier runs come later | Future Supplier scopes under `reissue` |
| DB persistence (AC-26, AC-30, story §5.5) | DB `Deferred` — no access | Declared Gap; **OQ-M5** |

## 3.1 Reference sources — the authority for key meaning

§1 question 2 (**key meaning**) cannot be answered from observed values; it needs each layer's own
documentation. These are the sources of truth for this scope.

### Supplier — Sabre (supplied by the user, 2026-09-27)

**Status: on disk (2026-09-27).** All three OpenAPI specs are saved under
`knowledge_base/requirements/specifications/supplier_apis/sabre/`:

| Spec file | Size | Format | Covers | Used for |
|---|---|---|---|---|
| `FlightReshop_1.0.spec.yml` | 336 KB | OpenAPI 3.0.3 | `flightReshop` | **Hop B primary.** `ExchangeCharge`, `ExchangeTicketCharge`, `TotalPrice`, `ExchangeFee`, `ExchangeValue`, `ExchangeTax`, `ExchangeChargeTypeEnum`, PTC codes — B1–B5, B9, B11 |
| `ExchangeBooking_1.1.0.spec.yml` | 170 KB | OpenAPI 3.0.0 | exchange | Exchange-outcome field meaning. **The platform never calls this endpoint** (Forbidden) — read as documentation only |
| `BookingManagement_v1.spec.yml` | 430 KB | Swagger 2.0 | `getBooking`, fulfil | `getBooking` fields behind B6–B8. Fulfil is **never called** |

**How they were obtained, so this is repeatable.** The public `/rest-api/…` links are SPA routes: every
one of them — `index.html` and `spec.yml` alike — returns the same ~12 KB Next.js shell titled
"Developer Hub" to `curl`, to a fetch, and to **Save Page As**. The page renders client-side, so only a
real browser produces content. Driving it with Playwright and reading its resource timings exposed the
actual endpoint:

```
https://developer.sabre.com/api/v1/products/<product-path>/_attachments/spec.yml
```

That URL returns the raw YAML to a plain `curl`, no login. **OQ-M11 closed.**

### The approved UI design — the oracle for hop A omissions

| Doc | Status |
|---|---|
| The approved Reissue screen design | **Does not exist** (user, 2026-09-28). The implemented UI is the oracle — §2.0 |

**Superseded 2026-09-28.** An earlier revision recorded *"what the screen needs, we have approved on
the design"* and treated an approved design as hop A's oracle. **The user has since clarified that no
design document exists:** *"the ui implemented is the source of truth... we see what the ui is trying
to display and call the core service to provide the data, and the core service calls the supplier."*

The oracle is therefore the **implemented UI**, and the defect rule is the one in **§2.0**: a flag is
raised only when the backend returns a value and the screen does not display it.

**Hop B is unchanged by this.** Core is a shared service across four providers; what it republishes
from Sabre is its own contract's decision, which no screen governs. B10/B11 remain questions for the
core-service contract owner, not defects of this scope.

### Core service — `ndc-core-service`

| Doc | Status |
|---|---|
| core-service API documentation | **Awaited** — the user undertook to supply it (2026-09-27) |

**Both ends are required.** Hop B's key-meaning questions compare a Sabre definition against a core
definition; a Sabre doc alone answers only half of each. Hop A likewise needs the core-service doc
against the Admin/Portal API and the screen labels.

## 4. Roles & Credentials Required

| Role / key | Purpose | Source |
|---|---|---|
| `CORE_SERVICE_STG` | core service staging `/api/v1/reissue` — `providers`, `eligibility`, `reshop` **only** | `knowledge_base/credentials/credentials.json` (git-ignored) |
| `SABRE_CERT` | Sabre CERT REST, PCC EZ4K — `getBooking`, `flightReshop` **only** | same |
| `ADMIN_60` | Admin API/screen side of the chain | same |
| `PORTAL_60` | Portal API/screen side (AGN9780) | same |

## 5. Environment Constraints

| Constraint | Implication | Source |
|---|---|---|
| **Paired runs must be close in time** | Supplier prices move. A core-vs-screen comparison is only valid when both are captured in the same minute; a 4-hour gap is evidence of stability, not equality | Chain doc (19:35/19:38, 20:13, 21:32/21:34) |
| **Read-only calls only** | core: `providers`/`eligibility`/`reshop`. Sabre: `getBooking`/`flightReshop`. `/exchange` and ticketing are never called | Grants `AUTH-CORESERVICE-READ-DedicatedTestData`, `AUTH-SABRE-READ-DedicatedTestData` |
| Real supplier calls on a shared `.60` environment | Keep re-shop volume minimal; reuse captured responses where possible | D-3 |
| No DB access | Persistence-side mapping cannot be checked at all | `run.json` |
| Headed or headless | Ask before every execution | Standing user rule |
| Do **not** use `NDCEG-BR-F260916ENYOeQ` | Exchanged directly through the core service outside the app (C-5); its Itinerary is stale | C-5 |

### 5.1 Test data still outstanding

Every row here is a **Declared Gap**, not a deferred nicety: a condition with no data is recorded as
Not Testable against the rule it would have covered, never quietly dropped and never reported as
covered. *(This section replaces the §5.2 that earlier revisions referenced and never created.)*

| Needed | Attributes | Blocks | Gap |
|---|---|---|---|
| A party Sabre splits into **unlike fare groups** | one booking, several adults Sabre prices differently | TC-RMAP-008 | **G2** |
| A fare carrying a **real change penalty** | any route/fare where Sabre returns a non-zero `totalFee`, ideally with `totalTaxOnFee` non-zero | TC-RMAP-003, TC-RMAP-005 | **G4** |
| A **non-Economy** cabin | any cabin above Economy on any route | TC-RMAP-047 | **G5** |
| A **negative `XT`** tax | any offer where Sabre emits one | TC-RMAP-017 | **G3** |
| Sabre emitting an **empty string** for the fee | rather than `0` or an absent field | TC-RMAP-005 | **G7** |
| Browser forced to **UTC / Africa/Cairo / Asia/Dubai** | an environment setting, not a booking | TC-RMAP-027 | **G6** |
| `logs/detail.log` | read access on `.60` | TC-RMAP-054 | **G8** |

**Not outstanding any more** — supplied by run-007 itself: round trip (scenario 8/8b), multi-city
(scenario 9), a second route (scenario 2), a second exchange rate (scenario 10), and an original
ticket carrying all three rule-engine values (scenarios 8b and 10).

## 6. Assumptions & Risks

| ID | Type | Statement | Source |
|---|---|---|---|
| ASM-M1 | Assumption | The core service is the only path between the app and Sabre for reissue — the app never calls the supplier directly | Feature registry `integrationLayer` |
| ASM-M2 | Assumption | `changeFee` is the **only** amount the application adds to the core figures | Verified on every observed offer; D-7, D-11 |
| RSK-M1 | Risk | Equality proven on 2 bookings × 17 offers on **one** route (CAI→JED, Economy) and one supplier. A mapping defect on another PTC mix, cabin or route would not have been seen | Chain doc |
| RSK-M2 | Risk | **No negative fare difference has been exercised.** The Sabre spec's **own examples** carry `"grandTotal": "-1539.40"`, and `ExchangeChargeTypeEnum` makes `Refund` a **documented, typed state** — so this is a normal supplier answer, not an edge case. The sign-handling hop is unverified, D-9 makes a negative on screen a defect, and B11 shows there is a supplier field stating the case that core may not read | C-7; spec; B11 |
| RSK-M3 | Risk | Core `eligibility` accepted a **nonsense credential** (`ZZZZ`) with the same 200 "changeable" answer as the real one. If core is not validating the credential, an app-side mapping error would be invisible here | C-4 |
| RSK-M4 | Risk | Without DB access, the persistence end of the chain is unmapped: whether the difference-based amounts survive the write is unknown | AC-26; OQ-M5 |
| **RSK-M5** | Risk | **Equality on a zero proves nothing.** `penalty` / `supplierPenalty` was `0` at supplier, core and screen for both booked flights, so the whole `totalFee` → `penalty` → "Supplier fee" path is evidenced only at zero. The non-zero values seen on screen (6,487 / 9,989) were never traced back through core to Sabre | §2 A3, B3 |
| **RSK-M6** | Risk | **Field names disagree across every hop** — `baseFare`→`baseDifference`, `totalTax`→`taxDifference`, `totalFee`→`penalty`, `CNN`→`CHD`, and `totalPayable` meaning two different aggregates on either side of hop A. Each was accepted on numeric equality alone; none has a confirmed semantic equivalence | §2 A1–A4, B1–B5 |
| **RSK-M7** | Risk | **No field inventory exists.** Neither hop has an enumerated list of upstream fields, so a field silently dropped by core or never surfaced by the UI would not be noticed — the checks so far all start from a value that *is* displayed | §2 A12, B10 |

## 7. Traceability Anchor

| Item | Section | Source |
|---|---|---|
| Hop A field mapping (core → API → UI) | §2.1 A1–A11 | `CoreService_vs_Screen_run-007.md` "Field mapping (verified)" + Review & Pay table |
| Hop B field mapping (Sabre → core) | §2.2 B1–B8 | same, "Supplier layer" table |
| Rounding / precision | §2.1 A6 | C-3 |
| Time transport | §2.1 A8, §2.2 B6 | FINDING-R01; C-2, C-6 |
| Portal parity | §2.1 A10, §2.3 C2 | Portal layer table |
| Sign handling (negatives) | §2.2 B9 | C-7 |
| Returned-but-not-displayed sweep | §2.0, §2.1 A12 | **Not yet swept** — the only omission check this oracle supports |
| Chain integrity, paired runs | §2.3 | `CoreService_vs_Screen_run-007.md` |
| Layer scope | §1.1 | `run.json` `testingLayerScope` (post scope-change) |

**Business ACs that depend on this scope.** These are owned and tested by `reissue-flow`; they are
listed here because a mapping defect makes them untestable rather than failing:

| AC | Depends on | §2 row |
|---|---|---|
| AC-05 | Eligibility mapping | 2 |
| AC-14 | Fare-difference mapping | 4 |
| AC-15 | Sign handling across the chain (**unverified** — RSK-M2) | 4, 7 |
| AC-16, AC-17 | Passenger-type and component mapping | 4, 6 |
| AC-22 | Reprice response mapping | 11 |
| AC-23 | Supplier round-trip | 1 |

## 8. Open Questions

| # | Question | Affects |
|---|---|---|
| **OQ-M1** | **Which total is "currently ticketed"?** Core and Sabre say 15,577.40; the screen shows `totalOfferAmountRoundedUp` 15,578.00 on both Admin and Portal, while the line items add to the exact figure. The Admin and Portal Itinerary APIs also disagree (15578 vs 15577.400000000001). Is rounding-up intended, and is the float artefact a defect? | §2 row 8; C-3 |
| **OQ-M2** | **Is the time shift a mapping defect?** The Itinerary shows departures 2 h later than the supplier's own PNR, while supplier and core agree. FINDING-R01 step 6 (browser forced to UTC / Asia/Dubai) is still unrun and would locate the hop | §2 row 9; FINDING-R01 |
| **OQ-M3** | **Should core validate the credential?** `eligibility` answered 200 "changeable" for credential `ZZZZ`. Is this correct by design, or a contract defect? | RSK-M3; C-4 |
| ~~OQ-M4~~ | **CLOSED 2026-09-27 (user): the core service does not provide a cheaper/refund re-shop, so it is OUT OF SCOPE.** The `Refund` path is not tested at any layer. See DS-M5 for what this does and does not settle. | §3 |
| **OQ-M5** | **Read-only DB access** — the persistence end of the chain. Same question as `reissue-flow` OQ-9; one answer settles both | RSK-M4 |
| ~~OQ-M6~~ | **CLOSED 2026-09-27 (user): “we should design test cases that covered all the mapping.”** Sign-off is **not** a sample. Every mapping rule in §2 gets designed test cases covering the conditions that could break it — the coverage model is §2.4. RSK-M1 is answered by design rather than accepted. | §2.4 |
| ~~**OQ-M7**~~ | ~~**Wallet balance by channel.**~~ **CLOSED 2026-09-30 — intended behaviour.** The 9,999,999.00 channel gap is the agency's `paymentSetting.creditLimit` exactly; Admin adds it, the Portal does not, and the `creditAgency` flag scopes the agency channel only. Recorded in §2.5; `FINDING-R16` raised and **withdrawn the same day**. The 3-decimal rendering is a separable formatting defect and stands as **FINDING-R17**. | §2 A10 · §2.5 · `evidence/wallet-OQM7-reproduction.json` |
| ~~OQ-M8~~ | **CLOSED 2026-09-27 by the Sabre spec.** `totalFee` lists *"total change **or penalty** fees"*; `totalTaxOnFee` is *"The total amount of tax on change fees"* — so core's `penalty = totalFee + totalTaxOnFee` is correct (B3). `grandTotal` is *"The complete cost or refund value"* and `subtotalBeforeFee` is *"with any change fees excluded"* — so `totalPayable = grandTotal` agrees with Sabre's own definition (B4). `passengerTypeCode` is *"The ATPCO code of the passenger type"*, pattern `^[0-9A-Z]{3}$` — Sabre states the code, it does not define the population, so **`CNN` vs `CHD` remains a re-coding to verify at hop A, not hop B**. | — |
| ~~OQ-M9~~ | **LARGELY DISSOLVED 2026-09-28 by the new oracle (§2.0).** With no design, *"is this omission deliberate?"* is neither answerable nor necessary: a field the screen never asks for is simply not in scope, and core's unsurfaced fields are its own contract's business. What survives is narrower and checkable — **anything the Portal response returns that the screen does not render is a flag** (user, 2026-09-28). The upstream diff of Sabre vs core is no longer a defect source. | §2.0; §2.1 A12; §2.2 B10 |
| ~~OQ-M14~~ | **CLOSED 2026-09-28 — there is no design document.** *"the ui implemented is the source of truth, we have no documentation for design; we see what the ui is trying to display and call the core service to provide the data, and the core service calls the supplier"* (user). The oracle is the implemented UI — see §2.0. This question is answered, not deferred: no artifact is awaited. | §2.0 |
| **OQ-M10** | **Non-zero penalty test data.** A booking whose re-shop carries a real supplier penalty, so the `totalFee` → `penalty` → "Supplier fee" path is evidenced at something other than zero | RSK-M5; §2 A3, B3 |
| ~~OQ-M11~~ | **CLOSED 2026-09-27.** All three OpenAPI specs are on disk — see §3.1 for the real endpoint and how it was found. | — |
| ~~OQ-M12~~ | **CLOSED 2026-09-27.** The core-service field map was supplied and saved as `CoreService_SabreAtpco_ReissueFieldMap.md`. | — |
| **OQ-M15** | **Source bookings for the coverage model.** Consolidates the test data §2.4 needs. **Partly closed by run-007**, which supplied round trip, multi-city, a second route, a second exchange rate and a rule-engine-bearing ticket. What remains is enumerated in §5.1 — unlike fare groups, a real change penalty, a non-Economy cabin, a negative `XT`, and an empty-string fee. | §2.4; §5.1; RSK-M1 |
| **OQ-M13** | **Does the core service read `ExchangeCharge.type`?** **Answered on the wire (2026-09-28): it does not.** The field is absent from every core response, and the field map lists no core field carrying it. Sabre stated `"Add collect"` on **all 50** offers of scenario 2. **Under the §2.0 oracle this is NOT a mapping defect** — no screen displays an add-collect/refund/even label, so the UI never asked for it, and core is shared across four providers. It stays recorded as an observation: the app infers from the sign of an amount what the supplier declares in a typed field, which also leaves `Even` and `Unknown` (the enum default) indistinguishable. Open only as a question for the core-service contract owner. | §2.0; §2.2 B11; RSK-M2; DS-M5 |

## 9. Discrepancies Between Sources

| # | Discrepancy | Handling |
|---|---|---|
| DS-M1 | Core/Sabre exact total against the screen's rounded-up total (15,577.40 vs 15,578.00) | **Pending Confirmation** — OQ-M1. Not called a defect until the intended behaviour is known |
| DS-M2 | Supplier PNR departure 06:05, re-shop 06:10, Itinerary 08:10 — two separate differences (a 5-min schedule change not reflected, and a +2 h shift) | The +2 h is FINDING-R01. The unreflected schedule change is a **second, distinct** observation and needs its own finding if it reproduces |
| DS-M3 | Admin Itinerary API `15578` against Portal Itinerary API `15577.400000000001` for the same booking | **Pending Confirmation** — OQ-M1. The float artefact suggests the Portal returns the raw value and Admin a pre-rounded one |
| DS-M4 | **The field map contradicts itself on `offers[].modifyPrice`.** Its heading reads *"the difference alone — **every figure read, not derived**"*, while two of its own rows under that heading are badged **Derived here** with formulas: `penalty` = `totalFee + totalTaxOnFee`, and `totalPayable` = Σ per fare group `(grandTotal − E3 overstatement) × passenger count`. A third, `totalPayableWithoutPenalty`, is badged "Derived here" but carries `data-origin="supplier"` in the page source. | **`totalPayable` is settled: it equals `grandTotal`** (user, 2026-09-27; run-007 evidence agrees on 17/17 offers × 2 bookings, twice). The formula and the equality are **not in conflict** — Sabre states `grandTotal` per fare group as a per-passenger figure, so summing `group × count` reproduces the offer-level `grandTotal` exactly. **They diverge in one case only: when `providers.sabre-atpco.e3-correction-enabled` is `true`**, which subtracts the E3 overstatement. So `totalPayable = grandTotal` is the expected mapping rule **for this environment**, conditional on that flag being off — which Stage 2 verifies. **`penalty` is now resolved too (2026-09-27):** the Sabre spec defines `totalTaxOnFee` as *"The total amount of tax on change fees"*, a quantity distinct from `totalFee`, so core's `totalFee + totalTaxOnFee` is semantically right. It remains **unevidenced** rather than disputed — run-007 only ever saw zero (OQ-M10). The stale heading itself is a question for whoever generates the page. |
| DS-M5 | **Sabre can answer `Refund`; the flow may have nowhere to put it.** `ExchangeChargeTypeEnum` makes `Refund` a first-class supplier state and the spec's own examples carry `"grandTotal": "-1539.40"`. Meanwhile **D-9** (`reissue-flow`) rules that a negative fare difference must never appear, and **AC-15** requires negative prices not be returned. Those are consistent only if something upstream of the screen filters or refuses a Refund offer — and no core field in the field map carries the supplier's own `type` to decide on (B11). | **Resolved as a scope decision, not as a finding (user, 2026-09-27): the core service does not provide a cheaper/refund re-shop, so the path is out of scope.** D-9 therefore holds by construction rather than by a filter this run evidenced. **Two things this does not settle, recorded rather than pursued:** (1) Sabre's spec makes `Refund` a valid answer with negative examples, so what core does *if* Sabre returns one is untested — an out-of-scope path, not a proven-absent one; (2) B11 / OQ-M13 still asks whether core reads `ExchangeCharge.type` at all, which is how such an offer would be recognised. Carried as a **Declared Gap** on B9. |

---

## 12. Revision history

> Moved out of the header table on 2026-09-28. It previously lived inside the `Revision` cell as one
> continuous paragraph containing every past revision, which caused superseded statements to be read
> as current **twice in two days** — once on the penalty being "held disputed" (settled at Rev 6) and
> once on the two reference documents being "not yet readable" (both closed at Rev 6). The header now
> carries only the current revision; everything below is **history, not status**. Where a line here
> disagrees with the tables above, **the tables win**.

| Rev | Date | Change |
|---|---|---|
| **13** | 2026-09-30 | **The Itinerary is brought into cross-screen consistency scope** (user) — §1.1.2 added, drawing the line between *agrees with the other screens* (in scope) and *traces to its own core field* (out of scope, the scope still starts at re-shop). **A non-negativity invariant is added to the coverage model** and to the suite as TC-RMAP-056 / TC-RMAP-057 (user request): core must never return a negative base, tax, penalty or total, at offer level or per passenger type — closing the Sign dimension from the side that *is* testable, since a genuine negative is out of scope. **Three defects in this document repaired:** §2.4's conditions table had a row spliced into another row's cell and was unreadable; §5.2 was referenced twice and never existed (now §5.1, test data still outstanding); OQ-M15 was cited four times and never defined. §2.4 also now records which conditions run-007 itself supplied — round trip, multi-city, a second route, a second exchange rate, a rule-engine-bearing ticket — rather than still listing them as needed. |
| **12** | 2026-09-28 | **The oracle is restated: there is no design document; the implemented UI is the source of truth** (user). §2.0 added — reasoning runs backwards from the screen, and a flag is raised **only when the backend returns a value and the screen does not display it** (user). The design-document question closes as answered, not awaited. The field-inventory question largely dissolves: a field the screen never asks for is out of scope, and core's unsurfaced fields are its own contract's business. The charge-type question is answered on the wire — core does not read it — and downgraded from candidate defect to observation. The omission-blindness limitation of an implementation-derived oracle is recorded explicitly. This history section created. |
| **11** | 2026-09-28 | **A8b added**: `arrivalDateTime` was a displayed value with no mapping row. A8 restated to name its field explicitly and to record that FINDING-R01's corrupting hop is **located** — the booking-details itinerary page alone; the reissue results grid and the confirmation page render the same values correctly. (A8b was re-anchored the same day from the itinerary to the results grid, once the user set the scope as starting at reshop.) |
| **10** | 2026-09-27 | **D-M1**: the exchange is a **handoff** — the platform stops at the Exchange control and the human clicks it, then the platform verifies read-only from the PNR and `logs/detail.log`. The drafted v2 safety-policy amendment was reverted unused; all booking/financial prohibitions stay absolute. |
| **9** | 2026-09-27 | User answers on test data: **Refund/negative OUT OF SCOPE** (core does not provide it; OQ-M4 closed; DS-M5 resolved as a scope decision with two declared gaps); route/cabin varied in the widget, no new booking needed; §5.2 states the source bookings are still required. |
| **8** | 2026-09-27 | **OQ-M6 closed**: full coverage by design, not a sample (user). §2.4 coverage model added — the unit is a (mapping rule × condition) pair. OQ-M15 consolidates the test data it needs. The gate in §1.2 now means designed-and-executed mapping test cases. |
| **7** | 2026-09-27 | OQ-M9 settled as "the approved design is the oracle for hop A omissions"; OQ-M14 added for the design document itself; OQ-M13 scoped to hop B; DS-M5 raises the `Refund` / D-9 collision. **All superseded at Rev 12** — no design document exists. |
| **6** | 2026-09-27 | The three Sabre OpenAPI specs downloaded and saved; **OQ-M8, OQ-M11 and OQ-M12 closed**; the B3 dispute resolved in the field map's favour; new row B11 (`ExchangeCharge.type`) and OQ-M13; RSK-M2 strengthened. |
| **5** | 2026-09-27 | Core-service field map received and saved as a traceable extract; B3/B4 reconciled against it; **`totalPayable` = `grandTotal`** confirmed by the user; `penalty` held disputed at this point (**resolved one revision later, at Rev 6**); DS-M4 records the field map's internal contradiction. |
| **4** | 2026-09-27 | §3.1 Reference sources added: the three Sabre API docs supplied by the user, plus the awaited core-service doc. OQ-M11/OQ-M12 recorded that neither was yet readable — **both closed at Rev 6**. |
| **3** | 2026-09-27 | **UI returned to In Scope**: the screen is the terminal layer of hop A, with the UI boundary between the two scopes set out in §1.1.1; run-007 layer scope corrected by a second `scope-change`. |
| **2** | 2026-09-27 | §1 restated as the two mapping hops with the provenance / key-meaning / value-fidelity tests; §2 restructured into Hop A, Hop B and chain-level checks; RSK-M5 … RSK-M7 and OQ-M8 … OQ-M10 added. |
| **1** | 2026-09-27 | Created by the scope split that divided `reissue-flow` into the mapping scope and the business-feature scope. |
