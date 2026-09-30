# FINDING-R03 — The reissue Confirmation presents the supplier change penalty as tax

- **Finding ID:** FINDING-R03
- **Title:** `/bookingConfirm` merges the supplier penalty into `totalTax`, so the Confirmation page and e-ticket show a change penalty as "Taxes"
- **Category:** Defect candidate (Financial attribution / Customer-facing document)
- **Severity (proposed):** **Medium.** The total charged is correct; the attribution is not. A change penalty is shown to the customer as tax on the document they keep, and the supplier explicitly books it as *not* tax
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** Portal → Reissue → step 3 Confirmation, and the E-Ticket rendered from it
- **Found by:** run-007 scenario 1, full-cycle exchange of `NDCEG-BR-F26092704TCQE` (GDS PNR `OWXGIW`), 2026-09-27

## Observed

The same exchange, one step apart:

| Line | Review & Pay (step 2) | Confirmation (step 3) |
|---|---|---|
| tax | Additional taxes **678.80** | Taxes (+) **13,652.80** |
| supplier penalty | Supplier fee **12,974.00** | *absent* |
| agency fee | Change fee **300.00** | Service Charges (+) **300.00** |
| base | −3,732.00 | Base fare −3,732 |
| **total** | **10,220.80** | **10,220.80** |

`13,652.80 = 678.80 + 12,974.00`. The totals agree; the attribution does not.

> **The fee line is a separate defect — see FINDING-R05.** "Change fee" does not merely become
> "Service Charges" as a label: the value is written into the `serviceCharges` field, which is a
> different, pre-existing concept reported as 0.00 throughout search and review, while `changeFee`
> is dropped from the payload. R03 covers the penalty-into-tax merge only. Between the two,
> `/bookingConfirm` preserves the total and misattributes two of its three components.

This is **not** a UI formatting choice. The Portal API itself has already merged them:

```
GET /odeysysportal/v2/bookingConfirm/AGN9780NDCNDCORD260927U5JV1B
  totalTax        13652.80
  serviceCharges    300.00
```

Neither `678.80` nor `12974` appears anywhere in that payload, and there is no penalty field. The
information exists correctly one step earlier (`/review`, and `reissuePricing.supplierPenalty` on
every search offer) and is discarded before the confirmation is built.

## Why it is wrong, on the supplier's own evidence

Sabre issues the penalty as an **EMD**, not as tax, and says so numerically:

- `payments.ancillaryTotals` → `taxes: "0.00"`
- the EMD accounting row → `fareAmount: "342.80"`, **`taxAmount: "0.00"`**
- six EMD documents `0651953370312`–`…317`, status `ME`, one per passenger

So the supplier states the fee carries zero tax, while the Portal presents the whole fee as tax.

## Steps to reproduce

1. Portal `http://192.168.1.60:9500`, log in as agency **AGN9780**.
2. **My Bookings** → open a ticketed, reissuable order → **Reissue**.
3. Continue to reissue → set a route/date that yields a **non-zero supplier penalty** (a route change
   does; a same-route search on this data returns `penalty = 0` and hides the defect). CAI→RUH,
   20 Dec 2026 was used here.
4. Select an offer and reach **Review & Pay**. Note the three separate lines: *Additional taxes*,
   *Supplier fee*, *Change fee*.
5. Confirm and pay.
6. On the **Confirmation** page read **Fare Details**. The three lines have become two: *Taxes (+)*
   now equals additional taxes **+** supplier fee; there is no supplier-fee line.
7. DevTools → Network → `GET …/v2/bookingConfirm/{orderId}`: `totalTax` is the merged figure and no
   penalty field is present.

## Expected

The Confirmation and the e-ticket show the supplier penalty on its own line, as Review & Pay does —
`Taxes 678.80`, `Supplier fee 12,974.00`, `Change fee 300.00` (the fee line per FINDING-R05).
`bookingConfirm` carries the penalty as its own field rather than folding it into `totalTax`.

## Actual

`totalTax` = tax difference + supplier penalty. The customer-facing document attributes 12,974.00
EGP of airline change penalty to taxation.

## Evidence

- `discovery/evidence/s1-portal-bookingConfirm.json` — `totalTax 13652.8`, `serviceCharges 300`
- `discovery/evidence/s1-confirmation.png` — the rendered Fare Details
- `discovery/evidence/s1-review-and-pay.png` — the correct three-line breakdown one step earlier
- `discovery/evidence/s1-portal-search-CAI-RUH.json` — `reissuePricing.supplierPenalty 12974`
- `discovery/evidence/s1-core-reshop-CAI-RUH.json` — core `modifyPrice.penalty 12974`
- `discovery/evidence/s1-sabre-getBooking-OWXGIW-after.json` — `ancillaryTotals.taxes "0.00"`, EMDs
- `discovery/evidence/CoreService_vs_Screen_s1_run-007.md` §6.5
