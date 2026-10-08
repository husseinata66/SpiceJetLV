# Manual QA Report — Ancillaries & Seat Map (Flynas NDC) — PORTAL PASS COMPLETE

> This report covers the completed **Portal** pass only. The **Admin** application pass (also decided in
> scope for this run) has not started — see Known Limitations (§7) before acting on any figure below as
> if it covered the whole run.

## 1. Run Identification

- Run: `ancillaries-run-002__2026-09-26_20-51-48__Targeted__Ancillaries-FlynasNDCSeatMap`
- Scope: Supplier Feature Ancillaries → Supplier Flynas NDC (Testing Layer Scope: UI/E2E/Regression
  In Scope; API/Contract/Integration/DB/Security/Performance Out of Scope — human decision 2026-09-26)
- Target: Portal, `http://192.168.1.70:9500`, agency AGN9809
- Executed: from 2026-09-26 18:33 UTC across several sessions, the last being the booking session on
  2026-09-27 (~10:19–11:54 UTC), by this pipeline's Stage 4M (manual-execution-skill), headed browser,
  human operator logged in

## 2. Executive Summary

Portal execution is now complete: every case in the 101-case suite has been reached except two, which were
removed from scope by human decision and are reported as Excluded (§7). A third case once Not Executed,
`TC-SM-BND-002`, is now resolved: the business confirmed changing the fare package is meant to clear
the ancillaries, not recalculate them — the Portal's own behaviour was never actually in question.

Across the full pass — the original
single-booking run, a 2-adult round-trip (mixed bundles per journey, multi-passenger seat assignment), a
3-journey multi-city trip with a natural JED→DMM→RUH connection, a same-flight Economy-vs-Business cabin
comparison (XY568), an exit-row safety cluster (2 adults + child + infant), and a closing session covering
seat-move/clear mechanics, bundle/pricing, negative-input handling, accessibility, the infant/child
passenger model, and timing/error conditions — the seat map's core mechanics all behaved as documented and
passed: rendering, per-passenger eligibility, the gender rule, paid-seat pricing, per-journey/per-flight
independence, mixed bundles per leg, partial seat assignment, double-booking prevention, and the passenger
accordion/validation model. **Before the booking session, one real defect was confirmed**: a seat marked "Chargeable seat"
renders as free of charge under the `Plus` bundle, contradicting a dated business ruling that such seats
must always carry a price (36 of 174 seats affected). An apparent second defect — the exit row blocked for
every passenger, not just the infant's linked adult — is **not a defect**: exit-seat availability depends on
the flight's inventory (live flynas.com also blocked an adult with no infant), and the infant/child exit-row
restriction is enforced by the airline at booking, not by the UI. The test sheet's expectation is what needs
correcting. A closing-session finding surfaced a real
product question rather than a defect: when the offer countdown expires mid-passenger-details-form, the
app shows a clean "Time Expired" dialog but **loses all previously-typed passenger data**, with no
recovery path — the business should confirm whether that's acceptable. A second test-sheet correction was
found: the Nationality-dropdown-filter-bleed described in `TC-SM-ERR-004`'s prior notes did not reproduce.
The seven cases previously recorded Inconclusive were all resolved on 2026-09-27, using the human
operator's clarifications and a short re-test: six Passed, one Blocked. `TC-SM-CAB-007` needs the live
connection, which staging does not have.

**Booking session (2026-09-27).** The 15 booking-lifecycle cases that had been Skipped were executed after
the human operator allowed real bookings on staging (the supplier credential's API key was checked to
start with `tt`). Two bookings were made: one **confirmed** (PNR `VYHQKP`, 20,737 EGP, round trip for an
adult, a child and an infant with seats, meals, a bag and bundles), and one **deliberately failed** at the
airline with the known baggage clash (no money taken). Seats, meals and bags all carry through correctly
to the confirmation, the e-ticket and the order, per flight and per passenger. **Four new defects**
were confirmed:
- pricing is correct everywhere, but the wallet balance drops 1.22–1.64 EGP less than the recorded debit on
  every booking (the wallet is held in SAR at ROE 9; the rates do not match) — `TC-SM-CNF-010`, `012`;
- correcting a passenger's name silently throws away every seat, meal and bag — `TC-SM-CNF-018`;
- "Booked Seats" counts passengers, not seats — `TC-SM-CNF-007` (low priority).

Two booking cases first recorded Failed were moved to **Passed** by the human operator's decision:
`TC-SM-CNF-016` (a bag that clashes with the bundle's bag is offered, and the airline rejects the booking —
supplier behaviour, like the exit rows; no money taken) and `TC-SM-CNF-017` (the confirmation and order
pages show the failure). `TC-SM-CNF-017` carries concerns: the failed booking looks ordinary in My
Bookings, counts as Pending on the Dashboard, and the booking response looks the same as a success.

**Two cases added mid-run (2026-09-27), executed outside the 101-case total.** `TC-SM-PRC-005` confirmed
every seat, meal, baggage and bundle price converts cleanly at the credential's ROE 9. `TC-SM-PAX-008`
(rule 62: two infant-holding adults must not share a 3-seat set) is **Passed by human decision**: the seat
map lets both be seated in the same set, and this is accepted as left to the airline to enforce at booking,
like the exit rows. No booking was made to confirm the airline's rejection.

**The entire Admin-app pass has not yet been started.**

## 3. Outcome Figures

Suite total = **101**; executable scope = **99** (every case treated as approved by explicit human decision; `TC-SM-NEG-004` and `TC-SM-EXR-007` later removed from scope).

| Status | Count | % of executable scope |
|---|---|---|
| Passed | 93 | 93.9% |
| Failed | 5 | 5.1% |
| Blocked | 1 | 1.0% |
| Skipped | 0 | 0.0% |
| Not Executed | 0 | 0.0% |
| Inconclusive | 0 | 0.0% |
| Excluded (removed from scope) | 2 | — |

Pass rate over cases actually executed (Passed + Failed = 98): 94.9%.

## 4. Requirement Coverage

**No Requirement Traceability Matrix was supplied with this run** (Stages 2–3 were skipped by human
authorization, and the externally-provided suite carries no requirement-ID column). Coverage against
the numbered business rules in `BUSINESS_DOMAIN.md`/`ANCILLARIES-SEATMAP.md` is stated instead of a
formal matrix; this is a declared gap, not an omission:

| Business rule | Verified this pass? |
|---|---|
| Rule 25 (seat map is flight-specific) | **Verified** — same aircraft type gives the same structure (two A320NEO flights, 174 seats); a different type gives a different map (XY402, 320DR1, 180 seats) — TC-SM-RND-007 |
| Rule 40/50 (female-designated, gender-conditional) | Verified — TC-SM-GEN-001/002/002b/004 |
| Rule 41 (`data-seat-id` per-passenger matrix) | Verified |
| Rule 44 (Chargeable seat must always price) | **Refuted this run** — see the Defect Register |
| Rule 46 (seats not held at selection) | Partially exercised — `TC-SM-NEG-003` confirmed no double-booking under rapid repeated clicks in one session; the genuine two-independent-browser race (`TC-SM-NEG-004`) is out of scope (Excluded by human decision) |
| Rule 61/V6-13 (baggage/bundle SSR clash) | **Enforced by the airline at booking** (human decision) — the clash is offered without warning and the airline rejects the booking; no charge (TC-SM-CNF-016) |
| Booking completion (group Q: totals, lines, e-ticket, wallet, costing, failure reporting) | **Partly verified** — lines, ancillaries, seats, e-ticket and Costing correct (TC-SM-CNF-001/002/003/004/008/011); failure shown on the confirmation and order pages (TC-SM-CNF-017, concerns noted); wallet reconciliation, order reconciliation and the seat count refuted (TC-SM-CNF-010/012/007) |
| Changes after step 1 keep the agent's choices | **Refuted this run** — a name correction discards all extras (TC-SM-CNF-018) |
| Rule 62 (seat-set restriction) | **Not enforced in the seat map; accepted as enforced by the airline at booking** (human decision) — not verified by a completed booking (TC-SM-PAX-008, outside the 101-case total) |
| Round-trip/multi-city unit rules (14/15/55) | **Verified** — TC-SM-RTP-001/003/004/005, TC-SM-MCT-003/007 |
| Exit-row safety rule | **Enforced by the airline at booking, not by the UI** (human decision) — exit-seat availability follows the flight's inventory; not verified by a completed booking. See §6 |

## 5. Defect Register

| ID | Title | Severity | Priority | Category |
|---|---|---|---|---|
| TC-SM-CNF-010 | Wallet balance drops 1.22–1.64 EGP less than the recorded debit (3 of 3 bookings; likely SAR/EGP rate mismatch) | High | P1 | Data Integrity |
| TC-SM-CNF-012 | The order's total is correct but does not reconcile with the wallet movement (same cause as CNF-010) | High | P1 | Data Integrity |
| TC-SM-CNF-018 | Correcting a passenger name silently discards all seats, meals and bags | High | P1 | Workflow |
| TC-SM-PRC-002 | A "Chargeable seat" renders Free under the `Plus` bundle | High | P2 | Business Rule |
| TC-SM-CNF-007 | "Booked Seats" counts passengers, not seats (includes the seatless infant) | Low | P3 | Data Integrity |

Full write-ups: `ManualExecutionResults.md` §3.2. `TC-SM-CNF-007` and `018` reproduce KNOWN FAULTs
already written in the sheet; `TC-SM-CNF-010` confirms the sheet's open note about a wallet gap on
fractional fares. `TC-SM-CNF-016`, `TC-SM-CNF-017` and `TC-SM-PAX-008` are not in the register: all three
were moved to Passed by human decision (§6).

**No further case is Inconclusive.** The seven that were have been resolved (human clarifications,
2026-09-27, plus a re-test). The ones that matter for this register:

- **TC-SM-MCT-006 — enhancement, not a defect** (human decision). Baggage panels are now one per journey
  and labelled, so the suite's KNOWN FAULT did not reproduce. The options inside them are identical in name
  and price across journeys, which is to be raised as an enhancement.
- **TC-SM-CAB-007 — Blocked, not a defect.** It needs the live connection. The Economy label on staging's
  Business section is the staging data problem the sheet itself says must not be reported, and the
  operator confirms production labels it correctly.
- **TC-SM-ERR-005 — test-sheet correction.** Each result card names its connection through a free-text
  display name (e.g. `flynas KSA`). By design it does not say whether the connection is production or
  staging, and the operator confirms that is intended.

One further item is a **product question, not a defect**, surfaced by `TC-SM-ERR-002`: when the offer
countdown expires mid-passenger-details-form, the app shows the same clean "Time Expired" dialog already
confirmed on the search-results page (`TC-SM-PER-004`) — but all previously-typed passenger data is lost,
with no recovery path. See Recommendations (§8).

One further item is a **test-sheet correction, not a defect**: `TC-SM-ERR-004` found the Nationality
dropdown filter does *not* bleed across passengers on this build, contradicting the suite's own
previously documented finding. Flagged for the business/test-design to reconcile.

## 6. Assumptions & Risks Resolved

- The 2026-09-15/17 domain reference's claim that `data-seat-id`'s fourth field is the per-passenger
  eligibility matrix (`perPaxStates`) is **confirmed** directly from the live DOM this run.
- The claim that female-designated seats are gender-conditional (open to `Ms`/`Mrs`, barred to `Mr`) is
  **confirmed** with a live before/after switch on the same seat.
- The claim that a `Plus`-bundle chargeable seat rendering `Free` is a defect (not expected behaviour)
  is **confirmed reproducible** — see the Defect Register.
- The claim that fare packages, not just prices, decide which seats are offered is **confirmed**: the same
  flight (XY568) offered 160/174 seats in Economy vs 4/174 under a Business "Premium" fare.
- The claim that seat maps split by FLIGHT while fare packages split by JOURNEY is **confirmed**: a
  connecting multi-city journey (JED→DMM→RUH) showed 3 fare-bundle tabs but 4 seat maps/baggage panels.
- **The suite's assumption about the exit-row rule is corrected** (human decision, Mohanad Dawood, 2026-09-27). TC-SM-EXR-003/004/005
  expect the UI to block exit seats per passenger. The UI does not decide this: exit-seat availability
  depends on the flight's inventory — live flynas.com blocked rows 11–12 for passengers with no infant too —
  and an infant-holder or child on an open exit seat is rejected by the airline at booking, like rule 62 and
  the baggage clash. The three cases are Passed; their expected-result wording should be revised. (An
  earlier "PNR-wide rule" conclusion is withdrawn.)
  Evidence: `manual_execution/artifacts/portal/EXTERNAL-flynas-website-exitrow-restricted-*.png`.
- **The suite's assumption about `TC-SM-BND-002` is corrected the same way.** It assumes changing the
  fare package should recalculate the existing seat selection onto the new bundle. The business confirmed
  the real design is to clear the ancillaries and let the agent re-select — a case is not a defect for
  behaving that way. `TC-SM-BND-002` is recorded as Passed; its expected-result wording should be revised.
- **Baggage clash (`TC-SM-CNF-016`) and rule 62 (`TC-SM-PAX-008`) are left to the airline, like the exit
  rows** (human decision, 2026-09-27). The Portal does not block either in the seat map or the ancillary
  step; the airline rejects the booking. Both are recorded as Passed. `TC-SM-CNF-016` was confirmed by a
  real failed booking (no charge); `TC-SM-PAX-008` was not booked, so the airline's rejection is not
  verified. Both expected results should be corrected at test design.
- **`TC-SM-CNF-017` is Passed with concerns** (human decision). The confirmation and order pages show the
  failure. Concerns: My Bookings shows no failure marker, the Dashboard counts it as Pending, the
  `book-and-pay` response has the same shape as a success, and `bookingConfirm` returns
  `paymentStatus: true` for the unpaid booking.

## 7. Known Limitations

1. Portal-only; Admin-app pass not started.
2. Two cases are Excluded — removed from scope and commented out in the sheet (human decision, Mohanad Dawood, 2026-09-27):
   - `TC-SM-NEG-004` — a race between two independent browsers for the same seat.
   - `TC-SM-EXR-007` — an exit seat already held when an infant is added later; this app has no UI path
     to add a passenger to an existing booking.
   `TC-SM-BND-002` is not among them: the business confirmed the app's clear-not-recalculate
   behaviour is by design, so it is now Passed (see §5). Its own expected-result wording should be
   corrected at the test-design level, the same as EXR-003/004/005 below.
3. `TC-SM-CAB-007` is Blocked: it needs the live airline connection, which this staging environment does
   not have. The operator reports production is correct, but that was not observed in this run.
4. Group Q (13 cases) and TC-SM-MCT-004/005 were executed on 2026-09-27 only because the human operator
   set policy v1's Forbidden rule for booking aside for this run. The policy file is unchanged. The two
   staging bookings were left in place (cancelling was not authorised). TC-SM-CNF-016/017 rest on a
   single failed booking, and are Passed by human decision, not by their expected results as written; TC-SM-MCT-004/005 on a 2-flight round trip.
5. No Requirement Traceability Matrix existed to compute coverage from (§4).
6. No HTML companion report has been generated for this run.
7. The Playwright MCP `browser_wait_for` tool's timed wait did not track real wall-clock time reliably in
   this environment; genuinely timing-dependent cases (`TC-SM-ERR-002`, and an earlier organic session
   expiry) needed a real background wait outside the browser tool instead.
8. **Two cases added to the sheet mid-run are executed but stay outside this report's outcome figures**
   (§3, §5): `TC-SM-PRC-005` Passed; `TC-SM-PAX-008` Passed by human decision — rule 62 is left to the airline
   at booking, which was not verified with a completed booking.

## 8. Recommendations

1. Raise the wallet balance mismatch (TC-SM-CNF-010/012). Check the SAR amount actually
   debited and the exchange rate used for the debit versus the one used to show the balance (ROE 9).
2. Fix the name-correction wipe (TC-SM-CNF-018): keep the agent's extras, or warn before dropping them.
3. Make "Booked Seats" count seats, not passengers (TC-SM-CNF-007, low priority).
4. Raise TC-SM-PRC-002 to the business as a confirmed defect.
5. Raise TC-SM-CNF-017's concerns as an improvement: show a failed booking as failed in My Bookings and
   the Dashboard, and return the real status in the booking response.
6. Ask the business to confirm the offer-expiry data-loss behaviour found in `TC-SM-ERR-002`: in-progress
   passenger details are fully lost, with no recovery path, when the offer countdown expires mid-form.
7. Revise the expected-result wording of TC-SM-EXR-003/004/005: exit-seat availability follows the
   flight's inventory, and the airline rejects an ineligible passenger at booking — the UI does not block. Do the same for
   TC-SM-BND-002 (clearing the ancillaries on a bundle change, not recalculating them), and for
   TC-SM-CNF-016 and TC-SM-PAX-008 (enforced by the airline at booking, not blocked in the Portal).
8. Correct or reconcile TC-SM-ERR-004's documented finding — this pass found the Nationality filter does
   not bleed across passengers, contradicting the sheet's own recorded prior observation.
9. Raise the TC-SM-MCT-006 enhancement: baggage options identical in name and price across journeys.
10. Reword TC-SM-ERR-005's expected result: the card's connection name is free text, not an environment
    indicator. Clarify which page TC-SM-CNF-012 means by "the order's details page".
11. Run TC-SM-CAB-007 on the live connection when one is available.
12. Decide what to do with the two staging bookings, and whether policy v1 needs a new version if booking
    on staging becomes standard practice.
13. **Proceed to the Admin-app pass** — the Portal pass is now complete, per the human's still-standing
    decision to cover both applications in this run.
