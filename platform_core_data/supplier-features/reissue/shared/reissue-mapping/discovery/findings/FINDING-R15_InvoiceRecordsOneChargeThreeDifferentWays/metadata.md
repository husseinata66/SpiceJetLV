# FINDING-R15 — The invoice records one charge three different ways, and two of them are wrong

- **Finding ID:** FINDING-R15
- **Title:** In a single `invoiceInfo` object, `agencyInvoiceAmt` is truncated **down**, `totalAmt` is rounded **up**, they disagree with each other by ~1.00, and **neither equals the amount actually charged**
- **Category:** Defect (Financial record accuracy)
- **Severity (proposed):** **Medium as written — but see the correction immediately below, which raises the stakes.**

> ### CORRECTION 2026-09-30 — the claim that the wallet is debited correctly is WRONG
>
> This finding originally read: *"No customer is over- or under-charged — the wallet is debited the
> correct amount. The damage is to the record."* **That assertion was never measured.** run-007
> scenario 10 read the wallet from the API before and after a paid exchange and found it debited
> **3,977.00** against an agreed **3,976.88** — the rounded figure, not the correct one. The rounding
> reaches real money.
>
> Raised separately as **FINDING-R18**, because it is a different defect (wrong amount charged) from
> this one (inconsistent record), and they may be fixed independently. This finding's own severity is
> unchanged; what changes is that "harmless to the money" can no longer be said of the rounding
> family as a whole.

- **Original severity reasoning (retained, with the struck claim marked):** ~~No customer is over- or under-charged — the wallet is debited the correct amount.~~ The damage is to the record: the invoice an agency reconciles and reports against does not state what was taken, and states it inconsistently within itself. Across many bookings the drift is systematic, not random, because both fields always err in the same direction
- **Status:** Pending Review (Stage 2, run-007)
- **Module / screen:** Reissue → Confirmation; `GET /v2/bookingConfirm/{orderId}` → `invoiceInfo`
- **Found by:** run-007, 2026-09-29/30, on four bookings

## Observed

Four confirmations, four currencies-worth of the same defect:

| Booking | GDS PNR | Charged | `agencyInvoiceAmt` | `totalAmt` | Error down | Error up |
|---|---|---|---|---|---|---|
| `NDCEG-BR-F260929u1ptMk` | `QZTJRV` | **170,275.20** | 170,275.00 | 170,276.00 | −0.20 | +0.80 |
| `NDCEG-BR-F260929DXeP0a` | `QTZVXU` | **89,761.20** | 89,761.00 | 89,762.00 | −0.20 | +0.80 |
| `NDCEG-BR-F260928gssCFk` | `PUBPBJ` | **124,195.20** | 124,195.00 | 124,196.00 | −0.20 | +0.80 |
| `NDCEG-BR-F2609294YODAr` | `RPTIYO` | **410,755.20** | 410,755.00 | 410,756.00 | −0.20 | +0.80 |

The pattern is identical every time: **one field floors, the other ceilings, and the true value sits
between them.** The two fields differ from each other by exactly 1.00 in all four cases.

All four are **AED** — a converted currency. The EGP confirmations (`OWXGIW`, `PRUOOC`) carry the
exact value in both fields. This is consistent with the conversion-rounding defect recorded as the
second half of **FINDING-R02**, and is very likely the same root cause surfacing on a different pair
of fields.

## A third value in the same object: floating-point noise

`totalTax` on `QZTJRV` reads **170,161.21**. The correct figure is 170,161.20 — that is core's
18,906.80 EGP × 9 exactly. The trailing 0.01 is unrounded binary floating-point reaching the record.

The same artefact appears on `PTFEBY`, where `totalAmt` is **51,932.801** — three decimal places on a
currency amount (see FINDING-R12).

So within one `invoiceInfo` the same transaction can be represented as 170,275.00, 170,276.00, and a
component carrying 170,161.21 — none of them the arithmetic truth.

## OPEN QUESTION — `feeNTaxes` holds an unconverted supplier-currency figure

On `QZTJRV`, `invoiceInfo` is labelled `"currency": "AED"` and contains:

```json
"currency":         "AED",
"feeNTaxes":        18906.8,     <- core service value, in EGP
"totalTax":         170161.21    <- the same amount converted: 18906.8 x 9
```

**18,906.80 is exactly core's `modifyPrice.totalPayable` for this offer, whose own `currency` field
says `EGP`** (verified in `s8b-core-reshop-QZTJRV.json`). So one field in this object is converted
and the neighbouring one is not, under a single `AED` label.

**This is recorded as a question, not asserted as a defect.** There is no field documentation, and
the name `feeNTaxes` does not state a currency. If the field is *intended* to carry the supplier-
currency amount, it is correct and merely undocumented and ambiguously named. If it is intended as
AED like the rest of the object, it is wrong by a factor of 9.

**Needs a decision from the product owner.** The two rounding fields above need no such decision —
they are wrong under any reading.

## Expected

An invoice states the amount charged, exactly, once. Where the same figure appears in more than one
field, the fields agree. Currency-labelled objects contain values in that currency, or name the
currency per field.

## Actual

Two fields that disagree with each other and with reality, plus a component carrying floating-point
noise, plus a field that may be in a different currency from its own object's label.

## Steps to reproduce

1. Complete any reissue in a converted-currency (AED) agency and note the amount charged.
2. `GET /odeysysadmin/v2/bookingConfirm/{orderId}`.
3. Compare `invoiceInfo.agencyInvoiceAmt` and `invoiceInfo.totalAmt` against the charge — one is
   below, one above, neither equal.
4. Compare `invoiceInfo.feeNTaxes` against the core service's `modifyPrice.totalPayable` for the same
   offer — identical, and in EGP.

## Reconfirmed at a second exchange rate (2026-09-30)

run-007 scenario 10 — booking `NDCEG-BR-F260930Vrf576`, agency `AGN10030`, **ROE 0.1** rather than 9 —
reproduces two of this finding's three parts:

- **`feeNTaxes` carries the unconverted supplier figure.** `invoiceInfo` is labelled `AED` and holds
  `feeNTaxes: 20214.8` against `totalTax: 2021.48` — exactly ×10. The open question below is
  therefore **not** an artefact of the rate 9; the field is unconverted at any rate.
- **The rounding.** `agencyInvoiceAmt` and `totalAmt` both read `3977` against components summing to
  3,976.88. **But here both round UP and agree with each other**, unlike the four AED cases in the
  table above where one floored and the other ceilinged. So the "one floors, the other ceilings"
  pattern is **not** universal, and the sentence below claiming the pattern is "identical every time"
  overstates what four observations supported.

## Related

- **FINDING-R02** — the conversion-rounding defect, corrected 2026-09-29 to distinguish the EGP
  binding fault from the AED conversion fault. This finding is very likely the same conversion fault
  reaching different fields; whoever fixes R02's second half should verify these four fields too.
- **FINDING-R12** — the same object on `PTFEBY` drops a whole component and renders three decimals.

## Evidence

- `discovery/evidence/s8b-admin-bookingConfirm.json` — `QZTJRV`: the raw `invoiceInfo`
- `discovery/evidence/s8b-core-reshop-QZTJRV.json` — core's `totalPayable` 18,906.80 **EGP**, proving
  `feeNTaxes` is the unconverted figure
- `discovery/evidence/s7-admin-bookingConfirm.json` — `QTZVXU`
- `discovery/evidence/s6c-portal-bookingConfirm.json` — `PUBPBJ`
- `discovery/evidence/s9-admin-bookingConfirm.json` — `RPTIYO`
- `discovery/evidence/s1-portal-bookingConfirm.json` — EGP control, both fields exact
