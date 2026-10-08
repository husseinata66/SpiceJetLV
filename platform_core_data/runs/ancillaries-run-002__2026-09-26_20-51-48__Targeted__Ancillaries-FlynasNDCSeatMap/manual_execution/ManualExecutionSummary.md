# Manual Execution Summary — run-006 (Portal pass, complete)

## Execution Summary

This session executed the supplied Ancillaries & Seat Map suite (`TESTCASES-SEATMAP-v7-simple.xlsx`,
101 cases) against the **Portal** application across many bookings: the original single-passenger booking
(1 adult + 1 child + 1 infant, CAI→JED, flynas XY584), a 2-adult round-trip with mixed bundles per
journey, a 3-journey multi-city trip with a natural JED→DMM→RUH connection, a same-flight Economy-vs-
Business cabin comparison (XY568), an exit-row safety cluster (2 adults + child + infant, XY584), a
closing session covering seat-move/clear mechanics, bundle/pricing, negative-input handling, accessibility,
the infant/child passenger model, and timing/error conditions, and — on 2026-09-27 — a **booking session**
that executed the 15 booking-lifecycle cases that had been Skipped. Of the 101-case suite, 99 are in scope:
**93 Passed, 5 Failed, 1 Blocked, 0 Skipped, 0 Not Executed, 0 Inconclusive**. Two are **Excluded** —
`TC-SM-NEG-004` and `TC-SM-EXR-007`, removed from scope and commented out in the sheet by human decision, Mohanad Dawood, 2026-09-27. `TC-SM-BND-002` was resolved this same
day (§3.10 of the Results): the business confirmed changing the bundle is meant to clear the ancillaries,
not recalculate them, so it moved from Not Executed to Passed without being re-run.

The booking session was allowed by the human operator's decision to set aside policy v1's `BOOK`/
`WALLET_CHARGE` Forbidden rule on staging, after the supplier credential's API key was checked to start
with `tt`. It made **two real staging bookings**: Booking A, confirmed (PNR `VYHQKP`, 20,737 EGP, round
trip for 1 adult + 1 child + 1 infant with seats, meals, a bag and bundles), and Booking B, deliberately
built with the known 30KG baggage clash and rejected by the airline (no charge). It found **four new
defects**: pricing is correct, but the wallet balance drops 1.22–1.64 EGP less than the recorded debit on
every booking, most likely an SAR/EGP exchange-rate mismatch (`TC-SM-CNF-010`, `012`); correcting a
passenger name silently discards all seats, meals and bags (`TC-SM-CNF-018`); and "Booked Seats" counts
passengers, not seats (`TC-SM-CNF-007`, low priority). With `TC-SM-PRC-002` (chargeable seats shown free
under `Plus`), that makes five Failed cases. `TC-SM-CNF-016` (the baggage clash is left to the airline to
reject, like the exit rows) and `TC-SM-CNF-017` (the failure shows on the confirmation and order pages)
were moved to Passed by the human operator's decision; `TC-SM-CNF-017` carries noted concerns (My
Bookings, the Dashboard and the booking response do not show the failure). `TC-SM-CAB-007` is Blocked
because it needs the live connection.

**Two cases added to the sheet mid-run (§3.11) were also executed, outside the 101-case total.**
`TC-SM-PRC-005` (seat/ancillary prices at the credential's exchange rate) Passed. `TC-SM-PAX-008` (rule
62) Passed by human decision: the seat map lets two infant-holding adults sit in the same 3-seat set, and
this is accepted as left to the airline to reject at booking. No booking was made to confirm that.

## Delivery Artifacts

- `ManualExecutionResults.md` ✅ (booking session in §3.9, defect write-ups in §3.2)
- `ManualTestResults.csv` ✅ (103 rows: the original 101, plus `TC-SM-PRC-005`/`TC-SM-PAX-008` added
  mid-run, §3.11 of the Results — kept out of every "101-case total" figure in this document)
- `ManualQAReport.md` ✅ (Portal pass complete)
- `ManualQAReport.report.json` / `.html` — not produced (gap carried from earlier sessions)
- All renderings agree on every recorded status.

## Known Limitations

See `ManualQAReport.md` §7 in full. Headline: this is a Portal-only pass — the Admin-app pass has not
started. Two cases are Excluded by human decision (`TC-SM-NEG-004`, `TC-SM-EXR-007`), so the cross-session seat
race and the late-infant exit-seat case are not covered. `TC-SM-CAB-007` is Blocked: it needs the live airline connection, which staging
does not have. The 15 booking cases ran under a human decision that sets policy v1 aside; the policy file
is unchanged, and the two staging bookings were left in place (cancelling was not authorised).
`TC-SM-CNF-016`/`017` rest on a single failed booking and, with `TC-SM-PAX-008`, are Passed by human
decision rather than by their expected results as written. The Playwright MCP `browser_wait_for` tool's timed
wait did not track real wall-clock time reliably in this environment. **Rule 62** (2+ infant-holding
adults cannot sit in the same seat set) had no test case in the supplied sheet; `TC-SM-PAX-008` was
added 2026-09-27 (human instruction) and executed the same day — the seat map does not enforce it; this
is accepted as left to the airline at booking, not verified by a completed booking (§3.11 of the Results).

## Recommendations

1. Raise the booking-session defects — `TC-SM-CNF-010`/`012` (wallet vs recorded debit), `TC-SM-CNF-018`
   (name correction wipes extras), `TC-SM-CNF-007` (seat count, low priority).
2. Raise TC-SM-PRC-002 to the business.
3. Raise `TC-SM-CNF-017`'s concerns as an improvement: a failed booking looks ordinary in My Bookings,
   counts as Pending on the Dashboard, and the booking response looks like a success.
4. Ask the business to confirm the offer-expiry data-loss behaviour found in TC-SM-ERR-002.
5. Revise the expected-result wording of TC-SM-EXR-003/004/005 (airline rejects at booking; exit-seat
   availability follows the flight, the UI does not block); of
   TC-SM-BND-002 to describe clearing ancillaries on a bundle change, not recalculating them; and of
   TC-SM-CNF-016 and TC-SM-PAX-008 to say the airline rejects the booking, not the Portal.
6. Correct or reconcile TC-SM-ERR-004's documented finding (Nationality filter no longer bleeds across
   passengers on this build).
7. Raise the TC-SM-MCT-006 enhancement (baggage options identical in name and price across journeys).
8. Reword TC-SM-ERR-005: a card's connection name is free text, not a production/staging indicator.
9. Run TC-SM-CAB-007 on the live connection when one is available.
10. Clarify which page TC-SM-CNF-012 means by "the order's details page".
11. Decide what to do with the two staging bookings, and whether policy v1 needs a new version.
12. Proceed to the Admin-app pass — the Portal pass is now complete.

## Delivery Completeness

| Requirement | Status |
|---|---|
| Every test case in scope has a recorded outcome | ✅ all 103 rows present in the CSV (101 original + 2 added mid-run) |
| Every Failed/Inconclusive case documented in full | ✅ all 5 Failed cases have a full write-up (Results §3.2); `TC-SM-CNF-016`/`017` keep their entries, marked resolved Passed; 0 Inconclusive |
| Evidence captured or gap stated | ✅ — see Results §4; stated gaps: raw decoded-seat JSON not persisted, no screenshot of the ERR-002 expiry dialog, console logs not saved as files |
| CSV: one row per suite case, statuses unabbreviated | ✅ |
| QA Report coverage computed, not asserted | ⚠️ No Traceability Matrix was supplied with this externally-provided suite (Stage 3 skipped) — QA Report §4 states this as a declared gap rather than inventing requirement coverage |
| All renderings agree on every status | ✅ |

**This stage is reporting the Portal pass complete, but not the whole run.** Every case in the sheet has
now been reached; the only outstanding items are the Admin-app pass (never started, still in this run's
scope by earlier human decision) and reverting `.mcp.json` to `--headless`. Per §5.3.1 #5 (missing
upstream — no Traceability Matrix/Coverage Report), this still stops short of a terminal "Stage 4M
complete" closing message for the *whole run* — the next invocation should either start the Admin-app
pass or be told to close the run out as Portal-only.
