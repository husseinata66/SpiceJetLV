# Manual Execution Results — ancillaries-run-002__2026-09-26_20-51-48__Targeted__Ancillaries-FlynasNDCSeatMap

> ⚠️ **PORTAL PASS COMPLETE — the Admin application pass has not started.** This document covers the
> **Portal** application only, across many bookings on flight XY584/320NEO and related flights (see
> §3.6–§3.11 for what each covered). Every case in the original 101-case sheet has now been reached
> except two, which are **Excluded** — removed from scope and commented out in the test sheet by human decision, Mohanad Dawood, 2026-09-27
> (§3.5): `TC-SM-NEG-004` (a two-browser concurrency race) and `TC-SM-EXR-007` (a precondition the app has
> no UI path to create). `TC-SM-BND-002` is resolved (§3.10) — the app's
> behaviour is correct by design; not a defect. The 15 booking-lifecycle cases that were Skipped are now
> executed (§3.9), under the human operator's override for `BOOK`/`WALLET_CHARGE` on staging. **Two real
> bookings were made on the staging wallet:** one confirmed (PNR `VYHQKP`, 20,737 EGP), one deliberately
> failed at the airline (no charge). **Two further cases added mid-run were also executed (§3.11):**
> `TC-SM-PRC-005` Passed; `TC-SM-PAX-008` Passed by human decision — the seat map lets two infant-holding
> adults take the same 3-seat set, which is left to the airline to reject at booking (like the exit
> rows). The **Admin** application pass (also
> decided in scope for this run) remains entirely unstarted. See §6 Known Limitations and the closing
> message for exact next steps.

## 1. Execution Metadata

| Field | Value |
|---|---|
| Execution ID | run-006-portal-pass-1 |
| Run Folder | `ancillaries-run-002__2026-09-26_20-51-48__Targeted__Ancillaries-FlynasNDCSeatMap` |
| Run Scope Type / Run Type | Targeted (Supplier-Feature: Ancillaries → Flynas NDC) / Direct (degraded) — Stages 2–3 skipped by human authorization; suite supplied externally |
| Environment | Staging — Portal, `http://192.168.1.70:9500` |
| Target URL | `http://192.168.1.70:9500/booking/flight-search`, `/booking/passenger-details` |
| Role(s) used | Agency user (Uplift2_Mohanad Dawood, AGN9809) — logged in by the human operator in the visible browser; no credential typed by this stage |
| Started | 2026-09-26 18:33 UTC |
| Ended | 2026-09-26 18:45 UTC (session paused for checkpoint, not a Stop Condition) |
| Test Suite executed | `C:/Users/Mohanad Dawood/Desktop/SeatMap/TESTCASES-SEATMAP-v7-simple.xlsx`, sheet "Test Cases", 101 cases — no `Review`/`Automation` columns in the sheet; all 101 treated as `Review = Approved` by explicit human decision (2026-09-26), recorded in the Run Manifest |
| Execution mechanism | Playwright MCP server, **headed** (`.mcp.json` restarted without `--headless` for this run, by human operator). Booking session 2026-09-27: headed again, confirmed by the operator before execution |
| Safety authorization | `AUTH-ANCILLARIES-CREATE-SelfCreated`, run-006 only (`metadata/SafetyAuthorizations.json`). `BOOK` and `WALLET_CHARGE` are **Forbidden (absolute)** in policy v1 (`metadata/SafetyPreflight.md`); for the 2026-09-27 booking session the human operator set that aside by direct decision, on the condition that the supplier credential's API key starts with `tt` (verified ~09:55 UTC) — recorded in `metadata/SafetyAuthorizations.md`. Each `Book` press was approved in session |
| Booking session | 2026-09-27, ~10:19–11:54 UTC. Portal login by the human operator (twice: the session timed out while idle once). Wallet at start 175,140.868 EGP, at end 154,405.508 EGP |

## 2. Result Totals — this document (Portal pass only)

| Status | Count |
|---|---|
| Passed | 93 |
| Failed | 5 |
| Blocked | 1 |
| Skipped | 0 |
| Not Executed | 0 |
| Inconclusive | 0 |
| **Executable scope** (`Review = Approved`) | **99** |
| Excluded — Pending Review | 0 |
| Excluded — Rejected at Review | 0 |
| Excluded — removed from scope by human decision | 2 |
| **Suite total** | **101** |

*(Final figure for the original 101-case Portal pass. §3.8 covers the closing session (55/24 → 75/3);
§3.3 covers the 2026-09-27 resolution of all 7 Inconclusive cases (75 → 81 Passed, 1 Blocked, 0
Inconclusive); §3.9 covers the 2026-09-27 booking session, which executed the 15 Skipped cases (81 → 90
Passed, 1 → 7 Failed, 15 → 0 Skipped); §3.10 covers `TC-SM-BND-002`'s resolution by business decision
(90 → 91 Passed, 3 → 2 Not Executed); the human operator's 2026-09-27 reclassification of
`TC-SM-CNF-016` and `TC-SM-CNF-017` (91 → 93 Passed, 7 → 5 Failed — §3.2); and the removal of
`TC-SM-NEG-004` and `TC-SM-EXR-007` from scope (2 Not Executed → 2 Excluded — §3.5). Two further cases were added to the sheet after this pass started
(`TC-SM-PAX-008`, `TC-SM-PRC-005`) — their execution is recorded separately in §3.11 and is not part of
this 101-case total.)*

Every case in the sheet was authorized to run (`Review = Approved` by human decision). Two were later
removed from scope (§3.5), so **executable scope = 99** of a suite total of 101. Percentages and pass
rates are computed over the 99.

## 3. Per-Test Results

Full detail for every executed case is in `ManualTestResults.csv` (one row per case, all 101, per
§9.2/§21). This section carries the narrative for the executed subset and the full defect write-up.

### 3.1 Passed (30)

`TC-SM-NAV-001, TC-SM-NAV-002, TC-SM-NAV-002b, TC-SM-NAV-003, TC-SM-NAV-005, TC-SM-RND-001,
TC-SM-RND-002, TC-SM-RND-003, TC-SM-RND-005, TC-SM-RND-006, TC-SM-STA-002, TC-SM-STA-004,
TC-SM-STA-005, TC-SM-STA-006, TC-SM-STA-007, TC-SM-PRC-001, TC-SM-PRC-003, TC-SM-PRC-003b,
TC-SM-PRC-004, TC-SM-GEN-001, TC-SM-GEN-002, TC-SM-GEN-002b, TC-SM-GEN-004, TC-SM-SEL-001,
TC-SM-SEL-002, TC-SM-SEL-006, TC-SM-SEL-009, TC-SM-PER-007, TC-SM-FRC-002, TC-SM-FRC-005`

Each carries its own observation note in `ManualTestResults.csv`. Highlights:

- **TC-SM-RND-001/002**: the rail's `SEATS 174`, the rendered `.seat`/`[data-seat-id]` count (174), and
  the sum of the traveller-independent state buckets (18 Blocked + 60 AvailablePaid + 96 AvailableFree)
  all agree exactly, with 0 duplicate seat numbers.
- **TC-SM-GEN-001/002/002b/004**: a full round-trip of the gender rule on one seat (13A) with two
  travellers of different Title/gender, decoded `data-seat-id` (`0:Blocked,1:AvailablePaid`) matching
  the rendered state for both.
- **TC-SM-PRC-003/003b/004**: paid seats (5A EGP 642, 13A EGP 301) itemised into a `Seat Selection`
  line (+943 EGP), separate from `Bundle Fare`, and the full fare breakdown summed exactly.

### 3.2 Failed (5) — full defect write-ups

`TC-SM-PRC-002` first (found 2026-09-26), then the four found in the 2026-09-27 booking session (§3.9):
`TC-SM-CNF-018`, `TC-SM-CNF-010`, `TC-SM-CNF-012`, `TC-SM-CNF-007`. `TC-SM-CNF-016` and `TC-SM-CNF-017`
were first recorded Failed and then moved to **Passed** by the human operator's decision the same day;
their entries stay below, marked resolved, so the reasoning is kept.

#### TC-SM-PRC-002 — A seat marked "Chargeable seat" must always have a price

1. **Test Case ID**: TC-SM-PRC-002
2. **Execution Status**: Failed
3. **Execution Time**: 2026-09-26, ~18:44 UTC
4. **Preconditions**: Reached step 2 (Ancillaries) of the booking wizard on the Portal, with the
   `Plus` bundle selected for the sole journey (CAI→JED, flynas XY584, A320NEO, 15/10/2026), 1 adult
   (Hazem Ruwaidi) + 1 child (Lina Ruwaidi) + 1 infant (Omar Ruwaidi, assigned to Hazem).
5. **Test Data**: Bundle `Plus` (`Seat selection: All seats`), seat map opened for the CAI→JED segment.
6. **Steps Performed**: Opened the seat map under `Plus`. Programmatically decoded every seat's
   `data-seat-id` and `aria-label`. Clicked seat `5A` (inspect only) and read its details panel.
7. **Expected Result**: Per the business's own ruling (`BUSINESS_DOMAIN.md` rule 44, 2026-09-17,
   reversing an earlier "it depends on the bundle" answer), a seat carrying the `Chargeable seat`
   attribute describes a paid airline seat product and **must always carry a price**, regardless of
   which fare bundle is active. Under `Plus`, seat `5A` should therefore still show a non-zero price,
   or — if the business intends `Plus`'s "Seat selection: All seats" entitlement to zero out even
   chargeable seats — the seat should not carry the `Chargeable seat` attribute at all on this fare.
8. **Actual Result**: Seat `5A` rendered `aria-label`: *"Seat 5A, row 5, Left side, Y-1, Chargeable
   seat, Window seat, available for Free"*, details-panel status `Available free`, price `Free · per
   passenger`. Programmatically checking every seat on the map, **all 36 seats carrying the
   `Chargeable seat` attribute** rendered `available for Free` under this bundle (sample: 5A, 5B, 5C —
   full list captured in evidence). The rail also read `No seat charges — Free`.
9. **Impact**: An agent has no way to see, from this map, that these seats are the airline's paid seat
   product — the UI actively tells them the opposite (`Chargeable seat` + `Free` in the same label).
   If the intended behaviour is that `Plus` should not offer chargeable seats as part of its "all
   seats" entitlement, agents are instead being shown and can assign a seat product the airline may
   expect to be paid for, with no price captured anywhere in the booking.
10. **Classification**:
    - **Category**: Business Rule
    - **Layer**: Frontend (the price/attribute pairing is rendered together in the seat-map UI; whether
      the root cause is a UI mapping or an upstream pricing/entitlement response was not established
      this session — see Root Cause)
    - **Reproducibility**: Always (all 36 chargeable seats on this render, reproduced consistently)
    - **Regression**: Unknown — this is a live reproduction of a defect first recorded 2026-09-09 on the
      Admin app under the same bundle; whether it was ever fixed in between is not established here
    - **Suspected Component**: Seat Map modal's per-seat attribute/price rendering (or the upstream
      offer response it renders from) for the `Plus` bundle entitlement
    - **Confidence**: High — reproduced independently across 36 seats in one render, matching a
      previously documented occurrence exactly in wording and mechanism
11. **Root Cause Analysis**: *Likely* the `Plus` bundle's "Seat selection: All seats" entitlement is
    implemented as "every seat's price becomes zero," without checking whether the seat also carries
    the `Chargeable seat` attribute — i.e. the entitlement is applied uniformly to price, while the
    attribute is left untouched, producing the contradictory label. An alternative, equally plausible
    explanation: the `Chargeable seat` attribute is itself supplier feed metadata that is not meant to
    be read as "must be priced" under every bundle, in which case the defect is in the business rule's
    current wording rather than the application — this needs the business to state which fix belongs
    where (`BUSINESS_DOMAIN.md` rule 44's own open follow-up).
12. **Conclusion**: A seat labelled `Chargeable seat` renders as free of charge under the `Plus` bundle,
    contradicting the business's own 2026-09-17 ruling that such seats must always carry a price. This
    reproduces on all 36 affected seats on this flight, not as an isolated case.
13. **Severity**: High. Reason: the discrepancy is systematic (36/36 chargeable seats affected on this
    render) and directly contradicts a documented, dated business ruling, though it does not itself
    block a booking from completing.
14. **Priority**: P2 — a real business-rule violation, but not currently blocking any workflow; needs
    a business decision on which side (bundle behaviour vs. attribute meaning) is wrong before a fix is
    scoped.
15. **Evidence**: `manual_execution/artifacts/portal/DEFECT-PRC002-5A-chargeable-free-Plus.png`;
    decoded seat data captured programmatically during execution (36-seat list available on request,
    not persisted as a separate file this session).

#### TC-SM-CNF-018 — Going back a step must not silently throw away seats and ancillaries

> **Confirmed a generic, Feature-level defect (2026-09-28, Mohanad Dawood).** It reproduces on
> **Air Cairo** in run-007 — a different supplier, environment (`.237`), currency (EGP, no conversion),
> aircraft and ancillary model, with **no bundles at all**. Editing a passenger name there dropped the
> seat and 1,180 EGP from the total with no warning, exactly as here. It is therefore a defect in the
> **booking wizard**, not in the flynas integration: fix it once and it is fixed for every supplier.


1. **Test Case ID**: TC-SM-CNF-018
2. **Execution Status**: Failed
3. **Execution Time**: 2026-09-27, ~10:25–10:30 UTC
4. **Preconditions**: A live offer on the Portal, step 2 (Ancillaries) reached with extras chosen. No
   booking was made.
5. **Test Data**: One-way CAI→JED, XY584, 15/10/2026, 1 adult (Karim Fathy), bundle `Value`. Extras:
   seat 2C (EGP 1,097.91), meal SFML (180), baggage 10Kg (1,260). Total 5,703.91 EGP.
6. **Steps Performed**: (a) Pressed Prev, changed nothing, pressed Next. (b) Pressed Prev, changed the
   first name (Karim → Kareem), pressed Next. (c) Added a meal (BBML), pressed Prev, changed the last name
   (Fathy → Fathi), pressed Next. (d) Pressed Prev and Next once more.
7. **Expected Result**: The case exists for an agent who goes back to step 1 *to fix a name*. After
   Prev → Next, the fare package, meals, bags and seats the agent chose should still be there. If the
   system has to drop them, it should warn the agent first.
8. **Actual Result**: (a) With nothing changed, everything survived and the total stayed 5,703.91 EGP.
   (b) After the name edit, Next rebuilt step 2 from scratch: the seat, the meal and the bag were gone, and
   only the bundle remained. The total fell to 3,166 EGP. No message or warning was shown. (c) It happened
   again: the new meal was dropped, 3,346 → 3,166 EGP. This time step 2 showed **no extras panels at all**
   (no meal, baggage or seat sections). (d) Next then stayed **disabled with no visible error**, so the
   agent could neither add extras nor move on. The network log shows the first edited Next sent
   `booking/add-pax` again, followed by fresh `booking/ssr-quote` and `booking/seat-map` calls. The
   unchanged Next sent no calls.
9. **Impact**: Fixing a typo in a name is routine. An agent who does it loses every seat, meal and bag
   without being told, and may complete the booking without them — the customer then travels without
   extras they asked for, or the agent has to redo them. A second correction leaves the offer at a dead
   end.
10. **Classification**:
    - **Category**: Workflow
    - **Layer**: Frontend (the extras are discarded when step 2 is rebuilt; whether the backend also
      drops them on the repeated `add-pax` was not established)
    - **Reproducibility**: Always (2 observations on the same offer: first-name edit and last-name edit)
    - **Regression**: Unknown — the sheet's own KNOWN FAULT describes the same wipe (61,257 → 43,700)
    - **Suspected Component**: Passenger Details wizard, step 1 → step 2 transition when passenger data
      has changed (`add-pax` re-submission and the Ancillaries state that follows)
    - **Confidence**: High
11. **Root Cause Analysis**: *Likely* pressing Next with changed passenger data re-creates the passenger
    through `add-pax`, and the Ancillaries step is then rebuilt from the new `ssr-quote`/`seat-map`
    response without re-applying the earlier choices. The empty step 2 after the second edit *appears to*
    come from a state where the page thinks step 2 is loaded but has no ancillary data, which would also
    explain why Next stays disabled.
12. **Conclusion**: Editing any passenger's name on step 1 silently discards every seat, meal and bag
    already chosen, and a second edit can leave the booking unable to continue.
13. **Severity**: High. Reason: silent loss of paid customer choices in a routine correction, and a
    dead-end state with no message.
14. **Priority**: P1
15. **Evidence**: `manual_execution/artifacts/portal/cnf-018-before-prev.png`,
    `cnf-018-after-prev-next.png` (unchanged case survives), `DEFECT-CNF018-name-edit-wipes-ancillaries.png`,
    `DEFECT-CNF018-second-edit-next-disabled-no-error.png`.

#### TC-SM-CNF-010 — The wallet is reduced by exactly the booking amount

1. **Test Case ID**: TC-SM-CNF-010
2. **Execution Status**: Failed
3. **Execution Time**: 2026-09-27 — Booking A 10:52 UTC; re-test with the rule engine switched off by the operator 15:04 UTC; a third booking made by the operator the same day
4. **Preconditions**: Real staging bookings under the operator's override; wallet balance read before and after each. The supplier credential and the agency wallet are in **SAR**, shown in EGP at a rate of exchange (ROE) of **9** (operator, 2026-09-27; the ROE is recorded on the supplier credential).
5. **Test Data**:

   | Booking | Order / PNR | Lines shown (exact sum) | Displayed total | Balance before → after | Balance dropped |
   |---|---|---|---|---|---|
   | A — 3 pax, round trip, Value | `…LVHJPU` / VYHQKP | 20,736.18 | 20,737 | 175,140.868 → 154,405.508 | 20,735.360 |
   | C — re-test, 1 adult, Value + seat 2C | `…1PUXYF` / C9EV3M | 4,263.39 | 4,264 | 154,405.508 → 150,142.728 | 4,262.780 |
   | Operator's booking — 1 adult, Light Super Flex + seat | `…RQMXJT` | 3,912.30 | 3,913 | 150,142.728 → 146,231.128 | 3,911.600 |

6. **Steps Performed**: Recorded the wallet on the payment panel, pressed Book (approved), read the wallet again, and for Booking A read Reports → Statement.
7. **Expected Result**: The wallet must go down by exactly the booking total, so the money taken matches the amount billed.
8. **Actual Result**: The pricing itself is correct: every line adds up, and the displayed total is always the exact sum rounded up (20,736.18 → 20,737; 4,263.39 → 4,264; 3,912.30 → 3,913). The Statement records Booking A's debit as exactly **20,737.00**. But the balance never drops by that amount — it drops **1.64, 1.22 and 1.40 EGP less** on the three bookings. The Statement contradicts itself the same way: debit 20,737.00, balance 176,057.88 → 155,322.50 (20,735.38). Switching the rule engine off (re-test) did not change this, and no markup, discount or service charge appears in any response (`discountPrice 0`, `serviceCharges 0`).
9. **Impact**: The agency's wallet balance and its booking/ledger records drift apart on every booking, so the wallet can never be reconciled with what was billed.
10. **Classification**:
    - **Category**: Data Integrity
    - **Layer**: Backend (wallet balance update / currency conversion)
    - **Reproducibility**: Always — 3 of 3 bookings
    - **Regression**: Unknown
    - **Suspected Component**: Wallet debit and SAR ↔ EGP conversion
    - **Confidence**: High
11. **Root Cause Analysis**: The displayed prices use ROE 9 exactly: every line is a clean SAR amount × 9 (base 56.50, tax 195.22 — the API's `feeNTaxes` — seat 121.99, bundles 100.00 / 60.99, meal 20.00, 10Kg bag 140.00 SAR). So pricing is correct. The balance drops are 0.14–0.18 SAR less than the recorded totals; rounding at ROE 9 can lose at most 0.005 SAR, so this is not rounding. The rate that would explain each drop is **9.0007, 9.0026 and 9.0032** — just above 9 and different each time — which *suggests* the wallet debit (or the balance display) uses a live or more precise rate instead of the fixed 9 the prices use. The SAR amount actually debited for one booking (wallet transaction record, Admin/DB) would confirm it.
12. **Conclusion**: Pricing and the recorded debit are right; the wallet balance moves by a slightly different amount than the recorded debit on every booking, most likely because of an exchange-rate mismatch between the debit and the balance display.
13. **Severity**: High. Reason: real money records disagree on every booking.
14. **Priority**: P1
15. **Evidence**: `manual_execution/artifacts/portal/cnf-A-prebook-snapshot.png`, `cnf-A-confirmation-VYHQKP.png`, `cnf-A-wallet-statement-VYHQKP.png`, `cnf010-retest-prebook.png`, `cnf010-retest-confirmation.png`, `cnf010-retest-costing.png`, `cnf010-retest-wallet-after.png`, `network/cnf010-retest-bookingConfirm-response.json`; the operator's two screenshots of the third booking (shared in session).

#### TC-SM-CNF-012 — The order page itemises every ancillary and reconciles

1. **Test Case ID**: TC-SM-CNF-012
2. **Execution Status**: Failed
3. **Execution Time**: 2026-09-27, ~10:54 UTC
4. **Preconditions**: Booking A (§3.9) confirmed.
5. **Test Data**: Order `AGN9809UPLUPLORD260927LVHJPU`.
6. **Steps Performed**: Opened the order from My Bookings (`/myBooking/booking-details/…`) and read every
   tab (Itinerary Details, Costing, Documents & Queue Request). Read the "Fare Details" block on the
   order's confirmation page. Read the My Bookings list Total.
7. **Expected Result**: The order's Fare Details must list base fare, taxes and one line per ancillary,
   and its Total must match both the quote and the amount taken from the wallet. The My Bookings list
   Total is fare-only by design and is not compared.
8. **Actual Result**: The Portal order-details page has **no "Fare Details" block** in any tab; the block is on the order's confirmation page ("Order Details"). There it lists Base 5,378.4, Taxes 7,761.96, Meal 540, Seat 2,195.82, Baggage 1,260, Bundle 3,600 — every line correct — with Total **20,737**, the exact sum (20,736.18, also shown on the Costing tab) rounded up, as the pricing rule intends. The only mismatch is with the wallet, whose balance dropped 20,735.36 (see TC-SM-CNF-010). The list Total, 13,140.36 = base + tax, is fare-only by design.
9. **Impact**: The order itself reconciles; it cannot be reconciled with the wallet movement.
10. **Classification**:
    - **Category**: Data Integrity
    - **Layer**: Backend
    - **Reproducibility**: Always (3 bookings show the same wallet gap)
    - **Regression**: Unknown
    - **Suspected Component**: Wallet balance / SAR ↔ EGP conversion (same as TC-SM-CNF-010)
    - **Confidence**: High
11. **Root Cause Analysis**: Same probable cause as TC-SM-CNF-010 — an exchange-rate mismatch between the debit and the balance display, not a pricing error. Separately, the missing Fare Details block on the order-details page is *likely* a test-sheet wording issue; the business should say which page is meant.
12. **Conclusion**: The order's itemisation and total are correct; only the wallet movement disagrees with it, and the order-details page carries no Fare Details block.
13. **Severity**: High. Reason: the order cannot be reconciled with the money actually taken.
14. **Priority**: P1 (shares its fix with TC-SM-CNF-010)
15. **Evidence**: `manual_execution/artifacts/portal/cnf-A-confirmation-VYHQKP.png`,
    `cnf-A-order-costing-tab.png`, `cnf-A-wallet-statement-VYHQKP.png`.

#### TC-SM-CNF-016 — Extra baggage must not clash with the baggage already in the fare package — resolved 2026-09-27

**Passed.** One-way CAI→JED, XY584, 1 adult (Tamer Gaber), bundle `Value` (services list **"30KG
Check-in Baggage (PDBG)"**). The extra-baggage list on step 2 still offered **30Kg Baggage, 5,310 EGP**
alongside 10/20/25Kg, and choosing it added the charge with no client-side warning. Pressing Book (with
the operator's approval, expecting it to fail) had the airline reject the booking: *"SSR (PDBG) is
restricted to 1 occurence(s) per passenger and leg."* The wallet was correctly not charged.

The sheet's own text calls this a KNOWN FAULT. **Human decision (Mohanad Dawood, 2026-09-27) reverses
that**, on the same reasoning already applied to the exit-row cases (§3.7): the Portal is not required to
duplicate every airline SSR restriction client-side — offering the option and having the *supplier*
reject an invalid combination at booking time is expected behaviour, not a defect, as long as the wallet
is never charged for a booking that fails (confirmed here). `TC-SM-CNF-016`'s expected-result wording
("the clashing option should not be offered, or the agent should be warned") should be corrected at the
test-design level to describe this supplier-enforced-at-booking model instead.

This does not change `TC-SM-CNF-017` below, which is about a different question — whether the app
*reports* a failed booking consistently once one has happened — and stays Failed on its own evidence.

Evidence: `manual_execution/artifacts/portal/cnf-B-prebook-30kg-clash-offered-no-warning.png`,
`cnf-B-failed-confirmation-page-PDBG.png`, `network/bookB-bookingConfirm-response.json`.

#### TC-SM-CNF-017 — A failed booking must be reported as failed everywhere — Passed, with concerns noted

**Passed** (human decision, Mohanad Dawood, 2026-09-27). Booking B failed at the airline
(TC-SM-CNF-016); order `AGN9809UPLUPLORD260927MHROPZ`, ref `NDCEG-BR-F260927M5bOws`. The screens an agent
lands on straight after booking both report the failure: the **confirmation page** shows Status
**"Failed"** with the airline's error in red, and the **order-details page** reads "AGENCY BOOKING STATUS:
Booking Failed". The **wallet** was correctly not charged (154,405.508 before and after). This is
better than the sheet's recorded fault, which said no surface showed the failure.

**Concerns noted (not scored as failures):**
- **My Bookings** shows the failed order as an ordinary row with no failure marker — it looks the same as a
  successful booking. ("Pay And Book", which the sheet recorded, is no longer offered.)
- **Dashboard (Today)** counts it as **Pending** (0 → 1), not as failed.
- The **`book-and-pay` response** has the same shape for a failed and a successful booking (HTTP 200,
  `orderId`, `bookingReference`, redirect — no status). Only the later `bookingConfirm` call carries the
  real result (`bookingStatus 4`, `hasFlightError true`), and it also returns `paymentStatus: true` for
  this unpaid booking.
- Risk: an agent who checks the list or the Dashboard later could take a failed booking for a live one.
  Worth raising as an improvement.

Evidence: `manual_execution/artifacts/portal/network/bookB-book-and-pay-response.json`,
`network/bookA-book-and-pay-response.json` (same shape), `cnf-B-failed-confirmation-page-PDBG.png`,
`cnf-B-mybookings-failed-row-looks-ordinary.png`, `cnf-B-order-details-booking-failed.png`,
`cnf-B-dashboard-baseline.png`, `cnf-B-dashboard-failed-counted-pending.png`.

#### TC-SM-CNF-007 — Infants appear as passengers but carry no seat or ancillaries

1. **Test Case ID**: TC-SM-CNF-007
2. **Execution Status**: Failed
3. **Execution Time**: 2026-09-27, ~10:53–10:54 UTC
4. **Preconditions**: Booking A (§3.9) confirmed with one infant (Adam Helmy, assigned to Nader).
5. **Test Data**: Order `AGN9809UPLUPLORD260927LVHJPU`: 1 adult + 1 child + 1 infant, 2 flights.
6. **Steps Performed**: Read the infant's row on the confirmation page and e-ticket, and the Booking
   Overview on the order-details page.
7. **Expected Result**: The infant shows "-" for meal, seat and package and has no ancillary panel. The
   advertised booked-seat count must equal the seats actually held.
8. **Actual Result**: The infant row is correct: "-" for meal, seat and bundle on the confirmation and
   e-ticket, and the infant never had a meal, baggage or seat panel. But the Booking Overview reads
   **"3 Passenger | 3 Booked Seats"**, while only 2 passengers hold seats (2 per flight, 4 in total). The
   failed Booking B also reads "1 Booked Seats" though no seat was chosen at all.
9. **Impact**: The overview overstates the seats held, so an agent or a report reading it counts a seat
   for the infant that does not exist.
10. **Classification**:
    - **Category**: Data Integrity
    - **Layer**: Frontend
    - **Reproducibility**: Always (2 observations, both showing the figure equals the passenger count)
    - **Regression**: Unknown — documented earlier in the sheet as a KNOWN FAULT
    - **Suspected Component**: Order details → Booking Overview "Booked Seats" counter
    - **Confidence**: High
11. **Root Cause Analysis**: *Based on the observed behavior*, "Booked Seats" is simply the passenger
    count: it read 3 for 3 passengers (one seatless infant) and 1 for a booking with no seat at all.
12. **Conclusion**: The "Booked Seats" figure counts passengers, not seats, so it includes the seatless
    infant and passengers with no seat.
13. **Severity**: Low. Reason: a wrong summary figure; the seat records themselves are correct (confirmed as a bug, low priority — Mohanad Dawood, 2026-09-27).
14. **Priority**: P3
15. **Evidence**: `manual_execution/artifacts/portal/cnf-A-order-costing-tab.png` (Booking Overview panel:
    "3 Passenger · 3 Booked Seats"), `cnf-A-confirmation-VYHQKP.png` (infant row),
    `cnf-B-order-details-booking-failed.png` ("1 Booked Seats").

### 3.3 Inconclusive (0) — all 7 resolved 2026-09-27

The seven cases recorded Inconclusive were resolved with the human operator's clarifications (Mohanad
Dawood, 2026-09-27) plus a short re-test on a fresh 1-adult booking (XY584, bundle `Value`). Six are now
Passed and one is Blocked. Nothing moved to Failed.

- **TC-SM-SEL-003 → Passed (re-tested).** Seat 2A's info box read `Available paid`, `EGP 1,097.91 per
  passenger`, Economy, left-side window, `Row 2 · 2nd of 7 rows in Y-1`. A second sample, 20C, read
  `Available free`, `Row 20 · 5th of 7 rows in Y-3`. Both match their own seat labels, and the positional
  lines were checked against the map's actual sections (Y-1 = rows 1–7, Y-3 = rows 16–22).
- **TC-SM-PER-001 → Passed (re-tested).** Confirmed paid seat 2A, then Prev → changed nothing → Next.
  Seat 2A, its price, the `Change Seats` button and the 4,263.91 EGP total were all unchanged, and the
  network log showed **no new backend call**. This matches the operator's statement exactly. The earlier
  wipe was caused by changing the bundle in the same step, not by going back.
- **TC-SM-FRC-001 → Passed (negative half re-run).** A 1-adult search with no infant went straight from
  `Book Flight` to Passenger Details with no Price Update pop-up. The booking's flight token carries
  `fareMismatch:false`, where the infant bookings carried `fareMismatch:true`. This matches the operator's
  note.
- **TC-SM-RND-007 → Passed.** The operator clarified that the same aircraft type always has the same map
  structure; only availability differs. The two A320NEO flights matching is therefore expected. A
  genuinely different aircraft type was reached on the multi-city booking: XY402 JED–DMM, aircraft 320DR1,
  rendered a different 180-seat map. So different aircraft give different maps, and each matches its own
  aircraft.
- **TC-SM-ERR-005 → Passed.** This corrects the earlier note, which said no connection name was visible.
  Each result card does name its connection, through the credential's display name (`flynas KSA`, and
  `FlyNas Egy` earlier this run). The operator clarified that this name is free text set by the admin and
  was never meant to show production vs. staging, and that this is intended behaviour. The sheet's
  `(NO WARNING)` / `(WARNING)` examples are just names someone chose.
- **TC-SM-MCT-006 → Passed, plus an enhancement.** The expected result, one labelled baggage panel per
  journey, is met, and the sheet's KNOWN FAULT did not reproduce. The options inside the panels are
  identical in name and price across journeys; the operator decided this should be raised as an
  **enhancement**, not a defect.
- **TC-SM-CAB-007 → Blocked.** The case says it needs the live connection and cannot be done on staging,
  and that environment is not available here. The Economy label on the Business section is the staging
  data problem the sheet itself says must not be reported as a system fault. The operator confirmed
  production labels the cabins correctly, but this run did not observe production, so the case stays
  Blocked rather than Passed.

### 3.4 Skipped (0) — the 15 formerly Skipped cases were executed on 2026-09-27

Until 2026-09-27 all 13 `TC-SM-CNF-*` cases (group Q, "Completing the booking") and `TC-SM-MCT-004/005`
were Skipped: they need `BOOK` and/or `WALLET_CHARGE`, which policy v1
(`platform_core_data/knowledge_base/execution_safety_policy.json`, `metadata/SafetyPreflight.md`)
evaluates `Forbidden (absolute)`. On 2026-09-27 the human operator set that rule aside for this run by
direct decision, on the condition that the supplier credential's API key starts with `tt` (staging). That
decision, the credential check and the records touched are in `metadata/SafetyAuthorizations.md`. The
policy file itself is unchanged. All 15 cases were then executed (§3.9). Two of them
(`TC-SM-CNF-015`, `TC-SM-CNF-018`) never needed a booking and were run without one.

### 3.5 Excluded (2) — removed from scope, formerly Not Executed

Every other case originally Not Executed was reached and resolved across §3.6–§3.8/§3.10. The last two
were **removed from scope** (human decision, Mohanad Dawood, 2026-09-27: "we don't want them to be executed") and commented out in
`TESTCASES-SEATMAP-v7-simple.xlsx` (greyed row, cell comment, Pass / Fail = "Not to be executed"). They
are reported as `Excluded`, never dropped. The reasons they could not be run are kept below for the record.

- **TC-SM-NEG-004** — "two agents race for the same seat, in different sessions." This app's only
  concurrency guard (`Multiple Tabs Detected`) is confirmed (via direct `localStorage` inspection) to be
  scoped to one browser profile, not a true server-side single-session lock — so it cannot be used to
  simulate the case's real scenario (two genuinely independent browsers/agents). This session's tooling
  (a single Playwright browser instance, no way to launch a second independent browser or profile) cannot
  construct the precondition either. See §3.7's sibling note and the CSV for the full reasoning — this is
  recorded as a tooling limitation, not evidence the app is safe or unsafe against a real race.
- **TC-SM-EXR-007** — requires giving an adult a confirmed exit seat *before* any infant exists on the
  PNR, then adding an infant to the same booking afterwards. This app fixes passenger counts at the
  search step with no way to add a passenger to an already-created booking — the precondition cannot be
  constructed through the UI (see §3.7).

## 3.6 Extended session — bundle sweep, second flight (added same day, continued execution)

The session continued after §3's checkpoint, still on the Portal, still no `Book` pressed. This section
documents everything found in that extension. Case-by-case status updates are in
`ManualTestResults.csv` (`TC-SM-BND-004`, `TC-SM-PER-004`, `TC-SM-RND-007` all now Passed/Inconclusive
per below; group totals updated to 32 Passed / 1 Failed / 4 Inconclusive / 13 Skipped / 51 Not Executed).

**All four bundles swept on one flight (XY-584, Karim Fahmy party)** — confirms **TC-SM-BND-004** and
extends **TC-SM-PRC-002**:

| Bundle | Code | Seats free/paid/blocked | Chargeable-shown-Free? |
|---|---|---|---|
| Value | VCAI | 96 / 60 / 18 | 0 of 36 — correct |
| Plus | PCAI | 156 / 0 / 18 | **36 of 36 — defect, reproduced independently** |
| Light Super Flex | SLX3 | 0 / 156 / 18 | 0 of 36 — correct |
| Value Flex | VSU5 | 0 / 156 / 18 | 0 of 36 — correct |

- **`Light Super Flex` confirmed as the zero-free-seat bundle**, matching the domain reference exactly:
  every non-blocked seat is paid, no free tier at any price.
- **Resolved, not a defect** (human decision, Mohanad Dawood, 2026-09-27): `Light Super Flex` (834 EGP,
  15KG BULK baggage) and `Value Flex` (1,996 EGP, 30KG PDBG baggage) are genuinely different bundles —
  confirmed from the `booking/seat-map` request bodies, which carried different `bundleCode`s and
  prices — yet produced a **byte-identical** seat map (same 156 paid / 18 blocked, same exact three
  price tiers: 18 @ 1,668, 36 @ 642, 6 female-designated @ 232). **Accepted as expected on this staging
  credential** (`Fly Nas NDC EGY Staging`), consistent with the existing staging caveat (domain
  reference OQ-21/OQ-25) — not raised as a defect from this environment. Would need re-verification on
  a production credential to confirm both bundles genuinely differentiate seat entitlement there.

**TC-SM-BND-002 ("changing the fare package recalculates the seats") — attempted at the time, resolved
2026-09-27 (§3.10):** Assigned a plain free seat (`2A`, not chargeable) to the lead adult under `Plus`,
then went back to step 1 and downgraded to `Value`. The downgrade itself completed (fare updated to the
`Value` price), but advancing back to step 2 then failed twice with **`booking/ssr-quote` → HTTP 400
"The requested flight or class is no longer available. The requested class of service is sold out."`**,
and the wizard **silently stayed on step 1 with no visible error message** to the agent (no toast, no
inline error). Screenshot: `DEFECT-BND002-stuck-after-downgrade.png`.
- The sold-out condition itself is a legitimate, timing-dependent supplier state (this offer had been
  held open across many prior bundle switches) and is **not** being raised as a defect.
- **The silent failure to advance, with no error surfaced, is worth raising separately** — it is the
  same class of problem as the already-documented V6-12 (a rejected `book-and-pay` also fails with no
  UI signal). Recorded as an observation, not rolled into this case's own result.
- **The case's own question was answered by the business, not by re-observing it** — see §3.10.

**Second flight, XY-566 (fresh party: Youssef/Salma/Sami Naguib)** — used to test **TC-SM-RND-007**:
- Selected deliberately from a **different card**: `flynas KSA` credential (not `FlyNas Egy`), RBD `H`
  (not `E6`), departing 09:40 (not 10:20). The Price Update dialog reproduced again identically in
  shape (7,910 → 9,478 EGP). No toast appeared and the wizard reached step 2 cleanly this time.
- The seat map's `data-seat-id` `flightKey` confirmed a genuinely different flight instance
  (`NA_CAI_20261015T094000_JED_20261015T120500` vs the first flight's 10:20 departure), but the map
  itself was **structurally identical** — 174 seats, 29 rows, A–F columns, same state buckets under the
  same bundle. Consistent with both flights sharing the same aircraft type (A320NEO); does **not**
  prove or disprove rule 25's "different flight → different map" claim, since a genuinely different
  aircraft type was never reached this session (would need the connecting RUH itinerary). Recorded as
  **Inconclusive**, not Passed. *(Resolved to Passed 2026-09-27 — see §3.3.)*

**Session/environment observations, not scored against any case:**
- A fresh search (not a `?search=` replay) returned HTTP 200 with a genuinely **empty** offer set
  (`"offers":{}`) after a ~21-second supplier round trip, then succeeded on an immediate retry with
  identical criteria. This is a new variant of the already-accepted "no flights found" masking
  behaviour (OQ-31) — here the search itself was slow and came back genuinely empty, rather than
  erroring — and is not raised as a new defect, consistent with the business's 2026-09-17 acceptance.
- The Portal session logged itself out once during this extension (after roughly 45–50 minutes of
  continuous activity), redirecting a full-page navigation to `/auth/login`. Consistent with the
  already-documented Admin session-expiry pattern, now also observed on the Portal.

## 3.7 Extended session — round-trip, multi-passenger, multi-city, business-cabin, exit-row clusters (2026-09-27)

Continued the same run, still Portal-only, still no `Book` pressed. Covers 26 further cases across six
new bookings. Full per-case notes are in `ManualTestResults.csv`; this section carries the narrative. No
new defect was confirmed in this extension — an apparent exit-row defect was found, then corrected
against live flynas.com production evidence (see the exit-row write-up below).

**Round-trip (2 adults, mixed bundles per leg)** — `TC-SM-RTP-001/003/004/005`, `TC-SM-MPX-002/004/006/007`,
`TC-SM-RND-010`, all Passed. Confirmed: one seat map per journey (not hard-coded outbound/return); a
journey's bundle governs only that journey's seat pricing (Value → mixed free/paid, Plus → all free on
the same booking's return leg); seat maps are fully independent per leg; the seat-goes-to-selected-
passenger and double-booking-prevention contracts (`selected-other` class, disabled "Assigned to another
passenger" button) both hold; partial assignment (1 of 2 seated) is accepted and confirmable. `TC-SM-RTP-005`
also reproduces the suite's own documented KNOWN FAULT (merged single-line fare breakdown across
journeys) exactly as described — not logged as a new defect.

**Multi-city (3 journeys, one naturally connecting via DMM)** — `TC-SM-MCT-003/007` Passed: 4 actual
flights (CAI-JED, JED-DMM, DMM-RUH, RUH-CAI) produced 4 seat maps/baggage panels/meal boxes but only 3
fare-bundle tabs, with the connecting journey's single bundle (`Plus`) correctly applied to both of its
flights (confirmed via the JED-DMM seat map: header "Trip 2 · Leg 1", 180 seats, "All seats free").
`TC-SM-MCT-006` Inconclusive *(resolved to Passed + enhancement 2026-09-27, §3.3)*: baggage panels were separate and correctly labelled (Trip 1/2/3), not
merged into one unlabelled panel as the suite's KNOWN FAULT describes, but the 4 options were identical
in name and price across journeys — a partial match to the original finding, flagged for reconciliation
rather than logged as fresh. `TC-SM-MCT-004/005` Skipped — both require an actual e-ticket/confirmation
page, which needs a completed booking (Forbidden, absolute).

**Business cabin vs Economy, same flight (XY568/320NEO)** — `TC-SM-CAB-001/002/003/004/005` Passed:
Economy showed 160/174 bookable seats with row 1 entirely blocked; the same flight under a Business fare
(`Premium`, RBD J) showed only 4/174 bookable and row 1 was the *only* bookable row, with the expected
1B/1E-blocked 2-2 layout; the "Not offered" Y-2 section and a single blocked seat share the identical raw
`Blocked` state, distinguished only by the section header text. `TC-SM-CAB-007` Inconclusive *(reclassified Blocked 2026-09-27, §3.3)*: the
Business row still carries `seat--cabin-economy` and a "Cabins: Economy" legend — reproduces the
predicted staging mislabel, but no correctly-labelled reference existed this pass to confirm it
independently.

**Exit-row safety rule (2 adults + 1 child + 1 infant, flight XY584)** — full write-up below.

#### TC-SM-EXR-001 through TC-SM-EXR-005, TC-SM-EXR-007 — exit-row eligibility

`TC-SM-EXR-001` (Passed): a solo adult (Karim Fouad, no child/infant anywhere in the PNR) had every
exit-row seat (11A-12F) rendered `seat--free`, and the full inspect → book → confirm flow completed on
11A (button changed to "Change Seats"). This is the suite's own required baseline and it held cleanly.

`TC-SM-EXR-002` (Passed, with a UX gap noted): in a 4-pax PNR with the infant assigned to Hany, seat 11A
was `seat--unavailable` for Hany, and the details panel read only *"Seat 11A is blocked... Seat
unavailable"* — a bare refusal, no stated reason. The refusal itself is correct.

`TC-SM-EXR-003`, `TC-SM-EXR-004`, `TC-SM-EXR-005` — **initially logged Failed, then corrected to Passed
against live production evidence.** Full account below.

**What was observed in the Portal** (flight XY584/320NEO, CAI→JED, 15/10/2026, bundle `Plus`; PNR: Hany
Zaki + Ahmed Ali (Adults), Sara Zaki (Child), Omar Zaki (Infant, assigned to Hany)): seat 11A rendered
`seat--unavailable` for **all three** seat-holding passengers — Hany (infant-linked), Ahmed (no infant
linked), and Sara (Child) — from the very first render, with no passenger-specific distinction. Re-linking
the infant from Hany to Ahmed (via the Infant panel's "Assigned to" dropdown) did not move or clear the
restriction for either adult. A control check confirmed the rest of the map was unaffected (150/162
non-exit seats stayed `seat--free` for Ahmed throughout) — the restriction is specific to the exit row,
not a general map fault.

**Why this is not a defect** (corrected 2026-09-27, human decision, Mohanad Dawood, 2026-09-27). The exit-row restriction for
children and infant-holders is **not enforced in the UI at all**. Whether an exit seat shows open or blocked
in the seat map depends on **that flight's inventory**, not on who is in the party. The live flynas.com
screenshots the operator supplied show exit rows 11–12 "Restricted" for Ahmad Mahmoud and Rawan Ahmad as
well, neither of whom holds an infant, so the block seen here is the flight, not a party-wide rule. When an
exit seat is open and an infant-holder or a child takes it, **the airline rejects the booking** — the same
behaviour as the baggage clash (`TC-SM-CNF-016`) and rule 62 (`TC-SM-PAX-008`).

*(An earlier version of this section concluded that "any infant in the party blocks the exit row for the
entire party". That was wrong and is withdrawn — it read a flight-inventory block as a rule.)*

**Conclusion**: the Portal behaves as designed. `TC-SM-EXR-003`, `TC-SM-EXR-004` and `TC-SM-EXR-005` stay
**Passed** (human decision, Mohanad Dawood, 2026-09-27). Their expected results should be corrected at the test-design level: the UI
does not block exit seats by passenger; an ineligible passenger on an open exit seat is rejected by the
airline at booking. Not verified by a completed booking on this run.

**Evidence**: `manual_execution/artifacts/portal/EXTERNAL-flynas-website-exitrow-restricted-pax1-with-infant.png`,
`...-pax2-no-infant.png`, `...-pax3-no-infant.png` (human-provided, live flynas.com, 2026-09-27);
`manual_execution/artifacts/portal/exr-pnr-wide-block-ahmed-relinked.png` (Portal, same behaviour);
`manual_execution/artifacts/portal/exr-001-adult-alone-exit-seat-booked.png` (Portal control — solo
booking, no infant, exit row fully bookable).

`TC-SM-EXR-007` (Excluded, §3.5; was Not Executed): requires giving an adult a confirmed exit seat *before* any infant exists
on the PNR, then adding an infant afterwards. This app fixes passenger counts at the search step with no
way to add a passenger to an already-created booking, so the precondition could not be constructed
through the UI. Not executed this pass; unaffected by the EXR-003/004/005 correction above.

## 3.8 Final session — seat mechanics, bundles, negative/error, accessibility, passenger-model, session
expiry (2026-09-27)

Continued the same run, still Portal-only, still no `Book` pressed. This closing session cleared every
remaining case except the ones left Not Executed at the time (§3.5; now Excluded). Full per-case notes are in
`ManualTestResults.csv`; no new defect was confirmed — two prior findings were revised (below) and one
new UX/code-quality observation was logged as a note, not a defect.

**Seat mechanics, second booking (2 adults, Tarek Nour + Dina Nour, XY584, Plus)** —
`TC-SM-SEL-007/008/010/012` Passed: moving a seat (2A→2D) leaves the old seat plain-free with no
duplicate; "Clear all seats" fully resets both passengers to "Ready to choose" and the footer to
"Continue without seats" (the price-line-clears half of SEL-008 needs a paid-seat bundle to verify —
not observed on `Plus`, recorded as a residual gap, not a failure); partial (1-of-2) vs. full (2-of-2)
seat confirmation is reflected accurately in the footer button text ("Seat 1 more" vs. literal "Change
Seats"); the double-booking-prevention contract holds under DOM inspection — the blocked passenger's
button reads "Assigned to another passenger" with `disabled=true`.

**Bundle/pricing** — `TC-SM-BND-003` Passed (same evidence as `TC-SM-RTP-003`: each leg of a round trip
prices its own seats strictly from its own bundle); `TC-SM-BND-005` Passed (a fresh `Plus` booking
showed 162/174 seats free, 0 paid, matching the bundle's "Seat selection: All seats" promise). `TC-SM-
PER-002` Passed: adding a meal and baggage after a seat is booked produces three separate, additive fare
lines (seat/meal/baggage) and the seat's own price stays unchanged — with one code-quality note, not a
functional defect: selecting baggage threw an uncaught console `TypeError` (`calcBaggagePrice`,
`baggageMetaData` null) while the UI itself still updated correctly.

**Negative input handling** — `TC-SM-NEG-003` Passed: clicking a seat's "Book" button 5× rapidly
produces exactly one booked seat, no duplication, no error. `TC-SM-NEG-006` Passed: navigating directly
to `/booking/passenger-details` with a garbage `flight-token` is refused with a clean in-page "No Data
Found" / "Go Back" / "Go Home" state (confirmed via console: the underlying API call itself returned
HTTP 400) — not the literal auto-redirect the case describes, but the same safety intent (refused
access, nothing leaked, no crash page) via a slightly different, arguably clearer mechanism.
**`TC-SM-NEG-004`** was not executed (now Excluded, §3.5) — but the investigation is complete: opening a second tab
in the *same* browser triggers a "Multiple Tabs Detected / Session Protection Enabled" screen, and direct
`localStorage` inspection confirmed this guard keys off a `sessionId` value that is scoped per browser
profile, never shared across two genuinely different browsers or profiles. It cannot demonstrate — one
way or the other — whether the app enforces true concurrency safety against two independent agents; this
session's tooling has no way to launch a second, independent browser to test that directly.

**Accessibility** — `TC-SM-A11Y-001` Passed: at 375×700 (phone width), the seat chart's own container
scrolls independently (`overflow-x: auto`) while `document.body.scrollWidth` stays exactly 375 — no
whole-page horizontal slide — and the full inspect→book→confirm flow completes on the last row (29F).
`TC-SM-A11Y-002` Passed: seat `aria-label`s state availability in plain text (e.g. "available for
Free"), and the seat-detail panel's book button's only accessible name is its own text content ("Book
5A for Dina"), naming both seat and passenger.

**Passenger model (1 Adult + 1 Child + 1 Infant, Youssef/Laila/Zain Mansour)** — `TC-SM-PAX-001/003/004`
Passed: the infant is excluded from meal/baggage cards and the seat map's passenger list entirely; the
infant's own "Assigned to" dropdown offers only the Adult, never the Child; booking the Child a seat
auto-advances the active passenger to the Adult, and the just-seated Child's card correctly switches
from "Selected" to "Assigned." `TC-SM-PAX-006` Passed: fare breakdown confirms Adult and Child base fares
are identical (the Child is *not* cheaper on this airline) and the Infant carries a large base fare but
zero tax — matching the case's own stated warnings exactly (one sub-detail, the baggage panel's
per-passenger text for the infant, could not be independently re-confirmed due to a UI panel that would
not stay expanded under scripted clicks — a minor, stated gap). `TC-SM-PAX-007` Passed: only one
passenger accordion section stays open at a time; clearing the Infant's First Name and collapsing that
section still correctly blocks `Next` and sets field-level validation — but the collapsed section shows
no visible error badge on its own header, so a user must expand each section manually to find which one
is invalid (a UX gap, noted, not a failure of the core requirement). Separately observed: a collapsed
PrimeNG accordion section (`clientHeight: 0`, not `display: none`) leaves its inputs programmatically
fillable — irrelevant to a real mouse user, but worth noting for automated/assistive-tech access.

**Timing/error conditions** — `TC-SM-FRC-003` Passed: cancelling the Price Update dialog returns cleanly
to the same search-results list with the wallet balance unchanged and no booking created. `TC-SM-ERR-001`
Passed by reference to evidence already captured earlier in this run (§3.6: a genuinely empty offer set
on a slow search, and a 400 "sold out" response surfaced without a raw technical error page) rather than
a fresh, deliberately-forced repro of a timing-dependent supplier condition the business has already
accepted as known. `TC-SM-ERR-004` Passed, but **revises** the suite's own prior documented finding:
filtering one passenger's Nationality dropdown to `egy` and picking Egypt, then opening a second,
different passenger's Nationality dropdown fresh, showed the **full unfiltered 252-country list** — the
filter did not bleed across passengers as the sheet's own "What actually happened" note describes.
Flagged for the business/test-design to reconcile (likely already fixed, or build/environment-specific)
rather than logged as a live contradiction.

**`TC-SM-ERR-002` — session/offer expiry mid-passenger-details-form.** Filled Adult 1's core fields on a
fresh 1A+1C+1I booking, then left the tab genuinely idle (a real ~20-minute wall-clock wait was used
after the in-browser JS countdown was found to run far slower than real time under this tooling — see
the gap noted in §6). The offer countdown reached `00:00` and produced the same **"Time Expired / Your
session has expired"** dialog already confirmed in `TC-SM-PER-004`, now shown to also fire mid-form, with
a single "Back to Search Results" button. Clicking it returned to `/booking/flight-search` with the
**original search criteria intact**, but **all previously-typed passenger details were lost** — the flow
restarts from search results with a blank passenger-details form. This is graceful (a clear message, no
silent corruption, no broken partial booking) but does lose in-progress work; per the case's own
instruction, **the business should confirm whether this is acceptable or whether in-progress passenger
data should be preserved/restored across an offer-expiry.** Recorded Passed (the behaviour itself is not
broken); the data-loss question is carried into Recommendations (§7). Evidence gap: no screenshot was
saved of the dialog before clicking through it (§4).

## 3.9 Booking session — the 15 booking-lifecycle cases (2026-09-27)

Executed the 15 cases that were Skipped (§3.4), still on the Portal, headed browser (confirmed by the
operator before execution), logged in by the operator as Uplift2_Mohanad Dawood (AGN9809). Booking was
allowed by the operator's override (`metadata/SafetyAuthorizations.md`); both flynas credentials had
already been checked to start with `tt`. Every preparatory step ran without pausing; the operator approved
each `Book` press in session. Every passenger name and document number was new.

**Baseline**: wallet 175,140.868 EGP, outstanding 0.000; My Bookings 15 orders, newest
`AGN9809UPLUPLORD260927DUSGUG` (pre-existing, not created by this run).

**No-booking session** (one-way CAI→JED, XY584, 1 adult, `Value`):
- `TC-SM-CNF-018` — **Failed** (§3.2). Prev → Next with nothing changed keeps everything. Prev → correct
  the name → Next silently discards every seat, meal and bag; a second correction left step 2 empty and
  Next disabled with no error.
- `TC-SM-CNF-015` — **Passed**. A fresh offer (Walid Sabry) was filled in completely (seat 3D, SFML, 10Kg,
  `Value`; 5,703.91 EGP) and the page was closed without pressing Book. My Bookings stayed at 15 orders
  with no new order, and the wallet stayed 175,140.868.

**Booking A — confirmed** (round trip CAI→JED XY584 15/10 + JED→CAI XY565 20/10; 1 adult Nader Helmy,
1 child Salma Helmy, 1 infant Adam Helmy assigned to Nader; `Value` on both legs, which includes 30KG PDBG;
flynas KSA credential). The Price Update pop-up appeared as expected for an infant (11,573 → 13,141).
Extras: Nader paid seats 2D (onward) and 2A (return) at 1,097.91 each, Salma free seats 14B and 14C;
meals SFML/BBML (Nader), FALD/PRML (Salma); one 10Kg bag for Nader onward (a weight that cannot clash with
the bundle). Net Payable **20,736.82 EGP**. Book pressed 10:52 UTC after operator approval (the app then
asks "Are you sure?", confirmed). Result: order `AGN9809UPLUPLORD260927LVHJPU`, booking reference
`NDCEG-BR-F260927oiZl2l`, **PNR `VYHQKP`, Confirmed**. Wallet after: 154,405.508 EGP.

| Case | Result | Key observation |
|---|---|---|
| `TC-SM-CNF-001` | Passed | Quote 20,736.82 rounds up to the confirmation total 20,737; the e-ticket agrees |
| `TC-SM-CNF-002` | Passed | Every price line matches the pre-booking snapshot (base and tax summed per type) |
| `TC-SM-CNF-003` | Passed | Meal 540, Seat 2,195.82, Baggage 1,260, Bundle 3,600 each on their own line |
| `TC-SM-CNF-004` | Passed | Each seat on its own passenger and flight; paid seats priced, free seats unpriced (order page) |
| `TC-SM-CNF-007` | **Failed** (Low) | Infant row correct and all 4 seats correct, but the overview counter says "3 Booked Seats" (§3.2) |
| `TC-SM-CNF-008` | Passed | E-ticket and confirmation identical field by field |
| `TC-SM-CNF-010` | **Failed** | Wallet moved 20,735.36; booking total 20,737 (§3.2) |
| `TC-SM-CNF-011` | Passed | Costing parts add up to 20,736.18 = Booking = Sales = Net |
| `TC-SM-CNF-012` | **Failed** | Fare Details total does not match the wallet; no Fare Details block on the order-details page (§3.2) |
| `TC-SM-MCT-004` | Passed | Seats never appear against the other flight, on any surface |
| `TC-SM-MCT-005` | Passed | All 4 seats, 4 meals and the bag reach the confirmation and e-ticket per flight and passenger |

**Pricing is consistent; the wallet is not.** The lines sum to 20,736.18 (Costing tab), and the confirmation
and e-ticket show that sum rounded up, 20,737 — the intended rule. The Statement records a debit of
20,737.00, but the balance dropped only 20,735.36–20,735.38. The wallet is held in SAR and shown in EGP at
ROE 9 (operator); the gap points to an exchange-rate mismatch — see `TC-SM-CNF-010`.

**Booking B — failed at the airline, as intended** (one-way CAI→JED XY584 15/10; 1 adult Tamer Gaber;
`Value`, which includes **30KG Check-in Baggage (PDBG)**, plus an extra **30Kg** bag, 5,310 EGP — the
clash the sheet itself names as the reliable way to force a failure). Dashboard beforehand (Today): Total
Flights 2, Pending 0, Ticketed 2. The 30Kg option was offered and priced with no warning (Net Payable
8,476). Book pressed 11:52 UTC after operator approval. The airline rejected it: *"SSR (PDBG) is
restricted to 1 occurence(s) per passenger and leg."* Order `AGN9809UPLUPLORD260927MHROPZ`, reference
`NDCEG-BR-F260927M5bOws`, no PNR. **Wallet not charged** (154,405.508 before and after).

| Case | Result | Key observation |
|---|---|---|
| `TC-SM-CNF-016` | Passed (human decision) | The clash is offered without warning and the airline rejects it at booking — supplier behaviour, like the exit rows; not charged (§3.2) |
| `TC-SM-CNF-017` | Passed (human decision), concerns noted | Confirmation and order pages show "Failed"; My Bookings, the Dashboard and the `book-and-pay` response do not (§3.2) |

**Session observations, not scored against any case:**
- The Portal session timed out after ~45 minutes idle (between 10:54 and 11:38 UTC) and redirected to
  `/auth/login`; the operator logged in again. Same behaviour as §3.6.
- The seat-map "Book 2D for Nader" button only assigns the seat in the map; it never creates a booking.
  The real booking is the payment panel's `Book`, followed by an app dialog "Are you sure you want to book
  this flight?" — two presses for one booking.
- The confirmation page and e-ticket show each seat's raw internal state ("AvailablePaid - (Aisle seat)",
  "AvailableFree - ()") instead of a readable label or its price. Ticket Number is blank on both.
- The Statement report's balance runs about 917 EGP above the header wallet, both before and after
  Booking A — a constant offset, not caused by this run.

## 3.10 TC-SM-BND-002 resolved by business decision (2026-09-27)

**TC-SM-BND-002 → Passed.** The case's own premise — that changing the fare package *recalculates* the
seat entitlement — was wrong. The human operator confirmed the intended design: changing the bundle
**clears** the ancillaries (seats, meals, bags), and the agent re-selects them under the new bundle. It
does not recalculate them onto the existing selection.

This was not re-observed end to end this pass. The earlier 16-attempt investigation (§3.6) never reached
step 2 after a downgrade — it broke one step earlier on a sold-out `ssr-quote` response, with the wizard
stuck on step 1 and no visible error. That stuck-wizard observation is unaffected by this resolution and
stays recorded as its own item, tied to V6-12 (§3.6). It is not retried, per the operator's instruction.

**No test-case wording was edited.** Per this stage's own rule (§12 #8), a test case that turns out
wrong is escalated as a discrepancy, never corrected here — `TC-SM-BND-002`'s expected result should be
revised at the test-design level to describe the clear-and-reselect behaviour (see Recommendations).

## 3.11 Two cases added to the sheet mid-run, executed 2026-09-27 (not part of the 101-case total)

`TC-SM-PAX-008` (rule 62) and `TC-SM-PRC-005` (seat/ancillary exchange rate) were added to
`TESTCASES-SEATMAP-v7-simple.xlsx` after this pass had already started (§6, §3.10 notes). Both were
executed headed, on flynas KSA, no booking pressed for either.

#### TC-SM-PRC-005 — Seat map and ancillary prices use the right exchange rate

**Passed.** flynas KSA credential, SAR at ROE 9 (§3.9's `TC-SM-CNF-010`). Every price checked divides
into a clean SAR amount: bundles Value 900 → 100, Plus 1,746 → 194, Light Super Flex 548.91 → 60.99,
Value Flex 1,313.91 → 145.99; meals SFML/PRML/BBML 180 → 20 (FALD free); extra baggage 10/20/25/30Kg
1,260/2,718/3,798/5,310 → 140/302/422/590; a paid seat 1,097.91 → 121.99. Evidence:
`manual_execution/artifacts/portal/prc-005-seatmap-roe9.png`.

#### TC-SM-PAX-008 — Two infant-holding adults cannot sit in the same set of seats — Passed (human decision)

**Passed** (human decision, Mohanad Dawood, 2026-09-27): accepted as expected behaviour without further
testing. Like the exit rows (`TC-SM-EXR-003/004/005`) and the baggage clash (`TC-SM-CNF-016`), the app does
not block this in the seat map; the rule is left to the airline to enforce at booking.

What was observed (2026-09-27, ~16:59 UTC; one-way CAI→JED XY584, A320NEO 3-3 layout, flynas KSA, Value
bundle; adults Adel Nasr with infant Malak Nasr and Yehia Nabil with infant Karim Nabil): Adel was given
5A; 5B and 5C then still read `available for EGP 422.91` for Yehia. "Book 5B for Yehia" worked with no
warning, and "Confirm 2 seats" reached the payment step (Net Payable 12,749.82 EGP). **Book was not
pressed**, so the airline's rejection at booking was **not verified** by a completed booking on this run.

Evidence: `manual_execution/artifacts/portal/DEFECT-PAX008-two-infant-holders-same-seatset-5A-5B.png`,
`DEFECT-PAX008-confirmed-5A-5B.png` (file names kept from when it was recorded as a defect).

## 4. Evidence Inventory

| Type | Captured | Path |
|---|---|---|
| Screenshots | 20+, at key state transitions across every booking this run (search results, Price Update dialog, blocked/female-designated seats, fare breakdowns, exit-row externals, the confirmed defect, accessibility/error states) | `manual_execution/artifacts/portal/*.png` |
| DOM/decoded data | `data-seat-id` for all 174 seats decoded programmatically at multiple points (Value/Plus/other bundles) | captured in-session via `browser_evaluate`; raw JSON not persisted as a separate artifact this session — gap noted below |
| Videos | None captured | Playwright MCP screenshot-only; no session recording configured |
| Console/network logs | Not captured as files; individual console errors/network responses read and quoted inline where relevant (PER-002's `calcBaggagePrice` error, NEG-006's HTTP 400) | Not saved as a separate artifact — gap |
| Booking-session screenshots (§3.9) | 22: My Bookings baseline, TC-SM-CNF-018 before/after and both defect states, TC-SM-CNF-015 before/after, Booking A pre-book snapshot, confirmation, e-ticket, order Costing tab (with the Booking Overview), wallet Statement; Booking B Dashboard baseline, clash offered, failed confirmation, My Bookings row, order details, Dashboard after | `manual_execution/artifacts/portal/cnf-*.png`, `DEFECT-CNF018-*.png` |
| Booking-session network responses (§3.9) | `book-and-pay` and `bookingConfirm` responses for both bookings (checked: no credential, token or key fields) | `manual_execution/artifacts/portal/network/book{A,B}-*.json` |
| Notes | Captured inline in this document and the CSV `Notes` column | — |

**Gaps, stated explicitly**:
- The full 174-seat decoded arrays (all bundles) were read and reasoned over live but not saved to a
  JSON file in `manual_execution/artifacts/`. A precise re-verification of the exact 36 affected seat IDs,
  or of the full RND-002 bucket counts, would need to be re-captured from a fresh render.
- `TC-SM-ERR-002`'s "Time Expired" dialog was observed directly and its exact text captured verbatim, but
  no screenshot file was saved before clicking through it.
- This session's automated `browser_wait_for` calls were found to run far slower than real wall-clock
  time in this environment (an in-page JS countdown ticked ~51 seconds across two requested 600-second
  waits) — genuine idle-time cases (`TC-SM-ERR-002`, and the earlier organic session-expiry observation)
  were confirmed instead using a real wall-clock background wait outside the browser tool. Worth noting
  for any future automation of timing-dependent cases in this environment.

## 5. Delivery Artifacts

- `ManualTestResults.csv` — 103 rows, produced: the original 101, plus `TC-SM-PRC-005`/`TC-SM-PAX-008`
  added mid-run (§3.11), kept out of every "101-case total" figure in this document. ✅
- `ManualQAReport.md` — produced, marked as an interim checkpoint (see its own header). ✅
- `ManualQAReport.report.json` / `.html` — **not produced this session** (gap; see Summary).
- All renderings (this document, the CSV, the QA Report) agree on every status recorded — cross-checked
  programmatically when the CSV was generated from the same classification used here.

## 6. Known Limitations

1. **The entire Admin-app pass has not started.** This document, and every figure in it, covers the
   Portal application only.
2. **Two cases are Excluded — removed from scope by human decision** (§3.5): `TC-SM-NEG-004` (a
   two-browser concurrency race) and `TC-SM-EXR-007` (no UI path to add a passenger to an existing
   booking). Rule 46's cross-session race and the late-infant exit-seat case are therefore not covered.
3. **`TC-SM-BND-002` is resolved, not Not Executed** (§3.10) — the business confirmed that changing the
   bundle is meant to clear ancillaries, not recalculate them. The stuck-wizard behaviour hit during the
   16-attempt investigation (a sold-out `ssr-quote` response, no visible error) stays recorded as its own
   observation, unaffected by this resolution.
4. **`TC-SM-CAB-007` is Blocked** (§3.3) — it needs the live airline connection, which this staging
   environment does not have. The operator reports production labels the Business cabin correctly; that
   still needs confirming on the live connection.
5. **`TC-SM-PER-004`** (offer-expiry behaviour) was reproduced live and unplanned early in this run — the
   app showed an explicit "Time Expired" dialog, not a silent failure — and this same mechanism was later
   deliberately reproduced mid-passenger-details-form for `TC-SM-ERR-002` (§3.8), which surfaced a real
   product question: in-progress passenger data is lost, not preserved, when the offer expires.
6. **Group Q (13 cases) and TC-SM-MCT-004/005 (2 cases) were executed only by setting policy v1 aside**
   (human decision, 2026-09-27, `metadata/SafetyAuthorizations.md`). The policy file still says
   `BOOK`/`WALLET_CHARGE` are Forbidden; if booking on staging becomes a standing practice, the policy
   needs a new version. The two bookings are left in place — cancelling is not covered by the decision.
   `TC-SM-CNF-016`/`017` rest on one failed booking, and `TC-SM-MCT-004/005` on a 2-flight round trip
   rather than a longer multi-city trip.
7. **No HTML report companion** (`ManualQAReport.html`) was built this session (`report_builder` not
   invoked) — the Markdown QA Report is unaffected but the HTML companion is missing.
8. **`.mcp.json` runs headed** for this session at the human operator's instruction (rule 45/§11.1
   compliant) — it should be reverted to `--headless` now that Portal execution is finished, to restore
   the platform-wide default for other stages.
9. **The Playwright MCP `browser_wait_for` tool's timed wait does not track real wall-clock time
   reliably in this environment** (§4) — genuinely timing-dependent cases needed a real background wait
   outside the browser tool instead. Worth flagging for anyone automating this suite's timing-dependent
   cases going forward.
10. **Two cases added mid-run are executed but kept outside the 101-case totals** (§3.11), so the
    denominator that number was authorized against never changes: `TC-SM-PRC-005` Passed; `TC-SM-PAX-008`
    Passed by human decision. The seat map does not enforce rule 62 (2+ infant-holding adults cannot share
    a seat set); it is accepted as enforced by the airline at booking, which this run did not verify with
    a completed booking.
11. **`TC-SM-CNF-016`, `TC-SM-CNF-017` and `TC-SM-PAX-008` are Passed by human decision**, not by the
    sheet's expected results as written. `TC-SM-CNF-017` carries noted concerns (§3.2).

## 7. Recommendations

1. **Highest priority — raise the booking-session defects** (§3.2, §3.9):
   - `TC-SM-CNF-010` / `TC-SM-CNF-012`: pricing and rounding are correct throughout, but the wallet
     balance drops 1.22–1.64 EGP less than the recorded debit on every booking (3 of 3). The supplier
     credential is SAR at ROE 9, and every price checked matches 9 exactly; get the SAR amount actually
     debited from the wallet transaction record to confirm the rate used for the debit.
   - `TC-SM-CNF-018`: correcting a passenger name silently discards all seats, meals and bags.
   - `TC-SM-CNF-007` (low priority): "Booked Seats" counts passengers, not seats.
2. Raise **TC-SM-PRC-002** (§3.2) to the business — a clean, systematic reproduction of a documented,
   dated ruling violation.
3. **Ask the business to confirm the offer-expiry data-loss behaviour found in `TC-SM-ERR-002`** (§3.8):
   in-progress passenger details are fully lost, with no recovery path, when the offer countdown expires
   mid-form. Decide whether that's acceptable or whether the entered data should be preserved/restored.
4. **Correct the test-sheet wording for TC-SM-EXR-003/004/005** (§3.7) — they expect the UI to block exit
   seats per passenger. It does not: exit-seat availability depends on the flight's inventory, and an
   ineligible passenger on an open exit seat is rejected by the airline at booking. Left as-is, they will
   re-flag a false defect on every future run.
5. **Correct or reconcile `TC-SM-ERR-004`'s documented finding** (§3.8) — this pass found the Nationality
   filter does *not* bleed across passengers, contradicting the sheet's own recorded prior observation.
6. **Raise the TC-SM-MCT-006 enhancement** (human decision, 2026-09-27): baggage options are identical in
   name and price across journeys of a multi-city trip. Panels are already per journey and labelled.
7. **Correct the test-sheet wording for TC-SM-ERR-005**: the connection name on a card is a free-text
   display name, not a production/staging indicator.
8. **Run TC-SM-CAB-007 on the live connection** when one is available, since it is Blocked on staging.
9. **Proceed to the Admin-app pass** — the Portal pass is now complete (93 Passed / 5 Failed / 1 Blocked /
   0 Skipped / 0 Not Executed / 0 Inconclusive / 2 Excluded), per the human's still-standing decision to
   cover both applications in this run.
10. **Ask test design to clarify `TC-SM-CNF-012`'s "order's details page"**: the Portal order-details page
   has no Fare Details block; the block is on the order's confirmation page.
11. **Decide on the two staging bookings** (`VYHQKP`, and the failed `AGN9809UPLUPLORD260927MHROPZ`):
    cancelling them was not authorised and they were left in place.
12. **Correct `TC-SM-BND-002`'s expected result at the test-design level** (§3.10): it currently asks
    whether changing the bundle *recalculates* the seats; the business confirms it should *clear* them
    instead, requiring the agent to re-select. As written it would re-flag correct behaviour as a defect.
13. **Raise `TC-SM-CNF-017`'s concerns as an improvement** (§3.2): a failed booking looks ordinary in My
    Bookings, counts as Pending on the Dashboard, and `bookingConfirm` returns `paymentStatus: true` for it.
14. **Correct the expected results of `TC-SM-CNF-016` and `TC-SM-PAX-008` at test design**: both are
    enforced by the airline at booking, not blocked in the seat map or ancillary step.
