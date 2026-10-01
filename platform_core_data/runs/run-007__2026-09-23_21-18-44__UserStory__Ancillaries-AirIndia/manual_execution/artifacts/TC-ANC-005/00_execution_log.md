# TC-ANC-005 — Execution log (Admin, Booking-Mid Office, round-trip, with stop, DEL-DXB)

- **Executed:** 2026-10-01, ~13:14–14:31 UTC · Admin `ANCILLARIES_STG` (`http://192.168.1.213`) · Branch **NDC2_Ahmed Alhussieny (BRN297)**, no Agency/Agent selected
- **Mechanism:** Playwright MCP, headed, session via `BrowserDriver`-generated storage-state (`save_session.js` + `.mcp.json --storage-state`). Forms filled with batched `browser_run_code_unsafe`/`pressSequentially`; Book / Confirm-Book were separate visible clicks.
- **Safety:** BOOK / PAYMENT / WALLET_CHARGE on a SelfCreated booking → `Allowed` (`AUTH-PLATFORM-*-SELFCREATED`).
- **Proposed status: Passed.**

## Booking of record

Airline/GDS PNR **MSK5XB** · Booking Ref `NDCEG-BR-F261001XcqALn` · Order/Trip `BRN297NDCORD261001CZ0KAF` · Confirmed 01 Oct 2026 16:34 UTC.
Round-trip, 1 stop each way: Outbound DEL→JAI→DXB (IX-8106, IX-195), Return DXB→COK→DEL (IX-436, IX-1816), 20–26 Oct 2026.
**2 Adult, 2 Child, 2 Infant returned no offers on this round-trip** (per the test case's own fallback instruction) — retried with **1 Adult, 1 Child, 1 Infant**, which returned 200 offers. Booked the cheapest, **27,906 EGP** base → **51,656 EGP** total with ancillaries.
Passengers: Omar TestAdultFive, Lina TestChildFive, Mona TestInfantFive (→Omar).

## Steps

| # | Step | Result | Detail |
|---|---|---|---|
| 1 | Booking-Mid Office → Branch | Pass | Branch BRN297 selected |
| 2 | Search round-trip, 1-stop, DEL-DXB | Pass | 2A/2C/2I: "No Flights Found". 1A/1C/1I: 200 offers, all 1-stop both directions (via JAI outbound, via COK/LKO/STV/GOI return). Booked cheapest, IX-8106/IX-195 outbound, IX-436/IX-1816 return, 27,906 EGP |
| 3 | PAX, Bundle, Ancillaries | **Pass** | Stepper: Passenger Info → Bundles → Ancillaries. Bundle: **both directions**, Value Pack each (2,000 EGP total). **Infant exclusion ✓**: only 2 ancillary cards (ADT/CHD). **Meal per leg ✓**: 4 slots (2 legs × 2 directions). **Baggage once-per-direction ✓**: 2 slots (Onward, Return) — answers the test case's open question the same way as TC-ANC-003. Selected VHRF (free) + VSDB (125 EGP) meals and "Special equipment Handling Fee 3 Pc" (5,250 EGP) baggage for both passengers |
| 4 | Payment → confirmation | Pass | Wallet before: 8,831,767.19. Confirm Booking → Book → Confirmed |
| 5 | Confirmation vs step 3 | **Pass** | Both ADT/CHD: 4 meal lines (VHRF/VSDB per leg), baggage per direction (5,250 EGP × 2). Both legs' Bundle: "Xtra Pack" (traced-only label, Note D). Infant: `-` Meal/Seat/Bundle, no baggage row. Fare: Base 12,391 + Taxes 15,590 + Service 75 + Meal 750 + Baggage 21,000 + Bundle 2,000 − Discount 150 = **51,656 ✓** |
| 6 | Supplier Retrieve `MSK5XB` | **Pass** | HTTP 200. Pax/segment data match exactly. ROE 0.5: Base 24,182→12,091 (+300 Markup = 100/pax×3), Taxes 31,180→15,590 (exact), Ancillaries 47,500→23,750 (exact). Full reconciliation: 12,091+300+15,590+75+23,750−150=51,656 ✓. **Defect A generalizes**: itemized `passengerAncillaries` undercounts SBHC/VLPL/VSDB by exactly the repeat factor (2 directions) — aggregate totals remain correct. Full detail: `06_supplier_retrieve_reconciliation.md` |
| 7 | Search Booking → Passenger/Ancillaries | **Pass** | Branch + Booking Ref → 1 row `BRN297NDCORD261001CZ0KAF`. Booking Details → Segment Ancillaries, both journeys: baggage/meal match confirmation exactly for both passengers. Status "Booked" vs top badge "Ticketed Document" (Note C/H). Bundle "[Xtra Pack" (Note F, same as prior cases) |
| 8 | Costing & Payment | **Pass** | Total Booking = Total Sales = **51,656**. Total Net = **51,431** (= supplier total post-ROE, before Admin's own Service/Discount). Total Profit = **225** = Markup(300) + Service(75) − Discount(150) ✓. Invoice `INVNDC261001UIH8Ka`, Received 51,656.00 |
| 9 | Five Admin reports | **Pass** | **Total Due to NDC:** Invoice `INVNDC261001UIH8Ka`, 51,656 ✓. **Sales:** Txn `NDCEG-TR261001cIj9js`, Payable 51,656.00 · Markup 0.00 · Sales 51,656.00 ✓. **AR Ledger:** PNR MSK5XB, Credit 51,656, Running Balance 7,831,767.19 → **7,780,111.19** ✓. **Wallet History:** `NDCEG-TR261001cIj9js`, 51,656 ✓. **Agency Wallet:** Top-up Balance **7,780,111.19** ✓ (matches AR Ledger exactly). "Last Transaction Date" still stale (2026-07-13), same Note as prior cases |

## Notes carried (no new disposition needed — consistent with TC-ANC-002/003/004)

- **Passenger-mix fallback used as designed**: 2A/2C/2I returned no round-trip offers on DEL-DXB; 1A/1C/1I did. Recorded per the test case's own instruction.
- **Baggage round-trip scoping answered**: once-per-direction (2 slots), same as TC-ANC-003's finding — the open question in this test case's own Steps is now resolved consistently across both round-trip E2E cases.
- Bundle label "Value Pack" (selection) vs "Xtra Pack" (confirmation/booking details) — traced only, not a defect (user disposition 2026-09-29, Note D).
- Sales report "Total Markup 0.00" despite real markup in Costing (Profit 225) — same open Note as prior cases.
- AR Ledger / Wallet History show the deduction under Credit, not Debit — same open Note.
- Agency Wallet "Last Transaction Date" stale — same open Note.
- Booking Details top badge "Ticketed Document" vs itinerary "Booked" vs supplier `UnKnown` — same Note C/H.

## Defect carried forward (strengthened, not new)

**Defect A** (first evidenced in TC-ANC-023 for Meal only): the supplier retrieve endpoint's itemized `passengerAncillaries` list undercounts any ancillary code that repeats across multiple segments/directions — confirmed here for Baggage (`SBHC`) and Bundle (`VLPL`) as well, on a round-trip itinerary. Aggregate totals (`paxTotalAncillaryAmount`, `totalAncillariesAmount`) remain correct throughout. See `06_supplier_retrieve_reconciliation.md` for the full numeric breakdown.
