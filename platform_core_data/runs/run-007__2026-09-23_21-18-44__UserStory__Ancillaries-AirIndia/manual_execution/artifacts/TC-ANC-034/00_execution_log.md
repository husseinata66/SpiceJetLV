# TC-ANC-034 — Execution log (Admin, Booking-Mid Office, one-way, no ancillaries, boundary case, DEL-DXB)

- **Executed:** 2026-10-01, ~14:44–15:19 UTC · Admin `ANCILLARIES_STG` (`http://192.168.1.213`) · Branch **NDC2_Ahmed Alhussieny (BRN297)**, no Agency/Agent selected
- **Mechanism:** Playwright MCP, headed, session via `BrowserDriver`-generated storage-state (`save_session.js` + `.mcp.json --storage-state`). Forms filled with batched `browser_run_code_unsafe`/`pressSequentially`; Book / Confirm-Book were separate visible clicks.
- **Safety:** BOOK / PAYMENT / WALLET_CHARGE on a SelfCreated booking → `Allowed` (`AUTH-PLATFORM-*-SELFCREATED`).
- **Proposed status: Passed.**

## Booking of record

Airline/GDS PNR **H9ZK7E** · Booking Ref `NDCEG-BR-F2610016IzruB` · Order/Trip `BRN297NDCORD261001JQUISB` · Confirmed 01 Oct 2026 15:02 UTC.
One-way, 1 stop: DEL→JAI→DXB (IX-8106, IX-195), 20 Oct 2026.
**2 Adult, 2 Child, 2 Infant returned 200 offers directly on this one-way route** — no fallback to 1A/1C/1I needed (unlike TC-ANC-005's round-trip on the same route, which required the fallback). Booked the cheapest, **24,742 EGP** total — **no ancillaries selected for any passenger**.
Passengers: TestAdultSeven One/Two (Adults), TestChildSeven One/Two (Children), TestInfantSeven One/Two (Infants, assigned to Adult One/Two respectively).

## Steps

| # | Step | Result | Detail |
|---|---|---|---|
| 1 | Booking-Mid Office → Branch | Pass | Branch BRN297 selected via `/booking/flight-search` |
| 2 | Search one-way, 1-stop, DEL-DXB, 2A/2C/2I | Pass | 200 offers returned directly (no fallback needed). Booked cheapest, IX-8106/IX-195, 24,742 EGP |
| 3 | PAX, Bundle, Ancillaries — select nothing | **Pass** | Stepper: Passenger Info → Bundles → Ancillaries. **Bundle dropdown is itself required** (`Select Bundle *`) but offers a free "DEL" option (0 EGP for Adult/Child/Infant) distinct from the paid "Value Pack" — selected "DEL" to satisfy the required field while adding zero charge. **Meal/Baggage dropdowns carry no asterisk (optional)** — left all 4 Adult/Child passengers' "Choose a meal"/"Choose a baggage" unset. Net Payable stayed exactly 24,742 EGP throughout both steps, confirming zero ancillary charge before booking |
| 4 | Payment → confirmation | Pass | Wallet before: 8,780,111.19. Confirm Booking → Book → Confirmed |
| 5 | Confirmation vs step 3 | **Pass** | All 6 passengers: Meal "-", Seat "-", Bundle "-" — zero ancillary entries anywhere, including the 2 Infants (unaffected, as the test case specifies). Fare: Base 9,658 + Taxes 15,234 + Service 150 − Discount 300 = **24,742 ✓**, no Meal/Baggage/Bundle line item at all |
| 6 | Supplier Retrieve `H9ZK7E` | **Pass** | HTTP 200. `passengersSelectedAncillaries: {}` and `priceDetails.totalAncillariesAmount: 0 INR` — supplier confirms zero ancillaries. ROE 0.5: Base 18,116→9,058 (+600 Markup = 100/pax×6, **ANC-55 confirmed**: Markup applies regardless of ancillary selection), Taxes 30,468→15,234 (exact). Full reconciliation: 9,058+600+15,234+150−300=24,742 ✓. Full detail: `06_supplier_retrieve_reconciliation.md` |
| 7 | Search Booking → Passenger/Ancillaries | **Pass** | Branch + Booking Ref → 1 row `BRN297NDCORD261001JQUISB`. Booking Details page shows **no "Segment Ancillaries" section at all** — the section is entirely absent when a booking has zero ancillaries (consistent absence, not a defect). Passenger table (Title/Name/Type/DOB/Nationality/Ticket/Status) shows all 6 passengers "Booked" |
| 8 | Costing & Payment | **Pass** | Total Booking = Total Sales = **24,742**. Total Net = **24,292** (= supplier total post-ROE: 9,058 Base + 15,234 Taxes, no ancillary component, before Admin's own Service/Discount). Total Profit = **450** = Markup(600) + Service(150) − Discount(300) ✓ |
| 9 | Five Admin reports | **Pass** | **Total Due to NDC:** Invoice `INVNDC261001nxdc0j`, 24,742 ✓. **Sales:** Txn `NDCEG-TR2610013Ry66L`, Payable 24,742.00 · Markup 0.00 · Sales 24,742.00 ✓. **AR Ledger:** PNR H9ZK7E, Credit 24,742, Running Balance 7,780,111.19 → **7,755,369.19** ✓. **Wallet History:** `NDCEG-TR2610013Ry66L`, 24,742 ✓. **Agency Wallet:** Top-up Balance **7,755,369.19** ✓ (matches AR Ledger exactly). "Last Transaction Date" still stale (2026-07-13), same Note as prior cases |

## Notes carried (no new disposition needed — consistent with prior cases)

- Sales report "Total Markup 0.00" despite real markup in Costing (Profit 450) — same open Note as prior cases.
- AR Ledger / Wallet History show the deduction under Credit, not Debit — same open Note.
- Agency Wallet "Last Transaction Date" stale — same open Note.
- Booking Details top badge "Ticketed Document" vs itinerary "Booked" vs supplier `UnKnown` — same Note C/H.

## New observations specific to this boundary case (no defect — documented behavior)

- **Bundle selection is mandatory even when "no ancillaries" is the intended scenario.** The test case's own Step 3 anticipates this ("Confirm the Fare Details panel shows no Meal, Baggage, or Bundle line item (or shows them at zero)") — the free "DEL" bundle option satisfies the required field while adding exactly 0 EGP, so the end state (zero ancillary charge) matches the test case's expectation even though a selection had to be made.
- **Meal and Baggage are genuinely optional** (no asterisk) — these were left entirely unset for all 4 Adult/Child passengers, confirming the UI does not force an ancillary selection for these two categories.
- **ANC-55 (Markup applies regardless of ancillary selection) is directly confirmed**: the supplier's raw base fare (18,116 INR → 9,058 EGP at ROE 0.5) is exactly 600 EGP (100/pax × 6 passengers) lower than Admin's Base fare (9,658 EGP) — the Markup gap exists identically to every ancillary-bearing case, proving it is independent of ancillary selection.
- **Search Booking's Booking Details page omits the "Segment Ancillaries" section entirely** when a booking has zero ancillaries, rather than showing it empty. This is consistent with "no ancillary entries" and is not a defect — simply the natural absence-of-content behavior, noted here since it differs structurally from every prior (ancillary-bearing) E2E case's Booking Details page.

## Disposition

No new defect found. **Confirms ANC-55 and the test case's own zero-ancillary expectation at every checkpoint** — Confirmation, Supplier Retrieve, Search Booking, Costing, and all five Reports agree this booking has zero ancillaries, with Markup still correctly applied to the Base fare.
