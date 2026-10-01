# TC-ANC-004 — Execution log (Admin, Booking-Mid Office, one-way, non-stop, BOM→COK)

- **Executed:** 2026-09-30, ~15:17–15:50 UTC · Admin `ANCILLARIES_STG` (`http://192.168.1.213`) · Branch **NDC2_Ahmed Alhussieny (BRN297)**, no Agency/Agent selected
- **Mechanism:** Playwright MCP, headed, 1440×900. Session from `BrowserDriver.authenticate()` passed via `--storage-state`. Forms filled with batched
  `browser_run_code_unsafe`; Book Flight / Book / Confirm-Book were separate visible clicks.
- **Safety:** BOOK / PAYMENT / WALLET_CHARGE on a SelfCreated booking → `Allowed` (`AUTH-PLATFORM-*-SELFCREATED`). Void/Cancel was not touched.
- **Proposed status: Passed.**

## Booking of record

Airline PNR **USCWVR** · Booking Ref `NDCEG-BR-F260930PldcAl` · Order/Trip `BRN297NDCORD260930QJBKMA` · Confirmed 30 Sep 2026 15:36 UTC.
IX-1797 EC, BOM 05:05 → COK 07:05, 21 Oct 2026, non-stop · **2 ADT, 2 CHD, 2 INF** (the full mix returned offers) · **18,176 EGP** (Wallet).
Passengers: Ahmed TestAdultThree, Sara TestAdultFour, Tom TestChildThree, Amy TestChildFour, Baby TestInfantThree (→Ahmed), Lily TestInfantFour (→Sara).

## Steps

| # | Step | Result | Detail |
|---|---|---|---|
| 1 | Booking-Mid Office → Branch | Pass | Branch BRN297 selected; Agency/Agent left empty (ANC-58 combination not exercised) |
| 2 | Search one-way non-stop BOM-COK | Pass | 2A/2C/2I returned offers; IX-1797 EC EGP 8,376. `01_search_2A2C2I_results.png` |
| 3 | PAX, Bundle, Ancillaries | **Pass** | Stepper: Passenger Info → Bundles → Ancillaries. Bundle: one direction, Value Pack (Adult/Child 450, Infant 0). **Infant exclusion ✓**: 4 ancillary cards (ADT/CHD only). **Meal per leg ✓**: one Onward BOM→COK meal slot (single leg). **Baggage once per journey ✓**: one Onward baggage slot. Selected VSDB ×4 and "+ 5 kg Xcess Baggage" (1,875) ×4. Net Payable **18,176** = 8,376 + bundle 1,800 + meal 500 + baggage 7,500. `09_…`, `10_before_book_attempt2.png` |
| 4 | Payment → confirmation | Pass | Wallet before: Your Balance 8,849,943.19 (Credit 1,000,000 + Top Up 7,849,943.19). Confirm Booking → Book → Confirmed; Admin went straight to the confirmation screen. |
| 5 | Confirmation vs step 3 | **Pass** | Each ADT/CHD: IX 1797 VSDB; Extra Baggage BOM-COK "+5 kg Xcess" EGP 1,875. Both INF: `-` Meal/Seat/Bundle, no baggage row. Bundle Details: BOM-COK Xtra Pack. Fare Details: Base 5,858 + Taxes 2,668 + **Service Charges 150** + Meal 500 + Baggage 7,500 + Bundle 1,800 − **Discount 300** = **18,176** ✓. Times shown airport-local (05:05 BOM). `11_booking_confirmation.png` |
| 6 | Supplier Retrieve `USCWVR` | **Pass** | HTTP 200. Pax/types/infant links match; no INF ancillaries. At ROE 0.5: taxes 5,336 → 2,668 ✓; ancillaries 19,600 → 9,800 ✓; base 10,516 → 5,258, Admin 5,858 → **+600 = Markup 100 EGP/pax** (all 6, infants included, same as TC-ANC-002). Total 35,452 → 17,726; **17,726 + Markup 600 + Service 150 − Discount 300 = 18,176 ✓**. Itemization is complete here (per-pax PBAB 3,750 + VLPL 900 + VSDB 250 = 4,900; by code 15,000 + 3,600 + 1,000 = 19,600) because one-way, one-leg has no repeated codes, so defect A does not show. `bookingStatus: UnKnown` (C/H Note). `12_supplier_retrieve_*.json` (keys redacted) |
| 7 | Search Booking → Passenger/Ancillaries | **Pass** | Branch + Booking Ref (Flight tab) → 1 row `BRN297NDCORD260930QJBKMA`. Booking Details → Segment Ancillaries: 4 ADT/CHD with VSDB 125 + "+5 kg Xcess" 1,875; no INF. Status Booked. `13_…`, `14_…` |
| 8 | Costing & Payment | **Pass** | Net 1,200 + 1,200 + 2,858 = **5,258** (= supplier base). Gross 1,350 + 1,350 + 3,008 (+75/pax). Row totals 2,613 + 2,613 + 3,150 = 8,376 + SSR 9,800 (Meal 500 · Baggage 7,500 · Bundle 1,800) = **18,176** = Total Booking = Total Sales. Total Net **17,726** (= supplier total) · Total Profit **450** (= Markup 600 + Svc 150 − Discount 300). Payment: `INVNDC2609305F4m1i`, 18,176.00, Wallet, Txn `NDCEG-TR260930KJfCyN`, **Settled**. `15_costing_and_payment.png` |
| 9 | Five Admin reports | **Pass** | **Total Due to NDC:** `INVNDC2609305F4m1i`, Amount Payable **18,176 EGP** ✓. **Sales:** Txn `NDCEG-TR260930KJfCyN`, Payable 18,176.00 · Markup 0.00 · Sales 18,176.00 ✓. **AR Ledger:** order/booking/PNR USCWVR, 18,176, Running Balance **7,831,767.19** ✓. **Wallet History:** `NDCEG-TR260930KJfCyN`, 18,176 EGP ✓. **Agency Wallet (EGP):** Top-up Balance **7,831,767.19** ✓. **Wallet delta = 7,849,943.19 − 7,831,767.19 = 18,176.00 ✓** everywhere. `16_report_*.png` |

## Attempt 1 (not the booking of record) — 15:22–15:31 UTC

- The same flight was booked with TC-ANC-003's passenger names (…AdultOne/Two …). `fare-recheck-book` returned 18,176 → 18,176.
  **`book-and-pay` → HTTP 409**: "One or more passengers already have a booking with the same details. Please contact Admin for booking."
  (the platform's duplicate-passenger guard; P6MVJA holds the same names on IX-1797 21 Oct). **Nothing was booked or charged.**
  This is a test-data clash, not a defect. `06_book_and_pay_409_response.json`
- **Observation (UI):** after the 409 **the UI showed no message at all**. The Confirm-Book click appeared to do nothing, and the reason
  was only visible in the network response. `06_after_book_409_no_ui_message.png`
- **Observation:** after going back and renaming passengers in the same session, `ssr-quote` returned **HTTP 400 "Failed to deserialize the
  selected offer"** and the Bundles → Next step silently stopped working. A fresh search was needed. Again there was no UI message.
- A fresh search right afterwards returned "No Flights Found" once for 2A/2C/2I, then 31 offers on the retry (transient).
- Form quirk: on Admin, one row's passport field (`document_1`) and, on the retry, four DOB fields came back empty after other
  fields in the row were set (probably reset by the open date-picker panels). They were refilled and verified before continuing.

## Notes carried

- Console: `TypeError … calcBaggagePrice` / null `baggageMetaData` again during baggage selection (Admin as well as Portal); no functional effect seen.
- Sales report "Total Markup 0.00" although Costing shows Profit 450 (markup 600 in the fare); same as TC-ANC-002's Sales row. Needs a business answer on what "Total Markup" should contain.
- AR Ledger and Wallet History show the 18,176 wallet **deduction** under **Credit** (Debit 0) while the balance goes down. Column semantics need confirming.
- Agency Wallet "Last Transaction Date" still reads 2026-07-13 after today's wallet debit.
- Booking Details `[Xtra Pack` label (F) and Status Booked vs Confirmed (H) — as before.
