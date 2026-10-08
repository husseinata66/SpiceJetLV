# Manual QA Report — Ancillaries & Seat Map (Air Cairo NDC) — PORTAL PASS

## 1. Run Identification

- Run: `ancillaries-run-003__2026-09-28_00-36-05__Targeted__Ancillaries-AirSMCairo`
- Scope: Supplier Feature Ancillaries → Supplier Air Cairo NDC (`air-sm-cairo`, IATA `SM`)
- Target: Portal, `http://192.168.1.237:9500`, credential `aircairo ndc test`
- Executed: 2026-09-28, headed browser, human operator logged in (Mohanad Dawood), by this pipeline's
  Stage 4M (manual-execution-skill)
- Capabilities recorded for this supplier: Hold Supported · Pay after Hold Supported · Meal Supported
  · Baggage Supported · Seat Supported · **Bundle Not Supported**

## 2. Executive Summary

This is Air Cairo's first pass. Of the 126-case sheet, **100 cases are in this run's executable
scope** — every one has a recorded outcome in `ManualTestResults.csv`. The remaining 26 are not rows
in that CSV: 22 are Excluded by the capability gate (needs Bundle, or a `business-cabin`/`ladies-only-
seats` supplier rule this supplier does not carry), 2 (`TC-SM-NEG-004`, `TC-SM-EXR-007`) are
`Review: Rejected`, and 6 (`TC-RPT-*`) are `Review: Pending`, drafted mid-run.

**One deliberate departure from the capability gate's current output**: the gate also flags
`TC-SM-CAB-001/003/004/007` as Excluded, but these four were part of this run's original approved
scope and were genuinely attempted — a live Business-cabin search was run and returned the same
Economy fares, explicitly labelled "No Business." They are reported here as **Not Executed** (a route/
environment limitation: Air Cairo sells no Business cabin on this route), not silently dropped. Only
`TC-SM-CAB-002/005` (which also need Bundle) were excluded from the start.

The seat map's core mechanics all behaved correctly: rendering, one-clean-click-then-book selection,
per-passenger and per-journey independence, partial seat assignment, double-booking prevention, meal/
baggage/seat coexistence, and the passenger validation model. **A real Hold-then-Pay booking was
completed** (PNR `8ANO44`, ticket `3812407236413`, 10,782.8 EGP): every ancillary chosen before
holding survived to the held booking, the payment, and the e-ticket, and the wallet debited to the
millieme with no gap — corroborating run-006's SAR/EGP-conversion root-cause read of the same wallet
question on flynas, since Air Cairo prices natively in EGP and shows no such gap. A second Confirmed
booking (PNR `8BG3DU`) separately confirmed meal and baggage reach the confirmation and e-ticket
correctly.

**Two negative rules were proven to be genuinely enforced by the supplier, not by the seat-map UI**:
two infant-holding adults in one seat set (`TC-SM-PAX-008`), and an infant-holder or child in an
exit-row seat (`TC-SM-EXR-002`/`003`) were each rejected by real Hold/Book attempts with specific
supplier error messages, after an initial UI-only reading had wrongly suggested nothing was blocked.
**But the seat map's own displayed state never reflects this** — `TC-SM-EXR-004`/`005` confirm the
seat's `aria-label` is byte-identical regardless of which passenger or infant-assignment is active,
which is scored as a genuine (if lower-severity) UI defect, distinct from the safety question those
two cases share with EXR-002/003.

**Confirmed defects this run**: a passenger name correction after choosing ancillaries silently
discards the held seat (`TC-SM-CNF-018`) — now confirmed on **two suppliers** (flynas in run-006, Air
Cairo here), which raises it to a Feature-level defect in the booking wizard, not a supplier
integration problem; three of four collapsed-passenger-section behaviours are wrong
(`TC-SM-PAX-007`); and a multi-city itinerary does not correctly scope baggage or per-flight pricing
(`TC-SM-MCT-003`/`006`, `TC-SM-RTP-005`). A **CORS block** on the multi-city Hold path
(`TC-SM-MCT-004`/`005`) prevented any Hold from completing on a 2-flight itinerary and is reported as
its own technical finding, not scored against either case.

**No booking-lifecycle case was left Skipped for policy reasons this run** — the staging-booking
approval was already in place from the credential check, and both the positive (Hold/Pay/e-ticket) and
negative (rejected Hold/Book) booking paths were exercised directly.

## 3. Outcome Figures

Suite total (sheet) = **126**. Executable scope this run = **100** (22 capability-gate Excluded + 2
Rejected + 6 Pending Review = 26 not in scope; see §7 for the full accounting, including the
`TC-SM-CAB-001/003/004/007` departure explained in §2 above).

| Status | Count | % of executable scope |
|---|---|---|
| Passed | 72 | 72.0% |
| Failed | 7 | 7.0% |
| Blocked | 2 | 2.0% |
| Skipped | 1 | 1.0% |
| Not Executed | 13 | 13.0% |
| N/A | 5 | 5.0% |
| **Total** | **100** | **100%** |

Pass rate over cases with a determinate Pass/Fail outcome (Passed + Failed = 79): **91.1%**.
Not Executed, Blocked, Skipped and N/A are recorded separately, exactly as `ManualTestResults.csv`
carries them, and are not folded into either the numerator or the denominator of that rate.

## 4. Requirement Coverage

**No Requirement Traceability Matrix was supplied with this run** (Stages 2–3 were skipped, and the
externally-provided suite carries no requirement-ID column). Coverage against the business rules this
suite is known to encode is stated below instead of a formal matrix — a declared gap, not an omission,
matching run-006's own treatment of the same externally-provided suite:

| Business rule / behaviour | Verified this pass on Air Cairo? |
|---|---|
| Seat map is flight-specific, one map per flight | **Verified** — four distinct maps (170/169/163/179 seats) across two aircraft/flight numbers, each matching its own rail (TC-SM-RND-001/002/003/005/006/007/010) |
| Chargeable seat must always price | **Verified** — all 170 chargeable seats carried a real price; the flynas `Plus`-bundle defect cannot reproduce here (no bundles) |
| Per-passenger / per-journey / per-flight independence | **Verified** — TC-SM-MPX-002/004/006/007, TC-SM-RTP-001/004, TC-SM-SEL-007/010/012 |
| Infant gets no seat/ancillaries; child gets both | **Verified** — TC-SM-PAX-001/003/006 |
| Booking completion (totals, lines, e-ticket, wallet, costing) | **Verified** — TC-SM-CNF-001/002/003/004/008/010/011/012, TC-PAH-002/003/004, TC-HLD-005 |
| Changes after step 1 keep the agent's choices | **Refuted this run** — a name correction discards the seat (TC-SM-CNF-018), reproducing run-006's flynas finding exactly |
| Two infant-holding adults cannot share a 3-seat set | **Enforced by the supplier at Hold/Book, not by the seat map** — TC-SM-PAX-008, confirmed by two clean retries after an earlier confounded attempt |
| Exit-row / infant restriction | **Enforced by the supplier at Hold/Book** (TC-SM-EXR-002/003) **but never reflected in the seat map's own displayed state** (TC-SM-EXR-004/005, refuted) |
| Multi-city: one seat map / ancillary set per flight | **Partly refuted** — seat maps and meals are correctly per-flight (TC-SM-MCT-003 partial); baggage and per-flight pricing are not (TC-SM-MCT-003 partial, TC-SM-MCT-006, TC-SM-RTP-005) |
| No fare packages ⇒ no bundle step | **Verified** — TC-SM-BND-006, and the 22 Bundle/business-cabin/ladies-only cases correctly excluded from scope |
| A failed Hold/Book never charges | **Verified** — every deliberately-failed attempt this run (PAX-008, EXR-002/003) left the wallet unchanged |
| A failed booking is reported as failed on every surface | **Verified** — TC-SM-CNF-017, checked against confirmation, Booking Details and Dashboard |

## 5. Defect Register

| ID | Title | Severity | Priority | Category |
|---|---|---|---|---|
| TC-SM-CNF-018 | Editing a passenger's First Name after choosing ancillaries silently discards the held seat and its fare line — now confirmed on two suppliers | High | P1 | Workflow / Data Loss |
| TC-SM-PAX-007 | Closed passenger sections: field stays editable while collapsed; two sections can be open at once; an incomplete collapsed passenger blocks Next with no visible signal on its own header | Low | P3 | Usability / Validation |
| TC-SM-EXR-004 | The exit-row/infant-restriction seat state never changes when the active passenger or infant-assignment changes — the rule is enforced downstream at Hold/Book, but the seat map gives no warning before submission | Medium | P2 | UI / Business Rule Display |
| TC-SM-EXR-005 | Same finding as TC-SM-EXR-004, exercised by re-assigning the infant between adults | Medium | P2 | UI / Business Rule Display |
| TC-SM-MCT-003 | On a 2-leg multi-city booking, the Extra Baggage panel exists only for the outbound leg — the return leg has none at all (seat maps and meals are correctly per-flight) | Medium | P2 | Workflow / Multi-city |
| TC-SM-MCT-006 | Extra baggage in a multi-city itinerary is not journey-scoped (confirms the sheet's own known-fault class; the exact shape differs — missing panel, not merged/mislabelled) | Medium | P2 | Workflow / Multi-city |
| TC-SM-RTP-005 | Seat and ancillary charges on a multi-flight itinerary are shown as one merged base-fare/tax/seat line, not itemised per journey — reproduces the sheet's own known fault exactly | Medium | P2 | Pricing / Multi-city |

Full write-ups: `ManualExecutionResults.md` (TC-SM-CNF-018's defect entry; TC-SM-EXR-002/003/004/005's
retry narrative; the multi-city section; TC-SM-PAX-007's four sub-checks).

**A technical finding sits alongside the register but is not scored against either case**: a
browser-level **CORS error** on the `fare-recheck-hold` call blocked every Hold attempt on the 2-leg
multi-city itinerary (`TC-SM-MCT-004`/`005`), before the page ever left Passenger Info. A single-flight
Hold never hit this error in this run — it appears specific to the multi-city code path, and needs a
developer's attention rather than a retest.

**A cross-supplier code-quality finding, also not scored against any case**: a `calcBaggagePrice` null-
dereference console error (first seen on flynas in run-006 under `TC-SM-PER-002`) reproduces on Air
Cairo on every baggage change, with a completely different baggage data model and a different
environment. The computed price is still correct in both cases; the error is caught by Angular's
handler rather than surfacing to the user. Low severity as observed, but a null where metadata is
expected suggests the code has a shape it does not currently expect.

**Not in the register — genuinely N/A or Not Executed on this supplier, not defects**:
`TC-SM-NAV-002`/`002b` (no in-wizard bundle step exists to gate on), `TC-SM-CNF-007` (no infant on this
particular order; already verified elsewhere), `TC-SM-CNF-016` (no weight tiers to construct the exact
baggage clash), `TC-SM-PRC-005` (no currency conversion on this supplier at all). See
`ManualTestResults.csv` Notes for each.

## 6. Assumptions & Risks Resolved

- **`TC-SM-PAX-008` (two infant-holding adults, one seat set)**: an initial UI-only reading and a first
  real Book attempt were both inconclusive or confounded (the first Book failure was caused, at least
  in part, by an unrelated invalid document number on a different passenger). Two clean retries — a
  Book and a Hold, both with the confound removed — were **consistently rejected by the supplier**,
  resolving the assumption: **the rule is real and enforced at order submission**, matching the same
  pattern already established for rule 62 and the exit rows on flynas in run-006.
- **`TC-SM-EXR-002`/`003` (exit-row restriction)**: likewise resolved from an initial UI-only Failed
  reading to **Passed**, once real Hold attempts for the infant-holding adult and the child were both
  genuinely and specifically rejected ("SPECIFIC SEAT REQUESTED NOT AVAILABLE - RESTRICTED"). The
  UI-only reading described what the seat map *offers*, not what the supplier *accepts* — a distinction
  that materially changes the verdict and is worth carrying into future runs on any supplier.
- **`TC-SM-EXR-004`/`005` are a separate question from `002`/`003`**, and are not resolved by the same
  evidence: the seat map's own displayed state was directly and repeatedly observed to never change
  per passenger or per infant-assignment. This stands as a confirmed UI defect independent of whether
  the underlying safety rule holds elsewhere (it does).
- **`TC-SM-CNF-018` is now a two-supplier finding**, not a flynas-specific one. Two suppliers, two
  environments, two currencies, two ancillary data models, identical behaviour — this raises its
  priority: fixing it once fixes it for every supplier, and no supplier-specific workaround will help.
- **The `calcBaggagePrice` null-dereference is now a two-supplier finding** for the same reason, though
  at much lower severity (no incorrect price has been observed on either supplier).
- **An early meal-price observation was withdrawn.** A first pass reported "declining a meal costs
  20.00 EGP, and no free option exists"; this was traced to a DOM-parsing mistake (the dropdown's
  code/price/name are separate elements, and their concatenated text was mis-split). A screenshot
  confirmed the real value is `SRV42` at `0.00 EGP` — a free decline option genuinely exists, the same
  as flynas's `FALD`. Not reported as a finding here; recorded only as a method note for future runs.
- **A new confirmed Supplier Rule**: Air Cairo's Document Number must be a capital `A` followed by 8
  digits, or booking validation fails. Recorded via
  `module_manager/cli.js supplier-feature supplier rules ancillaries air-sm-cairo --value
  "document-number-format-a-prefix"`. No case in the current sheet tags this rule directly.
- **The `TC-SM-CAB-001/003/004/007` scoping question** (§2) is resolved for this run: they were
  genuinely attempted, found Not Executed for a route reason, and are reported as such rather than
  silently absorbed into the capability gate's current Excluded output.

## 7. Known Limitations

1. **Portal only.** No Admin-app pass has been run against Air Cairo.
2. **`TC-SM-ERR-001` and `TC-SM-ERR-002` were never attempted this run** — both are approved and
   in-scope, but appear nowhere in `ManualExecutionResults.md`. Recorded as Not Executed with no
   further evidence; this is a genuine coverage gap for this supplier pass, distinct from every other
   Not Executed case here, each of which carries a documented reason.
3. **13 cases are Not Executed for a documented reason**: no Business cabin on this route
   (`TC-SM-CAB-001/003/004/007` — see §2's departure note), no reproducible fare-mismatch trigger
   across four attempts (`TC-SM-FRC-001/002/003/005`), no connecting-flight (as opposed to two
   independent single-flight legs) multi-city itinerary found (`TC-SM-MCT-007`), the taken-seat-still-
   viewable precondition never occurring on this supplier's data model — sold seats are removed from
   the map entirely (`TC-SM-STA-002`), and no exit-row seats on the first flight this case was
   attempted on, not independently retried on the later flight that did carry them (`TC-SM-EXR-001`).
4. **Two cases are Blocked by a genuine technical error**, not scored Pass/Fail: `TC-SM-MCT-004`/`005`
   — see §5.
5. **Six `TC-RPT-*` report cases are drafted but `Review: Pending`** — the suite has no coverage at all
   for the four reports (Total Due to NDC, Sales, Bookings, Statement). This run separately observed
   the Statement report returning "No data has been found!" for a range containing a real payment —
   recorded as an environment issue, not a product defect, and not to be re-raised on a future run.
6. **`TC-SM-NEG-004` and `TC-SM-EXR-007` are `Review: Rejected`** and were not run — the same
   disposition run-006 recorded for the same two cases on flynas.
7. **A live staging booking session was allowed** after the credential's API key was checked to start
   with `tt` (Mohanad Dawood, 2026-09-28), per the standing staging-booking rule. Two Confirmed/
   Ticketed bookings (PNR `8ANO44`, `8BG3DU`) and several deliberately-failed Hold/Book attempts remain
   on staging; cancelling was not authorised this session.
8. **`TC-BG-003` and `TC-SM-CNF-016`'s wording assumes weight tiers**, which Air Cairo does not have
   (it sells per-kilogram/equipment items instead). Both were exercised against the same underlying
   intent the cases protect, but their wording should be generalised at test design.
9. **The Statement report could not be used as wallet evidence this run** (see #5) — the wallet was
   read from the Dashboard instead, consistent with the same method note as run-006's own wallet
   verification, though for a different reason (there, a stale sidebar figure; here, a report returning
   no data).
10. This run's disposition of `TC-SM-CAB-001/003/004/007` (§2) deliberately departs from the capability
    gate's current live output; a fresh gate run will keep reporting these four as Excluded. This is a
    known, accepted divergence for this run, not an error to re-investigate.

## 8. Recommendations

1. Raise `TC-SM-CNF-018` as a **Feature-level** defect (booking wizard, not either supplier's
   integration) — now confirmed identically on flynas and Air Cairo.
2. Raise `TC-SM-PAX-007`'s three failing sub-checks to the business/dev team.
3. Raise the multi-city journey-scoping defects (`TC-SM-MCT-003`/`006`, `TC-SM-RTP-005`).
4. Investigate the CORS block on `fare-recheck-hold` for multi-flight itineraries — this fully
   prevents Hold on a 2-leg trip and needs a developer, not a retest.
5. Revise the expected-result wording of `TC-SM-EXR-004`/`005`: the underlying restriction is enforced
   by the supplier at Hold/Book (see `TC-SM-EXR-002`/`003`), but the seat map itself never re-flags or
   warns before submission — worth its own UX recommendation, separate from the safety question.
6. Generalise `TC-BG-003`/`TC-SM-CNF-016`'s wording for an item/equipment-based baggage model.
7. Close the `TC-SM-ERR-001`/`TC-SM-ERR-002` coverage gap on this supplier in a follow-up session.
8. Approve or reject the six `TC-RPT-*` report cases so report coverage can begin.
9. Decide what to do with the two live staging bookings and the several failed-booking artifacts left
   on Air Cairo staging from this session.
10. Retry `TC-SM-EXR-001` and the still-Not-Executed groups (`TC-SM-FRC-*`, `TC-SM-MCT-007`) with a
    wider spread of routes/dates before concluding they cannot be exercised on this supplier at all.
11. Raise the `calcBaggagePrice` null-dereference to a developer as a low-severity, cross-supplier code
    quality finding in a pricing code path.
12. Consider an Admin-app pass against Air Cairo, matching the Portal-then-Admin sequencing used on
    flynas in run-006.
