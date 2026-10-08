# Manual QA Report - Ancillaries / OmanAir / Admin

## 1. Run Identification

Run `run-009__2026-10-04_18-30-46__Targeted__Ancillaries-OmanAir-Admin`. Targeted, Supplier Feature Ancillaries, supplier OmanAir, Admin layer. Staging, 2026-10-04 to 2026-10-05. Executed by Claude Code with the tester pressing all booking, hold and payment buttons.

## 2. Executive Summary

61 of 81 in-scope cases passed (75.3%). 8 failed, 2 are inconclusive and 10 were not executed. The seat map behaves correctly. The main problems are money and rules: paying a held booking charged the seats twice (EGP 3,166 too much), exit seats were ticketed for a child and an infant-holding adult, and two finance reports disagree.

## 3. Outcome Figures

| Status | Count |
|---|---|
| Passed | 61 |
| Failed | 8 |
| Blocked | 0 |
| Skipped | 0 |
| Not Executed | 10 |
| Inconclusive | 2 |
| Excluded | 43 |

Suite total 124; executable scope 81; pass rate 75.3% of scope, 85.9% of executed.

## 4. Requirement Coverage

Not computed: this suite has no Traceability Matrix. Every requirement is therefore reported as *not verified* by this method; coverage by test group is in the Results.

## 5. Defect Register

| ID | Title | Severity | Priority | Status |
|---|---|---|---|---|
| TC-PAH-002 | Pay after Hold charges the seats twice | High | P0 | Failed |
| TC-SM-EXR-002 | Exit seats are accepted for an adult who has an infant with them | High | P1 | Failed |
| TC-SM-EXR-003 | Exit seats are accepted for a child | High | P1 | Failed |
| TC-SM-EXR-004 | The exit-seat rule does not change when the passenger changes | High | P1 | Failed |
| TC-RPT-002 | Statement Report shows nothing for a paid, ticketed booking | Medium | P1 | Failed |
| TC-RPT-003 | Reports disagree with the booking and with each other | Medium | P2 | Failed |
| TC-SM-RTP-005 | Price breakdown does not show charges per journey | Low | P3 | Failed |
| TC-SM-NEG-006 | A broken booking link shows an error page instead of returning to flight search | Low | P2 | Failed |
| TC-SM-STA-004 | Seat feature wording is outside the case's known list | Not set | Not set. | Inconclusive |
| TC-RPT-001 | Booking Report search could not be confirmed | Not set | Not set. | Inconclusive |

## 6. Assumptions & Risks Resolved

Cases flagged as assumption-based: PAX-008 (open question OQ-37) stays unverified; the exit-seat assumption is refuted for OmanAir staging.

## 7. Known Limitations

See the Results document: multi-city form, long waits, report date box, missing ROE and price-change data, and no seat map on leg 1 of the first flight.

## 8. Recommendations

Fix the double seat charge first; then decide the exit-seat enforcement; repair the reports; update the sheet's Requires and Supplier Rule columns; void the staging bookings.
