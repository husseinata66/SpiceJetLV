# IndiaAirLine Seat Map — Admin Run: Summary and Feedback

| | |
|---|---|
| **Run** | `ancillaries-run-009__2026-10-26_13-44-28__Targeted__IndiaAirLine-Seatmap-Admin` |
| **Feature / Supplier** | Ancillaries / `air-india` (IndiaAirLine) |
| **Credential** | IndiaAirLine ndc test (IndiaAirLineStg) |
| **Platform** | NDC Admin — `http://192.168.1.237/auth/login` |
| **Test suite** | `TestCases_AncillariesSeatMap.xlsx` (124 cases) |
| **Executed through** | Supplier Feature Runner, headless, one login by the human |
| **Dates** | 2026-10-26 to 2026-10-27 |
| **HTML report** | [AutomationExecutionReport.html](AutomationExecutionReport.html) |

The Portal run (run 010) is **not** covered here. It still holds results from before the fixes and has to be rerun.

---

## 1. Result at a glance

| Status | Cases |
|---|---|
| Passed | 63 |
| Failed | 0 |
| Blocked | 6 |
| Inconclusive | 3 |
| Not applicable | 6 |
| Excluded | 27 |
| Not run | 19 |
| **Total** | **124** |

**Pass rate: 88%** — 63 of the 72 cases that actually ran (Passed, Blocked and Inconclusive). Excluded, Not applicable and Not run cases are outside the figure.

No case failed. Every failure seen early in the run was traced to a check that misread the application, and the check was fixed. No real defect was hidden to get there.

### Result per Setup Group

| Group | What it covers | Result |
|---|---|---|
| 01 | One-way, default passengers | Passed 47 · N/A 4 · Excluded 8 |
| 03 | Women-only seats | Excluded 4 (the flight has no women-only seats) |
| 04 | Exit seat, adult | Passed 1 |
| 05 | Exit seat with a child, meals and baggage | Passed 2 · Inconclusive 2 (EXR-003, EXR-004) |
| 06 | Meals | Passed 3 · Excluded 1 |
| 07 | Exit seat, infant | Inconclusive 1 (EXR-005) |
| 08 | Different passenger sets | Passed 1 |
| 09 | Round trip | Passed 9 · N/A 2 |
| 10 | Multi-city | Skipped — the supplier has no multi-city |
| 11 | Multi-city, package per journey | Blocked 1 (RND-007) |
| 12 | Non-EGP credential | Blocked 1 (PRC-005) |
| 13 | Wallet and My Bookings | Blocked 4 |
| 14–17 | Assisted: Book, Hold, Pay after Hold | **Not run** (real money, needs the human) |

---

## 2. What is not a pass, and what it needs

### Blocked (6) — none of these is a defect

| Case | Reason | Needed to clear it |
|---|---|---|
| TC-SM-RND-007 | No multi-city flights from this supplier (0 cards) | Decide to **exclude** it |
| TC-SM-PRC-005 | No non-EGP credential in the settings | Credential name, currency and ROE (read from Master → Miscellaneous), or exclude |
| TC-SM-PER-004, NEG-006, ERR-002, CNF-015 | Wallet History shows no "End Balance" row for the Branch/Agency in the settings | The exact Branch and Agency text from Admin (with codes) and the Agent |

### Inconclusive (3)

- **TC-SM-EXR-003, EXR-004, EXR-005** are exit-seat cases for a child or an infant.
- The exit-seat rule is enforced **at booking**, not on the seat map, so the seat map alone cannot judge it.
- They can only be settled by an assisted booking attempt, run headed with the human pressing Book.

### Not run (19)

- **Group 10** (multi-city): the supplier has no multi-city trip type.
- **Groups 14–17**: the runner builds the booking and stops before Book, Hold or Pay. They spend real money and need explicit approval.

---

## 3. Human decisions applied in this run

Each one is recorded in `metadata/ApprovedScope.md` and in the report notes.

**Supplier capabilities**
- Hold: Not Supported. Pay after Hold: Not Supported.
- Meal, Baggage, Seat, Bundle: Supported.

**Excluded or not applicable**
- **Multi-city** (MCT-003 to MCT-007): excluded, the supplier has no such trip type.
- **A11Y-001 and A11Y-002**: excluded for all suppliers, they are manual accessibility checks.
- **Fare-package cases** (PRC-001, BND-002, BND-005, ML-004; BND-003 and RTP-003): not applicable. Fare packages ("DEL", "Value Pack") include no seats, meals or baggage, and differ per supplier.
- **PAX-006**: not applicable, baggage shows "Check with Airline".

**Accepted as a feature or known gap** (counted as passed, with a note)
- **PAX-007, CNF-018, RTP-005**: accepted.
- **BG-001**: baggage options with no weight (a per-piece handling fee) are accepted.
- **STA-004**: "Seat with movie view" and "Seat not suitable for child" are accepted seat features.
- **Chargeable-seat tag**: no "Chargeable seat" tag is fine as long as every selectable seat shows a price.

**Seat and package rules**
- Rows 11–12 seats tagged "Seat not suitable for child" are treated as **exit seats**. A missing tag would be a reported bug.
- The seat map is returned **1 per leg**, and the fare package is returned **1 per journey**.
- Every booking is **1 adult + 1 child + 1 infant**.

**IndiaAirLine-specific exception**
- The *Price Update* pop-up appears **only on a round trip with an infant**.
- FRC-001, 002, 003 and 005 therefore run in the round-trip group (09). This is a per-supplier setting, not a generic change, and the test sheet is untouched.

---

## 4. How the failures at the start of the run were resolved

The run began with many failures. All of them came from the checks, not the application, and were fixed in the runner:

| Misreading | Fix |
|---|---|
| Seat price read as missing, although the seat panel shows it | The price is now read from the seat panel |
| "Occupied" seats read as having no state | The Occupied state is parsed |
| Section headers read as seats | Header matching generalised |
| Meal and baggage parsers choked on a second price format (`Xcess Baggage 1,875 EGP`) | Both formats are parsed |
| A connecting trip counted as one map | Maps are counted per leg, so 4 legs mean 4 maps |
| The date picker chose the wrong month, and the return date landed on the outbound date | The calendar helpers were rewritten |
| Baggage dropdown reported "NO LIST" on a slow response | Waits and retries were added |
| Exit-seat cases (EXR-003 to 005) failed from the seat-map UI | They now report Inconclusive, because the rule is enforced at booking |
| Fare-package premises assumed the packages differ | These cases are marked Not applicable |

Two environment issues also hit the run and were treated as Blocked, not Failed:
- The environment search occasionally returned HTTP 500 or 0 cards.
- The Admin session expired several times. Logs recorded as "Not logged in" are ignored by the report.

---

## 5. Feedback and recommendations

**On the test sheet**
1. **TC-SM-RTP-001** is worded as one seat map per journey. The correct rule is one seat map per **leg** and one fare package per **journey**. The sheet should be reworded.
2. Cases that assume a fare package includes seats, meals or baggage (BND-002, BND-003, BND-005, RTP-003, ML-004, PRC-001) only suit suppliers whose packages do. Mark them as supplier-dependent.
3. Several cases are really supplier-capability questions (multi-city, women-only seats, exit rows). They should declare it in the `Requires` column so the Capability Plan excludes them before execution.
4. The sheet has no case that checks the package choice is **one per journey** in a round trip. It would be a useful addition.

**On the application (observations, not failures)**
1. **NDC Admin, step 2:** baggage options state no weight for the per-piece handling-fee items. This was accepted for this supplier.
2. **NDC Admin, wallet history:** the Branch and Agency names carry codes. The runner needs the exact text to find "End Balance".
3. **NDC Admin, add passenger:** a second submit of step 1 returned HTTP 400 on the same booking. It was only seen when the same booking was reused, and a fresh booking works. It is worth a look if users can resubmit.
4. **NDC Admin, search:** it occasionally returned HTTP 500 or 0 cards on the environment.

**On the runner**
- Results now go to `automation_execution/` (logs, `artifacts/failures/`, the HTML report) for every automated run.
- A failure screenshot now shows the problem with a red outline and banner, and the reason lists the seat numbers involved.
- The supplier-specific behaviours live in `settings.local.json` under `suppliers.air-india`, and nothing generic was changed for other suppliers.

---

## 6. Open items

1. **Branch and Agency text** for the wallet history (group 13), with codes and the Agent.
2. **Non-EGP credential** (name, currency, ROE) for PRC-005, or exclude it.
3. **RND-007**: confirm the exclusion.
4. **Assisted groups 14–17 and EXR-003/004/005**: need a headed run and a decision that real money may be spent.
5. **Portal run (run 010)**: rerun with all fixes (needs a Portal login, which must not overlap with an Admin login), then rebuild its report.
