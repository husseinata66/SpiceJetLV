# FINDING-R18 — The wallet is debited the rounded figure, not the amount the agency agreed to pay

- **Finding ID:** FINDING-R18
- **Title:** The screen asks the agency to confirm **3,976.88 AED**; the wallet is debited **3,977.00 AED**. The rounding that FINDING-R02 and FINDING-R15 recorded as a *record-keeping* fault reaches actual money
- **Category:** Defect (Financial — incorrect amount charged)
- **Severity (proposed):** **High.** The amount taken is not the amount presented and agreed. It is small per transaction (0.12 AED here) but it is **real money, always in the agency's disfavour**, and it is invisible: the confirmation, the invoice and the wallet all display the rounded figure, so the two never appear to disagree. Across a booking volume it is a systematic, silent overcharge. Not Critical only because no passenger is harmed and the sum is tiny per booking
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** Reissue → step 2 Review & Pay → payment; `POST /v2/reissue/{ref}/book`
- **Found by:** run-007 scenario 10, 2026-09-30
- **Booking:** `NDCEG-BR-F260930LAlLPj` → `NDCEG-BR-F260930Vrf576` · order `AGN10030NDCNDCORD2609306TCU5L` · GDS PNR `TTDMXL` · agency `AGN10030` NDC2_Mohamed SolimanEmirates · **AED, ROE 0.1** · 2 Adult, 2 Child, 2 Infant

## Observed

The Review & Pay screen's payment button read, verbatim:

> **Confirm & charge AED 3,976.88**

The wallet, read from `GET /v2/financial/financial-details` **before and after** — exact integers from the API, not the sidebar rendering:

| | walletBalance | topUpBalance |
|---|---|---|
| Before (11:03:34Z) | 119,062 | 69,062 |
| After (11:26:37Z) | 115,085 | 65,085 |
| **Movement** | **3,977.00** | **3,977.00** |

Corroborated independently by `GET /v2/dashboard/wallet` (`115085`).

```
agreed    3,976.88
debited   3,977.00
           ────────
overcharge    0.12   AED
```

## The agreed figure is the arithmetically correct one

The amount payable reconciles exactly, at every level, to 3,976.88:

```
additional base   1,805.40   (970.60 + 741.00 + 93.80)
additional tax      714.68   (340.56 + 340.56 + 33.56)
supplier penalty  1,306.80   (705.60 + 530.60 + 70.60)
change fee          150.00   (50 + 50 + 50)
                  ─────────
                  3,976.88
```

and against the supplier: core's `totalPayable` 38,268.80 EGP × 0.1 = 3,826.88, + the 150.00 app-origin change fee = **3,976.88**.

So 3,976.88 is right and 3,977.00 is the corrupted value. The application did not round a figure it was unsure of — it rounded a figure that was exact.

## Why this is worse than the rounding already recorded

**FINDING-R15 states, in its severity note:** *"No customer is over- or under-charged — the wallet is debited the correct amount. The damage is to the record."*

**That is now falsified.** This run measured the wallet directly, before and after, and the debit is the rounded figure. R15's assessment was made without measuring the wallet; this finding corrects it.

The invoice repeats the same value, so nothing on screen ever contradicts anything else:

```
invoiceInfo.totalFare          1,805.40
invoiceInfo.totalTax           2,021.48   (additional tax + supplier penalty)
invoiceInfo.serviceCharges       150.00   (the change fee - see FINDING-R05)
                               ─────────
components sum                 3,976.88
invoiceInfo.agencyInvoiceAmt   3,977      <- recorded
invoiceInfo.totalAmt           3,977      <- recorded
```

**This is what makes it silent.** An agency reconciling its wallet against its invoices finds them in perfect agreement, because both carry the wrong number. The only way to see the discrepancy is to sum the invoice's own components, or to have read the button before clicking it.

## Direction of the error

Both fields, on both bookings measured in this scenario, round **up**:

| Booking | Correct | Recorded & debited |
|---|---|---|
| Original `NDCEG-BR-F260930LAlLPj` | 3,604.88 | 3,605 |
| Exchange `NDCEG-BR-F260930Vrf576` | 3,976.88 | 3,977 |

Note this differs from FINDING-R15's four AED cases, where `agencyInvoiceAmt` floored and `totalAmt` ceilinged. Here both round up and agree with each other. **Whether the debit also follows the rounding when the correct value would round down is not established** — every case measured so far rounds up, so it has never been observed to favour the agency.

## Expected

The amount debited equals the amount presented and agreed, to the cent. Where a currency has two decimal places, a value with two decimal places is not rounded to zero.

## Actual

3,976.88 presented and agreed; 3,977.00 taken.

## Steps to reproduce

1. Portal, sign in as `AGN10030`, open `NDCEG-BR-F260930LAlLPj`, Reissue.
2. `GET /v2/financial/financial-details` — record `walletBalance` and `topUpBalance` exactly.
3. Select any offer whose total has non-zero cents. Read the **Confirm & charge** button.
4. Confirm and pay.
5. `GET /v2/financial/financial-details` again. The movement is the rounded figure, not the button's figure.

> Read the wallet from the API, not the screen — the Portal sidebar renders 3 decimals and the page 2 (FINDING-R17), so neither display settles it.

## Cause — NOT established

The rounding is already present in the offer payload before payment: the currently-ticketed block's `totalOfferAmount` reads `3605` where its own components give 3,604.88 (FINDING-R02, corrected). So a rounding step exists somewhere in the AED pricing path and this finding shows the debit follows it. Whether the payment path re-derives the amount from a rounded field, or rounds independently at charge time, cannot be told from the client side.

`logs/detail.log` would distinguish these. It has never been accessible in this run; this is now the fourth finding it blocks.

## Related

- **FINDING-R02** — the same rounding on the currently-ticketed total at Review & Pay, reproduced again in this scenario at ROE 0.1. Its corrected root cause (that `totalOfferAmount` is itself already rounded in AED) is reconfirmed here at a second, very different rate, so the fault is not rate-specific.
- **FINDING-R15** — the invoice-record rounding. **Its severity note must be corrected**: it asserts the wallet is debited correctly, and this finding disproves that.
- **FINDING-R12** — fare details that do not sum; the same 0.12 discrepancy is visible on this booking's Review & Pay currently-ticketed block.

## Evidence

- `discovery/evidence/s10-portal-bookingConfirm-after.json` — the wallet before/after, the invoice, and the arithmetic
- `discovery/evidence/s10-portal-review-SV390.json` — the priced offer and the agreed 3,976.88, with the full per-passenger and per-tax-code reconciliation
- `discovery/evidence/s10-core-reshop-TTDMXL-B.json` — core's 38,268.80 EGP, proving 3,976.88 is the correct converted figure
- `discovery/evidence/s10-portal-bookingConfirm-before.json` — the original booking showing the same up-rounding, 3,604.88 → 3,605
