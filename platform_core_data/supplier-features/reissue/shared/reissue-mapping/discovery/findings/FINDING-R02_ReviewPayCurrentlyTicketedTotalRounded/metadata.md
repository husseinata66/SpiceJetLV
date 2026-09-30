# FINDING-R02 — "Currently ticketed → Total" on Review & Pay is rounded and contradicts its own line items

- **Finding ID:** FINDING-R02
- **Title:** Review & Pay shows the currently-ticketed total as 31,347.00 EGP where every other source says 31,346.80 EGP
- **Category:** Defect candidate (Data display / Rounding)
- **Severity (proposed):** **Low.** 0.20 EGP. But it is a total printed directly beneath the six figures that contradict it, on the screen where the agent decides to spend money
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** Portal → Reissue → step 2 Review & Pay → *Fare breakdown* → *Currently ticketed*
- **Found by:** run-007 scenario 1, `NDCEG-BR-F26092704TCQE` (GDS PNR `OWXGIW`), 2026-09-27

## Observed

The *Currently ticketed* block on Review & Pay:

| Line | Value |
|---|---|
| Base fare · 2 Adult | 8,086.00 |
| Base fare · 2 Child | 6,014.00 |
| Base fare · 2 Infant | 830.00 |
| Taxes · 2 Adult | 6,263.60 |
| Taxes · 2 Child | 6,263.60 |
| Taxes · 2 Infant | 3,889.60 |
| **Total** | **31,347.00** |

The six lines sum to **31,346.80**. Four independent sources agree on 31,346.80 and none on
31,347.00:

| Source | Value |
|---|---|
| The block's own six line items | 31,346.80 |
| Portal `/v2/reissue/{ref}/review` → `currentOffer.priceDetails.totalOfferAmount` | 31,346.80 |
| Booking details → Costing → Total Booking Amount | 31,346.80 |
| Reissue History → Original booking → Total Sales | 31,346.80 |
| **Sabre `getBooking` → `payments.flightTotals.total`** | **31,346.80** |

The supplier's own record says 31,346.80, so this is not a display convention — the figure shown is
not the amount ticketed.

## Scope of the defect

Isolated to this one line. On the same screen, *Total additional* and *AMOUNT PAYABLE* both render
**10,220.80** un-rounded, and every per-passenger line above renders to 2 dp. Only the
currently-ticketed total is rounded to the whole EGP and then formatted `.00`.

## Steps to reproduce

1. Portal `http://192.168.1.60:9500`, log in as agency **AGN9780**.
2. Open a ticketed order whose total has a non-zero sub-unit part — here 31,346.**80** EGP
   (`NDCEG-BR-F26092704TCQE`). A total already at `.00` will hide the defect.
3. **Reissue** → Continue to reissue → Search flights → select any offer → **Review & Pay**.
4. In *Fare breakdown* → *Currently ticketed*, add the six line items: 31,346.80.
5. Read the **Total** directly beneath them: **31,347.00**.
6. DevTools → Network → `GET …/v2/reissue/{bookingRef}/review`:
   `currentOffer.priceDetails.totalOfferAmount` = **31346.8**.

## Expected

**31,346.80 EGP** — the sum of its own line items, the value the API returns, and the amount the
supplier records as ticketed.

## Actual

**31,347.00 EGP**, rounded up by 0.20 in the UI only.

## Evidence

- `discovery/evidence/s1-review-and-pay.png` — the block and its total
- `discovery/evidence/s1-portal-review.json` — `totalOfferAmount 31346.8`
- `discovery/evidence/s1-before-state.json` — booking total 31,346.80
- `discovery/evidence/s1-sabre-getBooking-OWXGIW-after.json` — `flightTotals.total "31346.80"`
- `discovery/evidence/CoreService_vs_Screen_s1_run-007.md` §3.1, §6.3

---

## CORRECTION, 2026-09-29 — the root cause stated above is incomplete, and the implied fix does not work

This finding says the screen binds `totalOfferAmountRoundedUp` where it should bind
`totalOfferAmount`. **That is true only for the EGP bookings.** On every converted-currency (AED)
booking, `totalOfferAmount` is *itself* already rounded, so re-pointing the binding would change
nothing.

| Scenario | Currency | Components sum to | `totalOfferAmount` | `totalOfferAmountRoundedUp` |
|---|---|---|---|---|
| s1 `OWXGIW` | EGP | 31,346.80 | **31,346.8** exact | 31,347 |
| s2 `QIKISQ` | EGP | 43,786.80 | **43,786.8** exact | 43,787 |
| s3 `PRUOOC` | EGP | 28,542.80 | **28,542.8** exact | 28,543 |
| s4 `PUAUTI` | EGP | 30,096.80 | **30,096.8** exact | 30,097 |
| s6c `PUBPBJ` | **AED** | 3,134.68 | **3,135** ← rounded | 3,135 |
| s7 `QTZVXU` | **AED** | 282,427.20 | **282,428** ← rounded | 282,428 |
| s8b `QZTJRV` | **AED** | 412,873.20 | **412,874** ← rounded | 412,874 |

The split is exactly on currency, with no exceptions in seven observations: **in EGP the unrounded
field holds the true value; in AED both fields hold a rounded one and the fractional part is gone
before the screen sees it.**

So there are **two defects wearing one label**:

1. **The binding** — the screen reads the rounded field when an exact one exists. EGP only. Fixable
   as this finding originally described.
2. **The conversion** — the converted total is rounded to a whole unit at or before the point it is
   written to `totalOfferAmount`, destroying the fractional part. AED only. **No binding change can
   recover it**; the loss happens upstream of the screen.

Defect 2 is the more serious of the two and was not identified when this finding was raised. Anyone
fixing this must address both, and must verify the fix in a converted currency — an EGP-only test
would pass while the AED case stayed broken.

**How it was missed:** the finding was raised from the EGP scenarios, where the two fields genuinely
differ and the binding explanation fits perfectly. The AED scenarios were added later as occurrence
counts without re-deriving the cause — the occurrence was recorded, the mechanism was assumed.

**Evidence:** `s1/s2/s3/s4-portal-review.json` (EGP), `s6c-portal-review.json`,
`s7-admin-review.json`, `s8b-admin-review.json` (AED).
