# TC-ANC-002 — Steps 6–8: My Bookings, Fare Breakdown, Reports

- **Executed:** 2026-09-29, ~12:51–12:58 UTC · Portal `STG_PORTAL` (`http://192.168.1.213:9500`) · Agency `AGN9808`
- **Mechanism:** Playwright MCP, headed. Session from `BrowserDriver.authenticate()` passed to MCP via `--storage-state`. No credential went through an MCP call.
- **Safety:** every action was read-only (`READ` → `Allowed`, `policy.categories.read.SelfCreated`, policy hash `sha256:28fd9c73b561997058e000dcd32079d5`)
- **Browser timezone:** `Africa/Cairo` (UTC+3). This matters for Observation E below.

## Step 6 — My Bookings (via sidebar) → Segment Ancillaries

Searched My Bookings by Airline PNR `Z33F4Z` (date range 2026-08-29 → 2026-09-29): 1 result, Order `AGN9808NDCNDCORD2609281VJKYT`.

| Passenger | Baggage (per journey) | Meal DEL→IXE | Meal IXE→DXB | Result |
|---|---|---|---|---|
| Ahmed TestAdultOne (ADT) | Special equipment Handling Fee 3 Pc, EGP 5,250 | VSDB Shondesh Tiramisu, 125 EGP | VSDB, 125 EGP | Matches confirmation |
| Sara TestAdultTwo (ADT) | same | VSDB, 125 EGP | VSDB, 125 EGP | Matches |
| Tom TestChildOne (CHD) | same | VSDB, 125 EGP | VSDB, 125 EGP | Matches |
| Amy TestChildTwo (CHD) | same | VSDB, 125 EGP | VSDB, 125 EGP | Matches |
| Baby / Lily (INF) | no entry | no entry | no entry | Infant exclusion holds |

- Meal is shown per leg and Baggage once per journey, the same as at selection time.
- Bundle appears at journey level as "Bundle Services: `[Xtra Pack`" (a stray `[` in the label, see Observation F). The name difference from "Value Pack" is Observation D, traced only.
- Check-in shows `30 Kilograms`, the same as the confirmation (Observation B is still open).

**Step 6 result: Pass.** Segment Ancillaries shows the same entries as the confirmation (step 4).

## Step 7 — Fare Breakdown (Costing tab)

| Pax | Net | Gross | Net (Tax) | Total (EGP) | Supplier base (INR ×0.5) | Difference |
|---|---|---|---|---|---|---|
| 2 ADT | 1,300 | 1,300 | 7,446 | 8,746 | 2×1,100 ×0.5 = 1,100 | +200 |
| 2 CHD | 1,300 | 1,300 | 7,446 | 8,746 | 2×1,100 ×0.5 = 1,100 | +200 |
| 2 INF | 4,010 | 4,010 | 190 | 4,200 | 2×3,810 ×0.5 = 3,810 | +200 |
| **Fare subtotal** | 6,610 | | 15,082 | **21,692** | 6,010 | **+600** |

- SSR: Meal 1,000 + Baggage 21,000 + Bundle 2,000 = **24,000**
- 21,692 + 24,000 = **45,692** = Total Booking / Sales / Net Amount. **Arithmetic holds.**
- Taxes match the supplier exactly for every passenger type.
- **The 600 EGP from checkpoint 1 is resolved:** it is a uniform **+100 EGP per passenger** on base fare, infants included, folded into Net/Gross with no separate Markup row. This fits the ANC-55 per-passenger Markup. The 100 EGP value has **not** been checked against the Admin markup configuration.

**Step 7 result: Pass.**

## Step 8 — Reports

| Report | Filter | Row | Amount | Result |
|---|---|---|---|---|
| Total Due to NDC | Invoice 28/09–29/09/2026, Booking Ref `NDCEG-BR-F260928ABwtpA` | Invoice `INVNDC260928dbmmnj`, Flight, Retail | Amount Payable To NDC **45,692 EGP** | Match |
| Sales | Invoice 28/09–29/09/2026, Invoice `INVNDC260928dbmmnj` | Txn `NDCEG-TR260928Akmlmo`, Supplier `IndiaAirLine` | Payable To NDC **45,692.00** · Total Markup **0.00** · Sales **45,692.00** | Match |

**Step 8 result: Pass.** Both reports include the ancillaries in the amount.

## New observations (not dispositioned — for the user)

**E. Flight and booking times are shifted by the viewer's timezone.** Booking Details shows DEL→IXE
16:35–19:30 and IXE→DXB 23:25 → 21-10 01:40. The supplier Retrieve (and the confirmation captured on the
previous machine) shows 13:35–16:30 and 20:25–22:40. That is **+3h, exactly the browser's UTC+3 offset**.
Booking Date also reads 22:37 here against 19:37 before. Likely cause: the page treats airport-local
times as UTC and converts them to the browser's timezone. Airport-local flight times should not depend on
where the agent sits. This is outside Ancillaries scope. One observation only (Reproducibility: Unable to confirm).

**G. My Bookings list "Total" leaves out ancillaries.** The list row shows **21,692.00 EGP**. The booking's
own Costing, Total Due to NDC and Sales all show **45,692**. The gap of 24,000 is exactly the SSR total
(Meal + Baggage + Bundle). The list shows the fare-only subtotal. This is ancillary-related, so it is in
scope. It is a candidate defect against the "every checkpoint shows consistent data" expectation.

**F. Minor label glitch.** "Bundle Services" renders as `[Xtra Pack`, with an unmatched `[`.

**H. Status wording (adds to C).** Booking Details shows `Status: Booked` and `Agency Booking Status:
Ticketed Document`, the confirmation showed `Confirmed`, and Retrieve shows `UnKnown`. There are no ticket
numbers (`—` for every passenger), so "Ticketed Document" looks inconsistent.

## Dispositions (user, 2026-09-29)

| # | Observation | Disposition | Effect on TC-ANC-002 |
|---|---|---|---|
| G | My Bookings list Total leaves out ancillaries | **System behavior, not a bug.** The list row is a summary; the full breakdown (45,692) shows when the booking is opened. | None — traced in Notes |
| B | Check-in allowance 30 kg vs supplier 40/30 kg (INF 10 kg in price class) | **Real issue, outside Ancillaries scope — keep as a Note** | None — traced in Notes |
| E | Flight/booking times shifted by the browser timezone (+3h) | **Outside Ancillaries scope — keep it** as an out-of-scope observation | None — traced in Notes |
| C / H | Retrieve `bookingStatus: UnKnown`; Portal Booked / Ticketed Document / Confirmed | **Keep as a Note** | None — traced in Notes |
| F | `[Xtra Pack` stray bracket | **Raise as a Low-severity UI defect** | Separate defect found during execution (below) |

### Defect draft — F (to go into ManualExecutionResults per §10.1)

1. **Test Case ID:** TC-ANC-002 (found during step 6)
2. **Execution Status:** Passed on its own Expected Result; this defect is logged against the step where it was observed
3. **Execution Time:** 2026-09-29, ~12:53 UTC
4. **Preconditions:** Portal user logged in as Agency `AGN9808`; booking `Z33F4Z` has a Bundle selected
5. **Test Data:** Order `AGN9808NDCNDCORD2609281VJKYT`, Booking Ref `NDCEG-BR-F260928ABwtpA`, Bundle VLPL "Value Pack"/"Xtra Pack", 2,000 EGP
6. **Steps Performed:** Sidebar → My Bookings → search Airline PNR `Z33F4Z` → open the order → Itinerary Details → Journey Details → Bundle Services.
7. **Expected Result:** The Bundle Services field lists the selected bundle name as clean text (e.g. `Xtra Pack`). No formatting characters from the underlying data should appear.
8. **Actual Result:** The field shows `[Xtra Pack`: an opening square bracket with no closing bracket. The bundle name itself is correct.
9. **Impact:** Cosmetic. The booking looks unfinished to the agent, but no data is wrong and no decision depends on it.
10. **Classification:** Category `UI` · Layer `Frontend` · Reproducibility `Unable to confirm` (one booking observed) · Regression `Unknown` · Suspected Component: Booking Details → Journey Details "Bundle Services" list rendering · Confidence `High` (the label shows the stray bracket in both the DOM and the screenshot)
11. **Root Cause Analysis:** Likely the bundle names arrive as an array or bracketed string and are rendered after only partial string cleanup. For example, a leading `[` is not stripped, or a JSON-like value is split on commas without removing the brackets.
12. **Conclusion:** The Bundle Services label on Booking Details shows a stray `[` before the bundle name.
13. **Severity:** Low. Reason: display-only formatting error with no effect on data, amounts, or workflow.
14. **Priority:** P3
15. **Evidence:** `08_booking_details_itinerary_dom.yml` (`listitem: "[Xtra Pack"`), `08_booking_details_segment_ancillaries.png`

### Proposed TC-ANC-002 status: **Passed**

Every checkpoint in the Expected Result is consistent. The ancillary rules (Infant exclusion; Meal per leg,
Baggage per journey) hold. Meal on the retrieve checkpoint is compared against the aggregate, per the
TC-ANC-023 decision. **Notes to carry:** D (bundle naming, traced), G, B, E, C/H (above), and defect F.

## Evidence

- `07_my_bookings_list.png` — list row with 21,692.00 EGP
- `08_booking_details_segment_ancillaries.png` — Booking Details (screenshot of the internally scrolling card, partial)
- `08_booking_details_itinerary_dom.yml` — full Itinerary + Segment Ancillaries accessibility snapshot, all 4 passengers (complete text evidence)
- `09_booking_details_costing.png`, `09_booking_details_costing_dom.yml` — Costing tab
- `10_report_total_due_to_ndc.png` — Total Due to NDC row
- `11_report_sales.png` — Sales row
- **Not captured:** video (not supported by the MCP setup), network log (the relevant values are all on screen)
