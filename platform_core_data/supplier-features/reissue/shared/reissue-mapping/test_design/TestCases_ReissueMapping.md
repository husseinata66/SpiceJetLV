# Manual Test Suite — Reissue Mapping

| Field | Value |
|---|---|
| Scope | Supplier Features → `reissue` → shared scope `reissue-mapping` |
| Scope family | `supplier-feature` · feature `reissue` · `sharedScope: reissue-mapping` |
| Produced by run | `reissue-run-001__2026-09-26_17-10-56__UserStory__ReissueFlowFromItinerary` |
| Revision | **2** (2026-09-30 — TC-RMAP-056 and TC-RMAP-057 added: a runnable non-negativity invariant on core amounts, at offer level and per passenger type. User request, 2026-09-30. Rev 1 = created) |
| Run Scope Type / Run Type | Feature (shared scope) / User Story |
| Project Context | `supplier-features/reissue/shared/reissue-mapping/context/ProjectContext.md` (Revision 12, status **Pending Review** — see the gate note below) |
| Discovery | `.../discovery/QA_Assessment_Report.md` (status **Pending Review**) |
| Total Test Cases | 57 |
| Generated | 2026-09-30 |
| Status | **Pending Review** — Stage 3 Human Review gate not yet held |

## 0. What this suite is, and how to read the Discovery column

The unit of coverage in this scope is a **(mapping rule × condition) pair**, not a booking and not a
screen (ProjectContext §2.4, user decision 2026-09-27). Every case below names the mapping rule or
rules it covers, in its **Notes**.

**Every case also records what Stage 2 Discovery already did with it.** That is the answer to
"what is verified and what is not yet executed":

| Discovery value | Meaning | Count |
|---|---|---|
| `EXECUTED` | Discovery ran this and it passed. The case still belongs in the suite as a regression guard. | 28 |
| `EXECUTED-DEFECT` | Discovery ran this and it **failed**. The case is the regression test for the named finding — it is expected to fail until the fix lands. | 14 |
| `PARTIAL` | Discovery ran it, but a named condition inside it is still unobserved. | 3 |
| `NOT EXECUTED` | Never run, but the data to run it exists or can plausibly be produced. | 5 |
| `NOT TESTABLE` | Never run and **no test data exists**. Recorded as a Declared Gap against the rule it would have covered, never quietly dropped. | 7 |

> **Case IDs are append-only.** A case added after Revision 1 takes the next free number and is
> placed in the section it belongs to, so its ID may not be in sequence with its neighbours.
> Existing IDs are never renumbered — the Coverage Report, the Traceability Matrix and every
> finding reference them.

> **`Review` and `Automation` are `Pending` on every case, without exception.** Stage 3 always writes
> `Pending`; only a human reviewer may change either value (`test-design-skill` §6.3). Nothing in this
> suite has been approved by generating it.

> **Gate note.** This suite was authored against a Project Context reading `Pending Review` and a
> Discovery report reading `Pending Review`. Neither upstream gate has been held. The suite is
> therefore **provisional**: if Revision 12 or the Discovery report changes at review, affected cases
> must be re-traced before approval. This is stated rather than assumed.

## 0.1 Execution safety — absolute

**No case in this suite authorises automation to click Pay, Exchange or Confirm & charge, or to call
`/exchange` or any ticketing endpoint.** Where a case requires a completed exchange, a human performs
the payment after the agent reports the exact flight and amount. This is not a convention; it is
`execution_safety_policy.json` and `pipeline.md` §14.

**Ask before every execution whether it runs Headed or Headless.** Never inferred, never carried over
from a previous run.

## 0.2 Two method rules that make or break an execution

1. **Paired capture.** Supplier, core and screen must be read inside one narrow window — supplier
   prices move between calls. A comparison across a four-hour gap is not evidence.
2. **Align offers by flight signature, never by array index.** Each layer calls Sabre separately and
   receives a different ordering. Index comparison produces false mismatches — see TC-RMAP-050.

## 1. Hop B — Sabre (supplier) → core service

### TC-RMAP-001 — Sabre baseFare carries to core baseDifference on every aligned offer

**Objective:** Verify the supplier's base-fare difference reaches the core service unchanged, for every offer in the set.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** Any reissuable booking. Record the capture window.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. For each aligned offer compare Sabre `totalPriceDifference.baseFare` with core `modifyPrice.baseDifference`.

**Expected Result:** Every aligned offer matches to the cent. The offer **counts** are equal at both layers. Any offer present at one layer and not the other is a failure, not a tolerance.

**Priority:** P1

**Tags:** Atomic, Positive, Contract

**Notes:** Mapping rule(s): `B1`. **Discovery: EXECUTED.** Discovery ran this on 17/17 offers x2 bookings and 18/18 on scenario 10 — zero mismatches. Evidence `s10-offer-comparison.json`.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-002 — Sabre totalTax carries to core taxDifference on every aligned offer

**Objective:** Verify the supplier's tax difference reaches the core service unchanged.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** As TC-RMAP-001.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Compare Sabre `totalPriceDifference.totalTax` with core `modifyPrice.taxDifference` per aligned offer.

**Expected Result:** Every aligned offer matches to the cent.

**Priority:** P1

**Tags:** Atomic, Positive, Contract

**Notes:** Mapping rule(s): `B2`. **Discovery: EXECUTED.** Discovery: zero mismatches across every offer compared. Evidence `s10-offer-comparison.json`.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-003 — Sabre totalFee carries to core penalty when a penalty exists

**Objective:** Verify a non-zero supplier change penalty reaches the core service unchanged.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** A booking on a fare that carries a real change penalty.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Compare Sabre `totalPriceDifference.totalFee` with core `modifyPrice.penalty` on an offer where the penalty is non-zero.

**Expected Result:** The non-zero penalty matches to the cent. A zero-only observation does **not** satisfy this case.

**Priority:** P1

**Tags:** Atomic, Positive, Contract

**Notes:** Mapping rule(s): `B3`. **Discovery: EXECUTED.** Discovery: 13,068.00 EGP identical at both layers on scenario 10. This closed risk RSK-M5, which had stood on zero-only evidence.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-004 — totalFee absent, not zero, when an offer carries no penalty

**Objective:** Verify the mapping survives the supplier **omitting** the fee key rather than sending zero.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** An offer set containing at least one offer with no change penalty.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Locate an offer whose Sabre `totalPriceDifference` has **no** `totalFee` key at all.
5. Read the corresponding core `modifyPrice.penalty` and the screen's Supplier fee.

**Expected Result:** core reports the penalty as `0`, and the screen shows `0.00`. Nothing throws, and the offer is not dropped from the set. **Code that assumes the key exists fails this case.**

**Priority:** P1

**Tags:** Atomic, Negative, Contract

**Notes:** Mapping rule(s): `B3`. **Discovery: EXECUTED.** Discovery observed exactly this on scenario 10 — 1 of 18 Sabre offers omitted `totalFee` entirely. Handled correctly.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-005 — Sabre returns an empty string rather than 0 or an absent fee

**Objective:** Verify the mapping handles the third empty form the supplier can emit.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** An offer where Sabre emits `""` for a fee or tax amount.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Compare the core value and the screen value for that field.

**Expected Result:** The empty string is treated as zero, not as `NaN`, not as the string `""` reaching the screen, and not as a dropped offer.

**Priority:** P2

**Tags:** Atomic, Negative, Boundary

**Notes:** Mapping rule(s): `B3, A3`. **Discovery: NOT TESTABLE.** **Declared Gap G7.** No offer emitting an empty string has been observed. Cannot be manufactured from held data.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-006 — Sabre grandTotal carries to core totalPayable

**Objective:** Verify the supplier grand total reaches the core service unchanged.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** As TC-RMAP-001.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Compare Sabre `grandTotal` with core `modifyPrice.totalPayable` per aligned offer.

**Expected Result:** Equal to the cent on every aligned offer.

**Priority:** P1

**Tags:** Atomic, Positive, Contract

**Notes:** Mapping rule(s): `B4`. **Discovery: EXECUTED.** Discovery: confirmed a straight mapping for the current configuration on all offers compared.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-007 — Passenger-type codes map ADT / CHD / INF with correct populations

**Objective:** Verify passenger-type codes and the **count within each type** both carry.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** A booking with 2 Adult + 2 Child + 2 Infant.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. For each type compare the code and `numberOfPassengers` at Sabre, core and the screen.
5. Confirm each type's per-passenger amount x count equals its group total.

**Expected Result:** Codes map one-to-one and each population is identical at all three layers. Group totals reconcile against per-passenger amounts.

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Mapping rule(s): `B5`. **Discovery: PARTIAL.** Discovery confirmed the codes and the 2+2+2 populations. **Population equivalence under a split fare group is still unconfirmed** — see TC-RMAP-008.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-008 — A party Sabre splits into several fare groups priced unalike

**Objective:** Verify the core service does not collapse unlike fare groups by applying the first group's fare to everyone.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** A party Sabre prices in two or more Adult fare groups with **different** taxes.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Count the Sabre fare groups for the Adult type and note each group's per-passenger tax.
5. Read the core per-type breakdown and the screen's per-type lines.
6. Sum the per-passenger figures and compare against the offer total.

**Expected Result:** Each distinct fare group is represented. The screen's per-passenger breakdown **sums to the total beside it**. The first group's tax is not multiplied by the full passenger count.

**Priority:** P1

**Tags:** Atomic, Negative, Regression

**Notes:** Mapping rule(s): `B5, A7, B4`. **Discovery: NOT TESTABLE.** **Declared Gap G2**, blocked by OQ-M10 / OQ-M15. This is the exact shape of FINDING-R08, which was found by inspection rather than by a controlled split party.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-009 — Segment departure and arrival times carry from Sabre to core

**Objective:** Verify the supplier's times reach the core service unaltered, establishing where any later shift originates.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** Any reissuable booking.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Compare Sabre `departureDate` + `departureTime` with core `flightSegments[].departureDateTime` for every segment of every aligned offer.

**Expected Result:** Times agree exactly. No offset of any size is acceptable.

**Priority:** P1

**Tags:** Atomic, Positive, Contract

**Notes:** Mapping rule(s): `B6`. **Discovery: EXECUTED.** Discovery: supplier and core agree exactly — which localises FINDING-R01's shift to the application layer.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-010 — originalPaidAmount matches the original ticket at supplier and core

**Objective:** Verify the value of the ticket being exchanged is carried correctly.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** A ticketed booking.

**Steps:**

1. Read the original ticket value from Sabre `getBooking`.
2. Read the core service's `originalPaidAmount`.
3. Compare.

**Expected Result:** Exact match.

**Priority:** P2

**Tags:** Atomic, Positive

**Notes:** Mapping rule(s): `B7`. **Discovery: EXECUTED.** Discovery: 15,577.40 / 22,848.20 exact at both layers.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-011 — Ticket and coupon status per traveler after an exchange

**Objective:** Verify the supplier's post-exchange document state is complete for **every** passenger.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** A completed exchange and its GDS PNR.

**Steps:**

1. Call Sabre `POST /v1/trip/orders/getBooking` with the GDS PNR.
2. Group `flightTickets[]` by `travelerIndex`.
3. For each traveler list every document with its `allCoupons[].couponStatus`.
4. Confirm each traveler holds at least one document with **no** `Exchanged` coupon.

**Expected Result:** Every traveler holds three documents: the original with coupons `Exchanged`, a new ticket that is live, and an EMD. **A traveler whose only document has an `Exchanged` coupon is a Critical failure.** Note `ticketStatusName` reads `Issued` on the spent ticket too — coupon status is the deciding field, not ticket status. A gap in the ticket-number sequence is not by itself a failure.

**Priority:** P1

**Tags:** Atomic, Positive, E2E, Regression

**Notes:** Mapping rule(s): `B8`. **Discovery: EXECUTED-DEFECT.** **This case exists because of FINDING-R13.** Scenario 9 FAILED it — traveler 2 held only a spent ticket. Scenario 10 PASSED it. Scenarios 1, 2, 5, 6 and 8b predate the check and are unverified — Declared Gap G9.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-012 — Negative difference — the re-shop is cheaper than the original ticket

**Objective:** Verify the entire chain under a **Refund** charge type, the one path never exercised.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** A booking whose re-shop returns a cheaper replacement — needs a fare/route where this occurs.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Confirm Sabre `totalPriceDifference.type` reads `Refund` (or the even-money equivalent).
5. Compare base, tax, penalty and total across all three layers, **including the sign**.
6. Read the screen: what is presented where an amount would normally be payable.

**Expected Result:** The negative sign survives every hop. The screen states a refund or an even exchange rather than a payable amount, and never renders a negative as a positive charge. The change fee's interaction with a refund is explicit.

**Priority:** P1

**Tags:** Atomic, Boundary, Negative, Contract

**Notes:** Mapping rule(s): `B9, A1, A2, A4`. **Discovery: NOT TESTABLE.** **Declared Gap G1, blocked by OQ-M4. The highest-risk unmapped path in this scope — zero evidence exists.** Note the core service now filters negative-base-fare offers (ProjectContext 2.5), so this case must first establish whether a refund offer can reach the client at all.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-013 — An even exchange — zero difference

**Objective:** Verify the chain where the replacement costs exactly the same.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** A re-shop producing a zero difference.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Compare the total at all three layers and read the screen.

**Expected Result:** Zero carries as zero. The screen shows the change fee alone as payable, not a blank and not an error.

**Priority:** P2

**Tags:** Atomic, Boundary

**Notes:** Mapping rule(s): `B9, A4`. **Discovery: NOT EXECUTED.** Not executed. Add-collect only has been observed. Data may exist without a new booking — worth attempting in the re-shop widget before declaring it a gap.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-014 — Sabre fields the core service does not republish

**Objective:** Record which supplier fields stop at the core service, for the contract owner.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** Any offer set.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Diff the Sabre offer object's key set against the core offer object's key set.

**Expected Result:** The unpublished set is documented. **Under the oracle in ProjectContext 2.0 this is not a defect** — it is a contract observation. No case fails on absence alone.

**Priority:** P3

**Tags:** Atomic, Contract

**Notes:** Mapping rule(s): `B10`. **Discovery: EXECUTED.** Discovery recorded this. Deliberately not a defect source under the run's oracle.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-056 — No negative base, tax, penalty or total in any core offer — offer level

**Objective:** Assert as a standing invariant that the core service never returns a negative amount on a reissue offer, and distinguish *never produced* from *filtered out*.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** **None new required.** Every core re-shop capture already in `discovery/evidence/`, plus every capture a future execution produces.

**Steps:**

1. Enumerate `offers[]` in every core `POST /api/v1/reissue/reshop` response — the captures already on disk and each new one.
2. For every offer read `modifyPrice.baseDifference`, `modifyPrice.taxDifference`, `modifyPrice.penalty`, `modifyPrice.totalPayable` and `modifyPrice.totalPayableWithoutPenalty` where present.
3. Assert each is `>= 0`. **Record the representation as well as the value** — `0`, `"0"`, `""`, `null` or absent. A sign test applied to a string is not a sign test (ProjectContext §1 question 3).
4. Assert the components reconcile to the total **without any intermediate negative**: the total must be reachable by adding non-negative terms only, never by a negative component offsetting a larger positive one.
5. **Distinguish absence from filtering.** Within the same capture window, compare core's offer set against Sabre `POST /v1/offers/flightReshop`, aligned by flight signature. For every offer Sabre returned and core did not, record Sabre's `totalPriceDifference.grandTotal` sign and `ExchangeCharge.type`.
6. Repeat steps 2–4 on the surface response `POST /v2/reissue/{ref}/search`, so a negative introduced downstream of core is caught too.

**Expected Result:** No core offer carries a negative base, tax, penalty or total, and no total is composed from a negative component. Where core returned fewer offers than Sabre, every dropped offer is accounted for — and a dropped offer carrying a negative `grandTotal` is the ProjectContext §2.5 filter working **as designed**, recorded as such and **never** read as proof that a negative cannot occur. A negative reaching any client layer is a defect under `reissue-flow` D-9.

**Priority:** P1

**Tags:** Atomic, Negative, Boundary, Contract, Regression

**Notes:** Mapping rule(s): `B9, B1, B2, B3, B4, A1, A2, A4`. **Discovery: NOT EXECUTED.** Unlike TC-RMAP-012 this case **needs no new test data** — it is assertable retroactively against every capture already in `evidence/`, and thereafter on every offer any execution sees. It is the first case to assert ProjectContext §2.5's *"offers with a negative base fare are filtered out by the core service"*, which until now was a confirmed behaviour with nothing proving it holds. It complements rather than replaces TC-RMAP-012 (Gap G1, still blocked): a pass here is a **non-observation across the offers we get**, not evidence that the Refund path is handled — see the omission limitation in ProjectContext §2.0.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-057 — No negative amount per passenger type, and the per-type figures sum without one

**Objective:** Assert the same invariant at the granularity that can hide it — a positive offer total can conceal a negative on one passenger type or one tax code.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** **None new required.** The same captures as TC-RMAP-056. A party of mixed passenger types strengthens it; ADT-only still exercises the invariant.

**Steps:**

1. For every offer enumerated in TC-RMAP-056, read the core per-passenger-type breakdown (`ADT` / `CHD` / `INF` with `quantity`) and the corresponding `passengerFareBreakdowns[]` on the Admin/Portal response.
2. Assert every per-type base, tax and total is `>= 0` at **both** layers — including on offers whose offer-level total is positive.
3. Assert `Σ (per-type amount × quantity)` equals the offer-level amount, and that the equality is reached by adding non-negative terms only — never by one passenger type offsetting another.
4. Where the per-tax-code list is present, assert **no individual tax code carries a negative amount**, naming `XT` explicitly.
5. Repeat the assertions on the screen breakdown, so a negative introduced at render is caught.

**Expected Result:** Every per-passenger-type base, tax and total is non-negative at core, at the Admin/Portal API and on screen. The per-type figures sum to the offer total by addition of non-negative terms only. No tax code is negative.

**Priority:** P1

**Tags:** Atomic, Negative, Boundary

**Notes:** Mapping rule(s): `B9, B5, A7, A1, A2`. **Discovery: NOT EXECUTED.** Assertable retroactively against existing captures; no new booking needed. This is the granularity at which FINDING-R08 was found **by inspection** — two Adult fare groups merged, the first group's per-passenger tax multiplied by the full count — and a per-type sign-and-sum invariant catches that family mechanically instead. It reaches part of what TC-RMAP-008 cannot (Gap G2): a **sign** invariant needs no split party, though a **sum** invariant across unlike fare groups still does. The negative-`XT` assertion in step 4 is the runnable half of TC-RMAP-017 (Gap G3), which needs a negative `XT` to exist before it can be positively evidenced.

**Review:** Pending

**Automation:** Pending

## 2. Hop A — core service → Admin/Portal API → screen

### TC-RMAP-015 — Additional base fare reaches the screen at the configured rate

**Objective:** Verify the core base difference appears on screen converted by the agency's rate.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** An agency with a non-1 rate of exchange.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Read the screen's **Additional base fare** lines and the payload's `reissuePricing.additionalTotalBaseAmount`.
5. Confirm screen = core x `currencyRate`.

**Expected Result:** Equal to the cent on every offer. The rate applied is the one in the payload's `currencyRate`, not a hardcoded value.

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Mapping rule(s): `A1`. **Discovery: EXECUTED.** Discovery: verified at rate 9 and rate 0.1 on 18/18 offers.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-016 — Additional taxes reach the screen, and the per-code list sums to the total

**Objective:** Verify the tax total and its composition both survive.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** A booking with per-passenger-type tax code lists.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Read `reissuePricing.passengerFareBreakdowns[].taxesAndFees[]` per type.
5. Sum each type's codes and compare with that type's `additionalTotalTaxesAndFeesAmount`.
6. Sum the types and compare with the offer's additional tax total.

**Expected Result:** Each type's code list sums to its own total, and the types sum to the offer total. Codes present for one passenger type and absent for another is expected and must not break the roll-up.

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Mapping rule(s): `A2`. **Discovery: EXECUTED.** Discovery on scenario 10: Adult `XL 2.16 + E3 22.4 + IO 316.0 = 340.56`; Infant correctly lacks `IO` and `S4` and still reconciles.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-017 — A negative XT tax

**Objective:** Verify a negative tax component does not corrupt the roll-up or the index alignment.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** A fare carrying a negative `XT`.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Locate the negative component and follow it through core to the screen.
5. Re-sum the code list against the type total.

**Expected Result:** The negative component is carried with its sign and the totals still reconcile. No component is dropped or re-ordered.

**Priority:** P2

**Tags:** Atomic, Boundary, Negative

**Notes:** Mapping rule(s): `A2`. **Discovery: NOT TESTABLE.** **Declared Gap G3**, blocked by OQ-M15.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-018 — Supplier penalty is presented as its own line, not as tax

**Objective:** Verify the change penalty keeps its identity all the way to the customer-facing record.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** An offer with a non-zero penalty, taken through to a completed exchange.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. On Review & Pay read the **Supplier fee** line.
5. Complete the exchange (human-clicked).
6. Read `GET /v2/bookingConfirm/{orderId}` -> `invoiceInfo.totalTax` and the Confirmation screen.

**Expected Result:** The penalty is a distinct line on Review & Pay **and** in the confirmation record. `invoiceInfo.totalTax` must **not** equal additional tax + penalty. The e-ticket must not describe a change penalty as Taxes.

**Priority:** P1

**Tags:** Atomic, Negative, Regression

**Notes:** Mapping rule(s): `A3, R03`. **Discovery: EXECUTED-DEFECT.** **FAILS today — FINDING-R03.** Review & Pay shows it correctly as Supplier fee; `invoiceInfo` folds it into `totalTax` (scenario 10: 714.68 + 1,306.80 = 2,021.48).

**Review:** Pending

**Automation:** Pending

### TC-RMAP-019 — Amount payable equals core total at rate, plus the change fee

**Objective:** Verify the headline payable figure composes correctly.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** Any priced offer.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Read core `modifyPrice.totalPayable`, the payload `currencyRate`, and the screen's Amount payable.
5. Compute core x rate + change fee.

**Expected Result:** Screen equals the computed value to the cent, on every offer. **The change fee is added after conversion, never before.**

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Mapping rule(s): `A4`. **Discovery: EXECUTED.** Discovery: 38,268.80 x 0.1 = 3,826.88 + 150.00 = 3,976.88, matching the screen. Verified on all 18 offers.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-020 — Change fee matches the Exchange Fees rule and is app-origin

**Objective:** Verify the change fee comes from configuration, not from the supplier.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** An agency with a known Exchange Fees rule.

**Steps:**

1. Read the agency's Exchange Fees rule in Admin -> Rule Engine (amount, amount type, By Pax).
2. Run a re-shop and read `reissuePricing.changeFee` in both the agency-currency block and the supplier-currency block.
3. Compare the screen's Change fee against the rule x passenger count.

**Expected Result:** The screen's change fee equals the configured rule applied to the passenger count. **`changeFee` is `null` in the supplier-currency block** — proving it is app-origin and added after conversion. No Sabre field carries it.

**Priority:** P1

**Tags:** Atomic, Positive, Business-Rule

**Notes:** Mapping rule(s): `A5`. **Discovery: EXECUTED.** Discovery: rule 'Dubai' = 25 Fixed Amount, By Pax -> 25 x 6 = 150.00, matching. **Test-data hazard:** the service charge was also 25/pax, making the two indistinguishable by amount at the offer level. Set them to different values.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-021 — Change fee applied to infants

**Objective:** Establish and then assert whether infants attract the change fee.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** A booking including infants, with a By-Pax exchange fee rule.

**Steps:**

1. Run a re-shop and read `reissuePricing.passengerFareBreakdowns[]` per type.
2. Read the Infant type's `changeFee`.

**Expected Result:** Infants are charged per the configured rule. **The expected value must be confirmed with the product owner before this case is approved** — the current behaviour charges them.

**Priority:** P2

**Tags:** Atomic, Business-Rule

**Notes:** Mapping rule(s): `A5`. **Discovery: EXECUTED.** Discovery observed 50.00 across 2 infants (25 each) on scenario 10. Behaving as configured; **whether that is intended is unconfirmed** — raised to the user 2026-09-30, no answer yet.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-022 — Currently ticketed total equals its own line items

**Objective:** Verify the Review & Pay currently-ticketed block is internally consistent.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** Any booking whose ticketed total has non-zero cents.

**Steps:**

1. Open Reissue -> select any offer -> Review & Pay.
2. Read every line of the **Currently ticketed** block: base per type, taxes per type, Discount, Service charge.
3. Sum them, applying Discount as a subtraction and Service charge as an addition.
4. Compare with the block's own **Total**.
5. Read `offers.booked.priceDetails.totalOfferAmount` and `totalOfferAmountRoundedUp` in the payload.

**Expected Result:** The printed Total equals the sum of the lines above it, to the cent. `totalOfferAmount` carries the **exact** value, not a rounded one.

**Priority:** P1

**Tags:** Atomic, Negative, Regression

**Notes:** Mapping rule(s): `A6, R02, R12`. **Discovery: EXECUTED-DEFECT.** **FAILS today — FINDING-R02 / R12.** Scenario 10: lines sum to 3,604.88, screen prints 3,605.00. `totalOfferAmount` is itself already 3605, so re-pointing the binding fixes nothing. Reproduced at rate 9 and rate 0.1.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-023 — Additional-to-pay block equals its own line items

**Objective:** Verify the block the agency actually pays from is internally consistent.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** Any priced offer.

**Steps:**

1. On Review & Pay read every line of **Additional to pay**.
2. Sum and compare with Total additional and with the Confirm button's amount.

**Expected Result:** The lines sum exactly to Total additional, and that equals the amount on the payment button.

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Mapping rule(s): `A11`. **Discovery: EXECUTED.** Discovery: 1,805.40 + 714.68 + 1,306.80 + 150.00 = 3,976.88, exact. This block is correct; only the currently-ticketed block is not.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-024 — Per-passenger-type breakdown sums to the offer total on screen

**Objective:** Verify the screen's per-type lines reconcile.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** A 2 Adult + 2 Child + 2 Infant booking.

**Steps:**

1. Read each per-type line for base and tax.
2. Sum per type, then across types.
3. Compare with the offer total.

**Expected Result:** Every type's lines sum to its group figure and the groups sum to the total.

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Mapping rule(s): `A7`. **Discovery: EXECUTED.** Discovery verified on scenarios 9 and 10.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-025 — Flight times on the search results screen match the supplier

**Objective:** Verify the results screen renders supplier times unaltered.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** Any offer set.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Compare each rendered departure and arrival against the Sabre value for the same flight.

**Expected Result:** Times match exactly.

**Priority:** P1

**Tags:** Atomic, Positive

**Notes:** Mapping rule(s): `A8, B6`. **Discovery: EXECUTED.** Discovery: search results showed SV-382 at 06:10, matching Sabre.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-026 — Flight times on the Itinerary screen match the supplier

**Objective:** Verify the Itinerary screen renders the same flight as the results screen does.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** A ticketed booking.

**Steps:**

1. Open the booking's Itinerary / booking-details screen.
2. Read Departure Date-Time and Arrival Date-Time.
3. Compare against the API value for the same flight and against the reissue results screen.

**Expected Result:** Itinerary matches the API and matches the results screen. **Two screens in one application must not disagree about one flight.**

**Priority:** P1

**Tags:** Atomic, Negative, Regression

**Notes:** Mapping rule(s): `A8`. **Discovery: EXECUTED-DEFECT.** **FAILS today — FINDING-R01** (raised in the sibling reissue-flow scope). API 06:10 renders as 08:10 on Itinerary while the results screen renders 06:10 correctly.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-027 — Flight times under a browser at UTC, Africa/Cairo and Asia/Dubai

**Objective:** Establish whether the Itinerary shift is browser-time-zone driven, which is currently inferred rather than demonstrated.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** Ability to set the browser/OS time zone.

**Steps:**

1. Set the browser time zone to UTC. Open the Itinerary and record the rendered times.
2. Repeat at Africa/Cairo.
3. Repeat at Asia/Dubai.
4. Compare all three against the unchanging API value.

**Expected Result:** The rendered time is identical in all three zones and equals the API value. **A rendering that changes with the viewer's zone is the defect.**

**Priority:** P1

**Tags:** Atomic, Boundary, Negative

**Notes:** Mapping rule(s): `A8, B6`. **Discovery: NOT TESTABLE.** **Declared Gap G6**, tied to OQ-M2. FINDING-R01's mechanism is named as a time-zone shift but has never been demonstrated across zones.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-028 — Reissue availability is not granted on a bad credential

**Objective:** Verify eligibility cannot be obtained with an invalid supplier credential.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** A deliberately invalid credential value.

**Steps:**

1. Call the eligibility/reshop path with a nonsense credential.
2. Record the status code and body.

**Expected Result:** The call is rejected. **A 200 reporting the booking as changeable on an invalid credential is a failure.**

**Priority:** P1

**Tags:** Atomic, Negative, Security-adjacent

**Notes:** Mapping rule(s): `A9`. **Discovery: EXECUTED-DEFECT.** **Related finding(s): `FINDING-R22`.** **Suspect — RSK-M3 open.** Discovery observed core answering 200 'changeable' for a nonsense credential on scenario 1 and did not re-test. Not raised as a finding because it was never re-confirmed.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-029 — Wallet balance composition by channel

**Objective:** Verify each channel's Your Balance against the agency's payment configuration.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** One agency with `creditAgency: true` and one with `creditAgency: false`.

**Steps:**

1. Read `paymentSetting.creditLimit` and `creditAgency` from Admin for the agency.
2. Call `GET /v2/financial/financial-details` on the Portal and record `walletBalance`, `topUpBalance`, `creditLimit`.
3. Read Your Balance on Admin for the same agency in the same window.
4. Repeat for the other agency.

**Expected Result:** For a credit-enabled agency, Portal `walletBalance` = `topUpBalance` + `creditLimit`. For a non-credit agency the Portal returns `creditLimit: null` and the two are equal. **Admin includes the credit line regardless — this is intended (ProjectContext 2.5) and is not a defect.**

**Priority:** P2

**Tags:** Atomic, Positive, Business-Rule

**Notes:** Mapping rule(s): `A10`. **Discovery: EXECUTED.** Discovery closed OQ-M7 this way. AGN9780 non-credit: Portal null. AGN10030 credit: 119,062 = 69,062 + 50,000. FINDING-R16 was raised and withdrawn on this evidence.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-030 — Wallet renders the currency's decimal places consistently

**Objective:** Verify one value is formatted the same everywhere on one channel.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** Any agency.

**Steps:**

1. Read `walletBalance` from the API.
2. Read the wallet in the Portal sidebar.
3. Read it on the dashboard.
4. Read it on Review & Pay.

**Expected Result:** All renderings show the currency's own decimal places — two for AED and EGP — and agree with each other.

**Priority:** P3

**Tags:** Atomic, Negative, Regression

**Notes:** Mapping rule(s): `A10, R17`. **Discovery: EXECUTED-DEFECT.** **FAILS today — FINDING-R17.** Sidebar renders three decimals (`119,062.000`), the page renders two.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-031 — A core value returned but not displayed

**Objective:** Exercise the one omission the run's oracle can catch.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** Any priced offer.

**Steps:**

1. Enumerate every field in the surface API's offer and review payloads.
2. For each, locate the value on the rendered screen.
3. List any field with a non-null value that appears nowhere on screen.

**Expected Result:** Every non-null value the backend returns is either displayed or consciously accounted for. **Per ProjectContext 2.0 a field the app never returns cannot be judged missing — only a returned-and-hidden value is a defect.**

**Priority:** P2

**Tags:** Atomic, Negative

**Notes:** Mapping rule(s): `A12`. **Discovery: PARTIAL.** Discovery found no instance across ten scenarios. Partial by nature: absence of evidence, not a systematic field-by-field sweep.

**Review:** Pending

**Automation:** Pending

## 3. Chain-level integrity

### TC-RMAP-032 — Offer set integrity end to end in one capture window

**Objective:** Verify no offer is lost, added, duplicated or re-priced between the supplier and the screen.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** Any reissuable booking.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Compare the offer counts at all three layers.
5. For every aligned offer compare base, tax, penalty and total.
6. Record any signature present at one layer and not another.

**Expected Result:** Counts are equal at all three layers and every aligned offer matches. **Alignment is by flight signature — an index-based comparison is not a valid execution of this case.**

**Priority:** P1

**Tags:** Atomic, Positive, Integration

**Notes:** Mapping rule(s): `C1`. **Discovery: EXECUTED.** Discovery: 18/18 aligned across all three layers, zero mismatches, inside one window. The strongest single result of Stage 2.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-033 — Admin and Portal present the same core offers identically

**Objective:** Verify channel parity.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** The same booking reachable from both channels.

**Steps:**

1. Run the same re-shop on Admin and on the Portal within one window.
2. Align both against the same core response by flight signature.
3. Compare each offer's payable figure.

**Expected Result:** Both channels present the same offers with the same values. Any channel-specific difference is configuration-driven and explainable.

**Priority:** P2

**Tags:** Atomic, Positive, Integration

**Notes:** Mapping rule(s): `C2`. **Discovery: EXECUTED.** Discovery: Portal 17/17 equal to core; re-proven headless 2026-09-27.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-034 — Core values are stable across repeated polls

**Objective:** Verify the core service does not vary its answer between calls within an offer's validity.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** Any booking.

**Steps:**

1. Call core reshop. Wait several minutes, inside the offer validity window. Call again.
2. Compare every offer.

**Expected Result:** Values are unchanged within the validity window.

**Priority:** P3

**Tags:** Atomic, Positive

**Notes:** Mapping rule(s): `C3`. **Discovery: EXECUTED.** Discovery: unchanged across 19:35 and 20:13.

**Review:** Pending

**Automation:** Pending

## 4. Money, records and error behaviour

### TC-RMAP-035 — The wallet is debited exactly the amount presented on the button

**Objective:** Verify the amount taken equals the amount agreed.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** An agency wallet, and an offer whose total has **non-zero cents**.

**Steps:**

1. Call `GET /v2/financial/financial-details` and record `walletBalance` and `topUpBalance` **exactly, from the API**.
2. Reach Review & Pay and record the **Confirm & charge** button's amount verbatim.
3. Complete the exchange (human-clicked).
4. Call `financial-details` again and compute the movement.
5. Read `invoiceInfo.agencyInvoiceAmt` and `totalAmt`.

**Expected Result:** The wallet movement equals the button amount to the cent, and the invoice records that same figure. **Do not read the wallet from the screen — the sidebar renders three decimals (FINDING-R17), so neither display settles it.**

**Priority:** P1

**Tags:** Atomic, Negative, E2E, Regression

**Notes:** Mapping rule(s): `R18, A4`. **Discovery: EXECUTED-DEFECT.** **FAILS today — FINDING-R18.** Agreed 3,976.88, debited 3,977.00. The invoice records 3,977 too, so wallet and invoice agree on the wrong number and nothing on screen contradicts anything.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-036 — Invoice components sum to the recorded invoice total

**Objective:** Verify the confirmation record is internally consistent.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** A completed exchange.

**Steps:**

1. Read `invoiceInfo`: `totalFare`, `totalTax`, `serviceCharges`, `discountPrice`, `agencyInvoiceAmt`, `totalAmt`.
2. Sum the components.
3. Compare against both recorded totals and against the amount charged.

**Expected Result:** Components sum to `agencyInvoiceAmt`, which equals `totalAmt`, which equals the amount charged. All three agree.

**Priority:** P1

**Tags:** Atomic, Negative, Regression

**Notes:** Mapping rule(s): `R15, R12`. **Discovery: EXECUTED-DEFECT.** **FAILS today — FINDING-R15 / R12.** Scenario 10: components 3,976.88, both totals 3,977. Earlier AED cases showed one field flooring and the other ceilinging; scenario 10 showed both rounding up, so that pattern is **not** universal.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-037 — feeNTaxes is expressed in the currency its own object declares

**Objective:** Verify no field in a currency-labelled object carries an unconverted supplier figure.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** A completed exchange in a converted currency.

**Steps:**

1. Read `invoiceInfo.currency`, `feeNTaxes` and `totalTax`.
2. Compare `feeNTaxes` against the core service's supplier-currency figure for the same offer.

**Expected Result:** Every amount in the object is in the declared currency, or the field names its own currency explicitly.

**Priority:** P2

**Tags:** Atomic, Negative

**Notes:** Mapping rule(s): `R15`. **Discovery: EXECUTED-DEFECT.** **FAILS today — FINDING-R15.** Confirmed at two rates: `feeNTaxes` = `totalTax` / rate at both rate 9 and rate 0.1, so it is unconverted at any rate. **Whether this is intended needs a product decision** — the field name does not state a currency.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-038 — Change fee is recorded in its own field, not in serviceCharges

**Objective:** Verify the change fee keeps its identity in the confirmation record.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** A completed exchange where the rule engine contributes nothing.

**Steps:**

1. Confirm the new offer carries `serviceChargeAmount: 0` for every passenger type.
2. Complete the exchange.
3. Read `invoiceInfo.serviceCharges` and look for a change-fee field.

**Expected Result:** The change fee appears in a field that means change fee. `serviceCharges` carries only genuine rule-engine service charges — which on a reissue is zero.

**Priority:** P2

**Tags:** Atomic, Negative, Regression

**Notes:** Mapping rule(s): `R05`. **Discovery: EXECUTED-DEFECT.** **FAILS today — FINDING-R05.** Scenario 10 made this decisive: the rule engine contributes 0 to a reissue, so `serviceCharges: 150` can only be the change fee. **Set the exchange fee and service charge to different values** or the two remain indistinguishable at the offer level.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-039 — Every passenger's new ticket number is stored and displayed

**Objective:** Verify the application persists what the supplier issued.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** A completed exchange.

**Steps:**

1. Read every passenger's ticket number from `GET /v2/bookingConfirm/{orderId}` and from the Confirmation screen.
2. Read the supplier's documents per traveler via `getBooking`.
3. Compare per passenger.

**Expected Result:** Every ticket number the supplier holds is stored and displayed. **Where the supplier issued no document, the passenger is shown as not ticketed — explicitly, and distinguishably from a value that merely failed to display.**

**Priority:** P1

**Tags:** Atomic, Negative, E2E, Regression

**Notes:** Mapping rule(s): `R06, R14`. **Discovery: EXECUTED-DEFECT.** **Mixed.** FINDING-R06: every even-numbered passenger blank on four bookings. FINDING-R14: all six null after the scenario-9 exchange. **Scenario 10 PASSED** — all six stored. So the defect is conditional, and the condition is not established.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-040 — A failed book call explains itself

**Objective:** Verify a payment failure is diagnosable.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** A book call that fails.

**Steps:**

1. Trigger or capture a failing `POST /v2/reissue/{ref}/book`.
2. Record the status, body, and what the screen tells the agent.

**Expected Result:** The agent is told what failed, whether money moved, whether the supplier was touched, and whether retrying can help. A reference is quotable to support.

**Priority:** P2

**Tags:** Atomic, Negative

**Notes:** Mapping rule(s): `R07`. **Discovery: EXECUTED-DEFECT.** **FAILS today — FINDING-R07.** 409 with 'the request could not be completed' — no code, no cause, no next step, order left Failed. **Cause blocked by Declared Gap G8** (`logs/detail.log`).

**Review:** Pending

**Automation:** Pending

### TC-RMAP-041 — A filtered-out result is not reported as an empty market

**Objective:** Verify the screen distinguishes 'we removed these' from 'the airline has nothing'.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** A route where every offer is removed by the negative-base-fare filter.

**Steps:**

1. Run a re-shop on such a route.
2. Record the core status and body.
3. Read the screen's message and any remedy it offers.

**Expected Result:** The screen states that results were filtered and why, not that the market is empty. Any remedy it offers actually works.

**Priority:** P2

**Tags:** Atomic, Negative

**Notes:** Mapping rule(s): `R11`. **Discovery: EXECUTED-DEFECT.** **FAILS today — FINDING-R11.** 422 `NO_EXCHANGE_OPTIONS_AVAILABLE` presented as an empty market. Filter confirmed deployed between 13:18:43Z and 13:35:28Z. The 'RUH is a connection point' hypothesis was **wrong** and is superseded.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-042 — Reissue History counts exchanges, not rows

**Objective:** Verify the history count is meaningful where penalties accumulate per exchange.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** A booking exchanged exactly once.

**Steps:**

1. Open the booking and read the Reissue History panel.

**Expected Result:** The panel reports one reissue after one exchange.

**Priority:** P3

**Tags:** Atomic, Negative, Regression

**Notes:** Mapping rule(s): `R04`. **Discovery: EXECUTED-DEFECT.** **FAILS today — FINDING-R04.** Reads '2 Reissues' after a single exchange.

**Review:** Pending

**Automation:** Pending

## 5. Rule engine, currency and journey shape

### TC-RMAP-043 — Markup, discount and service charge apply to the original ticket

**Objective:** Verify each configured rule reaches the booked fare, per passenger.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** An agency with markup, discount and service charge configured, and known values.

**Steps:**

1. Read the three rules in Admin -> Rule Engine.
2. Read the booked offer's `priceDetails`: `totalBaseAmount`, `discountAmount`, `serviceChargeAmount`.
3. Compare the booked base against the supplier base for the same flight.
4. Divide each rule total by the passenger count.

**Expected Result:** Markup = (booked base - supplier base) / passengers. Discount and service charge each equal their configured per-passenger value x passengers.

**Priority:** P1

**Tags:** Atomic, Positive, Business-Rule

**Notes:** Mapping rule(s): `A6, Rule Engine`. **Discovery: EXECUTED.** Discovery on scenario 10, all three confirmed: markup 2103.00 - 1503.00 = 600 = 100 x 6; discount 300 = 50 x 6; service charge 150 = 25 x 6.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-044 — The rule engine does NOT apply to a reissued ticket

**Objective:** Verify the confirmed behaviour holds — the agency earns the change fee alone on an exchange.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** An agency with all three price rules configured.

**Steps:**

1. Run a re-shop.
2. Read every new offer's `discountAmount` and `serviceChargeAmount`, per passenger type and at offer level.
3. Carry one offer through Review and Confirmation and re-read.

**Expected Result:** All rule-engine amounts are `0` on the new offer, through search, review and the confirmation record. **This is correct by design (ProjectContext 2.5) — a non-zero value here is the failure.**

**Priority:** P1

**Tags:** Atomic, Positive, Business-Rule

**Notes:** Mapping rule(s): `Rule Engine`. **Discovery: EXECUTED.** Discovery confirmed on scenarios 8b and 10. Recorded as a confirmed behaviour, user 2026-09-29 — never to be raised as a defect.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-045 — Conversion uses the payload's currencyRate as a multiplier

**Objective:** Verify the conversion rule at more than one rate.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** Two agencies, or one agency whose rate has changed.

**Steps:**

1. Read `supplierPrices.currencyRate` from the review payload.
2. Compare the supplier-currency block against the agency-currency block for base, tax and total.
3. Repeat on a second, materially different rate.

**Expected Result:** Agency value = supplier value x rate, exactly, on every field. **The change fee is excluded from the conversion and added afterwards.**

**Priority:** P1

**Tags:** Atomic, Positive, Business-Rule

**Notes:** Mapping rule(s): `A1, A2, A4`. **Discovery: EXECUTED.** Discovery verified at rate 9 and rate 0.1 — two rates an order of magnitude apart and in opposite directions. Confirmed behaviour, user 2026-09-29.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-046 — An old ticket keeps the rate in force when it was issued

**Objective:** Verify a rate change does not retro-price an existing ticket.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** A booking ticketed before a rate change, re-shopped after it.

**Steps:**

1. Note the rate at issue time and the current rate.
2. Open Review & Pay and read the currently-ticketed block.
3. Confirm which rate reproduces those figures.

**Expected Result:** The currently-ticketed figures reflect the issue-time rate; only the new offer uses the current rate.

**Priority:** P2

**Tags:** Atomic, Business-Rule

**Notes:** Mapping rule(s): `A6`. **Discovery: NOT EXECUTED.** Not executed as a controlled case. The rule is confirmed by the user (ProjectContext 2.5) but no before/after rate-change booking was tested. Scenario 10's rate changed between bookings, which is suggestive, not controlled.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-047 — A non-Economy cabin through the full chain

**Objective:** Verify cabin does not affect the mapping.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** A booking or re-shop in a cabin above Economy.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Compare base, tax, penalty and total across all three layers.

**Expected Result:** Identical mapping behaviour to Economy.

**Priority:** P3

**Tags:** Atomic, Positive

**Notes:** Mapping rule(s): `A1-A4, B1-B4`. **Discovery: NOT TESTABLE.** **Declared Gap G5**, blocked by OQ-M15. All ten scenarios were Economy.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-048 — Multi-city and round-trip journeys map correctly

**Objective:** Verify multi-segment and multi-journey offers carry correctly.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** A round-trip booking and a multi-city booking.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Confirm each journey and each of its segments is represented at all three layers.
5. Compare the per-offer totals.

**Expected Result:** Every journey and segment is present and correctly ordered, and totals match.

**Priority:** P2

**Tags:** Atomic, Positive

**Notes:** Mapping rule(s): `A1-A4, B1-B4, A7`. **Discovery: EXECUTED.** Discovery covered round trip (scenario 8b), multi-city (scenario 9) and one-way with a connection (scenario 10, CAI-MED-JED). All three trip types are covered.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-049 — Offer pagination does not hide offers

**Objective:** Verify the results screen's count and its list agree.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** An offer set larger than one page.

**Steps:**

1. Read the declared count in the results header.
2. Count the rendered cards.
3. Exhaust the **Show more** control and re-count.

**Expected Result:** The header count equals the total obtainable by exhausting pagination, and every offer in the payload is reachable.

**Priority:** P2

**Tags:** Atomic, Positive

**Notes:** Mapping rule(s): `C1`. **Discovery: EXECUTED.** Discovery: header said 18, first page rendered 12 behind `Show more (12 of 18)`, all 18 reachable. **Nearly reported as a defect before the control was found** — verify pagination before asserting loss.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-050 — Offers are aligned by flight signature, never by index

**Objective:** Guard the comparison method itself — a false-mismatch regression test.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** Any offer set.

**Steps:**

1. Call `GET /v2/reissue/{ref}/eligibility` and extract `responseId` from the `metadata` JWT **programmatically** (never transcribe it by hand).
2. Within one capture window call, in this order: Sabre `POST /v1/offers/flightReshop`, core `POST /api/v1/reissue/reshop`, and the surface's `POST /v2/reissue/{ref}/search` with the **same** origin, destination and date.
3. Align the three offer sets **by flight signature** — marketing carrier, flight number, departure datetime, for every segment of every journey. Never by array index.
4. Deliberately compare index-to-index and record the apparent mismatches.
5. Re-compare by flight signature.

**Expected Result:** Signature alignment yields zero mismatches where index alignment yields spurious ones. **This case documents why index comparison is invalid and must never be used to raise a finding.**

**Priority:** P2

**Tags:** Atomic, Regression, Method

**Notes:** Mapping rule(s): `C1`. **Discovery: EXECUTED.** Discovery established this: each layer calls Sabre separately and receives a different ordering. core offer[0] and Portal offer[0] were different flights on scenario 10.

**Review:** Pending

**Automation:** Pending

## 6. Method, safety and test-data obligations

### TC-RMAP-051 — responseId is extracted programmatically, never transcribed

**Objective:** Guard a known execution failure mode.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** Any eligibility response.

**Steps:**

1. Extract `responseId` from the `metadata` JWT payload in code.
2. Call core reshop with it.

**Expected Result:** The call succeeds. **A hand-transcribed token produces `responseId signature is invalid`** — that failure is an execution error, not a defect.

**Priority:** P3

**Tags:** Atomic, Method

**Notes:** Mapping rule(s): `Method`. **Discovery: EXECUTED.** Discovery hit this: a 758-character token transcribed by hand was rejected. Fixed by extracting in-browser.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-052 — The platform never executes payment

**Objective:** Verify the execution-safety boundary holds.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** Any reissue flow.

**Steps:**

1. Drive the flow to Review & Pay.
2. Report the exact flight and amount to the human.
3. Stop.

**Expected Result:** `/exchange`, ticketing, and Confirm & charge are **never** invoked by automation. The human performs payment. This is absolute under `execution_safety_policy.json`.

**Priority:** P1

**Tags:** Atomic, Safety

**Notes:** Mapping rule(s): `Safety`. **Discovery: EXECUTED.** Held throughout all ten scenarios without exception.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-053 — Post-exchange supplier verification is performed every time

**Objective:** Make the R13 check a standing obligation rather than an ad-hoc step.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** Any completed exchange.

**Steps:**

1. Immediately after any exchange, call Sabre `getBooking` on the GDS PNR.
2. Group by `travelerIndex` and confirm one live document per traveler.
3. Record the result against the scenario.

**Expected Result:** Every exchange scenario carries a recorded per-traveler verification result. **An exchange with no such record is incomplete, not passing.**

**Priority:** P1

**Tags:** Atomic, E2E, Method

**Notes:** Mapping rule(s): `B8, R13`. **Discovery: PARTIAL.** Scenario 9 failed it (how R13 was found); scenario 10 passed it. **Scenarios 1, 2, 5, 6 and 8b predate the check — Declared Gap G9, five `getBooking` calls outstanding.**

**Review:** Pending

**Automation:** Pending

### TC-RMAP-054 — detail.log is available for defect causation

**Objective:** Unblock the five findings whose cause cannot be established from the client side.

**Preconditions:** A reissuable booking exists and its GDS PNR is known. Sabre CERT credentials and the core service credential are readable from `knowledge_base/credentials/credentials.json`. Nothing in this case pays, exchanges or tickets.

**Test Data:** Read access to `logs/detail.log`.

**Steps:**

1. Obtain access.
2. For each of R06, R07, R11, R13 and R18, locate the corresponding request and record what the server did.

**Expected Result:** Each finding gains a mechanism, distinguishing supplier failure from application fault.

**Priority:** P1

**Tags:** Atomic, Method, Blocked

**Notes:** Mapping rule(s): `Method`. **Discovery: NOT TESTABLE.** **Declared Gap G8.** Never accessible in this run. The single cheapest unblock available — one access grant resolves causation for five findings.

**Review:** Pending

**Automation:** Pending

### TC-RMAP-055 — Exchange fee and service charge are configured to different values

**Objective:** Remove a test-data ambiguity that makes two distinct defects indistinguishable.

**Preconditions:** Signed in to the surface under test. The booking is reissuable. The case stops before **Confirm & charge** unless it explicitly says otherwise.

**Test Data:** Admin Rule Engine access.

**Steps:**

1. Set the agency's Exchange Fee and Service Charge rules to clearly different per-passenger values.
2. Re-run TC-RMAP-020 and TC-RMAP-038.

**Expected Result:** The two amounts are separable by value at every layer, so FINDING-R05 can be confirmed or cleared at the offer level rather than only at the invoice.

**Priority:** P2

**Tags:** Atomic, Test-Data

**Notes:** Mapping rule(s): `A5, R05`. **Discovery: NOT EXECUTED.** Not executed. On scenario 10 both were 25/pax, which is why R05 was only decidable at the invoice. **This is a test-data fix, not a product change.**

**Review:** Pending

**Automation:** Pending
