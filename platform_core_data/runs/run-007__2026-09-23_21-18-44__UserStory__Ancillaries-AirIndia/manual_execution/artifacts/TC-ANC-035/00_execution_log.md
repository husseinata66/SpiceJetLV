# TC-ANC-035 — Execution log (Portal, round-trip, with stop, ancillaries onward-leg-only, boundary case, DEL-DXB)

- **Executed:** 2026-10-01, ~15:51–16:11 UTC · Portal `STG_PORTAL` (`http://192.168.1.213:9500`) · Agency `AGN9808`
- **Mechanism:** Playwright MCP, headed, session via `BrowserDriver`-generated storage-state (`save_session.js` + `.mcp.json --storage-state`). Session refreshed mid-session (expired — rerun `save_session.js`, then `browser_close` + navigate; succeeded on first retry this time). Forms filled with batched `browser_run_code_unsafe`; Book / Confirm-Book were separate visible clicks.
- **Safety:** BOOK / PAYMENT / WALLET_CHARGE on a SelfCreated booking → `Allowed` (`AUTH-PLATFORM-*-SELFCREATED`).
- **Proposed status: Passed.**

## Booking of record

Airline/GDS PNR **S13GWS** · Booking Ref `NDCEG-BR-F261001WbsQbw` · Order/Trip `AGN9808NDCNDCORD2610018SZQCK` · Confirmed 01 Oct 2026 16:05 UTC.
Round-trip, 1 stop each way: Outbound DEL→JAI→DXB (IX-8106, IX-195), Return DXB→COK→DEL (IX-436, IX-1816), 20–26 Oct 2026.
**2 Adult, 2 Child, 2 Infant returned "No Flights Found"** on this route/date combination — retried with **1 Adult, 1 Child, 1 Infant** per the test case's own fallback instruction, which returned offers. Booked the cheapest, **27,681 EGP** base → **35,281 EGP** total with ancillaries selected **onward only**.
Passengers: TestAdultEight One (Adult), TestChildEight One (Child), TestInfantEight One (Infant, assigned to the Adult).

## Steps

| # | Step | Result | Detail |
|---|---|---|---|
| 1 | Search round-trip, 1-stop, DEL-DXB | Pass | 2A/2C/2I: "No Flights Found". 1A/1C/1I: offers returned, all 1-stop both directions. Booked cheapest, IX-8106/IX-195 outbound, IX-436/IX-1816 return, 27,681 EGP |
| 2 | PAX Details | Pass | 3 passengers entered (1 Adult, 1 Child, 1 Infant assigned to Adult); no invalid fields |
| 3 | Bundles (not in test data scope, selected free option both ways) | Pass | Bundle is itself a required field; selected the free "DEL" option (0 EGP) for both Onward and Return, keeping the fare clean of a bundle variable so only Meal/Baggage onward-only is under test |
| 4 | Ancillaries — Meal+Baggage onward only | **Pass** | Stepper: Passenger Info → Bundles → Ancillaries. Each of the 2 Adult/Child passengers has 4 Meal dropdowns (Onward Leg 1, Onward Leg 2, Return Leg 1, Return Leg 2) and 2 Baggage dropdowns (Onward, Return). Selected **VHRB (200 EGP) on both Onward legs** and **"+5 kg Xcess Baggage" (3,400 EGP) on Onward only**, for both Adult and Child — all 4 Return dropdowns (2 meal legs + 1 baggage) left at their default "Choose a meal"/"Choose a baggage" (unset). Infant correctly shows no ancillary card at all. Net Payable: 27,681 → **35,281 EGP** (= 27,681 + 800 Meal + 6,800 Baggage), confirming the Fare Breakdown reflects only the onward selections before booking |
| 5 | Payment → confirmation | Pass | Confirm Booking → Book → Confirmed |
| 6 | Confirmation vs step 4 | **Pass** | Both ADT/CHD: Meal column lists **only** "IX 8106 - Herb Roast Vegetable Roll (VHRB)" and "IX 195 - Herb Roast Vegetable Roll (VHRB)" — the two **onward** flights; zero entries for IX 436/IX 1816 (the return flights). Extra Baggage section lists **only** "DEL-DXB / Onward" + 5 kg Xcess for both passengers — no Return entry anywhere. Infant: no Meal/Seat/Bundle/Baggage row at all. **No ancillary was silently applied to the return leg** — the system correctly accepted and preserved the asymmetric, onward-only selection. Fare: Base 12,091 + Taxes 15,590 + Meal(+) 800 + Baggage(+) 6,800 = **35,281 ✓** |
| 7 | Supplier Retrieve `S13GWS` | **Pass on totals; itemization defect (extends A, new variant)** | HTTP 200. Pax/segment data match exactly; no ancillary codes tied to return segments anywhere. ROE 0.5: Base 24,182→12,091 (exact, **no Markup** — consistent with TC-ANC-003's finding that Portal bookings carry no per-pax Markup), Taxes 31,180→15,590 (exact), `priceDetails.totalAncillariesAmount` 15,200→7,600 EGP (exact match to Meal 800 + Baggage 6,800). Full reconciliation: 12,091+15,590+7,600=35,281 ✓. **Defect A generalizes again**: each ADT/CHD's itemized `passengerAncillaries` shows `VHRB` as only 400 INR (should be 800 INR — VHRB was selected on 2 legs of the *same* direction, confirming the undercount isn't specific to onward-vs-return repeats, but to any repeated code). `PBAB` (baggage, selected only once) is correct at 6,800 INR — the clean control case. **New observation**: this time the undercount also corrupted the per-passenger `paxTotalAncillaryAmount` field (7,200 INR, i.e. the undercounted sum), not just the itemized list — the booking-level aggregate remained correct regardless. Full detail: `06_supplier_retrieve_reconciliation.md` |
| 8 | My Bookings → Segment Ancillaries | **Pass** | Reached via sidebar → My Bookings → booking details. **Journey 1 (DEL-DXB, onward)**: both Adult/Child tabs show Extra Baggage "+5 kg Xcess Baggage EGP 3400.0" and VHRB 200 EGP on both legs. **Journey 2 (DXB-DEL, return)**: both tabs explicitly display **"No Ancillaries"** — a clean, positive confirmation (stronger than a mere absent section) that the return leg carries nothing. **This independently answers the test case's own open question: Baggage (a Per-Journey capability) CAN be selected onward-only/asymmetrically on a round trip** — it is not forced to be whole-journey. No Infant tab present (consistent) |
| 9 | Costing & Reports | **Pass** | Costing tab: Total SSR Amount **7,600.00 EGP** (• Meal 800.00 + • Baggage 6,800.00), Total Booking = Total Sales = Total Net = **35,281.00 EGP** — exact match, confirming the Total reflects only the onward ancillary charges. **Total Due to NDC:** Invoice `INVNDC261001C8qrMl`, 35,281 ✓. **Sales:** Txn `NDCEG-TR2610014na4Ya`, Payable 35,281.00 · Markup 0.00 · Sales 35,281.00 ✓ |

## Notes carried (no new disposition needed — consistent with prior cases)

- No Markup on Base fare for Portal bookings — same as TC-ANC-003's finding (Admin bookings do carry Markup; Portal bookings so far have not).
- Sales report "Total Markup 0.00" — same open Note as prior cases.
- Booking Details "Agency Booking Status: Ticketed Document" vs itinerary "Booked" vs supplier `UnKnown` — same Note C/H.
- Console `TypeError: Cannot read properties of null (reading 'baggageMetaData')` logged once during baggage selection — same known transient console error as TC-ANC-003 (2/2 and now 3/3 occurrences), no functional effect observed (selection persisted correctly, totals reconciled exactly).

## Key finding: the test case's own open question is answered

**"Whether Baggage — a Per-Journey capability per ANC-48/FINDING-002 — can be selected 'onward only' on a round trip at all, or is inherently whole-journey"**: **answered — it can.** The Ancillaries step offers a genuinely independent Baggage dropdown per direction (Onward, Return), the system accepted selecting Onward only and leaving Return unset, and every downstream checkpoint (confirmation, supplier retrieve, Segment Ancillaries, Costing, Reports) consistently shows zero baggage charge/entry on the return leg. This is consistent with, and extends, TC-ANC-003/005's prior finding that Baggage is offered once-per-direction on round trips — TC-ANC-035 additionally proves the two directions' selections are independent, not mirrored.

## Defect carried forward (strengthened, not new)

**Defect A**, now shown to generalize to repeats **within a single direction** (not only across onward/return): the supplier retrieve endpoint's itemized `passengerAncillaries` undercounts an ancillary code whenever a passenger is charged it more than once, regardless of whether the repeat spans two directions or two legs of the same direction. **New refinement**: the undercount can also propagate into the per-passenger `paxTotalAncillaryAmount` field (not only the itemized list) — first observed on this booking. The booking-level `priceDetails.totalAncillariesAmount` remains correct in every case observed to date. See `06_supplier_retrieve_reconciliation.md` for the full numeric breakdown.

## Disposition

**Proposed TC-ANC-035 status: Passed.** Every checkpoint agrees: the system accepts an asymmetric, onward-only ancillary selection, charges only for what was selected, and no checkpoint shows any unexpected charge or carry-over onto the return leg. The test case's own open question about Baggage's onward-only expressibility is answered (yes). Defect A is carried forward with a further-generalized scope, not as a new defect.
