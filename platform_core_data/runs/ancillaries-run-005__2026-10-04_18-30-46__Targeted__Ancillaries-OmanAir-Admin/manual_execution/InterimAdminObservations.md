# Interim Admin Observations — run-009 (Ancillaries → OmanAir, Admin)

Status: **interim working notes**, not the Stage 4M results. Formal outcomes go to `ManualTestResults.csv` and `ManualExecutionResults.md` when the run ends.

- Environment: Admin `http://192.168.1.237`, Headed, 1920x1080. Credential: OmanAir Staging. Executed 2026-10-04/05 by Claude Code with the tester (Mohanad Dawood) watching.
- Search: branch BRN298, agency AGN9809, agent Mohanad Dawood, CAI to JED, 15 Oct 2026, 1 adult + 1 child + 1 infant, Economy. 45 options, all through OmanAir Staging.
- Flight used: WY-408 / WY-673 via MCT. Two legs: CAI-MCT (leg 1) and MCT-JED (leg 2).
- Book and Hold are on step 2 and were **never pressed** by this stage (Execution Safety Policy; the human presses them).
- **Environment note:** the first attempt (2026-10-04) showed "Unable to load the seat map". The tester confirmed this was a wrong supplier-credential URL, now fixed. It is an environment fault, not a product defect, and is not counted as a failure. Evidence kept: `evidence/NAV-003_seatmap-unable-to-load-attempt1.png`.

## Group A — Getting to the seat map

| Case | Draft status | Observation |
|---|---|---|
| TC-SM-NAV-001 | Passed | Exactly two steps: "01 Passenger Info" (Traveler details) and "02 Ancillaries" (Seat selection). No third step. No Select Seat on step 1. Step 1 is named "Passenger Info", not "Passenger Info and Bundles", because OmanAir has no fare packages (note for Test Design). Evidence: `evidence/NAV-001_wizard-steps.png` |
| TC-SM-NAV-002 | Excluded — Not supported by supplier (Bundle) | The check needs a fare package, and OmanAir has none (Bundle = Not Supported). Added to the exclusions at execution on the tester's instruction: the case's `Requires` is Seat only and omits Bundle, so the capability gate did not catch it. For information only: with all passengers filled, Next went straight to step 2 with no message. Not a product failure; kept out of the pass rate. |
| TC-SM-NAV-002b | Excluded — Not supported by supplier (Bundle) | Same reason as NAV-002 (its second half needs a fare package). For information only: the empty step 1 + Next showed "Required" under the empty boxes (25) and stayed on step 1. Evidence: `evidence/NAV-002b_empty-step1-next.png` |
| TC-SM-NAV-003 | Passed | Select Seat on leg 2 (MCT to JED, WY673) opens a full-screen "Seat Map · MCT → JED · Onward · Leg 2" with the left panel, seat chart, colour key ("What the plan shows") and the bottom button. Notes: leg 1 (CAI to MCT) shows "No seat map is available for this flight segment" (supplier has no map for that leg); the title is per leg and uses "·", not "CAI -> JED - Onward". Evidence: `evidence/NAV-003_leg2_seatmap.png`, `evidence/NAV-003_leg1_seatmap_open.png` |
| TC-SM-NAV-005 | Passed | With no seat chosen the bottom button reads "Continue without seats". Pressing it closed the map, assigned no seat, left Net Payable unchanged at 28,865.4, and Book/Hold were still available. |
| TC-SM-NAV-006 | Excluded | Not supported by supplier (OmanAir supports Seat). |

## Issues for Test Design (not edited here)
- NAV-002 and NAV-002b depend on fare packages. Add Bundle to their `Requires` so the capability gate excludes them for a supplier without Bundle. This run excludes them by hand (tester's instruction), so the run's exclusions are now 34, not 32.
- Any further case found to need a capability the supplier lacks is excluded the same way and listed here.
- NAV-001 and NAV-003 expect step and title wording that assumes a fare package and a single-leg trip.
