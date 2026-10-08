# TC-ANC-003 — Execution log (Portal, round trip, non-stop, BOM↔COK)

- **Attempted:** 2026-09-29, ~14:18–14:43 UTC · Portal `STG_PORTAL` · Agency `AGN9808`
- **Mechanism:** Playwright MCP, headed. Session from `BrowserDriver.authenticate()` passed via `--storage-state`.
- **Safety:** BOOK / PAYMENT / WALLET_CHARGE on a SelfCreated booking → `Allowed` (`AUTH-PLATFORM-*-SELFCREATED`). **No booking was made.** Execution stopped before `Book`.
- **Status proposed:** **Blocked**, at step 2. The Ancillaries (Meal/Baggage) step is not offered by the Portal booking flow today (see below).

## Step 1 — Search

| Try | Search | Result | Evidence |
|---|---|---|---|
| 1 | BOM→COK 21 Oct, COK→BOM 25 Oct, **2A/2C/2I** | **No Flights Found.** Search API returned empty `offers`, no error | `01_search_2A2C2I_no_flights.png`, `01_search_2A2C2I_response.json` |
| 2 | Same dates, **1A/1C/1I** (fallback in the test data) | 200 offers | `02_search_1A1C1I.png` |

**Passenger count actually used: 1 Adult, 1 Child, 1 Infant** (as the test data instructs).
Selected: IX-1797 BOM 05:05→COK 07:05 + IX-1798 COK 07:50→BOM 10:15, both non-stop, fare brand EC, EGP 7,127.

## Step 2 — PAX Details and Ancillaries

- PAX Details completed for all 3 passengers (infant assigned to the adult). Evidence: `03_passenger_details_filled.png`.
- The next step is **"02 Bundles"**, one mandatory bundle per direction. Options: `DEL` (0 EGP, no services) and `Value Pack` (VLPL, Adult 450 / Child 450 / Infant 0 EGP, service "Xtra Pack").
  Value Pack was selected on both directions. Evidence: `04_bundles_step.png`, `05_bundles_response.json`.
- **After Bundles there is no Next button and no Meal/Baggage step.** The flow goes straight to Payment (Net Payable 8,927 EGP = 7,127 + 4×450).
- Network: the Portal called `booking/bundles` only. It made no meal, baggage or SSR request. `fare-confirmation` returned `passengerFareCheckAncillaries: null`. Evidence: `05_fare_confirmation_response.json`.

### Isolation checks (read-only — nothing booked)

| Offer | Trip | Steps shown |
|---|---|---|
| IX-1797 EC / IX-1798 EC, BOM↔COK | Round trip | 01 Passenger Info · 02 Bundles |
| IX-1797 **BT** / IX-1798 EC | Round trip | 01 · 02 only |
| IX-1797 **SM** / IX-1798 EC | Round trip | 01 · 02 only |
| IX-1797 EC, BOM→COK | **One way** | 01 · 02 only |
| IX-8106/IX-195 EC, DEL→DXB | One way | 01 · 02 only; after choosing Value Pack there is still no Next (`06_baseline_DEL-DXB_oneway_bundles_only.png`) |
| **IX-1782/IX-813 EC, DEL→DXB 20 Oct — the same flight as TC-ANC-002** | One way | 01 · 02 only |

**Comparison with 2026-09-28 (TC-ANC-002 evidence `02_bundle_selected.png`, `03_ancillaries_selected.png`):**
on that day the same flow showed **three** steps, `01 Passenger Info → 02 Bundles → 03 Ancillaries (Meals and baggage)`,
with a **Next** button after Bundles, and Meal (per leg) and Extra Baggage (per journey) dropdowns in step 03.

**Conclusion (observed fact):** since 2026-09-28 the Portal booking flow no longer shows the Ancillaries
(Meal/Baggage) step. This holds on every route, trip type and fare brand tried, including TC-ANC-002's own flight.
So it is not specific to round trips or to BOM↔COK.
**Cause unknown (hedged):** likely an environment or configuration change (a deployment, an Admin ancillary
setting, or supplier SSR availability). It could also be an application regression. Nothing observed tells
these apart.

**ANC-48 round-trip Baggage-scoping question:** **not answered.** Baggage is not offered at all today.

## Attempt 1 disposition (user, 2026-09-29)

The missing Ancillaries step was caused by a **wrong deployment** on the environment, not by the application
under test. Attempt 1 is void, and nothing in it is recorded as a defect. Re-run requested.

## Attempt 2 (re-run after redeploy, 2026-09-29 ~15:05 UTC)

- Search BOM→COK 21 Oct / COK→BOM 25 Oct, **2A/2C/2I**: **10 offers returned** (the full mix works now, so no fallback was needed).
  Evidence: `R2_01_search_2A2C2I_results.png`.
- Chosen offer: IX-1797 EC / IX-1798 EC, both non-stop, EGP 14,254.
- **Paused before "Book Flight"**: the Claude Code auto-mode permission classifier refused the click as a
  real-world transaction. This happened even though the run's Execution Safety authorizations
  (`AUTH-PLATFORM-BOOK/PAYMENT/WALLET_CHARGE-SELFCREATED`) allow it. Resumed on the user's instruction ("TC-ANC-003 execute").
- First pass through the booking pages hit the Portal's **20-minute booking-session limit** ("Time Expired —
  Your session has expired"), because each field took its own tool call. Nothing was booked. Redone with batched
  form filling (`browser_run_code_unsafe`); Book Flight and both Book clicks stayed separate, visible steps.

### Step 2 — Ancillaries (attempt 2, 15:37–15:43 UTC)

- Stepper: **01 Passenger Info → 02 Bundles → 03 Ancillaries (Meals and baggage)**. The step is back after the redeploy.
- 6 passengers entered (2 ADT, 2 CHD, 2 INF; Baby→Ahmed, Lily→Sara); no invalid fields. `R2_02_passenger_details_filled.png`
- Bundles: one per direction, Value Pack (VLPL) both ways, Adult/Child 450 / Infant 0 EGP. `R2_03_bundles_selected.png`
- **Infant exclusion: holds.** The Ancillaries step shows cards for the 4 Adults/Children only, with no Infant rows.
- **Meal per leg: holds.** Each passenger has an Onward (BOM→COK) and a Return (COK→BOM) meal dropdown, 16 options (VSDB 125 … CAKE 350 EGP).
- **ANC-48 round-trip Baggage scoping: answered.** Baggage is offered **once per direction** (Onward and Return, separately),
  **not once for the whole round trip**. There are 10 options per direction (Special equipment 1–3 Pc, +3/+5 kg carry-on,
  +5/+10/+15 kg Xcess, handling fee 1–2 pc). This fits ANC-48 "Per Journey" if each direction counts as one journey.
- Selected, all 4 ADT/CHD: VSDB on both legs and "+ 5 kg Xcess Baggage" (1,875 EGP) on both directions. `R2_04_ancillaries_offered_dom.yml`, `R2_04_ancillaries_selected.png`
- Booking Summary: Base 2,400 + 2,400 + 3,808 · Taxes 2,727 + 2,727 + 192 · Ancillaries & SSR 19,600
  (Bundle 3,600 + Meal 1,000 + Baggage 15,000) · **Total 33,854 EGP**. The arithmetic holds.
- Console: 7 × `TypeError: Cannot read properties of null (reading 'baggageMetaData')` logged during baggage selection.
  The UI kept all 8 baggage selections and the total is correct. Noted for the booking-status issue below.

### Step 3 — Book (15:43 UTC)

- Confirm Booking dialog → Book. `fare-recheck-book` returned 33,854 → 33,854 (no change). `book-and-pay` returned 200:
  Order `AGN9808NDCNDCORD260929ULRTYZ`, Booking Ref `NDCEG-BR-F2609296wtSp3`, `paymentMethodResponse: null`.
  Evidence: `R2_05_before_book.png`, `R2_07_*.json`.
- **The booking did not complete.** The confirmation page says "Your booking is being processed. Please do not take any
  action." Status **In Progress**, Airline PNR and GDS PNR empty (`bookingConfirm`: `bookingStatus: 4`, `airlinePnr: ""`).
  It was unchanged after ~5 minutes on the confirmation page, in My Bookings (row shows 14,254 EGP) and in Booking Details
  (Agency Booking Status "In Progress"). **Wallet not debited** (1,127,926.900 EGP before and after).
  Evidence: `R2_06_confirmation_in_progress.png`, `R2_08_booking_details_in_progress.png`.
- Not re-submitted, because a second submission risks a duplicate supplier booking. Waiting for the user or dev to check this order in the backend.

**Attempt 2 outcome (checked 2026-09-30 14:22 UTC):** order `AGN9808NDCNDCORD260929ULRTYZ` is **still "In Progress"**,
with no PNR, about 23 hours later. It never completed and the wallet was never debited. It is recorded as an abandoned
attempt, not as TC-ANC-003's booking. The user asked for a re-execution.

## Attempt 3 — re-execution (2026-09-30, 14:22–14:40 UTC) — the attempt of record

- Search BOM↔COK 21/25 Oct, **2A/2C/2I** → offers returned. Selected IX-1797 EC / IX-1798 EC, non-stop, **EGP 16,254**
  (up from 14,254 the day before). `R3_01_search_2A2C2I_results.png`
- Stepper 01 Passenger Info → 02 Bundles → 03 Ancillaries. 6 PAX entered, no invalid fields (`R3_02`). Value Pack both
  directions (`R3_03`).
- **Step 2 checks:** 4 ancillary cards (ADT/CHD only), **no Infant rows** ✓. Each card has 4 dropdowns: Meal Onward/Return
  and Baggage Onward/Return. **Meal per leg** ✓. **Baggage once per direction on a round trip** (answers the ANC-48 question) ✓.
  Selected VSDB ×8 and "+ 5 kg Xcess Baggage" (1,875 EGP) ×8. Net Payable **35,854 EGP**
  (16,254 + 19,600). `R3_04_ancillaries_selected.png`
- The console again logged 7 × `Cannot read properties of null (reading 'baggageMetaData')` during baggage selection. That is
  2 of 2 attempts, with no visible effect: every selection persisted and the booking confirmed with correct baggage.
- **Step 3 — Book:** Confirm Booking → Book → **Confirmed**. Airline PNR **P6MVJA** · Booking Ref `NDCEG-BR-F260930MsiBuW` ·
  Trip ID `AGN9808NDCNDCORD260930KLWHYX` · booked 30 Sep 2026 14:28 UTC. `R3_05_before_book.png`, `R3_06_booking_confirmation.png`

### Checkpoints

| # | Checkpoint | Result | Detail |
|---|---|---|---|
| 4 | Booking Confirmation | **Pass** | Each ADT/CHD: IX 1797 VSDB + IX 1798 VSDB, Extra Baggage "+5 kg Xcess" Onward and Return (EGP 1,875 each). Both INF: `-` for Meal/Seat/Bundle, no baggage rows. Bundle Details: Xtra Pack BOM-COK and COK-BOM. Fare: Base 10,516 + Taxes 5,738 + Meal 1,000 + Baggage 15,000 + Bundle 3,600 = **35,854 EGP** |
| 5 | Supplier Retrieve (`P6MVJA`) | **Pass on totals; itemization defect (extends A)** | HTTP 200. PNR/pax/types/infant links match; no ancillaries on either INF. At ROE 0.5: base 21,032 INR → 10,516 ✓, taxes 11,476 → 5,738 ✓, `totalAncillariesAmount` 39,200 → 19,600 ✓, `totalAmount` 71,708 → **35,854 ✓ exact**. No markup today (TC-ANC-002 had +100 EGP/pax). **Itemization:** `totalPassengersAncillaries` = PBAB 15,000 + VLPL 3,600 + VSDB 1,000 = 19,600 INR, **half** of 39,200. Each passenger's `passengerAncillaries` lists PBAB 3,750 + VLPL 900 + VSDB 250 (+ VHRB 0) = 4,900 INR: **one direction only**. Every code chosen on both directions is listed once, so the whole return direction (baggage, bundle and meal) is missing from the itemization while the totals include it. `bookingStatus: UnKnown` (C/H, Note). Evidence: `R3_07_supplier_retrieve_request.json` (keys redacted), `R3_07_supplier_retrieve_response.json` |
| 6 | My Bookings → Segment Ancillaries | **Pass** | Reached via the sidebar. Journey 1 BOM→COK (IX-1797) and Journey 2 COK→BOM (IX-1798) each list all 4 ADT/CHD with VSDB 125 EGP + "+5 kg Xcess Baggage" 1,875 EGP; no INF entries. Status Booked / Agency "Ticketed Document" (H, Note). Times +3h (E, Note). `[Xtra Pack` (F). `R3_08`, `R3_09` |
| 7 | Fare Breakdown (Costing) | **Pass** | 2ADT 5,127 + 2CHD 5,127 + 2INF 6,000 = 16,254 + SSR 19,600 (Meal 1,000 · Baggage 15,000 · Bundle 3,600) = **35,854** = Total Booking/Sales/Net. `R3_10` |
| 8 | Reports | **Pass** | Total Due to NDC: `INVNDC260930NwFA3n`, Amount Payable **35,854 EGP**. Sales: Txn `NDCEG-TR26093091nfPY`, Payable 35,854.00 · Markup 0.00 · Sales 35,854.00. `R3_11`, `R3_12` |

**Proposed TC-ANC-003 status: Passed.** Every checkpoint is consistent. Both ancillary rules hold, and the round-trip
Baggage question is answered (once per direction). **Carried observations:** defect A **extended**: on a round trip,
Retrieve itemization drops the repeated return-direction ancillaries (baggage and bundle as well as meal), probably
deduplicated by ancillary code. D (bundle naming, traced), E, F, H/C (Notes). New Note: `baggageMetaData` console TypeError
(2/2 attempts, no functional effect seen). New Note: the attempt-2 order is stuck "In Progress".

## Other observations

- **Passenger mix:** 2A/2C/2I returns no offers on BOM↔COK for 21/25 Oct. 1A/1C/1I returns 200.
- **Bundle naming:** "Value Pack" is the bundle name and "Xtra Pack" is the service it includes (`includedServices`).
  This explains TC-ANC-002 observation D.
- **Bundle `DEL`:** a zero-price option named `DEL` (bundleCode `DEL`, no services) is listed next to Value Pack.
  Likely the "no bundle / default" option, shown with its raw code as the name.
- **Search results show airport-local times** (IX-1782 departs 13:35 DEL). So TC-ANC-002 observation E
  (+3h shift) is limited to Booking Details and possibly the confirmation page.
- **Date fields:** typing key by key (`pressSequentially`) into PrimeNG `p-calendar` fields does update the
  form (`ng-valid ng-dirty` after blur). This replaces the long calendar-click method in PROJECT_STATE §13.4.
